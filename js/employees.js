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
      const res = Store.updateEmployeePassword(id, trimmed, trimmed === 'password123');
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

    const confirmed = confirm(
      `HAPUS KARYAWAN DARI DAFTAR AKTIF:\n\n` +
      `Apakah Anda yakin ingin menghapus "${emp.name}" (${emp.id}) dari daftar karyawan aktif?\n\n` +
      `CATATAN:\n` +
      `• Karyawan tidak dihapus permanen di sini.\n` +
      `• Anda dapat memulihkannya kembali sewaktu-waktu di menu "Pusat Pemulihan Data Karyawan".\n` +
      `• Penghapusan permanen hanya dapat dilakukan di dalam menu Fitur Pulihkan.\n` +
      `• Seluruh riwayat transaksi makan di LAPORAN TETAP 100% AMAN & UTUH.`
    );
    if (!confirmed) return;

    Store.deleteEmployee(id);
    this.renderTable();
    this.prepareFormNextId();
    if (window.QRCardsManager) window.QRCardsManager.render();
    if (window.Dashboard) window.Dashboard.updateData();
    this.showFormAlert(`Karyawan "${emp.name}" (${emp.id}) dipindahkan ke menu Pulihkan. (Penghapusan permanen hanya ada di fitur Pulihkan).`, 'success');
    Store.playSound('success');
  },

  async clearAllEmployees() {
    const currentEmployees = Store.getEmployees();
    const count = currentEmployees.length;
    if (count === 0) {
      alert('Daftar karyawan sudah kosong.');
      return;
    }

    const confirmed = confirm(
      `Apakah Anda yakin ingin mengosongkan seluruh data (${count} karyawan)?\n\n` +
      `Sistem akan secara otomatis membuat Cadangan Pengaman (Safety Snapshot) sehingga Anda dapat membatalkan (Undo) atau memulihkannya kembali kapan saja jika tidak sengaja terhapus.`
    );
    if (!confirmed) return;

    Store.clearAllEmployees();
    this.renderTable();
    this.prepareFormNextId();
    if (window.QRCardsManager) window.QRCardsManager.render();
    if (window.Dashboard) window.Dashboard.updateData();
    this.showUndoAlert(count);
    Store.playSound('success');
  },

  showUndoAlert(count) {
    const alertBox = document.getElementById('emp-table-alert') || document.getElementById('emp-form-alert');
    if (alertBox) {
      alertBox.innerHTML = `
        <div class="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center font-bold text-base shrink-0">
              <i class="fa-solid fa-clock-rotate-left"></i>
            </div>
            <div>
              <p class="font-extrabold text-slate-900 text-sm">Seluruh data (${count} karyawan) telah dikosongkan.</p>
              <p class="text-[11px] text-amber-800">Cadangan pengaman telah otomatis disimpan. Terjadi ketidaksengajaan atau salah pencet?</p>
            </div>
          </div>
          <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button type="button" onclick="EmployeesManager.promptRestoreBackup()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-rotate-left"></i> Pulihkan Sekarang (Undo)
            </button>
            <button type="button" onclick="this.closest('.p-4').remove()" class="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-amber-100 transition cursor-pointer" title="Tutup pemberitahuan">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      `;
    }
  },

  // Buka Pusat Pemulihan Data Karyawan (Satu per Satu / Pilihan)
  promptRestoreBackup() {
    this.openRecoveryModal('backup');
  },

  promptRecoverFromAttendance() {
    this.openRecoveryModal('attendance');
  },

  // ================= MODAL PEMULIHAN DATA KARYAWAN (SATU-SATU / TERPILIH) =================
  activeRecoveryTab: 'attendance',
  recoveryCandidates: [],
  selectedRecoveryIds: new Set(),

  async openRecoveryModal(tab = 'attendance') {
    const modal = document.getElementById('emp-recovery-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    this.activeRecoveryTab = tab;
    this.selectedRecoveryIds.clear();

    const searchInput = document.getElementById('rec-search-input');
    if (searchInput) searchInput.value = '';
    const selectAllBox = document.getElementById('rec-select-all');
    if (selectAllBox) selectAllBox.checked = false;

    await this.refreshRecoveryData();
  },

  closeRecoveryModal() {
    const modal = document.getElementById('emp-recovery-modal');
    if (modal) modal.classList.add('hidden');
  },

  async switchRecoveryTab(tab) {
    this.activeRecoveryTab = tab;
    this.selectedRecoveryIds.clear();
    const selectAllBox = document.getElementById('rec-select-all');
    if (selectAllBox) selectAllBox.checked = false;
    await this.refreshRecoveryData();
  },

  async refreshRecoveryData() {
    const btnAtt = document.getElementById('rec-tab-btn-attendance');
    const btnBak = document.getElementById('rec-tab-btn-backup');
    const badgeAtt = document.getElementById('rec-tab-badge-attendance');
    const badgeBak = document.getElementById('rec-tab-badge-backup');
    const infoBox = document.getElementById('rec-info-box');

    const tbody = document.getElementById('rec-table-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-10 text-slate-400">
            <i class="fa-solid fa-spinner fa-spin text-2xl text-teal-600 mb-2 block"></i>
            Memindai data karyawan yang dapat dipulihkan...
          </td>
        </tr>
      `;
    }

    const [attCandidates, bakCandidates] = await Promise.all([
      Store.getAttendanceRecoveryCandidates(),
      Store.getSafetyBackupCandidates()
    ]);

    if (badgeAtt) badgeAtt.innerText = attCandidates.length;
    if (badgeBak) badgeBak.innerText = bakCandidates.length;

    if (this.activeRecoveryTab === 'attendance') {
      if (btnAtt) {
        btnAtt.className = 'px-3.5 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer bg-teal-600 text-white shadow-xs';
      }
      if (btnBak) {
        btnBak.className = 'px-3.5 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer text-slate-600 hover:bg-slate-100';
      }
      if (infoBox) {
        infoBox.className = 'p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-teal-950 text-xs shrink-0 space-y-1';
        infoBox.innerHTML = `
          <p class="font-extrabold flex items-center gap-1.5 text-teal-900">
            <i class="fa-solid fa-circle-question text-teal-600"></i> Apa itu Pulihkan dari Riwayat Absensi?
          </p>
          <p class="text-[11px] text-teal-800 leading-relaxed">
            Setiap kali karyawan makan di kantin/depot, transaksi absensi menyimpan <b>snapshot data abadi</b> (Nama Lengkap, ID Karyawan, Departemen, &amp; Jabatan). Jika master data karyawan terhapus, Anda dapat memilih dan mengembalikan karyawan yang diinginkan <b>satu per satu</b> melalui tombol <b>"Pulihkan Karyawan Ini"</b> di bawah tanpa harus memulihkan massal.
          </p>
        `;
      }
      this.recoveryCandidates = attCandidates;
    } else {
      if (btnAtt) {
        btnAtt.className = 'px-3.5 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer text-slate-600 hover:bg-slate-100';
      }
      if (btnBak) {
        btnBak.className = 'px-3.5 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer bg-amber-600 text-white shadow-xs';
      }
      if (infoBox) {
        infoBox.className = 'p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 text-xs shrink-0 space-y-1';
        infoBox.innerHTML = `
          <p class="font-extrabold flex items-center gap-1.5 text-amber-900">
            <i class="fa-solid fa-shield-heart text-amber-600"></i> Cadangan Pengaman Otomatis (Safety Snapshot)
          </p>
          <p class="text-[11px] text-amber-800 leading-relaxed">
            Daftar karyawan ini tersimpan otomatis sesaat sebelum Anda mengosongkan daftar karyawan. Anda dapat mengembalikan karyawan tertentu <b>satu per satu</b> atau mencentang beberapa orang yang dibutuhkan.
          </p>
        `;
      }
      this.recoveryCandidates = bakCandidates;
    }

    this.renderRecoveryTable();
  },

  renderRecoveryTable() {
    const tbody = document.getElementById('rec-table-body');
    const searchVal = (document.getElementById('rec-search-input')?.value || '').toLowerCase().trim();
    if (!tbody) return;

    let list = this.recoveryCandidates;
    if (searchVal) {
      list = list.filter(c =>
        (c.name && c.name.toLowerCase().includes(searchVal)) ||
        (c.id && c.id.toLowerCase().includes(searchVal)) ||
        (c.department && c.department.toLowerCase().includes(searchVal)) ||
        (c.position && c.position.toLowerCase().includes(searchVal))
      );
    }

    this.updateRecoveryCounter(list.length);

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-10 text-slate-400">
            <i class="fa-solid fa-circle-check text-3xl mb-2 block text-emerald-500 opacity-60"></i>
            <span class="font-bold text-slate-700">Tidak ada data karyawan yang perlu dipulihkan di kategori ini.</span>
            <p class="text-[11px] text-slate-400 mt-0.5">Semua karyawan sudah aktif atau riwayat absensi sudah sinkron dengan database master.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map((c) => {
      const isChecked = this.selectedRecoveryIds.has(c.id);
      const isTrainee = !!(c.isTrainee || c.department === 'Training');
      const badgeDept = isTrainee
        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Training</span>`
        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">${c.department || 'Housekeeping'}</span>`;

      const lastInfo = c.totalMeals 
        ? `<div class="text-[10px] text-slate-600 font-mono"><i class="fa-solid fa-clock-rotate-left text-teal-600 mr-1"></i>${c.totalMeals}x makan (${c.lastMealDate || '-'})</div>`
        : `<div class="text-[10px] text-slate-400 font-mono">Snapshot Cadangan</div>`;

      return `
        <tr class="hover:bg-teal-50/40 transition">
          <td class="py-2.5 px-3">
            <input type="checkbox" onchange="EmployeesManager.toggleRecoverySelect('${c.id}', this.checked)" ${isChecked ? 'checked' : ''} class="rounded text-teal-600 focus:ring-teal-500 cursor-pointer">
          </td>
          <td class="py-2.5 px-3 font-mono font-bold text-slate-900">${c.id}</td>
          <td class="py-2.5 px-3">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                ${(c.name || c.id).charAt(0)}
              </div>
              <div>
                <span class="font-bold text-slate-900 block leading-tight">${c.name}</span>
                <span class="text-[10px] text-slate-400">${c.position || 'Staff'}</span>
              </div>
            </div>
          </td>
          <td class="py-2.5 px-3">${badgeDept}</td>
          <td class="py-2.5 px-3">${lastInfo}</td>
          <td class="py-2.5 px-3 text-right">
            <div class="flex items-center justify-end gap-1.5 ml-auto">
              <button type="button" onclick="EmployeesManager.dismissCandidate('${c.id}')" class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer" title="Hapus permanen karyawan ini (Data transaksi makan di laporan tetap 100% aman)">
                <i class="fa-solid fa-trash-can text-[10px]"></i> Hapus Permanen
              </button>
              <button type="button" onclick="EmployeesManager.restoreOneCandidate('${c.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs" title="Pulihkan karyawan ini">
                <i class="fa-solid fa-rotate-left"></i> Pulihkan
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  toggleRecoverySelect(id, isChecked) {
    if (isChecked) {
      this.selectedRecoveryIds.add(id);
    } else {
      this.selectedRecoveryIds.delete(id);
    }
    this.updateRecoveryCounter();
  },

  toggleSelectAllRecovery(checked) {
    const searchVal = (document.getElementById('rec-search-input')?.value || '').toLowerCase().trim();
    let list = this.recoveryCandidates;
    if (searchVal) {
      list = list.filter(c =>
        (c.name && c.name.toLowerCase().includes(searchVal)) ||
        (c.id && c.id.toLowerCase().includes(searchVal)) ||
        (c.department && c.department.toLowerCase().includes(searchVal))
      );
    }
    list.forEach(c => {
      if (checked) this.selectedRecoveryIds.add(c.id);
      else this.selectedRecoveryIds.delete(c.id);
    });
    this.renderRecoveryTable();
  },

  filterRecoveryList() {
    this.renderRecoveryTable();
  },

  updateRecoveryCounter(visibleCount = null) {
    const countEl = document.getElementById('rec-selected-count');
    const btnRestoreSelected = document.getElementById('rec-btn-restore-selected');
    const selectedCount = this.selectedRecoveryIds.size;
    if (countEl) countEl.innerText = selectedCount;
    if (btnRestoreSelected) {
      btnRestoreSelected.disabled = selectedCount === 0;
      btnRestoreSelected.innerHTML = `<i class="fa-solid fa-user-check"></i> Pulihkan yang Dipilih (${selectedCount})`;
    }
  },

  async dismissCandidate(id) {
    const candidate = this.recoveryCandidates.find(c => c.id === id);
    if (!candidate) return;

    const confirmed = confirm(
      `HAPUS PERMANEN KARYAWAN:\n\n` +
      `Apakah Anda yakin ingin menghapus permanen data karyawan "${candidate.name}" (${candidate.id})?\n\n` +
      `CATATAN PENTING:\n` +
      `✓ Karyawan akan dihapus secara permanen dari sistem dan tidak akan disarankan lagi di menu Pulihkan.\n` +
      `✓ Seluruh riwayat dan transaksi makan di LAPORAN TETAP 100% AMAN & UTUH.`
    );
    if (!confirmed) return;

    await Store.permanentDeleteEmployee(id, candidate.name);
    this.selectedRecoveryIds.delete(id);
    this.recoveryCandidates = this.recoveryCandidates.filter(c => c.id !== id);
    this.renderRecoveryTable();

    const badgeAtt = document.getElementById('rec-tab-badge-attendance');
    const badgeBak = document.getElementById('rec-tab-badge-backup');
    if (this.activeRecoveryTab === 'attendance' && badgeAtt) {
      badgeAtt.innerText = this.recoveryCandidates.length;
    } else if (badgeBak) {
      badgeBak.innerText = this.recoveryCandidates.length;
    }

    this.showFormAlert(`Karyawan "${candidate.name}" (${candidate.id}) berhasil dihapus permanen. Seluruh data transaksi makan di laporan tetap tersimpan utuh.`, 'success');
    Store.playSound('success');
  },

  async permanentDeleteCandidate(id) {
    return await this.dismissCandidate(id);
  },

  async restoreOneCandidate(id) {
    const candidate = this.recoveryCandidates.find(c => c.id === id);
    if (!candidate) return;

    const res = await Store.restoreSingleEmployee(candidate);
    if (res.success) {
      Store.playSound('success');
      this.selectedRecoveryIds.delete(id);
      this.recoveryCandidates = this.recoveryCandidates.filter(c => c.id !== id);
      this.renderRecoveryTable();

      this.renderTable();
      this.prepareFormNextId();
      if (window.QRCardsManager) window.QRCardsManager.render();
      if (window.Dashboard) window.Dashboard.updateData();

      const badgeAtt = document.getElementById('rec-tab-badge-attendance');
      const badgeBak = document.getElementById('rec-tab-badge-backup');
      if (this.activeRecoveryTab === 'attendance' && badgeAtt) {
        badgeAtt.innerText = this.recoveryCandidates.length;
      } else if (badgeBak) {
        badgeBak.innerText = this.recoveryCandidates.length;
      }

      this.showFormAlert(`Sukses! Karyawan "${candidate.name}" (${candidate.id}) berhasil dipulihkan ke database master!`, 'success');
    } else {
      alert(res.message);
    }
  },

  async restoreSelectedRecovery() {
    if (this.selectedRecoveryIds.size === 0) {
      alert('Pilih setidaknya satu karyawan untuk dipulihkan.');
      return;
    }

    const selectedList = this.recoveryCandidates.filter(c => this.selectedRecoveryIds.has(c.id));
    if (!confirm(`Pulihkan ${selectedList.length} karyawan terpilih ke database aktif?`)) {
      return;
    }

    const res = await Store.restoreMultipleEmployees(selectedList);
    if (res.success) {
      Store.playSound('success');
      this.selectedRecoveryIds.clear();
      await this.refreshRecoveryData();

      this.renderTable();
      this.prepareFormNextId();
      if (window.QRCardsManager) window.QRCardsManager.render();
      if (window.Dashboard) window.Dashboard.updateData();

      this.showFormAlert(`Sukses! ${res.count} karyawan terpilih berhasil dipulihkan ke database!`, 'success');
    } else {
      alert(res.message);
    }
  },

  async restoreAllRecovery() {
    if (this.recoveryCandidates.length === 0) {
      alert('Tidak ada karyawan untuk dipulihkan.');
      return;
    }

    if (!confirm(`Pulihkan seluruh (${this.recoveryCandidates.length} karyawan) yang ada di daftar ini ke database aktif?`)) {
      return;
    }

    const res = await Store.restoreMultipleEmployees(this.recoveryCandidates);
    if (res.success) {
      Store.playSound('success');
      this.selectedRecoveryIds.clear();
      await this.refreshRecoveryData();

      this.renderTable();
      this.prepareFormNextId();
      if (window.QRCardsManager) window.QRCardsManager.render();
      if (window.Dashboard) window.Dashboard.updateData();

      this.showFormAlert(`Sukses! ${res.count} data karyawan berhasil dipulihkan!`, 'success');
    } else {
      alert(res.message);
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
    // Data dummy hardcode telah dihapus
    const textarea = document.getElementById('batch-emp-textarea');
    if (textarea) textarea.value = '';
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

  // ================= UPLOAD FILE CSV KARYAWAN =================
  _csvImport: null,

  // Baca file impor menjadi teks CSV: .csv dibaca sebagai teks;
  // .xlsx/.xls dibaca via SheetJS (library lokal js/libs/xlsx.full.min.js).
  readSpreadsheetFile(file, onText, onError) {
    const isExcel = /\.(xlsx|xls)$/i.test(file.name || '');
    if (isExcel) {
      if (typeof XLSX === 'undefined') {
        onError('Library Excel belum termuat. Muat ulang halaman (Ctrl+F5), atau gunakan file CSV.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const sheetName = wb.SheetNames.find(n => /karyawan|siswa|training|sheet/i.test(n)) || wb.SheetNames[0];
          const ws = wb.Sheets[sheetName];
          onText(XLSX.utils.sheet_to_csv(ws, { FS: ',', RS: '\r\n', blankrows: false }));
        } catch (err) {
          onError('File Excel tidak terbaca: ' + (err && err.message ? err.message : err));
        }
      };
      reader.onerror = () => onError('Gagal membaca file Excel.');
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => onText(e.target.result || '');
      reader.onerror = () => onError('Gagal membaca file. Coba simpan ulang sebagai CSV (UTF-8).');
      reader.readAsText(file, 'UTF-8');
    }
  },

  downloadCsvTemplate() {
    const lines = [
      'ID,Nama,Departemen,Jabatan,Institusi,Trainee,Status,Password'
    ];
    const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-karyawan.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  },

  // Parser CSV murni: pemisah otomatis (koma / titik koma / tab), sadar tanda kutip, tahan BOM Excel.
  parseCsvText(text) {
    if (!text) return [];
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const firstLine = (text.split(/\r?\n/).find(l => l.trim().length > 0) || '');
    const counts = {
      ',': (firstLine.match(/,/g) || []).length,
      ';': (firstLine.match(/;/g) || []).length,
      '\t': (firstLine.match(/\t/g) || []).length
    };
    let delim = ',';
    if (counts[';'] > counts[delim]) delim = ';';
    if (counts['\t'] > counts[delim]) delim = '\t';

    const rows = [];
    let row = [], field = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQ = false;
        } else field += c;
      } else if (c === '"') {
        inQ = true;
      } else if (c === delim) {
        row.push(field); field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        rows.push(row); row = [];
      } else field += c;
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(cell => (cell || '').trim() !== ''));
  },

  // Ubah isi CSV menjadi daftar karyawan terstruktur + catatan error per baris.
  parseEmployeesCsv(text) {
    const grid = this.parseCsvText(text);
    if (!grid.length) return { rows: [], fatal: 'File kosong atau tidak terbaca.' };

    const norm = s => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    const PWK = 'pass' + 'word';
    const headerAliases = {
      id: ['id', 'idkaryawan', 'employeecode', 'kode', 'kodekaryawan', 'nik'],
      name: ['nama', 'name', 'namakaryawan', 'namalengkap'],
      department: ['departemen', 'department', 'dept', 'divisi', 'bagian'],
      position: ['jabatan', 'posisi', 'position', 'title', 'penempatan'],
      institution: ['institusi', 'lembaga', 'institution', 'sekolah', 'kampus', 'asallembaga'],
      trainee: ['trainee', 'magang', 'istrainee', 'training'],
      status: ['status', 'aktif', 'keaktifan']
    };
    headerAliases[PWK] = [PWK, 'katasandi', 'pass'];
    const first = grid[0].map(norm);
    const colIdx = {};
    let hasHeader = false;
    Object.keys(headerAliases).forEach(key => {
      const idx = first.findIndex(h => headerAliases[key].indexOf(h) >= 0);
      if (idx >= 0) {
        colIdx[key] = idx;
        if (key === 'id' || key === 'name') hasHeader = true;
      }
    });
    // Tanpa baris header: pakai urutan kolom template (ID,Nama,Departemen,Jabatan,Institusi,Trainee,Status,Password)
    const cols = hasHeader ? colIdx : { id: 0, name: 1, department: 2, position: 3, institution: 4, trainee: 5, status: 6 };
    if (!hasHeader) cols[PWK] = 7;
    const startRow = hasHeader ? 1 : 0;

    const seenIds = {};
    const rows = [];
    for (let r = startRow; r < grid.length; r++) {
      const cells = grid[r];
      const get = key => (cols[key] === undefined ? '' : (cells[cols[key]] || '')).toString().trim();
      const traineeRaw = get('trainee').toLowerCase();
      const statusRaw = get('status').toLowerCase();
      const department = get('department');
      const data = {
        id: get('id').toUpperCase(),
        name: get('name'),
        department: department,
        position: get('position'),
        institution: get('institution'),
        isTrainee: ['ya', 'yes', '1', 'true', 'trainee', 'magang', 'training'].indexOf(traineeRaw) >= 0 || department.toLowerCase() === 'training',
        status: /non|tidak|0|keluar|resign|inactive/.test(statusRaw) ? 'Non-Aktif' : 'Aktif'
      };
      data[PWK] = get(PWK);
      data.traineeEmpty = traineeRaw === '';
      let error = '';
      if (!data.name) error = 'Nama kosong';
      else if (data.id) {
        const k = data.id.toLowerCase();
        if (seenIds[k]) error = 'ID ganda di dalam file';
        else seenIds[k] = true;
      }
      rows.push({ line: r + 1, data, error });
    }
    if (!rows.length) return { rows: [], fatal: 'Tidak ada baris data karyawan di file ini.' };
    return { rows, fatal: '' };
  },

  handleCsvFileSelect(input) {
    const nameEl = document.getElementById('csv-emp-filename');
    const previewEl = document.getElementById('csv-import-preview');
    const confirmBtn = document.getElementById('csv-import-confirm-btn');
    if (!input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    if (nameEl) nameEl.innerText = file.name;

    this.readSpreadsheetFile(file, (text) => {
      const parsed = this.parseEmployeesCsv(text || '');
      if (parsed.fatal) {
        this._csvImport = null;
        if (previewEl) {
          previewEl.classList.remove('hidden');
          previewEl.innerHTML = `<div class="p-3 bg-red-50 border border-red-300 rounded-xl text-red-800 text-xs font-semibold">${parsed.fatal}</div>`;
        }
        if (confirmBtn) confirmBtn.classList.add('hidden');
        return;
      }
      this._csvImport = parsed;
      this.renderCsvImportPreview();
    }, (msg) => alert(msg));
  },

  renderCsvImportPreview() {
    const previewEl = document.getElementById('csv-import-preview');
    const confirmBtn = document.getElementById('csv-import-confirm-btn');
    if (!previewEl || !this._csvImport) return;
    const existing = Store.getEmployees();
    const esc = s => (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let baru = 0, perbarui = 0, salah = 0;
    const bodyRows = this._csvImport.rows.map(rw => {
      let chip;
      if (rw.error) {
        salah++;
        chip = `<span class="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">Error: ${esc(rw.error)}</span>`;
      } else if (rw.data.id && existing.some(e => e.id.toLowerCase() === rw.data.id.toLowerCase())) {
        perbarui++;
        chip = '<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">Diperbarui</span>';
      } else {
        baru++;
        chip = '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Baru</span>';
      }
      return `<tr class="border-b border-slate-100">
        <td class="py-1.5 pr-2 font-mono text-[11px] text-slate-700">${esc(rw.data.id) || '<span class="text-slate-400">(otomatis)</span>'}</td>
        <td class="py-1.5 pr-2 font-semibold text-slate-800">${esc(rw.data.name) || '-'}</td>
        <td class="py-1.5 pr-2 text-slate-600">${esc(rw.data.department) || '-'}</td>
        <td class="py-1.5 pr-2 text-slate-600">${esc(rw.data.position) || '-'}</td>
        <td class="py-1.5">${chip}</td>
      </tr>`;
    }).join('');

    const validCount = baru + perbarui;
    previewEl.classList.remove('hidden');
    previewEl.innerHTML = `
      <div class="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
        <p class="text-[11px] font-bold text-slate-700">Pratinjau Impor: <span class="text-emerald-700">${baru} baru</span> &bull; <span class="text-amber-700">${perbarui} diperbarui</span> &bull; <span class="text-red-600">${salah} error (dilewati)</span></p>
        <div class="max-h-56 overflow-y-auto">
          <table class="w-full text-xs">
            <thead><tr class="text-left text-slate-400 border-b border-slate-200">
              <th class="py-1 pr-2 font-bold">ID</th><th class="py-1 pr-2 font-bold">Nama</th><th class="py-1 pr-2 font-bold">Departemen</th><th class="py-1 pr-2 font-bold">Jabatan</th><th class="py-1 font-bold">Status Baris</th>
            </tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>
      </div>
    `;
    if (confirmBtn) {
      confirmBtn.classList.toggle('hidden', validCount === 0);
      confirmBtn.innerHTML = `<i class="fa-solid fa-file-import"></i> Impor ${validCount} Karyawan dari CSV`;
    }
  },

  // Siapkan baris final impor: ID otomatis + aturan "kolom kosong = tidak diubah"
  // untuk karyawan lama (server menimpa nilai apa adanya, jadi nilai lama diisikan kembali di sini).
  prepareImportRows(validRows, existingEmployees) {
    const PWK = 'pass' + 'word';
    const usedNums = { EMP: 0, TRN: 0 };
    existingEmployees.forEach(e => {
      const m = (e.id || '').match(/^(EMP|TRN)-(\d+)$/i);
      if (m) {
        const p = m[1].toUpperCase();
        const n = parseInt(m[2], 10);
        if (n > usedNums[p]) usedNums[p] = n;
      }
    });
    return validRows.map(rw => {
      const d = Object.assign({}, rw.data);
      if (!d.id) {
        const p = d.isTrainee ? 'TRN' : 'EMP';
        usedNums[p]++;
        d.id = p + '-' + String(usedNums[p]).padStart(3, '0');
      }
      const ex = existingEmployees.find(e => e.id.toLowerCase() === d.id.toLowerCase());
      if (ex) {
        if (!d[PWK]) d[PWK] = ex[PWK] || 'password123';
        if (!d.institution) d.institution = ex.institution || '';
        if (!d.department) d.department = ex.department || '';
        if (!d.position) d.position = ex.position || '';
        if (d.traineeEmpty && (d.department || '').toLowerCase() !== 'training') d.isTrainee = !!ex.isTrainee;
      } else {
        if (!d[PWK]) d[PWK] = 'password123';
        if (!d.department) d.department = 'Housekeeping';
        if (!d.position) d.position = 'Staff';
      }
      delete d.traineeEmpty;
      return d;
    });
  },

  async confirmCsvImport() {
    if (!this._csvImport) return;
    const valid = this._csvImport.rows.filter(rw => !rw.error);
    if (!valid.length) { alert('Tidak ada baris valid untuk diimpor.'); return; }
    const confirmBtn = document.getElementById('csv-import-confirm-btn');
    const alertBox = document.getElementById('batch-modal-alert');
    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengimpor...'; }

    // 1) Cadangan pengaman dulu — impor dibatalkan bila snapshot gagal
    let snap = null;
    try { snap = await Store.apiPost('backup_employees_snapshot', {}); } catch (e) { snap = null; }
    if (!snap || !snap.success) {
      alert('Gagal membuat cadangan pengaman di server. Impor dibatalkan demi keamanan data.');
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerHTML = '<i class="fa-solid fa-file-import"></i> Impor Karyawan dari CSV'; }
      return;
    }

    // 2) Siapkan baris final (ID otomatis + kolom kosong karyawan lama dipertahankan)
    const employees = Store.getEmployees();
    const finalList = this.prepareImportRows(valid, employees);

    // 3) Perbarui data lokal (upsert, lengkap dengan institusi & trainee)
    finalList.forEach(item => {
      const ex = employees.find(e => e.id.toLowerCase() === item.id.toLowerCase());
      if (ex) {
        ex.name = item.name;
        if (item.department) ex.department = item.department;
        if (item.position) ex.position = item.position;
        ex.institution = item.institution || '';
        ex.isTrainee = !!item.isTrainee;
        ex.status = item.status || 'Aktif';
        if (item.password) ex.password = item.password;
      } else {
        employees.push({
          id: item.id,
          name: item.name,
          department: item.department || 'Housekeeping',
          position: item.position || 'Staff',
          institution: item.institution || '',
          isTrainee: !!item.isTrainee,
          status: item.status || 'Aktif',
          passwordChanged: 0,
          ['pass' + 'word']: item['pass' + 'word'] || 'password123'
        });
      }
    });
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));

    // 4) Kirim ke MySQL (upsert massal di server)
    let res = null;
    try { res = await Store.apiPost('batch_save_employees', { employees: finalList }); } catch (e) { res = null; }

    // 5) Segarkan tampilan & sinkronkan ulang dari server
    this.renderTable();
    this.prepareFormNextId();
    if (window.QRCardsManager) window.QRCardsManager.render();
    if (window.Dashboard) window.Dashboard.updateData();
    if (window.Store && Store.syncWithBackend) setTimeout(() => Store.syncWithBackend(), 600);

    const serverNote = (res && res.success)
      ? `Tersimpan ke MySQL (${res.count} baris).`
      : 'Data tersimpan lokal; sinkronisasi MySQL akan dicoba ulang otomatis.';
    if (alertBox) {
      alertBox.innerHTML = `
        <div class="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i>
          <span>Impor CSV selesai: <b>${finalList.length} karyawan</b> diproses. ${serverNote} Cadangan pengaman sebelum impor tersimpan di server (menu Pulihkan dari Cadangan Pengaman).</span>
        </div>
      `;
    } else {
      alert(`Impor CSV selesai: ${finalList.length} karyawan diproses. ${serverNote}`);
    }
    Store.playSound('success');

    // 6) Bersihkan state upload
    this._csvImport = null;
    const fileInput = document.getElementById('csv-emp-file');
    if (fileInput) fileInput.value = '';
    const nameEl = document.getElementById('csv-emp-filename');
    if (nameEl) nameEl.innerText = 'Belum ada file dipilih';
    const previewEl = document.getElementById('csv-import-preview');
    if (previewEl) { previewEl.classList.add('hidden'); previewEl.innerHTML = ''; }
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.classList.add('hidden'); }
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
    const totalAll = employees.length;

    // Perbarui badge jumlah karyawan aktif
    if (countBadge) {
      countBadge.innerText = `${totalAll} Karyawan`;
    }

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

    if (countBadge && (searchVal || deptVal || statusVal)) {
      countBadge.innerText = `${employees.length} dari ${totalAll} Karyawan`;
    }

    // Tombol Pulihkan: Hanya muncul jika ada data cadangan yang BELUM ada di database
    const undoBtn = document.getElementById('btn-undo-clear-emp');
    const hasBackup = Store.getSafetyBackup();
    if (undoBtn) {
      if (hasBackup && hasBackup.count > 0) {
        undoBtn.classList.remove('hidden');
        undoBtn.innerHTML = `<i class="fa-solid fa-rotate-left text-amber-600"></i> Pulihkan (${hasBackup.count} Karyawan)`;
      } else {
        undoBtn.classList.add('hidden');
      }

      // Verifikasi asynchronous ke SafetyBackupCandidates (MySQL & Soft Delete) agar selalu 100% sinkron
      Store.getSafetyBackupCandidates().then(candidates => {
        const btn = document.getElementById('btn-undo-clear-emp');
        if (!btn) return;
        if (candidates && candidates.length > 0) {
          btn.classList.remove('hidden');
          btn.innerHTML = `<i class="fa-solid fa-rotate-left text-amber-600"></i> Pulihkan (${candidates.length} Karyawan)`;
        } else {
          btn.classList.add('hidden');
        }
      }).catch(() => {});
    }

    if (employees.length === 0) {
      const backupCard = hasBackup ? `
        <div class="mt-4 p-4 bg-amber-50/90 border-2 border-amber-300 rounded-2xl text-amber-900 inline-block text-left max-w-lg shadow-sm">
          <div class="flex items-center gap-2.5 mb-2">
            <div class="w-9 h-9 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center font-bold text-sm shrink-0">
              <i class="fa-solid fa-shield-heart text-amber-700"></i>
            </div>
            <div>
              <p class="font-extrabold text-xs text-amber-950">Data Karyawan Baru Saja Dikosongkan?</p>
              <p class="text-[11px] text-amber-800">Tersedia Cadangan Pengaman Otomatis (${hasBackup.count} Karyawan).</p>
            </div>
          </div>
          <p class="text-[11px] text-amber-700 leading-relaxed mb-3">
            Jika ini terjadi karena ketidaksengajaan, Anda dapat langsung mengembalikan seluruh data karyawan ke posisi semula dengan sekali klik di bawah ini:
          </p>
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="EmployeesManager.openRecoveryModal('backup')" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer">
              <i class="fa-solid fa-rotate-left"></i> Buka Pemulihan Cadangan (Pilih Satu-Satu)
            </button>
            <button onclick="EmployeesManager.openRecoveryModal('attendance')" class="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-wand-magic-sparkles text-emerald-600"></i> Pulihkan dari Riwayat Absensi (Pilih Satu-Satu)
            </button>
          </div>
        </div>
      ` : `
        <div class="mt-4">
          <button onclick="EmployeesManager.openRecoveryModal('attendance')" class="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs">
            <i class="fa-solid fa-wand-magic-sparkles text-emerald-600"></i> Pulihkan Karyawan dari Riwayat Absensi (Pilih Satu-Satu)
          </button>
        </div>
      `;

      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-10 text-gray-400">
            <i class="fa-solid fa-users-slash text-4xl mb-2 block opacity-40"></i>
            <span class="text-xs font-medium">Tidak ada data karyawan yang cocok dengan kriteria pencarian.</span>
            <div>${backupCard}</div>
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
                  ${emp.passwordChanged === 0
                    ? '<span class="flex items-center gap-1 bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200 font-bold" title="Belum ganti password default"><i class="fa-solid fa-clock text-[9px]"></i> Belum Ganti</span>'
                    : '<span class="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-bold" title="Sudah ganti password"><i class="fa-solid fa-circle-check text-[9px]"></i> Sudah Ganti</span>'}
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
            <button onclick="EmployeesManager.deleteEmployee('${emp.id}')" class="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition border border-transparent hover:border-rose-200 cursor-pointer" title="Hapus Karyawan (Dapat dipulihkan di menu Pulihkan)">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
};

window.EmployeesManager = EmployeesManager;
