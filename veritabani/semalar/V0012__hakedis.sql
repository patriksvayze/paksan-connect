/* ==========================================================================
   V0012 — hakedis şeması

   Servisin PAKSAN'dan alacağı: tarife, hak ediş ve kalemleri, aylık döküm
   ve belgeleri, servis hesap hareketi.

   Kural kaynağı: veritabani/tasarim.md Bölüm 0.4 (hakedis), 1.9.2-1.9.5,
   1.17.1, 1.17.2, 1.17.5, 6.2. Tutarın tek kaynağı HakEdisKalemi'dir;
   NetTutar'ı ve kalemleri yalnız hakedis.HakEdisHesapla ve
   hakedis.HakEdisKalemiYaz yazar (R05). Tetikleyiciler R04'te.

   hakedis.HakEdis.MarkaKodu varsayılansızdır: marka talepten açıkça
   yazılır (tasarim.md 1.15.1 "Uygulamada değişti").
   ========================================================================== */

/* -------------------------------------------------------- hakedis.Tarife */

CREATE TABLE hakedis.Tarife (
    BirimTutar                  decimal(18,2) NOT NULL
        CONSTRAINT CK_hakedis_Tarife_BirimTutar CHECK (BirimTutar >= 0),
    GecerlilikBaslangicTarihi   date NOT NULL,
    GecerlilikBitisTarihi       date NULL,
    KalemTuruKodu               nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_hakedis_Tarife_kod_HakEdisKalemTuru REFERENCES kod.HakEdisKalemTuru (Kod),
    MarkaKodu                   nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL
        CONSTRAINT FK_hakedis_Tarife_katalog_Marka REFERENCES katalog.Marka (Kod),
    BirimKodu                   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_hakedis_Tarife_kod_Birim REFERENCES kod.Birim (Kod),
    ParaBirimiKodu              nvarchar(3) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_hakedis_Tarife_kod_ParaBirimi REFERENCES kod.ParaBirimi (Kod),
    KayitNo                     bigint IDENTITY(1,1) NOT NULL,
    Kimlik                      uniqueidentifier NOT NULL
        CONSTRAINT DF_hakedis_Tarife_Kimlik DEFAULT NEWID(),
    GecerlilikBaslangici        datetime2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    GecerlilikBitisi            datetime2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (GecerlilikBaslangici, GecerlilikBitisi),
    CONSTRAINT PK_hakedis_Tarife PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT CK_hakedis_Tarife_GecerlilikBitisTarihi
        CHECK (GecerlilikBitisTarihi IS NULL OR GecerlilikBitisTarihi >= GecerlilikBaslangicTarihi)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = gecmis.hakedis_Tarife, DATA_CONSISTENCY_CHECK = ON));
GO

CREATE UNIQUE CLUSTERED INDEX CX_hakedis_Tarife_KayitNo ON hakedis.Tarife (KayitNo);

/* Kalem türü başına tek açık genel tarife; markaya özel açık tarife ayrı (Bölüm 1.17.5). */
CREATE UNIQUE NONCLUSTERED INDEX UX_hakedis_Tarife_AcikGenel
    ON hakedis.Tarife (KalemTuruKodu)
    WHERE GecerlilikBitisTarihi IS NULL AND MarkaKodu IS NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_hakedis_Tarife_AcikMarka
    ON hakedis.Tarife (KalemTuruKodu, MarkaKodu)
    WHERE GecerlilikBitisTarihi IS NULL AND MarkaKodu IS NOT NULL;

CREATE NONCLUSTERED INDEX IX_hakedis_Tarife_KalemTuruKoduGecerlilikBaslangicTarihi
    ON hakedis.Tarife (KalemTuruKodu, GecerlilikBaslangicTarihi)
    INCLUDE (MarkaKodu, GecerlilikBitisTarihi);
CREATE NONCLUSTERED INDEX IX_hakedis_Tarife_MarkaKodu ON hakedis.Tarife (MarkaKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_Tarife_BirimKodu ON hakedis.Tarife (BirimKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_Tarife_ParaBirimiKodu ON hakedis.Tarife (ParaBirimiKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'Tarife', @Metin = N'Servise ödenen hak ediş kalemlerinin birim ücreti (ör. yol için km başına ücret). Tarih aralığıyla geçerlidir: hak edişin hesabında ziyaretin tamamlandığı Türkiye gününde geçerli satır kullanılır; markaya özel satır yoksa genel satır (MarkaKodu boş). Satır silinmez, eski tarifeye bitiş tarihi yazılır. Değişiklik geçmişi gecmis.hakedis_Tarife tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'Tarife', @Alt = N'BirimTutar', @Metin = N'Bir birim için ödenen ücret (ör. 1 km yol için 12,00). Para birimi ParaBirimiKodu kolonundadır.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'Tarife', @Alt = N'GecerlilikBaslangicTarihi', @Metin = N'Tarifenin geçerli olduğu ilk gün (Türkiye günü).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'Tarife', @Alt = N'GecerlilikBitisTarihi', @Metin = N'Tarifenin geçerli olduğu son gün (Türkiye günü). Boşsa tarife hâlâ geçerlidir; aynı kalem ve marka için tek açık tarife olur.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'Tarife', @Alt = N'KalemTuruKodu', @Metin = N'Tarifenin hangi hak ediş kalemi için olduğu (kod.HakEdisKalemTuru: yol, iscilik, diger…).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'Tarife', @Alt = N'MarkaKodu', @Metin = N'Tarifenin geçerli olduğu marka (katalog.Marka). Boşsa bütün markalar için genel tarifedir.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'Tarife', @Alt = N'BirimKodu', @Metin = N'Ücretin birimi (kod.Birim: km, adet, saat, sabit).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'Tarife', @Alt = N'ParaBirimiKodu', @Metin = N'BirimTutar kolonunun para birimi (kod.ParaBirimi, ör. TRY).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'Tarife', @Alt = N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yoktur, ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'Tarife', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'Tarife', @Alt = N'GecerlilikBaslangici', @Metin = N'Satırın bu hâlinin veritabanına yazıldığı an (UTC). Sistem sürümlü geçmiş için motor yazar; SELECT * ile görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'Tarife', @Alt = N'GecerlilikBitisi', @Metin = N'Satırın bu hâlinin değiştiği ya da silindiği an (UTC); güncel satırda 9999-12-31. Sistem sürümlü geçmiş için motor yazar; SELECT * ile görünmez.';
GO

/* Geçmiş tablosu aynı açıklamaları taşır (SSMS'te ve sözlükte okunur). */
DECLARE @KolonNo int = 0, @KolonAdi sysname, @KolonMetni nvarchar(3750);
EXEC dbo.AciklamaYaz @Sema = N'gecmis', @Nesne = N'hakedis_Tarife', @Metin = N'hakedis.Tarife tablosunun eski hâlleri (sistem sürümlü geçmiş). Motor yazar; elle değiştirilmez. Sorgu: SELECT … FROM hakedis.Tarife FOR SYSTEM_TIME ALL.';
WHILE 1 = 1
BEGIN
    SELECT TOP (1) @KolonNo = c.column_id, @KolonAdi = c.name, @KolonMetni = CONVERT(nvarchar(3750), e.value)
    FROM sys.columns AS c
    JOIN sys.extended_properties AS e
      ON e.class = 1 AND e.major_id = c.object_id AND e.minor_id = c.column_id AND e.name = N'MS_Description'
    WHERE c.object_id = OBJECT_ID(N'hakedis.Tarife') AND c.column_id > @KolonNo
    ORDER BY c.column_id;
    IF @@ROWCOUNT = 0 BREAK;
    EXEC dbo.AciklamaYaz @Sema = N'gecmis', @Nesne = N'hakedis_Tarife', @Alt = @KolonAdi, @Metin = @KolonMetni;
END;
GO

/* --------------------------------------------------- hakedis.DonemDokumu */

CREATE TABLE hakedis.DonemDokumu (
    Numara                  nvarchar(10) COLLATE Latin1_General_100_BIN2 NOT NULL,
    DonemYili               smallint NOT NULL,
    DonemAyi                tinyint NOT NULL,
    NetToplam               decimal(18,2) NOT NULL
        CONSTRAINT DF_hakedis_DonemDokumu_NetToplam DEFAULT 0,
    KdvToplam               decimal(18,2) NOT NULL
        CONSTRAINT DF_hakedis_DonemDokumu_KdvToplam DEFAULT 0,
    TevkifatToplam          decimal(18,2) NOT NULL
        CONSTRAINT DF_hakedis_DonemDokumu_TevkifatToplam DEFAULT 0,
    StopajToplam            decimal(18,2) NOT NULL
        CONSTRAINT DF_hakedis_DonemDokumu_StopajToplam DEFAULT 0,
    MahsupToplam            decimal(18,2) NOT NULL
        CONSTRAINT DF_hakedis_DonemDokumu_MahsupToplam DEFAULT 0,
    OdenecekTutar           decimal(18,2) NOT NULL
        CONSTRAINT DF_hakedis_DonemDokumu_OdenecekTutar DEFAULT 0,
    ServisKimlik            uniqueidentifier NOT NULL
        CONSTRAINT FK_hakedis_DonemDokumu_servis_Servis REFERENCES servis.Servis (Kimlik),
    SirketKodu              nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_hakedis_DonemDokumu_sirket_Sirket REFERENCES sirket.Sirket (Kod),
    ParaBirimiKodu          nvarchar(3) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_hakedis_DonemDokumu_kod_ParaBirimi REFERENCES kod.ParaBirimi (Kod),
    DurumKodu               nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_hakedis_DonemDokumu_kod_DonemDokumuDurumu REFERENCES kod.DonemDokumuDurumu (Kod),
    KesinlesmeZamani        datetime2(3) NULL,
    FaturaGelmeZamani       datetime2(3) NULL,
    OdemeZamani             datetime2(3) NULL,
    YapanTuruKodu           nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_hakedis_DonemDokumu_kod_AktorTuru_Yapan REFERENCES kod.AktorTuru (Kod),
    YapanKullaniciKimlik    uniqueidentifier NULL
        CONSTRAINT FK_hakedis_DonemDokumu_erisim_Kullanici_Yapan REFERENCES erisim.Kullanici (Kimlik),
    YapanHesapKimlik        uniqueidentifier NULL
        CONSTRAINT FK_hakedis_DonemDokumu_musteri_Hesap_Yapan REFERENCES musteri.Hesap (Kimlik),
    YapanAdi                nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_hakedis_DonemDokumu_kod_KaynakUygulama REFERENCES kod.KaynakUygulama (Kod),
    UygulamaSurumu          nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani            datetime2(3) NOT NULL
        CONSTRAINT DF_hakedis_DonemDokumu_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                 bigint IDENTITY(1,1) NOT NULL,
    Kimlik                  uniqueidentifier NOT NULL
        CONSTRAINT DF_hakedis_DonemDokumu_Kimlik DEFAULT NEWID(),
    SatirSurumu             rowversion NOT NULL,
    CONSTRAINT PK_hakedis_DonemDokumu PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_hakedis_DonemDokumu_Numara UNIQUE (Numara),
    /* Hak edişin ve hareketin dört kolonlu bileşik FK hedefi (Bölüm 1.9.5). */
    CONSTRAINT UQ_hakedis_DonemDokumu_KimlikServisKimlikSirketKoduParaBirimiKodu
        UNIQUE (Kimlik, ServisKimlik, SirketKodu, ParaBirimiKodu),
    CONSTRAINT CK_hakedis_DonemDokumu_Numara
        CHECK (Numara LIKE N'[A-Z][A-Z][A-Z][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
    CONSTRAINT CK_hakedis_DonemDokumu_NumaraOneki CHECK (LEFT(Numara, 3) = N'HAK'),
    CONSTRAINT CK_hakedis_DonemDokumu_DonemAyi CHECK (DonemAyi BETWEEN 1 AND 12),
    CONSTRAINT CK_hakedis_DonemDokumu_NetToplam CHECK (NetToplam >= 0),
    CONSTRAINT CK_hakedis_DonemDokumu_KdvToplam CHECK (KdvToplam >= 0),
    CONSTRAINT CK_hakedis_DonemDokumu_TevkifatToplam CHECK (TevkifatToplam >= 0),
    CONSTRAINT CK_hakedis_DonemDokumu_StopajToplam CHECK (StopajToplam >= 0),
    CONSTRAINT CK_hakedis_DonemDokumu_MahsupToplam CHECK (MahsupToplam >= 0),
    /* Mahsup hak edişi aşarsa sonuç eksi olabilir (servis borçlu kalır); eksi sınırı konmadı. */
    CONSTRAINT CK_hakedis_DonemDokumu_OdenecekTutar
        CHECK (OdenecekTutar = NetToplam + KdvToplam - TevkifatToplam - StopajToplam - MahsupToplam),
    CONSTRAINT CK_hakedis_DonemDokumu_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_hakedis_DonemDokumu_KayitNo ON hakedis.DonemDokumu (KayitNo);

/* Servis × şirket × para birimi × yıl × ay başına tek döküm (iptal hariç). */
CREATE UNIQUE NONCLUSTERED INDEX UX_hakedis_DonemDokumu_ServisDonemi
    ON hakedis.DonemDokumu (ServisKimlik, SirketKodu, ParaBirimiKodu, DonemYili, DonemAyi)
    WHERE DurumKodu <> N'iptal';

CREATE NONCLUSTERED INDEX IX_hakedis_DonemDokumu_ServisKimlikDonemYiliDonemAyi
    ON hakedis.DonemDokumu (ServisKimlik, DonemYili, DonemAyi);
CREATE NONCLUSTERED INDEX IX_hakedis_DonemDokumu_SirketKoduDonemYiliDonemAyi
    ON hakedis.DonemDokumu (SirketKodu, DonemYili, DonemAyi);
CREATE NONCLUSTERED INDEX IX_hakedis_DonemDokumu_DurumKoduDonemYiliDonemAyi
    ON hakedis.DonemDokumu (DurumKodu, DonemYili, DonemAyi);
CREATE NONCLUSTERED INDEX IX_hakedis_DonemDokumu_ParaBirimiKodu ON hakedis.DonemDokumu (ParaBirimiKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_DonemDokumu_YapanTuruKodu ON hakedis.DonemDokumu (YapanTuruKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_DonemDokumu_YapanKullaniciKimlik ON hakedis.DonemDokumu (YapanKullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_hakedis_DonemDokumu_YapanHesapKimlik ON hakedis.DonemDokumu (YapanHesapKimlik);
CREATE NONCLUSTERED INDEX IX_hakedis_DonemDokumu_KaynakUygulamaKodu ON hakedis.DonemDokumu (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Metin = N'Servisin bir aylık hak ediş dökümü (HAK numaralı). Servis, şirket, para birimi ve ay başına bir tane olur (iptal edilenler hariç). Bağlı hak edişler hakedis.HakEdis, bağlı hareketler hakedis.ServisHesapHareketi, fatura ve ödeme belgeleri hakedis.DonemDokumuBelgesi tablosundadır. Tutarlar döküm taslakken yeniden hesaplanır.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'Numara', @Metin = N'Dökümün okunur numarası; tiresiz saklanır (HAK2600045), ekranda HAK-26-00045 yazılır. sistem.NumaraAl verir. Tiresiz ve büyük harfle saklanır; ekrandaki HAK-26-00045 yazımıyla ya da küçük harfle yapılan eşitlik araması kayıt bulmaz. Numarayı her yazımla bulmak için EXEC yardim.HakEdisGoster N''HAK-26-00045'' kullanın.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'DonemYili', @Metin = N'Dökümün ait olduğu yıl (Türkiye takvimi; hak edişin onaylandığı Türkiye gününden).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'DonemAyi', @Metin = N'Dökümün ait olduğu ay, 1-12 (Türkiye takvimi).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'NetToplam', @Metin = N'Döküme bağlı onaylı hak edişlerin net tutarı toplamı (KDV hariç). Para birimi ParaBirimiKodu kolonundadır.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'KdvToplam', @Metin = N'Döküme bağlı onaylı hak edişlerin KDV tutarı toplamı.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'TevkifatToplam', @Metin = N'Döküme bağlı onaylı hak edişlerin tevkifat tutarı toplamı (ödenecek tutardan düşülür).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'StopajToplam', @Metin = N'Döküme bağlı onaylı hak edişlerin stopaj tutarı toplamı (ödenecek tutardan düşülür).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'MahsupToplam', @Metin = N'Döküme bağlı, servisin borcu olan hareketlerin toplamı (ör. parça siparişi borcu; ödeme hareketi hariç). Ödenecek tutardan düşülür.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'OdenecekTutar', @Metin = N'Servise ödenecek tutar = NetToplam + KdvToplam - TevkifatToplam - StopajToplam - MahsupToplam (kısıtla denetlenir). Mahsup hak edişi aşarsa eksi çıkar: servis borçlu kalır. Ödenen tutar ödeme türündeki hesap hareketlerinden okunur.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'ServisKimlik', @Metin = N'Dökümün ait olduğu servis (servis.Servis).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'SirketKodu', @Metin = N'Hak edişi ödeyen şirket (sirket.Sirket). Döküm yazılırken sabitlenir, sonra değişmez.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'ParaBirimiKodu', @Metin = N'Dökümdeki bütün tutarların para birimi (kod.ParaBirimi). Farklı para birimindeki hak edişler ayrı dökümde toplanır.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'DurumKodu', @Metin = N'Dökümün durumu (kod.DonemDokumuDurumu: taslak, kesinlesti, faturaGeldi, odendi, iptal).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'KesinlesmeZamani', @Metin = N'Dökümün kesinleştiği an (UTC). Kesinleşen dökümün tutarları değişmez.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'FaturaGelmeZamani', @Metin = N'Servisin faturasının ya da gider pusulasının geldiği an (UTC). Belgenin kendisi hakedis.DonemDokumuBelgesi tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'OdemeZamani', @Metin = N'Dökümün ödendi durumuna geçtiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'YapanTuruKodu', @Metin = N'Dökümü oluşturanın türü (kod.AktorTuru: musteri, personel, servis, sistem, entegrasyon).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'YapanKullaniciKimlik', @Metin = N'Dökümü oluşturan personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyon için boş.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'YapanHesapKimlik', @Metin = N'Dökümü oluşturan müşteri hesabı (musteri.Hesap). Yalnız müşteri için dolu.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'YapanAdi', @Metin = N'Dökümü oluşturanın o anki adı (personel ya da servis). Müşteri için boş.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama (kod.KaynakUygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'UygulamaSurumu', @Metin = N'Kaydın geldiği uygulamanın sürümü (ör. 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'OlusmaZamani', @Metin = N'Dökümün oluştuğu an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yoktur, ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumu', @Alt = N'SatirSurumu', @Metin = N'Aynı dökümün iki kişi tarafından aynı anda değiştirilmesini yakalamak için satır sürümü; her güncellemede kendiliğinden değişir.';
GO

/* ------------------------------------------------------- hakedis.HakEdis */

CREATE TABLE hakedis.HakEdis (
    NetTutar                    decimal(18,2) NOT NULL
        CONSTRAINT DF_hakedis_HakEdis_NetTutar DEFAULT 0,
    KdvOrani                    decimal(7,4) NULL,
    KdvTutari                   decimal(18,2) NULL,
    TevkifatOrani               decimal(7,4) NULL,
    TevkifatTutari              decimal(18,2) NULL,
    StopajOrani                 decimal(7,4) NULL,
    StopajTutari                decimal(18,2) NULL,
    ZiyaretKimlik               uniqueidentifier NOT NULL,
    TalepKimlik                 uniqueidentifier NOT NULL,
    ServisKimlik                uniqueidentifier NOT NULL,
    MarkaKodu                   nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    SirketKodu                  nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_hakedis_HakEdis_sirket_Sirket REFERENCES sirket.Sirket (Kod),
    KapiKodu                    nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    AsamaKodu                   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    ParaBirimiKodu              nvarchar(3) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_hakedis_HakEdis_kod_ParaBirimi REFERENCES kod.ParaBirimi (Kod),
    DonemDokumuKimlik           uniqueidentifier NULL,
    DurumKodu                   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_hakedis_HakEdis_kod_HakEdisDurumu REFERENCES kod.HakEdisDurumu (Kod),
    OnayZamani                  datetime2(3) NULL,
    OnaylayanKullaniciKimlik    uniqueidentifier NULL
        CONSTRAINT FK_hakedis_HakEdis_erisim_Kullanici_Onaylayan REFERENCES erisim.Kullanici (Kimlik),
    OnaylayanAdi                nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    RedZamani                   datetime2(3) NULL,
    RedEdenKullaniciKimlik      uniqueidentifier NULL
        CONSTRAINT FK_hakedis_HakEdis_erisim_Kullanici_RedEden REFERENCES erisim.Kullanici (Kimlik),
    RedEdenAdi                  nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    RedNedeni                   nvarchar(500) COLLATE Turkish_100_CI_AS NULL,
    OlusmaZamani                datetime2(3) NOT NULL
        CONSTRAINT DF_hakedis_HakEdis_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                     bigint IDENTITY(1,1) NOT NULL,
    Kimlik                      uniqueidentifier NOT NULL
        CONSTRAINT DF_hakedis_HakEdis_Kimlik DEFAULT NEWID(),
    SatirSurumu                 rowversion NOT NULL,
    CONSTRAINT PK_hakedis_HakEdis PRIMARY KEY NONCLUSTERED (Kimlik),
    /* Ziyaret başına en çok bir hak ediş (KOD 6.1.4). */
    CONSTRAINT UQ_hakedis_HakEdis_ZiyaretKimlik UNIQUE (ZiyaretKimlik),
    /* Hesap hareketinin dört kolonlu bileşik FK hedefi. */
    CONSTRAINT UQ_hakedis_HakEdis_KimlikServisKimlikSirketKoduParaBirimiKodu
        UNIQUE (Kimlik, ServisKimlik, SirketKodu, ParaBirimiKodu),
    CONSTRAINT FK_hakedis_HakEdis_talep_ServisZiyareti
        FOREIGN KEY (ZiyaretKimlik, TalepKimlik, ServisKimlik)
        REFERENCES talep.ServisZiyareti (Kimlik, TalepKimlik, ServisKimlik),
    CONSTRAINT FK_hakedis_HakEdis_talep_ServisZiyareti_KapiAsama
        FOREIGN KEY (ZiyaretKimlik, KapiKodu, AsamaKodu)
        REFERENCES talep.ServisZiyareti (Kimlik, KapiKodu, AsamaKodu),
    CONSTRAINT FK_hakedis_HakEdis_talep_Talep
        FOREIGN KEY (TalepKimlik, MarkaKodu)
        REFERENCES talep.Talep (Kimlik, MarkaKodu),
    CONSTRAINT FK_hakedis_HakEdis_hakedis_DonemDokumu
        FOREIGN KEY (DonemDokumuKimlik, ServisKimlik, SirketKodu, ParaBirimiKodu)
        REFERENCES hakedis.DonemDokumu (Kimlik, ServisKimlik, SirketKodu, ParaBirimiKodu),
    CONSTRAINT CK_hakedis_HakEdis_KapiKodu CHECK (KapiKodu = N'garanti'),
    CONSTRAINT CK_hakedis_HakEdis_AsamaKodu CHECK (AsamaKodu = N'bitti'),
    CONSTRAINT CK_hakedis_HakEdis_NetTutar CHECK (NetTutar >= 0),
    CONSTRAINT CK_hakedis_HakEdis_KdvOrani CHECK (KdvOrani IS NULL OR (KdvOrani >= 0 AND KdvOrani <= 1)),
    CONSTRAINT CK_hakedis_HakEdis_KdvTutari CHECK (KdvTutari IS NULL OR KdvTutari >= 0),
    CONSTRAINT CK_hakedis_HakEdis_TevkifatOrani CHECK (TevkifatOrani IS NULL OR (TevkifatOrani >= 0 AND TevkifatOrani <= 1)),
    CONSTRAINT CK_hakedis_HakEdis_TevkifatTutari CHECK (TevkifatTutari IS NULL OR TevkifatTutari >= 0),
    CONSTRAINT CK_hakedis_HakEdis_StopajOrani CHECK (StopajOrani IS NULL OR (StopajOrani >= 0 AND StopajOrani <= 1)),
    CONSTRAINT CK_hakedis_HakEdis_StopajTutari CHECK (StopajTutari IS NULL OR StopajTutari >= 0),
    CONSTRAINT CK_hakedis_HakEdis_Bekliyor CHECK (
        DurumKodu <> N'bekliyor'
        OR (OnayZamani IS NULL AND OnaylayanKullaniciKimlik IS NULL AND OnaylayanAdi IS NULL
            AND RedZamani IS NULL AND RedEdenKullaniciKimlik IS NULL AND RedEdenAdi IS NULL
            AND RedNedeni IS NULL)
    ),
    CONSTRAINT CK_hakedis_HakEdis_Onaylandi CHECK (
        DurumKodu <> N'onaylandi'
        OR (OnayZamani IS NOT NULL AND OnaylayanKullaniciKimlik IS NOT NULL
            AND KdvTutari IS NOT NULL AND TevkifatTutari IS NOT NULL AND StopajTutari IS NOT NULL)
    ),
    CONSTRAINT CK_hakedis_HakEdis_Reddedildi CHECK (
        DurumKodu <> N'reddedildi'
        OR (RedZamani IS NOT NULL AND RedEdenKullaniciKimlik IS NOT NULL AND RedNedeni IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_hakedis_HakEdis_KayitNo ON hakedis.HakEdis (KayitNo);

CREATE NONCLUSTERED INDEX IX_hakedis_HakEdis_ServisKimlikDurumKoduOlusmaZamani
    ON hakedis.HakEdis (ServisKimlik, DurumKodu, OlusmaZamani);
/* Onay bekleyenler listesi (gorunum.KontrolOnayBekleyenHakEdis, backoffice onay ekranı). */
CREATE NONCLUSTERED INDEX IX_hakedis_HakEdis_OlusmaZamaniBekliyor
    ON hakedis.HakEdis (OlusmaZamani)
    INCLUDE (ServisKimlik, TalepKimlik, NetTutar, ParaBirimiKodu)
    WHERE DurumKodu = N'bekliyor';
CREATE NONCLUSTERED INDEX IX_hakedis_HakEdis_ZiyaretKimlikTalepKimlikServisKimlik
    ON hakedis.HakEdis (ZiyaretKimlik, TalepKimlik, ServisKimlik);
CREATE NONCLUSTERED INDEX IX_hakedis_HakEdis_ZiyaretKimlikKapiKoduAsamaKodu
    ON hakedis.HakEdis (ZiyaretKimlik, KapiKodu, AsamaKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_HakEdis_TalepKimlikMarkaKodu
    ON hakedis.HakEdis (TalepKimlik, MarkaKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_HakEdis_DonemDokumuKimlikServisKimlikSirketKoduParaBirimiKodu
    ON hakedis.HakEdis (DonemDokumuKimlik, ServisKimlik, SirketKodu, ParaBirimiKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_HakEdis_SirketKodu ON hakedis.HakEdis (SirketKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_HakEdis_DurumKoduOlusmaZamani ON hakedis.HakEdis (DurumKodu, OlusmaZamani);
CREATE NONCLUSTERED INDEX IX_hakedis_HakEdis_ParaBirimiKodu ON hakedis.HakEdis (ParaBirimiKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_HakEdis_OnaylayanKullaniciKimlik ON hakedis.HakEdis (OnaylayanKullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_hakedis_HakEdis_RedEdenKullaniciKimlik ON hakedis.HakEdis (RedEdenKullaniciKimlik);
GO

EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Metin = N'Servisin garanti kapsamında tamamladığı bir ziyaret için PAKSAN''dan alacağı ücret. Ziyaret başına en çok bir hak ediş olur. Tutarın dökümü hakedis.HakEdisKalemi tablosundadır; NetTutar kalemlerin toplamıdır. Servis uygulamasında Hak Ediş ekranında, backoffice''te onay ekranında görünür. Onaylanınca servisin hesabına alacak hareketi yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'NetTutar', @Metin = N'Hak edişin net tutarı (KDV hariç) = HakEdisKalemi tutarlarının toplamı. Yalnız hakedis.HakEdisHesapla ve hakedis.HakEdisKalemiYaz yazar; onaylanırken kalem toplamıyla eşitliği denetlenir. Para birimi ParaBirimiKodu kolonundadır.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'KdvOrani', @Metin = N'Onayda uygulanan KDV oranı (0,2000 = %20). Onaydan önce boş.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'KdvTutari', @Metin = N'Onayda hesaplanan KDV tutarı. Onaylı hak edişte zorunlu (0 olabilir).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'TevkifatOrani', @Metin = N'Onayda uygulanan tevkifat oranı (0,2000 = %20). Onaydan önce boş.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'TevkifatTutari', @Metin = N'Onayda hesaplanan tevkifat tutarı; servise ödenecekten düşülür. Onaylı hak edişte zorunlu (0 olabilir).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'StopajOrani', @Metin = N'Onayda uygulanan stopaj oranı (0,2000 = %20). Onaydan önce boş.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'StopajTutari', @Metin = N'Onayda hesaplanan stopaj tutarı; servise ödenecekten düşülür. Onaylı hak edişte zorunlu (0 olabilir).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'ZiyaretKimlik', @Metin = N'Hak edişin doğduğu servis ziyareti (talep.ServisZiyareti). Ziyaret garanti kapısında ve bitmiş olmalıdır.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'TalepKimlik', @Metin = N'Ziyaretin ait olduğu talep (talep.Talep).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'ServisKimlik', @Metin = N'Ziyareti yapan ve hak edişi alacak servis (servis.Servis); ziyaretteki serviste aynı olmak zorundadır.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'MarkaKodu', @Metin = N'Talebin markası (katalog.Marka); talepteki markayla aynı olmak zorundadır.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'SirketKodu', @Metin = N'Hak edişi ödeyecek şirket (sirket.Sirket): talebin markasının hak ediş yazıldığı andaki şirketi. Sonra değişmez.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'KapiKodu', @Metin = N'Ziyaretin ücret kapısı. Hak ediş yalnız garanti kapısında doğar; değer her zaman garanti.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'AsamaKodu', @Metin = N'Ziyaretin aşaması. Hak ediş yalnız biten ziyarette doğar; değer her zaman bitti.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'ParaBirimiKodu', @Metin = N'Hak edişteki bütün tutarların para birimi (kod.ParaBirimi).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'DonemDokumuKimlik', @Metin = N'Hak edişin bağlandığı aylık döküm (hakedis.DonemDokumu). Döküm aynı servis, şirket ve para biriminde olmak zorundadır. Bağlanmamışsa boş.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'DurumKodu', @Metin = N'Hak edişin durumu (kod.HakEdisDurumu: bekliyor, onaylandi, reddedildi).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'OnayZamani', @Metin = N'Hak edişin onaylandığı an (UTC). Döküm dönemi bu anın Türkiye gününden belirlenir.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'OnaylayanKullaniciKimlik', @Metin = N'Hak edişi onaylayan personel (erisim.Kullanici).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'OnaylayanAdi', @Metin = N'Hak edişi onaylayan personelin o anki adı.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'RedZamani', @Metin = N'Hak edişin reddedildiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'RedEdenKullaniciKimlik', @Metin = N'Hak edişi reddeden personel (erisim.Kullanici).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'RedEdenAdi', @Metin = N'Hak edişi reddeden personelin o anki adı.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'RedNedeni', @Metin = N'Hak edişin neden reddedildiği (serbest metin). Reddedilen hak edişte zorunlu.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'OlusmaZamani', @Metin = N'Hak edişin oluştuğu an (UTC); servis kaydı gönderildiğinde yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yoktur, ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'SatirSurumu', @Metin = N'Aynı hak edişin iki kişi tarafından aynı anda onaylanmasını yakalamak için satır sürümü; her güncellemede kendiliğinden değişir.';
GO

/* ------------------------------------------------ hakedis.HakEdisKalemi */

CREATE TABLE hakedis.HakEdisKalemi (
    Miktar              decimal(9,1) NULL,
    BirimTutar          decimal(18,2) NULL,
    Tutar               decimal(18,2) NOT NULL,
    HakEdisKimlik       uniqueidentifier NOT NULL
        CONSTRAINT FK_hakedis_HakEdisKalemi_hakedis_HakEdis REFERENCES hakedis.HakEdis (Kimlik),
    KalemTuruKodu       nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_hakedis_HakEdisKalemi_kod_HakEdisKalemTuru REFERENCES kod.HakEdisKalemTuru (Kod),
    BirimKodu           nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL
        CONSTRAINT FK_hakedis_HakEdisKalemi_kod_Birim REFERENCES kod.Birim (Kod),
    TarifeKimlik        uniqueidentifier NULL
        CONSTRAINT FK_hakedis_HakEdisKalemi_hakedis_Tarife REFERENCES hakedis.Tarife (Kimlik),
    KayitNo             bigint IDENTITY(1,1) NOT NULL,
    Kimlik              uniqueidentifier NOT NULL
        CONSTRAINT DF_hakedis_HakEdisKalemi_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_hakedis_HakEdisKalemi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_hakedis_HakEdisKalemi_HakEdisKimlikKalemTuruKodu UNIQUE (HakEdisKimlik, KalemTuruKodu),
    CONSTRAINT CK_hakedis_HakEdisKalemi_Miktar CHECK (Miktar IS NULL OR Miktar >= 0),
    CONSTRAINT CK_hakedis_HakEdisKalemi_BirimTutar CHECK (BirimTutar IS NULL OR BirimTutar >= 0),
    CONSTRAINT CK_hakedis_HakEdisKalemi_Tutar CHECK (Tutar >= 0)
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_hakedis_HakEdisKalemi_KayitNo ON hakedis.HakEdisKalemi (KayitNo);
CREATE NONCLUSTERED INDEX IX_hakedis_HakEdisKalemi_KalemTuruKodu ON hakedis.HakEdisKalemi (KalemTuruKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_HakEdisKalemi_BirimKodu ON hakedis.HakEdisKalemi (BirimKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_HakEdisKalemi_TarifeKimlik ON hakedis.HakEdisKalemi (TarifeKimlik);
GO

EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdisKalemi', @Metin = N'Hak edişin tutar dökümü: yol, işçilik ve sonradan eklenen öteki kalemler (ör. konaklama). Hak edişin tutarının tek kaynağıdır; hak edişte her kalem türünden bir satır olur. Yalnız hakedis.HakEdisHesapla (yol, işçilik) ve hakedis.HakEdisKalemiYaz (öteki türler) yazar; uygulama doğrudan yazamaz.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdisKalemi', @Alt = N'Miktar', @Metin = N'Kalemin miktarı (ör. yol için km). Birimi BirimKodu kolonundadır; sabit tutarlı kalemde boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdisKalemi', @Alt = N'BirimTutar', @Metin = N'Bir birimin ücreti; tarifeden hesaplandıysa tarifedeki değer. Para birimi hak edişin para birimidir (hakedis.HakEdis.ParaBirimiKodu).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdisKalemi', @Alt = N'Tutar', @Metin = N'Kalemin tutarı (KDV hariç, hak edişin para biriminde). Yol ve işçilik tam liraya yuvarlanır. Hak edişin NetTutar değeri bu kolonun toplamıdır.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdisKalemi', @Alt = N'HakEdisKimlik', @Metin = N'Kalemin ait olduğu hak ediş (hakedis.HakEdis).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdisKalemi', @Alt = N'KalemTuruKodu', @Metin = N'Kalemin türü (kod.HakEdisKalemTuru: yol, iscilik, diger…). Sıralama kod tablosundaki Sira kolonundandır.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdisKalemi', @Alt = N'BirimKodu', @Metin = N'Miktarın birimi (kod.Birim: km, adet, saat, sabit).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdisKalemi', @Alt = N'TarifeKimlik', @Metin = N'Tutarın hesaplandığı tarife satırı (hakedis.Tarife). Elle yazılan kalemde boş.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdisKalemi', @Alt = N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yoktur, ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdisKalemi', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda görünmez.';
GO

/* ------------------------------------------ hakedis.DonemDokumuBelgesi */

CREATE TABLE hakedis.DonemDokumuBelgesi (
    DonemDokumuKimlik       uniqueidentifier NOT NULL
        CONSTRAINT FK_hakedis_DonemDokumuBelgesi_hakedis_DonemDokumu REFERENCES hakedis.DonemDokumu (Kimlik),
    BelgeBagiKimlik         uniqueidentifier NOT NULL
        CONSTRAINT FK_hakedis_DonemDokumuBelgesi_entegrasyon_BelgeBagi REFERENCES entegrasyon.BelgeBagi (Kimlik),
    YapanTuruKodu           nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_hakedis_DonemDokumuBelgesi_kod_AktorTuru_Yapan REFERENCES kod.AktorTuru (Kod),
    YapanKullaniciKimlik    uniqueidentifier NULL
        CONSTRAINT FK_hakedis_DonemDokumuBelgesi_erisim_Kullanici_Yapan REFERENCES erisim.Kullanici (Kimlik),
    YapanHesapKimlik        uniqueidentifier NULL
        CONSTRAINT FK_hakedis_DonemDokumuBelgesi_musteri_Hesap_Yapan REFERENCES musteri.Hesap (Kimlik),
    YapanAdi                nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_hakedis_DonemDokumuBelgesi_kod_KaynakUygulama REFERENCES kod.KaynakUygulama (Kod),
    UygulamaSurumu          nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani            datetime2(3) NOT NULL
        CONSTRAINT DF_hakedis_DonemDokumuBelgesi_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_hakedis_DonemDokumuBelgesi PRIMARY KEY CLUSTERED (DonemDokumuKimlik, BelgeBagiKimlik),
    CONSTRAINT CK_hakedis_DonemDokumuBelgesi_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE NONCLUSTERED INDEX IX_hakedis_DonemDokumuBelgesi_BelgeBagiKimlik ON hakedis.DonemDokumuBelgesi (BelgeBagiKimlik);
CREATE NONCLUSTERED INDEX IX_hakedis_DonemDokumuBelgesi_YapanTuruKodu ON hakedis.DonemDokumuBelgesi (YapanTuruKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_DonemDokumuBelgesi_YapanKullaniciKimlik ON hakedis.DonemDokumuBelgesi (YapanKullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_hakedis_DonemDokumuBelgesi_YapanHesapKimlik ON hakedis.DonemDokumuBelgesi (YapanHesapKimlik);
CREATE NONCLUSTERED INDEX IX_hakedis_DonemDokumuBelgesi_KaynakUygulamaKodu ON hakedis.DonemDokumuBelgesi (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumuBelgesi', @Metin = N'Aylık dökümün belgeleri: servis faturası, gider pusulası, banka fişi. Kısmi ödeme ya da yeniden kesilen fatura için bir döküme birden çok belge bağlanır. Belgenin ne olduğu, tutarı ve tarihi entegrasyon.BelgeBagi tablosundadır. Satır yalnız eklenir.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumuBelgesi', @Alt = N'DonemDokumuKimlik', @Metin = N'Belgenin bağlandığı aylık döküm (hakedis.DonemDokumu).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumuBelgesi', @Alt = N'BelgeBagiKimlik', @Metin = N'Bağlanan dış sistem belgesi (entegrasyon.BelgeBagi); belge türü orada BelgeTuruKodu kolonundadır.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumuBelgesi', @Alt = N'YapanTuruKodu', @Metin = N'Belgeyi bağlayanın türü (kod.AktorTuru: musteri, personel, servis, sistem, entegrasyon).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumuBelgesi', @Alt = N'YapanKullaniciKimlik', @Metin = N'Belgeyi bağlayan personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyon için boş.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumuBelgesi', @Alt = N'YapanHesapKimlik', @Metin = N'Belgeyi bağlayan müşteri hesabı (musteri.Hesap). Yalnız müşteri için dolu.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumuBelgesi', @Alt = N'YapanAdi', @Metin = N'Belgeyi bağlayanın o anki adı (personel ya da servis). Müşteri için boş.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumuBelgesi', @Alt = N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama (kod.KaynakUygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumuBelgesi', @Alt = N'UygulamaSurumu', @Metin = N'Kaydın geldiği uygulamanın sürümü (ör. 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'DonemDokumuBelgesi', @Alt = N'OlusmaZamani', @Metin = N'Belgenin döküme bağlandığı an (UTC).';
GO

/* ------------------------------------------ hakedis.ServisHesapHareketi */

CREATE TABLE hakedis.ServisHesapHareketi (
    Tutar                       decimal(18,2) NOT NULL,
    Aciklama                    nvarchar(300) COLLATE Turkish_100_CI_AS NULL,
    HareketZamani               datetime2(3) NOT NULL
        CONSTRAINT DF_hakedis_ServisHesapHareketi_HareketZamani DEFAULT SYSUTCDATETIME(),
    ServisKimlik                uniqueidentifier NOT NULL
        CONSTRAINT FK_hakedis_ServisHesapHareketi_servis_Servis REFERENCES servis.Servis (Kimlik),
    SirketKodu                  nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_hakedis_ServisHesapHareketi_sirket_Sirket REFERENCES sirket.Sirket (Kod),
    MarkaKodu                   nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL
        CONSTRAINT FK_hakedis_ServisHesapHareketi_katalog_Marka REFERENCES katalog.Marka (Kod),
    HareketTuruKodu             nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YonKodu                     nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    ParaBirimiKodu              nvarchar(3) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_hakedis_ServisHesapHareketi_kod_ParaBirimi REFERENCES kod.ParaBirimi (Kod),
    HakEdisKimlik               uniqueidentifier NULL,
    ParcaTalepKimlik            uniqueidentifier NULL,
    DuzeltilenHareketKimlik     uniqueidentifier NULL
        CONSTRAINT FK_hakedis_ServisHesapHareketi_hakedis_ServisHesapHareketi_Duzeltilen
        REFERENCES hakedis.ServisHesapHareketi (Kimlik),
    DonemDokumuKimlik           uniqueidentifier NULL,
    BelgeBagiKimlik             uniqueidentifier NULL
        CONSTRAINT FK_hakedis_ServisHesapHareketi_entegrasyon_BelgeBagi REFERENCES entegrasyon.BelgeBagi (Kimlik),
    GeriAlinmaZamani            datetime2(3) NULL,
    YapanTuruKodu               nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_hakedis_ServisHesapHareketi_kod_AktorTuru_Yapan REFERENCES kod.AktorTuru (Kod),
    YapanKullaniciKimlik        uniqueidentifier NULL
        CONSTRAINT FK_hakedis_ServisHesapHareketi_erisim_Kullanici_Yapan REFERENCES erisim.Kullanici (Kimlik),
    YapanHesapKimlik            uniqueidentifier NULL
        CONSTRAINT FK_hakedis_ServisHesapHareketi_musteri_Hesap_Yapan REFERENCES musteri.Hesap (Kimlik),
    YapanAdi                    nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu          nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_hakedis_ServisHesapHareketi_kod_KaynakUygulama REFERENCES kod.KaynakUygulama (Kod),
    UygulamaSurumu              nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani                datetime2(3) NOT NULL
        CONSTRAINT DF_hakedis_ServisHesapHareketi_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                     bigint IDENTITY(1,1) NOT NULL,
    Kimlik                      uniqueidentifier NOT NULL
        CONSTRAINT DF_hakedis_ServisHesapHareketi_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_hakedis_ServisHesapHareketi PRIMARY KEY NONCLUSTERED (Kimlik),
    /* Yön, hareket türünün yönüyle çelişemez (bayrak kopyası, Bölüm 1.17.2). */
    CONSTRAINT FK_hakedis_ServisHesapHareketi_kod_HesapHareketTuru
        FOREIGN KEY (HareketTuruKodu, YonKodu)
        REFERENCES kod.HesapHareketTuru (Kod, YonKodu),
    CONSTRAINT FK_hakedis_ServisHesapHareketi_hakedis_HakEdis
        FOREIGN KEY (HakEdisKimlik, ServisKimlik, SirketKodu, ParaBirimiKodu)
        REFERENCES hakedis.HakEdis (Kimlik, ServisKimlik, SirketKodu, ParaBirimiKodu),
    CONSTRAINT FK_hakedis_ServisHesapHareketi_talep_Talep_Parca
        FOREIGN KEY (ParcaTalepKimlik, ServisKimlik)
        REFERENCES talep.Talep (Kimlik, ServisKimlik),
    CONSTRAINT FK_hakedis_ServisHesapHareketi_hakedis_DonemDokumu
        FOREIGN KEY (DonemDokumuKimlik, ServisKimlik, SirketKodu, ParaBirimiKodu)
        REFERENCES hakedis.DonemDokumu (Kimlik, ServisKimlik, SirketKodu, ParaBirimiKodu),
    CONSTRAINT CK_hakedis_ServisHesapHareketi_Tutar CHECK (Tutar > 0),
    CONSTRAINT CK_hakedis_ServisHesapHareketi_Odeme
        CHECK (HareketTuruKodu <> N'odeme' OR (DonemDokumuKimlik IS NOT NULL AND BelgeBagiKimlik IS NOT NULL)),
    CONSTRAINT CK_hakedis_ServisHesapHareketi_Duzeltilen
        CHECK (DuzeltilenHareketKimlik IS NULL OR DuzeltilenHareketKimlik <> Kimlik),
    /* Her hareket türünün zorunlu bağı (tasarim.md 1.9.3). Bağsız satır
       UX_…_HakEdisAlacagi / UX_…_ParcaSiparisiBorcu filtrelerinin dışında
       kalıp çift alacak ya da borç yazdırabilirdi. Tek koda özgü,
       "içerme" biçimli şartlar (Bölüm 1.17.1); yeni tür bunlara takılmaz. */
    CONSTRAINT CK_hakedis_ServisHesapHareketi_HakEdisBagi
        CHECK (HareketTuruKodu <> N'hakEdisAlacagi' OR HakEdisKimlik IS NOT NULL),
    CONSTRAINT CK_hakedis_ServisHesapHareketi_ParcaBagi
        CHECK (HareketTuruKodu <> N'parcaSiparisiBorcu' OR ParcaTalepKimlik IS NOT NULL),
    CONSTRAINT CK_hakedis_ServisHesapHareketi_DuzeltmeAlacakBagi
        CHECK (HareketTuruKodu <> N'duzeltmeAlacak' OR DuzeltilenHareketKimlik IS NOT NULL),
    CONSTRAINT CK_hakedis_ServisHesapHareketi_DuzeltmeBorcBagi
        CHECK (HareketTuruKodu <> N'duzeltmeBorc' OR DuzeltilenHareketKimlik IS NOT NULL),
    CONSTRAINT CK_hakedis_ServisHesapHareketi_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_hakedis_ServisHesapHareketi_KayitNo ON hakedis.ServisHesapHareketi (KayitNo);

/* Bir hak edişe tek etkin alacak; geri alınınca yenisi yazılabilir (KS-20). */
CREATE UNIQUE NONCLUSTERED INDEX UX_hakedis_ServisHesapHareketi_HakEdisAlacagi
    ON hakedis.ServisHesapHareketi (HakEdisKimlik)
    WHERE HareketTuruKodu = N'hakEdisAlacagi' AND GeriAlinmaZamani IS NULL AND HakEdisKimlik IS NOT NULL;
/* Bir parça siparişine tek etkin borç (yeniden kapanışta çift borç olmaz, KOD 3.10). */
CREATE UNIQUE NONCLUSTERED INDEX UX_hakedis_ServisHesapHareketi_ParcaSiparisiBorcu
    ON hakedis.ServisHesapHareketi (ParcaTalepKimlik)
    WHERE HareketTuruKodu = N'parcaSiparisiBorcu' AND GeriAlinmaZamani IS NULL AND ParcaTalepKimlik IS NOT NULL;
/* Bir harekete tek ters hareket. */
CREATE UNIQUE NONCLUSTERED INDEX UX_hakedis_ServisHesapHareketi_Duzeltilen
    ON hakedis.ServisHesapHareketi (DuzeltilenHareketKimlik)
    WHERE DuzeltilenHareketKimlik IS NOT NULL;

/* Bakiye ve hareket listesi (gorunum.ServisBakiyesi, gorunum.ServisHesapHareketleri). */
CREATE NONCLUSTERED INDEX IX_hakedis_ServisHesapHareketi_ServisKimlikSirketKoduParaBirimiKoduHareketZamani
    ON hakedis.ServisHesapHareketi (ServisKimlik, SirketKodu, ParaBirimiKodu, HareketZamani)
    INCLUDE (YonKodu, Tutar);
CREATE NONCLUSTERED INDEX IX_hakedis_ServisHesapHareketi_SirketKodu ON hakedis.ServisHesapHareketi (SirketKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_ServisHesapHareketi_MarkaKodu ON hakedis.ServisHesapHareketi (MarkaKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_ServisHesapHareketi_HareketTuruKoduYonKodu
    ON hakedis.ServisHesapHareketi (HareketTuruKodu, YonKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_ServisHesapHareketi_ParaBirimiKodu ON hakedis.ServisHesapHareketi (ParaBirimiKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_ServisHesapHareketi_HakEdisKimlikServisKimlikSirketKoduParaBirimiKodu
    ON hakedis.ServisHesapHareketi (HakEdisKimlik, ServisKimlik, SirketKodu, ParaBirimiKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_ServisHesapHareketi_ParcaTalepKimlikServisKimlik
    ON hakedis.ServisHesapHareketi (ParcaTalepKimlik, ServisKimlik);
CREATE NONCLUSTERED INDEX IX_hakedis_ServisHesapHareketi_DuzeltilenHareketKimlik
    ON hakedis.ServisHesapHareketi (DuzeltilenHareketKimlik);
CREATE NONCLUSTERED INDEX IX_hakedis_ServisHesapHareketi_DonemDokumuKimlikServisKimlikSirketKoduParaBirimiKodu
    ON hakedis.ServisHesapHareketi (DonemDokumuKimlik, ServisKimlik, SirketKodu, ParaBirimiKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_ServisHesapHareketi_BelgeBagiKimlik ON hakedis.ServisHesapHareketi (BelgeBagiKimlik);
CREATE NONCLUSTERED INDEX IX_hakedis_ServisHesapHareketi_YapanTuruKodu ON hakedis.ServisHesapHareketi (YapanTuruKodu);
CREATE NONCLUSTERED INDEX IX_hakedis_ServisHesapHareketi_YapanKullaniciKimlik ON hakedis.ServisHesapHareketi (YapanKullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_hakedis_ServisHesapHareketi_YapanHesapKimlik ON hakedis.ServisHesapHareketi (YapanHesapKimlik);
CREATE NONCLUSTERED INDEX IX_hakedis_ServisHesapHareketi_KaynakUygulamaKodu ON hakedis.ServisHesapHareketi (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Metin = N'Servisin PAKSAN''la hesap hareketleri: hak ediş alacağı, parça siparişi borcu, ödeme ve düzeltmeler. Bilgi amaçlıdır; muhasebede esas LOGO cari ekstresidir. Satır silinmez, tutarı değişmez: yanlış hareket ters hareketle (DuzeltilenHareketKimlik) düzeltilir ve asıl satıra GeriAlinmaZamani yazılır. Bakiye servis, şirket ve para birimine göre ayrı hesaplanır (gorunum.ServisBakiyesi).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'Tutar', @Metin = N'Hareketin cari etkisi: KDV dahil, tevkifat ve stopaj düşülmüş, işaretsiz, sıfırdan büyük. Alacak mı borç mu olduğu YonKodu kolonundadır; para birimi ParaBirimiKodu kolonundadır. Hak ediş alacağında ve parça siparişi borcunda kaynağıyla eşitliği tetikleyiciyle denetlenir.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'Aciklama', @Metin = N'Personelin kısa notu (yalnız iç kullanım; servise gösterilmez).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'HareketZamani', @Metin = N'Hareketin tarihi ve saati (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'ServisKimlik', @Metin = N'Hareketin ait olduğu servis (servis.Servis).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'SirketKodu', @Metin = N'Hareketin ait olduğu şirket (sirket.Sirket): kaynağının şirketi; markasız ödemede ödeyen şirket. Yazıldıktan sonra değişmez.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'MarkaKodu', @Metin = N'Hareketin markası (katalog.Marka). Markasız hareketlerde (ör. ödeme) boş.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'HareketTuruKodu', @Metin = N'Hareketin türü (kod.HesapHareketTuru: hakEdisAlacagi, parcaSiparisiBorcu, odeme, duzeltmeAlacak, duzeltmeBorc).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'YonKodu', @Metin = N'Servis açısından yön: alacak ya da borc. Hareket türünün kod tablosundaki yönüyle aynı olmak zorundadır.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'ParaBirimiKodu', @Metin = N'Tutarın para birimi (kod.ParaBirimi). Farklı para birimleri birbirine eklenmez.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'HakEdisKimlik', @Metin = N'Alacağın kaynağı olan hak ediş (hakedis.HakEdis); aynı servis, şirket ve para biriminde olmak zorundadır. hakEdisAlacagi hareketinde zorunludur. Bir hak edişe tek etkin alacak hareketi olur.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'ParcaTalepKimlik', @Metin = N'Borcun kaynağı olan servis parça siparişi (talep.Talep, SPS numaralı); siparişi veren serviste olmak zorundadır. parcaSiparisiBorcu hareketinde zorunludur. Bir siparişe tek etkin borç hareketi olur.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'DuzeltilenHareketKimlik', @Metin = N'Bu satır ters (düzeltme) hareketiyse geri aldığı asıl hareket; duzeltmeAlacak ve duzeltmeBorc hareketlerinde zorunludur. Bir harekete tek ters hareket olur; ters hareketin tutarı asılla aynı, yönü terstir.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'DonemDokumuKimlik', @Metin = N'Hareketin bağlandığı aylık döküm (hakedis.DonemDokumu); aynı servis, şirket ve para biriminde olmak zorundadır. Ödeme hareketinde zorunlu; ters hareket döküme bağlanmaz.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'BelgeBagiKimlik', @Metin = N'Hareketi belgeleyen dış sistem belgesi (entegrasyon.BelgeBagi), ör. banka fişi. Ödeme hareketinde zorunlu.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'GeriAlinmaZamani', @Metin = N'Hareketin ters hareketle geri alındığı an (UTC). Yalnız yonetim prosedürleri yazar; bir kez, boştan dolu değere.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'YapanTuruKodu', @Metin = N'Hareketi yazanın türü (kod.AktorTuru: musteri, personel, servis, sistem, entegrasyon).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'YapanKullaniciKimlik', @Metin = N'Hareketi yazan personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyon için boş.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'YapanHesapKimlik', @Metin = N'Hareketi yazan müşteri hesabı (musteri.Hesap). Yalnız müşteri için dolu.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'YapanAdi', @Metin = N'Hareketi yazanın o anki adı (personel ya da servis). Müşteri için boş.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama (kod.KaynakUygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'UygulamaSurumu', @Metin = N'Kaydın geldiği uygulamanın sürümü (ör. 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'OlusmaZamani', @Metin = N'Satırın yazıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'KayitNo', @Metin = N'Satırı SSMS''te ve yonetim prosedürlerinde (@HareketKayitNo) seçmek için sıra numarası. İş anlamı yoktur, ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda görünmez.';
GO
