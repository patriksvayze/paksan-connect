/* ==========================================================================
   V0007 — dosya

   Yüklenen her dosyanın üst verisi. Dosyanın kendisi diskte ya da nesne
   deposunda durur; veritabanında yalnız yeri, türü, boyutu ve durumu.

   Kural kaynağı: veritabani/tasarim.md (Bölüm 0.4 dosya, 1.4.1, 1.13,
   1.16, 1.17.7, 6.2). Yetkiler V0015'te (uygulama rolüne DELETE yok).

   Bağımlılık: V0001, V0002 (kod.DosyaTuru, kod.AktorTuru,
   kod.KaynakUygulama), V0005 (erisim.Kullanici), V0006 (musteri.Hesap).
   ========================================================================== */

CREATE TABLE dosya.Dosya (
    OrijinalAd              nvarchar(255) COLLATE Latin1_General_100_BIN2 NULL,
    MimeTuru                nvarchar(100) COLLATE Latin1_General_100_BIN2 NOT NULL,
    BoyutBayt               bigint        NOT NULL,
    IcerikOzeti             binary(32)    NOT NULL,
    DepolamaYolu            nvarchar(400) COLLATE Latin1_General_100_BIN2 NOT NULL,
    SureSaniye              decimal(7,2)  NULL,
    Genislik                int           NULL,
    Yukseklik               int           NULL,
    TurKodu                 nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    DepolamaSaglayiciKodu   nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    SaklamaSinifiKodu       nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    DurumKodu               nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    GecersizZamani          datetime2(3)  NULL,
    GecersizNedeni          nvarchar(500) COLLATE Turkish_100_CI_AS NULL,
    SilinmeIstendiZamani    datetime2(3)  NULL,
    DiskSilinmeZamani       datetime2(3)  NULL,
    YapanTuruKodu           nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik    uniqueidentifier NULL,
    YapanHesapKimlik        uniqueidentifier NULL,
    YapanAdi                nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu      nvarchar(40)  COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu          nvarchar(20)  COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani            datetime2(3)  NOT NULL CONSTRAINT DF_dosya_Dosya_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                 bigint        IDENTITY(1,1) NOT NULL,
    Kimlik                  uniqueidentifier NOT NULL CONSTRAINT DF_dosya_Dosya_Kimlik DEFAULT NEWID(),

    CONSTRAINT PK_dosya_Dosya PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_dosya_Dosya_kod_DosyaTuru FOREIGN KEY (TurKodu) REFERENCES kod.DosyaTuru (Kod),
    CONSTRAINT FK_dosya_Dosya_kod_AktorTuru_Yapan FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_dosya_Dosya_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_dosya_Dosya_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_dosya_Dosya_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_dosya_Dosya_DepolamaSaglayiciKodu CHECK (DepolamaSaglayiciKodu IN (N'disk', N'nesne')),
    CONSTRAINT CK_dosya_Dosya_SaklamaSinifiKodu CHECK (SaklamaSinifiKodu IN (N'dekont', N'genel')),
    CONSTRAINT CK_dosya_Dosya_DurumKodu CHECK (DurumKodu IN (N'yukleniyor', N'hazir', N'karantina')),
    CONSTRAINT CK_dosya_Dosya_DekontSilinmez CHECK (SaklamaSinifiKodu <> N'dekont' OR SilinmeIstendiZamani IS NULL),
    CONSTRAINT CK_dosya_Dosya_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);

CREATE UNIQUE CLUSTERED INDEX CX_dosya_Dosya_KayitNo ON dosya.Dosya (KayitNo);
CREATE INDEX IX_dosya_Dosya_IcerikOzeti ON dosya.Dosya (IcerikOzeti);
CREATE INDEX IX_dosya_Dosya_TurKodu ON dosya.Dosya (TurKodu);
CREATE INDEX IX_dosya_Dosya_YapanTuruKodu ON dosya.Dosya (YapanTuruKodu);
CREATE INDEX IX_dosya_Dosya_YapanKullaniciKimlik ON dosya.Dosya (YapanKullaniciKimlik);
CREATE INDEX IX_dosya_Dosya_YapanHesapKimlik ON dosya.Dosya (YapanHesapKimlik);
CREATE INDEX IX_dosya_Dosya_KaynakUygulamaKodu ON dosya.Dosya (KaynakUygulamaKodu);
CREATE INDEX IX_dosya_Dosya_SilinmeBekleyen ON dosya.Dosya (SilinmeIstendiZamani)
    WHERE SilinmeIstendiZamani IS NOT NULL AND DiskSilinmeZamani IS NULL;

EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya',
    @Metin = N'Yüklenen her dosyanın bilgisi: talep fotoğrafı ve videosu, ses kaydı, dekont, servis fişi, ziyaret fotoğrafı, duyuru görseli. Dosyanın kendisi diskte ya da nesne deposundadır; burada yeri, türü, boyutu ve durumu durur. Satır silinmez: dosya geçersiz kılınır ya da silinmesi istenir. Dosyanın hangi kayda ait olduğu bağ tablolarındadır (ör. talep.TalepEki, talep.Dekont).';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'OrijinalAd',
    @Metin = N'Dosyanın yüklendiği andaki adı. Anonimleştirmede boşaltılır.';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'MimeTuru',
    @Metin = N'Dosyanın biçimi (ör. image/jpeg, audio/webm, application/pdf).';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'BoyutBayt',
    @Metin = N'Dosyanın boyutu (bayt).';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'IcerikOzeti',
    @Metin = N'Dosya içeriğinin SHA-256 özeti; aynı dosyanın iki kez yüklendiğini bulmak için (tekil değildir).';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'DepolamaYolu',
    @Metin = N'Dosyanın depodaki göreli yolu. Kök klasör API ortam dosyasındadır.';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'SureSaniye',
    @Metin = N'Ses kaydı ve videoda süre (saniye). Öteki dosyalarda boş.';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'Genislik',
    @Metin = N'Görsel ve videoda genişlik (piksel). Öteki dosyalarda boş.';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'Yukseklik',
    @Metin = N'Görsel ve videoda yükseklik (piksel). Öteki dosyalarda boş.';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'TurKodu',
    @Metin = N'Dosyanın türü (kod.DosyaTuru; ör. foto, video, ses, pdf). Dekont olup olmadığı SaklamaSinifiKodu kolonundadır.';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'DepolamaSaglayiciKodu',
    @Metin = N'Dosyanın durduğu yer: disk (sunucunun diski) ya da nesne (nesne deposu).';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'SaklamaSinifiKodu',
    @Metin = N'Saklama sınıfı: dekont (ödeme belgesi; silinmesi istenemez) ya da genel.';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'DurumKodu',
    @Metin = N'Dosyanın durumu: yukleniyor (yükleme sürüyor), hazir, karantina (şüpheli; gösterilmez).';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'GecersizZamani',
    @Metin = N'Dosyanın geçersiz kılındığı an (UTC). Boşsa geçerli.';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'GecersizNedeni',
    @Metin = N'Dosyanın neden geçersiz kılındığı.';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'SilinmeIstendiZamani',
    @Metin = N'Dosyanın diskten silinmesinin istendiği an (UTC; saklama süresi doldu ya da kişisel veriler silindi). Dekont sınıfında hep boş kalır.';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'DiskSilinmeZamani',
    @Metin = N'API dosyayı diskten ya da depodan gerçekten sildiği an (UTC). Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'YapanTuruKodu',
    @Metin = N'Dosyayı kimin yüklediği: müşteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'YapanKullaniciKimlik',
    @Metin = N'Dosyayı yükleyen personel ya da servis girişi (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'YapanHesapKimlik',
    @Metin = N'Dosyayı yükleyen müşteri hesabı (musteri.Hesap). Yalnız müşteri yüklediyse dolu.';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'YapanAdi',
    @Metin = N'Dosyayı yükleyenin o anki adı. Müşteride boş.';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'KaynakUygulamaKodu',
    @Metin = N'Dosyanın yüklendiği uygulama (kod.KaynakUygulama; ör. connect, servisim, backoffice).';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'UygulamaSurumu',
    @Metin = N'Dosyayı gönderen uygulamanın sürümü (ör. 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'OlusmaZamani',
    @Metin = N'Dosya kaydının açıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'KayitNo',
    @Metin = N'Satırı SSMS içinde seçmek için sıra numarası (yardim sonuçlarında DosyaKayitNo). İş anlamı yoktur; ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'dosya', @Nesne = N'Dosya', @Alt = N'Kimlik',
    @Metin = N'Dosyanın teknik anahtarı (GUID); depodaki dosya adı da budur.';
GO
