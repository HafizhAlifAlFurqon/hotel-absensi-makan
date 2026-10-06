/**
 * attendance.js - Logika Halaman Absensi Kantin
 * Menangani Depot Bu A (tenant1) dan Depot Bu Yuli (tenant2)
 * Fitur: Pilihan tanggal hari ini, Scan QR Kamera / Barcode Scanner,
 * Input Manual ID, Preview Karyawan, Validasi Aturan, & Tombol Konfirmasi.
 */

const AttendanceManager = {
  activeScanner: {
    tenant1: null,
    tenant2: null,
    canteen: null,
    employee: null
  },

  activeTab: {
    tenant1: 'scanner',
    tenant2: 'scanner',
    canteen: 'scanner'
  },

  currentCanteenKey: 'tenant1',
  currentScanOwnerEmpId: null,
  scanModalTimer: null,

  init(tenantKey) {
    this.initCanteenPage(tenantKey);
  },

  initCanteenPage(tenantKey) {
    const user = Auth.getCurrentUser();
    if (user && user.role === 'canteen') {
      this.currentCanteenKey = user.tenantId || 'tenant1';
    } else if (tenantKey) {
      this.currentCanteenKey = tenantKey;
    } else {
      this.currentCanteenKey = this.currentCanteenKey || 'tenant1';
    }
    this.renderCanteenPage();
  },

  switchCanteenPageTenant(tenantKey) {
    const user = Auth.getCurrentUser();
    if (user && user.role === 'canteen') {
      return; // Kasir kantin terkunci pada kantin sendiri
    }
    this.currentCanteenKey = tenantKey;
    this.renderCanteenPage();
  },

  renderCanteenPage() {
    const tenantKey = this.currentCanteenKey || 'tenant1';
    const tenantName = Store.getTenantName(tenantKey);
    const tenants = Store.getTenants();
    const user = Auth.getCurrentUser();
    const isAdmin = user && user.role === 'admin';

    // Header Title & Badge
    const titleEl = document.getElementById('canteen-title');
    const badgeEl = document.getElementById('canteen-header-badge');
    const subtitleEl = document.getElementById('canteen-subtitle');
    if (titleEl) titleEl.innerText = tenantName;
    if (badgeEl) badgeEl.innerText = tenantKey === 'tenant1' ? 'Tenant 1' : (tenantKey === 'tenant2' ? 'Tenant 2' : 'Tenant');
    if (subtitleEl) subtitleEl.innerText = `Kasir absensi makan karyawan hotel untuk ${tenantName}`;

    // Admin Switcher Pills
    const switcherBar = document.getElementById('canteen-admin-switcher-bar');
    const pillsContainer = document.getElementById('canteen-switcher-pills');
    if (switcherBar) {
      if (isAdmin) {
        switcherBar.classList.remove('hidden');
        if (pillsContainer) {
          pillsContainer.innerHTML = tenants.map(t => {
            const isActive = t.id === tenantKey;
            return `
              <button onclick="AttendanceManager.switchCanteenPageTenant('${t.id}')" class="px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${isActive ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'}">
                <i class="fa-solid fa-store mr-1"></i> ${t.name}
              </button>
            `;
          }).join('');
        }
      } else {
        switcherBar.classList.add('hidden');
      }
    }

    // Setup Date
    const dateInput = document.getElementById('canteen-date-input');
    if (dateInput && !dateInput.value) {
      dateInput.value = Store.getTodayDateString();
    }

    // Setup Manual Input & Listeners
    this.setupCanteenManualInput();

    // Render Today List
    this.renderCanteenTodayList();

    // Render QR Stand
    this.renderCanteenUnifiedQRStand();

    // Reset input & preview
    const empInput = document.getElementById('canteen-emp-id-input');
    if (empInput) empInput.value = '';
    const prevCont = document.getElementById('canteen-preview-container');
    if (prevCont) {
      prevCont.innerHTML = `
        <div class="p-6 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
          <i class="fa-solid fa-id-badge text-3xl mb-2 text-slate-300"></i>
          <p class="text-xs font-medium">Scan QR atau ketik ID Karyawan untuk melihat informasi</p>
        </div>
      `;
    }
  },

  renderCanteenTodayList() {
    const tenantKey = this.currentCanteenKey || 'tenant1';
    const dateInput = document.getElementById('canteen-date-input');
    const selectedDate = (dateInput && dateInput.value) || Store.getTodayDateString();

    const tbody = document.getElementById('canteen-today-list');
    const badge = document.getElementById('canteen-today-count-badge');
    if (!tbody) return;

    const allAttendances = Store.getAttendances(selectedDate, selectedDate);
    const tenantAttendances = allAttendances.filter(a => a.tenantId === tenantKey);

    if (badge) {
      badge.innerText = `${tenantAttendances.length} Karyawan`;
    }

    if (tenantAttendances.length === 0) {
      tbody.innerHTML = `
        <div class="py-8 text-center text-slate-400 text-xs">
          <i class="fa-solid fa-utensils text-2xl mb-2 block opacity-40"></i>
          Belum ada yang absen makan di kantin ini pada tanggal tersebut.
        </div>
      `;
      return;
    }

    tbody.innerHTML = tenantAttendances.map((item, idx) => {
      const isLunch = item.shift && item.shift.includes('Siang');
      const isTrn = item.department === 'Training';
      return `
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:bg-emerald-50/40 transition">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="font-mono text-slate-400 text-[10px] w-4">${idx + 1}</span>
            <div class="truncate">
              <span class="font-bold text-slate-800 block truncate leading-tight">${item.employeeName}</span>
              <span class="text-[10px] text-slate-500 font-mono">${item.employeeId} &bull; ${item.department} ${isTrn ? '<b class="text-amber-700">(Magang)</b>' : ''}</span>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isLunch ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}">
              ${item.shift}
            </span>
            <span class="text-[10px] text-slate-400 block font-mono mt-0.5">${item.time}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  setupCanteenManualInput() {
    const input = document.getElementById('canteen-emp-id-input');
    if (!input || input.dataset.listenerAttached === 'true') return;
    input.dataset.listenerAttached = 'true';

    input.addEventListener('input', () => {
      const val = input.value.trim();
      AttendanceManager.previewCanteenEmployee(val);
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        AttendanceManager.confirmCanteenAttendance();
      }
    });
  },

  previewCanteenEmployee(employeeId) {
    const previewContainer = document.getElementById('canteen-preview-container');
    if (!previewContainer) return;

    if (!employeeId) {
      previewContainer.innerHTML = `
        <div class="p-6 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
          <i class="fa-solid fa-id-badge text-3xl mb-2 text-slate-300"></i>
          <p class="text-xs font-medium">Scan QR atau ketik ID Karyawan untuk melihat informasi</p>
        </div>
      `;
      return;
    }

    const emp = Store.findEmployee(employeeId);
    if (!emp) {
      previewContainer.innerHTML = `
        <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <i class="fa-solid fa-triangle-exclamation text-amber-500 text-xl"></i>
          <div>
            <p class="text-xs font-bold text-amber-800 uppercase tracking-wide">ID Tidak Ditemukan</p>
            <p class="text-xs text-amber-700">Karyawan / Trainee dengan ID "${employeeId}" belum terdaftar di sistem.</p>
          </div>
        </div>
      `;
      return;
    }

    const isAktif = emp.status === 'Aktif';
    const statusBadge = isAktif
      ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><i class="fa-solid fa-check-circle mr-1"></i> Aktif</span>`
      : `<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800"><i class="fa-solid fa-ban mr-1"></i> Non-Aktif</span>`;

    const isTrainee = emp.department === 'Training' || emp.isTrainee;

    previewContainer.innerHTML = `
      <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center">
            ${emp.name.charAt(0)}
          </div>
          <div>
            <h4 class="font-extrabold text-sm text-slate-900">${emp.name}</h4>
            <p class="text-xs text-slate-500">${emp.id} &bull; ${emp.department} ${isTrainee ? '<span class="text-amber-600 font-bold">(Magang)</span>' : ''}</p>
            <p class="text-[11px] text-slate-400">${emp.position || 'Staff'}</p>
          </div>
        </div>
        <div>
          ${statusBadge}
        </div>
      </div>
    `;
  },

  confirmCanteenAttendance() {
    const tenantKey = this.currentCanteenKey || 'tenant1';
    const input = document.getElementById('canteen-emp-id-input');
    const empId = input ? input.value.trim() : '';

    if (!empId) {
      alert('Mohon ketik atau scan ID Karyawan / Trainee terlebih dahulu.');
      return;
    }

    const dateInput = document.getElementById('canteen-date-input');
    const dateVal = (dateInput && dateInput.value) || Store.getTodayDateString();

    const result = Store.recordAttendance(empId, tenantKey, dateVal);

    if (result.success) {
      Store.playSound('success');
      this.renderCanteenTodayList();
      if (input) input.value = '';
      this.previewCanteenEmployee('');
      this.showScanResultModal(result, tenantKey);
    } else {
      Store.playSound('error');
      alert(`[GAGAL] ${result.message}`);
    }
  },

  renderCanteenUnifiedQRStand() {
    const box = document.getElementById('canteen-stand-qr-box');
    const title = document.getElementById('canteen-stand-title');
    if (!box) return;

    const tenantKey = this.currentCanteenKey || 'tenant1';
    const tenantName = Store.getTenantName(tenantKey);
    if (title) title.innerText = `QR Meja Kasir ${tenantName}`;

    box.innerHTML = '';
    if (window.QRCode) {
      new QRCode(box, {
        text: `DEPOT:${tenantKey}`,
        width: 170,
        height: 170,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  },

  switchCanteenUnifiedTab(tab) {
    const tabScanner = document.getElementById('canteen-tab-scanner');
    const tabStand = document.getElementById('canteen-tab-stand');
    const btnScanner = document.getElementById('canteen-btn-tab-scanner');
    const btnStand = document.getElementById('canteen-btn-tab-stand');

    if (tab === 'scanner') {
      if (tabScanner) tabScanner.classList.remove('hidden');
      if (tabStand) tabStand.classList.add('hidden');
      if (btnScanner) {
        btnScanner.className = 'px-3.5 py-1.5 text-xs font-bold rounded-lg shadow-xs transition bg-emerald-600 text-white cursor-pointer';
      }
      if (btnStand) {
        btnStand.className = 'px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer';
      }
    } else {
      if (tabScanner) tabScanner.classList.add('hidden');
      if (tabStand) tabStand.classList.remove('hidden');
      if (btnScanner) {
        btnScanner.className = 'px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer';
      }
      if (btnStand) {
        btnStand.className = 'px-3.5 py-1.5 text-xs font-bold rounded-lg shadow-xs transition bg-emerald-600 text-white cursor-pointer';
      }
      this.renderCanteenUnifiedQRStand();
    }
  },

  toggleCanteenScanner() {
    const readerId = 'canteen-qr-reader';
    const readerEl = document.getElementById(readerId);
    const btnCam = document.getElementById('canteen-btn-toggle-cam');
    if (!readerEl) return;

    if (this.activeScanner.canteen) {
      this.activeScanner.canteen.stop().then(() => {
        this.activeScanner.canteen = null;
        readerEl.classList.add('hidden');
        if (btnCam) btnCam.innerHTML = '<i class="fa-solid fa-camera"></i> Buka Kamera Scan QR';
      }).catch(err => console.error(err));
    } else {
      readerEl.classList.remove('hidden');
      if (btnCam) btnCam.innerHTML = '<i class="fa-solid fa-stop"></i> Tutup Kamera';
      const qrScanner = new Html5Qrcode(readerId);
      this.activeScanner.canteen = qrScanner;

      qrScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          this.previewCanteenEmployee(decodedText);
          const empInput = document.getElementById('canteen-emp-id-input');
          if (empInput) empInput.value = decodedText;
          this.confirmCanteenAttendance();
          qrScanner.stop().then(() => {
            this.activeScanner.canteen = null;
            readerEl.classList.add('hidden');
            if (btnCam) btnCam.innerHTML = '<i class="fa-solid fa-camera"></i> Buka Kamera Scan QR';
          });
        },
        (error) => {}
      ).catch(err => {
        alert('Gagal mengakses kamera: ' + err);
        readerEl.classList.add('hidden');
        if (btnCam) btnCam.innerHTML = '<i class="fa-solid fa-camera"></i> Buka Kamera Scan QR';
      });
    }
  },

  printCurrentCanteenStand() {
    const tenantKey = this.currentCanteenKey || 'tenant1';
    this.printCanteenStand(tenantKey);
  },

  setupDate(tenantKey) {
    const dateInput = document.getElementById(`${tenantKey}-date-input`);
    if (dateInput && !dateInput.value) {
      dateInput.value = Store.getTodayDateString();
    }
  },

  renderTenantHeader(tenantKey) {
    const s = Store.getSettings();
    const tenantName = Store.getTenantName(tenantKey);
    const titleEl = document.getElementById(`${tenantKey}-title`);
    const badgeEl = document.getElementById(`${tenantKey}-header-badge`);

    if (titleEl) titleEl.innerText = tenantName;
    if (badgeEl) badgeEl.innerText = tenantKey === 'tenant1' ? 'Tenant 1' : 'Tenant 2';
  },

  // Pencarian manual / auto-suggest
  setupManualInput(tenantKey) {
    const input = document.getElementById(`${tenantKey}-emp-id-input`);
    if (!input || input.dataset.listenerAttached === 'true') return;
    input.dataset.listenerAttached = 'true';

    input.addEventListener('input', () => {
      const val = input.value.trim();
      AttendanceManager.previewEmployee(tenantKey, val);
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        AttendanceManager.confirmAttendance(tenantKey);
      }
    });
  },

  // Pratinjau Karyawan saat ID diketik / di-scan
  previewEmployee(tenantKey, employeeId) {
    const previewContainer = document.getElementById(`${tenantKey}-preview-container`);
    if (!previewContainer) return;

    if (!employeeId) {
      previewContainer.innerHTML = `
        <div class="p-6 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <i class="fa-solid fa-id-badge text-3xl mb-2 text-gray-300"></i>
          <p class="text-sm font-medium">Scan QR atau ketik ID Karyawan untuk melihat informasi</p>
        </div>
      `;
      return;
    }

    const emp = Store.findEmployee(employeeId);
    if (!emp) {
      previewContainer.innerHTML = `
        <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <i class="fa-solid fa-triangle-exclamation text-amber-500 text-xl"></i>
          <div>
            <p class="text-xs font-bold text-amber-800 uppercase tracking-wide">ID Tidak Ditemukan</p>
            <p class="text-xs text-amber-700">Karyawan dengan ID "${employeeId}" belum terdaftar di sistem.</p>
          </div>
        </div>
      `;
      return;
    }

    const isAktif = emp.status === 'Aktif';
    const statusBadge = isAktif
      ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><i class="fa-solid fa-check-circle mr-1"></i> Aktif</span>`
      : `<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800"><i class="fa-solid fa-ban mr-1"></i> Non-Aktif</span>`;

    // Cek apakah hari ini sudah makan di depot manapun
    const dateInput = document.getElementById(`${tenantKey}-date-input`);
    const targetDate = dateInput ? dateInput.value : Store.getTodayDateString();
    const attendances = Store.getAttendances(targetDate);
    const alreadyEaten = attendances.find(a => a.employeeId.toLowerCase() === emp.id.toLowerCase());

    let statusMakanBadge = '';
    if (alreadyEaten) {
      statusMakanBadge = `
        <div class="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
          <i class="fa-solid fa-circle-exclamation text-rose-600 mt-0.5"></i>
          <div>
            <span class="font-bold">Sudah Makan Hari Ini:</span> di <b>${alreadyEaten.tenantName}</b> pukul <b>${alreadyEaten.time}</b> (${alreadyEaten.shift}).
          </div>
        </div>
      `;
    } else {
      statusMakanBadge = `
        <div class="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <i class="fa-solid fa-circle-check text-emerald-600"></i>
          <span>Belum makan hari ini. Jatah 1x porsi tersedia.</span>
        </div>
      `;
    }

    previewContainer.innerHTML = `
      <div class="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              ${emp.name.charAt(0)}
            </div>
            <div>
              <h4 class="font-bold text-gray-900 text-base leading-tight">${emp.name}</h4>
              <p class="text-xs text-gray-500 font-mono font-semibold">${emp.id}</p>
            </div>
          </div>
          <div>${statusBadge}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-3 text-xs">
          <div class="bg-white p-2 rounded border border-gray-100">
            <span class="text-gray-400 block text-[10px] uppercase font-semibold">Departemen</span>
            <span class="font-semibold text-gray-800">${emp.department}</span>
          </div>
          <div class="bg-white p-2 rounded border border-gray-100">
            <span class="text-gray-400 block text-[10px] uppercase font-semibold">Jabatan</span>
            <span class="font-semibold text-gray-800">${emp.position || '-'}</span>
          </div>
        </div>
        ${statusMakanBadge}
      </div>
    `;
  },

  // Tombol Konfirmasi Absensi
  confirmAttendance(tenantKey) {
    const input = document.getElementById(`${tenantKey}-emp-id-input`);
    const dateInput = document.getElementById(`${tenantKey}-date-input`);
    const resultBox = document.getElementById(`${tenantKey}-result-message`);

    if (!input || !resultBox) return;

    const empId = input.value.trim();
    const dateStr = dateInput ? dateInput.value : Store.getTodayDateString();

    if (!empId) {
      resultBox.innerHTML = `
        <div class="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-800 text-xs flex items-center gap-2">
          <i class="fa-solid fa-triangle-exclamation text-base"></i>
          <span>Harap masukkan ID Karyawan atau scan QR terlebih dahulu.</span>
        </div>
      `;
      return;
    }

    const res = Store.recordAttendance(empId, tenantKey, dateStr);

    // Tampilkan Modal Pop-up Hasil Scan
    this.showScanModal(res, empId);

    if (res.valid) {
      // Tampilan Sukses
      resultBox.innerHTML = `
        <div class="p-4 bg-emerald-500 text-white rounded-xl shadow-md animate-bounce-short">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
              <i class="fa-solid fa-check"></i>
            </div>
            <div class="flex-1">
              <h4 class="font-bold text-sm tracking-wide uppercase">Absensi Berhasil Disimpan!</h4>
              <p class="text-xs text-emerald-100 mt-0.5">
                <b>${res.record.employeeName}</b> (${res.record.employeeId}) • ${res.record.department}
              </p>
              <p class="text-xs text-emerald-100">
                Shift: <b>${res.record.shift}</b> • Pukul: <b>${res.record.time} WIB</b> • Depot: <b>${res.record.tenantName}</b>
              </p>
            </div>
          </div>
        </div>
      `;

      // Reset input & preview
      input.value = '';
      this.previewEmployee(tenantKey, '');

      // Refresh list hari ini di halaman depot & refresh dashboard
      this.renderTodayList(tenantKey);
      if (window.Dashboard) {
        window.Dashboard.updateData();
      }
    } else {
      // Tampilan Gagal Sesuai Aturan Bisnis
      resultBox.innerHTML = `
        <div class="p-4 bg-rose-600 text-white rounded-xl shadow-md">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl shrink-0 mt-0.5">
              <i class="fa-solid fa-xmark"></i>
            </div>
            <div class="flex-1">
              <h4 class="font-bold text-sm tracking-wide uppercase">Absensi Ditolak</h4>
              <p class="text-xs text-rose-100 mt-1 leading-relaxed">${res.message}</p>
              ${res.existingAttendance ? `
                <div class="mt-2 pt-2 border-t border-rose-500/50 text-[11px] text-rose-200">
                  <i class="fa-solid fa-lock mr-1"></i> Aturan: Setiap karyawan hanya memiliki 1x jatah makan per hari.
                </div>
              ` : ''}
              ${res.code === 'OUTSIDE_HOURS' ? `
                <div class="mt-2 pt-2 border-t border-rose-500/50 text-[11px] text-rose-200">
                  <i class="fa-solid fa-clock mr-1"></i> Aturan: Absensi hanya dibuka pukul 11:00 - 19:00 WIB (Siang: 11:00-15:00, Sore: 15:01-19:00).
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }

    // Auto-scroll ke result box jika di mobile
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  // Scanner Kamera HTML5 QR
  toggleScanner(tenantKey) {
    const readerId = `${tenantKey}-qr-reader`;
    const btn = document.getElementById(`${tenantKey}-btn-toggle-cam`);
    const readerDiv = document.getElementById(readerId);

    if (!readerDiv) return;

    if (this.activeScanner[tenantKey]) {
      // Stop scanner
      this.activeScanner[tenantKey].stop().then(() => {
        this.activeScanner[tenantKey] = null;
        readerDiv.classList.add('hidden');
        if (btn) {
          btn.innerHTML = `<i class="fa-solid fa-camera mr-2"></i> Buka Kamera Scan QR`;
          btn.className = `px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center justify-center`;
        }
      }).catch(err => console.error('Error stopping scanner', err));
    } else {
      // Start scanner
      if (!window.Html5Qrcode) {
        alert('Modul pemindai kamera QR sedang dimuat. Harap periksa koneksi internet.');
        return;
      }

      readerDiv.classList.remove('hidden');
      const html5QrCode = new Html5Qrcode(readerId);
      this.activeScanner[tenantKey] = html5QrCode;

      const config = { fps: 10, qrbox: { width: 220, height: 220 } };
      html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // Ketika QR terbaca
          const input = document.getElementById(`${tenantKey}-emp-id-input`);
          if (input) {
            input.value = decodedText.trim();
            AttendanceManager.previewEmployee(tenantKey, decodedText.trim());
            // Play notification tone
            Store.playSound('success');
          }
        },
        (errorMessage) => {
          // Scanning frame error, ignore
        }
      ).then(() => {
        if (btn) {
          btn.innerHTML = `<i class="fa-solid fa-camera-slash mr-2"></i> Tutup Kamera`;
          btn.className = `px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center justify-center`;
        }
      }).catch(err => {
        alert('Gagal mengakses kamera: ' + err);
        readerDiv.classList.add('hidden');
        this.activeScanner[tenantKey] = null;
      });
    }
  },

  // Riwayat Karyawan yang Makan di Tenant Ini pada Tanggal Terpilih
  renderTodayList(tenantKey) {
    const listContainer = document.getElementById(`${tenantKey}-today-list`);
    const dateInput = document.getElementById(`${tenantKey}-date-input`);
    const countBadge = document.getElementById(`${tenantKey}-today-count-badge`);
    if (!listContainer) return;

    const targetDate = dateInput ? dateInput.value : Store.getTodayDateString();
    const records = Store.getAttendances(targetDate).filter(r => r.tenantKey === tenantKey);

    if (countBadge) {
      countBadge.innerText = `${records.length} Karyawan`;
    }

    if (records.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-8 text-gray-400">
          <i class="fa-solid fa-bowl-food text-3xl mb-2 block opacity-40"></i>
          <p class="text-xs">Belum ada karyawan yang absen makan di depot ini pada tanggal terpilih.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = records.map((r, idx) => {
      const isLunch = r.shift && r.shift.includes('Siang');
      return `
        <div class="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition bg-white mb-2 shadow-xs">
          <div class="flex items-center gap-3">
            <span class="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">${idx + 1}</span>
            <div>
              <p class="text-xs font-bold text-gray-900">${r.employeeName}</p>
              <p class="text-[11px] text-gray-500 font-mono">${r.employeeId} • ${r.department}</p>
            </div>
          </div>
          <div class="text-right">
            <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${isLunch ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}">
              ${r.shift}
            </span>
            <p class="text-[10px] text-gray-400 font-mono mt-0.5">${r.time}</p>
          </div>
        </div>
      `;
    }).join('');
  },

  // --- Fitur QR Stand Meja Kasir Kantin ---
  switchCanteenTab(tenantKey, tab) {
    this.activeTab[tenantKey] = tab;
    const scannerSection = document.getElementById(`${tenantKey}-tab-scanner`);
    const standSection = document.getElementById(`${tenantKey}-tab-stand`);
    const btnScanner = document.getElementById(`${tenantKey}-btn-tab-scanner`);
    const btnStand = document.getElementById(`${tenantKey}-btn-tab-stand`);

    const activeColor = tenantKey === 'tenant1' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white';

    if (tab === 'scanner') {
      if (scannerSection) scannerSection.classList.remove('hidden');
      if (standSection) standSection.classList.add('hidden');
      if (btnScanner) btnScanner.className = `px-3.5 py-1.5 text-xs font-bold rounded-lg shadow-xs transition ${activeColor}`;
      if (btnStand) btnStand.className = 'px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
    } else {
      if (scannerSection) scannerSection.classList.add('hidden');
      if (standSection) standSection.classList.remove('hidden');
      if (btnScanner) btnScanner.className = 'px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
      if (btnStand) btnStand.className = `px-3.5 py-1.5 text-xs font-bold rounded-lg shadow-xs transition ${activeColor}`;
      this.renderCanteenQRStand(tenantKey);
    }
  },

  renderCanteenQRStand(tenantKey) {
    const qrContainer = document.getElementById(`${tenantKey}-stand-qr-box`);
    if (!qrContainer || !window.QRCode) return;

    qrContainer.innerHTML = '';
    const qrText = `DEPOT:${tenantKey}`;

    new QRCode(qrContainer, {
      text: qrText,
      width: 170,
      height: 170,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  },

  printCanteenStand(tenantKey) {
    const s = Store.getSettings();
    const tenantName = Store.getTenantName(tenantKey);
    const printWindow = window.open('', '_blank', 'width=550,height=750');
    if (!printWindow) {
      alert('Pop-up terblokir. Harap izinkan pop-up browser.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Stand Meja - ${tenantName}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 90vh;
            background: #f8fafc;
          }
          .stand-card {
            width: 360px;
            background: #ffffff;
            border: 3px solid #0f766e;
            border-radius: 24px;
            padding: 28px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.08);
          }
          .hotel-header {
            font-size: 13px;
            font-weight: 800;
            color: #047857;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 6px;
          }
          .stand-title {
            font-size: 22px;
            font-weight: 900;
            color: #0f172a;
            margin: 0 0 4px 0;
            text-transform: uppercase;
          }
          .depot-name {
            font-size: 16px;
            color: #2563eb;
            font-weight: 700;
            margin: 0 0 20px 0;
          }
          .qr-box {
            display: inline-block;
            padding: 16px;
            background: #ffffff;
            border: 2px solid #e2e8f0;
            border-radius: 20px;
            margin-bottom: 20px;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.04);
          }
          .instructions {
            font-size: 12px;
            color: #475569;
            line-height: 1.6;
            margin: 0 0 16px 0;
            background: #f1f5f9;
            padding: 12px;
            border-radius: 12px;
            text-align: left;
          }
          .instructions ol {
            margin: 0;
            padding-left: 18px;
          }
          .footer-note {
            font-size: 10px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-top: 1px solid #e2e8f0;
            padding-top: 14px;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="stand-card">
          <div class="hotel-header">${s.hotelName}</div>
          <h1 class="stand-title">Scan Absensi Makan</h1>
          <div class="depot-name">${tenantName}</div>
          <div class="qr-box">
            <div id="stand-qrcode"></div>
          </div>
          <div class="instructions">
            <b>Panduan Karyawan:</b>
            <ol>
              <li>Buka menu <b>Scan Karyawan</b> di HP Anda.</li>
              <li>Arahkan kamera ke QR Code di atas.</li>
              <li>Tunjukkan status centang hijau ke petugas kantin.</li>
            </ol>
          </div>
          <p class="footer-note">Jatah 1x Makan Per Hari &bull; 11.00 - 19.00 WIB</p>
        </div>
        <script>
          new QRCode(document.getElementById('stand-qrcode'), {
            text: 'DEPOT:${tenantKey}',
            width: 200,
            height: 200,
            colorDark: '#0f172a',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
          });
          setTimeout(() => { window.print(); }, 450);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  },

  // Buat DOM Halaman Kantin secara Dinamis jika belum ada di HTML
  createDynamicCanteenPage(tenantKey) {
    if (document.getElementById(`page-${tenantKey}`)) return;
    const tenantName = Store.getTenantName(tenantKey);
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    const section = document.createElement('section');
    section.id = `page-${tenantKey}`;
    section.className = 'page-view hidden space-y-6';
    section.innerHTML = `
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold shadow-xs">
            <i class="fa-solid fa-store"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 id="${tenantKey}-title" class="text-xl font-extrabold text-slate-900 tracking-tight">${tenantName}</h2>
              <span id="${tenantKey}-header-badge" class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">Kantin</span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">Kasir absensi makan karyawan untuk ${tenantName}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <label class="text-xs font-semibold text-slate-600">Pilihan Tanggal Hari Ini:</label>
          <input type="date" id="${tenantKey}-date-input" onchange="AttendanceManager.renderTodayList('${tenantKey}')" class="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50">
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-7 space-y-5">
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
              <button id="${tenantKey}-btn-tab-scanner" onclick="AttendanceManager.switchCanteenTab('${tenantKey}', 'scanner')" class="px-3.5 py-1.5 text-xs font-bold rounded-lg shadow-xs transition bg-emerald-600 text-white">
                <i class="fa-solid fa-camera mr-1.5"></i> Kasir Scan Karyawan
              </button>
              <button id="${tenantKey}-btn-tab-stand" onclick="AttendanceManager.switchCanteenTab('${tenantKey}', 'stand')" class="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition">
                <i class="fa-solid fa-qrcode mr-1.5"></i> Tampilkan QR Meja Kasir
              </button>
            </div>

            <div id="${tenantKey}-tab-scanner" class="space-y-4">
              <h3 class="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <i class="fa-solid fa-qrcode text-emerald-600"></i> Scan QR atau Masukkan ID Karyawan
                </span>
                <button id="${tenantKey}-btn-toggle-cam" onclick="AttendanceManager.toggleScanner('${tenantKey}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5">
                  <i class="fa-solid fa-camera"></i> Buka Kamera Scan QR
                </button>
              </h3>

              <div id="${tenantKey}-qr-reader" class="hidden w-full bg-black rounded-xl overflow-hidden relative"></div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ID Karyawan (Ketik atau gunakan Barcode Scanner)
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <i class="fa-solid fa-id-card"></i>
                  </div>
                  <input type="text" id="${tenantKey}-emp-id-input" placeholder="Contoh: EMP-001 (Tekan Enter untuk konfirmasi)" class="w-full pl-10 pr-4 py-2.5 text-sm font-mono font-bold uppercase rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none transition bg-slate-50">
                </div>
              </div>

              <div id="${tenantKey}-preview-container">
                <div class="p-6 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                  <i class="fa-solid fa-id-badge text-3xl mb-2 text-slate-300"></i>
                  <p class="text-xs font-medium">Scan QR atau ketik ID Karyawan untuk melihat informasi</p>
                </div>
              </div>

              <div>
                <button id="${tenantKey}-btn-confirm" onclick="AttendanceManager.confirmAttendance('${tenantKey}')" class="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer">
                  <i class="fa-solid fa-circle-check text-base"></i> Konfirmasi Absensi Makan
                </button>
              </div>

              <div id="${tenantKey}-result-message"></div>
            </div>

            <div id="${tenantKey}-tab-stand" class="hidden space-y-4 text-center py-4">
              <div class="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl max-w-sm mx-auto">
                <h4 class="font-extrabold text-sm text-slate-900 uppercase tracking-tight">QR Meja Kasir ${tenantName}</h4>
                <p class="text-xs text-slate-500 mt-0.5">Karyawan dapat memindai QR ini dari HP mereka</p>
                <div class="my-4 p-4 bg-white rounded-2xl shadow-sm border border-emerald-200 inline-block">
                  <div id="${tenantKey}-stand-qr-box" class="flex items-center justify-center min-w-[170px] min-h-[170px]"></div>
                </div>
              </div>
              <button onclick="AttendanceManager.printCanteenStand('${tenantKey}')" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition inline-flex items-center gap-2 cursor-pointer">
                <i class="fa-solid fa-print"></i> Cetak Stand Meja Kantin (A4)
              </button>
            </div>
          </div>

          <div class="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1.5">
            <h4 class="font-bold flex items-center gap-1.5 text-emerald-950">
              <i class="fa-solid fa-shield-halved text-emerald-600"></i> Ketentuan Absensi Kantin:
            </h4>
            <p>&bull; Hanya dapat absen pada pukul <b>11.00 - 19.00 WIB</b>.</p>
            <p>&bull; 1 Karyawan hanya <b>1x makan per hari</b> lintas seluruh kantin hotel.</p>
          </div>
        </div>

        <div class="lg:col-span-5 space-y-4">
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 class="font-bold text-slate-900 text-sm">Sudah Makan di Kantin Ini</h3>
                <p class="text-[11px] text-slate-400">Data tanggal terpilih</p>
              </div>
              <span id="${tenantKey}-today-count-badge" class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                0 Karyawan
              </span>
            </div>
            <div id="${tenantKey}-today-list" class="max-h-[500px] overflow-y-auto space-y-2 pr-1">
            </div>
          </div>
        </div>
      </div>
    `;

    mainEl.appendChild(section);
  },

  // --- Pop-up Modal Hasil Scan Absensi Karyawan ---
  showScanModal(res, empId) {
    const modal = document.getElementById('scan-result-modal');
    if (!modal) return;

    // Verifikasi hak kepemilikan pop-up:
    // Jika user login adalah karyawan, dan ID yang diproses berbeda dari active employee,
    // JANGAN tampilkan pop-up ini (mencegah pop up karyawan A muncul di layar karyawan B)
    const currentUser = (window.Auth && typeof Auth.getCurrentUser === 'function') ? Auth.getCurrentUser() : null;
    const activeEmpId = (window.Auth && typeof Auth.getActiveEmployeeId === 'function') ? Auth.getActiveEmployeeId() : null;

    if (currentUser && currentUser.role === 'karyawan' && activeEmpId && empId) {
      if (activeEmpId.toLowerCase() !== empId.toLowerCase()) {
        return;
      }
    }

    this.currentScanOwnerEmpId = empId;

    const successSection = document.getElementById('scan-modal-success');
    const errorSection = document.getElementById('scan-modal-error');
    const empNameEl = document.getElementById('scan-modal-emp-name');
    const empIdEl = document.getElementById('scan-modal-emp-id');
    const empDeptEl = document.getElementById('scan-modal-emp-dept');
    const tenantNameEl = document.getElementById('scan-modal-tenant-name');
    const shiftEl = document.getElementById('scan-modal-shift');
    const timeEl = document.getElementById('scan-modal-time');
    const errMsgEl = document.getElementById('scan-modal-error-message');
    const errDetailEl = document.getElementById('scan-modal-error-detail');

    if (res && res.valid && res.record) {
      // Status Sukses
      if (successSection) successSection.classList.remove('hidden');
      if (errorSection) errorSection.classList.add('hidden');

      if (empNameEl) empNameEl.textContent = res.record.employeeName || 'Karyawan';
      if (empIdEl) empIdEl.textContent = res.record.employeeId || empId || '-';
      if (empDeptEl) empDeptEl.textContent = res.record.department || '-';
      if (tenantNameEl) tenantNameEl.textContent = res.record.tenantName || '-';
      if (shiftEl) shiftEl.textContent = res.record.shift || '-';
      if (timeEl) timeEl.textContent = `${res.record.time || ''} WIB`;

      if (window.Store && typeof Store.playSound === 'function') {
        Store.playSound('success');
      }
    } else {
      // Status Gagal / Ditolak
      if (successSection) successSection.classList.add('hidden');
      if (errorSection) errorSection.classList.remove('hidden');

      if (errMsgEl) errMsgEl.textContent = (res && res.message) ? res.message : 'Absensi tidak dapat diproses.';

      if (errDetailEl) {
        if (res && res.existingAttendance) {
          errDetailEl.innerHTML = `
            <div class="flex items-start gap-2">
              <i class="fa-solid fa-triangle-exclamation text-rose-500 mt-0.5"></i>
              <div>
                <p class="font-bold">Sudah Mengambil Jatah Makan Hari Ini:</p>
                <p class="mt-0.5">Di <b>${res.existingAttendance.tenantName || 'Kantin'}</b> pukul <b>${res.existingAttendance.time || ''} WIB</b> (${res.existingAttendance.shift || ''}).</p>
                <p class="mt-1 text-[11px] text-rose-600 font-medium">Ketentuan: Setiap karyawan hanya memiliki 1x kuota makan per hari.</p>
              </div>
            </div>
          `;
          errDetailEl.classList.remove('hidden');
        } else if (res && res.code === 'OUTSIDE_HOURS') {
          errDetailEl.innerHTML = `
            <div class="flex items-start gap-2">
              <i class="fa-solid fa-clock text-rose-500 mt-0.5"></i>
              <div>
                <p class="font-bold">Di Luar Jam Operasional Kantin:</p>
                <p class="mt-0.5">Absensi makan hanya dibuka pukul <b>11:00 - 19:00 WIB</b> (Siang: 11:00-15:00, Sore: 15:01-19:00).</p>
              </div>
            </div>
          `;
          errDetailEl.classList.remove('hidden');
        } else {
          errDetailEl.classList.add('hidden');
        }
      }

      if (window.Store && typeof Store.playSound === 'function') {
        Store.playSound('error');
      }
    }

    // Tampilkan modal
    modal.classList.remove('hidden');

    // Reset timer auto-close
    if (this.scanModalTimer) {
      clearTimeout(this.scanModalTimer);
      this.scanModalTimer = null;
    }

    // Auto dismiss dalam 8 detik jika belum ditutup manual
    this.scanModalTimer = setTimeout(() => {
      AttendanceManager.closeScanModal();
    }, 8000);
  },

  closeScanModal() {
    const modal = document.getElementById('scan-result-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
    if (this.scanModalTimer) {
      clearTimeout(this.scanModalTimer);
      this.scanModalTimer = null;
    }
    this.currentScanOwnerEmpId = null;
  },

  // --- Fitur Halaman Khusus Karyawan (Portal Mandiri) ---
  initEmployeePortal() {
    this.closeScanModal();
    const resultBox = document.getElementById('emp-portal-result');
    if (resultBox) resultBox.innerHTML = '';
    this.populateEmployeeSelector();
    this.updateEmployeePortalCard();
    this.renderEmployeePersonalQR();
    this.renderCanteenSimulationButtons();
    this.renderPersonalHistory();
  },

  populateEmployeeSelector() {
    const switcherBar = document.getElementById('admin-emp-switcher-bar');
    const select = document.getElementById('admin-emp-switch-select') || document.getElementById('emp-portal-select');
    const user = Auth.getCurrentUser();
    const isAdmin = user && user.role === 'admin';

    if (switcherBar) {
      if (isAdmin) {
        switcherBar.classList.remove('hidden');
      } else {
        switcherBar.classList.add('hidden');
      }
    }

    if (!select) return;

    const employees = Store.getEmployees();
    const activeId = Auth.getActiveEmployeeId();

    select.innerHTML = '';
    employees.forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp.id;
      const isTrn = emp.department === 'Training' || emp.isTrainee;
      opt.textContent = `${emp.id} - ${emp.name} (${isTrn ? 'Magang' : emp.department})`;
      if (emp.id.toLowerCase() === (activeId || '').toLowerCase()) opt.selected = true;
      select.appendChild(opt);
    });

    select.onchange = (e) => {
      AttendanceManager.adminSwitchActiveEmployee(e.target.value);
    };
  },

  adminSwitchActiveEmployee(empId) {
    if (!empId) return;
    AttendanceManager.closeScanModal();
    const resultBox = document.getElementById('emp-portal-result');
    if (resultBox) resultBox.innerHTML = '';
    Auth.setActiveEmployeeId(empId);
    AttendanceManager.updateEmployeePortalCard();
    AttendanceManager.renderEmployeePersonalQR();
    AttendanceManager.renderPersonalHistory();
  },

  updateEmployeePortalCard() {
    const activeId = Auth.getActiveEmployeeId();
    const emp = Store.findEmployee(activeId);
    const cardContainer = document.getElementById('emp-portal-profile');
    const quotaContainer = document.getElementById('emp-portal-quota');
    const user = Auth.getCurrentUser();

    if (!emp || !cardContainer) return;

    const isAktif = emp.status === 'Aktif';

    cardContainer.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-extrabold text-xl flex items-center justify-center shadow-sm">
          ${emp.name.charAt(0)}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="font-extrabold text-base text-slate-900 truncate">${emp.name}</h3>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isAktif ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
              ${emp.status}
            </span>
          </div>
          <p class="text-xs text-slate-500 font-mono mt-0.5">${emp.id} &bull; ${emp.department} &bull; ${emp.position || 'Staff'}</p>
          <div class="flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg inline-flex border border-emerald-200">
            <i class="fa-solid fa-key text-amber-500"></i>
            <span>Password Akun: <b class="font-mono text-slate-700">${emp.password || 'password123'}</b></span>
          </div>
        </div>
      </div>
    `;

    if (quotaContainer) {
      const todayStr = Store.getTodayDateString();
      const attendances = Store.getAttendances(todayStr);
      const recordToday = attendances.find(a => a.employeeId.toLowerCase() === emp.id.toLowerCase());

      if (recordToday) {
        quotaContainer.innerHTML = `
          <div class="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
            <i class="fa-solid fa-circle-check text-rose-600 text-base mt-0.5"></i>
            <div>
              <p class="text-xs font-bold text-rose-900">Jatah Makan Hari Ini Sudah Diambil</p>
              <p class="text-[11px] text-rose-700 mt-0.5">
                Sudah makan di <b>${recordToday.tenantName}</b> pukul <b>${recordToday.time}</b> (${recordToday.shift}).
              </p>
            </div>
          </div>
        `;
      } else {
        quotaContainer.innerHTML = `
          <div class="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5">
            <i class="fa-solid fa-utensils text-emerald-600 text-base"></i>
            <div>
              <p class="text-xs font-bold text-emerald-900">Jatah 1x Makan Tersedia Hari Ini</p>
              <p class="text-[11px] text-emerald-700">Silakan scan QR Code di meja kasir kantin untuk mengambil makanan.</p>
            </div>
          </div>
        `;
      }
    }
  },

  renderEmployeePersonalQR() {
    const box = document.getElementById('emp-personal-qr-box');
    const nameEl = document.getElementById('emp-personal-qr-name');
    const posEl = document.getElementById('emp-personal-qr-position');
    const idEl = document.getElementById('emp-personal-qr-id');
    if (!box) return;

    const activeId = Auth.getActiveEmployeeId();
    const emp = Store.findEmployee(activeId);
    if (!emp) return;

    if (nameEl) nameEl.innerText = emp.name;
    if (posEl) posEl.innerText = emp.position || emp.department;
    if (idEl) idEl.innerText = emp.id;

    box.innerHTML = '';
    if (window.QRCode) {
      new QRCode(box, {
        text: emp.id,
        width: 140,
        height: 140,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  },

  renderCanteenSimulationButtons() {
    const container = document.getElementById('emp-canteen-sim-buttons');
    if (!container) return;

    const tenants = Store.getTenants();
    const colors = [
      { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', icon: 'text-blue-600' },
      { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', icon: 'text-purple-600' },
      { bg: 'bg-amber-50', hover: 'hover:bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', icon: 'text-amber-600' },
      { bg: 'bg-teal-50', hover: 'hover:bg-teal-100', text: 'text-teal-800', border: 'border-teal-200', icon: 'text-teal-600' },
      { bg: 'bg-rose-50', hover: 'hover:bg-rose-100', text: 'text-rose-800', border: 'border-rose-200', icon: 'text-rose-600' }
    ];

    container.innerHTML = tenants.map((t, idx) => {
      const c = colors[idx % colors.length];
      return `
        <button onclick="AttendanceManager.simulateScanCanteen('${t.id}')" class="py-2 px-3 rounded-xl ${c.bg} ${c.hover} ${c.text} text-xs font-bold border ${c.border} transition flex items-center justify-center gap-1.5 shadow-xs">
          <i class="fa-solid fa-store ${c.icon}"></i> Scan Meja ${t.name}
        </button>
      `;
    }).join('');
  },

  renderPersonalHistory() {
    const tbody = document.getElementById('emp-personal-history-body');
    if (!tbody) return;

    const activeId = Auth.getActiveEmployeeId();
    const allRecords = Store.getAttendances();
    const myRecords = allRecords.filter(r => r.employeeId && r.employeeId.toLowerCase() === activeId.toLowerCase());

    if (myRecords.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-6 text-center text-slate-400 text-xs">
            <i class="fa-solid fa-utensils text-2xl mb-1 block opacity-40"></i>
            Belum ada riwayat absensi makan untuk akun Anda.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = myRecords.map((r, idx) => {
      const isLunch = r.shift && r.shift.includes('Siang');
      return `
        <tr class="hover:bg-slate-50 border-b border-slate-100 transition">
          <td class="py-2.5 px-3 text-xs text-slate-400 font-mono">${idx + 1}</td>
          <td class="py-2.5 px-3 text-xs font-bold text-slate-800 font-mono">${r.date} ${r.time}</td>
          <td class="py-2.5 px-3 text-xs font-extrabold text-emerald-800">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
              <i class="fa-solid fa-store text-emerald-600"></i> ${r.tenantName}
            </span>
          </td>
          <td class="py-2.5 px-3 text-xs">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${isLunch ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}">
              <i class="fa-solid ${isLunch ? 'fa-sun' : 'fa-moon'} mr-1"></i> ${r.shift}
            </span>
          </td>
          <td class="py-2.5 px-3 text-xs">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              <i class="fa-solid fa-check mr-1"></i> Sukses
            </span>
          </td>
        </tr>
      `;
    }).join('');
  },

  toggleEmployeeScanner() {
    const readerId = 'emp-portal-qr-reader';
    const btn = document.getElementById('emp-portal-btn-cam');
    const readerDiv = document.getElementById(readerId);

    if (!readerDiv) return;

    if (this.activeScanner.employee) {
      this.activeScanner.employee.stop().then(() => {
        this.activeScanner.employee = null;
        readerDiv.classList.add('hidden');
        if (btn) {
          btn.innerHTML = `<i class="fa-solid fa-camera mr-2"></i> Buka Kamera Scan QR Kantin`;
          btn.className = `w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center`;
        }
      }).catch(err => console.error(err));
    } else {
      if (!window.Html5Qrcode) {
        alert('Modul pemindai kamera sedang dimuat.');
        return;
      }

      readerDiv.classList.remove('hidden');
      const html5QrCode = new Html5Qrcode(readerId);
      this.activeScanner.employee = html5QrCode;

      const config = { fps: 10, qrbox: { width: 230, height: 230 } };
      html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          AttendanceManager.processScannedCanteenQR(decodedText.trim());
        },
        (errorMessage) => {}
      ).then(() => {
        if (btn) {
          btn.innerHTML = `<i class="fa-solid fa-camera-slash mr-2"></i> Tutup Kamera Scanner`;
          btn.className = `w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center`;
        }
      }).catch(err => {
        alert('Gagal mengakses kamera: ' + err);
        readerDiv.classList.add('hidden');
        this.activeScanner.employee = null;
      });
    }
  },

  processScannedCanteenQR(qrText) {
    let tenantKey = null;
    const cleanText = (qrText || '').trim();
    const tenants = Store.getTenants();

    if (cleanText.startsWith('DEPOT:')) {
      const scannedId = cleanText.substring(6).trim();
      const match = tenants.find(t => t.id === scannedId || t.name.toLowerCase() === scannedId.toLowerCase());
      tenantKey = match ? match.id : scannedId;
    } else {
      const lower = cleanText.toLowerCase();
      const match = tenants.find(t => t.id.toLowerCase() === lower || lower.includes(t.name.toLowerCase()));
      if (match) {
        tenantKey = match.id;
      }
    }

    if (!tenantKey) {
      const activeEmpId = Auth.getActiveEmployeeId();
      this.showScanModal({
        valid: false,
        code: 'INVALID_QR',
        message: 'QR Code meja kantin tidak dikenali atau format salah. Harap arahkan kamera ke QR Code resmi meja kasir kantin hotel.'
      }, activeEmpId);

      const resultBox = document.getElementById('emp-portal-result');
      if (resultBox) {
        resultBox.innerHTML = `
          <div class="p-4 bg-amber-500 text-white rounded-2xl shadow-md">
            <h4 class="font-bold text-sm">QR Code Tidak Dikenali</h4>
            <p class="text-xs text-amber-100 mt-1">Harap arahkan kamera ke QR Code resmi meja kasir kantin hotel.</p>
          </div>
        `;
      }
      Store.playSound('error');
      return;
    }

    const activeEmpId = Auth.getActiveEmployeeId();
    const res = Store.recordAttendance(activeEmpId, tenantKey);

    // Tampilkan Modal Pop-up Hasil Scan untuk Karyawan Terkait
    this.showScanModal(res, activeEmpId);

    const resultBox = document.getElementById('emp-portal-result');

    if (res.valid) {
      if (resultBox) {
        resultBox.innerHTML = `
          <div class="p-5 bg-emerald-600 text-white rounded-2xl shadow-lg animate-bounce-short">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                <i class="fa-solid fa-check"></i>
              </div>
              <div class="flex-1">
                <h4 class="font-extrabold text-base tracking-wide uppercase">ABSENSI BERHASIL!</h4>
                <p class="text-xs text-emerald-100 font-semibold mt-0.5">
                  Selamat Makan, <b>${res.record.employeeName}</b> (${res.record.employeeId})!
                </p>
                <p class="text-xs text-emerald-200 mt-1">
                  Kantin: <b>${res.record.tenantName}</b> &bull; Shift: <b>${res.record.shift}</b> (${res.record.time} WIB)
                </p>
              </div>
            </div>
            <div class="mt-3 pt-2 border-t border-emerald-500/60 text-[11px] text-emerald-100 flex items-center gap-1.5">
              <i class="fa-solid fa-circle-info"></i> Tunjukkan layar ini ke kasir kantin untuk mengambil makanan Anda.
            </div>
          </div>
        `;
      }

      this.updateEmployeePortalCard();
      this.renderPersonalHistory();
      this.renderTodayList('tenant1');
      this.renderTodayList('tenant2');
      if (window.Dashboard) window.Dashboard.updateData();

      if (this.activeScanner.employee) {
        this.toggleEmployeeScanner();
      }
    } else {
      if (resultBox) {
        resultBox.innerHTML = `
          <div class="p-5 bg-rose-600 text-white rounded-2xl shadow-lg">
            <div class="flex items-start gap-3">
              <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold shrink-0 mt-0.5">
                <i class="fa-solid fa-xmark"></i>
              </div>
              <div class="flex-1">
                <h4 class="font-extrabold text-base tracking-wide uppercase">ABSENSI DITOLAK</h4>
                <p class="text-xs text-rose-100 mt-1 leading-relaxed">${res.message}</p>
              </div>
            </div>
          </div>
        `;
      }
    }

    if (resultBox) {
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  simulateScanCanteen(tenantKey) {
    const tenantName = Store.getTenantName(tenantKey);
    const modal = document.getElementById('canteen-scan-confirm-modal');
    const msgEl = document.getElementById('canteen-scan-confirm-msg');
    const yesBtn = document.getElementById('canteen-scan-confirm-yes');
    const noBtn = document.getElementById('canteen-scan-confirm-no');

    if (modal && msgEl && yesBtn && noBtn) {
      msgEl.innerHTML = `Apakah Anda yakin ingin melakukan scan absensi makan di <strong class="text-slate-900 font-extrabold">${tenantName}</strong>?`;
      modal.classList.remove('hidden');

      const handleYes = () => {
        modal.classList.add('hidden');
        cleanup();
        AttendanceManager.processScannedCanteenQR(`DEPOT:${tenantKey}`);
      };

      const handleNo = () => {
        modal.classList.add('hidden');
        cleanup();
      };

      const cleanup = () => {
        yesBtn.removeEventListener('click', handleYes);
        noBtn.removeEventListener('click', handleNo);
      };

      yesBtn.addEventListener('click', handleYes);
      noBtn.addEventListener('click', handleNo);
    } else {
      if (confirm(`Apakah Anda yakin ingin melakukan scan absensi makan di ${tenantName}?`)) {
        this.processScannedCanteenQR(`DEPOT:${tenantKey}`);
      }
    }
  },

  // Fitur Ganti Password Sendiri oleh Karyawan
  changeCurrentEmployeePassword() {
    const currentEmpId = Auth.getActiveEmployeeId();
    if (!currentEmpId) {
      alert('Tidak ada sesi karyawan aktif.');
      return;
    }

    const newPassEl = document.getElementById('emp-portal-new-pass');
    const confirmPassEl = document.getElementById('emp-portal-confirm-pass');
    const alertEl = document.getElementById('emp-portal-pass-alert');

    const newPass = newPassEl ? newPassEl.value.trim() : '';
    const confirmPass = confirmPassEl ? confirmPassEl.value.trim() : '';

    if (!newPass) {
      if (alertEl) {
        alertEl.innerHTML = `
          <div class="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-1.5">
            <i class="fa-solid fa-circle-exclamation text-rose-500"></i> Password baru tidak boleh kosong.
          </div>
        `;
      }
      return;
    }

    if (newPass.length < 4) {
      if (alertEl) {
        alertEl.innerHTML = `
          <div class="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-1.5">
            <i class="fa-solid fa-circle-exclamation text-rose-500"></i> Password minimal 4 karakter.
          </div>
        `;
      }
      return;
    }

    if (newPass !== confirmPass) {
      if (alertEl) {
        alertEl.innerHTML = `
          <div class="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-1.5">
            <i class="fa-solid fa-circle-exclamation text-rose-500"></i> Konfirmasi password tidak cocok!
          </div>
        `;
      }
      return;
    }

    const res = Store.updateEmployeePassword(currentEmpId, newPass);
    if (res.success) {
      if (newPassEl) newPassEl.value = '';
      if (confirmPassEl) confirmPassEl.value = '';
      this.updateEmployeePortalCard();
      if (alertEl) {
        alertEl.innerHTML = `
          <div class="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl font-medium flex items-center gap-1.5">
            <i class="fa-solid fa-check-circle text-emerald-600"></i> Password berhasil diperbarui! Silakan gunakan password ini untuk login berikutnya.
          </div>
        `;
        setTimeout(() => { if (alertEl) alertEl.innerHTML = ''; }, 4500);
      }
      Store.playSound('success');
    } else {
      if (alertEl) {
        alertEl.innerHTML = `
          <div class="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-1.5">
            <i class="fa-solid fa-circle-exclamation text-rose-500"></i> ${res.message}
          </div>
        `;
      }
    }
  }
};

window.AttendanceManager = AttendanceManager;
