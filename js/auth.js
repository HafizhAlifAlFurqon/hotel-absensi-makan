/**
 * auth.js - Pengelolaan Autentikasi Nama & Password Serta Hak Akses (RBAC)
 * Mendukung Halaman Login Mandiri (Standalone) & Transisi Otomatis ke Dashboard
 */

const Auth = {
  ROLES: {
    ADMIN: 'admin',
    CANTEEN: 'canteen',
    KARYAWAN: 'karyawan'
  },

  getCurrentUser() {
    try {
      const data = localStorage.getItem('hotel_absensi_current_user');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user) {
    if (window.AttendanceManager && typeof window.AttendanceManager.closeScanModal === 'function') {
      window.AttendanceManager.closeScanModal();
      const resBox = document.getElementById('emp-portal-result');
      if (resBox) resBox.innerHTML = '';
    }
    if (user) {
      localStorage.setItem('hotel_absensi_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('hotel_absensi_current_user');
    }
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: user }));
    Auth.enforceRBAC();
  },

  getActiveEmployeeId() {
    const user = Auth.getCurrentUser();
    if (user && user.role === 'karyawan' && user.employeeId) {
      return user.employeeId;
    }
    const saved = localStorage.getItem('hotel_absensi_active_emp_id');
    if (saved) return saved;
    const emps = (window.Store && typeof Store.getEmployees === 'function') ? Store.getEmployees() : [];
    return (emps.length > 0) ? emps[0].id : '';
  },

  setActiveEmployeeId(empId) {
    localStorage.setItem('hotel_absensi_active_emp_id', empId);
    const emp = Store.findEmployee(empId);
    const user = Auth.getCurrentUser();
    if (emp && user && user.role === 'karyawan') {
      user.employeeId = emp.id;
      user.name = emp.name;
      user.department = emp.department;
      user.position = emp.position;
      Auth.setCurrentUser(user);
    }
  },

  getAvatar(name, bg = '047857') {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${bg}&color=fff&rounded=true&bold=true`;
  },

  // Tampilkan Halaman Login Sendiri & Sembunyikan Seluruh Shell Aplikasi
  showLoginPage() {
    const loginPage = document.getElementById('page-login');
    const appShell = document.getElementById('app-shell');
    if (loginPage) loginPage.classList.remove('hidden');
    if (appShell) appShell.classList.add('hidden');

    // Sembunyikan dialog login modal jika ada
    const oldModal = document.getElementById('login-modal');
    if (oldModal) oldModal.classList.add('hidden');

    // Sembunyikan semua page view
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));

    // Reset input di form halaman login & kembalikan tombol ke state normal
    const idEl = document.getElementById('login-page-identifier');
    const passEl = document.getElementById('login-page-password');
    const alertEl = document.getElementById('login-page-alert');
    const btnEl = document.getElementById('login-submit-btn');

    if (idEl) {
      idEl.value = '';
      setTimeout(() => idEl.focus(), 120);
    }
    if (passEl) passEl.value = '';
    if (alertEl) alertEl.innerHTML = '';
    if (btnEl) {
      btnEl.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket text-base"></i><span>Masuk Sekarang</span>';
      btnEl.disabled = false;
    }

    if (typeof window.renderQuickLoginButtons === 'function') {
      window.renderQuickLoginButtons();
    }
  },

  // Sembunyikan Halaman Login & Tampilkan Shell Aplikasi (Header, Nav, Dashboard)
  hideLoginPage() {
    const loginPage = document.getElementById('page-login');
    const appShell = document.getElementById('app-shell');
    if (loginPage) loginPage.classList.add('hidden');
    if (appShell) appShell.classList.remove('hidden');

    const oldModal = document.getElementById('login-modal');
    if (oldModal) oldModal.classList.add('hidden');

    // Kembalikan tombol ke state normal agar saat pengguna logout tidak stuck
    const btnEl = document.getElementById('login-submit-btn');
    if (btnEl) {
      btnEl.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket text-base"></i><span>Masuk Sekarang</span>';
      btnEl.disabled = false;
    }
  },

  // Login dengan Password Sendiri (Karyawan, Kasir Kantin, Admin)
  async loginWithPassword(identifier, password) {
    let response;
    try {
      response = await fetch('api.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ identifier, password })
      });
    } catch (error) {
      return { success: false, message: 'Server login tidak dapat dihubungi.' };
    }

    const res = await response.json();
    if (!response.ok || !res.success || !res.user) {
      return { success: false, message: res.message || 'Username atau password salah.' };
    }

    const user = res.user;
    if (user.mustChangePassword) {
      const newPassword = window.prompt('Password akun ini masih bawaan. Buat password baru minimal 12 karakter:');
      if (!newPassword) {
        await fetch('api.php?action=logout', { method: 'POST', credentials: 'same-origin' });
        return { success: false, message: 'Password bawaan harus diganti sebelum dapat masuk.' };
      }
      const confirmation = window.prompt('Ulangi password baru untuk konfirmasi:');
      if (newPassword !== confirmation || newPassword.trim().length < 12) {
        await fetch('api.php?action=logout', { method: 'POST', credentials: 'same-origin' });
        return { success: false, message: 'Password tidak cocok atau kurang dari 12 karakter. Silakan coba lagi.' };
      }
      const changeResponse = await fetch('api.php?action=change_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ newPassword: newPassword.trim() })
      });
      const changeResult = await changeResponse.json();
      if (!changeResponse.ok || !changeResult.success) {
        return { success: false, message: changeResult.message || 'Gagal mengganti password.' };
      }
      user.mustChangePassword = false;
    }
    const avatarColor = user.role === 'admin' ? '0f766e' : (user.role === 'canteen' ? '2563eb' : '059669');
    user.picture = Auth.getAvatar(user.name, avatarColor);
    if (user.role === 'karyawan') {
      localStorage.setItem('hotel_absensi_active_emp_id', user.employeeId);
    }

    Auth.setCurrentUser(user);
    Auth.hideLoginPage();
    const synced = await Store.syncWithBackend();
    if (!synced) {
      await Auth.logout();
      return { success: false, message: 'Gagal memuat data dari server. Coba lagi atau hubungi Administrator.' };
    }
    if (window.App) App.updateTenantLabels();

    // Otomatis navigasi: Admin langsung masuk ke DASHBOARD!
    if (window.App) {
      if (user.role === 'karyawan') {
        App.navigateTo('employee-portal');
      } else if (user.role === 'canteen') {
        App.navigateTo('canteen');
      } else {
        App.navigateTo('dashboard');
      }
    }

    return res;
  },

  // Login Cepat Berdasarkan ID / Nama dan Password
  loginQuick(identifier, password) {
    return this.loginWithPassword(identifier, password);
  },

  // Kompatibilitas fungsi login lama
  loginWithGoogle() {
    return Promise.resolve({ success: false, message: 'Gunakan login dengan password akun Anda.' });
  },

  async logout() {
    try {
      const response = await fetch('api.php?action=logout', { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new Error('Server menolak permintaan logout.');
    } catch (error) {
      alert('Logout server gagal. Sesi mungkin masih aktif; periksa koneksi lalu coba lagi.');
      return false;
    }
    Auth.setCurrentUser(null);
    Auth.showLoginPage();
    if (window.Store && typeof Store.playSound === 'function') {
      Store.playSound('click');
    }
    return true;
  },

  isLoggedIn() {
    return !!Auth.getCurrentUser();
  },

  async restoreSession() {
    try {
      const response = await fetch('api.php?action=session', {
        cache: 'no-store',
        credentials: 'same-origin'
      });
      if (!response.ok) throw new Error('Sesi server tidak tersedia.');
      const data = await response.json();
      if (!data.success || !data.user) throw new Error('Respons sesi server tidak valid.');
      const user = data.user;
      if (user.mustChangePassword) {
        await fetch('api.php?action=logout', { method: 'POST', credentials: 'same-origin' });
        throw new Error('Password bawaan harus diganti. Silakan login kembali untuk membuat password baru.');
      }
      const avatarColor = user.role === 'admin' ? '0f766e' : (user.role === 'canteen' ? '2563eb' : '059669');
      user.picture = Auth.getAvatar(user.name, avatarColor);
      Auth.setCurrentUser(user);
      Auth.hideLoginPage();
      const synced = await Store.syncWithBackend();
      if (!synced) throw new Error('Data server tidak dapat dimuat.');
      if (window.App) {
        App.updateTenantLabels();
        App.navigateTo(user.role === 'karyawan' ? 'employee-portal' : (user.role === 'canteen' ? 'canteen' : 'dashboard'));
      }
      return user;
    } catch (error) {
      Auth.setCurrentUser(null);
      Auth.showLoginPage();
      return null;
    }
  },

  // Penerapan Hak Akses (Role-Based Access Control)
  enforceRBAC() {
    const user = Auth.getCurrentUser();

    if (!user) {
      Auth.showLoginPage();
      return;
    }

    Auth.hideLoginPage();

    const navAdminItems = document.querySelectorAll('.nav-admin-only');
    const navCanteenItems = document.querySelectorAll('.nav-canteen-only');
    const navKaryawanItems = document.querySelectorAll('.nav-karyawan-only');
    const userBadgeEl = document.getElementById('header-user-badge');
    const userSubEl = document.getElementById('header-user-email');
    const userAvatarEl = document.getElementById('header-user-avatar');

    // Update info profil di header bar
    if (userBadgeEl) userBadgeEl.innerText = user.name || user.badge || 'User';
    if (userSubEl) {
      if (user.role === 'karyawan') {
        userSubEl.innerText = `${user.employeeId || ''} • ${user.department || user.position || 'Karyawan'}`;
      } else if (user.role === 'canteen') {
        userSubEl.innerText = `Kasir • ${user.name || 'Kantin'}`;
      } else {
        userSubEl.innerText = `Administrator Hotel`;
      }
    }
    if (userAvatarEl && user.picture) userAvatarEl.src = user.picture;

    // Filter Menu Berdasarkan Hak Akses
    if (user.role === 'karyawan') {
      navAdminItems.forEach(el => el.classList.add('hidden'));
      navCanteenItems.forEach(el => el.classList.add('hidden'));
      navKaryawanItems.forEach(el => el.classList.remove('hidden'));

      if (window.App && window.App.currentPage && window.App.currentPage !== 'employee-portal') {
        App.navigateTo('employee-portal');
      }
    } else if (user.role === 'canteen') {
      navAdminItems.forEach(el => {
        if (!el.classList.contains('nav-canteen-only')) {
          el.classList.add('hidden');
        }
      });
      navKaryawanItems.forEach(el => el.classList.add('hidden'));
      navCanteenItems.forEach(el => el.classList.remove('hidden'));

      const navCanteenLabel = document.getElementById('nav-canteen-label');
      if (navCanteenLabel) navCanteenLabel.innerText = user.name || 'Kantin';

      if (window.App && window.App.currentPage && window.App.currentPage !== 'canteen') {
        App.navigateTo('canteen');
      }
    } else {
      // Admin: Tampilkan semua menu
      navAdminItems.forEach(el => el.classList.remove('hidden'));
      navCanteenItems.forEach(el => el.classList.remove('hidden'));
      navKaryawanItems.forEach(el => el.classList.remove('hidden'));

      const navCanteenLabel = document.getElementById('nav-canteen-label');
      if (navCanteenLabel) navCanteenLabel.innerText = 'Kantin';
    }
  },

  openLoginModal() {
    Auth.showLoginPage();
  },

  closeLoginModal() {
    if (Auth.isLoggedIn()) {
      Auth.hideLoginPage();
    }
  },

  openGoogleModal() {
    this.openLoginModal();
  },

  closeGoogleModal() {
    this.closeLoginModal();
  }
};

window.Auth = Auth;