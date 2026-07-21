import 'package:equatable/equatable.dart';
import '../../../auth/data/models/user_model.dart';

class NotificationActor extends Equatable {
  final String  id;
  final String  handle;
  final String  displayName;
  final String? avatarColor;
  final String? avatarInitials;
  final bool    verified;

  const NotificationActor({
    required this.id,
    required this.handle,
    required this.displayName,
    this.avatarColor,
    this.avatarInitials,
    this.verified = false,
  });

  factory NotificationActor.fromJson(Map<String, dynamic> json) => NotificationActor(
    id:             json['id'] as String? ?? '',
    handle:         json['handle'] as String? ?? '',
    displayName:    json['displayName'] as String? ?? '',
    avatarColor:    json['avatarColor'] as String?,
    avatarInitials: json['avatarInitials'] as String?,
    verified:       json['verified'] as bool? ?? false,
  );

  /// Bridges to [UserModel] so [VylAvatar] can render this actor without a
  /// second, parallel avatar widget.
  UserModel toUserModel() => UserModel(
    id: id, handle: handle, displayName: displayName,
    avatarColor: avatarColor, avatarInitials: avatarInitials, verified: verified,
  );

  @override List<Object?> get props => [id];
}

class NotificationModel extends Equatable {
  final String  id;
  final String  type;
  final String  body;
  final bool    isRead;
  final DateTime createdAt;
  final NotificationActor? actor;
  final String? vibeId;
  final String? spaceId;
  final String? conversationId;

  const NotificationModel({
    required this.id,
    required this.type,
    required this.body,
    required this.createdAt,
    this.isRead = false,
    this.actor,
    this.vibeId,
    this.spaceId,
    this.conversationId,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) => NotificationModel(
    id:             json['id'] as String,
    type:           json['type'] as String? ?? 'system',
    body:           json['body'] as String? ?? '',
    isRead:         json['isRead'] as bool? ?? false,
    createdAt:      DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
    actor:          json['actor'] != null ? NotificationActor.fromJson(json['actor'] as Map<String, dynamic>) : null,
    vibeId:         json['vibeId'] as String?,
    spaceId:        json['spaceId'] as String?,
    conversationId: json['conversationId'] as String?,
  );

  NotificationModel copyWith({bool? isRead}) => NotificationModel(
    id: id, type: type, body: body, createdAt: createdAt, actor: actor,
    vibeId: vibeId, spaceId: spaceId, conversationId: conversationId,
    isRead: isRead ?? this.isRead,
  );

  @override List<Object?> get props => [id, isRead];
}
