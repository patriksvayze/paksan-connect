/* ==========================================================================
   V0006 — musteri ve kvkk

   PAKSAN Connect müşteri hesabı, hesaptaki kişiler, telefon geçmişi ve
   telefon değişikliği talebi, geri bildirim; KVKK metin sürümleri, rıza
   olayları ve başvurular.

   Kural kaynağı: veritabani/tasarim.md (Bölüm 0.4 musteri/kvkk, 1.3,
   1.4, 1.7, 1.13.5, 1.16, 1.17, 6.2, 6.3). Yetkiler V0015'te.

   İleri yabancı anahtarlar bu betikte YOK (tasarim.md 6.3):
     musteri.Hesap.BeyanBayiKimlik → bayi.Bayi        V0008'de eklenir
     kvkk.RizaOlayi.CihazKimlik    → bildirim.Cihaz   V0013'te eklenir
   İki kolonun dizini burada, tabloyla birlikte kurulur.

   Bağımlılık: V0001, V0002 (kod.*), V0003 (cografya.*), V0004
   (katalog.Marka), V0005 (erisim.Kullanici).
   ========================================================================== */

/* ---------------------------------------------------------- musteri.Hesap */

CREATE TABLE musteri.Hesap (
    SifreKaydi              nvarchar(255) COLLATE Latin1_General_100_BIN2 NULL,
    SaticiBeyani            nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    DilKodu                 nvarchar(5)   COLLATE Latin1_General_100_BIN2 NULL,
    BeyanBayiKimlik         uniqueidentifier NULL,
    BirlestigiHesapKimlik   uniqueidentifier NULL,
    KonumUlkeKodu           nvarchar(2)   COLLATE Latin1_General_100_BIN2 NOT NULL,
    IlKodu                  tinyint       NULL,
    IlceKodu                int           NULL,
    YurtdisiBolge           nvarchar(100) COLLATE Turkish_100_CI_AS NULL,
    YurtdisiIlce            nvarchar(100) COLLATE Turkish_100_CI_AS NULL,
    Adres                   nvarchar(500) COLLATE Turkish_100_CI_AS NULL,
    TelefonUlkeKodu         nvarchar(2)   COLLATE Latin1_General_100_BIN2 NULL,
    TelefonE164             nvarchar(16)  COLLATE Latin1_General_100_BIN2 NULL,
    TelefonUlusal           nvarchar(15)  COLLATE Latin1_General_100_BIN2 NULL,
    DurumKodu               nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    SifreDegistirmeZamani   datetime2(3)  NULL,
    SonGirisZamani          datetime2(3)  NULL,
    KapanmaZamani           datetime2(3)  NULL,
    AnonimlestirmeZamani    datetime2(3)  NULL,
    OlusmaZamani            datetime2(3)  NOT NULL CONSTRAINT DF_musteri_Hesap_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                 bigint        IDENTITY(1,1) NOT NULL,
    Kimlik                  uniqueidentifier NOT NULL CONSTRAINT DF_musteri_Hesap_Kimlik DEFAULT NEWID(),
    EskiKayitNo             nvarchar(64)  COLLATE Latin1_General_100_BIN2 NULL,
    EskiNumara              nvarchar(20)  COLLATE Latin1_General_100_BIN2 NULL,
    SatirSurumu             rowversion    NOT NULL,

    CONSTRAINT PK_musteri_Hesap PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_musteri_Hesap_kod_Dil FOREIGN KEY (DilKodu) REFERENCES kod.Dil (Kod),
    CONSTRAINT FK_musteri_Hesap_musteri_Hesap_Birlesme FOREIGN KEY (BirlestigiHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_musteri_Hesap_cografya_Ulke_Konum FOREIGN KEY (KonumUlkeKodu) REFERENCES cografya.Ulke (Kod),
    CONSTRAINT FK_musteri_Hesap_cografya_Il FOREIGN KEY (IlKodu) REFERENCES cografya.Il (IlKodu),
    CONSTRAINT FK_musteri_Hesap_cografya_Ilce FOREIGN KEY (IlKodu, IlceKodu) REFERENCES cografya.Ilce (IlKodu, IlceKodu),
    CONSTRAINT FK_musteri_Hesap_cografya_Ulke_Telefon FOREIGN KEY (TelefonUlkeKodu) REFERENCES cografya.Ulke (Kod),
    CONSTRAINT CK_musteri_Hesap_Konum CHECK (
           (KonumUlkeKodu = N'TR' AND YurtdisiBolge IS NULL AND YurtdisiIlce IS NULL)
        OR (KonumUlkeKodu <> N'TR' AND IlKodu IS NULL AND IlceKodu IS NULL)),
    CONSTRAINT CK_musteri_Hesap_KonumIlce CHECK (IlceKodu IS NULL OR IlKodu IS NOT NULL),
    CONSTRAINT CK_musteri_Hesap_TelefonE164 CHECK (TelefonE164 IS NULL
        OR (TelefonE164 LIKE N'+[1-9]%' AND SUBSTRING(TelefonE164, 2, 15) NOT LIKE N'%[^0-9]%' AND LEN(TelefonE164) BETWEEN 8 AND 16)),
    CONSTRAINT CK_musteri_Hesap_TelefonUlusal CHECK (TelefonUlusal IS NULL OR TelefonUlusal NOT LIKE N'%[^0-9]%'),
    CONSTRAINT CK_musteri_Hesap_SifreKaydi CHECK (SifreKaydi IS NULL OR SifreKaydi LIKE N'$%$%'),
    CONSTRAINT CK_musteri_Hesap_DurumKodu CHECK (DurumKodu IN (N'aktif', N'kapali', N'anonim', N'birlestirildi')),
    CONSTRAINT CK_musteri_Hesap_Birlesme CHECK (
           (DurumKodu = N'birlestirildi' AND BirlestigiHesapKimlik IS NOT NULL AND TelefonE164 IS NULL)
        OR (DurumKodu <> N'birlestirildi' AND BirlestigiHesapKimlik IS NULL)),
    CONSTRAINT CK_musteri_Hesap_BirlesmeKendine CHECK (BirlestigiHesapKimlik IS NULL OR BirlestigiHesapKimlik <> Kimlik),
    CONSTRAINT CK_musteri_Hesap_AnonimTelefon CHECK (DurumKodu <> N'anonim' OR TelefonE164 IS NULL)
);

CREATE UNIQUE CLUSTERED INDEX CX_musteri_Hesap_KayitNo ON musteri.Hesap (KayitNo);
CREATE UNIQUE INDEX UX_musteri_Hesap_Telefon ON musteri.Hesap (TelefonE164) WHERE TelefonE164 IS NOT NULL;
CREATE INDEX IX_musteri_Hesap_TelefonUlusal ON musteri.Hesap (TelefonUlusal);
CREATE INDEX IX_musteri_Hesap_IlKoduIlceKodu ON musteri.Hesap (IlKodu, IlceKodu);
CREATE INDEX IX_musteri_Hesap_KonumUlkeKodu ON musteri.Hesap (KonumUlkeKodu);
CREATE INDEX IX_musteri_Hesap_TelefonUlkeKodu ON musteri.Hesap (TelefonUlkeKodu);
CREATE INDEX IX_musteri_Hesap_DilKodu ON musteri.Hesap (DilKodu);
CREATE INDEX IX_musteri_Hesap_BeyanBayiKimlik ON musteri.Hesap (BeyanBayiKimlik);
CREATE INDEX IX_musteri_Hesap_BirlestigiHesapKimlik ON musteri.Hesap (BirlestigiHesapKimlik);
CREATE INDEX IX_musteri_Hesap_EskiNumara ON musteri.Hesap (EskiNumara) WHERE EskiNumara IS NOT NULL;

EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap',
    @Metin = N'PAKSAN Connect müşteri hesabı: giriş telefonu, şifre özeti, konum, dil ve hesap durumu. Kişilerin adı musteri.HesapKisisi tablosundadır. Hesap silinmez: kapatılır, anonimleştirilir ya da başka hesapla birleştirilir.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'SifreKaydi',
    @Metin = N'Şifrenin geri çevrilemeyen kaydı: yöntem, ayarlar, tuz ve özet tek metinde ($scrypt$ ile başlar); şifrenin kendisi saklanmaz. Yalnız musteri.SifreYaz prosedürü yazar. Anonimleştirmede boşaltılır.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'SaticiBeyani',
    @Metin = N'Müşterinin kayıtta yazdığı, makineyi aldığı yer (serbest metin). Anonimleştirmede boşaltılır.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'DilKodu',
    @Metin = N'Müşterinin uygulama dili (kod.Dil); bildirimler bu dilde gider.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'BeyanBayiKimlik',
    @Metin = N'Personelin, müşterinin satıcı beyanından eşleştirdiği bayi (bayi.Bayi).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'BirlestigiHesapKimlik',
    @Metin = N'Bu hesap başka bir hesaba katıldıysa kalan hesap (musteri.Hesap). Yalnız DurumKodu birlestirildi iken doludur.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'KonumUlkeKodu',
    @Metin = N'Müşterinin yaşadığı ülke (cografya.Ulke; TR = Türkiye).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'IlKodu',
    @Metin = N'Müşterinin ili, plaka koduyla (cografya.Il). Yurt dışında boş.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'IlceKodu',
    @Metin = N'Müşterinin ilçesi (cografya.Ilce). Yurt dışında boş.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'YurtdisiBolge',
    @Metin = N'Yurt dışındaki müşterinin bölgesi ya da eyaleti (serbest metin). Türkiye içinde boş.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'YurtdisiIlce',
    @Metin = N'Yurt dışındaki müşterinin şehri ya da ilçesi (serbest metin). Türkiye içinde boş.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'Adres',
    @Metin = N'Müşterinin açık adresi (serbest metin). Anonimleştirmede boşaltılır. Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'TelefonUlkeKodu',
    @Metin = N'Giriş telefonunun ülkesi (cografya.Ulke).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'TelefonE164',
    @Metin = N'Giriş telefonu, uluslararası biçimde (ör. +905321234567). Hesabın kimliğidir; hesaplar arasında tektir. Anonimleştirilen ve birleştirilen hesapta boş.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'TelefonUlusal',
    @Metin = N'Giriş telefonunun ülke kodu atılmış hâli (Türkiye için başında 0 olmadan 10 hane, ör. 5321234567); aramak için.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'DurumKodu',
    @Metin = N'Hesabın durumu: aktif, kapali (kapatıldı), anonim (kişisel verileri silindi), birlestirildi (başka hesaba katıldı).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'SifreDegistirmeZamani',
    @Metin = N'Şifrenin en son belirlendiği ya da değiştirildiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'SonGirisZamani',
    @Metin = N'Son başarılı giriş anı (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'KapanmaZamani',
    @Metin = N'Hesabın kapatıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'AnonimlestirmeZamani',
    @Metin = N'Hesabın kişisel verilerinin silindiği (anonimleştirildiği) an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'OlusmaZamani',
    @Metin = N'Hesabın açıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'KayitNo',
    @Metin = N'Satırı SSMS içinde seçmek için sıra numarası (görünümlerde HesapKayitNo). İş anlamı yoktur; ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'Kimlik',
    @Metin = N'Satırın teknik anahtarı (GUID). Talepler, makineler ve rıza kayıtları hesaba bu değerle bağlanır; ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'EskiKayitNo',
    @Metin = N'Eski sistemdeki (telefondaki) hesap kimliği; taşımada eşleştirmek için.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'EskiNumara',
    @Metin = N'Eski sistemdeki müşteri numarası; yeniden verilmez, yalnız aramak için.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'Hesap', @Alt = N'SatirSurumu',
    @Metin = N'İki kişinin aynı satırı aynı anda değiştirmesini yakalayan sürüm damgası; her güncellemede kendiliğinden değişir.';
GO

/* --------------------------------------------------- musteri.HesapKisisi */

CREATE TABLE musteri.HesapKisisi (
    Adi             nvarchar(75)  COLLATE Turkish_100_CI_AS NULL,
    Soyadi          nvarchar(75)  COLLATE Turkish_100_CI_AS NULL,
    AdSoyadArama AS CAST(LOWER(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
          ISNULL(Adi, N'') + N' ' + ISNULL(Soyadi, N'') COLLATE Latin1_General_100_BIN2,
          N'ç',N'c'), N'Ç',N'C'), N'ğ',N'g'), N'Ğ',N'G'), N'ı',N'i'), N'İ',N'I'),
          N'ö',N'o'), N'Ö',N'O'), N'ş',N's'), N'Ş',N'S'), N'ü',N'u'), N'Ü',N'U'),
          N'â',N'a'), N'Â',N'A'), N'î',N'i'), N'Î',N'I'), N'û',N'u'), N'Û',N'U')
      ) AS nvarchar(151)) PERSISTED,
    HesapKimlik     uniqueidentifier NOT NULL,
    RolKodu         nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    TelefonE164     nvarchar(16)  COLLATE Latin1_General_100_BIN2 NULL,
    TelefonUlusal   nvarchar(15)  COLLATE Latin1_General_100_BIN2 NULL,
    PasifZamani     datetime2(3)  NULL,
    OlusmaZamani    datetime2(3)  NOT NULL CONSTRAINT DF_musteri_HesapKisisi_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo         bigint        IDENTITY(1,1) NOT NULL,
    Kimlik          uniqueidentifier NOT NULL CONSTRAINT DF_musteri_HesapKisisi_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_musteri_HesapKisisi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_musteri_HesapKisisi_musteri_Hesap FOREIGN KEY (HesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_musteri_HesapKisisi_kod_KisiRolu FOREIGN KEY (RolKodu) REFERENCES kod.KisiRolu (Kod),
    CONSTRAINT CK_musteri_HesapKisisi_TelefonE164 CHECK (TelefonE164 IS NULL
        OR (TelefonE164 LIKE N'+[1-9]%' AND SUBSTRING(TelefonE164, 2, 15) NOT LIKE N'%[^0-9]%' AND LEN(TelefonE164) BETWEEN 8 AND 16)),
    CONSTRAINT CK_musteri_HesapKisisi_TelefonUlusal CHECK (TelefonUlusal IS NULL OR TelefonUlusal NOT LIKE N'%[^0-9]%')
);

CREATE UNIQUE CLUSTERED INDEX CX_musteri_HesapKisisi_KayitNo ON musteri.HesapKisisi (KayitNo);
CREATE UNIQUE INDEX UX_musteri_HesapKisisi_HesapSahibi ON musteri.HesapKisisi (HesapKimlik)
    WHERE RolKodu = N'hesapSahibi' AND PasifZamani IS NULL;
CREATE INDEX IX_musteri_HesapKisisi_HesapKimlik ON musteri.HesapKisisi (HesapKimlik);
CREATE INDEX IX_musteri_HesapKisisi_RolKodu ON musteri.HesapKisisi (RolKodu);
CREATE INDEX IX_musteri_HesapKisisi_AdSoyadArama ON musteri.HesapKisisi (AdSoyadArama);
CREATE INDEX IX_musteri_HesapKisisi_TelefonE164 ON musteri.HesapKisisi (TelefonE164);

EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapKisisi',
    @Metin = N'Hesaba bağlı kişiler: hesap sahibi ve yetkililer (aile üyesi, çalışan). Her hesapta tek etkin hesap sahibi olur. Giriş telefonu hesaptadır; buradaki telefon yalnız iletişim içindir.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapKisisi', @Alt = N'Adi',
    @Metin = N'Kişinin adı. Anonimleştirmede boşaltılır. Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz. Adı Türkçe harfsiz aramak için AdSoyadArama kolonunu LIKE N''%isik%'' biçiminde kullanın.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapKisisi', @Alt = N'Soyadi',
    @Metin = N'Kişinin soyadı. Anonimleştirmede boşaltılır. Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz. Adı Türkçe harfsiz aramak için AdSoyadArama kolonunu LIKE N''%isik%'' biçiminde kullanın.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapKisisi', @Alt = N'AdSoyadArama',
    @Metin = N'Ad ve soyadın aramada kullanılan hâli: Türkçe harfler sadeleştirilmiş, küçük harf (ör. Ayşe Işık → ayse isik). SQL Server kendisi hesaplar. Aranacak metni küçük harfle ve Türkçe harfsiz yazın: WHERE AdSoyadArama LIKE N''%isik%''.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapKisisi', @Alt = N'HesapKimlik',
    @Metin = N'Kişinin bağlı olduğu hesap (musteri.Hesap).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapKisisi', @Alt = N'RolKodu',
    @Metin = N'Kişinin hesaptaki rolü (kod.KisiRolu; ör. hesapSahibi, yetkili).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapKisisi', @Alt = N'TelefonE164',
    @Metin = N'Kişinin iletişim telefonu, uluslararası biçimde (ör. +905321234567). Giriş için kullanılmaz; tekil değildir.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapKisisi', @Alt = N'TelefonUlusal',
    @Metin = N'İletişim telefonunun ülke kodu atılmış hâli (Türkiye için başında 0 olmadan 10 hane).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapKisisi', @Alt = N'PasifZamani',
    @Metin = N'Kişinin hesaptan çıkarıldığı an (UTC). Boşsa kişi etkin.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapKisisi', @Alt = N'OlusmaZamani',
    @Metin = N'Kişinin hesaba eklendiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapKisisi', @Alt = N'KayitNo',
    @Metin = N'Satırı SSMS içinde seçmek için sıra numarası. İş anlamı yoktur; ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapKisisi', @Alt = N'Kimlik',
    @Metin = N'Satırın teknik anahtarı (GUID); ekranda görünmez.';
GO

/* -------------------------------------- musteri.TelefonDegisikligiTalebi */

CREATE TABLE musteri.TelefonDegisikligiTalebi (
    Numara                      nvarchar(10)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    BeyanAdi                    nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    EskiTelefonE164             nvarchar(16)  COLLATE Latin1_General_100_BIN2 NULL,
    YeniTelefonE164             nvarchar(16)  COLLATE Latin1_General_100_BIN2 NULL,
    KanitSeriNo                 nvarchar(40)  COLLATE Latin1_General_100_BIN2 NULL,
    SeriEslesti                 bit           NULL,
    EskiTelefonEslesti          bit           NULL,
    YeniTelefonBaskaHesapta     bit           NULL,
    HesapKimlik                 uniqueidentifier NULL,
    KanitMarkaKodu              nvarchar(20)  COLLATE Latin1_General_100_BIN2 NULL,
    KaynakUygulamaKodu          nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    KararVerenKullaniciKimlik   uniqueidentifier NULL,
    KararDurumuKodu             nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    KararZamani                 datetime2(3)  NULL,
    KararVerenAdi               nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KararNotu                   nvarchar(500) COLLATE Turkish_100_CI_AS NULL,
    UygulanmaZamani             datetime2(3)  NULL,
    OlusmaZamani                datetime2(3)  NOT NULL CONSTRAINT DF_musteri_TelefonDegisikligiTalebi_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    IstemciOlusmaZamani         datetime2(3)  NULL,
    KayitNo                     bigint        IDENTITY(1,1) NOT NULL,
    Kimlik                      uniqueidentifier NOT NULL CONSTRAINT DF_musteri_TelefonDegisikligiTalebi_Kimlik DEFAULT NEWID(),
    SatirSurumu                 rowversion    NOT NULL,

    CONSTRAINT PK_musteri_TelefonDegisikligiTalebi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_musteri_TelefonDegisikligiTalebi_Numara UNIQUE (Numara),
    CONSTRAINT FK_musteri_TelefonDegisikligiTalebi_musteri_Hesap FOREIGN KEY (HesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_musteri_TelefonDegisikligiTalebi_katalog_Marka FOREIGN KEY (KanitMarkaKodu) REFERENCES katalog.Marka (Kod),
    CONSTRAINT FK_musteri_TelefonDegisikligiTalebi_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT FK_musteri_TelefonDegisikligiTalebi_erisim_Kullanici FOREIGN KEY (KararVerenKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_musteri_TelefonDegisikligiTalebi_kod_KararDurumu FOREIGN KEY (KararDurumuKodu) REFERENCES kod.KararDurumu (Kod),
    CONSTRAINT CK_musteri_TelefonDegisikligiTalebi_NumaraBicimi CHECK (Numara LIKE N'[A-Z][A-Z][A-Z][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
    CONSTRAINT CK_musteri_TelefonDegisikligiTalebi_NumaraOneki CHECK (LEFT(Numara, 3) = N'TEL'),
    CONSTRAINT CK_musteri_TelefonDegisikligiTalebi_EskiTelefonE164 CHECK (EskiTelefonE164 IS NULL
        OR (EskiTelefonE164 LIKE N'+[1-9]%' AND SUBSTRING(EskiTelefonE164, 2, 15) NOT LIKE N'%[^0-9]%' AND LEN(EskiTelefonE164) BETWEEN 8 AND 16)),
    CONSTRAINT CK_musteri_TelefonDegisikligiTalebi_YeniTelefonE164 CHECK (YeniTelefonE164 IS NULL
        OR (YeniTelefonE164 LIKE N'+[1-9]%' AND SUBSTRING(YeniTelefonE164, 2, 15) NOT LIKE N'%[^0-9]%' AND LEN(YeniTelefonE164) BETWEEN 8 AND 16))
);

CREATE UNIQUE CLUSTERED INDEX CX_musteri_TelefonDegisikligiTalebi_KayitNo ON musteri.TelefonDegisikligiTalebi (KayitNo);
CREATE UNIQUE INDEX UX_musteri_TelefonDegisikligiTalebi_HesabinBekleyenTalebi ON musteri.TelefonDegisikligiTalebi (HesapKimlik)
    WHERE KararDurumuKodu = N'bekliyor' AND HesapKimlik IS NOT NULL;
CREATE INDEX IX_musteri_TelefonDegisikligiTalebi_HesapKimlik ON musteri.TelefonDegisikligiTalebi (HesapKimlik);
CREATE INDEX IX_musteri_TelefonDegisikligiTalebi_KanitMarkaKodu ON musteri.TelefonDegisikligiTalebi (KanitMarkaKodu);
CREATE INDEX IX_musteri_TelefonDegisikligiTalebi_KaynakUygulamaKodu ON musteri.TelefonDegisikligiTalebi (KaynakUygulamaKodu);
CREATE INDEX IX_musteri_TelefonDegisikligiTalebi_KararVerenKullaniciKimlik ON musteri.TelefonDegisikligiTalebi (KararVerenKullaniciKimlik);
CREATE INDEX IX_musteri_TelefonDegisikligiTalebi_KararDurumuKoduOlusmaZamani ON musteri.TelefonDegisikligiTalebi (KararDurumuKodu, OlusmaZamani);
CREATE INDEX IX_musteri_TelefonDegisikligiTalebi_EskiTelefonE164 ON musteri.TelefonDegisikligiTalebi (EskiTelefonE164);
CREATE INDEX IX_musteri_TelefonDegisikligiTalebi_YeniTelefonE164 ON musteri.TelefonDegisikligiTalebi (YeniTelefonE164);

EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi',
    @Metin = N'Müşterinin giriş telefonunu değiştirme isteği (TEL numaralı). Müşteri yeni telefonunu ve makinesinin seri numarasını yazar; personel backoffice Numara talepleri ekranında kontrol edip onaylar ya da reddeder. Oturum açmadan da bırakılabilir; o zaman hesap boştur.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'Numara',
    @Metin = N'Talebin okunur numarası, tiresiz saklanır (TEL2600008; ekranda TEL-26-00008). Tiresiz ve büyük harfle saklanır; ekrandaki TEL-26-00008 yazımıyla ya da küçük harfle yapılan eşitlik araması kayıt bulmaz. Numarayı her yazımla bulmak için EXEC yardim.Ara N''TEL-26-00008'' kullanın.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'BeyanAdi',
    @Metin = N'Talebi bırakanın adı (yazıldığı ya da hesapta olduğu gibi). Anonimleştirmede boşaltılır. Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'EskiTelefonE164',
    @Metin = N'Değiştirilecek eski telefon, uluslararası biçimde. Anonimleştirmede boşaltılır.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'YeniTelefonE164',
    @Metin = N'İstenen yeni telefon, uluslararası biçimde. Anonimleştirmede boşaltılır.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'KanitSeriNo',
    @Metin = N'Kimliği doğrulamak için müşterinin yazdığı makine seri numarası (yazıldığı gibi). Anonimleştirmede boşaltılır.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'SeriEslesti',
    @Metin = N'Yazılan seri numarası hesabın makinelerinden biriyle eşleşti mi (1 = evet). Boşsa kontrol edilmedi.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'EskiTelefonEslesti',
    @Metin = N'Yazılan eski telefon hesaptaki telefonla eşleşti mi (1 = evet). Boşsa kontrol edilmedi.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'YeniTelefonBaskaHesapta',
    @Metin = N'Yeni telefon başka bir hesapta kayıtlı mı (1 = evet; öyleyse önce hesaplar birleştirilir). Boşsa kontrol edilmedi.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'HesapKimlik',
    @Metin = N'Talebin ait olduğu hesap (musteri.Hesap). Oturum açmadan bırakıldıysa boş; onayda doldurulur.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'KanitMarkaKodu',
    @Metin = N'Yazılan seri numarasının markası (katalog.Marka).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'KaynakUygulamaKodu',
    @Metin = N'Talebin geldiği uygulama (kod.KaynakUygulama).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'KararVerenKullaniciKimlik',
    @Metin = N'Kararı veren personelin girişi (erisim.Kullanici).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'KararDurumuKodu',
    @Metin = N'Talebin durumu (kod.KararDurumu; ör. bekliyor, onaylandi, reddedildi). Bir hesabın aynı anda tek bekleyen talebi olur.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'KararZamani',
    @Metin = N'Kararın verildiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'KararVerenAdi',
    @Metin = N'Kararı veren personelin o anki adı.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'KararNotu',
    @Metin = N'Personelin karar notu (ör. ret nedeni).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'UygulanmaZamani',
    @Metin = N'Yeni telefonun hesaba yazıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'OlusmaZamani',
    @Metin = N'Talebin sunucuya ulaştığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'IstemciOlusmaZamani',
    @Metin = N'Talebin telefonda oluştuğu an (UTC; bilgi amaçlı, esas olan sunucu saatidir).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'KayitNo',
    @Metin = N'Satırı SSMS içinde seçmek için sıra numarası. İş anlamı yoktur; ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'Kimlik',
    @Metin = N'Satırın teknik anahtarı (GUID); ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'TelefonDegisikligiTalebi', @Alt = N'SatirSurumu',
    @Metin = N'İki kişinin aynı talebe aynı anda karar vermesini yakalayan sürüm damgası; her güncellemede kendiliğinden değişir.';
GO

/* ------------------------------------------- musteri.HesapTelefonGecmisi */

CREATE TABLE musteri.HesapTelefonGecmisi (
    TelefonE164                     nvarchar(16) COLLATE Latin1_General_100_BIN2 NULL,
    HesapKimlik                     uniqueidentifier NOT NULL,
    TelefonDegisikligiTalebiKimlik  uniqueidentifier NULL,
    BaslangicZamani                 datetime2(3) NOT NULL CONSTRAINT DF_musteri_HesapTelefonGecmisi_BaslangicZamani DEFAULT SYSUTCDATETIME(),
    BitisZamani                     datetime2(3) NULL,
    KayitNo                         bigint       IDENTITY(1,1) NOT NULL,
    Kimlik                          uniqueidentifier NOT NULL CONSTRAINT DF_musteri_HesapTelefonGecmisi_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_musteri_HesapTelefonGecmisi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_musteri_HesapTelefonGecmisi_musteri_Hesap FOREIGN KEY (HesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_musteri_HesapTelefonGecmisi_musteri_TelefonDegisikligiTalebi FOREIGN KEY (TelefonDegisikligiTalebiKimlik) REFERENCES musteri.TelefonDegisikligiTalebi (Kimlik),
    CONSTRAINT CK_musteri_HesapTelefonGecmisi_TelefonE164 CHECK (TelefonE164 IS NULL
        OR (TelefonE164 LIKE N'+[1-9]%' AND SUBSTRING(TelefonE164, 2, 15) NOT LIKE N'%[^0-9]%' AND LEN(TelefonE164) BETWEEN 8 AND 16))
);

CREATE UNIQUE CLUSTERED INDEX CX_musteri_HesapTelefonGecmisi_KayitNo ON musteri.HesapTelefonGecmisi (KayitNo);
CREATE UNIQUE INDEX UX_musteri_HesapTelefonGecmisi_GuncelTelefon ON musteri.HesapTelefonGecmisi (HesapKimlik) WHERE BitisZamani IS NULL;
CREATE INDEX IX_musteri_HesapTelefonGecmisi_HesapKimlik ON musteri.HesapTelefonGecmisi (HesapKimlik);
CREATE INDEX IX_musteri_HesapTelefonGecmisi_TelefonE164 ON musteri.HesapTelefonGecmisi (TelefonE164);
CREATE INDEX IX_musteri_HesapTelefonGecmisi_TelefonDegisikligiTalebiKimlik ON musteri.HesapTelefonGecmisi (TelefonDegisikligiTalebiKimlik);

EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapTelefonGecmisi',
    @Metin = N'Hesabın giriş telefonlarının geçmişi: hangi telefon ne zamandan ne zamana kullanıldı. Eski telefonuyla arayan müşteri bu tablodan bulunur. Her hesapta tek güncel (bitmemiş) satır olur.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapTelefonGecmisi', @Alt = N'TelefonE164',
    @Metin = N'O dönemdeki giriş telefonu, uluslararası biçimde (ör. +905321234567). Anonimleştirmede boşaltılır.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapTelefonGecmisi', @Alt = N'HesapKimlik',
    @Metin = N'Telefonun ait olduğu hesap (musteri.Hesap).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapTelefonGecmisi', @Alt = N'TelefonDegisikligiTalebiKimlik',
    @Metin = N'Bu telefona geçişi sağlayan telefon değişikliği talebi (musteri.TelefonDegisikligiTalebi). Hesap açılışındaki ilk telefonda boş.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapTelefonGecmisi', @Alt = N'BaslangicZamani',
    @Metin = N'Telefonun giriş telefonu olarak kullanılmaya başladığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapTelefonGecmisi', @Alt = N'BitisZamani',
    @Metin = N'Telefonun bırakıldığı an (UTC). Boşsa hesabın güncel telefonu.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapTelefonGecmisi', @Alt = N'KayitNo',
    @Metin = N'Satırı SSMS içinde seçmek için sıra numarası. İş anlamı yoktur; ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'HesapTelefonGecmisi', @Alt = N'Kimlik',
    @Metin = N'Satırın teknik anahtarı (GUID); ekranda görünmez.';
GO

/* -------------------------------------------------- musteri.GeriBildirim */

CREATE TABLE musteri.GeriBildirim (
    Numara                  nvarchar(10)   COLLATE Latin1_General_100_BIN2 NOT NULL,
    Metin                   nvarchar(1000) COLLATE Turkish_100_CI_AS NOT NULL,
    UygulamaSurumu          nvarchar(20)   COLLATE Latin1_General_100_BIN2 NOT NULL,
    IletisimAdi             nvarchar(150)  COLLATE Turkish_100_CI_AS NULL,
    HesapKimlik             uniqueidentifier NULL,
    DilKodu                 nvarchar(5)    COLLATE Latin1_General_100_BIN2 NOT NULL,
    OkuyanKullaniciKimlik   uniqueidentifier NULL,
    IletisimTelefonE164     nvarchar(16)   COLLATE Latin1_General_100_BIN2 NULL,
    OkunmaZamani            datetime2(3)   NULL,
    OkuyanAdi               nvarchar(150)  COLLATE Turkish_100_CI_AS NULL,
    OlusmaZamani            datetime2(3)   NOT NULL CONSTRAINT DF_musteri_GeriBildirim_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    IstemciOlusmaZamani     datetime2(3)   NULL,
    KayitNo                 bigint         IDENTITY(1,1) NOT NULL,
    Kimlik                  uniqueidentifier NOT NULL CONSTRAINT DF_musteri_GeriBildirim_Kimlik DEFAULT NEWID(),
    EskiKayitNo             nvarchar(64)   COLLATE Latin1_General_100_BIN2 NULL,
    EskiNumara              nvarchar(20)   COLLATE Latin1_General_100_BIN2 NULL,
    SatirSurumu             rowversion     NOT NULL,

    CONSTRAINT PK_musteri_GeriBildirim PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_musteri_GeriBildirim_Numara UNIQUE (Numara),
    CONSTRAINT FK_musteri_GeriBildirim_musteri_Hesap FOREIGN KEY (HesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_musteri_GeriBildirim_kod_Dil FOREIGN KEY (DilKodu) REFERENCES kod.Dil (Kod),
    CONSTRAINT FK_musteri_GeriBildirim_erisim_Kullanici FOREIGN KEY (OkuyanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT CK_musteri_GeriBildirim_NumaraBicimi CHECK (Numara LIKE N'[A-Z][A-Z][A-Z][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
    CONSTRAINT CK_musteri_GeriBildirim_NumaraOneki CHECK (LEFT(Numara, 3) = N'GBD'),
    CONSTRAINT CK_musteri_GeriBildirim_Metin CHECK (LEN(Metin) BETWEEN 5 AND 1000),
    CONSTRAINT CK_musteri_GeriBildirim_IletisimTelefonE164 CHECK (IletisimTelefonE164 IS NULL
        OR (IletisimTelefonE164 LIKE N'+[1-9]%' AND SUBSTRING(IletisimTelefonE164, 2, 15) NOT LIKE N'%[^0-9]%' AND LEN(IletisimTelefonE164) BETWEEN 8 AND 16))
);

CREATE UNIQUE CLUSTERED INDEX CX_musteri_GeriBildirim_KayitNo ON musteri.GeriBildirim (KayitNo);
CREATE INDEX IX_musteri_GeriBildirim_OkunmamisOlusmaZamani ON musteri.GeriBildirim (OlusmaZamani) WHERE OkunmaZamani IS NULL;
CREATE INDEX IX_musteri_GeriBildirim_HesapKimlik ON musteri.GeriBildirim (HesapKimlik);
CREATE INDEX IX_musteri_GeriBildirim_DilKodu ON musteri.GeriBildirim (DilKodu);
CREATE INDEX IX_musteri_GeriBildirim_OkuyanKullaniciKimlik ON musteri.GeriBildirim (OkuyanKullaniciKimlik);
CREATE INDEX IX_musteri_GeriBildirim_IletisimTelefonE164 ON musteri.GeriBildirim (IletisimTelefonE164);
CREATE INDEX IX_musteri_GeriBildirim_EskiNumara ON musteri.GeriBildirim (EskiNumara) WHERE EskiNumara IS NOT NULL;

EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirim',
    @Metin = N'Müşterinin PAKSAN Connect Profil ekranından gönderdiği görüş ve öneriler (GBD numaralı). Backoffice Geri bildirimler ekranında okunur ve cevaplanır.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirim', @Alt = N'Numara',
    @Metin = N'Geri bildirimin okunur numarası, tiresiz saklanır (GBD2600012; ekranda GBD-26-00012). Tiresiz ve büyük harfle saklanır; ekrandaki GBD-26-00003 yazımıyla ya da küçük harfle yapılan eşitlik araması kayıt bulmaz. Numarayı her yazımla bulmak için EXEC yardim.Ara N''GBD-26-00003'' kullanın.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirim', @Alt = N'Metin',
    @Metin = N'Müşterinin yazdığı görüş (5-1000 karakter). Anonimleştirmede sabit bir metinle değiştirilir.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirim', @Alt = N'UygulamaSurumu',
    @Metin = N'Gönderen uygulamanın sürümü (ör. 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirim', @Alt = N'IletisimAdi',
    @Metin = N'Gönderim anında hesaptaki ad (o anki hâli). Anonimleştirmede boşaltılır. Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirim', @Alt = N'HesapKimlik',
    @Metin = N'Gönderen hesap (musteri.Hesap). Bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirim', @Alt = N'DilKodu',
    @Metin = N'Gönderim anında uygulamanın dili (kod.Dil).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirim', @Alt = N'OkuyanKullaniciKimlik',
    @Metin = N'Okundu işaretleyen personelin girişi (erisim.Kullanici).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirim', @Alt = N'IletisimTelefonE164',
    @Metin = N'Gönderim anında hesaptaki telefon, uluslararası biçimde. Anonimleştirmede boşaltılır.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirim', @Alt = N'OkunmaZamani',
    @Metin = N'Personelin okundu işaretlediği an (UTC). Boşsa okunmadı.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirim', @Alt = N'OkuyanAdi',
    @Metin = N'Okundu işaretleyen personelin o anki adı.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirim', @Alt = N'OlusmaZamani',
    @Metin = N'Geri bildirimin sunucuya ulaştığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirim', @Alt = N'IstemciOlusmaZamani',
    @Metin = N'Geri bildirimin telefonda yazıldığı an (UTC; bilgi amaçlı, esas olan sunucu saatidir).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirim', @Alt = N'KayitNo',
    @Metin = N'Satırı SSMS içinde seçmek için sıra numarası. İş anlamı yoktur; ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirim', @Alt = N'Kimlik',
    @Metin = N'Satırın teknik anahtarı (GUID); ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirim', @Alt = N'EskiKayitNo',
    @Metin = N'Eski sistemdeki (telefondaki) geri bildirim kimliği; taşımada eşleştirmek için.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirim', @Alt = N'EskiNumara',
    @Metin = N'Eski sistemdeki geri bildirim numarası; yeniden verilmez, yalnız aramak için.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirim', @Alt = N'SatirSurumu',
    @Metin = N'İki kişinin aynı satırı aynı anda değiştirmesini yakalayan sürüm damgası; her güncellemede kendiliğinden değişir.';
GO

/* ---------------------------------------------- musteri.GeriBildirimNotu */

CREATE TABLE musteri.GeriBildirimNotu (
    Metin                   nvarchar(2000) COLLATE Turkish_100_CI_AS NOT NULL,
    MusteriyeGonderildi     bit            NOT NULL CONSTRAINT DF_musteri_GeriBildirimNotu_MusteriyeGonderildi DEFAULT 0,
    GeriBildirimKimlik      uniqueidentifier NOT NULL,
    YapanTuruKodu           nvarchar(40)   COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik    uniqueidentifier NULL,
    YapanHesapKimlik        uniqueidentifier NULL,
    YapanAdi                nvarchar(150)  COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu      nvarchar(40)   COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu          nvarchar(20)   COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani            datetime2(3)   NOT NULL CONSTRAINT DF_musteri_GeriBildirimNotu_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                 bigint         IDENTITY(1,1) NOT NULL,
    Kimlik                  uniqueidentifier NOT NULL CONSTRAINT DF_musteri_GeriBildirimNotu_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_musteri_GeriBildirimNotu PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_musteri_GeriBildirimNotu_musteri_GeriBildirim FOREIGN KEY (GeriBildirimKimlik) REFERENCES musteri.GeriBildirim (Kimlik),
    CONSTRAINT FK_musteri_GeriBildirimNotu_kod_AktorTuru_Yapan FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_musteri_GeriBildirimNotu_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_musteri_GeriBildirimNotu_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_musteri_GeriBildirimNotu_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_musteri_GeriBildirimNotu_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);

CREATE UNIQUE CLUSTERED INDEX CX_musteri_GeriBildirimNotu_KayitNo ON musteri.GeriBildirimNotu (KayitNo);
CREATE INDEX IX_musteri_GeriBildirimNotu_GeriBildirimKimlik ON musteri.GeriBildirimNotu (GeriBildirimKimlik);
CREATE INDEX IX_musteri_GeriBildirimNotu_YapanTuruKodu ON musteri.GeriBildirimNotu (YapanTuruKodu);
CREATE INDEX IX_musteri_GeriBildirimNotu_YapanKullaniciKimlik ON musteri.GeriBildirimNotu (YapanKullaniciKimlik);
CREATE INDEX IX_musteri_GeriBildirimNotu_YapanHesapKimlik ON musteri.GeriBildirimNotu (YapanHesapKimlik);
CREATE INDEX IX_musteri_GeriBildirimNotu_KaynakUygulamaKodu ON musteri.GeriBildirimNotu (KaynakUygulamaKodu);

EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirimNotu',
    @Metin = N'Personelin geri bildirime yazdığı not ve cevaplar. Müşteriye gönderilen not onun Bildirimler ekranına düşer. Yalnız eklenir, değiştirilmez.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirimNotu', @Alt = N'Metin',
    @Metin = N'Notun metni. Anonimleştirmede sabit bir metinle değiştirilir.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirimNotu', @Alt = N'MusteriyeGonderildi',
    @Metin = N'1 ise not müşteriye cevap olarak gönderildi; 0 ise yalnız iç not.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirimNotu', @Alt = N'GeriBildirimKimlik',
    @Metin = N'Notun yazıldığı geri bildirim (musteri.GeriBildirim).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirimNotu', @Alt = N'YapanTuruKodu',
    @Metin = N'Notu kimin yazdığı: müşteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirimNotu', @Alt = N'YapanKullaniciKimlik',
    @Metin = N'Notu yazan personel ya da servis girişi (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirimNotu', @Alt = N'YapanHesapKimlik',
    @Metin = N'Notu yazan müşteri hesabı (musteri.Hesap). Yalnız müşteri yazdıysa dolu.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirimNotu', @Alt = N'YapanAdi',
    @Metin = N'Notu yazanın o anki adı. Müşteride boş.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirimNotu', @Alt = N'KaynakUygulamaKodu',
    @Metin = N'Notun yazıldığı uygulama (kod.KaynakUygulama; ör. backoffice, yonetim).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirimNotu', @Alt = N'UygulamaSurumu',
    @Metin = N'Notu gönderen uygulamanın sürümü (ör. 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirimNotu', @Alt = N'OlusmaZamani',
    @Metin = N'Notun yazıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirimNotu', @Alt = N'KayitNo',
    @Metin = N'Satırı SSMS içinde seçmek için sıra numarası. İş anlamı yoktur; ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'musteri', @Nesne = N'GeriBildirimNotu', @Alt = N'Kimlik',
    @Metin = N'Satırın teknik anahtarı (GUID); ekranda görünmez.';
GO

/* ---------------------------------------------------- kvkk.MetinSurumu */

CREATE TABLE kvkk.MetinSurumu (
    MetinKodu         nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    Surum             nvarchar(10)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    DilKodu           nvarchar(5)   COLLATE Latin1_General_100_BIN2 NOT NULL,
    Baslik            nvarchar(200) COLLATE Latin1_General_100_CI_AS NOT NULL,
    IcerikJson        nvarchar(max) COLLATE Latin1_General_100_BIN2 NOT NULL,
    IcerikOzeti       binary(32)    NOT NULL,
    AsilMetin         bit           NOT NULL,
    MetinTarihi       date          NOT NULL,
    HukukOnayiZamani  datetime2(3)  NULL,
    OlusmaZamani      datetime2(3)  NOT NULL CONSTRAINT DF_kvkk_MetinSurumu_OlusmaZamani DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_kvkk_MetinSurumu PRIMARY KEY CLUSTERED (MetinKodu, Surum, DilKodu),
    CONSTRAINT FK_kvkk_MetinSurumu_kod_RizaMetni FOREIGN KEY (MetinKodu) REFERENCES kod.RizaMetni (Kod),
    CONSTRAINT FK_kvkk_MetinSurumu_kod_Dil FOREIGN KEY (DilKodu) REFERENCES kod.Dil (Kod),
    CONSTRAINT CK_kvkk_MetinSurumu_IcerikJson CHECK (IcerikJson IS NULL OR ISJSON(IcerikJson) = 1)
);

CREATE INDEX IX_kvkk_MetinSurumu_DilKodu ON kvkk.MetinSurumu (DilKodu);

EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'MetinSurumu',
    @Metin = N'KVKK metinlerinin (Aydınlatma Metni, Açık Rıza Metni, ticari ileti izni) sürümleri; her dil ayrı satır. Müşterinin hangi metni onayladığı bu sürümle kaydedilir. İçerik değiştirilemez, metin değişince yeni sürüm eklenir. Tohumla gelir (src/data/kvkk.js).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'MetinSurumu', @Alt = N'MetinKodu',
    @Metin = N'Metnin türü (kod.RizaMetni; ör. aydinlatma, acikRiza, ticariIleti).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'MetinSurumu', @Alt = N'Surum',
    @Metin = N'Metnin sürümü (ör. 1.0).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'MetinSurumu', @Alt = N'DilKodu',
    @Metin = N'Metnin dili (kod.Dil).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'MetinSurumu', @Alt = N'Baslik',
    @Metin = N'Metnin satırın dilindeki başlığı (ör. KVKK Aydınlatma Metni).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'MetinSurumu', @Alt = N'IcerikJson',
    @Metin = N'Metnin bölümleri ve maddeleri, şirket bilgileri yerleştirilmiş hâliyle (JSON). Değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'MetinSurumu', @Alt = N'IcerikOzeti',
    @Metin = N'İçeriğin SHA-256 özeti; aynı sürüm numarasıyla farklı içerik yüklenmesini yakalar.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'MetinSurumu', @Alt = N'AsilMetin',
    @Metin = N'1 ise hukuken esas olan metin (Türkçe satır); çeviriler 0.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'MetinSurumu', @Alt = N'MetinTarihi',
    @Metin = N'Metnin üzerinde yazan tarih (Türkiye günü).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'MetinSurumu', @Alt = N'HukukOnayiZamani',
    @Metin = N'Hukuk danışmanının metni onayladığı an (UTC). Boşsa metin taslaktır. Yalnız bir kez, boştan doluya yazılabilir.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'MetinSurumu', @Alt = N'OlusmaZamani',
    @Metin = N'Sürümün veritabanına yüklendiği an (UTC).';
GO

/* ------------------------------------------------------ kvkk.RizaOlayi */

CREATE TABLE kvkk.RizaOlayi (
    RizaNotu                  nvarchar(500) COLLATE Turkish_100_CI_AS NULL,
    UygulamaSurumu            nvarchar(20)  COLLATE Latin1_General_100_BIN2 NULL,
    HesapKimlik               uniqueidentifier NOT NULL,
    MetinKodu                 nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    Surum                     nvarchar(10)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    DilKodu                   nvarchar(5)   COLLATE Latin1_General_100_BIN2 NOT NULL,
    SecimKodu                 nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    KanalKodu                 nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    CihazKimlik               uniqueidentifier NULL,
    KaydedenKullaniciKimlik   uniqueidentifier NULL,
    OlusmaZamani              datetime2(3)  NOT NULL CONSTRAINT DF_kvkk_RizaOlayi_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    IstemciOlusmaZamani       datetime2(3)  NULL,
    KayitNo                   bigint        IDENTITY(1,1) NOT NULL,
    Kimlik                    uniqueidentifier NOT NULL CONSTRAINT DF_kvkk_RizaOlayi_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_kvkk_RizaOlayi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_kvkk_RizaOlayi_musteri_Hesap FOREIGN KEY (HesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_kvkk_RizaOlayi_kvkk_MetinSurumu FOREIGN KEY (MetinKodu, Surum, DilKodu) REFERENCES kvkk.MetinSurumu (MetinKodu, Surum, DilKodu),
    CONSTRAINT FK_kvkk_RizaOlayi_kod_RizaSecimi FOREIGN KEY (SecimKodu) REFERENCES kod.RizaSecimi (Kod),
    CONSTRAINT FK_kvkk_RizaOlayi_kod_RizaKanali FOREIGN KEY (KanalKodu) REFERENCES kod.RizaKanali (Kod),
    CONSTRAINT FK_kvkk_RizaOlayi_erisim_Kullanici FOREIGN KEY (KaydedenKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik)
);

CREATE UNIQUE CLUSTERED INDEX CX_kvkk_RizaOlayi_KayitNo ON kvkk.RizaOlayi (KayitNo);
CREATE INDEX IX_kvkk_RizaOlayi_HesapKimlikMetinKoduOlusmaZamani ON kvkk.RizaOlayi (HesapKimlik, MetinKodu, OlusmaZamani DESC);
CREATE INDEX IX_kvkk_RizaOlayi_MetinKoduSurumDilKodu ON kvkk.RizaOlayi (MetinKodu, Surum, DilKodu);
CREATE INDEX IX_kvkk_RizaOlayi_SecimKodu ON kvkk.RizaOlayi (SecimKodu);
CREATE INDEX IX_kvkk_RizaOlayi_KanalKodu ON kvkk.RizaOlayi (KanalKodu);
CREATE INDEX IX_kvkk_RizaOlayi_CihazKimlik ON kvkk.RizaOlayi (CihazKimlik);
CREATE INDEX IX_kvkk_RizaOlayi_KaydedenKullaniciKimlik ON kvkk.RizaOlayi (KaydedenKullaniciKimlik);

EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'RizaOlayi',
    @Metin = N'Müşterinin KVKK metinleri için verdiği her karar (okudu, onayladı, reddetti, geri aldı) ayrı satır olarak. Yasal kanıttır: değiştirilemez, silinmez, anonimleştirmede de kalır. Hesabın güncel durumu kvkk.GuncelRiza görünümündedir.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'RizaOlayi', @Alt = N'RizaNotu',
    @Metin = N'Karara ilişkin not (ör. personelin müşteri adına kaydettiği yazılı onayın açıklaması).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'RizaOlayi', @Alt = N'UygulamaSurumu',
    @Metin = N'Kararın verildiği uygulamanın sürümü (ör. 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'RizaOlayi', @Alt = N'HesapKimlik',
    @Metin = N'Kararı veren müşteri hesabı (musteri.Hesap).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'RizaOlayi', @Alt = N'MetinKodu',
    @Metin = N'Kararın verildiği metnin türü (kvkk.MetinSurumu; ör. aydinlatma, acikRiza).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'RizaOlayi', @Alt = N'Surum',
    @Metin = N'Kararın verildiği metnin sürümü (kvkk.MetinSurumu).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'RizaOlayi', @Alt = N'DilKodu',
    @Metin = N'Müşterinin okuduğu metnin dili (kvkk.MetinSurumu).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'RizaOlayi', @Alt = N'SecimKodu',
    @Metin = N'Verilen karar (kod.RizaSecimi; ör. okundu, onay, ret, geriCekme).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'RizaOlayi', @Alt = N'KanalKodu',
    @Metin = N'Kararın alındığı yer (kod.RizaKanali; ör. connectKayit, connectProfil, yazili).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'RizaOlayi', @Alt = N'CihazKimlik',
    @Metin = N'Kararın verildiği cihaz (bildirim.Cihaz). Bilinmiyorsa ya da personel kaydettiyse boş.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'RizaOlayi', @Alt = N'KaydedenKullaniciKimlik',
    @Metin = N'Kararı müşteri adına kaydeden personelin girişi (erisim.Kullanici). Müşteri kendisi verdiyse boş.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'RizaOlayi', @Alt = N'OlusmaZamani',
    @Metin = N'Kararın sunucuya kaydedildiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'RizaOlayi', @Alt = N'IstemciOlusmaZamani',
    @Metin = N'Kararın telefonda verildiği an (UTC; bilgi amaçlı, esas olan sunucu saatidir).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'RizaOlayi', @Alt = N'KayitNo',
    @Metin = N'Satırı SSMS içinde seçmek için sıra numarası. İş anlamı yoktur; ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'RizaOlayi', @Alt = N'Kimlik',
    @Metin = N'Satırın teknik anahtarı (GUID); ekranda görünmez.';
GO

/* -------------------------------------------------- kvkk.BasvuruTalebi */

CREATE TABLE kvkk.BasvuruTalebi (
    BasvuranAdi               nvarchar(150)  COLLATE Turkish_100_CI_AS NULL,
    IletisimBilgisi           nvarchar(300)  COLLATE Turkish_100_CI_AS NULL,
    Aciklama                  nvarchar(2000) COLLATE Turkish_100_CI_AS NULL,
    SonucAciklamasi           nvarchar(2000) COLLATE Turkish_100_CI_AS NULL,
    HesapKimlik               uniqueidentifier NULL,
    TurKodu                   nvarchar(40)   COLLATE Latin1_General_100_BIN2 NOT NULL,
    KanalKodu                 nvarchar(40)   COLLATE Latin1_General_100_BIN2 NOT NULL,
    SorumluKullaniciKimlik    uniqueidentifier NULL,
    DurumKodu                 nvarchar(40)   COLLATE Latin1_General_100_BIN2 NOT NULL,
    YanitSonTarihi            date           NOT NULL,
    SonuclanmaZamani          datetime2(3)   NULL,
    OlusmaZamani              datetime2(3)   NOT NULL CONSTRAINT DF_kvkk_BasvuruTalebi_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                   bigint         IDENTITY(1,1) NOT NULL,
    Kimlik                    uniqueidentifier NOT NULL CONSTRAINT DF_kvkk_BasvuruTalebi_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_kvkk_BasvuruTalebi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_kvkk_BasvuruTalebi_musteri_Hesap FOREIGN KEY (HesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_kvkk_BasvuruTalebi_kod_KvkkBasvuruTuru FOREIGN KEY (TurKodu) REFERENCES kod.KvkkBasvuruTuru (Kod),
    CONSTRAINT FK_kvkk_BasvuruTalebi_kod_RizaKanali FOREIGN KEY (KanalKodu) REFERENCES kod.RizaKanali (Kod),
    CONSTRAINT FK_kvkk_BasvuruTalebi_erisim_Kullanici FOREIGN KEY (SorumluKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT CK_kvkk_BasvuruTalebi_DurumKodu CHECK (DurumKodu IN (N'alindi', N'isleniyor', N'sonuclandi', N'reddedildi'))
);

CREATE UNIQUE CLUSTERED INDEX CX_kvkk_BasvuruTalebi_KayitNo ON kvkk.BasvuruTalebi (KayitNo);
CREATE INDEX IX_kvkk_BasvuruTalebi_DurumKoduYanitSonTarihi ON kvkk.BasvuruTalebi (DurumKodu, YanitSonTarihi);
CREATE INDEX IX_kvkk_BasvuruTalebi_HesapKimlik ON kvkk.BasvuruTalebi (HesapKimlik);
CREATE INDEX IX_kvkk_BasvuruTalebi_TurKodu ON kvkk.BasvuruTalebi (TurKodu);
CREATE INDEX IX_kvkk_BasvuruTalebi_KanalKodu ON kvkk.BasvuruTalebi (KanalKodu);
CREATE INDEX IX_kvkk_BasvuruTalebi_SorumluKullaniciKimlik ON kvkk.BasvuruTalebi (SorumluKullaniciKimlik);

EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'BasvuruTalebi',
    @Metin = N'KVKK kapsamındaki başvurular (bilgi isteme, düzeltme, silme). Hesap silme ve kişisel veri silme yalnız PAKSAN yetkilisi tarafından, bu başvuruya dayanarak yapılır. Okunur numarası yoktur; KayitNo ile seçilir. Anonimleştirmede silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'BasvuruTalebi', @Alt = N'BasvuranAdi',
    @Metin = N'Başvuranın yazdığı ad soyad.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'BasvuruTalebi', @Alt = N'IletisimBilgisi',
    @Metin = N'Cevabın gönderileceği iletişim bilgisi (telefon, e-posta ya da adres; yazıldığı gibi).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'BasvuruTalebi', @Alt = N'Aciklama',
    @Metin = N'Başvurunun metni.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'BasvuruTalebi', @Alt = N'SonucAciklamasi',
    @Metin = N'Başvurunun nasıl sonuçlandığının açıklaması.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'BasvuruTalebi', @Alt = N'HesapKimlik',
    @Metin = N'Başvuranın hesabı (musteri.Hesap). Hesabı yoksa ya da bulunamadıysa boş.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'BasvuruTalebi', @Alt = N'TurKodu',
    @Metin = N'Başvurunun türü (kod.KvkkBasvuruTuru).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'BasvuruTalebi', @Alt = N'KanalKodu',
    @Metin = N'Başvurunun geldiği yer (kod.RizaKanali; ör. telefon, yazili, personel).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'BasvuruTalebi', @Alt = N'SorumluKullaniciKimlik',
    @Metin = N'Başvuruyla ilgilenen personelin girişi (erisim.Kullanici).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'BasvuruTalebi', @Alt = N'DurumKodu',
    @Metin = N'Başvurunun durumu: alindi, isleniyor, sonuclandi, reddedildi.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'BasvuruTalebi', @Alt = N'YanitSonTarihi',
    @Metin = N'Yasal cevap süresinin son günü (Türkiye günü).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'BasvuruTalebi', @Alt = N'SonuclanmaZamani',
    @Metin = N'Başvurunun sonuçlandığı ya da reddedildiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'BasvuruTalebi', @Alt = N'OlusmaZamani',
    @Metin = N'Başvurunun kaydedildiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'BasvuruTalebi', @Alt = N'KayitNo',
    @Metin = N'Başvuruyu seçmek için sıra numarası (yonetim prosedürlerinde BasvuruKayitNo). İş anlamı yoktur.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'BasvuruTalebi', @Alt = N'Kimlik',
    @Metin = N'Satırın teknik anahtarı (GUID); ekranda görünmez.';
GO
