import 'package:equatable/equatable.dart';
import '../../../auth/data/models/user_model.dart';

class SpaceHost extends Equatable {
  final String  id;
  final String  handle;
  final String  displayName;
  final String? avatarColor;
  final String? avatarInitials;
  final bool    verified;

  const SpaceHost({
    required this.id,
    required this.handle,
    required this.displayName,
    this.avatarColor,
    this.avatarInitials,
    this.verified = false,
  });

  factory SpaceHost.fromJson(Map<String, dynamic> json) => SpaceHost(
    id:             json['id'] as String? ?? '',
    handle:         json['handle'] as String? ?? '',
    displayName:    json['displayName'] as String? ?? '',
    avatarColor:    json['avatarColor'] as String?,
    avatarInitials: json['avatarInitials'] as String?,
    verified:       json['verified'] as bool? ?? false,
  );

  /// Bridges to [UserModel] so [VylAvatar] can render this host without a
  /// second, parallel avatar widget.
  UserModel toUserModel() => UserModel(
    id: id, handle: handle, displayName: displayName,
    avatarColor: avatarColor, avatarInitials: avatarInitials, verified: verified,
  );

  @override List<Object?> get props => [id, handle];
}

class SpaceModel extends Equatable {
  final String    id;
  final String    title;
  final String?   description;
  final String    category;
  final List<String> tags;
  final bool      isVideo;
  final bool      isTicketed;
  final double?   ticketPriceUsd;
  final String    status; // scheduled | live | ended | cancelled
  final DateTime? scheduledFor;
  final DateTime? startedAt;
  final DateTime? endedAt;
  final int       listenersCount;
  final int       peakListeners;
  final int       speakersCount;
  final double    totalTipsUsd;
  final SpaceHost host;
  final DateTime  createdAt;

  const SpaceModel({
    required this.id,
    required this.title,
    required this.category,
    required this.host,
    required this.createdAt,
    this.description,
    this.tags = const [],
    this.isVideo = false,
    this.isTicketed = false,
    this.ticketPriceUsd,
    this.status = 'scheduled',
    this.scheduledFor,
    this.startedAt,
    this.endedAt,
    this.listenersCount = 0,
    this.peakListeners = 0,
    this.speakersCount = 0,
    this.totalTipsUsd = 0,
  });

  bool get isLive => status == 'live';

  factory SpaceModel.fromJson(Map<String, dynamic> json) => SpaceModel(
    id:             json['id'] as String,
    title:          json['title'] as String? ?? '',
    description:    json['description'] as String?,
    category:       json['category'] as String? ?? 'GENERAL',
    tags:           List<String>.from(json['tags'] as List? ?? []),
    isVideo:        json['isVideo'] as bool? ?? false,
    isTicketed:     json['isTicketed'] as bool? ?? false,
    ticketPriceUsd: (json['ticketPriceUsd'] as num?)?.toDouble(),
    status:         json['status'] as String? ?? 'scheduled',
    scheduledFor:   json['scheduledFor'] != null ? DateTime.tryParse(json['scheduledFor'] as String) : null,
    startedAt:      json['startedAt'] != null ? DateTime.tryParse(json['startedAt'] as String) : null,
    endedAt:        json['endedAt'] != null ? DateTime.tryParse(json['endedAt'] as String) : null,
    listenersCount: json['listenersCount'] as int? ?? 0,
    peakListeners:  json['peakListeners'] as int? ?? 0,
    speakersCount:  json['speakersCount'] as int? ?? 0,
    totalTipsUsd:   (json['totalTipsUsd'] as num?)?.toDouble() ?? 0,
    host:           SpaceHost.fromJson(json['host'] as Map<String, dynamic>? ?? const {}),
    createdAt:      DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
  );

  @override List<Object?> get props => [id, status, listenersCount];
}
