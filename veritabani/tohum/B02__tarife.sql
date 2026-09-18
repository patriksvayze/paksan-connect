-- ÜRETİLDİ, elle düzenlemeyin
/* ==========================================================================
   B02 — hak ediş tarifesi (başlangıç değeri)

   Üreten: tools/vt/tohum-uret.mjs (npm run vt -- tohum). Bu dosyayı elle
   düzenlemeyin: kaynak değişince yeniden üretilir ve el değişikliği
   kaybolur. Kaynağı değiştirin, sonra "npm run vt -- tohum" çalıştırın.

   1 tarife: yol, bütün markalar, km başına.

   Kaynak: src/lib/servisKaydi.js TARIFE.yolKm; para birimi src/marka/katalog/para.js;
   geçerlilik başlangıcı tasarim.md 5.3 B02. Yalnız yoksa ekler: markasız bir
   yol tarifesi (açık ya da kapanmış) varsa hiçbir şey yazılmaz; tarifeyi
   PAKSAN değiştirir.

   Araç betiği tek işlemde, sahip girişiyle çalıştırır (BEGIN/COMMIT
   burada yazılmaz). İkinci çalıştırmada hiçbir satır değişmez.
   ========================================================================== */

/* hakedis.Tarife — 1 satır, yalnız eksikler eklenir */

INSERT INTO hakedis.Tarife (KalemTuruKodu, MarkaKodu, BirimKodu, BirimTutar, ParaBirimiKodu, GecerlilikBaslangicTarihi)
SELECT k.KalemTuruKodu, k.MarkaKodu, k.BirimKodu, k.BirimTutar, k.ParaBirimiKodu, k.GecerlilikBaslangicTarihi
FROM (
    SELECT CONVERT(nvarchar(40), v.KalemTuruKodu) AS KalemTuruKodu,
           CONVERT(nvarchar(20), v.MarkaKodu) AS MarkaKodu,
           CONVERT(nvarchar(40), v.BirimKodu) AS BirimKodu,
           CONVERT(decimal(18,2), v.BirimTutar) AS BirimTutar,
           CONVERT(nvarchar(3), v.ParaBirimiKodu) AS ParaBirimiKodu,
           CONVERT(date, v.GecerlilikBaslangicTarihi) AS GecerlilikBaslangicTarihi
    FROM (VALUES
        (N'yol', NULL, N'km', 12, N'TRY', N'2026-01-01')
    ) AS v (KalemTuruKodu, MarkaKodu, BirimKodu, BirimTutar, ParaBirimiKodu, GecerlilikBaslangicTarihi)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM hakedis.Tarife AS h WHERE h.KalemTuruKodu = k.KalemTuruKodu AND ((h.MarkaKodu IS NULL AND k.MarkaKodu IS NULL) OR h.MarkaKodu = k.MarkaKodu));
