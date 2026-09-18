/* ==========================================================================
   V0010 — makine şeması

   Makinenin tek kaydı (marka + seri numarası), sahiplik geçmişi, servis
   ataması, satış kayıtları, kayıt olayları ve bakım işaretleri.
   Görünümler (MakineGuncelSahibi, MakineninBayisi, MakineninServisi,
   MakineGarantisi) R03 betiğindedir.

   Kural kaynağı: veritabani/tasarim.md (Bölüm 0.4 "makine", 1.9.6 garanti
   süresinin sabitlenmesi, 1.11.2 açık geçmiş tabloları, 1.16 yapan grubu,
   1.17.1 varsayılan-red atama kısıtı, 1.17.3 zamanla bitebilen yetki,
   6.2 betik sırası).

   Sıra: Makine, MakineSahipligi, MakineServisAtamasi, MakineSatisi,
   KayitOlayi, BakimTamamlama.

   Önce gelen betikler: V0002 (kod), V0003 (cografya), V0004 (katalog),
   V0005 (erisim), V0006 (musteri), V0007 (dosya), V0008 (servis, bayi),
   V0009 (entegrasyon).

   Yetkiler (GRANT/DENY) V0015'te verilir.
   ========================================================================== */


/* --------------------------------------------------------------------------
   makine.Makine — makinenin tek kaydı [K] [O] [A] [R] [E]

   (MarkaKodu, SeriNo) tekildir. Seri numarası sadeleştirilmiş saklanır:
   büyük harf, yalnız A-Z ve 0-9; harfler silinmez (KOD 4.4).
   (Kimlik, MarkaKodu) tekilliği talep.Talep ve MakineServisAtamasi'nın
   bileşik yabancı anahtar hedefidir.
   -------------------------------------------------------------------------- */

CREATE TABLE makine.Makine (
    SeriNo               nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    SeriNoYazildigiGibi  nvarchar(60) COLLATE Latin1_General_100_BIN2 NULL,
    SeridenUretimYili    smallint NULL,
    UretimTarihi         date NULL,
    SeriBicimeUygun      bit NULL,
    LogoMalzemeKodu      nvarchar(32) COLLATE Latin1_General_100_BIN2 NULL,
    MarkaKodu            nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UrunKodu             nvarchar(60) COLLATE Latin1_General_100_BIN2 NULL,
    VaryantKodu          nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaKaynagiKodu    nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanTuruKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik uniqueidentifier NULL,
    YapanHesapKimlik     uniqueidentifier NULL,
    YapanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu       nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani         datetime2(3) NOT NULL
        CONSTRAINT DF_makine_Makine_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo              bigint IDENTITY(1,1) NOT NULL,
    Kimlik               uniqueidentifier NOT NULL
        CONSTRAINT DF_makine_Makine_Kimlik DEFAULT NEWID(),
    EskiKayitNo          nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
    EskiNumara           nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    SatirSurumu          rowversion NOT NULL,

    CONSTRAINT PK_makine_Makine PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_makine_Makine_MarkaKoduSeriNo UNIQUE (MarkaKodu, SeriNo),
    CONSTRAINT UQ_makine_Makine_KimlikMarkaKodu UNIQUE (Kimlik, MarkaKodu),
    CONSTRAINT FK_makine_Makine_katalog_Marka
        FOREIGN KEY (MarkaKodu) REFERENCES katalog.Marka (Kod),
    CONSTRAINT FK_makine_Makine_katalog_Urun
        FOREIGN KEY (MarkaKodu, UrunKodu) REFERENCES katalog.Urun (MarkaKodu, Kod),
    CONSTRAINT FK_makine_Makine_katalog_UrunVaryanti
        FOREIGN KEY (MarkaKodu, UrunKodu, VaryantKodu) REFERENCES katalog.UrunVaryanti (MarkaKodu, UrunKodu, Kod),
    CONSTRAINT FK_makine_Makine_kod_KayitKaynagi
        FOREIGN KEY (OlusmaKaynagiKodu) REFERENCES kod.KayitKaynagi (Kod),
    CONSTRAINT FK_makine_Makine_kod_AktorTuru
        FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_makine_Makine_erisim_Kullanici_Yapan
        FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_makine_Makine_musteri_Hesap_Yapan
        FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_makine_Makine_kod_KaynakUygulama
        FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_makine_Makine_SeriNo
        CHECK (LEN(SeriNo) >= 3 AND SeriNo NOT LIKE N'%[^A-Z0-9]%'),
    CONSTRAINT CK_makine_Makine_SeridenUretimYili
        CHECK (SeridenUretimYili IS NULL OR SeridenUretimYili BETWEEN 1900 AND 2100),
    CONSTRAINT CK_makine_Makine_VaryantKodu
        CHECK (VaryantKodu IS NULL OR UrunKodu IS NOT NULL),
    CONSTRAINT CK_makine_Makine_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);

CREATE UNIQUE CLUSTERED INDEX CX_makine_Makine_KayitNo ON makine.Makine (KayitNo);
CREATE NONCLUSTERED INDEX IX_makine_Makine_SeriNo ON makine.Makine (SeriNo);
CREATE NONCLUSTERED INDEX IX_makine_Makine_MarkaKoduUrunKoduVaryantKodu ON makine.Makine (MarkaKodu, UrunKodu, VaryantKodu);
CREATE NONCLUSTERED INDEX IX_makine_Makine_OlusmaKaynagiKodu ON makine.Makine (OlusmaKaynagiKodu);
CREATE NONCLUSTERED INDEX IX_makine_Makine_LogoMalzemeKodu ON makine.Makine (LogoMalzemeKodu) WHERE LogoMalzemeKodu IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_makine_Makine_YapanTuruKodu ON makine.Makine (YapanTuruKodu);
CREATE NONCLUSTERED INDEX IX_makine_Makine_YapanKullaniciKimlik ON makine.Makine (YapanKullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_makine_Makine_YapanHesapKimlik ON makine.Makine (YapanHesapKimlik);
CREATE NONCLUSTERED INDEX IX_makine_Makine_KaynakUygulamaKodu ON makine.Makine (KaynakUygulamaKodu);
CREATE NONCLUSTERED INDEX IX_makine_Makine_EskiNumara ON makine.Makine (EskiNumara) WHERE EskiNumara IS NOT NULL;

EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Metin = N'Makinenin tek kaydı: marka ve seri numarası birlikte tekildir. Sahibi makine.MakineSahipligi''nde, servisi makine.MakineServisAtamasi''nda ve makine.MakineninServisi görünümünde, satışları makine.MakineSatisi''nde, garantisi makine.MakineGarantisi görünümündedir. Seriyle ararken yardim.Sadelestir kullanın (ork1270-2024-00157 → ORK1270202400157).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'SeriNo', @Metin = N'Plakadaki seri numarası, sadeleştirilmiş: büyük harf, yalnız A-Z ve 0-9, harfler silinmez (ORK1270202400157). Tireli ya da küçük harfle yapılan eşitlik araması kayıt bulmaz. Her yazımla aramak için EXEC yardim.MakineGoster N''ork1270-2024-00157'' ya da WHERE SeriNo = (SELECT Kod FROM yardim.Sadelestir(N''ork1270-2024-00157'')) kullanın.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'SeriNoYazildigiGibi', @Metin = N'Seri numarasının ilk girildiği hâli, olduğu gibi (ORK1270-2024-00157). Yalnız bilgi amaçlı.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'SeridenUretimYili', @Metin = N'Seri numarasından okunan üretim yılı. Okunamadıysa boş. Garanti başka bilgi yoksa buna göre hesaplanır.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'UretimTarihi', @Metin = N'LOGO''dan gelen üretim tarihi (gün). Bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'SeriBicimeUygun', @Metin = N'Seri numarası markanın seri kuralına uyuyorsa 1, uymuyorsa 0, denetlenmediyse boş. Uymayan seri reddedilmez, yalnız kontrol listesine düşer.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'LogoMalzemeKodu', @Metin = N'LOGO satış faturasındaki malzeme kodu, olduğu gibi (pilotta Excel dökümünden). Bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'MarkaKodu', @Metin = N'Makinenin markası (katalog.Marka). Kayıt açıldıktan sonra değişmez.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'UrunKodu', @Metin = N'Makinenin modeli (katalog.Urun; örnek orkinos-1270). Bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'VaryantKodu', @Metin = N'Modelin varyantı (katalog.UrunVaryanti). Yalnız UrunKodu doluyken yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'OlusmaKaynagiKodu', @Metin = N'Makine kaydının ilk nereden açıldığı (kod.KayitKaynagi; örnek musteri = Connect, servis = Servisim elle kaydı, personel, logo).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'YapanTuruKodu', @Metin = N'Kaydı kimin yazdığı: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'YapanKullaniciKimlik', @Metin = N'Kaydı yazan personel ya da servis girişi (erisim.Kullanici). Müşteri, sistem ve entegrasyon yazdıysa boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'YapanHesapKimlik', @Metin = N'Kaydı yazan müşteri hesabı (musteri.Hesap). Yalnız müşteri yazdıysa dolu.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'YapanAdi', @Metin = N'Kaydı yazan kişinin o anki adı. Müşteri için boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama (kod.KaynakUygulama; örnek connect, servisim, backoffice).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (örnek 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'OlusmaZamani', @Metin = N'Makine kaydının veritabanına yazıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'KayitNo', @Metin = N'Yalnız veritabanında satır seçmek içindir; ekrana, SMS''e ve LOGO''ya çıkmaz. Makineyi seçerken seri numarası ve marka kullanılır.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda ve gorunum görünümlerinde yer almaz.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'EskiKayitNo', @Metin = N'Eski uygulamadaki kimlik (taşıma için).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'EskiNumara', @Metin = N'Eski uygulamadaki numara (taşıma için). Yeniden verilmez.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'Makine', @Alt = N'SatirSurumu', @Metin = N'Aynı satırı iki kişinin aynı anda değiştirmesini önleyen sürüm damgası. SQL Server kendisi yazar.';
GO


/* --------------------------------------------------------------------------
   makine.MakineSahipligi — makinenin hangi müşteri hesabında olduğu [K] [A]

   Açık geçmiş tablosu (Bölüm 1.11.2): sahiplik bitince satır silinmez,
   BitisZamani ve BitisNedeniKodu yazılır. Makine başına en çok bir açık
   sahiplik.
   -------------------------------------------------------------------------- */

CREATE TABLE makine.MakineSahipligi (
    TakmaAd              nvarchar(30) COLLATE Turkish_100_CI_AS NULL,
    MakineKimlik         uniqueidentifier NOT NULL,
    HesapKimlik          uniqueidentifier NOT NULL,
    KaynakKodu           nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    BaslangicZamani      datetime2(3) NOT NULL
        CONSTRAINT DF_makine_MakineSahipligi_BaslangicZamani DEFAULT SYSUTCDATETIME(),
    BitisZamani          datetime2(3) NULL,
    BitisNedeniKodu      nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    YapanTuruKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik uniqueidentifier NULL,
    YapanHesapKimlik     uniqueidentifier NULL,
    YapanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu       nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    KayitNo              bigint IDENTITY(1,1) NOT NULL,
    Kimlik               uniqueidentifier NOT NULL
        CONSTRAINT DF_makine_MakineSahipligi_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_makine_MakineSahipligi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_makine_MakineSahipligi_makine_Makine
        FOREIGN KEY (MakineKimlik) REFERENCES makine.Makine (Kimlik),
    CONSTRAINT FK_makine_MakineSahipligi_musteri_Hesap
        FOREIGN KEY (HesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_makine_MakineSahipligi_kod_KayitKaynagi
        FOREIGN KEY (KaynakKodu) REFERENCES kod.KayitKaynagi (Kod),
    CONSTRAINT FK_makine_MakineSahipligi_kod_SahiplikBitisNedeni
        FOREIGN KEY (BitisNedeniKodu) REFERENCES kod.SahiplikBitisNedeni (Kod),
    CONSTRAINT FK_makine_MakineSahipligi_kod_AktorTuru
        FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_makine_MakineSahipligi_erisim_Kullanici_Yapan
        FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_makine_MakineSahipligi_musteri_Hesap_Yapan
        FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_makine_MakineSahipligi_kod_KaynakUygulama
        FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_makine_MakineSahipligi_Bitis
        CHECK ((BitisZamani IS NULL AND BitisNedeniKodu IS NULL)
            OR (BitisZamani IS NOT NULL AND BitisNedeniKodu IS NOT NULL)),
    CONSTRAINT CK_makine_MakineSahipligi_BitisZamani
        CHECK (BitisZamani IS NULL OR BitisZamani >= BaslangicZamani),
    CONSTRAINT CK_makine_MakineSahipligi_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);

CREATE UNIQUE CLUSTERED INDEX CX_makine_MakineSahipligi_KayitNo ON makine.MakineSahipligi (KayitNo);
CREATE UNIQUE NONCLUSTERED INDEX UX_makine_MakineSahipligi_AcikSahiplik ON makine.MakineSahipligi (MakineKimlik) WHERE BitisZamani IS NULL;
CREATE NONCLUSTERED INDEX IX_makine_MakineSahipligi_MakineKimlikBaslangicZamani ON makine.MakineSahipligi (MakineKimlik, BaslangicZamani);
CREATE NONCLUSTERED INDEX IX_makine_MakineSahipligi_HesapKimlikBitisZamani ON makine.MakineSahipligi (HesapKimlik, BitisZamani) INCLUDE (MakineKimlik, TakmaAd);
CREATE NONCLUSTERED INDEX IX_makine_MakineSahipligi_KaynakKodu ON makine.MakineSahipligi (KaynakKodu);
CREATE NONCLUSTERED INDEX IX_makine_MakineSahipligi_BitisNedeniKodu ON makine.MakineSahipligi (BitisNedeniKodu);
CREATE NONCLUSTERED INDEX IX_makine_MakineSahipligi_YapanTuruKodu ON makine.MakineSahipligi (YapanTuruKodu);
CREATE NONCLUSTERED INDEX IX_makine_MakineSahipligi_YapanKullaniciKimlik ON makine.MakineSahipligi (YapanKullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_makine_MakineSahipligi_YapanHesapKimlik ON makine.MakineSahipligi (YapanHesapKimlik);
CREATE NONCLUSTERED INDEX IX_makine_MakineSahipligi_KaynakUygulamaKodu ON makine.MakineSahipligi (KaynakUygulamaKodu);

EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSahipligi', @Metin = N'Makinenin hangi müşteri hesabına kayıtlı olduğu ve bunun geçmişi. Sahiplik bitince satır silinmez; BitisZamani ve bitiş nedeni yazılır. Bir makinenin aynı anda en çok bir açık sahipliği olur. Güncel sahip için makine.MakineGuncelSahibi görünümüne bakın.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSahipligi', @Alt = N'TakmaAd', @Metin = N'Müşterinin makineye Connect''te verdiği ad (örnek "Büyük balya"). Anonimleştirmede silinir.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSahipligi', @Alt = N'MakineKimlik', @Metin = N'Sahipliği tutulan makine (makine.Makine).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSahipligi', @Alt = N'HesapKimlik', @Metin = N'Makinenin kayıtlı olduğu müşteri hesabı (musteri.Hesap).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSahipligi', @Alt = N'KaynakKodu', @Metin = N'Sahipliğin nereden kurulduğu (kod.KayitKaynagi; örnek musteri = Connect''te makine ekleme, personel).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSahipligi', @Alt = N'BaslangicZamani', @Metin = N'Sahipliğin başladığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSahipligi', @Alt = N'BitisZamani', @Metin = N'Sahipliğin bittiği an (UTC). Güncel sahiplikte boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSahipligi', @Alt = N'BitisNedeniKodu', @Metin = N'Sahipliğin neden bittiği (kod.SahiplikBitisNedeni; örnek musteriKaldirdi, devir, birlestirme). Güncel sahiplikte boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSahipligi', @Alt = N'YapanTuruKodu', @Metin = N'Kaydı kimin yazdığı: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSahipligi', @Alt = N'YapanKullaniciKimlik', @Metin = N'Kaydı yazan personel ya da servis girişi (erisim.Kullanici). Müşteri, sistem ve entegrasyon yazdıysa boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSahipligi', @Alt = N'YapanHesapKimlik', @Metin = N'Kaydı yazan müşteri hesabı (musteri.Hesap). Yalnız müşteri yazdıysa dolu.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSahipligi', @Alt = N'YapanAdi', @Metin = N'Kaydı yazan kişinin o anki adı. Müşteri için boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSahipligi', @Alt = N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama (kod.KaynakUygulama; örnek connect, backoffice, yonetim).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSahipligi', @Alt = N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (örnek 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSahipligi', @Alt = N'KayitNo', @Metin = N'Yalnız veritabanında satır seçmek içindir; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSahipligi', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda ve gorunum görünümlerinde yer almaz.';
GO


/* --------------------------------------------------------------------------
   makine.MakineServisAtamasi — makineye bakacak servisin atanması [K] [A]

   Açık geçmiş tablosu. Makine başına en çok bir açık atama.

   YetkiEtkin (açıkken 1, bitince NULL) + bileşik yabancı anahtar
   servis.MarkaYetkisi (ServisKimlik, MarkaKodu, Etkin): yetkisi bitmiş
   servise atama ve açık ataması olan servisin yetkisini doğrudan
   bitirmek 547 verir (Bölüm 1.17.3).

   Varsayılan-red kısıtı (Bölüm 1.17.1): atamayı yalnız personel,
   entegrasyon ya da sistem yapar; servis kendini atayamaz, ileride
   eklenecek aktör türleri (bayi) de atayamaz.
   -------------------------------------------------------------------------- */

CREATE TABLE makine.MakineServisAtamasi (
    AtamaNotu              nvarchar(500) COLLATE Turkish_100_CI_AS NULL,
    MakineKimlik           uniqueidentifier NOT NULL,
    MarkaKodu              nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    ServisKimlik           uniqueidentifier NOT NULL,
    KaynakKodu             nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    BaslangicZamani        datetime2(3) NOT NULL
        CONSTRAINT DF_makine_MakineServisAtamasi_BaslangicZamani DEFAULT SYSUTCDATETIME(),
    BitisZamani            datetime2(3) NULL,
    YetkiEtkin AS CAST(CASE WHEN BitisZamani IS NULL THEN 1 END AS bit) PERSISTED,
    BitirenKullaniciKimlik uniqueidentifier NULL,
    BitirenAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    YapanTuruKodu          nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik   uniqueidentifier NULL,
    YapanHesapKimlik       uniqueidentifier NULL,
    YapanAdi               nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu     nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu         nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    KayitNo                bigint IDENTITY(1,1) NOT NULL,
    Kimlik                 uniqueidentifier NOT NULL
        CONSTRAINT DF_makine_MakineServisAtamasi_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_makine_MakineServisAtamasi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_makine_MakineServisAtamasi_makine_Makine
        FOREIGN KEY (MakineKimlik, MarkaKodu) REFERENCES makine.Makine (Kimlik, MarkaKodu),
    CONSTRAINT FK_makine_MakineServisAtamasi_servis_Servis
        FOREIGN KEY (ServisKimlik) REFERENCES servis.Servis (Kimlik),
    CONSTRAINT FK_makine_MakineServisAtamasi_servis_MarkaYetkisi
        FOREIGN KEY (ServisKimlik, MarkaKodu, YetkiEtkin) REFERENCES servis.MarkaYetkisi (ServisKimlik, MarkaKodu, Etkin),
    CONSTRAINT FK_makine_MakineServisAtamasi_kod_KayitKaynagi
        FOREIGN KEY (KaynakKodu) REFERENCES kod.KayitKaynagi (Kod),
    CONSTRAINT FK_makine_MakineServisAtamasi_erisim_Kullanici_Bitiren
        FOREIGN KEY (BitirenKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_makine_MakineServisAtamasi_kod_AktorTuru
        FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_makine_MakineServisAtamasi_erisim_Kullanici_Yapan
        FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_makine_MakineServisAtamasi_musteri_Hesap_Yapan
        FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_makine_MakineServisAtamasi_kod_KaynakUygulama
        FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_makine_MakineServisAtamasi_BitisZamani
        CHECK (BitisZamani IS NULL OR BitisZamani >= BaslangicZamani),
    CONSTRAINT CK_makine_MakineServisAtamasi_Bitiren
        CHECK ((BitirenKullaniciKimlik IS NULL AND BitirenAdi IS NULL)
            OR (BitirenKullaniciKimlik IS NOT NULL AND BitirenAdi IS NOT NULL)),
    CONSTRAINT CK_makine_MakineServisAtamasi_BitirenAcikAtama
        CHECK (BitisZamani IS NOT NULL OR BitirenKullaniciKimlik IS NULL),
    CONSTRAINT CK_makine_MakineServisAtamasi_YapanTuru
        CHECK (YapanTuruKodu IN (N'personel', N'entegrasyon', N'sistem')),
    CONSTRAINT CK_makine_MakineServisAtamasi_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);

CREATE UNIQUE CLUSTERED INDEX CX_makine_MakineServisAtamasi_KayitNo ON makine.MakineServisAtamasi (KayitNo);
CREATE UNIQUE NONCLUSTERED INDEX UX_makine_MakineServisAtamasi_AcikAtama ON makine.MakineServisAtamasi (MakineKimlik) WHERE BitisZamani IS NULL;
CREATE NONCLUSTERED INDEX IX_makine_MakineServisAtamasi_MakineKimlikMarkaKodu ON makine.MakineServisAtamasi (MakineKimlik, MarkaKodu, BaslangicZamani);
CREATE NONCLUSTERED INDEX IX_makine_MakineServisAtamasi_ServisKimlikMarkaKoduYetkiEtkin ON makine.MakineServisAtamasi (ServisKimlik, MarkaKodu, YetkiEtkin) INCLUDE (MakineKimlik);
CREATE NONCLUSTERED INDEX IX_makine_MakineServisAtamasi_KaynakKodu ON makine.MakineServisAtamasi (KaynakKodu);
CREATE NONCLUSTERED INDEX IX_makine_MakineServisAtamasi_BitirenKullaniciKimlik ON makine.MakineServisAtamasi (BitirenKullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_makine_MakineServisAtamasi_YapanTuruKodu ON makine.MakineServisAtamasi (YapanTuruKodu);
CREATE NONCLUSTERED INDEX IX_makine_MakineServisAtamasi_YapanKullaniciKimlik ON makine.MakineServisAtamasi (YapanKullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_makine_MakineServisAtamasi_YapanHesapKimlik ON makine.MakineServisAtamasi (YapanHesapKimlik);
CREATE NONCLUSTERED INDEX IX_makine_MakineServisAtamasi_KaynakUygulamaKodu ON makine.MakineServisAtamasi (KaynakUygulamaKodu);

EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Metin = N'Makineye bakacak servisin PAKSAN tarafından atanması ve bunun geçmişi (backoffice Kayıtlı Makineler ekranı). Atama bitince satır silinmez; BitisZamani yazılır. Makine başına en çok bir açık atama olur. Servis kendini atayamaz; yalnız markada yetkisi süren servis atanabilir. Müşterinin servisi için makine.MakineninServisi görünümüne bakın.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Alt = N'AtamaNotu', @Metin = N'Atamayı yapan personelin notu.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Alt = N'MakineKimlik', @Metin = N'Servisi atanan makine (makine.Makine).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Alt = N'MarkaKodu', @Metin = N'Makinenin markası; makine kaydıyla aynı olmak zorundadır (katalog.Marka). Servisin yetkisi bu markada aranır.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Alt = N'ServisKimlik', @Metin = N'Atanan servis (servis.Servis).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Alt = N'KaynakKodu', @Metin = N'Atamanın nereden geldiği (kod.KayitKaynagi; örnek personel, iceAktarim, logo).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Alt = N'BaslangicZamani', @Metin = N'Atamanın başladığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Alt = N'BitisZamani', @Metin = N'Atamanın bittiği an (UTC). Açık atamada boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Alt = N'YetkiEtkin', @Metin = N'Atama açıkken 1, bitince boş. SQL Server BitisZamani''ndan hesaplar; açık atamanın servisin süren marka yetkisine bağlı kalmasını sağlar.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Alt = N'BitirenKullaniciKimlik', @Metin = N'Atamayı bitiren personel (erisim.Kullanici). Açık atamada ya da sistem bitirdiyse boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Alt = N'BitirenAdi', @Metin = N'Atamayı bitiren personelin o anki adı.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Alt = N'YapanTuruKodu', @Metin = N'Atamayı kimin yaptığı: yalnız personel, entegrasyon ya da sistem (kod.AktorTuru). Servis ve müşteri atama yapamaz.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Alt = N'YapanKullaniciKimlik', @Metin = N'Atamayı yapan personel (erisim.Kullanici). Sistem ve entegrasyon yaptıysa boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Alt = N'YapanHesapKimlik', @Metin = N'Yapan grubunun müşteri hesabı kolonu; bu tabloda hep boştur (müşteri atama yapamaz).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Alt = N'YapanAdi', @Metin = N'Atamayı yapan personelin o anki adı.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Alt = N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama (kod.KaynakUygulama; örnek backoffice, yonetim).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Alt = N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (örnek 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Alt = N'KayitNo', @Metin = N'Yalnız veritabanında satır seçmek içindir; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineServisAtamasi', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda ve gorunum görünümlerinde yer almaz.';
GO


/* --------------------------------------------------------------------------
   makine.MakineSatisi — makinenin satış kayıtları [K] [O] [A]

   PAKSAN'dan bayiye, bayiden çiftçiye, doğrudan çiftçiye ya da ikinci el.
   İptal edilen satış silinmez, IptalZamani yazılır.

   Garanti süresi ve esası satış yazılırken katalog.MarkaKurallari'ndan
   kopyalanır ve sonra değişmez (Bölüm 1.9.6). Satan bayinin tek tanımı
   makine.MakineninBayisi görünümündedir; doğrulama durumu yalnız garantiyi
   etkiler.
   -------------------------------------------------------------------------- */

CREATE TABLE makine.MakineSatisi (
    FaturaTarihi              date NULL,
    TeslimTarihi              date NULL,
    GarantiYil                tinyint NULL,
    GarantiFaturaEkGun        smallint NULL,
    MakineKimlik              uniqueidentifier NOT NULL,
    SatisTuruKodu             nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    SaticiBayiKimlik          uniqueidentifier NULL,
    AliciBayiKimlik           uniqueidentifier NULL,
    AliciHesapKimlik          uniqueidentifier NULL,
    GarantiBaslangicEsasiKodu nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    BelgeDosyaKimlik          uniqueidentifier NULL,
    BelgeBagiKimlik           uniqueidentifier NULL,
    KaynakKodu                nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    DogrulamaDurumuKodu       nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    DogrulamaZamani           datetime2(3) NULL,
    DogrulayanKullaniciKimlik uniqueidentifier NULL,
    DogrulayanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    IptalZamani               datetime2(3) NULL,
    YapanTuruKodu             nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik      uniqueidentifier NULL,
    YapanHesapKimlik          uniqueidentifier NULL,
    YapanAdi                  nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu            nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani              datetime2(3) NOT NULL
        CONSTRAINT DF_makine_MakineSatisi_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                   bigint IDENTITY(1,1) NOT NULL,
    Kimlik                    uniqueidentifier NOT NULL
        CONSTRAINT DF_makine_MakineSatisi_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_makine_MakineSatisi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_makine_MakineSatisi_makine_Makine
        FOREIGN KEY (MakineKimlik) REFERENCES makine.Makine (Kimlik),
    CONSTRAINT FK_makine_MakineSatisi_kod_SatisTuru
        FOREIGN KEY (SatisTuruKodu) REFERENCES kod.SatisTuru (Kod),
    CONSTRAINT FK_makine_MakineSatisi_bayi_Bayi_Satici
        FOREIGN KEY (SaticiBayiKimlik) REFERENCES bayi.Bayi (Kimlik),
    CONSTRAINT FK_makine_MakineSatisi_bayi_Bayi_Alici
        FOREIGN KEY (AliciBayiKimlik) REFERENCES bayi.Bayi (Kimlik),
    CONSTRAINT FK_makine_MakineSatisi_musteri_Hesap_Alici
        FOREIGN KEY (AliciHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_makine_MakineSatisi_kod_GarantiBaslangicEsasi
        FOREIGN KEY (GarantiBaslangicEsasiKodu) REFERENCES kod.GarantiBaslangicEsasi (Kod),
    CONSTRAINT FK_makine_MakineSatisi_dosya_Dosya
        FOREIGN KEY (BelgeDosyaKimlik) REFERENCES dosya.Dosya (Kimlik),
    CONSTRAINT FK_makine_MakineSatisi_entegrasyon_BelgeBagi
        FOREIGN KEY (BelgeBagiKimlik) REFERENCES entegrasyon.BelgeBagi (Kimlik),
    CONSTRAINT FK_makine_MakineSatisi_kod_KayitKaynagi
        FOREIGN KEY (KaynakKodu) REFERENCES kod.KayitKaynagi (Kod),
    CONSTRAINT FK_makine_MakineSatisi_kod_KararDurumu
        FOREIGN KEY (DogrulamaDurumuKodu) REFERENCES kod.KararDurumu (Kod),
    CONSTRAINT FK_makine_MakineSatisi_erisim_Kullanici_Dogrulayan
        FOREIGN KEY (DogrulayanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_makine_MakineSatisi_kod_AktorTuru
        FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_makine_MakineSatisi_erisim_Kullanici_Yapan
        FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_makine_MakineSatisi_musteri_Hesap_Yapan
        FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_makine_MakineSatisi_kod_KaynakUygulama
        FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_makine_MakineSatisi_GarantiFaturaEkGun
        CHECK (GarantiFaturaEkGun IS NULL OR GarantiFaturaEkGun >= 0),
    CONSTRAINT CK_makine_MakineSatisi_Bayiler
        CHECK (SaticiBayiKimlik IS NULL OR AliciBayiKimlik IS NULL OR SaticiBayiKimlik <> AliciBayiKimlik),
    CONSTRAINT CK_makine_MakineSatisi_Dogrulayan
        CHECK ((DogrulayanKullaniciKimlik IS NULL AND DogrulayanAdi IS NULL)
            OR (DogrulayanKullaniciKimlik IS NOT NULL AND DogrulayanAdi IS NOT NULL)),
    CONSTRAINT CK_makine_MakineSatisi_DogrulamaZamani
        CHECK (DogrulayanKullaniciKimlik IS NULL OR DogrulamaZamani IS NOT NULL),
    CONSTRAINT CK_makine_MakineSatisi_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);

CREATE UNIQUE CLUSTERED INDEX CX_makine_MakineSatisi_KayitNo ON makine.MakineSatisi (KayitNo);
CREATE NONCLUSTERED INDEX IX_makine_MakineSatisi_MakineKimlikOlusmaZamani
    ON makine.MakineSatisi (MakineKimlik, OlusmaZamani)
    INCLUDE (IptalZamani, DogrulamaDurumuKodu, SatisTuruKodu, SaticiBayiKimlik, AliciBayiKimlik, FaturaTarihi, TeslimTarihi);
CREATE NONCLUSTERED INDEX IX_makine_MakineSatisi_SatisTuruKodu ON makine.MakineSatisi (SatisTuruKodu);
CREATE NONCLUSTERED INDEX IX_makine_MakineSatisi_SaticiBayiKimlik ON makine.MakineSatisi (SaticiBayiKimlik);
CREATE NONCLUSTERED INDEX IX_makine_MakineSatisi_AliciBayiKimlik ON makine.MakineSatisi (AliciBayiKimlik);
CREATE NONCLUSTERED INDEX IX_makine_MakineSatisi_AliciHesapKimlik ON makine.MakineSatisi (AliciHesapKimlik);
CREATE NONCLUSTERED INDEX IX_makine_MakineSatisi_GarantiBaslangicEsasiKodu ON makine.MakineSatisi (GarantiBaslangicEsasiKodu);
CREATE NONCLUSTERED INDEX IX_makine_MakineSatisi_BelgeDosyaKimlik ON makine.MakineSatisi (BelgeDosyaKimlik);
CREATE NONCLUSTERED INDEX IX_makine_MakineSatisi_BelgeBagiKimlik ON makine.MakineSatisi (BelgeBagiKimlik);
CREATE NONCLUSTERED INDEX IX_makine_MakineSatisi_KaynakKodu ON makine.MakineSatisi (KaynakKodu);
CREATE NONCLUSTERED INDEX IX_makine_MakineSatisi_DogrulamaDurumuKodu ON makine.MakineSatisi (DogrulamaDurumuKodu);
CREATE NONCLUSTERED INDEX IX_makine_MakineSatisi_DogrulayanKullaniciKimlik ON makine.MakineSatisi (DogrulayanKullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_makine_MakineSatisi_YapanTuruKodu ON makine.MakineSatisi (YapanTuruKodu);
CREATE NONCLUSTERED INDEX IX_makine_MakineSatisi_YapanKullaniciKimlik ON makine.MakineSatisi (YapanKullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_makine_MakineSatisi_YapanHesapKimlik ON makine.MakineSatisi (YapanHesapKimlik);
CREATE NONCLUSTERED INDEX IX_makine_MakineSatisi_KaynakUygulamaKodu ON makine.MakineSatisi (KaynakUygulamaKodu);

EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Metin = N'Makinenin satış kayıtları: PAKSAN''dan bayiye, bayiden çiftçiye, doğrudan çiftçiye ya da ikinci el. İptal edilen satış silinmez, IptalZamani yazılır. Garanti süresi satış yazılırken kopyalanır ve sonra değişmez. Satan bayi için makine.MakineninBayisi, garanti için makine.MakineGarantisi görünümüne bakın.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'FaturaTarihi', @Metin = N'Satış faturasının tarihi (faturanın üzerindeki gün). Personelin elle girdiği bayide boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'TeslimTarihi', @Metin = N'Makinenin çiftçiye teslim edildiği gün (teslim belgesinden). Bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'GarantiYil', @Metin = N'Satış yazıldığı anda geçerli garanti süresi, yıl. Sonra değişmez; boşsa marka kuralı kullanılır.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'GarantiFaturaEkGun', @Metin = N'Teslim belgesi yoksa garantinin fatura tarihinden kaç gün sonra başladığı; satış yazıldığı andaki değer. Sonra değişmez.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'MakineKimlik', @Metin = N'Satılan makine (makine.Makine).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'SatisTuruKodu', @Metin = N'Satışın türü (kod.SatisTuru; örnek paksanBayiye, bayiCiftciye, dogrudanCiftciye, ikinciEl).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'SaticiBayiKimlik', @Metin = N'Makineyi satan bayi (bayi.Bayi); bayiden çiftçiye satışta dolu.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'AliciBayiKimlik', @Metin = N'Makineyi alan bayi (bayi.Bayi); PAKSAN''dan bayiye satışta dolu.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'AliciHesapKimlik', @Metin = N'Makineyi alan müşteri hesabı (musteri.Hesap). Bilinmiyorsa ya da müşterinin hesabı yoksa boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'GarantiBaslangicEsasiKodu', @Metin = N'Satış yazıldığı anda garantinin neye göre başladığı (kod.GarantiBaslangicEsasi; teslim, fatura, uretim). Sonra değişmez.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'BelgeDosyaKimlik', @Metin = N'Yüklenen satış ya da teslim belgesinin fotoğrafı (dosya.Dosya).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'BelgeBagiKimlik', @Metin = N'Satışın LOGO faturası (entegrasyon.BelgeBagi). Bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'KaynakKodu', @Metin = N'Satış bilgisinin nereden geldiği (kod.KayitKaynagi; örnek personel = backoffice "Satan Bayi" seçimi, logo, iceAktarim).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'DogrulamaDurumuKodu', @Metin = N'Satış ve teslim bilgisinin PAKSAN tarafından doğrulanma durumu (kod.KararDurumu; bekliyor, onaylandi, reddedildi). Yalnız garantiyi etkiler.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'DogrulamaZamani', @Metin = N'Doğrulama kararının verildiği an (UTC). Karar yoksa boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'DogrulayanKullaniciKimlik', @Metin = N'Doğrulama kararını veren personel (erisim.Kullanici).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'DogrulayanAdi', @Metin = N'Doğrulama kararını veren personelin o anki adı.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'IptalZamani', @Metin = N'Satış kaydının iptal edildiği an (UTC); örnek: personel bayiyi değiştirdi ya da kaldırdı. Geçerli satışta boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'YapanTuruKodu', @Metin = N'Kaydı kimin yazdığı: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'YapanKullaniciKimlik', @Metin = N'Kaydı yazan personel ya da servis girişi (erisim.Kullanici). Müşteri, sistem ve entegrasyon yazdıysa boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'YapanHesapKimlik', @Metin = N'Kaydı yazan müşteri hesabı (musteri.Hesap). Yalnız müşteri yazdıysa dolu.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'YapanAdi', @Metin = N'Kaydı yazan kişinin o anki adı. Müşteri için boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama (kod.KaynakUygulama; örnek backoffice, entegrasyon).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (örnek 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'OlusmaZamani', @Metin = N'Satış kaydının veritabanına yazıldığı an (UTC). Satan bayi en son yazılan geçerli satıştan okunur.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'KayitNo', @Metin = N'Yalnız veritabanında satır seçmek içindir; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineSatisi', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda ve gorunum görünümlerinde yer almaz.';
GO


/* --------------------------------------------------------------------------
   makine.KayitOlayi — makinenin kaydedilme olayları [K] [O] [A]

   Connect'te müşterinin kaydı, Servisim elle kaydı, LOGO'dan ya da
   personelden gelen kayıt. Servisim elle kaydı atama sayılmaz; kaydeden
   servis ServisKimlik'te durur (Bölüm 5.7). Hesabı olmayan müşterinin
   beyan ettiği ad BeyanAdi'ndadır (anonimleştirme kapsamında).
   -------------------------------------------------------------------------- */

CREATE TABLE makine.KayitOlayi (
    BeyanAdi              nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    LogoBildi             bit NOT NULL
        CONSTRAINT DF_makine_KayitOlayi_LogoBildi DEFAULT 0,
    YeniSatis             bit NOT NULL
        CONSTRAINT DF_makine_KayitOlayi_YeniSatis DEFAULT 0,
    MakineKimlik          uniqueidentifier NOT NULL,
    KaynakKodu            nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    HesapKimlik           uniqueidentifier NULL,
    ServisKimlik          uniqueidentifier NULL,
    LogoSeriSorgusuKimlik uniqueidentifier NULL,
    KonumIlKodu           tinyint NULL,
    KonumIlceKodu         int NULL,
    YapanTuruKodu         nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik  uniqueidentifier NULL,
    YapanHesapKimlik      uniqueidentifier NULL,
    YapanAdi              nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu    nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu        nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani          datetime2(3) NOT NULL
        CONSTRAINT DF_makine_KayitOlayi_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo               bigint IDENTITY(1,1) NOT NULL,
    Kimlik                uniqueidentifier NOT NULL
        CONSTRAINT DF_makine_KayitOlayi_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_makine_KayitOlayi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_makine_KayitOlayi_makine_Makine
        FOREIGN KEY (MakineKimlik) REFERENCES makine.Makine (Kimlik),
    CONSTRAINT FK_makine_KayitOlayi_kod_KayitKaynagi
        FOREIGN KEY (KaynakKodu) REFERENCES kod.KayitKaynagi (Kod),
    CONSTRAINT FK_makine_KayitOlayi_musteri_Hesap
        FOREIGN KEY (HesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_makine_KayitOlayi_servis_Servis
        FOREIGN KEY (ServisKimlik) REFERENCES servis.Servis (Kimlik),
    CONSTRAINT FK_makine_KayitOlayi_entegrasyon_LogoSeriSorgusu
        FOREIGN KEY (LogoSeriSorgusuKimlik) REFERENCES entegrasyon.LogoSeriSorgusu (Kimlik),
    CONSTRAINT FK_makine_KayitOlayi_cografya_Il
        FOREIGN KEY (KonumIlKodu) REFERENCES cografya.Il (IlKodu),
    CONSTRAINT FK_makine_KayitOlayi_cografya_Ilce
        FOREIGN KEY (KonumIlKodu, KonumIlceKodu) REFERENCES cografya.Ilce (IlKodu, IlceKodu),
    CONSTRAINT FK_makine_KayitOlayi_kod_AktorTuru
        FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_makine_KayitOlayi_erisim_Kullanici_Yapan
        FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_makine_KayitOlayi_musteri_Hesap_Yapan
        FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_makine_KayitOlayi_kod_KaynakUygulama
        FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_makine_KayitOlayi_KonumIlceKodu
        CHECK (KonumIlceKodu IS NULL OR KonumIlKodu IS NOT NULL),
    CONSTRAINT CK_makine_KayitOlayi_YeniSatis
        CHECK (YeniSatis = 0 OR LogoBildi = 1),
    CONSTRAINT CK_makine_KayitOlayi_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);

CREATE UNIQUE CLUSTERED INDEX CX_makine_KayitOlayi_KayitNo ON makine.KayitOlayi (KayitNo);
CREATE NONCLUSTERED INDEX IX_makine_KayitOlayi_MakineKimlikOlusmaZamani ON makine.KayitOlayi (MakineKimlik, OlusmaZamani) INCLUDE (KaynakKodu, ServisKimlik);
CREATE NONCLUSTERED INDEX IX_makine_KayitOlayi_KaynakKodu ON makine.KayitOlayi (KaynakKodu);
CREATE NONCLUSTERED INDEX IX_makine_KayitOlayi_HesapKimlik ON makine.KayitOlayi (HesapKimlik);
CREATE NONCLUSTERED INDEX IX_makine_KayitOlayi_ServisKimlik ON makine.KayitOlayi (ServisKimlik);
CREATE NONCLUSTERED INDEX IX_makine_KayitOlayi_LogoSeriSorgusuKimlik ON makine.KayitOlayi (LogoSeriSorgusuKimlik);
CREATE NONCLUSTERED INDEX IX_makine_KayitOlayi_KonumIlKoduKonumIlceKodu ON makine.KayitOlayi (KonumIlKodu, KonumIlceKodu);
CREATE NONCLUSTERED INDEX IX_makine_KayitOlayi_YapanTuruKodu ON makine.KayitOlayi (YapanTuruKodu);
CREATE NONCLUSTERED INDEX IX_makine_KayitOlayi_YapanKullaniciKimlik ON makine.KayitOlayi (YapanKullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_makine_KayitOlayi_YapanHesapKimlik ON makine.KayitOlayi (YapanHesapKimlik);
CREATE NONCLUSTERED INDEX IX_makine_KayitOlayi_KaynakUygulamaKodu ON makine.KayitOlayi (KaynakUygulamaKodu);

EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Metin = N'Makinenin her kaydedilişi: Connect''te müşterinin eklemesi, Servisim elle kaydı, LOGO ya da personel. Silinmez, yalnız eklenir. Servisim elle kaydı makineyi servise atamaz; kaydeden servis burada durur ve atamayı PAKSAN yapar.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'BeyanAdi', @Metin = N'Kayıt sırasında beyan edilen müşteri adı (Servisim elle kaydında müşterinin adı). Hesabı olmayan müşterinin makinesinde sahip bilgisi buradan gelir. Anonimleştirmede silinir. Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'LogoBildi', @Metin = N'LOGO bu seri numarası için cevap verdiyse 1; LOGO kapalıysa ya da ulaşılamadıysa 0 ("bilinmiyor", "yeni değil" demek değildir).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'YeniSatis', @Metin = N'LOGO''ya göre makine yeni satılmışsa 1 (fatura üstünden LogoYeniSatisGunu ayarındaki günden az geçmiş). Yalnız LogoBildi = 1 iken 1 olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'MakineKimlik', @Metin = N'Kaydedilen makine (makine.Makine).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'KaynakKodu', @Metin = N'Kaydın nereden geldiği (kod.KayitKaynagi; musteri = Connect, servis = Servisim elle kaydı, logo, personel).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'HesapKimlik', @Metin = N'Makineyi kaydeden ya da kayıtta eşleşen müşteri hesabı (musteri.Hesap). Hesap yoksa boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'ServisKimlik', @Metin = N'Makineyi Servisim''den elle kaydeden servis (servis.Servis). Bu bir atama değildir.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'LogoSeriSorgusuKimlik', @Metin = N'Kayıt sırasında yapılan LOGO seri sorgusu (entegrasyon.LogoSeriSorgusu). Sorgu yapılmadıysa boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'KonumIlKodu', @Metin = N'Kayıtta beyan edilen il, plaka koduyla (cografya.Il). Bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'KonumIlceKodu', @Metin = N'Kayıtta beyan edilen ilçe (cografya.Ilce). Yalnız KonumIlKodu doluyken yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'YapanTuruKodu', @Metin = N'Kaydı kimin yazdığı: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'YapanKullaniciKimlik', @Metin = N'Kaydı yazan personel ya da servis girişi (erisim.Kullanici). Müşteri, sistem ve entegrasyon yazdıysa boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'YapanHesapKimlik', @Metin = N'Kaydı yazan müşteri hesabı (musteri.Hesap). Yalnız müşteri yazdıysa dolu.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'YapanAdi', @Metin = N'Kaydı yazan kişinin o anki adı. Müşteri için boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama (kod.KaynakUygulama; örnek connect, servisim).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (örnek 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'OlusmaZamani', @Metin = N'Kayıt olayının veritabanına yazıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'KayitNo', @Metin = N'Yalnız veritabanında satır seçmek içindir; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'KayitOlayi', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda ve gorunum görünümlerinde yer almaz.';
GO


/* --------------------------------------------------------------------------
   makine.BakimTamamlama — müşterinin "bakım yapıldı" işareti [K]

   Connect'teki bakım rehberinde bir adımın yapıldı işaretlenmesi.
   İşaret kaldırılınca satır silinmez, KaldirmaZamani yazılır. Makinede
   aynı bakım adımı için en çok bir etkin işaret.
   -------------------------------------------------------------------------- */

CREATE TABLE makine.BakimTamamlama (
    Saat                 smallint NOT NULL,
    MakineKimlik         uniqueidentifier NOT NULL,
    HesapKimlik          uniqueidentifier NOT NULL,
    BakimSablonuKodu     nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    IsaretlemeZamani     datetime2(3) NOT NULL
        CONSTRAINT DF_makine_BakimTamamlama_IsaretlemeZamani DEFAULT SYSUTCDATETIME(),
    KaldirmaZamani       datetime2(3) NULL,
    KayitNo              bigint IDENTITY(1,1) NOT NULL,
    Kimlik               uniqueidentifier NOT NULL
        CONSTRAINT DF_makine_BakimTamamlama_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_makine_BakimTamamlama PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_makine_BakimTamamlama_makine_Makine
        FOREIGN KEY (MakineKimlik) REFERENCES makine.Makine (Kimlik),
    CONSTRAINT FK_makine_BakimTamamlama_musteri_Hesap
        FOREIGN KEY (HesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_makine_BakimTamamlama_katalog_BakimAdimi
        FOREIGN KEY (BakimSablonuKodu, Saat) REFERENCES katalog.BakimAdimi (SablonKodu, Saat),
    CONSTRAINT CK_makine_BakimTamamlama_KaldirmaZamani
        CHECK (KaldirmaZamani IS NULL OR KaldirmaZamani >= IsaretlemeZamani)
);

CREATE UNIQUE CLUSTERED INDEX CX_makine_BakimTamamlama_KayitNo ON makine.BakimTamamlama (KayitNo);
CREATE UNIQUE NONCLUSTERED INDEX UX_makine_BakimTamamlama_EtkinIsaret ON makine.BakimTamamlama (MakineKimlik, BakimSablonuKodu, Saat) WHERE KaldirmaZamani IS NULL;
CREATE NONCLUSTERED INDEX IX_makine_BakimTamamlama_MakineKimlikIsaretlemeZamani ON makine.BakimTamamlama (MakineKimlik, IsaretlemeZamani);
CREATE NONCLUSTERED INDEX IX_makine_BakimTamamlama_HesapKimlik ON makine.BakimTamamlama (HesapKimlik);
CREATE NONCLUSTERED INDEX IX_makine_BakimTamamlama_BakimSablonuKoduSaat ON makine.BakimTamamlama (BakimSablonuKodu, Saat);

EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'BakimTamamlama', @Metin = N'Müşterinin Connect''teki bakım rehberinde bir adımı "yapıldı" işaretlemesi. İşaret kaldırılınca satır silinmez, KaldirmaZamani yazılır. Bir makinede aynı bakım adımı için en çok bir etkin işaret olur.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'BakimTamamlama', @Alt = N'Saat', @Metin = N'Bakım adımının çalışma saati (örnek 50 saatlik bakım); katalog.BakimAdimi ile birlikte adımı belirler.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'BakimTamamlama', @Alt = N'MakineKimlik', @Metin = N'Bakımı işaretlenen makine (makine.Makine).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'BakimTamamlama', @Alt = N'HesapKimlik', @Metin = N'İşaretleyen müşteri hesabı (musteri.Hesap).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'BakimTamamlama', @Alt = N'BakimSablonuKodu', @Metin = N'Bakım rehberinin şablonu (katalog.BakimSablonu; örnek balya, yem, silaj, toprak).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'BakimTamamlama', @Alt = N'IsaretlemeZamani', @Metin = N'Adımın yapıldı işaretlendiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'BakimTamamlama', @Alt = N'KaldirmaZamani', @Metin = N'İşaretin kaldırıldığı an (UTC). İşaret sürüyorsa boş.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'BakimTamamlama', @Alt = N'KayitNo', @Metin = N'Yalnız veritabanında satır seçmek içindir; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'BakimTamamlama', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda ve gorunum görünümlerinde yer almaz.';
GO
