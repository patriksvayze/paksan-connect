import { load, save } from './storage'

/* ==========================================================================
   Bakım rehberinde işaretlenen maddeler

   Çiftçi bakımı tek oturuşta bitirmiyor: birkaç maddeyi yapıyor,
   traktöre biniyor, akşam devam ediyor. Nerede kaldığını hatırlamak
   zorunda kalmasın diye işaretler telefonda saklanıyor.

   ANAHTAR NEDEN BÖYLE

   Bir madde şu dördünün birleşimiyle tekilleşiyor:

       makine | rehber | bölüm | maddenin sırası

   Makine de anahtarın içinde, çünkü aynı rehber iki makinede ayrı ayrı
   yapılıyor: Hammer'ın günlük greslemesini yapmış olmak i-Pak'ınkini
   yapmış saymaz.

   METİN DEĞİL SIRA saklanıyor. Madde metni dile göre değişiyor;
   metinle saklansaydı kullanıcı dili değiştirdiğinde bütün işaretler
   kaybolurdu.

   SIFIRLAMA

   Günlük bakım her gün yeniden yapılıyor ama işaretler kendiliğinden
   silinmiyor — hangi gün neyin yapıldığını uygulama bilemez, tarlada
   çalışılmayan günler de var. Bölüm tamamlandığında "yeniden başlat"
   düğmesi çıkıyor, temizlemek kullanıcının elinde.
   ========================================================================== */

const ANAHTAR = 'rehberIsaret'

/** Bir maddenin anahtarı. */
export function maddeAnahtari(makineId, rehberId, bolumKimlik, sira) {
  return [makineId || 'genel', rehberId, bolumKimlik, sira].join('|')
}

export function isaretleriGetir() {
  const x = load(ANAHTAR, [])
  return Array.isArray(x) ? x : []
}

/** İşareti koyar ya da kaldırır, yeni listeyi döndürür. */
export function isaretiCevir(anahtar) {
  const liste = isaretleriGetir()
  const yeni = liste.includes(anahtar)
    ? liste.filter((x) => x !== anahtar)
    : [...liste, anahtar]
  save(ANAHTAR, yeni)
  return yeni
}

/** Bir bölümün bütün işaretlerini siler. */
export function bolumuSifirla(makineId, rehberId, bolumKimlik) {
  const on = maddeAnahtari(makineId, rehberId, bolumKimlik, '')
  const yeni = isaretleriGetir().filter((x) => !x.startsWith(on))
  save(ANAHTAR, yeni)
  return yeni
}
