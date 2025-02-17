const { sendFCMNotification } = require('./src/utils/sendNotification');
const { User, Astrologer, CallChatHistory } = require('./src/models');

const initializeSocket = (server) => {
  const io = require('socket.io')(server, {
    cors: { origin: '*' }
  });

  // Tracking maps
  const activeCalls = new Map(); // Map<call_id, CallData>
  const userSockets = new Map(); // Map<user_id, socket_id>
  const astrologerSockets = new Map(); // Map<astrologer_id, socket_id>
  const activeTimers = new Map(); // Map<call_id, { autoRejectTimer?, insufficientBalanceTimer? }>

  io.on('connection', (socket) => {
    console.log('Connected:', socket.id);

    socket.on('register_user', ({ user_id, user_type }) => {
      if (user_type === 'user') {
        userSockets.set(user_id, socket.id);
      } else if (user_type === 'astrologer') {
        astrologerSockets.set(user_id, socket.id);
      }
      socket.user_id = user_id;
      socket.user_type = user_type;
    });

    socket.on('initiate_call', async (data) => {
      const { user_id, astrologer_id, call_type } = data;

      try {
        // Validate users and check availability
        const [user, astrologer] = await Promise.all([
          User.findById(user_id).select('busy wallet free_calls_used_today last_free_call_reset').lean(),
          Astrologer.findById(astrologer_id).select('busy is_chat_online is_voice_online is_video_online per_min_chat per_min_voice_call per_min_video_call deviceToken').lean()
        ]);

        if (!user || !astrologer) {
          socket.emit('call_error', { message: 'User or astrologer not found' });
          return;
        }

        // Validate availability
        if (astrologer.busy || !astrologer[`is_${call_type}_online`]) {
          socket.emit('call_rejected', { 
            status: 'astrologer_unavailable',
            message: astrologer.busy ? 'Astrologer is busy' : 'Astrologer is offline' 
          });
          return;
        }

        if (user.busy) {
          socket.emit('call_rejected', { 
            status: 'user_busy',
            message: 'You are already in a call' 
          });
          return;
        }

        // Handle free call logic
        const isFreeCall = await handleFreeCallLogic(user, user_id);

        // Calculate maximum possible call duration based on wallet balance
        const rate = astrologer[`per_min_${call_type}`];
        const maxMinutes = isFreeCall ? 30 : Math.floor(user.wallet / rate);
        
        if (!isFreeCall && maxMinutes < 2) {
          socket.emit('call_rejected', { 
            status: 'insufficient_balance',
            message: 'Insufficient balance for minimum 2-minute call' 
          });
          return;
        }

        // Create call record
        const callHistory = await new CallChatHistory({
          user_id,
          astrologer_id,
          call_type,
          status: 'initiated',
          is_free: isFreeCall,
          rate_per_minute: rate
        }).save();

        // Update busy status
        await Promise.all([
          User.updateOne({ _id: user_id }, { $set: { busy: true, call_type } }),
          Astrologer.updateOne({ _id: astrologer_id }, { $set: { busy: true, call_type } })
        ]);

        const callRoom = `call_${callHistory._id}`;
        socket.join(callRoom);

        // Store call data
        const callData = {
          call_id: callHistory._id.toString(),
          user_id,
          astrologer_id,
          call_type,
          isFreeCall,
          rate_per_minute: rate,
          max_minutes: maxMinutes,
          start_time: null,
          user_socket: socket.id,
          astrologer_socket: null
        };

        activeCalls.set(callHistory._id.toString(), callData);

        // Send FCM to astrologer
        await sendFCMNotification(astrologer.deviceToken, {
          title: 'Incoming Call',
          body: `Incoming ${call_type} call from user`,
          data: {
            call_id: callHistory._id.toString(),
            call_type,
            maximum_minutes: maxMinutes.toString()
          }
        });

        // Set 2-minute auto-reject timer
        const autoRejectTimer = setTimeout(async () => {
          await handleCallEnd(callHistory._id.toString(), 'auto_rejected', {
            message: 'Call auto-rejected - no response from astrologer'
          });
        }, 120000); // 2 minutes

        activeTimers.set(callHistory._id.toString(), { autoRejectTimer });

        // Notify user about call initiation with maximum duration
        socket.emit('call_initiated', {
          call_id: callHistory._id,
          maximum_minutes: maxMinutes,
          message: 'Calling astrologer... Auto-reject in 2 minutes'
        });

      } catch (error) {
        console.error('Error in initiate_call:', error);
        socket.emit('call_error', { message: 'Failed to initiate call' });
      }
    });

    socket.on('accept_call', async ({ call_id }) => {
      try {
        const callData = activeCalls.get(call_id);
        if (!callData) {
          socket.emit('call_error', { message: 'Call not found' });
          return;
        }

        // Clear auto-reject timer
        const timers = activeTimers.get(call_id);
        if (timers?.autoRejectTimer) {
          clearTimeout(timers.autoRejectTimer);
        }

        const callRoom = `call_${call_id}`;
        socket.join(callRoom);

        // Update call data and status
        callData.start_time = Date.now();
        callData.astrologer_socket = socket.id;
        activeCalls.set(call_id, callData);

        await CallChatHistory.updateOne(
          { _id: call_id },
          { $set: { status: 'active', start_time: getCurrentIST() } }
        );

        // Set timer for maximum call duration
        const insufficientBalanceTimer = setTimeout(async () => {
          await handleCallEnd(call_id, 'insufficient_balance', {
            message: 'Call ended - Insufficient balance'
          });
        }, callData.max_minutes * 60 * 1000);

        activeTimers.set(call_id, { insufficientBalanceTimer });

        // Notify both parties about call start
        io.to(callRoom).emit('call_connected', {
          call_id,
          maximum_minutes: callData.max_minutes,
          message: 'Call connected'
        });

      } catch (error) {
        console.error('Error in accept_call:', error);
        socket.emit('call_error', { message: 'Failed to accept call' });
      }
    });

    socket.on('reject_call', async ({ call_id }) => {
      const status = socket.user_type === 'user' ? 'rejected_by_user' : 'rejected_by_astrologer';
      await handleCallEnd(call_id, status, {
        message: `Call rejected by ${socket.user_type}`
      });
    });

    socket.on('end_call', async ({ call_id }) => {
      const status = socket.user_type === 'user' ? 'ended_by_user' : 'ended_by_astrologer';
      await handleCallEnd(call_id, status, {
        message: `Call ended by ${socket.user_type}`
      });
    });

    socket.on('disconnect', async () => {
      if (socket.user_type === 'user') {
        userSockets.delete(socket.user_id);
      } else if (socket.user_type === 'astrologer') {
        astrologerSockets.delete(socket.user_id);
      }

      // Handle any active calls for this socket
      for (const [call_id, callData] of activeCalls.entries()) {
        if (callData.user_socket === socket.id || callData.astrologer_socket === socket.id) {
          await handleCallEnd(call_id, 'disconnected', {
            message: `${socket.user_type} disconnected`
          });
        }
      }
    });
  });

  // Helper function to handle call ending
  async function handleCallEnd(call_id, end_status, { message }) {
    const callData = activeCalls.get(call_id);
    if (!callData) return;

    try {
      // Clear any active timers
      const timers = activeTimers.get(call_id);
      if (timers?.autoRejectTimer) clearTimeout(timers.autoRejectTimer);
      if (timers?.insufficientBalanceTimer) clearTimeout(timers.insufficientBalanceTimer);
      activeTimers.delete(call_id);

      let duration = 0;
      let cost = 0;

      if (callData.start_time) {
        duration = Math.ceil((Date.now() - callData.start_time) / 1000);
        const minutes = Math.ceil(duration / 60);
        cost = callData.isFreeCall ? 0 : minutes * callData.rate_per_minute;
      }

      // Update call history
      await CallChatHistory.updateOne(
        { _id: call_id },
        {
          $set: {
            status: end_status,
            end_time: getCurrentIST(),
            duration,
            cost
          }
        }
      );

      // Update user and astrologer status and wallets
      if (!callData.isFreeCall && cost > 0) {
        await Promise.all([
          User.updateOne(
            { _id: callData.user_id },
            { 
              $set: { busy: false, call_type: '' },
              $inc: { wallet: -cost }
            }
          ),
          Astrologer.updateOne(
            { _id: callData.astrologer_id },
            { 
              $set: { busy: false, call_type: '' },
              $inc: { wallet: cost }
            }
          )
        ]);
      } else {
        await Promise.all([
          User.updateOne(
            { _id: callData.user_id },
            { $set: { busy: false, call_type: '' } }
          ),
          Astrologer.updateOne(
            { _id: callData.astrologer_id },
            { $set: { busy: false, call_type: '' } }
          )
        ]);
      }

      // Notify all participants
      io.to(`call_${call_id}`).emit('call_ended', {
        call_id,
        status: end_status,
        duration,
        cost,
        message
      });

      // Cleanup
      activeCalls.delete(call_id);

    } catch (error) {
      console.error('Error in handleCallEnd:', error);
    }
  }

  async function handleFreeCallLogic(user, user_id) {
    if (isNewDay(user.last_free_call_reset)) {
      await User.updateOne(
        { _id: user_id },
        { 
          $set: { 
            free_calls_used_today: 0,
            last_free_call_reset: getCurrentIST()
          }
        }
      );
      return true;
    }
    return user.free_calls_used_today < CONSTANTS.FREE_CALL_LIMIT;
  }
};

const getCurrentIST = () => new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);

const isNewDay = (lastResetDate) => {
  const now = getCurrentIST();
  const lastReset = new Date(lastResetDate);
  return now.getDate() !== lastReset.getDate() ||
    now.getMonth() !== lastReset.getMonth() ||
    now.getFullYear() !== lastReset.getFullYear();
};

module.exports = { initializeSocket };