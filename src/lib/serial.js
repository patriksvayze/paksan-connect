/* ==========================================================================
   Seri numarası çözümleme

   Paksan seri no biçimi (uygulama için varsayılan):
        MODELKODU - ÜRETİM YILI - SIRA NO
        örn.  ORK1270-2024-00157

   Müşteri seri numarasını nasıl yazarsa yazsın (boşluklu, tireli, küçük
   harf) çalışır. Model kodundan hangi makine olduğunu buluruz — böylece
   satılan ürünü takip edebiliriz.

   NOT: Şirketin gerçek seri no biçimi farklıysa yalnızca bu dosya
   değiştirilir, uygulamanın kalanı aynı kalır.
   ========================================================================== */

import { PRODUCTS } from '../marka'

/** Girilen seri numarasını sadeleştirir: büyük harf, sadece harf+rakam */
export function normalizeSerial(raw) {
  return (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Ekranda güzel görünsün diye tireli hale getirir: ORK1270-2024-00157 */
export function formatSerial(raw) {
  const s = normalizeSerial(raw)
  const match = matchProduct(s)
  if (!match) return s
  const rest = s.slice(match.prefix.length)
  if (rest.length >= 4) {
    return `${match.prefix}-${rest.slice(0, 4)}-${rest.slice(4)}`
  }
  return `${match.prefix}-${rest}`
}

/** Seri numarasının başındaki model kodunu bulur (en uzun eşleşme kazanır) */
export function matchProduct(raw) {
  const s = normalizeSerial(raw)
  let best = null
  for (const p of PRODUCTS) {
    const prefix = normalizeSerial(p.serialPrefix)
    if (s.startsWith(prefix)) {
      if (!best || prefix.length > best.prefix.length) {
        best = { product: p, prefix }
      }
    }
  }
  return best
}

/** Seri numarasından üretim yılını çıkarmaya çalışır */
export function extractYear(raw) {
  const match = matchProduct(raw)
  if (!match) return null
  const rest = normalizeSerial(raw).slice(match.prefix.length)
  const year = parseInt(rest.slice(0, 4), 10)
  const now = new Date().getFullYear()
  if (year >= 1970 && year <= now) return year
  return null
}

/* Hata metinleri değil, sözlük anahtarları. Ekran `t()` ile çeviriyor —
   böylece bu dosya dilden bağımsız kalıyor. */
export const SERIAL_ERRORS = {
  EMPTY: 'ekle.hataBos',
  SHORT: 'ekle.hataKisa',
  UNKNOWN: 'ekle.hataBulunamadi',
}

/**
 * Seri numarasını doğrular.
 * @returns {{ok: true, product, serial, year} | {ok: false, error: string}}
 */
export function validateSerial(raw) {
  const s = normalizeSerial(raw)
  if (!s) return { ok: false, error: SERIAL_ERRORS.EMPTY }
  if (s.length < 8) return { ok: false, error: SERIAL_ERRORS.SHORT }

  const match = matchProduct(s)
  if (!match) return { ok: false, error: SERIAL_ERRORS.UNKNOWN }

  return {
    ok: true,
    product: match.product,
    serial: s,
    year: extractYear(s),
  }
}

/** Garanti durumu — satın alma/üretim yılına göre (varsayılan 2 yıl) */
export const GARANTI_YIL = 2

/* Etiket metni dil sözlüğünden geliyor: bu fonksiyon `t` alıyor.
   `t` verilmezse Türkçe anahtarlar dönüyor — eski çağrılar bozulmasın. */
export function warrantyStatus(year, t) {
  const yaz = (anahtar, degerler) =>
    (t ? t('makine.' + anahtar, degerler) : anahtar)

  if (!year) return { state: 'bilinmiyor', label: yaz('garantiYok'), tone: '' }
  const now = new Date().getFullYear()
  const bitis = year + GARANTI_YIL // garanti bu yılın sonuna kadar sürer
  const kalan = bitis - now

  if (kalan > 0) {
    return { state: 'devam', label: yaz('garantiDevam', { n: kalan }), tone: 'green' }
  }
  if (kalan === 0) {
    return { state: 'son', label: yaz('garantiSonYil'), tone: 'orange' }
  }
  return { state: 'bitti', label: yaz('garantiBitti'), tone: 'orange' }
}

/** Demo/test için örnek seri numaraları */
export const ORNEK_SERILER = [
  { serial: 'ORK1270-2024-00157', label: 'Orkinos 1270' },
  { serial: 'SYNS-2023-00891', label: 'Super Yunus' },
  { serial: 'DMD-2025-00042', label: 'Diamond' },
  { serial: 'IPAK-2022-01120', label: 'i-Pak' },
]
