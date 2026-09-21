/* ==========================================================================
   R08 — yonetim prosedürleri (tasarim.md Bölüm 3.1.5, 3.5, 3.6)

   Kurallı elle düzeltme prosedürleri. SSMS'ten yönetici girişiyle
   çalıştırılır; rol_yonetici tablolara doğrudan yazamaz, yazma yalnız bu
   prosedürlerle (sahiplik zinciri) olur.

   Ortak sözleşme (tasarim.md 3.5.1) — her prosedürde aynı sıra:
     1. SET NOCOUNT ON; SET XACT_ABORT ON;
     2. Gerekçe en az 10 karakter, yoksa 51100.
     3. @YapanGirisAdi yardim.Sadelestir(...).GirisAdi ile normalleştirilir;
        aktif personel girişi olmalı (erisim.Kullanici TurKodu = personel,
        Aktif = 1; personel.Personel AyrilmaZamani boş), yoksa 51101.
     4. Girdiler yardim.Sadelestir ile normalleştirilir; hedef bulunur
        (51102 yok, 51103 birden çok, 51104 numara ile KayitNo uyuşmuyor).
     5. İşlem açılır (çağıran işlem içindeyse kayıt noktası) ve
        sistem.YapanAyarla N'personel', …, N'yonetim',
        @MusteriyeBildirildi = 0 çağrılır.
     6. İş kapıları hedef satır kilitlenerek (UPDLOCK, HOLDLOCK) denetlenir.
     7. Yazma; yazılan satırlarda Yapan grubu personel / yonetim.
     8. denetim.IslemKaydi: AyrintiJson = {gerekce, sqlGirisi, bilgisayar,
        onceki, sonraki, …}; müşterinin adı, telefonu, adresi yazılmaz
        (müşteri yerine hesapKayitNo).
     9. Sonuç kümesi: Bolum, Uygulandi, Mesaj, etkilenen kayıtlar, önceki ve
        sonraki değerler; liste gerekiyorsa ek kümeler (sayısı sabit).
    10. @Uygula = 1 ise COMMIT; değilse ROLLBACK (önizleme: işlem kaydı dahil
        hiçbir şey kalmaz). Çağıran işlem içindeyse önizleme kayıt noktasına
        döner, uygulama çağıranın işlemine bırakılır.

   Bağımlılık: R01 (yardim.Sadelestir), R02 (sistem.YapanAyarla), R03
   (makine.MakineninServisi, gorunum.GecerliAyar), R04 (talep ve hak ediş
   tetikleyicileri), R05 (musteri.HesabiAnonimlestir), R06
   (gorunum.TalepListesi). kod.IslemTuru, kod.KayitTuru ve durum kodları
   tohumdan (T01) gelir. Yetki V0015'te (EXECUTE ON SCHEMA::yonetim).
   Dinamik SQL yoktur.
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. yonetim.TalepDurumunuDegistir
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yonetim.TalepDurumunuDegistir
    @TalepNumarasi nvarchar(400),
    @YeniDurumKodu nvarchar(40),
    @Gerekce       nvarchar(500),
    @YapanGirisAdi nvarchar(40),
    @Uygula        bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @DisIslem bit = CASE WHEN @@TRANCOUNT > 0 THEN 1 ELSE 0 END;
    DECLARE @YapanKullaniciKimlik uniqueidentifier;
    DECLARE @YapanAdi nvarchar(150);
    DECLARE @YapanRolAdi nvarchar(100);
    DECLARE @Ayrinti nvarchar(max);

    DECLARE @YeniDurum nvarchar(40) = LTRIM(RTRIM(ISNULL(@YeniDurumKodu, N'')));
    DECLARE @TalepKimlik uniqueidentifier;
    DECLARE @TalepNo nvarchar(10);
    DECLARE @KayitNo bigint;
    DECLARE @TurKodu nvarchar(40);
    DECLARE @KaynakKodu nvarchar(40);
    DECLARE @OncekiDurum nvarchar(40);
    DECLARE @Kapali bit;

    SET @Uygula = ISNULL(@Uygula, 0);
    SET @Gerekce = LTRIM(RTRIM(@Gerekce));
    IF LEN(ISNULL(@Gerekce, N'')) < 10
        THROW 51100, N'düzeltmenin gerekçesini en az 10 karakterle yazın', 1;

    SELECT @YapanKullaniciKimlik = k.Kimlik, @YapanAdi = p.AdSoyad, @YapanRolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@YapanGirisAdi) AS s)
      AND k.TurKodu = N'personel' AND k.Aktif = 1 AND p.AyrilmaZamani IS NULL;
    IF @YapanKullaniciKimlik IS NULL
        THROW 51101, N'işlemi yapan giriş adı aktif bir personele ait değil; işlemi yapan personelin aktif giriş adını verin', 1;

    SELECT @TalepKimlik = t.Kimlik
    FROM talep.Talep AS t
    WHERE t.Numara = (SELECT s.Kod FROM yardim.Sadelestir(@TalepNumarasi) AS s);
    IF @TalepKimlik IS NULL
        THROW 51102, N'bu numarayla talep bulunamadı; verilen bilgileri kontrol edip yeniden çalıştırın', 1;

    IF @DisIslem = 0
        BEGIN TRANSACTION;
    ELSE
        SAVE TRANSACTION YonetimOnizleme;

    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @YapanKullaniciKimlik,
         @YapanHesapKimlik = NULL, @YapanAdi = @YapanAdi, @KaynakUygulamaKodu = N'yonetim',
         @UygulamaSurumu = NULL, @MusteriyeBildirildi = 0;

    SELECT @TalepNo = t.Numara, @KayitNo = t.KayitNo, @TurKodu = t.TurKodu, @KaynakKodu = t.KaynakKodu,
           @OncekiDurum = t.DurumKodu, @Kapali = t.Kapali
    FROM talep.Talep AS t WITH (UPDLOCK, HOLDLOCK)
    WHERE t.Kimlik = @TalepKimlik;

    IF @Kapali = 1
        THROW 51113, N'talep kapalı; kapalı talebi açmak için yonetim.TalebiYenidenAc kullanın', 1;
    IF @YeniDurum COLLATE Latin1_General_100_BIN2 = @OncekiDurum
        THROW 51113, N'talep zaten bu durumda; mevcut durumu kontrol edin, aynı durum için yeniden işlem yapmayın', 1;
    IF NOT EXISTS (SELECT 1
                   FROM kod.TalepTuruDurumu AS td
                   JOIN kod.TalepDurumu AS d ON d.Kod = td.DurumKodu
                   WHERE td.TurKodu = @TurKodu AND td.DurumKodu = @YeniDurum
                     AND td.ElleSecilebilir = 1 AND d.Kapali = 0)
        THROW 51112, N'bu durum bu talep türünde elle seçilemez; kapatmak ya da iptal etmek için ilgili prosedürü kullanın', 1;
    IF EXISTS (SELECT 1 FROM hakedis.HakEdis AS h WHERE h.TalepKimlik = @TalepKimlik AND h.DurumKodu = N'bekliyor')
        THROW 51110, N'talepte onay bekleyen hak ediş var; önce hak edişi onaylayın ya da reddedin', 1;
    IF @TurKodu = N'parca' AND @KaynakKodu <> N'servisSiparisi'
       AND @YeniDurum COLLATE Latin1_General_100_BIN2 <> N'yeni'
       AND NOT EXISTS (SELECT 1 FROM talep.OdemeOnayi AS o WHERE o.TalepKimlik = @TalepKimlik AND o.GeriAlinmaZamani IS NULL)
        THROW 51111, N'ödemesi onaylanmamış parça talebi yalnız yeni durumuna alınabilir; yeni durumunu seçin', 1;

    UPDATE talep.Talep
    SET DurumKodu = @YeniDurum,
        GuncellemeZamani = @Simdi
    WHERE Kimlik = @TalepKimlik;

    SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                           JSON_QUERY((SELECT @OncekiDurum AS durumKodu FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS onceki,
                           JSON_QUERY((SELECT @YeniDurum AS durumKodu FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS sonraki
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    VALUES
        (N'talepDurumuElleDegisti', N'talep', @TalepKimlik, @TalepNo, @Ayrinti, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);

    SELECT N'Sonuç' AS Bolum,
           @Uygula AS Uygulandi,
           CASE WHEN @Uygula = 1
                THEN N'talebin durumu değiştirildi; müşteriye bildirim gitmedi'
                ELSE N'önizleme; hiçbir şey kaydedilmedi. Sonucu kontrol edin; değişiklikleri kaydetmek için @Uygula = 1 ile yeniden çalıştırın' END AS Mesaj,
           LEFT(@TalepNo, 3) + N'-' + SUBSTRING(@TalepNo, 4, 2) + N'-' + RIGHT(@TalepNo, 5) AS TalepNumarasi,
           @OncekiDurum AS OncekiDurumKodu,
           (SELECT d.Ad FROM kod.TalepDurumu AS d WHERE d.Kod = @OncekiDurum) AS OncekiDurumAdi,
           @YeniDurum AS YeniDurumKodu,
           (SELECT d.Ad FROM kod.TalepDurumu AS d WHERE d.Kod = @YeniDurum) AS YeniDurumAdi,
           (SELECT MAX(g.KayitNo) FROM talep.DurumGecmisi AS g WHERE g.TalepKimlik = @TalepKimlik) AS DurumGecmisiKayitNo,
           @KayitNo AS KayitNo;

    IF @Uygula = 1
    BEGIN
        IF @DisIslem = 0
            COMMIT TRANSACTION;
    END
    ELSE
    BEGIN
        IF @DisIslem = 0
            ROLLBACK TRANSACTION;
        ELSE
            ROLLBACK TRANSACTION YonetimOnizleme;
    END;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalepDurumunuDegistir',
     @Metin = N'Ne yapar: açık bir talebin durumunu, talep türünde elle seçilebilen başka bir açık duruma alır. Durum geçmişine satır tetikleyiciyle yazılır (MusteriyeBildirildi = 0); işlem kaydı talepDurumuElleDegisti. Kapılar: talep kapalıysa ya da zaten bu durumdaysa 51113; hedef durum kapalı sınıftaysa ya da bu türde elle seçilemiyorsa 51112; talepte onay bekleyen hak ediş varsa 51110; müşteri parça talebinde (servis siparişi değil) etkin ödeme onayı yokken hedef yeni değilse 51111. Ne yapmaz: talebi kapatmaz, iptal etmez, yeniden açmaz (TalebiKapat, TalebiIptalEt, TalebiYenidenAc); masayı ve sahibi değiştirmez; müşteriye bildirim göndermez. Önce @Uygula = 0 ile önizleyin. Örnek: EXEC yonetim.TalepDurumunuDegistir @TalepNumarasi = N''SRV-26-00123'', @YeniDurumKodu = N''incelemede'', @Gerekce = N''Müşteri aradı, servis yeniden inceleyecek'', @YapanGirisAdi = N''ali.yilmaz'', @Uygula = 0;';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalepDurumunuDegistir', @Alt = N'@TalepNumarasi', @AltTuru = N'PARAMETER',
     @Metin = N'Talep numarası, her yazımla (SRV-26-00123, srv2600123).';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalepDurumunuDegistir', @Alt = N'@YeniDurumKodu', @AltTuru = N'PARAMETER',
     @Metin = N'kod.TalepDurumu kodu (büyük/küçük harf kodla aynı yazılır); talep türünde ElleSecilebilir = 1 ve açık sınıfta olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalepDurumunuDegistir', @Alt = N'@Gerekce', @AltTuru = N'PARAMETER',
     @Metin = N'Değişikliğin nedeni; en az 10 karakter. İşlem kaydına yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalepDurumunuDegistir', @Alt = N'@YapanGirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemi yapan personelin giriş adı; aktif personel olmalı. Kayıtlarda yapan olarak bu personel görünür.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalepDurumunuDegistir', @Alt = N'@Uygula', @AltTuru = N'PARAMETER',
     @Metin = N'0 (varsayılan): önizleme, hiçbir şey kaydedilmez. 1: uygulanır.';
GO

/* --------------------------------------------------------------------------
   2. yonetim.TalebiKapat
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yonetim.TalebiKapat
    @TalepNumarasi nvarchar(400),
    @Gerekce       nvarchar(500),
    @YapanGirisAdi nvarchar(40),
    @Uygula        bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @DisIslem bit = CASE WHEN @@TRANCOUNT > 0 THEN 1 ELSE 0 END;
    DECLARE @YapanKullaniciKimlik uniqueidentifier;
    DECLARE @YapanAdi nvarchar(150);
    DECLARE @YapanRolAdi nvarchar(100);
    DECLARE @Ayrinti nvarchar(max);

    DECLARE @TalepKimlik uniqueidentifier;
    DECLARE @TalepNo nvarchar(10);
    DECLARE @KayitNo bigint;
    DECLARE @TurKodu nvarchar(40);
    DECLARE @KaynakKodu nvarchar(40);
    DECLARE @OncekiDurum nvarchar(40);
    DECLARE @OncekiMasa nvarchar(40);
    DECLARE @Kapali bit;
    DECLARE @Kapanis TABLE (KayitNo bigint NOT NULL);
    DECLARE @Yarim TABLE (ZiyaretNo tinyint NOT NULL);

    SET @Uygula = ISNULL(@Uygula, 0);
    SET @Gerekce = LTRIM(RTRIM(@Gerekce));
    IF LEN(ISNULL(@Gerekce, N'')) < 10
        THROW 51100, N'düzeltmenin gerekçesini en az 10 karakterle yazın', 1;

    SELECT @YapanKullaniciKimlik = k.Kimlik, @YapanAdi = p.AdSoyad, @YapanRolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@YapanGirisAdi) AS s)
      AND k.TurKodu = N'personel' AND k.Aktif = 1 AND p.AyrilmaZamani IS NULL;
    IF @YapanKullaniciKimlik IS NULL
        THROW 51101, N'işlemi yapan giriş adı aktif bir personele ait değil; işlemi yapan personelin aktif giriş adını verin', 1;

    SELECT @TalepKimlik = t.Kimlik
    FROM talep.Talep AS t
    WHERE t.Numara = (SELECT s.Kod FROM yardim.Sadelestir(@TalepNumarasi) AS s);
    IF @TalepKimlik IS NULL
        THROW 51102, N'bu numarayla talep bulunamadı; verilen bilgileri kontrol edip yeniden çalıştırın', 1;

    IF @DisIslem = 0
        BEGIN TRANSACTION;
    ELSE
        SAVE TRANSACTION YonetimOnizleme;

    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @YapanKullaniciKimlik,
         @YapanHesapKimlik = NULL, @YapanAdi = @YapanAdi, @KaynakUygulamaKodu = N'yonetim',
         @UygulamaSurumu = NULL, @MusteriyeBildirildi = 0;

    SELECT @TalepNo = t.Numara, @KayitNo = t.KayitNo, @TurKodu = t.TurKodu, @KaynakKodu = t.KaynakKodu,
           @OncekiDurum = t.DurumKodu, @OncekiMasa = t.MasaKodu, @Kapali = t.Kapali
    FROM talep.Talep AS t WITH (UPDLOCK, HOLDLOCK)
    WHERE t.Kimlik = @TalepKimlik;

    IF @Kapali = 1
        THROW 51113, N'talep zaten kapalı; mevcut durumu kontrol edin, yeniden kapatma işlemi yapmayın', 1;
    IF NOT EXISTS (SELECT 1 FROM kod.TalepTuruDurumu AS td
                   WHERE td.TurKodu = @TurKodu AND td.DurumKodu = N'kapandi' AND td.ElleSecilebilir = 1)
        THROW 51112, N'bu talep türünde kapandı durumu elle seçilemez; talebi ilgili iş akışı üzerinden kapatın', 1;
    IF EXISTS (SELECT 1 FROM hakedis.HakEdis AS h WHERE h.TalepKimlik = @TalepKimlik AND h.DurumKodu = N'bekliyor')
        THROW 51110, N'talepte onay bekleyen hak ediş var; önce hak edişi onaylayın ya da reddedin', 1;
    IF @TurKodu = N'parca' AND @KaynakKodu <> N'servisSiparisi'
       AND NOT EXISTS (SELECT 1 FROM talep.OdemeOnayi AS o WHERE o.TalepKimlik = @TalepKimlik AND o.GeriAlinmaZamani IS NULL)
        THROW 51111, N'ödemesi onaylanmamış parça talebi kapatılamaz; önce ödeme kaydını kontrol edip onay sürecini tamamlayın', 1;

    INSERT talep.Kapanis
        (TalepKimlik, KapanisTuruKodu, KapanisNotu, OlusmaZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, KaynakUygulamaKodu, UygulamaSurumu)
    OUTPUT inserted.KayitNo INTO @Kapanis (KayitNo)
    VALUES
        (@TalepKimlik, N'personelFormu', @Gerekce, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, N'yonetim', NULL);

    /* Parça aşamasında kalan ziyaret yarıda kalır (tasarim.md 0.4 talep notu). */
    UPDATE talep.ServisZiyareti
    SET AsamaKodu = N'yarimKaldi'
    OUTPUT inserted.ZiyaretNo INTO @Yarim (ZiyaretNo)
    WHERE TalepKimlik = @TalepKimlik AND AsamaKodu = N'parca';

    UPDATE talep.Talep
    SET DurumKodu = N'kapandi',
        Kapali = 1,
        KapanmaZamani = @Simdi,
        MasaKodu = NULL,
        GuncellemeZamani = @Simdi
    WHERE Kimlik = @TalepKimlik;

    SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                           (SELECT TOP (1) c.KayitNo FROM @Kapanis AS c) AS kapanisKayitNo,
                           JSON_QUERY((SELECT @OncekiDurum AS durumKodu, @OncekiMasa AS masaKodu, CAST(0 AS bit) AS kapali
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS onceki,
                           JSON_QUERY((SELECT N'kapandi' AS durumKodu, CAST(NULL AS nvarchar(40)) AS masaKodu, CAST(1 AS bit) AS kapali,
                                              (SELECT y.ZiyaretNo FROM @Yarim AS y FOR JSON PATH) AS yarimKalanZiyaretler
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS sonraki
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    VALUES
        (N'talepElleKapatildi', N'talep', @TalepKimlik, @TalepNo, @Ayrinti, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);

    SELECT N'Sonuç' AS Bolum,
           @Uygula AS Uygulandi,
           CASE WHEN @Uygula = 1
                THEN N'talep kapatıldı; müşteriye bildirim gitmedi'
                ELSE N'önizleme; hiçbir şey kaydedilmedi. Sonucu kontrol edin; değişiklikleri kaydetmek için @Uygula = 1 ile yeniden çalıştırın' END AS Mesaj,
           LEFT(@TalepNo, 3) + N'-' + SUBSTRING(@TalepNo, 4, 2) + N'-' + RIGHT(@TalepNo, 5) AS TalepNumarasi,
           @OncekiDurum AS OncekiDurumKodu,
           (SELECT d.Ad FROM kod.TalepDurumu AS d WHERE d.Kod = @OncekiDurum) AS OncekiDurumAdi,
           N'kapandi' AS YeniDurumKodu,
           (SELECT d.Ad FROM kod.TalepDurumu AS d WHERE d.Kod = N'kapandi') AS YeniDurumAdi,
           @OncekiMasa AS OncekiMasaKodu,
           (SELECT TOP (1) c.KayitNo FROM @Kapanis AS c) AS KapanisKayitNo,
           (SELECT STRING_AGG(CAST(y.ZiyaretNo AS nvarchar(3)), N', ') FROM @Yarim AS y) AS YarimKalanZiyaretNolari,
           CONVERT(datetime2(0), @Simdi AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS KapanmaZamaniTurkiye,
           @KayitNo AS KayitNo;

    IF @Uygula = 1
    BEGIN
        IF @DisIslem = 0
            COMMIT TRANSACTION;
    END
    ELSE
    BEGIN
        IF @DisIslem = 0
            ROLLBACK TRANSACTION;
        ELSE
            ROLLBACK TRANSACTION YonetimOnizleme;
    END;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalebiKapat',
     @Metin = N'Ne yapar: açık talebi personel formuyla kapatır: talep.Kapanis satırı (KapanisTuruKodu = personelFormu, KapanisNotu = gerekçe), talep kapandı durumuna geçer (Kapali = 1, KapanmaZamani, masa boşalır), durum geçmişi tetikleyiciyle MusteriyeBildirildi = 0 yazılır. Talebin parça aşamasındaki ziyareti yarimKaldi aşamasına geçer. İşlem kaydı talepElleKapatildi. Kapılar: talep zaten kapalıysa 51113; kapandı bu türde elle seçilemiyorsa 51112; onay bekleyen hak ediş varsa 51110; müşteri parça talebinde (servis siparişi değil) etkin ödeme onayı yoksa 51111. Ne yapmaz: müşteriye bildirim göndermez; hak ediş, ödeme ya da sevk kaydı açmaz; iptal etmez (TalebiIptalEt). Örnek: EXEC yonetim.TalebiKapat @TalepNumarasi = N''SRV-26-00123'', @Gerekce = N''İş telefonda çözüldü, servis gitmedi'', @YapanGirisAdi = N''ali.yilmaz'', @Uygula = 0;';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalebiKapat', @Alt = N'@TalepNumarasi', @AltTuru = N'PARAMETER',
     @Metin = N'Talep numarası, her yazımla (SRV-26-00123, srv2600123).';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalebiKapat', @Alt = N'@Gerekce', @AltTuru = N'PARAMETER',
     @Metin = N'Kapatma nedeni; en az 10 karakter. Kapanış notu olarak da yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalebiKapat', @Alt = N'@YapanGirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemi yapan personelin giriş adı; aktif personel olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalebiKapat', @Alt = N'@Uygula', @AltTuru = N'PARAMETER',
     @Metin = N'0 (varsayılan): önizleme, hiçbir şey kaydedilmez. 1: uygulanır.';
GO

/* --------------------------------------------------------------------------
   3. yonetim.TalebiIptalEt
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yonetim.TalebiIptalEt
    @TalepNumarasi   nvarchar(400),
    @IptalNedeniKodu nvarchar(40),
    @Aciklama        nvarchar(1000) = NULL,
    @Gerekce         nvarchar(500),
    @YapanGirisAdi   nvarchar(40),
    @Uygula          bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @DisIslem bit = CASE WHEN @@TRANCOUNT > 0 THEN 1 ELSE 0 END;
    DECLARE @YapanKullaniciKimlik uniqueidentifier;
    DECLARE @YapanAdi nvarchar(150);
    DECLARE @YapanRolAdi nvarchar(100);
    DECLARE @Ayrinti nvarchar(max);

    DECLARE @Neden nvarchar(40) = LTRIM(RTRIM(ISNULL(@IptalNedeniKodu, N'')));
    DECLARE @Acik nvarchar(1000) = NULLIF(LTRIM(RTRIM(@Aciklama)), N'');
    DECLARE @AciklamaZorunlu bit;
    DECLARE @TalepKimlik uniqueidentifier;
    DECLARE @TalepNo nvarchar(10);
    DECLARE @KayitNo bigint;
    DECLARE @TurKodu nvarchar(40);
    DECLARE @OncekiDurum nvarchar(40);
    DECLARE @OncekiMasa nvarchar(40);
    DECLARE @Kapali bit;
    DECLARE @Iptal TABLE (KayitNo bigint NOT NULL);
    DECLARE @Yarim TABLE (ZiyaretNo tinyint NOT NULL);

    SET @Uygula = ISNULL(@Uygula, 0);
    SET @Gerekce = LTRIM(RTRIM(@Gerekce));
    IF LEN(ISNULL(@Gerekce, N'')) < 10
        THROW 51100, N'düzeltmenin gerekçesini en az 10 karakterle yazın', 1;

    SELECT @YapanKullaniciKimlik = k.Kimlik, @YapanAdi = p.AdSoyad, @YapanRolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@YapanGirisAdi) AS s)
      AND k.TurKodu = N'personel' AND k.Aktif = 1 AND p.AyrilmaZamani IS NULL;
    IF @YapanKullaniciKimlik IS NULL
        THROW 51101, N'işlemi yapan giriş adı aktif bir personele ait değil; işlemi yapan personelin aktif giriş adını verin', 1;

    SELECT @TalepKimlik = t.Kimlik
    FROM talep.Talep AS t
    WHERE t.Numara = (SELECT s.Kod FROM yardim.Sadelestir(@TalepNumarasi) AS s);
    IF @TalepKimlik IS NULL
        THROW 51102, N'bu numarayla talep bulunamadı; verilen bilgileri kontrol edip yeniden çalıştırın', 1;

    SELECT @AciklamaZorunlu = n.AciklamaZorunlu
    FROM kod.IptalNedeni AS n
    WHERE n.Kod = @Neden;
    IF @AciklamaZorunlu IS NULL
        THROW 51102, N'bu iptal nedeni kodu yok; kod.IptalNedeni listesine bakın', 1;

    IF @DisIslem = 0
        BEGIN TRANSACTION;
    ELSE
        SAVE TRANSACTION YonetimOnizleme;

    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @YapanKullaniciKimlik,
         @YapanHesapKimlik = NULL, @YapanAdi = @YapanAdi, @KaynakUygulamaKodu = N'yonetim',
         @UygulamaSurumu = NULL, @MusteriyeBildirildi = 0;

    SELECT @TalepNo = t.Numara, @KayitNo = t.KayitNo, @TurKodu = t.TurKodu,
           @OncekiDurum = t.DurumKodu, @OncekiMasa = t.MasaKodu, @Kapali = t.Kapali
    FROM talep.Talep AS t WITH (UPDLOCK, HOLDLOCK)
    WHERE t.Kimlik = @TalepKimlik;

    IF @Kapali = 1
        THROW 51113, N'talep zaten kapalı; mevcut durumu kontrol edin, yeniden kapatma işlemi yapmayın', 1;
    IF @AciklamaZorunlu = 1 AND @Acik IS NULL
        THROW 51114, N'bu iptal nedeni açıklama ister; @Aciklama verin', 1;
    IF NOT EXISTS (SELECT 1 FROM kod.TalepTuruDurumu AS td WHERE td.TurKodu = @TurKodu AND td.DurumKodu = N'iptal')
        THROW 51112, N'bu talep türünde iptal durumu tanımlı değil; talep türünü ve kullanılabilir durumları kontrol edin', 1;
    IF EXISTS (SELECT 1 FROM hakedis.HakEdis AS h WHERE h.TalepKimlik = @TalepKimlik AND h.DurumKodu = N'bekliyor')
        THROW 51110, N'talepte onay bekleyen hak ediş var; önce hak edişi onaylayın ya da reddedin', 1;

    INSERT talep.Iptal
        (TalepKimlik, IptalNedeniKodu, AciklamaZorunlu, Aciklama, OlusmaZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, KaynakUygulamaKodu, UygulamaSurumu)
    OUTPUT inserted.KayitNo INTO @Iptal (KayitNo)
    VALUES
        (@TalepKimlik, @Neden, @AciklamaZorunlu, @Acik, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, N'yonetim', NULL);

    UPDATE talep.ServisZiyareti
    SET AsamaKodu = N'yarimKaldi'
    OUTPUT inserted.ZiyaretNo INTO @Yarim (ZiyaretNo)
    WHERE TalepKimlik = @TalepKimlik AND AsamaKodu = N'parca';

    UPDATE talep.Talep
    SET DurumKodu = N'iptal',
        Kapali = 1,
        KapanmaZamani = @Simdi,
        MasaKodu = NULL,
        GuncellemeZamani = @Simdi
    WHERE Kimlik = @TalepKimlik;

    SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                           (SELECT TOP (1) i.KayitNo FROM @Iptal AS i) AS iptalKayitNo,
                           @Neden AS iptalNedeniKodu,
                           JSON_QUERY((SELECT @OncekiDurum AS durumKodu, @OncekiMasa AS masaKodu, CAST(0 AS bit) AS kapali
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS onceki,
                           JSON_QUERY((SELECT N'iptal' AS durumKodu, CAST(NULL AS nvarchar(40)) AS masaKodu, CAST(1 AS bit) AS kapali,
                                              (SELECT y.ZiyaretNo FROM @Yarim AS y FOR JSON PATH) AS yarimKalanZiyaretler
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS sonraki
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    VALUES
        (N'talepElleIptalEdildi', N'talep', @TalepKimlik, @TalepNo, @Ayrinti, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);

    SELECT N'Sonuç' AS Bolum,
           @Uygula AS Uygulandi,
           CASE WHEN @Uygula = 1
                THEN N'talep iptal edildi; müşteriye bildirim gitmedi'
                ELSE N'önizleme; hiçbir şey kaydedilmedi. Sonucu kontrol edin; değişiklikleri kaydetmek için @Uygula = 1 ile yeniden çalıştırın' END AS Mesaj,
           LEFT(@TalepNo, 3) + N'-' + SUBSTRING(@TalepNo, 4, 2) + N'-' + RIGHT(@TalepNo, 5) AS TalepNumarasi,
           @OncekiDurum AS OncekiDurumKodu,
           (SELECT d.Ad FROM kod.TalepDurumu AS d WHERE d.Kod = @OncekiDurum) AS OncekiDurumAdi,
           N'iptal' AS YeniDurumKodu,
           (SELECT d.Ad FROM kod.TalepDurumu AS d WHERE d.Kod = N'iptal') AS YeniDurumAdi,
           @Neden AS IptalNedeniKodu,
           (SELECT n.Ad FROM kod.IptalNedeni AS n WHERE n.Kod = @Neden) AS IptalNedeniAdi,
           @Acik AS Aciklama,
           (SELECT TOP (1) i.KayitNo FROM @Iptal AS i) AS IptalKayitNo,
           (SELECT STRING_AGG(CAST(y.ZiyaretNo AS nvarchar(3)), N', ') FROM @Yarim AS y) AS YarimKalanZiyaretNolari,
           @KayitNo AS KayitNo;

    IF @Uygula = 1
    BEGIN
        IF @DisIslem = 0
            COMMIT TRANSACTION;
    END
    ELSE
    BEGIN
        IF @DisIslem = 0
            ROLLBACK TRANSACTION;
        ELSE
            ROLLBACK TRANSACTION YonetimOnizleme;
    END;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalebiIptalEt',
     @Metin = N'Ne yapar: açık talebi iptal eder: talep.Iptal satırı (neden kodu, açıklama), talep iptal durumuna geçer (Kapali = 1, KapanmaZamani, masa boşalır), durum geçmişi tetikleyiciyle MusteriyeBildirildi = 0 yazılır; parça aşamasındaki ziyaret yarimKaldi olur. İşlem kaydı talepElleIptalEdildi (açıklama metni işlem kaydına yazılmaz). Kapılar: neden kodu yoksa 51102; talep zaten kapalıysa 51113; neden açıklama istiyorsa ve açıklama boşsa 51114; tür iptal durumunu tanımıyorsa 51112; onay bekleyen hak ediş varsa 51110. Ne yapmaz: ödeme onayını, dekontu ya da hak edişi geri almaz; müşteriye bildirim göndermez. Örnek: EXEC yonetim.TalebiIptalEt @TalepNumarasi = N''YPR-26-00058'', @IptalNedeniKodu = N''musteriVazgecti'', @Aciklama = NULL, @Gerekce = N''Müşteri telefonda vazgeçtiğini söyledi'', @YapanGirisAdi = N''ali.yilmaz'', @Uygula = 0;';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalebiIptalEt', @Alt = N'@TalepNumarasi', @AltTuru = N'PARAMETER',
     @Metin = N'Talep numarası, her yazımla.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalebiIptalEt', @Alt = N'@IptalNedeniKodu', @AltTuru = N'PARAMETER',
     @Metin = N'kod.IptalNedeni kodu (kodla aynı yazılır).';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalebiIptalEt', @Alt = N'@Aciklama', @AltTuru = N'PARAMETER',
     @Metin = N'İptal açıklaması (en çok 1000 karakter); nedenin AciklamaZorunlu değeri 1 ise zorunlu. talep.Iptal.Aciklama olarak saklanır.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalebiIptalEt', @Alt = N'@Gerekce', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemin nedeni; en az 10 karakter. İşlem kaydına yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalebiIptalEt', @Alt = N'@YapanGirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemi yapan personelin giriş adı; aktif personel olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalebiIptalEt', @Alt = N'@Uygula', @AltTuru = N'PARAMETER',
     @Metin = N'0 (varsayılan): önizleme, hiçbir şey kaydedilmez. 1: uygulanır.';
GO

/* --------------------------------------------------------------------------
   4. yonetim.TalebiYenidenAc
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yonetim.TalebiYenidenAc
    @TalepNumarasi nvarchar(400),
    @YeniDurumKodu nvarchar(40),
    @Gerekce       nvarchar(500),
    @YapanGirisAdi nvarchar(40),
    @Uygula        bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @DisIslem bit = CASE WHEN @@TRANCOUNT > 0 THEN 1 ELSE 0 END;
    DECLARE @YapanKullaniciKimlik uniqueidentifier;
    DECLARE @YapanAdi nvarchar(150);
    DECLARE @YapanRolAdi nvarchar(100);
    DECLARE @Ayrinti nvarchar(max);

    DECLARE @YeniDurum nvarchar(40) = LTRIM(RTRIM(ISNULL(@YeniDurumKodu, N'')));
    DECLARE @TalepKimlik uniqueidentifier;
    DECLARE @TalepNo nvarchar(10);
    DECLARE @KayitNo bigint;
    DECLARE @TurKodu nvarchar(40);
    DECLARE @OncekiDurum nvarchar(40);
    DECLARE @OncekiKapanma datetime2(3);
    DECLARE @Kapali bit;
    DECLARE @Acma TABLE (KayitNo bigint NOT NULL);

    SET @Uygula = ISNULL(@Uygula, 0);
    SET @Gerekce = LTRIM(RTRIM(@Gerekce));
    IF LEN(ISNULL(@Gerekce, N'')) < 10
        THROW 51100, N'düzeltmenin gerekçesini en az 10 karakterle yazın', 1;

    SELECT @YapanKullaniciKimlik = k.Kimlik, @YapanAdi = p.AdSoyad, @YapanRolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@YapanGirisAdi) AS s)
      AND k.TurKodu = N'personel' AND k.Aktif = 1 AND p.AyrilmaZamani IS NULL;
    IF @YapanKullaniciKimlik IS NULL
        THROW 51101, N'işlemi yapan giriş adı aktif bir personele ait değil; işlemi yapan personelin aktif giriş adını verin', 1;

    SELECT @TalepKimlik = t.Kimlik
    FROM talep.Talep AS t
    WHERE t.Numara = (SELECT s.Kod FROM yardim.Sadelestir(@TalepNumarasi) AS s);
    IF @TalepKimlik IS NULL
        THROW 51102, N'bu numarayla talep bulunamadı; verilen bilgileri kontrol edip yeniden çalıştırın', 1;

    IF @DisIslem = 0
        BEGIN TRANSACTION;
    ELSE
        SAVE TRANSACTION YonetimOnizleme;

    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @YapanKullaniciKimlik,
         @YapanHesapKimlik = NULL, @YapanAdi = @YapanAdi, @KaynakUygulamaKodu = N'yonetim',
         @UygulamaSurumu = NULL, @MusteriyeBildirildi = 0;

    SELECT @TalepNo = t.Numara, @KayitNo = t.KayitNo, @TurKodu = t.TurKodu,
           @OncekiDurum = t.DurumKodu, @OncekiKapanma = t.KapanmaZamani, @Kapali = t.Kapali
    FROM talep.Talep AS t WITH (UPDLOCK, HOLDLOCK)
    WHERE t.Kimlik = @TalepKimlik;

    IF @Kapali = 0
        THROW 51113, N'talep zaten açık; durumunu değiştirmek için yonetim.TalepDurumunuDegistir kullanın', 1;
    IF NOT EXISTS (SELECT 1
                   FROM kod.TalepTuruDurumu AS td
                   JOIN kod.TalepDurumu AS d ON d.Kod = td.DurumKodu
                   WHERE td.TurKodu = @TurKodu AND td.DurumKodu = @YeniDurum
                     AND td.ElleSecilebilir = 1 AND d.Kapali = 0)
        THROW 51112, N'talep bu duruma açılamaz; bu türde elle seçilebilen açık bir durum verin', 1;

    INSERT talep.YenidenAcma
        (TalepKimlik, OncekiDurumKodu, Aciklama, MusteriyeBildirilmedi, OlusmaZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, KaynakUygulamaKodu, UygulamaSurumu)
    OUTPUT inserted.KayitNo INTO @Acma (KayitNo)
    VALUES
        (@TalepKimlik, @OncekiDurum, @Gerekce, 1, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, N'yonetim', NULL);

    UPDATE talep.Talep
    SET DurumKodu = @YeniDurum,
        Kapali = 0,
        KapanmaZamani = NULL,
        GuncellemeZamani = @Simdi
    WHERE Kimlik = @TalepKimlik;

    SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                           (SELECT TOP (1) a.KayitNo FROM @Acma AS a) AS yenidenAcmaKayitNo,
                           JSON_QUERY((SELECT @OncekiDurum AS durumKodu, CAST(1 AS bit) AS kapali, @OncekiKapanma AS kapanmaZamani
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS onceki,
                           JSON_QUERY((SELECT @YeniDurum AS durumKodu, CAST(0 AS bit) AS kapali
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS sonraki
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    VALUES
        (N'talepElleYenidenAcildi', N'talep', @TalepKimlik, @TalepNo, @Ayrinti, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);

    SELECT N'Sonuç' AS Bolum,
           @Uygula AS Uygulandi,
           CASE WHEN @Uygula = 1
                THEN N'talep yeniden açıldı; müşteriye bildirim gitmedi'
                ELSE N'önizleme; hiçbir şey kaydedilmedi. Sonucu kontrol edin; değişiklikleri kaydetmek için @Uygula = 1 ile yeniden çalıştırın' END AS Mesaj,
           LEFT(@TalepNo, 3) + N'-' + SUBSTRING(@TalepNo, 4, 2) + N'-' + RIGHT(@TalepNo, 5) AS TalepNumarasi,
           @OncekiDurum AS OncekiDurumKodu,
           (SELECT d.Ad FROM kod.TalepDurumu AS d WHERE d.Kod = @OncekiDurum) AS OncekiDurumAdi,
           CONVERT(datetime2(0), @OncekiKapanma AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OncekiKapanmaZamaniTurkiye,
           @YeniDurum AS YeniDurumKodu,
           (SELECT d.Ad FROM kod.TalepDurumu AS d WHERE d.Kod = @YeniDurum) AS YeniDurumAdi,
           (SELECT TOP (1) a.KayitNo FROM @Acma AS a) AS YenidenAcmaKayitNo,
           @KayitNo AS KayitNo;

    IF @Uygula = 1
    BEGIN
        IF @DisIslem = 0
            COMMIT TRANSACTION;
    END
    ELSE
    BEGIN
        IF @DisIslem = 0
            ROLLBACK TRANSACTION;
        ELSE
            ROLLBACK TRANSACTION YonetimOnizleme;
    END;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalebiYenidenAc',
     @Metin = N'Ne yapar: kapanmış ya da iptal edilmiş talebi, türünde elle seçilebilen açık bir duruma alarak yeniden açar: talep.YenidenAcma satırı (önceki durum, Aciklama = gerekçe, MusteriyeBildirilmedi = 1), talep açık olur (Kapali = 0, KapanmaZamani boş), durum geçmişi tetikleyiciyle MusteriyeBildirildi = 0 yazılır. İşlem kaydı talepElleYenidenAcildi. Kapılar: talep açıksa 51113; hedef durum açık sınıfta değilse ya da bu türde elle seçilemiyorsa 51112. Ne yapmaz: masayı geri koymaz, eski kapanış ve iptal satırlarını silmez (geçmiş olarak kalır), yarıda kalan ziyareti geri almaz, müşteriye bildirim göndermez. Örnek: EXEC yonetim.TalebiYenidenAc @TalepNumarasi = N''SRV-26-00123'', @YeniDurumKodu = N''incelemede'', @Gerekce = N''Yanlışlıkla iptal edilmişti'', @YapanGirisAdi = N''ali.yilmaz'', @Uygula = 0;';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalebiYenidenAc', @Alt = N'@TalepNumarasi', @AltTuru = N'PARAMETER',
     @Metin = N'Talep numarası, her yazımla.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalebiYenidenAc', @Alt = N'@YeniDurumKodu', @AltTuru = N'PARAMETER',
     @Metin = N'Talebin açılacağı kod.TalepDurumu kodu; açık sınıfta ve bu türde elle seçilebilir olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalebiYenidenAc', @Alt = N'@Gerekce', @AltTuru = N'PARAMETER',
     @Metin = N'Yeniden açma nedeni; en az 10 karakter. talep.YenidenAcma.Aciklama ve işlem kaydına yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalebiYenidenAc', @Alt = N'@YapanGirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemi yapan personelin giriş adı; aktif personel olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'TalebiYenidenAc', @Alt = N'@Uygula', @AltTuru = N'PARAMETER',
     @Metin = N'0 (varsayılan): önizleme, hiçbir şey kaydedilmez. 1: uygulanır.';
GO

/* --------------------------------------------------------------------------
   5. yonetim.MakineyeServisAta
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yonetim.MakineyeServisAta
    @SeriNo        nvarchar(400),
    @MarkaKodu     nvarchar(20) = NULL,
    @ServisKayitNo bigint,
    @AtamaNotu     nvarchar(500) = NULL,
    @Gerekce       nvarchar(500),
    @YapanGirisAdi nvarchar(40),
    @Uygula        bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @DisIslem bit = CASE WHEN @@TRANCOUNT > 0 THEN 1 ELSE 0 END;
    DECLARE @YapanKullaniciKimlik uniqueidentifier;
    DECLARE @YapanAdi nvarchar(150);
    DECLARE @YapanRolAdi nvarchar(100);
    DECLARE @Ayrinti nvarchar(max);

    DECLARE @Kod nvarchar(400);
    DECLARE @Marka nvarchar(20) = NULLIF(LOWER(LTRIM(RTRIM(ISNULL(@MarkaKodu, N''))) COLLATE Latin1_General_100_BIN2), N'');
    DECLARE @MakineSayisi int;
    DECLARE @MakineKimlik uniqueidentifier;
    DECLARE @MakineKayitNo bigint;
    DECLARE @MakineMarka nvarchar(20);
    DECLARE @MakineSeri nvarchar(40);
    DECLARE @ServisKimlik uniqueidentifier;
    DECLARE @ServisAdi nvarchar(200);
    DECLARE @AcikAtamaKimlik uniqueidentifier;
    DECLARE @AcikAtamaKayitNo bigint;
    DECLARE @OncekiServisKimlik uniqueidentifier;
    DECLARE @AtamaNotuDuz nvarchar(500) = NULLIF(LTRIM(RTRIM(@AtamaNotu)), N'');
    DECLARE @Yeni TABLE (KayitNo bigint NOT NULL);

    SET @Uygula = ISNULL(@Uygula, 0);
    SET @Gerekce = LTRIM(RTRIM(@Gerekce));
    IF LEN(ISNULL(@Gerekce, N'')) < 10
        THROW 51100, N'düzeltmenin gerekçesini en az 10 karakterle yazın', 1;

    SELECT @YapanKullaniciKimlik = k.Kimlik, @YapanAdi = p.AdSoyad, @YapanRolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@YapanGirisAdi) AS s)
      AND k.TurKodu = N'personel' AND k.Aktif = 1 AND p.AyrilmaZamani IS NULL;
    IF @YapanKullaniciKimlik IS NULL
        THROW 51101, N'işlemi yapan giriş adı aktif bir personele ait değil; işlemi yapan personelin aktif giriş adını verin', 1;

    SELECT @Kod = s.Kod FROM yardim.Sadelestir(@SeriNo) AS s;

    SELECT @MakineSayisi = COUNT(*)
    FROM makine.Makine AS m
    WHERE m.SeriNo = @Kod AND (@Marka IS NULL OR m.MarkaKodu = @Marka);
    IF @MakineSayisi = 0
        THROW 51102, N'bu seri numarasıyla makine bulunamadı; verilen bilgileri kontrol edip yeniden çalıştırın', 1;
    IF @MakineSayisi > 1
        THROW 51103, N'bu seri numarası birden çok markada var; @MarkaKodu verin', 1;

    SELECT @MakineKimlik = m.Kimlik, @MakineKayitNo = m.KayitNo, @MakineMarka = m.MarkaKodu, @MakineSeri = m.SeriNo
    FROM makine.Makine AS m
    WHERE m.SeriNo = @Kod AND (@Marka IS NULL OR m.MarkaKodu = @Marka);

    SELECT @ServisKimlik = s.Kimlik, @ServisAdi = s.Ad
    FROM servis.Servis AS s
    WHERE s.KayitNo = @ServisKayitNo;
    IF @ServisKimlik IS NULL
        THROW 51102, N'bu KayitNo ile servis bulunamadı; yardim.ServisGoster ile bakın', 1;

    IF @DisIslem = 0
        BEGIN TRANSACTION;
    ELSE
        SAVE TRANSACTION YonetimOnizleme;

    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @YapanKullaniciKimlik,
         @YapanHesapKimlik = NULL, @YapanAdi = @YapanAdi, @KaynakUygulamaKodu = N'yonetim',
         @UygulamaSurumu = NULL, @MusteriyeBildirildi = 0;

    IF NOT EXISTS (SELECT 1
                   FROM servis.Servis AS s WITH (UPDLOCK, HOLDLOCK)
                   JOIN servis.MarkaYetkisi AS y WITH (UPDLOCK, HOLDLOCK) ON y.ServisKimlik = s.Kimlik
                   WHERE s.Kimlik = @ServisKimlik AND s.DurumKodu = N'aktif'
                     AND y.MarkaKodu = @MakineMarka AND y.Etkin = 1)
        THROW 51131, N'servis pasif ya da bu makinenin markasında yetkisi yok; markada yetkili, aktif bir servis seçin', 1;

    SELECT @AcikAtamaKimlik = a.Kimlik, @AcikAtamaKayitNo = a.KayitNo, @OncekiServisKimlik = a.ServisKimlik
    FROM makine.MakineServisAtamasi AS a WITH (UPDLOCK, HOLDLOCK)
    WHERE a.MakineKimlik = @MakineKimlik AND a.BitisZamani IS NULL;

    IF @OncekiServisKimlik = @ServisKimlik
        THROW 51113, N'makine zaten bu servise atanmış; mevcut atamayı kontrol edin, aynı servis için yeniden atama yapmayın', 1;

    IF @AcikAtamaKimlik IS NOT NULL
        UPDATE makine.MakineServisAtamasi
        SET BitisZamani = CASE WHEN BaslangicZamani > @Simdi THEN BaslangicZamani ELSE @Simdi END,
            BitirenKullaniciKimlik = @YapanKullaniciKimlik,
            BitirenAdi = @YapanAdi
        WHERE Kimlik = @AcikAtamaKimlik;

    INSERT makine.MakineServisAtamasi
        (AtamaNotu, MakineKimlik, MarkaKodu, ServisKimlik, KaynakKodu, BaslangicZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, KaynakUygulamaKodu, UygulamaSurumu)
    OUTPUT inserted.KayitNo INTO @Yeni (KayitNo)
    VALUES
        (@AtamaNotuDuz, @MakineKimlik, @MakineMarka, @ServisKimlik, N'personel', @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, N'yonetim', NULL);

    SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                           @MakineSeri AS seriNo, @MakineMarka AS markaKodu, @MakineKayitNo AS makineKayitNo,
                           JSON_QUERY((SELECT os.KayitNo AS servisKayitNo, @AcikAtamaKayitNo AS atamaKayitNo
                                       FROM (SELECT 1 AS x) AS bir
                                       LEFT JOIN servis.Servis AS os ON os.Kimlik = @OncekiServisKimlik
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS onceki,
                           JSON_QUERY((SELECT @ServisKayitNo AS servisKayitNo, (SELECT TOP (1) n.KayitNo FROM @Yeni AS n) AS atamaKayitNo
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS sonraki
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    VALUES
        (N'makineServisiAtandi', N'makine', @MakineKimlik,
         CASE WHEN LEN(@MakineSeri) <= 20 THEN @MakineSeri END, @Ayrinti, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);

    SELECT N'Sonuç' AS Bolum,
           @Uygula AS Uygulandi,
           CASE WHEN @Uygula = 1
                THEN N'makine servise atandı'
                ELSE N'önizleme; hiçbir şey kaydedilmedi. Sonucu kontrol edin; değişiklikleri kaydetmek için @Uygula = 1 ile yeniden çalıştırın' END AS Mesaj,
           @MakineSeri AS SeriNo,
           @MakineMarka AS MarkaKodu,
           os.Ad AS OncekiServisAdi,
           os.KayitNo AS OncekiServisKayitNo,
           @AcikAtamaKayitNo AS BitenAtamaKayitNo,
           @ServisAdi AS YeniServisAdi,
           @ServisKayitNo AS YeniServisKayitNo,
           (SELECT TOP (1) n.KayitNo FROM @Yeni AS n) AS YeniAtamaKayitNo,
           zs.Ad AS ZincirdekiServisAdi,
           ms.ServisKaynagiKodu,
           @MakineKayitNo AS MakineKayitNo
    FROM (SELECT 1 AS x) AS bir
    LEFT JOIN servis.Servis AS os ON os.Kimlik = @OncekiServisKimlik
    LEFT JOIN makine.MakineninServisi AS ms ON ms.MakineKimlik = @MakineKimlik
    LEFT JOIN servis.Servis AS zs ON zs.Kimlik = ms.ServisKimlik;

    IF @Uygula = 1
    BEGIN
        IF @DisIslem = 0
            COMMIT TRANSACTION;
    END
    ELSE
    BEGIN
        IF @DisIslem = 0
            ROLLBACK TRANSACTION;
        ELSE
            ROLLBACK TRANSACTION YonetimOnizleme;
    END;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MakineyeServisAta',
     @Metin = N'Ne yapar: makineyi (seri numarasıyla) bir servise atar: açık atama varsa bitirilir (BitisZamani, bitiren personel), yeni makine.MakineServisAtamasi satırı KaynakKodu = personel ile açılır. Müşterinin servisi zincirde ilk bu atamadan okunur (makine.MakineninServisi). İşlem kaydı makineServisiAtandi. Kapılar: makine yoksa 51102, seri birden çok markadaysa ve @MarkaKodu verilmemişse 51103, servis KayitNo yoksa 51102; servis aktif değilse ya da makinenin markasında etkin yetkisi yoksa 51131; makine zaten bu servise atanmışsa 51113. Ne yapmaz: açık taleplerin servisini değiştirmez (talebin servisi yazıldıktan sonra değişmez; devir backoffice işidir); servise yetki vermez (ServiseMarkaYetkisiVer). Örnek: EXEC yonetim.MakineyeServisAta @SeriNo = N''ORK1270-2024-00157'', @MarkaKodu = N''paksan'', @ServisKayitNo = 17, @AtamaNotu = NULL, @Gerekce = N''Bayinin anlaşmalı servisi değişti'', @YapanGirisAdi = N''ali.yilmaz'', @Uygula = 0;';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MakineyeServisAta', @Alt = N'@SeriNo', @AltTuru = N'PARAMETER',
     @Metin = N'Makinenin seri numarası, her yazımla.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MakineyeServisAta', @Alt = N'@MarkaKodu', @AltTuru = N'PARAMETER',
     @Metin = N'İsteğe bağlı marka kodu; seri tek markada bulunursa gerekmez, birden çok markada bulunursa zorunlu (yoksa 51103).';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MakineyeServisAta', @Alt = N'@ServisKayitNo', @AltTuru = N'PARAMETER',
     @Metin = N'Atanacak servisin KayitNo''su (yardim.ServisGoster ya da gorunum.ServisKarti).';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MakineyeServisAta', @Alt = N'@AtamaNotu', @AltTuru = N'PARAMETER',
     @Metin = N'İsteğe bağlı atama notu (en çok 500 karakter); atama satırına yazılır, işlem kaydına yazılmaz.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MakineyeServisAta', @Alt = N'@Gerekce', @AltTuru = N'PARAMETER',
     @Metin = N'Atamanın nedeni; en az 10 karakter. İşlem kaydına yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MakineyeServisAta', @Alt = N'@YapanGirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemi yapan personelin giriş adı; aktif personel olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MakineyeServisAta', @Alt = N'@Uygula', @AltTuru = N'PARAMETER',
     @Metin = N'0 (varsayılan): önizleme, hiçbir şey kaydedilmez. 1: uygulanır.';
GO

/* --------------------------------------------------------------------------
   6. yonetim.MakineServisAtamasiniKaldir
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yonetim.MakineServisAtamasiniKaldir
    @SeriNo        nvarchar(400),
    @MarkaKodu     nvarchar(20) = NULL,
    @Gerekce       nvarchar(500),
    @YapanGirisAdi nvarchar(40),
    @Uygula        bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @DisIslem bit = CASE WHEN @@TRANCOUNT > 0 THEN 1 ELSE 0 END;
    DECLARE @YapanKullaniciKimlik uniqueidentifier;
    DECLARE @YapanAdi nvarchar(150);
    DECLARE @YapanRolAdi nvarchar(100);
    DECLARE @Ayrinti nvarchar(max);

    DECLARE @Kod nvarchar(400);
    DECLARE @Marka nvarchar(20) = NULLIF(LOWER(LTRIM(RTRIM(ISNULL(@MarkaKodu, N''))) COLLATE Latin1_General_100_BIN2), N'');
    DECLARE @MakineSayisi int;
    DECLARE @MakineKimlik uniqueidentifier;
    DECLARE @MakineKayitNo bigint;
    DECLARE @MakineMarka nvarchar(20);
    DECLARE @MakineSeri nvarchar(40);
    DECLARE @AtamaKimlik uniqueidentifier;
    DECLARE @AtamaKayitNo bigint;
    DECLARE @ServisKimlik uniqueidentifier;

    SET @Uygula = ISNULL(@Uygula, 0);
    SET @Gerekce = LTRIM(RTRIM(@Gerekce));
    IF LEN(ISNULL(@Gerekce, N'')) < 10
        THROW 51100, N'düzeltmenin gerekçesini en az 10 karakterle yazın', 1;

    SELECT @YapanKullaniciKimlik = k.Kimlik, @YapanAdi = p.AdSoyad, @YapanRolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@YapanGirisAdi) AS s)
      AND k.TurKodu = N'personel' AND k.Aktif = 1 AND p.AyrilmaZamani IS NULL;
    IF @YapanKullaniciKimlik IS NULL
        THROW 51101, N'işlemi yapan giriş adı aktif bir personele ait değil; işlemi yapan personelin aktif giriş adını verin', 1;

    SELECT @Kod = s.Kod FROM yardim.Sadelestir(@SeriNo) AS s;

    SELECT @MakineSayisi = COUNT(*)
    FROM makine.Makine AS m
    WHERE m.SeriNo = @Kod AND (@Marka IS NULL OR m.MarkaKodu = @Marka);
    IF @MakineSayisi = 0
        THROW 51102, N'bu seri numarasıyla makine bulunamadı; verilen bilgileri kontrol edip yeniden çalıştırın', 1;
    IF @MakineSayisi > 1
        THROW 51103, N'bu seri numarası birden çok markada var; @MarkaKodu verin', 1;

    SELECT @MakineKimlik = m.Kimlik, @MakineKayitNo = m.KayitNo, @MakineMarka = m.MarkaKodu, @MakineSeri = m.SeriNo
    FROM makine.Makine AS m
    WHERE m.SeriNo = @Kod AND (@Marka IS NULL OR m.MarkaKodu = @Marka);

    IF @DisIslem = 0
        BEGIN TRANSACTION;
    ELSE
        SAVE TRANSACTION YonetimOnizleme;

    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @YapanKullaniciKimlik,
         @YapanHesapKimlik = NULL, @YapanAdi = @YapanAdi, @KaynakUygulamaKodu = N'yonetim',
         @UygulamaSurumu = NULL, @MusteriyeBildirildi = 0;

    SELECT @AtamaKimlik = a.Kimlik, @AtamaKayitNo = a.KayitNo, @ServisKimlik = a.ServisKimlik
    FROM makine.MakineServisAtamasi AS a WITH (UPDLOCK, HOLDLOCK)
    WHERE a.MakineKimlik = @MakineKimlik AND a.BitisZamani IS NULL;

    IF @AtamaKimlik IS NULL
        THROW 51102, N'makinenin açık servis ataması yok; mevcut servis atamasını kontrol edin', 1;

    UPDATE makine.MakineServisAtamasi
    SET BitisZamani = CASE WHEN BaslangicZamani > @Simdi THEN BaslangicZamani ELSE @Simdi END,
        BitirenKullaniciKimlik = @YapanKullaniciKimlik,
        BitirenAdi = @YapanAdi
    WHERE Kimlik = @AtamaKimlik;

    SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                           @MakineSeri AS seriNo, @MakineMarka AS markaKodu, @MakineKayitNo AS makineKayitNo,
                           JSON_QUERY((SELECT s.KayitNo AS servisKayitNo, @AtamaKayitNo AS atamaKayitNo
                                       FROM servis.Servis AS s WHERE s.Kimlik = @ServisKimlik
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS onceki,
                           JSON_QUERY((SELECT zs.KayitNo AS zincirdekiServisKayitNo, ms.ServisKaynagiKodu AS servisKaynagiKodu
                                       FROM (SELECT 1 AS x) AS bir
                                       LEFT JOIN makine.MakineninServisi AS ms ON ms.MakineKimlik = @MakineKimlik
                                       LEFT JOIN servis.Servis AS zs ON zs.Kimlik = ms.ServisKimlik
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS sonraki
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    VALUES
        (N'makineServisAtamasiKaldirildi', N'makine', @MakineKimlik,
         CASE WHEN LEN(@MakineSeri) <= 20 THEN @MakineSeri END, @Ayrinti, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);

    SELECT N'Sonuç' AS Bolum,
           @Uygula AS Uygulandi,
           CASE WHEN @Uygula = 1
                THEN N'makinenin servis ataması kaldırıldı; servis artık bayi zincirinden belirlenir'
                ELSE N'önizleme; hiçbir şey kaydedilmedi. Sonucu kontrol edin; değişiklikleri kaydetmek için @Uygula = 1 ile yeniden çalıştırın' END AS Mesaj,
           @MakineSeri AS SeriNo,
           @MakineMarka AS MarkaKodu,
           s.Ad AS KaldirilanServisAdi,
           s.KayitNo AS KaldirilanServisKayitNo,
           @AtamaKayitNo AS AtamaKayitNo,
           zs.Ad AS ZincirdekiServisAdi,
           zs.KayitNo AS ZincirdekiServisKayitNo,
           ms.ServisKaynagiKodu,
           @MakineKayitNo AS MakineKayitNo
    FROM (SELECT 1 AS x) AS bir
    LEFT JOIN servis.Servis AS s ON s.Kimlik = @ServisKimlik
    LEFT JOIN makine.MakineninServisi AS ms ON ms.MakineKimlik = @MakineKimlik
    LEFT JOIN servis.Servis AS zs ON zs.Kimlik = ms.ServisKimlik;

    IF @Uygula = 1
    BEGIN
        IF @DisIslem = 0
            COMMIT TRANSACTION;
    END
    ELSE
    BEGIN
        IF @DisIslem = 0
            ROLLBACK TRANSACTION;
        ELSE
            ROLLBACK TRANSACTION YonetimOnizleme;
    END;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MakineServisAtamasiniKaldir',
     @Metin = N'Ne yapar: makinenin açık servis atamasını bitirir (BitisZamani, bitiren personel). Sonuçta zincirin şimdi hangi servisi verdiği (makine.MakineninServisi; bayinin servisi ya da boş) görünür. İşlem kaydı makineServisAtamasiKaldirildi. Kapılar: makine yoksa ya da açık atama yoksa 51102; seri birden çok markadaysa ve @MarkaKodu verilmemişse 51103. Ne yapmaz: başka servise atamaz (MakineyeServisAta zaten eski atamayı bitirir); açık taleplere dokunmaz. Örnek: EXEC yonetim.MakineServisAtamasiniKaldir @SeriNo = N''ORK1270-2024-00157'', @MarkaKodu = NULL, @Gerekce = N''Makine bayinin servisine dönecek'', @YapanGirisAdi = N''ali.yilmaz'', @Uygula = 0;';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MakineServisAtamasiniKaldir', @Alt = N'@SeriNo', @AltTuru = N'PARAMETER',
     @Metin = N'Makinenin seri numarası, her yazımla.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MakineServisAtamasiniKaldir', @Alt = N'@MarkaKodu', @AltTuru = N'PARAMETER',
     @Metin = N'İsteğe bağlı marka kodu; seri birden çok markada bulunursa zorunlu.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MakineServisAtamasiniKaldir', @Alt = N'@Gerekce', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemin nedeni; en az 10 karakter. İşlem kaydına yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MakineServisAtamasiniKaldir', @Alt = N'@YapanGirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemi yapan personelin giriş adı; aktif personel olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MakineServisAtamasiniKaldir', @Alt = N'@Uygula', @AltTuru = N'PARAMETER',
     @Metin = N'0 (varsayılan): önizleme, hiçbir şey kaydedilmez. 1: uygulanır.';
GO

/* --------------------------------------------------------------------------
   7. yonetim.MusteriTelefonunuDegistir
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yonetim.MusteriTelefonunuDegistir
    @EskiTelefon                nvarchar(400),
    @YeniTelefon                nvarchar(400),
    @TelefonDegisikligiNumarasi nvarchar(400) = NULL,
    @Gerekce                    nvarchar(500),
    @YapanGirisAdi              nvarchar(40),
    @Uygula                     bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @DisIslem bit = CASE WHEN @@TRANCOUNT > 0 THEN 1 ELSE 0 END;
    DECLARE @YapanKullaniciKimlik uniqueidentifier;
    DECLARE @YapanAdi nvarchar(150);
    DECLARE @YapanRolAdi nvarchar(100);
    DECLARE @Ayrinti nvarchar(max);

    DECLARE @EskiE164 nvarchar(16);
    DECLARE @YeniE164 nvarchar(16);
    DECLARE @YeniUlusal nvarchar(20);
    DECLARE @YeniUlke nvarchar(2);
    DECLARE @UlkeKoduBoy int;
    DECLARE @HesapKimlik uniqueidentifier;
    DECLARE @HesapKayitNo bigint;
    DECLARE @HesapTelefon nvarchar(16);
    DECLARE @HesapUlke nvarchar(2);
    DECLARE @HesapOlusma datetime2(3);
    DECLARE @TelKimlik uniqueidentifier;
    DECLARE @TelNo nvarchar(10);
    DECLARE @TelHesap uniqueidentifier;
    DECLARE @TelDurum nvarchar(40);
    DECLARE @TelYeni nvarchar(16);
    DECLARE @KapatilanOturum int = 0;
    DECLARE @GecmisSatiri TABLE (KayitNo bigint NOT NULL);

    SET @Uygula = ISNULL(@Uygula, 0);
    SET @Gerekce = LTRIM(RTRIM(@Gerekce));
    IF LEN(ISNULL(@Gerekce, N'')) < 10
        THROW 51100, N'düzeltmenin gerekçesini en az 10 karakterle yazın', 1;

    SELECT @YapanKullaniciKimlik = k.Kimlik, @YapanAdi = p.AdSoyad, @YapanRolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@YapanGirisAdi) AS s)
      AND k.TurKodu = N'personel' AND k.Aktif = 1 AND p.AyrilmaZamani IS NULL;
    IF @YapanKullaniciKimlik IS NULL
        THROW 51101, N'işlemi yapan giriş adı aktif bir personele ait değil; işlemi yapan personelin aktif giriş adını verin', 1;

    SELECT @EskiE164 = s.TelefonE164 FROM yardim.Sadelestir(@EskiTelefon) AS s;
    SELECT @YeniE164 = s.TelefonE164, @YeniUlusal = s.TelefonUlusal FROM yardim.Sadelestir(@YeniTelefon) AS s;

    IF @EskiE164 IS NULL
        THROW 51120, N'eski telefon numarası geçersiz; numaraları kontrol edip geçerli biçimde verin', 1;
    IF @YeniE164 IS NULL
        THROW 51120, N'yeni telefon numarası geçersiz; numaraları kontrol edip geçerli biçimde verin', 1;

    SELECT @HesapKimlik = h.Kimlik, @HesapKayitNo = h.KayitNo
    FROM musteri.Hesap AS h
    WHERE h.TelefonE164 = @EskiE164;
    IF @HesapKimlik IS NULL
        THROW 51102, N'eski telefon hiçbir hesabın güncel telefonu değil; yardim.MusteriGoster ile bakın', 1;

    IF NULLIF(LTRIM(RTRIM(@TelefonDegisikligiNumarasi)), N'') IS NOT NULL
    BEGIN
        SELECT @TelKimlik = d.Kimlik
        FROM musteri.TelefonDegisikligiTalebi AS d
        WHERE d.Numara = (SELECT s.Kod FROM yardim.Sadelestir(@TelefonDegisikligiNumarasi) AS s);
        IF @TelKimlik IS NULL
            THROW 51102, N'bu numarayla numara değişikliği talebi bulunamadı; verilen bilgileri kontrol edip yeniden çalıştırın', 1;
    END;

    IF @DisIslem = 0
        BEGIN TRANSACTION;
    ELSE
        SAVE TRANSACTION YonetimOnizleme;

    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @YapanKullaniciKimlik,
         @YapanHesapKimlik = NULL, @YapanAdi = @YapanAdi, @KaynakUygulamaKodu = N'yonetim',
         @UygulamaSurumu = NULL, @MusteriyeBildirildi = 0;

    SELECT @HesapTelefon = h.TelefonE164, @HesapUlke = h.TelefonUlkeKodu, @HesapOlusma = h.OlusmaZamani
    FROM musteri.Hesap AS h WITH (UPDLOCK, HOLDLOCK)
    WHERE h.Kimlik = @HesapKimlik;

    IF @HesapTelefon IS NULL OR @HesapTelefon <> @EskiE164
        THROW 51102, N'eski telefon hiçbir hesabın güncel telefonu değil; yardim.MusteriGoster ile bakın', 1;
    IF @YeniE164 = @EskiE164
        THROW 51113, N'yeni telefon eskisiyle aynı; numaraları kontrol edip farklı bir yeni telefon verin', 1;
    IF EXISTS (SELECT 1 FROM musteri.Hesap AS h WITH (UPDLOCK, HOLDLOCK)
               WHERE h.TelefonE164 = @YeniE164 AND h.Kimlik <> @HesapKimlik)
        THROW 51121, N'yeni telefon başka bir hesabın telefonu; aynı kişiyse iki hesabı yonetim.HesaplariBirlestir ile birleştirin', 1;

    IF @TelKimlik IS NOT NULL
    BEGIN
        SELECT @TelNo = d.Numara, @TelHesap = d.HesapKimlik, @TelDurum = d.KararDurumuKodu, @TelYeni = d.YeniTelefonE164
        FROM musteri.TelefonDegisikligiTalebi AS d WITH (UPDLOCK, HOLDLOCK)
        WHERE d.Kimlik = @TelKimlik;

        IF @TelDurum <> N'bekliyor'
            THROW 51113, N'numara değişikliği talebi artık beklemiyor; karar verilmiş. Talebin sonucunu kontrol edin', 1;
        IF @TelHesap IS NOT NULL AND @TelHesap <> @HesapKimlik
            THROW 51104, N'numara değişikliği talebi başka bir hesaba ait; hesap ve talep bilgilerini kontrol edip eşleşen talebi verin', 1;
        IF @TelYeni IS NOT NULL AND @TelYeni <> @YeniE164
            THROW 51104, N'numara değişikliği talebindeki yeni telefon verilen yeni telefonla aynı değil; talepteki numarayı kontrol edip eşleşen telefonu verin', 1;
    END;

    /* Ülke: telefon kodu en uzun eşleşen ülke (aynı kodlu ülkelerde hesabın eski ülkesi önce). */
    SELECT TOP (1) @YeniUlke = u.Kod, @UlkeKoduBoy = LEN(u.TelefonKodu)
    FROM cografya.Ulke AS u
    WHERE @YeniE164 LIKE u.TelefonKodu + N'%'
    ORDER BY LEN(u.TelefonKodu) DESC,
             CASE WHEN u.Kod = @HesapUlke THEN 0 ELSE 1 END,
             u.Sira;

    IF @YeniUlke IS NOT NULL
        SET @YeniUlusal = SUBSTRING(@YeniE164, @UlkeKoduBoy + 1, 15);

    UPDATE musteri.Hesap
    SET TelefonE164 = @YeniE164,
        TelefonUlusal = LEFT(@YeniUlusal, 15),
        TelefonUlkeKodu = @YeniUlke
    WHERE Kimlik = @HesapKimlik;

    /* Telefon geçmişi: açık satır biter; eski kayıtlarda satır yoksa eski telefon kapalı satır olarak eklenir. */
    IF EXISTS (SELECT 1 FROM musteri.HesapTelefonGecmisi AS g WHERE g.HesapKimlik = @HesapKimlik AND g.BitisZamani IS NULL)
        UPDATE musteri.HesapTelefonGecmisi
        SET BitisZamani = CASE WHEN BaslangicZamani > @Simdi THEN BaslangicZamani ELSE @Simdi END
        WHERE HesapKimlik = @HesapKimlik AND BitisZamani IS NULL;
    ELSE
        INSERT musteri.HesapTelefonGecmisi (TelefonE164, HesapKimlik, TelefonDegisikligiTalebiKimlik, BaslangicZamani, BitisZamani)
        VALUES (@EskiE164, @HesapKimlik, NULL, CASE WHEN @HesapOlusma > @Simdi THEN @Simdi ELSE @HesapOlusma END, @Simdi);

    INSERT musteri.HesapTelefonGecmisi (TelefonE164, HesapKimlik, TelefonDegisikligiTalebiKimlik, BaslangicZamani, BitisZamani)
    OUTPUT inserted.KayitNo INTO @GecmisSatiri (KayitNo)
    VALUES (@YeniE164, @HesapKimlik, @TelKimlik, @Simdi, NULL);

    IF @TelKimlik IS NOT NULL
        UPDATE musteri.TelefonDegisikligiTalebi
        SET KararDurumuKodu = N'onaylandi',
            KararZamani = @Simdi,
            KararVerenKullaniciKimlik = @YapanKullaniciKimlik,
            KararVerenAdi = @YapanAdi,
            KararNotu = @Gerekce,
            UygulanmaZamani = @Simdi,
            HesapKimlik = COALESCE(HesapKimlik, @HesapKimlik)
        WHERE Kimlik = @TelKimlik;

    UPDATE erisim.Oturum
    SET KapanmaZamani = CASE WHEN BaslangicZamani > @Simdi THEN BaslangicZamani ELSE @Simdi END,
        KapanmaNedeniKodu = N'telefonDegisti'
    WHERE HesapKimlik = @HesapKimlik AND KapanmaZamani IS NULL;
    SET @KapatilanOturum = @@ROWCOUNT;

    /* İşlem kaydına telefon yazılmaz; hesap KayitNo ve TEL numarası yeter. */
    SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                           @HesapKayitNo AS hesapKayitNo, @TelNo AS telefonDegisikligiNumarasi,
                           (SELECT TOP (1) g.KayitNo FROM @GecmisSatiri AS g) AS telefonGecmisiKayitNo,
                           @KapatilanOturum AS kapatilanOturumSayisi,
                           JSON_QUERY((SELECT @HesapUlke AS telefonUlkeKodu, @TelDurum AS telefonDegisikligiKararDurumu
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS onceki,
                           JSON_QUERY((SELECT @YeniUlke AS telefonUlkeKodu,
                                              CASE WHEN @TelKimlik IS NOT NULL THEN N'onaylandi' END AS telefonDegisikligiKararDurumu
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS sonraki
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    VALUES
        (N'telefonDegistirildi', N'hesap', @HesapKimlik, @TelNo, @Ayrinti, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);

    SELECT N'Sonuç' AS Bolum,
           @Uygula AS Uygulandi,
           CASE WHEN @Uygula = 1
                THEN N'müşterinin telefonu değiştirildi; açık oturumları kapatıldı, müşteri yeni telefonuyla giriş yapacak'
                ELSE N'önizleme; hiçbir şey kaydedilmedi. Sonucu kontrol edin; değişiklikleri kaydetmek için @Uygula = 1 ile yeniden çalıştırın' END AS Mesaj,
           @HesapKayitNo AS HesapKayitNo,
           @EskiE164 AS EskiTelefon,
           @YeniE164 AS YeniTelefon,
           @HesapUlke AS OncekiTelefonUlkeKodu,
           @YeniUlke AS TelefonUlkeKodu,
           CASE WHEN @TelNo IS NOT NULL
                THEN LEFT(@TelNo, 3) + N'-' + SUBSTRING(@TelNo, 4, 2) + N'-' + RIGHT(@TelNo, 5) END AS TelNumarasi,
           CASE WHEN @TelKimlik IS NOT NULL THEN N'onaylandi' END AS TelKararDurumuKodu,
           @KapatilanOturum AS KapatilanOturumSayisi;

    IF @Uygula = 1
    BEGIN
        IF @DisIslem = 0
            COMMIT TRANSACTION;
    END
    ELSE
    BEGIN
        IF @DisIslem = 0
            ROLLBACK TRANSACTION;
        ELSE
            ROLLBACK TRANSACTION YonetimOnizleme;
    END;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MusteriTelefonunuDegistir',
     @Metin = N'Ne yapar: müşteri hesabının giriş telefonunu değiştirir: musteri.Hesap telefon kolonları (ülke kodu cografya.Ulke telefon kodundan), telefon geçmişinde açık satır biter ve yeni satır açılır (eski kayıtta geçmiş satırı yoksa eski telefon kapalı satır olarak eklenir), numara değişikliği talebi verildiyse onaylandi olur (karar veren, karar notu = gerekçe, uygulanma zamanı; hesapsızsa hesaba bağlanır), hesabın açık oturumları telefonDegisti nedeniyle kapanır. İşlem kaydı telefonDegistirildi (telefonlar işlem kaydına yazılmaz). Kapılar: telefonlardan biri geçersizse 51120; eski telefon bir hesabın güncel telefonu değilse ya da TEL numarası yoksa 51102; yeni telefon eskisiyle aynıysa ya da TEL talebi beklemiyorsa 51113; yeni telefon başka bir hesaptaysa 51121 (aynı kişiyse yonetim.HesaplariBirlestir); TEL talebi başka hesabınsa ya da yeni telefonu farklıysa 51104. Ne yapmaz: hesaptaki kişilerin telefonunu değiştirmez; müşteriye SMS ya da bildirim göndermez; reddetme kararı yazmaz (backoffice). Örnek: EXEC yonetim.MusteriTelefonunuDegistir @EskiTelefon = N''0532 111 22 33'', @YeniTelefon = N''0533 444 55 66'', @TelefonDegisikligiNumarasi = N''TEL-26-00008'', @Gerekce = N''Müşteri kimliğini doğruladı, hattı değişti'', @YapanGirisAdi = N''ali.yilmaz'', @Uygula = 0;';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MusteriTelefonunuDegistir', @Alt = N'@EskiTelefon', @AltTuru = N'PARAMETER',
     @Metin = N'Hesabın bugünkü giriş telefonu, her yazımla (0532 111 22 33, +905321112233).';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MusteriTelefonunuDegistir', @Alt = N'@YeniTelefon', @AltTuru = N'PARAMETER',
     @Metin = N'Yeni giriş telefonu, her yazımla; başka hesapta olmamalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MusteriTelefonunuDegistir', @Alt = N'@TelefonDegisikligiNumarasi', @AltTuru = N'PARAMETER',
     @Metin = N'İsteğe bağlı: bu değişikliği isteyen numara değişikliği talebinin numarası (TEL-26-00008); bekliyor durumunda, bu hesaba ait ya da hesapsız olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MusteriTelefonunuDegistir', @Alt = N'@Gerekce', @AltTuru = N'PARAMETER',
     @Metin = N'Değişikliğin nedeni; en az 10 karakter. İşlem kaydına ve TEL talebinin karar notuna yazılır; telefon numarası yazmayın.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MusteriTelefonunuDegistir', @Alt = N'@YapanGirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemi yapan personelin giriş adı; aktif personel olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'MusteriTelefonunuDegistir', @Alt = N'@Uygula', @AltTuru = N'PARAMETER',
     @Metin = N'0 (varsayılan): önizleme, hiçbir şey kaydedilmez. 1: uygulanır.';
GO

/* --------------------------------------------------------------------------
   8. yonetim.DekontuGecersizKil
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yonetim.DekontuGecersizKil
    @TalepNumarasi  nvarchar(400),
    @DekontKayitNo  bigint,
    @GecersizNedeni nvarchar(500),
    @Gerekce        nvarchar(500),
    @YapanGirisAdi  nvarchar(40),
    @Uygula         bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @DisIslem bit = CASE WHEN @@TRANCOUNT > 0 THEN 1 ELSE 0 END;
    DECLARE @YapanKullaniciKimlik uniqueidentifier;
    DECLARE @YapanAdi nvarchar(150);
    DECLARE @YapanRolAdi nvarchar(100);
    DECLARE @Ayrinti nvarchar(max);

    DECLARE @Neden nvarchar(500) = NULLIF(LTRIM(RTRIM(@GecersizNedeni)), N'');
    DECLARE @TalepKimlik uniqueidentifier;
    DECLARE @TalepNo nvarchar(10);
    DECLARE @DekontKimlik uniqueidentifier;
    DECLARE @DekontTalep uniqueidentifier;
    DECLARE @DosyaKimlik uniqueidentifier;
    DECLARE @DosyaKayitNo bigint;
    DECLARE @GecersizZamani datetime2(3);
    DECLARE @DosyaSatiri int = 0;

    SET @Uygula = ISNULL(@Uygula, 0);
    SET @Gerekce = LTRIM(RTRIM(@Gerekce));
    IF LEN(ISNULL(@Gerekce, N'')) < 10
        THROW 51100, N'düzeltmenin gerekçesini en az 10 karakterle yazın', 1;

    SELECT @YapanKullaniciKimlik = k.Kimlik, @YapanAdi = p.AdSoyad, @YapanRolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@YapanGirisAdi) AS s)
      AND k.TurKodu = N'personel' AND k.Aktif = 1 AND p.AyrilmaZamani IS NULL;
    IF @YapanKullaniciKimlik IS NULL
        THROW 51101, N'işlemi yapan giriş adı aktif bir personele ait değil; işlemi yapan personelin aktif giriş adını verin', 1;

    IF @Neden IS NULL
        THROW 51100, N'dekontun neden geçersiz olduğunu @GecersizNedeni ile yazın', 1;

    SELECT @TalepKimlik = t.Kimlik, @TalepNo = t.Numara
    FROM talep.Talep AS t
    WHERE t.Numara = (SELECT s.Kod FROM yardim.Sadelestir(@TalepNumarasi) AS s);
    IF @TalepKimlik IS NULL
        THROW 51102, N'bu numarayla talep bulunamadı; verilen bilgileri kontrol edip yeniden çalıştırın', 1;

    SELECT @DekontKimlik = d.Kimlik, @DekontTalep = d.TalepKimlik
    FROM talep.Dekont AS d
    WHERE d.KayitNo = @DekontKayitNo;
    IF @DekontKimlik IS NULL
        THROW 51102, N'bu KayitNo ile dekont bulunamadı; yardim.TalepGoster çıktısındaki 12. bölüme bakın', 1;
    IF @DekontTalep <> @TalepKimlik
        THROW 51104, N'bu dekont bu talebe ait değil; talep ve dekont bilgilerini kontrol edip eşleşen dekontu verin', 1;

    IF @DisIslem = 0
        BEGIN TRANSACTION;
    ELSE
        SAVE TRANSACTION YonetimOnizleme;

    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @YapanKullaniciKimlik,
         @YapanHesapKimlik = NULL, @YapanAdi = @YapanAdi, @KaynakUygulamaKodu = N'yonetim',
         @UygulamaSurumu = NULL, @MusteriyeBildirildi = 0;

    SELECT @DosyaKimlik = d.DosyaKimlik, @GecersizZamani = d.GecersizZamani
    FROM talep.Dekont AS d WITH (UPDLOCK, HOLDLOCK)
    WHERE d.Kimlik = @DekontKimlik;

    IF @GecersizZamani IS NOT NULL
        THROW 51113, N'dekont zaten geçersiz kılınmış; mevcut durumu kontrol edin, yeniden geçersiz kılma işlemi yapmayın', 1;
    IF EXISTS (SELECT 1 FROM talep.OdemeOnayi AS o WITH (UPDLOCK, HOLDLOCK)
               WHERE o.TalepKimlik = @TalepKimlik AND o.GeriAlinmaZamani IS NULL)
        THROW 51111, N'talebin ödemesi onaylı; önce yonetim.OdemeOnayiniGeriAl ile onayı geri alın', 1;

    UPDATE talep.Dekont
    SET GecersizZamani = @Simdi,
        GecersizNedeni = @Neden,
        GecersizKilanKullaniciKimlik = @YapanKullaniciKimlik,
        GecersizKilanAdi = @YapanAdi
    WHERE Kimlik = @DekontKimlik;

    UPDATE dosya.Dosya
    SET GecersizZamani = @Simdi,
        GecersizNedeni = @Neden
    WHERE Kimlik = @DosyaKimlik AND GecersizZamani IS NULL;
    SET @DosyaSatiri = @@ROWCOUNT;

    SELECT @DosyaKayitNo = ds.KayitNo FROM dosya.Dosya AS ds WHERE ds.Kimlik = @DosyaKimlik;

    SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                           @DekontKayitNo AS dekontKayitNo, @DosyaKayitNo AS dosyaKayitNo,
                           CAST(CASE WHEN @DosyaSatiri > 0 THEN 1 ELSE 0 END AS bit) AS dosyaGecersizKilindi,
                           JSON_QUERY((SELECT CAST(0 AS bit) AS gecersiz FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)) AS onceki,
                           JSON_QUERY((SELECT CAST(1 AS bit) AS gecersiz, @Simdi AS gecersizZamani FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)) AS sonraki
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    VALUES
        (N'dekontGecersizKilindi', N'dekont', @DekontKimlik, @TalepNo, @Ayrinti, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);

    SELECT N'Sonuç' AS Bolum,
           @Uygula AS Uygulandi,
           CASE WHEN @Uygula = 1
                THEN N'dekont geçersiz kılındı'
                ELSE N'önizleme; hiçbir şey kaydedilmedi. Sonucu kontrol edin; değişiklikleri kaydetmek için @Uygula = 1 ile yeniden çalıştırın' END AS Mesaj,
           LEFT(@TalepNo, 3) + N'-' + SUBSTRING(@TalepNo, 4, 2) + N'-' + RIGHT(@TalepNo, 5) AS TalepNumarasi,
           @DekontKayitNo AS DekontKayitNo,
           @DosyaKayitNo AS DosyaKayitNo,
           CONVERT(datetime2(0), @Simdi AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS GecersizZamaniTurkiye,
           @Neden AS GecersizNedeni,
           (SELECT COUNT(*) FROM talep.Dekont AS d WHERE d.TalepKimlik = @TalepKimlik AND d.GecersizZamani IS NULL) AS KalanGecerliDekontSayisi;

    IF @Uygula = 1
    BEGIN
        IF @DisIslem = 0
            COMMIT TRANSACTION;
    END
    ELSE
    BEGIN
        IF @DisIslem = 0
            ROLLBACK TRANSACTION;
        ELSE
            ROLLBACK TRANSACTION YonetimOnizleme;
    END;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'DekontuGecersizKil',
     @Metin = N'Ne yapar: parça talebine yüklenmiş bir dekontu geçersiz kılar: talep.Dekont (GecersizZamani, GecersizNedeni, geçersiz kılan personel) ve dekontun dosyası (dosya.Dosya GecersizZamani, GecersizNedeni). Dekont ve dosya silinmez; dekont sınıfındaki dosya saklama kuralını bekler. İşlem kaydı dekontGecersizKilindi (neden metni işlem kaydına yazılmaz). Kapılar: gerekçe ya da geçersizlik nedeni boşsa 51100; talep ya da dekont KayitNo yoksa 51102; dekont bu talebin değilse 51104; dekont zaten geçersizse 51113; talepte etkin ödeme onayı varsa 51111 (önce yonetim.OdemeOnayiniGeriAl). Ne yapmaz: talebin durumunu değiştirmez, müşteriye bildirim göndermez. Örnek: EXEC yonetim.DekontuGecersizKil @TalepNumarasi = N''YPR-26-00058'', @DekontKayitNo = 314, @GecersizNedeni = N''Tutar okunmuyor'', @Gerekce = N''Muhasebe dekontu kabul etmedi'', @YapanGirisAdi = N''ali.yilmaz'', @Uygula = 0;';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'DekontuGecersizKil', @Alt = N'@TalepNumarasi', @AltTuru = N'PARAMETER',
     @Metin = N'Dekontun ait olduğu talebin numarası, her yazımla.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'DekontuGecersizKil', @Alt = N'@DekontKayitNo', @AltTuru = N'PARAMETER',
     @Metin = N'talep.Dekont.KayitNo (yardim.TalepGoster 12. küme, DekontKayitNo); talep numarasıyla aynı kayda ait olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'DekontuGecersizKil', @Alt = N'@GecersizNedeni', @AltTuru = N'PARAMETER',
     @Metin = N'Dekontun neden geçersiz olduğu (en çok 500 karakter); dekont ve dosya satırına yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'DekontuGecersizKil', @Alt = N'@Gerekce', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemin nedeni; en az 10 karakter. İşlem kaydına yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'DekontuGecersizKil', @Alt = N'@YapanGirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemi yapan personelin giriş adı; aktif personel olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'DekontuGecersizKil', @Alt = N'@Uygula', @AltTuru = N'PARAMETER',
     @Metin = N'0 (varsayılan): önizleme, hiçbir şey kaydedilmez. 1: uygulanır.';
GO

/* --------------------------------------------------------------------------
   9. yonetim.OdemeOnayiniGeriAl
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yonetim.OdemeOnayiniGeriAl
    @TalepNumarasi nvarchar(400),
    @Gerekce       nvarchar(500),
    @YapanGirisAdi nvarchar(40),
    @Uygula        bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @DisIslem bit = CASE WHEN @@TRANCOUNT > 0 THEN 1 ELSE 0 END;
    DECLARE @YapanKullaniciKimlik uniqueidentifier;
    DECLARE @YapanAdi nvarchar(150);
    DECLARE @YapanRolAdi nvarchar(100);
    DECLARE @Ayrinti nvarchar(max);

    DECLARE @TalepKimlik uniqueidentifier;
    DECLARE @TalepNo nvarchar(10);
    DECLARE @Kapali bit;
    DECLARE @DurumKodu nvarchar(40);
    DECLARE @OnayKimlik uniqueidentifier;
    DECLARE @OnayKayitNo bigint;
    DECLARE @OnaylananTutar decimal(18,2);
    DECLARE @ParaBirimi nvarchar(3);
    DECLARE @OnayZamani datetime2(3);
    DECLARE @OnaylayanAdi nvarchar(150);

    SET @Uygula = ISNULL(@Uygula, 0);
    SET @Gerekce = LTRIM(RTRIM(@Gerekce));
    IF LEN(ISNULL(@Gerekce, N'')) < 10
        THROW 51100, N'düzeltmenin gerekçesini en az 10 karakterle yazın', 1;

    SELECT @YapanKullaniciKimlik = k.Kimlik, @YapanAdi = p.AdSoyad, @YapanRolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@YapanGirisAdi) AS s)
      AND k.TurKodu = N'personel' AND k.Aktif = 1 AND p.AyrilmaZamani IS NULL;
    IF @YapanKullaniciKimlik IS NULL
        THROW 51101, N'işlemi yapan giriş adı aktif bir personele ait değil; işlemi yapan personelin aktif giriş adını verin', 1;

    SELECT @TalepKimlik = t.Kimlik
    FROM talep.Talep AS t
    WHERE t.Numara = (SELECT s.Kod FROM yardim.Sadelestir(@TalepNumarasi) AS s);
    IF @TalepKimlik IS NULL
        THROW 51102, N'bu numarayla talep bulunamadı; verilen bilgileri kontrol edip yeniden çalıştırın', 1;

    IF @DisIslem = 0
        BEGIN TRANSACTION;
    ELSE
        SAVE TRANSACTION YonetimOnizleme;

    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @YapanKullaniciKimlik,
         @YapanHesapKimlik = NULL, @YapanAdi = @YapanAdi, @KaynakUygulamaKodu = N'yonetim',
         @UygulamaSurumu = NULL, @MusteriyeBildirildi = 0;

    SELECT @TalepNo = t.Numara, @Kapali = t.Kapali, @DurumKodu = t.DurumKodu
    FROM talep.Talep AS t WITH (UPDLOCK, HOLDLOCK)
    WHERE t.Kimlik = @TalepKimlik;

    SELECT @OnayKimlik = o.Kimlik, @OnayKayitNo = o.KayitNo, @OnaylananTutar = o.OnaylananTutar,
           @ParaBirimi = o.ParaBirimiKodu, @OnayZamani = o.OlusmaZamani, @OnaylayanAdi = o.YapanAdi
    FROM talep.OdemeOnayi AS o WITH (UPDLOCK, HOLDLOCK)
    WHERE o.TalepKimlik = @TalepKimlik AND o.GeriAlinmaZamani IS NULL;

    IF @OnayKimlik IS NULL
        THROW 51102, N'talepte etkin ödeme onayı yok; ödeme kayıtlarını kontrol edin', 1;
    IF @Kapali = 1
        THROW 51113, N'talep kapalı; kapalı talebin ödeme onayı geri alınamaz. Önce yonetim.TalebiYenidenAc ile talebi yeniden açın', 1;

    UPDATE talep.OdemeOnayi
    SET GeriAlinmaZamani = @Simdi,
        GeriAlanKullaniciKimlik = @YapanKullaniciKimlik,
        GeriAlanAdi = @YapanAdi
    WHERE Kimlik = @OnayKimlik;

    SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                           @OnayKayitNo AS odemeOnayiKayitNo, @OnaylananTutar AS onaylananTutar, @ParaBirimi AS paraBirimiKodu,
                           JSON_QUERY((SELECT CAST(1 AS bit) AS etkin, @OnayZamani AS onayZamani FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS onceki,
                           JSON_QUERY((SELECT CAST(0 AS bit) AS etkin, @Simdi AS geriAlinmaZamani FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS sonraki
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    VALUES
        (N'odemeOnayiGeriAlindi', N'talep', @TalepKimlik, @TalepNo, @Ayrinti, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);

    SELECT N'Sonuç' AS Bolum,
           @Uygula AS Uygulandi,
           CASE WHEN @Uygula = 1
                THEN N'ödeme onayı geri alındı'
                ELSE N'önizleme; hiçbir şey kaydedilmedi. Sonucu kontrol edin; değişiklikleri kaydetmek için @Uygula = 1 ile yeniden çalıştırın' END AS Mesaj,
           LEFT(@TalepNo, 3) + N'-' + SUBSTRING(@TalepNo, 4, 2) + N'-' + RIGHT(@TalepNo, 5) AS TalepNumarasi,
           @OnayKayitNo AS OnayKayitNo,
           @OnaylananTutar AS OnaylananTutar,
           @ParaBirimi AS ParaBirimiKodu,
           @OnaylayanAdi AS OnaylayanAdi,
           CONVERT(datetime2(0), @OnayZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OnayZamaniTurkiye,
           CONVERT(datetime2(0), @Simdi AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS GeriAlinmaZamaniTurkiye,
           @DurumKodu AS TalepDurumKodu,
           (SELECT d.Ad FROM kod.TalepDurumu AS d WHERE d.Kod = @DurumKodu) AS TalepDurumAdi;

    IF @Uygula = 1
    BEGIN
        IF @DisIslem = 0
            COMMIT TRANSACTION;
    END
    ELSE
    BEGIN
        IF @DisIslem = 0
            ROLLBACK TRANSACTION;
        ELSE
            ROLLBACK TRANSACTION YonetimOnizleme;
    END;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'OdemeOnayiniGeriAl',
     @Metin = N'Ne yapar: açık parça talebinin etkin ödeme onayını geri alır (talep.OdemeOnayi GeriAlinmaZamani, geri alan personel). Onay satırı silinmez; talebe yeni onay verilebilir. İşlem kaydı odemeOnayiGeriAlindi (tutar ve para birimi ayrıntıda). Kapılar: talep yoksa ya da etkin ödeme onayı yoksa 51102; talep kapalıysa 51113. Ne yapmaz: talebin durumunu değiştirmez, dekontu geçersiz kılmaz (ardından yonetim.DekontuGecersizKil), LOGO belgesine ya da servis hesap hareketine dokunmaz, müşteriye bildirim göndermez. Örnek: EXEC yonetim.OdemeOnayiniGeriAl @TalepNumarasi = N''YPR-26-00058'', @Gerekce = N''Ödeme banka hesabına geçmemiş'', @YapanGirisAdi = N''ali.yilmaz'', @Uygula = 0;';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'OdemeOnayiniGeriAl', @Alt = N'@TalepNumarasi', @AltTuru = N'PARAMETER',
     @Metin = N'Parça talebinin numarası, her yazımla.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'OdemeOnayiniGeriAl', @Alt = N'@Gerekce', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemin nedeni; en az 10 karakter. İşlem kaydına yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'OdemeOnayiniGeriAl', @Alt = N'@YapanGirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemi yapan personelin giriş adı; aktif personel olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'OdemeOnayiniGeriAl', @Alt = N'@Uygula', @AltTuru = N'PARAMETER',
     @Metin = N'0 (varsayılan): önizleme, hiçbir şey kaydedilmez. 1: uygulanır.';
GO

/* --------------------------------------------------------------------------
   10. yonetim.PersoneliPasiflestir
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yonetim.PersoneliPasiflestir
    @GirisAdi      nvarchar(400),
    @Gerekce       nvarchar(500),
    @YapanGirisAdi nvarchar(40),
    @Uygula        bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @DisIslem bit = CASE WHEN @@TRANCOUNT > 0 THEN 1 ELSE 0 END;
    DECLARE @YapanKullaniciKimlik uniqueidentifier;
    DECLARE @YapanAdi nvarchar(150);
    DECLARE @YapanRolAdi nvarchar(100);
    DECLARE @Ayrinti nvarchar(max);

    DECLARE @Giris nvarchar(40);
    DECLARE @KullaniciKimlik uniqueidentifier;
    DECLARE @KullaniciKayitNo bigint;
    DECLARE @PersonelKimlik uniqueidentifier;
    DECLARE @PersonelKayitNo bigint;
    DECLARE @AdSoyad nvarchar(150);
    DECLARE @RolAdi nvarchar(100);
    DECLARE @Aktif bit;
    DECLARE @OncekiAyrilma datetime2(3);
    DECLARE @KapatilanOturum int = 0;
    DECLARE @IptalEdilenJeton int = 0;

    SET @Uygula = ISNULL(@Uygula, 0);
    SET @Gerekce = LTRIM(RTRIM(@Gerekce));
    IF LEN(ISNULL(@Gerekce, N'')) < 10
        THROW 51100, N'düzeltmenin gerekçesini en az 10 karakterle yazın', 1;

    SELECT @YapanKullaniciKimlik = k.Kimlik, @YapanAdi = p.AdSoyad, @YapanRolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@YapanGirisAdi) AS s)
      AND k.TurKodu = N'personel' AND k.Aktif = 1 AND p.AyrilmaZamani IS NULL;
    IF @YapanKullaniciKimlik IS NULL
        THROW 51101, N'işlemi yapan giriş adı aktif bir personele ait değil; işlemi yapan personelin aktif giriş adını verin', 1;

    SELECT @Giris = LEFT(s.GirisAdi, 40) FROM yardim.Sadelestir(@GirisAdi) AS s;

    SELECT @KullaniciKimlik = k.Kimlik, @KullaniciKayitNo = k.KayitNo,
           @PersonelKimlik = p.Kimlik, @PersonelKayitNo = p.KayitNo, @AdSoyad = p.AdSoyad, @RolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = @Giris AND k.TurKodu = N'personel';
    IF @KullaniciKimlik IS NULL
        THROW 51102, N'bu giriş adıyla personel bulunamadı; verilen bilgileri kontrol edip yeniden çalıştırın', 1;

    IF @DisIslem = 0
        BEGIN TRANSACTION;
    ELSE
        SAVE TRANSACTION YonetimOnizleme;

    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @YapanKullaniciKimlik,
         @YapanHesapKimlik = NULL, @YapanAdi = @YapanAdi, @KaynakUygulamaKodu = N'yonetim',
         @UygulamaSurumu = NULL, @MusteriyeBildirildi = 0;

    SELECT @Aktif = k.Aktif
    FROM erisim.Kullanici AS k WITH (UPDLOCK, HOLDLOCK)
    WHERE k.Kimlik = @KullaniciKimlik;

    SELECT @OncekiAyrilma = p.AyrilmaZamani
    FROM personel.Personel AS p WITH (UPDLOCK, HOLDLOCK)
    WHERE p.Kimlik = @PersonelKimlik;

    IF @Aktif = 0
        THROW 51113, N'bu personelin girişi zaten kapalı; giriş durumunu kontrol edin, yeniden kapatma işlemi yapmayın', 1;
    IF @KullaniciKimlik = @YapanKullaniciKimlik
        THROW 51112, N'kişi kendi girişini kapatamaz; başka bir personelin giriş adıyla çalıştırın', 1;

    UPDATE erisim.Kullanici
    SET Aktif = 0
    WHERE Kimlik = @KullaniciKimlik;

    IF @OncekiAyrilma IS NULL
        UPDATE personel.Personel
        SET AyrilmaZamani = @Simdi
        WHERE Kimlik = @PersonelKimlik;

    UPDATE erisim.Oturum
    SET KapanmaZamani = CASE WHEN BaslangicZamani > @Simdi THEN BaslangicZamani ELSE @Simdi END,
        KapanmaNedeniKodu = N'iptal'
    WHERE KullaniciKimlik = @KullaniciKimlik AND KapanmaZamani IS NULL;
    SET @KapatilanOturum = @@ROWCOUNT;

    UPDATE erisim.SifreSifirlamaJetonu
    SET IptalZamani = @Simdi
    WHERE KullaniciKimlik = @KullaniciKimlik AND KullanilmaZamani IS NULL AND IptalZamani IS NULL;
    SET @IptalEdilenJeton = @@ROWCOUNT;

    SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                           @Giris AS girisAdi, @PersonelKayitNo AS personelKayitNo, @KullaniciKayitNo AS kullaniciKayitNo,
                           @KapatilanOturum AS kapatilanOturumSayisi, @IptalEdilenJeton AS iptalEdilenJetonSayisi,
                           JSON_QUERY((SELECT CAST(1 AS bit) AS aktif, @OncekiAyrilma AS ayrilmaZamani
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS onceki,
                           JSON_QUERY((SELECT CAST(0 AS bit) AS aktif, COALESCE(@OncekiAyrilma, @Simdi) AS ayrilmaZamani
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS sonraki
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    VALUES
        (N'personelPasiflestirildi', N'personel', @PersonelKimlik, NULL, @Ayrinti, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);

    SELECT N'Sonuç' AS Bolum,
           @Uygula AS Uygulandi,
           CASE WHEN @Uygula = 1
                THEN N'personelin girişi kapatıldı, oturumları sonlandırıldı'
                ELSE N'önizleme; hiçbir şey kaydedilmedi. Sonucu kontrol edin; değişiklikleri kaydetmek için @Uygula = 1 ile yeniden çalıştırın' END AS Mesaj,
           @Giris AS GirisAdi,
           @AdSoyad AS AdSoyad,
           @RolAdi AS RolAdi,
           CONVERT(datetime2(0), COALESCE(@OncekiAyrilma, @Simdi) AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS AyrilmaZamaniTurkiye,
           @KapatilanOturum AS KapatilanOturumSayisi,
           @IptalEdilenJeton AS IptalEdilenJetonSayisi,
           @PersonelKayitNo AS PersonelKayitNo;

    IF @Uygula = 1
    BEGIN
        IF @DisIslem = 0
            COMMIT TRANSACTION;
    END
    ELSE
    BEGIN
        IF @DisIslem = 0
            ROLLBACK TRANSACTION;
        ELSE
            ROLLBACK TRANSACTION YonetimOnizleme;
    END;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'PersoneliPasiflestir',
     @Metin = N'Ne yapar: işten ayrılan personelin girişini kapatır: erisim.Kullanici Aktif = 0, personel.Personel AyrilmaZamani (boşsa şimdi), açık oturumlar iptal nedeniyle kapanır, kullanılmamış şifre sıfırlama kodları iptal edilir. Personel satırı silinmez; rolü ve adı geçmişte (sistem sürümlü tablo) kalır. İşlem kaydı personelPasiflestirildi. Kapılar: giriş adı bir personele ait değilse 51102; giriş zaten kapalıysa 51113; kişi kendi girişini kapatmaya çalışırsa 51112. Ne yapmaz: personelin açtığı kayıtlara ve atandığı işlere dokunmaz; rolünü değiştirmez; servis girişlerini kapatmaz. Kontrol: SELECT GirisAdi, Aktif FROM erisim.Kullanici WHERE GirisAdi = N''ali.yilmaz''; Örnek: EXEC yonetim.PersoneliPasiflestir @GirisAdi = N''ali.yilmaz'', @Gerekce = N''İşten ayrıldı, son gün 16.09'', @YapanGirisAdi = N''ayse.demir'', @Uygula = 0;';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'PersoneliPasiflestir', @Alt = N'@GirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'Girişi kapatılacak personelin giriş adı (büyük/küçük harf ve Türkçe harf fark etmez).';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'PersoneliPasiflestir', @Alt = N'@Gerekce', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemin nedeni; en az 10 karakter. İşlem kaydına yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'PersoneliPasiflestir', @Alt = N'@YapanGirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemi yapan personelin giriş adı; aktif personel olmalı ve kapatılan girişle aynı olmamalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'PersoneliPasiflestir', @Alt = N'@Uygula', @AltTuru = N'PARAMETER',
     @Metin = N'0 (varsayılan): önizleme, hiçbir şey kaydedilmez. 1: uygulanır.';
GO

/* --------------------------------------------------------------------------
   11. yonetim.GirisSifresiniSifirla
   Tek kullanımlık kod: CRYPT_GEN_RANDOM, alfabe 23456789ABCDEFGHJKMNPQRSTUVWXYZ
   (31 harf; 248'den küçük baytlar kullanılır, sapma olmaz), 16 karakter.
   Veritabanına yalnız SHA-256 özeti yazılır (tasarim.md 1.14.3, 1.14.4);
   kod yalnız @Uygula = 1 iken sonuç kümesinde bir kez döner.
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yonetim.GirisSifresiniSifirla
    @GirisAdi      nvarchar(400),
    @Gerekce       nvarchar(500),
    @YapanGirisAdi nvarchar(40),
    @Uygula        bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @DisIslem bit = CASE WHEN @@TRANCOUNT > 0 THEN 1 ELSE 0 END;
    DECLARE @YapanKullaniciKimlik uniqueidentifier;
    DECLARE @YapanAdi nvarchar(150);
    DECLARE @YapanRolAdi nvarchar(100);
    DECLARE @Ayrinti nvarchar(max);

    DECLARE @Giris nvarchar(40);
    DECLARE @KullaniciKimlik uniqueidentifier;
    DECLARE @KullaniciKayitNo bigint;
    DECLARE @KullaniciTuru nvarchar(40);
    DECLARE @Aktif bit;
    DECLARE @IlgiliKayitTuru nvarchar(40);
    DECLARE @IlgiliKimlik uniqueidentifier;
    DECLARE @SahipAdi nvarchar(200);
    DECLARE @OncekiSifreVardi bit;
    DECLARE @OncekiBelirlemeGerekli bit;
    DECLARE @KapatilanOturum int = 0;
    DECLARE @IptalEdilenJeton int = 0;
    DECLARE @GecerlilikBitisi datetime2(3) = DATEADD(hour, 1, @Simdi);
    /* ASCII: özet API'nin girilen kodun ASCII baytlarından aldığı özetle aynı olmalı. */
    DECLARE @Alfabe varchar(31) = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    DECLARE @Kod varchar(16) = '';
    DECLARE @Bayt int;
    DECLARE @KodGosterim nvarchar(19);
    DECLARE @Jeton TABLE (KayitNo bigint NOT NULL);

    SET @Uygula = ISNULL(@Uygula, 0);
    SET @Gerekce = LTRIM(RTRIM(@Gerekce));
    IF LEN(ISNULL(@Gerekce, N'')) < 10
        THROW 51100, N'düzeltmenin gerekçesini en az 10 karakterle yazın', 1;

    SELECT @YapanKullaniciKimlik = k.Kimlik, @YapanAdi = p.AdSoyad, @YapanRolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@YapanGirisAdi) AS s)
      AND k.TurKodu = N'personel' AND k.Aktif = 1 AND p.AyrilmaZamani IS NULL;
    IF @YapanKullaniciKimlik IS NULL
        THROW 51101, N'işlemi yapan giriş adı aktif bir personele ait değil; işlemi yapan personelin aktif giriş adını verin', 1;

    SELECT @Giris = LEFT(s.GirisAdi, 40) FROM yardim.Sadelestir(@GirisAdi) AS s;

    SELECT @KullaniciKimlik = k.Kimlik, @KullaniciKayitNo = k.KayitNo, @KullaniciTuru = k.TurKodu,
           @IlgiliKayitTuru = CASE WHEN p.Kimlik IS NOT NULL THEN N'personel' WHEN gh.ServisKimlik IS NOT NULL THEN N'servis' END,
           @IlgiliKimlik = COALESCE(p.Kimlik, gh.ServisKimlik),
           @SahipAdi = COALESCE(p.AdSoyad, s.Ad)
    FROM erisim.Kullanici AS k
    LEFT JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN servis.GirisHesabi AS gh ON gh.KullaniciKimlik = k.Kimlik
    LEFT JOIN servis.Servis AS s ON s.Kimlik = gh.ServisKimlik
    WHERE k.GirisAdi = @Giris
      AND k.TurKodu IN (N'personel', N'servis')
      AND k.Aktif = 1;
    IF @KullaniciKimlik IS NULL
        THROW 51102, N'bu giriş adıyla aktif personel ya da servis girişi bulunamadı; verilen bilgileri kontrol edip yeniden çalıştırın', 1;

    IF @DisIslem = 0
        BEGIN TRANSACTION;
    ELSE
        SAVE TRANSACTION YonetimOnizleme;

    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @YapanKullaniciKimlik,
         @YapanHesapKimlik = NULL, @YapanAdi = @YapanAdi, @KaynakUygulamaKodu = N'yonetim',
         @UygulamaSurumu = NULL, @MusteriyeBildirildi = 0;

    SELECT @Aktif = k.Aktif,
           @OncekiSifreVardi = CASE WHEN k.SifreKaydi IS NULL THEN 0 ELSE 1 END,
           @OncekiBelirlemeGerekli = k.SifreBelirlemeGerekli
    FROM erisim.Kullanici AS k WITH (UPDLOCK, HOLDLOCK)
    WHERE k.Kimlik = @KullaniciKimlik;

    IF @Aktif <> 1
        THROW 51102, N'bu giriş adıyla aktif personel ya da servis girişi bulunamadı; verilen bilgileri kontrol edip yeniden çalıştırın', 1;

    WHILE LEN(@Kod) < 16
    BEGIN
        SET @Bayt = CAST(CRYPT_GEN_RANDOM(1) AS int);
        IF @Bayt < 248
            SET @Kod = @Kod + SUBSTRING(@Alfabe, @Bayt % 31 + 1, 1);
    END;

    SET @KodGosterim = CAST(SUBSTRING(@Kod, 1, 4) + '-' + SUBSTRING(@Kod, 5, 4) + '-'
                          + SUBSTRING(@Kod, 9, 4) + '-' + SUBSTRING(@Kod, 13, 4) AS nvarchar(19));

    UPDATE erisim.Kullanici
    SET SifreKaydi = NULL,
        SifreBelirlemeGerekli = 1,
        BasarisizGirisSayisi = 0,
        KilitBitisZamani = NULL
    WHERE Kimlik = @KullaniciKimlik;

    UPDATE erisim.Oturum
    SET KapanmaZamani = CASE WHEN BaslangicZamani > @Simdi THEN BaslangicZamani ELSE @Simdi END,
        KapanmaNedeniKodu = N'sifreDegisti'
    WHERE KullaniciKimlik = @KullaniciKimlik AND KapanmaZamani IS NULL;
    SET @KapatilanOturum = @@ROWCOUNT;

    UPDATE erisim.SifreSifirlamaJetonu
    SET IptalZamani = @Simdi
    WHERE KullaniciKimlik = @KullaniciKimlik AND KullanilmaZamani IS NULL AND IptalZamani IS NULL;
    SET @IptalEdilenJeton = @@ROWCOUNT;

    INSERT erisim.SifreSifirlamaJetonu (JetonOzeti, IsteyenIpAdresi, KullaniciKimlik, SonGecerlilikZamani, OlusmaZamani)
    OUTPUT inserted.KayitNo INTO @Jeton (KayitNo)
    VALUES (HASHBYTES('SHA2_256', @Kod), NULL, @KullaniciKimlik, @GecerlilikBitisi, @Simdi);

    /* Kod ve özeti işlem kaydına yazılmaz. */
    SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                           @Giris AS girisAdi, @KullaniciTuru AS kullaniciTuruKodu, @KullaniciKayitNo AS kullaniciKayitNo,
                           (SELECT TOP (1) j.KayitNo FROM @Jeton AS j) AS jetonKayitNo,
                           @KapatilanOturum AS kapatilanOturumSayisi, @IptalEdilenJeton AS iptalEdilenJetonSayisi,
                           JSON_QUERY((SELECT @OncekiSifreVardi AS sifreVardi, @OncekiBelirlemeGerekli AS sifreBelirlemeGerekli
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS onceki,
                           JSON_QUERY((SELECT CAST(0 AS bit) AS sifreVardi, CAST(1 AS bit) AS sifreBelirlemeGerekli, @GecerlilikBitisi AS kodGecerlilikBitisi
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS sonraki
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    VALUES
        (N'girisSifresiSifirlandi', @IlgiliKayitTuru, @IlgiliKimlik, NULL, @Ayrinti, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);

    SELECT N'Sonuç' AS Bolum,
           @Uygula AS Uygulandi,
           CASE WHEN @Uygula = 1
                THEN N'şifre sıfırlandı; tek kullanımlık kodu kişiye telefonda okuyun. Kod 1 saat geçerli ve bir daha gösterilmeyecek'
                ELSE N'önizleme; hiçbir şey kaydedilmedi. Sonucu kontrol edin; kod üretmek için @Uygula = 1 ile yeniden çalıştırın' END AS Mesaj,
           @Giris AS GirisAdi,
           (SELECT a.Ad FROM kod.AktorTuru AS a WHERE a.Kod = @KullaniciTuru) AS KullaniciTuruAdi,
           @SahipAdi AS SahipAdi,
           CASE WHEN @Uygula = 1 THEN @KodGosterim END AS TekKullanimlikKod,
           CASE WHEN @Uygula = 1
                THEN CONVERT(datetime2(0), @GecerlilikBitisi AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') END AS GecerlilikBitisiTurkiye,
           @KapatilanOturum AS KapatilanOturumSayisi,
           @IptalEdilenJeton AS IptalEdilenJetonSayisi,
           @KullaniciKayitNo AS KullaniciKayitNo;

    IF @Uygula = 1
    BEGIN
        IF @DisIslem = 0
            COMMIT TRANSACTION;
    END
    ELSE
    BEGIN
        IF @DisIslem = 0
            ROLLBACK TRANSACTION;
        ELSE
            ROLLBACK TRANSACTION YonetimOnizleme;
    END;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'GirisSifresiniSifirla',
     @Metin = N'Ne yapar: personel ya da servis girişinin şifresini sıfırlar: şifre kaydı silinir (SifreKaydi boş, SifreBelirlemeGerekli = 1), başarısız giriş sayacı ve kilit sıfırlanır, açık oturumlar sifreDegisti nedeniyle kapanır, kullanılmamış öteki kodlar iptal edilir, 1 saat geçerli yeni tek kullanımlık kod üretilir. Kod XXXX-XXXX-XXXX-XXXX biçiminde yalnız @Uygula = 1 iken sonuçta bir kez görünür; veritabanında yalnız SHA-256 özeti (erisim.SifreSifirlamaJetonu) durur, işlem kaydına yazılmaz. Kişi Servisim''de ya da backoffice''te giriş adı + kod + yeni şifreyle girer. İşlem kaydı girisSifresiSifirlandi. Kapılar: giriş adı aktif bir personel ya da servis girişine ait değilse 51102. Ne yapmaz: şifre belirlemez (şifreyi kişi girer); kodu SMS ya da e-postayla göndermez; servis şifre yardım talebini kapatmaz; müşteri şifresine dokunmaz. Önce backoffice ekranını kullanın; backoffice''e girilemiyorsa: EXEC yonetim.GirisSifresiniSifirla @GirisAdi = N''konya.merkez'', @Gerekce = N''Servis şifresini unuttu, telefonla doğrulandı'', @YapanGirisAdi = N''ali.yilmaz'', @Uygula = 1;';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'GirisSifresiniSifirla', @Alt = N'@GirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'Şifresi sıfırlanacak personel ya da servis girişinin giriş adı (büyük/küçük harf ve Türkçe harf fark etmez).';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'GirisSifresiniSifirla', @Alt = N'@Gerekce', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemin nedeni ve kimliğin nasıl doğrulandığı; en az 10 karakter. İşlem kaydına yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'GirisSifresiniSifirla', @Alt = N'@YapanGirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemi yapan personelin giriş adı; aktif personel olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'GirisSifresiniSifirla', @Alt = N'@Uygula', @AltTuru = N'PARAMETER',
     @Metin = N'0 (varsayılan): önizleme, kod gösterilmez ve hiçbir şey kaydedilmez. 1: uygulanır ve kod bir kez gösterilir.';
GO

/* --------------------------------------------------------------------------
   12. yonetim.ServiseMarkaYetkisiVer
   Satır varsa aynı satır yeniden açılır (BitisZamani boş, BaslangicZamani
   şimdi); eski dönem gecmis.servis_MarkaYetkisi'nde kalır.
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yonetim.ServiseMarkaYetkisiVer
    @ServisKayitNo bigint,
    @MarkaKodu     nvarchar(20),
    @Gerekce       nvarchar(500),
    @YapanGirisAdi nvarchar(40),
    @Uygula        bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @DisIslem bit = CASE WHEN @@TRANCOUNT > 0 THEN 1 ELSE 0 END;
    DECLARE @YapanKullaniciKimlik uniqueidentifier;
    DECLARE @YapanAdi nvarchar(150);
    DECLARE @YapanRolAdi nvarchar(100);
    DECLARE @Ayrinti nvarchar(max);

    DECLARE @Marka nvarchar(20) = LOWER(LTRIM(RTRIM(ISNULL(@MarkaKodu, N''))) COLLATE Latin1_General_100_BIN2);
    DECLARE @MarkaAdi nvarchar(100);
    DECLARE @ServisKimlik uniqueidentifier;
    DECLARE @ServisAdi nvarchar(200);
    DECLARE @ServisDurumu nvarchar(40);
    DECLARE @SatirVar bit = 0;
    DECLARE @OncekiEtkin bit;
    DECLARE @OncekiBitis datetime2(3);

    SET @Uygula = ISNULL(@Uygula, 0);
    SET @Gerekce = LTRIM(RTRIM(@Gerekce));
    IF LEN(ISNULL(@Gerekce, N'')) < 10
        THROW 51100, N'düzeltmenin gerekçesini en az 10 karakterle yazın', 1;

    SELECT @YapanKullaniciKimlik = k.Kimlik, @YapanAdi = p.AdSoyad, @YapanRolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@YapanGirisAdi) AS s)
      AND k.TurKodu = N'personel' AND k.Aktif = 1 AND p.AyrilmaZamani IS NULL;
    IF @YapanKullaniciKimlik IS NULL
        THROW 51101, N'işlemi yapan giriş adı aktif bir personele ait değil; işlemi yapan personelin aktif giriş adını verin', 1;

    SELECT @ServisKimlik = s.Kimlik, @ServisAdi = s.Ad
    FROM servis.Servis AS s
    WHERE s.KayitNo = @ServisKayitNo;
    IF @ServisKimlik IS NULL
        THROW 51102, N'bu KayitNo ile servis bulunamadı; yardim.ServisGoster ile bakın', 1;

    SELECT @MarkaAdi = m.Ad FROM katalog.Marka AS m WHERE m.Kod = @Marka;
    IF @MarkaAdi IS NULL
        THROW 51102, N'bu marka kodu yok; katalog.Marka listesine bakın', 1;

    IF @DisIslem = 0
        BEGIN TRANSACTION;
    ELSE
        SAVE TRANSACTION YonetimOnizleme;

    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @YapanKullaniciKimlik,
         @YapanHesapKimlik = NULL, @YapanAdi = @YapanAdi, @KaynakUygulamaKodu = N'yonetim',
         @UygulamaSurumu = NULL, @MusteriyeBildirildi = 0;

    SELECT @ServisDurumu = s.DurumKodu
    FROM servis.Servis AS s WITH (UPDLOCK, HOLDLOCK)
    WHERE s.Kimlik = @ServisKimlik;

    IF @ServisDurumu <> N'aktif'
        THROW 51131, N'servis pasif; pasif servise marka yetkisi verilemez. Servisin durumunu kontrol edin', 1;

    SELECT @SatirVar = 1, @OncekiEtkin = y.Etkin, @OncekiBitis = y.BitisZamani
    FROM servis.MarkaYetkisi AS y WITH (UPDLOCK, HOLDLOCK)
    WHERE y.ServisKimlik = @ServisKimlik AND y.MarkaKodu = @Marka;

    IF @OncekiEtkin = 1
        THROW 51113, N'servisin bu markada yetkisi zaten var; mevcut yetkiyi kontrol edin, yeniden yetki verme işlemi yapmayın', 1;

    IF @SatirVar = 1
        UPDATE servis.MarkaYetkisi
        SET BitisZamani = NULL,
            BaslangicZamani = @Simdi,
            VerenKullaniciKimlik = @YapanKullaniciKimlik
        WHERE ServisKimlik = @ServisKimlik AND MarkaKodu = @Marka;
    ELSE
        INSERT servis.MarkaYetkisi (ServisKimlik, MarkaKodu, VerenKullaniciKimlik, BaslangicZamani, BitisZamani)
        VALUES (@ServisKimlik, @Marka, @YapanKullaniciKimlik, @Simdi, NULL);

    SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                           N'ver' AS islem, @ServisKayitNo AS servisKayitNo, @Marka AS markaKodu,
                           JSON_QUERY((SELECT @SatirVar AS yetkiSatiriVardi, COALESCE(@OncekiEtkin, CAST(0 AS bit)) AS etkin, @OncekiBitis AS bitisZamani
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS onceki,
                           JSON_QUERY((SELECT CAST(1 AS bit) AS etkin, @Simdi AS baslangicZamani
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS sonraki
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    VALUES
        (N'servisYetkisiDegisti', N'servis', @ServisKimlik, NULL, @Ayrinti, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);

    SELECT N'Sonuç' AS Bolum,
           @Uygula AS Uygulandi,
           CASE WHEN @Uygula = 1
                THEN N'servise marka yetkisi verildi'
                ELSE N'önizleme; hiçbir şey kaydedilmedi. Sonucu kontrol edin; değişiklikleri kaydetmek için @Uygula = 1 ile yeniden çalıştırın' END AS Mesaj,
           @ServisAdi AS ServisAdi,
           @ServisKayitNo AS ServisKayitNo,
           @Marka AS MarkaKodu,
           @MarkaAdi AS MarkaAdi,
           CAST(@SatirVar AS bit) AS DahaOnceVerilmisti,
           CONVERT(datetime2(0), @OncekiBitis AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OncekiBitisZamaniTurkiye,
           CONVERT(datetime2(0), @Simdi AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BaslangicZamaniTurkiye;

    IF @Uygula = 1
    BEGIN
        IF @DisIslem = 0
            COMMIT TRANSACTION;
    END
    ELSE
    BEGIN
        IF @DisIslem = 0
            ROLLBACK TRANSACTION;
        ELSE
            ROLLBACK TRANSACTION YonetimOnizleme;
    END;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'ServiseMarkaYetkisiVer',
     @Metin = N'Ne yapar: aktif servise bir markada iş yapma yetkisi verir (servis.MarkaYetkisi). Servis bu markada daha önce yetkiliyse aynı satır yeniden açılır (BitisZamani boş, BaslangicZamani şimdi, veren personel); eski dönem gecmis.servis_MarkaYetkisi''nde kalır. İşlem kaydı servisYetkisiDegisti. Kapılar: servis KayitNo ya da marka kodu yoksa 51102; servis aktif değilse 51131; yetki zaten etkinse 51113. Ne yapmaz: makineleri bu servise atamaz (MakineyeServisAta), bölge ya da bayi bağı eklemez (backoffice > Servisler). Örnek: EXEC yonetim.ServiseMarkaYetkisiVer @ServisKayitNo = 17, @MarkaKodu = N''globale'', @Gerekce = N''Globale bakım sözleşmesi imzalandı'', @YapanGirisAdi = N''ali.yilmaz'', @Uygula = 0;';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'ServiseMarkaYetkisiVer', @Alt = N'@ServisKayitNo', @AltTuru = N'PARAMETER',
     @Metin = N'Servisin KayitNo''su (yardim.ServisGoster ya da gorunum.ServisKarti).';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'ServiseMarkaYetkisiVer', @Alt = N'@MarkaKodu', @AltTuru = N'PARAMETER',
     @Metin = N'katalog.Marka kodu (paksan, globale …); büyük/küçük harf fark etmez.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'ServiseMarkaYetkisiVer', @Alt = N'@Gerekce', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemin nedeni; en az 10 karakter. İşlem kaydına yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'ServiseMarkaYetkisiVer', @Alt = N'@YapanGirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemi yapan personelin giriş adı; aktif personel olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'ServiseMarkaYetkisiVer', @Alt = N'@Uygula', @AltTuru = N'PARAMETER',
     @Metin = N'0 (varsayılan): önizleme, hiçbir şey kaydedilmez. 1: uygulanır.';
GO

/* --------------------------------------------------------------------------
   13. yonetim.ServistenMarkaYetkisiniAl
   Önce o servisin o markadaki açık makine atamaları biter (atamanın
   yetkiye bağı YetkiEtkin = 1 iken yetki kapatılamaz), sonra yetki.
   Üç sonuç kümesi: sonuç, bitirilen atamalar, açık talepler.
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yonetim.ServistenMarkaYetkisiniAl
    @ServisKayitNo bigint,
    @MarkaKodu     nvarchar(20),
    @Gerekce       nvarchar(500),
    @YapanGirisAdi nvarchar(40),
    @Uygula        bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @DisIslem bit = CASE WHEN @@TRANCOUNT > 0 THEN 1 ELSE 0 END;
    DECLARE @YapanKullaniciKimlik uniqueidentifier;
    DECLARE @YapanAdi nvarchar(150);
    DECLARE @YapanRolAdi nvarchar(100);
    DECLARE @Ayrinti nvarchar(max);

    DECLARE @Marka nvarchar(20) = LOWER(LTRIM(RTRIM(ISNULL(@MarkaKodu, N''))) COLLATE Latin1_General_100_BIN2);
    DECLARE @MarkaAdi nvarchar(100);
    DECLARE @ServisKimlik uniqueidentifier;
    DECLARE @ServisAdi nvarchar(200);
    DECLARE @Etkin bit;
    DECLARE @OncekiBaslangic datetime2(3);
    DECLARE @BitenSayisi int = 0;
    DECLARE @AcikTalepSayisi int = 0;
    DECLARE @Biten TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY, KayitNo bigint NOT NULL, MakineKimlik uniqueidentifier NOT NULL);

    SET @Uygula = ISNULL(@Uygula, 0);
    SET @Gerekce = LTRIM(RTRIM(@Gerekce));
    IF LEN(ISNULL(@Gerekce, N'')) < 10
        THROW 51100, N'düzeltmenin gerekçesini en az 10 karakterle yazın', 1;

    SELECT @YapanKullaniciKimlik = k.Kimlik, @YapanAdi = p.AdSoyad, @YapanRolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@YapanGirisAdi) AS s)
      AND k.TurKodu = N'personel' AND k.Aktif = 1 AND p.AyrilmaZamani IS NULL;
    IF @YapanKullaniciKimlik IS NULL
        THROW 51101, N'işlemi yapan giriş adı aktif bir personele ait değil; işlemi yapan personelin aktif giriş adını verin', 1;

    SELECT @ServisKimlik = s.Kimlik, @ServisAdi = s.Ad
    FROM servis.Servis AS s
    WHERE s.KayitNo = @ServisKayitNo;
    IF @ServisKimlik IS NULL
        THROW 51102, N'bu KayitNo ile servis bulunamadı; yardim.ServisGoster ile bakın', 1;

    SELECT @MarkaAdi = m.Ad FROM katalog.Marka AS m WHERE m.Kod = @Marka;

    IF @DisIslem = 0
        BEGIN TRANSACTION;
    ELSE
        SAVE TRANSACTION YonetimOnizleme;

    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @YapanKullaniciKimlik,
         @YapanHesapKimlik = NULL, @YapanAdi = @YapanAdi, @KaynakUygulamaKodu = N'yonetim',
         @UygulamaSurumu = NULL, @MusteriyeBildirildi = 0;

    SELECT @Etkin = y.Etkin, @OncekiBaslangic = y.BaslangicZamani
    FROM servis.MarkaYetkisi AS y WITH (UPDLOCK, HOLDLOCK)
    WHERE y.ServisKimlik = @ServisKimlik AND y.MarkaKodu = @Marka;

    IF ISNULL(@Etkin, 0) = 0
        THROW 51102, N'servisin bu markada etkin yetkisi yok; marka kodunu ve mevcut yetkileri kontrol edin', 1;

    UPDATE makine.MakineServisAtamasi
    SET BitisZamani = CASE WHEN BaslangicZamani > @Simdi THEN BaslangicZamani ELSE @Simdi END,
        BitirenKullaniciKimlik = @YapanKullaniciKimlik,
        BitirenAdi = @YapanAdi
    OUTPUT inserted.Kimlik, inserted.KayitNo, inserted.MakineKimlik INTO @Biten (Kimlik, KayitNo, MakineKimlik)
    WHERE ServisKimlik = @ServisKimlik AND MarkaKodu = @Marka AND BitisZamani IS NULL;
    SET @BitenSayisi = @@ROWCOUNT;

    UPDATE servis.MarkaYetkisi
    SET BitisZamani = CASE WHEN BaslangicZamani > @Simdi THEN BaslangicZamani ELSE @Simdi END
    WHERE ServisKimlik = @ServisKimlik AND MarkaKodu = @Marka;

    SELECT @AcikTalepSayisi = COUNT(*)
    FROM talep.Talep AS t
    WHERE t.ServisKimlik = @ServisKimlik AND t.MarkaKodu = @Marka AND t.Kapali = 0;

    SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                           N'al' AS islem, @ServisKayitNo AS servisKayitNo, @Marka AS markaKodu,
                           @BitenSayisi AS bitirilenAtamaSayisi, @AcikTalepSayisi AS acikTalepSayisi,
                           (SELECT b.KayitNo AS atamaKayitNo FROM @Biten AS b FOR JSON PATH) AS bitirilenAtamalar,
                           JSON_QUERY((SELECT CAST(1 AS bit) AS etkin, @OncekiBaslangic AS baslangicZamani
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS onceki,
                           JSON_QUERY((SELECT CAST(0 AS bit) AS etkin, @Simdi AS bitisZamani
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS sonraki
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    VALUES
        (N'servisYetkisiDegisti', N'servis', @ServisKimlik, NULL, @Ayrinti, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);

    /* Bitirilen her atama için ayrıca bir kayıt (makinenin kendi geçmişinde görünsün). */
    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    SELECT N'makineServisAtamasiKaldirildi', N'makine', b.MakineKimlik,
           CASE WHEN LEN(m.SeriNo) <= 20 THEN m.SeriNo END,
           (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                   N'servistenMarkaYetkisiAlindi' AS neden, m.SeriNo AS seriNo, m.MarkaKodu AS markaKodu,
                   m.KayitNo AS makineKayitNo, b.KayitNo AS atamaKayitNo, @ServisKayitNo AS servisKayitNo
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES),
           @Simdi,
           N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL
    FROM @Biten AS b
    JOIN makine.Makine AS m ON m.Kimlik = b.MakineKimlik;

    SELECT N'Sonuç' AS Bolum,
           @Uygula AS Uygulandi,
           CASE WHEN @Uygula = 1
                THEN N'servisin marka yetkisi kaldırıldı; makine atamaları sonlandırıldı. Açık taleplerin devri için personelin karar vermesi gerekiyor'
                ELSE N'önizleme; hiçbir şey kaydedilmedi. Sonlandırılacak atamaları ve açık talepleri aşağıda kontrol edin; değişiklikleri kaydetmek için @Uygula = 1 ile yeniden çalıştırın' END AS Mesaj,
           @ServisAdi AS ServisAdi,
           @ServisKayitNo AS ServisKayitNo,
           @Marka AS MarkaKodu,
           @MarkaAdi AS MarkaAdi,
           @BitenSayisi AS BitirilenAtamaSayisi,
           @AcikTalepSayisi AS AcikTalepSayisi,
           CONVERT(datetime2(0), @Simdi AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BitisZamaniTurkiye;

    SELECT N'Bitirilen makine atamaları' AS Bolum,
           m.SeriNo, m.MarkaKodu, ur.Ad AS UrunAdi, b.KayitNo AS AtamaKayitNo,
           zs.Ad AS ZincirdekiServisAdi, zs.KayitNo AS ZincirdekiServisKayitNo, ms.ServisKaynagiKodu,
           m.KayitNo AS MakineKayitNo
    FROM @Biten AS b
    JOIN makine.Makine AS m ON m.Kimlik = b.MakineKimlik
    LEFT JOIN katalog.Urun AS ur ON ur.MarkaKodu = m.MarkaKodu AND ur.Kod = m.UrunKodu
    LEFT JOIN makine.MakineninServisi AS ms ON ms.MakineKimlik = m.Kimlik
    LEFT JOIN servis.Servis AS zs ON zs.Kimlik = ms.ServisKimlik
    ORDER BY m.SeriNo;

    SELECT N'Servisin bu markadaki açık talepleri' AS Bolum, v.*
    FROM talep.Talep AS t
    JOIN gorunum.TalepListesi AS v ON v.KayitNo = t.KayitNo
    WHERE t.ServisKimlik = @ServisKimlik AND t.MarkaKodu = @Marka AND t.Kapali = 0
    ORDER BY t.OlusmaZamani DESC;

    IF @Uygula = 1
    BEGIN
        IF @DisIslem = 0
            COMMIT TRANSACTION;
    END
    ELSE
    BEGIN
        IF @DisIslem = 0
            ROLLBACK TRANSACTION;
        ELSE
            ROLLBACK TRANSACTION YonetimOnizleme;
    END;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'ServistenMarkaYetkisiniAl',
     @Metin = N'Ne yapar: servisin bir markadaki yetkisini aynı işlemde bitirir: önce o servisin o markadaki bütün açık makine servis atamaları biter (BitisZamani, bitiren personel), sonra servis.MarkaYetkisi BitisZamani yazılır; o makinelerin servisi zincirin sonraki adımına (bayinin servisi ya da boş) düşer. Üç sonuç kümesi döner: 1 sonuç (bitirilen atama ve açık talep sayısı), 2 bitirilen atamalar (seri, ürün, zincirde şimdi görünen servis), 3 servisin bu markadaki açık talepleri (gorunum.TalepListesi). Önizleme (@Uygula = 0) aynı listeleri kaydetmeden gösterir. İşlem kaydı servisYetkisiDegisti; ayrıca bitirilen her atama için makineServisAtamasiKaldirildi. Kapılar: servis KayitNo yoksa ya da bu markada etkin yetkisi yoksa 51102. Ne yapmaz: açık talepleri başka servise devretmez (devir kararı personelde, backoffice); servisi pasifleştirmez. Örnek: EXEC yonetim.ServistenMarkaYetkisiniAl @ServisKayitNo = 17, @MarkaKodu = N''globale'', @Gerekce = N''Globale sözleşmesi sona erdi'', @YapanGirisAdi = N''ali.yilmaz'', @Uygula = 0;';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'ServistenMarkaYetkisiniAl', @Alt = N'@ServisKayitNo', @AltTuru = N'PARAMETER',
     @Metin = N'Servisin KayitNo''su.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'ServistenMarkaYetkisiniAl', @Alt = N'@MarkaKodu', @AltTuru = N'PARAMETER',
     @Metin = N'Yetkisi alınacak marka kodu; büyük/küçük harf fark etmez.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'ServistenMarkaYetkisiniAl', @Alt = N'@Gerekce', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemin nedeni; en az 10 karakter. İşlem kayıtlarına yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'ServistenMarkaYetkisiniAl', @Alt = N'@YapanGirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemi yapan personelin giriş adı; aktif personel olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'ServistenMarkaYetkisiniAl', @Alt = N'@Uygula', @AltTuru = N'PARAMETER',
     @Metin = N'0 (varsayılan): önizleme, hiçbir şey kaydedilmez. 1: uygulanır.';
GO

/* --------------------------------------------------------------------------
   14. yonetim.KisiselVerileriAnonimlestir
   Hesaplar: telefonun güncel sahibi olan hesap ve (verildiyse) başvurunun
   bağlı olduğu hesap; birleşme zinciri musteri.HesabiAnonimlestir'de
   izlenir (zincir başına bir çağrı). Hesapsız kayıtlar tasarim.md 1.13.5
   son maddelerine göre burada temizlenir. İki sonuç kümesi: sonuç ve
   tablo başına etkilenen satır sayısı.
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yonetim.KisiselVerileriAnonimlestir
    @Telefon        nvarchar(400),
    @BasvuruKayitNo bigint = NULL,
    @Gerekce        nvarchar(500),
    @YapanGirisAdi  nvarchar(40),
    @Uygula         bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @DisIslem bit = CASE WHEN @@TRANCOUNT > 0 THEN 1 ELSE 0 END;
    DECLARE @YapanKullaniciKimlik uniqueidentifier;
    DECLARE @YapanAdi nvarchar(150);
    DECLARE @YapanRolAdi nvarchar(100);
    DECLARE @Ayrinti nvarchar(max);

    /* Anonim metni: musteri.HesabiAnonimlestir'deki sabitle aynı (tasarim.md 1.13.5). */
    DECLARE @Anonim nvarchar(1000) = N'anonimleştirildi';
    DECLARE @Tel nvarchar(16);
    DECLARE @BasvuruKimlik uniqueidentifier;
    DECLARE @BasvuruHesap uniqueidentifier;
    DECLARE @BasvuruDurum nvarchar(40);
    DECLARE @Kok uniqueidentifier;
    DECLARE @CagrilacakHesap uniqueidentifier;
    DECLARE @SonHesapKayitNo bigint = -1;
    DECLARE @HesapKimlik uniqueidentifier;
    DECLARE @HesapKayitNo bigint;

    DECLARE @Dogrudan TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY);
    DECLARE @Hesap TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY, KayitNo bigint NOT NULL, Kok uniqueidentifier NOT NULL, Dogrudan bit NOT NULL);
    DECLARE @Talep TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY);
    DECLARE @TelDegisikligi TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY);
    DECLARE @GeriBildirim TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY);
    DECLARE @Giden TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY);
    DECLARE @Dosya TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY);
    DECLARE @CagriSonucu TABLE (Tablo nvarchar(128) COLLATE DATABASE_DEFAULT NOT NULL, SatirSayisi int NOT NULL);
    DECLARE @Sonuc TABLE (Sira int IDENTITY(1, 1) NOT NULL PRIMARY KEY,
                          Kaynak nvarchar(20) COLLATE DATABASE_DEFAULT NOT NULL,
                          Tablo nvarchar(128) COLLATE DATABASE_DEFAULT NOT NULL,
                          SatirSayisi int NOT NULL);

    SET @Uygula = ISNULL(@Uygula, 0);
    SET @Gerekce = LTRIM(RTRIM(@Gerekce));
    IF LEN(ISNULL(@Gerekce, N'')) < 10
        THROW 51100, N'düzeltmenin gerekçesini en az 10 karakterle yazın', 1;

    SELECT @YapanKullaniciKimlik = k.Kimlik, @YapanAdi = p.AdSoyad, @YapanRolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@YapanGirisAdi) AS s)
      AND k.TurKodu = N'personel' AND k.Aktif = 1 AND p.AyrilmaZamani IS NULL;
    IF @YapanKullaniciKimlik IS NULL
        THROW 51101, N'işlemi yapan giriş adı aktif bir personele ait değil; işlemi yapan personelin aktif giriş adını verin', 1;

    SELECT @Tel = s.TelefonE164 FROM yardim.Sadelestir(@Telefon) AS s;
    IF @Tel IS NULL
        THROW 51120, N'telefon numarası geçersiz; numaraları kontrol edip geçerli biçimde verin', 1;

    IF @BasvuruKayitNo IS NOT NULL
    BEGIN
        SELECT @BasvuruKimlik = b.Kimlik, @BasvuruHesap = b.HesapKimlik
        FROM kvkk.BasvuruTalebi AS b
        WHERE b.KayitNo = @BasvuruKayitNo;
        IF @BasvuruKimlik IS NULL
            THROW 51102, N'bu KayitNo ile KVKK başvurusu bulunamadı; verilen bilgileri kontrol edip yeniden çalıştırın', 1;
    END;

    IF @DisIslem = 0
        BEGIN TRANSACTION;
    ELSE
        SAVE TRANSACTION YonetimOnizleme;

    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @YapanKullaniciKimlik,
         @YapanHesapKimlik = NULL, @YapanAdi = @YapanAdi, @KaynakUygulamaKodu = N'yonetim',
         @UygulamaSurumu = NULL, @MusteriyeBildirildi = 0;

    IF @BasvuruKimlik IS NOT NULL
    BEGIN
        SELECT @BasvuruDurum = b.DurumKodu
        FROM kvkk.BasvuruTalebi AS b WITH (UPDLOCK, HOLDLOCK)
        WHERE b.Kimlik = @BasvuruKimlik;

        IF @BasvuruDurum IN (N'sonuclandi', N'reddedildi')
            THROW 51113, N'başvuru zaten sonuçlanmış ya da reddedilmiş; KVKK başvurusunun sonucunu kontrol edin', 1;
    END;

    /* 1. Hesaplar ve birleşme zincirleri */
    INSERT @Dogrudan (Kimlik)
    SELECT h.Kimlik FROM musteri.Hesap AS h WITH (UPDLOCK, HOLDLOCK) WHERE h.TelefonE164 = @Tel
    UNION
    SELECT h.Kimlik FROM musteri.Hesap AS h WHERE @BasvuruHesap IS NOT NULL AND h.Kimlik = @BasvuruHesap;

    WITH yukari AS (
        SELECT h.Kimlik, h.BirlestigiHesapKimlik, 0 AS Derinlik
        FROM musteri.Hesap AS h
        WHERE h.Kimlik IN (SELECT d.Kimlik FROM @Dogrudan AS d)
        UNION ALL
        SELECT h.Kimlik, h.BirlestigiHesapKimlik, y.Derinlik + 1
        FROM yukari AS y
        JOIN musteri.Hesap AS h ON h.Kimlik = y.BirlestigiHesapKimlik
        WHERE y.Derinlik < 50
    ), kok AS (
        SELECT DISTINCT y.Kimlik AS Kok FROM yukari AS y WHERE y.BirlestigiHesapKimlik IS NULL
    ), asagi AS (
        SELECT k.Kok, k.Kok AS Kimlik, 0 AS Derinlik
        FROM kok AS k
        UNION ALL
        SELECT a.Kok, h.Kimlik, a.Derinlik + 1
        FROM asagi AS a
        JOIN musteri.Hesap AS h ON h.BirlestigiHesapKimlik = a.Kimlik
        WHERE a.Derinlik < 50
    )
    INSERT @Hesap (Kimlik, KayitNo, Kok, Dogrudan)
    SELECT DISTINCT a.Kimlik, h.KayitNo, a.Kok,
           CASE WHEN EXISTS (SELECT 1 FROM @Dogrudan AS d WHERE d.Kimlik = a.Kimlik) THEN 1 ELSE 0 END
    FROM asagi AS a
    JOIN musteri.Hesap AS h ON h.Kimlik = a.Kimlik;

    /* 2. Hesapsız kayıtlar (hesaplar temizlenmeden önce toplanır) */
    INSERT @Talep (Kimlik)
    SELECT t.Kimlik
    FROM talep.Talep AS t WITH (UPDLOCK, HOLDLOCK)
    WHERE t.HesapKimlik IS NULL AND t.IletisimTelefonE164 = @Tel;

    INSERT @TelDegisikligi (Kimlik)
    SELECT d.Kimlik
    FROM musteri.TelefonDegisikligiTalebi AS d
    WHERE d.EskiTelefonE164 = @Tel OR d.YeniTelefonE164 = @Tel;

    INSERT @GeriBildirim (Kimlik)
    SELECT g.Kimlik
    FROM musteri.GeriBildirim AS g
    WHERE g.HesapKimlik IS NULL AND g.IletisimTelefonE164 = @Tel;

    INSERT @Giden (Kimlik)
    SELECT g.Kimlik
    FROM sistem.Giden AS g
    WHERE g.AliciAdres = @Tel
       OR g.IlgiliKimlik IN (SELECT t.Kimlik FROM @Talep AS t)
       OR g.IlgiliKimlik IN (SELECT d.Kimlik FROM @TelDegisikligi AS d)
       OR g.IlgiliKimlik IN (SELECT b.Kimlik FROM @GeriBildirim AS b);

    INSERT @Dosya (Kimlik)
    SELECT te.DosyaKimlik FROM talep.TalepEki AS te WHERE te.TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t)
    UNION
    SELECT ee.DosyaKimlik FROM talep.EklemeEki AS ee JOIN talep.Ekleme AS e ON e.Kimlik = ee.EklemeKimlik
    WHERE e.TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t)
    UNION
    SELECT e.SesDosyaKimlik FROM talep.Ekleme AS e
    WHERE e.TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t) AND e.SesDosyaKimlik IS NOT NULL
    UNION
    SELECT t.SesDosyaKimlik FROM talep.Talep AS t
    WHERE t.Kimlik IN (SELECT x.Kimlik FROM @Talep AS x) AND t.SesDosyaKimlik IS NOT NULL
    UNION
    SELECT zf.DosyaKimlik FROM talep.ZiyaretFotografi AS zf JOIN talep.ServisZiyareti AS z ON z.Kimlik = zf.ZiyaretKimlik
    WHERE z.TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t)
    UNION
    SELECT k.ServisFisiDosyaKimlik FROM talep.Kapanis AS k
    WHERE k.TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t) AND k.ServisFisiDosyaKimlik IS NOT NULL
    UNION
    SELECT d.DosyaKimlik FROM talep.Dekont AS d WHERE d.TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t)
    UNION
    SELECT ge.DosyaKimlik FROM sistem.GidenEki AS ge WHERE ge.GidenKimlik IN (SELECT g.Kimlik FROM @Giden AS g);

    /* 3. Hesapları anonimleştir: zincir başına bir çağrı */
    SET @Kok = NULL;
    WHILE 1 = 1
    BEGIN
        SET @CagrilacakHesap = NULL;
        SELECT TOP (1) @Kok = h.Kok, @CagrilacakHesap = h.Kimlik
        FROM @Hesap AS h
        WHERE @Kok IS NULL OR h.Kok > @Kok
        ORDER BY h.Kok, h.Dogrudan DESC;

        IF @CagrilacakHesap IS NULL
            BREAK;

        DELETE @CagriSonucu;
        INSERT @CagriSonucu (Tablo, SatirSayisi)
        EXEC musteri.HesabiAnonimlestir @HesapKimlik = @CagrilacakHesap;

        INSERT @Sonuc (Kaynak, Tablo, SatirSayisi)
        SELECT N'hesap', c.Tablo, c.SatirSayisi FROM @CagriSonucu AS c;
    END;

    /* Hesap başına işlem kaydı */
    WHILE 1 = 1
    BEGIN
        SET @HesapKimlik = NULL;
        SELECT TOP (1) @HesapKimlik = h.Kimlik, @HesapKayitNo = h.KayitNo
        FROM @Hesap AS h
        WHERE h.KayitNo > @SonHesapKayitNo
        ORDER BY h.KayitNo;

        IF @HesapKimlik IS NULL
            BREAK;
        SET @SonHesapKayitNo = @HesapKayitNo;

        SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                               @HesapKayitNo AS hesapKayitNo, @BasvuruKayitNo AS basvuruKayitNo,
                               (SELECT h.Dogrudan FROM @Hesap AS h WHERE h.Kimlik = @HesapKimlik) AS telefonlaBulundu,
                               JSON_QUERY((SELECT h.DurumKodu AS durumKodu FROM musteri.Hesap AS h WHERE h.Kimlik = @HesapKimlik
                                           FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS sonraki
                        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

        INSERT denetim.IslemKaydi
            (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
             YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
        VALUES
            (N'hesapAnonimlestirildi', N'hesap', @HesapKimlik, NULL, @Ayrinti, @Simdi,
             N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);
    END;

    /* 4. Hesapsız talepler ve alt kayıtları */
    UPDATE talep.Talep
    SET IletisimAdi = NULL, IletisimTelefonE164 = NULL, IletisimTelefonUlusal = NULL,
        Adres = NULL, YurtdisiBolge = NULL, YurtdisiIlce = NULL,
        Aciklama = CASE WHEN Aciklama IS NULL THEN NULL ELSE @Anonim END
    WHERE Kimlik IN (SELECT t.Kimlik FROM @Talep AS t);
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'talep.Talep', @@ROWCOUNT);

    UPDATE talep.TalepNotu SET Metin = @Anonim
    WHERE TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t);
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'talep.TalepNotu', @@ROWCOUNT);

    UPDATE talep.Iptal SET Aciklama = @Anonim
    WHERE TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t) AND Aciklama IS NOT NULL;
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'talep.Iptal', @@ROWCOUNT);

    UPDATE talep.Kapanis
    SET KapanisNotu = CASE WHEN KapanisNotu IS NULL THEN NULL ELSE @Anonim END,
        YapilanIsMetni = CASE WHEN YapilanIsMetni IS NULL THEN NULL ELSE @Anonim END
    WHERE TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t)
      AND (KapanisNotu IS NOT NULL OR YapilanIsMetni IS NOT NULL);
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'talep.Kapanis', @@ROWCOUNT);

    UPDATE talep.YenidenAcma SET Aciklama = @Anonim
    WHERE TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t) AND Aciklama IS NOT NULL;
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'talep.YenidenAcma', @@ROWCOUNT);

    UPDATE talep.Ekleme SET EklemeNotu = @Anonim
    WHERE TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t) AND EklemeNotu IS NOT NULL;
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'talep.Ekleme', @@ROWCOUNT);

    UPDATE talep.ServisZiyareti
    SET ArizaMetni = CASE WHEN ArizaMetni IS NULL THEN NULL ELSE @Anonim END,
        SonucMetni = CASE WHEN SonucMetni IS NULL THEN NULL ELSE @Anonim END
    WHERE TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t)
      AND (ArizaMetni IS NOT NULL OR SonucMetni IS NOT NULL);
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'talep.ServisZiyareti', @@ROWCOUNT);

    UPDATE talep.Randevu SET IsTanimi = NULL
    WHERE TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t) AND IsTanimi IS NOT NULL;
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'talep.Randevu', @@ROWCOUNT);

    UPDATE talep.Teklif SET TeklifNotu = @Anonim
    WHERE TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t) AND TeklifNotu IS NOT NULL;
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'talep.Teklif', @@ROWCOUNT);

    UPDATE talep.Devir SET Neden = @Anonim
    WHERE TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t) AND Neden IS NOT NULL;
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'talep.Devir', @@ROWCOUNT);

    UPDATE talep.ParcaTalebiAyrinti SET TeslimatAdresi = NULL
    WHERE TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t) AND TeslimatAdresi IS NOT NULL;
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'talep.ParcaTalebiAyrinti', @@ROWCOUNT);

    UPDATE talep.FaturaBilgisi
    SET AdSoyad = NULL, Unvan = NULL,
        TcNoSifreli = NULL, TcNoOzeti = NULL, TcNoMaskeli = NULL,
        VergiNoSifreli = NULL, VergiNoOzeti = NULL, VergiNoMaskeli = NULL,
        VergiDairesi = NULL, Eposta = NULL,
        TelefonE164 = NULL, TelefonUlusal = NULL,
        Adres = NULL, YurtdisiBolge = NULL, YurtdisiIlce = NULL
    WHERE TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t);
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'talep.FaturaBilgisi', @@ROWCOUNT);

    UPDATE talep.Dekont SET GecersizNedeni = @Anonim
    WHERE TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t) AND GecersizNedeni IS NOT NULL;
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'talep.Dekont', @@ROWCOUNT);

    UPDATE talep.OdemeOnayi SET OnayNotu = @Anonim
    WHERE TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t) AND OnayNotu IS NOT NULL;
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'talep.OdemeOnayi', @@ROWCOUNT);

    UPDATE bildirim.Bildirim
    SET SerbestMetin = CASE WHEN SerbestMetin IS NULL THEN NULL ELSE @Anonim END,
        DegerlerJson = CASE WHEN DegerlerJson IS NULL THEN NULL ELSE N'{}' END
    WHERE TalepKimlik IN (SELECT t.Kimlik FROM @Talep AS t)
      AND (SerbestMetin IS NOT NULL OR DegerlerJson IS NOT NULL);
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'bildirim.Bildirim', @@ROWCOUNT);

    UPDATE makine.KayitOlayi SET BeyanAdi = NULL
    WHERE BeyanAdi IS NOT NULL
      AND MakineKimlik IN (SELECT t.MakineKimlik FROM talep.Talep AS t
                           WHERE t.Kimlik IN (SELECT x.Kimlik FROM @Talep AS x) AND t.MakineKimlik IS NOT NULL);
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'makine.KayitOlayi', @@ROWCOUNT);

    /* 5. Numara değişikliği talepleri, geri bildirimler, giden kuyruğu, doğrulama kodları, dosyalar */
    UPDATE musteri.TelefonDegisikligiTalebi
    SET BeyanAdi = NULL, EskiTelefonE164 = NULL, YeniTelefonE164 = NULL, KanitSeriNo = NULL,
        KararNotu = CASE WHEN KararNotu IS NULL THEN NULL ELSE @Anonim END
    WHERE Kimlik IN (SELECT d.Kimlik FROM @TelDegisikligi AS d);
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'musteri.TelefonDegisikligiTalebi', @@ROWCOUNT);

    UPDATE musteri.GeriBildirim
    SET IletisimAdi = NULL, IletisimTelefonE164 = NULL, Metin = @Anonim
    WHERE Kimlik IN (SELECT g.Kimlik FROM @GeriBildirim AS g);
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'musteri.GeriBildirim', @@ROWCOUNT);

    UPDATE musteri.GeriBildirimNotu SET Metin = @Anonim
    WHERE GeriBildirimKimlik IN (SELECT g.Kimlik FROM @GeriBildirim AS g);
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'musteri.GeriBildirimNotu', @@ROWCOUNT);

    UPDATE sistem.Giden
    SET AliciAdres = NULL, Konu = NULL, Govde = NULL, DegiskenlerJson = NULL, SonHata = NULL,
        DurumKodu = CASE WHEN DurumKodu IN (N'bekliyor', N'hata') THEN N'vazgecildi' ELSE DurumKodu END,
        SonrakiDenemeZamani = CASE WHEN DurumKodu IN (N'bekliyor', N'hata') THEN NULL ELSE SonrakiDenemeZamani END
    WHERE Kimlik IN (SELECT g.Kimlik FROM @Giden AS g);
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'sistem.Giden', @@ROWCOUNT);

    UPDATE erisim.DogrulamaKodu SET TelefonE164 = NULL
    WHERE TelefonE164 = @Tel;
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'erisim.DogrulamaKodu', @@ROWCOUNT);

    UPDATE dosya.Dosya
    SET OrijinalAd = NULL,
        GecersizNedeni = CASE WHEN GecersizNedeni IS NULL THEN NULL ELSE @Anonim END,
        SilinmeIstendiZamani = CASE WHEN SaklamaSinifiKodu = N'genel' THEN COALESCE(SilinmeIstendiZamani, @Simdi) ELSE SilinmeIstendiZamani END
    WHERE Kimlik IN (SELECT d.Kimlik FROM @Dosya AS d);
    INSERT @Sonuc (Kaynak, Tablo, SatirSayisi) VALUES (N'hesapsiz', N'dosya.Dosya', @@ROWCOUNT);

    /* 6. Başvuru sonuçlanır */
    IF @BasvuruKimlik IS NOT NULL
        UPDATE kvkk.BasvuruTalebi
        SET DurumKodu = N'sonuclandi',
            SonuclanmaZamani = @Simdi
        WHERE Kimlik = @BasvuruKimlik;

    SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                           @BasvuruKayitNo AS basvuruKayitNo,
                           (SELECT h.KayitNo AS hesapKayitNo, h.Dogrudan AS telefonlaBulundu FROM @Hesap AS h FOR JSON PATH) AS hesaplar,
                           (SELECT COUNT(*) FROM @Talep) AS hesapsizTalepSayisi,
                           (SELECT s.Kaynak AS kaynak, s.Tablo AS tablo, SUM(s.SatirSayisi) AS satir
                            FROM @Sonuc AS s GROUP BY s.Kaynak, s.Tablo FOR JSON PATH) AS tablolar,
                           JSON_QUERY((SELECT @BasvuruDurum AS basvuruDurumKodu FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS onceki,
                           JSON_QUERY((SELECT CASE WHEN @BasvuruKimlik IS NOT NULL THEN N'sonuclandi' END AS basvuruDurumKodu
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS sonraki
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    VALUES
        (N'kisiselVeriAnonimlestirildi', CASE WHEN @BasvuruKimlik IS NOT NULL THEN N'kvkkBasvurusu' END, @BasvuruKimlik, NULL, @Ayrinti, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);

    SELECT N'Sonuç' AS Bolum,
           @Uygula AS Uygulandi,
           CASE WHEN @Uygula = 1
                THEN N'kişisel veriler anonimleştirildi; her tabloda etkilenen satır sayısı aşağıda'
                ELSE N'önizleme; hiçbir şey kaydedilmedi. Etkilenecek satır sayılarını aşağıda kontrol edin; değişiklikleri kaydetmek için @Uygula = 1 ile yeniden çalıştırın' END AS Mesaj,
           @BasvuruKayitNo AS BasvuruKayitNo,
           CASE WHEN @BasvuruKimlik IS NOT NULL THEN N'sonuclandi' END AS BasvuruDurumKodu,
           (SELECT COUNT(*) FROM @Hesap) AS AnonimlestirilenHesapSayisi,
           (SELECT STRING_AGG(CAST(h.KayitNo AS nvarchar(20)), N', ') WITHIN GROUP (ORDER BY h.KayitNo) FROM @Hesap AS h) AS HesapKayitNolari,
           (SELECT COUNT(*) FROM @Talep) AS HesapsizTalepSayisi,
           (SELECT COUNT(*) FROM @TelDegisikligi) AS NumaraDegisikligiSayisi,
           (SELECT COUNT(*) FROM @GeriBildirim) AS HesapsizGeriBildirimSayisi;

    SELECT N'Tablo başına etkilenen satır sayısı' AS Bolum,
           s.Kaynak, s.Tablo, SUM(s.SatirSayisi) AS SatirSayisi
    FROM @Sonuc AS s
    GROUP BY s.Kaynak, s.Tablo
    ORDER BY MIN(s.Sira);

    IF @Uygula = 1
    BEGIN
        IF @DisIslem = 0
            COMMIT TRANSACTION;
    END
    ELSE
    BEGIN
        IF @DisIslem = 0
            ROLLBACK TRANSACTION;
        ELSE
            ROLLBACK TRANSACTION YonetimOnizleme;
    END;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'KisiselVerileriAnonimlestir',
     @Metin = N'Ne yapar: KVKK silme isteğinde telefonla verilen kişinin kişisel verilerini tek işlemde anonimleştirir. (1) Telefonun bugünkü sahibi olan hesap ve başvuru verildiyse başvurunun bağlı olduğu hesap, birleşme zinciriyle birlikte musteri.HesabiAnonimlestir ile temizlenir (tasarim.md 1.13.5; zincir başına bir çağrı). (2) Aynı telefonla hesapsız açılmış talepler ve alt kayıtları (iletişim, adres, açıklama, notlar, iptal/kapanış/yeniden açma/ekleme metinleri, ziyaret metinleri, randevu iş tanımı, teklif notu, devir nedeni, fatura bilgisi, teslimat adresi, dekont ve ödeme notları, talebe bağlı bildirim metinleri, makinelerin kayıt olaylarındaki beyan adı, dosya adları), bu telefonu içeren numara değişikliği talepleri, hesapsız geri bildirimler ve notları, bu telefona ya da bu kayıtlara giden iletiler (bekleyenler vazgecildi olur), doğrulama kodlarındaki telefon temizlenir. (3) Başvuru verildiyse sonuclandi olur. İki sonuç kümesi: sonuç ve tablo başına etkilenen satır sayısı (Kaynak: hesap / hesapsiz). İşlem kaydı kisiselVeriAnonimlestirildi (başvuru KayitNo, hesap KayitNo''ları, tablo sayıları) ve her hesap için hesapAnonimlestirildi; telefon işlem kaydına yazılmaz. Kapılar: telefon geçersizse 51120; başvuru KayitNo yoksa 51102; başvuru sonuclandi ya da reddedildiyse 51113. Ne yapmaz: kvkk.RizaOlayi, denetim.IslemKaydi ve kvkk.BasvuruTalebi kalır (yasal kanıt); telefonun eski sahibi olan (telefon geçmişinde görünen) ya da kişiyi yalnız yetkili olarak taşıyan başka hesapları anonimleştirmez (gerekiyorsa o hesabın güncel telefonuyla ayrıca çalıştırın); dosyaları diskten silmez (genel sınıfta SilinmeIstendiZamani yazar, API siler); dekont dosyası saklama kuralını bekler. Geri alınamaz: önce @Uygula = 0 ile sayılara bakın. Örnek: EXEC yonetim.KisiselVerileriAnonimlestir @Telefon = N''0532 123 45 67'', @BasvuruKayitNo = 3, @Gerekce = N''KVKK 7. madde silme başvurusu, kimlik doğrulandı'', @YapanGirisAdi = N''ali.yilmaz'', @Uygula = 0;';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'KisiselVerileriAnonimlestir', @Alt = N'@Telefon', @AltTuru = N'PARAMETER',
     @Metin = N'Verileri silinecek kişinin telefonu, her yazımla; hesabı olmayan kişide de çalışır.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'KisiselVerileriAnonimlestir', @Alt = N'@BasvuruKayitNo', @AltTuru = N'PARAMETER',
     @Metin = N'İsteğe bağlı kvkk.BasvuruTalebi.KayitNo; verilirse başvuru alindi ya da isleniyor durumunda olmalı, sonunda sonuclandi olur ve başvurunun hesabı da anonimleştirilir.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'KisiselVerileriAnonimlestir', @Alt = N'@Gerekce', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemin nedeni; en az 10 karakter. İşlem kaydına yazılır; kişinin adını ya da telefonunu yazmayın.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'KisiselVerileriAnonimlestir', @Alt = N'@YapanGirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemi yapan personelin giriş adı; aktif personel olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'KisiselVerileriAnonimlestir', @Alt = N'@Uygula', @AltTuru = N'PARAMETER',
     @Metin = N'0 (varsayılan): önizleme, etkilenecek satır sayıları gösterilir ve hiçbir şey kaydedilmez. 1: uygulanır (geri alınamaz).';
GO

/* --------------------------------------------------------------------------
   15. yonetim.HakEdisOnayiniGeriAl
   Döküm taslakken bağı kaldırılan dökümün toplamları tasarim.md 1.9.5
   tanımıyla aynı işlemde yeniden hesaplanır.
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yonetim.HakEdisOnayiniGeriAl
    @TalepNumarasi nvarchar(400),
    @ZiyaretNo     tinyint,
    @Gerekce       nvarchar(500),
    @YapanGirisAdi nvarchar(40),
    @Uygula        bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @DisIslem bit = CASE WHEN @@TRANCOUNT > 0 THEN 1 ELSE 0 END;
    DECLARE @YapanKullaniciKimlik uniqueidentifier;
    DECLARE @YapanAdi nvarchar(150);
    DECLARE @YapanRolAdi nvarchar(100);
    DECLARE @Ayrinti nvarchar(max);

    DECLARE @TalepKimlik uniqueidentifier;
    DECLARE @TalepNo nvarchar(10);
    DECLARE @ZiyaretKimlik uniqueidentifier;
    DECLARE @HakEdisKimlik uniqueidentifier;
    DECLARE @HakEdisKayitNo bigint;
    DECLARE @HakEdisDurum nvarchar(40);
    DECLARE @NetTutar decimal(18,2);
    DECLARE @ParaBirimi nvarchar(3);
    DECLARE @HakEdisDokum uniqueidentifier;
    DECLARE @OncekiOnay nvarchar(max);
    DECLARE @HareketKimlik uniqueidentifier;
    DECLARE @HareketKayitNo bigint;
    DECLARE @HareketTutar decimal(18,2);
    DECLARE @HareketBelge uniqueidentifier;
    DECLARE @HareketDokum uniqueidentifier;
    DECLARE @TersYon nvarchar(40);
    DECLARE @TalepKapali bit;
    DECLARE @TalepDurum nvarchar(40);
    DECLARE @TalepMasa nvarchar(40);
    DECLARE @Ters TABLE (KayitNo bigint NOT NULL);
    DECLARE @Acma TABLE (KayitNo bigint NOT NULL);
    DECLARE @Dokum TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY);

    SET @Uygula = ISNULL(@Uygula, 0);
    SET @Gerekce = LTRIM(RTRIM(@Gerekce));
    IF LEN(ISNULL(@Gerekce, N'')) < 10
        THROW 51100, N'düzeltmenin gerekçesini en az 10 karakterle yazın', 1;

    SELECT @YapanKullaniciKimlik = k.Kimlik, @YapanAdi = p.AdSoyad, @YapanRolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@YapanGirisAdi) AS s)
      AND k.TurKodu = N'personel' AND k.Aktif = 1 AND p.AyrilmaZamani IS NULL;
    IF @YapanKullaniciKimlik IS NULL
        THROW 51101, N'işlemi yapan giriş adı aktif bir personele ait değil; işlemi yapan personelin aktif giriş adını verin', 1;

    SELECT @TalepKimlik = t.Kimlik, @TalepNo = t.Numara
    FROM talep.Talep AS t
    WHERE t.Numara = (SELECT s.Kod FROM yardim.Sadelestir(@TalepNumarasi) AS s);
    IF @TalepKimlik IS NULL
        THROW 51102, N'bu numarayla talep bulunamadı; verilen bilgileri kontrol edip yeniden çalıştırın', 1;

    SELECT @ZiyaretKimlik = z.Kimlik
    FROM talep.ServisZiyareti AS z
    WHERE z.TalepKimlik = @TalepKimlik AND z.ZiyaretNo = @ZiyaretNo;
    IF @ZiyaretKimlik IS NULL
        THROW 51102, N'talepte bu numarada ziyaret yok; talep ve ziyaret numaralarını kontrol edin', 1;

    SELECT @HakEdisKimlik = h.Kimlik, @HakEdisKayitNo = h.KayitNo
    FROM hakedis.HakEdis AS h
    WHERE h.ZiyaretKimlik = @ZiyaretKimlik;
    IF @HakEdisKimlik IS NULL
        THROW 51102, N'bu ziyaretin hak edişi yok; ziyaret numarasını ve hak ediş kayıtlarını kontrol edin', 1;

    IF @DisIslem = 0
        BEGIN TRANSACTION;
    ELSE
        SAVE TRANSACTION YonetimOnizleme;

    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @YapanKullaniciKimlik,
         @YapanHesapKimlik = NULL, @YapanAdi = @YapanAdi, @KaynakUygulamaKodu = N'yonetim',
         @UygulamaSurumu = NULL, @MusteriyeBildirildi = 0;

    SELECT @HakEdisDurum = h.DurumKodu, @NetTutar = h.NetTutar, @ParaBirimi = h.ParaBirimiKodu, @HakEdisDokum = h.DonemDokumuKimlik,
           @OncekiOnay = (SELECT h.DurumKodu AS durumKodu, h.OnayZamani AS onayZamani, h.OnaylayanAdi AS onaylayanAdi,
                                 h.KdvOrani AS kdvOrani, h.KdvTutari AS kdvTutari, h.TevkifatOrani AS tevkifatOrani,
                                 h.TevkifatTutari AS tevkifatTutari, h.StopajOrani AS stopajOrani, h.StopajTutari AS stopajTutari,
                                 h.RedZamani AS redZamani, h.RedEdenAdi AS redEdenAdi, h.RedNedeni AS redNedeni,
                                 dd.Numara AS donemDokumuNumarasi
                          FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)
    FROM hakedis.HakEdis AS h WITH (UPDLOCK, HOLDLOCK)
    LEFT JOIN hakedis.DonemDokumu AS dd ON dd.Kimlik = h.DonemDokumuKimlik
    WHERE h.Kimlik = @HakEdisKimlik;

    IF @HakEdisDurum <> N'onaylandi'
        THROW 51142, N'hak ediş onaylı değil; geri alınacak onay yok. Hak edişin durumunu kontrol edin', 1;
    IF @HakEdisDokum IS NOT NULL
       AND EXISTS (SELECT 1 FROM hakedis.DonemDokumu AS d WITH (UPDLOCK, HOLDLOCK)
                   WHERE d.Kimlik = @HakEdisDokum AND d.DurumKodu <> N'taslak')
        THROW 51140, N'hak ediş kesinleşmiş bir döneme bağlı; taslak olmayan dökümden geri alınamaz. Düzeltme için muhasebe sorumlusuna başvurun', 1;

    SELECT @HareketKimlik = a.Kimlik, @HareketKayitNo = a.KayitNo, @HareketTutar = a.Tutar,
           @HareketBelge = a.BelgeBagiKimlik, @HareketDokum = a.DonemDokumuKimlik
    FROM hakedis.ServisHesapHareketi AS a WITH (UPDLOCK, HOLDLOCK)
    WHERE a.HakEdisKimlik = @HakEdisKimlik AND a.HareketTuruKodu = N'hakEdisAlacagi' AND a.GeriAlinmaZamani IS NULL;

    IF @HareketKimlik IS NULL
       AND EXISTS (SELECT 1 FROM hakedis.ServisHesapHareketi AS a
                   WHERE a.HakEdisKimlik = @HakEdisKimlik AND a.HareketTuruKodu = N'hakEdisAlacagi' AND a.GeriAlinmaZamani IS NOT NULL)
        THROW 51141, N'hak edişin alacak hareketi zaten geri alınmış; hesap hareketlerini kontrol edin', 1;
    IF @HareketBelge IS NOT NULL
        THROW 51140, N'hak edişin alacak hareketi bir LOGO belgesine bağlı; geri alınamaz. Düzeltme için muhasebe sorumlusuna başvurun', 1;
    IF @HareketDokum IS NOT NULL
       AND EXISTS (SELECT 1 FROM hakedis.DonemDokumu AS d WITH (UPDLOCK, HOLDLOCK)
                   WHERE d.Kimlik = @HareketDokum AND d.DurumKodu <> N'taslak')
        THROW 51140, N'alacak hareketi kesinleşmiş bir döneme bağlı; taslak olmayan dökümden geri alınamaz. Düzeltme için muhasebe sorumlusuna başvurun', 1;

    INSERT @Dokum (Kimlik)
    SELECT x.Kimlik FROM (VALUES (@HakEdisDokum), (@HareketDokum)) AS x (Kimlik)
    WHERE x.Kimlik IS NOT NULL
    GROUP BY x.Kimlik;

    /* Ters hareket: asıl silinmez, tutarı değişmez; ters satır döküme bağlanmaz. */
    IF @HareketKimlik IS NOT NULL
    BEGIN
        SELECT @TersYon = k.YonKodu FROM kod.HesapHareketTuru AS k WHERE k.Kod = N'duzeltmeBorc';

        INSERT hakedis.ServisHesapHareketi
            (Tutar, Aciklama, HareketZamani, ServisKimlik, SirketKodu, MarkaKodu, HareketTuruKodu, YonKodu, ParaBirimiKodu,
             HakEdisKimlik, ParcaTalepKimlik, DuzeltilenHareketKimlik, DonemDokumuKimlik, BelgeBagiKimlik, GeriAlinmaZamani,
             YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, KaynakUygulamaKodu, UygulamaSurumu, OlusmaZamani)
        OUTPUT inserted.KayitNo INTO @Ters (KayitNo)
        SELECT a.Tutar, N'hak ediş onayı geri alındı', @Simdi, a.ServisKimlik, a.SirketKodu, a.MarkaKodu,
               N'duzeltmeBorc', @TersYon, a.ParaBirimiKodu,
               a.HakEdisKimlik, NULL, a.Kimlik, NULL, NULL, NULL,
               N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, N'yonetim', NULL, @Simdi
        FROM hakedis.ServisHesapHareketi AS a
        WHERE a.Kimlik = @HareketKimlik;

        UPDATE hakedis.ServisHesapHareketi
        SET GeriAlinmaZamani = @Simdi,
            DonemDokumuKimlik = NULL
        WHERE Kimlik = @HareketKimlik;
    END;

    UPDATE hakedis.HakEdis
    SET DurumKodu = N'bekliyor',
        OnayZamani = NULL, OnaylayanKullaniciKimlik = NULL, OnaylayanAdi = NULL,
        KdvOrani = NULL, KdvTutari = NULL,
        TevkifatOrani = NULL, TevkifatTutari = NULL,
        StopajOrani = NULL, StopajTutari = NULL,
        RedZamani = NULL, RedEdenKullaniciKimlik = NULL, RedEdenAdi = NULL, RedNedeni = NULL,
        DonemDokumuKimlik = NULL
    WHERE Kimlik = @HakEdisKimlik;

    /* Taslak dökümün toplamları (tasarim.md 1.9.5) */
    UPDATE d
    SET NetToplam = x.NetToplam,
        KdvToplam = x.KdvToplam,
        TevkifatToplam = x.TevkifatToplam,
        StopajToplam = x.StopajToplam,
        MahsupToplam = y.MahsupToplam,
        OdenecekTutar = x.NetToplam + x.KdvToplam - x.TevkifatToplam - x.StopajToplam - y.MahsupToplam
    FROM hakedis.DonemDokumu AS d
    CROSS APPLY (SELECT ISNULL(SUM(h.NetTutar), 0) AS NetToplam,
                        ISNULL(SUM(h.KdvTutari), 0) AS KdvToplam,
                        ISNULL(SUM(h.TevkifatTutari), 0) AS TevkifatToplam,
                        ISNULL(SUM(h.StopajTutari), 0) AS StopajToplam
                 FROM hakedis.HakEdis AS h
                 WHERE h.DonemDokumuKimlik = d.Kimlik AND h.DurumKodu = N'onaylandi') AS x
    CROSS APPLY (SELECT ISNULL(SUM(r.Tutar), 0) AS MahsupToplam
                 FROM hakedis.ServisHesapHareketi AS r
                 WHERE r.DonemDokumuKimlik = d.Kimlik AND r.YonKodu = N'borc' AND r.HareketTuruKodu <> N'odeme') AS y
    WHERE d.Kimlik IN (SELECT k.Kimlik FROM @Dokum AS k) AND d.DurumKodu = N'taslak';

    SELECT @TalepKapali = t.Kapali, @TalepDurum = t.DurumKodu, @TalepMasa = t.MasaKodu
    FROM talep.Talep AS t WITH (UPDLOCK, HOLDLOCK)
    WHERE t.Kimlik = @TalepKimlik;

    IF @TalepKapali = 1
    BEGIN
        INSERT talep.YenidenAcma
            (TalepKimlik, OncekiDurumKodu, Aciklama, MusteriyeBildirilmedi, OlusmaZamani,
             YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, KaynakUygulamaKodu, UygulamaSurumu)
        OUTPUT inserted.KayitNo INTO @Acma (KayitNo)
        VALUES
            (@TalepKimlik, @TalepDurum, @Gerekce, 1, @Simdi,
             N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, N'yonetim', NULL);

        UPDATE talep.Talep
        SET DurumKodu = N'onayBekliyor',
            Kapali = 0,
            KapanmaZamani = NULL,
            MasaKodu = N'servisMasasi',
            GuncellemeZamani = @Simdi
        WHERE Kimlik = @TalepKimlik;
    END
    ELSE
        UPDATE talep.Talep
        SET DurumKodu = N'onayBekliyor',
            MasaKodu = N'servisMasasi',
            GuncellemeZamani = @Simdi
        WHERE Kimlik = @TalepKimlik;

    SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                           @ZiyaretNo AS ziyaretNo, @HakEdisKayitNo AS hakEdisKayitNo,
                           @HareketKayitNo AS geriAlinanHareketKayitNo,
                           (SELECT TOP (1) t.KayitNo FROM @Ters AS t) AS tersHareketKayitNo,
                           @HareketTutar AS tersHareketTutari,
                           JSON_QUERY((SELECT JSON_QUERY(@OncekiOnay) AS hakEdis, @TalepDurum AS talepDurumKodu, @TalepMasa AS talepMasaKodu,
                                              @TalepKapali AS talepKapali
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS onceki,
                           JSON_QUERY((SELECT N'bekliyor' AS hakEdisDurumKodu, N'onayBekliyor' AS talepDurumKodu, N'servisMasasi' AS talepMasaKodu,
                                              CAST(0 AS bit) AS talepKapali,
                                              (SELECT TOP (1) a.KayitNo FROM @Acma AS a) AS yenidenAcmaKayitNo
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS sonraki
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    VALUES
        (N'hakEdisOnayiGeriAlindi', N'hakEdis', @HakEdisKimlik, @TalepNo, @Ayrinti, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);

    SELECT N'Sonuç' AS Bolum,
           @Uygula AS Uygulandi,
           CASE WHEN @Uygula = 1
                THEN N'hak ediş onayı geri alındı; hak ediş onay bekliyor, talep servis masasında'
                ELSE N'önizleme; hiçbir şey kaydedilmedi. Sonucu kontrol edin; değişiklikleri kaydetmek için @Uygula = 1 ile yeniden çalıştırın' END AS Mesaj,
           LEFT(@TalepNo, 3) + N'-' + SUBSTRING(@TalepNo, 4, 2) + N'-' + RIGHT(@TalepNo, 5) AS TalepNumarasi,
           @ZiyaretNo AS ZiyaretNo,
           @HakEdisKayitNo AS HakEdisKayitNo,
           @NetTutar AS NetTutar,
           @ParaBirimi AS ParaBirimiKodu,
           N'onaylandi' AS OncekiHakEdisDurumKodu,
           N'bekliyor' AS YeniHakEdisDurumKodu,
           @HareketKayitNo AS GeriAlinanHareketKayitNo,
           (SELECT TOP (1) t.KayitNo FROM @Ters AS t) AS TersHareketKayitNo,
           @HareketTutar AS TersHareketTutari,
           (SELECT STRING_AGG(CAST(LEFT(d.Numara, 3) + N'-' + SUBSTRING(d.Numara, 4, 2) + N'-' + RIGHT(d.Numara, 5) AS nvarchar(max)), N', ')
            FROM hakedis.DonemDokumu AS d WHERE d.Kimlik IN (SELECT k.Kimlik FROM @Dokum AS k)) AS CikarildigiDokumNumarasi,
           @TalepDurum AS OncekiTalepDurumKodu,
           N'onayBekliyor' AS YeniTalepDurumKodu,
           CAST(CASE WHEN @TalepKapali = 1 THEN 1 ELSE 0 END AS bit) AS TalepYenidenAcildi;

    IF @Uygula = 1
    BEGIN
        IF @DisIslem = 0
            COMMIT TRANSACTION;
    END
    ELSE
    BEGIN
        IF @DisIslem = 0
            ROLLBACK TRANSACTION;
        ELSE
            ROLLBACK TRANSACTION YonetimOnizleme;
    END;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'HakEdisOnayiniGeriAl',
     @Metin = N'Ne yapar: yanlışlıkla onaylanan hak edişin onayını geri alır: hak edişin etkin alacak hareketine ters hareket (duzeltmeBorc, aynı tutar, DuzeltilenHareketKimlik; döküme bağlanmaz) yazılır ve asıl harekete GeriAlinmaZamani yazılıp döküm bağı kaldırılır; hak ediş bekliyor durumuna döner (onay, oran, vergi tutarı ve ret kolonları boşalır, döküm bağı kalkar; önceki değerler işlem kaydında); bağlı taslak dökümün toplamları yeniden hesaplanır; talep kapalıysa talep.YenidenAcma (MusteriyeBildirilmedi = 1) yazılıp talep açılır; talep onayBekliyor durumuna ve servis masasına geçer. Aynı hak ediş sonra API''den yeniden onaylanabilir (yeni alacak hareketiyle). İşlem kaydı hakEdisOnayiGeriAlindi. Kapılar: talep, ziyaret ya da hak ediş yoksa 51102; hak ediş onaylı değilse 51142; hak edişin ya da alacak hareketinin dökümü taslak değilse ya da hareket LOGO belgesine bağlıysa 51140; alacak hareketi zaten geri alınmışsa 51141. Ne yapmaz: kalemleri ve NetTutar''ı değiştirmez (hakedis.HakEdisHesapla/HakEdisKalemiYaz), LOGO''ya belge yazmaz, servise ya da müşteriye bildirim göndermez. Örnek: EXEC yonetim.HakEdisOnayiniGeriAl @TalepNumarasi = N''SRV-26-00123'', @ZiyaretNo = 1, @Gerekce = N''Km yanlış girilmişti, düzeltilip yeniden onaylanacak'', @YapanGirisAdi = N''ali.yilmaz'', @Uygula = 0;';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'HakEdisOnayiniGeriAl', @Alt = N'@TalepNumarasi', @AltTuru = N'PARAMETER',
     @Metin = N'Hak edişin talebinin numarası, her yazımla.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'HakEdisOnayiniGeriAl', @Alt = N'@ZiyaretNo', @AltTuru = N'PARAMETER',
     @Metin = N'Hak edişin ziyaret sıra numarası (1, 2 …; yardim.HakEdisGoster 1. küme).';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'HakEdisOnayiniGeriAl', @Alt = N'@Gerekce', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemin nedeni; en az 10 karakter. İşlem kaydına ve talep yeniden açılırsa yeniden açma açıklamasına yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'HakEdisOnayiniGeriAl', @Alt = N'@YapanGirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemi yapan personelin giriş adı; aktif personel olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'HakEdisOnayiniGeriAl', @Alt = N'@Uygula', @AltTuru = N'PARAMETER',
     @Metin = N'0 (varsayılan): önizleme, hiçbir şey kaydedilmez. 1: uygulanır.';
GO

/* --------------------------------------------------------------------------
   16. yonetim.HesapHareketiniDuzelt
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yonetim.HesapHareketiniDuzelt
    @HareketKayitNo bigint,
    @DogruTutar     decimal(18,2) = NULL,
    @Gerekce        nvarchar(500),
    @YapanGirisAdi  nvarchar(40),
    @Uygula         bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @DisIslem bit = CASE WHEN @@TRANCOUNT > 0 THEN 1 ELSE 0 END;
    DECLARE @YapanKullaniciKimlik uniqueidentifier;
    DECLARE @YapanAdi nvarchar(150);
    DECLARE @YapanRolAdi nvarchar(100);
    DECLARE @Ayrinti nvarchar(max);

    DECLARE @HareketKimlik uniqueidentifier;
    DECLARE @Tur nvarchar(40);
    DECLARE @Yon nvarchar(40);
    DECLARE @Tutar decimal(18,2);
    DECLARE @ServisKimlik uniqueidentifier;
    DECLARE @SirketKodu nvarchar(20);
    DECLARE @ParaBirimi nvarchar(3);
    DECLARE @HakEdisKimlik uniqueidentifier;
    DECLARE @ParcaTalepKimlik uniqueidentifier;
    DECLARE @Duzeltilen uniqueidentifier;
    DECLARE @Dokum uniqueidentifier;
    DECLARE @Belge uniqueidentifier;
    DECLARE @GeriAlinma datetime2(3);
    DECLARE @TersTur nvarchar(40);
    DECLARE @TersYon nvarchar(40);
    DECLARE @TalepNo nvarchar(10);
    DECLARE @DokumNo nvarchar(10);
    DECLARE @Ters TABLE (KayitNo bigint NOT NULL);
    DECLARE @Yeni TABLE (KayitNo bigint NOT NULL);

    SET @Uygula = ISNULL(@Uygula, 0);
    SET @Gerekce = LTRIM(RTRIM(@Gerekce));
    IF LEN(ISNULL(@Gerekce, N'')) < 10
        THROW 51100, N'düzeltmenin gerekçesini en az 10 karakterle yazın', 1;

    SELECT @YapanKullaniciKimlik = k.Kimlik, @YapanAdi = p.AdSoyad, @YapanRolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@YapanGirisAdi) AS s)
      AND k.TurKodu = N'personel' AND k.Aktif = 1 AND p.AyrilmaZamani IS NULL;
    IF @YapanKullaniciKimlik IS NULL
        THROW 51101, N'işlemi yapan giriş adı aktif bir personele ait değil; işlemi yapan personelin aktif giriş adını verin', 1;

    SELECT @HareketKimlik = a.Kimlik
    FROM hakedis.ServisHesapHareketi AS a
    WHERE a.KayitNo = @HareketKayitNo;
    IF @HareketKimlik IS NULL
        THROW 51102, N'bu KayitNo ile hesap hareketi bulunamadı; gorunum.ServisHesapHareketleri ile bakın', 1;

    IF @DisIslem = 0
        BEGIN TRANSACTION;
    ELSE
        SAVE TRANSACTION YonetimOnizleme;

    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @YapanKullaniciKimlik,
         @YapanHesapKimlik = NULL, @YapanAdi = @YapanAdi, @KaynakUygulamaKodu = N'yonetim',
         @UygulamaSurumu = NULL, @MusteriyeBildirildi = 0;

    SELECT @Tur = a.HareketTuruKodu, @Yon = a.YonKodu, @Tutar = a.Tutar, @ServisKimlik = a.ServisKimlik,
           @SirketKodu = a.SirketKodu, @ParaBirimi = a.ParaBirimiKodu, @HakEdisKimlik = a.HakEdisKimlik,
           @ParcaTalepKimlik = a.ParcaTalepKimlik, @Duzeltilen = a.DuzeltilenHareketKimlik,
           @Dokum = a.DonemDokumuKimlik, @Belge = a.BelgeBagiKimlik, @GeriAlinma = a.GeriAlinmaZamani
    FROM hakedis.ServisHesapHareketi AS a WITH (UPDLOCK, HOLDLOCK)
    WHERE a.Kimlik = @HareketKimlik;

    IF @Duzeltilen IS NOT NULL OR @Tur IN (N'duzeltmeBorc', N'duzeltmeAlacak')
        THROW 51141, N'bu bir ters (düzeltme) hareketi; düzeltilemez. Asıl hareketi ve düzeltme kayıtlarını kontrol edin', 1;
    IF @GeriAlinma IS NOT NULL
        THROW 51141, N'hareket zaten geri alınmış; hesap hareketlerini kontrol edin', 1;
    IF @Belge IS NOT NULL
        THROW 51140, N'hareket bir LOGO belgesine bağlı; düzeltilemez. Düzeltme için muhasebe sorumlusuna başvurun', 1;
    IF @Dokum IS NOT NULL
       AND EXISTS (SELECT 1 FROM hakedis.DonemDokumu AS d WITH (UPDLOCK, HOLDLOCK)
                   WHERE d.Kimlik = @Dokum AND d.DurumKodu <> N'taslak')
        THROW 51140, N'hareket kesinleşmiş bir döneme bağlı; taslak olmayan dökümden düzeltilemez. Düzeltme için muhasebe sorumlusuna başvurun', 1;
    IF @DogruTutar IS NOT NULL AND @Tur IN (N'hakEdisAlacagi', N'parcaSiparisiBorcu')
        THROW 51143, N'hak ediş ve parça siparişi hareketinin tutarı kaynağından gelir; yalnız geri alınabilir. Hak ediş için yonetim.HakEdisOnayiniGeriAl kullanın; parça siparişi için kaynak kaydı kontrol edin', 1;
    IF @DogruTutar IS NOT NULL AND @DogruTutar <= 0
        THROW 51143, N'doğru tutar sıfırdan büyük olmalı; hareketi yalnız geri almak için @DogruTutar vermeyin', 1;
    IF @DogruTutar IS NOT NULL AND @DogruTutar = @Tutar
        THROW 51113, N'doğru tutar hareketin mevcut tutarıyla aynı; tutarları kontrol edin, aynı tutar için yeniden işlem yapmayın', 1;

    SELECT TOP (1) @TersTur = k.Kod, @TersYon = k.YonKodu
    FROM kod.HesapHareketTuru AS k
    WHERE k.Kod IN (N'duzeltmeBorc', N'duzeltmeAlacak') AND k.YonKodu <> @Yon
    ORDER BY k.Kod;
    IF @TersTur IS NULL
        THROW 51102, N'ters hareket türü kod listesinde yok (kod.HesapHareketTuru); kod listesinin kontrolü için veritabanı sorumlusuna başvurun', 1;

    INSERT hakedis.ServisHesapHareketi
        (Tutar, Aciklama, HareketZamani, ServisKimlik, SirketKodu, MarkaKodu, HareketTuruKodu, YonKodu, ParaBirimiKodu,
         HakEdisKimlik, ParcaTalepKimlik, DuzeltilenHareketKimlik, DonemDokumuKimlik, BelgeBagiKimlik, GeriAlinmaZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, KaynakUygulamaKodu, UygulamaSurumu, OlusmaZamani)
    OUTPUT inserted.KayitNo INTO @Ters (KayitNo)
    SELECT a.Tutar, N'hatalı hareket geri alındı', @Simdi, a.ServisKimlik, a.SirketKodu, a.MarkaKodu,
           @TersTur, @TersYon, a.ParaBirimiKodu,
           a.HakEdisKimlik, a.ParcaTalepKimlik, a.Kimlik, NULL, NULL, NULL,
           N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, N'yonetim', NULL, @Simdi
    FROM hakedis.ServisHesapHareketi AS a
    WHERE a.Kimlik = @HareketKimlik;

    UPDATE hakedis.ServisHesapHareketi
    SET GeriAlinmaZamani = @Simdi,
        DonemDokumuKimlik = NULL
    WHERE Kimlik = @HareketKimlik;

    /* Doğru tutarla yeni satır: asılla aynı tür, servis, şirket, marka, para birimi, zaman ve bağlar (döküm ve belge bağı hariç). */
    IF @DogruTutar IS NOT NULL
        INSERT hakedis.ServisHesapHareketi
            (Tutar, Aciklama, HareketZamani, ServisKimlik, SirketKodu, MarkaKodu, HareketTuruKodu, YonKodu, ParaBirimiKodu,
             HakEdisKimlik, ParcaTalepKimlik, DuzeltilenHareketKimlik, DonemDokumuKimlik, BelgeBagiKimlik, GeriAlinmaZamani,
             YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, KaynakUygulamaKodu, UygulamaSurumu, OlusmaZamani)
        OUTPUT inserted.KayitNo INTO @Yeni (KayitNo)
        SELECT @DogruTutar, a.Aciklama, a.HareketZamani, a.ServisKimlik, a.SirketKodu, a.MarkaKodu,
               a.HareketTuruKodu, a.YonKodu, a.ParaBirimiKodu,
               a.HakEdisKimlik, a.ParcaTalepKimlik, NULL, NULL, NULL, NULL,
               N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, N'yonetim', NULL, @Simdi
        FROM hakedis.ServisHesapHareketi AS a
        WHERE a.Kimlik = @HareketKimlik;

    /* Taslak dökümün toplamları (tasarim.md 1.9.5) */
    IF @Dokum IS NOT NULL
        UPDATE d
        SET NetToplam = x.NetToplam,
            KdvToplam = x.KdvToplam,
            TevkifatToplam = x.TevkifatToplam,
            StopajToplam = x.StopajToplam,
            MahsupToplam = y.MahsupToplam,
            OdenecekTutar = x.NetToplam + x.KdvToplam - x.TevkifatToplam - x.StopajToplam - y.MahsupToplam
        FROM hakedis.DonemDokumu AS d
        CROSS APPLY (SELECT ISNULL(SUM(h.NetTutar), 0) AS NetToplam,
                            ISNULL(SUM(h.KdvTutari), 0) AS KdvToplam,
                            ISNULL(SUM(h.TevkifatTutari), 0) AS TevkifatToplam,
                            ISNULL(SUM(h.StopajTutari), 0) AS StopajToplam
                     FROM hakedis.HakEdis AS h
                     WHERE h.DonemDokumuKimlik = d.Kimlik AND h.DurumKodu = N'onaylandi') AS x
        CROSS APPLY (SELECT ISNULL(SUM(r.Tutar), 0) AS MahsupToplam
                     FROM hakedis.ServisHesapHareketi AS r
                     WHERE r.DonemDokumuKimlik = d.Kimlik AND r.YonKodu = N'borc' AND r.HareketTuruKodu <> N'odeme') AS y
        WHERE d.Kimlik = @Dokum AND d.DurumKodu = N'taslak';

    SELECT @TalepNo = COALESCE(ht.Numara, pt.Numara)
    FROM (SELECT 1 AS x) AS bir
    LEFT JOIN hakedis.HakEdis AS h ON h.Kimlik = @HakEdisKimlik
    LEFT JOIN talep.Talep AS ht ON ht.Kimlik = h.TalepKimlik
    LEFT JOIN talep.Talep AS pt ON pt.Kimlik = @ParcaTalepKimlik;

    SELECT @DokumNo = d.Numara FROM hakedis.DonemDokumu AS d WHERE d.Kimlik = @Dokum;

    SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                           @HareketKayitNo AS hareketKayitNo, @Tur AS hareketTuruKodu,
                           (SELECT TOP (1) t.KayitNo FROM @Ters AS t) AS tersHareketKayitNo, @TersTur AS tersHareketTuruKodu,
                           (SELECT TOP (1) n.KayitNo FROM @Yeni AS n) AS yeniHareketKayitNo,
                           @DokumNo AS cikarildigiDokumNumarasi,
                           JSON_QUERY((SELECT @Tutar AS tutar, @Yon AS yonKodu, CAST(0 AS bit) AS geriAlindi
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS onceki,
                           JSON_QUERY((SELECT @DogruTutar AS tutar, CAST(1 AS bit) AS asilGeriAlindi
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS sonraki
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    VALUES
        (N'hesapHareketiDuzeltildi', N'servis', @ServisKimlik, @TalepNo, @Ayrinti, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);

    SELECT N'Sonuç' AS Bolum,
           @Uygula AS Uygulandi,
           CASE WHEN @Uygula = 1
                THEN N'hareket geri alındı; doğru tutar verildiyse yeni hareket yazıldı'
                ELSE N'önizleme; hiçbir şey kaydedilmedi. Sonucu kontrol edin; değişiklikleri kaydetmek için @Uygula = 1 ile yeniden çalıştırın' END AS Mesaj,
           @HareketKayitNo AS HareketKayitNo,
           @Tur AS HareketTuruKodu,
           (SELECT k.Ad FROM kod.HesapHareketTuru AS k WHERE k.Kod = @Tur) AS HareketTuruAdi,
           @Yon AS YonKodu,
           s.Ad AS ServisAdi,
           s.KayitNo AS ServisKayitNo,
           @SirketKodu AS SirketKodu,
           @ParaBirimi AS ParaBirimiKodu,
           @Tutar AS AsilTutar,
           (SELECT TOP (1) t.KayitNo FROM @Ters AS t) AS TersHareketKayitNo,
           @TersTur AS TersHareketTuruKodu,
           (SELECT TOP (1) n.KayitNo FROM @Yeni AS n) AS YeniHareketKayitNo,
           @DogruTutar AS YeniTutar,
           CASE WHEN @TalepNo IS NOT NULL
                THEN LEFT(@TalepNo, 3) + N'-' + SUBSTRING(@TalepNo, 4, 2) + N'-' + RIGHT(@TalepNo, 5) END AS TalepNumarasi,
           CASE WHEN @DokumNo IS NOT NULL
                THEN LEFT(@DokumNo, 3) + N'-' + SUBSTRING(@DokumNo, 4, 2) + N'-' + RIGHT(@DokumNo, 5) END AS CikarildigiDokumNumarasi
    FROM servis.Servis AS s
    WHERE s.Kimlik = @ServisKimlik;

    IF @Uygula = 1
    BEGIN
        IF @DisIslem = 0
            COMMIT TRANSACTION;
    END
    ELSE
    BEGIN
        IF @DisIslem = 0
            ROLLBACK TRANSACTION;
        ELSE
            ROLLBACK TRANSACTION YonetimOnizleme;
    END;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'HesapHareketiniDuzelt',
     @Metin = N'Ne yapar: servise yanlış yazılmış bir hesap hareketini ters hareketle geri alır: asıl alacaksa duzeltmeBorc, borçsa duzeltmeAlacak türünde aynı tutarlı ters satır (DuzeltilenHareketKimlik; döküme bağlanmaz), asıl satıra GeriAlinmaZamani yazılır ve döküm bağı kaldırılır (asıl silinmez, tutarı değişmez). @DogruTutar verilirse aynı işlemde asılla aynı tür, servis, şirket, marka, para birimi, hareket zamanı ve bağlarla (döküm ve belge bağı hariç) doğru tutarlı yeni satır yazılır. Bağlı taslak dökümün toplamları yeniden hesaplanır. İşlem kaydı hesapHareketiDuzeltildi (ilgili kayıt servis). Kapılar: hareket yoksa 51102; hareket ters hareketse ya da zaten geri alınmışsa 51141; LOGO belgesine ya da taslak olmayan döküme bağlıysa 51140 (ödeme hareketleri belgeye bağlı olduğundan düzeltilemez); hak ediş alacağında ya da parça siparişi borcunda @DogruTutar verilirse ya da doğru tutar sıfır veya eksiyse 51143; doğru tutar bugünkü tutarla aynıysa 51113. Ne yapmaz: hak edişin onayını geri almaz (yonetim.HakEdisOnayiniGeriAl), LOGO''ya belge yazmaz. Örnek: EXEC yonetim.HesapHareketiniDuzelt @HareketKayitNo = 812, @DogruTutar = NULL, @Gerekce = N''Aynı sipariş iki kez borç yazılmış'', @YapanGirisAdi = N''ali.yilmaz'', @Uygula = 0;';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'HesapHareketiniDuzelt', @Alt = N'@HareketKayitNo', @AltTuru = N'PARAMETER',
     @Metin = N'hakedis.ServisHesapHareketi.KayitNo (gorunum.ServisHesapHareketleri.KayitNo).';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'HesapHareketiniDuzelt', @Alt = N'@DogruTutar', @AltTuru = N'PARAMETER',
     @Metin = N'İsteğe bağlı doğru tutar (sıfırdan büyük, işaretsiz; yön asılla aynı). Boşsa hareket yalnız geri alınır. Hak ediş alacağı ve parça siparişi borcunda verilemez.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'HesapHareketiniDuzelt', @Alt = N'@Gerekce', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemin nedeni; en az 10 karakter. İşlem kaydına yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'HesapHareketiniDuzelt', @Alt = N'@YapanGirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemi yapan personelin giriş adı; aktif personel olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'HesapHareketiniDuzelt', @Alt = N'@Uygula', @AltTuru = N'PARAMETER',
     @Metin = N'0 (varsayılan): önizleme, hiçbir şey kaydedilmez. 1: uygulanır.';
GO

/* --------------------------------------------------------------------------
   17. yonetim.HesaplariBirlestir
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yonetim.HesaplariBirlestir
    @KalacakTelefon    nvarchar(400),
    @BirlesecekTelefon nvarchar(400),
    @Gerekce           nvarchar(500),
    @YapanGirisAdi     nvarchar(40),
    @Uygula            bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @DisIslem bit = CASE WHEN @@TRANCOUNT > 0 THEN 1 ELSE 0 END;
    DECLARE @YapanKullaniciKimlik uniqueidentifier;
    DECLARE @YapanAdi nvarchar(150);
    DECLARE @YapanRolAdi nvarchar(100);
    DECLARE @Ayrinti nvarchar(max);

    DECLARE @KalacakTel nvarchar(16);
    DECLARE @BirlesecekTel nvarchar(16);
    DECLARE @Kalacak uniqueidentifier;
    DECLARE @KalacakKayitNo bigint;
    DECLARE @Birlesecek uniqueidentifier;
    DECLARE @BirlesecekKayitNo bigint;
    DECLARE @KalacakDurum nvarchar(40);
    DECLARE @BirlesecekDurum nvarchar(40);
    DECLARE @KalacakTelSimdi nvarchar(16);
    DECLARE @BirlesecekTelSimdi nvarchar(16);
    DECLARE @BirlesecekOlusma datetime2(3);
    DECLARE @TasinanTalep int = 0;
    DECLARE @BitenSahiplik int = 0;
    DECLARE @AcilanSahiplik int = 0;
    DECLARE @TasinanCihaz int = 0;
    DECLARE @TasinanKisi int = 0;
    DECLARE @KopyalananGizleme int = 0;
    DECLARE @KapatilanOturum int = 0;
    DECLARE @BitenSahiplikler TABLE (KayitNo bigint NOT NULL, MakineKimlik uniqueidentifier NOT NULL, TakmaAd nvarchar(30) COLLATE DATABASE_DEFAULT NULL);

    SET @Uygula = ISNULL(@Uygula, 0);
    SET @Gerekce = LTRIM(RTRIM(@Gerekce));
    IF LEN(ISNULL(@Gerekce, N'')) < 10
        THROW 51100, N'düzeltmenin gerekçesini en az 10 karakterle yazın', 1;

    SELECT @YapanKullaniciKimlik = k.Kimlik, @YapanAdi = p.AdSoyad, @YapanRolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@YapanGirisAdi) AS s)
      AND k.TurKodu = N'personel' AND k.Aktif = 1 AND p.AyrilmaZamani IS NULL;
    IF @YapanKullaniciKimlik IS NULL
        THROW 51101, N'işlemi yapan giriş adı aktif bir personele ait değil; işlemi yapan personelin aktif giriş adını verin', 1;

    SELECT @KalacakTel = s.TelefonE164 FROM yardim.Sadelestir(@KalacakTelefon) AS s;
    SELECT @BirlesecekTel = s.TelefonE164 FROM yardim.Sadelestir(@BirlesecekTelefon) AS s;
    IF @KalacakTel IS NULL OR @BirlesecekTel IS NULL
        THROW 51120, N'telefon numaralarından biri geçersiz; numaraları kontrol edip geçerli biçimde verin', 1;
    IF @KalacakTel = @BirlesecekTel
        THROW 51122, N'iki telefon aynı; aynı hesap kendisiyle birleştirilemez. Birleştirilecek iki farklı hesabın güncel telefonlarını verin', 1;

    SELECT @Kalacak = h.Kimlik, @KalacakKayitNo = h.KayitNo FROM musteri.Hesap AS h WHERE h.TelefonE164 = @KalacakTel;
    IF @Kalacak IS NULL
        THROW 51102, N'kalacak telefon hiçbir hesabın güncel telefonu değil; kalacak hesabın güncel telefonunu kontrol edip verin', 1;
    SELECT @Birlesecek = h.Kimlik, @BirlesecekKayitNo = h.KayitNo FROM musteri.Hesap AS h WHERE h.TelefonE164 = @BirlesecekTel;
    IF @Birlesecek IS NULL
        THROW 51102, N'birleşecek telefon hiçbir hesabın güncel telefonu değil; birleşecek hesabın güncel telefonunu kontrol edip verin', 1;

    IF @DisIslem = 0
        BEGIN TRANSACTION;
    ELSE
        SAVE TRANSACTION YonetimOnizleme;

    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @YapanKullaniciKimlik,
         @YapanHesapKimlik = NULL, @YapanAdi = @YapanAdi, @KaynakUygulamaKodu = N'yonetim',
         @UygulamaSurumu = NULL, @MusteriyeBildirildi = 0;

    SELECT @KalacakDurum = h.DurumKodu, @KalacakTelSimdi = h.TelefonE164
    FROM musteri.Hesap AS h WITH (UPDLOCK, HOLDLOCK)
    WHERE h.Kimlik = @Kalacak;

    SELECT @BirlesecekDurum = h.DurumKodu, @BirlesecekTelSimdi = h.TelefonE164, @BirlesecekOlusma = h.OlusmaZamani
    FROM musteri.Hesap AS h WITH (UPDLOCK, HOLDLOCK)
    WHERE h.Kimlik = @Birlesecek;

    IF @KalacakTelSimdi IS NULL OR @KalacakTelSimdi <> @KalacakTel
       OR @BirlesecekTelSimdi IS NULL OR @BirlesecekTelSimdi <> @BirlesecekTel
        THROW 51102, N'telefonlardan biri artık hesabın güncel telefonu değil; iki hesabın güncel telefonlarını yeniden kontrol edin', 1;
    IF @KalacakDurum <> N'aktif'
        THROW 51122, N'kalacak hesap aktif değil; aktif olmayan hesaba birleştirilemez. Kalacak hesabı ve aktiflik durumunu kontrol edin', 1;
    IF @BirlesecekDurum NOT IN (N'aktif', N'kapali')
        THROW 51122, N'birleşecek hesap anonim ya da zaten birleştirilmiş; hesabın durumunu kontrol edin, bu hesap için yeniden birleştirme yapmayın', 1;

    /* 1. Talepler kalan hesaba taşınır */
    UPDATE talep.Talep
    SET HesapKimlik = @Kalacak,
        GuncellemeZamani = @Simdi
    WHERE HesapKimlik = @Birlesecek;
    SET @TasinanTalep = @@ROWCOUNT;

    /* 2. Açık sahiplikler biter; makine için kalan hesapta yeni açık sahiplik */
    UPDATE makine.MakineSahipligi
    SET BitisZamani = CASE WHEN BaslangicZamani > @Simdi THEN BaslangicZamani ELSE @Simdi END,
        BitisNedeniKodu = N'birlestirme'
    OUTPUT inserted.KayitNo, inserted.MakineKimlik, inserted.TakmaAd INTO @BitenSahiplikler (KayitNo, MakineKimlik, TakmaAd)
    WHERE HesapKimlik = @Birlesecek AND BitisZamani IS NULL;
    SET @BitenSahiplik = @@ROWCOUNT;

    INSERT makine.MakineSahipligi
        (TakmaAd, MakineKimlik, HesapKimlik, KaynakKodu, BaslangicZamani, BitisZamani, BitisNedeniKodu,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, KaynakUygulamaKodu, UygulamaSurumu)
    SELECT b.TakmaAd, b.MakineKimlik, @Kalacak, N'personel', @Simdi, NULL, NULL,
           N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, N'yonetim', NULL
    FROM @BitenSahiplikler AS b
    WHERE NOT EXISTS (SELECT 1 FROM makine.MakineSahipligi AS s
                      WHERE s.MakineKimlik = b.MakineKimlik AND s.BitisZamani IS NULL);
    SET @AcilanSahiplik = @@ROWCOUNT;

    /* 3. Cihazlar */
    UPDATE bildirim.Cihaz
    SET HesapKimlik = @Kalacak
    WHERE HesapKimlik = @Birlesecek;
    SET @TasinanCihaz = @@ROWCOUNT;

    /* 4. Kişiler (taşınan hesap sahibi yetkili olur) */
    UPDATE musteri.HesapKisisi
    SET HesapKimlik = @Kalacak,
        RolKodu = CASE WHEN RolKodu = N'hesapSahibi' THEN N'yetkili' ELSE RolKodu END
    WHERE HesapKimlik = @Birlesecek;
    SET @TasinanKisi = @@ROWCOUNT;

    /* 5. Gizlenen talepler kalan hesapta da gizli */
    INSERT talep.TalepGizleme (TalepKimlik, HesapKimlik, GizlemeZamani)
    SELECT g.TalepKimlik, @Kalacak, g.GizlemeZamani
    FROM talep.TalepGizleme AS g
    WHERE g.HesapKimlik = @Birlesecek
      AND NOT EXISTS (SELECT 1 FROM talep.TalepGizleme AS k WHERE k.TalepKimlik = g.TalepKimlik AND k.HesapKimlik = @Kalacak);
    SET @KopyalananGizleme = @@ROWCOUNT;

    /* 6. Birleşen hesabın telefon geçmişi kapanır (eski telefonla gelen kalan hesaba ulaşsın) */
    IF EXISTS (SELECT 1 FROM musteri.HesapTelefonGecmisi AS g WHERE g.HesapKimlik = @Birlesecek AND g.BitisZamani IS NULL)
        UPDATE musteri.HesapTelefonGecmisi
        SET BitisZamani = CASE WHEN BaslangicZamani > @Simdi THEN BaslangicZamani ELSE @Simdi END
        WHERE HesapKimlik = @Birlesecek AND BitisZamani IS NULL;
    ELSE
        INSERT musteri.HesapTelefonGecmisi (TelefonE164, HesapKimlik, TelefonDegisikligiTalebiKimlik, BaslangicZamani, BitisZamani)
        VALUES (@BirlesecekTel, @Birlesecek, NULL, CASE WHEN @BirlesecekOlusma > @Simdi THEN @Simdi ELSE @BirlesecekOlusma END, @Simdi);

    /* 7. Birleşen hesabın oturumları kapanır */
    UPDATE erisim.Oturum
    SET KapanmaZamani = CASE WHEN BaslangicZamani > @Simdi THEN BaslangicZamani ELSE @Simdi END,
        KapanmaNedeniKodu = N'hesapBirlestirildi'
    WHERE HesapKimlik = @Birlesecek AND KapanmaZamani IS NULL;
    SET @KapatilanOturum = @@ROWCOUNT;

    /* 8. Birleşen hesap */
    UPDATE musteri.Hesap
    SET DurumKodu = N'birlestirildi',
        BirlestigiHesapKimlik = @Kalacak,
        TelefonE164 = NULL,
        TelefonUlusal = NULL
    WHERE Kimlik = @Birlesecek;

    SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                           @KalacakKayitNo AS kalacakHesapKayitNo, @BirlesecekKayitNo AS birlesenHesapKayitNo,
                           @TasinanTalep AS tasinanTalepSayisi, @BitenSahiplik AS bitenSahiplikSayisi,
                           @AcilanSahiplik AS acilanSahiplikSayisi, @TasinanCihaz AS tasinanCihazSayisi,
                           @TasinanKisi AS tasinanKisiSayisi, @KopyalananGizleme AS kopyalananGizlemeSayisi,
                           @KapatilanOturum AS kapatilanOturumSayisi,
                           JSON_QUERY((SELECT @BirlesecekDurum AS birlesenHesapDurumKodu FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS onceki,
                           JSON_QUERY((SELECT N'birlestirildi' AS birlesenHesapDurumKodu, @KalacakKayitNo AS birlestigiHesapKayitNo
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS sonraki
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    VALUES
        (N'hesaplarBirlestirildi', N'hesap', @Kalacak, NULL, @Ayrinti, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);

    SELECT N'Sonuç' AS Bolum,
           @Uygula AS Uygulandi,
           CASE WHEN @Uygula = 1
                THEN N'hesaplar birleştirildi; müşteri kalan hesabın telefonuyla giriş yapacak'
                ELSE N'önizleme; hiçbir şey kaydedilmedi. Sonucu kontrol edin; değişiklikleri kaydetmek için @Uygula = 1 ile yeniden çalıştırın' END AS Mesaj,
           @KalacakKayitNo AS KalacakHesapKayitNo,
           @KalacakTel AS KalacakTelefon,
           @BirlesecekKayitNo AS BirlesenHesapKayitNo,
           @BirlesecekTel AS BirlesenTelefon,
           @BirlesecekDurum AS BirlesenOncekiDurumKodu,
           @TasinanTalep AS TasinanTalepSayisi,
           @BitenSahiplik AS BitenSahiplikSayisi,
           @AcilanSahiplik AS AcilanSahiplikSayisi,
           @TasinanCihaz AS TasinanCihazSayisi,
           @TasinanKisi AS TasinanKisiSayisi,
           @KopyalananGizleme AS KopyalananGizlemeSayisi,
           @KapatilanOturum AS KapatilanOturumSayisi;

    IF @Uygula = 1
    BEGIN
        IF @DisIslem = 0
            COMMIT TRANSACTION;
    END
    ELSE
    BEGIN
        IF @DisIslem = 0
            ROLLBACK TRANSACTION;
        ELSE
            ROLLBACK TRANSACTION YonetimOnizleme;
    END;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'HesaplariBirlestir',
     @Metin = N'Ne yapar: aynı müşterinin iki hesabını birleştirir. Birleşen hesabın talepleri kalan hesaba taşınır; açık makine sahiplikleri birlestirme nedeniyle biter ve kalan hesapta aynı makineler için yeni açık sahiplik açılır (takma adıyla); cihazları taşınır; kişileri taşınır (taşınan hesap sahibi yetkili olur); gizlediği talepler kalan hesapta da gizlenir; telefon geçmişi kapanır; oturumları hesapBirlestirildi nedeniyle kapanır; birleşen hesap birlestirildi durumuna geçer (BirlestigiHesapKimlik = kalan hesap, telefonu boşalır). kvkk.RizaOlayi, denetim.IslemKaydi, bildirim.Teslimat, numara değişikliği talepleri, geri bildirimler, cari kartları, makine satış ve kayıt olayları, bakım işaretleri eski hesapta kalır; okuyanlar birleşme zincirini izler (yardim.MusteriGoster). İşlem kaydı hesaplarBirlestirildi (telefonlar yazılmaz). Kapılar: telefonlardan biri geçersizse 51120; telefonlar aynıysa, kalacak hesap aktif değilse ya da birleşecek hesap anonim/birleştirilmişse 51122; telefonlardan biri bir hesabın güncel telefonu değilse 51102. Ne yapmaz: geri alınamaz (birleştirmeyi çözen prosedür yoktur); rıza kayıtlarını birleştirmez; müşteriye bildirim göndermez. Örnek: EXEC yonetim.HesaplariBirlestir @KalacakTelefon = N''0533 444 55 66'', @BirlesecekTelefon = N''0532 111 22 33'', @Gerekce = N''Müşteri eski numarasıyla ikinci hesap açmış'', @YapanGirisAdi = N''ali.yilmaz'', @Uygula = 0;';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'HesaplariBirlestir', @Alt = N'@KalacakTelefon', @AltTuru = N'PARAMETER',
     @Metin = N'Kalacak (aktif) hesabın güncel telefonu, her yazımla.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'HesaplariBirlestir', @Alt = N'@BirlesecekTelefon', @AltTuru = N'PARAMETER',
     @Metin = N'Kalan hesaba katılacak hesabın güncel telefonu, her yazımla.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'HesaplariBirlestir', @Alt = N'@Gerekce', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemin nedeni; en az 10 karakter. İşlem kaydına yazılır; telefon numarası yazmayın.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'HesaplariBirlestir', @Alt = N'@YapanGirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemi yapan personelin giriş adı; aktif personel olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'HesaplariBirlestir', @Alt = N'@Uygula', @AltTuru = N'PARAMETER',
     @Metin = N'0 (varsayılan): önizleme, hiçbir şey kaydedilmez. 1: uygulanır (geri alınamaz).';
GO

/* --------------------------------------------------------------------------
   18. yonetim.AyarDegistir
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yonetim.AyarDegistir
    @Anahtar       nvarchar(80),
    @YeniDeger     nvarchar(4000),
    @MarkaKodu     nvarchar(20) = NULL,
    @SirketKodu    nvarchar(20) = NULL,
    @Gerekce       nvarchar(500),
    @YapanGirisAdi nvarchar(40),
    @Uygula        bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @DisIslem bit = CASE WHEN @@TRANCOUNT > 0 THEN 1 ELSE 0 END;
    DECLARE @YapanKullaniciKimlik uniqueidentifier;
    DECLARE @YapanAdi nvarchar(150);
    DECLARE @YapanRolAdi nvarchar(100);
    DECLARE @Ayrinti nvarchar(max);

    DECLARE @Marka nvarchar(20) = NULLIF(LOWER(LTRIM(RTRIM(ISNULL(@MarkaKodu, N''))) COLLATE Latin1_General_100_BIN2), N'');
    DECLARE @Sirket nvarchar(20) = NULLIF(LOWER(LTRIM(RTRIM(ISNULL(@SirketKodu, N''))) COLLATE Latin1_General_100_BIN2), N'');
    DECLARE @AnahtarKayit nvarchar(80);
    DECLARE @DegerTuru nvarchar(10);
    DECLARE @GenelAciklama nvarchar(400);
    DECLARE @Deger nvarchar(4000);
    DECLARE @Kapsam nvarchar(10);
    DECLARE @SatirKimlik uniqueidentifier;
    DECLARE @SatirKayitNo bigint;
    DECLARE @SatirVar bit = 0;
    DECLARE @EskiDeger nvarchar(4000);
    DECLARE @OncekiGecerli nvarchar(4000);
    DECLARE @OncekiKapsam nvarchar(10);
    DECLARE @SonrakiGecerli nvarchar(4000);
    DECLARE @SonrakiKapsam nvarchar(10);
    DECLARE @Yeni TABLE (Kimlik uniqueidentifier NOT NULL, KayitNo bigint NOT NULL);

    SET @Uygula = ISNULL(@Uygula, 0);
    SET @Gerekce = LTRIM(RTRIM(@Gerekce));
    IF LEN(ISNULL(@Gerekce, N'')) < 10
        THROW 51100, N'düzeltmenin gerekçesini en az 10 karakterle yazın', 1;

    SELECT @YapanKullaniciKimlik = k.Kimlik, @YapanAdi = p.AdSoyad, @YapanRolAdi = r.Ad
    FROM erisim.Kullanici AS k
    JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
    LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
    WHERE k.GirisAdi = (SELECT s.GirisAdi FROM yardim.Sadelestir(@YapanGirisAdi) AS s)
      AND k.TurKodu = N'personel' AND k.Aktif = 1 AND p.AyrilmaZamani IS NULL;
    IF @YapanKullaniciKimlik IS NULL
        THROW 51101, N'işlemi yapan giriş adı aktif bir personele ait değil; işlemi yapan personelin aktif giriş adını verin', 1;

    IF @Marka IS NOT NULL AND @Sirket IS NOT NULL
        THROW 51150, N'marka ve şirket birlikte verilemez; ikisinden birini ya da hiçbirini verin', 1;

    SELECT @AnahtarKayit = a.Anahtar, @DegerTuru = a.DegerTuru, @GenelAciklama = a.Aciklama
    FROM sistem.Ayar AS a
    WHERE UPPER(a.Anahtar COLLATE Latin1_General_100_BIN2) = UPPER(LTRIM(RTRIM(ISNULL(@Anahtar, N''))) COLLATE Latin1_General_100_BIN2)
      AND a.SirketKodu IS NULL AND a.MarkaKodu IS NULL;
    IF @AnahtarKayit IS NULL
        THROW 51150, N'bu anahtarla genel ayar yok; gorunum.GecerliAyar listesine bakın', 1;

    IF @Marka IS NOT NULL AND NOT EXISTS (SELECT 1 FROM katalog.Marka AS m WHERE m.Kod = @Marka)
        THROW 51102, N'bu marka kodu yok; verilen bilgileri kontrol edip yeniden çalıştırın', 1;
    IF @Sirket IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sirket.Sirket AS s WHERE s.Kod = @Sirket)
        THROW 51102, N'bu şirket kodu yok; verilen bilgileri kontrol edip yeniden çalıştırın', 1;

    SET @Kapsam = CASE WHEN @Marka IS NOT NULL THEN N'marka' WHEN @Sirket IS NOT NULL THEN N'sirket' ELSE N'genel' END;
    SET @Deger = CASE WHEN @DegerTuru IN (N'tamsayi', N'ondalik', N'mantiksal') THEN NULLIF(LTRIM(RTRIM(@YeniDeger)), N'') ELSE @YeniDeger END;

    IF @Deger IS NOT NULL
       AND NOT (   (@DegerTuru = N'tamsayi'   AND TRY_CONVERT(int, @Deger) IS NOT NULL)
                OR (@DegerTuru = N'ondalik'   AND TRY_CONVERT(decimal(18,4), @Deger) IS NOT NULL)
                OR (@DegerTuru = N'mantiksal' AND @Deger COLLATE Latin1_General_100_BIN2 IN (N'0', N'1'))
                OR (@DegerTuru = N'json'      AND ISJSON(@Deger) = 1)
                OR  @DegerTuru = N'metin')
        THROW 51150, N'değer ayarın türüne uymuyor (tamsayı, ondalık, 0/1, JSON ya da metin); ayarın türünü kontrol edip uygun bir değer verin', 1;

    IF @DisIslem = 0
        BEGIN TRANSACTION;
    ELSE
        SAVE TRANSACTION YonetimOnizleme;

    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @YapanKullaniciKimlik,
         @YapanHesapKimlik = NULL, @YapanAdi = @YapanAdi, @KaynakUygulamaKodu = N'yonetim',
         @UygulamaSurumu = NULL, @MusteriyeBildirildi = 0;

    SELECT @SatirVar = 1, @SatirKimlik = a.Kimlik, @SatirKayitNo = a.KayitNo, @EskiDeger = a.Deger
    FROM sistem.Ayar AS a WITH (UPDLOCK, HOLDLOCK)
    WHERE a.Anahtar = @AnahtarKayit
      AND (   (@Kapsam = N'genel'  AND a.SirketKodu IS NULL AND a.MarkaKodu IS NULL)
           OR (@Kapsam = N'sirket' AND a.SirketKodu = @Sirket)
           OR (@Kapsam = N'marka'  AND a.MarkaKodu = @Marka));

    IF @SatirVar = 1
       AND ((@EskiDeger IS NULL AND @Deger IS NULL)
            OR @EskiDeger COLLATE Latin1_General_100_BIN2 = @Deger)
        THROW 51113, N'ayar bu kapsamda zaten bu değerde; mevcut ayarı kontrol edin, aynı değer için yeniden işlem yapmayın', 1;

    SELECT @OncekiGecerli = g.Deger, @OncekiKapsam = g.KapsamTuru
    FROM gorunum.GecerliAyar AS g
    WHERE g.Anahtar = @AnahtarKayit
      AND (   (@Kapsam = N'genel'  AND g.SirketKodu IS NULL AND g.MarkaKodu IS NULL)
           OR (@Kapsam = N'sirket' AND g.SirketKodu = @Sirket AND g.MarkaKodu IS NULL)
           OR (@Kapsam = N'marka'  AND g.MarkaKodu = @Marka));

    IF @SatirVar = 1
        UPDATE sistem.Ayar
        SET Deger = @Deger
        WHERE Kimlik = @SatirKimlik;
    ELSE
    BEGIN
        INSERT sistem.Ayar (Anahtar, SirketKodu, MarkaKodu, DegerTuru, Deger, Aciklama)
        OUTPUT inserted.Kimlik, inserted.KayitNo INTO @Yeni (Kimlik, KayitNo)
        VALUES (@AnahtarKayit, @Sirket, @Marka, @DegerTuru, @Deger, @GenelAciklama);

        SELECT @SatirKimlik = n.Kimlik, @SatirKayitNo = n.KayitNo FROM @Yeni AS n;
    END;

    SELECT @SonrakiGecerli = g.Deger, @SonrakiKapsam = g.KapsamTuru
    FROM gorunum.GecerliAyar AS g
    WHERE g.Anahtar = @AnahtarKayit
      AND (   (@Kapsam = N'genel'  AND g.SirketKodu IS NULL AND g.MarkaKodu IS NULL)
           OR (@Kapsam = N'sirket' AND g.SirketKodu = @Sirket AND g.MarkaKodu IS NULL)
           OR (@Kapsam = N'marka'  AND g.MarkaKodu = @Marka));

    SET @Ayrinti = (SELECT @Gerekce AS gerekce, ORIGINAL_LOGIN() AS sqlGirisi, HOST_NAME() AS bilgisayar,
                           @AnahtarKayit AS anahtar, @Kapsam AS kapsam, @Marka AS markaKodu, @Sirket AS sirketKodu,
                           @DegerTuru AS degerTuru, @SatirKayitNo AS ayarKayitNo,
                           CAST(CASE WHEN @SatirVar = 1 THEN 0 ELSE 1 END AS bit) AS satirEklendi,
                           JSON_QUERY((SELECT @EskiDeger AS deger, @OncekiGecerli AS gecerliDeger, @OncekiKapsam AS gecerliKapsam
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS onceki,
                           JSON_QUERY((SELECT @Deger AS deger, @SonrakiGecerli AS gecerliDeger, @SonrakiKapsam AS gecerliKapsam
                                       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)) AS sonraki
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);

    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IlgiliKayitTuruKodu, IlgiliKimlik, IlgiliNumara, AyrintiJson, IslemZamani,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, YapanRolAdi, KaynakUygulamaKodu, UygulamaSurumu)
    VALUES
        (N'ayarDegisti', N'ayar', @SatirKimlik, NULL, @Ayrinti, @Simdi,
         N'personel', @YapanKullaniciKimlik, NULL, @YapanAdi, @YapanRolAdi, N'yonetim', NULL);

    SELECT N'Sonuç' AS Bolum,
           @Uygula AS Uygulandi,
           CASE WHEN @Uygula = 1
                THEN N'ayar değiştirildi; uygulama yeni değeri bir sonraki okumada kullanır'
                ELSE N'önizleme; hiçbir şey kaydedilmedi. Sonucu kontrol edin; değişiklikleri kaydetmek için @Uygula = 1 ile yeniden çalıştırın' END AS Mesaj,
           @AnahtarKayit AS Anahtar,
           @Kapsam AS KapsamTuru,
           @Marka AS MarkaKodu,
           @Sirket AS SirketKodu,
           @DegerTuru AS DegerTuru,
           @EskiDeger AS EskiDeger,
           @OncekiGecerli AS OncekiGecerliDeger,
           @OncekiKapsam AS OncekiGecerliKapsam,
           @Deger AS YeniDeger,
           @SonrakiGecerli AS YeniGecerliDeger,
           CAST(CASE WHEN @SatirVar = 1 THEN 0 ELSE 1 END AS bit) AS SatirEklendi,
           @SatirKayitNo AS AyarKayitNo;

    IF @Uygula = 1
    BEGIN
        IF @DisIslem = 0
            COMMIT TRANSACTION;
    END
    ELSE
    BEGIN
        IF @DisIslem = 0
            ROLLBACK TRANSACTION;
        ELSE
            ROLLBACK TRANSACTION YonetimOnizleme;
    END;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'AyarDegistir',
     @Metin = N'Ne yapar: sistem.Ayar değerini genel, şirket ya da marka kapsamında değiştirir. Kapsamlı satır yoksa türü ve açıklaması genel satırdan alınarak eklenir. Eski değerler gecmis.sistem_Ayar''da (sistem sürümlü) kalır; sonuçta değiştirilen satırın eski ve yeni değeri ile o kapsamda geçerli değer (gorunum.GecerliAyar) önce ve sonra görünür. İşlem kaydı ayarDegisti (anahtar, kapsam, eski ve yeni değer). Kapılar: anahtarın genel satırı yoksa, marka ve şirket birlikte verilmişse ya da değer türe uymuyorsa (tamsayi, ondalik: nokta ile, mantiksal: 0/1, json, metin) 51150; marka ya da şirket kodu yoksa 51102; değer zaten aynıysa 51113. Boş değer (NULL) "karar bekleniyor" anlamındadır ve yazılabilir. Ne yapmaz: yeni anahtar açmaz (tohum B01), kapsamlı satırı silmez (genel değere dönmek için aynı değeri yazın), uygulamayı yeniden başlatmaz. Örnek: EXEC yonetim.AyarDegistir @Anahtar = N''TalepGecikmeSaati'', @YeniDeger = N''72'', @MarkaKodu = NULL, @SirketKodu = NULL, @Gerekce = N''Yoğun sezonda gecikme sınırı uzatıldı'', @YapanGirisAdi = N''ali.yilmaz'', @Uygula = 0;';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'AyarDegistir', @Alt = N'@Anahtar', @AltTuru = N'PARAMETER',
     @Metin = N'Ayar anahtarı (TalepGecikmeSaati …); büyük/küçük harf fark etmez.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'AyarDegistir', @Alt = N'@YeniDeger', @AltTuru = N'PARAMETER',
     @Metin = N'Yeni değer, metin olarak (ör. N''72'', N''0.2'', N''1'', JSON dizgisi). Sayısal türlerde birim yazılmaz. NULL: karar bekleniyor.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'AyarDegistir', @Alt = N'@MarkaKodu', @AltTuru = N'PARAMETER',
     @Metin = N'İsteğe bağlı: değer yalnız bu markada geçerli olsun (katalog.Marka kodu). @SirketKodu ile birlikte verilmez.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'AyarDegistir', @Alt = N'@SirketKodu', @AltTuru = N'PARAMETER',
     @Metin = N'İsteğe bağlı: değer yalnız bu şirkette geçerli olsun (sirket.Sirket kodu). @MarkaKodu ile birlikte verilmez.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'AyarDegistir', @Alt = N'@Gerekce', @AltTuru = N'PARAMETER',
     @Metin = N'Değişikliğin nedeni; en az 10 karakter. İşlem kaydına yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'AyarDegistir', @Alt = N'@YapanGirisAdi', @AltTuru = N'PARAMETER',
     @Metin = N'İşlemi yapan personelin giriş adı; aktif personel olmalı.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim', @Nesne = N'AyarDegistir', @Alt = N'@Uygula', @AltTuru = N'PARAMETER',
     @Metin = N'0 (varsayılan): önizleme, hiçbir şey kaydedilmez. 1: uygulanır.';
GO
