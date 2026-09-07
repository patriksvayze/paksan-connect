/* ==========================================================================
   Yedek parça fiyat listesi

   ⚠⚠ BU FİYATLAR GERÇEK DEĞİL ⚠⚠

   Hepsi demo için uydurulmuş sayılardır. Ekranın nasıl çalıştığını
   göstermek, toplam hesabının ve ödeme adımının denenebilmesi için
   var. YAYINA ÇIKMADAN ÖNCE PAKSAN yedek parça biriminden alınan
   gerçek liste buraya yazılmalı; parça kodları da öyle.

   Bu dosya doldurulmadan `PARCA_FIYAT_AKTIF` true yapılmamalı —
   yanlış fiyat gösterip müşteriden o parayı istemek, düzeltmesi zor
   bir hata.

   NEDEN FİYAT GÖSTERİYORUZ

   Müşteri parça bedelini havaleyle önden gönderiyor (bkz. yedek parça
   ödeme adımı). Ne kadar göndereceğini bilmeden bunu yapamaz.
   Önceden ekranda hiçbir tutar yoktu; müşterinin PAKSAN'ı arayıp
   fiyat sorması, sonra havale yapması, sonra uygulamaya dönmesi
   gerekiyordu. Fiyat ekranda olunca üç adım bire iniyor.

   NASIL YAZILIYOR

   Anahtar, parçanın TÜRKÇE adı — talep kaydına giden değerin ta
   kendisi (bkz. src/data/talepAlanlari.js). Böylece dil değişince
   fiyat kaybolmuyor.

     kod    → PAKSAN parça kodu, müşteri telefonda okuyabilsin diye
     fiyat  → KDV HARİÇ birim fiyat, Türk lirası
     birim  → 'adet' | 'takım' | 'metre'
   ========================================================================== */

/* Fiyatlar ekranda gösterilsin mi?

   Gerçek liste girilene kadar false kalırsa ekran fiyat göstermez,
   "fiyat bilgisi için sizi arayacağız" der. Demo sırasında true. */
export const PARCA_FIYAT_AKTIF = true

/* KDV oranı — ekranda "KDV hariç" yazdığımız için toplamın yanında
   KDV'li karşılığı da gösteriliyor. */
export const KDV_ORANI = 0.2

export const PARA_BIRIMI = 'TL'

export const PARCA_FIYAT = {
  /* ------------------------------------------------ Her makinede ortak */
  'Rulman': { kod: 'PKS-RLM-100', fiyat: 850, birim: 'adet' },
  'Kayış': { kod: 'PKS-KYS-110', fiyat: 1250, birim: 'adet' },
  'Zincir': { kod: 'PKS-ZNC-120', fiyat: 1680, birim: 'metre' },
  'Yağ keçesi': { kod: 'PKS-YKC-130', fiyat: 320, birim: 'adet' },
  'Mafsal / şaft': { kod: 'PKS-MFS-140', fiyat: 4900, birim: 'adet' },
  'Emniyet cıvatası': { kod: 'PKS-EMC-150', fiyat: 145, birim: 'adet' },
  'Hidrolik hortum': { kod: 'PKS-HDH-160', fiyat: 1450, birim: 'adet' },

  /* ------------------------------------------------- Prizmatik balya */
  'Düğüm atıcı bıçağı': { kod: 'PKS-DAB-200', fiyat: 2400, birim: 'adet' },
  'İp kılavuzu': { kod: 'PKS-IPK-210', fiyat: 680, birim: 'adet' },
  'İğne': { kod: 'PKS-IGN-220', fiyat: 3150, birim: 'adet' },
  'Pikap parmağı': { kod: 'PKS-PKP-230', fiyat: 260, birim: 'adet' },
  'Piston segmanı': { kod: 'PKS-PSG-240', fiyat: 1980, birim: 'takım' },
  'Balya sayacı': { kod: 'PKS-BSY-250', fiyat: 5400, birim: 'adet' },

  /* ------------------------------------------------------ Rulo balya */
  'Sarım bıçağı': { kod: 'PKS-SRB-300', fiyat: 2150, birim: 'adet' },
  'Kauçuk bant': { kod: 'PKS-KCB-310', fiyat: 7800, birim: 'adet' },
  'Kapak silindiri': { kod: 'PKS-KPS-320', fiyat: 6500, birim: 'adet' },

  /* ------------------------------------------------------ Yem karma */
  'Karıştırıcı bıçağı': { kod: 'PKS-KRB-400', fiyat: 2850, birim: 'adet' },
  'Helezon': { kod: 'PKS-HLZ-410', fiyat: 12500, birim: 'adet' },
  'Tartı sensörü': { kod: 'PKS-TRS-420', fiyat: 8900, birim: 'adet' },
  'Boşaltma bandı': { kod: 'PKS-BSB-430', fiyat: 9600, birim: 'adet' },

  /* ---------------------------------------------------------- Silaj */
  'Kesici bıçak': { kod: 'PKS-KSB-500', fiyat: 1750, birim: 'adet' },
  'Karşı bıçak': { kod: 'PKS-KRS-510', fiyat: 2100, birim: 'adet' },
  'Besleme silindiri': { kod: 'PKS-BSL-520', fiyat: 7200, birim: 'adet' },

  /* ------------------------------------------------------ Çayır / ot */
  'Biçme bıçağı': { kod: 'PKS-BCB-600', fiyat: 480, birim: 'adet' },
  'Tırmık parmağı': { kod: 'PKS-TRP-610', fiyat: 390, birim: 'adet' },
  'Koruma sacı': { kod: 'PKS-KRC-620', fiyat: 1900, birim: 'adet' },

  /* --------------------------------------------------- Toprak işleme */
  'Uç demiri': { kod: 'PKS-UCD-700', fiyat: 720, birim: 'adet' },
  'Ayak / gövde': { kod: 'PKS-AYG-710', fiyat: 3400, birim: 'adet' },
  'Disk': { kod: 'PKS-DSK-720', fiyat: 1150, birim: 'adet' },
  'Merdane': { kod: 'PKS-MRD-730', fiyat: 8200, birim: 'adet' },
}

/* Fiyatı olmayan seçenek: "Diğer".

   Müşteri listede olmayan bir parça istiyor; ne olduğunu yazıyla
   anlatıyor. Tutarı PAKSAN belirleyip müşteriyle konuşuyor, o yüzden
   burada fiyatı yok ve olmamalı. */
export const FIYATSIZ = ['Diğer']

/** Parçanın fiyat kaydı; yoksa null. */
export function parcaFiyatBilgisi(ad) {
  if (!PARCA_FIYAT_AKTIF) return null
  return PARCA_FIYAT[ad] || null
}

export function fiyatliMi(ad) {
  return Boolean(parcaFiyatBilgisi(ad))
}

/**
 * Seçilen parçaların toplamı.
 *
 * @param {string[]} parcalar seçilen parça adları (Türkçe)
 * @param {Object} adetler { 'Pikap parmağı': 4 }
 * @returns {{ araToplam, kdv, toplam, satirlar, eksikFiyat }}
 *   `eksikFiyat` fiyatı bilinmeyen parça var mı — varsa ekranda
 *   "toplam" değil "hesaplanan kısım" yazmalıyız, yoksa müşteri eksik
 *   para gönderir.
 */
export function parcaToplami(parcalar = [], adetler = {}) {
  const satirlar = []
  let araToplam = 0
  let eksikFiyat = false

  for (const ad of parcalar) {
    const bilgi = parcaFiyatBilgisi(ad)
    const adet = Math.max(1, adetler[ad] || 1)

    if (!bilgi) {
      eksikFiyat = true
      satirlar.push({ ad, adet, bilgi: null, tutar: null })
      continue
    }

    const tutar = bilgi.fiyat * adet
    araToplam += tutar
    satirlar.push({ ad, adet, bilgi, tutar })
  }

  const kdv = Math.round(araToplam * KDV_ORANI)
  return { satirlar, araToplam, kdv, toplam: araToplam + kdv, eksikFiyat }
}

/** "12.500" — binlik ayracı nokta, Türkiye biçimi. */
export function paraYaz(sayi) {
  if (sayi === null || sayi === undefined || Number.isNaN(sayi)) return '—'
  return String(Math.round(sayi)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
