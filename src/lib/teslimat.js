/* ==========================================================================
   Teslimat adresi — parçanın gideceği yer

   NEDEN AYRI BİR DOSYA

   Aynı adres üç yerde okunuyor: Servisim onu seçiyor ve yazıyor
   (servis/AdresSecici.jsx), veri katmanı talebe işliyor
   (backoffice/veri.js), backoffice'te parçayı gönderen personel
   okuyor (backoffice/ekranlar/Talepler.jsx). Biçim tek yerde durmazsa
   üç taraf aynı adresi üç ayrı biçimde yazar ve kargo etiketi
   hangisine göre hazırlanacağı belli olmaz.

   Bu dosya SAF: hiçbir yere yazmıyor, hiçbir depoya bakmıyor. Servisin
   adres defteri servis/adresler.js içinde.

   BİÇİM

     {
       kaynak:    'kayitli' | 'elle'
       adresId:   defterdeki kaydın kimliği (yalnız 'kayitli')
       baslik:    "İş Yeri", "Depo" (yalnız 'kayitli')
       alici:     teslim alacak kişi
       tel:       yalnız rakam ve baştaki artı
       il, ilce:  data/iller listesinden
       acikAdres: mahalle, sokak, bina, kapı
       yazi:      tek satır, kargo etiketi gibi
     }

   TALEBE ANLIK GÖRÜNTÜ YAZILIYOR, DEFTERE BAĞ DEĞİL. Servis defterdeki
   adresi sonradan değiştirebilir ya da silebilir; bir ay önce yola
   çıkmış parçanın nereye gittiği bundan etkilenmemeli. `adresId` yalnız
   "hangi kayıttan seçildi" bilgisi, okuyan taraf adresi ondan çözmüyor.
   ========================================================================== */

const temiz = (v) => String(v ?? '').trim()

/** Telefon kutusuna yazılabilenler: rakam ve baştaki artı. */
export function teslimatTelGiris(ham) {
  const s = String(ham || '')
  const arti = s.trimStart().startsWith('+')
  return (arti ? '+' : '') + s.replace(/\D/g, '')
}

/* Numaranın yerel 10 hanesi; çıkaramıyorsa elindeki rakamlar.

   ÜLKE ÖNEKİ İKİ BİÇİMDE YAZILIYOR ve ikisi aynı numara: "+90 532…" ile
   "0090 532…". İkincisi rehberden kopyalanınca böyle geliyor; yalnız
   "+90" tanındığı sürece servis numarayı doğru yazdığı hâlde "Teslim
   alacak kişinin telefonunu eksiksiz yazın." uyarısını alıyordu ve
   neyin yanlış olduğunu göremiyordu. Baştaki "00" artık "+" gibi
   okunuyor. */
function yerelHane(ham) {
  const s = temiz(ham)
  let r = s.replace(/\D/g, '')
  if (r.startsWith('00')) r = r.slice(2)
  if (s.startsWith('+90') || (r.length === 12 && r.startsWith('90'))) r = r.slice(2)
  return r.replace(/^0+/, '')
}

/* Numara tam mı? Türkiye numarası 10 hane (başındaki sıfır ya da +90
   sayılmadan). Sabit hat da cep de 10 hane; kargo görevlisi ikisini de
   arayabiliyor. */
export function teslimatTelTamMi(ham) {
  return yerelHane(ham).length === 10
}

/** Okunur telefon: 0532 111 22 33. Hane tutmuyorsa olduğu gibi. */
export function teslimatTelYaz(ham) {
  const s = temiz(ham)
  if (!s) return ''
  const r = yerelHane(s)
  if (r.length !== 10) return s
  return `0${r.slice(0, 3)} ${r.slice(3, 6)} ${r.slice(6, 8)} ${r.slice(8, 10)}`
}

/** "Açık adres, İlçe / İl" — kişisiz, yalnız yer. */
export function adresYazisi(a) {
  if (!a) return ''
  const yer = [temiz(a.ilce), temiz(a.il)].filter(Boolean).join(' / ')
  return [temiz(a.acikAdres), yer].filter(Boolean).join(', ')
}

/**
 * Tek satır, kargo etiketinin sırasıyla: alıcı · adres · telefon.
 * Etikette de önce kime, sonra nereye, en son aranacak numara yazar.
 */
export function teslimatYazisi(a) {
  if (!a) return ''
  return [temiz(a.alici), adresYazisi(a), teslimatTelYaz(a.tel)].filter(Boolean).join(' · ')
}

/**
 * İlk eksik alanın adı; eksik yoksa null. Sıra ekrandaki sıra, böylece
 * uyarı hep en yukarıdaki eksiği gösteriyor.
 *
 * Kargo için beşi de gerekli: görevli alıcıyı adıyla soruyor, bulamazsa
 * numarayı arıyor; il ve ilçe şubeyi, açık adres kapıyı belirliyor.
 * Eksik olan paket şubede bekler — servisin işi durur.
 */
export function teslimatEksigi(a, { baslikGerekli = false } = {}) {
  if (!a) return 'adres'
  if (baslikGerekli && temiz(a.baslik).length < 2) return 'baslik'
  if (temiz(a.alici).length < 3) return 'alici'
  if (!teslimatTelTamMi(a.tel)) return 'tel'
  if (!temiz(a.il)) return 'il'
  if (!temiz(a.ilce)) return 'ilce'
  if (temiz(a.acikAdres).length < 10) return 'acikAdres'
  return null
}

/**
 * Talebe yazılacak biçim. Eksikse null: yarım adres talebe
 * işlenmiyor, çünkü okuyan personel onu tam sanıp kargoya verir.
 */
export function teslimatTemizle(a) {
  if (!a || typeof a !== 'object') return null
  if (teslimatEksigi(a)) return null
  const kayitli = a.kaynak === 'kayitli' && temiz(a.adresId)
  const t = {
    kaynak: kayitli ? 'kayitli' : 'elle',
    ...(kayitli ? { adresId: temiz(a.adresId), baslik: temiz(a.baslik) } : {}),
    alici: temiz(a.alici),
    tel: teslimatTelGiris(a.tel),
    il: temiz(a.il),
    ilce: temiz(a.ilce),
    acikAdres: temiz(a.acikAdres),
  }
  return { ...t, yazi: teslimatYazisi(t) }
}
