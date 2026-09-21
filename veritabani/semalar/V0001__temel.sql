/* ==========================================================================
   V0001 — Şemalar ve açıklama yazma prosedürü

   İçerik (tasarim.md Bölüm 6.2):
     1. sistem dışındaki 23 şema, hepsi AUTHORIZATION dbo (sistem K02'de)
     2. dbo.AciklamaYaz — her nesneye MS_Description yazan prosedür
     3. Şema açıklamaları (dbo ve sistem dahil)
     4. K02'nin açtığı nesnelerin açıklamaları (dbo.SemaGecmisi,
        sistem.Ortam, TR_sistem_Ortam_Koruma): K02 çalışırken
        dbo.AciklamaYaz henüz yoktur.

   Araç bu betiği tek işlem içinde, sahip girişiyle (dbo) bir kez uygular.
   Uygulandıktan sonra değiştirilmez; değişiklik yeni V betiğiyle yapılır.
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. Şemalar (tasarim.md Bölüm 1.2 sırasıyla)
   -------------------------------------------------------------------------- */
CREATE SCHEMA musteri AUTHORIZATION dbo;
GO
CREATE SCHEMA makine AUTHORIZATION dbo;
GO
CREATE SCHEMA talep AUTHORIZATION dbo;
GO
CREATE SCHEMA servis AUTHORIZATION dbo;
GO
CREATE SCHEMA bayi AUTHORIZATION dbo;
GO
CREATE SCHEMA hakedis AUTHORIZATION dbo;
GO
CREATE SCHEMA katalog AUTHORIZATION dbo;
GO
CREATE SCHEMA personel AUTHORIZATION dbo;
GO
CREATE SCHEMA erisim AUTHORIZATION dbo;
GO
CREATE SCHEMA duyuru AUTHORIZATION dbo;
GO
CREATE SCHEMA bildirim AUTHORIZATION dbo;
GO
CREATE SCHEMA destek AUTHORIZATION dbo;
GO
CREATE SCHEMA kvkk AUTHORIZATION dbo;
GO
CREATE SCHEMA dosya AUTHORIZATION dbo;
GO
CREATE SCHEMA denetim AUTHORIZATION dbo;
GO
CREATE SCHEMA entegrasyon AUTHORIZATION dbo;
GO
CREATE SCHEMA kod AUTHORIZATION dbo;
GO
CREATE SCHEMA cografya AUTHORIZATION dbo;
GO
CREATE SCHEMA sirket AUTHORIZATION dbo;
GO
CREATE SCHEMA gorunum AUTHORIZATION dbo;
GO
CREATE SCHEMA yardim AUTHORIZATION dbo;
GO
CREATE SCHEMA yonetim AUTHORIZATION dbo;
GO
CREATE SCHEMA gecmis AUTHORIZATION dbo;
GO

/* --------------------------------------------------------------------------
   2. dbo.AciklamaYaz

   Bir nesnenin MS_Description genişletilmiş özelliğini yazar: yoksa
   ekler, varsa günceller. Bütün V ve R betikleri açıklamalarını bununla
   yazar; `npm run vt -- sozluk` bu açıklamalardan VERITABANI.md'yi üretir.

     @Nesne NULL              → şemanın açıklaması
     @Nesne dolu, @Alt NULL   → tablo, görünüm, prosedür ya da işlevin açıklaması
     @Alt dolu                → @AltTuru: COLUMN (varsayılan), PARAMETER
                                (adı @ ile), TRIGGER, CONSTRAINT, INDEX

   Hata 50002: açıklama boş, şema ya da nesne yok, alt tür geçersiz.
   -------------------------------------------------------------------------- */
CREATE PROCEDURE dbo.AciklamaYaz
    @Sema    sysname,
    @Nesne   sysname        = NULL,
    @Alt     sysname        = NULL,
    @AltTuru nvarchar(20)   = N'COLUMN',
    @Metin   nvarchar(3750)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @NesneTuru  nvarchar(2)  = NULL;
    DECLARE @BirinciTur nvarchar(20) = NULL;
    DECLARE @IkinciTur  nvarchar(20) = NULL;

    IF @Metin IS NULL OR LEN(LTRIM(RTRIM(@Metin))) = 0
        THROW 50002, N'açıklama metni boş olamaz; açıklamayı yazıp yeniden deneyin', 1;

    IF SCHEMA_ID(@Sema) IS NULL
        THROW 50002, N'açıklaması yazılacak şema bulunamadı; şema adını kontrol edip yeniden deneyin', 1;

    IF @Nesne IS NULL
    BEGIN
        IF @Alt IS NOT NULL
            THROW 50002, N'alt nesnenin açıklamasını yazmak için bağlı olduğu nesnenin adını da belirtin', 1;
    END
    ELSE
    BEGIN
        SELECT @NesneTuru = o.type
        FROM sys.objects AS o
        WHERE o.schema_id = SCHEMA_ID(@Sema)
          AND o.name = @Nesne
          AND o.parent_object_id = 0;

        SET @BirinciTur = CASE RTRIM(@NesneTuru)
                              WHEN N'U'  THEN N'TABLE'
                              WHEN N'V'  THEN N'VIEW'
                              WHEN N'P'  THEN N'PROCEDURE'
                              WHEN N'FN' THEN N'FUNCTION'
                              WHEN N'IF' THEN N'FUNCTION'
                              WHEN N'TF' THEN N'FUNCTION'
                          END;

        IF @BirinciTur IS NULL
            THROW 50002, N'açıklaması yazılacak nesne bulunamadı ya da bu nesne türüne açıklama yazılamaz; nesne adını ve türünü kontrol edin', 1;

        IF @Alt IS NOT NULL
        BEGIN
            SET @IkinciTur = UPPER(@AltTuru COLLATE Latin1_General_100_BIN2);

            IF @IkinciTur IS NULL
               OR @IkinciTur NOT IN (N'COLUMN', N'PARAMETER', N'TRIGGER', N'CONSTRAINT', N'INDEX')
                THROW 50002, N'alt tür olarak COLUMN, PARAMETER, TRIGGER, CONSTRAINT ya da INDEX belirtin', 1;
        END;
    END;

    IF EXISTS (SELECT 1
               FROM sys.fn_listextendedproperty(N'MS_Description',
                                                N'SCHEMA', @Sema,
                                                @BirinciTur, @Nesne,
                                                @IkinciTur, @Alt))
        EXEC sys.sp_updateextendedproperty
             @name       = N'MS_Description',
             @value      = @Metin,
             @level0type = N'SCHEMA',    @level0name = @Sema,
             @level1type = @BirinciTur,  @level1name = @Nesne,
             @level2type = @IkinciTur,   @level2name = @Alt;
    ELSE
        EXEC sys.sp_addextendedproperty
             @name       = N'MS_Description',
             @value      = @Metin,
             @level0type = N'SCHEMA',    @level0name = @Sema,
             @level1type = @BirinciTur,  @level1name = @Nesne,
             @level2type = @IkinciTur,   @level2name = @Alt;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'dbo', @Nesne = N'AciklamaYaz',
     @Metin = N'Veritabanındaki bir nesneye açıklama yazar ya da var olan açıklamayı günceller. SSMS''te nesnenin Özellikler penceresinde ve veri sözlüğünde (VERITABANI.md) görünen metin budur. Kurulum betikleri kullanır; elle çalıştırmak gerekmez.';
EXEC dbo.AciklamaYaz @Sema = N'dbo', @Nesne = N'AciklamaYaz', @Alt = N'@Sema', @AltTuru = N'PARAMETER',
     @Metin = N'Nesnenin şeması (ör. talep). Yalnız bu verilirse şemanın açıklaması yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'dbo', @Nesne = N'AciklamaYaz', @Alt = N'@Nesne', @AltTuru = N'PARAMETER',
     @Metin = N'Tablo, görünüm, prosedür ya da işlevin adı (ör. Talep). Boş bırakılırsa şemanın açıklaması yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'dbo', @Nesne = N'AciklamaYaz', @Alt = N'@Alt', @AltTuru = N'PARAMETER',
     @Metin = N'Nesnenin içindeki kolon, parametre (@ ile), tetikleyici, kısıt ya da dizinin adı. Boş bırakılırsa nesnenin kendi açıklaması yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'dbo', @Nesne = N'AciklamaYaz', @Alt = N'@AltTuru', @AltTuru = N'PARAMETER',
     @Metin = N'@Alt''ın türü: COLUMN (varsayılan), PARAMETER, TRIGGER, CONSTRAINT ya da INDEX.';
EXEC dbo.AciklamaYaz @Sema = N'dbo', @Nesne = N'AciklamaYaz', @Alt = N'@Metin', @AltTuru = N'PARAMETER',
     @Metin = N'Yazılacak Türkçe açıklama; boş olamaz.';
GO

/* --------------------------------------------------------------------------
   3. Şema açıklamaları
   -------------------------------------------------------------------------- */
EXEC dbo.AciklamaYaz @Sema = N'dbo',
     @Metin = N'Yalnız kurulum aracının nesneleri: uygulanan betiklerin kaydı (SemaGecmisi) ve açıklama yazma prosedürü (AciklamaYaz). İş verisi bu şemada durmaz.';
EXEC dbo.AciklamaYaz @Sema = N'sistem',
     @Metin = N'Uygulamanın altyapı kayıtları: ortam işareti, ayarlar, okunur numaraların önek ve sayaçları, gönderilecek mesaj kuyruğu, tekrar koruması, saklama kuralları.';
EXEC dbo.AciklamaYaz @Sema = N'musteri',
     @Metin = N'Müşteri hesapları ve hesaba bağlı kişisel kayıtlar: hesap, hesaptaki kişiler, telefon geçmişi, numara değişikliği talepleri, geri bildirimler. PAKSAN Connect yazar; backoffice karar verir ve düzenler. Elle arama yaparken: Türkçe harfli metni N''…'' ile yazın (N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ sessizce değişir ve kayıt bulunmaz); ad ararken …Arama kolonlarını LIKE N''%isik%'' biçiminde kullanın; numara ve seri numarasını tiresiz ve büyük harfle yazın ya da yardim.Ara, yardim.TalepGoster ve yardim.MakineGoster prosedürlerini kullanın.';
EXEC dbo.AciklamaYaz @Sema = N'makine',
     @Metin = N'Makine kaydı, makinenin sahibi, atanmış servisi, satışları ve garantisi. Müşterinin servisinin tek kaynağı buradaki makine → bayi → servis zinciridir.';
EXEC dbo.AciklamaYaz @Sema = N'talep',
     @Metin = N'Servis, yedek parça ve fiyat teklifi talepleri ile bütün alt kayıtları: durum geçmişi, notlar, randevular, teklifler, servis ziyaretleri, parça sevkleri, ödemeler, kapanışlar, iptaller. Elle arama yaparken: Türkçe harfli metni N''…'' ile yazın (N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ sessizce değişir ve kayıt bulunmaz); ad ararken …Arama kolonlarını LIKE N''%isik%'' biçiminde kullanın; numara ve seri numarasını tiresiz ve büyük harfle yazın ya da yardim.Ara, yardim.TalepGoster ve yardim.MakineGoster prosedürlerini kullanın.';
EXEC dbo.AciklamaYaz @Sema = N'servis',
     @Metin = N'Servis firmaları: fatura bilgisi, çalıştığı bölgeler, bağlı olduğu bayiler, marka yetkileri, PAKSAN Servisim giriş hesapları ve şifre yardım talepleri. Elle arama yaparken: Türkçe harfli metni N''…'' ile yazın (N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ sessizce değişir ve kayıt bulunmaz); ad ararken …Arama kolonlarını LIKE N''%isik%'' biçiminde kullanın; numara ve seri numarasını tiresiz ve büyük harfle yazın ya da yardim.Ara, yardim.TalepGoster ve yardim.MakineGoster prosedürlerini kullanın.';
EXEC dbo.AciklamaYaz @Sema = N'bayi',
     @Metin = N'Bayi firmaları ve marka yetkileri. Bayinin paneli yoktur; sistemde yalnız kaydı vardır.';
EXEC dbo.AciklamaYaz @Sema = N'hakedis',
     @Metin = N'Servisin PAKSAN''dan alacağı: tarife, hak ediş ve kalemleri, aylık hak ediş dökümü ve belgeleri, servisin hesap hareketleri. Muhasebenin esas kaydı LOGO''dadır.';
EXEC dbo.AciklamaYaz @Sema = N'katalog',
     @Metin = N'Marka, ürün, parça, fiyat listesi ve bunların çevirileri. Yalnız depodaki tohum betikleri yazar; SSMS''ten elle değiştirilmez.';
EXEC dbo.AciklamaYaz @Sema = N'personel',
     @Metin = N'PAKSAN personel kartları. Giriş bilgisi erisim.Kullanici tablosundadır.';
EXEC dbo.AciklamaYaz @Sema = N'erisim',
     @Metin = N'Backoffice ve PAKSAN Servisim girişleri: kullanıcılar, roller, izinler, oturumlar, şifre sıfırlama kodları, doğrulama kodları, giriş denemeleri.';
EXEC dbo.AciklamaYaz @Sema = N'duyuru',
     @Metin = N'Backoffice''ten yayınlanan duyurular ve kime gidecekleri (marka, il, ilçe, servis, ürün, seri numarası).';
EXEC dbo.AciklamaYaz @Sema = N'bildirim',
     @Metin = N'Kişiye özel bildirimler, alıcı başına gönderilme ve okunma bilgisi, bildirim alan cihazlar.';
EXEC dbo.AciklamaYaz @Sema = N'destek',
     @Metin = N'PAKSAN Connect destek sohbetinin oturum ve olay kaydı. Sohbetin metni saklanmaz.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk',
     @Metin = N'KVKK ve izin metinlerinin sürümleri, müşterinin verdiği onay ve retler, KVKK başvuruları.';
EXEC dbo.AciklamaYaz @Sema = N'dosya',
     @Metin = N'Yüklenen dosyaların bilgileri (türü, boyutu, nerede durduğu). Dosyanın kendisi veritabanında değil, diskte ya da dosya deposundadır.';
EXEC dbo.AciklamaYaz @Sema = N'denetim',
     @Metin = N'İşlem kaydı: kim, ne zaman, hangi uygulamadan, ne yaptı. Satırlar değiştirilemez ve silinemez.';
EXEC dbo.AciklamaYaz @Sema = N'entegrasyon',
     @Metin = N'Dış sistemlerle bağlar (LOGO ve sonrakiler): belge bağları, cari kartlar, malzeme kartları, seri numarası sorguları, Excel içe aktarımları.';
EXEC dbo.AciklamaYaz @Sema = N'kod',
     @Metin = N'Bütün seçim listeleri (durumlar, türler, nedenler, kanallar), başka dillerdeki adları (Ceviri) ve eski verideki değerlerin bugünkü karşılıkları (EskiDegerEslesmesi). Yeni seçenek satır eklenerek tanımlanır; satır silinmez, Aktif = 0 yapılır.';
EXEC dbo.AciklamaYaz @Sema = N'cografya',
     @Metin = N'Ülke, il, ilçe ve yurt dışı bölge listeleri.';
EXEC dbo.AciklamaYaz @Sema = N'sirket',
     @Metin = N'İşletmeci şirketler (PAKSAN ve ileride ayrı şirketi olan markalar) ve banka hesapları.';
EXEC dbo.AciklamaYaz @Sema = N'gorunum',
     @Metin = N'Elle bakmak için hazır görünümler: teknik kimlik kolonu yok, saatler Türkiye saati, kodların yanında Türkçe adları. Tablolara doğrudan bakmak yerine önce buraya bakın.';
EXEC dbo.AciklamaYaz @Sema = N'yardim',
     @Metin = N'Arama ve kayıt kartı prosedürleri (ör. EXEC yardim.Ara N''SRV-26-00123''). Yalnız okur, hiçbir şeyi değiştirmez.';
EXEC dbo.AciklamaYaz @Sema = N'yonetim',
     @Metin = N'Kurallı elle düzeltme prosedürleri (ör. yonetim.TalebiKapat). Önce @Uygula = 0 ile ne olacağı görülür, sonra @Uygula = 1 ile uygulanır; her uygulama işlem kaydına yazılır.';
EXEC dbo.AciklamaYaz @Sema = N'gecmis',
     @Metin = N'Geçmişi tutulan tabloların eski hâlleri; adları <şema>_<Tablo> biçimindedir (ör. gecmis.servis_Servis). SQL Server kendisi yazar; elle yazılmaz.';
GO

/* --------------------------------------------------------------------------
   4. K02'nin açtığı nesnelerin açıklamaları
   -------------------------------------------------------------------------- */
EXEC dbo.AciklamaYaz @Sema = N'dbo', @Nesne = N'SemaGecmisi',
     @Metin = N'Veritabanına uygulanan her kurulum betiğinin kaydı. Kurulum aracı her betikten sonra bir satır yazar. Uygulanmış bir şema betiği sonradan değiştirilirse araç özet farkından anlar ve durur.';
EXEC dbo.AciklamaYaz @Sema = N'dbo', @Nesne = N'SemaGecmisi', @Alt = N'Kimlik',
     @Metin = N'Satırın sıra numarası; aynı betik birden çok kez uygulandıysa en büyüğü son uygulamadır.';
EXEC dbo.AciklamaYaz @Sema = N'dbo', @Nesne = N'SemaGecmisi', @Alt = N'BetikAdi',
     @Metin = N'Uygulanan betiğin dosya adı (ör. V0002__kod_sistem.sql).';
EXEC dbo.AciklamaYaz @Sema = N'dbo', @Nesne = N'SemaGecmisi', @Alt = N'Tur',
     @Metin = N'Betiğin türü: V şema (bir kez uygulanır), R prosedür ve görünüm, T üretilmiş başlangıç verisi, B bir kez konan başlangıç verisi, O örnek veri, K kurulum.';
EXEC dbo.AciklamaYaz @Sema = N'dbo', @Nesne = N'SemaGecmisi', @Alt = N'Ozet',
     @Metin = N'Betik dosyasının içerik özeti (SHA-256, 64 küçük harf onaltılık karakter). Satır sonu farkı özeti değiştirmez.';
EXEC dbo.AciklamaYaz @Sema = N'dbo', @Nesne = N'SemaGecmisi', @Alt = N'UygulanmaZamani',
     @Metin = N'Betiğin uygulandığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'dbo', @Nesne = N'SemaGecmisi', @Alt = N'SureMs',
     @Metin = N'Betiğin çalışma süresi, milisaniye.';
EXEC dbo.AciklamaYaz @Sema = N'dbo', @Nesne = N'SemaGecmisi', @Alt = N'Uygulayan',
     @Metin = N'Betiği uygulayan SQL girişi (normalde paksan_<ortam>_sahip).';
EXEC dbo.AciklamaYaz @Sema = N'dbo', @Nesne = N'SemaGecmisi', @Alt = N'Makine',
     @Metin = N'Kurulum aracının çalıştığı bilgisayarın adı.';

EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ortam',
     @Metin = N'Bu veritabanının hangi ortama ait olduğu (yerel, sinama, test, canli). Tek satırdır; kurulumda bir kez yazılır, değiştirilemez ve silinemez. Kurulum aracı her çalışmada ortam dosyasıyla karşılaştırır, uyuşmazsa durur.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ortam', @Alt = N'OrtamKodu',
     @Metin = N'Ortam: yerel (bu bilgisayar), sinama (doğrulama için kurulup silinen), test (sunucudaki prova), canli (gerçek kullanım).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ortam', @Alt = N'VeritabaniAdi',
     @Metin = N'Kurulumdaki veritabanı adı (Paksan_Yerel, Paksan_Sinama1, Paksan_Test, Paksan_Canli). Yedekten başka adla geri yüklenmiş kopya bu farktan anlaşılır.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ortam', @Alt = N'OrnekVeriIzinli',
     @Metin = N'1: örnek veri yüklenebilir ve sınamalarda tarih verilebilir (yerel, sinama). 0: test ve canlı. Ortam kodundan hesaplanır.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ortam', @Alt = N'KurulumZamani',
     @Metin = N'Ortam işaretinin yazıldığı an (UTC).';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ortam', @Alt = N'KurulumMakinesi',
     @Metin = N'Kurulumu çalıştıran bilgisayarın adı.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ortam', @Alt = N'TekSatir',
     @Metin = N'Her zaman 1; tabloda ikinci satır olmasını engeller.';
EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ortam', @Alt = N'TR_sistem_Ortam_Koruma', @AltTuru = N'TRIGGER',
     @Metin = N'Ortam işaretinin değiştirilmesini ve silinmesini her girişe karşı reddeder (hata 51011).';
GO
