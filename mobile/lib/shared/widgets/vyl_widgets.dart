import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_text_styles.dart';
import '../../features/auth/data/models/user_model.dart';

// ── Avatar ────────────────────────────────────────────────────────────────────
class VylAvatar extends StatelessWidget {
  final UserModel? user;
  final double size;
  final bool showStoryRing;
  final bool showOnline;
  final VoidCallback? onTap;

  const VylAvatar({
    super.key,
    this.user,
    this.size = 40,
    this.showStoryRing = false,
    this.showOnline = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = _parseColor(user?.avatarColor) ?? AppColors.violet;
    final initials = user?.avatarInitials ?? user?.displayName.substring(0, 2).toUpperCase() ?? 'VY';

    Widget avatar = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color.withOpacity(0.12),
        border: Border.all(
          color: showStoryRing ? Colors.transparent : color.withOpacity(0.25),
          width: 1.5,
        ),
      ),
      child: user?.avatarUrl != null
        ? ClipOval(
            child: Image.network(
              user!.avatarUrl!,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => _Initials(initials: initials, color: color, size: size),
            ),
          )
        : _Initials(initials: initials, color: color, size: size),
    );

    if (showStoryRing) {
      avatar = Container(
        width: size + 5,
        height: size + 5,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            colors: AppColors.storyRingGradient,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(2.5),
          child: Container(
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.bg,
            ),
            child: avatar,
          ),
        ),
      );
    }

    if (showOnline) {
      avatar = Stack(
        clipBehavior: Clip.none,
        children: [
          avatar,
          Positioned(
            bottom: 0, right: 0,
            child: Container(
              width: size * 0.28,
              height: size * 0.28,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.vibeGreen,
                border: Border.all(color: AppColors.bg, width: 2),
              ),
            ),
          ),
        ],
      );
    }

    if (onTap != null) {
      return GestureDetector(onTap: onTap, child: avatar);
    }
    return avatar;
  }

  Color? _parseColor(String? hex) {
    if (hex == null) return null;
    try {
      final code = hex.replaceFirst('#', '');
      return Color(int.parse('FF$code', radix: 16));
    } catch (_) {
      return null;
    }
  }
}

class _Initials extends StatelessWidget {
  final String initials;
  final Color  color;
  final double size;
  const _Initials({required this.initials, required this.color, required this.size});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        initials,
        style: TextStyle(
          fontFamily: 'SpaceMono',
          fontSize: size * 0.33,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}

// ── Primary button ─────────────────────────────────────────────────────────────
class VylButton extends StatelessWidget {
  final String        label;
  final VoidCallback? onPressed;
  final bool          loading;
  final bool          expanded;
  final Color?        backgroundColor;

  const VylButton({
    super.key,
    required this.label,
    this.onPressed,
    this.loading = false,
    this.expanded = false,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final btn = GestureDetector(
      onTap: (loading || onPressed == null) ? null : onPressed,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 13),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(999),
          gradient: backgroundColor != null
            ? null
            : LinearGradient(
                colors: AppColors.primaryGradient,
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ),
          color: backgroundColor,
          boxShadow: [
            BoxShadow(
              color: AppColors.violet.withOpacity(0.35),
              blurRadius: 18,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: loading
          ? const SizedBox(
              width: 18, height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation(Colors.white),
              ),
            )
          : Text(label, style: AppTextStyles.labelLg.copyWith(color: Colors.white)),
      ),
    );
    return expanded ? SizedBox(width: double.infinity, child: Center(child: btn)) : btn;
  }
}

// ── Ghost button ───────────────────────────────────────────────────────────────
class VylGhostButton extends StatelessWidget {
  final String        label;
  final VoidCallback? onPressed;

  const VylGhostButton({super.key, required this.label, this.onPressed});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onPressed,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.border, width: 1.5),
      ),
      child: Text(label, style: AppTextStyles.labelMd),
    ),
  );
}

// ── Text field ────────────────────────────────────────────────────────────────
class VylTextField extends StatelessWidget {
  final String        placeholder;
  final TextEditingController? controller;
  final bool          obscure;
  final TextInputType keyboardType;
  final int?          maxLength;
  final int           maxLines;
  final ValueChanged<String>? onChanged;

  const VylTextField({
    super.key,
    required this.placeholder,
    this.controller,
    this.obscure = false,
    this.keyboardType = TextInputType.text,
    this.maxLength,
    this.maxLines = 1,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) => TextField(
    controller:  controller,
    obscureText: obscure,
    keyboardType:keyboardType,
    maxLength:   maxLength,
    maxLines:    maxLines,
    onChanged:   onChanged,
    style:       AppTextStyles.bodyMd,
    decoration: InputDecoration(
      hintText:        placeholder,
      hintStyle:       AppTextStyles.bodyMd.copyWith(color: AppColors.textTertiary),
      filled:          true,
      fillColor:       AppColors.bg3,
      counterText:     '',
      border:          OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide:   const BorderSide(color: AppColors.borderSubtle, width: 1.5),
      ),
      enabledBorder:   OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide:   const BorderSide(color: AppColors.borderSubtle, width: 1.5),
      ),
      focusedBorder:   OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide:   const BorderSide(color: AppColors.violetBorder, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
    ),
  );
}

// ── Category badge ─────────────────────────────────────────────────────────────
class CategoryBadge extends StatelessWidget {
  final String category;
  const CategoryBadge(this.category, {super.key});

  @override
  Widget build(BuildContext context) {
    final color = AppColors.categoryColor[category] ?? AppColors.textSecondary;
    final label = category.replaceAll('_', ' ');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.25), width: 1),
      ),
      child: Text(
        label,
        style: AppTextStyles.labelXs.copyWith(color: color, fontFamily: 'SpaceMono'),
      ),
    );
  }
}

// ── Verified badge ─────────────────────────────────────────────────────────────
class VerifiedBadge extends StatelessWidget {
  final double size;
  const VerifiedBadge({super.key, this.size = 14});

  @override
  Widget build(BuildContext context) => Container(
    width: size, height: size,
    decoration: const BoxDecoration(
      shape: BoxShape.circle,
      color: AppColors.sky,
    ),
    child: Icon(Icons.check, size: size * 0.7, color: AppColors.bg),
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
class VylSkeleton extends StatefulWidget {
  final double width;
  final double height;
  final double radius;

  const VylSkeleton({
    super.key,
    required this.width,
    required this.height,
    this.radius = 8,
  });

  @override
  State<VylSkeleton> createState() => _VylSkeletonState();
}

class _VylSkeletonState extends State<VylSkeleton>
  with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this, duration: const Duration(milliseconds: 1200))
      ..repeat(reverse: true);
    _anim = Tween<double>(begin: 0.3, end: 0.7).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _anim,
    builder: (_, __) => Container(
      width: widget.width,
      height: widget.height,
      decoration: BoxDecoration(
        color: AppColors.bg3.withOpacity(_anim.value + 0.3),
        borderRadius: BorderRadius.circular(widget.radius),
      ),
    ),
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
class SectionHeader extends StatelessWidget {
  final String label;
  const SectionHeader(this.label, {super.key});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
    child: Text(
      label,
      style: AppTextStyles.labelXs.copyWith(letterSpacing: 0.8),
    ),
  );
}
