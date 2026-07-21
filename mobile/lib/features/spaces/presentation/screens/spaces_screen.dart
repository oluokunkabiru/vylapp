import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/network_exceptions.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/di/injection.dart';
import '../../../../shared/widgets/vyl_widgets.dart';
import '../../data/models/space_model.dart';

class SpacesScreen extends StatefulWidget {
  const SpacesScreen({super.key});
  @override State<SpacesScreen> createState() => _SpacesScreenState();
}

class _SpacesScreenState extends State<SpacesScreen> {
  final _api = getIt<ApiClient>();
  List<SpaceModel> _spaces = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await _api.get(ApiConstants.spaces);
      final spaces = (data['spaces'] as List? ?? [])
        .map((s) => SpaceModel.fromJson(s as Map<String, dynamic>))
        .toList();
      setState(() { _spaces = spaces; _loading = false; });
    } on NetworkException catch (e) {
      setState(() { _loading = false; _error = e.message; });
    } catch (_) {
      setState(() { _loading = false; _error = 'Failed to load Spaces.'; });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.bg,
    appBar: AppBar(
      backgroundColor: AppColors.bg,
      foregroundColor: AppColors.textPrimary,
      elevation: 0,
      title: Text('Spaces', style: AppTextStyles.h2),
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(0.5),
        child: Container(height: 0.5, color: AppColors.borderSubtle),
      ),
    ),
    body: _loading
      ? const _SpacesSkeleton()
      : _error != null
        ? _ErrorState(message: _error!, onRetry: _load)
        : _spaces.isEmpty
          ? _EmptyState(onRefresh: _load)
          : RefreshIndicator(
              color: AppColors.violet,
              backgroundColor: AppColors.bg3,
              onRefresh: _load,
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: _spaces.length,
                itemBuilder: (ctx, i) => _SpaceCard(
                  space: _spaces[i],
                  onTap: () => context.push('/spaces/${_spaces[i].id}'),
                ),
              ),
            ),
  );
}

class _SpaceCard extends StatelessWidget {
  final SpaceModel space;
  final VoidCallback onTap;
  const _SpaceCard({required this.space, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final gradient = AppColors.categoryGradient(space.category);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.bg3,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.borderSubtle),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              if (space.isLive)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: gradient.colors),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Text('LIVE', style: TextStyle(fontFamily: 'SpaceMono', fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white)),
                )
              else
                Text(_scheduleLabel(space), style: AppTextStyles.labelXs),
              const Spacer(),
              CategoryBadge(space.category),
            ]),
            const SizedBox(height: 10),
            Text(space.title, style: AppTextStyles.h3, maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 10),
            Row(children: [
              VylAvatar(user: space.host.toUserModel(), size: 28),
              const SizedBox(width: 8),
              Expanded(child: Text(space.host.displayName, style: AppTextStyles.labelMd, overflow: TextOverflow.ellipsis)),
              if (space.isLive) ...[
                const Icon(Icons.headphones, size: 14, color: AppColors.textSecondary),
                const SizedBox(width: 4),
                Text('${space.listenersCount}', style: AppTextStyles.caption),
              ],
            ]),
          ],
        ),
      ),
    );
  }

  String _scheduleLabel(SpaceModel s) {
    if (s.status == 'ended') return 'Ended';
    if (s.scheduledFor == null) return 'Scheduled';
    final d = s.scheduledFor!.difference(DateTime.now());
    if (d.inMinutes < 0) return 'Starting soon';
    if (d.inHours < 1) return 'In ${d.inMinutes}m';
    if (d.inDays < 1) return 'In ${d.inHours}h';
    return 'In ${d.inDays}d';
  }
}

class _SpacesSkeleton extends StatelessWidget {
  const _SpacesSkeleton();
  @override
  Widget build(BuildContext context) => ListView.builder(
    itemCount: 4,
    itemBuilder: (_, __) => const Padding(
      padding: EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      child: VylSkeleton(width: double.infinity, height: 120, radius: 16),
    ),
  );
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onRefresh;
  const _EmptyState({required this.onRefresh});
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Text('🎙️', style: TextStyle(fontSize: 48)),
        const SizedBox(height: 16),
        Text('No Spaces right now', style: AppTextStyles.h3),
        const SizedBox(height: 8),
        Text('Live and scheduled Spaces will show up here.', style: AppTextStyles.bodySm, textAlign: TextAlign.center),
        const SizedBox(height: 20),
        VylGhostButton(label: 'Refresh', onPressed: onRefresh),
      ]),
    ),
  );
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorState({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(child: Padding(
    padding: const EdgeInsets.all(24),
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      const Icon(Icons.wifi_off, color: AppColors.textSecondary, size: 48),
      const SizedBox(height: 16),
      Text(message, style: AppTextStyles.bodySm, textAlign: TextAlign.center),
      const SizedBox(height: 20),
      VylButton(label: 'Retry', onPressed: onRetry),
    ]),
  ));
}
