-- ÜRETİLDİ, elle düzenlemeyin
/* ==========================================================================
   T03 — erişim izin grupları ve izinler

   Üreten: tools/vt/tohum-uret.mjs (npm run vt -- tohum). Bu dosyayı elle
   düzenlemeyin: kaynak değişince yeniden üretilir ve el değişikliği
   kaybolur. Kaynağı değiştirin, sonra "npm run vt -- tohum" çalıştırın.

   6 izin grubu, 23 izin.

   Kaynak: src/data/yetkiler.js YETKI_KATALOG; grup kodları
   tohum/kaynak/kod-eslesmeleri.json. Tasarım: tasarim.md 5.2 T03.
   Kaynakta olmayan izin pasifleştirilmez; adı değişen iznin eski kodu
   kod.EskiDegerEslesmesi (ListeAdi = erisim.Izin) ile taşınır: kaynağı
   kod-eslesmeleri.json eskiDegerler, satırları T01 yazar.

   Araç betiği tek işlemde, sahip girişiyle çalıştırır (BEGIN/COMMIT
   burada yazılmaz). İkinci çalıştırmada hiçbir satır değişmez.
   ========================================================================== */

/* erisim.IzinGrubu — 6 satır */

MERGE erisim.IzinGrubu AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'hesaplar', N'Hesaplar', 6),
        (N'musteriler', N'Müşteriler', 2),
        (N'parcaKatalogu', N'Yedek Parça Kataloğu', 4),
        (N'servisler', N'Servisler', 3),
        (N'talepler', N'Talepler', 1),
        (N'yonetim', N'Yönetim', 5)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* erisim.Izin — 23 satır */

MERGE erisim.Izin AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(200), v.Ad) AS Ad,
           CONVERT(nvarchar(40), v.GrupKodu) AS GrupKodu,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'destek', N'Destek kayıtlarını görür', N'yonetim', 5),
        (N'duyurular', N'Duyuru ve uyarı yayımlar', N'yonetim', 3),
        (N'geribildirim', N'Geri bildirimleri görür', N'yonetim', 4),
        (N'kayit', N'İşlem kaydını görür', N'yonetim', 6),
        (N'kimlikNo', N'Talepteki T.C. kimlik veya vergi numarasının tamamını görür', N'musteriler', 6),
        (N'makineAtama', N'Makineye servis atar ve satan bayiyi girer', N'musteriler', 3),
        (N'makineler', N'Kayıtlı makineleri görür', N'musteriler', 2),
        (N'musteriDuzenle', N'Müşteri bilgisini düzeltir', N'musteriler', 4),
        (N'musteriler', N'Müşterileri görür', N'musteriler', 1),
        (N'numara', N'Numara değişikliği talebini onaylar', N'musteriler', 5),
        (N'parcaKatalogDuzenle', N'Parça adını ve grubunu düzeltir, parçayı listeden kaldırır', N'parcaKatalogu', 2),
        (N'parcaKatalogu', N'Yedek parça kataloğunu görür', N'parcaKatalogu', 1),
        (N'personel', N'Personel listesini görür', N'hesaplar', 1),
        (N'personelDuzenle', N'Personel hesabı açar, kapatır ve rolünü değiştirir', N'hesaplar', 2),
        (N'raporlar', N'Raporları görür', N'yonetim', 1),
        (N'rolYonetimi', N'Rolleri ve yetkilerini düzenler', N'hesaplar', 3),
        (N'servisDuzenle', N'Servis kaydını, sorumluluk bölgesini ve servis hesabını değiştirir', N'servisler', 2),
        (N'servisIskontosu', N'Servislerin yedek parça iskontosunu değiştirir', N'parcaKatalogu', 3),
        (N'servisUcreti', N'Servislerin kilometre ve saat başına ücretlerini değiştirir', N'servisler', 3),
        (N'servisler', N'Servisleri ve bayileri görür', N'servisler', 1),
        (N'talepGeriAc', N'Kapanmış talebi yeniden açar, gönderilmiş servis siparişini iptal eder', N'talepler', 2),
        (N'talepler', N'Talepleri görür', N'talepler', 1),
        (N'yonetimOzeti', N'Dashboard’da şirket genelindeki sayıları görür', N'yonetim', 2)
    ) AS v (Kod, Ad, GrupKodu, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.GrupKodu COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.GrupKodu COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, GrupKodu = k.GrupKodu, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, GrupKodu, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.GrupKodu, k.Sira, 1);
