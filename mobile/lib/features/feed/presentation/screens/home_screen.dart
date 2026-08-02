import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../shared/widgets/vyl_widgets.dart';
import '../bloc/feed_bloc.dart';
import '../../data/models/vibe_model.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _scrollController = ScrollController();
  String _activeLang = 'en';

  @override
  void initState() {
    super.initState();
    context.read<FeedBloc>().add(const FeedLoad());
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 300) {
      context.read<FeedBloc>().add(const FeedLoadMore());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(children: [
          _Header(lang: _activeLang, onLangChange: (l) => setState(() => _activeLang = l)),
          Expanded(
            child: BlocBuilder<FeedBloc, FeedState>(
              builder: (context, state) {
                if (state is FeedLoading) return const _FeedSkeleton();
                if (state is FeedError) return _ErrorState(message: state.message,
                  onRetry: () => context.read<FeedBloc>().add(const FeedRefresh()));
                final vibes = switch(state) {
                  FeedLoaded(:final vibes)     => vibes,
                  FeedLoadingMore(:final vibes) => vibes,
                  _ => <VibeModel>[],
                };
                final isLoadingMore = state is FeedLoadingMore;

                return RefreshIndicator(
                  color: AppColors.violet,
                  backgroundColor: AppColors.bg3,
                  onRefresh: () async => context.read<FeedBloc>().add(const FeedRefresh()),
                  child: CustomScrollView(
                    controller: _scrollController,
                    slivers: [
                      SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (ctx, i) {
                            if (i < vibes.length) {
                              return _PostCard(vibe: vibes[i], lang: _activeLang, isFirst: i == 0);
                            }
                            return isLoadingMore
                              ? const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator(color: AppColors.violet, strokeWidth: 2)))
                              : const SizedBox.shrink();
                          },
                          childCount: vibes.length + (isLoadingMore ? 1 : 0),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ]),
      ),
    );
  }
}

// ── Header ─────────────────────────────────────────────────────────────────────
class _Header extends StatelessWidget {
  final String lang;
  final ValueChanged<String> onLangChange;
  const _Header({required this.lang, required this.onLangChange});

  static const _langs = {'en':'EN','es':'ES','sw':'SW','fr':'FR','yo':'YO','ha':'HA','ar':'AR'};

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    decoration: const BoxDecoration(
      color: AppColors.bg,
      border: Border(bottom: BorderSide(color: AppColors.borderSubtle, width: 0.5)),
    ),
    child: Row(
      children: [
        ShaderMask(
          shaderCallback: (b) => AppColors.primaryLinear.createShader(b),
          child: const Text('VYLAPP', style: TextStyle(fontFamily:'Sora',fontSize:20,fontWeight:FontWeight.w900,color:Colors.white,letterSpacing:-0.5)),
        ),
        const Spacer(),
        // Language picker
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: AppColors.violetDim,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: AppColors.violetBorder, width: 1),
          ),
          child: DropdownButton<String>(
            value: lang, underline: const SizedBox(), isDense: true,
            dropdownColor: AppColors.bg2, borderRadius: BorderRadius.circular(12),
            style: AppTextStyles.labelSm.copyWith(color: AppColors.violetLight),
            icon: const Icon(Icons.keyboard_arrow_down, size:14, color: AppColors.violetLight),
            items: _langs.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
            onChanged: (v) { if(v!=null) onLangChange(v); },
          ),
        ),
        const SizedBox(width: 8),
        GestureDetector(
          onTap: () {},
          child: Stack(children: [
            const Icon(Icons.notifications_outlined, color: AppColors.textSecondary, size: 26),
            Positioned(top:0, right:0, child: Container(
              width:8, height:8,
              decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.coral,
                border: Border.all(color:AppColors.bg, width:1.5)),
            )),
          ]),
        ),
      ],
    ),
  );
}

// ── Post card ──────────────────────────────────────────────────────────────────
class _PostCard extends StatefulWidget {
  final VibeModel vibe;
  final String    lang;
  final bool      isFirst;
  const _PostCard({required this.vibe, required this.lang, this.isFirst = false});

  @override
  State<_PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<_PostCard> {
  bool _showBurst = false;

  void _onDoubleTap() {
    if (!(widget.vibe.viewer?.liked ?? false)) {
      context.read<FeedBloc>().add(FeedToggleLike(widget.vibe.id));
    }
    setState(() => _showBurst = true);
    Future.delayed(const Duration(milliseconds: 900), () {
      if (mounted) setState(() => _showBurst = false);
    });
  }

  static const _catGrads = {
    'TECH_VIBES':     [Color(0xFF38BDF8), Color(0xFF7C3AED)],
    'GLOBAL_CONNECT': [Color(0xFF10F5A0), Color(0xFF2DD4BF)],
    'CREATIVE_LEARN': [Color(0xFFFFB830), Color(0xFFFF6B6B)],
    'HUMAN_POTENTIAL':[Color(0xFFA78BFA), Color(0xFF7C3AED)],
    'SPACES_INVITE':  [Color(0xFFFF6B6B), Color(0xFFFFB830)],
  };
  static const _catEmoji = {
    'TECH_VIBES':'⚡','GLOBAL_CONNECT':'🌍','CREATIVE_LEARN':'🎨','HUMAN_POTENTIAL':'🧠','SPACES_INVITE':'🎙️',
  };

  @override
  Widget build(BuildContext context) {
    final v      = widget.vibe;
    final colors = _catGrads[v.category] ?? [AppColors.violet, AppColors.vibeGreen];
    final emoji  = _catEmoji[v.category] ?? '✦';
    final liked  = v.viewer?.liked ?? false;
    final saved  = v.viewer?.saved ?? false;
    final caption = (widget.lang != 'en' && v.translationFor(widget.lang) != null)
      ? v.translationFor(widget.lang)! : v.content;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 0),
          child: Row(children: [
            VylAvatar(user:v.author, size:36),
            const SizedBox(width:10),
            Expanded(child: Column(crossAxisAlignment:CrossAxisAlignment.start, children: [
              Row(children: [
                Text(v.author.displayName, style:AppTextStyles.labelMd),
                if (v.author.verified) ...[const SizedBox(width:4), const VerifiedBadge()],
              ]),
              Row(children: [
                CategoryBadge(v.category),
                const SizedBox(width:6),
                Text('· ${_timeAgo(v.createdAt)}', style:AppTextStyles.caption),
              ]),
            ])),
            const Icon(Icons.more_horiz, color:AppColors.textSecondary),
          ]),
        ),
        // Media
        const SizedBox(height: 10),
        GestureDetector(
          onDoubleTap: _onDoubleTap,
          child: Stack(children: [
            AspectRatio(
              aspectRatio: 4/5,
              child: Container(
                decoration: BoxDecoration(gradient: LinearGradient(colors:colors, begin:Alignment.topLeft, end:Alignment.bottomRight)),
                child: Center(child: Text(emoji, style:const TextStyle(fontSize:80))),
              ),
            ),
            if (_showBurst) Positioned.fill(child: Center(child: Icon(Icons.favorite, size:100, color:Colors.white.withOpacity(0.9)))),
            if (widget.isFirst) Positioned(bottom:14, left:14, right:14, child: Container(
              padding: const EdgeInsets.symmetric(horizontal:14, vertical:8),
              decoration: BoxDecoration(color:Colors.black54, borderRadius:BorderRadius.circular(10), border:Border.all(color:AppColors.borderSubtle)),
              child: const Text('💡 Double-tap to like', style:TextStyle(color:Colors.white, fontSize:13, fontFamily:'Sora'), textAlign:TextAlign.center),
            )),
          ]),
        ),
        // Actions
        Row(children: [
          IconButton(
            onPressed: () => context.read<FeedBloc>().add(FeedToggleLike(v.id)),
            icon: Icon(liked ? Icons.favorite : Icons.favorite_border, color: liked ? AppColors.coral : AppColors.textSecondary),
          ),
          IconButton(icon: const Icon(Icons.chat_bubble_outline, color:AppColors.textSecondary), onPressed: (){}),
          IconButton(icon: const Icon(Icons.send_outlined, color:AppColors.textSecondary), onPressed: (){}),
          const Spacer(),
          if (widget.lang != 'en') _TranslateButton(vibeId:v.id, lang:widget.lang, hasTranslation:v.translationFor(widget.lang)!=null),
          IconButton(
            onPressed: () => context.read<FeedBloc>().add(FeedToggleSave(v.id)),
            icon: Icon(saved ? Icons.bookmark : Icons.bookmark_border, color: saved ? AppColors.textPrimary : AppColors.textSecondary),
          ),
        ]),
        // Caption
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
          child: Column(crossAxisAlignment:CrossAxisAlignment.start, children: [
            Text.rich(TextSpan(children: [
              TextSpan(text:'@${v.author.handle} ', style:AppTextStyles.labelMd),
              TextSpan(text:caption, style:AppTextStyles.bodyMd),
            ])),
            if (v.tags.isNotEmpty) ...[
              const SizedBox(height:6),
              Wrap(spacing:8, children: v.tags.map((t) => Text('#$t', style:AppTextStyles.bodySm.copyWith(color:AppColors.sky))).toList()),
            ],
          ]),
        ),
        const Divider(color:AppColors.borderSubtle, height:0.5, thickness:0.5),
      ],
    );
  }

  String _timeAgo(DateTime dt) {
    final d = DateTime.now().difference(dt);
    if (d.inMinutes < 1) return 'now';
    if (d.inHours < 1)   return '${d.inMinutes}m';
    if (d.inDays < 1)    return '${d.inHours}h';
    return '${d.inDays}d';
  }
}

class _TranslateButton extends StatelessWidget {
  final String vibeId;
  final String lang;
  final bool   hasTranslation;
  const _TranslateButton({required this.vibeId, required this.lang, required this.hasTranslation});

  static const _langNames = {'es':'Spanish','sw':'Swahili','fr':'French','yo':'Yoruba','ha':'Hausa','ar':'Arabic'};

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: () => context.read<FeedBloc>().add(FeedTranslateVibe(vibeId:vibeId, targetLang:lang)),
    child: Container(
      margin: const EdgeInsets.symmetric(vertical:4),
      padding: const EdgeInsets.symmetric(horizontal:10, vertical:5),
      decoration: BoxDecoration(
        color: hasTranslation ? AppColors.violetDim : Colors.transparent,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: hasTranslation ? AppColors.violetBorder : AppColors.borderSubtle),
      ),
      child: Row(mainAxisSize:MainAxisSize.min, children: [
        const Icon(Icons.translate, size:13, color:AppColors.violetLight),
        const SizedBox(width:4),
        Text(_langNames[lang] ?? lang, style:AppTextStyles.caption.copyWith(color:AppColors.violetLight)),
      ]),
    ),
  );
}

// ── Skeleton ────────────────────────────────────────────────────────────────────
class _FeedSkeleton extends StatelessWidget {
  const _FeedSkeleton();
  @override
  Widget build(BuildContext context) => ListView.builder(
    itemCount: 3,
    itemBuilder: (_, __) => Column(children: [
      Padding(padding: const EdgeInsets.all(14), child: Row(children: [
        VylSkeleton(width:38, height:38, radius:19),
        const SizedBox(width:10),
        Column(crossAxisAlignment:CrossAxisAlignment.start, children: [
          VylSkeleton(width:120, height:14),
          const SizedBox(height:5),
          VylSkeleton(width:80, height:12),
        ]),
      ])),
      VylSkeleton(width:double.infinity, height:300, radius:0),
      const SizedBox(height:12),
    ]),
  );
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorState({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(child: Column(mainAxisAlignment:MainAxisAlignment.center, children: [
    const Icon(Icons.wifi_off, color:AppColors.textSecondary, size:48),
    const SizedBox(height:16),
    Text(message, style:AppTextStyles.bodySm, textAlign:TextAlign.center),
    const SizedBox(height:20),
    VylButton(label:'Retry', onPressed:onRetry),
  ]));
}
