import { durumBilgi, servisBildirimleri } from '../backoffice/veri'
import { load, save } from '../lib/storage'
import { MARKA, PARA_BIRIMI, paraYaz } from '../marka'

/* ==========================================================================
   PAKSAN'dan servise gelen talep bildirimleri (21 Eylül 2026)

   PAKSAN bir talepte servise dokunan bir işlem yaptığında veri
   katmanı bir kayıt yazıyor (bkz. backoffice/veri.js → serviseBildir).
   Bu dosya o kaydın Servisim'de NASIL okunduğunu tutuyor:

     - yazısı: kayıtta metin yok, olay var; metin burada
     - okunmuşluğu: bu cihazda hangisinin açıldığı
     - süzgeçleri: okunmamışlar, bir talebin bütün bildirimleri

   Üç yerde kullanılıyor: İşlerim'in üstünde okunmamışlar
   (ServisPanel.jsx → PaksanBildirimleri), talebin içinde o talebin
   geçmişi (ekranlar/TalepDetay.jsx) ve telefon bildirimi (haber.js).

   OKUNMUŞLUK CİHAZDA. Müşteri uygulamasındaki okunan bildirimlerin
   aynısı; sunucu geldiğinde bildirim.Teslimat.OkunmaZamani'na geçecek.
   ========================================================================== */

const OKUNAN = 'okunanBildirimlerServis'

/* METİNLER TEK NESNEDE. Olayların listesi veri.js'te serviseBildir'i
   çağıran yerlerde; buraya eklenmeyen bir olay "işlem yaptı" diye
   genel yazıyla görünür, kaybolmaz. */
const METIN = {
  durum: (d) => ({
    baslik: `${MARKA} talebin durumunu değiştirdi`,
    metin: `Yeni durum: ${durumBilgi(d.durum).ad}`,
  }),
  iptal: (d) => ({
    baslik: `${MARKA} talebi iptal etti`,
    metin: d.neden ? `İptal nedeni: ${d.neden}` : 'Bu işe gitmenize gerek kalmadı.',
  }),
  kapandi: () => ({
    baslik: `${MARKA} talebi kapattı`,
    metin: 'Bu iş için yapmanız gereken başka bir işlem yok.',
  }),
  siparisGonderildi: () => ({
    baslik: 'Parça siparişiniz kargoya verildi',
    metin: 'Kargo takip bilgilerini talepte görebilirsiniz.',
  }),
  planlandi: (d) =>
    d.siparis
      ? {
          baslik: 'Siparişinizin kargoya verileceği gün belli oldu',
          metin: d.tarih ? `${d.tarih} tarihinde kargoya verilecek.` : '',
        }
      : {
          baslik: `${MARKA} ziyaret gününü belirledi`,
          metin: d.tarih ? `Müşteriyle kararlaştırılan ziyaret günü: ${d.tarih}` : '',
        },
  odemeOnay: () => ({
    baslik: 'Siparişinizin ödemesi onaylandı',
    metin: 'Parçalarınız hazırlanıyor.',
  }),
  parcaYolda: (d) => ({
    baslik: 'Parça yola çıktı',
    metin:
      [d.firma, d.takipNo].filter(Boolean).join(' · ') ||
      'Parça elinize ulaştığında parçayı takıp işi tamamlayabilirsiniz.',
  }),
  kargoGuncellendi: (d) => ({
    baslik: 'Kargo bilgileri güncellendi',
    metin: [d.firma, d.takipNo].filter(Boolean).join(' · '),
  }),
  hakedisOnay: (d) => ({
    baslik: 'Servis kaydınız onaylandı',
    metin: d.tutar ? `${paraYaz(d.tutar)} hak ediş hesabınıza eklendi.` : 'Tutar hak ediş hesabınıza eklendi.',
  }),
  hakedisRed: (d) => ({
    baslik: 'Servis kaydınız reddedildi',
    metin: d.neden ? `Ret nedeni: ${d.neden}` : '',
  }),
  hakedisDuzelt: (d) => ({
    baslik: `${MARKA} servis kaydınızı düzeltti`,
    metin: d.neden ? `Düzeltme nedeni: ${d.neden}` : '',
  }),
  not: (d) => ({
    baslik: `${MARKA} size not bıraktı`,
    metin: d.metin || '',
  }),

  /* TALEBE BAĞLI OLMAYAN BİLDİRİMLER (23 Eylül 2026, `tur: 'hesap'`).
     Değerleri veri.js yazıyor: ücrette kalem kalem eski ve yeni tutar
     (servisTarifesi.js → tarifeFarki), indirimde eski ve yeni yüzde.
     Servis ekranında "iskonto" değil "indirim" (yasak terim). */
  tarife: (d) => ({
    baslik: 'Hizmet ücretleriniz değişti',
    metin:
      [
        d.yolKm && `Yol: ${paraYaz(d.yolKm.once)} → ${paraYaz(d.yolKm.simdi)} ${PARA_BIRIMI}/km`,
        d.iscilikSaat && `İşçilik: ${paraYaz(d.iscilikSaat.once)} → ${paraYaz(d.iscilikSaat.simdi)} ${PARA_BIRIMI}/saat`,
        d.makine && 'Bazı makine modellerinde ücret değişti',
      ]
        .filter(Boolean)
        .join(' · ') || 'Güncel ücretlerinizi Hesap ekranında görebilirsiniz.',
  }),
  iskonto: (d) => ({
    baslik: 'Yedek parça indiriminiz değişti',
    metin: `%${d.once ?? 0} → %${d.simdi ?? 0}. Yeni oran bundan sonraki siparişlerinizde geçerli.`,
  }),
  /* Bakiyeden ödemede ek indirim (24 Eylül 2026): oran bütün servislere
     tek, değişince hepsine gidiyor (veri.js → bakiyeIskontosunuKaydet).
     Talebe bağlı değil; dokununca Ücretlendirmeler açılıyor. */
  bakiyeIskonto: (d) => ({
    baslik: 'Bakiyeden ödemede ek indiriminiz değişti',
    metin: `%${d.once ?? 0} → %${d.simdi ?? 0}. Yeni oran, bundan sonra bakiyenizden ödeyeceğiniz siparişlerde geçerli.`,
  }),
}

const GENEL = () => ({ baslik: `${MARKA} bu taleple ilgili işlem yaptı`, metin: '' })

/** Bildirimin ekranda görünen başlığı ve açıklaması. */
export function bildirimYazisi(b) {
  return (METIN[b?.olay] || GENEL)(b?.degerler || {})
}

function okunanlar() {
  return new Set(load(OKUNAN, []))
}

export function okunduMu(id) {
  return okunanlar().has(id)
}

/** Okunmamış bildirimler, yeniden eskiye. */
export function okunmamislar(servisId) {
  const okunan = okunanlar()
  return servisBildirimleri(servisId).filter((b) => !okunan.has(b.id))
}

/** Bir talebin bütün bildirimleri, yeniden eskiye. */
export function talebinBildirimleri(servisId, talepId) {
  return servisBildirimleri(servisId).filter((b) => b.talepId === talepId)
}

/* Okundu sayılanlar depoda sınırsız birikmesin: en yeni 500 kimlik
   tutuluyor. Daha eskisi zaten listede aşağıda kalmış bir bildirim. */
export function okunduSay(kimlikler) {
  if (!kimlikler?.length) return
  const hepsi = [...new Set([...kimlikler, ...load(OKUNAN, [])])].slice(0, 500)
  save(OKUNAN, hepsi)
}
