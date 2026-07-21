import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/network_exceptions.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/di/injection.dart';
import '../../../../shared/widgets/vyl_widgets.dart';

class CreatorScreen extends StatefulWidget {
  const CreatorScreen({super.key});
  @override State<CreatorScreen> createState() => _CreatorScreenState();
}

class _CreatorScreenState extends State<CreatorScreen> {
  final _api = getIt<ApiClient>();

  // Creator earnings responses are deliberately snake_case (matches the
  // backend's original frontend contract) — parsed as raw Maps rather
  // than a dedicated model since this screen is the only consumer.
  Map<String, dynamic>? _profile;
  Map<String, dynamic>? _nextPayout;
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await _api.get(ApiConstants.myEarnings);
      setState(() {
        _profile = data['profile'] as Map<String, dynamic>?;
        _nextPayout = data['nextPayout'] as Map<String, dynamic>?;
        _loading = false;
      });
    } on NetworkException catch (e) {
      setState(() { _loading = false; _error = e.message; });
    } catch (_) {
      setState(() { _loading = false; _error = 'Failed to load earnings.'; });
    }
  }

  Future<void> _becomeCreator() async {
    setState(() => _busy = true);
    try {
      await _api.post('/creator/profile', body: const {});
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not set up your creator profile.'), backgroundColor: AppColors.coral));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _requestPayout() async {
    setState(() => _busy = true);
    try {
      await _api.post(ApiConstants.payoutRequest);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payout requested.'), backgroundColor: AppColors.vibeGreen));
      }
      await _load();
    } on NetworkException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message), backgroundColor: AppColors.coral));
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payout request failed.'), backgroundColor: AppColors.coral));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _usd(dynamic n) => '\$${(double.tryParse('$n') ?? 0).toStringAsFixed(2)}';

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.bg,
    appBar: AppBar(
      backgroundColor: AppColors.bg,
      foregroundColor: AppColors.textPrimary,
      elevation: 0,
      title: Text('Creator Earnings', style: AppTextStyles.h2),
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
        : _profile == null
          ? _buildBecomeCreator()
          : _buildEarnings(_profile!),
  );

  Widget _buildBecomeCreator() => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Text('💰', style: TextStyle(fontSize: 48)),
        const SizedBox(height: 16),
        Text('Monetize your account', style: AppTextStyles.h2),
        const SizedBox(height: 8),
        Text('Earn from Super Vibes, subscription tiers, and paid Spaces.', style: AppTextStyles.bodySm, textAlign: TextAlign.center),
        const SizedBox(height: 20),
        VylButton(label: 'Become a Creator', loading: _busy, onPressed: _becomeCreator),
      ]),
    ),
  );

  Widget _buildEarnings(Map<String, dynamic> profile) {
    final pending = profile['pending_balance_usd'];
    final totalEarned = profile['total_earned_usd'];
    final eligible = _nextPayout?['eligible'] as bool? ?? false;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          padding: const EdgeInsets.all(20),
          width: double.infinity,
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: [AppColors.violetDim, AppColors.bg3], begin: Alignment.topLeft, end: Alignment.bottomRight),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.violetBorder),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('PENDING BALANCE', style: AppTextStyles.labelXs),
            const SizedBox(height: 6),
            Text(_usd(pending), style: AppTextStyles.displayLg.copyWith(color: AppColors.vibeGreen, fontFamily: 'SpaceMono')),
            const SizedBox(height: 4),
            Text('${_usd(totalEarned)} total earned', style: AppTextStyles.caption),
          ]),
        ),
        const SizedBox(height: 20),
        VylButton(
          label: eligible ? 'Request payout' : 'Minimum payout \$10',
          expanded: true,
          loading: _busy,
          onPressed: eligible ? _requestPayout : null,
        ),
        const SizedBox(height: 28),
        const SectionHeader('SUBSCRIBERS'),
        Text('${profile['subscriber_count'] ?? 0} active subscriber(s)', style: AppTextStyles.bodyMd),
      ]),
    );
  }
}
