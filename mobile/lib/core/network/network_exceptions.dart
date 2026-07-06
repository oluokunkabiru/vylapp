/// Typed network exceptions. Feature-layer code catches [NetworkException],
/// never raw [DioException] or [Exception]. This keeps error handling
/// consistent and testable.
class NetworkException implements Exception {
  final String message;
  final int? statusCode;
  final NetworkErrorType type;

  const NetworkException({
    required this.message,
    required this.type,
    this.statusCode,
  });

  const NetworkException.server(String msg, {int? statusCode})
    : this(message: msg, type: NetworkErrorType.server, statusCode: statusCode);

  const NetworkException.noConnection()
    : this(message: 'No internet connection. Check your network and try again.', type: NetworkErrorType.noConnection);

  const NetworkException.timeout()
    : this(message: 'Request timed out. Please try again.', type: NetworkErrorType.timeout);

  const NetworkException.unauthorised()
    : this(message: 'Your session has expired. Please log in again.', type: NetworkErrorType.unauthorised, statusCode: 401);

  const NetworkException.forbidden()
    : this(message: 'You do not have permission to do that.', type: NetworkErrorType.forbidden, statusCode: 403);

  const NetworkException.notFound()
    : this(message: 'The requested resource was not found.', type: NetworkErrorType.notFound, statusCode: 404);

  const NetworkException.empty()
    : this(message: 'The server returned an empty response.', type: NetworkErrorType.server);

  const NetworkException.rateLimit()
    : this(message: 'You are doing that too fast. Please wait a moment.', type: NetworkErrorType.rateLimit, statusCode: 429);

  bool get isNoConnection => type == NetworkErrorType.noConnection;
  bool get isUnauthorised => type == NetworkErrorType.unauthorised;
  bool get isTimeout      => type == NetworkErrorType.timeout;

  @override
  String toString() => 'NetworkException($type): $message';
}

enum NetworkErrorType {
  server,
  noConnection,
  timeout,
  unauthorised,
  forbidden,
  notFound,
  rateLimit,
}
