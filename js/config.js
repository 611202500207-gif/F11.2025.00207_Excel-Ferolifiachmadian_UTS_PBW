/* config.js - Pengaturan aplikasi SIGAP
   Ubah nilai di sini tanpa perlu menyentuh file JavaScript lain. */
const CONFIG = {
  namaAplikasi: 'SIGAP RSUD Kilisuci',

  // Target waktu respons (Service Level Agreement) dalam menit
  SLA: {
    Kritis: { menit: 15, warna: 'Merah' },
    Sedang: { menit: 30, warna: 'Kuning' },
    Ringan: { menit: 60, warna: 'Hijau' }
  },

  // Jabatan yang otomatis menerima notifikasi WhatsApp saat aduan KRITIS (SLA Merah)
  jabatanPenerimaNotifikasi: ['Direktur', 'Kepala Bidang'],

  // Gateway WhatsApp (opsional). Default: nonaktif -> memakai tautan wa.me.
  // Untuk kirim otomatis tanpa klik, daftar di layanan gateway (contoh: Fonnte),
  // isi token, lalu ubah aktif menjadi true.
  // PERINGATAN: token yang ditaruh di JavaScript sisi klien bisa dilihat siapa pun.
  // Untuk produksi, pindahkan pengiriman ke server/backend.
  WA_GATEWAY: {
    aktif: false,
    url: 'https://api.fonnte.com/send',
    token: ''
  },

  // Batas ukuran foto bukti (byte) -> 2 MB
  maksUkuranFoto: 2 * 1024 * 1024
};
