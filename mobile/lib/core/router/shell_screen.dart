import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_text_styles.dart';
import 'app_router.dart';

class ShellScreen extends StatelessWidget {
  final Widget child;
  const ShellScreen({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: child,
      bottomNavigationBar: const _VylBottomNav(),
    );
  }
}

class _VylBottomNav extends StatelessWidget {
  const _VylBottomNav();

  static const _items = [
    _NavItem(icon: Icons.home_outlined,     activeIcon: Icons.home,             label: 'Home',    route: Routes.home),
    _NavItem(icon: Icons.headphones_outlined,activeIcon: Icons.headphones,      label: 'Spaces',  route: Routes.spaces),
    _NavItem(icon: Icons.add_box_outlined,  activeIcon: Icons.add_box,          label: 'Share',   route: ''),
    _NavItem(icon: Icons.send_outlined,     activeIcon: Icons.send,             label: 'Messages',route: Routes.messages),
    _NavItem(icon: Icons.person_outline,    activeIcon: Icons.person,           label: 'Profile', route: Routes.myProfile),
  ];

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.bg,
        border: Border(top: BorderSide(color: AppColors.borderSubtle, width: 0.5)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 58,
          child: Row(
            children: _items.map((item) {
              if (item.route.isEmpty) {
                // Create / Share button
                return Expanded(
                  child: GestureDetector(
                    onTap: () => _showCreateSheet(context),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 34, height: 34,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(10),
                            gradient: AppColors.primaryLinear,
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.violet.withOpacity(0.4),
                                blurRadius: 12, offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: const Icon(Icons.add, color: Colors.white, size: 20),
                        ),
                        const SizedBox(height: 3),
                        Text(item.label, style: AppTextStyles.labelXs.copyWith(
                          color: AppColors.textSecondary, fontSize: 10)),
                      ],
                    ),
                  ),
                );
              }

              final isActive = location == item.route ||
                (item.route == Routes.home && location == '/');

              return Expanded(
                child: GestureDetector(
                  onTap: () => context.go(item.route),
                  behavior: HitTestBehavior.opaque,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        isActive ? item.activeIcon : item.icon,
                        size: 24,
                        color: isActive ? AppColors.textPrimary : AppColors.textSecondary,
                      ),
                      const SizedBox(height: 3),
                      Text(
                        item.label,
                        style: AppTextStyles.labelXs.copyWith(
                          color: isActive ? AppColors.textPrimary : AppColors.textSecondary,
                          fontWeight: isActive ? FontWeight.w800 : FontWeight.w600,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  void _showCreateSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bg2,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => const _CreateSheet(),
    );
  }
}

class _CreateSheet extends StatelessWidget {
  const _CreateSheet();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 8),
          Container(
            width: 36, height: 4,
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          _SheetOption(
            icon: Icons.bolt_outlined, color: AppColors.violetLight,
            label: 'Share a Vibe', sub: 'Post to your community',
            onTap: () { Navigator.pop(context); /* navigate to compose */ },
          ),
          _SheetOption(
            icon: Icons.headphones_outlined, color: AppColors.vibeGreen,
            label: 'Host a Space', sub: 'Start a live voice room',
            onTap: () { Navigator.pop(context); context.go(Routes.spaces); },
          ),
          _SheetOption(
            icon: Icons.auto_awesome_outlined, color: AppColors.amber,
            label: 'Run Autopilot', sub: 'Let AI post for you',
            onTap: () { Navigator.pop(context); context.go(Routes.autopilot); },
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class _SheetOption extends StatelessWidget {
  final IconData icon;
  final Color    color;
  final String   label;
  final String   sub;
  final VoidCallback onTap;

  const _SheetOption({
    required this.icon, required this.color, required this.label,
    required this.sub, required this.onTap,
  });

  @override
  Widget build(BuildContext context) => ListTile(
    onTap: onTap,
    leading: Container(
      width: 44, height: 44,
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: color, size: 22),
    ),
    title: Text(label, style: AppTextStyles.labelLg),
    subtitle: Text(sub, style: AppTextStyles.caption),
  );
}

class _NavItem {
  final IconData activeIcon;
  final IconData icon;
  final String   label;
  final String   route;
  const _NavItem({
    required this.icon, required this.activeIcon,
    required this.label, required this.route,
  });
}
