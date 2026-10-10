/**
 * reports.js - Pengelolaan Halaman Laporan & Cetak PDF Presisi A4
 * Fitur:
 * - Pilihan rentang tanggal aman (tidak mereset sendiri)
 * - Filter Lingkup:
 *   1. Global (Semua): Gabungan Karyawan Tetap & Siswa Training
 *   2. Karyawan Saja: Khusus Karyawan Tetap & Kontrak Hotel (Tanpa Siswa Training)
 *   3. Anak Training: Khusus Siswa / Mahasiswa Magang (OJT)
 * - Filter Per Depot Kantin:
 *   - Semua Depot Kantin ('all') atau Depot Tertentu (dinamis dari Store.getTenants())
 * - Tabel Rekapitulasi Per Depot Kantin (Porsi, Total Biaya, Kontribusi %)
 * - Tabel Rekapitulasi Per Departemen / Per Siswa Training
 * - Rincian Data Log Absensi (Dapat diaktifkan / dinonaktifkan)
 * - Format Laporan:
 *   - Ringkasan (Tanpa Rincian)
 *   - Lengkap (Dengan Rincian)
 * - Pratinjau Dokumen PDF Lembar A4 Identik & Ekspor PDF / Cetak Fisik
 */

const ReportsManager = {
  startDate: Store.getTodayDateString(),
  endDate: Store.getTodayDateString(),
  activePreset: 'today',
  scope: 'global', // 'global' | 'employee' | 'training'
  tenantId: 'all', // 'all' atau ID depot/tenant spesifik
  format: 'detailed', // 'detailed' (Dengan Rincian) atau 'summary' (Tanpa Rincian)

  init() {
    const sInput = document.getElementById('report-start-date');
    const eInput = document.getElementById('report-end-date');
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

    this.setupInputs();
    this.populateTenantSelect();
    this.updateScopeUI();
    this.updateTenantUI();
    this.updateFormatUI();
    this.render();
  },

  setupInputs() {
    const sInput = document.getElementById('report-start-date');
    const eInput = document.getElementById('report-end-date');
    if (sInput) {
      if (!sInput.value) sInput.value = this.startDate;
      else this.startDate = sInput.value;
    }
    if (eInput) {
      if (!eInput.value) eInput.value = this.endDate;
      else this.endDate = eInput.value;
    }
  },

  populateTenantSelect() {
    const select = document.getElementById('report-tenant-select');
    if (!select) return;

    const tenants = Store.getTenants();
    const currentVal = this.tenantId || 'all';

    let optionsHtml = '<option value="all">Semua Depot Kantin</option>';
    tenants.forEach(t => {
      optionsHtml += `<option value="${t.id}">${t.name}</option>`;
    });

    select.innerHTML = optionsHtml;
    select.value = currentVal;

    // Jika tenantId lama sudah tidak ada di list dan bukan 'all', fallback ke 'all'
    if (select.value !== currentVal) {
      this.tenantId = 'all';
      select.value = 'all';
    }
  },

  handleTenantChange() {
    const select = document.getElementById('report-tenant-select');
    if (select) {
      this.setTenant(select.value);
    }
  },

  setTenant(newTenantId) {
    this.tenantId = newTenantId || 'all';
    this.updateTenantUI();
    this.render();
    Store.playSound('click');
  },

  setScope(newScope) {
    this.scope = newScope || 'global';
    this.updateScopeUI();
    this.render();
    Store.playSound('click');
  },

  setFormat(newFormat) {
    this.format = newFormat || 'detailed';
    this.updateFormatUI();
    this.render();
    Store.playSound('click');
  },

  updateFormatUI() {
    const btnDetailed = document.getElementById('report-format-detailed');
    const btnSummary = document.getElementById('report-format-summary');
    const formatBadge = document.getElementById('report-format-badge');
    const detailSection = document.getElementById('report-detail-section');

    const isSummary = this.format === 'summary';

    if (btnDetailed) {
      btnDetailed.className = !isSummary
        ? 'px-3 py-1.5 text-xs font-extrabold rounded-lg transition bg-slate-800 text-white shadow-xs flex items-center gap-1.5 cursor-pointer'
        : 'px-3 py-1.5 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900 hover:bg-slate-200 flex items-center gap-1.5 cursor-pointer';
    }
    if (btnSummary) {
      btnSummary.className = isSummary
        ? 'px-3 py-1.5 text-xs font-extrabold rounded-lg transition bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer'
        : 'px-3 py-1.5 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900 hover:bg-slate-200 flex items-center gap-1.5 cursor-pointer';
    }

    if (formatBadge) {
      if (isSummary) {
        formatBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200';
        formatBadge.innerText = 'Ringkasan (Tanpa Rincian)';
      } else {
        formatBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200';
        formatBadge.innerText = 'Lengkap (Dengan Rincian)';
      }
    }

    if (detailSection) {
      if (isSummary) {
        detailSection.classList.add('hidden');
      } else {
        detailSection.classList.remove('hidden');
      }
    }
  },

  updateTenantUI() {
    const select = document.getElementById('report-tenant-select');
    const tenantBadge = document.getElementById('report-tenant-badge');
    const printTag = document.getElementById('pdf-print-tenant-tag');
    const rekapBadge = document.getElementById('report-tenant-rekap-badge');

    if (select && select.value !== this.tenantId) {
      select.value = this.tenantId;
    }

    const isAll = !this.tenantId || this.tenantId === 'all';
    const tenantLabel = isAll ? 'Semua Depot' : Store.getTenantName(this.tenantId);

    if (tenantBadge) {
      tenantBadge.innerText = tenantLabel;
      tenantBadge.className = isAll
        ? 'px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-teal-100 text-teal-800 border border-teal-200'
        : 'px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200';
    }

    if (printTag) {
      printTag.innerText = tenantLabel;
      printTag.className = isAll
        ? 'inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200'
        : 'inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200';
    }

    if (rekapBadge) {
      rekapBadge.innerText = tenantLabel;
      rekapBadge.className = isAll
        ? 'px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 border border-teal-200'
        : 'px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200';
    }
  },

  updateScopeUI() {
    const btnGlobal = document.getElementById('report-scope-global');
    const btnEmployee = document.getElementById('report-scope-employee');
    const btnTraining = document.getElementById('report-scope-training');
    const scopeBadge = document.getElementById('report-scope-badge');
    const printTag = document.getElementById('pdf-print-scope-tag');
    const pdfIconBox = document.getElementById('pdf-icon-box');

    const inactiveBtnClass = 'px-3 py-1.5 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900 hover:bg-slate-200 flex items-center gap-1.5 cursor-pointer';

    if (btnGlobal) btnGlobal.className = inactiveBtnClass;
    if (btnEmployee) btnEmployee.className = inactiveBtnClass;
    if (btnTraining) btnTraining.className = inactiveBtnClass;

    if (this.scope === 'global') {
      if (btnGlobal) {
        btnGlobal.className = 'px-3 py-1.5 text-xs font-extrabold rounded-lg transition bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer';
      }
      if (scopeBadge) {
        scopeBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200';
        scopeBadge.innerText = 'Global (Semua)';
      }
      if (printTag) {
        printTag.className = 'inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200';
        printTag.innerText = 'Laporan Global (Semua)';
      }
      if (pdfIconBox) {
        pdfIconBox.className = 'w-12 h-12 rounded-xl bg-emerald-800 text-white flex items-center justify-center text-xl font-bold';
        pdfIconBox.innerHTML = '<i class="fa-solid fa-hotel"></i>';
      }
    } else if (this.scope === 'employee') {
      if (btnEmployee) {
        btnEmployee.className = 'px-3 py-1.5 text-xs font-extrabold rounded-lg transition bg-blue-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer';
      }
      if (scopeBadge) {
        scopeBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-900 border border-blue-300';
        scopeBadge.innerText = 'Karyawan Saja';
      }
      if (printTag) {
        printTag.className = 'inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300';
        printTag.innerText = 'Khusus Karyawan Saja';
      }
      if (pdfIconBox) {
        pdfIconBox.className = 'w-12 h-12 rounded-xl bg-blue-800 text-white flex items-center justify-center text-xl font-bold';
        pdfIconBox.innerHTML = '<i class="fa-solid fa-user-tie"></i>';
      }
    } else {
      // scope === 'training'
      if (btnTraining) {
        btnTraining.className = 'px-3 py-1.5 text-xs font-extrabold rounded-lg transition bg-amber-600 text-white shadow-xs flex items-center gap-1.5 cursor-pointer';
      }
      if (scopeBadge) {
        scopeBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300';
        scopeBadge.innerText = 'Anak Training';
      }
      if (printTag) {
        printTag.className = 'inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300';
        printTag.innerText = 'Khusus Anak Training';
      }
      if (pdfIconBox) {
        pdfIconBox.className = 'w-12 h-12 rounded-xl bg-amber-700 text-white flex items-center justify-center text-xl font-bold';
        pdfIconBox.innerHTML = '<i class="fa-solid fa-graduation-cap"></i>';
      }
    }
  },

  handleCustomDateChange() {
    const sInput = document.getElementById('report-start-date');
    const eInput = document.getElementById('report-end-date');
    if (sInput && sInput.value) this.startDate = sInput.value;
    if (eInput && eInput.value) this.endDate = eInput.value;
    this.render();
  },

  isTraineeRecord(r) {
    if (!r) return false;
    if (r.department === 'Training') return true;
    if (r.employeeId && r.employeeId.toUpperCase().startsWith('TRN-')) return true;
    if (r.isTrainee === true || r.isTrainee === 1 || r.isTrainee === '1') return true;
    const emp = Store.findEmployee(r.employeeId);
    return !!(emp && (emp.department === 'Training' || emp.isTrainee === true));
  },

  matchesTenant(r, tenantId) {
    if (!tenantId || tenantId === 'all') return true;
    if (!r) return false;

    const targetId = String(tenantId).trim().toLowerCase();
    const targetName = String(Store.getTenantName(tenantId) || '').trim().toLowerCase();

    const rKey = String(r.tenantKey || r.tenantId || '').trim().toLowerCase();
    const rName = String(r.tenantName || '').trim().toLowerCase();

    if (rKey === targetId) return true;
    if (rName && targetName && rName === targetName) return true;
    if (rKey && targetId && (rKey.includes(targetId) || targetId.includes(rKey))) return true;
    if (rName && targetName && (rName.includes(targetName) || targetName.includes(rName))) return true;

    return false;
  },

  getReportFilename() {
    let scopePart = 'Global';
    if (this.scope === 'employee') scopePart = 'Karyawan_Saja';
    else if (this.scope === 'training') scopePart = 'Anak_Training';

    const tenantPart = (!this.tenantId || this.tenantId === 'all')
      ? 'Semua_Depot'
      : Store.getTenantName(this.tenantId).replace(/[^a-zA-Z0-9]/g, '_');

    const formatPart = (this.format === 'summary') ? 'Tanpa_Rincian' : 'Dengan_Rincian';

    return `Laporan_Absensi_Makan_${scopePart}_${tenantPart}_${formatPart}_${this.startDate}_sd_${this.endDate}.pdf`;
  },

  render() {
    const sInput = document.getElementById('report-start-date');
    const eInput = document.getElementById('report-end-date');
    if (sInput && sInput.value) this.startDate = sInput.value;
    if (eInput && eInput.value) this.endDate = eInput.value;

    const s = Store.getSettings();
    const allRecords = Store.getAttendances(this.startDate, this.endDate);

    // 1. Filter sesuai Lingkup Peserta (Scope)
    let scopedRecords = allRecords;
    if (this.scope === 'employee') {
      scopedRecords = allRecords.filter(r => !this.isTraineeRecord(r));
    } else if (this.scope === 'training') {
      scopedRecords = allRecords.filter(r => this.isTraineeRecord(r));
    }

    // 2. Filter sesuai Depot Kantin yang dipilih
    const records = (this.tenantId === 'all' || !this.tenantId)
      ? scopedRecords
      : scopedRecords.filter(r => this.matchesTenant(r, this.tenantId));

    // Update Label Periode & Kop Surat
    const periodLabel = document.getElementById('report-period-label');
    const pdfPeriod = document.getElementById('pdf-report-period');
    const pdfSubtitle = document.getElementById('pdf-report-subtitle');
    const printDateEl = document.getElementById('pdf-print-date');

    const periodText = this.startDate === this.endDate
      ? `Tanggal: ${this.startDate}`
      : `Periode: ${this.startDate} s/d ${this.endDate}`;

    if (periodLabel) periodLabel.innerText = periodText;
    if (pdfPeriod) pdfPeriod.innerText = periodText;
    if (printDateEl) {
      printDateEl.innerText = new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) + ' WIB';
    }

    const isSummary = this.format === 'summary';
    const tenantTitle = (!this.tenantId || this.tenantId === 'all')
      ? 'Semua Depot'
      : Store.getTenantName(this.tenantId);

    let scopeTitle = 'Karyawan & Training (Global)';
    if (this.scope === 'employee') {
      scopeTitle = 'Khusus Karyawan Saja';
    } else if (this.scope === 'training') {
      scopeTitle = 'Khusus Siswa Training (Magang)';
    }

    if (pdfSubtitle) {
      pdfSubtitle.innerText = isSummary
        ? `Laporan Rekapitulasi Konsumsi Makan ${scopeTitle} - ${tenantTitle} (Tanpa Rincian)`
        : `Laporan Konsumsi & Absensi Makan ${scopeTitle} - ${tenantTitle} (Lengkap Dengan Rincian)`;
    }

    const printScopeTag = document.getElementById('pdf-print-scope-tag');
    if (printScopeTag) {
      if (this.scope === 'global') {
        printScopeTag.className = 'inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200';
        printScopeTag.innerText = isSummary ? 'Rekapitulasi Global (Tanpa Rincian)' : 'Laporan Global (Dengan Rincian)';
      } else if (this.scope === 'employee') {
        printScopeTag.className = 'inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300';
        printScopeTag.innerText = isSummary ? 'Rekapitulasi Karyawan Saja' : 'Laporan Karyawan Saja (Rincian)';
      } else {
        printScopeTag.className = 'inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300';
        printScopeTag.innerText = isSummary ? 'Rekapitulasi Anak Training' : 'Laporan Anak Training (Rincian)';
      }
    }

    const printTenantTag = document.getElementById('pdf-print-tenant-tag');
    if (printTenantTag) {
      const isAllTenant = !this.tenantId || this.tenantId === 'all';
      printTenantTag.innerText = isAllTenant ? 'Semua Depot' : tenantTitle;
      printTenantTag.className = isAllTenant
        ? 'inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200'
        : 'inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200';
    }

    const detailSection = document.getElementById('report-detail-section');
    if (detailSection) {
      if (isSummary) {
        detailSection.classList.add('hidden');
      } else {
        detailSection.classList.remove('hidden');
      }
    }

    // 3. Statistik Total Orang Makan & Total Biaya
    const totalEaten = records.length;
    const totalBiaya = records.reduce((sum, r) => sum + (Number(r.cost) || s.mealPrice || 15000), 0);

    const totalEatenEl = document.getElementById('report-total-eaten');
    const totalCostEl = document.getElementById('report-total-cost');
    const eatenLabel = document.getElementById('report-eaten-label');
    const eatenSubtext = document.getElementById('report-eaten-subtext');
    const costLabel = document.getElementById('report-cost-label');
    const costSubtext = document.getElementById('report-cost-subtext');

    const tenantInfoNote = (!this.tenantId || this.tenantId === 'all') ? '' : ` • ${tenantTitle}`;

    if (totalEatenEl) totalEatenEl.innerText = `${totalEaten} ${this.scope === 'training' ? 'Porsi' : 'Orang'}`;
    if (totalCostEl) totalCostEl.innerText = `Rp ${totalBiaya.toLocaleString('id-ID')}`;

    if (this.scope === 'global') {
      const traineeCount = records.filter(r => this.isTraineeRecord(r)).length;
      const empCount = totalEaten - traineeCount;
      if (eatenLabel) eatenLabel.innerText = 'Total Orang yang Makan (Global)';
      if (eatenSubtext) eatenSubtext.innerText = `${empCount} Karyawan Tetap + ${traineeCount} Siswa Training${tenantInfoNote}`;
      if (costLabel) costLabel.innerText = 'Total Biaya Konsumsi Makan';
      if (costSubtext) costSubtext.innerText = `Seluruh Unit Departemen Hotel${tenantInfoNote}`;
    } else if (this.scope === 'employee') {
      if (eatenLabel) eatenLabel.innerText = 'Total Orang Makan (Khusus Karyawan)';
      if (eatenSubtext) eatenSubtext.innerText = `Khusus Karyawan Tetap & Kontrak Hotel (Tanpa Siswa Training)${tenantInfoNote}`;
      if (costLabel) costLabel.innerText = 'Total Biaya Konsumsi Karyawan';
      if (costSubtext) costSubtext.innerText = `Beban Konsumsi Karyawan Hotel${tenantInfoNote}`;
    } else {
      // training
      if (eatenLabel) eatenLabel.innerText = 'Total Porsi Siswa Training (Magang)';
      if (eatenSubtext) eatenSubtext.innerText = `Khusus Siswa / Mahasiswa Magang On-the-Job Training${tenantInfoNote}`;
      if (costLabel) costLabel.innerText = 'Total Biaya Konsumsi Training';
      if (costSubtext) costSubtext.innerText = `Beban Konsumsi Siswa Training${tenantInfoNote}`;
    }

    // 4. Render Tabel Rekapitulasi Per Depot Kantin
    this.renderTenantRekapTable(scopedRecords, s);

    // 5. Render Tabel Rekapitulasi Per Departemen / Per Siswa Training
    this.renderRekapTable(records, s);

    // 6. Render Tabel Rincian Data Absensi
    this.renderDetailTable(records, s);
  },

  // Render Rekapitulasi Konsumsi Per Depot / Kantin
  renderTenantRekapTable(scopedRecords, s) {
    const thead = document.getElementById('report-tenant-table-head');
    const tbody = document.getElementById('report-tenant-table-body');
    const tfoot = document.getElementById('report-tenant-table-footer');
    const badge = document.getElementById('report-tenant-rekap-badge');
    if (!tbody) return;

    const isAll = !this.tenantId || this.tenantId === 'all';
    const tenantLabel = isAll ? 'Semua Depot' : Store.getTenantName(this.tenantId);

    if (badge) {
      badge.innerText = tenantLabel;
      badge.className = isAll
        ? 'px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 border border-teal-200'
        : 'px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200';
    }

    const tenants = Store.getTenants();
    const knownIds = new Set(tenants.map(t => (t.id || '').toLowerCase()));
    const knownNames = new Set(tenants.map(t => (t.name || '').toLowerCase()));

    // Periksa apakah ada catatan absensi dengan nama depot lain yang belum ada di daftar
    const extraTenantNames = new Set();
    scopedRecords.forEach(r => {
      const rName = (r.tenantName || '').trim();
      const rKey = (r.tenantKey || r.tenantId || '').trim();
      if (rName && !knownNames.has(rName.toLowerCase()) && !knownIds.has(rKey.toLowerCase())) {
        extraTenantNames.add(rName);
      }
    });

    const fullTenantList = [
      ...tenants.map(t => ({ id: t.id, name: t.name })),
      ...Array.from(extraTenantNames).map(name => ({ id: name, name: name }))
    ];

    // Filter daftar yang ditampilkan jika pengguna memilih spesifik 1 depot
    const displayList = isAll
      ? fullTenantList
      : fullTenantList.filter(t => this.matchesTenant({ tenantId: t.id, tenantKey: t.id, tenantName: t.name }, this.tenantId));

    const effectiveList = displayList.length > 0 ? displayList : fullTenantList;

    const totalScopedPorsi = scopedRecords.length;
    let grandTotalPorsi = 0;
    let grandTotalBiaya = 0;

    const rowsHtml = effectiveList.map((t, idx) => {
      const tRecords = scopedRecords.filter(r => this.matchesTenant(r, t.id));
      const porsi = tRecords.length;
      const biaya = tRecords.reduce((sum, r) => sum + (Number(r.cost) || s.mealPrice || 15000), 0);
      const percent = totalScopedPorsi > 0 ? ((porsi / totalScopedPorsi) * 100).toFixed(1) : '0.0';

      grandTotalPorsi += porsi;
      grandTotalBiaya += biaya;

      const isSelected = !isAll && this.matchesTenant({ tenantId: t.id, tenantKey: t.id, tenantName: t.name }, this.tenantId);

      return `
        <tr class="hover:bg-slate-50 border-b border-slate-100 transition avoid-break ${isSelected ? 'bg-teal-50/70 font-semibold' : ''}">
          <td class="py-3 px-4 text-xs text-slate-400 font-mono">${idx + 1}</td>
          <td class="py-3 px-4 text-xs font-bold text-slate-800">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-[10px]">
                <i class="fa-solid fa-store"></i>
              </div>
              <span>${t.name}</span>
              ${isSelected ? '<span class="text-[10px] font-extrabold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full border border-teal-200">Filter Aktif</span>' : ''}
            </div>
          </td>
          <td class="py-3 px-4 text-xs font-extrabold text-center text-slate-900">${porsi} Porsi</td>
          <td class="py-3 px-4 text-xs font-bold text-right font-mono text-emerald-700">Rp ${biaya.toLocaleString('id-ID')}</td>
          <td class="py-3 px-4 text-xs font-semibold text-center text-slate-700">
            <span class="inline-flex items-center px-2 py-0.5 rounded-md ${Number(percent) > 0 ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200' : 'bg-slate-100 text-slate-400'} text-[11px]">
              ${percent}%
            </span>
          </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rowsHtml || `
      <tr>
        <td colspan="5" class="text-center py-6 text-slate-400 text-xs">
          Belum ada riwayat konsumsi makan di depot kantin pada periode ini.
        </td>
      </tr>
    `;

    if (tfoot) {
      const scopeLabelFoot = this.scope === 'employee' ? 'KARYAWAN SAJA' : (this.scope === 'training' ? 'ANAK TRAINING' : 'KESELURUHAN');
      tfoot.innerHTML = `
        <tr class="bg-teal-50/90 font-bold border-t-2 border-teal-600 avoid-break">
          <td colspan="2" class="py-3.5 px-4 text-xs uppercase tracking-wider text-teal-950 font-extrabold">TOTAL KONSUMSI ${isAll ? 'SEMUA DEPOT' : tenantLabel.toUpperCase()} (${scopeLabelFoot})</td>
          <td class="py-3.5 px-4 text-xs text-center text-teal-950 font-extrabold text-sm">${grandTotalPorsi} Porsi</td>
          <td class="py-3.5 px-4 text-xs text-right font-mono text-teal-950 font-extrabold text-sm">Rp ${grandTotalBiaya.toLocaleString('id-ID')}</td>
          <td class="py-3.5 px-4 text-xs text-center text-teal-950 font-extrabold">${totalScopedPorsi > 0 ? ((grandTotalPorsi / totalScopedPorsi) * 100).toFixed(0) : 100}%</td>
        </tr>
      `;
    }
  },

  // Render Rekapitulasi Departemen (Global & Karyawan) atau Rekapitulasi Siswa Magang (Training)
  renderRekapTable(records, s) {
    const heading = document.getElementById('report-rekap-heading');
    const thead = document.getElementById('report-dept-table-head');
    const tbody = document.getElementById('report-dept-table-body');
    const tfoot = document.getElementById('report-dept-table-footer');
    if (!tbody) return;

    if (this.scope === 'global') {
      // MODE GLOBAL: Rekap per 10 Departemen (Karyawan + Siswa Training)
      if (heading) {
        heading.innerHTML = '<i class="fa-solid fa-table-list text-emerald-700"></i> Rekapitulasi Konsumsi Per Departemen (Global)';
      }
      if (thead) {
        thead.innerHTML = `
          <tr class="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
            <th class="py-3 px-4 w-12">No</th>
            <th class="py-3 px-4">Departemen</th>
            <th class="py-3 px-4 text-center">Jumlah (Orang)</th>
            <th class="py-3 px-4 text-right">Biaya (Rp)</th>
          </tr>
        `;
      }

      let grandTotalJumlah = 0;
      let grandTotalBiaya = 0;

      const rowsHtml = window.DEPARTMENTS.map((deptName, idx) => {
        const deptRecords = records.filter(r => r.department === deptName);
        const jumlah = deptRecords.length;
        const biaya = deptRecords.reduce((sum, r) => sum + (Number(r.cost) || s.mealPrice || 15000), 0);

        grandTotalJumlah += jumlah;
        grandTotalBiaya += biaya;

        const isTrn = deptName === 'Training';
        return `
          <tr class="hover:bg-slate-50 border-b border-slate-100 transition avoid-break ${isTrn ? 'bg-amber-50/40' : ''}">
            <td class="py-3 px-4 text-xs text-slate-400 font-mono">${idx + 1}</td>
            <td class="py-3 px-4 text-xs font-bold text-slate-800">
              ${deptName} ${isTrn ? '<span class="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full ml-1 border border-amber-200"><i class="fa-solid fa-graduation-cap"></i> Training (Magang)</span>' : ''}
            </td>
            <td class="py-3 px-4 text-xs font-semibold text-center text-slate-900">${jumlah} Orang</td>
            <td class="py-3 px-4 text-xs font-semibold text-right font-mono text-emerald-700">Rp ${biaya.toLocaleString('id-ID')}</td>
          </tr>
        `;
      }).join('');

      tbody.innerHTML = rowsHtml;

      if (tfoot) {
        tfoot.innerHTML = `
          <tr class="bg-emerald-50/80 font-bold border-t-2 border-emerald-500 avoid-break">
            <td colspan="2" class="py-3.5 px-4 text-xs uppercase tracking-wider text-emerald-950 font-extrabold">TOTAL KESELURUHAN (KARYAWAN & TRAINING)</td>
            <td class="py-3.5 px-4 text-xs text-center text-emerald-950 font-extrabold">${grandTotalJumlah} Orang</td>
            <td class="py-3.5 px-4 text-xs text-right font-mono text-emerald-950 font-extrabold text-sm">Rp ${grandTotalBiaya.toLocaleString('id-ID')}</td>
          </tr>
        `;
      }
    } else if (this.scope === 'employee') {
      // MODE KARYAWAN SAJA: Rekap Konsumsi Khusus Karyawan Tetap & Kontrak Hotel
      if (heading) {
        heading.innerHTML = '<i class="fa-solid fa-user-tie text-blue-700"></i> Rekapitulasi Konsumsi Per Departemen (Khusus Karyawan Saja)';
      }
      if (thead) {
        thead.innerHTML = `
          <tr class="bg-blue-50 text-blue-950 text-xs uppercase tracking-wider font-bold border-b border-blue-200">
            <th class="py-3 px-4 w-12">No</th>
            <th class="py-3 px-4">Departemen Karyawan</th>
            <th class="py-3 px-4 text-center">Jumlah Karyawan</th>
            <th class="py-3 px-4 text-right">Biaya (Rp)</th>
          </tr>
        `;
      }

      let grandTotalJumlah = 0;
      let grandTotalBiaya = 0;

      // Filter departemen hotel
      const deptList = window.DEPARTMENTS.filter(d => d !== 'Training');

      const rowsHtml = deptList.map((deptName, idx) => {
        const deptRecords = records.filter(r => r.department === deptName);
        const jumlah = deptRecords.length;
        const biaya = deptRecords.reduce((sum, r) => sum + (Number(r.cost) || s.mealPrice || 15000), 0);

        grandTotalJumlah += jumlah;
        grandTotalBiaya += biaya;

        return `
          <tr class="hover:bg-blue-50/40 border-b border-slate-100 transition avoid-break">
            <td class="py-3 px-4 text-xs text-slate-400 font-mono">${idx + 1}</td>
            <td class="py-3 px-4 text-xs font-bold text-slate-800">
              <span class="flex items-center gap-2">
                <i class="fa-solid fa-building text-blue-600 text-[10px]"></i>
                ${deptName}
              </span>
            </td>
            <td class="py-3 px-4 text-xs font-semibold text-center text-slate-900">${jumlah} Orang</td>
            <td class="py-3 px-4 text-xs font-semibold text-right font-mono text-emerald-700">Rp ${biaya.toLocaleString('id-ID')}</td>
          </tr>
        `;
      }).join('');

      tbody.innerHTML = rowsHtml;

      if (tfoot) {
        tfoot.innerHTML = `
          <tr class="bg-blue-50 font-bold border-t-2 border-blue-500 avoid-break">
            <td colspan="2" class="py-3.5 px-4 text-xs uppercase tracking-wider text-blue-950 font-extrabold">TOTAL KONSUMSI KARYAWAN HOTEL (NON-TRAINING)</td>
            <td class="py-3.5 px-4 text-xs text-center text-blue-950 font-extrabold">${grandTotalJumlah} Orang</td>
            <td class="py-3.5 px-4 text-xs text-right font-mono text-blue-950 font-extrabold text-sm">Rp ${grandTotalBiaya.toLocaleString('id-ID')}</td>
          </tr>
        `;
      }
    } else {
      // MODE KHUSUS ANAK TRAINING: Rekapitulasi per Siswa Training / Institusi Mitra
      if (heading) {
        heading.innerHTML = '<i class="fa-solid fa-graduation-cap text-amber-600"></i> Rekapitulasi Konsumsi Siswa Training (Magang)';
      }
      if (thead) {
        thead.innerHTML = `
          <tr class="bg-amber-100/70 text-amber-950 text-xs uppercase tracking-wider font-bold border-b border-amber-200">
            <th class="py-3 px-4 w-12">No</th>
            <th class="py-3 px-4">Nama Siswa Magang</th>
            <th class="py-3 px-4">Asal Sekolah / Kampus</th>
            <th class="py-3 px-4">Penempatan / Posisi</th>
            <th class="py-3 px-4 text-center">Jumlah Porsi</th>
            <th class="py-3 px-4 text-right">Total Biaya (Rp)</th>
          </tr>
        `;
      }

      // Group per ID trainee
      const traineeMap = {};
      records.forEach(r => {
        const id = r.employeeId || 'TRN-UNKNOWN';
        if (!traineeMap[id]) {
          const emp = Store.findEmployee(id);
          traineeMap[id] = {
            id: id,
            name: r.employeeName || (emp ? emp.name : id),
            institution: (emp && emp.institution) ? emp.institution : (r.institution || 'SMK / Kampus Mitra'),
            position: (emp && emp.position) ? emp.position : (r.position || 'Trainee'),
            count: 0,
            cost: 0
          };
        }
        traineeMap[id].count++;
        traineeMap[id].cost += (Number(r.cost) || s.mealPrice || 15000);
      });

      const traineeList = Object.values(traineeMap);

      if (traineeList.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-6 text-slate-400 text-xs">
              Belum ada riwayat absensi makan untuk siswa training pada periode ini.
            </td>
          </tr>
        `;
        if (tfoot) tfoot.innerHTML = '';
        return;
      }

      let grandTotalJumlah = 0;
      let grandTotalBiaya = 0;

      const rowsHtml = traineeList.map((t, idx) => {
        grandTotalJumlah += t.count;
        grandTotalBiaya += t.cost;
        return `
          <tr class="hover:bg-amber-50/50 border-b border-slate-100 transition avoid-break">
            <td class="py-3 px-4 text-xs text-slate-400 font-mono">${idx + 1}</td>
            <td class="py-3 px-4 text-xs font-bold text-slate-900">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">
                  <i class="fa-solid fa-graduation-cap"></i>
                </div>
                <div>
                  <span class="block">${t.name}</span>
                  <span class="text-[10px] text-slate-400 font-mono">${t.id}</span>
                </div>
              </div>
            </td>
            <td class="py-3 px-4 text-xs font-medium text-slate-700">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px]">
                <i class="fa-solid fa-school text-slate-400 mr-1.5 text-[10px]"></i> ${t.institution}
              </span>
            </td>
            <td class="py-3 px-4 text-xs text-slate-600 font-medium">${t.position}</td>
            <td class="py-3 px-4 text-xs font-extrabold text-center text-slate-900">${t.count} Porsi</td>
            <td class="py-3 px-4 text-xs font-bold text-right font-mono text-emerald-700">Rp ${t.cost.toLocaleString('id-ID')}</td>
          </tr>
        `;
      }).join('');

      tbody.innerHTML = rowsHtml;

      if (tfoot) {
        tfoot.innerHTML = `
          <tr class="bg-amber-50 font-bold border-t-2 border-amber-500 avoid-break">
            <td colspan="4" class="py-3.5 px-4 text-xs uppercase tracking-wider text-amber-950 font-extrabold">TOTAL KONSUMSI ANAK TRAINING (MAGANG)</td>
            <td class="py-3.5 px-4 text-xs text-center text-amber-950 font-extrabold">${grandTotalJumlah} Porsi</td>
            <td class="py-3.5 px-4 text-xs text-right font-mono text-amber-950 font-extrabold text-sm">Rp ${grandTotalBiaya.toLocaleString('id-ID')}</td>
          </tr>
        `;
      }
    }
  },

  // Render Rincian Data Absensi
  renderDetailTable(records, s) {
    const heading = document.getElementById('report-detail-heading');
    const thead = document.getElementById('report-detail-table-head');
    const tbody = document.getElementById('report-detail-table-body');
    if (!tbody) return;

    if (this.scope === 'global') {
      if (heading) {
        heading.innerHTML = '<i class="fa-solid fa-list-check text-slate-600"></i> Rincian Data Absensi Karyawan & Training (Global)';
      }
      if (thead) {
        thead.innerHTML = `
          <tr class="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200">
            <th class="py-2.5 px-3">No</th>
            <th class="py-2.5 px-3">Waktu</th>
            <th class="py-2.5 px-3">ID</th>
            <th class="py-2.5 px-3">Nama Lengkap</th>
            <th class="py-2.5 px-3">Departemen</th>
            <th class="py-2.5 px-3">Kantin / Depot</th>
            <th class="py-2.5 px-3 text-right">Biaya</th>
          </tr>
        `;
      }
    } else if (this.scope === 'employee') {
      if (heading) {
        heading.innerHTML = '<i class="fa-solid fa-user-tie text-blue-700"></i> Rincian Data Absensi Khusus Karyawan Hotel';
      }
      if (thead) {
        thead.innerHTML = `
          <tr class="bg-blue-50 text-blue-900 text-[11px] uppercase tracking-wider font-semibold border-b border-blue-200">
            <th class="py-2.5 px-3">No</th>
            <th class="py-2.5 px-3">Waktu</th>
            <th class="py-2.5 px-3">ID Karyawan</th>
            <th class="py-2.5 px-3">Nama Karyawan</th>
            <th class="py-2.5 px-3">Departemen</th>
            <th class="py-2.5 px-3">Kantin / Depot</th>
            <th class="py-2.5 px-3 text-right">Biaya</th>
          </tr>
        `;
      }
    } else {
      // training
      if (heading) {
        heading.innerHTML = '<i class="fa-solid fa-graduation-cap text-amber-600"></i> Rincian Data Absensi Khusus Siswa Training (Magang)';
      }
      if (thead) {
        thead.innerHTML = `
          <tr class="bg-amber-100/60 text-amber-950 text-[11px] uppercase tracking-wider font-semibold border-b border-amber-200">
            <th class="py-2.5 px-3">No</th>
            <th class="py-2.5 px-3">Waktu</th>
            <th class="py-2.5 px-3">ID Siswa</th>
            <th class="py-2.5 px-3">Nama Siswa Magang</th>
            <th class="py-2.5 px-3">Asal Sekolah / Kampus</th>
            <th class="py-2.5 px-3">Kantin / Depot</th>
            <th class="py-2.5 px-3 text-right">Biaya</th>
          </tr>
        `;
      }
    }

    if (records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-6 text-slate-400 text-xs">
            Tidak ada riwayat data absensi untuk filter dan rentang tanggal ini.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = records.map((r, i) => {
      const isTrn = this.isTraineeRecord(r);
      const emp = Store.findEmployee(r.employeeId);
      const institution = (emp && emp.institution) ? emp.institution : (r.institution || '-');
      const biaya = Number(r.cost) || s.mealPrice || 15000;

      if (this.scope === 'global') {
        return `
          <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs avoid-break ${isTrn ? 'bg-amber-50/25' : ''}">
            <td class="py-2.5 px-3 text-slate-400 font-mono">${i + 1}</td>
            <td class="py-2.5 px-3 font-mono font-semibold">${r.date} ${r.time}</td>
            <td class="py-2.5 px-3 font-mono font-bold text-slate-800">${r.employeeId}</td>
            <td class="py-2.5 px-3 font-semibold text-slate-900">${r.employeeName}</td>
            <td class="py-2.5 px-3 text-slate-600">
              ${isTrn ? '<span class="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md text-[10px] border border-amber-200"><i class="fa-solid fa-graduation-cap"></i> Training (Magang)</span>' : r.department}
            </td>
            <td class="py-2.5 px-3 font-semibold text-emerald-800">${r.tenantName}</td>
            <td class="py-2.5 px-3 font-mono font-semibold text-emerald-700 text-right">Rp ${biaya.toLocaleString('id-ID')}</td>
          </tr>
        `;
      } else if (this.scope === 'employee') {
        return `
          <tr class="hover:bg-blue-50/30 border-b border-slate-100 text-xs avoid-break">
            <td class="py-2.5 px-3 text-slate-400 font-mono">${i + 1}</td>
            <td class="py-2.5 px-3 font-mono font-semibold">${r.date} ${r.time}</td>
            <td class="py-2.5 px-3 font-mono font-bold text-blue-900">${r.employeeId}</td>
            <td class="py-2.5 px-3 font-semibold text-slate-900">${r.employeeName}</td>
            <td class="py-2.5 px-3 text-slate-700 font-medium">${r.department}</td>
            <td class="py-2.5 px-3 font-semibold text-emerald-800">${r.tenantName}</td>
            <td class="py-2.5 px-3 font-mono font-semibold text-emerald-700 text-right">Rp ${biaya.toLocaleString('id-ID')}</td>
          </tr>
        `;
      } else {
        // training
        return `
          <tr class="hover:bg-amber-50/40 border-b border-slate-100 text-xs avoid-break">
            <td class="py-2.5 px-3 text-slate-400 font-mono">${i + 1}</td>
            <td class="py-2.5 px-3 font-mono font-semibold">${r.date} ${r.time}</td>
            <td class="py-2.5 px-3 font-mono font-bold text-amber-900">${r.employeeId}</td>
            <td class="py-2.5 px-3 font-bold text-slate-900">${r.employeeName}</td>
            <td class="py-2.5 px-3 text-slate-700 font-medium">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px]">
                <i class="fa-solid fa-school text-slate-400 mr-1 text-[10px]"></i> ${institution}
              </span>
            </td>
            <td class="py-2.5 px-3 font-semibold text-emerald-800">${r.tenantName}</td>
            <td class="py-2.5 px-3 font-mono font-semibold text-emerald-700 text-right">Rp ${biaya.toLocaleString('id-ID')}</td>
          </tr>
        `;
      }
    }).join('');
  },

  // Buka Pratinjau PDF Sebelum Mengunduh Sesuai Permintaan User (Dukungan Format Tanpa/Dengan Rincian)
  openPdfPreview(requestedFormat) {
    if (requestedFormat && (requestedFormat === 'summary' || requestedFormat === 'detailed')) {
      this.format = requestedFormat;
      this.updateFormatUI();
      this.render();
    }

    const s = Store.getSettings();
    const hotelTitleEl = document.getElementById('pdf-hotel-name');
    const periodHeaderEl = document.getElementById('pdf-report-period');
    if (hotelTitleEl) hotelTitleEl.innerText = s.hotelName;
    if (periodHeaderEl) {
      periodHeaderEl.innerText = this.startDate === this.endDate
        ? `Tanggal: ${this.startDate}`
        : `Periode: ${this.startDate} s/d ${this.endDate}`;
    }

    const filename = this.getReportFilename();

    if (window.PDFPreview) {
      PDFPreview.open('printable-report-area', filename, 'portrait', this.format);
    } else {
      this.downloadDirect(this.format);
    }
  },

  switchPreviewFormat(newFormat) {
    this.openPdfPreview(newFormat);
  },

  printAsPDF() {
    this.openPdfPreview(this.format);
  },

  downloadDirect(format = 'detailed') {
    if (format && (format === 'summary' || format === 'detailed')) {
      this.format = format;
      this.updateFormatUI();
      this.render();
    }
    const filename = this.getReportFilename();

    if (window.PDFPreview) {
      PDFPreview.open('printable-report-area', filename, 'portrait', this.format);
      PDFPreview.downloadCurrentPDF();
    }
  }
};

// ================= MODAL PRATINJAU PDF & PRINT ENGINE (A4 IDENTIK) =================
const PDFPreview = {
  currentElementId: null,
  currentFilename: 'Laporan.pdf',
  currentOrientation: 'portrait',
  currentFormat: 'detailed',

  open(elementId, filename, orientation = 'portrait', format = 'detailed') {
    this.currentElementId = elementId;
    this.currentFilename = filename || 'Laporan.pdf';
    this.currentOrientation = orientation || 'portrait';
    this.currentFormat = format || 'detailed';

    const sourceEl = document.getElementById(elementId);
    const paperEl = document.getElementById('pdf-preview-paper');
    const modalEl = document.getElementById('pdf-preview-modal');
    const filenameEl = document.getElementById('pdf-preview-filename');
    const badgeEl = document.getElementById('pdf-preview-badge');
    const formatBadgeEl = document.getElementById('pdf-preview-format-badge');
    const scopeBadgeEl = document.getElementById('pdf-preview-scope-badge');
    const tenantBadgeEl = document.getElementById('pdf-preview-tenant-badge');
    const scrollContainer = document.getElementById('pdf-preview-scroll-container');
    const btnSummary = document.getElementById('modal-fmt-summary-btn');
    const btnDetailed = document.getElementById('modal-fmt-detailed-btn');

    if (!sourceEl || !paperEl || !modalEl) return;

    if (filenameEl) filenameEl.innerText = this.currentFilename;

    const isLandscape = this.currentOrientation === 'landscape';
    if (badgeEl) {
      badgeEl.innerText = isLandscape ? 'A4 Landscape (Siap Cetak)' : 'A4 Portrait (Siap Cetak)';
      badgeEl.className = isLandscape
        ? 'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300'
        : 'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200';
    }

    const isSummary = this.currentFormat === 'summary';
    if (formatBadgeEl) {
      if (isSummary) {
        formatBadgeEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200';
        formatBadgeEl.innerText = 'Tanpa Rincian';
      } else {
        formatBadgeEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200';
        formatBadgeEl.innerText = 'Dengan Rincian';
      }
    }

    // Badge Lingkup & Tenant pada Modal Pratinjau
    if (scopeBadgeEl) {
      if (elementId === 'printable-report-area' && window.ReportsManager) {
        scopeBadgeEl.classList.remove('hidden');
        if (ReportsManager.scope === 'global') {
          scopeBadgeEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200';
          scopeBadgeEl.innerText = 'Global (Semua)';
        } else if (ReportsManager.scope === 'employee') {
          scopeBadgeEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300';
          scopeBadgeEl.innerText = 'Karyawan Saja';
        } else {
          scopeBadgeEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300';
          scopeBadgeEl.innerText = 'Anak Training';
        }
      } else {
        scopeBadgeEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300';
        scopeBadgeEl.innerText = 'Khusus Training';
      }
    }

    if (tenantBadgeEl) {
      if (elementId === 'printable-report-area' && window.ReportsManager) {
        tenantBadgeEl.classList.remove('hidden');
        const isAll = !ReportsManager.tenantId || ReportsManager.tenantId === 'all';
        const tenantLabel = isAll ? 'Semua Depot' : Store.getTenantName(ReportsManager.tenantId);
        tenantBadgeEl.className = isAll
          ? 'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200'
          : 'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200';
        tenantBadgeEl.innerText = tenantLabel;
      } else {
        tenantBadgeEl.classList.add('hidden');
      }
    }

    if (btnSummary && btnDetailed) {
      if (isSummary) {
        btnSummary.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition bg-emerald-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5';
        btnDetailed.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1.5';
      } else {
        btnSummary.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1.5';
        btnDetailed.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition bg-slate-800 text-white shadow-xs cursor-pointer flex items-center gap-1.5';
      }
    }

    // Set dimensi kertas pratinjau agar 100% presisi standar lembar A4 nyata
    if (isLandscape) {
      paperEl.style.maxWidth = '1122px';
      paperEl.style.width = '100%';
      paperEl.style.minHeight = '794px';
    } else {
      paperEl.style.maxWidth = '794px';
      paperEl.style.width = '100%';
      paperEl.style.minHeight = '1123px';
    }

    // Klon konten dokumen ke kertas pratinjau
    const clone = sourceEl.cloneNode(true);
    // Hilangkan tombol/kontrol filter jika ada di dalam clone
    clone.querySelectorAll('.no-print, button, input[type="date"], select').forEach(el => {
      if (el.tagName === 'BUTTON' || el.closest('.no-print')) {
        el.remove();
      }
    });

    // Jika format adalah summary (Tanpa Rincian), buang elemen detail tabel dari clone
    if (isSummary) {
      clone.querySelectorAll('#report-detail-section, .report-detail-container, #training-detail-table-card').forEach(el => {
        el.remove();
      });
    }

    paperEl.innerHTML = clone.innerHTML;

    // Tampilkan jendela modal pratinjau
    modalEl.classList.remove('hidden');

    // Reset posisi scroll ke paling atas agar Kop Surat langsung terlihat seketika
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }

    Store.playSound('click');
  },

  switchReportFormat(newFormat) {
    if (this.currentElementId === 'training-view-report' && window.TrainingManager) {
      window.TrainingManager.exportPDF(newFormat);
    } else if (window.ReportsManager) {
      window.ReportsManager.switchPreviewFormat(newFormat);
    }
  },

  close() {
    const modalEl = document.getElementById('pdf-preview-modal');
    if (modalEl) modalEl.classList.add('hidden');
  },

  downloadCurrentPDF() {
    const paperEl = document.getElementById('pdf-preview-paper');
    if (!paperEl) return;

    const btn = document.getElementById('pdf-modal-download-btn');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Mengunduh...';
      btn.disabled = true;
    }

    const isLandscape = this.currentOrientation === 'landscape';
    const targetWidth = isLandscape ? 1122 : 794;

    // Wadah render terisolasi berskala presisi 1:1 lembar A4 agar pemotongan halaman jsPDF akurat
    const renderContainer = document.createElement('div');
    renderContainer.style.position = 'fixed';
    renderContainer.style.left = '-9999px';
    renderContainer.style.top = '0';
    renderContainer.style.width = `${targetWidth}px`;
    renderContainer.style.background = '#ffffff';
    renderContainer.style.color = '#0f172a';
    renderContainer.style.padding = '32px 36px';
    renderContainer.style.zIndex = '-9999';
    renderContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';

    const contentClone = paperEl.cloneNode(true);
    contentClone.style.width = '100%';
    contentClone.style.maxWidth = '100%';
    contentClone.style.boxShadow = 'none';
    contentClone.style.border = 'none';
    contentClone.style.borderRadius = '0';
    contentClone.style.padding = '0';
    contentClone.style.margin = '0';

    renderContainer.appendChild(contentClone);
    document.body.appendChild(renderContainer);

    if (window.html2pdf) {
      const opt = {
        margin: [10, 10, 10, 10], // Margin standar 10mm (atas, kiri, bawah, kanan)
        filename: this.currentFilename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          scrollY: 0,
          scrollX: 0
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: this.currentOrientation,
          compress: true
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          avoid: ['tr', 'thead', 'tfoot', '.avoid-break', '.report-stat-card', '.kop-surat', '.report-signatures', 'h2', 'h3']
        }
      };

      html2pdf().set(opt).from(renderContainer).save().then(() => {
        if (document.body.contains(renderContainer)) {
          document.body.removeChild(renderContainer);
        }
        if (btn) {
          btn.innerHTML = '<i class="fa-solid fa-circle-check mr-1.5"></i> Berhasil Diunduh!';
          setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
          }, 2000);
        }
        Store.playSound('success');
      }).catch(err => {
        console.error('PDF error', err);
        if (document.body.contains(renderContainer)) {
          document.body.removeChild(renderContainer);
        }
        if (btn) {
          btn.innerHTML = originalText;
          btn.disabled = false;
        }
        this.printDirectly();
      });
    } else {
      if (document.body.contains(renderContainer)) {
        document.body.removeChild(renderContainer);
      }
      this.printDirectly();
      if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }
  },

  printDirectly() {
    const paperEl = document.getElementById('pdf-preview-paper');
    if (!paperEl) {
      window.print();
      return;
    }

    const isLandscape = this.currentOrientation === 'landscape';

    // Buat iframe terisolasi khusus cetak agar hasil cetak fisik bersih tanpa frame modal
    let printFrame = document.getElementById('pdf-isolated-print-frame');
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'pdf-isolated-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);
    }

    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <title>${this.currentFilename || 'Laporan Absensi Makan'}</title>
        <meta charset="UTF-8">
        <script src="https://cdn.tailwindcss.com"><\/script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
        <style>
          @page {
            size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'};
            margin: 10mm;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-container {
            width: 100%;
            background: #ffffff;
            padding: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          tfoot {
            display: table-footer-group;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .avoid-break, .report-stat-card, .kop-surat, .report-signatures {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${paperEl.innerHTML}
        </div>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    }, 450);
  }
};

window.ReportsManager = ReportsManager;
window.PDFPreview = PDFPreview;
