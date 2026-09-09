/* ==========================================================================
   Servis siparişi — servisten PAKSAN'a

   NEDEN VAR

   Servis stokunu kendi artıramaz. Elindeki parça ve makine, PAKSAN'dan
   satın aldığı kadardır. Önce stok ekranı servise sayı kutusu veriyordu
   ve servis istediği sayıyı yazabiliyordu; bu, stoku servisin kendi
   defterine çeviriyordu. PAKSAN'ın gönderdiğiyle servisin yazdığı
   tutmayınca da rakam hiçbir şey anlatmıyordu.

   TEK ARTIŞ YOLU

     servis sipariş verir  →  PAKSAN onaylar  →  hazırlar  →  gönderir
                                                              ↓
                                                    servis stoku ARTAR

   Stok yalnızca "gönderildi" adımında artıyor; onay ya da hazırlık
   adımında artmıyor, çünkü parça henüz serviste değil.

   AZALTMA BAYİDE

   Servis stokunu kendi azaltabiliyor: müşteriye sattığı ya da serviste
   kullandığı parça. Bunun onaya gerek yok, PAKSAN'ı ilgilendirmiyor.

   HAREKET KAYDI

   Her artış ve azalış sebebiyle birlikte yazılıyor. B2B'de "bu sayı
   neden değişti" sorusunun cevabı olmadan stok güvenilmiyor; sayının
   kendisi kadar nereden geldiği de bilgi.

   BUGÜN OLMAYANLAR — bilerek

     · Kısmi sevkiyat yok: sipariş bütün hâlinde gönderiliyor. Gerçek
       hayatta bölünüyor; sunucu geldiğinde kalem bazlı duruma geçilir.
     · Rezervasyon yok: sipariş verilen parça servis stokunda görünmüyor,
       gelene kadar yok sayılıyor.
     · Fiyat ve fatura yok: bu ekran sipariş alıyor, muhasebe LOGO'da.
   ========================================================================== */

import { load, save, uid } from './storage.js'
import { MARKA, markaEk } from '../marka'

const ANAHTAR = 'servisSiparis'
const HAREKET = 'servisStokHareket'

/* Sipariş numarası talep numarasıyla aynı kalıpta: ÖNEK + YYAAGG + 4
   hane. Servis telefonda okurken hangi kayıttan bahsettiği anlaşılıyor. */
export function siparisNo() {
  const d = new Date()
  const iki = (n) => String(n).padStart(2, '0')
  const tarih = `${iki(d.getFullYear() % 100)}${iki(d.getMonth() + 1)}${iki(d.getDate())}`
  return 'SIP' + tarih + String(Math.floor(1000 + Math.random() * 9000))
}

/* Durumlar sırayla ilerliyor. `ad` servisin gördüğü, `personelAd`
   PAKSAN'ın gördüğü karşılık — servis "onaylandı" der, personel
   "onayladım" der. */
export const SIPARIS_DURUM = {
  yeni: { ad: `${markaEk('a')} iletildi`, ton: 'mavi', sira: 0 },
  onaylandi: { ad: 'Onaylandı', ton: 'mavi', sira: 1 },
  hazirlaniyor: { ad: 'Hazırlanıyor', ton: 'turuncu', sira: 2 },
  gonderildi: { ad: 'Gönderildi', ton: 'yesil', sira: 3 },
  iptal: { ad: 'İptal edildi', ton: 'gri', sira: 4 },
}

export const ACIK_DURUMLAR = ['yeni', 'onaylandi', 'hazirlaniyor']

export function siparisleriGetir() {
  return load(ANAHTAR, []).sort((a, b) => b.tarih - a.tarih)
}

export function servisinSiparisleri(servisId) {
  return siparisleriGetir().filter((s) => s.servisId === servisId)
}

function siparisleriYaz(liste) {
  save(ANAHTAR, liste)
}

/* Siparişin türü.

   GARANTİ TALEBİ AYRI BİR SİSTEM DEĞİL. Akış birebir aynı: servis
   ister, PAKSAN onaylar, hazırlar, gönderir, stok artar. Ayrı bir
   depo ve ayrı bir ekran açmak, aynı işin iki yerde yürümesi
   demekti. Fark üç yerde: parayla mı bedelsiz mi, nereden doğduğu
   (garanti talebi bir servis işinden doğuyor) ve taşıdığı kanıt. */
export const SIPARIS_TURU = {
  satinalma: 'Satın alma',
  garanti: 'Garanti talebi',
}

/**
 * Servis sipariş açar.
 *
 * `teslimat`, `istenenTarih` ve `tutar` SONRADAN EKLENDİ. Sipariş
 * ekranı önce yalnız adet alıyordu: bir buçuk milyonluk makine
 * siparişi, kutuya "1" yazıp düğmeye basmakla veriliyordu. Nereye
 * gideceği, ne zaman istendiği ve ne tuttuğu yazılı değildi — bunlar
 * B2B siparişinde telefonla konuşulan ve sonra unutulan bilgiler.
 *
 * @param {{servisId, servisAd, servisNo, kalemler, not, teslimat,
 *          istenenTarih, tutar, tur, garanti}} veri
 *        kalemler: [{ tur: 'parca'|'makine', anahtar, ad, adet, birimFiyat }]
 *        garanti: { talepNo, seri, parcaDurumu, foto, iade, sureDk, kim }
 */
export function siparisAc({
  servisId,
  servisAd,
  servisNo,
  kalemler,
  not,
  teslimat,
  istenenTarih,
  tutar,
  tur = 'satinalma',
  garanti = null,
}) {
  const temiz = (kalemler || []).filter((k) => Number(k.adet) > 0)
  if (!temiz.length) return { hata: 'En az bir ürün seçin.' }

  const siparis = {
    id: uid(),
    no: siparisNo(),
    servisId,
    servisAd,
    servisNo,
    tur,
    /* Garanti talebinin dayanağı ve kanıtı. Dayanağı bir iş olmayan
       garanti talebi, PAKSAN'ın neyin karşılığında parça gönderdiğini
       bilmemesi demek. */
    garanti,
    kalemler: temiz.map((k) => ({ ...k, adet: Number(k.adet) })),
    not: (not || '').trim(),
    teslimat: (teslimat || '').trim(),
    istenenTarih: istenenTarih || null,
    /* Sipariş anındaki tutar kaydediliyor. Fiyat listesi sonradan
       değişince "bu siparişi hangi fiyattan verdim" sorusunun cevabı
       kalsın. */
    tutar: Number(tutar) || 0,
    durum: 'yeni',
    tarih: Date.now(),
    gecmis: [{ durum: 'yeni', tarih: Date.now(), kim: servisAd }],
  }
  siparisleriYaz([siparis, ...load(ANAHTAR, [])])
  return { siparis }
}

/**
 * PAKSAN siparişin durumunu ilerletir.
 * `gonderildi` adımında servis stoku ARTIYOR — tek artış yolu bu.
 */
export function siparisDurumu(siparisId, durum, personel, kargo) {
  const liste = load(ANAHTAR, [])
  const s = liste.find((x) => x.id === siparisId)
  if (!s) return { hata: 'Sipariş bulunamadı.' }
  if (s.durum === 'gonderildi' || s.durum === 'iptal') {
    return { hata: 'Bu sipariş kapandı, durumu değiştirilemez.' }
  }

  const guncel = {
    ...s,
    durum,
    gecmis: [...(s.gecmis || []), { durum, tarih: Date.now(), kim: personel }],
  }
  if (durum === 'gonderildi') guncel.kargo = { ...(kargo || {}), tarih: Date.now() }

  siparisleriYaz(liste.map((x) => (x.id === siparisId ? guncel : x)))

  /* Stok yalnız burada artıyor. Onay ya da hazırlık adımında artmıyor:
     parça henüz serviste değil. */
  if (durum === 'gonderildi') {
    stokEkle(s.servisId, s.kalemler, `${s.no} · ${MARKA} gönderdi`, personel)
  }

  return { siparis: guncel }
}

/* ------------------------------------------------------------ Hareket */

export function hareketleriGetir(servisId) {
  return load(HAREKET, [])
    .filter((h) => h.servisId === servisId)
    .sort((a, b) => b.tarih - a.tarih)
}

function hareketYaz(kayit) {
  /* Son 300 hareket tutuluyor. Sunucu gelene kadar tarayıcı hafızası
     sınırlı; stok hareketi talep kaydından daha hızlı birikiyor. */
  save(HAREKET, [kayit, ...load(HAREKET, [])].slice(0, 300))
}

/** Siparişin kalemlerini servis stokuna ekler. Yalnız bu dosya çağırıyor. */
function stokEkle(servisId, kalemler, sebep, kim) {
  const hepsi = load('servisStok', {})
  const k = hepsi[servisId] || { parca: {}, makine: {} }
  const parca = { ...k.parca }
  const makine = { ...k.makine }

  for (const kalem of kalemler) {
    const hedef = kalem.tur === 'makine' ? makine : parca
    /* Girilmemiş kalem için sayım sıfırdan başlıyor: PAKSAN gönderdiyse
       artık o parça serviste var, "bilinmiyor" değil. */
    hedef[kalem.anahtar] = (Number(hedef[kalem.anahtar]) || 0) + Number(kalem.adet)
  }

  save('servisStok', { ...hepsi, [servisId]: { parca, makine } })
  hareketYaz({
    id: uid(),
    servisId,
    yon: 'giris',
    kalemler,
    sebep,
    kim,
    tarih: Date.now(),
  })
}

/**
 * Servis kendi stokundan düşer: müşteriye verdiği ya da serviste
 * kullandığı parça.
 *
 * `kaynak` düşüşün nereden geldiğini söylüyor ve geri alınıp
 * alınamayacağını belirliyor:
 *
 *   'elle'  servis stok ekranından kendi düştü  → geri alınabilir
 *   'talep' bir talep kapanırken düşüldü      → geri ALINAMAZ
 *
 * İkincisinin sebebi: o talep kapandı ve "parça gönderildi" diyor.
 * Stoku tek başına geri almak, kaydın söylediğiyle sayının söylediğini
 * ayırırdı. Yanlışsa talep üzerinden düzeltilir.
 */
export function stokKullan(servisId, kalem, adet, sebep, kim, kaynak = 'elle') {
  const hepsi = load('servisStok', {})
  const k = hepsi[servisId] || { parca: {}, makine: {} }
  const bolum = kalem.tur === 'makine' ? 'makine' : 'parca'
  const mevcut = Number(k[bolum]?.[kalem.anahtar])

  if (!Number.isFinite(mevcut) || mevcut <= 0) {
    return { hata: 'Bu ürün stokta yok.' }
  }
  const istenen = Number(adet)
  if (!Number.isFinite(istenen) || istenen < 1) {
    return { hata: 'Kaç adet düşüleceğini yazın.' }
  }
  if (istenen > mevcut) {
    return { hata: `Stokta ${mevcut} adet var, daha fazlası düşülemez.` }
  }

  save('servisStok', {
    ...hepsi,
    [servisId]: { ...k, [bolum]: { ...k[bolum], [kalem.anahtar]: mevcut - istenen } },
  })
  const hareket = {
    id: uid(),
    servisId,
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
   OLAMAZ — olsaydı kapattığımız deliği yeniden açardı: servis stokunu
   kendi artıramıyor, artışın tek yolu PAKSAN sevkiyatı.

   Bu yüzden dört kapı var. Dördü birden açık değilse düğme çıkmıyor:

     1. Hareket bir DÜŞÜŞ olmalı. Girişler PAKSAN'ın sevkiyatı; geri
        alınabilseydi servis gelen malı yok sayabilirdi.
     2. Düşüşü servis ELİYLE yapmış olmalı. Talep kapanırken düşen parça
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
export function geriAlinabilir(servisId, kalem) {
  const anahtar = kalem.anahtar
  const tur = kalem.tur === 'makine' ? 'makine' : 'parca'

  /* O kalemin son hareketi — girişi de dahil. Araya giriş girdiyse
     zaten geri alınmamalı (3. kapı). */
  const son = hareketleriGetir(servisId).find((h) =>
    (h.kalemler || []).some((x) => x.anahtar === anahtar && (x.tur || 'parca') === tur),
  )
  if (!son) return null
  if (son.yon !== 'cikis') return null
  if (son.kaynak !== 'elle') return null
  if (son.geriAlindi) return null
  if (Date.now() - son.tarih > GERI_ALMA_SURESI) return null
  return son
}

/** Geri alır: stoku iade eder, hareketi işaretler, karşı kayıt yazar. */
export function stokGeriAl(servisId, hareketId, kim) {
  const liste = load(HAREKET, [])
  const h = liste.find((x) => x.id === hareketId && x.servisId === servisId)
  if (!h) return { hata: 'Hareket bulunamadı.' }
  if (h.yon !== 'cikis' || h.kaynak !== 'elle') {
    return { hata: 'Bu hareket geri alınamıyor.' }
  }
  if (h.geriAlindi) return { hata: 'Bu düşüş zaten geri alındı.' }
  if (Date.now() - h.tarih > GERI_ALMA_SURESI) {
    return { hata: 'Geri alma süresi doldu.' }
  }

  const hepsi = load('servisStok', {})
  const k = hepsi[servisId] || { parca: {}, makine: {} }
  const parca = { ...k.parca }
  const makine = { ...k.makine }
  for (const kalem of h.kalemler || []) {
    const hedef = kalem.tur === 'makine' ? makine : parca
    hedef[kalem.anahtar] = (Number(hedef[kalem.anahtar]) || 0) + Number(kalem.adet)
  }
  save('servisStok', { ...hepsi, [servisId]: { parca, makine } })

  /* Eski hareket silinmiyor, işaretleniyor; karşılığına giriş yazılıyor. */
  save(
    HAREKET,
    [
      {
        id: uid(),
        servisId,
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
