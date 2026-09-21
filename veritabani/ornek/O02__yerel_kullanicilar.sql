IF NOT EXISTS (SELECT 1 FROM sistem.Ortam WHERE OrnekVeriIzinli = 1) THROW 50001, N'bu veritabanına örnek veri yüklenemez; betiği örnek veriye izin verilen yerel veya sınama veritabanında çalıştırın.', 1;
-- ÜRETİLDİ, elle düzenlemeyin
/* ==========================================================================
   O02 — örnek personel ve servis girişleri (yalnız yerel ve sınama)

   Üreten: tools/vt/tohum-uret.mjs (npm run vt -- tohum). Bu dosyayı elle
   düzenlemeyin: kaynak değişince yeniden üretilir ve el değişikliği
   kaybolur. Kaynağı değiştirin, sonra "npm run vt -- tohum" çalıştırın.

   5 personel girişi (her varsayılan role bir), 14 servis girişi (her O01 servisine bir).

   Kaynak: src/data/yetkiler.js VARSAYILAN_ROLLER (rol başına bir personel),
   src/marka/katalog/servisler.js (servis başına bir giriş). Giriş adı:
   personelde ornek.<rol kodu>, serviste servis kimliği (konya-servis → konya.servis).
   Şifre yazılmaz (SifreKaydi boş, SifreBelirlemeGerekli = 1): girişi açmak için
   tek kullanımlık kod gerekir (yonetim.GirisSifresiniSifirla).

   Yalnız yoksa ekler. O01 ve B03 (roller) önce çalışmış olmalıdır.

   Araç betiği tek işlemde, sahip girişiyle çalıştırır (BEGIN/COMMIT
   burada yazılmaz). İkinci çalıştırmada hiçbir satır değişmez.
   ========================================================================== */

/* erisim.Kullanici — 19 satır, yalnız eksikler eklenir; SifreKaydi boş, SifreBelirlemeGerekli varsayılanı 1 */

INSERT INTO erisim.Kullanici (Kimlik, GirisAdi, TurKodu, Aktif)
SELECT k.Kimlik, k.GirisAdi, k.TurKodu, k.Aktif
FROM (
    SELECT CONVERT(uniqueidentifier, v.Kimlik) AS Kimlik,
           CONVERT(nvarchar(40), v.GirisAdi) AS GirisAdi,
           CONVERT(nvarchar(40), v.TurKodu) AS TurKodu,
           CONVERT(bit, v.Aktif) AS Aktif
    FROM (VALUES
        (N'151fe9ed-08ad-586c-b726-e90e0aa69a0d', N'tekirdag.servis', N'servis', 1),
        (N'32f2192b-5c6a-5db6-939c-7b282571e29c', N'antalya.servis', N'servis', 1),
        (N'3ae70227-c865-57ba-9b7d-a11d0abcc163', N'izmir.servis', N'servis', 1),
        (N'3c63e231-8ebc-57ea-8362-9573ff4bff3b', N'bandirma.servis', N'servis', 1),
        (N'5de936c5-c020-5529-8782-60b82d8ea92f', N'erzurum.servis', N'servis', 1),
        (N'64b22a2e-633c-5d83-b4cc-34b8399e6746', N'adana.servis', N'servis', 1),
        (N'7828618e-a09f-5e4a-a174-5defdab04705', N'kayseri.servis', N'servis', 1),
        (N'8450e74c-4f08-55f4-8301-6c46119b323b', N'ornek.servis.masasi', N'personel', 1),
        (N'8916244d-82d4-527e-b995-6a28942ffa1f', N'ornek.admin', N'personel', 1),
        (N'8dfaba98-1c5d-5779-a0af-43ba06959151', N'konya.servis', N'servis', 1),
        (N'9a0bdda9-b3d2-5b33-b117-f2d65be5f81e', N'urfa.servis', N'servis', 1),
        (N'9d678377-bac3-5186-b0a0-1f3f0974ca09', N'ornek.satis', N'personel', 1),
        (N'aa62a868-e97c-5328-b529-212240fcc664', N'manisa.servis', N'servis', 1),
        (N'c10b4770-f7d1-51fd-970c-b6836164a923', N'malatya.servis', N'servis', 1),
        (N'c43d40fa-5f02-5db0-8a35-45267c0ea86c', N'ornek.yonetici', N'personel', 1),
        (N'da482122-7981-5181-94ab-d2ef56678f42', N'ankara.servis', N'servis', 1),
        (N'ddbdb63e-2798-548e-b421-683f38a7114a', N'samsun.servis', N'servis', 1),
        (N'e11735e6-5f51-5a15-b664-841a0dfbce68', N'ornek.yedek.parca', N'personel', 1),
        (N'ef383866-5a33-5939-8939-4b8f0509459b', N'eskisehir.servis', N'servis', 1)
    ) AS v (Kimlik, GirisAdi, TurKodu, Aktif)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM erisim.Kullanici AS h WHERE h.Kimlik = k.Kimlik);

/* personel.Personel — 5 satır, yalnız eksikler eklenir */

INSERT INTO personel.Personel (Kimlik, AdSoyad, KullaniciKimlik, RolKimlik, AyrilmaZamani, EskiKayitNo)
SELECT k.Kimlik, k.AdSoyad, k.KullaniciKimlik, k.RolKimlik, k.AyrilmaZamani, k.EskiKayitNo
FROM (
    SELECT CONVERT(uniqueidentifier, v.Kimlik) AS Kimlik,
           CONVERT(nvarchar(150), v.AdSoyad) AS AdSoyad,
           CONVERT(uniqueidentifier, v.KullaniciKimlik) AS KullaniciKimlik,
           CONVERT(uniqueidentifier, v.RolKimlik) AS RolKimlik,
           CONVERT(datetime2(3), v.AyrilmaZamani) AS AyrilmaZamani,
           CONVERT(nvarchar(64), v.EskiKayitNo) AS EskiKayitNo
    FROM (VALUES
        (N'47adb9bd-50ec-51f7-8cd9-b88f0231ae93', N'Örnek Servis', N'8450e74c-4f08-55f4-8301-6c46119b323b', N'8345a847-3bd9-5f34-9f8c-aa4dcb97c351', NULL, NULL),
        (N'9807ce62-b05c-56cb-ae8c-9b4dd7b52154', N'Örnek Yedek Parça', N'e11735e6-5f51-5a15-b664-841a0dfbce68', N'7defff91-b3ae-5910-82ac-fe7159047ecc', NULL, NULL),
        (N'9b67b7ab-619b-5007-80aa-165814eb0f79', N'Örnek Admin', N'8916244d-82d4-527e-b995-6a28942ffa1f', N'22d564ce-16cb-5318-b7a4-501ce952d952', NULL, NULL),
        (N'b51d736f-c78a-5d96-94cc-9bfda65bf3f8', N'Örnek Satış', N'9d678377-bac3-5186-b0a0-1f3f0974ca09', N'eeeafab2-0df0-57cf-8c30-69d0ae856d04', NULL, NULL),
        (N'c21ea133-a1eb-5470-8623-16d0f74d1e25', N'Örnek Yönetici', N'c43d40fa-5f02-5db0-8a35-45267c0ea86c', N'9f30df05-459c-5571-a344-bf55e833e378', NULL, NULL)
    ) AS v (Kimlik, AdSoyad, KullaniciKimlik, RolKimlik, AyrilmaZamani, EskiKayitNo)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM personel.Personel AS h WHERE h.Kimlik = k.Kimlik);

/* servis.GirisHesabi — 14 satır, yalnız eksikler eklenir */

INSERT INTO servis.GirisHesabi (KullaniciKimlik, ServisKimlik)
SELECT k.KullaniciKimlik, k.ServisKimlik
FROM (
    SELECT CONVERT(uniqueidentifier, v.KullaniciKimlik) AS KullaniciKimlik,
           CONVERT(uniqueidentifier, v.ServisKimlik) AS ServisKimlik
    FROM (VALUES
        (N'151fe9ed-08ad-586c-b726-e90e0aa69a0d', N'843afa44-e311-5861-9f6c-a623178b8d37'),
        (N'32f2192b-5c6a-5db6-939c-7b282571e29c', N'5be53b46-81a4-568c-9b3c-0e45dd00636f'),
        (N'3ae70227-c865-57ba-9b7d-a11d0abcc163', N'7fac6e68-c4b1-587e-9c18-8a6211fe53e7'),
        (N'3c63e231-8ebc-57ea-8362-9573ff4bff3b', N'b3188834-8067-5d5d-8ba7-8554b3f6b347'),
        (N'5de936c5-c020-5529-8782-60b82d8ea92f', N'17315569-ead0-5587-b6fe-f78939702859'),
        (N'64b22a2e-633c-5d83-b4cc-34b8399e6746', N'62716bb9-9efd-55fc-a361-e7aed1c811e7'),
        (N'7828618e-a09f-5e4a-a174-5defdab04705', N'd9924434-dd1c-5b1b-91b7-3ad5f2f26eac'),
        (N'8dfaba98-1c5d-5779-a0af-43ba06959151', N'8143c2f1-7dba-51f7-8abe-3128aeea5475'),
        (N'9a0bdda9-b3d2-5b33-b117-f2d65be5f81e', N'e050df00-715e-5a59-b791-c428c8a96f6b'),
        (N'aa62a868-e97c-5328-b529-212240fcc664', N'4d938c72-2e21-505f-82f1-183c74563f46'),
        (N'c10b4770-f7d1-51fd-970c-b6836164a923', N'42d86ede-dddd-5068-9ae6-28e526cc714a'),
        (N'da482122-7981-5181-94ab-d2ef56678f42', N'b98e0dbf-bd52-535f-bee8-d2ce3b002cb6'),
        (N'ddbdb63e-2798-548e-b421-683f38a7114a', N'2a87e56b-c980-56d5-a7ab-9458df403eb3'),
        (N'ef383866-5a33-5939-8939-4b8f0509459b', N'4df80ac4-9534-58d0-b804-57b0f1881344')
    ) AS v (KullaniciKimlik, ServisKimlik)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM servis.GirisHesabi AS h WHERE h.KullaniciKimlik = k.KullaniciKimlik);
