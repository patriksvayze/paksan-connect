/* ==========================================================================
   Ürün → kılavuz eşleşmesi

   Uygulamadaki ürün kimliğini, kılavuz paketindeki kapsam kaydına
   bağlar. Kapsam kaydı, bir kılavuzun kapsadığı bütün modelleri toplayan
   iç kayıttır (bkz. src/lib/destek.js); güvenlik ve prosedür kayıtları o
   kayda bağlı olduğu için eşleştirme kapsam üzerinden yapılıyor.

   NEDEN MARKA KLASÖRÜNDE

   Tablonun iki tarafı da firmaya ait: Soldaki ürün kimlikleri
   katalogdan, sağdaki kapsam kimlikleri kılavuz paketinden geliyor.
   Motorda durduğu sürece yeni firma, kendi kılavuzlarını bağlamak için
   motor dosyasını değiştirmek zorunda kalırdı.

   Bir ürün burada yoksa Kılavuzlar ekranında görünmüyor — kılavuzu
   olmayan modelin listede boş satır açması istenmiyor.

   YENİ FİRMA NE YAPACAK

   Kendi kılavuz paketini `mobile_support_package.json` olarak koyup bu
   tabloyu kendi ürün kimlikleriyle dolduruyor. Tablo boş bırakılırsa
   uygulama çalışmaya devam ediyor, yalnızca Kılavuzlar ekranı boş
   görünüyor.
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
