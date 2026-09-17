// The first real test in this project — replaces test/widget_test.dart,
// which was the unmodified `flutter create` counter-app boilerplate and
// failed to compile (`Couldn't find constructor 'MyApp'`) the moment the
// real app replaced it, months before this was noticed.
//
// AuthBloc is chosen deliberately: pumping the full VylApp widget tree
// would require mocking flutter_secure_storage's platform channel, Firebase,
// and GoRouter just to get past initState — a lot of scaffolding for a
// "does it build" smoke test. AuthBloc is where the real, previously
// hand-verified-via-curl mobile/backend auth contract (X-Platform: flutter,
// token storage, silent refresh) actually lives, and it has no platform
// dependencies at all once ApiClient/TokenService/SocketService are mocked —
// InputSanitiser is pure logic and used for real, not mocked.
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:vylapp/core/constants/api_constants.dart';
import 'package:vylapp/core/network/api_client.dart';
import 'package:vylapp/core/network/network_exceptions.dart';
import 'package:vylapp/core/network/socket_service.dart';
import 'package:vylapp/core/security/token_service.dart';
import 'package:vylapp/core/utils/input_sanitiser.dart';
import 'package:vylapp/features/auth/presentation/bloc/auth_bloc.dart';

class MockApiClient extends Mock implements ApiClient {}

class MockTokenService extends Mock implements TokenService {}

class MockSocketService extends Mock implements SocketService {}

const _userJson = {
  'id': 'u1',
  'handle': 'testuser',
  'displayName': 'Test User',
};

void main() {
  late MockApiClient api;
  late MockTokenService tokens;
  late MockSocketService socket;
  late InputSanitiser sanitiser;

  setUp(() {
    api = MockApiClient();
    tokens = MockTokenService();
    socket = MockSocketService();
    sanitiser = InputSanitiser();
    when(() => socket.connect()).thenAnswer((_) async {});
    when(() => socket.disconnect()).thenAnswer((_) async {});
  });

  AuthBloc build() => AuthBloc(api, tokens, socket, sanitiser);

  group('AuthCheckSession', () {
    blocTest<AuthBloc, AuthState>(
      'emits unauthenticated when no stored session exists',
      setUp: () {
        when(() => tokens.hasValidSession()).thenAnswer((_) async => false);
        when(() => tokens.clearAll()).thenAnswer((_) async {});
      },
      build: build,
      act: (bloc) => bloc.add(const AuthCheckSession()),
      expect: () => [const AuthLoading(), const AuthUnauthenticated()],
      verify: (_) => verify(() => tokens.clearAll()).called(1),
    );

    blocTest<AuthBloc, AuthState>(
      'emits authenticated when a valid session resolves against /auth/me',
      setUp: () {
        when(() => tokens.hasValidSession()).thenAnswer((_) async => true);
        when(() => api.get('/auth/me')).thenAnswer((_) async => {'user': _userJson});
      },
      build: build,
      act: (bloc) => bloc.add(const AuthCheckSession()),
      expect: () => [
        const AuthLoading(),
        isA<AuthAuthenticated>().having((s) => s.user.handle, 'handle', 'testuser'),
      ],
    );

    blocTest<AuthBloc, AuthState>(
      'clears tokens and de-authenticates on a 401 from /auth/me',
      setUp: () {
        when(() => tokens.hasValidSession()).thenAnswer((_) async => true);
        when(() => api.get('/auth/me')).thenThrow(const NetworkException.unauthorised());
        when(() => tokens.clearAll()).thenAnswer((_) async {});
      },
      build: build,
      act: (bloc) => bloc.add(const AuthCheckSession()),
      expect: () => [const AuthLoading(), const AuthUnauthenticated()],
      verify: (_) => verify(() => tokens.clearAll()).called(1),
    );
  });

  group('AuthLogin', () {
    blocTest<AuthBloc, AuthState>(
      'stores tokens and authenticates on success',
      setUp: () {
        when(() => api.post(ApiConstants.login, body: any(named: 'body'), requiresAuth: false))
            .thenAnswer((_) async => {'user': _userJson, 'accessToken': 'at', 'refreshToken': 'rt'});
        when(() => tokens.saveTokens(accessToken: 'at', refreshToken: 'rt', userId: 'u1'))
            .thenAnswer((_) async {});
      },
      build: build,
      act: (bloc) => bloc.add(const AuthLogin(emailOrHandle: 'testuser', password: 'password123')),
      expect: () => [
        const AuthLoading(),
        isA<AuthAuthenticated>().having((s) => s.user.id, 'id', 'u1'),
      ],
      verify: (_) => verify(() => tokens.saveTokens(accessToken: 'at', refreshToken: 'rt', userId: 'u1')).called(1),
    );

    blocTest<AuthBloc, AuthState>(
      'surfaces the server error message on invalid credentials',
      setUp: () => when(() => api.post(ApiConstants.login, body: any(named: 'body'), requiresAuth: false))
          .thenThrow(const NetworkException.server('Invalid credentials')),
      build: build,
      act: (bloc) => bloc.add(const AuthLogin(emailOrHandle: 'testuser', password: 'wrong')),
      expect: () => [const AuthLoading(), const AuthError('Invalid credentials')],
    );
  });

  group('AuthRegister', () {
    blocTest<AuthBloc, AuthState>(
      'rejects an invalid email before ever calling the API',
      build: build,
      act: (bloc) => bloc.add(const AuthRegister(
        email: 'not-an-email',
        handle: 'newuser',
        password: 'password123',
        displayName: 'New User',
        dateOfBirth: '1990-01-01',
      )),
      expect: () => [isA<AuthError>()],
      verify: (_) => verifyNever(() => api.post(any(), body: any(named: 'body'), requiresAuth: any(named: 'requiresAuth'))),
    );
  });

  group('AuthLogout', () {
    blocTest<AuthBloc, AuthState>(
      'revokes the refresh token, disconnects the socket, and clears local tokens',
      setUp: () {
        when(() => tokens.getRefreshToken()).thenAnswer((_) async => 'rt');
        when(() => api.post('/auth/logout', body: any(named: 'body'))).thenAnswer((_) async => {});
        when(() => tokens.clearAll()).thenAnswer((_) async {});
      },
      build: build,
      act: (bloc) => bloc.add(const AuthLogout()),
      expect: () => [const AuthUnauthenticated()],
      verify: (_) {
        // A Map literal has no structural == in Dart, so matching the exact
        // body here would compare by reference and spuriously fail even
        // though the real call is correct — any(named:) sidesteps that.
        verify(() => api.post('/auth/logout', body: any(named: 'body'))).called(1);
        verify(() => socket.disconnect()).called(1);
        verify(() => tokens.clearAll()).called(1);
      },
    );
  });
}
