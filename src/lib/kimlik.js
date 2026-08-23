/* ==========================================================================
   Kimlik ve vergi numarası doğrulama

   Yedek parça faturası kesilebilmesi için TC kimlik numarası (gerçek
   kişi) ya da vergi numarası (tüzel kişi) gerekiyor. Yanlış numarayla
   fatura kesilemiyor; hata muhasebede değil, girildiği anda
   yakalanmalı — çiftçi tarladan parça sipariş ediyor, iki gün sonra
   "numaranız tutmadı" telefonu almasın.

   Buradaki kontroller numaranın KENDİ İÇİNDE tutarlı olduğunu
   söylüyor, o kişiye ait olduğunu değil. Rastgele yazılmış 11 haneyi
   eliyor, çalınmış kimliği elemiyor. Gerçek doğrulama fatura
   kesilirken Gelir İdaresi tarafında yapılıyor.
   ========================================================================== */

/**
 * TC kimlik numarası kendi içinde tutarlı mı?
 *
 * Kural (Nüfus ve Vatandaşlık İşleri):
 *   · 11 hane, hepsi rakam
 *   · İlk hane 0 olamaz
 *   · 10. hane: (tek sıradakilerin toplamı × 7 − çift sıradakilerin
 *     toplamı) mod 10
 *   · 11. hane: ilk 10 hanenin toplamı mod 10
 */
export function tcGecerliMi(deger) {
  const s = String(deger || '').replace(/\D/g, '')
  if (!/^[1-9][0-9]{10}$/.test(s)) return false

  const d = s.split('').map(Number)

  const tek = d[0] + d[2] + d[4] + d[6] + d[8]
  const cift = d[1] + d[3] + d[5] + d[7]

  if ((tek * 7 - cift) % 10 !== d[9]) return false

  const ilkOn = d.slice(0, 10).reduce((a, b) => a + b, 0)
  return ilkOn % 10 === d[10]
}

/**
 * Vergi kimlik numarası kendi içinde tutarlı mı?
 *
 * 10 hane. Son hane, ilk dokuz haneden Gelir İdaresi'nin tanımladığı
 * ağırlıklandırmayla hesaplanıyor.
 */
export function vergiNoGecerliMi(deger) {
  const s = String(deger || '').replace(/\D/g, '')
  if (!/^[0-9]{10}$/.test(s)) return false

  const d = s.split('').map(Number)
  let toplam = 0

  for (let i = 0; i < 9; i++) {
    const gecici = (d[i] + (10 - (i + 1))) % 10
    if (gecici === 0) continue
    /* 9'a bölümünden kalan 0 çıkarsa 9 sayılıyor */
    toplam += (gecici * Math.pow(2, 10 - (i + 1))) % 9 || 9
  }

  const son = toplam % 10 === 0 ? 0 : 10 - (toplam % 10)
  return son === d[9]
}

/** Yazarken okunur hâle getirir: "12345678901" → "123 456 789 01" */
export function kimlikBicimle(deger) {
  const s = String(deger || '').replace(/\D/g, '').slice(0, 11)
  return s.replace(/(\d{3})(?=\d)/g, '$1 ').trim()
}

export function vergiNoBicimle(deger) {
  return String(deger || '').replace(/\D/g, '').slice(0, 10)
}
