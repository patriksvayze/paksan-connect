/* ==========================================================================
   Demo APK'sının giriş bilgisi

   Ayrı ve küçük bir dosyada duruyor. Giriş ekranı bunu okuyor; demo
   kurulumunu (`demoKur.js`) oradan çağırmak, bütün demo üreticisini
   tarayıcı panelinin paketine de sokardı.
   ========================================================================== */

/** Demo APK'sında açık olan servis hesabı. */
export const DEMO_HESAP = { kullanici: 'konya', sifre: '123456' }

/* Telefona kurulan sürüm `data-giris="mobil"` işaretini taşıyor
   (bkz. servis-mobil.html). Tarayıcıdan açılan panelde bu işaret yok,
   demo verisi de kurulmuyor. */
export function demoAPKmi() {
  return document.documentElement.dataset.giris === 'mobil'
}
