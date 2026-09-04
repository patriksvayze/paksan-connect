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
 * kullandığı parça.
 *
 * `kaynak` düşüşün nereden geldiğini söylüyor ve geri alınıp
 * alınamayacağını belirliyor:
 *
 *   'elle'  bayi stok ekranından kendi düştü  → geri alınabilir
 *   'talep' bir talep kapanırken düşüldü      → geri ALINAMAZ
 *
 * İkincisinin sebebi: o talep kapandı ve "parça gönderildi" diyor.
 * Stoğu tek başına geri almak, kaydın söylediğiyle sayının söylediğini
 * ayırırdı. Yanlışsa talep üzerinden düzeltilir.
 */
export function stokKullan(bayiId, kalem, adet, sebep, kim, kaynak = 'elle') {
  const hepsi = load('bayiStok', {})
  const k = hepsi[bayiId] || { parca: {}, makine: {} }
  const bolum = kalem.tur === 'makine' ? 'makine' : 'parca'
  const mevcut = Number(k[bolum]?.[kalem.anahtar])

  if (!Number.isFinite(mevcut) || mevcut <= 0) {
    return { hata: 'Bu kalemde düşülecek stok yok.' }
  }
  const istenen = Number(adet)
  if (!Number.isFinite(istenen) || istenen < 1) {
    return { hata: 'Kaç adet düşüleceğini yazın.' }
  }
  if (istenen > mevcut) {
    return { hata: `Stokta ${mevcut} adet var, daha fazlası düşülemez.` }
  }

  save('bayiStok', {
    ...hepsi,
    [bayiId]: { ...k, [bolum]: { ...k[bolum], [kalem.anahtar]: mevcut - istenen } },
  })
  const hareket = {
    id: uid(),
    bayiId,
    yon: 'cikis',
    kalemler: [{ ...kalem, adet: istenen }],
    sebep,
    kim,
    kaynak,
    tarih: Date.now(),
  }
  hareketYaz(hareket)
  return { kalan: mevcut - istenen, hareket }
}

/* ==========================================================================
   Düşüşü geri alma

   NEDEN SINIRLI

   Geri alma, "yanlış rakam girdim" için. Genel bir stok artırma aracı
   OLAMAZ — olsaydı kapattığımız deliği yeniden açardı: bayi stoğunu
   kendi artıramıyor, artışın tek yolu PAKSAN sevkiyatı.

   Bu yüzden dört kapı var. Dördü birden açık değilse düğme çıkmıyor:

     1. Hareket bir DÜŞÜŞ olmalı. Girişler PAKSAN'ın sevkiyatı; geri
        alınabilseydi bayi gelen malı yok sayabilirdi.
     2. Düşüşü bayi ELİYLE yapmış olmalı. Talep kapanırken düşen parça
        buradan geri alınmıyor (gerekçesi `stokKullan` içinde).
     3. O kalemdeki SON hareket olmalı. Araya yeni bir hareket girdiyse
        eskisini geri almak yanlış sayı üretir.
     4. Süre dolmamış olmalı. On dakika, "az önce yanlış yaptım"a
        yetiyor; düzenleme aracına dönüşmesine yetmiyor.

   HİÇBİR ŞEY SİLİNMİYOR. Geri alınan hareket kayıtta kalıyor, üstüne
   `geriAlindi` işareti konuyor ve karşılığında bir giriş hareketi
   yazılıyor. Defterde iki satır duruyor, ikisi de okunabiliyor.
   ========================================================================== */

export const GERI_ALMA_SURESI = 10 * 60 * 1000

/** Bu kalemde geri alınabilecek hareket varsa onu döndürür. */
export function geriAlinabilir(bayiId, kalem) {
  const anahtar = kalem.anahtar
  const tur = kalem.tur === 'makine' ? 'makine' : 'parca'

  /* O kalemin son hareketi — girişi de dahil. Araya giriş girdiyse
     zaten geri alınmamalı (3. kapı). */
  const son = hareketleriGetir(bayiId).find((h) =>
    (h.kalemler || []).some((x) => x.anahtar === anahtar && (x.tur || 'parca') === tur),
  )
  if (!son) return null
  if (son.yon !== 'cikis') return null
  if (son.kaynak !== 'elle') return null
  if (son.geriAlindi) return null
  if (Date.now() - son.tarih > GERI_ALMA_SURESI) return null
  return son
}

/** Geri alır: stoğu iade eder, hareketi işaretler, karşı kayıt yazar. */
export function stokGeriAl(bayiId, hareketId, kim) {
  const liste = load(HAREKET, [])
  const h = liste.find((x) => x.id === hareketId && x.bayiId === bayiId)
  if (!h) return { hata: 'Hareket bulunamadı.' }
  if (h.yon !== 'cikis' || h.kaynak !== 'elle') {
    return { hata: 'Bu hareket geri alınamıyor.' }
  }
  if (h.geriAlindi) return { hata: 'Bu düşüş zaten geri alındı.' }
  if (Date.now() - h.tarih > GERI_ALMA_SURESI) {
    return { hata: 'Geri alma süresi doldu.' }
  }

  const hepsi = load('bayiStok', {})
  const k = hepsi[bayiId] || { parca: {}, makine: {} }
  const parca = { ...k.parca }
  const makine = { ...k.makine }
  for (const kalem of h.kalemler || []) {
    const hedef = kalem.tur === 'makine' ? makine : parca
    hedef[kalem.anahtar] = (Number(hedef[kalem.anahtar]) || 0) + Number(kalem.adet)
  }
  save('bayiStok', { ...hepsi, [bayiId]: { parca, makine } })

  /* Eski hareket silinmiyor, işaretleniyor; karşılığına giriş yazılıyor. */
  save(
    HAREKET,
    [
      {
        id: uid(),
        bayiId,
        yon: 'giris',
        kalemler: h.kalemler,
        sebep: 'Düşüş geri alındı',
        kim,
        kaynak: 'geri',
        tarih: Date.now(),
      },
      ...liste.map((x) => (x.id === hareketId ? { ...x, geriAlindi: true } : x)),
    ].slice(0, 300),
  )
  return { tamam: true, kalemler: h.kalemler }
}
