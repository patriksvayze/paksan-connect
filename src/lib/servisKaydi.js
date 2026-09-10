/* ==========================================================================
   SERVİS KAYDI — sahada yapılan işin tek belgesi

   Servis elemanı müşterinin makinesine gittiğinde bu kaydı dolduruyor.
   Müşterinin talebi uygulamadan mı geldi yoksa telefonla mı aradı,
   fark etmiyor: ikisi de aynı nesne, aynı kayıt.

   BU KAYIT AYRI BİR VARLIK DEĞİL, TALEBİN KAPANIŞI

   Bir dönem servis siparişleri ayrı bir defterde (`servisSiparis`)
   tutuluyordu ve backoffice'te kendi ekranı vardı. Kaldırıldı. Sebebi
   tek cümle: aynı işin iki yerde iki satırı oluyordu ve Talepler
   ekranı — personelin bütün gün baktığı yer — o işleri hiç görmüyordu.
   Her yeni iş türü için yeni bir ekran açmak, sonunda hiçbir ekranın
   tam resmi göstermemesi demek.

   Şimdi kayıt bir TALEBİN üstünde duruyor ve talep, içeriğine göre
   doğru masaya düşüyor.

   GARANTİ KAPSAMINDA İŞ İKİ AŞAMADA YÜRÜYOR

   ÖNCE BÖYLE DEĞİLDİ ve yanlıştı: servis sahada bir kerede her şeyi
   yazıyordu — arıza, gereken parça, yol, işçilik — kayıt onaya
   gidiyordu, PAKSAN onaylayınca servisin hesabına para yazılıyordu ve
   parça ANCAK ONDAN SONRA hazırlanıyordu. İki sonucu vardı:

     · Servis, işini bitirmeden parasını almış oluyordu. Parça daha
       yola çıkmamışken hak ediş hesaba geçiyordu.
     · Parça, onay sırası beklediği için gecikiyordu. Oysa parçanın
       hazırlanması onaya bağlı bir şey değil; makine tarlada duruyor.

   ŞİMDİKİ SIRA

     1. AŞAMA · PARÇA   Servis sahada arızayı buluyor ve gereken
        parçayı istiyor. Para sorulmuyor. Talep yedek parça masasına
        düşüyor, parça hazırlanıp servise gönderiliyor.

     2. AŞAMA · İŞ BİTTİ   Parça eline geçen servis takıyor ve
        uygulamada "Parçayı Taktım" diyor. Yapılan iş, yol ve işçilik
        BURADA soruluyor. Kayıt onaya gidiyor; PAKSAN onaylayınca
        hesaba alacak yazılıyor ve talep kapanıyor.

   Parça gerekmeyen garanti işi (ayar, bakım, arıza bulunamadı) tek
   ziyarette bitiyor: 1. aşama hiç doğmuyor, kayıt doğrudan 2. aşama
   olarak gönderiliyor.

   GARANTİ DIŞINDA İKİ KAPI VAR VE İKİSİ DE TEK AŞAMA

     PARÇA ELDE   PAKSAN'a iş düşmüyor. Servis parayı müşteriden
       alıyor, talebi kapatıyor. Kayıt yine tutuluyor: makinenin arıza
       geçmişi imalatçının en değerli verisi.

     PARÇA PAKSAN'DAN   Bir satın alma. Yedek parça personeline
       düşüyor, hak ediş doğmuyor. Parça gelince servis takıp talebi
       kendisi kapatıyor.

   NEDEN BU KADAR ÇOK ALAN SORULUYOR

   `servisKapanis.js` başındaki kural hâlâ geçerli: servisten
   karşılıksız veri istenmez. Burada karşılık en güçlü hâlinde —
   BU KAYIT PARANIN KENDİSİ. Servis yolunu, işçiliğini ve parçasını
   yazmadan hak edişini alamıyor. Doğruluğun bekçisi iyi niyet değil,
   servisin kendi cebi.

   Buna karşılık müşteri ve makine bilgileri TEKRAR SORULMUYOR: talep
   uygulamadan geldiyse zaten içinde. Yalnız eksik olan alanlar
   soruluyor (bkz. `eksikAlanlar`).
   ========================================================================== */

import { MARKA, markaEk } from '../marka'

/* KAYDIN AŞAMASI.

   `parca`  parça istendi, iş bitmedi. Yol ve işçilik sorulmadı,
            hak ediş doğmadı.
   `bitti`  iş bitti. Yapılan iş, yol ve işçilik yazılı; garanti
            kapısındaysa hak ediş doğuyor.

   Aşama kaydın kendi alanı; ekran hangi aşamada olduğunu buradan
   okuyor ve talebin durumu da buna göre belirleniyor. */
export const ASAMA = { parca: 'parca', bitti: 'bitti' }

/** Kaydın üç kapısı. Ekrandaki düğme yazıları da bunlar. */
export const KAPI = {
  garanti: 'Garanti Kapsamında',
  eldeParca: 'Garanti Dışı · Parçayı Ben Taktım',
  parcaIste: `Garanti Dışı · Parçayı ${MARKA} Göndersin`,
}

/* PARÇANIN NESİ VAR? DİYE SORULMUYOR.

   Bir dönem soruluyordu (Kırıldı · Aşındı · Çalışmıyor · Kaçırıyor ·
   Eğildi) ve kaldırıldı. Cevabın karşılığı yoktu:

     · PAKSAN parçayı bu cevaba bakarak hazırlamıyor; hangi parçanın
       istendiği kodla zaten yazılı.
     · Garanti kararını da bu cevap vermiyor. Kararı PAKSAN veriyor
       ve eski parça iade edilmediği için tek dayanak fotoğraf.
     · Servise karşılığı olmayan bir soru sorulursa geçiştirilerek
       doldurulur. Geçiştirilmiş veri, verinin olmamasından kötüdür —
       PAKSAN ona bakarak karar alıyor.

   Fotoğraf duruyor: garanti tartışmasında bakılacak tek şey o. */

/** Sahada yapılan iş — tek dokunuş. */
export const YAPILAN_IS = [
  'İlk Kurulum ve Çalıştırma',
  'Ayar Yapıldı',
  'Bakım Yapıldı',
  'Parça Değişti',
  'Arıza Bulunamadı',
]

/* ==========================================================================
   Hak ediş kalemleri

   İKİ KALEM VAR VE İKİSİ AYRI CİNSTEN SORULUYOR

     YOL   servis kaç kilometre gittiğini yazıyor, parasını PAKSAN
           kendi tarifesinden hesaplıyor. Kilometre bir OLGU: servis
           uydurursa yalanı yol haritasında görünür. Tutarı servise
           yazdırmak, aynı mesafeye her servisten başka rakam gelmesi
           demekti.

     İŞÇİLİK  servis tutarı kendisi yazıyor. İşçilik işe göre
           değişiyor — yarım saatlik ayar ile gün süren şase işi aynı
           tarifeden ödenemez. Servis rakamı koyuyor, PAKSAN onaylıyor
           ya da gerekçesiyle düzeltiyor (bkz. veri.js → hakkedisDuzelt).

   YOL TARİFESİ BUGÜN KODDA. Sunucu geldiğinde PAKSAN'ın kendi
   tarifesinden gelecek; o gün yalnız bu sabit yer değiştirecek,
   hesabın kendisi değişmeyecek.
   ========================================================================== */

export const TARIFE = {
  /* Gidiş-dönüş toplam kilometre üzerinden, kilometre başına. */
  yolKm: 12,
}

/**
 * Kaydın hak ediş tutarını hesaplar.
 * Garanti dışı işte hak ediş doğmuyor: parayı müşteri ödüyor.
 *
 * @returns {{yol, iscilik, toplam, kalemler: Array}}
 */
export function hakkedisHesapla(kayit) {
  if (kayit?.kapi !== 'garanti') {
    return { yol: 0, iscilik: 0, toplam: 0, kalemler: [] }
  }
  const km = Math.max(0, Number(kayit.km) || 0)
  const yol = Math.round(km * TARIFE.yolKm)
  const iscilik = Math.max(0, Math.round(Number(kayit.iscilik) || 0))

  const kalemler = []
  if (km) kalemler.push({ ad: `Yol · ${km} km`, tutar: yol })
  if (iscilik) kalemler.push({ ad: 'İşçilik', tutar: iscilik })

  return { yol, iscilik, toplam: yol + iscilik, kalemler }
}

/* ==========================================================================
   Eksik alanlar

   Talep uygulamadan geldiyse müşteri ve makine bilgisi zaten içinde.
   Servis elemanına aynı şeyi ikinci kez yazdırmak, formu uzatmaktan
   başka bir şey yapmıyor ve uzayan form geçiştiriliyor.

   Bu fonksiyon "hangi alan gerçekten eksik" sorusunu cevaplıyor;
   ekran yalnız onları soruyor.
   ========================================================================== */
export function eksikAlanlar(talep) {
  const eksik = []
  if (!talep?.ad?.trim()) eksik.push('ad')
  if (!talep?.telHam && !talep?.tel) eksik.push('tel')
  if (!talep?.adres && !talep?.fatura?.adres) eksik.push('adres')
  if (!talep?.makine?.serial) eksik.push('seri')
  if (!talep?.makine?.productId) eksik.push('urun')
  return eksik
}

/* ==========================================================================
   Doğrulama

   AŞAMAYA VE KAPIYA GÖRE DEĞİŞİYOR.

   1. aşamada iş henüz bitmedi: ne yapıldığı, yol ve işçilik
   sorulmuyor, sorulması da yanlış olurdu. Orada tek soru var —
   hangi parça, neden.

   2. aşamada kayıt bir rapor değil, ödemenin dayanağı; garanti
   kapısında ayrıntı isteniyor. Garanti dışı kapıda yalnız ne
   yapıldığı soruluyor.
   ========================================================================== */
export function kaydiDogrula(kayit) {
  if (!KAPI[kayit?.kapi]) return 'Garanti durumunu seçin.'

  const parcalar = temizParcalar(kayit.parcalar)

  if (kayit?.asama === ASAMA.parca) {
    if (!parcalar.length) return 'Gereken parçayı seçin.'
    return null
  }

  if (!kayit.yapilanIs) return 'Ne yapıldığını seçin.'

  if (kayit.kapi === 'garanti') {
    if (!parcalar.length && !Number(kayit.km) && !Number(kayit.iscilik)) {
      return 'Değişen parçayı, gidilen yolu veya işçilik tutarını yazın.'
    }
  }

  if (kayit.kapi === 'parcaIste' && !parcalar.length) {
    return `${markaEk('dan')} istenecek parçayı seçin.`
  }
  if (kayit.kapi === 'eldeParca' && !parcalar.length) {
    return 'Taktığınız parçayı seçin.'
  }

  if (Number(kayit.km) < 0) return 'Toplam kilometreyi sıfır veya daha büyük yazın.'
  return null
}

/* Boş ve sıfır adetli satırları atar, adedi sayıya çevirir.

   PARÇA KODU VE FİYATI DA TAŞINIYOR.

   Önce yalnız ad ve adet saklanıyordu; parçalar da makinenin destek
   grubundan gelen "Rulman", "Kayış" gibi genel adlardı. Seçim
   PAKSAN'ın kendi kataloğuna bağlandıktan sonra (bkz.
   servis/ekranlar/ParcaSec.jsx) adın tek başına taşınması KAYIP:
   yedek parça personeli "İPLİ BIÇAK" satırını görüp hangi kodu
   hazırlayacağını yine bilemezdi.

   Fiyat da kaydın kendi anındaki değeriyle duruyor — katalog fiyatı
   sonradan değişince "bu iş o gün ne tutuyordu" sorusunun cevabı
   kalsın. Katalog dışından gelen eski kayıtlarda iki alan da yok;
   yokluk sorun değil, okuyan ekranlar `kod` olmayan satırı da
   çiziyor. */
export function temizParcalar(parcalar = []) {
  return parcalar
    .filter((p) => p?.ad && Number(p.adet) > 0)
    .map((p) => ({
      ad: p.ad,
      adet: Number(p.adet),
      ...(p.kod ? { kod: p.kod } : {}),
      ...(Number.isFinite(p.fiyat) ? { fiyat: p.fiyat } : {}),
    }))
}

/* "Rulman × 2, Kayış × 1" — müşterinin de okuduğu satır.

   KOD BURADA YAZMIYOR ve bilerek: bu metin `cozum.parcalar` alanına
   gidiyor, müşteri uygulamasında görünüyor. Çiftçi için "20131010104.01"
   bir şey anlatmıyor. Kodun gerektiği yer PAKSAN'ın yedek parça
   masası; orası yapısal alanı okuyor (bkz. `temizParcalar`). */
export function parcaYazisi(parcalar = []) {
  return temizParcalar(parcalar).map((p) => `${p.ad} × ${p.adet}`).join(', ')
}

/* PAKSAN tarafının okuduğu satır: kod da yazılı.

   "İPLİ BIÇAK × 1" satırı yedek parça personeline hangi bıçağı
   hazırlayacağını söylemiyor; 538 parçalık katalogta aynı adı taşıyan
   birden çok kayıt var. */
export function parcaYazisiKodlu(parcalar = []) {
  return temizParcalar(parcalar)
    .map((p) => (p.kod ? `${p.ad} (${p.kod}) × ${p.adet}` : `${p.ad} × ${p.adet}`))
    .join(', ')
}

/* ==========================================================================
   Kaydın talebe yazılacak hâli

   `cozum` nesnesi KORUNUYOR ve aynı alanları taşımaya devam ediyor
   (`yapilanIs`, `parcalar`, `ucret`, `ozet`). Sebebi: müşteri
   uygulaması ve backoffice o dört alanı okuyor
   (bkz. screens/RequestDetail.jsx, Talepler.jsx). Yeni alanlar onun
   yanına ekleniyor, yerine geçmiyor — üç taraf da okumaya devam
   ediyor.
   ========================================================================== */

const UCRET_YAZI = {
  garanti: 'Garanti kapsamında',
  eldeParca: 'Müşteri ödedi',
  parcaIste: 'Müşteri ödedi',
}

/**
 * Kayıttan `cozum` üretir.
 * @returns {{cozum, hakkedis, parcalar}}
 */
export function kaydiCozume(kayit) {
  const parcalar = temizParcalar(kayit.parcalar)
  const parcaYazi = parcaYazisi(parcalar)
  const ucret = UCRET_YAZI[kayit.kapi] || ''
  const hakkedis = hakkedisHesapla(kayit)

  const cozum = {
    yapilanIs: kayit.yapilanIs,
    parcalar: parcaYazi,
    ucret,
    ozet: [kayit.yapilanIs, parcaYazi, ucret].filter(Boolean).join(' · '),
  }
  if (kayit.sonuc?.trim()) cozum.not = kayit.sonuc.trim()

  return { cozum, hakkedis, parcalar }
}

/* ==========================================================================
   Kapının sonucu — talep nereye gidiyor

   Tek yerde tutuluyor ki servis uygulaması, backoffice ve raporlar
   aynı cevabı versin.

     durum  talebin yeni durumu
     masa   PAKSAN'da hangi masanın önüne düşüyor (rol kimliği)
     ========================================================================== */
export function kapininSonucu(kayit) {
  const parcaVar = temizParcalar(kayit.parcalar).length > 0

  /* 1. AŞAMA — hangi kapı olursa olsun sıra yedek parçada.

     Garanti kaydı ONAYA GİTMİYOR artık. Onay, işin bitmesini
     bekliyor: para ancak parça takıldıktan sonra doğuyor. Önce
     onaya gidiyordu ve servis işini bitirmeden parasını alıyordu. */
  if (kayit.asama === ASAMA.parca) {
    return { durum: 'parcaBekliyor', masa: 'parca' }
  }

  if (kayit.kapi === 'garanti') {
    /* İş bitti; sıra PAKSAN servis masasında. Yol, işçilik ve
       parçalar inceleniyor, onaylanınca hesaba alacak yazılıyor ve
       talep kapanıyor (bkz. veri.js → hakkedisOnayla). */
    return { durum: 'onayBekliyor', masa: 'servis' }
  }
  if (kayit.kapi === 'parcaIste') {
    /* Satın alma; onay gerekmiyor, doğrudan yedek parçaya. */
    return { durum: 'parcaBekliyor', masa: 'parca' }
  }
  /* Parça serviste vardı, iş bitti: PAKSAN'a iş düşmüyor. */
  return { durum: 'kapandi', masa: null, parcaVar }
}
