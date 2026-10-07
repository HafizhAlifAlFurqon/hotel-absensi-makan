/**
 * app.js - Aplikasi Utama & Router Navigasi 8 Halaman
 * Halaman:
 * 1. Dashboard
 * 2. Depot Bu A
 * 3. Depot Bu Yuli
 * 4. Kelola Tenant
 * 5. Karyawan
 * 6. Kartu Qr
 * 7. Laporan
 * 8. Keluar (Logout)
 */

const App = {
  currentPage: 'dashboard',

  hideLoadingScreen() {
    const ls = document.getElementById('app-loading-screen');
    if (ls) {
      ls.classList.add('opacity-0');
      setTimeout(() => {
        ls.classList.add('hidden');
      }, 200);
    }
  },

  init() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
    this.updateTenantLabels();
    this.setupNavigation();
    Auth.enforceRBAC();

    // Default navigasi sesuai peran login
    const user = Auth.getCurrentUser();
    if (!user) {
      document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
      Auth.openLoginModal();
    } else if (user.role === 'karyawan') {
      this.navigateTo('employee-portal');
    } else if (user.role === 'canteen') {
      this.navigateTo('canteen');
    } else {
      this.navigateTo('dashboard');
    }

    this.checkHttpsProtocol();

    // Hilangkan loading screen secara instan dan mulus
    setTimeout(() => this.hideLoadingScreen(), 80);
  },

  checkHttpsProtocol() {
    const isHttps = window.location.protocol === 'https:';
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const banner = document.getElementById('https-warning-banner');
    if (banner) {
      if (!isHttps && !isLocal) {
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    }
  },

  updateClock() {
    const clockEl = document.getElementById('header-live-clock');
    const shiftBadgeEl = document.getElementById('header-shift-badge');
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
    
    if (clockEl) {
      clockEl.innerText = `${timeStr} WIB`;
    }

    if (shiftBadgeEl) {
      try {
        const evaluation = (window.Store && typeof Store.evaluateShiftAndTime === 'function')
          ? Store.evaluateShiftAndTime(now)
          : { isAllowed: (now.getHours() >= 11 && now.getHours() <= 19), shift: (now.getHours() < 15 ? 'Makan Siang' : 'Makan Sore') };
        const settings = (window.Store && typeof Store.getSettings === 'function') ? Store.getSettings() : {};

        if (evaluation.isAllowed) {
          if (evaluation.shift && evaluation.shift.includes('Siang')) {
            shiftBadgeEl.className = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300';
            shiftBadgeEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span> Makan Siang (11:00 - 15:00)`;
          } else {
            shiftBadgeEl.className = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300';
            shiftBadgeEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-indigo-500 mr-1.5 animate-pulse"></span> Makan Sore (15:01 - 19:00)`;
          }
        } else {
          shiftBadgeEl.className = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300';
          shiftBadgeEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-500 mr-1.5"></span> Kantin Tutup (Buka 11:00 - 19:00)`;
        }

        if (settings.bypassTimeForTesting) {
          shiftBadgeEl.innerHTML += ` <span class="ml-1 text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">SIMULASI</span>`;
        }
      } catch (e) {
        console.warn('Clock eval error:', e);
      }
    }
  },

  updateTenantLabels() {
    const s = Store.getSettings();
    const tenants = Store.getTenants();

    // Judul Hotel
    document.querySelectorAll('.hotel-name-display').forEach(el => el.innerText = s.hotelName);

    // Label Kantin
    tenants.forEach(t => {
      document.querySelectorAll(`.label-${t.id}-name`).forEach(el => el.innerText = t.name);
    });
  },

  setupNavigation() {
    const navButtons = document.querySelectorAll('[data-page-target]');
    navButtons.forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const target = btn.getAttribute('data-page-target');
        if (target === 'logout') {
          App.handleLogout();
        } else {
          App.navigateTo(target);
        }
      };
    });
  },

  navigateTo(pageId) {
    if (pageId === 'logout') {
      this.handleLogout();
      return;
    }

    const user = Auth.getCurrentUser();
    if (!user) {
      document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
      Auth.openLoginModal();
      return;
    }

    // Lock navigasi berdasarkan Peran (RBAC Strict)
    if (user.role === 'karyawan') {
      pageId = 'employee-portal';
    } else if (user.role === 'canteen') {
      pageId = 'canteen';
    }

    // Mapping depot lama ke kantin unified
    if (pageId === 'tenant1' || pageId === 'tenant2') {
      pageId = 'canteen';
    }

    if (window.AttendanceManager && typeof window.AttendanceManager.closeScanModal === 'function') {
      window.AttendanceManager.closeScanModal();
    }

    this.currentPage = pageId;

    // Sembunyikan semua halaman
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));

    // Tampilkan halaman terpilih
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
      targetPage.classList.remove('hidden');
    }

    // Update style nav link
    document.querySelectorAll('[data-page-target]').forEach(btn => {
      const target = btn.getAttribute('data-page-target');
      if (target === pageId) {
        btn.classList.add('bg-emerald-700', 'text-white', 'shadow-xs');
        btn.classList.remove('text-emerald-100', 'hover:bg-emerald-800/60');
      } else {
        btn.classList.remove('bg-emerald-700', 'text-white', 'shadow-xs');
        btn.classList.add('text-emerald-100', 'hover:bg-emerald-800/60');
      }
    });

    // Inisialisasi konten halaman terpilih
    if (pageId === 'dashboard' && window.Dashboard) {
      window.Dashboard.render();
    } else if (pageId === 'canteen' && window.AttendanceManager) {
      window.AttendanceManager.initCanteenPage();
    } else if (pageId === 'training' && window.TrainingManager) {
      window.TrainingManager.init();
    } else if (pageId === 'tenants' && window.TenantManager) {
      window.TenantManager.init();
    } else if (pageId === 'employees' && window.EmployeesManager) {
      window.EmployeesManager.init();
    } else if (pageId === 'qrcards' && window.QRCardsManager) {
      window.QRCardsManager.init();
    } else if (pageId === 'reports' && window.ReportsManager) {
      window.ReportsManager.init();
    } else if ((pageId === 'employee-scan' || pageId === 'employee-portal') && window.AttendanceManager) {
      window.AttendanceManager.initEmployeePortal();
    }

    // Tutup mobile drawer jika terbuka
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
      mobileMenu.classList.add('hidden');
    }
  },

  checkAuth() {
    Auth.enforceRBAC();
  },

  switchRole(role) {
    if (role === 'admin') {
      const s = Store.getSettings();
      Auth.loginWithPassword(s.adminUsername || 'admin', s.adminPassword || 'admin123');
    } else if (role === 'tenant1') {
      Auth.loginWithPassword('tenant1', 'depota123');
    } else if (role === 'tenant2') {
      Auth.loginWithPassword('tenant2', 'depotyuli123');
    } else if (role === 'karyawan') {
      const emps = Store.getEmployees().filter(e => e.status === 'Aktif');
      if (emps.length > 0) {
        Auth.loginWithPassword(emps[0].id, emps[0].password || 'password123');
      } else {
        Auth.openLoginModal();
      }
    } else {
      Auth.openLoginModal();
    }
  },

  refreshCurrentPageData() {
    const pageId = this.currentPage;
    if (pageId === 'dashboard' && window.Dashboard) {
      if (typeof window.Dashboard.updateData === 'function') {
        window.Dashboard.updateData();
      }
    } else if (pageId === 'canteen' && window.AttendanceManager) {
      if (typeof window.AttendanceManager.renderCanteenTodayList === 'function') {
        window.AttendanceManager.renderCanteenTodayList();
      } else if (typeof window.AttendanceManager.renderCanteenHistory === 'function') {
        window.AttendanceManager.renderCanteenHistory();
      }
    } else if (pageId === 'training' && window.TrainingManager) {
      if (typeof window.TrainingManager.renderStats === 'function') window.TrainingManager.renderStats();
      if (typeof window.TrainingManager.renderReport === 'function') window.TrainingManager.renderReport();
      if (typeof window.TrainingManager.renderTraineesTable === 'function') window.TrainingManager.renderTraineesTable();
    } else if (pageId === 'tenants' && window.TenantManager) {
      if (typeof window.TenantManager.render === 'function') window.TenantManager.render();
    } else if (pageId === 'employees' && window.EmployeesManager) {
      if (typeof window.EmployeesManager.renderTable === 'function') window.EmployeesManager.renderTable();
      if (typeof window.EmployeesManager.updateTotalBadge === 'function') window.EmployeesManager.updateTotalBadge();
    } else if (pageId === 'qrcards' && window.QRCardsManager) {
      if (typeof window.QRCardsManager.render === 'function') window.QRCardsManager.render();
    } else if (pageId === 'reports' && window.ReportsManager) {
      // Re-render laporan dengan tetap mempertahankan tanggal yang dipilih user
      if (typeof window.ReportsManager.render === 'function') window.ReportsManager.render();
    } else if ((pageId === 'employee-scan' || pageId === 'employee-portal') && window.AttendanceManager) {
      if (typeof window.AttendanceManager.renderPortalHistory === 'function') window.AttendanceManager.renderPortalHistory();
    }
  },

  handleLogout() {
    if (confirm('Apakah Anda ingin keluar (logout) dari sistem absensi makan?')) {
      Auth.logout();
    }
  }
};

window.App = App;

// Jalankan inisialisasi aplikasi secara langsung tanpa menunggu
App.init();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });
}

// Re-render antarmuka saat sinkronisasi MySQL selesai TANPA mereset tanggal/filter yang telah dipilih user
window.addEventListener('store-synced', () => {
  if (window.App) {
    App.updateTenantLabels();
    if (App.currentPage) {
      App.refreshCurrentPageData();
    }
  }
});
