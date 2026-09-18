IF NOT EXISTS (SELECT 1 FROM sistem.Ortam WHERE OrnekVeriIzinli = 1) THROW 50001, N'<Codex metni: Bu veritabanı örnek veri almaz; örnek veri yalnız yerel ve sınama ortamında yüklenir.>', 1;
-- ÜRETİLDİ, elle düzenlemeyin
/* ==========================================================================
   O03 — sınama senaryolarının başlangıç verisi (yalnız sınama)

   Üreten: tools/vt/tohum-uret.mjs (npm run vt -- tohum). Bu dosyayı elle
   düzenlemeyin: kaynak değişince yeniden üretilir ve el değişikliği
   kaybolur. Kaynağı değiştirin, sonra "npm run vt -- tohum" çalıştırın.

   tasarim.md 5.4 ve Bölüm 7 (S02, S05) için sabit veri: "IŞIK Makina" servisi,
   "izmir.merkez" servis girişi (aramada IZMIR.MERKEZ), servis ve bayi LOGO cari
   kodları, çalışmayan (ayrılmış) bir personel, telefonu 0532 123 45 67 olan örnek
   müşteri ve ona ait IPAK-2024-00157 seri numaralı makine (servisi IŞIK Makina).
   SRV014 eski servis numarası O01'deki örnek servistedir (servisler.js SRV014).
   Kişi ve firma adları "Örnek" işaretlidir; TC ya da vergi numarası yoktur.

   Ortam sinama değilse betik hiçbir şey yazmaz. Yalnız yoksa ekler; O01 ve O02
   önce çalışmış olmalıdır.

   Araç betiği tek işlemde, sahip girişiyle çalıştırır (BEGIN/COMMIT
   burada yazılmaz). İkinci çalıştırmada hiçbir satır değişmez.
   ========================================================================== */

IF NOT EXISTS (SELECT 1 FROM sistem.Ortam WHERE OrtamKodu = N'sinama') RETURN;

/* servis.Servis — 1 satır, yalnız eksikler eklenir */

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
        (N'5fe351d0-d1bf-5627-ad17-6969f97f0dd0', N'IŞIK Makina (Örnek)', N'tuzel', N'aktif', 35, 35029, NULL, NULL)
    ) AS v (Kimlik, Ad, TurKodu, DurumKodu, IlKodu, IlceKodu, EskiKayitNo, EskiNumara)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM servis.Servis AS h WHERE h.Kimlik = k.Kimlik);

/* servis.MarkaYetkisi — 1 satır, yalnız eksikler eklenir */

INSERT INTO servis.MarkaYetkisi (ServisKimlik, MarkaKodu)
SELECT k.ServisKimlik, k.MarkaKodu
FROM (
    SELECT CONVERT(uniqueidentifier, v.ServisKimlik) AS ServisKimlik,
           CONVERT(nvarchar(20), v.MarkaKodu) AS MarkaKodu
    FROM (VALUES
        (N'5fe351d0-d1bf-5627-ad17-6969f97f0dd0', N'paksan')
    ) AS v (ServisKimlik, MarkaKodu)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM servis.MarkaYetkisi AS h WHERE h.ServisKimlik = k.ServisKimlik AND h.MarkaKodu = k.MarkaKodu);

/* erisim.Kullanici — 2 satır, yalnız eksikler eklenir */

INSERT INTO erisim.Kullanici (Kimlik, GirisAdi, TurKodu, Aktif)
SELECT k.Kimlik, k.GirisAdi, k.TurKodu, k.Aktif
FROM (
    SELECT CONVERT(uniqueidentifier, v.Kimlik) AS Kimlik,
           CONVERT(nvarchar(40), v.GirisAdi) AS GirisAdi,
           CONVERT(nvarchar(40), v.TurKodu) AS TurKodu,
           CONVERT(bit, v.Aktif) AS Aktif
    FROM (VALUES
        (N'2b1890b2-4baf-59e3-bf26-056d4001a5c3', N'ornek.ayrilan', N'personel', 0),
        (N'c451d63b-f853-5f43-82e1-ebd80a32f888', N'izmir.merkez', N'servis', 1)
    ) AS v (Kimlik, GirisAdi, TurKodu, Aktif)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM erisim.Kullanici AS h WHERE h.Kimlik = k.Kimlik);

/* servis.GirisHesabi — 1 satır, yalnız eksikler eklenir */

INSERT INTO servis.GirisHesabi (KullaniciKimlik, ServisKimlik)
SELECT k.KullaniciKimlik, k.ServisKimlik
FROM (
    SELECT CONVERT(uniqueidentifier, v.KullaniciKimlik) AS KullaniciKimlik,
           CONVERT(uniqueidentifier, v.ServisKimlik) AS ServisKimlik
    FROM (VALUES
        (N'c451d63b-f853-5f43-82e1-ebd80a32f888', N'5fe351d0-d1bf-5627-ad17-6969f97f0dd0')
    ) AS v (KullaniciKimlik, ServisKimlik)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM servis.GirisHesabi AS h WHERE h.KullaniciKimlik = k.KullaniciKimlik);

/* personel.Personel — 1 satır, yalnız eksikler eklenir */

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
        (N'e796e5dc-ae9d-5fd0-b358-87535b440115', N'Örnek Ayrılan Personel', N'2b1890b2-4baf-59e3-bf26-056d4001a5c3', N'9f30df05-459c-5571-a344-bf55e833e378', N'2026-01-01T00:00:00', NULL)
    ) AS v (Kimlik, AdSoyad, KullaniciKimlik, RolKimlik, AyrilmaZamani, EskiKayitNo)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM personel.Personel AS h WHERE h.Kimlik = k.Kimlik);

/* entegrasyon.CariKarti — 2 satır, yalnız eksikler eklenir */

INSERT INTO entegrasyon.CariKarti (Kimlik, DisSistemKodu, SirketKodu, CariKodu, ServisKimlik, BayiKimlik, KaynakKodu)
SELECT k.Kimlik, k.DisSistemKodu, k.SirketKodu, k.CariKodu, k.ServisKimlik, k.BayiKimlik, k.KaynakKodu
FROM (
    SELECT CONVERT(uniqueidentifier, v.Kimlik) AS Kimlik,
           CONVERT(nvarchar(40), v.DisSistemKodu) AS DisSistemKodu,
           CONVERT(nvarchar(20), v.SirketKodu) AS SirketKodu,
           CONVERT(nvarchar(32), v.CariKodu) AS CariKodu,
           CONVERT(uniqueidentifier, v.ServisKimlik) AS ServisKimlik,
           CONVERT(uniqueidentifier, v.BayiKimlik) AS BayiKimlik,
           CONVERT(nvarchar(40), v.KaynakKodu) AS KaynakKodu
    FROM (VALUES
        (N'78f59e7e-82ed-5996-9f22-12f60c1ba3a3', N'logo', N'paksan', N'120.ORNEK.0001', NULL, N'30654f3f-0888-59b8-9854-249bebf9507b', N'personel'),
        (N'de92f719-e3e8-5ad4-a0b2-f80a7f24de8a', N'logo', N'paksan', N'320.ORNEK.0001', N'5fe351d0-d1bf-5627-ad17-6969f97f0dd0', NULL, N'personel')
    ) AS v (Kimlik, DisSistemKodu, SirketKodu, CariKodu, ServisKimlik, BayiKimlik, KaynakKodu)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM entegrasyon.CariKarti AS h WHERE h.Kimlik = k.Kimlik);

/* musteri.Hesap — 1 satır, yalnız eksikler eklenir */

INSERT INTO musteri.Hesap (Kimlik, KonumUlkeKodu, IlKodu, TelefonUlkeKodu, TelefonE164, TelefonUlusal, DurumKodu, DilKodu)
SELECT k.Kimlik, k.KonumUlkeKodu, k.IlKodu, k.TelefonUlkeKodu, k.TelefonE164, k.TelefonUlusal, k.DurumKodu, k.DilKodu
FROM (
    SELECT CONVERT(uniqueidentifier, v.Kimlik) AS Kimlik,
           CONVERT(nvarchar(2), v.KonumUlkeKodu) AS KonumUlkeKodu,
           CONVERT(tinyint, v.IlKodu) AS IlKodu,
           CONVERT(nvarchar(2), v.TelefonUlkeKodu) AS TelefonUlkeKodu,
           CONVERT(nvarchar(16), v.TelefonE164) AS TelefonE164,
           CONVERT(nvarchar(15), v.TelefonUlusal) AS TelefonUlusal,
           CONVERT(nvarchar(40), v.DurumKodu) AS DurumKodu,
           CONVERT(nvarchar(5), v.DilKodu) AS DilKodu
    FROM (VALUES
        (N'788910e7-2a81-5f8c-b19f-792c59d1e08b', N'TR', 35, N'TR', N'+905321234567', N'5321234567', N'aktif', N'tr')
    ) AS v (Kimlik, KonumUlkeKodu, IlKodu, TelefonUlkeKodu, TelefonE164, TelefonUlusal, DurumKodu, DilKodu)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM musteri.Hesap AS h WHERE h.Kimlik = k.Kimlik);

/* musteri.HesapKisisi — 1 satır, yalnız eksikler eklenir */

INSERT INTO musteri.HesapKisisi (Kimlik, HesapKimlik, Adi, Soyadi, RolKodu, TelefonE164, TelefonUlusal)
SELECT k.Kimlik, k.HesapKimlik, k.Adi, k.Soyadi, k.RolKodu, k.TelefonE164, k.TelefonUlusal
FROM (
    SELECT CONVERT(uniqueidentifier, v.Kimlik) AS Kimlik,
           CONVERT(uniqueidentifier, v.HesapKimlik) AS HesapKimlik,
           CONVERT(nvarchar(75), v.Adi) AS Adi,
           CONVERT(nvarchar(75), v.Soyadi) AS Soyadi,
           CONVERT(nvarchar(40), v.RolKodu) AS RolKodu,
           CONVERT(nvarchar(16), v.TelefonE164) AS TelefonE164,
           CONVERT(nvarchar(15), v.TelefonUlusal) AS TelefonUlusal
    FROM (VALUES
        (N'0de21e59-2a6a-53df-8669-5a221955b3c8', N'788910e7-2a81-5f8c-b19f-792c59d1e08b', N'Örnek', N'Müşteri', N'hesapSahibi', N'+905321234567', N'5321234567')
    ) AS v (Kimlik, HesapKimlik, Adi, Soyadi, RolKodu, TelefonE164, TelefonUlusal)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM musteri.HesapKisisi AS h WHERE h.Kimlik = k.Kimlik);

/* musteri.HesapTelefonGecmisi — 1 satır, yalnız eksikler eklenir */

INSERT INTO musteri.HesapTelefonGecmisi (Kimlik, HesapKimlik, TelefonE164)
SELECT k.Kimlik, k.HesapKimlik, k.TelefonE164
FROM (
    SELECT CONVERT(uniqueidentifier, v.Kimlik) AS Kimlik,
           CONVERT(uniqueidentifier, v.HesapKimlik) AS HesapKimlik,
           CONVERT(nvarchar(16), v.TelefonE164) AS TelefonE164
    FROM (VALUES
        (N'40efcf81-8572-57fb-9354-12d347f4ab4d', N'788910e7-2a81-5f8c-b19f-792c59d1e08b', N'+905321234567')
    ) AS v (Kimlik, HesapKimlik, TelefonE164)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM musteri.HesapTelefonGecmisi AS h WHERE h.Kimlik = k.Kimlik);

/* makine.Makine — 1 satır, yalnız eksikler eklenir */

INSERT INTO makine.Makine (Kimlik, MarkaKodu, SeriNo, SeriNoYazildigiGibi, SeridenUretimYili, SeriBicimeUygun, UrunKodu, OlusmaKaynagiKodu, YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
SELECT k.Kimlik, k.MarkaKodu, k.SeriNo, k.SeriNoYazildigiGibi, k.SeridenUretimYili, k.SeriBicimeUygun, k.UrunKodu, k.OlusmaKaynagiKodu, k.YapanTuruKodu, k.YapanHesapKimlik, k.KaynakUygulamaKodu
FROM (
    SELECT CONVERT(uniqueidentifier, v.Kimlik) AS Kimlik,
           CONVERT(nvarchar(20), v.MarkaKodu) AS MarkaKodu,
           CONVERT(nvarchar(40), v.SeriNo) AS SeriNo,
           CONVERT(nvarchar(60), v.SeriNoYazildigiGibi) AS SeriNoYazildigiGibi,
           CONVERT(smallint, v.SeridenUretimYili) AS SeridenUretimYili,
           CONVERT(bit, v.SeriBicimeUygun) AS SeriBicimeUygun,
           CONVERT(nvarchar(60), v.UrunKodu) AS UrunKodu,
           CONVERT(nvarchar(40), v.OlusmaKaynagiKodu) AS OlusmaKaynagiKodu,
           CONVERT(nvarchar(40), v.YapanTuruKodu) AS YapanTuruKodu,
           CONVERT(uniqueidentifier, v.YapanHesapKimlik) AS YapanHesapKimlik,
           CONVERT(nvarchar(40), v.KaynakUygulamaKodu) AS KaynakUygulamaKodu
    FROM (VALUES
        (N'295daf69-0efd-5316-a645-bc4635ae287a', N'paksan', N'IPAK202400157', N'IPAK-2024-00157', 2024, 1, N'ipak-rulo', N'musteri', N'musteri', N'788910e7-2a81-5f8c-b19f-792c59d1e08b', N'connect')
    ) AS v (Kimlik, MarkaKodu, SeriNo, SeriNoYazildigiGibi, SeridenUretimYili, SeriBicimeUygun, UrunKodu, OlusmaKaynagiKodu, YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM makine.Makine AS h WHERE h.MarkaKodu = k.MarkaKodu AND h.SeriNo = k.SeriNo);

/* makine.MakineSahipligi — 1 satır, yalnız eksikler eklenir */

INSERT INTO makine.MakineSahipligi (Kimlik, MakineKimlik, HesapKimlik, KaynakKodu, YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
SELECT k.Kimlik, k.MakineKimlik, k.HesapKimlik, k.KaynakKodu, k.YapanTuruKodu, k.YapanHesapKimlik, k.KaynakUygulamaKodu
FROM (
    SELECT CONVERT(uniqueidentifier, v.Kimlik) AS Kimlik,
           CONVERT(uniqueidentifier, v.MakineKimlik) AS MakineKimlik,
           CONVERT(uniqueidentifier, v.HesapKimlik) AS HesapKimlik,
           CONVERT(nvarchar(40), v.KaynakKodu) AS KaynakKodu,
           CONVERT(nvarchar(40), v.YapanTuruKodu) AS YapanTuruKodu,
           CONVERT(uniqueidentifier, v.YapanHesapKimlik) AS YapanHesapKimlik,
           CONVERT(nvarchar(40), v.KaynakUygulamaKodu) AS KaynakUygulamaKodu
    FROM (VALUES
        (N'1d81a11b-9493-5140-8e86-828c4d8428b4', N'295daf69-0efd-5316-a645-bc4635ae287a', N'788910e7-2a81-5f8c-b19f-792c59d1e08b', N'musteri', N'musteri', N'788910e7-2a81-5f8c-b19f-792c59d1e08b', N'connect')
    ) AS v (Kimlik, MakineKimlik, HesapKimlik, KaynakKodu, YapanTuruKodu, YapanHesapKimlik, KaynakUygulamaKodu)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM makine.MakineSahipligi AS h WHERE h.Kimlik = k.Kimlik);

/* makine.MakineServisAtamasi — 1 satır, yalnız eksikler eklenir */

INSERT INTO makine.MakineServisAtamasi (Kimlik, MakineKimlik, MarkaKodu, ServisKimlik, KaynakKodu, YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
SELECT k.Kimlik, k.MakineKimlik, k.MarkaKodu, k.ServisKimlik, k.KaynakKodu, k.YapanTuruKodu, k.YapanKullaniciKimlik, k.YapanAdi, k.KaynakUygulamaKodu
FROM (
    SELECT CONVERT(uniqueidentifier, v.Kimlik) AS Kimlik,
           CONVERT(uniqueidentifier, v.MakineKimlik) AS MakineKimlik,
           CONVERT(nvarchar(20), v.MarkaKodu) AS MarkaKodu,
           CONVERT(uniqueidentifier, v.ServisKimlik) AS ServisKimlik,
           CONVERT(nvarchar(40), v.KaynakKodu) AS KaynakKodu,
           CONVERT(nvarchar(40), v.YapanTuruKodu) AS YapanTuruKodu,
           CONVERT(uniqueidentifier, v.YapanKullaniciKimlik) AS YapanKullaniciKimlik,
           CONVERT(nvarchar(150), v.YapanAdi) AS YapanAdi,
           CONVERT(nvarchar(40), v.KaynakUygulamaKodu) AS KaynakUygulamaKodu
    FROM (VALUES
        (N'46a1ce07-12e9-5a27-9b57-9433f2571a54', N'295daf69-0efd-5316-a645-bc4635ae287a', N'paksan', N'5fe351d0-d1bf-5627-ad17-6969f97f0dd0', N'personel', N'personel', N'8916244d-82d4-527e-b995-6a28942ffa1f', N'Örnek Admin', N'backoffice')
    ) AS v (Kimlik, MakineKimlik, MarkaKodu, ServisKimlik, KaynakKodu, YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM makine.MakineServisAtamasi AS h WHERE h.Kimlik = k.Kimlik);
