/* ==========================================================================
   R06 — gorunum şemasının görünümleri

   tasarim.md Bölüm 3.1 (ortak kurallar), 3.2 (görünüm sözleşmeleri),
   1.8 (Türkiye saati), 1.9 (para), 4.2 (rol_rapor izinleri).

   Sıra: Bugun → kartlar ve listeler → kontrol → mutabakat. Başka görünüme
   bakan görünüm ondan sonra gelir. gorunum.GecerliAyar ve alan
   görünümleri (makine.MakineGuncelSahibi, MakineninBayisi,
   MakineninServisi, MakineGarantisi, kvkk.GuncelRiza) R03'tedir.

   Ortak kurallar:
   - uniqueidentifier kolon yok; satırın anahtarı KayitNo, bağlı kaydınki
     <Varlik>KayitNo.
   - Kodun yanında kod tablosunun Ad'ı; görünümde sabit Türkçe metin yok.
   - Numara ekranda ABC-YY-SSSSS biçiminde (<Tur>Numarasi).
   - Zaman …ZamaniTurkiye (datetime2(0)) ve …Tarihi (Türkiye günü);
     UTC …Zamani kolonu gösterilmez.
   - Farklı para birimleri toplanmaz; her toplam ParaBirimiKodu ile gruplanır.

   Her görünümün ve kolonunun açıklaması aynı toplu işte dbo.AciklamaYaz
   ile yazılır. Dinamik SQL yoktur.
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. gorunum.Bugun
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.Bugun
AS
SELECT b.Tarih,
       DATEFROMPARTS(YEAR(b.Tarih), MONTH(b.Tarih), 1) AS AyBasi,
       DATEADD(day, -(DATEDIFF(day, CONVERT(date, '19000101', 112), b.Tarih) % 7), b.Tarih) AS HaftaBasi,
       DATEFROMPARTS(YEAR(b.Tarih), 1, 1) AS YilBasi,
       b.SimdiTurkiye
FROM (
    SELECT CONVERT(date, SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS Tarih,
           CONVERT(datetime2(0), SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS SimdiTurkiye
) AS b;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Türkiye saatine göre bugünün tek satırı. Bütün görünümler gün, hafta, ay ve yıl sınırını buradan ya da tasarim.md 1.8 ifadelerinden alır. Örnek: SELECT * FROM gorunum.TalepListesi WHERE OlusmaTarihi >= (SELECT AyBasi FROM gorunum.Bugun);'),
 (N'Tarih', N'Türkiye günü olarak bugün.'),
 (N'AyBasi', N'Bu ayın ilk günü (Türkiye).'),
 (N'HaftaBasi', N'Bu haftanın pazartesi günü (Türkiye).'),
 (N'YilBasi', N'Bu yılın ilk günü (Türkiye).'),
 (N'SimdiTurkiye', N'Şu an, Türkiye saatiyle (saniyeye yuvarlanmış).');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'Bugun', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   2. gorunum.TalepListesi
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.TalepListesi
AS
SELECT
    LEFT(t.Numara, 3) + N'-' + SUBSTRING(t.Numara, 4, 2) + N'-' + RIGHT(t.Numara, 5) AS TalepNumarasi,
    t.Numara,
    t.TurKodu,
    tt.Ad AS TurAdi,
    t.KaynakKodu,
    tk.Ad AS KaynakAdi,
    t.DurumKodu,
    td.Ad AS DurumAdi,
    t.Kapali,
    CAST(CASE WHEN t.Kapali = 0
                   AND td.GecikmeSayilir = 1
                   AND gs.Saat IS NOT NULL
                   AND DATEDIFF(minute, t.OlusmaZamani, SYSUTCDATETIME()) > 60 * gs.Saat
              THEN 1 ELSE 0 END AS bit) AS Gecikti,
    CAST(CASE WHEN t.DurumKodu = N'teklif'
                   AND tb.Gun IS NOT NULL
                   AND DATEDIFF(minute, COALESCE(st.OlusmaZamani, t.OlusmaZamani), SYSUTCDATETIME()) > 1440 * tb.Gun
              THEN 1 ELSE 0 END AS bit) AS TeklifBekliyor,
    t.SahipKodu,
    sh.Ad AS SahipAdi,
    t.MasaKodu,
    ms.Ad AS MasaAdi,
    t.MarkaKodu,
    mr.Ad AS MarkaAdi,
    COALESCE(hs.AdSoyad, t.IletisimAdi) AS MusteriAdi,
    COALESCE(h.TelefonE164, t.IletisimTelefonE164) AS MusteriTelefonu,
    h.KayitNo AS HesapKayitNo,
    u.Ad AS UlkeAdi,
    t.IlKodu,
    il.Ad AS IlAdi,
    ilc.Ad AS IlceAdi,
    t.YurtdisiBolge,
    t.Ihracat,
    ur.Ad AS UrunAdi,
    mk.SeriNo,
    sv.Ad AS ServisAdi,
    sv.KayitNo AS ServisKayitNo,
    ba.BayiAdi,
    CONVERT(datetime2(0), t.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OlusmaZamaniTurkiye,
    CONVERT(date, t.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OlusmaTarihi,
    CONVERT(datetime2(0), t.GuncellemeZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS GuncellemeZamaniTurkiye,
    CONVERT(datetime2(0), t.KapanmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS KapanmaZamaniTurkiye,
    CONVERT(date, t.KapanmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS KapanmaTarihi,
    ya.Ad AS OlusturanTuruAdi,
    t.YapanAdi AS OlusturanAdi,
    ku.Ad AS KaynakUygulamaAdi,
    t.EskiNumara,
    t.CihazNumarasi,
    t.KayitNo
FROM talep.Talep AS t
JOIN kod.TalepTuru AS tt ON tt.Kod = t.TurKodu
JOIN kod.TalepKaynagi AS tk ON tk.Kod = t.KaynakKodu
JOIN kod.TalepDurumu AS td ON td.Kod = t.DurumKodu
JOIN kod.Sahip AS sh ON sh.Kod = t.SahipKodu
LEFT JOIN kod.Masa AS ms ON ms.Kod = t.MasaKodu
JOIN katalog.Marka AS mr ON mr.Kod = t.MarkaKodu
JOIN kod.AktorTuru AS ya ON ya.Kod = t.YapanTuruKodu
JOIN kod.KaynakUygulama AS ku ON ku.Kod = t.KaynakUygulamaKodu
LEFT JOIN musteri.Hesap AS h ON h.Kimlik = t.HesapKimlik
OUTER APPLY (
    SELECT TOP (1) NULLIF(CONCAT_WS(N' ', k.Adi, k.Soyadi), N'') AS AdSoyad
    FROM musteri.HesapKisisi AS k
    WHERE k.HesapKimlik = t.HesapKimlik
      AND k.RolKodu = N'hesapSahibi'
      AND k.PasifZamani IS NULL
    ORDER BY k.OlusmaZamani DESC
) AS hs
LEFT JOIN cografya.Ulke AS u ON u.Kod = t.KonumUlkeKodu
LEFT JOIN cografya.Il AS il ON il.IlKodu = t.IlKodu
LEFT JOIN cografya.Ilce AS ilc ON ilc.IlceKodu = t.IlceKodu
LEFT JOIN makine.Makine AS mk ON mk.Kimlik = t.MakineKimlik
LEFT JOIN katalog.Urun AS ur ON ur.MarkaKodu = mk.MarkaKodu AND ur.Kod = mk.UrunKodu
LEFT JOIN servis.Servis AS sv ON sv.Kimlik = t.ServisKimlik
OUTER APPLY (
    SELECT TOP (1) b.Ad AS BayiAdi
    FROM talep.BayiAtamasi AS a
    JOIN bayi.Bayi AS b ON b.Kimlik = a.BayiKimlik
    WHERE a.TalepKimlik = t.Kimlik
      AND a.KaldirilmaZamani IS NULL
    ORDER BY a.OlusmaZamani DESC
) AS ba
OUTER APPLY (
    SELECT TOP (1) x.OlusmaZamani
    FROM talep.Teklif AS x
    WHERE x.TalepKimlik = t.Kimlik
    ORDER BY x.OlusmaZamani DESC
) AS st
/* gorunum.GecerliAyar marka satırı: (Anahtar, MarkaKodu) başına tek satır,
   değer marka → şirket → genel sırasıyla düşmüş. Değer boşsa (karar
   bekleniyor) işaret 0 kalır. */
LEFT JOIN (
    SELECT g.MarkaKodu, TRY_CONVERT(int, g.Deger) AS Saat
    FROM gorunum.GecerliAyar AS g
    WHERE g.Anahtar = N'TalepGecikmeSaati'
      AND g.MarkaKodu IS NOT NULL
) AS gs ON gs.MarkaKodu = t.MarkaKodu
LEFT JOIN (
    SELECT g.MarkaKodu, TRY_CONVERT(int, g.Deger) AS Gun
    FROM gorunum.GecerliAyar AS g
    WHERE g.Anahtar = N'TeklifBeklemeGunu'
      AND g.MarkaKodu IS NOT NULL
) AS tb ON tb.MarkaKodu = t.MarkaKodu;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Talebin tek satırlık tam özeti (bütün türler). Müşteri adı ve telefonu içerir; rapor rolüne açık değildir (iletişimsiz hâli gorunum.TalepIstatistigi). Müşteri adı etkin hesap sahibinden, hesapsız talepte talebin iletişim adından; telefon hesabın güncel telefonundan, yoksa talebin iletişim telefonundan gelir. Gecikti ve TeklifBekliyor eşikleri gorunum.GecerliAyar''dan (TalepGecikmeSaati, TeklifBeklemeGunu; talebin markası) okunur. Örnek: SELECT * FROM gorunum.TalepListesi WHERE Numara = (SELECT Kod FROM yardim.Sadelestir(N''srv-26-00123''));'),
 (N'TalepNumarasi', N'Ekranda görünen numara (SRV-26-00123).'),
 (N'Numara', N'Saklanan numara (SRV2600123); süzerken yardim.Sadelestir(...).Kod ile karşılaştırın.'),
 (N'TurKodu', N'kod.TalepTuru kodu.'),
 (N'TurAdi', N'Talep türünün adı.'),
 (N'KaynakKodu', N'kod.TalepKaynagi kodu.'),
 (N'KaynakAdi', N'Talep kaynağının adı.'),
 (N'DurumKodu', N'kod.TalepDurumu kodu.'),
 (N'DurumAdi', N'Durumun adı.'),
 (N'Kapali', N'1: talep kapalı (kapandı ya da iptal).'),
 (N'Gecikti', N'1: açık, durumu gecikme sayılan ve TalepGecikmeSaati ayarından uzun süredir bekleyen talep (veri.js gecikmisMi).'),
 (N'TeklifBekliyor', N'1: teklif durumunda ve son tekliften (yoksa talepten) bu yana TeklifBeklemeGunu ayarından fazla gün geçmiş (veri.js teklifBekliyorMu).'),
 (N'SahipKodu', N'kod.Sahip kodu (işin kimde olduğu).'),
 (N'SahipAdi', N'Sahibin adı.'),
 (N'MasaKodu', N'kod.Masa kodu; boş olabilir.'),
 (N'MasaAdi', N'Masanın adı.'),
 (N'MarkaKodu', N'katalog.Marka kodu.'),
 (N'MarkaAdi', N'Markanın adı.'),
 (N'MusteriAdi', N'Etkin hesap sahibinin adı soyadı; hesapsız talepte (ya da hesap sahibinin adı boşsa) talep formundaki iletişim adı.'),
 (N'MusteriTelefonu', N'Hesabın güncel telefonu (E.164); hesapsız talepte (ya da hesabın telefonu boşsa) talep formundaki iletişim telefonu.'),
 (N'HesapKayitNo', N'Müşteri hesabının KayitNo''su (gorunum.MusteriKarti).'),
 (N'UlkeAdi', N'Talebin konum ülkesi.'),
 (N'IlKodu', N'İl plaka kodu.'),
 (N'IlAdi', N'İl adı.'),
 (N'IlceAdi', N'İlçe adı.'),
 (N'YurtdisiBolge', N'Yurt dışı talepte bölge.'),
 (N'Ihracat', N'1: ihracat talebi.'),
 (N'UrunAdi', N'Talebe bağlı makinenin ürün adı.'),
 (N'SeriNo', N'Makinenin seri numarası (saklandığı gibi).'),
 (N'ServisAdi', N'Talebe atanmış servis.'),
 (N'ServisKayitNo', N'Servisin KayitNo''su (gorunum.ServisKarti).'),
 (N'BayiAdi', N'Talebin etkin bayi ataması (en son).'),
 (N'OlusmaZamaniTurkiye', N'Talebin oluştuğu an, Türkiye saati.'),
 (N'OlusmaTarihi', N'Talebin oluştuğu Türkiye günü.'),
 (N'GuncellemeZamaniTurkiye', N'Son güncelleme anı, Türkiye saati.'),
 (N'KapanmaZamaniTurkiye', N'Kapanma anı, Türkiye saati.'),
 (N'KapanmaTarihi', N'Kapanma Türkiye günü.'),
 (N'OlusturanTuruAdi', N'Talebi oluşturan aktör türü.'),
 (N'OlusturanAdi', N'Talebi oluşturan personel ya da servisin o anki adı; müşteride boş.'),
 (N'KaynakUygulamaAdi', N'Talebin oluşturulduğu uygulama.'),
 (N'EskiNumara', N'Eski sistemdeki 13 karakterlik numara.'),
 (N'CihazNumarasi', N'Cihazın ürettiği numara.'),
 (N'KayitNo', N'Talebin KayitNo''su.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'TalepListesi', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   3. gorunum.TalepIstatistigi (iletişim verisi yok; rapor rolüne açık)
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.TalepIstatistigi
AS
SELECT
    l.TalepNumarasi,
    l.TurAdi,
    l.KaynakAdi,
    l.DurumAdi,
    l.Kapali,
    l.Gecikti,
    l.SahipAdi,
    l.MasaAdi,
    l.MarkaAdi,
    l.UrunAdi,
    l.UlkeAdi,
    l.IlAdi,
    l.IlceAdi,
    l.Ihracat,
    l.OlusmaTarihi,
    l.KapanmaTarihi,
    sk.KapanisTuruAdi AS SonKapanisTuruAdi,
    si.IptalNedeniAdi AS SonIptalKoduAdi,
    l.KaynakUygulamaAdi,
    p.GenelToplam AS ParcaGenelToplami,
    p.OdenecekTutar,
    p.ParaBirimiKodu
FROM gorunum.TalepListesi AS l
JOIN talep.Talep AS t ON t.KayitNo = l.KayitNo
LEFT JOIN talep.ParcaTalebiAyrinti AS p ON p.TalepKimlik = t.Kimlik
OUTER APPLY (
    SELECT TOP (1) kt.Ad AS KapanisTuruAdi
    FROM talep.Kapanis AS k
    JOIN kod.KapanisTuru AS kt ON kt.Kod = k.KapanisTuruKodu
    WHERE k.TalepKimlik = t.Kimlik
    ORDER BY k.OlusmaZamani DESC, k.KayitNo DESC
) AS sk
OUTER APPLY (
    SELECT TOP (1) inn.Ad AS IptalNedeniAdi
    FROM talep.Iptal AS x
    JOIN kod.IptalNedeni AS inn ON inn.Kod = x.IptalNedeniKodu
    WHERE x.TalepKimlik = t.Kimlik
    ORDER BY x.OlusmaZamani DESC, x.KayitNo DESC
) AS si;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'İletişim verisi içermeyen talep listesi; Excel/BI bağlantısı (rol_rapor) bunu okur. Kolonlar gorunum.TalepListesi''nden gelir; ek olarak son kapanış türü, son iptal nedeni ve yedek parça talebinin tutarları. Örnek: SELECT MarkaAdi, COUNT(*) FROM gorunum.TalepIstatistigi WHERE OlusmaTarihi >= (SELECT AyBasi FROM gorunum.Bugun) GROUP BY MarkaAdi;'),
 (N'TalepNumarasi', N'Ekranda görünen numara (SRV-26-00123).'),
 (N'TurAdi', N'Talep türünün adı.'),
 (N'KaynakAdi', N'Talep kaynağının adı.'),
 (N'DurumAdi', N'Durumun adı.'),
 (N'Kapali', N'1: talep kapalı.'),
 (N'Gecikti', N'1: gecikmiş açık talep (gorunum.TalepListesi ile aynı kural).'),
 (N'SahipAdi', N'İşin kimde olduğu.'),
 (N'MasaAdi', N'Masanın adı.'),
 (N'MarkaAdi', N'Markanın adı.'),
 (N'UrunAdi', N'Makinenin ürün adı.'),
 (N'UlkeAdi', N'Konum ülkesi.'),
 (N'IlAdi', N'İl adı.'),
 (N'IlceAdi', N'İlçe adı.'),
 (N'Ihracat', N'1: ihracat talebi.'),
 (N'OlusmaTarihi', N'Talebin oluştuğu Türkiye günü.'),
 (N'KapanmaTarihi', N'Kapanma Türkiye günü.'),
 (N'SonKapanisTuruAdi', N'En son talep.Kapanis satırının kapanış türü.'),
 (N'SonIptalKoduAdi', N'En son talep.Iptal satırının kod.IptalNedeni listesindeki adı. Kolon adında "Nedeni" geçmez: bu görünüm rapor rolüne açıktır ve CD-RAPOR-KOLON denetimi o kelimeyi serbest metin işareti sayar (tasarim.md 4.2). Buradaki değer serbest metin değil, kapalı kod listesinin etiketidir; serbest metin iptal açıklaması yardim.TalepGoster''dedir.'),
 (N'KaynakUygulamaAdi', N'Talebin oluşturulduğu uygulama.'),
 (N'ParcaGenelToplami', N'Yedek parça talebinde müşterinin gördüğü KDV dahil genel toplam.'),
 (N'OdenecekTutar', N'Yedek parça talebinde PAKSAN''ın doğruladığı, KDV ve kargo dahil son tutar.'),
 (N'ParaBirimiKodu', N'Parça tutarlarının para birimi.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'TalepIstatistigi', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   4. gorunum.TalepDurumGecmisi
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.TalepDurumGecmisi
AS
SELECT
    LEFT(t.Numara, 3) + N'-' + SUBSTRING(t.Numara, 4, 2) + N'-' + RIGHT(t.Numara, 5) AS TalepNumarasi,
    CONVERT(datetime2(0), g.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
    CONVERT(date, g.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS Tarihi,
    od.Ad AS OncekiDurumAdi,
    yd.Ad AS YeniDurumAdi,
    osh.Ad AS OncekiSahipAdi,
    ysh.Ad AS YeniSahipAdi,
    oms.Ad AS OncekiMasaAdi,
    yms.Ad AS YeniMasaAdi,
    g.MusteriyeBildirildi,
    ya.Ad AS YapanTuruAdi,
    g.YapanAdi,
    ku.Ad AS KaynakUygulamaAdi,
    g.KayitNo
FROM talep.DurumGecmisi AS g
JOIN talep.Talep AS t ON t.Kimlik = g.TalepKimlik
LEFT JOIN kod.TalepDurumu AS od ON od.Kod = g.OncekiDurumKodu
JOIN kod.TalepDurumu AS yd ON yd.Kod = g.YeniDurumKodu
LEFT JOIN kod.Sahip AS osh ON osh.Kod = g.OncekiSahipKodu
LEFT JOIN kod.Sahip AS ysh ON ysh.Kod = g.YeniSahipKodu
LEFT JOIN kod.Masa AS oms ON oms.Kod = g.OncekiMasaKodu
LEFT JOIN kod.Masa AS yms ON yms.Kod = g.YeniMasaKodu
JOIN kod.AktorTuru AS ya ON ya.Kod = g.YapanTuruKodu
JOIN kod.KaynakUygulama AS ku ON ku.Kod = g.KaynakUygulamaKodu;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Talebin durum, sahip ve masa değişiklikleri (talep.DurumGecmisi; tetikleyici yazar). Örnek: SELECT * FROM gorunum.TalepDurumGecmisi WHERE TalepNumarasi = N''SRV-26-00123'' ORDER BY KayitNo;'),
 (N'TalepNumarasi', N'Ekranda görünen talep numarası.'),
 (N'ZamanTurkiye', N'Değişikliğin anı, Türkiye saati.'),
 (N'Tarihi', N'Değişikliğin Türkiye günü.'),
 (N'OncekiDurumAdi', N'Önceki durum; talebin ilk satırında boş.'),
 (N'YeniDurumAdi', N'Yeni durum.'),
 (N'OncekiSahipAdi', N'Önceki sahip.'),
 (N'YeniSahipAdi', N'Yeni sahip.'),
 (N'OncekiMasaAdi', N'Önceki masa.'),
 (N'YeniMasaAdi', N'Yeni masa.'),
 (N'MusteriyeBildirildi', N'1: değişiklik müşteriye bildirildi.'),
 (N'YapanTuruAdi', N'Değişikliği yapan aktör türü.'),
 (N'YapanAdi', N'Yapan personel ya da servisin o anki adı; müşteride boş.'),
 (N'KaynakUygulamaAdi', N'Değişikliğin geldiği uygulama.'),
 (N'KayitNo', N'Geçmiş satırının KayitNo''su (sıra).');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'TalepDurumGecmisi', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   5. gorunum.MusteriKarti
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.MusteriKarti
AS
SELECT
    h.KayitNo AS HesapKayitNo,
    h.DurumKodu AS HesapDurumu,
    h.TelefonE164 AS Telefon,
    hs.AdSoyad AS HesapSahibiAdi,
    yk.YetkiliKisiler,
    u.Ad AS UlkeAdi,
    il.Ad AS IlAdi,
    ilc.Ad AS IlceAdi,
    h.Adres,
    h.SaticiBeyani,
    bb.Ad AS BeyanBayiAdi,
    dl.Ad AS DilAdi,
    ISNULL(mk.MakineSayisi, 0) AS MakineSayisi,
    ISNULL(tl.AcikTalepSayisi, 0) AS AcikTalepSayisi,
    ISNULL(tl.ToplamTalepSayisi, 0) AS ToplamTalepSayisi,
    bh.KayitNo AS BirlestigiHesapKayitNo,
    ISNULL(bs.BirlesenHesapSayisi, 0) AS BirlesenHesapSayisi,
    ck.CariKodlari,
    rs.Ad AS TicariIletiSecimi,
    CONVERT(datetime2(0), h.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OlusmaZamaniTurkiye,
    CONVERT(datetime2(0), h.SonGirisZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS SonGirisZamaniTurkiye,
    CONVERT(datetime2(0), h.AnonimlestirmeZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS AnonimlestirmeZamaniTurkiye,
    h.EskiNumara
FROM musteri.Hesap AS h
OUTER APPLY (
    SELECT TOP (1) NULLIF(CONCAT_WS(N' ', k.Adi, k.Soyadi), N'') AS AdSoyad
    FROM musteri.HesapKisisi AS k
    WHERE k.HesapKimlik = h.Kimlik
      AND k.RolKodu = N'hesapSahibi'
      AND k.PasifZamani IS NULL
    ORDER BY k.OlusmaZamani DESC
) AS hs
OUTER APPLY (
    /* STRING_AGG girdisi nvarchar(max): uzun listede 8000 bayt sınırı sorguyu durdurmasın. */
    SELECT STRING_AGG(CAST(CONCAT_WS(N' ', k.Adi, k.Soyadi, k.TelefonE164 COLLATE Turkish_100_CI_AS) AS nvarchar(max)), N'; ')
               WITHIN GROUP (ORDER BY k.OlusmaZamani) AS YetkiliKisiler
    FROM musteri.HesapKisisi AS k
    WHERE k.HesapKimlik = h.Kimlik
      AND k.RolKodu <> N'hesapSahibi'
      AND k.PasifZamani IS NULL
) AS yk
LEFT JOIN cografya.Ulke AS u ON u.Kod = h.KonumUlkeKodu
LEFT JOIN cografya.Il AS il ON il.IlKodu = h.IlKodu
LEFT JOIN cografya.Ilce AS ilc ON ilc.IlceKodu = h.IlceKodu
LEFT JOIN bayi.Bayi AS bb ON bb.Kimlik = h.BeyanBayiKimlik
LEFT JOIN kod.Dil AS dl ON dl.Kod = h.DilKodu
LEFT JOIN musteri.Hesap AS bh ON bh.Kimlik = h.BirlestigiHesapKimlik
OUTER APPLY (
    SELECT COUNT(*) AS MakineSayisi
    FROM makine.MakineGuncelSahibi AS s
    WHERE s.HesapKimlik = h.Kimlik
) AS mk
OUTER APPLY (
    SELECT COUNT(*) AS ToplamTalepSayisi,
           SUM(CASE WHEN t.Kapali = 0 THEN 1 ELSE 0 END) AS AcikTalepSayisi
    FROM talep.Talep AS t
    WHERE t.HesapKimlik = h.Kimlik
) AS tl
OUTER APPLY (
    SELECT COUNT(*) AS BirlesenHesapSayisi
    FROM musteri.Hesap AS x
    WHERE x.BirlestigiHesapKimlik = h.Kimlik
) AS bs
OUTER APPLY (
    SELECT STRING_AGG(CAST(c.CariKodu AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY c.CariKodu) AS CariKodlari
    FROM entegrasyon.CariKarti AS c
    WHERE c.HesapKimlik = h.Kimlik
      AND c.Aktif = 1
) AS ck
LEFT JOIN kvkk.GuncelRiza AS gr ON gr.HesapKimlik = h.Kimlik AND gr.MetinKodu = N'ticariIleti'
LEFT JOIN kod.RizaSecimi AS rs ON rs.Kod = gr.SecimKodu;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Müşteri hesabının tek satırı: kişiler, konum, makine ve talep sayıları, birleşme, LOGO cari kodları, ticari ileti seçimi. Kişisel veri içerir; rapor rolüne açık değildir. Hesabı telefonla bulmak için: SELECT * FROM gorunum.MusteriKarti WHERE Telefon = (SELECT TelefonE164 FROM yardim.Sadelestir(N''0532 123 45 67'')); eski telefonlar ve zincir için yardim.MusteriGoster.'),
 (N'HesapKayitNo', N'Hesabın KayitNo''su.'),
 (N'HesapDurumu', N'Hesap durumu kodu: aktif, kapali, anonim, birlestirildi.'),
 (N'Telefon', N'Hesabın güncel telefonu (E.164).'),
 (N'HesapSahibiAdi', N'Etkin hesap sahibinin adı soyadı.'),
 (N'YetkiliKisiler', N'Hesap sahibi dışındaki etkin kişiler: ad soyad ve telefon, noktalı virgülle.'),
 (N'UlkeAdi', N'Konum ülkesi.'),
 (N'IlAdi', N'İl adı.'),
 (N'IlceAdi', N'İlçe adı.'),
 (N'Adres', N'Hesabın adresi.'),
 (N'SaticiBeyani', N'Müşterinin makineyi aldığı yer için yazdığı beyan.'),
 (N'BeyanBayiAdi', N'Müşterinin seçtiği bayi.'),
 (N'DilAdi', N'Uygulama dili.'),
 (N'MakineSayisi', N'Hesabın açık sahipliği olan makine sayısı.'),
 (N'AcikTalepSayisi', N'Hesabın açık talep sayısı.'),
 (N'ToplamTalepSayisi', N'Hesabın bütün talepleri.'),
 (N'BirlestigiHesapKayitNo', N'Hesap birleştirildiyse birleştiği hesabın KayitNo''su.'),
 (N'BirlesenHesapSayisi', N'Bu hesaba birleştirilmiş hesap sayısı.'),
 (N'CariKodlari', N'Hesabın etkin LOGO cari kodları, virgülle.'),
 (N'TicariIletiSecimi', N'Ticari ileti metnine verilen en son rıza seçiminin adı (kvkk.GuncelRiza).'),
 (N'OlusmaZamaniTurkiye', N'Hesabın açıldığı an, Türkiye saati.'),
 (N'SonGirisZamaniTurkiye', N'Son giriş anı, Türkiye saati.'),
 (N'AnonimlestirmeZamaniTurkiye', N'Anonimleştirme anı, Türkiye saati; boşsa anonimleştirilmedi.'),
 (N'EskiNumara', N'Eski sistemdeki numara.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'MusteriKarti', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   6. gorunum.MakineKarti
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.MakineKarti
AS
SELECT
    m.KayitNo AS MakineKayitNo,
    m.MarkaKodu,
    mr.Ad AS MarkaAdi,
    m.SeriNo,
    m.SeriBicimeUygun,
    ur.Ad AS UrunAdi,
    vr.Ad AS VaryantAdi,
    COALESCE(CAST(YEAR(m.UretimTarihi) AS smallint), m.SeridenUretimYili) AS UretimYili,
    COALESCE(hs.AdSoyad, CASE WHEN gs.HesapKimlik IS NULL THEN ko.BeyanAdi END) AS SahibiAdi,
    h.TelefonE164 AS SahibiTelefonu,
    CAST(CASE WHEN gs.HesapKimlik IS NOT NULL THEN N'hesap'
              WHEN ko.BeyanAdi IS NOT NULL THEN N'kayitBeyani' END AS nvarchar(20)) AS SahipBilgisininKaynagi,
    h.KayitNo AS SahibiHesapKayitNo,
    CONVERT(date, gs.BaslangicZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS SahiplikBaslangicTarihi,
    b.Ad AS BayiAdi,
    b.KayitNo AS BayiKayitNo,
    sv.Ad AS ServisAdi,
    sv.KayitNo AS ServisKayitNo,
    sak.Ad AS ServisKaynagiAdi,
    mb.FaturaTarihi AS BayiFaturaTarihi,
    sat.TeslimTarihi,
    gd.Ad AS GarantiDayanagiAdi,
    mg.BaslangicTarihi AS GarantiBaslangicTarihi,
    mg.BitisTarihi AS GarantiBitisTarihi,
    CAST(CASE WHEN mg.BaslangicTarihi <= bg.Tarih AND mg.BitisTarihi >= bg.Tarih THEN 1 ELSE 0 END AS bit) AS Garantide,
    m.LogoMalzemeKodu,
    ISNULL(at.AcikTalepSayisi, 0) AS AcikTalepSayisi,
    CONVERT(datetime2(0), m.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OlusmaZamaniTurkiye
FROM makine.Makine AS m
CROSS JOIN gorunum.Bugun AS bg
JOIN katalog.Marka AS mr ON mr.Kod = m.MarkaKodu
LEFT JOIN katalog.Urun AS ur ON ur.MarkaKodu = m.MarkaKodu AND ur.Kod = m.UrunKodu
LEFT JOIN katalog.UrunVaryanti AS vr ON vr.MarkaKodu = m.MarkaKodu AND vr.UrunKodu = m.UrunKodu AND vr.Kod = m.VaryantKodu
LEFT JOIN makine.MakineGuncelSahibi AS gs ON gs.MakineKimlik = m.Kimlik
LEFT JOIN musteri.Hesap AS h ON h.Kimlik = gs.HesapKimlik
OUTER APPLY (
    SELECT TOP (1) NULLIF(CONCAT_WS(N' ', k.Adi, k.Soyadi), N'') AS AdSoyad
    FROM musteri.HesapKisisi AS k
    WHERE k.HesapKimlik = gs.HesapKimlik
      AND k.RolKodu = N'hesapSahibi'
      AND k.PasifZamani IS NULL
    ORDER BY k.OlusmaZamani DESC
) AS hs
OUTER APPLY (
    SELECT TOP (1) o.BeyanAdi
    FROM makine.KayitOlayi AS o
    WHERE o.MakineKimlik = m.Kimlik
      AND o.BeyanAdi IS NOT NULL
    ORDER BY o.OlusmaZamani DESC, o.KayitNo DESC
) AS ko
LEFT JOIN makine.MakineninBayisi AS mb ON mb.MakineKimlik = m.Kimlik
LEFT JOIN bayi.Bayi AS b ON b.Kimlik = mb.BayiKimlik
LEFT JOIN makine.MakineSatisi AS sat ON sat.Kimlik = mb.MakineSatisiKimlik
LEFT JOIN makine.MakineninServisi AS ms ON ms.MakineKimlik = m.Kimlik
LEFT JOIN servis.Servis AS sv ON sv.Kimlik = ms.ServisKimlik
LEFT JOIN kod.ServisAtamaKaynagi AS sak ON sak.Kod = ms.ServisKaynagiKodu COLLATE Latin1_General_100_BIN2
LEFT JOIN makine.MakineGarantisi AS mg ON mg.MakineKimlik = m.Kimlik
LEFT JOIN kod.GarantiDayanagi AS gd ON gd.Kod = mg.GarantiDayanagiKodu COLLATE Latin1_General_100_BIN2
OUTER APPLY (
    SELECT COUNT(*) AS AcikTalepSayisi
    FROM talep.Talep AS t
    WHERE t.MakineKimlik = m.Kimlik
      AND t.Kapali = 0
) AS at;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Makinenin tek satırı: sahibi, bayisi, servisi (makine.MakineninServisi zinciri), garantisi. Kişisel veri içerir; rapor rolüne açık değildir. Örnek: SELECT * FROM gorunum.MakineKarti WHERE SeriNo = (SELECT Kod FROM yardim.Sadelestir(N''ork1270-2024-00157''));'),
 (N'MakineKayitNo', N'Makinenin KayitNo''su.'),
 (N'MarkaKodu', N'katalog.Marka kodu.'),
 (N'MarkaAdi', N'Markanın adı.'),
 (N'SeriNo', N'Seri numarası (saklandığı gibi: büyük harf, tiresiz).'),
 (N'SeriBicimeUygun', N'1: seri numarası markanın seri kuralına uyuyor; 0: uymuyor; boş: denetlenmedi.'),
 (N'UrunAdi', N'Ürün adı.'),
 (N'VaryantAdi', N'Varyant adı.'),
 (N'UretimYili', N'Üretim tarihinin yılı; yoksa seri numarasından okunan yıl.'),
 (N'SahibiAdi', N'Açık sahipliği olan hesabın sahibi; hesap yoksa son kayıt olayındaki beyan adı.'),
 (N'SahibiTelefonu', N'Sahip hesabın güncel telefonu (E.164).'),
 (N'SahipBilgisininKaynagi', N'hesap: açık sahiplik; kayitBeyani: yalnız kayıt olayındaki beyan; boş: bilgi yok.'),
 (N'SahibiHesapKayitNo', N'Sahip hesabın KayitNo''su.'),
 (N'SahiplikBaslangicTarihi', N'Açık sahipliğin başladığı Türkiye günü.'),
 (N'BayiAdi', N'Makineyi satan bayi (makine.MakineninBayisi).'),
 (N'BayiKayitNo', N'Bayinin KayitNo''su.'),
 (N'ServisAdi', N'Müşterinin servisi (makine.MakineninServisi); boşsa müşteri servis talebi açamaz.'),
 (N'ServisKayitNo', N'Servisin KayitNo''su.'),
 (N'ServisKaynagiAdi', N'Servisin zincirdeki kaynağı (makine ataması ya da bayinin servisi).'),
 (N'BayiFaturaTarihi', N'Bayinin satış faturası tarihi.'),
 (N'TeslimTarihi', N'Bayi satışındaki teslim tarihi.'),
 (N'GarantiDayanagiAdi', N'Garanti başlangıcının dayanağı.'),
 (N'GarantiBaslangicTarihi', N'Garanti başlangıç günü.'),
 (N'GarantiBitisTarihi', N'Garanti bitiş günü.'),
 (N'Garantide', N'1: bugün (Türkiye) garanti süresi içinde.'),
 (N'LogoMalzemeKodu', N'LOGO malzeme kodu.'),
 (N'AcikTalepSayisi', N'Makinenin açık talep sayısı.'),
 (N'OlusmaZamaniTurkiye', N'Makine kaydının oluştuğu an, Türkiye saati.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'MakineKarti', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   7. gorunum.ServisKarti
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.ServisKarti
AS
SELECT
    s.KayitNo AS ServisKayitNo,
    s.Ad AS ServisAdi,
    st.Ad AS ServisTuruAdi,
    fd.Ad AS DurumAdi,
    s.PilotKatilimcisi,
    il.Ad AS IlAdi,
    ilc.Ad AS IlceAdi,
    s.Adres,
    s.TelefonE164 AS Telefon,
    gh.GirisAdlari,
    ISNULL(gh.AktifGirisSayisi, 0) AS AktifGirisSayisi,
    em.EtkinMarkalar,
    bo.BolgeOzeti,
    bb.Bayiler,
    ck.CariKodlari,
    /* VergiNoTuruKodu bir kod tablosuna değil CHECK listesine (tcNo, vergiNo)
       bağlı; etiketin okunacağı kod.* satırı yok. Etiketler backoffice
       Servisler ekranındaki alan adlarıdır (src/backoffice/ekranlar/
       Servisler.jsx: "T.C. Kimlik No", "Vergi No"); Codex'ten geçmiş metin. */
    CAST(CASE fb.VergiNoTuruKodu WHEN N'tcNo' THEN N'T.C. Kimlik No'
                                 WHEN N'vergiNo' THEN N'Vergi No' END AS nvarchar(40)) AS VergiNoTuruAdi,
    fb.VergiNoMaskeli,
    fb.IbanMaskeli,
    ISNULL(tl.AcikTalepSayisi, 0) AS AcikTalepSayisi,
    ISNULL(he.OnayBekleyenHakEdisSayisi, 0) AS OnayBekleyenHakEdisSayisi,
    CAST(CASE WHEN EXISTS (SELECT 1 FROM servis.SifreYardimTalebi AS y
                           WHERE y.ServisKimlik = s.Kimlik AND y.DurumKodu = N'bekliyor')
              THEN 1 ELSE 0 END AS bit) AS AcikSifreYardimTalebi,
    s.EskiNumara,
    CONVERT(datetime2(0), s.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OlusmaZamaniTurkiye
FROM servis.Servis AS s
LEFT JOIN kod.ServisTuru AS st ON st.Kod = s.TurKodu
LEFT JOIN kod.FirmaDurumu AS fd ON fd.Kod = s.DurumKodu
LEFT JOIN cografya.Il AS il ON il.IlKodu = s.IlKodu
LEFT JOIN cografya.Ilce AS ilc ON ilc.IlceKodu = s.IlceKodu
LEFT JOIN servis.FaturaBilgisi AS fb ON fb.ServisKimlik = s.Kimlik
OUTER APPLY (
    SELECT STRING_AGG(CAST(k.GirisAdi AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY k.GirisAdi) AS GirisAdlari,
           SUM(CASE WHEN k.Aktif = 1 THEN 1 ELSE 0 END) AS AktifGirisSayisi
    FROM servis.GirisHesabi AS g
    JOIN erisim.Kullanici AS k ON k.Kimlik = g.KullaniciKimlik
    WHERE g.ServisKimlik = s.Kimlik
) AS gh
OUTER APPLY (
    SELECT STRING_AGG(CAST(mr.Ad AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY mr.Ad) AS EtkinMarkalar
    FROM servis.MarkaYetkisi AS y
    JOIN katalog.Marka AS mr ON mr.Kod = y.MarkaKodu
    WHERE y.ServisKimlik = s.Kimlik
      AND y.Etkin = 1
) AS em
OUTER APPLY (
    SELECT STRING_AGG(CAST(CONCAT_WS(N' / ', bil.Ad, bilc.Ad) AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY bil.Ad, bilc.Ad) AS BolgeOzeti
    FROM servis.Bolge AS bl
    JOIN cografya.Il AS bil ON bil.IlKodu = bl.IlKodu
    LEFT JOIN cografya.Ilce AS bilc ON bilc.IlceKodu = bl.IlceKodu
    WHERE bl.ServisKimlik = s.Kimlik
) AS bo
OUTER APPLY (
    SELECT STRING_AGG(CAST(b.Ad AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY bg.Oncelik, b.Ad) AS Bayiler
    FROM servis.BayiBagi AS bg
    JOIN bayi.Bayi AS b ON b.Kimlik = bg.BayiKimlik
    WHERE bg.ServisKimlik = s.Kimlik
) AS bb
OUTER APPLY (
    SELECT STRING_AGG(CAST(c.CariKodu AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY c.CariKodu) AS CariKodlari
    FROM entegrasyon.CariKarti AS c
    WHERE c.ServisKimlik = s.Kimlik
      AND c.Aktif = 1
) AS ck
OUTER APPLY (
    SELECT COUNT(*) AS AcikTalepSayisi
    FROM talep.Talep AS t
    WHERE t.ServisKimlik = s.Kimlik
      AND t.Kapali = 0
) AS tl
OUTER APPLY (
    SELECT COUNT(*) AS OnayBekleyenHakEdisSayisi
    FROM hakedis.HakEdis AS x
    WHERE x.ServisKimlik = s.Kimlik
      AND x.DurumKodu = N'bekliyor'
) AS he;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Servis firmasının tek satırı: giriş hesapları, marka yetkileri, bölge, bağlı bayiler, LOGO cari kodları, maskeli vergi no ve IBAN, açık iş sayıları. Rapor rolüne açık değildir. Örnek: SELECT * FROM gorunum.ServisKarti WHERE ServisAdi LIKE N''%izmir%'';'),
 (N'ServisKayitNo', N'Servisin KayitNo''su.'),
 (N'ServisAdi', N'Servis firmasının adı.'),
 (N'ServisTuruAdi', N'Servis türü.'),
 (N'DurumAdi', N'Firma durumu.'),
 (N'PilotKatilimcisi', N'1: pilot uygulamaya katılıyor.'),
 (N'IlAdi', N'İl adı.'),
 (N'IlceAdi', N'İlçe adı.'),
 (N'Adres', N'Firma adresi.'),
 (N'Telefon', N'Firma telefonu (E.164).'),
 (N'GirisAdlari', N'Servisim giriş adları, virgülle.'),
 (N'AktifGirisSayisi', N'Aktif giriş hesabı sayısı.'),
 (N'EtkinMarkalar', N'Etkin marka yetkileri, virgülle.'),
 (N'BolgeOzeti', N'Servis bölgeleri: il ya da il / ilçe, virgülle.'),
 (N'Bayiler', N'Bağlı bayiler, öncelik sırasıyla.'),
 (N'CariKodlari', N'Etkin LOGO cari kodları, virgülle.'),
 (N'VergiNoTuruAdi', N'Fatura bilgisindeki numaranın türü.'),
 (N'VergiNoMaskeli', N'Maskeli vergi ya da T.C. kimlik numarası.'),
 (N'IbanMaskeli', N'Maskeli IBAN.'),
 (N'AcikTalepSayisi', N'Servise atanmış açık talep sayısı.'),
 (N'OnayBekleyenHakEdisSayisi', N'Onay bekleyen hak ediş sayısı.'),
 (N'AcikSifreYardimTalebi', N'1: bekleyen şifre yardım talebi var.'),
 (N'EskiNumara', N'Eski sistemdeki servis numarası (SRV014 gibi).'),
 (N'OlusmaZamaniTurkiye', N'Kaydın oluştuğu an, Türkiye saati.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'ServisKarti', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   8. gorunum.BayiKarti
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.BayiKarti
AS
SELECT
    b.KayitNo AS BayiKayitNo,
    b.Ad AS BayiAdi,
    fd.Ad AS DurumAdi,
    b.PilotKatilimcisi,
    il.Ad AS IlAdi,
    ilc.Ad AS IlceAdi,
    b.Adres,
    b.TelefonE164 AS Telefon,
    em.EtkinMarkalar,
    bs.BagliServisler,
    ck.CariKodlari,
    ISNULL(sm.SatilanMakineSayisi, 0) AS SatilanMakineSayisi,
    ISNULL(ba.AcikBayiAtamasiSayisi, 0) AS AcikBayiAtamasiSayisi,
    b.EskiNumara,
    CONVERT(datetime2(0), b.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OlusmaZamaniTurkiye
FROM bayi.Bayi AS b
LEFT JOIN kod.FirmaDurumu AS fd ON fd.Kod = b.DurumKodu
LEFT JOIN cografya.Il AS il ON il.IlKodu = b.IlKodu
LEFT JOIN cografya.Ilce AS ilc ON ilc.IlceKodu = b.IlceKodu
OUTER APPLY (
    SELECT STRING_AGG(CAST(mr.Ad AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY mr.Ad) AS EtkinMarkalar
    FROM bayi.MarkaYetkisi AS y
    JOIN katalog.Marka AS mr ON mr.Kod = y.MarkaKodu
    WHERE y.BayiKimlik = b.Kimlik
      AND y.Etkin = 1
) AS em
OUTER APPLY (
    SELECT STRING_AGG(CAST(s.Ad AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY bg.Oncelik, s.Ad) AS BagliServisler
    FROM servis.BayiBagi AS bg
    JOIN servis.Servis AS s ON s.Kimlik = bg.ServisKimlik
    WHERE bg.BayiKimlik = b.Kimlik
) AS bs
OUTER APPLY (
    SELECT STRING_AGG(CAST(c.CariKodu AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY c.CariKodu) AS CariKodlari
    FROM entegrasyon.CariKarti AS c
    WHERE c.BayiKimlik = b.Kimlik
      AND c.Aktif = 1
) AS ck
OUTER APPLY (
    SELECT COUNT(*) AS SatilanMakineSayisi
    FROM makine.MakineninBayisi AS mb
    WHERE mb.BayiKimlik = b.Kimlik
) AS sm
OUTER APPLY (
    SELECT COUNT(*) AS AcikBayiAtamasiSayisi
    FROM talep.BayiAtamasi AS a
    JOIN talep.Talep AS t ON t.Kimlik = a.TalepKimlik
    WHERE a.BayiKimlik = b.Kimlik
      AND a.KaldirilmaZamani IS NULL
      AND t.Kapali = 0
) AS ba;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Bayinin tek satırı: marka yetkileri, bağlı servisler, LOGO cari kodları, sattığı makine ve açık bayi ataması sayıları. Bayinin paneli yoktur; kaydı vardır. Rapor rolüne açık değildir. Örnek: SELECT * FROM gorunum.BayiKarti WHERE IlAdi = N''İZMİR'';'),
 (N'BayiKayitNo', N'Bayinin KayitNo''su.'),
 (N'BayiAdi', N'Bayinin adı.'),
 (N'DurumAdi', N'Firma durumu.'),
 (N'PilotKatilimcisi', N'1: pilot uygulamaya katılıyor.'),
 (N'IlAdi', N'İl adı.'),
 (N'IlceAdi', N'İlçe adı.'),
 (N'Adres', N'Bayi adresi.'),
 (N'Telefon', N'Bayi telefonu (E.164).'),
 (N'EtkinMarkalar', N'Etkin marka yetkileri, virgülle.'),
 (N'BagliServisler', N'Bayiye bağlı servisler, öncelik sırasıyla.'),
 (N'CariKodlari', N'Etkin LOGO cari kodları, virgülle.'),
 (N'SatilanMakineSayisi', N'makine.MakineninBayisi''nde bu bayiye düşen makine sayısı.'),
 (N'AcikBayiAtamasiSayisi', N'Bu bayiye atanmış, kaldırılmamış ve talebi açık atama sayısı.'),
 (N'EskiNumara', N'Eski sistemdeki bayi numarası.'),
 (N'OlusmaZamaniTurkiye', N'Kaydın oluştuğu an, Türkiye saati.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'BayiKarti', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   9. gorunum.HakEdisListesi
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.HakEdisListesi
AS
SELECT
    LEFT(t.Numara, 3) + N'-' + SUBSTRING(t.Numara, 4, 2) + N'-' + RIGHT(t.Numara, 5) AS TalepNumarasi,
    z.ZiyaretNo,
    s.Ad AS ServisAdi,
    s.KayitNo AS ServisKayitNo,
    sr.Ad AS SirketAdi,
    mr.Ad AS MarkaAdi,
    h.DurumKodu,
    hd.Ad AS DurumAdi,
    kl.Km,
    ISNULL(kl.YolTutari, 0) AS YolTutari,
    ISNULL(kl.IscilikTutari, 0) AS IscilikTutari,
    ISNULL(kl.DigerTutar, 0) AS DigerTutar,
    h.NetTutar,
    h.KdvTutari,
    h.TevkifatTutari,
    h.StopajTutari,
    CAST(h.NetTutar + h.KdvTutari - h.TevkifatTutari - h.StopajTutari AS decimal(18,2)) AS CariEtkisiTutari,
    h.ParaBirimiKodu,
    LEFT(dd.Numara, 3) + N'-' + SUBSTRING(dd.Numara, 4, 2) + N'-' + RIGHT(dd.Numara, 5) AS DonemDokumuNumarasi,
    CONVERT(datetime2(0), h.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OlusmaZamaniTurkiye,
    CONVERT(date, h.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OlusmaTarihi,
    CONVERT(datetime2(0), h.OnayZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OnayZamaniTurkiye,
    CONVERT(date, h.OnayZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OnayTarihi,
    h.OnaylayanAdi,
    CONVERT(datetime2(0), h.RedZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS RedZamaniTurkiye,
    h.RedEdenAdi,
    h.KayitNo
FROM hakedis.HakEdis AS h
JOIN talep.Talep AS t ON t.Kimlik = h.TalepKimlik
JOIN talep.ServisZiyareti AS z ON z.Kimlik = h.ZiyaretKimlik
JOIN servis.Servis AS s ON s.Kimlik = h.ServisKimlik
JOIN sirket.Sirket AS sr ON sr.Kod = h.SirketKodu
JOIN katalog.Marka AS mr ON mr.Kod = h.MarkaKodu
LEFT JOIN kod.HakEdisDurumu AS hd ON hd.Kod = h.DurumKodu
LEFT JOIN hakedis.DonemDokumu AS dd ON dd.Kimlik = h.DonemDokumuKimlik
/* Kalem türü hak ediş başına tektir (UQ HakEdisKimlik, KalemTuruKodu).
   Toplamlar CASE'siz yazıldı: SSMS'te "Null value is eliminated" uyarısı çıkmasın. */
OUTER APPLY (
    SELECT (SELECT k.Miktar FROM hakedis.HakEdisKalemi AS k
            WHERE k.HakEdisKimlik = h.Kimlik AND k.KalemTuruKodu = N'yol') AS Km,
           (SELECT k.Tutar FROM hakedis.HakEdisKalemi AS k
            WHERE k.HakEdisKimlik = h.Kimlik AND k.KalemTuruKodu = N'yol') AS YolTutari,
           (SELECT k.Tutar FROM hakedis.HakEdisKalemi AS k
            WHERE k.HakEdisKimlik = h.Kimlik AND k.KalemTuruKodu = N'iscilik') AS IscilikTutari,
           (SELECT SUM(k.Tutar) FROM hakedis.HakEdisKalemi AS k
            WHERE k.HakEdisKimlik = h.Kimlik AND k.KalemTuruKodu NOT IN (N'yol', N'iscilik')) AS DigerTutar
) AS kl;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Hak edişler; tutarlar hakedis.HakEdisKalemi''nden (tasarim.md 1.9.4). Red nedeni gibi serbest metin burada yoktur (yardim.HakEdisGoster). Rapor rolüne açıktır. Örnek: SELECT ServisAdi, ParaBirimiKodu, SUM(NetTutar) FROM gorunum.HakEdisListesi WHERE DurumKodu = N''onaylandi'' AND OnayTarihi >= (SELECT AyBasi FROM gorunum.Bugun) GROUP BY ServisAdi, ParaBirimiKodu;'),
 (N'TalepNumarasi', N'Hak edişin talebi (SRV-26-00123).'),
 (N'ZiyaretNo', N'Talepteki ziyaret sırası.'),
 (N'ServisAdi', N'Hak edişin servisi.'),
 (N'ServisKayitNo', N'Servisin KayitNo''su.'),
 (N'SirketAdi', N'Hak edişi ödeyen şirket (yazıldığı andaki şirket).'),
 (N'MarkaAdi', N'Talebin markası.'),
 (N'DurumKodu', N'kod.HakEdisDurumu kodu: bekliyor, onaylandi, reddedildi.'),
 (N'DurumAdi', N'Durumun adı.'),
 (N'Km', N'yol kaleminin miktarı (km).'),
 (N'YolTutari', N'yol kaleminin tutarı.'),
 (N'IscilikTutari', N'iscilik kaleminin tutarı.'),
 (N'DigerTutar', N'Öteki kalem türlerinin toplamı.'),
 (N'NetTutar', N'KDV hariç hak ediş tutarı = kalemlerin toplamı.'),
 (N'KdvTutari', N'Onayda yazılan KDV tutarı.'),
 (N'TevkifatTutari', N'Onayda yazılan tevkifat tutarı.'),
 (N'StopajTutari', N'Onayda yazılan stopaj tutarı.'),
 (N'CariEtkisiTutari', N'Servisin cari hesabına etkisi: Net + KDV − tevkifat − stopaj; vergiler yazılmadan boş.'),
 (N'ParaBirimiKodu', N'Tutarların para birimi.'),
 (N'DonemDokumuNumarasi', N'Bağlı olduğu aylık döküm (HAK-26-00001).'),
 (N'OlusmaZamaniTurkiye', N'Hak edişin oluştuğu an, Türkiye saati.'),
 (N'OlusmaTarihi', N'Oluştuğu Türkiye günü.'),
 (N'OnayZamaniTurkiye', N'Onay anı, Türkiye saati.'),
 (N'OnayTarihi', N'Onay Türkiye günü (dönem yılı ve ayı buradan).'),
 (N'OnaylayanAdi', N'Onaylayan personel.'),
 (N'RedZamaniTurkiye', N'Red anı, Türkiye saati.'),
 (N'RedEdenAdi', N'Reddeden personel.'),
 (N'KayitNo', N'Hak edişin KayitNo''su.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'HakEdisListesi', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   10. gorunum.ServisHesapHareketleri
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.ServisHesapHareketleri
AS
SELECT
    x.KayitNo,
    s.Ad AS ServisAdi,
    s.KayitNo AS ServisKayitNo,
    sr.Ad AS SirketAdi,
    mr.Ad AS MarkaAdi,
    x.ParaBirimiKodu,
    CONVERT(datetime2(0), x.HareketZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS HareketZamaniTurkiye,
    CONVERT(date, x.HareketZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS HareketTarihi,
    ht.Ad AS HareketTuruAdi,
    x.YonKodu,
    CASE WHEN x.YonKodu = N'alacak' THEN x.Tutar END AS AlacakTutari,
    CASE WHEN x.YonKodu = N'borc' THEN x.Tutar END AS BorcTutari,
    COALESCE(he.NetTutar, pt.AraToplam) AS KdvHaricTutar,
    COALESCE(he.KdvTutari, pt.KdvTutari) AS KdvTutari,
    he.TevkifatTutari,
    he.StopajTutari,
    LEFT(tl.Numara, 3) + N'-' + SUBSTRING(tl.Numara, 4, 2) + N'-' + RIGHT(tl.Numara, 5) AS TalepNumarasi,
    LEFT(dd.Numara, 3) + N'-' + SUBSTRING(dd.Numara, 4, 2) + N'-' + RIGHT(dd.Numara, 5) AS DonemDokumuNumarasi,
    bb.BelgeNo,
    asil.KayitNo AS DuzeltilenHareketKayitNo,
    CAST(CASE WHEN x.GeriAlinmaZamani IS NULL THEN 0 ELSE 1 END AS bit) AS GeriAlindi,
    x.YapanAdi
FROM hakedis.ServisHesapHareketi AS x
JOIN servis.Servis AS s ON s.Kimlik = x.ServisKimlik
JOIN sirket.Sirket AS sr ON sr.Kod = x.SirketKodu
LEFT JOIN katalog.Marka AS mr ON mr.Kod = x.MarkaKodu
LEFT JOIN kod.HesapHareketTuru AS ht ON ht.Kod = x.HareketTuruKodu
LEFT JOIN hakedis.ServisHesapHareketi AS asil ON asil.Kimlik = x.DuzeltilenHareketKimlik
LEFT JOIN hakedis.HakEdis AS he ON he.Kimlik = COALESCE(x.HakEdisKimlik, asil.HakEdisKimlik)
LEFT JOIN talep.ParcaTalebiAyrinti AS pt ON pt.TalepKimlik = COALESCE(x.ParcaTalepKimlik, asil.ParcaTalepKimlik)
LEFT JOIN talep.Talep AS tl ON tl.Kimlik = COALESCE(he.TalepKimlik, pt.TalepKimlik)
LEFT JOIN hakedis.DonemDokumu AS dd ON dd.Kimlik = x.DonemDokumuKimlik
LEFT JOIN entegrasyon.BelgeBagi AS bb ON bb.Kimlik = x.BelgeBagiKimlik;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Servisin hesap hareketleri (bilgi amaçlı; LOGO cari ekstresi esastır). Tutar cari etkisidir (tasarim.md 1.9.3); KDV hariç tutar ve vergiler kaynağı olan hak edişten ya da parça talebinden gelir, ters (düzeltme) harekette asıl hareketin kaynağından. Açıklama serbest metni burada yoktur (yardim.ServisGoster). Rapor rolüne açıktır.'),
 (N'KayitNo', N'Hareketin KayitNo''su.'),
 (N'ServisAdi', N'Hareketin servisi.'),
 (N'ServisKayitNo', N'Servisin KayitNo''su.'),
 (N'SirketAdi', N'Hareketin şirketi.'),
 (N'MarkaAdi', N'Hareketin markası; markasız ödemede boş.'),
 (N'ParaBirimiKodu', N'Tutarın para birimi.'),
 (N'HareketZamaniTurkiye', N'Hareket anı, Türkiye saati.'),
 (N'HareketTarihi', N'Hareketin Türkiye günü.'),
 (N'HareketTuruAdi', N'Hareket türünün adı.'),
 (N'YonKodu', N'alacak ya da borc (servisin gözünden).'),
 (N'AlacakTutari', N'Alacak yönlü hareketin tutarı (KDV dahil, kesintiler düşülmüş).'),
 (N'BorcTutari', N'Borç yönlü hareketin tutarı.'),
 (N'KdvHaricTutar', N'Kaynağın KDV hariç tutarı: hak edişte NetTutar, parça talebinde AraToplam.'),
 (N'KdvTutari', N'Kaynağın KDV tutarı.'),
 (N'TevkifatTutari', N'Hak edişin tevkifat tutarı.'),
 (N'StopajTutari', N'Hak edişin stopaj tutarı.'),
 (N'TalepNumarasi', N'Kaynağın talebi (hak edişin ya da parça talebinin).'),
 (N'DonemDokumuNumarasi', N'Bağlı aylık döküm.'),
 (N'BelgeNo', N'Bağlı LOGO belgesinin numarası.'),
 (N'DuzeltilenHareketKayitNo', N'Ters harekette asıl hareketin KayitNo''su.'),
 (N'GeriAlindi', N'1: bu hareket bir ters hareketle geri alındı.'),
 (N'YapanAdi', N'Hareketi yazan personelin o anki adı.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'ServisHesapHareketleri', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   11. gorunum.ServisBakiyesi
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.ServisBakiyesi
AS
SELECT
    s.Ad AS ServisAdi,
    s.KayitNo AS ServisKayitNo,
    sr.Ad AS SirketAdi,
    g.ParaBirimiKodu,
    g.AlacakToplami,
    g.BorcToplami,
    CAST(g.AlacakToplami - g.BorcToplami AS decimal(18,2)) AS Bakiye,
    CONVERT(datetime2(0), g.SonHareketZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS SonHareketZamaniTurkiye
FROM (
    SELECT x.ServisKimlik,
           x.SirketKodu,
           x.ParaBirimiKodu,
           CAST(SUM(CASE WHEN x.YonKodu = N'alacak' THEN x.Tutar ELSE 0 END) AS decimal(18,2)) AS AlacakToplami,
           CAST(SUM(CASE WHEN x.YonKodu = N'borc' THEN x.Tutar ELSE 0 END) AS decimal(18,2)) AS BorcToplami,
           MAX(x.HareketZamani) AS SonHareketZamani
    FROM hakedis.ServisHesapHareketi AS x
    GROUP BY x.ServisKimlik, x.SirketKodu, x.ParaBirimiKodu
) AS g
JOIN servis.Servis AS s ON s.Kimlik = g.ServisKimlik
JOIN sirket.Sirket AS sr ON sr.Kod = g.SirketKodu;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Servis × şirket × para birimi bakiyesi: bütün hareketlerin alacak − borç toplamı (asıl ve ters hareket birbirini sıfırlar; tasarim.md 1.9.3). Bilgi amaçlıdır; esas LOGO cari ekstresidir. Rapor rolüne açıktır.'),
 (N'ServisAdi', N'Servis.'),
 (N'ServisKayitNo', N'Servisin KayitNo''su.'),
 (N'SirketAdi', N'Şirket.'),
 (N'ParaBirimiKodu', N'Para birimi; farklı para birimleri toplanmaz.'),
 (N'AlacakToplami', N'Alacak yönlü hareketlerin toplamı.'),
 (N'BorcToplami', N'Borç yönlü hareketlerin toplamı.'),
 (N'Bakiye', N'AlacakToplami − BorcToplami; artı değer PAKSAN''ın servise borcudur.'),
 (N'SonHareketZamaniTurkiye', N'Son hareketin anı, Türkiye saati.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'ServisBakiyesi', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   12. gorunum.IslemGecmisi
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.IslemGecmisi
AS
SELECT
    i.KayitNo,
    CONVERT(datetime2(0), i.IslemZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS IslemZamaniTurkiye,
    CONVERT(date, i.IslemZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS IslemTarihi,
    i.IslemTuruKodu,
    it.Ad AS IslemTuruAdi,
    ik.Ad AS KategoriAdi,
    ya.Ad AS YapanTuruAdi,
    i.YapanAdi,
    i.YapanRolAdi,
    k.GirisAdi AS YapanGirisAdi,
    ku.Ad AS KaynakUygulamaAdi,
    i.UygulamaSurumu,
    kt.Ad AS IlgiliKayitTuruAdi,
    i.IlgiliNumara,
    JSON_VALUE(i.AyrintiJson, '$.gerekce') AS Gerekce,
    JSON_VALUE(i.AyrintiJson, '$.sqlGirisi') AS SqlGirisi,
    JSON_VALUE(i.AyrintiJson, '$.bilgisayar') AS Bilgisayar,
    i.AyrintiJson
FROM denetim.IslemKaydi AS i
LEFT JOIN kod.IslemTuru AS it ON it.Kod = i.IslemTuruKodu
LEFT JOIN kod.IslemKategorisi AS ik ON ik.Kod = it.KategoriKodu
LEFT JOIN kod.AktorTuru AS ya ON ya.Kod = i.YapanTuruKodu
LEFT JOIN erisim.Kullanici AS k ON k.Kimlik = i.YapanKullaniciKimlik
LEFT JOIN kod.KaynakUygulama AS ku ON ku.Kod = i.KaynakUygulamaKodu
LEFT JOIN kod.KayitTuru AS kt ON kt.Kod = i.IlgiliKayitTuruKodu;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'İşlem kaydı (denetim.IslemKaydi): kim, ne zaman, hangi uygulamadan, hangi kayıtta ne yaptı. yonetim prosedürlerinin gerekçesi, SQL girişi ve bilgisayar adı AyrintiJson''dan ayrı kolonlara açılır. Rapor rolüne açık değildir. Örnek: SELECT * FROM gorunum.IslemGecmisi WHERE IlgiliNumara = N''SRV2600123'' ORDER BY KayitNo;'),
 (N'KayitNo', N'İşlem kaydının KayitNo''su (sıra).'),
 (N'IslemZamaniTurkiye', N'İşlem anı, Türkiye saati.'),
 (N'IslemTarihi', N'İşlemin Türkiye günü.'),
 (N'IslemTuruKodu', N'kod.IslemTuru kodu.'),
 (N'IslemTuruAdi', N'İşlem türünün adı.'),
 (N'KategoriAdi', N'İşlem kategorisi.'),
 (N'YapanTuruAdi', N'Yapan aktör türü.'),
 (N'YapanAdi', N'Yapanın o anki adı; müşteride boş.'),
 (N'YapanRolAdi', N'Personelin o anki rolü.'),
 (N'YapanGirisAdi', N'Yapan kullanıcının bugünkü giriş adı.'),
 (N'KaynakUygulamaAdi', N'İşlemin geldiği uygulama.'),
 (N'UygulamaSurumu', N'Uygulama sürümü.'),
 (N'IlgiliKayitTuruAdi', N'İşlemin ilgili olduğu kayıt türü.'),
 (N'IlgiliNumara', N'İlgili kaydın saklanan numarası.'),
 (N'Gerekce', N'AyrintiJson $.gerekce.'),
 (N'SqlGirisi', N'AyrintiJson $.sqlGirisi (yonetim prosedürlerini çalıştıran SQL girişi).'),
 (N'Bilgisayar', N'AyrintiJson $.bilgisayar.'),
 (N'AyrintiJson', N'İşlemin ayrıntısı (JSON).');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'IslemGecmisi', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   13. gorunum.DuyuruListesi
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.DuyuruListesi
AS
SELECT
    d.KayitNo,
    d.Baslik,
    dt.Ad AS TurAdi,
    d.AltTurKodu,
    dat.Ad AS DuyuruAltTuruAdi,
    hk.Ad AS HedefKitleAdi,
    dl.Ad AS DilAdi,
    CAST(CASE WHEN d.YayindanKaldirmaZamani IS NOT NULL THEN N'kaldirildi'
              WHEN d.YayinZamani > SYSUTCDATETIME() THEN N'bekliyor'
              WHEN d.BitisZamani IS NOT NULL AND d.BitisZamani <= SYSUTCDATETIME() THEN N'bitti'
              ELSE N'yayinda' END AS nvarchar(20)) AS YayinDurumu,
    NULLIF(CONCAT_WS(N' · ', ho.Markalar, ho.Urunler, ho.Iller, ho.Ilceler, ho.Servisler, ho.Seriler), N'') AS HedefOzeti,
    ISNULL(ts.HedeflenenSayisi, 0) AS HedeflenenSayisi,
    ISNULL(ts.GonderilenSayisi, 0) AS GonderilenSayisi,
    ISNULL(ts.CihazaUlasanSayisi, 0) AS CihazaUlasanSayisi,
    ISNULL(ts.PencereyiGorenSayisi, 0) AS PencereyiGorenSayisi,
    ISNULL(ts.ListedeOkuyanSayisi, 0) AS ListedeOkuyanSayisi,
    ISNULL(ts.KabulEdenSayisi, 0) AS KabulEdenSayisi,
    CONVERT(datetime2(0), d.YayinZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS YayinZamaniTurkiye,
    CONVERT(datetime2(0), d.BitisZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BitisZamaniTurkiye,
    CONVERT(datetime2(0), d.YayindanKaldirmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS YayindanKaldirmaZamaniTurkiye,
    d.YapanAdi AS YayinlayanAdi,
    d.KaldiranAdi
FROM duyuru.Duyuru AS d
LEFT JOIN kod.DuyuruTuru AS dt ON dt.Kod = d.TurKodu
LEFT JOIN kod.DuyuruAltTuru AS dat ON dat.Kod = d.AltTurKodu
LEFT JOIN kod.HedefKitle AS hk ON hk.Kod = d.HedefKitleKodu
LEFT JOIN kod.Dil AS dl ON dl.Kod = d.DilKodu
OUTER APPLY (
    SELECT
        (SELECT STRING_AGG(CAST(m.Ad AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY m.Ad)
         FROM duyuru.HedefMarka AS x JOIN katalog.Marka AS m ON m.Kod = x.MarkaKodu
         WHERE x.DuyuruKimlik = d.Kimlik) AS Markalar,
        (SELECT STRING_AGG(CAST(u.Ad AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY u.Ad)
         FROM duyuru.HedefUrun AS x JOIN katalog.Urun AS u ON u.MarkaKodu = x.MarkaKodu AND u.Kod = x.UrunKodu
         WHERE x.DuyuruKimlik = d.Kimlik) AS Urunler,
        (SELECT STRING_AGG(CAST(il.Ad AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY il.Ad)
         FROM duyuru.HedefIl AS x JOIN cografya.Il AS il ON il.IlKodu = x.IlKodu
         WHERE x.DuyuruKimlik = d.Kimlik) AS Iller,
        (SELECT STRING_AGG(CAST(CONCAT_WS(N' / ', il.Ad, ic.Ad) AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY il.Ad, ic.Ad)
         FROM duyuru.HedefIlce AS x
         JOIN cografya.Ilce AS ic ON ic.IlceKodu = x.IlceKodu
         JOIN cografya.Il AS il ON il.IlKodu = x.IlKodu
         WHERE x.DuyuruKimlik = d.Kimlik) AS Ilceler,
        (SELECT STRING_AGG(CAST(s.Ad AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY s.Ad)
         FROM duyuru.HedefServis AS x JOIN servis.Servis AS s ON s.Kimlik = x.ServisKimlik
         WHERE x.DuyuruKimlik = d.Kimlik) AS Servisler,
        (SELECT STRING_AGG(CAST(x.SeriNo COLLATE Turkish_100_CI_AS AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY x.SeriNo)
         FROM duyuru.HedefSeri AS x
         WHERE x.DuyuruKimlik = d.Kimlik) AS Seriler
) AS ho
OUTER APPLY (
    SELECT COUNT(*) AS HedeflenenSayisi,
           SUM(CASE WHEN t.GonderilmeZamani IS NOT NULL THEN 1 ELSE 0 END) AS GonderilenSayisi,
           SUM(CASE WHEN t.CihazaUlasmaZamani IS NOT NULL THEN 1 ELSE 0 END) AS CihazaUlasanSayisi,
           SUM(CASE WHEN t.GorulmeZamani IS NOT NULL THEN 1 ELSE 0 END) AS PencereyiGorenSayisi,
           SUM(CASE WHEN t.OkunmaZamani IS NOT NULL THEN 1 ELSE 0 END) AS ListedeOkuyanSayisi,
           SUM(CASE WHEN t.KabulZamani IS NOT NULL THEN 1 ELSE 0 END) AS KabulEdenSayisi
    FROM bildirim.Teslimat AS t
    WHERE t.DuyuruKimlik = d.Kimlik
) AS ts;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Duyurular, hedefleri ve teslimat sayıları (bildirim.Teslimat). Rapor rolüne açıktır. Örnek: SELECT Baslik, HedeflenenSayisi, ListedeOkuyanSayisi FROM gorunum.DuyuruListesi WHERE YayinDurumu = N''yayinda'';'),
 (N'KayitNo', N'Duyurunun KayitNo''su.'),
 (N'Baslik', N'Duyuru başlığı.'),
 (N'TurAdi', N'Duyuru türü.'),
 (N'AltTurKodu', N'kod.DuyuruAltTuru kodu.'),
 (N'DuyuruAltTuruAdi', N'Alt türün adı.'),
 (N'HedefKitleAdi', N'Hedef kitle.'),
 (N'DilAdi', N'Duyurunun dili.'),
 (N'YayinDurumu', N'bekliyor (yayın zamanı gelmedi), yayinda, bitti (bitiş zamanı geçti), kaldirildi (yayından kaldırıldı).'),
 (N'HedefOzeti', N'Hedef listeleri: markalar · ürünler · iller · il / ilçeler · servisler · seri numaraları (boş olanlar atlanır).'),
 (N'HedeflenenSayisi', N'Teslimat satırı sayısı.'),
 (N'GonderilenSayisi', N'Gönderilen teslimat sayısı.'),
 (N'CihazaUlasanSayisi', N'Cihaza ulaşan teslimat sayısı.'),
 (N'PencereyiGorenSayisi', N'Duyuru penceresini gören (GorulmeZamani dolu).'),
 (N'ListedeOkuyanSayisi', N'Listede okuyan (OkunmaZamani dolu).'),
 (N'KabulEdenSayisi', N'Kabul eden (KabulZamani dolu).'),
 (N'YayinZamaniTurkiye', N'Yayın anı, Türkiye saati.'),
 (N'BitisZamaniTurkiye', N'Bitiş anı, Türkiye saati.'),
 (N'YayindanKaldirmaZamaniTurkiye', N'Yayından kaldırma anı, Türkiye saati.'),
 (N'YayinlayanAdi', N'Duyuruyu yazan personel.'),
 (N'KaldiranAdi', N'Yayından kaldıran personel.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'DuyuruListesi', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* ==========================================================================
   Kontrol görünümleri: satır dönerse bakılacak bir şey var demektir.
   ========================================================================== */

/* --------------------------------------------------------------------------
   14. gorunum.KontrolLogoCariKoduEksik
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.KontrolLogoCariKoduEksik
AS
WITH firma AS (
    SELECT CAST(N'servis' AS nvarchar(10)) AS FirmaTuru, s.Kimlik, s.Ad, s.KayitNo, s.OlusmaZamani, y.MarkaKodu
    FROM servis.Servis AS s
    JOIN servis.MarkaYetkisi AS y ON y.ServisKimlik = s.Kimlik AND y.Etkin = 1
    WHERE s.DurumKodu = N'aktif'
    UNION ALL
    SELECT CAST(N'bayi' AS nvarchar(10)), b.Kimlik, b.Ad, b.KayitNo, b.OlusmaZamani, y.MarkaKodu
    FROM bayi.Bayi AS b
    JOIN bayi.MarkaYetkisi AS y ON y.BayiKimlik = b.Kimlik AND y.Etkin = 1
    WHERE b.DurumKodu = N'aktif'
), firmaSirket AS (
    SELECT f.FirmaTuru, f.Kimlik, f.Ad, f.KayitNo, f.OlusmaZamani, m.SirketKodu,
           STRING_AGG(CAST(m.Ad AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY m.Ad) AS EtkinMarkalar
    FROM firma AS f
    JOIN katalog.Marka AS m ON m.Kod = f.MarkaKodu
    GROUP BY f.FirmaTuru, f.Kimlik, f.Ad, f.KayitNo, f.OlusmaZamani, m.SirketKodu
)
SELECT
    fs.FirmaTuru,
    fs.Ad AS FirmaAdi,
    fs.KayitNo AS FirmaKayitNo,
    sr.Ad AS SirketAdi,
    sr.LogoFirmaNo,
    fs.EtkinMarkalar,
    CONVERT(datetime2(0), fs.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OlusmaZamaniTurkiye
FROM firmaSirket AS fs
JOIN sirket.Sirket AS sr ON sr.Kod = fs.SirketKodu
WHERE NOT EXISTS (
    SELECT 1
    FROM entegrasyon.CariKarti AS c
    WHERE c.Aktif = 1
      AND c.DisSistemKodu = N'logo'
      AND ((fs.FirmaTuru = N'servis' AND c.ServisKimlik = fs.Kimlik)
        OR (fs.FirmaTuru = N'bayi' AND c.BayiKimlik = fs.Kimlik))
      AND (sr.LogoFirmaNo IS NULL
        OR c.FirmaNo = sr.LogoFirmaNo
        OR (c.FirmaNo IS NULL AND c.SirketKodu = sr.Kod))
);
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Etkin marka yetkisi olan aktif servis ve bayilerden, o markaların şirketinin LOGO firmasında etkin logo cari kartı olmayanlar (şirketin LogoFirmaNo''su boşsa hiç etkin logo cari kartı olmayanlar). Firma × şirket başına bir satır. Rapor rolüne açıktır.'),
 (N'FirmaTuru', N'servis ya da bayi.'),
 (N'FirmaAdi', N'Firmanın adı.'),
 (N'FirmaKayitNo', N'Firmanın KayitNo''su (gorunum.ServisKarti ya da gorunum.BayiKarti).'),
 (N'SirketAdi', N'Cari kartı eksik olan şirket.'),
 (N'LogoFirmaNo', N'Şirketin LOGO firma numarası.'),
 (N'EtkinMarkalar', N'Firmanın bu şirkete ait etkin markaları.'),
 (N'OlusmaZamaniTurkiye', N'Firma kaydının oluştuğu an, Türkiye saati.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'KontrolLogoCariKoduEksik', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   15. gorunum.KontrolOnayBekleyenHakEdis
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.KontrolOnayBekleyenHakEdis
AS
SELECT
    LEFT(t.Numara, 3) + N'-' + SUBSTRING(t.Numara, 4, 2) + N'-' + RIGHT(t.Numara, 5) AS TalepNumarasi,
    z.ZiyaretNo,
    s.Ad AS ServisAdi,
    h.NetTutar,
    h.ParaBirimiKodu,
    DATEDIFF(day, CONVERT(date, h.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time'), bg.Tarih) AS BeklemeGunu,
    CONVERT(datetime2(0), h.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OlusmaZamaniTurkiye
FROM hakedis.HakEdis AS h
CROSS JOIN gorunum.Bugun AS bg
JOIN talep.Talep AS t ON t.Kimlik = h.TalepKimlik
JOIN talep.ServisZiyareti AS z ON z.Kimlik = h.ZiyaretKimlik
JOIN servis.Servis AS s ON s.Kimlik = h.ServisKimlik
WHERE h.DurumKodu = N'bekliyor';
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Onay bekleyen hak edişler ve kaç gündür bekledikleri. Rapor rolüne açıktır. Örnek: SELECT * FROM gorunum.KontrolOnayBekleyenHakEdis ORDER BY BeklemeGunu DESC;'),
 (N'TalepNumarasi', N'Hak edişin talebi.'),
 (N'ZiyaretNo', N'Ziyaret sırası.'),
 (N'ServisAdi', N'Servis.'),
 (N'NetTutar', N'KDV hariç tutar.'),
 (N'ParaBirimiKodu', N'Para birimi.'),
 (N'BeklemeGunu', N'Oluştuğu Türkiye gününden bugüne gün.'),
 (N'OlusmaZamaniTurkiye', N'Hak edişin oluştuğu an, Türkiye saati.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'KontrolOnayBekleyenHakEdis', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   16. gorunum.KontrolHakEdisToplamiUyusmuyor
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.KontrolHakEdisToplamiUyusmuyor
AS
SELECT
    LEFT(t.Numara, 3) + N'-' + SUBSTRING(t.Numara, 4, 2) + N'-' + RIGHT(t.Numara, 5) AS TalepNumarasi,
    z.ZiyaretNo,
    s.Ad AS ServisAdi,
    hd.Ad AS DurumAdi,
    h.NetTutar,
    kt.KalemToplami,
    CAST(h.NetTutar - kt.KalemToplami AS decimal(18,2)) AS Fark,
    h.ParaBirimiKodu
FROM hakedis.HakEdis AS h
JOIN talep.Talep AS t ON t.Kimlik = h.TalepKimlik
JOIN talep.ServisZiyareti AS z ON z.Kimlik = h.ZiyaretKimlik
JOIN servis.Servis AS s ON s.Kimlik = h.ServisKimlik
LEFT JOIN kod.HakEdisDurumu AS hd ON hd.Kod = h.DurumKodu
CROSS APPLY (
    SELECT CAST(ISNULL(SUM(k.Tutar), 0) AS decimal(18,2)) AS KalemToplami
    FROM hakedis.HakEdisKalemi AS k
    WHERE k.HakEdisKimlik = h.Kimlik
) AS kt
WHERE h.NetTutar <> kt.KalemToplami;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'NetTutar''ı kalem toplamına eşit olmayan hak edişler (tasarim.md 1.9.4; haftalık denetim). Boş dönmelidir; satır varsa hakedis.HakEdisHesapla çağrılmadan yazılmış bir değişiklik vardır. Rapor rolüne açıktır.'),
 (N'TalepNumarasi', N'Hak edişin talebi.'),
 (N'ZiyaretNo', N'Ziyaret sırası.'),
 (N'ServisAdi', N'Servis.'),
 (N'DurumAdi', N'Hak ediş durumu.'),
 (N'NetTutar', N'Hak edişte yazılı NetTutar.'),
 (N'KalemToplami', N'hakedis.HakEdisKalemi tutarlarının toplamı.'),
 (N'Fark', N'NetTutar − KalemToplami.'),
 (N'ParaBirimiKodu', N'Para birimi.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'KontrolHakEdisToplamiUyusmuyor', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   17. gorunum.KontrolHakEdisHareketiUyusmuyor

   TR_hakedis_ServisHesapHareketi_Tutar (51042) hareket eklenirken denetler,
   TR_hakedis_HakEdis_TutarKilidi (51046) sonraki değişikliği kapatır. Bu
   görünüm ikisinin de arasından geçmiş satırı bulur: geri alınmamış her
   alacak hareketini kaynağıyla yeniden karşılaştırır.
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.KontrolHakEdisHareketiUyusmuyor
AS
SELECT
    LEFT(t.Numara, 3) + N'-' + SUBSTRING(t.Numara, 4, 2) + N'-' + RIGHT(t.Numara, 5) AS TalepNumarasi,
    z.ZiyaretNo,
    s.Ad AS ServisAdi,
    hd.Ad AS DurumAdi,
    ce.CariEtkisi AS HakEdisCariEtkisi,
    r.Tutar AS HareketTutari,
    CAST(ce.CariEtkisi - r.Tutar AS decimal(18,2)) AS Fark,
    CAST(CASE WHEN r.ServisKimlik = h.ServisKimlik
               AND r.SirketKodu = h.SirketKodu
               AND r.ParaBirimiKodu = h.ParaBirimiKodu
              THEN 0 ELSE 1 END AS bit) AS BagUyusmuyor,
    h.ParaBirimiKodu,
    CONVERT(datetime2(0), r.HareketZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS HareketZamaniTurkiye,
    r.KayitNo AS HareketKayitNo
FROM hakedis.ServisHesapHareketi AS r
JOIN hakedis.HakEdis AS h ON h.Kimlik = r.HakEdisKimlik
JOIN talep.Talep AS t ON t.Kimlik = h.TalepKimlik
JOIN talep.ServisZiyareti AS z ON z.Kimlik = h.ZiyaretKimlik
JOIN servis.Servis AS s ON s.Kimlik = h.ServisKimlik
LEFT JOIN kod.HakEdisDurumu AS hd ON hd.Kod = h.DurumKodu
CROSS APPLY (
    SELECT CAST(h.NetTutar + ISNULL(h.KdvTutari, 0)
                - ISNULL(h.TevkifatTutari, 0)
                - ISNULL(h.StopajTutari, 0) AS decimal(18,2)) AS CariEtkisi
) AS ce
WHERE r.HareketTuruKodu = N'hakEdisAlacagi'
  AND r.GeriAlinmaZamani IS NULL
  AND (h.DurumKodu <> N'onaylandi'
    OR r.Tutar <> ce.CariEtkisi
    OR r.ServisKimlik <> h.ServisKimlik
    OR r.SirketKodu <> h.SirketKodu
    OR r.ParaBirimiKodu <> h.ParaBirimiKodu);
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Geri alınmamış hak ediş alacağı hareketleri içinde tutarı, bağı ya da hak ediş durumu kaynağıyla uyuşmayanlar (tasarim.md 1.9.3; haftalık denetim). Boş dönmelidir; satır varsa hak edişin vergi kolonları hareket yazıldıktan sonra değişmiştir ya da hareket onaylı olmayan bir hak edişe bağlı kalmıştır. Bu iki kapı TR_hakedis_ServisHesapHareketi_Tutar (51042) ve TR_hakedis_HakEdis_TutarKilidi (51046) ile kapalıdır; görünüm ikisini de atlamış satırı arar. Rapor rolüne açıktır.'),
 (N'TalepNumarasi', N'Hak edişin talebi.'),
 (N'ZiyaretNo', N'Ziyaret sırası.'),
 (N'ServisAdi', N'Hak edişin servisi.'),
 (N'DurumAdi', N'Hak ediş durumu; onaylandı dışındaysa hareket bağlı kalmamalıydı.'),
 (N'HakEdisCariEtkisi', N'Hak edişten hesaplanan cari etkisi: NetTutar + KDV − tevkifat − stopaj.'),
 (N'HareketTutari', N'Hesap hareketinde yazılı tutar.'),
 (N'Fark', N'HakEdisCariEtkisi − HareketTutari.'),
 (N'BagUyusmuyor', N'1 ise hareketin servisi, şirketi ya da para birimi hak edişinkinden farklı.'),
 (N'ParaBirimiKodu', N'Hak edişin para birimi.'),
 (N'HareketZamaniTurkiye', N'Hareketin Türkiye saatiyle zamanı.'),
 (N'HareketKayitNo', N'Hesap hareketinin kayıt numarası.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'KontrolHakEdisHareketiUyusmuyor', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   18. gorunum.KontrolOdemeOnayiBekleyenParca
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.KontrolOdemeOnayiBekleyenParca
AS
SELECT
    LEFT(t.Numara, 3) + N'-' + SUBSTRING(t.Numara, 4, 2) + N'-' + RIGHT(t.Numara, 5) AS TalepNumarasi,
    td.Ad AS DurumAdi,
    p.OdenecekTutar,
    p.ParaBirimiKodu,
    dk.DekontSayisi,
    CONVERT(datetime2(0), dk.SonDekontZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS SonDekontZamaniTurkiye,
    DATEDIFF(day, CONVERT(date, dk.SonDekontZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time'), bg.Tarih) AS BeklemeGunu
FROM talep.Talep AS t
CROSS JOIN gorunum.Bugun AS bg
JOIN talep.ParcaTalebiAyrinti AS p ON p.TalepKimlik = t.Kimlik
JOIN kod.TalepDurumu AS td ON td.Kod = t.DurumKodu
CROSS APPLY (
    SELECT COUNT(*) AS DekontSayisi, MAX(d.OlusmaZamani) AS SonDekontZamani
    FROM talep.Dekont AS d
    WHERE d.TalepKimlik = t.Kimlik
      AND d.GecersizZamani IS NULL
) AS dk
WHERE t.Kapali = 0
  AND t.KaynakKodu <> N'servisSiparisi'
  AND dk.DekontSayisi > 0
  AND NOT EXISTS (
      SELECT 1
      FROM talep.OdemeOnayi AS o
      WHERE o.TalepKimlik = t.Kimlik
        AND o.GeriAlinmaZamani IS NULL
  );
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Geçerli dekontu gelmiş, etkin ödeme onayı olmayan açık müşteri yedek parça talepleri (servis siparişleri hariç). Muhasebenin bekleyen işi. Rapor rolüne açıktır.'),
 (N'TalepNumarasi', N'Parça talebinin numarası (YPR-26-00001).'),
 (N'DurumAdi', N'Talebin durumu.'),
 (N'OdenecekTutar', N'PAKSAN''ın doğruladığı, KDV ve kargo dahil tutar; dekont bununla karşılaştırılır.'),
 (N'ParaBirimiKodu', N'Para birimi.'),
 (N'DekontSayisi', N'Geçersiz kılınmamış dekont sayısı.'),
 (N'SonDekontZamaniTurkiye', N'Son dekontun yüklendiği an, Türkiye saati.'),
 (N'BeklemeGunu', N'Son dekontun Türkiye gününden bugüne gün.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'KontrolOdemeOnayiBekleyenParca', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   19. gorunum.KontrolOdemeTutariUyusmayanParca
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.KontrolOdemeTutariUyusmayanParca
AS
SELECT
    LEFT(t.Numara, 3) + N'-' + SUBSTRING(t.Numara, 4, 2) + N'-' + RIGHT(t.Numara, 5) AS TalepNumarasi,
    p.OdenecekTutar,
    o.OnaylananTutar,
    CAST(o.OnaylananTutar - p.OdenecekTutar AS decimal(18,2)) AS Fark,
    o.ParaBirimiKodu,
    CONVERT(datetime2(0), o.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OnayZamaniTurkiye,
    o.YapanAdi AS OnaylayanAdi
FROM talep.OdemeOnayi AS o
JOIN talep.Talep AS t ON t.Kimlik = o.TalepKimlik
JOIN talep.ParcaTalebiAyrinti AS p ON p.TalepKimlik = t.Kimlik
WHERE o.GeriAlinmaZamani IS NULL
  AND (p.OdenecekTutar IS NULL
       OR o.OnaylananTutar <> p.OdenecekTutar
       OR p.ParaBirimiKodu IS NULL
       OR o.ParaBirimiKodu <> p.ParaBirimiKodu);
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Etkin ödeme onayındaki tutarı PAKSAN''ın doğruladığı OdenecekTutar''a eşit olmayan (ya da para birimi farklı, ya da OdenecekTutar''ı boş) parça talepleri (tasarim.md 1.9.7). Rapor rolüne açıktır.'),
 (N'TalepNumarasi', N'Parça talebinin numarası.'),
 (N'OdenecekTutar', N'Doğrulanan tutar.'),
 (N'OnaylananTutar', N'Ödeme onayında yazılan tutar.'),
 (N'Fark', N'OnaylananTutar − OdenecekTutar.'),
 (N'ParaBirimiKodu', N'Ödeme onayının para birimi.'),
 (N'OnayZamaniTurkiye', N'Ödeme onayının anı, Türkiye saati.'),
 (N'OnaylayanAdi', N'Ödemeyi onaylayan personel.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'KontrolOdemeTutariUyusmayanParca', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   20. gorunum.KontrolOdemeSuresiDolanParca
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.KontrolOdemeSuresiDolanParca
AS
SELECT
    LEFT(t.Numara, 3) + N'-' + SUBSTRING(t.Numara, 4, 2) + N'-' + RIGHT(t.Numara, 5) AS TalepNumarasi,
    p.SonOdemeTarihi,
    DATEDIFF(day, p.SonOdemeTarihi, bg.Tarih) AS GecenGun,
    p.OdenecekTutar,
    p.ParaBirimiKodu
FROM talep.Talep AS t
CROSS JOIN gorunum.Bugun AS bg
JOIN talep.ParcaTalebiAyrinti AS p ON p.TalepKimlik = t.Kimlik
WHERE t.DurumKodu = N'odemeBekliyor'
  AND p.SonOdemeTarihi < bg.Tarih;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Ödeme bekleyen ve son ödeme günü (Türkiye) geçmiş parça talepleri; kendiliğinden iptal edilecek adaylar. Rapor rolüne açıktır.'),
 (N'TalepNumarasi', N'Parça talebinin numarası.'),
 (N'SonOdemeTarihi', N'Son ödeme günü.'),
 (N'GecenGun', N'Son ödeme gününden bugüne gün.'),
 (N'OdenecekTutar', N'Doğrulanan tutar.'),
 (N'ParaBirimiKodu', N'Para birimi.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'KontrolOdemeSuresiDolanParca', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   21. gorunum.KontrolSeriBicimiUyumsuzMakine
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.KontrolSeriBicimiUyumsuzMakine
AS
SELECT
    mr.Ad AS MarkaAdi,
    m.SeriNo,
    ur.Ad AS UrunAdi,
    CONVERT(datetime2(0), m.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OlusmaZamaniTurkiye,
    m.KayitNo AS MakineKayitNo
FROM makine.Makine AS m
JOIN katalog.Marka AS mr ON mr.Kod = m.MarkaKodu
LEFT JOIN katalog.Urun AS ur ON ur.MarkaKodu = m.MarkaKodu AND ur.Kod = m.UrunKodu
WHERE m.SeriBicimeUygun = 0;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Seri numarası markanın seri kuralına uymayan makineler (SeriBicimeUygun = 0). Rapor rolüne açıktır.'),
 (N'MarkaAdi', N'Marka.'),
 (N'SeriNo', N'Seri numarası.'),
 (N'UrunAdi', N'Ürün.'),
 (N'OlusmaZamaniTurkiye', N'Makine kaydının oluştuğu an, Türkiye saati.'),
 (N'MakineKayitNo', N'Makinenin KayitNo''su (gorunum.MakineKarti).');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'KontrolSeriBicimiUyumsuzMakine', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   22. gorunum.KontrolServisiOlmayanSahipliMakine
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.KontrolServisiOlmayanSahipliMakine
AS
SELECT
    mr.Ad AS MarkaAdi,
    m.SeriNo,
    ur.Ad AS UrunAdi,
    CAST(CASE WHEN gs.HesapKimlik IS NULL THEN 0 ELSE 1 END AS bit) AS SahipVar,
    CONVERT(date, gs.BaslangicZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS SahiplikBaslangicTarihi,
    il.Ad AS SahibiIlAdi,
    ks.Ad AS KaydedenServisAdi,
    CONVERT(datetime2(0), COALESCE(so.OlusmaZamani, m.OlusmaZamani) AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS KayitZamaniTurkiye,
    m.KayitNo AS MakineKayitNo
FROM makine.Makine AS m
JOIN katalog.Marka AS mr ON mr.Kod = m.MarkaKodu
LEFT JOIN katalog.Urun AS ur ON ur.MarkaKodu = m.MarkaKodu AND ur.Kod = m.UrunKodu
LEFT JOIN makine.MakineninServisi AS ms ON ms.MakineKimlik = m.Kimlik
LEFT JOIN makine.MakineGuncelSahibi AS gs ON gs.MakineKimlik = m.Kimlik
LEFT JOIN musteri.Hesap AS h ON h.Kimlik = gs.HesapKimlik
LEFT JOIN cografya.Il AS il ON il.IlKodu = h.IlKodu
OUTER APPLY (
    SELECT TOP (1) o.ServisKimlik, o.OlusmaZamani
    FROM makine.KayitOlayi AS o
    WHERE o.MakineKimlik = m.Kimlik
      AND o.KaynakKodu = N'servis'
    ORDER BY o.OlusmaZamani DESC, o.KayitNo DESC
) AS so
LEFT JOIN servis.Servis AS ks ON ks.Kimlik = so.ServisKimlik
WHERE ms.ServisKimlik IS NULL
  AND (gs.HesapKimlik IS NOT NULL OR so.OlusmaZamani IS NOT NULL);
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'makine.MakineninServisi zincirinde servisi olmayan ama sahibi olan ya da servis tarafından kaydedilmiş makineler. Bu makinelerin sahipleri servis talebi açamaz; atama backoffice''te Kayıtlı Makineler ekranından ya da yonetim.MakineyeServisAta ile yapılır. Rapor rolüne açıktır.'),
 (N'MarkaAdi', N'Marka.'),
 (N'SeriNo', N'Seri numarası.'),
 (N'UrunAdi', N'Ürün.'),
 (N'SahipVar', N'1: açık sahipliği olan hesap var.'),
 (N'SahiplikBaslangicTarihi', N'Açık sahipliğin başladığı Türkiye günü.'),
 (N'SahibiIlAdi', N'Sahip hesabın ili.'),
 (N'KaydedenServisAdi', N'Makineyi kaydeden son servis (kayıt olayının kaynağı servis).'),
 (N'KayitZamaniTurkiye', N'O servis kayıt olayının anı; yoksa makine kaydının anı, Türkiye saati.'),
 (N'MakineKayitNo', N'Makinenin KayitNo''su (gorunum.MakineKarti).');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'KontrolServisiOlmayanSahipliMakine', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   23. gorunum.KontrolKapanmamisDonem
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.KontrolKapanmamisDonem
AS
SELECT
    LEFT(d.Numara, 3) + N'-' + SUBSTRING(d.Numara, 4, 2) + N'-' + RIGHT(d.Numara, 5) AS DokumNumarasi,
    s.Ad AS ServisAdi,
    sr.Ad AS SirketAdi,
    d.ParaBirimiKodu,
    d.DonemYili,
    d.DonemAyi,
    dd.Ad AS DurumAdi,
    DATEDIFF(day, EOMONTH(DATEFROMPARTS(d.DonemYili, d.DonemAyi, 1)), bg.Tarih) AS GecenGun
FROM hakedis.DonemDokumu AS d
CROSS JOIN gorunum.Bugun AS bg
JOIN servis.Servis AS s ON s.Kimlik = d.ServisKimlik
JOIN sirket.Sirket AS sr ON sr.Kod = d.SirketKodu
LEFT JOIN kod.DonemDokumuDurumu AS dd ON dd.Kod = d.DurumKodu
WHERE d.DurumKodu NOT IN (N'odendi', N'iptal')
  AND DATEFROMPARTS(d.DonemYili, d.DonemAyi, 1) < bg.AyBasi;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Ayı geçmiş, ödenmemiş ve iptal edilmemiş aylık hak ediş dökümleri. Rapor rolüne açıktır.'),
 (N'DokumNumarasi', N'Dökümün numarası (HAK-26-00001).'),
 (N'ServisAdi', N'Servis.'),
 (N'SirketAdi', N'Şirket.'),
 (N'ParaBirimiKodu', N'Para birimi.'),
 (N'DonemYili', N'Dönem yılı.'),
 (N'DonemAyi', N'Dönem ayı.'),
 (N'DurumAdi', N'Dökümün durumu.'),
 (N'GecenGun', N'Dönem ayının son gününden bugüne gün.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'KontrolKapanmamisDonem', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* ==========================================================================
   Mutabakat görünümleri (LOGO ile karşılaştırma)
   ========================================================================== */

/* --------------------------------------------------------------------------
   24. gorunum.MutabakatHakEdisLogo
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.MutabakatHakEdisLogo
AS
WITH hak AS (
    SELECT x.ServisKimlik, x.SirketKodu, x.ParaBirimiKodu, x.DonemYili, x.DonemAyi,
           CAST(SUM(x.NetTutar) AS decimal(18,2)) AS OnayliHakEdisNetToplami
    FROM (
        SELECT h.ServisKimlik, h.SirketKodu, h.ParaBirimiKodu, h.NetTutar,
               CAST(YEAR(g.OnayGunu) AS smallint) AS DonemYili,
               CAST(MONTH(g.OnayGunu) AS tinyint) AS DonemAyi
        FROM hakedis.HakEdis AS h
        CROSS APPLY (SELECT CONVERT(date, h.OnayZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OnayGunu) AS g
        WHERE h.DurumKodu = N'onaylandi'
    ) AS x
    GROUP BY x.ServisKimlik, x.SirketKodu, x.ParaBirimiKodu, x.DonemYili, x.DonemAyi
), belge AS (
    SELECT y.ServisKimlik, y.SirketKodu, y.ParaBirimiKodu, y.DonemYili, y.DonemAyi,
           CAST(SUM(y.KdvHaricTutar) AS decimal(18,2)) AS LogoBelgeKdvHaricToplami
    FROM (
        SELECT c.ServisKimlik,
               COALESCE(b.SirketKodu, sb.Kod, c.SirketKodu, sc.Kod) AS SirketKodu,
               b.ParaBirimiKodu,
               b.KdvHaricTutar,
               CAST(YEAR(b.BelgeTarihi) AS smallint) AS DonemYili,
               CAST(MONTH(b.BelgeTarihi) AS tinyint) AS DonemAyi
        FROM entegrasyon.BelgeBagi AS b
        JOIN entegrasyon.CariKarti AS c ON c.Kimlik = b.CariKartiKimlik
        /* FirmaNo yalnız LOGO satırında şirketin LogoFirmaNo'suna karşılık gelir
           (UX_sirket_Sirket_LogoFirmaNo: en çok bir şirket). */
        OUTER APPLY (SELECT TOP (1) s1.Kod FROM sirket.Sirket AS s1
                     WHERE b.SirketKodu IS NULL AND b.DisSistemKodu = N'logo' AND s1.LogoFirmaNo = b.FirmaNo ORDER BY s1.Kod) AS sb
        OUTER APPLY (SELECT TOP (1) s2.Kod FROM sirket.Sirket AS s2
                     WHERE c.SirketKodu IS NULL AND c.DisSistemKodu = N'logo' AND s2.LogoFirmaNo = c.FirmaNo ORDER BY s2.Kod) AS sc
        WHERE c.ServisKimlik IS NOT NULL
          /* Sözleşme LOGO belgesi der (LogoBelgeKdvHaricToplami): ikinci bir
             ERP ya da e-fatura entegratörü eklenince (Bölüm 2.2) aynı belge
             iki dış sistemden gelir ve süzgeçsiz toplam iki kat çıkardı. */
          AND b.DisSistemKodu = N'logo'
          AND c.DisSistemKodu = N'logo'
          AND b.IptalZamani IS NULL
          AND b.BelgeTarihi IS NOT NULL
          AND b.BelgeTuruKodu IN (N'alisFaturasi', N'giderPusulasi')
    ) AS y
    GROUP BY y.ServisKimlik, y.SirketKodu, y.ParaBirimiKodu, y.DonemYili, y.DonemAyi
), eslesme AS (
    SELECT COALESCE(hak.ServisKimlik, belge.ServisKimlik) AS ServisKimlik,
           COALESCE(hak.SirketKodu, belge.SirketKodu) AS SirketKodu,
           COALESCE(hak.ParaBirimiKodu, belge.ParaBirimiKodu) AS ParaBirimiKodu,
           COALESCE(hak.DonemYili, belge.DonemYili) AS DonemYili,
           COALESCE(hak.DonemAyi, belge.DonemAyi) AS DonemAyi,
           hak.OnayliHakEdisNetToplami,
           belge.LogoBelgeKdvHaricToplami
    FROM hak
    FULL OUTER JOIN belge
      ON belge.ServisKimlik = hak.ServisKimlik
     AND belge.SirketKodu = hak.SirketKodu
     AND belge.ParaBirimiKodu = hak.ParaBirimiKodu
     AND belge.DonemYili = hak.DonemYili
     AND belge.DonemAyi = hak.DonemAyi
)
SELECT
    s.Ad AS ServisAdi,
    sr.Ad AS SirketAdi,
    e.ParaBirimiKodu,
    e.DonemYili,
    e.DonemAyi,
    e.OnayliHakEdisNetToplami,
    e.LogoBelgeKdvHaricToplami,
    CAST(ISNULL(e.OnayliHakEdisNetToplami, 0) - ISNULL(e.LogoBelgeKdvHaricToplami, 0) AS decimal(18,2)) AS Fark,
    dk.DokumNumarasi
FROM eslesme AS e
JOIN servis.Servis AS s ON s.Kimlik = e.ServisKimlik
LEFT JOIN sirket.Sirket AS sr ON sr.Kod = e.SirketKodu
OUTER APPLY (
    SELECT TOP (1) LEFT(d.Numara, 3) + N'-' + SUBSTRING(d.Numara, 4, 2) + N'-' + RIGHT(d.Numara, 5) AS DokumNumarasi
    FROM hakedis.DonemDokumu AS d
    WHERE d.ServisKimlik = e.ServisKimlik
      AND d.SirketKodu = e.SirketKodu
      AND d.ParaBirimiKodu = e.ParaBirimiKodu
      AND d.DonemYili = e.DonemYili
      AND d.DonemAyi = e.DonemAyi
      AND d.DurumKodu <> N'iptal'
    ORDER BY d.KayitNo DESC
) AS dk;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Servis × şirket × para birimi × ay: onaylı hak edişlerin net toplamı (dönem = onay anının Türkiye ayı) ile o servisin cari kartına bağlı, iptal edilmemiş servis faturası (alisFaturasi) ve gider pusulası (giderPusulasi) belgelerinin KDV hariç toplamı (dönem = belge tarihi). Belgenin şirketi COALESCE(belge SirketKodu, belge FirmaNo''suna eşleşen şirket, cari kart SirketKodu, cari kart FirmaNo''suna eşleşen şirket). İki taraftan yalnız biri olan ay da listelenir. Rapor rolüne açıktır. Örnek: SELECT * FROM gorunum.MutabakatHakEdisLogo WHERE Fark <> 0;'),
 (N'ServisAdi', N'Servis.'),
 (N'SirketAdi', N'Şirket; belgenin şirketi çözülemediyse boş.'),
 (N'ParaBirimiKodu', N'Para birimi.'),
 (N'DonemYili', N'Dönem yılı.'),
 (N'DonemAyi', N'Dönem ayı.'),
 (N'OnayliHakEdisNetToplami', N'O ay onaylanan hak edişlerin NetTutar toplamı.'),
 (N'LogoBelgeKdvHaricToplami', N'O ay tarihli LOGO servis faturası ve gider pusulalarının KDV hariç toplamı.'),
 (N'Fark', N'OnayliHakEdisNetToplami − LogoBelgeKdvHaricToplami (boşlar 0 sayılır).'),
 (N'DokumNumarasi', N'Aynı servis, şirket, para birimi ve ayın iptal edilmemiş dökümü.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'MutabakatHakEdisLogo', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   25. gorunum.MutabakatParcaLogo
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.MutabakatParcaLogo
AS
SELECT
    LEFT(t.Numara, 3) + N'-' + SUBSTRING(t.Numara, 4, 2) + N'-' + RIGHT(t.Numara, 5) AS TalepNumarasi,
    p.OdenecekTutar,
    o.OnaylananTutar,
    fb.LogoSatisFaturasiTutari,
    CAST(o.OnaylananTutar - ISNULL(fb.LogoSatisFaturasiTutari, 0) AS decimal(18,2)) AS Fark,
    fb.BelgeNo,
    fb.BelgeTarihi,
    o.ParaBirimiKodu
FROM talep.OdemeOnayi AS o
JOIN talep.Talep AS t ON t.Kimlik = o.TalepKimlik
JOIN talep.ParcaTalebiAyrinti AS p ON p.TalepKimlik = t.Kimlik
OUTER APPLY (
    SELECT CAST(SUM(b.Tutar) AS decimal(18,2)) AS LogoSatisFaturasiTutari,
           STRING_AGG(CAST(b.BelgeNo AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY b.BelgeTarihi, b.BelgeNo) AS BelgeNo,
           MAX(b.BelgeTarihi) AS BelgeTarihi
    FROM talep.TalepBelgesi AS tb
    JOIN entegrasyon.BelgeBagi AS b ON b.Kimlik = tb.BelgeBagiKimlik
    LEFT JOIN entegrasyon.CariKarti AS c ON c.Kimlik = b.CariKartiKimlik
    OUTER APPLY (SELECT TOP (1) s1.Kod FROM sirket.Sirket AS s1
                 WHERE b.SirketKodu IS NULL AND b.DisSistemKodu = N'logo' AND s1.LogoFirmaNo = b.FirmaNo ORDER BY s1.Kod) AS sb
    OUTER APPLY (SELECT TOP (1) s2.Kod FROM sirket.Sirket AS s2
                 WHERE c.SirketKodu IS NULL AND c.DisSistemKodu = N'logo' AND s2.LogoFirmaNo = c.FirmaNo ORDER BY s2.Kod) AS sc
    WHERE tb.TalepKimlik = t.Kimlik
      AND b.BelgeTuruKodu = N'satisFaturasi'
      /* Sözleşme LOGO faturası der (LogoSatisFaturasiTutari); ikinci bir dış
         sistem eklenince süzgeçsiz toplam aynı faturayı iki kez sayardı.
         Cari kartı LEFT JOIN olduğu için yalnız doluysa süzülür. */
      AND b.DisSistemKodu = N'logo'
      AND (c.Kimlik IS NULL OR c.DisSistemKodu = N'logo')
      AND b.IptalZamani IS NULL
      AND (COALESCE(b.SirketKodu, sb.Kod, c.SirketKodu, sc.Kod) IS NULL
           OR COALESCE(b.SirketKodu, sb.Kod, c.SirketKodu, sc.Kod) = p.SirketKodu)
) AS fb
WHERE o.GeriAlinmaZamani IS NULL;
GO

DECLARE @Aciklama TABLE (Sira int IDENTITY(1,1) PRIMARY KEY, Alt sysname NULL, Metin nvarchar(3750) NOT NULL);
INSERT @Aciklama (Alt, Metin) VALUES
 (NULL, N'Etkin ödeme onayı olan parça talepleri ile talebe bağlı (talep.TalepBelgesi), iptal edilmemiş satış faturaları. Birden çok fatura varsa tutarlar toplanır, numaralar virgülle yazılır. Faturanın şirketi (COALESCE ile çözülen) talebin şirketinden farklıysa fatura sayılmaz. Faturası olmayan onaylı talep de listelenir. Rapor rolüne açıktır.'),
 (N'TalepNumarasi', N'Parça talebinin numarası.'),
 (N'OdenecekTutar', N'Doğrulanan tutar.'),
 (N'OnaylananTutar', N'Ödeme onayındaki tutar.'),
 (N'LogoSatisFaturasiTutari', N'Bağlı satış faturalarının KDV dahil toplamı.'),
 (N'Fark', N'OnaylananTutar − LogoSatisFaturasiTutari (fatura yoksa 0 sayılır).'),
 (N'BelgeNo', N'Fatura numaraları, virgülle.'),
 (N'BelgeTarihi', N'En son fatura tarihi.'),
 (N'ParaBirimiKodu', N'Ödeme onayının para birimi.');
DECLARE @i int = 1, @Alt sysname, @Metin nvarchar(3750);
WHILE @i <= (SELECT MAX(Sira) FROM @Aciklama)
BEGIN
    SELECT @Alt = Alt, @Metin = Metin FROM @Aciklama WHERE Sira = @i;
    EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'MutabakatParcaLogo', @Alt = @Alt, @Metin = @Metin;
    SET @i += 1;
END;
GO

/* --------------------------------------------------------------------------
   25. rol_rapor izinleri (tasarim.md 4.2; CD-YETKI listeyi birebir denetler)
   -------------------------------------------------------------------------- */
GRANT SELECT ON OBJECT::gorunum.Bugun TO rol_rapor;
GRANT SELECT ON OBJECT::gorunum.TalepIstatistigi TO rol_rapor;
GRANT SELECT ON OBJECT::gorunum.HakEdisListesi TO rol_rapor;
GRANT SELECT ON OBJECT::gorunum.ServisHesapHareketleri TO rol_rapor;
GRANT SELECT ON OBJECT::gorunum.ServisBakiyesi TO rol_rapor;
GRANT SELECT ON OBJECT::gorunum.DuyuruListesi TO rol_rapor;
GRANT SELECT ON OBJECT::gorunum.KontrolLogoCariKoduEksik TO rol_rapor;
GRANT SELECT ON OBJECT::gorunum.KontrolOnayBekleyenHakEdis TO rol_rapor;
GRANT SELECT ON OBJECT::gorunum.KontrolHakEdisToplamiUyusmuyor TO rol_rapor;
GRANT SELECT ON OBJECT::gorunum.KontrolHakEdisHareketiUyusmuyor TO rol_rapor;
GRANT SELECT ON OBJECT::gorunum.KontrolOdemeOnayiBekleyenParca TO rol_rapor;
GRANT SELECT ON OBJECT::gorunum.KontrolOdemeTutariUyusmayanParca TO rol_rapor;
GRANT SELECT ON OBJECT::gorunum.KontrolOdemeSuresiDolanParca TO rol_rapor;
GRANT SELECT ON OBJECT::gorunum.KontrolSeriBicimiUyumsuzMakine TO rol_rapor;
GRANT SELECT ON OBJECT::gorunum.KontrolServisiOlmayanSahipliMakine TO rol_rapor;
GRANT SELECT ON OBJECT::gorunum.KontrolKapanmamisDonem TO rol_rapor;
GRANT SELECT ON OBJECT::gorunum.MutabakatHakEdisLogo TO rol_rapor;
GRANT SELECT ON OBJECT::gorunum.MutabakatParcaLogo TO rol_rapor;

/* Kişisel veri taşıyan görünümler rapor rolüne açılmaz (tasarim.md 4.2).
   Elle verilmiş bir izin varsa bu betik her uygulandığında geri alınır. */
REVOKE SELECT ON OBJECT::gorunum.GecerliAyar FROM rol_rapor;
REVOKE SELECT ON OBJECT::gorunum.TalepListesi FROM rol_rapor;
REVOKE SELECT ON OBJECT::gorunum.TalepDurumGecmisi FROM rol_rapor;
REVOKE SELECT ON OBJECT::gorunum.MusteriKarti FROM rol_rapor;
REVOKE SELECT ON OBJECT::gorunum.MakineKarti FROM rol_rapor;
REVOKE SELECT ON OBJECT::gorunum.ServisKarti FROM rol_rapor;
REVOKE SELECT ON OBJECT::gorunum.BayiKarti FROM rol_rapor;
REVOKE SELECT ON OBJECT::gorunum.IslemGecmisi FROM rol_rapor;
GO
