import { IHRACAT, UYGULAMA } from '../marka'
import { ulkeAdi } from '../data/ulkeler'
import { getProduct } from '../marka'
import { TALEP_TURLERI } from './talep'

/* ==========================================================================
   Yurtdışı talepleri

   NEDEN AYRI BİR YOL

   PAKSAN altı kıtaya ihracat yapıyor ve yurtdışındaki iş Türkiye'deki
   işten başka yürüyor:

     · Servisi yerel distribütör veriyor, PAKSAN'ın servis ekibi
       uçmuyor.
     · Yedek parça gümrükten geçiyor; kargo, fatura ve ödeme koşulları
       yurt içindekiyle aynı değil.
     · Fiyat teklifi ihracat fiyat listesinden, döviz üzerinden
       veriliyor.

   Bu yüzden yurtdışından gelen talep backoffice’e DÜŞMÜYOR: servis ekibinin
   ekranında yapamayacağı bir iş, satış ekibinin ekranında yanlış fiyat
   listesinden cevaplanacak bir talep birikmesin. Talep, ihracat
   ekibinin e-postasına gidiyor ve kayda geçiyor.

   NASIL ANLAŞILIYOR

   Kullanıcının KONUM ülkesine bakılıyor, telefon ülkesine değil.
   Almanya'da yaşayan ve Türk numarası taşıyan müşteri yurtdışı
   müşterisidir; makine Almanya'dadır, servisi oradan verilecektir.
   Konum yoksa telefon ülkesine düşülüyor.

   ŞU AN NE ÇALIŞIYOR

   Talebin yurtdışı olduğunun tespiti, işaretlenmesi ve backoffice’ten
   gizlenmesi çalışıyor. E-postanın kendisi sunucu tarafında
   gönderilecek; buradaki `ihracatPostasi` o e-postanın gövdesini
   üretiyor ve talebin yanında sunucuya gidiyor, böylece sunucu
   tarafında ikinci bir şablon yazılmasına gerek kalmıyor.
   ========================================================================== */

/** Talep yurtdışından mı geliyor? */
export function yurtdisiTalepMi(kullanici) {
  if (!IHRACAT.aktif) return false
  const ulke = kullanici?.konumUlke || kullanici?.ulke
  return Boolean(ulke) && ulke !== 'TR'
}

/** Talebin ülkesi — kayıtta ve e-postada kullanılıyor. */
export function talepUlkesi(kullanici) {
  return kullanici?.konumUlke || kullanici?.ulke || 'TR'
}

/* --------------------------------------------------------------- E-posta

   Şablon sade tutuldu: ihracat ekibi bunu telefonda da açacak, tabloya
   dayalı karmaşık düzenler e-posta istemcilerinde bozuluyor. Tek
   sütun, açık başlıklar, üstte özet.

   İngilizce yazılıyor: ihracat ekibi yazışmayı müşteriye
   iletebilsin. */

const TUR_EN = {
  servis: 'Service request',
  parca: 'Spare part request',
  satinalma: 'Price quote request',
}

function satir(etiket, deger) {
  if (!deger) return ''
  return `<tr>
      <td style="padding:6px 14px 6px 0;color:#55617a;font-size:13px;white-space:nowrap;vertical-align:top">${kacir(etiket)}</td>
      <td style="padding:6px 0;font-size:14px;color:#0f1c33">${kacir(deger)}</td>
    </tr>`
}

/* Müşterinin yazdığı metin e-postaya gömülüyor; HTML olarak
   yorumlanmamalı. */
function kacir(deger) {
  return String(deger ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * İhracat ekibine gidecek e-postayı hazırlar.
 *
 * @param {object} talep uygulamanın ürettiği talep kaydı
 * @returns {{konu, alicilar, html, metin}}
 */
export function ihracatPostasi(talep) {
  const turAdi = TUR_EN[talep.tur] || 'Request'
  const ulke = ulkeAdi(talep.ulke || 'TR', 'en')
  const urun = talep.urunId ? getProduct(talep.urunId)?.name : null
  const makine = talep.makine ? getProduct(talep.makine.productId)?.name : null

  const konu = `[${TALEP_TURLERI[talep.tur]?.onek || 'REQ'}] ${turAdi} · ${ulke} · ${talep.no}`

  const parcalar = (talep.parcalar || [])
    .map((p) => {
      const adet = talep.parcaAdet?.[p]
      return adet > 1 ? `${p} x ${adet}` : p
    })
    .join(', ')

  const satirlar = [
    satir('Request no', talep.no),
    satir('Type', turAdi),
    satir('Country', ulke),
    satir('Customer', talep.ad),
    satir('Phone', talep.tel),
    satir('Location', [talep.ilce, talep.il].filter(Boolean).join(', ')),
    satir('Machine', makine),
    satir('Serial no', talep.makine?.serial),
    satir('Product of interest', urun),
    satir('Symptoms', (talep.belirtiler || []).join(', ')),
    satir('Parts requested', parcalar),
    satir('Preferred call time', talep.ulasim),
    satir('Voice note', talep.ses?.veri ? `Yes (${talep.ses.sure}s) — see the app record` : ''),
    satir('Attachments', (talep.ekler || []).length ? `${talep.ekler.length} file(s)` : ''),
  ].join('')

  const html = `<!doctype html>
<html lang="en"><body style="margin:0;background:#eef1f6;padding:24px 12px;font-family:Roboto,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e2e7f0">
    <div style="background:#0a1a33;color:#fff;padding:20px 24px">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.75">${kacir(UYGULAMA)} · Export</div>
      <div style="font-size:20px;font-weight:700;margin-top:4px">${kacir(turAdi)}</div>
      <div style="font-size:14px;opacity:.85;margin-top:2px">${kacir(ulke)} · ${kacir(talep.no)}</div>
    </div>

    <div style="padding:22px 24px">
      <table style="border-collapse:collapse;width:100%">${satirlar}</table>

      ${
        talep.aciklama
          ? `<div style="margin-top:20px;padding:14px 16px;background:#f6f8fb;border-radius:8px">
               <div style="font-size:12px;color:#55617a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Customer message</div>
               <div style="font-size:14px;line-height:1.6;color:#0f1c33;white-space:pre-wrap">${kacir(talep.aciklama)}</div>
             </div>`
          : ''
      }

      <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#55617a">
        This request was submitted from the ${kacir(UYGULAMA)} app by a customer located outside
        Türkiye. It has been routed to the export team and does not appear in the domestic
        backoffice queue.
      </p>
    </div>
  </div>
</body></html>`

  const metin = [
    turAdi,
    `Request no: ${talep.no}`,
    `Country: ${ulke}`,
    `Customer: ${talep.ad} · ${talep.tel}`,
    [talep.ilce, talep.il].filter(Boolean).join(', '),
    makine ? `Machine: ${makine} (${talep.makine?.serial || ''})` : '',
    urun ? `Product of interest: ${urun}` : '',
    parcalar ? `Parts: ${parcalar}` : '',
    talep.aciklama ? `\nCustomer message:\n${talep.aciklama}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return { konu, alicilar: IHRACAT.epostalar, html, metin }
}
