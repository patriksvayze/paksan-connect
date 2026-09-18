/* ==========================================================================
   V0008 — bayi ve servis şemaları

   Kural kaynağı: veritabani/tasarim.md (Bölüm 0.4 "servis / bayi",
   1.3.6 kalıp grupları, 1.11.1 sistem sürümlü tablolar, 1.17.3 zamanla
   bitebilen yetki, 6.2 betik sırası).

   Sıra: bayi.Bayi, bayi.MarkaYetkisi, servis.Servis, servis.FaturaBilgisi,
   servis.BayiBagi, servis.Bolge, servis.MarkaYetkisi, servis.GirisHesabi,
   servis.SifreYardimTalebi; sonunda musteri.Hesap → bayi.Bayi ileri
   yabancı anahtarı (Bölüm 6.3) ve geçmiş tablolarının açıklamaları.

   Önce gelen betikler: V0001 (şemalar, dbo.AciklamaYaz), V0002 (kod),
   V0003 (cografya), V0004 (katalog), V0005 (erisim), V0006 (musteri).

   Yetkiler (GRANT/DENY) V0015'te verilir.
   ========================================================================== */


/* --------------------------------------------------------------------------
   bayi.Bayi — makineyi satan firma [K] [O] [R] [E] [T]
   -------------------------------------------------------------------------- */

CREATE TABLE bayi.Bayi (
    Ad                   nvarchar(200) COLLATE Turkish_100_CI_AS NOT NULL,
    AdArama AS CAST(LOWER(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
          Ad COLLATE Latin1_General_100_BIN2,
          N'ç',N'c'), N'Ç',N'C'), N'ğ',N'g'), N'Ğ',N'G'), N'ı',N'i'), N'İ',N'I'),
          N'ö',N'o'), N'Ö',N'O'), N'ş',N's'), N'Ş',N'S'), N'ü',N'u'), N'Ü',N'U'),
          N'â',N'a'), N'Â',N'A'), N'î',N'i'), N'Î',N'I'), N'û',N'u'), N'Û',N'U')
      ) AS nvarchar(200)) PERSISTED,
    PilotKatilimcisi     bit NOT NULL
        CONSTRAINT DF_bayi_Bayi_PilotKatilimcisi DEFAULT 0,
    DurumKodu            nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    IlKodu               tinyint NOT NULL,
    IlceKodu             int NULL,
    Adres                nvarchar(500) COLLATE Turkish_100_CI_AS NULL,
    TelefonE164          nvarchar(16) COLLATE Latin1_General_100_BIN2 NULL,
    PasifZamani          datetime2(3) NULL,
    OlusmaZamani         datetime2(3) NOT NULL
        CONSTRAINT DF_bayi_Bayi_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo              bigint IDENTITY(1,1) NOT NULL,
    Kimlik               uniqueidentifier NOT NULL
        CONSTRAINT DF_bayi_Bayi_Kimlik DEFAULT NEWID(),
    EskiKayitNo          nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
    EskiNumara           nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    SatirSurumu          rowversion NOT NULL,
    GecerlilikBaslangici datetime2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    GecerlilikBitisi     datetime2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (GecerlilikBaslangici, GecerlilikBitisi),

    CONSTRAINT PK_bayi_Bayi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_bayi_Bayi_kod_FirmaDurumu
        FOREIGN KEY (DurumKodu) REFERENCES kod.FirmaDurumu (Kod),
    CONSTRAINT FK_bayi_Bayi_cografya_Il
        FOREIGN KEY (IlKodu) REFERENCES cografya.Il (IlKodu),
    CONSTRAINT FK_bayi_Bayi_cografya_Ilce
        FOREIGN KEY (IlKodu, IlceKodu) REFERENCES cografya.Ilce (IlKodu, IlceKodu),
    CONSTRAINT CK_bayi_Bayi_Ad
        CHECK (LEN(LTRIM(Ad)) > 0),
    CONSTRAINT CK_bayi_Bayi_TelefonE164
        CHECK (TelefonE164 IS NULL OR (TelefonE164 LIKE N'+[1-9]%' AND SUBSTRING(TelefonE164, 2, 15) NOT LIKE N'%[^0-9]%' AND LEN(TelefonE164) BETWEEN 8 AND 16))
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = gecmis.bayi_Bayi, DATA_CONSISTENCY_CHECK = ON));

CREATE UNIQUE CLUSTERED INDEX CX_bayi_Bayi_KayitNo ON bayi.Bayi (KayitNo);
CREATE NONCLUSTERED INDEX IX_bayi_Bayi_AdArama ON bayi.Bayi (AdArama);
CREATE NONCLUSTERED INDEX IX_bayi_Bayi_DurumKodu ON bayi.Bayi (DurumKodu);
CREATE NONCLUSTERED INDEX IX_bayi_Bayi_IlKoduIlceKodu ON bayi.Bayi (IlKodu, IlceKodu);
CREATE NONCLUSTERED INDEX IX_bayi_Bayi_EskiNumara ON bayi.Bayi (EskiNumara) WHERE EskiNumara IS NOT NULL;

EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'Bayi', @Metin = N'Makineyi satan bayi firması. Bayinin paneli yoktur; kayıt, makinenin nereden satıldığını ve müşteriye hangi servisin bakacağını bulmak için tutulur. Satır silinmez: çalışmayı bırakan bayi pasif yapılır. Eski hâller gecmis.bayi_Bayi tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'Bayi', @Alt = N'Ad', @Metin = N'Bayinin ekranda görünen adı. Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz. Adı Türkçe harfsiz aramak için AdArama kolonunu LIKE N''%isik%'' biçiminde kullanın.';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'Bayi', @Alt = N'AdArama', @Metin = N'Adın Türkçe harfsiz, küçük harfli hâli (Işık → isik). Aramada LIKE ile kullanılır; SQL Server kendisi hesaplar. Aranacak metni küçük harfle ve Türkçe harfsiz yazın: WHERE AdArama LIKE N''%isik%''.';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'Bayi', @Alt = N'PilotKatilimcisi', @Metin = N'Bayi pilot uygulamaya katılıyorsa 1, katılmıyorsa 0.';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'Bayi', @Alt = N'DurumKodu', @Metin = N'Bayinin durumu: aktif ya da pasif (kod.FirmaDurumu).';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'Bayi', @Alt = N'IlKodu', @Metin = N'Bayinin bulunduğu il, plaka koduyla (cografya.Il; 42 = Konya).';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'Bayi', @Alt = N'IlceKodu', @Metin = N'Bayinin bulunduğu ilçe (cografya.Ilce). Girilmemişse boş.';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'Bayi', @Alt = N'Adres', @Metin = N'Bayinin açık adresi. Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz.';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'Bayi', @Alt = N'TelefonE164', @Metin = N'Bayinin telefonu; ülke koduyla, boşluksuz (+903323210001).';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'Bayi', @Alt = N'PasifZamani', @Metin = N'Bayinin pasif yapıldığı an (UTC). Aktif bayide boş.';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'Bayi', @Alt = N'OlusmaZamani', @Metin = N'Satırın veritabanına yazıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'Bayi', @Alt = N'KayitNo', @Metin = N'Yalnız veritabanında satır seçmek içindir (yonetim prosedürlerinde @BayiKayitNo); ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'Bayi', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda ve gorunum görünümlerinde yer almaz.';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'Bayi', @Alt = N'EskiKayitNo', @Metin = N'Eski uygulamadaki kimlik (taşıma için; örnek konya-merkez).';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'Bayi', @Alt = N'EskiNumara', @Metin = N'Eski uygulamadaki bayi numarası (taşıma için; örnek BAY001). Yeniden verilmez.';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'Bayi', @Alt = N'SatirSurumu', @Metin = N'Aynı satırı iki kişinin aynı anda değiştirmesini önleyen sürüm damgası. SQL Server kendisi yazar.';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'Bayi', @Alt = N'GecerlilikBaslangici', @Metin = N'Satırın bu hâlinin geçerli olmaya başladığı an (UTC). SQL Server kendisi yazar; SELECT * ile görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'Bayi', @Alt = N'GecerlilikBitisi', @Metin = N'Satırın bu hâlinin geçerliliğinin bittiği an (UTC). Güncel satırda 9999-12-31. SQL Server kendisi yazar; SELECT * ile görünmez.';
GO


/* --------------------------------------------------------------------------
   bayi.MarkaYetkisi — bayinin satabildiği markalar [T]

   Yetki bitince satır silinmez, BitisZamani yazılır; yeniden verilince
   aynı satır güncellenir (BitisZamani = NULL, BaslangicZamani = şimdi).
   Eski dönemler gecmis.bayi_MarkaYetkisi tablosunda kalır.
   -------------------------------------------------------------------------- */

CREATE TABLE bayi.MarkaYetkisi (
    BayiKimlik           uniqueidentifier NOT NULL,
    MarkaKodu            nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    VerenKullaniciKimlik uniqueidentifier NULL,
    BaslangicZamani      datetime2(3) NOT NULL
        CONSTRAINT DF_bayi_MarkaYetkisi_BaslangicZamani DEFAULT SYSUTCDATETIME(),
    BitisZamani          datetime2(3) NULL,
    Etkin AS CAST(CASE WHEN BitisZamani IS NULL THEN 1 ELSE 0 END AS bit) PERSISTED NOT NULL,
    GecerlilikBaslangici datetime2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    GecerlilikBitisi     datetime2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (GecerlilikBaslangici, GecerlilikBitisi),

    CONSTRAINT PK_bayi_MarkaYetkisi PRIMARY KEY CLUSTERED (BayiKimlik, MarkaKodu),
    CONSTRAINT UQ_bayi_MarkaYetkisi_BayiKimlikMarkaKoduEtkin UNIQUE (BayiKimlik, MarkaKodu, Etkin),
    CONSTRAINT FK_bayi_MarkaYetkisi_bayi_Bayi
        FOREIGN KEY (BayiKimlik) REFERENCES bayi.Bayi (Kimlik),
    CONSTRAINT FK_bayi_MarkaYetkisi_katalog_Marka
        FOREIGN KEY (MarkaKodu) REFERENCES katalog.Marka (Kod),
    CONSTRAINT FK_bayi_MarkaYetkisi_erisim_Kullanici_Veren
        FOREIGN KEY (VerenKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT CK_bayi_MarkaYetkisi_BitisZamani
        CHECK (BitisZamani IS NULL OR BitisZamani >= BaslangicZamani)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = gecmis.bayi_MarkaYetkisi, DATA_CONSISTENCY_CHECK = ON));

CREATE NONCLUSTERED INDEX IX_bayi_MarkaYetkisi_MarkaKoduEtkin ON bayi.MarkaYetkisi (MarkaKodu, Etkin);
CREATE NONCLUSTERED INDEX IX_bayi_MarkaYetkisi_VerenKullaniciKimlik ON bayi.MarkaYetkisi (VerenKullaniciKimlik);

EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'MarkaYetkisi', @Metin = N'Bayinin hangi markaları satabildiği. Yetki bitince satır silinmez, BitisZamani yazılır; yeniden verilince aynı satır açılır. Eski dönemler gecmis.bayi_MarkaYetkisi tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'MarkaYetkisi', @Alt = N'BayiKimlik', @Metin = N'Yetkinin verildiği bayi (bayi.Bayi).';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'MarkaYetkisi', @Alt = N'MarkaKodu', @Metin = N'Yetkinin verildiği marka (katalog.Marka; örnek paksan).';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'MarkaYetkisi', @Alt = N'VerenKullaniciKimlik', @Metin = N'Yetkiyi veren personel (erisim.Kullanici). Tohum ve taşımayla gelen satırda boş.';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'MarkaYetkisi', @Alt = N'BaslangicZamani', @Metin = N'Yetkinin (son kez) verildiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'MarkaYetkisi', @Alt = N'BitisZamani', @Metin = N'Yetkinin alındığı an (UTC). Yetki sürüyorsa boş.';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'MarkaYetkisi', @Alt = N'Etkin', @Metin = N'Yetki bugün geçerliyse 1, alınmışsa 0. BitisZamani''ndan SQL Server kendisi hesaplar.';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'MarkaYetkisi', @Alt = N'GecerlilikBaslangici', @Metin = N'Satırın bu hâlinin geçerli olmaya başladığı an (UTC). SQL Server kendisi yazar; SELECT * ile görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'bayi', @Nesne = N'MarkaYetkisi', @Alt = N'GecerlilikBitisi', @Metin = N'Satırın bu hâlinin geçerliliğinin bittiği an (UTC). Güncel satırda 9999-12-31. SQL Server kendisi yazar; SELECT * ile görünmez.';
GO


/* --------------------------------------------------------------------------
   servis.Servis — kurulum, bakım ve tamir yapan firma [K] [O] [R] [E] [T]

   Giriş açıklığının tek kaynağı erisim.Kullanici.Aktif'tir; firmanın
   çalışıp çalışmadığı DurumKodu'ndadır (Bölüm 0.3 K26).
   -------------------------------------------------------------------------- */

CREATE TABLE servis.Servis (
    Ad                   nvarchar(200) COLLATE Turkish_100_CI_AS NOT NULL,
    AdArama AS CAST(LOWER(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
          Ad COLLATE Latin1_General_100_BIN2,
          N'ç',N'c'), N'Ç',N'C'), N'ğ',N'g'), N'Ğ',N'G'), N'ı',N'i'), N'İ',N'I'),
          N'ö',N'o'), N'Ö',N'O'), N'ş',N's'), N'Ş',N'S'), N'ü',N'u'), N'Ü',N'U'),
          N'â',N'a'), N'Â',N'A'), N'î',N'i'), N'Î',N'I'), N'û',N'u'), N'Û',N'U')
      ) AS nvarchar(200)) PERSISTED,
    PilotKatilimcisi     bit NOT NULL
        CONSTRAINT DF_servis_Servis_PilotKatilimcisi DEFAULT 0,
    TurKodu              nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    DurumKodu            nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    IlKodu               tinyint NOT NULL,
    IlceKodu             int NULL,
    Adres                nvarchar(500) COLLATE Turkish_100_CI_AS NULL,
    TelefonE164          nvarchar(16) COLLATE Latin1_General_100_BIN2 NULL,
    PasifZamani          datetime2(3) NULL,
    OlusmaZamani         datetime2(3) NOT NULL
        CONSTRAINT DF_servis_Servis_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo              bigint IDENTITY(1,1) NOT NULL,
    Kimlik               uniqueidentifier NOT NULL
        CONSTRAINT DF_servis_Servis_Kimlik DEFAULT NEWID(),
    EskiKayitNo          nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
    EskiNumara           nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    SatirSurumu          rowversion NOT NULL,
    GecerlilikBaslangici datetime2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    GecerlilikBitisi     datetime2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (GecerlilikBaslangici, GecerlilikBitisi),

    CONSTRAINT PK_servis_Servis PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_servis_Servis_kod_ServisTuru
        FOREIGN KEY (TurKodu) REFERENCES kod.ServisTuru (Kod),
    CONSTRAINT FK_servis_Servis_kod_FirmaDurumu
        FOREIGN KEY (DurumKodu) REFERENCES kod.FirmaDurumu (Kod),
    CONSTRAINT FK_servis_Servis_cografya_Il
        FOREIGN KEY (IlKodu) REFERENCES cografya.Il (IlKodu),
    CONSTRAINT FK_servis_Servis_cografya_Ilce
        FOREIGN KEY (IlKodu, IlceKodu) REFERENCES cografya.Ilce (IlKodu, IlceKodu),
    CONSTRAINT CK_servis_Servis_Ad
        CHECK (LEN(LTRIM(Ad)) > 0),
    CONSTRAINT CK_servis_Servis_TelefonE164
        CHECK (TelefonE164 IS NULL OR (TelefonE164 LIKE N'+[1-9]%' AND SUBSTRING(TelefonE164, 2, 15) NOT LIKE N'%[^0-9]%' AND LEN(TelefonE164) BETWEEN 8 AND 16))
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = gecmis.servis_Servis, DATA_CONSISTENCY_CHECK = ON));

CREATE UNIQUE CLUSTERED INDEX CX_servis_Servis_KayitNo ON servis.Servis (KayitNo);
CREATE NONCLUSTERED INDEX IX_servis_Servis_AdArama ON servis.Servis (AdArama);
CREATE NONCLUSTERED INDEX IX_servis_Servis_TurKodu ON servis.Servis (TurKodu);
CREATE NONCLUSTERED INDEX IX_servis_Servis_DurumKodu ON servis.Servis (DurumKodu);
CREATE NONCLUSTERED INDEX IX_servis_Servis_IlKoduIlceKodu ON servis.Servis (IlKodu, IlceKodu);
CREATE NONCLUSTERED INDEX IX_servis_Servis_TelefonE164 ON servis.Servis (TelefonE164) WHERE TelefonE164 IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_servis_Servis_EskiNumara ON servis.Servis (EskiNumara) WHERE EskiNumara IS NOT NULL;

EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Metin = N'Kurulum, bakım ve tamir yapan servis firması. İşini PAKSAN''a raporlar, hak edişini PAKSAN''dan alır. Satır silinmez: çalışmayı bırakan servis pasif yapılır. Girişin açık olup olmadığı erisim.Kullanici.Aktif''tedir. Eski hâller gecmis.servis_Servis tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Alt = N'Ad', @Metin = N'Servisin ekranda görünen adı. Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz. Adı Türkçe harfsiz aramak için AdArama kolonunu LIKE N''%isik%'' biçiminde kullanın.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Alt = N'AdArama', @Metin = N'Adın Türkçe harfsiz, küçük harfli hâli (IŞIK Makina → isik makina). Aramada LIKE ile kullanılır; SQL Server kendisi hesaplar. Aranacak metni küçük harfle ve Türkçe harfsiz yazın: WHERE AdArama LIKE N''%isik%''.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Alt = N'PilotKatilimcisi', @Metin = N'Servis pilot uygulamaya katılıyorsa 1, katılmıyorsa 0.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Alt = N'TurKodu', @Metin = N'Servis şahıs mı, tüzel kişi mi (kod.ServisTuru). Hak edişin nasıl ödeneceğini belirler.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Alt = N'DurumKodu', @Metin = N'Servisin durumu: aktif ya da pasif (kod.FirmaDurumu). Pasif servise makine atanmaz, talep bağlanmaz.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Alt = N'IlKodu', @Metin = N'Servisin bulunduğu il, plaka koduyla (cografya.Il; 42 = Konya).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Alt = N'IlceKodu', @Metin = N'Servisin bulunduğu ilçe (cografya.Ilce). Girilmemişse boş.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Alt = N'Adres', @Metin = N'Servisin açık adresi. Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Alt = N'TelefonE164', @Metin = N'Servisin telefonu; ülke koduyla, boşluksuz (+903323450014).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Alt = N'PasifZamani', @Metin = N'Servisin pasif yapıldığı an (UTC). Aktif serviste boş.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Alt = N'OlusmaZamani', @Metin = N'Satırın veritabanına yazıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Alt = N'KayitNo', @Metin = N'Yalnız veritabanında satır seçmek içindir (yonetim prosedürlerinde @ServisKayitNo); ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda ve gorunum görünümlerinde yer almaz.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Alt = N'EskiKayitNo', @Metin = N'Eski uygulamadaki kimlik (taşıma için; örnek konya-servis).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Alt = N'EskiNumara', @Metin = N'Eski uygulamadaki servis numarası (taşıma için; örnek SRV014). Talep numarası değildir, yeniden verilmez.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Alt = N'SatirSurumu', @Metin = N'Aynı satırı iki kişinin aynı anda değiştirmesini önleyen sürüm damgası. SQL Server kendisi yazar.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Alt = N'GecerlilikBaslangici', @Metin = N'Satırın bu hâlinin geçerli olmaya başladığı an (UTC). SQL Server kendisi yazar; SELECT * ile görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Servis', @Alt = N'GecerlilikBitisi', @Metin = N'Satırın bu hâlinin geçerliliğinin bittiği an (UTC). Güncel satırda 9999-12-31. SQL Server kendisi yazar; SELECT * ile görünmez.';
GO


/* --------------------------------------------------------------------------
   servis.FaturaBilgisi — hak ediş ödemesi için cari hesap bilgisi [R] [G]

   Vergi numarası (ya da TC) ve IBAN uygulamada AES-256-GCM ile
   şifrelenir; eşleştirme HMAC özetiyle, liste ekranı maskeli değerle
   yapılır (Bölüm 1.14.1). Üçlüler birlikte dolu ya da birlikte boştur.
   -------------------------------------------------------------------------- */

CREATE TABLE servis.FaturaBilgisi (
    Unvan                nvarchar(250) COLLATE Turkish_100_CI_AS NOT NULL,
    VergiDairesi         nvarchar(100) COLLATE Turkish_100_CI_AS NULL,
    IbanHesapAdi         nvarchar(200) COLLATE Turkish_100_CI_AS NULL,
    ServisKimlik         uniqueidentifier NOT NULL,
    VergiNoTuruKodu      nvarchar(10) COLLATE Latin1_General_100_BIN2 NOT NULL,
    Adres                nvarchar(500) COLLATE Turkish_100_CI_AS NULL,
    VergiNoSifreli       varbinary(512) NULL,
    VergiNoOzeti         binary(32) NULL,
    VergiNoMaskeli       nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    IbanSifreli          varbinary(512) NULL,
    IbanOzeti            binary(32) NULL,
    IbanMaskeli          nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    AnahtarNo            tinyint NULL,
    GuncellemeZamani     datetime2(3) NOT NULL
        CONSTRAINT DF_servis_FaturaBilgisi_GuncellemeZamani DEFAULT SYSUTCDATETIME(),
    SatirSurumu          rowversion NOT NULL,

    CONSTRAINT PK_servis_FaturaBilgisi PRIMARY KEY CLUSTERED (ServisKimlik),
    CONSTRAINT FK_servis_FaturaBilgisi_servis_Servis
        FOREIGN KEY (ServisKimlik) REFERENCES servis.Servis (Kimlik),
    CONSTRAINT CK_servis_FaturaBilgisi_Unvan
        CHECK (LEN(LTRIM(Unvan)) > 0),
    CONSTRAINT CK_servis_FaturaBilgisi_VergiNoTuruKodu
        CHECK (VergiNoTuruKodu IN (N'tcNo', N'vergiNo')),
    CONSTRAINT CK_servis_FaturaBilgisi_VergiNo
        CHECK ((VergiNoSifreli IS NULL AND VergiNoOzeti IS NULL AND VergiNoMaskeli IS NULL)
            OR (VergiNoSifreli IS NOT NULL AND VergiNoOzeti IS NOT NULL AND VergiNoMaskeli IS NOT NULL)),
    CONSTRAINT CK_servis_FaturaBilgisi_Iban
        CHECK ((IbanSifreli IS NULL AND IbanOzeti IS NULL AND IbanMaskeli IS NULL)
            OR (IbanSifreli IS NOT NULL AND IbanOzeti IS NOT NULL AND IbanMaskeli IS NOT NULL)),
    CONSTRAINT CK_servis_FaturaBilgisi_AnahtarNo
        CHECK (AnahtarNo IS NOT NULL OR (VergiNoSifreli IS NULL AND IbanSifreli IS NULL))
);

CREATE NONCLUSTERED INDEX IX_servis_FaturaBilgisi_VergiNoOzeti ON servis.FaturaBilgisi (VergiNoOzeti) WHERE VergiNoOzeti IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_servis_FaturaBilgisi_IbanOzeti ON servis.FaturaBilgisi (IbanOzeti) WHERE IbanOzeti IS NOT NULL;

EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'FaturaBilgisi', @Metin = N'Servisin hak ediş ödemesi için cari hesap bilgisi (backoffice Servisler ekranındaki "Cari Hesap" bölümü). Servis başına en çok bir satır. Vergi numarası ve IBAN şifreli saklanır; ekranda maskeli değer gösterilir.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'FaturaBilgisi', @Alt = N'Unvan', @Metin = N'Faturadaki unvan; şahıs serviste kişinin adı soyadı. Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'FaturaBilgisi', @Alt = N'VergiDairesi', @Metin = N'Vergi dairesi (tüzel kişi serviste sorulur).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'FaturaBilgisi', @Alt = N'IbanHesapAdi', @Metin = N'IBAN''ın bağlı olduğu hesabın sahibinin adı.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'FaturaBilgisi', @Alt = N'ServisKimlik', @Metin = N'Bilginin ait olduğu servis (servis.Servis).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'FaturaBilgisi', @Alt = N'VergiNoTuruKodu', @Metin = N'Numaranın türü: tcNo (şahıs, gider pusulası) ya da vergiNo (tüzel kişi).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'FaturaBilgisi', @Alt = N'Adres', @Metin = N'Fatura ya da gider pusulası adresi (şahıs serviste sorulur).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'FaturaBilgisi', @Alt = N'VergiNoSifreli', @Metin = N'Vergi numarası ya da TC, uygulamada AES-256-GCM ile şifrelenmiş. Veritabanında çözülemez.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'FaturaBilgisi', @Alt = N'VergiNoOzeti', @Metin = N'Vergi numarasının ya da TC''nin HMAC-SHA256 özeti; aynı numarayı eşleştirmek için (Excel içe aktarımı gibi).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'FaturaBilgisi', @Alt = N'VergiNoMaskeli', @Metin = N'Ekranda gösterilen gizlenmiş numara (*********45).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'FaturaBilgisi', @Alt = N'IbanSifreli', @Metin = N'IBAN, uygulamada AES-256-GCM ile şifrelenmiş. Veritabanında çözülemez.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'FaturaBilgisi', @Alt = N'IbanOzeti', @Metin = N'IBAN''ın HMAC-SHA256 özeti; aynı IBAN''ı eşleştirmek için.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'FaturaBilgisi', @Alt = N'IbanMaskeli', @Metin = N'Ekranda gösterilen gizlenmiş IBAN (TR** **** … 12).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'FaturaBilgisi', @Alt = N'AnahtarNo', @Metin = N'Şifreli kolonların hangi anahtarla şifrelendiği (anahtar değiştirilirken kullanılır). Şifreli değer yoksa boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'FaturaBilgisi', @Alt = N'GuncellemeZamani', @Metin = N'Bilginin son değiştirildiği an (UTC). API her güncellemede yazar.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'FaturaBilgisi', @Alt = N'SatirSurumu', @Metin = N'Aynı satırı iki kişinin aynı anda değiştirmesini önleyen sürüm damgası. SQL Server kendisi yazar.';
GO


/* --------------------------------------------------------------------------
   servis.BayiBagi — servisin çalıştığı bayiler [T]

   Zincir: makine → satan bayi → bayinin servisi (makine.MakineninServisi).
   Birden çok servis aynı bayiyle çalışıyorsa Oncelik küçük olan önce gelir.
   -------------------------------------------------------------------------- */

CREATE TABLE servis.BayiBagi (
    Oncelik              smallint NOT NULL
        CONSTRAINT DF_servis_BayiBagi_Oncelik DEFAULT 100,
    ServisKimlik         uniqueidentifier NOT NULL,
    BayiKimlik           uniqueidentifier NOT NULL,
    BaslangicZamani      datetime2(3) NOT NULL
        CONSTRAINT DF_servis_BayiBagi_BaslangicZamani DEFAULT SYSUTCDATETIME(),
    GecerlilikBaslangici datetime2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    GecerlilikBitisi     datetime2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (GecerlilikBaslangici, GecerlilikBitisi),

    CONSTRAINT PK_servis_BayiBagi PRIMARY KEY CLUSTERED (ServisKimlik, BayiKimlik),
    CONSTRAINT FK_servis_BayiBagi_servis_Servis
        FOREIGN KEY (ServisKimlik) REFERENCES servis.Servis (Kimlik),
    CONSTRAINT FK_servis_BayiBagi_bayi_Bayi
        FOREIGN KEY (BayiKimlik) REFERENCES bayi.Bayi (Kimlik)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = gecmis.servis_BayiBagi, DATA_CONSISTENCY_CHECK = ON));

CREATE NONCLUSTERED INDEX IX_servis_BayiBagi_BayiKimlikOncelik ON servis.BayiBagi (BayiKimlik, Oncelik);

EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'BayiBagi', @Metin = N'Servisin anlaşmalı çalıştığı bayiler. Makinenin atanmış servisi yoksa müşterinin servisi, makineyi satan bayinin buradaki servisidir. Bağ kaldırılınca satır silinir; eski bağlar gecmis.servis_BayiBagi tablosunda kalır.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'BayiBagi', @Alt = N'Oncelik', @Metin = N'Aynı bayiyle birden çok servis çalışıyorsa sıra; küçük sayı önce gelir (varsayılan 100).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'BayiBagi', @Alt = N'ServisKimlik', @Metin = N'Bağlı servis (servis.Servis).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'BayiBagi', @Alt = N'BayiKimlik', @Metin = N'Servisin çalıştığı bayi (bayi.Bayi).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'BayiBagi', @Alt = N'BaslangicZamani', @Metin = N'Bağın kurulduğu an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'BayiBagi', @Alt = N'GecerlilikBaslangici', @Metin = N'Satırın bu hâlinin geçerli olmaya başladığı an (UTC). SQL Server kendisi yazar; SELECT * ile görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'BayiBagi', @Alt = N'GecerlilikBitisi', @Metin = N'Satırın bu hâlinin geçerliliğinin bittiği an (UTC). Güncel satırda 9999-12-31. SQL Server kendisi yazar; SELECT * ile görünmez.';
GO


/* --------------------------------------------------------------------------
   servis.Bolge — servisin sorumluluk bölgesi [K] [T]

   IlceKodu boşsa bütün il. Bölge bir kısıt değildir: personel makineye
   servis atarken hangi servisi önce göreceğini belirler.
   -------------------------------------------------------------------------- */

CREATE TABLE servis.Bolge (
    ServisKimlik         uniqueidentifier NOT NULL,
    IlKodu               tinyint NOT NULL,
    IlceKodu             int NULL,
    KayitNo              bigint IDENTITY(1,1) NOT NULL,
    Kimlik               uniqueidentifier NOT NULL
        CONSTRAINT DF_servis_Bolge_Kimlik DEFAULT NEWID(),
    GecerlilikBaslangici datetime2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    GecerlilikBitisi     datetime2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (GecerlilikBaslangici, GecerlilikBitisi),

    CONSTRAINT PK_servis_Bolge PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_servis_Bolge_servis_Servis
        FOREIGN KEY (ServisKimlik) REFERENCES servis.Servis (Kimlik),
    CONSTRAINT FK_servis_Bolge_cografya_Il
        FOREIGN KEY (IlKodu) REFERENCES cografya.Il (IlKodu),
    CONSTRAINT FK_servis_Bolge_cografya_Ilce
        FOREIGN KEY (IlKodu, IlceKodu) REFERENCES cografya.Ilce (IlKodu, IlceKodu)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = gecmis.servis_Bolge, DATA_CONSISTENCY_CHECK = ON));

CREATE UNIQUE CLUSTERED INDEX CX_servis_Bolge_KayitNo ON servis.Bolge (KayitNo);
CREATE UNIQUE NONCLUSTERED INDEX UX_servis_Bolge_Ilce ON servis.Bolge (ServisKimlik, IlKodu, IlceKodu) WHERE IlceKodu IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_servis_Bolge_IlGeneli ON servis.Bolge (ServisKimlik, IlKodu) WHERE IlceKodu IS NULL;
CREATE NONCLUSTERED INDEX IX_servis_Bolge_ServisKimlik ON servis.Bolge (ServisKimlik);
CREATE NONCLUSTERED INDEX IX_servis_Bolge_IlKoduIlceKodu ON servis.Bolge (IlKodu, IlceKodu) INCLUDE (ServisKimlik);

EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Bolge', @Metin = N'Servisin sorumluluk bölgesi: il ya da ilçe. Personel makineye servis atarken bölgedeki servisleri önce görür; bölgesi girilmemiş servis listeden düşmez. Bölge kaldırılınca satır silinir; eski hâller gecmis.servis_Bolge tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Bolge', @Alt = N'ServisKimlik', @Metin = N'Bölgenin ait olduğu servis (servis.Servis).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Bolge', @Alt = N'IlKodu', @Metin = N'Bölgedeki il, plaka koduyla (cografya.Il).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Bolge', @Alt = N'IlceKodu', @Metin = N'Bölgedeki ilçe (cografya.Ilce). Boşsa ilin tamamı.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Bolge', @Alt = N'KayitNo', @Metin = N'Yalnız veritabanında satır seçmek içindir; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Bolge', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda ve gorunum görünümlerinde yer almaz.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Bolge', @Alt = N'GecerlilikBaslangici', @Metin = N'Satırın bu hâlinin geçerli olmaya başladığı an (UTC). SQL Server kendisi yazar; SELECT * ile görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'Bolge', @Alt = N'GecerlilikBitisi', @Metin = N'Satırın bu hâlinin geçerliliğinin bittiği an (UTC). Güncel satırda 9999-12-31. SQL Server kendisi yazar; SELECT * ile görünmez.';
GO


/* --------------------------------------------------------------------------
   servis.MarkaYetkisi — servisin bakabildiği markalar [T]

   Etkin hesaplanmış kolonu ve (ServisKimlik, MarkaKodu, Etkin) tekilliği
   makine.MakineServisAtamasi'nın bileşik yabancı anahtarının hedefidir:
   yetkisi bitmiş servise atama 547 verir, açık ataması olan servisin
   yetkisi doğrudan bitirilemez (Bölüm 1.17.3). talep.Talep ise
   (ServisKimlik, MarkaKodu) birincil anahtarına bakar.
   -------------------------------------------------------------------------- */

CREATE TABLE servis.MarkaYetkisi (
    ServisKimlik         uniqueidentifier NOT NULL,
    MarkaKodu            nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    VerenKullaniciKimlik uniqueidentifier NULL,
    BaslangicZamani      datetime2(3) NOT NULL
        CONSTRAINT DF_servis_MarkaYetkisi_BaslangicZamani DEFAULT SYSUTCDATETIME(),
    BitisZamani          datetime2(3) NULL,
    Etkin AS CAST(CASE WHEN BitisZamani IS NULL THEN 1 ELSE 0 END AS bit) PERSISTED NOT NULL,
    GecerlilikBaslangici datetime2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    GecerlilikBitisi     datetime2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (GecerlilikBaslangici, GecerlilikBitisi),

    CONSTRAINT PK_servis_MarkaYetkisi PRIMARY KEY CLUSTERED (ServisKimlik, MarkaKodu),
    CONSTRAINT UQ_servis_MarkaYetkisi_ServisKimlikMarkaKoduEtkin UNIQUE (ServisKimlik, MarkaKodu, Etkin),
    CONSTRAINT FK_servis_MarkaYetkisi_servis_Servis
        FOREIGN KEY (ServisKimlik) REFERENCES servis.Servis (Kimlik),
    CONSTRAINT FK_servis_MarkaYetkisi_katalog_Marka
        FOREIGN KEY (MarkaKodu) REFERENCES katalog.Marka (Kod),
    CONSTRAINT FK_servis_MarkaYetkisi_erisim_Kullanici_Veren
        FOREIGN KEY (VerenKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT CK_servis_MarkaYetkisi_BitisZamani
        CHECK (BitisZamani IS NULL OR BitisZamani >= BaslangicZamani)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = gecmis.servis_MarkaYetkisi, DATA_CONSISTENCY_CHECK = ON));

CREATE NONCLUSTERED INDEX IX_servis_MarkaYetkisi_MarkaKoduEtkin ON servis.MarkaYetkisi (MarkaKodu, Etkin);
CREATE NONCLUSTERED INDEX IX_servis_MarkaYetkisi_VerenKullaniciKimlik ON servis.MarkaYetkisi (VerenKullaniciKimlik);

EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'MarkaYetkisi', @Metin = N'Servisin hangi markaların makinelerine bakabildiği. Yetki bitince satır silinmez, BitisZamani yazılır; yeniden verilince aynı satır açılır. Yetkisi bitmiş servise makine atanamaz. Eski dönemler gecmis.servis_MarkaYetkisi tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'MarkaYetkisi', @Alt = N'ServisKimlik', @Metin = N'Yetkinin verildiği servis (servis.Servis).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'MarkaYetkisi', @Alt = N'MarkaKodu', @Metin = N'Yetkinin verildiği marka (katalog.Marka; örnek paksan).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'MarkaYetkisi', @Alt = N'VerenKullaniciKimlik', @Metin = N'Yetkiyi veren personel (erisim.Kullanici). Tohum ve taşımayla gelen satırda boş.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'MarkaYetkisi', @Alt = N'BaslangicZamani', @Metin = N'Yetkinin (son kez) verildiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'MarkaYetkisi', @Alt = N'BitisZamani', @Metin = N'Yetkinin alındığı an (UTC). Yetki sürüyorsa boş. Açık makine ataması varken yazılamaz; önce atamalar bitirilir (yonetim.ServistenMarkaYetkisiniAl).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'MarkaYetkisi', @Alt = N'Etkin', @Metin = N'Yetki bugün geçerliyse 1, alınmışsa 0. BitisZamani''ndan SQL Server kendisi hesaplar.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'MarkaYetkisi', @Alt = N'GecerlilikBaslangici', @Metin = N'Satırın bu hâlinin geçerli olmaya başladığı an (UTC). SQL Server kendisi yazar; SELECT * ile görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'MarkaYetkisi', @Alt = N'GecerlilikBitisi', @Metin = N'Satırın bu hâlinin geçerliliğinin bittiği an (UTC). Güncel satırda 9999-12-31. SQL Server kendisi yazar; SELECT * ile görünmez.';
GO


/* --------------------------------------------------------------------------
   servis.GirisHesabi — Servisim girişinin servis firmasına bağı [O]

   Şifre ve giriş durumu erisim.Kullanici'dadır. Firma başına birden çok
   giriş olabilir (çok teknisyen; üst sınır ayar ServisBasinaEnFazlaGirisHesabi).
   -------------------------------------------------------------------------- */

CREATE TABLE servis.GirisHesabi (
    Aciklama             nvarchar(100) COLLATE Turkish_100_CI_AS NULL,
    KullaniciKimlik      uniqueidentifier NOT NULL,
    ServisKimlik         uniqueidentifier NOT NULL,
    OlusmaZamani         datetime2(3) NOT NULL
        CONSTRAINT DF_servis_GirisHesabi_OlusmaZamani DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_servis_GirisHesabi PRIMARY KEY CLUSTERED (KullaniciKimlik),
    CONSTRAINT FK_servis_GirisHesabi_erisim_Kullanici
        FOREIGN KEY (KullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_servis_GirisHesabi_servis_Servis
        FOREIGN KEY (ServisKimlik) REFERENCES servis.Servis (Kimlik)
);

CREATE NONCLUSTERED INDEX IX_servis_GirisHesabi_ServisKimlik ON servis.GirisHesabi (ServisKimlik);

EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'GirisHesabi', @Metin = N'Servisim giriş hesabının hangi servis firmasına ait olduğu. Giriş adı, şifre ve girişin açık olup olmadığı erisim.Kullanici''dadır. Bir firmanın birden çok girişi olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'GirisHesabi', @Alt = N'Aciklama', @Metin = N'Girişi kimin kullandığına dair kısa not (örnek: usta adı).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'GirisHesabi', @Alt = N'KullaniciKimlik', @Metin = N'Servisim girişi (erisim.Kullanici; türü servis).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'GirisHesabi', @Alt = N'ServisKimlik', @Metin = N'Girişin ait olduğu servis firması (servis.Servis).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'GirisHesabi', @Alt = N'OlusmaZamani', @Metin = N'Bağın kurulduğu an (UTC).';
GO


/* --------------------------------------------------------------------------
   servis.SifreYardimTalebi — Servisim girişinden "şifremi unuttum" [K] [O]

   Servis kendi şifresini sıfırlayamaz; talep bırakır, PAKSAN arar ve tek
   kullanımlık kod verir. Servis başına en çok bir açık talep.
   -------------------------------------------------------------------------- */

CREATE TABLE servis.SifreYardimTalebi (
    GirisAdiBeyani         nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    ServisKimlik           uniqueidentifier NOT NULL,
    DurumKodu              nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    KapanmaZamani          datetime2(3) NULL,
    KapatanKullaniciKimlik uniqueidentifier NULL,
    KapatanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    OlusmaZamani           datetime2(3) NOT NULL
        CONSTRAINT DF_servis_SifreYardimTalebi_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                bigint IDENTITY(1,1) NOT NULL,
    Kimlik                 uniqueidentifier NOT NULL
        CONSTRAINT DF_servis_SifreYardimTalebi_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_servis_SifreYardimTalebi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_servis_SifreYardimTalebi_servis_Servis
        FOREIGN KEY (ServisKimlik) REFERENCES servis.Servis (Kimlik),
    CONSTRAINT FK_servis_SifreYardimTalebi_erisim_Kullanici_Kapatan
        FOREIGN KEY (KapatanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT CK_servis_SifreYardimTalebi_DurumKodu
        CHECK (DurumKodu IN (N'bekliyor', N'kapandi')),
    CONSTRAINT CK_servis_SifreYardimTalebi_Bekliyor
        CHECK (DurumKodu <> N'bekliyor' OR (KapanmaZamani IS NULL AND KapatanKullaniciKimlik IS NULL AND KapatanAdi IS NULL)),
    CONSTRAINT CK_servis_SifreYardimTalebi_Kapandi
        CHECK (DurumKodu <> N'kapandi' OR (KapanmaZamani IS NOT NULL AND KapatanKullaniciKimlik IS NOT NULL AND KapatanAdi IS NOT NULL))
);

CREATE UNIQUE CLUSTERED INDEX CX_servis_SifreYardimTalebi_KayitNo ON servis.SifreYardimTalebi (KayitNo);
CREATE UNIQUE NONCLUSTERED INDEX UX_servis_SifreYardimTalebi_AcikTalep ON servis.SifreYardimTalebi (ServisKimlik) WHERE DurumKodu = N'bekliyor';
CREATE NONCLUSTERED INDEX IX_servis_SifreYardimTalebi_ServisKimlikOlusmaZamani ON servis.SifreYardimTalebi (ServisKimlik, OlusmaZamani);
CREATE NONCLUSTERED INDEX IX_servis_SifreYardimTalebi_KapatanKullaniciKimlik ON servis.SifreYardimTalebi (KapatanKullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_servis_SifreYardimTalebi_GirisAdiBeyani ON servis.SifreYardimTalebi (GirisAdiBeyani);

EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'SifreYardimTalebi', @Metin = N'Servisim giriş ekranındaki "şifremi unuttum" talebi. Servis kendi şifresini sıfırlayamaz; PAKSAN servisi arar, tek kullanımlık kod verir ve talebi kapatır. Servis başına en çok bir açık talep olur.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'SifreYardimTalebi', @Alt = N'GirisAdiBeyani', @Metin = N'Servisin giriş ekranına yazdığı giriş adı, sadeleştirilmiş hâliyle (küçük harf, Türkçe harfsiz).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'SifreYardimTalebi', @Alt = N'ServisKimlik', @Metin = N'Talebi bırakan servis (servis.Servis).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'SifreYardimTalebi', @Alt = N'DurumKodu', @Metin = N'Talebin durumu: bekliyor ya da kapandi.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'SifreYardimTalebi', @Alt = N'KapanmaZamani', @Metin = N'Talebin kapatıldığı an (UTC). Bekleyen talepte boş.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'SifreYardimTalebi', @Alt = N'KapatanKullaniciKimlik', @Metin = N'Talebi kapatan personel (erisim.Kullanici). Bekleyen talepte boş.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'SifreYardimTalebi', @Alt = N'KapatanAdi', @Metin = N'Talebi kapatan personelin o anki adı.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'SifreYardimTalebi', @Alt = N'OlusmaZamani', @Metin = N'Talebin bırakıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'SifreYardimTalebi', @Alt = N'KayitNo', @Metin = N'Yalnız veritabanında satır seçmek içindir; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'servis', @Nesne = N'SifreYardimTalebi', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda ve gorunum görünümlerinde yer almaz.';
GO


/* --------------------------------------------------------------------------
   İleri yabancı anahtar: musteri.Hesap.BeyanBayiKimlik → bayi.Bayi
   (Bölüm 6.3; tablo V0006'da, hedef bu betikte oluşur.)

   Yabancı anahtarın kolonu bir dizinle karşılanır (CD-FK-DIZIN). V0006
   bu kolonla başlayan bir dizin açtıysa ikincisi açılmaz.
   -------------------------------------------------------------------------- */

ALTER TABLE musteri.Hesap
    ADD CONSTRAINT FK_musteri_Hesap_bayi_Bayi_Beyan
        FOREIGN KEY (BeyanBayiKimlik) REFERENCES bayi.Bayi (Kimlik);

IF NOT EXISTS (
    SELECT 1
    FROM sys.index_columns ic
    JOIN sys.indexes i ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE ic.object_id = OBJECT_ID(N'musteri.Hesap')
      AND ic.key_ordinal = 1
      AND i.has_filter = 0
      AND c.name = N'BeyanBayiKimlik'
)
    CREATE NONCLUSTERED INDEX IX_musteri_Hesap_BeyanBayiKimlik ON musteri.Hesap (BeyanBayiKimlik);
GO


/* --------------------------------------------------------------------------
   Geçmiş tablolarının açıklamaları

   gecmis.* tablolarını SQL Server kendisi oluşturur. Asıl tablonun ve
   kolonlarının açıklaması geçmiş tablosuna kopyalanır; tablo
   açıklamasının başına geçmiş tablosu olduğu yazılır.
   -------------------------------------------------------------------------- */

DECLARE @GecmisSema   sysname,
        @GecmisTablo  sysname,
        @AsilSema     sysname,
        @AsilTablo    sysname,
        @Kolon        sysname,
        @Aciklama     nvarchar(3750);

DECLARE Aciklamalar CURSOR LOCAL FAST_FORWARD FOR
    SELECT gs.name, g.name, s.name, t.name, c.name, CONVERT(nvarchar(3750), ep.value)
    FROM sys.tables t
    JOIN sys.schemas s  ON s.schema_id = t.schema_id
    JOIN sys.tables g   ON g.object_id = t.history_table_id
    JOIN sys.schemas gs ON gs.schema_id = g.schema_id
    JOIN sys.extended_properties ep
      ON ep.class = 1 AND ep.major_id = t.object_id AND ep.name = N'MS_Description'
    LEFT JOIN sys.columns c
      ON c.object_id = t.object_id AND c.column_id = ep.minor_id
    WHERE t.temporal_type = 2
      AND s.name IN (N'bayi', N'servis')
    ORDER BY s.name, t.name, ep.minor_id;

OPEN Aciklamalar;
FETCH NEXT FROM Aciklamalar INTO @GecmisSema, @GecmisTablo, @AsilSema, @AsilTablo, @Kolon, @Aciklama;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF @Kolon IS NULL
    BEGIN
        SET @Aciklama = LEFT(N'Geçmiş tablosu: ' + @AsilSema + N'.' + @AsilTablo
                           + N' satırlarının eski hâlleri. SQL Server kendisi yazar; elle değiştirilmez. '
                           + @Aciklama, 3750);
        EXEC dbo.AciklamaYaz @Sema = @GecmisSema, @Nesne = @GecmisTablo, @Metin = @Aciklama;
    END
    ELSE
        EXEC dbo.AciklamaYaz @Sema = @GecmisSema, @Nesne = @GecmisTablo, @Alt = @Kolon, @Metin = @Aciklama;

    FETCH NEXT FROM Aciklamalar INTO @GecmisSema, @GecmisTablo, @AsilSema, @AsilTablo, @Kolon, @Aciklama;
END;
CLOSE Aciklamalar;
DEALLOCATE Aciklamalar;
GO
