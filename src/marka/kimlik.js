/* ==========================================================================
   FİRMA KİMLİĞİ

   Bu klasördeki her şey FİRMAYA AİT. Başka bir üretici bu paketi
   kullanacaksa değiştireceği yer burası; motorun geri kalanına
   dokunmuyor (bkz. MARKA-DEVIR.md).

   Bu dosya kimliği tutuyor: şirketin adı, unvanı, iletişim bilgileri,
   garanti süresi, banka hesapları, ihracat adresleri.

   BURADA OLMAYANLAR

   Sunucu adresleri ve açma/kapama anahtarları `src/config.js` içinde.
   Onlar da yeni firmada doldurulacak ama marka değil, kurulum ayarı:
   aynı firma için test ve canlı ortamlarda farklı olabiliyorlar.
   ========================================================================== */

/* Uygulamanın adı — telefonun ekranında ikonun altında yazan ad da bu.
   Şirket adından ayrı tutuluyor: şirket "PAKSAN Makina", uygulama
   "PAKSAN Connect". Ad değişirse üç yerde birden değişmeli:
   burası, capacitor.config.json ve android/.../values/strings.xml */
export const UYGULAMA = 'PAKSAN Connect'

export const SURUM = '0.9.17'

/* Müşteriye gönderilen indirme adresi.

   Servis, uygulamayı kullanmayan bir müşteri için talep açtığında ona
   SMS ile bu adresi yollayabiliyor (bkz. src/servis/ekranlar/ElleKayit.jsx).

   Adres uygulama kimliğinden çıkıyor ve kimlik sabit: mağazaya bir kez
   yüklendikten sonra `com.paksanmakina.app` değiştirilemiyor. Yayına
   çıkılana kadar bu adres açılmıyor — denemede boş sayfa görünmesi
   normal. */
export const INDIRME_ADRESI =
  'https://play.google.com/store/apps/details?id=com.paksanmakina.app'

/* Şirket bilgileri — adres ve telefonlar paksanmakina.com.tr'den,
   resmî unvan şirketten alındı. `unvan` KVKK metninde veri sorumlusu
   olarak kullanılıyor; `ad` ekranlarda görünen kısa addır. */
export const SIRKET = {
  ad: 'PAKSAN Makina',
  unvan: 'PAKSAN MAKİNA SANAYİ VE TİCARET A.Ş.',

  /* Ekran metinlerinde geçen kısa marka adı: "PAKSAN Ara",
     "PAKSAN Duyurusu", "en yakın PAKSAN bayisi". Uzun ad cümleye
     sığmıyor — "PAKSAN Makina Ara" kulağı tırmalıyor.

     Sözlükte `{marka}` yer tutucusuyla kullanılıyor ve değer
     kendiliğinden yerine geçiyor (bkz. src/i18n/index.jsx). */
  kisaAd: 'PAKSAN',

  telefon: '444 9 725',
  telefonHam: '4449725',
  telefon2: '+90 266 733 90 90',
  telefon2Ham: '+902667339090',
  faks: '+90 266 733 90 99',
  eposta: 'paksan@paksanmakina.com.tr',
  site: 'https://www.paksanmakina.com.tr',
  /* Metin içinde okunan hâli — "paksanmakina.com.tr adresindeki ürün
     sayfalarından alınmıştır". Adresin başındaki https://, cümlede
     tuhaf duruyor. */
  siteKisa: 'paksanmakina.com.tr',

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

   İhracat yapmayan bir firma için `aktif: false` yeterli; ekranlarda
   başka bir iş kalmıyor.

   ⚠ BUGÜN KAPALI — 12 Eylül 2026. İki ucu birden eksikti: `epostalar`
     listesi boş ve `SUNUCU.ihracatEndpoint` boş. Açıkken yol şu hale
     geliyordu: yurtdışındaki müşteri talebini açıyor, uygulama
     "alındı" diyor, talep backoffice’ten gizleniyor ve gidecek bir
     e-posta adresi de olmadığı için kayıt YALNIZ O TELEFONDA kalıyor.
     Kimseye ulaşmayan bir talebi alınmış göstermek, hiç açılmamasından
     kötü: müşteri bekliyor, PAKSAN beklediğini bilmiyor.

     Kapalıyken yurtdışı talebi ayrı yola çıkmıyor, İÇ TALEP GİBİ
     İŞLİYOR: backoffice’e düşüyor ve PAKSAN görüyor. Servis talebinde
     makineye servis atanmamışsa ekran zaten "servisiniz henüz
     atanmadı" deyip PAKSAN’ı aramayı öneriyor (bkz. talep.servisYok).

     AÇMAK İÇİN İKİSİ BİRDEN GEREKİR: gerçek ihracat ekibi adresleri
     aşağıdaki listeye, gönderimi yapacak adres de
     `src/config.js` → `SUNUCU.ihracatEndpoint` alanına yazılacak.
     Biri eksikse kapalı kalmalı.
   ========================================================================== */
export const IHRACAT = {
  aktif: false,

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
