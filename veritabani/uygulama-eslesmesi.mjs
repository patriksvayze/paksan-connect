/* ==========================================================================
   Uygulama ↔ veritabanı eşlemesi

   BU DOSYA NE: üç uygulamanın bugün tarayıcı/telefon deposuna yazdığı
   her kaydın, her alanın veritabanında NEREYE düştüğü — ya da neden
   düşmediği. Tek kaynak burası; başka bir yerde tekrarlanmaz.

   NEDEN VAR: uygulama bugün veritabanına bağlı değil. Uygulamaya yeni bir
   alan eklendiğinde veritabanında karşılığı olup olmadığına hiçbir şey
   bakmıyordu; kayma sessizce birikiyordu. Bu dosya o soruyu yazılı
   cevaba çeviriyor, tools/veritabani-eslesme-denetimi.mjs de her
   `npm run dogrula`'da cevabın hâlâ doğru olduğunu denetliyor:

     - uygulamanın yazdığı bir alan burada yoksa        → YENİ ALAN, düşer
     - burada gösterilen sütun SQL betiklerinde yoksa   → VERİTABANINDA YOK, düşer
     - veri.js'e buraya yazılmamış bir işlev eklenirse  → YENİ İŞLEV, düşer

   YENİ BİR ALAN EKLEYEN NE YAPAR: denetim düştüğünde alanın yolunu
   söyler. Buraya bir satır eklenir: ya sütunu, ya türetildiği yer, ya
   da "yok" ve gerekçesi. "yok" demek serbest — sunucu aşamasının iş
   listesine girer ve sayısı her koşuda görünür. Yasak olan, sessizce
   geçmesi.

   SATIR TÜRLERİ

     sutun('sema.Tablo.Sutun')           doğrudan o sütuna yazılır
     turer('sema.Tablo.Sutun', 'nasıl')  saklanmaz; bağlı kayıttan okunur
                                         (talepteki servis adı gibi kopyalar)
     yok('gerekçe', 'belge §')           BİLİNEN BOŞLUK: veritabanında yeri
                                         yok ya da karar bekliyor
     olu('gerekçe')                      ÖLÜ ALAN: uygulama yazıyor ama hiçbir
                                         yer okumuyor; veritabanına taşınmaz.
                                         Boşluk değildir, yapılacak iş yok —
                                         ayrı sayılır ki ikisi karışmasın

   YOL BİÇİMİ: depo anahtarından başlar, `paksan.` öneki yazılmaz.
   Dizi `[]`, anahtarı veri olan nesne (parça koduna göre adet gibi) `{}`.
   `.*` ile biten yol altındaki her şeyi kapsar — yalnız içeriği zaten
   serbest olan yerlerde (bildirim şablon değerleri) kullanılır.

   Sütun adları `veritabani/semalar` betiklerinden okunur; tasarım
   kararları `veritabani/tasarim.md`'de. Boşlukların ayrıntısı
   `VT-TASARIM-EKLERI.md`'de — burada yalnız yönlendirilir.
   ========================================================================== */

const sutun = (s, not) => ({ tur: 'sutun', sutun: s, not })
const turer = (s, not) => ({ tur: 'turer', sutun: s, not })
const yok = (not, bkz) => ({ tur: 'yok', not, bkz })
const olu = (not) => ({ tur: 'olu', not })

/* MÜŞTERİ VE SERVİS NUMARASI — kullanıcının kararı (21 Eylül 2026):
   "Şu an demo & test aşamasında olduğumuz için (veritabanında da) şu
   anki gibi ilerleyebiliriz." Veritabanı tasarımı yeni müşteriye ve
   servise numara vermiyor (musteri.Hesap ve servis.Servis'te Numara
   sütunu yok). Uygulamanın bugün verdiği numara (MST000001, SRV001)
   olduğu gibi EskiNumara sütununda tutulur. Sütunun adı "eski" diyor
   çünkü tasarımda orası taşınan numaralar içindi; canlıya çıkmadan
   önce bu karara yeniden bakılır. */
const MUSTERI_NO = 'musteri.Hesap.EskiNumara'
const SERVIS_NO = 'servis.Servis.EskiNumara'
const NUMARA_KARARI = 'demo/test aşamasında uygulamanın verdiği numara olduğu gibi (kullanıcının kararı, 21.09.2026); canlıdan önce yeniden bakılır'

const EKLER = 'VT-TASARIM-EKLERI.md'

/* ------------------------------------------------------------------ Anahtarlar

   Uygulamaların depoya yazdığı her anahtar. `tur`:
     kayit        ortak kayıt; alanları aşağıda tek tek eşlenir
     oturum       giriş oturumu; sunucuda erisim.Oturum'a döner
     cihaz        yalnız o cihazda kalır, sunucuya gitmez
     demo         demo verisi; canlıya çıkmaz (servis.html data-demo)
     sunucuVerir  bugün cihazın ürettiği şey; sunucuda veritabanı üretir */

export const ANAHTARLAR = {
  // Ortak kayıtlar
  requests: { depo: 'yerel', tur: 'kayit', ne: 'Talepler — üç uygulamanın ortak kaydı', tablo: 'talep.Talep' },
  machines: { depo: 'yerel', tur: 'kayit', ne: 'Müşterinin makineleri', tablo: 'makine.Makine' },
  hesap: { depo: 'yerel', tur: 'kayit', ne: 'Müşteri hesabı', tablo: 'musteri.Hesap' },
  makineKayitlari: { depo: 'yerel', tur: 'kayit', ne: 'Makine kayıt defteri — seri başına tek satır, yeniden kayıt satırı günceller (kim, ne zaman, hangi servisle)', tablo: 'makine.KayitOlayi' },
  duyurular: { depo: 'yerel', tur: 'kayit', ne: 'Genel duyurular ve kişisel bildirimler', tablo: 'duyuru.Duyuru' },
  cariHareket: { depo: 'yerel', tur: 'kayit', ne: 'Servisin cari hesabı', tablo: 'hakedis.ServisHesapHareketi' },
  islemKaydi: { depo: 'yerel', tur: 'kayit', ne: 'Backoffice işlem kaydı', tablo: 'denetim.IslemKaydi' },
  numaraTalepleri: { depo: 'yerel', tur: 'kayit', ne: 'Numara değişikliği ve hesap birleştirme talepleri', tablo: 'musteri.TelefonDegisikligiTalebi' },
  personel: { depo: 'yerel', tur: 'kayit', ne: 'Backoffice personeli', tablo: 'personel.Personel' },
  panelIcerik: { depo: 'yerel', tur: 'kayit', ne: 'Backoffice\'in düzelttiği servis, bayi ve parça bilgisi', tablo: 'servis.Servis' },
  geribildirim: { depo: 'yerel', tur: 'kayit', ne: 'Müşteri geri bildirimleri', tablo: 'musteri.GeriBildirim' },
  sifreTalepleri: { depo: 'yerel', tur: 'kayit', ne: 'Personelin şifre yenileme talepleri', tablo: 'erisim.SifreSifirlamaJetonu' },
  servisSifreTalep: { depo: 'yerel', tur: 'kayit', ne: 'Servisin "şifremi unuttum" talepleri', tablo: 'servis.SifreYardimTalebi' },
  destekLog: { depo: 'yerel', tur: 'kayit', ne: 'Destek asistanı olay kaydı', tablo: 'destek.SohbetOlayi' },
  okunanBildirimler: { depo: 'yerel', tur: 'kayit', ne: 'Müşterinin okuduğu bildirimler', tablo: 'bildirim.Teslimat' },
  gizlenenTalepler: { depo: 'yerel', tur: 'kayit', ne: 'Müşterinin listesinden gizlediği talepler', tablo: 'talep.TalepGizleme' },
  gorulenDuyurular: { depo: 'yerel', tur: 'kayit', ne: 'Connect\'te görülmüş açılır duyurular', tablo: 'bildirim.Teslimat' },
  gorulenDuyurularServis: { depo: 'yerel', tur: 'kayit', ne: 'Servisim\'de görülmüş açılır duyurular', tablo: 'bildirim.Teslimat' },
  okunanBildirimlerServis: { depo: 'yerel', tur: 'kayit', ne: 'Servisim\'de okunmuş PAKSAN talep bildirimleri (21.09.2026)', tablo: 'bildirim.Teslimat' },
  servisAdresleri: {
    depo: 'yerel', tur: 'kayit', ne: 'Servisin teslimat adresi defteri',
    bosluk: yok('servis.TeslimatAdresi tablosu henüz yok', `${EKLER} §2`),
  },

  // Oturumlar
  user: { depo: 'oturum', tur: 'oturum', ne: 'Connect oturumu — hesabın kopyası', alanlarAyniDir: 'hesap' },
  panelOturum: { depo: 'yerel', tur: 'oturum', ne: 'Backoffice oturumu' },
  servisOturum: { depo: 'oturum', tur: 'oturum', ne: 'Servisim oturumu' },

  // Sunucuda veritabanının üreteceği şeyler
  sayaclar: { depo: 'yerel', tur: 'sunucuVerir', ne: 'Cihazın talep numarası sayacı → sistem.NumaraSayaci (sistem.NumaraAl)' },

  // Yalnız cihazda
  dil: { depo: 'yerel', tur: 'cihaz', ne: 'Seçilen dil (hesabın dili ayrıca musteri.Hesap.DilKodu)' },
  tema: { depo: 'yerel', tur: 'cihaz', ne: 'Connect teması' },
  gorulenler: { depo: 'yerel', tur: 'cihaz', ne: 'Connect ana ekranındaki "Yeni" işareti için görülmüş makine ve servis kimlikleri (22.09.2026); telefon değişince sıfırdan sayılır, kayıp değil' },
  backofficeTema: { depo: 'yerel', tur: 'cihaz', ne: 'Backoffice teması' },
  servisTema: { depo: 'yerel', tur: 'cihaz', ne: 'Servisim teması' },
  hatirla: { depo: 'yerel', tur: 'cihaz', ne: 'Connect "beni hatırla"' },
  servisHatirla: { depo: 'yerel', tur: 'cihaz', ne: 'Servisim "beni hatırla"' },
  chats: { depo: 'yerel', tur: 'cihaz', ne: 'Destek sohbetinin cihazdaki metni (sunucuda yalnız olaylar tutulur)' },
  rehberIsaret: { depo: 'yerel', tur: 'cihaz', ne: 'Kılavuzda nerede kalındığı' },
  yayinlananBildirimler: { depo: 'yerel', tur: 'cihaz', ne: 'Telefonda yerel bildirim olarak gösterilmiş duyurular' },

  // Demo
  demoMusteriler: { depo: 'yerel', tur: 'demo', ne: 'Backoffice demo müşterileri (örnek veri: veritabani/ornek)' },
  demoTalepler: { depo: 'yerel', tur: 'demo', ne: 'Backoffice demo talepleri' },
  demoSurumu: { depo: 'yerel', tur: 'demo', ne: 'Servisim demo kurulumunun sürümü' },
}

/* Depo dışında tutulanlar — denetim görmez, kayıt için burada. */
export const DEPO_DISI = {
  ekler: { nerede: 'IndexedDB (src/lib/ekler.js)', tablo: 'dosya.Dosya', ne: 'Talep ekleri: fotoğraf, video, ses' },
  servisVeBayiListesi: { nerede: 'src/marka (kaynak kod)', tablo: 'servis.Servis, bayi.Bayi', ne: 'Servis ve bayi listesi bugün kodda; panelIcerik yalnız düzeltmeleri tutuyor' },
}

/* Anahtarı veri olan nesneler: parça koduna göre adet gibi. Denetim bu
   yolların altındaki anahtarları `{}` diye tek yola indirir; yoksa her
   yeni parça "yeni alan" diye görünürdü. */
export const HARITALAR = [
  'requests[].parcaAdet',
  /* 23 Eylül 2026: hizmet ücreti ve parça iskontosu — ürün kimliğine ve
     servis kimliğine göre anahtarlı (bkz. lib/servisTarifesi.js). */
  'panelIcerik.hizmetTarifesi.modeller',
  'panelIcerik.hizmetTarifesi.servisler',
  'panelIcerik.hizmetTarifesi.servisler{}.modeller',
  'panelIcerik.parcaIskontosu.servisler',
]

/* ------------------------------------------------------------------- Alanlar */

export const ALANLAR = {
  // ---------------------------------------------------------------- Talep
  'requests[].id': sutun('talep.Talep.Kimlik', 'bugünkü kısa kimlik taşınırken EskiKayitNo\'ya'),
  'requests[].no': sutun('talep.Talep.Numara', 'bugün cihaz üretiyor; sunucuda sistem.NumaraAl verir, cihazınki CihazNumarasi\'na (tasarim.md 1.6)'),
  'requests[].tur': sutun('talep.Talep.TurKodu'),
  'requests[].status': sutun('talep.Talep.DurumKodu'),
  'requests[].sahip': sutun('talep.Talep.SahipKodu'),
  'requests[].masa': sutun('talep.Talep.MasaKodu'),
  'requests[].createdAt': sutun('talep.Talep.OlusmaZamani'),
  'requests[].aciklama': sutun('talep.Talep.Aciklama'),
  'requests[].ihracat': sutun('talep.Talep.Ihracat'),
  'requests[].musteriId': sutun('talep.Talep.HesapKimlik'),
  'requests[].ad': sutun('talep.Talep.IletisimAdi', 'hesabı olan müşteride ad musteri.HesapKisisi\'nden gelir'),
  'requests[].tel': sutun('talep.Talep.IletisimTelefonUlusal'),
  'requests[].telHam': sutun('talep.Talep.IletisimTelefonE164', 'ham rakam + ülke kodundan E.164 kurulur'),
  'requests[].telUlke': turer('talep.Talep.IletisimTelefonE164', 'ülke kodu E.164\'ün içinde'),
  'requests[].ulke': sutun('talep.Talep.KonumUlkeKodu'),
  'requests[].il': sutun('talep.Talep.IlKodu', 'bugün il ADI yazılıyor, veritabanı KOD tutuyor'),
  'requests[].ilce': sutun('talep.Talep.IlceKodu', 'bugün ilçe ADI yazılıyor, veritabanı KOD tutuyor'),
  'requests[].adres': sutun('talep.Talep.Adres'),
  'requests[].belirtiler[]': sutun('talep.TalepBelirtisi.BelirtiKodu'),
  'requests[].ekler[]': sutun('talep.TalepEki.DosyaKimlik'),
  'requests[].urunId': sutun('talep.TeklifTalebiAyrinti.IlgiUrunKodu', 'teklifte ilgilenilen ürün; servis talebinde makineden gelir'),

  'requests[].makine.id': sutun('talep.Talep.MakineKimlik'),
  'requests[].makine.productId': turer('makine.Makine.UrunKodu', 'talep.Talep.MakineKimlik üzerinden'),
  'requests[].makine.serial': turer('makine.Makine.SeriNo', 'talep.Talep.MakineKimlik üzerinden'),

  'requests[].servis.id': sutun('talep.Talep.ServisKimlik'),
  'requests[].servis.tarih': sutun('talep.Talep.ServisAtamaZamani'),
  'requests[].servis.ad': turer('servis.Servis.Ad', 'talep.Talep.ServisKimlik üzerinden'),
  'requests[].servis.tel': turer('servis.Servis.TelefonE164', 'talep.Talep.ServisKimlik üzerinden'),
  'requests[].servis.no': turer(SERVIS_NO, NUMARA_KARARI),

  /* Fiyat teklifinin bayiye iletilmesi (21.09.2026'dan beri "Bayiye
     İletildi" durumu). Geri alınınca uygulamada `bayi` boşalıyor;
     veritabanında atama satırı kalır, KaldirilmaZamani yazılır. */
  'requests[].bayi.id': sutun('talep.BayiAtamasi.BayiKimlik'),
  'requests[].bayi.tarih': sutun('talep.BayiAtamasi.OlusmaZamani'),
  'requests[].bayi.ad': turer('bayi.Bayi.Ad', 'talep.BayiAtamasi.BayiKimlik üzerinden'),
  'requests[].bayi.tel': turer('bayi.Bayi.TelefonE164', 'talep.BayiAtamasi.BayiKimlik üzerinden'),

  'requests[].gecmis[].durum': sutun('talep.DurumGecmisi.YeniDurumKodu', 'tetikleyici yazar, uygulama yazmaz'),
  'requests[].gecmis[].tarih': sutun('talep.DurumGecmisi.OlusmaZamani'),
  'requests[].gecmis[].personel': sutun('talep.DurumGecmisi.YapanAdi'),

  'requests[].cozum.yapilanIs': sutun('talep.Kapanis.YapilanIsMetni'),
  'requests[].cozum.parcalar': sutun('talep.Kapanis.DegisenParcalarMetni'),
  'requests[].cozum.ucret': sutun('talep.Kapanis.UcretDurumuKodu', 'bugün yazı ("Garanti kapsamında"); veritabanında durum kodu + UcretTutari'),
  'requests[].cozum.not': sutun('talep.Kapanis.KapanisNotu'),
  'requests[].cozum.tarih': sutun('talep.Kapanis.OlusmaZamani'),
  'requests[].cozum.personel': sutun('talep.Kapanis.YapanAdi'),
  'requests[].cozum.ozet': turer('talep.Kapanis.YapilanIsMetni', 'özet cümlesi kapanış sütunlarından kurulur'),
  'requests[].cozum.garantiDisi': turer('talep.ServisZiyareti.KapiKodu', 'ziyaretin kapısı "garanti" değilse garanti dışı'),

  'requests[].servisKaydi.ariza': sutun('talep.ServisZiyareti.ArizaMetni'),
  'requests[].servisKaydi.yapilanIs': sutun('talep.ServisZiyareti.YapilanIsKodu'),
  'requests[].servisKaydi.asama': sutun('talep.ServisZiyareti.AsamaKodu'),
  'requests[].servisKaydi.kapi': sutun('talep.ServisZiyareti.KapiKodu'),
  'requests[].servisKaydi.km': sutun('talep.ServisZiyareti.Km'),
  /* 22.09.2026: işçilik süreyle yazılıyor. Tutar (`iscilik`) süre × o günün
     saat ücretinden doluyor; hak ediş kalemini HakEdisHesapla süre × tarifeden
     yazar (AK-20). Süresi olmayan eski kayıtta yalnız tutar var. */
  'requests[].servisKaydi.iscilik': sutun('talep.ServisZiyareti.IscilikTutari', 'süreli kayıtta süre × saat ücreti; eski kayıtta servisin yazdığı tutar'),
  'requests[].servisKaydi.iscilikSaat': sutun('talep.ServisZiyareti.IscilikSaati'),
  'requests[].servisKaydi.saatUcreti': turer('hakedis.Tarife.BirimTutar', 'kalem türü iscilik, ziyaretin tamamlandığı gün geçerli tarife; hak ediş kaleminde HakEdisKalemi.BirimTutar'),
  /* Km ücreti de kayda yazılıyor (23 Eylül 2026): tarife backoffice'ten
     değişiyor, servise ve ürüne göre farklı olabiliyor. Veritabanında
     hak edişin yol kalemi aynı şeyi zaten tutuyor. */
  'requests[].servisKaydi.kmUcreti': turer('hakedis.HakEdisKalemi.BirimTutar', 'kalem türü yol; ziyaretin tamamlandığı gün servis ve ürün için geçerli hakedis.Tarife satırından (servis/ürün boyutu VT-TASARIM-EKLERI §5)'),
  'requests[].servisKaydi.tarih': sutun('talep.ServisZiyareti.TamamlanmaZamani'),
  'requests[].servisKaydi.servisAd': turer('servis.Servis.Ad', 'talep.ServisZiyareti.ServisKimlik üzerinden'),
  'requests[].servisKaydi.parcalar[].kod': sutun('talep.ZiyaretParcaSatiri.ParcaKodu'),
  'requests[].servisKaydi.parcalar[].ad': sutun('talep.ZiyaretParcaSatiri.ParcaAdi'),
  'requests[].servisKaydi.parcalar[].adet': sutun('talep.ZiyaretParcaSatiri.Adet'),
  'requests[].servisKaydi.parcalar[].fiyat': sutun('talep.ZiyaretParcaSatiri.BirimFiyat', 'Servisim parçayı katalogtan seçerken yazıyor'),
  /* 22.09.2026: satırın yazıldığı günkü görselin dosya adı — katalog
     değişince geçmiş kayıt kendi resmini göstersin (AK-19). */
  'requests[].servisKaydi.parcalar[].gorsel': yok('talep.ZiyaretParcaSatiri görselin dosya adını tutmuyor (GorselDosyasi sütunu gerekiyor)', `${EKLER} §4`),
  'requests[].servisKaydi.teslimat.*': yok('Garanti parçasının gideceği adres için tablo yok (talep.TeslimatAdresi)', `${EKLER} §2`),

  /* PAKSAN'ın servis kaydında yaptığı düzeltmeler (veri.js → hakkedisDuzelt;
     AK-20'den beri bir senaryo yazıyor). Uygulama önceki ve yeni değeri her
     düzeltmede yazıyor; veritabanında değişmeyen değer boş kalır. Süre
     yalnız süreli kayıtta yazılıyor. */
  'requests[].servisKaydi.duzeltmeler[].tarih': sutun('talep.ZiyaretDuzeltmesi.OlusmaZamani'),
  'requests[].servisKaydi.duzeltmeler[].personel': sutun('talep.ZiyaretDuzeltmesi.YapanAdi'),
  'requests[].servisKaydi.duzeltmeler[].neden': sutun('talep.ZiyaretDuzeltmesi.Neden'),
  'requests[].servisKaydi.duzeltmeler[].onceki.km': sutun('talep.ZiyaretDuzeltmesi.OncekiKm'),
  'requests[].servisKaydi.duzeltmeler[].onceki.iscilik': sutun('talep.ZiyaretDuzeltmesi.OncekiIscilikTutari'),
  'requests[].servisKaydi.duzeltmeler[].onceki.iscilikSaat': sutun('talep.ZiyaretDuzeltmesi.OncekiIscilikSaati'),
  'requests[].servisKaydi.duzeltmeler[].onceki.parcalar[]': sutun('talep.ZiyaretDuzeltmesiParcasi.ParcaAdi', 'TarafKodu onceki; kod, adet ve fiyat aynı satırda'),
  'requests[].servisKaydi.duzeltmeler[].yeni.km': sutun('talep.ZiyaretDuzeltmesi.YeniKm'),
  'requests[].servisKaydi.duzeltmeler[].yeni.iscilik': sutun('talep.ZiyaretDuzeltmesi.YeniIscilikTutari'),
  'requests[].servisKaydi.duzeltmeler[].yeni.iscilikSaat': sutun('talep.ZiyaretDuzeltmesi.YeniIscilikSaati'),
  'requests[].servisKaydi.duzeltmeler[].yeni.parcalar[]': sutun('talep.ZiyaretDuzeltmesiParcasi.ParcaAdi', 'TarafKodu yeni; kod, adet ve fiyat aynı satırda'),

  'requests[].hakkedis.durum': sutun('hakedis.HakEdis.DurumKodu'),
  'requests[].hakkedis.toplam': sutun('hakedis.HakEdis.NetTutar', 'hakedis.HakEdisHesapla yazar'),
  'requests[].hakkedis.olusma': sutun('hakedis.HakEdis.OlusmaZamani'),
  'requests[].hakkedis.onay.tarih': sutun('hakedis.HakEdis.OnayZamani'),
  'requests[].hakkedis.onay.personel': sutun('hakedis.HakEdis.OnaylayanAdi'),
  'requests[].hakkedis.yol': turer('hakedis.HakEdisKalemi.Tutar', 'kalem türü yol'),
  'requests[].hakkedis.iscilik': turer('hakedis.HakEdisKalemi.Tutar', 'kalem türü işçilik'),
  'requests[].hakkedis.kalemler[].tutar': sutun('hakedis.HakEdisKalemi.Tutar'),
  'requests[].hakkedis.kalemler[].ad': turer('hakedis.HakEdisKalemi.KalemTuruKodu', 'ad, kalem türü ve miktardan kurulur'),

  'requests[].parcalar[]': sutun('talep.ParcaSatiri.ParcaAdi'),
  'requests[].parcaAdet{}': sutun('talep.ParcaSatiri.Adet', 'parça başına bir satır'),
  'requests[].parcaFiyat': sutun('talep.ParcaTalebiAyrinti.GenelToplam', 'fiyat görüntüsü; satır fiyatları talep.ParcaSatiri.BirimFiyat'),
  /* Fiyat görüntüsünün içi (AK-19 dolu bir görüntü yazana kadar hiçbir
     senaryo içine girmiyordu). */
  'requests[].parcaFiyat.surum': turer('talep.ParcaTalebiAyrinti.FiyatListesiKodu', 'uygulamadaki sürüm numarası listenin koduyla anılır; sayı katalog.FiyatListesi.KaynakSurumNo'),
  'requests[].parcaFiyat.kaynak': turer('katalog.FiyatListesi.KaynakDosyaAdi', 'ParcaTalebiAyrinti.FiyatListesiKodu üzerinden'),
  'requests[].parcaFiyat.araToplam': sutun('talep.ParcaTalebiAyrinti.AraToplam'),
  'requests[].parcaFiyat.kdv': sutun('talep.ParcaTalebiAyrinti.KdvTutari'),
  'requests[].parcaFiyat.toplam': sutun('talep.ParcaTalebiAyrinti.GenelToplam'),
  'requests[].parcaFiyat.eksikFiyat': sutun('talep.ParcaTalebiAyrinti.EksikFiyatVar'),
  'requests[].parcaFiyat.satirlar[].kod': sutun('talep.ParcaSatiri.ParcaKodu'),
  'requests[].parcaFiyat.satirlar[].ad': sutun('talep.ParcaSatiri.ParcaAdi'),
  'requests[].parcaFiyat.satirlar[].adet': sutun('talep.ParcaSatiri.Adet'),
  'requests[].parcaFiyat.satirlar[].birimFiyat': sutun('talep.ParcaSatiri.BirimFiyat'),
  'requests[].parcaFiyat.satirlar[].tutar': sutun('talep.ParcaSatiri.Tutar'),
  /* Servis siparişinin iskontosu (23 Eylül 2026). Oran siparişin kendi
     alanı; liste fiyatı ve toplamlar ondan ve fiyat listesinden türer. */
  'requests[].parcaFiyat.satirlar[].listeFiyati': turer('katalog.FiyatListesiSatiri.BirimFiyat', 'siparişin FiyatListesiKodu + satırın ParcaKodu'),
  'requests[].parcaFiyat.iskontoOrani': sutun('talep.ParcaTalebiAyrinti.IskontoOrani'),
  'requests[].parcaFiyat.listeToplam': turer('katalog.FiyatListesiSatiri.BirimFiyat', 'satırların liste fiyatı × ParcaSatiri.Adet toplamı'),
  'requests[].parcaFiyat.iskontoTutari': turer('talep.ParcaTalebiAyrinti.AraToplam', 'liste fiyatıyla toplam − AraToplam'),
  /* 24.09.2026: bakiyeden ödemede ek iskonto (AK-23). Yalnız bakiyeden
     ödenen ve o gün oranı açık siparişte var; AraToplam ve GenelToplam
     ek iskontolu. */
  'requests[].parcaFiyat.bakiyeIskontoOrani': yok('talep.ParcaTalebiAyrinti ek iskonto oranını tutmuyor (BakiyeIskontoOrani sütunu gerekiyor)', `${EKLER} §8`),
  'requests[].parcaFiyat.bakiyeIskontoTutari': yok('talep.ParcaTalebiAyrinti ek iskonto tutarını tutmuyor (BakiyeIskontoTutari sütunu gerekiyor)', `${EKLER} §8`),
  /* 22.09.2026: talebin açıldığı günkü görselin dosya adı (AK-19). */
  'requests[].parcaFiyat.satirlar[].gorsel': yok('talep.ParcaSatiri görselin dosya adını tutmuyor (GorselDosyasi sütunu gerekiyor)', `${EKLER} §4`),
  'requests[].tutar': sutun('talep.ParcaTalebiAyrinti.AraToplam'),
  'requests[].tutarKdvli': sutun('talep.ParcaTalebiAyrinti.GenelToplam'),
  'requests[].odeme': sutun('talep.ParcaTalebiAyrinti.OdemeYontemiKodu'),
  'requests[].servisSiparisi': sutun('talep.Talep.KaynakKodu', 'servis siparişi talebin kaynağıdır'),
  'requests[].teslimat.yazi': sutun('talep.ParcaTalebiAyrinti.TeslimatAdresi'),
  'requests[].teslimat.acikAdres': yok('Adres bugün tek yazı sütununda; alanlarına ayrılmış tablo yok', `${EKLER} §2`),
  'requests[].teslimat.alici': yok('Alıcı adı için sütun yok', `${EKLER} §2`),
  'requests[].teslimat.tel': yok('Alıcı telefonu için sütun yok', `${EKLER} §2`),
  'requests[].teslimat.il': yok('Teslimat ili için sütun yok', `${EKLER} §2`),
  'requests[].teslimat.ilce': yok('Teslimat ilçesi için sütun yok', `${EKLER} §2`),
  'requests[].teslimat.kaynak': yok('Adresin defterden mi elle mi geldiği için sütun yok', `${EKLER} §2`),

  'requests[].odemeOnay.tarih': sutun('talep.OdemeOnayi.OlusmaZamani'),
  'requests[].odemeOnay.personel': sutun('talep.OdemeOnayi.YapanAdi'),
  'requests[].odemeOnay.not': sutun('talep.OdemeOnayi.OnayNotu'),
  'requests[].dekont.id': sutun('talep.Dekont.DosyaKimlik'),
  'requests[].dekont.ad': turer('dosya.Dosya.OrijinalAd', 'talep.Dekont.DosyaKimlik üzerinden'),
  'requests[].dekont.boyut': turer('dosya.Dosya.BoyutBayt', 'talep.Dekont.DosyaKimlik üzerinden'),
  'requests[].fatura.ad': sutun('talep.FaturaBilgisi.AdSoyad'),
  'requests[].fatura.adres': sutun('talep.FaturaBilgisi.Adres'),
  'requests[].fatura.tel': sutun('talep.FaturaBilgisi.TelefonE164'),

  'requests[].parcaSevk.firma': sutun('talep.ParcaSevki.KargoFirmasiMetni'),
  'requests[].parcaSevk.takipNo': sutun('talep.ParcaSevki.TakipNo'),
  'requests[].parcaSevk.tarih': sutun('talep.ParcaSevki.SevkZamani'),
  'requests[].parcaSevk.personel': sutun('talep.ParcaSevki.GuncelleyenAdi'),

  'requests[].iptalBilgi.neden': sutun('talep.Iptal.IptalNedeniKodu', 'bugün yazı; veritabanında iptal nedeni kodu, serbest metin talep.Iptal.Aciklama'),
  'requests[].iptalBilgi.tarih': sutun('talep.Iptal.OlusmaZamani'),
  'requests[].iptalBilgi.personel': sutun('talep.Iptal.YapanAdi'),

  'requests[].notlar[].metin': sutun('talep.TalepNotu.Metin'),
  'requests[].notlar[].tarih': sutun('talep.TalepNotu.OlusmaZamani'),
  'requests[].notlar[].personel': sutun('talep.TalepNotu.YapanAdi'),
  'requests[].notlar[].musteriye': sutun('talep.TalepNotu.MusteriGorur'),
  'requests[].notlar[].servise': sutun('talep.TalepNotu.ServisGorur'),
  'requests[].notlar[].servisten': sutun('talep.TalepNotu.ServistenGeldi'),

  /* Servis randevusu da yedek parçanın gönderim günü de aynı plan
     alanına yazılıyor (veri.js → talepPlanla). Tasarımda gönderim planı
     için ayrı tablo yok; tek karşılığı talep.Randevu. Sunucu aşamasında
     yedek parça için doğrulanmalı. */
  'requests[].plan.tarih': sutun('talep.Randevu.PlanlananZamani'),
  'requests[].plan.tarihYazi': turer('talep.Randevu.PlanlananZamani', 'görüntü biçimi'),
  'requests[].plan.is': sutun('talep.Randevu.IsTanimi'),
  'requests[].plan.gorusuldu': sutun('talep.Randevu.MusteriyleGorusuldu'),
  'requests[].plan.kayitTarihi': sutun('talep.Randevu.OlusmaZamani'),
  'requests[].plan.personel': sutun('talep.Randevu.YapanAdi'),

  'requests[].teklif.tutar': sutun('talep.Teklif.Tutar'),
  'requests[].teklif.tarih': sutun('talep.Teklif.OlusmaZamani'),
  'requests[].teklif.personel': sutun('talep.Teklif.YapanAdi'),

  // ------------------------------------------------------------- Makine
  'machines[].id': sutun('makine.Makine.Kimlik'),
  'machines[].serial': sutun('makine.Makine.SeriNo'),
  'machines[].productId': sutun('makine.Makine.UrunKodu'),
  'machines[].year': sutun('makine.Makine.SeridenUretimYili'),
  'machines[].nickname': sutun('makine.MakineSahipligi.TakmaAd'),
  'machines[].addedAt': sutun('makine.MakineSahipligi.BaslangicZamani'),
  'machines[].doneMaintenance[]': sutun('makine.BakimTamamlama.Saat', 'işaretlenen bakım ADIMI ("50 saatlik bakım"); makinenin sayacı değil. Şablon ürünün bakım takviminden gelir (BakimSablonuKodu)'),
  'machines[].hours': olu('Makine eklenirken 0 yazılıyor (AppState.jsx:219, veri.js:1684), hiçbir ekran okumuyor ya da yazdırmıyor. Çalışma saati bilerek tutulmuyor: MachineDetail.jsx:296.'),

  'makineKayitlari[].id': sutun('makine.KayitOlayi.Kimlik'),
  'makineKayitlari[].tarih': sutun('makine.KayitOlayi.OlusmaZamani'),
  'makineKayitlari[].kaynak': sutun('makine.KayitOlayi.KaynakKodu'),
  'makineKayitlari[].musteriId': sutun('makine.KayitOlayi.HesapKimlik'),
  'makineKayitlari[].musteriAd': sutun('makine.KayitOlayi.BeyanAdi'),
  'makineKayitlari[].servisId': sutun('makine.KayitOlayi.ServisKimlik', 'Servisim elle kaydında kaydeden servis; backoffice ataması (makineAtamasiniKaydet) AYNI alana yazıyor, veritabanında o makine.MakineServisAtamasi — sunucu aşamasında ikiye ayrılmalı'),
  'makineKayitlari[].il': sutun('makine.KayitOlayi.KonumIlKodu', 'bugün ad, veritabanı kod'),
  'makineKayitlari[].ilce': sutun('makine.KayitOlayi.KonumIlceKodu', 'bugün ad, veritabanı kod'),
  'makineKayitlari[].logoBildi': sutun('makine.KayitOlayi.LogoBildi'),
  'makineKayitlari[].yeniSatis': sutun('makine.KayitOlayi.YeniSatis'),
  'makineKayitlari[].bayiId': sutun('makine.MakineSatisi.SaticiBayiKimlik'),
  'makineKayitlari[].faturaTarihi': sutun('makine.MakineSatisi.FaturaTarihi'),
  'makineKayitlari[].uretimTarihi': sutun('makine.Makine.UretimTarihi'),
  'makineKayitlari[].seri': turer('makine.Makine.SeriNo', 'makine.KayitOlayi.MakineKimlik üzerinden'),
  'makineKayitlari[].productId': turer('makine.Makine.UrunKodu', 'makine.KayitOlayi.MakineKimlik üzerinden'),
  'makineKayitlari[].servisAd': turer('servis.Servis.Ad', 'makine.KayitOlayi.ServisKimlik üzerinden'),
  'makineKayitlari[].bayiAd': turer('bayi.Bayi.Ad', 'makine.MakineSatisi.SaticiBayiKimlik üzerinden'),
  'makineKayitlari[].musteriNo': turer(MUSTERI_NO, NUMARA_KARARI),

  // -------------------------------------------------------------- Müşteri
  'hesap.id': sutun('musteri.Hesap.Kimlik', 'bugünkü kısa kimlik taşınırken EskiKayitNo\'ya'),
  'hesap.createdAt': sutun('musteri.Hesap.OlusmaZamani'),
  'hesap.tel': sutun('musteri.Hesap.TelefonUlusal'),
  'hesap.ulke': sutun('musteri.Hesap.TelefonUlkeKodu'),
  'hesap.konumUlke': sutun('musteri.Hesap.KonumUlkeKodu'),
  'hesap.il': sutun('musteri.Hesap.IlKodu', 'bugün ad, veritabanı kod'),
  'hesap.ilce': sutun('musteri.Hesap.IlceKodu', 'bugün ad, veritabanı kod'),
  'hesap.adres': sutun('musteri.Hesap.Adres'),
  'hesap.adi': sutun('musteri.HesapKisisi.Adi'),
  'hesap.soyadi': sutun('musteri.HesapKisisi.Soyadi'),
  'hesap.ad': turer('musteri.HesapKisisi.Adi', 'ad + soyad'),
  'hesap.onaylar.aydinlatma': sutun('kvkk.RizaOlayi.SecimKodu', 'her onay bir rıza olayı satırı'),
  'hesap.onaylar.acikRiza': sutun('kvkk.RizaOlayi.SecimKodu'),
  'hesap.onaylar.kampanya': sutun('kvkk.RizaOlayi.SecimKodu'),
  'hesap.onaylar.surum': sutun('kvkk.RizaOlayi.Surum'),
  'hesap.onaylar.tarih': sutun('kvkk.RizaOlayi.OlusmaZamani'),
  'hesap.no': sutun(MUSTERI_NO, NUMARA_KARARI),

  // ------------------------------------------------ Numara değişikliği
  'numaraTalepleri[].id': sutun('musteri.TelefonDegisikligiTalebi.Kimlik'),
  'numaraTalepleri[].tarih': sutun('musteri.TelefonDegisikligiTalebi.OlusmaZamani'),
  'numaraTalepleri[].musteriId': sutun('musteri.TelefonDegisikligiTalebi.HesapKimlik'),
  'numaraTalepleri[].ad': sutun('musteri.TelefonDegisikligiTalebi.BeyanAdi'),
  'numaraTalepleri[].seri': sutun('musteri.TelefonDegisikligiTalebi.KanitSeriNo'),
  'numaraTalepleri[].eskiTel': turer('musteri.TelefonDegisikligiTalebi.EskiTelefonE164', 'görüntü biçimi'),
  'numaraTalepleri[].eskiTelHam': sutun('musteri.TelefonDegisikligiTalebi.EskiTelefonE164'),
  'numaraTalepleri[].eskiUlke': turer('musteri.TelefonDegisikligiTalebi.EskiTelefonE164', 'ülke kodu E.164\'ün içinde'),
  'numaraTalepleri[].yeniTel': turer('musteri.TelefonDegisikligiTalebi.YeniTelefonE164', 'görüntü biçimi'),
  'numaraTalepleri[].yeniTelHam': sutun('musteri.TelefonDegisikligiTalebi.YeniTelefonE164'),
  'numaraTalepleri[].yeniUlke': turer('musteri.TelefonDegisikligiTalebi.YeniTelefonE164', 'ülke kodu E.164\'ün içinde'),
  'numaraTalepleri[].durum': sutun('musteri.TelefonDegisikligiTalebi.KararDurumuKodu'),
  'numaraTalepleri[].karar.tarih': sutun('musteri.TelefonDegisikligiTalebi.KararZamani'),
  'numaraTalepleri[].karar.personel': sutun('musteri.TelefonDegisikligiTalebi.KararVerenAdi'),
  'numaraTalepleri[].karar.not': sutun('musteri.TelefonDegisikligiTalebi.KararNotu'),
  'numaraTalepleri[].kaynak': yok('Talep türü (numara değişikliği / hesap birleştirme) için TurKodu yok', `${EKLER} §1`),
  'numaraTalepleri[].eskiHesap.musteriId': yok('Birleştirilecek eski hesap için EskiHesapKimlik yok', `${EKLER} §1`),
  'numaraTalepleri[].eskiHesap.musteriNo': yok('Birleştirilecek eski hesap için EskiHesapKimlik yok', `${EKLER} §1`),
  'numaraTalepleri[].yeniHesap.musteriId': turer('musteri.TelefonDegisikligiTalebi.HesapKimlik', 'talebi açan hesap'),
  'numaraTalepleri[].yeniHesap.musteriNo': turer(MUSTERI_NO, NUMARA_KARARI),
  'numaraTalepleri[].yeniAnahtar': turer('musteri.TelefonDegisikligiTalebi.YeniTelefonE164', 'ülke kodlu rakam; E.164\'ten kurulur'),

  // ------------------------------------------------ Duyuru ve bildirim
  'duyurular[].id': sutun('duyuru.Duyuru.Kimlik', 'kişisel bildirimde bildirim.Bildirim.Kimlik'),
  'duyurular[].tur': sutun('duyuru.Duyuru.TurKodu', 'kişisel bildirimde bildirim.Bildirim.TurKodu'),
  'duyurular[].tarih': sutun('duyuru.Duyuru.YayinZamani', 'kişisel bildirimde bildirim.Bildirim.OlusmaZamani'),
  'duyurular[].baslik': sutun('duyuru.Duyuru.Baslik'),
  'duyurular[].metin': sutun('duyuru.Duyuru.Metin'),
  'duyurular[].pencere': sutun('duyuru.Duyuru.PencereGoster'),
  'duyurular[].gorsel': sutun('duyuru.Duyuru.GorselDosyaKimlik'),
  'duyurular[].hedef.kime': sutun('duyuru.Duyuru.HedefKitleKodu'),
  /* Hedefleme (23 Eylül 2026): bölge, makine ve servis iki alıcıya da
     uygulanıyor (lib/duyuruHedef.js). Tablolar V0013'te hazırdı; servis
     süzgecinin müşteriye, bölgenin servisin hizmet illerine uygulanması
     ve açıklama metinleri VT-TASARIM-EKLERI.md §7'de. */
  'duyurular[].hedef.iller[]': sutun('duyuru.HedefIl.IlKodu', 'il adı → cografya.Il kodu'),
  'duyurular[].hedef.urunler[]': sutun('duyuru.HedefUrun.UrunKodu'),
  'duyurular[].hedef.seriler[]': sutun('duyuru.HedefSeri.SeriNo', 'yazıldığı gibi; karşılaştırma biçimden bağımsız'),
  'duyurular[].hedef.servisler[]': sutun('duyuru.HedefServis.ServisKimlik'),
  'duyurular[].personel': sutun('duyuru.Duyuru.YapanAdi'),
  'duyurular[].kisisel': turer('bildirim.Bildirim.Kimlik', 'kişisel olan bildirim.Bildirim\'e, genel duyuru duyuru.Duyuru\'ya yazılır'),
  'duyurular[].musteriId': sutun('bildirim.Bildirim.HesapKimlik'),
  'duyurular[].baslikAnahtar': sutun('bildirim.Bildirim.BaslikAnahtari'),
  'duyurular[].metinAnahtar': sutun('bildirim.Bildirim.MetinAnahtari'),
  'duyurular[].degerler.*': sutun('bildirim.Bildirim.DegerlerJson', 'şablonun değerleri; içeriği şablona göre değişir'),
  'duyurular[].talepNo': turer('talep.Talep.Numara', 'bildirim.Bildirim.TalepKimlik üzerinden'),
  /* Servise giden talep bildirimi (21.09.2026, veri.js → serviseBildir). */
  'duyurular[].alici': sutun('bildirim.Bildirim.AliciTuruKodu', 'servis bildiriminde "servis"'),
  'duyurular[].servisId': sutun('bildirim.Bildirim.ServisKimlik'),
  'duyurular[].talepId': sutun('bildirim.Bildirim.TalepKimlik'),
  'duyurular[].olay': sutun('bildirim.Bildirim.MetinAnahtari', 'olay kodu; yazısı Servisim\'in sözlüğünde (servis/talepBildirimleri.js)'),

  'okunanBildirimlerServis[]': sutun('bildirim.Teslimat.OkunmaZamani', 'okunan bildirimin kimliği; okunma anı sunucuda yazılır'),

  // ------------------------------------------------------- Servis cari
  'cariHareket[].id': sutun('hakedis.ServisHesapHareketi.Kimlik'),
  'cariHareket[].tarih': sutun('hakedis.ServisHesapHareketi.HareketZamani'),
  'cariHareket[].tur': sutun('hakedis.ServisHesapHareketi.YonKodu', 'alacak/borç; hareketin türü ayrıca HareketTuruKodu'),
  'cariHareket[].tutar': sutun('hakedis.ServisHesapHareketi.Tutar'),
  'cariHareket[].aciklama': sutun('hakedis.ServisHesapHareketi.Aciklama'),
  'cariHareket[].servisId': sutun('hakedis.ServisHesapHareketi.ServisKimlik'),
  'cariHareket[].personel': sutun('hakedis.ServisHesapHareketi.YapanAdi'),
  'cariHareket[].servisAd': turer('servis.Servis.Ad', 'ServisKimlik üzerinden'),
  'cariHareket[].talepNo': turer('talep.Talep.Numara', 'HakEdisKimlik ya da ParcaTalepKimlik üzerinden'),

  // ------------------------------------------------------ İşlem kaydı
  'islemKaydi[].id': sutun('denetim.IslemKaydi.Kimlik'),
  'islemKaydi[].tarih': sutun('denetim.IslemKaydi.IslemZamani'),
  'islemKaydi[].tur': sutun('denetim.IslemKaydi.IslemTuruKodu'),
  'islemKaydi[].personel': sutun('denetim.IslemKaydi.YapanAdi'),
  'islemKaydi[].rol': sutun('denetim.IslemKaydi.YapanRolAdi'),
  'islemKaydi[].ozet': turer('denetim.IslemKaydi.AyrintiJson', 'özet cümlesi işlem türünden ve ayrıntıdan kurulur'),

  // ----------------------------------------------------------- Roller
  /* Rol birden çok talep türü görebiliyor (21.09.2026). Şema tek tür
     tutuyor; tablo gerekiyor. Tek türlü eski kayıtlardaki `talepTuru`
     okunurken listeye çevriliyor (veri.js → rolunTurleri). */
  /* 22.09.2026: Kayıtlı Makineler `musteriler` izninden ayrılıp
     `makineler` oldu. Tarayıcı deposundaki eski roller okunurken bir kez
     taşınıyor; bu alan taşımanın yapıldığını söylüyor (veri.js →
     rolIzinleriniTasi). Veritabanında RolIzin satırları doğrudan
     yazılacağı için karşılığı gerekmiyor. */
  /* Hizmet ücreti (23 Eylül 2026, lib/servisTarifesi.js). Genel satır
     bugünkü tabloya oturuyor; makineye göre ve servise özel satır için
     hakedis.Tarife'de ürün ve servis sütunu yok (VT-TASARIM-EKLERI §5). */
  'panelIcerik.hizmetTarifesi.genel.yolKm': sutun('hakedis.Tarife.BirimTutar', 'KalemTuruKodu yol, BirimKodu km; MarkaKodu boş açık satır'),
  'panelIcerik.hizmetTarifesi.genel.iscilikSaat': sutun('hakedis.Tarife.BirimTutar', 'KalemTuruKodu iscilik, BirimKodu saat; MarkaKodu boş açık satır'),
  'panelIcerik.hizmetTarifesi.genel.guncelleme.tarih': turer('hakedis.Tarife.GecerlilikBaslangicTarihi', 'açık satırın başlangıcı; değişiklik anı gecmis.hakedis_Tarife'),
  'panelIcerik.hizmetTarifesi.genel.guncelleme.personel': turer('denetim.IslemKaydi.YapanAdi', 'tarife değişikliğinin işlem kaydı'),
  'panelIcerik.hizmetTarifesi.modeller{}.yolKm': yok('hakedis.Tarife ürün boyutu taşımıyor (UrunKimlik sütunu gerekiyor)', `${EKLER} §5`),
  'panelIcerik.hizmetTarifesi.modeller{}.iscilikSaat': yok('hakedis.Tarife ürün boyutu taşımıyor (UrunKimlik sütunu gerekiyor)', `${EKLER} §5`),
  'panelIcerik.hizmetTarifesi.servisler{}.yolKm': yok('hakedis.Tarife servis boyutu taşımıyor (ServisKimlik sütunu gerekiyor)', `${EKLER} §5`),
  'panelIcerik.hizmetTarifesi.servisler{}.iscilikSaat': yok('hakedis.Tarife servis boyutu taşımıyor (ServisKimlik sütunu gerekiyor)', `${EKLER} §5`),
  'panelIcerik.hizmetTarifesi.servisler{}.modeller{}.yolKm': yok('hakedis.Tarife servis ve ürün boyutu taşımıyor', `${EKLER} §5`),
  'panelIcerik.hizmetTarifesi.servisler{}.modeller{}.iscilikSaat': yok('hakedis.Tarife servis ve ürün boyutu taşımıyor', `${EKLER} §5`),
  'panelIcerik.hizmetTarifesi.servisler{}.guncelleme.tarih': yok('servise özel tarife satırının başlangıcı; sütun §5 ile gelir', `${EKLER} §5`),
  'panelIcerik.hizmetTarifesi.servisler{}.guncelleme.personel': turer('denetim.IslemKaydi.YapanAdi', 'tarife değişikliğinin işlem kaydı'),
  /* Parça iskontosu (23 Eylül 2026, lib/servisFiyat.js). Genel oran tek
     markalı kurulumda markanın oranı; servise özel oran için tablo yok. */
  /* Boş kalan eşleme nesneleri (bütün satırları silinmiş): içleri yukarıda. */
  'panelIcerik.hizmetTarifesi.modeller': yok('makineye göre satırların kabı; boş nesne', `${EKLER} §5`),
  'panelIcerik.hizmetTarifesi.servisler': yok('servise özel satırların kabı; boş nesne', `${EKLER} §5`),
  'panelIcerik.hizmetTarifesi.servisler{}.modeller': yok('servisin makineye göre satırlarının kabı; boş nesne', `${EKLER} §5`),
  'panelIcerik.parcaIskontosu.servisler': yok('servise özel oranların kabı; boş nesne', `${EKLER} §6`),
  'panelIcerik.parcaIskontosu.genel': sutun('katalog.Marka.ServisIskontoOrani', 'boşsa sistem.Ayar ServisParcaIskontoOrani (katalog.MarkaKurallari)'),
  'panelIcerik.parcaIskontosu.servisler{}': yok('servise özel iskonto için tablo yok (servis.ParcaIskontosu gerekiyor)', `${EKLER} §6`),
  /* 24.09.2026: bakiyeden ödemede ek iskonto; tek oran, bütün servislere. */
  'panelIcerik.parcaIskontosu.bakiye': yok('bakiyeden ödemede ek iskonto oranı için yer yok (katalog.Marka.BakiyeIskontoOrani ya da sistem.Ayar satırı gerekiyor)', `${EKLER} §8`),
  'panelIcerik.parcaIskontosu.guncelleme.tarih': turer('denetim.IslemKaydi.IslemZamani', 'iskonto değişikliğinin işlem kaydı'),
  'panelIcerik.parcaIskontosu.guncelleme.personel': turer('denetim.IslemKaydi.YapanAdi', 'iskonto değişikliğinin işlem kaydı'),
  'panelIcerik.roller[].izinSurumu': yok('yalnız tarayıcı deposundaki eski rol kayıtlarını bir kez taşımak için; veritabanında erisim.RolIzin satırları geçiş betiğiyle yazılır'),
  'panelIcerik.roller[].talepTurleri[]': yok('erisim.Rol.TalepTuruKodu tek tür tutuyor; birden çok tür için erisim.RolTalepTuru ara tablosu gerekiyor', `${EKLER} §3`),

  // --------------------------------------------------------- Oturumlar
  'panelOturum.personelId': sutun('personel.Personel.Kimlik'),
  'panelOturum.kullanici': sutun('erisim.Kullanici.GirisAdi'),
  'panelOturum.giris': sutun('erisim.Oturum.BaslangicZamani'),
  'panelOturum.ad': turer('personel.Personel.AdSoyad', 'oturumun kullanıcısından'),
  'panelOturum.rol': turer('erisim.Rol.Kod', 'personel.Personel.RolKimlik üzerinden; sunucu İSTEMCİNİN ROLÜNE GÜVENMEZ'),

  'servisOturum.servisId': sutun('servis.GirisHesabi.ServisKimlik'),
  'servisOturum.giris': sutun('erisim.Oturum.BaslangicZamani'),
  'servisOturum.ilkGiris': sutun('erisim.Kullanici.SifreBelirlemeGerekli'),
  'servisOturum.ad': turer('servis.Servis.Ad', 'oturumun servisinden'),
  'servisOturum.il': turer('servis.Servis.IlKodu', 'bugün ad, veritabanı kod'),
  'servisOturum.no': turer(SERVIS_NO, NUMARA_KARARI),
}

/* -------------------------------------------------------------- İşlevler

   src/backoffice/veri.js'in dışa aktardığı her işlev. Sunucuya geçerken
   her birinin ne olacağı buradan okunur:
     okuma   ortak veriyi okur        → sunucuda okuma ucu / kopya
     yazma   ortak veriyi değiştirir  → sunucuda komut ucu
     oturum  giriş ve oturum          → sunucuda kimlik uçları
     hesap   verilen veriden hesaplar → istemcide kalır, sunucuya gitmez
   Not, sunucuya geçişte dikkat isteyen işlevlerde. */

export const ISLEVLER = {
  rolleriGetir: 'okuma', rolBilgi: 'hesap', izinli: 'hesap', rolunTalepleri: 'hesap', rolunTurleri: 'hesap',
  rolunPersoneli: 'okuma', rolEkle: 'yazma', rolGuncelle: 'yazma', rolSil: 'yazma',
  personelGetir: 'okuma', kullaniciAdiOner: 'hesap', personelBaslat: 'yazma',
  personelEkle: 'yazma', personelGuncelle: 'yazma', personelSil: 'yazma',
  backofficeGiris: 'oturum', oturumGetir: 'oturum', oturumKapat: 'oturum',
  sifreTalepleriGetir: 'okuma', sifreTalebiOlustur: 'yazma', sifreJetonuGecerli: 'okuma',
  sifreJetonuKullan: 'yazma',
  durumBilgi: 'hesap', talepDurumlari: 'hesap', elleSecilebilirDurumlar: 'hesap',
  talepleriGetir: 'okuma', talepDurumDegistir: 'yazma', talebiBayiyeAta: 'yazma',
  durumGecisiEngeli: { tur: 'hesap', not: 'fiyat teklifinin durum kapıları; sunucu aynı kuralı uygulamalı' },
  serviseBildir: 'yazma', servisBildirimleri: 'okuma',
  bayiAtamasiniKaldir: 'yazma', talepNotEkle: 'yazma', musteriyeBildir: 'yazma',
  gonderimGecikti: 'hesap', gonderimGecikmeSaati: 'hesap', gecikmisMi: 'hesap',
  talepKapat: 'yazma', talepIptal: 'yazma', talepTeklifVer: 'yazma',
  teklifBekliyorMu: 'hesap', teklifBeklemeGunu: 'hesap', odemeOnayla: 'yazma',
  hakkedisIlerlemeEngeli: 'hesap', parcaIlerlemeEngeli: 'hesap',
  duyurulariGetir: 'okuma', duyuruYayinla: 'yazma', duyuruSil: 'yazma',
  musterininDigerTalepleri: 'okuma', talepPlanla: 'yazma',
  musterileriGetir: 'okuma', musteriGuncelle: 'yazma',
  numaraTalepleriGetir: 'okuma', seriCakismasiMi: 'hesap', eskiHesapBilgisi: 'okuma',
  seriDogruMu: 'hesap', numaraDogruMu: 'hesap', hesapBirlesmeOzeti: 'okuma',
  numaraTalebiKarar: 'yazma',
  geriBildirimGetir: 'okuma', geriBildirimNotEkle: 'yazma', geriBildirimOkundu: 'yazma',
  servisleriGetirBackoffice: 'okuma',
  servisleriYaz: { tur: 'yazma', not: 'bütün listeyi yazıyor; sunucuda satır satır komuta dönmeli' },
  bayileriGetirBackoffice: 'okuma',
  bayileriYaz: { tur: 'yazma', not: 'bütün listeyi yazıyor; sunucuda satır satır komuta dönmeli' },
  bayileriSifirla: 'yazma',
  parcaDuzeltmeleriGetir: 'okuma',
  /* Hizmet ücreti ve parça iskontosu (23 Eylül 2026). */
  hizmetTarifesiGetir: 'okuma',
  servisinTarifesi: { tur: 'okuma', not: 'katman sırası servis+ürün > servis > ürün > genel (lib/servisTarifesi.js); hakedis.HakEdisHesapla aynı sırayla okumalı (VT-TASARIM-EKLERI §5)' },
  genelTarifeyiKaydet: { tur: 'yazma', not: 'hakedis.Tarife: açık genel satıra bitiş tarihi, yeni satır; "özel ücretler de değişsin" servis satırlarını kapatır; ürün boyutu §5' },
  servisTarifesiniKaydet: { tur: 'yazma', not: 'hakedis.Tarife servis satırları; ServisKimlik sütunu gerekiyor (VT-TASARIM-EKLERI §5)' },
  parcaIskontosuGetir: 'okuma',
  servisinIskontosu: 'okuma',
  genelIskontoyuKaydet: { tur: 'yazma', not: 'katalog.Marka.ServisIskontoOrani; uygulama rolünün katalog.* yazma izni yok (V0015) — parcaDuzeltmesiYaz ile aynı veritabanı kararı' },
  servisIskontosunuKaydet: { tur: 'yazma', not: 'servise özel iskonto tablosu yok (VT-TASARIM-EKLERI §6)' },
  /* 24.09.2026: bakiyeden ödemede ek iskonto. */
  bakiyeIskontosuGetir: 'okuma',
  bakiyeIskontosunuKaydet: { tur: 'yazma', not: 'ek iskonto oranı için sütun yok; değişince bütün servislere bildirim (VT-TASARIM-EKLERI §8)' },
  parcaDuzeltmesiYaz: { tur: 'yazma', not: 'katalog.* tablolarına yazmak istiyor; uygulama rolü bunlara yazamaz (V0015) — veritabanı kararı gerekir' },
  fiyatListesiYayinlandi: { tur: 'yazma', not: 'yalnız işlem kaydı (denetim.IslemKaydi); listenin kendisini sunucu yazar → katalog.FiyatListesi + FiyatListesiSatiri (sunucu-taklidi/fiyat-listesi-yayini.mjs sözleşmesi); uygulama rolünün katalog.* yazma izni yok (V0015) — parcaDuzeltmesiYaz ile aynı veritabanı kararı' },
  servisinTalepleri: 'okuma', destekTalepEt: 'yazma', servisKaydiGonder: 'yazma',
  hakkedisDuzelt: 'yazma', hakkedisOnayla: 'yazma', hakkedisReddet: 'yazma',
  servisParcasiGonderildi: 'yazma', servisParcaSiparisi: 'yazma', servisinSiparisleri: 'okuma',
  cariHareketleri: 'okuma',
  cariHareketEkle: { tur: 'yazma', not: 'bugün yalnız alacak (hak ediş) ve borç (parça siparişi) yazıyor; ödeme yazan bir yol yok, veritabanında YonKodu ile hazır' },
  cariBakiye: 'okuma',
  servisHesabiYaz: 'yazma', servisHesabiKapat: 'yazma',
  servisGirisi: 'oturum', servisOturumuGetir: 'oturum', servisOturumuKapat: 'oturum',
  servisSifresiniDegistir: 'oturum',
  servisSifreTalepleriGetir: 'okuma', servisSifreTalebiAc: 'yazma', servisSifreTalebiKapat: 'yazma',
  makineKayitlariGetir: 'okuma', destekOturumlariGetir: 'okuma',
  makineAtamasiniKaydet: { tur: 'yazma', not: 'backoffice Kayıtlı Makineler ataması: servis → makine.MakineServisAtamasi (YapanTuruKodu personel), bayi → makine.MakineSatisi.SaticiBayiKimlik; makinenin servisi değişince müşteriye bildirim.Bildirim (TurKodu makine)' },
  islemKaydiGetir: 'okuma', islemYaz: 'yazma',
}
