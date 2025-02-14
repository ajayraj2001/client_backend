// Constants and configurations
const CONSTANTS = {
  FREE_CALL_PER_MIN: 1
};

const { User, Astrologer, LiveStream, ChatMessage, CallChatHistory, AdminCommissionHistory, AstrologerWalletHistory, UserWalletHistory } = require('./src/models');

const initializeSocket = (server) => {
  const io = require('socket.io')(server, {
    cors: {
      origin: '*',
    },
  });

  // Track active calls
  const activeCalls = new Map();

  // Track live streams and their viewers
  const liveStreams = new Map(); // Map<stream_id, Set<user_id>>

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // --- Call/Chat Logic ---

    // Handle call initiation
    socket.on('initiate_call', async (data) => {
      const { user_id, astrologer_id, call_type } = data;

      try {

        // Get user and astrologer data
        const [user, astrologer] = await Promise.all([
          User.findById(user_id),
          Astrologer.findById(astrologer_id)
        ]);

        // Check if astrologer is online for the call type
        if (astrologer[`is_${call_type}_online`] === 'off' || astrologer.busy) {
          socket.emit('call_rejected', {
            message: astrologer.busy ? 'Astrologer is busy' : 'Astrologer is offline'
          });
          return;
        }

        if (user.busy) {
          socket.emit('call_rejected', { message: 'You are already in a call' });
          return;
        }

        // Reset free call count if it's a new day
        if (isNewDay(user.last_free_call_reset)) {
          user.free_calls_used_today = 0;
          user.last_free_call_reset = new Date();
          await user.save();
        }

        // Check if user has free calls remaining
        const isFreeCall = user.free_calls_used_today < 2; // Allow 2 free calls per day

        if (!isFreeCall) {
          // Check wallet balance for paid call
          const rate = astrologer[`per_min_${call_type}`];
          const minBalance = rate * 2; // 2 minutes balance
          if (user.wallet < minBalance) {
            socket.emit('call_rejected', { message: 'Insufficient balance for a 2-minute call' });
            return;
          }
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
          is_free_call: isFreeCall,
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
          callHistory.end_time = getCurrentIST(); // IST
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
          callHistory.start_time = getCurrentIST();
          await callHistory.save();

          // Increment free call count only if the call is accepted
          if (isFreeCall) {
            user.free_calls_used_today += 1;
            await user.save();
          }

          // Start call duration timer
          const startTime = Date.now();
          socket.on('end_call', async (endedBy) => {
            const endTime = Date.now();
            const duration = Math.ceil((endTime - startTime) / 1000); // in seconds
            // const cost = Math.ceil(duration / 60) * rate; // per-minute billing
            const cost = isFreeCall ? 0 : Math.ceil(duration / 60) * rate; // per-minute billing

            // Deduct user's wallet if not a free call
            if (!isFreeCall) {
              user.wallet -= cost;
              await user.save();
            }

            // Calculate astrologer's commission and admin's share
            const astrologerCommission = isFreeCall ? CONSTANTS.FREE_CALL_PER_MIN : (cost * astrologer.commission) / 100;
            const adminCommission = isFreeCall ? 0 : cost - astrologerCommission;

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
            await updateWalletHistories(callHistory._id, user_id, astrologer_id, cost, astrologerCommission, adminCommission, call_type, isFreeCall);

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

    // --- Live Streaming Logic ---
    // Join a live stream
    socket.on('join_live_stream', async (data) => {
      const { user_id, stream_id } = data;

      try {
        // Check if the live stream exists
        const liveStream = await LiveStream.findById(stream_id);
        if (!liveStream || liveStream.status !== 'Live') {
          socket.emit('live_stream_error', { message: 'Live stream not found or has ended' });
          return;
        }

        // Add the user to the live stream's viewers
        if (!liveStreams.has(stream_id)) {
          liveStreams.set(stream_id, new Set());
        }
        liveStreams.get(stream_id).add(user_id);

        // Update the viewer count in the database
        liveStream.viewers.push(user_id);
        liveStream.total_viewers += 1;
        await liveStream.save();

        // Join the live stream room
        socket.join(stream_id);

        // Notify all users in the room about the new viewer
        io.to(stream_id).emit('user_joined', {
          user_id,
          viewer_count: liveStreams.get(stream_id).size,
        });

        // Send the current viewer count to the new user
        socket.emit('viewer_count_updated', {
          viewer_count: liveStreams.get(stream_id).size,
        });
      } catch (error) {
        console.error('Error joining live stream:', error);
        socket.emit('live_stream_error', { message: 'An error occurred' });
      }
    });

    // Send a message in the live stream
    socket.on('send_live_message', async (data) => {
      const { user_id, stream_id, message } = data;

      try {
        // Check if the live stream exists
        const liveStream = await LiveStream.findById(stream_id);
        if (!liveStream || liveStream.status !== 'Live') {
          socket.emit('live_stream_error', { message: 'Live stream not found or has ended' });
          return;
        }

        // Save the message to the database
        const chatMessage = new ChatMessage({
          user_id,
          stream_id,
          message,
          sender: 'user', // or 'astrologer' if sent by the astrologer
        });
        await chatMessage.save();

        // Broadcast the message to all users in the live stream room
        io.to(stream_id).emit('receive_live_message', chatMessage);
      } catch (error) {
        console.error('Error sending live message:', error);
        socket.emit('live_stream_error', { message: 'An error occurred' });
      }
    });

    // Leave a live stream
    socket.on('leave_live_stream', async (data) => {
      const { user_id, stream_id } = data;

      try {
        // Remove the user from the live stream's viewers
        if (liveStreams.has(stream_id)) {
          liveStreams.get(stream_id).delete(user_id);

          // Update the viewer count in the database
          const liveStream = await LiveStream.findById(stream_id);
          if (liveStream) {
            liveStream.viewers = liveStream.viewers.filter((id) => id.toString() !== user_id);
            liveStream.total_viewers -= 1;
            await liveStream.save();
          }

          // Notify all users in the room about the viewer leaving
          io.to(stream_id).emit('user_left', {
            user_id,
            viewer_count: liveStreams.get(stream_id).size,
          });
        }

        // Leave the live stream room
        socket.leave(stream_id);
      } catch (error) {
        console.error('Error leaving live stream:', error);
        socket.emit('live_stream_error', { message: 'An error occurred' });
      }
    });

    // End a live stream (astrologer only)
    socket.on('end_live_stream', async (data) => {
      const { astrologer_id, stream_id } = data;

      try {
        // Check if the live stream exists and belongs to the astrologer
        const liveStream = await LiveStream.findOne({ _id: stream_id, astrologer_id });
        if (!liveStream || liveStream.status !== 'Live') {
          socket.emit('live_stream_error', { message: 'Live stream not found or has already ended' });
          return;
        }

        // Update the live stream status
        liveStream.status = 'Ended';
        liveStream.end_time = new Date();
        await liveStream.save();

        // Notify all users in the room that the live stream has ended
        io.to(stream_id).emit('live_stream_ended', {
          message: 'The live stream has ended',
        });

        // Clear the live stream from the tracking map
        liveStreams.delete(stream_id);
      } catch (error) {
        console.error('Error ending live stream:', error);
        socket.emit('live_stream_error', { message: 'An error occurred' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log('A user disconnected:', socket.id);

      // --- Cleanup for Live Streams ---
      for (const [stream_id, viewers] of liveStreams.entries()) {
        if (viewers.has(socket.user_id)) {
          viewers.delete(socket.user_id);
          io.to(stream_id).emit('user_left', {
            user_id: socket.user_id,
            viewer_count: viewers.size,
          });

          // Update the viewer count in the database
          const liveStream = await LiveStream.findById(stream_id);
          if (liveStream) {
            liveStream.viewers = liveStream.viewers.filter((id) => id.toString() !== socket.user_id);
            liveStream.total_viewers -= 1;
            await liveStream.save();
          }
        }
      }

      // --- Cleanup for Call Data ---
      const callData = activeCalls.get(socket.id);
      if (callData) {
        const { user_id, astrologer_id, callHistory } = callData;

        // Mark user and astrologer as free
        const user = await User.findById(user_id);
        const astrologer = await Astrologer.findById(astrologer_id);
        if (user) {
          user.busy = false;
          user.call_type = '';
          await user.save();
        }
        if (astrologer) {
          astrologer.busy = false;
          astrologer.call_type = '';
          await astrologer.save();
        }

        // Update call history
        if (callHistory) {
          callHistory.status = 'end_user'; // or 'end_astro' if astrologer disconnects
          callHistory.end_time = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
          await callHistory.save();
        }

        // Remove from active calls
        activeCalls.delete(socket.id);
      }

      // --- Cleanup for Chat Data ---
      // If you have any in-memory chat data, clean it up here
      // For example, if you track active chat sessions in a Map:
      // activeChats.delete(socket.user_id);

      console.log('Cleanup completed for user:', socket.user_id);
    });
  });
};

// Utility functions
const getCurrentIST = () => {
  return new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
};

// Helper function to check if it's a new day
const isNewDay = (lastResetDate) => {
  const now = new Date();
  const lastReset = new Date(lastResetDate);
  return now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
};


// Helper function to update wallet histories
const updateWalletHistories = async (call_id, user_id, astrologer_id, cost, astrologerCommission, adminCommission, call_type, isFreeCall) => {
  // User Wallet History (Debit)
  const userHistory = new UserWalletHistory({
    user_id,
    call_id,
    transaction_type: 'debit',
    amount: cost,
    call_type,
    description: `${call_type} with Astrologer`,
    is_free_call: isFreeCall,
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
    is_free_call: isFreeCall,
  });
  await astrologerHistory.save();

  // Admin Commission History
  const adminHistory = new AdminCommissionHistory({
    astrologer_id,
    call_id,
    user_id,
    call_type,
    amount: adminCommission,
    is_free_call: isFreeCall,
  });
  await adminHistory.save();
};

module.exports = { initializeSocket };