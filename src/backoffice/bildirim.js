/* ==========================================================================
   Backoffice bildirimleri

   Talep gelen kişinin backoffice’e bakıyor olması gerekmiyor. Tarayıcı
   bildirimi açıksa, sekme arkada dururken de haber gidiyor.

   İzin kendiliğinden istenmiyor: tarayıcılar kullanıcı bir yere
   basmadan izin penceresi açan sayfaları engelliyor. Bu yüzden backoffice’te
   bir şerit çıkıyor, izni kullanıcı düğmeye basarak veriyor.

   Yazılar kısa tutuldu — bildirim penceresi zaten uzun metni kesiyor:
       "Yeni Talep — PAKSAN"
       "2 Yeni Geri Bildirim — PAKSAN"
   ========================================================================== */

import LOGO_DOSYASI from '../assets/logo/paksan-logo.png'


export function bildirimDestekliMi() {
  return typeof window !== 'undefined' && 'Notification' in window
}

/** 'yok' | 'default' | 'granted' | 'denied' */
export function izinDurumu() {
  if (!bildirimDestekliMi()) return 'yok'
  return Notification.permission
}

export async function izinIste() {
  if (!bildirimDestekliMi()) return 'yok'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/**
 * Bildirim gönderir.
 * @param {string} baslik "Yeni Talep" gibi — sonuna marka adı ekleniyor.
 * @param {string} etiket aynı etiketli bildirim üst üste yığılmıyor
 */
export function bildirimGonder(baslik, etiket) {
  if (izinDurumu() !== 'granted') return false
  try {
    new Notification(`${baslik} — PAKSAN`, {
      tag: etiket || baslik,
      renotify: true,
      /* Logo, derlemeye dâhil edilen dosyadan alınıyor. Önceden kök
         dizinde '/paksan-logo.png' aranıyordu; projede public/ klasörü
         olmadığı için o adresin hiç karşılığı yoktu ve bildirim
         ikonsuz çıkıyordu. */
      icon: LOGO_DOSYASI,
    })
    return true
  } catch {
    return false
  }
}

/** "1 Yeni Talep" / "3 Yeni Talep" */
export function sayiliBaslik(sayi, tekil) {
  return sayi === 1 ? `Yeni ${tekil}` : `${sayi} Yeni ${tekil}`
}
