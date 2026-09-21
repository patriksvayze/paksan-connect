/* ==========================================================================
   MÜŞTERİNİN SERVİSİ KİM

   Bu dosya tek bir soruya cevap veriyor ve o soruyu cevaplayan başka
   yer yok: bir makineye — dolayısıyla o makinenin sahibine — hangi
   servis bakıyor?

   NEDEN COĞRAFYA DEĞİL

   Eskiden müşteri talep açtığı anda sistem, ilinden ilçesinden bir
   servis buluyor ve talebi ona düşürüyordu. Bu yanlıştı: servis işini
   bayiye değil PAKSAN'a raporluyor ve hak edişini PAKSAN'dan alıyor.
   Kime iş verdiğini bilmeyen bir taraf, o işin parasını ödeyemez.

   Bugün zincir şu ve ikisi de bir KAYDA dayanıyor, tahmine değil:

     1. Makineye doğrudan atanmış servis
        Personel backoffice'ten seçti ya da LOGO'dan geldi.

     2. Makineyi satan bayinin çalıştığı servis
        Bayilerin çoğunun kendi servisi yok; anlaştıkları servise
        yönlendiriyorlar. Bağ servis kaydında duruyor
        (bkz. marka/katalog/servisler.js → bayiler).

   İkisi de boşsa cevap YOK. Uydurulmuş bir servis, servissizlikten
   kötü: müşteri yanlış kapıyı çalar, servis kendisine düşen işi
   tanımaz, PAKSAN kimin hak ettiğini bilemez.

   CEVAP YOKSA NE OLUYOR

   Müşteri servis talebi açamıyor; uygulama PAKSAN'la iletişime
   geçmesini söylüyor (bkz. screens/RequestForm.jsx). Bu bir eksiklik
   değil, kasıtlı bir kapı: atama PAKSAN'ın kararı.
   ========================================================================== */

import { load } from './storage'
import { bayininServisleri, servisGetir, bayiGetir } from '../marka'
import { normalizeSerial } from './serial'

const KAYIT_DEPOSU = 'makineKayitlari'

/* Seri numarasının kayıt defterindeki satırı.

   NORMALİZE EDİLEREK ARANIYOR. Defter seriyi GELDİĞİ GİBİ saklıyor
   (lib/makineKaydi.js:160 → `seri: makine.serial`); aynı defteri okurken
   karşılaştırmayı `normalizeSerial` ile yapıyor (:75, :84). Burada ise bir
   dönem yalnız `.trim()` vardı — yani tek defteri iki ayrı kuralla okuyan
   iki dosya. Sonucu ölçüldü: `ORK1270-2024-00157` servise bağlanıyor,
   `ork1270-2024-00157` null dönüyor ve o müşteri servis talebi AÇAMIYOR.
   Artık iki taraf da aynı kuralı kullanıyor: büyük harfe çevir, harf ve
   rakam dışındaki her şeyi at. */
export function makineninKaydi(seri) {
  const temiz = normalizeSerial(seri)
  if (!temiz) return null
  return load(KAYIT_DEPOSU, []).find((k) => normalizeSerial(k.seri) === temiz) || null
}

/**
 * Bir makineye bakan servis.
 *
 * @param {{serial?: string}|string} makine makine nesnesi ya da seri numarası
 * @returns {null|{servis: object, kaynak: 'atama'|'bayi', bayi: object|null}}
 */
export function makineninServisi(makine) {
  const seri = typeof makine === 'string' ? makine : makine?.serial
  const kayit = makineninKaydi(seri)
  if (!kayit) return null

  const bayi = bayiGetir(kayit.bayiId)

  /* 1. Elle atanmış servis: personel bilerek atadı. */
  const atanan = servisGetir(kayit.servisId)
  if (atanan) return { servis: atanan, kaynak: 'atama', bayi }

  /* 2. Bayinin servisi. Birden çoksa ilki; hangisinin asıl olduğu
     bugün kayıtta yok (bkz. plan → açık uçlar). */
  const bayidenler = bayininServisleri(kayit.bayiId)
  if (bayidenler.length) return { servis: bayidenler[0], kaynak: 'bayi', bayi }

  return null
}

/**
 * Müşterinin servisi — makinelerinden çıkarılıyor.
 *
 * Birden çok makinesi varsa ve hepsine aynı servis bakıyorsa cevap
 * tek. Farklı servisler çıkıyorsa `hepsi` dolu dönüyor ve ekran
 * hangisinin hangi makineye baktığını gösterebiliyor.
 *
 * @returns {{ana: object|null, hepsi: Array<{makine, servis, kaynak, bayi}>}}
 */
export function musterininServisleri(makineler = []) {
  const hepsi = []
  for (const m of makineler) {
    const bulunan = makineninServisi(m)
    if (bulunan) hepsi.push({ makine: m, ...bulunan })
  }
  return { ana: hepsi[0]?.servis || null, hepsi }
}

/** Müşteri servis talebi açabilir mi? */
export function servisTalebiAcilabilirMi(makineler = []) {
  return Boolean(musterininServisleri(makineler).ana)
}
