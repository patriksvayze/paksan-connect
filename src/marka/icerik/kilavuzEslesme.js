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

/* ---------------------------------------------- İngilizce ekrandaki adlar

   Kılavuz paketindeki model ve belge adları tek dilli (Türkçe). Türkçe
   ekranda paketteki ad olduğu gibi görünüyor; İngilizce ekranda
   aşağıdaki karşılık. Ürün adındaki "Süper" katalogdaki gibi "Super"
   yazılıyor (bkz. katalog/products.en.js). Karşılığı yoksa paketteki ad
   gösteriliyor. */
export const KILAVUZ_MODEL_AD_EN = {
  'Hammer 2 İpli Haşpaysız': 'Hammer 2-Twine, without Chopper',
  'Hammer 3 İpli Haşpaysız': 'Hammer 3-Twine, without Chopper',
  'Süper S8002 2 İpli Haşpaysız': 'Super S8002 2-Twine, without Chopper',
  'Süper S8002E 2 İpli Haşpaysız Ekstra': 'Super S8002E 2-Twine, without Chopper, Extra',
  'Süper S8002E 3 İpli Haşpaysız Ekstra': 'Super S8002E 3-Twine, without Chopper, Extra',
  'Süper S8002E 3 İpli Haşpaylı Ekstra': 'Super S8002E 3-Twine, with Chopper, Extra',
  'Süper YUNUS 2 İpli Haşpaysız': 'Super YUNUS 2-Twine, without Chopper',
  'Süper YUNUS 3 İpli Haşpaysız': 'Super YUNUS 3-Twine, without Chopper',
  'Süper YUNUS 3 İpli Haşpaylı': 'Super YUNUS 3-Twine, with Chopper',
  'I-PAK YUVARLAK BALYA MAKİNESİ': 'I-PAK ROUND BALER',
  'ORKA 870 4 İPLİ BÜYÜK BALYA MAKİNESİ': 'ORKA 870 4-TWINE LARGE SQUARE BALER',
}

export const KILAVUZ_BELGE_AD_EN = {
  'HAMMER KULLANIM KILAVUZU': 'HAMMER USER MANUAL',
  'ORKA KULLANIM KILAVUZU': 'ORKA USER MANUAL',
  'PAKSAN BALYA KULLANIM KILAVUZU': 'PAKSAN BALER USER MANUAL',
  'TWIN HAMMER KULLANIM KILAVUZU': 'TWIN HAMMER USER MANUAL',
  'YUVARLAK BALYA KULLANIM KILAVUZU': 'ROUND BALER USER MANUAL',
}
