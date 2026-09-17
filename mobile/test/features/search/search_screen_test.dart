// Search is a plain StatefulWidget + getIt<ApiClient>() (matching the
// established convention for simple screens — see home_screen_test's
// sibling note in auth_bloc_test.dart), so it's tested by overriding the
// ApiClient registration in GetIt with a mock, rather than a bloc_test.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';
import 'package:mocktail/mocktail.dart';
import 'package:vylapp/core/network/api_client.dart';
import 'package:vylapp/core/di/injection.dart';
import 'package:vylapp/features/search/presentation/screens/search_screen.dart';

class MockApiClient extends Mock implements ApiClient {}

void main() {
  late MockApiClient api;

  setUp(() {
    api = MockApiClient();
    getIt.registerSingleton<ApiClient>(api);
    when(() => api.get('/search/trending/topics', requiresAuth: false))
      .thenAnswer((_) async => {'trending': []});
  });

  tearDown(() => getIt.reset());

  Future<void> pumpSearchScreen(WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: SearchScreen()));
    await tester.pump(); // let initState's trending load resolve
  }

  testWidgets('shows trending topics on load', (tester) async {
    when(() => api.get('/search/trending/topics', requiresAuth: false))
      .thenAnswer((_) async => {'trending': [
        {'tag': 'techvibes', 'heat': 82},
      ]});

    await pumpSearchScreen(tester);

    expect(find.text('TRENDING NOW'), findsOneWidget);
    expect(find.textContaining('techvibes'), findsOneWidget);
  });

  testWidgets('typing a query debounces then shows grouped results', (tester) async {
    when(() => api.get(
      '/search',
      queryParameters: {'q': 'aisha'},
      requiresAuth: false,
    )).thenAnswer((_) async => {
      'results': {
        'users': [
          {'id': 'u1', 'handle': 'aisha.k', 'display_name': 'Aisha Kamara', 'verified': true},
        ],
        'hashtags': [],
        'vibes': [],
      },
    });

    await pumpSearchScreen(tester);
    await tester.enterText(find.byType(TextField), 'aisha');

    // Before the debounce window elapses, no request should have gone out.
    await tester.pump(const Duration(milliseconds: 100));
    verifyNever(() => api.get('/search', queryParameters: any(named: 'queryParameters'), requiresAuth: false));

    // Past the 320ms debounce, then let the request resolve.
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump();

    expect(find.text('PEOPLE'), findsOneWidget);
    expect(find.text('Aisha Kamara'), findsOneWidget);
    expect(find.text('@aisha.k'), findsOneWidget);
  });

  testWidgets('shows the empty state for a query with no matches', (tester) async {
    when(() => api.get(
      '/search',
      queryParameters: {'q': 'zzz'},
      requiresAuth: false,
    )).thenAnswer((_) async => {
      'results': {'users': [], 'hashtags': [], 'vibes': []},
    });

    await pumpSearchScreen(tester);
    await tester.enterText(find.byType(TextField), 'zzz');
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();

    expect(find.text('No results'), findsOneWidget);
    expect(find.textContaining('"zzz"'), findsOneWidget);
  });
}
