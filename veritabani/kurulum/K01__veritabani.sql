/* ==========================================================================
   K01 — Veritabanını açar ve veritabanı seçeneklerini uygular

   Kim çalıştırır: sunucu yöneticisi (yerelde Windows girişi), master
   veritabanında, işlem dışında. `npm run vt -- kur` çağırır.

   Tekrar çalışabilir: veritabanı varsa yeniden açılmaz; harmanlaması ve
   ortam işareti denetlenir, yalnız farklı olan seçenek değiştirilir.
   İkinci çalıştırma hiçbir şeyi değiştirmez.

   sqlcmd değişkenleri (araç ortam değişkeni olarak verir; betikte
   dolar-parantez biçimiyle okunur. Bu yorumda o biçim bilerek yazılmadı:
   sqlcmd yorumun içindeki değişkeni de doldurur):
     PAKSAN_VT_VERITABANI  Paksan_Yerel | Paksan_Sinama<n> | Paksan_Test | Paksan_Canli
     PAKSAN_VT_ORTAM       yerel | sinama | test | canli

   Kurallar: tasarim.md Bölüm 1.1 (adlar), 1.4.1 (harmanlama),
   1.19.1 (seçenekler), 1.19.2 (kurtarma modeli).

   Veritabanı sahipliği burada verilmez: sahip girişi K02'de açılır ve
   sahiplik orada verilir.

   Hata numaraları 50010–50019 bu betiğindir.
   ========================================================================== */
:on error exit
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
GO

/* --------------------------------------------------------------------------
   1. Denetimler: doğru bağlam, yeterli sunucu sürümü, izinli ad

   Araç yalnız ^Paksan_(Yerel|Test|Canli|Sinama\d)$ adlarına dokunur ve
   adın ortamla uyuşmasını ister. Aynı denetim burada da yapılır: betik
   araç dışından (ör. elle sqlcmd ile) çalıştırılırsa başka bir
   veritabanı açılmasın ya da değiştirilmesin.
   -------------------------------------------------------------------------- */
IF DB_NAME() COLLATE Latin1_General_100_BIN2 <> N'master'
    THROW 50010, N'kurulumu başlatmak için K01 betiğini master veritabanında çalıştırın', 1;

IF CONVERT(int, SERVERPROPERTY('ProductMajorVersion')) < 15
    THROW 50011, N'en az SQL Server 2019 gerekir; kurulumu SQL Server 2019 veya daha yeni bir sürümde çalıştırın', 1;

IF N'$(PAKSAN_VT_VERITABANI)' COLLATE Latin1_General_100_BIN2 NOT LIKE N'Paksan[_]%'
    THROW 50012, N'veritabanı adı Paksan_ ile başlamalı; hedef veritabanı adını ortam dosyasında düzeltin. Başka veritabanında değişiklik yapılmaz', 1;

IF NOT (   (N'$(PAKSAN_VT_ORTAM)' COLLATE Latin1_General_100_BIN2 = N'yerel'
            AND N'$(PAKSAN_VT_VERITABANI)' COLLATE Latin1_General_100_BIN2 = N'Paksan_Yerel')
        OR (N'$(PAKSAN_VT_ORTAM)' COLLATE Latin1_General_100_BIN2 = N'sinama'
            AND N'$(PAKSAN_VT_VERITABANI)' COLLATE Latin1_General_100_BIN2 LIKE N'Paksan[_]Sinama[0-9]')
        OR (N'$(PAKSAN_VT_ORTAM)' COLLATE Latin1_General_100_BIN2 = N'test'
            AND N'$(PAKSAN_VT_VERITABANI)' COLLATE Latin1_General_100_BIN2 = N'Paksan_Test')
        OR (N'$(PAKSAN_VT_ORTAM)' COLLATE Latin1_General_100_BIN2 = N'canli'
            AND N'$(PAKSAN_VT_VERITABANI)' COLLATE Latin1_General_100_BIN2 = N'Paksan_Canli'))
    THROW 50013, N'veritabanı adı ortamla uyuşmuyor; hedef veritabanı adını ortam dosyasında düzeltin (yerel: Paksan_Yerel, sinama: Paksan_Sinama1-9, test: Paksan_Test, canli: Paksan_Canli)', 1;
GO

/* --------------------------------------------------------------------------
   2. Veritabanı yoksa açılır

   Harmanlama Latin1_General_100_CI_AS: nesne ve kolon adları büyük/küçük
   harf ve i/I farkı gözetmeden bulunur (SSMS'te `select ilkodu from
   cografya.il` çalışır). Türkçe metin kolonları kendi harmanlamasını
   açıkça alır (tasarim.md 1.4.1). Dosyalar sunucunun varsayılan
   klasörüne açılır; büyüme adımı 4. adımda ayarlanır.
   -------------------------------------------------------------------------- */
IF DB_ID(N'$(PAKSAN_VT_VERITABANI)') IS NULL
    CREATE DATABASE [$(PAKSAN_VT_VERITABANI)] COLLATE Latin1_General_100_CI_AS;
GO

/* --------------------------------------------------------------------------
   3. Var olan veritabanı bu ortamın mı?

   Harmanlama sonradan değiştirilmez: farklıysa durulur. Veritabanında
   ortam işareti (sistem.Ortam) varsa ortam ve ad bu kurulumla aynı
   olmalı; değilse başka bir ortamın veritabanıdır ve dokunulmaz.
   -------------------------------------------------------------------------- */
DECLARE @Ad sysname = N'$(PAKSAN_VT_VERITABANI)';
DECLARE @Harmanlama nvarchar(128) =
    CONVERT(nvarchar(128), DATABASEPROPERTYEX(@Ad, 'Collation'));

IF @Harmanlama IS NULL
   OR @Harmanlama COLLATE Latin1_General_100_BIN2 <> N'Latin1_General_100_CI_AS'
    THROW 50014, N'veritabanının harmanlaması Latin1_General_100_CI_AS değil; harmanlama sonradan değiştirilmez. Hedef veritabanını ve kurulum ayarlarını veritabanı yöneticisiyle kontrol edin', 1;

IF OBJECT_ID(QUOTENAME(@Ad) + N'.sistem.Ortam', N'U') IS NOT NULL
BEGIN
    DECLARE @OrtamKodu nvarchar(10);
    DECLARE @VeritabaniAdi nvarchar(128);
    DECLARE @Sorgu nvarchar(max) =
        N'SELECT @OrtamKodu = OrtamKodu, @VeritabaniAdi = VeritabaniAdi FROM '
        + QUOTENAME(@Ad) + N'.sistem.Ortam;';

    EXEC sys.sp_executesql
        @Sorgu,
        N'@OrtamKodu nvarchar(10) OUTPUT, @VeritabaniAdi nvarchar(128) OUTPUT',
        @OrtamKodu = @OrtamKodu OUTPUT,
        @VeritabaniAdi = @VeritabaniAdi OUTPUT;

    /* İşaret tablosu var ama satırı yoksa (K02 yarıda kaldıysa) K02 yazar. */
    IF @OrtamKodu IS NOT NULL
       AND (   @OrtamKodu COLLATE Latin1_General_100_BIN2 <> N'$(PAKSAN_VT_ORTAM)'
            OR @VeritabaniAdi COLLATE Latin1_General_100_BIN2 <> N'$(PAKSAN_VT_VERITABANI)')
        THROW 50015, N'veritabanı başka bir ortama ait (sistem.Ortam); değişiklik yapılmadı. Ortam dosyasını kontrol edip hedef veritabanını ortama göre seçin (yerel: Paksan_Yerel, sinama: Paksan_Sinama1-9, test: Paksan_Test, canli: Paksan_Canli)', 1;
END;
GO

/* --------------------------------------------------------------------------
   4. Veritabanı seçenekleri (tasarim.md 1.19.1)

   Her seçenek yalnız farklıysa değiştirilir. Böylece ikinci çalıştırma
   bağlantıları kesmez (READ_COMMITTED_SNAPSHOT değişikliği açık işlemleri
   geri alır; yalnız ilk kurulumda gerekir).
   -------------------------------------------------------------------------- */
DECLARE @Uyumluluk tinyint,
        @SatirSurumuOkuma bit,
        @AnlikGoruntu tinyint,
        @OtomatikKapanma bit,
        @OtomatikKuculme bit,
        @IstatistikOlustur bit,
        @IstatistikGuncelle bit,
        @SayfaDenetimi nvarchar(60),
        @Guvenilir bit,
        @VeritabaniZinciri bit,
        @KurtarmaModeli nvarchar(60);

SELECT @Uyumluluk          = d.compatibility_level,
       @SatirSurumuOkuma   = d.is_read_committed_snapshot_on,
       @AnlikGoruntu       = d.snapshot_isolation_state,
       @OtomatikKapanma    = d.is_auto_close_on,
       @OtomatikKuculme    = d.is_auto_shrink_on,
       @IstatistikOlustur  = d.is_auto_create_stats_on,
       @IstatistikGuncelle = d.is_auto_update_stats_on,
       @SayfaDenetimi      = d.page_verify_option_desc,
       @Guvenilir          = d.is_trustworthy_on,
       @VeritabaniZinciri  = d.is_db_chaining_on,
       @KurtarmaModeli     = d.recovery_model_desc
FROM sys.databases AS d
WHERE d.name = N'$(PAKSAN_VT_VERITABANI)';

IF @Uyumluluk <> 150
    ALTER DATABASE [$(PAKSAN_VT_VERITABANI)] SET COMPATIBILITY_LEVEL = 150;

IF @SatirSurumuOkuma = 0
    ALTER DATABASE [$(PAKSAN_VT_VERITABANI)] SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;

IF @AnlikGoruntu <> 0
    ALTER DATABASE [$(PAKSAN_VT_VERITABANI)] SET ALLOW_SNAPSHOT_ISOLATION OFF;

/* Express'te varsayılan AÇIK: her bağlantı kapanınca veritabanı kapanır. */
IF @OtomatikKapanma = 1
    ALTER DATABASE [$(PAKSAN_VT_VERITABANI)] SET AUTO_CLOSE OFF;

IF @OtomatikKuculme = 1
    ALTER DATABASE [$(PAKSAN_VT_VERITABANI)] SET AUTO_SHRINK OFF;

IF @IstatistikOlustur = 0
    ALTER DATABASE [$(PAKSAN_VT_VERITABANI)] SET AUTO_CREATE_STATISTICS ON;

IF @IstatistikGuncelle = 0
    ALTER DATABASE [$(PAKSAN_VT_VERITABANI)] SET AUTO_UPDATE_STATISTICS ON;

IF @SayfaDenetimi COLLATE Latin1_General_100_BIN2 <> N'CHECKSUM'
    ALTER DATABASE [$(PAKSAN_VT_VERITABANI)] SET PAGE_VERIFY CHECKSUM;

IF @Guvenilir = 1
    ALTER DATABASE [$(PAKSAN_VT_VERITABANI)] SET TRUSTWORTHY OFF;

IF @VeritabaniZinciri = 1
    ALTER DATABASE [$(PAKSAN_VT_VERITABANI)] SET DB_CHAINING OFF;

/* Sorgu deposu doluyken kendiliğinden salt okura geçebilir; her
   çalıştırmada yazılır olarak açılır. */
ALTER DATABASE [$(PAKSAN_VT_VERITABANI)] SET QUERY_STORE = ON (OPERATION_MODE = READ_WRITE);

/* Kurtarma modeli (tasarim.md 1.19.2): canlıda FULL, öteki ortamlarda
   SIMPLE. Canlıda 15 dakikalık günlük yedeği zamanlanmadan kurulum
   yapılmaz (`npm run vt -- yedekle --gunluk`). */
IF N'$(PAKSAN_VT_ORTAM)' COLLATE Latin1_General_100_BIN2 = N'canli'
   AND @KurtarmaModeli COLLATE Latin1_General_100_BIN2 <> N'FULL'
    ALTER DATABASE [$(PAKSAN_VT_VERITABANI)] SET RECOVERY FULL;

IF N'$(PAKSAN_VT_ORTAM)' COLLATE Latin1_General_100_BIN2 <> N'canli'
   AND @KurtarmaModeli COLLATE Latin1_General_100_BIN2 <> N'SIMPLE'
    ALTER DATABASE [$(PAKSAN_VT_VERITABANI)] SET RECOVERY SIMPLE;
GO

/* --------------------------------------------------------------------------
   5. Veri ve günlük dosyası büyüme adımı: 64 MB

   Dosyanın mantıksal adı sunucuya göre değişebildiği için adlar
   sys.master_files'tan okunur. growth 8 KB'lık sayfa sayısıdır:
   64 MB = 8192 sayfa. Zaten 64 MB olan dosyaya dokunulmaz.
   -------------------------------------------------------------------------- */
DECLARE @Komut nvarchar(max);

SELECT @Komut = STRING_AGG(
           CONVERT(nvarchar(max),
               N'ALTER DATABASE ' + QUOTENAME(DB_NAME(mf.database_id))
               + N' MODIFY FILE (NAME = N''' + REPLACE(mf.name, N'''', N'''''')
               + N''', FILEGROWTH = 64MB);'),
           NCHAR(10))
FROM sys.master_files AS mf
WHERE mf.database_id = DB_ID(N'$(PAKSAN_VT_VERITABANI)')
  AND mf.type IN (0, 1)
  AND (mf.is_percent_growth = 1 OR mf.growth <> 8192);

IF @Komut IS NOT NULL
    EXEC sys.sp_executesql @Komut;
GO
