-- ÜRETİLDİ, elle düzenlemeyin
/* ==========================================================================
   B03 — varsayılan roller ve izinleri (başlangıç değerleri)

   Üreten: tools/vt/tohum-uret.mjs (npm run vt -- tohum). Bu dosyayı elle
   düzenlemeyin: kaynak değişince yeniden üretilir ve el değişikliği
   kaybolur. Kaynağı değiştirin, sonra "npm run vt -- tohum" çalıştırın.

   5 rol, 21 rol izni.

   Kaynak: src/data/yetkiler.js VARSAYILAN_ROLLER; rol kodları
   tohum/kaynak/kod-eslesmeleri.json. Kimlik UUIDv5 (ad alanı tasarim.md 1.6,
   ad metni erisim.Rol:<Kod>): her ortamda aynıdır. Tasarım: tasarim.md 5.3 B03.

   Yalnız yoksa ekler. Rolün izinleri yalnız rol bu çalıştırmada eklendiyse
   yazılır: PAKSAN bir rolden izin kaldırdıysa tohum onu geri getirmez.
   TumIzinler = 1 olan rol (admin) izin satırı almaz; bütün izinleri,
   sonradan eklenenler dahil, bu bayraktan alır.

   Araç betiği tek işlemde, sahip girişiyle çalıştırır (BEGIN/COMMIT
   burada yazılmaz). İkinci çalıştırmada hiçbir satır değişmez.
   ========================================================================== */

/* erisim.Rol — yalnız eksik roller; eklenenlerin kimliği izin eklemek için tutulur */
DECLARE @EklenenRol TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY);

INSERT INTO erisim.Rol (Kimlik, Kod, Ad, Aciklama, TumIzinler, Sistem, TalepTuruKodu, EskiKayitNo, Aktif)
OUTPUT inserted.Kimlik INTO @EklenenRol (Kimlik)
SELECT k.Kimlik, k.Kod, k.Ad, k.Aciklama, k.TumIzinler, k.Sistem, k.TalepTuruKodu, k.EskiKayitNo, 1
FROM (
    SELECT CONVERT(uniqueidentifier, v.Kimlik) AS Kimlik,
           CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(100), v.Ad) AS Ad,
           CONVERT(nvarchar(400), v.Aciklama) AS Aciklama,
           CONVERT(bit, v.TumIzinler) AS TumIzinler,
           CONVERT(bit, v.Sistem) AS Sistem,
           CONVERT(nvarchar(40), v.TalepTuruKodu) AS TalepTuruKodu,
           CONVERT(nvarchar(64), v.EskiKayitNo) AS EskiKayitNo
    FROM (VALUES
        (N'22d564ce-16cb-5318-b7a4-501ce952d952', N'admin', N'Admin', N'Her şeyi görür ve yapar; rolleri ve personel hesaplarını yönetir.', 1, 1, NULL, N'admin'),
        (N'7defff91-b3ae-5910-82ac-fe7159047ecc', N'yedek-parca', N'Yedek Parça', N'Yalnız yedek parça taleplerini görür.', 0, 0, N'parca', N'parca'),
        (N'8345a847-3bd9-5f34-9f8c-aa4dcb97c351', N'servis-masasi', N'Servis', N'Yalnız servis taleplerini görür.', 0, 0, N'servis', N'servis'),
        (N'9f30df05-459c-5571-a344-bf55e833e378', N'yonetici', N'Yönetici', N'Tüm talepleri ve raporları görür; personel listesini görür ancak değiştiremez.', 0, 0, NULL, N'yonetici'),
        (N'eeeafab2-0df0-57cf-8c30-69d0ae856d04', N'satis', N'Satış', N'Yalnız fiyat teklifi taleplerini görür; servis bölgelerini düzenleyebilir.', 0, 0, N'satinalma', N'satis')
    ) AS v (Kimlik, Kod, Ad, Aciklama, TumIzinler, Sistem, TalepTuruKodu, EskiKayitNo)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM erisim.Rol AS h WHERE h.Kimlik = k.Kimlik);

/* erisim.RolIzin — yalnız bu çalıştırmada eklenen rollere */
INSERT INTO erisim.RolIzin (RolKimlik, IzinKodu)
SELECT k.RolKimlik, k.IzinKodu
FROM (
    SELECT CONVERT(uniqueidentifier, v.RolKimlik) AS RolKimlik,
           CONVERT(nvarchar(40), v.IzinKodu) AS IzinKodu
    FROM (VALUES
        (N'7defff91-b3ae-5910-82ac-fe7159047ecc', N'musteriler'),
        (N'7defff91-b3ae-5910-82ac-fe7159047ecc', N'servisler'),
        (N'7defff91-b3ae-5910-82ac-fe7159047ecc', N'talepler'),
        (N'8345a847-3bd9-5f34-9f8c-aa4dcb97c351', N'musteriler'),
        (N'8345a847-3bd9-5f34-9f8c-aa4dcb97c351', N'servisler'),
        (N'8345a847-3bd9-5f34-9f8c-aa4dcb97c351', N'talepler'),
        (N'9f30df05-459c-5571-a344-bf55e833e378', N'destek'),
        (N'9f30df05-459c-5571-a344-bf55e833e378', N'duyurular'),
        (N'9f30df05-459c-5571-a344-bf55e833e378', N'geribildirim'),
        (N'9f30df05-459c-5571-a344-bf55e833e378', N'kayit'),
        (N'9f30df05-459c-5571-a344-bf55e833e378', N'musteriler'),
        (N'9f30df05-459c-5571-a344-bf55e833e378', N'personel'),
        (N'9f30df05-459c-5571-a344-bf55e833e378', N'raporlar'),
        (N'9f30df05-459c-5571-a344-bf55e833e378', N'servisDuzenle'),
        (N'9f30df05-459c-5571-a344-bf55e833e378', N'servisler'),
        (N'9f30df05-459c-5571-a344-bf55e833e378', N'talepler'),
        (N'9f30df05-459c-5571-a344-bf55e833e378', N'yonetimOzeti'),
        (N'eeeafab2-0df0-57cf-8c30-69d0ae856d04', N'musteriler'),
        (N'eeeafab2-0df0-57cf-8c30-69d0ae856d04', N'servisDuzenle'),
        (N'eeeafab2-0df0-57cf-8c30-69d0ae856d04', N'servisler'),
        (N'eeeafab2-0df0-57cf-8c30-69d0ae856d04', N'talepler')
    ) AS v (RolKimlik, IzinKodu)
) AS k
JOIN @EklenenRol AS e ON e.Kimlik = k.RolKimlik
WHERE NOT EXISTS (SELECT 1 FROM erisim.RolIzin AS h WHERE h.RolKimlik = k.RolKimlik AND h.IzinKodu = k.IzinKodu);
