/* ==========================================================================
   Makine kaydı

   Müşteri makinesini uygulamaya seri numarasıyla kaydettiğinde buradan
   geçiyor. İki iş yapılıyor:

     1. Kayıt PAKSAN tarafına düşüyor (backoffice'te görünüyor).
     2. Logo'ya sorulup bunun YENİ bir satış olup olmadığı öğreniliyor.

   İkincisi neden gerekli: seri numarası tek başına "bu makine yeni
   satıldı" demiyor. 2019'da satılmış bir makine bugün de kaydedilebilir,
   ikinci el alınmış olabilir, sahibi değişmiş olabilir. Faturayı yalnız
   Logo biliyor.

   Bu yüzden hem bayiye satış yazmak hem de müşteriye "hayırlı olsun"
   demek Logo'nun cevabına bağlı. Logo bağlı değilken ikisi de olmuyor —
   yanlış bilgi vermektense hiç vermemek doğru.

   İKİ AYRI ALAN: BAYİ VE SERVİS

     bayiId    makineyi SATAN bayi. Logo'dan gelir; Logo kapalıyken
               personel backoffice'ten girer.
     servisId  makineye BAKACAK servis. Personel elle atar. Boşsa
               bayinin çalıştığı servis geçerli olur.

   İkisi bir dönem tek alanda tutuluyordu ve adı `servisId` idi; Logo'nun
   verdiği değer ise bayiydi. Ad ile içerik birbirini tutmuyordu.
   ========================================================================== */

import { load, save, uid } from './storage'
import { seriBilgisi, yeniSatisMi } from './logo'
import { uygulamaKaydi } from './kayit'
import { normalizeSerial } from './serial'

const ANAHTAR = 'makineKayitlari'

export function makineKayitlari() {
  return load(ANAHTAR, [])
}

/* SERİ BAŞKA HESAPTA MI (17 Eylül 2026, kullanıcının kararı)

   Bir makine tek hesapta durur. Müşteri makine eklerken aynı seri
   defterde BAŞKA bir hesaba bağlıysa ikinci satır açılmıyordu değil,
   sessizce açılıyordu — ve en yeni satır `servisAtama.makineninKaydi`
   içinde öne geçip PAKSAN'ın atadığı servisi gölgeliyordu.

   Artık ekleme durur ve müşteri iki yoldan birini seçer: "numaram
   değişti" (yazılı talep, PAKSAN doğrular ve eski hesabı bu hesaba
   geçirir) ya da "makineyi başkasından aldım" (PAKSAN aranır, devri
   PAKSAN yapar). Soruyu soran tek yer burası; ekran kendi içinde
   defteri taramaz.

   BAŞKA HESAP NE DEMEK: satırda bir hesap kimliği (`musteriId` ya da
   `musteriNo`) var ve bu kullanıcınınkiyle tutmuyor. Servisin elle
   açtığı hesapsız satır (`kaynak: 'servis'`) kimsenin hesabı değil;
   müşteri makinesini üstüne ekleyebilir.

   DÖNEN DEĞER yalnız hesabın kimliği — ad ve telefon DEĞİL. Ekran onu
   göstermez: başkasının bilgisi, ve makineyi çalmış biri de bu ekranı
   görebilir. Kimlik yalnız talebe yazılıyor ki PAKSAN hangi hesaba
   bakacağını bilsin. Sunucu geldiğinde bu cevap sunucudan gelecek ve
   hesap kimliği bile istemciye inmeyecek (bkz. veritabani/tasarim.md).

   Aynı seri için birden çok eski satır varsa (bu kural gelmeden
   açılmış kopyalar) başka hesabın en yeni satırı dönüyor; defter
   yeniden eskiye sıralı. Bu hesabın da bir satırı olması çakışmayı
   kaldırmıyor: sahiplik belirsiz, kararı PAKSAN verir. */
/**
 * @param {string} seri  müşterinin yazdığı seri (biçimi önemli değil)
 * @param {{id?: string, no?: string}|null} user  bu cihazdaki hesap
 * @returns {null|{musteriId: string|null, musteriNo: string|null}}
 */
export function seriBaskaHesaptaMi(seri, user) {
  const aranan = normalizeSerial(seri)
  if (!aranan) return null

  const bizim = (k) =>
    (k.musteriId && user?.id && k.musteriId === user.id) ||
    (k.musteriNo && user?.no && k.musteriNo === user.no)

  const satir = makineKayitlari().find(
    (k) =>
      normalizeSerial(k.seri) === aranan &&
      (k.musteriId || k.musteriNo) &&
      !bizim(k)
  )
  if (!satir) return null
  return { musteriId: satir.musteriId || null, musteriNo: satir.musteriNo || null }
}

/** Kayıt defterindeki bir satırı günceller (backoffice'ten atama). */
export function makineKaydiGuncelle(id, yama) {
  const liste = makineKayitlari()
  const yeni = liste.map((k) => (k.id === id ? { ...k, ...yama } : k))
  save(ANAHTAR, yeni)
  return yeni.find((k) => k.id === id) || null
}

/* Servisin elle açtığı kayıt.

   `makineKaydet` müşteri akışı için yazıldı: Logo'ya sorup faturayı
   öğreniyor ve `bayiId`'yi oradan dolduruyor. Logo kapalı olduğu için
   o alan bugün hep boş kalıyor.

   Servis elle kayıt açtığında servisi zaten BİLİYORUZ — sormaya gerek
   yok. Bu fonksiyon aynı deftere aynı biçimde yazıyor, farkı servis
   alanını doğrudan doldurması ve Logo'yu beklememesi.

   `kaynak` alanı satırın nereden geldiğini söylüyor: 'servis' elle
   açılmış, 'musteri' uygulamadan gelmiş, 'logo' faturadan. */
export function servisMakineKaydi({
  seri,
  productId,
  musteriAd = '',
  il = '',
  ilce = '',
  servisId,
  servisAd = '',
}) {
  const kayit = {
    id: uid(),
    tarih: Date.now(),
    seri,
    productId,
    musteriId: null,
    musteriNo: null,
    musteriAd,
    il,
    ilce,
    bayiId: null,
    bayiAd: '',
    servisId,
    servisAd,
    uretimTarihi: null,
    faturaTarihi: null,
    logoBildi: false,
    yeniSatis: false,
    kaynak: 'servis',
  }
  save(ANAHTAR, [kayit, ...makineKayitlari()].slice(0, 500))
  return kayit
}

/**
 * Kaydı yazar ve kutlama gösterilip gösterilmeyeceğini söyler.
 *
 * @returns {Promise<{kayit: object, kutlama: boolean}>}
 */
export async function makineKaydet(makine, user) {
  /* Logo kapalıysa null dönüyor; kayıt yine yazılıyor ama bayi ve
     fatura alanları boş kalıyor. */
  const logo = await seriBilgisi(makine.serial)
  const kutlama = yeniSatisMi(logo)

  const kayit = {
    id: uid(),
    tarih: Date.now(),

    seri: makine.serial,
    productId: makine.productId,

    musteriId: user?.id || null,
    musteriNo: user?.no || null,
    musteriAd: user?.ad || '',
    il: user?.il || '',
    ilce: user?.ilce || '',

    /* Logo'dan gelenler — fatura bayiye kesiliyor, gelen değer bayi. */
    bayiId: logo?.bayiId || null,
    bayiAd: logo?.bayiAd || '',
    uretimTarihi: logo?.uretimTarihi || null,
    faturaTarihi: logo?.faturaTarihi || null,

    /* Servis ataması personelin işi; Logo bunu bilmiyor. */
    servisId: null,
    servisAd: '',

    /* Logo cevap verdi mi — "bilmiyoruz" ile "yeni değil" ayrı şeyler */
    logoBildi: Boolean(logo),
    yeniSatis: kutlama,
    kaynak: 'musteri',
  }

  save(ANAHTAR, [kayit, ...makineKayitlari()].slice(0, 500))
  uygulamaKaydi(
    'makine',
    `${kayit.musteriNo || kayit.musteriAd} makine kaydetti · ${kayit.seri}`
  )
  return { kayit, kutlama }
}
