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

   TEK İSTİSNA: `src/marka/icerik/`

   Arıza bilgi tabanı, teknik özellikler ve kılavuz paketi ağır
   dosyalar — kılavuz paketi tek başına 1,7 MB. Bu kapıdan verilselerdi
   `../marka` yazan HER dosya onları da paketine çekerdi; bayi paneli
   arıza bilgi tabanını hiç kullanmadığı hâlde taşırdı.

   Onlar bu yüzden doğrudan import ediliyor ve bunu yapan yalnız
   birkaç ekran var: içeriğin çizildiği yer. Kural `npm run dogrula`
   ile denetleniyor — `icerik/` dışında derinden import eden bir dosya
   kalırsa kontrol düşüyor.

   YENİ FİRMA NE DOLDURACAK

   Ayrıntısı MARKA-DEVIR.md içinde. Özet: kimlik, logo, renkler, ürün
   kataloğu ve bayi listesi zorunlu; teknik özellikler, arıza bilgi
   tabanı, kılavuzlar ve fiyat listeleri olmadan da uygulama çalışıyor,
   ilgili ekranlar boş görünüyor.
   ========================================================================== */

/* ------------------------------------------------------------- Kimlik */

export {
  SIRKET, UYGULAMA, SURUM, INDIRME_ADRESI, BANKA, IHRACAT,
} from './kimlik.js'

/* -------------------------------------------------------- Marka işareti */

export { Logo, Rozet, RozetMini, Amblem } from './logo.jsx'

/* Logo dosyasının kendisi.

   Backoffice logoyu CSS ile boyutlandırılan düz bir `<img>` olarak
   kullanıyor (`.yan__marka img`, `.giris__logo`); bileşen kendi
   ölçüsünü satır içi yazdığı için orada işe yaramıyor. Dosya yolu
   marka klasörünün içinde kalsın diye kapıdan veriliyor. */
export { default as LOGO_DOSYASI } from './varliklar/paksan-logo.png'

/* ------------------------------------------------------- Ürün kataloğu */

export {
  CATEGORIES, PRODUCTS, siralanmisUrunler, kilavuzSirasiyla,
  getProduct, getCategory, productsByCategory,
  urunDilde, kategoriDilde, supportGroup,
} from './katalog/products.js'

export { URUN_GORSELI, KATEGORI_GORSELI, urunGorseli } from './katalog/gorseller.js'

/* ------------------------------------------------------------- Fiyatlar */

export {
  PARCA_FIYAT_AKTIF, KDV_ORANI, PARA_BIRIMI, PARCA_FIYAT, FIYATSIZ,
  parcaFiyatBilgisi, fiyatliMi, parcaToplami, paraYaz,
} from './katalog/parcaFiyat.js'

export {
  MAKINE_FIYAT_AKTIF, BAYI_ISKONTO, PARCA_BAYI_ISKONTO,
  MAKINE_FIYAT, KAMPANYALAR,
} from './katalog/makineFiyat.js'

/* --------------------------------------------------------------- Bayiler */

export {
  YETKILER, yetkiAdi, BAYILER, mesafeKm, bayileriGetir,
  yakindanUzaga, ileGore, bolgeKapsiyorMu, talebinBayileri,
} from './katalog/bayiler.js'
