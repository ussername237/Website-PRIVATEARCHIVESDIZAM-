<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/_bootstrap.php';

pa_run(static function (): void {
    pa_require_method('POST');
    pa_assert_same_origin();
    $config = pa_config();
    $registrationSecret = $config['registration_secret'] ?? '';
    if (!is_string($registrationSecret) || strlen($registrationSecret) < 32) {
        throw new PrivateArchivesApiError(503, 'Kode registrasi server belum dikonfigurasi.');
    }

    $body = pa_read_json();
    $name = is_string($body['name'] ?? null) ? trim($body['name']) : '';
    $email = pa_normalize_email($body['email'] ?? null);
    $password = is_string($body['password'] ?? null) ? $body['password'] : '';
    $registrationCode = is_string($body['registrationCode'] ?? null)
        ? $body['registrationCode']
        : '';
    $nameLength = preg_match_all('/./us', $name);
    if ($name === '' || $nameLength === false || $nameLength > 80 || !pa_valid_email($email)) {
        throw new PrivateArchivesApiError(400, 'Nama atau email tidak valid.');
    }
    if (strlen($password) < 12 || strlen($password) > 256) {
        throw new PrivateArchivesApiError(400, 'Password harus berisi 12 sampai 256 karakter.');
    }

    $pdo = pa_db();
    $attemptKey = pa_attempt_key('registration');
    if (pa_record_attempt($pdo, $attemptKey) > PA_MAX_ATTEMPTS) {
        throw new PrivateArchivesApiError(429, 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
    }
    if (!hash_equals($registrationSecret, $registrationCode)) {
        throw new PrivateArchivesApiError(403, 'Kode registrasi tidak valid.');
    }
    pa_clear_attempt($pdo, $attemptKey);

    $salt = random_bytes(16);
    $user = [
        'id' => pa_new_uuid(),
        'name' => $name,
        'email' => $email,
    ];
    $statement = $pdo->prepare(
        'INSERT INTO users (id, name, email, password_salt, password_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    try {
        $statement->execute([
            $user['id'],
            $user['name'],
            $user['email'],
            rtrim(strtr(base64_encode($salt), '+/', '-_'), '='),
            pa_password_hash($password, $salt),
            gmdate('Y-m-d\TH:i:s\Z'),
        ]);
    } catch (PDOException $error) {
        if ($error->getCode() === '23000') {
            throw new PrivateArchivesApiError(409, 'Email sudah terdaftar.');
        }
        throw $error;
    }

    pa_set_session($user);
    pa_respond(['user' => $user]);
});
