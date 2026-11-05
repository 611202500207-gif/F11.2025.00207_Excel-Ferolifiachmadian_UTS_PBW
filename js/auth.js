/* =========================================================
   auth.js - Logika halaman Login (login.html) dan
   Pendaftaran akun (daftar.html)
   ========================================================= */

/* ---------- Halaman LOGIN ---------- */
const formLogin = document.getElementById('formLogin');

if (formLogin) {
  const inputEmail = document.getElementById('loginEmail');
  const inputSandi = document.getElementById('loginPassword');
  const alertLogin = document.getElementById('alertLogin');
  const btnLihat = document.getElementById('btnLihatSandi');

  // Tampilkan / sembunyikan kata sandi
  btnLihat.addEventListener('click', () => {
    const tersembunyi = inputSandi.type === 'password';
    inputSandi.type = tersembunyi ? 'text' : 'password';
    btnLihat.querySelector('i').className = tersembunyi ? 'bi bi-eye-slash' : 'bi bi-eye';
    btnLihat.setAttribute('aria-label', tersembunyi ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  });

  formLogin.addEventListener('submit', (event) => {
    event.preventDefault(); // cegah halaman memuat ulang
    alertLogin.classList.add('d-none');
    let valid = true;

    if (!Validasi.wajib(inputEmail.value)) {
      tampilkanError(inputEmail, 'Email wajib diisi.');
      valid = false;
    } else if (!Validasi.email(inputEmail.value)) {
      tampilkanError(inputEmail, 'Format email tidak valid. Contoh: nama@contoh.com');
      valid = false;
    } else {
      tandaiValid(inputEmail);
    }

    if (!Validasi.wajib(inputSandi.value)) {
      tampilkanError(inputSandi, 'Kata sandi wajib diisi.');
      valid = false;
    } else {
      tandaiValid(inputSandi);
    }

    if (!valid) {
      fokusErrorPertama(formLogin);
      return;
    }

    const akun = DB.login(inputEmail.value, inputSandi.value);
    if (!akun) {
      alertLogin.textContent = 'Email atau kata sandi salah. Periksa kembali atau daftar akun baru.';
      alertLogin.classList.remove('d-none');
      inputSandi.value = '';
      inputSandi.classList.remove('is-valid');
      inputSandi.focus();
      return;
    }
    location.href = 'index.html';
  });
}

/* ---------- Halaman DAFTAR ---------- */
const formDaftar = document.getElementById('formDaftar');

if (formDaftar) {
  const f = {
    nama: document.getElementById('regNama'),
    unit: document.getElementById('regUnit'),
    jabatan: document.getElementById('regJabatan'),
    telp: document.getElementById('regTelp'),
    email: document.getElementById('regEmail'),
    sandi: document.getElementById('regPassword'),
    sandi2: document.getElementById('regPassword2')
  };
  const infoSaran = document.getElementById('infoSaranRole');
  const ringkasan = document.getElementById('ringkasanDaftar');
  const isiRingkasan = document.getElementById('isiRingkasanDaftar');

  isiSelect(f.unit, DAFTAR_UNIT_KERJA, '-- Pilih Unit Kerja --');
  isiSelect(f.jabatan, DAFTAR_JABATAN, '-- Pilih Jabatan --');

  // Info saran role saat jabatan dipilih
  f.jabatan.addEventListener('change', () => {
    infoSaran.textContent = f.jabatan.value
      ? `Saran role untuk jabatan ini: ${saranRole(f.jabatan.value)} (ditetapkan oleh Admin).`
      : '';
  });

  function validasiDaftar() {
    let valid = true;
    const cek = (input, kondisi, pesan) => {
      if (!kondisi) { tampilkanError(input, pesan); valid = false; } else { tandaiValid(input); }
    };

    if (!Validasi.wajib(f.nama.value)) cek(f.nama, false, 'Nama tidak boleh kosong atau hanya spasi.');
    else cek(f.nama, Validasi.minPanjang(f.nama.value, 3), 'Nama minimal 3 huruf.');

    cek(f.unit, f.unit.value !== '', 'Pilih lokasi unit kerja.');
    cek(f.jabatan, f.jabatan.value !== '', 'Pilih jabatan.');
    cek(f.telp, Validasi.telp(f.telp.value), 'Nomor telepon tidak valid. Contoh: 081234567890');

    if (!Validasi.email(f.email.value)) cek(f.email, false, 'Format email tidak valid. Contoh: nama@contoh.com');
    else cek(f.email, !DB.cariPenggunaEmail(f.email.value), 'Email sudah terdaftar. Silakan masuk.');

    cek(f.sandi, f.sandi.value.length >= 6, 'Kata sandi minimal 6 karakter.');
    cek(f.sandi2, f.sandi2.value === f.sandi.value && f.sandi2.value !== '', 'Kata sandi tidak sama.');
    return valid;
  }

  formDaftar.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validasiDaftar()) {
      fokusErrorPertama(formDaftar);
      return;
    }

    const akun = DB.tambahPengguna({
      nama: f.nama.value,
      unitKerja: f.unit.value,
      jabatan: f.jabatan.value,
      telp: f.telp.value,
      email: f.email.value,
      password: f.sandi.value,
      role: 'User'
    });

    // Ringkasan input yang valid ditampilkan dengan textContent
    isiRingkasan.replaceChildren();
    [['Nama', akun.nama], ['Unit Kerja', akun.unitKerja], ['Jabatan', akun.jabatan],
      ['Telepon', akun.telp], ['Email', akun.email], ['Role awal', akun.role]]
      .forEach(([label, nilai]) => {
        isiRingkasan.append(buatEl('dt', { teks: label }), buatEl('dd', { teks: nilai }));
      });
    ringkasan.hidden = false;
    formDaftar.reset();
    bersihkanValidasi(formDaftar);
    infoSaran.textContent = '';
    ringkasan.scrollIntoView({ behavior: 'smooth', block: 'center' });
    tampilToast('Akun berhasil dibuat. Silakan masuk.');
  });
}
