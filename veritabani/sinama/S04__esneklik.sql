-- giris: sahip
/* ==========================================================================
   S04 — esneklik sınamaları (tasarim.md 7.6, adım kodları ES-01 … ES-18)

   SORU: ikinci bir marka, ikinci bir şirket, yeni bir dil, yeni bir talep
   durumu, yeni bir ayar — bunlar ŞEMA DEĞİŞTİRMEDEN, yalnız veri eklenerek
   kurulabiliyor mu? Bu betikte tek bir CREATE/ALTER yoktur; hepsi INSERT.

   ES-19 (değişmiş T05/T06 ile guncelle) ve ES-20 (son parmak izi) Node
   tarafındadır (tools/vt/sinama.mjs). ES-19 bu betiğin BIRAKTIĞI aktif
   katalog ve kod satırlarını arar: bu yüzden S04'ün verisi COMMIT edilir ve
   geri alınmaz.

   BÖLÜMLER
     1. sahip     katalog, kod listeleri, şirket, ayar, tarife (uygulama
                  rolünün yazamadığı tablolar — Bölüm 4.2)
     2. uygulama  iş verisi: makine, talep, ziyaret, hak ediş, hareket
     3. sahip     görünüm ve yalıtım denetimleri

   BEKLENTİ TUTMAZSA: THROW 59999, N'<adım kodu>: beklenen <no>, gelen <no>'.
   ========================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Adim      nvarchar(20);
DECLARE @Beklenen  int;
DECLARE @Gelen     int;
DECLARE @Mesaj     nvarchar(2048);
DECLARE @HataMetni nvarchar(2048);
DECLARE @Sayi      int;

DECLARE @Servis   uniqueidentifier;
DECLARE @Servis2  uniqueidentifier;
DECLARE @Personel uniqueidentifier;
DECLARE @PersonelAd nvarchar(150);

SELECT @Servis  = Kimlik FROM servis.Servis WHERE KayitNo = 3;
SELECT @Servis2 = Kimlik FROM servis.Servis WHERE KayitNo = 4;
SELECT @Personel = k.Kimlik, @PersonelAd = p.AdSoyad
  FROM erisim.Kullanici AS k JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
 WHERE k.GirisAdi = N'ornek.servis.masasi';

IF EXISTS (SELECT 1 FROM katalog.Marka WHERE Kod = N'globale')
    THROW 59999, N'S04 verisi zaten kurulu; sınama veritabanı sıfırdan kurulmalı', 1;

/* ------------------------------------------------------------------ ES-01
   İkinci marka: globale. Marka, ürün, parça grubu, parça, fiyat listesi,
   belirti kapsamı ve bir servise yetki — hepsi veri. */
SET @Adim = N'ES-01';
BEGIN TRANSACTION;
INSERT katalog.Marka (Kod, Ad, SirketKodu, GarantiYil, SeriKuraliKodu, KaynakNotu,
                      ParaBirimiKodu, KdvOrani, Aktif)
VALUES (N'globale', N'Globale', N'paksan', 3, N'onekYilSira',
        N'Globale sınama markası', N'TRY', 0.2000, 1);

INSERT katalog.Urun (MarkaKodu, Kod, Ad, KategoriKodu, SeriOneki, Aktif)
VALUES (N'globale', N'globale-rulo', N'Globale Rulo Balya Makinesi',
        N'rulo-balya', N'GLBR', 1);

INSERT katalog.ParcaGrubu (MarkaKodu, Kod, Ad, DestekAilesiKodu)
VALUES (N'globale', N'globale-sarim', N'Globale Sarım Grubu', N'rulo');

INSERT katalog.Parca (MarkaKodu, Kod, Ad, GrupKodu, Aktif)
VALUES (N'globale', N'GLB0000001', N'Globale Sarım Çemberi', N'globale-sarim', 1);

INSERT katalog.FiyatListesi (MarkaKodu, Kod, KaynakDosyaAdi, KaynakOzeti, ListeKdvHaric,
                             ParaBirimiKodu, DurumKodu, YururlukBaslangicTarihi, OlusmaZamani)
SELECT N'globale', N'2026-07-1', N'globale-2026-07.xlsx', 0x51, 1,
       N'TRY', f.DurumKodu, f.YururlukBaslangicTarihi, SYSUTCDATETIME()
  FROM katalog.FiyatListesi AS f WHERE f.MarkaKodu = N'paksan' AND f.Kod = N'2026-07-1';

/* Belirti listesi markaya göre ayrıdır: globale/rulo PAKSAN'ınkinden bağımsız. */
INSERT kod.BelirtiKapsami (MarkaKodu, DestekAilesiKodu, BelirtiKodu, Sira)
VALUES (N'globale', N'rulo', N'balyaSarilmiyor', 1),
       (N'globale', N'rulo', N'anormalSes', 2);

INSERT servis.MarkaYetkisi (ServisKimlik, MarkaKodu) VALUES (@Servis, N'globale');
COMMIT TRANSACTION;

/* (globale, rulo) belirti listesi PAKSAN'ınkinden ayrı olmalı. */
SELECT @Sayi = COUNT(*) FROM kod.BelirtiKapsami WHERE MarkaKodu = N'globale';
IF @Sayi <> 2
BEGIN SET @Mesaj = CONCAT(@Adim, N': globale belirti kapsamı 2 satır olmalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;
IF (SELECT COUNT(*) FROM kod.BelirtiKapsami WHERE MarkaKodu = N'paksan' AND DestekAilesiKodu = N'rulo') = @Sayi
BEGIN SET @Mesaj = CONCAT(@Adim, N': globale belirti listesi PAKSAN''ınkiyle aynı büyüklükte; ayrı liste beklenirdi'); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ ES-04
   İkinci şirket: gallignani. Şirket, banka hesabı, marka ve şirket ayarı. */
SET @Adim = N'ES-04';
BEGIN TRANSACTION;
INSERT sirket.Sirket (Kod, Ad, KisaAd, Unvan, LogoFirmaNo)
VALUES (N'gallignani', N'Gallignani Makina', N'Gallignani',
        N'Gallignani Makina Sanayi ve Ticaret A.Ş.', 2);
INSERT sirket.BankaHesabi (SirketKodu, ParaBirimiKodu, BankaAdi, Iban, HesapUnvani, Aktif)
VALUES (N'gallignani', N'TRY', N'S04 Banka Adı',
        N'TR330006100519786457841326', N'Gallignani Makina Sanayi ve Ticaret A.Ş.', 1);
INSERT katalog.Marka (Kod, Ad, SirketKodu, GarantiYil, SeriKuraliKodu, KaynakNotu,
                      ParaBirimiKodu, Aktif)
VALUES (N'gallignani', N'Gallignani', N'gallignani', 2, N'onekYilSira',
        N'Gallignani sınama markası', N'TRY', 1);
INSERT katalog.Urun (MarkaKodu, Kod, Ad, KategoriKodu, SeriOneki, Aktif)
VALUES (N'gallignani', N'gallignani-rulo', N'Gallignani Rulo Balya Makinesi',
        N'rulo-balya', N'GLGR', 1);
INSERT katalog.ParcaGrubu (MarkaKodu, Kod, Ad) VALUES (N'gallignani', N'gallignani-sarim', N'Gallignani Sarım Grubu');
INSERT katalog.Parca (MarkaKodu, Kod, Ad, GrupKodu, Aktif)
VALUES (N'gallignani', N'GLG0000001', N'Gallignani Sarım Çemberi', N'gallignani-sarim', 1);
/* Şirket ayarı: aynı anahtarın şirkete özel değeri. */
INSERT sistem.Ayar (Anahtar, SirketKodu, DegerTuru, Deger, Aciklama)
VALUES (N'KdvOrani', N'gallignani', N'ondalik', N'0.1', N'Gallignani için KDV oranı');
INSERT servis.MarkaYetkisi (ServisKimlik, MarkaKodu) VALUES (@Servis, N'gallignani');
/* Markaya özel işçilik tarifesi (22.09.2026, işçilik süreyle yazılıyor):
   gallignani ziyaretinin saati B02'nin genel tarifesiyle (50,00) değil
   bununla çarpılır. İkinci bölümde ES-04 sınar. */
INSERT hakedis.Tarife (KalemTuruKodu, MarkaKodu, BirimKodu, BirimTutar, ParaBirimiKodu, GecerlilikBaslangicTarihi)
VALUES (N'iscilik', N'gallignani', N'saat', 80.00, N'TRY', '2026-01-01');
COMMIT TRANSACTION;

/* ------------------------------------------------------------------ ES-07
   Yeni dil: it. Kod çevirisi, ürün çevirisi ve KVKK metni. */
SET @Adim = N'ES-07';
BEGIN TRANSACTION;
INSERT kod.Dil (Kod, Ad, Sira, Aktif) VALUES (N'it', N'İtalyanca', 3, 1);
INSERT kod.Ceviri (ListeAdi, Kod, AlanAdi, DilKodu, Metin)
VALUES (N'kod.TalepDurumu', N'yeni', N'Ad', N'it', N'In attesa di ricambi');
INSERT kod.Ceviri (ListeAdi, Kod, AlanAdi, DilKodu, Metin)
VALUES (N'katalog.Kategori', N'rulo-balya', N'KisaAd', N'it', N'Rotopresse');
INSERT katalog.UrunCevirisi (MarkaKodu, UrunKodu, DilKodu, Ad, Slogan, Aciklama)
VALUES (N'globale', N'globale-rulo', N'it', N'Rotopressa Globale',
        N'Balla dopo balla', N'Rotopressa a camera variabile');
INSERT kvkk.MetinSurumu (MetinKodu, Surum, DilKodu, Baslik, IcerikJson, IcerikOzeti, AsilMetin, MetinTarihi)
SELECT m.MetinKodu, m.Surum, N'it', N'Informativa sulla privacy',
       m.IcerikJson, m.IcerikOzeti, 0, m.MetinTarihi
  FROM kvkk.MetinSurumu AS m WHERE m.MetinKodu = N'aydinlatma' AND m.Surum = N'1.0' AND m.DilKodu = N'tr';
COMMIT TRANSACTION;

/* CD-CEVIRI ağı: çeviri satırlarının listesi gerçek tablo, kodu hedefte var,
   alan adı o tablonun metin kolonu olmalı. */
SET @Sayi = 0;
SELECT @Sayi = COUNT(*) FROM kod.Ceviri AS c
 WHERE OBJECT_ID(c.ListeAdi) IS NULL
    OR NOT EXISTS (SELECT 1 FROM sys.columns AS k
                    WHERE k.object_id = OBJECT_ID(c.ListeAdi)
                      AND k.name COLLATE DATABASE_DEFAULT = c.AlanAdi COLLATE DATABASE_DEFAULT);
IF @Sayi <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': kod.Ceviri satırlarında gerçek olmayan liste ya da alan adı: ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ ES-08
   Yeni talep durumları: biri açık ve gecikme sayan, biri kapalı. */
SET @Adim = N'ES-08';
BEGIN TRANSACTION;
INSERT kod.TalepDurumu (Kod, Ad, Kapali, GecikmeSayilir, Sira, Aktif)
VALUES (N'tekrarZiyaretBekliyor', N'Tekrar ziyaret bekliyor', 0, 1, 90, 1),
       (N'odemeYapilmadi',        N'Ödeme yapılmadı',        1, 0, 91, 1);
INSERT kod.TalepTuruDurumu (TurKodu, DurumKodu, ElleSecilebilir)
VALUES (N'servis', N'tekrarZiyaretBekliyor', 1),
       (N'parca',  N'odemeYapilmadi', 1);
COMMIT TRANSACTION;

/* ------------------------------------------------------------------ ES-09
   Yeni talep türü: kurulum. Tür, önek, numara kuralı, tür uydusu ve masa. */
SET @Adim = N'ES-09';
BEGIN TRANSACTION;
INSERT kod.TalepTuru (Kod, Ad, Sira, Aktif) VALUES (N'kurulum', N'Kurulum', 4, 1);
INSERT sistem.NumaraOneki (Onek, KayitTuruKodu, Aciklama, Aktif) VALUES (N'KUR', N'talep', N'Kurulum talebi numarası', 1);
INSERT kod.TalepNumaraKurali (TurKodu, KaynakKodu, MarkaKodu, NumaraOneki)
VALUES (N'kurulum', N'backoffice', NULL, N'KUR');
INSERT kod.TalepTuruUydusu (TurKodu, UyduKodu) VALUES (N'kurulum', N'servisZiyareti');
INSERT kod.Masa (Kod, Ad, TalepTuruKodu, Sira, Aktif) VALUES (N'kurulumMasasi', N'Kurulum', N'kurulum', 3, 1);
INSERT kod.TalepTuruDurumu (TurKodu, DurumKodu, ElleSecilebilir)
VALUES (N'kurulum', N'yeni', 1), (N'kurulum', N'planlandi', 1),
       (N'kurulum', N'onayBekliyor', 0), (N'kurulum', N'kapandi', 1), (N'kurulum', N'iptal', 1);
COMMIT TRANSACTION;

/* ------------------------------------------------------------------ ES-10
   Yeni hak ediş kalem türü: konaklama; sabit birimli tarife. */
SET @Adim = N'ES-10';
BEGIN TRANSACTION;
INSERT kod.HakEdisKalemTuru (Kod, Ad, Sira, Aktif) VALUES (N'konaklama', N'Konaklama', 4, 1);
INSERT hakedis.Tarife (KalemTuruKodu, MarkaKodu, BirimKodu, BirimTutar, ParaBirimiKodu, GecerlilikBaslangicTarihi)
VALUES (N'konaklama', NULL, N'sabit', 900.00, N'TRY', '2026-01-01');
COMMIT TRANSACTION;

/* ------------------------------------------------------------------ ES-11
   Markaya özel numara öneki: globale servis talebi GLS alır. */
SET @Adim = N'ES-11';
BEGIN TRANSACTION;
INSERT sistem.NumaraOneki (Onek, KayitTuruKodu, Aciklama, Aktif) VALUES (N'GLS', N'talep', N'Globale servis talebi numarası', 1);
INSERT kod.TalepNumaraKurali (TurKodu, KaynakKodu, MarkaKodu, NumaraOneki)
VALUES (N'servis', N'connect', N'globale', N'GLS');
COMMIT TRANSACTION;

/* ------------------------------------------------------------------ ES-12
   Yeni aktör türü ve uygulama: bayi. Kod satırları ve bayi kullanıcısı. */
SET @Adim = N'ES-12';
DECLARE @BayiKul uniqueidentifier = '5A040001-0000-4000-8000-000000000001';
BEGIN TRANSACTION;
INSERT kod.AktorTuru (Kod, Ad, Sira, Aktif) VALUES (N'bayi', N'Bayi', 6, 1);
INSERT kod.KaynakUygulama (Kod, Ad, Sira, Aktif) VALUES (N'bayiPaneli', N'Bayi paneli', 8, 1);
INSERT kod.AliciTuru (Kod, Ad, Sira, Aktif) VALUES (N'bayi', N'Bayi', 4, 1);
INSERT kod.KayitKaynagi (Kod, Ad, Sira, Aktif) VALUES (N'bayi', N'Bayi paneli', 7, 1);
INSERT erisim.Kullanici (Kimlik, GirisAdi, TurKodu) VALUES (@BayiKul, N's04.bayi', N'bayi');
COMMIT TRANSACTION;

/* ------------------------------------------------------------------ ES-14
   Yeni dış sistem: efatura. */
SET @Adim = N'ES-14';
BEGIN TRANSACTION;
INSERT kod.DisSistem (Kod, Ad, Sira, Aktif) VALUES (N'efatura', N'e-Fatura', 4, 1);
COMMIT TRANSACTION;

/* ------------------------------------------------------------------ ES-15
   Yeni bildirim kanalı: whatsapp. */
SET @Adim = N'ES-15';
BEGIN TRANSACTION;
INSERT kod.BildirimKanali (Kod, Ad, Sira, Aktif) VALUES (N'whatsapp', N'WhatsApp', 5, 1);
INSERT kod.DisSistem (Kod, Ad, Sira, Aktif) VALUES (N'whatsappBulut', N'WhatsApp Bulut', 5, 1);
COMMIT TRANSACTION;

/* ------------------------------------------------------------------ ES-16
   Yeni para birimi: EUR; EUR fiyat listesi. */
SET @Adim = N'ES-16';
BEGIN TRANSACTION;
INSERT kod.ParaBirimi (Kod, Ad, Sira, Aktif) VALUES (N'EUR', N'Euro', 2, 1);
/* EUR listesi gallignani markasına yazılır: UX_katalog_FiyatListesi_Yururlukte
   marka başına tek yürürlükteki liste bırakır, globale'nin TRY listesi
   ES-01'de açıldı. */
INSERT katalog.FiyatListesi (MarkaKodu, Kod, KaynakDosyaAdi, KaynakOzeti, ListeKdvHaric,
                             ParaBirimiKodu, DurumKodu, YururlukBaslangicTarihi, OlusmaZamani)
SELECT N'gallignani', N'2026-07-eur', N'gallignani-2026-07-eur.xlsx', 0x52, 1,
       N'EUR', f.DurumKodu, f.YururlukBaslangicTarihi, SYSUTCDATETIME()
  FROM katalog.FiyatListesi AS f WHERE f.MarkaKodu = N'paksan' AND f.Kod = N'2026-07-1';
INSERT hakedis.Tarife (KalemTuruKodu, MarkaKodu, BirimKodu, BirimTutar, ParaBirimiKodu, GecerlilikBaslangicTarihi)
VALUES (N'yol', NULL, N'km', 1.00, N'EUR', '2026-01-01');
COMMIT TRANSACTION;

/* ------------------------------------------------------------------ ES-17
   Yeni kişi rolü: muhasebeci. */
SET @Adim = N'ES-17';
BEGIN TRANSACTION;
INSERT kod.KisiRolu (Kod, Ad, Sira, Aktif) VALUES (N'muhasebeci', N'Muhasebeci', 3, 1);
COMMIT TRANSACTION;

/* ------------------------------------------------------------------ ES-18
   Öteki kod listelerine yeni satırlar ve markaya özel ayar. */
SET @Adim = N'ES-18';
BEGIN TRANSACTION;
INSERT kod.IceAktarimTuru (Kod, Ad, Sira, Aktif) VALUES (N'bayiStokListesi', N'Bayi stok listesi', 9, 1);
INSERT kod.BelgeTuru (Kod, Ad, Sira, Aktif) VALUES (N'masrafFisi', N'Masraf fişi', 10, 1);
INSERT kod.IptalNedeni (Kod, Ad, AciklamaZorunlu, Sira, Aktif) VALUES (N'stokYok', N'Parça stokta yok', 0, 9, 1);
INSERT kod.Birim (Kod, Ad, Sira, Aktif) VALUES (N'metre', N'Metre', 5, 1);
INSERT sistem.Ayar (Anahtar, MarkaKodu, DegerTuru, Deger, Aciklama)
VALUES (N'TalepGecikmeSaati', N'globale', N'tamsayi', N'96', N'Globale için talep gecikme eşiği');
COMMIT TRANSACTION;

/* ES-06 için: markanın şirketi sonradan değişirse eski satırlar donmalı.
   Önce iş verisi yazılır (uygulama bölümü), değişiklik üçüncü bölümde. */
PRINT 'S04 sahip bölümü (kod ve katalog) tamam.';

-- giris: uygulama
/* ==========================================================================
   S04 — uygulama bölümü: yeni markanın ve yeni kodların iş verisi

   Birinci bölümde yalnız veri eklenerek kurulan marka, şirket, durum, tür,
   para birimi ve aktör türü burada gerçek bir iş zincirinde kullanılır.
   Hiçbiri şema değişikliği istemez.
   ========================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Adim      nvarchar(20);
DECLARE @Beklenen  int;
DECLARE @Gelen     int;
DECLARE @Mesaj     nvarchar(2048);
DECLARE @HataMetni nvarchar(2048);
DECLARE @Sayi      int;
DECLARE @Metin     nvarchar(400);
DECLARE @Numara    nvarchar(10);
DECLARE @Onek      nvarchar(3);
DECLARE @Sira      int;

DECLARE @Hesap    uniqueidentifier = '5A040001-0000-4000-8000-000000000010';
DECLARE @MakineG  uniqueidentifier = '5A040001-0000-4000-8000-000000000011';
DECLARE @MakineL  uniqueidentifier = '5A040001-0000-4000-8000-000000000012';
DECLARE @TalepG   uniqueidentifier = '5A040001-0000-4000-8000-000000000013';
DECLARE @TalepL   uniqueidentifier = '5A040001-0000-4000-8000-000000000014';
DECLARE @ZiyaretG uniqueidentifier = '5A040001-0000-4000-8000-000000000015';
DECLARE @ZiyaretL uniqueidentifier = '5A040001-0000-4000-8000-000000000016';
DECLARE @HakEdisG uniqueidentifier = '5A040001-0000-4000-8000-000000000017';
DECLARE @HakEdisL uniqueidentifier = '5A040001-0000-4000-8000-000000000018';
DECLARE @TalepK   uniqueidentifier = '5A040001-0000-4000-8000-000000000019';
DECLARE @ZiyaretK uniqueidentifier = '5A040001-0000-4000-8000-00000000001A';
DECLARE @HakEdisK uniqueidentifier = '5A040001-0000-4000-8000-00000000001B';
DECLARE @DokumP   uniqueidentifier = '5A040001-0000-4000-8000-00000000001C';
DECLARE @DokumL   uniqueidentifier = '5A040001-0000-4000-8000-00000000001D';
DECLARE @DokumE   uniqueidentifier = '5A040001-0000-4000-8000-00000000001E';

DECLARE @Servis   uniqueidentifier;
DECLARE @Servis2  uniqueidentifier;
DECLARE @Personel uniqueidentifier;
DECLARE @PersonelAd nvarchar(150);
DECLARE @ServisKul uniqueidentifier;
DECLARE @BayiKul  uniqueidentifier;
DECLARE @Bayi     uniqueidentifier;
DECLARE @Yil smallint = YEAR(SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time');
DECLARE @Ay  tinyint  = MONTH(SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time');

SELECT @Servis  = Kimlik FROM servis.Servis WHERE KayitNo = 3;
SELECT @Servis2 = Kimlik FROM servis.Servis WHERE KayitNo = 4;
SELECT @Bayi    = Kimlik FROM bayi.Bayi WHERE KayitNo = 1;
SELECT @Personel = k.Kimlik, @PersonelAd = p.AdSoyad
  FROM erisim.Kullanici AS k JOIN personel.Personel AS p ON p.KullaniciKimlik = k.Kimlik
 WHERE k.GirisAdi = N'ornek.servis.masasi';
SELECT @ServisKul = g.KullaniciKimlik FROM servis.GirisHesabi AS g WHERE g.ServisKimlik = @Servis;
SELECT @BayiKul = Kimlik FROM erisim.Kullanici WHERE GirisAdi = N's04.bayi';

EXEC sistem.YapanAyarla @YapanTuruKodu = N'personel', @YapanKullaniciKimlik = @Personel,
     @YapanAdi = @PersonelAd, @KaynakUygulamaKodu = N'backoffice';

/* Sahne: müşteri + globale ve gallignani makineleri. */
BEGIN TRANSACTION;
INSERT musteri.Hesap (Kimlik, KonumUlkeKodu, IlKodu, DurumKodu, TelefonUlkeKodu, TelefonE164, TelefonUlusal)
VALUES (@Hesap, N'TR', 44, N'aktif', N'TR', N'+905440000401', N'5440000401');
INSERT makine.Makine (Kimlik, SeriNo, MarkaKodu, UrunKodu, OlusmaKaynagiKodu,
                      YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@MakineG, N'GLBR202400401', N'globale', N'globale-rulo', N'personel',
        N'personel', @Personel, @PersonelAd, N'backoffice'),
       (@MakineL, N'GLGR202400401', N'gallignani', N'gallignani-rulo', N'personel',
        N'personel', @Personel, @PersonelAd, N'backoffice');
INSERT makine.MakineSahipligi (MakineKimlik, HesapKimlik, KaynakKodu,
                               YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@MakineG, @Hesap, N'personel', N'personel', @Personel, @PersonelAd, N'backoffice'),
       (@MakineL, @Hesap, N'personel', N'personel', @Personel, @PersonelAd, N'backoffice');
COMMIT TRANSACTION;

/* ------------------------------------------------------------------ ES-11
   Markaya özel önek: globale servis talebi GLS, paksan SRV alır. */
SET @Adim = N'ES-11';
SELECT TOP (1) @Onek = NumaraOneki FROM kod.TalepNumaraKurali
 WHERE TurKodu = N'servis' AND KaynakKodu = N'connect' AND (MarkaKodu = N'globale' OR MarkaKodu IS NULL)
 ORDER BY CASE WHEN MarkaKodu IS NULL THEN 1 ELSE 0 END;
IF @Onek <> N'GLS'
BEGIN SET @Mesaj = CONCAT(@Adim, N': globale için beklenen GLS, gelen ', ISNULL(@Onek, N'(boş)')); THROW 59999, @Mesaj, 1; END;

SELECT TOP (1) @Metin = NumaraOneki FROM kod.TalepNumaraKurali
 WHERE TurKodu = N'servis' AND KaynakKodu = N'connect' AND (MarkaKodu = N'paksan' OR MarkaKodu IS NULL)
 ORDER BY CASE WHEN MarkaKodu IS NULL THEN 1 ELSE 0 END;
IF @Metin <> N'SRV'
BEGIN SET @Mesaj = CONCAT(@Adim, N': paksan için beklenen SRV, gelen ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ ES-01
   Globale makinesiyle talep açılır (GLS numarasıyla). */
SET @Adim = N'ES-01';
BEGIN TRANSACTION;
EXEC sistem.NumaraAl @Onek = N'GLS', @Numara = @Numara OUTPUT;
INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu,
                    DurumKodu, Kapali, SahipKodu, HesapKimlik, MakineKimlik,
                    ServisKimlik, ServisAtamaKaynagiKodu, ServisAtamaZamani, KonumUlkeKodu, IlKodu,
                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@TalepG, @Numara, N'GLS', N'servis', N'connect', N'globale',
        N'yeni', 0, N'servis', @Hesap, @MakineG,
        @Servis, N'servisElle', SYSUTCDATETIME(), N'TR', 44,
        N'personel', @Personel, @PersonelAd, N'backoffice');
INSERT talep.ServisTalebiAyrinti (TalepKimlik, TurKodu, MakineDurumuKodu)
VALUES (@TalepG, N'servis', N'sorunlu');
INSERT talep.TalepBelirtisi (TalepKimlik, BelirtiKodu) VALUES (@TalepG, N'balyaSarilmiyor');
COMMIT TRANSACTION;
IF LEFT(@Numara, 3) <> N'GLS'
BEGIN SET @Mesaj = CONCAT(@Adim, N': globale talebi GLS numarası almalıydı, ', @Numara); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ ES-02
   Globale'ye yetkisiz servise atama → 547; yetkisi bitirilmiş servise atama
   → 547; yetkisi bitirilmiş servise yeni talep → 51020 */
SET @Adim = N'ES-02a'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT makine.MakineServisAtamasi (MakineKimlik, MarkaKodu, ServisKimlik, KaynakKodu,
                                       YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@MakineG, N'globale', @Servis2, N'personel',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'ES-02b'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT servis.MarkaYetkisi (ServisKimlik, MarkaKodu, BaslangicZamani, BitisZamani)
    VALUES (@Servis2, N'globale', DATEADD(day, -10, SYSUTCDATETIME()), DATEADD(day, -1, SYSUTCDATETIME()));
    INSERT makine.MakineServisAtamasi (MakineKimlik, MarkaKodu, ServisKimlik, KaynakKodu,
                                       YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@MakineG, N'globale', @Servis2, N'personel',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'ES-02c'; SET @Beklenen = 51020; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT servis.MarkaYetkisi (ServisKimlik, MarkaKodu, BaslangicZamani, BitisZamani)
    VALUES (@Servis2, N'globale', DATEADD(day, -10, SYSUTCDATETIME()), DATEADD(day, -1, SYSUTCDATETIME()));
    EXEC sistem.NumaraAl @Onek = N'GLS', @Numara = @Numara OUTPUT;
    INSERT talep.Talep (Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu,
                        DurumKodu, Kapali, SahipKodu, HesapKimlik, MakineKimlik, ServisKimlik,
                        KonumUlkeKodu, IlKodu,
                        YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@Numara, N'GLS', N'servis', N'connect', N'globale',
            N'yeni', 0, N'servis', @Hesap, @MakineG, @Servis2, N'TR', 44,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* --------------------------------------------------------- ES-16 hazırlığı
   Globale ziyareti EUR para biriminde kapanır; EUR hak edişi açılır.
   Yol tarifesi EUR'da V0016'dan sonra var (kalem türü + para birimi). */
SET @Adim = N'ES-16';
BEGIN TRANSACTION;
INSERT talep.ServisZiyareti (Kimlik, ZiyaretNo, TalepKimlik, TurKodu, UyduKodu, MarkaKodu,
                             ServisKimlik, AsamaKodu, KapiKodu, YapilanIsKodu,
                             Km, IscilikTutari, ParaBirimiKodu, TamamlanmaZamani,
                             YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@ZiyaretG, 1, @TalepG, N'servis', N'servisZiyareti', N'globale',
        @Servis, N'bitti', N'garanti', N'ayar',
        20, 80, N'EUR', SYSUTCDATETIME(),
        N'servis', @ServisKul, N'S04 Servis Teknisyeni', N'servisim');
INSERT hakedis.HakEdis (Kimlik, ZiyaretKimlik, TalepKimlik, ServisKimlik, MarkaKodu, SirketKodu,
                        KapiKodu, AsamaKodu, ParaBirimiKodu, DurumKodu, NetTutar)
VALUES (@HakEdisG, @ZiyaretG, @TalepG, @Servis, N'globale', N'paksan',
        N'garanti', N'bitti', N'EUR', N'bekliyor', 0);
EXEC hakedis.HakEdisHesapla @HakEdisKimlik = @HakEdisG;
UPDATE talep.Talep SET DurumKodu = N'onayBekliyor' WHERE Kimlik = @TalepG;
COMMIT TRANSACTION;

SELECT @Sayi = CAST(NetTutar AS int) FROM hakedis.HakEdis WHERE Kimlik = @HakEdisG;
IF @Sayi <> 100
BEGIN SET @Mesaj = CONCAT(@Adim, N': EUR hak edişi 100 olmalıydı (yol 20 + işçilik 80), ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* İşçilik süreyle yazılsaydı: EUR'da işçilik tarifesi yok, hesap 51041
   ile durur (tarife hak edişin para biriminde aranır, yol kalemindeki
   kural). İşlem geri alınır; ziyaret süresiz, hak ediş 100 olarak kalır. */
SET @Beklenen = 51041; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE talep.ServisZiyareti SET IscilikSaati = 1.5 WHERE Kimlik = @ZiyaretG;
    EXEC hakedis.HakEdisHesapla @HakEdisKimlik = @HakEdisG;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N' (EUR işçilik tarifesi yok): beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;
SELECT @Sayi = CAST(NetTutar AS int) FROM hakedis.HakEdis WHERE Kimlik = @HakEdisG;
IF @Sayi <> 100 OR EXISTS (SELECT 1 FROM talep.ServisZiyareti WHERE Kimlik = @ZiyaretG AND IscilikSaati IS NOT NULL)
BEGIN SET @Mesaj = CONCAT(@Adim, N': geri alınan denemeden sonra EUR hak edişi 100 ve ziyaret süresiz kalmalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ ES-10
   Yeni kalem türü konaklama: HakEdisKalemiYaz ile yazılır, NetTutar'a girer,
   onay geçer. */
SET @Adim = N'ES-10';
BEGIN TRANSACTION;
EXEC hakedis.HakEdisKalemiYaz @HakEdisKimlik = @HakEdisG, @KalemTuruKodu = N'konaklama',
     @Tutar = 900, @BirimKodu = N'sabit';
COMMIT TRANSACTION;

SELECT @Sayi = CAST(NetTutar AS int) FROM hakedis.HakEdis WHERE Kimlik = @HakEdisG;
IF @Sayi <> 1000
BEGIN SET @Mesaj = CONCAT(@Adim, N': konaklama kalemiyle NetTutar 1000 olmalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;

SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE hakedis.HakEdis
       SET DurumKodu = N'onaylandi', OnayZamani = SYSUTCDATETIME(),
           OnaylayanKullaniciKimlik = @Personel, OnaylayanAdi = @PersonelAd,
           KdvOrani = 0, KdvTutari = 0, TevkifatOrani = 0, TevkifatTutari = 0,
           StopajOrani = 0, StopajTutari = 0
     WHERE Kimlik = @HakEdisG;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': konaklama kalemli hak edişin onayı geçmeliydi, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ ES-04
   Gallignani: talep, ziyaret ve hak ediş; şirket gallignani'ye düşer.
   İşçilik süreyle (2,5 saat): markaya özel işçilik tarifesi (80,00)
   genel tarifenin (50,00) önüne geçer → işçilik 200, yol 10 km × 12,00 =
   120, NetTutar 320. Sonra PAKSAN süreyi 2 saate düzeltir → 160 + 120. */
SET @Adim = N'ES-04';
BEGIN TRANSACTION;
EXEC sistem.NumaraAl @Onek = N'SRV', @Numara = @Numara OUTPUT;
INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu,
                    DurumKodu, Kapali, SahipKodu, HesapKimlik, MakineKimlik,
                    ServisKimlik, ServisAtamaKaynagiKodu, ServisAtamaZamani, KonumUlkeKodu, IlKodu,
                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@TalepL, @Numara, N'SRV', N'servis', N'connect', N'gallignani',
        N'yeni', 0, N'servis', @Hesap, @MakineL,
        @Servis, N'servisElle', SYSUTCDATETIME(), N'TR', 44,
        N'personel', @Personel, @PersonelAd, N'backoffice');
INSERT talep.ServisTalebiAyrinti (TalepKimlik, TurKodu, MakineDurumuKodu)
VALUES (@TalepL, N'servis', N'sorunlu');
INSERT talep.ServisZiyareti (Kimlik, ZiyaretNo, TalepKimlik, TurKodu, UyduKodu, MarkaKodu,
                             ServisKimlik, AsamaKodu, KapiKodu, YapilanIsKodu,
                             Km, IscilikSaati, IscilikTutari, ParaBirimiKodu, TamamlanmaZamani,
                             YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@ZiyaretL, 1, @TalepL, N'servis', N'servisZiyareti', N'gallignani',
        @Servis, N'bitti', N'garanti', N'bakim',
        10, 2.5, 200, N'TRY', SYSUTCDATETIME(),
        N'servis', @ServisKul, N'S04 Servis Teknisyeni', N'servisim');
INSERT hakedis.HakEdis (Kimlik, ZiyaretKimlik, TalepKimlik, ServisKimlik, MarkaKodu, SirketKodu,
                        KapiKodu, AsamaKodu, ParaBirimiKodu, DurumKodu, NetTutar)
SELECT @HakEdisL, @ZiyaretL, @TalepL, @Servis, N'gallignani', m.SirketKodu,
       N'garanti', N'bitti', N'TRY', N'bekliyor', 0
  FROM katalog.Marka AS m WHERE m.Kod = N'gallignani';
EXEC hakedis.HakEdisHesapla @HakEdisKimlik = @HakEdisL;
COMMIT TRANSACTION;

SELECT @Metin = SirketKodu FROM hakedis.HakEdis WHERE Kimlik = @HakEdisL;
IF @Metin <> N'gallignani'
BEGIN SET @Mesaj = CONCAT(@Adim, N': gallignani hak edişinin şirketi gallignani olmalıydı, ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

SELECT @Metin = CONCAT(k.Miktar, N'/', k.BirimTutar, N'/', ISNULL(t.MarkaKodu, N'genel'), N'/', k.Tutar, N'/', h.NetTutar)
  FROM hakedis.HakEdis AS h
  JOIN hakedis.HakEdisKalemi AS k ON k.HakEdisKimlik = h.Kimlik AND k.KalemTuruKodu = N'iscilik'
  LEFT JOIN hakedis.Tarife AS t ON t.Kimlik = k.TarifeKimlik
 WHERE h.Kimlik = @HakEdisL;
IF @Metin IS NULL OR @Metin <> N'2.5/80.00/gallignani/200.00/320.00'
BEGIN SET @Mesaj = CONCAT(@Adim, N': işçilik 2,5 saat × gallignani tarifesi 80,00 = 200, net 320 olmalıydı (miktar/birim/tarife/tutar/net), gelen ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

/* PAKSAN düzeltmesi: süre 2,5 → 2 saat. Düzeltme satırı eski ve yeni
   süreyi taşır; API ziyaretin süresini ve tutarını günceller ve aynı
   işlemde HakEdisHesapla'yı çağırır (tasarim.md 1.9.4). */
BEGIN TRANSACTION;
INSERT talep.ZiyaretDuzeltmesi (ZiyaretKimlik, MarkaKodu, Neden,
                                OncekiIscilikSaati, YeniIscilikSaati, OncekiIscilikTutari, YeniIscilikTutari,
                                YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@ZiyaretL, N'gallignani', N'S04 süre fazla yazılmış',
        2.5, 2, 200, 160,
        N'personel', @Personel, @PersonelAd, N'backoffice');
UPDATE talep.ServisZiyareti SET IscilikSaati = 2, IscilikTutari = 160 WHERE Kimlik = @ZiyaretL;
EXEC hakedis.HakEdisHesapla @HakEdisKimlik = @HakEdisL;
COMMIT TRANSACTION;

SELECT @Metin = CONCAT(k.Miktar, N'/', k.Tutar, N'/', h.NetTutar)
  FROM hakedis.HakEdis AS h
  JOIN hakedis.HakEdisKalemi AS k ON k.HakEdisKimlik = h.Kimlik AND k.KalemTuruKodu = N'iscilik'
 WHERE h.Kimlik = @HakEdisL;
IF @Metin IS NULL OR @Metin <> N'2.0/160.00/280.00'
BEGIN SET @Mesaj = CONCAT(@Adim, N': düzeltmeden sonra işçilik 2 saat × 80,00 = 160, net 280 olmalıydı (miktar/tutar/net), gelen ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;
IF NOT EXISTS (SELECT 1 FROM talep.ZiyaretDuzeltmesi
                WHERE ZiyaretKimlik = @ZiyaretL AND OncekiIscilikSaati = 2.5 AND YeniIscilikSaati = 2.0)
BEGIN SET @Mesaj = CONCAT(@Adim, N': düzeltme satırı eski ve yeni süreyi (2,5 → 2) taşımalıydı'); THROW 59999, @Mesaj, 1; END;

/* Müşterinin iki firmada iki cari kodu durur (FirmaNo 1 ve 2). */
BEGIN TRANSACTION;
INSERT entegrasyon.CariKarti (DisSistemKodu, FirmaNo, CariKodu, KaynakKodu, HesapKimlik)
VALUES (N'logo', 1, N'120.S04.0001', N'personel', @Hesap),
       (N'logo', 2, N'120.S04.0001', N'personel', @Hesap);
COMMIT TRANSACTION;
SELECT @Sayi = COUNT(*) FROM entegrasyon.CariKarti WHERE HesapKimlik = @Hesap;
IF @Sayi <> 2
BEGIN SET @Mesaj = CONCAT(@Adim, N': müşterinin iki firmadaki cari kodu 2 satır olmalıydı, ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ ES-05
   Aynı servis ve ay: paksan dökümü varken gallignani dökümü geçer;
   PAKSAN dökümüne gallignani hak edişini bağlamak 547. */
SET @Adim = N'ES-05';
BEGIN TRANSACTION;
EXEC sistem.NumaraAl @Onek = N'HAK', @Numara = @Numara OUTPUT;
INSERT hakedis.DonemDokumu (Kimlik, Numara, ServisKimlik, SirketKodu, ParaBirimiKodu, DurumKodu,
                            DonemYili, DonemAyi, OdenecekTutar,
                            YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@DokumP, @Numara, @Servis, N'paksan', N'TRY', N'taslak', @Yil, @Ay, 0,
        N'personel', @Personel, @PersonelAd, N'backoffice');
EXEC sistem.NumaraAl @Onek = N'HAK', @Numara = @Numara OUTPUT;
INSERT hakedis.DonemDokumu (Kimlik, Numara, ServisKimlik, SirketKodu, ParaBirimiKodu, DurumKodu,
                            DonemYili, DonemAyi, OdenecekTutar,
                            YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@DokumL, @Numara, @Servis, N'gallignani', N'TRY', N'taslak', @Yil, @Ay, 0,
        N'personel', @Personel, @PersonelAd, N'backoffice');
/* ES-16: aynı servis ve ay, EUR dökümü de ayrı satırdır. */
EXEC sistem.NumaraAl @Onek = N'HAK', @Numara = @Numara OUTPUT;
INSERT hakedis.DonemDokumu (Kimlik, Numara, ServisKimlik, SirketKodu, ParaBirimiKodu, DurumKodu,
                            DonemYili, DonemAyi, OdenecekTutar,
                            YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@DokumE, @Numara, @Servis, N'paksan', N'EUR', N'taslak', @Yil, @Ay, 0,
        N'personel', @Personel, @PersonelAd, N'backoffice');
COMMIT TRANSACTION;

SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE hakedis.HakEdis SET DonemDokumuKimlik = @DokumP WHERE Kimlik = @HakEdisL;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': PAKSAN dökümüne gallignani hak edişi — beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* Hareketler: gallignani ve EUR ayrı satırlarda görünsün diye yazılır. */
BEGIN TRANSACTION;
UPDATE hakedis.HakEdis
   SET DurumKodu = N'onaylandi', OnayZamani = SYSUTCDATETIME(),
       OnaylayanKullaniciKimlik = @Personel, OnaylayanAdi = @PersonelAd,
       KdvOrani = 0, KdvTutari = 0, TevkifatOrani = 0, TevkifatTutari = 0,
       StopajOrani = 0, StopajTutari = 0
 WHERE Kimlik = @HakEdisL;
INSERT hakedis.ServisHesapHareketi (ServisKimlik, SirketKodu, MarkaKodu, HareketTuruKodu, YonKodu,
                                    ParaBirimiKodu, Tutar, HakEdisKimlik,
                                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
SELECT h.ServisKimlik, h.SirketKodu, h.MarkaKodu, N'hakEdisAlacagi', N'alacak',
       h.ParaBirimiKodu, h.NetTutar + h.KdvTutari - h.TevkifatTutari - h.StopajTutari, h.Kimlik,
       N'personel', @Personel, @PersonelAd, N'backoffice'
  FROM hakedis.HakEdis AS h WHERE h.Kimlik IN (@HakEdisL, @HakEdisG);
COMMIT TRANSACTION;

/* ------------------------------------------------------------------ ES-09
   Kurulum talebi: yeni tür, yeni önek, yeni masa; ziyaret ve hak ediş. */
SET @Adim = N'ES-09';
BEGIN TRANSACTION;
EXEC sistem.NumaraAl @Onek = N'KUR', @Numara = @Numara OUTPUT;
INSERT talep.Talep (Kimlik, Numara, NumaraOneki, TurKodu, KaynakKodu, MarkaKodu,
                    DurumKodu, Kapali, SahipKodu, MasaKodu, HesapKimlik, MakineKimlik,
                    ServisKimlik, ServisAtamaKaynagiKodu, ServisAtamaZamani, KonumUlkeKodu, IlKodu,
                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@TalepK, @Numara, N'KUR', N'kurulum', N'backoffice', N'globale',
        N'yeni', 0, N'servis', N'kurulumMasasi', @Hesap, @MakineG,
        @Servis, N'servisElle', SYSUTCDATETIME(), N'TR', 44,
        N'personel', @Personel, @PersonelAd, N'backoffice');
INSERT talep.ServisZiyareti (Kimlik, ZiyaretNo, TalepKimlik, TurKodu, UyduKodu, MarkaKodu,
                             ServisKimlik, AsamaKodu, KapiKodu, YapilanIsKodu,
                             Km, IscilikTutari, ParaBirimiKodu, TamamlanmaZamani,
                             YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
VALUES (@ZiyaretK, 1, @TalepK, N'kurulum', N'servisZiyareti', N'globale',
        @Servis, N'bitti', N'garanti', N'ilkKurulum',
        5, 250, N'TRY', SYSUTCDATETIME(),
        N'servis', @ServisKul, N'S04 Servis Teknisyeni', N'servisim');
INSERT hakedis.HakEdis (Kimlik, ZiyaretKimlik, TalepKimlik, ServisKimlik, MarkaKodu, SirketKodu,
                        KapiKodu, AsamaKodu, ParaBirimiKodu, DurumKodu, NetTutar)
VALUES (@HakEdisK, @ZiyaretK, @TalepK, @Servis, N'globale', N'paksan',
        N'garanti', N'bitti', N'TRY', N'bekliyor', 0);
EXEC hakedis.HakEdisHesapla @HakEdisKimlik = @HakEdisK;
UPDATE talep.Talep SET DurumKodu = N'onayBekliyor', MasaKodu = N'servisMasasi' WHERE Kimlik = @TalepK;
COMMIT TRANSACTION;

SELECT @Sayi = CAST(NetTutar AS int) FROM hakedis.HakEdis WHERE Kimlik = @HakEdisK;
IF @Sayi <> 310
BEGIN SET @Mesaj = CONCAT(@Adim, N': kurulum hak edişi 310 olmalıydı (yol 60 + işçilik 250), ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* Süresiz (22.09.2026'dan önceki biçimde) kayıt: genel işçilik tarifesi
   varken de servisin yazdığı tutar alınır; kalemde miktar ve tarife boş. */
IF NOT EXISTS (SELECT 1 FROM hakedis.HakEdisKalemi
                WHERE HakEdisKimlik = @HakEdisK AND KalemTuruKodu = N'iscilik'
                  AND Tutar = 250 AND Miktar IS NULL AND BirimKodu IS NULL AND TarifeKimlik IS NULL)
BEGIN SET @Mesaj = CONCAT(@Adim, N': süresiz kayıtta işçilik kalemi servisin yazdığı 250 olmalıydı (miktar ve tarife boş)'); THROW 59999, @Mesaj, 1; END;

/* Kurulum hak edişi onaylanıp cariye yazılır: servisin paksan/TRY bakiyesi
   böylece oluşur; ES-05 üç satır (paksan/TRY, paksan/EUR, gallignani/TRY)
   bekler. */
BEGIN TRANSACTION;
UPDATE hakedis.HakEdis
   SET DurumKodu = N'onaylandi', OnayZamani = SYSUTCDATETIME(),
       OnaylayanKullaniciKimlik = @Personel, OnaylayanAdi = @PersonelAd,
       KdvOrani = 0, KdvTutari = 0, TevkifatOrani = 0, TevkifatTutari = 0,
       StopajOrani = 0, StopajTutari = 0
 WHERE Kimlik = @HakEdisK;
INSERT hakedis.ServisHesapHareketi (ServisKimlik, SirketKodu, MarkaKodu, HareketTuruKodu, YonKodu,
                                    ParaBirimiKodu, Tutar, HakEdisKimlik,
                                    YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
SELECT h.ServisKimlik, h.SirketKodu, h.MarkaKodu, N'hakEdisAlacagi', N'alacak',
       h.ParaBirimiKodu, h.NetTutar + h.KdvTutari - h.TevkifatTutari - h.StopajTutari, h.Kimlik,
       N'personel', @Personel, @PersonelAd, N'backoffice'
  FROM hakedis.HakEdis AS h WHERE h.Kimlik = @HakEdisK;
COMMIT TRANSACTION;

/* Rolü kurulum olan personel talebi görür (Bölüm 1.15.6: rol.TalepTuruKodu). */
BEGIN TRANSACTION;
INSERT erisim.Rol (Ad, Kod, TalepTuruKodu, Aktif)
VALUES (N'Kurulum sorumlusu', N'kurulum', N'kurulum', 1);
COMMIT TRANSACTION;
SELECT @Sayi = COUNT(*) FROM talep.Talep AS t
  JOIN erisim.Rol AS r ON r.TalepTuruKodu = t.TurKodu
 WHERE t.Kimlik = @TalepK AND r.Kod = N'kurulum' AND r.Aktif = 1;
IF @Sayi <> 1
BEGIN SET @Mesaj = CONCAT(@Adim, N': kurulum rolü kurulum talebini görmeliydi, ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ ES-08
   Yeni açık durum gecikme hesabına, yeni kapalı durum KapanmaZamani ile
   kabul edilir. */
SET @Adim = N'ES-08'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE talep.Talep SET DurumKodu = N'tekrarZiyaretBekliyor' WHERE Kimlik = @TalepL;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': yeni açık durum kabul edilmeliydi, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE talep.Talep SET DurumKodu = N'odemeYapilmadi', Kapali = 1 WHERE Kimlik = @TalepL;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N' (tür uyuşmaz durum): beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ ES-12
   Bayi aktör türü: bayi yapanlı satış geçer; bayi alıcılı bildirim geçer;
   bayi yapanlı MakineServisAtamasi 547 (atamayı bayi yapamaz). */
SET @Adim = N'ES-12a'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT makine.MakineSatisi (MakineKimlik, SatisTuruKodu, SaticiBayiKimlik, AliciHesapKimlik,
                                KaynakKodu, DogrulamaDurumuKodu,
                                YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@MakineG, N'bayiCiftciye', @Bayi, @Hesap,
            N'bayi', N'bekliyor',
            N'bayi', @BayiKul, N'S04 Bayi Kullanıcısı', N'bayiPaneli');
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': bayi yapanlı satış geçmeliydi, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'ES-12b'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT bildirim.Bildirim (BaslikAnahtari, MetinAnahtari, AliciTuruKodu, TurKodu,
                              KullaniciKimlik, TalepKimlik,
                              YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'bildirimler.durumBaslik', N'bildirimler.durumMetin', N'bayi', N'talep',
            @BayiKul, @TalepG,
            N'personel', @Personel, @PersonelAd, N'backoffice');
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': bayi alıcılı bildirim geçmeliydi, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'ES-12c'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT makine.MakineServisAtamasi (MakineKimlik, MarkaKodu, ServisKimlik, KaynakKodu,
                                       YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (@MakineG, N'globale', @Servis, N'bayi',
            N'bayi', @BayiKul, N'S04 Bayi Kullanıcısı', N'bayiPaneli');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ ES-13
   Aynı servise ikinci ve üçüncü giriş hesabı → geçer (sınır ayar işidir,
   şema kısıtı değil). */
SET @Adim = N'ES-13'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT erisim.Kullanici (GirisAdi, TurKodu) VALUES (N's04.servis.iki', N'servis'), (N's04.servis.uc', N'servis');
    INSERT servis.GirisHesabi (ServisKimlik, KullaniciKimlik, OlusmaZamani)
    SELECT @Servis, k.Kimlik, SYSUTCDATETIME() FROM erisim.Kullanici AS k
     WHERE k.GirisAdi IN (N's04.servis.iki', N's04.servis.uc');
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': ikinci ve üçüncü giriş hesabı geçmeliydi, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ ES-14
   Yeni dış sistem efatura: GUID metinli DisKayitNo, Ettn, FirmaNo boş;
   aynı DisKayitNo ikinci kez 2601; efatura cari kartı geçer;
   kargo firması kod satırı dış sistemiyle geçer. */
SET @Adim = N'ES-14a'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT entegrasyon.BelgeBagi (DisSistemKodu, BelgeTuruKodu, KaynakKodu, DisKayitNo, Ettn,
                                  YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'efatura', N'satisFaturasi', N'entegrasyon',
            N'5A040001-0000-4000-8000-0000000000E1', '5A040001-0000-4000-8000-0000000000E1',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': efatura belge bağı geçmeliydi, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'ES-14b'; SET @Beklenen = 2601; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT entegrasyon.BelgeBagi (DisSistemKodu, BelgeTuruKodu, KaynakKodu, DisKayitNo,
                                  YapanTuruKodu, YapanKullaniciKimlik, YapanAdi, KaynakUygulamaKodu)
    VALUES (N'efatura', N'satisFaturasi', N'entegrasyon',
            N'5A040001-0000-4000-8000-0000000000E1',
            N'personel', @Personel, @PersonelAd, N'backoffice');
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'ES-14c'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT entegrasyon.CariKarti (DisSistemKodu, CariKodu, KaynakKodu, ServisKimlik)
    VALUES (N'efatura', N'320.S04.EFATURA', N'entegrasyon', @Servis);
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': efatura cari kartı geçmeliydi, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ ES-15
   Yeni bildirim kanalı whatsapp: giden satırı geçer; gonderildi yapılırken
   SaglayiciKodu boşsa 547. */
SET @Adim = N'ES-15a'; SET @Gelen = 0;
DECLARE @Giden uniqueidentifier = '5A040001-0000-4000-8000-0000000000F1';
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT sistem.Giden (Kimlik, SablonKodu, KanalKodu, DilKodu, DurumKodu, AliciHesapKimlik, Govde)
    VALUES (@Giden, N'S04Whatsapp', N'whatsapp', N'tr', N'bekliyor', @Hesap, N'S04 whatsapp gövdesi');
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': whatsapp gideni geçmeliydi, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

SET @Adim = N'ES-15b'; SET @Beklenen = 547; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE sistem.Giden SET DurumKodu = N'gonderildi', GonderilmeZamani = SYSUTCDATETIME()
     WHERE Kimlik = @Giden;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> @Beklenen
BEGIN SET @Mesaj = CONCAT(@Adim, N': sağlayıcısız gönderildi — beklenen ', @Beklenen, N', gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'hata yok')); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ ES-17
   Yeni kişi rolü muhasebeci. */
SET @Adim = N'ES-17'; SET @Gelen = 0;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT musteri.HesapKisisi (HesapKimlik, RolKodu, Adi, Soyadi)
    VALUES (@Hesap, N'muhasebeci', N'S04 Muhasebeci Adı', N'S04 Muhasebeci Soyadı');
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    SET @Gelen = ERROR_NUMBER(); SET @HataMetni = ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
IF @Gelen <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': muhasebeci kişi rolü geçmeliydi, gelen ', @Gelen, N' — ', ISNULL(@HataMetni, N'')); THROW 59999, @Mesaj, 1; END;

PRINT 'S04 uygulama bölümü tamam.';

-- giris: sahip
/* ==========================================================================
   S04 — üçüncü bölüm: yalıtım ve görünüm denetimleri

   ES-03 (PAKSAN toplamları etkilenmez), ES-05'in görünüm yarısı, ES-06
   (markanın şirketi değişse de yazılmış satırlar donar) ve ES-16'nın
   görünüm yarısı burada. Sahip girişi kullanılır: bu bölüm hem gorunum'u
   okur hem de katalog.Marka'yı günceller (ES-06); ikisi de uygulama
   rolünün dışındadır.
   ========================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Adim   nvarchar(20);
DECLARE @Mesaj  nvarchar(2048);
DECLARE @Sayi   int;
DECLARE @Metin  nvarchar(400);
DECLARE @Servis uniqueidentifier;
DECLARE @HakEdisL uniqueidentifier = '5A040001-0000-4000-8000-000000000018';
DECLARE @PaksanAdi nvarchar(100);

SELECT @Servis = Kimlik FROM servis.Servis WHERE KayitNo = 3;
SELECT @PaksanAdi = Ad FROM katalog.Marka WHERE Kod = N'paksan';

/* ------------------------------------------------------------------ ES-03
   PAKSAN toplamları yeni markadan etkilenmez. Ölçü "önce/sonra" anlık
   görüntüsü değil, daha güçlü olan YALITIM değişmezidir: marka süzgeçli
   görünüm sayısı, doğrudan tablodaki paksan sayısına eşit olmalı ve
   süzgecin içine tek bir globale/gallignani satırı sızmamalı. Anlık
   görüntü ikisi de yanlışsa sessizce geçerdi; bu geçmez. */
SET @Adim = N'ES-03';
SELECT @Sayi = COUNT(*) FROM gorunum.TalepIstatistigi WHERE MarkaAdi = @PaksanAdi;
IF @Sayi <> (SELECT COUNT(*) FROM talep.Talep WHERE MarkaKodu = N'paksan')
BEGIN SET @Mesaj = CONCAT(@Adim, N': TalepIstatistigi paksan sayısı tabloyla uyuşmuyor (', @Sayi, N')'); THROW 59999, @Mesaj, 1; END;

SELECT @Sayi = COUNT(*) FROM gorunum.HakEdisListesi AS h
  JOIN katalog.Marka AS m ON m.Ad = h.MarkaAdi
 WHERE m.Kod = N'paksan';
IF @Sayi <> (SELECT COUNT(*) FROM hakedis.HakEdis WHERE MarkaKodu = N'paksan')
BEGIN SET @Mesaj = CONCAT(@Adim, N': HakEdisListesi paksan sayısı tabloyla uyuşmuyor (', @Sayi, N')'); THROW 59999, @Mesaj, 1; END;

SELECT @Sayi = COUNT(*) FROM gorunum.TalepIstatistigi AS t
  JOIN katalog.Marka AS m ON m.Ad = t.MarkaAdi
 WHERE m.Kod IN (N'globale', N'gallignani');
IF @Sayi = 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': yeni markaların talebi görünümde hiç yok; yalıtım sınaması anlamsız'); THROW 59999, @Mesaj, 1; END;

/* ---------------------------------------------------------- ES-05, ES-16
   ServisBakiyesi şirket ve para birimi başına ayrı satır verir:
   paksan/TRY, paksan/EUR ve gallignani/TRY. */
SET @Adim = N'ES-05';
SELECT @Sayi = COUNT(*) FROM gorunum.ServisBakiyesi
 WHERE ServisKayitNo = (SELECT KayitNo FROM servis.Servis WHERE Kimlik = @Servis);
IF @Sayi <> 3
BEGIN SET @Mesaj = CONCAT(@Adim, N': ServisBakiyesi 3 satır olmalıydı (paksan/TRY, paksan/EUR, gallignani/TRY), ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* KontrolLogoCariKoduEksik: servisin gallignani firmasında (LogoFirmaNo 2)
   cari kodu yokken listeler, eklenince listelemez. */
SELECT @Sayi = COUNT(*) FROM gorunum.KontrolLogoCariKoduEksik
 WHERE FirmaKayitNo = (SELECT KayitNo FROM servis.Servis WHERE Kimlik = @Servis)
   AND LogoFirmaNo = 2;
IF @Sayi <> 1
BEGIN SET @Mesaj = CONCAT(@Adim, N': KontrolLogoCariKoduEksik servisi gallignani firmasında listelemeliydi, ', @Sayi); THROW 59999, @Mesaj, 1; END;

INSERT entegrasyon.CariKarti (DisSistemKodu, FirmaNo, CariKodu, KaynakKodu, ServisKimlik)
VALUES (N'logo', 2, N'320.S04.0002', N'personel', @Servis);

SELECT @Sayi = COUNT(*) FROM gorunum.KontrolLogoCariKoduEksik
 WHERE FirmaKayitNo = (SELECT KayitNo FROM servis.Servis WHERE Kimlik = @Servis)
   AND LogoFirmaNo = 2;
IF @Sayi <> 0
BEGIN SET @Mesaj = CONCAT(@Adim, N': cari kodu eklenince KontrolLogoCariKoduEksik listelememeliydi, ', @Sayi); THROW 59999, @Mesaj, 1; END;

/* ------------------------------------------------------------------ ES-06
   Markanın şirketi sonradan değişse de yazılmış satırların şirketi donar:
   şirket satıra kopyalanır, marka üzerinden okunmaz (Bölüm 1.9.2). */
SET @Adim = N'ES-06';
SELECT @Metin = SirketKodu FROM hakedis.HakEdis WHERE Kimlik = @HakEdisL;
IF @Metin <> N'gallignani'
BEGIN SET @Mesaj = CONCAT(@Adim, N': başlangıçta gallignani bekleniyordu, ', ISNULL(@Metin, N'(boş)')); THROW 59999, @Mesaj, 1; END;

BEGIN TRANSACTION;
UPDATE katalog.Marka SET SirketKodu = N'paksan' WHERE Kod = N'gallignani';

SELECT @Metin = SirketKodu FROM hakedis.HakEdis WHERE Kimlik = @HakEdisL;
IF @Metin <> N'gallignani'
BEGIN
    SET @Mesaj = CONCAT(@Adim, N': marka şirketi değişince hak edişin şirketi de değişti: ', ISNULL(@Metin, N'(boş)'));
    ROLLBACK TRANSACTION; THROW 59999, @Mesaj, 1;
END;
SELECT @Sayi = COUNT(*) FROM hakedis.DonemDokumu WHERE SirketKodu = N'gallignani';
IF @Sayi <> 1
BEGIN
    SET @Mesaj = CONCAT(@Adim, N': gallignani dönem dökümü 1 olmalıydı, ', @Sayi);
    ROLLBACK TRANSACTION; THROW 59999, @Mesaj, 1;
END;
SELECT @Sayi = COUNT(*) FROM hakedis.ServisHesapHareketi WHERE SirketKodu = N'gallignani';
IF @Sayi <> 1
BEGIN
    SET @Mesaj = CONCAT(@Adim, N': gallignani hesap hareketi 1 olmalıydı, ', @Sayi);
    ROLLBACK TRANSACTION; THROW 59999, @Mesaj, 1;
END;
/* Marka satırı geri alınır: ES-19 bu markayı kendi şirketiyle bulmalı. */
ROLLBACK TRANSACTION;

PRINT 'S04 görünüm ve yalıtım denetimleri tamam.';
