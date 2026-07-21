abstract final class ApiConstants {
  // ════════════════════════════════════════════════════════════════════════
  //  All values come from .env (development) or .env.production (release)
  //  via --dart-define-from-file at build/run time.
  //
  //  Development:  flutter run --dart-define-from-file=.env
  //  Release:      flutter build apk --dart-define-from-file=.env.production
  //
  //  String.fromEnvironment() reads values baked in at compile time.
  //  They are NOT readable at runtime by other apps on the device —
  //  safer than a .env file read from the filesystem.
  // ════════════════════════════════════════════════════════════════════════

  // ── URLs ─────────────────────────────────────────────────────────────────
  static const String baseUrl   = String.fromEnvironment(
    'VYLAPP_API_URL', defaultValue: 'http://localhost:4000');
  static const String socketUrl = String.fromEnvironment(
    'VYLAPP_SOCKET_URL', defaultValue: 'http://localhost:4000');

  // ── App identity ──────────────────────────────────────────────────────────
  static const String appName    = String.fromEnvironment('VYLAPP_APP_NAME',    defaultValue: 'Vylapp');
  static const String appVersion = String.fromEnvironment('VYLAPP_APP_VERSION', defaultValue: '1.0.0');
  static const String appEnv     = String.fromEnvironment('VYLAPP_ENV',         defaultValue: 'development');
  static bool get isProduction   => appEnv == 'production';

  // ── Brand colours (used when brand tokens need to be read at runtime) ────
  static const String brandViolet = String.fromEnvironment('VYLAPP_BRAND_VIOLET', defaultValue: '#7C3AED');
  static const String brandGreen  = String.fromEnvironment('VYLAPP_BRAND_GREEN',  defaultValue: '#10F5A0');
  static const String brandCoral  = String.fromEnvironment('VYLAPP_BRAND_CORAL',  defaultValue: '#FF6B6B');
  static const String brandAmber  = String.fromEnvironment('VYLAPP_BRAND_AMBER',  defaultValue: '#FFB830');
  static const String brandSky    = String.fromEnvironment('VYLAPP_BRAND_SKY',    defaultValue: '#38BDF8');
  static const String brandBg     = String.fromEnvironment('VYLAPP_BRAND_BG',     defaultValue: '#08070F');

  // ── Supported languages ───────────────────────────────────────────────────
  static const String _rawLangs    = String.fromEnvironment('VYLAPP_SUPPORTED_LANGS', defaultValue: 'en,yo,ha,sw,ig,am,ar,fr,es,pt');
  static const String defaultLang  = String.fromEnvironment('VYLAPP_DEFAULT_LANG',    defaultValue: 'en');
  static List<String> get supportedLangs => _rawLangs.split(',').map((l) => l.trim()).toList();

  // ── Timeouts ──────────────────────────────────────────────────────────────
  static const int _connectSecs = int.fromEnvironment('VYLAPP_CONNECT_TIMEOUT_SECONDS', defaultValue: 15);
  static const int _receiveSecs = int.fromEnvironment('VYLAPP_RECEIVE_TIMEOUT_SECONDS', defaultValue: 30);
  static const Duration connectTimeout = Duration(seconds: _connectSecs);
  static const Duration receiveTimeout = Duration(seconds: _receiveSecs);
  static const Duration sendTimeout    = Duration(seconds: _receiveSecs);
  static const Duration accessTokenRefreshBuffer = Duration(minutes: 2);

  // ── Rate limits (client-side guards) ─────────────────────────────────────
  static const Duration translationRateLimit = Duration(seconds: 3);
  static const Duration autopilotRateLimit   = Duration(seconds: 5);
  static const Duration loginRateLimit       = Duration(seconds: 1);

  // ── Content limits ────────────────────────────────────────────────────────
  static const int maxVibeLength     = int.fromEnvironment('VYLAPP_MAX_VIBE_LENGTH',     defaultValue: 500);
  static const int maxCommentLength  = int.fromEnvironment('VYLAPP_MAX_COMMENT_LENGTH',  defaultValue: 280);
  static const int maxMessageLength  = 500;
  static const int maxHandleLength   = 20;
  static const int maxPasswordLength = 128;
  static const int minPasswordLength = 8;
  static const int maxEmailLength    = 254;
  static const int maxDisplayNameLen = 50;
  static const int maxBioLength      = 160;

  // ── Pagination ────────────────────────────────────────────────────────────
  static const int feedPageSize          = int.fromEnvironment('VYLAPP_FEED_PAGE_SIZE',   defaultValue: 10);
  static const int forumPageSize         = int.fromEnvironment('VYLAPP_FORUM_PAGE_SIZE',  defaultValue: 20);
  static const int messagesPageSize      = 50;
  static const int notificationsPageSize = 30;
  static const int leaderboardPageSize   = 20;

  // ── Feature flags ─────────────────────────────────────────────────────────
  static const bool featureLearn     = bool.fromEnvironment('VYLAPP_FEATURE_LEARN',     defaultValue: true);
  static const bool featureForum     = bool.fromEnvironment('VYLAPP_FEATURE_FORUM',     defaultValue: true);
  static const bool featureSpaces    = bool.fromEnvironment('VYLAPP_FEATURE_SPACES',    defaultValue: true);
  static const bool featureCreator   = bool.fromEnvironment('VYLAPP_FEATURE_CREATOR',   defaultValue: true);
  static const bool featureAutopilot = bool.fromEnvironment('VYLAPP_FEATURE_AUTOPILOT', defaultValue: true);
  static const bool featureRaven     = bool.fromEnvironment('VYLAPP_FEATURE_RAVEN',     defaultValue: true);

  // ── Certificate pinning ───────────────────────────────────────────────────
  // Read from env — never hardcode in source. Replace REPLACE_WITH_* in .env.production
  static const String certPinPrimary = String.fromEnvironment('VYLAPP_CERTIFICATE_PIN_PRIMARY', defaultValue: '');
  static const String certPinBackup  = String.fromEnvironment('VYLAPP_CERTIFICATE_PIN_BACKUP',  defaultValue: '');

  // ── LiveKit ───────────────────────────────────────────────────────────────
  static const String livekitUrl = String.fromEnvironment('VYLAPP_LIVEKIT_URL', defaultValue: '');

  // ── API route constants ───────────────────────────────────────────────────
  static const String register = '/auth/register';
  static const String login    = '/auth/login';
  static const String refresh  = '/auth/refresh';
  static const String logout   = '/auth/logout';
  static const String me       = '/auth/me';

  static const String feed              = '/vibes/feed';
  static const String createVibe        = '/vibes';
  static String vibeById(String id)     => '/vibes/$id';
  static String likeVibe(String id)     => '/vibes/$id/like';
  static String repostVibe(String id)   => '/vibes/$id/repost';
  static String bookmarkVibe(String id) => '/vibes/$id/bookmark';

  static const String spaces               = '/spaces';
  static String joinSpace(String id)       => '/spaces/$id/join';
  static String leaveSpace(String id)      => '/spaces/$id/leave';
  static String remindSpace(String id)     => '/spaces/$id/remind';
  static String tipSpace(String id)        => '/spaces/$id/tip';

  static const String conversations                     = '/messages/conversations';
  static const String conversationDm                    = '/messages/conversations/dm';
  static String conversationMessages(String id)         => '/messages/conversations/$id/messages';

  static const String notifications      = '/notifications';
  static const String readAllNotifs      = '/notifications/read-all';
  static const String notificationDigest = '/notifications/digest';
  static String markNotifRead(String id) => '/notifications/$id/read';

  static String translateVibe(String id) => '/translate/vibes/$id';

  static const String myEarnings       = '/creator/me/earnings';
  static const String payoutRequest    = '/creator/me/payout-request';
  static String creatorProfile(String userId) => '/creator/$userId/profile';

  static const String autopilotConfig  = '/autopilot/config';
  static const String autopilotRun     = '/autopilot/run';
  static const String autopilotRuns    = '/autopilot/runs';

  static const String ravenMe          = '/raven/me';
  static const String ravenLeaderboard = '/raven/leaderboard';

  static const String search           = '/search';
  static const String trendingTopics   = '/search/trending/topics';

  static const String plans            = '/subscriptions/plans';
  static const String upgrade          = '/subscriptions/upgrade';

  static String userByHandle(String h)  => '/users/$h';
  static String connectUser(String id)  => '/users/$id/connect';

  static const String learnCourses     = '/learn/courses';
  static String courseById(String id)  => '/learn/courses/$id';
  static String enrollCourse(String id)=> '/learn/courses/$id/enrol';
  static const String myEnrolments     = '/learn/me/enrolments';
  static const String myCertificates   = '/learn/me/certificates';

  static const String forumCategories  = '/forum/categories';
  static String forumThreads(String s) => '/forum/categories/$s/threads';
  static String threadById(String id)  => '/forum/threads/$id';
  static const String createThread     = '/forum/threads';
}
