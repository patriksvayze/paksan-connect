/* ==========================================================================
   Bu kayıt bu müşterinin mi

   Talep, görüş ya da bildirim alıcısı: "kimin?" sorusunun cevabı tek
   yerden. Backoffice'in müşteri kartı, "Aktif diğer talepler",
   bildirim alıcısı, Müşteriler raporu ve Servisim'in "bu numara kayıtlı
   bir müşterinin mi" sorusu aynı kurala bakıyor.

   KURAL

     (a) Servisin kendi parça siparişi hiçbir müşterinin değil. Onun
         numarası servisin firma numarası.
     (b) Kayıtta `musteriId` varsa yalnız o hesabın. Numara el
         değiştirmiş olsa da talep açanda kalıyor.
     (c) Yoksa telefon numarasıyla, ülke koduyla birlikte ve yazılıştan
         bağımsız (lib/tel.js → telAnahtar). "532 111 22 33",
         "0532 111 22 33" ve "+90 532 111 22 33" aynı numara.

   NEDEN (kullanıcı sınaması Y3, 24 Eylül 2026). Ekranlar talebin
   `telHam` alanını hesabın `tel` alanıyla harfi harfine karşılaştırıyor
   ve talepteki `musteriId`'ye hiç bakmıyordu. Hesaptaki numara
   boşluklu, Connect talebi de boşluklu yazıyordu; servisin elle açtığı
   talep ise "0532…" diye düz rakam. Aynı müşterinin servis işi kartında
   görünmüyor, bildirimi ona gitmiyor, raporda iki ayrı kişi sayılıyordu.
   Aynı kuralı tutan dört ayrı kopya vardı ve dördü de ayrı ayrı yanlıştı.

   BİLİNÇLİ İSTİSNA: SERVİSİN ELLE AÇTIĞI KİMLİKSİZ İŞ. Servis
   Servisim'den bir talebi, kayıtlı bir müşteriyle eşleştirmeden açtıysa
   (`elle: true`, `musteriId` yok) şu yerler onu numarayla müşteriye
   BAĞLAMIYOR:
     - Connect o talebi müşterinin listesinde göstermiyor
       (lib/musterininTalepleri.js → talepHesabinMi): telefonu
       bilen herhangi biri, başkası adına açılmış işin ayrıntısını
       görmesin.
     - Bildirim o talep için yazılmıyor (backoffice/veri.js →
       bildirimAlicisi): müşteri açamayacağı bir talebin bildirimini
       almasın.
     - Numara değişince hesaba bağlanmıyor, hesaplar birleşince yeni
       hesaba taşınmıyor (backoffice/veri.js → kimliksizTalepleriBagla,
       hesapBirlesmePlani): bağlansaydı Connect onu o hesapta göstermeye,
       bildirimini ona göndermeye başlardı.
   musterininMi ise o talebi numarasıyla müşteriye bağlıyor:
   backoffice'in müşteri kartı ve raporu PAKSAN'ın o müşteriyle ilgili
   her işi görmeli.

   İSTİSNA TEK YÜKLEMDE: hesabaBaglanirMi (25 Eylül 2026, inceleme).
   İstisna önce her çağıranda ayrı yazılıydı; hesap birleştirme onu
   unuttu ve servisin elle açtığı işi numarasıyla yeni hesaba taşıdı —
   aynı iş numara değişikliğinde bağlanmıyor, birleştirmede
   bağlanıyordu. "Bu kayıt HESABIN mı" (Connect listesi, bildirim alıcısı,
   numara değişikliği, hesap birleştirme) hesabaBaglanirMi'ye; "bu kayıt
   bu MÜŞTERİYLE ilgili mi" (müşteri kartı, rapor, Servisim'in numara
   sorusu) musterininMi'ye bakıyor.

   Connect de bu dosyayı içe aktarabilir: içinde backoffice kodu yok.
   Ekrana çıkan metin yok.
   ========================================================================== */

import { kayitNumarasi, telAnahtar, telHamYap } from './tel'

/**
 * Kayıt (talep, görüş) bu müşterinin mi?
 *
 * @param {object} kayit   telHam/telUlke/musteriId/servisSiparisi taşıyan kayıt
 * @param {object} musteri hesap ya da müşteri kaydı: { id, tel, ulke }
 */
export function musterininMi(kayit, musteri) {
  if (!kayit || !musteri || kayit.servisSiparisi) return false
  if (kayit.musteriId) return kayit.musteriId === musteri.id
  const { ulke, ham } = kayitNumarasi(kayit, musteri.ulke)
  const musteriHam = telHamYap(musteri.ulke, musteri.tel)
  if (!ham || !musteriHam) return false
  return telAnahtar(ulke, ham) === telAnahtar(musteri.ulke, musteriHam)
}

/**
 * Kayıt bu HESABA bağlanır mı: Connect'te o hesabın listesinde görünür,
 * bildirimi ona gider, numara değişince ya da hesaplar birleşince onunla
 * taşınır. musterininMi'den tek farkı yukarıdaki bilinçli istisna:
 * servisin elle açtığı kimliksiz iş numarayla bağlanmıyor.
 *
 * @param {object} kayit   talep ya da görüş
 * @param {object} musteri hesap ya da müşteri kaydı: { id, tel, ulke }
 */
export function hesabaBaglanirMi(kayit, musteri) {
  if (!kayit || kayit.servisSiparisi) return false
  if (!kayit.musteriId && kayit.elle) return false
  return musterininMi(kayit, musteri)
}

/**
 * Talebi sahibine bağlayan okuyucu. Bir liste boyunca çağrılmak için:
 * numarayla arama önbelleğe alınıyor, aynı numara bir kez aranıyor.
 *
 *   const sahibi = talepSahibiBulucu(musteriler)
 *   sahibi(talep) → { anahtar, kayit } | null
 *
 * anahtar:
 *   'servis:<servis kimliği>'  servis siparişi — "müşterisi" servisin kendisi
 *   'kimlik:<hesap kimliği>'   bir hesaba bağlı talep
 *   'tel:<telAnahtar>'         kaydı olmayan kişinin talebi; aynı numaralı
 *                              talepler birbirine bağlanıyor
 * kayit: bulunan müşteri kaydı; yoksa null.
 */
export function talepSahibiBulucu(musteriler) {
  const liste = (musteriler || []).filter((m) => m && m.id)
  const kimlikle = new Map()
  for (const m of liste) if (!kimlikle.has(m.id)) kimlikle.set(m.id, m)
  const onbellek = new Map()
  const telefonla = (t) => {
    const k = `${t.telUlke || ''}|${t.telHam || t.tel || ''}`
    if (!onbellek.has(k)) onbellek.set(k, liste.find((m) => musterininMi(t, m)) || null)
    return onbellek.get(k)
  }
  return (t) => {
    if (!t) return null
    if (t.servisSiparisi) return t.servis?.id ? { anahtar: 'servis:' + t.servis.id, kayit: null } : null
    if (t.musteriId) return { anahtar: 'kimlik:' + t.musteriId, kayit: kimlikle.get(t.musteriId) || null }
    const kayit = telefonla(t)
    if (kayit) return { anahtar: 'kimlik:' + kayit.id, kayit }
    const { ulke, ham } = kayitNumarasi(t)
    return ham ? { anahtar: 'tel:' + telAnahtar(ulke, ham), kayit: null } : null
  }
}
