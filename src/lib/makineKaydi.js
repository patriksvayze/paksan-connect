/* ==========================================================================
   Makine kaydı

   Müşteri makinesini uygulamaya seri numarasıyla kaydettiğinde buradan
   geçiyor. İki iş yapılıyor:

     1. Kayıt PAKSAN tarafına düşüyor (backoffice’te görünüyor).
     2. Logo'ya sorulup bunun YENİ bir satış olup olmadığı öğreniliyor.

   İkincisi neden gerekli: seri numarası tek başına "bu makine yeni
   satıldı" demiyor. 2019'da satılmış bir makine bugün de kaydedilebilir,
   ikinci el alınmış olabilir, sahibi değişmiş olabilir. Faturayı yalnız
   Logo biliyor.

   Bu yüzden hem bayiye satış yazmak hem de müşteriye "hayırlı olsun"
   demek Logo'nun cevabına bağlı. Logo bağlı değilken ikisi de olmuyor —
   yanlış bilgi vermektense hiç vermemek doğru.
   ========================================================================== */

import { load, save, uid } from './storage'
import { seriBilgisi, yeniSatisMi } from './logo'
import { uygulamaKaydi } from './kayit'

const ANAHTAR = 'makineKayitlari'

export function makineKayitlari() {
  return load(ANAHTAR, [])
}

/* Servisin elle açtığı kayıt.

   `makineKaydet` müşteri akışı için yazıldı: Logo'ya sorup faturayı
   öğreniyor ve `servisId`'yi oradan dolduruyor. Logo kapalı olduğu için
   o alan bugün hep boş kalıyor.

   Servis elle kayıt açtığında bayiyi zaten BİLİYORUZ — sormaya gerek
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
  /* Logo kapalıysa null dönüyor; kayıt yine yazılıyor ama servis ve
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

    /* Logo'dan gelenler */
    servisId: logo?.servisId || null,
    servisAd: logo?.servisAd || '',
    uretimTarihi: logo?.uretimTarihi || null,
    faturaTarihi: logo?.faturaTarihi || null,

    /* Logo cevap verdi mi — "bilmiyoruz" ile "yeni değil" ayrı şeyler */
    logoBildi: Boolean(logo),
    yeniSatis: kutlama,
  }

  save(ANAHTAR, [kayit, ...makineKayitlari()].slice(0, 500))
  uygulamaKaydi(
    'makine',
    `${kayit.musteriNo || kayit.musteriAd} makine kaydetti · ${kayit.seri}`
  )
  return { kayit, kutlama }
}
