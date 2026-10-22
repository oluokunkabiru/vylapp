<?php
// ════════════════════════════════════════════════════════════════════════════
//  API REVERSE PROXY — /api/* on the frontend's domain → backend
//
//  Why: the frontend and backend live on different sites, which makes the
//  backend's auth cookies third-party. Mobile browsers (all of iOS, Brave,
//  Firefox strict, Samsung Internet) block those outright, so login
//  "succeeded" and every following call 401'd. Serving the API from the
//  frontend's own domain makes the cookies first-party.
//
//  Why PHP and not mod_rewrite [P]: shared hosting doesn't allow
//  SSLProxyEngine, which Apache needs to proxy to an https backend (that's
//  the 500 the [P] rule produced). public/.htaccess rewrites /api/* here.
//
//  Socket.io deliberately does NOT go through here — PHP can't proxy
//  websockets, and long-polling would pin one PHP worker per connected
//  user, exhausting a shared host's process limit. See lib/socket.js.
// ════════════════════════════════════════════════════════════════════════════

const UPSTREAM = 'https://vylapp.miglomicrofix.com.ng';
const PREFIX = '/api';

// Request headers worth forwarding. Everything else (Host, Origin, hop-by-hop
// headers, Accept-Encoding — curl negotiates its own) is dropped.
const FORWARD_REQUEST_HEADERS = [
    'accept', 'accept-language', 'content-type', 'cookie', 'authorization',
    'user-agent', 'x-csrf-token', 'x-platform', 'x-requested-with', 'referer',
];

// Response headers that describe the upstream connection, not the content.
const DROP_RESPONSE_HEADERS = [
    'connection', 'keep-alive', 'transfer-encoding', 'content-encoding',
    'content-length', 'upgrade', 'proxy-connection', 'strict-transport-security',
];

set_time_limit(180);
while (ob_get_level() > 0) ob_end_clean();

function fail_upstream(int $status, string $message): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['ok' => false, 'error' => ['message' => $message]]);
    exit;
}

// ── Target URL ───────────────────────────────────────────────────────────────
// REQUEST_URI is the original browser URL (/api/auth/me?x=1), untouched by
// the .htaccess rewrite. UPSTREAM is prefixed to a path that always starts
// with "/", so the request can never be steered to a different host.
$uri = $_SERVER['REQUEST_URI'] ?? '/';
if (strncmp($uri, PREFIX . '/', strlen(PREFIX) + 1) !== 0) fail_upstream(404, 'Not found');
$path = substr($uri, strlen(PREFIX));
if (preg_match('/[\r\n\0]/', $path)) fail_upstream(400, 'Bad request');

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// ── Request headers ──────────────────────────────────────────────────────────
$incoming = [];
foreach ($_SERVER as $key => $value) {
    if (strncmp($key, 'HTTP_', 5) === 0) {
        $incoming[strtolower(str_replace('_', '-', substr($key, 5)))] = $value;
    }
}
// CGI/FPM expose these without the HTTP_ prefix.
if (isset($_SERVER['CONTENT_TYPE'])) $incoming['content-type'] = $_SERVER['CONTENT_TYPE'];
if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) && !isset($incoming['authorization'])) {
    $incoming['authorization'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
}

$headers = [];
foreach (FORWARD_REQUEST_HEADERS as $name) {
    if (isset($incoming[$name]) && $incoming[$name] !== '') $headers[$name] = $incoming[$name];
}
$clientIp = $_SERVER['REMOTE_ADDR'] ?? '';
$priorXff = $incoming['x-forwarded-for'] ?? '';
$headers['x-forwarded-for'] = $priorXff !== '' ? "$priorXff, $clientIp" : $clientIp;
$headers['x-forwarded-proto'] = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$headers['x-forwarded-host'] = $_SERVER['HTTP_HOST'] ?? '';
$headers['expect'] = ''; // no "100-continue" round trip on large uploads

// ── Request body ─────────────────────────────────────────────────────────────
$ch = curl_init(UPSTREAM . $path);
$opts = [
    CURLOPT_CUSTOMREQUEST  => $method,
    CURLOPT_FOLLOWLOCATION => false, // redirects (OAuth) go back to the browser as-is
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT        => 170,
    CURLOPT_ENCODING       => '', // accept compressed upstream, hand the browser plain
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
];

if (!in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
    $input = fopen('php://input', 'rb');
    $length = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : -1;

    $isMultipart = stripos($headers['content-type'] ?? '', 'multipart/form-data') === 0;
    if ($isMultipart && (!empty($_FILES) || !empty($_POST))) {
        // PHP already consumed a multipart body into $_POST/$_FILES (the
        // .user.ini / api/.htaccess setting that prevents this wasn't
        // honoured by this host). Rebuild it; curl generates a fresh
        // boundary, so the original Content-Type must not be forwarded.
        $fields = [];
        foreach ($_POST as $k => $v) {
            if (is_array($v)) { foreach ($v as $i => $vv) $fields["{$k}[{$i}]"] = $vv; }
            else $fields[$k] = $v;
        }
        foreach ($_FILES as $k => $f) {
            if (is_array($f['tmp_name'])) {
                foreach ($f['tmp_name'] as $i => $tmp) {
                    if ($f['error'][$i] === UPLOAD_ERR_OK) $fields["{$k}[{$i}]"] = new CURLFile($tmp, $f['type'][$i], $f['name'][$i]);
                }
            } elseif ($f['error'] === UPLOAD_ERR_OK) {
                $fields[$k] = new CURLFile($f['tmp_name'], $f['type'], $f['name']);
            }
        }
        unset($headers['content-type']);
        $opts[CURLOPT_POSTFIELDS] = $fields;
    } else {
        // Stream the raw body straight through — never buffered in memory.
        $opts[CURLOPT_UPLOAD] = true;
        $opts[CURLOPT_INFILE] = $input;
        if ($length >= 0) $opts[CURLOPT_INFILESIZE] = $length;
    }
}

$headerLines = [];
foreach ($headers as $name => $value) $headerLines[] = "$name: $value";
$opts[CURLOPT_HTTPHEADER] = $headerLines;

// ── Response: relay status + headers as they arrive, then stream the body ───
$opts[CURLOPT_HEADERFUNCTION] = function ($ch, string $line): int {
    $trimmed = trim($line);
    if (preg_match('#^HTTP/\S+\s+(\d{3})#', $trimmed, $m)) {
        $status = (int)$m[1];
        if ($status >= 200) http_response_code($status); // skip 1xx interim responses
    } elseif ($trimmed !== '' && strpos($trimmed, ':') !== false) {
        $name = strtolower(trim(strstr($trimmed, ':', true)));
        if (!in_array($name, DROP_RESPONSE_HEADERS, true)) {
            header($trimmed, false); // false: keep every Set-Cookie, not just the last
        }
    }
    return strlen($line);
};
$opts[CURLOPT_WRITEFUNCTION] = function ($ch, string $chunk): int {
    echo $chunk;
    flush();
    return strlen($chunk);
};

curl_setopt_array($ch, $opts);
$ok = curl_exec($ch);

if ($ok === false && !headers_sent()) {
    $errno = curl_errno($ch);
    fail_upstream(
        $errno === CURLE_OPERATION_TIMEDOUT ? 504 : 502,
        $errno === CURLE_OPERATION_TIMEDOUT ? 'Upstream timed out' : 'Upstream unavailable'
    );
}
