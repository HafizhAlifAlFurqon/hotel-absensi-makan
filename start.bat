@echo off
title Sistem Absensi Makan Karyawan Hotel (MySQL + PHP)
cd /d "%~dp0"

echo ==========================================================
echo       SISTEM ABSENSI MAKAN KARYAWAN HOTEL (MYSQL)
echo       BeSS Mansion Hotel Surabaya
echo ==========================================================
echo.
echo 1. Jalankan Server Web & Database MySQL (Port 8080)
echo 2. Buka Langsung di Browser Default
echo 3. Buka via XAMPP Apache (Port 80)
echo 4. Keluar
echo.
set /p choice="Pilih opsi [1/2/3/4] (default: 1): "

if "%choice%"=="2" goto run_browser
if "%choice%"=="3" goto run_apache
if "%choice%"=="4" exit

:run_server
echo Menjalankan server dan database MySQL...
start "" "http://localhost:8080/index.html"
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8080
pause
exit

:run_browser
echo Membuka aplikasi langsung di browser...
start "" "index.html"
exit

:run_apache
echo Membuka aplikasi via Apache XAMPP...
start "" "http://localhost/absen_makan_hotel/index.html"
exit
