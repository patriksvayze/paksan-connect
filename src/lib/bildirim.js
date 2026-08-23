/* ==========================================================================
   Uygulama bildirimleri

   Uygulamanın geri kalanı bildirimin nasıl çalıştığını bilmez; yalnızca
   buradaki fonksiyonları çağırır.

   ŞU AN (tarayıcı / web):
     Tarayıcının kendi bildirim izni sorulur. Geliştirme sırasında
     ekranların doğru çalıştığını görmeye yeter.

   SONRA (Android / Capacitor):
     @capacitor/push-notifications eklentisi kurulunca yalnızca bu dosya
     değişir: izin istenir, cihaz bildirim kimliği (token) alınır ve
     PAKSAN sunucusuna gönderilir. Ekranlarda değişiklik gerekmez.
   ========================================================================== */

export const BILDIRIM = {
  VERILDI: 'verildi',
  REDDEDILDI: 'reddedildi',
  SORULMADI: 'sorulmadi',
  DESTEKLENMIYOR: 'desteklenmiyor',
}

/** Cihaz bildirim gösterebiliyor mu? */
export function bildirimDestekleniyorMu() {
  return typeof window !== 'undefined' && 'Notification' in window
}

/** Daha önce verilmiş bir karar var mı? */
export function mevcutIzin() {
  if (!bildirimDestekleniyorMu()) return BILDIRIM.DESTEKLENMIYOR
  if (Notification.permission === 'granted') return BILDIRIM.VERILDI
  if (Notification.permission === 'denied') return BILDIRIM.REDDEDILDI
  return BILDIRIM.SORULMADI
}

/**
 * Bildirim izni ister. Kullanıcının bir düğmeye basmasıyla çağrılmalı —
 * tarayıcılar kendiliğinden açılan izin kutularını engelliyor.
 * @returns {Promise<string>} BILDIRIM.* değerlerinden biri
 */
export async function izinIste() {
  if (!bildirimDestekleniyorMu()) return BILDIRIM.DESTEKLENMIYOR

  const simdiki = mevcutIzin()
  if (simdiki !== BILDIRIM.SORULMADI) return simdiki

  try {
    const sonuc = await Notification.requestPermission()
    return sonuc === 'granted' ? BILDIRIM.VERILDI : BILDIRIM.REDDEDILDI
  } catch {
    return BILDIRIM.REDDEDILDI
  }

  /* Capacitor'a geçince buranın yerine:
       const { receive } = await PushNotifications.requestPermissions()
       if (receive === 'granted') await PushNotifications.register()
     ve register sonucu gelen token PAKSAN sunucusuna yollanacak. */
}
