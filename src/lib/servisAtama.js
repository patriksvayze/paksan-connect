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

const KAYIT_DEPOSU = 'makineKayitlari'

/** Seri numarasının kayıt defterindeki satırı. */
export function makineninKaydi(seri) {
  const temiz = String(seri || '').trim()
  if (!temiz) return null
  return load(KAYIT_DEPOSU, []).find((k) => String(k.seri || '').trim() === temiz) || null
}

/**
 * Bir makineye bakan servis.
 *
 * @param {{serial?: string}|string} makine makine nesnesi ya da seri numarası
 * @param {'servis'|'parca'} gerekenHizmet
 * @returns {null|{servis: object, kaynak: 'atama'|'bayi', bayi: object|null}}
 */
export function makineninServisi(makine, gerekenHizmet = 'servis') {
  const seri = typeof makine === 'string' ? makine : makine?.serial
  const kayit = makineninKaydi(seri)
  if (!kayit) return null

  const bayi = bayiGetir(kayit.bayiId)

  /* 1. Elle atanmış servis. Hizmeti tutmuyorsa yine de geçerli:
     personel bilerek atadı, kod onu geçersiz kılmıyor. */
  const atanan = servisGetir(kayit.servisId)
  if (atanan) return { servis: atanan, kaynak: 'atama', bayi }

  /* 2. Bayinin servisi. Birden çoksa ilki; hangisinin asıl olduğu
     bugün kayıtta yok (bkz. plan → açık uçlar). */
  const bayidenler = bayininServisleri(kayit.bayiId, gerekenHizmet)
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
export function musterininServisleri(makineler = [], gerekenHizmet = 'servis') {
  const hepsi = []
  for (const m of makineler) {
    const bulunan = makineninServisi(m, gerekenHizmet)
    if (bulunan) hepsi.push({ makine: m, ...bulunan })
  }
  return { ana: hepsi[0]?.servis || null, hepsi }
}

/** Müşteri servis talebi açabilir mi? */
export function servisTalebiAcilabilirMi(makineler = []) {
  return Boolean(musterininServisleri(makineler).ana)
}
