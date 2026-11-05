/* =========================================================
   home.js - Dashboard Monitoring Real Time (index.html)
   ========================================================= */
(function () {
  if (!App.user) return;

  const el = id => document.getElementById(id);

  /* ---------- Sapaan sesuai jam ---------- */
  function sapaanSekarang() {
    const jam = new Date().getHours();
    if (jam < 11) return 'Selamat pagi';
    if (jam < 15) return 'Selamat siang';
    if (jam < 18) return 'Selamat sore';
    return 'Selamat malam';
  }
  el('sapaan').textContent = sapaanSekarang();
  el('namaSapaan').textContent = App.user.nama;

  /* ---------- Kartu statistik ---------- */
  function renderStatistik(daftar) {
    const direspon = daftar.filter(a => a.respon);
    const tepat = direspon.filter(a => statusSLA(a).kode === 'tepat').length;
    const rata = direspon.length
      ? direspon.reduce((jml, a) => jml + a.waktuResponMenit, 0) / direspon.length
      : null;

    el('statTotal').textContent = daftar.length;
    el('statMenunggu').textContent = daftar.filter(a => a.status === 'Menunggu Respon').length;
    el('statDirespon').textContent = daftar.filter(a => a.status === 'Direspon').length;
    el('statSelesai').textContent = daftar.filter(a => a.status === 'Selesai').length;
    el('statSLA').textContent = direspon.length ? Math.round((tepat / direspon.length) * 100) + '%' : '-';
    el('statRata').textContent = rata === null ? '-' : fmtDurasi(rata);
  }

  /* ---------- Aduan aktif (belum direspon) + hitung mundur ---------- */
  function renderAktif(daftar) {
    const ul = el('daftarAktif');
    ul.replaceChildren();
    const aktif = daftar
      .filter(a => a.status === 'Menunggu Respon')
      .sort((a, b) => statusSLA(a).batas - statusSLA(b).batas);

    el('badgeKritisAktif').textContent = aktif.filter(a => a.prioritas === 'Kritis').length + ' kritis';

    if (!aktif.length) {
      const kosong = buatEl('li', { kelas: 'empty-state' });
      kosong.append(buatIkon('emoji-smile'), document.createTextNode('Tidak ada aduan yang menunggu respon.'));
      ul.appendChild(kosong);
      return;
    }

    aktif.slice(0, 6).forEach(a => {
      const li = buatEl('li', { kelas: 'aktif-item ' + a.prioritas });
      const info = buatEl('div', { kelas: 'aktif-info' });
      info.append(
        buatEl('strong', { teks: `${a.nomor} · ${namaUnit(a)}` }),
        buatEl('small', { teks: `${a.prioritas} · ${namaSumber(a)} · ${a.deskripsi}` })
      );
      const cd = teksHitungMundur(a);
      const hitung = buatEl('span', { kelas: 'countdown ' + cd.kelas, teks: cd.teks, attr: { 'data-id': a.id } });
      li.append(info, hitung);
      ul.appendChild(li);
    });
  }

  // Memperbarui teks hitung mundur setiap detik tanpa menggambar ulang daftar
  function perbaruiHitungMundur() {
    const semua = DB.semuaAduan();
    document.querySelectorAll('#daftarAktif .countdown').forEach(span => {
      const aduan = semua.find(a => a.id === span.dataset.id);
      if (!aduan || aduan.respon) return;
      const cd = teksHitungMundur(aduan);
      span.textContent = cd.teks;
      span.className = 'countdown ' + cd.kelas;
    });
  }

  /* ---------- Grafik batang (dibuat dengan elemen div + Flexbox) ---------- */
  function renderBar(ul, data, opsi = {}) {
    ul.replaceChildren();
    if (!data.length) {
      ul.appendChild(buatEl('li', { kelas: 'empty-state', teks: 'Belum ada data.' }));
      return;
    }
    const maks = Math.max(...data.map(d => d.nilai));
    data.forEach(d => {
      const li = buatEl('li', { kelas: 'bar-row' });
      const track = buatEl('div', { kelas: 'bar-track', attr: { role: 'img', 'aria-label': `${d.label}: ${d.teksNilai || d.nilai}` } });
      const fill = buatEl('div', { kelas: 'bar-fill ' + (d.warna || '') });
      fill.style.width = (maks ? (d.nilai / maks) * 100 : 0) + '%';
      track.appendChild(fill);
      li.append(
        buatEl('span', { kelas: 'bar-label', teks: d.label, attr: { title: d.label } }),
        track,
        buatEl('span', { kelas: 'bar-value', teks: d.teksNilai || String(d.nilai) })
      );
      ul.appendChild(li);
    });
    if (opsi.catatan) ul.appendChild(buatEl('li', { kelas: 'form-hint', teks: opsi.catatan }));
  }

  function hitungPer(daftar, ambilKunci) {
    const hasil = {};
    daftar.forEach(a => {
      const k = ambilKunci(a);
      hasil[k] = (hasil[k] || 0) + 1;
    });
    return Object.entries(hasil).map(([label, nilai]) => ({ label, nilai })).sort((a, b) => b.nilai - a.nilai);
  }

  function renderGrafik(daftar) {
    renderBar(el('grafikSumber'), hitungPer(daftar, a => (a.sumber === 'Lainnya' ? a.sumberLain : a.sumber)));

    const warna = { Kritis: 'merah', Sedang: 'kuning', Ringan: 'hijau' };
    renderBar(el('grafikPrioritas'), ['Kritis', 'Sedang', 'Ringan'].map(p => ({
      label: `${p} (${CONFIG.SLA[p].menit} mnt)`,
      nilai: daftar.filter(a => a.prioritas === p).length,
      warna: warna[p]
    })));

    // Rata-rata waktu respon per unit -> unit paling lambat di atas
    const perUnit = {};
    daftar.filter(a => a.respon).forEach(a => {
      const u = namaUnit(a);
      perUnit[u] = perUnit[u] || { total: 0, jumlah: 0 };
      perUnit[u].total += a.waktuResponMenit;
      perUnit[u].jumlah += 1;
    });
    const dataUnit = Object.entries(perUnit)
      .map(([label, v]) => {
        const rata = v.total / v.jumlah;
        return { label, nilai: rata, teksNilai: fmtDurasi(rata), warna: rata > 30 ? 'merah' : rata > 15 ? 'kuning' : 'hijau' };
      })
      .sort((a, b) => b.nilai - a.nilai)
      .slice(0, 5);
    renderBar(el('grafikUnit'), dataUnit);
  }

  /* ---------- Tabel rekap aduan selesai ---------- */
  function renderRekap(daftar) {
    const tbody = el('tabelRekap');
    tbody.replaceChildren();
    const selesai = daftar.filter(a => a.status === 'Selesai')
      .sort((a, b) => b.selesai.waktu - a.selesai.waktu)
      .slice(0, 5);

    if (!selesai.length) {
      const tr = buatEl('tr');
      tr.appendChild(buatEl('td', { kelas: 'empty-state', teks: 'Belum ada aduan selesai.', attr: { colspan: '5' } }));
      tbody.appendChild(tr);
      return;
    }

    selesai.forEach(a => {
      const tr = buatEl('tr');
      const tdNo = buatEl('td', { attr: { 'data-label': 'No. Aduan' } });
      tdNo.append(buatEl('strong', { teks: a.nomor }), buatEl('span', { kelas: 'cell-sub', teks: fmtTanggal(a.tanggal) }));
      const tdPrio = buatEl('td', { attr: { 'data-label': 'Prioritas' } });
      tdPrio.appendChild(badgePrioritas(a.prioritas));
      const sla = statusSLA(a);
      const tdSla = buatEl('td', { attr: { 'data-label': 'SLA' } });
      tdSla.appendChild(buatEl('span', { kelas: 'badge-sg badge-' + sla.kode, teks: sla.label }));
      tr.append(
        tdNo,
        buatEl('td', { teks: namaUnit(a), attr: { 'data-label': 'Unit' } }),
        tdPrio,
        buatEl('td', { teks: fmtDurasi(a.waktuResponMenit), attr: { 'data-label': 'Waktu Respon' } }),
        tdSla
      );
      tbody.appendChild(tr);
    });
  }

  /* ---------- Render semua & pembaruan real time ---------- */
  function renderSemua() {
    const daftar = DB.semuaAduan();
    renderStatistik(daftar);
    renderAktif(daftar);
    renderGrafik(daftar);
    renderRekap(daftar);
  }

  function perbaruiJam() {
    el('jamLive').textContent = new Date().toLocaleTimeString('id-ID');
  }

  renderSemua();
  perbaruiJam();
  setInterval(() => { perbaruiJam(); perbaruiHitungMundur(); }, 1000); // tiap 1 detik
  setInterval(renderSemua, 10000); // muat ulang data tiap 10 detik

  // Jika data berubah di tab lain (mis. petugas lain menekan "Selesai"), dashboard langsung ikut berubah
  window.addEventListener('storage', (event) => {
    if (event.key === KUNCI.aduan) renderSemua();
  });
})();
