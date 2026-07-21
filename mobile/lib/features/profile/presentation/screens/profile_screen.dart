import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/network_exceptions.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/di/injection.dart';
import '../../../../shared/widgets/vyl_widgets.dart';
import '../../../auth/data/models/user_model.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';

class ProfileScreen extends StatefulWidget {
  final String? handle;
  const ProfileScreen({super.key, this.handle});
  @override State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _api = getIt<ApiClient>();
  UserModel? _user;
  bool _isOwnProfile = false;
  bool _loading = true;
  bool _connectBusy = false;
  String? _error;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });

    // Own profile: reuse the already-authenticated user from AuthBloc
    // rather than making a redundant network call.
    if (widget.handle == null) {
      final state = context.read<AuthBloc>().state;
      if (state is AuthAuthenticated) {
        setState(() { _user = state.user; _isOwnProfile = true; _loading = false; });
        return;
      }
    }

    try {
      final data = await _api.get(ApiConstants.userByHandle(widget.handle!));
      setState(() {
        _user = UserModel.fromJson(data['user'] as Map<String, dynamic>);
        _isOwnProfile = false;
        _loading = false;
      });
    } on NetworkException catch (e) {
      setState(() { _loading = false; _error = e.message; });
    } catch (_) {
      setState(() { _loading = false; _error = 'Failed to load profile.'; });
    }
  }

  Future<void> _toggleConnect() async {
    final u = _user;
    if (u == null || _connectBusy) return;
    setState(() => _connectBusy = true);
    final wasFollowing = u.viewerFollows ?? false;
    try {
      if (wasFollowing) {
        await _api.delete(ApiConstants.connectUser(u.id));
      } else {
        await _api.post(ApiConstants.connectUser(u.id));
      }
      setState(() => _user = UserModel(
        id: u.id, handle: u.handle, displayName: u.displayName, bio: u.bio,
        location: u.location, website: u.website, avatarUrl: u.avatarUrl,
        avatarColor: u.avatarColor, avatarInitials: u.avatarInitials, bannerUrl: u.bannerUrl,
        roleTag: u.roleTag, verified: u.verified, verificationTier: u.verificationTier,
        isCreator: u.isCreator, onboardingStep: u.onboardingStep, onboardingDone: u.onboardingDone,
        interests: u.interests, subscriptionPlan: u.subscriptionPlan, vibesCount: u.vibesCount,
        connectionsCount: u.connectionsCount + (wasFollowing ? -1 : 1), followingCount: u.followingCount,
        viewerFollows: !wasFollowing,
      ));
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not update connection.'), backgroundColor: AppColors.coral));
      }
    } finally {
      if (mounted) setState(() => _connectBusy = false);
    }
  }

  void _logout() => context.read<AuthBloc>().add(const AuthLogout());

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.bg,
    appBar: AppBar(
      backgroundColor: AppColors.bg,
      foregroundColor: AppColors.textPrimary,
      elevation: 0,
      title: Text(_user != null ? '@${_user!.handle}' : 'Profile', style: AppTextStyles.h2),
      actions: [
        if (_isOwnProfile)
          IconButton(icon: const Icon(Icons.logout, size: 20), onPressed: _logout),
      ],
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
        : _buildContent(_user!),
  );

  Widget _buildContent(UserModel u) => SingleChildScrollView(
    padding: const EdgeInsets.all(20),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        VylAvatar(user: u, size: 76),
        const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Flexible(child: Text(u.displayName, style: AppTextStyles.h1, overflow: TextOverflow.ellipsis)),
            if (u.verified) ...[const SizedBox(width: 6), const VerifiedBadge()],
          ]),
          Text('@${u.handle}', style: AppTextStyles.monoMd),
          if (u.roleTag != null) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
              decoration: BoxDecoration(color: AppColors.violetDim, borderRadius: BorderRadius.circular(999), border: Border.all(color: AppColors.violetBorder)),
              child: Text(u.roleTag!, style: AppTextStyles.labelXs.copyWith(color: AppColors.violetLight)),
            ),
          ],
        ])),
      ]),
      if (u.bio != null && u.bio!.isNotEmpty) ...[
        const SizedBox(height: 16),
        Text(u.bio!, style: AppTextStyles.bodyMd),
      ],
      const SizedBox(height: 20),
      Row(children: [
        _stat('${u.vibesCount}', 'Vibes'),
        const SizedBox(width: 24),
        _stat('${u.connectionsCount}', 'Connections'),
        const SizedBox(width: 24),
        _stat('${u.followingCount}', 'Following'),
      ]),
      const SizedBox(height: 24),
      if (!_isOwnProfile)
        VylButton(
          label: (u.viewerFollows ?? false) ? 'Connected' : 'Connect',
          expanded: true,
          loading: _connectBusy,
          backgroundColor: (u.viewerFollows ?? false) ? AppColors.bg4 : null,
          onPressed: _toggleConnect,
        ),
    ]),
  );

  Widget _stat(String value, String label) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(value, style: AppTextStyles.labelLg),
    Text(label, style: AppTextStyles.caption),
  ]);
}
