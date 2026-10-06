<?php
/**
 * config.php - Konfigurasi Database MySQL Terpusat
 * 
 * PANDUAN PENGATURAN:
 * 1. Di Localhost (XAMPP Default):
 *    DB_HOST: 127.0.0.1
 *    DB_USER: root
 *    DB_PASS: "" (kosong)
 *    DB_NAME: absen_makan_hotel
 * 
 * 2. Di Web Hosting (cPanel / VPS / Cloud):
 *    Ganti nilai di bawah ini sesuai database yang Anda buat di cPanel.
 *    Contoh:
 *    define('DB_USER', 'u1234567_admin');
 *    define('DB_PASS', 'PasswordHostingRahasia123');
 *    define('DB_NAME', 'u1234567_absen_hotel');
 */

if (!defined('DB_HOST')) define('DB_HOST', '127.0.0.1');
if (!defined('DB_PORT')) define('DB_PORT', '3306');
if (!defined('DB_USER')) define('DB_USER', 'root');
if (!defined('DB_PASS')) define('DB_PASS', '');
if (!defined('DB_NAME')) define('DB_NAME', 'absen_makan_hotel');
