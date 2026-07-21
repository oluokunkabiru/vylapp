import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/network_exceptions.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/di/injection.dart';
import '../../../../shared/widgets/vyl_widgets.dart';
import '../../data/models/conversation_model.dart';

class ConversationsScreen extends StatefulWidget {
  const ConversationsScreen({super.key});
  @override State<ConversationsScreen> createState() => _ConversationsScreenState();
}

class _ConversationsScreenState extends State<ConversationsScreen> {
  final _api = getIt<ApiClient>();
  List<ConversationModel> _conversations = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await _api.get(ApiConstants.conversations);
      final list = (data['conversations'] as List? ?? [])
        .map((c) => ConversationModel.fromJson(c as Map<String, dynamic>))
        .toList();
      setState(() { _conversations = list; _loading = false; });
    } on NetworkException catch (e) {
      setState(() { _loading = false; _error = e.message; });
    } catch (_) {
      setState(() { _loading = false; _error = 'Failed to load conversations.'; });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.bg,
    appBar: AppBar(
      backgroundColor: AppColors.bg,
      foregroundColor: AppColors.textPrimary,
      elevation: 0,
      title: Text('Messages', style: AppTextStyles.h2),
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(0.5),
        child: Container(height: 0.5, color: AppColors.borderSubtle),
      ),
    ),
    body: _loading
      ? const _ConversationsSkeleton()
      : _error != null
        ? Center(child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.wifi_off, color: AppColors.textSecondary, size: 48),
              const SizedBox(height: 16),
              Text(_error!, style: AppTextStyles.bodySm, textAlign: TextAlign.center),
              const SizedBox(height: 20),
              VylButton(label: 'Retry', onPressed: _load),
            ]),
          ))
        : _conversations.isEmpty
          ? Center(child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Text('💬', style: TextStyle(fontSize: 48)),
                const SizedBox(height: 16),
                Text('No conversations yet', style: AppTextStyles.h3),
                const SizedBox(height: 8),
                Text('Messages you send and receive will show up here.', style: AppTextStyles.bodySm, textAlign: TextAlign.center),
              ]),
            ))
          : RefreshIndicator(
              color: AppColors.violet,
              backgroundColor: AppColors.bg3,
              onRefresh: _load,
              child: ListView.separated(
                itemCount: _conversations.length,
                separatorBuilder: (_, __) => const Divider(color: AppColors.borderSubtle, height: 0.5, thickness: 0.5, indent: 78),
                itemBuilder: (ctx, i) {
                  final c = _conversations[i];
                  return _ConversationTile(
                    conversation: c,
                    onTap: () => context.push('/messages/${c.id}'),
                  );
                },
              ),
            ),
  );
}

class _ConversationTile extends StatelessWidget {
  final ConversationModel conversation;
  final VoidCallback onTap;
  const _ConversationTile({required this.conversation, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = conversation;
    final hasUnread = c.unreadCount > 0;
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      leading: VylAvatar(user: c.otherUser?.toUserModel(), size: 50, showOnline: false),
      title: Text(c.displayName, style: hasUnread ? AppTextStyles.labelLg : AppTextStyles.labelMd),
      subtitle: Text(
        c.lastMessagePreview ?? 'No messages yet',
        style: AppTextStyles.bodySm.copyWith(color: hasUnread ? AppColors.textPrimary : AppColors.textSecondary),
        maxLines: 1, overflow: TextOverflow.ellipsis,
      ),
      trailing: hasUnread
        ? Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(color: AppColors.violet, borderRadius: BorderRadius.circular(999)),
            child: Text('${c.unreadCount}', style: const TextStyle(fontFamily: 'SpaceMono', fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white)),
          )
        : null,
    );
  }
}

class _ConversationsSkeleton extends StatelessWidget {
  const _ConversationsSkeleton();
  @override
  Widget build(BuildContext context) => ListView.builder(
    itemCount: 6,
    itemBuilder: (_, __) => Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(children: [
        const VylSkeleton(width: 50, height: 50, radius: 25),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const VylSkeleton(width: 120, height: 14),
          const SizedBox(height: 6),
          VylSkeleton(width: MediaQuery.of(context).size.width * 0.5, height: 12),
        ])),
      ]),
    ),
  );
}
