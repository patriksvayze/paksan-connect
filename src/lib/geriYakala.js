import { useEffect } from 'react'

/* ==========================================================================
   Geri hareketini yakalama

   Android'in geri tuşu ve kenardan kaydırma hareketi normalde bir
   önceki SAYFAYA götürüyor (bkz. src/lib/android.js). Ama bazı
   ekranlarda "geri" bir önceki sayfa değil, bir önceki ADIM demek:
   yedek parça talebinde fatura ekranındayken geri, talep formuna
   dönmeli — uygulamadan çıkıp doldurulan her şeyi kaybetmeye değil.

   Ekranlar buraya geçici bir yakalayıcı bırakıyor. En son bırakılan
   çalışıyor (yığın), ekrandan çıkarken kendiliğinden kalkıyor.

   Yakalayıcı `false` döndürürse "ben ilgilenmedim" demektir ve geri
   normal işini yapar.
   ========================================================================== */

const yigin = []

export function geriYakalayiciEkle(fn) {
  yigin.push(fn)
  return () => {
    const i = yigin.indexOf(fn)
    if (i !== -1) yigin.splice(i, 1)
  }
}

/** Geri hareketi bir ekran tarafından karşılandı mı? */
export function geriYakalandiMi() {
  const son = yigin[yigin.length - 1]
  if (!son) return false
  return son() !== false
}

/**
 * @param {boolean} aktif yakalayıcı şu an geçerli mi
 * @param {Function} fn geri gelince çalışacak iş
 */
export function useGeriYakala(aktif, fn) {
  useEffect(() => {
    if (!aktif) return undefined
    return geriYakalayiciEkle(fn)
  }, [aktif, fn])
}
