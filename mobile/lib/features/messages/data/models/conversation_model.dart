import 'package:equatable/equatable.dart';
import '../../../auth/data/models/user_model.dart';

class ConversationOtherUser extends Equatable {
  final String  id;
  final String  handle;
  final String  displayName;
  final String? avatarColor;
  final String? avatarInitials;
  final bool    verified;

  const ConversationOtherUser({
    required this.id,
    required this.handle,
    required this.displayName,
    this.avatarColor,
    this.avatarInitials,
    this.verified = false,
  });

  factory ConversationOtherUser.fromJson(Map<String, dynamic> json) => ConversationOtherUser(
    id:             json['id'] as String? ?? '',
    handle:         json['handle'] as String? ?? '',
    displayName:    json['displayName'] as String? ?? '',
    avatarColor:    json['avatarColor'] as String?,
    avatarInitials: json['avatarInitials'] as String?,
    verified:       json['verified'] as bool? ?? false,
  );

  /// Bridges to [UserModel] so [VylAvatar] (which takes a UserModel) can
  /// render this without a second, parallel avatar widget.
  UserModel toUserModel() => UserModel(
    id: id, handle: handle, displayName: displayName,
    avatarColor: avatarColor, avatarInitials: avatarInitials, verified: verified,
  );

  @override List<Object?> get props => [id];
}

class ConversationModel extends Equatable {
  final String  id;
  final String  type; // dm | group | space_chat | broadcast
  final String? name;
  final String? avatarUrl;
  final String? color;
  final String? lastMessagePreview;
  final DateTime? lastMessageAt;
  final int     unreadCount;
  final ConversationOtherUser? otherUser;

  const ConversationModel({
    required this.id,
    required this.type,
    this.name,
    this.avatarUrl,
    this.color,
    this.lastMessagePreview,
    this.lastMessageAt,
    this.unreadCount = 0,
    this.otherUser,
  });

  String get displayName => otherUser?.displayName ?? name ?? 'Conversation';

  factory ConversationModel.fromJson(Map<String, dynamic> json) => ConversationModel(
    id:                 json['id'] as String,
    type:               json['type'] as String? ?? 'dm',
    name:               json['name'] as String?,
    avatarUrl:          json['avatarUrl'] as String?,
    color:              json['color'] as String?,
    lastMessagePreview: json['lastMessagePreview'] as String?,
    lastMessageAt:      json['lastMessageAt'] != null ? DateTime.tryParse(json['lastMessageAt'] as String) : null,
    unreadCount:        json['unreadCount'] as int? ?? 0,
    otherUser:          json['otherUser'] != null ? ConversationOtherUser.fromJson(json['otherUser'] as Map<String, dynamic>) : null,
  );

  @override List<Object?> get props => [id, unreadCount, lastMessageAt];
}

class MessageSender extends Equatable {
  final String  id;
  final String  handle;
  final String  displayName;
  final String? avatarColor;
  final String? avatarInitials;

  const MessageSender({
    required this.id,
    required this.handle,
    required this.displayName,
    this.avatarColor,
    this.avatarInitials,
  });

  factory MessageSender.fromJson(Map<String, dynamic> json) => MessageSender(
    id:             json['id'] as String? ?? '',
    handle:         json['handle'] as String? ?? '',
    displayName:    json['displayName'] as String? ?? '',
    avatarColor:    json['avatarColor'] as String?,
    avatarInitials: json['avatarInitials'] as String?,
  );

  @override List<Object?> get props => [id];
}

class MessageModel extends Equatable {
  final String        id;
  final String        content;
  final String        contentType;
  final String?        replyToId;
  final MessageSender? sender;
  final DateTime       createdAt;

  const MessageModel({
    required this.id,
    required this.content,
    required this.createdAt,
    this.contentType = 'text',
    this.replyToId,
    this.sender,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) => MessageModel(
    id:          json['id'] as String,
    content:     json['content'] as String? ?? '',
    contentType: json['contentType'] as String? ?? 'text',
    replyToId:   json['replyToId'] as String?,
    sender:      json['sender'] != null ? MessageSender.fromJson(json['sender'] as Map<String, dynamic>) : null,
    createdAt:   DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
  );

  @override List<Object?> get props => [id];
}
