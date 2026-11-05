/* =========================================================
   db.js - "Database" sederhana SIGAP berbasis localStorage
   Semua data (akun, aduan, sesi login) disimpan di browser
   dalam format JSON. Tidak membutuhkan server/database.
   ========================================================= */

// Nama kunci penyimpanan di localStorage
const KUNCI = {
  pengguna: 'sigap_pengguna',
  aduan: 'sigap_aduan',
  sesi: 'sigap_sesi',
  tema: 'sigap_tema',
  seed: 'sigap_seed_v1'
};

// Daftar pilihan yang dipakai di banyak halaman
const DAFTAR_UNIT = ['IGD', 'Farmasi', 'Laboratorium', 'Radiologi', 'Kasir', 'Rekam Medis',
  'Poli Anak', 'Poli Penyakit Dalam', 'Poli Orthopedi', 'Poli Bedah', 'Poli Obgyn',
  'R. Darmawangsa', 'R. Kertanegara', 'R. Chandra Tunggadewi', 'R. Airlangga',
  'IBS', 'IPI', 'Security'];

const DAFTAR_UNIT_KERJA = ['Humas & Pengaduan', 'Direksi', 'Bidang Pelayanan Medis',
  'Bidang Keperawatan', 'Bagian Umum & Keuangan', ...DAFTAR_UNIT];

const DAFTAR_JABATAN = ['Direktur', 'Kepala Bidang', 'Kepala Bagian', 'Kepala Ruangan',
  'Subkoordinator', 'Tim SIGAP', 'Petugas Pengaduan / Humas', 'Staf Unit'];

const DAFTAR_ROLE = ['Admin', 'Kepala', 'Petugas', 'User'];

// Hak akses tiap role (dipakai oleh semua halaman)
const HAK_AKSES = {
  Admin: { buatAduan: true, respon: true, selesai: true, hapus: true, kelolaAkun: true },
  Kepala: { buatAduan: true, respon: true, selesai: true, hapus: false, kelolaAkun: false },
  Petugas: { buatAduan: true, respon: true, selesai: true, hapus: false, kelolaAkun: false },
  User: { buatAduan: true, respon: false, selesai: false, hapus: false, kelolaAkun: false }
};

/* Saran role berdasarkan jabatan.
   Role sebenarnya tetap ditentukan Admin di halaman Profil. */
function saranRole(jabatan) {
  if (jabatan === 'Direktur' || jabatan === 'Kepala Bidang') return 'Kepala';
  if (['Kepala Bagian', 'Kepala Ruangan', 'Subkoordinator', 'Tim SIGAP',
    'Petugas Pengaduan / Humas'].includes(jabatan)) return 'Petugas';
  return 'User';
}

/* ---------- SHA-256 sederhana untuk menyamarkan password ----------
   Password tidak disimpan dalam bentuk asli. Fungsi ini ditulis
   manual agar tetap berjalan walau dibuka lewat file:// atau HTTP. */
function sha256(teks) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const data = new TextEncoder().encode(teks);
  const panjang = Math.ceil((data.length + 9) / 64) * 64;
  const buf = new Uint8Array(panjang);
  buf.set(data);
  buf[data.length] = 0x80;
  const view = new DataView(buf.buffer);
  const bit = data.length * 8;
  view.setUint32(panjang - 8, Math.floor(bit / 0x100000000));
  view.setUint32(panjang - 4, bit >>> 0);
  const W = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < panjang; i += 64) {
    for (let t = 0; t < 16; t++) W[t] = view.getUint32(i + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + W[t]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H = [H[0] + a, H[1] + b, H[2] + c, H[3] + d, H[4] + e, H[5] + f, H[6] + g, H[7] + h].map(x => x >>> 0);
  }
  return H.map(x => x.toString(16).padStart(8, '0')).join('');
}

function hashPassword(password) {
  return sha256('sigap-kilisuci:' + password);
}

/* ---------- Objek DB: semua operasi baca/tulis data ---------- */
const DB = {
  baca(kunci, bawaan) {
    try {
      const nilai = localStorage.getItem(kunci);
      return nilai ? JSON.parse(nilai) : bawaan;
    } catch (err) {
      console.error('Gagal membaca data', err);
      return bawaan;
    }
  },

  simpan(kunci, nilai) {
    try {
      localStorage.setItem(kunci, JSON.stringify(nilai));
    } catch (err) {
      if (err.name === 'QuotaExceededError') {
        throw new Error('Penyimpanan browser penuh. Hapus aduan lama atau gunakan foto yang lebih kecil.');
      }
      throw err;
    }
  },

  /* ----- Pengguna / akun ----- */
  semuaPengguna() {
    return this.baca(KUNCI.pengguna, []);
  },

  cariPenggunaEmail(email) {
    const target = email.trim().toLowerCase();
    return this.semuaPengguna().find(u => u.email.toLowerCase() === target) || null;
  },

  tambahPengguna(data) {
    const daftar = this.semuaPengguna();
    const akun = {
      id: 'USR-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nama: data.nama.trim(),
      unitKerja: data.unitKerja,
      jabatan: data.jabatan,
      telp: data.telp.trim(),
      email: data.email.trim().toLowerCase(),
      passwordHash: hashPassword(data.password),
      role: data.role || 'User',
      foto: null,
      dibuat: Date.now()
    };
    daftar.push(akun);
    this.simpan(KUNCI.pengguna, daftar);
    return akun;
  },

  perbaruiPengguna(id, perubahan) {
    const daftar = this.semuaPengguna();
    const i = daftar.findIndex(u => u.id === id);
    if (i === -1) return null;
    daftar[i] = { ...daftar[i], ...perubahan };
    this.simpan(KUNCI.pengguna, daftar);
    return daftar[i];
  },

  hapusPengguna(id) {
    this.simpan(KUNCI.pengguna, this.semuaPengguna().filter(u => u.id !== id));
  },

  /* ----- Sesi login ----- */
  login(email, password) {
    const akun = this.cariPenggunaEmail(email);
    if (!akun || akun.passwordHash !== hashPassword(password)) return null;
    this.simpan(KUNCI.sesi, { userId: akun.id, waktuLogin: Date.now() });
    return akun;
  },

  logout() {
    localStorage.removeItem(KUNCI.sesi);
  },

  penggunaAktif() {
    const sesi = this.baca(KUNCI.sesi, null);
    if (!sesi) return null;
    return this.semuaPengguna().find(u => u.id === sesi.userId) || null;
  },

  // Penerima notifikasi WA untuk aduan Kritis (Direktur & Kepala Bidang)
  penerimaNotifikasi() {
    return this.semuaPengguna().filter(u =>
      CONFIG.jabatanPenerimaNotifikasi.includes(u.jabatan) && u.telp);
  },

  /* ----- Aduan ----- */
  semuaAduan() {
    return this.baca(KUNCI.aduan, []);
  },

  cariAduan(id) {
    return this.semuaAduan().find(a => a.id === id) || null;
  },

  tambahAduan(aduan) {
    const daftar = this.semuaAduan();
    daftar.unshift(aduan);
    this.simpan(KUNCI.aduan, daftar);
    return aduan;
  },

  perbaruiAduan(id, perubahan) {
    const daftar = this.semuaAduan();
    const i = daftar.findIndex(a => a.id === id);
    if (i === -1) return null;
    daftar[i] = { ...daftar[i], ...perubahan };
    this.simpan(KUNCI.aduan, daftar);
    return daftar[i];
  },

  hapusAduan(id) {
    this.simpan(KUNCI.aduan, this.semuaAduan().filter(a => a.id !== id));
  },

  // Nomor aduan otomatis, contoh: ADU-20261102-003
  nomorAduanBaru() {
    const d = new Date();
    const tgl = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    // ambil nomor urut terbesar hari ini lalu tambah 1 (aman walau ada aduan yang dihapus)
    const urutan = this.semuaAduan()
      .filter(a => a.nomor.includes(tgl))
      .reduce((maks, a) => Math.max(maks, parseInt(a.nomor.split('-')[2], 10) || 0), 0) + 1;
    return `ADU-${tgl}-${String(urutan).padStart(3, '0')}`;
  },

  resetDemo() {
    [KUNCI.pengguna, KUNCI.aduan, KUNCI.seed].forEach(k => localStorage.removeItem(k));
    isiDataAwal();
  }
};

/* ---------- Status SLA sebuah aduan ----------
   Menghasilkan: aman / mendekati / lewat (belum direspon)
   atau tepat / terlambat (sudah direspon). */
function statusSLA(aduan, sekarang = Date.now()) {
  const batas = aduan.dibuat + aduan.slaMenit * 60000;
  if (aduan.respon) {
    const tepat = aduan.respon.waktu <= batas;
    return { kode: tepat ? 'tepat' : 'terlambat', label: tepat ? 'Tepat Waktu' : 'Terlambat', batas };
  }
  const sisa = batas - sekarang;
  if (sisa < 0) return { kode: 'lewat', label: 'Melewati SLA', batas, sisa };
  if (sisa <= aduan.slaMenit * 60000 * 0.3) return { kode: 'mendekati', label: 'Mendekati batas', batas, sisa };
  return { kode: 'aman', label: 'Dalam SLA', batas, sisa };
}

/* ---------- Data awal (akun demo & contoh aduan) ----------
   Hanya dijalankan sekali saat aplikasi pertama kali dibuka. */
function isiDataAwal() {
  if (localStorage.getItem(KUNCI.seed)) return;

  const akunDemo = [
    { nama: 'Administrator SIGAP', unitKerja: 'Humas & Pengaduan', jabatan: 'Tim SIGAP', telp: '081200000000', email: 'admin@sigap.test', password: 'admin123', role: 'Admin' },
    { nama: 'dr. Direktur RSUD', unitKerja: 'Direksi', jabatan: 'Direktur', telp: '081200000001', email: 'direktur@sigap.test', password: 'kepala123', role: 'Kepala' },
    { nama: 'Kepala Bidang Pelayanan', unitKerja: 'Bidang Pelayanan Medis', jabatan: 'Kepala Bidang', telp: '081200000002', email: 'kabid@sigap.test', password: 'kepala123', role: 'Kepala' },
    { nama: 'Petugas Pengaduan', unitKerja: 'Humas & Pengaduan', jabatan: 'Petugas Pengaduan / Humas', telp: '081200000003', email: 'petugas@sigap.test', password: 'petugas123', role: 'Petugas' },
    { nama: 'Staf Farmasi', unitKerja: 'Farmasi', jabatan: 'Staf Unit', telp: '081200000004', email: 'user@sigap.test', password: 'user123', role: 'User' }
  ];
  localStorage.removeItem(KUNCI.pengguna);
  const akun = akunDemo.map(a => DB.tambahPengguna(a));
  const petugas = akun[3];
  const kabid = akun[2];

  const MENIT = 60000;
  const kini = Date.now();
  const tgl = ms => {
    const d = new Date(ms);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const pencatat = { id: petugas.id, nama: petugas.nama, jabatan: petugas.jabatan };
  const responOleh = (u, waktu, catatan) => ({ olehId: u.id, oleh: u.nama, jabatan: u.jabatan, role: u.role, waktu, catatan });

  const contoh = [
    { nama: 'Keluarga Pasien IGD', sumber: 'Komentar Media Sosial', unit: 'IGD', prioritas: 'Kritis', kategori: 'Pelayanan Medis', deskripsi: 'Unggahan media sosial keluarga pasien tentang antrean IGD yang lama mulai ramai dikomentari warganet.', mundur: 6 },
    { nama: 'Ibu Sulastri', sumber: 'Telepon', unit: 'Laboratorium', prioritas: 'Ringan', kategori: 'Administrasi', deskripsi: 'Hasil laboratorium belum dikirim ke poli padahal sudah dijanjikan selesai pagi ini.', mundur: 20 },
    { nama: 'Bapak Hartono', sumber: 'WhatsApp Pengaduan', unit: 'Farmasi', prioritas: 'Sedang', kategori: 'Pelayanan Medis', deskripsi: 'Obat racikan menunggu lebih dari 2 jam tanpa informasi estimasi waktu.', mundur: 50, respon: 25, catatan: 'Kepala Instalasi Farmasi menghubungi keluarga dan memprioritaskan obat racikan.' },
    { nama: 'Sdr. Rizky', sumber: 'Lapor Mbak Wali 112', unit: 'R. Kertanegara', prioritas: 'Sedang', kategori: 'Keperawatan', deskripsi: 'Visite dokter terlambat sehingga keluarga pasien menunggu sejak pagi.', mundur: 1440, respon: 45, selesai: 120, catatan: 'Jadwal visite dikonfirmasi ulang dengan DPJP.' },
    { nama: 'Pengguna Google', sumber: 'Google Review', unit: 'R. Airlangga', prioritas: 'Ringan', kategori: 'Fasilitas / Sarana', deskripsi: 'AC di ruang rawat inap tidak dingin sejak dua hari lalu.', mundur: 2880, respon: 90, selesai: 300, catatan: 'IPSRS sudah memperbaiki unit AC.' },
    { nama: 'Ibu Wahyuni', sumber: 'Web Kilisuci', unit: 'Kasir', prioritas: 'Ringan', kategori: 'Administrasi', deskripsi: 'Antrean kasir lama dan nomor antrean tidak terlihat jelas.', mundur: 4320, respon: 35, selesai: 180, catatan: 'Layar antrean kasir sudah diperbaiki.' },
    { nama: 'Bapak Slamet', sumber: 'Aduan Langsung / Tatap Muka', unit: 'Poli Obgyn', prioritas: 'Kritis', kategori: 'Sikap Petugas', deskripsi: 'Pasien merasa tidak mendapat penjelasan yang cukup sebelum tindakan.', mundur: 5760, respon: 12, selesai: 90, catatan: 'Dilakukan mediasi bersama DPJP dan kepala ruangan.' }
  ];

  const daftar = contoh.map((c, i) => {
    const dibuat = kini - c.mundur * MENIT;
    const sla = CONFIG.SLA[c.prioritas].menit;
    const aduan = {
      id: 'ADN-demo-' + (i + 1),
      nomor: `ADU-${tgl(dibuat).replaceAll('-', '')}-${String(i + 1).padStart(3, '0')}`,
      namaPengadu: c.nama,
      emailPengadu: 'pengadu' + (i + 1) + '@contoh.id',
      noRM: i % 2 === 0 ? String(123450 + i) : '',
      jenisKelamin: i % 2 === 0 ? 'Perempuan' : 'Laki-laki',
      tanggal: tgl(dibuat),
      sumber: c.sumber,
      unit: c.unit,
      prioritas: c.prioritas,
      slaMenit: sla,
      kategori: c.kategori,
      deskripsi: c.deskripsi,
      foto: null,
      status: 'Menunggu Respon',
      dibuat,
      dicatatOleh: pencatat,
      respon: null,
      waktuResponMenit: null,
      selesai: null,
      notifikasi: []
    };
    if (c.respon) {
      aduan.respon = responOleh(kabid, dibuat + c.respon * MENIT, c.catatan);
      aduan.waktuResponMenit = c.respon;
      aduan.status = 'Direspon';
    }
    if (c.selesai) {
      aduan.selesai = { oleh: petugas.nama, jabatan: petugas.jabatan, waktu: dibuat + c.selesai * MENIT, catatan: 'Pengadu sudah dikonfirmasi.' };
      aduan.status = 'Selesai';
    }
    return aduan;
  });

  DB.simpan(KUNCI.aduan, daftar);
  localStorage.setItem(KUNCI.seed, '1');
}

isiDataAwal();
