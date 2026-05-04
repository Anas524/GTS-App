<?php
// Adjust app root if your Laravel lives in a subfolder.
$appRoot = dirname(__DIR__); // if Laravel is one level above public_html
// If your Laravel is directly under public_html, use: $appRoot = __DIR__;

$target = $appRoot . '/storage/app/public';
$link   = __DIR__ . '/storage';

// Clean up any old file/folder at /public_html/storage
if (file_exists($link) || is_link($link)) {
    if (is_link($link)) unlink($link);
    else {
        // Remove directory recursively (careful: it deletes the folder!)
        $it = new RecursiveDirectoryIterator($link, RecursiveDirectoryIterator::SKIP_DOTS);
        $files = new RecursiveIteratorIterator($it, RecursiveIteratorIterator::CHILD_FIRST);
        foreach($files as $file) {
            $file->isDir() ? rmdir($file->getRealPath()) : unlink($file->getRealPath());
        }
        rmdir($link);
    }
}

if (!is_dir($target)) {
    http_response_code(500);
    echo "Target not found: " . htmlspecialchars($target);
    exit;
}

if (symlink($target, $link)) {
    echo "Symlink created: " . htmlspecialchars($link) . " → " . htmlspecialchars($target);
} else {
    echo "Failed to create symlink. Check permissions/ownership.";
}
