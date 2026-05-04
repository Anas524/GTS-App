<?php
$base = __DIR__ . '/storage/app/public';
$folders = [
    __DIR__ . '/storage',
    __DIR__ . '/storage/app',
    $base,
    $base . '/attachments',
];

foreach ($folders as $dir) {
    if (!is_dir($dir)) {
        if (!mkdir($dir, 0755, true)) {
            http_response_code(500);
            echo "Failed to create: " . htmlspecialchars($dir);
            exit;
        }
    }
    chmod($dir, 0755);
}

echo "OK: storage/app/public (and attachments/) are ready.";
