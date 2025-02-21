import 'dart:async';
import 'package:logger/logger.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;
import '../modals/chat_modal.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;

  socket_io.Socket? _socket;
  final Logger _logger = Logger();

  SocketService._internal();

  /// 🔥 Stream Controller for real-time messages
  final StreamController<Map<String, dynamic>> _messageStreamController = StreamController.broadcast();

  Stream<Map<String, dynamic>> get messageStream => _messageStreamController.stream;

  /// ✅ Check if socket is connected
  bool get isConnected => _socket?.connected ?? false;

  Future<bool> connect() async {
    final completer = Completer<bool>();

    if (_socket != null && _socket!.connected) {
      _logger.i("✅ Already connected to socket");
      return true;
    }

    _socket = socket_io.io(
      "http://192.168.1.5:5001",
      socket_io.OptionBuilder()
          .setTransports(["websocket"])
          .enableAutoConnect()
          .setReconnectionAttempts(5) // Retry up to 5 times
          .build(),
    );

    socket?.on("connect", () {
      _logger.i("✅ Connected to server");
      if (!completer.isCompleted) {
        completer.complete(true);
      }
    });

    _socket?.on("connect_error", (error) {
      _logger.e("⛔ Connection error: $error");
      if (!completer.isCompleted) {
        completer.complete(false);
      }
    });

    socket?.on("disconnect", () {
      _logger.w("⚠️ Disconnected from server");
    });

    _socket?.on("receive_message", (data) {
      _logger.i("📩 Message received: $data");

      // ✅ Prevent adding to a closed stream
      if (!_messageStreamController.isClosed) {
        _messageStreamController.add(data);
      } else {
        _logger.w("⚠️ StreamController is closed, ignoring message.");
      }
    });

    _socket?.connect();
    return completer.future;
  }

  /// 📌 Connect with user registration
  Future<bool> connectWithRegister({required String userId, required String userType}) async {
    final completer = Completer<bool>();

    _socket = socket_io.io(
      "http://192.168.1.5:5001",
      socket_io.OptionBuilder()
          .setTransports(["websocket"])
          .enableAutoConnect()
          .build(),
    );

    socket?.on("connect", () {
      Logger().i("✅ Connected to server");
      registerUser(userId, userType);
      completer.complete(true);
    });

    _socket?.on("connect_error", (error) {
      Logger().e("⛔ Connection error: $error");
      completer.complete(false);
    });

    _socket?.connect();
    return completer.future;
  }

  /// 🔄 Register user with socket server
  void registerUser(String userId, String userType) {
    RegisterUser user = RegisterUser(user_id: userId, user_type: userType);
    _socket?.emit("register_user", user.toJson());
    Logger().i("🆔 User Registered: ${user.toJson()}");
  }

  /// 🚪 Disconnect & clean up
  void disconnect() {
    _socket?.disconnect();
  //  _removeListeners();

    // ✅ Only close the stream if it's not closed already
    if (!_messageStreamController.isClosed) {
      _messageStreamController.close();
    }

    _logger.w("🚪 Socket Disconnected.");
  }

  /// 📨 Send chat message
  void sendChatMessage(String message) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit("chat message", message);
      _logger.i("📤 Chat Message Sent: $message");
    } else {
      _logger.e("⛔ Cannot send message. Socket not connected.");
    }
  }

  /// 📞 Initiate Call
  void sendInitiateCall({required String userId, required String astrologerId, required String callType}) {
    final initiateCall = InitiateCall(user_id: userId, astrologer_id: astrologerId, call_type: callType);
    _socket?.emit("initiate_call", initiateCall.toJson());
    _logger.i("📞 Call Initiated: ${initiateCall.toJson()}");
  }

  /// 📴 End Call
  void sendEndCall({required String callId}) {
    final acceptCall = AcceptCall(call_id: callId);
    _socket?.emit("end_call", acceptCall.toJson());
    //_removeListeners();
    _logger.i("📴 Call Ended: ${acceptCall.toJson()}");
  }

  /// ✉️ Send Message with Reconnection Handling
  Future<void> sendMessage({required String userId, required String astrologerId, required String message}) async {
    if (_socket == null || !_socket!.connected) {
      _logger.e("⛔ Socket not connected. Attempting to reconnect...");

      bool isReconnected = await connect();
      if (!isReconnected) {
        _logger.e("❌ Reconnection failed. Message not sent.");
        return;
      }
    }

    _socket?.emit("send_message", {
      "user_id": userId,
      "astrologer_id": astrologerId,
      "message": message,
      "sender": "user",
    });

    _logger.i("📩 Message Sent: $message");
  }

  /// ✅ Listen for incoming messages
  void listenForMessages(Function(dynamic) callback) {
    _socket?.on("receive_message", (data) {
      _logger.i("📨 New message received: $data");
      callback(data);
    });
  }

  /// 📡 Listen for call connection
  void listenForCallConnected(Function(bool) onCallConnected) {
    _socket?.on("call_connected", (data) {
      _logger.i("🔗 Call Connected: $data");
      onCallConnected(true);
    });
  }

  // /// 🚫 Remove listeners to prevent memory leaks
  // void _removeListeners() {
  //   _socket?.off("chat message");
  //   _socket?.off("receive_message");
  //   _socket?.off("call_connected");
  // }

  /// 🛑 Dispose of socket properly
  void dispose() {
   // _removeListeners();
    _socket?.disconnect();
    _socket?.dispose();
    _logger.w("🛑 Socket Service Disposed.");
  }
}