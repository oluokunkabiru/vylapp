import 'dart:async';
import 'package:injectable/injectable.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../constants/api_constants.dart';
import '../security/token_service.dart';

/// Manages the singleton Socket.IO connection.
///
/// The socket authenticates using the same JWT issued by /auth/login —
/// no separate WebSocket session needed. The server verifies the token
/// via the same HMAC-SHA256 logic as the REST layer.
///
/// Event namespaces mirror the backend sockets/index.js definitions:
///   conversation:join/leave/typing  →  messaging
///   message:new                     →  new DM or group message
///   space:join/leave/hand_raise     →  Spaces presence
///   space:participant_joined/left   →  Spaces listener count
///   notification:new                →  live notification badge update
@lazySingleton
class SocketService {
  SocketService(this._tokenService);

  final TokenService _tokenService;
  io.Socket? _socket;

  // ── Stream controllers ─────────────────────────────────────────────────────
  final _newMessage      = StreamController<Map<String, dynamic>>.broadcast();
  final _newNotification = StreamController<Map<String, dynamic>>.broadcast();
  final _spaceEvent      = StreamController<SpaceSocketEvent>.broadcast();
  final _typingEvent     = StreamController<TypingEvent>.broadcast();

  Stream<Map<String, dynamic>> get onNewMessage      => _newMessage.stream;
  Stream<Map<String, dynamic>> get onNewNotification => _newNotification.stream;
  Stream<SpaceSocketEvent>     get onSpaceEvent      => _spaceEvent.stream;
  Stream<TypingEvent>          get onTypingEvent     => _typingEvent.stream;

  bool get isConnected => _socket?.connected ?? false;

  // ── Connect ────────────────────────────────────────────────────────────────
  Future<void> connect() async {
    if (_socket?.connected == true) return;

    final token = await _tokenService.getAccessToken();
    if (token == null) return; // Not authenticated — do not connect

    _socket = io.io(
      ApiConstants.socketUrl,
      io.OptionBuilder()
        .setTransports(['websocket'])
        .enableAutoConnect()
        .enableReconnection()
        .setReconnectionAttempts(5)
        .setReconnectionDelay(1500)
        .setAuth({'token': token})
        .build(),
    );

    _socket!
      ..on('connect', (_) => _onConnected())
      ..on('connect_error', (err) => _onError(err))
      ..on('disconnect', (_) => _onDisconnected())
      ..on('message:new', (data) => _newMessage.add(_toMap(data)))
      ..on('notification:new', (data) => _newNotification.add(_toMap(data)))
      ..on('conversation:typing', (data) => _typingEvent.add(
        TypingEvent(conversationId: _toMap(data)['conversationId'] as String? ?? '',
                    userId: _toMap(data)['userId'] as String? ?? '')))
      ..on('space:participant_joined', (data) => _spaceEvent.add(
        SpaceSocketEvent(type: SpaceEventType.joined, data: _toMap(data))))
      ..on('space:participant_left', (data) => _spaceEvent.add(
        SpaceSocketEvent(type: SpaceEventType.left, data: _toMap(data))))
      ..on('space:hand_raised', (data) => _spaceEvent.add(
        SpaceSocketEvent(type: SpaceEventType.handRaised, data: _toMap(data))));

    _socket!.connect();
  }

  // ── Disconnect ─────────────────────────────────────────────────────────────
  Future<void> disconnect() async {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  // ── Conversation rooms ─────────────────────────────────────────────────────
  void joinConversation(String conversationId) {
    _socket?.emit('conversation:join', conversationId);
  }

  void leaveConversation(String conversationId) {
    _socket?.emit('conversation:leave', conversationId);
  }

  void sendTyping(String conversationId) {
    _socket?.emit('conversation:typing', {'conversationId': conversationId});
  }

  // ── Space rooms ────────────────────────────────────────────────────────────
  void joinSpace(String spaceId) {
    _socket?.emit('space:join', {'spaceId': spaceId});
  }

  void leaveSpace(String spaceId) {
    _socket?.emit('space:leave', {'spaceId': spaceId});
  }

  void raiseHand(String spaceId) {
    _socket?.emit('space:hand_raise', {'spaceId': spaceId});
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  void _onConnected() {
    // Connection established — no logging of token values
  }

  void _onError(dynamic err) {
    // Non-fatal — the reconnection policy will retry
  }

  void _onDisconnected() {
    // Will reconnect automatically per the OptionBuilder config
  }

  Map<String, dynamic> _toMap(dynamic data) {
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    return {};
  }

  Future<void> dispose() async {
    await disconnect();
    await _newMessage.close();
    await _newNotification.close();
    await _spaceEvent.close();
    await _typingEvent.close();
  }
}

class SpaceSocketEvent {
  final SpaceEventType type;
  final Map<String, dynamic> data;
  const SpaceSocketEvent({required this.type, required this.data});
}

enum SpaceEventType { joined, left, handRaised }

class TypingEvent {
  final String conversationId;
  final String userId;
  const TypingEvent({required this.conversationId, required this.userId});
}
