/* ==========================================================================
   V0011 · talep şeması — tablolar

   Kural kaynağı: veritabani/tasarim.md (Bölüm 0.4 talep, 1.3, 1.6, 1.7,
   1.9.7, 1.16, 1.17; betik listesi Bölüm 6.2). Tablolar Bölüm 6.2'deki
   sırayla açılır; bir tablonun baktığı talep tablosu ondan önce gelir.

   Bu betikte YAZILMAYANLAR (başka betiklerde):
     - TR_talep_Talep_DurumGecmisi, TR_talep_Talep_ServisYetkisi,
       TR_talep_DurumGecmisi_Koruma  -> R04__korumalar.sql
     - talep.ZiyaretGuncelParcasi görünümü -> R03__alan_gorunumleri.sql
     - GRANT / DENY -> V0015__yetkiler.sql

   Başka betiklerin tablolarına verilen yabancı anahtarlar hedefte şu
   anahtarları ister (hepsi tasarim.md'de adıyla yazılı):
     kod.TalepNumaraKurali PK (TurKodu, KaynakKodu, NumaraOneki)
     kod.TalepTuruDurumu PK (TurKodu, DurumKodu)
     kod.TalepDurumu UNIQUE (Kod, Kapali)
     kod.IptalNedeni UNIQUE (Kod, AciklamaZorunlu)
     kod.TeklifSonucu UNIQUE (Kod, FiyatZorunlu)
     kod.TalepTuruUydusu PK (TurKodu, UyduKodu)
     makine.Makine UNIQUE (Kimlik, MarkaKodu)
     servis.MarkaYetkisi PK (ServisKimlik, MarkaKodu)
     cografya.Ilce UNIQUE (IlKodu, IlceKodu)
     katalog.Urun, katalog.Parca, katalog.FiyatListesi PK (MarkaKodu, Kod)

   Bu betiğin talep tablolarında açtığı, hakedis şemasının (V0012)
   bileşik yabancı anahtarlarla baktığı anahtarlar:
     talep.Talep UNIQUE (Kimlik, TurKodu), (Kimlik, MarkaKodu),
       (Kimlik, ServisKimlik)
     talep.ServisZiyareti UNIQUE (Kimlik, TalepKimlik),
       (Kimlik, TalepKimlik, ServisKimlik), (Kimlik, KapiKodu, AsamaKodu)

   Marka zinciri (tasarim.md 0.4 talep "Uygulamada değişti"): ziyaret,
   düzeltme ve iki parça listesi talebin markasını bileşik yabancı
   anahtarla taşır; başka markanın parçası ziyarete yazılamaz:
     talep.Talep (Kimlik, MarkaKodu) <- ServisZiyareti (TalepKimlik, MarkaKodu)
     ServisZiyareti (Kimlik, MarkaKodu) <- ZiyaretParcaSatiri, ZiyaretDuzeltmesi
     ZiyaretDuzeltmesi (Kimlik, MarkaKodu) <- ZiyaretDuzeltmesiParcasi

   Her yabancı anahtarın kolonları bir dizinin öndeki kolonlarıdır
   (tasarim.md 1.6, canlı denetim CD-FK-DIZIN); boş olabilen kolonda
   dizin "IS NOT NULL" süzgeçlidir.
   ========================================================================== */

/* ==========================================================================
   talep.Talep
   ========================================================================== */
CREATE TABLE talep.Talep (
    Numara                 nvarchar(10) COLLATE Latin1_General_100_BIN2 NOT NULL,
    NumaraOneki            nvarchar(3) COLLATE Latin1_General_100_BIN2 NOT NULL,
    Aciklama               nvarchar(2000) COLLATE Turkish_100_CI_AS NULL,
    Ihracat                bit NOT NULL CONSTRAINT DF_talep_Talep_Ihracat DEFAULT (0),
    IletisimAdi            nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    IletisimAdArama        AS CAST(LOWER(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
          IletisimAdi COLLATE Latin1_General_100_BIN2,
          N'ç',N'c'), N'Ç',N'C'), N'ğ',N'g'), N'Ğ',N'G'), N'ı',N'i'), N'İ',N'I'),
          N'ö',N'o'), N'Ö',N'O'), N'ş',N's'), N'Ş',N'S'), N'ü',N'u'), N'Ü',N'U'),
          N'â',N'a'), N'Â',N'A'), N'î',N'i'), N'Î',N'I'), N'û',N'u'), N'Û',N'U')
      ) AS nvarchar(150)) PERSISTED,
    CihazNumarasi          nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    TurKodu                nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    KaynakKodu             nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    MarkaKodu              nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    DurumKodu              nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    MasaKodu               nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    SahipKodu              nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    HesapKimlik            uniqueidentifier NULL,
    MakineKimlik           uniqueidentifier NULL,
    ServisKimlik           uniqueidentifier NULL,
    ServisAtamaKaynagiKodu nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    UlasimZamaniKodu       nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    SesDosyaKimlik         uniqueidentifier NULL,
    KonumUlkeKodu          nvarchar(2) COLLATE Latin1_General_100_BIN2 NOT NULL,
    IlKodu                 tinyint NULL,
    IlceKodu               int NULL,
    YurtdisiBolge          nvarchar(100) COLLATE Turkish_100_CI_AS NULL,
    YurtdisiIlce           nvarchar(100) COLLATE Turkish_100_CI_AS NULL,
    Adres                  nvarchar(500) COLLATE Turkish_100_CI_AS NULL,
    IletisimTelefonE164    nvarchar(16) COLLATE Latin1_General_100_BIN2 NULL,
    IletisimTelefonUlusal  nvarchar(15) COLLATE Latin1_General_100_BIN2 NULL,
    Kapali                 bit NOT NULL CONSTRAINT DF_talep_Talep_Kapali DEFAULT (0),
    ServisAtamaZamani      datetime2(3) NULL,
    KapanmaZamani          datetime2(3) NULL,
    YapanTuruKodu          nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik   uniqueidentifier NULL,
    YapanHesapKimlik       uniqueidentifier NULL,
    YapanAdi               nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu     nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu         nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani           datetime2(3) NOT NULL CONSTRAINT DF_talep_Talep_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    IstemciOlusmaZamani    datetime2(3) NULL,
    GuncellemeZamani       datetime2(3) NOT NULL CONSTRAINT DF_talep_Talep_GuncellemeZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                bigint IDENTITY(1,1) NOT NULL,
    Kimlik                 uniqueidentifier NOT NULL CONSTRAINT DF_talep_Talep_Kimlik DEFAULT NEWID(),
    EskiKayitNo            nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
    EskiNumara             nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    SatirSurumu            rowversion NOT NULL,
    CONSTRAINT PK_talep_Talep PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_talep_Talep_Numara UNIQUE (Numara),
    CONSTRAINT UQ_talep_Talep_KimlikTurKodu UNIQUE (Kimlik, TurKodu),
    CONSTRAINT UQ_talep_Talep_KimlikMarkaKodu UNIQUE (Kimlik, MarkaKodu),
    CONSTRAINT UQ_talep_Talep_KimlikServisKimlik UNIQUE (Kimlik, ServisKimlik),
    CONSTRAINT FK_talep_Talep_kod_TalepNumaraKurali FOREIGN KEY (TurKodu, KaynakKodu, NumaraOneki) REFERENCES kod.TalepNumaraKurali (TurKodu, KaynakKodu, NumaraOneki),
    CONSTRAINT FK_talep_Talep_kod_TalepTuruDurumu FOREIGN KEY (TurKodu, DurumKodu) REFERENCES kod.TalepTuruDurumu (TurKodu, DurumKodu),
    CONSTRAINT FK_talep_Talep_kod_TalepDurumu FOREIGN KEY (DurumKodu, Kapali) REFERENCES kod.TalepDurumu (Kod, Kapali),
    CONSTRAINT FK_talep_Talep_katalog_Marka FOREIGN KEY (MarkaKodu) REFERENCES katalog.Marka (Kod),
    CONSTRAINT FK_talep_Talep_kod_Masa FOREIGN KEY (MasaKodu) REFERENCES kod.Masa (Kod),
    CONSTRAINT FK_talep_Talep_kod_Sahip FOREIGN KEY (SahipKodu) REFERENCES kod.Sahip (Kod),
    CONSTRAINT FK_talep_Talep_musteri_Hesap FOREIGN KEY (HesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_talep_Talep_makine_Makine FOREIGN KEY (MakineKimlik, MarkaKodu) REFERENCES makine.Makine (Kimlik, MarkaKodu),
    CONSTRAINT FK_talep_Talep_servis_MarkaYetkisi FOREIGN KEY (ServisKimlik, MarkaKodu) REFERENCES servis.MarkaYetkisi (ServisKimlik, MarkaKodu),
    CONSTRAINT FK_talep_Talep_kod_ServisAtamaKaynagi FOREIGN KEY (ServisAtamaKaynagiKodu) REFERENCES kod.ServisAtamaKaynagi (Kod),
    CONSTRAINT FK_talep_Talep_kod_UlasimZamani FOREIGN KEY (UlasimZamaniKodu) REFERENCES kod.UlasimZamani (Kod),
    CONSTRAINT FK_talep_Talep_dosya_Dosya_Ses FOREIGN KEY (SesDosyaKimlik) REFERENCES dosya.Dosya (Kimlik),
    CONSTRAINT FK_talep_Talep_cografya_Ulke FOREIGN KEY (KonumUlkeKodu) REFERENCES cografya.Ulke (Kod),
    CONSTRAINT FK_talep_Talep_cografya_Il FOREIGN KEY (IlKodu) REFERENCES cografya.Il (IlKodu),
    CONSTRAINT FK_talep_Talep_cografya_Ilce FOREIGN KEY (IlKodu, IlceKodu) REFERENCES cografya.Ilce (IlKodu, IlceKodu),
    CONSTRAINT FK_talep_Talep_kod_AktorTuru FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_talep_Talep_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_Talep_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_talep_Talep_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_talep_Talep_Numara CHECK (Numara LIKE N'[A-Z][A-Z][A-Z][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
    CONSTRAINT CK_talep_Talep_NumaraOneki CHECK (LEFT(Numara, 3) = NumaraOneki),
    CONSTRAINT CK_talep_Talep_Kapali CHECK ((Kapali = 1 AND KapanmaZamani IS NOT NULL) OR (Kapali = 0 AND KapanmaZamani IS NULL)),
    CONSTRAINT CK_talep_Talep_ServisElle CHECK (KaynakKodu <> N'servisElle' OR ServisKimlik IS NOT NULL),
    CONSTRAINT CK_talep_Talep_ServisSiparisi CHECK (KaynakKodu <> N'servisSiparisi' OR (HesapKimlik IS NULL AND ServisKimlik IS NOT NULL)),
    CONSTRAINT CK_talep_Talep_ConnectServisMakine CHECK (NOT (KaynakKodu = N'connect' AND TurKodu = N'servis') OR MakineKimlik IS NOT NULL),
    CONSTRAINT CK_talep_Talep_SahipServis CHECK (SahipKodu <> N'servis' OR ServisKimlik IS NOT NULL),
    CONSTRAINT CK_talep_Talep_ServisAtama CHECK (ServisKimlik IS NOT NULL OR (ServisAtamaKaynagiKodu IS NULL AND ServisAtamaZamani IS NULL)),
    CONSTRAINT CK_talep_Talep_Konum CHECK ((KonumUlkeKodu = N'TR' AND YurtdisiBolge IS NULL AND YurtdisiIlce IS NULL) OR (KonumUlkeKodu <> N'TR' AND IlKodu IS NULL AND IlceKodu IS NULL)),
    CONSTRAINT CK_talep_Talep_KonumIlce CHECK (IlceKodu IS NULL OR IlKodu IS NOT NULL),
    CONSTRAINT CK_talep_Talep_IletisimTelefonE164 CHECK (IletisimTelefonE164 IS NULL OR (IletisimTelefonE164 LIKE N'+[1-9]%' AND SUBSTRING(IletisimTelefonE164, 2, 15) NOT LIKE N'%[^0-9]%' AND LEN(IletisimTelefonE164) BETWEEN 8 AND 16)),
    CONSTRAINT CK_talep_Talep_IletisimTelefonUlusal CHECK (IletisimTelefonUlusal IS NULL OR IletisimTelefonUlusal NOT LIKE N'%[^0-9]%'),
    CONSTRAINT CK_talep_Talep_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_Talep_KayitNo ON talep.Talep (KayitNo);
CREATE INDEX IX_talep_Talep_DurumKoduKapaliOlusmaZamani ON talep.Talep (DurumKodu, Kapali, OlusmaZamani DESC) INCLUDE (TurKodu, MasaKodu, SahipKodu, ServisKimlik, IlKodu, MarkaKodu);
CREATE INDEX IX_talep_Talep_AcikOlusmaZamani ON talep.Talep (OlusmaZamani) INCLUDE (TurKodu, DurumKodu, MasaKodu, SahipKodu, MarkaKodu, ServisKimlik, HesapKimlik, IlKodu) WHERE Kapali = 0;
CREATE INDEX IX_talep_Talep_TurKoduOlusmaZamani ON talep.Talep (TurKodu, OlusmaZamani);
CREATE INDEX IX_talep_Talep_MarkaKoduOlusmaZamani ON talep.Talep (MarkaKodu, OlusmaZamani);
CREATE INDEX IX_talep_Talep_IlKoduOlusmaZamani ON talep.Talep (IlKodu, OlusmaZamani);
CREATE INDEX IX_talep_Talep_ServisKimlikDurumKoduOlusmaZamani ON talep.Talep (ServisKimlik, DurumKodu, OlusmaZamani) WHERE ServisKimlik IS NOT NULL;
CREATE INDEX IX_talep_Talep_HesapKimlikOlusmaZamani ON talep.Talep (HesapKimlik, OlusmaZamani) WHERE HesapKimlik IS NOT NULL;
CREATE INDEX IX_talep_Talep_MakineKimlikMarkaKodu ON talep.Talep (MakineKimlik, MarkaKodu) WHERE MakineKimlik IS NOT NULL;
CREATE INDEX IX_talep_Talep_MasaKodu ON talep.Talep (MasaKodu) WHERE MasaKodu IS NOT NULL;
CREATE INDEX IX_talep_Talep_IletisimTelefonE164 ON talep.Talep (IletisimTelefonE164) WHERE IletisimTelefonE164 IS NOT NULL;
CREATE INDEX IX_talep_Talep_IletisimTelefonUlusal ON talep.Talep (IletisimTelefonUlusal) WHERE IletisimTelefonUlusal IS NOT NULL;
CREATE INDEX IX_talep_Talep_IletisimAdArama ON talep.Talep (IletisimAdArama);
CREATE INDEX IX_talep_Talep_CihazNumarasi ON talep.Talep (CihazNumarasi) WHERE CihazNumarasi IS NOT NULL;
CREATE INDEX IX_talep_Talep_EskiNumara ON talep.Talep (EskiNumara) WHERE EskiNumara IS NOT NULL;
CREATE INDEX IX_talep_Talep_TurKoduKaynakKoduNumaraOneki ON talep.Talep (TurKodu, KaynakKodu, NumaraOneki);
CREATE INDEX IX_talep_Talep_TurKoduDurumKodu ON talep.Talep (TurKodu, DurumKodu);
CREATE INDEX IX_talep_Talep_ServisKimlikMarkaKodu ON talep.Talep (ServisKimlik, MarkaKodu) WHERE ServisKimlik IS NOT NULL;
CREATE INDEX IX_talep_Talep_IlKoduIlceKodu ON talep.Talep (IlKodu, IlceKodu) WHERE IlKodu IS NOT NULL;
CREATE INDEX IX_talep_Talep_SahipKodu ON talep.Talep (SahipKodu);
CREATE INDEX IX_talep_Talep_ServisAtamaKaynagiKodu ON talep.Talep (ServisAtamaKaynagiKodu) WHERE ServisAtamaKaynagiKodu IS NOT NULL;
CREATE INDEX IX_talep_Talep_UlasimZamaniKodu ON talep.Talep (UlasimZamaniKodu) WHERE UlasimZamaniKodu IS NOT NULL;
CREATE INDEX IX_talep_Talep_SesDosyaKimlik ON talep.Talep (SesDosyaKimlik) WHERE SesDosyaKimlik IS NOT NULL;
CREATE INDEX IX_talep_Talep_KonumUlkeKodu ON talep.Talep (KonumUlkeKodu);
CREATE INDEX IX_talep_Talep_YapanTuruKodu ON talep.Talep (YapanTuruKodu);
CREATE INDEX IX_talep_Talep_YapanKullaniciKimlik ON talep.Talep (YapanKullaniciKimlik) WHERE YapanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_Talep_YapanHesapKimlik ON talep.Talep (YapanHesapKimlik) WHERE YapanHesapKimlik IS NOT NULL;
CREATE INDEX IX_talep_Talep_KaynakUygulamaKodu ON talep.Talep (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'Talep', @Metin = N'Servis, yedek parça ve fiyat teklifi talepleri. Her talebin PAKSAN''ın verdiği okunur bir numarası vardır (SRV2600123, ekranda SRV-26-00123). Türe özgü bilgiler ServisTalebiAyrinti, ParcaTalebiAyrinti ve TeklifTalebiAyrinti tablolarında; işin adımları (not, randevu, ziyaret, kapanış, iptal…) talep şemasının öteki tablolarındadır. Talep silinmez, iptal edilir.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'Numara', @Metin = N'Talebin okunur numarası: 3 harf önek + yılın son 2 hanesi + 5 haneli sıra (SRV2600123). Ekranda SRV-26-00123 diye gösterilir; müşteri havale açıklamasına tiresiz yazar. sistem.NumaraAl verir; boşluk olabilir. Tiresiz ve büyük harfle saklanır; ekrandaki SRV-26-00123 yazımıyla ya da küçük harfle yapılan eşitlik araması kayıt bulmaz. Numarayı her yazımla bulmak için EXEC yardim.TalepGoster N''SRV-26-00123'' kullanın.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'NumaraOneki', @Metin = N'Numaranın ilk 3 harfi (SRV, YPR, TKF, SPS). Talebin türü ve kaynağıyla birlikte kod.TalepNumaraKurali içinde tanımlı olmalı.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'Aciklama', @Metin = N'Talebi açanın yazdığı açıklama (müşterinin anlattığı sorun ya da istek). Anonimleştirmede sabit metinle değiştirilir.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'Ihracat', @Metin = N'1: yurt dışı (ihracat) talebi.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'IletisimAdi', @Metin = N'Talepteki iletişim kişisinin adı (talep açılırken yazılan). Anonimleştirmede boşalır. Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz. Adı Türkçe harfsiz aramak için IletisimAdArama kolonunu LIKE N''%isik%'' biçiminde kullanın.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'IletisimAdArama', @Metin = N'İletişim adının Türkçe harfsiz, küçük harfli arama biçimi; veritabanı hesaplar (''isik'' araması ''IŞIK'' adını bulur). Aranacak metni küçük harfle ve Türkçe harfsiz yazın: WHERE IletisimAdArama LIKE N''%isik%''.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'CihazNumarasi', @Metin = N'Sunucudan önce cihazın kendi ürettiği numara (eski yedek parça ödeme numarası gibi). Aramada bulunur, yeniden verilmez.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'TurKodu', @Metin = N'Talebin türü: servis, parca (yedek parça), satinalma (fiyat teklifi) (kod.TalepTuru). Talep oluştuktan sonra değişmez.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'KaynakKodu', @Metin = N'Talebin nereden açıldığı: connect, servisElle, servisSiparisi, backoffice (kod.TalepKaynagi).';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'MarkaKodu', @Metin = N'Talebin markası (katalog.Marka). Talep oluştuktan sonra değişmez; makine, parça ve servis yetkisi bu markaya göre denetlenir.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'DurumKodu', @Metin = N'Talebin şu anki durumu (kod.TalepDurumu). Bu tür için tanımlı bir durum olmalı (kod.TalepTuruDurumu). Her değişiklik talep.DurumGecmisi tablosuna yazılır.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'MasaKodu', @Metin = N'Talebin PAKSAN''da önüne düştüğü masa: servisMasasi, parcaMasasi (kod.Masa). PAKSAN''da iş beklemiyorsa boş.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'SahipKodu', @Metin = N'Talepten şu an kimin sorumlu olduğu: paksan, servis ya da bayi (kod.Sahip).';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'HesapKimlik', @Metin = N'Talebin bağlı olduğu müşteri hesabı (musteri.Hesap). Talep müşteriye telefonla değil bu bağla bağlanır. Oturumsuz açılan ve servis siparişi taleplerinde boş.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'MakineKimlik', @Metin = N'Talebin ilgili olduğu makine (makine.Makine); makinenin markası talebin markasıyla aynı olmalı. Connect''ten açılan servis talebinde zorunlu.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'ServisKimlik', @Metin = N'Talebin müşterisi olduğu servis (servis.Servis). Bir kez yazılınca değişmez; servisin talebin markasında yetkisi olmalı (servis.MarkaYetkisi).';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'ServisAtamaKaynagiKodu', @Metin = N'Servisin talebe nereden geldiği: makineAtamasi, bayiServisi, servisElle (kod.ServisAtamaKaynagi). Servis yoksa boş.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'UlasimZamaniKodu', @Metin = N'Müşterinin aranmak istediği zaman: farkEtmez, sabah, ogledenSonra, aksamustu (kod.UlasimZamani).';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'SesDosyaKimlik', @Metin = N'Talebe eklenen ses kaydı (dosya.Dosya).';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'KonumUlkeKodu', @Metin = N'Hizmet yerinin ülkesi (cografya.Ulke; Türkiye TR).';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'IlKodu', @Metin = N'Hizmet yerinin ili, plaka kodu (cografya.Il). Yalnız Türkiye''de dolu.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'IlceKodu', @Metin = N'Hizmet yerinin ilçesi (cografya.Ilce). Yalnız Türkiye''de dolu.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'YurtdisiBolge', @Metin = N'Yurt dışında hizmet yerinin bölge ya da eyalet adı (serbest metin). Türkiye''de boş.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'YurtdisiIlce', @Metin = N'Yurt dışında hizmet yerinin ilçe ya da şehir adı (serbest metin). Türkiye''de boş.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'Adres', @Metin = N'Hizmet yerinin açık adresi. Anonimleştirmede boşalır. Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'IletisimTelefonE164', @Metin = N'Talepteki iletişim telefonu, uluslararası biçimde (+905321234567). Anonimleştirmede boşalır.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'IletisimTelefonUlusal', @Metin = N'Talepteki iletişim telefonu, ülke kodu atılmış hâli (Türkiye''de 10 hane, başında 0 yok); aramada kullanılır. Anonimleştirmede boşalır.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'Kapali', @Metin = N'1: talep kapalı (kapandı ya da iptal edildi). Durumun kod.TalepDurumu tablosundaki Kapali değerinin kopyasıdır; durumla çelişemez. Açık talepler için bu kolona bakılır, durum kodu listesi yazılmaz.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'ServisAtamaZamani', @Metin = N'Servisin talebe yazıldığı an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'KapanmaZamani', @Metin = N'Talebin kapandığı ya da iptal edildiği an (UTC). Talep açıkken boş; yeniden açılınca boşalır.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'YapanTuruKodu', @Metin = N'Talebi açan tarafın türü: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'YapanKullaniciKimlik', @Metin = N'Talebi açan personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'YapanHesapKimlik', @Metin = N'Talebi açan müşteri hesabı (musteri.Hesap). Yalnız müşteride dolu.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'YapanAdi', @Metin = N'Talebi açan kişinin o anki adı. Müşteride boş (müşterinin adı burada tutulmaz).';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim (kod.KaynakUygulama).';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (ör. 0.9.14); bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'OlusmaZamani', @Metin = N'Talebin sunucuya yazıldığı an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'IstemciOlusmaZamani', @Metin = N'Kaydın cihazda oluşturulduğu an (UTC, cihaz saati). Yalnız bilgi amaçlı; sunucu saati esastır.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'GuncellemeZamani', @Metin = N'Kaydın son değiştiği an (UTC). API her güncellemede yazar.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'EskiKayitNo', @Metin = N'Talebin sunucudan önceki kayıttaki kimliği (taşıma için).';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'EskiNumara', @Metin = N'Talebin eski numarası (taşıma için). Yeniden verilmez; aramada bulunur.';
EXEC dbo.AciklamaYaz N'talep', N'Talep', N'SatirSurumu', @Metin = N'Aynı kaydın iki kişi tarafından aynı anda değiştirilmesini yakalayan sürüm damgası. Veritabanı yazar.';
GO

/* ==========================================================================
   talep.ServisTalebiAyrinti
   ========================================================================== */
CREATE TABLE talep.ServisTalebiAyrinti (
    TalepKimlik      uniqueidentifier NOT NULL,
    TurKodu          nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    MakineDurumuKodu nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    CONSTRAINT PK_talep_ServisTalebiAyrinti PRIMARY KEY CLUSTERED (TalepKimlik),
    CONSTRAINT FK_talep_ServisTalebiAyrinti_talep_Talep FOREIGN KEY (TalepKimlik, TurKodu) REFERENCES talep.Talep (Kimlik, TurKodu),
    CONSTRAINT FK_talep_ServisTalebiAyrinti_kod_MakineDurumu FOREIGN KEY (MakineDurumuKodu) REFERENCES kod.MakineDurumu (Kod),
    CONSTRAINT CK_talep_ServisTalebiAyrinti_TurKodu CHECK (TurKodu = N'servis')
);
GO

CREATE INDEX IX_talep_ServisTalebiAyrinti_TalepKimlikTurKodu ON talep.ServisTalebiAyrinti (TalepKimlik, TurKodu);
CREATE INDEX IX_talep_ServisTalebiAyrinti_MakineDurumuKodu ON talep.ServisTalebiAyrinti (MakineDurumuKodu) WHERE MakineDurumuKodu IS NOT NULL;
GO

EXEC dbo.AciklamaYaz N'talep', N'ServisTalebiAyrinti', @Metin = N'Servis talebine özgü bilgiler. Her servis talebinde en çok bir satır.';
EXEC dbo.AciklamaYaz N'talep', N'ServisTalebiAyrinti', N'TalepKimlik', @Metin = N'Ayrıntının ait olduğu servis talebi (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'ServisTalebiAyrinti', N'TurKodu', @Metin = N'Talebin türü; bu tabloda her zaman servis. Talebin kendi türüyle eşleşmesi yabancı anahtarla denetlenir.';
EXEC dbo.AciklamaYaz N'talep', N'ServisTalebiAyrinti', N'MakineDurumuKodu', @Metin = N'Müşterinin bildirdiği makine durumu: durdu, sorunlu, kontrol, kurulum (kod.MakineDurumu).';
GO

/* ==========================================================================
   talep.ParcaTalebiAyrinti
   ========================================================================== */
CREATE TABLE talep.ParcaTalebiAyrinti (
    KdvOrani                       decimal(7,4) NULL,
    ListeKdvHaric                  bit NULL,
    IskontoOrani                   decimal(7,4) NULL,
    AraToplam                      decimal(18,2) NULL,
    KdvTutari                      decimal(18,2) NULL,
    GenelToplam                    decimal(18,2) NULL,
    EksikFiyatVar                  bit NOT NULL CONSTRAINT DF_talep_ParcaTalebiAyrinti_EksikFiyatVar DEFAULT (0),
    TeslimatAdresi                 nvarchar(500) COLLATE Turkish_100_CI_AS NULL,
    KargoTutari                    decimal(18,2) NULL,
    OdenecekTutar                  decimal(18,2) NULL,
    SonOdemeTarihi                 date NULL,
    TalepKimlik                    uniqueidentifier NOT NULL,
    TurKodu                        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    OdemeYontemiKodu               nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    FiyatListesiMarkaKodu          nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    FiyatListesiKodu               nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    ParaBirimiKodu                 nvarchar(3) COLLATE Latin1_General_100_BIN2 NULL,
    SirketKodu                     nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    TutarDogrulayanKullaniciKimlik uniqueidentifier NULL,
    TutarDogrulamaZamani           datetime2(3) NULL,
    TutarDogrulayanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    CONSTRAINT PK_talep_ParcaTalebiAyrinti PRIMARY KEY CLUSTERED (TalepKimlik),
    CONSTRAINT FK_talep_ParcaTalebiAyrinti_talep_Talep FOREIGN KEY (TalepKimlik, TurKodu) REFERENCES talep.Talep (Kimlik, TurKodu),
    CONSTRAINT FK_talep_ParcaTalebiAyrinti_kod_OdemeYontemi FOREIGN KEY (OdemeYontemiKodu) REFERENCES kod.OdemeYontemi (Kod),
    CONSTRAINT FK_talep_ParcaTalebiAyrinti_katalog_FiyatListesi FOREIGN KEY (FiyatListesiMarkaKodu, FiyatListesiKodu) REFERENCES katalog.FiyatListesi (MarkaKodu, Kod),
    CONSTRAINT FK_talep_ParcaTalebiAyrinti_kod_ParaBirimi FOREIGN KEY (ParaBirimiKodu) REFERENCES kod.ParaBirimi (Kod),
    CONSTRAINT FK_talep_ParcaTalebiAyrinti_sirket_Sirket FOREIGN KEY (SirketKodu) REFERENCES sirket.Sirket (Kod),
    CONSTRAINT FK_talep_ParcaTalebiAyrinti_erisim_Kullanici_TutarDogrulayan FOREIGN KEY (TutarDogrulayanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT CK_talep_ParcaTalebiAyrinti_TurKodu CHECK (TurKodu = N'parca'),
    CONSTRAINT CK_talep_ParcaTalebiAyrinti_FiyatListesi CHECK ((FiyatListesiMarkaKodu IS NULL AND FiyatListesiKodu IS NULL) OR (FiyatListesiMarkaKodu IS NOT NULL AND FiyatListesiKodu IS NOT NULL)),
    CONSTRAINT CK_talep_ParcaTalebiAyrinti_KdvOrani CHECK (KdvOrani IS NULL OR (KdvOrani >= 0 AND KdvOrani <= 1)),
    CONSTRAINT CK_talep_ParcaTalebiAyrinti_IskontoOrani CHECK (IskontoOrani IS NULL OR (IskontoOrani >= 0 AND IskontoOrani <= 1)),
    CONSTRAINT CK_talep_ParcaTalebiAyrinti_AraToplam CHECK (AraToplam IS NULL OR AraToplam >= 0),
    CONSTRAINT CK_talep_ParcaTalebiAyrinti_KdvTutari CHECK (KdvTutari IS NULL OR KdvTutari >= 0),
    CONSTRAINT CK_talep_ParcaTalebiAyrinti_GenelToplam CHECK (GenelToplam IS NULL OR GenelToplam >= 0),
    CONSTRAINT CK_talep_ParcaTalebiAyrinti_KargoTutari CHECK (KargoTutari IS NULL OR KargoTutari >= 0),
    CONSTRAINT CK_talep_ParcaTalebiAyrinti_OdenecekTutar CHECK (OdenecekTutar IS NULL OR OdenecekTutar >= 0),
    CONSTRAINT CK_talep_ParcaTalebiAyrinti_Toplam CHECK ((AraToplam IS NULL AND KdvTutari IS NULL AND GenelToplam IS NULL) OR (AraToplam IS NOT NULL AND KdvTutari IS NOT NULL AND GenelToplam IS NOT NULL AND GenelToplam = AraToplam + KdvTutari)),
    CONSTRAINT CK_talep_ParcaTalebiAyrinti_ParaBirimi CHECK (ParaBirimiKodu IS NOT NULL OR (AraToplam IS NULL AND KdvTutari IS NULL AND GenelToplam IS NULL AND KargoTutari IS NULL AND OdenecekTutar IS NULL)),
    CONSTRAINT CK_talep_ParcaTalebiAyrinti_TutarDogrulama CHECK ((OdenecekTutar IS NULL AND SonOdemeTarihi IS NULL AND TutarDogrulamaZamani IS NULL AND TutarDogrulayanKullaniciKimlik IS NULL) OR (OdenecekTutar IS NOT NULL AND SonOdemeTarihi IS NOT NULL AND TutarDogrulamaZamani IS NOT NULL AND TutarDogrulayanKullaniciKimlik IS NOT NULL))
);
GO

CREATE INDEX IX_talep_ParcaTalebiAyrinti_SonOdemeTarihi ON talep.ParcaTalebiAyrinti (SonOdemeTarihi) INCLUDE (OdenecekTutar, ParaBirimiKodu) WHERE SonOdemeTarihi IS NOT NULL;
CREATE INDEX IX_talep_ParcaTalebiAyrinti_TalepKimlikTurKodu ON talep.ParcaTalebiAyrinti (TalepKimlik, TurKodu);
CREATE INDEX IX_talep_ParcaTalebiAyrinti_FiyatListesiMarkaKoduFiyatListesiKodu ON talep.ParcaTalebiAyrinti (FiyatListesiMarkaKodu, FiyatListesiKodu) WHERE FiyatListesiMarkaKodu IS NOT NULL;
CREATE INDEX IX_talep_ParcaTalebiAyrinti_OdemeYontemiKodu ON talep.ParcaTalebiAyrinti (OdemeYontemiKodu);
CREATE INDEX IX_talep_ParcaTalebiAyrinti_ParaBirimiKodu ON talep.ParcaTalebiAyrinti (ParaBirimiKodu) WHERE ParaBirimiKodu IS NOT NULL;
CREATE INDEX IX_talep_ParcaTalebiAyrinti_SirketKodu ON talep.ParcaTalebiAyrinti (SirketKodu);
CREATE INDEX IX_talep_ParcaTalebiAyrinti_TutarDogrulayanKullaniciKimlik ON talep.ParcaTalebiAyrinti (TutarDogrulayanKullaniciKimlik) WHERE TutarDogrulayanKullaniciKimlik IS NOT NULL;
GO

EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', @Metin = N'Yedek parça talebinin fiyat ve ödeme bilgisi. Her parça talebinde en çok bir satır. AraToplam, KdvTutari ve GenelToplam talep açılırken müşterinin gördüğü tutardır ve değişmez; OdenecekTutar PAKSAN''ın stok ve fiyatı doğruladıktan sonra istediği son tutardır.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'KdvOrani', @Metin = N'Talep açılırken kullanılan KDV oranı (0,2000 = %20).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'ListeKdvHaric', @Metin = N'1: fiyat listesi KDV hariç kabul edildi (talep açıldığı günkü kural).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'IskontoOrani', @Metin = N'Talep açılırken uygulanan indirim oranı (0,3000 = %30); yoksa boş.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'AraToplam', @Metin = N'Parça satırlarının KDV hariç toplamı; talep açılırken müşterinin gördüğü tutar (para birimi ParaBirimiKodu kolonunda).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'KdvTutari', @Metin = N'Ara toplamın KDV tutarı; talep açılırken müşterinin gördüğü.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'GenelToplam', @Metin = N'KDV dahil toplam (AraToplam + KdvTutari), kargo hariç; talep açılırken müşterinin gördüğü.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'EksikFiyatVar', @Metin = N'1: en az bir parçanın fiyatı listede yoktu; toplam eksik olabilir.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'TeslimatAdresi', @Metin = N'Parçanın gönderileceği adres. Anonimleştirmede boşalır.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'KargoTutari', @Metin = N'PAKSAN''ın doğruladığı kargo bedeli (OdenecekTutar''ın içindedir).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'OdenecekTutar', @Metin = N'PAKSAN''ın stok ve fiyatı doğruladıktan sonra müşteriden istediği KDV ve kargo dahil son tutar. Muhasebe dekontu bu tutarla karşılaştırır.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'SonOdemeTarihi', @Metin = N'Müşterinin ödemeyi yapması gereken son gün (Türkiye günü). Doğrulama günü + ödeme bekleme günü; sonradan ayar değişse de değişmez. Geçerse talep iptal edilir.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'TalepKimlik', @Metin = N'Ayrıntının ait olduğu yedek parça talebi (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'TurKodu', @Metin = N'Talebin türü; bu tabloda her zaman parca. Talebin kendi türüyle eşleşmesi yabancı anahtarla denetlenir.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'OdemeYontemiKodu', @Metin = N'Ödeme yolu: havale, bakiye (servisin hesabından), fatura (kod.OdemeYontemi).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'FiyatListesiMarkaKodu', @Metin = N'Fiyatların alındığı fiyat listesinin markası (katalog.FiyatListesi).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'FiyatListesiKodu', @Metin = N'Fiyatların alındığı fiyat listesinin kodu (ör. 2026-07-1).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'ParaBirimiKodu', @Metin = N'Bu satırdaki ve talebin parça satırlarındaki tutarların para birimi (kod.ParaBirimi; TRY).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'SirketKodu', @Metin = N'Faturayı kesen ve ödemeyi alan şirket (sirket.Sirket). Talep yazılırken markanın şirketinden kopyalanır, sonra değişmez. Ödeme ekranındaki IBAN''lar bu şirketin banka hesaplarıdır.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'TutarDogrulayanKullaniciKimlik', @Metin = N'Tutarı doğrulayan personel (erisim.Kullanici).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'TutarDogrulamaZamani', @Metin = N'PAKSAN''ın tutarı doğruladığı an (UTC). OdenecekTutar, SonOdemeTarihi ve doğrulayan kullanıcıyla birlikte dolu ya da birlikte boş.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaTalebiAyrinti', N'TutarDogrulayanAdi', @Metin = N'Tutarı doğrulayan personelin o anki adı.';
GO

/* ==========================================================================
   talep.TeklifTalebiAyrinti
   ========================================================================== */
CREATE TABLE talep.TeklifTalebiAyrinti (
    TalepKimlik       uniqueidentifier NOT NULL,
    TurKodu           nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    IlgiUrunMarkaKodu nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    IlgiUrunKodu      nvarchar(60) COLLATE Latin1_General_100_BIN2 NULL,
    TraktorGucuKodu   nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    CONSTRAINT PK_talep_TeklifTalebiAyrinti PRIMARY KEY CLUSTERED (TalepKimlik),
    CONSTRAINT FK_talep_TeklifTalebiAyrinti_talep_Talep FOREIGN KEY (TalepKimlik, TurKodu) REFERENCES talep.Talep (Kimlik, TurKodu),
    CONSTRAINT FK_talep_TeklifTalebiAyrinti_katalog_Urun FOREIGN KEY (IlgiUrunMarkaKodu, IlgiUrunKodu) REFERENCES katalog.Urun (MarkaKodu, Kod),
    CONSTRAINT FK_talep_TeklifTalebiAyrinti_kod_TraktorGucu FOREIGN KEY (TraktorGucuKodu) REFERENCES kod.TraktorGucu (Kod),
    CONSTRAINT CK_talep_TeklifTalebiAyrinti_TurKodu CHECK (TurKodu = N'satinalma'),
    CONSTRAINT CK_talep_TeklifTalebiAyrinti_IlgiUrun CHECK ((IlgiUrunMarkaKodu IS NULL AND IlgiUrunKodu IS NULL) OR (IlgiUrunMarkaKodu IS NOT NULL AND IlgiUrunKodu IS NOT NULL))
);
GO

CREATE INDEX IX_talep_TeklifTalebiAyrinti_TalepKimlikTurKodu ON talep.TeklifTalebiAyrinti (TalepKimlik, TurKodu);
CREATE INDEX IX_talep_TeklifTalebiAyrinti_IlgiUrunMarkaKoduIlgiUrunKodu ON talep.TeklifTalebiAyrinti (IlgiUrunMarkaKodu, IlgiUrunKodu) WHERE IlgiUrunMarkaKodu IS NOT NULL;
CREATE INDEX IX_talep_TeklifTalebiAyrinti_TraktorGucuKodu ON talep.TeklifTalebiAyrinti (TraktorGucuKodu) WHERE TraktorGucuKodu IS NOT NULL;
GO

EXEC dbo.AciklamaYaz N'talep', N'TeklifTalebiAyrinti', @Metin = N'Fiyat teklifi (satın alma) talebine özgü bilgiler. Her teklif talebinde en çok bir satır.';
EXEC dbo.AciklamaYaz N'talep', N'TeklifTalebiAyrinti', N'TalepKimlik', @Metin = N'Ayrıntının ait olduğu fiyat teklifi talebi (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'TeklifTalebiAyrinti', N'TurKodu', @Metin = N'Talebin türü; bu tabloda her zaman satinalma. Talebin kendi türüyle eşleşmesi yabancı anahtarla denetlenir.';
EXEC dbo.AciklamaYaz N'talep', N'TeklifTalebiAyrinti', N'IlgiUrunMarkaKodu', @Metin = N'Müşterinin fiyat istediği ürünün markası (katalog.Urun).';
EXEC dbo.AciklamaYaz N'talep', N'TeklifTalebiAyrinti', N'IlgiUrunKodu', @Metin = N'Müşterinin fiyat istediği ürün (katalog.Urun).';
EXEC dbo.AciklamaYaz N'talep', N'TeklifTalebiAyrinti', N'TraktorGucuKodu', @Metin = N'Müşterinin traktör gücü aralığı (kod.TraktorGucu).';
GO

/* ==========================================================================
   talep.TalepBelirtisi
   ========================================================================== */
CREATE TABLE talep.TalepBelirtisi (
    TalepKimlik uniqueidentifier NOT NULL,
    BelirtiKodu nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    CONSTRAINT PK_talep_TalepBelirtisi PRIMARY KEY CLUSTERED (TalepKimlik, BelirtiKodu),
    CONSTRAINT FK_talep_TalepBelirtisi_talep_Talep FOREIGN KEY (TalepKimlik) REFERENCES talep.Talep (Kimlik),
    CONSTRAINT FK_talep_TalepBelirtisi_kod_Belirti FOREIGN KEY (BelirtiKodu) REFERENCES kod.Belirti (Kod)
);
GO

CREATE INDEX IX_talep_TalepBelirtisi_BelirtiKodu ON talep.TalepBelirtisi (BelirtiKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'TalepBelirtisi', @Metin = N'Servis talebinde müşterinin seçtiği arıza belirtileri. Talep başına belirti başına bir satır.';
EXEC dbo.AciklamaYaz N'talep', N'TalepBelirtisi', N'TalepKimlik', @Metin = N'Seçimin yapıldığı talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'TalepBelirtisi', N'BelirtiKodu', @Metin = N'Seçilen belirti (kod.Belirti). Ekrandaki liste talebin markası ve makine ailesi için kod.BelirtiKapsami tablosundan gelir.';
GO

/* ==========================================================================
   talep.TeklifUrunTipi
   ========================================================================== */
CREATE TABLE talep.TeklifUrunTipi (
    TalepKimlik  uniqueidentifier NOT NULL,
    UrunTipiKodu nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    CONSTRAINT PK_talep_TeklifUrunTipi PRIMARY KEY CLUSTERED (TalepKimlik, UrunTipiKodu),
    CONSTRAINT FK_talep_TeklifUrunTipi_talep_Talep FOREIGN KEY (TalepKimlik) REFERENCES talep.Talep (Kimlik),
    CONSTRAINT FK_talep_TeklifUrunTipi_kod_UrunTipi FOREIGN KEY (UrunTipiKodu) REFERENCES kod.UrunTipi (Kod)
);
GO

CREATE INDEX IX_talep_TeklifUrunTipi_UrunTipiKodu ON talep.TeklifUrunTipi (UrunTipiKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'TeklifUrunTipi', @Metin = N'Fiyat teklifi talebinde müşterinin işlediği ürün tipleri (yonca, saman-buğday…). Talep başına tip başına bir satır.';
EXEC dbo.AciklamaYaz N'talep', N'TeklifUrunTipi', N'TalepKimlik', @Metin = N'Seçimin yapıldığı talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'TeklifUrunTipi', N'UrunTipiKodu', @Metin = N'Seçilen ürün tipi (kod.UrunTipi).';
GO

/* ==========================================================================
   talep.TeklifArazi
   ========================================================================== */
CREATE TABLE talep.TeklifArazi (
    TalepKimlik uniqueidentifier NOT NULL,
    AraziKodu   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    CONSTRAINT PK_talep_TeklifArazi PRIMARY KEY CLUSTERED (TalepKimlik, AraziKodu),
    CONSTRAINT FK_talep_TeklifArazi_talep_Talep FOREIGN KEY (TalepKimlik) REFERENCES talep.Talep (Kimlik),
    CONSTRAINT FK_talep_TeklifArazi_kod_Arazi FOREIGN KEY (AraziKodu) REFERENCES kod.Arazi (Kod)
);
GO

CREATE INDEX IX_talep_TeklifArazi_AraziKodu ON talep.TeklifArazi (AraziKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'TeklifArazi', @Metin = N'Fiyat teklifi talebinde müşterinin arazi büyüklüğü seçimi. Talep başına seçim başına bir satır.';
EXEC dbo.AciklamaYaz N'talep', N'TeklifArazi', N'TalepKimlik', @Metin = N'Seçimin yapıldığı talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'TeklifArazi', N'AraziKodu', @Metin = N'Seçilen arazi büyüklüğü (kod.Arazi).';
GO

/* ==========================================================================
   talep.DurumGecmisi
   ========================================================================== */
CREATE TABLE talep.DurumGecmisi (
    MusteriyeBildirildi  bit NOT NULL,
    TalepKimlik          uniqueidentifier NOT NULL,
    OncekiDurumKodu      nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    YeniDurumKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    OncekiSahipKodu      nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    YeniSahipKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    OncekiMasaKodu       nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    YeniMasaKodu         nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    YapanTuruKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik uniqueidentifier NULL,
    YapanHesapKimlik     uniqueidentifier NULL,
    YapanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu       nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani         datetime2(3) NOT NULL CONSTRAINT DF_talep_DurumGecmisi_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo              bigint IDENTITY(1,1) NOT NULL,
    Kimlik               uniqueidentifier NOT NULL CONSTRAINT DF_talep_DurumGecmisi_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_talep_DurumGecmisi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_talep_DurumGecmisi_talep_Talep FOREIGN KEY (TalepKimlik) REFERENCES talep.Talep (Kimlik),
    CONSTRAINT FK_talep_DurumGecmisi_kod_TalepDurumu_Onceki FOREIGN KEY (OncekiDurumKodu) REFERENCES kod.TalepDurumu (Kod),
    CONSTRAINT FK_talep_DurumGecmisi_kod_TalepDurumu_Yeni FOREIGN KEY (YeniDurumKodu) REFERENCES kod.TalepDurumu (Kod),
    CONSTRAINT FK_talep_DurumGecmisi_kod_Sahip_Onceki FOREIGN KEY (OncekiSahipKodu) REFERENCES kod.Sahip (Kod),
    CONSTRAINT FK_talep_DurumGecmisi_kod_Sahip_Yeni FOREIGN KEY (YeniSahipKodu) REFERENCES kod.Sahip (Kod),
    CONSTRAINT FK_talep_DurumGecmisi_kod_Masa_Onceki FOREIGN KEY (OncekiMasaKodu) REFERENCES kod.Masa (Kod),
    CONSTRAINT FK_talep_DurumGecmisi_kod_Masa_Yeni FOREIGN KEY (YeniMasaKodu) REFERENCES kod.Masa (Kod),
    CONSTRAINT FK_talep_DurumGecmisi_kod_AktorTuru FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_talep_DurumGecmisi_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_DurumGecmisi_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_talep_DurumGecmisi_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_talep_DurumGecmisi_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_DurumGecmisi_KayitNo ON talep.DurumGecmisi (KayitNo);
CREATE INDEX IX_talep_DurumGecmisi_TalepKimlikKayitNo ON talep.DurumGecmisi (TalepKimlik, KayitNo);
CREATE INDEX IX_talep_DurumGecmisi_OncekiDurumKodu ON talep.DurumGecmisi (OncekiDurumKodu) WHERE OncekiDurumKodu IS NOT NULL;
CREATE INDEX IX_talep_DurumGecmisi_YeniDurumKodu ON talep.DurumGecmisi (YeniDurumKodu);
CREATE INDEX IX_talep_DurumGecmisi_OncekiSahipKodu ON talep.DurumGecmisi (OncekiSahipKodu) WHERE OncekiSahipKodu IS NOT NULL;
CREATE INDEX IX_talep_DurumGecmisi_YeniSahipKodu ON talep.DurumGecmisi (YeniSahipKodu) WHERE YeniSahipKodu IS NOT NULL;
CREATE INDEX IX_talep_DurumGecmisi_OncekiMasaKodu ON talep.DurumGecmisi (OncekiMasaKodu) WHERE OncekiMasaKodu IS NOT NULL;
CREATE INDEX IX_talep_DurumGecmisi_YeniMasaKodu ON talep.DurumGecmisi (YeniMasaKodu) WHERE YeniMasaKodu IS NOT NULL;
CREATE INDEX IX_talep_DurumGecmisi_YapanTuruKodu ON talep.DurumGecmisi (YapanTuruKodu);
CREATE INDEX IX_talep_DurumGecmisi_YapanKullaniciKimlik ON talep.DurumGecmisi (YapanKullaniciKimlik) WHERE YapanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_DurumGecmisi_YapanHesapKimlik ON talep.DurumGecmisi (YapanHesapKimlik) WHERE YapanHesapKimlik IS NOT NULL;
CREATE INDEX IX_talep_DurumGecmisi_KaynakUygulamaKodu ON talep.DurumGecmisi (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'DurumGecmisi', @Metin = N'Talebin durum, sahip ve masa değişikliklerinin silinmez geçmişi. Yalnız TR_talep_Talep_DurumGecmisi tetikleyicisi yazar; satırlar değiştirilemez ve silinemez.';
EXEC dbo.AciklamaYaz N'talep', N'DurumGecmisi', N'MusteriyeBildirildi', @Metin = N'1: bu değişiklik müşteriye bildirim olarak gösterildi; 0: yalnız iç kayıt (ör. yönetim düzeltmesi).';
EXEC dbo.AciklamaYaz N'talep', N'DurumGecmisi', N'TalepKimlik', @Metin = N'Değişikliğin olduğu talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'DurumGecmisi', N'OncekiDurumKodu', @Metin = N'Değişiklikten önceki durum (kod.TalepDurumu). Talep ilk açıldığında boş.';
EXEC dbo.AciklamaYaz N'talep', N'DurumGecmisi', N'YeniDurumKodu', @Metin = N'Değişiklikten sonraki durum (kod.TalepDurumu).';
EXEC dbo.AciklamaYaz N'talep', N'DurumGecmisi', N'OncekiSahipKodu', @Metin = N'Değişiklikten önceki sorumlu (kod.Sahip). İlk açılışta ve eski kayıtlardan taşınan satırlarda boş.';
EXEC dbo.AciklamaYaz N'talep', N'DurumGecmisi', N'YeniSahipKodu', @Metin = N'Değişiklikten sonraki sorumlu (kod.Sahip). Eski kayıtlardan taşınan satırlarda boş olabilir.';
EXEC dbo.AciklamaYaz N'talep', N'DurumGecmisi', N'OncekiMasaKodu', @Metin = N'Değişiklikten önceki masa (kod.Masa); masa yoksa boş.';
EXEC dbo.AciklamaYaz N'talep', N'DurumGecmisi', N'YeniMasaKodu', @Metin = N'Değişiklikten sonraki masa (kod.Masa); masa yoksa boş.';
EXEC dbo.AciklamaYaz N'talep', N'DurumGecmisi', N'YapanTuruKodu', @Metin = N'Değişikliği yapan tarafın türü: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz N'talep', N'DurumGecmisi', N'YapanKullaniciKimlik', @Metin = N'Değişikliği yapan personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz N'talep', N'DurumGecmisi', N'YapanHesapKimlik', @Metin = N'Değişikliği yapan müşteri hesabı (musteri.Hesap). Yalnız müşteride dolu.';
EXEC dbo.AciklamaYaz N'talep', N'DurumGecmisi', N'YapanAdi', @Metin = N'Değişikliği yapan kişinin o anki adı. Müşteride boş (müşterinin adı burada tutulmaz).';
EXEC dbo.AciklamaYaz N'talep', N'DurumGecmisi', N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim (kod.KaynakUygulama).';
EXEC dbo.AciklamaYaz N'talep', N'DurumGecmisi', N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (ör. 0.9.14); bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz N'talep', N'DurumGecmisi', N'OlusmaZamani', @Metin = N'Değişikliğin olduğu an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'DurumGecmisi', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'DurumGecmisi', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
GO

/* ==========================================================================
   talep.TalepNotu
   ========================================================================== */
CREATE TABLE talep.TalepNotu (
    Metin                nvarchar(2000) COLLATE Turkish_100_CI_AS NOT NULL,
    MusteriGorur         bit NOT NULL CONSTRAINT DF_talep_TalepNotu_MusteriGorur DEFAULT (0),
    ServisGorur          bit NOT NULL CONSTRAINT DF_talep_TalepNotu_ServisGorur DEFAULT (0),
    ServistenGeldi       bit NOT NULL CONSTRAINT DF_talep_TalepNotu_ServistenGeldi DEFAULT (0),
    TalepKimlik          uniqueidentifier NOT NULL,
    YapanTuruKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik uniqueidentifier NULL,
    YapanHesapKimlik     uniqueidentifier NULL,
    YapanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu       nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani         datetime2(3) NOT NULL CONSTRAINT DF_talep_TalepNotu_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    IstemciOlusmaZamani  datetime2(3) NULL,
    KayitNo              bigint IDENTITY(1,1) NOT NULL,
    Kimlik               uniqueidentifier NOT NULL CONSTRAINT DF_talep_TalepNotu_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_talep_TalepNotu PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_talep_TalepNotu_talep_Talep FOREIGN KEY (TalepKimlik) REFERENCES talep.Talep (Kimlik),
    CONSTRAINT FK_talep_TalepNotu_kod_AktorTuru FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_talep_TalepNotu_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_TalepNotu_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_talep_TalepNotu_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_talep_TalepNotu_Metin CHECK (LEN(Metin) > 0),
    CONSTRAINT CK_talep_TalepNotu_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_TalepNotu_KayitNo ON talep.TalepNotu (KayitNo);
CREATE INDEX IX_talep_TalepNotu_TalepKimlikOlusmaZamani ON talep.TalepNotu (TalepKimlik, OlusmaZamani);
CREATE INDEX IX_talep_TalepNotu_YapanTuruKodu ON talep.TalepNotu (YapanTuruKodu);
CREATE INDEX IX_talep_TalepNotu_YapanKullaniciKimlik ON talep.TalepNotu (YapanKullaniciKimlik) WHERE YapanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_TalepNotu_YapanHesapKimlik ON talep.TalepNotu (YapanHesapKimlik) WHERE YapanHesapKimlik IS NOT NULL;
CREATE INDEX IX_talep_TalepNotu_KaynakUygulamaKodu ON talep.TalepNotu (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'TalepNotu', @Metin = N'Talebe yazılan notlar. Her notun müşteriye ve servise görünüp görünmeyeceği ayrı işaretlenir. Notlar yalnız eklenir, değiştirilmez.';
EXEC dbo.AciklamaYaz N'talep', N'TalepNotu', N'Metin', @Metin = N'Notun metni. Anonimleştirmede sabit metinle değiştirilir.';
EXEC dbo.AciklamaYaz N'talep', N'TalepNotu', N'MusteriGorur', @Metin = N'1: müşteri bu notu Connect''te görür.';
EXEC dbo.AciklamaYaz N'talep', N'TalepNotu', N'ServisGorur', @Metin = N'1: servis bu notu Servisim''de görür.';
EXEC dbo.AciklamaYaz N'talep', N'TalepNotu', N'ServistenGeldi', @Metin = N'1: notu servis yazdı.';
EXEC dbo.AciklamaYaz N'talep', N'TalepNotu', N'TalepKimlik', @Metin = N'Notun yazıldığı talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'TalepNotu', N'YapanTuruKodu', @Metin = N'Notu yazan tarafın türü: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz N'talep', N'TalepNotu', N'YapanKullaniciKimlik', @Metin = N'Notu yazan personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz N'talep', N'TalepNotu', N'YapanHesapKimlik', @Metin = N'Notu yazan müşteri hesabı (musteri.Hesap). Yalnız müşteride dolu.';
EXEC dbo.AciklamaYaz N'talep', N'TalepNotu', N'YapanAdi', @Metin = N'Notu yazan kişinin o anki adı. Müşteride boş (müşterinin adı burada tutulmaz).';
EXEC dbo.AciklamaYaz N'talep', N'TalepNotu', N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim (kod.KaynakUygulama).';
EXEC dbo.AciklamaYaz N'talep', N'TalepNotu', N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (ör. 0.9.14); bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz N'talep', N'TalepNotu', N'OlusmaZamani', @Metin = N'Notun yazıldığı an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'TalepNotu', N'IstemciOlusmaZamani', @Metin = N'Kaydın cihazda oluşturulduğu an (UTC, cihaz saati). Yalnız bilgi amaçlı; sunucu saati esastır.';
EXEC dbo.AciklamaYaz N'talep', N'TalepNotu', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'TalepNotu', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
GO

/* ==========================================================================
   talep.Randevu
   ========================================================================== */
CREATE TABLE talep.Randevu (
    IsTanimi             nvarchar(300) COLLATE Turkish_100_CI_AS NULL,
    SaatBelirtildi       bit NOT NULL CONSTRAINT DF_talep_Randevu_SaatBelirtildi DEFAULT (0),
    MusteriyleGorusuldu  bit NOT NULL CONSTRAINT DF_talep_Randevu_MusteriyleGorusuldu DEFAULT (0),
    TalepKimlik          uniqueidentifier NOT NULL,
    PlanlananZamani      datetime2(3) NOT NULL,
    IptalZamani          datetime2(3) NULL,
    YapanTuruKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik uniqueidentifier NULL,
    YapanHesapKimlik     uniqueidentifier NULL,
    YapanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu       nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani         datetime2(3) NOT NULL CONSTRAINT DF_talep_Randevu_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo              bigint IDENTITY(1,1) NOT NULL,
    Kimlik               uniqueidentifier NOT NULL CONSTRAINT DF_talep_Randevu_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_talep_Randevu PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_talep_Randevu_talep_Talep FOREIGN KEY (TalepKimlik) REFERENCES talep.Talep (Kimlik),
    CONSTRAINT FK_talep_Randevu_kod_AktorTuru FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_talep_Randevu_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_Randevu_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_talep_Randevu_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_talep_Randevu_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_Randevu_KayitNo ON talep.Randevu (KayitNo);
CREATE INDEX IX_talep_Randevu_TalepKimlikPlanlananZamani ON talep.Randevu (TalepKimlik, PlanlananZamani);
CREATE INDEX IX_talep_Randevu_PlanlananZamani ON talep.Randevu (PlanlananZamani) INCLUDE (TalepKimlik) WHERE IptalZamani IS NULL;
CREATE INDEX IX_talep_Randevu_YapanTuruKodu ON talep.Randevu (YapanTuruKodu);
CREATE INDEX IX_talep_Randevu_YapanKullaniciKimlik ON talep.Randevu (YapanKullaniciKimlik) WHERE YapanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_Randevu_YapanHesapKimlik ON talep.Randevu (YapanHesapKimlik) WHERE YapanHesapKimlik IS NOT NULL;
CREATE INDEX IX_talep_Randevu_KaynakUygulamaKodu ON talep.Randevu (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'Randevu', @Metin = N'Talep için planlanan ziyaret randevuları. Etkin randevu iptal zamanı boş olan satırdır; randevu değişince eskisi iptal zamanı alır ve yeni satır yazılır.';
EXEC dbo.AciklamaYaz N'talep', N'Randevu', N'IsTanimi', @Metin = N'Randevuda yapılacak işin kısa tanımı.';
EXEC dbo.AciklamaYaz N'talep', N'Randevu', N'SaatBelirtildi', @Metin = N'1: randevunun saati de belirlendi; 0: yalnız gün belli.';
EXEC dbo.AciklamaYaz N'talep', N'Randevu', N'MusteriyleGorusuldu', @Metin = N'1: randevu müşteriyle konuşularak kararlaştırıldı.';
EXEC dbo.AciklamaYaz N'talep', N'Randevu', N'TalepKimlik', @Metin = N'Randevunun verildiği talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'Randevu', N'PlanlananZamani', @Metin = N'Randevunun günü ve saati (UTC). Saat belirtilmediyse yalnız gün anlamlıdır.';
EXEC dbo.AciklamaYaz N'talep', N'Randevu', N'IptalZamani', @Metin = N'Randevunun iptal edildiği ya da yenisiyle değiştirildiği an (UTC). Etkin randevuda boş.';
EXEC dbo.AciklamaYaz N'talep', N'Randevu', N'YapanTuruKodu', @Metin = N'Randevuyu planlayan tarafın türü: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz N'talep', N'Randevu', N'YapanKullaniciKimlik', @Metin = N'Randevuyu planlayan personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz N'talep', N'Randevu', N'YapanHesapKimlik', @Metin = N'Randevuyu planlayan müşteri hesabı (musteri.Hesap). Yalnız müşteride dolu.';
EXEC dbo.AciklamaYaz N'talep', N'Randevu', N'YapanAdi', @Metin = N'Randevuyu planlayan kişinin o anki adı. Müşteride boş (müşterinin adı burada tutulmaz).';
EXEC dbo.AciklamaYaz N'talep', N'Randevu', N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim (kod.KaynakUygulama).';
EXEC dbo.AciklamaYaz N'talep', N'Randevu', N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (ör. 0.9.14); bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz N'talep', N'Randevu', N'OlusmaZamani', @Metin = N'Randevunun kaydedildiği an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'Randevu', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'Randevu', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
GO

/* ==========================================================================
   talep.Teklif
   ========================================================================== */
CREATE TABLE talep.Teklif (
    SiraNo                tinyint NOT NULL,
    Tutar                 decimal(18,2) NULL,
    KdvDahil              bit NULL,
    GecerlilikBitisTarihi date NULL,
    GecerlilikMetni       nvarchar(200) COLLATE Turkish_100_CI_AS NULL,
    TeklifNotu            nvarchar(1000) COLLATE Turkish_100_CI_AS NULL,
    TalepKimlik           uniqueidentifier NOT NULL,
    ParaBirimiKodu        nvarchar(3) COLLATE Latin1_General_100_BIN2 NULL,
    YapanTuruKodu         nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik  uniqueidentifier NULL,
    YapanHesapKimlik      uniqueidentifier NULL,
    YapanAdi              nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu    nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu        nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani          datetime2(3) NOT NULL CONSTRAINT DF_talep_Teklif_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo               bigint IDENTITY(1,1) NOT NULL,
    Kimlik                uniqueidentifier NOT NULL CONSTRAINT DF_talep_Teklif_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_talep_Teklif PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_talep_Teklif_TalepKimlikSiraNo UNIQUE (TalepKimlik, SiraNo),
    CONSTRAINT FK_talep_Teklif_talep_Talep FOREIGN KEY (TalepKimlik) REFERENCES talep.Talep (Kimlik),
    CONSTRAINT FK_talep_Teklif_kod_ParaBirimi FOREIGN KEY (ParaBirimiKodu) REFERENCES kod.ParaBirimi (Kod),
    CONSTRAINT FK_talep_Teklif_kod_AktorTuru FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_talep_Teklif_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_Teklif_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_talep_Teklif_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_talep_Teklif_SiraNo CHECK (SiraNo >= 1),
    CONSTRAINT CK_talep_Teklif_Tutar CHECK (Tutar IS NULL OR Tutar >= 0),
    CONSTRAINT CK_talep_Teklif_ParaBirimi CHECK (Tutar IS NULL OR ParaBirimiKodu IS NOT NULL),
    CONSTRAINT CK_talep_Teklif_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_Teklif_KayitNo ON talep.Teklif (KayitNo);
CREATE INDEX IX_talep_Teklif_ParaBirimiKodu ON talep.Teklif (ParaBirimiKodu) WHERE ParaBirimiKodu IS NOT NULL;
CREATE INDEX IX_talep_Teklif_YapanTuruKodu ON talep.Teklif (YapanTuruKodu);
CREATE INDEX IX_talep_Teklif_YapanKullaniciKimlik ON talep.Teklif (YapanKullaniciKimlik) WHERE YapanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_Teklif_YapanHesapKimlik ON talep.Teklif (YapanHesapKimlik) WHERE YapanHesapKimlik IS NOT NULL;
CREATE INDEX IX_talep_Teklif_KaynakUygulamaKodu ON talep.Teklif (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'Teklif', @Metin = N'Fiyat teklifi talebine verilen teklifler. Her teklif sıra numarasıyla ayrı satırdır; yalnız eklenir.';
EXEC dbo.AciklamaYaz N'talep', N'Teklif', N'SiraNo', @Metin = N'Teklifin talep içindeki sırası (1, 2, …).';
EXEC dbo.AciklamaYaz N'talep', N'Teklif', N'Tutar', @Metin = N'Teklif edilen fiyat (para birimi ParaBirimiKodu kolonunda; KDV durumu KdvDahil kolonunda).';
EXEC dbo.AciklamaYaz N'talep', N'Teklif', N'KdvDahil', @Metin = N'1: tutar KDV dahil; 0: KDV hariç; boş: belirtilmemiş (eski kayıt).';
EXEC dbo.AciklamaYaz N'talep', N'Teklif', N'GecerlilikBitisTarihi', @Metin = N'Teklifin geçerli olduğu son gün (Türkiye günü).';
EXEC dbo.AciklamaYaz N'talep', N'Teklif', N'GecerlilikMetni', @Metin = N'Eski kayıtlarda serbest metin olarak yazılmış geçerlilik bilgisi.';
EXEC dbo.AciklamaYaz N'talep', N'Teklif', N'TeklifNotu', @Metin = N'Teklifle ilgili not.';
EXEC dbo.AciklamaYaz N'talep', N'Teklif', N'TalepKimlik', @Metin = N'Teklifin verildiği talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'Teklif', N'ParaBirimiKodu', @Metin = N'Tutarın para birimi (kod.ParaBirimi); tutar varsa zorunlu.';
EXEC dbo.AciklamaYaz N'talep', N'Teklif', N'YapanTuruKodu', @Metin = N'Teklifi veren tarafın türü: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz N'talep', N'Teklif', N'YapanKullaniciKimlik', @Metin = N'Teklifi veren personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz N'talep', N'Teklif', N'YapanHesapKimlik', @Metin = N'Teklifi veren müşteri hesabı (musteri.Hesap). Yalnız müşteride dolu.';
EXEC dbo.AciklamaYaz N'talep', N'Teklif', N'YapanAdi', @Metin = N'Teklifi veren kişinin o anki adı. Müşteride boş (müşterinin adı burada tutulmaz).';
EXEC dbo.AciklamaYaz N'talep', N'Teklif', N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim (kod.KaynakUygulama).';
EXEC dbo.AciklamaYaz N'talep', N'Teklif', N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (ör. 0.9.14); bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz N'talep', N'Teklif', N'OlusmaZamani', @Metin = N'Teklifin kaydedildiği an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'Teklif', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'Teklif', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
GO

/* ==========================================================================
   talep.Iptal
   ========================================================================== */
CREATE TABLE talep.Iptal (
    Aciklama             nvarchar(1000) COLLATE Turkish_100_CI_AS NULL,
    TalepKimlik          uniqueidentifier NOT NULL,
    IptalNedeniKodu      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    AciklamaZorunlu      bit NOT NULL,
    YapanTuruKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik uniqueidentifier NULL,
    YapanHesapKimlik     uniqueidentifier NULL,
    YapanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu       nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani         datetime2(3) NOT NULL CONSTRAINT DF_talep_Iptal_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo              bigint IDENTITY(1,1) NOT NULL,
    Kimlik               uniqueidentifier NOT NULL CONSTRAINT DF_talep_Iptal_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_talep_Iptal PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_talep_Iptal_talep_Talep FOREIGN KEY (TalepKimlik) REFERENCES talep.Talep (Kimlik),
    CONSTRAINT FK_talep_Iptal_kod_IptalNedeni FOREIGN KEY (IptalNedeniKodu, AciklamaZorunlu) REFERENCES kod.IptalNedeni (Kod, AciklamaZorunlu),
    CONSTRAINT FK_talep_Iptal_kod_AktorTuru FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_talep_Iptal_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_Iptal_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_talep_Iptal_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_talep_Iptal_Aciklama CHECK (AciklamaZorunlu = 0 OR (Aciklama IS NOT NULL AND LEN(Aciklama) > 0)),
    CONSTRAINT CK_talep_Iptal_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_Iptal_KayitNo ON talep.Iptal (KayitNo);
CREATE INDEX IX_talep_Iptal_TalepKimlikOlusmaZamani ON talep.Iptal (TalepKimlik, OlusmaZamani);
CREATE INDEX IX_talep_Iptal_IptalNedeniKoduAciklamaZorunlu ON talep.Iptal (IptalNedeniKodu, AciklamaZorunlu);
CREATE INDEX IX_talep_Iptal_YapanTuruKodu ON talep.Iptal (YapanTuruKodu);
CREATE INDEX IX_talep_Iptal_YapanKullaniciKimlik ON talep.Iptal (YapanKullaniciKimlik) WHERE YapanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_Iptal_YapanHesapKimlik ON talep.Iptal (YapanHesapKimlik) WHERE YapanHesapKimlik IS NOT NULL;
CREATE INDEX IX_talep_Iptal_KaynakUygulamaKodu ON talep.Iptal (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'Iptal', @Metin = N'Talebin iptal kayıtları: neden, açıklama, kim ve ne zaman. Talep yeniden açılıp tekrar iptal edilirse yeni satır yazılır; yalnız eklenir.';
EXEC dbo.AciklamaYaz N'talep', N'Iptal', N'Aciklama', @Metin = N'İptal açıklaması; nedenin açıklama istediği durumda zorunlu. Anonimleştirmede sabit metinle değiştirilir.';
EXEC dbo.AciklamaYaz N'talep', N'Iptal', N'TalepKimlik', @Metin = N'İptal edilen talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'Iptal', N'IptalNedeniKodu', @Metin = N'İptal nedeni (kod.IptalNedeni).';
EXEC dbo.AciklamaYaz N'talep', N'Iptal', N'AciklamaZorunlu', @Metin = N'Nedenin açıklama isteyip istemediği; kod.IptalNedeni tablosundaki değerin kopyasıdır ve onunla çelişemez.';
EXEC dbo.AciklamaYaz N'talep', N'Iptal', N'YapanTuruKodu', @Metin = N'İptal eden tarafın türü: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz N'talep', N'Iptal', N'YapanKullaniciKimlik', @Metin = N'İptal eden personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz N'talep', N'Iptal', N'YapanHesapKimlik', @Metin = N'İptal eden müşteri hesabı (musteri.Hesap). Yalnız müşteride dolu.';
EXEC dbo.AciklamaYaz N'talep', N'Iptal', N'YapanAdi', @Metin = N'İptal eden kişinin o anki adı. Müşteride boş (müşterinin adı burada tutulmaz).';
EXEC dbo.AciklamaYaz N'talep', N'Iptal', N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim (kod.KaynakUygulama).';
EXEC dbo.AciklamaYaz N'talep', N'Iptal', N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (ör. 0.9.14); bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz N'talep', N'Iptal', N'OlusmaZamani', @Metin = N'İptalin kaydedildiği an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'Iptal', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'Iptal', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
GO

/* ==========================================================================
   talep.YenidenAcma
   ========================================================================== */
CREATE TABLE talep.YenidenAcma (
    Aciklama              nvarchar(1000) COLLATE Turkish_100_CI_AS NULL,
    MusteriyeBildirilmedi bit NOT NULL CONSTRAINT DF_talep_YenidenAcma_MusteriyeBildirilmedi DEFAULT (0),
    TalepKimlik           uniqueidentifier NOT NULL,
    OncekiDurumKodu       nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanTuruKodu         nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik  uniqueidentifier NULL,
    YapanHesapKimlik      uniqueidentifier NULL,
    YapanAdi              nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu    nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu        nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani          datetime2(3) NOT NULL CONSTRAINT DF_talep_YenidenAcma_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    IstemciOlusmaZamani   datetime2(3) NULL,
    KayitNo               bigint IDENTITY(1,1) NOT NULL,
    Kimlik                uniqueidentifier NOT NULL CONSTRAINT DF_talep_YenidenAcma_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_talep_YenidenAcma PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_talep_YenidenAcma_talep_Talep FOREIGN KEY (TalepKimlik) REFERENCES talep.Talep (Kimlik),
    CONSTRAINT FK_talep_YenidenAcma_kod_TalepDurumu FOREIGN KEY (OncekiDurumKodu) REFERENCES kod.TalepDurumu (Kod),
    CONSTRAINT FK_talep_YenidenAcma_kod_AktorTuru FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_talep_YenidenAcma_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_YenidenAcma_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_talep_YenidenAcma_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_talep_YenidenAcma_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_YenidenAcma_KayitNo ON talep.YenidenAcma (KayitNo);
CREATE INDEX IX_talep_YenidenAcma_TalepKimlikOlusmaZamani ON talep.YenidenAcma (TalepKimlik, OlusmaZamani);
CREATE INDEX IX_talep_YenidenAcma_OncekiDurumKodu ON talep.YenidenAcma (OncekiDurumKodu);
CREATE INDEX IX_talep_YenidenAcma_YapanTuruKodu ON talep.YenidenAcma (YapanTuruKodu);
CREATE INDEX IX_talep_YenidenAcma_YapanKullaniciKimlik ON talep.YenidenAcma (YapanKullaniciKimlik) WHERE YapanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_YenidenAcma_YapanHesapKimlik ON talep.YenidenAcma (YapanHesapKimlik) WHERE YapanHesapKimlik IS NOT NULL;
CREATE INDEX IX_talep_YenidenAcma_KaynakUygulamaKodu ON talep.YenidenAcma (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'YenidenAcma', @Metin = N'Kapanmış ya da iptal edilmiş talebin yeniden açılma kayıtları. Yalnız eklenir.';
EXEC dbo.AciklamaYaz N'talep', N'YenidenAcma', N'Aciklama', @Metin = N'Yeniden açma gerekçesi. Anonimleştirmede sabit metinle değiştirilir.';
EXEC dbo.AciklamaYaz N'talep', N'YenidenAcma', N'MusteriyeBildirilmedi', @Metin = N'1: yeniden açma müşteriye bildirilmedi (ör. yönetim düzeltmesi).';
EXEC dbo.AciklamaYaz N'talep', N'YenidenAcma', N'TalepKimlik', @Metin = N'Yeniden açılan talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'YenidenAcma', N'OncekiDurumKodu', @Metin = N'Talebin yeniden açılmadan önceki kapalı durumu (kod.TalepDurumu).';
EXEC dbo.AciklamaYaz N'talep', N'YenidenAcma', N'YapanTuruKodu', @Metin = N'Yeniden açan tarafın türü: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz N'talep', N'YenidenAcma', N'YapanKullaniciKimlik', @Metin = N'Yeniden açan personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz N'talep', N'YenidenAcma', N'YapanHesapKimlik', @Metin = N'Yeniden açan müşteri hesabı (musteri.Hesap). Yalnız müşteride dolu.';
EXEC dbo.AciklamaYaz N'talep', N'YenidenAcma', N'YapanAdi', @Metin = N'Yeniden açan kişinin o anki adı. Müşteride boş (müşterinin adı burada tutulmaz).';
EXEC dbo.AciklamaYaz N'talep', N'YenidenAcma', N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim (kod.KaynakUygulama).';
EXEC dbo.AciklamaYaz N'talep', N'YenidenAcma', N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (ör. 0.9.14); bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz N'talep', N'YenidenAcma', N'OlusmaZamani', @Metin = N'Talebin yeniden açıldığı an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'YenidenAcma', N'IstemciOlusmaZamani', @Metin = N'Kaydın cihazda oluşturulduğu an (UTC, cihaz saati). Yalnız bilgi amaçlı; sunucu saati esastır.';
EXEC dbo.AciklamaYaz N'talep', N'YenidenAcma', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'YenidenAcma', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
GO

/* ==========================================================================
   talep.Ekleme
   ========================================================================== */
CREATE TABLE talep.Ekleme (
    EklemeNotu           nvarchar(2000) COLLATE Turkish_100_CI_AS NULL,
    TalepKimlik          uniqueidentifier NOT NULL,
    SesDosyaKimlik       uniqueidentifier NULL,
    YapanTuruKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik uniqueidentifier NULL,
    YapanHesapKimlik     uniqueidentifier NULL,
    YapanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu       nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani         datetime2(3) NOT NULL CONSTRAINT DF_talep_Ekleme_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    IstemciOlusmaZamani  datetime2(3) NULL,
    KayitNo              bigint IDENTITY(1,1) NOT NULL,
    Kimlik               uniqueidentifier NOT NULL CONSTRAINT DF_talep_Ekleme_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_talep_Ekleme PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_talep_Ekleme_talep_Talep FOREIGN KEY (TalepKimlik) REFERENCES talep.Talep (Kimlik),
    CONSTRAINT FK_talep_Ekleme_dosya_Dosya_Ses FOREIGN KEY (SesDosyaKimlik) REFERENCES dosya.Dosya (Kimlik),
    CONSTRAINT FK_talep_Ekleme_kod_AktorTuru FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_talep_Ekleme_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_Ekleme_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_talep_Ekleme_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_talep_Ekleme_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_Ekleme_KayitNo ON talep.Ekleme (KayitNo);
CREATE INDEX IX_talep_Ekleme_TalepKimlikOlusmaZamani ON talep.Ekleme (TalepKimlik, OlusmaZamani);
CREATE INDEX IX_talep_Ekleme_SesDosyaKimlik ON talep.Ekleme (SesDosyaKimlik) WHERE SesDosyaKimlik IS NOT NULL;
CREATE INDEX IX_talep_Ekleme_YapanTuruKodu ON talep.Ekleme (YapanTuruKodu);
CREATE INDEX IX_talep_Ekleme_YapanKullaniciKimlik ON talep.Ekleme (YapanKullaniciKimlik) WHERE YapanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_Ekleme_YapanHesapKimlik ON talep.Ekleme (YapanHesapKimlik) WHERE YapanHesapKimlik IS NOT NULL;
CREATE INDEX IX_talep_Ekleme_KaynakUygulamaKodu ON talep.Ekleme (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'Ekleme', @Metin = N'Talep açıldıktan sonra eklenen not, ses kaydı ve dosyalar (dosyalar talep.EklemeEki tablosunda). Yalnız eklenir.';
EXEC dbo.AciklamaYaz N'talep', N'Ekleme', N'EklemeNotu', @Metin = N'Sonradan eklenen not. Anonimleştirmede sabit metinle değiştirilir.';
EXEC dbo.AciklamaYaz N'talep', N'Ekleme', N'TalepKimlik', @Metin = N'Eklemenin yapıldığı talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'Ekleme', N'SesDosyaKimlik', @Metin = N'Eklenen ses kaydı (dosya.Dosya).';
EXEC dbo.AciklamaYaz N'talep', N'Ekleme', N'YapanTuruKodu', @Metin = N'Eklemeyi yapan tarafın türü: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz N'talep', N'Ekleme', N'YapanKullaniciKimlik', @Metin = N'Eklemeyi yapan personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz N'talep', N'Ekleme', N'YapanHesapKimlik', @Metin = N'Eklemeyi yapan müşteri hesabı (musteri.Hesap). Yalnız müşteride dolu.';
EXEC dbo.AciklamaYaz N'talep', N'Ekleme', N'YapanAdi', @Metin = N'Eklemeyi yapan kişinin o anki adı. Müşteride boş (müşterinin adı burada tutulmaz).';
EXEC dbo.AciklamaYaz N'talep', N'Ekleme', N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim (kod.KaynakUygulama).';
EXEC dbo.AciklamaYaz N'talep', N'Ekleme', N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (ör. 0.9.14); bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz N'talep', N'Ekleme', N'OlusmaZamani', @Metin = N'Eklemenin yapıldığı an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'Ekleme', N'IstemciOlusmaZamani', @Metin = N'Kaydın cihazda oluşturulduğu an (UTC, cihaz saati). Yalnız bilgi amaçlı; sunucu saati esastır.';
EXEC dbo.AciklamaYaz N'talep', N'Ekleme', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'Ekleme', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
GO

/* ==========================================================================
   talep.EklemeEki
   ========================================================================== */
CREATE TABLE talep.EklemeEki (
    SiraNo       tinyint NOT NULL,
    EklemeKimlik uniqueidentifier NOT NULL,
    DosyaKimlik  uniqueidentifier NOT NULL,
    CONSTRAINT PK_talep_EklemeEki PRIMARY KEY CLUSTERED (EklemeKimlik, DosyaKimlik),
    CONSTRAINT UQ_talep_EklemeEki_EklemeKimlikSiraNo UNIQUE (EklemeKimlik, SiraNo),
    CONSTRAINT FK_talep_EklemeEki_talep_Ekleme FOREIGN KEY (EklemeKimlik) REFERENCES talep.Ekleme (Kimlik),
    CONSTRAINT FK_talep_EklemeEki_dosya_Dosya FOREIGN KEY (DosyaKimlik) REFERENCES dosya.Dosya (Kimlik)
);
GO

CREATE INDEX IX_talep_EklemeEki_DosyaKimlik ON talep.EklemeEki (DosyaKimlik);
GO

EXEC dbo.AciklamaYaz N'talep', N'EklemeEki', @Metin = N'Sonradan eklemeye bağlı fotoğraf ve videolar.';
EXEC dbo.AciklamaYaz N'talep', N'EklemeEki', N'SiraNo', @Metin = N'Dosyanın ekleme içindeki sırası.';
EXEC dbo.AciklamaYaz N'talep', N'EklemeEki', N'EklemeKimlik', @Metin = N'Dosyanın ait olduğu ekleme (talep.Ekleme).';
EXEC dbo.AciklamaYaz N'talep', N'EklemeEki', N'DosyaKimlik', @Metin = N'Eklenen dosya (dosya.Dosya).';
GO

/* ==========================================================================
   talep.TalepEki
   ========================================================================== */
CREATE TABLE talep.TalepEki (
    SiraNo      tinyint NOT NULL,
    TalepKimlik uniqueidentifier NOT NULL,
    DosyaKimlik uniqueidentifier NOT NULL,
    CONSTRAINT PK_talep_TalepEki PRIMARY KEY CLUSTERED (TalepKimlik, DosyaKimlik),
    CONSTRAINT UQ_talep_TalepEki_TalepKimlikSiraNo UNIQUE (TalepKimlik, SiraNo),
    CONSTRAINT FK_talep_TalepEki_talep_Talep FOREIGN KEY (TalepKimlik) REFERENCES talep.Talep (Kimlik),
    CONSTRAINT FK_talep_TalepEki_dosya_Dosya FOREIGN KEY (DosyaKimlik) REFERENCES dosya.Dosya (Kimlik)
);
GO

CREATE INDEX IX_talep_TalepEki_DosyaKimlik ON talep.TalepEki (DosyaKimlik);
GO

EXEC dbo.AciklamaYaz N'talep', N'TalepEki', @Metin = N'Talep açılırken eklenen fotoğraf ve videolar (en çok 5 fotoğraf ve 1 video; sınırı API uygular).';
EXEC dbo.AciklamaYaz N'talep', N'TalepEki', N'SiraNo', @Metin = N'Dosyanın talep içindeki sırası.';
EXEC dbo.AciklamaYaz N'talep', N'TalepEki', N'TalepKimlik', @Metin = N'Dosyanın eklendiği talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'TalepEki', N'DosyaKimlik', @Metin = N'Eklenen dosya (dosya.Dosya).';
GO

/* ==========================================================================
   talep.FaturaBilgisi
   ========================================================================== */
CREATE TABLE talep.FaturaBilgisi (
    AdSoyad          nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    Unvan            nvarchar(250) COLLATE Turkish_100_CI_AS NULL,
    TcNoSifreli      varbinary(512) NULL,
    TcNoOzeti        binary(32) NULL,
    TcNoMaskeli      nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    VergiNoSifreli   varbinary(512) NULL,
    VergiNoOzeti     binary(32) NULL,
    VergiNoMaskeli   nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    VergiDairesi     nvarchar(100) COLLATE Turkish_100_CI_AS NULL,
    Eposta           nvarchar(254) COLLATE Latin1_General_100_CI_AS NULL,
    AnahtarNo        tinyint NULL,
    TalepKimlik      uniqueidentifier NOT NULL,
    TurKodu          nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UyduKodu         nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT DF_talep_FaturaBilgisi_UyduKodu DEFAULT (N'faturaBilgisi'),
    FaturaTuruKodu   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    KonumUlkeKodu    nvarchar(2) COLLATE Latin1_General_100_BIN2 NOT NULL,
    IlKodu           tinyint NULL,
    IlceKodu         int NULL,
    YurtdisiBolge    nvarchar(100) COLLATE Turkish_100_CI_AS NULL,
    YurtdisiIlce     nvarchar(100) COLLATE Turkish_100_CI_AS NULL,
    Adres            nvarchar(500) COLLATE Turkish_100_CI_AS NULL,
    TelefonE164      nvarchar(16) COLLATE Latin1_General_100_BIN2 NULL,
    TelefonUlusal    nvarchar(15) COLLATE Latin1_General_100_BIN2 NULL,
    GuncellemeZamani datetime2(3) NOT NULL CONSTRAINT DF_talep_FaturaBilgisi_GuncellemeZamani DEFAULT SYSUTCDATETIME(),
    SatirSurumu      rowversion NOT NULL,
    CONSTRAINT PK_talep_FaturaBilgisi PRIMARY KEY CLUSTERED (TalepKimlik),
    CONSTRAINT FK_talep_FaturaBilgisi_kod_FaturaTuru FOREIGN KEY (FaturaTuruKodu) REFERENCES kod.FaturaTuru (Kod),
    CONSTRAINT FK_talep_FaturaBilgisi_talep_Talep FOREIGN KEY (TalepKimlik, TurKodu) REFERENCES talep.Talep (Kimlik, TurKodu),
    CONSTRAINT FK_talep_FaturaBilgisi_kod_TalepTuruUydusu FOREIGN KEY (TurKodu, UyduKodu) REFERENCES kod.TalepTuruUydusu (TurKodu, UyduKodu),
    CONSTRAINT FK_talep_FaturaBilgisi_cografya_Ulke FOREIGN KEY (KonumUlkeKodu) REFERENCES cografya.Ulke (Kod),
    CONSTRAINT FK_talep_FaturaBilgisi_cografya_Il FOREIGN KEY (IlKodu) REFERENCES cografya.Il (IlKodu),
    CONSTRAINT FK_talep_FaturaBilgisi_cografya_Ilce FOREIGN KEY (IlKodu, IlceKodu) REFERENCES cografya.Ilce (IlKodu, IlceKodu),
    CONSTRAINT CK_talep_FaturaBilgisi_TcNo CHECK ((TcNoSifreli IS NULL AND TcNoOzeti IS NULL AND TcNoMaskeli IS NULL) OR (TcNoSifreli IS NOT NULL AND TcNoOzeti IS NOT NULL AND TcNoMaskeli IS NOT NULL)),
    CONSTRAINT CK_talep_FaturaBilgisi_VergiNo CHECK ((VergiNoSifreli IS NULL AND VergiNoOzeti IS NULL AND VergiNoMaskeli IS NULL) OR (VergiNoSifreli IS NOT NULL AND VergiNoOzeti IS NOT NULL AND VergiNoMaskeli IS NOT NULL)),
    CONSTRAINT CK_talep_FaturaBilgisi_AnahtarNo CHECK (AnahtarNo IS NOT NULL OR (TcNoSifreli IS NULL AND VergiNoSifreli IS NULL)),
    CONSTRAINT CK_talep_FaturaBilgisi_UyduKodu CHECK (UyduKodu = N'faturaBilgisi'),
    CONSTRAINT CK_talep_FaturaBilgisi_Konum CHECK ((KonumUlkeKodu = N'TR' AND YurtdisiBolge IS NULL AND YurtdisiIlce IS NULL) OR (KonumUlkeKodu <> N'TR' AND IlKodu IS NULL AND IlceKodu IS NULL)),
    CONSTRAINT CK_talep_FaturaBilgisi_KonumIlce CHECK (IlceKodu IS NULL OR IlKodu IS NOT NULL),
    CONSTRAINT CK_talep_FaturaBilgisi_TelefonE164 CHECK (TelefonE164 IS NULL OR (TelefonE164 LIKE N'+[1-9]%' AND SUBSTRING(TelefonE164, 2, 15) NOT LIKE N'%[^0-9]%' AND LEN(TelefonE164) BETWEEN 8 AND 16)),
    CONSTRAINT CK_talep_FaturaBilgisi_TelefonUlusal CHECK (TelefonUlusal IS NULL OR TelefonUlusal NOT LIKE N'%[^0-9]%')
);
GO

CREATE INDEX IX_talep_FaturaBilgisi_TcNoOzeti ON talep.FaturaBilgisi (TcNoOzeti) WHERE TcNoOzeti IS NOT NULL;
CREATE INDEX IX_talep_FaturaBilgisi_VergiNoOzeti ON talep.FaturaBilgisi (VergiNoOzeti) WHERE VergiNoOzeti IS NOT NULL;
CREATE INDEX IX_talep_FaturaBilgisi_TalepKimlikTurKodu ON talep.FaturaBilgisi (TalepKimlik, TurKodu);
CREATE INDEX IX_talep_FaturaBilgisi_TurKoduUyduKodu ON talep.FaturaBilgisi (TurKodu, UyduKodu);
CREATE INDEX IX_talep_FaturaBilgisi_IlKoduIlceKodu ON talep.FaturaBilgisi (IlKodu, IlceKodu) WHERE IlKodu IS NOT NULL;
CREATE INDEX IX_talep_FaturaBilgisi_FaturaTuruKodu ON talep.FaturaBilgisi (FaturaTuruKodu);
CREATE INDEX IX_talep_FaturaBilgisi_KonumUlkeKodu ON talep.FaturaBilgisi (KonumUlkeKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', @Metin = N'Talebin fatura bilgisi: faturanın kimin adına kesileceği. TC ve vergi numarası şifreli tutulur; eşleştirme için anahtarlı özeti, listeler için gizlenmiş hâli vardır. Hangi talep türünün fatura bilgisi alabileceği kod.TalepTuruUydusu tablosundadır.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'AdSoyad', @Metin = N'Fatura kesilecek kişinin adı soyadı. Anonimleştirmede boşalır. Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'Unvan', @Metin = N'Fatura kesilecek firmanın unvanı. Anonimleştirmede boşalır. Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'TcNoSifreli', @Metin = N'TC kimlik numarası, uygulamada AES-256-GCM ile şifrelenmiş. Anonimleştirmede boşalır.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'TcNoOzeti', @Metin = N'TC kimlik numarasının anahtarlı özeti (HMAC-SHA256); aynı numarayı bulmak için.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'TcNoMaskeli', @Metin = N'TC kimlik numarasının gizlenmiş gösterimi (*********45).';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'VergiNoSifreli', @Metin = N'Vergi numarası, uygulamada AES-256-GCM ile şifrelenmiş. Anonimleştirmede boşalır.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'VergiNoOzeti', @Metin = N'Vergi numarasının anahtarlı özeti (HMAC-SHA256); aynı numarayı bulmak için.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'VergiNoMaskeli', @Metin = N'Vergi numarasının gizlenmiş gösterimi.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'VergiDairesi', @Metin = N'Vergi dairesi. Anonimleştirmede boşalır.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'Eposta', @Metin = N'Faturanın gönderileceği e-posta adresi. Anonimleştirmede boşalır.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'AnahtarNo', @Metin = N'Şifreli değerlerin hangi anahtarla şifrelendiği (anahtar değiştirirken kullanılır).';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'TalepKimlik', @Metin = N'Fatura bilgisinin ait olduğu talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'TurKodu', @Metin = N'Talebin türü. Talebin kendi türüyle aynı olmalı ve bu türün bu kaydı alabildiği kod.TalepTuruUydusu tablosunda yazılı olmalı (yeni tür = kod satırı).';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'UyduKodu', @Metin = N'Sabit değer faturaBilgisi. Tür ile bu tablo arasındaki bağı kod.TalepTuruUydusu üzerinden yabancı anahtarla denetlemek içindir.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'FaturaTuruKodu', @Metin = N'Fatura türü: kendisi, baskaKisi, firma (kod.FaturaTuru).';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'KonumUlkeKodu', @Metin = N'Fatura adresinin ülkesi (cografya.Ulke; Türkiye TR).';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'IlKodu', @Metin = N'Fatura adresinin ili, plaka kodu (cografya.Il). Yalnız Türkiye''de dolu.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'IlceKodu', @Metin = N'Fatura adresinin ilçesi (cografya.Ilce). Yalnız Türkiye''de dolu.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'YurtdisiBolge', @Metin = N'Yurt dışında fatura adresinin bölge ya da eyalet adı (serbest metin). Türkiye''de boş.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'YurtdisiIlce', @Metin = N'Yurt dışında fatura adresinin ilçe ya da şehir adı (serbest metin). Türkiye''de boş.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'Adres', @Metin = N'Fatura adresinin açık adresi. Anonimleştirmede boşalır. Elle ararken Türkçe harfli metni N''…'' biçiminde yazın; N öneki olmadan yazılan ı, ş, ğ, İ, Ş, Ğ harfleri sessizce başka harfe dönüşür ve kayıt bulunmaz.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'TelefonE164', @Metin = N'Fatura iletişim telefonu, uluslararası biçimde (+905321234567). Anonimleştirmede boşalır.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'TelefonUlusal', @Metin = N'Fatura iletişim telefonu, ülke kodu atılmış hâli (Türkiye''de 10 hane, başında 0 yok); aramada kullanılır. Anonimleştirmede boşalır.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'GuncellemeZamani', @Metin = N'Kaydın son değiştiği an (UTC). API her güncellemede yazar.';
EXEC dbo.AciklamaYaz N'talep', N'FaturaBilgisi', N'SatirSurumu', @Metin = N'Aynı kaydın iki kişi tarafından aynı anda değiştirilmesini yakalayan sürüm damgası. Veritabanı yazar.';
GO

/* ==========================================================================
   talep.Dekont
   ========================================================================== */
CREATE TABLE talep.Dekont (
    GecersizNedeni               nvarchar(500) COLLATE Turkish_100_CI_AS NULL,
    TalepKimlik                  uniqueidentifier NOT NULL,
    DosyaKimlik                  uniqueidentifier NOT NULL,
    GecersizKilanKullaniciKimlik uniqueidentifier NULL,
    GecersizZamani               datetime2(3) NULL,
    GecersizKilanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    YapanTuruKodu                nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik         uniqueidentifier NULL,
    YapanHesapKimlik             uniqueidentifier NULL,
    YapanAdi                     nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu           nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu               nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani                 datetime2(3) NOT NULL CONSTRAINT DF_talep_Dekont_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                      bigint IDENTITY(1,1) NOT NULL,
    Kimlik                       uniqueidentifier NOT NULL CONSTRAINT DF_talep_Dekont_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_talep_Dekont PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_talep_Dekont_talep_Talep FOREIGN KEY (TalepKimlik) REFERENCES talep.Talep (Kimlik),
    CONSTRAINT FK_talep_Dekont_dosya_Dosya FOREIGN KEY (DosyaKimlik) REFERENCES dosya.Dosya (Kimlik),
    CONSTRAINT FK_talep_Dekont_erisim_Kullanici_GecersizKilan FOREIGN KEY (GecersizKilanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_Dekont_kod_AktorTuru FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_talep_Dekont_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_Dekont_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_talep_Dekont_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_talep_Dekont_Gecersiz CHECK ((GecersizZamani IS NULL AND GecersizNedeni IS NULL AND GecersizKilanKullaniciKimlik IS NULL AND GecersizKilanAdi IS NULL) OR (GecersizZamani IS NOT NULL AND GecersizNedeni IS NOT NULL)),
    CONSTRAINT CK_talep_Dekont_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_Dekont_KayitNo ON talep.Dekont (KayitNo);
CREATE INDEX IX_talep_Dekont_TalepKimlikOlusmaZamani ON talep.Dekont (TalepKimlik, OlusmaZamani);
CREATE INDEX IX_talep_Dekont_DosyaKimlik ON talep.Dekont (DosyaKimlik);
CREATE INDEX IX_talep_Dekont_GecersizKilanKullaniciKimlik ON talep.Dekont (GecersizKilanKullaniciKimlik) WHERE GecersizKilanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_Dekont_YapanTuruKodu ON talep.Dekont (YapanTuruKodu);
CREATE INDEX IX_talep_Dekont_YapanKullaniciKimlik ON talep.Dekont (YapanKullaniciKimlik) WHERE YapanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_Dekont_YapanHesapKimlik ON talep.Dekont (YapanHesapKimlik) WHERE YapanHesapKimlik IS NOT NULL;
CREATE INDEX IX_talep_Dekont_KaynakUygulamaKodu ON talep.Dekont (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'Dekont', @Metin = N'Yedek parça ödemesi için yüklenen dekontlar. Silinmez; hatalı dekont geçersiz kılınır.';
EXEC dbo.AciklamaYaz N'talep', N'Dekont', N'GecersizNedeni', @Metin = N'Dekontun neden geçersiz kılındığı.';
EXEC dbo.AciklamaYaz N'talep', N'Dekont', N'TalepKimlik', @Metin = N'Dekontun yüklendiği talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'Dekont', N'DosyaKimlik', @Metin = N'Dekontun dosyası (dosya.Dosya).';
EXEC dbo.AciklamaYaz N'talep', N'Dekont', N'GecersizKilanKullaniciKimlik', @Metin = N'Dekontu geçersiz kılan personel (erisim.Kullanici).';
EXEC dbo.AciklamaYaz N'talep', N'Dekont', N'GecersizZamani', @Metin = N'Dekontun geçersiz kılındığı an (UTC). Geçerli dekontta boş.';
EXEC dbo.AciklamaYaz N'talep', N'Dekont', N'GecersizKilanAdi', @Metin = N'Dekontu geçersiz kılan personelin o anki adı.';
EXEC dbo.AciklamaYaz N'talep', N'Dekont', N'YapanTuruKodu', @Metin = N'Dekontu yükleyen tarafın türü: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz N'talep', N'Dekont', N'YapanKullaniciKimlik', @Metin = N'Dekontu yükleyen personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz N'talep', N'Dekont', N'YapanHesapKimlik', @Metin = N'Dekontu yükleyen müşteri hesabı (musteri.Hesap). Yalnız müşteride dolu.';
EXEC dbo.AciklamaYaz N'talep', N'Dekont', N'YapanAdi', @Metin = N'Dekontu yükleyen kişinin o anki adı. Müşteride boş (müşterinin adı burada tutulmaz).';
EXEC dbo.AciklamaYaz N'talep', N'Dekont', N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim (kod.KaynakUygulama).';
EXEC dbo.AciklamaYaz N'talep', N'Dekont', N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (ör. 0.9.14); bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz N'talep', N'Dekont', N'OlusmaZamani', @Metin = N'Dekontun yüklendiği an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'Dekont', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'Dekont', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
GO

/* ==========================================================================
   talep.OdemeOnayi
   ========================================================================== */
CREATE TABLE talep.OdemeOnayi (
    OnaylananTutar          decimal(18,2) NOT NULL,
    OnayNotu                nvarchar(500) COLLATE Turkish_100_CI_AS NULL,
    TalepKimlik             uniqueidentifier NOT NULL,
    ParaBirimiKodu          nvarchar(3) COLLATE Latin1_General_100_BIN2 NOT NULL,
    GeriAlanKullaniciKimlik uniqueidentifier NULL,
    GeriAlinmaZamani        datetime2(3) NULL,
    GeriAlanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    YapanTuruKodu           nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik    uniqueidentifier NULL,
    YapanHesapKimlik        uniqueidentifier NULL,
    YapanAdi                nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu          nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani            datetime2(3) NOT NULL CONSTRAINT DF_talep_OdemeOnayi_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                 bigint IDENTITY(1,1) NOT NULL,
    Kimlik                  uniqueidentifier NOT NULL CONSTRAINT DF_talep_OdemeOnayi_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_talep_OdemeOnayi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_talep_OdemeOnayi_talep_Talep FOREIGN KEY (TalepKimlik) REFERENCES talep.Talep (Kimlik),
    CONSTRAINT FK_talep_OdemeOnayi_kod_ParaBirimi FOREIGN KEY (ParaBirimiKodu) REFERENCES kod.ParaBirimi (Kod),
    CONSTRAINT FK_talep_OdemeOnayi_erisim_Kullanici_GeriAlan FOREIGN KEY (GeriAlanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_OdemeOnayi_kod_AktorTuru FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_talep_OdemeOnayi_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_OdemeOnayi_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_talep_OdemeOnayi_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_talep_OdemeOnayi_OnaylananTutar CHECK (OnaylananTutar >= 0),
    CONSTRAINT CK_talep_OdemeOnayi_GeriAlma CHECK (GeriAlinmaZamani IS NOT NULL OR (GeriAlanKullaniciKimlik IS NULL AND GeriAlanAdi IS NULL)),
    CONSTRAINT CK_talep_OdemeOnayi_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_OdemeOnayi_KayitNo ON talep.OdemeOnayi (KayitNo);
CREATE UNIQUE INDEX UX_talep_OdemeOnayi_Etkin ON talep.OdemeOnayi (TalepKimlik) WHERE GeriAlinmaZamani IS NULL;
CREATE INDEX IX_talep_OdemeOnayi_TalepKimlikOlusmaZamani ON talep.OdemeOnayi (TalepKimlik, OlusmaZamani);
CREATE INDEX IX_talep_OdemeOnayi_ParaBirimiKodu ON talep.OdemeOnayi (ParaBirimiKodu);
CREATE INDEX IX_talep_OdemeOnayi_GeriAlanKullaniciKimlik ON talep.OdemeOnayi (GeriAlanKullaniciKimlik) WHERE GeriAlanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_OdemeOnayi_YapanTuruKodu ON talep.OdemeOnayi (YapanTuruKodu);
CREATE INDEX IX_talep_OdemeOnayi_YapanKullaniciKimlik ON talep.OdemeOnayi (YapanKullaniciKimlik) WHERE YapanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_OdemeOnayi_YapanHesapKimlik ON talep.OdemeOnayi (YapanHesapKimlik) WHERE YapanHesapKimlik IS NOT NULL;
CREATE INDEX IX_talep_OdemeOnayi_KaynakUygulamaKodu ON talep.OdemeOnayi (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'OdemeOnayi', @Metin = N'Muhasebenin yedek parça ödemesini onayladığı kayıtlar. Talep başına en çok bir etkin (geri alınmamış) onay olur; geri alınan onay silinmez.';
EXEC dbo.AciklamaYaz N'talep', N'OdemeOnayi', N'OnaylananTutar', @Metin = N'Muhasebenin dekonttan doğruladığı ödenen tutar (para birimi ParaBirimiKodu kolonunda). ParcaTalebiAyrinti.OdenecekTutar ile karşılaştırılır.';
EXEC dbo.AciklamaYaz N'talep', N'OdemeOnayi', N'OnayNotu', @Metin = N'Onayla ilgili not.';
EXEC dbo.AciklamaYaz N'talep', N'OdemeOnayi', N'TalepKimlik', @Metin = N'Ödemesi onaylanan talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'OdemeOnayi', N'ParaBirimiKodu', @Metin = N'Onaylanan tutarın para birimi (kod.ParaBirimi).';
EXEC dbo.AciklamaYaz N'talep', N'OdemeOnayi', N'GeriAlanKullaniciKimlik', @Metin = N'Onayı geri alan personel (erisim.Kullanici).';
EXEC dbo.AciklamaYaz N'talep', N'OdemeOnayi', N'GeriAlinmaZamani', @Metin = N'Onayın geri alındığı an (UTC). Etkin onayda boş.';
EXEC dbo.AciklamaYaz N'talep', N'OdemeOnayi', N'GeriAlanAdi', @Metin = N'Onayı geri alan personelin o anki adı.';
EXEC dbo.AciklamaYaz N'talep', N'OdemeOnayi', N'YapanTuruKodu', @Metin = N'Onaylayan tarafın türü: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz N'talep', N'OdemeOnayi', N'YapanKullaniciKimlik', @Metin = N'Onaylayan personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz N'talep', N'OdemeOnayi', N'YapanHesapKimlik', @Metin = N'Onaylayan müşteri hesabı (musteri.Hesap). Yalnız müşteride dolu.';
EXEC dbo.AciklamaYaz N'talep', N'OdemeOnayi', N'YapanAdi', @Metin = N'Onaylayan kişinin o anki adı. Müşteride boş (müşterinin adı burada tutulmaz).';
EXEC dbo.AciklamaYaz N'talep', N'OdemeOnayi', N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim (kod.KaynakUygulama).';
EXEC dbo.AciklamaYaz N'talep', N'OdemeOnayi', N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (ör. 0.9.14); bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz N'talep', N'OdemeOnayi', N'OlusmaZamani', @Metin = N'Onayın verildiği an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'OdemeOnayi', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'OdemeOnayi', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
GO

/* ==========================================================================
   talep.ParcaSatiri
   ========================================================================== */
CREATE TABLE talep.ParcaSatiri (
    SiraNo      smallint NOT NULL,
    ParcaAdi    nvarchar(100) COLLATE Turkish_100_CI_AS NOT NULL,
    KatalogDisi bit NOT NULL CONSTRAINT DF_talep_ParcaSatiri_KatalogDisi DEFAULT (0),
    Aciklama    nvarchar(500) COLLATE Turkish_100_CI_AS NULL,
    Adet        int NULL,
    BirimFiyat  decimal(18,2) NULL,
    Tutar       decimal(18,2) NULL,
    TalepKimlik uniqueidentifier NOT NULL,
    MarkaKodu   nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    ParcaKodu   nvarchar(24) COLLATE Latin1_General_100_BIN2 NULL,
    KayitNo     bigint IDENTITY(1,1) NOT NULL,
    Kimlik      uniqueidentifier NOT NULL CONSTRAINT DF_talep_ParcaSatiri_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_talep_ParcaSatiri PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_talep_ParcaSatiri_TalepKimlikSiraNo UNIQUE (TalepKimlik, SiraNo),
    CONSTRAINT FK_talep_ParcaSatiri_talep_Talep FOREIGN KEY (TalepKimlik, MarkaKodu) REFERENCES talep.Talep (Kimlik, MarkaKodu),
    CONSTRAINT FK_talep_ParcaSatiri_katalog_Parca FOREIGN KEY (MarkaKodu, ParcaKodu) REFERENCES katalog.Parca (MarkaKodu, Kod),
    CONSTRAINT CK_talep_ParcaSatiri_SiraNo CHECK (SiraNo >= 1),
    CONSTRAINT CK_talep_ParcaSatiri_KatalogKodu CHECK ((KatalogDisi = 1 AND ParcaKodu IS NULL) OR (KatalogDisi = 0 AND ParcaKodu IS NOT NULL)),
    CONSTRAINT CK_talep_ParcaSatiri_Adet CHECK (Adet IS NULL OR Adet > 0),
    CONSTRAINT CK_talep_ParcaSatiri_AdetBos CHECK (Adet IS NOT NULL OR (KatalogDisi = 1 AND BirimFiyat IS NULL AND Tutar IS NULL)),
    CONSTRAINT CK_talep_ParcaSatiri_BirimFiyat CHECK (BirimFiyat IS NULL OR BirimFiyat >= 0),
    CONSTRAINT CK_talep_ParcaSatiri_Tutar CHECK (Tutar IS NULL OR Tutar >= 0)
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_ParcaSatiri_KayitNo ON talep.ParcaSatiri (KayitNo);
CREATE INDEX IX_talep_ParcaSatiri_TalepKimlikMarkaKodu ON talep.ParcaSatiri (TalepKimlik, MarkaKodu);
CREATE INDEX IX_talep_ParcaSatiri_MarkaKoduParcaKodu ON talep.ParcaSatiri (MarkaKodu, ParcaKodu) WHERE ParcaKodu IS NOT NULL;
GO

EXEC dbo.AciklamaYaz N'talep', N'ParcaSatiri', @Metin = N'Yedek parça talebindeki parça satırları: talep açılırken müşterinin gördüğü kod, ad, adet ve fiyat. Talep eklendikten sonra değişmez.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSatiri', N'SiraNo', @Metin = N'Satırın talep içindeki sırası.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSatiri', N'ParcaAdi', @Metin = N'Parçanın adı (talep açıldığı günkü katalog adı ya da müşterinin yazdığı ad).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSatiri', N'KatalogDisi', @Metin = N'1: parça katalogda yok (''Diğer'' ile istenen parça); bu durumda parça kodu boştur.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSatiri', N'Aciklama', @Metin = N'Müşterinin parça için yazdığı açıklama.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSatiri', N'Adet', @Metin = N'İstenen adet. Yalnız fiyatsız katalog dışı satırda boş olabilir (müşteriye adet sorulmadıysa).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSatiri', N'BirimFiyat', @Metin = N'Talep açıldığı günkü birim fiyat (para birimi ParcaTalebiAyrinti.ParaBirimiKodu kolonunda). Fiyat yoksa boş.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSatiri', N'Tutar', @Metin = N'Satır tutarı (adet × birim fiyat). Fiyat yoksa boş.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSatiri', N'TalepKimlik', @Metin = N'Satırın ait olduğu talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSatiri', N'MarkaKodu', @Metin = N'Parçanın markası; talebin markasıyla aynı olmalı (bir talep tek marka).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSatiri', N'ParcaKodu', @Metin = N'Parçanın katalog kodu (katalog.Parca). Katalog dışı satırda boş.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSatiri', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSatiri', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
GO

/* ==========================================================================
   talep.ServisZiyareti
   ========================================================================== */
CREATE TABLE talep.ServisZiyareti (
    ZiyaretNo            tinyint NOT NULL,
    ArizaMetni           nvarchar(2000) COLLATE Turkish_100_CI_AS NULL,
    SonucMetni           nvarchar(1000) COLLATE Turkish_100_CI_AS NULL,
    Km                   decimal(9,1) NULL,
    IscilikTutari        decimal(18,2) NULL,
    TeknisyenAdi         nvarchar(100) COLLATE Turkish_100_CI_AS NULL,
    TalepKimlik          uniqueidentifier NOT NULL,
    TurKodu              nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UyduKodu             nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT DF_talep_ServisZiyareti_UyduKodu DEFAULT (N'servisZiyareti'),
    MarkaKodu            nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    ServisKimlik         uniqueidentifier NOT NULL,
    AsamaKodu            nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    KapiKodu             nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapilanIsKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    GarantiDayanagiKodu  nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    ParaBirimiKodu       nvarchar(3) COLLATE Latin1_General_100_BIN2 NULL,
    ParcaIstemeZamani    datetime2(3) NULL,
    TamamlanmaZamani     datetime2(3) NULL,
    YapanTuruKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik uniqueidentifier NULL,
    YapanHesapKimlik     uniqueidentifier NULL,
    YapanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu       nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani         datetime2(3) NOT NULL CONSTRAINT DF_talep_ServisZiyareti_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    IstemciOlusmaZamani  datetime2(3) NULL,
    KayitNo              bigint IDENTITY(1,1) NOT NULL,
    Kimlik               uniqueidentifier NOT NULL CONSTRAINT DF_talep_ServisZiyareti_Kimlik DEFAULT NEWID(),
    SatirSurumu          rowversion NOT NULL,
    CONSTRAINT PK_talep_ServisZiyareti PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_talep_ServisZiyareti_TalepKimlikZiyaretNo UNIQUE (TalepKimlik, ZiyaretNo),
    CONSTRAINT UQ_talep_ServisZiyareti_KimlikTalepKimlik UNIQUE (Kimlik, TalepKimlik),
    CONSTRAINT UQ_talep_ServisZiyareti_KimlikTalepKimlikServisKimlik UNIQUE (Kimlik, TalepKimlik, ServisKimlik),
    CONSTRAINT UQ_talep_ServisZiyareti_KimlikKapiKoduAsamaKodu UNIQUE (Kimlik, KapiKodu, AsamaKodu),
    CONSTRAINT UQ_talep_ServisZiyareti_KimlikMarkaKodu UNIQUE (Kimlik, MarkaKodu),
    CONSTRAINT FK_talep_ServisZiyareti_talep_Talep_Servis FOREIGN KEY (TalepKimlik, ServisKimlik) REFERENCES talep.Talep (Kimlik, ServisKimlik),
    CONSTRAINT FK_talep_ServisZiyareti_talep_Talep_Marka FOREIGN KEY (TalepKimlik, MarkaKodu) REFERENCES talep.Talep (Kimlik, MarkaKodu),
    CONSTRAINT FK_talep_ServisZiyareti_kod_ZiyaretAsamasi FOREIGN KEY (AsamaKodu) REFERENCES kod.ZiyaretAsamasi (Kod),
    CONSTRAINT FK_talep_ServisZiyareti_kod_ServisKapisi FOREIGN KEY (KapiKodu) REFERENCES kod.ServisKapisi (Kod),
    CONSTRAINT FK_talep_ServisZiyareti_kod_YapilanIs FOREIGN KEY (YapilanIsKodu) REFERENCES kod.YapilanIs (Kod),
    CONSTRAINT FK_talep_ServisZiyareti_kod_GarantiDayanagi FOREIGN KEY (GarantiDayanagiKodu) REFERENCES kod.GarantiDayanagi (Kod),
    CONSTRAINT FK_talep_ServisZiyareti_kod_ParaBirimi FOREIGN KEY (ParaBirimiKodu) REFERENCES kod.ParaBirimi (Kod),
    CONSTRAINT FK_talep_ServisZiyareti_talep_Talep_Tur FOREIGN KEY (TalepKimlik, TurKodu) REFERENCES talep.Talep (Kimlik, TurKodu),
    CONSTRAINT FK_talep_ServisZiyareti_kod_TalepTuruUydusu FOREIGN KEY (TurKodu, UyduKodu) REFERENCES kod.TalepTuruUydusu (TurKodu, UyduKodu),
    CONSTRAINT FK_talep_ServisZiyareti_kod_AktorTuru FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_talep_ServisZiyareti_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_ServisZiyareti_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_talep_ServisZiyareti_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_talep_ServisZiyareti_ZiyaretNo CHECK (ZiyaretNo >= 1),
    CONSTRAINT CK_talep_ServisZiyareti_YapilanIs CHECK (AsamaKodu <> N'bitti' OR YapilanIsKodu IS NOT NULL),
    CONSTRAINT CK_talep_ServisZiyareti_Km CHECK (Km IS NULL OR Km >= 0),
    CONSTRAINT CK_talep_ServisZiyareti_IscilikTutari CHECK (IscilikTutari IS NULL OR IscilikTutari >= 0),
    CONSTRAINT CK_talep_ServisZiyareti_ParaBirimi CHECK (IscilikTutari IS NULL OR ParaBirimiKodu IS NOT NULL),
    CONSTRAINT CK_talep_ServisZiyareti_UyduKodu CHECK (UyduKodu = N'servisZiyareti'),
    CONSTRAINT CK_talep_ServisZiyareti_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_ServisZiyareti_KayitNo ON talep.ServisZiyareti (KayitNo);
CREATE UNIQUE INDEX UX_talep_ServisZiyareti_ParcaAsamasi ON talep.ServisZiyareti (TalepKimlik) WHERE AsamaKodu = N'parca';
CREATE INDEX IX_talep_ServisZiyareti_ServisKimlikOlusmaZamani ON talep.ServisZiyareti (ServisKimlik, OlusmaZamani);
CREATE INDEX IX_talep_ServisZiyareti_TalepKimlikServisKimlik ON talep.ServisZiyareti (TalepKimlik, ServisKimlik);
CREATE INDEX IX_talep_ServisZiyareti_TalepKimlikTurKodu ON talep.ServisZiyareti (TalepKimlik, TurKodu);
CREATE INDEX IX_talep_ServisZiyareti_TalepKimlikMarkaKodu ON talep.ServisZiyareti (TalepKimlik, MarkaKodu);
CREATE INDEX IX_talep_ServisZiyareti_TurKoduUyduKodu ON talep.ServisZiyareti (TurKodu, UyduKodu);
CREATE INDEX IX_talep_ServisZiyareti_AsamaKodu ON talep.ServisZiyareti (AsamaKodu);
CREATE INDEX IX_talep_ServisZiyareti_KapiKodu ON talep.ServisZiyareti (KapiKodu);
CREATE INDEX IX_talep_ServisZiyareti_YapilanIsKodu ON talep.ServisZiyareti (YapilanIsKodu) WHERE YapilanIsKodu IS NOT NULL;
CREATE INDEX IX_talep_ServisZiyareti_GarantiDayanagiKodu ON talep.ServisZiyareti (GarantiDayanagiKodu) WHERE GarantiDayanagiKodu IS NOT NULL;
CREATE INDEX IX_talep_ServisZiyareti_ParaBirimiKodu ON talep.ServisZiyareti (ParaBirimiKodu) WHERE ParaBirimiKodu IS NOT NULL;
CREATE INDEX IX_talep_ServisZiyareti_YapanTuruKodu ON talep.ServisZiyareti (YapanTuruKodu);
CREATE INDEX IX_talep_ServisZiyareti_YapanKullaniciKimlik ON talep.ServisZiyareti (YapanKullaniciKimlik) WHERE YapanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_ServisZiyareti_YapanHesapKimlik ON talep.ServisZiyareti (YapanHesapKimlik) WHERE YapanHesapKimlik IS NOT NULL;
CREATE INDEX IX_talep_ServisZiyareti_KaynakUygulamaKodu ON talep.ServisZiyareti (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', @Metin = N'Servisin talep için yaptığı saha ziyaretleri (servis kaydı). Garanti işi iki aşamalıdır: parca aşamasında parça istenir; bitti aşamasında yapılan iş, yol ve işçilik yazılır ve hak ediş doğar. Hangi talep türünün ziyaret alabileceği kod.TalepTuruUydusu tablosundadır.';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'ZiyaretNo', @Metin = N'Ziyaretin talep içindeki sırası (1, 2, …).';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'ArizaMetni', @Metin = N'Servisin sahada bulduğu arıza.';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'SonucMetni', @Metin = N'Servisin iş sonunda yazdığı not.';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'Km', @Metin = N'Servisin gidiş-dönüş toplam yol kilometresi. Yol hak edişi bundan ve tarifeden hesaplanır.';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'IscilikTutari', @Metin = N'Servisin yazdığı işçilik tutarı, KDV hariç (para birimi ParaBirimiKodu kolonunda).';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'TeknisyenAdi', @Metin = N'İşi yapan teknisyenin adı (servisin yazdığı).';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'TalepKimlik', @Metin = N'Ziyaretin ait olduğu talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'TurKodu', @Metin = N'Talebin türü. Talebin kendi türüyle aynı olmalı ve bu türün bu kaydı alabildiği kod.TalepTuruUydusu tablosunda yazılı olmalı (yeni tür = kod satırı).';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'UyduKodu', @Metin = N'Sabit değer servisZiyareti. Tür ile bu tablo arasındaki bağı kod.TalepTuruUydusu üzerinden yabancı anahtarla denetlemek içindir.';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'MarkaKodu', @Metin = N'Talebin markası (katalog.Marka); talepteki markayla aynı olmak zorundadır. Ziyaretin parça satırları ve düzeltmeleri bu markayı taşır.';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'ServisKimlik', @Metin = N'Ziyareti yapan servis; talebin servisiyle aynı olmalı.';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'AsamaKodu', @Metin = N'Ziyaretin aşaması (kod.ZiyaretAsamasi): parca (parça istendi, iş bitmedi), bitti ya da yarimKaldi (parça aşamasındaki ziyaret iş bitmeden kapandı: talep iptal edildi ya da parça takılmadan kapandı). Talep başına en çok bir ziyaret parca aşamasında olur; yarımda kalan ziyaret yarimKaldi yapılınca talep yeniden parça isteyebilir. Hak ediş doğduktan sonra değişmez.';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'KapiKodu', @Metin = N'Kaydın kapısı: garanti; eski kayıtlarda eldeParca, parcaIste (kod.ServisKapisi). Hak ediş doğduktan sonra değişmez.';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'YapilanIsKodu', @Metin = N'Sahada yapılan iş: ilkKurulum, ayar, bakim, parcaDegisimi, arizaBulunamadi (kod.YapilanIs). bitti aşamasında zorunlu.';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'GarantiDayanagiKodu', @Metin = N'Ziyaret anında makinenin garanti dayanağı: teslimOnayli, faturaArtiSure, uretimYili, bilinmiyor (kod.GarantiDayanagi).';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'ParaBirimiKodu', @Metin = N'İşçilik ve parça fiyatlarının para birimi (kod.ParaBirimi); işçilik tutarı varsa zorunlu.';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'ParcaIstemeZamani', @Metin = N'Servisin parça istediği an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'TamamlanmaZamani', @Metin = N'Servisin işin bittiğini kaydettiği an (UTC). Hak ediş tarifesi bu anın Türkiye gününe göre seçilir.';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'YapanTuruKodu', @Metin = N'Ziyareti kaydeden tarafın türü: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'YapanKullaniciKimlik', @Metin = N'Ziyareti kaydeden personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'YapanHesapKimlik', @Metin = N'Ziyareti kaydeden müşteri hesabı (musteri.Hesap). Yalnız müşteride dolu.';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'YapanAdi', @Metin = N'Ziyareti kaydeden kişinin o anki adı. Müşteride boş (müşterinin adı burada tutulmaz).';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim (kod.KaynakUygulama).';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (ör. 0.9.14); bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'OlusmaZamani', @Metin = N'Ziyaretin sunucuya yazıldığı an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'IstemciOlusmaZamani', @Metin = N'Kaydın cihazda oluşturulduğu an (UTC, cihaz saati). Yalnız bilgi amaçlı; sunucu saati esastır.';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
EXEC dbo.AciklamaYaz N'talep', N'ServisZiyareti', N'SatirSurumu', @Metin = N'Aynı kaydın iki kişi tarafından aynı anda değiştirilmesini yakalayan sürüm damgası. Veritabanı yazar.';
GO

/* ==========================================================================
   talep.ZiyaretParcaSatiri
   ========================================================================== */
CREATE TABLE talep.ZiyaretParcaSatiri (
    SiraNo        smallint NOT NULL,
    ParcaAdi      nvarchar(100) COLLATE Turkish_100_CI_AS NOT NULL,
    Adet          int NOT NULL,
    BirimFiyat    decimal(18,2) NULL,
    ZiyaretKimlik uniqueidentifier NOT NULL,
    MarkaKodu     nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    ParcaKodu     nvarchar(24) COLLATE Latin1_General_100_BIN2 NULL,
    KayitNo       bigint IDENTITY(1,1) NOT NULL,
    Kimlik        uniqueidentifier NOT NULL CONSTRAINT DF_talep_ZiyaretParcaSatiri_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_talep_ZiyaretParcaSatiri PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_talep_ZiyaretParcaSatiri_ZiyaretKimlikSiraNo UNIQUE (ZiyaretKimlik, SiraNo),
    CONSTRAINT FK_talep_ZiyaretParcaSatiri_talep_ServisZiyareti FOREIGN KEY (ZiyaretKimlik, MarkaKodu) REFERENCES talep.ServisZiyareti (Kimlik, MarkaKodu),
    CONSTRAINT FK_talep_ZiyaretParcaSatiri_katalog_Parca FOREIGN KEY (MarkaKodu, ParcaKodu) REFERENCES katalog.Parca (MarkaKodu, Kod),
    CONSTRAINT CK_talep_ZiyaretParcaSatiri_SiraNo CHECK (SiraNo >= 1),
    CONSTRAINT CK_talep_ZiyaretParcaSatiri_Adet CHECK (Adet > 0),
    CONSTRAINT CK_talep_ZiyaretParcaSatiri_BirimFiyat CHECK (BirimFiyat IS NULL OR BirimFiyat >= 0)
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_ZiyaretParcaSatiri_KayitNo ON talep.ZiyaretParcaSatiri (KayitNo);
CREATE INDEX IX_talep_ZiyaretParcaSatiri_ZiyaretKimlikMarkaKodu ON talep.ZiyaretParcaSatiri (ZiyaretKimlik, MarkaKodu);
CREATE INDEX IX_talep_ZiyaretParcaSatiri_MarkaKoduParcaKodu ON talep.ZiyaretParcaSatiri (MarkaKodu, ParcaKodu) WHERE ParcaKodu IS NOT NULL;
GO

EXEC dbo.AciklamaYaz N'talep', N'ZiyaretParcaSatiri', @Metin = N'Servisin ziyarette gönderdiği parça listesi. Hiç değişmez; PAKSAN düzeltmesinden sonraki güncel liste talep.ZiyaretGuncelParcasi görünümündedir.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretParcaSatiri', N'SiraNo', @Metin = N'Satırın ziyaret içindeki sırası.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretParcaSatiri', N'ParcaAdi', @Metin = N'Parçanın adı (servisin gönderdiği anda).';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretParcaSatiri', N'Adet', @Metin = N'Adet (1 ya da fazla).';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretParcaSatiri', N'BirimFiyat', @Metin = N'O günkü birim fiyat (para birimi ziyaretin ParaBirimiKodu kolonunda). Fiyat yoksa boş.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretParcaSatiri', N'ZiyaretKimlik', @Metin = N'Parçanın istendiği ziyaret (talep.ServisZiyareti).';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretParcaSatiri', N'MarkaKodu', @Metin = N'Parçanın markası; ziyaretin, dolayısıyla talebin markasıyla aynı olmak zorundadır (katalog.Marka). Katalog dışı satırda da denetlenir.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretParcaSatiri', N'ParcaKodu', @Metin = N'Parçanın katalog kodu (katalog.Parca). Katalogda yoksa boş.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretParcaSatiri', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretParcaSatiri', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
GO

/* ==========================================================================
   talep.ZiyaretFotografi
   ========================================================================== */
CREATE TABLE talep.ZiyaretFotografi (
    SiraNo        tinyint NOT NULL,
    ZiyaretKimlik uniqueidentifier NOT NULL,
    DosyaKimlik   uniqueidentifier NOT NULL,
    CONSTRAINT PK_talep_ZiyaretFotografi PRIMARY KEY CLUSTERED (ZiyaretKimlik, DosyaKimlik),
    CONSTRAINT UQ_talep_ZiyaretFotografi_ZiyaretKimlikSiraNo UNIQUE (ZiyaretKimlik, SiraNo),
    CONSTRAINT FK_talep_ZiyaretFotografi_talep_ServisZiyareti FOREIGN KEY (ZiyaretKimlik) REFERENCES talep.ServisZiyareti (Kimlik),
    CONSTRAINT FK_talep_ZiyaretFotografi_dosya_Dosya FOREIGN KEY (DosyaKimlik) REFERENCES dosya.Dosya (Kimlik)
);
GO

CREATE INDEX IX_talep_ZiyaretFotografi_DosyaKimlik ON talep.ZiyaretFotografi (DosyaKimlik);
GO

EXEC dbo.AciklamaYaz N'talep', N'ZiyaretFotografi', @Metin = N'Servisin ziyarette çektiği fotoğraflar. Garanti kararında bakılan kanıttır.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretFotografi', N'SiraNo', @Metin = N'Fotoğrafın ziyaret içindeki sırası.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretFotografi', N'ZiyaretKimlik', @Metin = N'Fotoğrafın çekildiği ziyaret (talep.ServisZiyareti).';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretFotografi', N'DosyaKimlik', @Metin = N'Fotoğrafın dosyası (dosya.Dosya).';
GO

/* ==========================================================================
   talep.ZiyaretDuzeltmesi
   ========================================================================== */
CREATE TABLE talep.ZiyaretDuzeltmesi (
    Neden                nvarchar(500) COLLATE Turkish_100_CI_AS NOT NULL,
    OncekiKm             decimal(9,1) NULL,
    YeniKm               decimal(9,1) NULL,
    OncekiIscilikTutari  decimal(18,2) NULL,
    YeniIscilikTutari    decimal(18,2) NULL,
    ZiyaretKimlik        uniqueidentifier NOT NULL,
    MarkaKodu            nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanTuruKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik uniqueidentifier NULL,
    YapanHesapKimlik     uniqueidentifier NULL,
    YapanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu       nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani         datetime2(3) NOT NULL CONSTRAINT DF_talep_ZiyaretDuzeltmesi_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo              bigint IDENTITY(1,1) NOT NULL,
    Kimlik               uniqueidentifier NOT NULL CONSTRAINT DF_talep_ZiyaretDuzeltmesi_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_talep_ZiyaretDuzeltmesi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_talep_ZiyaretDuzeltmesi_KimlikMarkaKodu UNIQUE (Kimlik, MarkaKodu),
    CONSTRAINT FK_talep_ZiyaretDuzeltmesi_talep_ServisZiyareti FOREIGN KEY (ZiyaretKimlik, MarkaKodu) REFERENCES talep.ServisZiyareti (Kimlik, MarkaKodu),
    CONSTRAINT FK_talep_ZiyaretDuzeltmesi_kod_AktorTuru FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_talep_ZiyaretDuzeltmesi_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_ZiyaretDuzeltmesi_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_talep_ZiyaretDuzeltmesi_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_talep_ZiyaretDuzeltmesi_OncekiKm CHECK (OncekiKm IS NULL OR OncekiKm >= 0),
    CONSTRAINT CK_talep_ZiyaretDuzeltmesi_YeniKm CHECK (YeniKm IS NULL OR YeniKm >= 0),
    CONSTRAINT CK_talep_ZiyaretDuzeltmesi_OncekiIscilikTutari CHECK (OncekiIscilikTutari IS NULL OR OncekiIscilikTutari >= 0),
    CONSTRAINT CK_talep_ZiyaretDuzeltmesi_YeniIscilikTutari CHECK (YeniIscilikTutari IS NULL OR YeniIscilikTutari >= 0),
    CONSTRAINT CK_talep_ZiyaretDuzeltmesi_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_ZiyaretDuzeltmesi_KayitNo ON talep.ZiyaretDuzeltmesi (KayitNo);
CREATE INDEX IX_talep_ZiyaretDuzeltmesi_ZiyaretKimlikKayitNo ON talep.ZiyaretDuzeltmesi (ZiyaretKimlik, KayitNo);
CREATE INDEX IX_talep_ZiyaretDuzeltmesi_ZiyaretKimlikMarkaKodu ON talep.ZiyaretDuzeltmesi (ZiyaretKimlik, MarkaKodu);
CREATE INDEX IX_talep_ZiyaretDuzeltmesi_YapanTuruKodu ON talep.ZiyaretDuzeltmesi (YapanTuruKodu);
CREATE INDEX IX_talep_ZiyaretDuzeltmesi_YapanKullaniciKimlik ON talep.ZiyaretDuzeltmesi (YapanKullaniciKimlik) WHERE YapanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_ZiyaretDuzeltmesi_YapanHesapKimlik ON talep.ZiyaretDuzeltmesi (YapanHesapKimlik) WHERE YapanHesapKimlik IS NOT NULL;
CREATE INDEX IX_talep_ZiyaretDuzeltmesi_KaynakUygulamaKodu ON talep.ZiyaretDuzeltmesi (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesi', @Metin = N'PAKSAN''ın servis kaydında yaptığı düzeltmeler (km, işçilik, parçalar), gerekçesiyle. Servis de görür. Yalnız eklenir; en son düzeltme ziyaretin en büyük KayitNo''lu satırıdır.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesi', N'Neden', @Metin = N'Düzeltmenin gerekçesi (servis görür).';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesi', N'OncekiKm', @Metin = N'Düzeltmeden önceki kilometre; km değişmediyse boş.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesi', N'YeniKm', @Metin = N'Düzeltmeden sonraki kilometre; km değişmediyse boş.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesi', N'OncekiIscilikTutari', @Metin = N'Düzeltmeden önceki işçilik tutarı (ziyaretin para biriminde); değişmediyse boş.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesi', N'YeniIscilikTutari', @Metin = N'Düzeltmeden sonraki işçilik tutarı (ziyaretin para biriminde); değişmediyse boş.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesi', N'ZiyaretKimlik', @Metin = N'Düzeltilen ziyaret (talep.ServisZiyareti).';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesi', N'MarkaKodu', @Metin = N'Düzeltilen ziyaretin markası; ziyaretteki markayla aynı olmak zorundadır (katalog.Marka). Düzeltmenin parça satırları bu markayı taşır.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesi', N'YapanTuruKodu', @Metin = N'Düzeltmeyi yapan tarafın türü: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesi', N'YapanKullaniciKimlik', @Metin = N'Düzeltmeyi yapan personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesi', N'YapanHesapKimlik', @Metin = N'Düzeltmeyi yapan müşteri hesabı (musteri.Hesap). Yalnız müşteride dolu.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesi', N'YapanAdi', @Metin = N'Düzeltmeyi yapan kişinin o anki adı. Müşteride boş (müşterinin adı burada tutulmaz).';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesi', N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim (kod.KaynakUygulama).';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesi', N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (ör. 0.9.14); bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesi', N'OlusmaZamani', @Metin = N'Düzeltmenin yapıldığı an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesi', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesi', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
GO

/* ==========================================================================
   talep.ZiyaretDuzeltmesiParcasi
   ========================================================================== */
CREATE TABLE talep.ZiyaretDuzeltmesiParcasi (
    SiraNo         smallint NOT NULL,
    ParcaAdi       nvarchar(100) COLLATE Turkish_100_CI_AS NOT NULL,
    Adet           int NOT NULL,
    BirimFiyat     decimal(18,2) NULL,
    DuzeltmeKimlik uniqueidentifier NOT NULL,
    TarafKodu      nvarchar(10) COLLATE Latin1_General_100_BIN2 NOT NULL,
    MarkaKodu      nvarchar(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
    ParcaKodu      nvarchar(24) COLLATE Latin1_General_100_BIN2 NULL,
    KayitNo        bigint IDENTITY(1,1) NOT NULL,
    Kimlik         uniqueidentifier NOT NULL CONSTRAINT DF_talep_ZiyaretDuzeltmesiParcasi_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_talep_ZiyaretDuzeltmesiParcasi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT UQ_talep_ZiyaretDuzeltmesiParcasi_DuzeltmeKimlikTarafKoduSiraNo UNIQUE (DuzeltmeKimlik, TarafKodu, SiraNo),
    CONSTRAINT FK_talep_ZiyaretDuzeltmesiParcasi_talep_ZiyaretDuzeltmesi FOREIGN KEY (DuzeltmeKimlik, MarkaKodu) REFERENCES talep.ZiyaretDuzeltmesi (Kimlik, MarkaKodu),
    CONSTRAINT FK_talep_ZiyaretDuzeltmesiParcasi_katalog_Parca FOREIGN KEY (MarkaKodu, ParcaKodu) REFERENCES katalog.Parca (MarkaKodu, Kod),
    CONSTRAINT CK_talep_ZiyaretDuzeltmesiParcasi_TarafKodu CHECK (TarafKodu IN (N'onceki', N'yeni')),
    CONSTRAINT CK_talep_ZiyaretDuzeltmesiParcasi_SiraNo CHECK (SiraNo >= 1),
    CONSTRAINT CK_talep_ZiyaretDuzeltmesiParcasi_Adet CHECK (Adet > 0),
    CONSTRAINT CK_talep_ZiyaretDuzeltmesiParcasi_BirimFiyat CHECK (BirimFiyat IS NULL OR BirimFiyat >= 0)
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_ZiyaretDuzeltmesiParcasi_KayitNo ON talep.ZiyaretDuzeltmesiParcasi (KayitNo);
CREATE INDEX IX_talep_ZiyaretDuzeltmesiParcasi_DuzeltmeKimlikMarkaKodu ON talep.ZiyaretDuzeltmesiParcasi (DuzeltmeKimlik, MarkaKodu);
CREATE INDEX IX_talep_ZiyaretDuzeltmesiParcasi_MarkaKoduParcaKodu ON talep.ZiyaretDuzeltmesiParcasi (MarkaKodu, ParcaKodu) WHERE ParcaKodu IS NOT NULL;
GO

EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesiParcasi', @Metin = N'Düzeltmedeki parça listeleri: onceki tarafı düzeltmeden önceki liste, yeni tarafı düzeltmeden sonraki liste. Düzeltmede çıkarılan parça yeni tarafta yer almaz.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesiParcasi', N'SiraNo', @Metin = N'Satırın kendi tarafındaki sırası.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesiParcasi', N'ParcaAdi', @Metin = N'Parçanın adı.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesiParcasi', N'Adet', @Metin = N'Adet (1 ya da fazla).';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesiParcasi', N'BirimFiyat', @Metin = N'Birim fiyat (ziyaretin para biriminde). Fiyat yoksa boş.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesiParcasi', N'DuzeltmeKimlik', @Metin = N'Satırın ait olduğu düzeltme (talep.ZiyaretDuzeltmesi).';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesiParcasi', N'TarafKodu', @Metin = N'Satırın hangi listeye ait olduğu: onceki (düzeltmeden önce) ya da yeni (düzeltmeden sonra).';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesiParcasi', N'MarkaKodu', @Metin = N'Parçanın markası; düzeltmenin, dolayısıyla ziyaretin ve talebin markasıyla aynı olmak zorundadır (katalog.Marka). Katalog dışı satırda da denetlenir.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesiParcasi', N'ParcaKodu', @Metin = N'Parçanın katalog kodu (katalog.Parca). Katalogda yoksa boş.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesiParcasi', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'ZiyaretDuzeltmesiParcasi', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
GO

/* ==========================================================================
   talep.Kapanis
   ========================================================================== */
CREATE TABLE talep.Kapanis (
    YapilanIsMetni        nvarchar(2000) COLLATE Turkish_100_CI_AS NULL,
    DegisenParcalarMetni  nvarchar(1000) COLLATE Turkish_100_CI_AS NULL,
    UcretTutari           decimal(18,2) NULL,
    SatisFiyati           decimal(18,2) NULL,
    KapanisNotu           nvarchar(2000) COLLATE Turkish_100_CI_AS NULL,
    TalepKimlik           uniqueidentifier NOT NULL,
    KapanisTuruKodu       nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapilanIsKodu         nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    UcretDurumuKodu       nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    ParaBirimiKodu        nvarchar(3) COLLATE Latin1_General_100_BIN2 NULL,
    TeklifSonucuKodu      nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    FiyatZorunlu          bit NULL,
    ServisFisiDosyaKimlik uniqueidentifier NULL,
    ZiyaretKimlik         uniqueidentifier NULL,
    YapanTuruKodu         nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik  uniqueidentifier NULL,
    YapanHesapKimlik      uniqueidentifier NULL,
    YapanAdi              nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu    nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu        nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani          datetime2(3) NOT NULL CONSTRAINT DF_talep_Kapanis_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo               bigint IDENTITY(1,1) NOT NULL,
    Kimlik                uniqueidentifier NOT NULL CONSTRAINT DF_talep_Kapanis_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_talep_Kapanis PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_talep_Kapanis_talep_Talep FOREIGN KEY (TalepKimlik) REFERENCES talep.Talep (Kimlik),
    CONSTRAINT FK_talep_Kapanis_kod_KapanisTuru FOREIGN KEY (KapanisTuruKodu) REFERENCES kod.KapanisTuru (Kod),
    CONSTRAINT FK_talep_Kapanis_kod_YapilanIs FOREIGN KEY (YapilanIsKodu) REFERENCES kod.YapilanIs (Kod),
    CONSTRAINT FK_talep_Kapanis_kod_UcretDurumu FOREIGN KEY (UcretDurumuKodu) REFERENCES kod.UcretDurumu (Kod),
    CONSTRAINT FK_talep_Kapanis_kod_ParaBirimi FOREIGN KEY (ParaBirimiKodu) REFERENCES kod.ParaBirimi (Kod),
    CONSTRAINT FK_talep_Kapanis_kod_TeklifSonucu FOREIGN KEY (TeklifSonucuKodu, FiyatZorunlu) REFERENCES kod.TeklifSonucu (Kod, FiyatZorunlu),
    CONSTRAINT FK_talep_Kapanis_dosya_Dosya_ServisFisi FOREIGN KEY (ServisFisiDosyaKimlik) REFERENCES dosya.Dosya (Kimlik),
    CONSTRAINT FK_talep_Kapanis_talep_ServisZiyareti FOREIGN KEY (ZiyaretKimlik, TalepKimlik) REFERENCES talep.ServisZiyareti (Kimlik, TalepKimlik),
    CONSTRAINT FK_talep_Kapanis_kod_AktorTuru FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_talep_Kapanis_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_Kapanis_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_talep_Kapanis_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_talep_Kapanis_TeklifSonucu CHECK ((TeklifSonucuKodu IS NULL AND FiyatZorunlu IS NULL) OR (TeklifSonucuKodu IS NOT NULL AND FiyatZorunlu IS NOT NULL)),
    CONSTRAINT CK_talep_Kapanis_FiyatZorunlu CHECK (FiyatZorunlu IS NULL OR FiyatZorunlu = 0 OR SatisFiyati IS NOT NULL),
    CONSTRAINT CK_talep_Kapanis_UcretTutari CHECK (UcretTutari IS NULL OR UcretTutari >= 0),
    CONSTRAINT CK_talep_Kapanis_SatisFiyati CHECK (SatisFiyati IS NULL OR SatisFiyati >= 0),
    CONSTRAINT CK_talep_Kapanis_ParaBirimi CHECK ((UcretTutari IS NULL AND SatisFiyati IS NULL) OR ParaBirimiKodu IS NOT NULL),
    CONSTRAINT CK_talep_Kapanis_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_Kapanis_KayitNo ON talep.Kapanis (KayitNo);
CREATE INDEX IX_talep_Kapanis_TalepKimlikOlusmaZamani ON talep.Kapanis (TalepKimlik, OlusmaZamani);
CREATE INDEX IX_talep_Kapanis_TeklifSonucuKoduFiyatZorunlu ON talep.Kapanis (TeklifSonucuKodu, FiyatZorunlu) WHERE TeklifSonucuKodu IS NOT NULL;
CREATE INDEX IX_talep_Kapanis_ZiyaretKimlikTalepKimlik ON talep.Kapanis (ZiyaretKimlik, TalepKimlik) WHERE ZiyaretKimlik IS NOT NULL;
CREATE INDEX IX_talep_Kapanis_KapanisTuruKodu ON talep.Kapanis (KapanisTuruKodu);
CREATE INDEX IX_talep_Kapanis_YapilanIsKodu ON talep.Kapanis (YapilanIsKodu) WHERE YapilanIsKodu IS NOT NULL;
CREATE INDEX IX_talep_Kapanis_UcretDurumuKodu ON talep.Kapanis (UcretDurumuKodu) WHERE UcretDurumuKodu IS NOT NULL;
CREATE INDEX IX_talep_Kapanis_ParaBirimiKodu ON talep.Kapanis (ParaBirimiKodu) WHERE ParaBirimiKodu IS NOT NULL;
CREATE INDEX IX_talep_Kapanis_ServisFisiDosyaKimlik ON talep.Kapanis (ServisFisiDosyaKimlik) WHERE ServisFisiDosyaKimlik IS NOT NULL;
CREATE INDEX IX_talep_Kapanis_YapanTuruKodu ON talep.Kapanis (YapanTuruKodu);
CREATE INDEX IX_talep_Kapanis_YapanKullaniciKimlik ON talep.Kapanis (YapanKullaniciKimlik) WHERE YapanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_Kapanis_YapanHesapKimlik ON talep.Kapanis (YapanHesapKimlik) WHERE YapanHesapKimlik IS NOT NULL;
CREATE INDEX IX_talep_Kapanis_KaynakUygulamaKodu ON talep.Kapanis (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'Kapanis', @Metin = N'Talebin kapanış kayıtları: nasıl kapandığı, yapılan iş, ücret, teklif sonucu. Talep her kapandığında yeni satır yazılır; yeniden açılıp tekrar kapanan talepte önceki kapanış kalır. Yalnız eklenir.';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'YapilanIsMetni', @Metin = N'Yapılan işin yazılı hâli (eski kayıtlarda serbest metin). Anonimleştirmede sabit metinle değiştirilir.';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'DegisenParcalarMetni', @Metin = N'Değişen parçaların yazılı özeti.';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'UcretTutari', @Metin = N'Müşterinin ödediği ücret (para birimi ParaBirimiKodu kolonunda).';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'SatisFiyati', @Metin = N'Teklif satışla sonuçlandıysa satış fiyatı (para birimi ParaBirimiKodu kolonunda). Teklif sonucunun fiyat istediği durumda zorunlu.';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'KapanisNotu', @Metin = N'Kapanış notu. Anonimleştirmede sabit metinle değiştirilir.';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'TalepKimlik', @Metin = N'Kapanan talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'KapanisTuruKodu', @Metin = N'Kapanışın türü: personelFormu, servisKaydi, garantiDisi, parcaTakildi, bayiAtamasi, hakEdisOnayi, hakEdisReddi (kod.KapanisTuru).';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'YapilanIsKodu', @Metin = N'Yapılan iş (kod.YapilanIs).';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'UcretDurumuKodu', @Metin = N'Ücretin durumu: garanti, musteriOdedi (kod.UcretDurumu).';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'ParaBirimiKodu', @Metin = N'Ücret ve satış fiyatının para birimi (kod.ParaBirimi); tutar varsa zorunlu.';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'TeklifSonucuKodu', @Metin = N'Fiyat teklifinin sonucu: satisOldu, musteriVazgecti, rakibeGitti, ulasilamadi (kod.TeklifSonucu).';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'FiyatZorunlu', @Metin = N'Teklif sonucunun satış fiyatı isteyip istemediği; kod.TeklifSonucu tablosundaki değerin kopyasıdır. Teklif sonucu yoksa boş.';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'ServisFisiDosyaKimlik', @Metin = N'Servis fişinin fotoğrafı ya da dosyası (dosya.Dosya).';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'ZiyaretKimlik', @Metin = N'Kapanışın dayandığı servis ziyareti (talep.ServisZiyareti); aynı talebin ziyareti olmalı.';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'YapanTuruKodu', @Metin = N'Talebi kapatan tarafın türü: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'YapanKullaniciKimlik', @Metin = N'Talebi kapatan personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'YapanHesapKimlik', @Metin = N'Talebi kapatan müşteri hesabı (musteri.Hesap). Yalnız müşteride dolu.';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'YapanAdi', @Metin = N'Talebi kapatan kişinin o anki adı. Müşteride boş (müşterinin adı burada tutulmaz).';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim (kod.KaynakUygulama).';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (ör. 0.9.14); bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'OlusmaZamani', @Metin = N'Kapanışın kaydedildiği an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'Kapanis', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
GO

/* ==========================================================================
   talep.ParcaSevki
   ========================================================================== */
CREATE TABLE talep.ParcaSevki (
    KargoFirmasiMetni          nvarchar(100) COLLATE Turkish_100_CI_AS NULL,
    TakipNo                    nvarchar(50) COLLATE Latin1_General_100_BIN2 NULL,
    TalepKimlik                uniqueidentifier NOT NULL,
    TurKodu                    nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    ZiyaretKimlik              uniqueidentifier NULL,
    KargoFirmasiKodu           nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    GuncelleyenKullaniciKimlik uniqueidentifier NULL,
    BelgeBagiKimlik            uniqueidentifier NULL,
    SevkZamani                 datetime2(3) NOT NULL CONSTRAINT DF_talep_ParcaSevki_SevkZamani DEFAULT SYSUTCDATETIME(),
    SonGuncellemeZamani        datetime2(3) NULL,
    GuncelleyenAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    YapanTuruKodu              nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik       uniqueidentifier NULL,
    YapanHesapKimlik           uniqueidentifier NULL,
    YapanAdi                   nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu         nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu             nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    KayitNo                    bigint IDENTITY(1,1) NOT NULL,
    Kimlik                     uniqueidentifier NOT NULL CONSTRAINT DF_talep_ParcaSevki_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_talep_ParcaSevki PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_talep_ParcaSevki_talep_Talep FOREIGN KEY (TalepKimlik, TurKodu) REFERENCES talep.Talep (Kimlik, TurKodu),
    CONSTRAINT FK_talep_ParcaSevki_talep_ServisZiyareti FOREIGN KEY (ZiyaretKimlik, TalepKimlik) REFERENCES talep.ServisZiyareti (Kimlik, TalepKimlik),
    CONSTRAINT FK_talep_ParcaSevki_kod_KargoFirmasi FOREIGN KEY (KargoFirmasiKodu) REFERENCES kod.KargoFirmasi (Kod),
    CONSTRAINT FK_talep_ParcaSevki_erisim_Kullanici_Guncelleyen FOREIGN KEY (GuncelleyenKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_ParcaSevki_entegrasyon_BelgeBagi FOREIGN KEY (BelgeBagiKimlik) REFERENCES entegrasyon.BelgeBagi (Kimlik),
    CONSTRAINT FK_talep_ParcaSevki_kod_AktorTuru FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_talep_ParcaSevki_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_ParcaSevki_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_talep_ParcaSevki_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_talep_ParcaSevki_ServisZiyaret CHECK (TurKodu <> N'servis' OR ZiyaretKimlik IS NOT NULL),
    CONSTRAINT CK_talep_ParcaSevki_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_ParcaSevki_KayitNo ON talep.ParcaSevki (KayitNo);
CREATE UNIQUE INDEX UX_talep_ParcaSevki_Ziyaret ON talep.ParcaSevki (ZiyaretKimlik) WHERE ZiyaretKimlik IS NOT NULL;
CREATE INDEX IX_talep_ParcaSevki_TakipNo ON talep.ParcaSevki (TakipNo) WHERE TakipNo IS NOT NULL;
CREATE INDEX IX_talep_ParcaSevki_TalepKimlikTurKodu ON talep.ParcaSevki (TalepKimlik, TurKodu);
CREATE INDEX IX_talep_ParcaSevki_ZiyaretKimlikTalepKimlik ON talep.ParcaSevki (ZiyaretKimlik, TalepKimlik) WHERE ZiyaretKimlik IS NOT NULL;
CREATE INDEX IX_talep_ParcaSevki_KargoFirmasiKodu ON talep.ParcaSevki (KargoFirmasiKodu) WHERE KargoFirmasiKodu IS NOT NULL;
CREATE INDEX IX_talep_ParcaSevki_GuncelleyenKullaniciKimlik ON talep.ParcaSevki (GuncelleyenKullaniciKimlik) WHERE GuncelleyenKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_ParcaSevki_BelgeBagiKimlik ON talep.ParcaSevki (BelgeBagiKimlik) WHERE BelgeBagiKimlik IS NOT NULL;
CREATE INDEX IX_talep_ParcaSevki_YapanTuruKodu ON talep.ParcaSevki (YapanTuruKodu);
CREATE INDEX IX_talep_ParcaSevki_YapanKullaniciKimlik ON talep.ParcaSevki (YapanKullaniciKimlik) WHERE YapanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_ParcaSevki_YapanHesapKimlik ON talep.ParcaSevki (YapanHesapKimlik) WHERE YapanHesapKimlik IS NOT NULL;
CREATE INDEX IX_talep_ParcaSevki_KaynakUygulamaKodu ON talep.ParcaSevki (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', @Metin = N'Parça gönderimi (kargo) kayıtları. Servis talebinde sevk bir ziyarete bağlıdır ve bir ziyarete en çok bir sevk olur; aynı ziyarete ikinci gönderimde yeni satır açılmaz, satır güncellenir. Güncel sevk, talebin son ziyaretininkidir.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'KargoFirmasiMetni', @Metin = N'Kargo firması listede yoksa yazılan adı.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'TakipNo', @Metin = N'Kargo takip numarası.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'TalepKimlik', @Metin = N'Parçanın gönderildiği talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'TurKodu', @Metin = N'Talebin türü; talebin kendi türüyle aynı olmalı. Servis talebinde sevk bir ziyarete bağlanmak zorundadır.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'ZiyaretKimlik', @Metin = N'Parçanın gönderildiği servis ziyareti (talep.ServisZiyareti); aynı talebin ziyareti olmalı. Servis talebinde zorunlu.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'KargoFirmasiKodu', @Metin = N'Kargo firması (kod.KargoFirmasi).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'GuncelleyenKullaniciKimlik', @Metin = N'Sevk bilgisini son güncelleyen personel (erisim.Kullanici).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'BelgeBagiKimlik', @Metin = N'Sevkin dış sistemdeki belgesi, ör. irsaliye ya da fatura (entegrasyon.BelgeBagi).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'SevkZamani', @Metin = N'Parçanın gönderildiği an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'SonGuncellemeZamani', @Metin = N'Sevk bilgisinin son güncellendiği an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'GuncelleyenAdi', @Metin = N'Sevk bilgisini son güncelleyen personelin o anki adı.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'YapanTuruKodu', @Metin = N'Sevki kaydeden tarafın türü: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'YapanKullaniciKimlik', @Metin = N'Sevki kaydeden personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'YapanHesapKimlik', @Metin = N'Sevki kaydeden müşteri hesabı (musteri.Hesap). Yalnız müşteride dolu.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'YapanAdi', @Metin = N'Sevki kaydeden kişinin o anki adı. Müşteride boş (müşterinin adı burada tutulmaz).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim (kod.KaynakUygulama).';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (ör. 0.9.14); bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'ParcaSevki', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
GO

/* ==========================================================================
   talep.BayiAtamasi
   ========================================================================== */
CREATE TABLE talep.BayiAtamasi (
    TalepKimlik             uniqueidentifier NOT NULL,
    TurKodu                 nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UyduKodu                nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT DF_talep_BayiAtamasi_UyduKodu DEFAULT (N'bayiAtamasi'),
    BayiKimlik              uniqueidentifier NOT NULL,
    KaldiranKullaniciKimlik uniqueidentifier NULL,
    KaldirilmaZamani        datetime2(3) NULL,
    KaldiranAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    YapanTuruKodu           nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik    uniqueidentifier NULL,
    YapanHesapKimlik        uniqueidentifier NULL,
    YapanAdi                nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu      nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu          nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani            datetime2(3) NOT NULL CONSTRAINT DF_talep_BayiAtamasi_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo                 bigint IDENTITY(1,1) NOT NULL,
    Kimlik                  uniqueidentifier NOT NULL CONSTRAINT DF_talep_BayiAtamasi_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_talep_BayiAtamasi PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_talep_BayiAtamasi_bayi_Bayi FOREIGN KEY (BayiKimlik) REFERENCES bayi.Bayi (Kimlik),
    CONSTRAINT FK_talep_BayiAtamasi_erisim_Kullanici_Kaldiran FOREIGN KEY (KaldiranKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_BayiAtamasi_talep_Talep FOREIGN KEY (TalepKimlik, TurKodu) REFERENCES talep.Talep (Kimlik, TurKodu),
    CONSTRAINT FK_talep_BayiAtamasi_kod_TalepTuruUydusu FOREIGN KEY (TurKodu, UyduKodu) REFERENCES kod.TalepTuruUydusu (TurKodu, UyduKodu),
    CONSTRAINT FK_talep_BayiAtamasi_kod_AktorTuru FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_talep_BayiAtamasi_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_BayiAtamasi_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_talep_BayiAtamasi_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_talep_BayiAtamasi_Kaldirma CHECK (KaldirilmaZamani IS NOT NULL OR (KaldiranKullaniciKimlik IS NULL AND KaldiranAdi IS NULL)),
    CONSTRAINT CK_talep_BayiAtamasi_UyduKodu CHECK (UyduKodu = N'bayiAtamasi'),
    CONSTRAINT CK_talep_BayiAtamasi_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_BayiAtamasi_KayitNo ON talep.BayiAtamasi (KayitNo);
CREATE UNIQUE INDEX UX_talep_BayiAtamasi_Etkin ON talep.BayiAtamasi (TalepKimlik) WHERE KaldirilmaZamani IS NULL;
CREATE INDEX IX_talep_BayiAtamasi_BayiKimlikOlusmaZamani ON talep.BayiAtamasi (BayiKimlik, OlusmaZamani);
CREATE INDEX IX_talep_BayiAtamasi_TalepKimlikTurKodu ON talep.BayiAtamasi (TalepKimlik, TurKodu);
CREATE INDEX IX_talep_BayiAtamasi_TurKoduUyduKodu ON talep.BayiAtamasi (TurKodu, UyduKodu);
CREATE INDEX IX_talep_BayiAtamasi_KaldiranKullaniciKimlik ON talep.BayiAtamasi (KaldiranKullaniciKimlik) WHERE KaldiranKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_BayiAtamasi_YapanTuruKodu ON talep.BayiAtamasi (YapanTuruKodu);
CREATE INDEX IX_talep_BayiAtamasi_YapanKullaniciKimlik ON talep.BayiAtamasi (YapanKullaniciKimlik) WHERE YapanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_BayiAtamasi_YapanHesapKimlik ON talep.BayiAtamasi (YapanHesapKimlik) WHERE YapanHesapKimlik IS NOT NULL;
CREATE INDEX IX_talep_BayiAtamasi_KaynakUygulamaKodu ON talep.BayiAtamasi (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'BayiAtamasi', @Metin = N'Talebin bayiye atanması (fiyat teklifi bayiye gider). Talep başına en çok bir etkin atama olur; kaldırılan atama silinmez. Hangi talep türünün bayiye atanabileceği kod.TalepTuruUydusu tablosundadır.';
EXEC dbo.AciklamaYaz N'talep', N'BayiAtamasi', N'TalepKimlik', @Metin = N'Atamanın ait olduğu talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'BayiAtamasi', N'TurKodu', @Metin = N'Talebin türü. Talebin kendi türüyle aynı olmalı ve bu türün bu kaydı alabildiği kod.TalepTuruUydusu tablosunda yazılı olmalı (yeni tür = kod satırı).';
EXEC dbo.AciklamaYaz N'talep', N'BayiAtamasi', N'UyduKodu', @Metin = N'Sabit değer bayiAtamasi. Tür ile bu tablo arasındaki bağı kod.TalepTuruUydusu üzerinden yabancı anahtarla denetlemek içindir.';
EXEC dbo.AciklamaYaz N'talep', N'BayiAtamasi', N'BayiKimlik', @Metin = N'Talebin atandığı bayi (bayi.Bayi).';
EXEC dbo.AciklamaYaz N'talep', N'BayiAtamasi', N'KaldiranKullaniciKimlik', @Metin = N'Atamayı kaldıran personel (erisim.Kullanici).';
EXEC dbo.AciklamaYaz N'talep', N'BayiAtamasi', N'KaldirilmaZamani', @Metin = N'Atamanın kaldırıldığı an (UTC). Etkin atamada boş.';
EXEC dbo.AciklamaYaz N'talep', N'BayiAtamasi', N'KaldiranAdi', @Metin = N'Atamayı kaldıran personelin o anki adı.';
EXEC dbo.AciklamaYaz N'talep', N'BayiAtamasi', N'YapanTuruKodu', @Metin = N'Atamayı yapan tarafın türü: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz N'talep', N'BayiAtamasi', N'YapanKullaniciKimlik', @Metin = N'Atamayı yapan personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz N'talep', N'BayiAtamasi', N'YapanHesapKimlik', @Metin = N'Atamayı yapan müşteri hesabı (musteri.Hesap). Yalnız müşteride dolu.';
EXEC dbo.AciklamaYaz N'talep', N'BayiAtamasi', N'YapanAdi', @Metin = N'Atamayı yapan kişinin o anki adı. Müşteride boş (müşterinin adı burada tutulmaz).';
EXEC dbo.AciklamaYaz N'talep', N'BayiAtamasi', N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim (kod.KaynakUygulama).';
EXEC dbo.AciklamaYaz N'talep', N'BayiAtamasi', N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (ör. 0.9.14); bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz N'talep', N'BayiAtamasi', N'OlusmaZamani', @Metin = N'Atamanın yapıldığı an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'BayiAtamasi', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'BayiAtamasi', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
GO

/* ==========================================================================
   talep.Devir
   ========================================================================== */
CREATE TABLE talep.Devir (
    Neden                nvarchar(500) COLLATE Turkish_100_CI_AS NULL,
    TalepKimlik          uniqueidentifier NOT NULL,
    ServisKimlik         uniqueidentifier NOT NULL,
    YapanTuruKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik uniqueidentifier NULL,
    YapanHesapKimlik     uniqueidentifier NULL,
    YapanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu       nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani         datetime2(3) NOT NULL CONSTRAINT DF_talep_Devir_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    KayitNo              bigint IDENTITY(1,1) NOT NULL,
    Kimlik               uniqueidentifier NOT NULL CONSTRAINT DF_talep_Devir_Kimlik DEFAULT NEWID(),
    CONSTRAINT PK_talep_Devir PRIMARY KEY NONCLUSTERED (Kimlik),
    CONSTRAINT FK_talep_Devir_talep_Talep FOREIGN KEY (TalepKimlik, ServisKimlik) REFERENCES talep.Talep (Kimlik, ServisKimlik),
    CONSTRAINT FK_talep_Devir_kod_AktorTuru FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_talep_Devir_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_Devir_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_talep_Devir_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_talep_Devir_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE UNIQUE CLUSTERED INDEX CX_talep_Devir_KayitNo ON talep.Devir (KayitNo);
CREATE INDEX IX_talep_Devir_TalepKimlikServisKimlik ON talep.Devir (TalepKimlik, ServisKimlik);
CREATE INDEX IX_talep_Devir_YapanTuruKodu ON talep.Devir (YapanTuruKodu);
CREATE INDEX IX_talep_Devir_YapanKullaniciKimlik ON talep.Devir (YapanKullaniciKimlik) WHERE YapanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_Devir_YapanHesapKimlik ON talep.Devir (YapanHesapKimlik) WHERE YapanHesapKimlik IS NOT NULL;
CREATE INDEX IX_talep_Devir_KaynakUygulamaKodu ON talep.Devir (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'Devir', @Metin = N'Servisin talep için PAKSAN''dan destek istediği kayıtlar. Sorumluluk PAKSAN''a geçer; talep servisin müşterisi olarak kalır. Yalnız eklenir.';
EXEC dbo.AciklamaYaz N'talep', N'Devir', N'Neden', @Metin = N'Servisin yazdığı destek isteme nedeni.';
EXEC dbo.AciklamaYaz N'talep', N'Devir', N'TalepKimlik', @Metin = N'Destek istenen talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'Devir', N'ServisKimlik', @Metin = N'Destek isteyen servis; talebin servisiyle aynı olmalı.';
EXEC dbo.AciklamaYaz N'talep', N'Devir', N'YapanTuruKodu', @Metin = N'Destek isteyen tarafın türü: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz N'talep', N'Devir', N'YapanKullaniciKimlik', @Metin = N'Destek isteyen personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz N'talep', N'Devir', N'YapanHesapKimlik', @Metin = N'Destek isteyen müşteri hesabı (musteri.Hesap). Yalnız müşteride dolu.';
EXEC dbo.AciklamaYaz N'talep', N'Devir', N'YapanAdi', @Metin = N'Destek isteyen kişinin o anki adı. Müşteride boş (müşterinin adı burada tutulmaz).';
EXEC dbo.AciklamaYaz N'talep', N'Devir', N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim (kod.KaynakUygulama).';
EXEC dbo.AciklamaYaz N'talep', N'Devir', N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (ör. 0.9.14); bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz N'talep', N'Devir', N'OlusmaZamani', @Metin = N'Destek isteğinin yapıldığı an (UTC).';
EXEC dbo.AciklamaYaz N'talep', N'Devir', N'KayitNo', @Metin = N'Satırı SSMS''te seçmek için sıra numarası. İş anlamı yok; ekrana, SMS''e ve LOGO''ya çıkmaz.';
EXEC dbo.AciklamaYaz N'talep', N'Devir', N'Kimlik', @Metin = N'Satırın teknik anahtarı (GUID). Telefon çevrimdışıyken kendisi üretebilir; ekranda görünmez.';
GO

/* ==========================================================================
   talep.TalepGizleme
   ========================================================================== */
CREATE TABLE talep.TalepGizleme (
    TalepKimlik   uniqueidentifier NOT NULL,
    HesapKimlik   uniqueidentifier NOT NULL,
    GizlemeZamani datetime2(3) NOT NULL CONSTRAINT DF_talep_TalepGizleme_GizlemeZamani DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_talep_TalepGizleme PRIMARY KEY CLUSTERED (TalepKimlik, HesapKimlik),
    CONSTRAINT FK_talep_TalepGizleme_talep_Talep FOREIGN KEY (TalepKimlik) REFERENCES talep.Talep (Kimlik),
    CONSTRAINT FK_talep_TalepGizleme_musteri_Hesap FOREIGN KEY (HesapKimlik) REFERENCES musteri.Hesap (Kimlik)
);
GO

CREATE INDEX IX_talep_TalepGizleme_HesapKimlik ON talep.TalepGizleme (HesapKimlik);
GO

EXEC dbo.AciklamaYaz N'talep', N'TalepGizleme', @Metin = N'Müşterinin Connect''teki listesinden gizlediği talepler, hesap başına. Satır silinince talep listede yeniden görünür.';
EXEC dbo.AciklamaYaz N'talep', N'TalepGizleme', N'TalepKimlik', @Metin = N'Gizlenen talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'TalepGizleme', N'HesapKimlik', @Metin = N'Talebi gizleyen müşteri hesabı (musteri.Hesap).';
EXEC dbo.AciklamaYaz N'talep', N'TalepGizleme', N'GizlemeZamani', @Metin = N'Talebin gizlendiği an (UTC).';
GO

/* ==========================================================================
   talep.TalepBelgesi
   ========================================================================== */
CREATE TABLE talep.TalepBelgesi (
    TalepKimlik          uniqueidentifier NOT NULL,
    BelgeBagiKimlik      uniqueidentifier NOT NULL,
    YapanTuruKodu        nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    YapanKullaniciKimlik uniqueidentifier NULL,
    YapanHesapKimlik     uniqueidentifier NULL,
    YapanAdi             nvarchar(150) COLLATE Turkish_100_CI_AS NULL,
    KaynakUygulamaKodu   nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
    UygulamaSurumu       nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    OlusmaZamani         datetime2(3) NOT NULL CONSTRAINT DF_talep_TalepBelgesi_OlusmaZamani DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_talep_TalepBelgesi PRIMARY KEY CLUSTERED (TalepKimlik, BelgeBagiKimlik),
    CONSTRAINT FK_talep_TalepBelgesi_talep_Talep FOREIGN KEY (TalepKimlik) REFERENCES talep.Talep (Kimlik),
    CONSTRAINT FK_talep_TalepBelgesi_entegrasyon_BelgeBagi FOREIGN KEY (BelgeBagiKimlik) REFERENCES entegrasyon.BelgeBagi (Kimlik),
    CONSTRAINT FK_talep_TalepBelgesi_kod_AktorTuru FOREIGN KEY (YapanTuruKodu) REFERENCES kod.AktorTuru (Kod),
    CONSTRAINT FK_talep_TalepBelgesi_erisim_Kullanici_Yapan FOREIGN KEY (YapanKullaniciKimlik) REFERENCES erisim.Kullanici (Kimlik),
    CONSTRAINT FK_talep_TalepBelgesi_musteri_Hesap_Yapan FOREIGN KEY (YapanHesapKimlik) REFERENCES musteri.Hesap (Kimlik),
    CONSTRAINT FK_talep_TalepBelgesi_kod_KaynakUygulama FOREIGN KEY (KaynakUygulamaKodu) REFERENCES kod.KaynakUygulama (Kod),
    CONSTRAINT CK_talep_TalepBelgesi_Yapan CHECK (
         (YapanTuruKodu = N'musteri'
            AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
      OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
            AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
      OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
            AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
    )
);
GO

CREATE INDEX IX_talep_TalepBelgesi_BelgeBagiKimlik ON talep.TalepBelgesi (BelgeBagiKimlik);
CREATE INDEX IX_talep_TalepBelgesi_YapanTuruKodu ON talep.TalepBelgesi (YapanTuruKodu);
CREATE INDEX IX_talep_TalepBelgesi_YapanKullaniciKimlik ON talep.TalepBelgesi (YapanKullaniciKimlik) WHERE YapanKullaniciKimlik IS NOT NULL;
CREATE INDEX IX_talep_TalepBelgesi_YapanHesapKimlik ON talep.TalepBelgesi (YapanHesapKimlik) WHERE YapanHesapKimlik IS NOT NULL;
CREATE INDEX IX_talep_TalepBelgesi_KaynakUygulamaKodu ON talep.TalepBelgesi (KaynakUygulamaKodu);
GO

EXEC dbo.AciklamaYaz N'talep', N'TalepBelgesi', @Metin = N'Talebe bağlı dış sistem belgeleri (LOGO satış faturası, irsaliye, tahsilat fişi…). Belgenin ne olduğu entegrasyon.BelgeBagi.BelgeTuruKodu kolonundadır. Yalnız eklenir.';
EXEC dbo.AciklamaYaz N'talep', N'TalepBelgesi', N'TalepKimlik', @Metin = N'Belgenin bağlandığı talep (talep.Talep).';
EXEC dbo.AciklamaYaz N'talep', N'TalepBelgesi', N'BelgeBagiKimlik', @Metin = N'Bağlanan belge (entegrasyon.BelgeBagi).';
EXEC dbo.AciklamaYaz N'talep', N'TalepBelgesi', N'YapanTuruKodu', @Metin = N'Belgeyi bağlayan tarafın türü: musteri, personel, servis, sistem ya da entegrasyon (kod.AktorTuru).';
EXEC dbo.AciklamaYaz N'talep', N'TalepBelgesi', N'YapanKullaniciKimlik', @Metin = N'Belgeyi bağlayan personel ya da servis kullanıcısı (erisim.Kullanici). Müşteri, sistem ve entegrasyonda boş.';
EXEC dbo.AciklamaYaz N'talep', N'TalepBelgesi', N'YapanHesapKimlik', @Metin = N'Belgeyi bağlayan müşteri hesabı (musteri.Hesap). Yalnız müşteride dolu.';
EXEC dbo.AciklamaYaz N'talep', N'TalepBelgesi', N'YapanAdi', @Metin = N'Belgeyi bağlayan kişinin o anki adı. Müşteride boş (müşterinin adı burada tutulmaz).';
EXEC dbo.AciklamaYaz N'talep', N'TalepBelgesi', N'KaynakUygulamaKodu', @Metin = N'Kaydın geldiği uygulama: connect, backoffice, servisim, api, betik, entegrasyon, yonetim (kod.KaynakUygulama).';
EXEC dbo.AciklamaYaz N'talep', N'TalepBelgesi', N'UygulamaSurumu', @Metin = N'Kaydı gönderen uygulamanın sürümü (ör. 0.9.14); bilinmiyorsa boş.';
EXEC dbo.AciklamaYaz N'talep', N'TalepBelgesi', N'OlusmaZamani', @Metin = N'Belgenin talebe bağlandığı an (UTC).';
GO

