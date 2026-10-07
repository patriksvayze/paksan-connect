import { servisleriGetir } from '../data/katalog/servisler.js'
import { load, save, uid } from '../lib/storage'
import { teslimatEksigi, teslimatTelGiris, teslimatTemizle } from '../lib/teslimat'

/* ==========================================================================
   Adreslerim — servisin teslimat adresi defteri

   KULLANICININ İSTEĞİ (17 Eylül 2026): Servis yedek parça siparişinde
   ve garanti işinin parça isteğinde parçanın gönderileceği adresi her
   seferinde yazıyordu. Adresler bir kez kaydediliyor, sonra tek
   dokunuşla seçiliyor.

   SERVİS BUNU DOLDURDUĞUNDA NE ALIYOR? Parçası doğru kapıya, doğru
   kişiye geliyor; bir dahaki siparişte adresi yeniden yazmıyor. Veri
   servisin kendi işinin yan ürünü (bkz. CLAUDE.md → Ekosistemin
   Temeli).

   TEK OKUYUCU, TEK YAZICI. Defter yalnız bu dosyadan okunuyor ve
   yazılıyor; ekranlar depoya doğrudan bakmıyor. Sunucu geldiğinde
   yalnız bu dosyanın içi değişecek.

   SERVİS BAŞINA. Anahtar `servisAdresleri`, değer `{ [servisId]: [...] }`.
   Aynı telefonda başka bir servis hesabıyla girilirse öbürünün
   adresleri görünmüyor.

   DEFTER HİÇ BOŞ AÇILMIYOR: FİRMA ADRESİ HAZIR GELİYOR

   KULLANICININ İSTEĞİ (18 Eylül 2026): "Servisim kullanıcısının
   backoffice'te zaten kayıtlı bir adresi oluyor. Bu adres herkeste
   varsayılan adres olarak dursun. Şu anki mekanizma da ekstra adres
   girilmek istendiğinde kullanılır."

   Yani defterin ilk satırı servisin kendi yazdığı bir kayıt değil:
   PAKSAN'ın servis kaydındaki firma adresi (`data/katalog/servisler.js`
   → ad, il, ilce, adres, tel). Servis hiçbir şey yapmadan siparişe
   girdiğinde adresi seçili geliyor. "Adres Ekle" ve "Elle Gir" bundan
   sonra EKSTRA adres için.

   FİRMA ADRESİ TÜRETİLİYOR, SAKLANMIYOR. Deftere kopyalansaydı PAKSAN
   kaydı güncellendiğinde kopya eskide kalırdı ve parça eski kapıya
   giderdi. Bu yüzden her okumada kayıttan yeniden kuruluyor; depoda
   yalnız servisin kendi eklediği adresler duruyor.

   BU YÜZDEN DÜZENLENEMİYOR VE SİLİNEMİYOR. Firma adresi PAKSAN'ın
   kaydı; servisin telefonundan değiştirilirse iki taraf iki ayrı adres
   bilir. Servis taşındıysa PAKSAN'ı arıyor — hesap silme ve numara
   değişikliğinde olduğu gibi (bkz. CLAUDE.md → Standing kurallar).
   Bu arada kendi eklediği adresi seçip işine devam edebiliyor.

   VARSAYILAN HEP TEK VE HEP VAR. Firma adresi varsayılan; servis kendi
   adreslerinden birini varsayılan yaparsa o geçerli oluyor — çoğu işi
   deposuna ya da müşterisine gidiyorsa ekran ona uysun. PAKSAN kaydında
   adres yoksa (eksik kayıt) eski davranış sürüyor: ilk eklenen adres
   varsayılan olur.

   BUGÜNKÜ SINIR: defter telefonun hafızasında. Servis başka bir
   telefondan girerse KENDİ eklediği adresleri görmez; firma adresi ise
   PAKSAN kaydından geldiği için her telefonda var. Talebe yazılan adres
   talebin içinde durduğu için PAKSAN'a ulaşır.
   ========================================================================== */

const ANAHTAR = 'servisAdresleri'

/* Firma adresinin kimliği. Servisin kendi adresleri `uid()` alıyor;
   bu sabit hem defterde hem talebe yazılan anlık görüntüde duruyor, o
   yüzden backoffice parçanın firma adresine mi yoksa servisin yazdığı
   bir adrese mi gideceğini ayırt edebiliyor. */
export const FIRMA_ADRES_ID = 'firma'

/* Firma adresinin defterdeki adı. Servis kendi adreslerine istediği adı
   veriyor; bunun adını PAKSAN kaydı belirlediği için burada sabit. */
export const FIRMA_ADRES_BASLIK = 'Kayıtlı firma adresi'

function hepsi() {
  const v = load(ANAHTAR, {})
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
}

function yaz(servisId, liste) {
  save(ANAHTAR, { ...hepsi(), [servisId]: liste })
}

/* Varsayılan başta, ötekiler eklenme sırasıyla: servis en eski
   adresini hep aynı yerde bulur. */
function sirala(liste) {
  return [...liste].sort(
    (a, b) => Number(b.varsayilan) - Number(a.varsayilan) || (a.olusma || 0) - (b.olusma || 0),
  )
}

/* Varsayılan tek olsun; firma adresi yoksa bir tane de olsun.

   Firma adresi varken servisin kendi adreslerinden HİÇBİRİ varsayılan
   olmayabilir — o zaman varsayılan firma adresidir. Buradaki zorlama
   yalnız firma adresi olmayan (PAKSAN kaydında adres yazmayan) servis
   için: seçici açıldığında seçili gelecek bir adres hep bulunsun. */
function duzelt(liste, firmaVar) {
  if (!liste.length) return liste
  let bulundu = false
  const tekli = liste.map((a) => {
    if (a.varsayilan && !bulundu) {
      bulundu = true
      return a
    }
    return a.varsayilan ? { ...a, varsayilan: false } : a
  })
  if (bulundu || firmaVar) return tekli
  const ilk = sirala(tekli)[0]
  return tekli.map((a) => (a.id === ilk.id ? { ...a, varsayilan: true } : a))
}

function alanlar(veri) {
  const t = (v) => String(v ?? '').trim()
  return {
    baslik: t(veri.baslik),
    alici: t(veri.alici),
    tel: teslimatTelGiris(veri.tel),
    il: t(veri.il),
    ilce: t(veri.ilce),
    acikAdres: t(veri.acikAdres),
  }
}

/* Servisin PAKSAN'daki kaydı (src/data/katalog/servisler.js). */
function servisKaydi(servisId) {
  return servisleriGetir().find((s) => s.id === servisId) || null
}

/**
 * PAKSAN kaydındaki firma adresinin defterdeki hâli — türetilmiş, depoda
 * karşılığı yok. Kayıtta adres, il, ilçe ya da telefon eksikse null
 * dönüyor: yarım bir adres kargoya çıkmaz, defterin ilk satırı olarak
 * da durmamalı.
 *
 * @returns {object|null}
 */
export function firmaAdresi(servisId) {
  const servis = servisKaydi(servisId)
  if (!servis) return null
  const veri = {
    baslik: FIRMA_ADRES_BASLIK,
    alici: servis.ad || '',
    tel: teslimatTelGiris(servis.tel || ''),
    il: servis.il || '',
    ilce: servis.ilce || '',
    acikAdres: servis.adres || '',
  }
  if (adresEksigi(veri)) return null
  /* `olusma: 0` — sıralamada servisin kendi adreslerinin önünde kalsın.
     `firma: true` ekranların düzenle/sil sunmaması için. */
  return { id: FIRMA_ADRES_ID, ...veri, firma: true, olusma: 0 }
}

/** Yalnız servisin kendi eklediği adresler (depoda duranlar). */
function kendiAdresleri(servisId, firmaVar) {
  const liste = hepsi()[servisId]
  return Array.isArray(liste) ? sirala(duzelt(liste, firmaVar)) : []
}

/**
 * Servisin adresleri. Firma adresi HER ZAMAN ilk satır; arkasından
 * servisin kendi eklediği adresler, varsayılan olan başta.
 */
export function adresleriGetir(servisId) {
  if (!servisId) return []
  const firma = firmaAdresi(servisId)
  const kendi = kendiAdresleri(servisId, Boolean(firma))
  if (!firma) return kendi
  /* Servis kendi adreslerinden birini varsayılan yaptıysa firma adresi
     varsayılan olmaktan çıkıyor; yerini bırakmıyor, yalnız rozeti. */
  return [{ ...firma, varsayilan: !kendi.some((a) => a.varsayilan) }, ...kendi]
}

/** Eksik alanın adı ya da null (bkz. lib/teslimat.js → teslimatEksigi). */
export function adresEksigi(veri) {
  return teslimatEksigi(veri, { baslikGerekli: true })
}

/**
 * Yeni adres — servisin kendi eklediği EKSTRA adres.
 *
 * Varsayılan olmuyor: varsayılan firma adresi. Yalnız PAKSAN kaydında
 * adres yazmayan servis için ilk adres varsayılan oluyor, yoksa seçici
 * hiçbir şey seçili olmadan açılırdı.
 */
export function adresEkle(servisId, veri) {
  const eksik = adresEksigi(veri)
  if (eksik) return { eksik }
  const firmaVar = Boolean(firmaAdresi(servisId))
  const mevcut = kendiAdresleri(servisId, firmaVar)
  const adres = {
    id: uid(),
    ...alanlar(veri),
    varsayilan: !firmaVar && mevcut.length === 0,
    olusma: Date.now(),
  }
  yaz(servisId, [...mevcut, adres])
  return { adres }
}

/* FİRMA ADRESİ DEĞİŞTİRİLEMİYOR VE SİLİNEMİYOR. Kayıt PAKSAN'ın;
   telefondan değiştirilirse iki taraf iki ayrı adres bilir ve parça
   hangisine göre yola çıkacağı belirsizleşir. Ekranlar bu düğmeleri
   zaten göstermiyor; buradaki kapı ikinci sıra. */
export function adresGuncelle(servisId, id, veri) {
  if (id === FIRMA_ADRES_ID) return { eksik: 'adres' }
  const eksik = adresEksigi(veri)
  if (eksik) return { eksik }
  const firmaVar = Boolean(firmaAdresi(servisId))
  const mevcut = kendiAdresleri(servisId, firmaVar)
  const eski = mevcut.find((a) => a.id === id)
  if (!eski) return { eksik: 'adres' }
  const adres = { ...eski, ...alanlar(veri), guncelleme: Date.now() }
  yaz(
    servisId,
    mevcut.map((a) => (a.id === id ? adres : a)),
  )
  return { adres }
}

/**
 * Siler. Varsayılan silindiyse yerine firma adresi geçiyor; firma
 * adresi yoksa kalanların en eskisi.
 */
export function adresSil(servisId, id) {
  if (id === FIRMA_ADRES_ID) return adresleriGetir(servisId)
  const firmaVar = Boolean(firmaAdresi(servisId))
  const kalan = kendiAdresleri(servisId, firmaVar).filter((a) => a.id !== id)
  yaz(servisId, duzelt(kalan, firmaVar))
  return adresleriGetir(servisId)
}

/**
 * Varsayılanı değiştirir. Firma adresi seçilirse servisin kendi
 * adreslerindeki varsayılan kalkıyor ve varsayılan yine firmaya
 * dönüyor (bkz. `adresleriGetir`).
 */
export function varsayilanYap(servisId, id) {
  const liste = adresleriGetir(servisId)
  if (!liste.some((a) => a.id === id)) return liste
  const firmaVar = Boolean(firmaAdresi(servisId))
  const kendi = kendiAdresleri(servisId, firmaVar)
  yaz(
    servisId,
    kendi.map((a) => ({ ...a, varsayilan: a.id === id })),
  )
  return adresleriGetir(servisId)
}

/** Defterdeki adresin talebe yazılacak anlık görüntüsü. */
export function adresTeslimata(adres) {
  if (!adres) return null
  return teslimatTemizle({ ...adres, kaynak: 'kayitli', adresId: adres.id })
}

/**
 * Formun başlangıç önerisi. Firma adresi artık deftere hazır geldiği
 * için (bkz. `firmaAdresi`) bu öneri iki yerde kalıyor:
 *
 *   · EKSTRA adres eklerken alıcı, telefon ve il — ikinci adres başka
 *     bir yer ama teslim alacak kişi ve il çoğu zaman aynı;
 *   · PAKSAN kaydı eksik olduğu için firma adresi kurulamadığında
 *     (adres ya da ilçe yazılmamış) formun tamamı — servis eksiği
 *     kendi tamamlasın, sıfırdan yazmasın.
 *
 * Başlık ekranda veriliyor (bkz. AdresSecici.jsx).
 */
export function firmaAdresiOnerisi(servis, servisAd) {
  if (!servis) return null
  return {
    alici: servis.ad || servisAd || '',
    tel: teslimatTelGiris(servis.tel || ''),
    il: servis.il || '',
    ilce: servis.ilce || '',
    acikAdres: servis.adres || '',
  }
}
