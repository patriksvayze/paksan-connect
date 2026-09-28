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

   GARANTİ DIŞI İŞ KAYIT DEĞİL (15 Eylül 2026, kullanıcının kararı)

   Kayıt bir dönem garanti dışı iki kapı daha taşıyordu ve servis
   ekranında üçünden birini seçiyordu:

     PARÇA ELDE (`eldeParca`)   servis parayı müşteriden alıp talebi
       kapatıyordu; kayıt arıza geçmişi için tutuluyordu.
     PARÇA PAKSAN'DAN (`parcaIste`)   bir satın alma; yedek parça
       personeline düşüyordu, parça gelince servis talebi kapatıyordu.

   İkisi de yeni kayıtta YAZILMIYOR. Garanti dışında elindeki parçayla
   yapılan iş PAKSAN'ı ilgilendirmiyor ve servisten karşılığı olmayan
   bir kayıt istemek geçiştirilmiş veri demekti. Garanti dışında parça
   gerekiyorsa servis parça siparişini kendi Parça ekranından veriyor.
   Garanti dışı yapılmış müşteri talebi kayıtsız kapanıyor
   (bkz. servis/ekranlar/TalepDetay.jsx → garantiDisi, GARANTI_DISI_OZET).

   ESKİ KAYITLAR İÇİN DEĞERLER DURUYOR: `KAPI` etiketleri, `UCRET_YAZI`,
   doğrulamanın kapıya özel kuralları ve `kapininSonucu` dalları. Depoda
   o kapılarla yazılmış kayıtlar var; backoffice düzeltmesi
   (hakkedisDuzelt) kaydı yeniden doğruluyor ve yolu yarıda kalmış
   parça isteği TalepDetay'daki "Parçayı Taktım" dalıyla bitiyor.

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

import { MARKA, markaEk, PARA_BIRIMI, paraYaz } from '../marka'
import { iptalEdilenSatirlar, siparisNetTutari } from './servisFiyat'
import { makineDurumAdi } from '../data/talepAlanlari'

/* KAYDIN AŞAMASI.

   `parca`  parça istendi, iş bitmedi. Yol ve işçilik sorulmadı,
            hak ediş doğmadı.
   `bitti`  iş bitti. Yapılan iş, yol ve işçilik yazılı; garanti
            kapısındaysa hak ediş doğuyor.

   Aşama kaydın kendi alanı; ekran hangi aşamada olduğunu buradan
   okuyor ve talebin durumu da buna göre belirleniyor. */
export const ASAMA = { parca: 'parca', bitti: 'bitti' }

/* BU ZİYARETİN KAYDI (26 Eylül 2026, ikinci kullanıcı sınaması).

   `servisKaydi` talebin EN SON kaydı (backoffice/veri.js →
   servisKaydiGonder). Müşteri "Sorun Devam Ediyor" deyince ya da PAKSAN
   kapanmış talebi yeniden açınca talep açık bir duruma dönüyor ama son
   kayıt yerinde kalıyor: o artık ÖNCEKİ ziyaretin kaydı. Servisim onu bu
   ziyaretinmiş gibi okuyordu:
     · kayıt formu geçen ziyaretin yapılan işi, km'si ve süresiyle dolu
       açılıyordu. Parça isteğinde bu alanlar görünmediği için eski
       değerler kayda gitti; "Parçayı Taktım" 20 km / 1 saat hazır
       geldi. Fark edilmezse hak edişe eski rakam yazılır.
     · "Randevu" düğmesi çıkmıyordu, iş "Yeni" sekmesine düşmüyordu.
   Kural: 1. aşamadaki kayıt (parça istendi, iş bitmedi) hep bu
   ziyaretin. Bitmiş kayıt yalnız talep onun doğurduğu ya da izleyen bir
   durumdaysa bu ziyaretin; talep yeniden açık bir duruma döndüyse önceki
   ziyaretin ve yeni kayıt gelince veri katmanı onu arşive
   (`oncekiKayitlar`) taşıyor. Veri katmanının "aynı ziyaretin 2.
   aşaması" kuralıyla (`devam`) aynı ayrım. `parcaBekliyor` listede,
   çünkü eski garanti dışı parça isteği (kapı `parcaIste`) bitmiş kayıtla
   o duruma gidiyor (bkz. kapininSonucu). */
const KAYDI_IZLEYEN_DURUMLAR = ['parcaBekliyor', 'onayBekliyor', 'kapandi', 'iptal']

/** Talebin bu ziyarete ait servis kaydı; yoksa null. */
export function buZiyaretinKaydi(talep) {
  const k = talep?.servisKaydi
  if (!k) return null
  if (k.asama === ASAMA.parca) return k
  return KAYDI_IZLEYEN_DURUMLAR.includes(talep.status || 'yeni') ? k : null
}

/* "SERVİS TALEBİ NEDENİ"NİN İLK DEĞERİ (26 Eylül 2026, ikinci kullanıcı
   sınaması). Kayıt formu bu kutuyu müşterinin açıklamasıyla açıyor ve
   kutu boşken kayıt gitmiyor. İki durumda yanlış ya da boş geliyordu:
     · Yeniden açılan işte ilk açıklama geliyordu; müşterinin bu ziyareti
       doğuran cümlesi ("yine aynı yay kırıldı") "Sorun Devam Ediyor"
       kaydında (`tekrar`). Onun en yenisi önce.
     · Kurulum talebinde Connect açıklama sormuyor (screens/RequestForm.jsx
       → arizaVar); kutu boş geliyor, servis bir şey uydurmak zorunda
       kalıyordu. Makinenin durumu ("İlk kurulum yapılacak") yazılıyor;
       demo kaydı da aynı sırayı izliyor (backoffice/demoServis.js).
   Belirti seçilmiş ama açıklama yazılmamışsa belirtiler. */
export function talepNedeni(talep) {
  const sonTekrar = [...(talep?.tekrar || [])].reverse().find((x) => x?.aciklama?.trim())
  if (sonTekrar) return sonTekrar.aciklama.trim()
  if (talep?.aciklama?.trim()) return talep.aciklama.trim()
  if (talep?.belirtiler?.length) return talep.belirtiler.join(', ')
  return makineDurumAdi(talep?.durum)
}

/** Kaydın kapısı. Yeni kayıt yalnız `garanti`; öteki ikisi eski
    kayıtların etiketi (bkz. dosya başı). */
export const KAPI = {
  garanti: 'Garanti Kapsamında',
  eldeParca: 'Garanti Dışı · Parçayı Ben Taktım',
  parcaIste: `Garanti Dışı · Parçayı ${MARKA} Göndersin`,
}

/* Garanti dışı yapılıp kayıtsız kapanan talebin kapanış özeti
   (`cozum.ozet`, yanında `garantiDisi: true`). Backoffice talep
   detayında ve işlem geçmişinde, servis kapanmış talepte okuyor.
   Metin Codex'ten (15 Eylül 2026). */
export const GARANTI_DISI_OZET = 'Garanti dışında tamamlandı'

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

     İŞÇİLİK  servis işe harcadığı SÜREYİ yazıyor, parasını PAKSAN
           saat ücretinden hesaplıyor (22 Eylül 2026, kullanıcının
           kararı: "Servis personeli talep için harcadığı süreyi girecek,
           bu süre sabit bir çarpan ile çarpılacak"). Önce servis
           tutarın kendisini yazıyordu; aynı işe her servisten başka
           rakam geliyordu, yoldaki sorunun aynısı. Süre işe göre
           değişiyor — yarım saatlik ayar ile gün süren şase işi — ama
           saatin fiyatı herkese aynı. PAKSAN süreyi onaylıyor ya da
           gerekçesiyle düzeltiyor (bkz. veri.js → hakkedisDuzelt).

   TARİFE BACKOFFICE'TEN DEĞİŞİYOR (23 Eylül 2026, kullanıcının isteği).
   Aşağıdaki TARIFE sabiti artık yalnız BAŞLANGIÇ tarifesi: personel
   hiçbir ücret yazmadıysa geçerli olan ve eski kayıtların hesaplandığı
   değer. Güncel ücret genel, makineye göre ve servise özel olarak
   Servisler ekranından yazılıyor (bkz. lib/servisTarifesi.js). Bu sabit
   ÇALIŞIRKEN DEĞİŞTİRİLMEZ; tohum betiği de (hakedis.Tarife, B02) onu
   okuyor.

   İKİ ÜCRET DE KAYDA YAZILIYOR (`kmUcreti`, `saatUcreti`). Tarife
   değişince geçmiş hak edişin tutarı değişmesin: kayıt gönderildiği
   günün ücretini taşıyor, hesap onu okuyor. Km ücreti 23 Eylül 2026'ya
   kadar yazılmıyordu — tarife sabitken gerek yoktu; o tarihten önceki
   kayıtta alan yok ve başlangıç ücretiyle (12) okunuyor, o gün de
   öyle hesaplanmıştı. Katalogdaki parça görseliyle aynı ilke
   (bkz. CLAUDE.md "Katalog değişince geçmiş işlem değişmez");
   veritabanında aynı işi tarifenin tarih aralığı görüyor.

   `iscilik` ALANI TUTAR OLARAK KALIYOR. Rapor, cari ve hak ediş ekranları
   o alanı okuyor; artık servis yazmıyor, süre × ücretten doluyor. Süre
   alanı olmayan eski kayıtta servisin yazdığı tutar olduğu gibi okunuyor.
   ========================================================================== */

export const TARIFE = {
  /* Gidiş-dönüş toplam kilometre üzerinden, kilometre başına. */
  yolKm: 12,
  /* İşçilik, saat başına. 50 kullanıcının verdiği örnek rakam
     ("saatlik servis ücreti 50 TL olsun"); PAKSAN'ın gerçek ücreti
     gelince yalnız bu satır değişir. */
  iscilikSaat: 50,
}

/* Süre yazımı: "2,5" ya da "2.5" → 2.5. Yarım saat yazılabiliyor; ondalık
   bir haneye yuvarlanıyor. Boş ya da anlamsızsa 0. */
export function saatOku(deger) {
  const n = Number(String(deger ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : 0
}

/* Süre kutusunun süzgeci (Servisim ve backoffice düzeltme formu):
   "2,5" biçimi. En çok üç hane, bir virgül, virgülden sonra bir hane;
   nokta yazan da virgüle çevriliyor. */
export function saatGirdisi(v) {
  const [tam = '', ...kalan] = String(v).replace(/\./g, ',').replace(/[^\d,]/g, '').split(',')
  const kesir = kalan.join('').slice(0, 1)
  return tam.slice(0, 3) + (kalan.length ? ',' + kesir : '')
}

/** 2.5 → "2,5" (ekranda ve PDF'te). */
export function saatYaz(saat) {
  return String(saatOku(saat)).replace('.', ',')
}

/**
 * Kayda yazılacak işçilik alanları: süre, o günün saat ücreti ve tutar.
 * Ücret verilmezse bugünkü tarife.
 */
export function iscilikAlanlari(saat, saatUcreti = TARIFE.iscilikSaat) {
  const s = saatOku(saat)
  return { iscilikSaat: s, saatUcreti, iscilik: Math.round(s * saatUcreti) }
}

/* Servis kaydının "İşçilik" satırı — Servisim'de ve backoffice'te aynı
   yazı: "5 saat · 250 TL". Süresi olmayan eski kayıtta yalnız tutar. */
export function iscilikYazisi(kayit) {
  const tutar = iscilikTutari(kayit)
  if (!tutar) return ''
  const tl = `${paraYaz(tutar)} ${PARA_BIRIMI}`
  return saatOku(kayit.iscilikSaat) ? `${saatYaz(kayit.iscilikSaat)} saat · ${tl}` : tl
}

/* PAKSAN'ın düzeltmesinin tek satırlık özeti (Servisim ve backoffice).
   Düzeltme süreyle yapıldıysa süreler, eski kayıtta tutarlar. */
export function duzeltmeYazisi(d) {
  const yol = `Yol ${d.onceki?.km || 0} km → ${d.yeni?.km || 0} km`
  if (d.onceki?.iscilikSaat != null || d.yeni?.iscilikSaat != null) {
    return `${yol} · İşçilik ${saatYaz(d.onceki?.iscilikSaat || 0)} saat → ${saatYaz(d.yeni?.iscilikSaat || 0)} saat`
  }
  return `${yol} · İşçilik ${paraYaz(d.onceki?.iscilik || 0)} → ${paraYaz(d.yeni?.iscilik || 0)} ${PARA_BIRIMI}`
}

/* Kaydın km ücreti: kaydın kendi ücreti, yoksa başlangıç tarifesi
   (23 Eylül 2026'dan önceki kayıt; bkz. yukarıdaki TARIFE notu). */
export function kmUcretiOku(kayit) {
  return ucretVeyaBaslangic(kayit?.kmUcreti, TARIFE.yolKm)
}

/* Kaydın saat ücreti. Sıfır da geçerli bir ücret (personel bir servise
   işçilik ödemiyor olabilir); yalnız alan hiç yoksa başlangıç tarifesi. */
export function saatUcretiOku(kayit) {
  return ucretVeyaBaslangic(kayit?.saatUcreti, TARIFE.iscilikSaat)
}

function ucretVeyaBaslangic(deger, baslangic) {
  if (deger === null || deger === undefined || deger === '') return baslangic
  const n = Number(deger)
  return Number.isFinite(n) && n >= 0 ? n : baslangic
}

/* Kaydın işçilik tutarı. Süre varsa süre × kaydın ücreti; süresi olmayan
   eski kayıtta servisin yazdığı tutar. */
function iscilikTutari(kayit) {
  if (kayit?.iscilikSaat != null) {
    return Math.round(saatOku(kayit.iscilikSaat) * saatUcretiOku(kayit))
  }
  return Math.max(0, Math.round(Number(kayit?.iscilik) || 0))
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
  const yol = Math.round(km * kmUcretiOku(kayit))
  const iscilik = iscilikTutari(kayit)
  const saat = saatOku(kayit.iscilikSaat)

  const kalemler = []
  if (km) kalemler.push({ ad: `Yol · ${km} km`, tutar: yol })
  if (iscilik) kalemler.push({ ad: saat ? `İşçilik · ${saatYaz(saat)} saat` : 'İşçilik', tutar: iscilik })

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
  /* Seri numarası olmadan açılmış talepte (ElleKayit → seriYok) servis
     numaranın olmadığını zaten söyledi; model ve tahmini yıl talepte.
     Aynı soruyu servis kaydında yeniden sormak, onun "yok" cevabını
     duymamak demekti (24 Eylül 2026, kullanıcının bildirdiği hata). */
  if (!talep?.makine?.serial && !talep?.makine?.seriYok) eksik.push('seri')
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
  if (!KAPI[kayit?.kapi]) return 'Hizmet kapsamını seçin.'

  const parcalar = temizParcalar(kayit.parcalar)

  if (kayit?.asama === ASAMA.parca) {
    if (!parcalar.length) return 'Gereken parçayı seçin.'
    return null
  }

  if (!kayit.yapilanIs) return 'Yapılan işi seçin.'

  if (kayit.kapi === 'garanti') {
    if (!parcalar.length && !Number(kayit.km) && !iscilikTutari(kayit)) {
      return 'Gidilen yolu ya da işçilik süresini yazın.'
    }
  }

  if (kayit.kapi === 'parcaIste' && !parcalar.length) {
    return 'İstenen parçayı seçin.'
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
      /* O günkü görselin dosya adı; alan hiç yoksa (22 Eylül 2026'dan
         önceki kayıt) eklenmiyor, `null` ise "o gün görseli yoktu"
         diye korunuyor (bkz. components/ParcaResmi.jsx). */
      ...('gorsel' in p ? { gorsel: p.gorsel ?? null } : {}),
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
   TALEBİN PARÇA SATIRLARI — TEK OKUYUCU

   Aynı okuma üç ekranda üç kez yazıldı (hak ediş yaprağı, sipariş
   listesi, talep ekranı) ve üçü birbirinden ayrı ayrı bozuldu. Kayıt
   biçimi bir daha değiştiğinde üç yerin birlikte güncellenmesini
   hatırlamak, hatırlanmayacak şeylerden biri. Okuma buraya alındı:
   kaydın biçimini bilen tek yer burası.

   HANGİ BİÇİMLER GELİYOR VE HANGİSİ NEDEN VAR

     1. `parcaFiyat.satirlar` — ASIL KAYIT. Talep ya da sipariş
        açıldığı anda katalogtan alınan görüntü: kod, ad, adet, birim
        fiyat ve tutar (bkz. lib/parcaKatalogu.js → fiyatGoruntusu).
        Fiyat listesi sonradan değişse de bu satırlar o günün rakamını
        taşıyor. Varsa başka hiçbir yere bakılmıyor.

     2. `parcalar` yapısal liste — servis kaydının kendi satırları
        (bkz. `temizParcalar`): kod, ad, adet nesnenin içinde.

     3. `parcalar` ad listesi + `parcaAdet` nesnesi — ESKİ OKUYUCULAR
        İÇİN yazılan katman (bkz. screens/RequestForm.jsx). İki ayrı
        anahtarlama var ve ikisi de bilerek: müşterinin talebinde adet
        ADA göre anahtarlı, servis siparişinde KODA göre
        (bkz. veri.js → servisParcaSiparisi) — çünkü katalogta aynı adı
        taşıyan parçalar var ve ad bir parçayı tanımlamıyor. Ad listesi
        kodu hiç taşımıyor, o yüzden koda göre anahtarlanmış bir kayıtta
        adet ADLA bulunamıyor; orada 1 varsayılıyor. Kod da uydurulmuyor:
        kodsuz satır kodsuz çiziliyor (bkz. components/ParcaTablosu.jsx).

     4. Parçası olmayan kayıt — boş dizi dönüyor.

   DÖNEN SATIR: `kod`, `ad`, `adet`, görüntüde varsa `tutar` ve
   `birimFiyat`, ve
   `goruntuden`. Son alan "adet kesin mi" sorusunun cevabı: görüntüden
   gelen satırda adet yazılı, eski kayıtta bulunamamış olabilir. Tutarı
   okuyan taraf (bkz. lib/ihracat.js) buna bakıp "× 1" yazıp yazmayacağına
   karar veriyor. */
function adetBul(talep, satir, kod, ad) {
  const dogrudan = Number(satir?.adet)
  if (dogrudan > 0) return dogrudan
  const harita = talep?.parcaAdet
  const kodla = kod ? Number(harita?.[kod]) : 0
  if (kodla > 0) return kodla
  const adla = ad ? Number(harita?.[ad]) : 0
  return adla > 0 ? adla : 1
}

export function talebinParcalari(talep) {
  const goruntu = talep?.parcaFiyat?.satirlar
  if (Array.isArray(goruntu) && goruntu.length) {
    return goruntu.map((s) => ({
      kod: s?.kod || '',
      ad: s?.ad || s?.kod || '',
      adet: Math.max(1, Number(s?.adet) || 1),
      ...(s?.tutar === null || s?.tutar === undefined ? {} : { tutar: s.tutar }),
      /* Birim fiyat tabloda adet birden çoksa tutarın altında
         (bkz. components/ParcaTablosu.jsx → tutarli). */
      ...(typeof s?.birimFiyat === 'number' ? { birimFiyat: s.birimFiyat } : {}),
      ...(s && 'gorsel' in s ? { gorsel: s.gorsel ?? null } : {}),
      goruntuden: true,
    }))
  }

  return (talep?.parcalar || []).map((p) => {
    if (typeof p === 'string') {
      return { kod: '', ad: p, adet: adetBul(talep, null, '', p), goruntuden: false }
    }
    const kod = p?.kod || ''
    const ad = p?.ad || kod
    return {
      kod, ad, adet: adetBul(talep, p, kod, p?.ad || ''),
      ...(p && 'gorsel' in p ? { gorsel: p.gorsel ?? null } : {}),
      goruntuden: false,
    }
  })
}

/**
 * Siparişin verilen satırlarındaki parça ADEDİ — satır (kalem) sayısı
 * değil. Kalem iptalinde "kaç parça çıkarıldı" sorusunun cevabı.
 *
 * Kullanıcı sınaması (24 Eylül 2026): adedi 2 olan tek satırlık zincir
 * iptal edilince Servisim "1 parçayı siparişten çıkardı" diyordu; metin
 * satır sayısını okuyordu. Satırlar `talebinParcalari`nın sırasıyla
 * (0'dan); aynı satır iki kez verilirse bir kez sayılıyor.
 *
 * @param {object} talep servis siparişi
 * @param {number[]} satirlar satır sıraları
 */
export function satirlarinAdedi(talep, satirlar = []) {
  const tum = talebinParcalari(talep)
  return [...new Set(satirlar || [])].reduce((t, i) => t + (tum[i]?.adet || 0), 0)
}

/**
 * Servis siparişinin kısa özeti: kaç kalem, kaç adet, ne kadar
 * (25 Eylül 2026, kullanıcı sınaması O1).
 *
 * Servisim'in sipariş başarı ekranı KDV hariç ara toplamı gösteriyordu;
 * sipariş listesi, onay penceresi ve Hak Ediş KDV dâhil tutarı. Servis
 * aynı siparişi iki ekranda iki rakamla görüyordu ("SİPARİŞİN TUTARI
 * HER EKRANDA KDV DÂHİL"). Adet de başka yerden sayılıyordu: başarı
 * ekranı `parcaAdet` nesnesinden, liste satırlardan.
 *
 * Rakamlar listedeki kartla AYNI kaynaktan: kalem ve adet
 * `talebinParcalari`'nın satırlarından, tutar servisin ödeyeceği KDV
 * dâhil rakam (lib/servisFiyat.js → siparisNetTutari; iptal edilen kalem
 * yoksa siparisToplami ile aynı).
 *
 * NEDEN BU DOSYADA: satırları okuyan tek yer burası (yukarıdaki "TEK
 * OKUYUCU") ve bu dosya servisFiyat.js'i zaten içe aktarıyor. İşlev
 * servisFiyat.js'e konsaydı ya satır okuyucusu ikinci kez yazılacak ya
 * da iki dosya birbirini içe aktaracaktı.
 *
 * @param {object} siparis servis siparişi (talep kaydı)
 * @returns {{kalem: number, adet: number, toplam: number}}
 */
export function siparisOzeti(siparis) {
  const parcalar = talebinParcalari(siparis)
  return {
    kalem: parcalar.length,
    adet: parcalar.reduce((t, p) => t + p.adet, 0),
    toplam: siparisNetTutari(siparis),
  }
}

/**
 * Servis siparişinin hangi satırları gönderildi, hangileri bekliyor
 * (24 Eylül 2026, kısmi gönderim). Satırlar siparişin fiyat
 * görüntüsündeki sırayla (0'dan); `talebinParcalari` aynı sırayı
 * veriyor. Gönderimler talepte `gonderimler` listesinde duruyor
 * (bkz. backoffice/veri.js → talepKapat, kalanParcalariGonder).
 * Gönderim kaydı olmayan kapanmış sipariş bu özellikten önce kapandı:
 * hepsi gönderilmiş sayılıyor.
 *
 * İPTAL EDİLEN KALEMLER (24 Eylül 2026, kalanParcalariIptalEt): PAKSAN
 * gönderemeyeceği bekleyen parçayı siparişten çıkarabiliyor. O satır
 * artık "kalan" değil; `iptal` listesinde duruyor ve tutarı siparişin
 * tutarından düşüyor (lib/servisFiyat.js → siparisNetTutari). İptaller
 * talepte `kalemIptalleri: [{no, tarih, personel, neden, aciklama,
 * satirlar}]`. Gönderilmiş satır iptal edilemiyor.
 *
 * @returns {null|{gonderilen: number[], kalan: number[], iptal: number[]}}
 *   servis siparişi değilse ya da görüntüsü yoksa null
 */
export function siparisGonderimi(talep) {
  const satirlar = talep?.parcaFiyat?.satirlar
  if (!talep?.servisSiparisi || !Array.isArray(satirlar) || !satirlar.length) return null
  const tum = satirlar.map((_, i) => i)
  const gitmis = Array.isArray(talep.gonderimler)
    ? new Set(talep.gonderimler.flatMap((g) => g?.satirlar || []))
    : new Set(talep.status === 'kapandi' ? tum : [])
  const iptal = new Set(iptalEdilenSatirlar(talep))
  return {
    gonderilen: tum.filter((i) => gitmis.has(i)),
    kalan: tum.filter((i) => !gitmis.has(i) && !iptal.has(i)),
    iptal: tum.filter((i) => !gitmis.has(i) && iptal.has(i)),
  }
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
