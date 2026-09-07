/* ==========================================================================
   KURULUM AYARLARI

   Sunucu adresleri ve açma/kapama anahtarları. Bunlar da yeni firmada
   doldurulacak ama MARKA DEĞİL, kurulum ayarı: aynı firma için test ve
   canlı ortamda farklı olabiliyorlar.

   Firmanın kimliği — adı, unvanı, iletişimi, logosu, renkleri, banka
   hesapları — burada değil, `src/marka/` içinde
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
