/* ==========================================================================
   V0015 — Rollerin yetkileri (GRANT / DENY)

   Üç rol K02'de açılır; bu betik onlara tablo, kolon, şema ve veritabanı
   düzeyindeki izinleri verir:

     rol_uygulama   API (paksan_<ortam>_uygulama girişi). En az yetki:
                    şema başına okur, tablo tablo yazar, yalnız sayılı
                    bağ tablolarında siler.
     rol_yonetici   PAKSAN yetkilisinin SSMS oturumu. Her şeyi okur,
                    yardim ve yonetim prosedürlerini çalıştırır, tabloya
                    doğrudan yazamaz.
     rol_rapor      Excel/BI bağlantısı. Yalnız adı yazılı görünümleri
                    okur; o görünümler R06'da açılır ve izinleri orada
                    verilir. Burada iş şemalarına SELECT DENY konur.

   NESNE DÜZEYİNDEKİ öteki izinler (uygulama rolünün tek tek prosedürlere
   EXECUTE'u, gorunum.GecerliAyar SELECT'i, rapor rolünün görünüm başına
   SELECT'i) nesneyle birlikte R betiklerinde verilir; o nesneler henüz
   yoktur (tasarim.md 6.2 son madde).

   NEDEN PROSEDÜRLER DENY'A TAKILMAZ: bütün nesneler dbo sahiplidir.
   Prosedür, görünüm, işlev ve tetikleyici aynı sahipli tabloya eriştiğinde
   SQL Server yetki denetimi yapmaz (sahiplik zinciri). Bu yüzden
   "tabloya doğrudan yazamaz" kuralı prosedür yoluyla yazmayı engellemez.

   SONRAKİ BETİKLER: yeni bir tablo açan her V betiği o tablonun yetki
   kararını kendi içinde verir (tasarim.md 4.1, CD-YETKI). Şema düzeyindeki
   izinler (SELECT ON SCHEMA, EXECUTE ON SCHEMA::yardim) yeni nesnelere
   kendiliğinden uygulanır.

   KOLON DÜZEYİ: "bütün kolonlar, X hariç" kuralı tablo düzeyinde UPDATE
   + X kolonunda UPDATE DENY ile yazılır; kolon DENY'ı tablo GRANT'inden
   önce gelir. "yalnız şu kolonlar" kuralı kolon listeli GRANT UPDATE ile
   yazılır.

   Kural kaynağı: veritabani/tasarim.md Bölüm 1.13.2 (silinebilen bağ
   satırları), 1.14.2, 4.1, 4.2, 4.3, 6.2.
   ========================================================================== */


/* ==========================================================================
   1. rol_uygulama — okuma (tasarim.md 4.2)

   Şema başına SELECT. gorunum şemasında yalnız GecerliAyar okunur (R03
   verir). yardim ve yonetim şemalarında hiçbir yetki yok (aşağıda DENY).
   ========================================================================== */

GRANT SELECT ON SCHEMA::musteri     TO rol_uygulama;
GRANT SELECT ON SCHEMA::makine      TO rol_uygulama;
GRANT SELECT ON SCHEMA::talep       TO rol_uygulama;
GRANT SELECT ON SCHEMA::servis      TO rol_uygulama;
GRANT SELECT ON SCHEMA::bayi        TO rol_uygulama;
GRANT SELECT ON SCHEMA::hakedis     TO rol_uygulama;
GRANT SELECT ON SCHEMA::katalog     TO rol_uygulama;
GRANT SELECT ON SCHEMA::personel    TO rol_uygulama;
GRANT SELECT ON SCHEMA::erisim      TO rol_uygulama;
GRANT SELECT ON SCHEMA::duyuru      TO rol_uygulama;
GRANT SELECT ON SCHEMA::bildirim    TO rol_uygulama;
GRANT SELECT ON SCHEMA::destek      TO rol_uygulama;
GRANT SELECT ON SCHEMA::kvkk        TO rol_uygulama;
GRANT SELECT ON SCHEMA::dosya       TO rol_uygulama;
GRANT SELECT ON SCHEMA::denetim     TO rol_uygulama;
GRANT SELECT ON SCHEMA::entegrasyon TO rol_uygulama;
GRANT SELECT ON SCHEMA::kod         TO rol_uygulama;
GRANT SELECT ON SCHEMA::cografya    TO rol_uygulama;
GRANT SELECT ON SCHEMA::sirket      TO rol_uygulama;
GRANT SELECT ON SCHEMA::sistem      TO rol_uygulama;
GRANT SELECT ON SCHEMA::gecmis      TO rol_uygulama;

DENY EXECUTE, SELECT ON SCHEMA::yardim  TO rol_uygulama;
DENY EXECUTE, SELECT ON SCHEMA::yonetim TO rol_uygulama;
GO


/* ==========================================================================
   2. rol_uygulama — yazma, tablo tablo (tasarim.md 4.2, 4.3, 1.13.2)

   Hiç yazma almayanlar (yalnız tohum, prosedür ya da tetikleyici yazar):
   kod.*, cografya.*, katalog.*, sirket.*, sistem.Ayar, sistem.NumaraOneki,
   sistem.SaklamaKurali, sistem.IcerikPaketi için GRANT yoktur; okuma
   şema izniyle gelir. Aynı listedeki öteki tablolar aşağıda DENY alır.

   DELETE yalnız şu bağ tablolarında: erisim.RolIzin, servis.Bolge,
   servis.BayiBagi, talep.TalepGizleme, duyuru.Hedef* (altı tablo).
   ========================================================================== */

/* -------------------------------------------------------------- musteri */

GRANT INSERT, UPDATE ON musteri.Hesap TO rol_uygulama;
DENY UPDATE ON musteri.Hesap (SifreKaydi) TO rol_uygulama;         -- yalnız musteri.SifreYaz yazar

GRANT INSERT, UPDATE ON musteri.HesapKisisi TO rol_uygulama;
GRANT INSERT, UPDATE ON musteri.TelefonDegisikligiTalebi TO rol_uygulama;

GRANT INSERT ON musteri.HesapTelefonGecmisi TO rol_uygulama;
GRANT UPDATE ON musteri.HesapTelefonGecmisi (BitisZamani) TO rol_uygulama;

GRANT INSERT, UPDATE ON musteri.GeriBildirim TO rol_uygulama;
GRANT INSERT ON musteri.GeriBildirimNotu TO rol_uygulama;            -- yalnız ekleme
GO

/* ----------------------------------------------------------------- kvkk */

DENY INSERT, UPDATE, DELETE ON kvkk.MetinSurumu TO rol_uygulama;     -- yalnız tohum

GRANT INSERT ON kvkk.RizaOlayi TO rol_uygulama;                     -- yalnız ekleme
DENY UPDATE, DELETE ON kvkk.RizaOlayi TO rol_uygulama;

GRANT INSERT, UPDATE ON kvkk.BasvuruTalebi TO rol_uygulama;
GO

/* --------------------------------------------------------------- makine */

GRANT INSERT, UPDATE ON makine.Makine TO rol_uygulama;

GRANT INSERT ON makine.MakineSahipligi TO rol_uygulama;
GRANT UPDATE ON makine.MakineSahipligi (TakmaAd, BitisZamani, BitisNedeniKodu) TO rol_uygulama;

GRANT INSERT ON makine.MakineServisAtamasi TO rol_uygulama;
GRANT UPDATE ON makine.MakineServisAtamasi (BitisZamani, BitirenKullaniciKimlik, BitirenAdi) TO rol_uygulama;

GRANT INSERT, UPDATE ON makine.MakineSatisi TO rol_uygulama;
GRANT INSERT ON makine.KayitOlayi TO rol_uygulama;                  -- yalnız ekleme
GRANT INSERT, UPDATE ON makine.BakimTamamlama TO rol_uygulama;
GO

/* ---------------------------------------------------------------- talep */

GRANT INSERT, UPDATE ON talep.Talep TO rol_uygulama;
GRANT INSERT, UPDATE ON talep.ServisTalebiAyrinti TO rol_uygulama;

GRANT INSERT ON talep.ParcaTalebiAyrinti TO rol_uygulama;
GRANT UPDATE ON talep.ParcaTalebiAyrinti
    (KargoTutari, OdenecekTutar, SonOdemeTarihi, TutarDogrulamaZamani,
     TutarDogrulayanKullaniciKimlik, TutarDogrulayanAdi) TO rol_uygulama;

GRANT INSERT, UPDATE ON talep.TeklifTalebiAyrinti TO rol_uygulama;

GRANT INSERT ON talep.TalepBelirtisi TO rol_uygulama;               -- yalnız ekleme
GRANT INSERT ON talep.TeklifUrunTipi TO rol_uygulama;               -- yalnız ekleme
GRANT INSERT ON talep.TeklifArazi TO rol_uygulama;                  -- yalnız ekleme

DENY INSERT, UPDATE, DELETE ON talep.DurumGecmisi TO rol_uygulama;   -- yalnız TR_talep_Talep_DurumGecmisi yazar

GRANT INSERT ON talep.TalepNotu TO rol_uygulama;                    -- yalnız ekleme
GRANT INSERT, UPDATE ON talep.Randevu TO rol_uygulama;
GRANT INSERT ON talep.Teklif TO rol_uygulama;                       -- yalnız ekleme
GRANT INSERT ON talep.Iptal TO rol_uygulama;                        -- yalnız ekleme
GRANT INSERT ON talep.YenidenAcma TO rol_uygulama;                  -- yalnız ekleme
GRANT INSERT ON talep.Ekleme TO rol_uygulama;                       -- yalnız ekleme
GRANT INSERT ON talep.EklemeEki TO rol_uygulama;                    -- yalnız ekleme
GRANT INSERT ON talep.TalepEki TO rol_uygulama;                     -- yalnız ekleme
GRANT INSERT, UPDATE ON talep.FaturaBilgisi TO rol_uygulama;

GRANT INSERT ON talep.Dekont TO rol_uygulama;
GRANT UPDATE ON talep.Dekont
    (GecersizZamani, GecersizNedeni, GecersizKilanKullaniciKimlik, GecersizKilanAdi) TO rol_uygulama;
DENY DELETE ON talep.Dekont TO rol_uygulama;

GRANT INSERT ON talep.OdemeOnayi TO rol_uygulama;
GRANT UPDATE ON talep.OdemeOnayi (GeriAlinmaZamani, GeriAlanKullaniciKimlik, GeriAlanAdi) TO rol_uygulama;

GRANT INSERT ON talep.ParcaSatiri TO rol_uygulama;                  -- yalnız ekleme
GRANT INSERT, UPDATE ON talep.ServisZiyareti TO rol_uygulama;

GRANT INSERT ON talep.ZiyaretParcaSatiri TO rol_uygulama;           -- servisin gönderdiği liste hiç değişmez
DENY UPDATE, DELETE ON talep.ZiyaretParcaSatiri TO rol_uygulama;

GRANT INSERT ON talep.ZiyaretFotografi TO rol_uygulama;             -- yalnız ekleme
GRANT INSERT ON talep.ZiyaretDuzeltmesi TO rol_uygulama;            -- yalnız ekleme
GRANT INSERT ON talep.ZiyaretDuzeltmesiParcasi TO rol_uygulama;     -- yalnız ekleme
GRANT INSERT ON talep.Kapanis TO rol_uygulama;                      -- yalnız ekleme
GRANT INSERT, UPDATE ON talep.ParcaSevki TO rol_uygulama;
GRANT INSERT, UPDATE ON talep.BayiAtamasi TO rol_uygulama;
GRANT INSERT ON talep.Devir TO rol_uygulama;                        -- yalnız ekleme
GRANT INSERT, UPDATE, DELETE ON talep.TalepGizleme TO rol_uygulama; -- müşteri gizlemeyi geri alabilir
GRANT INSERT ON talep.TalepBelgesi TO rol_uygulama;                 -- yalnız ekleme
GO

/* --------------------------------------------------------------- servis */

GRANT INSERT, UPDATE ON servis.Servis TO rol_uygulama;
GRANT INSERT, UPDATE ON servis.FaturaBilgisi TO rol_uygulama;
GRANT INSERT, UPDATE, DELETE ON servis.BayiBagi TO rol_uygulama;    -- eski bağlar gecmis.servis_BayiBagi'nda
GRANT INSERT, UPDATE, DELETE ON servis.Bolge TO rol_uygulama;       -- eski bölgeler gecmis.servis_Bolge'de
GRANT INSERT, UPDATE ON servis.MarkaYetkisi TO rol_uygulama;
GRANT INSERT, UPDATE ON servis.GirisHesabi TO rol_uygulama;
GRANT INSERT, UPDATE ON servis.SifreYardimTalebi TO rol_uygulama;
GO

/* ----------------------------------------------------------------- bayi */

GRANT INSERT, UPDATE ON bayi.Bayi TO rol_uygulama;
GRANT INSERT, UPDATE ON bayi.MarkaYetkisi TO rol_uygulama;
GO

/* -------------------------------------------------------------- hakedis */

GRANT INSERT, UPDATE ON hakedis.Tarife TO rol_uygulama;
GRANT INSERT, UPDATE ON hakedis.DonemDokumu TO rol_uygulama;

GRANT INSERT, UPDATE ON hakedis.HakEdis TO rol_uygulama;
DENY UPDATE ON hakedis.HakEdis (NetTutar) TO rol_uygulama;          -- yalnız HakEdisHesapla yazar

DENY INSERT, UPDATE, DELETE ON hakedis.HakEdisKalemi TO rol_uygulama; -- yalnız HakEdisHesapla ve HakEdisKalemiYaz yazar

GRANT INSERT ON hakedis.DonemDokumuBelgesi TO rol_uygulama;         -- yalnız ekleme

GRANT INSERT ON hakedis.ServisHesapHareketi TO rol_uygulama;
GRANT UPDATE ON hakedis.ServisHesapHareketi (DonemDokumuKimlik, BelgeBagiKimlik) TO rol_uygulama;
DENY UPDATE ON hakedis.ServisHesapHareketi
    (GeriAlinmaZamani, Tutar, YonKodu, HareketTuruKodu, DuzeltilenHareketKimlik) TO rol_uygulama;
GO

/* ------------------------------------------------------------- personel */

GRANT INSERT, UPDATE ON personel.Personel TO rol_uygulama;
GO

/* --------------------------------------------------------------- erisim */

GRANT INSERT, UPDATE ON erisim.Kullanici TO rol_uygulama;
DENY UPDATE ON erisim.Kullanici (SifreKaydi) TO rol_uygulama;       -- yalnız erisim.SifreYaz yazar

/* İzin listesi yalnız tohumdan gelir (T03). Açık DENY: tablo uygulama
   rolünün yazdığı erisim şemasında olduğu için karar SSMS'te görünsün. */
DENY INSERT, UPDATE, DELETE ON erisim.IzinGrubu TO rol_uygulama;
DENY INSERT, UPDATE, DELETE ON erisim.Izin TO rol_uygulama;

GRANT INSERT, UPDATE ON erisim.Rol TO rol_uygulama;
GRANT INSERT, UPDATE, DELETE ON erisim.RolIzin TO rol_uygulama;     -- eski izinler gecmis.erisim_RolIzin'de

GRANT INSERT ON erisim.SifreSifirlamaJetonu TO rol_uygulama;
GRANT UPDATE ON erisim.SifreSifirlamaJetonu (KullanilmaZamani, IptalZamani) TO rol_uygulama;
DENY DELETE ON erisim.SifreSifirlamaJetonu TO rol_uygulama;         -- temizlik sistem.SaklamaUygula

GRANT INSERT ON erisim.GirisDenemesi TO rol_uygulama;               -- yalnız ekleme
DENY DELETE ON erisim.GirisDenemesi TO rol_uygulama;                -- temizlik sistem.SaklamaUygula

GRANT INSERT, UPDATE ON erisim.Oturum TO rol_uygulama;
DENY DELETE ON erisim.Oturum TO rol_uygulama;

GRANT INSERT ON erisim.DogrulamaKodu TO rol_uygulama;
GRANT UPDATE ON erisim.DogrulamaKodu (DenemeSayisi, KullanilmaZamani) TO rol_uygulama;
DENY DELETE ON erisim.DogrulamaKodu TO rol_uygulama;
GO

/* --------------------------------------------------------------- duyuru */

GRANT INSERT, UPDATE ON duyuru.Duyuru TO rol_uygulama;

/* Hedef satırları yayından önce silinebilir (API kuralı). */
GRANT INSERT, UPDATE, DELETE ON duyuru.HedefMarka TO rol_uygulama;
GRANT INSERT, UPDATE, DELETE ON duyuru.HedefIl TO rol_uygulama;
GRANT INSERT, UPDATE, DELETE ON duyuru.HedefIlce TO rol_uygulama;
GRANT INSERT, UPDATE, DELETE ON duyuru.HedefServis TO rol_uygulama;
GRANT INSERT, UPDATE, DELETE ON duyuru.HedefUrun TO rol_uygulama;
GRANT INSERT, UPDATE, DELETE ON duyuru.HedefSeri TO rol_uygulama;
GO

/* ------------------------------------------------------------- bildirim */

GRANT INSERT, UPDATE ON bildirim.Cihaz TO rol_uygulama;
GRANT INSERT, UPDATE ON bildirim.Bildirim TO rol_uygulama;

GRANT INSERT ON bildirim.Teslimat TO rol_uygulama;
GRANT UPDATE ON bildirim.Teslimat
    (HedeflenmeZamani, GonderilmeZamani, CihazaUlasmaZamani, GorulmeZamani,
     OkunmaZamani, KabulZamani, ArsivlenmeZamani) TO rol_uygulama;
GO

/* --------------------------------------------------------------- destek */

GRANT INSERT, UPDATE ON destek.SohbetOturumu TO rol_uygulama;
DENY DELETE ON destek.SohbetOturumu TO rol_uygulama;                -- temizlik sistem.SaklamaUygula

GRANT INSERT ON destek.SohbetOlayi TO rol_uygulama;                 -- yalnız ekleme
DENY DELETE ON destek.SohbetOlayi TO rol_uygulama;
GO

/* ---------------------------------------------------------------- dosya */

GRANT INSERT, UPDATE ON dosya.Dosya TO rol_uygulama;
DENY DELETE ON dosya.Dosya TO rol_uygulama;                         -- silinmez; GecersizZamani, SilinmeIstendiZamani
GO

/* -------------------------------------------------------------- denetim */

GRANT INSERT ON denetim.IslemKaydi TO rol_uygulama;                 -- yalnız ekleme
DENY UPDATE, DELETE ON denetim.IslemKaydi TO rol_uygulama;
GO

/* ---------------------------------------------------------- entegrasyon */

GRANT INSERT ON entegrasyon.IceAktarim TO rol_uygulama;
GRANT UPDATE ON entegrasyon.IceAktarim (DurumKodu, SatirSayisi, HataSayisi) TO rol_uygulama;

GRANT INSERT ON entegrasyon.IceAktarimSatiri TO rol_uygulama;
GRANT UPDATE ON entegrasyon.IceAktarimSatiri
    (DurumKodu, HataMesaji, EslesenKayitTuruKodu, EslesenKimlik) TO rol_uygulama;
DENY DELETE ON entegrasyon.IceAktarimSatiri TO rol_uygulama;

GRANT INSERT, UPDATE ON entegrasyon.CariKarti TO rol_uygulama;
DENY DELETE ON entegrasyon.CariKarti TO rol_uygulama;               -- müşteri satırını yalnız HesabiAnonimlestir siler

GRANT INSERT, UPDATE ON entegrasyon.BelgeBagi TO rol_uygulama;
GRANT INSERT, UPDATE ON entegrasyon.LogoMalzemeKarti TO rol_uygulama;

GRANT INSERT, UPDATE ON entegrasyon.LogoSeriSorgusu TO rol_uygulama;
DENY DELETE ON entegrasyon.LogoSeriSorgusu TO rol_uygulama;         -- temizlik sistem.SaklamaUygula
GO

/* --------------------------------------------------------------- sistem */

DENY INSERT, UPDATE, DELETE ON sistem.Ortam TO rol_uygulama;
DENY SELECT, INSERT, UPDATE, DELETE ON sistem.NumaraSayaci TO rol_uygulama;  -- yalnız sistem.NumaraAl

GRANT INSERT, UPDATE ON sistem.Giden TO rol_uygulama;
DENY DELETE ON sistem.Giden TO rol_uygulama;                        -- temizlik sistem.SaklamaUygula

GRANT INSERT, UPDATE ON sistem.GidenEki TO rol_uygulama;

GRANT INSERT, UPDATE ON sistem.TekrarAnahtari TO rol_uygulama;
DENY DELETE ON sistem.TekrarAnahtari TO rol_uygulama;               -- temizlik sistem.SaklamaUygula
GO

/* ------------------------------------------------------------------ dbo */

DENY SELECT, INSERT, UPDATE, DELETE ON dbo.SemaGecmisi TO rol_uygulama;
GO


/* ==========================================================================
   3. rol_yonetici (tasarim.md 4.2, 4.3)

   Her şeyi okur; yardim ve yonetim prosedürlerini çalıştırır. Veritabanı
   düzeyindeki DENY INSERT/UPDATE/DELETE yüzünden tabloya doğrudan
   yazamaz; yazma yalnız yonetim prosedürleri üzerinden olur (sahiplik
   zinciri). İç prosedürlere (sistem.*, erisim.SifreYaz, musteri.*,
   hakedis.*) EXECUTE verilmez. Kolon düzeyinde SELECT DENY yoktur: SSMS'te
   SELECT * bozulmasın.
   ========================================================================== */

GRANT SELECT ON SCHEMA::musteri     TO rol_yonetici;
GRANT SELECT ON SCHEMA::makine      TO rol_yonetici;
GRANT SELECT ON SCHEMA::talep       TO rol_yonetici;
GRANT SELECT ON SCHEMA::servis      TO rol_yonetici;
GRANT SELECT ON SCHEMA::bayi        TO rol_yonetici;
GRANT SELECT ON SCHEMA::hakedis     TO rol_yonetici;
GRANT SELECT ON SCHEMA::katalog     TO rol_yonetici;
GRANT SELECT ON SCHEMA::personel    TO rol_yonetici;
GRANT SELECT ON SCHEMA::erisim      TO rol_yonetici;
GRANT SELECT ON SCHEMA::duyuru      TO rol_yonetici;
GRANT SELECT ON SCHEMA::bildirim    TO rol_yonetici;
GRANT SELECT ON SCHEMA::destek      TO rol_yonetici;
GRANT SELECT ON SCHEMA::kvkk        TO rol_yonetici;
GRANT SELECT ON SCHEMA::dosya       TO rol_yonetici;
GRANT SELECT ON SCHEMA::denetim     TO rol_yonetici;
GRANT SELECT ON SCHEMA::entegrasyon TO rol_yonetici;
GRANT SELECT ON SCHEMA::kod         TO rol_yonetici;
GRANT SELECT ON SCHEMA::cografya    TO rol_yonetici;
GRANT SELECT ON SCHEMA::sirket      TO rol_yonetici;
GRANT SELECT ON SCHEMA::sistem      TO rol_yonetici;
GRANT SELECT ON SCHEMA::gecmis      TO rol_yonetici;
GRANT SELECT ON SCHEMA::gorunum     TO rol_yonetici;
GRANT SELECT ON SCHEMA::yardim      TO rol_yonetici;   -- satır içi işlevler (yardim.Sadelestir)

GRANT EXECUTE ON SCHEMA::yardim  TO rol_yonetici;
GRANT EXECUTE ON SCHEMA::yonetim TO rol_yonetici;

/* SSMS'te kolonlar, açıklamalar ve prosedür metinleri görünsün. */
GRANT VIEW DEFINITION TO rol_yonetici;

DENY INSERT, UPDATE, DELETE TO rol_yonetici;
GO


/* ==========================================================================
   4. rol_rapor (tasarim.md 4.2, 4.3)

   Şema başına hiçbir okuma yetkisi yoktur. İzinli görünümler (gorunum
   şemasında, adı tasarim.md 4.2'de yazılı olanlar) R06'da tek tek SELECT
   alır ve tablolara sahiplik zinciriyle ulaşır. Aşağıdaki şema DENY'ları
   rapor bağlantısının müşteri tablolarını ya da yardim işlevlerini
   doğrudan okumasını kesin olarak kapatır; bir şema izni yanlışlıkla
   verilse bile DENY önce gelir.
   ========================================================================== */

DENY SELECT ON SCHEMA::musteri     TO rol_rapor;
DENY SELECT ON SCHEMA::makine      TO rol_rapor;
DENY SELECT ON SCHEMA::talep       TO rol_rapor;
DENY SELECT ON SCHEMA::servis      TO rol_rapor;
DENY SELECT ON SCHEMA::bayi        TO rol_rapor;
DENY SELECT ON SCHEMA::hakedis     TO rol_rapor;
DENY SELECT ON SCHEMA::katalog     TO rol_rapor;
DENY SELECT ON SCHEMA::personel    TO rol_rapor;
DENY SELECT ON SCHEMA::erisim      TO rol_rapor;
DENY SELECT ON SCHEMA::duyuru      TO rol_rapor;
DENY SELECT ON SCHEMA::bildirim    TO rol_rapor;
DENY SELECT ON SCHEMA::destek      TO rol_rapor;
DENY SELECT ON SCHEMA::kvkk        TO rol_rapor;
DENY SELECT ON SCHEMA::dosya       TO rol_rapor;
DENY SELECT ON SCHEMA::denetim     TO rol_rapor;
DENY SELECT ON SCHEMA::entegrasyon TO rol_rapor;
DENY SELECT ON SCHEMA::kod         TO rol_rapor;
DENY SELECT ON SCHEMA::cografya    TO rol_rapor;
DENY SELECT ON SCHEMA::sirket      TO rol_rapor;
DENY SELECT ON SCHEMA::sistem      TO rol_rapor;
DENY SELECT ON SCHEMA::gecmis      TO rol_rapor;
DENY SELECT ON SCHEMA::yardim      TO rol_rapor;
GO
