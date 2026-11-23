<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/_bootstrap.php';

pa_run(static function (): void {
    pa_require_method('POST');
    pa_assert_same_origin();
    pa_clear_session();
    pa_respond(['ok' => true]);
});
