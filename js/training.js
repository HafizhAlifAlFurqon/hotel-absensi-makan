/**
 * training.js - Pengelolaan Khusus Siswa / Mahasiswa Magang (Training / OJT)
 * Fitur:
 * 1. Manajemen Data Master Anak Training (Nama, Sekolah/Kampus, Penempatan, Password)
 * 2. Report & Laporan Khusus Training Sendiri (Rekapitulasi Porsi Makan & Total Biaya)
 * 3. Cetak Kartu QR Khusus Siswa Magang / Trainee
 */

const TrainingManager = {
  activeTab: 'report',
  startDate: Store.getTodayDateString(),
  endDate: Store.getTodayDateString(),
  editingId: null,

  init() {
    const sInput = document.getElementById('training-report-start-date');
    const eInput = document.getElementById('training-report-end-date');
    if (sInput && sInput.value) {
      this.startDate = sInput.value;
    } else if (!this.startDate) {
      this.startDate = Store.getTodayDateString();
    }
    if (eInput && eInput.value) {
      this.endDate = eInput.value;
    } else if (!this.endDate) {
      this.endDate = Store.getTodayDateString();
    }
    this.setupDateInputs();
    this.populateCanteenFilter();
    this.renderStats();
    this.renderReport();
    this.renderTraineesTable();
  },

  setupDateInputs() {
    const sInput = document.getElementById('training-report-start-date');
    const eInput = document.getElementById('training-report-end-date');
    if (sInput) {
      if (!sInput.value) sInput.value = this.startDate;
      else this.startDate = sInput.value;
    }
    if (eInput) {
      if (!eInput.value) eInput.value = this.endDate;
      else this.endDate = eInput.value;
    }
  },

  populateCanteenFilter() {
    const select = document.getElementById('training-report-canteen-filter');
    if (!select) return;
    const tenants = Store.getTenants();
    select.innerHTML = '<option value="">Semua Kantin</option>' + tenants.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  },

  switchTab(tab) {
    this.activeTab = tab;
    const viewReport = document.getElementById('training-view-report');
    const viewData = document.getElementById('training-view-data');
    const btnReport = document.getElementById('training-tab-btn-report');
    const btnData = document.getElementById('training-tab-btn-data');

    if (tab === 'report') {
      if (viewReport) viewReport.classList.remove('hidden');
      if (viewData) viewData.classList.add('hidden');
      if (btnReport) {
        btnReport.className = 'px-4 py-2 text-xs font-bold rounded-xl transition bg-amber-600 text-white shadow-xs';
      }
      if (btnData) {
        btnData.className = 'px-4 py-2 text-xs font-bold rounded-xl transition bg-white text-slate-700 hover:bg-slate-100 border border-slate-200';
      }
      this.renderReport();
    } else {
      if (viewReport) viewReport.classList.add('hidden');
      if (viewData) viewData.classList.remove('hidden');
      if (btnReport) {
        btnReport.className = 'px-4 py-2 text-xs font-bold rounded-xl transition bg-white text-slate-700 hover:bg-slate-100 border border-slate-200';
      }
      if (btnData) {
        btnData.className = 'px-4 py-2 text-xs font-bold rounded-xl transition bg-amber-600 text-white shadow-xs';
      }
      this.renderTraineesTable();
    }
  },

  setPreset(preset) {
    const today = new Date();
    const todayStr = Store.getTodayDateString();

    if (preset === 'today') {
      this.startDate = todayStr;
      this.endDate = todayStr;
    } else if (preset === 'month') {
      const y = today.getFullYear();
      const m = today.getMonth();
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      this.startDate = first.toISOString().split('T')[0];
      this.endDate = last.toISOString().split('T')[0];
    }

    const sInput = document.getElementById('training-report-start-date');
    const eInput = document.getElementById('training-report-end-date');
    if (sInput) sInput.value = this.startDate;
    if (eInput) eInput.value = this.endDate;

    this.renderReport();
  },

  getTrainees() {
    const emps = Store.getEmployees();
    return emps.filter(e => e.department === 'Training' || e.isTrainee === true || (e.id && e.id.toUpperCase().startsWith('TRN-')));
  },

  renderStats() {
    const trainees = this.getTrainees();
    const todayStr = Store.getTodayDateString();
    const allRecords = Store.getAttendances();

    const traineeIds = trainees.map(t => t.id.toLowerCase());
    const todayTraineeRecords = allRecords.filter(r => r.date === todayStr && (r.department === 'Training' || traineeIds.includes((r.employeeId || '').toLowerCase())));

    const totalCost = todayTraineeRecords.reduce((sum, r) => sum + (Number(r.cost) || Store.getSettings().mealPrice || 15000), 0);

    const statTotal = document.getElementById('training-stat-total');
    const statToday = document.getElementById('training-stat-today-eaten');
    const statCost = document.getElementById('training-stat-total-cost');

    if (statTotal) statTotal.innerText = `${trainees.length} Siswa`;
    if (statToday) statToday.innerText = `${todayTraineeRecords.length} Porsi`;
    if (statCost) statCost.innerText = `Rp ${totalCost.toLocaleString('id-ID')}`;
  },

  renderReport() {
    const sInput = document.getElementById('training-report-start-date');
    const eInput = document.getElementById('training-report-end-date');
    const canteenSelect = document.getElementById('training-report-canteen-filter');

    if (sInput && sInput.value) this.startDate = sInput.value;
    if (eInput && eInput.value) this.endDate = eInput.value;
    const canteenFilter = canteenSelect ? canteenSelect.value : '';

    const activeTrainees = this.getTrainees();
    const mapTrainees = new Map();
    activeTrainees.forEach(t => mapTrainees.set(t.id.toLowerCase(), { ...t }));

    const s = Store.getSettings();

    let records = Store.getAttendances(this.startDate, this.endDate);
    records = records.filter(r => (
      r.department === 'Training' ||
      (r.employeeId && r.employeeId.toUpperCase().startsWith('TRN-')) ||
      r.isTrainee ||
      mapTrainees.has((r.employeeId || '').toLowerCase())
    ));

    if (canteenFilter) {
      records = records.filter(r => (r.tenantKey === canteenFilter || r.tenantId === canteenFilter));
    }

    // Jika ada siswa training pada riwayat absensi yang sudah dihapus dari master data, tetap sertakan di rekapitulasi laporan
    records.forEach(r => {
      const idKey = (r.employeeId || '').toLowerCase();
      if (idKey && !mapTrainees.has(idKey)) {
        mapTrainees.set(idKey, {
          id: r.employeeId,
          name: r.employeeName || r.employeeId,
          institution: r.institution || '-',
          position: r.position || 'Trainee',
          department: 'Training',
          status: 'Dihapus'
        });
      }
    });

    const trainees = Array.from(mapTrainees.values());

    // 1. Rekapitulasi per Trainee
    const rekapTbody = document.getElementById('training-rekap-table-body');
    const rekapTfoot = document.getElementById('training-rekap-table-footer');
    const rekapBadge = document.getElementById('training-rekap-count-badge');

    if (rekapBadge) rekapBadge.innerText = `${trainees.length} Siswa`;

    if (rekapTbody) {
      if (trainees.length === 0) {
        rekapTbody.innerHTML = `
          <tr>
            <td colspan="7" class="py-8 text-center text-slate-400 text-xs">
              <i class="fa-solid fa-user-graduate text-3xl mb-2 text-slate-300 block"></i>
              Belum ada data siswa training / magang. Klik tombol "Tambah Anak Training" untuk mendaftarkan.
            </td>
          </tr>
        `;
        if (rekapTfoot) rekapTfoot.innerHTML = '';
      } else {
        let grandTotalMakan = 0;
        let grandTotalBiaya = 0;

        rekapTbody.innerHTML = trainees.map((trn, idx) => {
          const trnRecords = records.filter(r => (r.employeeId && r.employeeId.toLowerCase() === trn.id.toLowerCase()) || r.employeeName === trn.name);
          const count = trnRecords.length;
          const cost = trnRecords.reduce((sum, r) => sum + (Number(r.cost) || s.mealPrice), 0);

          grandTotalMakan += count;
          grandTotalBiaya += cost;

          return `
            <tr class="hover:bg-slate-50 border-b border-slate-100 transition avoid-break">
              <td class="py-3 px-4 text-xs text-slate-400 font-mono">${idx + 1}</td>
              <td class="py-3 px-4 text-xs font-mono font-bold text-amber-900">${trn.id}</td>
              <td class="py-3 px-4 text-xs font-bold text-slate-800">${trn.name}</td>
              <td class="py-3 px-4 text-xs text-slate-600 font-medium">${trn.institution || '-'}</td>
              <td class="py-3 px-4 text-xs text-slate-600">${trn.position || 'Trainee'}</td>
              <td class="py-3 px-4 text-xs font-extrabold text-center text-emerald-800">${count} Porsi</td>
              <td class="py-3 px-4 text-xs font-bold text-right font-mono text-amber-900">Rp ${cost.toLocaleString('id-ID')}</td>
            </tr>
          `;
        }).join('');

        if (rekapTfoot) {
          rekapTfoot.innerHTML = `
            <tr class="bg-amber-50/80 font-bold border-t-2 border-amber-500 avoid-break">
              <td colspan="5" class="py-3 px-4 text-xs uppercase tracking-wider text-amber-950 font-extrabold">TOTAL KESELURUHAN TRAINING</td>
              <td class="py-3 px-4 text-xs text-center text-amber-950 font-extrabold text-sm">${grandTotalMakan} Porsi</td>
              <td class="py-3 px-4 text-xs text-right font-mono text-amber-950 font-extrabold text-sm">Rp ${grandTotalBiaya.toLocaleString('id-ID')}</td>
            </tr>
          `;
        }
      }
    }

    // 2. Detail Log Absensi Training
    const detailTbody = document.getElementById('training-detail-table-body');
    const detailBadge = document.getElementById('training-detail-count-badge');

    if (detailBadge) detailBadge.innerText = `${records.length} Transaksi`;

    if (detailTbody) {
      if (records.length === 0) {
        detailTbody.innerHTML = `
          <tr>
            <td colspan="8" class="py-8 text-center text-slate-400 text-xs">
              <i class="fa-solid fa-receipt text-3xl mb-2 text-slate-300 block"></i>
              Tidak ada data absensi makan anak training pada periode ini.
            </td>
          </tr>
        `;
      } else {
        detailTbody.innerHTML = records.map((r, idx) => {
          const trn = trainees.find(t => t.id.toLowerCase() === (r.employeeId || '').toLowerCase());
          const inst = (trn && trn.institution) || '-';
          return `
            <tr class="hover:bg-slate-50 border-b border-slate-100 transition avoid-break">
              <td class="py-2.5 px-3 text-xs text-slate-400 font-mono">${idx + 1}</td>
              <td class="py-2.5 px-3 text-xs font-mono font-bold text-slate-800">${r.date} ${r.time}</td>
              <td class="py-2.5 px-3 text-xs font-mono font-bold text-amber-900">${r.employeeId}</td>
              <td class="py-2.5 px-3 text-xs font-bold text-slate-800">${r.employeeName}</td>
              <td class="py-2.5 px-3 text-xs text-slate-600">${inst}</td>
              <td class="py-2.5 px-3 text-xs font-semibold text-emerald-800">${r.tenantName}</td>
              <td class="py-2.5 px-3 text-xs font-semibold text-indigo-700">${r.shift || '-'}</td>
              <td class="py-2.5 px-3 text-xs font-mono font-bold text-right text-slate-800">Rp ${(Number(r.cost) || s.mealPrice).toLocaleString('id-ID')}</td>
            </tr>
          `;
        }).join('');
      }
    }
  },

  renderTraineesTable() {
    const tbody = document.getElementById('training-trainees-table-body');
    if (!tbody) return;

    let trainees = this.getTrainees();
    const searchVal = (document.getElementById('training-search-input')?.value || '').toLowerCase().trim();

    if (searchVal) {
      trainees = trainees.filter(t =>
        t.name.toLowerCase().includes(searchVal) ||
        t.id.toLowerCase().includes(searchVal) ||
        (t.institution && t.institution.toLowerCase().includes(searchVal)) ||
        (t.position && t.position.toLowerCase().includes(searchVal))
      );
    }

    if (trainees.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="py-8 text-center text-slate-400 text-xs">
            <i class="fa-solid fa-user-graduate text-3xl mb-2 text-slate-300 block"></i>
            Tidak ada data anak training yang sesuai.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = trainees.map((trn, idx) => {
      const isAktif = trn.status === 'Aktif';
      return `
        <tr class="hover:bg-slate-50 border-b border-slate-100 transition">
          <td class="py-3 px-4 text-xs text-slate-400 font-mono">${idx + 1}</td>
          <td class="py-3 px-4 text-xs font-mono font-bold text-amber-900">${trn.id}</td>
          <td class="py-3 px-4 text-xs font-bold text-slate-800">${trn.name}</td>
          <td class="py-3 px-4 text-xs text-slate-600 font-medium">${trn.institution || '-'}</td>
          <td class="py-3 px-4 text-xs text-slate-600">${trn.position || 'Trainee'}</td>
          <td class="py-3 px-4 text-xs font-mono text-slate-500">${trn.password || 'training123'}</td>
          <td class="py-3 px-4 text-xs">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isAktif ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
              ${trn.status}
            </span>
          </td>
          <td class="py-3 px-4 text-xs text-center space-x-1">
            <button onclick="TrainingManager.editTrainee('${trn.id}')" title="Edit" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button onclick="TrainingManager.printSingleQR('${trn.id}')" title="Cetak QR" class="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition cursor-pointer">
              <i class="fa-solid fa-qrcode"></i>
            </button>
            <button onclick="TrainingManager.toggleStatus('${trn.id}')" title="${isAktif ? 'Nonaktifkan' : 'Aktifkan'}" class="p-1.5 ${isAktif ? 'bg-rose-50 hover:bg-rose-100 text-rose-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'} rounded-lg transition cursor-pointer">
              <i class="fa-solid ${isAktif ? 'fa-ban' : 'fa-check'}"></i>
            </button>
            <button onclick="TrainingManager.deleteTrainee('${trn.id}')" title="Hapus" class="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-700 rounded-lg transition cursor-pointer">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  generateNextTraineeId() {
    const trainees = this.getTrainees();
    let maxNum = 0;
    trainees.forEach(t => {
      const match = (t.id || '').match(/TRN-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum + 1;
    return `TRN-${String(nextNum).padStart(3, '0')}`;
  },

  openAddModal(id = null) {
    this.editingId = id;
    const modal = document.getElementById('training-modal-add');
    const title = document.getElementById('training-modal-title');
    const idInput = document.getElementById('trn-form-id');
    const nameInput = document.getElementById('trn-form-name');
    const instInput = document.getElementById('trn-form-institution');
    const posInput = document.getElementById('trn-form-position');
    const passInput = document.getElementById('trn-form-password');

    if (!modal) return;

    if (id) {
      const trn = Store.findEmployee(id);
      if (trn) {
        if (title) title.innerHTML = `<i class="fa-solid fa-user-pen text-amber-600"></i> Edit Siswa Training (Magang)`;
        if (idInput) {
          idInput.value = trn.id;
          idInput.readOnly = true;
        }
        if (nameInput) nameInput.value = trn.name;
        if (instInput) instInput.value = trn.institution || '';
        if (posInput) posInput.value = trn.position || 'Trainee';
        if (passInput) passInput.value = trn.password || 'training123';
      }
    } else {
      if (title) title.innerHTML = `<i class="fa-solid fa-user-graduate text-amber-600"></i> Tambah Siswa Training (Magang)`;
      if (idInput) {
        idInput.value = this.generateNextTraineeId();
        idInput.readOnly = false;
      }
      if (nameInput) nameInput.value = '';
      if (instInput) instInput.value = '';
      if (posInput) posInput.value = 'Housekeeping Trainee';
      if (passInput) passInput.value = 'training123';
    }

    modal.classList.remove('hidden');
  },

  closeAddModal() {
    const modal = document.getElementById('training-modal-add');
    if (modal) modal.classList.add('hidden');
    this.editingId = null;
  },

  handleSaveTrainee() {
    const id = document.getElementById('trn-form-id')?.value.trim();
    const name = document.getElementById('trn-form-name')?.value.trim();
    const institution = document.getElementById('trn-form-institution')?.value.trim();
    const position = document.getElementById('trn-form-position')?.value.trim() || 'Trainee';
    const password = document.getElementById('trn-form-password')?.value.trim() || 'training123';

    if (!id || !name) {
      alert('Mohon isi ID dan Nama Lengkap siswa.');
      return;
    }

    const existing = Store.findEmployee(id);
    const status = (existing && existing.status) || 'Aktif';

    Store.saveEmployee({
      id,
      name,
      department: 'Training',
      position,
      institution,
      isTrainee: true,
      password,
      status
    });

    this.closeAddModal();
    this.renderStats();
    this.renderReport();
    this.renderTraineesTable();

    if (window.EmployeesManager) window.EmployeesManager.renderTable();
    if (window.QRCardsManager) window.QRCardsManager.render();
  },

  editTrainee(id) {
    this.openAddModal(id);
  },

  toggleStatus(id) {
    const trn = Store.findEmployee(id);
    if (!trn) return;
    trn.status = trn.status === 'Aktif' ? 'Non-Aktif' : 'Aktif';
    Store.saveEmployee(trn);
    this.renderTraineesTable();
    this.renderStats();
  },

  deleteTrainee(id) {
    if (confirm(`Yakin ingin menghapus data siswa training dengan ID ${id}?`)) {
      Store.deleteEmployee(id);
      this.renderStats();
      this.renderReport();
      this.renderTraineesTable();
    }
  },

  exportPDF() {
    const element = document.getElementById('training-view-report');
    if (!element) return;
    const filename = `Laporan_Absensi_Training_${this.startDate}_sd_${this.endDate}.pdf`;

    if (window.PDFPreview) {
      PDFPreview.open('training-view-report', filename, 'landscape');
    } else if (window.html2pdf) {
      const opt = {
        margin: 10,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      window.html2pdf().set(opt).from(element).save();
    } else {
      window.print();
    }
  },

  printSingleQR(id) {
    const trn = Store.findEmployee(id);
    if (!trn) return;
    this.printQRCardsList([trn]);
  },

  printAllQRCards() {
    const trainees = this.getTrainees();
    if (trainees.length === 0) {
      alert('Belum ada data anak training untuk dicetak.');
      return;
    }
    this.printQRCardsList(trainees);
  },

  printQRCardsList(list) {
    const s = Store.getSettings();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kartu QR Absensi Anak Training - ${s.hotelName}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #fff; }
          .grid { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; }
          .card { width: 250px; border: 2px solid #b45309; border-radius: 16px; padding: 16px; text-align: center; background: #fffbeb; page-break-inside: avoid; }
          .hotel-header { font-size: 10px; font-weight: 800; color: #92400e; text-transform: uppercase; margin-bottom: 4px; }
          .name { font-size: 14px; font-weight: 900; color: #1e293b; text-transform: uppercase; margin: 4px 0 2px 0; }
          .position { font-size: 11px; font-weight: 600; color: #b45309; text-transform: uppercase; margin-bottom: 2px; }
          .inst { font-size: 10px; color: #64748b; margin-bottom: 10px; font-style: italic; }
          .qr-box { background: #fff; padding: 10px; border-radius: 12px; display: inline-block; border: 1px solid #fde68a; }
          .id-text { font-family: monospace; font-size: 12px; font-weight: 800; color: #78350f; margin-top: 8px; }
          .footer-note { font-size: 9px; font-weight: 800; color: #b45309; text-transform: uppercase; margin-top: 6px; letter-spacing: 1px; }
        </style>
      </head>
      <body>
        <div class="grid">
          ${list.map(t => `
            <div class="card">
              <div class="hotel-header">${s.hotelName}</div>
              <div class="name">${t.name}</div>
              <div class="position">${t.position || 'Trainee'}</div>
              <div class="inst">${t.institution || 'Siswa Magang'}</div>
              <div class="qr-box">
                <div id="qr-${t.id}"></div>
              </div>
              <div class="id-text">${t.id}</div>
              <div class="footer-note">KARTU ABSENSI SISWA TRAINING</div>
            </div>
          `).join('')}
        </div>
        <script>
          ${list.map(t => `
            new QRCode(document.getElementById('qr-${t.id}'), {
              text: '${t.id}',
              width: 120,
              height: 120,
              colorDark: '#78350f',
              colorLight: '#ffffff'
            });
          `).join('\n')}
          setTimeout(() => { window.print(); }, 600);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
};

window.TrainingManager = TrainingManager;
