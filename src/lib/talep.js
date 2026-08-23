/* ==========================================================================
   Talep türleri

   Talep numarası türden okunabilsin diye her tür kendi ön ekini alıyor:

       SRV2508144821   servis talebi
       YPR2508144822   yedek parça talebi
       TKF2508144823   fiyat teklifi talebi

   Biçim: ÖNEK + YYAAGG + 4 hane, bitişik
   Böylece hem müşteri telefonda numarayı okurken hangi tür olduğunu
   söyleyebiliyor hem de kayıtlar veritabanında ön eke göre süzülebiliyor.
   Tarih parçası, arşivde göz kararı sıralamayı kolaylaştırıyor.
   ========================================================================== */

export const TALEP_TURLERI = {
  servis: {
    id: 'servis',
    onek: 'SRV',
    ad: 'Servis talebi',
    kisa: 'Servis',
    /* Ekrandaki rozet rengi — badge--* sınıfları.

       RENKLER BACKOFFICE’TEKİLERLE AYNI. Önceden uygulama servisi kırmızı,
       parçayı turuncu gösteriyordu; backoffice ise servisi turuncu, parçayı
       mor. Aynı talebe iki ekranda iki renk, telefonda konuşurken
       ("turuncu olan hangisiydi?") karışıklık üretiyordu.

       Servis kırmızı DEĞİL: kırmızı backoffice’te gecikme ünleminin rengi,
       ikisi yan yana gelince ekran baştan aşağı kırmızı görünüyordu. */
    ton: 'servis',
  },
  parca: {
    id: 'parca',
    onek: 'YPR',
    ad: 'Yedek parça talebi',
    kisa: 'Yedek parça',
    ton: 'parca',
  },
  satinalma: {
    id: 'satinalma',
    onek: 'TKF',
    ad: 'Fiyat teklifi talebi',
    kisa: 'Fiyat teklifi',
    ton: 'satinalma',
  },
}

export function talepTuru(tur) {
  return TALEP_TURLERI[tur] || TALEP_TURLERI.servis
}

/** SRV2508144821 biçiminde talep numarası üretir. */
export function talepNo(tur) {
  const t = talepTuru(tur)
  const d = new Date()
  const iki = (n) => String(n).padStart(2, '0')
  const tarih = `${iki(d.getFullYear() % 100)}${iki(d.getMonth() + 1)}${iki(d.getDate())}`
  const sira = String(Math.floor(1000 + Math.random() * 9000))
  return t.onek + tarih + sira
}
