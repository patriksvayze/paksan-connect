/* ==========================================================================
   R01 — işlevler

   yardim.Sadelestir: kullanıcının yazdığı numara, seri, telefon ve giriş
   adını tek biçime çeviren satır içi işlev (tasarim.md Bölüm 3.1.4).
   yardim ve yonetim prosedürleri girdiyi yalnız bununla normalleştirir;
   API aynı kuralı JavaScript'te uygular.

   Tekrar betiği: CREATE OR ALTER; her nesne kendi GO toplu işinde;
   açıklamalar dbo.AciklamaYaz ile aynı betikte yenilenir.
   ========================================================================== */

CREATE OR ALTER FUNCTION yardim.Sadelestir (@Metin nvarchar(400))
RETURNS TABLE
AS RETURN
WITH girdi AS (
  SELECT LTRIM(RTRIM(ISNULL(@Metin, N''))) COLLATE Latin1_General_100_BIN2 AS Ham
), turkcesiz AS (
  SELECT Ham,
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      Ham,
      N'ç',N'c'), N'Ç',N'C'), N'ğ',N'g'), N'Ğ',N'G'), N'ı',N'i'), N'İ',N'I'),
      N'ö',N'o'), N'Ö',N'O'), N'ş',N's'), N'Ş',N'S'), N'ü',N'u'), N'Ü',N'U'),
      N'â',N'a'), N'Â',N'A'), N'î',N'i'), N'Î',N'I'), N'û',N'u'), N'Û',N'U') AS Duz
  FROM girdi
), sira AS (
  SELECT TOP (SELECT LEN(Ham) FROM girdi) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS i
  FROM (VALUES (0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0)) a(x)
  CROSS JOIN (VALUES (0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0)) b(x)
), harf AS (
  SELECT s.i, UPPER(SUBSTRING(t.Duz, s.i, 1)) AS b, LOWER(SUBSTRING(t.Duz, s.i, 1)) AS k
  FROM turkcesiz t CROSS JOIN sira s
), parca AS (
  SELECT
    (SELECT STRING_AGG(b, N'') WITHIN GROUP (ORDER BY i) FROM harf WHERE b LIKE N'[A-Z0-9]') AS Kod,
    (SELECT STRING_AGG(b, N'') WITHIN GROUP (ORDER BY i) FROM harf WHERE b LIKE N'[0-9]') AS Rakam,
    (SELECT STRING_AGG(k, N'') WITHIN GROUP (ORDER BY i) FROM harf WHERE k LIKE N'[a-z0-9.]') AS GirisAdi,
    (SELECT CASE WHEN Ham LIKE N'+%' THEN 1 ELSE 0 END FROM girdi) AS Arti,
    (SELECT LOWER(Duz) FROM turkcesiz) AS Arama
), sifirsiz AS (
  SELECT Kod, Rakam, GirisAdi, Arti, Arama,
         REPLACE(LTRIM(REPLACE(Rakam, N'0', N' ')), N' ', N'0') AS RakamSifirsiz
  FROM parca
), tel AS (
  SELECT Kod, Rakam, GirisAdi, Arama, RakamSifirsiz,
    CASE
      WHEN Rakam IS NULL THEN NULL
      WHEN Arti = 1 THEN N'+' + Rakam
      WHEN Rakam LIKE N'00%' THEN N'+' + SUBSTRING(Rakam, 3, 400)
      WHEN Rakam LIKE N'90%' AND LEN(Rakam) = 12 THEN N'+' + Rakam
      WHEN LEN(RakamSifirsiz) = 10 THEN N'+90' + RakamSifirsiz
    END AS E164
  FROM sifirsiz
)
SELECT CAST(Kod AS nvarchar(400)) COLLATE Latin1_General_100_BIN2 AS Kod,
       CAST(Rakam AS nvarchar(400)) COLLATE Latin1_General_100_BIN2 AS Rakam,
       CAST(CASE WHEN LEN(E164) BETWEEN 8 AND 16 THEN E164 END AS nvarchar(16)) COLLATE Latin1_General_100_BIN2 AS TelefonE164,
       CAST(CASE WHEN E164 LIKE N'+90%' AND LEN(E164) = 13 THEN SUBSTRING(E164, 4, 10)
                 ELSE RakamSifirsiz END AS nvarchar(20)) COLLATE Latin1_General_100_BIN2 AS TelefonUlusal,
       CAST(GirisAdi AS nvarchar(400)) COLLATE Latin1_General_100_BIN2 AS GirisAdi,
       CAST(Arama AS nvarchar(400)) COLLATE Latin1_General_100_BIN2 AS Arama
FROM tel;
GO

EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'Sadelestir',
     @Metin = N'Kullanıcının yazdığı talep numarasını, seri numarasını, telefonu ve giriş adını tek biçime çevirir; tek satır döner. yardim ve yonetim prosedürleri girdiyi yalnız bu işlevle normalleştirir, API aynı kuralları uygular. Örnek: SELECT * FROM yardim.Sadelestir(N''SRV-26-00123''); → Kod = SRV2600123.';
EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'Sadelestir', @Alt = N'@Metin', @AltTuru = N'PARAMETER',
     @Metin = N'Normalleştirilecek serbest metin (en çok 400 karakter). NULL boş metin sayılır.';
EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'Sadelestir', @Alt = N'Kod',
     @Metin = N'Türkçe harfleri ASCII karşılığına çevrilmiş, büyük harfli, yalnız A-Z ve 0-9 kalan hâl. Talep numarası ve seri numarası bununla aranır (SRV-26-00123 → SRV2600123).';
EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'Sadelestir', @Alt = N'Rakam',
     @Metin = N'Metindeki rakamlar, sırası korunarak; rakam yoksa NULL.';
EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'Sadelestir', @Alt = N'TelefonE164',
     @Metin = N'Telefonun E.164 biçimi (+905321234567). 0 ile, 90 ile, 0090 ile ya da + ile yazılmış Türkiye numaraları tanınır; sonuç 8–16 karakter değilse NULL.';
EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'Sadelestir', @Alt = N'TelefonUlusal',
     @Metin = N'Türkiye numarasında ülke kodu atılmış 10 hane (5321234567); öteki durumlarda baştaki sıfırları atılmış rakamlar.';
EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'Sadelestir', @Alt = N'GirisAdi',
     @Metin = N'Giriş adının karşılaştırma biçimi: Türkçe harfler çevrilmiş, küçük harf, yalnız a-z, 0-9 ve nokta (IZMIR.Merkez → izmir.merkez).';
EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'Sadelestir', @Alt = N'Arama',
     @Metin = N'Ad aramasında kullanılan aksansız küçük harfli hâl; tablolardaki …Arama kolonlarıyla aynı dönüşüm (Bölüm 1.4.3).';
GO
