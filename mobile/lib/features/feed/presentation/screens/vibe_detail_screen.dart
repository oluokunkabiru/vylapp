import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/network_exceptions.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/di/injection.dart';
import '../../../../shared/widgets/vyl_widgets.dart';
import '../../data/models/vibe_model.dart';

class VibeDetailScreen extends StatefulWidget {
  final String vibeId;
  const VibeDetailScreen({super.key, required this.vibeId});
  @override State<VibeDetailScreen> createState() => _VibeDetailScreenState();
}

class _VibeDetailScreenState extends State<VibeDetailScreen> {
  final _api = getIt<ApiClient>();
  final _replyController = TextEditingController();

  VibeModel? _vibe;
  List<VibeModel> _replies = [];
  bool _loading = true;
  bool _sendingReply = false;
  String? _error;

  @override
  void initState() { super.initState(); _load(); }

  @override
  void dispose() { _replyController.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await _api.get(ApiConstants.vibeById(widget.vibeId));
      setState(() {
        _vibe = VibeModel.fromJson(data['vibe'] as Map<String, dynamic>);
        _replies = (data['replies'] as List? ?? [])
          .map((r) => VibeModel.fromJson(r as Map<String, dynamic>))
          .toList();
        _loading = false;
      });
    } on NetworkException catch (e) {
      setState(() { _loading = false; _error = e.message; });
    } catch (_) {
      setState(() { _loading = false; _error = 'Failed to load this vibe.'; });
    }
  }

  Future<void> _toggleLike() async {
    final v = _vibe;
    if (v == null) return;
    final wasLiked = v.viewer?.liked ?? false;
    setState(() {
      _vibe = v.copyWith(
        counts: v.counts.copyWith(likes: v.counts.likes + (wasLiked ? -1 : 1)),
        viewer: (v.viewer ?? const ViewerState()).copyWith(liked: !wasLiked),
      );
    });
    try {
      if (wasLiked) {
        await _api.delete(ApiConstants.likeVibe(v.id));
      } else {
        await _api.post(ApiConstants.likeVibe(v.id));
      }
    } catch (_) {
      if (mounted) setState(() => _vibe = v);
    }
  }

  Future<void> _sendReply() async {
    final content = _replyController.text.trim();
    if (content.isEmpty || _sendingReply) return;
    setState(() => _sendingReply = true);
    try {
      final data = await _api.post(ApiConstants.createVibe, body: {
        'content': content,
        'category': _vibe?.category ?? 'GENERAL',
        'replyTo': widget.vibeId,
      });
      final newReply = VibeModel.fromJson(data['vibe'] as Map<String, dynamic>);
      setState(() {
        _replies = [..._replies, newReply];
        _replyController.clear();
      });
    } on NetworkException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message), backgroundColor: AppColors.coral));
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Reply failed to send.'), backgroundColor: AppColors.coral));
      }
    } finally {
      if (mounted) setState(() => _sendingReply = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.bg,
    appBar: AppBar(
      backgroundColor: AppColors.bg,
      foregroundColor: AppColors.textPrimary,
      elevation: 0,
      title: Text('Vibe', style: AppTextStyles.h2),
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(0.5),
        child: Container(height: 0.5, color: AppColors.borderSubtle),
      ),
    ),
    body: _loading
      ? const Center(child: CircularProgressIndicator(color: AppColors.violet, strokeWidth: 2))
      : _error != null
        ? Center(child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.error_outline, color: AppColors.coral, size: 48),
              const SizedBox(height: 14),
              Text(_error!, style: AppTextStyles.bodySm, textAlign: TextAlign.center),
              const SizedBox(height: 20),
              VylButton(label: 'Retry', onPressed: _load),
            ]),
          ))
        : Column(children: [
            Expanded(child: _buildContent(_vibe!)),
            _ReplyComposer(controller: _replyController, sending: _sendingReply, onSend: _sendReply),
          ]),
  );

  Widget _buildContent(VibeModel v) {
    final liked = v.viewer?.liked ?? false;
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              VylAvatar(user: v.author, size: 44),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Text(v.author.displayName, style: AppTextStyles.labelLg),
                  if (v.author.verified) ...[const SizedBox(width: 4), const VerifiedBadge()],
                ]),
                Text('@${v.author.handle}', style: AppTextStyles.caption),
              ])),
            ]),
            const SizedBox(height: 14),
            Text(v.content, style: AppTextStyles.bodyLg),
            if (v.tags.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(spacing: 8, children: v.tags.map((t) => Text('#$t', style: AppTextStyles.bodySm.copyWith(color: AppColors.sky))).toList()),
            ],
            const SizedBox(height: 14),
            Row(children: [
              IconButton(
                onPressed: _toggleLike,
                icon: Icon(liked ? Icons.favorite : Icons.favorite_border, color: liked ? AppColors.coral : AppColors.textSecondary),
              ),
              Text('${v.counts.likes}', style: AppTextStyles.bodySm),
              const SizedBox(width: 16),
              const Icon(Icons.chat_bubble_outline, color: AppColors.textSecondary, size: 20),
              const SizedBox(width: 6),
              Text('${v.counts.replies}', style: AppTextStyles.bodySm),
            ]),
          ]),
        ),
        const Divider(color: AppColors.borderSubtle, height: 0.5, thickness: 0.5),
        SectionHeader('${_replies.length} REPLIES'),
        ..._replies.map((r) => _ReplyTile(reply: r)),
        const SizedBox(height: 80),
      ],
    );
  }
}

class _ReplyTile extends StatelessWidget {
  final VibeModel reply;
  const _ReplyTile({required this.reply});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      VylAvatar(user: reply.author, size: 34),
      const SizedBox(width: 10),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(reply.author.displayName, style: AppTextStyles.labelMd),
          const SizedBox(width: 6),
          Text('@${reply.author.handle}', style: AppTextStyles.caption),
        ]),
        const SizedBox(height: 4),
        Text(reply.content, style: AppTextStyles.bodyMd),
      ])),
    ]),
  );
}

class _ReplyComposer extends StatelessWidget {
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;
  const _ReplyComposer({required this.controller, required this.sending, required this.onSend});

  @override
  Widget build(BuildContext context) => Container(
    padding: EdgeInsets.fromLTRB(12, 10, 12, 10 + MediaQuery.of(context).padding.bottom),
    decoration: const BoxDecoration(
      color: AppColors.bg,
      border: Border(top: BorderSide(color: AppColors.borderSubtle, width: 0.5)),
    ),
    child: Row(children: [
      Expanded(child: VylTextField(placeholder: 'Reply…', controller: controller, maxLines: 3)),
      const SizedBox(width: 8),
      GestureDetector(
        onTap: sending ? null : onSend,
        child: Container(
          width: 42, height: 42,
          decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.violet),
          child: sending
            ? const Padding(padding: EdgeInsets.all(10), child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.white)))
            : const Icon(Icons.send, color: Colors.white, size: 18),
        ),
      ),
    ]),
  );
}
