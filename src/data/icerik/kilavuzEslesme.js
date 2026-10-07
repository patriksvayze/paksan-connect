/* ==========================================================================
   Ürün → kullanım kılavuzu

   Uygulamadaki ürün kimliğini, o ürünün kullanım kılavuzunun koduna
   bağlar. Kılavuzun kendisi (PDF) sunucudaki kılavuz klasöründe;
   klasörün listesi (`kilavuzlar.json`) her kılavuzu bu kodla tanıyor
   (bkz. src/lib/kilavuzPdf.js, sunucu-taklidi/BENIOKU.md). Bir kılavuz
   birden çok modeli kapsıyor: altı Süper modelin kılavuzu aynı.

   Kodlar, önceki düzendeki kılavuz veri paketinin kapsam kodları
   (29 Eylül 2026'ya kadar kılavuz ekranları o paketten kuruluyordu).
   Veritabanında da aynı kod duruyor (katalog.Urun.KilavuzKapsamKodu,
   tohum: tools/vt/tohum-uret.mjs); kod değişirse tohum yeniden üretilir.

   NEDEN AYRI DOSYA

   Tablonun iki tarafı da PAKSAN'ın verisi: soldaki ürün kimlikleri
   katalogdan, sağdaki kodlar kılavuzlardan. Yeni kılavuz gelince yalnız
   bu tablo değişir.

   Bir ürün burada yoksa kılavuzu yok sayılıyor: Kılavuzlar listesinde
   görünmüyor, ürün ve makine sayfalarında kılavuz düğmesi çıkmıyor.

   YENİ FİRMA NE YAPACAK

   Kılavuz PDF'lerini sunucudaki klasöre koyup listesini yazıyor, bu
   tabloyu kendi ürün kimlikleriyle ve listedeki kodlarla dolduruyor.
   Tablo boş bırakılırsa uygulama çalışmaya devam ediyor, yalnızca
   Kılavuzlar ekranı boş görünüyor.
   ========================================================================== */

export const URUN_KILAVUZU = {
  hammer: 'MCH_HAMMER_SERIES',

  'super-8002': 'MCH_PAKSAN_BALYA_SUPER',
  'super-8002e': 'MCH_PAKSAN_BALYA_SUPER',
  'super-8002e-dual2': 'MCH_PAKSAN_BALYA_SUPER',
  'super-yunus': 'MCH_PAKSAN_BALYA_SUPER',
  'super-yunus-dual2': 'MCH_PAKSAN_BALYA_SUPER',
  'super-yunus-3yabali': 'MCH_PAKSAN_BALYA_SUPER',

  'orka-870': 'MCH_ORKA_870',
  'ipak-rulo': 'MCH_IPAK_ROUND_BALER',
}
