/* ==========================================================================
   PAKSAN uygulaması — ayarlar

   Destek asistanını PAKSAN'ın kendi yapay zekâ servisine bağlamak için
   yalnızca aşağıdaki AI bloğunu doldurmak yeterli. Başka hiçbir dosyaya
   dokunmaya gerek yok.
   ========================================================================== */

export const AI = {
  /* PAKSAN LLM servisi hazır olduğunda true yapın */
  aktif: false,

  /* Uygulamanın soru göndereceği adres.
     Örnek: 'https://destek.paksanmakina.com.tr/api/sor'

     ÖNEMLİ: API anahtarı ASLA uygulamanın içine konmaz. Anahtar
     PAKSAN'ın sunucusunda durur; uygulama sadece bu adrese soru yollar. */
  endpoint: '',

  /* Cevap bu süre içinde gelmezse çevrimdışı yedeğe geçilir (milisaniye).
     Tarlada şebeke zayıf olabilir, bu yüzden kısa tutuldu. */
  zamanAsimi: 20000,

  /* İnternet yoksa veya servise ulaşılamazsa, cihaz üzerindeki
     temel arıza rehberiyle cevap verilsin mi? */
  cevrimdisiYedek: true,
}

/* Şirket bilgileri — adres ve telefonlar paksanmakina.com.tr'den,
   resmî unvan şirketten alındı. `unvan` KVKK metninde veri sorumlusu
   olarak kullanılıyor; `ad` ekranlarda görünen kısa addır. */
export const SURUM = '0.9.9'

/* Uygulamanın adı — telefonun ekranında ikonun altında yazan ad da bu.
   Şirket adından ayrı tutuluyor: şirket "PAKSAN Makina", uygulama
   "PAKSAN Connect". Ad değişirse üç yerde birden değişmeli:
   burası, capacitor.config.json ve android/.../values/strings.xml */
export const UYGULAMA = 'PAKSAN Connect'

export const SIRKET = {
  ad: 'PAKSAN Makina',
  unvan: 'PAKSAN MAKİNA SANAYİ VE TİCARET A.Ş.',

  telefon: '444 9 725',
  telefonHam: '4449725',
  telefon2: '+90 266 733 90 90',
  telefon2Ham: '+902667339090',
  faks: '+90 266 733 90 99',
  eposta: 'paksan@paksanmakina.com.tr',
  site: 'https://www.paksanmakina.com.tr',

  /* İki tesis var; KVKK metninde ikisi de yazılı */
  adres: 'Bandırma – Bursa Karayolu 10. km, Bandırma / Balıkesir',
  adres2: 'Taştepe, Deri Organize Sanayi Bölgesi, 10900 Gönen / Balıkesir',

  garantiYil: 2,

  /* Karşılama ekranında kullanılıyor */
  kurulus: 1970,
  slogan: 'Yarım asırlık tecrübe, geniş servis ağı, 6 kıtaya ihracat',
  kita: 6,
}

/* ==========================================================================
   İHRACAT — yurtdışından gelen talepler

   PAKSAN altı kıtaya ihracat yapıyor ve yurtdışındaki iş Türkiye'deki
   işten başka yürüyor: servisi yerel distribütör veriyor, parça
   gümrükten geçiyor, fiyat ihracat listesinden veriliyor.

   Bu yüzden konumu Türkiye dışında olan müşterinin talebi BACKOFFICE’E
   DÜŞMÜYOR; ihracat ekibinin e-postasına gidiyor ve kayda geçiyor
   (bkz. src/lib/ihracat.js).

   ⚠ E-POSTA ADRESLERİ DOLDURULMADI. Gerçek ihracat ekibi adresleri
     yazılmalı. Liste boşken talep yine işaretleniyor ve backoffice’ten
     gizleniyor, e-posta sunucu bağlanınca gidecek.
   ========================================================================== */
export const IHRACAT = {
  aktif: true,

  /* Talebin düşeceği adresler */
  epostalar: [
    // 'export@paksanmakina.com.tr',
  ],
}

/* ==========================================================================
   BANKA HESAPLARI — yedek parça ödemesi

   Müşteri yedek parça bedelini bu hesaplara gönderiyor ve dekontunu
   uygulamadan yüklüyor. Hesap bilgileri uygulamanın içinde duruyor:
   ödeme ekranı tarlada internetsiz de açılabilmeli, müşteri IBAN'ı
   görüp bankacılık uygulamasına geçebilmeli.

   ⚠ AŞAĞIDAKİ BİLGİLER DOLDURULMADI. Yayına çıkmadan önce PAKSAN
     muhasebesinden alınan gerçek IBAN'lar buraya yazılmalı. `aktif`
     false olduğu sürece ödeme ekranı IBAN göstermiyor, "hesap bilgisi
     için bizi arayın" diyor — yanlış IBAN göstermektense hiç
     göstermemek doğru.
   ========================================================================== */
export const BANKA = {
  aktif: false,

  /* Faturayı kesen tüzel kişi; dekontun açıklamasına da bu yazılıyor */
  unvan: 'PAKSAN MAKİNA SANAYİ VE TİCARET A.Ş.',

  /* Her satır: { banka, sube, iban } */
  hesaplar: [
    // { banka: '', sube: '', iban: 'TR00 0000 0000 0000 0000 0000 00' },
  ],

  /* Müşteri havale açıklamasına ne yazsın — talep numarası şart,
     yoksa muhasebe hangi ödemenin hangi talep olduğunu bulamıyor. */
  aciklamaKalibi: '{no} · {ad}',
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

/* ==========================================================================
   Sesli notun yazıya çevrilmesi

   Müşteri talebe sesli not bırakabiliyor. Ses kaydını dinlemek zaman
   alıyor, içinde arama yapılamıyor ve Excel'e çıkmıyor. Kayıt bir n8n
   akışına gönderilip yazıya çevriliyor.

   TALEBİ BEKLETMİYOR: talep her hâlükârda anında backoffice'e düşüyor,
   ses kaydı da yanında duruyor. Çeviri sonradan geliyor ve talebin
   üzerine ekleniyor. n8n'e ulaşılamazsa hiçbir şey bozulmuyor, yalnız
   metin gelmiyor.

     1  Uygulama  ──►  n8n webhook        ses kaydı + talep numarası
     2  n8n       ──►  Groq / Whisper     metne çeviriyor
     3  n8n       ──►  ses metni köprüsü  metni bırakıyor
     4  Backoffice ─►  köprü              metni alıp talebe işliyor

   3 ve 4 için `tools/ses-metin-sunucu.mjs` çalışıyor olmalı; kurulum ve
   n8n tarafında yapılacaklar o dosyanın başında yazılı.
   ========================================================================== */
export const SES_METIN = {
  /* Uygulamanın ses kaydını göndereceği n8n webhook adresi. Boşsa
     gönderim hiç denenmiyor.

     ŞU AN TEST ADRESİ. n8n'de akışın "Test workflow" düğmesine
     basıldığında dinlemeye başlıyor, tek bir isteği alıp duruyor.
     Akış yayına alındığında adresteki `webhook-test` bölümü `webhook`
     olacak — başka hiçbir yer değişmiyor.

     Bu adres bir gizli anahtar değil, APK'nın içinde açıkça duruyor.
     n8n akışına adresi bilen herkes ses dosyası gönderebilir. Yayına
     çıkarken akışın başına bir doğrulama (başlık anahtarı) koymak
     gerekiyor. */
  webhook: 'https://onbekimya.app.n8n.cloud/webhook-test/paksan/audio',

  /* Backoffice'in çevrilmiş metinleri toplayacağı adres. */
  kopru: 'http://localhost:5180/api/destek/ses-metni',

  /* Köprüye yazarken n8n'in kullanacağı paylaşılan anahtar. Boşsa
     anahtar sorulmuyor. */
  anahtar: '',
}
