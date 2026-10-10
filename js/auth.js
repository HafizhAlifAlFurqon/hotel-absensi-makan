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

    // Reset input di form halaman login
    const idEl = document.getElementById('login-page-identifier');
    const passEl = document.getElementById('login-page-password');
    const alertEl = document.getElementById('login-page-alert');
    if (idEl) {
      idEl.value = '';
      setTimeout(() => idEl.focus(), 120);
    }
    if (passEl) passEl.value = '';
    if (alertEl) alertEl.innerHTML = '';

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
  },

  // Login dengan Password Sendiri (Karyawan, Kasir Kantin, Admin)
  loginWithPassword(identifier, password) {
    const res = Store.verifyCredentials(identifier, password);
    if (!res.success) {
      return res;
    }

    const user = res.user;
    if (user.role === 'karyawan') {
      localStorage.setItem('hotel_absensi_active_emp_id', user.employeeId);
    }

    Auth.setCurrentUser(user);
    Auth.hideLoginPage();

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
  loginWithGoogle({ role = 'karyawan', employeeId = null, tenantId = null, name = null }) {
    if (role === 'admin') {
      return this.loginWithPassword('admin', 'admin123');
    } else if (role === 'canteen') {
      const tId = tenantId || 'tenant1';
      const t = Store.findTenant ? Store.findTenant(tId) : null;
      const pass = (t && t.password) || (tId === 'tenant1' ? 'depota123' : 'depotyuli123');
      return this.loginWithPassword(tId, pass);
    } else {
      const empId = employeeId || name || 'EMP-001';
      const emp = Store.findEmployee(empId);
      const pass = (emp && emp.password) || 'password123';
      return this.loginWithPassword(empId, pass);
    }
  },

  logout() {
    Auth.setCurrentUser(null);
    Auth.showLoginPage();
    if (window.Store && typeof Store.playSound === 'function') {
      Store.playSound('click');
    }
  },

  isLoggedIn() {
    return !!Auth.getCurrentUser();
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