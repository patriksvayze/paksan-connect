-- ÜRETİLDİ, elle düzenlemeyin
/* ==========================================================================
   T01 — kod listeleri, numara önekleri, çeviri ve eski değer eşleşmesi

   Üreten: tools/vt/tohum-uret.mjs (npm run vt -- tohum). Bu dosyayı elle
   düzenlemeyin: kaynak değişince yeniden üretilir ve el değişikliği
   kaybolur. Kaynağı değiştirin, sonra "npm run vt -- tohum" çalıştırın.

   61 kod listesi, 406 kod; 90 çeviri; 101 eski değer eşleşmesi.

   Kaynak: src/lib/talep.js, src/backoffice/veri.js, src/data/talepAlanlari.js
   (+ .en.js), src/backoffice/ekranlar/Talepler.jsx, IslemKaydi.jsx,
   Duyurular.jsx, src/servis/ekranlar/TalepDetay.jsx, src/lib/servisKaydi.js,
   src/data/duyuruTurleri.js, src/lib/bildirim.js, src/data/kvkk.js,
   src/marka (SERVIS_TURU, PARA_BIRIMI), src/i18n; tohum/kaynak/kod-eslesmeleri.json,
   kod-adlari.json. Tasarım: veritabani/tasarim.md 1.15, 5.2.

   Kod listelerinde kaynakta olmayan satır pasifleştirilmez ve silinmez;
   pasifleştirme yalnız kod-eslesmeleri.json "pasif" kaydından gelir.
   Aktif ve Aciklama kolonlarına tohum eklemeden sonra dokunmaz.

   Araç betiği tek işlemde, sahip girişiyle çalıştırır (BEGIN/COMMIT
   burada yazılmaz). İkinci çalıştırmada hiçbir satır değişmez.
   ========================================================================== */

/* kod.Dil — 2 satır */

MERGE kod.Dil AS h
USING (
    SELECT CONVERT(nvarchar(5), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'en', N'English', 2),
        (N'tr', N'Türkçe', 1)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.ParaBirimi — 1 satır */

MERGE kod.ParaBirimi AS h
USING (
    SELECT CONVERT(nvarchar(3), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira,
           CONVERT(nvarchar(5), v.Sembol) AS Sembol
    FROM (VALUES
        (N'TRY', N'<Codex metni: Türk lirası>', 1, NULL)
    ) AS v (Kod, Ad, Sira, Sembol)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira, k.Sembol COLLATE Latin1_General_100_BIN2 EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira, h.Sembol COLLATE Latin1_General_100_BIN2) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira, Sembol = k.Sembol
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Sembol, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, k.Sembol, 1);

/* kod.KayitTuru — 30 satır */

MERGE kod.KayitTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'ayar', N'<Codex metni: Ayar>', 15),
        (N'bayi', N'<Codex metni: Bayi>', 5),
        (N'bildirim', N'<Codex metni: Bildirim>', 9),
        (N'dekont', N'<Codex metni: Dekont>', 28),
        (N'destekOturumu', N'<Codex metni: Destek sohbeti>', 22),
        (N'dogrulamaKodu', N'<Codex metni: Doğrulama kodu>', 19),
        (N'donemDokumu', N'<Codex metni: Aylık hak ediş dökümü>', 13),
        (N'dosya', N'<Codex metni: Dosya>', 14),
        (N'duyuru', N'<Codex metni: Duyuru>', 8),
        (N'geriBildirim', N'<Codex metni: Geri bildirim>', 10),
        (N'giden', N'<Codex metni: Giden mesaj>', 23),
        (N'girisDenemesi', N'<Codex metni: Giriş denemesi>', 21),
        (N'hakEdis', N'<Codex metni: Hak ediş>', 12),
        (N'hesap', N'<Codex metni: Müşteri hesabı>', 2),
        (N'iceAktarim', N'<Codex metni: İçe aktarım>', 17),
        (N'iceAktarimSatiri', N'<Codex metni: İçe aktarım satırı>', 25),
        (N'iptalTalepDosyasi', N'<Codex metni: İptal edilen talebin dosyası>', 27),
        (N'islemKaydi', N'<Codex metni: İşlem kaydı>', 29),
        (N'kvkkBasvurusu', N'<Codex metni: KVKK başvurusu>', 16),
        (N'logoSeriSorgusu', N'<Codex metni: LOGO seri sorgusu>', 24),
        (N'makine', N'<Codex metni: Makine>', 3),
        (N'oturum', N'<Codex metni: Oturum>', 18),
        (N'personel', N'<Codex metni: Personel>', 6),
        (N'rizaOlayi', N'<Codex metni: Rıza kaydı>', 30),
        (N'rol', N'<Codex metni: Rol>', 7),
        (N'servis', N'<Codex metni: Servis>', 4),
        (N'sifreSifirlamaJetonu', N'<Codex metni: Şifre sıfırlama kodu>', 20),
        (N'talep', N'<Codex metni: Talep>', 1),
        (N'tekrarAnahtari', N'<Codex metni: Tekrar anahtarı>', 26),
        (N'telefonDegisikligi', N'<Codex metni: Numara değişikliği talebi>', 11)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* sistem.NumaraOneki — 7 satır */

MERGE sistem.NumaraOneki AS h
USING (
    SELECT CONVERT(nvarchar(3), v.Onek) AS Onek,
           CONVERT(nvarchar(40), v.KayitTuruKodu) AS KayitTuruKodu
    FROM (VALUES
        (N'GBD', N'geriBildirim'),
        (N'HAK', N'donemDokumu'),
        (N'SPS', N'talep'),
        (N'SRV', N'talep'),
        (N'TEL', N'telefonDegisikligi'),
        (N'TKF', N'talep'),
        (N'YPR', N'talep')
    ) AS v (Onek, KayitTuruKodu)
) AS k
    ON h.Onek = k.Onek
WHEN MATCHED AND EXISTS (SELECT k.KayitTuruKodu COLLATE Latin1_General_100_BIN2 EXCEPT SELECT h.KayitTuruKodu COLLATE Latin1_General_100_BIN2) THEN
    UPDATE SET KayitTuruKodu = k.KayitTuruKodu
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Onek, KayitTuruKodu, Aktif)
    VALUES (k.Onek, k.KayitTuruKodu, 1);

/* kod.KaynakUygulama — 7 satır */

MERGE kod.KaynakUygulama AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'api', N'<Codex metni: Sunucu>', 4),
        (N'backoffice', N'<Codex metni: Personel paneli>', 2),
        (N'betik', N'<Codex metni: Kurulum betiği>', 5),
        (N'connect', N'<Codex metni: Müşteri uygulaması>', 1),
        (N'entegrasyon', N'<Codex metni: Dış sistem aktarımı>', 6),
        (N'servisim', N'<Codex metni: Servis uygulaması>', 3),
        (N'yonetim', N'<Codex metni: Yönetim komutu>', 7)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.AktorTuru — 5 satır */

MERGE kod.AktorTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'entegrasyon', N'<Codex metni: Dış sistem>', 5),
        (N'musteri', N'<Codex metni: Müşteri>', 1),
        (N'personel', N'<Codex metni: Personel>', 2),
        (N'servis', N'<Codex metni: Servis>', 3),
        (N'sistem', N'<Codex metni: Sistem>', 4)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.KayitKaynagi — 6 satır */

MERGE kod.KayitKaynagi AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'entegrasyon', N'<Codex metni: Dış sistem aktarımı>', 6),
        (N'iceAktarim', N'<Codex metni: Excel içe aktarımı>', 5),
        (N'logo', N'<Codex metni: LOGO>', 4),
        (N'musteri', N'<Codex metni: Müşteri uygulaması>', 1),
        (N'personel', N'<Codex metni: Personel paneli>', 3),
        (N'servis', N'<Codex metni: Servis uygulaması>', 2)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.DisSistem — 3 satır */

MERGE kod.DisSistem AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'fcm', N'<Codex metni: Android bildirim servisi>', 2),
        (N'logo', N'<Codex metni: LOGO muhasebe>', 1),
        (N'webPush', N'<Codex metni: Tarayıcı bildirimi>', 3)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.BildirimKanali — 4 satır */

MERGE kod.BildirimKanali AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'eposta', N'<Codex metni: E-posta>', 2),
        (N'push', N'<Codex metni: Telefon bildirimi>', 3),
        (N'sms', N'<Codex metni: SMS>', 1),
        (N'webPush', N'<Codex metni: Tarayıcı bildirimi>', 4)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.IslemKategorisi — 26 satır */

MERGE kod.IslemKategorisi AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'bayi', N'<Codex metni: Bayi listesi>', 21),
        (N'demo', N'Demo verisi', 19),
        (N'devir', N'<Codex metni: Üreticiye devir>', 17),
        (N'durum', N'Talep durumu', 2),
        (N'duyuru', N'Duyuru', 9),
        (N'excel', N'Excel aktarımı', 18),
        (N'geribildirim', N'Geri bildirim', 8),
        (N'hakEdis', N'<Codex metni: Hak ediş>', 23),
        (N'kvkk', N'<Codex metni: KVKK>', 25),
        (N'makine', N'Makine kaydı', 5),
        (N'musteri', N'Müşteri kaydı', 7),
        (N'not', N'Talep notu', 3),
        (N'numara', N'Numara değişikliği', 6),
        (N'odeme', N'Ödeme onayı', 4),
        (N'oturum', N'Giriş / çıkış', 20),
        (N'personel', N'Personel', 10),
        (N'rol', N'Rol ve yetki', 11),
        (N'servis', N'Servis listesi', 13),
        (N'servisKaydi', N'<Codex metni: Servis kaydı>', 22),
        (N'sevk', N'<Codex metni: Parça sevki>', 24),
        (N'sifre', N'Şifre', 12),
        (N'siparis', N'Servis siparişi', 14),
        (N'sistem', N'<Codex metni: Sistem>', 26),
        (N'stok', N'Servis stoku', 15),
        (N'talep', N'Talep', 1),
        (N'teklif', N'Servis fiyat teklifi', 16)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.IslemTuru — 82 satır */

MERGE kod.IslemTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira,
           CONVERT(nvarchar(40), v.KategoriKodu) AS KategoriKodu
    FROM (VALUES
        (N'ayarDegisti', N'<Codex metni: Ayar değiştirildi>', 81, N'sistem'),
        (N'basvuruAlindi', N'<Codex metni: KVKK başvurusu alındı>', 78, N'kvkk'),
        (N'bayiAtamasiKaldirildi', N'<Codex metni: Bayi ataması kaldırıldı>', 12, N'durum'),
        (N'bayiEklendi', N'<Codex metni: Bayi eklendi>', 56, N'bayi'),
        (N'bayiGuncellendi', N'<Codex metni: Bayi güncellendi>', 57, N'bayi'),
        (N'bayiyeAtandi', N'<Codex metni: Talep bayiye atandı>', 11, N'durum'),
        (N'cikisYapildi', N'<Codex metni: Çıkış yapıldı>', 64, N'oturum'),
        (N'dekontGecersizKilindi', N'<Codex metni: Dekont geçersiz sayıldı>', 19, N'odeme'),
        (N'dekontYuklendi', N'<Codex metni: Dekont yüklendi>', 18, N'odeme'),
        (N'donemDokumuOdendi', N'<Codex metni: Aylık döküm ödendi>', 74, N'hakEdis'),
        (N'donemDokumuOlusturuldu', N'<Codex metni: Aylık döküm oluşturuldu>', 73, N'hakEdis'),
        (N'durumDegisti', N'<Codex metni: Talep durumu değişti>', 6, N'durum'),
        (N'duyuruKaldirildi', N'<Codex metni: Duyuru kaldırıldı>', 39, N'duyuru'),
        (N'duyuruYayinlandi', N'<Codex metni: Duyuru yayımlandı>', 38, N'duyuru'),
        (N'eklemeYapildi', N'<Codex metni: Talebe ekleme yapıldı>', 3, N'talep'),
        (N'excelDisaAktarildi', N'<Codex metni: Excel dosyası indirildi>', 61, N'excel'),
        (N'excelIceAktarildi', N'<Codex metni: Excel dosyası içe aktarıldı>', 62, N'excel'),
        (N'garantiBelgesiKararlandi', N'<Codex metni: Garanti belgesi karara bağlandı>', 27, N'makine'),
        (N'garantiDisiKapatildi', N'<Codex metni: Garanti dışında kapatıldı>', 66, N'servisKaydi'),
        (N'geriBildirimCevaplandi', N'<Codex metni: Geri bildirim cevaplandı>', 37, N'geribildirim'),
        (N'geriBildirimGeldi', N'<Codex metni: Geri bildirim geldi>', 35, N'geribildirim'),
        (N'geriBildirimOkundu', N'<Codex metni: Geri bildirim okundu>', 36, N'geribildirim'),
        (N'girisSifresiSifirlandi', N'<Codex metni: Giriş şifresi sıfırlandı>', 50, N'sifre'),
        (N'girisYapildi', N'<Codex metni: Giriş yapıldı>', 63, N'oturum'),
        (N'hakEdisDuzeltildi', N'<Codex metni: Hak ediş düzeltildi>', 68, N'hakEdis'),
        (N'hakEdisOnayiGeriAlindi', N'<Codex metni: Hak ediş onayı geri alındı>', 71, N'hakEdis'),
        (N'hakEdisOnaylandi', N'<Codex metni: Hak ediş onaylandı>', 69, N'hakEdis'),
        (N'hakEdisReddedildi', N'<Codex metni: Hak ediş reddedildi>', 70, N'hakEdis'),
        (N'hesapAcildi', N'<Codex metni: Müşteri hesabı açıldı>', 31, N'musteri'),
        (N'hesapAnonimlestirildi', N'<Codex metni: Müşteri hesabı anonimleştirildi>', 79, N'kvkk'),
        (N'hesapGuncellendi', N'<Codex metni: Müşteri hesabı güncellendi>', 32, N'musteri'),
        (N'hesapHareketiDuzeltildi', N'<Codex metni: Servis hesap hareketi düzeltildi>', 72, N'hakEdis'),
        (N'hesaplarBirlestirildi', N'<Codex metni: Müşteri hesapları birleştirildi>', 34, N'musteri'),
        (N'kargoBilgisiGuncellendi', N'<Codex metni: Kargo bilgisi güncellendi>', 76, N'sevk'),
        (N'kisiselVeriAnonimlestirildi', N'<Codex metni: Kişisel veriler anonimleştirildi>', 80, N'kvkk'),
        (N'logoCariKoduEslendi', N'<Codex metni: LOGO cari kodu eşlendi>', 60, N'excel'),
        (N'makineKaydedildi', N'<Codex metni: Makine kaydedildi>', 22, N'makine'),
        (N'makineSahibiDegisti', N'<Codex metni: Makinenin sahibi değişti>', 25, N'makine'),
        (N'makineSatisiKaydedildi', N'<Codex metni: Makine satışı kaydedildi>', 26, N'makine'),
        (N'makineServisAtamasiKaldirildi', N'<Codex metni: Makinenin servis ataması kaldırıldı>', 24, N'makine'),
        (N'makineServisiAtandi', N'<Codex metni: Makineye servis atandı>', 23, N'makine'),
        (N'notEklendi', N'<Codex metni: Talebe not eklendi>', 17, N'not'),
        (N'odemeOnayiGeriAlindi', N'<Codex metni: Ödeme onayı geri alındı>', 21, N'odeme'),
        (N'odemeOnaylandi', N'<Codex metni: Ödeme onaylandı>', 20, N'odeme'),
        (N'parcaGonderildi', N'<Codex metni: Parça gönderildi>', 75, N'sevk'),
        (N'parcaTakildi', N'<Codex metni: Parça takıldı>', 67, N'servisKaydi'),
        (N'personelEklendi', N'<Codex metni: Personel eklendi>', 40, N'personel'),
        (N'personelGuncellendi', N'<Codex metni: Personel güncellendi>', 41, N'personel'),
        (N'personelPasiflestirildi', N'<Codex metni: Personelin girişi kapatıldı>', 42, N'personel'),
        (N'randevuPlanlandi', N'<Codex metni: Randevu planlandı>', 10, N'durum'),
        (N'rizaKaydedildi', N'<Codex metni: Rıza kaydedildi>', 77, N'kvkk'),
        (N'rolEklendi', N'<Codex metni: Rol eklendi>', 43, N'rol'),
        (N'rolGuncellendi', N'<Codex metni: Rol güncellendi>', 44, N'rol'),
        (N'rolSilindi', N'<Codex metni: Rol silindi>', 45, N'rol'),
        (N'saklamaUygulandi', N'<Codex metni: Saklama süreleri uygulandı>', 82, N'sistem'),
        (N'servisDestekIstedi', N'<Codex metni: Servis destek istedi>', 59, N'devir'),
        (N'servisEklendi', N'<Codex metni: Servis eklendi>', 51, N'servis'),
        (N'servisGuncellendi', N'<Codex metni: Servis güncellendi>', 52, N'servis'),
        (N'servisHesabiAcildi', N'<Codex metni: Servis giriş hesabı açıldı>', 53, N'servis'),
        (N'servisHesabiKapatildi', N'<Codex metni: Servis giriş hesabı kapatıldı>', 54, N'servis'),
        (N'servisKaydiGonderildi', N'<Codex metni: Servis kaydı gönderildi>', 65, N'servisKaydi'),
        (N'servisSifreYardimIstendi', N'<Codex metni: Servis şifre yardımı istedi>', 48, N'sifre'),
        (N'servisSifreYardimKapatildi', N'<Codex metni: Servisin şifre yardımı talebi kapatıldı>', 49, N'sifre'),
        (N'servisSiparisiOlusturuldu', N'<Codex metni: Servis parça siparişi oluşturuldu>', 58, N'siparis'),
        (N'servisYetkisiDegisti', N'<Codex metni: Servisin marka yetkisi değişti>', 55, N'servis'),
        (N'sifreDegistirildi', N'<Codex metni: Şifre değiştirildi>', 47, N'sifre'),
        (N'sifreSifirlamaIstendi', N'<Codex metni: Şifre sıfırlama istendi>', 46, N'sifre'),
        (N'talepDurumuElleDegisti', N'<Codex metni: Talep durumu elle değiştirildi>', 13, N'durum'),
        (N'talepElleAcildi', N'<Codex metni: Talep elle açıldı>', 2, N'talep'),
        (N'talepElleIptalEdildi', N'<Codex metni: Talep elle iptal edildi>', 15, N'durum'),
        (N'talepElleKapatildi', N'<Codex metni: Talep elle kapatıldı>', 14, N'durum'),
        (N'talepElleYenidenAcildi', N'<Codex metni: Talep elle yeniden açıldı>', 16, N'durum'),
        (N'talepGizlendi', N'<Codex metni: Talep gizlendi>', 4, N'talep'),
        (N'talepIptalEdildi', N'<Codex metni: Talep iptal edildi>', 8, N'durum'),
        (N'talepKapatildi', N'<Codex metni: Talep kapatıldı>', 7, N'durum'),
        (N'talepOlusturuldu', N'<Codex metni: Talep oluşturuldu>', 1, N'talep'),
        (N'talepYenidenAcildi', N'<Codex metni: Talep yeniden açıldı>', 5, N'talep'),
        (N'tcVergiNoGoruntulendi', N'<Codex metni: T.C. kimlik ya da vergi numarası görüntülendi>', 33, N'musteri'),
        (N'teklifVerildi', N'<Codex metni: Teklif verildi>', 9, N'durum'),
        (N'telefonDegisikligiIstendi', N'<Codex metni: Numara değişikliği istendi>', 28, N'numara'),
        (N'telefonDegisikligiKararlandi', N'<Codex metni: Numara değişikliği karara bağlandı>', 29, N'numara'),
        (N'telefonDegistirildi', N'<Codex metni: Müşterinin telefonu değiştirildi>', 30, N'numara')
    ) AS v (Kod, Ad, Sira, KategoriKodu)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira, k.KategoriKodu COLLATE Latin1_General_100_BIN2 EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira, h.KategoriKodu COLLATE Latin1_General_100_BIN2) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira, KategoriKodu = k.KategoriKodu
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, KategoriKodu, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, k.KategoriKodu, 1);

/* kod.TalepTuru — 3 satır */

MERGE kod.TalepTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'parca', N'Yedek parça talebi', 2),
        (N'satinalma', N'Fiyat teklifi talebi', 3),
        (N'servis', N'Servis talebi', 1)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.TalepKaynagi — 4 satır */

MERGE kod.TalepKaynagi AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'backoffice', N'<Codex metni: Personel paneli>', 4),
        (N'connect', N'<Codex metni: Müşteri uygulaması>', 1),
        (N'servisElle', N'<Codex metni: Servis uygulamasından elle>', 2),
        (N'servisSiparisi', N'<Codex metni: Servisin parça siparişi>', 3)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.TalepDurumu — 9 satır */

MERGE kod.TalepDurumu AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira,
           CONVERT(bit, v.Kapali) AS Kapali,
           CONVERT(bit, v.GecikmeSayilir) AS GecikmeSayilir,
           CONVERT(nvarchar(20), v.Ton) AS Ton
    FROM (VALUES
        (N'incelemede', N'İncelemede', 2, 0, 1, N'turuncu'),
        (N'iptal', N'İptal', 9, 1, 0, N'gri'),
        (N'kapandi', N'Kapandı', 8, 1, 0, N'yesil'),
        (N'odemeBekliyor', N'<Codex metni: Ödeme Bekleniyor>', 7, 0, 0, NULL),
        (N'onayBekliyor', N'Onay Bekliyor', 5, 0, 1, N'mor'),
        (N'parcaBekliyor', N'Parça Bekleniyor', 6, 0, 1, N'turuncu'),
        (N'planlandi', N'Planlandı', 3, 0, 1, N'mavi'),
        (N'teklif', N'Teklif Verildi', 4, 0, 0, N'mor'),
        (N'yeni', N'Yeni', 1, 0, 1, N'kirmizi')
    ) AS v (Kod, Ad, Sira, Kapali, GecikmeSayilir, Ton)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira, k.Kapali, k.GecikmeSayilir, k.Ton COLLATE Latin1_General_100_BIN2 EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira, h.Kapali, h.GecikmeSayilir, h.Ton COLLATE Latin1_General_100_BIN2) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira, Kapali = k.Kapali, GecikmeSayilir = k.GecikmeSayilir, Ton = k.Ton
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Kapali, GecikmeSayilir, Ton, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, k.Kapali, k.GecikmeSayilir, k.Ton, 1);

/* kod.Masa — 2 satır */

MERGE kod.Masa AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira,
           CONVERT(nvarchar(40), v.TalepTuruKodu) AS TalepTuruKodu
    FROM (VALUES
        (N'parcaMasasi', N'<Codex metni: Yedek parça masası>', 2, N'parca'),
        (N'servisMasasi', N'<Codex metni: Servis masası>', 1, N'servis')
    ) AS v (Kod, Ad, Sira, TalepTuruKodu)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira, k.TalepTuruKodu COLLATE Latin1_General_100_BIN2 EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira, h.TalepTuruKodu COLLATE Latin1_General_100_BIN2) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira, TalepTuruKodu = k.TalepTuruKodu
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, TalepTuruKodu, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, k.TalepTuruKodu, 1);

/* kod.Sahip — 3 satır */

MERGE kod.Sahip AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'bayi', N'<Codex metni: Bayide>', 3),
        (N'paksan', N'<Codex metni: Üreticide>', 1),
        (N'servis', N'<Codex metni: Serviste>', 2)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.ServisAtamaKaynagi — 3 satır */

MERGE kod.ServisAtamaKaynagi AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'bayiServisi', N'<Codex metni: Satan bayinin servisi>', 2),
        (N'makineAtamasi', N'<Codex metni: Makineye atanmış servis>', 1),
        (N'servisElle', N'<Codex metni: Servis talebi kendisi açtı>', 3)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.UlasimZamani — 4 satır */

MERGE kod.UlasimZamani AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'aksamustu', N'Akşamüstü (15.00 - 18.00)', 4),
        (N'farkEtmez', N'Fark etmez', 1),
        (N'ogledenSonra', N'Öğleden sonra (12.00 - 15.00)', 3),
        (N'sabah', N'Sabah (09.00 - 12.00)', 2)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.MakineDurumu — 4 satır */

MERGE kod.MakineDurumu AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira,
           CONVERT(bit, v.ArizaMi) AS ArizaMi
    FROM (VALUES
        (N'durdu', N'Makine hiç çalışmıyor', 1, 1),
        (N'kontrol', N'Çalışıyor, kontrol edilsin', 3, 1),
        (N'kurulum', N'İlk kurulum yapılacak', 4, 0),
        (N'sorunlu', N'Çalışıyor ama sorun var', 2, 1)
    ) AS v (Kod, Ad, Sira, ArizaMi)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira, k.ArizaMi EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira, h.ArizaMi) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira, ArizaMi = k.ArizaMi
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, ArizaMi, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, k.ArizaMi, 1);

/* kod.DestekAilesi — 7 satır */

MERGE kod.DestekAilesi AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'balya', N'<Codex metni: Balya makineleri>', 1),
        (N'cayir', N'<Codex metni: Çayır biçme ve ot toplama>', 5),
        (N'genel', N'<Codex metni: Genel>', 7),
        (N'rulo', N'<Codex metni: Rulo balya makineleri>', 2),
        (N'silaj', N'<Codex metni: Silaj ekipmanları>', 4),
        (N'toprak', N'<Codex metni: Toprak işleme>', 6),
        (N'yem', N'<Codex metni: Yem karma makineleri>', 3)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.Belirti — 33 satır */

MERGE kod.Belirti AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'agIpSarmiyor', N'Ağ veya ip sarmıyor', 9),
        (N'anormalSes', N'Anormal ses geliyor', 26),
        (N'asiriTitresim', N'Aşırı titriyor', 27),
        (N'balyaDagiliyor', N'Balya dağılıyor', 4),
        (N'balyaGevsek', N'Balya gevşek çıkıyor', 3),
        (N'balyaSarilmiyor', N'Balya sarılmıyor', 8),
        (N'balyaSayaciCalismiyor', N'Balya sayacı çalışmıyor', 7),
        (N'beslemeDuzgunDegil', N'Besleme düzgün değil', 19),
        (N'bicakParmakKiriliyor', N'Bıçak veya parmak kırılıyor', 21),
        (N'bicaklarKesmiyor', N'Bıçaklar kesmiyor', 12),
        (N'bicaklarKorelmis', N'Bıçaklar körelmiş', 17),
        (N'bicmeDuzgunDegil', N'Biçme düzgün değil', 20),
        (N'bosaltmaYapmiyor', N'Boşaltma yapmıyor', 13),
        (N'derinlikTutmuyor', N'Derinlik tutmuyor', 23),
        (N'diger', N'Diğer', 33),
        (N'dugumAtmiyor', N'Düğüm atmıyor', 1),
        (N'helezonSikisiyor', N'Helezon sıkışıyor', 15),
        (N'hidrolikSorunu', N'Hidrolikte sorun', 30),
        (N'ipKopuyor', N'İp kopuyor', 2),
        (N'isinmaYanikKokusu', N'Isınma / yanık kokusu', 32),
        (N'kapakAcilmiyor', N'Kapak açılmıyor / kapanmıyor', 10),
        (N'karistirmaYetersiz', N'Karıştırma yetersiz', 11),
        (N'kayisZincirAtiyor', N'Kayış veya zincir atıyor', 31),
        (N'kesmeBoyuTutmuyor', N'Kesme boyu tutmuyor', 16),
        (N'pikapOtAlmiyor', N'Pikap otu almıyor', 5),
        (N'pistonVurma', N'Piston / vurma sorunu', 6),
        (N'saftMafsal', N'Şaft / mafsal sorunu', 29),
        (N'tartiCalismiyor', N'Tartı çalışmıyor', 14),
        (N'tikanma', N'Tıkanma oluyor', 18),
        (N'tirmikOtToplamiyor', N'Tırmık otu toplamıyor', 22),
        (N'topragiDuzgunIslemiyor', N'Toprağı düzgün işlemiyor', 25),
        (N'ucAyakKiriliyor', N'Uç / ayak kırılıyor', 24),
        (N'yagKacagi', N'Yağ kaçağı var', 28)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.UrunTipi — 5 satır */

MERGE kod.UrunTipi AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'diger', N'Diğer', 5),
        (N'misirSilaji', N'Mısır silajı', 4),
        (N'otCayir', N'Ot / çayır', 3),
        (N'samanBugday', N'Saman / buğday', 2),
        (N'yonca', N'Yonca', 1)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.Arazi — 5 satır */

MERGE kod.Arazi AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'baskaTarladaCalisiyor', N'Başkasının tarlasında da çalışıyorum', 5),
        (N'besyuzDonumUstu', N'500 dönümden fazla', 4),
        (N'elliDonumAlti', N'50 dönümden az', 1),
        (N'elliYuzelliDonum', N'50 - 150 dönüm', 2),
        (N'yuzelliBesyuzDonum', N'150 - 500 dönüm', 3)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.TraktorGucu — 6 satır */

MERGE kod.TraktorGucu AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'bilmiyor', N'Bilmiyorum', 6),
        (N'elliBeygirAlti', N'50 beygirin altı', 1),
        (N'elliSeksenBeygir', N'50 - 80 beygir', 2),
        (N'seksenYuzonBeygir', N'80 - 110 beygir', 3),
        (N'yuzelliBeygirUstu', N'150 beygirin üstü', 5),
        (N'yuzonYuzelliBeygir', N'110 - 150 beygir', 4)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.IptalNedeni — 8 satır */

MERGE kod.IptalNedeni AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira,
           CONVERT(bit, v.AciklamaZorunlu) AS AciklamaZorunlu
    FROM (VALUES
        (N'ayniKonudaBaskaTalep', N'Aynı konuda başka talep var', 4, 0),
        (N'baskaNeden', N'Başka bir neden', 7, 1),
        (N'kapsamDisi', N'Bu talep kapsamımız dışında', 6, 0),
        (N'musteriVazgecti', N'Müşteri vazgeçti', 1, 0),
        (N'musteriyeUlasilamadi', N'Müşteriye ulaşılamadı', 2, 0),
        (N'odemeSuresiDoldu', N'<Codex metni: Ödeme süresi doldu>', 8, 0),
        (N'telefondaCozuldu', N'Sorun telefonda çözüldü', 5, 0),
        (N'yanlisAcilmis', N'Yanlışlıkla açılmış talep', 3, 0)
    ) AS v (Kod, Ad, Sira, AciklamaZorunlu)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira, k.AciklamaZorunlu EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira, h.AciklamaZorunlu) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira, AciklamaZorunlu = k.AciklamaZorunlu
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, AciklamaZorunlu, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, k.AciklamaZorunlu, 1);

/* kod.TeklifSonucu — 4 satır */

MERGE kod.TeklifSonucu AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira,
           CONVERT(bit, v.FiyatZorunlu) AS FiyatZorunlu
    FROM (VALUES
        (N'musteriVazgecti', N'Müşteri vazgeçti', 2, 0),
        (N'rakibeGitti', N'Rakibe gitti', 3, 0),
        (N'satisOldu', N'Satış oldu', 1, 1),
        (N'ulasilamadi', N'Ulaşılamadı', 4, 0)
    ) AS v (Kod, Ad, Sira, FiyatZorunlu)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira, k.FiyatZorunlu EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira, h.FiyatZorunlu) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira, FiyatZorunlu = k.FiyatZorunlu
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, FiyatZorunlu, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, k.FiyatZorunlu, 1);

/* kod.YapilanIs — 5 satır */

MERGE kod.YapilanIs AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'arizaBulunamadi', N'Arıza Bulunamadı', 5),
        (N'ayar', N'Ayar Yapıldı', 2),
        (N'bakim', N'Bakım Yapıldı', 3),
        (N'ilkKurulum', N'İlk Kurulum ve Çalıştırma', 1),
        (N'parcaDegisimi', N'Parça Değişti', 4)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.ServisKapisi — 3 satır */

MERGE kod.ServisKapisi AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira,
           CONVERT(bit, v.Eski) AS Eski
    FROM (VALUES
        (N'eldeParca', N'Garanti Dışı · Parçayı Ben Taktım', 2, 1),
        (N'garanti', N'Garanti Kapsamında', 1, 0),
        (N'parcaIste', N'Garanti Dışı · Parçayı PAKSAN Göndersin', 3, 1)
    ) AS v (Kod, Ad, Sira, Eski)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira, k.Eski EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira, h.Eski) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira, Eski = k.Eski
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Eski, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, k.Eski, 1);

/* kod.ZiyaretAsamasi — 3 satır */

MERGE kod.ZiyaretAsamasi AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'bitti', N'<Codex metni: İş bitti>', 2),
        (N'parca', N'<Codex metni: Parça bekleniyor>', 1),
        (N'yarimKaldi', N'<Codex metni: Yarıda kaldı>', 3)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.UcretDurumu — 2 satır */

MERGE kod.UcretDurumu AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'garanti', N'Garanti kapsamında', 1),
        (N'musteriOdedi', N'Müşteri ödedi', 2)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.KapanisTuru — 7 satır */

MERGE kod.KapanisTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'bayiAtamasi', N'<Codex metni: Bayiye atanınca kapandı>', 5),
        (N'garantiDisi', N'<Codex metni: Garanti dışında tamamlandı>', 3),
        (N'hakEdisOnayi', N'<Codex metni: Hak ediş onaylanınca kapandı>', 6),
        (N'hakEdisReddi', N'<Codex metni: Hak ediş reddedilince kapandı>', 7),
        (N'parcaTakildi', N'<Codex metni: Parça takılınca kapandı>', 4),
        (N'personelFormu', N'<Codex metni: Personel kapattı>', 1),
        (N'servisKaydi', N'<Codex metni: Servis kaydıyla kapandı>', 2)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.FaturaTuru — 3 satır */

MERGE kod.FaturaTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'baskaKisi', N'Başka bir kişi adına', 2),
        (N'firma', N'Firma adına', 3),
        (N'kendisi', N'Kendi adıma', 1)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.OdemeYontemi — 3 satır */

MERGE kod.OdemeYontemi AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'bakiye', N'<Codex metni: Servis hesabından>', 2),
        (N'fatura', N'<Codex metni: Faturayla>', 3),
        (N'havale', N'<Codex metni: Havale>', 1)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.HakEdisDurumu — 3 satır */

MERGE kod.HakEdisDurumu AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'bekliyor', N'<Codex metni: Onay bekliyor>', 1),
        (N'onaylandi', N'<Codex metni: Onaylandı>', 2),
        (N'reddedildi', N'<Codex metni: Reddedildi>', 3)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.Birim — 4 satır */

MERGE kod.Birim AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'adet', N'<Codex metni: adet>', 2),
        (N'km', N'<Codex metni: km>', 1),
        (N'saat', N'<Codex metni: saat>', 3),
        (N'sabit', N'<Codex metni: sabit tutar>', 4)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.HakEdisKalemTuru — 3 satır */

MERGE kod.HakEdisKalemTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'diger', N'<Codex metni: Diğer>', 3),
        (N'iscilik', N'<Codex metni: İşçilik>', 2),
        (N'yol', N'<Codex metni: Yol>', 1)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.HesapHareketTuru — 5 satır */

MERGE kod.HesapHareketTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira,
           CONVERT(nvarchar(40), v.YonKodu) AS YonKodu
    FROM (VALUES
        (N'duzeltmeAlacak', N'<Codex metni: Düzeltme (alacak)>', 4, N'alacak'),
        (N'duzeltmeBorc', N'<Codex metni: Düzeltme (borç)>', 5, N'borc'),
        (N'hakEdisAlacagi', N'<Codex metni: Hak ediş alacağı>', 1, N'alacak'),
        (N'odeme', N'<Codex metni: Ödeme>', 3, N'borc'),
        (N'parcaSiparisiBorcu', N'<Codex metni: Parça siparişi borcu>', 2, N'borc')
    ) AS v (Kod, Ad, Sira, YonKodu)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira, k.YonKodu COLLATE Latin1_General_100_BIN2 EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira, h.YonKodu COLLATE Latin1_General_100_BIN2) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira, YonKodu = k.YonKodu
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, YonKodu, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, k.YonKodu, 1);

/* kod.DonemDokumuDurumu — 5 satır */

MERGE kod.DonemDokumuDurumu AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'faturaGeldi', N'<Codex metni: Fatura geldi>', 3),
        (N'iptal', N'<Codex metni: İptal>', 5),
        (N'kesinlesti', N'<Codex metni: Kesinleşti>', 2),
        (N'odendi', N'<Codex metni: Ödendi>', 4),
        (N'taslak', N'<Codex metni: Taslak>', 1)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.HedefKitle — 3 satır */

MERGE kod.HedefKitle AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'ikisi', N'İkisine de', 3),
        (N'musteri', N'Müşterilere', 1),
        (N'servis', N'Servislere', 2)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.DuyuruTuru — 2 satır */

MERGE kod.DuyuruTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'duyuru', N'Duyuru', 1),
        (N'uyari', N'Önemli Uyarı', 2)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.DuyuruAltTuru — 5 satır */

MERGE kod.DuyuruAltTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira,
           CONVERT(nvarchar(40), v.UstTurKodu) AS UstTurKodu,
           CONVERT(nvarchar(40), v.VarsayilanHedefKitleKodu) AS VarsayilanHedefKitleKodu,
           CONVERT(nvarchar(40), v.KilitliHedefKitleKodu) AS KilitliHedefKitleKodu,
           CONVERT(nvarchar(20), v.Ton) AS Ton,
           CONVERT(nvarchar(40), v.Ikon) AS Ikon
    FROM (VALUES
        (N'etkinlik', N'Etkinlik', 3, N'duyuru', N'ikisi', NULL, N'etkinlik', N'takvim'),
        (N'geriCagirma', N'Geri Çağırma', 5, N'uyari', N'servis', N'servis', N'geriCagirma', N'geri'),
        (N'guvenlik', N'Güvenlik Uyarısı', 4, N'uyari', N'ikisi', NULL, N'guvenlik', N'uyari'),
        (N'kampanya', N'Kampanya', 1, N'duyuru', N'musteri', NULL, N'kampanya', N'etiket'),
        (N'yeniUrun', N'Yeni Ürün', 2, N'duyuru', N'ikisi', NULL, N'yeniUrun', N'makine')
    ) AS v (Kod, Ad, Sira, UstTurKodu, VarsayilanHedefKitleKodu, KilitliHedefKitleKodu, Ton, Ikon)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira, k.UstTurKodu COLLATE Latin1_General_100_BIN2, k.VarsayilanHedefKitleKodu COLLATE Latin1_General_100_BIN2, k.KilitliHedefKitleKodu COLLATE Latin1_General_100_BIN2, k.Ton COLLATE Latin1_General_100_BIN2, k.Ikon COLLATE Latin1_General_100_BIN2 EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira, h.UstTurKodu COLLATE Latin1_General_100_BIN2, h.VarsayilanHedefKitleKodu COLLATE Latin1_General_100_BIN2, h.KilitliHedefKitleKodu COLLATE Latin1_General_100_BIN2, h.Ton COLLATE Latin1_General_100_BIN2, h.Ikon COLLATE Latin1_General_100_BIN2) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira, UstTurKodu = k.UstTurKodu, VarsayilanHedefKitleKodu = k.VarsayilanHedefKitleKodu, KilitliHedefKitleKodu = k.KilitliHedefKitleKodu, Ton = k.Ton, Ikon = k.Ikon
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, UstTurKodu, VarsayilanHedefKitleKodu, KilitliHedefKitleKodu, Ton, Ikon, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, k.UstTurKodu, k.VarsayilanHedefKitleKodu, k.KilitliHedefKitleKodu, k.Ton, k.Ikon, 1);

/* kod.BildirimTuru — 4 satır */

MERGE kod.BildirimTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'gorus', N'<Codex metni: Geri bildirim>', 3),
        (N'numara', N'<Codex metni: Numara değişikliği>', 2),
        (N'randevu', N'<Codex metni: Randevu>', 4),
        (N'talep', N'<Codex metni: Talep>', 1)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.AliciTuru — 3 satır */

MERGE kod.AliciTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'musteri', N'<Codex metni: Müşteri>', 1),
        (N'personel', N'<Codex metni: Personel>', 3),
        (N'servis', N'<Codex metni: Servis>', 2)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.KararDurumu — 3 satır */

MERGE kod.KararDurumu AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'bekliyor', N'<Codex metni: Bekliyor>', 1),
        (N'onaylandi', N'<Codex metni: Onaylandı>', 2),
        (N'reddedildi', N'<Codex metni: Reddedildi>', 3)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.DestekOlayTuru — 8 satır */

MERGE kod.DestekOlayTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'cevap', N'<Codex metni: Cevap verildi>', 4),
        (N'cevapsiz', N'<Codex metni: Cevap bulunamadı>', 5),
        (N'cozulmedi', N'<Codex metni: Sorun çözülmedi>', 6),
        (N'konu', N'<Codex metni: Konu seçildi>', 1),
        (N'serbest', N'<Codex metni: Soru yazıldı>', 3),
        (N'soru', N'<Codex metni: Hazır soru seçildi>', 2),
        (N'temizlendi', N'<Codex metni: Sohbet temizlendi>', 8),
        (N'yonlendirme', N'<Codex metni: Servise yönlendirildi>', 7)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.DosyaTuru — 5 satır */

MERGE kod.DosyaTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'belge', N'<Codex metni: Belge>', 5),
        (N'foto', N'<Codex metni: Fotoğraf>', 1),
        (N'pdf', N'<Codex metni: PDF>', 4),
        (N'ses', N'<Codex metni: Ses kaydı>', 3),
        (N'video', N'<Codex metni: Video>', 2)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.ServisTuru — 2 satır */

MERGE kod.ServisTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'sahis', N'Şahıs', 1),
        (N'tuzel', N'Tüzel kişi', 2)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.FirmaDurumu — 2 satır */

MERGE kod.FirmaDurumu AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'aktif', N'<Codex metni: Aktif>', 1),
        (N'pasif', N'<Codex metni: Pasif>', 2)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.KisiRolu — 2 satır */

MERGE kod.KisiRolu AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'hesapSahibi', N'<Codex metni: Hesap sahibi>', 1),
        (N'yetkili', N'<Codex metni: Yetkili>', 2)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.SahiplikBitisNedeni — 5 satır */

MERGE kod.SahiplikBitisNedeni AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'anonimlestirme', N'<Codex metni: Anonimleştirildi>', 4),
        (N'birlestirme', N'<Codex metni: Hesaplar birleştirildi>', 5),
        (N'devir', N'<Codex metni: Devredildi>', 2),
        (N'musteriKaldirdi', N'<Codex metni: Müşteri kaldırdı>', 1),
        (N'personel', N'<Codex metni: Personel kaldırdı>', 3)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.RizaMetni — 3 satır */

MERGE kod.RizaMetni AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'acikRiza', N'Açık Rıza Metni', 2),
        (N'aydinlatma', N'Aydınlatma Metni', 1),
        (N'ticariIleti', N'Kampanya Bildirimleri Metni', 3)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.RizaSecimi — 4 satır */

MERGE kod.RizaSecimi AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'geriCekme', N'<Codex metni: Geri çekildi>', 4),
        (N'okundu', N'<Codex metni: Okundu>', 1),
        (N'onay', N'<Codex metni: Onay>', 2),
        (N'ret', N'<Codex metni: Ret>', 3)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.RizaKanali — 5 satır */

MERGE kod.RizaKanali AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'connectKayit', N'<Codex metni: Uygulamada kayıt>', 1),
        (N'connectProfil', N'<Codex metni: Uygulamada profil>', 2),
        (N'personel', N'<Codex metni: Personel>', 3),
        (N'telefon', N'<Codex metni: Telefon>', 4),
        (N'yazili', N'<Codex metni: Yazılı>', 5)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.BildirimIzni — 5 satır */

MERGE kod.BildirimIzni AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'desteklenmiyor', N'<Codex metni: Desteklenmiyor>', 4),
        (N'engelli', N'<Codex metni: Ayarlardan kapalı>', 5),
        (N'reddedildi', N'<Codex metni: Reddedildi>', 2),
        (N'sorulmadi', N'<Codex metni: Sorulmadı>', 3),
        (N'verildi', N'<Codex metni: Verildi>', 1)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.BelgeTuru — 9 satır */

MERGE kod.BelgeTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'alisFaturasi', N'<Codex metni: Alış faturası>', 2),
        (N'bankaFisi', N'<Codex metni: Banka fişi>', 7),
        (N'garantiBedelsizCikis', N'<Codex metni: Garanti bedelsiz çıkış>', 8),
        (N'giderPusulasi', N'<Codex metni: Gider pusulası>', 3),
        (N'irsaliye', N'<Codex metni: İrsaliye>', 4),
        (N'satisFaturasi', N'<Codex metni: Satış faturası>', 1),
        (N'satisIadeFaturasi', N'<Codex metni: Satış iade faturası>', 9),
        (N'siparisFisi', N'<Codex metni: Sipariş fişi>', 5),
        (N'tahsilatFisi', N'<Codex metni: Tahsilat fişi>', 6)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.SatisTuru — 4 satır */

MERGE kod.SatisTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'bayiCiftciye', N'<Codex metni: Bayiden çiftçiye>', 2),
        (N'dogrudanCiftciye', N'<Codex metni: Üreticiden doğrudan çiftçiye>', 3),
        (N'ikinciEl', N'<Codex metni: İkinci el>', 4),
        (N'paksanBayiye', N'<Codex metni: Üreticiden bayiye>', 1)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.GarantiDayanagi — 4 satır */

MERGE kod.GarantiDayanagi AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'bilinmiyor', N'<Codex metni: Bilinmiyor>', 4),
        (N'faturaArtiSure', N'<Codex metni: Fatura tarihi ve ek süre>', 2),
        (N'teslimOnayli', N'<Codex metni: Onaylı teslim tarihi>', 1),
        (N'uretimYili', N'<Codex metni: Üretim yılı>', 3)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.GarantiBaslangicEsasi — 3 satır */

MERGE kod.GarantiBaslangicEsasi AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'fatura', N'<Codex metni: Fatura tarihi>', 2),
        (N'teslim', N'<Codex metni: Teslim tarihi>', 1),
        (N'uretim', N'<Codex metni: Üretim yılı>', 3)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.SeriKurali — 1 satır */

MERGE kod.SeriKurali AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'onekYilSira', N'<Codex metni: Model kodu, yıl ve sıra>', 1)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.KargoFirmasi — 0 satır */
-- Kaynakta satır yok; tabloya dokunulmaz.

/* kod.KvkkBasvuruTuru — 4 satır */

MERGE kod.KvkkBasvuruTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'duzeltme', N'<Codex metni: Düzeltme>', 3),
        (N'erisim', N'<Codex metni: Bilgi alma>', 2),
        (N'itiraz', N'<Codex metni: İtiraz>', 4),
        (N'silme', N'<Codex metni: Silme>', 1)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.IceAktarimTuru — 8 satır */

MERGE kod.IceAktarimTuru AS h
USING (
    SELECT CONVERT(nvarchar(40), v.Kod) AS Kod,
           CONVERT(nvarchar(150), v.Ad) AS Ad,
           CONVERT(smallint, v.Sira) AS Sira
    FROM (VALUES
        (N'bayiListesi', N'<Codex metni: Bayi listesi>', 7),
        (N'logoBankaFisleri', N'<Codex metni: LOGO banka fişleri>', 5),
        (N'logoCariListesi', N'<Codex metni: LOGO cari listesi>', 1),
        (N'logoMalzemeListesi', N'<Codex metni: LOGO malzeme listesi>', 2),
        (N'logoSatisFaturalari', N'<Codex metni: LOGO satış faturaları>', 3),
        (N'logoServisFaturalari', N'<Codex metni: LOGO servis faturaları>', 4),
        (N'personelListesi', N'<Codex metni: Personel listesi>', 8),
        (N'servisListesi', N'<Codex metni: Servis listesi>', 6)
    ) AS v (Kod, Ad, Sira)
) AS k
    ON h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.Ad COLLATE Latin1_General_100_BIN2, k.Sira EXCEPT SELECT h.Ad COLLATE Latin1_General_100_BIN2, h.Sira) THEN
    UPDATE SET Ad = k.Ad, Sira = k.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Ad, Sira, Aktif)
    VALUES (k.Kod, k.Ad, k.Sira, 1);

/* kod.TalepNumaraKurali — 8 satır; genel satırlar (MarkaKodu boş); markaya özgü satırlara dokunulmaz */

WITH hedef AS (SELECT * FROM kod.TalepNumaraKurali WHERE MarkaKodu IS NULL)
MERGE hedef AS h
USING (
    SELECT CONVERT(nvarchar(40), v.TurKodu) AS TurKodu,
           CONVERT(nvarchar(40), v.KaynakKodu) AS KaynakKodu,
           CONVERT(nvarchar(3), v.NumaraOneki) AS NumaraOneki
    FROM (VALUES
        (N'parca', N'backoffice', N'YPR'),
        (N'parca', N'connect', N'YPR'),
        (N'parca', N'servisSiparisi', N'SPS'),
        (N'satinalma', N'backoffice', N'TKF'),
        (N'satinalma', N'connect', N'TKF'),
        (N'servis', N'backoffice', N'SRV'),
        (N'servis', N'connect', N'SRV'),
        (N'servis', N'servisElle', N'SRV')
    ) AS v (TurKodu, KaynakKodu, NumaraOneki)
) AS k
    ON h.TurKodu = k.TurKodu AND h.KaynakKodu = k.KaynakKodu AND h.NumaraOneki = k.NumaraOneki
WHEN NOT MATCHED BY TARGET THEN
    INSERT (TurKodu, KaynakKodu, NumaraOneki)
    VALUES (k.TurKodu, k.KaynakKodu, k.NumaraOneki);

/* kod.TalepTuruDurumu — 18 satır */

MERGE kod.TalepTuruDurumu AS h
USING (
    SELECT CONVERT(nvarchar(40), v.TurKodu) AS TurKodu,
           CONVERT(nvarchar(40), v.DurumKodu) AS DurumKodu,
           CONVERT(bit, v.ElleSecilebilir) AS ElleSecilebilir
    FROM (VALUES
        (N'parca', N'incelemede', 1),
        (N'parca', N'iptal', 1),
        (N'parca', N'kapandi', 1),
        (N'parca', N'odemeBekliyor', 0),
        (N'parca', N'planlandi', 1),
        (N'parca', N'yeni', 1),
        (N'satinalma', N'incelemede', 1),
        (N'satinalma', N'iptal', 1),
        (N'satinalma', N'kapandi', 1),
        (N'satinalma', N'teklif', 1),
        (N'satinalma', N'yeni', 1),
        (N'servis', N'incelemede', 1),
        (N'servis', N'iptal', 1),
        (N'servis', N'kapandi', 1),
        (N'servis', N'onayBekliyor', 0),
        (N'servis', N'parcaBekliyor', 0),
        (N'servis', N'planlandi', 0),
        (N'servis', N'yeni', 1)
    ) AS v (TurKodu, DurumKodu, ElleSecilebilir)
) AS k
    ON h.TurKodu = k.TurKodu AND h.DurumKodu = k.DurumKodu
WHEN MATCHED AND EXISTS (SELECT k.ElleSecilebilir EXCEPT SELECT h.ElleSecilebilir) THEN
    UPDATE SET ElleSecilebilir = k.ElleSecilebilir
WHEN NOT MATCHED BY TARGET THEN
    INSERT (TurKodu, DurumKodu, ElleSecilebilir)
    VALUES (k.TurKodu, k.DurumKodu, k.ElleSecilebilir);

/* kod.TalepTuruUydusu — 3 satır */

MERGE kod.TalepTuruUydusu AS h
USING (
    SELECT CONVERT(nvarchar(40), v.TurKodu) AS TurKodu,
           CONVERT(nvarchar(40), v.UyduKodu) AS UyduKodu
    FROM (VALUES
        (N'parca', N'faturaBilgisi'),
        (N'satinalma', N'bayiAtamasi'),
        (N'servis', N'servisZiyareti')
    ) AS v (TurKodu, UyduKodu)
) AS k
    ON h.TurKodu = k.TurKodu AND h.UyduKodu = k.UyduKodu
WHEN NOT MATCHED BY TARGET THEN
    INSERT (TurKodu, UyduKodu)
    VALUES (k.TurKodu, k.UyduKodu);

/* kod.Ceviri — 90 satır; kod listeleri */

MERGE kod.Ceviri AS h
USING (
    SELECT CONVERT(nvarchar(128), v.ListeAdi) AS ListeAdi,
           CONVERT(nvarchar(60), v.Kod) AS Kod,
           CONVERT(nvarchar(40), v.AlanAdi) AS AlanAdi,
           CONVERT(nvarchar(5), v.DilKodu) AS DilKodu,
           CONVERT(nvarchar(1000), v.Metin) AS Metin
    FROM (VALUES
        (N'kod.Arazi', N'baskaTarladaCalisiyor', N'Ad', N'en', N'I also work on other farmers’ land'),
        (N'kod.Arazi', N'besyuzDonumUstu', N'Ad', N'en', N'More than 50 hectares'),
        (N'kod.Arazi', N'elliDonumAlti', N'Ad', N'en', N'Less than 5 hectares'),
        (N'kod.Arazi', N'elliYuzelliDonum', N'Ad', N'en', N'5 - 15 hectares'),
        (N'kod.Arazi', N'yuzelliBesyuzDonum', N'Ad', N'en', N'15 - 50 hectares'),
        (N'kod.Belirti', N'agIpSarmiyor', N'Ad', N'en', N'Net or twine is not wrapping'),
        (N'kod.Belirti', N'anormalSes', N'Ad', N'en', N'Unusual noise'),
        (N'kod.Belirti', N'asiriTitresim', N'Ad', N'en', N'Excessive vibration'),
        (N'kod.Belirti', N'balyaDagiliyor', N'Ad', N'en', N'Bales fall apart'),
        (N'kod.Belirti', N'balyaGevsek', N'Ad', N'en', N'Bales come out loose'),
        (N'kod.Belirti', N'balyaSarilmiyor', N'Ad', N'en', N'Bale is not forming'),
        (N'kod.Belirti', N'balyaSayaciCalismiyor', N'Ad', N'en', N'Bale counter not working'),
        (N'kod.Belirti', N'beslemeDuzgunDegil', N'Ad', N'en', N'Feeding is uneven'),
        (N'kod.Belirti', N'bicakParmakKiriliyor', N'Ad', N'en', N'Blades or tines keep breaking'),
        (N'kod.Belirti', N'bicaklarKesmiyor', N'Ad', N'en', N'Knives are not cutting'),
        (N'kod.Belirti', N'bicaklarKorelmis', N'Ad', N'en', N'Knives are blunt'),
        (N'kod.Belirti', N'bicmeDuzgunDegil', N'Ad', N'en', N'Cut is uneven'),
        (N'kod.Belirti', N'bosaltmaYapmiyor', N'Ad', N'en', N'Will not discharge'),
        (N'kod.Belirti', N'derinlikTutmuyor', N'Ad', N'en', N'Will not hold working depth'),
        (N'kod.Belirti', N'diger', N'Ad', N'en', N'Other'),
        (N'kod.Belirti', N'dugumAtmiyor', N'Ad', N'en', N'Not tying knots'),
        (N'kod.Belirti', N'helezonSikisiyor', N'Ad', N'en', N'Auger keeps jamming'),
        (N'kod.Belirti', N'hidrolikSorunu', N'Ad', N'en', N'Hydraulic problem'),
        (N'kod.Belirti', N'ipKopuyor', N'Ad', N'en', N'Twine keeps breaking'),
        (N'kod.Belirti', N'isinmaYanikKokusu', N'Ad', N'en', N'Overheating / burning smell'),
        (N'kod.Belirti', N'kapakAcilmiyor', N'Ad', N'en', N'Tailgate will not open / close'),
        (N'kod.Belirti', N'karistirmaYetersiz', N'Ad', N'en', N'Mixing is not thorough enough'),
        (N'kod.Belirti', N'kayisZincirAtiyor', N'Ad', N'en', N'Belt or chain jumping off'),
        (N'kod.Belirti', N'kesmeBoyuTutmuyor', N'Ad', N'en', N'Chop length is off'),
        (N'kod.Belirti', N'pikapOtAlmiyor', N'Ad', N'en', N'Pickup is not lifting the crop'),
        (N'kod.Belirti', N'pistonVurma', N'Ad', N'en', N'Plunger / stroke problem'),
        (N'kod.Belirti', N'saftMafsal', N'Ad', N'en', N'PTO shaft / driveline problem'),
        (N'kod.Belirti', N'tartiCalismiyor', N'Ad', N'en', N'Scale not working'),
        (N'kod.Belirti', N'tikanma', N'Ad', N'en', N'It keeps blocking'),
        (N'kod.Belirti', N'tirmikOtToplamiyor', N'Ad', N'en', N'Rake is not gathering the crop'),
        (N'kod.Belirti', N'topragiDuzgunIslemiyor', N'Ad', N'en', N'Soil is not worked evenly'),
        (N'kod.Belirti', N'ucAyakKiriliyor', N'Ad', N'en', N'Points or legs keep breaking'),
        (N'kod.Belirti', N'yagKacagi', N'Ad', N'en', N'Oil leak'),
        (N'kod.DuyuruAltTuru', N'etkinlik', N'Ad', N'en', N'Event'),
        (N'kod.DuyuruAltTuru', N'geriCagirma', N'Ad', N'en', N'Recall'),
        (N'kod.DuyuruAltTuru', N'guvenlik', N'Ad', N'en', N'Safety Notice'),
        (N'kod.DuyuruAltTuru', N'kampanya', N'Ad', N'en', N'Campaign'),
        (N'kod.DuyuruAltTuru', N'yeniUrun', N'Ad', N'en', N'New Product'),
        (N'kod.FaturaTuru', N'baskaKisi', N'Ad', N'en', N'To someone else'),
        (N'kod.FaturaTuru', N'firma', N'Ad', N'en', N'To a company'),
        (N'kod.FaturaTuru', N'kendisi', N'Ad', N'en', N'In my own name'),
        (N'kod.MakineDurumu', N'durdu', N'Ad', N'en', N'The machine will not run at all'),
        (N'kod.MakineDurumu', N'kontrol', N'Ad', N'en', N'It runs, but please check it'),
        (N'kod.MakineDurumu', N'kurulum', N'Ad', N'en', N'It needs its first set-up'),
        (N'kod.MakineDurumu', N'sorunlu', N'Ad', N'en', N'It runs but there is a problem'),
        (N'kod.RizaMetni', N'acikRiza', N'Ad', N'en', N'Consent Statement'),
        (N'kod.RizaMetni', N'aydinlatma', N'Ad', N'en', N'Privacy Notice'),
        (N'kod.RizaMetni', N'ticariIleti', N'Ad', N'en', N'Campaign Notifications'),
        (N'kod.TalepDurumu', N'incelemede', N'Ad', N'en', N'Our team is reviewing it'),
        (N'kod.TalepDurumu', N'iptal', N'Ad', N'en', N'Cancelled'),
        (N'kod.TalepDurumu', N'kapandi', N'Ad', N'en', N'Completed'),
        (N'kod.TalepDurumu', N'onayBekliyor', N'Ad', N'en', N'The service report is being reviewed'),
        (N'kod.TalepDurumu', N'parcaBekliyor', N'Ad', N'en', N'A part is on its way for your machine'),
        (N'kod.TalepDurumu', N'planlandi', N'Ad', N'en', N'Appointment scheduled'),
        (N'kod.TalepDurumu', N'teklif', N'Ad', N'en', N'Your quote is ready'),
        (N'kod.TalepDurumu', N'yeni', N'Ad', N'en', N'Request received'),
        (N'kod.TalepTuru', N'parca', N'Ad', N'en', N'Spare part request'),
        (N'kod.TalepTuru', N'satinalma', N'Ad', N'en', N'Price quote request'),
        (N'kod.TalepTuru', N'servis', N'Ad', N'en', N'Service request'),
        (N'kod.TeklifSonucu', N'musteriVazgecti', N'Ad', N'en', N'Customer declined'),
        (N'kod.TeklifSonucu', N'rakibeGitti', N'Ad', N'en', N'Lost to a competitor'),
        (N'kod.TeklifSonucu', N'satisOldu', N'Ad', N'en', N'Sale completed'),
        (N'kod.TeklifSonucu', N'ulasilamadi', N'Ad', N'en', N'Could not be reached'),
        (N'kod.TraktorGucu', N'bilmiyor', N'Ad', N'en', N'Not sure'),
        (N'kod.TraktorGucu', N'elliBeygirAlti', N'Ad', N'en', N'Under 50 hp'),
        (N'kod.TraktorGucu', N'elliSeksenBeygir', N'Ad', N'en', N'50 - 80 hp'),
        (N'kod.TraktorGucu', N'seksenYuzonBeygir', N'Ad', N'en', N'80 - 110 hp'),
        (N'kod.TraktorGucu', N'yuzelliBeygirUstu', N'Ad', N'en', N'Over 150 hp'),
        (N'kod.TraktorGucu', N'yuzonYuzelliBeygir', N'Ad', N'en', N'110 - 150 hp'),
        (N'kod.UcretDurumu', N'garanti', N'Ad', N'en', N'Covered by warranty'),
        (N'kod.UcretDurumu', N'musteriOdedi', N'Ad', N'en', N'Paid by customer'),
        (N'kod.UlasimZamani', N'aksamustu', N'Ad', N'en', N'Late afternoon (15:00 - 18:00)'),
        (N'kod.UlasimZamani', N'farkEtmez', N'Ad', N'en', N'Any time'),
        (N'kod.UlasimZamani', N'ogledenSonra', N'Ad', N'en', N'Afternoon (12:00 - 15:00)'),
        (N'kod.UlasimZamani', N'sabah', N'Ad', N'en', N'Morning (09:00 - 12:00)'),
        (N'kod.UrunTipi', N'diger', N'Ad', N'en', N'Other'),
        (N'kod.UrunTipi', N'misirSilaji', N'Ad', N'en', N'Maize silage'),
        (N'kod.UrunTipi', N'otCayir', N'Ad', N'en', N'Grass / meadow hay'),
        (N'kod.UrunTipi', N'samanBugday', N'Ad', N'en', N'Straw / wheat'),
        (N'kod.UrunTipi', N'yonca', N'Ad', N'en', N'Alfalfa'),
        (N'kod.YapilanIs', N'arizaBulunamadi', N'Ad', N'en', N'No Fault Found'),
        (N'kod.YapilanIs', N'ayar', N'Ad', N'en', N'Adjustment Made'),
        (N'kod.YapilanIs', N'bakim', N'Ad', N'en', N'Maintenance Done'),
        (N'kod.YapilanIs', N'ilkKurulum', N'Ad', N'en', N'Initial Setup and Commissioning'),
        (N'kod.YapilanIs', N'parcaDegisimi', N'Ad', N'en', N'Part Replaced')
    ) AS v (ListeAdi, Kod, AlanAdi, DilKodu, Metin)
) AS k
    ON h.ListeAdi = k.ListeAdi AND h.Kod = k.Kod AND h.AlanAdi = k.AlanAdi AND h.DilKodu = k.DilKodu
WHEN MATCHED AND EXISTS (SELECT k.Metin COLLATE Latin1_General_100_BIN2 EXCEPT SELECT h.Metin COLLATE Latin1_General_100_BIN2) THEN
    UPDATE SET Metin = k.Metin
WHEN NOT MATCHED BY TARGET THEN
    INSERT (ListeAdi, Kod, AlanAdi, DilKodu, Metin)
    VALUES (k.ListeAdi, k.Kod, k.AlanAdi, k.DilKodu, k.Metin);

/* kod.EskiDegerEslesmesi — 101 satır */

MERGE kod.EskiDegerEslesmesi AS h
USING (
    SELECT CONVERT(nvarchar(128), v.ListeAdi) AS ListeAdi,
           CONVERT(nvarchar(200), v.EskiDeger) AS EskiDeger,
           CONVERT(nvarchar(60), v.YeniKod) AS YeniKod,
           CONVERT(nvarchar(400), v.EslesmeNotu) AS EslesmeNotu
    FROM (VALUES
        (N'erisim.IzinGrubu', N'Hesaplar', N'hesaplar', N'Eski veride ekran yazısı (src/data/yetkiler.js YETKI_KATALOG[].grup)'),
        (N'erisim.IzinGrubu', N'Müşteriler', N'musteriler', N'Eski veride ekran yazısı (src/data/yetkiler.js YETKI_KATALOG[].grup)'),
        (N'erisim.IzinGrubu', N'Servisler', N'servisler', N'Eski veride ekran yazısı (src/data/yetkiler.js YETKI_KATALOG[].grup)'),
        (N'erisim.IzinGrubu', N'Talepler', N'talepler', N'Eski veride ekran yazısı (src/data/yetkiler.js YETKI_KATALOG[].grup)'),
        (N'erisim.IzinGrubu', N'Yönetim', N'yonetim', N'Eski veride ekran yazısı (src/data/yetkiler.js YETKI_KATALOG[].grup)'),
        (N'kod.Arazi', N'150 - 500 dönüm', N'yuzelliBesyuzDonum', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ARAZI)'),
        (N'kod.Arazi', N'50 - 150 dönüm', N'elliYuzelliDonum', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ARAZI)'),
        (N'kod.Arazi', N'50 dönümden az', N'elliDonumAlti', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ARAZI)'),
        (N'kod.Arazi', N'500 dönümden fazla', N'besyuzDonumUstu', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ARAZI)'),
        (N'kod.Arazi', N'Başkasının tarlasında da çalışıyorum', N'baskaTarladaCalisiyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ARAZI)'),
        (N'kod.Belirti', N'Anormal ses geliyor', N'anormalSes', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Ağ veya ip sarmıyor', N'agIpSarmiyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Aşırı titriyor', N'asiriTitresim', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Balya dağılıyor', N'balyaDagiliyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Balya gevşek çıkıyor', N'balyaGevsek', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Balya sarılmıyor', N'balyaSarilmiyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Balya sayacı çalışmıyor', N'balyaSayaciCalismiyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Besleme düzgün değil', N'beslemeDuzgunDegil', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Biçme düzgün değil', N'bicmeDuzgunDegil', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Boşaltma yapmıyor', N'bosaltmaYapmiyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Bıçak veya parmak kırılıyor', N'bicakParmakKiriliyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Bıçaklar kesmiyor', N'bicaklarKesmiyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Bıçaklar körelmiş', N'bicaklarKorelmis', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Derinlik tutmuyor', N'derinlikTutmuyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Diğer', N'diger', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Düğüm atmıyor', N'dugumAtmiyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Helezon sıkışıyor', N'helezonSikisiyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Hidrolikte sorun', N'hidrolikSorunu', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Isınma / yanık kokusu', N'isinmaYanikKokusu', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Kapak açılmıyor / kapanmıyor', N'kapakAcilmiyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Karıştırma yetersiz', N'karistirmaYetersiz', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Kayış veya zincir atıyor', N'kayisZincirAtiyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Kesme boyu tutmuyor', N'kesmeBoyuTutmuyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Pikap otu almıyor', N'pikapOtAlmiyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Piston / vurma sorunu', N'pistonVurma', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Tartı çalışmıyor', N'tartiCalismiyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Toprağı düzgün işlemiyor', N'topragiDuzgunIslemiyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Tıkanma oluyor', N'tikanma', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Tırmık otu toplamıyor', N'tirmikOtToplamiyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Uç / ayak kırılıyor', N'ucAyakKiriliyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Yağ kaçağı var', N'yagKacagi', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'İp kopuyor', N'ipKopuyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.Belirti', N'Şaft / mafsal sorunu', N'saftMafsal', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ORTAK_BELIRTI, BELIRTILER, PARCA_DIGER)'),
        (N'kod.DosyaTuru', N'gorsel', N'foto', NULL),
        (N'kod.FaturaTuru', N'baskasi', N'baskaKisi', N'src/screens/RequestForm.jsx faturaKime'),
        (N'kod.FaturaTuru', N'kendim', N'kendisi', N'src/screens/RequestForm.jsx faturaKime'),
        (N'kod.IptalNedeni', N'Aynı konuda başka talep var', N'ayniKonudaBaskaTalep', N'Eski veride ekran yazısı (src/backoffice/ekranlar/Talepler.jsx IPTAL_SEBEPLERI; src/servis/ekranlar/TalepDetay.jsx IPTAL_NEDENLERI (baska))'),
        (N'kod.IptalNedeni', N'Başka Bir Neden', N'baskaNeden', N'Eski veride Servisim iptal nedeni (src/servis/ekranlar/TalepDetay.jsx IPTAL_NEDENLERI)'),
        (N'kod.IptalNedeni', N'Başka bir neden', N'baskaNeden', N'Eski veride Servisim iptal nedeni (src/servis/ekranlar/TalepDetay.jsx IPTAL_NEDENLERI)'),
        (N'kod.IptalNedeni', N'Bu talep kapsamımız dışında', N'kapsamDisi', N'Eski veride ekran yazısı (src/backoffice/ekranlar/Talepler.jsx IPTAL_SEBEPLERI; src/servis/ekranlar/TalepDetay.jsx IPTAL_NEDENLERI (baska))'),
        (N'kod.IptalNedeni', N'Müşteri Vazgeçti', N'musteriVazgecti', N'Eski veride Servisim iptal nedeni (src/servis/ekranlar/TalepDetay.jsx IPTAL_NEDENLERI)'),
        (N'kod.IptalNedeni', N'Müşteri vazgeçti', N'musteriVazgecti', N'Eski veride ekran yazısı (src/backoffice/ekranlar/Talepler.jsx IPTAL_SEBEPLERI; src/servis/ekranlar/TalepDetay.jsx IPTAL_NEDENLERI (baska))'),
        (N'kod.IptalNedeni', N'Müşteriye Ulaşılamadı', N'musteriyeUlasilamadi', N'Eski veride Servisim iptal nedeni (src/servis/ekranlar/TalepDetay.jsx IPTAL_NEDENLERI)'),
        (N'kod.IptalNedeni', N'Müşteriye ulaşılamadı', N'musteriyeUlasilamadi', N'Eski veride ekran yazısı (src/backoffice/ekranlar/Talepler.jsx IPTAL_SEBEPLERI; src/servis/ekranlar/TalepDetay.jsx IPTAL_NEDENLERI (baska))'),
        (N'kod.IptalNedeni', N'Sorun telefonda çözüldü', N'telefondaCozuldu', N'Eski veride ekran yazısı (src/backoffice/ekranlar/Talepler.jsx IPTAL_SEBEPLERI; src/servis/ekranlar/TalepDetay.jsx IPTAL_NEDENLERI (baska))'),
        (N'kod.IptalNedeni', N'Talep Yanlış Açılmış', N'yanlisAcilmis', N'Eski veride Servisim iptal nedeni (src/servis/ekranlar/TalepDetay.jsx IPTAL_NEDENLERI)'),
        (N'kod.IptalNedeni', N'Talep yanlış açılmış', N'yanlisAcilmis', N'Eski veride Servisim iptal nedeni (src/servis/ekranlar/TalepDetay.jsx IPTAL_NEDENLERI)'),
        (N'kod.IptalNedeni', N'Yanlışlıkla açılmış talep', N'yanlisAcilmis', N'Eski veride ekran yazısı (src/backoffice/ekranlar/Talepler.jsx IPTAL_SEBEPLERI; src/servis/ekranlar/TalepDetay.jsx IPTAL_NEDENLERI (baska))'),
        (N'kod.IptalNedeni', N'baska', N'baskaNeden', N'Eski veride Servisim iptal nedeni (src/servis/ekranlar/TalepDetay.jsx IPTAL_NEDENLERI)'),
        (N'kod.IptalNedeni', N'ulasilamadi', N'musteriyeUlasilamadi', N'Eski veride Servisim iptal nedeni (src/servis/ekranlar/TalepDetay.jsx IPTAL_NEDENLERI)'),
        (N'kod.IptalNedeni', N'vazgecti', N'musteriVazgecti', N'Eski veride Servisim iptal nedeni (src/servis/ekranlar/TalepDetay.jsx IPTAL_NEDENLERI)'),
        (N'kod.IptalNedeni', N'yanlis', N'yanlisAcilmis', N'Eski veride Servisim iptal nedeni (src/servis/ekranlar/TalepDetay.jsx IPTAL_NEDENLERI)'),
        (N'kod.KayitKaynagi', N'connect', N'musteri', NULL),
        (N'kod.KayitKaynagi', N'elle', N'personel', NULL),
        (N'kod.KayitKaynagi', N'excel', N'iceAktarim', NULL),
        (N'kod.KayitKaynagi', N'servisElle', N'servis', NULL),
        (N'kod.KaynakUygulama', N'app', N'connect', NULL),
        (N'kod.KaynakUygulama', N'servis', N'servisim', NULL),
        (N'kod.Masa', N'parca', N'parcaMasasi', N'src/lib/servisKaydi.js kapininSonucu masa'),
        (N'kod.Masa', N'servis', N'servisMasasi', N'src/lib/servisKaydi.js kapininSonucu masa'),
        (N'kod.ParaBirimi', N'TL', N'TRY', N'src/marka/katalog/para.js PARA_BIRIMI'),
        (N'kod.ServisAtamaKaynagi', N'atama', N'makineAtamasi', N'src/lib/servisAtama.js kaynak'),
        (N'kod.ServisAtamaKaynagi', N'bayi', N'bayiServisi', N'src/lib/servisAtama.js kaynak'),
        (N'kod.TalepDurumu', N'bayide', N'kapandi', N'src/backoffice/veri.js DURUMLAR: Bayide durumu kaldırıldı; sahip bayi'),
        (N'kod.TalepDurumu', N'gonderildi', N'kapandi', N'src/backoffice/veri.js DURUMLAR: Gönderildi durumu kaldırıldı'),
        (N'kod.TeklifSonucu', N'Müşteri vazgeçti', N'musteriVazgecti', N'Eski veride ekran yazısı (src/backoffice/ekranlar/Talepler.jsx KAPANIS_ALANLARI.satinalma (sonuc.secenek); İngilizcesi src/data/talepAlanlari.js sozlukKur)'),
        (N'kod.TeklifSonucu', N'Rakibe gitti', N'rakibeGitti', N'Eski veride ekran yazısı (src/backoffice/ekranlar/Talepler.jsx KAPANIS_ALANLARI.satinalma (sonuc.secenek); İngilizcesi src/data/talepAlanlari.js sozlukKur)'),
        (N'kod.TeklifSonucu', N'Satış oldu', N'satisOldu', N'Eski veride ekran yazısı (src/backoffice/ekranlar/Talepler.jsx KAPANIS_ALANLARI.satinalma (sonuc.secenek); İngilizcesi src/data/talepAlanlari.js sozlukKur)'),
        (N'kod.TeklifSonucu', N'Ulaşılamadı', N'ulasilamadi', N'Eski veride ekran yazısı (src/backoffice/ekranlar/Talepler.jsx KAPANIS_ALANLARI.satinalma (sonuc.secenek); İngilizcesi src/data/talepAlanlari.js sozlukKur)'),
        (N'kod.TraktorGucu', N'110 - 150 beygir', N'yuzonYuzelliBeygir', N'Eski veride ekran yazısı (src/data/talepAlanlari.js TRAKTOR)'),
        (N'kod.TraktorGucu', N'150 beygirin üstü', N'yuzelliBeygirUstu', N'Eski veride ekran yazısı (src/data/talepAlanlari.js TRAKTOR)'),
        (N'kod.TraktorGucu', N'50 - 80 beygir', N'elliSeksenBeygir', N'Eski veride ekran yazısı (src/data/talepAlanlari.js TRAKTOR)'),
        (N'kod.TraktorGucu', N'50 beygirin altı', N'elliBeygirAlti', N'Eski veride ekran yazısı (src/data/talepAlanlari.js TRAKTOR)'),
        (N'kod.TraktorGucu', N'80 - 110 beygir', N'seksenYuzonBeygir', N'Eski veride ekran yazısı (src/data/talepAlanlari.js TRAKTOR)'),
        (N'kod.TraktorGucu', N'Bilmiyorum', N'bilmiyor', N'Eski veride ekran yazısı (src/data/talepAlanlari.js TRAKTOR)'),
        (N'kod.UcretDurumu', N'Garanti kapsamında', N'garanti', N'Eski veride ekran yazısı (src/lib/servisKaydi.js UCRET_YAZI)'),
        (N'kod.UcretDurumu', N'Müşteri ödedi', N'musteriOdedi', N'Eski veride ekran yazısı (src/lib/servisKaydi.js UCRET_YAZI)'),
        (N'kod.UlasimZamani', N'Akşamüstü (15.00 - 18.00)', N'aksamustu', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ULASIM_ZAMANI)'),
        (N'kod.UlasimZamani', N'Fark etmez', N'farkEtmez', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ULASIM_ZAMANI)'),
        (N'kod.UlasimZamani', N'Sabah (09.00 - 12.00)', N'sabah', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ULASIM_ZAMANI)'),
        (N'kod.UlasimZamani', N'Öğleden sonra (12.00 - 15.00)', N'ogledenSonra', N'Eski veride ekran yazısı (src/data/talepAlanlari.js ULASIM_ZAMANI)'),
        (N'kod.UrunTipi', N'Diğer', N'diger', N'Eski veride ekran yazısı (src/data/talepAlanlari.js URUN_TIPI)'),
        (N'kod.UrunTipi', N'Mısır silajı', N'misirSilaji', N'Eski veride ekran yazısı (src/data/talepAlanlari.js URUN_TIPI)'),
        (N'kod.UrunTipi', N'Ot / çayır', N'otCayir', N'Eski veride ekran yazısı (src/data/talepAlanlari.js URUN_TIPI)'),
        (N'kod.UrunTipi', N'Saman / buğday', N'samanBugday', N'Eski veride ekran yazısı (src/data/talepAlanlari.js URUN_TIPI)'),
        (N'kod.UrunTipi', N'Yonca', N'yonca', N'Eski veride ekran yazısı (src/data/talepAlanlari.js URUN_TIPI)'),
        (N'kod.YapilanIs', N'Arıza Bulunamadı', N'arizaBulunamadi', N'Eski veride ekran yazısı (src/lib/servisKaydi.js YAPILAN_IS)'),
        (N'kod.YapilanIs', N'Ayar Yapıldı', N'ayar', N'Eski veride ekran yazısı (src/lib/servisKaydi.js YAPILAN_IS)'),
        (N'kod.YapilanIs', N'Bakım Yapıldı', N'bakim', N'Eski veride ekran yazısı (src/lib/servisKaydi.js YAPILAN_IS)'),
        (N'kod.YapilanIs', N'Parça Değişti', N'parcaDegisimi', N'Eski veride ekran yazısı (src/lib/servisKaydi.js YAPILAN_IS)'),
        (N'kod.YapilanIs', N'İlk Kurulum ve Çalıştırma', N'ilkKurulum', N'Eski veride ekran yazısı (src/lib/servisKaydi.js YAPILAN_IS)')
    ) AS v (ListeAdi, EskiDeger, YeniKod, EslesmeNotu)
) AS k
    ON h.ListeAdi = k.ListeAdi AND h.EskiDeger = k.EskiDeger
WHEN MATCHED AND EXISTS (SELECT k.YeniKod COLLATE Latin1_General_100_BIN2, k.EslesmeNotu COLLATE Latin1_General_100_BIN2 EXCEPT SELECT h.YeniKod COLLATE Latin1_General_100_BIN2, h.EslesmeNotu COLLATE Latin1_General_100_BIN2) THEN
    UPDATE SET YeniKod = k.YeniKod, EslesmeNotu = k.EslesmeNotu
WHEN NOT MATCHED BY TARGET THEN
    INSERT (ListeAdi, EskiDeger, YeniKod, EslesmeNotu)
    VALUES (k.ListeAdi, k.EskiDeger, k.YeniKod, k.EslesmeNotu);

/* kod.IslemKategorisi — kod-eslesmeleri.json "pasif" kaydı */
UPDATE kod.IslemKategorisi SET Aktif = 0
WHERE Kod IN (N'stok', N'demo') AND Aktif = 1;
