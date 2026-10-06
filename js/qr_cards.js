/**
 * qr_cards.js - Pembuatan Kartu QR Karyawan Sesuai Aturan Spesifik:
 * 1. Paling atas: Nama karyawan (BOLD)
 * 2. Bawahnya: Jabatan
 * 3. Bawahnya: QR Code
 * 4. Bawahnya: ID Karyawan
 * 5. Paling bawah: Tulisan "Kartu absensi Karyawan"
 */

const QRCardsManager = {
  listenersAttached: false,

  init() {
    this.render();
    this.setupListeners();
  },

  setupListeners() {
    if (this.listenersAttached) return;
    this.listenersAttached = true;

    const searchInput = document.getElementById('qr-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.render());
    }
    const deptFilter = document.getElementById('qr-filter-dept');
    if (deptFilter) {
      deptFilter.addEventListener('change', () => this.render());
    }
  },

  render() {
    const container = document.getElementById('qr-cards-grid');
    const deptSelect = document.getElementById('qr-filter-dept');
    const searchInput = document.getElementById('qr-search-input');
    const badgeCount = document.getElementById('qr-total-count');

    if (!container) return;

    // Populate dept filter if empty
    if (deptSelect && deptSelect.options.length <= 1) {
      deptSelect.innerHTML = '<option value="">Semua Departemen</option>';
      window.DEPARTMENTS.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.innerText = d;
        deptSelect.appendChild(opt);
      });
    }

    let employees = Store.getEmployees();
    const searchVal = (searchInput?.value || '').toLowerCase().trim();
    const deptVal = deptSelect?.value || '';

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

    if (badgeCount) {
      badgeCount.innerText = `${employees.length} Kartu`;
    }

    if (employees.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center text-gray-400">
          <i class="fa-solid fa-qrcode text-4xl mb-2 opacity-40"></i>
          <p class="text-sm">Tidak ada kartu karyawan yang sesuai filter.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    employees.forEach(emp => {
      const cardEl = document.createElement('div');
      cardEl.className = 'qr-card-item bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition text-center flex flex-col items-center justify-between relative overflow-hidden print:border print:border-gray-400 print:shadow-none print:break-inside-avoid print:p-4';

      // Badge status di pojok
      const isAktif = emp.status === 'Aktif';
      const statusIndicator = isAktif
        ? `<span class="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-emerald-500" title="Karyawan Aktif"></span>`
        : `<span class="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-rose-500" title="Karyawan Non-Aktif"></span>`;

      // Header Kartu
      const topSection = document.createElement('div');
      topSection.className = 'w-full mb-3';
      topSection.innerHTML = `
        ${statusIndicator}
        <!-- Paling Atas: Nama Karyawan BOLD -->
        <h3 class="font-extrabold text-base text-gray-900 tracking-tight leading-snug qr-card-name">${emp.name}</h3>
        <!-- Bawahnya: Jabatan -->
        <p class="text-xs text-emerald-700 font-semibold mt-0.5 qr-card-position">${emp.position || 'Staff'} • ${emp.department}</p>
      `;

      // Bawahnya: QR Code
      const qrWrapper = document.createElement('div');
      qrWrapper.className = 'my-2 p-2 bg-white rounded-xl shadow-xs border border-gray-100 flex items-center justify-center';
      const qrDiv = document.createElement('div');
      qrDiv.id = `qrcode-${emp.id}`;
      qrWrapper.appendChild(qrDiv);

      // Bawahnya: ID Karyawan dan paling bawah: "Kartu absensi Karyawan"
      const bottomSection = document.createElement('div');
      bottomSection.className = 'w-full mt-2 pt-2 border-t border-gray-100';
      bottomSection.innerHTML = `
        <!-- Bawahnya: ID Karyawan -->
        <p class="font-mono font-bold text-sm text-gray-800 tracking-wider qr-card-id">${emp.id}</p>
        <!-- Paling Bawah: Tulisan Kartu absensi Karyawan -->
        <p class="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mt-1 qr-card-footer">
          Kartu absensi Karyawan
        </p>
      `;

      // Tombol Aksi per kartu (Print / Unduh)
      const actionSection = document.createElement('div');
      actionSection.className = 'w-full mt-4 flex items-center justify-center gap-2 print:hidden';
      actionSection.innerHTML = `
        <button onclick="QRCardsManager.printSingleCard('${emp.id}')" class="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition flex items-center gap-1">
          <i class="fa-solid fa-print"></i> Cetak
        </button>
      `;

      cardEl.appendChild(topSection);
      cardEl.appendChild(qrWrapper);
      cardEl.appendChild(bottomSection);
      cardEl.appendChild(actionSection);

      container.appendChild(cardEl);

      // Render QR Code
      setTimeout(() => {
        try {
          new QRCode(qrDiv, {
            text: emp.id,
            width: 130,
            height: 130,
            colorDark: '#111827',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
          });
        } catch (e) {
          console.error('Error rendering QR', e);
        }
      }, 50);
    });
  },

  printAllCards() {
    window.print();
  },

  printSingleCard(empId) {
    const emp = Store.findEmployee(empId);
    if (!emp) return;

    // Membuka jendela print khusus untuk satu kartu
    const printWindow = window.open('', '_blank', 'width=450,height=600');
    if (!printWindow) {
      alert('Pop-up terblokir. Harap izinkan pop-up untuk mencetak kartu.');
      return;
    }

    const s = Store.getSettings();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kartu Absensi - ${emp.name}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 90vh;
            background: #f4f5f7;
          }
          .card {
            width: 300px;
            background: #ffffff;
            border: 2px solid #10b981;
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .hotel-title {
            font-size: 11px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
          }
          .emp-name {
            font-size: 18px;
            font-weight: 800;
            color: #111827;
            margin: 0 0 4px 0;
          }
          .emp-pos {
            font-size: 13px;
            color: #059669;
            font-weight: 600;
            margin: 0 0 16px 0;
          }
          .qr-box {
            display: inline-block;
            padding: 10px;
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            margin-bottom: 16px;
          }
          .emp-id {
            font-family: monospace;
            font-size: 16px;
            font-weight: 700;
            color: #1f2937;
            letter-spacing: 2px;
            margin: 0 0 8px 0;
          }
          .footer-text {
            font-size: 11px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            border-top: 1px solid #e5e7eb;
            padding-top: 12px;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="hotel-title">${s.hotelName}</div>
          <h2 class="emp-name">${emp.name}</h2>
          <p class="emp-pos">${emp.position || 'Staff'} • ${emp.department}</p>
          <div class="qr-box">
            <div id="qrcode"></div>
          </div>
          <div class="emp-id">${emp.id}</div>
          <p class="footer-text">Kartu absensi Karyawan</p>
        </div>
        <script>
          new QRCode(document.getElementById('qrcode'), {
            text: '${emp.id}',
            width: 150,
            height: 150,
            colorDark: '#111827',
            colorLight: '#ffffff'
          });
          setTimeout(() => {
            window.print();
          }, 400);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
};

window.QRCardsManager = QRCardsManager;
