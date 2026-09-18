/* ==========================================================================
   V0014 — sistem, destek, denetim ve erisim şemalarının kalan tabloları

   İçerik paketi, destek sohbeti, işlem kaydı, ayar, giden kuyruğu, tekrar
   koruması, saklama kuralı, oturum, doğrulama kodu. Sonda
   bildirim.Teslimat.GidenKimlik bağı kurulur (tasarim.md Bölüm 6.3:
   sistem.Giden bu betikte oluşuyor).

   Kural kaynağı: veritabani/tasarim.md Bölüm 0.4 (sistem, erisim, destek,
   denetim), 1.12, 1.13.4, 1.14.3, 1.15.5, 1.16, 1.17.7, 6.2, 6.3.
   Koruma tetikleyicisi (TR_denetim_IslemKaydi_Koruma) R04'te.
   ========================================================================== */

/* -------------------------------------------------- sistem.IcerikPaketi */

CREATE TABLE sistem.IcerikPaketi (
    Kod             nvarchar(60) COLLATE Latin1_General_100_BIN2 NOT NULL,
    Surum           nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    IcerikOzeti     binary(32) NOT NULL,
    YayinZamani     datetime2(3) NOT NULL,
    Aciklama        nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_sistem_IcerikPaketi PRIMARY KEY CLUSTERED (Kod, Surum)
);
GO

EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'IcerikPaketi', @Metin = N'Uygulamayla dağıtılan içerik paketlerinin (destek bilgi paketi, kullanım rehberi, güvenlik bilgileri, teknik özellikler) hangi sürümünün ne zaman yayına girdiği. İçeriğin kendisi depodaki sürümlü dosyalardadır; burada yalnız sürüm ve özet durur. Yalnız tohum yazar.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'IcerikPaketi', @Alt = N'Kod', @Metin = N'Paketin adı (ör. destekBilgiPaketi).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'IcerikPaketi', @Alt = N'Surum', @Metin = N'Paketin sürümü (ör. 2026.09.1).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'IcerikPaketi', @Alt = N'IcerikOzeti', @Metin = N'Paket dosyasının SHA-256 özeti; aynı sürüm numarasıyla farklı içerik yayınlanmadığını gösterir.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'IcerikPaketi', @Alt = N'YayinZamani', @Metin = N'Bu sürümün yayına girdiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'IcerikPaketi', @Alt = N'Aciklama', @Metin = N'Sürümde neyin değiştiği.';
GO

/* ------------------------------------------------ destek.SohbetOturumu */

CREATE TABLE destek.SohbetOturumu (
    SohbetAnahtari          nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu          nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    HesapKimlik             uniqueidentifier NULL
        CONSTRAINT FK_destek_SohbetOturumu_musteri_Hesap REFERENCES musteri.Hesap (Kimlik),
    MakineKimlik            uniqueidentifier NULL
        CONSTRAINT FK_destek_SohbetOturumu_makine_Makine REFERENCES makine.Makine (Kimlik),
    MarkaKodu               nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL
        CONSTRAINT FK_destek_SohbetOturumu_katalog_Marka REFERENCES katalog.Marka (Kod),
    UrunKodu                nvarchar(60) COLLATE Latin1_General_100_BIN2 NULL,
    DestekAilesiKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL
        CONSTRAINT FK_destek_SohbetOturumu_kod_DestekAilesi REFERENCES kod.DestekAilesi (Kod),
    DilKodu                 nvarchar(5) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_destek_SohbetOturumu_kod_Dil REFERENCES kod.Dil (Kod),
    IcerikPaketiKodu        nvarchar(60) COLLATE Latin1_General_100_BIN2 NULL,
    IcerikPaketiSurumu      nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    BaslangicZamani         datetime2(3) NOT NULL,
    SonHareketZamani        datetime2(3) NOT NULL,
    OlusmaZamani            datetime2(3) NOT NULL
        CONSTRAINT DF_destek_SohbetOturumu_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                 bigint IDENTITY(1,1) NOT NULL,
    Kimlik                  uniqueidentifier NOT NULL
        CONSTRAINT DF_destek_SohbetOturumu_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_destek_SohbetOturumu PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_destek_SohbetOturumu_katalog_Urun
        FOREIGN KEY (MarkaKodu, UrunKodu)
        REFERENCES katalog.Urun (MarkaKodu, Kod),
    CONSTRAINT FK_destek_SohbetOturumu_sistem_IcerikPaketi
        FOREIGN KEY (IcerikPaketiKodu, IcerikPaketiSurumu)
        REFERENCES sistem.IcerikPaketi (Kod, Surum),
    /* Bileşik bağın bir kolonu boşken bağ denetlenmez; ikisi birlikte dolu ya da boş. */
    CONSTRAINT CK_destek_SohbetOturumu_Urun CHECK (UrunKodu IS NULL OR MarkaKodu IS NOT NULL),
    CONSTRAINT CK_destek_SohbetOturumu_IcerikPaketi CHECK (
         (IcerikPaketiKodu IS NULL AND IcerikPaketiSurumu IS NULL)
      OR (IcerikPaketiKodu IS NOT NULL AND IcerikPaketiSurumu IS NOT NULL)
    ),
    CONSTRAINT CK_destek_SohbetOturumu_SonHareketZamani CHECK (SonHareketZamani >= BaslangicZamani)
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_destek_SohbetOturumu_KayitNo ON destek.SohbetOturumu (KayitNo);
CREATE NONCLUSTERED INDEX IX_destek_SohbetOturumu_BaslangicZamani ON destek.SohbetOturumu (BaslangicZamani);
/* Saklama süresi bu kolondan sayılır (sistem.SaklamaUygula). */
CREATE NONCLUSTERED INDEX IX_destek_SohbetOturumu_SonHareketZamani ON destek.SohbetOturumu (SonHareketZamani);
CREATE NONCLUSTERED INDEX IX_destek_SohbetOturumu_HesapKimlikBaslangicZamani
    ON destek.SohbetOturumu (HesapKimlik, BaslangicZamani);
CREATE NONCLUSTERED INDEX IX_destek_SohbetOturumu_MakineKimlik ON destek.SohbetOturumu (MakineKimlik);
CREATE NONCLUSTERED INDEX IX_destek_SohbetOturumu_MarkaKoduUrunKodu ON destek.SohbetOturumu (MarkaKodu, UrunKodu);
CREATE NONCLUSTERED INDEX IX_destek_SohbetOturumu_DestekAilesiKodu ON destek.SohbetOturumu (DestekAilesiKodu);
CREATE NONCLUSTERED INDEX IX_destek_SohbetOturumu_DilKodu ON destek.SohbetOturumu (DilKodu);
CREATE NONCLUSTERED INDEX IX_destek_SohbetOturumu_IcerikPaketiKoduIcerikPaketiSurumu
    ON destek.SohbetOturumu (IcerikPaketiKodu, IcerikPaketiSurumu);
GO

EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOturumu', @Metin = N'Müşteri uygulamasındaki destek sohbetinin oturumu: kim, hangi makine için, hangi dilde ve hangi bilgi paketiyle konuştu. Sohbetin metni saklanmaz; hareketler destek.SohbetOlayi tablosundadır. Aynı sohbette 30 dakika sessizlikten sonraki hareket yeni oturum açar. Backoffice''te destek kayıtları ekranında görünür. Saklama süresi dolunca sistem.SaklamaUygula siler.';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOturumu', @Alt = N'SohbetAnahtari', @Metin = N'Sohbetin uygulamadaki anahtarı: makinenin kimliği ya da genel sohbet için genel.';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOturumu', @Alt = N'UygulamaSurumu', @Metin = N'Sohbetin yapıldığı uygulama sürümü (ör. 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOturumu', @Alt = N'HesapKimlik', @Metin = N'Sohbet eden müşteri hesabı (musteri.Hesap). Oturum açılmamışsa boş.';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOturumu', @Alt = N'MakineKimlik', @Metin = N'Sohbetin konusu olan makine (makine.Makine). Genel sohbette boş.';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOturumu', @Alt = N'MarkaKodu', @Metin = N'Sohbet edilen ürünün markası (katalog.Marka).';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOturumu', @Alt = N'UrunKodu', @Metin = N'Sohbet edilen ürün (katalog.Urun). Doluysa MarkaKodu da doludur.';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOturumu', @Alt = N'DestekAilesiKodu', @Metin = N'Sohbetin destek konusu ailesi (kod.DestekAilesi: balya, rulo, yem, silaj, cayir, toprak, genel).';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOturumu', @Alt = N'DilKodu', @Metin = N'Sohbetin dili (kod.Dil).';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOturumu', @Alt = N'IcerikPaketiKodu', @Metin = N'Cevapların alındığı bilgi paketi (sistem.IcerikPaketi). Sürümüyle birlikte dolu ya da boştur.';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOturumu', @Alt = N'IcerikPaketiSurumu', @Metin = N'Cevapların alındığı bilgi paketinin sürümü (sistem.IcerikPaketi).';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOturumu', @Alt = N'BaslangicZamani', @Metin = N'Oturumun başladığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOturumu', @Alt = N'SonHareketZamani', @Metin = N'Oturumdaki son hareketin anı (UTC). Saklama süresi bu andan sayılır.';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOturumu', @Alt = N'OlusmaZamani', @Metin = N'Satırın sunucuya yazıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOturumu', @Alt = N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yoktur, ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOturumu', @Alt = N'Kimlik', @Metin = N'Oturumun teknik anahtarı; uygulama üretir. Ekranda görünmez.';
GO

/* --------------------------------------------------- destek.SohbetOlayi */

CREATE TABLE destek.SohbetOlayi (
    SiraNo                  int NOT NULL,
    Deger                   nvarchar(200) COLLATE Turkish_100_CI_AS NULL,
    BilgiKaydiNo            nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    SohbetOturumuKimlik     uniqueidentifier NOT NULL
        CONSTRAINT FK_destek_SohbetOlayi_destek_SohbetOturumu REFERENCES destek.SohbetOturumu (Kimlik),
    TurKodu                 nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_destek_SohbetOlayi_kod_DestekOlayTuru REFERENCES kod.DestekOlayTuru (Kod),
    TalepKimlik             uniqueidentifier NULL
        CONSTRAINT FK_destek_SohbetOlayi_talep_Talep REFERENCES talep.Talep (Kimlik),
    OlayZamani              datetime2(3) NOT NULL
        CONSTRAINT DF_destek_SohbetOlayi_OlayZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                 bigint IDENTITY(1,1) NOT NULL,
    Kimlik                  uniqueidentifier NOT NULL
        CONSTRAINT DF_destek_SohbetOlayi_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_destek_SohbetOlayi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_destek_SohbetOlayi_SohbetOturumuKimlikSiraNo UNIQUE (SohbetOturumuKimlik, SiraNo)
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_destek_SohbetOlayi_KayitNo ON destek.SohbetOlayi (KayitNo);
CREATE NONCLUSTERED INDEX IX_destek_SohbetOlayi_TurKoduOlayZamani ON destek.SohbetOlayi (TurKodu, OlayZamani);
CREATE NONCLUSTERED INDEX IX_destek_SohbetOlayi_TalepKimlik ON destek.SohbetOlayi (TalepKimlik);
GO

EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOlayi', @Metin = N'Destek sohbetindeki her hareket: seçilen konu, sorulan soru, yazılan cümle, cevap bulundu ya da bulunamadı, talebe yönlendirme. Cevapsız kalan sorular bilgi paketinin eksik listesidir; sık seçilen arızalar imalata giden geri bildirimdir. Satır yalnız eklenir; saklama süresi dolunca oturumuyla birlikte silinir.';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOlayi', @Alt = N'SiraNo', @Metin = N'Hareketin oturum içindeki sırası.';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOlayi', @Alt = N'Deger', @Metin = N'Seçilen konu, sorulan soru ya da yazılan cümle (en çok 200 karakter). Hesap anonimleştirilince boşaltılır.';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOlayi', @Alt = N'BilgiKaydiNo', @Metin = N'Cevabın alındığı bilgi paketi kaydının numarası. Cevap olmayan harekette boş.';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOlayi', @Alt = N'SohbetOturumuKimlik', @Metin = N'Hareketin ait olduğu sohbet oturumu (destek.SohbetOturumu).';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOlayi', @Alt = N'TurKodu', @Metin = N'Hareketin türü (kod.DestekOlayTuru: konu, soru, serbest, cevap, cevapsiz, cozulmedi, yonlendirme, temizlendi).';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOlayi', @Alt = N'TalepKimlik', @Metin = N'Sohbetten yönlendirilerek açılan talep (talep.Talep). Yönlendirme olmayan harekette boş.';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOlayi', @Alt = N'OlayZamani', @Metin = N'Hareketin olduğu an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOlayi', @Alt = N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yoktur, ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'destek', @Nesne = N'SohbetOlayi', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda görünmez.';
GO

/* --------------------------------------------------- denetim.IslemKaydi */

CREATE TABLE denetim.IslemKaydi (
    IlgiliNumara            nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    AyrintiJson             nvarchar(max) COLLATE Latin1_General_100_BIN2 NULL,
    IpAdresi                nvarchar(45) COLLATE Latin1_General_100_BIN2 NULL,
    IslemTuruKodu           nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_denetim_IslemKaydi_kod_IslemTuru REFERENCES kod.IslemTuru (Kod),
    IlgiliKayitTuruKodu     nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL
        CONSTRAINT FK_denetim_IslemKaydi_kod_KayitTuru_Ilgili REFERENCES kod.KayitTuru (Kod),
    IlgiliKimlik            uniqueidentifier NULL,
    IstekKimlik             uniqueidentifier NULL,
    OturumKimlik            uniqueidentifier NULL,
    IslemZamani             datetime2(3) NOT NULL
        CONSTRAINT DF_denetim_IslemKaydi_IslemZamani DEFAULT SYSUTCDATETIME(),
    /* Yapan grubu bu tabloda bağ kısıtsızdır (Bölüm 1.16); CHECK aynıdır. */
    YapanTuruKodu           nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik    uniqueidentifier NULL,
    YapanHesapKimlik        uniqueidentifier NULL,
    YapanAdi                nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    YapanRolAdi             nvarchar(100) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu          nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    KayitNo                 bigint IDENTITY(1,1) NOT NULL,
    Kimlik                  uniqueidentifier NOT NULL
        CONSTRAINT DF_denetim_IslemKaydi_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_denetim_IslemKaydi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT CK_denetim_IslemKaydi_AyrintiJson CHECK (AyrintiJson IS NULL OR ISJSON(AyrintiJson) = 1),
    /* Müşteri IP'si yalnız erisim.Oturum'da tutulur. */
    CONSTRAINT CK_denetim_IslemKaydi_MusteriIpAdresi CHECK (YapanTuruKodu <> N'musteri' OR IpAdresi IS NULL),
    CONSTRAINT CK_denetim_IslemKaydi_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_denetim_IslemKaydi_KayitNo ON denetim.IslemKaydi (KayitNo);
CREATE NONCLUSTERED INDEX IX_denetim_IslemKaydi_IslemZamani ON denetim.IslemKaydi (IslemZamani);
CREATE NONCLUSTERED INDEX IX_denetim_IslemKaydi_IslemTuruKoduIslemZamani
    ON denetim.IslemKaydi (IslemTuruKodu, IslemZamani);
CREATE NONCLUSTERED INDEX IX_denetim_IslemKaydi_IlgiliKayitTuruKoduIslemZamani
    ON denetim.IslemKaydi (IlgiliKayitTuruKodu, IslemZamani);
CREATE NONCLUSTERED INDEX IX_denetim_IslemKaydi_YapanKullaniciKimlikIslemZamani
    ON denetim.IslemKaydi (YapanKullaniciKimlik, IslemZamani)
    WHERE YapanKullaniciKimlik IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_denetim_IslemKaydi_YapanHesapKimlikIslemZamani
    ON denetim.IslemKaydi (YapanHesapKimlik, IslemZamani)
    WHERE YapanHesapKimlik IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_denetim_IslemKaydi_IlgiliKimlikIslemZamani
    ON denetim.IslemKaydi (IlgiliKimlik, IslemZamani)
    WHERE IlgiliKimlik IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_denetim_IslemKaydi_IlgiliNumara
    ON denetim.IslemKaydi (IlgiliNumara)
    WHERE IlgiliNumara IS NOT NULL;
GO

EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Metin = N'Silinemez işlem kaydı: kim, ne zaman, hangi uygulamadan, hangi kayıtta ne yaptı. Satır yalnız eklenir; değiştirme ve silme tetikleyiciyle her girişe karşı reddedilir. Müşterinin adı, telefonu, adresi, TC, vergi no ve IBAN yazılmaz. Okunaklı hâli gorunum.IslemGecmisi görünümündedir; backoffice''te İşlem Kaydı ekranında görünür. Kayıtları başka tablolara bağ kısıtıyla bağlı değildir.';
EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'IlgiliNumara', @Metin = N'İlgili kaydın okunur numarası (ör. SRV2600123). Numarası olmayan kayıtta boş.';
EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'AyrintiJson', @Metin = N'İşlem türüne göre ayrıntı (JSON): önceki ve sonraki değerler, sayılar. yonetim prosedürlerinin kayıtlarında gerekce, sqlGirisi ve bilgisayar alanları doludur. Müşteri kişisel verisi yazılmaz; müşteri yerine HesapKayitNo yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'IpAdresi', @Metin = N'İşlemin geldiği IP adresi. Müşteri işlemlerinde boş (müşteri IP adresi yalnız erisim.Oturum tablosunda tutulur).';
EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'IslemTuruKodu', @Metin = N'İşlemin türü (kod.IslemTuru, ör. talepOlusturuldu, hakEdisOnaylandi, tcVergiNoGoruntulendi, saklamaUygulandi).';
EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'IlgiliKayitTuruKodu', @Metin = N'İşlemin ilgili olduğu kaydın türü (kod.KayitTuru, ör. talep, hesap, hakEdis).';
EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'IlgiliKimlik', @Metin = N'İşlemin ilgili olduğu kaydın teknik anahtarı; tablosu IlgiliKayitTuruKodu kolonundan anlaşılır. Bağ kısıtı yoktur.';
EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'IstekKimlik', @Metin = N'İşlemi doğuran API isteğinin kimliği; aynı istekte yazılan kayıtları birlikte bulmak için.';
EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'OturumKimlik', @Metin = N'İşlemin yapıldığı giriş oturumunun teknik anahtarı (erisim.Oturum). Bağ kısıtı yoktur; oturum saklama süresi dolunca silinse de kayıt kalır.';
EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'IslemZamani', @Metin = N'İşlemin yapıldığı an (UTC). Türkiye saati için gorunum.IslemGecmisi.IslemZamaniTurkiye kullanılır.';
EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'YapanTuruKodu', @Metin = N'İşlemi yapanın türü (kod.AktorTuru: musteri, personel, servis, sistem, entegrasyon). Bu tabloda bağ kısıtı yoktur.';
EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'YapanKullaniciKimlik', @Metin = N'İşlemi yapan personel ya da servis kullanıcısının teknik anahtarı (erisim.Kullanici). Müşteri, sistem ve entegrasyon için boş. Bağ kısıtı yoktur.';
EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'YapanHesapKimlik', @Metin = N'İşlemi yapan müşteri hesabının teknik anahtarı (musteri.Hesap). Yalnız müşteri için dolu. Bağ kısıtı yoktur.';
EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'YapanAdi', @Metin = N'İşlemi yapanın o anki adı (personel ya da servis). Müşteri için boş.';
EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'YapanRolAdi', @Metin = N'İşlemi yapan personelin o anki rolünün adı.';
EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'KaynakUygulamaKodu', @Metin = N'İşlemin geldiği uygulama (kod.KaynakUygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim). Bu tabloda bağ kısıtı yoktur.';
EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'UygulamaSurumu', @Metin = N'İşlemin geldiği uygulamanın sürümü (ör. 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yoktur, ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda görünmez.';
GO

/* ------------------------------------------------------------ sistem.Ayar */

CREATE TABLE sistem.Ayar (
    Anahtar                 nvarchar(80) COLLATE Latin1_General_100_BIN2 NOT NULL,
    SirketKodu              nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL
        CONSTRAINT FK_sistem_Ayar_sirket_Sirket REFERENCES sirket.Sirket (Kod),
    MarkaKodu               nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL
        CONSTRAINT FK_sistem_Ayar_katalog_Marka REFERENCES katalog.Marka (Kod),
    DegerTuru               nvarchar(10) COLLATE Latin1_General_100_BIN2 NOT NULL,
    Deger                   nvarchar(4000) COLLATE Latin1_General_100_BIN2 NULL,
    Aciklama                nvarchar(400) COLLATE Turkish_100_CI_AS NOT NULL,
    KayitNo                 bigint IDENTITY(1,1) NOT NULL,
    Kimlik                  uniqueidentifier NOT NULL
        CONSTRAINT DF_sistem_Ayar_Kimlik DEFAULT NEWID(),
    GecerlilikBaslangici    datetime2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    GecerlilikBitisi        datetime2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (GecerlilikBaslangici, GecerlilikBitisi),
    CONSTRAINT PK_sistem_Ayar PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT CK_sistem_Ayar_Anahtar CHECK (Anahtar NOT LIKE N'%[^A-Za-z0-9]%'),
    CONSTRAINT CK_sistem_Ayar_DegerTuru
        CHECK (DegerTuru IN (N'tamsayi', N'ondalik', N'metin', N'mantiksal', N'json')),
    /* Satır genel, şirket ya da marka kapsamındadır; ikisi birden olmaz. */
    CONSTRAINT CK_sistem_Ayar_Kapsam CHECK (SirketKodu IS NULL OR MarkaKodu IS NULL),
    CONSTRAINT CK_sistem_Ayar_Deger CHECK (
         Deger IS NULL
      OR (DegerTuru = N'tamsayi'   AND TRY_CONVERT(int, Deger) IS NOT NULL)
      OR (DegerTuru = N'ondalik'   AND TRY_CONVERT(decimal(18,4), Deger) IS NOT NULL)
      OR (DegerTuru = N'mantiksal' AND Deger IN (N'0', N'1'))
      OR (DegerTuru = N'json'      AND ISJSON(Deger) = 1)
      OR  DegerTuru = N'metin'
    )
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = gecmis.sistem_Ayar, DATA_CONSISTENCY_CHECK = ON));
GO

CREATE UNIQUE CLUSTERED INDEX CX_sistem_Ayar_KayitNo ON sistem.Ayar (KayitNo);

/* Anahtar başına bir genel, şirket başına bir, marka başına bir satır (Bölüm 1.15.5). */
CREATE UNIQUE NONCLUSTERED INDEX UX_sistem_Ayar_Genel
    ON sistem.Ayar (Anahtar)
    WHERE SirketKodu IS NULL AND MarkaKodu IS NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_sistem_Ayar_Sirket
    ON sistem.Ayar (Anahtar, SirketKodu)
    WHERE SirketKodu IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_sistem_Ayar_Marka
    ON sistem.Ayar (Anahtar, MarkaKodu)
    WHERE MarkaKodu IS NOT NULL;

CREATE NONCLUSTERED INDEX IX_sistem_Ayar_SirketKodu ON sistem.Ayar (SirketKodu);
CREATE NONCLUSTERED INDEX IX_sistem_Ayar_MarkaKodu ON sistem.Ayar (MarkaKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ayar', @Metin = N'Uygulamanın ayarları (ör. talep gecikme süresi 48 saat, teklif bekleme süresi 14 gün, KDV oranı). Her ayarın genel satırı vardır; bir şirket ya da marka için farklı değer gerekiyorsa aynı anahtarla şirket ya da marka satırı eklenir. Geçerli değer yalnız gorunum.GecerliAyar görünümünden okunur: önce marka, sonra markanın şirketi, sonra genel satır. Değişiklik yonetim.AyarDegistir ile yapılır; eski değerler gecmis.sistem_Ayar tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ayar', @Alt = N'Anahtar', @Metin = N'Ayarın adı; Türkçe sözcüklerle birimini söyler (ör. TalepGecikmeSaati, TeklifBeklemeGunu). Yalnız harf ve rakam.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ayar', @Alt = N'SirketKodu', @Metin = N'Satır yalnız bu şirket için geçerliyse şirket (sirket.Sirket). Genel ve marka satırında boş.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ayar', @Alt = N'MarkaKodu', @Metin = N'Satır yalnız bu marka için geçerliyse marka (katalog.Marka). Genel ve şirket satırında boş.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ayar', @Alt = N'DegerTuru', @Metin = N'Değerin türü: tamsayi, ondalik, metin, mantiksal (0 ya da 1) ya da json. Değer bu türe uymak zorundadır.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ayar', @Alt = N'Deger', @Metin = N'Ayarın değeri, metin olarak (ondalık ayırıcı nokta: 0.2). Boşsa karar bekleniyor demektir; bu ayarı okuyan işlem hata verir.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ayar', @Alt = N'Aciklama', @Metin = N'Ayarın ne işe yaradığı, birimi, ekranda geçen sözcük (ör. 48 saat) ve uygulamadaki eski sabitin adı.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ayar', @Alt = N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yoktur, ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ayar', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ayar', @Alt = N'GecerlilikBaslangici', @Metin = N'Satırın bu hâlinin veritabanına yazıldığı an (UTC). Sistem sürümlü geçmiş için motor yazar; SELECT * ile görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ayar', @Alt = N'GecerlilikBitisi', @Metin = N'Satırın bu hâlinin değiştiği ya da silindiği an (UTC); güncel satırda 9999-12-31. Sistem sürümlü geçmiş için motor yazar; SELECT * ile görünmez.';
GO

/* Geçmiş tablosu aynı açıklamaları taşır (SSMS'te ve sözlükte okunur). */
DECLARE @KolonNo int = 0, @KolonAdi sysname, @KolonMetni nvarchar(3750);
EXEC dbo.AciklamaYaz @Sema = N'gecmis', @Nesne = N'sistem_Ayar', @Metin = N'sistem.Ayar tablosunun eski hâlleri (sistem sürümlü geçmiş). Motor yazar; elle değiştirilmez. Sorgu: SELECT … FROM sistem.Ayar FOR SYSTEM_TIME ALL.';
WHILE 1 = 1
BEGIN
    SELECT TOP (1) @KolonNo = c.column_id, @KolonAdi = c.name, @KolonMetni = CONVERT(nvarchar(3750), e.value)
    FROM sys.columns AS c
    JOIN sys.extended_properties AS e
      ON e.class = 1 AND e.major_id = c.object_id AND e.minor_id = c.column_id AND e.name = N'MS_Description'
    WHERE c.object_id = OBJECT_ID(N'sistem.Ayar') AND c.column_id > @KolonNo
    ORDER BY c.column_id;
    IF @@ROWCOUNT = 0 BREAK;
    EXEC dbo.AciklamaYaz @Sema = N'gecmis', @Nesne = N'sistem_Ayar', @Alt = @KolonAdi, @Metin = @KolonMetni;
END;
GO

/* ----------------------------------------------------------- sistem.Giden */

CREATE TABLE sistem.Giden (
    AliciAdres              nvarchar(400) COLLATE Latin1_General_100_BIN2 NULL,
    SablonKodu              nvarchar(80) COLLATE Latin1_General_100_BIN2 NOT NULL,
    DegiskenlerJson         nvarchar(max) COLLATE Latin1_General_100_BIN2 NULL,
    Konu                    nvarchar(300) COLLATE Latin1_General_100_BIN2 NULL,
    Govde                   nvarchar(max) COLLATE Latin1_General_100_BIN2 NULL,
    IlgiliKimlik            uniqueidentifier NULL,
    DenemeSayisi            tinyint NOT NULL
        CONSTRAINT DF_sistem_Giden_DenemeSayisi DEFAULT 0,
    SonHata                 nvarchar(1000) COLLATE Latin1_General_100_BIN2 NULL,
    SaglayiciMesajNo        nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    KanalKodu               nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_sistem_Giden_kod_BildirimKanali REFERENCES kod.BildirimKanali (Kod),
    AliciHesapKimlik        uniqueidentifier NULL
        CONSTRAINT FK_sistem_Giden_musteri_Hesap_Alici REFERENCES musteri.Hesap (Kimlik),
    AliciKullaniciKimlik    uniqueidentifier NULL
        CONSTRAINT FK_sistem_Giden_erisim_Kullanici_Alici REFERENCES erisim.Kullanici (Kimlik),
    CihazKimlik             uniqueidentifier NULL
        CONSTRAINT FK_sistem_Giden_bildirim_Cihaz REFERENCES bildirim.Cihaz (Kimlik),
    DilKodu                 nvarchar(5) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_sistem_Giden_kod_Dil REFERENCES kod.Dil (Kod),
    IlgiliKayitTuruKodu     nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL
        CONSTRAINT FK_sistem_Giden_kod_KayitTuru_Ilgili REFERENCES kod.KayitTuru (Kod),
    SaglayiciKodu           nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL
        CONSTRAINT FK_sistem_Giden_kod_DisSistem_Saglayici REFERENCES kod.DisSistem (Kod),
    DurumKodu               nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    SonrakiDenemeZamani     datetime2(3) NULL,
    GonderilmeZamani        datetime2(3) NULL,
    OlusmaZamani            datetime2(3) NOT NULL
        CONSTRAINT DF_sistem_Giden_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                 bigint IDENTITY(1,1) NOT NULL,
    Kimlik                  uniqueidentifier NOT NULL
        CONSTRAINT DF_sistem_Giden_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_sistem_Giden PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT CK_sistem_Giden_DurumKodu
        CHECK (DurumKodu IN (N'bekliyor', N'gonderiliyor', N'gonderildi', N'hata', N'vazgecildi')),
    CONSTRAINT CK_sistem_Giden_Saglayici CHECK (DurumKodu <> N'gonderildi' OR SaglayiciKodu IS NOT NULL),
    /* Kod ya da bağlantı taşıyan mesajın metni yazılmaz (Bölüm 1.14.3). */
    CONSTRAINT CK_sistem_Giden_GizliIcerik CHECK (
         IlgiliKayitTuruKodu IS NULL
      OR IlgiliKayitTuruKodu NOT IN (N'dogrulamaKodu', N'sifreSifirlamaJetonu')
      OR (Govde IS NULL AND Konu IS NULL AND DegiskenlerJson IS NULL)
    ),
    CONSTRAINT CK_sistem_Giden_DegiskenlerJson CHECK (DegiskenlerJson IS NULL OR ISJSON(DegiskenlerJson) = 1),
    CONSTRAINT CK_sistem_Giden_Alici CHECK (AliciHesapKimlik IS NULL OR AliciKullaniciKimlik IS NULL)
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_sistem_Giden_KayitNo ON sistem.Giden (KayitNo);
/* Gönderilecekler kuyruğu. */
CREATE NONCLUSTERED INDEX IX_sistem_Giden_DurumKoduSonrakiDenemeZamani
    ON sistem.Giden (DurumKodu, SonrakiDenemeZamani)
    WHERE DurumKodu IN (N'bekliyor', N'hata');
/* Saklama süresi (sistem.SaklamaUygula). */
CREATE NONCLUSTERED INDEX IX_sistem_Giden_OlusmaZamani ON sistem.Giden (OlusmaZamani) INCLUDE (DurumKodu, GonderilmeZamani);
CREATE NONCLUSTERED INDEX IX_sistem_Giden_IlgiliKimlik ON sistem.Giden (IlgiliKimlik) WHERE IlgiliKimlik IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_sistem_Giden_KanalKodu ON sistem.Giden (KanalKodu);
CREATE NONCLUSTERED INDEX IX_sistem_Giden_AliciHesapKimlik ON sistem.Giden (AliciHesapKimlik);
CREATE NONCLUSTERED INDEX IX_sistem_Giden_AliciKullaniciKimlik ON sistem.Giden (AliciKullaniciKimlik);
CREATE NONCLUSTERED INDEX IX_sistem_Giden_CihazKimlik ON sistem.Giden (CihazKimlik);
CREATE NONCLUSTERED INDEX IX_sistem_Giden_DilKodu ON sistem.Giden (DilKodu);
CREATE NONCLUSTERED INDEX IX_sistem_Giden_IlgiliKayitTuruKodu ON sistem.Giden (IlgiliKayitTuruKodu);
CREATE NONCLUSTERED INDEX IX_sistem_Giden_SaglayiciKodu ON sistem.Giden (SaglayiciKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Metin = N'Gönderilecek ve gönderilmiş SMS, e-posta ve anlık bildirim mesajları (giden kuyruğu). API mesajı buraya yazar, sağlayıcıya gönderir ve sonucunu işler. Doğrulama kodu ya da şifre bağlantısı taşıyan mesajın metni buraya yazılmaz; yalnız kanal, alıcı, şablon ve gönderim durumu durur. Saklama süresi dolunca sistem.SaklamaUygula siler ya da metnini boşaltır.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'AliciAdres', @Metin = N'Alıcının adresi: SMS için telefon (+905321234567), e-posta için e-posta adresi. Anlık bildirimde boş olabilir (CihazKimlik kullanılır). Anonimleştirmede boşaltılır.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'SablonKodu', @Metin = N'Mesaj şablonunun uygulamadaki anahtarı; metnin kendisi uygulamanın sözlüğündedir.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'DegiskenlerJson', @Metin = N'Şablona yerleştirilen değerler (JSON). Kod ya da bağlantı taşıyan mesajda boş.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'Konu', @Metin = N'E-posta konusu. Kod ya da bağlantı taşıyan mesajda boş.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'Govde', @Metin = N'Gönderilen metin. Kod ya da bağlantı taşıyan mesajda boş.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'IlgiliKimlik', @Metin = N'Mesajın ilgili olduğu kaydın teknik anahtarı (ör. talep ya da doğrulama kodu); türü IlgiliKayitTuruKodu kolonundadır. Bağ kısıtı yoktur.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'DenemeSayisi', @Metin = N'Gönderimin kaç kez denendiği.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'SonHata', @Metin = N'Son başarısız denemede sağlayıcının döndürdüğü hata metni.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'SaglayiciMesajNo', @Metin = N'Sağlayıcının mesaja verdiği numara; teslim durumunu sağlayıcıda sorgulamak için.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'KanalKodu', @Metin = N'Gönderim kanalı (kod.BildirimKanali: sms, eposta, push, webPush).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'AliciHesapKimlik', @Metin = N'Alıcı müşteri hesabı (musteri.Hesap), biliniyorsa. Kullanıcı alıcıda boş.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'AliciKullaniciKimlik', @Metin = N'Alıcı personel ya da servis kullanıcısı (erisim.Kullanici), biliniyorsa. Müşteri alıcıda boş.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'CihazKimlik', @Metin = N'Anlık bildirimin gönderildiği cihaz (bildirim.Cihaz).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'DilKodu', @Metin = N'Mesajın dili (kod.Dil).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'IlgiliKayitTuruKodu', @Metin = N'Mesajın ilgili olduğu kaydın türü (kod.KayitTuru). Doğrulama kodu ve şifre sıfırlama mesajında zorunludur; bu türlerde metin kolonları boş kalır.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'SaglayiciKodu', @Metin = N'Mesajı gönderen sağlayıcı (kod.DisSistem). Gönderildi durumunda zorunlu.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'DurumKodu', @Metin = N'Gönderim durumu: bekliyor, gonderiliyor, gonderildi, hata ya da vazgecildi.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'SonrakiDenemeZamani', @Metin = N'Hatalı gönderimin yeniden deneneceği an (UTC). Kod taşıyan mesaj yeniden denenmez.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'GonderilmeZamani', @Metin = N'Mesajın sağlayıcıya teslim edildiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'OlusmaZamani', @Metin = N'Mesajın kuyruğa yazıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yoktur, ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Giden', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda görünmez.';
GO

/* -------------------------------------------------------- sistem.GidenEki */

CREATE TABLE sistem.GidenEki (
    GidenKimlik     uniqueidentifier NOT NULL
        CONSTRAINT FK_sistem_GidenEki_sistem_Giden REFERENCES sistem.Giden (Kimlik),
    DosyaKimlik     uniqueidentifier NOT NULL
        CONSTRAINT FK_sistem_GidenEki_dosya_Dosya REFERENCES dosya.Dosya (Kimlik),
    CONSTRAINT PK_sistem_GidenEki PRIMARY KEY CLUSTERED (GidenKimlik, DosyaKimlik)
);
GO

CREATE NONCLUSTERED INDEX IX_sistem_GidenEki_DosyaKimlik ON sistem.GidenEki (DosyaKimlik);
GO

EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'GidenEki', @Metin = N'Giden e-postanın ekleri (ör. ihracat formu). Dosyanın kendisi dosya.Dosya tablosundadır. Mesaj saklama süresi dolup silinirken önce ekleri silinir.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'GidenEki', @Alt = N'GidenKimlik', @Metin = N'Ekin ait olduğu mesaj (sistem.Giden).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'GidenEki', @Alt = N'DosyaKimlik', @Metin = N'Eklenen dosya (dosya.Dosya).';
GO

/* ------------------------------------------------ sistem.TekrarAnahtari */

CREATE TABLE sistem.TekrarAnahtari (
    Anahtar                 uniqueidentifier NOT NULL,
    IslemKodu               nvarchar(60) COLLATE Latin1_General_100_BIN2 NOT NULL,
    IstekOzeti              binary(32) NOT NULL,
    SonucJson               nvarchar(max) COLLATE Latin1_General_100_BIN2 NULL,
    YapanTuruKodu           nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_sistem_TekrarAnahtari_kod_AktorTuru_Yapan REFERENCES kod.AktorTuru (Kod),
    YapanKimlik             uniqueidentifier NULL,
    DurumKodu               nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    SonGecerlilikZamani     datetime2(3) NOT NULL,
    OlusmaZamani            datetime2(3) NOT NULL
        CONSTRAINT DF_sistem_TekrarAnahtari_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_sistem_TekrarAnahtari PRIMARY KEY CLUSTERED (Anahtar),
    CONSTRAINT CK_sistem_TekrarAnahtari_DurumKodu CHECK (DurumKodu IN (N'isleniyor', N'tamamlandi', N'hata')),
    CONSTRAINT CK_sistem_TekrarAnahtari_SonucJson CHECK (SonucJson IS NULL OR ISJSON(SonucJson) = 1)
);
GO

CREATE NONCLUSTERED INDEX IX_sistem_TekrarAnahtari_SonGecerlilikZamani ON sistem.TekrarAnahtari (SonGecerlilikZamani);
CREATE NONCLUSTERED INDEX IX_sistem_TekrarAnahtari_YapanTuruKodu ON sistem.TekrarAnahtari (YapanTuruKodu);
GO

EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'TekrarAnahtari', @Metin = N'Aynı isteğin (ör. hak ediş onayı, durum değişikliği) iki kez işlenmesini önleyen kayıt. Uygulama her istekle bir anahtar gönderir; aynı anahtar ikinci kez gelirse işlem tekrarlanmaz, ilk sonuç döner. Süresi dolan satırlar sistem.SaklamaUygula ile silinir.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'TekrarAnahtari', @Alt = N'Anahtar', @Metin = N'Uygulamanın isteğe verdiği tekil anahtar.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'TekrarAnahtari', @Alt = N'IslemKodu', @Metin = N'İsteğin yaptığı işlemin adı.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'TekrarAnahtari', @Alt = N'IstekOzeti', @Metin = N'İstek içeriğinin özeti; aynı anahtarla farklı içerik gelirse istek reddedilir.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'TekrarAnahtari', @Alt = N'SonucJson', @Metin = N'İlk işlemin sonucu (JSON); tekrar gelen isteğe aynen döner. TC, vergi no, IBAN, doğrulama kodu ya da jeton içermez.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'TekrarAnahtari', @Alt = N'YapanTuruKodu', @Metin = N'İsteği yapanın türü (kod.AktorTuru).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'TekrarAnahtari', @Alt = N'YapanKimlik', @Metin = N'İsteği yapan kullanıcının (erisim.Kullanici) ya da müşteri hesabının (musteri.Hesap) teknik anahtarı; hangisi olduğu YapanTuruKodu kolonundan anlaşılır. Bağ kısıtı yoktur.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'TekrarAnahtari', @Alt = N'DurumKodu', @Metin = N'İşlemin durumu: isleniyor, tamamlandi ya da hata.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'TekrarAnahtari', @Alt = N'SonGecerlilikZamani', @Metin = N'Anahtarın geçerli olduğu son an (UTC); sonra saklama kuralıyla silinir.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'TekrarAnahtari', @Alt = N'OlusmaZamani', @Metin = N'İsteğin ilk geldiği an (UTC).';
GO

/* ------------------------------------------------- sistem.SaklamaKurali */

CREATE TABLE sistem.SaklamaKurali (
    KayitTuruKodu   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_sistem_SaklamaKurali_kod_KayitTuru REFERENCES kod.KayitTuru (Kod),
    SureGun         int NULL,
    EylemKodu       nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    HukukOnayli     bit NOT NULL
        CONSTRAINT DF_sistem_SaklamaKurali_HukukOnayli DEFAULT 0,
    Aciklama        nvarchar(400) COLLATE Turkish_100_CI_AS NOT NULL,
    CONSTRAINT PK_sistem_SaklamaKurali PRIMARY KEY CLUSTERED (KayitTuruKodu),
    CONSTRAINT CK_sistem_SaklamaKurali_SureGun CHECK (SureGun IS NULL OR SureGun >= 0),
    CONSTRAINT CK_sistem_SaklamaKurali_EylemKodu CHECK (EylemKodu IN (N'sil', N'bosalt', N'sakla'))
);
GO

EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'SaklamaKurali', @Metin = N'Hangi kaydın ne kadar saklanacağı (KVKK saklama süreleri). sistem.SaklamaUygula her gün bu kurallara göre süresi dolan satırları siler ya da kişisel içeriklerini boşaltır ve sonucu işlem kaydına yazar. Süre boşsa ya da eylem sakla ise kural uygulanmaz. Yalnız tohum yazar.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'SaklamaKurali', @Alt = N'KayitTuruKodu', @Metin = N'Kuralın uygulandığı kayıt türü (kod.KayitTuru, ör. girisDenemesi, dogrulamaKodu, giden).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'SaklamaKurali', @Alt = N'SureGun', @Metin = N'Saklama süresi (gün). Boşsa süresiz saklanır.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'SaklamaKurali', @Alt = N'EylemKodu', @Metin = N'Süre dolunca yapılan: sil (satır silinir), bosalt (kişisel içerik kolonları boşaltılır, satır kalır), sakla (dokunulmaz).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'SaklamaKurali', @Alt = N'HukukOnayli', @Metin = N'1 ise süre hukukçu tarafından onaylanmıştır. Bilgi amaçlıdır; kuralın uygulanmasını değiştirmez.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'SaklamaKurali', @Alt = N'Aciklama', @Metin = N'Kuralın kapsamı ve gerekçesi.';
GO

/* ---------------------------------------------------------- erisim.Oturum */

CREATE TABLE erisim.Oturum (
    YenilemeJetonuOzeti     binary(32) NOT NULL,
    IpAdresi                nvarchar(45) COLLATE Latin1_General_100_BIN2 NULL,
    KullaniciAjani          nvarchar(300) COLLATE Latin1_General_100_BIN2 NULL,
    UygulamaSurumu          nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    KullaniciKimlik         uniqueidentifier NULL
        CONSTRAINT FK_erisim_Oturum_erisim_Kullanici REFERENCES erisim.Kullanici (Kimlik),
    HesapKimlik             uniqueidentifier NULL
        CONSTRAINT FK_erisim_Oturum_musteri_Hesap REFERENCES musteri.Hesap (Kimlik),
    CihazKimlik             uniqueidentifier NULL
        CONSTRAINT FK_erisim_Oturum_bildirim_Cihaz REFERENCES bildirim.Cihaz (Kimlik),
    /* Bağ kısıtsız: eski oturum saklama süresi dolunca silinebilmeli. */
    OncekiOturumKimlik      uniqueidentifier NULL,
    KaynakUygulamaKodu      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT FK_erisim_Oturum_kod_KaynakUygulama REFERENCES kod.KaynakUygulama (Kod),
    KapanmaNedeniKodu       nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    BaslangicZamani         datetime2(3) NOT NULL
        CONSTRAINT DF_erisim_Oturum_BaslangicZamani DEFAULT SYSUTCDATETIME(),
    SonKullanimZamani       datetime2(3) NOT NULL
        CONSTRAINT DF_erisim_Oturum_SonKullanimZamani DEFAULT SYSUTCDATETIME(),
    BitisZamani             datetime2(3) NOT NULL,
    KapanmaZamani           datetime2(3) NULL,
    KayitNo                 bigint IDENTITY(1,1) NOT NULL,
    Kimlik                  uniqueidentifier NOT NULL
        CONSTRAINT DF_erisim_Oturum_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_erisim_Oturum PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_erisim_Oturum_YenilemeJetonuOzeti UNIQUE (YenilemeJetonuOzeti),
    /* Oturum ya personel/servis kullanıcısının ya müşteri hesabının. */
    CONSTRAINT CK_erisim_Oturum_Sahip CHECK (
         (KullaniciKimlik IS NOT NULL AND HesapKimlik IS NULL)
      OR (KullaniciKimlik IS NULL AND HesapKimlik IS NOT NULL)
    ),
    CONSTRAINT CK_erisim_Oturum_KapanmaNedeniKodu CHECK (
         KapanmaNedeniKodu IS NULL
      OR KapanmaNedeniKodu IN (N'cikis', N'sure', N'iptal', N'sifreDegisti', N'telefonDegisti',
                               N'rolSilindi', N'yenidenKullanim', N'hesapBirlestirildi', N'anonimlestirme')
    ),
    CONSTRAINT CK_erisim_Oturum_Kapanma CHECK (
         (KapanmaZamani IS NULL AND KapanmaNedeniKodu IS NULL)
      OR (KapanmaZamani IS NOT NULL AND KapanmaNedeniKodu IS NOT NULL)
    ),
    CONSTRAINT CK_erisim_Oturum_BitisZamani CHECK (BitisZamani > BaslangicZamani)
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_erisim_Oturum_KayitNo ON erisim.Oturum (KayitNo);
/* Kullanıcının ve hesabın açık oturumları (KapanmaZamani boş olanlar). */
CREATE NONCLUSTERED INDEX IX_erisim_Oturum_KullaniciKimlikKapanmaZamani
    ON erisim.Oturum (KullaniciKimlik, KapanmaZamani)
    INCLUDE (BitisZamani);
CREATE NONCLUSTERED INDEX IX_erisim_Oturum_HesapKimlikKapanmaZamani
    ON erisim.Oturum (HesapKimlik, KapanmaZamani)
    INCLUDE (BitisZamani);
CREATE NONCLUSTERED INDEX IX_erisim_Oturum_CihazKimlik ON erisim.Oturum (CihazKimlik);
CREATE NONCLUSTERED INDEX IX_erisim_Oturum_KaynakUygulamaKodu ON erisim.Oturum (KaynakUygulamaKodu);
/* Saklama süresi (sistem.SaklamaUygula). */
CREATE NONCLUSTERED INDEX IX_erisim_Oturum_BitisZamani ON erisim.Oturum (BitisZamani) INCLUDE (KapanmaZamani);
/* Eski jetonun yeniden kullanılmasını zincirden bulmak için. */
CREATE NONCLUSTERED INDEX IX_erisim_Oturum_OncekiOturumKimlik
    ON erisim.Oturum (OncekiOturumKimlik)
    WHERE OncekiOturumKimlik IS NOT NULL;
GO

EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Oturum', @Metin = N'Personel, servis ya da müşteri girişinin oturumu. Uzun süreli yenileme jetonunun yalnız özeti tutulur; kısa süreli erişim jetonu saklanmaz. Kapatılan oturuma KapanmaZamani ve nedeni yazılır. Saklama süresi dolunca sistem.SaklamaUygula siler; uygulama silemez.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Oturum', @Alt = N'YenilemeJetonuOzeti', @Metin = N'Yenileme jetonunun SHA-256 özeti; jetonun kendisi saklanmaz. Her jeton tekildir.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Oturum', @Alt = N'IpAdresi', @Metin = N'Oturumun açıldığı IP adresi. Hesap anonimleştirilince boşaltılır.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Oturum', @Alt = N'KullaniciAjani', @Metin = N'Oturumu açan tarayıcının ya da uygulamanın kendini tanıttığı metin (User-Agent). Hesap anonimleştirilince boşaltılır.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Oturum', @Alt = N'UygulamaSurumu', @Metin = N'Oturumun açıldığı uygulama sürümü (ör. 0.9.14).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Oturum', @Alt = N'KullaniciKimlik', @Metin = N'Oturum sahibi personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri oturumunda boş.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Oturum', @Alt = N'HesapKimlik', @Metin = N'Oturum sahibi müşteri hesabı (musteri.Hesap). Personel ve servis oturumunda boş.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Oturum', @Alt = N'CihazKimlik', @Metin = N'Oturumun açıldığı cihaz (bildirim.Cihaz), biliniyorsa.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Oturum', @Alt = N'OncekiOturumKimlik', @Metin = N'Jeton yenilenince kapanan önceki oturumun teknik anahtarı. Eski jetonun yeniden kullanıldığı bu zincirden anlaşılır. Bağ kısıtı yoktur: önceki oturum saklama süresi dolunca silinebilir.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Oturum', @Alt = N'KaynakUygulamaKodu', @Metin = N'Oturumun açıldığı uygulama (kod.KaynakUygulama: connect, backoffice, servisim).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Oturum', @Alt = N'KapanmaNedeniKodu', @Metin = N'Oturumun neden kapandığı: cikis, sure, iptal, sifreDegisti, telefonDegisti, rolSilindi, yenidenKullanim, hesapBirlestirildi, anonimlestirme. Açık oturumda boş.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Oturum', @Alt = N'BaslangicZamani', @Metin = N'Oturumun açıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Oturum', @Alt = N'SonKullanimZamani', @Metin = N'Oturumun son kullanıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Oturum', @Alt = N'BitisZamani', @Metin = N'Oturumun kendiliğinden sona ereceği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Oturum', @Alt = N'KapanmaZamani', @Metin = N'Oturumun kapatıldığı an (UTC). Açık oturumda boş; doluysa KapanmaNedeniKodu da doludur.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Oturum', @Alt = N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yoktur, ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'Oturum', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda görünmez.';
GO

/* -------------------------------------------------- erisim.DogrulamaKodu */

CREATE TABLE erisim.DogrulamaKodu (
    KodOzeti                binary(32) NOT NULL,
    DenemeSayisi            tinyint NOT NULL
        CONSTRAINT DF_erisim_DogrulamaKodu_DenemeSayisi DEFAULT 0,
    EnFazlaDeneme           tinyint NOT NULL
        CONSTRAINT DF_erisim_DogrulamaKodu_EnFazlaDeneme DEFAULT 5,
    AmacKodu                nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    HesapKimlik             uniqueidentifier NULL
        CONSTRAINT FK_erisim_DogrulamaKodu_musteri_Hesap REFERENCES musteri.Hesap (Kimlik),
    GidenKimlik             uniqueidentifier NULL
        CONSTRAINT FK_erisim_DogrulamaKodu_sistem_Giden REFERENCES sistem.Giden (Kimlik),
    TelefonE164             nvarchar(16) COLLATE Latin1_General_100_BIN2 NULL,
    SonGecerlilikZamani     datetime2(3) NOT NULL,
    KullanilmaZamani        datetime2(3) NULL,
    OlusmaZamani            datetime2(3) NOT NULL
        CONSTRAINT DF_erisim_DogrulamaKodu_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                 bigint IDENTITY(1,1) NOT NULL,
    Kimlik                  uniqueidentifier NOT NULL
        CONSTRAINT DF_erisim_DogrulamaKodu_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_erisim_DogrulamaKodu PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT CK_erisim_DogrulamaKodu_AmacKodu
        CHECK (AmacKodu IN (N'sifreSifirlama', N'kayit', N'telefonDegisikligi', N'giris')),
    CONSTRAINT CK_erisim_DogrulamaKodu_TelefonE164 CHECK (
        TelefonE164 IS NULL
        OR (TelefonE164 LIKE N'+[1-9]%'
            AND SUBSTRING(TelefonE164, 2, 15) NOT LIKE N'%[^0-9]%'
            AND LEN(TelefonE164) BETWEEN 8 AND 16)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_erisim_DogrulamaKodu_KayitNo ON erisim.DogrulamaKodu (KayitNo);
/* Telefona son gönderilen kodlar (gönderim sıklığı sınırı ve doğrulama). */
CREATE NONCLUSTERED INDEX IX_erisim_DogrulamaKodu_TelefonE164OlusmaZamani
    ON erisim.DogrulamaKodu (TelefonE164, OlusmaZamani);
CREATE NONCLUSTERED INDEX IX_erisim_DogrulamaKodu_HesapKimlik ON erisim.DogrulamaKodu (HesapKimlik);
CREATE NONCLUSTERED INDEX IX_erisim_DogrulamaKodu_GidenKimlik ON erisim.DogrulamaKodu (GidenKimlik);
/* Saklama süresi (sistem.SaklamaUygula). */
CREATE NONCLUSTERED INDEX IX_erisim_DogrulamaKodu_OlusmaZamani ON erisim.DogrulamaKodu (OlusmaZamani);
GO

EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'DogrulamaKodu', @Metin = N'Telefona SMS ile gönderilen tek kullanımlık doğrulama kodu (kayıt, şifre sıfırlama, numara değişikliği, giriş). Kodun kendisi saklanmaz; yalnız anahtarlı özeti durur. Saklama süresi dolunca sistem.SaklamaUygula siler; uygulama silemez.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'DogrulamaKodu', @Alt = N'KodOzeti', @Metin = N'Kodun anahtarlı özeti: HMAC-SHA256(doğrulama anahtarı, amaç|telefon|kod). Anahtar veritabanında değil, API''nin ortam dosyasındadır.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'DogrulamaKodu', @Alt = N'DenemeSayisi', @Metin = N'Bu kod için yanlış girilme sayısı.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'DogrulamaKodu', @Alt = N'EnFazlaDeneme', @Metin = N'İzin verilen en çok yanlış deneme; aşılınca kod kullanılamaz.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'DogrulamaKodu', @Alt = N'AmacKodu', @Metin = N'Kodun amacı: sifreSifirlama, kayit, telefonDegisikligi ya da giris.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'DogrulamaKodu', @Alt = N'HesapKimlik', @Metin = N'Kodun ilgili olduğu müşteri hesabı (musteri.Hesap). Hesap henüz yoksa (kayıt) boş.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'DogrulamaKodu', @Alt = N'GidenKimlik', @Metin = N'Kodu taşıyan SMS kaydı (sistem.Giden); mesaj metni orada da saklanmaz.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'DogrulamaKodu', @Alt = N'TelefonE164', @Metin = N'Kodun gönderildiği telefon, uluslararası biçimde (+905321234567). Anonimleştirmede boşaltılır.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'DogrulamaKodu', @Alt = N'SonGecerlilikZamani', @Metin = N'Kodun geçerli olduğu son an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'DogrulamaKodu', @Alt = N'KullanilmaZamani', @Metin = N'Kodun doğru girilip kullanıldığı an (UTC). Bir kod bir kez kullanılır.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'DogrulamaKodu', @Alt = N'OlusmaZamani', @Metin = N'Kodun üretildiği an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'DogrulamaKodu', @Alt = N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yoktur, ekrana çıkmaz.';
EXEC dbo.AciklamaYaz @Sema = N'erisim', @Nesne = N'DogrulamaKodu', @Alt = N'Kimlik', @Metin = N'Satırın teknik anahtarı. Ekranda görünmez.';
GO

/* ------------------------------- bildirim.Teslimat → sistem.Giden (6.3) */

ALTER TABLE bildirim.Teslimat WITH CHECK
    ADD CONSTRAINT FK_bildirim_Teslimat_sistem_Giden
    FOREIGN KEY (GidenKimlik) REFERENCES sistem.Giden (Kimlik);
GO
