/* ==========================================================================
   Seri numarası çözümleme

   Paksan seri no biçimi (uygulama için varsayılan; biçimin adı
   `onekYilSira`, PLAN-COKLU-MARKA.md ve veritabanındaki
   kod.SeriKurali ile aynı ad):
        MODELKODU - ÜRETİM YILI (4 hane) - SIRA NO (5 hane)
        örn.  ORK1270-2024-00157

   Müşteri seri numarasını nasıl yazarsa yazsın (boşluklu, tireli, küçük
   harf) çalışır. Model kodundan hangi makine olduğunu buluruz — böylece
   satılan ürünü takip edebiliriz.

   MODEL KODUNDAN SONRASI DA DENETLENİYOR (25 Eylül 2026, kullanıcı
   sınaması Y2). Doğrulama yalnız model koduna bakıyordu: bir hanesi
   eksik ("SYNS2024 0318") ya da O ile 0'ı karışık ("SYNS2O24 00318")
   numara "makine bulundu" diyor, makine bozuk seriyle kaydediliyor,
   yılı okunamadığı için garantisi "bilinmiyor" görünüyordu. Artık
   model kodundan sonra tam 4 haneli bir üretim yılı ve 5 haneli sıra
   numarası bekleniyor; etiketi okuyan kişinin O ile 0'ı, I ile 1'i
   karıştırması kendiliğinden düzeltiliyor (seriDuzelt).

   NOT: Şirketin gerçek seri no biçimi farklıysa yalnızca bu dosya
   değiştirilir, uygulamanın kalanı aynı kalır: iki hane sayısı
   (SERI_YIL_HANE, SERI_SIRA_HANE) ve seriDuzelt.
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
  /* Model kodu tanındı ama arkası biçime uymuyor: hane fazla, rakam
     yerine harf ya da yıl geçersiz. Metin {model} ve {ornek} alıyor. */
  FORMAT: 'ekle.hataBicim',
}

/** Model kodundan sonraki üretim yılı ve sıra numarası kaç hane. */
export const SERI_YIL_HANE = 4
export const SERI_SIRA_HANE = 5

/**
 * Seriyi sadeleştirir ve model kodundan SONRAKİ kısımdaki O'yu 0'a,
 * I'yı 1'e çevirir: önekten sonrası yalnız rakam olabilir, etiketi
 * okuyan kişi bu harfleri karıştırıyor. Model kodunun kendi harflerine
 * dokunulmaz ("0RK1270…" düzeltilmez, tanınmaz). Model kodu
 * tanınmazsa sadeleştirilmiş yazı olduğu gibi döner.
 */
export function seriDuzelt(raw) {
  const s = normalizeSerial(raw)
  const eslesme = matchProduct(s)
  if (!eslesme) return s
  return eslesme.prefix + s.slice(eslesme.prefix.length).replace(/O/g, '0').replace(/I/g, '1')
}

/**
 * Seri numarasını doğrular.
 *
 * Model kodundan sonra SERI_YIL_HANE haneli yıl ve SERI_SIRA_HANE haneli
 * sıra numarası bekleniyor. Yıl 1970'ten önce ya da bu yıldan sonra
 * olamaz. Dönen `serial` düzeltilmiş (seriDuzelt) ve sadeleştirilmiş
 * yazı; kayda bu yazılır.
 *
 * Hata dönüşünde model kodu tanındıysa `product` ve ekranda
 * gösterilecek doğru biçimli bir `ornek` de geliyor: kullanıcıya
 * "eksik ya da hatalı" demekle kalmayıp nasıl yazılacağını gösterir.
 *
 * @returns {{ok: true, product, serial, year} | {ok: false, error: string, product?, ornek?: string}}
 */
export function validateSerial(raw) {
  const s = normalizeSerial(raw)
  if (!s) return { ok: false, error: SERIAL_ERRORS.EMPTY }

  const eslesme = matchProduct(s)
  if (!eslesme) return { ok: false, error: s.length < 8 ? SERIAL_ERRORS.SHORT : SERIAL_ERRORS.UNKNOWN }

  const serial = seriDuzelt(s)
  const kalan = serial.slice(eslesme.prefix.length)
  const hane = SERI_YIL_HANE + SERI_SIRA_HANE
  const hata = (error) => ({
    ok: false,
    error,
    product: eslesme.product,
    ornek: formatSerial(eslesme.prefix + '202400157'),
  })

  /* Yalnız rakam ama az: yazarken eksik kalmış. "Eksik" demek, "biçim
     tutmuyor" demekten yol gösterici. */
  if (/^[0-9]*$/.test(kalan) && kalan.length < hane) return hata(SERIAL_ERRORS.SHORT)
  if (kalan.length !== hane || !/^[0-9]+$/.test(kalan)) return hata(SERIAL_ERRORS.FORMAT)

  const year = extractYear(serial)
  if (!year) return hata(SERIAL_ERRORS.FORMAT)

  return { ok: true, product: eslesme.product, serial, year }
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
  /* Süresi dolmuş garanti nötr (29 Eylül 2026, görünüm önerisi C2):
     "son yılı" ile aynı turuncudaydı; biri dikkat, öteki yalnız bilgi.
     Tonu yalnız Connect okuyor (badge--gri, makine-garanti--gri). */
  return { state: 'bitti', label: yaz('garantiBitti'), tone: 'gri' }
}

/** Demo/test için örnek seri numaraları */
export const ORNEK_SERILER = [
  { serial: 'ORK1270-2024-00157', label: 'Orkinos 1270' },
  { serial: 'SYNS-2023-00891', label: 'Super Yunus' },
  { serial: 'DMD-2025-00042', label: 'Diamond' },
  { serial: 'IPAK-2022-01120', label: 'i-Pak' },
]
