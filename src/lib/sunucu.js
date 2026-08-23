/* ==========================================================================
   Sunucuya gönderim

   Tek yerden geçiyor ki ekranlar "gönderildi mi?" sorusunu hep aynı
   şekilde sorsun: bir söz (Promise) döner, biterse tamam, dönmezse hata.

   Sunucu kapalıyken (SUNUCU.aktif = false) gerçek bir istek atılmıyor
   ama söz yine de gecikmeli dönüyor — böylece bekleme durumu demo'da da
   görülüyor ve sunucu açıldığında ekranlarda değişiklik gerekmiyor.
   ========================================================================== */

import { SUNUCU } from '../config'

/* Demo gecikmesi: gerçek bir gönderimin ne kadar sürdüğünü hissettirecek
   kadar, kullanıcıyı bekletmeyecek kadar. */
const DEMO_GECIKME = 700

export async function sunucuyaGonder(adres, govde) {
  if (!SUNUCU.aktif || !adres) {
    await new Promise((r) => setTimeout(r, DEMO_GECIKME))
    return null
  }

  const kontrol = new AbortController()
  const sayac = setTimeout(() => kontrol.abort(), SUNUCU.zamanAsimi)

  try {
    const cevap = await fetch(adres, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: kontrol.signal,
      body: JSON.stringify(govde),
    })
    if (!cevap.ok) throw new Error('Sunucu ' + cevap.status + ' döndü')
    /* Cevap gövdesi boş olabilir; o durumda null dönüyor */
    return await cevap.json().catch(() => null)
  } finally {
    clearTimeout(sayac)
  }
}
