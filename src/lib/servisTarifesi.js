/* ==========================================================================
   SERVİS HİZMET ÜCRETİ — yol (km başına) ve işçilik (saat başına)

   KULLANICININ İSTEĞİ (23 Eylül 2026): "Servislerin hizmet
   ücretlendirmelerini, yani KM başına ücret ve saat başına ücret
   bilgilerinin (makine bazında da ayarlanabilse iyi olur) BackOffice
   üzerinden ilgili personel tarafından değiştirilebileceği bir alan
   yaratmalıyız." Önce iki ücret kodda sabitti (lib/servisKaydi.js →
   TARIFE: 12 TL/km, 50 TL/saat) ve değiştirmek geliştiriciye düşüyordu.

   DÖRT KATMAN, EN ÖZELİ GEÇERLİ

     1  servise özel · makineye göre   (bu servis, bu model)
     2  servise özel                   (bu servis, bütün makineler)
     3  genel · makineye göre          (bütün servisler, bu model)
     4  genel                          (bütün servisler, bütün makineler)

   Her kalem (yol ve işçilik) AYRI AYRI çözülüyor: bir servise yalnız
   saat ücreti özel yazıldıysa yolu genel tarifeden geliyor. Boş kutu
   "üst katmandan al" demek; sıfır yazılırsa ücret sıfır.

   SERVİS KATMANI GENELİN ÖNÜNDE — makineye göre olanın da. Servise özel
   ücret, o servisle yapılmış bir anlaşma: "bu servisin saati 60 TL"
   dendiyse genel tarifedeki "Orkinos 80 TL" o serviste geçmiyor. O
   servise Orkinos'ta başka bir ücret isteniyorsa servisin kendi
   makineye göre satırı yazılıyor (1. katman). Ters sıra da savunulabilirdi;
   bu sıra seçildi çünkü "servise özel" sözünün personelin aklındaki
   karşılığı "o servisin her şeyi". Backoffice'teki servis formu bu
   durumu ekranda söylüyor.

   MAKİNE = ÜRÜN MODELİ (katalogdaki ürün kimliği, talepteki
   `makine.productId`). Tek tek makineye (seri numarasına) ücret yazmanın
   bir anlamı yok: ücret işin zorluğuna bağlı, zorluk da modele.

   GEÇMİŞ DEĞİŞMİYOR. Ücret servis kaydına gönderildiği anda yazılıyor
   (`kmUcreti`, `saatUcreti`; bkz. backoffice/veri.js → servisKaydiGonder).
   Tarife sonra değişse de gönderilmiş kaydın tutarı aynı kalıyor —
   katalogdaki parça fiyatıyla aynı ilke (CLAUDE.md "Katalog değişince
   geçmiş işlem değişmez").

   BU DOSYA SAF. Depoya bakmıyor; tarifeyi parametre olarak alıyor. Depo
   işi backoffice/veri.js'te (hizmetTarifesiGetir, genelTarifeyiKaydet,
   servisTarifesiniKaydet). Böylece Servisim, backoffice ve ekosistem
   sınaması aynı hesabı çağırıyor.

   VERİTABANI: hakedis.Tarife. Tabloda bugün yalnız MarkaKodu boyutu var;
   servis ve ürün boyutu için iki sütun ve tekillik dizinleri gerekiyor
   (VT-TASARIM-EKLERI.md §5).
   ========================================================================== */

import { TARIFE } from './servisKaydi.js'

/** Ücret kalemleri. Sıra ekrandaki sıra. */
export const KALEMLER = ['yolKm', 'iscilikSaat']

/* Ücret tam lira: hak ediş de tam lira hesaplanıyor (servisKaydi.js →
   hakkedisHesapla, veritabanında ROUND(..., 0)). Boş, eksi ya da sayı
   olmayan değer "yazılmamış" sayılıyor. */
export function ucretOku(deger) {
  if (deger === null || deger === undefined || deger === '') return null
  const n = Number(String(deger).replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

/* Nesneden yalnız yazılı kalemler; hiçbiri yoksa null. */
function kalemleriAl(o) {
  const sonuc = {}
  for (const k of KALEMLER) {
    const v = ucretOku(o?.[k])
    if (v !== null) sonuc[k] = v
  }
  return Object.keys(sonuc).length ? sonuc : null
}

/* { urunId: {yolKm?, iscilikSaat?} } — boş satırlar atılıyor. */
function modelleriAl(o) {
  const sonuc = {}
  for (const [urunId, satir] of Object.entries(o || {})) {
    const kalemler = kalemleriAl(satir)
    if (urunId && kalemler) sonuc[urunId] = kalemler
  }
  return sonuc
}

/**
 * Depodaki ham kaydı okunur biçime getirir. Hiç yazılmamışsa (ya da
 * bozuksa) başlangıç tarifesi: TARIFE sabiti.
 *
 * @returns {{
 *   genel: {yolKm: number, iscilikSaat: number, guncelleme?: object},
 *   modeller: Object<string, {yolKm?: number, iscilikSaat?: number}>,
 *   servisler: Object<string, {yolKm?, iscilikSaat?, modeller, guncelleme?}>
 * }}
 */
export function tarifeleriDuzenle(ham) {
  const genel = {
    yolKm: ucretOku(ham?.genel?.yolKm) ?? TARIFE.yolKm,
    iscilikSaat: ucretOku(ham?.genel?.iscilikSaat) ?? TARIFE.iscilikSaat,
  }
  if (ham?.genel?.guncelleme) genel.guncelleme = ham.genel.guncelleme

  const servisler = {}
  for (const [servisId, s] of Object.entries(ham?.servisler || {})) {
    const kalemler = kalemleriAl(s)
    const modeller = modelleriAl(s?.modeller)
    if (!servisId || (!kalemler && !Object.keys(modeller).length)) continue
    servisler[servisId] = {
      ...(kalemler || {}),
      modeller,
      ...(s.guncelleme ? { guncelleme: s.guncelleme } : {}),
    }
  }

  return { genel, modeller: modelleriAl(ham?.modeller), servisler }
}

/**
 * Bir servisin bir makinedeki geçerli ücretleri.
 *
 * @param {object} tarifeler  tarifeleriDuzenle() çıktısı
 * @param {string|null} servisId
 * @param {string|null} urunId  makinenin ürün kimliği; bilinmiyorsa null
 * @returns {{yolKm: number, iscilikSaat: number,
 *            kaynak: {yolKm: string, iscilikSaat: string}}}
 *          kaynak: 'servisMakine' | 'servis' | 'makine' | 'genel'
 */
export function tarifeCoz(tarifeler, servisId, urunId) {
  const t = tarifeler || tarifeleriDuzenle(null)
  const s = (servisId && t.servisler?.[servisId]) || null
  const sonuc = { kaynak: {} }
  for (const k of KALEMLER) {
    const adaylar = [
      ['servisMakine', urunId ? s?.modeller?.[urunId]?.[k] : undefined],
      ['servis', s?.[k]],
      ['makine', urunId ? t.modeller?.[urunId]?.[k] : undefined],
      ['genel', t.genel[k]],
    ]
    const [kaynak, deger] = adaylar.find(([, v]) => v !== undefined && v !== null)
    sonuc[k] = deger
    sonuc.kaynak[k] = kaynak
  }
  return sonuc
}

/**
 * Bir servisin makineye göre farklı ücret aldığı modeller — Servisim'in
 * "Ücretlendirmeler" bölümü ve backoffice'in servis satırı bunu gösteriyor.
 * Temel ücretle aynı çıkan model listeye girmiyor.
 *
 * @returns {Array<{urunId, yolKm, iscilikSaat}>}
 */
export function makineFarklari(tarifeler, servisId) {
  const t = tarifeler || tarifeleriDuzenle(null)
  const temel = tarifeCoz(t, servisId, null)
  const urunler = new Set([
    ...Object.keys(t.modeller || {}),
    ...Object.keys(t.servisler?.[servisId]?.modeller || {}),
  ])
  const liste = []
  for (const urunId of urunler) {
    const c = tarifeCoz(t, servisId, urunId)
    if (KALEMLER.some((k) => c[k] !== temel[k])) liste.push({ urunId, yolKm: c.yolKm, iscilikSaat: c.iscilikSaat })
  }
  return liste
}

/**
 * Verilen kalemlerde özel ücreti olan servisler. Genel tarife
 * değiştirilirken çıkan uyarı bunu listeliyor.
 *
 * @param {string[]} kalemler  değişen kalemler
 * @returns {Array<{servisId, kalemler: object, makineli: boolean}>}
 *   `kalemler` servisin kendi (makinesiz) özel değerleri; `makineli`
 *   servisin bu kalemlerde makineye göre satırı da var mı.
 */
export function ozelUcretliServisler(tarifeler, kalemler = KALEMLER) {
  const liste = []
  for (const [servisId, s] of Object.entries(tarifeler?.servisler || {})) {
    const kendi = {}
    for (const k of kalemler) if (s[k] !== undefined) kendi[k] = s[k]
    const makineli = Object.values(s.modeller || {}).some((m) => kalemler.some((k) => m[k] !== undefined))
    if (Object.keys(kendi).length || makineli) liste.push({ servisId, kalemler: kendi, makineli })
  }
  return liste
}

/**
 * Servislerin verilen kalemlerdeki özel ücretlerini kaldırır — genel
 * tarife "özel ücretler de değişsin" diye kaydedildiğinde. Değişmeyen
 * kalemin özel ücreti yerinde kalıyor: personel yalnız saat ücretini
 * değiştirdiyse servislerin özel yol ücreti silinmiyor.
 */
export function ozelleriKaldir(tarifeler, kalemler) {
  const servisler = {}
  for (const [servisId, s] of Object.entries(tarifeler.servisler || {})) {
    const yeni = { ...s, modeller: {} }
    for (const k of kalemler) delete yeni[k]
    for (const [urunId, m] of Object.entries(s.modeller || {})) {
      const kalan = { ...m }
      for (const k of kalemler) delete kalan[k]
      if (Object.keys(kalan).length) yeni.modeller[urunId] = kalan
    }
    servisler[servisId] = yeni
  }
  return tarifeleriDuzenle({ ...tarifeler, servisler })
}

const makineKatmani = (kaynak) => kaynak === 'makine' || kaynak === 'servisMakine'

/* Bir servisin ilgilendiği bütün modeller: iki tarifede de geçen her
   ürün kimliği. Değişiklik bildirimi bunların hepsine bakıyor. */
function ilgiliUrunler(servisId, ...tarifeler) {
  const urunler = new Set()
  for (const t of tarifeler) {
    Object.keys(t?.modeller || {}).forEach((u) => urunler.add(u))
    Object.keys(t?.servisler?.[servisId]?.modeller || {}).forEach((u) => urunler.add(u))
  }
  return [...urunler]
}

/**
 * Bir servis için iki tarife arasındaki fark — servise gidecek
 * bildirimin içeriği. Değişiklik yoksa null.
 *
 * @returns {null|{yolKm?: {once, simdi}, iscilikSaat?: {once, simdi}, makine: boolean}}
 *   Temel ücretteki değişim kalem kalem; `makine` yalnız bazı makinelerde
 *   ücret değiştiyse true.
 */
export function tarifeFarki(onceki, sonraki, servisId) {
  const once = tarifeCoz(onceki, servisId, null)
  const simdi = tarifeCoz(sonraki, servisId, null)
  const fark = { makine: false }
  let degisti = false
  for (const k of KALEMLER) {
    if (once[k] !== simdi[k]) {
      fark[k] = { once: once[k], simdi: simdi[k] }
      degisti = true
    }
  }
  for (const urunId of ilgiliUrunler(servisId, onceki, sonraki)) {
    const a = tarifeCoz(onceki, servisId, urunId)
    const b = tarifeCoz(sonraki, servisId, urunId)
    /* Makine temel ücreti izliyorsa (iki tarifede de kendi satırı yok)
       değişimi temel satırda zaten yazılı; ayrıca sayılmıyor. */
    const kendiDegisti = KALEMLER.some(
      (k) => a[k] !== b[k] && (makineKatmani(a.kaynak[k]) || makineKatmani(b.kaynak[k])),
    )
    if (kendiDegisti) {
      fark.makine = true
      degisti = true
    }
  }
  return degisti ? fark : null
}
