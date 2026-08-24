import bakimGoz from '../assets/gorseller/bakim-goz.png'
import bakimGres from '../assets/gorseller/bakim-gres.png'
import bakimCivata from '../assets/gorseller/bakim-civata.png'
import bakimTemizlik from '../assets/gorseller/bakim-temizlik.png'

/* ==========================================================================
   Bakım rehberi bölüm çizimleri

   Rehberlerdeki bölümler düz yazı başlıklarıydı. Bakımı ilk kez yapan
   ya da okuması zor olan biri için, o bölümün hangi işi anlattığını
   yazıyı çözmeden görmek işe yarıyor.

   DÖRT İŞ, ON BEŞ BÖLÜM

   Üç rehberde on beşten fazla bölüm var ama hepsi dört temel işe
   iniyor: bakmak, greslemek, sıkmak, temizlemek. Her bölüme ayrı çizim
   üretmek yerine bu dördü eşleştirildi; aynı iş her rehberde aynı
   çizimle görünüyor, kullanıcı çizimi bir kere öğreniyor.

   EŞLEŞME BAŞLIKTAN

   Rehber metni `src/data/rehber.js` içinde ve başlıklar iki dilde
   değişiyor. Eşleşme TÜRKÇE başlığın anahtar kelimesine bakıyor —
   İngilizce başlıkla eşleştirilseydi hiçbiri tutmazdı. Karşılığı
   olmayan bölüm çizimsiz kalıyor, o da sorun değil.
   ========================================================================== */

const KURALLAR = [
  { cizim: bakimGoz, kelimeler: ['göz', 'gözden', 'kontrol', 'deneme'] },
  { cizim: bakimGres, kelimeler: ['gres', 'yağ'] },
  { cizim: bakimCivata, kelimeler: ['bağlantı', 'emniyet', 'aşınma', 'depodan'] },
  { cizim: bakimTemizlik, kelimeler: ['temizle', 'temizlik', 'koruma', 'depola'] },
]

/** Bölüm başlığına karşılık gelen çizim; yoksa null. */
export function bakimCizimi(baslikTr) {
  if (!baslikTr) return null
  const b = String(baslikTr).toLocaleLowerCase('tr')
  for (const k of KURALLAR) {
    if (k.kelimeler.some((x) => b.includes(x))) return k.cizim
  }
  return null
}
