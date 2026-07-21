import 'dart:async';
import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/network_exceptions.dart';
import '../../../../core/network/socket_service.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/di/injection.dart';
import '../../../../shared/widgets/vyl_widgets.dart';
import '../../data/models/space_model.dart';

class SpaceRoomScreen extends StatefulWidget {
  final String spaceId;
  const SpaceRoomScreen({super.key, required this.spaceId});
  @override State<SpaceRoomScreen> createState() => _SpaceRoomScreenState();
}

class _SpaceRoomScreenState extends State<SpaceRoomScreen> {
  final _api = getIt<ApiClient>();
  final _socket = getIt<SocketService>();

  SpaceModel? _space;
  bool _loading = true;
  bool _joined = false;
  bool _actionBusy = false;
  String? _error;
  StreamSubscription<SpaceSocketEvent>? _sub;

  @override
  void initState() {
    super.initState();
    _load();
    _sub = _socket.onSpaceEvent.listen(_onSpaceEvent);
  }

  @override
  void dispose() {
    _sub?.cancel();
    if (_joined) _socket.leaveSpace(widget.spaceId);
    super.dispose();
  }

  void _onSpaceEvent(SpaceSocketEvent event) {
    final space = _space;
    if (space == null) return;
    if (event.type == SpaceEventType.joined) {
      setState(() => _space = _withListeners(space, space.listenersCount + 1));
    } else if (event.type == SpaceEventType.left) {
      setState(() => _space = _withListeners(space, (space.listenersCount - 1).clamp(0, 1 << 30)));
    }
  }

  SpaceModel _withListeners(SpaceModel s, int count) => SpaceModel(
    id: s.id, title: s.title, description: s.description, category: s.category,
    tags: s.tags, isVideo: s.isVideo, isTicketed: s.isTicketed, ticketPriceUsd: s.ticketPriceUsd,
    status: s.status, scheduledFor: s.scheduledFor, startedAt: s.startedAt, endedAt: s.endedAt,
    listenersCount: count, peakListeners: s.peakListeners, speakersCount: s.speakersCount,
    totalTipsUsd: s.totalTipsUsd, host: s.host, createdAt: s.createdAt,
  );

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      // No dedicated GET /spaces/:id endpoint — reuse the list and find
      // the matching entry, same data the Spaces list screen already has.
      final data = await _api.get(ApiConstants.spaces);
      final spaces = (data['spaces'] as List? ?? [])
        .map((s) => SpaceModel.fromJson(s as Map<String, dynamic>));
      final match = spaces.where((s) => s.id == widget.spaceId).cast<SpaceModel?>().firstWhere((_) => true, orElse: () => null);
      if (match == null) {
        setState(() { _loading = false; _error = 'Space not found or has ended.'; });
        return;
      }
      setState(() { _space = match; _loading = false; });
    } on NetworkException catch (e) {
      setState(() { _loading = false; _error = e.message; });
    } catch (_) {
      setState(() { _loading = false; _error = 'Failed to load this Space.'; });
    }
  }

  Future<void> _join() async {
    if (_actionBusy || _space == null) return;
    setState(() => _actionBusy = true);
    try {
      final data = await _api.post(ApiConstants.joinSpace(widget.spaceId));
      _socket.joinSpace(widget.spaceId);
      setState(() {
        _joined = true;
        _space = _withListeners(_space!, data['listenersCount'] as int? ?? _space!.listenersCount);
      });
    } on NetworkException catch (e) {
      _showSnack(e.message);
    } catch (_) {
      _showSnack('Could not join this Space.');
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  Future<void> _leave() async {
    if (_actionBusy) return;
    setState(() => _actionBusy = true);
    try {
      await _api.post(ApiConstants.leaveSpace(widget.spaceId));
      _socket.leaveSpace(widget.spaceId);
      setState(() => _joined = false);
    } catch (_) {
      _showSnack('Could not leave this Space.');
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  Future<void> _remind() async {
    try {
      await _api.post(ApiConstants.remindSpace(widget.spaceId));
      _showSnack("We'll remind you when this Space goes live.");
    } catch (_) {
      _showSnack('Could not set a reminder.');
    }
  }

  void _showSnack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: AppColors.bg4));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.bg,
    appBar: AppBar(
      backgroundColor: AppColors.bg,
      foregroundColor: AppColors.textPrimary,
      elevation: 0,
      title: Text(_space?.title ?? 'Space', style: AppTextStyles.h2, overflow: TextOverflow.ellipsis),
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
        : _buildContent(_space!),
  );

  Widget _buildContent(SpaceModel s) => SingleChildScrollView(
    padding: const EdgeInsets.all(20),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        if (s.isLive)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: AppColors.coral, borderRadius: BorderRadius.circular(999)),
            child: const Text('LIVE NOW', style: TextStyle(fontFamily: 'SpaceMono', fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white)),
          ),
        const SizedBox(width: 8),
        CategoryBadge(s.category),
      ]),
      const SizedBox(height: 16),
      Text(s.title, style: AppTextStyles.displayMd),
      if (s.description != null) ...[
        const SizedBox(height: 8),
        Text(s.description!, style: AppTextStyles.bodyMd),
      ],
      const SizedBox(height: 20),
      Row(children: [
        VylAvatar(user: s.host.toUserModel(), size: 44),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(s.host.displayName, style: AppTextStyles.labelLg),
          Text('@${s.host.handle}', style: AppTextStyles.caption),
        ])),
      ]),
      const SizedBox(height: 20),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: AppColors.bg3, borderRadius: BorderRadius.circular(14)),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
          _stat('${s.listenersCount}', 'Listening'),
          _stat('${s.peakListeners}', 'Peak'),
          _stat('${s.speakersCount}', 'Speakers'),
        ]),
      ),
      const SizedBox(height: 28),
      if (s.isLive)
        VylButton(
          label: _joined ? 'Leave Space' : 'Join Space',
          expanded: true,
          loading: _actionBusy,
          backgroundColor: _joined ? AppColors.bg4 : null,
          onPressed: _joined ? _leave : _join,
        )
      else if (s.status == 'scheduled')
        VylGhostButton(label: 'Remind me', onPressed: _remind)
      else
        Text('This Space has ended.', style: AppTextStyles.bodySm),
    ]),
  );

  Widget _stat(String value, String label) => Column(children: [
    Text(value, style: AppTextStyles.monoMetric),
    const SizedBox(height: 2),
    Text(label, style: AppTextStyles.caption),
  ]);
}
