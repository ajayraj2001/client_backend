const { sendFCMNotification } = require('./src/utils/sendNotification');
const { User, Astrologer, CallChatHistory, ChatMessage, UserWalletHistory, AstrologerWalletHistory, AdminCommissionHistory } = require('./src/models');

const CONSTANTS = {
  FREE_CALL_PER_MIN: 1,
  FREE_CALL_LIMIT: 2,
  FREE_CALL_MAX_MINIT: 4
};


const initializeSocket = (server) => {
  const io = require('socket.io')(server, {
    cors: { origin: '*' }
  });

  // Tracking maps
  const activeCalls = new Map(); // Map<call_id, CallData>
  const userSockets = new Map(); // Map<user_id, socket_id>
  const astrologerSockets = new Map(); // Map<astrologer_id, socket_id>
  const activeTimers = new Map(); // Map<call_id, { autoRejectTimer?, insufficientBalanceTimer? }>

  // Room monitoring helper functions
  const getRoomStatus = async (call_id) => {
    const callRoom = `call_${call_id}`;
    const callData = activeCalls.get(call_id);
    const participantCount = io.sockets.adapter.rooms.get(callRoom)?.size || 0;

    return {
      call_id,
      room: callRoom,
      participant_count: participantCount,
      participants: {
        user: Boolean(callData?.user_socket),
        astrologer: Boolean(callData?.astrologer_socket)
      },
      is_complete: participantCount === 2
    };
  };

  // Room monitoring middleware
  io.use((socket, next) => {
    const originalJoin = socket.join;
    socket.join = function (room) {
      // console.log(`Socket ${socket.id} is joining room: ${room}`);
      return originalJoin.apply(this, arguments);
    }
    next();
  });

  // Room event monitoring
  io.of('/').adapter.on('join-room', (room, id) => {
    console.log(`Socket ${id} has joined room ${room}`);
    const call_id = room.replace('call_', '');
    if (room.startsWith('call_')) {
      const callData = activeCalls.get(call_id);
      if (callData) {
        console.log('Current call participants:', {
          user_socket: callData.user_socket,
          astrologer_socket: callData.astrologer_socket
        });
      }
    }
  });

  io.of('/').adapter.on('leave-room', (room, id) => {
    console.log(`Socket ${id} has left room ${room}`);
  });


  io.on('connection', (socket) => {
    console.log('Connected:', socket.id);

    socket.on('register_user', ({ user_id, user_type }) => {
      console.log('register user_id', user_id, 'user_type', user_type)
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
      console.log('data', data)
      try {
        // Validate users and check availability
        const [user, astrologer] = await Promise.all([
          User.findById(user_id).select('name profile_img busy wallet free_calls_used_today last_free_call_reset').lean(),
          Astrologer.findById(astrologer_id).select('busy commission is_chat_online is_voice_online is_video_online per_min_chat per_min_voice_call per_min_video_call deviceToken').lean()
        ]);
        console.log('user, astrologer', user, astrologer)
        if (!user || !astrologer) {
          socket.emit('call_error', { message: 'User or astrologer not found' });
          return;
        }

        // Validate availability
        if (astrologer.busy || !astrologer[`is_${call_type}_online`]) {
          console.log('ghgjg')
          socket.emit('call_rejected', {
            status: 'astrologer_unavailable',
            message: astrologer.busy ? 'Astrologer is busy' : 'Astrologer is offline'
          });
          return;
        }

        if (user.busy) {
          socket.emit('call_rejected', {
            status: 'user_busy',
            message: `You are already in a ${call_type} call`
          });
          return;
        }

        // Handle free call logic
        const isFreeCall = await handleFreeCallLogic(user, user_id);

        // Calculate maximum possible call duration based on wallet balance
        const rate = astrologer[`per_min_${call_type}`];
        const maxMinutes = isFreeCall ? CONSTANTS.FREE_CALL_MAX_MINIT : Math.floor(user.wallet / rate);

        // if (!isFreeCall && maxMinutes < 2) {
        //   socket.emit('call_rejected', {
        //     status: 'insufficient_balance',
        //     message: 'Insufficient balance for minimum 2-minute call'
        //   });
        //   return;
        // }

        // Create call record
        const callHistory = await new CallChatHistory({
          user_id,
          astrologer_id,
          call_type,
          status: 'call_initiate',
          is_free: isFreeCall,
        }).save();

        // Update busy status
        // await Promise.all([
        //   User.updateOne({ _id: user_id }, { $set: { busy: true, call_type } }),
        //   Astrologer.updateOne({ _id: astrologer_id }, { $set: { busy: true, call_type } })
        // ]);

        const callRoom = `call_${callHistory._id}`;
        socket.join(callRoom);

        // Log room join
        // console.log(`User socket ${socket.id} joined room ${callRoom}`);

        // Store call data
        const callData = {
          call_id: callHistory._id.toString(),
          user_id,
          astrologer_id,
          call_type,
          isFreeCall,
          rate_per_minute: rate,
          astrologer_commission: astrologer.commission,
          max_minutes: maxMinutes,
          start_time: null,
          user_socket: socket.id,
          astrologer_socket: null,
          roomParticipants: {
            user: socket.id,
            astrologer: null
          }
        };

        console.log('astrologer.deviceToken', astrologer.deviceToken)

        activeCalls.set(callHistory._id.toString(), callData);

        const roomStatus = await getRoomStatus(callHistory._id.toString());
        console.log('Room status after initiation:', roomStatus);
        // Send FCM to astrologer
        await sendFCMNotification(astrologer.deviceToken, {
          title: 'Incoming Call',
          body: `Incoming ${call_type} call from user`,
          call_id: callHistory._id.toString(),
          call_type,
          maximum_minutes: maxMinutes.toString(),
          user_info: {
            user_id: user._id,
            name: user.name ? user.name : "",  // If user.name exists, use it; otherwise, send an empty string
            profile_img: user.profile_img ? user.profile_img : "",  // If user.profile_img exists, use it; otherwise, send an empty string
          }
        });
        // console.log('astrologer.deviceToken',astrologer.deviceToken)

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
        });  //not needed i think

      } catch (error) {
        // console.error('Error in initiate_call:', error);
        socket.emit('call_error', { message: 'Failed to initiate call' });
      }
    });

    socket.on('accept_call', async ({ call_id }) => {
      console.log('accept_call------------------------------  nw onebuajay raj ', call_id, 'socket id ', socket.id)
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
        callData.roomParticipants.astrologer = socket.id;
        activeCalls.set(call_id, callData);

        // Log updated room status
        const roomStatus = await getRoomStatus(call_id);
        // console.log('Room status after acceptance:', roomStatus);


        await CallChatHistory.updateOne(
          { _id: call_id },
          { $set: { status: 'active', start_time: getCurrentIST() } }
        );

        console.log('saket kuamr pahtkak---------- ', callData.max_minutes)
        // Set timer for maximum call duration
        const insufficientBalanceTimer = setTimeout(async () => {
          // console.log('khan i sher urh insuccicent balance')
          await handleCallEnd(call_id, 'insufficient_balance', {
            message: 'Call ended - Insufficient balance'
          });
        }, callData.max_minutes * 60 * 1000);

        activeTimers.set(call_id, { insufficientBalanceTimer });

        // Notify both parties about call start
        io.to(callRoom).emit('call_connected', {
          call_id,
          maximum_minutes: callData.max_minutes,
          message: 'Call connected',
          room_status: await getRoomStatus(call_id)
        });

        console.log('call_connceted i tink here ***********************')
        // // Notify user about call connection (only user needs this for screen transition)
        // const userSocket = userSockets.get(callData.user_id);
        // if (userSocket) {
        //   io.to(userSocket).emit('call_connected', {
        //     call_id,
        //     maximum_minutes: callData.max_minutes,
        //     message: 'Call connected'
        //   });
        // }

      } catch (error) {
        console.error('Error in accept_call:', error);
        socket.emit('call_error', { message: 'Failed to accept call' });
      }
    });

    socket.on('reject_call', async ({ call_id }) => {
      const status = socket.user_type === 'user' ? 'reject_user' : 'reject_astro';
      await handleCallEnd(call_id, status, socket.user_type, {
        message: `Call rejected by ${socket.user_type}`
      });
    });

    // Handle chat messages
    socket.on('send_message', async (data) => {
      try {
        const { user_id, astrologer_id, message, sender } = data;
        // console.log('data of send message', data)
        // Create and save message
        const chatMessage = new ChatMessage({
          user_id,
          astrologer_id,
          message,
          sender,
          messageType: 'text',
          read: false
        });
        await chatMessage.save();

        // Determine recipient's room
        // Log the recipient socket lookup
        let recipientSocketId;
        if (sender === 'user') {
          // console.log('astrologersocket code map---****',astrologerSockets )
          recipientSocketId = astrologerSockets.get(astrologer_id);
          // console.log('📤 Sending to astro socket:', astrologer_id, recipientSocketId);
        } else {
          recipientSocketId = userSockets.get(user_id);
          // console.log('📤 Sending to user socket:', user_id, recipientSocketId);
        }

        // Log before emitting
        // console.log('📤 About to emit to socket:', recipientSocketId);

        if (recipientSocketId) {
          io.to(recipientSocketId).emit('receive_message', {
            _id: chatMessage._id,
            user_id,
            astrologer_id,
            message,
            sender,
            timestamp: chatMessage.timestamp,
            read: false
          });
          // console.log('✅ Message emitted successfully');
        } else {
          console.log('❌ No recipient socket found');
        }

        // Send confirmation back to sender
        socket.emit('message_sent', {
          _id: chatMessage._id,
          timestamp: chatMessage.timestamp
        });

      } catch (error) {
        console.error('Error in send_message:', error);
        socket.emit('message_error', { message: 'Failed to send message' });
      }
    });

    // Handle typing status
    socket.on('typing_start', (data) => {
      const { user_id, astrologer_id, user_type } = data;
      const key = `${user_id}_${astrologer_id}`;
      typingStatus.set(key, true);

      // Send typing status to the other party
      let recipientSocketId;
      if (user_type === 'user') {
        recipientSocketId = astrologerSockets.get(astrologer_id);
      } else {
        recipientSocketId = userSockets.get(user_id);
      }

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('typing_status', {
          user_type,
          isTyping: true
        });
      }
    });

    socket.on('typing_end', (data) => {
      const { user_id, astrologer_id, user_type } = data;
      const key = `${user_id}_${astrologer_id}`;
      typingStatus.delete(key);

      // Send typing ended status to the other party
      let recipientSocketId;
      if (user_type === 'user') {
        recipientSocketId = astrologerSockets.get(astrologer_id);
      } else {
        recipientSocketId = userSockets.get(user_id);
      }

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('typing_status', {
          user_type,
          isTyping: false
        });
      }
    });

    // Handle message read status
    socket.on('mark_read', async (data) => {
      const { message_id, reader_type } = data;
      try {
        const message = await ChatMessage.findById(message_id);
        if (message && message.sender !== reader_type) {
          message.read = true;
          await message.save();

          // Notify the original sender that their message was read
          let senderSocketId;
          if (reader_type === 'user') {
            senderSocketId = astrologerSockets.get(message.astrologer_id);
          } else {
            senderSocketId = userSockets.get(message.user_id);
          }

          if (senderSocketId) {
            io.to(senderSocketId).emit('message_read', {
              message_id
            });
          }
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });


    socket.on('end_call', async ({ call_id }) => {
      console.log('end_call', call_id)
      const status = socket.user_type === 'user' ? 'ended_by_user' : 'ended_by_astrologer';
      await handleCallEnd(call_id, status, socket.user_type, {
        message: `Call ended by ${socket.user_type}`
      });
    });

    socket.on('disconnect', async () => {
      console.log('disconnecte socketr--------------------------------------------------', socket.user_type)
      if (socket.user_type === 'user') {
        userSockets.delete(socket.user_id);
      } else if (socket.user_type === 'astrologer') {
        astrologerSockets.delete(socket.user_id);
      }

      // Handle any active calls for this socket
      for (const [call_id, callData] of activeCalls.entries()) {
        if (callData.user_socket === socket.id || callData.astrologer_socket === socket.id) {
          await handleCallEnd(call_id, 'disconnected', socket.user_type, {
            message: `${socket.user_type} disconnected`
          });
        }
      }
    });
  });

  // Helper function to handle call ending
  async function handleCallEnd(call_id, end_status, sender, { message }) {
    console.log('handeEndcall', call_id, 'status', end_status)

    // const roomStatus = await getRoomStatus(call_id.toString());
    // console.log('Room status after initiation:', roomStatus);
    const callData = activeCalls.get(call_id);

    // console.log('callId', callData)
    if (!callData) return;

    try {
      // Clear any active timers
      const timers = activeTimers.get(call_id);
      if (timers?.autoRejectTimer) clearTimeout(timers.autoRejectTimer);
      if (timers?.insufficientBalanceTimer) clearTimeout(timers.insufficientBalanceTimer);
      activeTimers.delete(call_id);

      let duration = 0;
      let cost = 0;
      let updateData = { status: end_status };

      // console.log('end_status---------------------#############', end_status)
      // Calculate financials if call was connected and ended normally
      const shouldUpdateWallets = callData.start_time &&
        !['auto_rejected', 'reject_user', 'reject_astro', 'auto_cut'].includes(end_status);

      if (shouldUpdateWallets) {
        duration = Math.ceil((Date.now() - callData.start_time) / 1000);
        const minutes = Math.ceil(duration / 60);
        cost = callData.isFreeCall ? 0 : minutes * callData.rate_per_minute;
        const astrologerCommission = callData.isFreeCall ?
          CONSTANTS.FREE_CALL_PER_MIN :
          (cost * callData.astrologer_commission) / 100;
        const adminCommission = callData.isFreeCall ? 0 : cost - astrologerCommission;

        updateData = {
          ...updateData,
          end_time: getCurrentIST(),
          duration,
          cost,
          astro_cut: astrologerCommission,
          admin_cut: adminCommission
        };

        // Combine wallet updates with busy status updates
        await Promise.all([
          User.updateOne(
            { _id: callData.user_id },
            {
              $inc: { wallet: -cost },
              $set: { busy: false, call_type: '' }
            }
          ),
          Astrologer.updateOne(
            { _id: callData.astrologer_id },
            {
              $inc: { wallet: astrologerCommission },
              $set: { busy: false, call_type: '' }
            }
          ),
          updateWalletHistories(
            call_id,
            callData.user_id,
            callData.astrologer_id,
            cost,
            astrologerCommission,
            adminCommission,
            callData.call_type,
            callData.isFreeCall
          ),
          CallChatHistory.updateOne(
            { _id: call_id },
            { $set: updateData }
          )
        ]);
      } else {
        // If no wallet updates needed, just update busy status
        await Promise.all([
          User.updateOne(
            { _id: callData.user_id },
            { $set: { busy: false, call_type: '' } }
          ),
          Astrologer.updateOne(
            { _id: callData.astrologer_id },
            { $set: { busy: false, call_type: '' } }
          ),
          CallChatHistory.updateOne(
            { _id: call_id },
            { $set: updateData }
          )
        ]);
      }

      let recipientSocketId;
      if (sender === 'user') {
        // console.log('astrologersocket code map---****',astrologerSockets )
        recipientSocketId = astrologerSockets.get(callData.astrologer_id,);
        // console.log('📤 Sending to astro socket:', astrologer_id, recipientSocketId);
      } else {
        recipientSocketId = userSockets.get(callData.user_id,);
        // console.log('📤 Sending to user socket:', user_id, recipientSocketId);
      }

      const finalRoomStatus = await getRoomStatus(call_id);
      // console.log('my name is anthony gonazalish', recipientSocketId)
      // Notify all participants
      // io.to(`call_${call_id}`).emit('call_ended', {
      io.to(recipientSocketId).emit('call_ended', {
        call_id,
        status: end_status,
        duration,
        cost,
        message,
        final_room_status: finalRoomStatus
      });

      // const callRoom = `call_${call_id}`;

      // io.to(callRoom).emit('call_ended', {
      //   call_id,
      //   maximum_minutes: callData.max_minutes,
      //   message: 'Call connected',
      //   room_status: await getRoomStatus(call_id)
      // });

      // Cleanup
      activeCalls.delete(call_id);
      console.log('Call cleanup completed:', { call_id, end_status });

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