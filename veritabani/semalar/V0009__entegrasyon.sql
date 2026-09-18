/* ==========================================================================
   V0009 — entegrasyon şeması

   Dış sistemlerle (bugün LOGO; yarın ikinci ERP, e-fatura entegratörü)
   kurulan bağlar ve Excel içe aktarımı. İş tabloları dış sistem adı
   taşımaz; bağ bu şemadaki BelgeBagi ve CariKarti üzerinden,
   DisSistemKodu ile kurulur (Bölüm 2.1 E8). Pilot istisnası:
   LogoMalzemeKarti ve LogoSeriSorgusu LOGO'ya özgü adlarıyla kalır.

   Kural kaynağı: veritabani/tasarim.md (Bölüm 0.4 "entegrasyon",
   1.13.4 saklama, 1.17.5 tekillik ve NULL, 6.2 betik sırası).

   Sıra: IceAktarim, IceAktarimSatiri, CariKarti, BelgeBagi,
   LogoMalzemeKarti, LogoSeriSorgusu.

   Önce gelen betikler: V0002 (kod), V0004 (katalog), V0005 (erisim),
   V0006 (musteri), V0007 (dosya), V0008 (servis, bayi).

   Yetkiler (GRANT/DENY) V0015'te verilir.
   ========================================================================== */


/* --------------------------------------------------------------------------
   entegrasyon.IceAktarim — yüklenen Excel dökümü [K] [O] [A]
   -------------------------------------------------------------------------- */

CREATE TABLE entegrasyon.IceAktarim (
    SatirSayisi          int NOT NULL
        CONSTRAINT DF_entegrasyon_IceAktarim_SatirSayisi DEFAULT 0,
    HataSayisi           int NOT NULL
        CONSTRAINT DF_entegrasyon_IceAktarim_HataSayisi DEFAULT 0,
    TurKodu              nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    DosyaKimlik          uniqueidentifier NOT NULL,
    DurumKodu            nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanTuruKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik uniqueidentifier NULL,
    YapanHesapKimlik     uniqueidentifier NULL,
    YapanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu       nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani         datetime2(3) NOT NULL
        CONSTRAINT DF_entegrasyon_IceAktarim_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo              bigint IDENTITY(1,1) NOT NULL,
    Kimlik               uniqueidentifier NOT NULL
        CONSTRAINT DF_entegrasyon_IceAktarim_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_entegrasyon_IceAktarim PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_entegrasyon_IceAktarim_kod_IceAktarimTuru
        FOREIGN KEY (TurKodu) REFERENCES kod.IceAktarimTuru (Kod),
    CONSTRAINT FK_entegrasyon_IceAktarim_dosya_Dosya
        FOREIGN KEY (DosyaKimlik) REFERENCES dosya.Dosya (Kimlik),
    CONSTRAINT FK_entegrasyon_IceAktarim_kod_AktorTuru
        FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_entegrasyon_IceAktarim_erisim_Kullanici_Yapan
        FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_entegrasyon_IceAktarim_musteri_Hesap_Yapan
        FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_entegrasyon_IceAktarim_kod_KaynakUygulama
        FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_entegrasyon_IceAktarim_DurumKodu
        CHECK (DurumKodu IN (N'yuklendi', N'dogrulandi', N'uygulandi', N'hata')),
    CONSTRAINT CK_entegrasyon_IceAktarim_Sayilar
        CHECK (SatirSayisi >= 0 AND HataSayisi >= 0),
    CONSTRAINT CK_entegrasyon_IceAktarim_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);

CREATE UNIQUE CLUSTERED INDEX CX_entegrasyon_IceAktarim_KayitNo ON entegrasyon.IceAktarim (KayitNo);
CREATE NONCLUSTERED INDEX IX_entegrasyon_IceAktarim_TurKoduOlusmaZamani ON entegrasyon.IceAktarim (TurKodu, OlusmaZamani);
CREATE NONCLUSTERED INDEX IX_entegrasyon_IceAktarim_DosyaKimlik ON entegrasyon.IceAktarim (DosyaKimlik);
CREATE NONCLUSTERED INDEX IX_entegrasyon_IceAktarim_OlusmaZamani ON entegrasyon.IceAktarim (OlusmaZamani) INCLUDE (DurumKodu);
CREATE NONCLUSTERED INDEX IX_entegrasyon_IceAktarim_YapanTuruKodu ON entegrasyon.IceAktarim (YapanTuruKodu);
CREATE NONCLUSTERED INDEX IX_entegrasyon_IceAktarim_YapanKullaniciKimlik ON entegrasyon.IceAktarim (YapanKullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_entegrasyon_IceAktarim_YapanHesapKimlik ON entegrasyon.IceAktarim (YapanHesapKimlik);
CREATE NONCLUSTERED INDEX IX_entegrasyon_IceAktarim_KaynakUygulamaKodu ON entegrasyon.IceAktarim (KaynakUygulamaKodu);

EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarim', @Metin = N'Backoffice''ten yüklenen bir Excel dökümü (LOGO cari listesi, malzeme listesi, satış faturaları, servis listesi gibi). Satırları entegrasyon.IceAktarimSatiri''ndadır; eşleştirmeyi personel yapar. Fiyat listesi bu yoldan yüklenmez.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarim', @Alt = N'SatirSayisi', @Metin = N'Dökümdeki veri satırı sayısı.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarim', @Alt = N'HataSayisi', @Metin = N'Doğrulamada hata veren satır sayısı.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarim', @Alt = N'TurKodu', @Metin = N'Dökümün türü (kod.IceAktarimTuru; örnek logoCariListesi).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarim', @Alt = N'DosyaKimlik', @Metin = N'Yüklenen Excel dosyası (dosya.Dosya).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarim', @Alt = N'DurumKodu', @Metin = N'İçe aktarımın durumu: yuklendi, dogrulandi, uygulandi ya da hata.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarim', @Alt = N'YapanTuruKodu', @Metin = N'Kaydı kimin yazdığı: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarim', @Alt = N'YapanKullaniciKimlik', @Metin = N'Kaydı yazan personel ya da servis girişi (erisim.Kullanici). Müşteri, sistem ve entegrasyon yazdıysa boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarim', @Alt = N'YapanHesapKimlik', @Metin = N'Kaydı yazan müşteri hesabı (musteri.Hesap). Yalnız müşteri yazdıysa dolu.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarim', @Alt = N'YapanAdi', @Metin = N'Kaydı yazan kişinin o anki adı. Müşteri için boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarim', @Alt = N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama (kod.KaynakUygulama; örnek backoffice).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarim', @Alt = N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (örnek 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarim', @Alt = N'OlusmaZamani', @Metin = N'Dökümün yüklendiği an (UTC). Satırların ham verisinin saklama süresi buradan sayılır.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarim', @Alt = N'KayitNo', @Metin = N'Yalnız veritabanında satır seçmek içindir; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarim', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda ve gorunum görünümlerinde yer almaz.';
GO


/* --------------------------------------------------------------------------
   entegrasyon.IceAktarimSatiri — Excel dökümünün bir satırı [K]

   HamVeriJson'a TC, vergi numarası ve IBAN düz yazılmaz (maskeli değer ve
   HMAC özeti yazılır). Saklama süresi dolunca ve anonimleştirmede
   HamVeriJson boşaltılır (Bölüm 1.12, 1.13.4).
   -------------------------------------------------------------------------- */

CREATE TABLE entegrasyon.IceAktarimSatiri (
    SatirNo              int NOT NULL,
    HamVeriJson          nvarchar(max) COLLATE Latin1_General_100_BIN2 NULL,
    HataMesaji           nvarchar(1000) COLLATE Latin1_General_100_BIN2 NULL,
    IceAktarimKimlik     uniqueidentifier NOT NULL,
    EslesenKayitTuruKodu nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    EslesenKimlik        uniqueidentifier NULL,
    DurumKodu            nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    KayitNo              bigint IDENTITY(1,1) NOT NULL,
    Kimlik               uniqueidentifier NOT NULL
        CONSTRAINT DF_entegrasyon_IceAktarimSatiri_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_entegrasyon_IceAktarimSatiri PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_entegrasyon_IceAktarimSatiri_IceAktarimKimlikSatirNo UNIQUE (IceAktarimKimlik, SatirNo),
    CONSTRAINT FK_entegrasyon_IceAktarimSatiri_entegrasyon_IceAktarim
        FOREIGN KEY (IceAktarimKimlik) REFERENCES entegrasyon.IceAktarim (Kimlik),
    CONSTRAINT FK_entegrasyon_IceAktarimSatiri_kod_KayitTuru
        FOREIGN KEY (EslesenKayitTuruKodu) REFERENCES kod.KayitTuru (Kod),
    CONSTRAINT CK_entegrasyon_IceAktarimSatiri_SatirNo
        CHECK (SatirNo > 0),
    CONSTRAINT CK_entegrasyon_IceAktarimSatiri_HamVeriJson
        CHECK (HamVeriJson IS NULL OR ISJSON(HamVeriJson) = 1),
    CONSTRAINT CK_entegrasyon_IceAktarimSatiri_DurumKodu
        CHECK (DurumKodu IN (N'bekliyor', N'eslesti', N'eslesmedi', N'hata')),
    CONSTRAINT CK_entegrasyon_IceAktarimSatiri_Eslesen
        CHECK ((EslesenKayitTuruKodu IS NULL AND EslesenKimlik IS NULL)
            OR (EslesenKayitTuruKodu IS NOT NULL AND EslesenKimlik IS NOT NULL)),
    CONSTRAINT CK_entegrasyon_IceAktarimSatiri_Eslesti
        CHECK (DurumKodu <> N'eslesti' OR EslesenKimlik IS NOT NULL)
);

CREATE UNIQUE CLUSTERED INDEX CX_entegrasyon_IceAktarimSatiri_KayitNo ON entegrasyon.IceAktarimSatiri (KayitNo);
CREATE NONCLUSTERED INDEX IX_entegrasyon_IceAktarimSatiri_EslesenKayitTuruKoduEslesenKimlik ON entegrasyon.IceAktarimSatiri (EslesenKayitTuruKodu, EslesenKimlik);

EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarimSatiri', @Metin = N'Yüklenen Excel dökümünün bir satırı ve eşleştirme sonucu (hangi servise, bayiye, müşteriye ya da makineye bağlandığı).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarimSatiri', @Alt = N'SatirNo', @Metin = N'Excel''deki satır numarası.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarimSatiri', @Alt = N'HamVeriJson', @Metin = N'Satırın ham verisi (JSON). TC, vergi numarası ve IBAN düz yazılmaz. Saklama süresi dolunca ve anonimleştirmede boşaltılır.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarimSatiri', @Alt = N'HataMesaji', @Metin = N'Doğrulamada bulunan hata. Hata yoksa boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarimSatiri', @Alt = N'IceAktarimKimlik', @Metin = N'Satırın ait olduğu döküm (entegrasyon.IceAktarim).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarimSatiri', @Alt = N'EslesenKayitTuruKodu', @Metin = N'Satırın eşleştiği kaydın türü (kod.KayitTuru; örnek servis, bayi, makine). Eşleşmediyse boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarimSatiri', @Alt = N'EslesenKimlik', @Metin = N'Satırın eşleştiği kaydın kimliği; tablo EslesenKayitTuruKodu''ndan anlaşılır. Eşleşmediyse boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarimSatiri', @Alt = N'DurumKodu', @Metin = N'Satırın durumu: bekliyor, eslesti, eslesmedi ya da hata.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarimSatiri', @Alt = N'KayitNo', @Metin = N'Yalnız veritabanında satır seçmek içindir; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'IceAktarimSatiri', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda ve gorunum görünümlerinde yer almaz.';
GO


/* --------------------------------------------------------------------------
   entegrasyon.CariKarti — müşterinin, servisin ya da bayinin dış
   sistemdeki cari kodu [K] [O]

   Tam bir hedef dolu. Cari firma (LOGO firması) başınadır; marka
   kolonu yoktur. FirmaNo'su olmayan dış sistem için ayrı tekillik
   (Bölüm 1.17.5).

   SirketKodu (tasarim.md 0.4 entegrasyon "Uygulamada değişti"): LOGO'da
   FirmaNo'dan türetilebilir; firma numarası olmayan dış sistemi iki
   şirket kullanırsa kartın şirketi buradan okunur ve cari kodu şirket
   başına tektir.
   -------------------------------------------------------------------------- */

CREATE TABLE entegrasyon.CariKarti (
    CariKodu                  nvarchar(32) COLLATE Latin1_General_100_BIN2 NOT NULL,
    FirmaNo                   smallint NULL,
    DisKayitNo                nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
    Aktif                     bit NOT NULL
        CONSTRAINT DF_entegrasyon_CariKarti_Aktif DEFAULT 1,
    DisSistemKodu             nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    SirketKodu                nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    HesapKimlik               uniqueidentifier NULL,
    ServisKimlik              uniqueidentifier NULL,
    BayiKimlik                uniqueidentifier NULL,
    KaynakKodu                nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    DogrulamaZamani           datetime2(3) NULL,
    DogrulayanKullaniciKimlik uniqueidentifier NULL,
    DogrulayanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    OlusmaZamani              datetime2(3) NOT NULL
        CONSTRAINT DF_entegrasyon_CariKarti_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                   bigint IDENTITY(1,1) NOT NULL,
    Kimlik                    uniqueidentifier NOT NULL
        CONSTRAINT DF_entegrasyon_CariKarti_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_entegrasyon_CariKarti PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_entegrasyon_CariKarti_kod_DisSistem
        FOREIGN KEY (DisSistemKodu) REFERENCES kod.DisSistem (Kod),
    CONSTRAINT FK_entegrasyon_CariKarti_sirket_Sirket
        FOREIGN KEY (SirketKodu) REFERENCES sirket.Sirket (Kod),
    CONSTRAINT FK_entegrasyon_CariKarti_musteri_Hesap
        FOREIGN KEY (HesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_entegrasyon_CariKarti_servis_Servis
        FOREIGN KEY (ServisKimlik) REFERENCES servis.Servis (Kimlik),
    CONSTRAINT FK_entegrasyon_CariKarti_bayi_Bayi
        FOREIGN KEY (BayiKimlik) REFERENCES bayi.Bayi (Kimlik),
    CONSTRAINT FK_entegrasyon_CariKarti_kod_KayitKaynagi
        FOREIGN KEY (KaynakKodu) REFERENCES kod.KayitKaynagi (Kod),
    CONSTRAINT FK_entegrasyon_CariKarti_erisim_Kullanici_Dogrulayan
        FOREIGN KEY (DogrulayanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT CK_entegrasyon_CariKarti_CariKodu
        CHECK (LEN(LTRIM(CariKodu)) > 0),
    CONSTRAINT CK_entegrasyon_CariKarti_TekHedef
        CHECK ((CASE WHEN HesapKimlik IS NULL THEN 0 ELSE 1 END)
             + (CASE WHEN ServisKimlik IS NULL THEN 0 ELSE 1 END)
             + (CASE WHEN BayiKimlik IS NULL THEN 0 ELSE 1 END) = 1),
    CONSTRAINT CK_entegrasyon_CariKarti_Dogrulayan
        CHECK ((DogrulayanKullaniciKimlik IS NULL AND DogrulayanAdi IS NULL)
            OR (DogrulayanKullaniciKimlik IS NOT NULL AND DogrulayanAdi IS NOT NULL)),
    CONSTRAINT CK_entegrasyon_CariKarti_DogrulamaZamani
        CHECK (DogrulayanKullaniciKimlik IS NULL OR DogrulamaZamani IS NOT NULL)
);

CREATE UNIQUE CLUSTERED INDEX CX_entegrasyon_CariKarti_KayitNo ON entegrasyon.CariKarti (KayitNo);
CREATE UNIQUE NONCLUSTERED INDEX UX_entegrasyon_CariKarti_FirmaCariKodu ON entegrasyon.CariKarti (DisSistemKodu, FirmaNo, CariKodu) WHERE FirmaNo IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_entegrasyon_CariKarti_FirmasizCariKodu ON entegrasyon.CariKarti (DisSistemKodu, CariKodu) WHERE FirmaNo IS NULL AND SirketKodu IS NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_entegrasyon_CariKarti_SirketCariKodu ON entegrasyon.CariKarti (DisSistemKodu, SirketKodu, CariKodu) WHERE FirmaNo IS NULL AND SirketKodu IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_entegrasyon_CariKarti_SirketKodu ON entegrasyon.CariKarti (SirketKodu);
CREATE NONCLUSTERED INDEX IX_entegrasyon_CariKarti_DisSistemKoduCariKodu ON entegrasyon.CariKarti (DisSistemKodu, CariKodu);
CREATE NONCLUSTERED INDEX IX_entegrasyon_CariKarti_CariKodu ON entegrasyon.CariKarti (CariKodu);
CREATE NONCLUSTERED INDEX IX_entegrasyon_CariKarti_HesapKimlik ON entegrasyon.CariKarti (HesapKimlik) INCLUDE (Aktif, DisSistemKodu, FirmaNo, CariKodu);
CREATE NONCLUSTERED INDEX IX_entegrasyon_CariKarti_ServisKimlik ON entegrasyon.CariKarti (ServisKimlik) INCLUDE (Aktif, DisSistemKodu, FirmaNo, CariKodu);
CREATE NONCLUSTERED INDEX IX_entegrasyon_CariKarti_BayiKimlik ON entegrasyon.CariKarti (BayiKimlik) INCLUDE (Aktif, DisSistemKodu, FirmaNo, CariKodu);
CREATE NONCLUSTERED INDEX IX_entegrasyon_CariKarti_KaynakKodu ON entegrasyon.CariKarti (KaynakKodu);
CREATE NONCLUSTERED INDEX IX_entegrasyon_CariKarti_DogrulayanKullaniciKimlik ON entegrasyon.CariKarti (DogrulayanKullaniciKimlik);

EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'CariKarti', @Metin = N'Müşterinin, servisin ya da bayinin dış sistemdeki (bugün LOGO) cari kartı. Her satırda bu üçünden tam biri dolu. Bir firmanın her LOGO firmasında ayrı cari kodu olabilir. Müşteri satırları anonimleştirmede silinir.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'CariKarti', @Alt = N'CariKodu', @Metin = N'Dış sistemdeki cari kodu, olduğu gibi (örnek 120.01.042).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'CariKarti', @Alt = N'FirmaNo', @Metin = N'LOGO firma numarası. Firma kavramı olmayan dış sistemde boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'CariKarti', @Alt = N'DisKayitNo', @Metin = N'Kartın dış sistemdeki iç kayıt numarası, metin olarak (LOGO''da LOGICALREF). Kod değişse de bağ kopmasın diye tutulur.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'CariKarti', @Alt = N'Aktif', @Metin = N'Kart kullanılıyorsa 1; kullanılmayan kart silinmez, 0 yapılır.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'CariKarti', @Alt = N'DisSistemKodu', @Metin = N'Kartın bulunduğu dış sistem (kod.DisSistem; örnek logo).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'CariKarti', @Alt = N'SirketKodu', @Metin = N'Kartın ait olduğu şirket (sirket.Sirket). LOGO kartında FirmaNo ile şirketin LogoFirmaNo değerinden de bulunabilir; firma numarası olmayan dış sistemde (e-fatura entegratörü, ikinci ERP) doldurulur. Firma numarası boşken cari kodu şirket başına tektir.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'CariKarti', @Alt = N'HesapKimlik', @Metin = N'Kart müşteriye aitse müşteri hesabı (musteri.Hesap); değilse boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'CariKarti', @Alt = N'ServisKimlik', @Metin = N'Kart servise aitse servis (servis.Servis); değilse boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'CariKarti', @Alt = N'BayiKimlik', @Metin = N'Kart bayiye aitse bayi (bayi.Bayi); değilse boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'CariKarti', @Alt = N'KaynakKodu', @Metin = N'Kaydın nereden geldiği (kod.KayitKaynagi; örnek iceAktarim, personel).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'CariKarti', @Alt = N'DogrulamaZamani', @Metin = N'Muhasebenin cari kodunu onayladığı an (UTC). Onaylanmamışsa boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'CariKarti', @Alt = N'DogrulayanKullaniciKimlik', @Metin = N'Cari kodunu onaylayan personel (erisim.Kullanici).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'CariKarti', @Alt = N'DogrulayanAdi', @Metin = N'Cari kodunu onaylayan personelin o anki adı.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'CariKarti', @Alt = N'OlusmaZamani', @Metin = N'Satırın veritabanına yazıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'CariKarti', @Alt = N'KayitNo', @Metin = N'Yalnız veritabanında satır seçmek içindir; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'CariKarti', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda ve gorunum görünümlerinde yer almaz.';
GO


/* --------------------------------------------------------------------------
   entegrasyon.BelgeBagi — dış sistemdeki bir belgeye bağ [K] [O] [A]

   Fatura, irsaliye, banka fişi gibi belgeler. LOGO'da iç kayıt numarası
   (LOGICALREF) yalnız firma ve dönem içinde tektir; bu yüzden tekillikler
   FirmaNo ve DonemNo'nun dolu ya da boş olmasına göre ayrı yazılır
   (Bölüm 0.4, 1.17.5). FirmaNo boşken tekillik SirketKodu'nun dolu ya
   da boş olmasına göre de ayrılır: aynı dış sistemi iki şirket
   kullanabilir (tasarim.md 0.4 entegrasyon "Uygulamada değişti").
   -------------------------------------------------------------------------- */

CREATE TABLE entegrasyon.BelgeBagi (
    BelgeNo              nvarchar(32) COLLATE Latin1_General_100_BIN2 NULL,
    BelgeTarihi          date NULL,
    Ettn                 uniqueidentifier NULL,
    FirmaNo              smallint NULL,
    DonemNo              smallint NULL,
    DisKayitNo           nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
    Tutar                decimal(18,2) NULL,
    KdvHaricTutar        decimal(18,2) NULL,
    DisSistemKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    SirketKodu           nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    BelgeTuruKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    ParaBirimiKodu       nvarchar(3) COLLATE Latin1_General_100_BIN2 NULL,
    CariKartiKimlik      uniqueidentifier NULL,
    KaynakKodu           nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    IceAktarimKimlik     uniqueidentifier NULL,
    IptalZamani          datetime2(3) NULL,
    YapanTuruKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik uniqueidentifier NULL,
    YapanHesapKimlik     uniqueidentifier NULL,
    YapanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu       nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani         datetime2(3) NOT NULL
        CONSTRAINT DF_entegrasyon_BelgeBagi_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo              bigint IDENTITY(1,1) NOT NULL,
    Kimlik               uniqueidentifier NOT NULL
        CONSTRAINT DF_entegrasyon_BelgeBagi_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_entegrasyon_BelgeBagi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_entegrasyon_BelgeBagi_kod_DisSistem
        FOREIGN KEY (DisSistemKodu) REFERENCES kod.DisSistem (Kod),
    CONSTRAINT FK_entegrasyon_BelgeBagi_sirket_Sirket
        FOREIGN KEY (SirketKodu) REFERENCES sirket.Sirket (Kod),
    CONSTRAINT FK_entegrasyon_BelgeBagi_kod_BelgeTuru
        FOREIGN KEY (BelgeTuruKodu) REFERENCES kod.BelgeTuru (Kod),
    CONSTRAINT FK_entegrasyon_BelgeBagi_kod_ParaBirimi
        FOREIGN KEY (ParaBirimiKodu) REFERENCES kod.ParaBirimi (Kod),
    CONSTRAINT FK_entegrasyon_BelgeBagi_entegrasyon_CariKarti
        FOREIGN KEY (CariKartiKimlik) REFERENCES entegrasyon.CariKarti (Kimlik),
    CONSTRAINT FK_entegrasyon_BelgeBagi_kod_KayitKaynagi
        FOREIGN KEY (KaynakKodu) REFERENCES kod.KayitKaynagi (Kod),
    CONSTRAINT FK_entegrasyon_BelgeBagi_entegrasyon_IceAktarim
        FOREIGN KEY (IceAktarimKimlik) REFERENCES entegrasyon.IceAktarim (Kimlik),
    CONSTRAINT FK_entegrasyon_BelgeBagi_kod_AktorTuru
        FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_entegrasyon_BelgeBagi_erisim_Kullanici_Yapan
        FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_entegrasyon_BelgeBagi_musteri_Hesap_Yapan
        FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_entegrasyon_BelgeBagi_kod_KaynakUygulama
        FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_entegrasyon_BelgeBagi_DonemNo
        CHECK (DonemNo IS NULL OR FirmaNo IS NOT NULL),
    CONSTRAINT CK_entegrasyon_BelgeBagi_Tanimlayici
        CHECK (DisKayitNo IS NOT NULL OR Ettn IS NOT NULL OR (BelgeNo IS NOT NULL AND BelgeTarihi IS NOT NULL)),
    CONSTRAINT CK_entegrasyon_BelgeBagi_Tutar
        CHECK (Tutar IS NULL OR Tutar >= 0),
    CONSTRAINT CK_entegrasyon_BelgeBagi_KdvHaricTutar
        CHECK (KdvHaricTutar IS NULL OR KdvHaricTutar >= 0),
    CONSTRAINT CK_entegrasyon_BelgeBagi_ParaBirimi
        CHECK (ParaBirimiKodu IS NOT NULL OR (Tutar IS NULL AND KdvHaricTutar IS NULL)),
    CONSTRAINT CK_entegrasyon_BelgeBagi_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);

CREATE UNIQUE CLUSTERED INDEX CX_entegrasyon_BelgeBagi_KayitNo ON entegrasyon.BelgeBagi (KayitNo);
CREATE UNIQUE NONCLUSTERED INDEX UX_entegrasyon_BelgeBagi_DisKayitNoFirmaDonem
    ON entegrasyon.BelgeBagi (DisSistemKodu, FirmaNo, DonemNo, BelgeTuruKodu, DisKayitNo)
    WHERE DisKayitNo IS NOT NULL AND FirmaNo IS NOT NULL AND DonemNo IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_entegrasyon_BelgeBagi_DisKayitNoFirma
    ON entegrasyon.BelgeBagi (DisSistemKodu, FirmaNo, BelgeTuruKodu, DisKayitNo)
    WHERE DisKayitNo IS NOT NULL AND FirmaNo IS NOT NULL AND DonemNo IS NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_entegrasyon_BelgeBagi_DisKayitNoFirmasiz
    ON entegrasyon.BelgeBagi (DisSistemKodu, BelgeTuruKodu, DisKayitNo)
    WHERE DisKayitNo IS NOT NULL AND FirmaNo IS NULL AND SirketKodu IS NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_entegrasyon_BelgeBagi_DisKayitNoSirket
    ON entegrasyon.BelgeBagi (DisSistemKodu, SirketKodu, BelgeTuruKodu, DisKayitNo)
    WHERE DisKayitNo IS NOT NULL AND FirmaNo IS NULL AND SirketKodu IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_entegrasyon_BelgeBagi_Ettn
    ON entegrasyon.BelgeBagi (Ettn)
    WHERE Ettn IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_entegrasyon_BelgeBagi_BelgeNoFirma
    ON entegrasyon.BelgeBagi (DisSistemKodu, FirmaNo, BelgeTuruKodu, BelgeNo, BelgeTarihi)
    WHERE BelgeNo IS NOT NULL AND BelgeTarihi IS NOT NULL AND FirmaNo IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_entegrasyon_BelgeBagi_BelgeNoFirmasiz
    ON entegrasyon.BelgeBagi (DisSistemKodu, BelgeTuruKodu, BelgeNo, BelgeTarihi)
    WHERE BelgeNo IS NOT NULL AND BelgeTarihi IS NOT NULL AND FirmaNo IS NULL AND SirketKodu IS NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_entegrasyon_BelgeBagi_BelgeNoSirket
    ON entegrasyon.BelgeBagi (DisSistemKodu, SirketKodu, BelgeTuruKodu, BelgeNo, BelgeTarihi)
    WHERE BelgeNo IS NOT NULL AND BelgeTarihi IS NOT NULL AND FirmaNo IS NULL AND SirketKodu IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_entegrasyon_BelgeBagi_SirketKodu ON entegrasyon.BelgeBagi (SirketKodu);
CREATE NONCLUSTERED INDEX IX_entegrasyon_BelgeBagi_DisSistemKoduFirmaNo ON entegrasyon.BelgeBagi (DisSistemKodu, FirmaNo);
CREATE NONCLUSTERED INDEX IX_entegrasyon_BelgeBagi_BelgeTuruKoduBelgeTarihi ON entegrasyon.BelgeBagi (BelgeTuruKodu, BelgeTarihi);
CREATE NONCLUSTERED INDEX IX_entegrasyon_BelgeBagi_ParaBirimiKodu ON entegrasyon.BelgeBagi (ParaBirimiKodu);
CREATE NONCLUSTERED INDEX IX_entegrasyon_BelgeBagi_CariKartiKimlikBelgeTarihi
    ON entegrasyon.BelgeBagi (CariKartiKimlik, BelgeTarihi)
    INCLUDE (BelgeTuruKodu, Tutar, KdvHaricTutar, ParaBirimiKodu, IptalZamani);
CREATE NONCLUSTERED INDEX IX_entegrasyon_BelgeBagi_KaynakKodu ON entegrasyon.BelgeBagi (KaynakKodu);
CREATE NONCLUSTERED INDEX IX_entegrasyon_BelgeBagi_IceAktarimKimlik ON entegrasyon.BelgeBagi (IceAktarimKimlik);
CREATE NONCLUSTERED INDEX IX_entegrasyon_BelgeBagi_YapanTuruKodu ON entegrasyon.BelgeBagi (YapanTuruKodu);
CREATE NONCLUSTERED INDEX IX_entegrasyon_BelgeBagi_YapanKullaniciKimlik ON entegrasyon.BelgeBagi (YapanKullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_entegrasyon_BelgeBagi_YapanHesapKimlik ON entegrasyon.BelgeBagi (YapanHesapKimlik);
CREATE NONCLUSTERED INDEX IX_entegrasyon_BelgeBagi_KaynakUygulamaKodu ON entegrasyon.BelgeBagi (KaynakUygulamaKodu);

EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Metin = N'Dış sistemdeki (bugün LOGO) bir belgeye bağ: satış faturası, servis faturası, gider pusulası, irsaliye, banka fişi gibi. Talep, hak ediş dökümü, hesap hareketi ve makine satışı belgelerine bu tablo üzerinden bağlanır. Satır silinmez; dış sistemde iptal edilen belgeye IptalZamani yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'BelgeNo', @Metin = N'Belgenin numarası (fatura numarası gibi), olduğu gibi.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'BelgeTarihi', @Metin = N'Belgenin tarihi (belgenin üzerindeki gün).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'Ettn', @Metin = N'e-Fatura, e-Arşiv ya da e-İrsaliyenin benzersiz kimliği (ETTN). e-belge değilse boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'FirmaNo', @Metin = N'LOGO firma numarası. Firma kavramı olmayan dış sistemde boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'DonemNo', @Metin = N'LOGO dönem numarası. Yalnız FirmaNo doluyken yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'DisKayitNo', @Metin = N'Belgenin dış sistemdeki iç kayıt numarası, metin olarak (LOGO''da LOGICALREF; firma ve dönem içinde tektir).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'Tutar', @Metin = N'Belgenin genel toplamı, KDV dahil. Para birimi ParaBirimiKodu''nda.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'KdvHaricTutar', @Metin = N'Belgenin KDV hariç toplamı. Para birimi ParaBirimiKodu''nda. Mutabakat görünümleri bunu kullanır.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'DisSistemKodu', @Metin = N'Belgenin bulunduğu dış sistem (kod.DisSistem; örnek logo).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'SirketKodu', @Metin = N'Belgenin ait olduğu şirket (sirket.Sirket). LOGO belgesinde FirmaNo ile şirketin LogoFirmaNo değerinden de bulunabilir; firma numarası olmayan dış sistemde (e-fatura entegratörü, ikinci ERP) doldurulur. Mutabakat görünümleri şirketi önce buradan, boşsa FirmaNo eşleşmesinden okur.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'BelgeTuruKodu', @Metin = N'Belgenin türü (kod.BelgeTuru; örnek satisFaturasi, bankaFisi). Belgenin talepte ya da dökümde ne işe yaradığı buradan okunur.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'ParaBirimiKodu', @Metin = N'Tutarların para birimi (kod.ParaBirimi; örnek TRY). Tutar yoksa boş olabilir.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'CariKartiKimlik', @Metin = N'Belgenin kesildiği cari kart (entegrasyon.CariKarti). Bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'KaynakKodu', @Metin = N'Bağın nereden geldiği (kod.KayitKaynagi; örnek iceAktarim, personel, entegrasyon).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'IceAktarimKimlik', @Metin = N'Bağ bir Excel dökümünden geldiyse o döküm (entegrasyon.IceAktarim).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'IptalZamani', @Metin = N'Belgenin dış sistemde iptal edildiğinin öğrenildiği an (UTC). Geçerli belgede boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'YapanTuruKodu', @Metin = N'Kaydı kimin yazdığı: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'YapanKullaniciKimlik', @Metin = N'Kaydı yazan personel ya da servis girişi (erisim.Kullanici). Müşteri, sistem ve entegrasyon yazdıysa boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'YapanHesapKimlik', @Metin = N'Kaydı yazan müşteri hesabı (musteri.Hesap). Yalnız müşteri yazdıysa dolu.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'YapanAdi', @Metin = N'Kaydı yazan kişinin o anki adı. Müşteri için boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama (kod.KaynakUygulama; örnek backoffice).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (örnek 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'OlusmaZamani', @Metin = N'Satırın veritabanına yazıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'KayitNo', @Metin = N'Yalnız veritabanında satır seçmek içindir; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'BelgeBagi', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda ve gorunum görünümlerinde yer almaz.';
GO


/* --------------------------------------------------------------------------
   entegrasyon.LogoMalzemeKarti — LOGO malzeme kartının ürüne, varyanta
   ya da parçaya eşlenmesi [K] [O]

   Pilot istisnası: LOGO'ya özgü adıyla kalır (KOD 4.4). İkinci bir ERP
   gelince entegrasyon.MalzemeKarti ek V betiğiyle açılır (Bölüm 2.3).
   En çok bir hedef: ürün (varyantlı ya da varyantsız) ya da parça.
   -------------------------------------------------------------------------- */

CREATE TABLE entegrasyon.LogoMalzemeKarti (
    MalzemeKodu          nvarchar(32) COLLATE Latin1_General_100_BIN2 NOT NULL,
    Ad                   nvarchar(200) COLLATE Turkish_100_CI_AS NULL,
    LogoFirmaNo          smallint NOT NULL,
    DisKayitNo           nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
    MarkaKodu            nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    UrunKodu             nvarchar(60) COLLATE Latin1_General_100_BIN2 NULL,
    VaryantKodu          nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    ParcaKodu            nvarchar(24) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani         datetime2(3) NOT NULL
        CONSTRAINT DF_entegrasyon_LogoMalzemeKarti_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo              bigint IDENTITY(1,1) NOT NULL,
    Kimlik               uniqueidentifier NOT NULL
        CONSTRAINT DF_entegrasyon_LogoMalzemeKarti_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_entegrasyon_LogoMalzemeKarti PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_entegrasyon_LogoMalzemeKarti_LogoFirmaNoMalzemeKodu UNIQUE (LogoFirmaNo, MalzemeKodu),
    CONSTRAINT FK_entegrasyon_LogoMalzemeKarti_katalog_Marka
        FOREIGN KEY (MarkaKodu) REFERENCES katalog.Marka (Kod),
    CONSTRAINT FK_entegrasyon_LogoMalzemeKarti_katalog_Urun
        FOREIGN KEY (MarkaKodu, UrunKodu) REFERENCES katalog.Urun (MarkaKodu, Kod),
    CONSTRAINT FK_entegrasyon_LogoMalzemeKarti_katalog_UrunVaryanti
        FOREIGN KEY (MarkaKodu, UrunKodu, VaryantKodu) REFERENCES katalog.UrunVaryanti (MarkaKodu, UrunKodu, Kod),
    CONSTRAINT FK_entegrasyon_LogoMalzemeKarti_katalog_Parca
        FOREIGN KEY (MarkaKodu, ParcaKodu) REFERENCES katalog.Parca (MarkaKodu, Kod),
    CONSTRAINT CK_entegrasyon_LogoMalzemeKarti_MalzemeKodu
        CHECK (LEN(LTRIM(MalzemeKodu)) > 0),
    CONSTRAINT CK_entegrasyon_LogoMalzemeKarti_TekHedef
        CHECK (UrunKodu IS NULL OR ParcaKodu IS NULL),
    CONSTRAINT CK_entegrasyon_LogoMalzemeKarti_Varyant
        CHECK (VaryantKodu IS NULL OR UrunKodu IS NOT NULL),
    CONSTRAINT CK_entegrasyon_LogoMalzemeKarti_Marka
        CHECK (MarkaKodu IS NOT NULL OR (UrunKodu IS NULL AND ParcaKodu IS NULL))
);

CREATE UNIQUE CLUSTERED INDEX CX_entegrasyon_LogoMalzemeKarti_KayitNo ON entegrasyon.LogoMalzemeKarti (KayitNo);
CREATE NONCLUSTERED INDEX IX_entegrasyon_LogoMalzemeKarti_MalzemeKodu ON entegrasyon.LogoMalzemeKarti (MalzemeKodu);
CREATE NONCLUSTERED INDEX IX_entegrasyon_LogoMalzemeKarti_MarkaKoduUrunKoduVaryantKodu ON entegrasyon.LogoMalzemeKarti (MarkaKodu, UrunKodu, VaryantKodu);
CREATE NONCLUSTERED INDEX IX_entegrasyon_LogoMalzemeKarti_MarkaKoduParcaKodu ON entegrasyon.LogoMalzemeKarti (MarkaKodu, ParcaKodu);

EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoMalzemeKarti', @Metin = N'LOGO malzeme kartının katalogdaki ürüne, ürün varyantına ya da yedek parçaya eşlenmesi. Pilotta LOGO malzeme listesinin Excel dökümünden doldurulur. Bir kart en çok bir hedefe eşlenir; eşlenmemiş kartta hedef kolonları boştur.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoMalzemeKarti', @Alt = N'MalzemeKodu', @Metin = N'LOGO malzeme kodu, olduğu gibi.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoMalzemeKarti', @Alt = N'Ad', @Metin = N'LOGO''daki malzeme adı.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoMalzemeKarti', @Alt = N'LogoFirmaNo', @Metin = N'Kartın bulunduğu LOGO firma numarası.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoMalzemeKarti', @Alt = N'DisKayitNo', @Metin = N'Kartın LOGO''daki iç kayıt numarası (LOGICALREF), metin olarak. Kod değişse de bağ kopmasın diye tutulur.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoMalzemeKarti', @Alt = N'MarkaKodu', @Metin = N'Eşlenen ürünün ya da parçanın markası (katalog.Marka). Eşlenmemişse boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoMalzemeKarti', @Alt = N'UrunKodu', @Metin = N'Eşlenen ürün (katalog.Urun). Kart parçaya eşlendiyse boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoMalzemeKarti', @Alt = N'VaryantKodu', @Metin = N'Eşlenen ürün varyantı (katalog.UrunVaryanti). Yalnız UrunKodu doluyken yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoMalzemeKarti', @Alt = N'ParcaKodu', @Metin = N'Eşlenen yedek parça (katalog.Parca). Kart ürüne eşlendiyse boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoMalzemeKarti', @Alt = N'OlusmaZamani', @Metin = N'Satırın veritabanına yazıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoMalzemeKarti', @Alt = N'KayitNo', @Metin = N'Yalnız veritabanında satır seçmek içindir; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoMalzemeKarti', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda ve gorunum görünümlerinde yer almaz.';
GO


/* --------------------------------------------------------------------------
   entegrasyon.LogoSeriSorgusu — seri numarasının LOGO'ya sorulması [K]

   Cevap bir süre önbellekte tutulur; süre geçip makine.KayitOlayi
   başvurmuyorsa saklama kuralıyla silinir (Bölüm 1.13.4 logoSeriSorgusu).
   -------------------------------------------------------------------------- */

CREATE TABLE entegrasyon.LogoSeriSorgusu (
    SeriNo                nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    SorguZamani           datetime2(3) NOT NULL
        CONSTRAINT DF_entegrasyon_LogoSeriSorgusu_SorguZamani DEFAULT SYSUTCDATETIME(),
    SonucKodu             nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    CevapJson             nvarchar(max) COLLATE Latin1_General_100_BIN2 NULL,
    LogoFirmaNo           smallint NULL,
    MalzemeKodu           nvarchar(32) COLLATE Latin1_General_100_BIN2 NULL,
    CariKodu              nvarchar(32) COLLATE Latin1_General_100_BIN2 NULL,
    FaturaTarihi          date NULL,
    MarkaKodu             nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    BelgeBagiKimlik       uniqueidentifier NULL,
    GecerlilikBitisZamani datetime2(3) NOT NULL,
    KayitNo               bigint IDENTITY(1,1) NOT NULL,
    Kimlik                uniqueidentifier NOT NULL
        CONSTRAINT DF_entegrasyon_LogoSeriSorgusu_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_entegrasyon_LogoSeriSorgusu PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_entegrasyon_LogoSeriSorgusu_katalog_Marka
        FOREIGN KEY (MarkaKodu) REFERENCES katalog.Marka (Kod),
    CONSTRAINT FK_entegrasyon_LogoSeriSorgusu_entegrasyon_BelgeBagi
        FOREIGN KEY (BelgeBagiKimlik) REFERENCES entegrasyon.BelgeBagi (Kimlik),
    CONSTRAINT CK_entegrasyon_LogoSeriSorgusu_SonucKodu
        CHECK (SonucKodu IN (N'bulundu', N'bulunamadi', N'hata')),
    CONSTRAINT CK_entegrasyon_LogoSeriSorgusu_CevapJson
        CHECK (CevapJson IS NULL OR ISJSON(CevapJson) = 1),
    CONSTRAINT CK_entegrasyon_LogoSeriSorgusu_GecerlilikBitisZamani
        CHECK (GecerlilikBitisZamani >= SorguZamani)
);

CREATE UNIQUE CLUSTERED INDEX CX_entegrasyon_LogoSeriSorgusu_KayitNo ON entegrasyon.LogoSeriSorgusu (KayitNo);
CREATE NONCLUSTERED INDEX IX_entegrasyon_LogoSeriSorgusu_MarkaKoduSeriNoSorguZamani ON entegrasyon.LogoSeriSorgusu (MarkaKodu, SeriNo, SorguZamani DESC);
CREATE NONCLUSTERED INDEX IX_entegrasyon_LogoSeriSorgusu_BelgeBagiKimlik ON entegrasyon.LogoSeriSorgusu (BelgeBagiKimlik);
CREATE NONCLUSTERED INDEX IX_entegrasyon_LogoSeriSorgusu_GecerlilikBitisZamani ON entegrasyon.LogoSeriSorgusu (GecerlilikBitisZamani);

EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoSeriSorgusu', @Metin = N'Bir makine seri numarasının LOGO''ya sorulması ve cevabı (fatura tarihi, faturanın kesildiği cari, malzeme kodu). Müşteri makinesini kaydederken yeni satış olup olmadığı buradan anlaşılır. Cevap bir süre tekrar kullanılır; süresi geçen satır saklama kuralıyla silinir.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoSeriSorgusu', @Alt = N'SeriNo', @Metin = N'Sorulan seri numarası, sadeleştirilmiş hâliyle (büyük harf, yalnız A-Z ve 0-9).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoSeriSorgusu', @Alt = N'SorguZamani', @Metin = N'LOGO''ya sorulduğu an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoSeriSorgusu', @Alt = N'SonucKodu', @Metin = N'Sorgunun sonucu: bulundu, bulunamadi ya da hata (LOGO''ya ulaşılamadı).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoSeriSorgusu', @Alt = N'CevapJson', @Metin = N'LOGO''dan gelen ham cevap (JSON). Saklama kuralıyla silinir.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoSeriSorgusu', @Alt = N'LogoFirmaNo', @Metin = N'Cevabın geldiği LOGO firma numarası.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoSeriSorgusu', @Alt = N'MalzemeKodu', @Metin = N'Faturadaki LOGO malzeme kodu, olduğu gibi.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoSeriSorgusu', @Alt = N'CariKodu', @Metin = N'Faturanın kesildiği carinin (bayinin) LOGO cari kodu, olduğu gibi.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoSeriSorgusu', @Alt = N'FaturaTarihi', @Metin = N'Makinenin satış faturasının tarihi (faturanın üzerindeki gün).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoSeriSorgusu', @Alt = N'MarkaKodu', @Metin = N'Sorulan makinenin markası (katalog.Marka; örnek paksan).';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoSeriSorgusu', @Alt = N'BelgeBagiKimlik', @Metin = N'Cevaptaki satış faturasının belge bağı (entegrasyon.BelgeBagi). Bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoSeriSorgusu', @Alt = N'GecerlilikBitisZamani', @Metin = N'Cevabın tekrar kullanılabileceği son an (UTC). Saklama süresi buradan sayılır.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoSeriSorgusu', @Alt = N'KayitNo', @Metin = N'Yalnız veritabanında satır seçmek içindir; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon', @Nesne = N'LogoSeriSorgusu', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda ve gorunum görünümlerinde yer almaz.';
GO
