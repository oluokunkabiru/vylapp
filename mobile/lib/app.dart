import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'core/di/injection.dart';
import 'core/router/app_router.dart';
import 'core/security/security_service.dart';
import 'core/constants/app_colors.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'features/feed/presentation/bloc/feed_bloc.dart';

class VylApp extends StatefulWidget {
  final SecurityReport securityReport;
  const VylApp({super.key, required this.securityReport});

  @override
  State<VylApp> createState() => _VylAppState();
}

class _VylAppState extends State<VylApp> {
  late final AuthBloc _authBloc;
  late final FeedBloc _feedBloc;

  @override
  void initState() {
    super.initState();
    _authBloc = getIt<AuthBloc>()..add(const AuthCheckSession());
    _feedBloc = getIt<FeedBloc>();
  }

  @override
  void dispose() {
    _authBloc.close();
    _feedBloc.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider.value(value: _authBloc),
        BlocProvider.value(value: _feedBloc),
      ],
      child: Builder(
        builder: (ctx) {
          final router = buildRouter(_authBloc);
          return MaterialApp.router(
            title:       'Vylapp',
            debugShowCheckedModeBanner: false,
            routerConfig: router,
            theme: ThemeData(
              useMaterial3:     true,
              brightness:       Brightness.dark,
              scaffoldBackgroundColor: AppColors.bg,
              colorScheme: ColorScheme.dark(
                primary:    AppColors.violet,
                secondary:  AppColors.vibeGreen,
                surface:    AppColors.bg2,
                error:      AppColors.coral,
              ),
              fontFamily: 'Sora',
            ),
          );
        },
      ),
    );
  }
}
