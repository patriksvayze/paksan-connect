-- giris: uygulama
/* ==========================================================================
   S02 — uçtan uca senaryo (tasarim.md 7.4, adım kodları SN-01 … SN-18)

   Müşterinin kaydından hak edişin ödenmesine kadar bütün zincir, API'nin
   yazdığı sırayla. Her adım sistem.YapanAyarla çağırır ve kendi işleminde
   COMMIT edilir: gerçekte her adım bir istektir, bir işlemdir. Hepsi tek
   işlemde olsaydı hata yolu adımları (SN-08'in 51042 denemesi, SN-13'ün
   2601'i, SN-18'in 2601'i) işlemi bozar ve senaryo oradan sürdürülemezdi;
   o adımlar bu yüzden kendi işlemlerinde açılıp geri alınır.

   SENARYO VERİSİ KALIR. S05 (bulunabilirlik) gerçek bir talep zinciri
   üzerinde çalışır; ES-20 parmak izi yalnız şemaya bakar.

   BEKLENTİ TUTMAZSA: THROW 59999, N'<adım kodu>: beklenen <no>, gelen <no>'
   ya da sayım/tutar farkını söyleyen ileti (tasarim.md 6.6).
   ========================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Adim      nvarchar(20);
DECLARE @Beklenen  int;
DECLARE @Gelen     int;
DECLARE @Mesaj     nvarchar(2048);
DECLARE @HataMetni nvarchar(2048);
DECLARE @Sayi      int;
DECLARE @Tutar     decimal(18,2);
DECLARE @Metin     nvarchar(400);
DECLARE @Numara    nvarchar(10);

/* Sabit kimlikler: adımlar birbirini bunlarla bulur. */
DECLARE @Hesap     uniqueidentifier = '5A020001-0000-4000-8000-000000000001';
DECLARE @Makine    uniqueidentifier = '5A020001-0000-4000-8000-000000000002';
DECLARE @Makine2   uniqueidentifier = '5A020001-0000-4000-8000-000000000003';
DECLARE @Talep     uniqueidentifier = '5A020001-0000-4000-8000-000000000004';
DECLARE @Ziyaret1  uniqueidentifier = '5A020001-0000-4000-8000-000000000005';
DECLARE @HakEdis   uniqueidentifier = '5A020001-0000-4000-8000-000000000006';
DECLARE @Satis     uniqueidentifier = '5A020001-0000-4000-8000-000000000007';
DECLARE @Atama     uniqueidentifier = '5A020001-0000-4000-8000-000000000008';
DECLARE @Bildirim1 uniqueidentifier = '5A020001-0000-4000-8000-000000000009';
DECLARE @Duzeltme  uniqueidentifier = '5A020001-0000-4000-8000-00000000000A';
DECLARE @Alacak    uniqueidentifier = '5A020001-0000-4000-8000-00000000000B';
DECLARE @Kod       uniqueidentifier = '5A020001-0000-4000-8000-00000000000C';
DECLARE @Foto1     uniqueidentifier = '5A020001-0000-4000-8000-00000000000D';
DECLARE @Foto2     uniqueidentifier = '5A020001-0000-4000-8000-00000000000E';
DECLARE @Ses       uniqueidentifier = '5A020001-0000-4000-8000-00000000000F';

DECLARE @Telefon   nvarchar(16)  = N'+905321110001';
DECLARE @Ad        nvarchar(75)  = N'Yasin';
DECLARE @Soyad     nvarchar(75)  = N'Doğanay';
DECLARE @Adres     nvarchar(500) = N'Karatay Mahallesi 118. Sokak No 7';
DECLARE @SeriNo    nvarchar(40)  = N'ORK1270202400157';

DECLARE @Bayi      uniqueidentifier;
DECLARE @Servis    uniqueidentifier;
DECLARE @Personel  uniqueidentifier;
DECLARE @PersonelAd nvarchar(150);
DECLARE @Satisci   uniqueidentifier;
DECLARE @SatisciAd nvarchar(150);
DECLARE @ServisKul uniqueidentifier;

SELECT @Bayi = Kimlik FROM bayi.Bayi WHERE KayitNo = 8;
SELECT @Servis = s.Kimlik
  FROM servis.Servis AS s
  JOIN servis.BayiBagi AS b ON b.ServisKimlik = s.Kimlik
 WHERE b.BayiKimlik = @Bayi;
SELECT @Personel = k.Kimlik, @PersonelAd = p.AdSoyad
  FROM erisim.Kullanici AS k JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
 WHERE k.GirisAdi = N'ornek.servis.masasi';
SELECT @Satisci = k.Kimlik, @SatisciAd = p.AdSoyad
  FROM erisim.Kullanici AS k JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
 WHERE k.GirisAdi = N'ornek.satis';
SELECT @ServisKul = g.KullaniciKimlik FROM servis.GirisHesabi AS g WHERE g.ServisKimlik = @Servis;

IF @Bayi IS NULL OR @Servis IS NULL OR @Personel IS NULL OR @Satisci IS NULL OR @ServisKul IS NULL
    THROW 59999, N'S02: örnek veri (bayi, bağlı servis, personel) bulunamadı', 1;
/* Senaryo veri bırakır ve adım adım COMMIT eder; yarıda kalmış bir turun
   üstüne yazılamaz. Guard hesabı sorar: ilk yazılan satır odur. */
IF EXISTS (SELECT 1 FROM musteri.Hesap WHERE Kimlik = @Hesap)
    THROW 59999, N'S02 senaryosu zaten kurulu; sınama veritabanı sıfırdan kurulmalı', 1;

/* ------------------------------------------------------------------ SN-01
   Hesap + hesap sahibi + telefon geçmişi; musteri.SifreYaz (kayıt doğrulama
   koduyla); 3 rıza olayı; cihaz (BildirimIzni = verildi). */
SET @Adim = N'SN-01';
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'musteri', @YapanHesapKimlik = @Hesap,
     @KaynakUygulamaKodu = N'connect', @UygulamaSurumu = N'0.9.14';

INSERT musteri.Hesap (Kimlik, KonumUlkeKodu, IlKodu, Adres, DurumKodu, DilKodu,
                      TelefonUlkeKodu, TelefonE164, TelefonUlusal)
VALUES (@Hesap, N'TR', 42, @Adres, N'aktif', N'tr', N'TR', @Telefon, N'5321110001');

INSERT musteri.HesapKisisi (HesapKimlik, RolKodu, Adi, Soyadi, TelefonE164, TelefonUlusal)
VALUES (@Hesap, N'hesapSahibi', @Ad, @Soyad, @Telefon, N'5321110001');

INSERT musteri.HesapTelefonGecmisi (HesapKimlik, TelefonE164) VALUES (@Hesap, @Telefon);

INSERT erisim.DogrulamaKodu (Kimlik, KodOzeti, AmacKodu, TelefonE164, HesapKimlik,
                             SonGecerlilikZamani, KullanilmaZamani)
VALUES (@Kod, 0x11, N'kayit', @Telefon, @Hesap,
        DATEADD(minute, 2, SYSUTCDATETIME()), SYSUTCDATETIME());

EXEC musteri.SifreYaz @HesapKimlik = @Hesap,
     @SifreKaydi = N'$scrypt$ln=15,r=8,p=1$czAyc2FsdA$czAyb3pldA',
     @DogrulamaKoduKimlik = @Kod;

INSERT kvkk.RizaOlayi (HesapKimlik, MetinKodu, Surum, DilKodu, SecimKodu, KanalKodu)
VALUES (@Hesap, N'aydinlatma',  N'1.0', N'tr', N'okundu', N'connectKayit'),
       (@Hesap, N'acikRiza',    N'1.0', N'tr', N'onay',   N'connectKayit'),
       (@Hesap, N'ticariIleti', N'1.0', N'tr', N'ret',    N'connectKayit');

INSERT bildirim.Cihaz (PlatformKodu, UygulamaKodu, BildirimIzniKodu, DilKodu, HesapKimlik,
                       IzinZamani, OlusmaZamani)
VALUES (N'android', N'connect', N'verildi', N'tr', @Hesap, SYSUTCDATETIME(), SYSUTCDATETIME());
INSERT denetim.IslemKaydi (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik,
                           YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
VALUES (N'hesapAcildi', N'hesap', @Hesap, N'musteri', @Hesap, N'connect');

SELECT @Sayi = COUNT(*) FROM kvkk.GuncelRiza WHERE HesapKimlik = @Hesap;
IF @Sayi <> 3
BEGIN
    SET @Mesaj = CONCAT(@Adim, N': kvkk.GuncelRiza 3 satır olmalıydı, ', @Sayi);
    ROLLBACK TRANSACTION; THROW 59999, @Mesaj, 1;
END;
IF NOT EXISTS (SELECT 1 FROM musteri.Hesap WHERE Kimlik = @Hesap AND SifreKaydi IS NOT NULL)
BEGIN
    SET @Mesaj = CONCAT(@Adim, N': şifre kaydı yazılmadı');
    ROLLBACK TRANSACTION; THROW 59999, @Mesaj, 1;
END;
COMMIT TRANSACTION;

/* ------------------------------------------------------------------ SN-02
   Makine, sahiplik, kayıt olayı; personelin "Satan Bayi" girişi
   (MakineSatisi paksanBayiye) → MakineninBayisi bayiyi, MakineninServisi
   bayiServisi'ni döndürür; servise atama → makineAtamasi; atama bitince
   → bayiServisi; satış iptal edilince bayi yok; yeniden girilir. */
SET @Adim = N'SN-02';
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'musteri', @YapanHesapKimlik = @Hesap,
     @KaynakUygulamaKodu = N'connect', @UygulamaSurumu = N'0.9.14';

INSERT makine.Makine (Kimlik, SeriNo, SeriNoYazildigiGibi, MarkaKodu, UrunKodu,
                      SeridenUretimYili, SeriBicimeUygun, OlusmaKaynagiKodu,
                      YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
VALUES (@Makine, @SeriNo, @SeriNo, N'paksan', N'orkinos-1270', 2024, 1, N'musteri',
        N'musteri', @Hesap, N'connect');

INSERT makine.MakineSahipligi (MakineKimlik, HesapKimlik, KaynakKodu,
                               YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
VALUES (@Makine, @Hesap, N'musteri', N'musteri', @Hesap, N'connect');

INSERT makine.KayitOlayi (MakineKimlik, KaynakKodu, HesapKimlik, KonumIlKodu,
                          YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
VALUES (@Makine, N'musteri', @Hesap, 42, N'musteri', @Hesap, N'connect');
INSERT denetim.IslemKaydi (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik,
                           YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
VALUES (N'makineKaydedildi', N'makine', @Makine, N'musteri', @Hesap, N'connect');
COMMIT TRANSACTION;

/* Personel "Satan Bayi"yi girer: fatura tarihi yok, doğrulama bekliyor,
   marka garantisi (2 yıl) satıra kopyalanır. */
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Satisci,
     @YapanAdi = @SatisciAd, @KaynakUygulamaKodu = N'backoffice';
INSERT makine.MakineSatisi (Kimlik, MakineKimlik, SatisTuruKodu, AliciBayiKimlik,
                            FaturaTarihi, GarantiYil, GarantiBaslangicEsasiKodu,
                            KaynakKodu, DogrulamaDurumuKodu,
                            YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
SELECT @Satis, @Makine, N'paksanBayiye', @Bayi,
       NULL, m.GarantiYil, m.GarantiBaslangicEsasiKodu,
       N'personel', N'bekliyor',
       N'personel', @Satisci, @SatisciAd, N'backoffice'
  FROM katalog.Marka AS m WHERE m.Kod = N'paksan';
INSERT denetim.IslemKaydi (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik,
                           YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (N'makineSatisiKaydedildi', N'makine', @Makine,
        N'personel', @Satisci, @SatisciAd, N'backoffice');
COMMIT TRANSACTION;

SELECT @Metin = CONCAT(CONVERT(nvarchar(36), b.BayiKimlik), N'/', s.ServisKaynagiKodu)
  FROM makine.MakineninBayisi AS b
  JOIN makine.MakineninServisi AS s ON s.MakineKimlik = b.MakineKimlik
 WHERE b.MakineKimlik = @Makine;
IF @Metin <> CONCAT(CONVERT(nvarchar(36), @Bayi), N'/bayiServisi')
BEGIN SET @Mesaj = CONCAT(@Adim, N': satıştan sonra beklenen bayi/bayiServisi, gelen ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

/* Makineye doğrudan servis atanır → zincir makineAtamasi'na döner. */
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
INSERT makine.MakineServisAtamasi (Kimlik, MakineKimlik, MarkaKodu, ServisKimlik, KaynakKodu,
                                   YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Atama, @Makine, N'paksan', @Servis, N'personel',
        N'personel', @Personel, @PersonelAd, N'backoffice');
COMMIT TRANSACTION;

SELECT @Metin = ServisKaynagiKodu FROM makine.MakineninServisi WHERE MakineKimlik = @Makine;
IF @Metin <> N'makineAtamasi'
BEGIN SET @Mesaj = CONCAT(@Adim, N': atamadan sonra beklenen makineAtamasi, gelen ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

/* Atama bitirilir → zincir bayinin servisine düşer. */
BEGIN TRANSACTION;
UPDATE makine.MakineServisAtamasi
   SET BitisZamani = SYSUTCDATETIME(), BitirenKullaniciKimlik = @Personel, BitirenAdi = @PersonelAd
 WHERE Kimlik = @Atama;
COMMIT TRANSACTION;

SELECT @Metin = ServisKaynagiKodu FROM makine.MakineninServisi WHERE MakineKimlik = @Makine;
IF @Metin <> N'bayiServisi'
BEGIN SET @Mesaj = CONCAT(@Adim, N': atama bitince beklenen bayiServisi, gelen ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

/* Satış iptal edilir → bayi kalmaz; sonra yeniden girilir. */
BEGIN TRANSACTION;
UPDATE makine.MakineSatisi SET IptalZamani = SYSUTCDATETIME() WHERE Kimlik = @Satis;
COMMIT TRANSACTION;

IF EXISTS (SELECT 1 FROM makine.MakineninBayisi WHERE MakineKimlik = @Makine)
BEGIN SET @Mesaj = CONCAT(@Adim, N': satış iptal edilince bayi hâlâ görünüyor'); THROW 59999, @Mesaj, 1; END;
SELECT @Metin = ServisKaynagiKodu FROM makine.MakineninServisi WHERE MakineKimlik = @Makine;
IF @Metin IS NOT NULL
BEGIN SET @Mesaj = CONCAT(@Adim, N': bayi yokken servis kaynağı ', @Metin); THROW 59999, @Mesaj, 1; END;

BEGIN TRANSACTION;
UPDATE makine.MakineSatisi SET IptalZamani = NULL WHERE Kimlik = @Satis;
COMMIT TRANSACTION;

IF NOT EXISTS (SELECT 1 FROM makine.MakineninBayisi WHERE MakineKimlik = @Makine AND BayiKimlik = @Bayi)
BEGIN SET @Mesaj = CONCAT(@Adim, N': satış geri alınınca bayi dönmedi'); THROW 59999, @Mesaj, 1; END;

/* ----------------------------------------------------------------- SN-02b
   Servisim elle kaydı: ikinci makine, KaynakKodu servis, atama yazılmaz →
   MakineninServisi boş; kontrol görünümü makineyi kaydeden servisle listeler;
   MakineKarti.SahipBilgisininKaynagi = kayitBeyani. */
SET @Adim = N'SN-02b';
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'servis', @YapanKullaniciKimlik = @ServisKul,
     @YapanAdi = N'<Codex metni: S02 servis teknisyeni>', @KaynakUygulamaKodu = N'servisim';
INSERT makine.Makine (Kimlik, SeriNo, MarkaKodu, UrunKodu, OlusmaKaynagiKodu,
                      YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Makine2, N'ORK1270202400158', N'paksan', N'orkinos-1270', N'servis',
        N'servis', @ServisKul, N'<Codex metni: S02 servis teknisyeni>', N'servisim');
/* Sahiplik satırı YAZILMAZ: servis makineyi sahibinin ADIYLA kaydeder
   (KayitOlayi.BeyanAdi), hesabına bağlamaz — müşterinin Connect hesabı
   olmayabilir. gorunum.MakineKarti.SahipBilgisininKaynagi bu yüzden
   kayitBeyani döner; sahiplik satırı yazılsaydı hesap dönerdi. Makine
   yine de gorunum.KontrolServisiOlmayanSahipliMakine'de görünür: o görünüm
   "sahibi olan YA DA servis tarafından kaydedilmiş" makineleri listeler. */
INSERT makine.KayitOlayi (MakineKimlik, KaynakKodu, ServisKimlik, BeyanAdi,
                          YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Makine2, N'servis', @Servis, CONCAT(@Ad, N' ', @Soyad),
        N'servis', @ServisKul, N'<Codex metni: S02 servis teknisyeni>', N'servisim');
COMMIT TRANSACTION;

IF EXISTS (SELECT 1 FROM makine.MakineninServisi WHERE MakineKimlik = @Makine2 AND ServisKimlik IS NOT NULL)
BEGIN SET @Mesaj = CONCAT(@Adim, N': elle kayıtta servis zinciri boş olmalıydı'); THROW 59999, @Mesaj, 1; END;
/* gorunum.KontrolServisiOlmayanSahipliMakine ve gorunum.MakineKarti
   denetimleri yönetici bölümünde (uygulama rolü gorunum'da yalnız
   GecerliAyar'ı okur, Bölüm 4.2). */

/* ------------------------------------------------------------------ SN-03
   NumaraAl SRV; talep + servis talebi ayrıntısı + 2 belirti + 2 fotoğraf +
   ses; aynı işlemde bildirim ve teslimat; sonra okundu. */
SET @Adim = N'SN-03';
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'musteri', @YapanHesapKimlik = @Hesap,
     @KaynakUygulamaKodu = N'connect', @UygulamaSurumu = N'0.9.14';
EXEC sistem.NumaraAl @Onek = N'SRV', @Numara = @Numara OUTPUT;

INSERT dosya.Dosya (Kimlik, MimeTuru, BoyutBayt, IcerikOzeti, DepolamaYolu, TurKodu,
                    DepolamaSaglayiciKodu, SaklamaSinifiKodu, DurumKodu,
                    YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
VALUES (@Foto1, N'image/jpeg', 204800, 0x21, N's02/foto1.jpg', N'foto',
        N'disk', N'genel', N'hazir', N'musteri', @Hesap, N'connect'),
       (@Foto2, N'image/jpeg', 198000, 0x22, N's02/foto2.jpg', N'foto',
        N'disk', N'genel', N'hazir', N'musteri', @Hesap, N'connect'),
       (@Ses,   N'audio/mp4',   51200, 0x23, N's02/ses.m4a',  N'ses',
        N'disk', N'genel', N'hazir', N'musteri', @Hesap, N'connect');

INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu,
                    DurumKodu, Kapali, SahipKodu, MasaKodu, HesapKimlik, MakineKimlik,
                    ServisKimlik, ServisAtamaKaynagiKodu, ServisAtamaZamani,
                    KonumUlkeKodu, IlKodu, Adres, IletisimAdi, IletisimTelefonE164, IletisimTelefonUlusal,
                    SesDosyaKimlik, UlasimZamaniKodu,
                    YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu, UygulamaSurumu)
VALUES (@Talep, @Numara, N'SRV', N'servis', N'connect', N'paksan',
        N'yeni', 0, N'servis', N'servisMasasi', @Hesap, @Makine,
        @Servis, N'bayiServisi', SYSUTCDATETIME(),
        N'TR', 42, @Adres, CONCAT(@Ad, N' ', @Soyad), @Telefon, N'5321110001',
        @Ses, N'sabah',
        N'musteri', @Hesap, N'connect', N'0.9.14');

INSERT talep.ServisTalebiAyrinti (TalepKimlik, TurKodu, MakineDurumuKodu)
VALUES (@Talep, N'servis', N'sorunlu');

INSERT talep.TalepBelirtisi (TalepKimlik, BelirtiKodu)
VALUES (@Talep, N'balyaDagiliyor'), (@Talep, N'dugumAtmiyor');

INSERT talep.TalepEki (TalepKimlik, DosyaKimlik, SiraNo)
VALUES (@Talep, @Foto1, 1), (@Talep, @Foto2, 2);

INSERT bildirim.Bildirim (Kimlik, BaslikAnahtari, MetinAnahtari, AliciTuruKodu, TurKodu,
                          HesapKimlik, TalepKimlik,
                          YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
VALUES (@Bildirim1, N'bildirimler.talepAlindi', N'bildirimler.talepAlindiMetin',
        N'musteri', N'talep', @Hesap, @Talep,
        N'musteri', @Hesap, N'connect');
INSERT bildirim.Teslimat (BildirimKimlik, HesapKimlik, GonderilmeZamani)
VALUES (@Bildirim1, @Hesap, SYSUTCDATETIME());
INSERT denetim.IslemKaydi (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara,
                           YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
VALUES (N'talepOlusturuldu', N'talep', @Talep, @Numara, N'musteri', @Hesap, N'connect');
COMMIT TRANSACTION;

BEGIN TRANSACTION;
UPDATE bildirim.Teslimat SET OkunmaZamani = SYSUTCDATETIME() WHERE BildirimKimlik = @Bildirim1;
COMMIT TRANSACTION;

SELECT @Sayi = COUNT(*) FROM talep.TalepBelirtisi WHERE TalepKimlik = @Talep;
IF @Sayi <> 2
BEGIN SET @Mesaj = CONCAT(@Adim, N': belirti sayısı 2 olmalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;
IF LEFT(@Numara, 3) <> N'SRV'
BEGIN SET @Mesaj = CONCAT(@Adim, N': numara SRV ile başlamalıydı, ', @Numara); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ SN-04
   Ziyaret 1 (garanti kapısı, parca aşaması) + 2 parça satırı; talep
   parcaBekliyor, masa parcaMasasi. */
SET @Adim = N'SN-04';
DECLARE @Parca1 nvarchar(24);
DECLARE @Parca2 nvarchar(24);
SELECT @Parca1 = MIN(Kod), @Parca2 = MAX(Kod)
  FROM (SELECT TOP (2) Kod FROM katalog.Parca WHERE MarkaKodu = N'paksan' ORDER BY Kod) AS p;

BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'servis', @YapanKullaniciKimlik = @ServisKul,
     @YapanAdi = N'<Codex metni: S02 servis teknisyeni>', @KaynakUygulamaKodu = N'servisim';
INSERT talep.ServisZiyareti (Kimlik, ZiyaretNo, TalepKimlik, TurKodu, UyduKodu, MarkaKodu,
                             ServisKimlik, AsamaKodu, KapiKodu, ArizaMetni,
                             GarantiDayanagiKodu, ParcaIstemeZamani,
                             YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Ziyaret1, 1, @Talep, N'servis', N'servisZiyareti', N'paksan',
        @Servis, N'parca', N'garanti', N'<Codex metni: S02 arıza metni>',
        N'uretimYili', SYSUTCDATETIME(),
        N'servis', @ServisKul, N'<Codex metni: S02 servis teknisyeni>', N'servisim');

INSERT talep.ZiyaretParcaSatiri (ZiyaretKimlik, MarkaKodu, SiraNo, ParcaAdi, ParcaKodu, Adet)
SELECT @Ziyaret1, N'paksan', 1, p.Ad, p.Kod, 1 FROM katalog.Parca AS p
 WHERE p.MarkaKodu = N'paksan' AND p.Kod = @Parca1;
INSERT talep.ZiyaretParcaSatiri (ZiyaretKimlik, MarkaKodu, SiraNo, ParcaAdi, ParcaKodu, Adet)
SELECT @Ziyaret1, N'paksan', 2, p.Ad, p.Kod, 1 FROM katalog.Parca AS p
 WHERE p.MarkaKodu = N'paksan' AND p.Kod = @Parca2;

UPDATE talep.Talep SET DurumKodu = N'parcaBekliyor', MasaKodu = N'parcaMasasi' WHERE Kimlik = @Talep;
COMMIT TRANSACTION;

SELECT @Metin = CONCAT(DurumKodu, N'/', MasaKodu) FROM talep.Talep WHERE Kimlik = @Talep;
IF @Metin <> N'parcaBekliyor/parcaMasasi'
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen parcaBekliyor/parcaMasasi, gelen ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

/* Bölüm 1.15.6 yüklemesi (yedek parça rolü masadan, servis masası rolü
   türden görür) yönetici bölümünde gorunum.TalepListesi ile denetlenir. */

/* ------------------------------------------------------------------ SN-05
   ParcaSevki (servis türü, ziyarete bağlı); masa boşalır; aynı ziyarete
   ikinci gönderim yeni satır açmaz, son güncelleme yazılır. */
SET @Adim = N'SN-05';
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
INSERT talep.ParcaSevki (TalepKimlik, TurKodu, ZiyaretKimlik, KargoFirmasiMetni, TakipNo,
                         YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Talep, N'servis', @Ziyaret1, N'<Codex metni: S02 kargo firması>', N'S02TAKIP0001',
        N'personel', @Personel, @PersonelAd, N'backoffice');
UPDATE talep.Talep SET MasaKodu = NULL WHERE Kimlik = @Talep;
COMMIT TRANSACTION;

BEGIN TRANSACTION;
UPDATE talep.ParcaSevki
   SET TakipNo = N'S02TAKIP0002', SonGuncellemeZamani = SYSUTCDATETIME(),
       GuncelleyenKullaniciKimlik = @Personel, GuncelleyenAdi = @PersonelAd
 WHERE ZiyaretKimlik = @Ziyaret1;
COMMIT TRANSACTION;

SELECT @Sayi = COUNT(*) FROM talep.ParcaSevki WHERE ZiyaretKimlik = @Ziyaret1;
IF @Sayi <> 1
BEGIN SET @Mesaj = CONCAT(@Adim, N': ziyarete bağlı sevk satırı 1 olmalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;
IF NOT EXISTS (SELECT 1 FROM talep.ParcaSevki WHERE ZiyaretKimlik = @Ziyaret1 AND SonGuncellemeZamani IS NOT NULL)
BEGIN SET @Mesaj = CONCAT(@Adim, N': SonGuncellemeZamani yazılmadı'); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ SN-06
   Ziyaret bitti (parcaDegisimi, Km 42, işçilik 750); hak ediş bekliyor;
   HakEdisHesapla → yol 504,00 + işçilik 750,00 = 1254,00; talep
   onayBekliyor, masa servisMasasi. */
SET @Adim = N'SN-06';
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'servis', @YapanKullaniciKimlik = @ServisKul,
     @YapanAdi = N'<Codex metni: S02 servis teknisyeni>', @KaynakUygulamaKodu = N'servisim';
UPDATE talep.ServisZiyareti
   SET AsamaKodu = N'bitti', YapilanIsKodu = N'parcaDegisimi',
       Km = 42, IscilikTutari = 750, ParaBirimiKodu = N'TRY',
       SonucMetni = N'<Codex metni: S02 sonuç metni>', TamamlanmaZamani = SYSUTCDATETIME()
 WHERE Kimlik = @Ziyaret1;

INSERT hakedis.HakEdis (Kimlik, ZiyaretKimlik, TalepKimlik, ServisKimlik, MarkaKodu, SirketKodu,
                        KapiKodu, AsamaKodu, ParaBirimiKodu, DurumKodu, NetTutar)
VALUES (@HakEdis, @Ziyaret1, @Talep, @Servis, N'paksan', N'paksan',
        N'garanti', N'bitti', N'TRY', N'bekliyor', 0);
EXEC hakedis.HakEdisHesapla @HakEdisKimlik = @HakEdis;

UPDATE talep.Talep SET DurumKodu = N'onayBekliyor', MasaKodu = N'servisMasasi' WHERE Kimlik = @Talep;
COMMIT TRANSACTION;

SELECT @Metin = CONCAT(
         (SELECT CAST(Tutar AS nvarchar(20)) FROM hakedis.HakEdisKalemi WHERE HakEdisKimlik = @HakEdis AND KalemTuruKodu = N'yol'), N'/',
         (SELECT CAST(Tutar AS nvarchar(20)) FROM hakedis.HakEdisKalemi WHERE HakEdisKimlik = @HakEdis AND KalemTuruKodu = N'iscilik'), N'/',
         (SELECT CAST(NetTutar AS nvarchar(20)) FROM hakedis.HakEdis WHERE Kimlik = @HakEdis));
IF @Metin <> N'504.00/750.00/1254.00'
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen yol/işçilik/net 504.00/750.00/1254.00, gelen ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ SN-07
   PAKSAN düzeltmesi: Km 42 → 30; parçalardan biri çıkarılır, diğeri adet 2
   olur; HakEdisHesapla → NetTutar 1110,00; ZiyaretGuncelParcasi yalnız
   kalan parçayı adet 2 ile döndürür; ZiyaretParcaSatiri 2 satırıyla durur. */
SET @Adim = N'SN-07';
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
INSERT talep.ZiyaretDuzeltmesi (Kimlik, ZiyaretKimlik, MarkaKodu, Neden,
                                OncekiKm, YeniKm, OncekiIscilikTutari, YeniIscilikTutari,
                                YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Duzeltme, @Ziyaret1, N'paksan', N'<Codex metni: S02 düzeltme nedeni>',
        42, 30, 750, 750,
        N'personel', @Personel, @PersonelAd, N'backoffice');

/* Önceki taraf: ziyaretin iki satırı. */
INSERT talep.ZiyaretDuzeltmesiParcasi (DuzeltmeKimlik, TarafKodu, MarkaKodu, SiraNo, ParcaAdi, ParcaKodu, Adet)
SELECT @Duzeltme, N'onceki', z.MarkaKodu, z.SiraNo, z.ParcaAdi, z.ParcaKodu, z.Adet
  FROM talep.ZiyaretParcaSatiri AS z WHERE z.ZiyaretKimlik = @Ziyaret1;
/* Yeni taraf: yalnız ilk parça, adet 2. */
INSERT talep.ZiyaretDuzeltmesiParcasi (DuzeltmeKimlik, TarafKodu, MarkaKodu, SiraNo, ParcaAdi, ParcaKodu, Adet)
SELECT @Duzeltme, N'yeni', z.MarkaKodu, 1, z.ParcaAdi, z.ParcaKodu, 2
  FROM talep.ZiyaretParcaSatiri AS z WHERE z.ZiyaretKimlik = @Ziyaret1 AND z.ParcaKodu = @Parca1;

UPDATE talep.ServisZiyareti SET Km = 30 WHERE Kimlik = @Ziyaret1;
EXEC hakedis.HakEdisHesapla @HakEdisKimlik = @HakEdis;
COMMIT TRANSACTION;

SELECT @Tutar = NetTutar FROM hakedis.HakEdis WHERE Kimlik = @HakEdis;
IF @Tutar <> 1110.00
BEGIN SET @Mesaj = CONCAT(@Adim, N': düzeltmeden sonra NetTutar 1110,00 olmalıydı, ', @Tutar); THROW 59999, @Mesaj, 1; END;

SELECT @Sayi = COUNT(*) FROM talep.ZiyaretGuncelParcasi WHERE ZiyaretKimlik = @Ziyaret1;
IF @Sayi <> 1
BEGIN SET @Mesaj = CONCAT(@Adim, N': ZiyaretGuncelParcasi 1 satır olmalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;
IF NOT EXISTS (SELECT 1 FROM talep.ZiyaretGuncelParcasi
                WHERE ZiyaretKimlik = @Ziyaret1 AND ParcaKodu = @Parca1 AND Adet = 2)
BEGIN SET @Mesaj = CONCAT(@Adim, N': ZiyaretGuncelParcasi kalan parçayı adet 2 ile döndürmedi'); THROW 59999, @Mesaj, 1; END;
SELECT @Sayi = COUNT(*) FROM talep.ZiyaretParcaSatiri WHERE ZiyaretKimlik = @Ziyaret1;
IF @Sayi <> 2
BEGIN SET @Mesaj = CONCAT(@Adim, N': servisin bildirdiği ZiyaretParcaSatiri 2 satır kalmalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ SN-08
   Onay (SatirSurumu ile): KDV %20 = 222,00, tevkifat 44,40, stopaj 0;
   hareket 1287,60 (1287,00 denemesi 51042); talep kapandi; Kapanis
   (hakEdisOnayi). */
SET @Adim = N'SN-08';
DECLARE @Surum binary(8);
SELECT @Surum = SatirSurumu FROM hakedis.HakEdis WHERE Kimlik = @HakEdis;

BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
UPDATE hakedis.HakEdis
   SET DurumKodu = N'onaylandi', OnayZamani = SYSUTCDATETIME(),
       OnaylayanKullaniciKimlik = @Personel, OnaylayanAdi = @PersonelAd,
       KdvOrani = 0.2000, KdvTutari = 222.00,
       TevkifatOrani = 0.2000, TevkifatTutari = 44.40,
       StopajOrani = 0.0000, StopajTutari = 0.00
 WHERE Kimlik = @HakEdis AND SatirSurumu = @Surum AND DurumKodu = N'bekliyor';
SET @Sayi = @@ROWCOUNT;
IF @Sayi <> 1
BEGIN
    SET @Mesaj = CONCAT(@Adim, N': SatirSurumu ile onay 1 satır güncellemeliydi, ', @Sayi);
    ROLLBACK TRANSACTION; THROW 59999, @Mesaj, 1;
END;
COMMIT TRANSACTION;

/* Yanlış tutarlı hareket denemesi: kendi işleminde, geri alınır. */
SET @Beklenen = 51042; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT hakedis.ServisHesapHareketi (ServisKimlik, SirketKodu, MarkaKodu, HareketTuruKodu, YonKodu,
                                        ParaBirimiKodu, Tutar, HakEdisKimlik,
                                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Servis, N'paksan', N'paksan', N'hakEdisAlacagi', N'alacak', N'TRY', 1287.00, @HakEdis,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N' (yanlış tutar): beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
INSERT hakedis.ServisHesapHareketi (Kimlik, ServisKimlik, SirketKodu, MarkaKodu, HareketTuruKodu, YonKodu,
                                    ParaBirimiKodu, Tutar, HakEdisKimlik,
                                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Alacak, @Servis, N'paksan', N'paksan', N'hakEdisAlacagi', N'alacak', N'TRY', 1287.60, @HakEdis,
        N'personel', @Personel, @PersonelAd, N'backoffice');
INSERT talep.Kapanis (TalepKimlik, KapanisTuruKodu, ZiyaretKimlik, YapilanIsKodu, UcretDurumuKodu,
                      YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Talep, N'hakEdisOnayi', @Ziyaret1, N'parcaDegisimi', N'garanti',
        N'personel', @Personel, @PersonelAd, N'backoffice');
INSERT denetim.IslemKaydi (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara,
                           YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (N'hakEdisOnaylandi', N'hakEdis', @HakEdis, @Numara,
        N'personel', @Personel, @PersonelAd, N'backoffice');
UPDATE talep.Talep SET DurumKodu = N'kapandi', Kapali = 1, KapanmaZamani = SYSUTCDATETIME(), MasaKodu = NULL
 WHERE Kimlik = @Talep;
COMMIT TRANSACTION;

SELECT @Tutar = Tutar FROM hakedis.ServisHesapHareketi WHERE Kimlik = @Alacak;
IF @Tutar <> 1287.60
BEGIN SET @Mesaj = CONCAT(@Adim, N': cari etkisi 1287,60 olmalıydı, ', @Tutar); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ SN-09
   Durum bildirimi (DegerlerJson ile) + teslimat; sonra okundu. */
SET @Adim = N'SN-09';
DECLARE @Bildirim2 uniqueidentifier = '5A020001-0000-4000-8000-000000000010';
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
INSERT bildirim.Bildirim (Kimlik, BaslikAnahtari, MetinAnahtari, DegerlerJson, AliciTuruKodu, TurKodu,
                          HesapKimlik, TalepKimlik,
                          YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Bildirim2, N'bildirimler.durumBaslik', N'bildirimler.durumMetin',
        CONCAT(N'{"numara":"', @Numara, N'","durum":"kapandi"}'),
        N'musteri', N'talep', @Hesap, @Talep,
        N'personel', @Personel, @PersonelAd, N'backoffice');
INSERT bildirim.Teslimat (BildirimKimlik, HesapKimlik, GonderilmeZamani)
VALUES (@Bildirim2, @Hesap, SYSUTCDATETIME());
COMMIT TRANSACTION;

BEGIN TRANSACTION;
UPDATE bildirim.Teslimat SET OkunmaZamani = SYSUTCDATETIME() WHERE BildirimKimlik = @Bildirim2;
COMMIT TRANSACTION;

IF NOT EXISTS (SELECT 1 FROM bildirim.Bildirim WHERE Kimlik = @Bildirim2 AND ISJSON(DegerlerJson) = 1)
BEGIN SET @Mesaj = CONCAT(@Adim, N': DegerlerJson geçerli JSON değil'); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ SN-10
   Müşteri talebi yeniden açar; sonra randevu planlanır. */
SET @Adim = N'SN-10';
DECLARE @Bildirim3 uniqueidentifier = '5A020001-0000-4000-8000-000000000011';
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'musteri', @YapanHesapKimlik = @Hesap,
     @KaynakUygulamaKodu = N'connect', @UygulamaSurumu = N'0.9.14';
INSERT talep.YenidenAcma (TalepKimlik, OncekiDurumKodu, Aciklama,
                          YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
VALUES (@Talep, N'kapandi', N'<Codex metni: S02 yeniden açma açıklaması>',
        N'musteri', @Hesap, N'connect');
UPDATE talep.Talep SET DurumKodu = N'yeni', Kapali = 0, KapanmaZamani = NULL, MasaKodu = N'servisMasasi'
 WHERE Kimlik = @Talep;
COMMIT TRANSACTION;

SELECT @Metin = CONCAT(DurumKodu, N'/', Kapali, N'/', ISNULL(CONVERT(nvarchar(30), KapanmaZamani), N'-'))
  FROM talep.Talep WHERE Kimlik = @Talep;
IF @Metin <> N'yeni/0/-'
BEGIN SET @Mesaj = CONCAT(@Adim, N': yeniden açmadan sonra beklenen yeni/0/-, gelen ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'servis', @YapanKullaniciKimlik = @ServisKul,
     @YapanAdi = N'<Codex metni: S02 servis teknisyeni>', @KaynakUygulamaKodu = N'servisim';
INSERT talep.Randevu (TalepKimlik, PlanlananZamani, SaatBelirtildi, MusteriyleGorusuldu, IsTanimi,
                      YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Talep, DATEADD(day, 2, SYSUTCDATETIME()), 1, 1, N'<Codex metni: S02 randevu iş tanımı>',
        N'servis', @ServisKul, N'<Codex metni: S02 servis teknisyeni>', N'servisim');
INSERT bildirim.Bildirim (Kimlik, BaslikAnahtari, MetinAnahtari, AliciTuruKodu, TurKodu,
                          HesapKimlik, TalepKimlik,
                          YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Bildirim3, N'bildirimler.randevuBaslik', N'bildirimler.randevuMetin',
        N'musteri', N'randevu', @Hesap, @Talep,
        N'servis', @ServisKul, N'<Codex metni: S02 servis teknisyeni>', N'servisim');
INSERT bildirim.Teslimat (BildirimKimlik, HesapKimlik, GonderilmeZamani)
VALUES (@Bildirim3, @Hesap, SYSUTCDATETIME());
UPDATE talep.Talep SET DurumKodu = N'planlandi' WHERE Kimlik = @Talep;
COMMIT TRANSACTION;

/* ------------------------------------------------------------------ SN-11
   Servis garanti dışı kapatır: yeni hak ediş yok. */
SET @Adim = N'SN-11';
SELECT @Sayi = COUNT(*) FROM hakedis.HakEdis WHERE TalepKimlik = @Talep;
IF @Sayi <> 1
BEGIN SET @Mesaj = CONCAT(@Adim, N': kapanıştan önce hak ediş 1 olmalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;

BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'servis', @YapanKullaniciKimlik = @ServisKul,
     @YapanAdi = N'<Codex metni: S02 servis teknisyeni>', @KaynakUygulamaKodu = N'servisim';
INSERT talep.Kapanis (TalepKimlik, KapanisTuruKodu, UcretDurumuKodu, UcretTutari, ParaBirimiKodu,
                      YapilanIsMetni,
                      YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Talep, N'garantiDisi', N'musteriOdedi', 1500, N'TRY',
        N'<Codex metni: S02 yapılan iş metni>',
        N'servis', @ServisKul, N'<Codex metni: S02 servis teknisyeni>', N'servisim');
UPDATE talep.Talep SET DurumKodu = N'kapandi', Kapali = 1, KapanmaZamani = SYSUTCDATETIME(), MasaKodu = NULL
 WHERE Kimlik = @Talep;
COMMIT TRANSACTION;

SELECT @Sayi = COUNT(*) FROM hakedis.HakEdis WHERE TalepKimlik = @Talep;
IF @Sayi <> 1
BEGIN SET @Mesaj = CONCAT(@Adim, N': garanti dışı kapanış yeni hak ediş açmamalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ SN-12
   Müşterinin yedek parça talebi: fatura bilgisi (şifreli TC), PAKSAN
   doğrulaması, dekont, ödeme onayı, sevk, kapanış. */
SET @Adim = N'SN-12';
DECLARE @ParcaTalep uniqueidentifier = '5A020001-0000-4000-8000-000000000012';
DECLARE @DekontDosya uniqueidentifier = '5A020001-0000-4000-8000-000000000013';
DECLARE @ParcaNumara nvarchar(10);
DECLARE @TcSifreli varbinary(512) = $(PAKSAN_SINAMA_TC_SIFRELI);
DECLARE @TcOzeti   binary(32)     = $(PAKSAN_SINAMA_TC_OZETI);
DECLARE @TcMaskeli nvarchar(40)   = N'$(PAKSAN_SINAMA_TC_MASKELI)';
DECLARE @TcNo      nvarchar(11)   = N'$(PAKSAN_SINAMA_TC_NO)';
DECLARE @Iban      nvarchar(34)   = N'$(PAKSAN_SINAMA_IBAN)';
DECLARE @AnahtarNo tinyint        = $(PAKSAN_SINAMA_ANAHTAR_NO);

BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'musteri', @YapanHesapKimlik = @Hesap,
     @KaynakUygulamaKodu = N'connect', @UygulamaSurumu = N'0.9.14';
EXEC sistem.NumaraAl @Onek = N'YPR', @Numara = @ParcaNumara OUTPUT;

INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu,
                    DurumKodu, Kapali, SahipKodu, MasaKodu, HesapKimlik, MakineKimlik,
                    KonumUlkeKodu, IlKodu, Adres,
                    YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
VALUES (@ParcaTalep, @ParcaNumara, N'YPR', N'parca', N'connect', N'paksan',
        N'yeni', 0, N'paksan', N'parcaMasasi', @Hesap, @Makine,
        N'TR', 42, @Adres,
        N'musteri', @Hesap, N'connect');

/* Liste KDV hariç: ara toplam 1000, KDV %20 = 200, genel toplam 1200. */
INSERT talep.ParcaTalebiAyrinti (TalepKimlik, TurKodu, OdemeYontemiKodu, SirketKodu,
                                 FiyatListesiMarkaKodu, FiyatListesiKodu, ParaBirimiKodu,
                                 KdvOrani, ListeKdvHaric, AraToplam, KdvTutari, GenelToplam,
                                 TeslimatAdresi)
VALUES (@ParcaTalep, N'parca', N'havale', N'paksan',
        N'paksan', N'2026-07-1', N'TRY',
        0.2000, 1, 1000.00, 200.00, 1200.00,
        @Adres);

INSERT talep.ParcaSatiri (TalepKimlik, MarkaKodu, SiraNo, ParcaAdi, KatalogDisi, ParcaKodu, Adet, BirimFiyat, Tutar)
SELECT @ParcaTalep, N'paksan', 1, p.Ad, 0, p.Kod, 2, 300.00, 600.00
  FROM katalog.Parca AS p WHERE p.MarkaKodu = N'paksan' AND p.Kod = @Parca1;
INSERT talep.ParcaSatiri (TalepKimlik, MarkaKodu, SiraNo, ParcaAdi, KatalogDisi, ParcaKodu, Adet, BirimFiyat, Tutar)
SELECT @ParcaTalep, N'paksan', 2, p.Ad, 0, p.Kod, 1, 400.00, 400.00
  FROM katalog.Parca AS p WHERE p.MarkaKodu = N'paksan' AND p.Kod = @Parca2;
INSERT talep.ParcaSatiri (TalepKimlik, MarkaKodu, SiraNo, ParcaAdi, KatalogDisi, ParcaKodu, Adet, Aciklama)
VALUES (@ParcaTalep, N'paksan', 3, N'<Codex metni: S02 katalog dışı parça>', 1, NULL, NULL,
        N'<Codex metni: S02 katalog dışı parça açıklaması>');

INSERT talep.FaturaBilgisi (TalepKimlik, TurKodu, UyduKodu, FaturaTuruKodu, AdSoyad,
                            TcNoSifreli, TcNoOzeti, TcNoMaskeli, AnahtarNo,
                            KonumUlkeKodu, IlKodu, Adres, TelefonE164, TelefonUlusal)
VALUES (@ParcaTalep, N'parca', N'faturaBilgisi', N'kendisi', CONCAT(@Ad, N' ', @Soyad),
        @TcSifreli, @TcOzeti, @TcMaskeli, @AnahtarNo,
        N'TR', 42, @Adres, @Telefon, N'5321110001');
COMMIT TRANSACTION;

/* PAKSAN tutarı doğrular: kargo eklenir, ödenecek tutar ve son ödeme günü yazılır. */
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
UPDATE talep.ParcaTalebiAyrinti
   SET KargoTutari = 150.00, OdenecekTutar = 1350.00,
       SonOdemeTarihi = CONVERT(date, DATEADD(day, 7, SYSUTCDATETIME())),
       TutarDogrulamaZamani = SYSUTCDATETIME(),
       TutarDogrulayanKullaniciKimlik = @Personel, TutarDogrulayanAdi = @PersonelAd
 WHERE TalepKimlik = @ParcaTalep;
UPDATE talep.Talep SET DurumKodu = N'odemeBekliyor' WHERE Kimlik = @ParcaTalep;
COMMIT TRANSACTION;

/* Ödeme hesapları talebin şirketinden okunur. Tohumda banka hesabı yoktur
   (Bölüm 8'in açık maddesi); sınanan şey yolun kurulu olmasıdır. */
SELECT @Sayi = COUNT(*)
  FROM talep.ParcaTalebiAyrinti AS p
  JOIN sirket.BankaHesabi AS b
    ON b.SirketKodu = p.SirketKodu AND b.ParaBirimiKodu = p.ParaBirimiKodu AND b.Aktif = 1
 WHERE p.TalepKimlik = @ParcaTalep;
IF @Sayi <> (SELECT COUNT(*) FROM sirket.BankaHesabi WHERE SirketKodu = N'paksan' AND ParaBirimiKodu = N'TRY' AND Aktif = 1)
BEGIN SET @Mesaj = CONCAT(@Adim, N': ödeme hesabı yolu talebin şirketini vermedi'); THROW 59999, @Mesaj, 1; END;

/* Dekont yüklenir, ödeme onaylanır. */
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'musteri', @YapanHesapKimlik = @Hesap,
     @KaynakUygulamaKodu = N'connect', @UygulamaSurumu = N'0.9.14';
INSERT dosya.Dosya (Kimlik, MimeTuru, BoyutBayt, IcerikOzeti, DepolamaYolu, TurKodu,
                    DepolamaSaglayiciKodu, SaklamaSinifiKodu, DurumKodu,
                    YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
VALUES (@DekontDosya, N'application/pdf', 88000, 0x31, N's02/dekont.pdf', N'pdf',
        N'disk', N'dekont', N'hazir', N'musteri', @Hesap, N'connect');
INSERT talep.Dekont (TalepKimlik, DosyaKimlik,
                     YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
VALUES (@ParcaTalep, @DekontDosya, N'musteri', @Hesap, N'connect');
COMMIT TRANSACTION;

BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
INSERT talep.OdemeOnayi (TalepKimlik, ParaBirimiKodu, OnaylananTutar,
                         YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
SELECT @ParcaTalep, p.ParaBirimiKodu, p.OdenecekTutar,
       N'personel', @Personel, @PersonelAd, N'backoffice'
  FROM talep.ParcaTalebiAyrinti AS p WHERE p.TalepKimlik = @ParcaTalep;
UPDATE talep.Talep SET DurumKodu = N'incelemede' WHERE Kimlik = @ParcaTalep;
INSERT denetim.IslemKaydi (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara,
                           YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (N'odemeOnaylandi', N'talep', @ParcaTalep, @ParcaNumara,
        N'personel', @Personel, @PersonelAd, N'backoffice');
COMMIT TRANSACTION;

/* Parça gönderilir, talep kapanır. */
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
INSERT talep.ParcaSevki (TalepKimlik, TurKodu, ZiyaretKimlik, KargoFirmasiMetni, TakipNo,
                         YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@ParcaTalep, N'parca', NULL, N'<Codex metni: S02 kargo firması>', N'S02TAKIP0003',
        N'personel', @Personel, @PersonelAd, N'backoffice');
INSERT talep.Kapanis (TalepKimlik, KapanisTuruKodu,
                      YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@ParcaTalep, N'personelFormu', N'personel', @Personel, @PersonelAd, N'backoffice');
INSERT denetim.IslemKaydi (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara,
                           YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (N'parcaGonderildi', N'talep', @ParcaTalep, @ParcaNumara,
        N'personel', @Personel, @PersonelAd, N'backoffice');
UPDATE talep.Talep SET DurumKodu = N'kapandi', Kapali = 1, KapanmaZamani = SYSUTCDATETIME(), MasaKodu = NULL
 WHERE Kimlik = @ParcaTalep;
COMMIT TRANSACTION;

IF NOT EXISTS (SELECT 1 FROM talep.FaturaBilgisi
                WHERE TalepKimlik = @ParcaTalep AND TcNoOzeti = @TcOzeti AND TcNoMaskeli = @TcMaskeli)
BEGIN SET @Mesaj = CONCAT(@Adim, N': fatura bilgisindeki TC özeti ya da maskesi tutmadı'); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ SN-13
   Servis parça siparişi: bakiye ile ödenir, kapanışta bakiye borcu yazılır;
   ikinci borç 2601. */
SET @Adim = N'SN-13';
DECLARE @Siparis uniqueidentifier = '5A020001-0000-4000-8000-000000000014';
DECLARE @Borc    uniqueidentifier = '5A020001-0000-4000-8000-000000000015';
DECLARE @SiparisNumara nvarchar(10);
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'servis', @YapanKullaniciKimlik = @ServisKul,
     @YapanAdi = N'<Codex metni: S02 servis teknisyeni>', @KaynakUygulamaKodu = N'servisim';
EXEC sistem.NumaraAl @Onek = N'SPS', @Numara = @SiparisNumara OUTPUT;
INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu,
                    DurumKodu, Kapali, SahipKodu, ServisKimlik, KonumUlkeKodu,
                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Siparis, @SiparisNumara, N'SPS', N'parca', N'servisSiparisi', N'paksan',
        N'yeni', 0, N'servis', @Servis, N'TR',
        N'servis', @ServisKul, N'<Codex metni: S02 servis teknisyeni>', N'servisim');
INSERT talep.ParcaTalebiAyrinti (TalepKimlik, TurKodu, OdemeYontemiKodu, SirketKodu,
                                 ParaBirimiKodu, KdvOrani, ListeKdvHaric,
                                 AraToplam, KdvTutari, GenelToplam)
VALUES (@Siparis, N'parca', N'bakiye', N'paksan', N'TRY', 0.2000, 1, 500.00, 100.00, 600.00);
INSERT talep.ParcaSatiri (TalepKimlik, MarkaKodu, SiraNo, ParcaAdi, KatalogDisi, ParcaKodu, Adet, BirimFiyat, Tutar)
SELECT @Siparis, N'paksan', 1, p.Ad, 0, p.Kod, 1, 500.00, 500.00
  FROM katalog.Parca AS p WHERE p.MarkaKodu = N'paksan' AND p.Kod = @Parca1;
COMMIT TRANSACTION;

BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
INSERT hakedis.ServisHesapHareketi (Kimlik, ServisKimlik, SirketKodu, HareketTuruKodu, YonKodu,
                                    ParaBirimiKodu, Tutar, ParcaTalepKimlik,
                                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
SELECT @Borc, @Servis, p.SirketKodu, N'parcaSiparisiBorcu', N'borc',
       p.ParaBirimiKodu, COALESCE(p.OdenecekTutar, p.GenelToplam), @Siparis,
       N'personel', @Personel, @PersonelAd, N'backoffice'
  FROM talep.ParcaTalebiAyrinti AS p WHERE p.TalepKimlik = @Siparis;
INSERT talep.Kapanis (TalepKimlik, KapanisTuruKodu,
                      YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Siparis, N'personelFormu', N'personel', @Personel, @PersonelAd, N'backoffice');
INSERT denetim.IslemKaydi (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara,
                           YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (N'servisSiparisiOlusturuldu', N'talep', @Siparis, @SiparisNumara,
        N'personel', @Personel, @PersonelAd, N'backoffice');
UPDATE talep.Talep SET DurumKodu = N'kapandi', Kapali = 1, KapanmaZamani = SYSUTCDATETIME()
 WHERE Kimlik = @Siparis;
COMMIT TRANSACTION;

SELECT @Tutar = Tutar FROM hakedis.ServisHesapHareketi WHERE Kimlik = @Borc;
IF @Tutar <> 600.00
BEGIN SET @Mesaj = CONCAT(@Adim, N': bakiye borcu 600,00 olmalıydı, ', @Tutar); THROW 59999, @Mesaj, 1; END;

SET @Beklenen = 2601; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT hakedis.ServisHesapHareketi (ServisKimlik, SirketKodu, HareketTuruKodu, YonKodu,
                                        ParaBirimiKodu, Tutar, ParcaTalepKimlik,
                                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Servis, N'paksan', N'parcaSiparisiBorcu', N'borc', N'TRY', 600.00, @Siparis,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N' (ikinci borç): beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ SN-14
   Fiyat teklifi: iki teklif, sonra bayiye atama; talep bayide kapanır. */
SET @Adim = N'SN-14';
DECLARE @Teklif uniqueidentifier = '5A020001-0000-4000-8000-000000000016';
DECLARE @TeklifNumara nvarchar(10);
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'musteri', @YapanHesapKimlik = @Hesap,
     @KaynakUygulamaKodu = N'connect', @UygulamaSurumu = N'0.9.14';
EXEC sistem.NumaraAl @Onek = N'TKF', @Numara = @TeklifNumara OUTPUT;
INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu,
                    DurumKodu, Kapali, SahipKodu, HesapKimlik, KonumUlkeKodu, IlKodu,
                    YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
VALUES (@Teklif, @TeklifNumara, N'TKF', N'satinalma', N'connect', N'paksan',
        N'yeni', 0, N'paksan', @Hesap, N'TR', 42,
        N'musteri', @Hesap, N'connect');
INSERT talep.TeklifTalebiAyrinti (TalepKimlik, TurKodu, IlgiUrunMarkaKodu, IlgiUrunKodu, TraktorGucuKodu)
VALUES (@Teklif, N'satinalma', N'paksan', N'orkinos-1270', N'yuzonYuzelliBeygir');
INSERT talep.TeklifUrunTipi (TalepKimlik, UrunTipiKodu) VALUES (@Teklif, N'yonca'), (@Teklif, N'samanBugday');
INSERT talep.TeklifArazi (TalepKimlik, AraziKodu) VALUES (@Teklif, N'yuzelliBesyuzDonum');
COMMIT TRANSACTION;

BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Satisci,
     @YapanAdi = @SatisciAd, @KaynakUygulamaKodu = N'backoffice';
INSERT talep.Teklif (TalepKimlik, SiraNo, Tutar, ParaBirimiKodu, KdvDahil,
                     YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Teklif, 1, 1650000.00, N'TRY', 1,
        N'personel', @Satisci, @SatisciAd, N'backoffice');
INSERT talep.Teklif (TalepKimlik, SiraNo, Tutar, ParaBirimiKodu, KdvDahil, GecerlilikBitisTarihi,
                     YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Teklif, 2, 1580000.00, N'TRY', 1, CONVERT(date, DATEADD(day, 14, SYSUTCDATETIME())),
        N'personel', @Satisci, @SatisciAd, N'backoffice');
UPDATE talep.Talep SET DurumKodu = N'teklif' WHERE Kimlik = @Teklif;
INSERT denetim.IslemKaydi (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara,
                           YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (N'teklifVerildi', N'talep', @Teklif, @TeklifNumara,
        N'personel', @Satisci, @SatisciAd, N'backoffice');
COMMIT TRANSACTION;

BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Satisci,
     @YapanAdi = @SatisciAd, @KaynakUygulamaKodu = N'backoffice';
INSERT talep.BayiAtamasi (TalepKimlik, TurKodu, UyduKodu, BayiKimlik,
                          YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Teklif, N'satinalma', N'bayiAtamasi', @Bayi,
        N'personel', @Satisci, @SatisciAd, N'backoffice');
INSERT talep.Kapanis (TalepKimlik, KapanisTuruKodu,
                      YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Teklif, N'bayiAtamasi', N'personel', @Satisci, @SatisciAd, N'backoffice');
INSERT denetim.IslemKaydi (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara,
                           YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (N'bayiyeAtandi', N'talep', @Teklif, @TeklifNumara,
        N'personel', @Satisci, @SatisciAd, N'backoffice');
UPDATE talep.Talep SET DurumKodu = N'kapandi', Kapali = 1, KapanmaZamani = SYSUTCDATETIME(), SahipKodu = N'bayi'
 WHERE Kimlik = @Teklif;
COMMIT TRANSACTION;

SELECT @Metin = CONCAT(DurumKodu, N'/', SahipKodu) FROM talep.Talep WHERE Kimlik = @Teklif;
IF @Metin <> N'kapandi/bayi'
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen kapandi/bayi, gelen ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;
SELECT @Sayi = COUNT(*) FROM talep.Teklif WHERE TalepKimlik = @Teklif;
IF @Sayi <> 2
BEGIN SET @Mesaj = CONCAT(@Adim, N': teklif sayısı 2 olmalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ SN-15
   Dönem dökümü: SN-08 hak edişi ve SN-13 borcu bağlanır; ödenecek tutar
   1110 + 222 − 44,40 − 0 − 600 = 687,60; iki belge; ödeme hareketi. */
SET @Adim = N'SN-15';
DECLARE @Dokum  uniqueidentifier = '5A020001-0000-4000-8000-000000000017';
DECLARE @Belge1 uniqueidentifier = '5A020001-0000-4000-8000-000000000018';
DECLARE @Belge2 uniqueidentifier = '5A020001-0000-4000-8000-000000000019';
DECLARE @DokumNumara nvarchar(10);
DECLARE @Yil  smallint = YEAR(SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time');
DECLARE @Ay   tinyint  = MONTH(SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time');

BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
EXEC sistem.NumaraAl @Onek = N'HAK', @Numara = @DokumNumara OUTPUT;
INSERT hakedis.DonemDokumu (Kimlik, Numara, ServisKimlik, SirketKodu, ParaBirimiKodu, DurumKodu,
                            DonemYili, DonemAyi,
                            NetToplam, KdvToplam, TevkifatToplam, StopajToplam, MahsupToplam, OdenecekTutar,
                            YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Dokum, @DokumNumara, @Servis, N'paksan', N'TRY', N'taslak', @Yil, @Ay,
        1110.00, 222.00, 44.40, 0.00, 600.00, 687.60,
        N'personel', @Personel, @PersonelAd, N'backoffice');
UPDATE hakedis.HakEdis SET DonemDokumuKimlik = @Dokum WHERE Kimlik = @HakEdis;
UPDATE hakedis.ServisHesapHareketi SET DonemDokumuKimlik = @Dokum WHERE Kimlik IN (@Alacak, @Borc);
INSERT denetim.IslemKaydi (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara,
                           YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (N'donemDokumuOlusturuldu', N'donemDokumu', @Dokum, @DokumNumara,
        N'personel', @Personel, @PersonelAd, N'backoffice');
COMMIT TRANSACTION;

BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
INSERT entegrasyon.BelgeBagi (Kimlik, DisSistemKodu, SirketKodu, BelgeTuruKodu, KaynakKodu,
                              BelgeNo, BelgeTarihi, ParaBirimiKodu, Tutar, KdvHaricTutar,
                              YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Belge1, N'logo', N'paksan', N'alisFaturasi', N'personel',
        N'S02-SRV-0001', CONVERT(date, SYSUTCDATETIME()), N'TRY', 1332.00, 1110.00,
        N'personel', @Personel, @PersonelAd, N'backoffice'),
       (@Belge2, N'logo', N'paksan', N'bankaFisi', N'personel',
        N'S02-BNK-0001', CONVERT(date, SYSUTCDATETIME()), N'TRY', 687.60, NULL,
        N'personel', @Personel, @PersonelAd, N'backoffice');
INSERT hakedis.DonemDokumuBelgesi (DonemDokumuKimlik, BelgeBagiKimlik,
                                   YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Dokum, @Belge1, N'personel', @Personel, @PersonelAd, N'backoffice'),
       (@Dokum, @Belge2, N'personel', @Personel, @PersonelAd, N'backoffice');
COMMIT TRANSACTION;

/* Ödeme: döküm odendi olurken aynı işlemde ödeme hareketi yazılır. */
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
INSERT hakedis.ServisHesapHareketi (ServisKimlik, SirketKodu, HareketTuruKodu, YonKodu,
                                    ParaBirimiKodu, Tutar, DonemDokumuKimlik, BelgeBagiKimlik,
                                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Servis, N'paksan', N'odeme', N'borc', N'TRY', 687.60, @Dokum, @Belge2,
        N'personel', @Personel, @PersonelAd, N'backoffice');
UPDATE hakedis.DonemDokumu
   SET DurumKodu = N'odendi', KesinlesmeZamani = SYSUTCDATETIME(),
       FaturaGelmeZamani = SYSUTCDATETIME(), OdemeZamani = SYSUTCDATETIME()
 WHERE Kimlik = @Dokum;
INSERT denetim.IslemKaydi (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara,
                           YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (N'donemDokumuOdendi', N'donemDokumu', @Dokum, @DokumNumara,
        N'personel', @Personel, @PersonelAd, N'backoffice');
COMMIT TRANSACTION;

SELECT @Tutar = OdenecekTutar FROM hakedis.DonemDokumu WHERE Kimlik = @Dokum;
 
IF @Tutar <> 687.60
BEGIN SET @Mesaj = CONCAT(@Adim, N': dönem ödenecek tutarı 687,60 olmalıydı, ', @Tutar); THROW 59999, @Mesaj, 1; END;
SELECT @Sayi = COUNT(*) FROM hakedis.DonemDokumuBelgesi WHERE DonemDokumuKimlik = @Dokum;
IF @Sayi <> 2
BEGIN SET @Mesaj = CONCAT(@Adim, N': döküm belgesi 2 olmalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ SN-18
   Parça aşamasında ziyareti olan talep iptal edilir (ziyaret yarimKaldi),
   yeniden açılır, servis yeni parça ister: ikinci parca ziyareti geçer.
   yarimKaldi yazılmadan aynı adım 2601 (parça aşaması talep başına tekil). */
SET @Adim = N'SN-18';
DECLARE @Talep18   uniqueidentifier = '5A020001-0000-4000-8000-00000000001A';
DECLARE @Ziyaret18 uniqueidentifier = '5A020001-0000-4000-8000-00000000001B';
DECLARE @Numara18  nvarchar(10);
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'musteri', @YapanHesapKimlik = @Hesap,
     @KaynakUygulamaKodu = N'connect', @UygulamaSurumu = N'0.9.14';
EXEC sistem.NumaraAl @Onek = N'SRV', @Numara = @Numara18 OUTPUT;
INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu,
                    DurumKodu, Kapali, SahipKodu, HesapKimlik, MakineKimlik,
                    ServisKimlik, ServisAtamaKaynagiKodu, ServisAtamaZamani, KonumUlkeKodu, IlKodu,
                    YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
VALUES (@Talep18, @Numara18, N'SRV', N'servis', N'connect', N'paksan',
        N'yeni', 0, N'servis', @Hesap, @Makine,
        @Servis, N'bayiServisi', SYSUTCDATETIME(), N'TR', 42,
        N'musteri', @Hesap, N'connect');
INSERT talep.ServisTalebiAyrinti (TalepKimlik, TurKodu, MakineDurumuKodu)
VALUES (@Talep18, N'servis', N'durdu');
COMMIT TRANSACTION;

BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'servis', @YapanKullaniciKimlik = @ServisKul,
     @YapanAdi = N'<Codex metni: S02 servis teknisyeni>', @KaynakUygulamaKodu = N'servisim';
INSERT talep.ServisZiyareti (Kimlik, ZiyaretNo, TalepKimlik, TurKodu, UyduKodu, MarkaKodu,
                             ServisKimlik, AsamaKodu, KapiKodu, ParcaIstemeZamani,
                             YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Ziyaret18, 1, @Talep18, N'servis', N'servisZiyareti', N'paksan',
        @Servis, N'parca', N'parcaIste', SYSUTCDATETIME(),
        N'servis', @ServisKul, N'<Codex metni: S02 servis teknisyeni>', N'servisim');
UPDATE talep.Talep SET DurumKodu = N'parcaBekliyor', MasaKodu = N'parcaMasasi' WHERE Kimlik = @Talep18;
COMMIT TRANSACTION;

/* yarimKaldi yazılmadan ikinci parça ziyareti → 2601 */
SET @Beklenen = 2601; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.ServisZiyareti (ZiyaretNo, TalepKimlik, TurKodu, UyduKodu, MarkaKodu,
                                 ServisKimlik, AsamaKodu, KapiKodu,
                                 YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (2, @Talep18, N'servis', N'servisZiyareti', N'paksan',
            @Servis, N'parca', N'parcaIste',
            N'servis', @ServisKul, N'<Codex metni: S02 servis teknisyeni>', N'servisim');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N' (yarimKaldi yazılmadan): beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* Talep iptal edilir, ziyaret yarimKaldi olur, talep yeniden açılır,
   ikinci parça ziyareti artık geçer. */
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
UPDATE talep.ServisZiyareti SET AsamaKodu = N'yarimKaldi' WHERE Kimlik = @Ziyaret18;
INSERT talep.Iptal (TalepKimlik, IptalNedeniKodu, AciklamaZorunlu,
                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
SELECT @Talep18, n.Kod, n.AciklamaZorunlu,
       N'personel', @Personel, @PersonelAd, N'backoffice'
  FROM kod.IptalNedeni AS n WHERE n.Kod = N'musteriVazgecti';
UPDATE talep.Talep SET DurumKodu = N'iptal', Kapali = 1, KapanmaZamani = SYSUTCDATETIME(), MasaKodu = NULL
 WHERE Kimlik = @Talep18;
COMMIT TRANSACTION;

BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
INSERT talep.YenidenAcma (TalepKimlik, OncekiDurumKodu,
                          YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Talep18, N'iptal', N'personel', @Personel, @PersonelAd, N'backoffice');
UPDATE talep.Talep SET DurumKodu = N'yeni', Kapali = 0, KapanmaZamani = NULL WHERE Kimlik = @Talep18;
COMMIT TRANSACTION;

BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'servis', @YapanKullaniciKimlik = @ServisKul,
     @YapanAdi = N'<Codex metni: S02 servis teknisyeni>', @KaynakUygulamaKodu = N'servisim';
INSERT talep.ServisZiyareti (ZiyaretNo, TalepKimlik, TurKodu, UyduKodu, MarkaKodu,
                             ServisKimlik, AsamaKodu, KapiKodu, ParcaIstemeZamani,
                             YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (2, @Talep18, N'servis', N'servisZiyareti', N'paksan',
        @Servis, N'parca', N'parcaIste', SYSUTCDATETIME(),
        N'servis', @ServisKul, N'<Codex metni: S02 servis teknisyeni>', N'servisim');
UPDATE talep.Talep SET DurumKodu = N'parcaBekliyor', MasaKodu = N'parcaMasasi' WHERE Kimlik = @Talep18;
COMMIT TRANSACTION;

SELECT @Sayi = COUNT(*) FROM talep.ServisZiyareti WHERE TalepKimlik = @Talep18;
IF @Sayi <> 2
BEGIN SET @Mesaj = CONCAT(@Adim, N': talebin ziyaret sayısı 2 olmalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ SN-16
   İçe aktarım: servis listesinde sınama TC'si ve IBAN'ı düz metin olarak
   geçmemeli. Sayım ve tutar kontrollerinin gorunum'a bakan kısmı yönetici
   bölümündedir. */
SET @Adim = N'SN-16';
DECLARE @Aktarim uniqueidentifier = '5A020001-0000-4000-8000-00000000001C';
DECLARE @AktarimDosya uniqueidentifier = '5A020001-0000-4000-8000-00000000001D';
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
INSERT dosya.Dosya (Kimlik, MimeTuru, BoyutBayt, IcerikOzeti, DepolamaYolu, TurKodu,
                    DepolamaSaglayiciKodu, SaklamaSinifiKodu, DurumKodu,
                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@AktarimDosya, N'application/vnd.ms-excel', 40960, 0x41, N's02/servisler.xlsx', N'belge',
        N'disk', N'genel', N'hazir', N'personel', @Personel, @PersonelAd, N'backoffice');
INSERT entegrasyon.IceAktarim (Kimlik, TurKodu, DosyaKimlik, DurumKodu, SatirSayisi, HataSayisi,
                               YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Aktarim, N'servisListesi', @AktarimDosya, N'uygulandi', 1, 0,
        N'personel', @Personel, @PersonelAd, N'backoffice');
/* Ham veri maskeli tutulur: TC ve IBAN düz hâliyle yazılmaz (Bölüm 1.14.1). */
INSERT entegrasyon.IceAktarimSatiri (IceAktarimKimlik, SatirNo, DurumKodu, HamVeriJson,
                                     EslesenKayitTuruKodu, EslesenKimlik)
VALUES (@Aktarim, 1, N'eslesti',
        CONCAT(N'{"ad":"<Codex metni: S02 servis adı>","tcNo":"', @TcMaskeli,
               N'","iban":"TR** **** **** **** **** **', RIGHT(@Iban, 2), N'"}'),
        N'servis', @Servis);
COMMIT TRANSACTION;

SELECT @Sayi = COUNT(*) FROM entegrasyon.IceAktarimSatiri
 WHERE HamVeriJson LIKE CONCAT(N'%', @TcNo, N'%') OR HamVeriJson LIKE CONCAT(N'%', @Iban, N'%');
IF @Sayi <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': içe aktarım ham verisinde düz TC ya da IBAN bulundu (', @Sayi, N' satır)'); THROW 59999, @Mesaj, 1; END;

/* Tablo başına sayımlar (senaryonun kendi verisi). */
SELECT @Sayi = COUNT(*) FROM talep.Talep WHERE HesapKimlik = @Hesap OR ServisKimlik = @Servis;
IF @Sayi < 5
BEGIN SET @Mesaj = CONCAT(@Adim, N': senaryo talebi sayısı 5 olmalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* makine.MakineGarantisi: satışta GarantiYil kopyalandı, dayanak üretim yılı. */
SELECT @Metin = GarantiDayanagiKodu FROM makine.MakineGarantisi WHERE MakineKimlik = @Makine;
IF @Metin IS NULL
BEGIN SET @Mesaj = CONCAT(@Adim, N': makine.MakineGarantisi makineyi döndürmedi'); THROW 59999, @Mesaj, 1; END;

/* İlk talebin durum geçmişi sırası: ilk satır yeni olmalı. */
SELECT TOP (1) @Metin = YeniDurumKodu FROM talep.DurumGecmisi
 WHERE TalepKimlik = @Talep ORDER BY KayitNo;
IF @Metin <> N'yeni'
BEGIN SET @Mesaj = CONCAT(@Adim, N': ilk durum geçmişi satırı yeni olmalıydı, ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

/* denetim.IslemKaydi: senaryonun her adımının yazdığı tür kodları. */
DECLARE @BeklenenTurler TABLE (Kod nvarchar(40) COLLATE Latin1_General_100_BIN2 PRIMARY KEY);
INSERT @BeklenenTurler (Kod) VALUES
    (N'hesapAcildi'), (N'makineKaydedildi'), (N'makineSatisiKaydedildi'),
    (N'talepOlusturuldu'), (N'hakEdisOnaylandi'), (N'odemeOnaylandi'),
    (N'parcaGonderildi'), (N'servisSiparisiOlusturuldu'), (N'teklifVerildi'),
    (N'bayiyeAtandi'), (N'donemDokumuOlusturuldu'), (N'donemDokumuOdendi');
SELECT @Metin = STRING_AGG(b.Kod, N', ') FROM @BeklenenTurler AS b
 WHERE NOT EXISTS (SELECT 1 FROM denetim.IslemKaydi AS i WHERE i.IslemTuruKodu = b.Kod);
IF @Metin IS NOT NULL
BEGIN SET @Mesaj = CONCAT(@Adim, N': işlem kaydı yazılmayan türler: ', @Metin); THROW 59999, @Mesaj, 1; END;

PRINT 'S02 SN-01 … SN-18 (uygulama) tamam.';

-- giris: yonetici
/* ==========================================================================
   S02 — yönetici bölümü: gorunum denetimleri

   gorunum görünümleri uygulama rolüne kapalıdır (Bölüm 4.2: uygulama
   gorunum'da yalnız GecerliAyar'ı okur). Senaryonun görünüme bakan
   kontrolleri — SN-02b, SN-04, SN-12 ve SN-16 — bu yüzden burada.
   Bu bölüm yalnız okur.

   SIRA ÖNEMLİ: SN-17 (anonimleştirme) bundan SONRA çalışır; müşteri adı ve
   telefonu silindikten sonra kart görünümlerinin doğrulanması anlamsız olurdu.
   ========================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Adim   nvarchar(20);
DECLARE @Mesaj  nvarchar(2048);
DECLARE @Sayi   int;
DECLARE @Tutar  decimal(18,2);
DECLARE @Metin  nvarchar(400);

DECLARE @Hesap    uniqueidentifier = '5A020001-0000-4000-8000-000000000001';
DECLARE @Talep    uniqueidentifier = '5A020001-0000-4000-8000-000000000004';
DECLARE @ParcaTalep uniqueidentifier = '5A020001-0000-4000-8000-000000000012';
DECLARE @Numara   nvarchar(10);
DECLARE @Servis   uniqueidentifier;

SELECT @Numara = Numara FROM talep.Talep WHERE Kimlik = @Talep;
SELECT @Servis = ServisKimlik FROM talep.Talep WHERE Kimlik = @Talep;

/* SN-02b: elle kaydedilen makine kontrol görünümünde, kaydeden servisiyle. */
SET @Adim = N'SN-02b';
IF NOT EXISTS (SELECT 1 FROM gorunum.KontrolServisiOlmayanSahipliMakine
                WHERE SeriNo = N'ORK1270202400158' AND KaydedenServisAdi IS NOT NULL)
BEGIN SET @Mesaj = CONCAT(@Adim, N': KontrolServisiOlmayanSahipliMakine makineyi kaydeden servisle listelemedi'); THROW 59999, @Mesaj, 1; END;
SELECT @Metin = SahipBilgisininKaynagi FROM gorunum.MakineKarti WHERE SeriNo = N'ORK1270202400158';
IF @Metin <> N'kayitBeyani'
BEGIN SET @Mesaj = CONCAT(@Adim, N': SahipBilgisininKaynagi beklenen kayitBeyani, gelen ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

/* SN-04: Bölüm 1.15.6 yüklemesi — talep hem masasından hem türünden görünür.
   Süzgeç ham Numara kolonundadır: TalepNumarasi insan için tireli biçimdir
   (Bölüm 3.1.1), saklanan değer tiresizdir. */
SET @Adim = N'SN-04';
SELECT @Sayi = COUNT(*) FROM gorunum.TalepListesi
 WHERE Numara = @Numara AND TurKodu = N'servis';
IF @Sayi <> 1
BEGIN SET @Mesaj = CONCAT(@Adim, N': TalepListesi servis talebini döndürmedi (', @Sayi, N')'); THROW 59999, @Mesaj, 1; END;

/* SN-12: ödeme tutarı uyuşmazlığı yok. */
SET @Adim = N'SN-12';
SELECT @Sayi = COUNT(*) FROM gorunum.KontrolOdemeTutariUyusmayanParca WHERE TalepNumarasi IS NOT NULL;
IF @Sayi <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': KontrolOdemeTutariUyusmayanParca 0 satır olmalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* SN-16: sayım ve tutar kontrolleri. */
SET @Adim = N'SN-16';
SELECT @Sayi = COUNT(*) FROM gorunum.TalepListesi WHERE HesapKayitNo IS NOT NULL
   AND HesapKayitNo = (SELECT KayitNo FROM musteri.Hesap WHERE Kimlik = @Hesap);
IF @Sayi <> 4
BEGIN SET @Mesaj = CONCAT(@Adim, N': hesabın TalepListesi satırı 4 olmalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;

SELECT @Tutar = SUM(AlacakTutari) FROM gorunum.ServisHesapHareketleri
 WHERE ServisKayitNo = (SELECT KayitNo FROM servis.Servis WHERE Kimlik = @Servis);
IF @Tutar <> 1287.60
BEGIN SET @Mesaj = CONCAT(@Adim, N': ServisHesapHareketleri alacak toplamı 1287,60 olmalıydı, ', ISNULL(@Tutar, -1)); THROW 59999, @Mesaj, 1; END;

SELECT @Tutar = SUM(BorcTutari) FROM gorunum.ServisHesapHareketleri
 WHERE ServisKayitNo = (SELECT KayitNo FROM servis.Servis WHERE Kimlik = @Servis);
IF @Tutar <> 1287.60
BEGIN SET @Mesaj = CONCAT(@Adim, N': ServisHesapHareketleri borç toplamı 1287,60 olmalıydı (600,00 sipariş + 687,60 ödeme), ', ISNULL(@Tutar, -1)); THROW 59999, @Mesaj, 1; END;

SELECT @Sayi = COUNT(*) FROM gorunum.ServisBakiyesi
 WHERE ServisKayitNo = (SELECT KayitNo FROM servis.Servis WHERE Kimlik = @Servis);
IF @Sayi <> 1
BEGIN SET @Mesaj = CONCAT(@Adim, N': ServisBakiyesi şirket ve para birimi başına tek satır olmalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* TalepDurumGecmisi yalnız tireli numarayı taşır; ham numaradan üretilir. */
DECLARE @NumaraTireli nvarchar(14) =
    CONCAT(LEFT(@Numara, 3), N'-', SUBSTRING(@Numara, 4, 2), N'-', SUBSTRING(@Numara, 6, 5));
SELECT TOP (1) @Metin = YeniDurumAdi FROM gorunum.TalepDurumGecmisi
 WHERE TalepNumarasi = @NumaraTireli ORDER BY KayitNo;
IF @Metin IS NULL
BEGIN SET @Mesaj = CONCAT(@Adim, N': TalepDurumGecmisi ilk satırı boş'); THROW 59999, @Mesaj, 1; END;

SELECT @Sayi = COUNT(*) FROM gorunum.KontrolHakEdisToplamiUyusmuyor;
IF @Sayi <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': KontrolHakEdisToplamiUyusmuyor 0 satır olmalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;

SELECT @Sayi = COUNT(*) FROM gorunum.KontrolHakEdisHareketiUyusmuyor;
IF @Sayi <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': KontrolHakEdisHareketiUyusmuyor 0 satır olmalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;

PRINT 'S02 gorunum denetimleri (yönetici) tamam.';

-- giris: uygulama
/* ==========================================================================
   S02 — SN-17: anonimleştirme

   musteri.HesabiAnonimlestir senaryo hesabına uygulanır; sonra senaryodaki
   ad, soyad, telefonun ulusal kısmı ve teslimat adresi sys.columns'tan
   bulunan BÜTÜN nvarchar kolonlarda aranır. Tek istisna kvkk.BasvuruTalebi
   (Bölüm 1.13.5: başvurunun kendisi yasal kanıttır, silinmez).

   Arama dinamik SQL ile yapılır: kolon listesi çalışma anında sys.columns'tan
   gelir, böylece sonradan eklenen bir kolon sessizce ağın dışında kalmaz.
   Dinamik SQL yasağı R betikleri içindir (Bölüm 7.2); S betiği kapsam dışı.
   ========================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Adim   nvarchar(20) = N'SN-17';
DECLARE @Mesaj  nvarchar(2048);
DECLARE @Sayi   int;
DECLARE @Hesap  uniqueidentifier = '5A020001-0000-4000-8000-000000000001';
DECLARE @Ad     nvarchar(75)  = N'Yasin';
DECLARE @Soyad  nvarchar(75)  = N'Doğanay';
DECLARE @Ulusal nvarchar(15)  = N'5321110001';
DECLARE @Adres  nvarchar(500) = N'Karatay Mahallesi 118. Sokak No 7';

/* Cari kartı bağlı bir satış faturası varken de anonimleştirme geçmeli;
   belgenin cari kartı bağı kopar (Bölüm 1.13.5, 17.09.2026 notu). */
DECLARE @Cari  uniqueidentifier = '5A020001-0000-4000-8000-000000000020';
DECLARE @Belge uniqueidentifier = '5A020001-0000-4000-8000-000000000021';
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'sistem', @KaynakUygulamaKodu = N'api';
INSERT entegrasyon.CariKarti (Kimlik, DisSistemKodu, SirketKodu, CariKodu, KaynakKodu, HesapKimlik)
VALUES (@Cari, N'logo', N'paksan', N'120.S02.0001', N'entegrasyon', @Hesap);
INSERT entegrasyon.BelgeBagi (Kimlik, DisSistemKodu, SirketKodu, BelgeTuruKodu, KaynakKodu,
                              BelgeNo, BelgeTarihi, CariKartiKimlik,
                              YapanTuruKodu, KaynakUygulamaKodu)
VALUES (@Belge, N'logo', N'paksan', N'satisFaturasi', N'entegrasyon',
        N'S02-MUS-0001', CONVERT(date, SYSUTCDATETIME()), @Cari,
        N'sistem', N'api');
COMMIT TRANSACTION;

BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'sistem', @KaynakUygulamaKodu = N'api';
EXEC musteri.HesabiAnonimlestir @HesapKimlik = @Hesap;
COMMIT TRANSACTION;

IF EXISTS (SELECT 1 FROM entegrasyon.BelgeBagi WHERE Kimlik = @Belge AND CariKartiKimlik IS NOT NULL)
BEGIN SET @Mesaj = CONCAT(@Adim, N': anonimleştirmeden sonra belgenin cari kartı bağı duruyor'); THROW 59999, @Mesaj, 1; END;

/* Bütün nvarchar kolonlarda dört değeri ara. */
DECLARE @Sema sysname, @Tablo sysname, @Kolon sysname;
DECLARE @Sql nvarchar(max);
DECLARE @Bulunan nvarchar(2000) = N'';
DECLARE @Adet int;

DECLARE kolonlar CURSOR LOCAL FAST_FORWARD FOR
    SELECT s.name, t.name, c.name
      FROM sys.columns AS c
      JOIN sys.tables  AS t ON t.object_id = c.object_id
      JOIN sys.schemas AS s ON s.schema_id = t.schema_id
     WHERE t.is_ms_shipped = 0
       AND TYPE_NAME(c.user_type_id) IN ('nvarchar', 'nchar')
       AND NOT (s.name = 'kvkk' AND t.name = 'BasvuruTalebi')
     ORDER BY s.name, t.name, c.name;

OPEN kolonlar;
FETCH NEXT FROM kolonlar INTO @Sema, @Tablo, @Kolon;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @Sql = N'SELECT @Adet = COUNT(*) FROM ' + QUOTENAME(@Sema) + N'.' + QUOTENAME(@Tablo) +
               N' WHERE ' + QUOTENAME(@Kolon) + N' LIKE @A OR ' + QUOTENAME(@Kolon) + N' LIKE @B' +
               N' OR ' + QUOTENAME(@Kolon) + N' LIKE @C OR ' + QUOTENAME(@Kolon) + N' LIKE @D';
    SET @Adet = 0;
    EXEC sys.sp_executesql @Sql,
         N'@A nvarchar(100), @B nvarchar(100), @C nvarchar(100), @D nvarchar(520), @Adet int OUTPUT',
         @A = @Ad, @B = @Soyad, @C = @Ulusal, @D = @Adres, @Adet = @Adet OUTPUT;
    IF @Adet > 0 AND LEN(@Bulunan) < 1500
        SET @Bulunan = @Bulunan + CONCAT(@Sema, N'.', @Tablo, N'.', @Kolon, N' (', @Adet, N'); ');
    FETCH NEXT FROM kolonlar INTO @Sema, @Tablo, @Kolon;
END;
CLOSE kolonlar;
DEALLOCATE kolonlar;

IF @Bulunan <> N''
BEGIN SET @Mesaj = CONCAT(@Adim, N': anonimleştirmeden sonra kişisel veri kalan kolonlar: ', @Bulunan); THROW 59999, @Mesaj, 1; END;

SELECT @Sayi = COUNT(*) FROM musteri.Hesap WHERE Kimlik = @Hesap AND DurumKodu = N'anonim' AND TelefonE164 IS NULL;
IF @Sayi <> 1
BEGIN SET @Mesaj = CONCAT(@Adim, N': hesap anonim duruma geçmedi'); THROW 59999, @Mesaj, 1; END;

PRINT 'S02 SN-17 tamam.';
