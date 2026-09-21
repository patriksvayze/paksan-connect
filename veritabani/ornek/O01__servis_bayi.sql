IF NOT EXISTS (SELECT 1 FROM sistem.Ortam WHERE OrnekVeriIzinli = 1) THROW 50001, N'bu veritabanına örnek veri yüklenemez; betiği örnek veriye izin verilen yerel veya sınama veritabanında çalıştırın.', 1;
-- ÜRETİLDİ, elle düzenlemeyin
/* ==========================================================================
   O01 — örnek servisler ve bayiler (yalnız yerel ve sınama)

   Üreten: tools/vt/tohum-uret.mjs (npm run vt -- tohum). Bu dosyayı elle
   düzenlemeyin: kaynak değişince yeniden üretilir ve el değişikliği
   kaybolur. Kaynağı değiştirin, sonra "npm run vt -- tohum" çalıştırın.

   14 servis, 20 bayi, 20 bayi bağı, 0 bölge; hepsine paksan yetkisi.

   Kaynak: src/marka/katalog/servisler.js ve bayiler.js (temsilî liste). id →
   EskiKayitNo, no → EskiNumara. Adların başına "Örnek" eklenir; kaynaktaki
   adres ve telefonlar yazılmaz (uydurma değerler gerçek bir kişiye ait olabilir).
   Kimlikler UUIDv5 (<sema>.<Tablo>:<id>): her kurulumda aynıdır.

   Yalnız yoksa ekler. Test ve canlıda ilk satır 50001 ile durur.

   Araç betiği tek işlemde, sahip girişiyle çalıştırır (BEGIN/COMMIT
   burada yazılmaz). İkinci çalıştırmada hiçbir satır değişmez.
   ========================================================================== */

/* bayi.Bayi — 20 satır, yalnız eksikler eklenir */

INSERT INTO bayi.Bayi (Kimlik, Ad, DurumKodu, IlKodu, IlceKodu, EskiKayitNo, EskiNumara)
SELECT k.Kimlik, k.Ad, k.DurumKodu, k.IlKodu, k.IlceKodu, k.EskiKayitNo, k.EskiNumara
FROM (
    SELECT CONVERT(uniqueidentifier, v.Kimlik) AS Kimlik,
           CONVERT(nvarchar(200), v.Ad) AS Ad,
           CONVERT(nvarchar(40), v.DurumKodu) AS DurumKodu,
           CONVERT(tinyint, v.IlKodu) AS IlKodu,
           CONVERT(int, v.IlceKodu) AS IlceKodu,
           CONVERT(nvarchar(64), v.EskiKayitNo) AS EskiKayitNo,
           CONVERT(nvarchar(20), v.EskiNumara) AS EskiNumara
    FROM (VALUES
        (N'11c45ee7-c229-513c-a1ee-8bcbe87d6334', N'Örnek Çukurova Makine Ticaret', N'aktif', 1, 1002, N'adana', N'BAY011'),
        (N'26a4a3a1-9d32-557e-be4c-a150fa69c222', N'Örnek Ovataş Tarım Makineleri', N'aktif', 68, 68005, N'aksaray', N'BAY002'),
        (N'2a925ba4-1aa0-57d4-9f7b-bee0fd3d8f4c', N'Örnek Başkent Tarım Ekipmanları', N'aktif', 6, 6021, N'ankara', N'BAY003'),
        (N'30654f3f-0888-59b8-9854-249bebf9507b', N'Örnek Ege Balya Sistemleri', N'aktif', 35, 35029, N'izmir', N'BAY007'),
        (N'37a14dd1-09dd-58b7-8978-138963c972ce', N'Örnek Trakya Balya Makineleri', N'aktif', 59, 59006, N'tekirdag', N'BAY020'),
        (N'3909cf4e-90ed-5222-acc0-47a0ba457b15', N'Örnek Hitit Tarım Ekipmanları', N'aktif', 19, 19013, N'corum', N'BAY018'),
        (N'3cc8031d-0e6b-529b-bf5a-fa42efee1a6e', N'Örnek Uludağ Tarım Teknolojileri', N'aktif', 16, 16007, N'bursa', N'BAY006'),
        (N'40176ead-6013-532b-b7af-d8de7ecb52b5', N'Örnek PAKSAN Konya Ana Bayi', N'aktif', 42, 42026, N'konya-merkez', N'BAY001'),
        (N'4a4c584f-736e-5ddd-befb-22223023cce5', N'Örnek Marmara Ziraat Makineleri', N'aktif', 10, 10004, N'balikesir', N'BAY005'),
        (N'63d2b82f-ff29-579e-a08a-7bdcb85cb5e8', N'Örnek Doğu Anadolu Tarım Makineleri', N'aktif', 25, 25014, N'erzurum', N'BAY019'),
        (N'6622f757-2313-50bd-9ee2-365d8b258cf0', N'Örnek Fırat Ziraat Makineleri', N'aktif', 44, 44004, N'malatya', N'BAY014'),
        (N'b3205793-c48e-58ad-b32c-5f9e58376740', N'Örnek Erciyes Tarım Sistemleri', N'aktif', 38, 38003, N'kayseri', N'BAY015'),
        (N'b57f3c7f-2d63-5e18-b001-9e20b8da1893', N'Örnek Dicle Tarım Makineleri', N'aktif', 21, 21002, N'diyarbakir', N'BAY013'),
        (N'c4257678-383b-5061-a0bd-4b97e7fd0a29', N'Örnek Gediz Tarım Makineleri', N'aktif', 45, 45010, N'manisa', N'BAY008'),
        (N'c8748b93-ed1b-56ff-8c93-d0df70cf4289', N'Örnek Karadeniz Tarım Makineleri', N'aktif', 55, 55006, N'samsun', N'BAY017'),
        (N'c960fe22-c497-5230-b6cd-672969dce02d', N'Örnek Kızılırmak Tarım', N'aktif', 58, 58014, N'sivas', N'BAY016'),
        (N'de2cbf74-337d-51f4-8d15-0a7b3a9126a9', N'Örnek Menderes Ziraat', N'aktif', 9, 9015, N'aydin', N'BAY009'),
        (N'df0b0835-a9ad-5bd4-9d54-dc9ac8e317a1', N'Örnek Harran Tarım Ekipmanları', N'aktif', 63, 63013, N'sanliurfa', N'BAY012'),
        (N'ec95b3cc-4406-5563-bdcf-5f9785cdb801', N'Örnek Akdeniz Tarım Makineleri', N'aktif', 7, 7015, N'antalya', N'BAY010'),
        (N'fdee4e3a-38fe-559c-aa29-ab12030cd6af', N'Örnek Porsuk Tarım Makineleri', N'aktif', 26, 26001, N'eskisehir', N'BAY004')
    ) AS v (Kimlik, Ad, DurumKodu, IlKodu, IlceKodu, EskiKayitNo, EskiNumara)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM bayi.Bayi AS h WHERE h.Kimlik = k.Kimlik);

/* servis.Servis — 14 satır, yalnız eksikler eklenir */

INSERT INTO servis.Servis (Kimlik, Ad, TurKodu, DurumKodu, IlKodu, IlceKodu, EskiKayitNo, EskiNumara)
SELECT k.Kimlik, k.Ad, k.TurKodu, k.DurumKodu, k.IlKodu, k.IlceKodu, k.EskiKayitNo, k.EskiNumara
FROM (
    SELECT CONVERT(uniqueidentifier, v.Kimlik) AS Kimlik,
           CONVERT(nvarchar(200), v.Ad) AS Ad,
           CONVERT(nvarchar(40), v.TurKodu) AS TurKodu,
           CONVERT(nvarchar(40), v.DurumKodu) AS DurumKodu,
           CONVERT(tinyint, v.IlKodu) AS IlKodu,
           CONVERT(int, v.IlceKodu) AS IlceKodu,
           CONVERT(nvarchar(64), v.EskiKayitNo) AS EskiKayitNo,
           CONVERT(nvarchar(20), v.EskiNumara) AS EskiNumara
    FROM (VALUES
        (N'17315569-ead0-5587-b6fe-f78939702859', N'Örnek Ahmet Solmaz Tarım Servisi', N'sahis', N'aktif', 25, 25014, N'erzurum-servis', N'SRV013'),
        (N'2a87e56b-c980-56d5-a7ab-9458df403eb3', N'Örnek Bafra Tarım Servisi', N'tuzel', N'aktif', 55, 55006, N'samsun-servis', N'SRV012'),
        (N'42d86ede-dddd-5068-9ae6-28e526cc714a', N'Örnek Fırat Teknik Servis', N'tuzel', N'aktif', 44, 44004, N'malatya-servis', N'SRV010'),
        (N'4d938c72-2e21-505f-82f1-183c74563f46', N'Örnek Salihli Tarım Servisi', N'tuzel', N'aktif', 45, 45010, N'manisa-servis', N'SRV006'),
        (N'4df80ac4-9534-58d0-b804-57b0f1881344', N'Örnek Porsuk Teknik Servis', N'tuzel', N'aktif', 26, 26001, N'eskisehir-servis', N'SRV003'),
        (N'5be53b46-81a4-568c-9b3c-0e45dd00636f', N'Örnek Hüseyin Kara Tarım Servisi', N'sahis', N'aktif', 7, 7015, N'antalya-servis', N'SRV007'),
        (N'62716bb9-9efd-55fc-a361-e7aed1c811e7', N'Örnek Çukurova Teknik Servis', N'tuzel', N'aktif', 1, 1002, N'adana-servis', N'SRV008'),
        (N'7fac6e68-c4b1-587e-9c18-8a6211fe53e7', N'Örnek Ege Teknik Servis', N'tuzel', N'aktif', 35, 35029, N'izmir-servis', N'SRV005'),
        (N'8143c2f1-7dba-51f7-8abe-3128aeea5475', N'Örnek Selçuk Tarım Servisi', N'tuzel', N'aktif', 42, 42026, N'konya-servis', N'SRV001'),
        (N'843afa44-e311-5861-9f6c-a623178b8d37', N'Örnek Trakya Teknik Servis', N'tuzel', N'aktif', 59, 59006, N'tekirdag-servis', N'SRV014'),
        (N'b3188834-8067-5d5d-8ba7-8554b3f6b347', N'Örnek Kemal Aydın Tarım Servisi', N'sahis', N'aktif', 10, 10004, N'bandirma-servis', N'SRV004'),
        (N'b98e0dbf-bd52-535f-bee8-d2ce3b002cb6', N'Örnek Polatlı Tarım Servisi', N'tuzel', N'aktif', 6, 6021, N'ankara-servis', N'SRV002'),
        (N'd9924434-dd1c-5b1b-91b7-3ad5f2f26eac', N'Örnek Erciyes Tarım Servisi', N'tuzel', N'aktif', 38, 38003, N'kayseri-servis', N'SRV011'),
        (N'e050df00-715e-5a59-b791-c428c8a96f6b', N'Örnek Harran Teknik Servis', N'tuzel', N'aktif', 63, 63013, N'urfa-servis', N'SRV009')
    ) AS v (Kimlik, Ad, TurKodu, DurumKodu, IlKodu, IlceKodu, EskiKayitNo, EskiNumara)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM servis.Servis AS h WHERE h.Kimlik = k.Kimlik);

/* servis.BayiBagi — 20 satır, yalnız eksikler eklenir */

INSERT INTO servis.BayiBagi (ServisKimlik, BayiKimlik)
SELECT k.ServisKimlik, k.BayiKimlik
FROM (
    SELECT CONVERT(uniqueidentifier, v.ServisKimlik) AS ServisKimlik,
           CONVERT(uniqueidentifier, v.BayiKimlik) AS BayiKimlik
    FROM (VALUES
        (N'17315569-ead0-5587-b6fe-f78939702859', N'63d2b82f-ff29-579e-a08a-7bdcb85cb5e8'),
        (N'2a87e56b-c980-56d5-a7ab-9458df403eb3', N'3909cf4e-90ed-5222-acc0-47a0ba457b15'),
        (N'2a87e56b-c980-56d5-a7ab-9458df403eb3', N'c8748b93-ed1b-56ff-8c93-d0df70cf4289'),
        (N'42d86ede-dddd-5068-9ae6-28e526cc714a', N'6622f757-2313-50bd-9ee2-365d8b258cf0'),
        (N'4d938c72-2e21-505f-82f1-183c74563f46', N'c4257678-383b-5061-a0bd-4b97e7fd0a29'),
        (N'4df80ac4-9534-58d0-b804-57b0f1881344', N'fdee4e3a-38fe-559c-aa29-ab12030cd6af'),
        (N'5be53b46-81a4-568c-9b3c-0e45dd00636f', N'ec95b3cc-4406-5563-bdcf-5f9785cdb801'),
        (N'62716bb9-9efd-55fc-a361-e7aed1c811e7', N'11c45ee7-c229-513c-a1ee-8bcbe87d6334'),
        (N'7fac6e68-c4b1-587e-9c18-8a6211fe53e7', N'30654f3f-0888-59b8-9854-249bebf9507b'),
        (N'7fac6e68-c4b1-587e-9c18-8a6211fe53e7', N'de2cbf74-337d-51f4-8d15-0a7b3a9126a9'),
        (N'8143c2f1-7dba-51f7-8abe-3128aeea5475', N'26a4a3a1-9d32-557e-be4c-a150fa69c222'),
        (N'8143c2f1-7dba-51f7-8abe-3128aeea5475', N'40176ead-6013-532b-b7af-d8de7ecb52b5'),
        (N'843afa44-e311-5861-9f6c-a623178b8d37', N'37a14dd1-09dd-58b7-8978-138963c972ce'),
        (N'b3188834-8067-5d5d-8ba7-8554b3f6b347', N'3cc8031d-0e6b-529b-bf5a-fa42efee1a6e'),
        (N'b3188834-8067-5d5d-8ba7-8554b3f6b347', N'4a4c584f-736e-5ddd-befb-22223023cce5'),
        (N'b98e0dbf-bd52-535f-bee8-d2ce3b002cb6', N'2a925ba4-1aa0-57d4-9f7b-bee0fd3d8f4c'),
        (N'd9924434-dd1c-5b1b-91b7-3ad5f2f26eac', N'b3205793-c48e-58ad-b32c-5f9e58376740'),
        (N'd9924434-dd1c-5b1b-91b7-3ad5f2f26eac', N'c960fe22-c497-5230-b6cd-672969dce02d'),
        (N'e050df00-715e-5a59-b791-c428c8a96f6b', N'b57f3c7f-2d63-5e18-b001-9e20b8da1893'),
        (N'e050df00-715e-5a59-b791-c428c8a96f6b', N'df0b0835-a9ad-5bd4-9d54-dc9ac8e317a1')
    ) AS v (ServisKimlik, BayiKimlik)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM servis.BayiBagi AS h WHERE h.ServisKimlik = k.ServisKimlik AND h.BayiKimlik = k.BayiKimlik);

/* servis.Bolge — 0 satır, yalnız eksikler eklenir */
-- Kaynakta satır yok.

/* servis.MarkaYetkisi — 14 satır, yalnız eksikler eklenir */

INSERT INTO servis.MarkaYetkisi (ServisKimlik, MarkaKodu)
SELECT k.ServisKimlik, k.MarkaKodu
FROM (
    SELECT CONVERT(uniqueidentifier, v.ServisKimlik) AS ServisKimlik,
           CONVERT(nvarchar(20), v.MarkaKodu) AS MarkaKodu
    FROM (VALUES
        (N'17315569-ead0-5587-b6fe-f78939702859', N'paksan'),
        (N'2a87e56b-c980-56d5-a7ab-9458df403eb3', N'paksan'),
        (N'42d86ede-dddd-5068-9ae6-28e526cc714a', N'paksan'),
        (N'4d938c72-2e21-505f-82f1-183c74563f46', N'paksan'),
        (N'4df80ac4-9534-58d0-b804-57b0f1881344', N'paksan'),
        (N'5be53b46-81a4-568c-9b3c-0e45dd00636f', N'paksan'),
        (N'62716bb9-9efd-55fc-a361-e7aed1c811e7', N'paksan'),
        (N'7fac6e68-c4b1-587e-9c18-8a6211fe53e7', N'paksan'),
        (N'8143c2f1-7dba-51f7-8abe-3128aeea5475', N'paksan'),
        (N'843afa44-e311-5861-9f6c-a623178b8d37', N'paksan'),
        (N'b3188834-8067-5d5d-8ba7-8554b3f6b347', N'paksan'),
        (N'b98e0dbf-bd52-535f-bee8-d2ce3b002cb6', N'paksan'),
        (N'd9924434-dd1c-5b1b-91b7-3ad5f2f26eac', N'paksan'),
        (N'e050df00-715e-5a59-b791-c428c8a96f6b', N'paksan')
    ) AS v (ServisKimlik, MarkaKodu)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM servis.MarkaYetkisi AS h WHERE h.ServisKimlik = k.ServisKimlik AND h.MarkaKodu = k.MarkaKodu);

/* bayi.MarkaYetkisi — 20 satır, yalnız eksikler eklenir */

INSERT INTO bayi.MarkaYetkisi (BayiKimlik, MarkaKodu)
SELECT k.BayiKimlik, k.MarkaKodu
FROM (
    SELECT CONVERT(uniqueidentifier, v.BayiKimlik) AS BayiKimlik,
           CONVERT(nvarchar(20), v.MarkaKodu) AS MarkaKodu
    FROM (VALUES
        (N'11c45ee7-c229-513c-a1ee-8bcbe87d6334', N'paksan'),
        (N'26a4a3a1-9d32-557e-be4c-a150fa69c222', N'paksan'),
        (N'2a925ba4-1aa0-57d4-9f7b-bee0fd3d8f4c', N'paksan'),
        (N'30654f3f-0888-59b8-9854-249bebf9507b', N'paksan'),
        (N'37a14dd1-09dd-58b7-8978-138963c972ce', N'paksan'),
        (N'3909cf4e-90ed-5222-acc0-47a0ba457b15', N'paksan'),
        (N'3cc8031d-0e6b-529b-bf5a-fa42efee1a6e', N'paksan'),
        (N'40176ead-6013-532b-b7af-d8de7ecb52b5', N'paksan'),
        (N'4a4c584f-736e-5ddd-befb-22223023cce5', N'paksan'),
        (N'63d2b82f-ff29-579e-a08a-7bdcb85cb5e8', N'paksan'),
        (N'6622f757-2313-50bd-9ee2-365d8b258cf0', N'paksan'),
        (N'b3205793-c48e-58ad-b32c-5f9e58376740', N'paksan'),
        (N'b57f3c7f-2d63-5e18-b001-9e20b8da1893', N'paksan'),
        (N'c4257678-383b-5061-a0bd-4b97e7fd0a29', N'paksan'),
        (N'c8748b93-ed1b-56ff-8c93-d0df70cf4289', N'paksan'),
        (N'c960fe22-c497-5230-b6cd-672969dce02d', N'paksan'),
        (N'de2cbf74-337d-51f4-8d15-0a7b3a9126a9', N'paksan'),
        (N'df0b0835-a9ad-5bd4-9d54-dc9ac8e317a1', N'paksan'),
        (N'ec95b3cc-4406-5563-bdcf-5f9785cdb801', N'paksan'),
        (N'fdee4e3a-38fe-559c-aa29-ab12030cd6af', N'paksan')
    ) AS v (BayiKimlik, MarkaKodu)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM bayi.MarkaYetkisi AS h WHERE h.BayiKimlik = k.BayiKimlik AND h.MarkaKodu = k.MarkaKodu);
