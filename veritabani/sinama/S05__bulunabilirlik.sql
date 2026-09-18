-- giris: uygulama
/* ==========================================================================
   S05 — bulunabilirlik sınamaları (tasarim.md 7.7, adım kodları BS-01 … BS-21)

   SORU: PAKSAN yetkilisi SSMS'te oturup aradığını bulabiliyor mu, ve
   yonetim prosedürleri gerekçesiz iş yapmıyor mu?

   BÖLÜMLER
     1. uygulama  sahne: aranacak kayıtlar (talep, telefon değişikliği,
                  geri bildirim, eski servis numarası, 22:30 UTC talebi)
     2. yonetici  BS-01 … BS-21 (tasarim.md 6.6: S05 yönetici girişi)

   Sahne uygulama girişiyle kurulur: yönetici hiçbir tabloya yazamaz
   (Bölüm 4.2, veritabanı düzeyinde DENY INSERT/UPDATE/DELETE) ve sınanan
   şey de budur — yazma yalnız yonetim prosedürlerinden geçer.

   BEKLENTİ TUTMAZSA: THROW 59999, N'<adım kodu>: beklenen <no>, gelen <no>'.
   ========================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Mesaj nvarchar(2048);
DECLARE @Sayi  int;

DECLARE @Hesap    uniqueidentifier;
DECLARE @Makine   uniqueidentifier;
DECLARE @Servis   uniqueidentifier;
DECLARE @Servis15 uniqueidentifier;
DECLARE @Personel uniqueidentifier;
DECLARE @PersonelAd nvarchar(150);
DECLARE @ServisKul uniqueidentifier;

DECLARE @Talep    uniqueidentifier = '5A050001-0000-4000-8000-000000000001';
DECLARE @Ziyaret  uniqueidentifier = '5A050001-0000-4000-8000-000000000002';
DECLARE @HakEdis  uniqueidentifier = '5A050001-0000-4000-8000-000000000003';
DECLARE @Alacak   uniqueidentifier = '5A050001-0000-4000-8000-000000000004';
DECLARE @GeceTalep uniqueidentifier = '5A050001-0000-4000-8000-000000000005';
DECLARE @ParcaTalep uniqueidentifier = '5A050001-0000-4000-8000-000000000006';
DECLARE @DekontDosya uniqueidentifier = '5A050001-0000-4000-8000-000000000007';
DECLARE @IptalTalep uniqueidentifier = '5A050001-0000-4000-8000-000000000008';
DECLARE @Basvuru  uniqueidentifier = '5A050001-0000-4000-8000-000000000009';
DECLARE @Hesap2   uniqueidentifier = '5A050001-0000-4000-8000-00000000000A';

SELECT @Hesap = Kimlik FROM musteri.Hesap WHERE TelefonE164 = N'+905321234567';
SELECT @Makine = Kimlik FROM makine.Makine WHERE SeriNo = N'IPAK202400157';
SELECT @Servis15 = Kimlik FROM servis.Servis WHERE KayitNo = 15;
SELECT @Servis = s.ServisKimlik FROM makine.MakineninServisi AS s WHERE s.MakineKimlik = @Makine;
SELECT @Personel = k.Kimlik, @PersonelAd = p.AdSoyad
  FROM erisim.Kullanici AS k JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
 WHERE k.GirisAdi = N'ornek.servis.masasi';
SELECT @ServisKul = g.KullaniciKimlik FROM servis.GirisHesabi AS g WHERE g.ServisKimlik = @Servis;

IF @Hesap IS NULL OR @Makine IS NULL OR @Servis IS NULL OR @Servis15 IS NULL
    THROW 59999, N'S05 sahnesi: örnek veri (hesap, makine, servis zinciri) bulunamadı', 1;
IF EXISTS (SELECT 1 FROM talep.Talep WHERE Kimlik = @Talep)
    THROW 59999, N'S05 sahnesi zaten kurulu; sınama veritabanı sıfırdan kurulmalı', 1;

EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';

BEGIN TRANSACTION;

/* Aranacak talep: numarası BS-02 ve BS-04'te tireli ve tiresiz sorulur.
   Numara NumaraAl'dan değil, sınamanın istediği değerle yazılır. */
INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu,
                    DurumKodu, Kapali, SahipKodu, MasaKodu, HesapKimlik, MakineKimlik,
                    ServisKimlik, ServisAtamaKaynagiKodu, ServisAtamaZamani,
                    KonumUlkeKodu, IlKodu, IletisimAdi, IletisimTelefonE164, IletisimTelefonUlusal,
                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Talep, N'SRV2600123', N'SRV', N'servis', N'connect', N'paksan',
        N'yeni', 0, N'servis', N'servisMasasi', @Hesap, @Makine,
        @Servis, N'bayiServisi', SYSUTCDATETIME(),
        N'TR', 35, N'Örnek Müşteri', N'+905321234567', N'5321234567',
        N'personel', @Personel, @PersonelAd, N'backoffice');
INSERT talep.ServisTalebiAyrinti (TalepKimlik, TurKodu, MakineDurumuKodu)
VALUES (@Talep, N'servis', N'sorunlu');

/* Ziyaret + onaylı hak ediş: BS-17 (HakEdisOnayiniGeriAl) ve BS-12 (51110)
   bunları kullanır. */
INSERT talep.ServisZiyareti (Kimlik, ZiyaretNo, TalepKimlik, TurKodu, UyduKodu, MarkaKodu,
                             ServisKimlik, AsamaKodu, KapiKodu, YapilanIsKodu,
                             Km, IscilikTutari, ParaBirimiKodu, TamamlanmaZamani,
                             YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@Ziyaret, 1, @Talep, N'servis', N'servisZiyareti', N'paksan',
        @Servis, N'bitti', N'garanti', N'bakim',
        10, 200, N'TRY', SYSUTCDATETIME(),
        N'servis', @ServisKul, N'<Codex metni: S05 servis teknisyeni>', N'servisim');
INSERT hakedis.HakEdis (Kimlik, ZiyaretKimlik, TalepKimlik, ServisKimlik, MarkaKodu, SirketKodu,
                        KapiKodu, AsamaKodu, ParaBirimiKodu, DurumKodu, NetTutar)
VALUES (@HakEdis, @Ziyaret, @Talep, @Servis, N'paksan', N'paksan',
        N'garanti', N'bitti', N'TRY', N'bekliyor', 0);
COMMIT TRANSACTION;

BEGIN TRANSACTION;
EXEC hakedis.HakEdisHesapla @HakEdisKimlik = @HakEdis;
UPDATE talep.Talep SET DurumKodu = N'onayBekliyor' WHERE Kimlik = @Talep;
COMMIT TRANSACTION;

BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
UPDATE hakedis.HakEdis
   SET DurumKodu = N'onaylandi', OnayZamani = SYSUTCDATETIME(),
       OnaylayanKullaniciKimlik = @Personel, OnaylayanAdi = @PersonelAd,
       KdvOrani = 0.2000, KdvTutari = 64.00,
       TevkifatOrani = 0.2000, TevkifatTutari = 12.80,
       StopajOrani = 0.0000, StopajTutari = 0.00
 WHERE Kimlik = @HakEdis;
INSERT hakedis.ServisHesapHareketi (Kimlik, ServisKimlik, SirketKodu, MarkaKodu, HareketTuruKodu, YonKodu,
                                    ParaBirimiKodu, Tutar, HakEdisKimlik,
                                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
SELECT @Alacak, h.ServisKimlik, h.SirketKodu, h.MarkaKodu, N'hakEdisAlacagi', N'alacak',
       h.ParaBirimiKodu, h.NetTutar + h.KdvTutari - h.TevkifatTutari - h.StopajTutari, h.Kimlik,
       N'personel', @Personel, @PersonelAd, N'backoffice'
  FROM hakedis.HakEdis AS h WHERE h.Kimlik = @HakEdis;
COMMIT TRANSACTION;

/* BS-09: 22:30 UTC'de oluşmuş talep — Türkiye'de ertesi gün sayılmalı. */
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu,
                    DurumKodu, Kapali, SahipKodu, HesapKimlik, MakineKimlik, KonumUlkeKodu, IlKodu,
                    OlusmaZamani, GuncellemeZamani,
                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@GeceTalep, N'SRV2600124', N'SRV', N'servis', N'connect', N'paksan',
        N'yeni', 0, N'paksan', @Hesap, @Makine, N'TR', 35,
        '2026-06-15T22:30:00', '2026-06-15T22:30:00',
        N'personel', @Personel, @PersonelAd, N'backoffice');
INSERT talep.ServisTalebiAyrinti (TalepKimlik, TurKodu, MakineDurumuKodu)
VALUES (@GeceTalep, N'servis', N'kontrol');
COMMIT TRANSACTION;

/* BS-15 için: ödemesi onaylanmış bir parça talebi ve dekontu. */
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu,
                    DurumKodu, Kapali, SahipKodu, HesapKimlik, KonumUlkeKodu, IlKodu,
                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@ParcaTalep, N'YPR2600125', N'YPR', N'parca', N'backoffice', N'paksan',
        N'odemeBekliyor', 0, N'paksan', @Hesap, N'TR', 35,
        N'personel', @Personel, @PersonelAd, N'backoffice');
INSERT talep.ParcaTalebiAyrinti (TalepKimlik, TurKodu, OdemeYontemiKodu, SirketKodu, ParaBirimiKodu,
                                 KdvOrani, ListeKdvHaric, AraToplam, KdvTutari, GenelToplam,
                                 KargoTutari, OdenecekTutar, SonOdemeTarihi,
                                 TutarDogrulamaZamani, TutarDogrulayanKullaniciKimlik, TutarDogrulayanAdi)
VALUES (@ParcaTalep, N'parca', N'havale', N'paksan', N'TRY',
        0.2000, 1, 200.00, 40.00, 240.00,
        0.00, 240.00, CONVERT(date, DATEADD(day, 7, SYSUTCDATETIME())),
        SYSUTCDATETIME(), @Personel, @PersonelAd);
INSERT dosya.Dosya (Kimlik, MimeTuru, BoyutBayt, IcerikOzeti, DepolamaYolu, TurKodu,
                    DepolamaSaglayiciKodu, SaklamaSinifiKodu, DurumKodu,
                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@DekontDosya, N'application/pdf', 5000, 0x61, N's05/dekont.pdf', N'pdf',
        N'disk', N'dekont', N'hazir', N'personel', @Personel, @PersonelAd, N'backoffice');
INSERT talep.Dekont (TalepKimlik, DosyaKimlik,
                     YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@ParcaTalep, @DekontDosya, N'personel', @Personel, @PersonelAd, N'backoffice');
INSERT talep.OdemeOnayi (TalepKimlik, ParaBirimiKodu, OnaylananTutar,
                         YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@ParcaTalep, N'TRY', 240.00, N'personel', @Personel, @PersonelAd, N'backoffice');
COMMIT TRANSACTION;

/* BS-14 için: iptal edilmiş talep. */
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu,
                    DurumKodu, Kapali, KapanmaZamani, SahipKodu, HesapKimlik, MakineKimlik,
                    KonumUlkeKodu, IlKodu,
                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@IptalTalep, N'SRV2600126', N'SRV', N'servis', N'connect', N'paksan',
        N'iptal', 1, SYSUTCDATETIME(), N'paksan', @Hesap, @Makine, N'TR', 35,
        N'personel', @Personel, @PersonelAd, N'backoffice');
INSERT talep.ServisTalebiAyrinti (TalepKimlik, TurKodu, MakineDurumuKodu)
VALUES (@IptalTalep, N'servis', N'kontrol');
INSERT talep.Iptal (TalepKimlik, IptalNedeniKodu, AciklamaZorunlu,
                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
SELECT @IptalTalep, n.Kod, n.AciklamaZorunlu,
       N'personel', @Personel, @PersonelAd, N'backoffice'
  FROM kod.IptalNedeni AS n WHERE n.Kod = N'musteriVazgecti';
COMMIT TRANSACTION;

/* BS-02 ve BS-06: telefon değişikliği talepleri, geri bildirim, eski servis
   numarası ve müşterinin eski telefonu. */
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
/* Oturumsuz (hesapsız) telefon değişikliği talebi: yeni telefonuyla aranır. */
INSERT musteri.TelefonDegisikligiTalebi (Numara, KaynakUygulamaKodu, KararDurumuKodu,
                                         EskiTelefonE164, YeniTelefonE164, BeyanAdi)
VALUES (N'TEL2600001', N'connect', N'bekliyor',
        N'+905321234567', N'+905321239999', N'Örnek Müşteri');
/* Müşterinin eski telefonu: geçmişte kapanmış bir satır. */
INSERT musteri.HesapTelefonGecmisi (HesapKimlik, TelefonE164, BaslangicZamani, BitisZamani)
VALUES (@Hesap, N'+905321230001', DATEADD(year, -2, SYSUTCDATETIME()), DATEADD(year, -1, SYSUTCDATETIME()));
/* Geri bildirim: GBD numarasıyla aranır. */
INSERT musteri.GeriBildirim (Numara, HesapKimlik, DilKodu, UygulamaSurumu, Metin,
                             IletisimAdi, IletisimTelefonE164)
VALUES (N'GBD2600001', @Hesap, N'tr', N'0.9.14', N'<Codex metni: S05 geri bildirim metni>',
        N'Örnek Müşteri', N'+905321234567');
/* Eski servis numarası: IŞIK Makina SRV014 ile de bulunmalı. */
UPDATE servis.Servis SET EskiNumara = N'SRV014' WHERE Kimlik = @Servis15;
COMMIT TRANSACTION;

/* BS-18 için ikinci hesap: yeni telefon başka hesapta olmalı. */
BEGIN TRANSACTION;
INSERT musteri.Hesap (Kimlik, KonumUlkeKodu, IlKodu, DurumKodu, TelefonUlkeKodu, TelefonE164, TelefonUlusal)
VALUES (@Hesap2, N'TR', 35, N'aktif', N'TR', N'+905321238888', N'5321238888');
INSERT musteri.HesapTelefonGecmisi (HesapKimlik, TelefonE164) VALUES (@Hesap2, N'+905321238888');
COMMIT TRANSACTION;

/* BS-21 için: KVKK başvuru talebi. */
BEGIN TRANSACTION;
EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
INSERT kvkk.BasvuruTalebi (Kimlik, TurKodu, DurumKodu, BasvuranAdi, IletisimBilgisi,
                           HesapKimlik, KanalKodu, Aciklama, YanitSonTarihi)
VALUES (@Basvuru, N'silme', N'alindi', N'Örnek Müşteri', N'+905321238888',
        @Hesap2, N'yazili', N'<Codex metni: S05 başvuru metni>',
        CONVERT(date, DATEADD(day, 30, SYSUTCDATETIME())));
COMMIT TRANSACTION;

PRINT 'S05 sahnesi hazır.';

-- giris: yonetici
/* ==========================================================================
   S05 — yönetici bölümü (BS-01 … BS-21)

   Bu bölüm PAKSAN yetkilisinin SSMS oturumudur: okur, yardim ve yonetim
   çalıştırır, hiçbir tabloya doğrudan yazamaz.

   yonetim prosedürleri dış işlem varsa SAVE TRANSACTION ile önizleme yapar;
   THROW ettiklerinde dış işlem bozulur. Bu yüzden her adım kendi işlemini
   açar ve geri alır. @Uygula = 1 ile yapılan adımlar da geri alınır:
   sınama veritabanında iz bırakmazlar.
   ========================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Adim      nvarchar(30);
DECLARE @Beklenen  int;
DECLARE @Gelen     int;
DECLARE @Mesaj     nvarchar(2048);
DECLARE @HataMetni nvarchar(2048);
DECLARE @Sayi      int;
DECLARE @Metin     nvarchar(400);
DECLARE @Sira      int;
DECLARE @Tarih     date;

DECLARE @Yonetici  nvarchar(40) = N'ornek.yonetici';
DECLARE @Gerekce   nvarchar(500) = N'<Codex metni: S05 yönetim gerekçesi>';

/* ------------------------------------------------------------------ BS-01
   SSMS'te küçük harfle yazılan nesne ve kolon adları çalışır (207/208 yok);
   metin araması harf büyüklüğüne duyarsızdır. */
SET @Adim = N'BS-01'; SET @Gelen = 0;
BEGIN TRY
    SELECT @Sayi = COUNT(ilkodu) FROM cografya.il;
    SELECT @Sayi = COUNT(KIMLIK) FROM talep.talep;
    SELECT @Sayi = COUNT(*) FROM cografya.Il WHERE Ad = N'istanbul';
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': küçük harfli ad ya da arama hata verdi (', @Gelen, N') — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;
IF @Sayi <> 1
BEGIN SET @Mesaj = CONCAT(@Adim, N': N''istanbul'' İSTANBUL''u bulmalıydı, gelen ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ BS-02
   yardim.Ara: her girdi beklenen kaydı Tam = 1 ile ilk satırlarda döndürür. */
/* TamBekleniyor = 1: tanımlayıcı araması (numara, telefon, seri, cari kodu,
   giriş adı, eski numara) — yardim.Ara bunları Tam = 1 ile işaretler.
   TamBekleniyor = 0: ad araması; ad parçası eşleşmesi tanım gereği
   Tam = 0'dır (R07: Tam yalnız birebir tanımlayıcı eşleşmesinde 1).
   Örnek servisin adı "IŞIK Makina (Örnek)" olduğu için "isik makina"
   birebir değil, parça eşleşmesidir; aranan kaydın DÖNMESİ sınanır. */
DECLARE @Aramalar TABLE (Sira int IDENTITY(1,1) PRIMARY KEY,
                         Metin nvarchar(400) NOT NULL,
                         TamBekleniyor bit NOT NULL);
INSERT @Aramalar (Metin, TamBekleniyor) VALUES
    (N'srv-26-00123', 1), (N'SRV2600123', 1),
    (N'0532 123 45 67', 1), (N'+90 532 123 45 67', 1), (N'905321234567', 1),
    (N'ipak2024-00157', 1), (N'isik makina', 0), (N'ışık makina', 0),
    (N'+905321230001', 1), (N'+905321239999', 1),
    (N'TEL-26-00001', 1), (N'GBD-26-00001', 1),
    (N'IZMIR.MERKEZ', 1), (N'320.ORNEK.0001', 1), (N'SRV014', 1), (N'Örnek Müşteri', 0);

DECLARE @AraSonuc TABLE (Bolum nvarchar(30), KayitTuru nvarchar(150), Gosterim nvarchar(200),
                         Ozet nvarchar(max), EslesenAlan nvarchar(200), Tam bit,
                         ZamanTurkiye datetime2(0), KayitNo bigint,
                         SonrakiAdim nvarchar(175), DahaFazlaVar bit);
DECLARE @AraMetin nvarchar(400);
DECLARE @TamBekleniyor bit;
SET @Sira = 1;
WHILE @Sira <= (SELECT MAX(Sira) FROM @Aramalar)
BEGIN
    SELECT @AraMetin = Metin, @TamBekleniyor = TamBekleniyor FROM @Aramalar WHERE Sira = @Sira;
    SET @Adim = CONCAT(N'BS-02.', @Sira); SET @Gelen = 0;
    DELETE @AraSonuc;
    BEGIN TRY
        INSERT @AraSonuc EXEC yardim.Ara @Metin = @AraMetin;
    END TRY
    BEGIN CATCH
        SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    END CATCH;
    IF @Gelen <> 0
    BEGIN SET @Mesaj = CONCAT(@Adim, N' (', @AraMetin, N'): hata ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;
    SELECT @Sayi = COUNT(*) FROM @AraSonuc WHERE @TamBekleniyor = 0 OR Tam = 1;
    IF @Sayi = 0
    BEGIN SET @Mesaj = CONCAT(@Adim, N': "', @AraMetin, N'" için ',
                              CASE WHEN @TamBekleniyor = 1 THEN N'Tam = 1 eşleşme' ELSE N'eşleşme' END,
                              N' dönmedi (toplam ', (SELECT COUNT(*) FROM @AraSonuc), N' satır)'); THROW 59999, @Mesaj, 1; END;
    SET @Sira = @Sira + 1;
END;

/* ------------------------------------------------------------------ BS-03
   İki harfli arama → 51105 */
SET @Adim = N'BS-03'; SET @Beklenen = 51105; SET @Gelen = 0;
BEGIN TRY
    DELETE @AraSonuc;
    INSERT @AraSonuc EXEC yardim.Ara @Metin = N'ab';
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ BS-04
   yardim.TalepGoster tireli ve tiresiz numarayla aynı talebi açar.

   SONUÇ KÜMESİ SAYISI BURADA SAYILMAZ: T-SQL kendi içinde bir prosedürün
   kaç sonuç kümesi döndürdüğünü ölçemez (INSERT … EXEC yalnız ilkini alır).
   22 kümenin sayımı aracın işidir; burada sınanan, iki numara biçiminin de
   hatasız çalışması ve ilk kümenin talebi bulmasıdır. */
SET @Adim = N'BS-04'; SET @Gelen = 0;
BEGIN TRY
    EXEC yardim.TalepGoster @Numara = N'SRV-26-00123';
    EXEC yardim.TalepGoster @Numara = N'srv2600123';
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': TalepGoster hata verdi (', @Gelen, N') — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------- BS-05, BS-06, BS-07
   MakineGoster, MusteriGoster ve ServisGoster ÇOK SONUÇ KÜMESİ döndürür
   (bölümlü kart: künye, talepler, ziyaretler …). Bu yüzden INSERT … EXEC
   ile okunamazlar — hedef tablo yalnız ilk kümenin biçimine uyar, ikinci
   küme 213 verir. Sınanan iki şey ayrı ayrı ölçülür:
     1. prosedür verilen serbest yazımla hatasız çalışıyor mu;
     2. prosedürün kullandığı normalleştirme (yardim.Sadelestir) aranan
        kaydı gerçekten buluyor mu — aynı ifade tabloya/görünüme
        uygulanarak doğrulanır. */

SET @Adim = N'BS-05'; SET @Gelen = 0;
BEGIN TRY
    EXEC yardim.MakineGoster @SeriNo = N'ipak2024-00157';
    EXEC yardim.MakineGoster @SeriNo = N'IPAK202400157', @MarkaKodu = N'paksan';
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': MakineGoster hata verdi (', @Gelen, N') — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

SELECT @Sayi = COUNT(*) FROM gorunum.MakineKarti
 WHERE SeriNo = (SELECT s.Kod FROM yardim.Sadelestir(N'ork1270-2024-00157') AS s)
    OR SeriNo = (SELECT s.Kod FROM yardim.Sadelestir(N'ipak2024-00157') AS s);
IF @Sayi < 1
BEGIN SET @Mesaj = CONCAT(@Adim, N': MakineKarti Sadelestir çıktısıyla makineyi bulmadı, ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* BS-06: eski telefon, güncel telefon ve hesapsız TEL talebinin yeni
   telefonu — üçü de aranabilir olmalı. */
DECLARE @Telefonlar TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Metin nvarchar(400), Yer nvarchar(40));
INSERT @Telefonlar (Metin, Yer) VALUES
    (N'+905321230001', N'telefonGecmisi'),
    (N'0532 123 45 67', N'hesap'),
    (N'+905321239999', N'telefonDegisikligi');
SET @Sira = 1;
WHILE @Sira <= 3
BEGIN
    SELECT @AraMetin = Metin, @Metin = Yer FROM @Telefonlar WHERE Sira = @Sira;
    SET @Adim = CONCAT(N'BS-06.', @Sira); SET @Gelen = 0;
    BEGIN TRY
        EXEC yardim.MusteriGoster @Metin = @AraMetin;
    END TRY
    BEGIN CATCH
        SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    END CATCH;
    IF @Gelen <> 0
    BEGIN SET @Mesaj = CONCAT(@Adim, N' (', @AraMetin, N'): hata ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

    SET @Sayi = 0;
    IF @Metin = N'telefonGecmisi'
        SELECT @Sayi = COUNT(*) FROM musteri.HesapTelefonGecmisi AS g
         WHERE g.TelefonE164 = (SELECT s.TelefonE164 FROM yardim.Sadelestir(@AraMetin) AS s);
    ELSE IF @Metin = N'hesap'
        SELECT @Sayi = COUNT(*) FROM musteri.Hesap AS h
         WHERE h.TelefonE164 = (SELECT s.TelefonE164 FROM yardim.Sadelestir(@AraMetin) AS s);
    ELSE
        SELECT @Sayi = COUNT(*) FROM musteri.TelefonDegisikligiTalebi AS d
         WHERE d.YeniTelefonE164 = (SELECT s.TelefonE164 FROM yardim.Sadelestir(@AraMetin) AS s);
    IF @Sayi < 1
    BEGIN SET @Mesaj = CONCAT(@Adim, N': "', @AraMetin, N'" normalleştirildiğinde ', @Metin, N' içinde bulunamadı'); THROW 59999, @Mesaj, 1; END;
    SET @Sira = @Sira + 1;
END;

/* BS-07: ServisGoster giriş adıyla, cari koduyla ve eski numarasıyla. */
DECLARE @ServisAramalari TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Metin nvarchar(400), Yer nvarchar(40));
INSERT @ServisAramalari (Metin, Yer) VALUES
    (N'IZMIR.MERKEZ', N'girisAdi'), (N'320.ORNEK.0001', N'cariKodu'), (N'SRV014', N'eskiNumara');
SET @Sira = 1;
WHILE @Sira <= 3
BEGIN
    SELECT @AraMetin = Metin, @Metin = Yer FROM @ServisAramalari WHERE Sira = @Sira;
    SET @Adim = CONCAT(N'BS-07.', @Sira); SET @Gelen = 0;
    BEGIN TRY
        EXEC yardim.ServisGoster @Metin = @AraMetin;
    END TRY
    BEGIN CATCH
        SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    END CATCH;
    IF @Gelen <> 0
    BEGIN SET @Mesaj = CONCAT(@Adim, N' (', @AraMetin, N'): hata ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

    SET @Sayi = 0;
    IF @Metin = N'girisAdi'
        SELECT @Sayi = COUNT(*) FROM servis.GirisHesabi AS g
          JOIN erisim.Kullanici AS k ON k.Kimlik = g.KullaniciKimlik
         WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@AraMetin) AS s);
    ELSE IF @Metin = N'cariKodu'
        /* Cari kodu noktalı saklanır, Sadelestir noktaları atar; iki taraf
           da normalleştirilerek karşılaştırılır (Bölüm 3.1.4). */
        SELECT @Sayi = COUNT(*) FROM entegrasyon.CariKarti AS c
          CROSS APPLY yardim.Sadelestir(c.CariKodu) AS sc
         WHERE c.ServisKimlik IS NOT NULL
           AND sc.Kod = (SELECT s.Kod FROM yardim.Sadelestir(@AraMetin) AS s);
    ELSE
        SELECT @Sayi = COUNT(*) FROM servis.Servis AS v
         WHERE v.EskiNumara = (SELECT s.Kod FROM yardim.Sadelestir(@AraMetin) AS s);
    IF @Sayi < 1
    BEGIN SET @Mesaj = CONCAT(@Adim, N': "', @AraMetin, N'" normalleştirildiğinde ', @Metin, N' ile servis bulunamadı'); THROW 59999, @Mesaj, 1; END;
    SET @Sira = @Sira + 1;
END;

/* ------------------------------------------------------------------ BS-08
   CD-GORUNUM: gorunum görünümlerinde uniqueidentifier kolon ve UTC
   …Zamani kolonu yok (insan için sonuçlar; Bölüm 3.1.1). */
SET @Adim = N'BS-08';
SET @Metin = NULL;
SELECT @Metin = STRING_AGG(CONCAT(OBJECT_NAME(c.object_id), N'.', c.name), N', ')
  FROM sys.columns AS c
  JOIN sys.views AS v ON v.object_id = c.object_id
 WHERE v.schema_id = SCHEMA_ID(N'gorunum')
   AND (TYPE_NAME(c.user_type_id) = 'uniqueidentifier'
        OR (c.name LIKE N'%Zamani' AND c.name NOT LIKE N'%Turkiye'));
IF @Metin IS NOT NULL
BEGIN SET @Mesaj = CONCAT(@Adim, N': gorunum''da kimlik ya da UTC zaman kolonu: ', @Metin); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ BS-09
   22:30 UTC'de oluşan talep Türkiye''de ertesi güne düşer. */
SET @Adim = N'BS-09';
SELECT @Tarih = OlusmaTarihi FROM gorunum.TalepListesi WHERE Numara = N'SRV2600124';
IF @Tarih IS NULL
BEGIN SET @Mesaj = CONCAT(@Adim, N': gece talebi TalepListesi''nde yok'); THROW 59999, @Mesaj, 1; END;
IF @Tarih <> '2026-06-16'
BEGIN SET @Mesaj = CONCAT(@Adim, N': 2026-06-15 22:30 UTC için beklenen 2026-06-16, gelen ', CONVERT(nvarchar(10), @Tarih)); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ BS-10
   Her yonetim prosedürü: gerekçe 5 karakter → 51100; pasif personelle →
   51101; var olmayan giriş adıyla → 51101. Prosedürler bu iki denetimi
   kayıtları aramadan önce yapar, bu yüzden öteki parametreler zararsız
   değerlerle verilir. */
DECLARE @Cagrilar TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Ad sysname, Sql nvarchar(1000));
INSERT @Cagrilar (Ad, Sql) VALUES
 (N'AyarDegistir',               N'EXEC yonetim.AyarDegistir @Anahtar = N''TalepGecikmeSaati'', @YeniDeger = N''72'', @Gerekce = @G, @YapanGirisAdi = @Y, @Uygula = 0;'),
 (N'DekontuGecersizKil',         N'EXEC yonetim.DekontuGecersizKil @TalepNumarasi = N''YPR2600125'', @DekontKayitNo = 1, @GecersizNedeni = N''x'', @Gerekce = @G, @YapanGirisAdi = @Y, @Uygula = 0;'),
 (N'GirisSifresiniSifirla',      N'EXEC yonetim.GirisSifresiniSifirla @GirisAdi = N''ornek.satis'', @Gerekce = @G, @YapanGirisAdi = @Y, @Uygula = 0;'),
 (N'HakEdisOnayiniGeriAl',       N'EXEC yonetim.HakEdisOnayiniGeriAl @TalepNumarasi = N''SRV2600123'', @ZiyaretNo = 1, @Gerekce = @G, @YapanGirisAdi = @Y, @Uygula = 0;'),
 (N'HesapHareketiniDuzelt',      N'EXEC yonetim.HesapHareketiniDuzelt @HareketKayitNo = 1, @Gerekce = @G, @YapanGirisAdi = @Y, @Uygula = 0;'),
 (N'HesaplariBirlestir',         N'EXEC yonetim.HesaplariBirlestir @KalacakTelefon = N''+905321234567'', @BirlesecekTelefon = N''+905321238888'', @Gerekce = @G, @YapanGirisAdi = @Y, @Uygula = 0;'),
 (N'KisiselVerileriAnonimlestir',N'EXEC yonetim.KisiselVerileriAnonimlestir @Telefon = N''+905321238888'', @Gerekce = @G, @YapanGirisAdi = @Y, @Uygula = 0;'),
 (N'MakineServisAtamasiniKaldir',N'EXEC yonetim.MakineServisAtamasiniKaldir @SeriNo = N''IPAK202400157'', @MarkaKodu = N''paksan'', @Gerekce = @G, @YapanGirisAdi = @Y, @Uygula = 0;'),
 (N'MakineyeServisAta',          N'EXEC yonetim.MakineyeServisAta @SeriNo = N''IPAK202400157'', @MarkaKodu = N''paksan'', @ServisKayitNo = 1, @Gerekce = @G, @YapanGirisAdi = @Y, @Uygula = 0;'),
 (N'MusteriTelefonunuDegistir',  N'EXEC yonetim.MusteriTelefonunuDegistir @EskiTelefon = N''+905321234567'', @YeniTelefon = N''+905321237777'', @Gerekce = @G, @YapanGirisAdi = @Y, @Uygula = 0;'),
 (N'OdemeOnayiniGeriAl',         N'EXEC yonetim.OdemeOnayiniGeriAl @TalepNumarasi = N''YPR2600125'', @Gerekce = @G, @YapanGirisAdi = @Y, @Uygula = 0;'),
 (N'PersoneliPasiflestir',       N'EXEC yonetim.PersoneliPasiflestir @GirisAdi = N''ornek.satis'', @Gerekce = @G, @YapanGirisAdi = @Y, @Uygula = 0;'),
 (N'ServiseMarkaYetkisiVer',     N'EXEC yonetim.ServiseMarkaYetkisiVer @ServisKayitNo = 1, @MarkaKodu = N''paksan'', @Gerekce = @G, @YapanGirisAdi = @Y, @Uygula = 0;'),
 (N'ServistenMarkaYetkisiniAl',  N'EXEC yonetim.ServistenMarkaYetkisiniAl @ServisKayitNo = 1, @MarkaKodu = N''paksan'', @Gerekce = @G, @YapanGirisAdi = @Y, @Uygula = 0;'),
 (N'TalebiIptalEt',              N'EXEC yonetim.TalebiIptalEt @TalepNumarasi = N''SRV2600124'', @IptalNedeniKodu = N''musteriVazgecti'', @Gerekce = @G, @YapanGirisAdi = @Y, @Uygula = 0;'),
 (N'TalebiKapat',                N'EXEC yonetim.TalebiKapat @TalepNumarasi = N''SRV2600124'', @Gerekce = @G, @YapanGirisAdi = @Y, @Uygula = 0;'),
 (N'TalebiYenidenAc',            N'EXEC yonetim.TalebiYenidenAc @TalepNumarasi = N''SRV2600126'', @YeniDurumKodu = N''yeni'', @Gerekce = @G, @YapanGirisAdi = @Y, @Uygula = 0;'),
 (N'TalepDurumunuDegistir',      N'EXEC yonetim.TalepDurumunuDegistir @TalepNumarasi = N''SRV2600124'', @YeniDurumKodu = N''incelemede'', @Gerekce = @G, @YapanGirisAdi = @Y, @Uygula = 0;');

/* Listedeki prosedür sayısı şemadakiyle aynı olmalı: yeni bir yonetim
   prosedürü eklenirse bu sınamanın dışında kalmasın. */
SELECT @Sayi = COUNT(*) FROM sys.objects WHERE type = 'P' AND schema_id = SCHEMA_ID(N'yonetim');
IF @Sayi <> (SELECT COUNT(*) FROM @Cagrilar)
BEGIN SET @Mesaj = CONCAT(N'BS-10: yonetim şemasında ', @Sayi, N' prosedür var, listede ',
                          (SELECT COUNT(*) FROM @Cagrilar), N'; liste güncellenmeli'); THROW 59999, @Mesaj, 1; END;

DECLARE @Ad sysname, @Sql nvarchar(1000), @G nvarchar(500), @Y nvarchar(40);
DECLARE @Vaka int;
SET @Vaka = 1;
WHILE @Vaka <= 3
BEGIN
    SET @G = CASE WHEN @Vaka = 1 THEN N'kısa' ELSE @Gerekce END;
    SET @Y = CASE WHEN @Vaka = 2 THEN N'ornek.ayrilan'
                  WHEN @Vaka = 3 THEN N'olmayan.giris'
                  ELSE @Yonetici END;
    SET @Beklenen = CASE WHEN @Vaka = 1 THEN 51100 ELSE 51101 END;
    SET @Sira = 1;
    WHILE @Sira <= (SELECT MAX(Sira) FROM @Cagrilar)
    BEGIN
        SELECT @Ad = Ad, @Sql = Sql FROM @Cagrilar WHERE Sira = @Sira;
        SET @Adim = CONCAT(N'BS-10.', @Vaka, N'.', @Ad); SET @Gelen = 0;
        BEGIN TRY
            BEGIN TRANSACTION;
            EXEC sys.sp_executesql @Sql, N'@G nvarchar(500), @Y nvarchar(40)', @G = @G, @Y = @Y;
            ROLLBACK TRANSACTION;
        END TRY
        BEGIN CATCH
            SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        END CATCH;
        IF @Gelen <> @Beklenen
        BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;
        SET @Sira = @Sira + 1;
    END;
    SET @Vaka = @Vaka + 1;
END;

/* ------------------------------------------------------------------ BS-11
   @Uygula = 0 önizlemesi hiçbir satır bırakmaz; @Uygula = 1 tam bir ana
   IslemKaydi yazar (KaynakUygulamaKodu = yonetim, YapanTuruKodu = personel,
   AyrintiJson'da gerekce, sqlGirisi ve bilgisayar). */
SET @Adim = N'BS-11.onizleme'; SET @Gelen = 0;
DECLARE @KayitOnce int, @KayitSonra int, @TalepOnce int;
SELECT @KayitOnce = COUNT(*) FROM denetim.IslemKaydi;
SELECT @TalepOnce = COUNT(*) FROM talep.DurumGecmisi;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC yonetim.TalepDurumunuDegistir @TalepNumarasi = N'SRV2600124', @YeniDurumKodu = N'incelemede',
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 0;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': önizleme hata verdi (', @Gelen, N') — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;
SELECT @KayitSonra = COUNT(*) FROM denetim.IslemKaydi;
IF @KayitSonra <> @KayitOnce
BEGIN SET @Mesaj = CONCAT(@Adim, N': önizleme işlem kaydı bıraktı (', @KayitOnce, N' → ', @KayitSonra, N')'); THROW 59999, @Mesaj, 1; END;
SELECT @Sayi = COUNT(*) FROM talep.DurumGecmisi;
IF @Sayi <> @TalepOnce
BEGIN SET @Mesaj = CONCAT(@Adim, N': önizleme durum geçmişi bıraktı (', @TalepOnce, N' → ', @Sayi, N')'); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'BS-11.uygula'; SET @Gelen = 0; SET @Sayi = -1;
BEGIN TRY
    BEGIN TRANSACTION;
    SELECT @KayitOnce = COUNT(*) FROM denetim.IslemKaydi WHERE IslemTuruKodu = N'talepDurumuElleDegisti';
    EXEC yonetim.TalepDurumunuDegistir @TalepNumarasi = N'SRV2600124', @YeniDurumKodu = N'incelemede',
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    SELECT @Sayi = COUNT(*) - @KayitOnce FROM denetim.IslemKaydi WHERE IslemTuruKodu = N'talepDurumuElleDegisti';
    SELECT @Metin = CONCAT(KaynakUygulamaKodu, N'/', YapanTuruKodu, N'/',
                           CASE WHEN JSON_VALUE(AyrintiJson, N'$.gerekce') IS NOT NULL
                                 AND JSON_VALUE(AyrintiJson, N'$.sqlGirisi') IS NOT NULL
                                 AND JSON_VALUE(AyrintiJson, N'$.bilgisayar') IS NOT NULL
                                THEN N'ayrinti' ELSE N'ayrintiEksik' END)
      FROM denetim.IslemKaydi
     WHERE IslemTuruKodu = N'talepDurumuElleDegisti'
       AND KayitNo = (SELECT MAX(KayitNo) FROM denetim.IslemKaydi WHERE IslemTuruKodu = N'talepDurumuElleDegisti');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': uygulama hata verdi (', @Gelen, N') — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;
IF @Sayi <> 1
BEGIN SET @Mesaj = CONCAT(@Adim, N': tam 1 ana işlem kaydı beklenirdi, ', @Sayi); THROW 59999, @Mesaj, 1; END;
IF @Metin <> N'yonetim/personel/ayrinti'
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen yonetim/personel/ayrinti, gelen ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ BS-12
   TalebiKapat: bekleyen hak edişli talepte 51110; ödemesi onaylanmamış
   müşteri parça talebinde 51111; kapandi elle seçilemeyen türde 51112. */
SET @Adim = N'BS-12.1'; SET @Beklenen = 51110; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    /* SRV-26-00123'ün hak edişi onaylı; önce bekliyor yapmak için
       HakEdisOnayiniGeriAl kullanılır — yönetici tabloya yazamaz. */
    EXEC yonetim.HakEdisOnayiniGeriAl @TalepNumarasi = N'SRV2600123', @ZiyaretNo = 1,
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    EXEC yonetim.TalebiKapat @TalepNumarasi = N'SRV2600123',
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'BS-12.2'; SET @Beklenen = 51111; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC yonetim.OdemeOnayiniGeriAl @TalepNumarasi = N'YPR2600125',
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    EXEC yonetim.TalebiKapat @TalepNumarasi = N'YPR2600125',
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ BS-13
   TalebiKapat uygun talepte: Kapanis (personelFormu, KapanisNotu = gerekçe),
   Kapali = 1, DurumGecmisi.MusteriyeBildirildi = 0. */
SET @Adim = N'BS-13'; SET @Gelen = 0; SET @Metin = NULL;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC yonetim.TalebiKapat @TalepNumarasi = N'SRV2600124',
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    SELECT @Metin = CONCAT(k.KapanisTuruKodu, N'/', t.Kapali, N'/',
                           (SELECT TOP (1) CAST(g.MusteriyeBildirildi AS nvarchar(1))
                              FROM talep.DurumGecmisi AS g
                             WHERE g.TalepKimlik = t.Kimlik ORDER BY g.KayitNo DESC),
                           N'/', CASE WHEN k.KapanisNotu = @Gerekce THEN N'not' ELSE N'notYok' END)
      FROM talep.Talep AS t
      JOIN talep.Kapanis AS k ON k.TalepKimlik = t.Kimlik
     WHERE t.Numara = N'SRV2600124';
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;
IF @Metin <> N'personelFormu/1/0/not'
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen personelFormu/1/0/not, gelen ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ BS-14
   TalebiYenidenAc iptal talepte geçer; TalebiIptalEt açıklama zorunlu
   nedenle açıklamasız 51114; TalepDurumunuDegistir kapalı hedefle 51112. */
SET @Adim = N'BS-14.1'; SET @Gelen = 0; SET @Metin = NULL;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC yonetim.TalebiYenidenAc @TalepNumarasi = N'SRV2600126', @YeniDurumKodu = N'yeni',
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    SELECT @Metin = CONCAT(t.Kapali, N'/', ISNULL(CONVERT(nvarchar(30), t.KapanmaZamani), N'-'), N'/',
                           (SELECT COUNT(*) FROM talep.YenidenAcma AS y WHERE y.TalepKimlik = t.Kimlik))
      FROM talep.Talep AS t WHERE t.Numara = N'SRV2600126';
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;
IF @Metin <> N'0/-/1'
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen 0/-/1 (açık, kapanma yok, bir yeniden açma), gelen ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'BS-14.2'; SET @Beklenen = 51114; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC yonetim.TalebiIptalEt @TalepNumarasi = N'SRV2600124', @IptalNedeniKodu = N'baskaNeden',
         @Aciklama = NULL, @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'BS-14.3'; SET @Beklenen = 51112; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC yonetim.TalepDurumunuDegistir @TalepNumarasi = N'SRV2600124', @YeniDurumKodu = N'kapandi',
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ BS-15
   DekontuGecersizKil: başka talebin dekont KayitNo'suyla 51104;
   ödeme onaylıyken 51111. */
/* Dekont, ödemesi onaylı YPR-26-00125'e ait olmalı: BS-15.1 onu BAŞKA bir
   talebin numarasıyla sorar (51104), BS-15.2 kendi talebiyle sorar ama
   ödeme onayı etkin olduğu için 51111 alır. */
DECLARE @DekontNo bigint;
SELECT @DekontNo = d.KayitNo FROM talep.Dekont AS d
  JOIN talep.Talep AS t ON t.Kimlik = d.TalepKimlik
 WHERE t.Numara = N'YPR2600125';
IF @DekontNo IS NULL
    THROW 59999, N'BS-15: YPR-26-00125''in dekontu bulunamadı', 1;
SET @Adim = N'BS-15.1'; SET @Beklenen = 51104; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC yonetim.DekontuGecersizKil @TalepNumarasi = N'SRV2600123', @DekontKayitNo = @DekontNo,
         @GecersizNedeni = N'<Codex metni: S05 dekont geçersizlik nedeni>',
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'BS-15.2'; SET @Beklenen = 51111; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC yonetim.DekontuGecersizKil @TalepNumarasi = N'YPR2600125', @DekontKayitNo = @DekontNo,
         @GecersizNedeni = N'<Codex metni: S05 dekont geçersizlik nedeni>',
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ BS-16
   ServistenMarkaYetkisiniAl: önizleme bitecek atamaları ve açık talepleri
   listeler; uygulamada yetki biter ve makinenin servisi zincirin sonraki
   adımına düşer. */
SET @Adim = N'BS-16'; SET @Gelen = 0; SET @Metin = NULL;
DECLARE @ServisKayitNo bigint;
SELECT @ServisKayitNo = s.KayitNo
  FROM servis.Servis AS s
  JOIN makine.MakineninServisi AS ms ON ms.ServisKimlik = s.Kimlik
  JOIN makine.Makine AS m ON m.Kimlik = ms.MakineKimlik
 WHERE m.SeriNo = N'IPAK202400157';
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC yonetim.ServistenMarkaYetkisiniAl @ServisKayitNo = @ServisKayitNo, @MarkaKodu = N'paksan',
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    SELECT @Metin = CAST(Etkin AS nvarchar(1)) FROM servis.MarkaYetkisi
     WHERE ServisKimlik = (SELECT Kimlik FROM servis.Servis WHERE KayitNo = @ServisKayitNo)
       AND MarkaKodu = N'paksan';
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;
IF @Metin <> N'0'
BEGIN SET @Mesaj = CONCAT(@Adim, N': yetki alınınca Etkin 0 olmalıydı, gelen ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ BS-17
   HakEdisOnayiniGeriAl: ters hareket, asılda GeriAlinmaZamani, hak ediş
   bekliyor, talep onayBekliyor; ardından aynı harekete ikinci düzeltme
   51141; kaynağa bağlı harekete @DogruTutar 51143. */
SET @Adim = N'BS-17.1'; SET @Gelen = 0; SET @Metin = NULL;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC yonetim.HakEdisOnayiniGeriAl @TalepNumarasi = N'SRV2600123', @ZiyaretNo = 1,
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    SELECT @Metin = CONCAT(h.DurumKodu, N'/', t.DurumKodu, N'/',
                           (SELECT COUNT(*) FROM hakedis.ServisHesapHareketi AS x
                             WHERE x.HakEdisKimlik = h.Kimlik AND x.GeriAlinmaZamani IS NOT NULL), N'/',
                           (SELECT COUNT(*) FROM hakedis.ServisHesapHareketi AS x
                             WHERE x.DuzeltilenHareketKimlik IS NOT NULL))
      FROM hakedis.HakEdis AS h
      JOIN talep.Talep AS t ON t.Kimlik = h.TalepKimlik
     WHERE t.Numara = N'SRV2600123';
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;
IF @Metin <> N'bekliyor/onayBekliyor/1/1'
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen bekliyor/onayBekliyor/1/1, gelen ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'BS-17.2'; SET @Beklenen = 51141; SET @Gelen = 0;
/* Hareket S05'in kendi hak edişine ait olmalı: S02'nin hareketleri ödenmiş
   bir döneme bağlıdır ve düzeltme orada 51140 ("taslak olmayan döküm")
   verir — sınanan şey o değil. */
DECLARE @HareketNo bigint;
SELECT @HareketNo = h.KayitNo
  FROM hakedis.ServisHesapHareketi AS h
  JOIN hakedis.HakEdis AS e ON e.Kimlik = h.HakEdisKimlik
  JOIN talep.Talep AS t ON t.Kimlik = e.TalepKimlik
 WHERE t.Numara = N'SRV2600123' AND h.HareketTuruKodu = N'hakEdisAlacagi';
IF @HareketNo IS NULL
    THROW 59999, N'BS-17: SRV-26-00123''ün hak ediş alacağı hareketi bulunamadı', 1;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC yonetim.HakEdisOnayiniGeriAl @TalepNumarasi = N'SRV2600123', @ZiyaretNo = 1,
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    EXEC yonetim.HesapHareketiniDuzelt @HareketKayitNo = @HareketNo,
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'BS-17.3'; SET @Beklenen = 51143; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC yonetim.HesapHareketiniDuzelt @HareketKayitNo = @HareketNo, @DogruTutar = 999.00,
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ BS-18
   MusteriTelefonunuDegistir: yeni telefon başka etkin hesapta → 51121;
   hesaplar birleştirildikten sonra aynı değişiklik geçer. */
SET @Adim = N'BS-18.1'; SET @Beklenen = 51121; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC yonetim.MusteriTelefonunuDegistir @EskiTelefon = N'+905321234567',
         @YeniTelefon = N'+905321238888',
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'BS-18.2'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC yonetim.HesaplariBirlestir @KalacakTelefon = N'+905321234567',
         @BirlesecekTelefon = N'+905321238888',
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    EXEC yonetim.MusteriTelefonunuDegistir @EskiTelefon = N'+905321234567',
         @YeniTelefon = N'+905321238888',
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': birleşmeden sonra telefon değişikliği geçmeliydi, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ BS-20
   AyarDegistir: tamsayı ayara N'72 saat' → 51150; N'72' geçer ve
   gorunum.TalepListesi.Gecikti yeni değere göre hesaplanır. */
SET @Adim = N'BS-20.1'; SET @Beklenen = 51150; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC yonetim.AyarDegistir @Anahtar = N'TalepGecikmeSaati', @YeniDeger = N'72 saat',
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'BS-20.2'; SET @Gelen = 0; SET @Metin = NULL;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC yonetim.AyarDegistir @Anahtar = N'TalepGecikmeSaati', @YeniDeger = N'72',
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    SELECT @Metin = Deger FROM gorunum.GecerliAyar
     WHERE Anahtar = N'TalepGecikmeSaati' AND SirketKodu IS NULL AND MarkaKodu IS NULL;
    /* Gecikti kolonu yeni değere göre hesaplanabilmeli (görünüm çalışmalı). */
    SELECT @Sayi = COUNT(*) FROM gorunum.TalepListesi WHERE Gecikti IS NOT NULL;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;
IF @Metin <> N'72'
BEGIN SET @Mesaj = CONCAT(@Adim, N': GecerliAyar 72 vermeliydi, gelen ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ BS-21
   KisiselVerileriAnonimlestir: hesaplı ve hesapsız kayıtları olan telefon,
   başvuru KayitNo'suyla. Ad, soyad ve telefonun ulusal kısmı hiçbir
   nvarchar kolonda kalmaz (kvkk.BasvuruTalebi hariç); başvuru sonuclandi. */
SET @Adim = N'BS-21'; SET @Gelen = 0; SET @Metin = NULL;
DECLARE @BasvuruNo bigint;
SELECT @BasvuruNo = MIN(KayitNo) FROM kvkk.BasvuruTalebi;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC yonetim.KisiselVerileriAnonimlestir @Telefon = N'+905321238888',
         @BasvuruKayitNo = @BasvuruNo,
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    SELECT @Metin = DurumKodu FROM kvkk.BasvuruTalebi WHERE KayitNo = @BasvuruNo;
    SELECT @Sayi = COUNT(*) FROM musteri.Hesap WHERE TelefonE164 = N'+905321238888';
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;
IF @Metin <> N'sonuclandi'
BEGIN SET @Mesaj = CONCAT(@Adim, N': başvuru sonuclandi olmalıydı, gelen ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;
IF @Sayi <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': anonimleştirmeden sonra telefon hesapta duruyor (', @Sayi, N')'); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ BS-19
   GirisSifresiniSifirla: dönen jetonla uygulama girişinden erisim.SifreYaz.
   Jeton uygulama bölümünde kullanılır; burada yalnız prosedürün jeton
   ürettiği ve kaydı yazdığı doğrulanır (KS-57 jetonun tek kullanımlık
   olduğunu ayrıca sınar). */
SET @Adim = N'BS-19'; SET @Gelen = 0; SET @Sayi = -1;
BEGIN TRY
    BEGIN TRANSACTION;
    SELECT @KayitOnce = COUNT(*) FROM erisim.SifreSifirlamaJetonu;
    EXEC yonetim.GirisSifresiniSifirla @GirisAdi = N'ornek.satis',
         @Gerekce = @Gerekce, @YapanGirisAdi = @Yonetici, @Uygula = 1;
    SELECT @Sayi = COUNT(*) - @KayitOnce FROM erisim.SifreSifirlamaJetonu;
    SELECT @Metin = CAST(COUNT(*) AS nvarchar(10)) FROM erisim.Oturum AS o
      JOIN erisim.Kullanici AS k ON k.Kimlik = o.KullaniciKimlik
     WHERE k.GirisAdi = N'ornek.satis' AND o.KapanmaZamani IS NULL;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;
IF @Sayi <> 1
BEGIN SET @Mesaj = CONCAT(@Adim, N': tam 1 sıfırlama jetonu beklenirdi, ', @Sayi); THROW 59999, @Mesaj, 1; END;
IF @Metin <> N'0'
BEGIN SET @Mesaj = CONCAT(@Adim, N': sıfırlamadan sonra açık oturum kalmamalıydı, ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

PRINT 'S05 yönetici bölümü tamam.';
