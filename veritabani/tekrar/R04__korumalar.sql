/* ==========================================================================
   R04 — korumalar (Bölüm 4.4)

   Değiştirilemez kayıtları koruyan ve iş kuralını zorlayan tetikleyiciler.
   Sahip girişine karşı da korurlar; kapatılmaları ancak git'te görünen bir
   V betiğiyle olur. Hepsi SET NOCOUNT ON ile başlar, küme tabanlıdır,
   dinamik SQL içermez, tetiklendiği tabloyu yeniden güncellemez
   (kvkk.MetinSurumu'nun INSTEAD OF UPDATE'i izin verilen tek kolonu yazar;
   INSTEAD OF tetikleyicisi kendi içindeki yazmada yeniden çalışmaz).

     TR_sistem_Ortam_Koruma                 51011  (K02 açar, burada yenilenir)
     TR_denetim_IslemKaydi_Koruma           51012
     TR_denetim_IslemKaydi_Yapan            51010
     TR_kvkk_RizaOlayi_Koruma               51013
     TR_kvkk_MetinSurumu_Koruma             51014
     TR_talep_DurumGecmisi_Koruma           51015
     TR_talep_Talep_DurumGecmisi            51010
     TR_talep_Talep_ServisYetkisi           51020
     TR_hakedis_HakEdis_Onay                51040
     TR_hakedis_HakEdis_TutarKilidi         51046
     TR_hakedis_ServisHesapHareketi_Tutar   51042
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. sistem.Ortam — ortam işareti değişmez, silinmez.
   -------------------------------------------------------------------------- */
CREATE OR ALTER TRIGGER sistem.TR_sistem_Ortam_Koruma
ON sistem.Ortam
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 51011, N'<Codex metni: ortam işareti değiştirilemez ve silinemez>', 1;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'sistem', @Nesne = N'Ortam', @Alt = N'TR_sistem_Ortam_Koruma', @AltTuru = N'TRIGGER',
     @Metin = N'Ortam işaretinin (yerel, sinama, test, canli) değiştirilmesini ve silinmesini her girişte reddeder (51011). Örnek veri ve @Zaman izni bu işarete bağlı olduğu için canlı veritabanı sınama ortamına çevrilemez.';
GO

/* --------------------------------------------------------------------------
   2. denetim.IslemKaydi — işlem kaydı değişmez, silinmez (saklama
   istisnası yok); yazılırken "kim yaptı" da doğrulanır.
   -------------------------------------------------------------------------- */
CREATE OR ALTER TRIGGER denetim.TR_denetim_IslemKaydi_Koruma
ON denetim.IslemKaydi
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 51012, N'<Codex metni: işlem kaydı değiştirilemez ve silinemez>', 1;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'TR_denetim_IslemKaydi_Koruma', @AltTuru = N'TRIGGER',
     @Metin = N'İşlem kaydının güncellenmesini ve silinmesini her girişte reddeder (51012). Saklama istisnası yoktur; kayıtlar yalnız eklenir.';
GO

/* denetim.IslemKaydi'nın Yapan kolonlarında yabancı anahtar yoktur (tasarim.md
   1.16: kayıt, kullanıcı silinse bile okunabilir kalmalı). Bu yüzden "kim
   yaptı" sorusunun tek değişmez kaydına, olmayan ya da başka türden bir
   kullanıcı yazılabiliyordu. Kullanıcı verildiyse var olmalı, aktif olmalı ve
   türü YapanTuruKodu ile aynı olmalı (18.09.2026). YapanAdi denetlenmez: o,
   yapanın o anki adının kopyasıdır ve sonradan değişen adla eşitlenmemelidir. */
CREATE OR ALTER TRIGGER denetim.TR_denetim_IslemKaydi_Yapan
ON denetim.IslemKaydi
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        WHERE i.YapanKullaniciKimlik IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM erisim.Kullanici AS k
                          WHERE k.Kimlik = i.YapanKullaniciKimlik
                            AND k.TurKodu = i.YapanTuruKodu
                            AND k.Aktif = 1))
        THROW 51010, N'<Codex metni: işlem kaydındaki yapan kullanıcı yok, pasif ya da yazılan türde değil>', 1;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'denetim', @Nesne = N'IslemKaydi', @Alt = N'TR_denetim_IslemKaydi_Yapan', @AltTuru = N'TRIGGER',
     @Metin = N'Eklenen işlem kaydında YapanKullaniciKimlik doluysa o kullanıcının erisim.Kullanici''da bulunduğunu, Aktif = 1 olduğunu ve TurKodu''nun satırdaki YapanTuruKodu ile aynı olduğunu denetler; değilse 51010 (18.09.2026). Yapan kolonlarında yabancı anahtar yoktur (tasarim.md 1.16), bu yüzden denetim tetikleyiciyle yapılır. YapanAdi denetlenmez: yapanın o anki adının kopyasıdır. Aynı çapraz denetim sistem.YapanAyarla ve TR_talep_Talep_DurumGecmisi''nde de vardır. Kişinin kendi girişini kapatması zaten 51112 ile engellidir, bu yüzden "pasifleştirme kaydını pasifleşen yazdı" durumu oluşmaz.';
GO

/* --------------------------------------------------------------------------
   3. kvkk.RizaOlayi — rıza olayı değişmez, silinmez (yasal kanıt).
   -------------------------------------------------------------------------- */
CREATE OR ALTER TRIGGER kvkk.TR_kvkk_RizaOlayi_Koruma
ON kvkk.RizaOlayi
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 51013, N'<Codex metni: rıza kaydı değiştirilemez ve silinemez>', 1;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'RizaOlayi', @Alt = N'TR_kvkk_RizaOlayi_Koruma', @AltTuru = N'TRIGGER',
     @Metin = N'Rıza olayının güncellenmesini ve silinmesini her girişte reddeder (51013). Rıza değişikliği yeni olay satırıdır; güncel seçim kvkk.GuncelRiza''dadır. Anonimleştirmede de kalır (yasal kanıt).';
GO

/* --------------------------------------------------------------------------
   4. kvkk.MetinSurumu — metin içeriği değişmez.
   DELETE reddedilir. UPDATE yalnız HukukOnayiZamani boştan dolu değere
   geçiyor ve başka hiçbir kolon (anahtar dahil) değişmiyorsa uygulanır.
   Karşılaştırma harf büyüklüğüne duyarlıdır (BIN2).
   -------------------------------------------------------------------------- */
CREATE OR ALTER TRIGGER kvkk.TR_kvkk_MetinSurumu_Koruma
ON kvkk.MetinSurumu
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM deleted)
        RETURN;

    IF NOT EXISTS (SELECT 1 FROM inserted)
        THROW 51014, N'<Codex metni: yayımlanmış metin sürümü silinemez>', 1;

    IF (SELECT COUNT(*) FROM inserted) <> (SELECT COUNT(*) FROM deleted)
       OR EXISTS (
            SELECT 1
            FROM inserted AS i
            LEFT JOIN deleted AS d
              ON d.MetinKodu = i.MetinKodu COLLATE Latin1_General_100_BIN2
             AND d.Surum     = i.Surum     COLLATE Latin1_General_100_BIN2
             AND d.DilKodu   = i.DilKodu   COLLATE Latin1_General_100_BIN2
            WHERE d.MetinKodu IS NULL
               OR d.HukukOnayiZamani IS NOT NULL
               OR i.HukukOnayiZamani IS NULL
               OR EXISTS (
                    SELECT i.Baslik COLLATE Latin1_General_100_BIN2,
                           i.IcerikJson COLLATE Latin1_General_100_BIN2,
                           i.IcerikOzeti, i.AsilMetin, i.MetinTarihi, i.OlusmaZamani
                    EXCEPT
                    SELECT d.Baslik COLLATE Latin1_General_100_BIN2,
                           d.IcerikJson COLLATE Latin1_General_100_BIN2,
                           d.IcerikOzeti, d.AsilMetin, d.MetinTarihi, d.OlusmaZamani))
        THROW 51014, N'<Codex metni: metin sürümünün içeriği değiştirilemez; yalnız hukuk onayı zamanı bir kez yazılabilir>', 1;

    UPDATE m
       SET HukukOnayiZamani = i.HukukOnayiZamani
      FROM kvkk.MetinSurumu AS m
      JOIN inserted AS i
        ON i.MetinKodu = m.MetinKodu
       AND i.Surum     = m.Surum
       AND i.DilKodu   = m.DilKodu;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'kvkk', @Nesne = N'MetinSurumu', @Alt = N'TR_kvkk_MetinSurumu_Koruma', @AltTuru = N'TRIGGER',
     @Metin = N'Metin sürümünün silinmesini reddeder; güncellemeyi yalnız hukuk onayı zamanı boştan dolu değere geçiyor ve başka hiçbir kolon değişmiyorsa uygular (51014). İçerik değişikliği yeni sürüm satırıdır; müşterinin onayladığı metin böylece hep bulunur.';
GO

/* --------------------------------------------------------------------------
   5. talep.DurumGecmisi — durum geçmişi değişmez, silinmez.
   -------------------------------------------------------------------------- */
CREATE OR ALTER TRIGGER talep.TR_talep_DurumGecmisi_Koruma
ON talep.DurumGecmisi
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 51015, N'<Codex metni: talep durum geçmişi değiştirilemez ve silinemez>', 1;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'talep', @Nesne = N'DurumGecmisi', @Alt = N'TR_talep_DurumGecmisi_Koruma', @AltTuru = N'TRIGGER',
     @Metin = N'Durum geçmişi satırlarının güncellenmesini ve silinmesini her girişte reddeder (51015). Satırları yalnız TR_talep_Talep_DurumGecmisi yazar.';
GO

/* --------------------------------------------------------------------------
   6. talep.Talep → talep.DurumGecmisi
   Eklenen her talep ve durumu, sahibi ya da masası değişen her talep için
   bir geçmiş satırı. Yapan bilgisi sistem.YapanAyarla'nın yazdığı oturum
   bağlamından; eksik ya da tutarsızsa 51010. Yazılacak satır yoksa
   bağlama bakılmaz (öteki kolonların güncellemesi serbest).
   -------------------------------------------------------------------------- */
CREATE OR ALTER TRIGGER talep.TR_talep_Talep_DurumGecmisi
ON talep.Talep
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Degisen TABLE (
        TalepKimlik      uniqueidentifier NOT NULL PRIMARY KEY,
        OncekiDurumKodu  nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
        YeniDurumKodu    nvarchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
        OncekiSahipKodu  nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
        YeniSahipKodu    nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
        OncekiMasaKodu   nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
        YeniMasaKodu     nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL
    );

    INSERT @Degisen (TalepKimlik, OncekiDurumKodu, YeniDurumKodu, OncekiSahipKodu, YeniSahipKodu, OncekiMasaKodu, YeniMasaKodu)
    SELECT i.Kimlik,
           d.DurumKodu, i.DurumKodu,
           d.SahipKodu, i.SahipKodu,
           d.MasaKodu,  i.MasaKodu
    FROM inserted AS i
    LEFT JOIN deleted AS d
      ON d.Kimlik = i.Kimlik
    WHERE d.Kimlik IS NULL
       OR EXISTS (SELECT i.DurumKodu COLLATE Latin1_General_100_BIN2,
                         i.SahipKodu COLLATE Latin1_General_100_BIN2,
                         i.MasaKodu  COLLATE Latin1_General_100_BIN2
                  EXCEPT
                  SELECT d.DurumKodu COLLATE Latin1_General_100_BIN2,
                         d.SahipKodu COLLATE Latin1_General_100_BIN2,
                         d.MasaKodu  COLLATE Latin1_General_100_BIN2);

    IF @@ROWCOUNT = 0
        RETURN;

    DECLARE @YapanTuruKodu        nvarchar(40)     = CAST(SESSION_CONTEXT(N'YapanTuruKodu') AS nvarchar(40));
    DECLARE @YapanKullaniciKimlik uniqueidentifier = CAST(SESSION_CONTEXT(N'YapanKullaniciKimlik') AS uniqueidentifier);
    DECLARE @YapanHesapKimlik     uniqueidentifier = CAST(SESSION_CONTEXT(N'YapanHesapKimlik') AS uniqueidentifier);
    DECLARE @YapanAdi             nvarchar(150)    = CAST(SESSION_CONTEXT(N'YapanAdi') AS nvarchar(150));
    DECLARE @KaynakUygulamaKodu   nvarchar(40)     = CAST(SESSION_CONTEXT(N'KaynakUygulamaKodu') AS nvarchar(40));
    DECLARE @UygulamaSurumu       nvarchar(20)     = CAST(SESSION_CONTEXT(N'UygulamaSurumu') AS nvarchar(20));
    DECLARE @MusteriyeBildirildi  bit              = CAST(SESSION_CONTEXT(N'MusteriyeBildirildi') AS bit);

    IF @YapanTuruKodu IS NULL
       OR @KaynakUygulamaKodu IS NULL
       OR @MusteriyeBildirildi IS NULL
       OR NOT (
             (@YapanTuruKodu = N'musteri'
                AND @YapanHesapKimlik IS NOT NULL AND @YapanKullaniciKimlik IS NULL AND @YapanAdi IS NULL)
          OR (@YapanTuruKodu IN (N'sistem', N'entegrasyon')
                AND @YapanHesapKimlik IS NULL AND @YapanKullaniciKimlik IS NULL)
          OR (@YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
                AND @YapanKullaniciKimlik IS NOT NULL AND @YapanHesapKimlik IS NULL AND @YapanAdi IS NOT NULL)
       )
        THROW 51010, N'<Codex metni: talep durumu değişirken işlemi yapan bilgisi eksik ya da tutarsız>', 1;

    /* Kullanıcı gerçekten o türden ve aktif olmalı (18.09.2026). Yukarıdaki
       denetim yalnız kolon dolulukları kalıbıdır ve sistem.YapanAyarla'daki
       eşi atlanabilir: uygulama rolü sys.sp_set_session_context'i doğrudan
       çağırabiliyor. Asıl kapı burasıdır, çünkü satırı buraya bu tetikleyici
       yazıyor. FK_talep_DurumGecmisi_erisim_Kullanici_Yapan yalnız "kullanıcı
       var" der; türünü ve aktifliğini denetlemez. */
    IF @YapanKullaniciKimlik IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM erisim.Kullanici
                       WHERE Kimlik = @YapanKullaniciKimlik
                         AND TurKodu = @YapanTuruKodu
                         AND Aktif = 1)
        THROW 51010, N'<Codex metni: talep durumu değişirken işlemi yapan kullanıcı yok, pasif ya da verilen türde değil>', 1;

    INSERT talep.DurumGecmisi
        (TalepKimlik, OncekiDurumKodu, YeniDurumKodu, OncekiSahipKodu, YeniSahipKodu,
         OncekiMasaKodu, YeniMasaKodu, MusteriyeBildirildi,
         YapanTuruKodu, YapanKullaniciKimlik, YapanHesapKimlik, YapanAdi,
         KaynakUygulamaKodu, UygulamaSurumu)
    SELECT g.TalepKimlik, g.OncekiDurumKodu, g.YeniDurumKodu, g.OncekiSahipKodu, g.YeniSahipKodu,
           g.OncekiMasaKodu, g.YeniMasaKodu, @MusteriyeBildirildi,
           @YapanTuruKodu, @YapanKullaniciKimlik, @YapanHesapKimlik, @YapanAdi,
           @KaynakUygulamaKodu, @UygulamaSurumu
    FROM @Degisen AS g;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'talep', @Nesne = N'Talep', @Alt = N'TR_talep_Talep_DurumGecmisi', @AltTuru = N'TRIGGER',
     @Metin = N'Eklenen her talep ve durumu, sahibi ya da masası değişen her talep için talep.DurumGecmisi satırı yazar (çok satırlı güncellemede satır başına). Yapan bilgisini ve MusteriyeBildirildi değerini sistem.YapanAyarla''nın oturum bağlamına yazdığı değerlerden alır; eksik ya da tutarsızsa 51010 ile işlemi geri alır. Yapan kullanıcı verilmişse erisim.Kullanici''da var olmalı, Aktif = 1 olmalı ve TurKodu bağlamdaki YapanTuruKodu ile aynı olmalıdır; değilse 51010 (18.09.2026). Bu çapraz denetim YapanAyarla''da da vardır ama asıl kapı burasıdır: oturum bağlamı YapanAyarla çağrılmadan da yazılabiliyor. Durum, sahip ve masa değişmiyorsa hiçbir şey yazmaz.';
GO

/* --------------------------------------------------------------------------
   7. talep.Talep — servis yetkisi.
   Eklenen ya da ServisKimlik'i (ya da markası) değişen açık talepte
   servis dolu ise: servis aktif ve talebin markasında etkin yetkili
   olmalı. Kapanmış eski talepler ve servisi değişmeyen açık talepler
   etkilenmez; açık talebi olan servisin yetkisi alınabilir.
   (FK (ServisKimlik, MarkaKodu) yalnız "bir zaman yetkiliydi" der;
   yetkinin bugün bitmiş olmasını yakalamaz.)
   -------------------------------------------------------------------------- */
CREATE OR ALTER TRIGGER talep.TR_talep_Talep_ServisYetkisi
ON talep.Talep
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        LEFT JOIN deleted AS d
          ON d.Kimlik = i.Kimlik
        WHERE i.ServisKimlik IS NOT NULL
          AND i.KapanmaZamani IS NULL
          AND (d.Kimlik IS NULL
               OR d.ServisKimlik IS NULL
               OR d.ServisKimlik <> i.ServisKimlik
               OR d.MarkaKodu <> i.MarkaKodu)
          AND NOT EXISTS (
                SELECT 1
                FROM servis.MarkaYetkisi AS y
                JOIN servis.Servis AS s
                  ON s.Kimlik = y.ServisKimlik
                WHERE y.ServisKimlik = i.ServisKimlik
                  AND y.MarkaKodu = i.MarkaKodu
                  AND y.Etkin = 1
                  AND s.DurumKodu = N'aktif'))
        THROW 51020, N'<Codex metni: talep, yetkisi bitmiş ya da pasif bir servise bağlanamaz>', 1;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'talep', @Nesne = N'Talep', @Alt = N'TR_talep_Talep_ServisYetkisi', @AltTuru = N'TRIGGER',
     @Metin = N'Eklenen ya da servisi (veya markası) değişen açık talepte servis doluysa servisin aktif olduğunu ve talebin markasında etkin yetkisi bulunduğunu denetler; değilse 51020. Servisi değişmeyen ve kapanmış talepler denetlenmez; bu yüzden açık talebi olan servisin yetkisi alınabilir ve o talebin öteki kolonları güncellenebilir.';
GO

/* --------------------------------------------------------------------------
   8. hakedis.HakEdis — onaylanan hak edişin NetTutar'ı kalem toplamına eşit.
   -------------------------------------------------------------------------- */
CREATE OR ALTER TRIGGER hakedis.TR_hakedis_HakEdis_Onay
ON hakedis.HakEdis
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        WHERE i.DurumKodu = N'onaylandi'
          AND i.NetTutar <> ISNULL((SELECT SUM(k.Tutar)
                                    FROM hakedis.HakEdisKalemi AS k
                                    WHERE k.HakEdisKimlik = i.Kimlik), 0))
        THROW 51040, N'<Codex metni: onaylanan hak edişin tutarı kalemlerinin toplamına eşit değil>', 1;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'TR_hakedis_HakEdis_Onay', @AltTuru = N'TRIGGER',
     @Metin = N'Onaylandı durumundaki eklenen ya da güncellenen hak edişte NetTutar''ın hakedis.HakEdisKalemi tutarlarının toplamına (kalem yoksa 0) eşit olduğunu denetler; değilse 51040. Bütün satırların haftalık denetimi gorunum.KontrolHakEdisToplamiUyusmuyor''dadır.';
GO

/* --------------------------------------------------------------------------
   9. hakedis.HakEdis — onaylı hak edişin cari etkisi donar (Bölüm 1.9.3).

   Alacak hareketinin tutarı NetTutar + KDV − tevkifat − stopaj ile yazılır,
   ama TR_hakedis_ServisHesapHareketi_Tutar bunu yalnız hareket EKLENİRKEN
   denetler. Onaydan sonra hak edişin vergi kolonları değişirse hareket eski
   değerde kalır ve iki taraf sessizce ayrışır: gorunum.ServisBakiyesi tutarı
   hareketlerden, hakedis.DonemDokumu toplamları HakEdis'in vergi
   kolonlarından okur. Geri alınmamış bir alacak hareketi varken bu kolonlar
   donar; doğru yol yonetim.HakEdisOnayiniGeriAl'dir. O prosedür harekete
   GeriAlinmaZamani'nı HakEdis'i güncellemeden ÖNCE yazdığı için buraya
   takılmaz. Bütün satırların haftalık denetimi
   gorunum.KontrolHakEdisHareketiUyusmuyor'dadır.
   -------------------------------------------------------------------------- */
CREATE OR ALTER TRIGGER hakedis.TR_hakedis_HakEdis_TutarKilidi
ON hakedis.HakEdis
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        JOIN deleted AS d ON d.Kimlik = i.Kimlik
        WHERE d.DurumKodu = N'onaylandi'
          AND EXISTS (SELECT i.NetTutar, i.KdvOrani, i.KdvTutari,
                             i.TevkifatOrani, i.TevkifatTutari,
                             i.StopajOrani, i.StopajTutari,
                             i.ServisKimlik, i.SirketKodu, i.ParaBirimiKodu
                      EXCEPT
                      SELECT d.NetTutar, d.KdvOrani, d.KdvTutari,
                             d.TevkifatOrani, d.TevkifatTutari,
                             d.StopajOrani, d.StopajTutari,
                             d.ServisKimlik, d.SirketKodu, d.ParaBirimiKodu)
          AND EXISTS (SELECT 1
                      FROM hakedis.ServisHesapHareketi AS h
                      WHERE h.HakEdisKimlik = i.Kimlik
                        AND h.HareketTuruKodu = N'hakEdisAlacagi'
                        AND h.GeriAlinmaZamani IS NULL))
        THROW 51046, N'<Codex metni: onaylı hak edişin tutarı ve vergileri, alacak hareketi geri alınmadan değiştirilemez>', 1;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'HakEdis', @Alt = N'TR_hakedis_HakEdis_TutarKilidi', @AltTuru = N'TRIGGER',
     @Metin = N'Onaylı (güncellemeden önceki DurumKodu = onaylandi) hak edişte NetTutar, KdvOrani, KdvTutari, TevkifatOrani, TevkifatTutari, StopajOrani, StopajTutari, ServisKimlik, SirketKodu ve ParaBirimiKodu kolonlarının değişmesini, hak edişe bağlı geri alınmamış hakEdisAlacagi hareketi varken reddeder (51046). Bu on kolon hareketin tutarını ve bağını belirler (Bölüm 1.9.3); hareket eklenirken TR_hakedis_ServisHesapHareketi_Tutar denetler, sonrasını bu tetikleyici korur. Onayın kendisi engellenmez (önceki durum bekliyor''dur). Geri alma yolu yonetim.HakEdisOnayiniGeriAl harekete GeriAlinmaZamani''nı önce yazdığı için engellenmez. Haftalık denetim: gorunum.KontrolHakEdisHareketiUyusmuyor.';
GO

/* --------------------------------------------------------------------------
   10. hakedis.ServisHesapHareketi — tutar kaynağıyla uyuşmalı (Bölüm 1.9.3).
   Boş bağ CHECK'le 547 verir; burada yalnız dolu bağ denetlenir:
   - hakEdisAlacagi: hak ediş onaylı; tutar = net + KDV − tevkifat − stopaj;
     servis, şirket, para birimi hak edişinkiyle aynı
   - parcaSiparisiBorcu: tutar = COALESCE(OdenecekTutar, GenelToplam);
     şirket ve para birimi parça talebininkiyle aynı
   - DuzeltilenHareketKimlik dolu: tutar, servis, şirket, para birimi
     asılla aynı; yön ters
   -------------------------------------------------------------------------- */
CREATE OR ALTER TRIGGER hakedis.TR_hakedis_ServisHesapHareketi_Tutar
ON hakedis.ServisHesapHareketi
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        LEFT JOIN hakedis.HakEdis AS h
          ON h.Kimlik = i.HakEdisKimlik
        WHERE i.HareketTuruKodu = N'hakEdisAlacagi'
          AND i.HakEdisKimlik IS NOT NULL
          AND 1 = CASE WHEN h.Kimlik IS NOT NULL
                        AND h.DurumKodu = N'onaylandi'
                        AND i.Tutar = h.NetTutar + h.KdvTutari - h.TevkifatTutari - h.StopajTutari
                        AND i.ServisKimlik = h.ServisKimlik
                        AND i.SirketKodu = h.SirketKodu
                        AND i.ParaBirimiKodu = h.ParaBirimiKodu
                       THEN 0 ELSE 1 END)
        THROW 51042, N'<Codex metni: hak ediş alacağının tutarı, şirketi ya da para birimi onaylı hak edişle uyuşmuyor>', 1;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        LEFT JOIN talep.ParcaTalebiAyrinti AS p
          ON p.TalepKimlik = i.ParcaTalepKimlik
        WHERE i.HareketTuruKodu = N'parcaSiparisiBorcu'
          AND i.ParcaTalepKimlik IS NOT NULL
          AND 1 = CASE WHEN p.TalepKimlik IS NOT NULL
                        AND i.Tutar = COALESCE(p.OdenecekTutar, p.GenelToplam)
                        AND i.SirketKodu = p.SirketKodu
                        AND i.ParaBirimiKodu = p.ParaBirimiKodu
                       THEN 0 ELSE 1 END)
        THROW 51042, N'<Codex metni: parça siparişi borcunun tutarı, şirketi ya da para birimi parça talebiyle uyuşmuyor>', 1;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        LEFT JOIN hakedis.ServisHesapHareketi AS a
          ON a.Kimlik = i.DuzeltilenHareketKimlik
        WHERE i.DuzeltilenHareketKimlik IS NOT NULL
          AND 1 = CASE WHEN a.Kimlik IS NOT NULL
                        AND i.Tutar = a.Tutar
                        AND i.ServisKimlik = a.ServisKimlik
                        AND i.SirketKodu = a.SirketKodu
                        AND i.ParaBirimiKodu = a.ParaBirimiKodu
                        AND i.YonKodu <> a.YonKodu
                       THEN 0 ELSE 1 END)
        THROW 51042, N'<Codex metni: düzeltme hareketi asıl hareketle aynı tutar, servis, şirket ve para biriminde ve ters yönde olmalı>', 1;
END;
GO

EXEC dbo.AciklamaYaz @Sema = N'hakedis', @Nesne = N'ServisHesapHareketi', @Alt = N'TR_hakedis_ServisHesapHareketi_Tutar', @AltTuru = N'TRIGGER',
     @Metin = N'Eklenen hesap hareketinin tutarını kaynağıyla karşılaştırır (51042): hak ediş alacağında hak ediş onaylı ve tutar = net + KDV − tevkifat − stopaj; parça siparişi borcunda tutar = ödenecek tutar (yoksa genel toplam); düzeltme hareketinde tutar, servis, şirket ve para birimi asılla aynı, yön ters. Şirket ve para birimi her durumda kaynakla aynı olmalı. Bağı boş satırı CHECK kısıtları tetikleyiciden önce reddeder (547).';
GO
