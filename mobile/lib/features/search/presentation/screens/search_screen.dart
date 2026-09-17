import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/network_exceptions.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/di/injection.dart';
import '../../data/models/search_models.dart';

// Deliberately a plain StatefulWidget with getIt<ApiClient>(), matching how
// every other simple feature screen in this app is built (Notifications,
// Spaces, Messages) — only Auth and Feed use a real Bloc, because they're
// the two pieces of state other parts of the app need to react to.
// Introducing a third Bloc just for Search would be a new, inconsistent
// pattern for no real benefit here.
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});
  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _api = getIt<ApiClient>();
  final _controller = TextEditingController();
  Timer? _debounce;

  List<TrendingTopic> _trending = [];
  List<SearchUserResult> _users = [];
  List<SearchHashtagResult> _hashtags = [];
  List<SearchVibeResult> _vibes = [];

  bool _searching = false;
  bool _loading = false;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _loadTrending();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _loadTrending() async {
    try {
      final data = await _api.get(ApiConstants.trendingTopics, requiresAuth: false);
      final trending = (data['trending'] as List? ?? [])
        .map((t) => TrendingTopic.fromJson(t as Map<String, dynamic>))
        .toList();
      if (mounted) setState(() => _trending = trending);
    } catch (_) {
      // Trending is a nice-to-have on the idle screen — a failure here
      // should never block the search bar itself from working.
    }
  }

  void _onChanged(String value) {
    setState(() {}); // refresh the clear-button visibility
    _debounce?.cancel();
    if (value.trim().isEmpty) {
      setState(() { _searching = false; _users = []; _hashtags = []; _vibes = []; _error = null; });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 320), () => _search(value.trim()));
  }

  Future<void> _search(String q) async {
    setState(() { _loading = true; _error = null; _query = q; });
    try {
      final data = await _api.get(
        ApiConstants.search,
        queryParameters: {'q': q},
        requiresAuth: false,
      );
      final results = data['results'] as Map<String, dynamic>? ?? {};
      if (!mounted) return;
      setState(() {
        _searching = true;
        _loading = false;
        _users = (results['users'] as List? ?? [])
          .map((u) => SearchUserResult.fromJson(u as Map<String, dynamic>)).toList();
        _hashtags = (results['hashtags'] as List? ?? [])
          .map((h) => SearchHashtagResult.fromJson(h as Map<String, dynamic>)).toList();
        _vibes = (results['vibes'] as List? ?? [])
          .map((v) => SearchVibeResult.fromJson(v as Map<String, dynamic>)).toList();
      });
    } on NetworkException catch (e) {
      if (mounted) setState(() { _loading = false; _error = e.message; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; _error = 'Search failed. Try again.'; });
    }
  }

  void _clear() {
    _debounce?.cancel();
    _controller.clear();
    setState(() { _searching = false; _users = []; _hashtags = []; _vibes = []; _error = null; });
  }

  bool get _isEmpty => _users.isEmpty && _hashtags.isEmpty && _vibes.isEmpty;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(children: [
                IconButton(
                  onPressed: () => context.pop(),
                  icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
                ),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: AppColors.bg3,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.borderSubtle, width: 1),
                    ),
                    child: Row(children: [
                      const Icon(Icons.search, color: AppColors.textSecondary, size: 18),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: _controller,
                          autofocus: true,
                          onChanged: _onChanged,
                          style: AppTextStyles.bodyMd,
                          decoration: InputDecoration(
                            hintText: 'Search people, vibes, topics',
                            hintStyle: AppTextStyles.bodyMd.copyWith(color: AppColors.textTertiary),
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                      if (_controller.text.isNotEmpty)
                        GestureDetector(
                          onTap: _clear,
                          child: const Icon(Icons.close, color: AppColors.textSecondary, size: 18),
                        ),
                    ]),
                  ),
                ),
              ]),
            ),
            Expanded(child: _body()),
          ],
        ),
      ),
    );
  }

  Widget _body() {
    if (!_searching && !_loading) {
      return _IdleView(trending: _trending, onTapTag: (tag) {
        _controller.text = tag;
        _onChanged(tag);
      });
    }
    if (_loading) return const Center(child: CircularProgressIndicator(color: AppColors.violet));
    if (_error != null) return _ErrorView(message: _error!, onRetry: () => _search(_query));
    if (_isEmpty) return _EmptyResults(query: _query);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        if (_users.isNotEmpty) ..._section('PEOPLE', _users.map((u) => _UserRow(user: u))),
        if (_hashtags.isNotEmpty) ..._section('TOPICS', _hashtags.map((h) => _HashtagRow(hashtag: h))),
        if (_vibes.isNotEmpty) ..._section('VIBES', _vibes.map((v) => _VibeRow(vibe: v))),
      ],
    );
  }

  List<Widget> _section(String title, Iterable<Widget> rows) => [
    Text(title, style: AppTextStyles.labelSm.copyWith(color: AppColors.textSecondary, letterSpacing: 0.4)),
    const SizedBox(height: 10),
    ...rows,
    const SizedBox(height: 20),
  ];
}

class _IdleView extends StatelessWidget {
  final List<TrendingTopic> trending;
  final ValueChanged<String> onTapTag;
  const _IdleView({required this.trending, required this.onTapTag});

  @override
  Widget build(BuildContext context) {
    if (trending.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('TRENDING NOW', style: AppTextStyles.labelSm.copyWith(
          color: AppColors.textSecondary, letterSpacing: 0.4)),
        const SizedBox(height: 10),
        Wrap(spacing: 8, runSpacing: 8, children: trending.take(8).map((t) => GestureDetector(
          onTap: () => onTapTag(t.tag),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
            decoration: BoxDecoration(
              color: AppColors.bg3,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: Text.rich(TextSpan(children: [
              TextSpan(text: t.tag, style: AppTextStyles.labelMd.copyWith(color: AppColors.sky)),
              TextSpan(text: '  ${t.heat}', style: AppTextStyles.labelMd.copyWith(color: AppColors.textTertiary)),
            ])),
          ),
        )).toList()),
      ]),
    );
  }
}

class _EmptyResults extends StatelessWidget {
  final String query;
  const _EmptyResults({required this.query});

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Text('🔍', style: TextStyle(fontSize: 40)),
        const SizedBox(height: 12),
        Text('No results', style: AppTextStyles.h3),
        const SizedBox(height: 6),
        Text('Nothing found for "$query" — try different words.',
          textAlign: TextAlign.center, style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary)),
      ]),
    ),
  );
}

class _UserRow extends StatelessWidget {
  final SearchUserResult user;
  const _UserRow({required this.user});

  @override
  Widget build(BuildContext context) {
    final color = _parseColor(user.avatarColor) ?? AppColors.violet;
    final initials = user.avatarInitials ?? (user.displayName ?? user.handle).substring(0, 2).toUpperCase();
    return GestureDetector(
      onTap: () => context.push('/profile/${user.handle}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.bg3,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.borderSubtle),
        ),
        child: Row(children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color.withOpacity(0.12),
              border: Border.all(color: color.withOpacity(0.25), width: 1.5),
            ),
            alignment: Alignment.center,
            child: Text(initials, style: AppTextStyles.labelMd.copyWith(color: color, fontWeight: FontWeight.w800)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(user.displayName ?? user.handle, style: AppTextStyles.labelLg),
              Text('@${user.handle}', style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary)),
            ]),
          ),
          if (user.verified) const Icon(Icons.verified, color: AppColors.sky, size: 16),
        ]),
      ),
    );
  }
}

class _HashtagRow extends StatelessWidget {
  final SearchHashtagResult hashtag;
  const _HashtagRow({required this.hashtag});

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 8),
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    decoration: BoxDecoration(
      color: AppColors.bg3,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppColors.borderSubtle),
    ),
    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text('#${hashtag.tag}', style: AppTextStyles.labelMd.copyWith(color: AppColors.sky, fontWeight: FontWeight.w700)),
      Text('${hashtag.vibesCount} vibes', style: AppTextStyles.bodySm.copyWith(color: AppColors.textTertiary)),
    ]),
  );
}

class _VibeRow extends StatelessWidget {
  final SearchVibeResult vibe;
  const _VibeRow({required this.vibe});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: () => context.push('/vibes/${vibe.id}'),
    child: Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.bg3,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(vibe.content, maxLines: 2, overflow: TextOverflow.ellipsis, style: AppTextStyles.bodyMd),
        const SizedBox(height: 4),
        Text('@${vibe.handle} · ${vibe.likesCount} likes', style: AppTextStyles.bodySm.copyWith(color: AppColors.textTertiary)),
      ]),
    ),
  );
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text(message, textAlign: TextAlign.center, style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary)),
        const SizedBox(height: 16),
        TextButton(onPressed: onRetry, child: const Text('Retry')),
      ]),
    ),
  );
}

Color? _parseColor(String? hex) {
  if (hex == null || hex.isEmpty) return null;
  final cleaned = hex.replaceFirst('#', '');
  final value = int.tryParse(cleaned, radix: 16);
  if (value == null) return null;
  return Color(cleaned.length == 6 ? 0xFF000000 | value : value);
}
