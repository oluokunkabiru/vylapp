import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/di/injection.dart';
import '../../../../shared/widgets/vyl_widgets.dart';

class RavenScreen extends StatefulWidget {
  final String? param;
  const RavenScreen({super.key, this.param});
  @override State<RavenScreen> createState() => _RavenScreenState();
}

class _RavenScreenState extends State<RavenScreen> {
  final _api = getIt<ApiClient>();
  bool _loading = true;
  String? _error;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      await Future.delayed(const Duration(milliseconds: 300));
      setState(() => _loading = false);
    } catch (e) {
      setState(() { _loading = false; _error = e.toString(); });
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
        : _buildContent(),
  );

  Widget _buildContent() => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Text('✦', style: TextStyle(fontSize: 48, color: AppColors.violetLight)),
        const SizedBox(height: 16),
        Text('Raven', style: AppTextStyles.h1),
        const SizedBox(height: 8),
        Text(
          'Wire _load() to the correct endpoint, then build this screen.',
          style: AppTextStyles.bodySm,
          textAlign: TextAlign.center,
        ),
      ]),
    ),
  );
}
