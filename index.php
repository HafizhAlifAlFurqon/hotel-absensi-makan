<?php
/**
 * index.php - File Kompatibilitas untuk Server PHP / Apache / XAMPP / VS Code
 * Menampilkan atau mengarahkan ke antarmuka terbaru (index.html)
 */

if (file_exists(__DIR__ . '/index.html')) {
    include __DIR__ . '/index.html';
    exit;
}

header('Location: index.html');
exit;
