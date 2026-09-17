/// Response shapes for GET /search and GET /search/trending/topics.
///
/// Deliberately NOT reusing UserModel here — the search endpoint's raw SQL
/// returns snake_case columns (display_name, avatar_color, ...) while
/// UserModel.fromJson expects the camelCase shape /auth/me and friends
/// return. Force-fitting one into the other silently drops every field on a
/// case mismatch (the exact bug class found twice already this session on
/// the web side) rather than throwing, so a dedicated shape here is safer
/// than it looks like unnecessary duplication.
class SearchUserResult {
  final String id;
  final String handle;
  final String? displayName;
  final String? avatarColor;
  final String? avatarInitials;
  final bool verified;

  const SearchUserResult({
    required this.id,
    required this.handle,
    this.displayName,
    this.avatarColor,
    this.avatarInitials,
    this.verified = false,
  });

  factory SearchUserResult.fromJson(Map<String, dynamic> json) => SearchUserResult(
    id: json['id'] as String,
    handle: json['handle'] as String,
    displayName: json['display_name'] as String?,
    avatarColor: json['avatar_color'] as String?,
    avatarInitials: json['avatar_initials'] as String?,
    verified: json['verified'] as bool? ?? false,
  );
}

class SearchHashtagResult {
  final String tag;
  final int vibesCount;

  const SearchHashtagResult({required this.tag, required this.vibesCount});

  factory SearchHashtagResult.fromJson(Map<String, dynamic> json) => SearchHashtagResult(
    tag: json['tag'] as String,
    vibesCount: json['vibes_count'] as int? ?? 0,
  );
}

class SearchVibeResult {
  final String id;
  final String content;
  final String handle;
  final int likesCount;

  const SearchVibeResult({
    required this.id,
    required this.content,
    required this.handle,
    this.likesCount = 0,
  });

  factory SearchVibeResult.fromJson(Map<String, dynamic> json) => SearchVibeResult(
    id: json['id'] as String,
    content: json['content'] as String? ?? '',
    handle: json['handle'] as String? ?? '',
    likesCount: json['likes_count'] as int? ?? 0,
  );
}

class TrendingTopic {
  final String tag;
  final int heat;

  const TrendingTopic({required this.tag, required this.heat});

  factory TrendingTopic.fromJson(Map<String, dynamic> json) => TrendingTopic(
    tag: json['tag'] as String,
    heat: json['heat'] as int? ?? 0,
  );
}
