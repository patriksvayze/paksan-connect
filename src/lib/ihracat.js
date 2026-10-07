import { IHRACAT, UYGULAMA } from '../data/kimlik.js'
import { PARA_BIRIMI, paraYaz } from '../data/katalog/para.js'
import { ulkeAdi } from '../data/ulkeler'
import { getProduct } from '../data/katalog/products.js'
import { TALEP_TURLERI } from './talep'
import { talebinParcalari } from './servisKaydi'

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

/* Birden çok satırlı değer — parça listesi gibi.

   Parça listesi virgülle tek satıra dizilince okunmuyordu; kod, ad,
   adet ve tutar birbirine giriyor. Her parça kendi satırında; hücre
   düzeni `satir()` ile aynı kalıyor, e-posta istemcilerinde bozulan bir
   şey eklenmiyor. Satırlar tek tek kaçırılıyor, `<br>` dışarıdan
   konuyor. */
function satirCok(etiket, satirlar) {
  const liste = (satirlar || []).filter(Boolean)
  if (!liste.length) return ''
  return `<tr>
      <td style="padding:6px 14px 6px 0;color:#55617a;font-size:13px;white-space:nowrap;vertical-align:top">${kacir(etiket)}</td>
      <td style="padding:6px 0;font-size:14px;color:#0f1c33;line-height:1.6">${liste.map(kacir).join('<br>')}</td>
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

/* ------------------------------------------------------- Parça listesi

   YURTDIŞINDA PARÇAYI AYIRT EDEN ŞEY KOD. Katalogdaki parça adları
   yalnız Türkçe ve katalogda tekrar eden adlar var; Almanya'daki
   distribütör "Pikap dişi" yazısıyla bir şey yapamaz, siparişi kodla
   açıyor. Bu yüzden satır koddan başlıyor: kod, ad, adet, tutar.

   TUTAR KAYITTAKİ GÖRÜNTÜDEN (`parcaFiyat`) geliyor, canlı fiyat
   listesinden yeniden hesaplanmıyor: müşteri o günün tutarını gördü,
   ihracat ekibi de aynı rakamı görmeli.

   GÖRÜNTÜSÜ OLMAYAN ESKİ KAYITLAR yalnız ad taşıyor. O satırlara kod
   ya da tutar UYDURULMUYOR; ad yazılıp geçiliyor.

   SATIRLARI LİSTENİN KENDİSİNDEN DEĞİL, ORTAK OKUYUCUDAN ALIYOR
   (bkz. servisKaydi.js → talebinParcalari). Burada adet talebin ad
   listesinden `parcaAdet[ad]` ile aranıyordu; koda göre anahtarlanmış
   bir kayıtta o arama boş dönüyor ve satır adetsiz çıkıyordu. Ortak
   okuyucu önce kaydın fiyat görüntüsüne bakıyor, adet orada yazılı.

   ADET YAZISI yalnız görüntüden gelen satırda her zaman yazılıyor.
   Eski kayıtta adet bulunamamış olabilir ve bulunamayınca 1
   varsayılıyor; "x 1" yazmak, bilinmeyen bir adedi biliniyor gibi
   göstermek olurdu. */
function parcaSatirlari(talep) {
  return talebinParcalari(talep)
    .filter((s) => s.ad)
    .map((s) => {
      const adet = s.goruntuden || s.adet > 1 ? `x ${s.adet}` : null
      const tutar =
        s.tutar === null || s.tutar === undefined
          ? null
          : `${paraYaz(s.tutar)} ${PARA_BIRIMI}`
      return [s.kod, s.ad, adet, tutar].filter(Boolean).join(' · ')
    })
}

/* Görüntüdeki toplam. Fiyatı bulunamayan kalem varsa toplam
   YAZILMIYOR: yarım bir rakam, ihracat ekibinin yanlış teklif
   vermesi demek. Tutarlar yurt içi liste tutarlarıdır — müşteriye
   uygulamada görünen rakam budur; ihracat fiyatı ayrı listeden
   veriliyor, o yüzden etiketinde bu yazıyor. */
function parcaTutarSatirlari(talep) {
  const g = talep.parcaFiyat
  if (!g) return []
  if (g.eksikFiyat) return ['Some items have no catalogue price — to be confirmed by the export team']

  const toplam = Number(g.toplam) || 0
  if (!toplam) return []

  const kdv = Number(g.kdv) || 0
  const ara = Number(g.araToplam) || 0
  return [
    kdv > 0
      ? `${paraYaz(toplam)} ${PARA_BIRIMI} (${paraYaz(ara)} + VAT ${paraYaz(kdv)})`
      : `${paraYaz(toplam)} ${PARA_BIRIMI}`,
  ]
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

  const parcalar = parcaSatirlari(talep)
  const parcaTutari = parcaTutarSatirlari(talep)

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
    /* Kod · ad · adet · tutar, her parça kendi satırında */
    satirCok('Parts requested', parcalar),
    satirCok('Parts total (domestic list, as shown in the app)', parcaTutari),
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
    /* Düz metinde de her parça kendi satırında; kod önde */
    parcalar.length ? `Parts:\n${parcalar.map((p) => `  - ${p}`).join('\n')}` : '',
    parcaTutari.length
      ? `Parts total (domestic list, as shown in the app): ${parcaTutari.join(' ')}`
      : '',
    talep.aciklama ? `\nCustomer message:\n${talep.aciklama}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return { konu, alicilar: IHRACAT.epostalar, html, metin }
}
