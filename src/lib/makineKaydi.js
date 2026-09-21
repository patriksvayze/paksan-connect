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

   TEK MAKİNE, TEK SATIR (21 Eylül 2026)

   Defter makineyi seri numarasıyla tanıyor ve bir seri numarasına tek
   satır düşüyor. Veritabanında da öyle: makine.Makine'de (MarkaKodu,
   SeriNo) tekil; sahiplik ve servis ataması makine başına en çok bir
   açık satır (veritabani/semalar/V0010__makine.sql).

   Uygulama bunu tutmuyordu. Kayıt yazan iki işlev de her çağrıda deftere
   YENİ satır ekliyor, var olanı hiç aramıyordu. Kullanıcı iki yoldan
   gördü:

     · Connect: müşteri makinesini telefonundan silip yeniden ekleyince
       ikinci satır açılıyordu. Silmek yalnız telefondaki listeden
       kaldırıyor, defterdeki satır yerinde kalıyor (i18n → detay.silNot).
       Yeni satır servissiz doğuyor ve en önde durduğu için PAKSAN'ın
       atadığı servisi gölgeliyordu: müşteri servisini kaybediyor,
       talep açamıyordu.
     · Servisim: elle talep açarken yazılan seri başka bir müşteride
       kayıtlıysa da satır açılıyordu, servis alanı dolu olarak. Makine
       iki kişide görünüyor, en yeni satır öne geçtiği için de sahibinin
       servisi talebi açan servis oluyordu — servis kendini atamış
       oluyordu. Atama PAKSAN'ın işi; veritabanı bunu kısıtla yasaklıyor
       (MakineServisAtamasi → YapanTuruKodu).

   Sınamalar görmedi: 17 Eylül'deki kural (seri BAŞKA hesapta mı) yalnız
   Connect'in başka hesapla çakışmasına bakıyordu; aynı hesabın yeniden
   eklemesi ve Servisim yolu hiçbir senaryoda yoktu. Eşleme denetimi de
   alanlara bakıyor, bir seriye kaç satır düştüğüne bakmıyor.

   ŞİMDİ yazan işlevler önce serinin satırını arıyor ve `kayitIsle`
   kuralıyla ya o satırı güncelliyor ya da hiç dokunmuyor. Satır yoksa
   yeni satır açılıyor. Sınaması: tools/ekosistem/senaryolar.mjs → AK-18.
   ========================================================================== */

import { load, save, uid } from './storage'
import { seriBilgisi, yeniSatisMi } from './logo'
import { uygulamaKaydi } from './kayit'
import { normalizeSerial } from './serial'

const ANAHTAR = 'makineKayitlari'

/* Defterin okunduğu TEK yer. backoffice/veri.js → makineKayitlariGetir ve
   servisAtama.js → makineninKaydi da buradan okuyor; eski kopyalar
   (aşağıda) üçüne de aynı biçimde birleşmiş görünüyor. */
export function makineKayitlari() {
  return defteriTekillestir(load(ANAHTAR, []))
}

/** Seri numarasının defterdeki satırı; yoksa null. Biçim önemli değil. */
export function seriSatiri(seri, liste = makineKayitlari()) {
  const aranan = normalizeSerial(seri)
  if (!aranan) return null
  return liste.find((k) => normalizeSerial(k.seri) === aranan) || null
}

function defteriYaz(liste) {
  save(ANAHTAR, liste.slice(0, 500))
}

const hesabiVar = (k) => Boolean(k?.musteriId || k?.musteriNo)

const ayniHesap = (a, b) =>
  Boolean(
    (a.musteriId && b.musteriId && a.musteriId === b.musteriId) ||
      (a.musteriNo && b.musteriNo && a.musteriNo === b.musteriNo)
  )

const dolu = (x) => x !== null && x !== undefined && x !== ''

/* AYNI SERİ İÇİN GELEN KAYIT VAR OLAN SATIRA NE YAPAR
   (21 Eylül 2026, bkz. dosyanın başı)

     Servisim'in elle kaydı    DOKUNMAZ. Makine zaten sistemde; sahibi
                               ve servisi değişmez. Talep yine açılır,
                               satır açılmaz.
     Başka hesabın kaydı       DOKUNMAZ. Sahiplik devrini PAKSAN yapar
                               (bkz. seriBaskaHesaptaMi). Connect bu
                               durumda zaten yazmadan duruyor.
     Aynı hesabın kaydı        GÜNCELLER: müşteri makineyi telefonundan
                               silip yeniden ekledi.
     Hesapsız satıra hesap     GÜNCELLER: servisin elle açtığı makineyi
                               müşteri kendi hesabına ekledi.

   Güncellenen satırda kimlik, ilk kayıt tarihi ve kaynak YERİNDE
   KALIYOR: makine sisteme ilk o gün, o yoldan girdi. Bayi, servis ve
   Logo alanları yalnız gelen kayıtta doluysa değişiyor — yeniden
   eklemenin boş servis alanı PAKSAN'ın yaptığı atamayı silmiyor.

   @returns {{satir: object, kabul: boolean}} */
function kayitIsle(mevcut, gelen) {
  if (gelen.kaynak === 'servis') return { satir: mevcut, kabul: false }
  if (hesabiVar(mevcut) && hesabiVar(gelen) && !ayniHesap(mevcut, gelen)) {
    return { satir: mevcut, kabul: false }
  }

  const satir = { ...mevcut }
  if (hesabiVar(gelen)) {
    satir.musteriId = gelen.musteriId || null
    satir.musteriNo = gelen.musteriNo || null
    satir.musteriAd = gelen.musteriAd || mevcut.musteriAd || ''
  }
  if (dolu(gelen.il)) {
    satir.il = gelen.il
    satir.ilce = gelen.ilce || ''
  }
  if (!dolu(mevcut.productId) && dolu(gelen.productId)) satir.productId = gelen.productId
  if (dolu(gelen.servisId)) {
    satir.servisId = gelen.servisId
    satir.servisAd = gelen.servisAd || ''
  }
  if (dolu(gelen.bayiId)) {
    satir.bayiId = gelen.bayiId
    satir.bayiAd = gelen.bayiAd || ''
  }
  if (dolu(gelen.uretimTarihi)) satir.uretimTarihi = gelen.uretimTarihi
  if (dolu(gelen.faturaTarihi)) satir.faturaTarihi = gelen.faturaTarihi
  satir.logoBildi = Boolean(mevcut.logoBildi || gelen.logoBildi)
  satir.yeniSatis = Boolean(mevcut.yeniSatis || gelen.yeniSatis)
  return { satir, kabul: true }
}

/* ESKİ KOPYALAR OKURKEN BİRLEŞİYOR.

   Bu düzeltmeden önce açılmış kopya satırlar depoda duruyor (kullanıcının
   tarayıcısında denerken açtıkları dâhil). Satırlar eskiden yeniye,
   BUGÜNKÜ kurala göre yeniden işleniyor: her serinin en eski satırı
   makineyi açıyor, sonrakiler `kayitIsle`'den geçiyor. Yani Servisim'in
   sonradan açtığı kopya ve başka hesabın kopyası yok sayılıyor — bugün
   ikisi de yazılamıyor.

   Okuyan her yer aynı birleşmiş listeyi görüyor. Depo ilk yazmada
   temizleniyor: yazan işlevler bu listeden başlıyor. */
export function defteriTekillestir(satirlar = []) {
  const yer = new Map()
  const cikti = []
  /* Depo yeniden eskiye sıralı; kural eskiden yeniye işliyor. */
  for (const k of [...satirlar].reverse()) {
    const anahtar = normalizeSerial(k.seri)
    const i = anahtar ? yer.get(anahtar) : undefined
    if (i === undefined) {
      if (anahtar) yer.set(anahtar, cikti.length)
      cikti.push(k)
      continue
    }
    cikti[i] = kayitIsle(cikti[i], k).satir
  }
  return cikti.reverse()
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

   Bir seriye tek satır düşüyor (21 Eylül 2026, dosyanın başı); bu kural
   gelmeden açılmış kopyalar okurken birleşiyor ve ilk sahip geçerli
   oluyor (bkz. defteriTekillestir). */
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

  const satir = seriSatiri(aranan)
  if (!satir || !hesabiVar(satir) || bizim(satir)) return null
  return { musteriId: satir.musteriId || null, musteriNo: satir.musteriNo || null }
}

/** Kayıt defterindeki bir satırı günceller (backoffice'ten atama). */
export function makineKaydiGuncelle(id, yama) {
  const liste = makineKayitlari()
  const yeni = liste.map((k) => (k.id === id ? { ...k, ...yama } : k))
  defteriYaz(yeni)
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
   açılmış, 'musteri' uygulamadan gelmiş, 'logo' faturadan.

   SERİ SİSTEMDEYSE YAZMAZ (21 Eylül 2026). Makine zaten defterde: sahibi
   ve servisi değişmez, var olan satır döner (bkz. kayitIsle). Formu
   çağıran talebi yine açar; seri başka müşterideyse servise ve İşlem
   Kaydı'na söylüyor (servis/ekranlar/ElleKayit.jsx).

   KAYITLI MÜŞTERİNİN HESABI YAZILIYOR. Servis müşteriyi telefonundan
   bulduysa satır o hesaba bağlanıyor. Alanı form hep gönderiyordu, bu
   işlev sessizce `null` yazıyordu.

   @returns {{kayit: object, yeni: boolean}} */
export function servisMakineKaydi({
  seri,
  productId,
  musteriId = null,
  musteriNo = null,
  musteriAd = '',
  il = '',
  ilce = '',
  servisId,
  servisAd = '',
}) {
  const liste = makineKayitlari()
  const mevcut = seriSatiri(seri, liste)
  if (mevcut) return { kayit: mevcut, yeni: false }

  const kayit = {
    id: uid(),
    tarih: Date.now(),
    seri,
    productId,
    musteriId,
    musteriNo,
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
  defteriYaz([kayit, ...liste])
  return { kayit, yeni: true }
}

/**
 * Kaydı yazar ve kutlama gösterilip gösterilmeyeceğini söyler.
 *
 * SERİ DEFTERDEYSE YENİ SATIR AÇILMAZ (21 Eylül 2026): aynı hesabın ya
 * da hesapsız satırı güncellenir, başka hesabın satırına dokunulmaz
 * (bkz. kayitIsle). Kutlama yalnız makine bu hesaba İLK KEZ geçiyorsa:
 * silip yeniden ekleyen müşteriye ikinci kez "hayırlı olsun" denmez.
 *
 * @returns {Promise<{kayit: object|null, kutlama: boolean}>}
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

  const liste = makineKayitlari()
  const mevcut = seriSatiri(kayit.seri, liste)
  if (mevcut) {
    const { satir, kabul } = kayitIsle(mevcut, kayit)
    /* Başka hesapta: ekran bunu yazmadan önce soruyor
       (screens/AddMachine.jsx → cakismayaGec); buraya düştüyse arada
       başka biri kaydetti. Sahibi değişmiyor. */
    if (!kabul) return { kayit: null, kutlama: false }
    const ilkKez = !ayniHesap(mevcut, kayit)
    defteriYaz(liste.map((k) => (k.id === mevcut.id ? satir : k)))
    uygulamaKaydi(
      'makine',
      `${kayit.musteriNo || kayit.musteriAd} makine kaydetti · ${kayit.seri}`
    )
    return { kayit: satir, kutlama: ilkKez && kutlama }
  }

  defteriYaz([kayit, ...liste])
  uygulamaKaydi(
    'makine',
    `${kayit.musteriNo || kayit.musteriAd} makine kaydetti · ${kayit.seri}`
  )
  return { kayit, kutlama }
}
