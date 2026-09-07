/* ==========================================================================
   MARKA KATMANI — motorun gördüğü tek kapı

   Bu paket bir firmaya özel yazılmadı: seri numaralı makine, garanti,
   servis, yedek parça, bayi ağı ve duyuru üzerine kurulu genel bir
   altyapı. Firmaya ait olan her şey `src/marka/` içinde duruyor.

   MOTOR BU KLASÖRÜN İÇİNE BAKMIYOR

   Ekranlar ve kütüphaneler `from '../marka'` yazıyor, asla
   `from '../marka/kimlik'` değil. Böylece marka klasörünün iç düzeni
   değiştiğinde motor dosyalarına dokunulmuyor: yeni firma dosyaları
   kendi bildiği gibi bölebiliyor, dışarıya aynı adları verdiği sürece
   uygulama çalışıyor.

   Kural `npm run dogrula` ile denetleniyor; derinden import eden bir
   dosya kalırsa kontrol düşüyor.

   YENİ FİRMA NE DOLDURACAK

   Ayrıntısı MARKA-DEVIR.md içinde. Özet: kimlik, logo, renkler, ürün
   kataloğu ve bayi listesi zorunlu; teknik özellikler, arıza bilgi
   tabanı, kılavuzlar ve fiyat listeleri olmadan da uygulama çalışıyor,
   ilgili ekranlar boş görünüyor.
   ========================================================================== */

export {
  SIRKET, UYGULAMA, SURUM, INDIRME_ADRESI, BANKA, IHRACAT,
} from './kimlik.js'

export { Logo, Rozet, RozetMini, Amblem } from './logo.jsx'

/* Logo dosyasının kendisi.

   Backoffice logoyu CSS ile boyutlandırılan düz bir `<img>` olarak
   kullanıyor (`.yan__marka img`, `.giris__logo`); bileşen kendi
   ölçüsünü satır içi yazdığı için orada işe yaramıyor. Dosya yolu
   marka klasörünün içinde kalsın diye kapıdan veriliyor — Backoffice
   `../assets/marka/...` diye doğrudan giriyordu. */
export { default as LOGO_DOSYASI } from './varliklar/paksan-logo.png'
