import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/network_exceptions.dart';
import '../../../../core/network/socket_service.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/di/injection.dart';
import '../../../../shared/widgets/vyl_widgets.dart';
import '../../data/models/notification_model.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _api = getIt<ApiClient>();
  final _socket = getIt<SocketService>();

  List<NotificationModel> _notifications = [];
  bool _loading = true;
  String? _error;
  StreamSubscription<Map<String, dynamic>>? _sub;

  @override
  void initState() {
    super.initState();
    _load();
    _sub = _socket.onNewNotification.listen((data) {
      try {
        setState(() => _notifications = [NotificationModel.fromJson(data), ..._notifications]);
      } catch (_) {
        // Malformed live payload — the next pull-to-refresh will reconcile
      }
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await _api.get(ApiConstants.notifications);
      final list = (data['notifications'] as List? ?? [])
        .map((n) => NotificationModel.fromJson(n as Map<String, dynamic>))
        .toList();
      setState(() { _notifications = list; _loading = false; });
    } on NetworkException catch (e) {
      setState(() { _loading = false; _error = e.message; });
    } catch (_) {
      setState(() { _loading = false; _error = 'Failed to load notifications.'; });
    }
  }

  Future<void> _markAllRead() async {
    setState(() => _notifications = _notifications.map((n) => n.copyWith(isRead: true)).toList());
    try {
      await _api.post(ApiConstants.readAllNotifs);
    } catch (_) {
      // Best-effort — next load() reconciles actual server state
    }
  }

  Future<void> _onTapNotification(NotificationModel n) async {
    if (!n.isRead) {
      setState(() {
        _notifications = _notifications.map((x) => x.id == n.id ? x.copyWith(isRead: true) : x).toList();
      });
      _api.post(ApiConstants.markNotifRead(n.id)).catchError((_) => <String, dynamic>{});
    }
    if (n.vibeId != null) {
      context.push('/vibes/${n.vibeId}');
    } else if (n.conversationId != null) {
      context.push('/messages/${n.conversationId}');
    } else if (n.spaceId != null) {
      context.push('/spaces/${n.spaceId}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasUnread = _notifications.any((n) => !n.isRead);
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        title: Text('Activity', style: AppTextStyles.h2),
        actions: [
          if (hasUnread)
            TextButton(
              onPressed: _markAllRead,
              child: Text('Mark all read', style: AppTextStyles.labelSm.copyWith(color: AppColors.violetLight)),
            ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(0.5),
          child: Container(height: 0.5, color: AppColors.borderSubtle),
        ),
      ),
      body: _loading
        ? const _NotificationsSkeleton()
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
          : _notifications.isEmpty
            ? Center(child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Text('🔔', style: TextStyle(fontSize: 48)),
                  const SizedBox(height: 16),
                  Text('No notifications yet', style: AppTextStyles.h3),
                ]),
              ))
            : RefreshIndicator(
                color: AppColors.violet,
                backgroundColor: AppColors.bg3,
                onRefresh: _load,
                child: ListView.builder(
                  itemCount: _notifications.length,
                  itemBuilder: (ctx, i) {
                    final n = _notifications[i];
                    return _NotificationTile(notification: n, onTap: () => _onTapNotification(n));
                  },
                ),
              ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final NotificationModel notification;
  final VoidCallback onTap;
  const _NotificationTile({required this.notification, required this.onTap});

  static const _icons = <String, IconData>{
    'like': Icons.favorite, 'repost': Icons.repeat, 'reply': Icons.chat_bubble,
    'mention': Icons.alternate_email, 'follow': Icons.person_add, 'connection_request': Icons.person_add,
    'dm': Icons.send, 'space_invite': Icons.headphones, 'space_live': Icons.podcasts,
    'creator_tip': Icons.attach_money, 'creator_sub': Icons.star, 'badge_earned': Icons.emoji_events,
  };

  @override
  Widget build(BuildContext context) {
    final n = notification;
    return Container(
      color: n.isRead ? Colors.transparent : AppColors.violetDim,
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: n.actor != null
          ? VylAvatar(user: n.actor!.toUserModel(), size: 44)
          : CircleAvatar(radius: 22, backgroundColor: AppColors.bg3, child: Icon(_icons[n.type] ?? Icons.notifications, color: AppColors.violetLight, size: 20)),
        title: Text(n.body, style: AppTextStyles.bodyMd),
        subtitle: Text(_timeAgo(n.createdAt), style: AppTextStyles.caption),
        trailing: n.isRead ? null : Container(width: 8, height: 8, decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.violet)),
      ),
    );
  }

  String _timeAgo(DateTime dt) {
    final d = DateTime.now().difference(dt);
    if (d.inMinutes < 1) return 'now';
    if (d.inHours < 1)   return '${d.inMinutes}m ago';
    if (d.inDays < 1)    return '${d.inHours}h ago';
    return '${d.inDays}d ago';
  }
}

class _NotificationsSkeleton extends StatelessWidget {
  const _NotificationsSkeleton();
  @override
  Widget build(BuildContext context) => ListView.builder(
    itemCount: 8,
    itemBuilder: (_, __) => Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(children: [
        const VylSkeleton(width: 44, height: 44, radius: 22),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          VylSkeleton(width: MediaQuery.of(context).size.width * 0.6, height: 14),
          const SizedBox(height: 6),
          const VylSkeleton(width: 60, height: 11),
        ])),
      ]),
    ),
  );
}
