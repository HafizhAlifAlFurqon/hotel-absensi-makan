@echo off
title Push Project ke GitHub dan GitLab
color 0A
cd /d "C:\Users\Alif\Desktop\hotel-absensi-makan"

echo ========================================================
echo   UPLOAD PROYEK KE GITHUB DAN GITLAB
echo   BeSS Mansion Hotel Surabaya - Absensi Makan
echo ========================================================
echo.
echo [1/2] Menghubungkan remote GitHub...
git remote remove origin 2>nul
git remote add origin https://github.com/HafizhAlifAlFurqon/hotel-absensi-makan.git

echo.
echo [2/2] Menghubungkan remote GitLab...
git remote remove gitlab 2>nul
git remote add gitlab https://gitlab.com/hafizhalif668-group/hotel-absensi-makan.git

git branch -M main

echo.
echo ========================================================
echo   MENGIRIM (PUSH) KE GITHUB...
echo   (Jika muncul jendela login, silakan klik 'Sign in with your browser')
echo ========================================================
git push -u origin main

echo.
echo ========================================================
echo   MENGIRIM (PUSH) KE GITLAB...
echo   (Jika muncul jendela login, silakan login/klik Authorize)
echo ========================================================
git push -u gitlab main

echo.
echo ========================================================
echo   SELESAI! Proyek berhasil di-upload ke GitHub dan GitLab!
echo ========================================================
echo.
pause
