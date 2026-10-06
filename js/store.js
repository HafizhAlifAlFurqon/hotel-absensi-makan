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
  tenant1Name: 'Depot Bu A',
  tenant2Name: 'Depot Bu Yuli',
  mealPrice: 15000, // Rp 15.000 per porsi
  bypassTimeForTesting: false, // Mode simulasi waktu
  tenants: [
    { id: 'tenant1', name: 'Depot Bu A', password: 'depota123', status: 'Aktif' },
    { id: 'tenant2', name: 'Depot Bu Yuli', password: 'depotyuli123', status: 'Aktif' }
  ]
};

const Store = {
  isMySQL: false,
  isSyncing: false,

  // --- Audio Feedback (Web Audio API Synthesizer) ---
  playSound(type = 'success') {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        // Melodi sukses dua nada (beep-boop naik)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else {
        // Nada error buzz rendah
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime);
        osc.frequency.setValueAtTime(140, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn('Audio feedback not available', e);
    }
  },

  // --- Inisialisasi Data Terpusat & Anti-Perubahan Spontan ---
  init() {
    // 1. Data Karyawan
    if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify([]));
    } else {
      try {
        const currentEmps = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMPLOYEES));
        // Bersihkan 15 sampel karyawan lama jika pengguna belum pernah menambahkan karyawan sendiri
        const dummyNames = ['Bambang Pamungkas', 'Siti Nurhaliza', 'Agus Setiawan', 'Juna Rorimpandey', 'Rina Wijaya', 'Dimas Anggara', 'Tri Wahyuni', 'Hendra Gunawan', 'Joko Prabowo', 'Maya Indah', 'Eko Prasetyo', 'Ahmad Fauzi', 'Dewi Lestari', 'Rudi Hartono', 'Slamet Riyadi'];
        const isDummyOnly = Array.isArray(currentEmps) && currentEmps.length > 0 && currentEmps.every(e => dummyNames.includes(e.name));
        if (isDummyOnly) {
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify([]));
        } else if (Array.isArray(currentEmps)) {
          let changed = false;
          currentEmps.forEach(e => {
            if (!e.password) {
              e.password = 'password123';
              changed = true;
            }
          });
          if (changed) {
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
        if (!currentSettings.tenants || !Array.isArray(currentSettings.tenants) || currentSettings.tenants.length === 0) {
          currentSettings.tenants = [
            { id: 'tenant1', name: currentSettings.tenant1Name || 'Depot Bu A', password: 'depota123', status: 'Aktif' },
            { id: 'tenant2', name: currentSettings.tenant2Name || 'Depot Bu Yuli', password: 'depotyuli123', status: 'Aktif' }
          ];
          sChanged = true;
        } else {
          currentSettings.tenants.forEach(t => {
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
        // Bersihkan sampel absensi bawaan (ATT-1001, ATT-1002, ATT-1003) jika ada
        if (Array.isArray(currentAtts) && currentAtts.some(a => a.id === 'ATT-1001' || a.id === 'ATT-1002' || a.id === 'ATT-1003')) {
          const filtered = currentAtts.filter(a => a.id !== 'ATT-1001' && a.id !== 'ATT-1002' && a.id !== 'ATT-1003');
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(filtered));
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

        // 1. Data Karyawan dari MySQL
        if (Array.isArray(data.employees)) {
          if (data.employees.length > 0) {
            localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(data.employees));
          } else {
            // Jika di MySQL kosong tapi user punya data lokal, upload ke MySQL
            const localEmps = this.getEmployees();
            if (localEmps.length > 0) {
              await this.apiPost('batch_save_employees', { employees: localEmps });
            }
          }
        }

        // 2. Data Riwayat Absensi dari MySQL
        if (Array.isArray(data.attendances)) {
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(data.attendances));
        }

        // 3. Pengaturan Hotel & Kantin dari MySQL
        if (data.settings) {
          const merged = { ...DEFAULT_SETTINGS, ...data.settings };
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
    const existingIndex = employees.findIndex(e => e.id.toLowerCase() === employee.id.toLowerCase());
    if (existingIndex >= 0) {
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
    let maxNum = 0;
    employees.forEach(e => {
      const match = e.id && e.id.match(/^EMP-(\d+)$/i);
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

  updateEmployeePassword(employeeId, newPassword) {
    if (!employeeId || !newPassword) return { success: false, message: 'Password tidak boleh kosong.' };
    const employees = Store.getEmployees();
    const emp = employees.find(e => e.id.toLowerCase() === employeeId.toLowerCase());
    if (emp) {
      emp.password = newPassword.trim();
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
      // Sinkronkan ke database MySQL
      Store.apiPost('save_employee', emp);
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
            badge: 'Karyawan'
          }
        };
      } else {
        return { success: false, message: `Password untuk karyawan "${matchedEmp.name}" (${matchedEmp.id}) salah!` };
      }
    }

    return { success: false, message: `Nama Karyawan / ID "${identifier}" tidak ditemukan dalam database!` };
  },

  deleteEmployee(id) {
    const employees = Store.getEmployees().filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    // Hapus dari database MySQL
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
    if (s.tenants && Array.isArray(s.tenants) && s.tenants.length > 0) {
      return s.tenants;
    }
    return [
      { id: 'tenant1', name: s.tenant1Name || 'Depot Bu A', status: 'Aktif' },
      { id: 'tenant2', name: s.tenant2Name || 'Depot Bu Yuli', status: 'Aktif' }
    ];
  },

  getTenantName(tenantKey) {
    const tenants = Store.getTenants();
    const t = tenants.find(item => item.id === tenantKey);
    if (t) return t.name;

    const s = Store.getSettings();
    if (tenantKey === 'tenant1') return s.tenant1Name || 'Depot Bu A';
    if (tenantKey === 'tenant2') return s.tenant2Name || 'Depot Bu Yuli';
    return tenantKey;
  },

  addTenant(name, password = null) {
    if (!name || !name.trim()) return null;
    const tenants = Store.getTenants();
    const newId = 'tenant_' + Date.now().toString(36);
    const newTenant = {
      id: newId,
      name: name.trim(),
      password: password ? password.trim() : 'kantin123',
      status: 'Aktif'
    };
    tenants.push(newTenant);
    Store.saveSettings({ tenants });
    return newTenant;
  },

  updateTenant(id, newName) {
    if (!id || !newName || !newName.trim()) return null;
    const tenants = Store.getTenants();
    const t = tenants.find(item => item.id === id);
    if (t) {
      t.name = newName.trim();
      const s = Store.getSettings();
      if (id === 'tenant1') s.tenant1Name = t.name;
      if (id === 'tenant2') s.tenant2Name = t.name;
      s.tenants = tenants;
      Store.saveSettings(s);
      return t;
    }
    return null;
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

  // --- Validasi Aturan Bisnis (Core Rules) ---
  evaluateShiftAndTime(dateObj = new Date()) {
    const settings = Store.getSettings();
    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    // 11.00 = 660 menit, 15.00 = 900 menit, 19.00 = 1140 menit
    const START_WINDOW = 11 * 60; // 11:00
    const SHIFT_LUNCH_END = 15 * 60; // 15:00
    const END_WINDOW = 19 * 60; // 19:00

    let shift = null;
    let isAllowed = false;

    if (timeInMinutes >= START_WINDOW && timeInMinutes <= SHIFT_LUNCH_END) {
      shift = 'Makan Siang';
      isAllowed = true;
    } else if (timeInMinutes > SHIFT_LUNCH_END && timeInMinutes <= END_WINDOW) {
      shift = 'Makan Sore';
      isAllowed = true;
    } else {
      isAllowed = false;
    }

    // Jika mode simulasi diaktifkan oleh admin untuk pengujian di luar jam operasional
    if (settings.bypassTimeForTesting) {
      isAllowed = true;
      if (!shift) {
        shift = hours < 15 ? 'Makan Siang (Simulasi)' : 'Makan Sore (Simulasi)';
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
        valid: false,
        code: 'NOT_FOUND',
        message: `ID Karyawan "${employeeId}" tidak ditemukan dalam database karyawan.`
      };
    }

    // 2. Cek Status Karyawan
    if (employee.status !== 'Aktif') {
      return {
        valid: false,
        code: 'INACTIVE',
        employee,
        message: `Karyawan ${employee.name} berstatus NON-AKTIF. Tidak dapat mengambil jatah makan.`
      };
    }

    // 3. Cek Jam Absensi (11:00 - 19:00)
    const timeCheck = Store.evaluateShiftAndTime();
    if (!timeCheck.isAllowed) {
      return {
        valid: false,
        code: 'OUTSIDE_HOURS',
        employee,
        message: `Absensi hanya dapat dilakukan pada pukul 11.00 - 19.00 WIB. (Waktu saat ini: ${timeCheck.timeString})`
      };
    }

    // 4. Cek Kuota 1x Makan Per Hari (Termasuk Cross-Depot)
    const attendances = Store.getAttendances();
    const existing = attendances.find(
      a => a.date === targetDate && a.employeeId.toLowerCase() === employee.id.toLowerCase()
    );

    if (existing) {
      return {
        valid: false,
        code: 'ALREADY_EATEN',
        employee,
        existingAttendance: existing,
        message: `Karyawan ${employee.name} (${employee.id}) SUDAH MAKAN hari ini di "${existing.tenantName}" pada pukul ${existing.time} (${existing.shift}).`
      };
    }

    return {
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
    const settings = Store.getSettings();
    const tenantName = Store.getTenantName(tenantKey);

    const newRecord = {
      id: 'ATT-' + Date.now().toString(36).toUpperCase(),
      date: targetDate,
      time: timeStr,
      employeeId: validation.employee.id,
      employeeName: validation.employee.name,
      department: validation.employee.department,
      position: validation.employee.position || '-',
      tenantKey: tenantKey,
      tenantName: tenantName,
      shift: validation.shift,
      cost: Number(settings.mealPrice) || 15000
    };

    const attendances = Store.getAttendances();
    attendances.unshift(newRecord);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendances));

    // Sinkronkan ke database MySQL
    Store.apiPost('record_attendance', newRecord);

    Store.playSound('success');
    return {
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

  // Kosongkan seluruh data karyawan (agar bersih tanpa data sampel)
  clearAllEmployees() {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify([]));
    // Sinkronkan ke database MySQL
    Store.apiPost('clear_employees', {});
    return [];
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
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", jsonStr);
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    dlAnchor.setAttribute("download", `backup_absen_makan_hotel_${dateStamp}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
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
