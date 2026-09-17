// FeedCreateVibe used to fail completely silently on error — the catch
// block had a "propagate to UI via a separate event if needed" comment and
// then did nothing. This tests the fix: FeedBloc.createResults, a side
// channel deliberately separate from FeedState so a failed post can never
// make BlocBuilder<FeedBloc, FeedState> briefly render the whole feed as
// empty (see the comment on CreateVibeResult itself).
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:vylapp/core/network/api_client.dart';
import 'package:vylapp/core/network/network_exceptions.dart';
import 'package:vylapp/core/utils/input_sanitiser.dart';
import 'package:vylapp/features/feed/presentation/bloc/feed_bloc.dart';

class MockApiClient extends Mock implements ApiClient {}

void main() {
  late MockApiClient api;
  late InputSanitiser sanitiser;

  setUp(() {
    api = MockApiClient();
    sanitiser = InputSanitiser();
  });

  FeedBloc build() => FeedBloc(api, sanitiser);

  group('FeedCreateVibe', () {
    blocTest<FeedBloc, FeedState>(
      'posts the vibe and reports success on createResults',
      setUp: () => when(() => api.post(any(), body: any(named: 'body')))
        .thenAnswer((_) async => {'vibe': {
          'id': 'v1', 'content': 'hello world', 'category': 'TECH_VIBES', 'tags': [],
          'counts': {'likes': 0, 'reposts': 0, 'replies': 0, 'views': 0, 'bookmarks': 0},
          'createdAt': '2026-01-01T00:00:00.000Z', 'author': {'id': 'u1', 'handle': 'u1', 'displayName': 'U1'},
        }}),
      build: build,
      seed: () => const FeedLoaded(vibes: []),
      act: (bloc) async {
        final results = <CreateVibeResult>[];
        final sub = bloc.createResults.listen(results.add);
        bloc.add(const FeedCreateVibe(content: 'hello world', category: 'TECH_VIBES'));
        await Future<void>.delayed(Duration.zero);
        await sub.cancel();
        expect(results, hasLength(1));
        expect(results.single.success, isTrue);
      },
      expect: () => [isA<FeedLoaded>().having((s) => s.vibes.length, 'vibes.length', 1)],
    );

    blocTest<FeedBloc, FeedState>(
      'reports failure on createResults without touching FeedState when content is invalid',
      build: build,
      seed: () => const FeedLoaded(vibes: []),
      act: (bloc) async {
        final results = <CreateVibeResult>[];
        final sub = bloc.createResults.listen(results.add);
        bloc.add(const FeedCreateVibe(content: '', category: 'TECH_VIBES'));
        await Future<void>.delayed(Duration.zero);
        await sub.cancel();
        expect(results, hasLength(1));
        expect(results.single.success, isFalse);
        verifyNever(() => api.post(any(), body: any(named: 'body')));
      },
      expect: () => [], // no state change — the empty feed stays exactly as it was
    );

    blocTest<FeedBloc, FeedState>(
      'reports the server error message on createResults when the post fails',
      setUp: () => when(() => api.post(any(), body: any(named: 'body')))
        .thenThrow(const NetworkException.server('Content blocked')),
      build: build,
      seed: () => const FeedLoaded(vibes: []),
      act: (bloc) async {
        final results = <CreateVibeResult>[];
        final sub = bloc.createResults.listen(results.add);
        bloc.add(const FeedCreateVibe(content: 'hello world', category: 'TECH_VIBES'));
        await Future<void>.delayed(Duration.zero);
        await sub.cancel();
        expect(results, hasLength(1));
        expect(results.single.success, isFalse);
        expect(results.single.error, 'Content blocked');
      },
      expect: () => [],
    );
  });
}
