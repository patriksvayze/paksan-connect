/* ==========================================================================
   V0002 — Kod listeleri ve numara tabloları

   İçerik (tasarim.md Bölüm 6.2, bu sırayla): bütün kod listeleri (kod.*),
   okunur numara önekleri ve sayaçları (sistem.NumaraOneki,
   sistem.NumaraSayaci), talep numara kuralı, tür–durum ve tür–uydu
   bağları, çeviri ve eski değer eşleşmesi.

   Kod listesi biçimi [L] (tasarim.md 1.15.1): Kod (BIN2, kümelenmiş
   birincil anahtar), Ad (Türkçe), Sira, Aktif, Aciklama + listeye özgü
   kolonlar. Kod kolonlarında varsayılan değer yoktur: bilinmeyen kod
   yabancı anahtar hatası verir. Satır silinmez, Aktif = 0 yapılır.

   Bayrak kopyası hedefleri (tasarim.md 1.17.2): kod.TalepDurumu
   (Kod, Kapali), kod.IptalNedeni (Kod, AciklamaZorunlu), kod.TeklifSonucu
   (Kod, FiyatZorunlu), kod.HesapHareketTuru (Kod, YonKodu),
   kod.DuyuruAltTuru (Kod, UstTurKodu).

   İleri yabancı anahtar: kod.TalepNumaraKurali.MarkaKodu → katalog.Marka
   V0004'te eklenir (tasarim.md 6.3); kolonun dizini burada açılır.

   Satırlar T01__kod_listeleri.sql ile gelir; bu betik veri yazmaz.
   Araç bu betiği tek işlem içinde, sahip girişiyle bir kez uygular.
   ========================================================================== */

/* --------------------------------------------------------------------------
   kod.Dil
   -------------------------------------------------------------------------- */
CREATE TABLE kod.Dil (
    Kod      nvarchar(5) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_Dil_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_Dil_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_Dil_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_Dil PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Dil',
     @Metin = N'Uygulamanın desteklediği diller (tr Türkçe, en İngilizce). Yeni dil bu tabloya satır ve çeviri tablolarına metin eklenerek açılır. Türkçe metin her zaman satırın kendi tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Dil', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. tr). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Dil', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Dil', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Dil', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Dil', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.ParaBirimi
   -------------------------------------------------------------------------- */
CREATE TABLE kod.ParaBirimi (
    Kod      nvarchar(3) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_ParaBirimi_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_ParaBirimi_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_ParaBirimi_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    Sembol   nvarchar(5) COLLATE Latin1_General_100_BIN2 NULL,
    CONSTRAINT PK_kod_ParaBirimi PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ParaBirimi',
     @Metin = N'Para birimleri (TRY). Tutar taşıyan her satır para birimini bu listeden alır. Veritabanı para birimleri arasında çevirme yapmaz ve kur tutmaz.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ParaBirimi', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. TRY). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ParaBirimi', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ParaBirimi', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ParaBirimi', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ParaBirimi', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ParaBirimi', @Alt = N'Sembol',
     @Metin = N'Tutarın yanında gösterilen işaret (ör. ₺). Boş olabilir.';
GO

/* --------------------------------------------------------------------------
   kod.KayitTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.KayitTuru (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_KayitTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_KayitTuru_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_KayitTuru_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_KayitTuru PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KayitTuru',
     @Metin = N'Veritabanındaki kayıt türleri (talep, hesap, makine, dosya, işlem kaydı…). Okunur numara öneklerinde, işlem kaydında, saklama kurallarında, gönderilen mesajlarda ve içe aktarım eşleşmelerinde "hangi tür kayıt" sorusunun cevabıdır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KayitTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. talep). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KayitTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KayitTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KayitTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KayitTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   sistem.NumaraOneki
   -------------------------------------------------------------------------- */
CREATE TABLE sistem.NumaraOneki (
    Onek          nvarchar(3) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_sistem_NumaraOneki_Onek CHECK (Onek LIKE N'[A-HJ-NP-Z][A-HJ-NP-Z][A-HJ-NP-Z]'),
    KayitTuruKodu nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    Aktif         bit NOT NULL
        CONSTRAINT DF_sistem_NumaraOneki_Aktif DEFAULT 1,
    Aciklama      nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_sistem_NumaraOneki PRIMARY KEY CLUSTERED (Onek),
    CONSTRAINT FK_sistem_NumaraOneki_kod_KayitTuru
        FOREIGN KEY (KayitTuruKodu) REFERENCES kod.KayitTuru (Kod)
);
CREATE NONCLUSTERED INDEX IX_sistem_NumaraOneki_KayitTuruKodu ON sistem.NumaraOneki (KayitTuruKodu);
GO
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'NumaraOneki',
     @Metin = N'PAKSAN''ın verdiği okunur numaraların üç harfli önekleri: SRV servis talebi, YPR yedek parça talebi, TKF fiyat teklifi talebi, SPS servisin parça siparişi, HAK aylık hak ediş dökümü, TEL numara değişikliği talebi, GBD geri bildirim. Numara önek + yılın son iki hanesi + beş haneli sıradır (SRV2600123; ekranda SRV-26-00123). Yeni numara serisi satır eklenerek açılır.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'NumaraOneki', @Alt = N'Onek',
     @Metin = N'Numaranın ilk üç harfi (ör. SRV). Büyük harf; rakamla karışmasın diye O ve I kullanılmaz.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'NumaraOneki', @Alt = N'KayitTuruKodu',
     @Metin = N'Bu önekle numara alan kaydın türü (kod.KayitTuru; ör. talep, donemDokumu).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'NumaraOneki', @Alt = N'Aktif',
     @Metin = N'1: bu önekle yeni numara verilir. 0: yeni numara verilmez; verilmiş numaralar geçerli kalır. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'NumaraOneki', @Alt = N'Aciklama',
     @Metin = N'Önekin hangi kayıtlarda kullanıldığını anlatan not.';
GO

/* --------------------------------------------------------------------------
   sistem.NumaraSayaci
   -------------------------------------------------------------------------- */
CREATE TABLE sistem.NumaraSayaci (
    Onek    nvarchar(3) COLLATE Latin1_General_100_BIN2 NOT NULL,
    Yil     smallint NOT NULL
        CONSTRAINT CK_sistem_NumaraSayaci_Yil CHECK (Yil BETWEEN 2000 AND 9999),
    SonSira int NOT NULL
        CONSTRAINT CK_sistem_NumaraSayaci_SonSira CHECK (SonSira BETWEEN 0 AND 99999),
    CONSTRAINT PK_sistem_NumaraSayaci PRIMARY KEY CLUSTERED (Onek, Yil),
    CONSTRAINT FK_sistem_NumaraSayaci_sistem_NumaraOneki
        FOREIGN KEY (Onek) REFERENCES sistem.NumaraOneki (Onek)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'NumaraSayaci',
     @Metin = N'Her önek ve yıl için verilmiş son sıra numarası. Yalnız sistem.NumaraAl prosedürü yazar; elle değiştirilmez, uygulama girişi göremez. Yeni yılın satırı o yılın ilk numarasında kendiliğinden açılır. Numarada boşluk olabilir; numara yasal belge numarası değildir.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'NumaraSayaci', @Alt = N'Onek',
     @Metin = N'Numaranın öneki (sistem.NumaraOneki; ör. SRV).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'NumaraSayaci', @Alt = N'Yil',
     @Metin = N'Numaranın yılı, dört haneli (ör. 2026). Türkiye saatine göre hesaplanır: 31 Aralık 21:30 UTC yeni yıla sayılır. Numarada son iki hanesi yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'NumaraSayaci', @Alt = N'SonSira',
     @Metin = N'Bu önek ve yıl için verilmiş son sıra (0–99999); numaranın son beş hanesi. 99999''a ulaşınca o yıl bu önekle numara verilemez.';
GO

/* --------------------------------------------------------------------------
   kod.KaynakUygulama
   -------------------------------------------------------------------------- */
CREATE TABLE kod.KaynakUygulama (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_KaynakUygulama_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_KaynakUygulama_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_KaynakUygulama_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_KaynakUygulama PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KaynakUygulama',
     @Metin = N'Kaydın hangi uygulamadan geldiği: connect (PAKSAN Connect müşteri uygulaması), backoffice (personel paneli), servisim (PAKSAN Servisim), api (sunucunun kendi işleri), betik (kurulum ve tohum betikleri), entegrasyon (dış sistem aktarımı), yonetim (SSMS''ten çalıştırılan yönetim prosedürleri).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KaynakUygulama', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. connect). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KaynakUygulama', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KaynakUygulama', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KaynakUygulama', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KaynakUygulama', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.AktorTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.AktorTuru (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_AktorTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_AktorTuru_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_AktorTuru_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_AktorTuru PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'AktorTuru',
     @Metin = N'İşi yapan tarafın türü: musteri, personel, servis, sistem, entegrasyon. "Kim yaptı" kolonlarında (YapanTuruKodu) ve giriş kullanıcılarında (erisim.Kullanici.TurKodu) kullanılır. Yeni taraf türü (ör. bayi paneli açılırsa bayi) satır eklenerek tanımlanır; hiçbir kısıt değişmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'AktorTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. personel). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'AktorTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'AktorTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'AktorTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'AktorTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.KayitKaynagi
   -------------------------------------------------------------------------- */
CREATE TABLE kod.KayitKaynagi (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_KayitKaynagi_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_KayitKaynagi_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_KayitKaynagi_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_KayitKaynagi PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KayitKaynagi',
     @Metin = N'Makine, sahiplik, servis ataması, satış ve belge kayıtlarının nereden geldiği: musteri (PAKSAN Connect), servis (PAKSAN Servisim), personel (backoffice), logo, iceAktarim (Excel), entegrasyon.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KayitKaynagi', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. musteri). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KayitKaynagi', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KayitKaynagi', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KayitKaynagi', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KayitKaynagi', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.DisSistem
   -------------------------------------------------------------------------- */
CREATE TABLE kod.DisSistem (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_DisSistem_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_DisSistem_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_DisSistem_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_DisSistem PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DisSistem',
     @Metin = N'Veritabanının bağlandığı dış sistemler ve sağlayıcılar: logo (muhasebe), fcm (Android bildirim servisi), webPush (tarayıcı bildirimi). Yeni muhasebe programı, e-fatura, SMS ya da kargo firması satır eklenerek tanımlanır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DisSistem', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. logo). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DisSistem', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DisSistem', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DisSistem', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DisSistem', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.BildirimKanali
   -------------------------------------------------------------------------- */
CREATE TABLE kod.BildirimKanali (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_BildirimKanali_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_BildirimKanali_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_BildirimKanali_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_BildirimKanali PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BildirimKanali',
     @Metin = N'Mesajın gönderildiği kanal: sms, eposta, push (telefon bildirimi), webPush (tarayıcı bildirimi). Yeni kanal (ör. WhatsApp) satır eklenerek tanımlanır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BildirimKanali', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. sms). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BildirimKanali', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BildirimKanali', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BildirimKanali', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BildirimKanali', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.IslemKategorisi
   -------------------------------------------------------------------------- */
CREATE TABLE kod.IslemKategorisi (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_IslemKategorisi_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_IslemKategorisi_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_IslemKategorisi_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_IslemKategorisi PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IslemKategorisi',
     @Metin = N'İşlem kaydı ekranındaki süzgeç öbekleri (talep, durum, ödeme, makine, personel, şifre…). Her işlem türü bir öbeğe bağlıdır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IslemKategorisi', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. talep). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IslemKategorisi', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IslemKategorisi', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IslemKategorisi', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IslemKategorisi', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.IslemTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.IslemTuru (
    Kod          nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_IslemTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad           nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira         smallint NOT NULL
        CONSTRAINT DF_kod_IslemTuru_Sira DEFAULT 0,
    Aktif        bit NOT NULL
        CONSTRAINT DF_kod_IslemTuru_Aktif DEFAULT 1,
    Aciklama     nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    KategoriKodu nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    CONSTRAINT PK_kod_IslemTuru PRIMARY KEY CLUSTERED (Kod),
    CONSTRAINT FK_kod_IslemTuru_kod_IslemKategorisi
        FOREIGN KEY (KategoriKodu) REFERENCES kod.IslemKategorisi (Kod)
);
CREATE NONCLUSTERED INDEX IX_kod_IslemTuru_KategoriKodu ON kod.IslemTuru (KategoriKodu);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IslemTuru',
     @Metin = N'İşlem kaydına yazılan olayların türü (ör. talepOlusturuldu, odemeOnaylandi, ayarDegisti, talepElleKapatildi). Yeni tür satır eklenerek tanımlanır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IslemTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. talepOlusturuldu). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IslemTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IslemTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IslemTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IslemTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IslemTuru', @Alt = N'KategoriKodu',
     @Metin = N'Bu türün işlem kaydı ekranında görüneceği öbek (kod.IslemKategorisi).';
GO

/* --------------------------------------------------------------------------
   kod.TalepTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.TalepTuru (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_TalepTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_TalepTuru_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_TalepTuru_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_TalepTuru PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepTuru',
     @Metin = N'Talep türleri: servis (servis talebi), parca (yedek parça talebi), satinalma (fiyat teklifi talebi). Yeni tür satır eklenerek açılır; numara kuralı, durumları, ek kayıtları ve masası da satır olarak eklenir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. servis). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.TalepKaynagi
   -------------------------------------------------------------------------- */
CREATE TABLE kod.TalepKaynagi (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_TalepKaynagi_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_TalepKaynagi_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_TalepKaynagi_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_TalepKaynagi PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepKaynagi',
     @Metin = N'Talebin nereden açıldığı: connect (müşteri PAKSAN Connect''ten), servisElle (servis PAKSAN Servisim''den elle), servisSiparisi (servisin kendi parça siparişi), backoffice (PAKSAN personeli).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepKaynagi', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. connect). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepKaynagi', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepKaynagi', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepKaynagi', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepKaynagi', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.TalepNumaraKurali
   -------------------------------------------------------------------------- */
CREATE TABLE kod.TalepNumaraKurali (
    TurKodu     nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    KaynakKodu  nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    NumaraOneki nvarchar(3) COLLATE Latin1_General_100_BIN2 NOT NULL,
    MarkaKodu   nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    CONSTRAINT PK_kod_TalepNumaraKurali PRIMARY KEY CLUSTERED (TurKodu, KaynakKodu, NumaraOneki),
    CONSTRAINT FK_kod_TalepNumaraKurali_kod_TalepTuru
        FOREIGN KEY (TurKodu) REFERENCES kod.TalepTuru (Kod),
    CONSTRAINT FK_kod_TalepNumaraKurali_kod_TalepKaynagi
        FOREIGN KEY (KaynakKodu) REFERENCES kod.TalepKaynagi (Kod),
    CONSTRAINT FK_kod_TalepNumaraKurali_sistem_NumaraOneki
        FOREIGN KEY (NumaraOneki) REFERENCES sistem.NumaraOneki (Onek)
);
CREATE NONCLUSTERED INDEX IX_kod_TalepNumaraKurali_KaynakKodu ON kod.TalepNumaraKurali (KaynakKodu);
CREATE NONCLUSTERED INDEX IX_kod_TalepNumaraKurali_NumaraOneki ON kod.TalepNumaraKurali (NumaraOneki);
CREATE NONCLUSTERED INDEX IX_kod_TalepNumaraKurali_MarkaKodu ON kod.TalepNumaraKurali (MarkaKodu);
CREATE UNIQUE NONCLUSTERED INDEX UX_kod_TalepNumaraKurali_Genel ON kod.TalepNumaraKurali (TurKodu, KaynakKodu)
    WHERE MarkaKodu IS NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_kod_TalepNumaraKurali_Marka ON kod.TalepNumaraKurali (TurKodu, KaynakKodu, MarkaKodu)
    WHERE MarkaKodu IS NOT NULL;
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepNumaraKurali',
     @Metin = N'Hangi talep türü ve kaynağın hangi önekle numara alacağı (ör. servis + connect → SRV, parca + servisSiparisi → SPS). MarkaKodu boş satır bütün markalar için geçerlidir. Bir markaya ayrı numara serisi gerekirse o markanın satırı eklenir; o markanın taleplerinde önce marka satırı kullanılır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepNumaraKurali', @Alt = N'TurKodu',
     @Metin = N'Talep türü (kod.TalepTuru).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepNumaraKurali', @Alt = N'KaynakKodu',
     @Metin = N'Talebin açıldığı yer (kod.TalepKaynagi).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepNumaraKurali', @Alt = N'NumaraOneki',
     @Metin = N'Bu türe ve kaynağa verilecek numaranın öneki (sistem.NumaraOneki).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepNumaraKurali', @Alt = N'MarkaKodu',
     @Metin = N'Boş: bütün markalar için geçerli genel kural. Dolu: yalnız bu markanın talepleri için (katalog.Marka).';
GO

/* --------------------------------------------------------------------------
   kod.TalepDurumu
   -------------------------------------------------------------------------- */
CREATE TABLE kod.TalepDurumu (
    Kod            nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_TalepDurumu_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad             nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira           smallint NOT NULL
        CONSTRAINT DF_kod_TalepDurumu_Sira DEFAULT 0,
    Aktif          bit NOT NULL
        CONSTRAINT DF_kod_TalepDurumu_Aktif DEFAULT 1,
    Aciklama       nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    Kapali         bit NOT NULL,
    GecikmeSayilir bit NOT NULL
        CONSTRAINT DF_kod_TalepDurumu_GecikmeSayilir DEFAULT 0,
    Ton            nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    CONSTRAINT PK_kod_TalepDurumu PRIMARY KEY CLUSTERED (Kod),
    CONSTRAINT UQ_kod_TalepDurumu_KodKapali UNIQUE (Kod, Kapali),
    CONSTRAINT CK_kod_TalepDurumu_GecikmeSayilir CHECK (Kapali = 0 OR GecikmeSayilir = 0)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepDurumu',
     @Metin = N'Talep durumları (yeni, incelemede, planlandi, teklif, onayBekliyor, parcaBekliyor, odemeBekliyor, kapandi, iptal). Talebin açık ya da kapalı sayılması ve gecikme hesabı durum adına göre değil, bu tablodaki Kapali ve GecikmeSayilir bayraklarına göre yapılır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepDurumu', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. parcaBekliyor). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepDurumu', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepDurumu', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepDurumu', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepDurumu', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepDurumu', @Alt = N'Kapali',
     @Metin = N'1: talep bu durumda kapanmış sayılır (kapandi, iptal). Talep satırındaki Kapali kolonu bu değerin kopyasıdır; bu duruma bakan talep varken değiştirilemez. Bir durumun sınıfı değişecekse yeni durum açılır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepDurumu', @Alt = N'GecikmeSayilir',
     @Metin = N'1: talep bu durumda ayarlardaki süreden (TalepGecikmeSaati) uzun kalırsa gecikmiş sayılır. 0: sayılmaz (teklif, odemeBekliyor ve bütün kapalı durumlar).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepDurumu', @Alt = N'Ton',
     @Metin = N'Ekrandaki durum etiketinin renk adı (kirmizi, turuncu, mavi, mor, yesil, gri). Boşsa nötr görünür.';
GO

/* --------------------------------------------------------------------------
   kod.TalepTuruDurumu
   -------------------------------------------------------------------------- */
CREATE TABLE kod.TalepTuruDurumu (
    TurKodu         nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    DurumKodu       nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    ElleSecilebilir bit NOT NULL
        CONSTRAINT DF_kod_TalepTuruDurumu_ElleSecilebilir DEFAULT 0,
    CONSTRAINT PK_kod_TalepTuruDurumu PRIMARY KEY CLUSTERED (TurKodu, DurumKodu),
    CONSTRAINT FK_kod_TalepTuruDurumu_kod_TalepTuru
        FOREIGN KEY (TurKodu) REFERENCES kod.TalepTuru (Kod),
    CONSTRAINT FK_kod_TalepTuruDurumu_kod_TalepDurumu
        FOREIGN KEY (DurumKodu) REFERENCES kod.TalepDurumu (Kod)
);
CREATE NONCLUSTERED INDEX IX_kod_TalepTuruDurumu_DurumKodu ON kod.TalepTuruDurumu (DurumKodu);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepTuruDurumu',
     @Metin = N'Her talep türünde hangi durumların kullanılabileceği ve personelin hangisini backoffice''te elle seçebileceği. Talep, türünde tanımlı olmayan bir duruma geçemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepTuruDurumu', @Alt = N'TurKodu',
     @Metin = N'Talep türü (kod.TalepTuru).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepTuruDurumu', @Alt = N'DurumKodu',
     @Metin = N'Bu türde kullanılabilen durum (kod.TalepDurumu).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepTuruDurumu', @Alt = N'ElleSecilebilir',
     @Metin = N'1: personel bu durumu backoffice''te elle seçebilir. 0: talep bu duruma yalnız akışla geçer (servis kaydı, ödeme bekleme, hak ediş onayı).';
GO

/* --------------------------------------------------------------------------
   kod.TalepTuruUydusu
   -------------------------------------------------------------------------- */
CREATE TABLE kod.TalepTuruUydusu (
    TurKodu  nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UyduKodu nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_TalepTuruUydusu_UyduKodu CHECK (LEN(UyduKodu) >= 2 AND UyduKodu NOT LIKE N'%[^A-Za-z0-9]%'),
    CONSTRAINT PK_kod_TalepTuruUydusu PRIMARY KEY CLUSTERED (TurKodu, UyduKodu),
    CONSTRAINT FK_kod_TalepTuruUydusu_kod_TalepTuru
        FOREIGN KEY (TurKodu) REFERENCES kod.TalepTuru (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepTuruUydusu',
     @Metin = N'Hangi talep türünün hangi ek kayıtları alabileceği: servisZiyareti (servis ziyareti ve hak ediş), faturaBilgisi (fatura bilgisi), bayiAtamasi (bayiye atama). Yeni talep türü (ör. kurulum) bir satırla servis ziyareti ve hak ediş alabilir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepTuruUydusu', @Alt = N'TurKodu',
     @Metin = N'Talep türü (kod.TalepTuru).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TalepTuruUydusu', @Alt = N'UyduKodu',
     @Metin = N'Ek kaydın adı: servisZiyareti (talep.ServisZiyareti), faturaBilgisi (talep.FaturaBilgisi), bayiAtamasi (talep.BayiAtamasi). O tablolardaki sabit UyduKodu değeriyle aynıdır.';
GO

/* --------------------------------------------------------------------------
   kod.Masa
   -------------------------------------------------------------------------- */
CREATE TABLE kod.Masa (
    Kod           nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_Masa_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad            nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira          smallint NOT NULL
        CONSTRAINT DF_kod_Masa_Sira DEFAULT 0,
    Aktif         bit NOT NULL
        CONSTRAINT DF_kod_Masa_Aktif DEFAULT 1,
    Aciklama      nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    TalepTuruKodu nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    CONSTRAINT PK_kod_Masa PRIMARY KEY CLUSTERED (Kod),
    CONSTRAINT FK_kod_Masa_kod_TalepTuru
        FOREIGN KEY (TalepTuruKodu) REFERENCES kod.TalepTuru (Kod)
);
CREATE NONCLUSTERED INDEX IX_kod_Masa_TalepTuruKodu ON kod.Masa (TalepTuruKodu);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Masa',
     @Metin = N'PAKSAN içinde talebin beklediği masa: servisMasasi, parcaMasasi. Bir rol, kendi talep türündeki talepleri ve o türe ait masalardaki talepleri görür. Yeni masa satır eklenerek açılır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Masa', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. servisMasasi). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Masa', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Masa', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Masa', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Masa', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Masa', @Alt = N'TalepTuruKodu',
     @Metin = N'Bu masanın ait olduğu talep türü (kod.TalepTuru). Talep türü bu olan rol, bu masadaki talepleri başka türden olsalar da görür.';
GO

/* --------------------------------------------------------------------------
   kod.Sahip
   -------------------------------------------------------------------------- */
CREATE TABLE kod.Sahip (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_Sahip_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_Sahip_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_Sahip_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_Sahip PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Sahip',
     @Metin = N'Talebin şu anda kimde olduğu: paksan, servis, bayi.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Sahip', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. servis). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Sahip', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Sahip', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Sahip', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Sahip', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.ServisAtamaKaynagi
   -------------------------------------------------------------------------- */
CREATE TABLE kod.ServisAtamaKaynagi (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_ServisAtamaKaynagi_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_ServisAtamaKaynagi_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_ServisAtamaKaynagi_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_ServisAtamaKaynagi PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisAtamaKaynagi',
     @Metin = N'Talebe servisin nasıl bağlandığı: makineAtamasi (makineye atanmış servis), bayiServisi (makineyi satan bayinin servisi), servisElle (talebi servis kendisi açtı).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisAtamaKaynagi', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. makineAtamasi). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisAtamaKaynagi', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisAtamaKaynagi', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisAtamaKaynagi', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisAtamaKaynagi', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.MakineDurumu
   -------------------------------------------------------------------------- */
CREATE TABLE kod.MakineDurumu (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_MakineDurumu_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_MakineDurumu_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_MakineDurumu_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    ArizaMi  bit NOT NULL
        CONSTRAINT DF_kod_MakineDurumu_ArizaMi DEFAULT 0,
    CONSTRAINT PK_kod_MakineDurumu PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'MakineDurumu',
     @Metin = N'Servis talebinde müşterinin seçtiği makine durumu: durdu (hiç çalışmıyor), sorunlu (çalışıyor ama sorun var), kontrol (kontrol edilsin), kurulum (ilk kurulum yapılacak).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'MakineDurumu', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. sorunlu). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'MakineDurumu', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'MakineDurumu', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'MakineDurumu', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'MakineDurumu', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'MakineDurumu', @Alt = N'ArizaMi',
     @Metin = N'1: bu durum bir arızayı anlatır; talep formunda belirti ve açıklama sorulur. 0: arıza değil (kurulum); belirti sorulmaz.';
GO

/* --------------------------------------------------------------------------
   kod.DestekAilesi
   -------------------------------------------------------------------------- */
CREATE TABLE kod.DestekAilesi (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_DestekAilesi_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_DestekAilesi_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_DestekAilesi_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_DestekAilesi PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DestekAilesi',
     @Metin = N'Makine aileleri: balya, rulo, yem, silaj, cayir, toprak, genel. Talep formundaki belirti listesi ve destek konuları aileye göre seçilir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DestekAilesi', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. balya). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DestekAilesi', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DestekAilesi', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DestekAilesi', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DestekAilesi', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.Belirti
   -------------------------------------------------------------------------- */
CREATE TABLE kod.Belirti (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_Belirti_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_Belirti_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_Belirti_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_Belirti PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Belirti',
     @Metin = N'Servis talebinde seçilen arıza belirtileri (ör. dugumAtmiyor, anormalSes, diger). Bir belirtinin hangi marka ve ailede listeleneceği kod.BelirtiKapsami tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Belirti', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. dugumAtmiyor). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Belirti', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Belirti', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Belirti', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Belirti', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.UrunTipi
   -------------------------------------------------------------------------- */
CREATE TABLE kod.UrunTipi (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_UrunTipi_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_UrunTipi_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_UrunTipi_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_UrunTipi PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'UrunTipi',
     @Metin = N'Fiyat teklifi talebinde müşterinin işlediği ürün: yonca, samanBugday, otCayir, misirSilaji, diger.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'UrunTipi', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. yonca). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'UrunTipi', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'UrunTipi', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'UrunTipi', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'UrunTipi', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.Arazi
   -------------------------------------------------------------------------- */
CREATE TABLE kod.Arazi (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_Arazi_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_Arazi_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_Arazi_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_Arazi PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Arazi',
     @Metin = N'Fiyat teklifi talebinde müşterinin arazi büyüklüğü: elliDonumAlti, elliYuzelliDonum, yuzelliBesyuzDonum, besyuzDonumUstu, baskaTarladaCalisiyor.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Arazi', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. elliDonumAlti). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Arazi', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Arazi', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Arazi', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Arazi', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.TraktorGucu
   -------------------------------------------------------------------------- */
CREATE TABLE kod.TraktorGucu (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_TraktorGucu_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_TraktorGucu_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_TraktorGucu_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_TraktorGucu PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TraktorGucu',
     @Metin = N'Fiyat teklifi talebinde müşterinin traktör gücü aralığı: elliBeygirAlti, elliSeksenBeygir, seksenYuzonBeygir, yuzonYuzelliBeygir, yuzelliBeygirUstu, bilmiyor.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TraktorGucu', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. elliSeksenBeygir). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TraktorGucu', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TraktorGucu', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TraktorGucu', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TraktorGucu', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.IptalNedeni
   -------------------------------------------------------------------------- */
CREATE TABLE kod.IptalNedeni (
    Kod             nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_IptalNedeni_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad              nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira            smallint NOT NULL
        CONSTRAINT DF_kod_IptalNedeni_Sira DEFAULT 0,
    Aktif           bit NOT NULL
        CONSTRAINT DF_kod_IptalNedeni_Aktif DEFAULT 1,
    Aciklama        nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    AciklamaZorunlu bit NOT NULL
        CONSTRAINT DF_kod_IptalNedeni_AciklamaZorunlu DEFAULT 0,
    CONSTRAINT PK_kod_IptalNedeni PRIMARY KEY CLUSTERED (Kod),
    CONSTRAINT UQ_kod_IptalNedeni_KodAciklamaZorunlu UNIQUE (Kod, AciklamaZorunlu)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IptalNedeni',
     @Metin = N'Talep iptal nedenleri (ör. musteriVazgecti, musteriyeUlasilamadi, telefondaCozuldu, odemeSuresiDoldu, baskaNeden). Backoffice ve PAKSAN Servisim aynı listeyi kullanır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IptalNedeni', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. musteriVazgecti). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IptalNedeni', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IptalNedeni', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IptalNedeni', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IptalNedeni', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IptalNedeni', @Alt = N'AciklamaZorunlu',
     @Metin = N'1: bu nedenle iptalde açıklama yazmak zorunludur (ör. baskaNeden). İptal satırındaki kopyası bu değere bağlıdır; bu nedene bakan iptal varken değiştirilemez.';
GO

/* --------------------------------------------------------------------------
   kod.TeklifSonucu
   -------------------------------------------------------------------------- */
CREATE TABLE kod.TeklifSonucu (
    Kod          nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_TeklifSonucu_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad           nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira         smallint NOT NULL
        CONSTRAINT DF_kod_TeklifSonucu_Sira DEFAULT 0,
    Aktif        bit NOT NULL
        CONSTRAINT DF_kod_TeklifSonucu_Aktif DEFAULT 1,
    Aciklama     nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    FiyatZorunlu bit NOT NULL
        CONSTRAINT DF_kod_TeklifSonucu_FiyatZorunlu DEFAULT 0,
    CONSTRAINT PK_kod_TeklifSonucu PRIMARY KEY CLUSTERED (Kod),
    CONSTRAINT UQ_kod_TeklifSonucu_KodFiyatZorunlu UNIQUE (Kod, FiyatZorunlu)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TeklifSonucu',
     @Metin = N'Fiyat teklifi talebi kapanırken seçilen sonuç: satisOldu, musteriVazgecti, rakibeGitti, ulasilamadi.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TeklifSonucu', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. satisOldu). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TeklifSonucu', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TeklifSonucu', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TeklifSonucu', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TeklifSonucu', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'TeklifSonucu', @Alt = N'FiyatZorunlu',
     @Metin = N'1: bu sonuçla kapanışta satış fiyatı yazmak zorunludur (satisOldu). Kapanış satırındaki kopyası bu değere bağlıdır; bu sonuca bakan kapanış varken değiştirilemez.';
GO

/* --------------------------------------------------------------------------
   kod.YapilanIs
   -------------------------------------------------------------------------- */
CREATE TABLE kod.YapilanIs (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_YapilanIs_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_YapilanIs_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_YapilanIs_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_YapilanIs PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'YapilanIs',
     @Metin = N'Servisin yaptığı işin türü: ilkKurulum, ayar, bakim, parcaDegisimi, arizaBulunamadi.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'YapilanIs', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. parcaDegisimi). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'YapilanIs', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'YapilanIs', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'YapilanIs', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'YapilanIs', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.ServisKapisi
   -------------------------------------------------------------------------- */
CREATE TABLE kod.ServisKapisi (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_ServisKapisi_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_ServisKapisi_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_ServisKapisi_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    Eski     bit NOT NULL
        CONSTRAINT DF_kod_ServisKapisi_Eski DEFAULT 0,
    CONSTRAINT PK_kod_ServisKapisi PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisKapisi',
     @Metin = N'Servis kaydında işin yürüdüğü yol: garanti (garanti kapsamında; iş bitince hak ediş doğar). eldeParca ve parcaIste (garanti dışı yollar) yalnız eski kayıtlarda bulunur.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisKapisi', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. garanti). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisKapisi', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisKapisi', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisKapisi', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisKapisi', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisKapisi', @Alt = N'Eski',
     @Metin = N'1: yalnız eski kayıtlarda bulunur; yeni servis kaydında seçilmez. 0: güncel seçenek.';
GO

/* --------------------------------------------------------------------------
   kod.ZiyaretAsamasi
   -------------------------------------------------------------------------- */
CREATE TABLE kod.ZiyaretAsamasi (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_ZiyaretAsamasi_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_ZiyaretAsamasi_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_ZiyaretAsamasi_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_ZiyaretAsamasi PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ZiyaretAsamasi',
     @Metin = N'Servis ziyaretinin aşaması: parca (parça istendi, iş bitmedi; yol ve işçilik yazılmadı), bitti (iş bitti; yapılan iş, yol ve işçilik yazılı), yarimKaldi (parça aşamasındaki ziyaret iş bitmeden kapandı: talep iptal edildi ya da parça takılmadan kapandı; talep yeniden açılırsa yeni parça isteğine yer açar).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ZiyaretAsamasi', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. bitti). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ZiyaretAsamasi', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ZiyaretAsamasi', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ZiyaretAsamasi', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ZiyaretAsamasi', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.UcretDurumu
   -------------------------------------------------------------------------- */
CREATE TABLE kod.UcretDurumu (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_UcretDurumu_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_UcretDurumu_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_UcretDurumu_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_UcretDurumu PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'UcretDurumu',
     @Metin = N'Servis kapanışında ücretin durumu: garanti (garanti kapsamında, müşteri ödemedi), musteriOdedi.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'UcretDurumu', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. garanti). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'UcretDurumu', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'UcretDurumu', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'UcretDurumu', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'UcretDurumu', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.KapanisTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.KapanisTuru (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_KapanisTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_KapanisTuru_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_KapanisTuru_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_KapanisTuru PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KapanisTuru',
     @Metin = N'Talebin nasıl kapandığı: personelFormu (backoffice kapanış formu), servisKaydi, garantiDisi, parcaTakildi, bayiAtamasi, hakEdisOnayi, hakEdisReddi.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KapanisTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. servisKaydi). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KapanisTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KapanisTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KapanisTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KapanisTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.FaturaTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.FaturaTuru (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_FaturaTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_FaturaTuru_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_FaturaTuru_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_FaturaTuru PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'FaturaTuru',
     @Metin = N'Yedek parça faturasının kimin adına kesileceği: kendisi, baskaKisi, firma.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'FaturaTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. kendisi). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'FaturaTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'FaturaTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'FaturaTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'FaturaTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.OdemeYontemi
   -------------------------------------------------------------------------- */
CREATE TABLE kod.OdemeYontemi (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_OdemeYontemi_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_OdemeYontemi_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_OdemeYontemi_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_OdemeYontemi PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'OdemeYontemi',
     @Metin = N'Yedek parça talebinin ödeme yolu: havale, bakiye (servisin PAKSAN''daki hesabından), fatura.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'OdemeYontemi', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. havale). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'OdemeYontemi', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'OdemeYontemi', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'OdemeYontemi', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'OdemeYontemi', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.HakEdisDurumu
   -------------------------------------------------------------------------- */
CREATE TABLE kod.HakEdisDurumu (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_HakEdisDurumu_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_HakEdisDurumu_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_HakEdisDurumu_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_HakEdisDurumu PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HakEdisDurumu',
     @Metin = N'Hak edişin durumu: bekliyor (PAKSAN onayı bekliyor), onaylandi, reddedildi.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HakEdisDurumu', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. bekliyor). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HakEdisDurumu', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HakEdisDurumu', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HakEdisDurumu', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HakEdisDurumu', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.Birim
   -------------------------------------------------------------------------- */
CREATE TABLE kod.Birim (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_Birim_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_Birim_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_Birim_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_Birim PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Birim',
     @Metin = N'Hak ediş tarifesi ve kalemlerinin ölçü birimi: km, adet, saat, sabit.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Birim', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. km). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Birim', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Birim', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Birim', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Birim', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.HakEdisKalemTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.HakEdisKalemTuru (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_HakEdisKalemTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_HakEdisKalemTuru_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_HakEdisKalemTuru_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_HakEdisKalemTuru PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HakEdisKalemTuru',
     @Metin = N'Hak ediş kalemlerinin türü: yol, iscilik, diger. Yeni kalem (ör. konaklama) satır eklenerek tanımlanır. Sira, kalemlerin hak ediş dökümündeki sırasıdır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HakEdisKalemTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. yol). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HakEdisKalemTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HakEdisKalemTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HakEdisKalemTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HakEdisKalemTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.HesapHareketTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.HesapHareketTuru (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_HesapHareketTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_HesapHareketTuru_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_HesapHareketTuru_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    YonKodu  nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_HesapHareketTuru_YonKodu CHECK (YonKodu IN (N'alacak', N'borc')),
    CONSTRAINT PK_kod_HesapHareketTuru PRIMARY KEY CLUSTERED (Kod),
    CONSTRAINT UQ_kod_HesapHareketTuru_KodYonKodu UNIQUE (Kod, YonKodu)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HesapHareketTuru',
     @Metin = N'Servisin hesap hareketi türleri: hakEdisAlacagi, parcaSiparisiBorcu, odeme, duzeltmeAlacak, duzeltmeBorc (yanlış hareketi geri alan ters kayıtlar).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HesapHareketTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. hakEdisAlacagi). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HesapHareketTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HesapHareketTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HesapHareketTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HesapHareketTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HesapHareketTuru', @Alt = N'YonKodu',
     @Metin = N'Hareketin servis açısından yönü: alacak (servisin PAKSAN''dan alacağı artar) ya da borc. Hareket satırındaki kopyası bu değere bağlıdır; bu türe bakan hareket varken değiştirilemez.';
GO

/* --------------------------------------------------------------------------
   kod.DonemDokumuDurumu
   -------------------------------------------------------------------------- */
CREATE TABLE kod.DonemDokumuDurumu (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_DonemDokumuDurumu_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_DonemDokumuDurumu_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_DonemDokumuDurumu_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_DonemDokumuDurumu PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DonemDokumuDurumu',
     @Metin = N'Aylık hak ediş dökümünün durumu: taslak, kesinlesti, faturaGeldi, odendi, iptal.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DonemDokumuDurumu', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. taslak). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DonemDokumuDurumu', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DonemDokumuDurumu', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DonemDokumuDurumu', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DonemDokumuDurumu', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.HedefKitle
   -------------------------------------------------------------------------- */
CREATE TABLE kod.HedefKitle (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_HedefKitle_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_HedefKitle_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_HedefKitle_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_HedefKitle PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HedefKitle',
     @Metin = N'Duyurunun kime gideceği: musteri, servis, ikisi.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HedefKitle', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. musteri). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HedefKitle', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HedefKitle', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HedefKitle', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'HedefKitle', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.DuyuruTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.DuyuruTuru (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_DuyuruTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_DuyuruTuru_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_DuyuruTuru_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_DuyuruTuru PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DuyuruTuru',
     @Metin = N'Duyurunun hukuki sınıfı: duyuru (ticari elektronik ileti; müşteri tarafında yalnız izin verenlere gider), uyari (hizmete ilişkin bildirim; izin aranmaz).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DuyuruTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. duyuru). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DuyuruTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DuyuruTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DuyuruTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DuyuruTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.DuyuruAltTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.DuyuruAltTuru (
    Kod                      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_DuyuruAltTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad                       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira                     smallint NOT NULL
        CONSTRAINT DF_kod_DuyuruAltTuru_Sira DEFAULT 0,
    Aktif                    bit NOT NULL
        CONSTRAINT DF_kod_DuyuruAltTuru_Aktif DEFAULT 1,
    Aciklama                 nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    UstTurKodu               nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    VarsayilanHedefKitleKodu nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    KilitliHedefKitleKodu    nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    Ton                      nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    Ikon                     nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    CONSTRAINT PK_kod_DuyuruAltTuru PRIMARY KEY CLUSTERED (Kod),
    CONSTRAINT UQ_kod_DuyuruAltTuru_KodUstTurKodu UNIQUE (Kod, UstTurKodu),
    CONSTRAINT FK_kod_DuyuruAltTuru_kod_DuyuruTuru
        FOREIGN KEY (UstTurKodu) REFERENCES kod.DuyuruTuru (Kod),
    CONSTRAINT FK_kod_DuyuruAltTuru_kod_HedefKitle_Varsayilan
        FOREIGN KEY (VarsayilanHedefKitleKodu) REFERENCES kod.HedefKitle (Kod),
    CONSTRAINT FK_kod_DuyuruAltTuru_kod_HedefKitle_Kilitli
        FOREIGN KEY (KilitliHedefKitleKodu) REFERENCES kod.HedefKitle (Kod),
    CONSTRAINT CK_kod_DuyuruAltTuru_KilitliHedefKitle CHECK (KilitliHedefKitleKodu IS NULL OR KilitliHedefKitleKodu = VarsayilanHedefKitleKodu)
);
CREATE NONCLUSTERED INDEX IX_kod_DuyuruAltTuru_UstTurKodu ON kod.DuyuruAltTuru (UstTurKodu);
CREATE NONCLUSTERED INDEX IX_kod_DuyuruAltTuru_VarsayilanHedefKitleKodu ON kod.DuyuruAltTuru (VarsayilanHedefKitleKodu);
CREATE NONCLUSTERED INDEX IX_kod_DuyuruAltTuru_KilitliHedefKitleKodu ON kod.DuyuruAltTuru (KilitliHedefKitleKodu);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DuyuruAltTuru',
     @Metin = N'Duyurunun ekrandaki türü: kampanya, yeniUrun, etkinlik, guvenlik, geriCagirma. Kartın rengini, ikonunu ve varsayılan alıcı kitlesini belirler; hukuki sınıfı üst türünden gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DuyuruAltTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. kampanya). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DuyuruAltTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DuyuruAltTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DuyuruAltTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DuyuruAltTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DuyuruAltTuru', @Alt = N'UstTurKodu',
     @Metin = N'Alt türün bağlı olduğu hukuki sınıf (kod.DuyuruTuru).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DuyuruAltTuru', @Alt = N'VarsayilanHedefKitleKodu',
     @Metin = N'Duyuru formunda önceden seçili gelen alıcı kitlesi (kod.HedefKitle).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DuyuruAltTuru', @Alt = N'KilitliHedefKitleKodu',
     @Metin = N'Doluysa alıcı kitlesi değiştirilemez ve bu değer kullanılır (geriCagirma yalnız servise gider). Boş: seçim serbest.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DuyuruAltTuru', @Alt = N'Ton',
     @Metin = N'Duyuru kartının renk teması adı (üç üründe aynı ad kullanılır).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DuyuruAltTuru', @Alt = N'Ikon',
     @Metin = N'Duyuru kartında gösterilen ikonun adı (ör. etiket, makine, takvim).';
GO

/* --------------------------------------------------------------------------
   kod.BildirimTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.BildirimTuru (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_BildirimTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_BildirimTuru_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_BildirimTuru_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_BildirimTuru PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BildirimTuru',
     @Metin = N'Kişisel bildirimin türü: talep, numara, gorus, randevu.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BildirimTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. talep). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BildirimTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BildirimTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BildirimTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BildirimTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.AliciTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.AliciTuru (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_AliciTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_AliciTuru_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_AliciTuru_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_AliciTuru PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'AliciTuru',
     @Metin = N'Bildirimin alıcı türü: musteri, servis, personel. Yeni alıcı türü (ör. bayi) satır eklenerek tanımlanır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'AliciTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. musteri). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'AliciTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'AliciTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'AliciTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'AliciTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.KararDurumu
   -------------------------------------------------------------------------- */
CREATE TABLE kod.KararDurumu (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_KararDurumu_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_KararDurumu_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_KararDurumu_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_KararDurumu PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KararDurumu',
     @Metin = N'Karar bekleyen isteklerin durumu: bekliyor, onaylandi, reddedildi (numara değişikliği talebi, makine satışının doğrulanması).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KararDurumu', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. bekliyor). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KararDurumu', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KararDurumu', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KararDurumu', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KararDurumu', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.DestekOlayTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.DestekOlayTuru (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_DestekOlayTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_DestekOlayTuru_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_DestekOlayTuru_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_DestekOlayTuru PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DestekOlayTuru',
     @Metin = N'Destek sohbetindeki olay türleri: konu, soru, serbest, cevap, cevapsiz, cozulmedi, yonlendirme, temizlendi. Sohbetin metni saklanmaz; yalnız olaylar kaydedilir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DestekOlayTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. soru). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DestekOlayTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DestekOlayTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DestekOlayTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DestekOlayTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.DosyaTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.DosyaTuru (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_DosyaTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_DosyaTuru_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_DosyaTuru_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_DosyaTuru PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DosyaTuru',
     @Metin = N'Yüklenen dosyanın türü: foto, video, ses, pdf, belge.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DosyaTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. foto). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DosyaTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DosyaTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DosyaTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'DosyaTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.ServisTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.ServisTuru (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_ServisTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_ServisTuru_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_ServisTuru_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_ServisTuru PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisTuru',
     @Metin = N'Servis firmasının türü: sahis (şahıs firması), tuzel (şirket).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. sahis). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'ServisTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.FirmaDurumu
   -------------------------------------------------------------------------- */
CREATE TABLE kod.FirmaDurumu (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_FirmaDurumu_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_FirmaDurumu_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_FirmaDurumu_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_FirmaDurumu PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'FirmaDurumu',
     @Metin = N'Servis ve bayi firmalarının durumu: aktif, pasif. LOGO cari kodunun eksik olup olmadığı durumdan değil, cari kart kayıtlarından anlaşılır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'FirmaDurumu', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. aktif). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'FirmaDurumu', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'FirmaDurumu', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'FirmaDurumu', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'FirmaDurumu', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.KisiRolu
   -------------------------------------------------------------------------- */
CREATE TABLE kod.KisiRolu (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_KisiRolu_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_KisiRolu_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_KisiRolu_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_KisiRolu PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KisiRolu',
     @Metin = N'Müşteri hesabındaki kişinin rolü: hesapSahibi, yetkili. Yeni rol (ör. muhasebeci) satır eklenerek tanımlanır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KisiRolu', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. hesapSahibi). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KisiRolu', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KisiRolu', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KisiRolu', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KisiRolu', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.SahiplikBitisNedeni
   -------------------------------------------------------------------------- */
CREATE TABLE kod.SahiplikBitisNedeni (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_SahiplikBitisNedeni_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_SahiplikBitisNedeni_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_SahiplikBitisNedeni_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_SahiplikBitisNedeni PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'SahiplikBitisNedeni',
     @Metin = N'Makine sahipliğinin neden bittiği: musteriKaldirdi, devir, personel, anonimlestirme, birlestirme (hesaplar birleştirildi).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'SahiplikBitisNedeni', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. devir). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'SahiplikBitisNedeni', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'SahiplikBitisNedeni', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'SahiplikBitisNedeni', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'SahiplikBitisNedeni', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.RizaMetni
   -------------------------------------------------------------------------- */
CREATE TABLE kod.RizaMetni (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_RizaMetni_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_RizaMetni_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_RizaMetni_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_RizaMetni PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'RizaMetni',
     @Metin = N'KVKK ve izin metinleri: aydinlatma (aydınlatma metni), acikRiza (açık rıza), ticariIleti (ticari elektronik ileti izni).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'RizaMetni', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. aydinlatma). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'RizaMetni', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'RizaMetni', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'RizaMetni', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'RizaMetni', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.RizaSecimi
   -------------------------------------------------------------------------- */
CREATE TABLE kod.RizaSecimi (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_RizaSecimi_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_RizaSecimi_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_RizaSecimi_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_RizaSecimi PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'RizaSecimi',
     @Metin = N'Müşterinin metne verdiği cevap: okundu, onay, ret, geriCekme.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'RizaSecimi', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. onay). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'RizaSecimi', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'RizaSecimi', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'RizaSecimi', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'RizaSecimi', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.RizaKanali
   -------------------------------------------------------------------------- */
CREATE TABLE kod.RizaKanali (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_RizaKanali_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_RizaKanali_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_RizaKanali_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_RizaKanali PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'RizaKanali',
     @Metin = N'Rızanın alındığı yer: connectKayit (uygulamada kayıt), connectProfil (uygulamada profil), personel, telefon, yazili.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'RizaKanali', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. connectKayit). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'RizaKanali', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'RizaKanali', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'RizaKanali', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'RizaKanali', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.BildirimIzni
   -------------------------------------------------------------------------- */
CREATE TABLE kod.BildirimIzni (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_BildirimIzni_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_BildirimIzni_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_BildirimIzni_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_BildirimIzni PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BildirimIzni',
     @Metin = N'Cihazın bildirim izni durumu: verildi, reddedildi, sorulmadi, desteklenmiyor, engelli (telefon ya da tarayıcı izin penceresini artık açmıyor; izin ayarlardan açılmalı).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BildirimIzni', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. verildi). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BildirimIzni', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BildirimIzni', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BildirimIzni', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BildirimIzni', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.BelgeTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.BelgeTuru (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_BelgeTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_BelgeTuru_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_BelgeTuru_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_BelgeTuru PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BelgeTuru',
     @Metin = N'Dış sistemdeki (LOGO) belge türleri: satisFaturasi, alisFaturasi, giderPusulasi, irsaliye, siparisFisi, tahsilatFisi, bankaFisi, garantiBedelsizCikis, satisIadeFaturasi. Belgenin ne olduğu bağlandığı kayıttan değil, buradan okunur.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BelgeTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. satisFaturasi). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BelgeTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BelgeTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BelgeTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'BelgeTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.SatisTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.SatisTuru (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_SatisTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_SatisTuru_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_SatisTuru_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_SatisTuru PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'SatisTuru',
     @Metin = N'Makine satışının türü: paksanBayiye, bayiCiftciye, dogrudanCiftciye, ikinciEl.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'SatisTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. paksanBayiye). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'SatisTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'SatisTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'SatisTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'SatisTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.GarantiDayanagi
   -------------------------------------------------------------------------- */
CREATE TABLE kod.GarantiDayanagi (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_GarantiDayanagi_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_GarantiDayanagi_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_GarantiDayanagi_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_GarantiDayanagi PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'GarantiDayanagi',
     @Metin = N'Garanti başlangıç tarihinin neye dayandığı: teslimOnayli (doğrulanmış teslim tarihi), faturaArtiSure (bayi faturası tarihi + ek gün; doğrulanmadı), uretimYili (seri numarasındaki üretim yılı; doğrulanmadı), bilinmiyor.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'GarantiDayanagi', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. teslimOnayli). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'GarantiDayanagi', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'GarantiDayanagi', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'GarantiDayanagi', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'GarantiDayanagi', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.GarantiBaslangicEsasi
   -------------------------------------------------------------------------- */
CREATE TABLE kod.GarantiBaslangicEsasi (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_GarantiBaslangicEsasi_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_GarantiBaslangicEsasi_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_GarantiBaslangicEsasi_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_GarantiBaslangicEsasi PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'GarantiBaslangicEsasi',
     @Metin = N'Markanın garanti süresinin hangi tarihten başladığı kuralı: teslim, fatura, uretim.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'GarantiBaslangicEsasi', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. teslim). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'GarantiBaslangicEsasi', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'GarantiBaslangicEsasi', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'GarantiBaslangicEsasi', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'GarantiBaslangicEsasi', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.SeriKurali
   -------------------------------------------------------------------------- */
CREATE TABLE kod.SeriKurali (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_SeriKurali_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_SeriKurali_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_SeriKurali_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_SeriKurali PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'SeriKurali',
     @Metin = N'Seri numarası biçim kuralları (onekYilSira: önek + yıl + sıra). Farklı kuralı olan yeni marka için satır eklenir; kuralı çözen uygulama kodudur.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'SeriKurali', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. onekYilSira). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'SeriKurali', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'SeriKurali', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'SeriKurali', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'SeriKurali', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.KargoFirmasi
   -------------------------------------------------------------------------- */
CREATE TABLE kod.KargoFirmasi (
    Kod           nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_KargoFirmasi_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad            nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira          smallint NOT NULL
        CONSTRAINT DF_kod_KargoFirmasi_Sira DEFAULT 0,
    Aktif         bit NOT NULL
        CONSTRAINT DF_kod_KargoFirmasi_Aktif DEFAULT 1,
    Aciklama      nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    DisSistemKodu nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    CONSTRAINT PK_kod_KargoFirmasi PRIMARY KEY CLUSTERED (Kod),
    CONSTRAINT FK_kod_KargoFirmasi_kod_DisSistem
        FOREIGN KEY (DisSistemKodu) REFERENCES kod.DisSistem (Kod)
);
CREATE NONCLUSTERED INDEX IX_kod_KargoFirmasi_DisSistemKodu ON kod.KargoFirmasi (DisSistemKodu);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KargoFirmasi',
     @Metin = N'Yedek parça sevkinde seçilen kargo firmaları. Liste bugün boştur; kargo firmasının adı sevk kaydına serbest metin olarak yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KargoFirmasi', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. anlasmaliKargo). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KargoFirmasi', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KargoFirmasi', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KargoFirmasi', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KargoFirmasi', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KargoFirmasi', @Alt = N'DisSistemKodu',
     @Metin = N'Kargo takip bilgisi bir dış sistemden alınıyorsa o sistemin kodu (kod.DisSistem). Boş: bağlantı yok.';
GO

/* --------------------------------------------------------------------------
   kod.KvkkBasvuruTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.KvkkBasvuruTuru (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_KvkkBasvuruTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_KvkkBasvuruTuru_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_KvkkBasvuruTuru_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_KvkkBasvuruTuru PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KvkkBasvuruTuru',
     @Metin = N'KVKK başvuru türü: silme, erisim, duzeltme, itiraz.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KvkkBasvuruTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. silme). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KvkkBasvuruTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KvkkBasvuruTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KvkkBasvuruTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'KvkkBasvuruTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.IceAktarimTuru
   -------------------------------------------------------------------------- */
CREATE TABLE kod.IceAktarimTuru (
    Kod      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_IceAktarimTuru_Kod CHECK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%'),
    Ad       nvarchar(150) COLLATE Turkish_100_CI_AS NOT NULL,
    Sira     smallint NOT NULL
        CONSTRAINT DF_kod_IceAktarimTuru_Sira DEFAULT 0,
    Aktif    bit NOT NULL
        CONSTRAINT DF_kod_IceAktarimTuru_Aktif DEFAULT 1,
    Aciklama nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_IceAktarimTuru PRIMARY KEY CLUSTERED (Kod)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IceAktarimTuru',
     @Metin = N'Backoffice''te içe aktarılan Excel dosyasının türü: logoCariListesi, logoMalzemeListesi, logoSatisFaturalari, logoServisFaturalari, logoBankaFisleri, servisListesi, bayiListesi, personelListesi. Fiyat listesi içe aktarılmaz; depodaki tohumdan gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IceAktarimTuru', @Alt = N'Kod',
     @Metin = N'Uygulamanın ve bu listeye bağlı tabloların sakladığı kod (ör. logoCariListesi). Yalnız İngilizce harf ve rakam, en az 2 karakter. Bu koda bağlı kayıt varken değiştirilemez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IceAktarimTuru', @Alt = N'Ad',
     @Metin = N'Ekranda görünen Türkçe adı. Başka dillerdeki karşılığı kod.Ceviri tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IceAktarimTuru', @Alt = N'Sira',
     @Metin = N'Listelerde gösterim sırası; küçük sayı önce gelir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IceAktarimTuru', @Alt = N'Aktif',
     @Metin = N'1: yeni kayıtta seçilebilir. 0: artık kullanılmıyor; eski kayıtlarda görünmeye devam eder. Satır silinmez.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'IceAktarimTuru', @Alt = N'Aciklama',
     @Metin = N'Bu seçeneğin ne zaman kullanıldığını anlatan iç not; ekranda görünmez.';
GO

/* --------------------------------------------------------------------------
   kod.Ceviri
   -------------------------------------------------------------------------- */
CREATE TABLE kod.Ceviri (
    ListeAdi nvarchar(128) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_Ceviri_ListeAdi CHECK (ListeAdi LIKE N'[a-z]%.[A-Z]%' AND ListeAdi NOT LIKE N'%[^A-Za-z0-9.]%' AND ListeAdi NOT LIKE N'%.%.%'),
    Kod      nvarchar(60) COLLATE Latin1_General_100_BIN2 NOT NULL,
    AlanAdi  nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT DF_kod_Ceviri_AlanAdi DEFAULT N'Ad'
        CONSTRAINT CK_kod_Ceviri_AlanAdi CHECK (LEN(AlanAdi) >= 2 AND AlanAdi NOT LIKE N'%[^A-Za-z0-9]%'),
    DilKodu  nvarchar(5) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_Ceviri_DilKodu CHECK (DilKodu <> N'tr'),
    Metin    nvarchar(1000) COLLATE Latin1_General_100_CI_AS NOT NULL
        CONSTRAINT CK_kod_Ceviri_Metin CHECK (LEN(Metin) > 0),
    CONSTRAINT PK_kod_Ceviri PRIMARY KEY CLUSTERED (ListeAdi, Kod, AlanAdi, DilKodu),
    CONSTRAINT FK_kod_Ceviri_kod_Dil
        FOREIGN KEY (DilKodu) REFERENCES kod.Dil (Kod)
);
CREATE NONCLUSTERED INDEX IX_kod_Ceviri_DilKodu ON kod.Ceviri (DilKodu);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Ceviri',
     @Metin = N'Kod listelerinin, ülke adlarının ve ürün kategorilerinin Türkçe dışındaki dillerde karşılıkları. Türkçe metin satırın kendi tablosundadır; burada tr satırı olmaz. Yeni dil için kod.Dil''e satır, buraya çeviri satırları eklenir.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Ceviri', @Alt = N'ListeAdi',
     @Metin = N'Çevrilen satırın tablosu, <şema>.<Tablo> biçiminde (ör. kod.TalepDurumu, cografya.Ulke, katalog.Kategori).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Ceviri', @Alt = N'Kod',
     @Metin = N'Çevrilen satırın o tablodaki kodu (ör. parcaBekliyor).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Ceviri', @Alt = N'AlanAdi',
     @Metin = N'Çevrilen kolonun adı; çoğunlukla Ad (katalog.Kategori için KisaAd de olabilir).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Ceviri', @Alt = N'DilKodu',
     @Metin = N'Çevirinin dili (kod.Dil; ör. en). tr olamaz.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'Ceviri', @Alt = N'Metin',
     @Metin = N'O dildeki metin.';
GO

/* --------------------------------------------------------------------------
   kod.EskiDegerEslesmesi
   -------------------------------------------------------------------------- */
CREATE TABLE kod.EskiDegerEslesmesi (
    ListeAdi    nvarchar(128) COLLATE Latin1_General_100_BIN2 NOT NULL
        CONSTRAINT CK_kod_EskiDegerEslesmesi_ListeAdi CHECK (ListeAdi LIKE N'[a-z]%.[A-Z]%' AND ListeAdi NOT LIKE N'%[^A-Za-z0-9.]%' AND ListeAdi NOT LIKE N'%.%.%'),
    EskiDeger   nvarchar(200) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YeniKod     nvarchar(60) COLLATE Latin1_General_100_BIN2 NOT NULL,
    EslesmeNotu nvarchar(400) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_kod_EskiDegerEslesmesi PRIMARY KEY CLUSTERED (ListeAdi, EskiDeger)
);
GO
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'EskiDegerEslesmesi',
     @Metin = N'Eski uygulama verisindeki değerlerin bugünkü kodlardaki karşılığı: ekran yazısıyla saklanmış değerler ("Fark etmez", "Ayar Yapıldı") ve eski kodlar (gonderildi → kapandi, app → connect, TL → TRY). Eski verinin taşınmasında ve okunmasında kullanılır.';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'EskiDegerEslesmesi', @Alt = N'ListeAdi',
     @Metin = N'Karşılığın geçerli olduğu tablo, <şema>.<Tablo> biçiminde (ör. kod.TalepDurumu).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'EskiDegerEslesmesi', @Alt = N'EskiDeger',
     @Metin = N'Eski veride yazdığı gibi değer; büyük/küçük harf ve Türkçe harfler korunur (ör. Fark etmez, gonderildi).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'EskiDegerEslesmesi', @Alt = N'YeniKod',
     @Metin = N'Bugünkü kod (ListeAdi tablosundaki Kod).';
EXEC dbo.AciklamaYaz @Sema = N'kod', @Nesne = N'EskiDegerEslesmesi', @Alt = N'EslesmeNotu',
     @Metin = N'Eşleşmenin gerekçesi ya da notu.';
GO
