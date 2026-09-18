/* ==========================================================================
   V0013 — duyuru ve bildirim şemaları

   Backoffice'ten yayınlanan duyuru ve hedefleri; kişisel bildirim, alıcı
   başına teslimat, cihaz. Sonda kvkk.RizaOlayi.CihazKimlik bağı kurulur
   (tasarim.md Bölüm 6.3: bildirim.Cihaz bu betikte oluşuyor).
   bildirim.Teslimat.GidenKimlik bağı V0014'te (sistem.Giden orada).

   Kural kaynağı: veritabani/tasarim.md Bölüm 0.4 (duyuru / bildirim),
   1.12.1, 1.17.1 (alıcı CHECK'i ve geriCagirma şartı), 1.17.5, 6.2, 6.3.
   ========================================================================== */

/* -------------------------------------------------------- duyuru.Duyuru */

CREATE TABLE duyuru.Duyuru (
    Baslik                      nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Metin                       nvarchar(4000) COLLATE Turkish_100_CI_AS NOT NULL,
    PencereGoster               bit NOT NULL
        CONSTRAINT DF_duyuru_Duyuru_PencereGoster DEFAULT 0,
    TurKodu                     nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_duyuru_Duyuru_kod_DuyuruTuru REFERENCES kod.DuyuruTuru (Kod),
    AltTurKodu                  nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    HedefKitleKodu              nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_duyuru_Duyuru_kod_HedefKitle REFERENCES kod.HedefKitle (Kod),
    DilKodu                     nvarchar(5) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_duyuru_Duyuru_kod_Dil REFERENCES kod.Dil (Kod),
    GorselDosyaKimlik           uniqueidentifier NULL
        CONSTRAINT FK_duyuru_Duyuru_dosya_Dosya_Gorsel REFERENCES dosya.Dosya (Kimlik),
    YayinZamani                 datetime2(3) NOT NULL,
    BitisZamani                 datetime2(3) NULL,
    YayindanKaldirmaZamani      datetime2(3) NULL,
    KaldiranKullaniciKimlik     uniqueidentifier NULL
        CONSTRAINT FK_duyuru_Duyuru_erisim_Kullanici_Kaldiran REFERENCES erisim.Kullanici (Kimlik),
    KaldiranAdi                 nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    YapanTuruKodu               nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_duyuru_Duyuru_kod_AktorTuru_Yapan REFERENCES kod.AktorTuru (Kod),
    YapanKullaniciKimlik        uniqueidentifier NULL
        CONSTRAINT FK_duyuru_Duyuru_erisim_Kullanici_Yapan REFERENCES erisim.Kullanici (Kimlik),
    YapanHesapKimlik            uniqueidentifier NULL
        CONSTRAINT FK_duyuru_Duyuru_musteri_Hesap_Yapan REFERENCES musteri.Hesap (Kimlik),
    YapanAdi                    nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu          nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_duyuru_Duyuru_kod_KaynakUygulama REFERENCES kod.KaynakUygulama (Kod),
    UygulamaSurumu              nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani                datetime2(3) NOT NULL
        CONSTRAINT DF_duyuru_Duyuru_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                     bigint IDENTITY(1,1) NOT NULL,
    Kimlik                      uniqueidentifier NOT NULL
        CONSTRAINT DF_duyuru_Duyuru_Kimlik DEFAULT NEWID(),
    SatirSurumu                 rowversion NOT NULL,
    CONSTRAINT PK_duyuru_Duyuru PRIMARY KEY NONCLUSTERED (Kimlik),
    /* Alt tür üst türle uyumlu olmalı: kod.DuyuruAltTuru UNIQUE (Kod, UstTurKodu). */
    CONSTRAINT FK_duyuru_Duyuru_kod_DuyuruAltTuru
        FOREIGN KEY (AltTurKodu, TurKodu)
        REFERENCES kod.DuyuruAltTuru (Kod, UstTurKodu),
    /* Geri çağırma yalnız servise gider (data/duyuruTurleri.js kilitliKime). */
    CONSTRAINT CK_duyuru_Duyuru_GeriCagirma
        CHECK (AltTurKodu <> N'geriCagirma' OR HedefKitleKodu = N'servis'),
    CONSTRAINT CK_duyuru_Duyuru_BitisZamani
        CHECK (BitisZamani IS NULL OR BitisZamani > YayinZamani),
    CONSTRAINT CK_duyuru_Duyuru_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_duyuru_Duyuru_KayitNo ON duyuru.Duyuru (KayitNo);

/* Yayındaki duyurular (üç ürünün liste ve pencere sorgusu). */
CREATE NONCLUSTERED INDEX IX_duyuru_Duyuru_TurKoduAltTurKoduYayinZamani
    ON duyuru.Duyuru (TurKodu, AltTurKodu, YayinZamani)
    INCLUDE (BitisZamani, YayindanKaldirmaZamani);
CREATE NONCLUSTERED INDEX IX_duyuru_Duyuru_BitisZamani
    ON duyuru.Duyuru (BitisZamani)
    WHERE BitisZamani IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_duyuru_Duyuru_AltTurKoduTurKodu ON duyuru.Duyuru (AltTurKodu, TurKodu);
CREATE NONCLUSTERED INDEX IX_duyuru_Duyuru_HedefKitleKodu ON duyuru.Duyuru (HedefKitleKodu);
CREATE NONCLUSTERED INDEX IX_duyuru_Duyuru_DilKodu ON duyuru.Duyuru (DilKodu);
CREATE NONCLUSTERED INDEX IX_duyuru_Duyuru_GorselDosyaKimlik ON duyuru.Duyuru (GorselDosyaKimlik);
CREATE NONCLUSTERED INDEX IX_duyuru_Duyuru_KaldiranKullaniciKimlik ON duyuru.Duyuru (KaldiranKullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_duyuru_Duyuru_YapanTuruKodu ON duyuru.Duyuru (YapanTuruKodu);
CREATE NONCLUSTERED INDEX IX_duyuru_Duyuru_YapanKullaniciKimlik ON duyuru.Duyuru (YapanKullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_duyuru_Duyuru_YapanHesapKimlik ON duyuru.Duyuru (YapanHesapKimlik);
CREATE NONCLUSTERED INDEX IX_duyuru_Duyuru_KaynakUygulamaKodu ON duyuru.Duyuru (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Metin = N'Backoffice''te Duyurular ekranından yayınlanan duyuru ve önemli uyarılar. Müşteri uygulamasında ve servis uygulamasında bildirim listesinde, istenirse açılış penceresinde görünür. Kime gideceği HedefKitleKodu ile hedef tablolarından (HedefMarka, HedefIl, HedefIlce, HedefServis, HedefUrun, HedefSeri) okunur; hedef tablosunda satır yoksa o süzgeç uygulanmaz. Alıcı başına gönderim, görülme ve okunma bilgisi bildirim.Teslimat tablosundadır. Duyuru silinmez; yayından kaldırılır.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'Baslik', @Metin = N'Duyurunun başlığı (DilKodu kolonundaki dilde).';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'Metin', @Metin = N'Duyurunun metni (DilKodu kolonundaki dilde).';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'PencereGoster', @Metin = N'1 ise duyuru uygulama açılınca pencere olarak da gösterilir; 0 ise yalnız bildirim listesinde görünür.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'TurKodu', @Metin = N'Duyurunun üst türü (kod.DuyuruTuru). duyuru: ticari ileti, müşteride yalnız izin verenlere gider. uyari: hizmete ilişkin bildirim, izin aranmaz.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'AltTurKodu', @Metin = N'Duyurunun alt türü (kod.DuyuruAltTuru: kampanya, yeniUrun, etkinlik, guvenlik, geriCagirma). Ekrandaki renk ve ikonu belirler; üst türle uyumlu olmak zorundadır.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'HedefKitleKodu', @Metin = N'Duyurunun kime gideceği (kod.HedefKitle: musteri, servis, ikisi). Geri çağırma alt türü yalnız servise gider.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'DilKodu', @Metin = N'Duyurunun yazıldığı dil (kod.Dil). Yurt dışındaki müşteriye Türkçe duyuru gösterilmez.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'GorselDosyaKimlik', @Metin = N'Duyurunun görseli (dosya.Dosya). Görselsiz duyuruda boş.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'YayinZamani', @Metin = N'Duyurunun yayına girdiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'BitisZamani', @Metin = N'Duyurunun yayından kendiliğinden kalktığı an (UTC). Boşsa süresizdir.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'YayindanKaldirmaZamani', @Metin = N'Duyurunun personel tarafından yayından kaldırıldığı an (UTC). Boşsa kaldırılmamıştır.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'KaldiranKullaniciKimlik', @Metin = N'Duyuruyu yayından kaldıran personel (erisim.Kullanici).';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'KaldiranAdi', @Metin = N'Duyuruyu yayından kaldıran personelin o anki adı.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'YapanTuruKodu', @Metin = N'Duyuruyu yayınlayanın türü (kod.AktorTuru: musteri, personel, servis, sistem, entegrasyon).';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'YapanKullaniciKimlik', @Metin = N'Duyuruyu yayınlayan personel (erisim.Kullanici). Müşteri, sistem ve entegrasyon için boş.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'YapanHesapKimlik', @Metin = N'Kaydı yazan müşteri hesabı (musteri.Hesap). Yalnız müşteri için dolu; duyuruda kullanılmaz.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'YapanAdi', @Metin = N'Duyuruyu yayınlayanın o anki adı.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama (kod.KaynakUygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim).';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'UygulamaSurumu', @Metin = N'Kaydın geldiği uygulamanın sürümü (ör. 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'OlusmaZamani', @Metin = N'Duyurunun kaydedildiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yoktur, ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'Duyuru', @Alt = N'SatirSurumu', @Metin = N'Aynı duyurunun iki kişi tarafından aynı anda değiştirilmesini yakalamak için satır sürümü; her güncellemede kendiliğinden değişir.';
GO

/* ---------------------------------------------------- duyuru.HedefMarka */

CREATE TABLE duyuru.HedefMarka (
    DuyuruKimlik    uniqueidentifier NOT NULL
        CONSTRAINT FK_duyuru_HedefMarka_duyuru_Duyuru REFERENCES duyuru.Duyuru (Kimlik),
    MarkaKodu       nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_duyuru_HedefMarka_katalog_Marka REFERENCES katalog.Marka (Kod),
    CONSTRAINT PK_duyuru_HedefMarka PRIMARY KEY CLUSTERED (DuyuruKimlik, MarkaKodu)
);
GO

CREATE NONCLUSTERED INDEX IX_duyuru_HedefMarka_MarkaKodu ON duyuru.HedefMarka (MarkaKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefMarka', @Metin = N'Duyurunun gideceği markalar: alıcının bu markalardan en az bir makinesi olmalı. Duyuru için satır yoksa marka süzgeci uygulanmaz. Yayından önce silinebilir.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefMarka', @Alt = N'DuyuruKimlik', @Metin = N'Hedefin ait olduğu duyuru (duyuru.Duyuru).';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefMarka', @Alt = N'MarkaKodu', @Metin = N'Hedeflenen marka (katalog.Marka).';
GO

/* ------------------------------------------------------- duyuru.HedefIl */

CREATE TABLE duyuru.HedefIl (
    DuyuruKimlik    uniqueidentifier NOT NULL
        CONSTRAINT FK_duyuru_HedefIl_duyuru_Duyuru REFERENCES duyuru.Duyuru (Kimlik),
    IlKodu          tinyint NOT NULL
        CONSTRAINT FK_duyuru_HedefIl_cografya_Il REFERENCES cografya.Il (IlKodu),
    CONSTRAINT PK_duyuru_HedefIl PRIMARY KEY CLUSTERED (DuyuruKimlik, IlKodu)
);
GO

CREATE NONCLUSTERED INDEX IX_duyuru_HedefIl_IlKodu ON duyuru.HedefIl (IlKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefIl', @Metin = N'Duyurunun gideceği iller (müşteride hesabın ili, serviste servisin ili). Duyuru için satır yoksa bütün iller. Yayından önce silinebilir.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefIl', @Alt = N'DuyuruKimlik', @Metin = N'Hedefin ait olduğu duyuru (duyuru.Duyuru).';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefIl', @Alt = N'IlKodu', @Metin = N'Hedeflenen il; plaka kodu (cografya.Il).';
GO

/* ----------------------------------------------------- duyuru.HedefIlce */

CREATE TABLE duyuru.HedefIlce (
    DuyuruKimlik    uniqueidentifier NOT NULL
        CONSTRAINT FK_duyuru_HedefIlce_duyuru_Duyuru REFERENCES duyuru.Duyuru (Kimlik),
    IlKodu          tinyint NOT NULL,
    IlceKodu        int NOT NULL,
    CONSTRAINT PK_duyuru_HedefIlce PRIMARY KEY CLUSTERED (DuyuruKimlik, IlKodu, IlceKodu),
    CONSTRAINT FK_duyuru_HedefIlce_cografya_Ilce
        FOREIGN KEY (IlKodu, IlceKodu)
        REFERENCES cografya.Ilce (IlKodu, IlceKodu)
);
GO

CREATE NONCLUSTERED INDEX IX_duyuru_HedefIlce_IlKoduIlceKodu ON duyuru.HedefIlce (IlKodu, IlceKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefIlce', @Metin = N'Duyurunun gideceği ilçeler (müşteride hesabın ilçesi). Duyuru için satır yoksa seçilen illerin tamamı. Yayından önce silinebilir.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefIlce', @Alt = N'DuyuruKimlik', @Metin = N'Hedefin ait olduğu duyuru (duyuru.Duyuru).';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefIlce', @Alt = N'IlKodu', @Metin = N'İlçenin ili; plaka kodu (cografya.Il).';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefIlce', @Alt = N'IlceKodu', @Metin = N'Hedeflenen ilçe (cografya.Ilce); ilçe o ile ait olmak zorundadır.';
GO

/* --------------------------------------------------- duyuru.HedefServis */

CREATE TABLE duyuru.HedefServis (
    DuyuruKimlik    uniqueidentifier NOT NULL
        CONSTRAINT FK_duyuru_HedefServis_duyuru_Duyuru REFERENCES duyuru.Duyuru (Kimlik),
    ServisKimlik    uniqueidentifier NOT NULL
        CONSTRAINT FK_duyuru_HedefServis_servis_Servis REFERENCES servis.Servis (Kimlik),
    CONSTRAINT PK_duyuru_HedefServis PRIMARY KEY CLUSTERED (DuyuruKimlik, ServisKimlik)
);
GO

CREATE NONCLUSTERED INDEX IX_duyuru_HedefServis_ServisKimlik ON duyuru.HedefServis (ServisKimlik);
GO

EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefServis', @Metin = N'Servise giden duyurunun gideceği servisler. Duyuru için satır yoksa bütün servisler. Yayından önce silinebilir.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefServis', @Alt = N'DuyuruKimlik', @Metin = N'Hedefin ait olduğu duyuru (duyuru.Duyuru).';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefServis', @Alt = N'ServisKimlik', @Metin = N'Hedeflenen servis (servis.Servis).';
GO

/* ----------------------------------------------------- duyuru.HedefUrun */

CREATE TABLE duyuru.HedefUrun (
    DuyuruKimlik    uniqueidentifier NOT NULL
        CONSTRAINT FK_duyuru_HedefUrun_duyuru_Duyuru REFERENCES duyuru.Duyuru (Kimlik),
    MarkaKodu       nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UrunKodu        nvarchar(60) COLLATE Latin1_General_100_BIN2 NOT NULL,
    CONSTRAINT PK_duyuru_HedefUrun PRIMARY KEY CLUSTERED (DuyuruKimlik, MarkaKodu, UrunKodu),
    CONSTRAINT FK_duyuru_HedefUrun_katalog_Urun
        FOREIGN KEY (MarkaKodu, UrunKodu)
        REFERENCES katalog.Urun (MarkaKodu, Kod)
);
GO

CREATE NONCLUSTERED INDEX IX_duyuru_HedefUrun_MarkaKoduUrunKodu ON duyuru.HedefUrun (MarkaKodu, UrunKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefUrun', @Metin = N'Duyurunun gideceği ürünler (model): alıcının bu ürünlerden en az bir makinesi olmalı. Ekranda makine tipi seçilirse yayınlarken o tipin ürünlerine genişletilir. Duyuru için satır yoksa ürün süzgeci uygulanmaz. Yayından önce silinebilir.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefUrun', @Alt = N'DuyuruKimlik', @Metin = N'Hedefin ait olduğu duyuru (duyuru.Duyuru).';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefUrun', @Alt = N'MarkaKodu', @Metin = N'Hedeflenen ürünün markası (katalog.Marka).';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefUrun', @Alt = N'UrunKodu', @Metin = N'Hedeflenen ürün (katalog.Urun).';
GO

/* ----------------------------------------------------- duyuru.HedefSeri */

CREATE TABLE duyuru.HedefSeri (
    DuyuruKimlik    uniqueidentifier NOT NULL
        CONSTRAINT FK_duyuru_HedefSeri_duyuru_Duyuru REFERENCES duyuru.Duyuru (Kimlik),
    MarkaKodu       nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_duyuru_HedefSeri_katalog_Marka REFERENCES katalog.Marka (Kod),
    SeriNo          nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    CONSTRAINT PK_duyuru_HedefSeri PRIMARY KEY CLUSTERED (DuyuruKimlik, MarkaKodu, SeriNo),
    /* Makinedeki gibi sadeleştirilmiş yazım: yalnız büyük harf ve rakam. */
    CONSTRAINT CK_duyuru_HedefSeri_SeriNo
        CHECK (LEN(SeriNo) >= 3 AND SeriNo NOT LIKE N'%[^A-Z0-9]%')
);
GO

CREATE NONCLUSTERED INDEX IX_duyuru_HedefSeri_MarkaKoduSeriNo ON duyuru.HedefSeri (MarkaKodu, SeriNo);
GO

EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefSeri', @Metin = N'Duyurunun gideceği seri numaraları (ör. geri çağırma): alıcının bu serilerden en az bir makinesi olmalı. Makine tablosuna bağlı değildir; henüz kayıtlı olmayan seri de yazılabilir. Duyuru için satır yoksa seri süzgeci uygulanmaz. Yayından önce silinebilir.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefSeri', @Alt = N'DuyuruKimlik', @Metin = N'Hedefin ait olduğu duyuru (duyuru.Duyuru).';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefSeri', @Alt = N'MarkaKodu', @Metin = N'Seri numarasının markası (katalog.Marka).';
EXEC dbo.AciklamaYaz @Sema = N'duyuru', @Nesne = N'HedefSeri', @Alt = N'SeriNo', @Metin = N'Hedeflenen seri numarası; tiresiz, büyük harfle saklanır (ORK1270202400157). Aranan yazımı sadeleştirmek için yardim.Sadelestir(...).Kod kullanılır.';
GO

/* -------------------------------------------------------- bildirim.Cihaz */

CREATE TABLE bildirim.Cihaz (
    PushJetonu              nvarchar(2000) COLLATE Latin1_General_100_BIN2 NULL,
    PushJetonuOzeti         binary(32) NULL,
    UygulamaSurumu          nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    IsletimSistemiSurumu    nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    PlatformKodu            nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaKodu            nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_bildirim_Cihaz_kod_KaynakUygulama REFERENCES kod.KaynakUygulama (Kod),
    PushSaglayiciKodu       nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL
        CONSTRAINT FK_bildirim_Cihaz_kod_DisSistem_PushSaglayici REFERENCES kod.DisSistem (Kod),
    BildirimIzniKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_bildirim_Cihaz_kod_BildirimIzni REFERENCES kod.BildirimIzni (Kod),
    DilKodu                 nvarchar(5) COLLATE Latin1_General_100_BIN2 NULL
        CONSTRAINT FK_bildirim_Cihaz_kod_Dil REFERENCES kod.Dil (Kod),
    HesapKimlik             uniqueidentifier NULL
        CONSTRAINT FK_bildirim_Cihaz_musteri_Hesap REFERENCES musteri.Hesap (Kimlik),
    KullaniciKimlik         uniqueidentifier NULL
        CONSTRAINT FK_bildirim_Cihaz_erisim_Kullanici REFERENCES erisim.Kullanici (Kimlik),
    IzinZamani              datetime2(3) NULL,
    SonGorulmeZamani        datetime2(3) NULL,
    PasifZamani             datetime2(3) NULL,
    OlusmaZamani            datetime2(3) NOT NULL
        CONSTRAINT DF_bildirim_Cihaz_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                 bigint IDENTITY(1,1) NOT NULL,
    Kimlik                  uniqueidentifier NOT NULL
        CONSTRAINT DF_bildirim_Cihaz_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_bildirim_Cihaz PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT CK_bildirim_Cihaz_PlatformKodu CHECK (PlatformKodu IN (N'android', N'ios', N'web')),
    /* Cihaz ya müşteri hesabına ya kullanıcıya bağlıdır; oturum açılmamışsa ikisi de boş. */
    CONSTRAINT CK_bildirim_Cihaz_Sahip CHECK (HesapKimlik IS NULL OR KullaniciKimlik IS NULL)
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_bildirim_Cihaz_KayitNo ON bildirim.Cihaz (KayitNo);

CREATE UNIQUE NONCLUSTERED INDEX UX_bildirim_Cihaz_PushJetonuOzeti
    ON bildirim.Cihaz (PushJetonuOzeti)
    WHERE PushJetonuOzeti IS NOT NULL;

CREATE NONCLUSTERED INDEX IX_bildirim_Cihaz_HesapKimlik ON bildirim.Cihaz (HesapKimlik);
CREATE NONCLUSTERED INDEX IX_bildirim_Cihaz_KullaniciKimlik ON bildirim.Cihaz (KullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_bildirim_Cihaz_UygulamaKodu ON bildirim.Cihaz (UygulamaKodu);
CREATE NONCLUSTERED INDEX IX_bildirim_Cihaz_PushSaglayiciKodu ON bildirim.Cihaz (PushSaglayiciKodu);
CREATE NONCLUSTERED INDEX IX_bildirim_Cihaz_BildirimIzniKodu ON bildirim.Cihaz (BildirimIzniKodu);
CREATE NONCLUSTERED INDEX IX_bildirim_Cihaz_DilKodu ON bildirim.Cihaz (DilKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Cihaz', @Metin = N'Uygulamanın kurulu olduğu telefon ya da tarayıcı: bildirim izni, bildirim gönderme jetonu, dil ve sürüm. Müşteri uygulamasında hesaba, servis uygulamasında ve backoffice''te kullanıcıya bağlanır; oturum açılmamış cihazda ikisi de boş olabilir. Kimlik uygulamanın kurulumda ürettiği kimliktir. Satır silinmez; kullanılmayan cihaza PasifZamani yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Cihaz', @Alt = N'PushJetonu', @Metin = N'Bildirim sağlayıcısının cihaza verdiği gönderme jetonu. Hesap anonimleştirilince boşaltılır.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Cihaz', @Alt = N'PushJetonuOzeti', @Metin = N'Gönderme jetonunun SHA-256 özeti; aynı jetonun iki cihaz satırına yazılmasını önler. Hesap anonimleştirilince boşaltılır.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Cihaz', @Alt = N'UygulamaSurumu', @Metin = N'Cihazdaki uygulamanın sürümü (ör. 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Cihaz', @Alt = N'IsletimSistemiSurumu', @Metin = N'Cihazın işletim sistemi sürümü (ör. Android 14).';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Cihaz', @Alt = N'PlatformKodu', @Metin = N'Cihazın platformu: android, ios ya da web.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Cihaz', @Alt = N'UygulamaKodu', @Metin = N'Cihazdaki uygulama (kod.KaynakUygulama: connect, servisim, backoffice).';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Cihaz', @Alt = N'PushSaglayiciKodu', @Metin = N'Bildirimi cihaza ulaştıran sağlayıcı (kod.DisSistem: fcm, webPush). Jeton yoksa boş.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Cihaz', @Alt = N'BildirimIzniKodu', @Metin = N'Cihazdaki bildirim izninin durumu (kod.BildirimIzni).';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Cihaz', @Alt = N'DilKodu', @Metin = N'Cihazda seçili uygulama dili (kod.Dil).';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Cihaz', @Alt = N'HesapKimlik', @Metin = N'Cihazda oturum açmış müşteri hesabı (musteri.Hesap). Kullanıcıya bağlı cihazda boş.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Cihaz', @Alt = N'KullaniciKimlik', @Metin = N'Cihazda oturum açmış personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri cihazında boş.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Cihaz', @Alt = N'IzinZamani', @Metin = N'Bildirim izninin son değiştiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Cihaz', @Alt = N'SonGorulmeZamani', @Metin = N'Cihazdan son istek gelen an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Cihaz', @Alt = N'PasifZamani', @Metin = N'Cihazın kullanım dışı sayıldığı an (UTC): uygulama silindi, jeton geçersiz ya da hesap anonimleştirildi. Pasif cihaza bildirim gönderilmez.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Cihaz', @Alt = N'OlusmaZamani', @Metin = N'Cihazın ilk kaydedildiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Cihaz', @Alt = N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yoktur, ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Cihaz', @Alt = N'Kimlik', @Metin = N'Cihazın teknik anahtarı; uygulama kurulumda üretir. Ekranda görünmez.';
GO

/* ----------------------------------------------------- bildirim.Bildirim */

CREATE TABLE bildirim.Bildirim (
    BaslikAnahtari                  nvarchar(100) COLLATE Latin1_General_100_BIN2 NOT NULL,
    MetinAnahtari                   nvarchar(100) COLLATE Latin1_General_100_BIN2 NULL,
    DegerlerJson                    nvarchar(max) COLLATE Latin1_General_100_BIN2 NULL,
    SerbestMetin                    nvarchar(2000) COLLATE Turkish_100_CI_AS NULL,
    AliciTuruKodu                   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_bildirim_Bildirim_kod_AliciTuru REFERENCES kod.AliciTuru (Kod),
    TurKodu                         nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_bildirim_Bildirim_kod_BildirimTuru REFERENCES kod.BildirimTuru (Kod),
    HesapKimlik                     uniqueidentifier NULL
        CONSTRAINT FK_bildirim_Bildirim_musteri_Hesap REFERENCES musteri.Hesap (Kimlik),
    ServisKimlik                    uniqueidentifier NULL
        CONSTRAINT FK_bildirim_Bildirim_servis_Servis REFERENCES servis.Servis (Kimlik),
    KullaniciKimlik                 uniqueidentifier NULL
        CONSTRAINT FK_bildirim_Bildirim_erisim_Kullanici REFERENCES erisim.Kullanici (Kimlik),
    TalepKimlik                     uniqueidentifier NULL
        CONSTRAINT FK_bildirim_Bildirim_talep_Talep REFERENCES talep.Talep (Kimlik),
    GeriBildirimKimlik              uniqueidentifier NULL
        CONSTRAINT FK_bildirim_Bildirim_musteri_GeriBildirim REFERENCES musteri.GeriBildirim (Kimlik),
    TelefonDegisikligiTalebiKimlik  uniqueidentifier NULL
        CONSTRAINT FK_bildirim_Bildirim_musteri_TelefonDegisikligiTalebi REFERENCES musteri.TelefonDegisikligiTalebi (Kimlik),
    YapanTuruKodu                   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_bildirim_Bildirim_kod_AktorTuru_Yapan REFERENCES kod.AktorTuru (Kod),
    YapanKullaniciKimlik            uniqueidentifier NULL
        CONSTRAINT FK_bildirim_Bildirim_erisim_Kullanici_Yapan REFERENCES erisim.Kullanici (Kimlik),
    YapanHesapKimlik                uniqueidentifier NULL
        CONSTRAINT FK_bildirim_Bildirim_musteri_Hesap_Yapan REFERENCES musteri.Hesap (Kimlik),
    YapanAdi                        nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu              nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_bildirim_Bildirim_kod_KaynakUygulama REFERENCES kod.KaynakUygulama (Kod),
    UygulamaSurumu                  nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani                    datetime2(3) NOT NULL
        CONSTRAINT DF_bildirim_Bildirim_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                         bigint IDENTITY(1,1) NOT NULL,
    Kimlik                          uniqueidentifier NOT NULL
        CONSTRAINT DF_bildirim_Bildirim_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_bildirim_Bildirim PRIMARY KEY NONCLUSTERED (Kimlik),
    /* Alıcı: varsayılan kollu CHECK (Bölüm 1.17.1); yeni alıcı türü üçüncü kola düşer. */
    CONSTRAINT CK_bildirim_Bildirim_Alici CHECK (
         (AliciTuruKodu = N'musteri' AND HesapKimlik IS NOT NULL AND ServisKimlik IS NULL AND KullaniciKimlik IS NULL)
      OR (AliciTuruKodu = N'servis'  AND ServisKimlik IS NOT NULL AND HesapKimlik IS NULL AND KullaniciKimlik IS NULL)
      OR (AliciTuruKodu NOT IN (N'musteri', N'servis')
            AND KullaniciKimlik IS NOT NULL AND HesapKimlik IS NULL AND ServisKimlik IS NULL)
    ),
    CONSTRAINT CK_bildirim_Bildirim_Metin CHECK (MetinAnahtari IS NOT NULL OR SerbestMetin IS NOT NULL),
    CONSTRAINT CK_bildirim_Bildirim_DegerlerJson CHECK (DegerlerJson IS NULL OR ISJSON(DegerlerJson) = 1),
    CONSTRAINT CK_bildirim_Bildirim_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_bildirim_Bildirim_KayitNo ON bildirim.Bildirim (KayitNo);

/* Alıcının bildirim listesi (en yeniler önce). */
CREATE NONCLUSTERED INDEX IX_bildirim_Bildirim_HesapKimlikOlusmaZamani
    ON bildirim.Bildirim (HesapKimlik, OlusmaZamani DESC);
CREATE NONCLUSTERED INDEX IX_bildirim_Bildirim_ServisKimlikOlusmaZamani
    ON bildirim.Bildirim (ServisKimlik, OlusmaZamani DESC);
CREATE NONCLUSTERED INDEX IX_bildirim_Bildirim_KullaniciKimlikOlusmaZamani
    ON bildirim.Bildirim (KullaniciKimlik, OlusmaZamani DESC);
CREATE NONCLUSTERED INDEX IX_bildirim_Bildirim_AliciTuruKodu ON bildirim.Bildirim (AliciTuruKodu);
CREATE NONCLUSTERED INDEX IX_bildirim_Bildirim_TurKodu ON bildirim.Bildirim (TurKodu);
CREATE NONCLUSTERED INDEX IX_bildirim_Bildirim_TalepKimlik ON bildirim.Bildirim (TalepKimlik);
CREATE NONCLUSTERED INDEX IX_bildirim_Bildirim_GeriBildirimKimlik ON bildirim.Bildirim (GeriBildirimKimlik);
CREATE NONCLUSTERED INDEX IX_bildirim_Bildirim_TelefonDegisikligiTalebiKimlik ON bildirim.Bildirim (TelefonDegisikligiTalebiKimlik);
CREATE NONCLUSTERED INDEX IX_bildirim_Bildirim_YapanTuruKodu ON bildirim.Bildirim (YapanTuruKodu);
CREATE NONCLUSTERED INDEX IX_bildirim_Bildirim_YapanKullaniciKimlik ON bildirim.Bildirim (YapanKullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_bildirim_Bildirim_YapanHesapKimlik ON bildirim.Bildirim (YapanHesapKimlik);
CREATE NONCLUSTERED INDEX IX_bildirim_Bildirim_KaynakUygulamaKodu ON bildirim.Bildirim (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Metin = N'Tek bir alıcıya giden kişisel bildirim: talebiniz alındı, durum değişti, randevu, numara değişikliği, görüş cevabı. Başlık ve metin uygulamanın sözlüğündeki anahtarla (BaslikAnahtari, MetinAnahtari) ve DegerlerJson içindeki değerlerle ekranda kurulur; sözlükte olmayan metin SerbestMetin kolonundadır. Teslim, görülme ve okunma bilgisi bildirim.Teslimat tablosundadır. Duyurular burada değil, duyuru.Duyuru tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'BaslikAnahtari', @Metin = N'Başlığın uygulama sözlüğündeki anahtarı (ör. bildirimler.talepAlindi).';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'MetinAnahtari', @Metin = N'Metnin uygulama sözlüğündeki anahtarı. Metin serbest yazıldıysa boş.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'DegerlerJson', @Metin = N'Sözlükteki metne yerleştirilen değerler (JSON; ör. talep numarası, yeni durum). Hesap anonimleştirilince {} yapılır.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'SerbestMetin', @Metin = N'Sözlükte karşılığı olmayan, personelin yazdığı metin. Hesap anonimleştirilince silinmiş yazısıyla değiştirilir.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'AliciTuruKodu', @Metin = N'Alıcının türü (kod.AliciTuru: musteri, servis, personel). musteri: HesapKimlik dolu; servis: ServisKimlik dolu; öteki türler: KullaniciKimlik dolu.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'TurKodu', @Metin = N'Bildirimin türü (kod.BildirimTuru: talep, numara, gorus, randevu).';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'HesapKimlik', @Metin = N'Alıcı müşteri hesabı (musteri.Hesap). Yalnız müşteri alıcıda dolu.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'ServisKimlik', @Metin = N'Alıcı servis firması (servis.Servis). Yalnız servis alıcıda dolu.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'KullaniciKimlik', @Metin = N'Alıcı kullanıcı (erisim.Kullanici), ör. personel. Müşteri ve servis alıcıda boş.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'TalepKimlik', @Metin = N'Bildirimin ilgili olduğu talep (talep.Talep). Talep bildirimi değilse boş.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'GeriBildirimKimlik', @Metin = N'Bildirimin ilgili olduğu görüş (musteri.GeriBildirim). Görüş cevabı değilse boş.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'TelefonDegisikligiTalebiKimlik', @Metin = N'Bildirimin ilgili olduğu numara değişikliği talebi (musteri.TelefonDegisikligiTalebi). Değilse boş.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'YapanTuruKodu', @Metin = N'Bildirimi doğuranın türü (kod.AktorTuru); olaydan kendiliğinden doğan bildirimde sistem.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'YapanKullaniciKimlik', @Metin = N'Bildirimi doğuran personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyon için boş.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'YapanHesapKimlik', @Metin = N'Bildirimi doğuran müşteri hesabı (musteri.Hesap). Yalnız müşteri için dolu.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'YapanAdi', @Metin = N'Bildirimi doğuranın o anki adı (personel ya da servis). Müşteri için boş.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama (kod.KaynakUygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim).';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'UygulamaSurumu', @Metin = N'Kaydın geldiği uygulamanın sürümü (ör. 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'OlusmaZamani', @Metin = N'Bildirimin oluştuğu an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yoktur, ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Bildirim', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda görünmez.';
GO

/* ---------------------------------------------------- bildirim.Teslimat */

CREATE TABLE bildirim.Teslimat (
    BildirimKimlik          uniqueidentifier NULL
        CONSTRAINT FK_bildirim_Teslimat_bildirim_Bildirim REFERENCES bildirim.Bildirim (Kimlik),
    DuyuruKimlik            uniqueidentifier NULL
        CONSTRAINT FK_bildirim_Teslimat_duyuru_Duyuru REFERENCES duyuru.Duyuru (Kimlik),
    HesapKimlik             uniqueidentifier NULL
        CONSTRAINT FK_bildirim_Teslimat_musteri_Hesap REFERENCES musteri.Hesap (Kimlik),
    ServisKimlik            uniqueidentifier NULL
        CONSTRAINT FK_bildirim_Teslimat_servis_Servis REFERENCES servis.Servis (Kimlik),
    KullaniciKimlik         uniqueidentifier NULL
        CONSTRAINT FK_bildirim_Teslimat_erisim_Kullanici REFERENCES erisim.Kullanici (Kimlik),
    RizaOlayiKimlik         uniqueidentifier NULL
        CONSTRAINT FK_bildirim_Teslimat_kvkk_RizaOlayi REFERENCES kvkk.RizaOlayi (Kimlik),
    GidenKimlik             uniqueidentifier NULL,
    HedeflenmeZamani        datetime2(3) NOT NULL
        CONSTRAINT DF_bildirim_Teslimat_HedeflenmeZamani DEFAULT SYSUTCDATETIME(),
    GonderilmeZamani        datetime2(3) NULL,
    CihazaUlasmaZamani      datetime2(3) NULL,
    GorulmeZamani           datetime2(3) NULL,
    OkunmaZamani            datetime2(3) NULL,
    KabulZamani             datetime2(3) NULL,
    ArsivlenmeZamani        datetime2(3) NULL,
    KayitNo                 bigint IDENTITY(1,1) NOT NULL,
    Kimlik                  uniqueidentifier NOT NULL
        CONSTRAINT DF_bildirim_Teslimat_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_bildirim_Teslimat PRIMARY KEY NONCLUSTERED (Kimlik),
    /* Kaynak: ya kişisel bildirim ya duyuru. */
    CONSTRAINT CK_bildirim_Teslimat_Kaynak CHECK (
         (BildirimKimlik IS NOT NULL AND DuyuruKimlik IS NULL)
      OR (BildirimKimlik IS NULL AND DuyuruKimlik IS NOT NULL)
    ),
    /* Alıcı: tam biri dolu. */
    CONSTRAINT CK_bildirim_Teslimat_Alici CHECK (
        (CASE WHEN HesapKimlik IS NULL THEN 0 ELSE 1 END)
      + (CASE WHEN ServisKimlik IS NULL THEN 0 ELSE 1 END)
      + (CASE WHEN KullaniciKimlik IS NULL THEN 0 ELSE 1 END) = 1
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_bildirim_Teslimat_KayitNo ON bildirim.Teslimat (KayitNo);

/* Bir bildirime tek teslimat; bir duyuruya alıcı başına tek teslimat (Bölüm 1.17.5). */
CREATE UNIQUE NONCLUSTERED INDEX UX_bildirim_Teslimat_Bildirim
    ON bildirim.Teslimat (BildirimKimlik)
    WHERE BildirimKimlik IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_bildirim_Teslimat_DuyuruHesap
    ON bildirim.Teslimat (DuyuruKimlik, HesapKimlik)
    WHERE DuyuruKimlik IS NOT NULL AND HesapKimlik IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_bildirim_Teslimat_DuyuruServis
    ON bildirim.Teslimat (DuyuruKimlik, ServisKimlik)
    WHERE DuyuruKimlik IS NOT NULL AND ServisKimlik IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_bildirim_Teslimat_DuyuruKullanici
    ON bildirim.Teslimat (DuyuruKimlik, KullaniciKimlik)
    WHERE DuyuruKimlik IS NOT NULL AND KullaniciKimlik IS NOT NULL;

/* Müşterinin okunmamış bildirimleri (rozet sayısı). */
CREATE NONCLUSTERED INDEX IX_bildirim_Teslimat_HesapKimlikHedeflenmeZamaniOkunmamis
    ON bildirim.Teslimat (HesapKimlik, HedeflenmeZamani)
    WHERE HesapKimlik IS NOT NULL AND OkunmaZamani IS NULL AND ArsivlenmeZamani IS NULL;

CREATE NONCLUSTERED INDEX IX_bildirim_Teslimat_BildirimKimlik ON bildirim.Teslimat (BildirimKimlik);
CREATE NONCLUSTERED INDEX IX_bildirim_Teslimat_DuyuruKimlik ON bildirim.Teslimat (DuyuruKimlik);
CREATE NONCLUSTERED INDEX IX_bildirim_Teslimat_HesapKimlik ON bildirim.Teslimat (HesapKimlik);
CREATE NONCLUSTERED INDEX IX_bildirim_Teslimat_ServisKimlik ON bildirim.Teslimat (ServisKimlik);
CREATE NONCLUSTERED INDEX IX_bildirim_Teslimat_KullaniciKimlik ON bildirim.Teslimat (KullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_bildirim_Teslimat_RizaOlayiKimlik ON bildirim.Teslimat (RizaOlayiKimlik);
/* sistem.Giden bağı V0014'te kurulur; dizini tabloyla birlikte açılır. */
CREATE NONCLUSTERED INDEX IX_bildirim_Teslimat_GidenKimlik ON bildirim.Teslimat (GidenKimlik);
GO

EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Teslimat', @Metin = N'Bir bildirimin ya da duyurunun tek bir alıcıya ulaşma kaydı: ne zaman hedeflendi, gönderildi, cihaza ulaştı, pencerede görüldü, listede okundu, kabul edildi. Kişisel bildirimde bildirim başına bir, duyuruda alıcı başına bir satır olur. Duyuru okunma sayıları gorunum.DuyuruListesi görünümündedir.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Teslimat', @Alt = N'BildirimKimlik', @Metin = N'Teslim edilen kişisel bildirim (bildirim.Bildirim). Duyuru teslimatında boş.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Teslimat', @Alt = N'DuyuruKimlik', @Metin = N'Teslim edilen duyuru (duyuru.Duyuru). Kişisel bildirim teslimatında boş.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Teslimat', @Alt = N'HesapKimlik', @Metin = N'Alıcı müşteri hesabı (musteri.Hesap). Alıcı kolonlarından tam biri doludur.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Teslimat', @Alt = N'ServisKimlik', @Metin = N'Alıcı servis firması (servis.Servis). Alıcı kolonlarından tam biri doludur.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Teslimat', @Alt = N'KullaniciKimlik', @Metin = N'Alıcı kullanıcı (erisim.Kullanici), ör. personel. Alıcı kolonlarından tam biri doludur.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Teslimat', @Alt = N'RizaOlayiKimlik', @Metin = N'Ticari ileti (kampanya duyurusu) gönderilirken dayanak alınan izin kaydı (kvkk.RizaOlayi). İzin gerekmeyen gönderimde boş.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Teslimat', @Alt = N'GidenKimlik', @Metin = N'Bu teslimat için gönderilen SMS, e-posta ya da anlık bildirim mesajı (sistem.Giden). Mesaj gönderilmediyse boş.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Teslimat', @Alt = N'HedeflenmeZamani', @Metin = N'Alıcının bu bildirim ya da duyuru için hedeflendiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Teslimat', @Alt = N'GonderilmeZamani', @Metin = N'Bildirimin sağlayıcıya gönderildiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Teslimat', @Alt = N'CihazaUlasmaZamani', @Metin = N'Bildirimin alıcının cihazına ulaştığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Teslimat', @Alt = N'GorulmeZamani', @Metin = N'Alıcının açılış penceresinde gördüğü an (UTC). Görüldü, okundu demek değildir.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Teslimat', @Alt = N'OkunmaZamani', @Metin = N'Alıcının bildirim listesinde açıp okuduğu an (UTC). Boşsa okunmamış sayılır.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Teslimat', @Alt = N'KabulZamani', @Metin = N'Alıcının duyuruyu kabul ettiğini bildirdiği an (UTC). Kabul istenmeyen gönderimde boş.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Teslimat', @Alt = N'ArsivlenmeZamani', @Metin = N'Alıcının bildirimi listeden kaldırdığı an (UTC). Arşivlenen bildirim okunmamış sayısına girmez.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Teslimat', @Alt = N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yoktur, ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'bildirim', @Nesne = N'Teslimat', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda görünmez.';
GO

/* --------------------------------- kvkk.RizaOlayi → bildirim.Cihaz (6.3) */

ALTER TABLE kvkk.RizaOlayi WITH CHECK
    ADD CONSTRAINT FK_kvkk_RizaOlayi_bildirim_Cihaz
    FOREIGN KEY (CihazKimlik) REFERENCES bildirim.Cihaz (Kimlik);
GO

/* Yabancı anahtarın dizini: V0006 CihazKimlik ile başlayan bir dizin açmadıysa burada açılır. */
IF NOT EXISTS (
    SELECT 1
    FROM sys.index_columns AS ic
    JOIN sys.columns AS c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE ic.object_id = OBJECT_ID(N'kvkk.RizaOlayi') AND ic.key_ordinal = 1 AND c.name = N'CihazKimlik'
)
    CREATE NONCLUSTERED INDEX IX_kvkk_RizaOlayi_CihazKimlik ON kvkk.RizaOlayi (CihazKimlik);
GO
