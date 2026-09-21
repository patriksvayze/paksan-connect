/* ==========================================================================
   R07 — yardim prosedürleri (tasarim.md Bölüm 3.1, 3.4, 3.6)

   yardim.TalepGoster     talebin bütün kayıtları (22 sonuç kümesi)
   yardim.HakEdisGoster   HAK dökümü ya da talebin hak edişleri (4 küme)
   yardim.MakineGoster    seri numarasıyla makine (8 küme)
   yardim.MusteriGoster   telefon ya da adla müşteri (11 küme)
   yardim.ServisGoster    ad, giriş adı, eski numara, cari kodu, telefon ya
                          da KayitNo ile servis (12 küme)
   yardim.Ara             her türlü girdiyle bütün kayıtlarda arama (1 küme)

   Ortak kurallar:
   - Yalnız okur. Prosedür gövdelerinde INSERT, UPDATE, DELETE, MERGE ve
     yardim dışı EXEC yoktur; ara sonuç tablo değişkenine değil JSON
     dizgisine (FOR JSON / OPENJSON) konur.
   - Kullanıcı girdisi yalnız yardim.Sadelestir ile normalleştirilir.
   - Her sonuç kümesinin ilk kolonu Bolum. Küme sayısı ve sırası sabittir;
     veri yoksa küme boş döner (MusteriGoster ve ServisGoster'de çok kayıt
     eşleşince yalnız ilk küme döner; tasarim.md 3.4.4, 3.4.5).
   - Birden çok satır dönebilen kümelerde en çok 200 satır; fazlası varsa
     her satırda DahaFazlaVar = 1 (tam liste ilgili gorunum görünümünde).
   - uniqueidentifier kolon yok; zamanlar …ZamaniTurkiye, günler …Tarihi.
   - Kod gibi değer taşıyan sabit kolonlar (Nereden, Liste, Tur,
     BulunduguYer) İngilizce harfli koddur; anlamları açıklamada.

   Bağımlılık: R01 (yardim.Sadelestir), R03 (makine.*, kvkk.GuncelRiza,
   talep.ZiyaretGuncelParcasi), R06 (gorunum.*). Yetki V0015'te
   (EXECUTE ON SCHEMA::yardim TO rol_yonetici).
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. yardim.TalepGoster
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yardim.TalepGoster
    @Numara nvarchar(400)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Kod nvarchar(400);
    DECLARE @Ham nvarchar(400) = UPPER(LTRIM(RTRIM(ISNULL(@Numara, N''))) COLLATE Latin1_General_100_BIN2);
    DECLARE @TalepKimlik uniqueidentifier;
    DECLARE @Adet int = 0;
    DECLARE @TalepNo nvarchar(10);

    SELECT @Kod = s.Kod FROM yardim.Sadelestir(@Numara) AS s;

    /* Önce Numara, sonra EskiNumara, sonra CihazNumarasi; en iyi öncelikte
       birden çok talep varsa hangisinin istendiği bilinemez: 51103. */
    WITH aday AS (
        SELECT t.Kimlik, 1 AS Oncelik
        FROM talep.Talep AS t
        WHERE t.Numara = @Kod
        UNION ALL
        SELECT t.Kimlik, 2
        FROM talep.Talep AS t
        WHERE t.EskiNumara IS NOT NULL
          AND (UPPER(t.EskiNumara COLLATE Latin1_General_100_BIN2) = @Ham
               OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(t.EskiNumara COLLATE Latin1_General_100_BIN2),
                          N'-', N''), N' ', N''), N'.', N''), N'/', N''), N'_', N'') = @Kod)
        UNION ALL
        SELECT t.Kimlik, 3
        FROM talep.Talep AS t
        WHERE t.CihazNumarasi IS NOT NULL
          AND (UPPER(t.CihazNumarasi COLLATE Latin1_General_100_BIN2) = @Ham
               OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(t.CihazNumarasi COLLATE Latin1_General_100_BIN2),
                          N'-', N''), N' ', N''), N'.', N''), N'/', N''), N'_', N'') = @Kod)
    ), sirali AS (
        SELECT a.Kimlik, a.Oncelik, MIN(a.Oncelik) OVER () AS EnIyi
        FROM aday AS a
    )
    SELECT TOP (1) @TalepKimlik = s.Kimlik, @Adet = COUNT(*) OVER ()
    FROM sirali AS s
    WHERE s.Oncelik = s.EnIyi;

    IF @TalepKimlik IS NULL
        THROW 51102, N'bu numarayla talep bulunamadı; EXEC yardim.Ara ile arayın', 1;
    IF @Adet > 1
        THROW 51103, N'bu numara birden çok talebe uyuyor; EXEC yardim.Ara ile arayıp tam numarayı verin', 1;

    SELECT @TalepNo = t.Numara FROM talep.Talep AS t WHERE t.Kimlik = @TalepKimlik;

    /* 1 · Özet */
    SELECT N'1 · Özet' AS Bolum, v.*
    FROM gorunum.TalepListesi AS v
    JOIN talep.Talep AS t ON t.KayitNo = v.KayitNo
    WHERE t.Kimlik = @TalepKimlik;

    /* 2 · Durum geçmişi */
    SELECT TOP (200) N'2 · Durum geçmişi' AS Bolum, v.*,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM gorunum.TalepDurumGecmisi AS v
    JOIN talep.DurumGecmisi AS d ON d.KayitNo = v.KayitNo
    WHERE d.TalepKimlik = @TalepKimlik
    ORDER BY d.OlusmaZamani DESC, d.KayitNo DESC;

    /* 3 · Ayrıntı ve belirtiler (türe göre dolu olan kolonlar) */
    SELECT N'3 · Ayrıntı ve belirtiler' AS Bolum,
           t.Aciklama AS TalepAciklamasi,
           t.IletisimAdi,
           t.IletisimTelefonE164 AS IletisimTelefonu,
           t.Adres,
           t.YurtdisiIlce,
           uz.Ad AS UlasimZamaniAdi,
           md.Ad AS MakineDurumuAdi,
           (SELECT STRING_AGG(CAST(COALESCE(b.Ad, tb.BelirtiKodu COLLATE DATABASE_DEFAULT) AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY b.Sira, tb.BelirtiKodu)
            FROM talep.TalepBelirtisi AS tb
            LEFT JOIN kod.Belirti AS b ON b.Kod = tb.BelirtiKodu
            WHERE tb.TalepKimlik = t.Kimlik) AS Belirtiler,
           iu.Ad AS IlgiUrunAdi,
           tg.Ad AS TraktorGucuAdi,
           (SELECT STRING_AGG(CAST(COALESCE(u.Ad, tu.UrunTipiKodu COLLATE DATABASE_DEFAULT) AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY u.Sira, tu.UrunTipiKodu)
            FROM talep.TeklifUrunTipi AS tu
            LEFT JOIN kod.UrunTipi AS u ON u.Kod = tu.UrunTipiKodu
            WHERE tu.TalepKimlik = t.Kimlik) AS UrunTipleri,
           (SELECT STRING_AGG(CAST(COALESCE(ar.Ad, ta2.AraziKodu COLLATE DATABASE_DEFAULT) AS nvarchar(max)), N', ') WITHIN GROUP (ORDER BY ar.Sira, ta2.AraziKodu)
            FROM talep.TeklifArazi AS ta2
            LEFT JOIN kod.Arazi AS ar ON ar.Kod = ta2.AraziKodu
            WHERE ta2.TalepKimlik = t.Kimlik) AS Araziler,
           oy.Ad AS OdemeYontemiAdi,
           p.FiyatListesiKodu,
           p.KdvOrani,
           p.ListeKdvHaric,
           p.IskontoOrani,
           p.EksikFiyatVar,
           p.AraToplam,
           p.KdvTutari,
           p.GenelToplam,
           p.KargoTutari,
           p.OdenecekTutar,
           p.ParaBirimiKodu,
           p.SonOdemeTarihi,
           p.TutarDogrulayanAdi,
           CONVERT(datetime2(0), p.TutarDogrulamaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS TutarDogrulamaZamaniTurkiye,
           sr.Ad AS SirketAdi,
           p.TeslimatAdresi
    FROM talep.Talep AS t
    LEFT JOIN kod.UlasimZamani AS uz ON uz.Kod = t.UlasimZamaniKodu
    LEFT JOIN talep.ServisTalebiAyrinti AS sa ON sa.TalepKimlik = t.Kimlik
    LEFT JOIN kod.MakineDurumu AS md ON md.Kod = sa.MakineDurumuKodu
    LEFT JOIN talep.TeklifTalebiAyrinti AS ta ON ta.TalepKimlik = t.Kimlik
    LEFT JOIN katalog.Urun AS iu ON iu.MarkaKodu = ta.IlgiUrunMarkaKodu AND iu.Kod = ta.IlgiUrunKodu
    LEFT JOIN kod.TraktorGucu AS tg ON tg.Kod = ta.TraktorGucuKodu
    LEFT JOIN talep.ParcaTalebiAyrinti AS p ON p.TalepKimlik = t.Kimlik
    LEFT JOIN kod.OdemeYontemi AS oy ON oy.Kod = p.OdemeYontemiKodu
    LEFT JOIN sirket.Sirket AS sr ON sr.Kod = p.SirketKodu
    WHERE t.Kimlik = @TalepKimlik;

    /* 4 · Parça satırları (müşterinin gördüğü fiyat görüntüsü) */
    SELECT TOP (200) N'4 · Parça satırları' AS Bolum,
           ps.SiraNo, ps.MarkaKodu, ps.ParcaKodu, ps.ParcaAdi, ps.KatalogDisi, ps.Aciklama,
           ps.Adet, ps.BirimFiyat, ps.Tutar, ps.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM talep.ParcaSatiri AS ps
    WHERE ps.TalepKimlik = @TalepKimlik
    ORDER BY ps.SiraNo;

    /* 5 · Fatura bilgisi (şifreli ve özet kolon yok) */
    SELECT N'5 · Fatura bilgisi' AS Bolum,
           ft.Ad AS FaturaTuruAdi,
           f.AdSoyad, f.Unvan, f.TcNoMaskeli, f.VergiNoMaskeli, f.VergiDairesi, f.Eposta,
           f.TelefonE164 AS Telefon,
           u.Ad AS UlkeAdi, il.Ad AS IlAdi, ilc.Ad AS IlceAdi, f.YurtdisiBolge, f.YurtdisiIlce, f.Adres,
           CONVERT(datetime2(0), f.GuncellemeZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS GuncellemeZamaniTurkiye
    FROM talep.FaturaBilgisi AS f
    LEFT JOIN kod.FaturaTuru AS ft ON ft.Kod = f.FaturaTuruKodu
    LEFT JOIN cografya.Ulke AS u ON u.Kod = f.KonumUlkeKodu
    LEFT JOIN cografya.Il AS il ON il.IlKodu = f.IlKodu
    LEFT JOIN cografya.Ilce AS ilc ON ilc.IlceKodu = f.IlceKodu
    WHERE f.TalepKimlik = @TalepKimlik;

    /* 6 · Notlar */
    SELECT TOP (200) N'6 · Notlar' AS Bolum,
           CONVERT(datetime2(0), n.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           n.Metin, n.MusteriGorur, n.ServisGorur, n.ServistenGeldi,
           ya.Ad AS YapanTuruAdi, n.YapanAdi, ku.Ad AS KaynakUygulamaAdi, n.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM talep.TalepNotu AS n
    LEFT JOIN kod.AktorTuru AS ya ON ya.Kod = n.YapanTuruKodu
    LEFT JOIN kod.KaynakUygulama AS ku ON ku.Kod = n.KaynakUygulamaKodu
    WHERE n.TalepKimlik = @TalepKimlik
    ORDER BY n.OlusmaZamani DESC, n.KayitNo DESC;

    /* 7 · Randevular */
    SELECT TOP (200) N'7 · Randevular' AS Bolum,
           CONVERT(datetime2(0), r.PlanlananZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS PlanlananZamanTurkiye,
           r.SaatBelirtildi, r.IsTanimi, r.MusteriyleGorusuldu,
           CONVERT(datetime2(0), r.IptalZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS IptalZamaniTurkiye,
           r.YapanAdi,
           CONVERT(datetime2(0), r.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           r.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM talep.Randevu AS r
    WHERE r.TalepKimlik = @TalepKimlik
    ORDER BY r.OlusmaZamani DESC, r.KayitNo DESC;

    /* 8 · Teklifler */
    SELECT TOP (200) N'8 · Teklifler' AS Bolum,
           tk.SiraNo, tk.Tutar, tk.ParaBirimiKodu, tk.KdvDahil, tk.GecerlilikBitisTarihi, tk.GecerlilikMetni,
           tk.TeklifNotu, tk.YapanAdi,
           CONVERT(datetime2(0), tk.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           tk.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM talep.Teklif AS tk
    WHERE tk.TalepKimlik = @TalepKimlik
    ORDER BY tk.OlusmaZamani DESC, tk.SiraNo DESC;

    /* 9 · Servis ziyaretleri */
    SELECT TOP (200) N'9 · Servis ziyaretleri' AS Bolum,
           z.ZiyaretNo, s.Ad AS ServisAdi, s.KayitNo AS ServisKayitNo,
           kp.Ad AS KapiAdi, ase.Ad AS AsamaAdi, yi.Ad AS YapilanIsAdi, gd.Ad AS GarantiDayanagiAdi,
           z.ArizaMetni, z.SonucMetni, z.Km, z.IscilikTutari, z.ParaBirimiKodu, z.TeknisyenAdi,
           CONVERT(datetime2(0), z.ParcaIstemeZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ParcaIstemeZamaniTurkiye,
           CONVERT(datetime2(0), z.TamamlanmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS TamamlanmaZamaniTurkiye,
           z.YapanAdi,
           CONVERT(datetime2(0), z.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           z.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM talep.ServisZiyareti AS z
    JOIN servis.Servis AS s ON s.Kimlik = z.ServisKimlik
    LEFT JOIN kod.ServisKapisi AS kp ON kp.Kod = z.KapiKodu
    LEFT JOIN kod.ZiyaretAsamasi AS ase ON ase.Kod = z.AsamaKodu
    LEFT JOIN kod.YapilanIs AS yi ON yi.Kod = z.YapilanIsKodu
    LEFT JOIN kod.GarantiDayanagi AS gd ON gd.Kod = z.GarantiDayanagiKodu
    WHERE z.TalepKimlik = @TalepKimlik
    ORDER BY z.ZiyaretNo DESC;

    /* 10 · Ziyaret parçaları ve düzeltmeler
       Liste: guncel (talep.ZiyaretGuncelParcasi), servisinGonderdigi
       (ZiyaretParcaSatiri), duzeltme (düzeltmenin km ve işçilik satırı),
       duzeltmeOncesi / duzeltmeSonrasi (ZiyaretDuzeltmesiParcasi). */
    WITH satir AS (
        SELECT z.ZiyaretNo, 1 AS ListeSira, N'guncel' AS Liste,
               CAST(NULL AS bigint) AS DuzeltmeKayitNo, CAST(NULL AS nvarchar(500)) AS DuzeltmeNedeni,
               g.SiraNo, g.ParcaKodu, g.ParcaAdi, g.Adet, g.BirimFiyat,
               CAST(NULL AS decimal(9,1)) AS OncekiKm, CAST(NULL AS decimal(9,1)) AS YeniKm,
               CAST(NULL AS decimal(18,2)) AS OncekiIscilikTutari, CAST(NULL AS decimal(18,2)) AS YeniIscilikTutari,
               CAST(NULL AS nvarchar(150)) AS DuzeltenAdi, CAST(NULL AS datetime2(3)) AS Zaman
        FROM talep.ServisZiyareti AS z
        JOIN talep.ZiyaretGuncelParcasi AS g ON g.ZiyaretKimlik = z.Kimlik
        WHERE z.TalepKimlik = @TalepKimlik
        UNION ALL
        SELECT z.ZiyaretNo, 2, N'servisinGonderdigi', NULL, NULL,
               zp.SiraNo, zp.ParcaKodu, zp.ParcaAdi, zp.Adet, zp.BirimFiyat,
               NULL, NULL, NULL, NULL, z.YapanAdi, z.OlusmaZamani
        FROM talep.ServisZiyareti AS z
        JOIN talep.ZiyaretParcaSatiri AS zp ON zp.ZiyaretKimlik = z.Kimlik
        WHERE z.TalepKimlik = @TalepKimlik
        UNION ALL
        SELECT z.ZiyaretNo, 3, N'duzeltme', zd.KayitNo, zd.Neden,
               NULL, NULL, NULL, NULL, NULL,
               zd.OncekiKm, zd.YeniKm, zd.OncekiIscilikTutari, zd.YeniIscilikTutari, zd.YapanAdi, zd.OlusmaZamani
        FROM talep.ServisZiyareti AS z
        JOIN talep.ZiyaretDuzeltmesi AS zd ON zd.ZiyaretKimlik = z.Kimlik
        WHERE z.TalepKimlik = @TalepKimlik
        UNION ALL
        SELECT z.ZiyaretNo, CASE WHEN dp.TarafKodu = N'onceki' THEN 4 ELSE 5 END,
               CASE WHEN dp.TarafKodu = N'onceki' THEN N'duzeltmeOncesi' ELSE N'duzeltmeSonrasi' END,
               zd.KayitNo, zd.Neden,
               dp.SiraNo, dp.ParcaKodu, dp.ParcaAdi, dp.Adet, dp.BirimFiyat,
               NULL, NULL, NULL, NULL, zd.YapanAdi, zd.OlusmaZamani
        FROM talep.ServisZiyareti AS z
        JOIN talep.ZiyaretDuzeltmesi AS zd ON zd.ZiyaretKimlik = z.Kimlik
        JOIN talep.ZiyaretDuzeltmesiParcasi AS dp ON dp.DuzeltmeKimlik = zd.Kimlik
        WHERE z.TalepKimlik = @TalepKimlik
    )
    SELECT TOP (200) N'10 · Ziyaret parçaları ve düzeltmeler' AS Bolum,
           s.ZiyaretNo, s.Liste, s.DuzeltmeKayitNo, s.DuzeltmeNedeni,
           s.SiraNo, s.ParcaKodu, s.ParcaAdi, s.Adet, s.BirimFiyat,
           s.OncekiKm, s.YeniKm, s.OncekiIscilikTutari, s.YeniIscilikTutari,
           s.DuzeltenAdi,
           CONVERT(datetime2(0), s.Zaman AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM satir AS s
    ORDER BY s.ZiyaretNo DESC, s.ListeSira, s.DuzeltmeKayitNo DESC, s.SiraNo;

    /* 11 · Hak edişler ve kalemler (kalem başına bir satır; kalemsiz hak ediş bir satır) */
    SELECT TOP (200) N'11 · Hak edişler ve kalemler' AS Bolum,
           v.*, h.RedNedeni,
           kt.Ad AS KalemTuruAdi, k.Miktar, bi.Ad AS BirimAdi, k.BirimTutar, k.Tutar,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM hakedis.HakEdis AS h
    JOIN gorunum.HakEdisListesi AS v ON v.KayitNo = h.KayitNo
    LEFT JOIN hakedis.HakEdisKalemi AS k ON k.HakEdisKimlik = h.Kimlik
    LEFT JOIN kod.HakEdisKalemTuru AS kt ON kt.Kod = k.KalemTuruKodu
    LEFT JOIN kod.Birim AS bi ON bi.Kod = k.BirimKodu
    WHERE h.TalepKimlik = @TalepKimlik
    ORDER BY h.OlusmaZamani DESC, kt.Sira, k.KalemTuruKodu;

    /* 12 · Dekontlar ve ödeme onayları (dekont satırında onay kolonları boş, onay satırında dekont kolonları boş) */
    WITH odeme AS (
        SELECT d.KayitNo AS DekontKayitNo, d.OlusmaZamani AS YuklemeZamani, ds.KayitNo AS DosyaKayitNo,
               d.GecersizZamani, d.GecersizNedeni, d.GecersizKilanAdi,
               CAST(NULL AS bigint) AS OnayKayitNo, CAST(NULL AS decimal(18,2)) AS OnaylananTutar,
               CAST(NULL AS nvarchar(3)) AS ParaBirimiKodu, CAST(NULL AS nvarchar(500)) AS OnayNotu,
               CAST(NULL AS nvarchar(150)) AS OnaylayanAdi, CAST(NULL AS datetime2(3)) AS OnayZamani,
               CAST(NULL AS datetime2(3)) AS GeriAlinmaZamani, CAST(NULL AS nvarchar(150)) AS GeriAlanAdi,
               d.OlusmaZamani AS Zaman
        FROM talep.Dekont AS d
        JOIN dosya.Dosya AS ds ON ds.Kimlik = d.DosyaKimlik
        WHERE d.TalepKimlik = @TalepKimlik
        UNION ALL
        SELECT NULL, NULL, NULL, NULL, NULL, NULL,
               o.KayitNo, o.OnaylananTutar, o.ParaBirimiKodu, o.OnayNotu, o.YapanAdi, o.OlusmaZamani,
               o.GeriAlinmaZamani, o.GeriAlanAdi, o.OlusmaZamani
        FROM talep.OdemeOnayi AS o
        WHERE o.TalepKimlik = @TalepKimlik
    )
    SELECT TOP (200) N'12 · Dekontlar ve ödeme onayları' AS Bolum,
           x.DekontKayitNo,
           CONVERT(datetime2(0), x.YuklemeZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS YuklemeZamaniTurkiye,
           x.DosyaKayitNo,
           CONVERT(datetime2(0), x.GecersizZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS GecersizZamaniTurkiye,
           x.GecersizNedeni, x.GecersizKilanAdi,
           x.OnayKayitNo, x.OnaylananTutar, x.ParaBirimiKodu, x.OnayNotu, x.OnaylayanAdi,
           CONVERT(datetime2(0), x.OnayZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OnayZamaniTurkiye,
           CONVERT(datetime2(0), x.GeriAlinmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS GeriAlinmaZamaniTurkiye,
           x.GeriAlanAdi,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM odeme AS x
    ORDER BY x.Zaman DESC;

    /* 13 · Sevkler (Guncel = 1: talebin son ziyaretinin, parça talebinde son sevk) */
    SELECT TOP (200) N'13 · Sevkler' AS Bolum,
           z.ZiyaretNo, kf.Ad AS KargoFirmasiAdi, sv.KargoFirmasiMetni, sv.TakipNo,
           CONVERT(datetime2(0), sv.SevkZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS SevkZamaniTurkiye,
           CONVERT(datetime2(0), sv.SonGuncellemeZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS SonGuncellemeZamaniTurkiye,
           sv.GuncelleyenAdi, bb.BelgeNo, sv.YapanAdi,
           CAST(CASE WHEN ROW_NUMBER() OVER (ORDER BY z.ZiyaretNo DESC, sv.SevkZamani DESC, sv.KayitNo DESC) = 1 THEN 1 ELSE 0 END AS bit) AS Guncel,
           sv.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM talep.ParcaSevki AS sv
    LEFT JOIN talep.ServisZiyareti AS z ON z.Kimlik = sv.ZiyaretKimlik
    LEFT JOIN kod.KargoFirmasi AS kf ON kf.Kod = sv.KargoFirmasiKodu
    LEFT JOIN entegrasyon.BelgeBagi AS bb ON bb.Kimlik = sv.BelgeBagiKimlik
    WHERE sv.TalepKimlik = @TalepKimlik
    ORDER BY sv.SevkZamani DESC, sv.KayitNo DESC;

    /* 14 · Kapanışlar */
    SELECT TOP (200) N'14 · Kapanışlar' AS Bolum,
           kt.Ad AS KapanisTuruAdi, z.ZiyaretNo, yi.Ad AS YapilanIsAdi, k.YapilanIsMetni, k.DegisenParcalarMetni,
           ud.Ad AS UcretDurumuAdi, k.UcretTutari, ts.Ad AS TeklifSonucuAdi, k.SatisFiyati, k.ParaBirimiKodu,
           k.KapanisNotu, ya.Ad AS YapanTuruAdi, k.YapanAdi, ku.Ad AS KaynakUygulamaAdi,
           CONVERT(datetime2(0), k.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           k.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM talep.Kapanis AS k
    LEFT JOIN talep.ServisZiyareti AS z ON z.Kimlik = k.ZiyaretKimlik
    LEFT JOIN kod.KapanisTuru AS kt ON kt.Kod = k.KapanisTuruKodu
    LEFT JOIN kod.YapilanIs AS yi ON yi.Kod = k.YapilanIsKodu
    LEFT JOIN kod.UcretDurumu AS ud ON ud.Kod = k.UcretDurumuKodu
    LEFT JOIN kod.TeklifSonucu AS ts ON ts.Kod = k.TeklifSonucuKodu
    LEFT JOIN kod.AktorTuru AS ya ON ya.Kod = k.YapanTuruKodu
    LEFT JOIN kod.KaynakUygulama AS ku ON ku.Kod = k.KaynakUygulamaKodu
    WHERE k.TalepKimlik = @TalepKimlik
    ORDER BY k.OlusmaZamani DESC, k.KayitNo DESC;

    /* 15 · İptaller */
    SELECT TOP (200) N'15 · İptaller' AS Bolum,
           ine.Ad AS IptalNedeniAdi, i.Aciklama, ya.Ad AS YapanTuruAdi, i.YapanAdi, ku.Ad AS KaynakUygulamaAdi,
           CONVERT(datetime2(0), i.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           i.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM talep.Iptal AS i
    LEFT JOIN kod.IptalNedeni AS ine ON ine.Kod = i.IptalNedeniKodu
    LEFT JOIN kod.AktorTuru AS ya ON ya.Kod = i.YapanTuruKodu
    LEFT JOIN kod.KaynakUygulama AS ku ON ku.Kod = i.KaynakUygulamaKodu
    WHERE i.TalepKimlik = @TalepKimlik
    ORDER BY i.OlusmaZamani DESC, i.KayitNo DESC;

    /* 16 · Yeniden açmalar */
    SELECT TOP (200) N'16 · Yeniden açmalar' AS Bolum,
           od.Ad AS OncekiDurumAdi, y.Aciklama, y.MusteriyeBildirilmedi,
           ya.Ad AS YapanTuruAdi, y.YapanAdi, ku.Ad AS KaynakUygulamaAdi,
           CONVERT(datetime2(0), y.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           y.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM talep.YenidenAcma AS y
    LEFT JOIN kod.TalepDurumu AS od ON od.Kod = y.OncekiDurumKodu
    LEFT JOIN kod.AktorTuru AS ya ON ya.Kod = y.YapanTuruKodu
    LEFT JOIN kod.KaynakUygulama AS ku ON ku.Kod = y.KaynakUygulamaKodu
    WHERE y.TalepKimlik = @TalepKimlik
    ORDER BY y.OlusmaZamani DESC, y.KayitNo DESC;

    /* 17 · Sonradan eklemeler */
    SELECT TOP (200) N'17 · Sonradan eklemeler' AS Bolum,
           e.EklemeNotu,
           CAST(CASE WHEN e.SesDosyaKimlik IS NULL THEN 0 ELSE 1 END AS bit) AS SesVar,
           (SELECT COUNT(*) FROM talep.EklemeEki AS ee WHERE ee.EklemeKimlik = e.Kimlik) AS EkSayisi,
           ya.Ad AS YapanTuruAdi, e.YapanAdi,
           CONVERT(datetime2(0), e.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           e.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM talep.Ekleme AS e
    LEFT JOIN kod.AktorTuru AS ya ON ya.Kod = e.YapanTuruKodu
    WHERE e.TalepKimlik = @TalepKimlik
    ORDER BY e.OlusmaZamani DESC, e.KayitNo DESC;

    /* 18 · Dosyalar
       Nereden: talepEki, sesKaydi, eklemeEki, ziyaretFotografi, servisFisi, dekont. */
    WITH bag AS (
        SELECT te.DosyaKimlik, N'talepEki' AS Nereden, CAST(NULL AS tinyint) AS ZiyaretNo
        FROM talep.TalepEki AS te
        WHERE te.TalepKimlik = @TalepKimlik
        UNION ALL
        SELECT t.SesDosyaKimlik, N'sesKaydi', NULL
        FROM talep.Talep AS t
        WHERE t.Kimlik = @TalepKimlik AND t.SesDosyaKimlik IS NOT NULL
        UNION ALL
        SELECT ee.DosyaKimlik, N'eklemeEki', NULL
        FROM talep.EklemeEki AS ee
        JOIN talep.Ekleme AS e ON e.Kimlik = ee.EklemeKimlik
        WHERE e.TalepKimlik = @TalepKimlik
        UNION ALL
        SELECT e.SesDosyaKimlik, N'sesKaydi', NULL
        FROM talep.Ekleme AS e
        WHERE e.TalepKimlik = @TalepKimlik AND e.SesDosyaKimlik IS NOT NULL
        UNION ALL
        SELECT zf.DosyaKimlik, N'ziyaretFotografi', z.ZiyaretNo
        FROM talep.ZiyaretFotografi AS zf
        JOIN talep.ServisZiyareti AS z ON z.Kimlik = zf.ZiyaretKimlik
        WHERE z.TalepKimlik = @TalepKimlik
        UNION ALL
        SELECT k.ServisFisiDosyaKimlik, N'servisFisi', z.ZiyaretNo
        FROM talep.Kapanis AS k
        LEFT JOIN talep.ServisZiyareti AS z ON z.Kimlik = k.ZiyaretKimlik
        WHERE k.TalepKimlik = @TalepKimlik AND k.ServisFisiDosyaKimlik IS NOT NULL
        UNION ALL
        SELECT d.DosyaKimlik, N'dekont', NULL
        FROM talep.Dekont AS d
        WHERE d.TalepKimlik = @TalepKimlik
    )
    SELECT TOP (200) N'18 · Dosyalar' AS Bolum,
           b.Nereden, b.ZiyaretNo, dt.Ad AS DosyaTuruAdi, ds.MimeTuru, ds.BoyutBayt,
           ds.DepolamaSaglayiciKodu, ds.DepolamaYolu, ds.OrijinalAd, ds.DurumKodu, ds.SaklamaSinifiKodu,
           CONVERT(datetime2(0), ds.GecersizZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS GecersizZamaniTurkiye,
           ds.GecersizNedeni,
           CONVERT(datetime2(0), ds.SilinmeIstendiZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS SilinmeIstendiZamaniTurkiye,
           ds.YapanAdi AS YukleyenAdi,
           CONVERT(datetime2(0), ds.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           ds.KayitNo AS DosyaKayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM bag AS b
    JOIN dosya.Dosya AS ds ON ds.Kimlik = b.DosyaKimlik
    LEFT JOIN kod.DosyaTuru AS dt ON dt.Kod = ds.TurKodu
    ORDER BY ds.OlusmaZamani DESC, ds.KayitNo DESC;

    /* 19 · Bayi atamaları, devirler, gizleme
       Tur: bayiAtamasi, devir, gizleme. */
    WITH olay AS (
        SELECT N'bayiAtamasi' AS Tur, b.Ad AS BayiAdi, b.KayitNo AS BayiKayitNo,
               CAST(NULL AS nvarchar(200)) AS ServisAdi, CAST(NULL AS nvarchar(500)) AS Neden,
               CAST(NULL AS bigint) AS HesapKayitNo, a.OlusmaZamani AS Zaman,
               a.KaldirilmaZamani, a.KaldiranAdi, a.YapanAdi, a.KayitNo
        FROM talep.BayiAtamasi AS a
        JOIN bayi.Bayi AS b ON b.Kimlik = a.BayiKimlik
        WHERE a.TalepKimlik = @TalepKimlik
        UNION ALL
        SELECT N'devir', NULL, NULL, s.Ad, dv.Neden, NULL, dv.OlusmaZamani, NULL, NULL, dv.YapanAdi, dv.KayitNo
        FROM talep.Devir AS dv
        JOIN servis.Servis AS s ON s.Kimlik = dv.ServisKimlik
        WHERE dv.TalepKimlik = @TalepKimlik
        UNION ALL
        SELECT N'gizleme', NULL, NULL, NULL, NULL, h.KayitNo, g.GizlemeZamani, NULL, NULL, NULL, NULL
        FROM talep.TalepGizleme AS g
        JOIN musteri.Hesap AS h ON h.Kimlik = g.HesapKimlik
        WHERE g.TalepKimlik = @TalepKimlik
    )
    SELECT TOP (200) N'19 · Bayi atamaları, devirler ve gizleme' AS Bolum,
           o.Tur, o.BayiAdi, o.BayiKayitNo, o.ServisAdi, o.Neden, o.HesapKayitNo,
           CONVERT(datetime2(0), o.Zaman AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           CASE WHEN o.Tur = N'gizleme'
                THEN CONVERT(datetime2(0), o.Zaman AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') END AS GizlemeZamaniTurkiye,
           CONVERT(datetime2(0), o.KaldirilmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS KaldirilmaZamaniTurkiye,
           o.KaldiranAdi, o.YapanAdi, o.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM olay AS o
    ORDER BY o.Zaman DESC;

    /* 20 · Bildirimler ve teslimat */
    SELECT TOP (200) N'20 · Bildirimler ve teslimat' AS Bolum,
           atr.Ad AS AliciTuruAdi, bt.Ad AS BildirimTuruAdi, b.BaslikAnahtari, b.MetinAnahtari, b.SerbestMetin,
           CONVERT(datetime2(0), b.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           CONVERT(datetime2(0), tl.GonderilmeZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS GonderilmeZamaniTurkiye,
           CONVERT(datetime2(0), tl.CihazaUlasmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS CihazaUlasmaZamaniTurkiye,
           CONVERT(datetime2(0), tl.GorulmeZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS GorulmeZamaniTurkiye,
           CONVERT(datetime2(0), tl.OkunmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OkunmaZamaniTurkiye,
           b.KayitNo AS BildirimKayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM bildirim.Bildirim AS b
    LEFT JOIN bildirim.Teslimat AS tl ON tl.BildirimKimlik = b.Kimlik
    LEFT JOIN kod.AliciTuru AS atr ON atr.Kod = b.AliciTuruKodu
    LEFT JOIN kod.BildirimTuru AS bt ON bt.Kod = b.TurKodu
    WHERE b.TalepKimlik = @TalepKimlik
    ORDER BY b.OlusmaZamani DESC, b.KayitNo DESC;

    /* 21 · Belge bağları */
    SELECT TOP (200) N'21 · Belge bağları' AS Bolum,
           dsi.Ad AS DisSistemAdi, bb.FirmaNo, bb.DonemNo, btu.Ad AS BelgeTuruAdi, bb.BelgeNo, bb.BelgeTarihi,
           CONVERT(nvarchar(36), bb.Ettn) AS Ettn, bb.Tutar, bb.KdvHaricTutar, bb.ParaBirimiKodu,
           CONVERT(datetime2(0), bb.IptalZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS IptalZamaniTurkiye,
           CONVERT(datetime2(0), tb.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           bb.KayitNo AS BelgeBagiKayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM talep.TalepBelgesi AS tb
    JOIN entegrasyon.BelgeBagi AS bb ON bb.Kimlik = tb.BelgeBagiKimlik
    LEFT JOIN kod.DisSistem AS dsi ON dsi.Kod = bb.DisSistemKodu
    LEFT JOIN kod.BelgeTuru AS btu ON btu.Kod = bb.BelgeTuruKodu
    WHERE tb.TalepKimlik = @TalepKimlik
    ORDER BY tb.OlusmaZamani DESC;

    /* 22 · İşlem kaydı (talep ve alt kayıtları) */
    SELECT TOP (200) N'22 · İşlem kaydı' AS Bolum, v.*,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM gorunum.IslemGecmisi AS v
    JOIN denetim.IslemKaydi AS i ON i.KayitNo = v.KayitNo
    WHERE i.IlgiliNumara = @TalepNo
       OR i.IlgiliKimlik IN (
            SELECT @TalepKimlik
            UNION ALL SELECT z.Kimlik FROM talep.ServisZiyareti AS z WHERE z.TalepKimlik = @TalepKimlik
            UNION ALL SELECT d.Kimlik FROM talep.Dekont AS d WHERE d.TalepKimlik = @TalepKimlik
            UNION ALL SELECT o.Kimlik FROM talep.OdemeOnayi AS o WHERE o.TalepKimlik = @TalepKimlik
            UNION ALL SELECT h.Kimlik FROM hakedis.HakEdis AS h WHERE h.TalepKimlik = @TalepKimlik
            UNION ALL SELECT k.Kimlik FROM talep.Kapanis AS k WHERE k.TalepKimlik = @TalepKimlik
            UNION ALL SELECT ip.Kimlik FROM talep.Iptal AS ip WHERE ip.TalepKimlik = @TalepKimlik
            UNION ALL SELECT y.Kimlik FROM talep.YenidenAcma AS y WHERE y.TalepKimlik = @TalepKimlik
            UNION ALL SELECT sv.Kimlik FROM talep.ParcaSevki AS sv WHERE sv.TalepKimlik = @TalepKimlik
            UNION ALL SELECT r.Kimlik FROM talep.Randevu AS r WHERE r.TalepKimlik = @TalepKimlik
            UNION ALL SELECT tk.Kimlik FROM talep.Teklif AS tk WHERE tk.TalepKimlik = @TalepKimlik
            UNION ALL SELECT n.Kimlik FROM talep.TalepNotu AS n WHERE n.TalepKimlik = @TalepKimlik
            UNION ALL SELECT e.Kimlik FROM talep.Ekleme AS e WHERE e.TalepKimlik = @TalepKimlik)
    ORDER BY i.IslemZamani DESC, i.KayitNo DESC;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'TalepGoster',
     @Metin = N'Ne yapar: numarası verilen talebin bütün kayıtlarını 22 sonuç kümesiyle, hep aynı sırada gösterir: 1 özet (gorunum.TalepListesi), 2 durum geçmişi, 3 ayrıntı ve belirtiler (talep açıklaması, iletişim, makine durumu, belirtiler, teklif ilgisi, parça ödeme özeti), 4 parça satırları (müşterinin gördüğü fiyat), 5 fatura bilgisi (maskeli), 6 notlar, 7 randevular, 8 teklifler, 9 servis ziyaretleri, 10 ziyaret parçaları ve düzeltmeler (Liste: guncel = geçerli liste, servisinGonderdigi, duzeltme = km/işçilik düzeltmesi, duzeltmeOncesi, duzeltmeSonrasi), 11 hak edişler ve kalemler, 12 dekontlar ve ödeme onayları, 13 sevkler (Guncel = 1 geçerli sevk), 14 kapanışlar, 15 iptaller, 16 yeniden açmalar, 17 sonradan eklemeler, 18 dosyalar (Nereden: talepEki, sesKaydi, eklemeEki, ziyaretFotografi, servisFisi, dekont), 19 bayi atamaları, devirler ve gizleme (Tur: bayiAtamasi, devir, gizleme), 20 bildirimler ve teslimat, 21 belge bağları, 22 işlem kaydı. Numara her yazımla verilir (SRV-26-00123, srv2600123); talebin eski numarası ya da cihaz numarası da kabul edilir. Veri olmayan küme boş döner; çok satırlı kümeler en çok 200 satır gösterir (DahaFazlaVar = 1 ise tam liste ilgili görünümde). Ne yapmaz: hiçbir şeyi değiştirmez; şifreli TC/VKN kolonlarını ve özetleri göstermez. Talep bulunamazsa 51102; numara birden çok talebe uyarsa 51103 (yardim.Ara kullanın). Örnek: EXEC yardim.TalepGoster N''SRV-26-00123'';';
EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'TalepGoster', @Alt = N'@Numara', @AltTuru = N'PARAMETER',
     @Metin = N'Talep numarası (SRV-26-00123, srv2600123), eski sistem numarası ya da cihaz numarası; tire, boşluk ve büyük/küçük harf fark etmez.';
GO

/* --------------------------------------------------------------------------
   2. yardim.HakEdisGoster
   HAK numarasıysa döküm (4 küme); değilse talep numarası (4 küme).
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yardim.HakEdisGoster
    @Numara    nvarchar(400),
    @ZiyaretNo tinyint = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Kod nvarchar(400);
    DECLARE @Ham nvarchar(400) = UPPER(LTRIM(RTRIM(ISNULL(@Numara, N''))) COLLATE Latin1_General_100_BIN2);
    DECLARE @DokumKimlik uniqueidentifier;
    DECLARE @TalepKimlik uniqueidentifier;
    DECLARE @Adet int = 0;

    SELECT @Kod = s.Kod FROM yardim.Sadelestir(@Numara) AS s;

    SELECT @DokumKimlik = d.Kimlik
    FROM hakedis.DonemDokumu AS d
    WHERE d.Numara = @Kod;

    IF @DokumKimlik IS NOT NULL
    BEGIN
        /* 1 · Döküm özeti */
        SELECT N'1 · Döküm özeti' AS Bolum,
               LEFT(d.Numara, 3) + N'-' + SUBSTRING(d.Numara, 4, 2) + N'-' + RIGHT(d.Numara, 5) AS DokumNumarasi,
               s.Ad AS ServisAdi, s.KayitNo AS ServisKayitNo, sr.Ad AS SirketAdi, d.ParaBirimiKodu,
               d.DonemYili, d.DonemAyi, d.DurumKodu, dd.Ad AS DurumAdi,
               d.NetToplam, d.KdvToplam, d.TevkifatToplam, d.StopajToplam, d.MahsupToplam, d.OdenecekTutar,
               CONVERT(datetime2(0), d.KesinlesmeZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS KesinlesmeZamaniTurkiye,
               CONVERT(datetime2(0), d.FaturaGelmeZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS FaturaGelmeZamaniTurkiye,
               CONVERT(datetime2(0), d.OdemeZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OdemeZamaniTurkiye,
               CONVERT(datetime2(0), d.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OlusmaZamaniTurkiye,
               d.YapanAdi, d.KayitNo
        FROM hakedis.DonemDokumu AS d
        JOIN servis.Servis AS s ON s.Kimlik = d.ServisKimlik
        LEFT JOIN sirket.Sirket AS sr ON sr.Kod = d.SirketKodu
        LEFT JOIN kod.DonemDokumuDurumu AS dd ON dd.Kod = d.DurumKodu
        WHERE d.Kimlik = @DokumKimlik;

        /* 2 · Bağlı hak edişler */
        SELECT TOP (200) N'2 · Bağlı hak edişler' AS Bolum, v.*, h.RedNedeni,
               CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
        FROM hakedis.HakEdis AS h
        JOIN gorunum.HakEdisListesi AS v ON v.KayitNo = h.KayitNo
        WHERE h.DonemDokumuKimlik = @DokumKimlik
        ORDER BY h.OlusmaZamani DESC, h.KayitNo DESC;

        /* 3 · Belgeler */
        SELECT TOP (200) N'3 · Belgeler' AS Bolum,
               dsi.Ad AS DisSistemAdi, bb.FirmaNo, bb.DonemNo, btu.Ad AS BelgeTuruAdi, bb.BelgeNo, bb.BelgeTarihi,
               CONVERT(nvarchar(36), bb.Ettn) AS Ettn, bb.Tutar, bb.KdvHaricTutar, bb.ParaBirimiKodu,
               CONVERT(datetime2(0), bb.IptalZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS IptalZamaniTurkiye,
               db.YapanAdi,
               CONVERT(datetime2(0), db.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
               bb.KayitNo AS BelgeBagiKayitNo,
               CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
        FROM hakedis.DonemDokumuBelgesi AS db
        JOIN entegrasyon.BelgeBagi AS bb ON bb.Kimlik = db.BelgeBagiKimlik
        LEFT JOIN kod.DisSistem AS dsi ON dsi.Kod = bb.DisSistemKodu
        LEFT JOIN kod.BelgeTuru AS btu ON btu.Kod = bb.BelgeTuruKodu
        WHERE db.DonemDokumuKimlik = @DokumKimlik
        ORDER BY db.OlusmaZamani DESC;

        /* 4 · Döküme bağlı hareketler */
        SELECT TOP (200) N'4 · Döküme bağlı hareketler' AS Bolum, v.*, x.Aciklama,
               CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
        FROM hakedis.ServisHesapHareketi AS x
        JOIN gorunum.ServisHesapHareketleri AS v ON v.KayitNo = x.KayitNo
        WHERE x.DonemDokumuKimlik = @DokumKimlik
        ORDER BY x.HareketZamani DESC, x.KayitNo DESC;

        RETURN;
    END;

    WITH aday AS (
        SELECT t.Kimlik, 1 AS Oncelik
        FROM talep.Talep AS t
        WHERE t.Numara = @Kod
        UNION ALL
        SELECT t.Kimlik, 2
        FROM talep.Talep AS t
        WHERE t.EskiNumara IS NOT NULL
          AND (UPPER(t.EskiNumara COLLATE Latin1_General_100_BIN2) = @Ham
               OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(t.EskiNumara COLLATE Latin1_General_100_BIN2),
                          N'-', N''), N' ', N''), N'.', N''), N'/', N''), N'_', N'') = @Kod)
        UNION ALL
        SELECT t.Kimlik, 3
        FROM talep.Talep AS t
        WHERE t.CihazNumarasi IS NOT NULL
          AND (UPPER(t.CihazNumarasi COLLATE Latin1_General_100_BIN2) = @Ham
               OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(t.CihazNumarasi COLLATE Latin1_General_100_BIN2),
                          N'-', N''), N' ', N''), N'.', N''), N'/', N''), N'_', N'') = @Kod)
    ), sirali AS (
        SELECT a.Kimlik, a.Oncelik, MIN(a.Oncelik) OVER () AS EnIyi
        FROM aday AS a
    )
    SELECT TOP (1) @TalepKimlik = s.Kimlik, @Adet = COUNT(*) OVER ()
    FROM sirali AS s
    WHERE s.Oncelik = s.EnIyi;

    IF @TalepKimlik IS NULL
        THROW 51102, N'bu numarayla dönem dökümü ya da talep bulunamadı; EXEC yardim.Ara ile arayın', 1;
    IF @Adet > 1
        THROW 51103, N'bu numara birden çok talebe uyuyor; EXEC yardim.Ara ile arayıp tam numarayı verin', 1;

    /* 1 · Talebin hak edişleri (RedNedeni dahil) */
    SELECT TOP (200) N'1 · Talebin hak edişleri' AS Bolum, v.*, h.RedNedeni,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM hakedis.HakEdis AS h
    JOIN talep.ServisZiyareti AS z ON z.Kimlik = h.ZiyaretKimlik
    JOIN gorunum.HakEdisListesi AS v ON v.KayitNo = h.KayitNo
    WHERE h.TalepKimlik = @TalepKimlik
      AND (@ZiyaretNo IS NULL OR z.ZiyaretNo = @ZiyaretNo)
    ORDER BY z.ZiyaretNo DESC;

    /* 2 · Kalemler */
    SELECT TOP (200) N'2 · Kalemler' AS Bolum,
           z.ZiyaretNo, kt.Ad AS KalemTuruAdi, k.Miktar, bi.Ad AS BirimAdi, k.BirimTutar, k.Tutar,
           tr.BirimTutar AS TarifeBirimTutari, tr.GecerlilikBaslangicTarihi AS TarifeBaslangicTarihi,
           h.ParaBirimiKodu, h.KayitNo AS HakEdisKayitNo, k.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM hakedis.HakEdisKalemi AS k
    JOIN hakedis.HakEdis AS h ON h.Kimlik = k.HakEdisKimlik
    JOIN talep.ServisZiyareti AS z ON z.Kimlik = h.ZiyaretKimlik
    LEFT JOIN kod.HakEdisKalemTuru AS kt ON kt.Kod = k.KalemTuruKodu
    LEFT JOIN kod.Birim AS bi ON bi.Kod = k.BirimKodu
    LEFT JOIN hakedis.Tarife AS tr ON tr.Kimlik = k.TarifeKimlik
    WHERE h.TalepKimlik = @TalepKimlik
      AND (@ZiyaretNo IS NULL OR z.ZiyaretNo = @ZiyaretNo)
    ORDER BY z.ZiyaretNo DESC, kt.Sira, k.KalemTuruKodu;

    /* 3 · Ziyaret düzeltmeleri ve güncel parça listesi (Liste kodları TalepGoster 10. kümedeki gibi) */
    WITH satir AS (
        SELECT z.ZiyaretNo, 1 AS ListeSira, N'guncel' AS Liste,
               CAST(NULL AS bigint) AS DuzeltmeKayitNo, CAST(NULL AS nvarchar(500)) AS DuzeltmeNedeni,
               g.SiraNo, g.ParcaKodu, g.ParcaAdi, g.Adet, g.BirimFiyat,
               CAST(NULL AS decimal(9,1)) AS OncekiKm, CAST(NULL AS decimal(9,1)) AS YeniKm,
               CAST(NULL AS decimal(18,2)) AS OncekiIscilikTutari, CAST(NULL AS decimal(18,2)) AS YeniIscilikTutari,
               CAST(NULL AS nvarchar(150)) AS DuzeltenAdi, CAST(NULL AS datetime2(3)) AS Zaman
        FROM talep.ServisZiyareti AS z
        JOIN talep.ZiyaretGuncelParcasi AS g ON g.ZiyaretKimlik = z.Kimlik
        WHERE z.TalepKimlik = @TalepKimlik AND (@ZiyaretNo IS NULL OR z.ZiyaretNo = @ZiyaretNo)
        UNION ALL
        SELECT z.ZiyaretNo, 2, N'servisinGonderdigi', NULL, NULL,
               zp.SiraNo, zp.ParcaKodu, zp.ParcaAdi, zp.Adet, zp.BirimFiyat,
               NULL, NULL, NULL, NULL, z.YapanAdi, z.OlusmaZamani
        FROM talep.ServisZiyareti AS z
        JOIN talep.ZiyaretParcaSatiri AS zp ON zp.ZiyaretKimlik = z.Kimlik
        WHERE z.TalepKimlik = @TalepKimlik AND (@ZiyaretNo IS NULL OR z.ZiyaretNo = @ZiyaretNo)
        UNION ALL
        SELECT z.ZiyaretNo, 3, N'duzeltme', zd.KayitNo, zd.Neden,
               NULL, NULL, NULL, NULL, NULL,
               zd.OncekiKm, zd.YeniKm, zd.OncekiIscilikTutari, zd.YeniIscilikTutari, zd.YapanAdi, zd.OlusmaZamani
        FROM talep.ServisZiyareti AS z
        JOIN talep.ZiyaretDuzeltmesi AS zd ON zd.ZiyaretKimlik = z.Kimlik
        WHERE z.TalepKimlik = @TalepKimlik AND (@ZiyaretNo IS NULL OR z.ZiyaretNo = @ZiyaretNo)
        UNION ALL
        SELECT z.ZiyaretNo, CASE WHEN dp.TarafKodu = N'onceki' THEN 4 ELSE 5 END,
               CASE WHEN dp.TarafKodu = N'onceki' THEN N'duzeltmeOncesi' ELSE N'duzeltmeSonrasi' END,
               zd.KayitNo, zd.Neden,
               dp.SiraNo, dp.ParcaKodu, dp.ParcaAdi, dp.Adet, dp.BirimFiyat,
               NULL, NULL, NULL, NULL, zd.YapanAdi, zd.OlusmaZamani
        FROM talep.ServisZiyareti AS z
        JOIN talep.ZiyaretDuzeltmesi AS zd ON zd.ZiyaretKimlik = z.Kimlik
        JOIN talep.ZiyaretDuzeltmesiParcasi AS dp ON dp.DuzeltmeKimlik = zd.Kimlik
        WHERE z.TalepKimlik = @TalepKimlik AND (@ZiyaretNo IS NULL OR z.ZiyaretNo = @ZiyaretNo)
    )
    SELECT TOP (200) N'3 · Ziyaret düzeltmeleri ve güncel parça listesi' AS Bolum,
           s.ZiyaretNo, s.Liste, s.DuzeltmeKayitNo, s.DuzeltmeNedeni,
           s.SiraNo, s.ParcaKodu, s.ParcaAdi, s.Adet, s.BirimFiyat,
           s.OncekiKm, s.YeniKm, s.OncekiIscilikTutari, s.YeniIscilikTutari,
           s.DuzeltenAdi,
           CONVERT(datetime2(0), s.Zaman AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM satir AS s
    ORDER BY s.ZiyaretNo DESC, s.ListeSira, s.DuzeltmeKayitNo DESC, s.SiraNo;

    /* 4 · İlgili hesap hareketleri (hak edişin alacağı ve ona bağlı ters hareketler) */
    WITH hakedisler AS (
        SELECT h.Kimlik
        FROM hakedis.HakEdis AS h
        JOIN talep.ServisZiyareti AS z ON z.Kimlik = h.ZiyaretKimlik
        WHERE h.TalepKimlik = @TalepKimlik
          AND (@ZiyaretNo IS NULL OR z.ZiyaretNo = @ZiyaretNo)
    )
    SELECT TOP (200) N'4 · İlgili hesap hareketleri' AS Bolum, v.*, x.Aciklama,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM hakedis.ServisHesapHareketi AS x
    JOIN gorunum.ServisHesapHareketleri AS v ON v.KayitNo = x.KayitNo
    WHERE x.HakEdisKimlik IN (SELECT hk.Kimlik FROM hakedisler AS hk)
       OR x.DuzeltilenHareketKimlik IN (SELECT a.Kimlik
                                        FROM hakedis.ServisHesapHareketi AS a
                                        WHERE a.HakEdisKimlik IN (SELECT hk.Kimlik FROM hakedisler AS hk))
    ORDER BY x.HareketZamani DESC, x.KayitNo DESC;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'HakEdisGoster',
     @Metin = N'Ne yapar: HAK numarası verilirse dönem dökümünü dört kümeyle gösterir: 1 döküm özeti (servis, şirket, para birimi, dönem, durum, net, KDV, tevkifat, stopaj, mahsup, ödenecek tutar, zamanlar), 2 döküme bağlı hak edişler (gorunum.HakEdisListesi + ret nedeni), 3 döküm belgeleri (fatura, gider pusulası, banka fişi), 4 döküme bağlı hesap hareketleri (açıklama dahil). Talep numarası verilirse dört küme: 1 talebin hak edişleri (@ZiyaretNo verilirse yalnız o ziyaretinki; ret nedeni dahil), 2 kalemler (tarife birim tutarıyla), 3 ziyaret düzeltmeleri ve güncel parça listesi (Liste: guncel, servisinGonderdigi, duzeltme, duzeltmeOncesi, duzeltmeSonrasi), 4 hak edişin alacak hareketi ve ona bağlı ters hareketler. Numara her yazımla verilir. Ne yapmaz: hiçbir şeyi değiştirmez; onayı geri almak için yonetim.HakEdisOnayiniGeriAl kullanılır. Bulunamazsa 51102, numara birden çok talebe uyarsa 51103. Örnek: EXEC yardim.HakEdisGoster N''HAK-26-00045''; EXEC yardim.HakEdisGoster N''SRV-26-00123'', 1;';
EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'HakEdisGoster', @Alt = N'@Numara', @AltTuru = N'PARAMETER',
     @Metin = N'Dönem dökümü numarası (HAK-26-00045) ya da talep numarası (SRV-26-00123; eski ya da cihaz numarası da olur); her yazım kabul edilir.';
EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'HakEdisGoster', @Alt = N'@ZiyaretNo', @AltTuru = N'PARAMETER',
     @Metin = N'Yalnız talep numarasıyla: gösterilecek ziyaretin sıra numarası (1, 2 …). Boşsa talebin bütün hak edişleri. HAK numarasında kullanılmaz.';
GO

/* --------------------------------------------------------------------------
   3. yardim.MakineGoster
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yardim.MakineGoster
    @SeriNo    nvarchar(400),
    @MarkaKodu nvarchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Kod nvarchar(400);
    DECLARE @Marka nvarchar(20) = NULLIF(LOWER(LTRIM(RTRIM(ISNULL(@MarkaKodu, N''))) COLLATE Latin1_General_100_BIN2), N'');
    DECLARE @Makineler nvarchar(max);

    SELECT @Kod = s.Kod FROM yardim.Sadelestir(@SeriNo) AS s;

    SET @Makineler = (SELECT m.Kimlik
                      FROM makine.Makine AS m
                      WHERE m.SeriNo = @Kod
                        AND (@Marka IS NULL OR m.MarkaKodu = @Marka)
                      FOR JSON PATH);

    IF @Makineler IS NULL
        THROW 51102, N'bu seri numarasıyla makine bulunamadı; seri numarasının ilk karakterlerini kullanarak EXEC yardim.Ara ile arayın', 1;

    /* 1 · Makine kartı */
    SELECT TOP (200) N'1 · Makine kartı' AS Bolum, v.*,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM gorunum.MakineKarti AS v
    JOIN makine.Makine AS m ON m.KayitNo = v.MakineKayitNo
    WHERE m.Kimlik IN (SELECT j.Kimlik FROM OPENJSON(@Makineler) WITH (Kimlik uniqueidentifier) AS j)
    ORDER BY m.OlusmaZamani DESC;

    /* 2 · Sahiplik geçmişi */
    SELECT TOP (200) N'2 · Sahiplik geçmişi' AS Bolum,
           m.MarkaKodu, m.SeriNo, hs.AdSoyad AS SahibiAdi, h.TelefonE164 AS SahibiTelefonu, h.KayitNo AS SahibiHesapKayitNo,
           s.TakmaAd,
           CONVERT(datetime2(0), s.BaslangicZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BaslangicZamaniTurkiye,
           CONVERT(datetime2(0), s.BitisZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BitisZamaniTurkiye,
           bn.Ad AS BitisNedeniAdi, kk.Ad AS KaynakAdi, s.YapanAdi, s.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM makine.MakineSahipligi AS s
    JOIN makine.Makine AS m ON m.Kimlik = s.MakineKimlik
    JOIN musteri.Hesap AS h ON h.Kimlik = s.HesapKimlik
    OUTER APPLY (SELECT TOP (1) NULLIF(LTRIM(RTRIM(CONCAT(k.Adi, N' ', k.Soyadi))), N'') AS AdSoyad
                 FROM musteri.HesapKisisi AS k
                 WHERE k.HesapKimlik = h.Kimlik AND k.RolKodu = N'hesapSahibi'
                 ORDER BY CASE WHEN k.PasifZamani IS NULL THEN 0 ELSE 1 END, k.OlusmaZamani DESC) AS hs
    LEFT JOIN kod.SahiplikBitisNedeni AS bn ON bn.Kod = s.BitisNedeniKodu
    LEFT JOIN kod.KayitKaynagi AS kk ON kk.Kod = s.KaynakKodu
    WHERE s.MakineKimlik IN (SELECT j.Kimlik FROM OPENJSON(@Makineler) WITH (Kimlik uniqueidentifier) AS j)
    ORDER BY s.BaslangicZamani DESC, s.KayitNo DESC;

    /* 3 · Servis atama geçmişi */
    SELECT TOP (200) N'3 · Servis atama geçmişi' AS Bolum,
           m.MarkaKodu, m.SeriNo, sv.Ad AS ServisAdi, sv.KayitNo AS ServisKayitNo,
           CONVERT(datetime2(0), a.BaslangicZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BaslangicZamaniTurkiye,
           CONVERT(datetime2(0), a.BitisZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BitisZamaniTurkiye,
           kk.Ad AS KaynakAdi, a.AtamaNotu, a.YapanAdi, a.BitirenAdi, a.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM makine.MakineServisAtamasi AS a
    JOIN makine.Makine AS m ON m.Kimlik = a.MakineKimlik
    JOIN servis.Servis AS sv ON sv.Kimlik = a.ServisKimlik
    LEFT JOIN kod.KayitKaynagi AS kk ON kk.Kod = a.KaynakKodu
    WHERE a.MakineKimlik IN (SELECT j.Kimlik FROM OPENJSON(@Makineler) WITH (Kimlik uniqueidentifier) AS j)
    ORDER BY a.BaslangicZamani DESC, a.KayitNo DESC;

    /* 4 · Satışlar */
    SELECT TOP (200) N'4 · Satışlar' AS Bolum,
           m.MarkaKodu, m.SeriNo, st.Ad AS SatisTuruAdi, sb.Ad AS SaticiBayiAdi, ab.Ad AS AliciBayiAdi,
           ah.KayitNo AS AliciHesapKayitNo, ms.FaturaTarihi, ms.TeslimTarihi, ms.GarantiYil,
           ge.Ad AS GarantiBaslangicEsasiAdi, ms.GarantiFaturaEkGun,
           kd.Ad AS DogrulamaDurumuAdi, ms.DogrulayanAdi,
           CONVERT(datetime2(0), ms.IptalZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS IptalZamaniTurkiye,
           bb.BelgeNo, kk.Ad AS KaynakAdi, ms.YapanAdi,
           CONVERT(datetime2(0), ms.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           ms.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM makine.MakineSatisi AS ms
    JOIN makine.Makine AS m ON m.Kimlik = ms.MakineKimlik
    LEFT JOIN kod.SatisTuru AS st ON st.Kod = ms.SatisTuruKodu
    LEFT JOIN bayi.Bayi AS sb ON sb.Kimlik = ms.SaticiBayiKimlik
    LEFT JOIN bayi.Bayi AS ab ON ab.Kimlik = ms.AliciBayiKimlik
    LEFT JOIN musteri.Hesap AS ah ON ah.Kimlik = ms.AliciHesapKimlik
    LEFT JOIN kod.GarantiBaslangicEsasi AS ge ON ge.Kod = ms.GarantiBaslangicEsasiKodu
    LEFT JOIN kod.KararDurumu AS kd ON kd.Kod = ms.DogrulamaDurumuKodu
    LEFT JOIN entegrasyon.BelgeBagi AS bb ON bb.Kimlik = ms.BelgeBagiKimlik
    LEFT JOIN kod.KayitKaynagi AS kk ON kk.Kod = ms.KaynakKodu
    WHERE ms.MakineKimlik IN (SELECT j.Kimlik FROM OPENJSON(@Makineler) WITH (Kimlik uniqueidentifier) AS j)
    ORDER BY ms.OlusmaZamani DESC, ms.KayitNo DESC;

    /* 5 · Kayıt olayları */
    SELECT TOP (200) N'5 · Kayıt olayları' AS Bolum,
           m.MarkaKodu, m.SeriNo, kk.Ad AS KaynakAdi, sv.Ad AS ServisAdi, ko.BeyanAdi, h.KayitNo AS HesapKayitNo,
           ko.LogoBildi, ko.YeniSatis, il.Ad AS KonumIlAdi, ilc.Ad AS KonumIlceAdi, ko.YapanAdi,
           CONVERT(datetime2(0), ko.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           ko.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM makine.KayitOlayi AS ko
    JOIN makine.Makine AS m ON m.Kimlik = ko.MakineKimlik
    LEFT JOIN kod.KayitKaynagi AS kk ON kk.Kod = ko.KaynakKodu
    LEFT JOIN servis.Servis AS sv ON sv.Kimlik = ko.ServisKimlik
    LEFT JOIN musteri.Hesap AS h ON h.Kimlik = ko.HesapKimlik
    LEFT JOIN cografya.Il AS il ON il.IlKodu = ko.KonumIlKodu
    LEFT JOIN cografya.Ilce AS ilc ON ilc.IlceKodu = ko.KonumIlceKodu
    WHERE ko.MakineKimlik IN (SELECT j.Kimlik FROM OPENJSON(@Makineler) WITH (Kimlik uniqueidentifier) AS j)
    ORDER BY ko.OlusmaZamani DESC, ko.KayitNo DESC;

    /* 6 · Talepler */
    SELECT TOP (200) N'6 · Talepler' AS Bolum, v.*,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM gorunum.TalepListesi AS v
    JOIN talep.Talep AS t ON t.KayitNo = v.KayitNo
    WHERE t.MakineKimlik IN (SELECT j.Kimlik FROM OPENJSON(@Makineler) WITH (Kimlik uniqueidentifier) AS j)
    ORDER BY t.OlusmaZamani DESC, t.KayitNo DESC;

    /* 7 · Bakım tamamlama */
    SELECT TOP (200) N'7 · Tamamlanan bakımlar' AS Bolum,
           m.MarkaKodu, m.SeriNo, bt.BakimSablonuKodu, bt.Saat, ba.Baslik AS AdimBasligi, h.KayitNo AS HesapKayitNo,
           CONVERT(datetime2(0), bt.IsaretlemeZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS IsaretlemeZamaniTurkiye,
           CONVERT(datetime2(0), bt.KaldirmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS KaldirmaZamaniTurkiye,
           bt.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM makine.BakimTamamlama AS bt
    JOIN makine.Makine AS m ON m.Kimlik = bt.MakineKimlik
    LEFT JOIN katalog.BakimAdimi AS ba ON ba.SablonKodu = bt.BakimSablonuKodu AND ba.Saat = bt.Saat
    LEFT JOIN musteri.Hesap AS h ON h.Kimlik = bt.HesapKimlik
    WHERE bt.MakineKimlik IN (SELECT j.Kimlik FROM OPENJSON(@Makineler) WITH (Kimlik uniqueidentifier) AS j)
    ORDER BY bt.IsaretlemeZamani DESC, bt.KayitNo DESC;

    /* 8 · LOGO seri sorguları */
    SELECT TOP (200) N'8 · LOGO seri sorguları' AS Bolum,
           q.MarkaKodu, q.SeriNo,
           CONVERT(datetime2(0), q.SorguZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS SorguZamaniTurkiye,
           q.SonucKodu, q.LogoFirmaNo, q.MalzemeKodu, q.CariKodu, q.FaturaTarihi,
           CONVERT(datetime2(0), q.GecerlilikBitisZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS GecerlilikBitisZamaniTurkiye,
           bb.BelgeNo, q.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM entegrasyon.LogoSeriSorgusu AS q
    LEFT JOIN entegrasyon.BelgeBagi AS bb ON bb.Kimlik = q.BelgeBagiKimlik
    WHERE q.SeriNo = @Kod
      AND q.MarkaKodu IN (SELECT m.MarkaKodu
                          FROM makine.Makine AS m
                          WHERE m.Kimlik IN (SELECT j.Kimlik FROM OPENJSON(@Makineler) WITH (Kimlik uniqueidentifier) AS j))
    ORDER BY q.SorguZamani DESC, q.KayitNo DESC;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'MakineGoster',
     @Metin = N'Ne yapar: seri numarasıyla makineyi bulur ve sekiz kümeyle gösterir: 1 makine kartı (gorunum.MakineKarti: sahibi, bayisi, servisi, garantisi), 2 sahiplik geçmişi, 3 servis atama geçmişi, 4 satışlar (garanti süresi, doğrulama, belge), 5 kayıt olayları (kim, hangi kaynaktan, beyan edilen ad), 6 talepler (gorunum.TalepListesi), 7 bakım tamamlama işaretleri, 8 LOGO seri sorguları. Seri numarası her yazımla verilir (ork1270-2024-00157). @MarkaKodu boşsa bütün markalarda arar; aynı seri iki markada varsa kümeler ikisini de içerir (MarkaKodu kolonuna bakın). Ne yapmaz: seri numarasının yalnız başıyla aramaz (yardim.Ara bunu yapar); hiçbir şeyi değiştirmez. Bulunamazsa 51102. Örnek: EXEC yardim.MakineGoster N''ork1270-2024-00157''; EXEC yardim.MakineGoster N''ORK1270202400157'', N''paksan'';';
EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'MakineGoster', @Alt = N'@SeriNo', @AltTuru = N'PARAMETER',
     @Metin = N'Makinenin seri numarası; tire, boşluk, büyük/küçük harf ve Türkçe harf fark etmez.';
EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'MakineGoster', @Alt = N'@MarkaKodu', @AltTuru = N'PARAMETER',
     @Metin = N'İsteğe bağlı marka kodu (paksan, globale …). Boşsa bütün markalarda aranır.';
GO

/* --------------------------------------------------------------------------
   4. yardim.MusteriGoster
   Telefonla: güncel telefon, eski telefon (telefon geçmişi), hesaptaki
   kişinin telefonu; birleşme zinciri iki yönde izlenir. Hesapsız talepler,
   bu telefonu içeren numara değişikliği talepleri ve hesapsız geri
   bildirimler de alınır. Adla: kişi adı ve hesapsız talepteki ad.
   BulunduguYer kodları: guncelTelefon, eskiTelefon, kisiTelefonu, kisiAdi,
   birlesmeZinciri.
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yardim.MusteriGoster
    @Metin nvarchar(400)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Telefon nvarchar(16);
    DECLARE @TelefonUlusal nvarchar(20);
    DECLARE @Arama nvarchar(400);
    DECLARE @Desen nvarchar(900);
    DECLARE @Hesaplar nvarchar(max);
    DECLARE @HesapSayisi int = 0;
    DECLARE @HesapsizVar bit = 0;

    SELECT @Telefon = s.TelefonE164, @TelefonUlusal = s.TelefonUlusal, @Arama = s.Arama
    FROM yardim.Sadelestir(@Metin) AS s;

    IF @Telefon IS NULL
    BEGIN
        IF LEN(ISNULL(@Arama, N'')) < 3
            THROW 51105, N'telefon numarası ya da en az 3 harflik ad yazın', 1;
        SET @Desen = N'%' + REPLACE(REPLACE(REPLACE(@Arama, N'[', N'[[]'), N'%', N'[%]'), N'_', N'[_]') + N'%';
    END;

    WITH bulunan AS (
        SELECT h.Kimlik, N'guncelTelefon' AS Yer
        FROM musteri.Hesap AS h
        WHERE @Telefon IS NOT NULL AND h.TelefonE164 = @Telefon
        UNION ALL
        SELECT g.HesapKimlik, N'eskiTelefon'
        FROM musteri.HesapTelefonGecmisi AS g
        WHERE @Telefon IS NOT NULL AND g.TelefonE164 = @Telefon AND g.BitisZamani IS NOT NULL
        UNION ALL
        SELECT k.HesapKimlik, N'kisiTelefonu'
        FROM musteri.HesapKisisi AS k
        WHERE @Telefon IS NOT NULL AND k.TelefonE164 = @Telefon
        UNION ALL
        SELECT k.HesapKimlik, N'kisiAdi'
        FROM musteri.HesapKisisi AS k
        WHERE @Telefon IS NULL AND k.AdSoyadArama LIKE @Desen
    ), yukari AS (
        SELECT h.Kimlik, h.BirlestigiHesapKimlik, 0 AS Derinlik
        FROM musteri.Hesap AS h
        WHERE h.Kimlik IN (SELECT b.Kimlik FROM bulunan AS b)
        UNION ALL
        SELECT h.Kimlik, h.BirlestigiHesapKimlik, y.Derinlik + 1
        FROM yukari AS y
        JOIN musteri.Hesap AS h ON h.Kimlik = y.BirlestigiHesapKimlik
        WHERE y.Derinlik < 50
    ), asagi AS (
        SELECT y.Kimlik, 0 AS Derinlik
        FROM yukari AS y
        WHERE y.BirlestigiHesapKimlik IS NULL
        UNION ALL
        SELECT h.Kimlik, a.Derinlik + 1
        FROM asagi AS a
        JOIN musteri.Hesap AS h ON h.BirlestigiHesapKimlik = a.Kimlik
        WHERE a.Derinlik < 50
    ), tum AS (
        SELECT b.Kimlik, b.Yer FROM bulunan AS b
        UNION
        SELECT y.Kimlik, N'birlesmeZinciri' FROM yukari AS y
        UNION
        SELECT a.Kimlik, N'birlesmeZinciri' FROM asagi AS a
    ), yer AS (
        SELECT t.Kimlik, t.Yer
        FROM tum AS t
        WHERE t.Yer <> N'birlesmeZinciri'
           OR NOT EXISTS (SELECT 1 FROM bulunan AS b WHERE b.Kimlik = t.Kimlik)
    )
    SELECT @Hesaplar = (
        SELECT h.Kimlik, h.KayitNo,
               STRING_AGG(y.Yer, N', ') WITHIN GROUP (ORDER BY y.Yer) AS BulunduguYer
        FROM yer AS y
        JOIN musteri.Hesap AS h ON h.Kimlik = y.Kimlik
        GROUP BY h.Kimlik, h.KayitNo
        FOR JSON PATH);

    SELECT @HesapSayisi = COUNT(*) FROM OPENJSON(@Hesaplar) AS j;

    IF EXISTS (SELECT 1
               FROM talep.Talep AS t
               WHERE t.HesapKimlik IS NULL
                 AND ((@Telefon IS NOT NULL AND t.IletisimTelefonE164 = @Telefon)
                      OR (@Telefon IS NULL AND t.IletisimAdArama LIKE @Desen)))
       OR (@Telefon IS NOT NULL
           AND EXISTS (SELECT 1
                       FROM musteri.TelefonDegisikligiTalebi AS d
                       WHERE d.EskiTelefonE164 = @Telefon OR d.YeniTelefonE164 = @Telefon))
       OR (@Telefon IS NOT NULL
           AND EXISTS (SELECT 1
                       FROM musteri.GeriBildirim AS g
                       WHERE g.HesapKimlik IS NULL AND g.IletisimTelefonE164 = @Telefon))
        SET @HesapsizVar = 1;

    IF @HesapSayisi = 0 AND @HesapsizVar = 0
        THROW 51102, N'bu telefonla ya da adla müşteri kaydı bulunamadı; EXEC yardim.Ara ile arayın', 1;

    /* 1 · Müşteri kartı */
    SELECT TOP (200) N'1 · Müşteri kartı' AS Bolum, v.*, j.BulunduguYer,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM OPENJSON(@Hesaplar) WITH (KayitNo bigint, BulunduguYer nvarchar(400)) AS j
    JOIN gorunum.MusteriKarti AS v ON v.HesapKayitNo = j.KayitNo
    ORDER BY v.OlusmaZamaniTurkiye DESC, v.HesapKayitNo DESC;

    /* 20'den çok hesap: yalnız ilk küme (aramayı daraltın). */
    IF @HesapSayisi > 20
        RETURN;

    /* 2 · Kişiler */
    SELECT TOP (200) N'2 · Kişiler' AS Bolum,
           h.KayitNo AS HesapKayitNo, kr.Ad AS RolAdi, k.Adi, k.Soyadi, k.TelefonE164 AS Telefon,
           CONVERT(datetime2(0), k.PasifZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS PasifZamaniTurkiye,
           CONVERT(datetime2(0), k.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OlusmaZamaniTurkiye,
           k.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM musteri.HesapKisisi AS k
    JOIN musteri.Hesap AS h ON h.Kimlik = k.HesapKimlik
    LEFT JOIN kod.KisiRolu AS kr ON kr.Kod = k.RolKodu
    WHERE k.HesapKimlik IN (SELECT j.Kimlik FROM OPENJSON(@Hesaplar) WITH (Kimlik uniqueidentifier) AS j)
    ORDER BY h.KayitNo, CASE WHEN k.RolKodu = N'hesapSahibi' THEN 0 ELSE 1 END, k.OlusmaZamani;

    /* 3 · Telefon geçmişi */
    SELECT TOP (200) N'3 · Telefon geçmişi' AS Bolum,
           h.KayitNo AS HesapKayitNo, g.TelefonE164 AS Telefon,
           CONVERT(datetime2(0), g.BaslangicZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BaslangicZamaniTurkiye,
           CONVERT(datetime2(0), g.BitisZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BitisZamaniTurkiye,
           LEFT(d.Numara, 3) + N'-' + SUBSTRING(d.Numara, 4, 2) + N'-' + RIGHT(d.Numara, 5) AS TelNumarasi,
           g.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM musteri.HesapTelefonGecmisi AS g
    JOIN musteri.Hesap AS h ON h.Kimlik = g.HesapKimlik
    LEFT JOIN musteri.TelefonDegisikligiTalebi AS d ON d.Kimlik = g.TelefonDegisikligiTalebiKimlik
    WHERE g.HesapKimlik IN (SELECT j.Kimlik FROM OPENJSON(@Hesaplar) WITH (Kimlik uniqueidentifier) AS j)
    ORDER BY g.BaslangicZamani DESC, g.KayitNo DESC;

    /* 4 · Makineler (güncel ve geçmiş sahiplik; servis ve garanti bugünkü haliyle) */
    SELECT TOP (200) N'4 · Makineler' AS Bolum,
           h.KayitNo AS HesapKayitNo, mr.Ad AS MarkaAdi, m.SeriNo, ur.Ad AS UrunAdi, s.TakmaAd,
           CAST(CASE WHEN s.BitisZamani IS NULL THEN 1 ELSE 0 END AS bit) AS GuncelSahiplik,
           CONVERT(datetime2(0), s.BaslangicZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BaslangicZamaniTurkiye,
           CONVERT(datetime2(0), s.BitisZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BitisZamaniTurkiye,
           bn.Ad AS BitisNedeniAdi,
           mk.ServisAdi, mk.ServisKaynagiAdi, mk.GarantiDayanagiAdi, mk.GarantiBitisTarihi, mk.Garantide,
           m.KayitNo AS MakineKayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM makine.MakineSahipligi AS s
    JOIN makine.Makine AS m ON m.Kimlik = s.MakineKimlik
    JOIN musteri.Hesap AS h ON h.Kimlik = s.HesapKimlik
    LEFT JOIN katalog.Marka AS mr ON mr.Kod = m.MarkaKodu
    LEFT JOIN katalog.Urun AS ur ON ur.MarkaKodu = m.MarkaKodu AND ur.Kod = m.UrunKodu
    LEFT JOIN kod.SahiplikBitisNedeni AS bn ON bn.Kod = s.BitisNedeniKodu
    LEFT JOIN gorunum.MakineKarti AS mk ON mk.MakineKayitNo = m.KayitNo
    WHERE s.HesapKimlik IN (SELECT j.Kimlik FROM OPENJSON(@Hesaplar) WITH (Kimlik uniqueidentifier) AS j)
    ORDER BY CASE WHEN s.BitisZamani IS NULL THEN 0 ELSE 1 END, s.BaslangicZamani DESC;

    /* 5 · Talepler (hesaplı ve hesapsız) */
    SELECT TOP (200) N'5 · Talepler' AS Bolum, v.*,
           CAST(CASE WHEN t.HesapKimlik IS NULL THEN 1 ELSE 0 END AS bit) AS HesapsizEslesme,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM talep.Talep AS t
    JOIN gorunum.TalepListesi AS v ON v.KayitNo = t.KayitNo
    WHERE t.HesapKimlik IN (SELECT j.Kimlik FROM OPENJSON(@Hesaplar) WITH (Kimlik uniqueidentifier) AS j)
       OR (t.HesapKimlik IS NULL
           AND ((@Telefon IS NOT NULL AND t.IletisimTelefonE164 = @Telefon)
                OR (@Telefon IS NULL AND t.IletisimAdArama LIKE @Desen)))
    ORDER BY t.OlusmaZamani DESC, t.KayitNo DESC;

    /* 6 · Numara değişikliği talepleri */
    SELECT TOP (200) N'6 · Numara değişikliği talepleri' AS Bolum,
           LEFT(d.Numara, 3) + N'-' + SUBSTRING(d.Numara, 4, 2) + N'-' + RIGHT(d.Numara, 5) AS TelNumarasi,
           kd.Ad AS KararDurumuAdi, d.EskiTelefonE164 AS EskiTelefon, d.YeniTelefonE164 AS YeniTelefon,
           d.BeyanAdi, d.KanitSeriNo, d.KanitMarkaKodu, d.SeriEslesti, d.EskiTelefonEslesti, d.YeniTelefonBaskaHesapta,
           h.KayitNo AS HesapKayitNo, d.KararVerenAdi, d.KararNotu,
           CONVERT(datetime2(0), d.KararZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS KararZamaniTurkiye,
           CONVERT(datetime2(0), d.UygulanmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS UygulanmaZamaniTurkiye,
           CONVERT(datetime2(0), d.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           d.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM musteri.TelefonDegisikligiTalebi AS d
    LEFT JOIN musteri.Hesap AS h ON h.Kimlik = d.HesapKimlik
    LEFT JOIN kod.KararDurumu AS kd ON kd.Kod = d.KararDurumuKodu
    WHERE d.HesapKimlik IN (SELECT j.Kimlik FROM OPENJSON(@Hesaplar) WITH (Kimlik uniqueidentifier) AS j)
       OR (@Telefon IS NOT NULL AND (d.EskiTelefonE164 = @Telefon OR d.YeniTelefonE164 = @Telefon))
    ORDER BY d.OlusmaZamani DESC, d.KayitNo DESC;

    /* 7 · Geri bildirimler */
    SELECT TOP (200) N'7 · Geri bildirimler' AS Bolum,
           LEFT(g.Numara, 3) + N'-' + SUBSTRING(g.Numara, 4, 2) + N'-' + RIGHT(g.Numara, 5) AS GbdNumarasi,
           g.Metin,
           CAST(CASE WHEN g.OkunmaZamani IS NULL THEN 0 ELSE 1 END AS bit) AS OkunduMu,
           g.OkuyanAdi,
           (SELECT STRING_AGG(CAST(n.Metin AS nvarchar(max)), N' | ') WITHIN GROUP (ORDER BY n.OlusmaZamani)
            FROM musteri.GeriBildirimNotu AS n
            WHERE n.GeriBildirimKimlik = g.Kimlik) AS Notlar,
           g.IletisimAdi, g.IletisimTelefonE164 AS IletisimTelefonu, h.KayitNo AS HesapKayitNo,
           g.UygulamaSurumu, g.DilKodu,
           CONVERT(datetime2(0), g.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           g.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM musteri.GeriBildirim AS g
    LEFT JOIN musteri.Hesap AS h ON h.Kimlik = g.HesapKimlik
    WHERE g.HesapKimlik IN (SELECT j.Kimlik FROM OPENJSON(@Hesaplar) WITH (Kimlik uniqueidentifier) AS j)
       OR (@Telefon IS NOT NULL AND g.HesapKimlik IS NULL AND g.IletisimTelefonE164 = @Telefon)
    ORDER BY g.OlusmaZamani DESC, g.KayitNo DESC;

    /* 8 · Güncel rıza */
    SELECT TOP (200) N'8 · Güncel rıza' AS Bolum,
           h.KayitNo AS HesapKayitNo, r.MetinKodu, rm.Ad AS MetinAdi, r.SecimKodu, rs.Ad AS SecimAdi, r.Surum, r.DilKodu,
           CONVERT(datetime2(0), r.OlayZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OlayZamaniTurkiye,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM kvkk.GuncelRiza AS r
    JOIN musteri.Hesap AS h ON h.Kimlik = r.HesapKimlik
    LEFT JOIN kod.RizaMetni AS rm ON rm.Kod = r.MetinKodu
    LEFT JOIN kod.RizaSecimi AS rs ON rs.Kod = r.SecimKodu
    WHERE r.HesapKimlik IN (SELECT j.Kimlik FROM OPENJSON(@Hesaplar) WITH (Kimlik uniqueidentifier) AS j)
    ORDER BY h.KayitNo, rm.Sira, r.MetinKodu;

    /* 9 · KVKK başvuruları (hesabın; telefonla aranınca iletişim bilgisinde bu numara geçenler de) */
    SELECT TOP (200) N'9 · KVKK başvuruları' AS Bolum,
           b.KayitNo AS BasvuruKayitNo, bt.Ad AS TurAdi, b.DurumKodu, b.YanitSonTarihi, rk.Ad AS KanalAdi,
           b.BasvuranAdi, b.IletisimBilgisi, h.KayitNo AS HesapKayitNo,
           CONVERT(datetime2(0), b.SonuclanmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS SonuclanmaZamaniTurkiye,
           CONVERT(datetime2(0), b.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM kvkk.BasvuruTalebi AS b
    LEFT JOIN musteri.Hesap AS h ON h.Kimlik = b.HesapKimlik
    LEFT JOIN kod.KvkkBasvuruTuru AS bt ON bt.Kod = b.TurKodu
    LEFT JOIN kod.RizaKanali AS rk ON rk.Kod = b.KanalKodu
    WHERE b.HesapKimlik IN (SELECT j.Kimlik FROM OPENJSON(@Hesaplar) WITH (Kimlik uniqueidentifier) AS j)
       OR (@Telefon IS NOT NULL AND LEN(ISNULL(@TelefonUlusal, N'')) >= 7
           AND b.IletisimBilgisi LIKE N'%' + @TelefonUlusal + N'%')
    ORDER BY b.OlusmaZamani DESC, b.KayitNo DESC;

    /* 10 · Cihazlar (push jetonu yok) */
    SELECT TOP (200) N'10 · Cihazlar' AS Bolum,
           h.KayitNo AS HesapKayitNo, ku.Ad AS UygulamaAdi, c.PlatformKodu, bi.Ad AS BildirimIzniAdi, c.DilKodu,
           c.UygulamaSurumu, c.IsletimSistemiSurumu,
           CONVERT(datetime2(0), c.SonGorulmeZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS SonGorulmeZamaniTurkiye,
           CONVERT(datetime2(0), c.PasifZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS PasifZamaniTurkiye,
           c.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM bildirim.Cihaz AS c
    JOIN musteri.Hesap AS h ON h.Kimlik = c.HesapKimlik
    LEFT JOIN kod.KaynakUygulama AS ku ON ku.Kod = c.UygulamaKodu
    LEFT JOIN kod.BildirimIzni AS bi ON bi.Kod = c.BildirimIzniKodu
    WHERE c.HesapKimlik IN (SELECT j.Kimlik FROM OPENJSON(@Hesaplar) WITH (Kimlik uniqueidentifier) AS j)
    ORDER BY c.SonGorulmeZamani DESC, c.KayitNo DESC;

    /* 11 · Cari kartları */
    SELECT TOP (200) N'11 · Cari kartları' AS Bolum,
           h.KayitNo AS HesapKayitNo, dsi.Ad AS DisSistemAdi, sr.Ad AS SirketAdi, c.FirmaNo, c.CariKodu, c.Aktif,
           kk.Ad AS KaynakAdi, c.DogrulayanAdi,
           CONVERT(datetime2(0), c.DogrulamaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS DogrulamaZamaniTurkiye,
           c.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM entegrasyon.CariKarti AS c
    JOIN musteri.Hesap AS h ON h.Kimlik = c.HesapKimlik
    LEFT JOIN kod.DisSistem AS dsi ON dsi.Kod = c.DisSistemKodu
    LEFT JOIN sirket.Sirket AS sr ON sr.Kod = c.SirketKodu
    LEFT JOIN kod.KayitKaynagi AS kk ON kk.Kod = c.KaynakKodu
    WHERE c.HesapKimlik IN (SELECT j.Kimlik FROM OPENJSON(@Hesaplar) WITH (Kimlik uniqueidentifier) AS j)
    ORDER BY c.OlusmaZamani DESC, c.KayitNo DESC;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'MusteriGoster',
     @Metin = N'Ne yapar: telefonla ya da adla müşteriyi bulur ve 11 kümeyle gösterir: 1 müşteri kartı (gorunum.MusteriKarti + BulunduguYer), 2 hesaptaki kişiler, 3 telefon geçmişi, 4 makineler (güncel ve geçmiş sahiplik; servis ve garanti), 5 talepler (hesaplı ve hesapsız; hesapsız açılmışlarda HesapsizEslesme = 1), 6 numara değişikliği talepleri (eski/yeni telefon, kanıt seri, karar), 7 geri bildirimler (notlarıyla), 8 güncel rıza, 9 KVKK başvuruları, 10 cihazlar (push jetonu gösterilmez), 11 LOGO cari kartları. Telefon her yazımla verilir (0532 123 45 67, +90 532 123 45 67, 5321234567); hesap güncel telefondan, telefon geçmişinden ve hesaptaki kişilerin telefonundan bulunur ve birleştirilmiş hesap zinciri iki yönde izlenir. BulunduguYer: guncelTelefon, eskiTelefon, kisiTelefonu, kisiAdi, birlesmeZinciri (başka bir eşleşen hesapla aynı zincirde). Telefonla aranınca bu telefonla hesapsız açılmış talepler, bu telefonu içeren numara değişikliği talepleri ve hesapsız geri bildirimler de gelir. Adla aranınca (en az 3 harf, Türkçe harf fark etmez) kişi adı ve hesapsız talepteki ad aranır. Ne yapmaz: 20''den çok hesap eşleşirse yalnız 1. kümeyi döndürür (aramayı daraltın); hiçbir şeyi değiştirmez. Hiçbir kayıt yoksa 51102, girdi ne telefon ne de en az 3 harflik adsa 51105. Örnek: EXEC yardim.MusteriGoster N''0532 123 45 67''; EXEC yardim.MusteriGoster N''isik makina'';';
EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'MusteriGoster', @Alt = N'@Metin', @AltTuru = N'PARAMETER',
     @Metin = N'Müşterinin telefonu (her yazım) ya da adının bir parçası (en az 3 harf).';
GO

/* --------------------------------------------------------------------------
   5. yardim.ServisGoster
   Eşleştirme yardim.Ara ile aynı: ad (aksansız), giriş adı (şifre yardım
   talebindeki beyan dahil), eski servis numarası, cari kodu, telefon;
   ayrıca yalnız rakamdan oluşan girdi servisin KayitNo'su olarak denenir.
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yardim.ServisGoster
    @Metin nvarchar(400)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Kod nvarchar(400);
    DECLARE @Telefon nvarchar(16);
    DECLARE @GirisAdi nvarchar(400);
    DECLARE @Arama nvarchar(400);
    DECLARE @Desen nvarchar(900);
    DECLARE @Ham nvarchar(400) = UPPER(LTRIM(RTRIM(ISNULL(@Metin, N''))) COLLATE Latin1_General_100_BIN2);
    DECLARE @Kirpik nvarchar(400) = LTRIM(RTRIM(ISNULL(@Metin, N'')));
    DECLARE @KayitNo bigint;
    DECLARE @Servisler nvarchar(max);
    DECLARE @ServisSayisi int = 0;
    DECLARE @ServisKimlik uniqueidentifier;

    SELECT @Kod = s.Kod, @Telefon = s.TelefonE164, @GirisAdi = s.GirisAdi, @Arama = s.Arama
    FROM yardim.Sadelestir(@Metin) AS s;

    IF @Kirpik <> N'' AND LEN(@Kirpik) <= 18 AND @Kirpik NOT LIKE N'%[^0-9]%'
        SET @KayitNo = TRY_CONVERT(bigint, @Kirpik);

    IF LEN(ISNULL(@Kod, N'')) < 3 AND LEN(ISNULL(@Arama, N'')) < 3 AND @KayitNo IS NULL
        THROW 51105, N'servisin adını, giriş adını, eski numarasını, cari kodunu, telefonunu ya da kayıt numarasını yazın', 1;

    IF LEN(ISNULL(@Arama, N'')) >= 3
        SET @Desen = N'%' + REPLACE(REPLACE(REPLACE(@Arama, N'[', N'[[]'), N'%', N'[%]'), N'_', N'[_]') + N'%';

    WITH aday AS (
        SELECT s.Kimlik
        FROM servis.Servis AS s
        WHERE @KayitNo IS NOT NULL AND s.KayitNo = @KayitNo
        UNION
        SELECT s.Kimlik
        FROM servis.Servis AS s
        WHERE @Desen IS NOT NULL AND s.AdArama LIKE @Desen
        UNION
        SELECT gh.ServisKimlik
        FROM erisim.Kullanici AS k
        JOIN servis.GirisHesabi AS gh ON gh.KullaniciKimlik = k.Kimlik
        WHERE LEN(ISNULL(@GirisAdi, N'')) >= 3 AND k.GirisAdi = @GirisAdi
        UNION
        SELECT y.ServisKimlik
        FROM servis.SifreYardimTalebi AS y
        WHERE LEN(ISNULL(@GirisAdi, N'')) >= 3
          AND LOWER(y.GirisAdiBeyani COLLATE Latin1_General_100_BIN2) = @GirisAdi
        UNION
        SELECT s.Kimlik
        FROM servis.Servis AS s
        WHERE LEN(ISNULL(@Kod, N'')) BETWEEN 3 AND 20
          AND s.EskiNumara IS NOT NULL
          AND (UPPER(s.EskiNumara COLLATE Latin1_General_100_BIN2) = @Ham
               OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(s.EskiNumara COLLATE Latin1_General_100_BIN2),
                          N'-', N''), N' ', N''), N'.', N''), N'/', N''), N'_', N'') = @Kod)
        UNION
        SELECT c.ServisKimlik
        FROM entegrasyon.CariKarti AS c
        WHERE c.ServisKimlik IS NOT NULL
          AND LEN(ISNULL(@Kod, N'')) >= 3
          AND (UPPER(c.CariKodu COLLATE Latin1_General_100_BIN2) = @Ham
               OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(c.CariKodu COLLATE Latin1_General_100_BIN2),
                          N'.', N''), N'-', N''), N' ', N''), N'/', N''), N'_', N'') = @Kod)
        UNION
        SELECT s.Kimlik
        FROM servis.Servis AS s
        WHERE @Telefon IS NOT NULL AND s.TelefonE164 = @Telefon
    )
    SELECT @Servisler = (SELECT a.Kimlik FROM aday AS a FOR JSON PATH);

    SELECT @ServisSayisi = COUNT(*) FROM OPENJSON(@Servisler) AS j;

    IF @ServisSayisi = 0
        THROW 51102, N'bu bilgiyle servis bulunamadı; EXEC yardim.Ara ile arayın', 1;

    /* 1 · Servis kartı */
    SELECT TOP (200) N'1 · Servis kartı' AS Bolum, v.*,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM gorunum.ServisKarti AS v
    JOIN servis.Servis AS s ON s.KayitNo = v.ServisKayitNo
    WHERE s.Kimlik IN (SELECT j.Kimlik FROM OPENJSON(@Servisler) WITH (Kimlik uniqueidentifier) AS j)
    ORDER BY s.Ad;

    /* Birden çok servis: yalnız ilk küme (KayitNo ile yeniden çağırın). */
    IF @ServisSayisi > 1
        RETURN;

    SELECT @ServisKimlik = j.Kimlik FROM OPENJSON(@Servisler) WITH (Kimlik uniqueidentifier) AS j;

    /* 2 · Giriş hesapları */
    SELECT TOP (200) N'2 · Giriş hesapları' AS Bolum,
           k.GirisAdi, k.Aktif, k.SifreBelirlemeGerekli, k.BasarisizGirisSayisi,
           CONVERT(datetime2(0), k.KilitBitisZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS KilitBitisZamaniTurkiye,
           CONVERT(datetime2(0), k.SonGirisZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS SonGirisZamaniTurkiye,
           CONVERT(datetime2(0), k.SifreDegistirmeZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS SifreDegistirmeZamaniTurkiye,
           (SELECT COUNT(*)
            FROM erisim.Oturum AS o
            WHERE o.KullaniciKimlik = k.Kimlik AND o.KapanmaZamani IS NULL AND o.BitisZamani > SYSUTCDATETIME()) AS AcikOturumSayisi,
           CAST(CASE WHEN EXISTS (SELECT 1
                                  FROM erisim.SifreSifirlamaJetonu AS sj
                                  WHERE sj.KullaniciKimlik = k.Kimlik
                                    AND sj.KullanilmaZamani IS NULL
                                    AND sj.IptalZamani IS NULL
                                    AND sj.SonGecerlilikZamani > SYSUTCDATETIME())
                     THEN 1 ELSE 0 END AS bit) AS AcikJetonVar,
           gh.Aciklama,
           CONVERT(datetime2(0), gh.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OlusmaZamaniTurkiye,
           k.KayitNo AS KullaniciKayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM servis.GirisHesabi AS gh
    JOIN erisim.Kullanici AS k ON k.Kimlik = gh.KullaniciKimlik
    WHERE gh.ServisKimlik = @ServisKimlik
    ORDER BY gh.OlusmaZamani DESC;

    /* 3 · Şifre yardım talepleri */
    SELECT TOP (200) N'3 · Şifre yardım talepleri' AS Bolum,
           y.GirisAdiBeyani, y.DurumKodu,
           CONVERT(datetime2(0), y.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           CONVERT(datetime2(0), y.KapanmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS KapanmaZamaniTurkiye,
           y.KapatanAdi, y.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM servis.SifreYardimTalebi AS y
    WHERE y.ServisKimlik = @ServisKimlik
    ORDER BY y.OlusmaZamani DESC, y.KayitNo DESC;

    /* 4 · Marka yetkileri ve geçmişi (her sürüm bir satır; GuncelSurum = 1 bugünkü satır) */
    SELECT TOP (200) N'4 · Marka yetkileri ve geçmişi' AS Bolum,
           y.MarkaKodu, mr.Ad AS MarkaAdi, y.Etkin,
           CONVERT(datetime2(0), y.BaslangicZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BaslangicZamaniTurkiye,
           CONVERT(datetime2(0), y.BitisZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BitisZamaniTurkiye,
           COALESCE(p.AdSoyad, vk.GirisAdi COLLATE DATABASE_DEFAULT) AS VerenAdi,
           CONVERT(datetime2(0), y.GecerlilikBaslangici AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS SurumBaslangicZamaniTurkiye,
           CASE WHEN y.GecerlilikBitisi < CONVERT(datetime2(7), '9999-12-31')
                THEN CONVERT(datetime2(0), y.GecerlilikBitisi AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') END AS SurumBitisZamaniTurkiye,
           CAST(CASE WHEN y.GecerlilikBitisi >= CONVERT(datetime2(7), '9999-12-31') THEN 1 ELSE 0 END AS bit) AS GuncelSurum,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM servis.MarkaYetkisi FOR SYSTEM_TIME ALL AS y
    LEFT JOIN katalog.Marka AS mr ON mr.Kod = y.MarkaKodu
    LEFT JOIN erisim.Kullanici AS vk ON vk.Kimlik = y.VerenKullaniciKimlik
    LEFT JOIN personel.Personel AS p ON p.KullaniciKimlik = y.VerenKullaniciKimlik
    WHERE y.ServisKimlik = @ServisKimlik
    ORDER BY y.MarkaKodu, y.GecerlilikBaslangici DESC;

    /* 5 · Bölgeler */
    SELECT TOP (200) N'5 · Bölgeler' AS Bolum,
           il.Ad AS IlAdi, ilc.Ad AS IlceAdi, b.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM servis.Bolge AS b
    LEFT JOIN cografya.Il AS il ON il.IlKodu = b.IlKodu
    LEFT JOIN cografya.Ilce AS ilc ON ilc.IlceKodu = b.IlceKodu
    WHERE b.ServisKimlik = @ServisKimlik
    ORDER BY il.Ad, ilc.Ad;

    /* 6 · Bağlı bayiler */
    SELECT TOP (200) N'6 · Bağlı bayiler' AS Bolum,
           ba.Ad AS BayiAdi, ba.KayitNo AS BayiKayitNo, bb.Oncelik, fd.Ad AS BayiDurumAdi, il.Ad AS IlAdi,
           CONVERT(datetime2(0), bb.BaslangicZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BaslangicZamaniTurkiye,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM servis.BayiBagi AS bb
    JOIN bayi.Bayi AS ba ON ba.Kimlik = bb.BayiKimlik
    LEFT JOIN kod.FirmaDurumu AS fd ON fd.Kod = ba.DurumKodu
    LEFT JOIN cografya.Il AS il ON il.IlKodu = ba.IlKodu
    WHERE bb.ServisKimlik = @ServisKimlik
    ORDER BY bb.Oncelik, ba.Ad;

    /* 7 · Ad ve durum geçmişi */
    SELECT TOP (200) N'7 · Ad ve durum geçmişi' AS Bolum,
           s.Ad, st.Ad AS ServisTuruAdi, fd.Ad AS DurumAdi, s.PilotKatilimcisi, il.Ad AS IlAdi, ilc.Ad AS IlceAdi,
           s.Adres, s.TelefonE164 AS Telefon,
           CONVERT(datetime2(0), s.PasifZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS PasifZamaniTurkiye,
           CONVERT(datetime2(0), s.GecerlilikBaslangici AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS SurumBaslangicZamaniTurkiye,
           CASE WHEN s.GecerlilikBitisi < CONVERT(datetime2(7), '9999-12-31')
                THEN CONVERT(datetime2(0), s.GecerlilikBitisi AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') END AS SurumBitisZamaniTurkiye,
           CAST(CASE WHEN s.GecerlilikBitisi >= CONVERT(datetime2(7), '9999-12-31') THEN 1 ELSE 0 END AS bit) AS GuncelSurum,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM servis.Servis FOR SYSTEM_TIME ALL AS s
    LEFT JOIN kod.ServisTuru AS st ON st.Kod = s.TurKodu
    LEFT JOIN kod.FirmaDurumu AS fd ON fd.Kod = s.DurumKodu
    LEFT JOIN cografya.Il AS il ON il.IlKodu = s.IlKodu
    LEFT JOIN cografya.Ilce AS ilc ON ilc.IlceKodu = s.IlceKodu
    WHERE s.Kimlik = @ServisKimlik
    ORDER BY s.GecerlilikBaslangici DESC;

    /* 8 · Açık talepler */
    SELECT TOP (200) N'8 · Açık talepler' AS Bolum, v.*,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM talep.Talep AS t
    JOIN gorunum.TalepListesi AS v ON v.KayitNo = t.KayitNo
    WHERE t.ServisKimlik = @ServisKimlik AND t.Kapali = 0
    ORDER BY t.OlusmaZamani DESC, t.KayitNo DESC;

    /* 9 · Bu ayın hak edişleri (Türkiye ayı) */
    SELECT TOP (200) N'9 · Bu ayın hak edişleri' AS Bolum, v.*,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM hakedis.HakEdis AS h
    JOIN gorunum.HakEdisListesi AS v ON v.KayitNo = h.KayitNo
    CROSS JOIN gorunum.Bugun AS bg
    WHERE h.ServisKimlik = @ServisKimlik AND v.OlusmaTarihi >= bg.AyBasi
    ORDER BY h.OlusmaZamani DESC, h.KayitNo DESC;

    /* 10 · Dönem dökümleri */
    SELECT TOP (200) N'10 · Dönem dökümleri' AS Bolum,
           LEFT(d.Numara, 3) + N'-' + SUBSTRING(d.Numara, 4, 2) + N'-' + RIGHT(d.Numara, 5) AS DokumNumarasi,
           sr.Ad AS SirketAdi, d.ParaBirimiKodu, d.DonemYili, d.DonemAyi, d.DurumKodu, dd.Ad AS DurumAdi,
           d.NetToplam, d.KdvToplam, d.TevkifatToplam, d.StopajToplam, d.MahsupToplam, d.OdenecekTutar,
           CONVERT(datetime2(0), d.KesinlesmeZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS KesinlesmeZamaniTurkiye,
           CONVERT(datetime2(0), d.FaturaGelmeZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS FaturaGelmeZamaniTurkiye,
           CONVERT(datetime2(0), d.OdemeZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OdemeZamaniTurkiye,
           CONVERT(datetime2(0), d.OlusmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS OlusmaZamaniTurkiye,
           d.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM hakedis.DonemDokumu AS d
    LEFT JOIN sirket.Sirket AS sr ON sr.Kod = d.SirketKodu
    LEFT JOIN kod.DonemDokumuDurumu AS dd ON dd.Kod = d.DurumKodu
    WHERE d.ServisKimlik = @ServisKimlik
    ORDER BY d.DonemYili DESC, d.DonemAyi DESC, d.KayitNo DESC;

    /* 11 · Son 50 hesap hareketi (açıklama dahil) ve bakiye (satırın şirketi ve para birimi için) */
    SELECT TOP (50) N'11 · Son hesap hareketleri ve bakiye' AS Bolum, v.*, x.Aciklama,
           sb.AlacakToplami, sb.BorcToplami, sb.Bakiye,
           CAST(CASE WHEN COUNT(*) OVER () > 50 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM hakedis.ServisHesapHareketi AS x
    JOIN gorunum.ServisHesapHareketleri AS v ON v.KayitNo = x.KayitNo
    LEFT JOIN gorunum.ServisBakiyesi AS sb
      ON sb.ServisKayitNo = v.ServisKayitNo
     AND sb.SirketAdi = v.SirketAdi
     AND sb.ParaBirimiKodu = v.ParaBirimiKodu
    WHERE x.ServisKimlik = @ServisKimlik
    ORDER BY x.HareketZamani DESC, x.KayitNo DESC;

    /* 12 · Cari kartları */
    SELECT TOP (200) N'12 · Cari kartları' AS Bolum,
           dsi.Ad AS DisSistemAdi, sr.Ad AS SirketAdi, c.FirmaNo, c.CariKodu, c.Aktif,
           kk.Ad AS KaynakAdi, c.DogrulayanAdi,
           CONVERT(datetime2(0), c.DogrulamaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS DogrulamaZamaniTurkiye,
           c.KayitNo,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM entegrasyon.CariKarti AS c
    LEFT JOIN kod.DisSistem AS dsi ON dsi.Kod = c.DisSistemKodu
    LEFT JOIN sirket.Sirket AS sr ON sr.Kod = c.SirketKodu
    LEFT JOIN kod.KayitKaynagi AS kk ON kk.Kod = c.KaynakKodu
    WHERE c.ServisKimlik = @ServisKimlik
    ORDER BY c.OlusmaZamani DESC, c.KayitNo DESC;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'ServisGoster',
     @Metin = N'Ne yapar: servis firmasını adıyla (aksansız, parçası yeter), giriş adıyla (şifre yardım talebine yazılan giriş adı dahil), eski servis numarasıyla (SRV014), LOGO cari koduyla, telefonuyla ya da KayitNo''suyla bulur ve 12 kümeyle gösterir: 1 servis kartı (gorunum.ServisKarti), 2 giriş hesapları (aktif mi, şifre belirlemesi gerekiyor mu, kilit, son giriş, açık oturum sayısı, açık tek kullanımlık kod var mı), 3 şifre yardım talepleri, 4 marka yetkileri ve geçmişi (her sürüm bir satır), 5 bölgeler, 6 bağlı bayiler, 7 ad ve durum geçmişi, 8 açık talepler, 9 bu ayın hak edişleri, 10 dönem dökümleri, 11 son 50 hesap hareketi (açıklama dahil) ve satırın şirketi ile para birimindeki bakiye, 12 cari kartları. Ne yapmaz: birden çok servis eşleşirse yalnız 1. kümeyi döndürür (istenen servisin KayitNo''suyla yeniden çağırın); şifre sıfırlamaz (yonetim.GirisSifresiniSifirla); hiçbir şeyi değiştirmez. Bulunamazsa 51102, girdi çok kısaysa 51105. Örnek: EXEC yardim.ServisGoster N''konya.merkez''; EXEC yardim.ServisGoster N''selcuk tarim''; EXEC yardim.ServisGoster N''17'';';
EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'ServisGoster', @Alt = N'@Metin', @AltTuru = N'PARAMETER',
     @Metin = N'Servisin adı (parçası), giriş adı, eski servis numarası, LOGO cari kodu, telefonu ya da KayitNo''su.';
GO

/* --------------------------------------------------------------------------
   6. yardim.Ara
   Girdinin uyduğu bütün biçimler birlikte aranır (tasarim.md 3.4.1).
   Adım 1: eşleşmeler (kayıt türü, kimlik, eşleşen alan, tam mı) aynı
   kayıt için en iyisi seçilerek JSON dizgisine konur.
   Adım 2: her kayıt türü kendi gösterimi, özeti, zamanı ve sonraki
   adım komutuyla tek listeye çevrilir.
   Kayıt türü kodları (KayitTuru kolonu kod.KayitTuru.Ad'ı gösterir):
   talep, telefonDegisikligi, geriBildirim, donemDokumu, makine, servis,
   bayi, personel, hesap.
   -------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE yardim.Ara
    @Metin nvarchar(400)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Kod nvarchar(400);
    DECLARE @Rakam nvarchar(400);
    DECLARE @Telefon nvarchar(16);
    DECLARE @TelefonUlusal nvarchar(20);
    DECLARE @GirisAdi nvarchar(400);
    DECLARE @Arama nvarchar(400);
    DECLARE @Ham nvarchar(400) = UPPER(LTRIM(RTRIM(ISNULL(@Metin, N''))) COLLATE Latin1_General_100_BIN2);
    DECLARE @Desen nvarchar(900);
    DECLARE @KodBoy int;
    DECLARE @AramaBoy int;
    DECLARE @GirisBoy int;
    DECLARE @UlusalBoy int;
    DECLARE @NumaraBicimi bit = 0;
    DECLARE @Eslesme nvarchar(max);

    SELECT @Kod = s.Kod, @Rakam = s.Rakam, @Telefon = s.TelefonE164, @TelefonUlusal = s.TelefonUlusal,
           @GirisAdi = s.GirisAdi, @Arama = s.Arama
    FROM yardim.Sadelestir(@Metin) AS s;

    SET @KodBoy = LEN(ISNULL(@Kod, N''));
    SET @AramaBoy = LEN(ISNULL(@Arama, N''));
    SET @GirisBoy = LEN(ISNULL(@GirisAdi, N''));
    SET @UlusalBoy = LEN(ISNULL(@TelefonUlusal, N''));

    IF @KodBoy < 3 AND LEN(ISNULL(@Rakam, N'')) < 4 AND @AramaBoy < 3
        THROW 51105, N'arama metni çok kısa; en az 3 harf ya da 4 rakam yazın', 1;

    IF @KodBoy = 10 AND @Kod LIKE N'[A-Z][A-Z][A-Z][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
        SET @NumaraBicimi = 1;

    IF @AramaBoy >= 3
        SET @Desen = N'%' + REPLACE(REPLACE(REPLACE(@Arama, N'[', N'[[]'), N'%', N'[%]'), N'_', N'[_]') + N'%';

    /* Adım 1 — eşleşmeler */
    WITH eslesme AS (
        /* Okunur numara */
        SELECT N'talep' AS TurKodu, t.Kimlik, N'numara' AS EslesenAlan, 1 AS Tam, 1 AS Oncelik
        FROM talep.Talep AS t
        WHERE @NumaraBicimi = 1 AND t.Numara = @Kod
        UNION ALL
        SELECT N'telefonDegisikligi', d.Kimlik, N'numara', 1, 1
        FROM musteri.TelefonDegisikligiTalebi AS d
        WHERE @NumaraBicimi = 1 AND d.Numara = @Kod
        UNION ALL
        SELECT N'geriBildirim', g.Kimlik, N'numara', 1, 1
        FROM musteri.GeriBildirim AS g
        WHERE @NumaraBicimi = 1 AND g.Numara = @Kod
        UNION ALL
        SELECT N'donemDokumu', d.Kimlik, N'numara', 1, 1
        FROM hakedis.DonemDokumu AS d
        WHERE @NumaraBicimi = 1 AND d.Numara = @Kod
        /* Eski numara, cihaz numarası */
        UNION ALL
        SELECT N'talep', t.Kimlik, N'eski numara', 1, 2
        FROM talep.Talep AS t
        WHERE @KodBoy BETWEEN 3 AND 20 AND t.EskiNumara IS NOT NULL
          AND (UPPER(t.EskiNumara COLLATE Latin1_General_100_BIN2) = @Ham
               OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(t.EskiNumara COLLATE Latin1_General_100_BIN2),
                          N'-', N''), N' ', N''), N'.', N''), N'/', N''), N'_', N'') = @Kod)
        UNION ALL
        SELECT N'talep', t.Kimlik, N'cihaz numarası', 1, 3
        FROM talep.Talep AS t
        WHERE @KodBoy BETWEEN 3 AND 20 AND t.CihazNumarasi IS NOT NULL
          AND (UPPER(t.CihazNumarasi COLLATE Latin1_General_100_BIN2) = @Ham
               OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(t.CihazNumarasi COLLATE Latin1_General_100_BIN2),
                          N'-', N''), N' ', N''), N'.', N''), N'/', N''), N'_', N'') = @Kod)
        UNION ALL
        SELECT N'servis', s.Kimlik, N'eski numara', 1, 2
        FROM servis.Servis AS s
        WHERE @KodBoy BETWEEN 3 AND 20 AND s.EskiNumara IS NOT NULL
          AND (UPPER(s.EskiNumara COLLATE Latin1_General_100_BIN2) = @Ham
               OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(s.EskiNumara COLLATE Latin1_General_100_BIN2),
                          N'-', N''), N' ', N''), N'.', N''), N'/', N''), N'_', N'') = @Kod)
        UNION ALL
        SELECT N'bayi', b.Kimlik, N'eski numara', 1, 2
        FROM bayi.Bayi AS b
        WHERE @KodBoy BETWEEN 3 AND 20 AND b.EskiNumara IS NOT NULL
          AND (UPPER(b.EskiNumara COLLATE Latin1_General_100_BIN2) = @Ham
               OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(b.EskiNumara COLLATE Latin1_General_100_BIN2),
                          N'-', N''), N' ', N''), N'.', N''), N'/', N''), N'_', N'') = @Kod)
        UNION ALL
        SELECT N'personel', p.Kimlik, N'eski numara', 1, 2
        FROM personel.Personel AS p
        WHERE @KodBoy BETWEEN 3 AND 20 AND p.EskiNumara IS NOT NULL
          AND (UPPER(p.EskiNumara COLLATE Latin1_General_100_BIN2) = @Ham
               OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(p.EskiNumara COLLATE Latin1_General_100_BIN2),
                          N'-', N''), N' ', N''), N'.', N''), N'/', N''), N'_', N'') = @Kod)
        UNION ALL
        SELECT N'hesap', h.Kimlik, N'eski numara', 1, 2
        FROM musteri.Hesap AS h
        WHERE @KodBoy BETWEEN 3 AND 20 AND h.EskiNumara IS NOT NULL
          AND (UPPER(h.EskiNumara COLLATE Latin1_General_100_BIN2) = @Ham
               OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(h.EskiNumara COLLATE Latin1_General_100_BIN2),
                          N'-', N''), N' ', N''), N'.', N''), N'/', N''), N'_', N'') = @Kod)
        /* Seri numarası: tam, sonra baştan */
        UNION ALL
        SELECT N'makine', m.Kimlik, N'seri numarası', 1, 4
        FROM makine.Makine AS m
        WHERE @KodBoy >= 3 AND m.SeriNo = @Kod
        UNION ALL
        SELECT N'makine', m.Kimlik, N'seri numarasının başı', 0, 5
        FROM makine.Makine AS m
        WHERE @KodBoy >= 3 AND m.SeriNo LIKE @Kod + N'%' AND m.SeriNo <> @Kod
        /* LOGO cari kodu (noktalama atılmış karşılaştırma dahil) */
        UNION ALL
        SELECT CASE WHEN c.ServisKimlik IS NOT NULL THEN N'servis'
                    WHEN c.BayiKimlik IS NOT NULL THEN N'bayi'
                    ELSE N'hesap' END,
               COALESCE(c.ServisKimlik, c.BayiKimlik, c.HesapKimlik),
               N'cari kodu', 1, 6
        FROM entegrasyon.CariKarti AS c
        WHERE @KodBoy >= 3
          AND (UPPER(c.CariKodu COLLATE Latin1_General_100_BIN2) = @Ham
               OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(c.CariKodu COLLATE Latin1_General_100_BIN2),
                          N'.', N''), N'-', N''), N' ', N''), N'/', N''), N'_', N'') = @Kod)
        /* Telefon (E.164) */
        UNION ALL
        SELECT N'hesap', h.Kimlik, N'telefon', 1, 7
        FROM musteri.Hesap AS h
        WHERE @Telefon IS NOT NULL AND h.TelefonE164 = @Telefon
        UNION ALL
        SELECT N'hesap', g.HesapKimlik, N'eski telefon', 1, 8
        FROM musteri.HesapTelefonGecmisi AS g
        WHERE @Telefon IS NOT NULL AND g.TelefonE164 = @Telefon
        UNION ALL
        SELECT N'hesap', k.HesapKimlik, N'hesaptaki kişinin telefonu', 1, 9
        FROM musteri.HesapKisisi AS k
        WHERE @Telefon IS NOT NULL AND k.TelefonE164 = @Telefon
        UNION ALL
        SELECT N'talep', t.Kimlik, N'talepteki iletişim telefonu', 1, 10
        FROM talep.Talep AS t
        WHERE @Telefon IS NOT NULL AND t.IletisimTelefonE164 = @Telefon
        UNION ALL
        SELECT N'telefonDegisikligi', d.Kimlik, N'numara değişikliğindeki eski telefon', 1, 11
        FROM musteri.TelefonDegisikligiTalebi AS d
        WHERE @Telefon IS NOT NULL AND d.EskiTelefonE164 = @Telefon
        UNION ALL
        SELECT N'telefonDegisikligi', d.Kimlik, N'numara değişikliğindeki yeni telefon', 1, 12
        FROM musteri.TelefonDegisikligiTalebi AS d
        WHERE @Telefon IS NOT NULL AND d.YeniTelefonE164 = @Telefon
        UNION ALL
        SELECT N'geriBildirim', g.Kimlik, N'geri bildirimdeki iletişim telefonu', 1, 13
        FROM musteri.GeriBildirim AS g
        WHERE @Telefon IS NOT NULL AND g.IletisimTelefonE164 = @Telefon
        UNION ALL
        SELECT N'personel', p.Kimlik, N'telefon', 1, 14
        FROM personel.Personel AS p
        WHERE @Telefon IS NOT NULL AND p.TelefonE164 = @Telefon
        /* Telefonun ulusal kısmı */
        UNION ALL
        SELECT N'hesap', h.Kimlik, N'ülke kodu olmadan telefon numarası', 1, 15
        FROM musteri.Hesap AS h
        WHERE @UlusalBoy >= 7 AND h.TelefonUlusal = @TelefonUlusal
        UNION ALL
        SELECT N'talep', t.Kimlik, N'ülke kodu olmadan telefon numarası', 1, 16
        FROM talep.Talep AS t
        WHERE @UlusalBoy >= 7 AND t.IletisimTelefonUlusal = @TelefonUlusal
        /* Giriş adı */
        UNION ALL
        SELECT CASE WHEN p.Kimlik IS NOT NULL THEN N'personel' ELSE N'servis' END,
               COALESCE(p.Kimlik, gh.ServisKimlik),
               N'giriş adı', 1, 17
        FROM erisim.Kullanici AS k
        LEFT JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
        LEFT JOIN servis.GirisHesabi AS gh ON gh.KullaniciKimlik = k.Kimlik
        WHERE @GirisBoy >= 3 AND k.GirisAdi = @GirisAdi
          AND COALESCE(p.Kimlik, gh.ServisKimlik) IS NOT NULL
        UNION ALL
        SELECT N'servis', y.ServisKimlik, N'şifre yardım talebine yazılan giriş adı', 1, 18
        FROM servis.SifreYardimTalebi AS y
        WHERE @GirisBoy >= 3 AND LOWER(y.GirisAdiBeyani COLLATE Latin1_General_100_BIN2) = @GirisAdi
        /* Ad (aksansız, parça) */
        UNION ALL
        SELECT N'hesap', k.HesapKimlik, N'kişi adı',
               CASE WHEN k.AdSoyadArama = @Arama THEN 1 ELSE 0 END, 19
        FROM musteri.HesapKisisi AS k
        WHERE @Desen IS NOT NULL AND k.AdSoyadArama LIKE @Desen
        UNION ALL
        SELECT N'talep', t.Kimlik, N'talepteki ad',
               CASE WHEN t.IletisimAdArama = @Arama THEN 1 ELSE 0 END, 20
        FROM talep.Talep AS t
        WHERE @Desen IS NOT NULL AND t.IletisimAdArama LIKE @Desen
        UNION ALL
        SELECT N'servis', s.Kimlik, N'firma adı',
               CASE WHEN s.AdArama = @Arama THEN 1 ELSE 0 END, 21
        FROM servis.Servis AS s
        WHERE @Desen IS NOT NULL AND s.AdArama LIKE @Desen
        UNION ALL
        SELECT N'bayi', b.Kimlik, N'firma adı',
               CASE WHEN b.AdArama = @Arama THEN 1 ELSE 0 END, 21
        FROM bayi.Bayi AS b
        WHERE @Desen IS NOT NULL AND b.AdArama LIKE @Desen
        UNION ALL
        SELECT N'personel', p.Kimlik, N'personel adı',
               CASE WHEN p.AdArama = @Arama THEN 1 ELSE 0 END, 22
        FROM personel.Personel AS p
        WHERE @Desen IS NOT NULL AND p.AdArama LIKE @Desen
    ), tekil AS (
        SELECT e.TurKodu, e.Kimlik, e.EslesenAlan, e.Tam,
               ROW_NUMBER() OVER (PARTITION BY e.TurKodu, e.Kimlik ORDER BY e.Tam DESC, e.Oncelik) AS Sira
        FROM eslesme AS e
        WHERE e.Kimlik IS NOT NULL
    )
    SELECT @Eslesme = (SELECT u.TurKodu, u.Kimlik, u.EslesenAlan, u.Tam
                       FROM tekil AS u
                       WHERE u.Sira = 1
                       FOR JSON PATH);

    /* Adım 2 — liste */
    WITH u AS (
        SELECT j.TurKodu, j.Kimlik, j.EslesenAlan, j.Tam
        FROM OPENJSON(@Eslesme) WITH (TurKodu nvarchar(40), Kimlik uniqueidentifier,
                                      EslesenAlan nvarchar(200), Tam bit) AS j
    ), zincir AS (
        SELECT u.Kimlik AS Baslangic, h.BirlestigiHesapKimlik AS Hedef, 1 AS Derinlik
        FROM u
        JOIN musteri.Hesap AS h ON h.Kimlik = u.Kimlik
        WHERE u.TurKodu = N'hesap' AND h.BirlestigiHesapKimlik IS NOT NULL
        UNION ALL
        SELECT z.Baslangic, h.BirlestigiHesapKimlik, z.Derinlik + 1
        FROM zincir AS z
        JOIN musteri.Hesap AS h ON h.Kimlik = z.Hedef
        WHERE h.BirlestigiHesapKimlik IS NOT NULL AND z.Derinlik < 50
    ), kalan AS (
        SELECT z.Baslangic, z.Hedef,
               ROW_NUMBER() OVER (PARTITION BY z.Baslangic ORDER BY z.Derinlik DESC) AS Sira
        FROM zincir AS z
    ), satir AS (
        /* talep */
        SELECT u.TurKodu, t.KayitNo,
               (LEFT(t.Numara, 3) + N'-' + SUBSTRING(t.Numara, 4, 2) + N'-' + RIGHT(t.Numara, 5)) COLLATE DATABASE_DEFAULT AS Gosterim,
               CONCAT_WS(N' · ', td.Ad, COALESCE(hs.AdSoyad, t.IletisimAdi), il.Ad, tt.Ad) COLLATE DATABASE_DEFAULT AS Ozet,
               u.EslesenAlan, u.Tam, t.OlusmaZamani AS Zaman,
               (N'EXEC yardim.TalepGoster N''' + LEFT(t.Numara, 3) + N'-' + SUBSTRING(t.Numara, 4, 2) + N'-' + RIGHT(t.Numara, 5) + N''';') COLLATE DATABASE_DEFAULT AS SonrakiAdim
        FROM u
        JOIN talep.Talep AS t ON t.Kimlik = u.Kimlik
        LEFT JOIN kod.TalepDurumu AS td ON td.Kod = t.DurumKodu
        LEFT JOIN kod.TalepTuru AS tt ON tt.Kod = t.TurKodu
        LEFT JOIN cografya.Il AS il ON il.IlKodu = t.IlKodu
        OUTER APPLY (SELECT TOP (1) NULLIF(LTRIM(RTRIM(CONCAT(k.Adi, N' ', k.Soyadi))), N'') AS AdSoyad
                     FROM musteri.HesapKisisi AS k
                     WHERE k.HesapKimlik = t.HesapKimlik AND k.RolKodu = N'hesapSahibi'
                     ORDER BY CASE WHEN k.PasifZamani IS NULL THEN 0 ELSE 1 END, k.OlusmaZamani DESC) AS hs
        WHERE u.TurKodu = N'talep'
        UNION ALL
        /* telefonDegisikligi */
        SELECT u.TurKodu, d.KayitNo,
               (LEFT(d.Numara, 3) + N'-' + SUBSTRING(d.Numara, 4, 2) + N'-' + RIGHT(d.Numara, 5)) COLLATE DATABASE_DEFAULT,
               CONCAT_WS(N' · ', kd.Ad,
                         CASE WHEN d.EskiTelefonE164 IS NOT NULL OR d.YeniTelefonE164 IS NOT NULL
                              THEN CONCAT(d.EskiTelefonE164, N' → ', d.YeniTelefonE164) COLLATE DATABASE_DEFAULT END,
                         d.KanitSeriNo COLLATE DATABASE_DEFAULT, d.KararVerenAdi) COLLATE DATABASE_DEFAULT,
               u.EslesenAlan, u.Tam, d.OlusmaZamani,
               (CASE WHEN COALESCE(d.YeniTelefonE164, d.EskiTelefonE164) IS NOT NULL
                     THEN N'EXEC yardim.MusteriGoster N''' + COALESCE(d.YeniTelefonE164, d.EskiTelefonE164) + N''';'
                     ELSE N'SELECT * FROM musteri.TelefonDegisikligiTalebi WHERE Numara = N''' + d.Numara + N''';' END) COLLATE DATABASE_DEFAULT
        FROM u
        JOIN musteri.TelefonDegisikligiTalebi AS d ON d.Kimlik = u.Kimlik
        LEFT JOIN kod.KararDurumu AS kd ON kd.Kod = d.KararDurumuKodu
        WHERE u.TurKodu = N'telefonDegisikligi'
        UNION ALL
        /* geriBildirim */
        SELECT u.TurKodu, g.KayitNo,
               (LEFT(g.Numara, 3) + N'-' + SUBSTRING(g.Numara, 4, 2) + N'-' + RIGHT(g.Numara, 5)) COLLATE DATABASE_DEFAULT,
               CONCAT_WS(N' · ', g.IletisimAdi, LEFT(g.Metin, 80)) COLLATE DATABASE_DEFAULT,
               u.EslesenAlan, u.Tam, g.OlusmaZamani,
               (CASE WHEN COALESCE(g.IletisimTelefonE164, gh.TelefonE164) IS NOT NULL
                     THEN N'EXEC yardim.MusteriGoster N''' + COALESCE(g.IletisimTelefonE164, gh.TelefonE164) + N''';'
                     ELSE N'SELECT * FROM musteri.GeriBildirim WHERE Numara = N''' + g.Numara + N''';' END) COLLATE DATABASE_DEFAULT
        FROM u
        JOIN musteri.GeriBildirim AS g ON g.Kimlik = u.Kimlik
        LEFT JOIN musteri.Hesap AS gh ON gh.Kimlik = g.HesapKimlik
        WHERE u.TurKodu = N'geriBildirim'
        UNION ALL
        /* donemDokumu */
        SELECT u.TurKodu, d.KayitNo,
               (LEFT(d.Numara, 3) + N'-' + SUBSTRING(d.Numara, 4, 2) + N'-' + RIGHT(d.Numara, 5)) COLLATE DATABASE_DEFAULT,
               CONCAT_WS(N' · ', dd.Ad, sv.Ad,
                         CONCAT(d.DonemYili, N'/', RIGHT(N'0' + CAST(d.DonemAyi AS nvarchar(2)), 2)),
                         CONCAT(d.OdenecekTutar, N' ', d.ParaBirimiKodu COLLATE DATABASE_DEFAULT)) COLLATE DATABASE_DEFAULT,
               u.EslesenAlan, u.Tam, d.OlusmaZamani,
               (N'EXEC yardim.HakEdisGoster N''' + LEFT(d.Numara, 3) + N'-' + SUBSTRING(d.Numara, 4, 2) + N'-' + RIGHT(d.Numara, 5) + N''';') COLLATE DATABASE_DEFAULT
        FROM u
        JOIN hakedis.DonemDokumu AS d ON d.Kimlik = u.Kimlik
        JOIN servis.Servis AS sv ON sv.Kimlik = d.ServisKimlik
        LEFT JOIN kod.DonemDokumuDurumu AS dd ON dd.Kod = d.DurumKodu
        WHERE u.TurKodu = N'donemDokumu'
        UNION ALL
        /* makine */
        SELECT u.TurKodu, m.KayitNo,
               m.SeriNo COLLATE DATABASE_DEFAULT,
               CONCAT_WS(N' · ', mr.Ad, ur.Ad, hs.AdSoyad) COLLATE DATABASE_DEFAULT,
               u.EslesenAlan, u.Tam, m.OlusmaZamani,
               (N'EXEC yardim.MakineGoster N''' + m.SeriNo + N''', N''' + m.MarkaKodu + N''';') COLLATE DATABASE_DEFAULT
        FROM u
        JOIN makine.Makine AS m ON m.Kimlik = u.Kimlik
        LEFT JOIN katalog.Marka AS mr ON mr.Kod = m.MarkaKodu
        LEFT JOIN katalog.Urun AS ur ON ur.MarkaKodu = m.MarkaKodu AND ur.Kod = m.UrunKodu
        LEFT JOIN makine.MakineGuncelSahibi AS gs ON gs.MakineKimlik = m.Kimlik
        OUTER APPLY (SELECT TOP (1) NULLIF(LTRIM(RTRIM(CONCAT(k.Adi, N' ', k.Soyadi))), N'') AS AdSoyad
                     FROM musteri.HesapKisisi AS k
                     WHERE k.HesapKimlik = gs.HesapKimlik AND k.RolKodu = N'hesapSahibi'
                     ORDER BY CASE WHEN k.PasifZamani IS NULL THEN 0 ELSE 1 END, k.OlusmaZamani DESC) AS hs
        WHERE u.TurKodu = N'makine'
        UNION ALL
        /* servis */
        SELECT u.TurKodu, s.KayitNo,
               s.Ad COLLATE DATABASE_DEFAULT,
               CONCAT_WS(N' · ', fd.Ad, il.Ad, s.TelefonE164 COLLATE DATABASE_DEFAULT,
                         (SELECT STRING_AGG(CAST(k.GirisAdi AS nvarchar(max)), N', ')
                          FROM servis.GirisHesabi AS gh
                          JOIN erisim.Kullanici AS k ON k.Kimlik = gh.KullaniciKimlik
                          WHERE gh.ServisKimlik = s.Kimlik) COLLATE DATABASE_DEFAULT) COLLATE DATABASE_DEFAULT,
               u.EslesenAlan, u.Tam, s.OlusmaZamani,
               (N'EXEC yardim.ServisGoster N''' + CAST(s.KayitNo AS nvarchar(20)) + N''';') COLLATE DATABASE_DEFAULT
        FROM u
        JOIN servis.Servis AS s ON s.Kimlik = u.Kimlik
        LEFT JOIN kod.FirmaDurumu AS fd ON fd.Kod = s.DurumKodu
        LEFT JOIN cografya.Il AS il ON il.IlKodu = s.IlKodu
        WHERE u.TurKodu = N'servis'
        UNION ALL
        /* bayi */
        SELECT u.TurKodu, b.KayitNo,
               b.Ad COLLATE DATABASE_DEFAULT,
               CONCAT_WS(N' · ', fd.Ad, il.Ad, b.TelefonE164 COLLATE DATABASE_DEFAULT) COLLATE DATABASE_DEFAULT,
               u.EslesenAlan, u.Tam, b.OlusmaZamani,
               (N'SELECT * FROM gorunum.BayiKarti WHERE BayiKayitNo = ' + CAST(b.KayitNo AS nvarchar(20)) + N';') COLLATE DATABASE_DEFAULT
        FROM u
        JOIN bayi.Bayi AS b ON b.Kimlik = u.Kimlik
        LEFT JOIN kod.FirmaDurumu AS fd ON fd.Kod = b.DurumKodu
        LEFT JOIN cografya.Il AS il ON il.IlKodu = b.IlKodu
        WHERE u.TurKodu = N'bayi'
        UNION ALL
        /* personel */
        SELECT u.TurKodu, p.KayitNo,
               p.AdSoyad COLLATE DATABASE_DEFAULT,
               CONCAT_WS(N' · ', r.Ad, k.GirisAdi COLLATE DATABASE_DEFAULT,
                         CASE WHEN p.AyrilmaZamani IS NOT NULL
                              THEN N'ayrıldı' + N' '
                                   + CONVERT(nvarchar(10), CONVERT(date, p.AyrilmaZamani AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time'), 23) END) COLLATE DATABASE_DEFAULT,
               u.EslesenAlan, u.Tam, p.OlusmaZamani,
               (N'SELECT p.AdSoyad, k.GirisAdi, k.Aktif, p.AyrilmaZamani FROM personel.Personel p JOIN erisim.Kullanici k ON k.Kimlik = p.KullaniciKimlik WHERE p.KayitNo = '
                + CAST(p.KayitNo AS nvarchar(20)) + N';') COLLATE DATABASE_DEFAULT
        FROM u
        JOIN personel.Personel AS p ON p.Kimlik = u.Kimlik
        LEFT JOIN erisim.Kullanici AS k ON k.Kimlik = p.KullaniciKimlik
        LEFT JOIN erisim.Rol AS r ON r.Kimlik = p.RolKimlik
        WHERE u.TurKodu = N'personel'
        UNION ALL
        /* hesap (birleşmişse kalan hesap gösterilir ve açılır) */
        SELECT u.TurKodu, h.KayitNo,
               COALESCE(h.TelefonE164, kh.TelefonE164, CAST(h.KayitNo AS nvarchar(20))) COLLATE DATABASE_DEFAULT,
               CONCAT_WS(N' · ', hs.AdSoyad, h.DurumKodu COLLATE DATABASE_DEFAULT, il.Ad,
                         CASE WHEN kh.KayitNo IS NOT NULL
                              THEN N'hesap birleştirildi; kalan hesap numarası:' + N' ' + CAST(kh.KayitNo AS nvarchar(20)) END) COLLATE DATABASE_DEFAULT,
               u.EslesenAlan, u.Tam, h.OlusmaZamani,
               (CASE WHEN COALESCE(kh.TelefonE164, h.TelefonE164) IS NOT NULL
                     THEN N'EXEC yardim.MusteriGoster N''' + COALESCE(kh.TelefonE164, h.TelefonE164) + N''';'
                     ELSE N'SELECT * FROM gorunum.MusteriKarti WHERE HesapKayitNo = ' + CAST(COALESCE(kh.KayitNo, h.KayitNo) AS nvarchar(20)) + N';' END) COLLATE DATABASE_DEFAULT
        FROM u
        JOIN musteri.Hesap AS h ON h.Kimlik = u.Kimlik
        LEFT JOIN kalan AS ka ON ka.Baslangic = h.Kimlik AND ka.Sira = 1
        LEFT JOIN musteri.Hesap AS kh ON kh.Kimlik = ka.Hedef
        LEFT JOIN cografya.Il AS il ON il.IlKodu = h.IlKodu
        OUTER APPLY (SELECT TOP (1) NULLIF(LTRIM(RTRIM(CONCAT(k.Adi, N' ', k.Soyadi))), N'') AS AdSoyad
                     FROM musteri.HesapKisisi AS k
                     WHERE k.HesapKimlik = h.Kimlik AND k.RolKodu = N'hesapSahibi'
                     ORDER BY CASE WHEN k.PasifZamani IS NULL THEN 0 ELSE 1 END, k.OlusmaZamani DESC) AS hs
        WHERE u.TurKodu = N'hesap'
    )
    SELECT TOP (200) N'Arama sonuçları' AS Bolum,
           COALESCE(kt.Ad, s.TurKodu) AS KayitTuru,
           s.Gosterim, s.Ozet, s.EslesenAlan, s.Tam,
           CONVERT(datetime2(0), s.Zaman AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS ZamanTurkiye,
           s.KayitNo, s.SonrakiAdim,
           CAST(CASE WHEN COUNT(*) OVER () > 200 THEN 1 ELSE 0 END AS bit) AS DahaFazlaVar
    FROM satir AS s
    LEFT JOIN kod.KayitTuru AS kt ON kt.Kod = s.TurKodu
    ORDER BY s.Tam DESC, s.Zaman DESC, s.KayitNo DESC;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'Ara',
     @Metin = N'Ne yapar: ne aradığınızı bildiğiniz ama nerede olduğunu bilmediğiniz her değeri bütün kayıtlarda arar ve tek listede gösterir. Girdinin uyduğu bütün biçimler birlikte denenir: okunur numara (SRV/YPR/TKF/SPS talep, TEL numara değişikliği, GBD geri bildirim, HAK dönem dökümü; tireli ya da tiresiz), eski numara ve cihaz numarası (talep, servis, bayi, personel, hesap; SRV014 gibi kısa eski servis numarası dahil), seri numarası (tam, sonra baştan), LOGO cari kodu (servis, bayi, müşteri), telefon (hesabın güncel ve eski telefonu, hesaptaki kişiler, talepteki iletişim telefonu, numara değişikliğinin eski ve yeni telefonu, geri bildirim, personel; 0/+90/90/00 yazımları), telefonun ülke kodsuz hâli, giriş adı (personel ve servis; şifre yardım talebine yazılan dahil) ve aksansız ad parçası (kişi, talepteki ad, servis, bayi, personel). Kolonlar: KayitTuru (kod.KayitTuru adı), Gosterim (numara, seri, telefon ya da firma adı), Ozet (durum, ad, il; numara değişikliğinde karar, eski → yeni telefon, kanıt seri, karar veren; birleşmiş hesapta kalan hesabın numarası), EslesenAlan, Tam (1: değerin tamamı eşleşti), ZamanTurkiye (kaydın oluştuğu an), KayitNo, SonrakiAdim (kopyalayıp çalıştırılacak komut), DahaFazlaVar. Önce tam eşleşmeler, sonra yeniler; en çok 200 satır; aynı kayıt bir kez gelir. Ne yapmaz: hiçbir şeyi değiştirmez; birleşmiş hesabın satırında kendi değil kalan hesabın komutunu verir. Kod 3 karakterden, rakam 4 haneden ve ad 3 harften kısaysa 51105. Örnek: EXEC yardim.Ara N''SRV-26-00123''; EXEC yardim.Ara N''0532 123 45 67''; EXEC yardim.Ara N''isik makina'';';
EXEC dbo.AciklamaYaz @Sema = N'yardim', @Nesne = N'Ara', @Alt = N'@Metin', @AltTuru = N'PARAMETER',
     @Metin = N'Aranacak değer: numara, telefon, seri numarası, ad, giriş adı ya da cari kodu; her yazım kabul edilir.';
GO
