import { PARCA_KODU } from '../data/icerik/destekVerisi'
import { getProduct, supportGroup } from '../data/katalog/products.js'
import { parcaBul } from './parcaKatalogu'

/* ==========================================================================
   Destek'teki parça adının katalogdaki karşılığı — tek yerden

   Destek'in "Gerekebilecek parçalar" listesi çiftçinin diliyle yazılmış
   adlar taşıyor ("Mekik dili"); katalogda aynı parça PAKSAN'ın adıyla
   ("MEKİK DİLİ KOMPLE") duruyor. Çeviri markanın tablosunda
   (data/icerik/destekVerisi.js → PARCA_KODU) ve yalnız o parçanın uyduğu
   makinede geçerli.

   İKİ EKRAN AYNI CEVABI VERMELİ (8 Ekim 2026, kullanıcının isteği:
   "Gerekebilecek Parçalar kısmında parçanın görseli olsun, talep etmek
   istersem yedek parça ekranında ilgili parça direkt seçili gelsin").
   Destek ekranı parçanın görselini bu işlevle buluyor, talep formu
   (screens/RequestForm.jsx) seçili getireceği parçayı da bu işlevle.
   Önce çeviri yalnız formdaydı; ikisi ayrı yazılsaydı Destek'te görseli
   görünen parça formda seçili gelmeyebilirdi ya da tersi.

   Personelin gizlediği ya da yeni fiyat listesinde kalkan parça
   bulunmuyor (parcaBul): görseli de çıkmıyor, seçili de gelmiyor.

   @param {string} ad  Destek'teki parça adı (Türkçe, tablonun anahtarı)
   @param {string|null} urunId  makinenin ürün kimliği
   @param {object|null} katalog  katalogGetir() sonucu
   @returns {{parca: object, urunler: string[]}|null}
   ========================================================================== */
export function destekParcasi(ad, urunId, katalog) {
  if (!ad || !urunId || !katalog) return null
  const tablo = PARCA_KODU[supportGroup(getProduct(urunId))]
  const karsilik = tablo?.[ad]
  if (!karsilik || !karsilik.urunler.includes(urunId)) return null
  const parca = parcaBul(katalog, karsilik.kod)
  return parca ? { parca, urunler: karsilik.urunler } : null
}
