<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/_bootstrap.php';

pa_run(static function (): void {
    pa_require_method('GET');
    pa_config();
    pa_respond(['user' => pa_current_user()]);
});
