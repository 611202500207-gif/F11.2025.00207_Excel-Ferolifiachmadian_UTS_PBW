/* =========================================================
   profil.js - Halaman Profil (profil.html)
   Menampilkan & mengedit profil, foto profil, serta
   panel Kelola Akun & Role khusus Admin.
   ========================================================= */
(function () {
  if (!App.user) return;

  const el = id => document.getElementById(id);
  const form = el('formProfil');
  const f = {
    nama: el('editNama'),
    unit: el('editUnit'),
    jabatan: el('editJabatan'),
    telp: el('editTelp'),
    email: el('editEmail'),
    foto: el('fotoProfil')
  };
  let fotoBaru; // undefined = tidak diubah, null = dihapus, string = foto baru

  isiSelect(f.unit, DAFTAR_UNIT_KERJA, '-- Pilih Unit Kerja --');
  isiSelect(f.jabatan, DAFTAR_JABATAN, '-- Pilih Jabatan --');

  /* ---------- Tampilkan kartu profil ---------- */
  function renderProfil() {
    const u = App.user;
    isiAvatar(el('profilAvatar'), u);
    el('profilNama').textContent = u.nama;
    el('profilJabatan').textContent = u.jabatan;
    el('profilRole').textContent = 'Role: ' + u.role;
    el('profilUnit').textContent = u.unitKerja;
    el('profilEmail').textContent = u.email;
    el('profilTelp').textContent = u.telp;
    el('profilDibuat').textContent = fmtWaktu(u.dibuat);
    el('roleSaatIni').textContent = u.role;
  }

  function isiFormDariProfil() {
    const u = App.user;
    f.nama.value = u.nama;
    f.unit.value = u.unitKerja;
    f.jabatan.value = u.jabatan;
    f.telp.value = u.telp;
    f.email.value = u.email;
    f.foto.value = '';
    fotoBaru = undefined;
    isiAvatar(el('previewAvatar'), u);
    bersihkanValidasi(form);
  }

  /* ---------- Foto profil ---------- */
  f.foto.addEventListener('change', async () => {
    const file = f.foto.files[0];
    if (!file) return;
    const pesan = cekFileFoto(file);
    if (pesan) {
      tampilkanError(f.foto, pesan);
      f.foto.value = '';
      return;
    }
    try {
      fotoBaru = await kompresGambar(file, 320, 0.8); // foto profil cukup kecil
      isiAvatar(el('previewAvatar'), { nama: f.nama.value || App.user.nama, foto: fotoBaru });
      tandaiValid(f.foto);
    } catch (err) {
      tampilkanError(f.foto, err.message);
    }
  });

  el('btnHapusFoto').addEventListener('click', () => {
    fotoBaru = null;
    f.foto.value = '';
    isiAvatar(el('previewAvatar'), { nama: f.nama.value || App.user.nama, foto: null });
  });

  el('btnBatalEdit').addEventListener('click', isiFormDariProfil);

  /* ---------- Simpan perubahan profil ---------- */
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    let valid = true;
    const cek = (input, kondisi, pesan) => {
      if (!kondisi) { tampilkanError(input, pesan); valid = false; } else { tandaiValid(input); }
    };
    cek(f.nama, Validasi.wajib(f.nama.value), 'Nama tidak boleh kosong atau hanya spasi.');
    cek(f.unit, f.unit.value !== '', 'Pilih lokasi unit kerja.');
    cek(f.jabatan, f.jabatan.value !== '', 'Pilih jabatan.');
    cek(f.telp, Validasi.telp(f.telp.value), 'Nomor telepon tidak valid. Contoh: 081234567890');
    if (!Validasi.email(f.email.value)) {
      cek(f.email, false, 'Format email tidak valid.');
    } else {
      const pemilik = DB.cariPenggunaEmail(f.email.value);
      cek(f.email, !pemilik || pemilik.id === App.user.id, 'Email sudah dipakai akun lain.');
    }
    if (!valid) {
      fokusErrorPertama(form);
      return;
    }

    const perubahan = {
      nama: f.nama.value.trim(),
      unitKerja: f.unit.value,
      jabatan: f.jabatan.value,
      telp: f.telp.value.trim(),
      email: f.email.value.trim().toLowerCase()
    };
    if (fotoBaru !== undefined) perubahan.foto = fotoBaru;

    try {
      App.user = DB.perbaruiPengguna(App.user.id, perubahan);
    } catch (err) {
      tampilToast(err.message, 'danger');
      return;
    }
    renderProfil();
    renderNavbarUser();
    isiFormDariProfil();
    if (boleh('kelolaAkun')) renderTabelAkun();
    tampilToast('Profil berhasil diperbarui.');
  });

  function renderNavbarUser() {
    el('navNama').textContent = App.user.nama;
    el('navRole').textContent = `${App.user.jabatan} · ${App.user.role}`;
    isiAvatar(el('navAvatar'), App.user);
  }

  /* ---------- Panel Admin: kelola akun & role ---------- */
  function renderTabelAkun() {
    const tbody = el('tabelAkun');
    tbody.replaceChildren();
    DB.semuaPengguna().forEach(u => {
      const tr = buatEl('tr');
      const diriSendiri = u.id === App.user.id;

      const tdNama = buatEl('td', { attr: { 'data-label': 'Nama & Email' } });
      tdNama.append(buatEl('strong', { teks: u.nama + (diriSendiri ? ' (Anda)' : '') }), buatEl('span', { kelas: 'cell-sub', teks: `${u.email} · ${u.telp}` }));

      const tdSaran = buatEl('td', { attr: { 'data-label': 'Saran' } });
      tdSaran.appendChild(buatEl('span', { kelas: 'badge-sg badge-role', teks: saranRole(u.jabatan) }));

      const tdRole = buatEl('td', { attr: { 'data-label': 'Role' } });
      const pilih = buatEl('select', { kelas: 'form-select form-select-sm', attr: { 'aria-label': 'Role ' + u.nama, 'data-id': u.id } });
      DAFTAR_ROLE.forEach(r => {
        const opt = buatEl('option', { teks: r, attr: { value: r } });
        if (r === u.role) opt.selected = true;
        pilih.appendChild(opt);
      });
      pilih.disabled = diriSendiri; // Admin tidak bisa menurunkan role dirinya sendiri
      tdRole.appendChild(pilih);

      const tdAksi = buatEl('td', { attr: { 'data-label': 'Aksi' } });
      const grup = buatEl('div', { kelas: 'aksi-group' });
      const btnSimpan = buatEl('button', { kelas: 'btn btn-sm btn-primary', teks: 'Simpan', attr: { type: 'button', 'data-aksi': 'simpan', 'data-id': u.id } });
      const btnHapus = buatEl('button', { kelas: 'btn btn-sm btn-outline-danger', teks: 'Hapus', attr: { type: 'button', 'data-aksi': 'hapus', 'data-id': u.id } });
      btnSimpan.disabled = diriSendiri;
      btnHapus.disabled = diriSendiri;
      grup.append(btnSimpan, btnHapus);
      tdAksi.appendChild(grup);

      tr.append(tdNama,
        buatEl('td', { teks: u.unitKerja, attr: { 'data-label': 'Unit Kerja' } }),
        buatEl('td', { teks: u.jabatan, attr: { 'data-label': 'Jabatan' } }),
        tdSaran, tdRole, tdAksi);
      tbody.appendChild(tr);
    });
  }

  if (boleh('kelolaAkun')) {
    renderTabelAkun();

    el('tabelAkun').addEventListener('click', (event) => {
      const tombol = event.target.closest('button[data-aksi]');
      if (!tombol) return;
      const id = tombol.dataset.id;
      const akun = DB.semuaPengguna().find(u => u.id === id);
      if (!akun) return;

      if (tombol.dataset.aksi === 'simpan') {
        const roleBaru = el('tabelAkun').querySelector(`select[data-id="${id}"]`).value;
        DB.perbaruiPengguna(id, { role: roleBaru });
        renderTabelAkun();
        tampilToast(`Role ${akun.nama} diubah menjadi ${roleBaru}.`);
      }
      if (tombol.dataset.aksi === 'hapus' && confirm(`Hapus akun ${akun.nama}?`)) {
        DB.hapusPengguna(id);
        renderTabelAkun();
        tampilToast(`Akun ${akun.nama} dihapus.`, 'secondary');
      }
    });

    el('btnResetDemo').addEventListener('click', () => {
      if (!confirm('Kembalikan semua akun dan aduan ke data demo awal? Data yang Anda buat akan hilang.')) return;
      DB.resetDemo();
      DB.logout();
      location.href = 'login.html';
    });
  }

  renderProfil();
  isiFormDariProfil();
})();
