import { gonderimGecikti, KAPALI_DURUMLAR } from '../../../veri'
import { talebinParcalari } from '../../../../lib/servisKaydi'
import { markaEk } from '../../../../marka'
import { tarihYaz } from '../../ortak'
import {
  dilim, fark, farkPuan, kapanisZamani, kovayaDagit, musteriTalebiMi, oran, ortalama, paraHucre,
  paraKutu, parcaGoruntusu, RENK, SAAT, servisZiyaretleri, sureYaz, talepModeli, topla, yuzde,
  zamanKovalari,
} from '../hesap'

/* ==========================================================================
   Yedek Parça — "Hangi parçalar isteniyor, siparişler ne hızla gönderiliyor?"

   Stok planlamasının ve yedek parça masasının temposunun ekranı.

   ÜÇ AYRI PARÇA AKIŞI VAR VE AYRI SAYILIYOR
     1  müşterinin parça talebi   müşteri uygulamadan ister, bedeli
                                  dekontla önden öder, parçayı PAKSAN
                                  gönderir
     2  servisin parça siparişi   servis kendi stoğu için ister; bedeli
                                  faturayla ya da bakiyesinden düşülerek
                                  öder (aynı depoda `servisSiparisi`
                                  işaretiyle duruyor)
     3  garanti parçası           servis garanti işinde parçayı ister,
                                  PAKSAN bedelsiz gönderir (servis
                                  ziyaretinin `parcalar` ve `parcaSevk`
                                  alanları)
   Üçünü tek sayıda toplamak "parça talebi arttı" haberini okunmaz
   yapar: servisin stok siparişi ile müşterinin arızası başka şeyler
   anlatıyor. Stok için ise üçü birlikte önemli; "En çok istenen
   parçalar" tablosu adetleri yan yana veriyor.

   PARÇA KODUYLA SAYILIYOR. Katalogda aynı adı taşıyan birden çok parça
   var; adla toplamak iki ayrı parçayı tek satıra düşürür ve depoya
   hangisinin alınacağı belirsiz kalır. Kodu olmayan eski kayıt adıyla
   sayılıyor.

   PARA KAYDIN İÇİNDEKİ FİYATTAN. Talep açılırken fiyat görüntüsü kayda
   yazılıyor (bkz. hesap.js → parcaGoruntusu); bugünkü fiyat listesine
   bakılmıyor. Fiyat dökümü olmayan eski talep toplama girmiyor, kaç
   tane olduğu ayrıca yazılıyor. İptal edilen talep ve sipariş tutara
   girmiyor: satış olmadı.

   GARANTİ PARÇASININ İSTENDİĞİ AN. Servis kaydının `tarih` alanı
   ikinci aşamada ("Parçayı Taktım") üzerine yazılıyor; parçanın
   istendiği an talebin geçmişindeki `parcaBekliyor` satırında. Parça
   gönderildiğinde de aynı durumla bir satır düşüyor (bkz. veri.js →
   servisParcasiGonderildi), bu yüzden o ziyaretin penceresindeki (bir
   önceki ziyaretten sonra, sevkten önce) İLK satır alınıyor.
   ========================================================================== */

const M = {
  ad: 'Yedek Parça',
  soru: 'Hangi parçalar isteniyor, siparişler ne hızla gönderiliyor?',

  musteriTalebi: 'Müşteri parça talebi',
  musteriTalebiAlt: 'Seçilen dönemde müşterilerin açtığı yedek parça talepleri',
  siparis: 'Servis siparişi',
  siparisAlt: 'Seçilen dönemde servislerin verdiği parça siparişleri',
  satis: 'Onaylanan parça satışı',
  satisAlt: (n, fiyatsiz) =>
    fiyatsiz
      ? `${n} talep · ${fiyatsiz} talebin fiyat dökümü yok, toplama girmedi`
      : `Ödemesi bu dönemde onaylanan ${n} talep · KDV dâhil`,
  siparisTutari: 'Servis siparişi tutarı',
  siparisTutariAlt: (n, bilinmeyen) =>
    bilinmeyen
      ? `İptal edilmeyen ${n} sipariş · ${bilinmeyen} siparişin tutarı kayıtlı değil, toplama girmedi`
      : `İptal edilmeyen ${n} sipariş · KDV dâhil`,
  odemeBekleyen: 'Ödeme onayı bekleyen',
  odemeBekleyenAlt: 'Şu an · dekont geldi, ödeme henüz onaylanmadı',
  odemedenGonderim: 'Ödemeden gönderime',
  odemedenGonderimAlt: (n, p90) => `${n} talep ortalaması · en yavaş %10: ${p90}`,
  garantiSevk: 'Garanti parçasının gönderilme süresi',
  garantiSevkAlt: (n, p90) => `Servis istedikten sonra · ${n} gönderim · en yavaş %10: ${p90}`,
  soz: 'Söz verilen zamana kadar gönderim',
  sozAlt: (tutulan, n) =>
    n ? `Bu dönemde gönderilen, tarih ve saat sözü verilmiş ${n} talebin ${tutulan} tanesi` : 'Bu dönemde gönderilen, tarih ve saat sözü verilmiş talep yok',

  grafik: 'Yedek parça talepleri',
  /* Kova boyu döneme göre gün, hafta ya da ay olabiliyor
     (bkz. hesap.js → zamanKovalari); alt yazı "o günün talepleri"
     diyordu. */
  grafikAlt: 'Seçilen dönemde açılan müşteri parça talepleri ve servis siparişleri. Sütunlar döneme göre gün, hafta veya ayı gösterir. Bir sütuna tıklayınca ilgili aralığın talepleri açılır.',
  seriMusteri: 'Müşteri talebi',
  seriSiparis: 'Servis siparişi',

  tabloParca: 'En çok istenen parçalar',
  tabloParcaAciklama: `Seçilen dönemde istenen parçalar, adet olarak. Garanti işinde, servisin istediği ve ${markaEk('in')} bedelsiz gönderdiği parçalar.`,
  tabloServis: 'Servislere göre parça siparişi',
  tabloServisAciklama: 'Sipariş sayısı ve tutarlar, seçilen dönemde verilen ve iptal edilmemiş siparişleri gösterir. Açık sipariş sayısı tarih süzgecinden bağımsız olarak şu anki durumu gösterir. "Bakiyeden ödenen" servisin hak edişinden düşülmesini seçtiği siparişlerin tutarı; kapanmış siparişlerde tutar hak edişten düşülmüştür, açık siparişlerde sipariş kapanınca düşülecektir. Tutarlar KDV dâhil.',
  tabloGecikme: 'Gönderimi geciken parça talepleri',
  tabloGecikmeAciklama: 'Müşteriye söz verilen gönderim tarihi ve saati geçtiği hâlde henüz gönderilmemiş müşteri parça talepleri. Liste tarih süzgecinden bağımsız olarak şu anki durumu gösterir. Servislerin kendi siparişleri bu tabloda yer almaz.',
  tabloGecikmeBos: 'Söz verilen tarih ve saati geçmiş, gönderilmemiş müşteri parça talebi yok. Diğer talepleri Talepler ekranından takip edebilirsiniz.',
  /* Parça tablosunun üç sütunu ADET; üstteki "Müşteri parça talebi" ve
     "Servis siparişi" kutuları talep sayısı. Ad aynı kalınca 4 sipariş
     ile 7 adet yan yana aynı adla okunuyordu. */
  sutun: {
    parca: 'Parça', kod: 'Kod', musteri: 'Müşteri talebinde (adet)', siparis: 'Servis siparişinde (adet)',
    garanti: 'Garanti işinde (adet)', toplamAdet: 'Toplam adet', talep: 'Kaç talepte', model: 'Hangi modellerde',
    servis: 'Servis', siparisSayisi: 'Sipariş', tutar: 'Tutar (KDV dâhil)',
    bakiye: 'Bakiyeden ödenen', acik: 'Şu an açık sipariş',
    /* Sütun birimsiz: gecikme bir günden kısaysa saat ya da dakika
       olarak yazılıyor. "Gecikme (gün)" iken yarım saatlik gecikme
       "0,0" çıkıyor, satır kırmızı dururken rakam "gecikme yok" diye
       okunuyordu. Tablo sıralaması süre yazısını saate çevirip
       karşılaştırıyor (bkz. ortak.jsx → hucreDegeri). */
    no: 'Talep no', musteriAd: 'Müşteri', il: 'İl', sozTarihi: 'Söz verilen tarih ve saat', gecikme: 'Gecikme süresi',
  },
  toplam: 'Toplam',

  notlar: [
    'Müşteri parça talebi ve servis siparişi: seçilen dönemde açılanlar. Servislerin kendi parça siparişleri müşteri talebi sayılmaz.',
    'Onaylanan parça satışı: ödeme onayı seçilen döneme düşen müşteri parça taleplerinin tutarı, talep açılırken kaydedilen fiyattan (KDV dâhil). Fiyat dökümü olmayan eski talepler ve iptal edilen talepler toplama girmez.',
    'Servis siparişi tutarı: seçilen dönemde açılan servis siparişlerinin sipariş anındaki tutarı (KDV dâhil). İptal edilen sipariş toplama girmez.',
    'Ödeme onayı bekleyen: şu an açık, dekontu gelmiş ama ödemesi onaylanmamış müşteri parça talepleri. Tarih süzgecinden bağımsızdır.',
    'Ödemeden gönderime: seçilen dönemde gönderilen (kapanan) müşteri parça taleplerinde ödeme onayından kapanışa geçen süre. Ödemesi onaylanmadan gönderilen talep ortalamaya girmez.',
    `Garanti parçasının gönderilme süresi: servisin garanti işinde parçayı istediği andan ${markaEk('in')} parçayı gönderdiği ana kadar geçen süre. Gönderim tarihi seçilen döneme düşen parçalar sayılır.`,
    'Söz verilen zamana kadar gönderim: müşteriye gönderim tarihi verilmiş ve seçilen dönemde gönderilmiş taleplerden, verilen tarih ve saate kadar gönderilenlerin payı. Gönderimin zamanında yapılıp yapılmadığı belirlenirken hem tarih hem saat dikkate alınır; "Gönderimi geciken parça talepleri" tablosu da aynı ölçüte bakar. Tarih verilmemiş talep hesaba girmez.',
    'En çok istenen parçalar: müşteri talebi ve servis siparişi seçilen dönemde açılana göre, garanti parçası servisin parçayı istediği güne göre sayılır. Parçalar koduna göre ayrılır; kodu olmayan eski kayıt adıyla sayılır. İptal edilen talebin parçası da istenmiş sayılır.',
    'Yüzde farklar bir önceki eşit uzunluktaki dönemle karşılaştırılır. "Tüm zamanlar" seçiliyse karşılaştırma yapılmaz.',
  ],
}

function acikMi(t) {
  return !KAPALI_DURUMLAR.includes(t.status || 'yeni')
}

/* Söz verilen ana göre gecikme, saat cinsinden.

   veri.js → gonderimGecikmeSaati saati aşağı yuvarlıyor; yarım saatlik
   gecikme 0 saat, tabloda "0,0" oluyordu ve satır kırmızıyken rakam
   "gecikme yok" diye okunuyordu. Burada yuvarlanmadan hesaplanıp
   büyüklüğüne göre yazılıyor (bkz. hesap.js → sureYaz). */
function gecikmeSaati(t) {
  return Math.max(0, (Date.now() - t.plan.tarih) / SAAT)
}

/* Servis siparişinin KDV dâhil tutarı; bilinmiyorsa null. */
function siparisTutari(t) {
  const v = Number(t.tutarKdvli)
  if (Number.isFinite(v) && v > 0) return v
  const g = parcaGoruntusu(t)
  return g ? Number(g.toplam) : null
}

/* Ziyaretin parça istediği an (gerekçesi dosya başında). */
function parcaIstekZamani(z, oncekiZiyaret) {
  const t = z.talep
  const alt = oncekiZiyaret?.tarih || t.createdAt || 0
  const sevk = z.parcaSevk?.tarih
  const icinde = (g) => g.tarih > alt && (Number.isFinite(sevk) ? g.tarih < sevk : g.tarih <= (z.tarih ?? Infinity))
  const satir = (t.gecmis || []).find((g) => g?.durum === 'parcaBekliyor' && Number.isFinite(g.tarih) && icinde(g))
  return satir ? satir.tarih : null
}

/* Garanti ziyaretleri, parçanın istendiği anla birlikte. */
function garantiZiyaretleri(talepler) {
  const liste = []
  for (const t of talepler) {
    if (t.tur !== 'servis') continue
    const ziyaretler = servisZiyaretleri(t)
    ziyaretler.forEach((z, i) => {
      if (z.kapi === 'garanti') liste.push({ ...z, istek: parcaIstekZamani(z, ziyaretler[i - 1]) })
    })
  }
  return liste
}

export const parcaBolumu = {
  id: 'parca',
  ad: M.ad,
  soru: M.soru,

  uret({ veri, aralik, donem, onceki, donemde, oncekide, karsilastir, git }) {
    const f = (a, b) => (karsilastir ? fark(a, b) : null)
    const talepler = veri.talepler

    const musteriParca = (t) => t.tur === 'parca' && musteriTalebiMi(t)
    const servisSiparisi = (t) => t.tur === 'parca' && !musteriTalebiMi(t)
    const musteriParcalari = talepler.filter(musteriParca)
    const garanti = garantiZiyaretleri(talepler)

    /* ------------------------------------------------------- Ölçüler */

    const gelenMusteri = donem.filter(musteriParca).length
    const gelenMusteriOnceki = onceki.filter(musteriParca).length
    const donemSiparisleri = donem.filter(servisSiparisi)
    const gelenSiparisOnceki = onceki.filter(servisSiparisi).length

    const satis = (icinde) => {
      const liste = musteriParcalari.filter((t) => t.status !== 'iptal' && icinde(t.odemeOnay?.tarih))
      const fiyatli = liste.filter(parcaGoruntusu)
      return {
        n: liste.length,
        fiyatsiz: liste.length - fiyatli.length,
        toplam: liste.length && !fiyatli.length ? null : topla(fiyatli.map((t) => Number(parcaGoruntusu(t).toplam))),
      }
    }
    const satisDonem = satis(donemde)
    const satisOnceki = satis(oncekide)

    const siparisOzeti = (liste) => {
      const gecerli = liste.filter((t) => t.status !== 'iptal')
      const tutarlar = gecerli.map(siparisTutari)
      const bilinen = tutarlar.filter((x) => x !== null)
      return {
        n: gecerli.length,
        bilinmeyen: tutarlar.length - bilinen.length,
        toplam: gecerli.length && !bilinen.length ? null : topla(bilinen),
      }
    }
    const siparisDonem = siparisOzeti(donemSiparisleri)
    const siparisOnceki = siparisOzeti(onceki.filter(servisSiparisi))

    const odemeBekleyen = musteriParcalari.filter((t) => acikMi(t) && t.dekont && !t.odemeOnay).length

    /* Kapanış = parça gönderildi. Ödeme onayından önce gönderilen
       talepte süre eksi çıkıyor; ortalamaya girmiyor. */
    const gonderilen = (icinde) => musteriParcalari.filter((t) => icinde(kapanisZamani(t)))
    const odemedenSure = (t) => {
      const o = t.odemeOnay?.tarih
      const k = kapanisZamani(t)
      if (!Number.isFinite(o) || !k || k < o) return null
      return (k - o) / SAAT
    }
    const odemedenDonem = gonderilen(donemde).map(odemedenSure).filter((x) => x !== null)
    const odemedenOnceki = gonderilen(oncekide).map(odemedenSure).filter((x) => x !== null)

    const sevkSuresi = (z) => {
      const s = z.parcaSevk?.tarih
      if (!Number.isFinite(s) || !Number.isFinite(z.istek)) return null
      return (s - z.istek) / SAAT
    }
    const sevkDonem = garanti.filter((z) => donemde(z.parcaSevk?.tarih)).map(sevkSuresi).filter((x) => x !== null)
    const sevkOnceki = garanti.filter((z) => oncekide(z.parcaSevk?.tarih)).map(sevkSuresi).filter((x) => x !== null)

    /* SÖZ TEK ÖLÇÜTLE YARGILANIYOR. Bu ölçü sözün verildiği GÜNÜN
       SONUNA kadar gönderileni tutulmuş sayıyordu, "Gönderimi geciken"
       tablosu ise sözün verildiği DAKİKA geçer geçmez talebi kırmızı
       listeliyordu: sabah kırmızı görünen bir talep, akşam gönderilince
       "sözünde durduk" ölçüsünü yükseltiyordu. Müşteriye bildirilen söz
       saat içerdiği için (bkz. Talepler.jsx → PlanFormu, veri.js →
       talepPlanla) sıkı ölçüt geçerli: verilen tarih ve saat. */
    const soz = (icinde) => {
      const sozlu = gonderilen(icinde).filter((t) => Number.isFinite(t.plan?.tarih))
      const tutulan = sozlu.filter((t) => kapanisZamani(t) <= t.plan.tarih)
      return { n: sozlu.length, tutulan: tutulan.length, oran: oran(tutulan.length, sozlu.length) }
    }
    const sozDonem = soz(donemde)
    const sozOnceki = soz(oncekide)

    const olculer = [
      {
        ad: M.musteriTalebi,
        deger: gelenMusteri,
        fark: f(gelenMusteri, gelenMusteriOnceki),
        iyi: 'artis',
        alt: M.musteriTalebiAlt,
      },
      {
        ad: M.siparis,
        deger: donemSiparisleri.length,
        fark: f(donemSiparisleri.length, gelenSiparisOnceki),
        iyi: 'artis',
        alt: M.siparisAlt,
      },
      {
        ad: M.satis,
        deger: paraKutu(satisDonem.toplam),
        fark: f(satisDonem.toplam, satisOnceki.toplam),
        iyi: 'artis',
        alt: M.satisAlt(satisDonem.n, satisDonem.fiyatsiz),
      },
      {
        ad: M.siparisTutari,
        deger: paraKutu(siparisDonem.toplam),
        fark: f(siparisDonem.toplam, siparisOnceki.toplam),
        iyi: 'artis',
        alt: M.siparisTutariAlt(siparisDonem.n, siparisDonem.bilinmeyen),
      },
      {
        ad: M.odemeBekleyen,
        deger: odemeBekleyen,
        iyi: null,
        alt: M.odemeBekleyenAlt,
      },
      {
        ad: M.odemedenGonderim,
        deger: sureYaz(ortalama(odemedenDonem)),
        fark: f(ortalama(odemedenDonem), ortalama(odemedenOnceki)),
        iyi: 'azalis',
        alt: M.odemedenGonderimAlt(odemedenDonem.length, sureYaz(dilim(odemedenDonem, 0.9))),
      },
      {
        ad: M.garantiSevk,
        deger: sureYaz(ortalama(sevkDonem)),
        fark: f(ortalama(sevkDonem), ortalama(sevkOnceki)),
        iyi: 'azalis',
        alt: M.garantiSevkAlt(sevkDonem.length, sureYaz(dilim(sevkDonem, 0.9))),
      },
      {
        ad: M.soz,
        deger: yuzde(sozDonem.tutulan, sozDonem.n),
        fark: karsilastir ? farkPuan(sozDonem.oran, sozOnceki.oran) : null,
        farkBirim: 'puan',
        iyi: 'artis',
        alt: M.sozAlt(sozDonem.tutulan, sozDonem.n),
      },
    ]

    /* ------------------------------------------------------ Grafikler */

    const kovalar = zamanKovalari(aralik, talepler.filter((t) => t.tur === 'parca').map((t) => t.createdAt))
    const grafikler = [
      {
        tur: 'sutun',
        genis: true,
        baslik: M.grafik,
        alt: M.grafikAlt,
        seriler: [
          { anahtar: 'musteri', ad: M.seriMusteri, renk: RENK.bir },
          { anahtar: 'siparis', ad: M.seriSiparis, renk: RENK.iki },
        ],
        kovalar: kovayaDagit(
          kovalar,
          donem.filter((t) => t.tur === 'parca'),
          (t) => t.createdAt,
          (t) => (musteriTalebiMi(t) ? 'musteri' : 'siparis'),
        ),
        onSec: git ? (k) => git('talepler', { durum: 'hepsi', tur: 'parca', aralik: k.aralik }) : undefined,
      },
    ]

    /* ------------------------------------------ En çok istenen parçalar */

    const parcalar = new Map()
    const ekle = (p, alan, talepKimligi, model) => {
      const adet = Number(p?.adet) || 0
      if (adet <= 0 || !(p?.kod || p?.ad)) return
      const anahtar = p.kod || 'ad:' + p.ad
      if (!parcalar.has(anahtar)) {
        parcalar.set(anahtar, {
          ad: p.ad || p.kod, kod: p.kod || '', musteri: 0, siparis: 0, garanti: 0,
          talepler: new Set(), modeller: new Set(),
        })
      }
      const k = parcalar.get(anahtar)
      k[alan] += adet
      k.talepler.add(talepKimligi)
      if (model) k.modeller.add(model)
    }

    for (const t of donem) {
      if (t.tur !== 'parca') continue
      const alan = musteriTalebiMi(t) ? 'musteri' : 'siparis'
      for (const p of talebinParcalari(t)) ekle(p, alan, t.id || t.no, talepModeli(t))
    }
    for (const z of garanti) {
      if (!donemde(z.istek ?? z.tarih)) continue
      for (const p of z.parcalar) ekle(p, 'garanti', z.talep.id || z.talep.no, talepModeli(z.talep))
    }

    const parcaListesi = [...parcalar.values()]
      .map((k) => ({ ...k, toplam: k.musteri + k.siparis + k.garanti }))
      .sort((a, b) => b.toplam - a.toplam || b.talepler.size - a.talepler.size)
    const tumTalepler = new Set(parcaListesi.flatMap((k) => [...k.talepler]))
    const adetTopla = (alan) => String(parcaListesi.reduce((a, k) => a + k[alan], 0))

    /* ------------------------------------ Servislere göre parça siparişi */

    const servisler = new Map()
    for (const t of talepler) {
      if (!servisSiparisi(t)) continue
      const donemdeMi = donemde(t.createdAt)
      const acik = acikMi(t)
      if (!donemdeMi && !acik) continue
      const anahtar = t.servis?.id || t.ad || '—'
      if (!servisler.has(anahtar)) {
        servisler.set(anahtar, { ad: t.servis?.ad || t.ad || '—', siparisler: [], acik: 0 })
      }
      const s = servisler.get(anahtar)
      if (donemdeMi) s.siparisler.push(t)
      if (acik) s.acik++
    }
    /* SAYI İLE TUTAR AYNI KÜMEYİ ANLATIYOR. "Sipariş" sütunu iptal
       edilmiş siparişi de sayarken "Tutar" ve "Bakiyeden ödenen"
       saymıyordu; aynı ekranda "Servis siparişi tutarı" kutusunun alt
       yazısı "İptal edilmeyen 5 sipariş" derken tablo toplamı 6
       gösteriyordu. siparisOzeti zaten iptalleri ayıklıyor, sayı da
       oradan geliyor. */
    const servisSatiri = (siparisler, acik) => {
      const o = siparisOzeti(siparisler)
      const bakiye = siparisOzeti(siparisler.filter((t) => t.odeme === 'bakiye'))
      return [String(o.n), paraHucre(o.toplam), paraHucre(bakiye.toplam), String(acik)]
    }
    const servisListesi = [...servisler.values()].sort(
      (a, b) => b.siparisler.length - a.siparisler.length || b.acik - a.acik,
    )

    /* ------------------------------------------ Gönderimi geciken talepler */

    /* YALNIZ MÜŞTERİ TALEPLERİ. gonderimGecikti yalnız türe bakıyor;
       servisin kendi stok siparişi de `parca` türünde duruyor ve
       backoffice'ten "Planlandı"ya alınıp tarih yazılabiliyor. Tablonun
       "Müşteri" sütununda servisin adı yazıyor, açıklaması ise
       "müşteriye söylenen gönderim tarihi" diyordu. */
    const geciken = talepler
      .filter((t) => musteriParca(t) && gonderimGecikti(t))
      .sort((a, b) => a.plan.tarih - b.plan.tarih)

    const tablolar = [
      {
        baslik: M.tabloParca,
        aciklama: M.tabloParcaAciklama,
        basliklar: [
          M.sutun.parca, M.sutun.kod, M.sutun.musteri, M.sutun.siparis, M.sutun.garanti,
          M.sutun.toplamAdet, M.sutun.talep, M.sutun.model,
        ],
        sag: [2, 3, 4, 5, 6],
        satirlar: parcaListesi.map((k) => ({
          hucreler: [
            k.ad,
            k.kod || '—',
            String(k.musteri),
            String(k.siparis),
            String(k.garanti),
            String(k.toplam),
            String(k.talepler.size),
            [...k.modeller].sort((a, b) => a.localeCompare(b, 'tr')).join(' · ') || '—',
          ],
        })),
        toplamSatiri: [
          M.toplam, '', adetTopla('musteri'), adetTopla('siparis'), adetTopla('garanti'),
          adetTopla('toplam'), String(tumTalepler.size), '',
        ],
      },
      {
        baslik: M.tabloServis,
        aciklama: M.tabloServisAciklama,
        basliklar: [M.sutun.servis, M.sutun.siparisSayisi, M.sutun.tutar, M.sutun.bakiye, M.sutun.acik],
        sag: [1, 2, 3, 4],
        satirlar: servisListesi.map((s) => ({
          hucreler: [s.ad, ...servisSatiri(s.siparisler, s.acik)],
          /* Liste servisin bütün siparişlerini açıyor: "şu an açık"
             sütunu dönemden önce verilmiş siparişi de sayıyor. */
          git: git ? () => git('talepler', { durum: 'hepsi', tur: 'parca', ara: s.ad }) : undefined,
        })),
        toplamSatiri: [
          M.toplam,
          ...servisSatiri(
            servisListesi.flatMap((s) => s.siparisler),
            servisListesi.reduce((a, s) => a + s.acik, 0),
          ),
        ],
      },
      {
        baslik: M.tabloGecikme,
        aciklama: M.tabloGecikmeAciklama,
        bos: M.tabloGecikmeBos,
        basliklar: [M.sutun.no, M.sutun.musteriAd, M.sutun.il, M.sutun.sozTarihi, M.sutun.gecikme],
        sag: [4],
        satirlar: geciken.map((t) => ({
          hucreler: [
            t.no || '—',
            t.ad || '—',
            t.il || '—',
            tarihYaz(t.plan.tarih, false),
            sureYaz(gecikmeSaati(t)),
          ],
          vurgu: 'kirmizi',
          git: git ? () => git('talepler', { talep: t.id, durum: 'hepsi' }) : undefined,
        })),
      },
    ]

    return { olculer, grafikler, tablolar, notlar: M.notlar }
  },
}
