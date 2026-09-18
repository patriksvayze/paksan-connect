-- ÜRETİLDİ, elle düzenlemeyin
/* ==========================================================================
   B01 — ayarlar (başlangıç değerleri)

   Üreten: tools/vt/tohum-uret.mjs (npm run vt -- tohum). Bu dosyayı elle
   düzenlemeyin: kaynak değişince yeniden üretilir ve el değişikliği
   kaybolur. Kaynağı değiştirin, sonra "npm run vt -- tohum" çalıştırın.

   29 ayar.

   Kaynak: tohum/kaynak/ayarlar.json (tasarim.md 5.3); değerler oradaki kaynak
   sabitlerden okunur. Yalnız yoksa ekler (anahtar + kapsam): PAKSAN değeri
   yonetim.AyarDegistir ile değiştirdiyse tohum ona dokunmaz.

   Araç betiği tek işlemde, sahip girişiyle çalıştırır (BEGIN/COMMIT
   burada yazılmaz). İkinci çalıştırmada hiçbir satır değişmez.
   ========================================================================== */

/* sistem.Ayar — 29 satır, yalnız eksikler eklenir */

INSERT INTO sistem.Ayar (Anahtar, SirketKodu, MarkaKodu, DegerTuru, Deger, Aciklama)
SELECT k.Anahtar, k.SirketKodu, k.MarkaKodu, k.DegerTuru, k.Deger, k.Aciklama
FROM (
    SELECT CONVERT(nvarchar(80), v.Anahtar) AS Anahtar,
           CONVERT(nvarchar(20), v.SirketKodu) AS SirketKodu,
           CONVERT(nvarchar(20), v.MarkaKodu) AS MarkaKodu,
           CONVERT(nvarchar(10), v.DegerTuru) AS DegerTuru,
           CONVERT(nvarchar(4000), v.Deger) AS Deger,
           CONVERT(nvarchar(400), v.Aciklama) AS Aciklama
    FROM (VALUES
        (N'BankaAciklamaKalibi', N'paksan', NULL, N'metin', N'{no} · {ad}', N'Müşterinin havale açıklamasına yazacağı metnin kalıbı; {no} talep numarası, {ad} müşteri adıyla doldurulur. Eski sabit: kimlik.js BANKA.aciklamaKalibi.'),
        (N'BankaOdemesiAcik', N'paksan', NULL, N'mantiksal', N'0', N'1: ödeme ekranı şirketin banka hesaplarını gösterir. 0: hesap bilgisi için aranması istenir. Eski sabit: kimlik.js BANKA.aktif.'),
        (N'DestekOturumuSessizlikDakikasi', NULL, NULL, N'tamsayi', N'30', N'Destek sohbetinde bu kadar dakika hareket olmazsa sonraki hareket yeni oturum sayılır (birim: dakika). Eski sabit: destekLog.js OTURUM_SESSIZLIK.'),
        (N'DogrulamaKoduGecerlilikSaniyesi', NULL, NULL, N'tamsayi', N'120', N'SMS doğrulama kodunun geçerli kaldığı süre (birim: saniye). Eski sabit: hesap.js OTP_SURE.'),
        (N'EkFotografEnFazla', NULL, NULL, N'tamsayi', N'5', N'Bir talebe eklenebilecek en çok fotoğraf sayısı (birim: adet). Eski sabit: ekler.js EK_SINIR.foto.'),
        (N'EkFotografUzunKenari', NULL, NULL, N'tamsayi', N'1600', N'Fotoğraf küçültüldükten sonra uzun kenarının en çok uzunluğu (birim: piksel). Eski sabit: ekler.js EK_SINIR.fotoKenar.'),
        (N'EkVideoEnFazla', NULL, NULL, N'tamsayi', N'1', N'Bir talebe eklenebilecek en çok video sayısı (birim: adet). Eski sabit: ekler.js EK_SINIR.video.'),
        (N'EkVideoEnUzunSaniye', NULL, NULL, N'tamsayi', N'30', N'Talebe eklenen videonun en uzun süresi (birim: saniye). Eski sabit: ekler.js EK_SINIR.videoSaniye.'),
        (N'FiyatListesiKdvHaric', NULL, NULL, N'mantiksal', N'1', N'1: yedek parça fiyat listesi KDV hariç kabul edilir ve talepte KDV ayrıca eklenir. Kullanıcı kararı, doğrulanmadı. Eski sabit: para.js KDV_HARIC_LISTE.'),
        (N'GarantiBaslangicEsasi', NULL, NULL, N'metin', N'teslim', N'Garanti süresinin hangi tarihten başladığı (kod.GarantiBaslangicEsasi: teslim, fatura, uretim). Kaynak: KOD-SISTEMI 4.4 kararı.'),
        (N'GarantiFaturaEkGunu', NULL, NULL, N'tamsayi', NULL, N'Teslim belgesi yokken garanti başlangıcı için bayi fatura tarihine eklenecek gün (birim: gün). Boş: karar bekleniyor (KOD-SISTEMI soru 15).'),
        (N'GarantiYili', NULL, NULL, N'tamsayi', N'2', N'Makine garanti süresi (birim: yıl). Marka ya da şirket satırı yoksa bu değer geçerlidir. Eski sabit: serial.js GARANTI_YIL.'),
        (N'HakEdisKdvOrani', NULL, NULL, N'ondalik', NULL, N'Hak edişte uygulanacak KDV oranı, ondalık kesir. Boş: muhasebe kararı bekleniyor (KOD-SISTEMI soru 10); okuyan işlem hata verir.'),
        (N'HakEdisStopajOrani', NULL, NULL, N'ondalik', NULL, N'Hak edişe uygulanacak stopaj oranı, ondalık kesir. Boş: muhasebe kararı bekleniyor (KOD-SISTEMI soru 10); okuyan işlem hata verir.'),
        (N'HakEdisTevkifatOrani', NULL, NULL, N'ondalik', NULL, N'Hak edişin KDV''sine uygulanacak tevkifat oranı, ondalık kesir. Boş: muhasebe kararı bekleniyor (KOD-SISTEMI soru 10); okuyan işlem hata verir.'),
        (N'IhracatAcik', N'paksan', NULL, N'mantiksal', N'0', N'1: yurt dışından gelen talep ihracat ekibinin e-postasına gider. 0: iç talep gibi backoffice''e düşer. Eski sabit: kimlik.js IHRACAT.aktif.'),
        (N'IhracatEpostalari', N'paksan', NULL, N'json', N'[]', N'Yurt dışı taleplerinin gönderileceği e-posta adresleri (JSON dizi). Eski sabit: kimlik.js IHRACAT.epostalar.'),
        (N'KdvOrani', NULL, NULL, N'ondalik', N'0.2', N'Satışlarda uygulanan KDV oranı, ondalık kesir (0.2 = yüzde 20). Marka ya da şirket satırı yoksa bu değer geçerlidir. Eski sabit: para.js KDV_ORANI.'),
        (N'LogoYeniSatisGunu', NULL, NULL, N'tamsayi', N'120', N'LOGO faturasından sonra bu kadar gün içinde kaydedilen makine yeni satış sayılır (birim: gün). Eski sabit: logo.js LOGO.yeniSatisGun.'),
        (N'OdemeBeklemeGunu', NULL, NULL, N'tamsayi', N'7', N'Tutarı doğrulanan yedek parça talebinde müşterinin ödeme için beklendiği süre; dolunca talep iptal edilir (birim: gün). Varsayılan değer, muhasebe onayı bekliyor (KOD-SISTEMI 4.2.1, soru 11).'),
        (N'ParaBirimi', NULL, NULL, N'metin', N'TRY', N'Varsayılan para birimi kodu (kod.ParaBirimi). Eski sabit: para.js PARA_BIRIMI (TL yazıyordu, TRY''ye çevrildi).'),
        (N'RandevuHatirlatmaOnceSaati', NULL, NULL, N'tamsayi', N'24', N'Randevu hatırlatması randevudan bu kadar saat önce görünmeye başlar (birim: saat). Eski sabit: bildirimler.js HATIRLATMA_SAAT.'),
        (N'RandevuHatirlatmaSonraSaati', NULL, NULL, N'tamsayi', N'12', N'Randevu hatırlatması randevu saatinden bu kadar saat sonra listeden düşer (birim: saat). Eski kod: bildirimler.js satır içi -12 * 3600000.'),
        (N'ServisBasinaEnFazlaGirisHesabi', NULL, NULL, N'tamsayi', N'1', N'Bir servise açılabilecek en çok giriş hesabı sayısı (birim: adet). Kaynak: KOD-SISTEMI soru 18.'),
        (N'ServisParcaIskontoOrani', NULL, NULL, N'ondalik', N'0.3', N'Servisin yedek parça alırken yararlandığı indirim oranı, ondalık kesir (0.3 = yüzde 30). Eski sabit: makineFiyat.js PARCA_SERVIS_ISKONTO.'),
        (N'SifreBaglantisiGecerlilikSaati', NULL, NULL, N'tamsayi', N'24', N'Personele gönderilen şifre belirleme bağlantısının geçerli kaldığı süre (birim: saat). Eski sabit: veri.js SIFRE_BAGLANTI_SAAT.'),
        (N'SifreHaneSayisi', NULL, NULL, N'tamsayi', N'6', N'Müşteri şifresinin rakam sayısı (birim: hane). Eski sabit: hesap.js SIFRE_HANE.'),
        (N'TalepGecikmeSaati', NULL, NULL, N'tamsayi', N'48', N'Açık talep bu kadar saatten uzun beklerse gecikmiş sayılır ve listede ünlemle işaretlenir (birim: saat). Eski sabit: veri.js GECIKME_SAAT.'),
        (N'TeklifBeklemeGunu', NULL, NULL, N'tamsayi', N'14', N'Verilen fiyat teklifine bu kadar gün cevap gelmezse teklif bekleyen talep olarak öne çıkar (birim: gün). Eski sabit: veri.js TEKLIF_BEKLEME_GUN.')
    ) AS v (Anahtar, SirketKodu, MarkaKodu, DegerTuru, Deger, Aciklama)
) AS k
WHERE NOT EXISTS (SELECT 1 FROM sistem.Ayar AS h WHERE h.Anahtar = k.Anahtar AND ((h.SirketKodu IS NULL AND k.SirketKodu IS NULL) OR h.SirketKodu = k.SirketKodu) AND ((h.MarkaKodu IS NULL AND k.MarkaKodu IS NULL) OR h.MarkaKodu = k.MarkaKodu));
