/* ==========================================================================
   Talebe sonradan ekleme

   NEDEN VAR

   Çiftçi talebi tarlada, aceleyle gönderiyor. Sonradan aklına bir şey
   geliyor ya da yeni bir şey oluyor: "bir de şu ses geliyor", "parça
   söküldü, altındaki yatak da kırıkmış", "fotoğrafını çektim".

   Bunu iletmenin tek yolu telefonla aramaktı. Amaç operasyonel yükü
   düşürmek olduğu için (bkz. NOTLAR.md) aramak yerine talebin kendi
   ekranından eklenebiliyor.

   BİR EKLEME = BİR OLAY

   Not, ses, fotoğraf ve video ayrı ayrı değil, TEK bir ekleme kaydında
   duruyor. Çiftçi bir kere "ekleme yap" diyor, elindeki her şeyi
   koyuyor, tek zaman damgası alıyor. Ayrı ayrı kaydedilseydi üç
   fotoğraf üç ayrı satır olurdu ve personel hangisinin hangi anlatıma
   ait olduğunu bilemezdi.

   İLK GÖNDERİMDEN AYRI DURUYOR

   Talebin `ekler` ve `ses` alanları ilk gönderimin ekleri. Sonradan
   eklenenler `eklemeler` dizisinde. İki liste hiç karışmıyor —
   ekranda da ayrı başlık altında, zaman damgalarıyla görünüyorlar.

   YALNIZ AÇIK TALEPTE

   Kapanmış talebe ekleme yapılamıyor. Sebebi süsleme değil: kapanan
   talebe kimse bakmıyor, oraya yazılan şey kimseye ulaşmaz. Kapalı
   talepte ekran bunu söylüyor ve yeni talep açmaya yönlendiriyor.
   ========================================================================== */

import { uid } from './storage'

/* Kapalı sayılan durumlar. Backoffice'teki KAPALI_DURUMLAR ile aynı
   liste; uygulama backoffice'in kodunu almadığı için burada tekrar
   yazılı (bkz. src/backoffice/veri.js). Connect'te bu listenin tek yeri
   burası; Profil ekranı da buradan alıyor.

   "Bayiye İletildi" de kapalı (21 Eylül 2026, kullanıcının kararı):
   fiyat teklifini bundan sonra bayi yürütüyor, PAKSAN talebe bakmıyor.
   Oraya yazılan not kimseye ulaşmaz. Eşitliği ekosistem sınaması
   denetliyor (AK-06). */
export const KAPALI_DURUMLAR = ['kapandi', 'iptal', 'bayiyeIletildi']

/** Bu talebe şu an ekleme yapılabilir mi? */
export function eklemeYapilabilir(talep) {
  if (!talep) return false
  return !KAPALI_DURUMLAR.includes(talep.status || 'yeni')
}

/**
 * Yeni bir ekleme kaydı üretir.
 *
 * Boş ekleme üretilmiyor: not da yoksa, ses de yoksa, dosya da yoksa
 * `null` dönüyor ve çağıran taraf kaydetmiyor.
 *
 * @param {{not?: string, ses?: object|null, ekler?: Array}} icerik
 */
export function eklemeOlustur({ not = '', ses = null, ekler = [] } = {}) {
  const metin = not.trim()
  if (!metin && !ses && !ekler.length) return null
  return {
    id: uid(),
    tarih: Date.now(),
    not: metin,
    ses: ses || null,
    ekler,
  }
}

/** Talebin eklemelerini yeniden eskiye sıralı verir. */
export function eklemeleri(talep) {
  return [...(talep?.eklemeler || [])].sort((a, b) => b.tarih - a.tarih)
}
