// Mocked FeedBloc via bloc_test's MockBloc — the screen only needs
// createResults (a plain getter backed by a real StreamController, not
// mockable via whenListen) and add(), so the mock's real createResults
// getter is stubbed to return a real, controllable stream.
import 'dart:async';
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';
import 'package:vylapp/core/di/injection.dart';
import 'package:vylapp/core/utils/input_sanitiser.dart';
import 'package:vylapp/features/feed/presentation/bloc/feed_bloc.dart';
import 'package:vylapp/features/feed/presentation/screens/compose_screen.dart';

class MockFeedBloc extends MockBloc<FeedEvent, FeedState> implements FeedBloc {}

void main() {
  late MockFeedBloc feedBloc;
  late StreamController<CreateVibeResult> results;

  setUpAll(() {
    registerFallbackValue(const FeedCreateVibe(content: '', category: 'TECH_VIBES'));
  });

  setUp(() {
    feedBloc = MockFeedBloc();
    results = StreamController<CreateVibeResult>.broadcast();
    when(() => feedBloc.state).thenReturn(const FeedLoaded(vibes: []));
    when(() => feedBloc.createResults).thenAnswer((_) => results.stream);
    getIt.registerSingleton<InputSanitiser>(InputSanitiser());
  });

  tearDown(() async {
    await results.close();
    await getIt.reset();
  });

  Future<void> pumpCompose(WidgetTester tester) => tester.pumpWidget(MaterialApp(
    home: BlocProvider<FeedBloc>.value(value: feedBloc, child: const ComposeScreen()),
  ));

  testWidgets('Share is disabled until there is content', (tester) async {
    await pumpCompose(tester);
    final shareButton = tester.widget<TextButton>(find.widgetWithText(TextButton, 'Share'));
    expect(shareButton.onPressed, isNull);

    await tester.enterText(find.byType(TextField), 'hello');
    await tester.pump();

    final enabledButton = tester.widget<TextButton>(find.widgetWithText(TextButton, 'Share'));
    expect(enabledButton.onPressed, isNotNull);
  });

  testWidgets('tapping Share dispatches FeedCreateVibe with the selected category', (tester) async {
    await pumpCompose(tester);
    await tester.enterText(find.byType(TextField), 'hello world');
    await tester.tap(find.text('Global Connect'));
    await tester.pump();
    await tester.tap(find.text('Share'));

    verify(() => feedBloc.add(const FeedCreateVibe(content: 'hello world', category: 'GLOBAL_CONNECT'))).called(1);
  });

  testWidgets('pops the screen when createResults reports success', (tester) async {
    // ComposeScreen calls context.pop(), go_router's extension for
    // GoRouter.of(context).pop() — it needs a real GoRouter ancestor, a
    // bare Navigator/MaterialPageRoute isn't enough and would throw.
    final router = GoRouter(initialLocation: '/', routes: [
      GoRoute(path: '/', builder: (_, __) => const Scaffold(body: Text('home'))),
      GoRoute(path: '/compose', builder: (_, __) =>
        BlocProvider<FeedBloc>.value(value: feedBloc, child: const ComposeScreen())),
    ]);
    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    // A router that starts already at /compose has nothing below it in the
    // stack, so context.pop() would be a no-op — push it like the app does.
    router.push('/compose');
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'hello world');
    await tester.pump();
    await tester.tap(find.text('Share'));
    await tester.pump();
    expect(find.byType(ComposeScreen), findsOneWidget);

    results.add(const CreateVibeResult.success());
    await tester.pumpAndSettle();

    expect(find.byType(ComposeScreen), findsNothing);
  });

  testWidgets('shows the server error and stays open on failure', (tester) async {
    await pumpCompose(tester);
    await tester.enterText(find.byType(TextField), 'hello world');
    await tester.pump();
    await tester.tap(find.text('Share'));
    await tester.pump();

    results.add(const CreateVibeResult.failure('Content blocked'));
    await tester.pumpAndSettle();

    expect(find.text('Content blocked'), findsOneWidget);
    expect(find.byType(ComposeScreen), findsOneWidget);
  });
}
