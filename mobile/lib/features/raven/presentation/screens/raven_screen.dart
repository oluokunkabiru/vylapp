import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/network_exceptions.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/di/injection.dart';
import '../../../../shared/widgets/vyl_widgets.dart';

class RavenScreen extends StatefulWidget {
  const RavenScreen({super.key});
  @override State<RavenScreen> createState() => _RavenScreenState();
}

class _RavenScreenState extends State<RavenScreen> {
  final _api = getIt<ApiClient>();
  Map<String, dynamic>? _tier;
  List<Map<String, dynamic>> _leaderboard = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final results = await Future.wait([
        _api.get(ApiConstants.ravenMe),
        _api.get(ApiConstants.ravenLeaderboard),
      ]);
      setState(() {
        _tier = results[0]['tier'] as Map<String, dynamic>?;
        _leaderboard = (results[1]['leaderboard'] as List? ?? []).cast<Map<String, dynamic>>();
        _loading = false;
      });
    } on NetworkException catch (e) {
      setState(() { _loading = false; _error = e.message; });
    } catch (_) {
      setState(() { _loading = false; _error = 'Failed to load Raven.'; });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.bg,
    appBar: AppBar(
      backgroundColor: AppColors.bg,
      foregroundColor: AppColors.textPrimary,
      elevation: 0,
      title: Text('Raven', style: AppTextStyles.h2),
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
        : RefreshIndicator(
            color: AppColors.violet,
            backgroundColor: AppColors.bg3,
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                if (_tier != null) _buildTierCard(_tier!),
                const SizedBox(height: 28),
                const SectionHeader('LEADERBOARD'),
                ..._leaderboard.map((e) => _LeaderboardRow(entry: e)),
              ],
            ),
          ),
  );

  Widget _buildTierCard(Map<String, dynamic> tier) {
    final points = tier['points'] as int? ?? 0;
    final toNext = tier['points_to_next'] as int?;
    final label = tier['label'] as String? ?? 'New User';
    final badge = tier['badge'] as String? ?? '🌱';

    return Container(
      padding: const EdgeInsets.all(20),
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [AppColors.violetDim, AppColors.bg3], begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.violetBorder),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(badge, style: const TextStyle(fontSize: 32)),
          const SizedBox(width: 12),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: AppTextStyles.h2),
            Text('$points points', style: AppTextStyles.caption),
          ]),
        ]),
        if (toNext != null && toNext > 0) ...[
          const SizedBox(height: 14),
          Text('$toNext points to the next tier', style: AppTextStyles.bodySm),
        ],
      ]),
    );
  }
}

class _LeaderboardRow extends StatelessWidget {
  final Map<String, dynamic> entry;
  const _LeaderboardRow({required this.entry});

  @override
  Widget build(BuildContext context) {
    final rank = entry['rank'] as int? ?? 0;
    final isTop3 = rank <= 3;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(color: AppColors.bg3, borderRadius: BorderRadius.circular(12)),
      child: Row(children: [
        SizedBox(
          width: 28,
          child: Text(
            isTop3 ? ['🥇', '🥈', '🥉'][rank - 1] : '$rank',
            style: isTop3 ? const TextStyle(fontSize: 18) : AppTextStyles.labelMd,
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(child: Text(entry['displayName'] as String? ?? '', style: AppTextStyles.labelMd, overflow: TextOverflow.ellipsis)),
        Text(entry['badge'] as String? ?? '', style: const TextStyle(fontSize: 16)),
        const SizedBox(width: 8),
        Text('${entry['points'] ?? 0}', style: AppTextStyles.monoMd),
      ]),
    );
  }
}
