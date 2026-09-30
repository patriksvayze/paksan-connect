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

/* ------------------------------------------------ Rehberin bütünü

   İLERLEME TEK YERDEN (29 Eylül 2026). Rehber listesi, rehberin kendisi
   ve makine sayfası aynı "kaç madde yapıldı" sayısını gösteriyor; üçü
   de buradan okuyor, yoksa bir gün biri öteki bölümleri saymayı unutur.

   Bölümlerin sırası ekrandakiyle aynı: önce makinenin türüne özel
   bölümler (`grup`: balya, rulo…, bkz. marka → supportGroup), sonra her
   makinede geçerli olanlar. Bölüm kimliği işaret anahtarının parçası;
   değişirse telefonda kalan işaretler kaybolur. */

/**
 * @param {object} rehber  getRehber() sonucu
 * @param {string|null} grup  makinenin destek grubu; makine yoksa null
 * @returns {Array<{bolum: object, kimlik: string, ozel: boolean}>}
 */
export function rehberBolumleri(rehber, grup) {
  if (!rehber) return []
  const ozel = grup
    ? (rehber.gruplar?.[grup] || []).map((bolum, i) => ({ bolum, kimlik: `${grup}-${i}`, ozel: true }))
    : []
  const ortak = (rehber.ortak || []).map((bolum, i) => ({ bolum, kimlik: `ortak-${i}`, ozel: false }))
  return [...ozel, ...ortak]
}

/** Rehberin bu makinede kaç maddesi yapıldı. */
export function rehberIlerlemesi(rehber, makineId, grup, isaretler = isaretleriGetir()) {
  let yapilan = 0
  let toplam = 0
  for (const { bolum, kimlik } of rehberBolumleri(rehber, grup)) {
    bolum.maddeler.forEach((_, i) => {
      toplam += 1
      if (isaretler.includes(maddeAnahtari(makineId, rehber.id, kimlik, i))) yapilan += 1
    })
  }
  return { yapilan, toplam }
}

/** Silinmiş işaretleri geri yazar ("Baştan Başla"nın geri alınması). */
export function isaretleriGeriYukle(liste) {
  const yeni = Array.isArray(liste) ? liste : []
  save(ANAHTAR, yeni)
  return yeni
}

/** Rehberin bu makinedeki bütün işaretlerini siler. */
export function rehberiSifirla(makineId, rehberId) {
  const on = [makineId || 'genel', rehberId, ''].join('|')
  const yeni = isaretleriGetir().filter((x) => !x.startsWith(on))
  save(ANAHTAR, yeni)
  return yeni
}
