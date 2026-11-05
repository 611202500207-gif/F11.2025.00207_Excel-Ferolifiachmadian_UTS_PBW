/* =========================================================
   tests/smoke.js - Uji otomatis singkat (smoke test) SIGAP
   Menjalankan alur utama di browser Chromium tanpa tampilan:
   login, validasi, simpan aduan Kritis, respon, selesai,
   hak akses, dan cek tidak ada gulir horizontal (375 & 1024 px).

   Cara pakai (sekali saja):  npm init -y
                              npm i -D playwright
                              npx playwright install chromium
   Jalankan Live Server dulu, lalu:
                              node tests/smoke.js http://127.0.0.1:5500/
   ========================================================= */
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://127.0.0.1:5500/';
let lulus = 0;
let gagal = 0;

function cek(nama, kondisi) {
  if (kondisi) { lulus++; console.log('  LULUS ', nama); } else { gagal++; console.log('  GAGAL ', nama); }
}

async function login(page, email, sandi) {
  await page.goto(BASE + 'login.html');
  await page.fill('#loginEmail', email);
  await page.fill('#loginPassword', sandi);
  await page.click('#formLogin button[type=submit]');
  await page.waitForURL('**/index.html');
}

const lebarBerlebih = page => page.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function ujiUkuran(browser, lebar, tinggi) {
  console.log(`\nUkuran layar ${lebar} px`);
  const context = await browser.newContext({ viewport: { width: lebar, height: tinggi } });
  const page = await context.newPage();
  const errorKonsol = [];
  page.on('pageerror', e => errorKonsol.push(e.message));
  page.on('dialog', d => d.accept());

  // mulai dari data bersih
  await page.goto(BASE + 'login.html');
  await page.evaluate(() => localStorage.clear());

  await page.goto(BASE + 'index.html');
  await page.waitForURL('**/login.html');
  cek('halaman terlindungi diarahkan ke login', true);

  await page.click('#formLogin button[type=submit]');
  cek('pesan error login kosong', (await page.textContent('#loginEmail-error')) === 'Email wajib diisi.');

  await login(page, 'petugas@sigap.test', 'petugas123');
  cek('Home tanpa gulir horizontal', (await lebarBerlebih(page)) <= 0);
  cek('statistik terisi data demo', Number(await page.textContent('#statTotal')) >= 7);

  // validasi formulir aduan
  await page.goto(BASE + 'aduan.html');
  await page.fill('#namaPengadu', '   ');
  await page.fill('#emailPengadu', 'salah@');
  await page.click('#btnSimpan');
  cek('nama berisi spasi ditolak', (await page.textContent('#namaPengadu-error')).includes('spasi'));
  cek('email tidak valid ditolak', (await page.textContent('#emailPengadu-error')).includes('tidak valid'));
  cek('Buat Aduan tanpa gulir horizontal', (await lebarBerlebih(page)) <= 0);

  // simpan aduan Kritis
  await page.fill('#namaPengadu', 'Pengadu Uji');
  await page.fill('#emailPengadu', 'uji@contoh.id');
  await page.selectOption('#sumberAduan', 'WhatsApp Pengaduan');
  await page.selectOption('#unitTerkait', 'IGD');
  await page.click('label[for=prioKritis]');
  await page.fill('#deskripsi', 'Uji otomatis: aduan kritis dari skrip smoke test.');
  await page.click('#btnSimpan');
  await page.waitForSelector('#modalNotifWA.show');
  cek('modal WA tampil dengan 2 penerima', (await page.locator('#daftarPenerimaWA li').count()) === 2);
  await page.click('#modalNotifWA .modal-footer button');
  cek('ringkasan memuat nama pengadu', (await page.textContent('#isiRingkasan')).includes('Pengadu Uji'));

  // respon lalu selesai
  await page.goto(BASE + 'data.html');
  const baris = page.locator('#tabelAduan tr', { hasText: 'Pengadu Uji' });
  await baris.locator('button[data-aksi=respon]').click();
  await page.fill('#catatanRespon', 'Sudah ditindaklanjuti oleh skrip uji.');
  await page.click('#formRespon button[type=submit]');
  await page.waitForTimeout(500);
  cek('status menjadi Direspon', (await baris.textContent()).includes('Direspon'));
  await baris.locator('button[data-aksi=selesai]').click();
  await page.click('#formSelesai button[type=submit]');
  await page.waitForTimeout(500);
  cek('status menjadi Selesai', (await baris.textContent()).includes('Selesai'));
  cek('Data tanpa gulir horizontal', (await lebarBerlebih(page)) <= 0);

  // tema gelap tersimpan antarhalaman
  await page.click('.btn-tema');
  await page.goto(BASE + 'profil.html');
  cek('tema gelap tersimpan', (await page.getAttribute('html', 'data-bs-theme')) === 'dark');
  cek('panel admin tersembunyi untuk Petugas', !(await page.isVisible('#panelAdmin')));

  // hak akses User
  await page.evaluate(() => localStorage.removeItem('sigap_sesi'));
  await login(page, 'user@sigap.test', 'user123');
  await page.goto(BASE + 'data.html');
  cek('User tidak punya tombol Respon', (await page.locator('button[data-aksi=respon]').count()) === 0);

  cek('tidak ada error JavaScript', errorKonsol.length === 0);
  if (errorKonsol.length) console.log(errorKonsol);
  await context.close();
}

(async () => {
  const browser = await chromium.launch();
  try {
    await ujiUkuran(browser, 1024, 768);
    await ujiUkuran(browser, 375, 812);
  } finally {
    await browser.close();
  }
  console.log(`\nHasil: ${lulus} lulus, ${gagal} gagal`);
  process.exit(gagal ? 1 : 0);
})();
