/* tema-init.js
   Dipanggil di <head> agar tema (terang/gelap) langsung diterapkan
   sebelum halaman tampil, sehingga layar tidak "berkedip". */
(function () {
  try {
    var tersimpan = localStorage.getItem('sigap_tema');
    var sukaGelap = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var tema = tersimpan || (sukaGelap ? 'dark' : 'light');
    document.documentElement.setAttribute('data-bs-theme', tema);
  } catch (e) {
    document.documentElement.setAttribute('data-bs-theme', 'light');
  }
})();
