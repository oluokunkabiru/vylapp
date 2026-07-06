import 'package:equatable/equatable.dart';

class UserModel extends Equatable {
  final String   id;
  final String   handle;
  final String   displayName;
  final String?  bio;
  final String?  location;
  final String?  website;
  final String?  avatarUrl;
  final String?  avatarColor;
  final String?  avatarInitials;
  final String?  bannerUrl;
  final String?  roleTag;
  final bool     verified;
  final String?  verificationTier;
  final bool     isCreator;
  final String   onboardingStep;
  final bool     onboardingDone;
  final List<String> interests;
  final String   subscriptionPlan;
  final int      vibesCount;
  final int      connectionsCount;
  final int      followingCount;
  final bool?    viewerFollows;

  const UserModel({
    required this.id,
    required this.handle,
    required this.displayName,
    this.bio,
    this.location,
    this.website,
    this.avatarUrl,
    this.avatarColor,
    this.avatarInitials,
    this.bannerUrl,
    this.roleTag,
    this.verified = false,
    this.verificationTier,
    this.isCreator = false,
    this.onboardingStep = 'welcome',
    this.onboardingDone = false,
    this.interests = const [],
    this.subscriptionPlan = 'free',
    this.vibesCount = 0,
    this.connectionsCount = 0,
    this.followingCount = 0,
    this.viewerFollows,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
    id:              json['id'] as String,
    handle:          json['handle'] as String,
    displayName:     json['displayName'] as String,
    bio:             json['bio'] as String?,
    location:        json['location'] as String?,
    website:         json['website'] as String?,
    avatarUrl:       json['avatarUrl'] as String?,
    avatarColor:     json['avatarColor'] as String?,
    avatarInitials:  json['avatarInitials'] as String?,
    bannerUrl:       json['bannerUrl'] as String?,
    roleTag:         json['roleTag'] as String?,
    verified:        json['verified'] as bool? ?? false,
    verificationTier:json['verificationTier'] as String?,
    isCreator:       json['isCreator'] as bool? ?? false,
    onboardingStep:  json['onboardingStep'] as String? ?? 'welcome',
    onboardingDone:  json['onboardingDone'] as bool? ?? false,
    interests:       List<String>.from(json['interests'] as List? ?? []),
    subscriptionPlan:json['subscriptionPlan'] as String? ?? 'free',
    vibesCount:      json['vibesCount'] as int? ?? 0,
    connectionsCount:json['connectionsCount'] as int? ?? 0,
    followingCount:  json['followingCount'] as int? ?? 0,
    viewerFollows:   json['viewerFollows'] as bool?,
  );

  Map<String, dynamic> toJson() => {
    'id':              id,
    'handle':          handle,
    'displayName':     displayName,
    'bio':             bio,
    'location':        location,
    'website':         website,
    'avatarUrl':       avatarUrl,
    'avatarColor':     avatarColor,
    'avatarInitials':  avatarInitials,
    'bannerUrl':       bannerUrl,
    'roleTag':         roleTag,
    'verified':        verified,
    'verificationTier':verificationTier,
    'isCreator':       isCreator,
    'onboardingStep':  onboardingStep,
    'onboardingDone':  onboardingDone,
    'interests':       interests,
    'subscriptionPlan':subscriptionPlan,
    'vibesCount':      vibesCount,
    'connectionsCount':connectionsCount,
    'followingCount':  followingCount,
  };

  UserModel copyWith({
    String?       bio,
    String?       location,
    String?       website,
    String?       avatarUrl,
    String?       avatarColor,
    String?       bannerUrl,
    String?       roleTag,
    bool?         isCreator,
    String?       onboardingStep,
    bool?         onboardingDone,
    List<String>? interests,
    String?       subscriptionPlan,
    int?          vibesCount,
    int?          connectionsCount,
    int?          followingCount,
  }) => UserModel(
    id:              id,
    handle:          handle,
    displayName:     displayName,
    bio:             bio ?? this.bio,
    location:        location ?? this.location,
    website:         website ?? this.website,
    avatarUrl:       avatarUrl ?? this.avatarUrl,
    avatarColor:     avatarColor ?? this.avatarColor,
    avatarInitials:  avatarInitials,
    bannerUrl:       bannerUrl ?? this.bannerUrl,
    roleTag:         roleTag ?? this.roleTag,
    verified:        verified,
    verificationTier:verificationTier,
    isCreator:       isCreator ?? this.isCreator,
    onboardingStep:  onboardingStep ?? this.onboardingStep,
    onboardingDone:  onboardingDone ?? this.onboardingDone,
    interests:       interests ?? this.interests,
    subscriptionPlan:subscriptionPlan ?? this.subscriptionPlan,
    vibesCount:      vibesCount ?? this.vibesCount,
    connectionsCount:connectionsCount ?? this.connectionsCount,
    followingCount:  followingCount ?? this.followingCount,
  );

  bool get isPro   => subscriptionPlan != 'free';
  bool get needsOnboarding => !onboardingDone;

  @override
  List<Object?> get props => [id, handle, displayName, verified, subscriptionPlan];
}
