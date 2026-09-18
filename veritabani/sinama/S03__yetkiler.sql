-- giris: uygulama
/* ==========================================================================
   S03 — yetki sınamaları (tasarim.md 7.5, adım kodları YS-01 … YS-16)

   Üç giriş sırayla: uygulama (YS-01…YS-10), yonetici (YS-11…YS-13),
   rapor (YS-14…YS-16). Her bölüm ayrı sqlcmd oturumudur; değişken taşınmaz.

   BEKLENEN 229: yetki reddi. İfadeler WHERE 1 = 0 ya da TOP (0) ile yazılır;
   yetki denetimi çalıştırmadan önce yapıldığı için satır olmasa da 229 gelir
   ve sınama veriye dokunmaz.

   Yazan adımlar (YS-09 saklama, YS-12 şifre sıfırlama) kendi işlemlerinde
   açılıp geri alınır.

   BEKLENTİ TUTMAZSA: THROW 59999, N'<adım kodu>: beklenen <no>, gelen <no>'.
   ========================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Adim      nvarchar(20);
DECLARE @Beklenen  int;
DECLARE @Gelen     int;
DECLARE @Mesaj     nvarchar(2048);
DECLARE @HataMetni nvarchar(2048);
DECLARE @Sayi      int;
DECLARE @Sira      int;

/* YS-01  UPDATE/DELETE denetim.IslemKaydi; UPDATE/DELETE kvkk.RizaOlayi;
          INSERT kvkk.MetinSurumu → 229 */
SET @Sira = 1;
WHILE @Sira <= 5
BEGIN
    SET @Adim = CONCAT(N'YS-01.', @Sira); SET @Beklenen = 229; SET @Gelen = 0;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF @Sira = 1 UPDATE denetim.IslemKaydi SET IlgiliNumara = N'S03' WHERE 1 = 0;
        ELSE IF @Sira = 2 DELETE denetim.IslemKaydi WHERE 1 = 0;
        ELSE IF @Sira = 3 UPDATE kvkk.RizaOlayi SET RizaNotu = N'S03' WHERE 1 = 0;
        ELSE IF @Sira = 4 DELETE kvkk.RizaOlayi WHERE 1 = 0;
        ELSE
            INSERT kvkk.MetinSurumu (MetinKodu, Surum, DilKodu, Baslik, IcerikJson, IcerikOzeti, AsilMetin, MetinTarihi)
            SELECT TOP (0) MetinKodu, Surum, DilKodu, Baslik, IcerikJson, IcerikOzeti, AsilMetin, MetinTarihi
              FROM kvkk.MetinSurumu;
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

/* YS-02  INSERT talep.DurumGecmisi → 229 */
SET @Adim = N'YS-02'; SET @Beklenen = 229; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.DurumGecmisi (TalepKimlik, YeniDurumKodu, MusteriyeBildirildi, YapanTuruKodu, KaynakUygulamaKodu)
    SELECT TOP (0) Kimlik, DurumKodu, 0, YapanTuruKodu, KaynakUygulamaKodu FROM talep.Talep;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* YS-03  SELECT sistem.NumaraSayaci; SELECT dbo.SemaGecmisi → 229 */
SET @Sira = 1;
WHILE @Sira <= 2
BEGIN
    SET @Adim = CONCAT(N'YS-03.', @Sira); SET @Beklenen = 229; SET @Gelen = 0;
    BEGIN TRY
        IF @Sira = 1 SELECT @Sayi = COUNT(*) FROM sistem.NumaraSayaci;
        ELSE SELECT @Sayi = COUNT(*) FROM dbo.SemaGecmisi;
    END TRY
    BEGIN CATCH
        SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    END CATCH;
    IF @Gelen <> @Beklenen
    BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;
    SET @Sira = @Sira + 1;
END;

/* YS-04  UPDATE erisim.Kullanici SET SifreKaydi; UPDATE musteri.Hesap SET SifreKaydi → 230
          (prosedür yolu erisim.SifreYaz / musteri.SifreYaz S01'de sınandı)

   NEDEN 229 DEĞİL 230: bu iki DENY kolon düzeyindedir (Bölüm 4.3). SQL
   Server nesne düzeyi reddinde 229, kolon düzeyi reddinde 230 verir. 7.5'te
   "229" yazılıydı; ölçülen 230 ve doğrusu odur — kolonun reddedildiğini
   söyleyen ayrı numara, sınamanın nesne reddiyle karışmasını da önler.
   tasarim.md 7.5'e 18.09.2026 notu düşüldü. */
SET @Sira = 1;
WHILE @Sira <= 2
BEGIN
    SET @Adim = CONCAT(N'YS-04.', @Sira); SET @Beklenen = 230; SET @Gelen = 0;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF @Sira = 1 UPDATE erisim.Kullanici SET SifreKaydi = N'$a$b' WHERE 1 = 0;
        ELSE UPDATE musteri.Hesap SET SifreKaydi = N'$a$b' WHERE 1 = 0;
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

/* YS-05  DELETE talep.Dekont; dosya.Dosya; erisim.Oturum; erisim.GirisDenemesi;
          sistem.TekrarAnahtari → 229 */
SET @Sira = 1;
WHILE @Sira <= 5
BEGIN
    SET @Adim = CONCAT(N'YS-05.', @Sira); SET @Beklenen = 229; SET @Gelen = 0;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF @Sira = 1 DELETE talep.Dekont WHERE 1 = 0;
        ELSE IF @Sira = 2 DELETE dosya.Dosya WHERE 1 = 0;
        ELSE IF @Sira = 3 DELETE erisim.Oturum WHERE 1 = 0;
        ELSE IF @Sira = 4 DELETE erisim.GirisDenemesi WHERE 1 = 0;
        ELSE DELETE sistem.TekrarAnahtari WHERE 1 = 0;
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

/* YS-06  UPDATE/DELETE talep.ZiyaretParcaSatiri; INSERT hakedis.HakEdisKalemi → 229;
          UPDATE hakedis.HakEdis SET NetTutar → 230 (kolon düzeyi DENY; YS-04'e bak) */
SET @Sira = 1;
WHILE @Sira <= 4
BEGIN
    SET @Adim = CONCAT(N'YS-06.', @Sira);
    SET @Beklenen = CASE WHEN @Sira = 4 THEN 230 ELSE 229 END; SET @Gelen = 0;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF @Sira = 1 UPDATE talep.ZiyaretParcaSatiri SET Adet = 1 WHERE 1 = 0;
        ELSE IF @Sira = 2 DELETE talep.ZiyaretParcaSatiri WHERE 1 = 0;
        ELSE IF @Sira = 3
            INSERT hakedis.HakEdisKalemi (HakEdisKimlik, KalemTuruKodu, Tutar)
            SELECT TOP (0) Kimlik, N'diger', 0 FROM hakedis.HakEdis;
        ELSE UPDATE hakedis.HakEdis SET NetTutar = 1 WHERE 1 = 0;
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

/* YS-07  INSERT kod.TalepDurumu; INSERT katalog.Parca; UPDATE sistem.Ayar → 229 */
SET @Sira = 1;
WHILE @Sira <= 3
BEGIN
    SET @Adim = CONCAT(N'YS-07.', @Sira); SET @Beklenen = 229; SET @Gelen = 0;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF @Sira = 1
            INSERT kod.TalepDurumu (Kod, Ad, Kapali) SELECT TOP (0) Kod, Ad, Kapali FROM kod.TalepDurumu;
        ELSE IF @Sira = 2
            INSERT katalog.Parca (MarkaKodu, Kod, Ad, GrupKodu)
            SELECT TOP (0) MarkaKodu, Kod, Ad, GrupKodu FROM katalog.Parca;
        ELSE UPDATE sistem.Ayar SET Deger = N'1' WHERE 1 = 0;
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

/* YS-08  EXEC yonetim.TalebiKapat → 229; EXEC yardim.Ara → 229;
          SELECT gorunum.TalepListesi → 229; SELECT gorunum.GecerliAyar → geçer */
SET @Adim = N'YS-08.1'; SET @Beklenen = 229; SET @Gelen = 0;
BEGIN TRY
    EXEC yonetim.TalebiKapat @TalepNumarasi = N'SRV2600001', @Gerekce = N'<Codex metni: S03 gerekçesi>',
         @YapanGirisAdi = N'ornek.yonetici', @Uygula = 0;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'YS-08.2'; SET @Beklenen = 229; SET @Gelen = 0;
BEGIN TRY
    EXEC yardim.Ara @Metin = N'paksan';
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'YS-08.3'; SET @Beklenen = 229; SET @Gelen = 0;
BEGIN TRY
    SELECT @Sayi = COUNT(*) FROM gorunum.TalepListesi;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'YS-08.4'; SET @Gelen = 0;
BEGIN TRY
    SELECT @Sayi = COUNT(*) FROM gorunum.GecerliAyar;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

/* YS-09  EXEC sistem.SaklamaUygula → geçer (silme yapar; geri alınır) */
SET @Adim = N'YS-09'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC sistem.SaklamaUygula @EnFazlaSatir = 10;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

/* YS-10  UPDATE hakedis.ServisHesapHareketi SET GeriAlinmaZamani → 230
          (kolon düzeyi DENY; gerekçe YS-04'te) */
SET @Adim = N'YS-10'; SET @Beklenen = 230; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE hakedis.ServisHesapHareketi SET GeriAlinmaZamani = SYSUTCDATETIME() WHERE 1 = 0;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

PRINT 'S03 uygulama bölümü tamam.';

-- giris: yonetici
/* ==========================================================================
   S03 — yönetici bölümü (YS-11 … YS-13)

   Yönetici okur, yardim ve yonetim çalıştırır; hiçbir tabloya doğrudan
   yazamaz (veritabanı düzeyinde DENY INSERT, UPDATE, DELETE). yonetim
   prosedürleri dbo sahipli olduğu için sahiplik zinciriyle yazabilir.
   ========================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Adim      nvarchar(20);
DECLARE @Beklenen  int;
DECLARE @Gelen     int;
DECLARE @Mesaj     nvarchar(2048);
DECLARE @HataMetni nvarchar(2048);
DECLARE @Sayi      int;
DECLARE @Sira      int;
DECLARE @Once      int;

/* YS-11  Herhangi bir tabloya INSERT/UPDATE/DELETE (denetim.IslemKaydi dahil) → 229 */
SET @Sira = 1;
WHILE @Sira <= 5
BEGIN
    SET @Adim = CONCAT(N'YS-11.', @Sira); SET @Beklenen = 229; SET @Gelen = 0;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF @Sira = 1 UPDATE talep.Talep SET Aciklama = N'S03' WHERE 1 = 0;
        ELSE IF @Sira = 2 DELETE talep.Talep WHERE 1 = 0;
        ELSE IF @Sira = 3
            INSERT musteri.Hesap (KonumUlkeKodu, DurumKodu) SELECT TOP (0) KonumUlkeKodu, DurumKodu FROM musteri.Hesap;
        ELSE IF @Sira = 4
            INSERT denetim.IslemKaydi (IslemTuruKodu, YapanTuruKodu, KaynakUygulamaKodu)
            SELECT TOP (0) IslemTuruKodu, YapanTuruKodu, KaynakUygulamaKodu FROM denetim.IslemKaydi;
        ELSE DELETE denetim.IslemKaydi WHERE 1 = 0;
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

/* YS-12  EXEC yonetim.GirisSifresiniSifirla @Uygula = 1 → geçer, işlem kaydı
          yazılır; SELECT * FROM erisim.Kullanici → geçer */
SET @Adim = N'YS-12.1'; SET @Gelen = 0; SET @Sayi = -1;
BEGIN TRY
    BEGIN TRANSACTION;
    SELECT @Once = COUNT(*) FROM denetim.IslemKaydi WHERE IslemTuruKodu = N'girisSifresiSifirlandi';
    EXEC yonetim.GirisSifresiniSifirla
         @GirisAdi = N'ornek.satis',
         @Gerekce = N'<Codex metni: S03 şifre sıfırlama gerekçesi>',
         @YapanGirisAdi = N'ornek.yonetici',
         @Uygula = 1;
    SELECT @Sayi = COUNT(*) - @Once FROM denetim.IslemKaydi WHERE IslemTuruKodu = N'girisSifresiSifirlandi';
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;
IF @Sayi <> 1
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen 1 işlem kaydı, gelen ', @Sayi); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'YS-12.2'; SET @Gelen = 0;
BEGIN TRY
    SELECT @Sayi = COUNT(*) FROM erisim.Kullanici;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

/* YS-13  EXEC erisim.SifreYaz; EXEC musteri.HesabiAnonimlestir → 229 */
SET @Sira = 1;
WHILE @Sira <= 2
BEGIN
    SET @Adim = CONCAT(N'YS-13.', @Sira); SET @Beklenen = 229; SET @Gelen = 0;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF @Sira = 1
            EXEC erisim.SifreYaz @KullaniciKimlik = '00000000-0000-0000-0000-000000000000',
                 @SifreKaydi = N'$scrypt$ln=15,r=8,p=1$c01tdXo$b3pldA';
        ELSE
            EXEC musteri.HesabiAnonimlestir @HesapKimlik = '00000000-0000-0000-0000-000000000000';
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

PRINT 'S03 yönetici bölümü tamam.';

-- giris: rapor
/* ==========================================================================
   S03 — rapor bölümü (YS-14 … YS-16)

   Rapor rolü yalnız Bölüm 4.2'de adı yazılı görünümleri okur. İş şemaları
   ve kişisel görünümler kapalıdır; açık görünümlerde kişisel, şifreli,
   özetli ya da maskeli kolon adı bulunmaz (CD-RAPOR-KOLON'un aynı ağı).
   ========================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Adim      nvarchar(20);
DECLARE @Beklenen  int;
DECLARE @Gelen     int;
DECLARE @Mesaj     nvarchar(2048);
DECLARE @HataMetni nvarchar(2048);
DECLARE @Sayi      int;
DECLARE @Sira      int;
DECLARE @Kolonlar  nvarchar(2000);

/* YS-14  SELECT talep.Talep; gorunum.MusteriKarti; gorunum.TalepListesi → 229 */
SET @Sira = 1;
WHILE @Sira <= 3
BEGIN
    SET @Adim = CONCAT(N'YS-14.', @Sira); SET @Beklenen = 229; SET @Gelen = 0;
    BEGIN TRY
        IF @Sira = 1 SELECT @Sayi = COUNT(*) FROM talep.Talep;
        ELSE IF @Sira = 2 SELECT @Sayi = COUNT(*) FROM gorunum.MusteriKarti;
        ELSE SELECT @Sayi = COUNT(*) FROM gorunum.TalepListesi;
    END TRY
    BEGIN CATCH
        SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    END CATCH;
    IF @Gelen <> @Beklenen
    BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;
    SET @Sira = @Sira + 1;
END;

/* YS-15  SELECT gorunum.TalepIstatistigi; gorunum.HakEdisListesi → geçer;
          kişisel/şifreli/özet/maskeli kolon yok */
SET @Sira = 1;
WHILE @Sira <= 2
BEGIN
    SET @Adim = CONCAT(N'YS-15.', @Sira); SET @Gelen = 0;
    BEGIN TRY
        IF @Sira = 1 SELECT @Sayi = COUNT(*) FROM gorunum.TalepIstatistigi;
        ELSE SELECT @Sayi = COUNT(*) FROM gorunum.HakEdisListesi;
    END TRY
    BEGIN CATCH
        SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    END CATCH;
    IF @Gelen <> 0
    BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;
    SET @Sira = @Sira + 1;
END;

SET @Adim = N'YS-15.3';
SET @Kolonlar = NULL;
SELECT @Kolonlar = STRING_AGG(CONCAT(OBJECT_NAME(c.object_id), N'.', c.name), N', ')
  FROM sys.columns AS c
 WHERE c.object_id IN (OBJECT_ID(N'gorunum.TalepIstatistigi'), OBJECT_ID(N'gorunum.HakEdisListesi'))
   AND (c.name LIKE N'%Telefon%' OR c.name LIKE N'%Adres%' OR c.name LIKE N'%Eposta%'
        OR c.name LIKE N'%MusteriAdi%' OR c.name LIKE N'%SahibiAdi%' OR c.name LIKE N'%AdSoyad%'
        OR c.name LIKE N'%Maskeli%' OR c.name LIKE N'%Aciklama%' OR c.name LIKE N'%Metin%'
        OR c.name LIKE N'%Notu%' OR c.name LIKE N'%Nedeni%'
        OR c.name LIKE N'%Sifreli%' OR c.name LIKE N'%Ozeti%');
IF @Kolonlar IS NOT NULL
BEGIN SET @Mesaj = CONCAT(@Adim, N': rapor görünümünde yasak kolon adı: ', @Kolonlar); THROW 59999, @Mesaj, 1; END;

/* YS-16  EXEC yardim.Ara → 229 */
SET @Adim = N'YS-16'; SET @Beklenen = 229; SET @Gelen = 0;
BEGIN TRY
    EXEC yardim.Ara @Metin = N'paksan';
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

PRINT 'S03 rapor bölümü tamam.';
