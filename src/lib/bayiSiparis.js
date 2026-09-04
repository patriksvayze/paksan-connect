/* ==========================================================================
   Bayi siparişi — bayiden PAKSAN'a

   NEDEN VAR

   Bayi stoğunu kendi artıramaz. Elindeki parça ve makine, PAKSAN'dan
   satın aldığı kadardır. Önce stok ekranı bayiye sayı kutusu veriyordu
   ve bayi istediği sayıyı yazabiliyordu; bu, stoğu bayinin kendi
   defterine çeviriyordu. PAKSAN'ın gönderdiğiyle bayinin yazdığı
   tutmayınca da rakam hiçbir şey anlatmıyordu.

   TEK ARTIŞ YOLU

     bayi sipariş verir  →  PAKSAN onaylar  →  hazırlar  →  gönderir
                                                              ↓
                                                    bayi stoğu ARTAR

   Stok yalnızca "gönderildi" adımında artıyor; onay ya da hazırlık
   adımında artmıyor, çünkü parça henüz bayide değil.

   AZALTMA BAYİDE

   Bayi stoğunu kendi azaltabiliyor: müşteriye sattığı ya da serviste
   kullandığı parça. Bunun onaya gerek yok, PAKSAN'ı ilgilendirmiyor.

   HAREKET KAYDI

   Her artış ve azalış sebebiyle birlikte yazılıyor. B2B'de "bu sayı
   neden değişti" sorusunun cevabı olmadan stok güvenilmiyor; sayının
   kendisi kadar nereden geldiği de bilgi.

   BUGÜN OLMAYANLAR — bilerek

     · Kısmi sevkiyat yok: sipariş bütün hâlinde gönderiliyor. Gerçek
       hayatta bölünüyor; sunucu geldiğinde kalem bazlı duruma geçilir.
     · Rezervasyon yok: sipariş verilen parça bayi stoğunda görünmüyor,
       gelene kadar yok sayılıyor.
     · Fiyat ve fatura yok: bu ekran sipariş alıyor, muhasebe LOGO'da.
   ========================================================================== */

import { load, save, uid } from './storage.js'

const ANAHTAR = 'bayiSiparis'
const HAREKET = 'bayiStokHareket'

/* Sipariş numarası talep numarasıyla aynı kalıpta: ÖNEK + YYAAGG + 4
   hane. Bayi telefonda okurken hangi kayıttan bahsettiği anlaşılıyor. */
export function siparisNo() {
  const d = new Date()
  const iki = (n) => String(n).padStart(2, '0')
  const tarih = `${iki(d.getFullYear() % 100)}${iki(d.getMonth() + 1)}${iki(d.getDate())}`
  return 'SIP' + tarih + String(Math.floor(1000 + Math.random() * 9000))
}

/* Durumlar sırayla ilerliyor. `ad` bayinin gördüğü, `personelAd`
   PAKSAN'ın gördüğü karşılık — bayi "onaylandı" der, personel
   "onayladım" der. */
export const SIPARIS_DURUM = {
  yeni: { ad: 'PAKSAN’a iletildi', ton: 'mavi', sira: 0 },
  onaylandi: { ad: 'Onaylandı', ton: 'mavi', sira: 1 },
  hazirlaniyor: { ad: 'Hazırlanıyor', ton: 'turuncu', sira: 2 },
  gonderildi: { ad: 'Gönderildi', ton: 'yesil', sira: 3 },
  iptal: { ad: 'İptal edildi', ton: 'gri', sira: 4 },
}

export const ACIK_DURUMLAR = ['yeni', 'onaylandi', 'hazirlaniyor']

export function siparisleriGetir() {
  return load(ANAHTAR, []).sort((a, b) => b.tarih - a.tarih)
}

export function bayininSiparisleri(bayiId) {
  return siparisleriGetir().filter((s) => s.bayiId === bayiId)
}

function siparisleriYaz(liste) {
  save(ANAHTAR, liste)
}

/**
 * Bayi sipariş açar.
 * @param {{bayiId, bayiAd, bayiNo, kalemler, not}} veri
 *        kalemler: [{ tur: 'parca'|'makine', anahtar, ad, adet }]
 */
export function siparisAc({ bayiId, bayiAd, bayiNo, kalemler, not }) {
  const temiz = (kalemler || []).filter((k) => Number(k.adet) > 0)
  if (!temiz.length) return { hata: 'En az bir kalem seçin.' }

  const siparis = {
    id: uid(),
    no: siparisNo(),
    bayiId,
    bayiAd,
    bayiNo,
    kalemler: temiz.map((k) => ({ ...k, adet: Number(k.adet) })),
    not: (not || '').trim(),
    durum: 'yeni',
    tarih: Date.now(),
    gecmis: [{ durum: 'yeni', tarih: Date.now(), kim: bayiAd }],
  }
  siparisleriYaz([siparis, ...load(ANAHTAR, [])])
  return { siparis }
}

/**
 * PAKSAN siparişin durumunu ilerletir.
 * `gonderildi` adımında bayi stoğu ARTIYOR — tek artış yolu bu.
 */
export function siparisDurumu(siparisId, durum, personel, kargo) {
  const liste = load(ANAHTAR, [])
  const s = liste.find((x) => x.id === siparisId)
  if (!s) return { hata: 'Sipariş bulunamadı.' }
  if (s.durum === 'gonderildi' || s.durum === 'iptal') {
    return { hata: 'Bu sipariş kapandı, durumu değişmiyor.' }
  }

  const guncel = {
    ...s,
    durum,
    gecmis: [...(s.gecmis || []), { durum, tarih: Date.now(), kim: personel }],
  }
  if (durum === 'gonderildi') guncel.kargo = { ...(kargo || {}), tarih: Date.now() }

  siparisleriYaz(liste.map((x) => (x.id === siparisId ? guncel : x)))

  /* Stok yalnız burada artıyor. Onay ya da hazırlık adımında artmıyor:
     parça henüz bayide değil. */
  if (durum === 'gonderildi') {
    stokEkle(s.bayiId, s.kalemler, `${s.no} · PAKSAN gönderdi`, personel)
  }

  return { siparis: guncel }
}

/* ------------------------------------------------------------ Hareket */

export function hareketleriGetir(bayiId) {
  return load(HAREKET, [])
    .filter((h) => h.bayiId === bayiId)
    .sort((a, b) => b.tarih - a.tarih)
}

function hareketYaz(kayit) {
  /* Son 300 hareket tutuluyor. Sunucu gelene kadar tarayıcı hafızası
     sınırlı; stok hareketi talep kaydından daha hızlı birikiyor. */
  save(HAREKET, [kayit, ...load(HAREKET, [])].slice(0, 300))
}

/** Siparişin kalemlerini bayi stoğuna ekler. Yalnız bu dosya çağırıyor. */
function stokEkle(bayiId, kalemler, sebep, kim) {
  const hepsi = load('bayiStok', {})
  const k = hepsi[bayiId] || { parca: {}, makine: {} }
  const parca = { ...k.parca }
  const makine = { ...k.makine }

  for (const kalem of kalemler) {
    const hedef = kalem.tur === 'makine' ? makine : parca
    /* Girilmemiş kalem için sayım sıfırdan başlıyor: PAKSAN gönderdiyse
       artık o parça bayide var, "bilinmiyor" değil. */
    hedef[kalem.anahtar] = (Number(hedef[kalem.anahtar]) || 0) + Number(kalem.adet)
  }

  save('bayiStok', { ...hepsi, [bayiId]: { parca, makine } })
  hareketYaz({
    id: uid(),
    bayiId,
    yon: 'giris',
    kalemler,
    sebep,
    kim,
    tarih: Date.now(),
  })
}

/**
 * Bayi kendi stoğundan düşer: müşteriye verdiği ya da serviste
 * kullandığı parça. Onay gerekmiyor.
 */
export function stokKullan(bayiId, kalem, adet, sebep, kim) {
  const hepsi = load('bayiStok', {})
  const k = hepsi[bayiId] || { parca: {}, makine: {} }
  const bolum = kalem.tur === 'makine' ? 'makine' : 'parca'
  const mevcut = Number(k[bolum]?.[kalem.anahtar])

  if (!Number.isFinite(mevcut) || mevcut <= 0) {
    return { hata: 'Bu kalemde düşülecek stok yok.' }
  }
  const dus = Math.min(Number(adet) || 1, mevcut)

  save('bayiStok', {
    ...hepsi,
    [bayiId]: { ...k, [bolum]: { ...k[bolum], [kalem.anahtar]: mevcut - dus } },
  })
  hareketYaz({
    id: uid(),
    bayiId,
    yon: 'cikis',
    kalemler: [{ ...kalem, adet: dus }],
    sebep,
    kim,
    tarih: Date.now(),
  })
  return { kalan: mevcut - dus }
}
