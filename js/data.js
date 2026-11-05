/* =========================================================
   data.js - Halaman Data & Tindak Lanjut (data.html)
   Menampilkan tabel aduan, filter, detail, respon, selesai,
   hapus (Admin), dan unduh CSV.
   ========================================================= */
(function () {
  if (!App.user) return;

  const tbody = document.getElementById('tabelAduan');
  const inputCari = document.getElementById('cari');
  const filterPrioritas = document.getElementById('filterPrioritas');
  const urutan = document.getElementById('urutan');
  const chipStatus = document.getElementById('chipStatus');
  let filterStatus = '';
  let aduanDipilih = null; // id aduan yang sedang direspon / diselesaikan

  const modalDetail = new bootstrap.Modal(document.getElementById('modalDetail'));
  const modalRespon = new bootstrap.Modal(document.getElementById('modalRespon'));
  const modalSelesai = new bootstrap.Modal(document.getElementById('modalSelesai'));

  /* ---------- Ambil data sesuai filter ---------- */
  function dataTerfilter() {
    const kata = inputCari.value.trim().toLowerCase();
    let daftar = DB.semuaAduan().filter(a => {
      const cocokStatus = !filterStatus || a.status === filterStatus;
      const cocokPrioritas = !filterPrioritas.value || a.prioritas === filterPrioritas.value;
      const teks = [a.nomor, a.namaPengadu, namaUnit(a), namaSumber(a), a.deskripsi, a.kategori].join(' ').toLowerCase();
      return cocokStatus && cocokPrioritas && (!kata || teks.includes(kata));
    });
    if (urutan.value === 'terbaru') daftar.sort((a, b) => b.dibuat - a.dibuat);
    if (urutan.value === 'terlama') daftar.sort((a, b) => a.dibuat - b.dibuat);
    if (urutan.value === 'sla') {
      // yang belum direspon & batasnya paling dekat tampil di atas
      daftar.sort((a, b) => (a.respon ? 1 : 0) - (b.respon ? 1 : 0) || statusSLA(a).batas - statusSLA(b).batas);
    }
    return daftar;
  }

  /* ---------- Jumlah per status pada chip ---------- */
  function perbaruiChip() {
    const semua = DB.semuaAduan();
    chipStatus.querySelectorAll('[data-jumlah]').forEach(span => {
      const s = span.dataset.jumlah;
      span.textContent = s === 'semua' ? semua.length : semua.filter(a => a.status === s).length;
    });
  }

  /* ---------- Membuat isi sel SLA ---------- */
  function isiSelSLA(td, a) {
    if (a.respon) {
      const s = statusSLA(a);
      td.append(
        buatEl('span', { kelas: 'badge-sg badge-' + s.kode, teks: s.label }),
        buatEl('span', { kelas: 'cell-sub', teks: 'Respon ' + fmtDurasi(a.waktuResponMenit) })
      );
    } else {
      const cd = teksHitungMundur(a);
      td.append(
        buatEl('span', { kelas: 'countdown ' + cd.kelas, teks: cd.teks, attr: { 'data-id': a.id } }),
        buatEl('span', { kelas: 'cell-sub', teks: 'Batas ' + fmtJam(statusSLA(a).batas) })
      );
    }
  }

  function tombolAksi(aksi, id, ikonNama, teks, kelas) {
    const btn = buatEl('button', { kelas: 'btn btn-sm ' + kelas, attr: { type: 'button', 'data-aksi': aksi, 'data-id': id, title: teks, 'aria-label': teks } });
    // teks tombol disembunyikan di layar 768-1199px (hanya ikon) agar tabel tidak melebar
    btn.append(buatIkon(ikonNama), buatEl('span', { kelas: 'teks-aksi', teks: ' ' + teks }));
    return btn;
  }

  /* ---------- Render tabel ---------- */
  function renderTabel() {
    const daftar = dataTerfilter();
    tbody.replaceChildren();
    perbaruiChip();

    if (!daftar.length) {
      const tr = buatEl('tr');
      const td = buatEl('td', { kelas: 'empty-state', attr: { colspan: '7' } });
      td.append(buatIkon('inbox'), document.createTextNode('Tidak ada aduan yang cocok dengan filter.'));
      tr.appendChild(td);
      tbody.appendChild(tr);
      document.getElementById('infoJumlah').textContent = '';
      return;
    }

    daftar.forEach(a => {
      const tr = buatEl('tr');

      const tdNo = buatEl('td', { attr: { 'data-label': 'No. Aduan' } });
      tdNo.append(buatEl('strong', { teks: a.nomor }), buatEl('span', { kelas: 'cell-sub', teks: fmtWaktu(a.dibuat) }));

      const tdPengadu = buatEl('td', { attr: { 'data-label': 'Pengadu' } });
      tdPengadu.append(buatEl('span', { teks: a.namaPengadu }), buatEl('span', { kelas: 'cell-sub', teks: a.noRM ? 'RM ' + a.noRM : a.kategori }));

      const tdUnit = buatEl('td', { attr: { 'data-label': 'Unit & Sumber' } });
      tdUnit.append(buatEl('span', { teks: namaUnit(a) }), buatEl('span', { kelas: 'cell-sub', teks: namaSumber(a) }));

      const tdPrio = buatEl('td', { attr: { 'data-label': 'Prioritas' } });
      tdPrio.appendChild(badgePrioritas(a.prioritas));

      const tdStatus = buatEl('td', { attr: { 'data-label': 'Status' } });
      tdStatus.appendChild(badgeStatus(a.status));

      const tdSla = buatEl('td', { attr: { 'data-label': 'SLA / Respon' } });
      isiSelSLA(tdSla, a);

      // Tombol aksi sesuai status & hak akses role
      const tdAksi = buatEl('td', { attr: { 'data-label': 'Aksi' } });
      const grup = buatEl('div', { kelas: 'aksi-group' });
      grup.appendChild(tombolAksi('detail', a.id, 'eye', 'Detail', 'btn-outline-secondary'));
      if (a.status === 'Menunggu Respon' && boleh('respon')) grup.appendChild(tombolAksi('respon', a.id, 'chat-dots', 'Respon', 'btn-primary'));
      if (a.status === 'Direspon' && boleh('selesai')) grup.appendChild(tombolAksi('selesai', a.id, 'check2-circle', 'Selesai', 'btn-success'));
      if (boleh('hapus')) grup.appendChild(tombolAksi('hapus', a.id, 'trash', 'Hapus', 'btn-outline-danger'));
      tdAksi.appendChild(grup);

      tr.append(tdNo, tdPengadu, tdUnit, tdPrio, tdStatus, tdSla, tdAksi);
      tbody.appendChild(tr);
    });
    document.getElementById('infoJumlah').textContent = `Menampilkan ${daftar.length} dari ${DB.semuaAduan().length} aduan.`;
  }

  /* ---------- Detail aduan ---------- */
  function tampilkanDetail(a) {
    document.getElementById('judulDetail').textContent = 'Detail ' + a.nomor;
    const dl = document.getElementById('isiDetail');
    dl.replaceChildren();
    [
      ['Nama Pengadu', a.namaPengadu], ['Email', a.emailPengadu], ['Identitas / No. RM', a.noRM || '-'],
      ['Jenis Kelamin', a.jenisKelamin], ['Tanggal Aduan', fmtTanggal(a.tanggal)], ['Sumber', namaSumber(a)],
      ['Unit Terkait', namaUnit(a)], ['Kategori', a.kategori], ['Prioritas', `${a.prioritas} (SLA ${a.slaMenit} menit)`],
      ['Status', a.status], ['Status SLA', statusSLA(a).label], ['Deskripsi', a.deskripsi]
    ].forEach(([k, v]) => dl.append(buatEl('dt', { teks: k }), buatEl('dd', { teks: v })));

    const wadahFoto = document.getElementById('wadahFotoDetail');
    wadahFoto.hidden = !a.foto;
    if (a.foto) document.getElementById('fotoDetail').src = a.foto;

    const ol = document.getElementById('timelineDetail');
    ol.replaceChildren();
    const tambahRiwayat = (judul, ket) => {
      const li = buatEl('li');
      li.append(buatEl('strong', { kelas: 'd-block', teks: judul }), buatEl('span', { kelas: 'cell-sub', teks: ket }));
      ol.appendChild(li);
    };
    tambahRiwayat('Aduan dicatat', `${fmtWaktu(a.dibuat)} oleh ${a.dicatatOleh.nama} (${a.dicatatOleh.jabatan})`);
    (a.notifikasi || []).forEach(n => tambahRiwayat('Notifikasi WhatsApp', `${n.nama} (${n.jabatan}) · ${n.status}`));
    if (a.respon) tambahRiwayat(`Direspon dalam ${fmtDurasi(a.waktuResponMenit)}`, `${fmtWaktu(a.respon.waktu)} oleh ${a.respon.oleh} (${a.respon.jabatan}): ${a.respon.catatan}`);
    if (a.selesai) tambahRiwayat('Selesai', `${fmtWaktu(a.selesai.waktu)} oleh ${a.selesai.oleh}${a.selesai.catatan ? ': ' + a.selesai.catatan : ''}`);
    modalDetail.show();
  }

  /* ---------- Event klik tombol aksi (event delegation) ---------- */
  tbody.addEventListener('click', (event) => {
    const tombol = event.target.closest('button[data-aksi]');
    if (!tombol) return;
    const aduan = DB.cariAduan(tombol.dataset.id);
    if (!aduan) return;
    aduanDipilih = aduan.id;

    if (tombol.dataset.aksi === 'detail') tampilkanDetail(aduan);

    if (tombol.dataset.aksi === 'respon') {
      document.getElementById('infoRespon').textContent = `${aduan.nomor} · ${namaUnit(aduan)} · ${aduan.prioritas} — ${aduan.deskripsi}`;
      const catatan = document.getElementById('catatanRespon');
      catatan.value = '';
      bersihkanValidasi(document.getElementById('formRespon'));
      modalRespon.show();
    }

    if (tombol.dataset.aksi === 'selesai') {
      document.getElementById('infoSelesai').textContent = `Tandai ${aduan.nomor} sebagai selesai? Respon terakhir: ${aduan.respon.catatan}`;
      document.getElementById('catatanSelesai').value = '';
      modalSelesai.show();
    }

    if (tombol.dataset.aksi === 'hapus' && confirm(`Hapus aduan ${aduan.nomor}? Tindakan ini tidak dapat dibatalkan.`)) {
      DB.hapusAduan(aduan.id);
      renderTabel();
      tampilToast(`Aduan ${aduan.nomor} dihapus.`, 'secondary');
    }
  });

  /* ---------- Simpan respon ---------- */
  document.getElementById('formRespon').addEventListener('submit', (event) => {
    event.preventDefault();
    const catatan = document.getElementById('catatanRespon');
    if (!Validasi.minPanjang(catatan.value, 5)) {
      tampilkanError(catatan, 'Tuliskan catatan tindak lanjut (minimal 5 karakter).');
      catatan.focus();
      return;
    }
    const aduan = DB.cariAduan(aduanDipilih);
    const waktu = Date.now();
    const hasil = DB.perbaruiAduan(aduanDipilih, {
      status: 'Direspon',
      respon: { olehId: App.user.id, oleh: App.user.nama, jabatan: App.user.jabatan, role: App.user.role, waktu, catatan: catatan.value.trim() },
      waktuResponMenit: Math.round(((waktu - aduan.dibuat) / 60000) * 10) / 10
    });
    modalRespon.hide();
    renderTabel();
    tampilToast(`Respon tersimpan (${statusSLA(hasil).label}).`, statusSLA(hasil).kode === 'tepat' ? 'success' : 'warning');
  });

  /* ---------- Tandai selesai ---------- */
  document.getElementById('formSelesai').addEventListener('submit', (event) => {
    event.preventDefault();
    DB.perbaruiAduan(aduanDipilih, {
      status: 'Selesai',
      selesai: { olehId: App.user.id, oleh: App.user.nama, jabatan: App.user.jabatan, waktu: Date.now(), catatan: document.getElementById('catatanSelesai').value.trim() }
    });
    modalSelesai.hide();
    renderTabel();
    tampilToast('Aduan ditandai selesai dan masuk rekap dashboard.');
  });

  /* ---------- Filter ---------- */
  chipStatus.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    chipStatus.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    filterStatus = chip.dataset.status;
    renderTabel();
  });
  inputCari.addEventListener('input', renderTabel);
  filterPrioritas.addEventListener('change', renderTabel);
  urutan.addEventListener('change', renderTabel);
  document.getElementById('formFilter').addEventListener('submit', (event) => event.preventDefault());

  /* ---------- Unduh CSV (bisa dibuka di Excel) ---------- */
  document.getElementById('btnCSV').addEventListener('click', () => {
    const kolom = ['No Aduan', 'Tanggal', 'Pengadu', 'Email', 'No RM', 'Sumber', 'Unit', 'Kategori', 'Prioritas', 'SLA (menit)',
      'Status', 'Waktu Respon (menit)', 'Status SLA', 'Direspon Oleh', 'Catatan Respon', 'Deskripsi'];
    const aman = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const baris = dataTerfilter().map(a => [a.nomor, a.tanggal, a.namaPengadu, a.emailPengadu, a.noRM, namaSumber(a), namaUnit(a),
      a.kategori, a.prioritas, a.slaMenit, a.status, a.waktuResponMenit ?? '', statusSLA(a).label,
      a.respon ? a.respon.oleh : '', a.respon ? a.respon.catatan : '', a.deskripsi].map(aman).join(';'));
    const isi = '﻿' + [kolom.map(aman).join(';'), ...baris].join('\r\n');
    const url = URL.createObjectURL(new Blob([isi], { type: 'text/csv;charset=utf-8' }));
    const a = buatEl('a', { attr: { href: url, download: `rekap-aduan-sigap-${tanggalHariIni()}.csv` } });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  /* ---------- Hitung mundur & sinkron real time ---------- */
  setInterval(() => {
    document.querySelectorAll('#tabelAduan .countdown').forEach(span => {
      const a = DB.cariAduan(span.dataset.id);
      if (!a || a.respon) return;
      const cd = teksHitungMundur(a);
      span.textContent = cd.teks;
      span.className = 'countdown ' + cd.kelas;
    });
  }, 1000);

  window.addEventListener('storage', (event) => {
    if (event.key === KUNCI.aduan) renderTabel();
  });

  renderTabel();
})();
