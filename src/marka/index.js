/* ==========================================================================
   MARKA KATMANI — motorun gördüğü tek kapı

   Bu paket bir firmaya özel yazılmadı: seri numaralı makine, garanti,
   servis, yedek parça, servis ağı ve duyuru üzerine kurulu genel bir
   altyapı. Firmaya ait olan her şey `src/marka/` içinde duruyor.

   MOTOR BU KLASÖRÜN İÇİNE BAKMIYOR

   Ekranlar ve kütüphaneler `from '../marka'` yazıyor, asla
   `from '../marka/kimlik'` değil. Böylece marka klasörünün iç düzeni
   değiştiğinde motor dosyalarına dokunulmuyor: yeni firma, dosyaları
   kendi bildiği gibi bölebiliyor; dışarıya aynı adları verdiği sürece
   uygulama çalışıyor.

   TEK İSTİSNA: `src/marka/icerik/`

   Arıza bilgi tabanı, teknik özellikler ve kılavuz paketi ağır
   dosyalar — kılavuz paketi tek başına 1,7 MB. Bu kapıdan verilselerdi
   `../marka` yazan HER dosya onları da paketine çekerdi; servis paneli
   arıza bilgi tabanını hiç kullanmadığı hâlde taşırdı.

   Onlar bu yüzden doğrudan import ediliyor ve bunu yapan yalnız
   birkaç ekran var: içeriğin çizildiği yer. Kural `npm run dogrula`
   ile denetleniyor — `icerik/` dışında derinden içe aktarma yapan bir
   dosya kalırsa kontrol başarısız oluyor.

   YENİ FİRMA NE DOLDURACAK

   Ayrıntısı MARKA-DEVIR.md içinde. Özet: Kimlik, logo, renkler, ürün
   kataloğu ve servis listesi zorunlu; teknik özellikler, arıza bilgi
   tabanı, kılavuzlar ve fiyat listeleri olmadan da uygulama çalışıyor,
   ilgili ekranlar boş görünüyor.
   ========================================================================== */

/* ------------------------------------------------------------- Kimlik */

export {
  SIRKET, UYGULAMA, SURUM, INDIRME_ADRESI, BANKA, IHRACAT,
} from './kimlik.js'

/* Ekran metinlerinde geçen kısa marka adı ve Türkçe ekleri.

   "PAKSAN’a Sipariş Ver" gibi bir başlıkta adı değişkene almak
   yetmiyor: Türkçede ek, adın son ünlüsüne göre değişiyor ve sabit
   yazılan ek yeni firmada bozuluyor ("ACME’a"). Ek bu yüzden
   hesaplanıyor — gerekçesi ve sınırı ad.js içinde. */
export { MARKA, markaEk, uygulamaEk } from './ad.js'

/* -------------------------------------------------------- Marka işareti */

export { Logo, Rozet, RozetMini, Amblem } from './logo.jsx'

/* Logo dosyasının kendisi.

   Backoffice, logoyu CSS ile boyutlandırılan düz bir `<img>` olarak
   kullanıyor (`.yan__marka img`, `.giris__logo`); bileşen kendi
   ölçüsünü satır içinde yazdığı için orada işe yaramıyor. Dosya yolu
   marka klasörünün içinde kalsın diye kapıdan veriliyor — Backoffice,
   doğrudan varlık klasörüne giriyordu. */
export { default as LOGO_DOSYASI } from './varliklar/paksan-logo.png'

/* Amblemin dosyası: Servisim'in servis formu PDF'i onu tuvale çiziyor
   (bkz. servis/servisFormu.js). Logo dosyası 225 piksel; A4'te
   bulanıklaşıyordu, amblem 192 piksel ve formun başındaki yere
   yetiyor — basılı formda da amblemin yanında unvan yazıyor. */
export { default as AMBLEM_DOSYASI } from './varliklar/paksan-amblem.png'

/* ------------------------------------------------------- Ürün kataloğu */

export {
  CATEGORIES, PRODUCTS, VITRIN, siralanmisUrunler, kilavuzSirasiyla,
  getProduct, getCategory, productsByCategory,
  urunDilde, kategoriDilde, supportGroup,
} from './katalog/products.js'

export { URUN_GORSELI, KATEGORI_GORSELI, urunGorseli } from './katalog/gorseller.js'

/* ------------------------------------------------------------- Fiyatlar */

export {
  PARA_BIRIMI, PARA_SIMGESI, KDV_ORANI, KDV_HARIC_LISTE, kdvTutari, paraYaz,
} from './katalog/para.js'

/* Parça grubu → makine ailesi köprüsü. Gerçek katalogda makine alanı
   yok; eşleme PAKSAN'ın grup adlarından çıkarılıyor. */
export {
  PARCA_GRUBU_AILESI, PARCASIZ_AILELER,
  eslenmemisGruplar, artikOlmayanGruplar,
} from './katalog/parcaGruplari.js'

export { PARCA_SERVIS_ISKONTO } from './katalog/makineFiyat.js'

/* --------------------------------------------------------------- Servisler */

export {
  SERVIS_TURU, SERVISLER, servisleriGetir, servisGetir,
  ileGore, bolgeKapsiyorMu, talebinServisleri, bayininServisleri,
} from './katalog/servisler.js'

/* Bayi ayrı bir varlık: makineyi satan taraf. Kaydı var, paneli yok
   (bkz. katalog/bayiler.js). */
export {
  BAYILER, bayileriGetir, bayiGetir, bayiAdi, bayiIleGore,
} from './katalog/bayiler.js'
