-- ÜRETİLDİ, elle düzenlemeyin
/* ==========================================================================
   T08 — saklama kuralları

   Üreten: tools/vt/tohum-uret.mjs (npm run vt -- tohum). Bu dosyayı elle
   düzenlemeyin: kaynak değişince yeniden üretilir ve el değişikliği
   kaybolur. Kaynağı değiştirin, sonra "npm run vt -- tohum" çalıştırın.

   13 kural.

   Kaynak: tohum/kaynak/saklama-kurallari.json (tasarim.md 1.13.4). Hukukçu kararı
   bu dosyadan değişir. Kaynakta olmayan kural pasifleştirilmez ve silinmez.

   Araç betiği tek işlemde, sahip girişiyle çalıştırır (BEGIN/COMMIT
   burada yazılmaz). İkinci çalıştırmada hiçbir satır değişmez.
   ========================================================================== */

/* sistem.SaklamaKurali — 13 satır */

MERGE sistem.SaklamaKurali AS h
USING (
    SELECT CONVERT(nvarchar(40), v.KayitTuruKodu) AS KayitTuruKodu,
           CONVERT(int, v.SureGun) AS SureGun,
           CONVERT(nvarchar(40), v.EylemKodu) AS EylemKodu,
           CONVERT(bit, v.HukukOnayli) AS HukukOnayli,
           CONVERT(nvarchar(400), v.Aciklama) AS Aciklama
    FROM (VALUES
        (N'dekont', NULL, N'sakla', 0, N'dosya.Dosya (dekont sınıfı); hukukçu süre verene kadar saklanır.'),
        (N'destekOturumu', 730, N'sil', 0, N'Önce destek.SohbetOlayi, sonra olayı kalmayan destek.SohbetOturumu; zaman ölçütü SohbetOturumu.SonHareketZamani.'),
        (N'dogrulamaKodu', 30, N'sil', 0, N'erisim.DogrulamaKodu; zaman ölçütü OlusmaZamani.'),
        (N'giden', 180, N'sil', 0, N'sistem.Giden (gonderildi, vazgecildi). Teslimata ya da doğrulama koduna bağlı satırda yalnız Govde, Konu, DegiskenlerJson, AliciAdres boşaltılır; bağsız satır ekleriyle silinir. Zaman ölçütü COALESCE(GonderilmeZamani, OlusmaZamani).'),
        (N'girisDenemesi', 90, N'sil', 0, N'erisim.GirisDenemesi; zaman ölçütü DenemeZamani.'),
        (N'iceAktarimSatiri', 90, N'bosalt', 0, N'entegrasyon.IceAktarimSatiri.HamVeriJson boşaltılır (içe aktarım uygulandi ya da hata); zaman ölçütü IceAktarim.OlusmaZamani.'),
        (N'iptalTalepDosyasi', 730, N'sil', 0, N'İptal edilmiş talebin genel sınıflı dosyaları (TalepEki, EklemeEki, ses); satır silinmez, SilinmeIstendiZamani yazılır. Zaman ölçütü Talep.KapanmaZamani.'),
        (N'islemKaydi', NULL, N'sakla', 0, N'denetim.IslemKaydi; saklanır, silinmez.'),
        (N'logoSeriSorgusu', 30, N'sil', 0, N'entegrasyon.LogoSeriSorgusu (makine.KayitOlayi''nın başvurmadığı); zaman ölçütü GecerlilikBitisZamani.'),
        (N'oturum', 365, N'sil', 0, N'erisim.Oturum (kapanmış ya da süresi bitmiş); zaman ölçütü COALESCE(KapanmaZamani, BitisZamani).'),
        (N'rizaOlayi', NULL, N'sakla', 0, N'kvkk.RizaOlayi; yasal kanıt olarak saklanır.'),
        (N'sifreSifirlamaJetonu', 30, N'sil', 0, N'erisim.SifreSifirlamaJetonu; zaman ölçütü SonGecerlilikZamani.'),
        (N'tekrarAnahtari', 1, N'sil', 0, N'sistem.TekrarAnahtari; zaman ölçütü SonGecerlilikZamani.')
    ) AS v (KayitTuruKodu, SureGun, EylemKodu, HukukOnayli, Aciklama)
) AS k
    ON h.KayitTuruKodu = k.KayitTuruKodu
WHEN MATCHED AND EXISTS (SELECT k.SureGun, k.EylemKodu COLLATE Latin1_General_100_BIN2, k.HukukOnayli, k.Aciklama COLLATE Latin1_General_100_BIN2 EXCEPT SELECT h.SureGun, h.EylemKodu COLLATE Latin1_General_100_BIN2, h.HukukOnayli, h.Aciklama COLLATE Latin1_General_100_BIN2) THEN
    UPDATE SET SureGun = k.SureGun, EylemKodu = k.EylemKodu, HukukOnayli = k.HukukOnayli, Aciklama = k.Aciklama
WHEN NOT MATCHED BY TARGET THEN
    INSERT (KayitTuruKodu, SureGun, EylemKodu, HukukOnayli, Aciklama)
    VALUES (k.KayitTuruKodu, k.SureGun, k.EylemKodu, k.HukukOnayli, k.Aciklama);
