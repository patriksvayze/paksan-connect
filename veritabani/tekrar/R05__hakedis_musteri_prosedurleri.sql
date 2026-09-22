/* ==========================================================================
   R05 — Hak ediş ve müşteri iç prosedürleri

   tasarim.md Bölüm 1.9.4 (hak edişin tutarı), 1.13.5 (anonimleştirme
   kapsamı), 1.21 (hata numaraları), 4.2 (uygulama rolünün EXECUTE izinleri).

     hakedis.HakEdisHesapla     yol ve işçilik kalemlerini, NetTutar'ı yazar
     hakedis.HakEdisKalemiYaz   öteki kalem türlerini yazar, sonra hesaplar
     musteri.HesabiAnonimlestir hesabın (ve birleşme zincirinin) kişisel
                                verisini tek işlemde temizler

   Araç bu betiği tek işlem içinde sahip girişiyle çalıştırır. Nesneler
   CREATE OR ALTER ile yenilenir; açıklamalar dbo.AciklamaYaz ile yazılır.
   Dinamik SQL yoktur (sahiplik zinciri; Bölüm 4.2).

   Prosedürler dış işlem varsa ona katılır (API aynı işlemde HakEdis ekler
   ve HakEdisHesapla'yı çağırır; yonetim önizlemesi ROLLBACK eder); dış
   işlem yoksa kendi işlemini açar. XACT_ABORT ON: her hata işlemi geri alır.
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. hakedis.HakEdisHesapla
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE hakedis.HakEdisHesapla
    @HakEdisKimlik uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IslemAcildi bit = 0;
    DECLARE @DurumKodu nvarchar(40);
    DECLARE @MarkaKodu nvarchar(20);
    DECLARE @ParaBirimiKodu nvarchar(3);
    DECLARE @ZiyaretKimlik uniqueidentifier;
    DECLARE @HakEdisOlusmaZamani datetime2(3);
    DECLARE @Km decimal(9,1);
    DECLARE @IscilikSaati decimal(5,1);
    DECLARE @IscilikTutari decimal(18,2);
    DECLARE @ZiyaretParaBirimiKodu nvarchar(3);
    DECLARE @TamamlanmaZamani datetime2(3);
    DECLARE @Gun date;
    DECLARE @TarifeKimlik uniqueidentifier;
    DECLARE @TarifeBirimKodu nvarchar(40);
    DECLARE @TarifeBirimTutar decimal(18,2);
    DECLARE @YolTutari decimal(18,2) = 0;
    DECLARE @IscilikKalemTutari decimal(18,2) = 0;
    DECLARE @IscilikTarifeKimlik uniqueidentifier;
    DECLARE @IscilikTarifeBirimKodu nvarchar(40);
    DECLARE @IscilikTarifeBirimTutar decimal(18,2);

    IF @@TRANCOUNT = 0
    BEGIN
        BEGIN TRANSACTION;
        SET @IslemAcildi = 1;
    END;

    /* Satırı kilitle: aynı hak edişi iki istek aynı anda hesaplamasın. */
    SELECT @DurumKodu = h.DurumKodu,
           @MarkaKodu = h.MarkaKodu,
           @ParaBirimiKodu = h.ParaBirimiKodu,
           @ZiyaretKimlik = h.ZiyaretKimlik,
           @HakEdisOlusmaZamani = h.OlusmaZamani
    FROM hakedis.HakEdis AS h WITH (UPDLOCK, HOLDLOCK)
    WHERE h.Kimlik = @HakEdisKimlik;

    IF @DurumKodu IS NULL
        THROW 51102, N'hak ediş kaydı bulunamadı; hak ediş kimliğini kontrol edip yeniden deneyin', 1;

    IF @DurumKodu <> N'bekliyor'
        THROW 51043, N'hak ediş onay beklemiyor; tutarı yeniden hesaplamak için onay bekleyen bir hak ediş seçin', 1;

    SELECT @Km = z.Km,
           @IscilikSaati = z.IscilikSaati,
           @IscilikTutari = z.IscilikTutari,
           @ZiyaretParaBirimiKodu = z.ParaBirimiKodu,
           @TamamlanmaZamani = z.TamamlanmaZamani
    FROM talep.ServisZiyareti AS z
    WHERE z.Kimlik = @ZiyaretKimlik;

    /* Kalem tutarları hak edişin para birimindedir (Bölüm 1.9.1). Ziyaretin
       işçilik tutarı başka para birimindeyse toplanamaz; kur tutulmaz. */
    IF @ZiyaretParaBirimiKodu IS NOT NULL
       AND @ZiyaretParaBirimiKodu <> @ParaBirimiKodu
        THROW 51045, N'ziyaretin para birimi hak edişin para biriminden farklı; tutar hesaplanamaz. Ziyaret ve hak ediş kayıtlarının para birimlerini kontrol edip uyumsuzluğu giderin', 1;

    /* Tarifenin günü ziyaretin tamamlandığı Türkiye günüdür; tamamlanma
       zamanı boşsa hak edişin oluştuğu gün. */
    SET @Gun = CONVERT(date, COALESCE(@TamamlanmaZamani, @HakEdisOlusmaZamani)
                             AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time');

    /* yol kalemi */
    IF ISNULL(@Km, 0) > 0
    BEGIN
        SELECT TOP (1)
               @TarifeKimlik = t.Kimlik,
               @TarifeBirimKodu = t.BirimKodu,
               @TarifeBirimTutar = t.BirimTutar
        FROM hakedis.Tarife AS t
        WHERE t.KalemTuruKodu = N'yol'
          AND t.ParaBirimiKodu = @ParaBirimiKodu
          AND (t.MarkaKodu = @MarkaKodu OR t.MarkaKodu IS NULL)
          AND t.GecerlilikBaslangicTarihi <= @Gun
          AND (t.GecerlilikBitisTarihi IS NULL OR t.GecerlilikBitisTarihi >= @Gun)
        ORDER BY CASE WHEN t.MarkaKodu IS NULL THEN 1 ELSE 0 END,
                 t.GecerlilikBaslangicTarihi DESC,
                 t.KayitNo DESC;

        IF @TarifeKimlik IS NULL
            THROW 51041, N'ziyaretin tamamlandığı gün için geçerli yol tarifesi bulunamadı; o tarih için geçerli bir yol tarifesi tanımlayın', 1;

        /* servisKaydi.js:171 ile aynı: tam lira */
        SET @YolTutari = ROUND(@Km * @TarifeBirimTutar, 0);
    END;

    IF @YolTutari > 0
    BEGIN
        UPDATE k
        SET Miktar = @Km,
            BirimKodu = @TarifeBirimKodu,
            BirimTutar = @TarifeBirimTutar,
            TarifeKimlik = @TarifeKimlik,
            Tutar = @YolTutari
        FROM hakedis.HakEdisKalemi AS k
        WHERE k.HakEdisKimlik = @HakEdisKimlik
          AND k.KalemTuruKodu = N'yol';

        IF @@ROWCOUNT = 0
            INSERT hakedis.HakEdisKalemi (HakEdisKimlik, KalemTuruKodu, Miktar, BirimKodu, BirimTutar, TarifeKimlik, Tutar)
            VALUES (@HakEdisKimlik, N'yol', @Km, @TarifeBirimKodu, @TarifeBirimTutar, @TarifeKimlik, @YolTutari);
    END
    ELSE
        DELETE hakedis.HakEdisKalemi
        WHERE HakEdisKimlik = @HakEdisKimlik
          AND KalemTuruKodu = N'yol';

    /* iscilik kalemi (servisKaydi.js hakkedisHesapla). 22.09.2026'dan beri
       servis işçiliği SÜRE olarak yazar: IscilikSaati doluysa tutar süre ×
       ziyaretin tamamlandığı gün geçerli iscilik tarifesidir; tarife yol
       kalemindeki kuralla seçilir (önce hak edişin markası, yoksa markasız;
       hak edişin para biriminde). IscilikSaati boşsa (süreden önceki kayıt)
       servisin yazdığı IscilikTutari olduğu gibi alınır. */
    IF @IscilikSaati IS NOT NULL
    BEGIN
        IF @IscilikSaati > 0
        BEGIN
            SELECT TOP (1)
                   @IscilikTarifeKimlik = t.Kimlik,
                   @IscilikTarifeBirimKodu = t.BirimKodu,
                   @IscilikTarifeBirimTutar = t.BirimTutar
            FROM hakedis.Tarife AS t
            WHERE t.KalemTuruKodu = N'iscilik'
              AND t.ParaBirimiKodu = @ParaBirimiKodu
              AND (t.MarkaKodu = @MarkaKodu OR t.MarkaKodu IS NULL)
              AND t.GecerlilikBaslangicTarihi <= @Gun
              AND (t.GecerlilikBitisTarihi IS NULL OR t.GecerlilikBitisTarihi >= @Gun)
            ORDER BY CASE WHEN t.MarkaKodu IS NULL THEN 1 ELSE 0 END,
                     t.GecerlilikBaslangicTarihi DESC,
                     t.KayitNo DESC;

            IF @IscilikTarifeKimlik IS NULL
                THROW 51041, N'ziyaretin tamamlandığı gün için geçerli işçilik tarifesi bulunamadı; o tarih için geçerli bir işçilik tarifesi tanımlayın', 1;

            /* yol kalemiyle aynı: tam lira */
            SET @IscilikKalemTutari = ROUND(@IscilikSaati * @IscilikTarifeBirimTutar, 0);
        END;
    END
    ELSE
        SET @IscilikKalemTutari = ROUND(ISNULL(@IscilikTutari, 0), 0);

    /* Süreli kayıtta miktar, birim ve tarife yazılır; eski kayıtta boştur. */
    IF @IscilikKalemTutari > 0
    BEGIN
        UPDATE k
        SET Miktar = @IscilikSaati,
            BirimKodu = @IscilikTarifeBirimKodu,
            BirimTutar = @IscilikTarifeBirimTutar,
            TarifeKimlik = @IscilikTarifeKimlik,
            Tutar = @IscilikKalemTutari
        FROM hakedis.HakEdisKalemi AS k
        WHERE k.HakEdisKimlik = @HakEdisKimlik
          AND k.KalemTuruKodu = N'iscilik';

        IF @@ROWCOUNT = 0
            INSERT hakedis.HakEdisKalemi (HakEdisKimlik, KalemTuruKodu, Miktar, BirimKodu, BirimTutar, TarifeKimlik, Tutar)
            VALUES (@HakEdisKimlik, N'iscilik', @IscilikSaati, @IscilikTarifeBirimKodu, @IscilikTarifeBirimTutar, @IscilikTarifeKimlik, @IscilikKalemTutari);
    END
    ELSE
        DELETE hakedis.HakEdisKalemi
        WHERE HakEdisKimlik = @HakEdisKimlik
          AND KalemTuruKodu = N'iscilik';

    /* NetTutar = bütün kalemlerin toplamı (başka türler dahil) */
    UPDATE h
    SET NetTutar = ISNULL((SELECT SUM(k.Tutar)
                           FROM hakedis.HakEdisKalemi AS k
                           WHERE k.HakEdisKimlik = h.Kimlik), 0)
    FROM hakedis.HakEdis AS h
    WHERE h.Kimlik = @HakEdisKimlik;

    IF @IslemAcildi = 1
        COMMIT TRANSACTION;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdisHesapla',
    @Metin = N'Hak edişin yol ve işçilik kalemlerini ziyaretin Km, IscilikSaati ve IscilikTutari değerlerinden yeniden yazar, sonra NetTutar''ı bütün kalemlerin toplamına eşitler (tasarim.md 1.9.4). Tarife: ziyaretin Türkiye saatine göre tamamlandığı gün geçerli, hak edişin para biriminde olan hakedis.Tarife satırı; önce hak edişin markasına ait satır, yoksa markasız satır. Yol: Km × yol tarifesi. İşçilik: IscilikSaati doluysa süre × işçilik tarifesi (aynı seçim kuralı); boşsa servisin yazdığı IscilikTutari (süre yazılmamış eski kayıtlar). Tutarlar tam liraya yuvarlanır (servisKaydi.js). Tutarı 0 çıkan yol/iscilik kalemi silinir; öteki kalem türleri korunur. Hatalar: hak ediş yoksa 51102; bekliyor durumunda değilse 51043; ziyaretin para birimi hak edişinkinden farklıysa 51045; Km > 0 iken yol tarifesi ya da IscilikSaati > 0 iken işçilik tarifesi yoksa 51041. API servis kaydını gönderirken ve PAKSAN düzeltmesinde (ZiyaretDuzeltmesi + ServisZiyareti.Km/IscilikSaati/IscilikTutari) aynı işlemde çağırır. Uygulama rolü kalem tablosuna ve NetTutar''a doğrudan yazamaz; yalnız bu prosedür ve hakedis.HakEdisKalemiYaz yazar.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdisHesapla', @Alt = N'@HakEdisKimlik', @AltTuru = N'PARAMETER',
    @Metin = N'Hesaplanacak hakedis.HakEdis satırının Kimlik değeri.';
GO

/* --------------------------------------------------------------------------
   2. hakedis.HakEdisKalemiYaz
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE hakedis.HakEdisKalemiYaz
    @HakEdisKimlik uniqueidentifier,
    @KalemTuruKodu nvarchar(40),
    @Tutar         decimal(18,2),
    @Miktar        decimal(9,1)  = NULL,
    @BirimKodu     nvarchar(40)  = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IslemAcildi bit = 0;
    DECLARE @DurumKodu nvarchar(40);

    IF @KalemTuruKodu IN (N'yol', N'iscilik')
        THROW 51044, N'yol ve işçilik kalemi elle yazılamaz; ziyaretin km ve işçilik tutarından hesaplanır. Ziyaret bilgilerini kontrol edip hak ediş tutarını yeniden hesaplayın', 1;

    IF @@TRANCOUNT = 0
    BEGIN
        BEGIN TRANSACTION;
        SET @IslemAcildi = 1;
    END;

    SELECT @DurumKodu = h.DurumKodu
    FROM hakedis.HakEdis AS h WITH (UPDLOCK, HOLDLOCK)
    WHERE h.Kimlik = @HakEdisKimlik;

    IF @DurumKodu IS NULL
        THROW 51102, N'hak ediş kaydı bulunamadı; hak ediş kimliğini kontrol edip yeniden deneyin', 1;

    IF @DurumKodu <> N'bekliyor'
        THROW 51043, N'hak ediş onay beklemiyor; kalem eklemek için onay bekleyen bir hak ediş seçin', 1;

    IF @Tutar = 0
        DELETE hakedis.HakEdisKalemi
        WHERE HakEdisKimlik = @HakEdisKimlik
          AND KalemTuruKodu = @KalemTuruKodu;
    ELSE
    BEGIN
        /* Tutar NULL ise 515, eksi ise CK 547; bilinmeyen tür ya da birim FK 547. */
        UPDATE k
        SET Miktar = @Miktar,
            BirimKodu = @BirimKodu,
            BirimTutar = NULL,
            TarifeKimlik = NULL,
            Tutar = @Tutar
        FROM hakedis.HakEdisKalemi AS k
        WHERE k.HakEdisKimlik = @HakEdisKimlik
          AND k.KalemTuruKodu = @KalemTuruKodu;

        IF @@ROWCOUNT = 0
            INSERT hakedis.HakEdisKalemi (HakEdisKimlik, KalemTuruKodu, Miktar, BirimKodu, Tutar)
            VALUES (@HakEdisKimlik, @KalemTuruKodu, @Miktar, @BirimKodu, @Tutar);
    END;

    EXEC hakedis.HakEdisHesapla @HakEdisKimlik = @HakEdisKimlik;

    IF @IslemAcildi = 1
        COMMIT TRANSACTION;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdisKalemiYaz',
    @Metin = N'Hak edişe yol ve işçilik dışındaki bir kalemi (ör. tekrar ziyaretin servis masasınca girilen tutarı, konaklama) yazar: satır yoksa ekler, varsa günceller, @Tutar = 0 ise siler; sonunda hakedis.HakEdisHesapla ile yol/işçilik kalemlerini ve NetTutar''ı yeniler (tasarim.md 1.9.4). Hatalar: yol ya da iscilik verilirse 51044; hak ediş yoksa 51102; bekliyor durumunda değilse 51043. Kalem türü kod.HakEdisKalemTuru''nda, birim kod.Birim''de olmalıdır (yoksa 547). Yeni kalem türü kod.HakEdisKalemTuru''na satır eklenerek açılır; şema değişmez.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdisKalemiYaz', @Alt = N'@HakEdisKimlik', @AltTuru = N'PARAMETER',
    @Metin = N'Kalemin yazılacağı hakedis.HakEdis satırının Kimlik değeri.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdisKalemiYaz', @Alt = N'@KalemTuruKodu', @AltTuru = N'PARAMETER',
    @Metin = N'kod.HakEdisKalemTuru kodu (ör. diger, konaklama); yol ve iscilik kabul edilmez.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdisKalemiYaz', @Alt = N'@Tutar', @AltTuru = N'PARAMETER',
    @Metin = N'Kalemin tutarı, hak edişin para biriminde. 0 kalemi siler.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdisKalemiYaz', @Alt = N'@Miktar', @AltTuru = N'PARAMETER',
    @Metin = N'Bilgi amaçlı miktar (ör. gece sayısı); isteğe bağlı.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdisKalemiYaz', @Alt = N'@BirimKodu', @AltTuru = N'PARAMETER',
    @Metin = N'Miktarın birimi (kod.Birim: km, adet, saat, sabit); isteğe bağlı.';
GO

/* --------------------------------------------------------------------------
   3. musteri.HesabiAnonimlestir

   Kapsam tasarim.md 1.13.5 tablosudur. O tablonun ilkesiyle ("hesabın
   kayıtlarındaki serbest metin anonim metnine, iletişim verisi NULL'a")
   şu satırlar da eklendi (rapor edildi; tasarıma işlenmesi gerekir):
     - musteri.TelefonDegisikligiTalebi.KararNotu, talep.OdemeOnayi.OnayNotu,
       talep.Dekont.GecersizNedeni, dosya.Dosya.GecersizNedeni: personelin
       ödeme ve numara kararına yazdığı not ödeyenin adını, eski ve yeni
       numarayı taşıyabilir.
     - dosya.Dosya: dekont dosyaları (OrijinalAd), hesabın yüklediği bütün
       dosyalar (YapanHesapKimlik) ve hesaba giden iletilerin ekleri.
     - sistem.Giden: hesabın telefon değişikliği, geri bildirim ve doğrulama
       kodu kayıtlarına bağlı iletiler (AliciHesapKimlik boş olsa da);
       SonHata (sağlayıcı hatası numarayı yazabilir); bekleyen ya da hatalı
       ileti adressiz kaldığı için vazgecildi olur.
     - entegrasyon.IceAktarimSatiri: silinen cari kartla eşleşmiş satırlar.
   Kasıtlı olarak dışarıda kalanlar: hakedis.HakEdis.RedNedeni ve
   talep.ZiyaretDuzeltmesi.Neden (servisle PAKSAN arasındaki para kaydı),
   parça kolonları (talep.ParcaSatiri, Kapanis.DegisenParcalarMetni),
   makine.MakineServisAtamasi.AtamaNotu (makinenin kaydı, hesabın değil).
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE musteri.HesabiAnonimlestir
    @HesapKimlik uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    /* Anonim metni: tek sabit (tasarim.md 1.13.5). */
    DECLARE @Anonim nvarchar(1000) = N'anonimleştirildi';
    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @IslemAcildi bit = 0;
    DECLARE @Kok uniqueidentifier;
    DECLARE @KilitliHesapSayisi int;

    DECLARE @Hesap TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY);
    DECLARE @Talep TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY);
    DECLARE @Telefon TABLE (TelefonE164 nvarchar(16) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY);
    DECLARE @Makine TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY);
    DECLARE @TelDegisikligi TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY);
    DECLARE @GeriBildirim TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY);
    DECLARE @Dogrulama TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY, GidenKimlik uniqueidentifier NULL);
    DECLARE @Giden TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY);
    DECLARE @Dosya TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY);
    DECLARE @Cari TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY);
    DECLARE @Sonuc TABLE (Sira int NOT NULL PRIMARY KEY, Tablo nvarchar(128) COLLATE DATABASE_DEFAULT NOT NULL, SatirSayisi int NOT NULL);

    IF NOT EXISTS (SELECT 1 FROM musteri.Hesap WHERE Kimlik = @HesapKimlik)
        THROW 51102, N'müşteri hesabı bulunamadı; müşteri kimliğini kontrol edip yeniden deneyin', 1;

    IF @@TRANCOUNT = 0
    BEGIN
        BEGIN TRANSACTION;
        SET @IslemAcildi = 1;
    END;

    /* 3.1 Birleşme zinciri: önce köke çık, sonra kökten bütün dallara in
       (HesaplariBirlestir telefon değişikliği ve geri bildirimleri eski
       hesapta bırakır; okuyanlar zinciri izler). */
    WITH yukari AS (
        SELECT h.Kimlik, h.BirlestigiHesapKimlik, 0 AS Derinlik
        FROM musteri.Hesap AS h
        WHERE h.Kimlik = @HesapKimlik
        UNION ALL
        SELECT u.Kimlik, u.BirlestigiHesapKimlik, y.Derinlik + 1
        FROM yukari AS y
        JOIN musteri.Hesap AS u ON u.Kimlik = y.BirlestigiHesapKimlik
        WHERE y.Derinlik < 90
    )
    SELECT TOP (1) @Kok = Kimlik
    FROM yukari
    ORDER BY Derinlik DESC;

    WITH asagi AS (
        SELECT h.Kimlik, 0 AS Derinlik
        FROM musteri.Hesap AS h
        WHERE h.Kimlik = @Kok
        UNION ALL
        SELECT d.Kimlik, a.Derinlik + 1
        FROM asagi AS a
        JOIN musteri.Hesap AS d ON d.BirlestigiHesapKimlik = a.Kimlik
        WHERE a.Derinlik < 90
    )
    INSERT @Hesap (Kimlik)
    SELECT DISTINCT Kimlik FROM asagi;

    INSERT @Hesap (Kimlik)
    SELECT @HesapKimlik
    WHERE NOT EXISTS (SELECT 1 FROM @Hesap WHERE Kimlik = @HesapKimlik);

    /* Zincirdeki hesapları kilitle: anonimleştirme sürerken hesap
       birleştirilmesin, telefonu değişmesin. */
    SELECT @KilitliHesapSayisi = COUNT(*)
    FROM musteri.Hesap AS h WITH (UPDLOCK, HOLDLOCK)
    WHERE h.Kimlik IN (SELECT Kimlik FROM @Hesap);

    /* 3.2 Temizlenmeden önce toplananlar */
    INSERT @Talep (Kimlik)
    SELECT t.Kimlik FROM talep.Talep AS t WHERE t.HesapKimlik IN (SELECT Kimlik FROM @Hesap);

    INSERT @Telefon (TelefonE164)
    SELECT TelefonE164 FROM musteri.Hesap WHERE Kimlik IN (SELECT Kimlik FROM @Hesap) AND TelefonE164 IS NOT NULL
    UNION
    SELECT TelefonE164 FROM musteri.HesapKisisi WHERE HesapKimlik IN (SELECT Kimlik FROM @Hesap) AND TelefonE164 IS NOT NULL
    UNION
    SELECT TelefonE164 FROM musteri.HesapTelefonGecmisi WHERE HesapKimlik IN (SELECT Kimlik FROM @Hesap) AND TelefonE164 IS NOT NULL;

    INSERT @Makine (Kimlik)
    SELECT DISTINCT s.MakineKimlik FROM makine.MakineSahipligi AS s WHERE s.HesapKimlik IN (SELECT Kimlik FROM @Hesap);

    INSERT @TelDegisikligi (Kimlik)
    SELECT Kimlik FROM musteri.TelefonDegisikligiTalebi WHERE HesapKimlik IN (SELECT Kimlik FROM @Hesap);

    INSERT @GeriBildirim (Kimlik)
    SELECT Kimlik FROM musteri.GeriBildirim WHERE HesapKimlik IN (SELECT Kimlik FROM @Hesap);

    INSERT @Dogrulama (Kimlik, GidenKimlik)
    SELECT d.Kimlik, d.GidenKimlik
    FROM erisim.DogrulamaKodu AS d
    WHERE d.HesapKimlik IN (SELECT Kimlik FROM @Hesap)
       OR d.TelefonE164 IN (SELECT TelefonE164 FROM @Telefon);

    INSERT @Giden (Kimlik)
    SELECT g.Kimlik
    FROM sistem.Giden AS g
    WHERE g.AliciHesapKimlik IN (SELECT Kimlik FROM @Hesap)
       OR g.IlgiliKimlik IN (SELECT Kimlik FROM @Talep)
       OR g.IlgiliKimlik IN (SELECT Kimlik FROM @TelDegisikligi)
       OR g.IlgiliKimlik IN (SELECT Kimlik FROM @GeriBildirim)
       OR g.IlgiliKimlik IN (SELECT Kimlik FROM @Dogrulama)
       OR g.Kimlik IN (SELECT GidenKimlik FROM @Dogrulama WHERE GidenKimlik IS NOT NULL);

    INSERT @Dosya (Kimlik)
    SELECT DosyaKimlik FROM talep.TalepEki WHERE TalepKimlik IN (SELECT Kimlik FROM @Talep)
    UNION
    SELECT ee.DosyaKimlik FROM talep.EklemeEki AS ee JOIN talep.Ekleme AS e ON e.Kimlik = ee.EklemeKimlik WHERE e.TalepKimlik IN (SELECT Kimlik FROM @Talep)
    UNION
    SELECT SesDosyaKimlik FROM talep.Ekleme WHERE TalepKimlik IN (SELECT Kimlik FROM @Talep) AND SesDosyaKimlik IS NOT NULL
    UNION
    SELECT SesDosyaKimlik FROM talep.Talep WHERE Kimlik IN (SELECT Kimlik FROM @Talep) AND SesDosyaKimlik IS NOT NULL
    UNION
    SELECT f.DosyaKimlik FROM talep.ZiyaretFotografi AS f JOIN talep.ServisZiyareti AS z ON z.Kimlik = f.ZiyaretKimlik WHERE z.TalepKimlik IN (SELECT Kimlik FROM @Talep)
    UNION
    SELECT ServisFisiDosyaKimlik FROM talep.Kapanis WHERE TalepKimlik IN (SELECT Kimlik FROM @Talep) AND ServisFisiDosyaKimlik IS NOT NULL
    UNION
    SELECT DosyaKimlik FROM talep.Dekont WHERE TalepKimlik IN (SELECT Kimlik FROM @Talep)
    UNION
    SELECT BelgeDosyaKimlik FROM makine.MakineSatisi WHERE AliciHesapKimlik IN (SELECT Kimlik FROM @Hesap) AND BelgeDosyaKimlik IS NOT NULL
    UNION
    SELECT Kimlik FROM dosya.Dosya WHERE YapanHesapKimlik IN (SELECT Kimlik FROM @Hesap)
    UNION
    SELECT DosyaKimlik FROM sistem.GidenEki WHERE GidenKimlik IN (SELECT Kimlik FROM @Giden);

    INSERT @Cari (Kimlik)
    SELECT Kimlik FROM entegrasyon.CariKarti WHERE HesapKimlik IN (SELECT Kimlik FROM @Hesap);

    /* 3.3 musteri */
    UPDATE musteri.Hesap
    SET TelefonE164 = NULL,
        TelefonUlusal = NULL,
        TelefonUlkeKodu = NULL,
        SifreKaydi = NULL,
        Adres = NULL,
        YurtdisiBolge = NULL,
        YurtdisiIlce = NULL,
        SaticiBeyani = NULL,
        /* Birleşmiş hesap birleşme bağını ve durumunu korur
           (CK_musteri_Hesap_Birlesme); zincir bozulmasın. */
        DurumKodu = CASE WHEN DurumKodu = N'birlestirildi' THEN DurumKodu ELSE N'anonim' END,
        AnonimlestirmeZamani = COALESCE(AnonimlestirmeZamani, @Simdi)
    WHERE Kimlik IN (SELECT Kimlik FROM @Hesap);
    INSERT @Sonuc VALUES (1, N'musteri.Hesap', @@ROWCOUNT);

    UPDATE musteri.HesapKisisi
    SET Adi = NULL, Soyadi = NULL, TelefonE164 = NULL, TelefonUlusal = NULL,
        PasifZamani = COALESCE(PasifZamani, @Simdi)
    WHERE HesapKimlik IN (SELECT Kimlik FROM @Hesap);
    INSERT @Sonuc VALUES (2, N'musteri.HesapKisisi', @@ROWCOUNT);

    UPDATE musteri.HesapTelefonGecmisi
    SET TelefonE164 = NULL
    WHERE HesapKimlik IN (SELECT Kimlik FROM @Hesap);
    INSERT @Sonuc VALUES (3, N'musteri.HesapTelefonGecmisi', @@ROWCOUNT);

    UPDATE musteri.TelefonDegisikligiTalebi
    SET BeyanAdi = NULL, EskiTelefonE164 = NULL, YeniTelefonE164 = NULL, KanitSeriNo = NULL,
        KararNotu = CASE WHEN KararNotu IS NULL THEN NULL ELSE @Anonim END
    WHERE Kimlik IN (SELECT Kimlik FROM @TelDegisikligi);
    INSERT @Sonuc VALUES (4, N'musteri.TelefonDegisikligiTalebi', @@ROWCOUNT);

    UPDATE musteri.GeriBildirim
    SET IletisimAdi = NULL, IletisimTelefonE164 = NULL, Metin = @Anonim
    WHERE Kimlik IN (SELECT Kimlik FROM @GeriBildirim);
    INSERT @Sonuc VALUES (5, N'musteri.GeriBildirim', @@ROWCOUNT);

    UPDATE musteri.GeriBildirimNotu
    SET Metin = @Anonim
    WHERE GeriBildirimKimlik IN (SELECT Kimlik FROM @GeriBildirim);
    INSERT @Sonuc VALUES (6, N'musteri.GeriBildirimNotu', @@ROWCOUNT);

    /* 3.4 talep (hesabın talepleri; kod, tarih, tutar ve parça kolonları kalır) */
    UPDATE talep.Talep
    SET IletisimAdi = NULL,
        IletisimTelefonE164 = NULL,
        IletisimTelefonUlusal = NULL,
        Adres = NULL,
        YurtdisiBolge = NULL,
        YurtdisiIlce = NULL,
        Aciklama = CASE WHEN Aciklama IS NULL THEN NULL ELSE @Anonim END
    WHERE Kimlik IN (SELECT Kimlik FROM @Talep);
    INSERT @Sonuc VALUES (7, N'talep.Talep', @@ROWCOUNT);

    UPDATE talep.TalepNotu SET Metin = @Anonim
    WHERE TalepKimlik IN (SELECT Kimlik FROM @Talep);
    INSERT @Sonuc VALUES (8, N'talep.TalepNotu', @@ROWCOUNT);

    UPDATE talep.Iptal SET Aciklama = @Anonim
    WHERE TalepKimlik IN (SELECT Kimlik FROM @Talep) AND Aciklama IS NOT NULL;
    INSERT @Sonuc VALUES (9, N'talep.Iptal', @@ROWCOUNT);

    UPDATE talep.Kapanis
    SET KapanisNotu = CASE WHEN KapanisNotu IS NULL THEN NULL ELSE @Anonim END,
        YapilanIsMetni = CASE WHEN YapilanIsMetni IS NULL THEN NULL ELSE @Anonim END
    WHERE TalepKimlik IN (SELECT Kimlik FROM @Talep)
      AND (KapanisNotu IS NOT NULL OR YapilanIsMetni IS NOT NULL);
    INSERT @Sonuc VALUES (10, N'talep.Kapanis', @@ROWCOUNT);

    UPDATE talep.YenidenAcma SET Aciklama = @Anonim
    WHERE TalepKimlik IN (SELECT Kimlik FROM @Talep) AND Aciklama IS NOT NULL;
    INSERT @Sonuc VALUES (11, N'talep.YenidenAcma', @@ROWCOUNT);

    UPDATE talep.Ekleme SET EklemeNotu = @Anonim
    WHERE TalepKimlik IN (SELECT Kimlik FROM @Talep) AND EklemeNotu IS NOT NULL;
    INSERT @Sonuc VALUES (12, N'talep.Ekleme', @@ROWCOUNT);

    UPDATE talep.ServisZiyareti
    SET ArizaMetni = CASE WHEN ArizaMetni IS NULL THEN NULL ELSE @Anonim END,
        SonucMetni = CASE WHEN SonucMetni IS NULL THEN NULL ELSE @Anonim END
    WHERE TalepKimlik IN (SELECT Kimlik FROM @Talep)
      AND (ArizaMetni IS NOT NULL OR SonucMetni IS NOT NULL);
    INSERT @Sonuc VALUES (13, N'talep.ServisZiyareti', @@ROWCOUNT);

    UPDATE talep.Randevu SET IsTanimi = NULL
    WHERE TalepKimlik IN (SELECT Kimlik FROM @Talep) AND IsTanimi IS NOT NULL;
    INSERT @Sonuc VALUES (14, N'talep.Randevu', @@ROWCOUNT);

    UPDATE talep.Teklif SET TeklifNotu = @Anonim
    WHERE TalepKimlik IN (SELECT Kimlik FROM @Talep) AND TeklifNotu IS NOT NULL;
    INSERT @Sonuc VALUES (15, N'talep.Teklif', @@ROWCOUNT);

    UPDATE talep.Devir SET Neden = @Anonim
    WHERE TalepKimlik IN (SELECT Kimlik FROM @Talep) AND Neden IS NOT NULL;
    INSERT @Sonuc VALUES (16, N'talep.Devir', @@ROWCOUNT);

    UPDATE talep.ParcaTalebiAyrinti SET TeslimatAdresi = NULL
    WHERE TalepKimlik IN (SELECT Kimlik FROM @Talep) AND TeslimatAdresi IS NOT NULL;
    INSERT @Sonuc VALUES (17, N'talep.ParcaTalebiAyrinti', @@ROWCOUNT);

    UPDATE talep.FaturaBilgisi
    SET AdSoyad = NULL, Unvan = NULL,
        TcNoSifreli = NULL, TcNoOzeti = NULL, TcNoMaskeli = NULL,
        VergiNoSifreli = NULL, VergiNoOzeti = NULL, VergiNoMaskeli = NULL,
        VergiDairesi = NULL, Eposta = NULL,
        TelefonE164 = NULL, TelefonUlusal = NULL,
        Adres = NULL, YurtdisiBolge = NULL, YurtdisiIlce = NULL
    WHERE TalepKimlik IN (SELECT Kimlik FROM @Talep);
    INSERT @Sonuc VALUES (18, N'talep.FaturaBilgisi', @@ROWCOUNT);

    UPDATE talep.Dekont SET GecersizNedeni = @Anonim
    WHERE TalepKimlik IN (SELECT Kimlik FROM @Talep) AND GecersizNedeni IS NOT NULL;
    INSERT @Sonuc VALUES (19, N'talep.Dekont', @@ROWCOUNT);

    UPDATE talep.OdemeOnayi SET OnayNotu = @Anonim
    WHERE TalepKimlik IN (SELECT Kimlik FROM @Talep) AND OnayNotu IS NOT NULL;
    INSERT @Sonuc VALUES (20, N'talep.OdemeOnayi', @@ROWCOUNT);

    /* 3.5 makine */
    UPDATE makine.MakineSahipligi
    SET BitisZamani = CASE WHEN BitisZamani IS NULL
                           THEN CASE WHEN BaslangicZamani > @Simdi THEN BaslangicZamani ELSE @Simdi END
                           ELSE BitisZamani END,
        BitisNedeniKodu = CASE WHEN BitisZamani IS NULL THEN N'anonimlestirme' ELSE BitisNedeniKodu END,
        TakmaAd = NULL
    WHERE HesapKimlik IN (SELECT Kimlik FROM @Hesap);
    INSERT @Sonuc VALUES (21, N'makine.MakineSahipligi', @@ROWCOUNT);

    UPDATE makine.KayitOlayi SET BeyanAdi = NULL
    WHERE BeyanAdi IS NOT NULL
      AND (HesapKimlik IN (SELECT Kimlik FROM @Hesap) OR MakineKimlik IN (SELECT Kimlik FROM @Makine));
    INSERT @Sonuc VALUES (22, N'makine.KayitOlayi', @@ROWCOUNT);

    /* 3.6 bildirim, erisim, sistem, destek */
    UPDATE bildirim.Bildirim
    SET SerbestMetin = CASE WHEN SerbestMetin IS NULL THEN NULL ELSE @Anonim END,
        DegerlerJson = CASE WHEN DegerlerJson IS NULL THEN NULL ELSE N'{}' END
    WHERE HesapKimlik IN (SELECT Kimlik FROM @Hesap);
    INSERT @Sonuc VALUES (23, N'bildirim.Bildirim', @@ROWCOUNT);

    UPDATE bildirim.Cihaz
    SET PushJetonu = NULL, PushJetonuOzeti = NULL, PasifZamani = COALESCE(PasifZamani, @Simdi)
    WHERE HesapKimlik IN (SELECT Kimlik FROM @Hesap);
    INSERT @Sonuc VALUES (24, N'bildirim.Cihaz', @@ROWCOUNT);

    UPDATE erisim.Oturum
    SET KapanmaNedeniKodu = CASE WHEN KapanmaZamani IS NULL THEN N'anonimlestirme' ELSE KapanmaNedeniKodu END,
        KapanmaZamani = COALESCE(KapanmaZamani, @Simdi),
        IpAdresi = NULL,
        KullaniciAjani = NULL
    WHERE HesapKimlik IN (SELECT Kimlik FROM @Hesap);
    INSERT @Sonuc VALUES (25, N'erisim.Oturum', @@ROWCOUNT);

    UPDATE erisim.DogrulamaKodu SET TelefonE164 = NULL
    WHERE Kimlik IN (SELECT Kimlik FROM @Dogrulama)
      AND TelefonE164 IS NOT NULL;
    INSERT @Sonuc VALUES (26, N'erisim.DogrulamaKodu', @@ROWCOUNT);

    /* Gönderilmemiş ileti adressiz kalır; kuyrukta beklemesin. */
    UPDATE sistem.Giden
    SET AliciAdres = NULL, Konu = NULL, Govde = NULL, DegiskenlerJson = NULL, SonHata = NULL,
        DurumKodu = CASE WHEN DurumKodu IN (N'bekliyor', N'hata') THEN N'vazgecildi' ELSE DurumKodu END,
        SonrakiDenemeZamani = CASE WHEN DurumKodu IN (N'bekliyor', N'hata') THEN NULL ELSE SonrakiDenemeZamani END
    WHERE Kimlik IN (SELECT Kimlik FROM @Giden);
    INSERT @Sonuc VALUES (27, N'sistem.Giden', @@ROWCOUNT);

    UPDATE o SET Deger = NULL
    FROM destek.SohbetOlayi AS o
    JOIN destek.SohbetOturumu AS s ON s.Kimlik = o.SohbetOturumuKimlik
    WHERE s.HesapKimlik IN (SELECT Kimlik FROM @Hesap)
      AND o.Deger IS NOT NULL;
    INSERT @Sonuc VALUES (28, N'destek.SohbetOlayi', @@ROWCOUNT);

    /* 3.7 dosya: dekont sınıfı saklama kuralını bekler (CK_dosya_Dosya_DekontSilinmez);
       yalnız adı ve geçersizlik notu temizlenir. */
    UPDATE dosya.Dosya
    SET OrijinalAd = NULL,
        GecersizNedeni = CASE WHEN GecersizNedeni IS NULL THEN NULL ELSE @Anonim END,
        SilinmeIstendiZamani = CASE WHEN SaklamaSinifiKodu = N'genel' THEN COALESCE(SilinmeIstendiZamani, @Simdi) ELSE SilinmeIstendiZamani END
    WHERE Kimlik IN (SELECT Kimlik FROM @Dosya);
    INSERT @Sonuc VALUES (29, N'dosya.Dosya', @@ROWCOUNT);

    /* 3.8 entegrasyon: ham satırlar temizlenir; belge bağı çözülür, sonra kart silinir */
    UPDATE entegrasyon.IceAktarimSatiri SET HamVeriJson = NULL
    WHERE HamVeriJson IS NOT NULL
      AND (EslesenKimlik IN (SELECT Kimlik FROM @Hesap)
           OR EslesenKimlik IN (SELECT Kimlik FROM @Cari)
           OR EslesenKimlik IN (SELECT ms.Kimlik FROM makine.MakineSatisi AS ms WHERE ms.AliciHesapKimlik IN (SELECT Kimlik FROM @Hesap)));
    INSERT @Sonuc VALUES (30, N'entegrasyon.IceAktarimSatiri', @@ROWCOUNT);

    UPDATE entegrasyon.BelgeBagi SET CariKartiKimlik = NULL
    WHERE CariKartiKimlik IN (SELECT Kimlik FROM @Cari);
    INSERT @Sonuc VALUES (31, N'entegrasyon.BelgeBagi', @@ROWCOUNT);

    DELETE entegrasyon.CariKarti
    WHERE Kimlik IN (SELECT Kimlik FROM @Cari);
    INSERT @Sonuc VALUES (32, N'entegrasyon.CariKarti', @@ROWCOUNT);

    IF @IslemAcildi = 1
        COMMIT TRANSACTION;

    SELECT Tablo, SatirSayisi FROM @Sonuc ORDER BY Sira;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesabiAnonimlestir',
    @Metin = N'Müşteri hesabının kişisel verisini tasarim.md 1.13.5 kapsamında tek işlemde temizler. Hesap birleşme zincirindeyse (BirlestigiHesapKimlik) zincirdeki bütün hesaplara uygulanır. Ad, telefon, adres, şifre, fatura bilgisi, push jetonu, oturum IP''si, dosya adları NULL olur; hesabın taleplerindeki, geri bildirimlerindeki ve numara değişikliği taleplerindeki serbest metinler anonim metnine çevrilir; genel sınıftaki dosyalar silinmeye işaretlenir (dekont sınıfı saklama kuralını bekler); hesaba giden ve bekleyen iletiler vazgecildi olur; hesabın LOGO cari kartları belge bağları çözülerek silinir. Kod, tarih, tutar, il/ilçe ve parça kolonları istatistik için kalır; kvkk.RizaOlayi, denetim.IslemKaydi, kvkk.BasvuruTalebi dokunulmaz. Birleşmiş (birlestirildi) hesabın durumu değişmez, yalnız verisi temizlenir; öteki hesaplar anonim olur. Tekrar çalıştırılabilir. Tablo başına etkilenen satır sayısını tek sonuç kümesiyle döndürür: Tablo nvarchar(128), SatirSayisi int (32 satır, sabit sıra). İşlem kaydını çağıran yazar (API ya da yonetim.KisiselVerileriAnonimlestir). Hesap yoksa 51102.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesabiAnonimlestir', @Alt = N'@HesapKimlik', @AltTuru = N'PARAMETER',
    @Metin = N'Anonimleştirilecek musteri.Hesap satırının Kimlik değeri; birleşme zincirindeki öteki hesaplar kendiliğinden eklenir.';
GO

/* --------------------------------------------------------------------------
   4. Uygulama rolünün EXECUTE izinleri (tasarim.md 4.2)
   -------------------------------------------------------------------------- */
GRANT EXECUTE ON OBJECT::hakedis.HakEdisHesapla TO rol_uygulama;
GRANT EXECUTE ON OBJECT::hakedis.HakEdisKalemiYaz TO rol_uygulama;
GRANT EXECUTE ON OBJECT::musteri.HesabiAnonimlestir TO rol_uygulama;
GO
