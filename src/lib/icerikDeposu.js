/* Backoffice’ten girilen bayi listesi.

   Uygulama kendi `bayiler.js` dosyasını okumaya devam ediyor; backoffice’ten
   gerçek liste girilmişse onu kullanıyor. Backoffice bu listeye
   dokunmadığı sürece koddaki liste geçerli.

   Sunucu geldiğinde bu dosya sunucudan okuyacak, uygulamanın geri kalanı
   aynı kalacak.                                                        */

import { load } from './storage.js'

/* Eski ad korundu — bkz. src/backoffice/veri.js → ANAHTAR. */
const ANAHTAR = 'panelIcerik'

let bellek = null

function depo() {
  if (bellek === null) bellek = load(ANAHTAR, {}) || {}
  return bellek
}

/* YAZDIKTAN SONRA ÇAĞRILMASI ŞART.

   Bellek bir kez dolduruluyordu ve hiç boşalmıyordu. Sonuç: backoffice
   bayi listesini kaydettiği anda, aynı sayfada okuyan her yer hâlâ eski
   listeyi görüyordu. Yeni açılan bir bayi hesabı, sayfa yenilenmeden
   giriş yapamıyordu — kayıt diskte vardı, bellekte yoktu.

   Depoya yazan tek yer `bayileriYaz` (veri.js); tazelemeyi o çağırıyor. */
export function icerikTazele() {
  bellek = null
}

/** Backoffice’te liste girildiyse onu, girilmediyse koddaki listeyi döndürür. */
export function icerikListe(bolum, fabrika) {
  const v = depo()[bolum]
  return Array.isArray(v) && v.length ? v : fabrika
}
