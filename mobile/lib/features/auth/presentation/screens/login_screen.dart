import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/utils/input_sanitiser.dart';
import '../../../../shared/widgets/vyl_widgets.dart';
import '../../../../core/router/app_router.dart';
import '../bloc/auth_bloc.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _pwCtrl    = TextEditingController();
  final _sanitiser = InputSanitiser();
  String? _errorMsg;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _pwCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    final email = _emailCtrl.text.trim();
    final pw    = _pwCtrl.text;
    if (email.isEmpty || pw.isEmpty) {
      setState(() => _errorMsg = 'Please enter your credentials');
      return;
    }
    final pwCheck = _sanitiser.validatePassword(pw);
    if (!pwCheck.isValid) {
      setState(() => _errorMsg = pwCheck.message);
      return;
    }
    setState(() => _errorMsg = null);
    context.read<AuthBloc>().add(AuthLogin(emailOrHandle: email, password: pw));
  }

  void _fillDemo() {
    _emailCtrl.text = 'aisha.k';
    _pwCtrl.text    = 'VylappDemo123!';
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
                const SizedBox(height: 56),
                // Wordmark
                ShaderMask(
                  shaderCallback: (bounds) => LinearGradient(
                    colors: AppColors.primaryGradient,
                  ).createShader(bounds),
                  child: Text('VYLAPP', style: AppTextStyles.displayLg.copyWith(
                    color: Colors.white, letterSpacing: -1,
                  )),
                ),
                const SizedBox(height: 8),
                Text('Welcome back to the community',
                  style: AppTextStyles.bodyLg.copyWith(color: AppColors.textSecondary)),
                const SizedBox(height: 40),

                VylTextField(
                  placeholder: 'Email or handle',
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  maxLength: 100,
                ),
                const SizedBox(height: 12),
                VylTextField(
                  placeholder: 'Password',
                  controller: _pwCtrl,
                  obscure: true,
                  maxLength: 128,
                ),

                if (_errorMsg != null) ...[
                  const SizedBox(height: 12),
                  Row(children: [
                    const Icon(Icons.error_outline, color: AppColors.coral, size: 16),
                    const SizedBox(width: 6),
                    Expanded(child: Text(_errorMsg!,
                      style: AppTextStyles.bodySm.copyWith(color: AppColors.coral))),
                  ]),
                ],

                const SizedBox(height: 24),
                BlocBuilder<AuthBloc, AuthState>(
                  builder: (context, state) => VylButton(
                    label: 'Log in',
                    onPressed: _submit,
                    loading: state is AuthLoading,
                    expanded: true,
                  ),
                ),
                const SizedBox(height: 20),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text("New to Vylapp? ",
                    style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary)),
                  GestureDetector(
                    onTap: () => context.go(Routes.register),
                    child: Text('Join now',
                      style: AppTextStyles.bodyMd.copyWith(
                        color: AppColors.violetLight, fontWeight: FontWeight.w700)),
                  ),
                ]),
                const SizedBox(height: 32),
                Divider(color: AppColors.borderSubtle, thickness: 0.5),
                const SizedBox(height: 16),
                Center(
                  child: GestureDetector(
                    onTap: _fillDemo,
                    child: RichText(text: TextSpan(
                      style: AppTextStyles.caption,
                      children: [
                        const TextSpan(text: 'Demo: '),
                        TextSpan(text: 'aisha.k / VylappDemo123!',
                          style: AppTextStyles.caption.copyWith(color: AppColors.sky)),
                      ],
                    )),
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
