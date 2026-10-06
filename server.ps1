# server.ps1 - Server Lokal Mandiri Berbasis PHP CLI & MySQL (dengan Fallback HttpListener)
param([int]$Port = 8080)

$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }
$localIp = if ($ipAddresses) { $ipAddresses[0].IPAddress } else { "127.0.0.1" }
$root = $PSScriptRoot

# 1. Pastikan MySQL / MariaDB Server Berjalan
$mysqlProcess = Get-Process -Name "mysqld" -ErrorAction SilentlyContinue
if (-not $mysqlProcess) {
    $mysqlBin = "C:\xampp\mysql\bin\mysqld.exe"
    $mysqlIni = "C:\xampp\mysql\bin\my.ini"
    if (Test-Path $mysqlBin) {
        Write-Host "Memulai MySQL / MariaDB Server (absen_makan_hotel)..." -ForegroundColor Yellow
        Start-Process -FilePath $mysqlBin -ArgumentList "--defaults-file=`"$mysqlIni`" --standalone" -WindowStyle Hidden
        Start-Sleep -Seconds 1
    }
}

# 2. Cek Eksekusi Melalui PHP CLI (Mendukung MySQL API & Kecepatan Maksimal)
$phpExe = "C:\xampp\php\php.exe"
if (-not (Test-Path $phpExe)) {
    $phpCmd = Get-Command php -ErrorAction SilentlyContinue
    if ($phpCmd) { $phpExe = $phpCmd.Source }
}

if ($phpExe -and (Test-Path $phpExe)) {
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "  SISTEM ABSENSI MAKAN KARYAWAN HOTEL (PHP + MYSQL)       " -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "Database: MySQL Aktif di port 3306 (absen_makan_hotel)" -ForegroundColor Green
    Write-Host "Akses Utama:    http://localhost:$Port/index.html" -ForegroundColor White
    Write-Host "Akses Jaringan: http://${localIp}:$Port/index.html" -ForegroundColor Cyan
    Write-Host "Tekan CTRL + C untuk menghentikan server." -ForegroundColor Gray
    Write-Host "==========================================================" -ForegroundColor Cyan

    & $phpExe -S "0.0.0.0:$Port" -t "$root"
    exit
}

# 3. Fallback: PowerShell HttpListener jika PHP CLI tidak ditemukan
$listener = $null
$portsToTry = @($Port, 8080, 8000, 8081, 5500, 3000)

foreach ($p in $portsToTry) {
    try {
        $l = New-Object System.Net.HttpListener
        $l.Prefixes.Add("http://localhost:$p/")
        $l.Prefixes.Add("http://127.0.0.1:$p/")
        if ($p -eq 8080) {
            try { $l.Prefixes.Add("http://localhost:8000/") } catch {}
        }
        $l.Start()
        $listener = $l
        $Port = $p
        break
    } catch {}
}

if (-not $listener -or -not $listener.IsListening) {
    Write-Error "Tidak dapat memulai server web lokal pada port manapun."
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SISTEM ABSENSI MAKAN KARYAWAN HOTEL (LOCAL SERVER)      " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Server berhasil aktif!" -ForegroundColor Green
Write-Host "Akses Utama (Port 8080): http://localhost:8080/index.html" -ForegroundColor White
Write-Host "Akses Port 8000:         http://localhost:8000/index.html" -ForegroundColor White
Write-Host "Akses Jaringan (Wi-Fi):  http://${localIp}:$Port" -ForegroundColor Cyan
Write-Host "Tekan CTRL + C untuk menghentikan server." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($path) -or $path -eq "index.php") {
            $path = "index.html"
        }
        $filePath = Join-Path $root $path

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".php"  { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".svg"  { "image/svg+xml" }
                default { "application/octet-stream" }
            }
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.Close()
    } catch {}
}
