/* ==========================================================================
   V0003 — cografya şeması: ülke, il, ilçe, yurt dışı bölge

   Kural kaynağı: veritabani/tasarim.md (0.2, 0.4 cografya, 1.4.3, 1.5,
   1.6, 6.2). Tohum T02__cografya.sql yazar; uygulama bu tablolara yazmaz.

   - Anahtarlar doğal ve kümelenmiş (Bölüm 1.6).
   - IlKodu tinyint, IlceKodu int: "…Kodu BIN2" kuralının iki istisnası.
   - [Y] grubunun bileşik yabancı anahtarı (IlKodu, IlceKodu) →
     cografya.Ilce (IlKodu, IlceKodu) hedefini UQ_cografya_Ilce_IlKoduIlceKodu
     karşılar.
   - Ülke adlarının başka dildeki karşılığı kod.Ceviri (ListeAdi =
     N'cografya.Ulke', AlanAdi = N'Ad') tablosundadır.
   - Betik tek işlemde çalışır (araç sarmalar); BEGIN/COMMIT yazılmaz.
   ========================================================================== */

/* ------------------------------------------------------------- Ulke */

CREATE TABLE cografya.Ulke (
    Kod                 nvarchar(2)   COLLATE Latin1_General_100_BIN2 NOT NULL,
    Ad                  nvarchar(100) COLLATE Turkish_100_CI_AS       NOT NULL,
    TelefonKodu         nvarchar(5)   COLLATE Latin1_General_100_BIN2 NOT NULL,
    TelefonHaneSayisi   tinyint NULL,
    ResmiIso            bit NOT NULL CONSTRAINT DF_cografya_Ulke_ResmiIso DEFAULT 1,
    BolgeListesiVar     bit NOT NULL CONSTRAINT DF_cografya_Ulke_BolgeListesiVar DEFAULT 0,
    Sira                smallint NOT NULL CONSTRAINT DF_cografya_Ulke_Sira DEFAULT 0,
    CONSTRAINT PK_cografya_Ulke PRIMARY KEY CLUSTERED (Kod),
    CONSTRAINT CK_cografya_Ulke_Kod CHECK (Kod LIKE N'[A-Z][A-Z]'),
    CONSTRAINT CK_cografya_Ulke_TelefonKodu CHECK (
        TelefonKodu LIKE N'+[1-9]%'
        AND LEN(TelefonKodu) BETWEEN 2 AND 5
        AND SUBSTRING(TelefonKodu, 2, 4) NOT LIKE N'%[^0-9]%'),
    CONSTRAINT CK_cografya_Ulke_TelefonHaneSayisi CHECK (
        TelefonHaneSayisi IS NULL OR TelefonHaneSayisi BETWEEN 4 AND 15)
);
GO

EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'Ulke',
    @Metin = N'Ülke listesi. Müşterinin, talebin ve firmaların konumunda seçilen ülke buradan gelir; telefon numarası da ülke koduyla birlikte alınır. Ülke adının İngilizcesi kod.Ceviri tablosundadır (ListeAdi = cografya.Ulke). Tohumla gelir (kaynak: src/data/ulkeler.js); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'Ulke', @Alt = N'Kod',
    @Metin = N'Ülkenin iki harfli uluslararası kısaltması, büyük harfle (TR, DE, US). Öteki tablolar ülkeye bu kodla bağlanır (UlkeKodu, KonumUlkeKodu, TelefonUlkeKodu).';
EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'Ulke', @Alt = N'Ad',
    @Metin = N'Ülkenin Türkçe adı (Türkiye, Almanya). Başka dildeki adı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'Ulke', @Alt = N'TelefonKodu',
    @Metin = N'Ülkenin telefon kodu, artı işaretiyle (+90). İki ülkenin kodu aynı olabilir (+1: ABD ve Kanada), bu yüzden ülkeyi bu koddan değil Kod kolonundan seçin.';
EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'Ulke', @Alt = N'TelefonHaneSayisi',
    @Metin = N'O ülkede telefon numarasının ülke kodu olmadan kaç rakam olduğu (Türkiye: 10). Boşsa bilinmiyor demektir; uygulama o zaman 6 ile 14 arası rakam kabul eder.';
EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'Ulke', @Alt = N'ResmiIso',
    @Metin = N'Kod, resmî uluslararası ülke kodları listesinde (ISO 3166) varsa 1. Yaygın kullanılan ama o listede olmayan kodlarda 0 (Kosova: XK).';
EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'Ulke', @Alt = N'BolgeListesiVar',
    @Metin = N'Bu ülke için seçilebilir bölge (eyalet, vilayet) listesi cografya.YurtdisiBolge tablosunda varsa 1. 0 ise bölge ekranda elle yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'Ulke', @Alt = N'Sira',
    @Metin = N'Listedeki gösterim sırası; küçük sayı önce gelir. Türkiye en baştadır.';
GO

/* --------------------------------------------------------------- Il */

CREATE TABLE cografya.Il (
    IlKodu      tinyint NOT NULL,
    Ad          nvarchar(50) COLLATE Turkish_100_CI_AS NOT NULL,
    AdArama AS CAST(LOWER(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
          Ad COLLATE Latin1_General_100_BIN2,
          N'ç',N'c'), N'Ç',N'C'), N'ğ',N'g'), N'Ğ',N'G'), N'ı',N'i'), N'İ',N'I'),
          N'ö',N'o'), N'Ö',N'O'), N'ş',N's'), N'Ş',N'S'), N'ü',N'u'), N'Ü',N'U'),
          N'â',N'a'), N'Â',N'A'), N'î',N'i'), N'Î',N'I'), N'û',N'u'), N'Û',N'U')
      ) AS nvarchar(50)) PERSISTED,
    CONSTRAINT PK_cografya_Il PRIMARY KEY CLUSTERED (IlKodu),
    CONSTRAINT UQ_cografya_Il_Ad UNIQUE (Ad),
    CONSTRAINT CK_cografya_Il_IlKodu CHECK (IlKodu BETWEEN 1 AND 81)
);
GO

CREATE INDEX IX_cografya_Il_AdArama ON cografya.Il (AdArama);
GO

EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'Il',
    @Metin = N'Türkiye''nin 81 ili. İl kodu, araç plakasındaki il numarasıdır (Adana 1, İstanbul 34). Tohumla gelir (kaynak: src/data/iller.js ve tohum/kaynak/il-plaka.json); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'Il', @Alt = N'IlKodu',
    @Metin = N'İlin plaka kodu (1 ile 81 arası). Öteki tablolar ile bu numarayla bağlanır (IlKodu, KonumIlKodu).';
EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'Il', @Alt = N'Ad',
    @Metin = N'İlin adı (Adana, İstanbul). Türkçe büyük/küçük harf farkı gözetilmeden aranır: WHERE Ad = N''istanbul'' İSTANBUL''u bulur. Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz. Adı Türkçe harfsiz aramak için AdArama kolonunu LIKE N''%isik%'' biçiminde kullanın.';
EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'Il', @Alt = N'AdArama',
    @Metin = N'İl adının aramaya uygun biçimi: Türkçe harfler karşılığı olan harfe çevrilmiş, hepsi küçük harf (Diyarbakır → diyarbakir). Veritabanı kendisi hesaplar, elle yazılmaz. Aramak için: WHERE AdArama LIKE N''%diyarbakir%''. Aranacak metni küçük harfle ve Türkçe harfsiz yazın: WHERE AdArama LIKE N''%isik%''.';
GO

/* ------------------------------------------------------------- Ilce */

CREATE TABLE cografya.Ilce (
    IlceKodu        int NOT NULL,
    Ad              nvarchar(60) COLLATE Turkish_100_CI_AS NOT NULL,
    AdArama AS CAST(LOWER(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
          Ad COLLATE Latin1_General_100_BIN2,
          N'ç',N'c'), N'Ç',N'C'), N'ğ',N'g'), N'Ğ',N'G'), N'ı',N'i'), N'İ',N'I'),
          N'ö',N'o'), N'Ö',N'O'), N'ş',N's'), N'Ş',N'S'), N'ü',N'u'), N'Ü',N'U'),
          N'â',N'a'), N'Â',N'A'), N'î',N'i'), N'Î',N'I'), N'û',N'u'), N'Û',N'U')
      ) AS nvarchar(60)) PERSISTED,
    IlKodu          tinyint NOT NULL,
    ResmiIlceKodu   nvarchar(10) COLLATE Latin1_General_100_BIN2 NULL,
    CONSTRAINT PK_cografya_Ilce PRIMARY KEY CLUSTERED (IlceKodu),
    CONSTRAINT UQ_cografya_Ilce_IlKoduIlceKodu UNIQUE (IlKodu, IlceKodu),
    CONSTRAINT UQ_cografya_Ilce_IlKoduAd UNIQUE (IlKodu, Ad),
    CONSTRAINT FK_cografya_Ilce_cografya_Il FOREIGN KEY (IlKodu)
        REFERENCES cografya.Il (IlKodu),
    CONSTRAINT CK_cografya_Ilce_IlceKodu CHECK (
        IlceKodu / 1000 = IlKodu AND IlceKodu % 1000 >= 1),
    CONSTRAINT CK_cografya_Ilce_ResmiIlceKodu CHECK (
        ResmiIlceKodu IS NULL OR LEN(ResmiIlceKodu) >= 1)
);
GO

CREATE UNIQUE INDEX UX_cografya_Ilce_ResmiIlceKodu ON cografya.Ilce (ResmiIlceKodu)
    WHERE ResmiIlceKodu IS NOT NULL;
CREATE INDEX IX_cografya_Ilce_AdArama ON cografya.Ilce (AdArama);
GO

EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'Ilce',
    @Metin = N'Türkiye''nin ilçeleri. İlçe kodu PAKSAN''ın verdiği kalıcı bir numaradır: il plaka kodu × 1000 + sıra (Adana''nın ilk ilçesi 1001). Resmî kod değildir; resmî kod ResmiIlceKodu kolonundadır. Numara bir kez verilir, sonradan değiştirilmez; yeni ilçe yeni numara alır. Tohumla gelir (kaynak: src/data/iller.js ve tohum/kaynak/ilce-kodlari.json); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'Ilce', @Alt = N'IlceKodu',
    @Metin = N'İlçenin kalıcı numarası: il plaka kodu × 1000 + sıra (ör. 34015). Bine bölününce ilin plaka kodu çıkar. Öteki tablolar ilçeye bu numarayla bağlanır (IlceKodu, KonumIlceKodu).';
EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'Ilce', @Alt = N'Ad',
    @Metin = N'İlçenin adı (Seyhan, Kadıköy). Aynı ilde aynı ad bir kez bulunur; farklı illerde aynı adlı ilçe olabilir. Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz. Adı Türkçe harfsiz aramak için AdArama kolonunu LIKE N''%isik%'' biçiminde kullanın.';
EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'Ilce', @Alt = N'AdArama',
    @Metin = N'İlçe adının aramaya uygun biçimi: Türkçe harfler karşılığı olan harfe çevrilmiş, hepsi küçük harf (Kâhta → kahta). Veritabanı kendisi hesaplar, elle yazılmaz. Aranacak metni küçük harfle ve Türkçe harfsiz yazın: WHERE AdArama LIKE N''%isik%''.';
EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'Ilce', @Alt = N'IlKodu',
    @Metin = N'İlçenin bağlı olduğu ilin plaka kodu (cografya.Il).';
EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'Ilce', @Alt = N'ResmiIlceKodu',
    @Metin = N'İlçenin resmî kurumlarda kullanılan kodu. Canlıya çıkmadan önce doldurulacak; boş olabilir. Dolu olduğunda iki ilçede aynı değer olamaz.';
GO

/* ---------------------------------------------------- YurtdisiBolge */

CREATE TABLE cografya.YurtdisiBolge (
    UlkeKodu    nvarchar(2)   COLLATE Latin1_General_100_BIN2 NOT NULL,
    Ad          nvarchar(100) COLLATE Turkish_100_CI_AS       NOT NULL,
    Sira        smallint NOT NULL CONSTRAINT DF_cografya_YurtdisiBolge_Sira DEFAULT 0,
    CONSTRAINT PK_cografya_YurtdisiBolge PRIMARY KEY CLUSTERED (UlkeKodu, Ad),
    CONSTRAINT FK_cografya_YurtdisiBolge_cografya_Ulke FOREIGN KEY (UlkeKodu)
        REFERENCES cografya.Ulke (Kod)
);
GO

EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'YurtdisiBolge',
    @Metin = N'Yurt dışında seçilebilen birinci kademe bölgeler (eyalet, vilayet, il). Yalnız listesi olan ülkeler için satır vardır; öteki ülkelerde bölge ekranda elle yazılır. Müşteri ve talep kayıtları bölgeyi metin olarak saklar (YurtdisiBolge kolonu), bu tabloya bağlanmaz. Tohumla gelir (kaynak: src/data/bolgeler.js); uygulama bu tabloya yazmaz.';
EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'YurtdisiBolge', @Alt = N'UlkeKodu',
    @Metin = N'Bölgenin bulunduğu ülkenin iki harfli kısaltması (cografya.Ulke).';
EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'YurtdisiBolge', @Alt = N'Ad',
    @Metin = N'Bölgenin adı, uygulamadaki listede yazıldığı gibi (Bayern, Baden-Württemberg). Aynı ülkede aynı ad bir kez bulunur.';
EXEC dbo.AciklamaYaz @Sema = N'cografya', @Nesne = N'YurtdisiBolge', @Alt = N'Sira',
    @Metin = N'Ülke içindeki gösterim sırası; küçük sayı önce gelir.';
GO
