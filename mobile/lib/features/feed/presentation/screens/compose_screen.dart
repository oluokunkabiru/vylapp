import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/input_sanitiser.dart';
import '../bloc/feed_bloc.dart';

const _categories = [
  ('TECH_VIBES', 'Tech Vibes'),
  ('GLOBAL_CONNECT', 'Global Connect'),
  ('CREATIVE_LEARN', 'Creative Learn'),
  ('HUMAN_POTENTIAL', 'Human Potential'),
  ('SPACES_INVITE', 'Spaces Invite'),
];

// The one remaining screen this button ever pointed at ("Share a Vibe" in
// the bottom-nav create sheet had a `/* navigate to compose */` comment and
// nothing else — a completely dead tap). FeedBloc already had real
// FeedCreateVibe logic with nobody calling it; this is the missing UI.
class ComposeScreen extends StatefulWidget {
  const ComposeScreen({super.key});
  @override
  State<ComposeScreen> createState() => _ComposeScreenState();
}

class _ComposeScreenState extends State<ComposeScreen> {
  final _sanitiser = getIt<InputSanitiser>();
  final _controller = TextEditingController();
  String _category = _categories.first.$1;
  String? _error;
  bool _posting = false;
  StreamSubscription<CreateVibeResult>? _sub;

  @override
  void initState() {
    super.initState();
    _sub = context.read<FeedBloc>().createResults.listen(_onResult);
  }

  @override
  void dispose() {
    _sub?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onResult(CreateVibeResult result) {
    if (!mounted || !_posting) return;
    setState(() => _posting = false);
    if (result.success) {
      context.pop();
    } else {
      setState(() => _error = result.error ?? 'Failed to post. Try again.');
    }
  }

  void _submit() {
    final validation = _sanitiser.validateVibe(_controller.text);
    if (!validation.isValid) {
      setState(() => _error = validation.message);
      return;
    }
    setState(() { _posting = true; _error = null; });
    context.read<FeedBloc>().add(FeedCreateVibe(content: _controller.text, category: _category));
  }

  @override
  Widget build(BuildContext context) {
    final length = _controller.text.trim().length;
    final overLimit = length > ApiConstants.maxVibeLength;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        leading: IconButton(icon: const Icon(Icons.close), onPressed: () => context.pop()),
        title: Text('New vibe', style: AppTextStyles.h2),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(child: _posting
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.violet))
              : TextButton(
                  onPressed: (_controller.text.trim().isEmpty || overLimit) ? null : _submit,
                  child: Text('Share', style: AppTextStyles.labelLg.copyWith(
                    color: (_controller.text.trim().isEmpty || overLimit) ? AppColors.textTertiary : AppColors.violetLight,
                  )),
                )),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(0.5),
          child: Container(height: 0.5, color: AppColors.borderSubtle),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: TextField(
              controller: _controller,
              autofocus: true,
              maxLines: null,
              expands: true,
              textAlignVertical: TextAlignVertical.top,
              onChanged: (_) => setState(() {}),
              style: AppTextStyles.bodyLg,
              decoration: InputDecoration(
                hintText: "What's happening?",
                hintStyle: AppTextStyles.bodyLg.copyWith(color: AppColors.textTertiary),
                border: InputBorder.none,
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Row(children: [
              const Icon(Icons.error_outline, color: AppColors.coral, size: 16),
              const SizedBox(width: 6),
              Expanded(child: Text(_error!, style: AppTextStyles.bodySm.copyWith(color: AppColors.coral))),
            ]),
          ],
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: Text('$length/${ApiConstants.maxVibeLength}', style: AppTextStyles.caption.copyWith(
              color: overLimit ? AppColors.coral : AppColors.textTertiary)),
          ),
          const SizedBox(height: 12),
          Text('Category', style: AppTextStyles.labelSm.copyWith(color: AppColors.textSecondary)),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: _categories.map((c) {
            final (key, label) = c;
            final selected = _category == key;
            final color = AppColors.categoryColor[key] ?? AppColors.violet;
            return GestureDetector(
              onTap: () => setState(() => _category = key),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: selected ? color.withOpacity(0.15) : AppColors.bg3,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: selected ? color : AppColors.borderSubtle),
                ),
                child: Text(label, style: AppTextStyles.labelSm.copyWith(
                  color: selected ? color : AppColors.textSecondary, fontWeight: FontWeight.w700)),
              ),
            );
          }).toList()),
        ]),
      ),
    );
  }
}
