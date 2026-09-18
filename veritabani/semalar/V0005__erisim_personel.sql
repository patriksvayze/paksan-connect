/* ==========================================================================
   V0005 — erisim ve personel

   Personel ve servis girişleri, roller ve izinler, şifre sıfırlama
   jetonları, giriş denemeleri ve personel kartı.

   Kural kaynağı: veritabani/tasarim.md (Bölüm 0.4 erisim/personel, 1.3,
   1.4, 1.11.1, 1.14, 1.17.5, 6.2). Yetkiler (GRANT/DENY) V0015'te.
   erisim.Oturum ve erisim.DogrulamaKodu V0014'te.

   Bağımlılık: V0001 (şemalar, dbo.AciklamaYaz), V0002 (kod.AktorTuru,
   kod.TalepTuru, kod.KaynakUygulama).
   ========================================================================== */

/* ------------------------------------------------------ erisim.Kullanici */

CREATE TABLE erisim.Kullanici (
    GirisAdi                nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    SifreKaydi              nvarchar(255) COLLATE Latin1_General_100_BIN2 NULL,
    SifreBelirlemeGerekli   bit           NOT NULL CONSTRAINT DF_erisim_Kullanici_SifreBelirlemeGerekli DEFAULT 1,
    TurKodu                 nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    Aktif                   bit           NOT NULL CONSTRAINT DF_erisim_Kullanici_Aktif DEFAULT 1,
    BasarisizGirisSayisi    smallint      NOT NULL CONSTRAINT DF_erisim_Kullanici_BasarisizGirisSayisi DEFAULT 0,
    KilitBitisZamani        datetime2(3)  NULL,
    SonGirisZamani          datetime2(3)  NULL,
    SifreDegistirmeZamani   datetime2(3)  NULL,
    OlusmaZamani            datetime2(3)  NOT NULL CONSTRAINT DF_erisim_Kullanici_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                 bigint        IDENTITY(1,1) NOT NULL,
    Kimlik                  uniqueidentifier NOT NULL CONSTRAINT DF_erisim_Kullanici_Kimlik DEFAULT NEWID(),
    SatirSurumu             rowversion    NOT NULL,

    CONSTRAINT PK_erisim_Kullanici PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_erisim_Kullanici_GirisAdi UNIQUE (GirisAdi),
    CONSTRAINT FK_erisim_Kullanici_kod_AktorTuru FOREIGN KEY (TurKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT CK_erisim_Kullanici_TurKodu CHECK (TurKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')),
    CONSTRAINT CK_erisim_Kullanici_GirisAdi CHECK (
            LEN(GirisAdi) BETWEEN 3 AND 40
        AND GirisAdi NOT LIKE N'%[^a-z0-9.]%'
        AND GirisAdi NOT LIKE N'.%'
        AND GirisAdi NOT LIKE N'%.'
        AND GirisAdi NOT LIKE N'%..%'),
    CONSTRAINT CK_erisim_Kullanici_SifreKaydi CHECK (SifreKaydi IS NULL OR SifreKaydi LIKE N'$%$%')
);

CREATE UNIQUE CLUSTERED INDEX CX_erisim_Kullanici_KayitNo ON erisim.Kullanici (KayitNo);
CREATE INDEX IX_erisim_Kullanici_TurKodu ON erisim.Kullanici (TurKodu);

EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Kullanici',
    @Metin = N'Backoffice personelinin ve servislerin (Servisim) giriş hesabı: giriş adı, şifre özeti, giriş açık mı. Müşteri girişi burada değil, musteri.Hesap tablosundadır. Giriş adı personel ve servis arasında tektir.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Kullanici', @Alt = N'GirisAdi',
    @Metin = N'Giriş ekranına yazılan kullanıcı adı (ör. ali.yilmaz, konya.merkez). Yalnız küçük harf, rakam ve nokta; 3-40 karakter; başta ya da sonda nokta ve yan yana iki nokta olamaz. Personel ve servis arasında tektir. Küçük harfle saklanır; büyük harfle yapılan eşitlik araması (IZMIR.MERKEZ) kayıt bulmaz. Her yazımla aramak için WHERE GirisAdi = (SELECT GirisAdi FROM yardim.Sadelestir(N''IZMIR.MERKEZ'')) kullanın.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Kullanici', @Alt = N'SifreKaydi',
    @Metin = N'Şifrenin geri çevrilemeyen kaydı: yöntem, ayarlar, tuz ve özet tek metinde ($scrypt$ ile başlar). Şifrenin kendisi hiçbir yerde saklanmaz. Boşsa kullanıcı henüz şifre belirlememiştir. Yalnız erisim.SifreYaz prosedürü yazar.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Kullanici', @Alt = N'SifreBelirlemeGerekli',
    @Metin = N'1 ise kullanıcı ilk girişte ya da şifresi sıfırlandıktan sonra tek kullanımlık kodla yeni şifre belirlemek zorundadır.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Kullanici', @Alt = N'TurKodu',
    @Metin = N'Girişin kime ait olduğu: personel ya da servis (kod.AktorTuru). Müşteri, sistem ve entegrasyon olamaz.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Kullanici', @Alt = N'Aktif',
    @Metin = N'Giriş açık mı (1 = açık, 0 = kapalı). Girişin açık olup olmadığının tek kaynağı budur; kapalı hesap giriş yapamaz.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Kullanici', @Alt = N'BasarisizGirisSayisi',
    @Metin = N'Son başarılı girişten bu yana üst üste yazılan yanlış şifre sayısı.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Kullanici', @Alt = N'KilitBitisZamani',
    @Metin = N'Çok sayıda yanlış şifreden sonra girişin kilitli kalacağı son an (UTC). Boşsa kilit yok.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Kullanici', @Alt = N'SonGirisZamani',
    @Metin = N'Son başarılı giriş anı (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Kullanici', @Alt = N'SifreDegistirmeZamani',
    @Metin = N'Şifrenin en son belirlendiği ya da değiştirildiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Kullanici', @Alt = N'OlusmaZamani',
    @Metin = N'Girişin açıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Kullanici', @Alt = N'KayitNo',
    @Metin = N'Satırı SSMS içinde seçmek için sıra numarası. İş anlamı yoktur; ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Kullanici', @Alt = N'Kimlik',
    @Metin = N'Satırın teknik anahtarı (GUID). Başka tablolar girişe bu değerle bağlanır; ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Kullanici', @Alt = N'SatirSurumu',
    @Metin = N'İki kişinin aynı satırı aynı anda değiştirmesini yakalayan sürüm damgası; her güncellemede kendiliğinden değişir.';
GO

/* ----------------------------------------------------- erisim.IzinGrubu */

CREATE TABLE erisim.IzinGrubu (
    Kod     nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    Ad      nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira    smallint      NOT NULL CONSTRAINT DF_erisim_IzinGrubu_Sira DEFAULT 0,
    Aktif   bit           NOT NULL CONSTRAINT DF_erisim_IzinGrubu_Aktif DEFAULT 1,

    CONSTRAINT PK_erisim_IzinGrubu PRIMARY KEY CLUSTERED (Kod),
    CONSTRAINT CK_erisim_IzinGrubu_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%')
);

EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'IzinGrubu',
    @Metin = N'Backoffice Roller ekranında izinlerin toplandığı başlıklar (Talepler, Müşteriler, Servisler, Yönetim, Hesaplar). Kaynak: src/data/yetkiler.js. Tohumla gelir.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'IzinGrubu', @Alt = N'Kod',
    @Metin = N'Grubun kodu (ör. talepler).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'IzinGrubu', @Alt = N'Ad',
    @Metin = N'Roller ekranında görünen grup başlığı.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'IzinGrubu', @Alt = N'Sira',
    @Metin = N'Ekrandaki gösterim sırası (küçük olan önce).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'IzinGrubu', @Alt = N'Aktif',
    @Metin = N'Grup kullanılıyor mu. Satır silinmez; kullanılmayan grup 0 olur.';
GO

/* ---------------------------------------------------------- erisim.Izin */

CREATE TABLE erisim.Izin (
    Kod       nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    Ad        nvarchar(200) COLLATE Turkish_100_CI_AS NOT NULL,
    GrupKodu  nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    Sira      smallint      NOT NULL CONSTRAINT DF_erisim_Izin_Sira DEFAULT 0,
    Aktif     bit           NOT NULL CONSTRAINT DF_erisim_Izin_Aktif DEFAULT 1,

    CONSTRAINT PK_erisim_Izin PRIMARY KEY CLUSTERED (Kod),
    CONSTRAINT FK_erisim_Izin_erisim_IzinGrubu FOREIGN KEY (GrupKodu) REFERENCES erisim.IzinGrubu (Kod),
    CONSTRAINT CK_erisim_Izin_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%')
);

CREATE INDEX IX_erisim_Izin_GrupKodu ON erisim.Izin (GrupKodu);

EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Izin',
    @Metin = N'Rollere verilebilen tek tek yetkiler (ör. Talepleri görür, Rolleri ve yetkilerini düzenler). Kaynak: src/data/yetkiler.js (YETKI_KATALOG). Tohumla gelir; kodu değişen iznin eski kodu kod.EskiDegerEslesmesi tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Izin', @Alt = N'Kod',
    @Metin = N'İznin kodu (ör. talepler, personelDuzenle). Uygulama yetkiyi bu kodla denetler.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Izin', @Alt = N'Ad',
    @Metin = N'Roller ekranındaki onay kutusunun yazısı.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Izin', @Alt = N'GrupKodu',
    @Metin = N'İznin bulunduğu grup (erisim.IzinGrubu).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Izin', @Alt = N'Sira',
    @Metin = N'Grup içindeki gösterim sırası (küçük olan önce).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Izin', @Alt = N'Aktif',
    @Metin = N'İzin kullanılıyor mu. Satır silinmez; kullanılmayan izin 0 olur.';
GO

/* ----------------------------------------------------------- erisim.Rol */

CREATE TABLE erisim.Rol (
    Ad                    nvarchar(100) COLLATE Turkish_100_CI_AS NOT NULL,
    Aciklama              nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    TumIzinler            bit           NOT NULL CONSTRAINT DF_erisim_Rol_TumIzinler DEFAULT 0,
    Sistem                bit           NOT NULL CONSTRAINT DF_erisim_Rol_Sistem DEFAULT 0,
    Kod                   nvarchar(40)  COLLATE Latin1_General_100_BIN2 NULL,
    TalepTuruKodu         nvarchar(40)  COLLATE Latin1_General_100_BIN2 NULL,
    Aktif                 bit           NOT NULL CONSTRAINT DF_erisim_Rol_Aktif DEFAULT 1,
    OlusmaZamani          datetime2(3)  NOT NULL CONSTRAINT DF_erisim_Rol_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo               bigint        IDENTITY(1,1) NOT NULL,
    Kimlik                uniqueidentifier NOT NULL CONSTRAINT DF_erisim_Rol_Kimlik DEFAULT NEWID(),
    EskiKayitNo           nvarchar(64)  COLLATE Latin1_General_100_BIN2 NULL,
    EskiNumara            nvarchar(20)  COLLATE Latin1_General_100_BIN2 NULL,
    GecerlilikBaslangici  datetime2(7)  GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    GecerlilikBitisi      datetime2(7)  GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (GecerlilikBaslangici, GecerlilikBitisi),

    CONSTRAINT PK_erisim_Rol PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_erisim_Rol_kod_TalepTuru FOREIGN KEY (TalepTuruKodu) REFERENCES kod.TalepTuru (Kod)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = gecmis.erisim_Rol, DATA_CONSISTENCY_CHECK = ON));

CREATE UNIQUE CLUSTERED INDEX CX_erisim_Rol_KayitNo ON erisim.Rol (KayitNo);
CREATE UNIQUE INDEX UX_erisim_Rol_Ad ON erisim.Rol (Ad) WHERE Aktif = 1;
CREATE UNIQUE INDEX UX_erisim_Rol_Kod ON erisim.Rol (Kod) WHERE Kod IS NOT NULL AND Aktif = 1;
CREATE INDEX IX_erisim_Rol_TalepTuruKodu ON erisim.Rol (TalepTuruKodu);
CREATE INDEX IX_erisim_Rol_EskiNumara ON erisim.Rol (EskiNumara) WHERE EskiNumara IS NOT NULL;

EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Rol',
    @Metin = N'Backoffice rolleri (Admin, Yönetici, Servis Masası, Yedek Parça, Satış ve ekrandan açılanlar). Personelin yetkisi rolünden gelir; kişiye özel yetki yoktur. Silinen rol satırı silinmez, Aktif = 0 olur. Eski hâlleri gecmis.erisim_Rol tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Rol', @Alt = N'Ad',
    @Metin = N'Roller ekranında görünen rol adı. Aktif roller arasında tektir; silinmiş bir rolün adı yeniden kullanılabilir.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Rol', @Alt = N'Aciklama',
    @Metin = N'Rolün ne işe yaradığını anlatan kısa açıklama.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Rol', @Alt = N'TumIzinler',
    @Metin = N'1 ise rol bütün izinlere sahiptir ve sonradan eklenen izni de kendiliğinden alır (Admin).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Rol', @Alt = N'Sistem',
    @Metin = N'1 ise rol kilitlidir: adı ve yetkileri değiştirilemez, silinemez (Admin).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Rol', @Alt = N'Kod',
    @Metin = N'Tohumla gelen varsayılan rollerin sabit kodu (admin, yonetici, servis-masasi, yedek-parca, satis). Ekrandan açılan rollerde boş. Aktif roller arasında tektir.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Rol', @Alt = N'TalepTuruKodu',
    @Metin = N'Rolün gördüğü talep türü (kod.TalepTuru). Boşsa rol bütün talepleri görür; doluysa bu türdeki talepleri ve masasında bekleyen talepleri görür.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Rol', @Alt = N'Aktif',
    @Metin = N'Rol kullanılıyor mu (1 = evet). Silinen rol 0 olur; o roldeki personel önce başka role taşınır.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Rol', @Alt = N'OlusmaZamani',
    @Metin = N'Rolün açıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Rol', @Alt = N'KayitNo',
    @Metin = N'Satırı SSMS içinde seçmek için sıra numarası. İş anlamı yoktur; ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Rol', @Alt = N'Kimlik',
    @Metin = N'Satırın teknik anahtarı (GUID). Personel rolüne bu değerle bağlanır; tohumla gelen rollerde her ortamda aynıdır.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Rol', @Alt = N'EskiKayitNo',
    @Metin = N'Eski sistemdeki rol kimliği (ör. servis, parca); taşımada eşleştirmek için.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Rol', @Alt = N'EskiNumara',
    @Metin = N'Eski sistemdeki okunur numara; yeniden verilmez, yalnız aramak için.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Rol', @Alt = N'GecerlilikBaslangici',
    @Metin = N'Satırın bu hâlinin geçerli olmaya başladığı an (UTC). SQL Server yazar; SELECT * içinde görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Rol', @Alt = N'GecerlilikBitisi',
    @Metin = N'Satırın bu hâlinin geçerliliğinin bittiği an (UTC; güncel satırda 9999-12-31). SQL Server yazar; SELECT * içinde görünmez.';
GO

/* ------------------------------------------------------- erisim.RolIzin */

CREATE TABLE erisim.RolIzin (
    RolKimlik             uniqueidentifier NOT NULL,
    IzinKodu              nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    GecerlilikBaslangici  datetime2(7)  GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    GecerlilikBitisi      datetime2(7)  GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (GecerlilikBaslangici, GecerlilikBitisi),

    CONSTRAINT PK_erisim_RolIzin PRIMARY KEY CLUSTERED (RolKimlik, IzinKodu),
    CONSTRAINT FK_erisim_RolIzin_erisim_Rol FOREIGN KEY (RolKimlik) REFERENCES erisim.Rol (Kimlik),
    CONSTRAINT FK_erisim_RolIzin_erisim_Izin FOREIGN KEY (IzinKodu) REFERENCES erisim.Izin (Kod)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = gecmis.erisim_RolIzin, DATA_CONSISTENCY_CHECK = ON));

CREATE INDEX IX_erisim_RolIzin_IzinKodu ON erisim.RolIzin (IzinKodu);

EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'RolIzin',
    @Metin = N'Hangi rolün hangi izne sahip olduğu (rol × izin). Roller ekranında onay kutusu işaretlenince satır eklenir, kaldırılınca silinir. Eski hâlleri gecmis.erisim_RolIzin tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'RolIzin', @Alt = N'RolKimlik',
    @Metin = N'Rol (erisim.Rol).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'RolIzin', @Alt = N'IzinKodu',
    @Metin = N'Role verilen izin (erisim.Izin).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'RolIzin', @Alt = N'GecerlilikBaslangici',
    @Metin = N'Satırın bu hâlinin geçerli olmaya başladığı an (UTC). SQL Server yazar; SELECT * içinde görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'RolIzin', @Alt = N'GecerlilikBitisi',
    @Metin = N'Satırın bu hâlinin geçerliliğinin bittiği an (UTC; güncel satırda 9999-12-31). SQL Server yazar; SELECT * içinde görünmez.';
GO

/* ------------------------------------------ erisim.SifreSifirlamaJetonu */

CREATE TABLE erisim.SifreSifirlamaJetonu (
    JetonOzeti            binary(32)    NOT NULL,
    IsteyenIpAdresi       nvarchar(45)  COLLATE Latin1_General_100_BIN2 NULL,
    KullaniciKimlik       uniqueidentifier NOT NULL,
    SonGecerlilikZamani   datetime2(3)  NOT NULL,
    KullanilmaZamani      datetime2(3)  NULL,
    IptalZamani           datetime2(3)  NULL,
    OlusmaZamani          datetime2(3)  NOT NULL CONSTRAINT DF_erisim_SifreSifirlamaJetonu_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo               bigint        IDENTITY(1,1) NOT NULL,
    Kimlik                uniqueidentifier NOT NULL CONSTRAINT DF_erisim_SifreSifirlamaJetonu_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_erisim_SifreSifirlamaJetonu PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_erisim_SifreSifirlamaJetonu_JetonOzeti UNIQUE (JetonOzeti),
    CONSTRAINT FK_erisim_SifreSifirlamaJetonu_erisim_Kullanici FOREIGN KEY (KullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik)
);

CREATE UNIQUE CLUSTERED INDEX CX_erisim_SifreSifirlamaJetonu_KayitNo ON erisim.SifreSifirlamaJetonu (KayitNo);
CREATE INDEX IX_erisim_SifreSifirlamaJetonu_KullaniciKimlik ON erisim.SifreSifirlamaJetonu (KullaniciKimlik)
    INCLUDE (SonGecerlilikZamani, KullanilmaZamani, IptalZamani);
CREATE INDEX IX_erisim_SifreSifirlamaJetonu_SonGecerlilikZamani ON erisim.SifreSifirlamaJetonu (SonGecerlilikZamani);

EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'SifreSifirlamaJetonu',
    @Metin = N'Personel ve servis girişine şifre belirletmek için verilen tek kullanımlık bağlantı ya da kod. Jetonun kendisi saklanmaz, yalnız özeti. Personelin e-postasına giden bağlantı da, yönetimin telefonda okuduğu 16 karakterlik kod da buraya yazılır. Süresi dolan satırları sistem.SaklamaUygula siler.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'SifreSifirlamaJetonu', @Alt = N'JetonOzeti',
    @Metin = N'Jetonun SHA-256 özeti. Gelen jeton aynı yolla özetlenip burada aranır; jetonun kendisi geri çıkarılamaz.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'SifreSifirlamaJetonu', @Alt = N'IsteyenIpAdresi',
    @Metin = N'Jetonu isteyen cihazın IP adresi (bilgi amaçlı).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'SifreSifirlamaJetonu', @Alt = N'KullaniciKimlik',
    @Metin = N'Jetonun ait olduğu giriş (erisim.Kullanici).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'SifreSifirlamaJetonu', @Alt = N'SonGecerlilikZamani',
    @Metin = N'Jetonun kullanılabileceği son an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'SifreSifirlamaJetonu', @Alt = N'KullanilmaZamani',
    @Metin = N'Jetonla şifrenin belirlendiği an (UTC). Doluysa jeton bir daha kullanılamaz.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'SifreSifirlamaJetonu', @Alt = N'IptalZamani',
    @Metin = N'Jetonun geçersiz kılındığı an (UTC): yeni jeton verildi, şifre değişti ya da personel ayrıldı.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'SifreSifirlamaJetonu', @Alt = N'OlusmaZamani',
    @Metin = N'Jetonun verildiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'SifreSifirlamaJetonu', @Alt = N'KayitNo',
    @Metin = N'Satırı SSMS içinde seçmek için sıra numarası. İş anlamı yoktur; ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'SifreSifirlamaJetonu', @Alt = N'Kimlik',
    @Metin = N'Satırın teknik anahtarı (GUID); ekranda görünmez.';
GO

/* -------------------------------------------------- erisim.GirisDenemesi */

CREATE TABLE erisim.GirisDenemesi (
    TanimlayiciOzeti      binary(32)    NOT NULL,
    IpAdresi              nvarchar(45)  COLLATE Latin1_General_100_BIN2 NULL,
    TanimlayiciTuruKodu   nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    SonucKodu             nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    KaynakUygulamaKodu    nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    DenemeZamani          datetime2(3)  NOT NULL CONSTRAINT DF_erisim_GirisDenemesi_DenemeZamani DEFAULT SYSUTCDATETIME(),
    KayitNo               bigint        IDENTITY(1,1) NOT NULL,
    Kimlik                uniqueidentifier NOT NULL CONSTRAINT DF_erisim_GirisDenemesi_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_erisim_GirisDenemesi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_erisim_GirisDenemesi_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_erisim_GirisDenemesi_TanimlayiciTuruKodu CHECK (TanimlayiciTuruKodu IN (N'girisAdi', N'telefon')),
    CONSTRAINT CK_erisim_GirisDenemesi_SonucKodu CHECK (SonucKodu IN (N'basarili', N'yanlisSifre', N'bilinmeyen', N'kilitli', N'pasif'))
);

CREATE UNIQUE CLUSTERED INDEX CX_erisim_GirisDenemesi_KayitNo ON erisim.GirisDenemesi (KayitNo);
CREATE INDEX IX_erisim_GirisDenemesi_TanimlayiciOzetiDenemeZamani ON erisim.GirisDenemesi (TanimlayiciOzeti, DenemeZamani);
CREATE INDEX IX_erisim_GirisDenemesi_IpAdresiDenemeZamani ON erisim.GirisDenemesi (IpAdresi, DenemeZamani);
CREATE INDEX IX_erisim_GirisDenemesi_KaynakUygulamaKodu ON erisim.GirisDenemesi (KaynakUygulamaKodu);
CREATE INDEX IX_erisim_GirisDenemesi_DenemeZamani ON erisim.GirisDenemesi (DenemeZamani);

EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'GirisDenemesi',
    @Metin = N'Personel, servis ve müşteri girişlerinde yapılan her deneme (başarılı ya da başarısız). Çok sayıda yanlış denemeyi yavaşlatmak ve kilitlemek için okunur. Giriş adı ya da telefon düz yazılmaz, yalnız özeti tutulur. Süresi dolan satırları sistem.SaklamaUygula siler.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'GirisDenemesi', @Alt = N'TanimlayiciOzeti',
    @Metin = N'Girilen giriş adının ya da telefonun gizli anahtarla alınmış özeti (HMAC-SHA256). Aynı kişiye yapılan denemeler bu özetle bulunur; değerin kendisi geri çıkarılamaz.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'GirisDenemesi', @Alt = N'IpAdresi',
    @Metin = N'Denemenin geldiği IP adresi.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'GirisDenemesi', @Alt = N'TanimlayiciTuruKodu',
    @Metin = N'Girilen bilgi: girisAdi (personel ve servis) ya da telefon (müşteri).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'GirisDenemesi', @Alt = N'SonucKodu',
    @Metin = N'Denemenin sonucu: basarili, yanlisSifre, bilinmeyen (böyle bir giriş yok), kilitli, pasif (giriş kapalı).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'GirisDenemesi', @Alt = N'KaynakUygulamaKodu',
    @Metin = N'Denemenin yapıldığı uygulama (kod.KaynakUygulama; ör. connect, backoffice, servisim).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'GirisDenemesi', @Alt = N'DenemeZamani',
    @Metin = N'Denemenin yapıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'GirisDenemesi', @Alt = N'KayitNo',
    @Metin = N'Satırı SSMS içinde seçmek için sıra numarası. İş anlamı yoktur; ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'GirisDenemesi', @Alt = N'Kimlik',
    @Metin = N'Satırın teknik anahtarı (GUID); ekranda görünmez.';
GO

/* ----------------------------------------------------- personel.Personel */

CREATE TABLE personel.Personel (
    AdSoyad               nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    AdArama AS CAST(LOWER(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
          AdSoyad COLLATE Latin1_General_100_BIN2,
          N'ç',N'c'), N'Ç',N'C'), N'ğ',N'g'), N'Ğ',N'G'), N'ı',N'i'), N'İ',N'I'),
          N'ö',N'o'), N'Ö',N'O'), N'ş',N's'), N'Ş',N'S'), N'ü',N'u'), N'Ü',N'U'),
          N'â',N'a'), N'Â',N'A'), N'î',N'i'), N'Î',N'I'), N'û',N'u'), N'Û',N'U')
      ) AS nvarchar(150)) PERSISTED,
    Eposta                nvarchar(254) COLLATE Latin1_General_100_CI_AS NULL,
    KullaniciKimlik       uniqueidentifier NOT NULL,
    RolKimlik             uniqueidentifier NOT NULL,
    TelefonE164           nvarchar(16)  COLLATE Latin1_General_100_BIN2 NULL,
    AyrilmaZamani         datetime2(3)  NULL,
    OlusmaZamani          datetime2(3)  NOT NULL CONSTRAINT DF_personel_Personel_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo               bigint        IDENTITY(1,1) NOT NULL,
    Kimlik                uniqueidentifier NOT NULL CONSTRAINT DF_personel_Personel_Kimlik DEFAULT NEWID(),
    EskiKayitNo           nvarchar(64)  COLLATE Latin1_General_100_BIN2 NULL,
    EskiNumara            nvarchar(20)  COLLATE Latin1_General_100_BIN2 NULL,
    SatirSurumu           rowversion    NOT NULL,
    GecerlilikBaslangici  datetime2(7)  GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    GecerlilikBitisi      datetime2(7)  GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (GecerlilikBaslangici, GecerlilikBitisi),

    CONSTRAINT PK_personel_Personel PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_personel_Personel_KullaniciKimlik UNIQUE (KullaniciKimlik),
    CONSTRAINT FK_personel_Personel_erisim_Kullanici FOREIGN KEY (KullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_personel_Personel_erisim_Rol FOREIGN KEY (RolKimlik) REFERENCES erisim.Rol (Kimlik),
    CONSTRAINT CK_personel_Personel_TelefonE164 CHECK (TelefonE164 IS NULL
        OR (TelefonE164 LIKE N'+[1-9]%' AND SUBSTRING(TelefonE164, 2, 15) NOT LIKE N'%[^0-9]%' AND LEN(TelefonE164) BETWEEN 8 AND 16))
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = gecmis.personel_Personel, DATA_CONSISTENCY_CHECK = ON));

CREATE UNIQUE CLUSTERED INDEX CX_personel_Personel_KayitNo ON personel.Personel (KayitNo);
CREATE UNIQUE INDEX UX_personel_Personel_Eposta ON personel.Personel (Eposta) WHERE Eposta IS NOT NULL AND AyrilmaZamani IS NULL;
CREATE INDEX IX_personel_Personel_RolKimlik ON personel.Personel (RolKimlik);
CREATE INDEX IX_personel_Personel_AdArama ON personel.Personel (AdArama);
CREATE INDEX IX_personel_Personel_TelefonE164 ON personel.Personel (TelefonE164);
CREATE INDEX IX_personel_Personel_EskiNumara ON personel.Personel (EskiNumara) WHERE EskiNumara IS NOT NULL;

EXEC dbo.AciklamaYaz @Sema = N'personel', @Nesne = N'Personel',
    @Metin = N'PAKSAN personelinin kartı: adı, e-postası, telefonu ve rolü. Giriş bilgisi (giriş adı, şifre, giriş açık mı) erisim.Kullanici tablosundadır. İşten ayrılan personel silinmez: AyrilmaZamani yazılır, girişi kapatılır. Eski hâlleri (ör. eski rolü) gecmis.personel_Personel tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'personel', @Nesne = N'Personel', @Alt = N'AdSoyad',
    @Metin = N'Personelin adı soyadı (Personel ekranında ve işlem kaydında görünen). Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz. Adı Türkçe harfsiz aramak için AdArama kolonunu LIKE N''%isik%'' biçiminde kullanın.';
EXEC dbo.AciklamaYaz @Sema = N'personel', @Nesne = N'Personel', @Alt = N'AdArama',
    @Metin = N'Adın aramada kullanılan hâli: Türkçe harfler sadeleştirilmiş, küçük harf (ör. Işık Çelik → isik celik). SQL Server kendisi hesaplar. Aranacak metni küçük harfle ve Türkçe harfsiz yazın: WHERE AdArama LIKE N''%isik%''.';
EXEC dbo.AciklamaYaz @Sema = N'personel', @Nesne = N'Personel', @Alt = N'Eposta',
    @Metin = N'Personelin şirket e-posta adresi; şifre bağlantısı buraya gider. Çalışan personel arasında tektir.';
EXEC dbo.AciklamaYaz @Sema = N'personel', @Nesne = N'Personel', @Alt = N'KullaniciKimlik',
    @Metin = N'Personelin giriş hesabı (erisim.Kullanici). Her personelin tek girişi vardır.';
EXEC dbo.AciklamaYaz @Sema = N'personel', @Nesne = N'Personel', @Alt = N'RolKimlik',
    @Metin = N'Personelin rolü (erisim.Rol); yetkileri bu rolden gelir.';
EXEC dbo.AciklamaYaz @Sema = N'personel', @Nesne = N'Personel', @Alt = N'TelefonE164',
    @Metin = N'Personelin telefonu, uluslararası biçimde (ör. +905321234567).';
EXEC dbo.AciklamaYaz @Sema = N'personel', @Nesne = N'Personel', @Alt = N'AyrilmaZamani',
    @Metin = N'Personelin işten ayrıldığı an (UTC). Boşsa çalışıyor. Giriş ayrıca erisim.Kullanici.Aktif ile kapatılır.';
EXEC dbo.AciklamaYaz @Sema = N'personel', @Nesne = N'Personel', @Alt = N'OlusmaZamani',
    @Metin = N'Personel kartının açıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'personel', @Nesne = N'Personel', @Alt = N'KayitNo',
    @Metin = N'Satırı SSMS içinde seçmek için sıra numarası. İş anlamı yoktur; ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'personel', @Nesne = N'Personel', @Alt = N'Kimlik',
    @Metin = N'Satırın teknik anahtarı (GUID); ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'personel', @Nesne = N'Personel', @Alt = N'EskiKayitNo',
    @Metin = N'Eski sistemdeki (tarayıcı deposundaki) personel kimliği; taşımada eşleştirmek için.';
EXEC dbo.AciklamaYaz @Sema = N'personel', @Nesne = N'Personel', @Alt = N'EskiNumara',
    @Metin = N'Eski sistemdeki personel numarası; yeniden verilmez, yalnız aramak için.';
EXEC dbo.AciklamaYaz @Sema = N'personel', @Nesne = N'Personel', @Alt = N'SatirSurumu',
    @Metin = N'İki kişinin aynı satırı aynı anda değiştirmesini yakalayan sürüm damgası; her güncellemede kendiliğinden değişir.';
EXEC dbo.AciklamaYaz @Sema = N'personel', @Nesne = N'Personel', @Alt = N'GecerlilikBaslangici',
    @Metin = N'Satırın bu hâlinin geçerli olmaya başladığı an (UTC). SQL Server yazar; SELECT * içinde görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'personel', @Nesne = N'Personel', @Alt = N'GecerlilikBitisi',
    @Metin = N'Satırın bu hâlinin geçerliliğinin bittiği an (UTC; güncel satırda 9999-12-31). SQL Server yazar; SELECT * içinde görünmez.';
GO

/* ------------------------------------------------ gecmis tablolarının açıklaması

   Sistem sürümlü üç tablonun geçmiş tablosunu SQL Server oluşturdu.
   Tablo açıklaması yazılır; kolon açıklamaları asıl tablodan kopyalanır. */

DECLARE @AsilSema sysname, @AsilTablo sysname, @GecmisTablo sysname;
DECLARE @Kolon sysname, @Metin nvarchar(3750);

DECLARE tablolar CURSOR LOCAL FAST_FORWARD FOR
    SELECT v.AsilSema, v.AsilTablo, v.GecmisTablo
    FROM (VALUES (N'erisim', N'Rol', N'erisim_Rol'),
                 (N'erisim', N'RolIzin', N'erisim_RolIzin'),
                 (N'personel', N'Personel', N'personel_Personel')) AS v (AsilSema, AsilTablo, GecmisTablo);

OPEN tablolar;
FETCH NEXT FROM tablolar INTO @AsilSema, @AsilTablo, @GecmisTablo;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @Metin = @AsilSema + N'.' + @AsilTablo
        + N' tablosunun eski hâlleri. Her değişiklikte SQL Server kendisi yazar; elle yazılmaz. Geçerli olduğu aralık GecerlilikBaslangici ve GecerlilikBitisi kolonlarındadır (UTC).';
    EXEC dbo.AciklamaYaz @Sema = N'gecmis', @Nesne = @GecmisTablo, @Metin = @Metin;

    DECLARE kolonlar CURSOR LOCAL FAST_FORWARD FOR
        SELECT c.name, CONVERT(nvarchar(3750), p.value)
        FROM sys.columns AS c
        JOIN sys.extended_properties AS p
          ON p.class = 1
         AND p.major_id = c.object_id
         AND p.minor_id = c.column_id
         AND p.name = N'MS_Description'
        WHERE c.object_id = OBJECT_ID(QUOTENAME(@AsilSema) + N'.' + QUOTENAME(@AsilTablo));

    OPEN kolonlar;
    FETCH NEXT FROM kolonlar INTO @Kolon, @Metin;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC dbo.AciklamaYaz @Sema = N'gecmis', @Nesne = @GecmisTablo, @Alt = @Kolon, @Metin = @Metin;
        FETCH NEXT FROM kolonlar INTO @Kolon, @Metin;
    END;
    CLOSE kolonlar;
    DEALLOCATE kolonlar;

    FETCH NEXT FROM tablolar INTO @AsilSema, @AsilTablo, @GecmisTablo;
END;
CLOSE tablolar;
DEALLOCATE tablolar;
GO
