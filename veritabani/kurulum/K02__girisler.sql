/* ==========================================================================
   K02 — Girişler, kullanıcılar, roller, sahiplik ve ortam işareti

   Kim çalıştırır: sunucu yöneticisi, HEDEF veritabanında (araç -d ile
   bağlanır), işlem dışında. `npm run vt -- kur` K01'den sonra çağırır.

   Tekrar çalışabilir: her nesne yalnız yoksa açılır. İkinci çalıştırma
   hiçbir şeyi değiştirmez; var olan girişin şifresi değiştirilmez.

   sqlcmd değişkenleri (araç ortam değişkeni olarak verir; şifreler komut
   satırında görünmez). Betikte dolar-parantez biçimiyle okunur; bu
   yorumda o biçim bilerek yazılmadı, çünkü sqlcmd yorumun içindeki
   değişkeni de doldurur ve şifre yorum metnine girerdi:
     PAKSAN_VT_VERITABANI, PAKSAN_VT_ORTAM
     PAKSAN_VT_GIRIS_SAHIP, _UYGULAMA, _YONETICI, _RAPOR
     PAKSAN_VT_SAHIP_SIFRE, _UYGULAMA_SIFRE, _YONETICI_SIFRE, _RAPOR_SIFRE

   Şifre yalnız CREATE LOGIN komutunda geçer (SQL Server bu komutun metnini
   izleme kayıtlarında gizler). Boş ya da zayıf şifreyi parola kuralı
   (CHECK_POLICY = ON) reddeder.

   Sıra:
     1. Denetimler (doğru veritabanı, doğru ortam; başka ortamın
        veritabanına ve başka veritabanına dokunulmaz)
     2. Dört SQL girişi
     3. Veritabanı sahipliği → sahip girişi (veritabanında dbo olur)
     4. Veritabanı kullanıcıları, roller, üyelikler
     5. sistem şeması
     6. dbo.SemaGecmisi (aracın betik geçmişi)
     7. sistem.Ortam + tek satırı + PaksanOrtam özelliği + koruma tetikleyicisi

   Tablo ve kolon açıklamaları V0001'de dbo.AciklamaYaz ile yazılır
   (prosedür o betikte açılır). Tablo, kolon, şema ve veritabanı düzeyi
   izinler V0015'tedir.

   Kurallar: tasarim.md Bölüm 0.4 (dbo, sistem.Ortam), 1.1, 4.1, 4.4, 6.1.
   Hata numaraları 50020–50029 bu betiğindir; 51011 koruma tetikleyicisi.
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
   1. Denetimler
   -------------------------------------------------------------------------- */

/* Bağlanılan veritabanı ortam dosyasındaki veritabanı olmalı: kullanıcı
   ve rol yalnız kendi veritabanında açılır. */
IF DB_NAME() COLLATE Latin1_General_100_BIN2 <> N'$(PAKSAN_VT_VERITABANI)'
    THROW 50020, N'<Codex metni: K02 yalnız ortam dosyasındaki veritabanında çalışır; başka veritabanında kullanıcı açılmaz>', 1;

IF NOT (   (N'$(PAKSAN_VT_ORTAM)' COLLATE Latin1_General_100_BIN2 = N'yerel'
            AND DB_NAME() COLLATE Latin1_General_100_BIN2 = N'Paksan_Yerel')
        OR (N'$(PAKSAN_VT_ORTAM)' COLLATE Latin1_General_100_BIN2 = N'sinama'
            AND DB_NAME() COLLATE Latin1_General_100_BIN2 LIKE N'Paksan[_]Sinama[0-9]')
        OR (N'$(PAKSAN_VT_ORTAM)' COLLATE Latin1_General_100_BIN2 = N'test'
            AND DB_NAME() COLLATE Latin1_General_100_BIN2 = N'Paksan_Test')
        OR (N'$(PAKSAN_VT_ORTAM)' COLLATE Latin1_General_100_BIN2 = N'canli'
            AND DB_NAME() COLLATE Latin1_General_100_BIN2 = N'Paksan_Canli'))
    THROW 50021, N'<Codex metni: veritabanı adı ortamla uyuşmuyor>', 1;

/* Giriş adları ortamdan türetilir (tools/vt/ortam.mjs girisAdlari):
   yanlış ortamın girişine yetki verilmesin. */
IF    N'$(PAKSAN_VT_GIRIS_SAHIP)'     COLLATE Latin1_General_100_BIN2 <> N'paksan_$(PAKSAN_VT_ORTAM)_sahip'
   OR N'$(PAKSAN_VT_GIRIS_UYGULAMA)'  COLLATE Latin1_General_100_BIN2 <> N'paksan_$(PAKSAN_VT_ORTAM)_uygulama'
   OR N'$(PAKSAN_VT_GIRIS_YONETICI)'  COLLATE Latin1_General_100_BIN2 <> N'paksan_$(PAKSAN_VT_ORTAM)_yonetici'
   OR N'$(PAKSAN_VT_GIRIS_RAPOR)'     COLLATE Latin1_General_100_BIN2 <> N'paksan_$(PAKSAN_VT_ORTAM)_rapor'
    THROW 50022, N'<Codex metni: giriş adları paksan_<ortam>_sahip, _uygulama, _yonetici, _rapor biçiminde olmalı>', 1;

IF CONVERT(nvarchar(128), DATABASEPROPERTYEX(DB_NAME(), 'Collation')) COLLATE Latin1_General_100_BIN2
   <> N'Latin1_General_100_CI_AS'
    THROW 50023, N'<Codex metni: veritabanının harmanlaması Latin1_General_100_CI_AS değil; önce K01 çalışmalı>', 1;

/* Ortam işareti varsa bu kurulumla aynı olmalı. Satırı olmayan işaret
   tablosu (yarıda kalmış kurulum) aşağıda tamamlanır. */
IF OBJECT_ID(N'sistem.Ortam', N'U') IS NOT NULL
BEGIN
    /* Tablo yokken bu sorgu hiç derlenmesin diye ayrı bloktadır. */
    IF EXISTS (SELECT 1
               FROM sistem.Ortam AS o
               WHERE o.OrtamKodu <> N'$(PAKSAN_VT_ORTAM)'
                  OR o.VeritabaniAdi <> N'$(PAKSAN_VT_VERITABANI)')
        THROW 50024, N'<Codex metni: veritabanı başka bir ortama ait (sistem.Ortam); dokunulmadı>', 1;
END;

/* Aynı adla SQL girişi değil de başka türde bir sunucu sorumlusu varsa
   (ör. Windows grubu) devam edilmez. */
IF EXISTS (SELECT 1
           FROM sys.server_principals AS sp
           WHERE sp.name IN (N'$(PAKSAN_VT_GIRIS_SAHIP)', N'$(PAKSAN_VT_GIRIS_UYGULAMA)',
                             N'$(PAKSAN_VT_GIRIS_YONETICI)', N'$(PAKSAN_VT_GIRIS_RAPOR)')
             AND sp.type <> N'S')
    THROW 50025, N'<Codex metni: giriş adı SQL girişi olmayan bir sunucu sorumlusunda kullanılıyor>', 1;

IF EXISTS (SELECT 1
           FROM sys.extended_properties AS ep
           WHERE ep.class = 0
             AND ep.name = N'PaksanOrtam'
             AND CONVERT(nvarchar(128), ep.value) COLLATE Latin1_General_100_BIN2 <> N'$(PAKSAN_VT_ORTAM)')
    THROW 50024, N'<Codex metni: veritabanı başka bir ortama ait (PaksanOrtam özelliği); dokunulmadı>', 1;
GO

/* --------------------------------------------------------------------------
   2. SQL girişleri

   Hepsi SQL kimlik doğrulamalı; parola kuralı açık, süre dolumu kapalı;
   varsayılan veritabanı kendi veritabanı. Sunucu düzeyinde başka yetki
   verilmez. Var olan girişin şifresine dokunulmaz.

   Sınama ortamında iki veritabanı (Paksan_Sinama1/2) aynı girişleri
   kullanır; girişin varsayılan veritabanı silinmişse bu veritabanına
   çevrilir.
   -------------------------------------------------------------------------- */

/* sahip — yalnız tools/vt (V/R/T/B/O betikleri); veritabanının sahibi */
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'$(PAKSAN_VT_GIRIS_SAHIP)')
    CREATE LOGIN [$(PAKSAN_VT_GIRIS_SAHIP)]
        WITH PASSWORD = N'$(PAKSAN_VT_SAHIP_SIFRE)',
             DEFAULT_DATABASE = [$(PAKSAN_VT_VERITABANI)],
             CHECK_POLICY = ON,
             CHECK_EXPIRATION = OFF;
GO

/* uygulama — API */
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'$(PAKSAN_VT_GIRIS_UYGULAMA)')
    CREATE LOGIN [$(PAKSAN_VT_GIRIS_UYGULAMA)]
        WITH PASSWORD = N'$(PAKSAN_VT_UYGULAMA_SIFRE)',
             DEFAULT_DATABASE = [$(PAKSAN_VT_VERITABANI)],
             CHECK_POLICY = ON,
             CHECK_EXPIRATION = OFF;
GO

/* yonetici — PAKSAN yetkilisinin SSMS oturumu */
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'$(PAKSAN_VT_GIRIS_YONETICI)')
    CREATE LOGIN [$(PAKSAN_VT_GIRIS_YONETICI)]
        WITH PASSWORD = N'$(PAKSAN_VT_YONETICI_SIFRE)',
             DEFAULT_DATABASE = [$(PAKSAN_VT_VERITABANI)],
             CHECK_POLICY = ON,
             CHECK_EXPIRATION = OFF;
GO

/* rapor — Excel/BI bağlantısı */
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'$(PAKSAN_VT_GIRIS_RAPOR)')
    CREATE LOGIN [$(PAKSAN_VT_GIRIS_RAPOR)]
        WITH PASSWORD = N'$(PAKSAN_VT_RAPOR_SIFRE)',
             DEFAULT_DATABASE = [$(PAKSAN_VT_VERITABANI)],
             CHECK_POLICY = ON,
             CHECK_EXPIRATION = OFF;
GO

/* Parola kuralı ayarları ve silinmiş varsayılan veritabanı düzeltilir. */
IF EXISTS (SELECT 1 FROM sys.sql_logins
           WHERE name = N'$(PAKSAN_VT_GIRIS_SAHIP)' AND (is_policy_checked = 0 OR is_expiration_checked = 1))
    ALTER LOGIN [$(PAKSAN_VT_GIRIS_SAHIP)] WITH CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;
IF EXISTS (SELECT 1 FROM sys.sql_logins
           WHERE name = N'$(PAKSAN_VT_GIRIS_UYGULAMA)' AND (is_policy_checked = 0 OR is_expiration_checked = 1))
    ALTER LOGIN [$(PAKSAN_VT_GIRIS_UYGULAMA)] WITH CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;
IF EXISTS (SELECT 1 FROM sys.sql_logins
           WHERE name = N'$(PAKSAN_VT_GIRIS_YONETICI)' AND (is_policy_checked = 0 OR is_expiration_checked = 1))
    ALTER LOGIN [$(PAKSAN_VT_GIRIS_YONETICI)] WITH CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;
IF EXISTS (SELECT 1 FROM sys.sql_logins
           WHERE name = N'$(PAKSAN_VT_GIRIS_RAPOR)' AND (is_policy_checked = 0 OR is_expiration_checked = 1))
    ALTER LOGIN [$(PAKSAN_VT_GIRIS_RAPOR)] WITH CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;

IF EXISTS (SELECT 1 FROM sys.server_principals
           WHERE name = N'$(PAKSAN_VT_GIRIS_SAHIP)' AND DB_ID(default_database_name) IS NULL)
    ALTER LOGIN [$(PAKSAN_VT_GIRIS_SAHIP)] WITH DEFAULT_DATABASE = [$(PAKSAN_VT_VERITABANI)];
IF EXISTS (SELECT 1 FROM sys.server_principals
           WHERE name = N'$(PAKSAN_VT_GIRIS_UYGULAMA)' AND DB_ID(default_database_name) IS NULL)
    ALTER LOGIN [$(PAKSAN_VT_GIRIS_UYGULAMA)] WITH DEFAULT_DATABASE = [$(PAKSAN_VT_VERITABANI)];
IF EXISTS (SELECT 1 FROM sys.server_principals
           WHERE name = N'$(PAKSAN_VT_GIRIS_YONETICI)' AND DB_ID(default_database_name) IS NULL)
    ALTER LOGIN [$(PAKSAN_VT_GIRIS_YONETICI)] WITH DEFAULT_DATABASE = [$(PAKSAN_VT_VERITABANI)];
IF EXISTS (SELECT 1 FROM sys.server_principals
           WHERE name = N'$(PAKSAN_VT_GIRIS_RAPOR)' AND DB_ID(default_database_name) IS NULL)
    ALTER LOGIN [$(PAKSAN_VT_GIRIS_RAPOR)] WITH DEFAULT_DATABASE = [$(PAKSAN_VT_VERITABANI)];
GO

/* --------------------------------------------------------------------------
   3. Veritabanı sahipliği

   Sahip girişi veritabanında dbo olur; V/R/T/B/O betikleri onunla
   çalışır ve bütün nesneler dbo sahiplidir (sahiplik zinciri, tasarim.md
   4.2). Sahip girişi sysadmin değildir.

   Girişin bu veritabanında ayrıca bir kullanıcısı varsa sahiplik
   verilemez (SQL Server 15110); o durumda açıkça durulur.
   -------------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1
               FROM sys.databases AS d
               JOIN sys.server_principals AS sp ON sp.sid = d.owner_sid
               WHERE d.database_id = DB_ID()
                 AND sp.name = N'$(PAKSAN_VT_GIRIS_SAHIP)')
BEGIN
    IF EXISTS (SELECT 1
               FROM sys.database_principals AS dp
               WHERE dp.sid = SUSER_SID(N'$(PAKSAN_VT_GIRIS_SAHIP)')
                 AND dp.name <> N'dbo')
        THROW 50026, N'<Codex metni: sahip girişinin bu veritabanında ayrı bir kullanıcısı var; sahiplik verilemedi>', 1;

    ALTER AUTHORIZATION ON DATABASE::[$(PAKSAN_VT_VERITABANI)] TO [$(PAKSAN_VT_GIRIS_SAHIP)];
END;
GO

/* --------------------------------------------------------------------------
   4. Kullanıcılar, roller, üyelikler

   Kullanıcı adları ortam taşımaz (tasarim.md 4.1): paksan_uygulama,
   paksan_yonetici, paksan_rapor. Veritabanı başka bir sunucudan geri
   yüklendiyse kullanıcı eski girişe bağlı kalır; bu ortamın girişine
   yeniden bağlanır.
   -------------------------------------------------------------------------- */
IF DATABASE_PRINCIPAL_ID(N'paksan_uygulama') IS NULL
    CREATE USER [paksan_uygulama] FOR LOGIN [$(PAKSAN_VT_GIRIS_UYGULAMA)] WITH DEFAULT_SCHEMA = [dbo];
ELSE IF NOT EXISTS (SELECT 1 FROM sys.database_principals
                    WHERE name = N'paksan_uygulama' AND sid = SUSER_SID(N'$(PAKSAN_VT_GIRIS_UYGULAMA)'))
    ALTER USER [paksan_uygulama] WITH LOGIN = [$(PAKSAN_VT_GIRIS_UYGULAMA)];

IF DATABASE_PRINCIPAL_ID(N'paksan_yonetici') IS NULL
    CREATE USER [paksan_yonetici] FOR LOGIN [$(PAKSAN_VT_GIRIS_YONETICI)] WITH DEFAULT_SCHEMA = [dbo];
ELSE IF NOT EXISTS (SELECT 1 FROM sys.database_principals
                    WHERE name = N'paksan_yonetici' AND sid = SUSER_SID(N'$(PAKSAN_VT_GIRIS_YONETICI)'))
    ALTER USER [paksan_yonetici] WITH LOGIN = [$(PAKSAN_VT_GIRIS_YONETICI)];

IF DATABASE_PRINCIPAL_ID(N'paksan_rapor') IS NULL
    CREATE USER [paksan_rapor] FOR LOGIN [$(PAKSAN_VT_GIRIS_RAPOR)] WITH DEFAULT_SCHEMA = [dbo];
ELSE IF NOT EXISTS (SELECT 1 FROM sys.database_principals
                    WHERE name = N'paksan_rapor' AND sid = SUSER_SID(N'$(PAKSAN_VT_GIRIS_RAPOR)'))
    ALTER USER [paksan_rapor] WITH LOGIN = [$(PAKSAN_VT_GIRIS_RAPOR)];

/* Roller. İzinleri V0015 verir (tasarim.md 4.2, 4.3). */
IF DATABASE_PRINCIPAL_ID(N'rol_uygulama') IS NULL
    CREATE ROLE [rol_uygulama] AUTHORIZATION [dbo];

IF DATABASE_PRINCIPAL_ID(N'rol_yonetici') IS NULL
    CREATE ROLE [rol_yonetici] AUTHORIZATION [dbo];

IF DATABASE_PRINCIPAL_ID(N'rol_rapor') IS NULL
    CREATE ROLE [rol_rapor] AUTHORIZATION [dbo];

IF NOT EXISTS (SELECT 1
               FROM sys.database_role_members AS rm
               JOIN sys.database_principals AS r ON r.principal_id = rm.role_principal_id
               JOIN sys.database_principals AS u ON u.principal_id = rm.member_principal_id
               WHERE r.name = N'rol_uygulama' AND u.name = N'paksan_uygulama')
    ALTER ROLE [rol_uygulama] ADD MEMBER [paksan_uygulama];

IF NOT EXISTS (SELECT 1
               FROM sys.database_role_members AS rm
               JOIN sys.database_principals AS r ON r.principal_id = rm.role_principal_id
               JOIN sys.database_principals AS u ON u.principal_id = rm.member_principal_id
               WHERE r.name = N'rol_yonetici' AND u.name = N'paksan_yonetici')
    ALTER ROLE [rol_yonetici] ADD MEMBER [paksan_yonetici];

IF NOT EXISTS (SELECT 1
               FROM sys.database_role_members AS rm
               JOIN sys.database_principals AS r ON r.principal_id = rm.role_principal_id
               JOIN sys.database_principals AS u ON u.principal_id = rm.member_principal_id
               WHERE r.name = N'rol_rapor' AND u.name = N'paksan_rapor')
    ALTER ROLE [rol_rapor] ADD MEMBER [paksan_rapor];
GO

/* --------------------------------------------------------------------------
   5. sistem şeması

   Öteki şemalar V0001'de açılır. sistem burada açılır, çünkü araç her
   çalışmada ortam işaretini sistem.Ortam'dan okur.
   -------------------------------------------------------------------------- */
IF SCHEMA_ID(N'sistem') IS NULL
    EXEC (N'CREATE SCHEMA sistem AUTHORIZATION dbo;');
GO

/* --------------------------------------------------------------------------
   6. dbo.SemaGecmisi — uygulanan betiklerin kaydı

   Araç her V/R/T/B/O betiğinden sonra aynı işlemde bir satır ekler:
   INSERT dbo.SemaGecmisi (BetikAdi, Tur, Ozet, SureMs, Makine).
   Uygulanmış bir V betiği değiştirilirse araç Ozet farkından anlar ve
   durur. Kolonlar kod benzeri metindir (Latin1_General_100_BIN2).
   -------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.SemaGecmisi', N'U') IS NULL
    CREATE TABLE dbo.SemaGecmisi (
        Kimlik          int IDENTITY(1, 1) NOT NULL,
        BetikAdi        nvarchar(260) COLLATE Latin1_General_100_BIN2 NOT NULL,
        Tur             nvarchar(1)   COLLATE Latin1_General_100_BIN2 NOT NULL
            CONSTRAINT CK_dbo_SemaGecmisi_Tur CHECK (Tur IN (N'K', N'V', N'R', N'T', N'B', N'O')),
        Ozet            nvarchar(64)  COLLATE Latin1_General_100_BIN2 NOT NULL
            CONSTRAINT CK_dbo_SemaGecmisi_Ozet CHECK (LEN(Ozet) = 64 AND Ozet NOT LIKE N'%[^0-9a-f]%'),
        UygulanmaZamani datetime2(3) NOT NULL
            CONSTRAINT DF_dbo_SemaGecmisi_UygulanmaZamani DEFAULT SYSUTCDATETIME(),
        SureMs          int NOT NULL,
        Uygulayan       nvarchar(128) COLLATE Latin1_General_100_BIN2 NOT NULL
            CONSTRAINT DF_dbo_SemaGecmisi_Uygulayan DEFAULT SUSER_SNAME(),
        Makine          nvarchar(128) COLLATE Latin1_General_100_BIN2 NOT NULL,
        CONSTRAINT PK_dbo_SemaGecmisi PRIMARY KEY CLUSTERED (Kimlik),
        CONSTRAINT CK_dbo_SemaGecmisi_BetikAdi CHECK (LEFT(BetikAdi, 1) = Tur AND BetikAdi LIKE N'%.sql')
    );
GO

/* Bir V betiği yalnız bir kez uygulanır. R/T/B/O değişince yeniden
   uygulanır ve yeni satır alır (araç en büyük Kimlik'e bakar). */
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID(N'dbo.SemaGecmisi') AND name = N'UX_dbo_SemaGecmisi_BetikAdi')
    CREATE UNIQUE NONCLUSTERED INDEX UX_dbo_SemaGecmisi_BetikAdi
        ON dbo.SemaGecmisi (BetikAdi)
        WHERE Tur = N'V';
GO

/* --------------------------------------------------------------------------
   7. sistem.Ortam — ortam işareti

   Tek satır: bu veritabanı hangi ortamın (yerel, sinama, test, canli)?
   Araç her çalışmada ortam dosyasıyla karşılaştırır; uyuşmazsa durur.
   Satır bir kez yazılır; TR_sistem_Ortam_Koruma değiştirmeyi ve silmeyi
   sahip girişine karşı da reddeder (51011).
   -------------------------------------------------------------------------- */
IF OBJECT_ID(N'sistem.Ortam', N'U') IS NULL
    CREATE TABLE sistem.Ortam (
        OrtamKodu       nvarchar(10)  COLLATE Latin1_General_100_BIN2 NOT NULL
            CONSTRAINT CK_sistem_Ortam_OrtamKodu CHECK (OrtamKodu IN (N'yerel', N'sinama', N'test', N'canli')),
        VeritabaniAdi   nvarchar(128) COLLATE Latin1_General_100_BIN2 NOT NULL,
        OrnekVeriIzinli AS CAST(CASE WHEN OrtamKodu IN (N'yerel', N'sinama') THEN 1 ELSE 0 END AS bit) PERSISTED NOT NULL,
        KurulumZamani   datetime2(3) NOT NULL
            CONSTRAINT DF_sistem_Ortam_KurulumZamani DEFAULT SYSUTCDATETIME(),
        KurulumMakinesi nvarchar(128) COLLATE Latin1_General_100_BIN2 NOT NULL,
        TekSatir        bit NOT NULL
            CONSTRAINT DF_sistem_Ortam_TekSatir DEFAULT 1
            CONSTRAINT CK_sistem_Ortam_TekSatir CHECK (TekSatir = 1),
        CONSTRAINT PK_sistem_Ortam PRIMARY KEY CLUSTERED (TekSatir),
        CONSTRAINT CK_sistem_Ortam_VeritabaniAdi CHECK (
               (OrtamKodu = N'yerel'  AND VeritabaniAdi = N'Paksan_Yerel')
            OR (OrtamKodu = N'sinama' AND VeritabaniAdi LIKE N'Paksan[_]Sinama[0-9]')
            OR (OrtamKodu = N'test'   AND VeritabaniAdi = N'Paksan_Test')
            OR (OrtamKodu = N'canli'  AND VeritabaniAdi = N'Paksan_Canli'))
    );
GO

/* Satır bir kez yazılır. KurulumMakinesi: kurulumu çalıştıran bilgisayar. */
IF NOT EXISTS (SELECT 1 FROM sistem.Ortam)
    INSERT sistem.Ortam (OrtamKodu, VeritabaniAdi, KurulumMakinesi)
    VALUES (N'$(PAKSAN_VT_ORTAM)',
            N'$(PAKSAN_VT_VERITABANI)',
            ISNULL(HOST_NAME(), CONVERT(nvarchar(128), SERVERPROPERTY('MachineName'))));

IF NOT EXISTS (SELECT 1 FROM sistem.Ortam
               WHERE OrtamKodu = N'$(PAKSAN_VT_ORTAM)'
                 AND VeritabaniAdi = N'$(PAKSAN_VT_VERITABANI)')
    THROW 50024, N'<Codex metni: ortam işareti bu kurulumla uyuşmuyor>', 1;

/* Aynı değer veritabanı özelliği olarak: SSMS'te veritabanı özellikleri
   penceresinde ve yedekten geri yüklenmiş kopyada tablo açılmadan görünür. */
IF NOT EXISTS (SELECT 1 FROM sys.extended_properties WHERE class = 0 AND name = N'PaksanOrtam')
    EXEC sys.sp_addextendedproperty @name = N'PaksanOrtam', @value = N'$(PAKSAN_VT_ORTAM)';
GO

/* Koruma tetikleyicisi. R04__korumalar.sql aynı tetikleyiciyi CREATE OR
   ALTER ile yeniler; burada yalnız yoksa açılır (tekrar çalışmada R04'ün
   sürümü ezilmesin). */
IF OBJECT_ID(N'sistem.TR_sistem_Ortam_Koruma', N'TR') IS NULL
    EXEC (N'CREATE TRIGGER sistem.TR_sistem_Ortam_Koruma
ON sistem.Ortam
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 51011, N''<Codex metni: ortam işareti değiştirilemez ve silinemez>'', 1;
END;');
GO
