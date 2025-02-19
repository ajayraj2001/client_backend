// socket_service.dart
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter/foundation.dart';

class SocketService {
  late IO.Socket socket;
  final String userId;
  final String userType; // 'user' or 'astrologer'
  final Function(Map<String, dynamic>) onMessageReceived;

  SocketService({
    required this.userId,
    required this.userType,
    required this.onMessageReceived,
  }) {
    initializeSocket();
  }

  void initializeSocket() {
    socket = IO.io('YOUR_SOCKET_SERVER_URL', <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
    });

    // Connect to socket
    socket.connect();

    // Register user type
    socket.emit('register_user', {
      'user_id': userId,
      'user_type': userType,
    });

    // Listen for incoming messages
    socket.on('receive_message', (data) {
      onMessageReceived(data);
    });

    // Error handling
    socket.on('connect_error', (error) => debugPrint('Connect error: $error'));
    socket.on('connect', (_) => debugPrint('Connected to socket server'));
    socket.on('disconnect', (_) => debugPrint('Disconnected from socket server'));
  }

  // Send message method
  void sendMessage({
    required String userId,
    required String astrologerId,
    required String message,
  }) {
    socket.emit('send_message', {
      'user_id': userId,
      'astrologer_id': astrologerId,
      'message': message,
      'sender': userType,
    });
  }

  // Cleanup
  void dispose() {
    socket.disconnect();
    socket.dispose();
  }
}

// chat_screen.dart (User App)
class UserChatScreen extends StatefulWidget {
  final String userId;
  final String astrologerId;

  const UserChatScreen({
    Key? key,
    required this.userId,
    required this.astrologerId,
  }) : super(key: key);

  @override
  State<UserChatScreen> createState() => _UserChatScreenState();
}

class _UserChatScreenState extends State<UserChatScreen> {
  late SocketService socketService;
  final List<Map<String, dynamic>> messages = [];
  final TextEditingController messageController = TextEditingController();

  @override
  void initState() {
    super.initState();
    socketService = SocketService(
      userId: widget.userId,
      userType: 'user',
      onMessageReceived: (data) {
        setState(() {
          messages.add(data);
        });
      },
    );
  }

  void sendMessage() {
    if (messageController.text.trim().isEmpty) return;

    socketService.sendMessage(
      userId: widget.userId,
      astrologerId: widget.astrologerId,
      message: messageController.text,
    );

    messageController.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chat with Astrologer')),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              itemCount: messages.length,
              itemBuilder: (context, index) {
                final message = messages[index];
                final isMe = message['sender'] == 'user';

                return Align(
                  alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: EdgeInsets.all(8),
                    padding: EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isMe ? Colors.blue : Colors.grey[300],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      message['message'],
                      style: TextStyle(
                        color: isMe ? Colors.white : Colors.black,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: messageController,
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.send),
                  onPressed: sendMessage,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    socketService.dispose();
    messageController.dispose();
    super.dispose();
  }
}

// chat_screen.dart (Astrologer App)
class AstrologerChatScreen extends StatefulWidget {
  final String astrologerId;
  final String userId;

  const AstrologerChatScreen({
    Key? key,
    required this.astrologerId,
    required this.userId,
  }) : super(key: key);

  @override
  State<AstrologerChatScreen> createState() => _AstrologerChatScreenState();
}

class _AstrologerChatScreenState extends State<AstrologerChatScreen> {
  late SocketService socketService;
  final List<Map<String, dynamic>> messages = [];
  final TextEditingController messageController = TextEditingController();

  @override
  void initState() {
    super.initState();
    socketService = SocketService(
      userId: widget.astrologerId,
      userType: 'astrologer',
      onMessageReceived: (data) {
        setState(() {
          messages.add(data);
        });
      },
    );
  }

  void sendMessage() {
    if (messageController.text.trim().isEmpty) return;

    socketService.sendMessage(
      userId: widget.userId,
      astrologerId: widget.astrologerId,
      message: messageController.text,
    );

    messageController.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chat with User')),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              itemCount: messages.length,
              itemBuilder: (context, index) {
                final message = messages[index];
                final isMe = message['sender'] == 'astrologer';

                return Align(
                  alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: EdgeInsets.all(8),
                    padding: EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isMe ? Colors.blue : Colors.grey[300],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      message['message'],
                      style: TextStyle(
                        color: isMe ? Colors.white : Colors.black,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: messageController,
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.send),
                  onPressed: sendMessage,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    socketService.dispose();
    messageController.dispose();
    super.dispose();
  }
}