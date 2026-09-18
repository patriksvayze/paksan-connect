/* ==========================================================================
   V0016 — açık tarife tekilliğine para birimi eklenir

   SORUN. hakedis.HakEdisHesapla tarifeyi para birimine göre seçer
   (tasarim.md 1.9.4: "hak edişin para biriminde olan hakedis.Tarife satırı";
   R05'te t.ParaBirimiKodu = @ParaBirimiKodu). Tekillik dizinleri ise para
   birimini anahtara almıyordu:

       UX_hakedis_Tarife_AcikGenel  UNIQUE (KalemTuruKodu)
           WHERE GecerlilikBitisTarihi IS NULL AND MarkaKodu IS NULL
       UX_hakedis_Tarife_AcikMarka  UNIQUE (KalemTuruKodu, MarkaKodu)
           WHERE GecerlilikBitisTarihi IS NULL AND MarkaKodu IS NOT NULL

   Böylece "yol" kaleminin açık genel tarifesi TRY'de varken EUR'da bir
   tanesi AÇILAMIYORDU (2601). Km > 0 olan her EUR hak edişi 51041 "geçerli
   tarife yok" alırdı: ikinci para birimi yalnız veriyle kurulamıyordu.
   Bölüm 2 (esneklik) ve 7.6'nın ES-16 adımı bunu şart koşuyor.

   ÇÖZÜM. Tekilliğin grameri okuma yoluyla aynı olmalı: tarife
   (kalem türü, marka, para birimi) başına tektir. Dizinler bu üç kolonla
   yeniden kurulur. Kısıt GEVŞEMEZ — tersine, okuma yolunun gerçekte
   kullandığı anahtara oturur; TRY için davranış birebir aynıdır.

   NEDEN YENİ BETİK. V0012 uygulanmış bir betiktir; değiştirilemez
   (KR-07 aracı durdurur). Dizin değişikliği şema değişikliğidir, veriyle
   yapılamaz; bu yüzden V betiği gerekti.

   Bulundu: 18.09.2026, S04 ES-16 yazılırken. tasarim.md 0.4 (217. satır)
   ve 7.6 güncellendi.
   ========================================================================== */

DROP INDEX UX_hakedis_Tarife_AcikGenel ON hakedis.Tarife;
DROP INDEX UX_hakedis_Tarife_AcikMarka ON hakedis.Tarife;
GO

/* Kalem türü, marka ve para birimi başına tek açık tarife (Bölüm 1.17.5).
   ParaBirimiKodu NOT NULL olduğu için filtrede IS NOT NULL gerekmez
   (CD-UX-NULL yalnız boş olabilen anahtar kolonu arar). */
CREATE UNIQUE NONCLUSTERED INDEX UX_hakedis_Tarife_AcikGenel
    ON hakedis.Tarife (KalemTuruKodu, ParaBirimiKodu)
    WHERE GecerlilikBitisTarihi IS NULL AND MarkaKodu IS NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_hakedis_Tarife_AcikMarka
    ON hakedis.Tarife (KalemTuruKodu, MarkaKodu, ParaBirimiKodu)
    WHERE GecerlilikBitisTarihi IS NULL AND MarkaKodu IS NOT NULL;
GO
