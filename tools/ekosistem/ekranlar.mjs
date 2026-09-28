/* ==========================================================================
   Ekran envanteri — üç uygulamanın gezilebilir bütün yüzeyi

   Ekran turu bu listeyi geziyor. Liste DOSYA SAYARAK değil, gerçekten
   gidilebilen yerler sayılarak çıkarıldı: `src/backoffice/ekranlar/`
   altında 20 dosya var ama altısı yardımcı bileşen (ortak, suzgec,
   grafik, aktar, Ekler, rapor/), menüde 15 giriş duruyor.

   HER EKRANDA ÜÇ ŞEY SORULUYOR

     1. Boş mu açıldı?        gövdede yazı var mı
     2. Hata verdi mi?        yüklenmeden önce kurulan kanca ne yakaladı
     3. Beklenen değer var mı? `iz` verilmişse aranıyor

   `iz` YALNIZ EKİLEN DEĞER OLABİLİR — talep numarası, seri, tutar, ad.
   Ekrandaki kelimelere bakılmaz. 19 Eylül 2026 bunu gösterdi: o gün
   48 ekran metni Codex'ten geçip yeniden yazıldı, tur yine yeşil
   kaldı. Kelimeye bakan bir `iz` o gün topluca kırmızıya dönerdi.

   NASIL GİDİLİYOR

     Connect     `yol` — HashRouter adresi
     Backoffice  `menu` — kenar çubuğundaki sıra (MENU dizisinin sırası;
                 koddan gelir, çeviriden değil); ekranın içinde
                 kapalı bir kart varsa `tikla` ile seçici
     Servisim    `sekme` — alt çubuktaki sıra, artı `tikla` ile seçici

   Bir ekrana otomatik gidilemiyorsa listede `erisilemez` gerekçesiyle
   duruyor ve raporda AYRI SAYILIYOR. Sessizce atlanmıyor: kapsam
   iddiası ancak sayı doğruysa bir şey ifade eder.
   ========================================================================== */

/** Connect — giriş yapılmamış hâl. Oturum tohumlanmadan geziliyor. */
export const CONNECT_OTURUMSUZ = [
  { kod: 'C-01', ad: 'Karşılama', yol: '/' },
  { kod: 'C-02', ad: 'Kayıt Ol', yol: '/kayit' },
  { kod: 'C-03', ad: 'Giriş', yol: '/giris' },
  { kod: 'C-04', ad: 'Şifremi Unuttum', yol: '/sifremi-unuttum' },
]

/**
 * Connect — giriş yapılmış hâl.
 * `yol` içindeki `{...}` yer tutucuları tur çalışırken dolduruluyor.
 */
export const CONNECT = [
  /* Ana sayfada müşterinin TAM adı geçmiyor, yalnız ilk adı
     ("Merhaba Ahmet"). Ekili seri numarası ana sayfanın makine
     kartında basılı.

     SERVİS ADI ARTIK AŞAĞIDAKİ C-26'DA (22 Eylül 2026): servis kartları
     ana sayfadan Makinelerim ekranının Servislerim sekmesine taşındı
     (kullanıcının isteği). "Makine → bayi → servis zincirinin sonucu
     müşteriye çiziliyor mu" iddiası o sekmeyle birlikte oraya geçti. */
  { kod: 'C-05', ad: 'Ana Sayfa', yol: '/', iz: 'seri' },
  { kod: 'C-06', ad: 'Makinelerim', yol: '/makinelerim', iz: 'seri' },
  { kod: 'C-26', ad: 'Makinelerim · Servislerim', yol: '/makinelerim?sekme=servisler', iz: 'servisAdi' },
  { kod: 'C-07', ad: 'Makine Ekle', yol: '/makine-ekle' },
  { kod: 'C-08', ad: 'Makine Detayı', yol: '/makine/{makineId}', iz: 'seri' },
  { kod: 'C-09', ad: 'Destek', yol: '/destek' },
  { kod: 'C-10', ad: 'Ürünler', yol: '/urunler' },
  { kod: 'C-11', ad: 'Ürün Detayı', yol: '/urun/{urunId}' },
  { kod: 'C-12', ad: 'Kılavuzlar', yol: '/kilavuzlar' },
  { kod: 'C-13', ad: 'Güvenlik Kuralları', yol: '/kilavuzlar/guvenlik' },
  { kod: 'C-14', ad: 'Kılavuz', yol: '/kilavuz/{urunId}' },
  { kod: 'C-15', ad: 'Servis Talebi Formu', yol: '/talep?tur=servis' },
  { kod: 'C-16', ad: 'Yedek Parça Talebi Formu', yol: '/talep?tur=parca' },
  { kod: 'C-17', ad: 'Fiyat Teklifi Formu', yol: '/talep?tur=satinalma' },
  { kod: 'C-18', ad: 'Talep Detayı', yol: '/talebim/{talepId}', iz: 'talepNo' },
  { kod: 'C-19', ad: 'Profil', yol: '/profil', iz: 'musteriAdi' },
  { kod: 'C-20', ad: 'Bildirimler', yol: '/bildirimler' },
  { kod: 'C-21', ad: 'Bayi ve İletişim', yol: '/bayiler' },
  { kod: 'C-22', ad: 'Bakım Rehberleri', yol: '/bakim' },
  { kod: 'C-23', ad: 'Bakım Rehberi', yol: '/bakim/{rehberId}' },
  { kod: 'C-24', ad: 'Numara Değişikliği', yol: '/numara-degisikligi' },
  { kod: 'C-25', ad: 'Bulunamayan Adres', yol: '/boyle-bir-ekran-yok' },
  /* 25 Eylül 2026 (kullanıcı sınaması): talepler Profil'den kendi
     ekranına taşındı; turun onay bekleyen servis talebi "Açık"
     sekmesinde. */
  { kod: 'C-27', ad: 'Taleplerim', yol: '/taleplerim', iz: 'talepNo' },
  /* Aynı talep detayı, ikinci iz: servisin geleceği adres (çiftçinin
     formda yazdığı adres görünmüyordu). */
  { kod: 'C-28', ad: 'Talep Detayı · Servisin geleceği adres', yol: '/talebim/{talepId}', iz: 'servisAdresi' },
]

/** Backoffice — giriş ekranı, oturum tohumlanmadan. */
export const BACKOFFICE_OTURUMSUZ = [{ kod: 'B-00', ad: 'Personel Girişi', menu: null }]

/**
 * Backoffice — kenar çubuğundaki sıra.
 * Admin bütün menüyü gördüğü için sıra MENU dizisinin sırasıyla birebir.
 * Menüye yeni satır eklenirse tur yüksek sesle düşer; sessizce kaymaz.
 */
export const BACKOFFICE = [
  { kod: 'B-01', ad: 'Dashboard', menu: 0 },
  { kod: 'B-02', ad: 'Talepler', menu: 1, iz: 'talepNo' },
  { kod: 'B-03', ad: 'Müşteriler', menu: 2, iz: 'musteriAdi' },
  { kod: 'B-04', ad: 'Kayıtlı Makineler', menu: 3, iz: 'seri' },
  { kod: 'B-05', ad: 'Servisler', menu: 4, iz: 'servisAdi' },
  { kod: 'B-06', ad: 'Bayiler', menu: 5 },
  /* 23 Eylül 2026: servise özel iskonto kartı bu ekranda. Kart kapalı
     açılıyor; tur önce başlığına basıyor (`tikla`). */
  { kod: 'B-07', ad: 'Yedek Parça Kataloğu', menu: 6, iz: 'iskontoOrani', tikla: '.acilir-tepe__dugme' },
  { kod: 'B-08', ad: 'Geri Bildirimler', menu: 7 },
  { kod: 'B-09', ad: 'Raporlar', menu: 8 },
  { kod: 'B-10', ad: 'Destek Kayıtları', menu: 9 },
  { kod: 'B-11', ad: 'Duyurular', menu: 10 },
  { kod: 'B-12', ad: 'Numara Değişikliği Talepleri', menu: 11 },
  { kod: 'B-13', ad: 'Personel', menu: 12 },
  { kod: 'B-14', ad: 'Roller ve Yetkiler', menu: 13 },
  { kod: 'B-15', ad: 'İşlem Kaydı', menu: 14 },
  /* Aynı Servisler ekranı, ikinci iz: servisin özel saat ücreti listenin
     "Ücret" sütununda (23 Eylül 2026). Menü sırası değişmedi. */
  { kod: 'B-16', ad: 'Servisler · Hizmet Ücreti', menu: 4, iz: 'saatUcreti' },
]

/** Servisim — giriş ekranı, oturum tohumlanmadan. */
export const SERVISIM_OTURUMSUZ = [{ kod: 'S-00', ad: 'Servis Girişi', tikla: null }]

/**
 * Servisim — alt çubuk sekmeleri ve onlardan açılan ekranlar.
 * `sekme` alt çubuktaki sıra, `tikla` ise o sekmedeyken basılacak seçici.
 * `.uyg__fab` yüzen düğme, `.uyg__hesap` başlıktaki hesap harfi,
 * `.uyg__bildirim` başlıktaki Bildirimler düğmesi.
 */
export const SERVISIM = [
  { kod: 'S-01', ad: 'İşlerim', sekme: 0, iz: 'musteriAdi' },
  { kod: 'S-02', ad: 'Parça', sekme: 1 },
  { kod: 'S-03', ad: 'Hak Ediş', sekme: 2, iz: 'hakkedis' },
  { kod: 'S-04', ad: 'Talep Detayı', sekme: 0, izeTikla: 'musteriAdi', iz: 'talepNo' },
  { kod: 'S-05', ad: 'Yeni Kayıt', sekme: 0, tikla: '.uyg__fab' },
  /* Sipariş ekranının başında servisin indirim oranı (23 Eylül 2026). */
  { kod: 'S-06', ad: 'Sipariş Ver', sekme: 1, tikla: '.uyg__fab', iz: 'iskontoOrani' },
  { kod: 'S-07', ad: 'Hesap', sekme: 0, tikla: '.uyg__hesap', iz: 'servisAdi' },
  /* Hesap'taki "Ücretlendirmeler": servisin özel saat ücreti (23 Eylül 2026). */
  { kod: 'S-08', ad: 'Hesap · Ücretlendirmeler', sekme: 0, tikla: '.uyg__hesap', iz: 'saatUcreti' },
  /* Bildirim geçmişi (24 Eylül 2026): üst çubuktaki "Bildirimler". */
  { kod: 'S-09', ad: 'Bildirimler', sekme: 0, tikla: '.uyg__bildirim' },
  /* Hak Ediş'in "güncel ücretleriniz" özetinde makineye göre farklı
     ücret (25 Eylül 2026, kullanıcı sınaması). */
  { kod: 'S-10', ad: 'Hak Ediş · Makineye göre ücret', sekme: 2, iz: 'modelUcreti' },
]

export const TOPLAM =
  CONNECT_OTURUMSUZ.length +
  CONNECT.length +
  BACKOFFICE_OTURUMSUZ.length +
  BACKOFFICE.length +
  SERVISIM_OTURUMSUZ.length +
  SERVISIM.length
