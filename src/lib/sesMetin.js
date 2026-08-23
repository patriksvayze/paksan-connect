import { SES_METIN } from '../config'

/* ==========================================================================
   Sesli notu yazıya çevirmeye gönderme — uygulama tarafı

   Talep gönderildiğinde, içinde ses kaydı varsa kayıt n8n akışına
   yollanıyor. Akış sesi metne çeviriyor ve metni köprü adresine
   bırakıyor; backoffice oradan alıp talebe işliyor
   (bkz. src/config.js → SES_METIN).

   TALEBİ BEKLETMİYOR. Gönderim talep kaydedildikten SONRA, cevabı
   beklenmeden başlıyor. n8n kapalıysa, adres tanımlı değilse ya da
   şebeke yoksa hiçbir şey bozulmuyor: talep backoffice'te ses kaydıyla
   birlikte duruyor, yalnız metin gelmiyor.

   Ses kaydı uygulamada `data:` URL olarak duruyor (bkz. SesKaydi.jsx);
   n8n'in webhook'u ikili dosya beklediği için gönderilmeden önce
   blob'a çevriliyor.
   ========================================================================== */

/** `data:audio/webm;base64,...` → Blob */
function veriyiBlobaCevir(veriUrl) {
  const [bas, govde] = String(veriUrl || '').split(',')
  if (!govde) return null

  const tur = bas.match(/^data:([^;]+)/)?.[1] || 'audio/webm'
  const ham = atob(govde)
  const bayt = new Uint8Array(ham.length)
  for (let i = 0; i < ham.length; i++) bayt[i] = ham.charCodeAt(i)
  return new Blob([bayt], { type: tur })
}

/* Dosya adının uzantısı doğru olmalı: Whisper dosyayı uzantısından
   tanıyor, yanlış uzantıda "unsupported format" dönüyor. */
function uzanti(tur) {
  if (tur.includes('mp4')) return 'm4a'
  if (tur.includes('ogg')) return 'ogg'
  if (tur.includes('mpeg')) return 'mp3'
  if (tur.includes('wav')) return 'wav'
  return 'webm'
}

/**
 * Sesli notu çeviri akışına gönderir. Sonucu beklenmez, hata fırlatmaz.
 *
 * @param {object} talep kaydedilmiş talep — `no` ve `ses` alanları okunuyor
 * @param {object} [kullanici] müşteri kaydı; `no` alanı akışa taşınıyor
 */
export function sesiCevirmeyeGonder(talep, kullanici) {
  const adres = SES_METIN.webhook
  if (!adres || !talep?.ses?.veri || !talep?.no) return

  const blob = veriyiBlobaCevir(talep.ses.veri)
  if (!blob) return

  const form = new FormData()
  /* Alan adları n8n akışındaki karşılıkları:
       audio        → HTTP Request düğümünün ikili alanı
       recording_id → talebin numarası, metin bu numaraya işleniyor
       user_id      → müşteri numarası */
  form.append('audio', blob, `${talep.no}.${uzanti(blob.type)}`)
  form.append('recording_id', talep.no)
  form.append('user_id', kullanici?.no || '')
  form.append('sure', String(talep.ses.sure || ''))

  fetch(adres, { method: 'POST', body: form }).catch(() => {
    /* Çeviri gelmezse talep yine de eksiksiz: ses kaydının kendisi
       backoffice'te duruyor ve dinlenebiliyor. */
  })
}
