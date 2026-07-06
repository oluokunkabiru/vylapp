import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:injectable/injectable.dart';
import '../../data/models/vibe_model.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/network_exceptions.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/utils/input_sanitiser.dart';

// ── Events ────────────────────────────────────────────────────────────────────
abstract class FeedEvent extends Equatable {
  const FeedEvent();
  @override List<Object?> get props => [];
}

class FeedLoad extends FeedEvent { const FeedLoad(); }
class FeedRefresh extends FeedEvent { const FeedRefresh(); }
class FeedLoadMore extends FeedEvent { const FeedLoadMore(); }

class FeedToggleLike extends FeedEvent {
  final String vibeId;
  const FeedToggleLike(this.vibeId);
  @override List<Object?> get props => [vibeId];
}

class FeedToggleSave extends FeedEvent {
  final String vibeId;
  const FeedToggleSave(this.vibeId);
  @override List<Object?> get props => [vibeId];
}

class FeedTranslateVibe extends FeedEvent {
  final String vibeId;
  final String targetLang;
  const FeedTranslateVibe({required this.vibeId, required this.targetLang});
  @override List<Object?> get props => [vibeId, targetLang];
}

class FeedCreateVibe extends FeedEvent {
  final String content;
  final String category;
  final List<String> tags;
  const FeedCreateVibe({required this.content, required this.category, this.tags = const []});
  @override List<Object?> get props => [content, category];
}

// ── States ────────────────────────────────────────────────────────────────────
abstract class FeedState extends Equatable {
  const FeedState();
  @override List<Object?> get props => [];
}

class FeedInitial    extends FeedState { const FeedInitial(); }
class FeedLoading    extends FeedState { const FeedLoading(); }
class FeedLoadingMore extends FeedState {
  final List<VibeModel> vibes;
  const FeedLoadingMore(this.vibes);
  @override List<Object?> get props => [vibes];
}
class FeedLoaded extends FeedState {
  final List<VibeModel> vibes;
  final bool hasMore;
  final int  page;
  const FeedLoaded({required this.vibes, this.hasMore = true, this.page = 0});
  @override List<Object?> get props => [vibes, hasMore, page];
  FeedLoaded copyWith({List<VibeModel>? vibes, bool? hasMore, int? page}) =>
    FeedLoaded(
      vibes:   vibes   ?? this.vibes,
      hasMore: hasMore ?? this.hasMore,
      page:    page    ?? this.page,
    );
}
class FeedError extends FeedState {
  final String message;
  const FeedError(this.message);
  @override List<Object?> get props => [message];
}

// ── BLoC ──────────────────────────────────────────────────────────────────────
@injectable
class FeedBloc extends Bloc<FeedEvent, FeedState> {
  FeedBloc(this._api, this._sanitiser) : super(const FeedInitial()) {
    on<FeedLoad>(_onLoad);
    on<FeedRefresh>(_onRefresh);
    on<FeedLoadMore>(_onLoadMore);
    on<FeedToggleLike>(_onToggleLike);
    on<FeedToggleSave>(_onToggleSave);
    on<FeedTranslateVibe>(_onTranslate);
    on<FeedCreateVibe>(_onCreate);
  }

  final ApiClient      _api;
  final InputSanitiser _sanitiser;

  Future<void> _onLoad(FeedLoad event, Emitter<FeedState> emit) async {
    emit(const FeedLoading());
    await _loadPage(0, emit, replace: true);
  }

  Future<void> _onRefresh(FeedRefresh event, Emitter<FeedState> emit) async {
    await _loadPage(0, emit, replace: true);
  }

  Future<void> _onLoadMore(FeedLoadMore event, Emitter<FeedState> emit) async {
    final current = state;
    if (current is! FeedLoaded || !current.hasMore) return;
    emit(FeedLoadingMore(current.vibes));
    await _loadPage(current.page + 1, emit, replace: false);
  }

  Future<void> _loadPage(
    int page,
    Emitter<FeedState> emit, {
    required bool replace,
  }) async {
    try {
      final data = await _api.get(
        ApiConstants.feed,
        queryParameters: {'page': page, 'pageSize': ApiConstants.feedPageSize},
      );
      final incoming = (data['vibes'] as List? ?? [])
        .map((v) => VibeModel.fromJson(v as Map<String, dynamic>))
        .toList();

      final current = state is FeedLoaded ? (state as FeedLoaded).vibes : <VibeModel>[];
      final merged  = replace ? incoming : [...current, ...incoming];
      emit(FeedLoaded(
        vibes:   merged,
        hasMore: incoming.length == ApiConstants.feedPageSize,
        page:    page,
      ));
    } on NetworkException catch (e) {
      emit(FeedError(e.message));
    } catch (_) {
      emit(const FeedError('Failed to load feed. Pull down to retry.'));
    }
  }

  Future<void> _onToggleLike(FeedToggleLike event, Emitter<FeedState> emit) async {
    final current = state;
    if (current is! FeedLoaded) return;

    // ── Optimistic update ──────────────────────────────────────────────────
    final updatedVibes = current.vibes.map((v) {
      if (v.id != event.vibeId) return v;
      final wasLiked = v.viewer?.liked ?? false;
      return v.copyWith(
        counts: v.counts.copyWith(likes: v.counts.likes + (wasLiked ? -1 : 1)),
        viewer: (v.viewer ?? const ViewerState()).copyWith(liked: !wasLiked),
      );
    }).toList();
    emit(current.copyWith(vibes: updatedVibes));

    // ── Server sync ────────────────────────────────────────────────────────
    try {
      final wasLiked = current.vibes
        .firstWhere((v) => v.id == event.vibeId).viewer?.liked ?? false;
      if (wasLiked) {
        await _api.delete(ApiConstants.likeVibe(event.vibeId));
      } else {
        await _api.post(ApiConstants.likeVibe(event.vibeId));
      }
    } catch (_) {
      // Rollback optimistic update on failure
      emit(current);
    }
  }

  Future<void> _onToggleSave(FeedToggleSave event, Emitter<FeedState> emit) async {
    final current = state;
    if (current is! FeedLoaded) return;

    final updatedVibes = current.vibes.map((v) {
      if (v.id != event.vibeId) return v;
      final wasSaved = v.viewer?.saved ?? false;
      return v.copyWith(
        viewer: (v.viewer ?? const ViewerState()).copyWith(saved: !wasSaved),
      );
    }).toList();
    emit(current.copyWith(vibes: updatedVibes));

    try {
      final wasSaved = current.vibes
        .firstWhere((v) => v.id == event.vibeId).viewer?.saved ?? false;
      if (wasSaved) {
        await _api.delete(ApiConstants.bookmarkVibe(event.vibeId));
      } else {
        await _api.post(ApiConstants.bookmarkVibe(event.vibeId));
      }
    } catch (_) {
      emit(current);
    }
  }

  Future<void> _onTranslate(FeedTranslateVibe event, Emitter<FeedState> emit) async {
    final current = state;
    if (current is! FeedLoaded) return;

    // Rate limit translation calls
    if (_sanitiser.isRateLimited(
      'translate_${event.vibeId}', ApiConstants.translationRateLimit)) {
      return;
    }

    // Check if we already have this translation cached in the model
    final vibe = current.vibes.firstWhere(
      (v) => v.id == event.vibeId, orElse: () => current.vibes.first);
    if (vibe.translationFor(event.targetLang) != null) return;

    try {
      final data = await _api.post(
        ApiConstants.translateVibe(event.vibeId),
        body: {'toLang': event.targetLang},
      );
      final translatedText = data['text'] as String?;
      if (translatedText == null) return;

      final updatedVibes = current.vibes.map((v) {
        if (v.id != event.vibeId) return v;
        return v.withTranslation(event.targetLang, translatedText);
      }).toList();
      emit(current.copyWith(vibes: updatedVibes));
    } catch (_) {
      // Translation failure is non-fatal — UI shows the original text
    }
  }

  Future<void> _onCreate(FeedCreateVibe event, Emitter<FeedState> emit) async {
    final validation = _sanitiser.validateVibe(event.content);
    if (!validation.isValid) return; // Caller shows the error

    try {
      final clean = _sanitiser.sanitiseVibe(event.content);
      final tags  = RegExp(r'#(\w+)').allMatches(clean)
        .map((m) => m.group(1)!.toLowerCase())
        .toList();

      final data = await _api.post(ApiConstants.createVibe, body: {
        'content':  clean,
        'category': event.category,
        'tags':     tags,
      });
      final newVibe = VibeModel.fromJson(data['vibe'] as Map<String, dynamic>);

      final current = state;
      if (current is FeedLoaded) {
        emit(current.copyWith(vibes: [newVibe, ...current.vibes]));
      }
    } on NetworkException catch (e) {
      // Propagate to UI via a separate event if needed
    } catch (_) {}
  }
}
