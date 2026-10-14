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

  getFilteredRecords() {
    const sInput = document.getElementById('report-start-date');
    const eInput = document.getElementById('report-end-date');
    if (sInput && sInput.value) this.startDate = sInput.value;
    if (eInput && eInput.value) this.endDate = eInput.value;

    const allRecords = Store.getAttendances(this.startDate, this.endDate);

    let scopedRecords = allRecords;
    if (this.scope === 'employee') {
      scopedRecords = allRecords.filter(r => !this.isTraineeRecord(r));
    } else if (this.scope === 'training') {
      scopedRecords = allRecords.filter(r => this.isTraineeRecord(r));
    }

    return (this.tenantId === 'all' || !this.tenantId)
      ? scopedRecords
      : scopedRecords.filter(r => this.matchesTenant(r, this.tenantId));
  },

  exportToExcel() {
    const records = this.getFilteredRecords();
    if (!records || records.length === 0) {
      alert('Tidak ada data absensi untuk diekspor pada filter dan periode ini.');
      return;
    }

    const s = Store.getSettings();
    const defaultMealPrice = Number(s.mealPrice) || 15000;
    const hotelName = s.hotelName || 'BeSS Mansion Hotel Surabaya';
    const totalPorsi = records.length;

    const periodText = (this.startDate === this.endDate)
      ? this.startDate
      : `${this.startDate} s/d ${this.endDate}`;

    const scopeLabel = this.scope === 'employee' 
      ? 'Karyawan Saja' 
      : (this.scope === 'training' ? 'Anak Training (Magang)' : 'Global (Semua Karyawan & Training)');
    
    const tenantLabel = (this.tenantId === 'all' || !this.tenantId) 
      ? 'Semua Depot Kantin' 
      : Store.getTenantName(this.tenantId);

    // Format Rupiah Helper
    const fmtRp = (num) => 'Rp ' + new Intl.NumberFormat('id-ID').format(num);

    // 1. Hitung Per Depot Kantin (Masing-masing Tarif Depot)
    const tenants = Store.getTenants();
    const tenantStats = {};
    tenants.forEach(t => {
      const tPrice = Store.getTenantPrice(t.id);
      tenantStats[t.id] = { name: t.name, count: 0, cost: 0, price: tPrice };
    });
    records.forEach(r => {
      const tid = r.tenantId || r.tenantKey || 'tenant1';
      const rPrice = Number(r.price || r.cost) || Store.getTenantPrice(tid);
      if (!tenantStats[tid]) {
        tenantStats[tid] = { name: r.tenantName || tid, count: 0, cost: 0, price: rPrice };
      }
      tenantStats[tid].count++;
      tenantStats[tid].cost += rPrice;
    });

    // 2. Hitung Total Biaya Keseluruhan & Shift Data
    const siangRecords = records.filter(r => r.shift && r.shift.includes('Siang'));
    const soreRecords = records.filter(r => r.shift && r.shift.includes('Sore'));
    const countSiang = siangRecords.length;
    const countSore = soreRecords.length;
    const biayaSiang = siangRecords.reduce((sum, r) => sum + (Number(r.price || r.cost) || Store.getTenantPrice(r.tenantId || r.tenantKey)), 0);
    const biayaSore = soreRecords.reduce((sum, r) => sum + (Number(r.price || r.cost) || Store.getTenantPrice(r.tenantId || r.tenantKey)), 0);
    const totalBiaya = records.reduce((sum, r) => sum + (Number(r.price || r.cost) || Store.getTenantPrice(r.tenantId || r.tenantKey)), 0);

    const pctSiang = totalPorsi > 0 ? ((countSiang / totalPorsi) * 100).toFixed(1) + '%' : '0%';
    const pctSore = totalPorsi > 0 ? ((countSore / totalPorsi) * 100).toFixed(1) + '%' : '0%';

    // 3. Hitung Per Departemen
    const deptStats = {};
    records.forEach(r => {
      const isTrn = this.isTraineeRecord(r);
      const d = isTrn ? 'Training / Magang' : (r.department || 'Lainnya');
      const rPrice = Number(r.price || r.cost) || Store.getTenantPrice(r.tenantId || r.tenantKey);
      if (!deptStats[d]) {
        deptStats[d] = { name: d, count: 0, cost: 0 };
      }
      deptStats[d].count++;
      deptStats[d].cost += rPrice;
    });
    const sortedDepts = Object.values(deptStats).sort((a, b) => b.count - a.count);

    const exportTime = new Date().toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) + ' WIB';

    // Ringkasan Teks Tarif untuk Kop Surat
    const activeTenants = Object.values(tenantStats);
    const uniquePrices = Array.from(new Set(activeTenants.map(t => t.price)));
    const priceHeaderText = uniquePrices.length === 1
      ? fmtRp(uniquePrices[0])
      : activeTenants.map(t => `${t.name}: ${fmtRp(t.price)}`).join(' | ');

    // Definisi Colgroup Standar 7 Kolom (Total Lebar: 920px - Fit Tepat di A4 Portrait 1 Halaman)
    const colgroupHtml = `
      <colgroup>
        <col width="45" style="width: 45px;">
        <col width="135" style="width: 135px;">
        <col width="200" style="width: 200px;">
        <col width="140" style="width: 140px;">
        <col width="115" style="width: 115px;">
        <col width="135" style="width: 135px;">
        <col width="150" style="width: 150px;">
      </colgroup>
    `;

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Rekap Absensi Makan</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                  <x:FitToPage/>
                  <x:Print>
                    <x:FitWidth>1</x:FitWidth>
                    <x:FitHeight>0</x:FitHeight>
                    <x:ValidPrinterInfo/>
                    <x:PaperSizeIndex>9</x:PaperSizeIndex>
                    <x:Scale>100</x:Scale>
                    <x:HorizontalResolution>600</x:HorizontalResolution>
                    <x:VerticalResolution>600</x:VerticalResolution>
                  </x:Print>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Calibri, -apple-system, Arial, sans-serif; font-size: 10pt; color: #000000; margin: 0; padding: 0; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; table-layout: fixed; }
          th { background-color: #047857; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #000000; padding: 7px 8px; font-size: 9.5pt; vertical-align: middle; }
          td { border: 1px solid #000000; padding: 5px 8px; font-size: 9.5pt; vertical-align: middle; mso-number-format: '\\@'; white-space: nowrap; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .bold { font-weight: bold; }
          .title { font-size: 14pt; font-weight: bold; color: #064e3b; text-align: left; border: none; }
          .subtitle { font-size: 10.5pt; font-weight: bold; color: #1e293b; text-align: left; border: none; }
          .meta-row { font-size: 9pt; color: #475569; border: none; }
          .section-header { font-size: 10pt; font-weight: bold; padding: 7px 8px; border: 1px solid #000000; }
          .sec-shift { background-color: #e0f2fe; color: #0369a1; }
          .sec-tenant { background-color: #fef3c7; color: #92400e; }
          .sec-dept { background-color: #f3e8ff; color: #6b21a8; }
          .sec-detail { background-color: #ecfdf5; color: #065f46; }
          .total-row { background-color: #f1f5f9; font-weight: bold; }
          .total-row td { border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000; font-weight: bold; }
          .grand-total { background-color: #dcfce7; font-weight: bold; color: #166534; }
          .grand-total td { border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000; font-weight: bold; }
          .signature-box td { border: none !important; }
        </style>
      </head>
      <body>
        <!-- KOP LAPORAN RESMI HOTEL (7 KOLOM) -->
        <table>
          ${colgroupHtml}
          <tr><td colspan="7" class="title" style="border:none;">${hotelName.toUpperCase()}</td></tr>
          <tr><td colspan="7" class="subtitle" style="border:none;">LAPORAN REKAPITULASI &amp; KONSUMSI ABSENSI MAKAN KARYAWAN</td></tr>
          <tr><td colspan="7" class="meta-row" style="border:none;"><b>Periode:</b> ${periodText} &nbsp;|&nbsp; <b>Lingkup:</b> ${scopeLabel} &nbsp;|&nbsp; <b>Filter Depot:</b> ${tenantLabel}</td></tr>
          <tr><td colspan="7" class="meta-row" style="border:none;"><b>Tarif Makan:</b> ${priceHeaderText} &nbsp;|&nbsp; <b>Waktu Ekspor:</b> ${exportTime}</td></tr>
          <tr><td colspan="7" style="border:none; height: 10px;"></td></tr>
        </table>

        <!-- ======================================================== -->
        <!-- TABEL 1: REKAPITULASI SHIFT MAKAN (7 KOLOM) -->
        <!-- ======================================================== -->
        <table>
          ${colgroupHtml}
          <tr>
            <td colspan="7" class="section-header sec-shift" style="border: 1px solid #000000;">
              1. REKAPITULASI SHIFT MAKAN (MAKAN SIANG &amp; MAKAN SORE)
            </td>
          </tr>
          <tr>
            <th style="border: 1px solid #000000;">No</th>
            <th style="border: 1px solid #000000;">Shift Makan</th>
            <th style="border: 1px solid #000000;">Jam Operasional</th>
            <th style="border: 1px solid #000000;">Jumlah Porsi</th>
            <th style="border: 1px solid #000000;">Tarif / Porsi</th>
            <th style="border: 1px solid #000000;">Subtotal Biaya (Rp)</th>
            <th style="border: 1px solid #000000;">Kontribusi (%)</th>
          </tr>
          <tr>
            <td class="text-center" style="border: 1px solid #000000;">1</td>
            <td class="bold" style="border: 1px solid #000000;">Makan Siang</td>
            <td class="text-center" style="border: 1px solid #000000;">11:00 - 15:00 WIB</td>
            <td class="text-right bold" style="border: 1px solid #000000;">${countSiang} Porsi</td>
            <td class="text-right" style="border: 1px solid #000000;">${uniquePrices.length === 1 ? fmtRp(uniquePrices[0]) : 'Sesuai Depot'}</td>
            <td class="text-right bold" style="border: 1px solid #000000;">${fmtRp(biayaSiang)}</td>
            <td class="text-center bold" style="border: 1px solid #000000;">${pctSiang}</td>
          </tr>
          <tr>
            <td class="text-center" style="border: 1px solid #000000;">2</td>
            <td class="bold" style="border: 1px solid #000000;">Makan Sore</td>
            <td class="text-center" style="border: 1px solid #000000;">15:01 - 19:00 WIB</td>
            <td class="text-right bold" style="border: 1px solid #000000;">${countSore} Porsi</td>
            <td class="text-right" style="border: 1px solid #000000;">${uniquePrices.length === 1 ? fmtRp(uniquePrices[0]) : 'Sesuai Depot'}</td>
            <td class="text-right bold" style="border: 1px solid #000000;">${fmtRp(biayaSore)}</td>
            <td class="text-center bold" style="border: 1px solid #000000;">${pctSore}</td>
          </tr>
          <tr class="total-row">
            <td colspan="3" class="text-right bold" style="border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">TOTAL KESELURUHAN SHIFT</td>
            <td class="text-right bold" style="border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">${totalPorsi} Porsi</td>
            <td class="text-center" style="border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">-</td>
            <td class="text-right bold" style="border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">${fmtRp(totalBiaya)}</td>
            <td class="text-center bold" style="border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">100.0%</td>
          </tr>
        </table>

        <!-- ======================================================== -->
        <!-- TABEL 2: REKAPITULASI PER DEPOT KANTIN (7 KOLOM) -->
        <!-- ======================================================== -->
        <table>
          ${colgroupHtml}
          <tr>
            <td colspan="7" class="section-header sec-tenant" style="border: 1px solid #000000;">
              2. REKAPITULASI PER DEPOT KANTIN (TAGIHAN MASING-MASING KANTIN)
            </td>
          </tr>
          <tr>
            <th style="border: 1px solid #000000;">No</th>
            <th style="border: 1px solid #000000;">Nama Depot / Kantin</th>
            <th style="border: 1px solid #000000;">ID Depot</th>
            <th style="border: 1px solid #000000;">Porsi Terjual</th>
            <th style="border: 1px solid #000000;">Tarif / Porsi</th>
            <th style="border: 1px solid #000000;">Total Tagihan (Rp)</th>
            <th style="border: 1px solid #000000;">Kontribusi (%)</th>
          </tr>
    `;

    let tIdx = 1;
    let tTotalCount = 0;
    let tTotalCost = 0;
    Object.keys(tenantStats).forEach(tid => {
      const t = tenantStats[tid];
      if (this.tenantId !== 'all' && this.tenantId && this.tenantId !== tid) return;
      tTotalCount += t.count;
      tTotalCost += t.cost;
      const pct = totalPorsi > 0 ? ((t.count / totalPorsi) * 100).toFixed(1) + '%' : '0%';
      html += `
        <tr>
          <td class="text-center" style="border: 1px solid #000000;">${tIdx++}</td>
          <td class="bold" style="border: 1px solid #000000;">${t.name}</td>
          <td class="text-center" style="border: 1px solid #000000;">${tid}</td>
          <td class="text-right bold" style="border: 1px solid #000000;">${t.count} Porsi</td>
          <td class="text-right bold" style="border: 1px solid #000000;">${fmtRp(t.price)}</td>
          <td class="text-right bold" style="border: 1px solid #000000;">${fmtRp(t.cost)}</td>
          <td class="text-center bold" style="border: 1px solid #000000;">${pct}</td>
        </tr>
      `;
    });

    html += `
          <tr class="total-row">
            <td colspan="3" class="text-right bold" style="border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">TOTAL TAGIHAN SELURUH DEPOT KANTIN</td>
            <td class="text-right bold" style="border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">${tTotalCount} Porsi</td>
            <td class="text-center" style="border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">-</td>
            <td class="text-right bold" style="border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">${fmtRp(tTotalCost)}</td>
            <td class="text-center bold" style="border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">100.0%</td>
          </tr>
        </table>

        <!-- ======================================================== -->
        <!-- TABEL 3: REKAPITULASI PER DEPARTEMEN (7 KOLOM) -->
        <!-- ======================================================== -->
        <table>
          ${colgroupHtml}
          <tr>
            <td colspan="7" class="section-header sec-dept" style="border: 1px solid #000000;">
              3. REKAPITULASI KONSUMSI PER DEPARTEMEN &amp; UNIT KERJA
            </td>
          </tr>
          <tr>
            <th style="border: 1px solid #000000;">No</th>
            <th colspan="2" style="border: 1px solid #000000;">Nama Departemen / Unit Kerja</th>
            <th style="border: 1px solid #000000;">Jumlah Transaksi</th>
            <th style="border: 1px solid #000000;">Tarif / Porsi</th>
            <th style="border: 1px solid #000000;">Total Biaya Departemen (Rp)</th>
            <th style="border: 1px solid #000000;">Porsi (%)</th>
          </tr>
    `;

    sortedDepts.forEach((d, dIdx) => {
      const pct = totalPorsi > 0 ? ((d.count / totalPorsi) * 100).toFixed(1) + '%' : '0%';
      html += `
        <tr>
          <td class="text-center" style="border: 1px solid #000000;">${dIdx + 1}</td>
          <td colspan="2" class="bold" style="border: 1px solid #000000;">${d.name}</td>
          <td class="text-right bold" style="border: 1px solid #000000;">${d.count} Porsi</td>
          <td class="text-right" style="border: 1px solid #000000;">${uniquePrices.length === 1 ? fmtRp(uniquePrices[0]) : 'Sesuai Depot'}</td>
          <td class="text-right bold" style="border: 1px solid #000000;">${fmtRp(d.cost)}</td>
          <td class="text-center bold" style="border: 1px solid #000000;">${pct}</td>
        </tr>
      `;
    });

    html += `
          <tr class="total-row">
            <td colspan="3" class="text-right bold" style="border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">TOTAL KONSUMSI SELURUH DEPARTEMEN</td>
            <td class="text-right bold" style="border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">${totalPorsi} Porsi</td>
            <td class="text-center" style="border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">-</td>
            <td class="text-right bold" style="border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">${fmtRp(totalBiaya)}</td>
            <td class="text-center bold" style="border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">100.0%</td>
          </tr>
        </table>

        <!-- ======================================================== -->
        <!-- TABEL 4: RINCIAN LENGKAP TRANSAKSI ABSENSI MAKAN (7 KOLOM) -->
        <!-- ======================================================== -->
        <table>
          ${colgroupHtml}
          <tr>
            <td colspan="7" class="section-header sec-detail" style="border: 1px solid #000000;">
              4. RINCIAN LENGKAP TRANSAKSI ABSENSI MAKAN PERORANGAN
            </td>
          </tr>
          <tr>
            <th style="border: 1px solid #000000;">No</th>
            <th style="border: 1px solid #000000;">Tanggal &amp; Waktu</th>
            <th style="border: 1px solid #000000;">ID &amp; Nama Karyawan</th>
            <th style="border: 1px solid #000000;">Departemen &amp; Jabatan</th>
            <th style="border: 1px solid #000000;">Shift Makan</th>
            <th style="border: 1px solid #000000;">Depot Kantin</th>
            <th style="border: 1px solid #000000;">Tarif / Biaya (Rp)</th>
          </tr>
    `;

    records.forEach((r, rIdx) => {
      const isTrn = this.isTraineeRecord(r);
      const dept = r.department || '-';
      const pos = isTrn ? (r.institution || 'Siswa Magang') : (r.position || '-');
      const tenant = r.tenantName || Store.getTenantName(r.tenantId || r.tenantKey) || 'Kantin';
      const shift = r.shift || (r.time && r.time < '15:01:00' ? 'Makan Siang' : 'Makan Sore');
      const pr = Number(r.price || r.cost) || Store.getTenantPrice(r.tenantId || r.tenantKey);
      const timeStr = r.time ? r.time.substring(0, 5) : '';

      html += `
        <tr>
          <td class="text-center" style="border: 1px solid #000000;">${rIdx + 1}</td>
          <td class="text-center" style="border: 1px solid #000000;">${r.date} ${timeStr}</td>
          <td style="border: 1px solid #000000;"><b>${r.employeeName || '-'}</b> (${r.employeeId || '-'})</td>
          <td style="border: 1px solid #000000;">${dept} ${pos && pos !== '-' ? '• ' + pos : ''}</td>
          <td class="text-center" style="border: 1px solid #000000;">${shift}</td>
          <td style="border: 1px solid #000000;">${tenant}</td>
          <td class="text-right bold" style="border: 1px solid #000000;">${fmtRp(pr)}</td>
        </tr>
      `;
    });

    html += `
          <tr class="grand-total">
            <td colspan="6" class="text-right bold" style="font-size: 10.5pt; padding: 8px; border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">GRAND TOTAL KESELURUHAN BIAYA TRANSAKSI</td>
            <td class="text-right bold" style="font-size: 10.5pt; padding: 8px; border: 1px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">${fmtRp(totalBiaya)}</td>
          </tr>
        </table>

        <!-- ======================================================== -->
        <!-- LEMBAR TANDA TANGAN ATASAN (3 PIHAK RESMI HOTEL - 7 KOLOM) -->
        <!-- ======================================================== -->
        <table style="margin-top: 24px; border:none;">
          ${colgroupHtml}
          <tr>
            <td colspan="7" style="border:none; height: 12px;"></td>
          </tr>
          <tr class="signature-box">
            <td colspan="2" style="text-align: center; border:none; vertical-align: top;">
              <b>Dibuat Oleh,</b><br>
              Petugas HRD / Absensi<br>
              ${hotelName}<br><br><br><br><br>
              <u>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</u><br>
              Staff HRD / Personalia
            </td>
            <td colspan="3" style="text-align: center; border:none; vertical-align: top;">
              <b>Diperiksa Oleh,</b><br>
              Finance &amp; Accounting<br>
              ${hotelName}<br><br><br><br><br>
              <u>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</u><br>
              Accounting &amp; Finance Spv
            </td>
            <td colspan="2" style="text-align: center; border:none; vertical-align: top;">
              <b>Disetujui Oleh,</b><br>
              General Manager<br>
              ${hotelName}<br><br><br><br><br>
              <u>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</u><br>
              General Manager Hotel
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = `Laporan_Absensi_Makan_BeSS_Mansion_${this.startDate}_sd_${this.endDate}.xls`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    const totalBiaya = records.reduce((sum, r) => sum + (Number(r.price || r.cost) || Store.getTenantPrice(r.tenantId || r.tenantKey)), 0);

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

    // 4. Render Tabel Rekapitulasi Shift Makan (Siang & Sore)
    this.renderShiftRekapTable(records, s);

    // 5. Render Tabel Rekapitulasi Per Depot Kantin
    this.renderTenantRekapTable(scopedRecords, s);

    // 6. Render Tabel Rekapitulasi Per Departemen / Per Siswa Training
    this.renderRekapTable(records, s);

    // 7. Render Tabel Rincian Data Absensi
    this.renderDetailTable(records, s);
  },

  // 1. Render Rekapitulasi Shift Makan (Makan Siang & Makan Sore)
  renderShiftRekapTable(records, s) {
    const tbody = document.getElementById('report-shift-table-body');
    const tfoot = document.getElementById('report-shift-table-footer');
    if (!tbody) return;

    const totalPorsi = records.length;
    const siangRecords = records.filter(r => r.shift && r.shift.includes('Siang'));
    const soreRecords = records.filter(r => r.shift && r.shift.includes('Sore'));
    const countSiang = siangRecords.length;
    const countSore = soreRecords.length;
    const biayaSiang = siangRecords.reduce((sum, r) => sum + (Number(r.price || r.cost) || Store.getTenantPrice(r.tenantId || r.tenantKey)), 0);
    const biayaSore = soreRecords.reduce((sum, r) => sum + (Number(r.price || r.cost) || Store.getTenantPrice(r.tenantId || r.tenantKey)), 0);
    const totalBiaya = records.reduce((sum, r) => sum + (Number(r.price || r.cost) || Store.getTenantPrice(r.tenantId || r.tenantKey)), 0);

    const tenants = Store.getTenants();
    const uniquePrices = Array.from(new Set(tenants.map(t => t.price || Store.getTenantPrice(t.id))));
    const priceText = uniquePrices.length === 1 ? `Rp ${uniquePrices[0].toLocaleString('id-ID')}` : 'Sesuai Depot';

    const pctSiang = totalPorsi > 0 ? ((countSiang / totalPorsi) * 100).toFixed(1) : '0.0';
    const pctSore = totalPorsi > 0 ? ((countSore / totalPorsi) * 100).toFixed(1) : '0.0';

    tbody.innerHTML = `
      <tr class="hover:bg-slate-50 border-b border-slate-100 transition avoid-break">
        <td class="py-1.5 px-3 text-xs text-slate-400 font-mono">1</td>
        <td class="py-1.5 px-3 text-xs font-bold text-slate-800">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-xs"></span>
            <span>Makan Siang</span>
          </div>
        </td>
        <td class="py-1.5 px-3 text-xs text-slate-600 text-center font-mono">11:00 - 15:00 WIB</td>
        <td class="py-1.5 px-3 text-xs font-extrabold text-center text-slate-900">${countSiang} Porsi</td>
        <td class="py-1.5 px-3 text-xs font-semibold text-right font-mono text-slate-600">${priceText}</td>
        <td class="py-1.5 px-3 text-xs font-bold text-right font-mono text-emerald-700">Rp ${biayaSiang.toLocaleString('id-ID')}</td>
        <td class="py-1.5 px-3 text-xs font-semibold text-center text-slate-700">
          <span class="inline-flex items-center px-1.5 py-0.5 rounded ${Number(pctSiang) > 0 ? 'bg-amber-50 text-amber-800 font-bold border border-amber-200' : 'bg-slate-100 text-slate-400'} text-[10px]">
            ${pctSiang}%
          </span>
        </td>
      </tr>
      <tr class="hover:bg-slate-50 border-b border-slate-100 transition avoid-break">
        <td class="py-1.5 px-3 text-xs text-slate-400 font-mono">2</td>
        <td class="py-1.5 px-3 text-xs font-bold text-slate-800">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block shadow-xs"></span>
            <span>Makan Sore</span>
          </div>
        </td>
        <td class="py-1.5 px-3 text-xs text-slate-600 text-center font-mono">15:01 - 19:00 WIB</td>
        <td class="py-1.5 px-3 text-xs font-extrabold text-center text-slate-900">${countSore} Porsi</td>
        <td class="py-1.5 px-3 text-xs font-semibold text-right font-mono text-slate-600">${priceText}</td>
        <td class="py-1.5 px-3 text-xs font-bold text-right font-mono text-emerald-700">Rp ${biayaSore.toLocaleString('id-ID')}</td>
        <td class="py-1.5 px-3 text-xs font-semibold text-center text-slate-700">
          <span class="inline-flex items-center px-1.5 py-0.5 rounded ${Number(pctSore) > 0 ? 'bg-indigo-50 text-indigo-800 font-bold border border-indigo-200' : 'bg-slate-100 text-slate-400'} text-[10px]">
            ${pctSore}%
          </span>
        </td>
      </tr>
    `;

    if (tfoot) {
      tfoot.innerHTML = `
        <tr class="bg-sky-50/90 font-bold border-t-2 border-sky-600 avoid-break">
          <td colspan="3" class="py-2 px-3 text-xs uppercase tracking-wider text-sky-950 font-extrabold">TOTAL KESELURUHAN SHIFT</td>
          <td class="py-2 px-3 text-xs text-center text-sky-950 font-extrabold text-xs">${totalPorsi} Porsi</td>
          <td class="py-2 px-3 text-xs text-center text-sky-950 font-extrabold">-</td>
          <td class="py-2 px-3 text-xs text-right font-mono text-sky-950 font-extrabold text-xs">Rp ${totalBiaya.toLocaleString('id-ID')}</td>
          <td class="py-2 px-3 text-xs text-center text-sky-950 font-extrabold">100%</td>
        </tr>
      `;
    }
  },

  // 2. Render Rekapitulasi Konsumsi Per Depot / Kantin
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
      ...tenants.map(t => ({ id: t.id, name: t.name, price: t.price || Store.getTenantPrice(t.id) })),
      ...Array.from(extraTenantNames).map(name => ({ id: name, name: name, price: Store.getTenantPrice(name) }))
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
      const tPrice = Store.getTenantPrice(t.id);
      const tRecords = scopedRecords.filter(r => this.matchesTenant(r, t.id));
      const porsi = tRecords.length;
      const biaya = tRecords.reduce((sum, r) => sum + (Number(r.price || r.cost) || tPrice), 0);
      const percent = totalScopedPorsi > 0 ? ((porsi / totalScopedPorsi) * 100).toFixed(1) : '0.0';

      grandTotalPorsi += porsi;
      grandTotalBiaya += biaya;

      const isSelected = !isAll && this.matchesTenant({ tenantId: t.id, tenantKey: t.id, tenantName: t.name }, this.tenantId);

      return `
        <tr class="hover:bg-slate-50 border-b border-slate-100 transition avoid-break ${isSelected ? 'bg-teal-50/70 font-semibold' : ''}">
          <td class="py-1.5 px-3 text-xs text-slate-400 font-mono">${idx + 1}</td>
          <td class="py-1.5 px-3 text-xs font-bold text-slate-800">
            <div class="flex items-center gap-1.5">
              <div class="w-5 h-5 rounded-md bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-[9px]">
                <i class="fa-solid fa-store"></i>
              </div>
              <span>${t.name}</span>
              ${isSelected ? '<span class="text-[9px] font-extrabold text-teal-800 bg-teal-100 px-1.5 py-0.5 rounded-full border border-teal-200">Filter Aktif</span>' : ''}
            </div>
          </td>
          <td class="py-1.5 px-3 text-xs font-extrabold text-center text-slate-900">${porsi} Porsi</td>
          <td class="py-1.5 px-3 text-xs font-semibold text-right font-mono text-slate-700">Rp ${tPrice.toLocaleString('id-ID')}</td>
          <td class="py-1.5 px-3 text-xs font-bold text-right font-mono text-emerald-700">Rp ${biaya.toLocaleString('id-ID')}</td>
          <td class="py-1.5 px-3 text-xs font-semibold text-center text-slate-700">
            <span class="inline-flex items-center px-1.5 py-0.5 rounded ${Number(percent) > 0 ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200' : 'bg-slate-100 text-slate-400'} text-[10px]">
              ${percent}%
            </span>
          </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rowsHtml || `
      <tr>
        <td colspan="6" class="text-center py-4 text-slate-400 text-xs">
          Belum ada riwayat konsumsi makan di depot kantin pada periode ini.
        </td>
      </tr>
    `;

    if (tfoot) {
      const scopeLabelFoot = this.scope === 'employee' ? 'KARYAWAN SAJA' : (this.scope === 'training' ? 'ANAK TRAINING' : 'KESELURUHAN');
      tfoot.innerHTML = `
        <tr class="bg-teal-50/90 font-bold border-t-2 border-teal-600 avoid-break">
          <td colspan="2" class="py-2 px-3 text-xs uppercase tracking-wider text-teal-950 font-extrabold">TOTAL KONSUMSI ${isAll ? 'SEMUA DEPOT' : tenantLabel.toUpperCase()} (${scopeLabelFoot})</td>
          <td class="py-2 px-3 text-xs text-center text-teal-950 font-extrabold text-xs">${grandTotalPorsi} Porsi</td>
          <td class="py-2 px-3 text-xs text-center text-teal-950 font-extrabold text-xs">-</td>
          <td class="py-2 px-3 text-xs text-right font-mono text-teal-950 font-extrabold text-xs">Rp ${grandTotalBiaya.toLocaleString('id-ID')}</td>
          <td class="py-2 px-3 text-xs text-center text-teal-950 font-extrabold">${totalScopedPorsi > 0 ? ((grandTotalPorsi / totalScopedPorsi) * 100).toFixed(0) : 100}%</td>
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
          <tr class="bg-slate-100 text-slate-700 text-[10px] uppercase tracking-wider font-bold border-b border-slate-200">
            <th class="py-1.5 px-3 w-10">No</th>
            <th class="py-1.5 px-3">Departemen</th>
            <th class="py-1.5 px-3 text-center">Jumlah (Orang)</th>
            <th class="py-1.5 px-3 text-right">Biaya (Rp)</th>
          </tr>
        `;
      }

      let grandTotalJumlah = 0;
      let grandTotalBiaya = 0;

      const rowsHtml = window.DEPARTMENTS.map((deptName, idx) => {
        const deptRecords = records.filter(r => r.department === deptName);
        const jumlah = deptRecords.length;
        const biaya = deptRecords.reduce((sum, r) => sum + (Number(r.price || r.cost) || Store.getTenantPrice(r.tenantId || r.tenantKey)), 0);

        grandTotalJumlah += jumlah;
        grandTotalBiaya += biaya;

        const isTrn = deptName === 'Training';
        return `
          <tr class="hover:bg-slate-50 border-b border-slate-100 transition avoid-break ${isTrn ? 'bg-amber-50/40' : ''}">
            <td class="py-1.5 px-3 text-xs text-slate-400 font-mono">${idx + 1}</td>
            <td class="py-1.5 px-3 text-xs font-bold text-slate-800">
              ${deptName} ${isTrn ? '<span class="text-[9px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded-full ml-1 border border-amber-200"><i class="fa-solid fa-graduation-cap"></i> Training (Magang)</span>' : ''}
            </td>
            <td class="py-1.5 px-3 text-xs font-semibold text-center text-slate-900">${jumlah} Orang</td>
            <td class="py-1.5 px-3 text-xs font-semibold text-right font-mono text-emerald-700">Rp ${biaya.toLocaleString('id-ID')}</td>
          </tr>
        `;
      }).join('');

      tbody.innerHTML = rowsHtml;

      if (tfoot) {
        tfoot.innerHTML = `
          <tr class="bg-emerald-50/80 font-bold border-t-2 border-emerald-500 avoid-break">
            <td colspan="2" class="py-2 px-3 text-xs uppercase tracking-wider text-emerald-950 font-extrabold">TOTAL KESELURUHAN (KARYAWAN & TRAINING)</td>
            <td class="py-2 px-3 text-xs text-center text-emerald-950 font-extrabold text-xs">${grandTotalJumlah} Orang</td>
            <td class="py-2 px-3 text-xs text-right font-mono text-emerald-950 font-extrabold text-xs">Rp ${grandTotalBiaya.toLocaleString('id-ID')}</td>
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
          <tr class="bg-blue-50 text-blue-950 text-[10px] uppercase tracking-wider font-bold border-b border-blue-200">
            <th class="py-1.5 px-3 w-10">No</th>
            <th class="py-1.5 px-3">Departemen Karyawan</th>
            <th class="py-1.5 px-3 text-center">Jumlah Karyawan</th>
            <th class="py-1.5 px-3 text-right">Biaya (Rp)</th>
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
        const biaya = deptRecords.reduce((sum, r) => sum + (Number(r.price || r.cost) || Store.getTenantPrice(r.tenantId || r.tenantKey)), 0);

        grandTotalJumlah += jumlah;
        grandTotalBiaya += biaya;

        return `
          <tr class="hover:bg-blue-50/40 border-b border-slate-100 transition avoid-break">
            <td class="py-1.5 px-3 text-xs text-slate-400 font-mono">${idx + 1}</td>
            <td class="py-1.5 px-3 text-xs font-bold text-slate-800">
              <span class="flex items-center gap-1.5">
                <i class="fa-solid fa-building text-blue-600 text-[10px]"></i>
                ${deptName}
              </span>
            </td>
            <td class="py-1.5 px-3 text-xs font-semibold text-center text-slate-900">${jumlah} Orang</td>
            <td class="py-1.5 px-3 text-xs font-semibold text-right font-mono text-emerald-700">Rp ${biaya.toLocaleString('id-ID')}</td>
          </tr>
        `;
      }).join('');

      tbody.innerHTML = rowsHtml;

      if (tfoot) {
        tfoot.innerHTML = `
          <tr class="bg-blue-50 font-bold border-t-2 border-blue-500 avoid-break">
            <td colspan="2" class="py-2 px-3 text-xs uppercase tracking-wider text-blue-950 font-extrabold">TOTAL KONSUMSI KARYAWAN HOTEL (NON-TRAINING)</td>
            <td class="py-2 px-3 text-xs text-center text-blue-950 font-extrabold text-xs">${grandTotalJumlah} Orang</td>
            <td class="py-2 px-3 text-xs text-right font-mono text-blue-950 font-extrabold text-xs">Rp ${grandTotalBiaya.toLocaleString('id-ID')}</td>
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
          <tr class="bg-amber-100/70 text-amber-950 text-[10px] uppercase tracking-wider font-bold border-b border-amber-200">
            <th class="py-1.5 px-3 w-10">No</th>
            <th class="py-1.5 px-3">Nama Siswa Magang</th>
            <th class="py-1.5 px-3">Asal Sekolah / Kampus</th>
            <th class="py-1.5 px-3">Penempatan / Posisi</th>
            <th class="py-1.5 px-3 text-center">Jumlah Porsi</th>
            <th class="py-1.5 px-3 text-right">Total Biaya (Rp)</th>
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
        traineeMap[id].cost += (Number(r.price || r.cost) || Store.getTenantPrice(r.tenantId || r.tenantKey));
      });

      const traineeList = Object.values(traineeMap);

      if (traineeList.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-4 text-slate-400 text-xs">
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
            <td class="py-1.5 px-3 text-xs text-slate-400 font-mono">${idx + 1}</td>
            <td class="py-1.5 px-3 text-xs font-bold text-slate-900">
              <div class="flex items-center gap-1.5">
                <div class="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[9px]">
                  <i class="fa-solid fa-graduation-cap"></i>
                </div>
                <div>
                  <span class="block">${t.name}</span>
                  <span class="text-[9px] text-slate-400 font-mono">${t.id}</span>
                </div>
              </div>
            </td>
            <td class="py-1.5 px-3 text-xs font-medium text-slate-700">
              <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px]">
                <i class="fa-solid fa-school text-slate-400 mr-1 text-[9px]"></i> ${t.institution}
              </span>
            </td>
            <td class="py-1.5 px-3 text-xs text-slate-600 font-medium">${t.position}</td>
            <td class="py-1.5 px-3 text-xs font-extrabold text-center text-slate-900">${t.count} Porsi</td>
            <td class="py-1.5 px-3 text-xs font-bold text-right font-mono text-emerald-700">Rp ${t.cost.toLocaleString('id-ID')}</td>
          </tr>
        `;
      }).join('');

      tbody.innerHTML = rowsHtml;

      if (tfoot) {
        tfoot.innerHTML = `
          <tr class="bg-amber-50 font-bold border-t-2 border-amber-500 avoid-break">
            <td colspan="4" class="py-2 px-3 text-xs uppercase tracking-wider text-amber-950 font-extrabold">TOTAL KONSUMSI ANAK TRAINING (MAGANG)</td>
            <td class="py-2 px-3 text-xs text-center text-amber-950 font-extrabold text-xs">${grandTotalJumlah} Porsi</td>
            <td class="py-2 px-3 text-xs text-right font-mono text-amber-950 font-extrabold text-xs">Rp ${grandTotalBiaya.toLocaleString('id-ID')}</td>
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
          <tr class="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider font-semibold border-b border-slate-200">
            <th class="py-1.5 px-2.5">No</th>
            <th class="py-1.5 px-2.5">Waktu</th>
            <th class="py-1.5 px-2.5">ID</th>
            <th class="py-1.5 px-2.5">Nama Lengkap</th>
            <th class="py-1.5 px-2.5">Departemen</th>
            <th class="py-1.5 px-2.5">Kantin / Depot</th>
            <th class="py-1.5 px-2.5 text-right">Biaya</th>
          </tr>
        `;
      }
    } else if (this.scope === 'employee') {
      if (heading) {
        heading.innerHTML = '<i class="fa-solid fa-user-tie text-blue-700"></i> Rincian Data Absensi Khusus Karyawan Hotel';
      }
      if (thead) {
        thead.innerHTML = `
          <tr class="bg-blue-50 text-blue-900 text-[10px] uppercase tracking-wider font-semibold border-b border-blue-200">
            <th class="py-1.5 px-2.5">No</th>
            <th class="py-1.5 px-2.5">Waktu</th>
            <th class="py-1.5 px-2.5">ID Karyawan</th>
            <th class="py-1.5 px-2.5">Nama Karyawan</th>
            <th class="py-1.5 px-2.5">Departemen</th>
            <th class="py-1.5 px-2.5">Kantin / Depot</th>
            <th class="py-1.5 px-2.5 text-right">Biaya</th>
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
          <tr class="bg-amber-100/60 text-amber-950 text-[10px] uppercase tracking-wider font-semibold border-b border-amber-200">
            <th class="py-1.5 px-2.5">No</th>
            <th class="py-1.5 px-2.5">Waktu</th>
            <th class="py-1.5 px-2.5">ID Siswa</th>
            <th class="py-1.5 px-2.5">Nama Siswa Magang</th>
            <th class="py-1.5 px-2.5">Asal Sekolah / Kampus</th>
            <th class="py-1.5 px-2.5">Kantin / Depot</th>
            <th class="py-1.5 px-2.5 text-right">Biaya</th>
          </tr>
        `;
      }
    }

    if (records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-slate-400 text-xs">
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
      const biaya = Number(r.price || r.cost) || Store.getTenantPrice(r.tenantId || r.tenantKey);

      if (this.scope === 'global') {
        return `
          <tr class="hover:bg-slate-50 border-b border-slate-100 text-[11px] avoid-break ${isTrn ? 'bg-amber-50/25' : ''}">
            <td class="py-1.5 px-2.5 text-slate-400 font-mono">${i + 1}</td>
            <td class="py-1.5 px-2.5 font-mono font-semibold">${r.date} ${r.time}</td>
            <td class="py-1.5 px-2.5 font-mono font-bold text-slate-800">${r.employeeId}</td>
            <td class="py-1.5 px-2.5 font-semibold text-slate-900">${r.employeeName}</td>
            <td class="py-1.5 px-2.5 text-slate-600">
              ${isTrn ? '<span class="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded text-[9px] border border-amber-200"><i class="fa-solid fa-graduation-cap"></i> Training</span>' : r.department}
            </td>
            <td class="py-1.5 px-2.5 font-semibold text-emerald-800">${r.tenantName}</td>
            <td class="py-1.5 px-2.5 font-mono font-semibold text-emerald-700 text-right">Rp ${biaya.toLocaleString('id-ID')}</td>
          </tr>
        `;
      } else if (this.scope === 'employee') {
        return `
          <tr class="hover:bg-blue-50/30 border-b border-slate-100 text-[11px] avoid-break">
            <td class="py-1.5 px-2.5 text-slate-400 font-mono">${i + 1}</td>
            <td class="py-1.5 px-2.5 font-mono font-semibold">${r.date} ${r.time}</td>
            <td class="py-1.5 px-2.5 font-mono font-bold text-blue-900">${r.employeeId}</td>
            <td class="py-1.5 px-2.5 font-semibold text-slate-900">${r.employeeName}</td>
            <td class="py-1.5 px-2.5 text-slate-700 font-medium">${r.department}</td>
            <td class="py-1.5 px-2.5 font-semibold text-emerald-800">${r.tenantName}</td>
            <td class="py-1.5 px-2.5 font-mono font-semibold text-emerald-700 text-right">Rp ${biaya.toLocaleString('id-ID')}</td>
          </tr>
        `;
      } else {
        // training
        return `
          <tr class="hover:bg-amber-50/40 border-b border-slate-100 text-[11px] avoid-break">
            <td class="py-1.5 px-2.5 text-slate-400 font-mono">${i + 1}</td>
            <td class="py-1.5 px-2.5 font-mono font-semibold">${r.date} ${r.time}</td>
            <td class="py-1.5 px-2.5 font-mono font-bold text-amber-900">${r.employeeId}</td>
            <td class="py-1.5 px-2.5 font-bold text-slate-900">${r.employeeName}</td>
            <td class="py-1.5 px-2.5 text-slate-700 font-medium">
              <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px]">
                <i class="fa-solid fa-school text-slate-400 mr-1 text-[9px]"></i> ${institution}
              </span>
            </td>
            <td class="py-1.5 px-2.5 font-semibold text-emerald-800">${r.tenantName}</td>
            <td class="py-1.5 px-2.5 font-mono font-semibold text-emerald-700 text-right">Rp ${biaya.toLocaleString('id-ID')}</td>
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
    paperEl.className = 'bg-white rounded-xs shadow-2xl p-6 border border-slate-300 transition-all text-slate-900 mx-auto my-2 a4-document-paper space-y-3.5';
    paperEl.style.height = 'auto';
    if (isLandscape) {
      paperEl.style.maxWidth = '1040px';
      paperEl.style.width = '100%';
      paperEl.style.minHeight = '740px';
    } else {
      paperEl.style.maxWidth = '720px';
      paperEl.style.width = '100%';
      paperEl.style.minHeight = '1050px';
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

    const scrollContainer = document.getElementById('pdf-preview-scroll-container');
    const prevScroll = scrollContainer ? scrollContainer.scrollTop : 0;
    if (scrollContainer) scrollContainer.scrollTop = 0;

    // Simpan posisi scroll window utama dan reset ke (0, 0)
    // agar canvas rendering html2canvas tidak mengalami pergeseran vertikal ke bawah (offset putih)
    const prevWindowScrollX = window.scrollX || window.pageXOffset || 0;
    const prevWindowScrollY = window.scrollY || window.pageYOffset || 0;
    window.scrollTo(0, 0);

    // Hilangkan efek bayangan, border, min-height, margin, dan padding dari kertas pratinjau
    // agar canvas rendering pas presisi dimulai dari koordinat (0, 0) paling atas
    const prevShadow = paperEl.style.boxShadow;
    const prevBorder = paperEl.style.border;
    const prevMinHeight = paperEl.style.minHeight;
    const prevPadding = paperEl.style.padding;
    const prevMargin = paperEl.style.margin;

    paperEl.style.boxShadow = 'none';
    paperEl.style.border = 'none';
    paperEl.style.minHeight = 'unset';
    paperEl.style.padding = '0';
    paperEl.style.margin = '0 auto';

    const cleanup = () => {
      paperEl.style.boxShadow = prevShadow;
      paperEl.style.border = prevBorder;
      paperEl.style.minHeight = prevMinHeight;
      paperEl.style.padding = prevPadding;
      paperEl.style.margin = prevMargin;
      window.scrollTo(prevWindowScrollX, prevWindowScrollY);
      if (scrollContainer) scrollContainer.scrollTop = prevScroll;
      if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    };

    if (window.html2pdf) {
      const isLandscape = this.currentOrientation === 'landscape';
      const opt = {
        margin: [8, 8, 8, 8], // Margin 8mm standar A4 rapi, simetris, dan proporsional di seluruh sisi
        filename: this.currentFilename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollY: 0,
          scrollX: 0,
          x: 0,
          y: 0
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: this.currentOrientation,
          compress: true
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy']
        }
      };

      html2pdf().set(opt).from(paperEl).save().then(() => {
        cleanup();
        if (btn) {
          btn.innerHTML = '<i class="fa-solid fa-circle-check mr-1.5"></i> Berhasil Diunduh!';
          btn.disabled = true;
          setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
          }, 2000);
        }
        Store.playSound('success');
      }).catch(err => {
        console.error('PDF error', err);
        cleanup();
        this.printDirectly();
      });
    } else {
      cleanup();
      this.printDirectly();
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
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap">
        <script src="https://cdn.tailwindcss.com"></script>
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
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            text-rendering: optimizeLegibility !important;
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
        <div class="print-container space-y-3.5">
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
