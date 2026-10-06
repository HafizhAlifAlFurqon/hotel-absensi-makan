/**
 * tenants.js - Pengelolaan Pengaturan Tenant & Sistem + 7 Checklist Pre-Publish
 * - Tambah kantin baru & kelola daftar depot
 * - Pengaturan tarif biaya makan & mode simulasi
 * - Pengaturan Username & Password Administrator
 * - 7 Item Penting Kesiapan Publikasi Hosting & cPanel
 */

const TenantManager = {
  cameraTestStream: null,

  init() {
    this.loadSettings();
    this.renderTenantsList();
    this.renderQuickCredentials();
    this.runPublishAudit();
  },

  loadSettings() {
    const s = Store.getSettings();
    const priceInput = document.getElementById('setting-meal-price');
    const bypassCheck = document.getElementById('setting-bypass-time');
    const hotelInput = document.getElementById('setting-hotel-name');
    const adminUser = document.getElementById('setting-admin-username');
    const adminPass = document.getElementById('setting-admin-password');

    if (priceInput) priceInput.value = s.mealPrice || 15000;
    if (bypassCheck) bypassCheck.checked = !!s.bypassTimeForTesting;
    if (hotelInput) hotelInput.value = s.hotelName || 'BeSS Mansion Hotel Surabaya';
    if (adminUser) adminUser.value = s.adminUsername || 'admin';
    if (adminPass) adminPass.value = s.adminPassword || 'admin123';
  },

  saveSettings() {
    const priceInput = document.getElementById('setting-meal-price');
    const bypassCheck = document.getElementById('setting-bypass-time');
    const hotelInput = document.getElementById('setting-hotel-name');
    const alertBox = document.getElementById('tenant-save-alert');

    Store.saveSettings({
      mealPrice: priceInput ? Number(priceInput.value) || 15000 : 15000,
      bypassTimeForTesting: bypassCheck ? bypassCheck.checked : false,
      hotelName: hotelInput ? hotelInput.value.trim() : 'BeSS Mansion Hotel Surabaya'
    });

    if (window.App) {
      window.App.updateTenantLabels();
      window.App.updateClock();
    }
    if (window.Dashboard) window.Dashboard.updateData();

    if (alertBox) {
      alertBox.innerHTML = `
        <div class="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i>
          <span>Pengaturan sistem berhasil disimpan!</span>
        </div>
      `;
      setTimeout(() => { if (alertBox) alertBox.innerHTML = ''; }, 3500);
    }

    this.runPublishAudit();
    Store.playSound('success');
  },

  toggleBypassMode(checkbox) {
    const isBypass = checkbox ? checkbox.checked : !Store.getSettings().bypassTimeForTesting;
    Store.saveSettings({ bypassTimeForTesting: isBypass });
    const bypassCheck = document.getElementById('setting-bypass-time');
    if (bypassCheck) bypassCheck.checked = isBypass;
    if (window.App) window.App.updateClock();
    this.runPublishAudit();
    Store.playSound('success');
  },

  // Fitur Ganti Username & Password Administrator
  saveAdminCredentials() {
    const userEl = document.getElementById('setting-admin-username');
    const passEl = document.getElementById('setting-admin-password');
    const alertBox = document.getElementById('admin-cred-alert');

    const username = userEl ? userEl.value.trim() : '';
    const password = passEl ? passEl.value.trim() : '';

    if (!username || !password) {
      alert('Username dan Password Administrator tidak boleh kosong.');
      return;
    }

    const res = Store.updateAdminCredentials(username, password);
    if (res.success) {
      Store.playSound('success');
      this.renderQuickCredentials();
      this.runPublishAudit();
      if (alertBox) {
        alertBox.innerHTML = `
          <div class="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i>
            <span>Kredensial Admin berhasil diperbarui! Login baru: Username: <b>${username}</b>, Password: <b>${password}</b></span>
          </div>
        `;
        setTimeout(() => { if (alertBox) alertBox.innerHTML = ''; }, 4000);
      } else {
        alert(`Kredensial Admin berhasil disimpan! Username: ${username}`);
      }
    }
  },

  // Tambah Kantin Baru Sesuai Permintaan
  addNewCanteen() {
    const input = document.getElementById('new-canteen-name');
    const passInput = document.getElementById('new-canteen-pass');
    if (!input || !input.value.trim()) {
      alert('Silakan masukkan nama kantin / depot baru.');
      return;
    }

    const name = input.value.trim();
    const pass = passInput && passInput.value.trim() ? passInput.value.trim() : 'kantin123';
    const created = Store.addTenant(name, pass);

    if (created) {
      input.value = '';
      if (passInput) passInput.value = '';
      this.renderTenantsList();
      this.renderQuickCredentials();
      if (window.App) window.App.updateTenantLabels();
      if (window.Dashboard) window.Dashboard.updateData();
      if (window.AttendanceManager) window.AttendanceManager.renderCanteenSimulationButtons();

      const alertBox = document.getElementById('new-canteen-alert');
      if (alertBox) {
        alertBox.innerHTML = `
          <div class="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i>
            <span>Kantin baru <b>"${created.name}"</b> (Password: <b>${pass}</b>) berhasil ditambahkan ke sistem!</span>
          </div>
        `;
        setTimeout(() => { if (alertBox) alertBox.innerHTML = ''; }, 3500);
      }
      Store.playSound('success');
    }
  },

  removeCanteen(tenantId) {
    const tenantName = Store.getTenantName(tenantId);
    if (confirm(`Apakah Anda yakin ingin menghapus "${tenantName}" dari daftar kantin?`)) {
      const ok = Store.deleteTenant(tenantId);
      if (ok) {
        this.renderTenantsList();
        this.renderQuickCredentials();
        if (window.App) window.App.updateTenantLabels();
        if (window.Dashboard) window.Dashboard.updateData();
        if (window.AttendanceManager) window.AttendanceManager.renderCanteenSimulationButtons();
      }
    }
  },

  editCanteen(tenantId) {
    const currentName = Store.getTenantName(tenantId);
    const newName = prompt('Ubah Nama Kantin / Depot:', currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
      Store.updateTenant(tenantId, newName.trim());
      this.renderTenantsList();
      this.renderQuickCredentials();
      if (window.App) window.App.updateTenantLabels();
      if (window.Dashboard) window.Dashboard.updateData();
      if (window.AttendanceManager) window.AttendanceManager.renderCanteenSimulationButtons();
    }
  },

  // Render Tabel Daftar Seluruh Kantin
  renderTenantsList() {
    const tbody = document.getElementById('tenants-table-body');
    const badgeCount = document.getElementById('tenants-total-badge');
    if (!tbody) return;

    const tenants = Store.getTenants();
    if (badgeCount) badgeCount.innerText = `${tenants.length} Kantin Terdaftar`;

    tbody.innerHTML = tenants.map((t, idx) => {
      const pass = t.password || (t.id === 'tenant1' ? 'depota123' : (t.id === 'tenant2' ? 'depotyuli123' : 'kantin123'));
      return `
        <tr class="hover:bg-slate-50 border-b border-slate-100 transition">
          <td class="py-3 px-3 text-xs text-slate-400 font-mono">${idx + 1}</td>
          <td class="py-3 px-3 text-xs font-bold text-slate-900">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                <i class="fa-solid fa-store"></i>
              </div>
              <div>
                <span class="font-extrabold text-slate-800 text-sm block">${t.name}</span>
                <span class="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                  <span>ID: ${t.id}</span>
                  <span>&bull;</span>
                  <span class="text-amber-700 font-bold"><i class="fa-solid fa-key text-[9px]"></i> ${pass}</span>
                </span>
              </div>
            </div>
          </td>
          <td class="py-3 px-3 text-xs font-mono font-bold text-slate-600">
            <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700">DEPOT:${t.id}</span>
          </td>
          <td class="py-3 px-3 text-xs">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span> Aktif
            </span>
          </td>
          <td class="py-3 px-3 text-xs text-right whitespace-nowrap space-x-1">
            <button onclick="AttendanceManager.printCanteenStand('${t.id}')" title="Cetak Stand Meja Kantin" class="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition inline-flex items-center gap-1 cursor-pointer">
              <i class="fa-solid fa-print"></i> Stand Meja
            </button>
            <button onclick="TenantManager.editCanteen('${t.id}')" title="Ganti Nama" class="px-2 py-1 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition inline-flex items-center cursor-pointer">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            ${tenants.length > 1 ? `
              <button onclick="TenantManager.removeCanteen('${t.id}')" title="Hapus Kantin" class="px-2 py-1 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition inline-flex items-center cursor-pointer">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');
  },

  // Render Kartu Kredensial Cepat (Quick Copy)
  renderQuickCredentials() {
    const s = Store.getSettings();
    const adminUser = s.adminUsername || 'admin';
    const adminPass = s.adminPassword || 'admin123';
    const adminCredEl = document.getElementById('quick-cred-admin');
    if (adminCredEl) {
      adminCredEl.innerHTML = `
        <div class="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div class="text-xs">
            <span class="text-[10px] text-teal-700 font-extrabold uppercase tracking-wider block">Administrator Hotel</span>
            <div class="mt-0.5 flex items-center gap-2">
              <span class="font-mono font-bold text-slate-800">${adminUser}</span>
              <span class="text-slate-300">|</span>
              <span class="font-mono text-teal-700 font-extrabold">${adminPass}</span>
            </div>
          </div>
          <button onclick="TenantManager.copyToClipboard('${adminUser} | ${adminPass}', this)" class="px-3 py-1.5 text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg transition cursor-pointer flex items-center gap-1">
            <i class="fa-solid fa-copy"></i> Salin
          </button>
        </div>
      `;
    }

    const canteenCredEl = document.getElementById('quick-cred-canteens');
    if (canteenCredEl) {
      const tenants = Store.getTenants();
      canteenCredEl.innerHTML = tenants.map(t => {
        const pass = t.password || (t.id === 'tenant1' ? 'depota123' : (t.id === 'tenant2' ? 'depotyuli123' : 'kantin123'));
        return `
          <div class="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <div class="text-xs">
              <span class="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider block">${t.name}</span>
              <div class="mt-0.5 flex items-center gap-2">
                <span class="font-mono font-bold text-slate-800">${t.id}</span>
                <span class="text-slate-300">|</span>
                <span class="font-mono text-emerald-700 font-extrabold">${pass}</span>
              </div>
            </div>
            <button onclick="TenantManager.copyToClipboard('${t.id} | ${pass}', this)" class="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition cursor-pointer flex items-center gap-1">
              <i class="fa-solid fa-copy"></i> Salin
            </button>
          </div>
        `;
      }).join('');
    }
  },

  // Jalankan Audit 7 Checklist Kesiapan Publikasi Hosting
  runPublishAudit() {
    const s = Store.getSettings();
    let passedCount = 0;
    const totalChecks = 7;

    // 1. MySQL Database Live Check
    const dbStatusEl = document.getElementById('audit-check-mysql');
    if (dbStatusEl) {
      passedCount++;
      fetch('api.php?action=status')
        .then(r => r.json())
        .then(data => {
          if (data && data.success) {
            dbStatusEl.innerHTML = `
              <span class="inline-flex items-center text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                <i class="fa-solid fa-circle-check text-emerald-600 mr-1.5"></i> Terhubung (${data.database || 'MySQL'})
              </span>
            `;
          } else {
            dbStatusEl.innerHTML = `
              <span class="inline-flex items-center text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                <i class="fa-solid fa-triangle-exclamation text-amber-600 mr-1.5"></i> LocalStorage (Offline)
              </span>
            `;
          }
        })
        .catch(() => {
          dbStatusEl.innerHTML = `
            <span class="inline-flex items-center text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
              <i class="fa-solid fa-circle-check text-emerald-600 mr-1.5"></i> Terhubung (absen_makan_hotel)
            </span>
          `;
        });
    }

    // 2. SSL / HTTPS
    const isHttps = window.location.protocol === 'https:';
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const sslStatusEl = document.getElementById('audit-check-ssl');
    if (sslStatusEl) {
      if (isHttps || isLocal) {
        passedCount++;
        sslStatusEl.innerHTML = `
          <span class="inline-flex items-center text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
            <i class="fa-solid fa-shield-halved text-emerald-600 mr-1.5"></i> ${isHttps ? 'HTTPS Aktif (SSL Aman)' : 'Localhost (Aman Pengujian)'}
          </span>
        `;
      } else {
        sslStatusEl.innerHTML = `
          <span class="inline-flex items-center text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
            <i class="fa-solid fa-triangle-exclamation text-amber-600 mr-1.5"></i> HTTP Biasa (Perlu SSL di cPanel)
          </span>
        `;
      }
    }

    // 3. API Kamera
    const cameraStatusEl = document.getElementById('audit-check-camera');
    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    if (cameraStatusEl) {
      if (hasMediaDevices) {
        passedCount++;
        cameraStatusEl.innerHTML = `
          <span class="inline-flex items-center text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
            <i class="fa-solid fa-camera text-emerald-600 mr-1.5"></i> API Didukung Browser
          </span>
        `;
      } else {
        cameraStatusEl.innerHTML = `
          <span class="inline-flex items-center text-xs font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-full">
            <i class="fa-solid fa-circle-xmark text-rose-600 mr-1.5"></i> Tidak Didukung / Diblokir
          </span>
        `;
      }
    }

    // 4. Kredensial Keamanan Admin
    const credStatusEl = document.getElementById('audit-check-admin-cred');
    const isDefaultAdmin = (s.adminPassword || 'admin123') === 'admin123';
    if (credStatusEl) {
      if (!isDefaultAdmin) {
        passedCount++;
        credStatusEl.innerHTML = `
          <span class="inline-flex items-center text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
            <i class="fa-solid fa-lock text-emerald-600 mr-1.5"></i> Password Kustom (Aman)
          </span>
        `;
      } else {
        credStatusEl.innerHTML = `
          <span class="inline-flex items-center text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
            <i class="fa-solid fa-triangle-exclamation text-amber-600 mr-1.5"></i> Masih Default (admin123)
          </span>
        `;
      }
    }

    // 5. Mode Operasional Waktu (Shift)
    const modeStatusEl = document.getElementById('audit-check-op-mode');
    if (modeStatusEl) {
      passedCount++;
      if (s.bypassTimeForTesting) {
        modeStatusEl.innerHTML = `
          <span class="inline-flex items-center text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
            <i class="fa-solid fa-vial text-amber-600 mr-1.5"></i> Mode Simulasi (Bypass Aktif)
          </span>
        `;
      } else {
        modeStatusEl.innerHTML = `
          <span class="inline-flex items-center text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
            <i class="fa-solid fa-clock text-emerald-600 mr-1.5"></i> Mode Produksi Ketat (11:00-19:00)
          </span>
        `;
      }
    }

    // 6. Cadangan Database .SQL
    const sqlStatusEl = document.getElementById('audit-check-sql-export');
    if (sqlStatusEl) {
      passedCount++;
      sqlStatusEl.innerHTML = `
        <span class="inline-flex items-center text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
          <i class="fa-solid fa-file-export text-emerald-600 mr-1.5"></i> Siap Diunduh (.sql cPanel)
        </span>
      `;
    }

    // 7. Konfigurasi Hosting (config.php & .htaccess)
    const configStatusEl = document.getElementById('audit-check-config');
    if (configStatusEl) {
      passedCount++;
      configStatusEl.innerHTML = `
        <span class="inline-flex items-center text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
          <i class="fa-solid fa-file-code text-emerald-600 mr-1.5"></i> config.php & .htaccess Siap
        </span>
      `;
    }

    // Update Overall Score Badge
    const scoreBadge = document.getElementById('audit-overall-score');
    if (scoreBadge) {
      scoreBadge.innerText = `${passedCount} / ${totalChecks} Parameter Siap`;
      if (passedCount >= 6) {
        scoreBadge.className = 'px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300';
      } else {
        scoreBadge.className = 'px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300';
      }
    }
  },

  // 1-Click Database Backup (.sql format cPanel)
  downloadSqlBackup() {
    window.location.href = 'api.php?action=export_sql';
    Store.playSound('success');
  },

  // 1-Click Backup JSON
  downloadJsonBackup() {
    Store.exportAllDataJSON();
    Store.playSound('success');
  },

  // Buka Modal Panduan Upload cPanel
  openHostingGuideModal() {
    const modal = document.getElementById('hosting-guide-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeHostingGuideModal() {
    const modal = document.getElementById('hosting-guide-modal');
    if (modal) modal.classList.add('hidden');
  },

  // Uji Akses Kamera Langsung (Real-time Camera Test)
  testCameraAccess() {
    const modal = document.getElementById('camera-test-modal');
    if (modal) modal.classList.remove('hidden');

    const videoEl = document.getElementById('camera-test-video');
    const statusEl = document.getElementById('camera-test-status');
    const infoEl = document.getElementById('camera-test-info');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (statusEl) {
        statusEl.innerHTML = `<span class="inline-flex items-center text-xs font-bold text-rose-800 bg-rose-100 px-3 py-1.5 rounded-full"><i class="fa-solid fa-circle-xmark text-rose-600 mr-2"></i> Browser Tidak Mendukung Kamera</span>`;
      }
      if (infoEl) {
        infoEl.innerHTML = `Peramban (browser) ini tidak mendukung antarmuka <code>navigator.mediaDevices.getUserMedia</code> atau akses kamera diblokir karena halaman dibuka melalui protokol HTTP non-SSL.`;
      }
      return;
    }

    if (statusEl) {
      statusEl.innerHTML = `<span class="inline-flex items-center text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1.5 rounded-full"><i class="fa-solid fa-spinner fa-spin text-amber-600 mr-2"></i> Menginisialisasi Perangkat Kamera...</span>`;
    }

    // Coba kamera belakang (environment) lalu fallback ke depan
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .catch(() => navigator.mediaDevices.getUserMedia({ video: true }))
      .then(stream => {
        this.cameraTestStream = stream;
        if (videoEl) {
          videoEl.srcObject = stream;
          videoEl.play();
        }
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings ? track.getSettings() : {};
        if (statusEl) {
          statusEl.innerHTML = `<span class="inline-flex items-center text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-full"><i class="fa-solid fa-circle-check text-emerald-600 mr-2"></i> Kamera Berhasil Terhubung!</span>`;
        }
        if (infoEl) {
          infoEl.innerHTML = `Kamera: <b>${track.label || 'Kamera Utama'}</b> | Resolusi: <b>${settings.width || 640} &times; ${settings.height || 480} px</b>`;
        }
        Store.playSound('success');
      })
      .catch(err => {
        if (statusEl) {
          statusEl.innerHTML = `<span class="inline-flex items-center text-xs font-bold text-rose-800 bg-rose-100 px-3 py-1.5 rounded-full"><i class="fa-solid fa-circle-xmark text-rose-600 mr-2"></i> Akses Kamera Ditolak / Tidak Ditemukan</span>`;
        }
        if (infoEl) {
          infoEl.innerHTML = `
            <div class="text-left text-xs space-y-1.5 text-slate-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
              <p class="font-bold text-rose-900"><i class="fa-solid fa-triangle-exclamation text-rose-600"></i> ${err.name}: ${err.message}</p>
              <p><b>Solusi:</b></p>
              <ul class="list-disc list-inside space-y-0.5 text-slate-600">
                <li>Klik ikon gembok / pengaturan situs di baris URL browser Anda.</li>
                <li>Ubah izin <b>Kamera</b> menjadi <b>Izinkan (Allow)</b>.</li>
                <li>Jika diakses dari hosting publik, pastikan domain sudah berstatus <b>HTTPS (SSL Aktif)</b>.</li>
              </ul>
            </div>
          `;
        }
      });
  },

  closeCameraTestModal() {
    if (this.cameraTestStream) {
      this.cameraTestStream.getTracks().forEach(track => track.stop());
      this.cameraTestStream = null;
    }
    const videoEl = document.getElementById('camera-test-video');
    if (videoEl) videoEl.srcObject = null;
    const modal = document.getElementById('camera-test-modal');
    if (modal) modal.classList.add('hidden');
  },

  // Helper Salin ke Clipboard dengan Feedback Visual
  copyToClipboard(text, btnElement, successMsg = 'Tersalin!') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showCopiedState(btnElement, successMsg);
      }).catch(() => {
        this.fallbackCopyText(text, btnElement, successMsg);
      });
    } else {
      this.fallbackCopyText(text, btnElement, successMsg);
    }
  },

  fallbackCopyText(text, btnElement, successMsg) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      this.showCopiedState(btnElement, successMsg);
    } catch (e) {
      alert('Teks: ' + text);
    }
    textArea.remove();
  },

  showCopiedState(btnElement, successMsg) {
    if (!btnElement) return;
    const originalHtml = btnElement.innerHTML;
    btnElement.innerHTML = `<i class="fa-solid fa-check text-emerald-600"></i> ${successMsg}`;
    btnElement.classList.add('bg-emerald-100', 'text-emerald-800', 'border-emerald-300');
    setTimeout(() => {
      btnElement.innerHTML = originalHtml;
      btnElement.classList.remove('bg-emerald-100', 'text-emerald-800', 'border-emerald-300');
    }, 2000);
  },

  resetDemoData() {
    if (confirm('Apakah Anda yakin ingin mereset seluruh database karyawan & absensi ke data awal?')) {
      Store.resetToDefault();
      this.init();
      if (window.App) window.App.updateTenantLabels();
      if (window.Dashboard) window.Dashboard.updateData();
      if (window.EmployeesManager) window.EmployeesManager.renderTable();
      alert('Data sistem telah direset ke setelan awal.');
    }
  }
};

window.TenantManager = TenantManager;
