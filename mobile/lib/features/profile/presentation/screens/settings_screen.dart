import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';
import '../../../../shared/widgets/vyl_widgets.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../auth/data/models/user_model.dart';

// Plain StatefulWidget + getIt<ApiClient>(), matching the rest of the app's
// simple screens (Notifications, Spaces, Messages, Search) — AuthBloc is
// only reached for the one thing that's genuinely global state: the current
// user and logging out.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

// Native names for the app's curated language set (ApiConstants.supportedLangs)
// — not the full ~60-language list the web app's marketing/translation surface
// supports, which has no equivalent picker on mobile yet.
const _languageNames = <String, String>{
  'en': 'English', 'es': 'Español', 'fr': 'Français', 'pt': 'Português',
  'ar': 'العربية', 'sw': 'Kiswahili', 'yo': 'Yorùbá', 'ha': 'Hausa',
  'am': 'አማርኛ', 'ig': 'Igbo',
};

class _SettingsScreenState extends State<SettingsScreen> {
  final _api = getIt<ApiClient>();

  bool? _twoFactorEnabled;
  Map<String, dynamic>? _enrolment; // {secret, recoveryCodes} while mid-enrolment
  final _codeController = TextEditingController();
  bool _securityBusy = false;

  List<Map<String, dynamic>> _mutedWords = [];
  bool _mutedWordsLoading = true;
  final _wordController = TextEditingController();
  bool _addingWord = false;

  String? _savingField; // which toggle/field is in flight, for per-row feedback

  @override
  void initState() {
    super.initState();
    _loadAccountStatus();
    _loadMutedWords();
  }

  @override
  void dispose() {
    _codeController.dispose();
    _wordController.dispose();
    super.dispose();
  }

  Future<void> _loadAccountStatus() async {
    try {
      final data = await _api.get(ApiConstants.accountStatus);
      final verification = data['verification'] as Map<String, dynamic>?;
      if (mounted) setState(() => _twoFactorEnabled = verification?['twoFactor']?['enabled'] as bool? ?? false);
    } catch (_) {
      // Security section just shows its "Off" default state on failure
    }
  }

  Future<void> _loadMutedWords() async {
    setState(() => _mutedWordsLoading = true);
    try {
      final data = await _api.get(ApiConstants.mutedWords);
      final words = (data['words'] as List? ?? []).cast<Map<String, dynamic>>();
      if (mounted) setState(() { _mutedWords = words; _mutedWordsLoading = false; });
    } catch (_) {
      if (mounted) setState(() => _mutedWordsLoading = false);
    }
  }

  Future<void> _savePref(Map<String, dynamic> patch, String field) async {
    setState(() => _savingField = field);
    try {
      final data = await _api.patch(ApiConstants.updateMe, body: patch);
      final updated = data['user'] as Map<String, dynamic>?;
      if (updated != null && mounted) {
        final current = context.read<AuthBloc>().state;
        if (current is AuthAuthenticated) {
          context.read<AuthBloc>().add(AuthUpdateUser(UserModel.fromJson(updated)));
        }
      }
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Couldn't save that — try again")));
    } finally {
      if (mounted) setState(() => _savingField = null);
    }
  }

  Future<void> _addMutedWord() async {
    final word = _wordController.text.trim();
    if (word.isEmpty) return;
    setState(() => _addingWord = true);
    try {
      await _api.post(ApiConstants.mutedWords, body: {'word': word});
      _wordController.clear();
      await _loadMutedWords();
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Couldn't add that word")));
    } finally {
      if (mounted) setState(() => _addingWord = false);
    }
  }

  Future<void> _removeMutedWord(String id) async {
    final previous = _mutedWords;
    setState(() => _mutedWords = _mutedWords.where((w) => w['id'] != id).toList()); // optimistic
    try {
      await _api.delete(ApiConstants.mutedWordById(id));
    } catch (_) {
      setState(() => _mutedWords = previous); // rollback
    }
  }

  Future<void> _beginTwoFactor() async {
    setState(() => _securityBusy = true);
    try {
      final data = await _api.post(ApiConstants.twoFactorEnroll);
      setState(() => _enrolment = data);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _securityBusy = false);
    }
  }

  Future<void> _confirmTwoFactor() async {
    final code = _codeController.text.trim();
    if (code.isEmpty) return;
    setState(() => _securityBusy = true);
    try {
      await _api.post(ApiConstants.twoFactorVerify, body: {'code': code});
      setState(() { _twoFactorEnabled = true; _enrolment = null; _codeController.clear(); });
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _securityBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    final user = authState is AuthAuthenticated ? authState.user : null;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        title: Text('Settings', style: AppTextStyles.h2),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(0.5),
          child: Container(height: 0.5, color: AppColors.borderSubtle),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
        children: [
          _SectionLabel('LANGUAGE'),
          _Card(child: user == null ? const SizedBox.shrink() : _LanguagePicker(
            value: user.uiLanguage,
            busy: _savingField == 'language',
            onChanged: (code) => _savePref({'ui_language': code}, 'language'),
          )),

          _SectionLabel('PRIVACY'),
          _Card(child: user == null ? const SizedBox.shrink() : Column(children: [
            _ToggleRow(
              label: 'Private account',
              sub: 'New followers need your approval before they can see your vibes',
              value: user.privateAccount,
              busy: _savingField == 'private',
              onChanged: (v) => _savePref({'private_account': v}, 'private'),
            ),
            const Divider(color: AppColors.borderSubtle, height: 24),
            _ToggleRow(
              label: 'Allow direct messages',
              sub: 'Turn off to stop new message requests from non-connections',
              value: user.allowDms,
              busy: _savingField == 'dms',
              onChanged: (v) => _savePref({'allow_dms': v}, 'dms'),
            ),
          ])),

          _SectionLabel('MUTED WORDS'),
          _Card(child: _MutedWordsSection(
            words: _mutedWords,
            loading: _mutedWordsLoading,
            controller: _wordController,
            adding: _addingWord,
            onAdd: _addMutedWord,
            onRemove: _removeMutedWord,
          )),

          _SectionLabel('SECURITY'),
          _Card(child: _TwoFactorSection(
            enabled: _twoFactorEnabled,
            enrolment: _enrolment,
            codeController: _codeController,
            busy: _securityBusy,
            onEnroll: _beginTwoFactor,
            onConfirm: _confirmTwoFactor,
          )),

          _SectionLabel('ACCOUNT'),
          _Card(child: SizedBox(
            width: double.infinity,
            child: VylGhostButton(
              label: 'Log out',
              onPressed: () => context.read<AuthBloc>().add(const AuthLogout()),
            ),
          )),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(4, 20, 4, 10),
    child: Text(text, style: AppTextStyles.labelSm.copyWith(color: AppColors.textSecondary, letterSpacing: 0.4)),
  );
}

class _Card extends StatelessWidget {
  final Widget child;
  const _Card({required this.child});
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppColors.bg3,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: AppColors.borderSubtle),
    ),
    child: child,
  );
}

class _LanguagePicker extends StatelessWidget {
  final String value;
  final bool busy;
  final ValueChanged<String> onChanged;
  const _LanguagePicker({required this.value, required this.busy, required this.onChanged});

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text('Reading language', style: AppTextStyles.labelSm.copyWith(color: AppColors.textSecondary)),
    const SizedBox(height: 8),
    Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: AppColors.bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: DropdownButtonHideUnderline(child: DropdownButton<String>(
        value: _languageNames.containsKey(value) ? value : 'en',
        isExpanded: true,
        dropdownColor: AppColors.bg2,
        icon: busy
          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.violet))
          : const Icon(Icons.keyboard_arrow_down, color: AppColors.textSecondary),
        style: AppTextStyles.bodyMd,
        items: _languageNames.entries.map((e) =>
          DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
        onChanged: busy ? null : (v) { if (v != null) onChanged(v); },
      )),
    ),
    const SizedBox(height: 8),
    Text('Changes what the app shell and translated content are shown in. Syncs across your devices.',
      style: AppTextStyles.caption),
  ]);
}

class _ToggleRow extends StatelessWidget {
  final String label;
  final String sub;
  final bool value;
  final bool busy;
  final ValueChanged<bool> onChanged;
  const _ToggleRow({required this.label, required this.sub, required this.value, required this.busy, required this.onChanged});

  @override
  Widget build(BuildContext context) => Row(children: [
    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: AppTextStyles.labelLg),
      const SizedBox(height: 3),
      Text(sub, style: AppTextStyles.caption),
    ])),
    Switch(value: value, onChanged: busy ? null : onChanged, activeColor: AppColors.violet),
  ]);
}

class _MutedWordsSection extends StatelessWidget {
  final List<Map<String, dynamic>> words;
  final bool loading;
  final TextEditingController controller;
  final bool adding;
  final VoidCallback onAdd;
  final ValueChanged<String> onRemove;

  const _MutedWordsSection({
    required this.words, required this.loading, required this.controller,
    required this.adding, required this.onAdd, required this.onRemove,
  });

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text("Vibes containing any of these words won't show up in your feed. Case-insensitive.",
      style: AppTextStyles.caption),
    const SizedBox(height: 12),
    Row(children: [
      Expanded(child: TextField(
        controller: controller,
        style: AppTextStyles.bodyMd,
        decoration: InputDecoration(
          hintText: 'Add a word or phrase',
          hintStyle: AppTextStyles.bodyMd.copyWith(color: AppColors.textTertiary),
          filled: true, fillColor: AppColors.bg,
          isDense: true, contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
        ),
      )),
      const SizedBox(width: 8),
      VylButton(label: 'Add', loading: adding, onPressed: onAdd),
    ]),
    if (!loading && words.isNotEmpty) ...[
      const SizedBox(height: 14),
      ...words.map((w) => Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.borderSubtle))),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(w['word'] as String, style: AppTextStyles.bodyMd),
          GestureDetector(
            onTap: () => onRemove(w['id'] as String),
            child: Text('Remove', style: AppTextStyles.labelSm.copyWith(color: AppColors.textSecondary, fontWeight: FontWeight.w700)),
          ),
        ]),
      )),
    ],
  ]);
}

class _TwoFactorSection extends StatelessWidget {
  final bool? enabled;
  final Map<String, dynamic>? enrolment;
  final TextEditingController codeController;
  final bool busy;
  final VoidCallback onEnroll;
  final VoidCallback onConfirm;

  const _TwoFactorSection({
    required this.enabled, required this.enrolment, required this.codeController,
    required this.busy, required this.onEnroll, required this.onConfirm,
  });

  @override
  Widget build(BuildContext context) {
    final isEnabled = enabled == true;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Two-step verification', style: AppTextStyles.labelLg),
          const SizedBox(height: 3),
          Text(
            isEnabled
              ? 'Enabled. Password sign-in also requires a rotating code or recovery code.'
              : 'Add a rotating verification code to password sign-in.',
            style: AppTextStyles.caption,
          ),
        ])),
        Text(isEnabled ? 'Enabled' : 'Off', style: AppTextStyles.labelSm.copyWith(
          color: isEnabled ? AppColors.success : AppColors.warning, fontWeight: FontWeight.w800)),
      ]),
      if (!isEnabled && enrolment == null) ...[
        const SizedBox(height: 14),
        VylGhostButton(label: busy ? 'Working…' : 'Enable two-step verification', onPressed: busy ? null : onEnroll),
      ],
      if (!isEnabled && enrolment != null) ...[
        const SizedBox(height: 14),
        const Divider(color: AppColors.borderSubtle),
        const SizedBox(height: 10),
        Text(
          'Enter the six-digit code sent to your account email. You can also add this secret to a TOTP authenticator:',
          style: AppTextStyles.caption,
        ),
        const SizedBox(height: 6),
        SelectableText(enrolment!['secret'] as String? ?? '', style: AppTextStyles.monoSm),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: TextField(
            controller: codeController,
            keyboardType: TextInputType.number,
            style: AppTextStyles.bodyMd,
            decoration: InputDecoration(
              hintText: '6-digit code',
              hintStyle: AppTextStyles.bodyMd.copyWith(color: AppColors.textTertiary),
              filled: true, fillColor: AppColors.bg,
              isDense: true, contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
            ),
          )),
          const SizedBox(width: 8),
          VylButton(label: 'Confirm', loading: busy, onPressed: onConfirm),
        ]),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppColors.amberDim,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.amber.withOpacity(0.3)),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Save these one-use recovery codes somewhere private before confirming:', style: AppTextStyles.caption),
            const SizedBox(height: 8),
            Wrap(spacing: 12, runSpacing: 4, children: (enrolment!['recoveryCodes'] as List? ?? [])
              .map((c) => Text(c as String, style: AppTextStyles.monoSm)).toList()),
          ]),
        ),
      ],
    ]);
  }
}
