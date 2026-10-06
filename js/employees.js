/**
 * employees.js - Pengelolaan Data Master Karyawan
 * - Tambah Karyawan Baru (Auto Generate ID sequential & Default Password)
 * - Edit Username / Nama Karyawan & Ganti Password Karyawan oleh Admin
 * - Pembuatan Database Karyawan Massal (Batch Import / Generate)
 * - Cetak Daftar Akun & Kredensial Login Karyawan
 * - Filter 9 Departemen, Status Aktif/Non-Aktif
 */

const EmployeesManager = {
  editingId: null,
  listenersAttached: false,
  isSaving: false,

  init() {
    this.populateDepartmentSelects();
    this.prepareFormNextId();
    this.renderTable();
    this.setupListeners();
  },

  showFormAlert(message, type = 'success') {
    const alertBox = document.getElementById('emp-form-alert');
    if (!alertBox) return;
    const isSuccess = type === 'success';
    const bgClass = isSuccess ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800';
    const iconClass = isSuccess ? 'fa-circle-check text-emerald-600' : 'fa-circle-exclamation text-rose-600';
    alertBox.innerHTML = `
      <div class="p-3 ${bgClass} border rounded-xl text-xs flex items-center gap-2 animate-bounce-short">
        <i class="fa-solid ${iconClass} text-base shrink-0"></i>
        <span>${message}</span>
      </div>
    `;
    if (this._alertTimeout) clearTimeout(this._alertTimeout);
    this._alertTimeout = setTimeout(() => {
      if (alertBox) alertBox.innerHTML = '';
    }, 4500);
  },

  populateDepartmentSelects() {
    const selects = ['emp-form-dept', 'emp-filter-dept', 'batch-default-dept'];
    selects.forEach(selectId => {
      const el = document.getElementById(selectId);
      if (!el) return;

      const currentValue = el.value;
      if (selectId === 'emp-filter-dept') {
        el.innerHTML = '<option value="">Semua Departemen (10 Pilihan)</option>';
      } else if (selectId === 'batch-default-dept') {
        el.innerHTML = '<option value="Housekeeping" selected>Housekeeping</option>';
      } else {
        el.innerHTML = '<option value="" disabled selected>-- Pilih Departemen --</option>';
      }

      window.DEPARTMENTS.forEach(dept => {
        if (selectId === 'batch-default-dept' && dept === 'Housekeeping') return;
        const opt = document.createElement('option');
        opt.value = dept;
        opt.textContent = dept;
        el.appendChild(opt);
      });

      if (currentValue) el.value = currentValue;
    });
  },

  // Otomatis siapkan ID Karyawan berikutnya & default password
  prepareFormNextId() {
    if (this.editingId) return;
    const idEl = document.getElementById('emp-form-id');
    const passEl = document.getElementById('emp-form-password');
    if (idEl && !idEl.value) {
      idEl.value = Store.generateNextEmployeeId();
    }
    if (passEl && !passEl.value) {
      passEl.value = 'password123';
    }
  },

  setupListeners() {
    // FIX BUG: Cegah penambahan listener ganda yang menyebabkan submit berkali-kali
    if (this.listenersAttached) return;
    this.listenersAttached = true;

    const form = document.getElementById('emp-add-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        EmployeesManager.handleSave();
      });
    }

    const searchInput = document.getElementById('emp-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        EmployeesManager.renderTable();
      });
    }

    const deptFilter = document.getElementById('emp-filter-dept');
    if (deptFilter) {
      deptFilter.addEventListener('change', () => {
        EmployeesManager.renderTable();
      });
    }

    const statusFilter = document.getElementById('emp-filter-status');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        EmployeesManager.renderTable();
      });
    }
  },

  handleSave() {
    // FIX BUG: Cegah eksekusi berulang / klik berkali-kali
    if (this.isSaving) return;
    this.isSaving = true;

    try {
      const nameEl = document.getElementById('emp-form-name');
      const idEl = document.getElementById('emp-form-id');
      const deptEl = document.getElementById('emp-form-dept');
      const posEl = document.getElementById('emp-form-position');
      const statusEl = document.getElementById('emp-form-status');
      const passEl = document.getElementById('emp-form-password');

      const name = nameEl ? nameEl.value.trim() : '';
      const id = idEl ? idEl.value.trim().toUpperCase() : '';
      const dept = deptEl ? deptEl.value : '';
      const position = posEl ? posEl.value.trim() : 'Staff';
      const status = statusEl ? statusEl.value : 'Aktif';
      const password = passEl ? passEl.value.trim() : 'password123';

      if (!name || !id || !dept) {
        this.showFormAlert('Mohon lengkapi Nama, ID, dan Departemen karyawan.', 'error');
        Store.playSound('error');
        return;
      }

      const empData = {
        id,
        name,
        department: dept,
        position: position || 'Staff',
        status,
        password: password || 'password123'
      };

      if (this.editingId) {
        // Admin mengubah data karyawan yang ada (termasuk username/nama & password)
        const res = Store.updateEmployee(this.editingId, empData);
        if (!res.success) {
          this.showFormAlert(res.message, 'error');
          Store.playSound('error');
          return;
        }
      } else {
        // Cek duplikasi ID jika tambah baru
        const existing = Store.findEmployee(id);
        if (existing) {
          this.showFormAlert(`ID Karyawan "${id}" sudah digunakan oleh ${existing.name}. Gunakan ID lain.`, 'error');
          Store.playSound('error');
          return;
        }
        Store.saveEmployee(empData);
      }

      // Reset Form
      this.editingId = null;
      if (nameEl) nameEl.value = '';
      if (idEl) idEl.value = '';
      if (deptEl) deptEl.value = '';
      if (posEl) posEl.value = '';
      if (statusEl) statusEl.value = 'Aktif';
      if (passEl) passEl.value = '';

      const submitBtn = document.getElementById('emp-btn-submit');
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fa-solid fa-plus mr-1"></i> Tambah Karyawan';
      }
      const cancelBtn = document.getElementById('emp-btn-cancel-edit');
      if (cancelBtn) cancelBtn.classList.add('hidden');

      this.prepareFormNextId();
      this.showFormAlert(`Data karyawan <b>${name} (${id})</b> berhasil disimpan! Karyawan dapat langsung login dengan password: <b>${password}</b>`, 'success');
      Store.playSound('success');

      this.renderTable();
      if (window.QRCardsManager) window.QRCardsManager.render();
      if (window.Dashboard) window.Dashboard.updateData();
    } finally {
      this.isSaving = false;
    }
  },

  editEmployee(id) {
    const emp = Store.findEmployee(id);
    if (!emp) return;

    this.editingId = emp.id;
    const nameEl = document.getElementById('emp-form-name');
    const idEl = document.getElementById('emp-form-id');
    const deptEl = document.getElementById('emp-form-dept');
    const posEl = document.getElementById('emp-form-position');
    const statusEl = document.getElementById('emp-form-status');
    const passEl = document.getElementById('emp-form-password');
    const submitBtn = document.getElementById('emp-btn-submit');
    const cancelBtn = document.getElementById('emp-btn-cancel-edit');

    if (nameEl) nameEl.value = emp.name;
    if (idEl) idEl.value = emp.id;
    if (deptEl) deptEl.value = emp.department;
    if (posEl) posEl.value = emp.position || '';
    if (statusEl) statusEl.value = emp.status;
    if (passEl) passEl.value = emp.password || 'password123';

    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fa-solid fa-save mr-1"></i> Simpan Perubahan Karyawan';
    }
    if (cancelBtn) {
      cancelBtn.classList.remove('hidden');
    }

    // Scroll ke form
    const formEl = document.getElementById('emp-add-form');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
  },

  cancelEdit() {
    this.editingId = null;
    const nameEl = document.getElementById('emp-form-name');
    const idEl = document.getElementById('emp-form-id');
    const deptEl = document.getElementById('emp-form-dept');
    const posEl = document.getElementById('emp-form-position');
    const statusEl = document.getElementById('emp-form-status');
    const passEl = document.getElementById('emp-form-password');
    const submitBtn = document.getElementById('emp-btn-submit');
    const cancelBtn = document.getElementById('emp-btn-cancel-edit');

    if (nameEl) nameEl.value = '';
    if (idEl) idEl.value = '';
    if (deptEl) deptEl.value = '';
    if (posEl) posEl.value = '';
    if (statusEl) statusEl.value = 'Aktif';
    if (passEl) passEl.value = '';

    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fa-solid fa-plus mr-1"></i> Tambah Karyawan';
    }
    if (cancelBtn) {
      cancelBtn.classList.add('hidden');
    }

    this.prepareFormNextId();
  },

  // Fitur Cepat Admin: Ganti Password Karyawan Langsung
  quickResetPassword(id) {
    const emp = Store.findEmployee(id);
    if (!emp) return;

    const currentPass = emp.password || 'password123';
    const newPass = prompt(`Ganti Password Karyawan:\nNama: ${emp.name} (${emp.id})\n\nMasukkan password baru:`, currentPass);

    if (newPass !== null) {
      const trimmed = newPass.trim();
      if (!trimmed) {
        this.showFormAlert('Password tidak boleh kosong!', 'error');
        return;
      }
      const res = Store.updateEmployeePassword(id, trimmed);
      if (res.success) {
        Store.playSound('success');
        this.renderTable();
        this.showFormAlert(`Password untuk "${emp.name}" berhasil diubah menjadi: ${trimmed}`, 'success');
      } else {
        this.showFormAlert(res.message, 'error');
      }
    }
  },

  // Fitur Cepat Admin: Ganti Username / Nama Karyawan Langsung
  quickEditUsername(id) {
    const emp = Store.findEmployee(id);
    if (!emp) return;

    const newName = prompt(`Ganti Username / Nama Karyawan (${emp.id}):\n\nMasukkan nama / username baru:`, emp.name);
    if (newName !== null) {
      const trimmed = newName.trim();
      if (!trimmed) {
        this.showFormAlert('Nama tidak boleh kosong!', 'error');
        return;
      }
      const res = Store.updateEmployee(id, { name: trimmed });
      if (res.success) {
        Store.playSound('success');
        this.renderTable();
        if (window.QRCardsManager) window.QRCardsManager.render();
        if (window.Dashboard) window.Dashboard.updateData();
        this.showFormAlert(`Nama / Username karyawan berhasil diubah menjadi: "${trimmed}"`, 'success');
      } else {
        this.showFormAlert(res.message, 'error');
      }
    }
  },

  toggleStatus(id) {
    const updated = Store.toggleEmployeeStatus(id);
    if (updated) {
      this.renderTable();
      if (window.Dashboard) window.Dashboard.updateData();
    }
  },

  deleteEmployee(id) {
    const emp = Store.findEmployee(id);
    if (!emp) return;

    if (confirm(`Yakin ingin menghapus karyawan "${emp.name}" (${emp.id}) dari database?`)) {
      Store.deleteEmployee(id);
      this.renderTable();
      this.prepareFormNextId();
      if (window.QRCardsManager) window.QRCardsManager.render();
      if (window.Dashboard) window.Dashboard.updateData();
    }
  },

  clearAllEmployees() {
    if (confirm('Apakah Anda yakin ingin menghapus semua data karyawan (termasuk 15 data contoh bawaan) agar database benar-benar bersih dan hanya berisi karyawan yang Anda buat sendiri?')) {
      Store.clearAllEmployees();
      this.renderTable();
      this.prepareFormNextId();
      if (window.QRCardsManager) window.QRCardsManager.render();
      if (window.Dashboard) window.Dashboard.updateData();
      this.showFormAlert('Semua data karyawan sampel berhasil dibersihkan! Anda sekarang dapat mendaftarkan karyawan Anda sendiri mulai dari ID EMP-001.', 'success');
      Store.playSound('success');
    }
  },

  // ================= BATCH IMPORT / PEMBUATAN DATABASE MASSAL =================
  openBatchModal() {
    const modal = document.getElementById('emp-batch-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.populateDepartmentSelects();
    }
  },

  closeBatchModal() {
    const modal = document.getElementById('emp-batch-modal');
    if (modal) modal.classList.add('hidden');
  },

  fillBatchSample() {
    const textarea = document.getElementById('batch-emp-textarea');
    if (!textarea) return;

    const sampleText = [
      'Budi Santoso, Front Office, Front Desk Agent, budi123',
      'Rina Kartika, Housekeeping, Room Attendant, rina123',
      'Ahmad Hidayat, F&B Service, Waiter, ahmad123',
      'Dewi Lestari, Kitchen, Demi Chef, dewi123',
      'Agus Prasetyo, Engineering, Technician, agus123',
      'Sari Wulandari, Sales & Marketing, Sales Executive, sari123',
      'Hendra Wijaya, Accounting & Finance, Income Auditor, hendra123',
      'Mega Permata, HRD & Personnel, HR Officer, mega123',
      'Bambang Sukoco, Security, Security Officer, bambang123',
      'Dian Sastro, Executive & Admin, Guest Relation Officer, dian123'
    ].join('\n');

    textarea.value = sampleText;
  },

  handleBatchSubmit() {
    const textarea = document.getElementById('batch-emp-textarea');
    const defaultDeptEl = document.getElementById('batch-default-dept');
    const alertBox = document.getElementById('batch-modal-alert');
    if (!textarea) return;

    const raw = textarea.value.trim();
    if (!raw) {
      alert('Silakan masukkan data karyawan (satu karyawan per baris).');
      return;
    }

    const defaultDept = defaultDeptEl ? defaultDeptEl.value : 'Housekeeping';
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const empList = [];
    lines.forEach(line => {
      // Mendukung format dipisah koma (CSV) atau tab:
      // Nama, Departemen, Jabatan, Password
      const parts = line.split(/[,;\t]/).map(p => p.trim());
      const name = parts[0];
      if (!name) return;

      const dept = (parts[1] && parts[1].length > 0) ? parts[1] : defaultDept;
      const pos = (parts[2] && parts[2].length > 0) ? parts[2] : 'Staff';
      const pass = (parts[3] && parts[3].length > 0) ? parts[3] : 'password123';

      empList.push({
        name,
        department: dept,
        position: pos,
        password: pass,
        status: 'Aktif'
      });
    });

    if (empList.length === 0) {
      alert('Format data tidak terbaca dengan benar.');
      return;
    }

    const result = Store.batchAddEmployees(empList);
    Store.playSound('success');

    this.renderTable();
    this.prepareFormNextId();
    if (window.QRCardsManager) window.QRCardsManager.render();
    if (window.Dashboard) window.Dashboard.updateData();

    if (alertBox) {
      alertBox.innerHTML = `
        <div class="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i>
          <span>Berhasil menambahkan <b>${result.count} Karyawan</b> ke dalam database! Karyawan dapat langsung masuk dengan password masing-masing.</span>
        </div>
      `;
      setTimeout(() => {
        if (alertBox) alertBox.innerHTML = '';
        this.closeBatchModal();
        textarea.value = '';
      }, 2000);
    } else {
      this.closeBatchModal();
      textarea.value = '';
      alert(`Berhasil menambahkan ${result.count} karyawan ke dalam database!`);
    }
  },

  // ================= CETAK DAFTAR AKUN & KREDENSIAL LOGIN =================
  printEmployeeAccounts() {
    const employees = Store.getEmployees();
    const settings = Store.getSettings();
    const hotelName = settings.hotelName || 'BeSS Mansion Hotel Surabaya';
    const now = new Date();
    const printDate = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Pop-up terblokir oleh browser. Izinkan pop-up untuk mencetak daftar akun.');
      return;
    }

    const rowsHtml = employees.map((emp, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 7px 8px; text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="padding: 7px 8px; font-family: monospace; font-weight: bold; color: #0f172a;">${emp.id}</td>
        <td style="padding: 7px 8px; font-weight: bold; color: #0f172a;">${emp.name}</td>
        <td style="padding: 7px 8px; color: #334155;">${emp.department}</td>
        <td style="padding: 7px 8px; color: #475569;">${emp.position || '-'}</td>
        <td style="padding: 7px 8px; font-family: monospace; font-weight: bold; color: #047857; background: #ecfdf5;">${emp.password || 'password123'}</td>
        <td style="padding: 7px 8px; text-align: center; font-weight: 600; color: ${emp.status === 'Aktif' ? '#047857' : '#be123c'};">${emp.status}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Daftar Kredensial Akun Karyawan - ${hotelName}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; line-height: 1.4; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .header h1 { font-size: 18px; margin: 0; text-transform: uppercase; color: #0f172a; letter-spacing: -0.5px; }
          .header p { margin: 2px 0 0 0; font-size: 12px; color: #475569; }
          .meta { font-size: 11px; color: #64748b; text-align: right; }
          .summary-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 11px; display: flex; justify-content: space-between; align-items: center; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f1f5f9; color: #334155; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px; border-bottom: 2px solid #cbd5e1; text-align: left; }
          .instructions { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px 14px; margin-top: 16px; }
          .instructions h3 { margin: 0 0 6px 0; font-size: 12px; color: #166534; }
          .instructions ol { margin: 0; padding-left: 20px; font-size: 11px; color: #14532d; }
          .instructions li { margin-bottom: 3px; }
          .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
          @media print {
            .no-print { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px; display: flex; gap: 8px;">
          <button onclick="window.print()" style="padding: 8px 16px; background: #059669; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Cetak Sekarang</button>
          <button onclick="window.close()" style="padding: 8px 16px; background: #64748b; color: white; border: none; border-radius: 6px; cursor: pointer;">Tutup</button>
        </div>

        <div class="header">
          <div>
            <h1>${hotelName}</h1>
            <p>Daftar Akun & Kredensial Login Karyawan (Sistem Absensi Makan Kantin)</p>
          </div>
          <div class="meta">
            <div>Total: <b>${employees.length} Karyawan</b></div>
            <div>Dicetak: ${printDate}</div>
          </div>
        </div>

        <div class="summary-card">
          <span><b>Catatan Administrator:</b> Bagikan kredensial ID / Nama dan Password di bawah ini kepada masing-masing karyawan untuk login.</span>
          <span style="font-weight: bold; color: #047857;">Rahasia & Internal</span>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">No</th>
              <th style="width: 80px;">ID Karyawan</th>
              <th>Nama Karyawan (Username Login)</th>
              <th>Departemen</th>
              <th>Jabatan</th>
              <th style="width: 120px;">Password Default</th>
              <th style="width: 70px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="instructions">
          <h3>Petunjuk Login Bagi Karyawan:</h3>
          <ol>
            <li>Buka halaman sistem absensi makan di HP atau Komputer Anda.</li>
            <li>Pada layar login, masukkan <b>Nama Karyawan</b> atau <b>ID Karyawan</b> Anda.</li>
            <li>Masukkan <b>Password</b> yang tertera pada daftar di atas (Contoh: <code>password123</code>).</li>
            <li>Setelah berhasil masuk, Anda dapat langsung melakukan scan QR kasir kantin untuk mengambil makan.</li>
            <li>Karyawan dapat mengubah password pribadi sewaktu-waktu di menu <b>"Portal Karyawan" &gt; "Ubah Password Saya"</b>.</li>
          </ol>
        </div>

        <div class="footer">
          Dokumen Kredensial Resmi &bull; ${hotelName} &bull; Dicetak Otomatis oleh Sistem Absensi Makan Hotel
        </div>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  },

  renderTable() {
    const tbody = document.getElementById('emp-table-body');
    const countBadge = document.getElementById('emp-total-badge');
    if (!tbody) return;

    let employees = Store.getEmployees();

    // Filters
    const searchVal = (document.getElementById('emp-search-input')?.value || '').toLowerCase().trim();
    const deptVal = document.getElementById('emp-filter-dept')?.value || '';
    const statusVal = document.getElementById('emp-filter-status')?.value || '';

    if (searchVal) {
      employees = employees.filter(e =>
        e.name.toLowerCase().includes(searchVal) ||
        e.id.toLowerCase().includes(searchVal) ||
        (e.position && e.position.toLowerCase().includes(searchVal))
      );
    }

    if (deptVal) {
      employees = employees.filter(e => e.department === deptVal);
    }

    if (statusVal) {
      employees = employees.filter(e => e.status === statusVal);
    }

    if (countBadge) {
      countBadge.innerText = `${employees.length} Karyawan`;
    }

    if (employees.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-8 text-gray-400">
            <i class="fa-solid fa-users-slash text-3xl mb-2 block opacity-40"></i>
            Tidak ada data karyawan yang cocok dengan kriteria pencarian.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = employees.map((emp, index) => {
      const isAktif = emp.status === 'Aktif';
      const statusBadge = isAktif
        ? `<button onclick="EmployeesManager.toggleStatus('${emp.id}')" title="Klik untuk mengubah status" class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition cursor-pointer">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5 animate-pulse"></span> Aktif
           </button>`
        : `<button onclick="EmployeesManager.toggleStatus('${emp.id}')" title="Klik untuk mengubah status" class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 hover:bg-rose-200 transition cursor-pointer">
            <span class="w-1.5 h-1.5 rounded-full bg-rose-600 mr-1.5"></span> Non Aktif
           </button>`;

      const passDisplay = emp.password || 'password123';

      return `
        <tr class="hover:bg-slate-50 border-b border-slate-100 transition">
          <td class="py-3 px-3 text-xs text-slate-400 font-mono">${index + 1}</td>
          <td class="py-3 px-3 text-xs font-mono font-bold text-slate-900">${emp.id}</td>
          <td class="py-3 px-3 text-xs font-semibold text-slate-900">
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-100 to-teal-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                ${emp.name.charAt(0)}
              </span>
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="font-bold text-slate-900 leading-tight">${emp.name}</span>
                  <button onclick="EmployeesManager.quickEditUsername('${emp.id}')" title="Ubah Nama/Username Cepat" class="text-slate-400 hover:text-emerald-700 text-[11px] p-0.5 transition cursor-pointer">
                    <i class="fa-solid fa-pen text-[10px]"></i>
                  </button>
                </div>
                <div class="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                  <span class="flex items-center gap-1 bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
                    <i class="fa-solid fa-key text-[9px] text-amber-600"></i> ${passDisplay}
                  </span>
                  <button onclick="EmployeesManager.quickResetPassword('${emp.id}')" title="Ganti Password Karyawan" class="text-amber-700 hover:text-amber-900 underline text-[10px] cursor-pointer">
                    Ganti Pass
                  </button>
                </div>
              </div>
            </div>
          </td>
          <td class="py-3 px-3 text-xs text-slate-700">
            <span class="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-800">${emp.department}</span>
          </td>
          <td class="py-3 px-3 text-xs text-slate-600">${emp.position || '-'}</td>
          <td class="py-3 px-3 text-xs">${statusBadge}</td>
          <td class="py-3 px-3 text-xs text-right whitespace-nowrap space-x-1">
            <button onclick="EmployeesManager.quickResetPassword('${emp.id}')" class="text-amber-700 hover:text-amber-900 p-1.5 rounded-lg hover:bg-amber-50 transition border border-transparent hover:border-amber-200 cursor-pointer" title="Ganti Password Karyawan">
              <i class="fa-solid fa-key"></i>
            </button>
            <button onclick="EmployeesManager.editEmployee('${emp.id}')" class="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition border border-transparent hover:border-blue-200 cursor-pointer" title="Edit Lengkap">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button onclick="EmployeesManager.deleteEmployee('${emp.id}')" class="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition border border-transparent hover:border-rose-200 cursor-pointer" title="Hapus Karyawan">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
};

window.EmployeesManager = EmployeesManager;
