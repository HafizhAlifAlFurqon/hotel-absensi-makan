@echo off
title Perbaikan Otomatis MySQL & MariaDB XAMPP
color 0b
echo ============================================================
echo   PERBAIKAN OTOMATIS MYSQL & MARIADB XAMPP
echo   Sistem Absensi Makan Hotel - BeSS Mansion Hotel Surabaya
echo ============================================================
echo.
echo [1/4] Menghentikan sisa proses mysqld jika ada...
taskkill /F /IM mysqld.exe 2>nul
timeout /t 1 /nobreak >nul

echo [2/4] Membersihkan log transaksi Aria yang korup...
cd /d C:\xampp\mysql\data
if not exist aria_backup mkdir aria_backup
copy aria_* aria_backup\ >nul 2>nul
del /f /q aria_log.* 2>nul
del /f /q aria_log_control 2>nul

echo [3/4] Menjalankan perbaikan tabel Aria MariaDB...
cd /d C:\xampp\mysql
bin\aria_chk.exe -o data\mysql\*.MAI

echo [4/4] Memulai kembali MySQL Server...
start "" bin\mysqld.exe --defaults-file=bin\my.ini --standalone
timeout /t 2 /nobreak >nul

echo.
echo ============================================================
echo   SELESAI! MySQL Server telah diperbaiki dan aktif kembali.
echo   Silakan refresh halaman web Anda.
echo ============================================================
echo.
pause
