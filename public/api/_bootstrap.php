<?php
declare(strict_types=1);

const PA_SESSION_TTL = 604800;
const PA_PASSWORD_ITERATIONS = 210000;
const PA_MAX_ATTEMPTS = 5;
const PA_ATTEMPT_WINDOW = 900;

final class PrivateArchivesApiError extends RuntimeException
{
    public function __construct(public readonly int $status, string $message)
    {
        parent::__construct($message);
    }
}

function pa_run(callable $handler): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private');
    header('X-Content-Type-Options: nosniff');

    try {
        $handler();
    } catch (PrivateArchivesApiError $error) {
        pa_respond(['error' => $error->getMessage()], $error->status);
    } catch (Throwable $error) {
        error_log('PrivateArchives API error: ' . $error->getMessage());
        pa_respond(['error' => 'Layanan autentikasi sedang bermasalah. Coba lagi nanti.'], 503);
    }
}

function pa_respond(array $body, int $status = 200): never
{
    http_response_code($status);
    echo json_encode(
        $body,
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}

function pa_require_method(string $method): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
        header('Allow: ' . $method);
        throw new PrivateArchivesApiError(405, 'Metode permintaan tidak diizinkan.');
    }
}

function pa_config(): array
{
    static $config = null;
    if (is_array($config)) {
        return $config;
    }

    $path = getenv('PRIVATEARCHIVES_CONFIG');
    if (!is_string($path) || $path === '') {
        $path = dirname(__DIR__, 2) . '/privatearchives-config.php';
    }
    if (!is_file($path) || !is_readable($path)) {
        throw new PrivateArchivesApiError(503, 'Konfigurasi hosting belum tersedia.');
    }

    $loaded = require $path;
    if (!is_array($loaded) || !isset($loaded['database']) || !is_array($loaded['database'])) {
        throw new PrivateArchivesApiError(503, 'Konfigurasi hosting tidak valid.');
    }
    foreach (['host', 'name', 'user', 'password'] as $key) {
        if (
            !isset($loaded['database'][$key]) ||
            !is_string($loaded['database'][$key]) ||
            $loaded['database'][$key] === ''
        ) {
            throw new PrivateArchivesApiError(503, 'Konfigurasi MySQL belum lengkap.');
        }
    }

    $config = $loaded;
    return $config;
}

function pa_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = pa_config()['database'];
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=utf8mb4',
        $config['host'],
        $config['name']
    );
    $pdo = new PDO($dsn, $config['user'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function pa_read_json(): array
{
    $contentType = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
    if (!str_starts_with($contentType, 'application/json')) {
        throw new PrivateArchivesApiError(415, 'Permintaan harus menggunakan JSON.');
    }

    $contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > 4096) {
        throw new PrivateArchivesApiError(413, 'Permintaan terlalu besar.');
    }

    $raw = file_get_contents('php://input');
    if (!is_string($raw) || strlen($raw) > 4096) {
        throw new PrivateArchivesApiError(413, 'Permintaan terlalu besar.');
    }

    try {
        $body = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new PrivateArchivesApiError(400, 'Isi permintaan tidak valid.');
    }
    if (!is_array($body)) {
        throw new PrivateArchivesApiError(400, 'Isi permintaan tidak valid.');
    }
    return $body;
}

function pa_assert_same_origin(): void
{
    $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin !== '') {
        $originParts = parse_url($origin);
        $isSecure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== '' && $_SERVER['HTTPS'] !== 'off';
        $requestParts = parse_url(
            ($isSecure ? 'https://' : 'http://') . (string)($_SERVER['HTTP_HOST'] ?? '')
        );
        if (
            !is_array($originParts) ||
            !is_array($requestParts) ||
            strtolower((string)($originParts['scheme'] ?? '')) !== strtolower((string)($requestParts['scheme'] ?? '')) ||
            strtolower((string)($originParts['host'] ?? '')) !== strtolower((string)($requestParts['host'] ?? '')) ||
            ($originParts['port'] ?? null) !== ($requestParts['port'] ?? null)
        ) {
            throw new PrivateArchivesApiError(403, 'Permintaan lintas situs ditolak.');
        }
    }
    if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') {
        throw new PrivateArchivesApiError(403, 'Permintaan lintas situs ditolak.');
    }
}

function pa_normalize_email(mixed $value): string
{
    return is_string($value) ? strtolower(trim($value)) : '';
}

function pa_valid_email(string $email): bool
{
    return strlen($email) <= 254 && preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/u', $email) === 1;
}

function pa_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.gc_maxlifetime', (string)PA_SESSION_TTL);
    session_name('privatearchives_session');
    session_set_cookie_params([
        'lifetime' => PA_SESSION_TTL,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== '' && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    if (!session_start()) {
        throw new PrivateArchivesApiError(503, 'Sesi tidak dapat dimulai di server.');
    }
}

function pa_current_user(): ?array
{
    pa_start_session();
    $sessionUser = $_SESSION['user'] ?? null;
    $expiresAt = (int)($_SESSION['expires_at'] ?? 0);
    if (
        !is_array($sessionUser) ||
        empty($sessionUser['id']) ||
        $expiresAt <= time()
    ) {
        if (isset($_SESSION['user']) || isset($_SESSION['expires_at'])) {
            pa_clear_session();
        }
        return null;
    }

    $statement = pa_db()->prepare('SELECT id, name, email FROM users WHERE id = ?');
    $statement->execute([$sessionUser['id']]);
    $user = $statement->fetch();
    if (!$user) {
        pa_clear_session();
        return null;
    }

    $publicUser = [
        'id' => (string)$user['id'],
        'name' => (string)$user['name'],
        'email' => (string)$user['email'],
    ];
    $_SESSION['user'] = $publicUser;
    return $publicUser;
}

function pa_set_session(array $user): void
{
    pa_start_session();
    if (!session_regenerate_id(true)) {
        throw new PrivateArchivesApiError(503, 'Sesi login tidak dapat dibuat.');
    }
    $_SESSION['user'] = $user;
    $_SESSION['expires_at'] = time() + PA_SESSION_TTL;
}

function pa_clear_session(): void
{
    pa_start_session();
    $_SESSION = [];
    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 42000,
        'path' => $params['path'],
        'domain' => $params['domain'],
        'secure' => $params['secure'],
        'httponly' => $params['httponly'],
        'samesite' => $params['samesite'] ?? 'Lax',
    ]);
    session_destroy();
}

function pa_attempt_key(string $scope, string $identity = ''): string
{
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    return hash('sha256', $scope . "\0" . $ip . "\0" . $identity);
}

function pa_record_attempt(PDO $pdo, string $key): int
{
    $now = time();
    $resetBefore = $now - PA_ATTEMPT_WINDOW;
    $statement = $pdo->prepare(
        'INSERT INTO login_attempts (key_hash, attempts, window_started_at)
         VALUES (:key, 1, :started_at)
         ON DUPLICATE KEY UPDATE
           attempts = IF(window_started_at <= :reset_attempts, 1, attempts + 1),
           window_started_at = IF(window_started_at <= :reset_started, :new_started_at, window_started_at)'
    );
    $statement->execute([
        'key' => $key,
        'started_at' => $now,
        'reset_attempts' => $resetBefore,
        'reset_started' => $resetBefore,
        'new_started_at' => $now,
    ]);

    $statement = $pdo->prepare('SELECT attempts FROM login_attempts WHERE key_hash = ?');
    $statement->execute([$key]);
    return (int)$statement->fetchColumn();
}

function pa_clear_attempt(PDO $pdo, string $key): void
{
    $statement = $pdo->prepare('DELETE FROM login_attempts WHERE key_hash = ?');
    $statement->execute([$key]);
}

function pa_password_hash(string $password, string $salt): string
{
    $hash = hash_pbkdf2('sha256', $password, $salt, PA_PASSWORD_ITERATIONS, 32, true);
    return rtrim(strtr(base64_encode($hash), '+/', '-_'), '=');
}

function pa_base64url_decode(string $value): string|false
{
    $base64 = strtr($value, '-_', '+/');
    return base64_decode($base64 . str_repeat('=', (4 - strlen($base64) % 4) % 4), true);
}

function pa_new_uuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return sprintf(
        '%s-%s-%s-%s-%s',
        substr($hex, 0, 8),
        substr($hex, 8, 4),
        substr($hex, 12, 4),
        substr($hex, 16, 4),
        substr($hex, 20)
    );
}
