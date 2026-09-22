import { tarihYaz } from '../../ortak'
import {
  fark, farkPuan, kovayaDagit, oran, ortalama, paraHucre, paraKutu, RENK, SAAT, servisZiyaretleri, sureYaz,
  talepModeli, topla, yuzde, zamanKovalari,
} from '../hesap'

/* ==========================================================================
   Garanti ve Hak Ediş — "Garanti işleri bize neye mal oluyor?"

   Garanti kapsamındaki işin parasını müşteri değil PAKSAN ödüyor:
   servisin yolu ve işçiliği hak ediş olarak servisin cari hesabına
   yazılıyor, parçayı PAKSAN gönderiyor. Bu sekme o gideri üç soruyla
   açıyor: ne kadar tuttu, nereden çıkıyor (model, servis, yapılan iş),
   onay masası nasıl işliyor (bekleyen, kabul edilmeyen, düzeltilen).

   KAYNAK BİR GARANTİ İŞİ, TALEP DEĞİL. Aynı talebe ikinci kez
   gidildiğinde ilk ziyaretin hak edişi `oncekiKayitlar` arşivine
   taşınıyor (bkz. hesap.js → servisZiyaretleri). Yalnız talebin güncel
   kaydına bakılsaydı ilk ziyaretin parası ve parçası gidere hiç
   girmezdi. Hak ediş yalnız garanti kapısında ve işin bittiği ikinci
   aşamada doğuyor; parça isteği aşamasında sayılacak bir tutar yok.

   HER OLAY KENDİ TARİHİYLE. İş (hak edişin doğuşu) `olusma`, onay
   `onay.tarih`, kabul etmeme `red.tarih` ile döneme giriyor. Ay sonunda
   biten iş o ay "garanti işi", ertesi ay onaylanırsa ertesi ayın
   "onaylanan hak edişi" — ikisi de doğru, ikisi de ayrı soru.

   KABUL EDİLMEYEN HAK EDİŞ GİDER DEĞİL. Model tablosu ve tutar
   grafiği onaylanan ile bekleyeni topluyor; kabul edilmeyen iş PAKSAN'a
   para olarak mal olmadı. Hak edişler tablosunda ve servis tablosunda
   görünüyor, çünkü tekrar eden red servisle ilgili bir bilgi.

   PARÇANIN DEĞERİ MALİYET DEĞİL. Servis kaydındaki parça satırı,
   parçanın seçildiği andaki liste fiyatını taşıyor. PAKSAN'ın parçaya
   gerçekte ne ödediği sistemde yok; bu yüzden hak edişe eklenmiyor ve
   ayrı "liste değeri" olarak gösteriliyor. Fiyatı yazılmamış kalem
   toplama girmiyor, ayrıca sayılıyor.
   ========================================================================== */

const M = {
  ad: 'Garanti ve Hak Ediş',
  soru: 'Garanti işleri bize neye mal oluyor?',

  is: 'Garanti işi',
  isAlt: 'Servisin bu dönemde bitirip onaya gönderdiği garanti işleri; kabul edilmeyenler dahil',
  onaylanan: 'Onaylanan hak ediş tutarı',
  onaylananAlt: (yol, iscilik) => `Bu dönemde onaylanan: yol tutarı ${yol} · işçilik tutarı ${iscilik}`,
  isBasina: 'İş başına onaylanan hak ediş',
  isBasinaAlt: 'Bu dönemde onaylanan hak edişlerin ortalaması',
  bekleyen: 'Onay bekleyen',
  bekleyenAlt: (tutar) => `Şu an onay bekleyen hak ediş toplamı: ${tutar} · seçilen dönemden bağımsız`,
  onaySuresi: 'Onay süresi',
  onaySuresiAlt: 'İşin bitişinden onaya geçen ortalama süre',
  /* Ölçünün adı servis tablosundaki sütunla aynı; ikisi de ADET.
     "Kabul edilmeyen hak ediş" deniyordu: para adı taşıdığı ve hemen
     yanında "Onaylanan hak ediş tutarı" durduğu için 2 sayısı ₺ gibi
     okunabiliyordu. Reddedilen tutar da hiçbir yerde toplanmıyordu,
     oysa "bu dönemde ne kadar hak ediş reddettik" ilk sorulan
     sorulardan biri ve veri elde hazır. */
  red: 'Kabul edilmeyen iş',
  redAlt: (tutar) => `Bu dönemde kabul edilmeyen işler · hak ediş toplamı: ${tutar}`,
  duzeltme: 'Düzeltilen kayıt oranı',
  duzeltmeAlt: (n, m) => `Bu dönemde biten ${m} işin ${n} tanesinde kayıt düzeltildi`,
  parca: 'Garantide değişen parça',
  parcaAlt: (deger, fiyatsiz) =>
    `Kabul edilmeyen işler dahil · liste değeri ${deger}` + (fiyatsiz ? ` · ${fiyatsiz} kalemin fiyatı yazılı değil` : ''),

  /* Grafik ve model tablosu İŞ TARİHİNE göre onaylanan + bekleyeni
     topluyor; "Onaylanan hak ediş tutarı" kutusu ONAY TARİHİNE göre
     yalnız onaylananı. İkisi aynı dönemde farklı sayı verir; adları
     bu yüzden ayrı ("Biten işlerin hak edişi"). */
  grafikTutar: 'Biten işlerin hak edişi',
  grafikTutarAlt:
    'İşin bittiği güne göre; onaylanan ve onay bekleyen hak edişler. Bir sütuna tıklayınca o günlerde açılan servis talepleri açılır.',
  grafikToplam: (tutar) => `Toplam ${tutar}`,
  yol: 'Yol',
  iscilik: 'İşçilik',
  grafikIs: 'Garanti işinde yapılan iş',
  grafikIsAlt: 'Bu dönemde biten garanti işleri, servisin seçtiği iş türüne göre.',
  belirtilmemis: 'Belirtilmemiş',

  tabloModel: 'Modellere göre biten işlerin hak edişi',
  /* PARÇA SÜTUNU DA KABUL EDİLMEYENLERİ DIŞARIDA BIRAKIYOR. Açıklama
     bunu yalnız iş sayısı ve tutar için söylüyordu; "Garantide değişen
     parça" kutusu dönemde biten BÜTÜN işlerin parçasını sayarken tablo
     reddedilenleri saymıyor ve yönetici aynı sekmedeki iki sayı (16 ile
     13) arasındaki farkı ekranda açıklayacak bir cümle bulamıyordu. */
  tabloModelAciklama:
    'İşin bitiş tarihine göre bu dönemdeki onaylanan ve onay bekleyen garanti işleri gösterilir. Kabul edilmeyen işler; iş sayısına, tutara ve parça adedine dahil değildir. Bu nedenle iş sayısı "Garanti işi", parça adedi "Garantide değişen parça" kutusundan farklı olabilir. Tutar da onay tarihini esas alan "Onaylanan hak ediş tutarı" kutusundan farklı olabilir. Bir satıra tıklayınca o modelin servis talepleri açılır.',
  modelSutun: {
    model: 'Model',
    is: 'Garanti işi (kabul edilmeyen hariç)',
    yol: 'Yol tutarı',
    iscilik: 'İşçilik tutarı',
    toplam: 'Hak ediş (onaylı ve bekleyen)',
    isBasina: 'İş başına hak ediş (onaylı ve bekleyen)',
    parca: 'Değişen parça (adet, kabul edilmeyen hariç)',
  },
  modelYok: 'Model yazılı değil',

  tabloHakkedis: 'Hak edişler',
  tabloHakkedisAciklama:
    'Bu dönemde biten bütün garanti işleri, en yenisi üstte. Onay bekleyenler turuncu, kabul edilmeyenler kırmızı şeritle. Bir satıra tıklayınca talep açılır.',
  /* "Yol" ve "İşçilik" sütun adları para olduğunu söylemiyordu ve
     hücrelerde birim de yok (bkz. hesap.js → paraHucre). Yol kilometre
     olarak giriliyor, tutar tarifeden hesaplanıyor ve Talepler
     ekranında satır "Yol · 50 km" diye geçiyor; "Yol 1.176" gören
     yönetici bunu kilometre okuyabiliyordu. Adlar aynı sekmenin servis
     tablosundaki "Onaylanan tutar" düzenine getirildi. */
  hakkedisSutun: {
    no: 'Talep no',
    servis: 'Servis',
    model: 'Model',
    tarih: 'İş tarihi',
    yol: 'Yol tutarı',
    iscilik: 'İşçilik tutarı',
    toplam: 'Toplam',
    durum: 'Durum',
    duzeltme: 'Düzeltme',
  },
  /* Talepler ekranındaki hak ediş rozetleriyle aynı. */
  durum: {
    bekliyor: 'Onay bekliyor',
    onaylandi: 'Onaylandı',
    reddedildi: 'Kabul edilmedi',
  },

  tabloServis: 'Servislere göre hak ediş',
  tabloServisAciklama:
    'Garanti işi ve düzeltilen kayıt oranı için işin bitiş tarihi, onaylanan tutar için onay tarihi, kabul edilmeyen iş için ret tarihi esas alınır. Bekleyen tutar, seçilen dönemden bağımsız olarak şu an onay bekleyen hak edişlerin toplamıdır. Bir satıra tıklayınca servisin talepleri açılır.',
  servisSutun: {
    servis: 'Servis',
    is: 'Garanti işi',
    onaylanan: 'Onaylanan tutar',
    bekleyen: 'Bekleyen tutar',
    red: 'Kabul edilmeyen iş',
    duzeltme: 'Düzeltilen kayıt oranı',
  },
  toplam: 'Toplam',

  notlar: [
    'Garanti işi: servisin garanti kapsamında bitirip onaya gönderdiği işler; iş tarihi, servisin işi bitirdiğini kaydettiği andır. Aynı talebe ikinci kez gidildiyse iki iş sayılır. Parça isteği aşaması iş sayılmaz.',
    'Onaylanan hak ediş tutarı: onay tarihi seçilen döneme düşen hak edişlerin toplamı (yol ve işçilik). Genel Bakış sekmesindeki garanti gideriyle ve Servis Ağı karnesindeki onaylanan hak ediş tutarıyla aynı sayıdır.',
    'İş başına onaylanan hak ediş: seçilen dönemde onaylanan hak edişlerin ortalaması.',
    'Biten işlerin hak edişi (grafik ve model tablosu): iş tarihi seçilen döneme düşen, onaylanan ve onay bekleyen hak edişlerin toplamı; kabul edilmeyenler dahil değil. Onay tarihine bakan "Onaylanan hak ediş tutarı"ndan bu yüzden farklıdır.',
    'Onay bekleyen: talebi onay kuyruğunda olan ve talebin güncel servis kaydına ait hak edişler sayılır. Önceki kayıtlara ait hak edişler sayılmaz. Seçilen dönem dikkate alınmaz. Genel Bakış sekmesindeki "hak ediş onayı bekliyor" uyarısıyla aynı sayıdır.',
    'Onay süresi: seçilen dönemde onaylanan işlerde, işin bitişinden onaya geçen ortalama süre.',
    'Kabul edilmeyen iş: kabul etmeme tarihi seçilen döneme düşen işler; kutunun altındaki tutar bu işlerin hak ediş toplamıdır. Bu işler gidere, model tablosuna ve tutar grafiğine girmez.',
    'Düzeltilen kayıt oranı: seçilen dönemde biten garanti işlerinden, personelimizin kilometre, işçilik ya da parçasını değiştirdiği kayıtların oranı.',
    'Garantide değişen parça: seçilen dönemde biten garanti işlerinde yazılan parça adetlerinin toplamı; kabul edilmeyen işlerin parçası da sayılır, çünkü parça takıldı. Model tablosundaki parça sütunu kabul edilmeyenleri saymaz, bu yüzden iki sayı farklı olabilir. Liste değeri, kayıttaki birim fiyat çarpı adettir; parçanın bize gerçek maliyeti değildir ve hak edişe dahil değildir. Fiyatı yazılmamış kalem liste değeri toplamına girmez; parça adedinde sayılır.',
    'Servis tablosundaki satırlar servis adına göre birleştirilir: satırın adı ile anahtarı tek kaynaktan gelir, aynı servis iki satıra bölünmez. Arşivlenmiş bir ziyarette işi yapan servis, kaydın kendi adından okunur.',
    'Yüzde farklar bir önceki eşit uzunluktaki dönemle karşılaştırılır. "Tüm zamanlar" seçiliyse karşılaştırma yapılmaz.',
  ],
}

function sayi(x) {
  const n = Number(x)
  return x !== null && x !== undefined && x !== '' && Number.isFinite(n) ? n : null
}

/* Parça satırlarının adedi ve liste değeri. Adedi yazılmamış satır
   adede girmiyor; fiyatı yazılmamış satır değere girmiyor, sayılıyor. */
function parcaOzeti(isler) {
  const satirlar = isler.flatMap((z) => z.parcalar)
  const fiyatli = satirlar.filter((p) => sayi(p?.fiyat) !== null && sayi(p?.adet) !== null)
  return {
    adet: topla(satirlar.map((p) => sayi(p?.adet))),
    deger: fiyatli.length ? topla(fiyatli.map((p) => sayi(p.fiyat) * sayi(p.adet))) : null,
    fiyatsiz: satirlar.filter((p) => sayi(p?.fiyat) === null).length,
  }
}

/* İşi yapan servisin adı. KAYDIN KENDİ ADI ÖNDE: arşivdeki (önceki)
   ziyaretin servisi talebin GÜNCEL servisinden okunuyordu; parayı
   kazanan, o gün işi yapan servistir. Talepler ekranındaki "Önceki
   ziyaretler" listesi de kaydın kendi adını gösteriyor, ikisi
   ayrışmasın. */
function servisAdi(z) {
  return z.servisAd || z.talep.servis?.ad || null
}

/* Satırın anahtarı ile ekrana yazılan ad tek kaynaktan.

   Anahtar `talep.servis.id`, ad ise kaydın adıydı; bir servisin
   işlerinden biri `talep.servis` olmadan gelirse aynı servis tabloda
   AYNI ADLA iki satır oluyor ve tutarları ikiye bölünüyordu. Tablo
   zaten yalnız adı gösterdiği için anahtar da addan üretiliyor. */
function servisAnahtari(z) {
  return `ad:${servisAdi(z) || ''}`
}

export const garantiBolumu = {
  id: 'garanti',
  ad: M.ad,
  soru: M.soru,

  uret({ veri, aralik, donemde, oncekide, karsilastir, git }) {
    const f = (a, b) => (karsilastir ? fark(a, b) : null)

    const isler = veri.talepler
      .flatMap(servisZiyaretleri)
      .filter((z) => z.kapi === 'garanti' && z.hakkedis)

    const durumu = (z) => z.hakkedis.durum
    const olusan = (icinde) => isler.filter((z) => icinde(z.hakkedis.olusma))
    const onaylanan = (icinde) => isler.filter((z) => durumu(z) === 'onaylandi' && icinde(z.hakkedis.onay?.tarih))
    const reddedilen = (icinde) => isler.filter((z) => durumu(z) === 'reddedildi' && icinde(z.hakkedis.red?.tarih))
    /* ONAY BEKLEYEN = GERÇEKTEN ONAYLANABİLİR OLAN. Yalnız hak edişin
       `durum` alanına bakılıyordu; oysa onay yalnız talep onay
       kuyruğundayken ve yalnız talebin ÜSTÜNDEKİ kayıt için işliyor
       (bkz. veri.js → hakkedisOnayla). Arşive düşmüş ya da talebi başka
       duruma geçmiş bir "bekliyor" hak edişi kimse onaylayamaz; rapor
       onu sayınca PAKSAN'ın asla ödemeyeceği parayı "onay bekliyor"
       diye gösteriyor ve Genel Bakış'taki aynı konulu uyarıdan farklı
       bir sayı veriyordu. */
    const bekleyen = isler.filter((z) => durumu(z) === 'bekliyor' && z.guncel && z.talep.status === 'onayBekliyor')
    const gider = (liste) => liste.filter((z) => durumu(z) !== 'reddedildi')

    const tutar = (liste, alan = 'toplam') => topla(liste.map((z) => sayi(z.hakkedis[alan])))
    const onaySuresi = (liste) =>
      liste
        .map((z) => {
          const a = sayi(z.hakkedis.olusma)
          const b = sayi(z.hakkedis.onay?.tarih)
          return a !== null && b !== null && b >= a ? (b - a) / SAAT : null
        })
    const duzeltilen = (liste) => liste.filter((z) => (z.duzeltmeler || []).length > 0)

    const olusanDonem = olusan(donemde)
    const olusanOnceki = olusan(oncekide)
    const onayDonem = onaylanan(donemde)
    const onayOnceki = onaylanan(oncekide)
    const parcaDonem = parcaOzeti(olusanDonem)
    const parcaOnceki = parcaOzeti(olusanOnceki)

    /* ------------------------------------------------------- Ölçüler */

    const olculer = [
      {
        ad: M.is,
        deger: olusanDonem.length,
        fark: f(olusanDonem.length, olusanOnceki.length),
        iyi: null,
        alt: M.isAlt,
      },
      {
        /* Dashboard'un yönetim özeti bu ölçüyü kimliğiyle buluyor (bkz. Ozet.jsx). */
        id: 'onaylanan',
        ad: M.onaylanan,
        deger: paraKutu(tutar(onayDonem)),
        fark: f(tutar(onayDonem), tutar(onayOnceki)),
        iyi: null,
        alt: M.onaylananAlt(paraKutu(tutar(onayDonem, 'yol')), paraKutu(tutar(onayDonem, 'iscilik'))),
      },
      {
        ad: M.isBasina,
        deger: paraKutu(ortalama(onayDonem.map((z) => sayi(z.hakkedis.toplam)))),
        fark: f(
          ortalama(onayDonem.map((z) => sayi(z.hakkedis.toplam))),
          ortalama(onayOnceki.map((z) => sayi(z.hakkedis.toplam))),
        ),
        iyi: 'azalis',
        alt: M.isBasinaAlt,
      },
      {
        ad: M.bekleyen,
        deger: bekleyen.length,
        iyi: null,
        alt: M.bekleyenAlt(paraKutu(tutar(bekleyen))),
      },
      {
        ad: M.onaySuresi,
        deger: sureYaz(ortalama(onaySuresi(onayDonem))),
        fark: f(ortalama(onaySuresi(onayDonem)), ortalama(onaySuresi(onayOnceki))),
        iyi: 'azalis',
        alt: M.onaySuresiAlt,
      },
      {
        ad: M.red,
        deger: reddedilen(donemde).length,
        fark: f(reddedilen(donemde).length, reddedilen(oncekide).length),
        iyi: 'azalis',
        alt: M.redAlt(paraKutu(tutar(reddedilen(donemde)))),
      },
      {
        ad: M.duzeltme,
        deger: yuzde(duzeltilen(olusanDonem).length, olusanDonem.length),
        fark: karsilastir
          ? farkPuan(
              oran(duzeltilen(olusanDonem).length, olusanDonem.length),
              oran(duzeltilen(olusanOnceki).length, olusanOnceki.length),
            )
          : null,
        farkBirim: 'puan',
        iyi: 'azalis',
        alt: M.duzeltmeAlt(duzeltilen(olusanDonem).length, olusanDonem.length),
      },
      {
        /* Dashboard'un yönetim özeti bu ölçüyü kimliğiyle buluyor (bkz. Ozet.jsx). */
        id: 'parca',
        ad: M.parca,
        deger: parcaDonem.adet,
        fark: f(parcaDonem.adet, parcaOnceki.adet),
        iyi: null,
        alt: M.parcaAlt(paraKutu(parcaDonem.deger), parcaDonem.fiyatsiz),
      },
    ]

    /* ------------------------------------------------------ Grafikler */

    const giderDonem = gider(olusanDonem)
    const kovalar = zamanKovalari(aralik, isler.map((z) => z.hakkedis.olusma))
    /* Her iş iki seriye birden düşüyor (yol ve işçilik); kovaya iki
       ayrı kalem olarak veriliyor. */
    const kalemler = giderDonem.flatMap((z) => [
      { zaman: z.hakkedis.olusma, seri: 'yol', deger: sayi(z.hakkedis.yol) },
      { zaman: z.hakkedis.olusma, seri: 'iscilik', deger: sayi(z.hakkedis.iscilik) },
    ])

    const isSayim = new Map()
    for (const z of olusanDonem) {
      const ad = z.yapilanIs || M.belirtilmemis
      isSayim.set(ad, (isSayim.get(ad) || 0) + 1)
    }

    const grafikler = [
      {
        tur: 'sutun',
        genis: true,
        baslik: M.grafikTutar,
        alt: M.grafikTutarAlt,
        sag: M.grafikToplam(paraKutu(tutar(giderDonem))),
        seriler: [
          { anahtar: 'yol', ad: M.yol, renk: RENK.bir },
          { anahtar: 'iscilik', ad: M.iscilik, renk: RENK.iki },
        ],
        kovalar: kovayaDagit(kovalar, kalemler, (k) => k.zaman, (k) => k.seri, (k) => k.deger),
        yaz: paraHucre,
        onSec: git ? (k) => git('talepler', { durum: 'hepsi', tur: 'servis', aralik: k.aralik }) : undefined,
      },
      {
        tur: 'yatay',
        baslik: M.grafikIs,
        alt: M.grafikIsAlt,
        renk: RENK.bir,
        satirlar: [...isSayim.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'))
          .map(([ad, n]) => ({ ad, deger: n })),
      },
    ]

    /* ------------------------------------------------------- Tablolar */

    /* Modeller: gider (onaylanan + bekleyen), iş tarihi dönemde. */
    const modeller = new Map()
    for (const z of giderDonem) {
      const ad = talepModeli(z.talep) || ''
      if (!modeller.has(ad)) modeller.set(ad, [])
      modeller.get(ad).push(z)
    }
    const modelHucreleri = (liste) => {
      const toplam = tutar(liste)
      return [
        String(liste.length),
        paraHucre(tutar(liste, 'yol')),
        paraHucre(tutar(liste, 'iscilik')),
        paraHucre(toplam),
        paraHucre(liste.length ? toplam / liste.length : null),
        String(parcaOzeti(liste).adet),
      ]
    }

    /* Hak edişler: iş tarihi dönemde, en yenisi üstte. */
    const hakkedisSatirlari = [...olusanDonem]
      .sort((a, b) => (sayi(b.hakkedis.olusma) || 0) - (sayi(a.hakkedis.olusma) || 0))
      .map((z) => ({
        hucreler: [
          z.talep.no || '—',
          servisAdi(z) || '—',
          talepModeli(z.talep) || '—',
          tarihYaz(z.hakkedis.olusma, false),
          paraHucre(sayi(z.hakkedis.yol)),
          paraHucre(sayi(z.hakkedis.iscilik)),
          paraHucre(sayi(z.hakkedis.toplam)),
          M.durum[durumu(z)] || '—',
          String((z.duzeltmeler || []).length),
        ],
        git: git && z.talep.id ? () => git('talepler', { durum: 'hepsi', talep: z.talep.id }) : undefined,
        vurgu: durumu(z) === 'bekliyor' ? 'turuncu' : durumu(z) === 'reddedildi' ? 'kirmizi' : undefined,
      }))

    /* Servisler: her sütun kendi olayının tarihiyle (bkz. dosya başı). */
    const servisler = new Map()
    const servisEkle = (z, alan) => {
      const anahtar = servisAnahtari(z)
      if (!servisler.has(anahtar)) {
        servisler.set(anahtar, { ad: servisAdi(z), is: [], onay: [], bekleyen: [], red: [] })
      }
      servisler.get(anahtar)[alan].push(z)
    }
    olusanDonem.forEach((z) => servisEkle(z, 'is'))
    onayDonem.forEach((z) => servisEkle(z, 'onay'))
    bekleyen.forEach((z) => servisEkle(z, 'bekleyen'))
    reddedilen(donemde).forEach((z) => servisEkle(z, 'red'))

    const servisHucreleri = (s) => [
      String(s.is.length),
      paraHucre(tutar(s.onay)),
      paraHucre(tutar(s.bekleyen)),
      String(s.red.length),
      yuzde(duzeltilen(s.is).length, s.is.length),
    ]
    const tumServisler = [...servisler.values()]
    const hepsi = (alan) => tumServisler.flatMap((s) => s[alan])

    const tablolar = [
      {
        baslik: M.tabloModel,
        aciklama: M.tabloModelAciklama,
        basliklar: [
          M.modelSutun.model, M.modelSutun.is, M.modelSutun.yol, M.modelSutun.iscilik,
          M.modelSutun.toplam, M.modelSutun.isBasina, M.modelSutun.parca,
        ],
        sag: [1, 2, 3, 4, 5, 6],
        satirlar: [...modeller.entries()]
          .sort((a, b) => tutar(b[1]) - tutar(a[1]) || b[1].length - a[1].length)
          .map(([ad, liste]) => ({
            hucreler: [ad || M.modelYok, ...modelHucreleri(liste)],
            git: git
              ? () => git('talepler', { durum: 'hepsi', tur: 'servis', aralik, ...(ad ? { makine: ad } : {}) })
              : undefined,
          })),
        toplamSatiri: [M.toplam, ...modelHucreleri(giderDonem)],
      },
      {
        baslik: M.tabloHakkedis,
        aciklama: M.tabloHakkedisAciklama,
        basliklar: [
          M.hakkedisSutun.no, M.hakkedisSutun.servis, M.hakkedisSutun.model, M.hakkedisSutun.tarih,
          M.hakkedisSutun.yol, M.hakkedisSutun.iscilik, M.hakkedisSutun.toplam, M.hakkedisSutun.durum,
          M.hakkedisSutun.duzeltme,
        ],
        sag: [4, 5, 6, 8],
        satirlar: hakkedisSatirlari,
      },
      {
        baslik: M.tabloServis,
        aciklama: M.tabloServisAciklama,
        basliklar: [
          M.servisSutun.servis, M.servisSutun.is, M.servisSutun.onaylanan, M.servisSutun.bekleyen,
          M.servisSutun.red, M.servisSutun.duzeltme,
        ],
        sag: [1, 2, 3, 4, 5],
        satirlar: tumServisler
          .sort(
            (a, b) =>
              tutar(b.onay) - tutar(a.onay) ||
              b.is.length - a.is.length ||
              String(a.ad || '').localeCompare(String(b.ad || ''), 'tr'),
          )
          .map((s) => ({
            hucreler: [s.ad || '—', ...servisHucreleri(s)],
            git: git && s.ad ? () => git('talepler', { durum: 'hepsi', tur: 'servis', ara: s.ad, aralik }) : undefined,
          })),
        toplamSatiri: [
          M.toplam,
          ...servisHucreleri({ is: hepsi('is'), onay: hepsi('onay'), bekleyen: hepsi('bekleyen'), red: hepsi('red') }),
        ],
      },
    ]

    return { olculer, grafikler, tablolar, notlar: M.notlar }
  },
}
