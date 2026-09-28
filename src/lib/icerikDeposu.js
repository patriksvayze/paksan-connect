/* Backoffice’ten girilen servis listesi.

   Uygulama kendi `servisler.js` dosyasını okumaya devam ediyor; backoffice’ten
   gerçek liste girilmişse onu kullanıyor. Backoffice bu listeye
   dokunmadığı sürece koddaki liste geçerli.

   Sunucu geldiğinde bu dosya sunucudan okuyacak, uygulamanın geri kalanı
   aynı kalacak.                                                        */

import { load, baskaSekmeDegistirince } from './storage.js'

/* Eski ad korundu — bkz. src/backoffice/veri.js → ANAHTAR. */
const ANAHTAR = 'panelIcerik'

let bellek = null

function depo() {
  if (bellek === null) bellek = load(ANAHTAR, {}) || {}
  return bellek
}

/* YAZDIKTAN SONRA ÇAĞRILMASI ŞART.

   Bellek bir kez dolduruluyordu ve hiç boşalmıyordu. Sonuç: backoffice
   servis listesini kaydettiği anda, aynı sayfada okuyan her yer hâlâ eski
   listeyi görüyordu. Yeni açılan bir servis hesabı, sayfa yenilenmeden
   giriş yapamıyordu — kayıt diskte vardı, bellekte yoktu.

   Depoya yazan tek yer `servisleriYaz` (veri.js); tazelemeyi o çağırıyor.

   Bu çağrı yalnız YAZAN sekmenin belleğini boşaltıyor. Öteki sekmelerde
   bellek depo olayıyla boşalıyor (aşağıda, baskaSekmedenGeldi). */
export function icerikTazele() {
  bellek = null
}

/* BAŞKA SEKME YAZDI (25 Eylül 2026, kullanıcı sınaması O7).

   Rol, servis ve bayi listesi başka bir sekmede değişince bu sekmenin
   belleği eski kalıyordu: bir sekmede Yedek Parça rolünden bir izin
   kaldırılıyor, öteki sekmenin menüsü sayfa yenilenene kadar o izni
   tanıyordu. Depo olayı geldiğinde (lib/storage.js →
   baskaSekmeDegistirince) bellek boşalıyor; bir sonraki okuma depodan.
   Ekranı yeniden çizdirmek bu dosyanın işi değil; uygulamanın kabuğu
   (Backoffice.jsx, ServisPanel.jsx) aynı olayı kendi dinleyicisiyle
   duyup ekranı tazeler.

   Kayıt modül yüklenince bir kez yapılıyor: bellek modül düzeyinde,
   dinleyicisi de öyle. Depo toptan temizlendiyse (`null`) de boşalıyor. */
export function baskaSekmedenGeldi(anahtar) {
  if (anahtar === null || anahtar === ANAHTAR) bellek = null
}

baskaSekmeDegistirince(baskaSekmedenGeldi)

/** Backoffice’te liste girildiyse onu, girilmediyse koddaki listeyi döndürür. */
export function icerikListe(bolum, fabrika) {
  const v = depo()[bolum]
  return Array.isArray(v) && v.length ? v : fabrika
}
