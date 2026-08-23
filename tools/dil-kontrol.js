/* ==========================================================================
   Dil kontrolü — eksik çeviri var mı?

   Tarayıcı konsolunda çalıştırın (uygulama açıkken):

     const m = await import('/src/i18n/tr.js')
     const e = await import('/src/i18n/en.js')
     // sonra bu dosyadaki fonksiyonu yapıştırıp çağırın

   Ya da geliştirirken doğrudan:
     import { eksikCeviriler } from '../tools/dil-kontrol'
     console.table(eksikCeviriler(tr, en))

   Ne yapar: Türkçe sözlükteki her anahtarın İngilizce karşılığı var mı
   diye bakar. Olmayanları listeler. Uygulama eksik anahtarda Türkçesini
   gösterdiği için ekran bozulmaz; bu araç sadece "nerede eksik kaldık"
   sorusunu cevaplar.
   ========================================================================== */

export function eksikCeviriler(tr, en, onEk = '') {
  const eksik = []

  for (const [anahtar, deger] of Object.entries(tr)) {
    const yol = onEk ? `${onEk}.${anahtar}` : anahtar
    const karsilik = en?.[anahtar]

    if (deger && typeof deger === 'object' && !Array.isArray(deger)) {
      eksik.push(...eksikCeviriler(deger, karsilik || {}, yol))
      continue
    }

    if (karsilik == null) {
      eksik.push({ anahtar: yol, turkce: String(deger).slice(0, 60) })
    }
  }

  return eksik
}

/* Fazlalık: İngilizcede olup Türkçede olmayan anahtarlar. Genelde bir
   anahtar yeniden adlandırıldığında kalan artıktır. */
export function fazlaCeviriler(tr, en, onEk = '') {
  const fazla = []

  for (const [anahtar, deger] of Object.entries(en)) {
    const yol = onEk ? `${onEk}.${anahtar}` : anahtar
    const karsilik = tr?.[anahtar]

    if (deger && typeof deger === 'object' && !Array.isArray(deger)) {
      fazla.push(...fazlaCeviriler(karsilik || {}, deger, yol))
      continue
    }

    if (karsilik == null) fazla.push({ anahtar: yol })
  }

  return fazla
}
