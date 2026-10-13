<?php
/**
 * config.example.php - Template Konfigurasi Database MySQL
 * Sistem Absensi Makan Karyawan Hotel (BeSS Mansion Hotel Surabaya)
 * 
 * PANDUAN PENGATURAN:
 * 1. Di Localhost (XAMPP Default):
 *    Salin file ini menjadi 'config.php', lalu atur:
 *    - DB_HOST: 127.0.0.1
 *    - DB_PORT: 3306
 *    - DB_USER: root
 *    - DB_PASS: "" (kosongkan jika tanpa password)
 *    - DB_NAME: absen_makan_hotel
 * 
 * 2. Di Web Hosting (cPanel / VPS / Cloud):
 *    Buat database MySQL terlebih dahulu di cPanel, lalu salin file ini menjadi 'config.php'
 *    dan masukkan kredensial yang dibuat:
 *    - DB_HOST: localhost (atau IP server database)
 *    - DB_PORT: 3306
 *    - DB_USER: u1234567_admin
 *    - DB_PASS: PasswordDatabaseHostingAnda
 *    - DB_NAME: u1234567_absen_hotel
 */

if (!defined('DB_HOST')) define('DB_HOST', '127.0.0.1');
if (!defined('DB_PORT')) define('DB_PORT', '3306');
if (!defined('DB_USER')) define('DB_USER', 'root');
if (!defined('DB_PASS')) define('DB_PASS', '');
if (!defined('DB_NAME')) define('DB_NAME', 'absen_makan_hotel');
