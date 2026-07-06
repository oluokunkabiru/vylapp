import 'package:equatable/equatable.dart';
import '../../../auth/data/models/user_model.dart';

class VibeCounts extends Equatable {
  final int likes;
  final int reposts;
  final int replies;
  final int views;
  final int bookmarks;

  const VibeCounts({
    this.likes = 0, this.reposts = 0, this.replies = 0,
    this.views = 0, this.bookmarks = 0,
  });

  factory VibeCounts.fromJson(Map<String, dynamic> json) => VibeCounts(
    likes:     json['likes']     as int? ?? 0,
    reposts:   json['reposts']   as int? ?? 0,
    replies:   json['replies']   as int? ?? 0,
    views:     json['views']     as int? ?? 0,
    bookmarks: json['bookmarks'] as int? ?? 0,
  );

  VibeCounts copyWith({int? likes, int? reposts, int? replies}) => VibeCounts(
    likes:     likes     ?? this.likes,
    reposts:   reposts   ?? this.reposts,
    replies:   replies   ?? this.replies,
    views:     views,
    bookmarks: bookmarks,
  );

  @override List<Object?> get props => [likes, reposts, replies, views, bookmarks];
}

class ViewerState extends Equatable {
  final bool liked;
  final bool reposted;
  final bool saved;

  const ViewerState({this.liked = false, this.reposted = false, this.saved = false});

  factory ViewerState.fromJson(Map<String, dynamic> json) => ViewerState(
    liked:    json['liked']    as bool? ?? false,
    reposted: json['reposted'] as bool? ?? false,
    saved:    json['saved']    as bool? ?? false,
  );

  ViewerState copyWith({bool? liked, bool? reposted, bool? saved}) => ViewerState(
    liked:    liked    ?? this.liked,
    reposted: reposted ?? this.reposted,
    saved:    saved    ?? this.saved,
  );

  @override List<Object?> get props => [liked, reposted, saved];
}

class VibeModel extends Equatable {
  final String        id;
  final String        content;
  final String        category;
  final List<String>  tags;
  final String?       language;
  final String?       replyTo;
  final String?       repostOf;
  final String?       quoteOf;
  final bool          isPaidContent;
  final VibeCounts    counts;
  final ViewerState?  viewer;
  final UserModel     author;
  final DateTime      createdAt;
  final bool          isAutopilot;
  final String?       impactBadge;

  // ── Locally-derived translation cache (not from backend) ──────────────────
  final Map<String, String> _translations;

  const VibeModel({
    required this.id,
    required this.content,
    required this.category,
    required this.tags,
    required this.author,
    required this.createdAt,
    this.language,
    this.replyTo,
    this.repostOf,
    this.quoteOf,
    this.isPaidContent = false,
    this.counts = const VibeCounts(),
    this.viewer,
    this.isAutopilot = false,
    this.impactBadge,
    Map<String, String> translations = const {},
  }) : _translations = translations;

  factory VibeModel.fromJson(Map<String, dynamic> json) {
    final authorRaw = json['author'] as Map<String, dynamic>?;
    return VibeModel(
      id:           json['id'] as String,
      content:      json['content'] as String,
      category:     json['category'] as String? ?? 'GENERAL',
      tags:         List<String>.from(json['tags'] as List? ?? []),
      language:     json['language'] as String?,
      replyTo:      json['replyTo'] as String?,
      repostOf:     json['repostOf'] as String?,
      quoteOf:      json['quoteOf'] as String?,
      isPaidContent:json['isPaidContent'] as bool? ?? false,
      counts: json['counts'] != null
        ? VibeCounts.fromJson(json['counts'] as Map<String, dynamic>)
        : const VibeCounts(),
      viewer: json['viewer'] != null
        ? ViewerState.fromJson(json['viewer'] as Map<String, dynamic>)
        : null,
      author: authorRaw != null
        ? UserModel.fromJson(authorRaw)
        : _unknownUser,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '')
        ?? DateTime.now(),
      isAutopilot: json['isAutopilot'] as bool? ?? false,
      impactBadge: json['impactBadge'] as String?,
    );
  }

  static final _unknownUser = UserModel(
    id: '', handle: 'unknown', displayName: 'Unknown');

  VibeModel copyWith({
    VibeCounts?   counts,
    ViewerState?  viewer,
    Map<String, String>? translations,
  }) => VibeModel(
    id: id, content: content, category: category, tags: tags,
    language: language, replyTo: replyTo, repostOf: repostOf, quoteOf: quoteOf,
    isPaidContent: isPaidContent, author: author, createdAt: createdAt,
    isAutopilot: isAutopilot, impactBadge: impactBadge,
    counts:       counts       ?? this.counts,
    viewer:       viewer       ?? this.viewer,
    translations: translations ?? _translations,
  );

  String? translationFor(String langCode) => _translations[langCode];

  VibeModel withTranslation(String langCode, String translatedText) =>
    copyWith(translations: {..._translations, langCode: translatedText});

  @override
  List<Object?> get props => [id, content, counts, viewer];
}
