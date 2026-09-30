-- ÜRETİLDİ, elle düzenlemeyin
/* ==========================================================================
   T04 — şirket ve banka hesapları

   Üreten: tools/vt/tohum-uret.mjs (npm run vt -- tohum). Bu dosyayı elle
   düzenlemeyin: kaynak değişince yeniden üretilir ve el değişikliği
   kaybolur. Kaynağı değiştirin, sonra "npm run vt -- tohum" çalıştırın.

   1 şirket (paksan), 1 banka hesabı.

   Kaynak: src/marka/kimlik.js SIRKET, UYGULAMA, BANKA.hesaplar;
   şirket kodu tohum/kaynak/markalar.json. Tasarım: tasarim.md 5.2 T04.
   Hedef kaynaktaki şirket koduyla sınırlıdır. Kaynakta olmayan hesap
   Aktif = 0 olur, silinmez. VergiNo, VergiDairesi ve LogoFirmaNo kaynakta
   yok: eklemede boş yazılır, sonra tohum bu kolonlara dokunmaz.

   Araç betiği tek işlemde, sahip girişiyle çalıştırır (BEGIN/COMMIT
   burada yazılmaz). İkinci çalıştırmada hiçbir satır değişmez.
   ========================================================================== */

/* sirket.Sirket — 1 satır */

WITH hedef AS (SELECT * FROM sirket.Sirket WHERE Kod IN (N'paksan'))
MERGE hedef AS h
USING (
    SELECT CONVERT(nvarchar(20), v.Kod) AS Kod,
           CONVERT(nvarchar(100), v.Ad) AS Ad,
           CONVERT(nvarchar(50), v.KisaAd) AS KisaAd,
           CONVERT(nvarchar(250), v.Unvan) AS Unvan,
           CONVERT(nvarchar(100), v.UygulamaAdi) AS UygulamaAdi,
           CONVERT(smallint, v.KurulusYili) AS KurulusYili,
           CONVERT(nvarchar(11), v.VergiNo) AS VergiNo,
           CONVERT(nvarchar(100), v.VergiDairesi) AS VergiDairesi,
           CONVERT(smallint, v.LogoFirmaNo) AS LogoFirmaNo,
           CONVERT(nvarchar(30), v.TelefonMetni) AS TelefonMetni,
           CONVERT(nvarchar(30), v.IkinciTelefonMetni) AS IkinciTelefonMetni,
           CONVERT(nvarchar(30), v.FaksMetni) AS FaksMetni,
           CONVERT(nvarchar(254), v.Eposta) AS Eposta,
           CONVERT(nvarchar(200), v.SiteUrl) AS SiteUrl,
           CONVERT(nvarchar(100), v.SiteMetni) AS SiteMetni,
           CONVERT(nvarchar(500), v.Adres) AS Adres,
           CONVERT(nvarchar(500), v.IkinciAdres) AS IkinciAdres,
           CONVERT(nvarchar(16), v.TelefonE164) AS TelefonE164,
           CONVERT(nvarchar(15), v.TelefonUlusal) AS TelefonUlusal,
           CONVERT(nvarchar(16), v.IkinciTelefonE164) AS IkinciTelefonE164,
           CONVERT(nvarchar(15), v.IkinciTelefonUlusal) AS IkinciTelefonUlusal
    FROM (VALUES
        (N'paksan', N'PAKSAN Makina', N'PAKSAN', N'PAKSAN MAKİNA SANAYİ VE TİCARET A.Ş.', N'PAKSAN Connect', 1970, NULL, NULL, NULL, N'444 9 725', N'+90 266 733 90 90', N'+90 266 733 90 99', N'paksan@paksanmakina.com.tr', N'https://www.paksanmakina.com.tr', N'paksanmakina.com.tr', N'Bandırma – Bursa Karayolu 10. km, Bandırma / Balıkesir', N'Taştepe, Deri Organize Sanayi Bölgesi, 10900 Gönen / Balıkesir', N'+904449725', N'4449725', N'+902667339090', N'2667339090')
    ) AS v (Kod, Ad, KisaAd, Unvan, UygulamaAdi, KurulusYili, VergiNo, VergiDairesi, LogoFirmaNo, TelefonMetni, IkinciTelefonMetni, FaksMetni, Eposta, SiteUrl, SiteMetni, Adres, IkinciAdres, TelefonE164, TelefonUlusal, IkinciTelefonE164, IkinciTelefonUlusal)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.KisaAd COLLATE Latin1_General_100_BIN2, k.Unvan COLLATE Latin1_General_100_BIN2, k.UygulamaAdi COLLATE Latin1_General_100_BIN2, k.KurulusYili, k.TelefonMetni COLLATE Latin1_General_100_BIN2, k.IkinciTelefonMetni COLLATE Latin1_General_100_BIN2, k.FaksMetni COLLATE Latin1_General_100_BIN2, k.Eposta COLLATE Latin1_General_100_BIN2, k.SiteUrl COLLATE Latin1_General_100_BIN2, k.SiteMetni COLLATE Latin1_General_100_BIN2, k.Adres COLLATE Latin1_General_100_BIN2, k.IkinciAdres COLLATE Latin1_General_100_BIN2, k.TelefonE164 COLLATE Latin1_General_100_BIN2, k.TelefonUlusal COLLATE Latin1_General_100_BIN2, k.IkinciTelefonE164 COLLATE Latin1_General_100_BIN2, k.IkinciTelefonUlusal COLLATE Latin1_General_100_BIN2 EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.KisaAd COLLATE Latin1_General_100_BIN2, h.Unvan COLLATE Latin1_General_100_BIN2, h.UygulamaAdi COLLATE Latin1_General_100_BIN2, h.KurulusYili, h.TelefonMetni COLLATE Latin1_General_100_BIN2, h.IkinciTelefonMetni COLLATE Latin1_General_100_BIN2, h.FaksMetni COLLATE Latin1_General_100_BIN2, h.Eposta COLLATE Latin1_General_100_BIN2, h.SiteUrl COLLATE Latin1_General_100_BIN2, h.SiteMetni COLLATE Latin1_General_100_BIN2, h.Adres COLLATE Latin1_General_100_BIN2, h.IkinciAdres COLLATE Latin1_General_100_BIN2, h.TelefonE164 COLLATE Latin1_General_100_BIN2, h.TelefonUlusal COLLATE Latin1_General_100_BIN2, h.IkinciTelefonE164 COLLATE Latin1_General_100_BIN2, h.IkinciTelefonUlusal COLLATE Latin1_General_100_BIN2) THEN
    UPDATE SET Ad = k.Ad, KisaAd = k.KisaAd, Unvan = k.Unvan, UygulamaAdi = k.UygulamaAdi, KurulusYili = k.KurulusYili, TelefonMetni = k.TelefonMetni, IkinciTelefonMetni = k.IkinciTelefonMetni, FaksMetni = k.FaksMetni, Eposta = k.Eposta, SiteUrl = k.SiteUrl, SiteMetni = k.SiteMetni, Adres = k.Adres, IkinciAdres = k.IkinciAdres, TelefonE164 = k.TelefonE164, TelefonUlusal = k.TelefonUlusal, IkinciTelefonE164 = k.IkinciTelefonE164, IkinciTelefonUlusal = k.IkinciTelefonUlusal
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, KisaAd, Unvan, UygulamaAdi, KurulusYili, VergiNo, VergiDairesi, LogoFirmaNo, TelefonMetni, IkinciTelefonMetni, FaksMetni, Eposta, SiteUrl, SiteMetni, Adres, IkinciAdres, TelefonE164, TelefonUlusal, IkinciTelefonE164, IkinciTelefonUlusal)
    VALUES (k.Kod, k.Ad, k.KisaAd, k.Unvan, k.UygulamaAdi, k.KurulusYili, k.VergiNo, k.VergiDairesi, k.LogoFirmaNo, k.TelefonMetni, k.IkinciTelefonMetni, k.FaksMetni, k.Eposta, k.SiteUrl, k.SiteMetni, k.Adres, k.IkinciAdres, k.TelefonE164, k.TelefonUlusal, k.IkinciTelefonE164, k.IkinciTelefonUlusal);

/* sirket.BankaHesabi — 1 satır */

WITH hedef AS (SELECT * FROM sirket.BankaHesabi WHERE SirketKodu IN (N'paksan'))
MERGE hedef AS h
USING (
    SELECT CONVERT(nvarchar(20), v.SirketKodu) AS SirketKodu,
           CONVERT(nvarchar(34), v.Iban) AS Iban,
           CONVERT(nvarchar(100), v.BankaAdi) AS BankaAdi,
           CONVERT(nvarchar(100), v.SubeAdi) AS SubeAdi,
           CONVERT(nvarchar(250), v.HesapUnvani) AS HesapUnvani,
           CONVERT(smallint, v.Sira) AS Sira,
           CONVERT(nvarchar(3), v.ParaBirimiKodu) AS ParaBirimiKodu,
           CONVERT(bit, v.Aktif) AS Aktif
    FROM (VALUES
        (N'paksan', N'TR560001200156600010100019', N'Halkbank', N'17 Eylül', N'PAKSAN MAKİNA', 1, N'TRY', 1)
    ) AS v (SirketKodu, Iban, BankaAdi, SubeAdi, HesapUnvani, Sira, ParaBirimiKodu, Aktif)
) AS k
    ON h.SirketKodu = k.SirketKodu AND h.Iban = k.Iban
WHEN MATCHED AND EXISTS (SELECT k.BankaAdi COLLATE Latin1_General_100_BIN2, k.SubeAdi COLLATE Latin1_General_100_BIN2, k.HesapUnvani COLLATE Latin1_General_100_BIN2, k.Sira, k.ParaBirimiKodu COLLATE Latin1_General_100_BIN2, k.Aktif EXCEPT SELECT h.BankaAdi COLLATE Latin1_General_100_BIN2, h.SubeAdi COLLATE Latin1_General_100_BIN2, h.HesapUnvani COLLATE Latin1_General_100_BIN2, h.Sira, h.ParaBirimiKodu COLLATE Latin1_General_100_BIN2, h.Aktif) THEN
    UPDATE SET BankaAdi = k.BankaAdi, SubeAdi = k.SubeAdi, HesapUnvani = k.HesapUnvani, Sira = k.Sira, ParaBirimiKodu = k.ParaBirimiKodu, Aktif = k.Aktif
WHEN NOT MATCHED BY TARGET THEN
    INSERT (SirketKodu, Iban, BankaAdi, SubeAdi, HesapUnvani, Sira, ParaBirimiKodu, Aktif)
    VALUES (k.SirketKodu, k.Iban, k.BankaAdi, k.SubeAdi, k.HesapUnvani, k.Sira, k.ParaBirimiKodu, k.Aktif)
WHEN NOT MATCHED BY SOURCE AND h.Aktif = 1 THEN
    UPDATE SET Aktif = 0;
