import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:injectable/injectable.dart';
import '../../data/models/user_model.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/network_exceptions.dart';
import '../../../../core/security/token_service.dart';
import '../../../../core/network/socket_service.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/utils/input_sanitiser.dart';

// ── Events ────────────────────────────────────────────────────────────────────
abstract class AuthEvent extends Equatable {
  const AuthEvent();
  @override List<Object?> get props => [];
}

class AuthCheckSession extends AuthEvent {
  const AuthCheckSession();
}

class AuthLogin extends AuthEvent {
  final String emailOrHandle;
  final String password;
  const AuthLogin({required this.emailOrHandle, required this.password});
  @override List<Object?> get props => [emailOrHandle];
}

class AuthRegister extends AuthEvent {
  final String email;
  final String handle;
  final String password;
  final String displayName;
  const AuthRegister({
    required this.email, required this.handle,
    required this.password, required this.displayName,
  });
  @override List<Object?> get props => [email, handle];
}

class AuthLogout extends AuthEvent {
  const AuthLogout();
}

class AuthUpdateUser extends AuthEvent {
  final UserModel user;
  const AuthUpdateUser(this.user);
  @override List<Object?> get props => [user];
}

// ── States ────────────────────────────────────────────────────────────────────
abstract class AuthState extends Equatable {
  const AuthState();
  @override List<Object?> get props => [];
}

class AuthInitial       extends AuthState { const AuthInitial(); }
class AuthLoading       extends AuthState { const AuthLoading(); }
class AuthAuthenticated extends AuthState {
  final UserModel user;
  const AuthAuthenticated(this.user);
  @override List<Object?> get props => [user];
}
class AuthUnauthenticated extends AuthState { const AuthUnauthenticated(); }
class AuthError extends AuthState {
  final String message;
  const AuthError(this.message);
  @override List<Object?> get props => [message];
}

// ── BLoC ──────────────────────────────────────────────────────────────────────
@injectable
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc(this._api, this._tokens, this._socket, this._sanitiser)
    : super(const AuthInitial()) {
    on<AuthCheckSession>(_onCheckSession);
    on<AuthLogin>(_onLogin);
    on<AuthRegister>(_onRegister);
    on<AuthLogout>(_onLogout);
    on<AuthUpdateUser>(_onUpdateUser);
  }

  final ApiClient     _api;
  final TokenService  _tokens;
  final SocketService _socket;
  final InputSanitiser _sanitiser;

  Future<void> _onCheckSession(AuthCheckSession event, Emitter<AuthState> emit) async {
    emit(const AuthLoading());
    try {
      final hasSession = await _tokens.hasValidSession();
      if (!hasSession) {
        await _tokens.clearAll();
        return emit(const AuthUnauthenticated());
      }
      final data = await _api.get(ApiConstants.me);
      final user = UserModel.fromJson(data['user'] as Map<String, dynamic>);
      await _socket.connect();
      emit(AuthAuthenticated(user));
    } on NetworkException catch (e) {
      if (e.isUnauthorised) {
        await _tokens.clearAll();
        emit(const AuthUnauthenticated());
      } else {
        // Network error — user might still be logged in, try offline-first
        final userId = await _tokens.getUserId();
        if (userId != null) {
          // Can't reach server but have valid (non-expired) session
          emit(const AuthUnauthenticated());
        } else {
          emit(const AuthUnauthenticated());
        }
      }
    } catch (_) {
      await _tokens.clearAll();
      emit(const AuthUnauthenticated());
    }
  }

  Future<void> _onLogin(AuthLogin event, Emitter<AuthState> emit) async {
    // Client-side rate limiting
    if (_sanitiser.isRateLimited('login', ApiConstants.loginRateLimit)) {
      return emit(const AuthError('Please wait before trying again.'));
    }

    emit(const AuthLoading());
    try {
      final data = await _api.post(
        ApiConstants.login,
        body: {
          'emailOrHandle': event.emailOrHandle.trim(),
          'password':      event.password,
        },
        requiresAuth: false,
      );
      final user  = UserModel.fromJson(data['user'] as Map<String, dynamic>);
      final access  = data['accessToken']  as String;
      final refresh = data['refreshToken'] as String;
      await _tokens.saveTokens(
        accessToken: access, refreshToken: refresh, userId: user.id);
      await _socket.connect();
      emit(AuthAuthenticated(user));
    } on NetworkException catch (e) {
      emit(AuthError(e.message));
    } catch (e) {
      emit(const AuthError('Login failed. Please try again.'));
    }
  }

  Future<void> _onRegister(AuthRegister event, Emitter<AuthState> emit) async {
    // Validate before hitting the network
    final emailCheck  = _sanitiser.validateEmail(event.email);
    final handleCheck = _sanitiser.validateHandle(event.handle);
    final pwCheck     = _sanitiser.validatePassword(event.password);

    if (!emailCheck.isValid)  return emit(AuthError(emailCheck.message!));
    if (!handleCheck.isValid) return emit(AuthError(handleCheck.message!));
    if (!pwCheck.isValid)     return emit(AuthError(pwCheck.message!));

    if (event.displayName.trim().isEmpty) {
      return emit(const AuthError('Display name is required'));
    }

    emit(const AuthLoading());
    try {
      final data = await _api.post(
        ApiConstants.register,
        body: {
          'email':       event.email.trim().toLowerCase(),
          'handle':      _sanitiser.sanitiseHandle(event.handle),
          'password':    event.password,
          'displayName': event.displayName.trim(),
        },
        requiresAuth: false,
      );
      final user    = UserModel.fromJson(data['user'] as Map<String, dynamic>);
      final access  = data['accessToken']  as String;
      final refresh = data['refreshToken'] as String;
      await _tokens.saveTokens(
        accessToken: access, refreshToken: refresh, userId: user.id);
      await _socket.connect();
      emit(AuthAuthenticated(user));
    } on NetworkException catch (e) {
      emit(AuthError(e.message));
    } catch (_) {
      emit(const AuthError('Registration failed. Please try again.'));
    }
  }

  Future<void> _onLogout(AuthLogout event, Emitter<AuthState> emit) async {
    try {
      final refresh = await _tokens.getRefreshToken();
      await _api.post(ApiConstants.logout, body: {'refreshToken': refresh});
    } catch (_) {
      // Best-effort server-side revocation. Local cleanup always happens.
    } finally {
      await _socket.disconnect();
      await _tokens.clearAll();
      emit(const AuthUnauthenticated());
    }
  }

  Future<void> _onUpdateUser(AuthUpdateUser event, Emitter<AuthState> emit) async {
    emit(AuthAuthenticated(event.user));
  }
}
