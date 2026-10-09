/* ==========================================================================
   Müşterinin talebini iptal etmesi (8 Ekim 2026)

   KULLANICININ İSTEĞİ: "Connect'te gönderilen talepler iptal edilemiyor.
   İşleme başlanmamış (Yeni statüsündeki) talepler talep detayına
   girilerek direkt iptal edilebilsin. İşleme alınmış talepler için ise
   sebep belirtecek şekilde iptal talebinde bulunulsun." Kararı PAKSAN
   veriyor (kullanıcının seçimi; backoffice/veri.js →
   iptalIsteginiKarara).

   İKİ YOL, TEK KURAL (musteriIptalYolu):

     'dogrudan'  talebe henüz kimse dokunmadı: durum "Yeni", randevu
                 yok, servis kaydı yok, PAKSAN'a devredilmemiş, yeniden
                 açılmamış ("Sorun Devam Ediyor" geçmişi olan iş servisin
                 bildiği bir iş), parça talebinde dekont yüklenmemiş
                 (ödeme yapılmışsa iade gerekiyor, PAKSAN bakmalı).
                 Talep hemen iptal oluyor.
     'istek'     talep işleme alınmış: müşteri neden seçip istek
                 gönderiyor, iş PAKSAN karar verene kadar sürüyor.
     null        iptal yok: talep kapalı, iş bitip PAKSAN'ın onayını
                 bekliyor ("onayBekliyor") ya da bekleyen bir istek var.

   KARAR DEPODAKİ KAYITTAN. Çiftçi pencereyi açıkken PAKSAN talebe
   dokunmuş olabilir; yazan işlev kuralı depodaki güncel kayıtla yeniden
   soruyor ve hemen iptal artık mümkün değilse kaydetmiyor
   (`durumDegisti`), ekran istek yoluna dönüyor.

   NEDEN KODLA YAZILIYOR. Çiftçi nedeni kendi dilinde seçiyor
   (talepIptal.neden.*); PAKSAN'a ve servise görünen cümle Türkçe ve
   üçüncü kişi ağzından (NEDENLER[kod].paksan). Kayıtta ikisi de duruyor:
   `kod` (Connect çiftçiye kendi dilinde gösteriyor) ve `neden`
   (backoffice, Servisim ve raporlar okuyor).
   ========================================================================== */

import { load, save } from './storage'
import { serviseBildirimYaz } from './serviseBildirim'
import { uygulamaKaydi } from './kayit'
import { KAPALI_DURUMLAR } from './talepEkleme'

/* Çiftçinin seçebileceği nedenler. `paksan`: personelin ve servisin
   gördüğü cümle. `aciklamaZorunlu`: "Başka bir neden"de kısa açıklama
   isteniyor; yoksa PAKSAN neden iptal edildiğini bilemez. */
export const MUSTERI_IPTAL_NEDENLERI = [
  { kod: 'vazgectim', paksan: 'Müşteri vazgeçti' },
  { kod: 'gerekKalmadi', paksan: 'Müşterinin artık ihtiyacı kalmadı' },
  { kod: 'yanlis', paksan: 'Müşteri talebi yanlışlıkla açtı' },
  { kod: 'baska', paksan: 'Başka bir neden', aciklamaZorunlu: true },
]

function nedenBul(kod) {
  return MUSTERI_IPTAL_NEDENLERI.find((n) => n.kod === kod) || null
}

/** Talep müşterinin hangi yoldan iptal edebileceği: 'dogrudan' | 'istek' | null */
export function musteriIptalYolu(talep) {
  if (!talep || talep.servisSiparisi) return null
  const durum = talep.status || 'yeni'
  if (KAPALI_DURUMLAR.includes(durum) || durum === 'onayBekliyor') return null
  if (talep.iptalIstegi?.durum === 'bekliyor') return null
  const dokunulmamis =
    durum === 'yeni' &&
    !talep.plan &&
    !talep.servisKaydi &&
    !talep.devir &&
    !(talep.tekrar || []).length &&
    !(talep.tur === 'parca' && talep.dekont)
  return dokunulmamis ? 'dogrudan' : 'istek'
}

/** Seçimin eksiği: 'neden' | 'aciklama' | null */
export function iptalSecimiEksigi({ kod, aciklama } = {}) {
  const neden = nedenBul(kod)
  if (!neden) return 'neden'
  if (neden.aciklamaZorunlu && !String(aciklama || '').trim()) return 'aciklama'
  return null
}

/* Müşterinin işlemi servise yalnız işi servis yürütüyorsa bildiriliyor
   (lib/talepEkleme.js'teki kuralın aynısı): parça ve teklif talebini
   PAKSAN yürütüyor; devredilmiş işte servis artık muhatap değil. */
function isiServisYurutuyor(talep) {
  return talep?.tur === 'servis' && talep.sahip === 'servis' && Boolean(talep.servis?.id)
}

/**
 * Talep listesine müşterinin iptalini ya da iptal isteğini uygular.
 * Saf işlev: listeyi değiştirmiyor, yenisini döndürüyor. Kural talebin
 * listedeki (depodaki) hâliyle soruluyor.
 *
 * @param {Array} liste depodaki talepler
 * @param {string} id
 * @param {'dogrudan'|'istek'} yol ekranın gösterdiği yol
 * @param {{kod: string, aciklama?: string}} secim
 * @returns {{liste?: Array, talep?: object, hata?: 'durumDegisti'|'neden'|'aciklama'|'yok'}}
 */
export function musteriIptaliniUygula(liste, id, yol, secim, simdi = Date.now()) {
  const eksik = iptalSecimiEksigi(secim)
  if (eksik) return { hata: eksik }
  const eski = liste.find((r) => r.id === id)
  if (!eski) return { hata: 'yok' }
  const guncelYol = musteriIptalYolu(eski)
  if (!guncelYol) return { hata: 'durumDegisti' }
  /* Ekran "hemen iptal" gösterirken talep işleme alındıysa kaydetmiyor;
     tersi (istek gösterirken talep hâlâ dokunulmamış) zararsız ama
     ekranın gösterdiği yol uygulanıyor, çiftçi ne gönderdiğini biliyor. */
  if (yol === 'dogrudan' && guncelYol !== 'dogrudan') return { hata: 'durumDegisti' }

  const neden = nedenBul(secim.kod)
  const aciklama = String(secim.aciklama || '').trim()
  const yeni =
    yol === 'dogrudan'
      ? {
          ...eski,
          status: 'iptal',
          masa: null,
          gecmis: [...(eski.gecmis || []), { durum: 'iptal', tarih: simdi, musteri: true }],
          iptalBilgi: { neden: neden.paksan, kod: neden.kod, aciklama, tarih: simdi, musteri: true },
        }
      : {
          ...eski,
          iptalIstegi: { durum: 'bekliyor', tarih: simdi, kod: neden.kod, neden: neden.paksan, aciklama },
        }
  return { liste: liste.map((r) => (r.id === id ? yeni : r)), talep: yeni }
}

/**
 * Depoya yazar, servise bildirir, işlem kaydına yazar. AppState'in
 * talep listesi ayrıca tazelenmeli (çağıran AppState).
 */
export function musteriIptaliniKaydet(id, yol, secim) {
  const sonuc = musteriIptaliniUygula(load('requests', []), id, yol, secim)
  if (sonuc.hata) return sonuc
  save('requests', sonuc.liste)
  const t = sonuc.talep
  if (isiServisYurutuyor(t)) {
    serviseBildirimYaz(t, yol === 'dogrudan' ? 'musteriIptal' : 'musteriIptalIstedi', {
      neden: yol === 'dogrudan' ? t.iptalBilgi.neden : t.iptalIstegi.neden,
    })
  }
  uygulamaKaydi(
    'talep',
    yol === 'dogrudan'
      ? `${t.no} müşteri tarafından iptal edildi · ${t.iptalBilgi.neden}`
      : `${t.no} için müşteri iptal istedi · ${t.iptalIstegi.neden}`,
  )
  return sonuc
}
