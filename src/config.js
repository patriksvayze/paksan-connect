/* ==========================================================================
   KURULUM AYARLARI

   Sunucu adresleri ve açma/kapama anahtarları. Bunlar da yeni firmada
   doldurulacak ama MARKA DEĞİL, kurulum ayarı: Aynı firma için test ve
   canlı ortamlarda farklı olabiliyorlar.

   Firmanın kimliği — adı, unvanı, iletişim bilgileri, logosu, renkleri,
   banka hesapları — burada değil, `src/marka/` içinde
   (bkz. MARKA-DEVIR.md).
   ========================================================================== */

export const AI = {
  /* Destek asistanını firmanın kendi yapay zekâ servisine bağlamak için
     bu bloğu doldurmak yeterli; başka hiçbir dosyaya dokunulmuyor. */
  aktif: false,

  /* Uygulamanın soru göndereceği adres.
     Örnek: 'https://destek.ornekfirma.com.tr/api/sor'

     ÖNEMLİ: API anahtarı ASLA uygulamanın içine konmaz. Anahtar
     firmanın sunucusunda durur; uygulama sadece bu adrese soru yollar. */
  endpoint: '',

  /* Cevap bu süre içinde gelmezse çevrimdışı yedeğe geçilir (milisaniye).
     Tarlada şebeke zayıf olabilir, bu yüzden kısa tutuldu. */
  zamanAsimi: 20000,

  /* İnternet yoksa veya servise ulaşılamazsa, cihaz üzerindeki
     temel arıza rehberiyle cevap verilsin mi? */
  cevrimdisiYedek: true,
}

/* ==========================================================================
   GİRİŞ

   Şu an sunucu yok (Aşama 2). Kayıt ve giriş yalnızca telefonun kendi
   hafızasında tutuluyor:

     · Kayıt  → bilgiler bu telefona yazılır, uygulama hemen açılır.
     · Giriş  → bu telefonda daha önce kayıt varsa numara eşleşince açılır.
                Başka bir telefondaki kayda buradan ulaşılamaz.

   Sunucu hazır olduğunda yapılacak tek şey: `sunucu` alanını true yapıp
   `endpoint` adresini yazmak. O zaman giriş, SMS doğrulama koduyla
   çalışacak ve müşteri telefonunu değiştirse de makineleri gelecek.
   Ekranlarda değişiklik gerekmiyor — bkz. src/lib/hesap.js
   ========================================================================== */
export const GIRIS = {
  sunucu: false,
  endpoint: '',
}

/* ==========================================================================
   YEDEK PARÇA KATALOĞU

   538 parça, 35 alt montaj, 2 MB görsel. UYGULAMANIN İÇİNDE DEĞİL ve
   olmayacak. Üç sebebi var:

     · Fiyatlar değişiyor. Gömülü liste ilk zamda yalan söylemeye
       başlar ve düzeltmenin tek yolu yeni sürüm yayınlamaktır.
     · APK şişer. Uygulamanın tamamı bugün 7 MB civarında.
     · Katalog PAKSAN'ın verisi, uygulamanın değil. Yeni liste
       geldiğinde sunucudaki dosya değişecek, telefondaki uygulama
       değil.

   Servis "Parça Seç" dediğinde liste ağdan çağrılıyor ve o oturum
   boyunca bellekte tutuluyor (bkz. src/lib/parcaKatalogu.js).

   BUGÜN SUNUCU YOK. Geliştirme sunucusu, depodaki `sunucu-taklidi/`
   klasörünü aşağıdaki adresten yayınlıyor; istek gerçekten ağdan
   gidiyor, yükleme ve hata ekranları gerçekten çalışıyor
   (bkz. vite.config.js → katalogSun).

   CANLIYA ÇIKARKEN `kok` alanına PAKSAN'ın sunucusundaki adres
   yazılacak. Sunucudan beklenen tek şey iki yol:

       <kok>/katalog.json
       <kok>/gorseller/<parça kodu>.webp
   ========================================================================== */
export const PARCA_KATALOG = {
  /* Göreli adres tarayıcıda ve geliştirmede çalışıyor. APK'da mutlak
     adres gerekiyor: telefonda uygulamanın kendi kökü sunucu değil. */
  kok: '/parca-katalogu',

  /* SUNUCU HIZINI TAKLİT EDEN GECİKME.

     Geliştirme sunucusu aynı makinede; istek 3-5 milisaniyede
     dönüyor ve yükleme göstergesi göz kırpması gibi geçiyor. Gerçek
     bir sunucudan 538 parçalık liste tarlada bundan uzun sürecek.
     Ekranın o durumu gerçekten göstermesi için araya gecikme
     konuyor.

     Sunucu açıldığında bu değer 0 yapılacak — taklit oradan sonra
     yalan olur. */
  taklitGecikme: 800,

  /* Cevap bu süre içinde gelmezse hata gösterilip yeniden denenebiliyor.
     Tarlada şebeke zayıf olabiliyor. */
  zamanAsimi: 20000,
}

/* ==========================================================================
   SUNUCU — talep gönderimi ve geri bildirim

   Şu an talepler yalnızca telefonun hafızasına yazılıyor; gönderim anlık
   olduğu için beklemeyi kimse fark etmiyor. Sunucu açıldığında talep
   internet üzerinden gidecek ve tarlada şebeke zayıfken bu birkaç
   saniye sürebilir.

   Ekranlar buna göre yazıldı: gönder düğmesine basıldığı andan cevap
   gelene kadar düğme "Gönderiliyor" durumunda kalıyor, ikinci kez
   basılamıyor; cevap gelmezse hata gösterilip aynı formdan tekrar
   denenebiliyor. Yani aşağıdaki adresleri doldurmak dışında ekranlarda
   bir iş kalmıyor.
   ========================================================================== */
export const SUNUCU = {
  aktif: false,

  /* Talep gönderimi — POST, JSON. Cevapta talep numarası beklenir:
     { "no": "SRV2508144821" } */
  talepEndpoint: '',

  /* Geri bildirim — POST, JSON. Cevabın içeriği önemli değil. */
  geriBildirimEndpoint: '',

  /* Yurtdışı talepleri buraya gidiyor: gövdede talebin kendisi ve
     hazır e-posta gövdesi var, sunucu yalnız yolluyor.
     { talep: {...}, eposta: { konu, alicilar, html, metin } } */
  ihracatEndpoint: '',

  /* Cevap bu süre içinde gelmezse hata gösterilir (milisaniye).
     Tarlada şebeke zayıf olabiliyor, bu yüzden geniş tutuldu. */
  zamanAsimi: 30000,
}
