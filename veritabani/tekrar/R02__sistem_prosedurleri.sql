/* ==========================================================================
   R02 — sistem prosedürleri

   sistem.NumaraAl       okunur numara (Bölüm 1.7.2)
   sistem.YapanAyarla    isteği yapanı oturum bağlamına yazar (Bölüm 1.16)
   erisim.SifreYaz       personel/servis şifre kaydı (Bölüm 1.14.4)
   musteri.SifreYaz      müşteri şifre kaydı (Bölüm 1.14.4)
   sistem.SaklamaUygula  saklama süresi dolan satırlar (Bölüm 1.13.4)

   Sonunda uygulama rolüne EXECUTE izinleri (Bölüm 4.2).
   Tekrar betiği: CREATE OR ALTER; her nesne kendi GO toplu işinde.
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. sistem.NumaraAl — tasarim.md 1.7.2 gövdesinin aynısı.
   TRY/CATCH yok: dış işlem XACT_ABORT ON iken yakalanan hata 3930 verir.
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE sistem.NumaraAl
    @Onek   nvarchar(3),
    @Numara nvarchar(10) OUTPUT,
    @Zaman  datetime2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Zaman IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sistem.Ortam WHERE OrnekVeriIzinli = 1)
        THROW 51002, N'<Codex metni: zaman yalnız yerel ve sınama ortamında verilir>', 1;

    IF NOT EXISTS (SELECT 1 FROM sistem.NumaraOneki
                   WHERE Onek = @Onek COLLATE Latin1_General_100_BIN2 AND Aktif = 1)
        THROW 51003, N'<Codex metni: önek yok ya da pasif>', 1;

    DECLARE @Yil smallint = YEAR(ISNULL(@Zaman, SYSUTCDATETIME())
                                 AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time');
    DECLARE @Sira int;

    BEGIN TRANSACTION;

    UPDATE sistem.NumaraSayaci WITH (UPDLOCK, HOLDLOCK)
       SET @Sira = SonSira = SonSira + 1
     WHERE Onek = @Onek AND Yil = @Yil AND SonSira < 99999;

    IF @@ROWCOUNT = 0
    BEGIN
        IF EXISTS (SELECT 1 FROM sistem.NumaraSayaci WITH (UPDLOCK, HOLDLOCK)
                   WHERE Onek = @Onek AND Yil = @Yil)
            THROW 51001, N'<Codex metni: bu önek ve yıl için numara doldu>', 1;

        SET @Sira = 1;
        INSERT sistem.NumaraSayaci (Onek, Yil, SonSira) VALUES (@Onek, @Yil, 1);
    END;

    COMMIT TRANSACTION;

    SET @Numara = @Onek + RIGHT(CONVERT(nvarchar(4), @Yil), 2)
                + RIGHT(N'0000' + CONVERT(nvarchar(5), @Sira), 5);
END
GO

EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'NumaraAl',
     @Metin = N'Önek ve Türkiye saatine göre yıl başına sıradaki okunur numarayı verir (SRV2600123). Sayaç satırını kilitler; kaydı ekleyen işlemin içinde çağrılır, kilit o işlem bitene kadar sürer. Yeni yıl ve yeni önek satırı kendiliğinden açılır. Hatalar: 51001 numara doldu, 51002 zaman yalnız yerel/sınama, 51003 önek yok ya da pasif.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'NumaraAl', @Alt = N'@Onek', @AltTuru = N'PARAMETER',
     @Metin = N'sistem.NumaraOneki içindeki aktif önek (büyük harf, 3 karakter: SRV, YPR, TKF, SPS, HAK, TEL, GBD).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'NumaraAl', @Alt = N'@Numara', @AltTuru = N'PARAMETER',
     @Metin = N'Çıktı: tiresiz saklanan numara, 10 karakter (önek + yılın son iki hanesi + 5 haneli sıra).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'NumaraAl', @Alt = N'@Zaman', @AltTuru = N'PARAMETER',
     @Metin = N'Yalnız yerel ve sınama ortamında: numara yılının hesaplanacağı UTC an (geçmiş yıl verisi üretmek için). Canlıda NULL olmalı.';
GO

/* --------------------------------------------------------------------------
   2. sistem.YapanAyarla — Yapan grubu kuralını denetler ve oturum
   bağlamına yazar. TR_talep_Talep_DurumGecmisi bu anahtarları okur.
   Anahtarlar her çağrıda (NULL olanlar dahil) yeniden yazılır; havuzdan
   gelen bağlantıda önceki isteğin değeri kalmaz.
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE sistem.YapanAyarla
    @YapanTuruKodu        nvarchar(40),
    @YapanKullaniciKimlik uniqueidentifier = NULL,
    @YapanHesapKimlik     uniqueidentifier = NULL,
    @YapanAdi             nvarchar(150)    = NULL,
    @KaynakUygulamaKodu   nvarchar(40),
    @UygulamaSurumu       nvarchar(20)     = NULL,
    @MusteriyeBildirildi  bit              = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @YapanTuruKodu IS NULL
       OR @KaynakUygulamaKodu IS NULL
       OR @MusteriyeBildirildi IS NULL
       OR NOT (
             (@YapanTuruKodu = N'musteri'
                AND @YapanHesapKimlik IS NOT NULL AND @YapanKullaniciKimlik IS NULL AND @YapanAdi IS NULL)
          OR (@YapanTuruKodu IN (N'sistem', N'entegrasyon')
                AND @YapanHesapKimlik IS NULL AND @YapanKullaniciKimlik IS NULL)
          OR (@YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
                AND @YapanKullaniciKimlik IS NOT NULL AND @YapanHesapKimlik IS NULL AND @YapanAdi IS NOT NULL)
       )
        THROW 51010, N'<Codex metni: işlemi yapan bilgisi eksik ya da tutarsız>', 1;

    /* Kodlar kod listesinde olmalı: yazılacak satırın yabancı anahtarı
       547 vermeden önce, isteğin başında ve açık numarayla reddedilir. */
    IF NOT EXISTS (SELECT 1 FROM kod.AktorTuru WHERE Kod = @YapanTuruKodu)
       OR NOT EXISTS (SELECT 1 FROM kod.KaynakUygulama WHERE Kod = @KaynakUygulamaKodu)
        THROW 51010, N'<Codex metni: işlemi yapanın türü ya da kaynak uygulaması tanımlı değil>', 1;

    /* Kullanıcı gerçekten o türden ve aktif olmalı. Yukarıdaki denetim yalnız
       "hangi kolon dolu, hangisi boş" kalıbına bakıyordu; servis türündeki bir
       kullanıcının kimliğiyle @YapanTuruKodu = N'personel' yazılabiliyordu ve
       talep.DurumGecmisi ile denetim.IslemKaydi — "kim yaptı" sorusunun tek
       değişmez kaydı — onu personel olarak gösteriyordu. @YapanAdi bilerek
       karşılaştırılmaz: o, yapanın O ANKİ adının kopyasıdır (kullanıcının adı
       sonra değişirse eski kayıt eski adı taşımalı). */
    IF @YapanKullaniciKimlik IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM erisim.Kullanici
                       WHERE Kimlik = @YapanKullaniciKimlik
                         AND TurKodu = @YapanTuruKodu
                         AND Aktif = 1)
        THROW 51010, N'<Codex metni: işlemi yapan kullanıcı yok, pasif ya da verilen türde değil>', 1;

    EXEC sys.sp_set_session_context @key = N'YapanTuruKodu',        @value = @YapanTuruKodu,        @read_only = 0;
    EXEC sys.sp_set_session_context @key = N'YapanKullaniciKimlik', @value = @YapanKullaniciKimlik, @read_only = 0;
    EXEC sys.sp_set_session_context @key = N'YapanHesapKimlik',     @value = @YapanHesapKimlik,     @read_only = 0;
    EXEC sys.sp_set_session_context @key = N'YapanAdi',             @value = @YapanAdi,             @read_only = 0;
    EXEC sys.sp_set_session_context @key = N'KaynakUygulamaKodu',   @value = @KaynakUygulamaKodu,   @read_only = 0;
    EXEC sys.sp_set_session_context @key = N'UygulamaSurumu',       @value = @UygulamaSurumu,       @read_only = 0;
    EXEC sys.sp_set_session_context @key = N'MusteriyeBildirildi',  @value = @MusteriyeBildirildi,  @read_only = 0;
END
GO

EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'YapanAyarla',
     @Metin = N'İsteği yapanı (tür, kullanıcı ya da hesap, ad, kaynak uygulama, sürüm) ve durum değişikliğinin müşteriye bildirilip bildirilmediğini oturum bağlamına (SESSION_CONTEXT) yazar. API her istekte, yazmadan önce çağırır; bağlantı havuzundan gelen oturumda önceki isteğin değeri kalmasın diye yedi anahtarın hepsi (boş olanlar dahil) her çağrıda yeniden yazılır. Yapan grubu kuralı tablolardaki CK_*_Yapan ile aynıdır; uymazsa ya da tür veya kaynak uygulama kodu kod listesinde yoksa 51010. Kullanıcı verilmişse erisim.Kullanici''da var olmalı, Aktif = 1 olmalı ve TurKodu @YapanTuruKodu ile aynı olmalıdır; değilse 51010 (18.09.2026). @YapanAdi kullanıcının bugünkü adıyla karşılaştırılmaz: o, yapanın o anki adının kopyasıdır. Bu prosedür atlanabilir (uygulama rolü sys.sp_set_session_context''i doğrudan çağırabilir), bu yüzden aynı çapraz denetim TR_talep_Talep_DurumGecmisi ve TR_denetim_IslemKaydi_Yapan tetikleyicilerinde de vardır; asıl kapı onlardır. Talep durum geçmişi tetikleyicisi (TR_talep_Talep_DurumGecmisi) bu değerleri okur. Örnek: EXEC sistem.YapanAyarla N''personel'', @Kullanici, NULL, N''Ayşe Yılmaz'', N''backoffice'', N''0.9.14'';';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'YapanAyarla', @Alt = N'@YapanTuruKodu', @AltTuru = N'PARAMETER',
     @Metin = N'kod.AktorTuru kodu: musteri, personel, servis, sistem, entegrasyon …';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'YapanAyarla', @Alt = N'@YapanKullaniciKimlik', @AltTuru = N'PARAMETER',
     @Metin = N'erisim.Kullanici kimliği; müşteri, sistem ve entegrasyon dışındaki türlerde zorunlu, müşteride boş.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'YapanAyarla', @Alt = N'@YapanHesapKimlik', @AltTuru = N'PARAMETER',
     @Metin = N'musteri.Hesap kimliği; yalnız müşteri türünde dolu.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'YapanAyarla', @Alt = N'@YapanAdi', @AltTuru = N'PARAMETER',
     @Metin = N'Yapanın o anki adı; kullanıcılı türlerde zorunlu, müşteride boş.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'YapanAyarla', @Alt = N'@KaynakUygulamaKodu', @AltTuru = N'PARAMETER',
     @Metin = N'kod.KaynakUygulama kodu: connect, backoffice, servisim, api, betik, entegrasyon, yonetim.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'YapanAyarla', @Alt = N'@UygulamaSurumu', @AltTuru = N'PARAMETER',
     @Metin = N'İsteği gönderen uygulamanın sürümü (bilgi amaçlı).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'YapanAyarla', @Alt = N'@MusteriyeBildirildi', @AltTuru = N'PARAMETER',
     @Metin = N'Bu istekteki talep durum değişikliği müşteriye bildiriliyor mu (talep.DurumGecmisi.MusteriyeBildirildi). Varsayılan 1.';
GO

/* --------------------------------------------------------------------------
   3. erisim.SifreYaz — personel ve servis girişinin şifre kaydı.
   Şifre belirlenmemiş ya da belirlenmesi istenmiş girişte geçerli jeton
   zorunlu; jeton verilmişse her durumda denetlenir.
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE erisim.SifreYaz
    @KullaniciKimlik uniqueidentifier,
    @SifreKaydi      nvarchar(255),
    @JetonKimlik     uniqueidentifier = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @MevcutKayit nvarchar(255);
    DECLARE @BelirlemeGerekli bit;

    IF @SifreKaydi IS NULL OR @SifreKaydi NOT LIKE N'$%$%'
        THROW 51030, N'<Codex metni: şifre kaydı boş ya da biçimi geçersiz>', 1;

    BEGIN TRANSACTION;

    SELECT @MevcutKayit = k.SifreKaydi,
           @BelirlemeGerekli = k.SifreBelirlemeGerekli
    FROM erisim.Kullanici AS k WITH (UPDLOCK, HOLDLOCK)
    WHERE k.Kimlik = @KullaniciKimlik;

    IF @@ROWCOUNT = 0
        THROW 51102, N'<Codex metni: kullanıcı bulunamadı>', 1;

    IF (@MevcutKayit IS NULL OR @BelirlemeGerekli = 1) AND @JetonKimlik IS NULL
        THROW 51030, N'<Codex metni: şifre belirlemek için geçerli ve kullanılmamış bir kod gerekir>', 1;

    IF @JetonKimlik IS NOT NULL
    BEGIN
        UPDATE erisim.SifreSifirlamaJetonu
           SET KullanilmaZamani = @Simdi
         WHERE Kimlik = @JetonKimlik
           AND KullaniciKimlik = @KullaniciKimlik
           AND KullanilmaZamani IS NULL
           AND IptalZamani IS NULL
           AND SonGecerlilikZamani > @Simdi;

        IF @@ROWCOUNT = 0
            THROW 51030, N'<Codex metni: şifre belirlemek için geçerli ve kullanılmamış bir kod gerekir>', 1;
    END;

    UPDATE erisim.SifreSifirlamaJetonu
       SET IptalZamani = @Simdi
     WHERE KullaniciKimlik = @KullaniciKimlik
       AND KullanilmaZamani IS NULL
       AND IptalZamani IS NULL;

    UPDATE erisim.Kullanici
       SET SifreKaydi = @SifreKaydi,
           SifreBelirlemeGerekli = 0,
           SifreDegistirmeZamani = @Simdi
     WHERE Kimlik = @KullaniciKimlik;

    UPDATE erisim.Oturum
       SET KapanmaZamani = @Simdi,
           KapanmaNedeniKodu = N'sifreDegisti'
     WHERE KullaniciKimlik = @KullaniciKimlik
       AND KapanmaZamani IS NULL;

    COMMIT TRANSACTION;
END
GO

EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'SifreYaz',
     @Metin = N'Personel ya da servis girişinin şifre kaydını (scrypt PHC dizgisi) yazar; uygulama SifreKaydi kolonunu doğrudan güncelleyemez. Şifresi hiç belirlenmemiş ya da belirlemesi istenmiş girişte geçerli sıfırlama jetonu ister (51030). Aynı işlemde jetonu kullanılmış yapar, öteki açık jetonları iptal eder, SifreBelirlemeGerekli = 0 ve SifreDegistirmeZamani yazar, açık oturumları sifreDegisti nedeniyle kapatır. Kullanıcı yoksa 51102.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'SifreYaz', @Alt = N'@KullaniciKimlik', @AltTuru = N'PARAMETER',
     @Metin = N'Şifresi yazılacak erisim.Kullanici kimliği.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'SifreYaz', @Alt = N'@SifreKaydi', @AltTuru = N'PARAMETER',
     @Metin = N'API''nin ürettiği PHC dizgisi ($scrypt$ln=15,r=8,p=1$<tuz>$<özet>). Düz şifre asla verilmez.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'SifreYaz', @Alt = N'@JetonKimlik', @AltTuru = N'PARAMETER',
     @Metin = N'erisim.SifreSifirlamaJetonu kimliği; API girilen kodun özetiyle bulur. Aynı kullanıcıya ait, kullanılmamış, iptal edilmemiş ve süresi geçmemiş olmalı.';
GO

/* --------------------------------------------------------------------------
   4. musteri.SifreYaz — müşteri hesabının şifre kaydı.
   Kod, son 15 dakikada API tarafından doğrulanıp kullanılmış olmalı ve
   hesabın son şifre değişikliğinden sonra kullanılmış olmalı (aynı kodla
   ikinci yazma böylece reddedilir).
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE musteri.SifreYaz
    @HesapKimlik         uniqueidentifier,
    @SifreKaydi          nvarchar(255),
    @DogrulamaKoduKimlik uniqueidentifier = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @MevcutKayit nvarchar(255);
    DECLARE @Telefon nvarchar(16);
    DECLARE @DegistirmeZamani datetime2(3);

    IF @SifreKaydi IS NULL OR @SifreKaydi NOT LIKE N'$%$%'
        THROW 51030, N'<Codex metni: şifre kaydı boş ya da biçimi geçersiz>', 1;

    BEGIN TRANSACTION;

    SELECT @MevcutKayit = h.SifreKaydi,
           @Telefon = h.TelefonE164,
           @DegistirmeZamani = h.SifreDegistirmeZamani
    FROM musteri.Hesap AS h WITH (UPDLOCK, HOLDLOCK)
    WHERE h.Kimlik = @HesapKimlik;

    IF @@ROWCOUNT = 0
        THROW 51102, N'<Codex metni: hesap bulunamadı>', 1;

    IF @MevcutKayit IS NULL AND @DogrulamaKoduKimlik IS NULL
        THROW 51030, N'<Codex metni: şifre belirlemek için doğrulanmış bir kod gerekir>', 1;

    IF @DogrulamaKoduKimlik IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM erisim.DogrulamaKodu AS d
           WHERE d.Kimlik = @DogrulamaKoduKimlik
             AND d.AmacKodu IN (N'kayit', N'sifreSifirlama')
             AND d.TelefonE164 = @Telefon
             AND (d.HesapKimlik IS NULL OR d.HesapKimlik = @HesapKimlik)
             AND d.KullanilmaZamani IS NOT NULL
             AND d.KullanilmaZamani >= DATEADD(minute, -15, @Simdi)
             AND (@DegistirmeZamani IS NULL OR @DegistirmeZamani < d.KullanilmaZamani))
        THROW 51030, N'<Codex metni: şifre belirlemek için doğrulanmış bir kod gerekir>', 1;

    UPDATE musteri.Hesap
       SET SifreKaydi = @SifreKaydi,
           SifreDegistirmeZamani = @Simdi
     WHERE Kimlik = @HesapKimlik;

    COMMIT TRANSACTION;
END
GO

EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'SifreYaz',
     @Metin = N'Müşteri hesabının şifre kaydını (scrypt PHC dizgisi) yazar; uygulama SifreKaydi kolonunu doğrudan güncelleyemez. Şifresi olmayan hesapta doğrulama kodu zorunlu; kod verilmişse her durumda denetlenir: amacı kayit ya da sifreSifirlama, telefonu hesabın telefonu, başka bir hesaba bağlı değil, son 15 dakikada kullanılmış ve hesabın son şifre değişikliğinden sonra kullanılmış olmalı (51030). Hesap yoksa 51102. Oturumları kapatmaz.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'SifreYaz', @Alt = N'@HesapKimlik', @AltTuru = N'PARAMETER',
     @Metin = N'Şifresi yazılacak musteri.Hesap kimliği.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'SifreYaz', @Alt = N'@SifreKaydi', @AltTuru = N'PARAMETER',
     @Metin = N'API''nin ürettiği PHC dizgisi ($scrypt$ln=15,r=8,p=1$<tuz>$<özet>). Düz şifre asla verilmez.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'SifreYaz', @Alt = N'@DogrulamaKoduKimlik', @AltTuru = N'PARAMETER',
     @Metin = N'API''nin az önce doğrulayıp KullanilmaZamani yazdığı erisim.DogrulamaKodu kimliği.';
GO

/* --------------------------------------------------------------------------
   5. sistem.SaklamaUygula — sistem.SaklamaKurali satırlarını uygular.
   Her kuralın gövdesi sabit yazılıdır (dinamik SQL yok); süre SureGun'dan
   okunur. SureGun NULL ya da EylemKodu 'sakla' ise kural atlanır.
   Silme sırası yabancı anahtarlara uyar. Sonunda tek denetim.IslemKaydi
   satırı (saklamaUygulandi) ve kural başına satır sayısı sonuç kümesi.
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE sistem.SaklamaUygula
    @EnFazlaSatir int = 5000
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @EnFazlaSatir IS NULL OR @EnFazlaSatir < 1
        SET @EnFazlaSatir = 5000;

    DECLARE @Simdi datetime2(3) = SYSUTCDATETIME();
    DECLARE @Gun int;
    DECLARE @Sinir datetime2(3);
    DECLARE @Satir int;
    DECLARE @Sonuc TABLE (Sira int IDENTITY(1, 1) PRIMARY KEY,
                          kayitTuru nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
                          satir int NOT NULL);

    BEGIN TRANSACTION;

    /* erisim.GirisDenemesi */
    SET @Gun = NULL;
    SELECT @Gun = SureGun FROM sistem.SaklamaKurali
     WHERE KayitTuruKodu = N'girisDenemesi' AND EylemKodu <> N'sakla' AND SureGun IS NOT NULL;
    IF @Gun IS NOT NULL
    BEGIN
        SET @Sinir = DATEADD(day, -@Gun, @Simdi);
        DELETE TOP (@EnFazlaSatir) FROM erisim.GirisDenemesi
         WHERE DenemeZamani < @Sinir;
        SET @Satir = @@ROWCOUNT;
        INSERT @Sonuc (kayitTuru, satir) VALUES (N'girisDenemesi', @Satir);
    END;

    /* erisim.DogrulamaKodu */
    SET @Gun = NULL;
    SELECT @Gun = SureGun FROM sistem.SaklamaKurali
     WHERE KayitTuruKodu = N'dogrulamaKodu' AND EylemKodu <> N'sakla' AND SureGun IS NOT NULL;
    IF @Gun IS NOT NULL
    BEGIN
        SET @Sinir = DATEADD(day, -@Gun, @Simdi);
        DELETE TOP (@EnFazlaSatir) FROM erisim.DogrulamaKodu
         WHERE OlusmaZamani < @Sinir;
        SET @Satir = @@ROWCOUNT;
        INSERT @Sonuc (kayitTuru, satir) VALUES (N'dogrulamaKodu', @Satir);
    END;

    /* erisim.SifreSifirlamaJetonu */
    SET @Gun = NULL;
    SELECT @Gun = SureGun FROM sistem.SaklamaKurali
     WHERE KayitTuruKodu = N'sifreSifirlamaJetonu' AND EylemKodu <> N'sakla' AND SureGun IS NOT NULL;
    IF @Gun IS NOT NULL
    BEGIN
        SET @Sinir = DATEADD(day, -@Gun, @Simdi);
        DELETE TOP (@EnFazlaSatir) FROM erisim.SifreSifirlamaJetonu
         WHERE SonGecerlilikZamani < @Sinir;
        SET @Satir = @@ROWCOUNT;
        INSERT @Sonuc (kayitTuru, satir) VALUES (N'sifreSifirlamaJetonu', @Satir);
    END;

    /* erisim.Oturum: kapanmış ya da süresi bitmiş */
    SET @Gun = NULL;
    SELECT @Gun = SureGun FROM sistem.SaklamaKurali
     WHERE KayitTuruKodu = N'oturum' AND EylemKodu <> N'sakla' AND SureGun IS NOT NULL;
    IF @Gun IS NOT NULL
    BEGIN
        SET @Sinir = DATEADD(day, -@Gun, @Simdi);
        DELETE TOP (@EnFazlaSatir) FROM erisim.Oturum
         WHERE (KapanmaZamani IS NOT NULL OR BitisZamani <= @Simdi)
           AND COALESCE(KapanmaZamani, BitisZamani) < @Sinir;
        SET @Satir = @@ROWCOUNT;
        INSERT @Sonuc (kayitTuru, satir) VALUES (N'oturum', @Satir);
    END;

    /* destek: önce olaylar, sonra olayı kalmayan oturumlar */
    SET @Gun = NULL;
    SELECT @Gun = SureGun FROM sistem.SaklamaKurali
     WHERE KayitTuruKodu = N'destekOturumu' AND EylemKodu <> N'sakla' AND SureGun IS NOT NULL;
    IF @Gun IS NOT NULL
    BEGIN
        SET @Sinir = DATEADD(day, -@Gun, @Simdi);

        DELETE TOP (@EnFazlaSatir) o
          FROM destek.SohbetOlayi AS o
          JOIN destek.SohbetOturumu AS s ON s.Kimlik = o.SohbetOturumuKimlik
         WHERE s.SonHareketZamani < @Sinir;
        SET @Satir = @@ROWCOUNT;

        DELETE TOP (@EnFazlaSatir) s
          FROM destek.SohbetOturumu AS s
         WHERE s.SonHareketZamani < @Sinir
           AND NOT EXISTS (SELECT 1 FROM destek.SohbetOlayi AS o WHERE o.SohbetOturumuKimlik = s.Kimlik);
        SET @Satir = @Satir + @@ROWCOUNT;

        INSERT @Sonuc (kayitTuru, satir) VALUES (N'destekOturumu', @Satir);
    END;

    /* sistem.Giden: bağlı satırda gövde boşaltılır, bağsız satır silinir */
    SET @Gun = NULL;
    SELECT @Gun = SureGun FROM sistem.SaklamaKurali
     WHERE KayitTuruKodu = N'giden' AND EylemKodu <> N'sakla' AND SureGun IS NOT NULL;
    IF @Gun IS NOT NULL
    BEGIN
        SET @Sinir = DATEADD(day, -@Gun, @Simdi);

        UPDATE TOP (@EnFazlaSatir) g
           SET Govde = NULL, Konu = NULL, DegiskenlerJson = NULL, AliciAdres = NULL
          FROM sistem.Giden AS g
         WHERE g.DurumKodu IN (N'gonderildi', N'vazgecildi')
           AND COALESCE(g.GonderilmeZamani, g.OlusmaZamani) < @Sinir
           AND (g.Govde IS NOT NULL OR g.Konu IS NOT NULL OR g.DegiskenlerJson IS NOT NULL OR g.AliciAdres IS NOT NULL)
           AND (EXISTS (SELECT 1 FROM bildirim.Teslimat AS t WHERE t.GidenKimlik = g.Kimlik)
                OR EXISTS (SELECT 1 FROM erisim.DogrulamaKodu AS d WHERE d.GidenKimlik = g.Kimlik));
        SET @Satir = @@ROWCOUNT;

        DECLARE @SilinecekGiden TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY);

        INSERT @SilinecekGiden (Kimlik)
        SELECT TOP (@EnFazlaSatir) g.Kimlik
          FROM sistem.Giden AS g
         WHERE g.DurumKodu IN (N'gonderildi', N'vazgecildi')
           AND COALESCE(g.GonderilmeZamani, g.OlusmaZamani) < @Sinir
           AND NOT EXISTS (SELECT 1 FROM bildirim.Teslimat AS t WHERE t.GidenKimlik = g.Kimlik)
           AND NOT EXISTS (SELECT 1 FROM erisim.DogrulamaKodu AS d WHERE d.GidenKimlik = g.Kimlik);

        DELETE e
          FROM sistem.GidenEki AS e
          JOIN @SilinecekGiden AS s ON s.Kimlik = e.GidenKimlik;

        DELETE g
          FROM sistem.Giden AS g
          JOIN @SilinecekGiden AS s ON s.Kimlik = g.Kimlik;
        SET @Satir = @Satir + @@ROWCOUNT;

        INSERT @Sonuc (kayitTuru, satir) VALUES (N'giden', @Satir);
    END;

    /* sistem.TekrarAnahtari */
    SET @Gun = NULL;
    SELECT @Gun = SureGun FROM sistem.SaklamaKurali
     WHERE KayitTuruKodu = N'tekrarAnahtari' AND EylemKodu <> N'sakla' AND SureGun IS NOT NULL;
    IF @Gun IS NOT NULL
    BEGIN
        SET @Sinir = DATEADD(day, -@Gun, @Simdi);
        DELETE TOP (@EnFazlaSatir) FROM sistem.TekrarAnahtari
         WHERE SonGecerlilikZamani < @Sinir;
        SET @Satir = @@ROWCOUNT;
        INSERT @Sonuc (kayitTuru, satir) VALUES (N'tekrarAnahtari', @Satir);
    END;

    /* entegrasyon.LogoSeriSorgusu: kayıt olayının başvurmadığı */
    SET @Gun = NULL;
    SELECT @Gun = SureGun FROM sistem.SaklamaKurali
     WHERE KayitTuruKodu = N'logoSeriSorgusu' AND EylemKodu <> N'sakla' AND SureGun IS NOT NULL;
    IF @Gun IS NOT NULL
    BEGIN
        SET @Sinir = DATEADD(day, -@Gun, @Simdi);
        DELETE TOP (@EnFazlaSatir) l
          FROM entegrasyon.LogoSeriSorgusu AS l
         WHERE l.GecerlilikBitisZamani < @Sinir
           AND NOT EXISTS (SELECT 1 FROM makine.KayitOlayi AS k WHERE k.LogoSeriSorgusuKimlik = l.Kimlik);
        SET @Satir = @@ROWCOUNT;
        INSERT @Sonuc (kayitTuru, satir) VALUES (N'logoSeriSorgusu', @Satir);
    END;

    /* entegrasyon.IceAktarimSatiri: ham veri boşaltılır */
    SET @Gun = NULL;
    SELECT @Gun = SureGun FROM sistem.SaklamaKurali
     WHERE KayitTuruKodu = N'iceAktarimSatiri' AND EylemKodu <> N'sakla' AND SureGun IS NOT NULL;
    IF @Gun IS NOT NULL
    BEGIN
        SET @Sinir = DATEADD(day, -@Gun, @Simdi);
        UPDATE TOP (@EnFazlaSatir) s
           SET HamVeriJson = NULL
          FROM entegrasyon.IceAktarimSatiri AS s
          JOIN entegrasyon.IceAktarim AS a ON a.Kimlik = s.IceAktarimKimlik
         WHERE a.DurumKodu IN (N'uygulandi', N'hata')
           AND a.OlusmaZamani < @Sinir
           AND s.HamVeriJson IS NOT NULL;
        SET @Satir = @@ROWCOUNT;
        INSERT @Sonuc (kayitTuru, satir) VALUES (N'iceAktarimSatiri', @Satir);
    END;

    /* dosya.Dosya: iptal edilmiş talebin genel sınıftaki dosyaları.
       Satır silinmez; SilinmeIstendiZamani yazılır, diskten API siler. */
    SET @Gun = NULL;
    SELECT @Gun = SureGun FROM sistem.SaklamaKurali
     WHERE KayitTuruKodu = N'iptalTalepDosyasi' AND EylemKodu <> N'sakla' AND SureGun IS NOT NULL;
    IF @Gun IS NOT NULL
    BEGIN
        SET @Sinir = DATEADD(day, -@Gun, @Simdi);

        WITH iptalTalep AS (
            SELECT t.Kimlik, t.SesDosyaKimlik
              FROM talep.Talep AS t
             WHERE t.DurumKodu = N'iptal'
               AND t.KapanmaZamani < @Sinir
        ), talepDosyasi AS (
            SELECT te.DosyaKimlik
              FROM talep.TalepEki AS te
              JOIN iptalTalep AS it ON it.Kimlik = te.TalepKimlik
            UNION
            SELECT ee.DosyaKimlik
              FROM talep.EklemeEki AS ee
              JOIN talep.Ekleme AS e ON e.Kimlik = ee.EklemeKimlik
              JOIN iptalTalep AS it ON it.Kimlik = e.TalepKimlik
            UNION
            SELECT it.SesDosyaKimlik
              FROM iptalTalep AS it
             WHERE it.SesDosyaKimlik IS NOT NULL
            UNION
            SELECT e.SesDosyaKimlik
              FROM talep.Ekleme AS e
              JOIN iptalTalep AS it ON it.Kimlik = e.TalepKimlik
             WHERE e.SesDosyaKimlik IS NOT NULL
        )
        UPDATE TOP (@EnFazlaSatir) d
           SET SilinmeIstendiZamani = @Simdi
          FROM dosya.Dosya AS d
         WHERE d.SaklamaSinifiKodu = N'genel'
           AND d.SilinmeIstendiZamani IS NULL
           AND d.Kimlik IN (SELECT DosyaKimlik FROM talepDosyasi);
        SET @Satir = @@ROWCOUNT;
        INSERT @Sonuc (kayitTuru, satir) VALUES (N'iptalTalepDosyasi', @Satir);
    END;

    /* İmha kaydı: her çalışmada tek satır */
    INSERT denetim.IslemKaydi
        (IslemTuruKodu, IslemZamani, YapanTuruKodu, KaynakUygulamaKodu, AyrintiJson)
    VALUES
        (N'saklamaUygulandi', @Simdi, N'sistem', N'api',
         (SELECT JSON_QUERY(ISNULL((SELECT kayitTuru, satir FROM @Sonuc ORDER BY Sira FOR JSON PATH), N'[]')) AS kurallar
          FOR JSON PATH, WITHOUT_ARRAY_WRAPPER));

    COMMIT TRANSACTION;

    SELECT kayitTuru AS KayitTuruKodu, satir AS EtkilenenSatir
      FROM @Sonuc
     ORDER BY Sira;
END
GO

EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'SaklamaUygula',
     @Metin = N'sistem.SaklamaKurali satırlarındaki süreleri uygular: süresi dolan giriş denemelerini, doğrulama kodlarını, sıfırlama jetonlarını, oturumları, destek sohbetlerini, giden mesajları ve tekrar anahtarlarını siler; kullanılmayan LOGO seri sorgularını siler; içe aktarım ham verisini boşaltır; iptal edilmiş taleplerin genel dosyalarına silinme isteği yazar. SureGun NULL ya da eylemi sakla olan kural atlanır. Kural başına en çok @EnFazlaSatir satır işler; kalan bir sonraki çalışmaya kalır. Her çalışmada tek denetim.IslemKaydi (saklamaUygulandi) satırı yazar ve kural başına etkilenen satır sayısını döndürür. Günlük çağrıyı API ya da işletim sistemi zamanlayıcısı yapar. Dekont, işlem kaydı ve rıza olayı silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'SaklamaUygula', @Alt = N'@EnFazlaSatir', @AltTuru = N'PARAMETER',
     @Metin = N'Bir çalışmada kural başına (her silme ya da güncelleme adımında) işlenecek en çok satır; varsayılan 5000. Boş ya da 1''den küçükse 5000.';
GO

/* --------------------------------------------------------------------------
   İzinler (Bölüm 4.2): uygulama rolü iç prosedürleri çalıştırır; tablolara
   yazma sahiplik zinciriyle olur.
   -------------------------------------------------------------------------- */
GRANT EXECUTE ON OBJECT::sistem.NumaraAl      TO rol_uygulama;
GRANT EXECUTE ON OBJECT::sistem.YapanAyarla   TO rol_uygulama;
GRANT EXECUTE ON OBJECT::sistem.SaklamaUygula TO rol_uygulama;
GRANT EXECUTE ON OBJECT::erisim.SifreYaz      TO rol_uygulama;
GRANT EXECUTE ON OBJECT::musteri.SifreYaz     TO rol_uygulama;
GO
