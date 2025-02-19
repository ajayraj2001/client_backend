// const CONSTANTS = {
//   FREE_CALL_PER_MIN: 1,
//   FREE_CALL_LIMIT: 2,
// };

// const { sendFCMNotification } = require('./src/utils/sendNotification')
// const { User, Astrologer, LiveStream, ChatMessage, CallChatHistory, AdminCommissionHistory, AstrologerWalletHistory, UserWalletHistory } = require('./src/models');
// // const redis = require('redis');
// // const { promisify } = require('util');

// // Redis client for caching
// // const redisClient = redis.createClient();
// // const getAsync = promisify(redisClient.get).bind(redisClient);
// // const setAsync = promisify(redisClient.set).bind(redisClient);

// const initializeSocket = (server) => {
//   const io = require('socket.io')(server, {
//     cors: {
//       origin: '*',
//     },
//   });

//   // Track active calls
//   const activeCalls = new Map();

//   // Track live streams and their viewers
//   const liveStreams = new Map(); // Map<stream_id, Set<user_id>>

//   io.on('connection', (socket) => {
//     console.log('A user connected:', socket.id);

//     // --- Call/Chat Logic ---

//     // Handle call initiation
//     socket.on('initiate_call', async (data) => {
//       console.log("sunmit emitting initiane call", data)
//       const { user_id, astrologer_id, call_type } = data;
//       console.log('userid', user_id)
//       console.log('astrologer_id', astrologer_id)
//       console.log('call_type', call_type)
//       try {
//         // Fetch user and astrologer data in parallel
//         const [user, astrologer] = await Promise.all([
//           User.findById(user_id).select('busy call_type wallet free_calls_used_today last_free_call_reset').lean(),
//           Astrologer.findById(astrologer_id).select('busy call_type is_chat_online is_voice_online is_video_online commission per_min_chat per_min_voice_call per_min_video_call').lean(),
//         ]);

//         // Check if astrologer is online and not busy
//         if (astrologer.busy || astrologer[`is_${call_type}_online`] === 'off') {
//           socket.emit('call_rejected', {
//             message: astrologer.busy ? 'Astrologer is busy' : 'Astrologer is offline',
//           });
//           return;
//         }

//         // Check if user is busy
//         if (user.busy) {
//           socket.emit('call_rejected', { message: 'You are already in a call' });
//           return;
//         }

//         // Reset free call count if it's a new day
//         if (isNewDay(user.last_free_call_reset)) {
//           user.free_calls_used_today = 0;
//           user.last_free_call_reset = new Date();
//           await User.updateOne({ _id: user_id }, { $set: { free_calls_used_today: 0, last_free_call_reset: new Date() } });
//         }

//         // Check if user has free calls remaining
//         const isFreeCall = user.free_calls_used_today < CONSTANTS.FREE_CALL_LIMIT;

//         if (!isFreeCall) {
//           // Check wallet balance for paid call
//           const rate = astrologer[`per_min_${call_type}`];
//           const minBalance = rate * 2; // 2 minutes balance
//           if (user.wallet < minBalance) {
//             socket.emit('call_rejected', { message: 'Insufficient balance for a 2-minute call' });
//             return;
//           }
//         }

//         // Create call history entry
//         const callHistory = new CallChatHistory({
//           user_id,
//           astrologer_id,
//           call_type,
//           status: 'call_initiate',
//           is_free: isFreeCall,
//         });
//         await callHistory.save();

//         // Mark user and astrologer as busy
//         await Promise.all([
//           User.updateOne({ _id: user_id }, { $set: { busy: true, call_type } }),
//           Astrologer.updateOne({ _id: astrologer_id }, { $set: { busy: true, call_type } }),
//         ]);

//         // Add to active calls
//         activeCalls.set(socket.id, { user_id, astrologer_id, callHistory });

//         const notificationPayload = {
//           title: 'Incoming Call',
//           body: 'You have an incoming call',
//           call_type: call_type,  // Include the call type
//           user_info: {  // Group user-related info in user_info object
//             name: user.name,  // User's name
//             number: user.number,  // User's phone number
//             profile_img: user.profile_img,  // User's profile image
//           },
//         };

//         // Notify astrologer via FCM (offload to background worker)
//         sendFCMNotification(astrologer.deviceToken, notificationPayload);

//         // Emit to user that call is ringing
//         socket.emit('call_ringing', {
//           call_id: callHistory._id,
//           message: 'Calling astrologer...'
//         });

//         // Start auto-cut timer (2 minutes)
//         const autoCutTimer = setTimeout(async () => {
//           socket.emit('call_auto_cut', { message: 'Call auto-cut due to no response' });
//           await CallChatHistory.updateOne({ _id: callHistory._id }, { $set: { status: 'auto_cut', end_time: getCurrentIST() } });

//           // Mark user and astrologer as free
//           await Promise.all([
//             User.updateOne({ _id: user_id }, { $set: { busy: false, call_type: '' } }),
//             Astrologer.updateOne({ _id: astrologer_id }, { $set: { busy: false, call_type: '' } }),
//           ]);

//           // Remove from active calls
//           activeCalls.delete(socket.id);
//         }, 120000); // 2 minutes

//         // When astrologer connects and joins the call
//         socket.on('astrologer_join_call', async (data) => {
//           const { call_id, astrologer_id } = data;
//           socket.join(`call_${call_id}`);

//           // Store astrologer's socket info
//           const callData = Array.from(activeCalls.values())
//             .find(call => call.callHistory._id.toString() === call_id);
//           if (callData) {
//             callData.astrologer_socket = socket.id;
//           }
//         });

//         // Handle call acceptance
//         socket.on('accept_call', async () => {
//           console.log('hi buddu')
//           clearTimeout(autoCutTimer);

//           // Update call history with start time
//           await CallChatHistory.updateOne({ _id: callHistory._id }, { $set: { status: 'accept_astro', start_time: getCurrentIST() } });

//           // Increment free call count only if the call is accepted
//           if (isFreeCall) {
//             await User.updateOne({ _id: user_id }, { $inc: { free_calls_used_today: 1 } });
//           }

//           // Start call duration timer
//           const startTime = Date.now();
//           socket.on('end_call', async (endedBy) => {
//             const endTime = Date.now();
//             const duration = Math.ceil((endTime - startTime) / 1000); // in seconds
//             const cost = isFreeCall ? 0 : Math.ceil(duration / 60) * rate; // per-minute billing

//             // Deduct user's wallet if not a free call
//             if (!isFreeCall) {
//               await User.updateOne({ _id: user_id }, { $inc: { wallet: -cost } });
//             }

//             // Calculate astrologer's commission and admin's share
//             const astrologerCommission = isFreeCall ? CONSTANTS.FREE_CALL_PER_MIN : (cost * astrologer.commission) / 100;
//             const adminCommission = isFreeCall ? 0 : cost - astrologerCommission;

//             // Credit astrologer's wallet
//             await Astrologer.updateOne({ _id: astrologer_id }, { $inc: { wallet: astrologerCommission } });

//             // Update call history
//             await CallChatHistory.updateOne({ _id: callHistory._id }, {
//               $set: {
//                 status: endedBy === 'user' ? 'end_user' : 'end_astro',
//                 end_time: getCurrentIST(),
//                 duration,
//                 cost,
//                 astro_cut: astrologerCommission,
//                 admin_cut: adminCommission,
//               },
//             });

//             // Save to wallet histories (offload to background worker)
//             await updateWalletHistories(callHistory._id, user_id, astrologer_id, cost, astrologerCommission, adminCommission, call_type, isFreeCall);

//             // Mark user and astrologer as free
//             await Promise.all([
//               User.updateOne({ _id: user_id }, { $set: { busy: false, call_type: '' } }),
//               Astrologer.updateOne({ _id: astrologer_id }, { $set: { busy: false, call_type: '' } }),
//             ]);

//             // Remove from active calls
//             activeCalls.delete(socket.id);
//           });
//         });
//       } catch (error) {
//         console.error('Error in initiate_call:', error);
//         socket.emit('call_rejected', { message: 'An error occurred' });
//       }
//     });

//     // Handle chat messages
//     socket.on('send_message', async (data) => {
//       console.log('hey buddy')
//       const { user_id, astrologer_id, message, sender } = data;
//       const chatMessage = new ChatMessage({ user_id, astrologer_id, message, sender });
//       await chatMessage.save();
//       socket.to(astrologer_id).emit('receive_message', chatMessage);
//     });

//     // --- Live Streaming Logic ---
//     // Join a live stream
//     socket.on('join_live_stream', async (data) => {
//       const { user_id, stream_id } = data;

//       try {
//         // Check if the live stream exists
//         const liveStream = await LiveStream.findById(stream_id);
//         if (!liveStream || liveStream.status !== 'Live') {
//           socket.emit('live_stream_error', { message: 'Live stream not found or has ended' });
//           return;
//         }

//         // Add the user to the live stream's viewers
//         if (!liveStreams.has(stream_id)) {
//           liveStreams.set(stream_id, new Set());
//         }
//         liveStreams.get(stream_id).add(user_id);

//         // Update the viewer count in the database
//         liveStream.viewers.push(user_id);
//         liveStream.total_viewers += 1;
//         await liveStream.save();

//         // Join the live stream room
//         socket.join(stream_id);

//         // Notify all users in the room about the new viewer
//         io.to(stream_id).emit('user_joined', {
//           user_id,
//           viewer_count: liveStreams.get(stream_id).size,
//         });

//         // Send the current viewer count to the new user
//         socket.emit('viewer_count_updated', {
//           viewer_count: liveStreams.get(stream_id).size,
//         });
//       } catch (error) {
//         console.error('Error joining live stream:', error);
//         socket.emit('live_stream_error', { message: 'An error occurred' });
//       }
//     });

//     // Send a message in the live stream
//     socket.on('send_live_message', async (data) => {
//       const { user_id, stream_id, message } = data;

//       try {
//         // Check if the live stream exists
//         const liveStream = await LiveStream.findById(stream_id);
//         if (!liveStream || liveStream.status !== 'Live') {
//           socket.emit('live_stream_error', { message: 'Live stream not found or has ended' });
//           return;
//         }

//         // Save the message to the database
//         const chatMessage = new ChatMessage({
//           user_id,
//           stream_id,
//           message,
//           sender: 'user', // or 'astrologer' if sent by the astrologer
//         });
//         await chatMessage.save();

//         // Broadcast the message to all users in the live stream room
//         io.to(stream_id).emit('receive_live_message', chatMessage);
//       } catch (error) {
//         console.error('Error sending live message:', error);
//         socket.emit('live_stream_error', { message: 'An error occurred' });
//       }
//     });

//     // Leave a live stream
//     socket.on('leave_live_stream', async (data) => {
//       const { user_id, stream_id } = data;

//       try {
//         // Remove the user from the live stream's viewers
//         if (liveStreams.has(stream_id)) {
//           liveStreams.get(stream_id).delete(user_id);

//           // Update the viewer count in the database
//           const liveStream = await LiveStream.findById(stream_id);
//           if (liveStream) {
//             liveStream.viewers = liveStream.viewers.filter((id) => id.toString() !== user_id);
//             liveStream.total_viewers -= 1;
//             await liveStream.save();
//           }

//           // Notify all users in the room about the viewer leaving
//           io.to(stream_id).emit('user_left', {
//             user_id,
//             viewer_count: liveStreams.get(stream_id).size,
//           });
//         }

//         // Leave the live stream room
//         socket.leave(stream_id);
//       } catch (error) {
//         console.error('Error leaving live stream:', error);
//         socket.emit('live_stream_error', { message: 'An error occurred' });
//       }
//     });

//     // End a live stream (astrologer only)
//     socket.on('end_live_stream', async (data) => {
//       const { astrologer_id, stream_id } = data;

//       try {
//         // Check if the live stream exists and belongs to the astrologer
//         const liveStream = await LiveStream.findOne({ _id: stream_id, astrologer_id });
//         if (!liveStream || liveStream.status !== 'Live') {
//           socket.emit('live_stream_error', { message: 'Live stream not found or has already ended' });
//           return;
//         }

//         // Update the live stream status
//         liveStream.status = 'Ended';
//         liveStream.end_time = new Date();
//         await liveStream.save();

//         // Notify all users in the room that the live stream has ended
//         io.to(stream_id).emit('live_stream_ended', {
//           message: 'The live stream has ended',
//         });

//         // Clear the live stream from the tracking map
//         liveStreams.delete(stream_id);
//       } catch (error) {
//         console.error('Error ending live stream:', error);
//         socket.emit('live_stream_error', { message: 'An error occurred' });
//       }
//     });

//     // Handle disconnect
//     socket.on('disconnect', async () => {
//       console.log('A user disconnected:', socket.id);

//       // --- Cleanup for Live Streams ---
//       for (const [stream_id, viewers] of liveStreams.entries()) {
//         if (viewers.has(socket.user_id)) {
//           viewers.delete(socket.user_id);
//           io.to(stream_id).emit('user_left', {
//             user_id: socket.user_id,
//             viewer_count: viewers.size,
//           });

//           // Update the viewer count in the database
//           const liveStream = await LiveStream.findById(stream_id);
//           if (liveStream) {
//             liveStream.viewers = liveStream.viewers.filter((id) => id.toString() !== socket.user_id);
//             liveStream.total_viewers -= 1;
//             await liveStream.save();
//           }
//         }
//       }

//       // --- Cleanup for Call Data ---
//       const callData = activeCalls.get(socket.id);
//       if (callData) {
//         const { user_id, astrologer_id, callHistory } = callData;

//         // Mark user and astrologer as free
//         const user = await User.findById(user_id);
//         const astrologer = await Astrologer.findById(astrologer_id);
//         if (user) {
//           user.busy = false;
//           user.call_type = '';
//           await user.save();
//         }
//         if (astrologer) {
//           astrologer.busy = false;
//           astrologer.call_type = '';
//           await astrologer.save();
//         }

//         // Update call history
//         if (callHistory) {
//           callHistory.status = 'end_user'; // or 'end_astro' if astrologer disconnects
//           callHistory.end_time = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
//           await callHistory.save();
//         }

//         // Remove from active calls
//         activeCalls.delete(socket.id);
//       }

//       // --- Cleanup for Chat Data ---
//       // If you have any in-memory chat data, clean it up here
//       // For example, if you track active chat sessions in a Map:
//       // activeChats.delete(socket.user_id);

//       console.log('Cleanup completed for user:', socket.user_id);
//     });
//   });
// };

// // Utility functions
// const getCurrentIST = () => {
//   return new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
// };

// // Helper function to check if it's a new day
// const isNewDay = (lastResetDate) => {
//   const now = new Date();
//   const lastReset = new Date(lastResetDate);
//   return now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
// };


// // Helper function to update wallet histories
// const updateWalletHistories = async (call_id, user_id, astrologer_id, cost, astrologerCommission, adminCommission, call_type, isFreeCall) => {
//   // User Wallet History (Debit)
//   const userHistory = new UserWalletHistory({
//     user_id,
//     call_id,
//     transaction_type: 'debit',
//     amount: cost,
//     call_type,
//     description: `${call_type} with Astrologer`,
//     is_free_call: isFreeCall,
//   });
//   await userHistory.save();

//   // Astrologer Wallet History (Credit)
//   const astrologerHistory = new AstrologerWalletHistory({
//     astrologer_id,
//     call_id,
//     transaction_type: 'credit',
//     amount: astrologerCommission,
//     description: `Earnings from ${call_type}`,
//     call_type,
//     status: 'end_user', // Assuming the call ended by the user
//     is_free_call: isFreeCall,
//   });
//   await astrologerHistory.save();

//   // Admin Commission History
//   const adminHistory = new AdminCommissionHistory({
//     astrologer_id,
//     call_id,
//     user_id,
//     call_type,
//     amount: adminCommission,
//     is_free_call: isFreeCall,
//   });
//   await adminHistory.save();
// };

// module.exports = { initializeSocket };



// //new
// const CONSTANTS = {
//   FREE_CALL_PER_MIN: 1,
//   FREE_CALL_LIMIT: 2,
//   AUTO_CUT_TIMEOUT: 120000, // 2 minutes in milliseconds
// };

// const { sendFCMNotification } = require('./src/utils/sendNotification');
// const { User, Astrologer, LiveStream, ChatMessage, CallChatHistory, AdminCommissionHistory, AstrologerWalletHistory, UserWalletHistory } = require('./src/models');

// const initializeSocket = (server) => {
//   const io = require('socket.io')(server, {
//     cors: { origin: '*' }
//   });

//   // Tracking maps
//   const activeCalls = new Map(); // Map<call_id, CallData>
//   const userSockets = new Map(); // Map<user_id, socket_id>
//   const astrologerSockets = new Map(); // Map<astrologer_id, socket_id>
//   const activeTimers = new Map(); // Map<call_id, Timer>

//   io.on('connection', (socket) => {
//     console.log('Connected:', socket.id);

//     // Store socket mapping on connection
//     socket.on('register_user', ({ user_id, user_type }) => {
//       if (user_type === 'user') {
//         userSockets.set(user_id, socket.id);
//       } else if (user_type === 'astrologer') {
//         astrologerSockets.set(user_id, socket.id);
//       }
//       socket.user_id = user_id;
//       socket.user_type = user_type;
//     });

//     // Handle call initiation
//     socket.on('initiate_call', async (data) => {
//       const { user_id, astrologer_id, call_type } = data;

//       try {
//         // Validate users and check availability
//         const [user, astrologer] = await Promise.all([
//           User.findById(user_id).select('busy wallet free_calls_used_today last_free_call_reset').lean(),
//           Astrologer.findById(astrologer_id).select('busy is_chat_online is_voice_online is_video_online commission per_min_chat per_min_voice_call per_min_video_call deviceToken').lean()
//         ]);

//         if (!user || !astrologer) {
//           socket.emit('call_error', { message: 'User or astrologer not found' });
//           return;
//         }

//         // Validate availability
//         if (astrologer.busy || astrologer[`is_${call_type}_online`] === 'off') {
//           socket.emit('call_rejected', { message: astrologer.busy ? 'Astrologer is busy' : 'Astrologer is offline' });
//           return;
//         }

//         if (user.busy) {
//           socket.emit('call_rejected', { message: 'You are already in a call' });
//           return;
//         }

//         // Handle free call logic
//         const isFreeCall = await handleFreeCallLogic(user, user_id);

//         // Check wallet balance for paid calls
//         if (!isFreeCall) {
//           const rate = astrologer[`per_min_${call_type}`];
//           const minBalance = rate * 2;
//           if (user.wallet < minBalance) {
//             socket.emit('call_rejected', { message: 'Insufficient balance for a 2-minute call' });
//             return;
//           }
//         }

//         // Create call record
//         const callHistory = await new CallChatHistory({
//           user_id,
//           astrologer_id,
//           call_type,
//           status: 'call_initiate',
//           is_free: isFreeCall,
//         }).save();

//         // Update busy status
//         await Promise.all([
//           User.updateOne({ _id: user_id }, { $set: { busy: true, call_type } }),
//           Astrologer.updateOne({ _id: astrologer_id }, { $set: { busy: true, call_type } })
//         ]);

//         // Store call data
//         const callData = {
//           call_id: callHistory._id,
//           user_id,
//           astrologer_id,
//           call_type,
//           isFreeCall,
//           start_time: null,
//           user_socket: socket.id,
//           astrologer_socket: astrologerSockets.get(astrologer_id)
//         };

//         activeCalls.set(callHistory._id.toString(), callData);

//         // Create unique room for this call
//         const callRoom = `call_${callHistory._id}`;
//         socket.join(callRoom);

//         // Send FCM to astrologer
//         sendFCMNotification(astrologer.deviceToken, {
//           title: 'Incoming Call',
//           body: 'You have an incoming call',
//           call_id: callHistory._id,
//           call_type,
//           user_info: { name: user.name, profile_img: user.profile_img }
//         });

//         // Emit to user
//         socket.emit('call_ringing', {
//           call_id: callHistory._id,
//           message: 'Calling astrologer...'
//         });  //not needed i think--------------------------------------------

//         // Set auto-cut timer with simplified logic
//         const timer = setTimeout(async () => {
//           const call_id = callHistory._id.toString();

//           // Notify all users in the call room
//           io.to(callRoom).emit('call_auto_cut', {
//             call_id,
//             message: 'Call auto-cut due to no response'
//           });

//           // Update call history
//           await CallChatHistory.updateOne(
//             { _id: call_id },
//             {
//               $set: {
//                 status: 'auto_cut',
//                 end_time: getCurrentIST()
//               }
//             }
//           );

//           // Free up user and astrologer
//           await Promise.all([
//             User.updateOne(
//               { _id: user_id },
//               { $set: { busy: false, call_type: '' } }
//             ),
//             Astrologer.updateOne(
//               { _id: astrologer_id },
//               { $set: { busy: false, call_type: '' } }
//             )
//           ]);

//           // Cleanup
//           activeCalls.delete(call_id);
//           activeTimers.delete(call_id);

//         }, CONSTANTS.AUTO_CUT_TIMEOUT);

//         activeTimers.set(callHistory._id.toString(), timer);

//       } catch (error) {
//         console.error('Error in initiate_call:', error);
//         socket.emit('call_error', { message: 'Failed to initiate call' });
//       }
//     });

//     // Handle call acceptance (separate from initiate_call)
//     socket.on('accept_call', async ({ call_id }) => {
//       try {
//         console.log('call accpeted by astrologer', call_id)
//         const callData = activeCalls.get(call_id.toString());
//         if (!callData) {
//           socket.emit('call_error', { message: 'Call not found' });
//           return;
//         }

//         // Clear auto-cut timer
//         clearTimeout(activeTimers.get(call_id.toString()));
//         activeTimers.delete(call_id.toString());

//         // Join call room
//         const callRoom = `call_${call_id}`;
//         socket.join(callRoom);

//         // Update call status
//         await CallChatHistory.updateOne(
//           { _id: call_id },
//           { $set: { status: 'active', start_time: getCurrentIST() } }
//         );

//         // Update call data
//         callData.start_time = Date.now();
//         callData.astrologer_socket = socket.id;
//         activeCalls.set(call_id.toString(), callData);

//         // Notify both parties
//         io.to(callRoom).emit('call_started', {
//           call_id,
//           message: 'Call connected'
//         });

//       } catch (error) {
//         console.error('Error in accept_call:', error);
//         socket.emit('call_error', { message: 'Failed to accept call' });
//       }
//     });

//     // Handle chat messages
//     socket.on('send_message', async ({ call_id, message }) => {
//       try {
//         const callData = activeCalls.get(call_id.toString());
//         if (!callData) return;

//         const chatMessage = await new ChatMessage({
//           call_id,
//           user_id: socket.user_type === 'user' ? socket.user_id : callData.user_id,
//           astrologer_id: socket.user_type === 'astrologer' ? socket.user_id : callData.astrologer_id,
//           message,
//           sender: socket.user_type
//         }).save();

//         io.to(`call_${call_id}`).emit('new_message', chatMessage);

//       } catch (error) {
//         console.error('Error in send_message:', error);
//       }
//     });

//     // Handle call end
//     socket.on('end_call', async ({ call_id }) => {
//       console.log('call ened by astro ')
//       await handleCallEnd(call_id, socket.user_type === 'user' ? 'end_user' : 'end_astro');
//     });

//     // Handle disconnection
//     socket.on('disconnect', async () => {
//       console.log('user is disconnected')
//       if (socket.user_type === 'user') {
//         userSockets.delete(socket.user_id);
//       } else if (socket.user_type === 'astrologer') {
//         astrologerSockets.delete(socket.user_id);
//       }

//       // Handle any active calls for this socket
//       for (const [call_id, callData] of activeCalls.entries()) {
//         if (callData.user_socket === socket.id || callData.astrologer_socket === socket.id) {
//           await handleCallEnd(call_id, 'disconnected');
//         }
//       }
//     });
//   });

//   // Helper function to handle call ending
//   async function handleCallEnd(call_id, end_reason) {
//     const callData = activeCalls.get(call_id.toString());
//     if (!callData) return;

//     try {
//       const duration = Math.ceil((Date.now() - callData.start_time) / 1000)
//       const cost = callData.isFreeCall ? 0 : Math.ceil(duration / 60) * rate; // per-minute billing

//       // Calculate astrologer's commission and admin's share
//       const astrologerCommission = callData.isFreeCall ? CONSTANTS.FREE_CALL_PER_MIN : (cost * astrologer.commission) / 100;
//       const adminCommission = callData.isFreeCall ? 0 : cost - astrologerCommission;

//       // Update all relevant records
//       await Promise.all([
//         // Update call history
//         CallChatHistory.updateOne(
//           { _id: call_id },
//           {
//             $set: {
//               status: end_reason,
//               end_time: getCurrentIST(),
//               duration,
//               cost,
//               astro_cut: astrologerCommission,
//               admin_cut: adminCommission
//             }
//           }
//         ),

//         // Update wallets
//         User.updateOne(
//           { _id: callData.user_id },
//           { $set: { busy: false, call_type: '' }, $inc: { wallet: -cost } }
//         ),

//         Astrologer.updateOne(
//           { _id: callData.astrologer_id },
//           { $set: { busy: false, call_type: '' }, $inc: { wallet: astrologerCommission } }
//         ),

//         // Create wallet histories
//         updateWalletHistories(
//           call_id,
//           callData.user_id,
//           callData.astrologer_id,
//           cost,
//           astrologerCommission,
//           adminCommission,
//           callData.call_type,
//           callData.isFreeCall
//         )
//       ]);

//       // Notify users
//       io.to(`call_${call_id}`).emit('call_ended', {
//         call_id,
//         duration,
//         end_reason
//       });

//       // Cleanup
//       activeCalls.delete(call_id.toString());
//       const timer = activeTimers.get(call_id.toString());
//       if (timer) {
//         clearTimeout(timer);
//         activeTimers.delete(call_id.toString());
//       }

//     } catch (error) {
//       console.error('Error in handleCallEnd:', error);
//     }
//   }

//   // Helper function to handle free call logic
//   async function handleFreeCallLogic(user, user_id) {
//     if (isNewDay(user.last_free_call_reset)) {
//       await User.updateOne(
//         { _id: user_id },
//         { $set: { free_calls_used_today: 0, last_free_call_reset: new Date() } }
//       );
//       return true;
//     }
//     return user.free_calls_used_today < CONSTANTS.FREE_CALL_LIMIT;
//   }
// };

// // Utility functions remain the same
// const getCurrentIST = () => new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);

// const isNewDay = (lastResetDate) => {
//   const now = new Date();
//   const lastReset = new Date(lastResetDate);
//   return now.getDate() !== lastReset.getDate() ||
//     now.getMonth() !== lastReset.getMonth() ||
//     now.getFullYear() !== lastReset.getFullYear();
// };

// module.exports = { initializeSocket };