<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/_bootstrap.php';

pa_run(static function (): void {
    pa_require_method('POST');
    pa_assert_same_origin();
    $body = pa_read_json();
    $email = pa_normalize_email($body['email'] ?? null);
    $password = is_string($body['password'] ?? null) ? $body['password'] : '';
    if (!pa_valid_email($email) || $password === '' || strlen($password) > 256) {
        throw new PrivateArchivesApiError(400, 'Email dan password tidak valid.');
    }

    $pdo = pa_db();
    $attemptKey = pa_attempt_key('login', $email);
    if (pa_record_attempt($pdo, $attemptKey) > PA_MAX_ATTEMPTS) {
        throw new PrivateArchivesApiError(429, 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
    }

    $statement = $pdo->prepare(
        'SELECT id, name, email, password_salt, password_hash FROM users WHERE email = ?'
    );
    $statement->execute([$email]);
    $account = $statement->fetch();
    $salt = $account ? pa_base64url_decode((string)$account['password_salt']) : false;
    if (!is_string($salt)) {
        $salt = random_bytes(16);
    }
    $actualHash = pa_password_hash($password, $salt);
    $expectedHash = $account ? (string)$account['password_hash'] : str_repeat('A', 43);
    if (!$account || !hash_equals($expectedHash, $actualHash)) {
        throw new PrivateArchivesApiError(401, 'Email atau password salah.');
    }

    pa_clear_attempt($pdo, $attemptKey);
    $user = [
        'id' => (string)$account['id'],
        'name' => (string)$account['name'],
        'email' => (string)$account['email'],
    ];
    pa_set_session($user);
    pa_respond(['user' => $user]);
});
