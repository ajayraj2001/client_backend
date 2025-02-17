// ... rest of the code remains the same ...

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
      const currentTime = getCurrentIST();
      callData.start_time = Date.now();
      callData.astrologer_socket = socket.id;
      activeCalls.set(call_id, callData);

      await CallChatHistory.updateOne(
        { _id: call_id },
        { 
          $set: { 
            status: 'accept_astro',
            start_time: currentTime 
          }
        }
      );

      // Set timer for maximum call duration
      const insufficientBalanceTimer = setTimeout(async () => {
        await handleCallEnd(call_id, 'insufficient_balance', {
          message: 'Call ended - Insufficient balance'
        });
      }, callData.max_minutes * 60 * 1000);

      activeTimers.set(call_id, { insufficientBalanceTimer });

      // Notify user about call connection (only user needs this for screen transition)
      const userSocket = userSockets.get(callData.user_id);
      if (userSocket) {
        io.to(userSocket).emit('call_connected', {
          call_id,
          maximum_minutes: callData.max_minutes,
          message: 'Call connected'
        });
      }

    } catch (error) {
      console.error('Error in accept_call:', error);
      socket.emit('call_error', { message: 'Failed to accept call' });
    }
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
      let updateData = {
        status: end_status
      };

      // Only set duration, cost, and end_time if call was actually started
      if (callData.start_time && end_status !== 'auto_cut') {
        duration = Math.ceil((Date.now() - callData.start_time) / 1000);
        const minutes = Math.ceil(duration / 60);
        cost = callData.isFreeCall ? 0 : minutes * callData.rate_per_minute;
        
        updateData = {
          ...updateData,
          end_time: getCurrentIST(),
          duration,
          cost
        };
      }

      // Update call history
      await CallChatHistory.updateOne(
        { _id: call_id },
        { $set: updateData }
      );

      // Update user and astrologer status and wallets only if call had started and there was a cost
      if (callData.start_time && cost > 0) {
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
        // Just reset busy status if no cost involved
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

      // Notify all participants about call end
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

// ... rest of the code remains the same ...