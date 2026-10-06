# Sistem Absensi Makan Karyawan Hotel

Aplikasi web terpadu untuk pengelolaan absensi makan karyawan hotel bagi pihak kantin (**Depot Bu A** dan **Depot Bu Yuli**) serta pihak **Administrator Hotel**.

---

## Aturan Bisnis (Core Rules)
1. **1x Jatah Makan Per Hari**:
   - Setiap karyawan hanya berhak mendapatkan **1 kali makan dalam sehari**.
   - Terkunci lintas tenant: Jika karyawan sudah absen di Depot Bu A, maka otomatis tidak bisa lagi absen di Depot Bu Yuli (dan sebaliknya).
2. **Jam Absensi Operasional**:
   - Hanya dapat melakukan absensi pada pukul **11.00 - 19.00 WIB**.
   - Di luar jam operasional tersebut sistem otomatis menolak absensi.
3. **Pembagian 2 Shift**:
   - **Makan Siang**: Karyawan makan pada pukul **11.00 - 15.00 WIB**.
   - **Makan Sore**: Karyawan makan pada pukul **15.01 - 19.00 WIB**.
4. **Validasi Karyawan Aktif**:
   - Karyawan dengan status "Non Aktif" tidak dapat melakukan absensi makan.

---

## 8 Halaman Aplikasi
1. **Dashboard**:
   - Filter tanggal fleksibel: **1 tanggal saja** atau **rentang tanggal** ("tanggal ini sampai tanggal ini").
   - Tombol cepat: "Hari Ini" dan "Minggu Ini".
   - Indikator metrik:
     - Berapa orang yang sudah makan di tanggal terpilih.
     - Berapa orang yang belum makan di tanggal terpilih.
     - Total biaya konsumsi (jumlah makan × tarif per porsi).
     - Depot Bu A: Berapa orang yang sudah makan.
     - Depot Bu Yuli: Berapa orang yang sudah makan.
   - Grafik pie perbandingan porsi antar depot & distribusi shift.
   - Tabel riwayat absensi terkini.
2. **Depot Bu A (Tenant 1)**:
   - Pilihan tanggal hari ini.
   - Menu scan QR via kamera langsung (webcam / HP) atau input manual ID Karyawan (kompatibel juga dengan USB barcode scanner).
   - Pratinjau profil karyawan otomatis (Nama, ID, Jabatan, Departemen, Status).
   - Tombol **Konfirmasi** untuk mencatat transaksi ke database dan langsung memperbarui dashboard.
3. **Depot Bu Yuli (Tenant 2)**:
   - Fitur identik dengan Depot Bu A untuk operasional Tenant 2.
4. **Kelola Tenant**:
   - Pengaturan ganti nama tenant (Tenant 1 default: "Depot Bu A", Tenant 2 default: "Depot Bu Yuli").
   - Pengaturan tarif harga per porsi (default Rp 15.000).
   - Pengaturan Nama Hotel.
   - Fitur **Mode Simulasi/Bypass Jam Absensi** untuk pengujian sistem kapan saja tanpa dibatasi jam 11.00-19.00.
5. **Karyawan**:
   - Form penambahan karyawan baru: Nama, ID, Departemen, Jabatan, Status.
   - Pilihan 9 Departemen Standar Hotel:
     1. A&G
     2. Accounting
     3. Engineering
     4. FB Product
     5. FB Service
     6. Front Office
     7. Housekeeping
     8. HR
     9. Security
   - Tabel database karyawan lengkap dengan pencarian, filter departemen, filter status, dan **edit status (Aktif/Non Aktif) langsung dengan satu klik di tabel**.
6. **Kartu QR**:
   - Berisi kartu QR untuk seluruh karyawan terdaftar.
   - Desain baku kartu:
     1. Paling atas: **Nama Karyawan** (Bold)
     2. Bawahnya: **Jabatan**
     3. Bawahnya: **QR Code**
     4. Bawahnya: **ID Karyawan**
     5. Paling bawah: **Kartu absensi Karyawan**
   - Fitur cetak semua kartu ke kertas A4 atau cetak kartu per orangan.
7. **Scan Karyawan (Fitur Scan Mandiri)**:
   - Khusus untuk karyawan: Membuka kamera scanner di HP untuk memindai QR Code yang terpajang di meja kasir Depot Bu A atau Depot Bu Yuli.
   - Absensi otomatis dicatat, kuota diperbarui, dan status sukses langsung ditampilkan di HP karyawan sekaligus masuk ke layar kasir kantin.
8. **Laporan**:
   - Pilihan tanggal / rentang tanggal (Hari Ini, Minggu Ini, Bulan Ini, atau Kustom).
   - Tombol **Cetak sebagai PDF** (menggunakan format kop surat resmi hotel).
   - Total orang yang makan & total biaya.
   - Tabel Rekapitulasi per 9 Departemen (Departemen, Jumlah, Biaya, dan baris Total di paling bawah).
   - Tabel rincian log detail transaksi absensi.
9. **Keluar**:
   - Tombol logout untuk keluar dari sesi dan kembali ke pemilihan hak akses.

---

## Sistem Absensi Dua Arah (Two-Way QR Scanning)
Aplikasi ini mendukung **2 metode absensi sekaligus**:
1. **Metode A (Karyawan Scan QR Meja Kantin)**:
   - Pihak Kantin (Depot Bu A / Depot Bu Yuli) memilih tab **"Tampilkan QR Meja Kasir"** atau mencetak stand meja (A4).
   - Karyawan membuka menu **Scan Karyawan** di HP mereka dan mengarahkan kamera ke QR meja kasir tersebut.
2. **Metode B (Kantin Scan Kartu Karyawan)**:
   - Petugas kasir kantin tetap memiliki kamera scanner di tab **"Kasir Scan Karyawan"** untuk memindai kartu QR fisik karyawan atau memasukkan ID manual.

Kedua metode ini terhubung ke database terpusat yang sama sehingga otomatis mencegah absensi ganda (maksimal 1x porsi per hari) dan sinkron secara real-time.

---

## Cara Menjalankan Aplikasi
1. **Opsi 1 (Paling Mudah)**:
   - Masuk ke folder `hotel-absensi-makan` lalu klik dua kali file **`start.bat`** (pilih 1) atau cukup klik dua kali **`index.html`** langsung di browser Chrome/Edge.
2. **Opsi 2 (Multi-Perangkat di Kantin / Jaringan Wi-Fi Hotel)**:
   - Klik dua kali **`start.bat`** lalu pilih opsi **2** (Jalankan Local Web Server).
   - Perangkat kasir di Depot A atau Depot Bu Yuli (seperti Tablet atau HP) dapat membuka URL yang tertera di layar terminal (misal: `http://192.168.x.x:8080`).

---

## 4 Pihak / Role Akses
- **Administrator**: Akses penuh ke seluruh menu, kelola tenant, database karyawan, dan cetak laporan.
- **Pihak Depot Bu A**: Kasir tenant 1 untuk memindai kartu karyawan atau menampilkan QR meja kasir Depot Bu A.
- **Pihak Depot Bu Yuli**: Kasir tenant 2 untuk memindai kartu karyawan atau menampilkan QR meja kasir Depot Bu Yuli.
- **Pihak Karyawan**: Portal absensi mandiri bagi karyawan untuk memindai QR meja kantin melalui HP masing-masing.
Ganti role kapan saja melalui tombol dropdown di pojok kanan atas layar atau saat logout.
