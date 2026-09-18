/* ==========================================================================
   R03 — alan şemalarındaki görünümler (Bölüm 3.3, 1.15.5, 1.9.6)

   Uygulama ve gorunum bu görünümleri okur; kuralın tek tanımı buradadır:
     gorunum.GecerliAyar           ayarın geçerli değeri (marka → şirket → genel)
     katalog.MarkaKurallari        marka kolonu → ayar düşme sırası
     makine.MakineGuncelSahibi     açık sahiplik
     makine.MakineninBayisi        satan bayi
     makine.MakineninServisi       müşterinin servisi (servisAtama.js)
     makine.MakineGarantisi        garanti dayanağı ve tarihleri
     kvkk.GuncelRiza               hesap × metin başına son rıza olayı
     talep.ZiyaretGuncelParcasi    ziyaretin düzeltme sonrası parça listesi

   Sıra bağımlılığı: GecerliAyar → MarkaKurallari → MakineninBayisi →
   MakineninServisi → MakineGarantisi.
   Sonunda GRANT SELECT ON gorunum.GecerliAyar TO rol_uygulama.
   Görünümlerde sabit Türkçe metin yok; kod değerleri İngilizce harfli.
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. gorunum.GecerliAyar
   Her anahtar için üç kapsamda satır: genel (SirketKodu ve MarkaKodu boş),
   her şirket (MarkaKodu boş), her marka (SirketKodu = markanın şirketi).
   Değer en dar kapsamdaki satırdan gelir; KapsamTuru nereden geldiğini söyler.
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW gorunum.GecerliAyar
AS
WITH anahtar AS (
    SELECT DISTINCT a.Anahtar
    FROM sistem.Ayar AS a
), kapsam AS (
    SELECT CAST(NULL AS nvarchar(20)) COLLATE Latin1_General_100_BIN2 AS SirketKodu,
           CAST(NULL AS nvarchar(20)) COLLATE Latin1_General_100_BIN2 AS MarkaKodu
    UNION ALL
    SELECT s.Kod, NULL
    FROM sirket.Sirket AS s
    UNION ALL
    SELECT m.SirketKodu, m.Kod
    FROM katalog.Marka AS m
)
SELECT a.Anahtar,
       k.SirketKodu,
       k.MarkaKodu,
       y.DegerTuru,
       y.Deger,
       y.KapsamTuru,
       y.Aciklama,
       y.KayitNo AS AyarKayitNo
FROM anahtar AS a
CROSS JOIN kapsam AS k
CROSS APPLY (
    SELECT TOP (1)
           x.DegerTuru,
           x.Deger,
           CAST(CASE WHEN x.MarkaKodu IS NOT NULL THEN N'marka'
                     WHEN x.SirketKodu IS NOT NULL THEN N'sirket'
                     ELSE N'genel' END AS nvarchar(10)) COLLATE Latin1_General_100_BIN2 AS KapsamTuru,
           x.Aciklama,
           x.KayitNo
    FROM sistem.Ayar AS x
    WHERE x.Anahtar = a.Anahtar
      AND (   (x.MarkaKodu IS NOT NULL AND x.MarkaKodu = k.MarkaKodu)
           OR (x.MarkaKodu IS NULL AND x.SirketKodu IS NOT NULL AND x.SirketKodu = k.SirketKodu)
           OR (x.MarkaKodu IS NULL AND x.SirketKodu IS NULL))
    ORDER BY CASE WHEN x.MarkaKodu IS NOT NULL THEN 1
                  WHEN x.SirketKodu IS NOT NULL THEN 2
                  ELSE 3 END
) AS y;
GO

EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'GecerliAyar',
     @Metin = N'Ayarların tek okuma yeri. Her anahtar için genel satır, her şirket için şirket satırı ve her marka için marka satırı verir; değer marka ayarından, yoksa markanın şirket ayarından, yoksa genel ayardan gelir. API, gorunum ve yonetim ayarı başka yoldan okumaz. Deger NULL ise karar bekleniyor demektir; okuyan işlem hata vermelidir. Örnek: SELECT Deger FROM gorunum.GecerliAyar WHERE Anahtar = N''TalepGecikmeSaati'' AND MarkaKodu = N''paksan'';';
EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'GecerliAyar', @Alt = N'Anahtar',     @Metin = N'Ayarın adı (sistem.Ayar.Anahtar), birimini söyler: TalepGecikmeSaati, TeklifBeklemeGunu.';
EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'GecerliAyar', @Alt = N'SirketKodu',  @Metin = N'Şirket satırında şirket; marka satırında markanın şirketi; genel satırda boş.';
EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'GecerliAyar', @Alt = N'MarkaKodu',   @Metin = N'Marka satırında marka; genel ve şirket satırında boş. Markanın geçerli değeri için bu kolonla süzün.';
EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'GecerliAyar', @Alt = N'DegerTuru',   @Metin = N'Değerin türü: tamsayi, ondalik, metin, mantiksal, json.';
EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'GecerliAyar', @Alt = N'Deger',       @Metin = N'Geçerli değer, metin olarak. NULL: karar bekleniyor.';
EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'GecerliAyar', @Alt = N'KapsamTuru',  @Metin = N'Değerin geldiği satırın kapsamı: genel, sirket ya da marka.';
EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'GecerliAyar', @Alt = N'Aciklama',    @Metin = N'Değerin geldiği ayar satırının açıklaması (ne işe yaradığı, birimi, eski kod sabiti).';
EXEC dbo.AciklamaYaz @Sema = N'gorunum', @Nesne = N'GecerliAyar', @Alt = N'AyarKayitNo', @Metin = N'Değerin geldiği sistem.Ayar satırının KayitNo''su; yonetim.AyarDegistir ve geçmiş sorguları için.';
GO

/* --------------------------------------------------------------------------
   2. katalog.MarkaKurallari
   Marka kolonu boşsa geçerli ayar (Bölüm 1.15.5). Ayar gorunum.GecerliAyar
   üzerinden okunur; o görünüm markaya özgü ayar satırını da hesaba katar.
   Her anahtar ayrı alt sorguyla okunur: MAX(CASE …) ile toplamak, boş
   değerli ayarda okuyan her oturuma "Null value is eliminated" uyarısı
   gönderiyordu. GecerliAyar'da marka başına anahtar tektir.
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW katalog.MarkaKurallari
AS
SELECT m.Kod AS MarkaKodu,
       m.SirketKodu,
       COALESCE(m.GarantiYil,
                TRY_CONVERT(tinyint, (SELECT g.Deger FROM gorunum.GecerliAyar AS g
                                      WHERE g.MarkaKodu = m.Kod AND g.Anahtar = N'GarantiYili'))) AS GarantiYil,
       CAST(COALESCE(m.GarantiBaslangicEsasiKodu,
                     (SELECT g.Deger FROM gorunum.GecerliAyar AS g
                      WHERE g.MarkaKodu = m.Kod AND g.Anahtar = N'GarantiBaslangicEsasi')) AS nvarchar(40)) COLLATE Latin1_General_100_BIN2 AS GarantiBaslangicEsasiKodu,
       COALESCE(m.GarantiFaturaEkGun,
                TRY_CONVERT(smallint, (SELECT g.Deger FROM gorunum.GecerliAyar AS g
                                       WHERE g.MarkaKodu = m.Kod AND g.Anahtar = N'GarantiFaturaEkGunu'))) AS GarantiFaturaEkGun,
       COALESCE(m.ServisIskontoOrani,
                TRY_CONVERT(decimal(7, 4), (SELECT g.Deger FROM gorunum.GecerliAyar AS g
                                            WHERE g.MarkaKodu = m.Kod AND g.Anahtar = N'ServisParcaIskontoOrani'))) AS ServisIskontoOrani,
       CAST(COALESCE(m.ParaBirimiKodu,
                     (SELECT g.Deger FROM gorunum.GecerliAyar AS g
                      WHERE g.MarkaKodu = m.Kod AND g.Anahtar = N'ParaBirimi')) AS nvarchar(3)) COLLATE Latin1_General_100_BIN2 AS ParaBirimiKodu,
       COALESCE(m.KdvOrani,
                TRY_CONVERT(decimal(7, 4), (SELECT g.Deger FROM gorunum.GecerliAyar AS g
                                            WHERE g.MarkaKodu = m.Kod AND g.Anahtar = N'KdvOrani'))) AS KdvOrani
FROM katalog.Marka AS m;
GO

EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'MarkaKurallari',
     @Metin = N'Markanın garanti, iskonto, para birimi ve KDV kurallarının geçerli değeri. Marka kolonu boşsa gorunum.GecerliAyar''dan (marka → şirket → genel) düşer; ayar anahtarları GarantiYili, GarantiBaslangicEsasi, GarantiFaturaEkGunu, ServisParcaIskontoOrani, ParaBirimi, KdvOrani. makine.MakineSatisi yazılırken garanti değerleri buradan kopyalanır.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'MarkaKurallari', @Alt = N'MarkaKodu',                 @Metin = N'Marka kodu (katalog.Marka.Kod).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'MarkaKurallari', @Alt = N'SirketKodu',                @Metin = N'Markanın bugünkü şirketi.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'MarkaKurallari', @Alt = N'GarantiYil',                @Metin = N'Garanti süresi, yıl.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'MarkaKurallari', @Alt = N'GarantiBaslangicEsasiKodu', @Metin = N'Garantinin başlangıç esası (kod.GarantiBaslangicEsasi).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'MarkaKurallari', @Alt = N'GarantiFaturaEkGun',        @Metin = N'Teslim belgesi yoksa bayi fatura tarihine eklenen gün; NULL ise fatura yolu kullanılmaz.';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'MarkaKurallari', @Alt = N'ServisIskontoOrani',        @Metin = N'Servise parça satışında uygulanan indirim oranı (0,3 = %30).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'MarkaKurallari', @Alt = N'ParaBirimiKodu',            @Metin = N'Markanın para birimi (kod.ParaBirimi).';
EXEC dbo.AciklamaYaz @Sema = N'katalog', @Nesne = N'MarkaKurallari', @Alt = N'KdvOrani',                  @Metin = N'Markanın KDV oranı (0,2 = %20).';
GO

/* --------------------------------------------------------------------------
   3. makine.MakineGuncelSahibi — açık sahiplik (makine başına en çok bir;
   UX_makine_MakineSahipligi_AcikSahiplik).
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW makine.MakineGuncelSahibi
AS
SELECT s.MakineKimlik,
       s.HesapKimlik,
       s.TakmaAd,
       s.BaslangicZamani
FROM makine.MakineSahipligi AS s
WHERE s.BitisZamani IS NULL;
GO

EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineGuncelSahibi',
     @Metin = N'Makinenin bugünkü sahibi: bitmemiş sahiplik satırı. Sahibi olmayan makine bu görünümde yoktur.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineGuncelSahibi', @Alt = N'MakineKimlik',    @Metin = N'makine.Makine kimliği.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineGuncelSahibi', @Alt = N'HesapKimlik',     @Metin = N'Sahip müşteri hesabı (musteri.Hesap).';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineGuncelSahibi', @Alt = N'TakmaAd',         @Metin = N'Müşterinin makineye verdiği ad.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineGuncelSahibi', @Alt = N'BaslangicZamani', @Metin = N'Sahipliğin başladığı an (UTC).';
GO

/* --------------------------------------------------------------------------
   4. makine.MakineninBayisi — satan bayinin tek tanımı.
   İptal edilmemiş, reddedilmemiş ve bayisi olan satışlar içinde en son
   eklenen. Doğrulama durumu (bekliyor dahil) zinciri etkilemez.
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW makine.MakineninBayisi
AS
WITH satis AS (
    SELECT ms.MakineKimlik,
           COALESCE(ms.AliciBayiKimlik, ms.SaticiBayiKimlik) AS BayiKimlik,
           ms.Kimlik AS MakineSatisiKimlik,
           ms.SatisTuruKodu,
           ms.FaturaTarihi,
           ROW_NUMBER() OVER (PARTITION BY ms.MakineKimlik
                              ORDER BY ms.OlusmaZamani DESC, ms.KayitNo DESC) AS Sira
    FROM makine.MakineSatisi AS ms
    WHERE ms.IptalZamani IS NULL
      AND ms.DogrulamaDurumuKodu <> N'reddedildi'
      AND COALESCE(ms.AliciBayiKimlik, ms.SaticiBayiKimlik) IS NOT NULL
)
SELECT MakineKimlik,
       BayiKimlik,
       MakineSatisiKimlik,
       SatisTuruKodu,
       FaturaTarihi
FROM satis
WHERE Sira = 1;
GO

EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineninBayisi',
     @Metin = N'Makineyi satan bayinin tek tanımı. İptal edilmemiş, reddedilmemiş ve bayisi olan satışlar içinde en son eklenen satış esastır; bayi PAKSAN''dan bayiye satışta alıcı bayi, bayiden çiftçiye satışta satıcı bayidir. Doğrulama durumu (bekliyor dahil) bayi zincirini etkilemez; yalnız garantiyi etkiler. Bayisi bilinmeyen makine bu görünümde yoktur.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineninBayisi', @Alt = N'MakineKimlik',       @Metin = N'makine.Makine kimliği.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineninBayisi', @Alt = N'BayiKimlik',         @Metin = N'Satan bayi (bayi.Bayi): alıcı bayi, yoksa satıcı bayi.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineninBayisi', @Alt = N'MakineSatisiKimlik', @Metin = N'Esas alınan makine.MakineSatisi satırı.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineninBayisi', @Alt = N'SatisTuruKodu',      @Metin = N'Satış türü (kod.SatisTuru): paksanBayiye, bayiCiftciye …';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineninBayisi', @Alt = N'FaturaTarihi',       @Metin = N'Satışın fatura tarihi (Türkiye günü); personel girişinde boş olabilir.';
GO

/* --------------------------------------------------------------------------
   5. makine.MakineninServisi — müşterinin servisinin tek kaynağı
   (src/lib/servisAtama.js). Coğrafyaya bakılmaz.
   (1) açık makine ataması; servis aktif ve markada etkin yetkili
   (2) değilse satan bayinin bağlı servisleri, Oncelik artan; servis aktif,
       servis ve bayi makinenin markasında etkin yetkili
   (3) değilse boş
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW makine.MakineninServisi
AS
SELECT m.Kimlik AS MakineKimlik,
       COALESCE(atama.ServisKimlik, bayiServisi.ServisKimlik) AS ServisKimlik,
       CAST(CASE WHEN atama.ServisKimlik IS NOT NULL THEN N'makineAtamasi'
                 WHEN bayiServisi.ServisKimlik IS NOT NULL THEN N'bayiServisi'
            END AS nvarchar(40)) COLLATE Latin1_General_100_BIN2 AS ServisKaynagiKodu
FROM makine.Makine AS m
OUTER APPLY (
    SELECT TOP (1) a.ServisKimlik
    FROM makine.MakineServisAtamasi AS a
    JOIN servis.Servis AS s
      ON s.Kimlik = a.ServisKimlik
     AND s.DurumKodu = N'aktif'
    JOIN servis.MarkaYetkisi AS y
      ON y.ServisKimlik = a.ServisKimlik
     AND y.MarkaKodu = m.MarkaKodu
     AND y.Etkin = 1
    WHERE a.MakineKimlik = m.Kimlik
      AND a.BitisZamani IS NULL
    ORDER BY a.BaslangicZamani DESC, a.KayitNo DESC
) AS atama
OUTER APPLY (
    SELECT TOP (1) bb.ServisKimlik
    FROM makine.MakineninBayisi AS mb
    JOIN bayi.MarkaYetkisi AS by2
      ON by2.BayiKimlik = mb.BayiKimlik
     AND by2.MarkaKodu = m.MarkaKodu
     AND by2.Etkin = 1
    JOIN servis.BayiBagi AS bb
      ON bb.BayiKimlik = mb.BayiKimlik
    JOIN servis.Servis AS s
      ON s.Kimlik = bb.ServisKimlik
     AND s.DurumKodu = N'aktif'
    JOIN servis.MarkaYetkisi AS sy
      ON sy.ServisKimlik = bb.ServisKimlik
     AND sy.MarkaKodu = m.MarkaKodu
     AND sy.Etkin = 1
    WHERE mb.MakineKimlik = m.Kimlik
      AND atama.ServisKimlik IS NULL
    ORDER BY bb.Oncelik, bb.BaslangicZamani, s.KayitNo
) AS bayiServisi;
GO

EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineninServisi',
     @Metin = N'Müşterinin servisinin tek kaynağı (servisAtama.js ile aynı zincir). Önce makineye açık atanmış servis (servis aktif ve makinenin markasında etkin yetkili); yoksa makineyi satan bayinin bağlı servisleri öncelik sırasıyla (servis aktif, servis ve bayi makinenin markasında etkin yetkili); yoksa ServisKimlik boş. Coğrafyaya bakılmaz. Her makine için bir satır; servisi boş olan makinede müşteri servis talebi açamaz.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineninServisi', @Alt = N'MakineKimlik',      @Metin = N'makine.Makine kimliği.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineninServisi', @Alt = N'ServisKimlik',      @Metin = N'Makinenin servisi (servis.Servis); zincir boşsa NULL.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineninServisi', @Alt = N'ServisKaynagiKodu', @Metin = N'Servisin nereden geldiği: makineAtamasi (makineye doğrudan atama), bayiServisi (satan bayinin bağlı servisi); servis yoksa NULL.';
GO

/* --------------------------------------------------------------------------
   6. makine.MakineGarantisi (Bölüm 1.9.6)
   Esas satış: iptal edilmemiş, reddedilmemiş ve teslim ya da fatura tarihi
   olan satışlar içinde fatura tarihi (yoksa teslim tarihi) en eski olan ilk
   satış. Süre, başlangıç esası ve ek gün satış satırından; boşsa
   katalog.MarkaKurallari.
   Başlangıç esası teslim (ve boş ya da bilinmeyen esas):
     (1) onaylı ve teslim tarihli → teslimOnayli
     (2) fatura tarihi ve ek gün var → faturaArtiSure (doğrulanmadı)
     (3) seriden üretim yılı var → uretimYili (yılın 1 Ocak'ı; bitiş
         yil + GarantiYil yılının 31 Aralık'ı)
     (4) bilinmiyor
   Başlangıç esası fatura: fatura tarihi varsa (2), ek gün boşsa 0 gün;
     yoksa (3), (4).
   Başlangıç esası uretim: (3), (4).
   9000 yılından sonraki tarihlerde hesap yapılmaz (bozuk bir satır bütün
   okuyanları taşma hatasıyla durdurmasın).
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW makine.MakineGarantisi
AS
WITH esasSatis AS (
    SELECT ms.MakineKimlik,
           ms.FaturaTarihi,
           ms.TeslimTarihi,
           ms.DogrulamaDurumuKodu,
           ms.GarantiYil,
           ms.GarantiBaslangicEsasiKodu,
           ms.GarantiFaturaEkGun,
           ROW_NUMBER() OVER (PARTITION BY ms.MakineKimlik
                              ORDER BY COALESCE(ms.FaturaTarihi, ms.TeslimTarihi), ms.OlusmaZamani, ms.KayitNo) AS Sira
    FROM makine.MakineSatisi AS ms
    WHERE ms.IptalZamani IS NULL
      AND ms.DogrulamaDurumuKodu <> N'reddedildi'
      AND COALESCE(ms.TeslimTarihi, ms.FaturaTarihi) IS NOT NULL
), girdi AS (
    SELECT m.Kimlik AS MakineKimlik,
           m.SeridenUretimYili,
           es.FaturaTarihi,
           es.TeslimTarihi,
           es.DogrulamaDurumuKodu,
           COALESCE(es.GarantiYil, mk.GarantiYil) AS GarantiYil,
           COALESCE(es.GarantiBaslangicEsasiKodu, mk.GarantiBaslangicEsasiKodu) AS EsasKodu,
           COALESCE(es.GarantiFaturaEkGun, mk.GarantiFaturaEkGun) AS EkGun
    FROM makine.Makine AS m
    LEFT JOIN esasSatis AS es
      ON es.MakineKimlik = m.Kimlik
     AND es.Sira = 1
    LEFT JOIN katalog.MarkaKurallari AS mk
      ON mk.MarkaKodu = m.MarkaKodu
), dayanak AS (
    SELECT g.MakineKimlik,
           g.SeridenUretimYili,
           g.FaturaTarihi,
           g.TeslimTarihi,
           g.GarantiYil,
           CASE WHEN g.EsasKodu = N'fatura' THEN ISNULL(g.EkGun, 0) ELSE g.EkGun END AS EkGun,
           CASE
                WHEN g.EsasKodu = N'uretim'
                    THEN CASE WHEN g.SeridenUretimYili IS NOT NULL THEN 3 ELSE 4 END
                WHEN g.EsasKodu = N'fatura'
                    THEN CASE WHEN g.FaturaTarihi IS NOT NULL AND g.FaturaTarihi < DATEFROMPARTS(9000, 1, 1) THEN 2
                              WHEN g.SeridenUretimYili IS NOT NULL THEN 3
                              ELSE 4 END
                WHEN g.DogrulamaDurumuKodu = N'onaylandi' AND g.TeslimTarihi IS NOT NULL
                     AND g.TeslimTarihi < DATEFROMPARTS(9000, 1, 1) THEN 1
                WHEN g.FaturaTarihi IS NOT NULL AND g.EkGun IS NOT NULL
                     AND g.FaturaTarihi < DATEFROMPARTS(9000, 1, 1) THEN 2
                WHEN g.SeridenUretimYili IS NOT NULL THEN 3
                ELSE 4
           END AS Adim
    FROM girdi AS g
), baslangic AS (
    SELECT d.MakineKimlik,
           d.SeridenUretimYili,
           d.GarantiYil,
           d.Adim,
           CASE d.Adim
                WHEN 1 THEN d.TeslimTarihi
                WHEN 2 THEN DATEADD(day, d.EkGun, d.FaturaTarihi)
                WHEN 3 THEN DATEFROMPARTS(d.SeridenUretimYili, 1, 1)
           END AS BaslangicTarihi
    FROM dayanak AS d
)
SELECT b.MakineKimlik,
       CAST(CASE b.Adim WHEN 1 THEN N'teslimOnayli'
                        WHEN 2 THEN N'faturaArtiSure'
                        WHEN 3 THEN N'uretimYili'
                        ELSE N'bilinmiyor' END AS nvarchar(40)) COLLATE Latin1_General_100_BIN2 AS GarantiDayanagiKodu,
       b.BaslangicTarihi,
       CASE WHEN b.Adim IN (1, 2) AND b.GarantiYil IS NOT NULL AND b.BaslangicTarihi < DATEFROMPARTS(9000, 1, 1)
                THEN DATEADD(day, -1, DATEADD(year, b.GarantiYil, b.BaslangicTarihi))
            WHEN b.Adim = 3 AND b.GarantiYil IS NOT NULL AND b.SeridenUretimYili + b.GarantiYil <= 9999
                THEN DATEFROMPARTS(b.SeridenUretimYili + b.GarantiYil, 12, 31)
       END AS BitisTarihi,
       CAST(CASE WHEN b.Adim = 1 THEN 1 ELSE 0 END AS bit) AS Dogrulandi
FROM baslangic AS b;
GO

EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineGarantisi',
     @Metin = N'Makinenin garanti dayanağı ve tarihleri (her makine için bir satır). Esas satış: iptal edilmemiş, reddedilmemiş, teslim ya da fatura tarihi olan satışlar içinde en eski fatura tarihli (yoksa teslim tarihli) ilk satış. Garanti yılı, başlangıç esası ve fatura ek günü o satıştan, boşsa katalog.MarkaKurallari''ndan okunur. Esas teslim (varsayılan) iken sıra: onaylı teslim → fatura + ek gün (doğrulanmamış) → seriden üretim yılı (yıl sonuna kadar) → bilinmiyor. Esas fatura iken fatura tarihi (+ varsa ek gün) → üretim yılı → bilinmiyor; esas uretim iken üretim yılı → bilinmiyor. Doğrulama durumu yalnız garantiyi etkiler, servis zincirini etkilemez. Garantide olup olmadığı gorunum.MakineKarti''nda Türkiye bugünüyle hesaplanır.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineGarantisi', @Alt = N'MakineKimlik',        @Metin = N'makine.Makine kimliği.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineGarantisi', @Alt = N'GarantiDayanagiKodu', @Metin = N'Tarihlerin dayanağı (kod.GarantiDayanagi): teslimOnayli, faturaArtiSure, uretimYili, bilinmiyor.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineGarantisi', @Alt = N'BaslangicTarihi',     @Metin = N'Garantinin başladığı gün (Türkiye günü); bilinmiyorsa NULL.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineGarantisi', @Alt = N'BitisTarihi',         @Metin = N'Garantinin son günü (dahil); garanti yılı ya da başlangıç bilinmiyorsa NULL.';
EXEC dbo.AciklamaYaz @Sema = N'makine', @Nesne = N'MakineGarantisi', @Alt = N'Dogrulandi',          @Metin = N'1: PAKSAN''ın onayladığı teslim tarihine dayanıyor; 0: tahmin ya da bilinmiyor.';
GO

/* --------------------------------------------------------------------------
   7. kvkk.GuncelRiza — hesap × metin başına en son rıza olayı.
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW kvkk.GuncelRiza
AS
WITH olay AS (
    SELECT r.HesapKimlik,
           r.MetinKodu,
           r.SecimKodu,
           r.Surum,
           r.DilKodu,
           r.OlusmaZamani,
           ROW_NUMBER() OVER (PARTITION BY r.HesapKimlik, r.MetinKodu
                              ORDER BY r.OlusmaZamani DESC, r.KayitNo DESC) AS Sira
    FROM kvkk.RizaOlayi AS r
)
SELECT HesapKimlik,
       MetinKodu,
       SecimKodu,
       Surum,
       DilKodu,
       OlusmaZamani AS OlayZamani
FROM olay
WHERE Sira = 1;
GO

EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'GuncelRiza',
     @Metin = N'Her hesap ve rıza metni için en son rıza olayı: müşterinin o metinde bugün geçerli seçimi. Olaylar silinmez; geçmişin tamamı kvkk.RizaOlayi''ndadır.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'GuncelRiza', @Alt = N'HesapKimlik', @Metin = N'Müşteri hesabı (musteri.Hesap).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'GuncelRiza', @Alt = N'MetinKodu',   @Metin = N'Rıza metni (kod.RizaMetni).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'GuncelRiza', @Alt = N'SecimKodu',   @Metin = N'Son seçim (kod.RizaSecimi).';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'GuncelRiza', @Alt = N'Surum',       @Metin = N'Seçimin yapıldığı metin sürümü.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'GuncelRiza', @Alt = N'DilKodu',     @Metin = N'Seçimin yapıldığı metnin dili.';
EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'GuncelRiza', @Alt = N'OlayZamani',  @Metin = N'Son olayın sunucuya ulaştığı an (UTC; kvkk.RizaOlayi.OlusmaZamani).';
GO

/* --------------------------------------------------------------------------
   8. talep.ZiyaretGuncelParcasi — ziyaretin parça listesi.
   Düzeltme varsa en son düzeltmenin (en büyük KayitNo) 'yeni' tarafı
   (sıfır satır olabilir); yoksa servisin gönderdiği satırlar.
   -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW talep.ZiyaretGuncelParcasi
AS
WITH sonDuzeltme AS (
    SELECT d.ZiyaretKimlik,
           d.Kimlik AS DuzeltmeKimlik,
           ROW_NUMBER() OVER (PARTITION BY d.ZiyaretKimlik ORDER BY d.KayitNo DESC) AS Sira
    FROM talep.ZiyaretDuzeltmesi AS d
)
SELECT sd.ZiyaretKimlik,
       p.SiraNo,
       p.MarkaKodu,
       p.ParcaKodu,
       p.ParcaAdi,
       p.Adet,
       p.BirimFiyat,
       CAST(N'duzeltme' AS nvarchar(10)) COLLATE Latin1_General_100_BIN2 AS Kaynak
FROM sonDuzeltme AS sd
JOIN talep.ZiyaretDuzeltmesiParcasi AS p
  ON p.DuzeltmeKimlik = sd.DuzeltmeKimlik
 AND p.TarafKodu = N'yeni'
WHERE sd.Sira = 1
UNION ALL
SELECT s.ZiyaretKimlik,
       s.SiraNo,
       s.MarkaKodu,
       s.ParcaKodu,
       s.ParcaAdi,
       s.Adet,
       s.BirimFiyat,
       CAST(N'servis' AS nvarchar(10)) COLLATE Latin1_General_100_BIN2 AS Kaynak
FROM talep.ZiyaretParcaSatiri AS s
WHERE NOT EXISTS (SELECT 1 FROM talep.ZiyaretDuzeltmesi AS d WHERE d.ZiyaretKimlik = s.ZiyaretKimlik);
GO

EXEC dbo.AciklamaYaz @Sema = N'talep', @Nesne = N'ZiyaretGuncelParcasi',
     @Metin = N'Servis ziyaretinin geçerli parça listesi. Ziyarette PAKSAN düzeltmesi varsa en son düzeltmenin yeni tarafı (çıkarılan parça yer almaz, liste boş olabilir); yoksa servisin gönderdiği satırlar. Servisin özgün listesi talep.ZiyaretParcaSatiri''nda değişmeden durur. API (Servisim, backoffice, Connect cozum.parcalar), gorunum, yardim ve raporlar ziyaret parça listesini yalnız buradan okur.';
EXEC dbo.AciklamaYaz @Sema = N'talep', @Nesne = N'ZiyaretGuncelParcasi', @Alt = N'ZiyaretKimlik', @Metin = N'talep.ServisZiyareti kimliği.';
EXEC dbo.AciklamaYaz @Sema = N'talep', @Nesne = N'ZiyaretGuncelParcasi', @Alt = N'SiraNo',        @Metin = N'Parçanın listedeki sırası.';
EXEC dbo.AciklamaYaz @Sema = N'talep', @Nesne = N'ZiyaretGuncelParcasi', @Alt = N'MarkaKodu',     @Metin = N'Ziyaretin markası.';
EXEC dbo.AciklamaYaz @Sema = N'talep', @Nesne = N'ZiyaretGuncelParcasi', @Alt = N'ParcaKodu',     @Metin = N'Katalog parça kodu; katalog dışı parçada NULL.';
EXEC dbo.AciklamaYaz @Sema = N'talep', @Nesne = N'ZiyaretGuncelParcasi', @Alt = N'ParcaAdi',      @Metin = N'Parçanın adı (kayıt anındaki).';
EXEC dbo.AciklamaYaz @Sema = N'talep', @Nesne = N'ZiyaretGuncelParcasi', @Alt = N'Adet',          @Metin = N'Kullanılan adet (sıfırdan büyük).';
EXEC dbo.AciklamaYaz @Sema = N'talep', @Nesne = N'ZiyaretGuncelParcasi', @Alt = N'BirimFiyat',    @Metin = N'Birim fiyat; bilinmiyorsa NULL.';
EXEC dbo.AciklamaYaz @Sema = N'talep', @Nesne = N'ZiyaretGuncelParcasi', @Alt = N'Kaynak',        @Metin = N'Satırın geldiği yer: servis (servisin gönderdiği liste) ya da duzeltme (PAKSAN düzeltmesi).';
GO

/* --------------------------------------------------------------------------
   İzin (Bölüm 4.2): uygulama rolü gorunum şemasında yalnız bunu okur.
   Öteki görünümler alan şemalarında; şema düzeyindeki SELECT kapsar.
   -------------------------------------------------------------------------- */
GRANT SELECT ON OBJECT::gorunum.GecerliAyar TO rol_uygulama;
GO
