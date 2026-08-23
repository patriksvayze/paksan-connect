/* Backoffice’ten girilen bayi listesi.

   Uygulama kendi `bayiler.js` dosyasını okumaya devam ediyor; backoffice’ten
   gerçek liste girildiyse onun üstüne geçiyor. Backoffice bu listeye
   dokunmadığı sürece koddaki liste geçerli.

   Sunucu geldiğinde bu dosya sunucudan okuyacak, uygulamanın geri kalanı
   aynı kalacak.                                                        */

import { load } from './storage'

/* Eski ad korundu — bkz. src/backoffice/veri.js → ANAHTAR. */
const ANAHTAR = 'panelIcerik'

let bellek = null

function depo() {
  if (bellek === null) bellek = load(ANAHTAR, {}) || {}
  return bellek
}

/** Backoffice’te liste girildiyse onu, girilmediyse koddaki listeyi döndürür. */
export function icerikListe(bolum, fabrika) {
  const v = depo()[bolum]
  return Array.isArray(v) && v.length ? v : fabrika
}
