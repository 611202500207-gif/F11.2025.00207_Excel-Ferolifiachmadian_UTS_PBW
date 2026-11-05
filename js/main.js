/* =========================================================
   main.js - Fungsi bersama untuk semua halaman SIGAP
   1. Tema terang-gelap        4. Validasi formulir
   2. Proteksi login & role    5. Utilitas tampilan (toast, format)
   3. Navbar (nama & foto)     6. Kompres foto
   ========================================================= */

const App = { user: null };

/* ---------- 1. Tema terang - gelap ---------- */
function terapkanTema(tema) {
  document.documentElement.setAttribute('data-bs-theme', tema);
  localStorage.setItem(KUNCI.tema, tema);
  document.querySelectorAll('.btn-tema').forEach(btn => {
    const ikonTema = btn.querySelector('i');
    ikonTema.className = tema === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';
    const label = tema === 'dark' ? 'Aktifkan tema terang' : 'Aktifkan tema gelap';
    btn.setAttribute('aria-label', label);
    btn.title = label;
  });
}

function aturTombolTema() {
  terapkanTema(document.documentElement.getAttribute('data-bs-theme') || 'light');
  document.querySelectorAll('.btn-tema').forEach(btn => {
    btn.addEventListener('click', () => {
      const sekarang = document.documentElement.getAttribute('data-bs-theme');
      terapkanTema(sekarang === 'dark' ? 'light' : 'dark');
    });
  });
}

/* ---------- 2. Proteksi halaman (harus login) & hak akses ---------- */
const HALAMAN_PUBLIK = ['login', 'daftar'];

function jalankanProteksi() {
  const halaman = document.body.dataset.page;
  const user = DB.penggunaAktif();
  if (!HALAMAN_PUBLIK.includes(halaman) && !user) {
    location.replace('login.html');
    return null;
  }
  if (HALAMAN_PUBLIK.includes(halaman) && user) {
    location.replace('index.html');
    return null;
  }
  return user;
}

function boleh(aksi) {
  return !!(App.user && HAK_AKSES[App.user.role] && HAK_AKSES[App.user.role][aksi]);
}

// Elemen dengan atribut data-role="Admin Kepala" hanya tampil untuk role tersebut
function terapkanAksesElemen() {
  document.querySelectorAll('[data-role]').forEach(el => {
    const diizinkan = el.dataset.role.split(' ');
    el.hidden = !diizinkan.includes(App.user.role);
  });
}

/* ---------- 3. Navbar: menu aktif, nama, foto, logout ---------- */
function isiAvatar(wadah, user) {
  wadah.replaceChildren();
  if (user.foto) {
    const img = document.createElement('img');
    img.src = user.foto;
    img.alt = 'Foto ' + user.nama;
    wadah.appendChild(img);
  } else {
    const inisial = user.nama.split(/\s+/).filter(Boolean).slice(0, 2).map(k => k[0]).join('').toUpperCase();
    wadah.textContent = inisial || '?';
  }
}

function renderNavbar() {
  const halaman = document.body.dataset.page;
  document.querySelectorAll('[data-nav]').forEach(link => {
    const aktif = link.dataset.nav === halaman;
    link.classList.toggle('active', aktif);
    if (aktif) link.setAttribute('aria-current', 'page');
  });

  const nama = document.getElementById('navNama');
  const role = document.getElementById('navRole');
  const avatar = document.getElementById('navAvatar');
  if (nama) nama.textContent = App.user.nama;
  if (role) role.textContent = `${App.user.jabatan} · ${App.user.role}`;
  if (avatar) isiAvatar(avatar, App.user);

  const tombolKeluar = document.getElementById('btnLogout');
  if (tombolKeluar) {
    tombolKeluar.addEventListener('click', () => {
      DB.logout();
      location.href = 'login.html';
    });
  }
}

/* ---------- 4. Validasi formulir ---------- */
const Validasi = {
  // tidak boleh kosong atau hanya berisi spasi
  wajib: nilai => nilai.trim().length > 0,
  email: nilai => /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(nilai.trim()),
  telp: nilai => /^(\+62|62|0)8[0-9]{7,12}$/.test(nilai.replace(/[\s-]/g, '')),
  minPanjang: (nilai, n) => nilai.trim().length >= n
};

// Menampilkan pesan kesalahan di bawah input (pakai textContent)
function tampilkanError(input, pesan) {
  input.classList.add('is-invalid');
  input.classList.remove('is-valid');
  input.setAttribute('aria-invalid', 'true');
  const wadahPesan = document.getElementById(input.id + '-error');
  if (wadahPesan) wadahPesan.textContent = pesan;
}

function tandaiValid(input) {
  input.classList.remove('is-invalid');
  input.classList.add('is-valid');
  input.removeAttribute('aria-invalid');
  const wadahPesan = document.getElementById(input.id + '-error');
  if (wadahPesan) wadahPesan.textContent = '';
}

function bersihkanValidasi(form) {
  form.querySelectorAll('.is-invalid, .is-valid').forEach(el => el.classList.remove('is-invalid', 'is-valid'));
  form.querySelectorAll('.invalid-feedback').forEach(el => { el.textContent = ''; });
}

// Fokus ke input pertama yang salah agar mudah diperbaiki
function fokusErrorPertama(form) {
  const pertama = form.querySelector('.is-invalid');
  if (pertama) pertama.focus();
}

/* ---------- 5. Utilitas tampilan ---------- */
function buatEl(tag, opsi = {}) {
  const el = document.createElement(tag);
  if (opsi.kelas) el.className = opsi.kelas;
  if (opsi.teks !== undefined && opsi.teks !== null) el.textContent = opsi.teks;
  if (opsi.attr) Object.entries(opsi.attr).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function buatIkon(nama) {
  return buatEl('i', { kelas: 'bi bi-' + nama, attr: { 'aria-hidden': 'true' } });
}

function isiSelect(select, daftar, teksAwal) {
  select.replaceChildren(buatEl('option', { teks: teksAwal, attr: { value: '' } }));
  daftar.forEach(item => select.appendChild(buatEl('option', { teks: item, attr: { value: item } })));
}

function tanggalHariIni() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function fmtTanggal(isoTanggal) {
  const [y, m, d] = isoTanggal.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtWaktu(ms) {
  return new Date(ms).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtJam(ms) {
  return new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function fmtDurasi(menit) {
  if (menit === null || menit === undefined) return '-';
  if (menit < 1) return '< 1 menit';
  if (menit < 60) return Math.round(menit) + ' menit';
  const jam = Math.floor(menit / 60);
  const sisa = Math.round(menit % 60);
  return sisa ? `${jam} jam ${sisa} menit` : `${jam} jam`;
}

// Format hitung mundur, contoh 08:15 atau 1:02:30
function fmtHitungMundur(ms) {
  let detik = Math.floor(Math.abs(ms) / 1000);
  const jam = Math.floor(detik / 3600);
  detik %= 3600;
  const menit = Math.floor(detik / 60);
  detik %= 60;
  const dua = n => String(n).padStart(2, '0');
  return (jam ? jam + ':' : '') + dua(menit) + ':' + dua(detik);
}

function teksHitungMundur(aduan) {
  const s = statusSLA(aduan);
  if (s.kode === 'lewat') return { teks: 'Lewat ' + fmtHitungMundur(s.sisa), kelas: 'lewat' };
  return { teks: 'Sisa ' + fmtHitungMundur(s.sisa), kelas: s.kode === 'mendekati' ? 'kritis' : '' };
}

function badgePrioritas(prioritas) {
  const span = buatEl('span', { kelas: 'badge-sg badge-' + prioritas });
  span.append(buatEl('span', { kelas: 'dot' }), document.createTextNode(` ${prioritas} · ${CONFIG.SLA[prioritas].menit} mnt`));
  return span;
}

function badgeStatus(status) {
  const kelas = { 'Menunggu Respon': 'menunggu', 'Direspon': 'direspon', 'Selesai': 'selesai' }[status];
  const ikonStatus = { 'Menunggu Respon': 'hourglass-split', 'Direspon': 'chat-dots', 'Selesai': 'check2-circle' }[status];
  const span = buatEl('span', { kelas: 'badge-sg badge-' + kelas });
  span.append(buatIkon(ikonStatus), document.createTextNode(' ' + status));
  return span;
}

function namaSumber(aduan) {
  return aduan.sumber === 'Lainnya' ? `Lainnya: ${aduan.sumberLain}` : aduan.sumber;
}

function namaUnit(aduan) {
  return aduan.unit === 'Lainnya' ? aduan.unitLain : aduan.unit;
}

// Notifikasi kecil di pojok layar (Bootstrap Toast)
function tampilToast(pesan, jenis = 'success') {
  let wadah = document.getElementById('wadahToast');
  if (!wadah) {
    wadah = buatEl('div', { kelas: 'toast-container position-fixed bottom-0 end-0 p-3', attr: { id: 'wadahToast' } });
    document.body.appendChild(wadah);
  }
  const toast = buatEl('div', { kelas: `toast align-items-center text-bg-${jenis} border-0`, attr: { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' } });
  const isi = buatEl('div', { kelas: 'd-flex' });
  const tombolTutup = buatEl('button', { kelas: 'btn-close btn-close-white me-2 m-auto', attr: { type: 'button', 'data-bs-dismiss': 'toast', 'aria-label': 'Tutup' } });
  isi.append(buatEl('div', { kelas: 'toast-body', teks: pesan }), tombolTutup);
  toast.appendChild(isi);
  wadah.appendChild(toast);
  const bsToast = new bootstrap.Toast(toast, { delay: 3500 });
  bsToast.show();
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

/* ---------- 6. Foto: validasi & kompres sebelum disimpan ---------- */
function cekFileFoto(file) {
  const tipeValid = ['image/jpeg', 'image/png', 'image/webp'];
  if (!tipeValid.includes(file.type)) return 'Format foto harus JPG, PNG, atau WEBP.';
  if (file.size > CONFIG.maksUkuranFoto) return 'Ukuran foto maksimal 2 MB.';
  return '';
}

// Mengecilkan foto memakai <canvas> agar hemat ruang penyimpanan
function kompresGambar(file, maksSisi = 1280, kualitas = 0.75) {
  return new Promise((resolve, reject) => {
    const pembaca = new FileReader();
    pembaca.addEventListener('load', () => {
      const img = new Image();
      img.addEventListener('load', () => {
        const skala = Math.min(1, maksSisi / Math.max(img.width, img.height));
        const kanvas = document.createElement('canvas');
        kanvas.width = Math.round(img.width * skala);
        kanvas.height = Math.round(img.height * skala);
        const ctx = kanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, kanvas.width, kanvas.height);
        ctx.drawImage(img, 0, 0, kanvas.width, kanvas.height);
        resolve(kanvas.toDataURL('image/jpeg', kualitas));
      });
      img.addEventListener('error', () => reject(new Error('File gambar tidak dapat dibaca.')));
      img.src = pembaca.result;
    });
    pembaca.addEventListener('error', () => reject(pembaca.error));
    pembaca.readAsDataURL(file);
  });
}

/* ---------- Gambar cadangan bila foto gedung belum dipasang ---------- */
function aturGambarCadangan() {
  document.querySelectorAll('img[data-cadangan]').forEach(img => {
    const tandai = () => img.closest('figure').classList.add('img-missing');
    if (img.complete && img.naturalWidth === 0) tandai();
    img.addEventListener('error', tandai);
  });
}

/* ---------- Inisialisasi setiap halaman ---------- */
aturTombolTema();
App.user = jalankanProteksi();
if (App.user) {
  renderNavbar();
  terapkanAksesElemen();
}
aturGambarCadangan();
document.querySelectorAll('.tahun-ini').forEach(el => { el.textContent = new Date().getFullYear(); });
