/* ==========================================================================
   veri-ozeti.sql — her tablonun satır sayısı ve içerik özeti (SHA-256)

   NE İŞE YARAR: bir işlemin veriyi değiştirip değiştirmediğini sorar.
   `npm run vt -- sinama` tohum betiklerini (T, B, O) ikinci kez
   uygulamadan önce ve sonra bu özeti alır; iki özet aynı olmalıdır
   (tasarim.md 7.1 KR-04: "0 satır değişir").

   Kim çalıştırır: sahip girişi (bütün tabloları okur). SSMS'te düz sorgu
   olarak da çalışır; hiçbir şey yazmaz (yalnız oturumun geçici tablosu).

   NASIL: her satır JSON'a çevrilip özetlenir; satır özetleri sıralanıp
   tablonun özeti çıkarılır. Birincil anahtar gerekmez (geçmiş
   tablolarında yoktur) ve satırların fiziksel sırası sonucu etkilemez.
   SatirSurumu (rowversion) kolonları özete girer: değeri aynı kalsa bile
   güncellenen satır böylece yakalanır. Sistem sürümlü tablolarda boşa
   yapılan güncelleme de geçmiş tablosuna satır ekler ve yakalanır.

   HARİÇ: dbo.SemaGecmisi (araç her uygulamada satır ekler).

   ÇIKTI: Tablo, SatirSayisi, Ozet; son satır TOPLAM. Boş tablonun özeti
   NULL yazılır.
   ========================================================================== */
SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;

IF OBJECT_ID(N'tempdb..#VeriOzeti') IS NOT NULL DROP TABLE #VeriOzeti;

CREATE TABLE #VeriOzeti (
    Tablo       nvarchar(300) COLLATE DATABASE_DEFAULT NOT NULL PRIMARY KEY,
    SatirSayisi bigint NOT NULL,
    Ozet        binary(32) NULL
);

DECLARE @Tablo       nvarchar(300),
        @TamAd       nvarchar(300),
        @Sorgu       nvarchar(max),
        @SatirSayisi bigint,
        @Ozet        binary(32);

DECLARE tablolar CURSOR LOCAL FAST_FORWARD FOR
    SELECT SCHEMA_NAME(t.schema_id) + N'.' + t.name,
           QUOTENAME(SCHEMA_NAME(t.schema_id)) + N'.' + QUOTENAME(t.name)
    FROM sys.tables AS t
    WHERE t.is_ms_shipped = 0
      AND t.object_id <> ISNULL(OBJECT_ID(N'dbo.SemaGecmisi', N'U'), 0)
    ORDER BY SCHEMA_NAME(t.schema_id) COLLATE Latin1_General_100_BIN2,
             t.name COLLATE Latin1_General_100_BIN2;

OPEN tablolar;
FETCH NEXT FROM tablolar INTO @Tablo, @TamAd;

WHILE @@FETCH_STATUS = 0
BEGIN
    /* Tablo adı QUOTENAME ile sys.tables'tan gelir; kullanıcı girdisi yok. */
    SET @Sorgu = N'
SELECT @SatirSayisi = COUNT_BIG(*),
       @Ozet = HASHBYTES(''SHA2_256'',
                   STRING_AGG(CONVERT(nvarchar(max), s.SatirOzeti), N'','')
                       WITHIN GROUP (ORDER BY s.SatirOzeti))
FROM (SELECT CONVERT(nchar(64),
                 HASHBYTES(''SHA2_256'',
                     (SELECT t.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)), 2) AS SatirOzeti
      FROM ' + @TamAd + N' AS t) AS s;';

    EXEC sys.sp_executesql
        @Sorgu,
        N'@SatirSayisi bigint OUTPUT, @Ozet binary(32) OUTPUT',
        @SatirSayisi = @SatirSayisi OUTPUT,
        @Ozet = @Ozet OUTPUT;

    INSERT #VeriOzeti (Tablo, SatirSayisi, Ozet) VALUES (@Tablo, @SatirSayisi, @Ozet);

    FETCH NEXT FROM tablolar INTO @Tablo, @TamAd;
END;

CLOSE tablolar;
DEALLOCATE tablolar;

SELECT s.Tablo, s.SatirSayisi, s.Ozet
FROM (SELECT v.Tablo COLLATE Latin1_General_100_BIN2 AS Tablo,
             v.SatirSayisi,
             LOWER(CONVERT(char(64), v.Ozet, 2)) AS Ozet,
             0 AS Sira
      FROM #VeriOzeti AS v
      UNION ALL
      SELECT N'TOPLAM',
             SUM(v.SatirSayisi),
             LOWER(CONVERT(char(64),
                 HASHBYTES('SHA2_256',
                     STRING_AGG(CONVERT(nvarchar(max), v.Tablo + N':' + ISNULL(CONVERT(nchar(64), v.Ozet, 2), N'-')), NCHAR(10))
                         WITHIN GROUP (ORDER BY v.Tablo COLLATE Latin1_General_100_BIN2)), 2)),
             1
      FROM #VeriOzeti AS v) AS s
ORDER BY s.Sira, s.Tablo;
