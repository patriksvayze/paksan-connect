-- ÜRETİLDİ, elle düzenlemeyin
/* ==========================================================================
   T05 — katalog: marka, kategori, bakım, ürün ve uyduları, belirti kapsamı

   Üreten: tools/vt/tohum-uret.mjs (npm run vt -- tohum). Bu dosyayı elle
   düzenlemeyin: kaynak değişince yeniden üretilir ve el değişikliği
   kaybolur. Kaynağı değiştirin, sonra "npm run vt -- tohum" çalıştırın.

   1 marka (paksan), 7 kategori, 4 bakım şablonu, 15 bakım adımı,
   20 ürün, 50 varyant, 86 özellik, 31 video, 83 belirti bağı.

   Kaynak: src/data (kimlik.js, katalog/products.js + .en.js, katalog/para.js,
   katalog/makineFiyat.js, icerik/teknikOzellikler.js, icerik/teknikSozluk.js,
   icerik/kilavuzEslesme.js, icerik/mobile_support_package.json), src/lib/serial.js,
   src/data/talepAlanlari.js; tohum/kaynak/markalar.json. Tasarım: tasarim.md 5.2 T05.

   Marka kapsamlı tablolarda hedef kaynaktaki markalarla sınırlıdır; o markada
   kaynakta olmayan ürün, varyant, özellik ve video Aktif = 0 olur. Veriyle
   eklenen başka markanın satırlarına dokunulmaz. Kategori ve bakım şablonu
   markasızdır: kaynakta olmayan satıra dokunulmaz.

   Araç betiği tek işlemde, sahip girişiyle çalıştırır (BEGIN/COMMIT
   burada yazılmaz). İkinci çalıştırmada hiçbir satır değişmez.
   ========================================================================== */

/* katalog.Marka — 1 satır; Okunus, GarantiFaturaEkGun, AsinmaAnahtari, AmblemYolu, ParcaKatalogYolu kaynakta yok; tohum dokunmaz */

WITH hedef AS (SELECT * FROM katalog.Marka WHERE Kod IN (N'paksan'))
MERGE hedef AS h
USING (
    SELECT CONVERT(nvarchar(20), v.Kod) AS Kod,
           CONVERT(nvarchar(100), v.Ad) AS Ad,
           CONVERT(tinyint, v.GarantiYil) AS GarantiYil,
           CONVERT(decimal(7,4), v.ServisIskontoOrani) AS ServisIskontoOrani,
           CONVERT(decimal(7,4), v.KdvOrani) AS KdvOrani,
           CONVERT(nvarchar(20), v.KilavuzDilleri) AS KilavuzDilleri,
           CONVERT(nvarchar(260), v.GorselYolu) AS GorselYolu,
           CONVERT(nvarchar(200), v.SiteUrl) AS SiteUrl,
           CONVERT(nvarchar(100), v.SiteMetni) AS SiteMetni,
           CONVERT(nvarchar(1000), v.KaynakNotu) AS KaynakNotu,
           CONVERT(nvarchar(20), v.SirketKodu) AS SirketKodu,
           CONVERT(nvarchar(40), v.GarantiBaslangicEsasiKodu) AS GarantiBaslangicEsasiKodu,
           CONVERT(nvarchar(40), v.SeriKuraliKodu) AS SeriKuraliKodu,
           CONVERT(nvarchar(3), v.ParaBirimiKodu) AS ParaBirimiKodu,
           CONVERT(nvarchar(60), v.KilavuzPaketiKodu) AS KilavuzPaketiKodu,
           CONVERT(bit, v.Aktif) AS Aktif
    FROM (VALUES
        (N'paksan', N'PAKSAN', 2, 0.3, 0.2, N'tr,en', N'src/assets/logo/paksan-logo.png', N'https://www.paksanmakina.com.tr', N'paksanmakina.com.tr', N'Garanti yılı: src/data/kimlik.js SIRKET.garantiYil ve src/lib/serial.js GARANTI_YIL. İskonto: src/data/katalog/makineFiyat.js PARCA_SERVIS_ISKONTO. KDV ve para birimi: src/data/katalog/para.js (fiyat listesinin KDV esası doğrulanmadı). Seri kuralı: tohum/kaynak/markalar.json.', N'paksan', NULL, N'onekYilSira', N'TRY', N'PAKSAN_MOBILE_SUPPORT', 1)
    ) AS v (Kod, Ad, GarantiYil, ServisIskontoOrani, KdvOrani, KilavuzDilleri, GorselYolu, SiteUrl, SiteMetni, KaynakNotu, SirketKodu, GarantiBaslangicEsasiKodu, SeriKuraliKodu, ParaBirimiKodu, KilavuzPaketiKodu, Aktif)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.GarantiYil, k.ServisIskontoOrani, k.KdvOrani, k.KilavuzDilleri COLLATE Latin1_General_100_BIN2, k.GorselYolu COLLATE Latin1_General_100_BIN2, k.SiteUrl COLLATE Latin1_General_100_BIN2, k.SiteMetni COLLATE Latin1_General_100_BIN2, k.KaynakNotu COLLATE Latin1_General_100_BIN2, k.SirketKodu COLLATE Latin1_General_100_BIN2, k.GarantiBaslangicEsasiKodu COLLATE Latin1_General_100_BIN2, k.SeriKuraliKodu COLLATE Latin1_General_100_BIN2, k.ParaBirimiKodu COLLATE Latin1_General_100_BIN2, k.KilavuzPaketiKodu COLLATE Latin1_General_100_BIN2, k.Aktif EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.GarantiYil, h.ServisIskontoOrani, h.KdvOrani, h.KilavuzDilleri COLLATE Latin1_General_100_BIN2, h.GorselYolu COLLATE Latin1_General_100_BIN2, h.SiteUrl COLLATE Latin1_General_100_BIN2, h.SiteMetni COLLATE Latin1_General_100_BIN2, h.KaynakNotu COLLATE Latin1_General_100_BIN2, h.SirketKodu COLLATE Latin1_General_100_BIN2, h.GarantiBaslangicEsasiKodu COLLATE Latin1_General_100_BIN2, h.SeriKuraliKodu COLLATE Latin1_General_100_BIN2, h.ParaBirimiKodu COLLATE Latin1_General_100_BIN2, h.KilavuzPaketiKodu COLLATE Latin1_General_100_BIN2, h.Aktif) THEN
    UPDATE SET Ad = k.Ad, GarantiYil = k.GarantiYil, ServisIskontoOrani = k.ServisIskontoOrani, KdvOrani = k.KdvOrani, KilavuzDilleri = k.KilavuzDilleri, GorselYolu = k.GorselYolu, SiteUrl = k.SiteUrl, SiteMetni = k.SiteMetni, KaynakNotu = k.KaynakNotu, SirketKodu = k.SirketKodu, GarantiBaslangicEsasiKodu = k.GarantiBaslangicEsasiKodu, SeriKuraliKodu = k.SeriKuraliKodu, ParaBirimiKodu = k.ParaBirimiKodu, KilavuzPaketiKodu = k.KilavuzPaketiKodu, Aktif = k.Aktif
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, GarantiYil, ServisIskontoOrani, KdvOrani, KilavuzDilleri, GorselYolu, SiteUrl, SiteMetni, KaynakNotu, SirketKodu, GarantiBaslangicEsasiKodu, SeriKuraliKodu, ParaBirimiKodu, KilavuzPaketiKodu, Aktif)
    VALUES (k.Kod, k.Ad, k.GarantiYil, k.ServisIskontoOrani, k.KdvOrani, k.KilavuzDilleri, k.GorselYolu, k.SiteUrl, k.SiteMetni, k.KaynakNotu, k.SirketKodu, k.GarantiBaslangicEsasiKodu, k.SeriKuraliKodu, k.ParaBirimiKodu, k.KilavuzPaketiKodu, k.Aktif);

/* katalog.Kategori — 7 satır; markasız; kaynakta olmayan satıra dokunulmaz */

MERGE katalog.Kategori AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(100), v.Ad) AS Ad,
           CONVERT(nvarchar(50), v.KisaAd) AS KisaAd,
           CONVERT(nvarchar(40), v.Ikon) AS Ikon,
           CONVERT(smallint, v.Sira) AS Sira,
           CONVERT(nvarchar(40), v.DestekAilesiKodu) AS DestekAilesiKodu
    FROM (VALUES
        (N'buyuk-balya', N'Büyük Balya Makineleri', N'Büyük Balya', N'bale', 1, N'balya'),
        (N'cayir-ot', N'Çayır Biçme ve Ot Toplama', N'Çayır & Ot', N'grass', 6, N'cayir'),
        (N'kucuk-balya', N'Küçük Balya Makineleri', N'Küçük Balya', N'bale', 2, N'balya'),
        (N'rulo-balya', N'Rulo Balya Makineleri', N'Rulo Balya', N'roll', 3, N'rulo'),
        (N'silaj', N'Silaj Ekipmanları', N'Silaj', N'silage', 5, N'silaj'),
        (N'toprak', N'Toprak İşleme', N'Toprak İşleme', N'soil', 7, N'toprak'),
        (N'yem-karma', N'Yem Karma Makineleri', N'Yem Karma', N'mixer', 4, N'yem')
    ) AS v (Kod, Ad, KisaAd, Ikon, Sira, DestekAilesiKodu)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.KisaAd COLLATE Latin1_General_100_BIN2, k.Ikon COLLATE Latin1_General_100_BIN2, k.Sira, k.DestekAilesiKodu COLLATE Latin1_General_100_BIN2 EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.KisaAd COLLATE Latin1_General_100_BIN2, h.Ikon COLLATE Latin1_General_100_BIN2, h.Sira, h.DestekAilesiKodu COLLATE Latin1_General_100_BIN2) THEN
    UPDATE SET Ad = k.Ad, KisaAd = k.KisaAd, Ikon = k.Ikon, Sira = k.Sira, DestekAilesiKodu = k.DestekAilesiKodu
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, KisaAd, Ikon, Sira, DestekAilesiKodu, Aktif)
    VALUES (k.Kod, k.Ad, k.KisaAd, k.Ikon, k.Sira, k.DestekAilesiKodu, 1);

/* kod.Ceviri — 14 satır; kategori adları */

MERGE kod.Ceviri AS h
USING (
    SELECT CONVERT(nvarchar(128), v.ListeAdi) AS ListeAdi,
           CONVERT(nvarchar(60), v.Kod) AS Kod,
           CONVERT(nvarchar(40), v.AlanAdi) AS AlanAdi,
           CONVERT(nvarchar(5), v.DilKodu) AS DilKodu,
           CONVERT(nvarchar(1000), v.Metin) AS Metin
    FROM (VALUES
        (N'katalog.Kategori', N'buyuk-balya', N'Ad', N'en', N'Large Square Balers'),
        (N'katalog.Kategori', N'buyuk-balya', N'KisaAd', N'en', N'Large Square'),
        (N'katalog.Kategori', N'cayir-ot', N'Ad', N'en', N'Mowing and Raking'),
        (N'katalog.Kategori', N'cayir-ot', N'KisaAd', N'en', N'Mow & Rake'),
        (N'katalog.Kategori', N'kucuk-balya', N'Ad', N'en', N'Small Square Balers'),
        (N'katalog.Kategori', N'kucuk-balya', N'KisaAd', N'en', N'Small Square'),
        (N'katalog.Kategori', N'rulo-balya', N'Ad', N'en', N'Round Balers'),
        (N'katalog.Kategori', N'rulo-balya', N'KisaAd', N'en', N'Round Baler'),
        (N'katalog.Kategori', N'silaj', N'Ad', N'en', N'Silage Equipment'),
        (N'katalog.Kategori', N'silaj', N'KisaAd', N'en', N'Silage'),
        (N'katalog.Kategori', N'toprak', N'Ad', N'en', N'Soil Preparation'),
        (N'katalog.Kategori', N'toprak', N'KisaAd', N'en', N'Soil'),
        (N'katalog.Kategori', N'yem-karma', N'Ad', N'en', N'Feed Mixers'),
        (N'katalog.Kategori', N'yem-karma', N'KisaAd', N'en', N'Feed Mixer')
    ) AS v (ListeAdi, Kod, AlanAdi, DilKodu, Metin)
) AS k
    ON h.ListeAdi = k.ListeAdi AND h.Kod = k.Kod AND h.AlanAdi = k.AlanAdi AND h.DilKodu = k.DilKodu
WHEN MATCHED AND EXISTS (SELECT k.Metin COLLATE Latin1_General_100_BIN2 EXCEPT SELECT h.Metin COLLATE Latin1_General_100_BIN2) THEN
    UPDATE SET Metin = k.Metin
WHEN NOT MATCHED BY TARGET THEN
    INSERT (ListeAdi, Kod, AlanAdi, DilKodu, Metin)
    VALUES (k.ListeAdi, k.Kod, k.AlanAdi, k.DilKodu, k.Metin);

/* katalog.BakimSablonu — 4 satır; markasız */

MERGE katalog.BakimSablonu AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod
    FROM (VALUES
        (N'balya'),
        (N'silaj'),
        (N'toprak'),
        (N'yem')
    ) AS v (Kod)
) AS k
    ON h.Kod = k.Kod
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Aktif)
    VALUES (k.Kod, 1);

/* katalog.BakimAdimi — 15 satır; markasız */

MERGE katalog.BakimAdimi AS h
USING (
    SELECT CONVERT(nvarchar(40), v.SablonKodu) AS SablonKodu,
           CONVERT(smallint, v.Saat) AS Saat,
           CONVERT(nvarchar(200), v.Baslik) AS Baslik,
           CONVERT(nvarchar(1000), v.Detay) AS Detay,
           CONVERT(bit, v.Aktif) AS Aktif
    FROM (VALUES
        (N'balya', 10, N'Günlük gresleme', N'Düğüm atıcı, piston yatakları ve pikap gres noktalarına gres basın.', 1),
        (N'balya', 50, N'Zincir gerginliği ve yağlama', N'Tüm zincirlerin gerginliğini kontrol edin, zincir yağı uygulayın.', 1),
        (N'balya', 100, N'Düğüm atıcı kontrolü', N'Düğüm atıcı bıçağı, ip tutucu ve yay basıncını kontrol edin.', 1),
        (N'balya', 250, N'Şanzıman yağ değişimi', N'Ana şanzımandaki yağı boşaltıp şanzımanı yeni yağla doldurun.', 1),
        (N'balya', 500, N'Genel bakım', N'Piston bıçağı ile karşı bıçak arasındaki boşluğu, tüm rulmanları ve emniyet cıvatalarını kontrol edin.', 1),
        (N'silaj', 8, N'Bıçak bileme', N'Her çalışma gününde bıçakları bileyin, karşı bıçak boşluğunu ayarlayın.', 1),
        (N'silaj', 50, N'Gresleme ve kayış', N'Gres noktalarını ve kayış gerginliğini kontrol edin.', 1),
        (N'silaj', 250, N'Şanzıman yağı', N'Şanzıman yağ seviyesini kontrol edin ve gerekiyorsa yağı değiştirin.', 1),
        (N'toprak', 10, N'Bıçak/keski kontrolü', N'Kırık veya aşınmış bıçakları değiştirin, cıvata torklarını kontrol edin.', 1),
        (N'toprak', 50, N'Gresleme', N'Yan şanzıman ve rulman gres noktalarına gres basın.', 1),
        (N'toprak', 250, N'Yağ değişimi', N'Yan şanzıman ve ana şanzıman yağını değiştirin.', 1),
        (N'yem', 10, N'Günlük kontrol', N'Bıçakların aşınıp aşınmadığını ve hidrolik kaçak olup olmadığını kontrol edin.', 1),
        (N'yem', 50, N'Gresleme', N'Helezon yatakları ve boşaltma bandı rulmanlarını gresleyin.', 1),
        (N'yem', 250, N'Bıçak kontrolü ve değişimi', N'Kesici bıçakları kontrol edin, körelmişse değiştirin.', 1),
        (N'yem', 500, N'Şanzıman ve tartı', N'Şanzıman yağını kontrol edin. Makinenizde tartı sistemi varsa doğru tartıp tartmadığını da kontrol edin.', 1)
    ) AS v (SablonKodu, Saat, Baslik, Detay, Aktif)
) AS k
    ON h.SablonKodu = k.SablonKodu AND h.Saat = k.Saat
WHEN MATCHED AND EXISTS (SELECT k.Baslik COLLATE Latin1_General_100_BIN2, k.Detay COLLATE Latin1_General_100_BIN2, k.Aktif EXCEPT SELECT h.Baslik COLLATE Latin1_General_100_BIN2, h.Detay COLLATE Latin1_General_100_BIN2, h.Aktif) THEN
    UPDATE SET Baslik = k.Baslik, Detay = k.Detay, Aktif = k.Aktif
WHEN NOT MATCHED BY TARGET THEN
    INSERT (SablonKodu, Saat, Baslik, Detay, Aktif)
    VALUES (k.SablonKodu, k.Saat, k.Baslik, k.Detay, k.Aktif);

/* katalog.BakimAdimiCevirisi — 15 satır */

MERGE katalog.BakimAdimiCevirisi AS h
USING (
    SELECT CONVERT(nvarchar(40), v.SablonKodu) AS SablonKodu,
           CONVERT(smallint, v.Saat) AS Saat,
           CONVERT(nvarchar(5), v.DilKodu) AS DilKodu,
           CONVERT(nvarchar(200), v.Baslik) AS Baslik,
           CONVERT(nvarchar(1000), v.Detay) AS Detay
    FROM (VALUES
        (N'balya', 10, N'en', N'Daily greasing', N'Grease the knotter, the plunger bearings and the pickup grease points.'),
        (N'balya', 50, N'en', N'Chain tension and lubrication', N'Check the tension of all chains and apply chain oil.'),
        (N'balya', 100, N'en', N'Knotter check', N'Check the knotter knife, the twine holder and the spring pressure.'),
        (N'balya', 250, N'en', N'Gearbox oil change', N'Drain the main gearbox oil and refill with new oil.'),
        (N'balya', 500, N'en', N'General service', N'Plunger knife and counter-knife clearance, all bearings, shear bolts.'),
        (N'silaj', 8, N'en', N'Knife sharpening', N'Sharpen the knives every working day and set the counter-knife clearance.'),
        (N'silaj', 50, N'en', N'Greasing and belts', N'Check the grease points and the belt tension.'),
        (N'silaj', 250, N'en', N'Gearbox oil', N'Gearbox oil level, and an oil change if needed.'),
        (N'toprak', 10, N'en', N'Knife / blade check', N'Replace broken or worn knives and check the bolt torques.'),
        (N'toprak', 50, N'en', N'Greasing', N'Grease the auger bearings and the discharge conveyor bearings.'),
        (N'toprak', 250, N'en', N'Oil change', N'Change the oil in the side gearbox and the main gearbox.'),
        (N'yem', 10, N'en', N'Daily check', N'Check the knives for wear and the hydraulics for leaks.'),
        (N'yem', 50, N'en', N'Greasing', N'Grease the auger bearings and the discharge conveyor bearings.'),
        (N'yem', 250, N'en', N'Knife check and replacement', N'Check the cutting knives and replace them if they are blunt.'),
        (N'yem', 500, N'en', N'Gearbox and scale', N'Check the gearbox oil. If your machine has a weighing system, also check that it weighs correctly.')
    ) AS v (SablonKodu, Saat, DilKodu, Baslik, Detay)
) AS k
    ON h.SablonKodu = k.SablonKodu AND h.Saat = k.Saat AND h.DilKodu = k.DilKodu
WHEN MATCHED AND EXISTS (SELECT k.Baslik COLLATE Latin1_General_100_BIN2, k.Detay COLLATE Latin1_General_100_BIN2 EXCEPT SELECT h.Baslik COLLATE Latin1_General_100_BIN2, h.Detay COLLATE Latin1_General_100_BIN2) THEN
    UPDATE SET Baslik = k.Baslik, Detay = k.Detay
WHEN NOT MATCHED BY TARGET THEN
    INSERT (SablonKodu, Saat, DilKodu, Baslik, Detay)
    VALUES (k.SablonKodu, k.Saat, k.DilKodu, k.Baslik, k.Detay);

/* katalog.Urun — 20 satır; SeriOnekiDogrulandi, EskiKayitNo, EskiNumara kaynakta yok; tohum dokunmaz */

WITH hedef AS (SELECT * FROM katalog.Urun WHERE MarkaKodu IN (N'paksan'))
MERGE hedef AS h
USING (
    SELECT CONVERT(nvarchar(20), v.MarkaKodu) AS MarkaKodu,
           CONVERT(nvarchar(60), v.Kod) AS Kod,
           CONVERT(nvarchar(100), v.Ad) AS Ad,
           CONVERT(nvarchar(200), v.Slogan) AS Slogan,
           CONVERT(nvarchar(max), v.Aciklama) AS Aciklama,
           CONVERT(nvarchar(20), v.SeriOneki) AS SeriOneki,
           CONVERT(smallint, v.VitrinSirasi) AS VitrinSirasi,
           CONVERT(nvarchar(400), v.KilavuzUrl) AS KilavuzUrl,
           CONVERT(nvarchar(400), v.TeknikKaynakUrl) AS TeknikKaynakUrl,
           CONVERT(nvarchar(40), v.KategoriKodu) AS KategoriKodu,
           CONVERT(nvarchar(40), v.BakimSablonuKodu) AS BakimSablonuKodu,
           CONVERT(nvarchar(100), v.KilavuzKapsamKodu) AS KilavuzKapsamKodu,
           CONVERT(bit, v.Aktif) AS Aktif
    FROM (VALUES
        (N'paksan', N'albatros-870', N'Albatros 870', N'Prizmatik büyük balya makinesi', N'Albatros 870, sağlam bağlama sistemiyle güvenli balyalar üretir. Güçlü performansıyla balyalama işini hızlandırır ve zamandan tasarruf sağlar.', N'ALB870', NULL, NULL, N'https://www.paksanmakina.com.tr/urunler/albatros-870/', N'buyuk-balya', N'balya', NULL, 1),
        (N'paksan', N'diamond-dikey', N'Diamond Dikey Yem Karma', N'Dikey helezonlu yem karma makinesi', N'Dikey helezonu ve bıçakları, yemi istenen incelikte ve eşit dağılımla karıştırır. İsteğe bağlı dijital tartı sistemi, yem karışımını doğru miktarlarda hazırlamanızı sağlar.', N'DMD', 5, NULL, N'https://www.paksanmakina.com.tr/urunler/diamond-paksan-dikey-yem-karma-makinasi/', N'yem-karma', N'yem', NULL, 1),
        (N'paksan', N'hammer', N'Hammer', N'Küçük balya makinesi', N'Hammer, geniş tırmığıyla zorlu tarla koşullarında balya hazırlayan çiftçiler ve müteahhitler için üretilmiş küçük balya makinesidir.', N'HMR', NULL, NULL, N'https://www.paksanmakina.com.tr/urunler/hammer-balya-makinasi/', N'kucuk-balya', N'balya', N'MCH_HAMMER_SERIES', 1),
        (N'paksan', N'ipak-rulo', N'i-Pak Rulo Balya Makinesi', N'Rulo (yuvarlak) balya makinesi', N'i-Pak, rulo balya hazırlar ve balyaları otomatik olarak fileyle sarar. Otomatik sistemi kullanımı kolaylaştırır, iş gücü ihtiyacını azaltır. Sağlam yapısıyla uzun süreli kullanım için tasarlanmıştır.', N'IPAK', 3, NULL, N'https://www.paksanmakina.com.tr/urunler/i-pak-rulo-balya-makinasi/', N'rulo-balya', N'balya', N'MCH_IPAK_ROUND_BALER', 1),
        (N'paksan', N'kirlangic-ot-toplama', N'Kırlangıç Ot Toplama Makinesi', N'Ot toplama / tırmık makinesi', N'Tarlada biçilmiş ot ve samanı toplayarak namlu hâline getirir.', N'KRLG', NULL, NULL, N'https://www.paksanmakina.com.tr/urunler/kirlangic-ot-toplama-makinasi/', N'cayir-ot', N'toprak', NULL, 1),
        (N'paksan', N'orka-870', N'Orka 870', N'Prizmatik büyük balya makinesi', N'Orka 870, ot ve samanı prizmatik büyük balya hâline getirir.', N'ORKA870', 2, NULL, N'https://www.paksanmakina.com.tr/urunler/orka-870/', N'buyuk-balya', N'balya', N'MCH_ORKA_870', 1),
        (N'paksan', N'orkinos-1270', N'Orkinos 1270', N'Prizmatik büyük balya makinesi', N'Türk mühendislerin geliştirdiği Türkiye’nin ilk ve tek yerli prizmatik büyük balya makinesidir. Sağlam yapısıyla geniş araziler için tasarlanmıştır.', N'ORK1270', 4, NULL, N'https://www.paksanmakina.com.tr/urunler/balya-makinalari/', N'buyuk-balya', N'balya', NULL, 1),
        (N'paksan', N'orkinos-870', N'Orkinos 870', N'Prizmatik büyük balya makinesi', N'Türk mühendislerin geliştirdiği Orkinos 870, sağlam yapısıyla geniş araziler için tasarlanmıştır.', N'ORK870', NULL, NULL, N'https://www.paksanmakina.com.tr/urunler/paksan-balya-makinalari/', N'buyuk-balya', N'balya', NULL, 1),
        (N'paksan', N'pelican-yatay', N'Pelican Yatay Yem Karma', N'Yatay helezonlu yem karma makinesi', N'Süt ve besi sığırı yetiştiricileri için yemi kısa sürede, istenen incelikte ve eşit dağılımla karıştırır. İsteğe bağlı dijital tartı sistemi sunar.', N'PLC', NULL, NULL, N'https://www.paksanmakina.com.tr/urunler/pelican-yatay-yem-karma-makinalari/', N'yem-karma', N'yem', NULL, 1),
        (N'paksan', N'rotovator', N'Rotovatör', N'Toprak frezesi', N'Rotovatör, tohum yatağı hazırlama, anız parçalama ve yabancı ot mücadelesinde kullanılır.', N'RTV', NULL, NULL, N'https://www.paksanmakina.com.tr/urunler/paksan-dikey-rotovator/', N'toprak', N'toprak', NULL, 1),
        (N'paksan', N'scorpion-silaj', N'Scorpion Silaj Makinesi', N'Sıra bağımsız silaj makinesi', N'Silajlık mısır ve uzun boylu yem bitkilerini sıra gözetmeden hasat eder.', N'SCRP', NULL, NULL, N'https://www.paksanmakina.com.tr/urunler/silaj-bicer/', N'silaj', N'silaj', NULL, 1),
        (N'paksan', N'silaj-paketleme', N'Ahtapot Silaj Paketleme Makinesi', N'Balya sarma / paketleme makinesi', N'Rulo balyaları streç film ile sararak silaj yapımını sağlayan paketleme makinesi.', N'AHTP', NULL, NULL, N'https://www.paksanmakina.com.tr/urunler/ahtapot-1000-silaj-paketleme-makinasi/', N'silaj', N'silaj', NULL, 1),
        (N'paksan', N'super-8002', N'Süper 8002', N'Küçük balya makinesi', N'Türkiye’de en çok tercih edilen balya makinelerinden biridir. Güçlendirilmiş yapısıyla küçük traktörlerle ot, yonca ve sap balyalar.', N'S8002', NULL, NULL, N'https://www.paksanmakina.com.tr/urunler/paksan-balya-makinalari-2/', N'kucuk-balya', N'balya', N'MCH_PAKSAN_BALYA_SUPER', 1),
        (N'paksan', N'super-8002e', N'Süper 8002E', N'Küçük balya makinesi (E serisi)', N'Süper 8002 ile aynı özellikleri taşıyan E serisi, daha geniş tırmığıyla toplama alanını artırır. Hem kendi balyasını hazırlayan çiftçilere hem de başkaları için balya işi yapanlara uygundur.', N'S8002E', NULL, NULL, N'https://www.paksanmakina.com.tr/urunler/paksan-balya-makinalari-4/', N'kucuk-balya', N'balya', N'MCH_PAKSAN_BALYA_SUPER', 1),
        (N'paksan', N'super-8002e-dual2', N'Süper 8002E Dual 2', N'Çift bağlama sistemli küçük balya makinesi', N'E serisinin çift bağlama sistemli modeli.', N'S8002ED2', NULL, NULL, N'https://www.paksanmakina.com.tr/urunler/paksan-balya-makinalari-3/', N'kucuk-balya', N'balya', N'MCH_PAKSAN_BALYA_SUPER', 1),
        (N'paksan', N'super-yunus', N'Süper Yunus', N'Küçük balya makinesi', N'Türkiye’de en çok tercih edilen balya makineleri arasında yer alan Süper Yunus, güçlü yapısıyla uzun ve yoğun çalışmalara uygundur.', N'SYNS', 1, NULL, N'https://www.paksanmakina.com.tr/urunler/super-yunus-balya-makinasi/', N'kucuk-balya', N'balya', N'MCH_PAKSAN_BALYA_SUPER', 1),
        (N'paksan', N'super-yunus-3yabali', N'Süper Yunus 3 Yabalı', N'Üç yabalı küçük balya makinesi', N'Süper Yunus 3 Yabalı, üç yabalı besleme sistemiyle kısa sürede daha fazla iş yapmak için tasarlanmıştır.', N'SYNS3Y', NULL, NULL, N'https://www.paksanmakina.com.tr/urunler/paksan-balya-makinalari-5/', N'kucuk-balya', N'balya', N'MCH_PAKSAN_BALYA_SUPER', 1),
        (N'paksan', N'super-yunus-dual2', N'Süper Yunus Dual 2', N'Çift bağlama sistemli küçük balya makinesi', N'Süper Yunus’un çift bağlama sistemli modeli.', N'SYNSD2', NULL, NULL, N'https://www.paksanmakina.com.tr/urunler/paksan-balya-makinalari-6/', N'kucuk-balya', N'balya', N'MCH_PAKSAN_BALYA_SUPER', 1),
        (N'paksan', N'tesviye-kuregi', N'Tesviye Küreği', N'Arazi tesviye küreği', N'Tarla düzeltme ve tesviye işleri için kullanılan kürek. Sağlam çelik gövde.', N'TSVY', NULL, NULL, N'https://www.paksanmakina.com.tr/urunler/paksan-tesviye-kuregi/', N'toprak', N'toprak', NULL, 1),
        (N'paksan', N'yengec-cayir', N'Yengeç Çayır Biçme Makinesi', N'Diskli çayır biçme makinesi', N'Yengeç, diskleriyle yem bitkilerini, çayırları ve yabani otları biçer.', N'YNGC', NULL, NULL, N'https://www.paksanmakina.com.tr/urunler/yengec-cayir-bicme-makinasi/', N'cayir-ot', N'toprak', NULL, 1)
    ) AS v (MarkaKodu, Kod, Ad, Slogan, Aciklama, SeriOneki, VitrinSirasi, KilavuzUrl, TeknikKaynakUrl, KategoriKodu, BakimSablonuKodu, KilavuzKapsamKodu, Aktif)
) AS k
    ON h.MarkaKodu = k.MarkaKodu AND h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Slogan COLLATE Latin1_General_100_BIN2, k.Aciklama COLLATE Latin1_General_100_BIN2, k.SeriOneki COLLATE Latin1_General_100_BIN2, k.VitrinSirasi, k.KilavuzUrl COLLATE Latin1_General_100_BIN2, k.TeknikKaynakUrl COLLATE Latin1_General_100_BIN2, k.KategoriKodu COLLATE Latin1_General_100_BIN2, k.BakimSablonuKodu COLLATE Latin1_General_100_BIN2, k.KilavuzKapsamKodu COLLATE Latin1_General_100_BIN2, k.Aktif EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Slogan COLLATE Latin1_General_100_BIN2, h.Aciklama COLLATE Latin1_General_100_BIN2, h.SeriOneki COLLATE Latin1_General_100_BIN2, h.VitrinSirasi, h.KilavuzUrl COLLATE Latin1_General_100_BIN2, h.TeknikKaynakUrl COLLATE Latin1_General_100_BIN2, h.KategoriKodu COLLATE Latin1_General_100_BIN2, h.BakimSablonuKodu COLLATE Latin1_General_100_BIN2, h.KilavuzKapsamKodu COLLATE Latin1_General_100_BIN2, h.Aktif) THEN
    UPDATE SET Ad = k.Ad, Slogan = k.Slogan, Aciklama = k.Aciklama, SeriOneki = k.SeriOneki, VitrinSirasi = k.VitrinSirasi, KilavuzUrl = k.KilavuzUrl, TeknikKaynakUrl = k.TeknikKaynakUrl, KategoriKodu = k.KategoriKodu, BakimSablonuKodu = k.BakimSablonuKodu, KilavuzKapsamKodu = k.KilavuzKapsamKodu, Aktif = k.Aktif
WHEN NOT MATCHED BY TARGET THEN
    INSERT (MarkaKodu, Kod, Ad, Slogan, Aciklama, SeriOneki, VitrinSirasi, KilavuzUrl, TeknikKaynakUrl, KategoriKodu, BakimSablonuKodu, KilavuzKapsamKodu, Aktif)
    VALUES (k.MarkaKodu, k.Kod, k.Ad, k.Slogan, k.Aciklama, k.SeriOneki, k.VitrinSirasi, k.KilavuzUrl, k.TeknikKaynakUrl, k.KategoriKodu, k.BakimSablonuKodu, k.KilavuzKapsamKodu, k.Aktif)
WHEN NOT MATCHED BY SOURCE AND h.Aktif = 1 THEN
    UPDATE SET Aktif = 0;

/* katalog.UrunCevirisi — 20 satır */

WITH hedef AS (SELECT * FROM katalog.UrunCevirisi WHERE MarkaKodu IN (N'paksan'))
MERGE hedef AS h
USING (
    SELECT CONVERT(nvarchar(20), v.MarkaKodu) AS MarkaKodu,
           CONVERT(nvarchar(60), v.UrunKodu) AS UrunKodu,
           CONVERT(nvarchar(5), v.DilKodu) AS DilKodu,
           CONVERT(nvarchar(100), v.Ad) AS Ad,
           CONVERT(nvarchar(200), v.Slogan) AS Slogan,
           CONVERT(nvarchar(max), v.Aciklama) AS Aciklama
    FROM (VALUES
        (N'paksan', N'albatros-870', N'en', N'Albatros 870', N'Large square baler', N'The Albatros 870 makes solid, secure bales with its robust tying system. Its powerful performance speeds up baling and saves time.'),
        (N'paksan', N'diamond-dikey', N'en', N'Diamond Vertical Feed Mixer', N'Vertical auger feed mixer', N'Its vertical auger and knives mix feed to the desired fineness and evenly. The optional digital weighing system lets you prepare the ration in the right amounts.'),
        (N'paksan', N'hammer', N'en', N'Hammer', N'Small square baler', N'With its wide pick-up, the Hammer is a small square baler built for farmers and contractors baling in tough field conditions.'),
        (N'paksan', N'ipak-rulo', N'en', N'i-Pak Round Baler', N'Round baler', N'The i-Pak makes round bales and wraps them automatically with net. Its automatic system makes it easy to use and reduces the need for labour. Its robust build is designed for long service.'),
        (N'paksan', N'kirlangic-ot-toplama', N'en', N'Kirlangic Rake', N'Hay rake', N'It gathers mown hay and straw in the field into windrows.'),
        (N'paksan', N'orka-870', N'en', N'Orka 870', N'Large square baler', N'The Orka 870 turns hay and straw into large square bales.'),
        (N'paksan', N'orkinos-1270', N'en', N'Orkinos 1270', N'Large square baler', N'Developed by Turkish engineers, it is Turkey''s first and only domestically made large square baler. Its robust build is designed for large fields.'),
        (N'paksan', N'orkinos-870', N'en', N'Orkinos 870', N'Large square baler', N'Developed by Turkish engineers, the Orkinos 870 is designed for large fields with its robust build.'),
        (N'paksan', N'pelican-yatay', N'en', N'Pelican Horizontal Feed Mixer', N'Horizontal auger feed mixer', N'For dairy and beef cattle farmers, it mixes feed quickly, to the desired fineness and evenly. A digital weighing system is optional.'),
        (N'paksan', N'rotovator', N'en', N'Rotary Tiller', N'Rotary tiller', N'The rotary tiller is used for seedbed preparation, breaking up stubble and weed control.'),
        (N'paksan', N'scorpion-silaj', N'en', N'Scorpion Forage Harvester', N'Row-independent forage harvester', N'It harvests silage maize and tall forage crops regardless of rows.'),
        (N'paksan', N'silaj-paketleme', N'en', N'Ahtapot Bale Wrapper', N'Bale wrapping machine', N'A wrapping machine that makes silage by wrapping round bales in stretch film.'),
        (N'paksan', N'super-8002', N'en', N'Super 8002', N'Small square baler', N'One of the most preferred balers in Turkey. With its reinforced build it bales hay, alfalfa and stalks with small tractors.'),
        (N'paksan', N'super-8002e', N'en', N'Super 8002E', N'Small square baler (E series)', N'The E series has the same features as the Super 8002, with a wider pick-up that covers more ground. It suits farmers who bale their own crop as well as those who bale for others.'),
        (N'paksan', N'super-8002e-dual2', N'en', N'Super 8002E Dual 2', N'Small square baler, twin knotter', N'The twin-knotter model of the E series.'),
        (N'paksan', N'super-yunus', N'en', N'Super Yunus', N'Small square baler', N'Among the most preferred balers in Turkey, the Super Yunus suits long and demanding work thanks to its robust build.'),
        (N'paksan', N'super-yunus-3yabali', N'en', N'Super Yunus 3 Yabali', N'Small square baler, three-tine feeder', N'With its three-tine feeding system, the Super Yunus 3 Yabali is designed to do more work in less time.'),
        (N'paksan', N'super-yunus-dual2', N'en', N'Super Yunus Dual 2', N'Small square baler, twin knotter', N'The twin-knotter model of the Super Yunus.'),
        (N'paksan', N'tesviye-kuregi', N'en', N'Land Leveller', N'Land levelling blade', N'A blade used for field levelling and grading work. Solid steel body.'),
        (N'paksan', N'yengec-cayir', N'en', N'Yengec Disc Mower', N'Disc mower', N'With its discs, the Yengec cuts forage crops, meadows and weeds.')
    ) AS v (MarkaKodu, UrunKodu, DilKodu, Ad, Slogan, Aciklama)
) AS k
    ON h.MarkaKodu = k.MarkaKodu AND h.UrunKodu = k.UrunKodu AND h.DilKodu = k.DilKodu
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Slogan COLLATE Latin1_General_100_BIN2, k.Aciklama COLLATE Latin1_General_100_BIN2 EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Slogan COLLATE Latin1_General_100_BIN2, h.Aciklama COLLATE Latin1_General_100_BIN2) THEN
    UPDATE SET Ad = k.Ad, Slogan = k.Slogan, Aciklama = k.Aciklama
WHEN NOT MATCHED BY TARGET THEN
    INSERT (MarkaKodu, UrunKodu, DilKodu, Ad, Slogan, Aciklama)
    VALUES (k.MarkaKodu, k.UrunKodu, k.DilKodu, k.Ad, k.Slogan, k.Aciklama);

/* katalog.UrunVaryanti — 50 satır */

WITH hedef AS (SELECT * FROM katalog.UrunVaryanti WHERE MarkaKodu IN (N'paksan'))
MERGE hedef AS h
USING (
    SELECT CONVERT(nvarchar(20), v.MarkaKodu) AS MarkaKodu,
           CONVERT(nvarchar(60), v.UrunKodu) AS UrunKodu,
           CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(60), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira,
           CONVERT(bit, v.Aktif) AS Aktif
    FROM (VALUES
        (N'paksan', N'diamond-dikey', N'1,5 m3', N'1,5 m3', 1, 1),
        (N'paksan', N'diamond-dikey', N'12 m3', N'12 m3', 8, 1),
        (N'paksan', N'diamond-dikey', N'16 m3', N'16 m3', 9, 1),
        (N'paksan', N'diamond-dikey', N'2,5 m3', N'2,5 m3', 2, 1),
        (N'paksan', N'diamond-dikey', N'20 m3', N'20 m3', 10, 1),
        (N'paksan', N'diamond-dikey', N'3,5 m3', N'3,5 m3', 3, 1),
        (N'paksan', N'diamond-dikey', N'4 m3', N'4 m3', 4, 1),
        (N'paksan', N'diamond-dikey', N'5 m3', N'5 m3', 5, 1),
        (N'paksan', N'diamond-dikey', N'6 m3', N'6 m3', 6, 1),
        (N'paksan', N'diamond-dikey', N'8 m3', N'8 m3', 7, 1),
        (N'paksan', N'hammer', N'HAMMER/ÇEKİÇ', N'HAMMER/ÇEKİÇ', 1, 1),
        (N'paksan', N'ipak-rulo', N'I-Pak 120', N'I-Pak 120', 1, 1),
        (N'paksan', N'kirlangic-ot-toplama', N'11 KOLLU', N'11 KOLLU', 1, 1),
        (N'paksan', N'kirlangic-ot-toplama', N'9 KOLLU', N'9 KOLLU', 2, 1),
        (N'paksan', N'orkinos-1270', N'1270', N'1270', 1, 1),
        (N'paksan', N'orkinos-1270', N'1270 H', N'1270 H', 2, 1),
        (N'paksan', N'orkinos-870', N'870', N'870', 1, 1),
        (N'paksan', N'orkinos-870', N'870 H', N'870 H', 2, 1),
        (N'paksan', N'pelican-yatay', N'10 m3', N'10 m3', 4, 1),
        (N'paksan', N'pelican-yatay', N'4 m3', N'4 m3', 1, 1),
        (N'paksan', N'pelican-yatay', N'6 m3', N'6 m3', 2, 1),
        (N'paksan', N'pelican-yatay', N'8 m3', N'8 m3', 3, 1),
        (N'paksan', N'rotovator', N'Dikey MODEL 250', N'Dikey MODEL 250', 1, 1),
        (N'paksan', N'rotovator', N'Dikey MODEL 300', N'Dikey MODEL 300', 2, 1),
        (N'paksan', N'rotovator', N'Yatay MODEL 210', N'Yatay MODEL 210', 3, 1),
        (N'paksan', N'rotovator', N'Yatay MODEL 230', N'Yatay MODEL 230', 4, 1),
        (N'paksan', N'rotovator', N'Yatay MODEL 280', N'Yatay MODEL 280', 5, 1),
        (N'paksan', N'rotovator', N'Yatay MODEL 300', N'Yatay MODEL 300', 6, 1),
        (N'paksan', N'scorpion-silaj', N'SIRA BAĞIMSIZ', N'SIRA BAĞIMSIZ', 2, 1),
        (N'paksan', N'scorpion-silaj', N'ÜÇ SIRA', N'ÜÇ SIRA', 1, 1),
        (N'paksan', N'silaj-paketleme', N'AHTAPOT 1000', N'AHTAPOT 1000', 2, 1),
        (N'paksan', N'silaj-paketleme', N'AHTAPOT 500', N'AHTAPOT 500', 1, 1),
        (N'paksan', N'super-8002', N'8002 (1)', N'8002 (1)', 1, 1),
        (N'paksan', N'super-8002', N'8002 (2)', N'8002 (2)', 2, 1),
        (N'paksan', N'super-8002', N'8002 (3)', N'8002 (3)', 3, 1),
        (N'paksan', N'super-8002e', N'8002 E (1)', N'8002 E (1)', 1, 1),
        (N'paksan', N'super-8002e', N'8002 E (2)', N'8002 E (2)', 2, 1),
        (N'paksan', N'super-8002e', N'8002 E (3)', N'8002 E (3)', 3, 1),
        (N'paksan', N'super-yunus', N'2 İPLİ', N'2 İPLİ', 1, 1),
        (N'paksan', N'super-yunus', N'3 YABALI', N'3 YABALI', 6, 1),
        (N'paksan', N'super-yunus', N'3 İPLİ', N'3 İPLİ', 2, 1),
        (N'paksan', N'super-yunus', N'3 İPLİ H', N'3 İPLİ H', 3, 1),
        (N'paksan', N'super-yunus', N'DUAL 1', N'DUAL 1', 4, 1),
        (N'paksan', N'super-yunus', N'DUAL 2', N'DUAL 2', 5, 1),
        (N'paksan', N'super-yunus-3yabali', N'3 YABALI', N'3 YABALI', 1, 1),
        (N'paksan', N'tesviye-kuregi', N'LEVEL 4X', N'LEVEL 4X', 1, 1),
        (N'paksan', N'tesviye-kuregi', N'LEVEL 5X', N'LEVEL 5X', 2, 1),
        (N'paksan', N'yengec-cayir', N'YENGEÇ 135', N'YENGEÇ 135', 1, 1),
        (N'paksan', N'yengec-cayir', N'YENGEÇ 165', N'YENGEÇ 165', 2, 1),
        (N'paksan', N'yengec-cayir', N'YENGEÇ 195', N'YENGEÇ 195', 3, 1)
    ) AS v (MarkaKodu, UrunKodu, Kod, Ad, Sira, Aktif)
) AS k
    ON h.MarkaKodu = k.MarkaKodu AND h.UrunKodu = k.UrunKodu AND h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira, k.Aktif EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira, h.Aktif) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira, Aktif = k.Aktif
WHEN NOT MATCHED BY TARGET THEN
    INSERT (MarkaKodu, UrunKodu, Kod, Ad, Sira, Aktif)
    VALUES (k.MarkaKodu, k.UrunKodu, k.Kod, k.Ad, k.Sira, k.Aktif)
WHEN NOT MATCHED BY SOURCE AND h.Aktif = 1 THEN
    UPDATE SET Aktif = 0;

/* katalog.UrunVaryantiCevirisi — 16 satır */

WITH hedef AS (SELECT * FROM katalog.UrunVaryantiCevirisi WHERE MarkaKodu IN (N'paksan'))
MERGE hedef AS h
USING (
    SELECT CONVERT(nvarchar(20), v.MarkaKodu) AS MarkaKodu,
           CONVERT(nvarchar(60), v.UrunKodu) AS UrunKodu,
           CONVERT(nvarchar(40), v.VaryantKodu) AS VaryantKodu,
           CONVERT(nvarchar(5), v.DilKodu) AS DilKodu,
           CONVERT(nvarchar(60), v.Ad) AS Ad
    FROM (VALUES
        (N'paksan', N'hammer', N'HAMMER/ÇEKİÇ', N'en', N'HAMMER'),
        (N'paksan', N'kirlangic-ot-toplama', N'11 KOLLU', N'en', N'11-ARM'),
        (N'paksan', N'kirlangic-ot-toplama', N'9 KOLLU', N'en', N'9-ARM'),
        (N'paksan', N'rotovator', N'Dikey MODEL 250', N'en', N'Vertical MODEL 250'),
        (N'paksan', N'rotovator', N'Dikey MODEL 300', N'en', N'Vertical MODEL 300'),
        (N'paksan', N'rotovator', N'Yatay MODEL 210', N'en', N'Horizontal MODEL 210'),
        (N'paksan', N'rotovator', N'Yatay MODEL 230', N'en', N'Horizontal MODEL 230'),
        (N'paksan', N'rotovator', N'Yatay MODEL 280', N'en', N'Horizontal MODEL 280'),
        (N'paksan', N'rotovator', N'Yatay MODEL 300', N'en', N'Horizontal MODEL 300'),
        (N'paksan', N'scorpion-silaj', N'SIRA BAĞIMSIZ', N'en', N'ROW-INDEPENDENT'),
        (N'paksan', N'scorpion-silaj', N'ÜÇ SIRA', N'en', N'THREE-ROW'),
        (N'paksan', N'super-yunus', N'2 İPLİ', N'en', N'2 TWINE'),
        (N'paksan', N'super-yunus', N'3 YABALI', N'en', N'3 FORK'),
        (N'paksan', N'super-yunus', N'3 İPLİ', N'en', N'3 TWINE'),
        (N'paksan', N'super-yunus', N'3 İPLİ H', N'en', N'3 TWINE H'),
        (N'paksan', N'super-yunus-3yabali', N'3 YABALI', N'en', N'3 FORK')
    ) AS v (MarkaKodu, UrunKodu, VaryantKodu, DilKodu, Ad)
) AS k
    ON h.MarkaKodu = k.MarkaKodu AND h.UrunKodu = k.UrunKodu AND h.VaryantKodu = k.VaryantKodu AND h.DilKodu = k.DilKodu
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2 EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2) THEN
    UPDATE SET Ad = k.Ad
WHEN NOT MATCHED BY TARGET THEN
    INSERT (MarkaKodu, UrunKodu, VaryantKodu, DilKodu, Ad)
    VALUES (k.MarkaKodu, k.UrunKodu, k.VaryantKodu, k.DilKodu, k.Ad);

/* katalog.UrunOzelligi — 86 satır */

WITH hedef AS (SELECT * FROM katalog.UrunOzelligi WHERE MarkaKodu IN (N'paksan'))
MERGE hedef AS h
USING (
    SELECT CONVERT(nvarchar(20), v.MarkaKodu) AS MarkaKodu,
           CONVERT(nvarchar(60), v.UrunKodu) AS UrunKodu,
           CONVERT(smallint, v.SiraNo) AS SiraNo,
           CONVERT(nvarchar(150), v.Etiket) AS Etiket,
           CONVERT(nvarchar(300), v.Deger) AS Deger,
           CONVERT(bit, v.Aktif) AS Aktif
    FROM (VALUES
        (N'paksan', N'albatros-870', 1, N'Balya ölçüsü', N'80 x 70 cm', 1),
        (N'paksan', N'albatros-870', 2, N'Düğüm atıcı', N'4 adet', 1),
        (N'paksan', N'albatros-870', 3, N'Pikap genişliği', N'2.000 mm', 1),
        (N'paksan', N'albatros-870', 4, N'Gerekli traktör gücü', N'min. 100 HP', 1),
        (N'paksan', N'diamond-dikey', 1, N'Hacim seçenekleri', N'4 m³ / 6 m³ / 8 m³', 1),
        (N'paksan', N'diamond-dikey', 2, N'Helezon', N'Dikey, tek helezon', 1),
        (N'paksan', N'diamond-dikey', 3, N'Bıçak', N'Kesici bıçak', 1),
        (N'paksan', N'diamond-dikey', 4, N'Boşaltma', N'Bant ile yandan boşaltma', 1),
        (N'paksan', N'diamond-dikey', 5, N'Tartı sistemi', N'Dijital (isteğe bağlı)', 1),
        (N'paksan', N'diamond-dikey', 6, N'Yükleme kepçesi', N'İsteğe bağlı', 1),
        (N'paksan', N'hammer', 1, N'Balya ölçüsü', N'36 x 46 cm', 1),
        (N'paksan', N'hammer', 2, N'Balya uzunluğu', N'30 – 140 cm', 1),
        (N'paksan', N'hammer', 3, N'Düğüm atıcı', N'2 – 3 adet (modele göre)', 1),
        (N'paksan', N'hammer', 4, N'Net genişlik', N'180 cm', 1),
        (N'paksan', N'hammer', 5, N'Gerekli traktör gücü', N'min. 45 HP', 1),
        (N'paksan', N'ipak-rulo', 1, N'Balya çapı', N'120 cm', 1),
        (N'paksan', N'ipak-rulo', 2, N'Balya genişliği', N'120 cm', 1),
        (N'paksan', N'ipak-rulo', 3, N'Balya ağırlığı', N'100 – 700 kg', 1),
        (N'paksan', N'ipak-rulo', 4, N'Sarma tipi', N'Otomatik file', 1),
        (N'paksan', N'ipak-rulo', 5, N'Pikap genişliği', N'1.940 mm', 1),
        (N'paksan', N'ipak-rulo', 6, N'Gerekli traktör gücü', N'min. 70 HP', 1),
        (N'paksan', N'kirlangic-ot-toplama', 1, N'Parmak kolu sayısı', N'10 – 12', 1),
        (N'paksan', N'kirlangic-ot-toplama', 2, N'Çalışma genişliği', N'3.200 – 3.800 mm', 1),
        (N'paksan', N'kirlangic-ot-toplama', 3, N'Gerekli traktör gücü', N'min. 40 HP', 1),
        (N'paksan', N'orka-870', 1, N'Balya ölçüsü', N'80 x 70 cm', 1),
        (N'paksan', N'orka-870', 2, N'Düğüm atıcı', N'4 adet', 1),
        (N'paksan', N'orka-870', 3, N'Pikap genişliği', N'1.900 mm', 1),
        (N'paksan', N'orka-870', 4, N'Gerekli traktör gücü', N'min. 85 HP', 1),
        (N'paksan', N'orkinos-1270', 1, N'Balya ölçüsü', N'120 x 70 cm', 1),
        (N'paksan', N'orkinos-1270', 2, N'Balya uzunluğu', N'Ayarlanabilir, 40 – 250 cm', 1),
        (N'paksan', N'orkinos-1270', 3, N'Düğüm atıcı', N'6 adet', 1),
        (N'paksan', N'orkinos-1270', 4, N'Pikap genişliği', N'2.200 mm', 1),
        (N'paksan', N'orkinos-1270', 5, N'Gerekli traktör gücü', N'min. 120 HP', 1),
        (N'paksan', N'orkinos-1270', 6, N'Kuyruk mili devri', N'1000 d/dk', 1),
        (N'paksan', N'orkinos-870', 1, N'Balya ölçüsü', N'80 x 70 cm', 1),
        (N'paksan', N'orkinos-870', 2, N'Balya uzunluğu', N'Ayarlanabilir, 40 – 250 cm', 1),
        (N'paksan', N'orkinos-870', 3, N'Düğüm atıcı', N'4 adet', 1),
        (N'paksan', N'orkinos-870', 4, N'Pikap genişliği', N'1.900 mm', 1),
        (N'paksan', N'orkinos-870', 5, N'Gerekli traktör gücü', N'min. 90 HP', 1),
        (N'paksan', N'orkinos-870', 6, N'Kuyruk mili devri', N'1000 d/dk', 1),
        (N'paksan', N'pelican-yatay', 1, N'Helezon', N'Yatay', 1),
        (N'paksan', N'pelican-yatay', 2, N'Boşaltma', N'Çift yönlü bant', 1),
        (N'paksan', N'pelican-yatay', 3, N'Tartı sistemi', N'Dijital (isteğe bağlı)', 1),
        (N'paksan', N'rotovator', 1, N'Çalışma genişliği', N'1.400 – 2.500 mm', 1),
        (N'paksan', N'rotovator', 2, N'Bıçak tipi', N'C tipi / L tipi', 1),
        (N'paksan', N'rotovator', 3, N'Şanzıman', N'Yan zincir / dişli', 1),
        (N'paksan', N'rotovator', 4, N'Gerekli traktör gücü', N'min. 45 HP', 1),
        (N'paksan', N'scorpion-silaj', 1, N'Çalışma tipi', N'Sıra bağımsız', 1),
        (N'paksan', N'scorpion-silaj', 2, N'Kesme boyu', N'Ayarlanabilir', 1),
        (N'paksan', N'scorpion-silaj', 3, N'Gerekli traktör gücü', N'min. 90 HP', 1),
        (N'paksan', N'silaj-paketleme', 1, N'Balya çapı', N'120 cm''e kadar', 1),
        (N'paksan', N'silaj-paketleme', 2, N'Film genişliği', N'500 / 750 mm', 1),
        (N'paksan', N'silaj-paketleme', 3, N'Kumanda', N'Hidrolik', 1),
        (N'paksan', N'super-8002', 1, N'Balya ölçüsü', N'36 x 46 cm', 1),
        (N'paksan', N'super-8002', 2, N'Balya uzunluğu', N'30 – 140 cm', 1),
        (N'paksan', N'super-8002', 3, N'Düğüm atıcı', N'2 adet', 1),
        (N'paksan', N'super-8002', 4, N'Net genişlik', N'142 cm', 1),
        (N'paksan', N'super-8002', 5, N'Gerekli traktör gücü', N'min. 60 HP', 1),
        (N'paksan', N'super-8002e', 1, N'Balya ölçüsü', N'36 x 46 cm', 1),
        (N'paksan', N'super-8002e', 2, N'Balya uzunluğu', N'30 – 140 cm', 1),
        (N'paksan', N'super-8002e', 3, N'Düğüm atıcı', N'2 adet', 1),
        (N'paksan', N'super-8002e', 4, N'Net genişlik', N'150 cm', 1),
        (N'paksan', N'super-8002e', 5, N'Gerekli traktör gücü', N'min. 60 HP', 1),
        (N'paksan', N'super-8002e-dual2', 1, N'Balya ölçüsü', N'36 x 46 cm', 1),
        (N'paksan', N'super-8002e-dual2', 2, N'Düğüm atıcı', N'2 adet (Dual)', 1),
        (N'paksan', N'super-8002e-dual2', 3, N'Net genişlik', N'150 cm', 1),
        (N'paksan', N'super-8002e-dual2', 4, N'Gerekli traktör gücü', N'min. 60 HP', 1),
        (N'paksan', N'super-yunus', 1, N'Balya ölçüsü', N'36 x 46 cm', 1),
        (N'paksan', N'super-yunus', 2, N'Balya uzunluğu', N'30 – 140 cm', 1),
        (N'paksan', N'super-yunus', 3, N'Düğüm atıcı', N'2 – 3 adet (modele göre)', 1),
        (N'paksan', N'super-yunus', 4, N'Net genişlik', N'163 cm', 1),
        (N'paksan', N'super-yunus', 5, N'Gerekli traktör gücü', N'min. 70 HP', 1),
        (N'paksan', N'super-yunus-3yabali', 1, N'Balya ölçüsü', N'36 x 46 cm', 1),
        (N'paksan', N'super-yunus-3yabali', 2, N'Yaba sayısı', N'3', 1),
        (N'paksan', N'super-yunus-3yabali', 3, N'Net genişlik', N'163 cm', 1),
        (N'paksan', N'super-yunus-3yabali', 4, N'Gerekli traktör gücü', N'min. 70 HP', 1),
        (N'paksan', N'super-yunus-dual2', 1, N'Balya ölçüsü', N'36 x 46 cm', 1),
        (N'paksan', N'super-yunus-dual2', 2, N'Düğüm atıcı', N'2 adet (Dual)', 1),
        (N'paksan', N'super-yunus-dual2', 3, N'Net genişlik', N'163 cm', 1),
        (N'paksan', N'super-yunus-dual2', 4, N'Gerekli traktör gücü', N'min. 70 HP', 1),
        (N'paksan', N'tesviye-kuregi', 1, N'Çalışma genişliği', N'1.800 – 2.500 mm', 1),
        (N'paksan', N'tesviye-kuregi', 2, N'Kumanda', N'Mekanik / Hidrolik', 1),
        (N'paksan', N'tesviye-kuregi', 3, N'Gerekli traktör gücü', N'min. 40 HP', 1),
        (N'paksan', N'yengec-cayir', 1, N'Disk sayısı', N'4 – 8 (modele göre)', 1),
        (N'paksan', N'yengec-cayir', 2, N'Çalışma genişliği', N'1.650 – 2.800 mm', 1),
        (N'paksan', N'yengec-cayir', 3, N'Gerekli traktör gücü', N'min. 50 HP', 1)
    ) AS v (MarkaKodu, UrunKodu, SiraNo, Etiket, Deger, Aktif)
) AS k
    ON h.MarkaKodu = k.MarkaKodu AND h.UrunKodu = k.UrunKodu AND h.SiraNo = k.SiraNo
WHEN MATCHED AND EXISTS (SELECT k.Etiket COLLATE Latin1_General_100_BIN2, k.Deger COLLATE Latin1_General_100_BIN2, k.Aktif EXCEPT SELECT h.Etiket COLLATE Latin1_General_100_BIN2, h.Deger COLLATE Latin1_General_100_BIN2, h.Aktif) THEN
    UPDATE SET Etiket = k.Etiket, Deger = k.Deger, Aktif = k.Aktif
WHEN NOT MATCHED BY TARGET THEN
    INSERT (MarkaKodu, UrunKodu, SiraNo, Etiket, Deger, Aktif)
    VALUES (k.MarkaKodu, k.UrunKodu, k.SiraNo, k.Etiket, k.Deger, k.Aktif)
WHEN NOT MATCHED BY SOURCE AND h.Aktif = 1 THEN
    UPDATE SET Aktif = 0;

/* katalog.UrunOzelligiCevirisi — 86 satır; Deger boş: değer her dilde aynı (sayı ve birim) */

WITH hedef AS (SELECT * FROM katalog.UrunOzelligiCevirisi WHERE MarkaKodu IN (N'paksan'))
MERGE hedef AS h
USING (
    SELECT CONVERT(nvarchar(20), v.MarkaKodu) AS MarkaKodu,
           CONVERT(nvarchar(60), v.UrunKodu) AS UrunKodu,
           CONVERT(smallint, v.SiraNo) AS SiraNo,
           CONVERT(nvarchar(5), v.DilKodu) AS DilKodu,
           CONVERT(nvarchar(150), v.Etiket) AS Etiket,
           CONVERT(nvarchar(300), v.Deger) AS Deger
    FROM (VALUES
        (N'paksan', N'albatros-870', 1, N'en', N'Bale size', NULL),
        (N'paksan', N'albatros-870', 2, N'en', N'Knotters', N'4'),
        (N'paksan', N'albatros-870', 3, N'en', N'Pickup width', NULL),
        (N'paksan', N'albatros-870', 4, N'en', N'Tractor power required', NULL),
        (N'paksan', N'diamond-dikey', 1, N'en', N'Capacity options', NULL),
        (N'paksan', N'diamond-dikey', 2, N'en', N'Auger', N'Vertical, single auger'),
        (N'paksan', N'diamond-dikey', 3, N'en', N'Knives', N'Cutting knife'),
        (N'paksan', N'diamond-dikey', 4, N'en', N'Discharge', N'Side discharge by conveyor'),
        (N'paksan', N'diamond-dikey', 5, N'en', N'Weighing system', N'Digital (optional)'),
        (N'paksan', N'diamond-dikey', 6, N'en', N'Loading bucket', N'Optional'),
        (N'paksan', N'hammer', 1, N'en', N'Bale size', NULL),
        (N'paksan', N'hammer', 2, N'en', N'Bale length', NULL),
        (N'paksan', N'hammer', 3, N'en', N'Knotters', N'2 – 3 (depending on model)'),
        (N'paksan', N'hammer', 4, N'en', N'Net width', NULL),
        (N'paksan', N'hammer', 5, N'en', N'Tractor power required', NULL),
        (N'paksan', N'ipak-rulo', 1, N'en', N'Bale diameter', NULL),
        (N'paksan', N'ipak-rulo', 2, N'en', N'Bale width', NULL),
        (N'paksan', N'ipak-rulo', 3, N'en', N'Bale weight', NULL),
        (N'paksan', N'ipak-rulo', 4, N'en', N'Wrapping type', N'Automatic net wrapping'),
        (N'paksan', N'ipak-rulo', 5, N'en', N'Pickup width', NULL),
        (N'paksan', N'ipak-rulo', 6, N'en', N'Tractor power required', NULL),
        (N'paksan', N'kirlangic-ot-toplama', 1, N'en', N'Number of tine arms', NULL),
        (N'paksan', N'kirlangic-ot-toplama', 2, N'en', N'Working width', NULL),
        (N'paksan', N'kirlangic-ot-toplama', 3, N'en', N'Tractor power required', NULL),
        (N'paksan', N'orka-870', 1, N'en', N'Bale size', NULL),
        (N'paksan', N'orka-870', 2, N'en', N'Knotters', N'4'),
        (N'paksan', N'orka-870', 3, N'en', N'Pickup width', NULL),
        (N'paksan', N'orka-870', 4, N'en', N'Tractor power required', NULL),
        (N'paksan', N'orkinos-1270', 1, N'en', N'Bale size', NULL),
        (N'paksan', N'orkinos-1270', 2, N'en', N'Bale length', N'Adjustable, 40 – 250 cm'),
        (N'paksan', N'orkinos-1270', 3, N'en', N'Knotters', N'6'),
        (N'paksan', N'orkinos-1270', 4, N'en', N'Pickup width', NULL),
        (N'paksan', N'orkinos-1270', 5, N'en', N'Tractor power required', NULL),
        (N'paksan', N'orkinos-1270', 6, N'en', N'PTO speed', NULL),
        (N'paksan', N'orkinos-870', 1, N'en', N'Bale size', NULL),
        (N'paksan', N'orkinos-870', 2, N'en', N'Bale length', N'Adjustable, 40 – 250 cm'),
        (N'paksan', N'orkinos-870', 3, N'en', N'Knotters', N'4'),
        (N'paksan', N'orkinos-870', 4, N'en', N'Pickup width', NULL),
        (N'paksan', N'orkinos-870', 5, N'en', N'Tractor power required', NULL),
        (N'paksan', N'orkinos-870', 6, N'en', N'PTO speed', NULL),
        (N'paksan', N'pelican-yatay', 1, N'en', N'Auger', N'Horizontal'),
        (N'paksan', N'pelican-yatay', 2, N'en', N'Discharge', N'Two-way conveyor'),
        (N'paksan', N'pelican-yatay', 3, N'en', N'Weighing system', N'Digital (optional)'),
        (N'paksan', N'rotovator', 1, N'en', N'Working width', NULL),
        (N'paksan', N'rotovator', 2, N'en', N'Knife type', N'C type / L type'),
        (N'paksan', N'rotovator', 3, N'en', N'Gearbox', N'Side chain / gear'),
        (N'paksan', N'rotovator', 4, N'en', N'Tractor power required', NULL),
        (N'paksan', N'scorpion-silaj', 1, N'en', N'Type of work', N'Row-independent'),
        (N'paksan', N'scorpion-silaj', 2, N'en', N'Chop length', N'Adjustable'),
        (N'paksan', N'scorpion-silaj', 3, N'en', N'Tractor power required', NULL),
        (N'paksan', N'silaj-paketleme', 1, N'en', N'Bale diameter', NULL),
        (N'paksan', N'silaj-paketleme', 2, N'en', N'Film width', NULL),
        (N'paksan', N'silaj-paketleme', 3, N'en', N'Controls', N'Hydraulic'),
        (N'paksan', N'super-8002', 1, N'en', N'Bale size', NULL),
        (N'paksan', N'super-8002', 2, N'en', N'Bale length', NULL),
        (N'paksan', N'super-8002', 3, N'en', N'Knotters', N'2'),
        (N'paksan', N'super-8002', 4, N'en', N'Net width', NULL),
        (N'paksan', N'super-8002', 5, N'en', N'Tractor power required', NULL),
        (N'paksan', N'super-8002e', 1, N'en', N'Bale size', NULL),
        (N'paksan', N'super-8002e', 2, N'en', N'Bale length', NULL),
        (N'paksan', N'super-8002e', 3, N'en', N'Knotters', N'2'),
        (N'paksan', N'super-8002e', 4, N'en', N'Net width', NULL),
        (N'paksan', N'super-8002e', 5, N'en', N'Tractor power required', NULL),
        (N'paksan', N'super-8002e-dual2', 1, N'en', N'Bale size', NULL),
        (N'paksan', N'super-8002e-dual2', 2, N'en', N'Knotters', N'2 (Dual)'),
        (N'paksan', N'super-8002e-dual2', 3, N'en', N'Net width', NULL),
        (N'paksan', N'super-8002e-dual2', 4, N'en', N'Tractor power required', NULL),
        (N'paksan', N'super-yunus', 1, N'en', N'Bale size', NULL),
        (N'paksan', N'super-yunus', 2, N'en', N'Bale length', NULL),
        (N'paksan', N'super-yunus', 3, N'en', N'Knotters', N'2 – 3 (depending on model)'),
        (N'paksan', N'super-yunus', 4, N'en', N'Net width', NULL),
        (N'paksan', N'super-yunus', 5, N'en', N'Tractor power required', NULL),
        (N'paksan', N'super-yunus-3yabali', 1, N'en', N'Bale size', NULL),
        (N'paksan', N'super-yunus-3yabali', 2, N'en', N'Number of forks', NULL),
        (N'paksan', N'super-yunus-3yabali', 3, N'en', N'Net width', NULL),
        (N'paksan', N'super-yunus-3yabali', 4, N'en', N'Tractor power required', NULL),
        (N'paksan', N'super-yunus-dual2', 1, N'en', N'Bale size', NULL),
        (N'paksan', N'super-yunus-dual2', 2, N'en', N'Knotters', N'2 (Dual)'),
        (N'paksan', N'super-yunus-dual2', 3, N'en', N'Net width', NULL),
        (N'paksan', N'super-yunus-dual2', 4, N'en', N'Tractor power required', NULL),
        (N'paksan', N'tesviye-kuregi', 1, N'en', N'Working width', NULL),
        (N'paksan', N'tesviye-kuregi', 2, N'en', N'Controls', N'Mechanical / hydraulic'),
        (N'paksan', N'tesviye-kuregi', 3, N'en', N'Tractor power required', NULL),
        (N'paksan', N'yengec-cayir', 1, N'en', N'Number of discs', N'4 – 8 (depending on model)'),
        (N'paksan', N'yengec-cayir', 2, N'en', N'Working width', NULL),
        (N'paksan', N'yengec-cayir', 3, N'en', N'Tractor power required', NULL)
    ) AS v (MarkaKodu, UrunKodu, SiraNo, DilKodu, Etiket, Deger)
) AS k
    ON h.MarkaKodu = k.MarkaKodu AND h.UrunKodu = k.UrunKodu AND h.SiraNo = k.SiraNo AND h.DilKodu = k.DilKodu
WHEN MATCHED AND EXISTS (SELECT k.Etiket COLLATE Latin1_General_100_BIN2, k.Deger COLLATE Latin1_General_100_BIN2 EXCEPT SELECT h.Etiket COLLATE Latin1_General_100_BIN2, h.Deger COLLATE Latin1_General_100_BIN2) THEN
    UPDATE SET Etiket = k.Etiket, Deger = k.Deger
WHEN NOT MATCHED BY TARGET THEN
    INSERT (MarkaKodu, UrunKodu, SiraNo, DilKodu, Etiket, Deger)
    VALUES (k.MarkaKodu, k.UrunKodu, k.SiraNo, k.DilKodu, k.Etiket, k.Deger);

/* katalog.UrunVideosu — 31 satır */

WITH hedef AS (SELECT * FROM katalog.UrunVideosu WHERE MarkaKodu IN (N'paksan'))
MERGE hedef AS h
USING (
    SELECT CONVERT(nvarchar(20), v.MarkaKodu) AS MarkaKodu,
           CONVERT(nvarchar(60), v.UrunKodu) AS UrunKodu,
           CONVERT(smallint, v.SiraNo) AS SiraNo,
           CONVERT(nvarchar(200), v.Baslik) AS Baslik,
           CONVERT(int, v.SureSaniye) AS SureSaniye,
           CONVERT(nvarchar(400), v.Url) AS Url,
           CONVERT(nvarchar(260), v.DosyaYolu) AS DosyaYolu,
           CONVERT(nvarchar(20), v.TurKodu) AS TurKodu,
           CONVERT(bit, v.Aktif) AS Aktif
    FROM (VALUES
        (N'paksan', N'albatros-870', 1, N'Albatros 870 tarlada', 184, NULL, NULL, N'tanitim', 1),
        (N'paksan', N'diamond-dikey', 1, N'Diamond tanıtım', 250, NULL, NULL, N'tanitim', 1),
        (N'paksan', N'diamond-dikey', 2, N'Doğru yükleme sırası', 335, NULL, NULL, N'kullanim', 1),
        (N'paksan', N'diamond-dikey', 3, N'Tartı kalibrasyonu', 245, NULL, NULL, N'kullanim', 1),
        (N'paksan', N'hammer', 1, N'Hammer tanıtım', 164, NULL, NULL, N'tanitim', 1),
        (N'paksan', N'ipak-rulo', 1, N'i-Pak tanıtım', 210, NULL, NULL, N'tanitim', 1),
        (N'paksan', N'ipak-rulo', 2, N'File takma ve ayarlama', 372, NULL, NULL, N'kullanim', 1),
        (N'paksan', N'kirlangic-ot-toplama', 1, N'Kırlangıç tanıtım', 135, NULL, NULL, N'tanitim', 1),
        (N'paksan', N'orka-870', 1, N'Orka 870 tanıtım', 155, NULL, NULL, N'tanitim', 1),
        (N'paksan', N'orkinos-1270', 1, N'Orkinos 1270 tanıtım', 26, NULL, N'src/assets/videolar/orkinos-1270-tanitim.mp4', N'tanitim', 1),
        (N'paksan', N'orkinos-1270', 2, N'İlk çalıştırma ve traktöre bağlama', 400, NULL, NULL, N'kullanim', 1),
        (N'paksan', N'orkinos-1270', 3, N'Düğüm atıcı ayarı', 485, NULL, NULL, N'kullanim', 1),
        (N'paksan', N'orkinos-1270', 4, N'Balya yoğunluğu ayarı', 262, NULL, NULL, N'kullanim', 1),
        (N'paksan', N'orkinos-870', 1, N'Orkinos 870 tanıtım', 168, NULL, NULL, N'tanitim', 1),
        (N'paksan', N'orkinos-870', 2, N'Bakım ve gresleme noktaları', 330, NULL, NULL, N'kullanim', 1),
        (N'paksan', N'pelican-yatay', 1, N'Pelican tanıtım', 225, NULL, NULL, N'tanitim', 1),
        (N'paksan', N'rotovator', 1, N'Rotovatör kullanımı', 240, NULL, NULL, N'kullanim', 1),
        (N'paksan', N'scorpion-silaj', 1, N'Scorpion tarlada', 235, NULL, NULL, N'tanitim', 1),
        (N'paksan', N'scorpion-silaj', 2, N'Bıçak bileme ve boşluk ayarı', 450, NULL, NULL, N'kullanim', 1),
        (N'paksan', N'silaj-paketleme', 1, N'Ahtapot tanıtım', 170, NULL, NULL, N'tanitim', 1),
        (N'paksan', N'silaj-paketleme', 2, N'Paketleme makinesi kullanımı', 320, NULL, NULL, N'kullanim', 1),
        (N'paksan', N'super-8002', 1, N'Süper 8002 kullanım', 310, NULL, NULL, N'kullanim', 1),
        (N'paksan', N'super-8002e', 1, N'E serisi farkları', 200, NULL, NULL, N'tanitim', 1),
        (N'paksan', N'super-8002e-dual2', 1, N'Süper 8002E Dual 2', 180, NULL, NULL, N'tanitim', 1),
        (N'paksan', N'super-yunus', 1, N'Süper Yunus tanıtım', 140, NULL, NULL, N'tanitim', 1),
        (N'paksan', N'super-yunus', 2, N'İp takma ve düğüm ayarı', 435, NULL, NULL, N'kullanim', 1),
        (N'paksan', N'super-yunus', 3, N'Emniyet cıvatası değişimi', 220, NULL, NULL, N'kullanim', 1),
        (N'paksan', N'super-yunus-3yabali', 1, N'3 Yabalı sistem tanıtımı', 175, NULL, NULL, N'tanitim', 1),
        (N'paksan', N'super-yunus-dual2', 1, N'Dual 2 sistemi nasıl çalışır?', 290, NULL, NULL, N'kullanim', 1),
        (N'paksan', N'tesviye-kuregi', 1, N'Tesviye küreği tanıtım', 110, NULL, NULL, N'tanitim', 1),
        (N'paksan', N'yengec-cayir', 1, N'Yengeç tanıtım', 160, NULL, NULL, N'tanitim', 1)
    ) AS v (MarkaKodu, UrunKodu, SiraNo, Baslik, SureSaniye, Url, DosyaYolu, TurKodu, Aktif)
) AS k
    ON h.MarkaKodu = k.MarkaKodu AND h.UrunKodu = k.UrunKodu AND h.SiraNo = k.SiraNo
WHEN MATCHED AND EXISTS (SELECT k.Baslik COLLATE Latin1_General_100_BIN2, k.SureSaniye, k.Url COLLATE Latin1_General_100_BIN2, k.DosyaYolu COLLATE Latin1_General_100_BIN2, k.TurKodu COLLATE Latin1_General_100_BIN2, k.Aktif EXCEPT SELECT h.Baslik COLLATE Latin1_General_100_BIN2, h.SureSaniye, h.Url COLLATE Latin1_General_100_BIN2, h.DosyaYolu COLLATE Latin1_General_100_BIN2, h.TurKodu COLLATE Latin1_General_100_BIN2, h.Aktif) THEN
    UPDATE SET Baslik = k.Baslik, SureSaniye = k.SureSaniye, Url = k.Url, DosyaYolu = k.DosyaYolu, TurKodu = k.TurKodu, Aktif = k.Aktif
WHEN NOT MATCHED BY TARGET THEN
    INSERT (MarkaKodu, UrunKodu, SiraNo, Baslik, SureSaniye, Url, DosyaYolu, TurKodu, Aktif)
    VALUES (k.MarkaKodu, k.UrunKodu, k.SiraNo, k.Baslik, k.SureSaniye, k.Url, k.DosyaYolu, k.TurKodu, k.Aktif)
WHEN NOT MATCHED BY SOURCE AND h.Aktif = 1 THEN
    UPDATE SET Aktif = 0;

/* katalog.UrunVideosuCevirisi — 31 satır */

WITH hedef AS (SELECT * FROM katalog.UrunVideosuCevirisi WHERE MarkaKodu IN (N'paksan'))
MERGE hedef AS h
USING (
    SELECT CONVERT(nvarchar(20), v.MarkaKodu) AS MarkaKodu,
           CONVERT(nvarchar(60), v.UrunKodu) AS UrunKodu,
           CONVERT(smallint, v.SiraNo) AS SiraNo,
           CONVERT(nvarchar(5), v.DilKodu) AS DilKodu,
           CONVERT(nvarchar(200), v.Baslik) AS Baslik
    FROM (VALUES
        (N'paksan', N'albatros-870', 1, N'en', N'Albatros 870 in the field'),
        (N'paksan', N'diamond-dikey', 1, N'en', N'Diamond overview'),
        (N'paksan', N'diamond-dikey', 2, N'en', N'The right loading order'),
        (N'paksan', N'diamond-dikey', 3, N'en', N'Calibrating the scale'),
        (N'paksan', N'hammer', 1, N'en', N'Hammer overview'),
        (N'paksan', N'ipak-rulo', 1, N'en', N'i-Pak overview'),
        (N'paksan', N'ipak-rulo', 2, N'en', N'Fitting and setting the net'),
        (N'paksan', N'kirlangic-ot-toplama', 1, N'en', N'Kirlangic overview'),
        (N'paksan', N'orka-870', 1, N'en', N'Orka 870 overview'),
        (N'paksan', N'orkinos-1270', 1, N'en', N'Orkinos 1270 overview'),
        (N'paksan', N'orkinos-1270', 2, N'en', N'First start-up and hitching to the tractor'),
        (N'paksan', N'orkinos-1270', 3, N'en', N'Setting the knotter'),
        (N'paksan', N'orkinos-1270', 4, N'en', N'Setting the bale density'),
        (N'paksan', N'orkinos-870', 1, N'en', N'Orkinos 870 overview'),
        (N'paksan', N'orkinos-870', 2, N'en', N'Maintenance and greasing points'),
        (N'paksan', N'pelican-yatay', 1, N'en', N'Pelican overview'),
        (N'paksan', N'rotovator', 1, N'en', N'Using the rotary tiller'),
        (N'paksan', N'scorpion-silaj', 1, N'en', N'Scorpion in the field'),
        (N'paksan', N'scorpion-silaj', 2, N'en', N'Sharpening the knives and setting the clearance'),
        (N'paksan', N'silaj-paketleme', 1, N'en', N'Ahtapot overview'),
        (N'paksan', N'silaj-paketleme', 2, N'en', N'Using the bale wrapper'),
        (N'paksan', N'super-8002', 1, N'en', N'Using the Super 8002'),
        (N'paksan', N'super-8002e', 1, N'en', N'What is different about the E series'),
        (N'paksan', N'super-8002e-dual2', 1, N'en', N'Super 8002E Dual 2'),
        (N'paksan', N'super-yunus', 1, N'en', N'Super Yunus overview'),
        (N'paksan', N'super-yunus', 2, N'en', N'Threading the twine and setting the knot'),
        (N'paksan', N'super-yunus', 3, N'en', N'Replacing the shear bolt'),
        (N'paksan', N'super-yunus-3yabali', 1, N'en', N'Three-fork system overview'),
        (N'paksan', N'super-yunus-dual2', 1, N'en', N'How does the Dual 2 system work?'),
        (N'paksan', N'tesviye-kuregi', 1, N'en', N'Land leveller overview'),
        (N'paksan', N'yengec-cayir', 1, N'en', N'Yengec overview')
    ) AS v (MarkaKodu, UrunKodu, SiraNo, DilKodu, Baslik)
) AS k
    ON h.MarkaKodu = k.MarkaKodu AND h.UrunKodu = k.UrunKodu AND h.SiraNo = k.SiraNo AND h.DilKodu = k.DilKodu
WHEN MATCHED AND EXISTS (SELECT k.Baslik COLLATE Latin1_General_100_BIN2 EXCEPT SELECT h.Baslik COLLATE Latin1_General_100_BIN2) THEN
    UPDATE SET Baslik = k.Baslik
WHEN NOT MATCHED BY TARGET THEN
    INSERT (MarkaKodu, UrunKodu, SiraNo, DilKodu, Baslik)
    VALUES (k.MarkaKodu, k.UrunKodu, k.SiraNo, k.DilKodu, k.Baslik);

/* katalog.ParcaModel — kaynakta parça-model eşleşmesi yok (fiyat listesi bu bilgiyi vermiyor); tohum yazmaz. */

/* kod.BelirtiKapsami — 83 satır; bağ satırı; kaynaktaki markada kaynakta olmayan bağ silinir (başka tablo bu bağa FK vermez) */

WITH hedef AS (SELECT * FROM kod.BelirtiKapsami WHERE MarkaKodu IN (N'paksan'))
MERGE hedef AS h
USING (
    SELECT CONVERT(nvarchar(20), v.MarkaKodu) AS MarkaKodu,
           CONVERT(nvarchar(40), v.DestekAilesiKodu) AS DestekAilesiKodu,
           CONVERT(nvarchar(40), v.BelirtiKodu) AS BelirtiKodu,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'paksan', N'balya', N'anormalSes', 8),
        (N'paksan', N'balya', N'asiriTitresim', 9),
        (N'paksan', N'balya', N'balyaDagiliyor', 4),
        (N'paksan', N'balya', N'balyaGevsek', 3),
        (N'paksan', N'balya', N'balyaSayaciCalismiyor', 7),
        (N'paksan', N'balya', N'diger', 15),
        (N'paksan', N'balya', N'dugumAtmiyor', 1),
        (N'paksan', N'balya', N'hidrolikSorunu', 12),
        (N'paksan', N'balya', N'ipKopuyor', 2),
        (N'paksan', N'balya', N'isinmaYanikKokusu', 14),
        (N'paksan', N'balya', N'kayisZincirAtiyor', 13),
        (N'paksan', N'balya', N'pikapOtAlmiyor', 5),
        (N'paksan', N'balya', N'pistonVurma', 6),
        (N'paksan', N'balya', N'saftMafsal', 11),
        (N'paksan', N'balya', N'yagKacagi', 10),
        (N'paksan', N'cayir', N'anormalSes', 4),
        (N'paksan', N'cayir', N'asiriTitresim', 5),
        (N'paksan', N'cayir', N'bicakParmakKiriliyor', 2),
        (N'paksan', N'cayir', N'bicmeDuzgunDegil', 1),
        (N'paksan', N'cayir', N'diger', 11),
        (N'paksan', N'cayir', N'hidrolikSorunu', 8),
        (N'paksan', N'cayir', N'isinmaYanikKokusu', 10),
        (N'paksan', N'cayir', N'kayisZincirAtiyor', 9),
        (N'paksan', N'cayir', N'saftMafsal', 7),
        (N'paksan', N'cayir', N'tirmikOtToplamiyor', 3),
        (N'paksan', N'cayir', N'yagKacagi', 6),
        (N'paksan', N'genel', N'anormalSes', 1),
        (N'paksan', N'genel', N'asiriTitresim', 2),
        (N'paksan', N'genel', N'diger', 8),
        (N'paksan', N'genel', N'hidrolikSorunu', 5),
        (N'paksan', N'genel', N'isinmaYanikKokusu', 7),
        (N'paksan', N'genel', N'kayisZincirAtiyor', 6),
        (N'paksan', N'genel', N'saftMafsal', 4),
        (N'paksan', N'genel', N'yagKacagi', 3),
        (N'paksan', N'rulo', N'agIpSarmiyor', 2),
        (N'paksan', N'rulo', N'anormalSes', 6),
        (N'paksan', N'rulo', N'asiriTitresim', 7),
        (N'paksan', N'rulo', N'balyaGevsek', 4),
        (N'paksan', N'rulo', N'balyaSarilmiyor', 1),
        (N'paksan', N'rulo', N'diger', 13),
        (N'paksan', N'rulo', N'hidrolikSorunu', 10),
        (N'paksan', N'rulo', N'isinmaYanikKokusu', 12),
        (N'paksan', N'rulo', N'kapakAcilmiyor', 3),
        (N'paksan', N'rulo', N'kayisZincirAtiyor', 11),
        (N'paksan', N'rulo', N'pikapOtAlmiyor', 5),
        (N'paksan', N'rulo', N'saftMafsal', 9),
        (N'paksan', N'rulo', N'yagKacagi', 8),
        (N'paksan', N'silaj', N'anormalSes', 5),
        (N'paksan', N'silaj', N'asiriTitresim', 6),
        (N'paksan', N'silaj', N'beslemeDuzgunDegil', 4),
        (N'paksan', N'silaj', N'bicaklarKorelmis', 2),
        (N'paksan', N'silaj', N'diger', 12),
        (N'paksan', N'silaj', N'hidrolikSorunu', 9),
        (N'paksan', N'silaj', N'isinmaYanikKokusu', 11),
        (N'paksan', N'silaj', N'kayisZincirAtiyor', 10),
        (N'paksan', N'silaj', N'kesmeBoyuTutmuyor', 1),
        (N'paksan', N'silaj', N'saftMafsal', 8),
        (N'paksan', N'silaj', N'tikanma', 3),
        (N'paksan', N'silaj', N'yagKacagi', 7),
        (N'paksan', N'toprak', N'anormalSes', 4),
        (N'paksan', N'toprak', N'asiriTitresim', 5),
        (N'paksan', N'toprak', N'derinlikTutmuyor', 1),
        (N'paksan', N'toprak', N'diger', 11),
        (N'paksan', N'toprak', N'hidrolikSorunu', 8),
        (N'paksan', N'toprak', N'isinmaYanikKokusu', 10),
        (N'paksan', N'toprak', N'kayisZincirAtiyor', 9),
        (N'paksan', N'toprak', N'saftMafsal', 7),
        (N'paksan', N'toprak', N'topragiDuzgunIslemiyor', 3),
        (N'paksan', N'toprak', N'ucAyakKiriliyor', 2),
        (N'paksan', N'toprak', N'yagKacagi', 6),
        (N'paksan', N'yem', N'anormalSes', 6),
        (N'paksan', N'yem', N'asiriTitresim', 7),
        (N'paksan', N'yem', N'bicaklarKesmiyor', 2),
        (N'paksan', N'yem', N'bosaltmaYapmiyor', 3),
        (N'paksan', N'yem', N'diger', 13),
        (N'paksan', N'yem', N'helezonSikisiyor', 5),
        (N'paksan', N'yem', N'hidrolikSorunu', 10),
        (N'paksan', N'yem', N'isinmaYanikKokusu', 12),
        (N'paksan', N'yem', N'karistirmaYetersiz', 1),
        (N'paksan', N'yem', N'kayisZincirAtiyor', 11),
        (N'paksan', N'yem', N'saftMafsal', 9),
        (N'paksan', N'yem', N'tartiCalismiyor', 4),
        (N'paksan', N'yem', N'yagKacagi', 8)
    ) AS v (MarkaKodu, DestekAilesiKodu, BelirtiKodu, Sira)
) AS k
    ON h.MarkaKodu = k.MarkaKodu AND h.DestekAilesiKodu = k.DestekAilesiKodu AND h.BelirtiKodu = k.BelirtiKodu
WHEN MATCHED AND EXISTS (SELECT k.Sira EXCEPT SELECT h.Sira) THEN
    UPDATE SET Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (MarkaKodu, DestekAilesiKodu, BelirtiKodu, Sira)
    VALUES (k.MarkaKodu, k.DestekAilesiKodu, k.BelirtiKodu, k.Sira)
WHEN NOT MATCHED BY SOURCE THEN
    DELETE;
