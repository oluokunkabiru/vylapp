import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';
import '../constants/api_constants.dart';
import '../security/token_service.dart';
import 'network_exceptions.dart';

/// Central Dio HTTP client.
///
/// Responsibilities:
///   1. Inject Bearer token on every authenticated request.
///   2. Intercept 401 responses, refresh the access token silently,
///      and retry the original request once — transparently to callers.
///   3. Transform all error responses into typed [NetworkException]s so
///      feature code never touches raw DioException strings.
///   4. Enforce timeouts consistently.
///
/// Certificate pinning: In production, add your server's SHA-256 fingerprint
/// to the AndroidNetworkSecurityConfig (android/app/src/main/res/xml/
/// network_security_config.xml) and iOS ATS config. Dio does not expose a
/// native pinning API — pinning is enforced at the OS network layer, which
/// is the correct approach (immune to Flutter/Dart version changes).
@lazySingleton
class ApiClient {
  ApiClient(this._tokenService) {
    _dio = Dio(
      BaseOptions(
        baseUrl:        ApiConstants.baseUrl,
        connectTimeout: ApiConstants.connectTimeout,
        receiveTimeout: ApiConstants.receiveTimeout,
        sendTimeout:    ApiConstants.sendTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept':       'application/json',
          'X-Platform':   'flutter',
        },
        validateStatus: (status) => status != null && status < 500,
      ),
    );
    _dio.interceptors.add(_AuthInterceptor(_tokenService, _dio));
    _dio.interceptors.add(_ErrorInterceptor());
  }

  late final Dio _dio;
  final TokenService _tokenService;

  // ── Public API ─────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    bool requiresAuth = true,
  }) async {
    final resp = await _dio.get<Map<String, dynamic>>(
      path,
      queryParameters: queryParameters,
      options: Options(extra: {'requiresAuth': requiresAuth}),
    );
    return _unwrap(resp);
  }

  Future<Map<String, dynamic>> post(
    String path, {
    dynamic body,
    bool requiresAuth = true,
  }) async {
    final resp = await _dio.post<Map<String, dynamic>>(
      path,
      data: body,
      options: Options(extra: {'requiresAuth': requiresAuth}),
    );
    return _unwrap(resp);
  }

  Future<Map<String, dynamic>> patch(
    String path, {
    dynamic body,
    bool requiresAuth = true,
  }) async {
    final resp = await _dio.patch<Map<String, dynamic>>(
      path,
      data: body,
      options: Options(extra: {'requiresAuth': requiresAuth}),
    );
    return _unwrap(resp);
  }

  Future<Map<String, dynamic>> put(
    String path, {
    dynamic body,
    bool requiresAuth = true,
  }) async {
    final resp = await _dio.put<Map<String, dynamic>>(
      path,
      data: body,
      options: Options(extra: {'requiresAuth': requiresAuth}),
    );
    return _unwrap(resp);
  }

  Future<void> delete(String path, {bool requiresAuth = true}) async {
    await _dio.delete<void>(
      path,
      options: Options(extra: {'requiresAuth': requiresAuth}),
    );
  }

  Map<String, dynamic> _unwrap(Response<Map<String, dynamic>> resp) {
    final body = resp.data;
    if (body == null) throw const NetworkException.empty();
    if (body['ok'] == true) return body['data'] as Map<String, dynamic>? ?? {};
    final errorMsg = (body['error'] as Map?)?['message'] as String?
      ?? 'Something went wrong';
    throw NetworkException.server(errorMsg, statusCode: resp.statusCode);
  }
}

// ── Auth interceptor ──────────────────────────────────────────────────────────
class _AuthInterceptor extends Interceptor {
  _AuthInterceptor(this._tokenService, this._dio);

  final TokenService _tokenService;
  final Dio _dio;
  bool _isRefreshing = false;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final requiresAuth = options.extra['requiresAuth'] as bool? ?? true;
    if (!requiresAuth) return handler.next(options);

    final token = await _tokenService.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode != 401) return handler.next(err);
    if (_isRefreshing) return handler.next(err);

    _isRefreshing = true;
    try {
      final refreshToken = await _tokenService.getRefreshToken();
      if (refreshToken == null) {
        await _tokenService.clearAll();
        return handler.next(err);
      }

      final resp = await _dio.post<Map<String, dynamic>>(
        ApiConstants.refresh,
        data: {'refreshToken': refreshToken},
        options: Options(extra: {'requiresAuth': false}),
      );

      final newAccess = resp.data?['data']?['accessToken'] as String?;
      if (newAccess == null) {
        await _tokenService.clearAll();
        return handler.next(err);
      }

      await _tokenService.saveAccessToken(newAccess);

      // Retry the original request with the new token
      err.requestOptions.headers['Authorization'] = 'Bearer $newAccess';
      final retried = await _dio.fetch<Map<String, dynamic>>(err.requestOptions);
      return handler.resolve(retried);
    } catch (_) {
      await _tokenService.clearAll();
      return handler.next(err);
    } finally {
      _isRefreshing = false;
    }
  }
}

// ── Error interceptor ─────────────────────────────────────────────────────────
class _ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.sendTimeout) {
      return handler.reject(
        DioException(
          requestOptions: err.requestOptions,
          error: const NetworkException.timeout(),
        ),
      );
    }
    if (err.type == DioExceptionType.connectionError) {
      return handler.reject(
        DioException(
          requestOptions: err.requestOptions,
          error: const NetworkException.noConnection(),
        ),
      );
    }
    handler.next(err);
  }
}
