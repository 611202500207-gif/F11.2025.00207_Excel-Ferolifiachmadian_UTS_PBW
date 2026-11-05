/* =========================================================
   aduan.js - Formulir Buat Aduan (aduan.html)
   Validasi, unggah foto, simpan aduan, notifikasi WhatsApp
   untuk aduan Kritis, dan ringkasan input valid.
   ========================================================= */
(function () {
  if (!App.user) return;

  const form = document.getElementById('formAduan');
  const f = {
    nama: document.getElementById('namaPengadu'),
    email: document.getElementById('emailPengadu'),
    noRM: document.getElementById('noRM'),
    jk: document.getElementById('jenisKelamin'),
    tanggal: document.getElementById('tglAduan'),
    sumber: document.getElementById('sumberAduan'),
    sumberLain: document.getElementById('sumberLain'),
    unit: document.getElementById('unitTerkait'),
    unitLain: document.getElementById('unitLain'),
    kategori: document.getElementById('kategori'),
    deskripsi: document.getElementById('deskripsi'),
    foto: document.getElementById('buktiFoto')
  };
  const grupPrioritas = document.getElementById('prioritas');
  const errorPrioritas = document.getElementById('prioritas-error');
  const preview = document.getElementById('previewFoto');
  const hitungKarakter = document.getElementById('hitungKarakter');
  const infoKritis = document.getElementById('infoKritis');
  const btnSimpan = document.getElementById('btnSimpan');
  let fotoTerkompres = null; // hasil kompres foto (data URL)

  document.getElementById('pencatat').textContent = `${App.user.nama} (${App.user.jabatan})`;

  /* ---------- Nilai awal ---------- */
  function aturTanggalAwal() {
    f.tanggal.value = tanggalHariIni();
    f.tanggal.max = tanggalHariIni(); // tanggal aduan tidak boleh di masa depan
  }
  aturTanggalAwal();

  /* ---------- Kolom isian manual "Lainnya" ---------- */
  function aturKolomLain(select, wadahId, input) {
    select.addEventListener('change', () => {
      const lain = select.value === 'Lainnya';
      document.getElementById(wadahId).hidden = !lain;
      if (lain) input.focus(); else input.value = '';
    });
  }
  aturKolomLain(f.sumber, 'wadahSumberLain', f.sumberLain);
  aturKolomLain(f.unit, 'wadahUnitLain', f.unitLain);

  /* ---------- Prioritas: tampilkan info jika Kritis ---------- */
  grupPrioritas.addEventListener('change', () => {
    infoKritis.hidden = prioritasTerpilih() !== 'Kritis';
    errorPrioritas.textContent = '';
  });

  function prioritasTerpilih() {
    const pilih = form.querySelector('input[name="prioritas"]:checked');
    return pilih ? pilih.value : '';
  }

  /* ---------- Penghitung karakter deskripsi ---------- */
  f.deskripsi.addEventListener('input', () => {
    hitungKarakter.textContent = `${f.deskripsi.value.length}/1000`;
  });

  /* ---------- Foto: cek tipe & ukuran, lalu pratinjau ---------- */
  f.foto.addEventListener('change', async () => {
    fotoTerkompres = null;
    preview.hidden = true;
    const file = f.foto.files[0];
    if (!file) { f.foto.classList.remove('is-invalid', 'is-valid'); return; }

    const pesan = cekFileFoto(file);
    if (pesan) {
      tampilkanError(f.foto, pesan);
      f.foto.value = '';
      return;
    }
    try {
      fotoTerkompres = await kompresGambar(file);
      preview.src = fotoTerkompres;
      preview.hidden = false;
      tandaiValid(f.foto);
    } catch (err) {
      tampilkanError(f.foto, err.message);
    }
  });

  /* ---------- Validasi seluruh isian ---------- */
  function validasiForm() {
    let valid = true;
    const cek = (input, kondisi, pesan) => {
      if (!kondisi) { tampilkanError(input, pesan); valid = false; } else { tandaiValid(input); }
    };

    cek(f.nama, Validasi.wajib(f.nama.value), 'Nama tidak boleh kosong atau hanya berisi spasi.');
    if (!Validasi.wajib(f.email.value)) cek(f.email, false, 'Email wajib diisi.');
    else cek(f.email, Validasi.email(f.email.value), 'Format email tidak valid. Contoh: nama@contoh.com');

    if (f.noRM.value.trim() !== '') {
      cek(f.noRM, f.noRM.value.trim().length >= 3, 'Identitas / No. RM minimal 3 karakter.');
    } else {
      f.noRM.classList.remove('is-invalid', 'is-valid');
    }

    if (!f.tanggal.value) cek(f.tanggal, false, 'Tanggal aduan wajib diisi.');
    else cek(f.tanggal, f.tanggal.value <= tanggalHariIni(), 'Tanggal aduan tidak boleh melebihi hari ini.');

    cek(f.sumber, f.sumber.value !== '', 'Pilih sumber media aduan.');
    if (f.sumber.value === 'Lainnya') cek(f.sumberLain, Validasi.wajib(f.sumberLain.value), 'Tuliskan sumber aduan lainnya.');

    cek(f.unit, f.unit.value !== '', 'Pilih lokasi / unit terkait.');
    if (f.unit.value === 'Lainnya') cek(f.unitLain, Validasi.wajib(f.unitLain.value), 'Tuliskan nama unit lainnya.');

    if (!prioritasTerpilih()) {
      errorPrioritas.textContent = 'Pilih tingkat prioritas & SLA.';
      valid = false;
    } else {
      errorPrioritas.textContent = '';
    }

    if (!Validasi.wajib(f.deskripsi.value)) cek(f.deskripsi, false, 'Deskripsi aduan wajib diisi.');
    else cek(f.deskripsi, Validasi.minPanjang(f.deskripsi.value, 10), 'Deskripsi minimal 10 karakter agar jelas.');

    if (f.foto.classList.contains('is-invalid')) valid = false;
    return valid;
  }

  /* ---------- Pesan WhatsApp untuk aduan Kritis ---------- */
  function susunPesanWA(a) {
    return [
      '*[SIGAP RSUD KILISUCI - ADUAN KRITIS]*',
      `No. Aduan : ${a.nomor}`,
      `Tanggal   : ${fmtTanggal(a.tanggal)} ${fmtJam(a.dibuat)}`,
      `Pengadu   : ${a.namaPengadu}`,
      `Unit      : ${namaUnit(a)}`,
      `Sumber    : ${namaSumber(a)}`,
      `SLA       : ${a.slaMenit} menit (respon sebelum ${fmtJam(a.dibuat + a.slaMenit * 60000)})`,
      '',
      `Deskripsi : ${a.deskripsi}`,
      '',
      `Dicatat oleh: ${a.dicatatOleh.nama} (${a.dicatatOleh.jabatan})`,
      'Mohon segera ditindaklanjuti melalui aplikasi SIGAP.'
    ].join('\n');
  }

  // Ubah 0812xxxx menjadi 62812xxxx (format internasional WhatsApp)
  function formatNomorWA(telp) {
    const angka = telp.replace(/\D/g, '');
    if (angka.startsWith('0')) return '62' + angka.slice(1);
    return angka;
  }

  // Opsional: kirim otomatis lewat gateway (mis. Fonnte) jika diaktifkan di config.js
  async function kirimViaGateway(nomor, pesan) {
    const data = new FormData();
    data.append('target', nomor);
    data.append('message', pesan);
    const respons = await fetch(CONFIG.WA_GATEWAY.url, {
      method: 'POST',
      headers: { Authorization: CONFIG.WA_GATEWAY.token },
      body: data
    });
    if (!respons.ok) throw new Error('Gateway menolak permintaan (' + respons.status + ')');
    return respons.json();
  }

  async function kirimNotifikasiKritis(aduan) {
    const penerima = DB.penerimaNotifikasi();
    const pesan = susunPesanWA(aduan);
    const pakaiGateway = CONFIG.WA_GATEWAY.aktif && CONFIG.WA_GATEWAY.token;
    const log = [];
    const ul = document.getElementById('daftarPenerimaWA');
    ul.replaceChildren();

    for (const p of penerima) {
      const nomor = formatNomorWA(p.telp);
      let status = 'Tautan WhatsApp disiapkan';
      if (pakaiGateway) {
        try {
          await kirimViaGateway(nomor, pesan);
          status = 'Terkirim otomatis via gateway';
        } catch (err) {
          status = 'Gagal kirim otomatis: ' + err.message;
        }
      }
      log.push({ nama: p.nama, jabatan: p.jabatan, telp: p.telp, status, waktu: Date.now() });

      // Tampilkan penerima + tombol buka WhatsApp
      const li = buatEl('li', { kelas: 'list-group-item d-flex justify-content-between align-items-center gap-2 flex-wrap' });
      const info = buatEl('div');
      info.append(buatEl('strong', { kelas: 'd-block', teks: p.nama }),
        buatEl('small', { kelas: 'text-muted-sg', teks: `${p.jabatan} · ${p.telp} · ${status}` }));
      const link = buatEl('a', {
        kelas: 'btn btn-success btn-sm',
        attr: { href: `https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`, target: '_blank', rel: 'noopener' }
      });
      link.append(buatIkon('whatsapp'), document.createTextNode(' Kirim WA'));
      li.append(info, link);
      ul.appendChild(li);
    }

    document.getElementById('infoModalWA').textContent = penerima.length
      ? `Aduan ${aduan.nomor} berprioritas KRITIS. Pesan berisi deskripsi aduan diteruskan ke ${penerima.length} pejabat berikut:`
      : 'Belum ada akun berjabatan Direktur / Kepala Bidang yang memiliki nomor telepon. Minta Admin melengkapi data akun.';

    DB.perbaruiAduan(aduan.id, { notifikasi: log });
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalNotifWA')).show();
  }

  /* ---------- Ringkasan input valid (textContent) ---------- */
  function tampilkanRingkasan(a) {
    const dl = document.getElementById('isiRingkasan');
    dl.replaceChildren();
    const baris = [
      ['No. Aduan', a.nomor],
      ['Nama Pengadu', a.namaPengadu],
      ['Email', a.emailPengadu],
      ['Identitas / No. RM', a.noRM || '-'],
      ['Jenis Kelamin', a.jenisKelamin],
      ['Tanggal Aduan', fmtTanggal(a.tanggal)],
      ['Sumber', namaSumber(a)],
      ['Unit Terkait', namaUnit(a)],
      ['Prioritas & SLA', `${a.prioritas} (${a.slaMenit} menit) · batas respon ${fmtJam(a.dibuat + a.slaMenit * 60000)}`],
      ['Kategori', a.kategori],
      ['Deskripsi', a.deskripsi],
      ['Bukti Foto', a.foto ? 'Terlampir' : 'Tidak ada'],
      ['Status', a.status]
    ];
    baris.forEach(([label, nilai]) => dl.append(buatEl('dt', { teks: label }), buatEl('dd', { teks: nilai })));
    const wadah = document.getElementById('ringkasanAduan');
    wadah.hidden = false;
    wadah.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- Submit formulir ---------- */
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); // cegah form terkirim & halaman memuat ulang
    if (!validasiForm()) {
      fokusErrorPertama(form);
      tampilToast('Periksa kembali isian yang ditandai merah.', 'danger');
      return;
    }

    const prioritas = prioritasTerpilih();
    const aduan = {
      id: 'ADN-' + Date.now().toString(36),
      nomor: DB.nomorAduanBaru(),
      namaPengadu: f.nama.value.trim(),
      emailPengadu: f.email.value.trim().toLowerCase(),
      noRM: f.noRM.value.trim(),
      jenisKelamin: f.jk.value,
      tanggal: f.tanggal.value,
      sumber: f.sumber.value,
      sumberLain: f.sumberLain.value.trim(),
      unit: f.unit.value,
      unitLain: f.unitLain.value.trim(),
      prioritas,
      slaMenit: CONFIG.SLA[prioritas].menit,
      kategori: f.kategori.value,
      deskripsi: f.deskripsi.value.trim(),
      foto: fotoTerkompres,
      status: 'Menunggu Respon',
      dibuat: Date.now(),
      dicatatOleh: { id: App.user.id, nama: App.user.nama, jabatan: App.user.jabatan },
      respon: null,
      waktuResponMenit: null,
      selesai: null,
      notifikasi: []
    };

    btnSimpan.disabled = true;
    try {
      DB.tambahAduan(aduan);
    } catch (err) {
      tampilToast(err.message, 'danger');
      btnSimpan.disabled = false;
      return;
    }

    tampilkanRingkasan(aduan);
    if (prioritas === 'Kritis') await kirimNotifikasiKritis(aduan);
    tampilToast(`Aduan ${aduan.nomor} berhasil disimpan.`);

    form.reset();
    btnSimpan.disabled = false;
  });

  /* ---------- Reset formulir ---------- */
  form.addEventListener('reset', () => {
    // tunggu browser selesai mengosongkan isian
    setTimeout(() => {
      bersihkanValidasi(form);
      errorPrioritas.textContent = '';
      document.getElementById('wadahSumberLain').hidden = true;
      document.getElementById('wadahUnitLain').hidden = true;
      infoKritis.hidden = true;
      preview.hidden = true;
      fotoTerkompres = null;
      hitungKarakter.textContent = '0/1000';
      aturTanggalAwal();
    });
  });
})();
