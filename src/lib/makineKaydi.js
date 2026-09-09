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

const ANAHTAR = 'makineKayitlari'

export function makineKayitlari() {
  return load(ANAHTAR, [])
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
