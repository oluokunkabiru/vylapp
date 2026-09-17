// Settings needs both a mocked ApiClient (for its own direct calls) and a
// mocked AuthBloc (it reads the current user via context.watch<AuthBloc>()
// and dispatches AuthUpdateUser/AuthLogout) — bloc_test's whenListen lets a
// mocked Bloc still work with BlocProvider/context.watch in a widget test.
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:vylapp/core/network/api_client.dart';
import 'package:vylapp/core/di/injection.dart';
import 'package:vylapp/features/auth/data/models/user_model.dart';
import 'package:vylapp/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:vylapp/features/profile/presentation/screens/settings_screen.dart';

class MockApiClient extends Mock implements ApiClient {}

class MockAuthBloc extends MockBloc<AuthEvent, AuthState> implements AuthBloc {}

const _testUser = UserModel(
  id: 'u1',
  handle: 'testuser',
  displayName: 'Test User',
  uiLanguage: 'en',
  privateAccount: false,
  allowDms: true,
);

void main() {
  late MockApiClient api;
  late MockAuthBloc authBloc;

  setUpAll(() {
    registerFallbackValue(const AuthLogout());
  });

  setUp(() {
    api = MockApiClient();
    authBloc = MockAuthBloc();
    getIt.registerSingleton<ApiClient>(api);
    when(() => authBloc.state).thenReturn(const AuthAuthenticated(_testUser));

    when(() => api.get('/auth/account-status'))
      .thenAnswer((_) async => {'verification': {'twoFactor': {'enabled': false}}});
    when(() => api.get('/users/me/muted-words'))
      .thenAnswer((_) async => {'words': []});
  });

  tearDown(() => getIt.reset());

  Future<void> pumpSettingsScreen(WidgetTester tester) async {
    await tester.pumpWidget(MaterialApp(
      home: BlocProvider<AuthBloc>.value(value: authBloc, child: const SettingsScreen()),
    ));
    await tester.pump(); // let the two initState loads resolve
  }

  testWidgets('shows the current privacy toggle state from AuthBloc', (tester) async {
    await pumpSettingsScreen(tester);

    final privateSwitch = tester.widget<Switch>(find.byType(Switch).first);
    final dmsSwitch = tester.widget<Switch>(find.byType(Switch).last);
    expect(privateSwitch.value, isFalse);
    expect(dmsSwitch.value, isTrue);
  });

  testWidgets('toggling private account patches /users/me and updates AuthBloc', (tester) async {
    when(() => api.patch('/users/me', body: {'private_account': true}))
      .thenAnswer((_) async => {'user': {
        'id': 'u1', 'handle': 'testuser', 'displayName': 'Test User',
        'privateAccount': true, 'allowDms': true, 'uiLanguage': 'en',
      }});

    await pumpSettingsScreen(tester);
    await tester.tap(find.byType(Switch).first);
    await tester.pump();

    verify(() => api.patch('/users/me', body: {'private_account': true})).called(1);
    verify(() => authBloc.add(any(that: isA<AuthUpdateUser>()))).called(1);
  });

  testWidgets('logging out dispatches AuthLogout', (tester) async {
    await pumpSettingsScreen(tester);
    // "Log out" sits at the bottom of a long ListView — off-screen sections
    // aren't mounted into the element tree at all (Flutter only builds
    // within the viewport + cache extent), so it must be scrolled into
    // view before find/tap can see it.
    final scrollable = find.descendant(of: find.byType(ListView), matching: find.byType(Scrollable)).first;
    await tester.scrollUntilVisible(find.text('Log out'), 300, scrollable: scrollable);
    // scrollUntilVisible stops as soon as the widget is merely mounted in
    // the tree, which can still leave it a few pixels past the viewport
    // edge (not truly hit-testable) — ensureVisible finishes the job.
    await tester.ensureVisible(find.text('Log out'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Log out'));

    verify(() => authBloc.add(const AuthLogout())).called(1);
  });

  testWidgets('adding a muted word posts it and reloads the list', (tester) async {
    when(() => api.post('/users/me/muted-words', body: {'word': 'spoiler'}))
      .thenAnswer((_) async => {'word': {'id': 'w1', 'word': 'spoiler'}});

    await pumpSettingsScreen(tester);
    await tester.scrollUntilVisible(
      find.widgetWithText(TextField, 'Add a word or phrase'), 300, scrollable: find.descendant(of: find.byType(ListView), matching: find.byType(Scrollable)).first);
    await tester.enterText(find.widgetWithText(TextField, 'Add a word or phrase'), 'spoiler');

    // Second stub takes over once the word has been "added" server-side.
    when(() => api.get('/users/me/muted-words'))
      .thenAnswer((_) async => {'words': [{'id': 'w1', 'word': 'spoiler'}]});

    await tester.tap(find.text('Add'));
    await tester.pumpAndSettle();

    verify(() => api.post('/users/me/muted-words', body: {'word': 'spoiler'})).called(1);
    expect(find.text('spoiler'), findsOneWidget);
  });
}
