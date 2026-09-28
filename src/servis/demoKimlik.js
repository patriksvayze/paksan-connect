/* ==========================================================================
   Demo APK'sının giriş bilgisi

   Ayrı ve küçük bir dosyada duruyor. Giriş ekranı bunu okuyor; demo
   kurulumunu (`demoKur.js`) oradan çağırmak, bütün demo üreticisini
   tarayıcı panelinin paketine de sokardı.
   ========================================================================== */

import { demoSurumuMu } from '../lib/demoSurumu'

/** Demo APK'sında açık olan servis hesabı. */
export const DEMO_HESAP = { kullanici: 'konya', sifre: '123456' }

/* Demo sürümü `data-demo="acik"` işaretini taşıyor (bkz. servis.html).
   Canlıya çıkarken o satır siliniyor; işaret gidince ne demo verisi
   kuruluyor ne de giriş alanları dolu geliyor.

   İşareti okuyan tek yer lib/demoSurumu.js (25 Eylül 2026): Connect de
   aynı işarete bağlanıyor (Makine Kaydet'teki örnek seri numaraları,
   kullanıcı sınaması O10) ve servis kodunu içe aktaramıyor. Bu ad,
   Servisim'deki çağıranlar değişmesin diye duruyor. */
export function demoAPKmi() {
  return demoSurumuMu()
}
