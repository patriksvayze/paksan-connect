-- giris: uygulama
/* ==========================================================================
   S01 — kısıt sınamaları (tasarim.md 7.3, adım kodları KS-01 … KS-70)

   YAPI
     1. bölüm  uygulama girişi: sahne + kısıtların çoğu
     2. bölüm  sahip girişi: yalnız sahip yazabildiği ya da sahibe karşı da
               koruyan adımlar (tasarim.md 6.6 "işaretli adımlar sahip")

   NEDEN İKİ BÖLÜM: uygulama rolü katalog, kod listeleri, sirket, sistem.Ayar
   ve sistem.NumaraSayaci tablolarına yazamaz (Bölüm 4.2). Bu tablolara veri
   isteyen adımlar 547 yerine 229 alırdı; onlar sahip bölümündedir ve kendi
   işlemlerinde açılıp geri alınır, veritabanında iz bırakmazlar.

   İŞLEM DÜZENİ: her adım kendi BEGIN TRANSACTION … ROLLBACK'ini açar.
   Tetikleyici hatası işlemi bozulmuş (XACT_STATE = -1) bıraktığı için
   SAVE TRANSACTION kullanılmaz. Geriye yalnız aşağıdaki sahne kalır.

   SAHNE (uygulama bölümünün başında yazılır ve KALIR)
     KS-56 (Node) "bekliyor durumunda, NetTutar kalem toplamına eşit" bir hak
     ediş arar; onu bu sahne bırakır. Sahne ayrıca S01'in kendi adımlarına
     talep, ziyaret ve hak ediş verir. Şema değişmediği için ES-20 parmak izi
     etkilenmez.

   BEKLENTİ TUTMAZSA: THROW 59999, N'<adım kodu>: beklenen <no>, gelen <no>'
   (tasarim.md 6.6). sqlcmd -b ilk hatada durur, adım kırmızı olur.
   ========================================================================== */

/* XACT_ABORT ON: bölüm tek toplu iştir; kapalıyken ifade düzeyinde bir hata
   (515 gibi) yalnız o ifadeyi düşürür, betik sessizce sürer ve yarım sahne
   COMMIT edilir. Açıkken hata TRY/CATCH'e düşer ya da toplu işi durdurur. */
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Adim       nvarchar(20);
DECLARE @Beklenen   int;
DECLARE @Gelen      int;
DECLARE @Mesaj      nvarchar(2048);
DECLARE @HataMetni  nvarchar(2048);
DECLARE @Sayi       int;
DECLARE @Numara     nvarchar(10);

/* ---------------------------------------------------------------- sahne */

DECLARE @HesapS01   uniqueidentifier = '5A010001-0000-4000-8000-000000000001';
DECLARE @MakineS01  uniqueidentifier = '5A010001-0000-4000-8000-000000000002';
DECLARE @TalepS01   uniqueidentifier = '5A010001-0000-4000-8000-000000000003';
DECLARE @ZiyaretS01 uniqueidentifier = '5A010001-0000-4000-8000-000000000004';
DECLARE @HakEdisS01 uniqueidentifier = '5A010001-0000-4000-8000-000000000005';

DECLARE @Servis     uniqueidentifier;
DECLARE @Servis2    uniqueidentifier;
DECLARE @Personel   uniqueidentifier;
DECLARE @PersonelAd nvarchar(150);
DECLARE @ServisKul  uniqueidentifier;

SELECT @Servis = Kimlik FROM servis.Servis WHERE KayitNo = 1;
SELECT @Servis2 = Kimlik FROM servis.Servis WHERE KayitNo = 2;
SELECT @Personel = k.Kimlik, @PersonelAd = p.AdSoyad
  FROM erisim.Kullanici AS k
  JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
 WHERE k.GirisAdi = N'ornek.servis.masasi';
SELECT @ServisKul = Kimlik FROM erisim.Kullanici WHERE GirisAdi = N'konya.servis';

IF @Servis IS NULL OR @Servis2 IS NULL OR @Personel IS NULL OR @ServisKul IS NULL
    THROW 59999, N'S01 sahnesi: örnek veri (servis, personel, servis kullanıcısı) bulunamadı', 1;

EXEC sistem.YapanAyarla
     @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';

/* Sahne bir kez kurulur: betik yeniden çalıştırılabilsin (vt sinama her
   turda veritabanını sıfırdan kurar; bu koşul elle tekrar için). */
IF NOT EXISTS (SELECT 1 FROM talep.Talep WHERE Kimlik = @TalepS01)
BEGIN
BEGIN TRANSACTION;

INSERT musteri.Hesap (Kimlik, KonumUlkeKodu, IlKodu, DurumKodu, TelefonUlkeKodu, TelefonE164, TelefonUlusal)
VALUES (@HesapS01, N'TR', 42, N'aktif', N'TR', N'+905550000101', N'5550000101');

INSERT makine.Makine (Kimlik, SeriNo, MarkaKodu, UrunKodu, OlusmaKaynagiKodu,
                      YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@MakineS01, N'S01PAKSAN0001', N'paksan', N'ipak-rulo', N'personel',
        N'personel', @Personel, @PersonelAd, N'backoffice');

INSERT makine.MakineSahipligi (MakineKimlik, HesapKimlik, KaynakKodu,
                               YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@MakineS01, @HesapS01, N'personel',
        N'personel', @Personel, @PersonelAd, N'backoffice');

INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu,
                    DurumKodu, Kapali, SahipKodu, MasaKodu, HesapKimlik, MakineKimlik,
                    ServisKimlik, ServisAtamaKaynagiKodu, ServisAtamaZamani, KonumUlkeKodu, IlKodu,
                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@TalepS01, N'SRV2690001', N'SRV', N'servis', N'connect', N'paksan',
        N'yeni', 0, N'servis', N'servisMasasi', @HesapS01, @MakineS01,
        @Servis, N'makineAtamasi', SYSUTCDATETIME(), N'TR', 42,
        N'personel', @Personel, @PersonelAd, N'backoffice');

INSERT talep.ServisTalebiAyrinti (TalepKimlik, TurKodu, MakineDurumuKodu)
VALUES (@TalepS01, N'servis', N'sorunlu');

INSERT talep.ServisZiyareti (Kimlik, ZiyaretNo, TalepKimlik, TurKodu, UyduKodu, MarkaKodu,
                             ServisKimlik, AsamaKodu, KapiKodu, YapilanIsKodu, Km, IscilikTutari,
                             ParaBirimiKodu, TamamlanmaZamani,
                             YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@ZiyaretS01, 1, @TalepS01, N'servis', N'servisZiyareti', N'paksan',
        @Servis, N'bitti', N'garanti', N'parcaDegisimi', 10, 100,
        N'TRY', SYSUTCDATETIME(),
        N'servis', @ServisKul, N'S01', N'servisim');

INSERT hakedis.HakEdis (Kimlik, ZiyaretKimlik, TalepKimlik, ServisKimlik, MarkaKodu, SirketKodu,
                        KapiKodu, AsamaKodu, ParaBirimiKodu, DurumKodu, NetTutar)
VALUES (@HakEdisS01, @ZiyaretS01, @TalepS01, @Servis, N'paksan', N'paksan',
        N'garanti', N'bitti', N'TRY', N'bekliyor', 0);

EXEC hakedis.HakEdisHesapla @HakEdisKimlik = @HakEdisS01;

SELECT @Sayi = CAST(NetTutar AS int) FROM hakedis.HakEdis WHERE Kimlik = @HakEdisS01;
IF @Sayi <> 220
BEGIN
    SET @Mesaj = CONCAT(N'S01 sahnesi: HakEdisHesapla NetTutar 220 olmalıydı, ', @Sayi);
    ROLLBACK TRANSACTION;
    THROW 59999, @Mesaj, 1;
END;

COMMIT TRANSACTION;
END;
PRINT 'S01 sahnesi hazır.';

/* ------------------------------------------------------------ KS-01 … */

/* KS-01  Aynı talep.Talep.Numara iki kez → 2627 */
SET @Adim = N'KS-01'; SET @Beklenen = 2627; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.Talep (Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu, DurumKodu, Kapali,
                        SahipKodu, MakineKimlik, KonumUlkeKodu,
                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'SRV2690001', N'SRV', N'servis', N'connect', N'paksan', N'yeni', 0,
            N'paksan', @MakineS01, N'TR',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-02  Numara biçim dışı (SRV26-0012) → 547 */
SET @Adim = N'KS-02'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.Talep (Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu, DurumKodu, Kapali,
                        SahipKodu, MakineKimlik, KonumUlkeKodu,
                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'SRV26-0012', N'SRV', N'servis', N'connect', N'paksan', N'yeni', 0,
            N'paksan', @MakineS01, N'TR',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-03a  Aynı (MarkaKodu, SeriNo) iki makine → 2627
   (KS-03'ün "aynı seri başka markada geçer" yarısı sahip bölümünde:
   ikinci marka katalog satırı ister.) */
SET @Adim = N'KS-03a'; SET @Beklenen = 2627; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT makine.Makine (SeriNo, MarkaKodu, OlusmaKaynagiKodu,
                          YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'S01PAKSAN0001', N'paksan', N'personel',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-04  erisim.Kullanici aynı giriş adı iki kez (konya personel, sonra servis) → 2627 */
SET @Adim = N'KS-04'; SET @Beklenen = 2627; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT erisim.Kullanici (GirisAdi, TurKodu) VALUES (N'konya', N'personel');
    INSERT erisim.Kullanici (GirisAdi, TurKodu) VALUES (N'konya', N'servis');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-05  Giriş adı biçimi: 'Konya'; 'a..b'; nvarchar parametreyle N'ızmır.merkez' → 547; 547; 547 */
DECLARE @GirisAdlari TABLE (Sira int, Deger nvarchar(40));
INSERT @GirisAdlari (Sira, Deger) VALUES (1, N'Konya'), (2, N'a..b'), (3, N'ızmır.merkez');
DECLARE @Sira int = 1;
DECLARE @GirisAdi nvarchar(40);
WHILE @Sira <= 3
BEGIN
    SELECT @GirisAdi = Deger FROM @GirisAdlari WHERE Sira = @Sira;
    SET @Adim = CONCAT(N'KS-05.', @Sira); SET @Beklenen = 547; SET @Gelen = 0;
    BEGIN TRY
        BEGIN TRANSACTION;
        INSERT erisim.Kullanici (GirisAdi, TurKodu) VALUES (@GirisAdi, N'personel');
        ROLLBACK TRANSACTION;
    END TRY
    BEGIN CATCH
        SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    END CATCH;
    IF @Gelen <> @Beklenen
    BEGIN SET @Mesaj = CONCAT(@Adim, N' (', @GirisAdi, N'): beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;
    SET @Sira = @Sira + 1;
END;

/* KS-06  Aynı E.164 iki hesapta → 2601; geçersiz E.164 → 547 */
SET @Adim = N'KS-06a'; SET @Beklenen = 2601; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT musteri.Hesap (KonumUlkeKodu, DurumKodu, TelefonE164) VALUES (N'TR', N'aktif', N'+905550000101');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-06b'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT musteri.Hesap (KonumUlkeKodu, DurumKodu, TelefonE164) VALUES (N'TR', N'aktif', N'0555 000 01 02');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-07  İki hesapsız (oturumsuz) TEL talebi aynı anda bekliyor → ikisi de geçer */
SET @Adim = N'KS-07'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT musteri.TelefonDegisikligiTalebi (Numara, KaynakUygulamaKodu, KararDurumuKodu, YeniTelefonE164)
    VALUES (N'TEL2690001', N'connect', N'bekliyor', N'+905550000201');
    INSERT musteri.TelefonDegisikligiTalebi (Numara, KaynakUygulamaKodu, KararDurumuKodu, YeniTelefonE164)
    VALUES (N'TEL2690002', N'connect', N'bekliyor', N'+905550000202');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

/* KS-08  Aynı hesaba ikinci açık TEL talebi → 2601 */
SET @Adim = N'KS-08'; SET @Beklenen = 2601; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT musteri.TelefonDegisikligiTalebi (Numara, KaynakUygulamaKodu, KararDurumuKodu, HesapKimlik, YeniTelefonE164)
    VALUES (N'TEL2690003', N'connect', N'bekliyor', @HesapS01, N'+905550000203');
    INSERT musteri.TelefonDegisikligiTalebi (Numara, KaynakUygulamaKodu, KararDurumuKodu, HesapKimlik, YeniTelefonE164)
    VALUES (N'TEL2690004', N'connect', N'bekliyor', @HesapS01, N'+905550000204');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-09  bildirim.Teslimat: aynı duyuruya servis ve personel satırları (HesapKimlik NULL)
          → geçer; aynı (DuyuruKimlik, HesapKimlik) ikinci kez → 2601 */
DECLARE @DuyuruS01 uniqueidentifier = '5A010001-0000-4000-8000-000000000006';
SET @Adim = N'KS-09a'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT duyuru.Duyuru (Kimlik, Baslik, Metin, TurKodu, AltTurKodu, HedefKitleKodu, DilKodu, YayinZamani,
                          YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@DuyuruS01, N'S01 duyuru başlığı', N'S01 duyuru metni',
            N'duyuru', N'kampanya', N'ikisi', N'tr', SYSUTCDATETIME(),
            N'personel', @Personel, @PersonelAd, N'backoffice');
    INSERT bildirim.Teslimat (DuyuruKimlik, ServisKimlik) VALUES (@DuyuruS01, @Servis);
    INSERT bildirim.Teslimat (DuyuruKimlik, KullaniciKimlik) VALUES (@DuyuruS01, @Personel);
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-09b'; SET @Beklenen = 2601; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT duyuru.Duyuru (Kimlik, Baslik, Metin, TurKodu, AltTurKodu, HedefKitleKodu, DilKodu, YayinZamani,
                          YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@DuyuruS01, N'S01 duyuru başlığı', N'S01 duyuru metni',
            N'duyuru', N'kampanya', N'musteri', N'tr', SYSUTCDATETIME(),
            N'personel', @Personel, @PersonelAd, N'backoffice');
    INSERT bildirim.Teslimat (DuyuruKimlik, HesapKimlik) VALUES (@DuyuruS01, @HesapS01);
    INSERT bildirim.Teslimat (DuyuruKimlik, HesapKimlik) VALUES (@DuyuruS01, @HesapS01);
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-21  Bilinmeyen durum kodu (gonderildi) → 547 */
SET @Adim = N'KS-21'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE talep.Talep SET DurumKodu = N'gonderildi' WHERE Kimlik = @TalepS01;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-22  geriCagirma alt türünde müşteri hedefli duyuru → 547 */
SET @Adim = N'KS-22'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT duyuru.Duyuru (Baslik, Metin, TurKodu, AltTurKodu, HedefKitleKodu, DilKodu, YayinZamani,
                          YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'S01 geri çağırma başlığı', N'S01 geri çağırma metni',
            N'uyari', N'geriCagirma', N'musteri', N'tr', SYSUTCDATETIME(),
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-23  Kapalı durum + KapanmaZamani NULL → 547; açık durum + dolu → 547;
          Kapali bayrağı kod tablosuyla çelişen → 547 */
SET @Adim = N'KS-23a'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE talep.Talep SET DurumKodu = N'kapandi', Kapali = 1, KapanmaZamani = NULL WHERE Kimlik = @TalepS01;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-23b'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE talep.Talep SET KapanmaZamani = SYSUTCDATETIME() WHERE Kimlik = @TalepS01;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-23c'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE talep.Talep SET DurumKodu = N'kapandi', Kapali = 0, KapanmaZamani = NULL WHERE Kimlik = @TalepS01;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* Yetki adımlarının ortak yardımcıları: yetkisiz / yetkisi bitmiş servis
   satırları işlem içinde açılır, adımın sonunda geri alınır. */
DECLARE @YetkisizServis uniqueidentifier = '5A010001-0000-4000-8000-0000000000A1';
DECLARE @BitmisServis   uniqueidentifier = '5A010001-0000-4000-8000-0000000000A2';
DECLARE @Talep2         uniqueidentifier = '5A010001-0000-4000-8000-0000000000A3';
DECLARE @Asil           uniqueidentifier = '5A010001-0000-4000-8000-0000000000D1';
DECLARE @Duzeltme       uniqueidentifier = '5A010001-0000-4000-8000-0000000000D2';
DECLARE @Ettn           uniqueidentifier = '5A010001-0000-4000-8000-0000000000E1';
DECLARE @ParcaKodu      nvarchar(24);

/* KS-11  Hiç yetkisi olmayan servise atama → 547 */
SET @Adim = N'KS-11'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT servis.Servis (Kimlik, Ad, PilotKatilimcisi, TurKodu, DurumKodu, IlKodu, OlusmaZamani)
    VALUES (@YetkisizServis, N'S01 Yetkisiz Servis', 0, N'sahis', N'aktif', 42, SYSUTCDATETIME());
    INSERT makine.MakineServisAtamasi (MakineKimlik, MarkaKodu, ServisKimlik, KaynakKodu,
                                       YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@MakineS01, N'paksan', @YetkisizServis, N'personel',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-12  Yetkisi bitmiş servise atama → 547; yetki yeniden verilince → geçer */
SET @Adim = N'KS-12a'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT servis.Servis (Kimlik, Ad, PilotKatilimcisi, TurKodu, DurumKodu, IlKodu, OlusmaZamani)
    VALUES (@BitmisServis, N'S01 Yetkisi Bitmiş Servis', 0, N'sahis', N'aktif', 42, SYSUTCDATETIME());
    INSERT servis.MarkaYetkisi (ServisKimlik, MarkaKodu, BaslangicZamani, BitisZamani)
    VALUES (@BitmisServis, N'paksan', DATEADD(day, -30, SYSUTCDATETIME()), DATEADD(day, -1, SYSUTCDATETIME()));
    INSERT makine.MakineServisAtamasi (MakineKimlik, MarkaKodu, ServisKimlik, KaynakKodu,
                                       YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@MakineS01, N'paksan', @BitmisServis, N'personel',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-12b'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT servis.Servis (Kimlik, Ad, PilotKatilimcisi, TurKodu, DurumKodu, IlKodu, OlusmaZamani)
    VALUES (@BitmisServis, N'S01 Yetkisi Bitmiş Servis', 0, N'sahis', N'aktif', 42, SYSUTCDATETIME());
    INSERT servis.MarkaYetkisi (ServisKimlik, MarkaKodu, BaslangicZamani, BitisZamani)
    VALUES (@BitmisServis, N'paksan', DATEADD(day, -30, SYSUTCDATETIME()), DATEADD(day, -1, SYSUTCDATETIME()));
    UPDATE servis.MarkaYetkisi SET BitisZamani = NULL
     WHERE ServisKimlik = @BitmisServis AND MarkaKodu = N'paksan';
    INSERT makine.MakineServisAtamasi (MakineKimlik, MarkaKodu, ServisKimlik, KaynakKodu,
                                       YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@MakineS01, N'paksan', @BitmisServis, N'personel',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

/* KS-13  Açık atama varken servisin marka yetkisini doğrudan bitirmek → 547 */
SET @Adim = N'KS-13'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT makine.MakineServisAtamasi (MakineKimlik, MarkaKodu, ServisKimlik, KaynakKodu,
                                       YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@MakineS01, N'paksan', @Servis2, N'personel',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    UPDATE servis.MarkaYetkisi SET BitisZamani = SYSUTCDATETIME()
     WHERE ServisKimlik = @Servis2 AND MarkaKodu = N'paksan';
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-14  Yetkisi bitmiş servise yeni talep → 51020; açık talebin servisini
   yetkisiz servise çevirmek → 51020; yetki bitince eski KAPANMIŞ talebe
   dokunmayan güncelleme → geçer (TR_talep_Talep_ServisYetkisi). */
SET @Adim = N'KS-14a'; SET @Beklenen = 51020; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT servis.Servis (Kimlik, Ad, PilotKatilimcisi, TurKodu, DurumKodu, IlKodu, OlusmaZamani)
    VALUES (@BitmisServis, N'S01 Yetkisi Bitmiş Servis', 0, N'sahis', N'aktif', 42, SYSUTCDATETIME());
    INSERT servis.MarkaYetkisi (ServisKimlik, MarkaKodu, BaslangicZamani, BitisZamani)
    VALUES (@BitmisServis, N'paksan', DATEADD(day, -30, SYSUTCDATETIME()), DATEADD(day, -1, SYSUTCDATETIME()));
    INSERT talep.Talep (Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu, DurumKodu, Kapali,
                        SahipKodu, MakineKimlik, ServisKimlik, KonumUlkeKodu,
                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'SRV2690011', N'SRV', N'servis', N'connect', N'paksan', N'yeni', 0,
            N'servis', @MakineS01, @BitmisServis, N'TR',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-14b'; SET @Beklenen = 51020; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT servis.Servis (Kimlik, Ad, PilotKatilimcisi, TurKodu, DurumKodu, IlKodu, OlusmaZamani)
    VALUES (@BitmisServis, N'S01 Yetkisi Bitmiş Servis', 0, N'sahis', N'aktif', 42, SYSUTCDATETIME());
    INSERT servis.MarkaYetkisi (ServisKimlik, MarkaKodu, BaslangicZamani, BitisZamani)
    VALUES (@BitmisServis, N'paksan', DATEADD(day, -30, SYSUTCDATETIME()), DATEADD(day, -1, SYSUTCDATETIME()));
    /* Ziyareti olmayan açık talep: sahnenin talebi kullanılsaydı
       FK_talep_ServisZiyareti_talep_Talep_Servis tetikleyiciden önce 547
       verirdi; sınanan kural servis yetkisi tetikleyicisidir. */
    INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu, DurumKodu, Kapali,
                        SahipKodu, MakineKimlik, ServisKimlik, KonumUlkeKodu,
                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Talep2, N'SRV2690012', N'SRV', N'servis', N'connect', N'paksan', N'yeni', 0,
            N'servis', @MakineS01, @Servis, N'TR',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    UPDATE talep.Talep SET ServisKimlik = @BitmisServis WHERE Kimlik = @Talep2;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-14c'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    /* Talep kapanır, sonra servisin yetkisi biter; kapanmış talebin öteki
       kolonu güncellenebilmeli (tetikleyici kapanmış talebi denetlemez). */
    INSERT talep.Kapanis (TalepKimlik, KapanisTuruKodu,
                          YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@TalepS01, N'personelFormu', N'personel', @Personel, @PersonelAd, N'backoffice');
    UPDATE talep.Talep SET DurumKodu = N'kapandi', Kapali = 1, KapanmaZamani = SYSUTCDATETIME()
     WHERE Kimlik = @TalepS01;
    /* A��k atamalar �nce bitirilir: yetki bitince YetkiEtkin ba�� kalmas�n.
       Atama sat�r� silinmez (uygulama rol�n�n DELETE izni yok, B�l�m 4.2);
       biten atama BitisZamani ile kapan�r. */
    UPDATE makine.MakineServisAtamasi SET BitisZamani = SYSUTCDATETIME()
     WHERE ServisKimlik = @Servis AND BitisZamani IS NULL;
    UPDATE servis.MarkaYetkisi SET BitisZamani = SYSUTCDATETIME()
     WHERE ServisKimlik = @Servis AND MarkaKodu = N'paksan';
    UPDATE talep.Talep SET Aciklama = N'S01 kapanmış talep güncellemesi'
     WHERE Kimlik = @TalepS01;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

/* Parça talebi sahnesi: KS-16, KS-37, KS-64 bunu kullanır. */
DECLARE @ParcaTalep uniqueidentifier = '5A010001-0000-4000-8000-0000000000B1';

/* KS-16  ServisZiyareti'ni parca talebine bağlamak → 547 (tür uydusu kalıbı) */
SET @Adim = N'KS-16'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu, DurumKodu, Kapali,
                        SahipKodu, HesapKimlik, KonumUlkeKodu,
                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@ParcaTalep, N'YPR2690001', N'YPR', N'parca', N'connect', N'paksan', N'yeni', 0,
            N'paksan', @HesapS01, N'TR',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    INSERT talep.ServisZiyareti (ZiyaretNo, TalepKimlik, TurKodu, UyduKodu, MarkaKodu, ServisKimlik,
                                 AsamaKodu, KapiKodu,
                                 YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (1, @ParcaTalep, N'parca', N'servisZiyareti', N'paksan', @Servis,
            N'parca', N'parcaIste',
            N'servis', @ServisKul, N'S01', N'servisim');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-17  Uydu tabloda UyduKodu farklı değer → 547 */
SET @Adim = N'KS-17'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.ServisZiyareti (ZiyaretNo, TalepKimlik, TurKodu, UyduKodu, MarkaKodu, ServisKimlik,
                                 AsamaKodu, KapiKodu,
                                 YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (2, @TalepS01, N'servis', N'faturaBilgisi', N'paksan', @Servis,
            N'parca', N'parcaIste',
            N'servis', @ServisKul, N'S01', N'servisim');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-18  Aynı ziyarete ikinci hak ediş → 2627 */
SET @Adim = N'KS-18'; SET @Beklenen = 2627; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT hakedis.HakEdis (ZiyaretKimlik, TalepKimlik, ServisKimlik, MarkaKodu, SirketKodu,
                            KapiKodu, AsamaKodu, ParaBirimiKodu, DurumKodu, NetTutar)
    VALUES (@ZiyaretS01, @TalepS01, @Servis, N'paksan', N'paksan',
            N'garanti', N'bitti', N'TRY', N'bekliyor', 0);
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-19  parca aşamasındaki ya da garanti olmayan kapılı ziyarete hak ediş → 547 */
SET @Adim = N'KS-19'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    DECLARE @ParcaZiyaret uniqueidentifier = '5A010001-0000-4000-8000-0000000000B2';
    INSERT talep.ServisZiyareti (Kimlik, ZiyaretNo, TalepKimlik, TurKodu, UyduKodu, MarkaKodu, ServisKimlik,
                                 AsamaKodu, KapiKodu,
                                 YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@ParcaZiyaret, 3, @TalepS01, N'servis', N'servisZiyareti', N'paksan', @Servis,
            N'parca', N'parcaIste',
            N'servis', @ServisKul, N'S01', N'servisim');
    INSERT hakedis.HakEdis (ZiyaretKimlik, TalepKimlik, ServisKimlik, MarkaKodu, SirketKodu,
                            KapiKodu, AsamaKodu, ParaBirimiKodu, DurumKodu, NetTutar)
    VALUES (@ParcaZiyaret, @TalepS01, @Servis, N'paksan', N'paksan',
            N'garanti', N'bitti', N'TRY', N'bekliyor', 0);
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-24  Negatif tutar → 547; geçersiz JSON → 547 */
SET @Adim = N'KS-24a'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.Kapanis (TalepKimlik, KapanisTuruKodu, UcretTutari, ParaBirimiKodu,
                          YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@TalepS01, N'personelFormu', -1, N'TRY',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-24b'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT denetim.IslemKaydi (IslemTuruKodu, YapanTuruKodu, KaynakUygulamaKodu, AyrintiJson)
    VALUES (N'talepOlusturuldu', N'sistem', N'api', N'gecersiz-json');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-25  FiyatZorunlu = 1 sonuçla fiyatsız kapanış → 547;
          TeklifSonucuKodu dolu, FiyatZorunlu NULL → 547 */
SET @Adim = N'KS-25a'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.Kapanis (TalepKimlik, KapanisTuruKodu, TeklifSonucuKodu, FiyatZorunlu,
                          YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@TalepS01, N'personelFormu', N'satisOldu', 1,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-25b'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.Kapanis (TalepKimlik, KapanisTuruKodu, TeklifSonucuKodu, FiyatZorunlu,
                          YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@TalepS01, N'personelFormu', N'musteriVazgecti', NULL,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-26  AciklamaZorunlu = 1 nedenle açıklamasız iptal → 547 */
SET @Adim = N'KS-26'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.Iptal (TalepKimlik, IptalNedeniKodu, AciklamaZorunlu, Aciklama,
                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@TalepS01, N'baskaNeden', 1, NULL,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-27  HakEdisKalemiYaz yol türüyle → 51044; onaylı hak edişe kalem → 51043 */
SET @Adim = N'KS-27a'; SET @Beklenen = 51044; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC hakedis.HakEdisKalemiYaz @HakEdisKimlik = @HakEdisS01, @KalemTuruKodu = N'yol', @Tutar = 50;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-27b'; SET @Beklenen = 51043; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE hakedis.HakEdis
       SET DurumKodu = N'onaylandi', OnayZamani = SYSUTCDATETIME(),
           OnaylayanKullaniciKimlik = @Personel, OnaylayanAdi = @PersonelAd,
           KdvOrani = 0, KdvTutari = 0, TevkifatOrani = 0, TevkifatTutari = 0,
           StopajOrani = 0, StopajTutari = 0
     WHERE Kimlik = @HakEdisS01;
    EXEC hakedis.HakEdisKalemiYaz @HakEdisKimlik = @HakEdisS01, @KalemTuruKodu = N'diger', @Tutar = 50;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* Dönem dökümü adımlarının ortak kimlikleri */
DECLARE @Dokum  uniqueidentifier = '5A010001-0000-4000-8000-0000000000C1';
DECLARE @Dokum2 uniqueidentifier = '5A010001-0000-4000-8000-0000000000C2';

/* KS-28  DonemDokumu.OdenecekTutar formülle uyuşmuyor → 547 */
SET @Adim = N'KS-28'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT hakedis.DonemDokumu (Numara, ServisKimlik, SirketKodu, ParaBirimiKodu, DurumKodu,
                                DonemYili, DonemAyi, NetToplam, KdvToplam, TevkifatToplam,
                                StopajToplam, MahsupToplam, OdenecekTutar,
                                YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'HAK2690001', @Servis, N'paksan', N'TRY', N'taslak',
            2026, 7, 1000, 200, 40, 0, 0, 999,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-29a  Aynı servis, şirket, para birimi, ay için ikinci döküm → 2601
   (KS-29'un "farklı şirketle geçer" yarısı sahip bölümünde: ikinci şirket
   satırı ister.) */
SET @Adim = N'KS-29a'; SET @Beklenen = 2601; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT hakedis.DonemDokumu (Kimlik, Numara, ServisKimlik, SirketKodu, ParaBirimiKodu, DurumKodu,
                                DonemYili, DonemAyi, OdenecekTutar,
                                YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Dokum, N'HAK2690001', @Servis, N'paksan', N'TRY', N'taslak', 2026, 7, 0,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    INSERT hakedis.DonemDokumu (Kimlik, Numara, ServisKimlik, SirketKodu, ParaBirimiKodu, DurumKodu,
                                DonemYili, DonemAyi, OdenecekTutar,
                                YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Dokum2, N'HAK2690002', @Servis, N'paksan', N'TRY', N'taslak', 2026, 7, 0,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-30  Başka servisin dökümüne hak ediş bağlamak → 547 */
SET @Adim = N'KS-30'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT hakedis.DonemDokumu (Kimlik, Numara, ServisKimlik, SirketKodu, ParaBirimiKodu, DurumKodu,
                                DonemYili, DonemAyi, OdenecekTutar,
                                YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Dokum, N'HAK2690003', @Servis2, N'paksan', N'TRY', N'taslak', 2026, 8, 0,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    UPDATE hakedis.HakEdis SET DonemDokumuKimlik = @Dokum WHERE Kimlik = @HakEdisS01;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-31  odeme hareketi dökümsüz ya da belgesiz → 547 */
SET @Adim = N'KS-31'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT hakedis.ServisHesapHareketi (ServisKimlik, SirketKodu, HareketTuruKodu, YonKodu,
                                        ParaBirimiKodu, Tutar,
                                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Servis, N'paksan', N'odeme', N'borc', N'TRY', 100,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-34  Onaylı hak edişte vergi tutarı boş → 547; bekliyor hak edişte OnayZamani dolu → 547 */
SET @Adim = N'KS-34a'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE hakedis.HakEdis
       SET DurumKodu = N'onaylandi', OnayZamani = SYSUTCDATETIME(),
           OnaylayanKullaniciKimlik = @Personel, OnaylayanAdi = @PersonelAd,
           KdvTutari = NULL, TevkifatTutari = 0, StopajTutari = 0
     WHERE Kimlik = @HakEdisS01;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-34b'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE hakedis.HakEdis SET OnayZamani = SYSUTCDATETIME() WHERE Kimlik = @HakEdisS01;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-33  hakEdisAlacagi tutarı Bölüm 1.9.3 formülünden farklı → 51042;
          ters hareket asıldan farklı tutarla → 51042
   Onaylı hak ediş: NetTutar 220, KDV %20 = 44,00, tevkifat %20 = 8,80.
   Doğru cari etkisi 220 + 44 − 8,80 − 0 = 255,20. */
SET @Adim = N'KS-33a'; SET @Beklenen = 51042; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE hakedis.HakEdis
       SET DurumKodu = N'onaylandi', OnayZamani = SYSUTCDATETIME(),
           OnaylayanKullaniciKimlik = @Personel, OnaylayanAdi = @PersonelAd,
           KdvOrani = 0.2000, KdvTutari = 44.00,
           TevkifatOrani = 0.2000, TevkifatTutari = 8.80,
           StopajOrani = 0.0000, StopajTutari = 0.00
     WHERE Kimlik = @HakEdisS01;
    INSERT hakedis.ServisHesapHareketi (ServisKimlik, SirketKodu, HareketTuruKodu, YonKodu,
                                        ParaBirimiKodu, Tutar, HakEdisKimlik,
                                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Servis, N'paksan', N'hakEdisAlacagi', N'alacak', N'TRY', 255.00, @HakEdisS01,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-33b'; SET @Beklenen = 51042; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE hakedis.HakEdis
       SET DurumKodu = N'onaylandi', OnayZamani = SYSUTCDATETIME(),
           OnaylayanKullaniciKimlik = @Personel, OnaylayanAdi = @PersonelAd,
           KdvOrani = 0.2000, KdvTutari = 44.00,
           TevkifatOrani = 0.2000, TevkifatTutari = 8.80,
           StopajOrani = 0.0000, StopajTutari = 0.00
     WHERE Kimlik = @HakEdisS01;
    INSERT hakedis.ServisHesapHareketi (Kimlik, ServisKimlik, SirketKodu, HareketTuruKodu, YonKodu,
                                        ParaBirimiKodu, Tutar, HakEdisKimlik,
                                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Asil, @Servis, N'paksan', N'hakEdisAlacagi', N'alacak', N'TRY', 255.20, @HakEdisS01,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    INSERT hakedis.ServisHesapHareketi (ServisKimlik, SirketKodu, HareketTuruKodu, YonKodu,
                                        ParaBirimiKodu, Tutar, DuzeltilenHareketKimlik,
                                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Servis, N'paksan', N'duzeltmeBorc', N'borc', N'TRY', 200.00, @Asil,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-35  ParcaSatiri: Adet NULL + KatalogDisi 0 → 547; Adet NULL + KatalogDisi 1 +
          Tutar NULL → geçer; Adet 0 → 547; Adet NULL + Tutar dolu → 547 */
SELECT TOP (1) @ParcaKodu = Kod FROM katalog.Parca WHERE MarkaKodu = N'paksan' ORDER BY Kod;

SET @Adim = N'KS-35a'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.ParcaSatiri (TalepKimlik, MarkaKodu, SiraNo, ParcaAdi, KatalogDisi, ParcaKodu, Adet)
    VALUES (@TalepS01, N'paksan', 1, N'S01 Parça Adı', 0, @ParcaKodu, NULL);
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-35b'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.ParcaSatiri (TalepKimlik, MarkaKodu, SiraNo, ParcaAdi, KatalogDisi, ParcaKodu, Adet, BirimFiyat, Tutar)
    VALUES (@TalepS01, N'paksan', 2, N'S01 Katalog Dışı Parça', 1, NULL, NULL, NULL, NULL);
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-35c'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.ParcaSatiri (TalepKimlik, MarkaKodu, SiraNo, ParcaAdi, KatalogDisi, ParcaKodu, Adet)
    VALUES (@TalepS01, N'paksan', 3, N'S01 Parça Adı', 0, @ParcaKodu, 0);
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-35d'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.ParcaSatiri (TalepKimlik, MarkaKodu, SiraNo, ParcaAdi, KatalogDisi, ParcaKodu, Adet, Tutar)
    VALUES (@TalepS01, N'paksan', 4, N'S01 Katalog Dışı Parça', 1, NULL, NULL, 100);
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-36  ZiyaretParcaSatiri.Adet = 0 → 547; ZiyaretDuzeltmesiParcasi.Adet = 0 → 547 */
SET @Adim = N'KS-36a'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.ZiyaretParcaSatiri (ZiyaretKimlik, MarkaKodu, SiraNo, ParcaAdi, ParcaKodu, Adet)
    VALUES (@ZiyaretS01, N'paksan', 1, N'S01 Parça Adı', @ParcaKodu, 0);
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-36b'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.ZiyaretDuzeltmesi (Kimlik, ZiyaretKimlik, MarkaKodu, Neden,
                                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Duzeltme, @ZiyaretS01, N'paksan', N'S01 düzeltme nedeni',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    INSERT talep.ZiyaretDuzeltmesiParcasi (DuzeltmeKimlik, TarafKodu, MarkaKodu, SiraNo, ParcaAdi, ParcaKodu, Adet)
    VALUES (@Duzeltme, N'yeni', N'paksan', 1, N'S01 Parça Adı', @ParcaKodu, 0);
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-37  OdenecekTutar dolu, TutarDogrulamaZamani boş → 547 */
SET @Adim = N'KS-37'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu, DurumKodu, Kapali,
                        SahipKodu, HesapKimlik, KonumUlkeKodu,
                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@ParcaTalep, N'YPR2690002', N'YPR', N'parca', N'connect', N'paksan', N'yeni', 0,
            N'paksan', @HesapS01, N'TR',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    INSERT talep.ParcaTalebiAyrinti (TalepKimlik, TurKodu, OdemeYontemiKodu, SirketKodu,
                                     ParaBirimiKodu, OdenecekTutar)
    VALUES (@ParcaTalep, N'parca', N'havale', N'paksan', N'TRY', 100);
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-40  erisim.Rol: pasif rolle aynı adda yeni rol → geçer; iki aktif rol → 2601 */
SET @Adim = N'KS-40a'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT erisim.Rol (Ad, Aktif) VALUES (N'S01 Rol Adı', 0);
    INSERT erisim.Rol (Ad, Aktif) VALUES (N'S01 Rol Adı', 1);
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-40b'; SET @Beklenen = 2601; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT erisim.Rol (Ad, Aktif) VALUES (N'S01 Rol Adı', 1);
    INSERT erisim.Rol (Ad, Aktif) VALUES (N'S01 Rol Adı', 1);
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-41  CariKarti iki hedef dolu → 547; aynı (logo, FirmaNo, CariKodu) iki kez → 2601 */
SET @Adim = N'KS-41a'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT entegrasyon.CariKarti (DisSistemKodu, FirmaNo, CariKodu, KaynakKodu, HesapKimlik, ServisKimlik)
    VALUES (N'logo', 1, N'120.S01.0001', N'personel', @HesapS01, @Servis);
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-41b'; SET @Beklenen = 2601; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT entegrasyon.CariKarti (DisSistemKodu, FirmaNo, CariKodu, KaynakKodu, HesapKimlik)
    VALUES (N'logo', 1, N'120.S01.0001', N'personel', @HesapS01);
    INSERT entegrasyon.CariKarti (DisSistemKodu, FirmaNo, CariKodu, KaynakKodu, ServisKimlik)
    VALUES (N'logo', 1, N'120.S01.0001', N'personel', @Servis);
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-42  BelgeBagi: aynı Ettn iki kez → 2601; tanımlayıcısız → 547;
          aynı firma + tür + belge no + tarih iki kez → 2601 */
SET @Adim = N'KS-42a'; SET @Beklenen = 2601; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT entegrasyon.BelgeBagi (DisSistemKodu, BelgeTuruKodu, KaynakKodu, Ettn, FirmaNo,
                                  YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'logo', N'satisFaturasi', N'personel', @Ettn, 1,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    INSERT entegrasyon.BelgeBagi (DisSistemKodu, BelgeTuruKodu, KaynakKodu, Ettn, FirmaNo,
                                  YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'logo', N'alisFaturasi', N'personel', @Ettn, 1,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-42b'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT entegrasyon.BelgeBagi (DisSistemKodu, BelgeTuruKodu, KaynakKodu, FirmaNo,
                                  YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'logo', N'satisFaturasi', N'personel', 1,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-42c'; SET @Beklenen = 2601; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT entegrasyon.BelgeBagi (DisSistemKodu, BelgeTuruKodu, KaynakKodu, FirmaNo, BelgeNo, BelgeTarihi,
                                  YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'logo', N'satisFaturasi', N'personel', 1, N'S01-0001', '2026-07-01',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    INSERT entegrasyon.BelgeBagi (DisSistemKodu, BelgeTuruKodu, KaynakKodu, FirmaNo, BelgeNo, BelgeTarihi,
                                  YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'logo', N'satisFaturasi', N'personel', 1, N'S01-0001', '2026-07-01',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-43  musteri.Hesap birlestirildi ama bağ boş → 547; kendine bağlı → 547 */
SET @Adim = N'KS-43a'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE musteri.Hesap SET DurumKodu = N'birlestirildi', TelefonE164 = NULL, BirlestigiHesapKimlik = NULL
     WHERE Kimlik = @HesapS01;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-43b'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE musteri.Hesap SET DurumKodu = N'birlestirildi', TelefonE164 = NULL, BirlestigiHesapKimlik = @HesapS01
     WHERE Kimlik = @HesapS01;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-45  denetim.IslemKaydi müşteri satırında IpAdresi dolu → 547 */
SET @Adim = N'KS-45'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT denetim.IslemKaydi (IslemTuruKodu, YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu, IpAdresi)
    VALUES (N'talepOlusturuldu', N'musteri', @HesapS01, N'connect', N'203.0.113.7');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-46  sistem.Giden: IlgiliKayitTuruKodu = dogrulamaKodu ve Govde dolu → 547 */
SET @Adim = N'KS-46'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT sistem.Giden (SablonKodu, KanalKodu, DilKodu, DurumKodu, IlgiliKayitTuruKodu, Govde)
    VALUES (N'S01Sinama', N'sms', N'tr', N'bekliyor', N'dogrulamaKodu', N'S01 gövde');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-50  Dekont sınıfı dosyaya SilinmeIstendiZamani → 547 */
SET @Adim = N'KS-50'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT dosya.Dosya (MimeTuru, BoyutBayt, IcerikOzeti, DepolamaYolu, TurKodu,
                        DepolamaSaglayiciKodu, SaklamaSinifiKodu, DurumKodu, SilinmeIstendiZamani,
                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'application/pdf', 1024, 0x00, N'S01/dekont.pdf', N'pdf',
            N'disk', N'dekont', N'hazir', SYSUTCDATETIME(),
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-59  makine.MakineServisAtamasi YapanTuruKodu = servis → 547 */
SET @Adim = N'KS-59'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT makine.MakineServisAtamasi (MakineKimlik, MarkaKodu, ServisKimlik, KaynakKodu,
                                       YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@MakineS01, N'paksan', @Servis, N'servis',
            N'servis', @ServisKul, N'S01', N'servisim');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-61  Uygulama girişiyle DELETE erisim.DogrulamaKodu → 229 */
SET @Adim = N'KS-61'; SET @Beklenen = 229; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    DELETE erisim.DogrulamaKodu WHERE 1 = 0;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-62  Aynı ziyarete ikinci ParcaSevki → 2601 */
SET @Adim = N'KS-62'; SET @Beklenen = 2601; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.ParcaSevki (TalepKimlik, TurKodu, ZiyaretKimlik,
                             YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@TalepS01, N'servis', @ZiyaretS01,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    INSERT talep.ParcaSevki (TalepKimlik, TurKodu, ZiyaretKimlik,
                             YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@TalepS01, N'servis', @ZiyaretS01,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-63  Başka talebin ziyaretine ParcaSevki → 547 */
SET @Adim = N'KS-63'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu, DurumKodu, Kapali,
                        SahipKodu, MakineKimlik, ServisKimlik, KonumUlkeKodu,
                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Talep2, N'SRV2690013', N'SRV', N'servis', N'connect', N'paksan', N'yeni', 0,
            N'servis', @MakineS01, @Servis, N'TR',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    INSERT talep.ParcaSevki (TalepKimlik, TurKodu, ZiyaretKimlik,
                             YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Talep2, N'servis', @ZiyaretS01,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-64  servis talebine ziyaretsiz ParcaSevki → 547 */
SET @Adim = N'KS-64'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT talep.ParcaSevki (TalepKimlik, TurKodu, ZiyaretKimlik,
                             YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@TalepS01, N'servis', NULL,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-65  Talebin markası ve destek ailesi için kod.BelirtiKapsami'nda
          olmayan TalepBelirtisi satırı → 0 satır */
SET @Adim = N'KS-65';
SELECT @Sayi = COUNT(*)
  FROM talep.TalepBelirtisi AS tb
  JOIN talep.Talep AS t ON t.Kimlik = tb.TalepKimlik
  LEFT JOIN makine.Makine AS m ON m.Kimlik = t.MakineKimlik
  LEFT JOIN katalog.Urun AS u ON u.MarkaKodu = m.MarkaKodu AND u.Kod = m.UrunKodu
  LEFT JOIN katalog.Kategori AS kt ON kt.Kod = u.KategoriKodu
 WHERE NOT EXISTS (SELECT 1 FROM kod.BelirtiKapsami AS bk
                    WHERE bk.MarkaKodu = t.MarkaKodu
                      AND bk.DestekAilesiKodu = ISNULL(kt.DestekAilesiKodu, N'genel')
                      AND bk.BelirtiKodu = tb.BelirtiKodu);
IF @Sayi <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen 0 satır, gelen ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* KS-66  ServisHesapHareketi bağ kolonları boş → 547 (üç tür) */
SET @Adim = N'KS-66a'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT hakedis.ServisHesapHareketi (ServisKimlik, SirketKodu, HareketTuruKodu, YonKodu,
                                        ParaBirimiKodu, Tutar,
                                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Servis, N'paksan', N'hakEdisAlacagi', N'alacak', N'TRY', 100,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-66b'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT hakedis.ServisHesapHareketi (ServisKimlik, SirketKodu, HareketTuruKodu, YonKodu,
                                        ParaBirimiKodu, Tutar,
                                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Servis, N'paksan', N'parcaSiparisiBorcu', N'borc', N'TRY', 100,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Sira = 1;
WHILE @Sira <= 2
BEGIN
    SET @Adim = CONCAT(N'KS-66c.', @Sira); SET @Beklenen = 547; SET @Gelen = 0;
    BEGIN TRY
        BEGIN TRANSACTION;
        INSERT hakedis.ServisHesapHareketi (ServisKimlik, SirketKodu, HareketTuruKodu, YonKodu,
                                            ParaBirimiKodu, Tutar,
                                            YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
        VALUES (@Servis, N'paksan',
                CASE WHEN @Sira = 1 THEN N'duzeltmeAlacak' ELSE N'duzeltmeBorc' END,
                CASE WHEN @Sira = 1 THEN N'alacak' ELSE N'borc' END, N'TRY', 100,
                N'personel', @Personel, @PersonelAd, N'backoffice');
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

/* KS-57  erisim.SifreYaz: jetonsuz → 51030; geçerli jetonla → geçer;
          aynı jetonla ikinci kez → 51030; süresi geçmiş jetonla → 51030
   Her alt adım kendi işlemini kurar: prosedür THROW ettiğinde XACT_ABORT ON
   işlemi bozuk bırakır, aynı işlemde sonraki adım yürütülemez. */
DECLARE @SinamaKul nvarchar(40) = N's01.sifre.sinama';
DECLARE @KulKimlik uniqueidentifier = '5A010001-0000-4000-8000-0000000000F1';
DECLARE @Jeton     uniqueidentifier = '5A010001-0000-4000-8000-0000000000F2';
DECLARE @SifreKaydi nvarchar(255) = N'$scrypt$ln=15,r=8,p=1$c01tdXo$b3pldA';

SET @Adim = N'KS-57a'; SET @Beklenen = 51030; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT erisim.Kullanici (Kimlik, GirisAdi, TurKodu) VALUES (@KulKimlik, @SinamaKul, N'personel');
    EXEC erisim.SifreYaz @KullaniciKimlik = @KulKimlik, @SifreKaydi = @SifreKaydi;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-57b'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT erisim.Kullanici (Kimlik, GirisAdi, TurKodu) VALUES (@KulKimlik, @SinamaKul, N'personel');
    INSERT erisim.SifreSifirlamaJetonu (Kimlik, KullaniciKimlik, JetonOzeti, SonGecerlilikZamani)
    VALUES (@Jeton, @KulKimlik, 0x01, DATEADD(hour, 1, SYSUTCDATETIME()));
    EXEC erisim.SifreYaz @KullaniciKimlik = @KulKimlik, @SifreKaydi = @SifreKaydi, @JetonKimlik = @Jeton;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-57c'; SET @Beklenen = 51030; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT erisim.Kullanici (Kimlik, GirisAdi, TurKodu) VALUES (@KulKimlik, @SinamaKul, N'personel');
    INSERT erisim.SifreSifirlamaJetonu (Kimlik, KullaniciKimlik, JetonOzeti, SonGecerlilikZamani)
    VALUES (@Jeton, @KulKimlik, 0x01, DATEADD(hour, 1, SYSUTCDATETIME()));
    EXEC erisim.SifreYaz @KullaniciKimlik = @KulKimlik, @SifreKaydi = @SifreKaydi, @JetonKimlik = @Jeton;
    EXEC erisim.SifreYaz @KullaniciKimlik = @KulKimlik, @SifreKaydi = @SifreKaydi, @JetonKimlik = @Jeton;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-57d'; SET @Beklenen = 51030; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT erisim.Kullanici (Kimlik, GirisAdi, TurKodu) VALUES (@KulKimlik, @SinamaKul, N'personel');
    INSERT erisim.SifreSifirlamaJetonu (Kimlik, KullaniciKimlik, JetonOzeti, SonGecerlilikZamani)
    VALUES (@Jeton, @KulKimlik, 0x01, DATEADD(hour, -1, SYSUTCDATETIME()));
    EXEC erisim.SifreYaz @KullaniciKimlik = @KulKimlik, @SifreKaydi = @SifreKaydi, @JetonKimlik = @Jeton;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-58  musteri.SifreYaz: kodsuz → 51030; 20 dakika önce kullanılmış kodla
          → 51030; aynı kodla ikinci kez → 51030 */
DECLARE @Kod uniqueidentifier = '5A010001-0000-4000-8000-0000000000F3';

SET @Adim = N'KS-58a'; SET @Beklenen = 51030; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC musteri.SifreYaz @HesapKimlik = @HesapS01, @SifreKaydi = @SifreKaydi;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-58b'; SET @Beklenen = 51030; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT erisim.DogrulamaKodu (Kimlik, KodOzeti, AmacKodu, TelefonE164, HesapKimlik,
                                 SonGecerlilikZamani, KullanilmaZamani)
    VALUES (@Kod, 0x02, N'sifreSifirlama', N'+905550000101', @HesapS01,
            DATEADD(minute, -18, SYSUTCDATETIME()), DATEADD(minute, -20, SYSUTCDATETIME()));
    EXEC musteri.SifreYaz @HesapKimlik = @HesapS01, @SifreKaydi = @SifreKaydi, @DogrulamaKoduKimlik = @Kod;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-58c'; SET @Beklenen = 51030; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT erisim.DogrulamaKodu (Kimlik, KodOzeti, AmacKodu, TelefonE164, HesapKimlik,
                                 SonGecerlilikZamani, KullanilmaZamani)
    VALUES (@Kod, 0x02, N'sifreSifirlama', N'+905550000101', @HesapS01,
            DATEADD(minute, 5, SYSUTCDATETIME()), DATEADD(minute, -1, SYSUTCDATETIME()));
    EXEC musteri.SifreYaz @HesapKimlik = @HesapS01, @SifreKaydi = @SifreKaydi, @DogrulamaKoduKimlik = @Kod;
    EXEC musteri.SifreYaz @HesapKimlik = @HesapS01, @SifreKaydi = @SifreKaydi, @DogrulamaKoduKimlik = @Kod;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-60  sistem.SaklamaUygula: süresi geçmiş doğrulama kodu, oturum ve
   bağsız giden silinir; Teslimat'a bağlı giden satırı kalır, gövdesi
   boşalır; tam 1 saklamaUygulandi işlem kaydı yazılır. */
SET @Adim = N'KS-60'; SET @Gelen = 0;
DECLARE @BagsizGiden uniqueidentifier = '5A010001-0000-4000-8000-0000000000F4';
DECLARE @BagliGiden  uniqueidentifier = '5A010001-0000-4000-8000-0000000000F5';
DECLARE @KayitSayisi int;
DECLARE @Sonuc nvarchar(400) = N'';
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT erisim.DogrulamaKodu (Kimlik, KodOzeti, AmacKodu, TelefonE164, SonGecerlilikZamani, OlusmaZamani)
    VALUES (@Kod, 0x03, N'kayit', N'+905550000101',
            DATEADD(day, -60, SYSUTCDATETIME()), DATEADD(day, -60, SYSUTCDATETIME()));
    INSERT erisim.Oturum (Kimlik, KullaniciKimlik, YenilemeJetonuOzeti, KaynakUygulamaKodu,
                          BaslangicZamani, SonKullanimZamani, BitisZamani,
                          KapanmaZamani, KapanmaNedeniKodu)
    VALUES ('5A010001-0000-4000-8000-0000000000F6', @Personel, 0x04, N'backoffice',
            DATEADD(day, -401, SYSUTCDATETIME()), DATEADD(day, -400, SYSUTCDATETIME()),
            DATEADD(day, -400, SYSUTCDATETIME()),
            DATEADD(day, -400, SYSUTCDATETIME()), N'sifreDegisti');
    INSERT sistem.Giden (Kimlik, SablonKodu, KanalKodu, DilKodu, DurumKodu, SaglayiciKodu,
                         Govde, GonderilmeZamani, OlusmaZamani)
    VALUES (@BagsizGiden, N'S01Bagsiz', N'sms', N'tr', N'gonderildi', N'logo',
            N'S01 bağsız gövde', DATEADD(day, -200, SYSUTCDATETIME()), DATEADD(day, -200, SYSUTCDATETIME()));
    INSERT sistem.Giden (Kimlik, SablonKodu, KanalKodu, DilKodu, DurumKodu, SaglayiciKodu,
                         Govde, GonderilmeZamani, OlusmaZamani)
    VALUES (@BagliGiden, N'S01Bagli', N'sms', N'tr', N'gonderildi', N'logo',
            N'S01 bağlı gövde', DATEADD(day, -200, SYSUTCDATETIME()), DATEADD(day, -200, SYSUTCDATETIME()));
    INSERT bildirim.Bildirim (Kimlik, BaslikAnahtari, MetinAnahtari, AliciTuruKodu, TurKodu,
                              HesapKimlik, TalepKimlik,
                              YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES ('5A010001-0000-4000-8000-0000000000F7', N'bildirimler.talepAlindi',
            N'bildirimler.talepAlindiMetin', N'musteri', N'talep',
            @HesapS01, @TalepS01,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    INSERT bildirim.Teslimat (BildirimKimlik, HesapKimlik, GidenKimlik)
    VALUES ('5A010001-0000-4000-8000-0000000000F7', @HesapS01, @BagliGiden);

    SELECT @KayitSayisi = COUNT(*) FROM denetim.IslemKaydi WHERE IslemTuruKodu = N'saklamaUygulandi';

    EXEC sistem.SaklamaUygula @EnFazlaSatir = 5000;

    IF EXISTS (SELECT 1 FROM erisim.DogrulamaKodu WHERE Kimlik = @Kod)
        SET @Sonuc = @Sonuc + N'süresi geçmiş doğrulama kodu silinmedi; ';
    IF EXISTS (SELECT 1 FROM erisim.Oturum WHERE Kimlik = '5A010001-0000-4000-8000-0000000000F6')
        SET @Sonuc = @Sonuc + N'süresi geçmiş oturum silinmedi; ';
    IF EXISTS (SELECT 1 FROM sistem.Giden WHERE Kimlik = @BagsizGiden)
        SET @Sonuc = @Sonuc + N'bağsız giden silinmedi; ';
    IF NOT EXISTS (SELECT 1 FROM sistem.Giden WHERE Kimlik = @BagliGiden)
        SET @Sonuc = @Sonuc + N'bağlı giden silindi; ';
    ELSE IF EXISTS (SELECT 1 FROM sistem.Giden WHERE Kimlik = @BagliGiden AND Govde IS NOT NULL)
        SET @Sonuc = @Sonuc + N'bağlı gidenin gövdesi boşalmadı; ';
    SELECT @Sayi = COUNT(*) - @KayitSayisi FROM denetim.IslemKaydi WHERE IslemTuruKodu = N'saklamaUygulandi';
    IF @Sayi <> 1
        SET @Sonuc = @Sonuc + CONCAT(N'saklamaUygulandi işlem kaydı ', @Sayi, N' (beklenen 1); ');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;
IF @Sonuc <> N''
BEGIN SET @Mesaj = CONCAT(@Adim, N': ', @Sonuc); THROW 59999, @Mesaj, 1; END;

/* KS-51  YapanAyarla çağrılmadan durum değişikliği → 51010;
          çağrılıp değişiklik → tam 1 DurumGecmisi satırı.
   Oturum bağlamı bu adımda silinir; sonunda yeniden kurulur. */
SET @Adim = N'KS-51a'; SET @Beklenen = 51010; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC sys.sp_set_session_context @key = N'YapanTuruKodu',        @value = NULL;
    EXEC sys.sp_set_session_context @key = N'YapanKullaniciKimlik', @value = NULL;
    EXEC sys.sp_set_session_context @key = N'YapanAdi',             @value = NULL;
    EXEC sys.sp_set_session_context @key = N'KaynakUygulamaKodu',   @value = NULL;
    EXEC sys.sp_set_session_context @key = N'MusteriyeBildirildi',  @value = NULL;
    UPDATE talep.Talep SET DurumKodu = N'incelemede' WHERE Kimlik = @TalepS01;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

EXEC sistem.YapanAyarla
     @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';

SET @Adim = N'KS-51b'; SET @Gelen = 0; SET @Sayi = -1;
BEGIN TRY
    BEGIN TRANSACTION;
    SELECT @KayitSayisi = COUNT(*) FROM talep.DurumGecmisi WHERE TalepKimlik = @TalepS01;
    UPDATE talep.Talep SET DurumKodu = N'incelemede' WHERE Kimlik = @TalepS01;
    SELECT @Sayi = COUNT(*) - @KayitSayisi FROM talep.DurumGecmisi WHERE TalepKimlik = @TalepS01;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;
IF @Sayi <> 1
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen 1 DurumGecmisi satırı, gelen ', @Sayi); THROW 59999, @Mesaj, 1; END;

PRINT 'S01 uygulama bölümü tamam.';

-- giris: sahip
/* ==========================================================================
   S01 — sahip bölümü

   Buradaki adımlar ya sahibe karşı da koruyan tetikleyicileri sınar
   (KS-32, KS-47, KS-48, KS-49) ya da uygulama rolünün yazamadığı
   tablolara veri ister: katalog, kod listeleri, sirket, sistem.Ayar,
   sistem.NumaraSayaci, sistem.Ortam (Bölüm 4.2). Uygulama girişiyle
   denenseydi kısıt yerine 229 dönerdi.

   Hepsi kendi işleminde açılıp geri alınır: ikinci marka, ikinci şirket ve
   kod satırları veritabanında kalmaz. Kalsalardı S04'ün esneklik adımları
   (ES-01 globale, ES-12 bayi aktör türü) "zaten var" diye kırılırdı.
   ========================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Adim       nvarchar(20);
DECLARE @Beklenen   int;
DECLARE @Gelen      int;
DECLARE @Mesaj      nvarchar(2048);
DECLARE @HataMetni  nvarchar(2048);
DECLARE @Sayi       int;
DECLARE @Numara     nvarchar(10);
DECLARE @Sira       int;

DECLARE @TalepS01   uniqueidentifier = '5A010001-0000-4000-8000-000000000003';
DECLARE @ZiyaretS01 uniqueidentifier = '5A010001-0000-4000-8000-000000000004';
DECLARE @HakEdisS01 uniqueidentifier = '5A010001-0000-4000-8000-000000000005';
DECLARE @HesapS01   uniqueidentifier = '5A010001-0000-4000-8000-000000000001';
DECLARE @MakineS01  uniqueidentifier = '5A010001-0000-4000-8000-000000000002';
DECLARE @Marka2     nvarchar(20) = N'sinamamarka';
DECLARE @Sirket2    nvarchar(20) = N'sinamasirket';

DECLARE @Servis     uniqueidentifier;
DECLARE @Personel   uniqueidentifier;
DECLARE @PersonelAd nvarchar(150);
DECLARE @ServisKul  uniqueidentifier;
DECLARE @Yil        smallint = YEAR(SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time');

SELECT @Servis = Kimlik FROM servis.Servis WHERE KayitNo = 1;
SELECT @Personel = k.Kimlik, @PersonelAd = p.AdSoyad
  FROM erisim.Kullanici AS k
  JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
 WHERE k.GirisAdi = N'ornek.servis.masasi';
SELECT @ServisKul = Kimlik FROM erisim.Kullanici WHERE GirisAdi = N'konya.servis';

IF NOT EXISTS (SELECT 1 FROM talep.Talep WHERE Kimlik = @TalepS01)
    THROW 59999, N'S01 sahip bölümü: uygulama bölümünün sahnesi yok', 1;

/* KS-03b  Aynı seri numarası başka markada → geçer */
SET @Adim = N'KS-03b'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT katalog.Marka (Kod, Ad, SirketKodu, GarantiYil, SeriKuraliKodu, KaynakNotu, ParaBirimiKodu, Aktif)
    VALUES (@Marka2, N'S01 Sınama Markası', N'paksan', 2, N'onekYilSira',
            N'S01 marka kaynak notu', N'TRY', 1);
    INSERT makine.Makine (SeriNo, MarkaKodu, OlusmaKaynagiKodu,
                          YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'S01PAKSAN0001', @Marka2, N'personel',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

/* KS-10  Başka markanın makinesiyle talep → 547 */
SET @Adim = N'KS-10'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    DECLARE @Makine2 uniqueidentifier = '5A010001-0000-4000-8000-0000000000B5';
    INSERT katalog.Marka (Kod, Ad, SirketKodu, GarantiYil, SeriKuraliKodu, KaynakNotu, ParaBirimiKodu, Aktif)
    VALUES (@Marka2, N'S01 Sınama Markası', N'paksan', 2, N'onekYilSira',
            N'S01 marka kaynak notu', N'TRY', 1);
    INSERT makine.Makine (Kimlik, SeriNo, MarkaKodu, OlusmaKaynagiKodu,
                          YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Makine2, N'S01MARKA20001', @Marka2, N'personel',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
         @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
    INSERT talep.Talep (Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu, DurumKodu, Kapali,
                        SahipKodu, MakineKimlik, KonumUlkeKodu,
                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'SRV2690021', N'SRV', N'servis', N'connect', N'paksan', N'yeni', 0,
            N'paksan', @Makine2, N'TR',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-15  Parça satırı markası ≠ talep markası → 547 */
SET @Adim = N'KS-15'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT katalog.Marka (Kod, Ad, SirketKodu, GarantiYil, SeriKuraliKodu, KaynakNotu, ParaBirimiKodu, Aktif)
    VALUES (@Marka2, N'S01 Sınama Markası', N'paksan', 2, N'onekYilSira',
            N'S01 marka kaynak notu', N'TRY', 1);
    INSERT katalog.ParcaGrubu (MarkaKodu, Kod, Ad) VALUES (@Marka2, N'sinama-grubu', N'S01 Parça Grubu');
    INSERT katalog.Parca (MarkaKodu, Kod, Ad, GrupKodu)
    VALUES (@Marka2, N'S01PRC0001', N'S01 Parçası', N'sinama-grubu');
    INSERT talep.ParcaSatiri (TalepKimlik, MarkaKodu, SiraNo, ParcaAdi, KatalogDisi, ParcaKodu, Adet)
    VALUES (@TalepS01, @Marka2, 1, N'S01 Parçası', 0, N'S01PRC0001', 1);
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-20  Aynı siparişe ikinci etkin parcaSiparisiBorcu → 2601;
          asıl geri alındıktan sonra yenisi → geçer
   (GeriAlinmaZamani kolonunda uygulama rolünün DENY'si var; bu yüzden sahip.) */
DECLARE @Siparis uniqueidentifier = '5A010001-0000-4000-8000-0000000000B6';
DECLARE @Borc1   uniqueidentifier = '5A010001-0000-4000-8000-0000000000B7';

SET @Adim = N'KS-20a'; SET @Beklenen = 2601; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
         @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
    INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu, DurumKodu, Kapali,
                        SahipKodu, ServisKimlik, KonumUlkeKodu,
                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Siparis, N'SPS2690001', N'SPS', N'parca', N'servisSiparisi', N'paksan', N'yeni', 0,
            N'servis', @Servis, N'TR',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    INSERT talep.ParcaTalebiAyrinti (TalepKimlik, TurKodu, OdemeYontemiKodu, SirketKodu,
                                     ParaBirimiKodu, AraToplam, KdvTutari, GenelToplam)
    VALUES (@Siparis, N'parca', N'bakiye', N'paksan', N'TRY', 100, 20, 120);
    INSERT hakedis.ServisHesapHareketi (Kimlik, ServisKimlik, SirketKodu, HareketTuruKodu, YonKodu,
                                        ParaBirimiKodu, Tutar, ParcaTalepKimlik,
                                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Borc1, @Servis, N'paksan', N'parcaSiparisiBorcu', N'borc', N'TRY', 120, @Siparis,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    INSERT hakedis.ServisHesapHareketi (ServisKimlik, SirketKodu, HareketTuruKodu, YonKodu,
                                        ParaBirimiKodu, Tutar, ParcaTalepKimlik,
                                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Servis, N'paksan', N'parcaSiparisiBorcu', N'borc', N'TRY', 120, @Siparis,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-20b'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
         @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
    INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu, DurumKodu, Kapali,
                        SahipKodu, ServisKimlik, KonumUlkeKodu,
                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Siparis, N'SPS2690002', N'SPS', N'parca', N'servisSiparisi', N'paksan', N'yeni', 0,
            N'servis', @Servis, N'TR',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    INSERT talep.ParcaTalebiAyrinti (TalepKimlik, TurKodu, OdemeYontemiKodu, SirketKodu,
                                     ParaBirimiKodu, AraToplam, KdvTutari, GenelToplam)
    VALUES (@Siparis, N'parca', N'bakiye', N'paksan', N'TRY', 100, 20, 120);
    INSERT hakedis.ServisHesapHareketi (Kimlik, ServisKimlik, SirketKodu, HareketTuruKodu, YonKodu,
                                        ParaBirimiKodu, Tutar, ParcaTalepKimlik,
                                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Borc1, @Servis, N'paksan', N'parcaSiparisiBorcu', N'borc', N'TRY', 120, @Siparis,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    UPDATE hakedis.ServisHesapHareketi SET GeriAlinmaZamani = SYSUTCDATETIME() WHERE Kimlik = @Borc1;
    INSERT hakedis.ServisHesapHareketi (ServisKimlik, SirketKodu, HareketTuruKodu, YonKodu,
                                        ParaBirimiKodu, Tutar, ParcaTalepKimlik,
                                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Servis, N'paksan', N'parcaSiparisiBorcu', N'borc', N'TRY', 120, @Siparis,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

/* KS-29b  Aynı servis, ay ve para birimi, farklı şirket → geçer */
SET @Adim = N'KS-29b'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
         @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
    INSERT sirket.Sirket (Kod, Ad, KisaAd, Unvan)
    VALUES (@Sirket2, N'S01 Sınama Şirketi', N'S01 Kısa Ad',
            N'S01 Unvan');
    INSERT hakedis.DonemDokumu (Numara, ServisKimlik, SirketKodu, ParaBirimiKodu, DurumKodu,
                                DonemYili, DonemAyi, OdenecekTutar,
                                YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'HAK2690011', @Servis, N'paksan', N'TRY', N'taslak', 2026, 7, 0,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    INSERT hakedis.DonemDokumu (Numara, ServisKimlik, SirketKodu, ParaBirimiKodu, DurumKodu,
                                DonemYili, DonemAyi, OdenecekTutar,
                                YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'HAK2690012', @Servis, @Sirket2, N'TRY', N'taslak', 2026, 7, 0,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

/* KS-32  Sahip girişiyle bozulmuş NetTutar'lı hak edişi onaylandi yapmak → 51040 */
SET @Adim = N'KS-32'; SET @Beklenen = 51040; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE hakedis.HakEdis
       SET NetTutar = 999.00, DurumKodu = N'onaylandi', OnayZamani = SYSUTCDATETIME(),
           OnaylayanKullaniciKimlik = @Personel, OnaylayanAdi = @PersonelAd,
           KdvTutari = 0, TevkifatTutari = 0, StopajTutari = 0
     WHERE Kimlik = @HakEdisS01;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-38  sistem.Ayar: tamsayi türüne N'72 saat' → 547; aynı genel anahtar
          iki kez → 2601; aynı anahtar genel + marka + şirket → geçer */
SET @Adim = N'KS-38a'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT sistem.Ayar (Anahtar, DegerTuru, Deger, Aciklama)
    VALUES (N'S01SinamaSayisi', N'tamsayi', N'72 saat', N'S01 ayar açıklaması');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-38b'; SET @Beklenen = 2601; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT sistem.Ayar (Anahtar, DegerTuru, Deger, Aciklama)
    VALUES (N'S01SinamaSayisi', N'tamsayi', N'72', N'S01 ayar açıklaması');
    INSERT sistem.Ayar (Anahtar, DegerTuru, Deger, Aciklama)
    VALUES (N'S01SinamaSayisi', N'tamsayi', N'96', N'S01 ayar açıklaması');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-38c'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT sistem.Ayar (Anahtar, DegerTuru, Deger, Aciklama)
    VALUES (N'S01SinamaSayisi', N'tamsayi', N'72', N'S01 ayar açıklaması');
    INSERT sistem.Ayar (Anahtar, MarkaKodu, DegerTuru, Deger, Aciklama)
    VALUES (N'S01SinamaSayisi', N'paksan', N'tamsayi', N'96', N'S01 ayar açıklaması');
    INSERT sistem.Ayar (Anahtar, SirketKodu, DegerTuru, Deger, Aciklama)
    VALUES (N'S01SinamaSayisi', N'paksan', N'tamsayi', N'120', N'S01 ayar açıklaması');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

/* KS-39  sistem.Ayar hem SirketKodu hem MarkaKodu dolu → 547 */
SET @Adim = N'KS-39'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT sistem.Ayar (Anahtar, SirketKodu, MarkaKodu, DegerTuru, Deger, Aciklama)
    VALUES (N'S01SinamaSayisi', N'paksan', N'paksan', N'tamsayi', N'72', N'S01 ayar açıklaması');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-44  Yapan CHECK: musteri + kullanıcı kimliği → 547; personel + ad boş → 547;
          sistem + hesap → 547; veriyle eklenmiş bayi türü + kullanıcı + ad → geçer */
SET @Adim = N'KS-44a'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT makine.Makine (SeriNo, MarkaKodu, OlusmaKaynagiKodu,
                          YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'S01YAPAN0001', N'paksan', N'musteri',
            N'musteri', @Personel, @HesapS01, NULL, N'connect');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-44b'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT makine.Makine (SeriNo, MarkaKodu, OlusmaKaynagiKodu,
                          YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'S01YAPAN0002', N'paksan', N'personel',
            N'personel', @Personel, NULL, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-44c'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT makine.Makine (SeriNo, MarkaKodu, OlusmaKaynagiKodu,
                          YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
    VALUES (N'S01YAPAN0003', N'paksan', N'entegrasyon',
            N'sistem', @HesapS01, N'api');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-44d'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    DECLARE @BayiKul uniqueidentifier = '5A010001-0000-4000-8000-0000000000C8';
    INSERT kod.AktorTuru (Kod, Ad) VALUES (N'bayi', N'S01 bayi aktör türü');
    INSERT erisim.Kullanici (Kimlik, GirisAdi, TurKodu) VALUES (@BayiKul, N's01.bayi.sinama', N'bayi');
    INSERT makine.Makine (SeriNo, MarkaKodu, OlusmaKaynagiKodu,
                          YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'S01YAPAN0004', N'paksan', N'personel',
            N'bayi', @BayiKul, N'S01 Bayi Adı', N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

/* KS-47  Sahip girişiyle denetim.IslemKaydi UPDATE → 51012; DELETE → 51012 */
SET @Sira = 1;
WHILE @Sira <= 2
BEGIN
    SET @Adim = CONCAT(N'KS-47.', @Sira); SET @Beklenen = 51012; SET @Gelen = 0;
    BEGIN TRY
        BEGIN TRANSACTION;
        INSERT denetim.IslemKaydi (Kimlik, IslemTuruKodu, YapanTuruKodu, KaynakUygulamaKodu)
        VALUES ('5A010001-0000-4000-8000-0000000000C9', N'talepOlusturuldu', N'sistem', N'api');
        IF @Sira = 1
            UPDATE denetim.IslemKaydi SET IlgiliNumara = N'S01'
             WHERE Kimlik = '5A010001-0000-4000-8000-0000000000C9';
        ELSE
            DELETE denetim.IslemKaydi WHERE Kimlik = '5A010001-0000-4000-8000-0000000000C9';
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

/* KS-48  Sahip girişiyle kvkk.RizaOlayi UPDATE → 51013; kvkk.MetinSurumu
          içerik UPDATE → 51014; HukukOnayiZamani NULL → dolu → geçer */
SET @Adim = N'KS-48a'; SET @Beklenen = 51013; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT kvkk.RizaOlayi (Kimlik, HesapKimlik, MetinKodu, Surum, DilKodu, SecimKodu, KanalKodu)
    SELECT '5A010001-0000-4000-8000-0000000000CA', @HesapS01, m.MetinKodu, m.Surum, m.DilKodu,
           N'onay', N'connectKayit'
      FROM kvkk.MetinSurumu AS m
     WHERE m.DilKodu = N'tr'
     ORDER BY m.MetinKodu, m.Surum
    OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY;
    UPDATE kvkk.RizaOlayi SET SecimKodu = N'ret' WHERE Kimlik = '5A010001-0000-4000-8000-0000000000CA';
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-48b'; SET @Beklenen = 51014; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE TOP (1) kvkk.MetinSurumu SET Baslik = N'S01 değiştirilmiş başlık';
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-48c'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE TOP (1) kvkk.MetinSurumu SET HukukOnayiZamani = SYSUTCDATETIME()
     WHERE HukukOnayiZamani IS NULL;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

/* KS-49  Sahip girişiyle sistem.Ortam UPDATE → 51011 */
SET @Adim = N'KS-49'; SET @Beklenen = 51011; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE sistem.Ortam SET OrtamKodu = N'test';
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-53  NumaraAl @Zaman = '2026-12-31 21:00' (UTC) → SRV27…
   31 Aralık 21:00 UTC, Türkiye'de 1 Ocak 00:00'dır: numara yeni yılı alır. */
SET @Adim = N'KS-53'; SET @Gelen = 0; SET @Numara = NULL;
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC sistem.NumaraAl @Onek = N'SRV', @Numara = @Numara OUTPUT, @Zaman = '2026-12-31T21:00:00';
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;
IF LEFT(ISNULL(@Numara, N''), 5) <> N'SRV27'
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen SRV27…, gelen ', ISNULL(@Numara, N'(boş)')); THROW 59999, @Mesaj, 1; END;

/* KS-54  NumaraAl @Zaman, test işaretli ortamda → 51002
   Ortam işareti işlem içinde değiştirilir (koruma tetikleyicisi geçici
   kapatılır) ve geri alınır; ES-20 parmak izi bundan etkilenmez. */
SET @Adim = N'KS-54'; SET @Beklenen = 51002; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    DISABLE TRIGGER sistem.TR_sistem_Ortam_Koruma ON sistem.Ortam;
    /* VeritabaniAdi de değişir: CK_sistem_Ortam_VeritabaniAdi ikisini bağlar. */
    UPDATE sistem.Ortam SET OrtamKodu = N'test', VeritabaniAdi = N'Paksan_Test';
    ENABLE TRIGGER sistem.TR_sistem_Ortam_Koruma ON sistem.Ortam;
    EXEC sistem.NumaraAl @Onek = N'SRV', @Numara = @Numara OUTPUT, @Zaman = '2026-12-31T21:00:00';
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;
/* Tetikleyici geri alınan işlemin dışında kapalı kalmamalı. */
IF EXISTS (SELECT 1 FROM sys.triggers WHERE name = N'TR_sistem_Ortam_Koruma' AND is_disabled = 1)
BEGIN
    ENABLE TRIGGER sistem.TR_sistem_Ortam_Koruma ON sistem.Ortam;
    THROW 59999, N'KS-54: TR_sistem_Ortam_Koruma kapalı kaldı', 1;
END;
IF (SELECT OrtamKodu FROM sistem.Ortam) <> N'sinama'
    THROW 59999, N'KS-54: ortam işareti geri alınmadı', 1;

/* KS-55  NumaraAl sayaç 99999'dayken → 51001 */
SET @Adim = N'KS-55'; SET @Beklenen = 51001; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    IF EXISTS (SELECT 1 FROM sistem.NumaraSayaci WHERE Onek = N'SRV' AND Yil = @Yil)
        UPDATE sistem.NumaraSayaci SET SonSira = 99999 WHERE Onek = N'SRV' AND Yil = @Yil;
    ELSE
        INSERT sistem.NumaraSayaci (Onek, Yil, SonSira) VALUES (N'SRV', @Yil, 99999);
    EXEC sistem.NumaraAl @Onek = N'SRV', @Numara = @Numara OUTPUT;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-67  Talebin markasından farklı markalı ServisZiyareti; ziyaretten farklı
          markalı ZiyaretParcaSatiri (katalog dışı satır dahil) ve
          ZiyaretDuzeltmesi; düzeltmeden farklı markalı ZiyaretDuzeltmesiParcasi
          → 547 (dördü de) */
DECLARE @KS67Ziyaret  uniqueidentifier = '5A010001-0000-4000-8000-0000000000CB';
DECLARE @KS67Duzeltme uniqueidentifier = '5A010001-0000-4000-8000-0000000000CC';
SET @Sira = 1;
WHILE @Sira <= 4
BEGIN
    SET @Adim = CONCAT(N'KS-67.', @Sira); SET @Beklenen = 547; SET @Gelen = 0;
    BEGIN TRY
        BEGIN TRANSACTION;
        EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
             @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';
        INSERT katalog.Marka (Kod, Ad, SirketKodu, GarantiYil, SeriKuraliKodu, KaynakNotu, ParaBirimiKodu, Aktif)
        VALUES (@Marka2, N'S01 Sınama Markası', N'paksan', 2, N'onekYilSira',
                N'S01 marka kaynak notu', N'TRY', 1);
        INSERT servis.MarkaYetkisi (ServisKimlik, MarkaKodu) VALUES (@Servis, @Marka2);
        IF @Sira = 1
            INSERT talep.ServisZiyareti (ZiyaretNo, TalepKimlik, TurKodu, UyduKodu, MarkaKodu, ServisKimlik,
                                         AsamaKodu, KapiKodu,
                                         YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
            VALUES (9, @TalepS01, N'servis', N'servisZiyareti', @Marka2, @Servis,
                    N'parca', N'parcaIste',
                    N'servis', @ServisKul, N'S01', N'servisim');
        ELSE IF @Sira = 2
            INSERT talep.ZiyaretParcaSatiri (ZiyaretKimlik, MarkaKodu, SiraNo, ParcaAdi, ParcaKodu, Adet)
            VALUES (@ZiyaretS01, @Marka2, 9, N'S01 Katalog Dışı Parça', NULL, 1);
        ELSE IF @Sira = 3
            INSERT talep.ZiyaretDuzeltmesi (ZiyaretKimlik, MarkaKodu, Neden,
                                            YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
            VALUES (@ZiyaretS01, @Marka2, N'S01 düzeltme nedeni',
                    N'personel', @Personel, @PersonelAd, N'backoffice');
        ELSE
        BEGIN
            INSERT talep.ZiyaretDuzeltmesi (Kimlik, ZiyaretKimlik, MarkaKodu, Neden,
                                            YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
            VALUES (@KS67Duzeltme, @ZiyaretS01, N'paksan', N'S01 düzeltme nedeni',
                    N'personel', @Personel, @PersonelAd, N'backoffice');
            INSERT talep.ZiyaretDuzeltmesiParcasi (DuzeltmeKimlik, TarafKodu, MarkaKodu, SiraNo, ParcaAdi, ParcaKodu, Adet)
            VALUES (@KS67Duzeltme, N'yeni', @Marka2, 1, N'S01 Katalog Dışı Parça', NULL, 1);
        END;
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

/* KS-68  MarkaKodu verilmeden servis.MarkaYetkisi, talep.ServisZiyareti,
          katalog.Urun satırı → 515 */
SET @Sira = 1;
WHILE @Sira <= 3
BEGIN
    SET @Adim = CONCAT(N'KS-68.', @Sira); SET @Beklenen = 515; SET @Gelen = 0;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF @Sira = 1
            INSERT servis.MarkaYetkisi (ServisKimlik) VALUES (@Servis);
        ELSE IF @Sira = 2
            INSERT talep.ServisZiyareti (ZiyaretNo, TalepKimlik, TurKodu, UyduKodu, ServisKimlik,
                                         AsamaKodu, KapiKodu,
                                         YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
            VALUES (8, @TalepS01, N'servis', N'servisZiyareti', @Servis,
                    N'parca', N'parcaIste',
                    N'servis', @ServisKul, N'S01', N'servisim');
        ELSE
            INSERT katalog.Urun (Kod, Ad, KategoriKodu) VALUES (N'sinama-urun', N'S01 Ürünü', N'rulo-balya');
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

/* KS-69  FirmaNo boşken CariKarti ve BelgeBagi: aynı kod iki şirkette → geçer;
          aynı şirkette ikinci kez → 2601; şirketsiz ikinci kez → 2601 */
SET @Adim = N'KS-69a'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT sirket.Sirket (Kod, Ad, KisaAd, Unvan)
    VALUES (@Sirket2, N'S01 Sınama Şirketi', N'S01 Kısa Ad', N'S01 Unvan');
    INSERT entegrasyon.CariKarti (DisSistemKodu, SirketKodu, CariKodu, KaynakKodu, ServisKimlik)
    VALUES (N'logo', N'paksan', N'320.S01.0009', N'personel', @Servis);
    INSERT entegrasyon.CariKarti (DisSistemKodu, SirketKodu, CariKodu, KaynakKodu, ServisKimlik)
    VALUES (N'logo', @Sirket2, N'320.S01.0009', N'personel', @Servis);
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': hata beklenmiyordu, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-69b'; SET @Beklenen = 2601; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT entegrasyon.CariKarti (DisSistemKodu, SirketKodu, CariKodu, KaynakKodu, ServisKimlik)
    VALUES (N'logo', N'paksan', N'320.S01.0009', N'personel', @Servis);
    INSERT entegrasyon.CariKarti (DisSistemKodu, SirketKodu, CariKodu, KaynakKodu, ServisKimlik)
    VALUES (N'logo', N'paksan', N'320.S01.0009', N'personel', @Servis);
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'KS-69c'; SET @Beklenen = 2601; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT entegrasyon.BelgeBagi (DisSistemKodu, BelgeTuruKodu, KaynakKodu, DisKayitNo,
                                  YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'logo', N'satisFaturasi', N'personel', N'S01-DIS-0009',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    INSERT entegrasyon.BelgeBagi (DisSistemKodu, BelgeTuruKodu, KaynakKodu, DisKayitNo,
                                  YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'logo', N'satisFaturasi', N'personel', N'S01-DIS-0009',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* KS-70  katalog.UrunVaryantiCevirisi 'tr' satırı → 547
          (asıl dil satırın kendisindedir; çeviri tablosu yalnız öteki diller) */
SET @Adim = N'KS-70'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT katalog.UrunVaryanti (MarkaKodu, UrunKodu, Kod, Ad)
    VALUES (N'paksan', N'ipak-rulo', N'sinama-varyant', N'S01 Varyantı');
    INSERT katalog.UrunVaryantiCevirisi (MarkaKodu, UrunKodu, VaryantKodu, DilKodu, Ad)
    VALUES (N'paksan', N'ipak-rulo', N'sinama-varyant', N'tr', N'S01 Varyantı');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

PRINT 'S01 sahip bölümü tamam.';
