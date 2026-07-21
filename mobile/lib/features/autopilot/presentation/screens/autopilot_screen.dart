import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/network_exceptions.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/di/injection.dart';
import '../../../../shared/widgets/vyl_widgets.dart';

class AutopilotScreen extends StatefulWidget {
  const AutopilotScreen({super.key});
  @override State<AutopilotScreen> createState() => _AutopilotScreenState();
}

class _AutopilotScreenState extends State<AutopilotScreen> {
  final _api = getIt<ApiClient>();

  // Autopilot's config/run responses are deliberately snake_case (the
  // backend preserves this to match its original frontend contract) —
  // parsed as a raw Map rather than a dedicated model, since this screen
  // is the only consumer.
  Map<String, dynamic>? _config;
  List<Map<String, dynamic>> _lastRunPosts = [];
  bool _loading = true;
  bool _running = false;
  bool _togglingEnabled = false;
  String? _error;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await _api.get(ApiConstants.autopilotConfig);
      setState(() {
        _config = data['config'] as Map<String, dynamic>?;
        _loading = false;
      });
    } on NetworkException catch (e) {
      setState(() { _loading = false; _error = e.message; });
    } catch (_) {
      setState(() { _loading = false; _error = 'Failed to load Autopilot settings.'; });
    }
  }

  Future<void> _toggleEnabled(bool value) async {
    if (_togglingEnabled) return;
    setState(() => _togglingEnabled = true);
    try {
      final data = await _api.put(ApiConstants.autopilotConfig, body: {
        'enabled': value,
        'autoPost': _config?['auto_post'] ?? true,
        'autoEngage': _config?['auto_engage'] ?? true,
        'autoReply': _config?['auto_reply'] ?? true,
      });
      setState(() => _config = data['config'] as Map<String, dynamic>?);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not update Autopilot.'), backgroundColor: AppColors.coral));
      }
    } finally {
      if (mounted) setState(() => _togglingEnabled = false);
    }
  }

  Future<void> _runNow() async {
    if (_running) return;
    setState(() { _running = true; _lastRunPosts = []; });
    try {
      final data = await _api.post(ApiConstants.autopilotRun, body: {'count': 3});
      final posted = (data['posted'] as List? ?? []).cast<Map<String, dynamic>>();
      setState(() => _lastRunPosts = posted);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Posted ${posted.length} new vibe(s).'), backgroundColor: AppColors.vibeGreen));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Autopilot run failed.'), backgroundColor: AppColors.coral));
      }
    } finally {
      if (mounted) setState(() => _running = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.bg,
    appBar: AppBar(
      backgroundColor: AppColors.bg,
      foregroundColor: AppColors.textPrimary,
      elevation: 0,
      title: Text('Autopilot', style: AppTextStyles.h2),
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
        : _buildContent(),
  );

  Widget _buildContent() {
    final enabled = _config?['enabled'] as bool? ?? false;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: AppColors.bg3,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderSubtle),
          ),
          child: Row(children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(color: AppColors.violetDim, borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.bolt, color: AppColors.violetLight),
            ),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(enabled ? 'Autopilot is on' : 'Autopilot is off', style: AppTextStyles.labelLg),
              Text(enabled ? 'Posting automatically on your behalf' : 'Manual operation only', style: AppTextStyles.caption),
            ])),
            Switch(
              value: enabled,
              onChanged: _togglingEnabled ? null : _toggleEnabled,
              activeColor: AppColors.violet,
            ),
          ]),
        ),
        const SizedBox(height: 24),
        VylButton(label: 'Run Autopilot now', expanded: true, loading: _running, onPressed: _runNow),
        const SizedBox(height: 28),
        if (_lastRunPosts.isNotEmpty) ...[
          const SectionHeader('JUST POSTED'),
          ..._lastRunPosts.map((p) => Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.bg3, borderRadius: BorderRadius.circular(12)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                CategoryBadge(p['category'] as String? ?? 'GENERAL'),
                const Spacer(),
                Text('~${p['est_likes'] ?? 0} likes', style: AppTextStyles.caption),
              ]),
              const SizedBox(height: 8),
              Text(p['content'] as String? ?? '', style: AppTextStyles.bodySm.copyWith(color: AppColors.textPrimary)),
            ]),
          )),
        ],
      ]),
    );
  }
}
