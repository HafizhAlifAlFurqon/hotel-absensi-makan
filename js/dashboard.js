/**
 * dashboard.js - Pengelolaan Halaman Dashboard
 * Pilihan tanggal (1 tanggal atau rentang tanggal), statistik porsi & biaya,
 * perbandingan depot, shift, serta riwayat absensi.
 */

const Dashboard = {
  filterMode: 'single', // 'single' atau 'range'
  startDate: Store.getTodayDateString(),
  endDate: Store.getTodayDateString(),
  chartInstance: null,

  init() {
    this.startDate = Store.getTodayDateString();
    this.endDate = Store.getTodayDateString();
    this.render();
  },

  setFilterMode(mode) {
    this.filterMode = mode;
    const singleInput = document.getElementById('dash-single-date');
    const rangeContainer = document.getElementById('dash-range-container');
    const btnSingle = document.getElementById('dash-btn-mode-single');
    const btnRange = document.getElementById('dash-btn-mode-range');

    if (mode === 'single') {
      if (singleInput) singleInput.classList.remove('hidden');
      if (rangeContainer) rangeContainer.classList.add('hidden');
      if (btnSingle) {
        btnSingle.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white shadow-sm';
      }
      if (btnRange) {
        btnRange.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200';
      }
      this.endDate = this.startDate;
    } else {
      if (singleInput) singleInput.classList.add('hidden');
      if (rangeContainer) rangeContainer.classList.remove('hidden');
      if (btnSingle) {
        btnSingle.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200';
      }
      if (btnRange) {
        btnRange.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white shadow-sm';
      }
    }
    this.updateData();
  },

  setPreset(preset) {
    const today = new Date();
    const todayStr = Store.getTodayDateString();

    if (preset === 'today') {
      this.filterMode = 'single';
      this.startDate = todayStr;
      this.endDate = todayStr;
      const elSingle = document.getElementById('dash-single-date');
      if (elSingle) elSingle.value = todayStr;
      this.setFilterMode('single');
    } else if (preset === 'this-week') {
      this.filterMode = 'range';
      const day = today.getDay() || 7; // Senin = 1
      const mon = new Date(today);
      mon.setDate(today.getDate() - day + 1);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);

      this.startDate = mon.toISOString().split('T')[0];
      this.endDate = sun.toISOString().split('T')[0];

      const startEl = document.getElementById('dash-start-date');
      const endEl = document.getElementById('dash-end-date');
      if (startEl) startEl.value = this.startDate;
      if (endEl) endEl.value = this.endDate;
      this.setFilterMode('range');
    }
    this.updateData();
  },

  updateData() {
    const s = Store.getSettings();
    const tenant1Name = s.tenant1Name || 'Depot Bu A';
    const tenant2Name = s.tenant2Name || 'Depot Bu Yuli';

    // Label Tenant Dinamis di Dashboard Card
    const labelT1 = document.getElementById('dash-label-tenant1');
    const labelT2 = document.getElementById('dash-label-tenant2');
    if (labelT1) labelT1.innerText = tenant1Name;
    if (labelT2) labelT2.innerText = tenant2Name;

    // Ambil data absensi sesuai filter
    let records = [];
    if (this.filterMode === 'single') {
      records = Store.getAttendances(this.startDate);
    } else {
      records = Store.getAttendances(this.startDate, this.endDate);
    }

    const employees = Store.getEmployees();
    const activeEmployees = employees.filter(e => e.status === 'Aktif');

    // Perhitungan
    const totalMakan = records.length;
    let totalBelumMakan = 0;

    if (this.filterMode === 'single') {
      // Pada 1 tanggal, hitung karyawan aktif yang belum makan
      const eatenEmpIds = new Set(records.map(r => r.employeeId.toLowerCase()));
      const belumMakanCount = activeEmployees.filter(e => !eatenEmpIds.has(e.id.toLowerCase())).length;
      totalBelumMakan = belumMakanCount;
      const elBelumMakanNote = document.getElementById('dash-not-eaten-note');
      if (elBelumMakanNote) elBelumMakanNote.innerText = `dari ${activeEmployees.length} karyawan aktif`;
    } else {
      // Rentang tanggal: perlihatkan total karyawan aktif yang belum pernah makan sama sekali di rentang ini
      const eatenEmpIds = new Set(records.map(r => r.employeeId.toLowerCase()));
      const neverEatenInRange = activeEmployees.filter(e => !eatenEmpIds.has(e.id.toLowerCase())).length;
      totalBelumMakan = neverEatenInRange;
      const elBelumMakanNote = document.getElementById('dash-not-eaten-note');
      if (elBelumMakanNote) elBelumMakanNote.innerText = `belum makan sama sekali di periode`;
    }

    // Biaya total
    const totalBiaya = records.reduce((sum, r) => sum + (Number(r.cost) || s.mealPrice), 0);

    // Hitung per depot secara dinamis untuk seluruh kantin terdaftar
    const tenants = Store.getTenants();
    const tenantCounts = tenants.map(t => ({
      id: t.id,
      name: t.name,
      count: records.filter(r => r.tenantKey === t.id).length
    }));

    const depot1Count = records.filter(r => r.tenantKey === 'tenant1').length;
    const depot2Count = records.filter(r => r.tenantKey === 'tenant2').length;

    // Render container kartu depot dinamis jika ada
    const dynamicContainer = document.getElementById('dash-dynamic-tenants-cards');
    if (dynamicContainer) {
      dynamicContainer.innerHTML = tenantCounts.map((tc, idx) => {
        const colors = [
          { border: 'border-blue-200', bg: 'bg-blue-100', text: 'text-blue-700', badge: 'text-blue-600', icon: 'fa-store' },
          { border: 'border-purple-200', bg: 'bg-purple-100', text: 'text-purple-700', badge: 'text-purple-600', icon: 'fa-utensils' },
          { border: 'border-emerald-200', bg: 'bg-emerald-100', text: 'text-emerald-700', badge: 'text-emerald-600', icon: 'fa-bowl-food' },
          { border: 'border-amber-200', bg: 'bg-amber-100', text: 'text-amber-700', badge: 'text-amber-600', icon: 'fa-kitchen-set' }
        ];
        const c = colors[idx % colors.length];
        return `
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:${c.border} transition">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500 uppercase tracking-wider truncate max-w-[150px]">${tc.name}</span>
              <div class="w-8 h-8 rounded-lg ${c.bg} ${c.text} flex items-center justify-center text-sm shrink-0">
                <i class="fa-solid ${c.icon}"></i>
              </div>
            </div>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-2xl font-extrabold text-slate-900 font-mono">${tc.count}</span>
              <span class="text-xs font-semibold ${c.badge}">Porsi</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Total konsumsi kantin</p>
          </div>
        `;
      }).join('');
    }

    // Hitung per shift
    const siangCount = records.filter(r => r.shift && r.shift.includes('Siang')).length;
    const soreCount = records.filter(r => r.shift && r.shift.includes('Sore')).length;

    // Update UI Cards
    const elSudahMakan = document.getElementById('dash-total-eaten');
    const elBelumMakan = document.getElementById('dash-total-not-eaten');
    const elBiaya = document.getElementById('dash-total-cost');
    const elDepot1 = document.getElementById('dash-count-depot1');
    const elDepot2 = document.getElementById('dash-count-depot2');
    const elSiang = document.getElementById('dash-count-siang');
    const elSore = document.getElementById('dash-count-sore');

    if (elSudahMakan) elSudahMakan.innerText = totalMakan;
    if (elBelumMakan) elBelumMakan.innerText = totalBelumMakan;
    if (elBiaya) elBiaya.innerText = 'Rp ' + totalBiaya.toLocaleString('id-ID');
    if (elDepot1) elDepot1.innerText = depot1Count;
    if (elDepot2) elDepot2.innerText = depot2Count;
    if (elSiang) elSiang.innerText = siangCount;
    if (elSore) elSore.innerText = soreCount;

    // Update Info Periode Terpilih
    const elPeriodInfo = document.getElementById('dash-selected-period-text');
    if (elPeriodInfo) {
      if (this.filterMode === 'single') {
        elPeriodInfo.innerText = `Data Tanggal: ${this.formatDisplayDate(this.startDate)}`;
      } else {
        elPeriodInfo.innerText = `Periode: ${this.formatDisplayDate(this.startDate)} s/d ${this.formatDisplayDate(this.endDate)}`;
      }
    }

    // Update Tabel Log Terkini
    this.renderRecentTable(records);
    // Update Chart jika tersedia
    this.renderChart(tenantCounts);
  },

  formatDisplayDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  },

  renderRecentTable(records) {
    const tbody = document.getElementById('dash-recent-table-body');
    if (!tbody) return;

    if (records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-8 text-gray-400">
            <i class="fa-solid fa-utensils text-3xl mb-2 block opacity-40"></i>
            Belum ada data absensi makan pada periode tanggal ini
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = records.slice(0, 15).map((r, idx) => {
      const isLunch = r.shift && r.shift.includes('Siang');
      const badgeShift = isLunch
        ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800"><i class="fa-solid fa-sun mr-1 text-[10px]"></i> ${r.shift}</span>`
        : `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"><i class="fa-solid fa-moon mr-1 text-[10px]"></i> ${r.shift}</span>`;

      const badgeDepot = r.tenantKey === 'tenant1'
        ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"><i class="fa-solid fa-store mr-1 text-[10px]"></i> ${r.tenantName}</span>`
        : `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"><i class="fa-solid fa-store mr-1 text-[10px]"></i> ${r.tenantName}</span>`;

      return `
        <tr class="hover:bg-gray-50 border-b border-gray-100 transition">
          <td class="py-2.5 px-3 text-xs text-gray-500">${idx + 1}</td>
          <td class="py-2.5 px-3 text-xs font-mono font-bold text-gray-700">${r.employeeId}</td>
          <td class="py-2.5 px-3 text-xs font-semibold text-gray-900">${r.employeeName}</td>
          <td class="py-2.5 px-3 text-xs text-gray-600">${r.department}</td>
          <td class="py-2.5 px-3 text-xs">${badgeDepot}</td>
          <td class="py-2.5 px-3 text-xs">${badgeShift}</td>
          <td class="py-2.5 px-3 text-xs text-gray-500 font-mono">${r.date} ${r.time}</td>
        </tr>
      `;
    }).join('');
  },

  renderChart(tenantCountsOrDepot1, depot2Count, tenant1Name, tenant2Name) {
    const canvas = document.getElementById('dash-depot-chart');
    if (!canvas || !window.Chart) return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    let labels = [];
    let data = [];
    const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6'];

    if (Array.isArray(tenantCountsOrDepot1)) {
      labels = tenantCountsOrDepot1.map(t => t.name);
      data = tenantCountsOrDepot1.map(t => t.count);
    } else {
      labels = [tenant1Name || 'Depot Bu A', tenant2Name || 'Depot Bu Yuli'];
      data = [tenantCountsOrDepot1 || 0, depot2Count || 0];
    }

    const bgColors = labels.map((_, i) => palette[i % palette.length]);

    const ctx = canvas.getContext('2d');
    this.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: bgColors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 11, family: 'Inter, sans-serif' }, boxWidth: 12 }
          }
        },
        cutout: '65%'
      }
    });
  },

  render() {
    this.updateData();
  }
};

window.Dashboard = Dashboard;
