# Laporan Pemeriksaan Keamanan

**Cakupan:** Pemeriksaan sebelum rilis pada pengaturan dan tampilan tenant di `js/tenants.js`, termasuk alur API dan login yang terkait.

**Status:** Perbaikan kode sudah diterapkan di worktree dan belum di-commit. Masih perlu diuji pada server hotel dengan HTTPS dan database salinan.

## Temuan

### 1. XSS tersimpan melalui nama tenant

- **Tingkat risiko:** TINGGI
- **Keyakinan:** 9/10
- **Lokasi:** `js/tenants.js:181-192`
- **Dampak dan alur:** `renderTenantsList()` memasukkan `t.name` ke dalam template `tbody.innerHTML` tanpa escaping. API `save_settings` menerima dan menyimpan nama tenant tanpa pemeriksaan otorisasi (`api.php:618-649`), dan API mengizinkan permintaan lintas origin (`api.php:8-10`). Pihak yang bisa mengakses API dapat menyimpan nama tenant berisi HTML/JavaScript. Kode tersebut dapat berjalan pada origin aplikasi saat admin membuka daftar tenant.
- **Perbaikan:** Perubahan pengaturan kini memerlukan sesi Administrator di API. Nama tenant di-escape sebelum dirender, dan password tidak lagi ditampilkan.

### 2. Password tenant terbuka melalui API tanpa autentikasi

- **Tingkat risiko:** TINGGI
- **Keyakinan:** 9/10
- **Lokasi:** `api.php:289-312`; pemeriksaan password di sisi klien: `js/store.js:539-550`
- **Dampak dan alur:** Respons `get_all` menyertakan password tenant dalam bentuk teks biasa. Browser memakai password tersebut untuk memeriksa login tenant, sehingga siapa pun yang dapat mengakses API bisa mengambil dan menggunakan kredensial itu. Password tenant juga ditampilkan di halaman pengelolaan tenant (`js/tenants.js:196`).
- **Perbaikan:** Login dan otorisasi kini diperiksa di PHP menggunakan sesi server. Password tidak lagi disertakan pada respons data; password baru disimpan sebagai hash. Password teks biasa lama di-hash setelah login berhasil, dan kredensial bawaan mewajibkan penggantian sebelum data aplikasi dapat diakses.

## Hal yang perlu diperiksa sebelum rilis

- Wajibkan HTTPS pada server hotel, termasuk akses melalui Wi-Fi internal; pastikan reverse proxy meneruskan status HTTPS dengan benar ke PHP.
- Atur rahasia `INITIAL_ADMIN_PASSWORD` khusus server sebelum inisialisasi, lalu hapus setelah password admin diganti. Ganti password seluruh akun kantin dan karyawan sebelum sistem dipakai operasional.
- Gunakan akun database aplikasi dengan hak akses minimum, batasi akses jaringan, dan uji endpoint dari perangkat yang tidak login.
