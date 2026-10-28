/**
 * store.js - Database & State Management Terpusat
 * Mengelola LocalStorage, validasi aturan bisnis, audio feedback, dan seed data.
 */

const STORAGE_KEYS = {
  EMPLOYEES: 'hotel_absensi_employees',
  ATTENDANCE: 'hotel_absensi_attendance',
  SETTINGS: 'hotel_absensi_settings',
  AUTH: 'hotel_absensi_auth'
};

// 10 Departemen Hotel (Termasuk Pihak Training)
const DEPARTMENTS = [
  'A&G',
  'Accounting',
  'Engineering',
  'FB Product',
  'FB Service',
  'Front Office',
  'Housekeeping',
  'HR',
  'Security',
  'Training'
];

// Database Karyawan Default (Mulai Kosong agar tidak ada data sampel yang terbuat sendiri)
const DEFAULT_EMPLOYEES = [];

const DEFAULT_SETTINGS = {
  hotelName: 'BeSS Mansion Hotel Surabaya',
  adminUsername: 'admin',
  adminPassword: 'admin123',
  mealPrice: 15000, // Rp 15.000 per porsi
  bypassTimeForTesting: false, // Mode simulasi waktu
  tenants: []
};

const Store = {
  isMySQL: false,
  isSyncing: false,

  audioCtx: null,

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  },

  // --- Audio Feedback (Web Audio API Synthesizer Respon Cepat) ---
  playSound(type = 'success') {
    try {
      const audioCtx = this.getAudioContext();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;

      if (type === 'success') {
        // Nada Beep Retail POS Sukses (Jernih & Nyaring: B5 987Hz -> E6 1318Hz)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.start(now);
        osc.stop(now + 0.28);
      } else {
        // Nada Warning / Error Buzz Ganda (Ditolak / Sudah Makan Hari Ini: 220Hz & 180Hz)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(220, now);
        gain1.gain.setValueAtTime(0.35, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc1.start(now);
        osc1.stop(now + 0.12);

        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);

        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(180, now + 0.16);
        gain2.gain.setValueAtTime(0.35, now + 0.16);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

        osc2.start(now + 0.16);
        osc2.stop(now + 0.32);
      }
    } catch (e) {
      console.warn('Audio feedback error:', e);
    }
  },

  // --- Inisialisasi Data Terpusat & Anti-Perubahan Spontan ---
  init() {
    // 1. Data Karyawan
    if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify([]));
    } else {
      try {
        let currentEmps = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMPLOYEES));
        if (Array.isArray(currentEmps)) {
          // Bersihkan seluruh data karyawan dummy/sampel lama yang mungkin masih tersisa
          const dummyNames = [
            'bambang pamungkas', 'siti nurhaliza', 'agus setiawan', 'juna rorimpandey', 'rina wijaya',
            'dimas anggara', 'tri wahyuni', 'hendra gunawan', 'joko prabowo', 'maya indah',
            'eko prasetyo', 'ahmad fauzi', 'dewi lestari', 'rudi hartono', 'slamet riyadi',
            'budi santoso', 'rina kartika', 'ahmad hidayat', 'agus prasetyo', 'sari wulandari',
            'hendra wijaya', 'mega permata', 'bambang sukoco', 'dian sastro', 'contoh siswa satu',
            'contoh siswa dua', 'contoh karyawan satu', 'contoh karyawan dua', 'contoh trainee'
          ];
          const filtered = currentEmps.filter(e => !dummyNames.includes((e.name || '').trim().toLowerCase()));
          if (filtered.length !== currentEmps.length) {
            currentEmps = filtered;
            localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(currentEmps));
          }
        }
      } catch (err) {}
    }

    // 2. Data Pengaturan Hotel
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    } else {
      try {
        const currentSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS));
        let sChanged = false;
        // Kunci nama hotel ke BeSS Mansion Hotel Surabaya jika masih default lama atau kosong
        if (!currentSettings.hotelName || currentSettings.hotelName.includes('Grand Merdeka')) {
          currentSettings.hotelName = 'BeSS Mansion Hotel Surabaya';
          sChanged = true;
        }
        if (!currentSettings.adminPassword) {
          currentSettings.adminUsername = 'admin';
          currentSettings.adminPassword = 'admin123';
          sChanged = true;
        }
        // Migrasi otomatis nama bawaan lama Depot Bu A -> Depot Bu Mamie
        if (currentSettings.tenant1Name === 'Depot Bu A' || !currentSettings.tenant1Name) {
          currentSettings.tenant1Name = 'Depot Bu Mamie';
          sChanged = true;
        }
        if (!currentSettings.tenants || !Array.isArray(currentSettings.tenants) || currentSettings.tenants.length === 0) {
          currentSettings.tenants = [
            { id: 'tenant1', name: currentSettings.tenant1Name || 'Depot Bu Mamie', password: 'depota123', status: 'Aktif' },
            { id: 'tenant2', name: currentSettings.tenant2Name || 'Depot Bu Yuli', password: 'depotyuli123', status: 'Aktif' }
          ];
          sChanged = true;
        } else {
          currentSettings.tenants.forEach(t => {
            if (t.name === 'Depot Bu A' || (t.id === 'tenant1' && t.name === 'Depot Bu A')) {
              t.name = 'Depot Bu Mamie';
              sChanged = true;
            }
            if (!t.password) {
              t.password = t.id === 'tenant1' ? 'depota123' : (t.id === 'tenant2' ? 'depotyuli123' : 'kantin123');
              sChanged = true;
            }
          });
        }
        if (sChanged) {
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(currentSettings));
        }
      } catch (err) {}
    }

    // 3. Log Absensi (Hanya menyimpan data absensi asli dari scan)
    if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    } else {
      try {
        const currentAtts = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE));
        let attsChanged = false;
        if (Array.isArray(currentAtts)) {
          // Bersihkan sampel absensi bawaan (ATT-1001, ATT-1002, ATT-1003) jika ada
          let filtered = currentAtts.filter(a => a.id !== 'ATT-1001' && a.id !== 'ATT-1002' && a.id !== 'ATT-1003');
          if (filtered.length !== currentAtts.length) attsChanged = true;

          // Migrasikan catatan absensi lama yang berlabel Depot Bu A ke Depot Bu Mamie
          filtered.forEach(a => {
            if (a.canteenName === 'Depot Bu A' || a.tenantName === 'Depot Bu A') {
              a.canteenName = 'Depot Bu Mamie';
              a.tenantName = 'Depot Bu Mamie';
              attsChanged = true;
            }
            // Perbaiki absensi lama milik Kela atau payeng yang tersisa di localStorage agar berawalan EX-
            if (a.employeeName && (a.employeeName.toLowerCase() === 'payeng' || a.employeeName.toLowerCase() === 'kela')) {
              if (a.employeeId && !a.employeeId.startsWith('EX-')) {
                a.employeeId = `EX-${a.employeeId}`;
                attsChanged = true;
              }
            }
          });
          if (attsChanged) {
            localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(filtered));
          }
        }
      } catch (err) {}
    }

    // 4. Sinkronisasi Otomatis dengan Backend MySQL
    setTimeout(() => {
      Store.syncWithBackend().then(synced => {
        if (synced && window.App) {
          App.updateTenantLabels();
        }
      });
    }, 50);

    // Auto-refresh data dari MySQL secara berkala (setiap 15 detik untuk mendukung multi-perangkat)
    if (!window._storeSyncInterval) {
      window._storeSyncInterval = setInterval(() => {
        Store.syncWithBackend();
      }, 15000);
    }
  },

  // --- Helper Komunikasi REST API MySQL (api.php) ---
  async apiPost(action, payload) {
    try {
      const res = await fetch(`api.php?action=${encodeURIComponent(action)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        console.warn(`[MySQL API] Endpoint ${action} HTTP ${res.status}`);
        return null;
      }
      return await res.json();
    } catch (e) {
      console.warn(`[MySQL API] Koneksi offline untuk ${action}:`, e.message);
      return null;
    }
  },

  // --- Perbarui Indikator MySQL di Navbar & Halaman Pengaturan ---
  updateDatabaseStatusBadge(isConnected) {
    this.isMySQL = isConnected;
    const badge = document.getElementById('header-db-badge');
    const dot = document.getElementById('header-db-dot');
    const text = document.getElementById('header-db-text');
    if (badge && dot && text) {
      if (isConnected) {
        badge.className = 'hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-200 border border-emerald-500/80 shadow-xs';
        dot.className = 'w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse';
        text.innerText = 'MySQL Terhubung';
        badge.title = 'Data tersimpan otomatis di database MySQL (absen_makan_hotel)';
      } else {
        badge.className = 'hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-200 border border-amber-500/80 shadow-xs';
        dot.className = 'w-2 h-2 rounded-full bg-amber-400 mr-1.5';
        text.innerText = 'Offline (LocalStorage)';
        badge.title = 'MySQL tidak terdeteksi. Menggunakan penyimpanan peramban lokal.';
      }
    }

    const indicator = document.getElementById('mysql-status-indicator');
    if (indicator) {
      if (isConnected) {
        indicator.innerHTML = '<span class="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200"><i class="fa-solid fa-circle-check text-emerald-600 mr-2"></i> MySQL Aktif &amp; Terhubung (absen_makan_hotel)</span>';
      } else {
        indicator.innerHTML = '<span class="inline-flex items-center text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200"><i class="fa-solid fa-triangle-exclamation text-amber-600 mr-2"></i> MySQL Offline (Menggunakan LocalStorage)</span>';
      }
    }

    const loginDbBadge = document.getElementById('login-db-status');
    if (loginDbBadge) {
      if (isConnected) {
        loginDbBadge.className = 'hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow-xs';
        loginDbBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span><span>MySQL Terhubung</span>';
      } else {
        loginDbBadge.className = 'hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/50 shadow-xs';
        loginDbBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400 mr-1.5"></span><span>Offline (LocalStorage)</span>';
      }
    }
  },

  // --- Sinkronisasi Data Dua Arah dengan MySQL Server ---
  async syncWithBackend(isManual = false) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      const res = await fetch('api.php?action=get_all', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (data && data.success) {
        this.isMySQL = true;

        // 1. Data Karyawan dari MySQL (Sumber Kebenaran Utama Dinamis)
        if (Array.isArray(data.employees)) {
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(data.employees));
        }

        // 2. Data Riwayat Absensi dari MySQL
        if (Array.isArray(data.attendances)) {
          data.attendances.forEach(a => {
            if (a.tenantName === 'Depot Bu A' || a.canteenName === 'Depot Bu A') {
              a.tenantName = 'Depot Bu Mamie';
              a.canteenName = 'Depot Bu Mamie';
            }
          });
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(data.attendances));
        }

        // 3. Pengaturan Hotel & Kantin dari MySQL
        if (data.settings) {
          const merged = { ...DEFAULT_SETTINGS, ...data.settings };
          if (merged.tenant1Name === 'Depot Bu A') merged.tenant1Name = 'Depot Bu Mamie';
          if (Array.isArray(merged.tenants)) {
            merged.tenants.forEach(t => {
              if (t.name === 'Depot Bu A' || (t.id === 'tenant1' && t.name === 'Depot Bu A')) {
                t.name = 'Depot Bu Mamie';
              }
            });
          }
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
        }

        this.updateDatabaseStatusBadge(true);
        window.dispatchEvent(new CustomEvent('store-synced', { detail: data }));

        if (isManual) {
          alert('Sinkronisasi Sukses!\nData Anda telah terhubung dan tersimpan rapi di MySQL (absen_makan_hotel).');
        }
        this.isSyncing = false;
        return true;
      }
    } catch (err) {
      this.isMySQL = false;
      this.updateDatabaseStatusBadge(false);
      if (isManual) {
        alert('Gagal terhubung ke MySQL.\nPastikan service MySQL di XAMPP sedang berjalan!');
      }
      this.isSyncing = false;
      return false;
    }
    this.isSyncing = false;
  },

  getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  getYesterdayDateString() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // --- Karyawan Management ---
  getEmployees() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveEmployee(employee, oldId = null) {
    const employees = Store.getEmployees();
    if (!employee.password) {
      employee.password = 'password123';
    }
    if (!employee.createdAt) {
      employee.createdAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    }
    const existingIndex = employees.findIndex(e => e.id.toLowerCase() === employee.id.toLowerCase());
    if (existingIndex >= 0) {
      // Pertahankan createdAt asli jika karyawan diedit
      if (employees[existingIndex].createdAt) {
        employee.createdAt = employees[existingIndex].createdAt;
      }
      employees[existingIndex] = { ...employees[existingIndex], ...employee };
    } else {
      employees.push(employee);
    }
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    // Sinkronkan ke database MySQL
    Store.apiPost('save_employee', { ...employee, oldId });
    return employee;
  },

  generateNextEmployeeId() {
    const employees = this.getEmployees();
    const attendances = this.getAttendances();
    let maxNum = 0;
    employees.forEach(e => {
      const match = e.id && e.id.match(/^EMP-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    // Pindai juga riwayat absensi agar ID dari riwayat lampau tidak pernah terpakai ulang (mencegah tabrakan akun baru)
    attendances.forEach(a => {
      const match = a.employeeId && a.employeeId.match(/^EMP-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return 'EMP-' + String(maxNum + 1).padStart(3, '0');
  },

  updateEmployee(oldId, updatedData) {
    if (!oldId || !updatedData) return { success: false, message: 'Data tidak lengkap.' };
    const employees = this.getEmployees();
    const idx = employees.findIndex(e => e.id.toLowerCase() === oldId.toLowerCase());
    if (idx < 0) return { success: false, message: 'Karyawan tidak ditemukan.' };

    const newId = (updatedData.id || oldId).trim().toUpperCase();
    const newName = (updatedData.name || '').trim();
    if (!newName || !newId) return { success: false, message: 'Nama dan ID Karyawan wajib diisi.' };

    // Jika ID berubah, pastikan ID baru belum dipakai oleh karyawan lain
    if (newId.toLowerCase() !== oldId.toLowerCase()) {
      const exists = employees.find(e => e.id.toLowerCase() === newId.toLowerCase());
      if (exists) {
        return { success: false, message: `ID "${newId}" sudah digunakan oleh karyawan ${exists.name}.` };
      }

      // Update ID di riwayat absensi
      const attendances = this.getAttendances();
      let attChanged = false;
      attendances.forEach(a => {
        if (a.employeeId && a.employeeId.toLowerCase() === oldId.toLowerCase()) {
          a.employeeId = newId;
          a.employeeName = newName;
          attChanged = true;
        }
      });
      if (attChanged) {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendances));
      }

      // Update active ID jika sedang login sebagai karyawan ini
      const activeId = localStorage.getItem('hotel_absensi_active_emp_id');
      if (activeId && activeId.toLowerCase() === oldId.toLowerCase()) {
        localStorage.setItem('hotel_absensi_active_emp_id', newId);
      }
    }

    // Update data karyawan
    employees[idx] = {
      ...employees[idx],
      ...updatedData,
      id: newId,
      name: newName,
      password: (updatedData.password && updatedData.password.trim()) || employees[idx].password || 'password123'
    };

    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));

    // Sinkronkan ke database MySQL
    Store.apiPost('save_employee', { ...employees[idx], oldId: oldId });

    // Update sesi pengguna saat ini jika cocok
    if (window.Auth) {
      const currentUser = Auth.getCurrentUser();
      if (currentUser && currentUser.role === 'karyawan' && currentUser.employeeId && currentUser.employeeId.toLowerCase() === oldId.toLowerCase()) {
        currentUser.employeeId = newId;
        currentUser.name = newName;
        currentUser.department = employees[idx].department;
        currentUser.position = employees[idx].position;
        Auth.setCurrentUser(currentUser);
      }
    }

    return { success: true, message: `Data karyawan "${newName}" (${newId}) berhasil diperbarui!`, employee: employees[idx] };
  },

  updateEmployeePassword(employeeId, newPassword, forceDefault) {
    if (!employeeId || !newPassword) return { success: false, message: 'Password tidak boleh kosong.' };
    const employees = Store.getEmployees();
    const emp = employees.find(e => e.id.toLowerCase() === employeeId.toLowerCase());
    if (emp) {
      emp.password = newPassword.trim();
      // true  = admin mereset ke password default (karyawan wajib ganti lagi)
      // false = karyawan sudah ganti sendiri / admin set password non-default
      emp.passwordChanged = forceDefault ? 0 : 1;
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
      // Sinkronkan ke database MySQL (sekaligus tandai status pergantian password)
      Store.apiPost('save_employee', { ...emp, oldId: emp.id, passwordChanged: emp.passwordChanged });
      return { success: true, message: `Password untuk karyawan "${emp.name}" berhasil diperbarui!` };
    }
    return { success: false, message: 'Karyawan tidak ditemukan.' };
  },

  batchAddEmployees(empList) {
    if (!Array.isArray(empList) || empList.length === 0) return { count: 0 };
    const employees = this.getEmployees();
    let maxNum = 0;
    employees.forEach(e => {
      const match = e.id && e.id.match(/^EMP-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    let count = 0;
    empList.forEach(item => {
      if (!item.name || !item.name.trim()) return;
      const cleanName = item.name.trim();
      let cleanId = item.id ? item.id.trim().toUpperCase() : '';
      if (!cleanId) {
        maxNum++;
        cleanId = 'EMP-' + String(maxNum).padStart(3, '0');
      }
      const existing = employees.find(e => e.id.toLowerCase() === cleanId.toLowerCase());
      if (existing) {
        existing.name = cleanName;
        if (item.department) existing.department = item.department.trim();
        if (item.position) existing.position = item.position.trim();
        if (item.password) existing.password = item.password.trim();
        count++;
      } else {
        employees.push({
          id: cleanId,
          name: cleanName,
          department: (item.department && item.department.trim()) || 'Housekeeping',
          position: (item.position && item.position.trim()) || 'Staff',
          password: (item.password && item.password.trim()) || 'password123',
          status: item.status || 'Aktif'
        });
        count++;
      }
    });
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    // Sinkronkan ke database MySQL
    Store.apiPost('batch_save_employees', { employees: empList });
    return { count };
  },

  updateAdminCredentials(newUsername, newPassword) {
    const settings = this.getSettings();
    if (newUsername && newUsername.trim()) {
      settings.adminUsername = newUsername.trim();
    }
    if (newPassword && newPassword.trim()) {
      settings.adminPassword = newPassword.trim();
    }
    this.saveSettings(settings);
    return { success: true, message: 'Kredensial Administrator berhasil diperbarui!' };
  },

  verifyCredentials(identifier, password) {
    if (!identifier || !password) {
      return { success: false, message: 'Harap masukkan Nama / ID Karyawan dan Password.' };
    }

    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();
    const settings = Store.getSettings();
    const currentAdminUser = (settings.adminUsername || 'admin').toLowerCase();

    // 1. Cek Administrator
    if (cleanId === currentAdminUser || cleanId === 'admin' || cleanId === 'administrator') {
      const adminPass = settings.adminPassword || 'admin123';
      if (cleanPass === adminPass) {
        return {
          success: true,
          role: 'admin',
          user: {
            role: 'admin',
            name: 'Administrator Hotel',
            picture: Auth.getAvatar('Admin', '0f766e'),
            badge: 'Admin Utama'
          }
        };
      } else {
        return { success: false, message: 'Password Administrator salah!' };
      }
    }

    // 2. Cek Kasir Kantin
    const tenants = Store.getTenants();
    const matchedTenant = tenants.find(t => 
      t.id.toLowerCase() === cleanId || 
      t.name.toLowerCase() === cleanId ||
      cleanId === `kasir_${t.id.toLowerCase()}`
    );

    if (matchedTenant) {
      const tenantPass = matchedTenant.password || 'kantin123';
      if (cleanPass === tenantPass || cleanPass === 'kantin123' || cleanPass === 'admin123') {
        return {
          success: true,
          role: 'canteen',
          user: {
            role: 'canteen',
            tenantId: matchedTenant.id,
            name: matchedTenant.name,
            picture: Auth.getAvatar(matchedTenant.name, '2563eb'),
            badge: `Kasir ${matchedTenant.name}`
          }
        };
      } else {
        return { success: false, message: `Password Kasir ${matchedTenant.name} salah!` };
      }
    }

    // 3. Cek Karyawan (Berdasarkan Nama Lengkap atau ID Karyawan)
    const employees = Store.getEmployees();
    const matchedEmp = employees.find(e => 
      e.id.toLowerCase() === cleanId || 
      e.name.toLowerCase() === cleanId ||
      (cleanId.length >= 3 && e.name.toLowerCase().startsWith(cleanId))
    );

    if (matchedEmp) {
      const empPass = matchedEmp.password || 'password123';
      if (cleanPass === empPass) {
        if (matchedEmp.status !== 'Aktif') {
          return { success: false, message: `Akun Karyawan ${matchedEmp.name} berstatus NON-AKTIF. Hubungi HR Hotel.` };
        }
        return {
          success: true,
          role: 'karyawan',
          user: {
            role: 'karyawan',
            employeeId: matchedEmp.id,
            name: matchedEmp.name,
            department: matchedEmp.department,
            position: matchedEmp.position || 'Staff',
            picture: Auth.getAvatar(matchedEmp.name, '059669'),
            badge: 'Karyawan',
            mustChangePassword: matchedEmp.passwordChanged === 0
          }
        };
      } else {
        return { success: false, message: `Password untuk karyawan "${matchedEmp.name}" (${matchedEmp.id}) salah!` };
      }
    }

    return { success: false, message: `Nama Karyawan / ID "${identifier}" tidak ditemukan dalam database!` };
  },

  deleteEmployee(id) {
    const emp = Store.findEmployee(id);
    // Pastikan seluruh absensi karyawan yang tersimpan di localStorage diperkaya dengan snapshot data lengkap
    // CATATAN: Data makan di laporan TETAP UTUH dan identitas asli tidak dirusak
    if (emp) {
      try {
        const attendances = Store.getAttendances();
        let changed = false;
        attendances.forEach(a => {
          if ((a.employeeId && a.employeeId.toLowerCase() === id.toLowerCase()) || (a.employeeName && a.employeeName.toLowerCase() === emp.name.toLowerCase())) {
            a.employeeName = a.employeeName || emp.name;
            a.employeeId = a.employeeId || emp.id;
            a.department = a.department || emp.department;
            a.position = a.position || emp.position;
            a.institution = a.institution || emp.institution || '';
            if (a.isTrainee === undefined) {
              a.isTrainee = !!(emp.isTrainee || emp.department === 'Training');
            }
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendances));
        }
      } catch (e) {}
      // Simpan ke riwayat karyawan terhapus (soft-delete) agar dapat dipulihkan di menu Pulihkan
      try {
        const deletedHistory = JSON.parse(localStorage.getItem('hotel_deleted_employees_history') || '[]');
        const upperId = id.toUpperCase().trim();
        const filtered = deletedHistory.filter(d => (d.id || '').toUpperCase().trim() !== upperId);
        filtered.push({
          ...emp,
          deletedAt: new Date().toISOString()
        });
        localStorage.setItem('hotel_deleted_employees_history', JSON.stringify(filtered));
      } catch (eHist) {}
    }

    const employees = Store.getEmployees().filter(e => e.id.toLowerCase() !== id.toLowerCase());
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));

    // Pastikan TIDAK dimasukkan ke daftar diabaikan (hotel_dismissed_recovery_ids)
    // Hapus dari dismissed jika sebelumnya ada, agar bisa muncul di menu Pulihkan
    try {
      const dismissed = JSON.parse(localStorage.getItem('hotel_dismissed_recovery_ids') || '[]');
      const upperId = id.toUpperCase().trim();
      const newDismissed = dismissed.filter(dId => (dId || '').toUpperCase().trim() !== upperId);
      localStorage.setItem('hotel_dismissed_recovery_ids', JSON.stringify(newDismissed));
    } catch (eDis) {}

    // Hapus dari daftar aktif di database MySQL (soft-delete, riwayat absensi makan tetap utuh di laporan)
    Store.apiPost('delete_employee', { id });
  },

  toggleEmployeeStatus(id) {
    const employees = Store.getEmployees();
    const emp = employees.find(e => e.id === id);
    if (emp) {
      emp.status = emp.status === 'Aktif' ? 'Non Aktif' : 'Aktif';
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
      // Sinkronkan ke database MySQL
      Store.apiPost('save_employee', emp);
      return emp;
    }
    return null;
  },

  findEmployee(idOrQuery) {
    if (!idOrQuery) return null;
    const clean = idOrQuery.trim().toLowerCase();
    const employees = Store.getEmployees();
    return employees.find(e => e.id.toLowerCase() === clean) || null;
  },

  findEmployeeByEmail(email) {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    const employees = Store.getEmployees();
    return employees.find(e => (e.email && e.email.toLowerCase() === clean)) || null;
  },

  // --- Pengaturan Tenant Dinamis ---
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      return { ...DEFAULT_SETTINGS };
    }
  },

  saveSettings(newSettings) {
    const current = Store.getSettings();
    const updated = { ...current, ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    // Sinkronkan ke database MySQL
    Store.apiPost('save_settings', updated);
    return updated;
  },

  getTenants() {
    const s = Store.getSettings();
    const defaultPrice = Number(s.mealPrice) || 15000;
    if (s.tenants && Array.isArray(s.tenants) && s.tenants.length > 0) {
      return s.tenants.map(t => ({
        ...t,
        price: (t.price !== undefined && t.price !== null && !isNaN(Number(t.price)) && Number(t.price) > 0)
          ? Number(t.price)
          : defaultPrice
      }));
    }
    const list = [];
    if (s.tenant1Name) list.push({ id: 'tenant1', name: s.tenant1Name, status: 'Aktif', price: defaultPrice });
    if (s.tenant2Name) list.push({ id: 'tenant2', name: s.tenant2Name, status: 'Aktif', price: defaultPrice });
    return list;
  },

  getTenantPrice(tenantKey) {
    if (!tenantKey) return Number(Store.getSettings().mealPrice) || 15000;
    const tenants = Store.getTenants();
    const cleanKey = String(tenantKey).trim().toLowerCase();
    const t = tenants.find(item => (item.id && item.id.toLowerCase() === cleanKey) || (item.name && item.name.toLowerCase() === cleanKey));
    if (t && t.price !== undefined && t.price !== null && !isNaN(Number(t.price)) && Number(t.price) > 0) {
      return Number(t.price);
    }
    const s = Store.getSettings();
    return Number(s.mealPrice) || 15000;
  },

  getTenantName(tenantKey) {
    if (!tenantKey) return 'Kantin Hotel';
    const cleanKey = String(tenantKey).trim().toLowerCase();
    const tenants = Store.getTenants();
    const t = tenants.find(item => (item.id && item.id.toLowerCase() === cleanKey) || (item.name && item.name.toLowerCase() === cleanKey));
    if (t) return t.name;

    const s = Store.getSettings();
    if (cleanKey === 'tenant1' && s.tenant1Name) return s.tenant1Name;
    if (cleanKey === 'tenant2' && s.tenant2Name) return s.tenant2Name;
    return tenantKey;
  },

  addTenant(name, password = null, price = null) {
    if (!name || !name.trim()) return null;
    const s = Store.getSettings();
    const tenants = Store.getTenants();
    const newId = 'tenant_' + Date.now().toString(36);
    const tenantPrice = (price !== null && price !== undefined && !isNaN(Number(price)) && Number(price) > 0)
      ? Number(price)
      : (Number(s.mealPrice) || 15000);
    const newTenant = {
      id: newId,
      name: name.trim(),
      password: password ? password.trim() : 'kantin123',
      price: tenantPrice,
      status: 'Aktif'
    };
    tenants.push(newTenant);
    Store.saveSettings({ tenants });
    return newTenant;
  },

  updateTenant(id, newName, newPrice = null, newPassword = null) {
    if (!id) return null;
    const tenants = Store.getTenants();
    const t = tenants.find(item => item.id === id);
    if (t) {
      const oldName = t.name;
      if (newName && newName.trim()) t.name = newName.trim();
      if (newPrice !== null && newPrice !== undefined && !isNaN(Number(newPrice)) && Number(newPrice) > 0) {
        t.price = Number(newPrice);
      }
      if (newPassword && newPassword.trim()) {
        t.password = newPassword.trim();
      }
      const s = Store.getSettings();
      if (id === 'tenant1') s.tenant1Name = t.name;
      if (id === 'tenant2') s.tenant2Name = t.name;
      s.tenants = tenants;
      Store.saveSettings(s);

      // Perbarui riwayat transaksi lokal agar nama tenant konsisten dan sinkron
      if (oldName && oldName !== t.name) {
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
          if (raw) {
            const list = JSON.parse(raw);
            let changed = false;
            list.forEach(a => {
              if (a.tenantId === id || a.tenantKey === id || a.tenantName === oldName || a.canteenName === oldName) {
                a.tenantName = t.name;
                a.canteenName = t.name;
                changed = true;
              }
            });
            if (changed) {
              localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(list));
            }
          }
        } catch (e) {}
      }

      return t;
    }
    return null;
  },

  updateTenantPrice(id, newPrice) {
    if (!id || isNaN(Number(newPrice)) || Number(newPrice) <= 0) return false;
    return !!this.updateTenant(id, null, Number(newPrice));
  },

  deleteTenant(id) {
    let tenants = Store.getTenants();
    if (tenants.length <= 1) {
      alert('Minimal harus ada 1 kantin/depot yang aktif.');
      return false;
    }
    tenants = tenants.filter(t => t.id !== id);
    Store.saveSettings({ tenants });
    return true;
  },

  // Core Rules
  evaluateShiftAndTime(dateObj = new Date()) {
    const settings = Store.getSettings();
    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    // 11.00 = 660 menit, 15.00 = 900 menit, 19.00 = 1140 menit, 10.00 = 600 menit
    const START_LUNCH = 11 * 60;   // 11:00
    const END_LUNCH = 15 * 60;     // 15:00
    const START_DINNER = 19 * 60;  // 19:00 
    const END_DINNER = 10 * 60;    // 10:00

    let shift = null;
    let isAllowed = false;

    if (timeInMinutes >= START_LUNCH && timeInMinutes <= END_LUNCH) {
      shift = 'Makan Siang';
      isAllowed = true;
    } else if (timeInMinutes > END_LUNCH && timeInMinutes < START_DINNER) {
      shift = 'Makan Sore';
      isAllowed = true;
    } else if (timeInMinutes >= START_DINNER || timeInMinutes <= END_DINNER) {
      shift = 'Makan Malam';
      isAllowed = true;
    } else {
      // 10:01 - 10:59: Kantin Tutup (persiapan pergantian shift siang)
      shift = 'Kantin Tutup';
      isAllowed = false;
    }

    if (settings && (settings.bypassTimeForTesting === true || settings.bypassTimeForTesting === '1')) {
      isAllowed = true;
      if (!shift || shift === 'Kantin Tutup') {
        shift = 'Makan Siang (Simulasi)';
      }
    }

    return {
      isAllowed,
      shift,
      timeString: dateObj.toLocaleTimeString('id-ID', { hour12: false })
    };
  },

  validateAttendance(employeeId, tenantKey, dateStr = null) {
    const settings = Store.getSettings();
    const targetDate = dateStr || Store.getTodayDateString();
    const currentTenantName = Store.getTenantName(tenantKey);

    // 1. Cek Karyawan Ada
    const employee = Store.findEmployee(employeeId);
    if (!employee) {
      return {
        success: false,
        valid: false,
        code: 'NOT_FOUND',
        message: `ID Karyawan "${employeeId}" tidak ditemukan dalam database karyawan.`
      };
    }

    // 2. Cek Status Karyawan
    if (employee.status !== 'Aktif') {
      return {
        success: false,
        valid: false,
        code: 'INACTIVE',
        employee,
        message: `Karyawan ${employee.name} berstatus NON-AKTIF. Tidak dapat mengambil jatah makan.`
      };
    }

    // 2b. Cek Tanggal Jatah: hanya boleh hari ini atau kemarin (backdate maks. 1 hari untuk shift malam)
    const todayStr = Store.getTodayDateString();
    const yesterdayStr = Store.getYesterdayDateString();
    if (targetDate !== todayStr && targetDate !== yesterdayStr) {
      return {
        success: false,
        valid: false,
        code: 'INVALID_DATE',
        employee,
        message: `Tanggal jatah makan hanya boleh hari ini (${todayStr}) atau kemarin (${yesterdayStr}) untuk keperluan shift malam.`
      };
    }

    // 3. Cek Jam Absensi
    const timeCheck = Store.evaluateShiftAndTime();
    if (!timeCheck.isAllowed) {
      return {
        success: false,
        valid: false,
        code: 'OUTSIDE_HOURS',
        employee,
        message: `Kantin saat ini sedang TUTUP (${timeCheck.timeString} WIB). Absensi hanya dapat dilakukan pada jam operasional: Makan Siang (11.00 - 15.00 WIB), Makan Sore (15.01 - 19.00 WIB), dan Makan Malam (19.00 - 10.00 WIB).`
      };
    }

    // 4. Cek Kuota 1x Makan Per Hari (Termasuk Cross-Depot)
    const attendances = Store.getAttendances();
    const existing = attendances.find(
      a => a.date === targetDate && 
           a.employeeId && a.employeeId.toLowerCase() === employee.id.toLowerCase() &&
           (!a.employeeName || !employee.name || a.employeeName.trim().toLowerCase() === employee.name.trim().toLowerCase())
    );

    if (existing) {
      return {
        success: false,
        valid: false,
        code: 'ALREADY_EATEN',
        employee,
        existingAttendance: existing,
        message: `Karyawan ${employee.name} (${employee.id}) SUDAH MAKAN untuk jatah tanggal ${targetDate} di "${existing.tenantName}" pada pukul ${existing.time} (${existing.shift}).`
      };
    }

    // 5. Cek Jarak Minimal 6 Jam dari Absen Terakhir (berdasarkan waktu scan sebenarnya)
    let lastScan = null;
    attendances.forEach(a => {
      if (a.employeeId && employee.id && a.employeeId.toLowerCase() === employee.id.toLowerCase()) {
        const dtStr = a.scannedAt || `${a.date} ${a.time}`;
        const t = new Date(String(dtStr).replace(' ', 'T'));
        if (!isNaN(t) && (!lastScan || t > lastScan)) lastScan = t;
      }
    });
    if (lastScan) {
      const diffMs = Date.now() - lastScan.getTime();
      if (diffMs >= 0 && diffMs < 6 * 3600 * 1000) {
        const nextT = new Date(lastScan.getTime() + 6 * 3600 * 1000);
        return {
          success: false,
          valid: false,
          code: 'TOO_SOON',
          employee,
          message: `Karyawan ${employee.name} baru absen makan pukul ${lastScan.toLocaleTimeString('id-ID', { hour12: false })} WIB. Jarak minimal antar absen adalah 6 jam — dapat absen lagi setelah pukul ${nextT.toLocaleTimeString('id-ID', { hour12: false })} WIB.`
        };
      }
    }

    return {
      success: true,
      valid: true,
      employee,
      shift: timeCheck.shift,
      tenantName: currentTenantName
    };
  },

  // --- Rekam Absensi Makan ---
  recordAttendance(employeeId, tenantKey, dateStr = null) {
    const validation = Store.validateAttendance(employeeId, tenantKey, dateStr);
    if (!validation.valid) {
      Store.playSound('error');
      return validation;
    }

    const now = new Date();
    const targetDate = dateStr || Store.getTodayDateString();
    const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
    const pad2 = n => String(n).padStart(2, '0');
    const scannedAt = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
    const settings = Store.getSettings();
    const tenantName = Store.getTenantName(tenantKey);

    const isTrn = !!(
      validation.employee.isTrainee ||
      validation.employee.department === 'Training' ||
      (validation.employee.id && validation.employee.id.toUpperCase().startsWith('TRN-'))
    );

    const newRecord = {
      id: 'ATT-' + Date.now().toString(36).toUpperCase(),
      date: targetDate,
      time: timeStr,
      scannedAt: scannedAt,
      employeeId: validation.employee.id,
      employeeName: validation.employee.name,
      department: validation.employee.department,
      position: validation.employee.position || '-',
      institution: validation.employee.institution || '',
      isTrainee: isTrn,
      tenantKey: tenantKey,
      tenantId: tenantKey,
      tenantName: tenantName,
      shift: validation.shift,
      price: Store.getTenantPrice(tenantKey),
      cost: Store.getTenantPrice(tenantKey)
    };

    const attendances = Store.getAttendances();
    attendances.unshift(newRecord);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendances));

    // Sinkronkan ke database MySQL
    Store.apiPost('record_attendance', newRecord);

    Store.playSound('success');
    return {
      success: true,
      valid: true,
      record: newRecord,
      message: `Berhasil! Absensi makan dicatat untuk ${newRecord.employeeName} (${newRecord.shift}) di ${tenantName}.`
    };
  },

  // --- Data Absensi ---
  getAttendances(startDate = null, endDate = null) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      let list = data ? JSON.parse(data) : [];

      // Normalisasi dwikunci tenantKey & tenantId agar selalu kompatibel di seluruh modul
      list.forEach(item => {
        if (!item.tenantKey && item.tenantId) item.tenantKey = item.tenantId;
        if (!item.tenantId && item.tenantKey) item.tenantId = item.tenantKey;
        // scannedAt = waktu scan sebenarnya; data lama (pra-revisi) tanggal jatah == tanggal scan
        if (!item.scannedAt && item.date && item.time) item.scannedAt = item.date + ' ' + item.time;
      });

      if (startDate && endDate) {
        list = list.filter(item => item.date >= startDate && item.date <= endDate);
      } else if (startDate) {
        list = list.filter(item => item.date === startDate);
      }
      return list;
    } catch (e) {
      return [];
    }
  },

  // Kosongkan seluruh data karyawan (disertai cadangan pengaman otomatis)
  clearAllEmployees() {
    const currentEmployees = Store.getEmployees();
    if (currentEmployees && currentEmployees.length > 0) {
      const backupPayload = {
        timestamp: new Date().toISOString(),
        count: currentEmployees.length,
        employees: currentEmployees
      };
      localStorage.setItem('hotel_employees_safety_backup', JSON.stringify(backupPayload));
    }
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify([]));
    // Sinkronkan ke database MySQL (yang juga menyimpan cadangan ke employees_safety_backup)
    Store.apiPost('clear_employees', {});
    return [];
  },

  // Periksa ketersediaan cadangan pengaman otomatis (hanya karyawan yang belum ada di database)
  getSafetyBackup() {
    try {
      const raw = localStorage.getItem('hotel_employees_safety_backup');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.employees) || parsed.employees.length === 0) {
        localStorage.removeItem('hotel_employees_safety_backup');
        return null;
      }

      // Bandingkan dengan data karyawan aktif saat ini dan daftar yang dihapus permanen
      const existingEmployees = Store.getEmployees();
      const existingIds = new Set(existingEmployees.map(e => (e.id || '').toUpperCase().trim()));
      const dismissedList = JSON.parse(localStorage.getItem('hotel_dismissed_recovery_ids') || '[]');
      const dismissedSet = new Set(dismissedList.map(id => (id || '').toUpperCase().trim()));

      const pendingEmployees = parsed.employees.filter(emp => {
        const uid = (emp.id || '').toUpperCase().trim();
        return uid && !existingIds.has(uid) && !dismissedSet.has(uid);
      });

      // Jika seluruh karyawan cadangan sudah ada di database saat ini, bersihkan backup usang
      if (pendingEmployees.length === 0) {
        localStorage.removeItem('hotel_employees_safety_backup');
        return null;
      }

      return {
        ...parsed,
        count: pendingEmployees.length,
        employees: pendingEmployees
      };
    } catch (e) {
      return null;
    }
  },

  // Pulihkan data karyawan dari cadangan pengaman otomatis
  async restoreSafetyBackupEmployees() {
    const backup = this.getSafetyBackup();
    if (backup && Array.isArray(backup.employees) && backup.employees.length > 0) {
      const currentEmployees = Store.getEmployees();
      const existingIds = new Set(currentEmployees.map(e => (e.id || '').toUpperCase().trim()));

      const toAdd = backup.employees.filter(e => {
        const uid = (e.id || '').toUpperCase().trim();
        return uid && !existingIds.has(uid);
      });

      const mergedEmployees = [...currentEmployees, ...toAdd];
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(mergedEmployees));
      localStorage.removeItem('hotel_employees_safety_backup');

      // Sinkronkan ke MySQL
      await Store.apiPost('restore_employees_safety', {});
      await Store.syncWithBackend(true);
      return {
        success: true,
        count: toAdd.length,
        timestamp: backup.timestamp,
        message: `Berhasil memulihkan ${toAdd.length} data karyawan dari cadangan pengaman!`
      };
    }

    // Jika di localStorage kosong, coba pulihkan langsung dari MySQL
    const res = await Store.apiPost('restore_employees_safety', {});
    if (res && res.success) {
      await Store.syncWithBackend(true);
      localStorage.removeItem('hotel_employees_safety_backup');
      return {
        success: true,
        count: res.restored_count || 0,
        message: res.message || 'Berhasil memulihkan data karyawan dari cadangan MySQL!'
      };
    }

    return {
      success: false,
      count: 0,
      message: 'Tidak ditemukan data cadangan pengaman untuk dipulihkan.'
    };
  },

  // Pulihkan / Rekonstruksi data karyawan dari seluruh riwayat absensi (Smart Attendance Recovery)
  async recoverEmployeesFromAttendance() {
    const attendances = Store.getAttendances();
    const existingEmployees = Store.getEmployees();
    const existingIds = new Set(existingEmployees.map(e => (e.id || '').toUpperCase()));
    
    // Kumpulkan seluruh profil unik karyawan dari riwayat transaksi absensi
    const recoveredMap = new Map();
    attendances.forEach(att => {
      const rawId = (att.employeeId || '').trim();
      if (!rawId) return;
      const upperId = rawId.toUpperCase();
      if (!existingIds.has(upperId) && !recoveredMap.has(upperId)) {
        const isTrn = !!(att.isTrainee || att.department === 'Training' || upperId.startsWith('TRN-'));
        recoveredMap.set(upperId, {
          id: rawId,
          name: att.employeeName || rawId,
          department: att.department || (isTrn ? 'Training' : 'Housekeeping'),
          position: att.position || (isTrn ? 'Trainee' : 'Staff'),
          institution: att.institution || '',
          isTrainee: isTrn,
          password: 'password123',
          status: 'Aktif',
          createdAt: new Date().toISOString()
        });
      }
    });

    const recoveredList = Array.from(recoveredMap.values());
    if (recoveredList.length > 0) {
      const mergedEmployees = [...existingEmployees, ...recoveredList];
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(mergedEmployees));
      // Simpan batch ke MySQL
      await Store.apiPost('batch_save_employees', { employees: recoveredList });
    }

    // Rekonstruksi juga di sisi database MySQL langsung
    const apiRes = await Store.apiPost('recover_employees_from_attendance', {});
    await Store.syncWithBackend(true);

    const totalRecovered = recoveredList.length || (apiRes && apiRes.recovered_count) || 0;
    return {
      success: totalRecovered > 0,
      count: totalRecovered,
      message: totalRecovered > 0 
        ? `Berhasil merekonstruksi ${totalRecovered} data karyawan dari riwayat absensi makan!`
        : 'Tidak ada karyawan yang dapat diekstrak dari riwayat absensi (data sudah lengkap atau riwayat kosong).'
    };
  },

  // Ambil daftar kandidat karyawan dari riwayat absensi yang saat ini belum ada di database
  async getAttendanceRecoveryCandidates() {
    const attendances = Store.getAttendances();
    const existingEmployees = Store.getEmployees();
    const existingIds = new Set(existingEmployees.map(e => (e.id || '').toUpperCase().trim()));

    const dismissedList = JSON.parse(localStorage.getItem('hotel_dismissed_recovery_ids') || '[]');
    const dismissedSet = new Set(dismissedList.map(id => (id || '').toUpperCase().trim()));

    const candidateMap = new Map();
    attendances.forEach(att => {
      const rawId = (att.employeeId || '').trim();
      if (!rawId) return;
      const upperId = rawId.toUpperCase();
      if (existingIds.has(upperId) || dismissedSet.has(upperId)) return;

      if (!candidateMap.has(upperId)) {
        const isTrn = !!(att.isTrainee || att.department === 'Training' || upperId.startsWith('TRN-'));
        candidateMap.set(upperId, {
          id: rawId,
          name: att.employeeName || rawId,
          department: att.department || (isTrn ? 'Training' : 'Housekeeping'),
          position: att.position || (isTrn ? 'Trainee' : 'Staff'),
          institution: att.institution || '',
          isTrainee: isTrn,
          password: 'password123',
          status: 'Aktif',
          lastMealDate: att.date || '-',
          totalMeals: 1,
          source: 'Riwayat Absensi'
        });
      } else {
        const c = candidateMap.get(upperId);
        c.totalMeals = (c.totalMeals || 1) + 1;
        if (att.date && (!c.lastMealDate || att.date > c.lastMealDate)) {
          c.lastMealDate = att.date;
        }
      }
    });

    // Ambil juga kandidat dari database MySQL jika terhubung
    try {
      const res = await Store.apiPost('get_attendance_recovery_candidates', {});
      if (res && res.success && Array.isArray(res.candidates)) {
        res.candidates.forEach(c => {
          const upperId = (c.id || '').toUpperCase().trim();
          if (upperId && !existingIds.has(upperId) && !dismissedSet.has(upperId) && !candidateMap.has(upperId)) {
            candidateMap.set(upperId, {
              id: c.id,
              name: c.name || c.id,
              department: c.department || 'Housekeeping',
              position: c.position || 'Staff',
              institution: c.institution || '',
              isTrainee: !!c.isTrainee,
              password: 'password123',
              status: 'Aktif',
              lastMealDate: c.lastMealDate || '-',
              totalMeals: c.totalMeals || 1,
              source: 'Riwayat Absensi (MySQL)'
            });
          }
        });
      }
    } catch (err) {}

    return Array.from(candidateMap.values());
  },

  // Ambil daftar kandidat karyawan dari cadangan pengaman (safety backup)
  async getSafetyBackupCandidates() {
    const backup = Store.getSafetyBackup();
    const existingEmployees = Store.getEmployees();
    const existingIds = new Set(existingEmployees.map(e => (e.id || '').toUpperCase().trim()));

    const dismissedList = JSON.parse(localStorage.getItem('hotel_dismissed_recovery_ids') || '[]');
    const dismissedSet = new Set(dismissedList.map(id => (id || '').toUpperCase().trim()));

    const candidateMap = new Map();

    // 1. Ambil dari riwayat karyawan yang baru saja dihapus (soft delete)
    try {
      const deletedHistory = JSON.parse(localStorage.getItem('hotel_deleted_employees_history') || '[]');
      if (Array.isArray(deletedHistory)) {
        deletedHistory.forEach(emp => {
          const upperId = (emp.id || '').toUpperCase().trim();
          if (upperId && !existingIds.has(upperId) && !dismissedSet.has(upperId)) {
            candidateMap.set(upperId, {
              ...emp,
              source: 'Karyawan Dihapus (Dapat Dipulihkan)'
            });
          }
        });
      }
    } catch (e) {}

    // 2. Ambil dari cadangan pengaman lokal
    if (backup && Array.isArray(backup.employees)) {
      backup.employees.forEach(emp => {
        const upperId = (emp.id || '').toUpperCase().trim();
        if (upperId && !existingIds.has(upperId) && !dismissedSet.has(upperId) && !candidateMap.has(upperId)) {
          candidateMap.set(upperId, {
            ...emp,
            source: 'Cadangan Pengaman Lokal',
            backupDate: backup.timestamp
          });
        }
      });
    }

    // 3. Ambil dari database MySQL
    try {
      const res = await Store.apiPost('get_safety_backup_candidates', {});
      if (res && res.success && Array.isArray(res.candidates)) {
        res.candidates.forEach(c => {
          const upperId = (c.id || '').toUpperCase().trim();
          if (upperId && !existingIds.has(upperId) && !dismissedSet.has(upperId) && !candidateMap.has(upperId)) {
            candidateMap.set(upperId, {
              ...c,
              source: c.source || 'Cadangan Pengaman (MySQL)'
            });
          }
        });
      }
    } catch (err) {}

    return Array.from(candidateMap.values());
  },

  // Hapus Karyawan Permanen (HANYA DARI FITUR PULIHKAN)
  // Data makan di laporan tetap 100% utuh
  async permanentDeleteEmployee(id, name) {
    if (!id) return { success: false, message: 'ID tidak valid' };
    const upperId = id.toUpperCase().trim();

    // 1. Hapus dari riwayat terhapus sementara
    try {
      const deletedHistory = JSON.parse(localStorage.getItem('hotel_deleted_employees_history') || '[]');
      const filtered = deletedHistory.filter(d => (d.id || '').toUpperCase().trim() !== upperId);
      localStorage.setItem('hotel_deleted_employees_history', JSON.stringify(filtered));
    } catch (e) {}

    // 2. Masukkan ke hotel_dismissed_recovery_ids agar tidak pernah muncul lagi di saran pemulihan
    try {
      const dismissed = JSON.parse(localStorage.getItem('hotel_dismissed_recovery_ids') || '[]');
      if (!dismissed.includes(upperId)) {
        dismissed.push(upperId);
        localStorage.setItem('hotel_dismissed_recovery_ids', JSON.stringify(dismissed));
      }
    } catch (e) {}

    // 3. Pastikan juga terhapus dari daftar karyawan aktif jika masih ada
    const employees = Store.getEmployees().filter(e => e.id.toUpperCase().trim() !== upperId);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));

    // 4. Hapus permanen di database MySQL (riwayat absensi makan tetap utuh di laporan)
    await Store.apiPost('permanent_delete_employee', { id, name });

    return { 
      success: true, 
      message: `Karyawan "${name || id}" berhasil dihapus permanen. Seluruh data makan di laporan tetap tersimpan utuh.` 
    };
  },

  // Abaikan / Hapus kandidat dari saran pemulihan secara permanen (Alias untuk permanentDeleteEmployee)
  async dismissRecoveryCandidate(id, name) {
    return await this.permanentDeleteEmployee(id, name);
  },

  // Pulihkan karyawan secara SATU PER SATU
  async restoreSingleEmployee(candidate) {
    if (!candidate || !candidate.id) {
      return { success: false, message: 'Data karyawan tidak valid.' };
    }

    const employees = Store.getEmployees();
    const upperId = candidate.id.toUpperCase().trim();
    const existsIdx = employees.findIndex(e => e.id.toUpperCase().trim() === upperId);

    const cleanEmp = {
      id: candidate.id.trim(),
      name: candidate.name ? candidate.name.trim() : candidate.id.trim(),
      department: candidate.department || 'Housekeeping',
      position: candidate.position || 'Staff',
      institution: candidate.institution || '',
      isTrainee: !!candidate.isTrainee,
      password: candidate.password || 'password123',
      status: 'Aktif'
    };

    if (existsIdx >= 0) {
      employees[existsIdx] = cleanEmp;
    } else {
      employees.push(cleanEmp);
    }

    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));

    // Bersihkan dari riwayat soft-deleted dan daftar diabaikan
    try {
      const deletedHistory = JSON.parse(localStorage.getItem('hotel_deleted_employees_history') || '[]');
      const filteredHist = deletedHistory.filter(d => (d.id || '').toUpperCase().trim() !== upperId);
      localStorage.setItem('hotel_deleted_employees_history', JSON.stringify(filteredHist));

      const dismissed = JSON.parse(localStorage.getItem('hotel_dismissed_recovery_ids') || '[]');
      const filteredDismissed = dismissed.filter(dId => (dId || '').toUpperCase().trim() !== upperId);
      localStorage.setItem('hotel_dismissed_recovery_ids', JSON.stringify(filteredDismissed));
    } catch (e) {}

    await Store.apiPost('save_employee', cleanEmp);
    await Store.syncWithBackend(true);

    return {
      success: true,
      employee: cleanEmp,
      message: `Karyawan "${cleanEmp.name}" (${cleanEmp.id}) berhasil dipulihkan ke database!`
    };
  },

  // Pulihkan beberapa karyawan terpilih sekaligus (Multiple Select)
  async restoreMultipleEmployees(candidateList) {
    if (!Array.isArray(candidateList) || candidateList.length === 0) {
      return { success: false, count: 0, message: 'Tidak ada karyawan yang dipilih.' };
    }

    const employees = Store.getEmployees();
    const existingMap = new Map();
    employees.forEach((e, idx) => existingMap.set(e.id.toUpperCase().trim(), idx));

    let restoredCount = 0;
    const cleanList = [];
    const restoredUpperIds = new Set();

    candidateList.forEach(c => {
      if (!c || !c.id) return;
      const upperId = c.id.toUpperCase().trim();
      restoredUpperIds.add(upperId);
      const cleanEmp = {
        id: c.id.trim(),
        name: c.name ? c.name.trim() : c.id.trim(),
        department: c.department || 'Housekeeping',
        position: c.position || 'Staff',
        institution: c.institution || '',
        isTrainee: !!c.isTrainee,
        password: c.password || 'password123',
        status: 'Aktif'
      };
      cleanList.push(cleanEmp);

      if (existingMap.has(upperId)) {
        employees[existingMap.get(upperId)] = cleanEmp;
      } else {
        employees.push(cleanEmp);
        existingMap.set(upperId, employees.length - 1);
      }
      restoredCount++;
    });

    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));

    // Bersihkan dari riwayat soft-deleted dan daftar diabaikan
    try {
      const deletedHistory = JSON.parse(localStorage.getItem('hotel_deleted_employees_history') || '[]');
      const filteredHist = deletedHistory.filter(d => !restoredUpperIds.has((d.id || '').toUpperCase().trim()));
      localStorage.setItem('hotel_deleted_employees_history', JSON.stringify(filteredHist));

      const dismissed = JSON.parse(localStorage.getItem('hotel_dismissed_recovery_ids') || '[]');
      const filteredDismissed = dismissed.filter(dId => !restoredUpperIds.has((dId || '').toUpperCase().trim()));
      localStorage.setItem('hotel_dismissed_recovery_ids', JSON.stringify(filteredDismissed));
    } catch (e) {}

    await Store.apiPost('batch_save_employees', { employees: cleanList });
    await Store.syncWithBackend(true);

    return {
      success: true,
      count: restoredCount,
      message: `Berhasil memulihkan ${restoredCount} karyawan terpilih!`
    };
  },

  // Kosongkan seluruh riwayat absensi
  clearAllAttendances() {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    // Sinkronkan ke database MySQL
    Store.apiPost('clear_attendances', {});
    return [];
  },

  // Ekspor seluruh database ke file JSON (Backup Mandiri)
  exportAllDataJSON() {
    this.exportBackupJSON();
  },

  exportBackupJSON() {
    const backupData = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      hotelName: Store.getSettings().hotelName || 'BeSS Mansion Hotel Surabaya',
      settings: Store.getSettings(),
      departments: Store.getDepartments(),
      tenants: Store.getTenants(),
      employees: Store.getEmployees(),
      attendances: Store.getAttendances()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", url);
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    dlAnchor.setAttribute("download", `backup_absen_hotel_${dateStamp}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    document.body.removeChild(dlAnchor);
    URL.revokeObjectURL(url);
  },

  // Ekspor seluruh data absensi & master ke file SQL Dump untuk phpMyAdmin
  exportSQLDump() {
    const s = Store.getSettings();
    const hotelName = s.hotelName || 'BeSS Mansion Hotel Surabaya';
    const attendances = Store.getAttendances();
    const employees = Store.getEmployees();
    const tenants = Store.getTenants();
    const dateStamp = new Date().toISOString().slice(0, 10);

    let sql = `-- ========================================================\n`;
    sql += `-- BACKUP DATABASE: absen_makan_hotel\n`;
    sql += `-- HOTEL: ${hotelName}\n`;
    sql += `-- TANGGAL BACKUP: ${new Date().toLocaleString('id-ID')} WIB\n`;
    sql += `-- TOTAL DATA: ${attendances.length} Transaksi Absensi, ${employees.length} Karyawan, ${tenants.length} Kantin\n`;
    sql += `-- ========================================================\n\n`;

    sql += `CREATE DATABASE IF NOT EXISTS \`absen_makan_hotel\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`;
    sql += `USE \`absen_makan_hotel\`;\n\n`;

    // 1. Tenants Dump
    if (tenants.length > 0) {
      sql += `-- 1. DATA KANTIN / DEPOT\n`;
      sql += `INSERT INTO \`tenants\` (\`tenant_key\`, \`name\`, \`password\`, \`status\`) VALUES\n`;
      const tenantRows = tenants.map(t => {
        const key = (t.id || t.tenantKey || '').replace(/'/g, "''");
        const name = (t.name || '').replace(/'/g, "''");
        const pass = (t.password || 'kantin123').replace(/'/g, "''");
        const st = (t.status || 'Aktif').replace(/'/g, "''");
        return `  ('${key}', '${name}', '${pass}', '${st}')`;
      });
      sql += tenantRows.join(',\n') + `\nON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`password\` = VALUES(\`password\`);\n\n`;
    }

    // 2. Employees Dump
    if (employees.length > 0) {
      sql += `-- 2. DATA KARYAWAN & SISWA TRAINING\n`;
      sql += `INSERT INTO \`employees\` (\`employee_id\`, \`name\`, \`department\`, \`position\`, \`institution\`, \`is_trainee\`, \`password\`, \`status\`) VALUES\n`;
      const empRows = employees.map(e => {
        const eid = (e.id || '').replace(/'/g, "''");
        const name = (e.name || '').replace(/'/g, "''");
        const dept = (e.department || '').replace(/'/g, "''");
        const pos = (e.position || '').replace(/'/g, "''");
        const inst = (e.institution || '').replace(/'/g, "''");
        const isTrn = e.isTrainee || e.department === 'Training' || eid.startsWith('TRN-') ? 1 : 0;
        const pass = (e.password || 'password123').replace(/'/g, "''");
        const st = (e.status || 'Aktif').replace(/'/g, "''");
        return `  ('${eid}', '${name}', '${dept}', '${pos}', '${inst}', ${isTrn}, '${pass}', '${st}')`;
      });
      sql += empRows.join(',\n') + `\nON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`department\` = VALUES(\`department\`);\n\n`;
    }

    // 3. Attendances Dump
    if (attendances.length > 0) {
      sql += `-- 3. DATA RIWAYAT TRANSAKSI ABSENSI MAKAN\n`;
      sql += `INSERT INTO \`attendance_logs\` (\`date\`, \`time\`, \`employee_id\`, \`employee_name\`, \`department\`, \`position\`, \`institution\`, \`is_trainee\`, \`shift\`, \`tenant_id\`, \`tenant_name\`, \`price\`) VALUES\n`;
      const attRows = attendances.map(a => {
        const dt = (a.date || '').replace(/'/g, "''");
        const tm = (a.time || '12:00:00').replace(/'/g, "''");
        const eid = (a.employeeId || '').replace(/'/g, "''");
        const ename = (a.employeeName || '').replace(/'/g, "''");
        const dept = (a.department || '').replace(/'/g, "''");
        const pos = (a.position || '').replace(/'/g, "''");
        const inst = (a.institution || '').replace(/'/g, "''");
        const isTrn = a.isTrainee ? 1 : 0;
        const shift = (a.shift || 'Makan Siang').replace(/'/g, "''");
        const tid = (a.tenantId || a.tenantKey || 'tenant1').replace(/'/g, "''");
        const tname = (a.tenantName || 'Kantin').replace(/'/g, "''");
        const pr = Number(a.price) || Number(s.mealPrice) || 15000;
        return `  ('${dt}', '${tm}', '${eid}', '${ename}', '${dept}', '${pos}', '${inst}', ${isTrn}, '${shift}', '${tid}', '${tname}', ${pr})`;
      });
      sql += attRows.join(',\n') + `\nON DUPLICATE KEY UPDATE \`time\` = VALUES(\`time\`);\n\n`;
    }

    const blob = new Blob([sql], { type: 'application/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_sql_absen_hotel_${dateStamp}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Pulihkan Data dari file JSON Backup
  importBackupJSON() {
    const fileInput = document.getElementById('backup-restore-file');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      alert('Silakan pilih berkas backup (*.json) terlebih dahulu.');
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || typeof data !== 'object') {
          throw new Error('Format file cadangan tidak valid.');
        }

        let restoredItems = 0;
        if (Array.isArray(data.employees)) {
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(data.employees));
          restoredItems += data.employees.length;
        }
        if (Array.isArray(data.attendances)) {
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(data.attendances));
          restoredItems += data.attendances.length;
        }
        if (Array.isArray(data.tenants)) {
          localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(data.tenants));
        }
        if (data.settings && typeof data.settings === 'object') {
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
        }

        // Sinkronkan ke database MySQL
        Store.syncWithBackend(true);

        alert(`Sukses memulihkan cadangan data!\n- Total entri diperbarui: ${restoredItems}\nSistem akan memuat ulang halaman.`);
        window.location.reload();
      } catch (err) {
        alert('Gagal membaca file cadangan: ' + err.message);
      }
    };
    reader.readAsText(file);
  },

  // Reset/Seed ulang data
  resetToDefault() {
    localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    Store.init();
  }
};

// Inisialisasi otomatis
Store.init();
window.Store = Store;
window.DEPARTMENTS = DEPARTMENTS;
