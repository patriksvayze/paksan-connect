/* ==========================================================================
   Konum

   İzin kayıt akışının sonunda bir kez isteniyor; verilirse hesaba
   yazılıyor. "Servis ve iletişim" ekranı açıldığında izin verilmişse konum
   sessizce alınıp servisler yakından uzağa sıralanıyor — kullanıcı bir
   daha hiçbir şeye dokunmuyor.

   KONUMUN KENDİSİ SAKLANMIYOR, yalnızca izin durumu. Sebep: koordinat
   birkaç gün sonra yanlış oluyor (çiftçi başka tarlada, başka ilde) ve
   saklanan konum kişisel veridir. İzin verilmişse konumu her seferinde
   yeniden okumak hem doğru hem ucuz: izin zaten verildiği için telefon
   bir şey sormuyor.

   İzin sonradan telefon ayarlarından kapatılmış olabilir; o durumda
   okuma hata veriyor ve ekran kendi eski hâline (elle isteme) dönüyor.
   ========================================================================== */

export const KONUM = {
  VERILDI: 'verildi',
  REDDEDILDI: 'reddedildi',
  SORULMADI: 'sorulmadi',
  DESTEKLENMIYOR: 'desteklenmiyor',
}

export function konumDestekleniyorMu() {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator
}

/**
 * Konumu okur. İzin daha önce verildiyse telefon bir şey sormaz.
 * @returns {Promise<{enlem: number, boylam: number}>}
 */
export function konumOku() {
  return new Promise((coz, hata) => {
    if (!konumDestekleniyorMu()) {
      hata(new Error('desteklenmiyor'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => coz({ enlem: p.coords.latitude, boylam: p.coords.longitude }),
      hata,
      /* Yüksek hassasiyet gerekmiyor: servis sıralaması için kilometre
         yeter. Kapalı tutmak hem pili hem beklemeyi azaltıyor. */
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }
    )
  })
}

/**
 * İzin ister. Tarayıcı/telefon izin penceresini burada gösterir.
 * @returns {Promise<'verildi'|'reddedildi'|'desteklenmiyor'>}
 */
export async function konumIzniIste() {
  if (!konumDestekleniyorMu()) return KONUM.DESTEKLENMIYOR
  try {
    await konumOku()
    return KONUM.VERILDI
  } catch {
    return KONUM.REDDEDILDI
  }
}
