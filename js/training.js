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

    const totalCost = todayTraineeRecords.reduce((sum, r) => sum + (Number(r.price || r.cost) || Store.getTenantPrice(r.tenantId || r.tenantKey) || 15000), 0);

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
          const cost = trnRecords.reduce((sum, r) => sum + (Number(r.price || r.cost) || Store.getTenantPrice(r.tenantId || r.tenantKey)), 0);

          grandTotalMakan += count;
          grandTotalBiaya += cost;

          return `
            <tr class="hover:bg-slate-50 border-b border-slate-100 transition avoid-break">
              <td class="py-1.5 px-3 text-xs text-slate-400 font-mono">${idx + 1}</td>
              <td class="py-1.5 px-3 text-xs font-mono font-bold text-amber-900">${trn.id}</td>
              <td class="py-1.5 px-3 text-xs font-bold text-slate-800">${trn.name}</td>
              <td class="py-1.5 px-3 text-xs text-slate-600 font-medium">${trn.institution || '-'}</td>
              <td class="py-1.5 px-3 text-xs text-slate-600">${trn.position || 'Trainee'}</td>
              <td class="py-1.5 px-3 text-xs font-extrabold text-center text-emerald-800">${count} Porsi</td>
              <td class="py-1.5 px-3 text-xs font-bold text-right font-mono text-amber-900">Rp ${cost.toLocaleString('id-ID')}</td>
            </tr>
          `;
        }).join('');

        if (rekapTfoot) {
          rekapTfoot.innerHTML = `
            <tr class="bg-amber-50/80 font-bold border-t-2 border-amber-500 avoid-break">
              <td colspan="5" class="py-2 px-3 text-xs uppercase tracking-wider text-amber-950 font-extrabold">TOTAL KESELURUHAN TRAINING</td>
              <td class="py-2 px-3 text-xs text-center text-amber-950 font-extrabold text-xs">${grandTotalMakan} Porsi</td>
              <td class="py-2 px-3 text-xs text-right font-mono text-amber-950 font-extrabold text-xs">Rp ${grandTotalBiaya.toLocaleString('id-ID')}</td>
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
            <td colspan="8" class="py-4 text-center text-slate-400 text-xs">
              <i class="fa-solid fa-receipt text-2xl mb-1 text-slate-300 block"></i>
              Tidak ada data absensi makan anak training pada periode ini.
            </td>
          </tr>
        `;
      } else {
        detailTbody.innerHTML = records.map((r, idx) => {
          const trn = trainees.find(t => t.id.toLowerCase() === (r.employeeId || '').toLowerCase());
          const inst = (trn && trn.institution) || '-';
          const rowPrice = Number(r.price || r.cost) || Store.getTenantPrice(r.tenantId || r.tenantKey);
          return `
            <tr class="hover:bg-slate-50 border-b border-slate-100 transition avoid-break">
              <td class="py-1.5 px-2.5 text-[11px] text-slate-400 font-mono">${idx + 1}</td>
              <td class="py-1.5 px-2.5 text-[11px] font-mono font-bold text-slate-800">${r.date} ${r.time}</td>
              <td class="py-1.5 px-2.5 text-[11px] font-mono font-bold text-amber-900">${r.employeeId}</td>
              <td class="py-1.5 px-2.5 text-[11px] font-bold text-slate-800">${r.employeeName}</td>
              <td class="py-1.5 px-2.5 text-[11px] text-slate-600">${inst}</td>
              <td class="py-1.5 px-2.5 text-[11px] font-semibold text-emerald-800">${r.tenantName}</td>
              <td class="py-1.5 px-2.5 text-[11px] font-semibold text-indigo-700">${r.shift || '-'}</td>
              <td class="py-1.5 px-2.5 text-[11px] font-mono font-bold text-right text-slate-800">Rp ${rowPrice.toLocaleString('id-ID')}</td>
            </tr>
          `;
        }).join('');
      }
    }

    // 3. Update Kop Surat dan Pengesahan Laporan Training
    const periodEl = document.getElementById('training-pdf-period');
    if (periodEl) {
      periodEl.innerText = this.startDate === this.endDate
        ? `Tanggal: ${this.startDate}`
        : `Periode: ${this.startDate} s/d ${this.endDate}`;
    }
    const canteenTagEl = document.getElementById('training-pdf-canteen-tag');
    if (canteenTagEl) {
      const cName = canteenFilter ? Store.getTenantName(canteenFilter) : 'Semua Kantin';
      canteenTagEl.innerText = cName;
    }
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const todayDateEl = document.getElementById('training-pdf-today-date');
    if (todayDateEl) todayDateEl.innerText = todayStr;
    const signDateEl = document.getElementById('training-pdf-signature-date');
    if (signDateEl) signDateEl.innerText = todayStr;
    const signCanteenEl = document.getElementById('training-pdf-canteen-sign-label');
    if (signCanteenEl) {
      if (canteenFilter && canteenFilter !== 'all') {
        signCanteenEl.innerText = Store.getTenantName(canteenFilter);
      } else {
        const tenants = Store.getTenants();
        signCanteenEl.innerText = tenants.length > 0 ? tenants.map(t => t.name).join(' & ') : 'Pihak Pengelola Depot';
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
          <td class="py-3 px-4 text-xs font-mono text-slate-500">
            <div class="flex items-center gap-1.5 flex-wrap">
              ${trn.password || 'training123'}
              ${trn.passwordChanged === 0
                ? '<span class="flex items-center gap-1 bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200 font-bold text-[9px]" title="Belum ganti password default"><i class="fa-solid fa-clock text-[8px]"></i> Belum Ganti</span>'
                : '<span class="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-bold text-[9px]" title="Sudah ganti password"><i class="fa-solid fa-circle-check text-[8px]"></i> Sudah Ganti</span>'}
            </div>
          </td>
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
    const attendances = (window.Store && typeof Store.getAttendances === 'function') ? Store.getAttendances() : [];
    let maxNum = 0;
    trainees.forEach(t => {
      const match = (t.id || '').match(/TRN-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    // Pindai juga riwayat absensi agar ID magang lama tidak bentrok jika akun baru dibuat
    attendances.forEach(a => {
      const match = (a.employeeId || '').match(/TRN-(\d+)/i);
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

  exportPDF(format = 'detailed') {
    const element = document.getElementById('training-view-report');
    if (!element) return;
    this.renderReport();
    const isSummary = format === 'summary';
    const formatName = isSummary ? 'Tanpa_Rincian' : 'Dengan_Rincian';
    const filename = `Laporan_Absensi_Training_${formatName}_${this.startDate}_sd_${this.endDate}.pdf`;

    if (window.PDFPreview) {
      PDFPreview.open('training-view-report', filename, 'landscape', format);
    } else if (window.html2pdf) {
      const detailCard = document.getElementById('training-detail-table-card');
      if (detailCard && isSummary) detailCard.style.display = 'none';

      const prevWindowScrollX = window.scrollX || window.pageXOffset || 0;
      const prevWindowScrollY = window.scrollY || window.pageYOffset || 0;
      window.scrollTo(0, 0);

      const opt = {
        margin: [3, 6, 3, 6],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollY: 0,
          scrollX: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape', compress: true },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };
      window.html2pdf().set(opt).from(element).save().then(() => {
        window.scrollTo(prevWindowScrollX, prevWindowScrollY);
        if (detailCard && isSummary) detailCard.style.display = '';
      }).catch(err => {
        console.error('PDF error', err);
        window.scrollTo(prevWindowScrollX, prevWindowScrollY);
        if (detailCard && isSummary) detailCard.style.display = '';
        window.print();
      });
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
  },

  // ================= UPLOAD FILE CSV SISWA TRAINING =================
  _trnCsvImport: null,

  openImportModal() {
    const modal = document.getElementById('training-modal-import');
    if (modal) modal.classList.remove('hidden');
  },

  closeImportModal() {
    const modal = document.getElementById('training-modal-import');
    if (modal) modal.classList.add('hidden');
  },

  downloadCsvTemplateTraining() {
    const lines = [
      'ID,Nama,Penempatan,Institusi,Status,Password',
      'TRN-008,Contoh Siswa Satu,Housekeeping Trainee,SMKN 1 Surabaya,Aktif,',
      'TRN-009,Contoh Siswa Dua,F&B Service Trainee,SMK Negeri 2,Aktif,passcontoh'
    ];
    const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-training.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  },

  handleTrnCsvFileSelect(input) {
    const nameEl = document.getElementById('trn-csv-filename');
    const previewEl = document.getElementById('trn-csv-preview');
    const confirmBtn = document.getElementById('trn-csv-confirm-btn');
    if (!input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    if (nameEl) nameEl.innerText = file.name;

    window.EmployeesManager.readSpreadsheetFile(file, (text) => {
      const parsed = window.EmployeesManager.parseEmployeesCsv(text || '');
      if (parsed.fatal) {
        this._trnCsvImport = null;
        if (previewEl) {
          previewEl.classList.remove('hidden');
          previewEl.innerHTML = `<div class="p-3 bg-red-50 border border-red-300 rounded-xl text-red-800 text-xs font-semibold">${parsed.fatal}</div>`;
        }
        if (confirmBtn) confirmBtn.classList.add('hidden');
        return;
      }
      this._trnCsvImport = parsed;
      this.renderTrnCsvPreview();
    }, (msg) => alert(msg));
  },

  // Paksa konteks training (departemen Training + trainee), password siswa baru = training123,
  // lalu pakai penyiapan bersama EmployeesManager (ID otomatis TRN-xxx + kolom kosong tidak mengubah data lama).
  prepareTrainingRows(validRows, existingEmployees) {
    const PWK = 'pass' + 'word';
    const existingIds = {};
    existingEmployees.forEach(e => { existingIds[(e.id || '').toLowerCase()] = true; });
    const mapped = validRows.map(rw => {
      const d = Object.assign({}, rw.data);
      d.department = 'Training';
      d.isTrainee = true;
      d.traineeEmpty = false;
      const isExisting = d.id && existingIds[d.id.toLowerCase()];
      if (!isExisting && !d[PWK]) d[PWK] = 'training123';
      return { line: rw.line, data: d, error: rw.error };
    });
    return window.EmployeesManager.prepareImportRows(mapped, existingEmployees);
  },

  renderTrnCsvPreview() {
    const previewEl = document.getElementById('trn-csv-preview');
    const confirmBtn = document.getElementById('trn-csv-confirm-btn');
    if (!previewEl || !this._trnCsvImport) return;
    const existing = Store.getEmployees();
    const esc = s => (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let baru = 0, perbarui = 0, salah = 0;
    const bodyRows = this._trnCsvImport.rows.map(rw => {
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
        <td class="py-1.5 pr-2 text-slate-600">${esc(rw.data.institution) || '-'}</td>
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
              <th class="py-1 pr-2 font-bold">ID</th><th class="py-1 pr-2 font-bold">Nama</th><th class="py-1 pr-2 font-bold">Institusi</th><th class="py-1 pr-2 font-bold">Penempatan</th><th class="py-1 font-bold">Status Baris</th>
            </tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>
      </div>
    `;
    if (confirmBtn) {
      confirmBtn.classList.toggle('hidden', validCount === 0);
      confirmBtn.innerHTML = `<i class="fa-solid fa-file-import"></i> Impor ${validCount} Siswa dari CSV`;
    }
  },

  async confirmTrnCsvImport() {
    if (!this._trnCsvImport) return;
    const valid = this._trnCsvImport.rows.filter(rw => !rw.error);
    if (!valid.length) { alert('Tidak ada baris valid untuk diimpor.'); return; }
    const confirmBtn = document.getElementById('trn-csv-confirm-btn');
    const alertBox = document.getElementById('trn-csv-alert');
    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengimpor...'; }

    // 1) Cadangan pengaman dulu — impor dibatalkan bila snapshot gagal
    let snap = null;
    try { snap = await Store.apiPost('backup_employees_snapshot', {}); } catch (e) { snap = null; }
    if (!snap || !snap.success) {
      alert('Gagal membuat cadangan pengaman di server. Impor dibatalkan demi keamanan data.');
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerHTML = '<i class="fa-solid fa-file-import"></i> Impor Siswa dari CSV'; }
      return;
    }

    // 2) Siapkan baris final (konteks training + ID otomatis + kolom kosong dipertahankan)
    const employees = Store.getEmployees();
    const finalList = this.prepareTrainingRows(valid, employees);

    // 3) Perbarui data lokal (upsert)
    finalList.forEach(item => {
      const ex = employees.find(e => e.id.toLowerCase() === item.id.toLowerCase());
      if (ex) {
        ex.name = item.name;
        ex.department = 'Training';
        if (item.position) ex.position = item.position;
        ex.institution = item.institution || '';
        ex.isTrainee = true;
        ex.status = item.status || 'Aktif';
        if (item['pass' + 'word']) ex['pass' + 'word'] = item['pass' + 'word'];
      } else {
        const newEmp = {
          id: item.id,
          name: item.name,
          department: 'Training',
          position: item.position || 'Trainee',
          institution: item.institution || '',
          isTrainee: true,
          status: item.status || 'Aktif',
          passwordChanged: 0
        };
        newEmp['pass' + 'word'] = item['pass' + 'word'] || 'training123';
        employees.push(newEmp);
      }
    });
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));

    // 4) Kirim ke MySQL (upsert massal di server)
    let res = null;
    try { res = await Store.apiPost('batch_save_employees', { employees: finalList }); } catch (e) { res = null; }

    // 5) Segarkan tampilan training + karyawan & sinkronkan ulang
    this.renderStats();
    this.renderReport();
    this.renderTraineesTable();
    if (window.EmployeesManager) window.EmployeesManager.renderTable();
    if (window.QRCardsManager) window.QRCardsManager.render();
    if (window.Store && Store.syncWithBackend) setTimeout(() => Store.syncWithBackend(), 600);

    const serverNote = (res && res.success)
      ? `Tersimpan ke MySQL (${res.count} baris).`
      : 'Data tersimpan lokal; sinkronisasi MySQL akan dicoba ulang otomatis.';
    if (alertBox) {
      alertBox.innerHTML = `
        <div class="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i>
          <span>Impor CSV training selesai: <b>${finalList.length} siswa</b> diproses. ${serverNote} Cadangan pengaman sebelum impor tersimpan di server.</span>
        </div>
      `;
    } else {
      alert(`Impor CSV training selesai: ${finalList.length} siswa diproses. ${serverNote}`);
    }
    Store.playSound('success');

    // 6) Bersihkan state upload
    this._trnCsvImport = null;
    const fileInput = document.getElementById('trn-csv-file');
    if (fileInput) fileInput.value = '';
    const nameEl = document.getElementById('trn-csv-filename');
    if (nameEl) nameEl.innerText = 'Belum ada file dipilih';
    const previewEl = document.getElementById('trn-csv-preview');
    if (previewEl) { previewEl.classList.add('hidden'); previewEl.innerHTML = ''; }
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.classList.add('hidden'); }
  }
};

window.TrainingManager = TrainingManager;
