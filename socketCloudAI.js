// Add new fields to User Schema
const freeCallSchema = {
    free_calls_remaining: { type: Number, default: 2 }, // Resets daily
    last_free_call_date: { type: Date, default: null }, // Track last free call date
    total_free_calls_used: { type: Number, default: 0 } // For analytics
  };
  
  // Add new fields to Astrologer Schema
  const astrologerFreeCallFields = {
    free_call_rate: { type: Number, default: 0 }, // Amount astrologer gets for free calls
    total_free_calls: { type: Number, default: 0 }, // Track total free calls taken
    free_call_earnings: { type: Number, default: 0 } // Track earnings from free calls
  };
  
  // Add new fields to CallChatHistory Schema
  const callHistoryFreeFields = {
    is_free_call: { type: Boolean, default: false },
    free_call_astro_rate: { type: Number, default: 0 } // Rate for this specific free call
  };
  
  // Redis cache for tracking daily free calls (for scalability)
  const REDIS_FREE_CALL_KEY = 'user:free_calls:';
  const FREE_CALLS_PER_DAY = 2;
  const FREE_CALL_RESET_HOURS = 24;
  
  // Enhanced socket handling with free call logic
  const initializeSocket = (server) => {
    const io = require('socket.io')(server, {
      cors: { origin: '*' }
    });
  
    // Use Redis for distributed call tracking
    const redisClient = redis.createClient(process.env.REDIS_URL);
    const activeCalls = new Map();
  
    const checkAndUpdateFreeCallsRemaining = async (userId) => {
      const redisKey = `${REDIS_FREE_CALL_KEY}${userId}`;
      let freeCallsData = await redisClient.get(redisKey);
  
      if (!freeCallsData) {
        // Initialize new day
        freeCallsData = {
          remaining: FREE_CALLS_PER_DAY,
          lastReset: new Date().toISOString()
        };
        await redisClient.set(redisKey, JSON.stringify(freeCallsData), 'EX', FREE_CALL_RESET_HOURS * 3600);
      } else {
        freeCallsData = JSON.parse(freeCallsData);
      }
  
      return freeCallsData.remaining > 0;
    };
  
    const handleCallInitiation = async (socket, data) => {
      const { user_id, astrologer_id, call_type } = data;
      
      try {
        // Get user and astrologer in parallel for performance
        const [user, astrologer] = await Promise.all([
          User.findById(user_id).select('wallet busy call_type free_calls_remaining last_free_call_date').lean(),
          Astrologer.findById(astrologer_id).select('is_voice_online is_chat_online is_video_online busy free_call_rate').lean()
        ]);
  
        // Validate availability
        if (!validateAvailability(astrologer, call_type)) {
          socket.emit('call_rejected', { message: 'Astrologer is offline' });
          return;
        }
  
        // Check if user has free calls remaining
        const hasFreeCallsRemaining = await checkAndUpdateFreeCallsRemaining(user_id);
        const isFreeCall = hasFreeCallsRemaining;
  
        // If not free call, validate wallet balance
        if (!isFreeCall) {
          const rate = astrologer[`per_min_${call_type}`];
          const minBalance = rate * 2; // 2 minutes minimum
          
          if (user.wallet < minBalance) {
            socket.emit('call_rejected', { message: 'Insufficient balance for paid call' });
            return;
          }
        }
  
        // Create call history with optimized fields
        const callHistory = await createCallHistory({
          user_id,
          astrologer_id,
          call_type,
          is_free_call: isFreeCall,
          free_call_astro_rate: isFreeCall ? astrologer.free_call_rate : 0
        });
  
        // Update user and astrologer status atomically using transactions
        await Promise.all([
          updateUserStatus(user_id, true, call_type, isFreeCall),
          updateAstrologerStatus(astrologer_id, true, call_type)
        ]);
  
        // Track active call
        activeCalls.set(socket.id, { 
          user_id, 
          astrologer_id, 
          callHistory, 
          isFreeCall 
        });

        //fcm token missing to send notification to astro
  
        // Start auto-cut timer using Redis for reliability
        await setAutoEndTimer(socket.id, 120000); // 2 minutes
  
        return { callHistory, isFreeCall };
      } catch (error) {
        console.error('Call initiation error:', error);
        socket.emit('call_rejected', { message: 'An error occurred' });
        throw error;
      }
    };
  
    const handleCallEnd = async (socket, endedBy) => {
      const callData = activeCalls.get(socket.id);
      if (!callData) return;
  
      const { user_id, astrologer_id, callHistory, isFreeCall } = callData;
      const duration = calculateDuration(callHistory.start_time);
  
      try {
        await mongoose.connection.transaction(async (session) => {
          // Update call history
          const updatedCall = await updateCallHistory(callHistory._id, {
            status: `end_${endedBy}`,
            end_time:  new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
            duration,
          }, session);
  
          if (!isFreeCall) {
            // Handle paid call settlement
            await handlePaidCallSettlement(
              user_id, 
              astrologer_id, 
              updatedCall, 
              duration,
              session
            );
          } else {
            // Handle free call settlement
            await handleFreeCallSettlement(
              user_id,
              astrologer_id,
              updatedCall,
              session
            );
          }
  
          // Update statuses
          await Promise.all([
            updateUserStatus(user_id, false, '', false, session),
            updateAstrologerStatus(astrologer_id, false, '', session)
          ]);
        });
  
        // Cleanup
        activeCalls.delete(socket.id);
        await redisClient.del(`auto_end:${socket.id}`);
  
      } catch (error) {
        console.error('Call end error:', error);
        throw error;
      }
    };
  
    io.on('connection', (socket) => {
      socket.on('initiate_call', async (data) => {
        try {
          await handleCallInitiation(socket, data);
        } catch (error) {
          console.error('Socket initiate_call error:', error);
        }
      });
  
      socket.on('end_call', async (endedBy) => {
        try {
          await handleCallEnd(socket, endedBy);
        } catch (error) {
          console.error('Socket end_call error:', error);
        }
      });
  
      // Handle disconnections
      socket.on('disconnect', async () => {
        try {
          await handleCallEnd(socket, 'user');
        } catch (error) {
          console.error('Socket disconnect error:', error);
        }
      });
    });
  };
  
  // Helper functions for better code organization and reusability
  const validateAvailability = (astrologer, callType) => {
    return astrologer[`is_${callType}_online`] === 'on' && !astrologer.busy;
  };
  
  const createCallHistory = async (data) => {
    return await CallChatHistory.create(data);
  };
  
  const updateUserStatus = async (userId, busy, callType, isFreeCall, session) => {
    const update = {
      busy,
      call_type: callType
    };
    
    if (isFreeCall) {
      update.$inc = { free_calls_remaining: -1 };
      update.last_free_call_date = new Date();
    }
  
    return await User.findByIdAndUpdate(
      userId,
      update,
      { session, new: true }
    );
  };
  
  const updateAstrologerStatus = async (astrologerId, busy, callType, session) => {
    return await Astrologer.findByIdAndUpdate(
      astrologerId,
      { busy, call_type: callType },
      { session, new: true }
    );
  };
  
  const handlePaidCallSettlement = async (userId, astrologerId, call, duration, session) => {
    const cost = calculateCallCost(duration, call.rate);
    const { astroCommission, adminCommission } = calculateCommissions(cost, call.commission_rate);
  
    await Promise.all([
      updateUserWallet(userId, -cost, call, session),
      updateAstrologerWallet(astrologerId, astroCommission, call, session),
      createAdminCommission(adminCommission, call, session)
    ]);
  };
  
  const handleFreeCallSettlement = async (userId, astrologerId, call, session) => {
    await Promise.all([
      updateAstrologerWallet(astrologerId, call.free_call_astro_rate, call, session),
      User.findByIdAndUpdate(userId, {
        $inc: { total_free_calls_used: 1 }
      }, { session })
    ]);
  };
  
  module.exports = { initializeSocket };