const { User,
  Astrologer,
  CallChatHistory,
  AdminCommissionHistory,
  AstrologerWalletHistory,
  UserWalletHistory,
} = require('./src/models')

const initializeSocket = (server) => {
  const io = require('socket.io')(server, {
    cors: {
      origin: '*',
    },
  });

  // Track active calls
  const activeCalls = new Map();

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle call initiation
    socket.on('initiate_call', async (data) => {
      const { user_id, astrologer_id, call_type } = data;

      try {
        // Check if astrologer is online for the call type
        const astrologer = await Astrologer.findById(astrologer_id);
        if (
          (astrologer.is_voice_online === "off" && call_type === "voice") ||
          (astrologer.is_chat_online === "off" && call_type === "chat") ||
          (astrologer.is_video_online === "off" && call_type === "video")
        ) {
          socket.emit('call_rejected', { message: 'Astrologer is offline' });
          return;
        }

        // Check if user or astrologer is busy
        const user = await User.findById(user_id);
        if (user.busy || astrologer.busy) {
          socket.emit('call_rejected', { message: user.busy ? 'You are already in a call' : 'Astrologer is busy' });
          return;
        }

        // Check if user has at least 2 minutes of balance
        const rate = astrologer[`per_min_${call_type}`];
        const minBalance = rate * 2; // 2 minutes balance
        if (user.wallet < minBalance) {
          socket.emit('call_rejected', { message: 'Insufficient balance for a 2-minute call' });
          return;
        }

        // Create call history entry
        const callHistory = new CallChatHistory({
          user_id,
          astrologer_id,
          call_type,
          status: 'call_initiate',
        });
        await callHistory.save();

        // Mark user and astrologer as busy
        user.busy = true;
        user.call_type = call_type;
        astrologer.busy = true;
        astrologer.call_type = call_type;
        await user.save();
        await astrologer.save();

        // Add to active calls
        activeCalls.set(socket.id, { user_id, astrologer_id, callHistory });

        // Notify astrologer via FCM
        sendFCMNotification(astrologer.deviceToken, { title: 'Incoming Call', body: 'You have an incoming call' });

        // Start auto-cut timer (2 minutes)
        const autoCutTimer = setTimeout(async () => {
          socket.emit('call_auto_cut', { message: 'Call auto-cut due to no response' });
          callHistory.status = 'auto_cut';
          callHistory.end_time = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
          await callHistory.save();

          // Mark user and astrologer as free
          user.busy = false;
          user.call_type = '';
          astrologer.busy = false;
          astrologer.call_type = '';
          await user.save();
          await astrologer.save();

          // Remove from active calls
          activeCalls.delete(socket.id);
        }, 120000); // 2 minutes

        // Handle call acceptance
        socket.on('accept_call', async () => {
          clearTimeout(autoCutTimer);

          // Update call history with start time
          callHistory.status = 'accept_astro';
          callHistory.start_time = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
          await callHistory.save();

          // Start call duration timer
          const startTime = Date.now();
          socket.on('end_call', async (endedBy) => {
            const endTime = Date.now();
            const duration = Math.ceil((endTime - startTime) / 1000); // in seconds
            const cost = Math.ceil(duration / 60) * rate; // per-minute billing

            // Deduct user's wallet
            user.wallet -= cost;
            await user.save();

            // Calculate astrologer's commission and admin's share
            const astrologerCommission = (cost * astrologer.commission) / 100;
            const adminCommission = cost - astrologerCommission;

            // Credit astrologer's wallet
            astrologer.wallet += astrologerCommission;
            await astrologer.save();

            // Update call history
            callHistory.status = endedBy === 'user' ? 'end_user' : 'end_astro'; // Who ended the call
            callHistory.end_time = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
            callHistory.duration = duration;
            callHistory.cost = cost;
            callHistory.astro_cut = astrologerCommission;
            callHistory.admin_cut = adminCommission;
            await callHistory.save();

            // Save to wallet histories
            await updateWalletHistories(callHistory._id, user_id, astrologer_id, cost, astrologerCommission, adminCommission, call_type);

            // Mark user and astrologer as free
            user.busy = false;
            user.call_type = '';
            astrologer.busy = false;
            astrologer.call_type = '';
            await user.save();
            await astrologer.save();

            // Remove from active calls
            activeCalls.delete(socket.id);
          });
        });
      } catch (error) {
        console.error('Error in initiate_call:', error);
        socket.emit('call_rejected', { message: 'An error occurred' });
      }
    });

    // Handle chat messages
    socket.on('send_message', async (data) => {
      const { user_id, astrologer_id, message, sender } = data;
      const chatMessage = new ChatMessage({ user_id, astrologer_id, message, sender });
      await chatMessage.save();
      socket.to(astrologer_id).emit('receive_message', chatMessage);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      const callData = activeCalls.get(socket.id);
      if (callData) {
        const { user_id, astrologer_id, callHistory } = callData;

        // Mark user and astrologer as free
        const user = await User.findById(user_id);
        const astrologer = await Astrologer.findById(astrologer_id);
        user.busy = false;
        user.call_type = '';
        astrologer.busy = false;
        astrologer.call_type = '';
        await user.save();
        await astrologer.save();

        // Update call history
        callHistory.status = 'end_user'; // or 'end_astro' if astrologer disconnects
        callHistory.end_time = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
        await callHistory.save();

        // Remove from active calls
        activeCalls.delete(socket.id);
      }
      console.log('A user disconnected:', socket.id);
    });
  });
};

const updateWalletHistories = async (call_id, user_id, astrologer_id, cost, astrologerCommission, adminCommission, call_type) => {
  // User Wallet History (Debit)
  const userHistory = new UserWalletHistory({
    user_id,
    call_id,
    transaction_type: 'debit',
    amount: cost,
    call_type,
    description: `${call_type} with Astrologer`,
  });
  await userHistory.save();

  // Astrologer Wallet History (Credit)
  const astrologerHistory = new AstrologerWalletHistory({
    astrologer_id,
    call_id,
    transaction_type: 'credit',
    amount: astrologerCommission,
    description: `Earnings from ${call_type}`,
    call_type,
    status: 'end_user', // Assuming the call ended by the user
  });
  await astrologerHistory.save();

  // Admin Commission History
  const adminHistory = new AdminCommissionHistory({
    astrologer_id,
    call_id,
    user_id,
    call_type,
    amount: adminCommission,
  });
  await adminHistory.save();
};

module.exports = {initializeSocket}