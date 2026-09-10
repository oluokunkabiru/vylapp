import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../shared/widgets/vyl_widgets.dart';
import '../../../../core/router/app_router.dart';
import '../bloc/auth_bloc.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameCtrl = TextEditingController();
  final _handleCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _pwCtrl = TextEditingController();
  DateTime? _dateOfBirth;
  String? _errorMsg;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _handleCtrl.dispose();
    _emailCtrl.dispose();
    _pwCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    setState(() => _errorMsg = null);
    if (_dateOfBirth == null) {
      setState(() => _errorMsg = 'Date of birth is required');
      return;
    }
    context.read<AuthBloc>().add(AuthRegister(
          email: _emailCtrl.text.trim(),
          handle: _handleCtrl.text.trim(),
          password: _pwCtrl.text,
          displayName: _nameCtrl.text.trim(),
          dateOfBirth: _dateOfBirth!.toIso8601String().substring(0, 10),
        ));
  }

  Future<void> _selectDateOfBirth() async {
    final now = DateTime.now();
    final selected = await showDatePicker(
      context: context,
      initialDate: _dateOfBirth ?? DateTime(now.year - 21, now.month, now.day),
      firstDate: DateTime(1900),
      lastDate: now,
      helpText: 'Select your date of birth',
    );
    if (selected != null && mounted) setState(() => _dateOfBirth = selected);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthError) setState(() => _errorMsg = state.message);
        },
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 40),
                GestureDetector(
                  onTap: () => context.go(Routes.login),
                  child: const Icon(Icons.arrow_back,
                      color: AppColors.textSecondary),
                ),
                const SizedBox(height: 24),
                Text('Join Vylapp', style: AppTextStyles.displayMd),
                const SizedBox(height: 6),
                Text('Vibe. Learn. Connect.',
                    style: AppTextStyles.bodyLg
                        .copyWith(color: AppColors.textSecondary)),
                const SizedBox(height: 32),
                VylTextField(
                    placeholder: 'Your name',
                    controller: _nameCtrl,
                    maxLength: 50),
                const SizedBox(height: 12),
                VylTextField(
                  placeholder: 'Handle (e.g. aisha.k)',
                  controller: _handleCtrl,
                  maxLength: 20,
                ),
                const SizedBox(height: 12),
                VylTextField(
                  placeholder: 'Email address',
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  maxLength: 254,
                ),
                const SizedBox(height: 12),
                Semantics(
                  button: true,
                  label: 'Select date of birth',
                  child: InkWell(
                    onTap: _selectDateOfBirth,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 15),
                      decoration: BoxDecoration(
                        color: AppColors.bg3,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(children: [
                        Icon(Icons.cake_outlined,
                            color: AppColors.textSecondary, size: 20),
                        const SizedBox(width: 10),
                        Text(
                          _dateOfBirth == null
                              ? 'Date of birth'
                              : '${_dateOfBirth!.day.toString().padLeft(2, '0')}/${_dateOfBirth!.month.toString().padLeft(2, '0')}/${_dateOfBirth!.year}',
                          style: AppTextStyles.bodyMd.copyWith(
                            color: _dateOfBirth == null
                                ? AppColors.textSecondary
                                : AppColors.textPrimary,
                          ),
                        ),
                      ]),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                VylTextField(
                  placeholder: 'Password (min 8 characters)',
                  controller: _pwCtrl,
                  obscure: true,
                  maxLength: 128,
                ),
                if (_errorMsg != null) ...[
                  const SizedBox(height: 12),
                  Row(children: [
                    const Icon(Icons.error_outline,
                        color: AppColors.coral, size: 16),
                    const SizedBox(width: 6),
                    Expanded(
                        child: Text(_errorMsg!,
                            style: AppTextStyles.bodySm
                                .copyWith(color: AppColors.coral))),
                  ]),
                ],
                const SizedBox(height: 24),
                BlocBuilder<AuthBloc, AuthState>(
                  builder: (context, state) => VylButton(
                    label: 'Create account',
                    onPressed: _submit,
                    loading: state is AuthLoading,
                    expanded: true,
                  ),
                ),
                const SizedBox(height: 20),
                Center(
                    child: GestureDetector(
                  onTap: () => context.go(Routes.login),
                  child: RichText(
                      text: TextSpan(
                    style: AppTextStyles.bodyMd
                        .copyWith(color: AppColors.textSecondary),
                    children: [
                      const TextSpan(text: 'Already have an account? '),
                      TextSpan(
                          text: 'Log in',
                          style: AppTextStyles.bodyMd.copyWith(
                              color: AppColors.violetLight,
                              fontWeight: FontWeight.w700)),
                    ],
                  )),
                )),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
