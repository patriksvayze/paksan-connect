/* ==========================================================================
   KURULUM AYARLARI

   Sunucu adresleri ve açma/kapama anahtarları. Test ve canlı
   ortamlarda farklı olabiliyorlar.

   Şirketin kimliği — unvanı, iletişim bilgileri, banka hesapları —
   burada değil, `src/data/kimlik.js` içinde.
   ========================================================================== */

/* ==========================================================================
   DESTEK ASİSTANI — uzaktan çağrılıyor

   Destek ekranı PAKSAN'ın kullanım kılavuzlarından cevap veren bir yapay
   zekâ asistanı. Asistanın HİÇBİR PARÇASI uygulamanın içinde değil ve
   olmayacak:

     · Kılavuzlar, arama indeksi ve dil modeli sunucuda duruyor. Yeni
       kılavuz eklendiğinde sunucudaki indeks yenileniyor; telefondaki
       uygulama güncellenmek zorunda kalmıyor.
     · Model ve indeks yüzlerce megabayt; APK'ya sığmaz.
     · Model erişimi ya da API anahtarı olursa o da sunucuda kalır.

   ÇEVRİMDIŞI YEDEK YOK. Burada bir dönem "internet yoksa cihazdaki arıza
   rehberiyle cevap ver" anahtarı vardı. Kaldırıldı: o rehber cihaza
   gömülü bir bilgi tabanı demekti. Bağlantı yoksa ekran bunu söylüyor ve
   servis talebine yönlendiriyor.

   BUGÜN SUNUCU YOK. Geliştirme sunucusu `/destek-ai` adresine gelen
   istekleri bu bilgisayardaki sohbet sunucusuna aktarıyor
   (bkz. vite.config.js → destekAsistaniSun; sunucu:
   D:/PAKSAN/paksan-rag/sohbet/sunucu.mjs). İstek gerçekten ağdan gidiyor.

   CANLIYA ÇIKARKEN `kok` alanına PAKSAN'ın sunucusundaki adres yazılacak.
   Sunucudan beklenen üç yol:

       POST <kok>/sohbet           soru → satır satır akan cevap (NDJSON)
       GET  <kok>/durum            yüklü kılavuzlar, model hazır mı
       GET  <kok>/kilavuz/<belge>  kaynak gösterilen kılavuzun PDF'i
   ========================================================================== */
/* DESTEK EKRANINDA HANGİSİ AÇILIYOR (29 Eylül 2026, kullanıcının isteği).

     'rehber'  → uygulamanın içindeki hazır arıza-çözüm ağacı
                 (screens/ArizaCozumu.jsx, içerik
                 data/icerik/destekVerisi.js). Sunucu istemiyor,
                 internetsiz de çalışıyor.
     'asistan' → yukarıda anlatılan, sunucudaki kılavuz asistanı
                 (screens/DestekAsistani.jsx).

   Kullanıcı Destek ekranının yönetime yapılacak sunumda "idareten
   çalışır" görünmesi için GEÇİCİ olarak ağaca dönmesini istedi: asistanın
   sunucusu ve ekran kartı henüz yok, kılavuzların yarısı eksik (bkz.
   DESTEK-EKRANI-PLANI.md). Asistan kodu yerinde duruyor; sunucu hazır
   olunca bu değer 'asistan' yapılıyor. Yukarıdaki "çevrimdışı yedek yok"
   kuralı asistan içindir: iki kip birbirinin yedeği değil, biri açık. */
export const DESTEK_KIPI = 'rehber'

export const AI = {
  /* Göreli adres tarayıcıda ve geliştirmede çalışıyor. APK'da mutlak
     adres gerekiyor (bkz. PARCA_KATALOG.kok). */
  kok: '/destek-ai',

  /* İKİ OLAY ARASINDA EN FAZLA BU KADAR BEKLENİR (milisaniye).

     Toplam süre değil: cevap parça parça akıyor ve her parça sayacı
     sıfırlıyor. İşlemcide çalışan model ilk kelimeyi yarım dakikada
     verebiliyor; toplam süreye sınır konsaydı uzun ama sağlıklı bir
     cevap yarıda kesilirdi.

     Sunucu ilk kelimeyi beklerken de 15 saniyede bir `durum` olayı
     gönderiyor (sohbet sunucusunda `LLM.nabizMs`). Bu değer ondan uzun
     kalmalı: 90 sn, art arda kaçan beş nabza pay bırakıyor. Sunucu
     değişirse bu nabız da sunucudan beklenenler listesinde
     (CANLIYA-CIKIS.md 2.1.1). */
  bekleme: 90000,
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
   KULLANIM KILAVUZLARI (29 Eylül 2026)

   Kılavuz, PAKSAN'ın basılı kullanım kılavuzunun PDF'i. UYGULAMANIN
   İÇİNDE DEĞİL: sunucuda kılavuzların durduğu bir klasörden okunuyor
   (kullanıcının kararı). Dört kılavuz 38 MB; uygulamaya gömülse APK dört
   katına çıkardı. Yeni baskı çıkınca sunucudaki dosya değişiyor,
   telefondaki uygulama değil.

   Çiftçi bir kılavuzu bir kez indiriyor; telefonda saklanıyor ve tarlada
   internetsiz de açılıyor (bkz. src/lib/kilavuzPdf.js). Önceki düzende
   kılavuzun içeriği uygulamaya gömülü bir veri paketinden ekran ekran
   kuruluyordu; kaldırıldı (bkz. CLAUDE.md, "kılavuz PDF").

   BUGÜN SUNUCU YOK. Geliştirme sunucusu depodaki
   `sunucu-taklidi/kilavuzlar/` klasörünü aşağıdaki adresten yayınlıyor
   (bkz. vite.config.js → kilavuzSun).

   CANLIYA ÇIKARKEN `kok` alanına sunucudaki klasörün adresi yazılacak
   (https; APK başka adresten dosya okuyacağı için sunucu CORS izni
   vermeli). Sunucudan beklenen iki yol:

       <kok>/kilavuzlar.json   hangi kılavuz hangi dosya, sayfa, boyut
       <kok>/<dosya>.pdf       kılavuzun kendisi
   ========================================================================== */
export const KILAVUZ = {
  /* Göreli adres tarayıcıda ve geliştirmede çalışıyor. APK'da mutlak
     adres gerekiyor (bkz. PARCA_KATALOG.kok). */
  kok: '/kilavuzlar',

  /* Liste bu süre içinde gelmezse kayıtlı son liste kullanılıyor. PDF
     indirmesine süre sınırı yok: 14 MB'lık kılavuz köyde dakikalar
     sürebilir, ekran ilerlemeyi gösteriyor ve vazgeçilebiliyor. */
  listeZamanAsimi: 15000,
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
