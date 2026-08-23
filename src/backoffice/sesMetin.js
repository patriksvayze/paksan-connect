import { SES_METIN } from '../config'
import { load, save } from '../lib/storage'
import { ANAHTAR, islemYaz } from './veri'

/* ==========================================================================
   Sesli notların yazıya çevrilmiş hâlini toplama — backoffice tarafı

   Müşteri sesli not bıraktığında kayıt n8n akışına gidiyor, orada
   yazıya çevriliyor ve köprü adresine bırakılıyor. Bu dosya köprüden
   gelen metinleri alıp ilgili talebe işliyor
   (bkz. tools/ses-metin-sunucu.mjs).

   NE ZAMAN ÇALIŞIYOR: backoffice zaten açık sekmede düzenli olarak yeni
   iş kontrolü yapıyor; bu kontrol de aynı turda yapılıyor. Ayrı bir
   zamanlayıcı yok.

   KÖPRÜ KAPALIYSA: hiçbir şey olmuyor. Talep ses kaydıyla birlikte
   yerinde duruyor, personel dinleyebiliyor. Bağlantı hatası ekranda
   uyarı üretmiyor — köprü isteğe bağlı bir kolaylık, işin yürümesi
   ona bağlı değil.

   AŞAMA 2'DE: gerçek sunucu geldiğinde metin talebin kendisiyle
   birlikte gelecek ve bu dosya silinecek.
   ========================================================================== */

/* En son hangi kayda kadar alındığı saklanıyor: köprü bütün geçmişi
   tutuyor, her turda hepsini yeniden işlemenin anlamı yok. */
const SON_ANAHTAR = 'sesMetniSon'

export function sesMetniAcikMi() {
  return Boolean(SES_METIN.kopru)
}

/**
 * Köprüden yeni metinleri alır ve taleplere işler.
 *
 * @returns {Promise<number>} işlenen talep sayısı
 */
export async function sesMetinleriniTopla() {
  if (!SES_METIN.kopru) return 0

  const sonra = load(SON_ANAHTAR, 0)

  let kayitlar
  try {
    const yanit = await fetch(`${SES_METIN.kopru}?sonra=${sonra}`, {
      headers: SES_METIN.anahtar ? { 'X-Paksan-Anahtar': SES_METIN.anahtar } : {},
    })
    if (!yanit.ok) return 0
    kayitlar = (await yanit.json())?.kayitlar
  } catch {
    /* Köprü kapalı ya da ulaşılamıyor — sessizce geçiliyor */
    return 0
  }

  if (!Array.isArray(kayitlar) || kayitlar.length === 0) return 0

  let islenen = 0
  let enSon = sonra

  for (const kayit of kayitlar) {
    if (kayit.tarih > enSon) enSon = kayit.tarih
    if (talebeIsle(kayit)) islenen++
  }

  save(SON_ANAHTAR, enSon)
  return islenen
}

/* Metin talep numarasıyla eşleştiriliyor: uygulama ses kaydını n8n'e
   gönderirken `recording_id` alanına talebin numarasını yazıyor. */
function talebeIsle(kayit) {
  for (const depo of [ANAHTAR.talepler, ANAHTAR.demoTalepler]) {
    const liste = load(depo, [])
    const i = liste.findIndex((t) => t.no === kayit.talepNo)
    if (i === -1) continue

    /* Aynı metin ikinci kez gelirse talep boş yere değişmesin */
    if (liste[i].sesMetni?.metin === kayit.metin) return false

    liste[i] = {
      ...liste[i],
      sesMetni: { metin: kayit.metin, dil: kayit.dil || null, tarih: kayit.tarih },
    }
    save(depo, liste)
    islemYaz({
      tur: 'talep',
      ozet: `${kayit.talepNo} · sesli not yazıya çevrildi`,
      personel: 'n8n',
    })
    return true
  }
  return false
}
