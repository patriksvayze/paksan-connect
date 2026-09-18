/* ==========================================================================
   V0004 — sirket ve katalog şemaları, kod.BelirtiKapsami,
           kod.TalepNumaraKurali → katalog.Marka yabancı anahtarı

   Kural kaynağı: veritabani/tasarim.md (0.2, 0.4 sirket/katalog/kod,
   1.3, 1.4, 1.5, 1.6, 1.9.2, 1.11.1, 1.15.3, 1.15.4, 1.17, 5.2, 5.5,
   6.2, 6.3). Taslak B (kurum, katalog) ayrıntıları bu kurallarla
   çevrildi.

   - Sistem sürümlü tablolar (Bölüm 1.11.1): sirket.Sirket,
     sirket.BankaHesabi, katalog.Marka, katalog.Urun, katalog.Parca.
     Geçmişleri gecmis.<sema>_<Tablo> tablolarına motor yazar.
   - Bu şemalara uygulama yazmaz; satırları tohum (T04, T05, T06) yazar.
   - MarkaKodu kolonlarında varsayılan değer yok: marka her satırda açıkça
     yazılır, motor şemasında marka adı geçmez (tasarim.md 1.15.1
     "Uygulamada değişti" notu).
   - Çeviri: tek kolon anahtarlı Kategori kod.Ceviri'yi kullanır;
     bileşik anahtarlı satırların kendi …Cevirisi tabloları var
     (Bölüm 1.15.3). Türkçe metin satırın kendisindedir.
   - Betik tek işlemde çalışır (araç sarmalar); BEGIN/COMMIT yazılmaz.

   Başka betiklerin tablolarına verilen yabancı anahtarlar (adlar
   tasarim.md'den): kod.Dil (Kod), kod.ParaBirimi (Kod),
   kod.DestekAilesi (Kod), kod.Belirti (Kod), kod.GarantiBaslangicEsasi
   (Kod), kod.SeriKurali (Kod); ileri FK kod.TalepNumaraKurali
   (MarkaKodu) → katalog.Marka (Kod) (Bölüm 6.3).
   ========================================================================== */

/* ==================================================== sirket.Sirket */

CREATE TABLE sirket.Sirket (
    Kod                     nvarchar(20)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    Ad                      nvarchar(100) COLLATE Turkish_100_CI_AS       NOT NULL,
    KisaAd                  nvarchar(50)  COLLATE Turkish_100_CI_AS       NOT NULL,
    Unvan                   nvarchar(250) COLLATE Turkish_100_CI_AS       NOT NULL,
    UygulamaAdi             nvarchar(100) COLLATE Turkish_100_CI_AS       NULL,
    KurulusYili             smallint NULL,
    VergiNo                 nvarchar(11)  COLLATE Latin1_General_100_BIN2 NULL,
    VergiDairesi            nvarchar(100) COLLATE Turkish_100_CI_AS       NULL,
    LogoFirmaNo             smallint NULL,
    TelefonMetni            nvarchar(30)  COLLATE Turkish_100_CI_AS       NULL,
    IkinciTelefonMetni      nvarchar(30)  COLLATE Turkish_100_CI_AS       NULL,
    FaksMetni               nvarchar(30)  COLLATE Turkish_100_CI_AS       NULL,
    Eposta                  nvarchar(254) COLLATE Latin1_General_100_CI_AS NULL,
    SiteUrl                 nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    SiteMetni               nvarchar(100) COLLATE Turkish_100_CI_AS       NULL,
    Adres                   nvarchar(500) COLLATE Turkish_100_CI_AS       NULL,
    IkinciAdres             nvarchar(500) COLLATE Turkish_100_CI_AS       NULL,
    TelefonE164             nvarchar(16)  COLLATE Latin1_General_100_BIN2 NULL,
    TelefonUlusal           nvarchar(15)  COLLATE Latin1_General_100_BIN2 NULL,
    IkinciTelefonE164       nvarchar(16)  COLLATE Latin1_General_100_BIN2 NULL,
    IkinciTelefonUlusal     nvarchar(15)  COLLATE Latin1_General_100_BIN2 NULL,
    GecerlilikBaslangici    datetime2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    GecerlilikBitisi        datetime2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (GecerlilikBaslangici, GecerlilikBitisi),
    CONSTRAINT PK_sirket_Sirket PRIMARY KEY CLUSTERED (Kod),
    CONSTRAINT CK_sirket_Sirket_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^a-z]%'),
    CONSTRAINT CK_sirket_Sirket_KurulusYili CHECK (
        KurulusYili IS NULL OR KurulusYili BETWEEN 1800 AND 2100),
    CONSTRAINT CK_sirket_Sirket_VergiNo CHECK (
        VergiNo IS NULL OR (LEN(VergiNo) BETWEEN 10 AND 11 AND VergiNo NOT LIKE N'%[^0-9]%')),
    CONSTRAINT CK_sirket_Sirket_LogoFirmaNo CHECK (
        LogoFirmaNo IS NULL OR LogoFirmaNo BETWEEN 1 AND 999),
    CONSTRAINT CK_sirket_Sirket_TelefonE164 CHECK (
        TelefonE164 IS NULL
        OR (TelefonE164 LIKE N'+[1-9]%'
            AND SUBSTRING(TelefonE164, 2, 15) NOT LIKE N'%[^0-9]%'
            AND LEN(TelefonE164) BETWEEN 8 AND 16)),
    CONSTRAINT CK_sirket_Sirket_TelefonUlusal CHECK (
        TelefonUlusal IS NULL OR TelefonUlusal NOT LIKE N'%[^0-9]%'),
    CONSTRAINT CK_sirket_Sirket_IkinciTelefonE164 CHECK (
        IkinciTelefonE164 IS NULL
        OR (IkinciTelefonE164 LIKE N'+[1-9]%'
            AND SUBSTRING(IkinciTelefonE164, 2, 15) NOT LIKE N'%[^0-9]%'
            AND LEN(IkinciTelefonE164) BETWEEN 8 AND 16)),
    CONSTRAINT CK_sirket_Sirket_IkinciTelefonUlusal CHECK (
        IkinciTelefonUlusal IS NULL OR IkinciTelefonUlusal NOT LIKE N'%[^0-9]%')
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = gecmis.sirket_Sirket, DATA_CONSISTENCY_CHECK = ON));
GO

CREATE UNIQUE INDEX UX_sirket_Sirket_LogoFirmaNo ON sirket.Sirket (LogoFirmaNo)
    WHERE LogoFirmaNo IS NOT NULL;
GO

EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket',
    @Metin = N'Uygulamaları işleten şirket(ler): faturayı kesen, parça bedelini ve servisin hak edişini ödeyen tüzel kişi. Bugün tek satır var (paksan). Her marka bir şirkete bağlıdır (katalog.Marka.SirketKodu); para kayıtları yazıldıkları andaki şirketi taşır. Şirketin kendi vergi numarası ve IBAN''ı açık bilgidir, şifrelenmez. Değişiklik geçmişi gecmis.sirket_Sirket tablosundadır. Tohumla gelir (kaynak: src/marka/kimlik.js SIRKET, UYGULAMA); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'Kod',
    @Metin = N'Şirketin kısa kodu, yalnız küçük İngilizce harf (paksan). Öteki tablolar şirkete bu kodla bağlanır (SirketKodu).';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'Ad',
    @Metin = N'Ekranlarda görünen şirket adı (PAKSAN Makina).';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'KisaAd',
    @Metin = N'Cümle içinde geçen kısa ad (PAKSAN): "PAKSAN''a başvurun" gibi metinlerde kullanılır.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'Unvan',
    @Metin = N'Şirketin resmî unvanı (PAKSAN MAKİNA SANAYİ VE TİCARET A.Ş.). KVKK metninde veri sorumlusu, ödeme ekranında alıcı adı olarak yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'UygulamaAdi',
    @Metin = N'Müşteri uygulamasının adı (PAKSAN Connect).';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'KurulusYili',
    @Metin = N'Şirketin kuruluş yılı (1970). Karşılama ekranında görünür.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'VergiNo',
    @Metin = N'Şirketin vergi kimlik numarası (10 ya da 11 rakam). Açık bilgidir, şifrelenmez. Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'VergiDairesi',
    @Metin = N'Şirketin bağlı olduğu vergi dairesinin adı. Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'LogoFirmaNo',
    @Metin = N'Şirketin LOGO muhasebe programındaki firma numarası (1–999). Boşsa henüz girilmemiştir; LOGO cari kodu kontrolü o zaman "hiç LOGO cari kodu yok" kuralıyla çalışır. İki şirket aynı numarayı alamaz.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'TelefonMetni',
    @Metin = N'Ana telefon, ekranda yazıldığı biçimiyle (444 9 725). Aranacak numara TelefonE164 ve TelefonUlusal kolonlarındadır.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'IkinciTelefonMetni',
    @Metin = N'İkinci telefon, ekranda yazıldığı biçimiyle (+90 266 733 90 90). Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'FaksMetni',
    @Metin = N'Faks numarası, ekranda yazıldığı biçimiyle. Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'Eposta',
    @Metin = N'Şirketin genel e-posta adresi (paksan@paksanmakina.com.tr).';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'SiteUrl',
    @Metin = N'Şirketin internet sitesinin tam adresi (https://www.paksanmakina.com.tr).';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'SiteMetni',
    @Metin = N'Sitenin cümle içinde okunan kısa yazımı (paksanmakina.com.tr).';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'Adres',
    @Metin = N'Şirketin ana adresi, tek satır metin. KVKK metninde yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'IkinciAdres',
    @Metin = N'Şirketin ikinci tesisinin adresi, tek satır metin. Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'TelefonE164',
    @Metin = N'Ana telefonun uluslararası biçimi: artı, ülke kodu ve numara, boşluksuz (+904449725). Arama bağlantısı bundan kurulur.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'TelefonUlusal',
    @Metin = N'Ana telefonun ülke kodu atılmış, yalnız rakamlı hâli (4449725).';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'IkinciTelefonE164',
    @Metin = N'İkinci telefonun uluslararası biçimi, boşluksuz (+902667339090). Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'IkinciTelefonUlusal',
    @Metin = N'İkinci telefonun ülke kodu atılmış, yalnız rakamlı hâli (2667339090). Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'GecerlilikBaslangici',
    @Metin = N'Satırın bu hâlinin geçerli olmaya başladığı an (UTC). SQL Server kendisi yazar; gizli kolondur, SELECT * ile görünmez. Türkiye saati için: GecerlilikBaslangici AT TIME ZONE ''UTC'' AT TIME ZONE ''Turkey Standard Time''.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'Sirket', @Alt = N'GecerlilikBitisi',
    @Metin = N'Satırın bu hâlinin geçerliliğinin bittiği an (UTC). Güncel satırda 9999-12-31. SQL Server kendisi yazar; gizli kolondur. Eski hâller için: SELECT … FROM sirket.Sirket FOR SYSTEM_TIME ALL.';
GO

/* =============================================== sirket.BankaHesabi */

CREATE TABLE sirket.BankaHesabi (
    BankaAdi                nvarchar(100) COLLATE Turkish_100_CI_AS       NOT NULL,
    SubeAdi                 nvarchar(100) COLLATE Turkish_100_CI_AS       NULL,
    Iban                    nvarchar(34)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    HesapUnvani             nvarchar(250) COLLATE Turkish_100_CI_AS       NOT NULL,
    Sira                    smallint NOT NULL CONSTRAINT DF_sirket_BankaHesabi_Sira DEFAULT 0,
    SirketKodu              nvarchar(20)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    ParaBirimiKodu          nvarchar(3)   COLLATE Latin1_General_100_BIN2 NOT NULL,
    Aktif                   bit NOT NULL CONSTRAINT DF_sirket_BankaHesabi_Aktif DEFAULT 1,
    KayitNo                 bigint IDENTITY(1,1) NOT NULL,
    Kimlik                  uniqueidentifier NOT NULL CONSTRAINT DF_sirket_BankaHesabi_Kimlik DEFAULT NEWID(),
    GecerlilikBaslangici    datetime2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    GecerlilikBitisi        datetime2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (GecerlilikBaslangici, GecerlilikBitisi),
    CONSTRAINT PK_sirket_BankaHesabi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_sirket_BankaHesabi_SirketKoduIban UNIQUE (SirketKodu, Iban),
    CONSTRAINT FK_sirket_BankaHesabi_sirket_Sirket FOREIGN KEY (SirketKodu)
        REFERENCES sirket.Sirket (Kod),
    CONSTRAINT FK_sirket_BankaHesabi_kod_ParaBirimi FOREIGN KEY (ParaBirimiKodu)
        REFERENCES kod.ParaBirimi (Kod),
    CONSTRAINT CK_sirket_BankaHesabi_Iban CHECK (
        LEN(Iban) BETWEEN 15 AND 34
        AND Iban LIKE N'[A-Z][A-Z][0-9][0-9]%'
        AND Iban NOT LIKE N'%[^A-Z0-9]%')
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = gecmis.sirket_BankaHesabi, DATA_CONSISTENCY_CHECK = ON));
GO

CREATE UNIQUE CLUSTERED INDEX CX_sirket_BankaHesabi_KayitNo ON sirket.BankaHesabi (KayitNo);
CREATE INDEX IX_sirket_BankaHesabi_ParaBirimiKodu ON sirket.BankaHesabi (ParaBirimiKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'BankaHesabi',
    @Metin = N'Şirketin banka hesapları. Müşteri yedek parça bedelini bu hesaplara gönderir: ödeme ekranı talebin şirketinin (talep.ParcaTalebiAyrinti.SirketKodu) aktif hesaplarını Sira''ya göre gösterir. Hesap silinmez; kullanılmayan hesap Aktif = 0 yapılır. Değişiklik geçmişi gecmis.sirket_BankaHesabi tablosundadır. Tohumla gelir (kaynak: src/marka/kimlik.js BANKA.hesaplar); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'BankaHesabi', @Alt = N'BankaAdi',
    @Metin = N'Bankanın adı.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'BankaHesabi', @Alt = N'SubeAdi',
    @Metin = N'Şubenin adı. Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'BankaHesabi', @Alt = N'Iban',
    @Metin = N'Hesabın IBAN''ı; boşluksuz, büyük harfle (Türkiye''deki hesapta TR ile başlayan 26 karakter). Şirketin IBAN''ı açık bilgidir, şifrelenmez. Aynı şirkette aynı IBAN bir kez bulunur.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'BankaHesabi', @Alt = N'HesapUnvani',
    @Metin = N'Hesap sahibinin bankada kayıtlı unvanı; müşteri havale yaparken alıcı adı olarak bunu yazar.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'BankaHesabi', @Alt = N'Sira',
    @Metin = N'Ödeme ekranındaki gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'BankaHesabi', @Alt = N'SirketKodu',
    @Metin = N'Hesabın sahibi olan şirket (sirket.Sirket).';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'BankaHesabi', @Alt = N'ParaBirimiKodu',
    @Metin = N'Hesabın para birimi (TRY, EUR; kod.ParaBirimi).';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'BankaHesabi', @Alt = N'Aktif',
    @Metin = N'1: ödeme ekranında gösterilir. 0: artık kullanılmıyor (satır silinmez).';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'BankaHesabi', @Alt = N'KayitNo',
    @Metin = N'SSMS''te satırı seçmek için sıra numarası. İş anlamı yoktur; ekrana ve belgelere çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'BankaHesabi', @Alt = N'Kimlik',
    @Metin = N'Satırın teknik anahtarı (GUID). Ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'BankaHesabi', @Alt = N'GecerlilikBaslangici',
    @Metin = N'Satırın bu hâlinin geçerli olmaya başladığı an (UTC). SQL Server kendisi yazar; gizli kolondur, SELECT * ile görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'sirket', @Nesne = N'BankaHesabi', @Alt = N'GecerlilikBitisi',
    @Metin = N'Satırın bu hâlinin geçerliliğinin bittiği an (UTC). Güncel satırda 9999-12-31. SQL Server kendisi yazar; gizli kolondur.';
GO

/* ==================================================== katalog.Marka */

CREATE TABLE katalog.Marka (
    Kod                         nvarchar(20)   COLLATE Latin1_General_100_BIN2 NOT NULL,
    Ad                          nvarchar(100)  COLLATE Turkish_100_CI_AS       NOT NULL,
    Okunus                      nvarchar(100)  COLLATE Turkish_100_CI_AS       NULL,
    GarantiYil                  tinyint NULL,
    GarantiFaturaEkGun          smallint NULL,
    ServisIskontoOrani          decimal(7,4) NULL,
    KdvOrani                    decimal(7,4) NULL,
    KilavuzDilleri              nvarchar(20)   COLLATE Latin1_General_100_BIN2 NULL,
    AsinmaAnahtari              nvarchar(60)   COLLATE Latin1_General_100_BIN2 NULL,
    GorselYolu                  nvarchar(260)  COLLATE Latin1_General_100_BIN2 NULL,
    AmblemYolu                  nvarchar(260)  COLLATE Latin1_General_100_BIN2 NULL,
    SiteUrl                     nvarchar(200)  COLLATE Latin1_General_100_BIN2 NULL,
    SiteMetni                   nvarchar(100)  COLLATE Turkish_100_CI_AS       NULL,
    ParcaKatalogYolu            nvarchar(260)  COLLATE Latin1_General_100_BIN2 NULL,
    KaynakNotu                  nvarchar(1000) COLLATE Turkish_100_CI_AS       NULL,
    SirketKodu                  nvarchar(20)   COLLATE Latin1_General_100_BIN2 NOT NULL,
    GarantiBaslangicEsasiKodu   nvarchar(40)   COLLATE Latin1_General_100_BIN2 NULL,
    SeriKuraliKodu              nvarchar(40)   COLLATE Latin1_General_100_BIN2 NULL,
    ParaBirimiKodu              nvarchar(3)    COLLATE Latin1_General_100_BIN2 NULL,
    KilavuzPaketiKodu           nvarchar(60)   COLLATE Latin1_General_100_BIN2 NULL,
    Aktif                       bit NOT NULL CONSTRAINT DF_katalog_Marka_Aktif DEFAULT 0,
    GecerlilikBaslangici        datetime2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    GecerlilikBitisi            datetime2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (GecerlilikBaslangici, GecerlilikBitisi),
    CONSTRAINT PK_katalog_Marka PRIMARY KEY CLUSTERED (Kod),
    CONSTRAINT FK_katalog_Marka_sirket_Sirket FOREIGN KEY (SirketKodu)
        REFERENCES sirket.Sirket (Kod),
    CONSTRAINT FK_katalog_Marka_kod_GarantiBaslangicEsasi FOREIGN KEY (GarantiBaslangicEsasiKodu)
        REFERENCES kod.GarantiBaslangicEsasi (Kod),
    CONSTRAINT FK_katalog_Marka_kod_SeriKurali FOREIGN KEY (SeriKuraliKodu)
        REFERENCES kod.SeriKurali (Kod),
    CONSTRAINT FK_katalog_Marka_kod_ParaBirimi FOREIGN KEY (ParaBirimiKodu)
        REFERENCES kod.ParaBirimi (Kod),
    CONSTRAINT CK_katalog_Marka_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^a-z]%'),
    CONSTRAINT CK_katalog_Marka_Aktif CHECK (
        Aktif = 0
        OR (GarantiYil IS NOT NULL AND SeriKuraliKodu IS NOT NULL AND KaynakNotu IS NOT NULL)),
    CONSTRAINT CK_katalog_Marka_GarantiYil CHECK (GarantiYil IS NULL OR GarantiYil <= 50),
    CONSTRAINT CK_katalog_Marka_GarantiFaturaEkGun CHECK (
        GarantiFaturaEkGun IS NULL OR GarantiFaturaEkGun >= 0),
    CONSTRAINT CK_katalog_Marka_ServisIskontoOrani CHECK (
        ServisIskontoOrani IS NULL OR (ServisIskontoOrani >= 0 AND ServisIskontoOrani <= 1)),
    CONSTRAINT CK_katalog_Marka_KdvOrani CHECK (
        KdvOrani IS NULL OR (KdvOrani >= 0 AND KdvOrani <= 1)),
    CONSTRAINT CK_katalog_Marka_KilavuzDilleri CHECK (
        KilavuzDilleri IS NULL
        OR (LEN(KilavuzDilleri) >= 2 AND KilavuzDilleri NOT LIKE N'%[^a-z,]%'))
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = gecmis.katalog_Marka, DATA_CONSISTENCY_CHECK = ON));
GO

CREATE INDEX IX_katalog_Marka_SirketKodu ON katalog.Marka (SirketKodu);
CREATE INDEX IX_katalog_Marka_GarantiBaslangicEsasiKodu ON katalog.Marka (GarantiBaslangicEsasiKodu);
CREATE INDEX IX_katalog_Marka_SeriKuraliKodu ON katalog.Marka (SeriKuraliKodu);
CREATE INDEX IX_katalog_Marka_ParaBirimiKodu ON katalog.Marka (ParaBirimiKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka',
    @Metin = N'Ürün markaları (bugün paksan). Yeni marka = yeni satır; ürünleri, parçaları, fiyat listesi, belirtileri ve servis/bayi yetkileri o markanın koduyla eklenir. Boş bırakılan kural kolonları (garanti, iskonto, para birimi, KDV) önce markanın şirketinin, sonra genel ayara düşer; geçerli değeri katalog.MarkaKurallari görünümünden okuyun. Garanti süresi satış kaydına o anki değerle kopyalanır, burada değişince eski satışlar etkilenmez. Aktif marka için garanti yılı, seri kuralı ve kaynak notu zorunludur. Değişiklik geçmişi gecmis.katalog_Marka tablosundadır. Tohumla gelir (kaynak: src/marka/kimlik.js, src/lib/serial.js, src/marka/katalog/makineFiyat.js); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'Kod',
    @Metin = N'Markanın kısa kodu, yalnız küçük İngilizce harf (paksan, globale). Öteki tablolar markaya bu kodla bağlanır (MarkaKodu); marka her satırda açıkça yazılır, varsayılan değeri yoktur.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'Ad',
    @Metin = N'Markanın ekranda görünen adı (PAKSAN, Globale).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'Okunus',
    @Metin = N'Markanın okunuşu. Türkçe ekler (''a, ''ın) yazıma göre değil okunuşa göre geliyorsa doldurulur; boşsa ek addan hesaplanır.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'GarantiYil',
    @Metin = N'Markanın makineleri için garanti süresi, yıl olarak (paksan: 2). Boşsa şirketin, o da yoksa genel GarantiYili ayarına düşer. Aktif markada zorunludur.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'GarantiFaturaEkGun',
    @Metin = N'Teslim belgesi yoksa garantinin başlangıcı için bayi fatura tarihine eklenecek gün sayısı. Boşsa şirket ya da genel GarantiFaturaEkGunu ayarına düşer; o da boşsa bu yol kullanılmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'ServisIskontoOrani',
    @Metin = N'Servisin bu markanın parçalarını alırken yararlandığı indirim oranı, ondalık kesir olarak (0,3000 = %30). Boşsa şirket ya da genel ServisParcaIskontoOrani ayarına düşer.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'KdvOrani',
    @Metin = N'Bu markanın satışlarında uygulanacak KDV oranı, ondalık kesir olarak (0,2000 = %20). Boşsa şirketin ya da genel KdvOrani ayarına düşer.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'KilavuzDilleri',
    @Metin = N'Markanın kılavuzlarının bulunduğu diller, virgülle ayrılmış dil kodları (tr,en). Yeni dilde kılavuz gelince yalnız bu değer değişir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'AsinmaAnahtari',
    @Metin = N'Garanti metninde aşınma parçaları istisnasını anlatan cümlenin uygulama sözlüğündeki anahtar eki. Boşsa genel cümle kullanılır.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'GorselYolu',
    @Metin = N'Markanın logosunun görsel dosyasının uygulamadaki yolu. Boşsa ekranda logo yerine marka adı yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'AmblemYolu',
    @Metin = N'Markanın yalnız amblemini (yazısız işaretini) taşıyan görsel dosyasının uygulamadaki yolu. Dar alanlarda logonun yerine kullanılır. Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'SiteUrl',
    @Metin = N'Markanın internet sitesinin tam adresi. Teknik özellik ekranında kaynak olarak gösterilir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'SiteMetni',
    @Metin = N'Markanın sitesinin cümle içinde okunan kısa yazımı (paksanmakina.com.tr).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'ParcaKatalogYolu',
    @Metin = N'Markanın yedek parça kataloğu dosyasının uygulamadaki yolu. Parçaların veritabanındaki kaynağı katalog.Parca ve katalog.FiyatListesi tablolarıdır. Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'KaynakNotu',
    @Metin = N'Markanın bilgilerinin (garanti, seri, fiyat) nereden ve ne zaman alındığını anlatan not. Uydurma veriyi önlemek için aktif markada zorunludur.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'SirketKodu',
    @Metin = N'Markayı satan ve faturasını kesen şirket (sirket.Sirket). Değişebilir; para kayıtları yazıldıkları andaki şirketi ayrıca taşıdığı için eski kayıtlar etkilenmez.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'GarantiBaslangicEsasiKodu',
    @Metin = N'Garanti süresinin neyle başladığı (teslim, fatura, uretim; kod.GarantiBaslangicEsasi). Boşsa şirket ya da genel GarantiBaslangicEsasi ayarına düşer.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'SeriKuraliKodu',
    @Metin = N'Markanın seri numarası biçimi (onekYilSira = ORK1270-2024-00157 gibi; kod.SeriKurali). Aktif markada zorunludur.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'ParaBirimiKodu',
    @Metin = N'Markanın fiyatlarının para birimi (kod.ParaBirimi). Boşsa şirketin ya da genel ParaBirimi ayarına düşer.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'KilavuzPaketiKodu',
    @Metin = N'Markanın kılavuz paketinin kodu (sistem.IcerikPaketi.Kod değeri; yabancı anahtar yok). Boşsa markanın kılavuzu yok demektir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'Aktif',
    @Metin = N'1: marka uygulamalarda görünür. 0: kapalı; bilgileri gelmeyen marka kapalı başlar (varsayılan 0). Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'GecerlilikBaslangici',
    @Metin = N'Satırın bu hâlinin geçerli olmaya başladığı an (UTC). SQL Server kendisi yazar; gizli kolondur, SELECT * ile görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Marka', @Alt = N'GecerlilikBitisi',
    @Metin = N'Satırın bu hâlinin geçerliliğinin bittiği an (UTC). Güncel satırda 9999-12-31. SQL Server kendisi yazar; gizli kolondur.';
GO

/* ================================================= katalog.Kategori */

CREATE TABLE katalog.Kategori (
    Kod                 nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    Ad                  nvarchar(100) COLLATE Turkish_100_CI_AS       NOT NULL,
    KisaAd              nvarchar(50)  COLLATE Turkish_100_CI_AS       NOT NULL,
    Ikon                nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    Sira                smallint NOT NULL CONSTRAINT DF_katalog_Kategori_Sira DEFAULT 0,
    DestekAilesiKodu    nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    Aktif               bit NOT NULL CONSTRAINT DF_katalog_Kategori_Aktif DEFAULT 1,
    CONSTRAINT PK_katalog_Kategori PRIMARY KEY CLUSTERED (Kod),
    CONSTRAINT FK_katalog_Kategori_kod_DestekAilesi FOREIGN KEY (DestekAilesiKodu)
        REFERENCES kod.DestekAilesi (Kod),
    CONSTRAINT CK_katalog_Kategori_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^a-z0-9-]%')
);
GO

CREATE INDEX IX_katalog_Kategori_DestekAilesiKodu ON katalog.Kategori (DestekAilesiKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Kategori',
    @Metin = N'Ürün kategorileri (Büyük Balya Makineleri, Yem Karma Makineleri). Bütün markalarda ortaktır. İngilizce adları kod.Ceviri tablosundadır (ListeAdi = katalog.Kategori, AlanAdi = Ad ya da KisaAd). Satır silinmez, Aktif = 0 yapılır. Tohumla gelir (kaynak: src/marka/katalog/products.js CATEGORIES); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Kategori', @Alt = N'Kod',
    @Metin = N'Kategorinin kodu; küçük harf, rakam ve tire (buyuk-balya). Ürünler bu kodla bağlanır (KategoriKodu).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Kategori', @Alt = N'Ad',
    @Metin = N'Kategorinin Türkçe adı (Büyük Balya Makineleri).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Kategori', @Alt = N'KisaAd',
    @Metin = N'Dar alanlarda gösterilen kısa Türkçe ad (Büyük Balya).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Kategori', @Alt = N'Ikon',
    @Metin = N'Uygulamada kategorinin yanında çizilen simgenin adı (bale, mixer).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Kategori', @Alt = N'Sira',
    @Metin = N'Katalog ekranındaki gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Kategori', @Alt = N'DestekAilesiKodu',
    @Metin = N'Kategorinin makine ailesi (balya, rulo, yem…; kod.DestekAilesi). Talep ekranındaki belirti listesi ve yedek parça grupları bu aileye göre seçilir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Kategori', @Alt = N'Aktif',
    @Metin = N'1: kullanılıyor. 0: artık kullanılmıyor (satır silinmez).';
GO

/* ============================================= katalog.BakimSablonu */

CREATE TABLE katalog.BakimSablonu (
    Kod     nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    Aktif   bit NOT NULL CONSTRAINT DF_katalog_BakimSablonu_Aktif DEFAULT 1,
    CONSTRAINT PK_katalog_BakimSablonu PRIMARY KEY CLUSTERED (Kod),
    CONSTRAINT CK_katalog_BakimSablonu_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^a-z0-9-]%')
);
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'BakimSablonu',
    @Metin = N'Bakım şablonları: aynı bakım adımlarını paylaşan makine grupları (balya, yem, silaj, toprak). Adımları katalog.BakimAdimi tablosundadır; ürün şablona BakimSablonuKodu ile bağlanır. Bütün markalarda ortaktır. Tohumla gelir (kaynak: src/marka/katalog/products.js BAKIM); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'BakimSablonu', @Alt = N'Kod',
    @Metin = N'Şablonun kodu; küçük harf, rakam ve tire (balya).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'BakimSablonu', @Alt = N'Aktif',
    @Metin = N'1: kullanılıyor. 0: artık kullanılmıyor (satır silinmez).';
GO

/* =============================================== katalog.BakimAdimi */

CREATE TABLE katalog.BakimAdimi (
    SablonKodu  nvarchar(40)   COLLATE Latin1_General_100_BIN2 NOT NULL,
    Saat        smallint NOT NULL,
    Baslik      nvarchar(200)  COLLATE Turkish_100_CI_AS       NOT NULL,
    Detay       nvarchar(1000) COLLATE Turkish_100_CI_AS       NULL,
    Aktif       bit NOT NULL CONSTRAINT DF_katalog_BakimAdimi_Aktif DEFAULT 1,
    CONSTRAINT PK_katalog_BakimAdimi PRIMARY KEY CLUSTERED (SablonKodu, Saat),
    CONSTRAINT FK_katalog_BakimAdimi_katalog_BakimSablonu FOREIGN KEY (SablonKodu)
        REFERENCES katalog.BakimSablonu (Kod),
    CONSTRAINT CK_katalog_BakimAdimi_Saat CHECK (Saat > 0)
);
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'BakimAdimi',
    @Metin = N'Bakım şablonlarının adımları: kaç çalışma saatinde bir ne yapılacağı (balya, 50 saat: Zincir gerginliği ve yağlama). Makine sayfasındaki bakım listesi buradan gelir. İngilizcesi katalog.BakimAdimiCevirisi tablosundadır. Satır silinmez, Aktif = 0 yapılır. Tohumla gelir (kaynak: src/marka/katalog/products.js BAKIM); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'BakimAdimi', @Alt = N'SablonKodu',
    @Metin = N'Adımın ait olduğu bakım şablonu (katalog.BakimSablonu).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'BakimAdimi', @Alt = N'Saat',
    @Metin = N'Adımın kaç çalışma saatinde bir yapılacağı (10, 50, 250). Aynı şablonda bir saat bir kez bulunur.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'BakimAdimi', @Alt = N'Baslik',
    @Metin = N'Adımın Türkçe başlığı (Günlük gresleme).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'BakimAdimi', @Alt = N'Detay',
    @Metin = N'Adımda yapılacakların Türkçe açıklaması. Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'BakimAdimi', @Alt = N'Aktif',
    @Metin = N'1: gösterilir. 0: artık kullanılmıyor (satır silinmez).';
GO

/* ======================================= katalog.BakimAdimiCevirisi */

CREATE TABLE katalog.BakimAdimiCevirisi (
    SablonKodu  nvarchar(40)   COLLATE Latin1_General_100_BIN2  NOT NULL,
    Saat        smallint NOT NULL,
    DilKodu     nvarchar(5)    COLLATE Latin1_General_100_BIN2  NOT NULL,
    Baslik      nvarchar(200)  COLLATE Latin1_General_100_CI_AS NOT NULL,
    Detay       nvarchar(1000) COLLATE Latin1_General_100_CI_AS NULL,
    CONSTRAINT PK_katalog_BakimAdimiCevirisi PRIMARY KEY CLUSTERED (SablonKodu, Saat, DilKodu),
    CONSTRAINT FK_katalog_BakimAdimiCevirisi_katalog_BakimAdimi FOREIGN KEY (SablonKodu, Saat)
        REFERENCES katalog.BakimAdimi (SablonKodu, Saat),
    CONSTRAINT FK_katalog_BakimAdimiCevirisi_kod_Dil FOREIGN KEY (DilKodu)
        REFERENCES kod.Dil (Kod),
    CONSTRAINT CK_katalog_BakimAdimiCevirisi_DilKodu CHECK (DilKodu <> N'tr')
);
GO

CREATE INDEX IX_katalog_BakimAdimiCevirisi_DilKodu ON katalog.BakimAdimiCevirisi (DilKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'BakimAdimiCevirisi',
    @Metin = N'Bakım adımlarının Türkçe dışındaki dillerdeki metni; dil başına bir satır. Türkçe metin katalog.BakimAdimi satırındadır, burada tr satırı olmaz. Tohumla gelir (kaynak: src/marka/katalog/products.en.js BAKIM_EN); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'BakimAdimiCevirisi', @Alt = N'SablonKodu',
    @Metin = N'Çevrilen adımın bakım şablonu (katalog.BakimAdimi ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'BakimAdimiCevirisi', @Alt = N'Saat',
    @Metin = N'Çevrilen adımın çalışma saati (katalog.BakimAdimi ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'BakimAdimiCevirisi', @Alt = N'DilKodu',
    @Metin = N'Çevirinin dili (en; kod.Dil). tr olamaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'BakimAdimiCevirisi', @Alt = N'Baslik',
    @Metin = N'Adımın bu dildeki başlığı.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'BakimAdimiCevirisi', @Alt = N'Detay',
    @Metin = N'Adımın bu dildeki açıklaması. Boş olabilir.';
GO

/* ===================================================== katalog.Urun */

CREATE TABLE katalog.Urun (
    MarkaKodu               nvarchar(20)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    Kod                     nvarchar(60)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    Ad                      nvarchar(100) COLLATE Turkish_100_CI_AS       NOT NULL,
    Slogan                  nvarchar(200) COLLATE Turkish_100_CI_AS       NULL,
    Aciklama                nvarchar(max) COLLATE Turkish_100_CI_AS       NULL,
    SeriOneki               nvarchar(20)  COLLATE Latin1_General_100_BIN2 NULL,
    SeriOnekiDogrulandi     bit NOT NULL CONSTRAINT DF_katalog_Urun_SeriOnekiDogrulandi DEFAULT 0,
    VitrinSirasi            smallint NULL,
    KilavuzUrl              nvarchar(400) COLLATE Latin1_General_100_BIN2 NULL,
    TeknikKaynakUrl         nvarchar(400) COLLATE Latin1_General_100_BIN2 NULL,
    KategoriKodu            nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    BakimSablonuKodu        nvarchar(40)  COLLATE Latin1_General_100_BIN2 NULL,
    KilavuzKapsamKodu       nvarchar(100) COLLATE Latin1_General_100_BIN2 NULL,
    Aktif                   bit NOT NULL CONSTRAINT DF_katalog_Urun_Aktif DEFAULT 1,
    EskiKayitNo             nvarchar(64)  COLLATE Latin1_General_100_BIN2 NULL,
    EskiNumara              nvarchar(20)  COLLATE Latin1_General_100_BIN2 NULL,
    GecerlilikBaslangici    datetime2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    GecerlilikBitisi        datetime2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (GecerlilikBaslangici, GecerlilikBitisi),
    CONSTRAINT PK_katalog_Urun PRIMARY KEY CLUSTERED (MarkaKodu, Kod),
    CONSTRAINT FK_katalog_Urun_katalog_Marka FOREIGN KEY (MarkaKodu)
        REFERENCES katalog.Marka (Kod),
    CONSTRAINT FK_katalog_Urun_katalog_Kategori FOREIGN KEY (KategoriKodu)
        REFERENCES katalog.Kategori (Kod),
    CONSTRAINT FK_katalog_Urun_katalog_BakimSablonu FOREIGN KEY (BakimSablonuKodu)
        REFERENCES katalog.BakimSablonu (Kod),
    CONSTRAINT CK_katalog_Urun_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^a-z0-9-]%'),
    CONSTRAINT CK_katalog_Urun_SeriOneki CHECK (
        SeriOneki IS NULL OR (LEN(SeriOneki) >= 1 AND SeriOneki NOT LIKE N'%[^A-Z0-9]%')),
    CONSTRAINT CK_katalog_Urun_VitrinSirasi CHECK (VitrinSirasi IS NULL OR VitrinSirasi >= 1)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = gecmis.katalog_Urun, DATA_CONSISTENCY_CHECK = ON));
GO

CREATE INDEX IX_katalog_Urun_KategoriKodu ON katalog.Urun (KategoriKodu);
CREATE INDEX IX_katalog_Urun_BakimSablonuKodu ON katalog.Urun (BakimSablonuKodu);
CREATE INDEX IX_katalog_Urun_MarkaKoduSeriOneki ON katalog.Urun (MarkaKodu, SeriOneki)
    WHERE SeriOneki IS NOT NULL;
CREATE INDEX IX_katalog_Urun_EskiNumara ON katalog.Urun (EskiNumara)
    WHERE EskiNumara IS NOT NULL;
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun',
    @Metin = N'Makine modelleri (Orkinos 1270, Diamond Dikey). Katalog, makine ekleme, talep ve kılavuz ekranları ürünü buradan okur. İngilizce metinleri katalog.UrunCevirisi tablosundadır. Satır silinmez: markanın kaynağında artık olmayan ürün Aktif = 0 olur. Değişiklik geçmişi gecmis.katalog_Urun tablosundadır. Tohumla gelir (kaynak: src/marka/katalog/products.js, src/marka/icerik/kilavuzEslesme.js, src/marka/icerik/teknikOzellikler.js); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun', @Alt = N'MarkaKodu',
    @Metin = N'Ürünün markası (katalog.Marka).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun', @Alt = N'Kod',
    @Metin = N'Ürünün markası içindeki kodu; küçük harf, rakam ve tire (orkinos-1270). Aynı kod başka markada da olabilir, bu yüzden ürün MarkaKodu + Kod ile seçilir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun', @Alt = N'Ad',
    @Metin = N'Ürünün ekranda görünen adı (Orkinos 1270).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun', @Alt = N'Slogan',
    @Metin = N'Adın altında görünen kısa tanım (Prizmatik büyük balya makinesi). Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun', @Alt = N'Aciklama',
    @Metin = N'Ürün sayfasındaki tanıtım yazısı. Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun', @Alt = N'SeriOneki',
    @Metin = N'Seri numarasının başındaki model kodu, büyük harf ve rakam (ORK1270). Müşteri etiketteki seri numarasını yazınca ürün bu önekten bulunur. Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun', @Alt = N'SeriOnekiDogrulandi',
    @Metin = N'1: seri öneki PAKSAN''ın gerçek etiketlerinden doğrulandı. 0: henüz tahmin (varsayılan).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun', @Alt = N'VitrinSirasi',
    @Metin = N'Ana ekranın vitrininde gösterilme sırası (1 en önde). Boşsa vitrinde yoktur.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun', @Alt = N'KilavuzUrl',
    @Metin = N'Kullanım kılavuzu PDF''inin adresi. Boşsa kılavuz adresi henüz yok.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun', @Alt = N'TeknikKaynakUrl',
    @Metin = N'Teknik özelliklerin alındığı sayfanın adresi (markanın sitesindeki ürün sayfası).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun', @Alt = N'KategoriKodu',
    @Metin = N'Ürünün kategorisi (katalog.Kategori). Makine ailesi kategoriden gelir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun', @Alt = N'BakimSablonuKodu',
    @Metin = N'Ürünün bakım adımlarının şablonu (katalog.BakimSablonu). Boşsa bakım listesi gösterilmez.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun', @Alt = N'KilavuzKapsamKodu',
    @Metin = N'Ürünün kılavuz paketindeki model kodu (MCH_ORKA_870). Destek asistanı ve kılavuz ekranı hangi kılavuzu açacağını bundan bilir. Boşsa ürünün kılavuzu pakette yok.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun', @Alt = N'Aktif',
    @Metin = N'1: ürün uygulamalarda görünür. 0: artık satılmıyor ya da kaynaktan kalktı (satır silinmez; eski makineler ürünü görmeye devam eder).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun', @Alt = N'EskiKayitNo',
    @Metin = N'Ürünün eski sistemdeki kimliği (varsa). Yalnız taşıma ve arama içindir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun', @Alt = N'EskiNumara',
    @Metin = N'Ürünün eski sistemdeki numarası (varsa). Yalnız taşıma ve arama içindir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun', @Alt = N'GecerlilikBaslangici',
    @Metin = N'Satırın bu hâlinin geçerli olmaya başladığı an (UTC). SQL Server kendisi yazar; gizli kolondur, SELECT * ile görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Urun', @Alt = N'GecerlilikBitisi',
    @Metin = N'Satırın bu hâlinin geçerliliğinin bittiği an (UTC). Güncel satırda 9999-12-31. SQL Server kendisi yazar; gizli kolondur.';
GO

/* ============================================= katalog.UrunCevirisi */

CREATE TABLE katalog.UrunCevirisi (
    MarkaKodu   nvarchar(20)  COLLATE Latin1_General_100_BIN2  NOT NULL,
    UrunKodu    nvarchar(60)  COLLATE Latin1_General_100_BIN2  NOT NULL,
    DilKodu     nvarchar(5)   COLLATE Latin1_General_100_BIN2  NOT NULL,
    Ad          nvarchar(100) COLLATE Latin1_General_100_CI_AS NULL,
    Slogan      nvarchar(200) COLLATE Latin1_General_100_CI_AS NULL,
    Aciklama    nvarchar(max) COLLATE Latin1_General_100_CI_AS NULL,
    CONSTRAINT PK_katalog_UrunCevirisi PRIMARY KEY CLUSTERED (MarkaKodu, UrunKodu, DilKodu),
    CONSTRAINT FK_katalog_UrunCevirisi_katalog_Urun FOREIGN KEY (MarkaKodu, UrunKodu)
        REFERENCES katalog.Urun (MarkaKodu, Kod),
    CONSTRAINT FK_katalog_UrunCevirisi_kod_Dil FOREIGN KEY (DilKodu)
        REFERENCES kod.Dil (Kod),
    CONSTRAINT CK_katalog_UrunCevirisi_DilKodu CHECK (DilKodu <> N'tr'),
    CONSTRAINT CK_katalog_UrunCevirisi_Dolu CHECK (
        Ad IS NOT NULL OR Slogan IS NOT NULL OR Aciklama IS NOT NULL)
);
GO

CREATE INDEX IX_katalog_UrunCevirisi_DilKodu ON katalog.UrunCevirisi (DilKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunCevirisi',
    @Metin = N'Ürün metinlerinin Türkçe dışındaki dillerdeki karşılığı; ürün ve dil başına bir satır. Boş kolon o metnin çevirisi olmadığı anlamına gelir; ekran Türkçesini gösterir. Türkçe metin katalog.Urun satırındadır, burada tr satırı olmaz. Tohumla gelir (kaynak: src/marka/katalog/products.en.js URUN_EN, DESC_EN); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunCevirisi', @Alt = N'MarkaKodu',
    @Metin = N'Çevrilen ürünün markası (katalog.Urun ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunCevirisi', @Alt = N'UrunKodu',
    @Metin = N'Çevrilen ürünün kodu (katalog.Urun ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunCevirisi', @Alt = N'DilKodu',
    @Metin = N'Çevirinin dili (en; kod.Dil). tr olamaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunCevirisi', @Alt = N'Ad',
    @Metin = N'Ürün adının bu dildeki yazımı. Boşsa Türkçe ad kullanılır.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunCevirisi', @Alt = N'Slogan',
    @Metin = N'Kısa tanımın bu dildeki karşılığı. Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunCevirisi', @Alt = N'Aciklama',
    @Metin = N'Tanıtım yazısının bu dildeki karşılığı. Boş olabilir.';
GO

/* ============================================= katalog.UrunVaryanti */

CREATE TABLE katalog.UrunVaryanti (
    MarkaKodu   nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UrunKodu    nvarchar(60) COLLATE Latin1_General_100_BIN2 NOT NULL,
    Kod         nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    Ad          nvarchar(60) COLLATE Turkish_100_CI_AS       NOT NULL,
    Sira        smallint NOT NULL CONSTRAINT DF_katalog_UrunVaryanti_Sira DEFAULT 0,
    Aktif       bit NOT NULL CONSTRAINT DF_katalog_UrunVaryanti_Aktif DEFAULT 1,
    CONSTRAINT PK_katalog_UrunVaryanti PRIMARY KEY CLUSTERED (MarkaKodu, UrunKodu, Kod),
    CONSTRAINT FK_katalog_UrunVaryanti_katalog_Urun FOREIGN KEY (MarkaKodu, UrunKodu)
        REFERENCES katalog.Urun (MarkaKodu, Kod),
    CONSTRAINT CK_katalog_UrunVaryanti_Kod CHECK (LEN(Kod) >= 1)
);
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVaryanti',
    @Metin = N'Bir ürünün seçenekleri (Diamond Dikey: 4 m³, 6 m³, 8 m³). Makine kaydında ve parça-model eşleşmesinde kullanılır. Satır silinmez: kaynakta artık olmayan varyant Aktif = 0 olur. Tohumla gelir (kaynak: src/marka/katalog/products.js variants, src/marka/icerik/teknikOzellikler.js varyantlar); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVaryanti', @Alt = N'MarkaKodu',
    @Metin = N'Ürünün markası (katalog.Urun ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVaryanti', @Alt = N'UrunKodu',
    @Metin = N'Varyantın ait olduğu ürün (katalog.Urun ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVaryanti', @Alt = N'Kod',
    @Metin = N'Varyantın ürün içindeki kodu. Öteki tablolar VaryantKodu ile bağlanır.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVaryanti', @Alt = N'Ad',
    @Metin = N'Varyantın ekranda görünen adı (6 m³).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVaryanti', @Alt = N'Sira',
    @Metin = N'Ürün içindeki gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVaryanti', @Alt = N'Aktif',
    @Metin = N'1: seçilebilir. 0: artık kullanılmıyor (satır silinmez).';
GO

/* ====================================== katalog.UrunVaryantiCevirisi

   Varyant adının Türkçe dışındaki dillerdeki yazımı (Connect İngilizce
   ekranı: TEKNIK_VARYANT_EN, '2 İPLİ' → '2 TWINE'). Anahtar bileşik
   olduğu için kod.Ceviri kullanılamaz; kalıp öteki …Cevirisi tablolarıyla
   aynı (Bölüm 1.15.3 "Uygulamada değişti").
   ==================================================================== */

CREATE TABLE katalog.UrunVaryantiCevirisi (
    MarkaKodu   nvarchar(20) COLLATE Latin1_General_100_BIN2  NOT NULL,
    UrunKodu    nvarchar(60) COLLATE Latin1_General_100_BIN2  NOT NULL,
    VaryantKodu nvarchar(40) COLLATE Latin1_General_100_BIN2  NOT NULL,
    DilKodu     nvarchar(5)  COLLATE Latin1_General_100_BIN2  NOT NULL,
    Ad          nvarchar(60) COLLATE Latin1_General_100_CI_AS NOT NULL,
    CONSTRAINT PK_katalog_UrunVaryantiCevirisi PRIMARY KEY CLUSTERED (MarkaKodu, UrunKodu, VaryantKodu, DilKodu),
    CONSTRAINT FK_katalog_UrunVaryantiCevirisi_katalog_UrunVaryanti FOREIGN KEY (MarkaKodu, UrunKodu, VaryantKodu)
        REFERENCES katalog.UrunVaryanti (MarkaKodu, UrunKodu, Kod),
    CONSTRAINT FK_katalog_UrunVaryantiCevirisi_kod_Dil FOREIGN KEY (DilKodu)
        REFERENCES kod.Dil (Kod),
    CONSTRAINT CK_katalog_UrunVaryantiCevirisi_DilKodu CHECK (DilKodu <> N'tr'),
    CONSTRAINT CK_katalog_UrunVaryantiCevirisi_Ad CHECK (LEN(LTRIM(Ad)) > 0)
);
GO

CREATE INDEX IX_katalog_UrunVaryantiCevirisi_DilKodu ON katalog.UrunVaryantiCevirisi (DilKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVaryantiCevirisi',
    @Metin = N'Ürün varyantı adlarının Türkçe dışındaki dillerdeki yazımı (2 İPLİ → 2 TWINE); varyant ve dil başına bir satır. Türkçe ad katalog.UrunVaryanti satırındadır, burada tr satırı olmaz. Tohumla gelir (kaynak: src/marka/icerik/teknikSozluk.js TEKNIK_VARYANT_EN); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVaryantiCevirisi', @Alt = N'MarkaKodu',
    @Metin = N'Çevrilen varyantın markası (katalog.UrunVaryanti ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVaryantiCevirisi', @Alt = N'UrunKodu',
    @Metin = N'Çevrilen varyantın ürünü (katalog.UrunVaryanti ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVaryantiCevirisi', @Alt = N'VaryantKodu',
    @Metin = N'Çevrilen varyantın kodu (katalog.UrunVaryanti ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVaryantiCevirisi', @Alt = N'DilKodu',
    @Metin = N'Çevirinin dili (en; kod.Dil). tr olamaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVaryantiCevirisi', @Alt = N'Ad',
    @Metin = N'Varyant adının bu dildeki yazımı (2 TWINE).';
GO

/* ============================================= katalog.UrunOzelligi */

CREATE TABLE katalog.UrunOzelligi (
    MarkaKodu   nvarchar(20)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    UrunKodu    nvarchar(60)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    SiraNo      smallint NOT NULL,
    Etiket      nvarchar(150) COLLATE Turkish_100_CI_AS       NOT NULL,
    Deger       nvarchar(300) COLLATE Turkish_100_CI_AS       NOT NULL,
    Aktif       bit NOT NULL CONSTRAINT DF_katalog_UrunOzelligi_Aktif DEFAULT 1,
    CONSTRAINT PK_katalog_UrunOzelligi PRIMARY KEY CLUSTERED (MarkaKodu, UrunKodu, SiraNo),
    CONSTRAINT FK_katalog_UrunOzelligi_katalog_Urun FOREIGN KEY (MarkaKodu, UrunKodu)
        REFERENCES katalog.Urun (MarkaKodu, Kod),
    CONSTRAINT CK_katalog_UrunOzelligi_SiraNo CHECK (SiraNo >= 1)
);
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunOzelligi',
    @Metin = N'Ürün sayfasındaki kısa özellik satırları (Balya ölçüsü: 120 x 70 cm). İngilizcesi katalog.UrunOzelligiCevirisi tablosundadır. Satır silinmez, Aktif = 0 yapılır. Tohumla gelir (kaynak: src/marka/katalog/products.js specs); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunOzelligi', @Alt = N'MarkaKodu',
    @Metin = N'Ürünün markası (katalog.Urun ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunOzelligi', @Alt = N'UrunKodu',
    @Metin = N'Özelliğin ait olduğu ürün (katalog.Urun ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunOzelligi', @Alt = N'SiraNo',
    @Metin = N'Özelliğin ürün sayfasındaki sırası (1, 2, 3…).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunOzelligi', @Alt = N'Etiket',
    @Metin = N'Özelliğin Türkçe adı (Balya ölçüsü).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunOzelligi', @Alt = N'Deger',
    @Metin = N'Özelliğin değeri, birimiyle birlikte metin olarak (120 x 70 cm).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunOzelligi', @Alt = N'Aktif',
    @Metin = N'1: gösterilir. 0: artık kullanılmıyor (satır silinmez).';
GO

/* ===================================== katalog.UrunOzelligiCevirisi */

CREATE TABLE katalog.UrunOzelligiCevirisi (
    MarkaKodu   nvarchar(20)  COLLATE Latin1_General_100_BIN2  NOT NULL,
    UrunKodu    nvarchar(60)  COLLATE Latin1_General_100_BIN2  NOT NULL,
    SiraNo      smallint NOT NULL,
    DilKodu     nvarchar(5)   COLLATE Latin1_General_100_BIN2  NOT NULL,
    Etiket      nvarchar(150) COLLATE Latin1_General_100_CI_AS NOT NULL,
    Deger       nvarchar(300) COLLATE Latin1_General_100_CI_AS NULL,
    CONSTRAINT PK_katalog_UrunOzelligiCevirisi PRIMARY KEY CLUSTERED (MarkaKodu, UrunKodu, SiraNo, DilKodu),
    CONSTRAINT FK_katalog_UrunOzelligiCevirisi_katalog_UrunOzelligi FOREIGN KEY (MarkaKodu, UrunKodu, SiraNo)
        REFERENCES katalog.UrunOzelligi (MarkaKodu, UrunKodu, SiraNo),
    CONSTRAINT FK_katalog_UrunOzelligiCevirisi_kod_Dil FOREIGN KEY (DilKodu)
        REFERENCES kod.Dil (Kod),
    CONSTRAINT CK_katalog_UrunOzelligiCevirisi_DilKodu CHECK (DilKodu <> N'tr')
);
GO

CREATE INDEX IX_katalog_UrunOzelligiCevirisi_DilKodu ON katalog.UrunOzelligiCevirisi (DilKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunOzelligiCevirisi',
    @Metin = N'Ürün özellik satırlarının Türkçe dışındaki dillerdeki karşılığı; özellik ve dil başına bir satır. Türkçe metin katalog.UrunOzelligi satırındadır, burada tr satırı olmaz. Tohumla gelir (kaynak: src/marka/katalog/products.en.js SPEC_EN, SPEC_DEGER_EN); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunOzelligiCevirisi', @Alt = N'MarkaKodu',
    @Metin = N'Ürünün markası (katalog.UrunOzelligi ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunOzelligiCevirisi', @Alt = N'UrunKodu',
    @Metin = N'Ürünün kodu (katalog.UrunOzelligi ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunOzelligiCevirisi', @Alt = N'SiraNo',
    @Metin = N'Çevrilen özellik satırının sırası (katalog.UrunOzelligi ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunOzelligiCevirisi', @Alt = N'DilKodu',
    @Metin = N'Çevirinin dili (en; kod.Dil). tr olamaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunOzelligiCevirisi', @Alt = N'Etiket',
    @Metin = N'Özellik adının bu dildeki karşılığı.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunOzelligiCevirisi', @Alt = N'Deger',
    @Metin = N'Değerin bu dildeki yazımı. Boşsa Türkçe değer gösterilir (sayı ve birimde çoğu zaman aynıdır).';
GO

/* ============================================== katalog.UrunVideosu */

CREATE TABLE katalog.UrunVideosu (
    MarkaKodu   nvarchar(20)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    UrunKodu    nvarchar(60)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    SiraNo      smallint NOT NULL,
    Baslik      nvarchar(200) COLLATE Turkish_100_CI_AS       NOT NULL,
    SureSaniye  int NULL,
    Url         nvarchar(400) COLLATE Latin1_General_100_BIN2 NULL,
    DosyaYolu   nvarchar(260) COLLATE Latin1_General_100_BIN2 NULL,
    TurKodu     nvarchar(20)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    Aktif       bit NOT NULL CONSTRAINT DF_katalog_UrunVideosu_Aktif DEFAULT 1,
    CONSTRAINT PK_katalog_UrunVideosu PRIMARY KEY CLUSTERED (MarkaKodu, UrunKodu, SiraNo),
    CONSTRAINT FK_katalog_UrunVideosu_katalog_Urun FOREIGN KEY (MarkaKodu, UrunKodu)
        REFERENCES katalog.Urun (MarkaKodu, Kod),
    CONSTRAINT CK_katalog_UrunVideosu_SiraNo CHECK (SiraNo >= 1),
    CONSTRAINT CK_katalog_UrunVideosu_TurKodu CHECK (TurKodu IN (N'tanitim', N'kullanim')),
    CONSTRAINT CK_katalog_UrunVideosu_SureSaniye CHECK (SureSaniye IS NULL OR SureSaniye >= 0)
);
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVideosu',
    @Metin = N'Ürün sayfasındaki videolar (tanıtım ve kullanım). Video ya internet adresinden (Url) ya uygulamanın içindeki dosyadan (DosyaYolu) oynatılır; ikisi de boşsa video henüz yok. İngilizce başlıkları katalog.UrunVideosuCevirisi tablosundadır. Satır silinmez, Aktif = 0 yapılır. Tohumla gelir (kaynak: src/marka/katalog/products.js videos); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVideosu', @Alt = N'MarkaKodu',
    @Metin = N'Ürünün markası (katalog.Urun ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVideosu', @Alt = N'UrunKodu',
    @Metin = N'Videonun ait olduğu ürün (katalog.Urun ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVideosu', @Alt = N'SiraNo',
    @Metin = N'Videonun ürün sayfasındaki sırası (1, 2, 3…).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVideosu', @Alt = N'Baslik',
    @Metin = N'Videonun Türkçe başlığı (Düğüm atıcı ayarı).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVideosu', @Alt = N'SureSaniye',
    @Metin = N'Videonun süresi, saniye olarak (6:40 → 400). Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVideosu', @Alt = N'Url',
    @Metin = N'Videonun internet adresi (ör. YouTube). Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVideosu', @Alt = N'DosyaYolu',
    @Metin = N'Uygulamanın içinde taşınan video dosyasının yolu; internet olmadan oynatılır. Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVideosu', @Alt = N'TurKodu',
    @Metin = N'Videonun türü: tanitim (ürün tanıtımı) ya da kullanim (kullanım ve bakım anlatımı).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVideosu', @Alt = N'Aktif',
    @Metin = N'1: gösterilir. 0: artık kullanılmıyor (satır silinmez).';
GO

/* ====================================== katalog.UrunVideosuCevirisi */

CREATE TABLE katalog.UrunVideosuCevirisi (
    MarkaKodu   nvarchar(20)  COLLATE Latin1_General_100_BIN2  NOT NULL,
    UrunKodu    nvarchar(60)  COLLATE Latin1_General_100_BIN2  NOT NULL,
    SiraNo      smallint NOT NULL,
    DilKodu     nvarchar(5)   COLLATE Latin1_General_100_BIN2  NOT NULL,
    Baslik      nvarchar(200) COLLATE Latin1_General_100_CI_AS NOT NULL,
    CONSTRAINT PK_katalog_UrunVideosuCevirisi PRIMARY KEY CLUSTERED (MarkaKodu, UrunKodu, SiraNo, DilKodu),
    CONSTRAINT FK_katalog_UrunVideosuCevirisi_katalog_UrunVideosu FOREIGN KEY (MarkaKodu, UrunKodu, SiraNo)
        REFERENCES katalog.UrunVideosu (MarkaKodu, UrunKodu, SiraNo),
    CONSTRAINT FK_katalog_UrunVideosuCevirisi_kod_Dil FOREIGN KEY (DilKodu)
        REFERENCES kod.Dil (Kod),
    CONSTRAINT CK_katalog_UrunVideosuCevirisi_DilKodu CHECK (DilKodu <> N'tr')
);
GO

CREATE INDEX IX_katalog_UrunVideosuCevirisi_DilKodu ON katalog.UrunVideosuCevirisi (DilKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVideosuCevirisi',
    @Metin = N'Ürün videosu başlıklarının Türkçe dışındaki dillerdeki karşılığı; video ve dil başına bir satır. Türkçe başlık katalog.UrunVideosu satırındadır, burada tr satırı olmaz. Tohumla gelir (kaynak: src/marka/katalog/products.en.js VIDEO_EN); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVideosuCevirisi', @Alt = N'MarkaKodu',
    @Metin = N'Ürünün markası (katalog.UrunVideosu ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVideosuCevirisi', @Alt = N'UrunKodu',
    @Metin = N'Ürünün kodu (katalog.UrunVideosu ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVideosuCevirisi', @Alt = N'SiraNo',
    @Metin = N'Çevrilen videonun sırası (katalog.UrunVideosu ile birlikte).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVideosuCevirisi', @Alt = N'DilKodu',
    @Metin = N'Çevirinin dili (en; kod.Dil). tr olamaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'UrunVideosuCevirisi', @Alt = N'Baslik',
    @Metin = N'Video başlığının bu dildeki karşılığı.';
GO

/* =============================================== katalog.ParcaGrubu */

CREATE TABLE katalog.ParcaGrubu (
    MarkaKodu           nvarchar(20)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    Kod                 nvarchar(60)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    Ad                  nvarchar(100) COLLATE Turkish_100_CI_AS       NOT NULL,
    Sira                smallint NOT NULL CONSTRAINT DF_katalog_ParcaGrubu_Sira DEFAULT 0,
    DestekAilesiKodu    nvarchar(40)  COLLATE Latin1_General_100_BIN2 NULL,
    Aktif               bit NOT NULL CONSTRAINT DF_katalog_ParcaGrubu_Aktif DEFAULT 1,
    CONSTRAINT PK_katalog_ParcaGrubu PRIMARY KEY CLUSTERED (MarkaKodu, Kod),
    CONSTRAINT FK_katalog_ParcaGrubu_katalog_Marka FOREIGN KEY (MarkaKodu)
        REFERENCES katalog.Marka (Kod),
    CONSTRAINT FK_katalog_ParcaGrubu_kod_DestekAilesi FOREIGN KEY (DestekAilesiKodu)
        REFERENCES kod.DestekAilesi (Kod),
    CONSTRAINT CK_katalog_ParcaGrubu_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^a-z0-9-]%')
);
GO

CREATE INDEX IX_katalog_ParcaGrubu_DestekAilesiKodu ON katalog.ParcaGrubu (DestekAilesiKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'ParcaGrubu',
    @Metin = N'Yedek parça grupları: fiyat listesindeki alt montaj başlıkları (BAĞLAMA GRUBU, VOLAN). Müşteri parçayı makinesine göre ararken grup, makine ailesi üzerinden seçilir. Satır silinmez, Aktif = 0 yapılır. Tohumla gelir (kaynak: fiyat listesi arşivi ve src/marka/katalog/parcaGruplari.js); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'ParcaGrubu', @Alt = N'MarkaKodu',
    @Metin = N'Grubun markası (katalog.Marka).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'ParcaGrubu', @Alt = N'Kod',
    @Metin = N'Grubun marka içindeki kodu; küçük harf, rakam ve tire (baglama-grubu). Parçalar bu kodla bağlanır (GrupKodu).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'ParcaGrubu', @Alt = N'Ad',
    @Metin = N'Grubun fiyat listesinde yazdığı ad (BAĞLAMA GRUBU).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'ParcaGrubu', @Alt = N'Sira',
    @Metin = N'Parça ekranındaki gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'ParcaGrubu', @Alt = N'DestekAilesiKodu',
    @Metin = N'Grubun ait olduğu makine ailesi (balya, yem…; kod.DestekAilesi). Fiyat listesi bu bilgiyi vermez; PAKSAN''ın grup adlarından eşlenir. Boşsa grup hiçbir aileye bağlanmamıştır ve yalnız katalog aramasında bulunur.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'ParcaGrubu', @Alt = N'Aktif',
    @Metin = N'1: gösterilir. 0: artık kullanılmıyor (satır silinmez).';
GO

/* ============================================= katalog.FiyatListesi */

CREATE TABLE katalog.FiyatListesi (
    MarkaKodu                   nvarchar(20)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    Kod                         nvarchar(20)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    KaynakDosyaAdi              nvarchar(260) COLLATE Latin1_General_100_BIN2 NOT NULL,
    KaynakOzeti                 binary(32) NOT NULL,
    KaynakSurumNo               int NULL,
    ListeKdvHaric               bit NOT NULL,
    KdvEsasiDogrulandi          bit NOT NULL CONSTRAINT DF_katalog_FiyatListesi_KdvEsasiDogrulandi DEFAULT 0,
    YururlukBaslangicTarihi     date NULL,
    ParaBirimiKodu              nvarchar(3)   COLLATE Latin1_General_100_BIN2 NOT NULL,
    DurumKodu                   nvarchar(20)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    OlusmaZamani                datetime2(3) NOT NULL
                                    CONSTRAINT DF_katalog_FiyatListesi_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_katalog_FiyatListesi PRIMARY KEY CLUSTERED (MarkaKodu, Kod),
    CONSTRAINT UQ_katalog_FiyatListesi_MarkaKoduKodParaBirimiKodu UNIQUE (MarkaKodu, Kod, ParaBirimiKodu),
    CONSTRAINT FK_katalog_FiyatListesi_katalog_Marka FOREIGN KEY (MarkaKodu)
        REFERENCES katalog.Marka (Kod),
    CONSTRAINT FK_katalog_FiyatListesi_kod_ParaBirimi FOREIGN KEY (ParaBirimiKodu)
        REFERENCES kod.ParaBirimi (Kod),
    CONSTRAINT CK_katalog_FiyatListesi_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^a-z0-9-]%'),
    CONSTRAINT CK_katalog_FiyatListesi_KaynakSurumNo CHECK (KaynakSurumNo IS NULL OR KaynakSurumNo >= 0),
    CONSTRAINT CK_katalog_FiyatListesi_DurumKodu CHECK (DurumKodu IN (N'taslak', N'yururlukte', N'arsiv'))
);
GO

CREATE UNIQUE INDEX UX_katalog_FiyatListesi_Yururlukte ON katalog.FiyatListesi (MarkaKodu)
    WHERE DurumKodu = N'yururlukte';
CREATE INDEX IX_katalog_FiyatListesi_ParaBirimiKodu ON katalog.FiyatListesi (ParaBirimiKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'FiyatListesi',
    @Metin = N'Yedek parça fiyat listeleri; her liste bir kez yazılır ve değişmez. Markada en çok bir liste yürürlüktedir; yeni liste gelince eskisi arşive geçer, silinmez. Talepler hangi listeden fiyat aldıklarını FiyatListesiKodu ile taşır. SSMS''ten yüklenmez: yeni liste depodaki arşive eklenir ve tohumla gelir (tasarim.md 3.6, satır 16; kaynak: tohum/kaynak/fiyat-listeleri.json); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'FiyatListesi', @Alt = N'MarkaKodu',
    @Metin = N'Listenin markası (katalog.Marka).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'FiyatListesi', @Alt = N'Kod',
    @Metin = N'Listenin marka içindeki kodu; küçük harf, rakam ve tire (2026-07-1). Bir kez verilir; aynı koda farklı içerik yazılamaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'FiyatListesi', @Alt = N'KaynakDosyaAdi',
    @Metin = N'Listenin alındığı dosyanın adı (PAKSAN TEMMUZ 2026 FİYAT LİSTESİ.pdf).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'FiyatListesi', @Alt = N'KaynakOzeti',
    @Metin = N'Depodaki arşiv dosyasının SHA-256 özeti. Aynı liste koduna farklı içerik gelmesini engellemek için tutulur.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'FiyatListesi', @Alt = N'KaynakSurumNo',
    @Metin = N'Arşiv dosyasının kendi sürüm numarası (katalog.json içindeki surum). Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'FiyatListesi', @Alt = N'ListeKdvHaric',
    @Metin = N'1: listedeki fiyatlar KDV hariçtir, talepte KDV ayrıca eklenir. 0: fiyatlar KDV dahildir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'FiyatListesi', @Alt = N'KdvEsasiDogrulandi',
    @Metin = N'1: listenin KDV dahil/hariç olduğu PAKSAN''dan doğrulandı. 0: henüz varsayım (varsayılan).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'FiyatListesi', @Alt = N'YururlukBaslangicTarihi',
    @Metin = N'Listenin yürürlüğe girdiği gün (Türkiye takvim günü). Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'FiyatListesi', @Alt = N'ParaBirimiKodu',
    @Metin = N'Listedeki bütün fiyatların para birimi (TRY; kod.ParaBirimi).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'FiyatListesi', @Alt = N'DurumKodu',
    @Metin = N'Listenin durumu: taslak (henüz kullanılmıyor), yururlukte (bugün geçerli; markada en çok bir tane), arsiv (eski liste; geçmiş talepler için saklanır).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'FiyatListesi', @Alt = N'OlusmaZamani',
    @Metin = N'Listenin veritabanına eklendiği an (UTC).';
GO

/* ==================================================== katalog.Parca */

CREATE TABLE katalog.Parca (
    MarkaKodu               nvarchar(20)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    Kod                     nvarchar(24)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    Ad                      nvarchar(100) COLLATE Turkish_100_CI_AS       NOT NULL,
    GorselVar               bit NOT NULL CONSTRAINT DF_katalog_Parca_GorselVar DEFAULT 0,
    GrupKodu                nvarchar(60)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    IlkFiyatListesiKodu     nvarchar(20)  COLLATE Latin1_General_100_BIN2 NULL,
    SonFiyatListesiKodu     nvarchar(20)  COLLATE Latin1_General_100_BIN2 NULL,
    Aktif                   bit NOT NULL CONSTRAINT DF_katalog_Parca_Aktif DEFAULT 1,
    GecerlilikBaslangici    datetime2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    GecerlilikBitisi        datetime2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (GecerlilikBaslangici, GecerlilikBitisi),
    CONSTRAINT PK_katalog_Parca PRIMARY KEY CLUSTERED (MarkaKodu, Kod),
    CONSTRAINT FK_katalog_Parca_katalog_Marka FOREIGN KEY (MarkaKodu)
        REFERENCES katalog.Marka (Kod),
    CONSTRAINT FK_katalog_Parca_katalog_ParcaGrubu FOREIGN KEY (MarkaKodu, GrupKodu)
        REFERENCES katalog.ParcaGrubu (MarkaKodu, Kod),
    CONSTRAINT FK_katalog_Parca_katalog_FiyatListesi_Ilk FOREIGN KEY (MarkaKodu, IlkFiyatListesiKodu)
        REFERENCES katalog.FiyatListesi (MarkaKodu, Kod),
    CONSTRAINT FK_katalog_Parca_katalog_FiyatListesi_Son FOREIGN KEY (MarkaKodu, SonFiyatListesiKodu)
        REFERENCES katalog.FiyatListesi (MarkaKodu, Kod),
    CONSTRAINT CK_katalog_Parca_Kod CHECK (
        LEN(Kod) BETWEEN 3 AND 24 AND Kod NOT LIKE N'%[^A-Z0-9.]%'),
    CONSTRAINT CK_katalog_Parca_FiyatListesi CHECK (
        (IlkFiyatListesiKodu IS NULL AND SonFiyatListesiKodu IS NULL)
        OR (IlkFiyatListesiKodu IS NOT NULL AND SonFiyatListesiKodu IS NOT NULL))
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = gecmis.katalog_Parca, DATA_CONSISTENCY_CHECK = ON));
GO

CREATE INDEX IX_katalog_Parca_MarkaKoduGrupKodu ON katalog.Parca (MarkaKodu, GrupKodu);
CREATE INDEX IX_katalog_Parca_MarkaKoduIlkFiyatListesiKodu ON katalog.Parca (MarkaKodu, IlkFiyatListesiKodu);
CREATE INDEX IX_katalog_Parca_MarkaKoduSonFiyatListesiKodu ON katalog.Parca (MarkaKodu, SonFiyatListesiKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Parca',
    @Metin = N'Yedek parçalar: markanın arşivdeki bütün fiyat listelerinde geçen parçaların birleşimi. Aktif = 1 yalnız markanın yürürlükteki listesinde bulunan parçadadır; öteki parçalar Aktif = 0 olur ama silinmez (eski talepler onlara bakar). Fiyat bu tabloda değil, katalog.FiyatListesiSatiri tablosundadır. Değişiklik geçmişi gecmis.katalog_Parca tablosundadır. Tohumla gelir (kaynak: tohum/kaynak/fiyat-listeleri/<MarkaKodu>/<ListeKodu>.json); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Parca', @Alt = N'MarkaKodu',
    @Metin = N'Parçanın markası (katalog.Marka).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Parca', @Alt = N'Kod',
    @Metin = N'Parçanın fiyat listesindeki kodu; büyük harf, rakam ve nokta, 3–24 karakter (2013101010). Aynı kod başka markada da olabilir, bu yüzden parça MarkaKodu + Kod ile seçilir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Parca', @Alt = N'Ad',
    @Metin = N'Parçanın fiyat listesinde yazdığı ad (İPLİ BIÇAK KOLU KOMPLE). Farklı parçaların adı aynı olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Parca', @Alt = N'GorselVar',
    @Metin = N'1: parçanın fotoğrafı uygulamada var. 0: yok (varsayılan).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Parca', @Alt = N'GrupKodu',
    @Metin = N'Parçanın fiyat listesindeki grubu (katalog.ParcaGrubu, aynı markada).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Parca', @Alt = N'IlkFiyatListesiKodu',
    @Metin = N'Parçanın ilk göründüğü fiyat listesi (katalog.FiyatListesi). Tohum hesaplar.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Parca', @Alt = N'SonFiyatListesiKodu',
    @Metin = N'Parçanın en son göründüğü fiyat listesi (katalog.FiyatListesi). Tohum hesaplar.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Parca', @Alt = N'Aktif',
    @Metin = N'1: parça markanın yürürlükteki fiyat listesinde var, sipariş edilebilir. 0: yürürlükteki listede yok (satır silinmez).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Parca', @Alt = N'GecerlilikBaslangici',
    @Metin = N'Satırın bu hâlinin geçerli olmaya başladığı an (UTC). SQL Server kendisi yazar; gizli kolondur, SELECT * ile görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'Parca', @Alt = N'GecerlilikBitisi',
    @Metin = N'Satırın bu hâlinin geçerliliğinin bittiği an (UTC). Güncel satırda 9999-12-31. SQL Server kendisi yazar; gizli kolondur.';
GO

/* ====================================== katalog.FiyatListesiSatiri */

CREATE TABLE katalog.FiyatListesiSatiri (
    MarkaKodu           nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    FiyatListesiKodu    nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    ParcaKodu           nvarchar(24) COLLATE Latin1_General_100_BIN2 NOT NULL,
    BirimFiyat          decimal(18,2) NOT NULL,
    ParaBirimiKodu      nvarchar(3)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    CONSTRAINT PK_katalog_FiyatListesiSatiri PRIMARY KEY CLUSTERED (MarkaKodu, FiyatListesiKodu, ParcaKodu),
    CONSTRAINT FK_katalog_FiyatListesiSatiri_katalog_FiyatListesi
        FOREIGN KEY (MarkaKodu, FiyatListesiKodu, ParaBirimiKodu)
        REFERENCES katalog.FiyatListesi (MarkaKodu, Kod, ParaBirimiKodu),
    CONSTRAINT FK_katalog_FiyatListesiSatiri_katalog_Parca FOREIGN KEY (MarkaKodu, ParcaKodu)
        REFERENCES katalog.Parca (MarkaKodu, Kod),
    CONSTRAINT CK_katalog_FiyatListesiSatiri_BirimFiyat CHECK (BirimFiyat >= 0)
);
GO

CREATE INDEX IX_katalog_FiyatListesiSatiri_MarkaKoduParcaKodu
    ON katalog.FiyatListesiSatiri (MarkaKodu, ParcaKodu);
CREATE INDEX IX_katalog_FiyatListesiSatiri_MarkaKoduFiyatListesiKoduParaBirimiKodu
    ON katalog.FiyatListesiSatiri (MarkaKodu, FiyatListesiKodu, ParaBirimiKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'FiyatListesiSatiri',
    @Metin = N'Fiyat listelerindeki parça fiyatları; liste ve parça başına bir satır. Satırlar yalnız eklenir, sonradan değişmez ve silinmez: eski listenin fiyatları geçmiş talepler için olduğu gibi kalır. Bugünkü fiyat için markanın DurumKodu = yururlukte olan listesine bakın. Tohumla gelir (kaynak: tohum/kaynak/fiyat-listeleri/<MarkaKodu>/<ListeKodu>.json); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'FiyatListesiSatiri', @Alt = N'MarkaKodu',
    @Metin = N'Listenin ve parçanın markası.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'FiyatListesiSatiri', @Alt = N'FiyatListesiKodu',
    @Metin = N'Fiyatın geçtiği liste (katalog.FiyatListesi, aynı markada).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'FiyatListesiSatiri', @Alt = N'ParcaKodu',
    @Metin = N'Fiyatı verilen parça (katalog.Parca, aynı markada).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'FiyatListesiSatiri', @Alt = N'BirimFiyat',
    @Metin = N'Parçanın bu listedeki bir adet fiyatı; para birimi ParaBirimiKodu kolonunda. KDV dahil mi hariç mi listenin ListeKdvHaric kolonunda yazar.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'FiyatListesiSatiri', @Alt = N'ParaBirimiKodu',
    @Metin = N'Fiyatın para birimi. Listenin para birimiyle aynı olmak zorundadır (veritabanı denetler).';
GO

/* =============================================== katalog.ParcaModel */

CREATE TABLE katalog.ParcaModel (
    ModelNotu   nvarchar(500) COLLATE Turkish_100_CI_AS       NULL,
    MarkaKodu   nvarchar(20)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    ParcaKodu   nvarchar(24)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    UrunKodu    nvarchar(60)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    VaryantKodu nvarchar(40)  COLLATE Latin1_General_100_BIN2 NULL,
    Aktif       bit NOT NULL CONSTRAINT DF_katalog_ParcaModel_Aktif DEFAULT 1,
    KayitNo     bigint IDENTITY(1,1) NOT NULL,
    Kimlik      uniqueidentifier NOT NULL CONSTRAINT DF_katalog_ParcaModel_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_katalog_ParcaModel PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_katalog_ParcaModel_katalog_Parca FOREIGN KEY (MarkaKodu, ParcaKodu)
        REFERENCES katalog.Parca (MarkaKodu, Kod),
    CONSTRAINT FK_katalog_ParcaModel_katalog_Urun FOREIGN KEY (MarkaKodu, UrunKodu)
        REFERENCES katalog.Urun (MarkaKodu, Kod),
    CONSTRAINT FK_katalog_ParcaModel_katalog_UrunVaryanti FOREIGN KEY (MarkaKodu, UrunKodu, VaryantKodu)
        REFERENCES katalog.UrunVaryanti (MarkaKodu, UrunKodu, Kod)
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_katalog_ParcaModel_KayitNo ON katalog.ParcaModel (KayitNo);
CREATE UNIQUE INDEX UX_katalog_ParcaModel_Varyantli
    ON katalog.ParcaModel (MarkaKodu, ParcaKodu, UrunKodu, VaryantKodu)
    WHERE VaryantKodu IS NOT NULL;
CREATE UNIQUE INDEX UX_katalog_ParcaModel_Varyantsiz
    ON katalog.ParcaModel (MarkaKodu, ParcaKodu, UrunKodu)
    WHERE VaryantKodu IS NULL;
CREATE INDEX IX_katalog_ParcaModel_MarkaKoduParcaKodu
    ON katalog.ParcaModel (MarkaKodu, ParcaKodu);
CREATE INDEX IX_katalog_ParcaModel_MarkaKoduUrunKoduVaryantKodu
    ON katalog.ParcaModel (MarkaKodu, UrunKodu, VaryantKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'ParcaModel',
    @Metin = N'Hangi parçanın hangi makine modeline (ve varyantına) uyduğu. Fiyat listesi bu bilgiyi vermediği için bugün boştur; PAKSAN parça-model listesini verince tohumla dolar. Varyant boşsa parça ürünün bütün varyantlarına uyar. Satır silinmez, Aktif = 0 yapılır; uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'ParcaModel', @Alt = N'ModelNotu',
    @Metin = N'Eşleşmeyle ilgili not (ör. hangi seri numarasından sonra geçerli olduğu). Boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'ParcaModel', @Alt = N'MarkaKodu',
    @Metin = N'Parçanın ve ürünün markası.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'ParcaModel', @Alt = N'ParcaKodu',
    @Metin = N'Uyan parça (katalog.Parca, aynı markada).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'ParcaModel', @Alt = N'UrunKodu',
    @Metin = N'Parçanın uyduğu makine modeli (katalog.Urun, aynı markada).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'ParcaModel', @Alt = N'VaryantKodu',
    @Metin = N'Parçanın yalnız belirli bir varyantta uyduğu durumda o varyant (katalog.UrunVaryanti). Boşsa ürünün bütün varyantlarına uyar.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'ParcaModel', @Alt = N'Aktif',
    @Metin = N'1: eşleşme geçerli. 0: artık kullanılmıyor (satır silinmez).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'ParcaModel', @Alt = N'KayitNo',
    @Metin = N'SSMS''te satırı seçmek için sıra numarası. İş anlamı yoktur; ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'ParcaModel', @Alt = N'Kimlik',
    @Metin = N'Satırın teknik anahtarı (GUID). Ekranda görünmez.';
GO

/* ============================================== kod.BelirtiKapsami */

CREATE TABLE kod.BelirtiKapsami (
    MarkaKodu           nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    DestekAilesiKodu    nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    BelirtiKodu         nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    Sira                smallint NOT NULL CONSTRAINT DF_kod_BelirtiKapsami_Sira DEFAULT 0,
    CONSTRAINT PK_kod_BelirtiKapsami PRIMARY KEY CLUSTERED (MarkaKodu, DestekAilesiKodu, BelirtiKodu),
    CONSTRAINT FK_kod_BelirtiKapsami_katalog_Marka FOREIGN KEY (MarkaKodu)
        REFERENCES katalog.Marka (Kod),
    CONSTRAINT FK_kod_BelirtiKapsami_kod_DestekAilesi FOREIGN KEY (DestekAilesiKodu)
        REFERENCES kod.DestekAilesi (Kod),
    CONSTRAINT FK_kod_BelirtiKapsami_kod_Belirti FOREIGN KEY (BelirtiKodu)
        REFERENCES kod.Belirti (Kod)
);
GO

CREATE INDEX IX_kod_BelirtiKapsami_DestekAilesiKodu ON kod.BelirtiKapsami (DestekAilesiKodu);
CREATE INDEX IX_kod_BelirtiKapsami_BelirtiKodu ON kod.BelirtiKapsami (BelirtiKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BelirtiKapsami',
    @Metin = N'Servis talebi ekranında hangi markanın hangi makine ailesi için hangi belirtilerin (arıza şikâyetlerinin) sunulacağı. Ekran listeyi marka ve aileye göre buradan okur, Sira''ya göre dizer. paksan için her ailenin kendi belirtileri, ortak belirtiler ve "diğer" vardır; genel ailesinde yalnız ortak belirtiler ve "diğer". Başka markaya kendi listesi satır eklenerek kurulur. Tohumla gelir (kaynak: src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER); tohum kaynakta olmayan bağı siler, uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BelirtiKapsami', @Alt = N'MarkaKodu',
    @Metin = N'Belirtinin sunulduğu marka (katalog.Marka).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BelirtiKapsami', @Alt = N'DestekAilesiKodu',
    @Metin = N'Belirtinin sunulduğu makine ailesi (balya, rulo, genel…; kod.DestekAilesi).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BelirtiKapsami', @Alt = N'BelirtiKodu',
    @Metin = N'Sunulan belirti (kod.Belirti).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BelirtiKapsami', @Alt = N'Sira',
    @Metin = N'Belirtinin o marka ve ailedeki gösterim sırası; küçük sayı önce gelir.';
GO

/* ========================= kod.TalepNumaraKurali → katalog.Marka (6.3) */

ALTER TABLE kod.TalepNumaraKurali
    ADD CONSTRAINT FK_kod_TalepNumaraKurali_katalog_Marka FOREIGN KEY (MarkaKodu)
        REFERENCES katalog.Marka (Kod);

/* Yabancı anahtarın öndeki kolonu bir dizinle karşılanır (CD-FK-DIZIN).
   V0002 MarkaKodu ile başlayan bir dizin açmadıysa burada açılır. */
IF NOT EXISTS (
    SELECT 1
    FROM sys.index_columns ic
    JOIN sys.indexes i ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE ic.object_id = OBJECT_ID(N'kod.TalepNumaraKurali')
      AND ic.key_ordinal = 1
      AND i.has_filter = 0
      AND c.name = N'MarkaKodu')
    CREATE INDEX IX_kod_TalepNumaraKurali_MarkaKodu ON kod.TalepNumaraKurali (MarkaKodu);
GO

/* ============================ Geçmiş tablolarının açıklamaları (1.20)

   Motorun açtığı gecmis.<sema>_<Tablo> tabloları da SSMS'te okunur.
   Kolon açıklamaları asıl tablodan aynen kopyalanır; tablo açıklaması
   bu tablonun ne olduğunu söyler. Dinamik SQL yok: dbo.AciklamaYaz
   değişken parametreyle çağrılır. */

DECLARE @GecmisTablo sysname, @AsilSema sysname, @AsilTablo sysname,
        @Kolon sysname, @Metin nvarchar(3750);

DECLARE GecmisAciklamalari CURSOR LOCAL FAST_FORWARD FOR
    SELECT h.name, s.name, t.name, c.name, CONVERT(nvarchar(3750), ep.value)
    FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    JOIN sys.tables h ON h.object_id = t.history_table_id
    JOIN sys.extended_properties ep
      ON ep.class = 1 AND ep.major_id = t.object_id AND ep.name = N'MS_Description'
    LEFT JOIN sys.columns c
      ON c.object_id = t.object_id AND c.column_id = ep.minor_id
    WHERE t.object_id IN (OBJECT_ID(N'sirket.Sirket'), OBJECT_ID(N'sirket.BankaHesabi'),
                          OBJECT_ID(N'katalog.Marka'), OBJECT_ID(N'katalog.Urun'),
                          OBJECT_ID(N'katalog.Parca'))
    ORDER BY t.object_id, ep.minor_id;

OPEN GecmisAciklamalari;
FETCH NEXT FROM GecmisAciklamalari INTO @GecmisTablo, @AsilSema, @AsilTablo, @Kolon, @Metin;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF @Kolon IS NULL
    BEGIN
        SET @Metin = N'Geçmiş tablosu: ' + @AsilSema + N'.' + @AsilTablo
            + N' tablosundaki satırların eski hâlleri. Bir satır değiştiğinde ya da silindiğinde SQL Server önceki hâlini buraya kendisi yazar; elle yazılmaz ve değiştirilmez. Her satırın geçerli olduğu aralık GecerlilikBaslangici ile GecerlilikBitisi arasındadır (UTC). Güncel ve eski hâlleri birlikte görmek için: SELECT … FROM '
            + @AsilSema + N'.' + @AsilTablo + N' FOR SYSTEM_TIME ALL.';
        EXEC dbo.AciklamaYaz @Sema = N'gecmis', @Nesne = @GecmisTablo, @Metin = @Metin;
    END
    ELSE
        EXEC dbo.AciklamaYaz @Sema = N'gecmis', @Nesne = @GecmisTablo, @Alt = @Kolon, @Metin = @Metin;

    FETCH NEXT FROM GecmisAciklamalari INTO @GecmisTablo, @AsilSema, @AsilTablo, @Kolon, @Metin;
END;
CLOSE GecmisAciklamalari;
DEALLOCATE GecmisAciklamalari;
GO
