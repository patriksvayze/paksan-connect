import { makineninServisi } from '../../../../lib/servisAtama'
import { tarihYaz } from '../../ortak'
import {
  fark, farkPuan, kovayaDagit, modelAdi, musteriTalebiMi, oran, RENK, topla, yuzde, zamanKovalari,
} from '../hesap'

/* ==========================================================================
   Müşteriler ve Bölgeler — "Müşteri tabanımız nerede ve ne hızla
   büyüyor?"

   MÜŞTERİ KİMLİĞİ TALEPTEN ÇIKARILIYOR. Uygulamadan açılan talepte
   `musteriId` çoğu zaman yok, telefonla açılanda hiç yok. Talep önce
   müşteri kaydına bağlanıyor — kimliğiyle, yoksa telefonuyla (Müşteriler
   ekranının eşleştirmesi); kayıt bulunamazsa telefonla tekilleştiriliyor.
   Aynı kişinin bir talebi kimlikli, öteki kimliksiz geldiğinde iki
   müşteri sayılmıyor.

   TELEFON EKRANA ÇIKMIYOR. Eşleştirmenin anahtarı, hücrenin değeri
   değil. Tabloda ad, müşteri no ve il var; ayrıntı satıra tıklayınca
   açılan listede (KVKK).

   SERVİSİN KENDİ PARÇA SİPARİŞİ MÜŞTERİ DEĞİL (bkz. hesap.js →
   musteriTalebiMi). Sayılsaydı servis firması en çok talep açan
   müşteri, servisin ili de talep gelen il gibi görünürdü.

   İLDE SERVİS KAPSAMASI COĞRAFYADAN DEĞİL, MAKİNEDEN. Müşterinin
   servisi makine → bayi → servis zincirinden çıkıyor (bkz.
   lib/servisAtama.js; coğrafi atama kaldırıldı). İl karnesi bu yüzden
   "o ilde servis bulunuyor mu" diye değil, "o ildeki makinelerin kaçının
   servisi yok" diye soruyor — Servis Ağı'nın kapsama tablosuyla aynı
   kural. Önce servisin bulunduğu ile ya da bölgesine bakılıyordu:
   Aydın'ın üç makinesinin üçünün de servisi varken Aydın "servis yok"
   diye kırmızı görünüyordu (bağımsız denetim, 17 Eylül 2026).

   MAKİNE SERİ NUMARASIYLA BİR KEZ SAYILIYOR. Aynı seri defterde
   birden çok satırda olabiliyor; ili ilk satırından okunuyor.
   ========================================================================== */

const M = {
  ad: 'Müşteriler ve Bölgeler',
  soru: 'Müşteri tabanımız nerede ve ne hızla büyüyor?',

  yeniMusteri: 'Yeni müşteri',
  yeniMusteriAlt: 'Bu dönemde uygulamaya kayıt olan müşteriler',
  toplamMusteri: 'Toplam müşteri',
  toplamMusteriAlt: 'Uygulamaya kayıtlı bütün müşteriler',
  yeniMakine: 'Yeni makine kaydı',
  yeniMakineAlt: 'Bu dönemde kayıt defterine düşen makineler',
  talepAcan: 'Talep açan müşteri',
  talepAcanAlt: (n) => `Bu dönemde toplam ${n} talep açtılar`,
  tekrar: 'Tekrar gelen müşteri',
  tekrarAlt: (n) => (n ? `${n} müşteri birden çok talep açtı` : 'Birden çok talep açan müşteri yok'),
  kampanya: 'Kampanya izni veren',
  bildirim: 'Bildirim izni açık',
  izinAlt: (n, toplam) => `${toplam} müşteriden ${n} tanesi`,

  grafikKayit: 'Yeni müşteri ve makine kaydı',
  grafikKayitAlt: 'Seçilen dönemdeki yeni müşteri ve makine kayıtlarının zaman içindeki dağılımı. İki grafik aynı ölçeği kullanır.',
  parcaMusteri: 'Yeni müşteri',
  parcaMakine: 'Makine kaydı',

  grafikIl: 'İllere göre talep',
  grafikIlAlt: 'Bu dönemde en çok talep gelen 10 il. Bir satıra tıklayınca o ilin talepleri açılır.',

  tabloIl: 'İl karnesi',
  tabloIlAciklama:
    'Müşteri, kayıtlı makine ve servisi olmayan makine bütün zamanlara; talepler seçilen döneme bakar. Kırmızı satırdaki ilde servisi atanmamış makine var: sahibi servis talebi açamıyor.',
  sutunIl: {
    il: 'İl',
    musteri: 'Müşteri',
    makine: 'Kayıtlı makine',
    servis: 'Servis talebi',
    parca: 'Yedek parça',
    satinalma: 'Fiyat teklifi',
    servissiz: 'Servisi olmayan makine',
  },

  tabloMusteri: 'En çok talep açan müşteriler',
  /* MÜŞTERİ ADIYLA KİMLİKLENDİRİLMİYOR. Aynı adı taşıyan iki ayrı
     müşteri (demo defterinde iki "Ahmet Özkan" var, biri Edirne biri
     Tekirdağ) iki satır olarak, kendi sayılarıyla görünüyor ama
     satırlar yalnız İl hücresiyle ayrılıyordu; satıra tıklayınca da
     serbest ad araması ikisinin taleplerini birden getiriyordu. Müşteri
     no sütunu kardeş tablodaki ("Yeni kayıt olan müşteriler") ile aynı;
     satır tıklaması ayırt edici olsun diye telefonla gidiyor. */
  tabloMusteriAciklama:
    'Seçilen dönemde talep açan müşteriler, talep sayısına göre sıralanır. Talep sayısı tek başına müşteri sadakatini veya arıza sıklığını göstermez; nedenini anlamak için talepleri inceleyin. Bir satıra tıklayınca müşterinin telefon numarasıyla arama yapılan talep listesi açılır; telefon numarası yoksa adla arama yapılır ve aynı adı taşıyan başka müşterilerin talepleri de görünebilir.',
  sutunMusteri: {
    no: 'Müşteri numarası',
    musteri: 'Müşteri',
    il: 'İl',
    toplam: 'Toplam talep',
    servis: 'Servis',
    parca: 'Yedek parça',
    satinalma: 'Fiyat teklifi',
    makineler: 'Makineleri',
    son: 'Son talebi',
  },

  tabloYeni: 'Yeni kayıt olan müşteriler',
  tabloYeniAciklama: 'Kayıt tarihi seçilen döneme düşen müşteriler. "Makineyi aldığı yer" müşterinin kendi beyanı; satış kaydı değil.',
  sutunYeni: {
    no: 'Müşteri numarası',
    ad: 'Ad soyad',
    il: 'İl',
    tarih: 'Kayıt tarihi',
    makine: 'Makine sayısı',
    satici: 'Makineyi aldığı yer',
  },

  toplam: 'Toplam',

  notlar: [
    'Yeni müşteri: kayıt tarihi seçilen döneme düşen müşteriler.',
    'Toplam müşteri: uygulamaya kayıtlı bütün müşteriler; tarih süzgecinden bağımsız.',
    'Yeni makine kaydı: kayıt defterine seçilen dönemde düşen makineler. Aynı seri numarası birden çok kez kaydedildiyse bir kez sayılır.',
    'Talep açan müşteri: seçilen dönemde en az bir talep açan müşteriler. Talep müşteri kaydına kimliğiyle ya da telefonuyla bağlanır; kaydı bulunamayan müşteri telefonuna göre bir kez sayılır. Kimliği ve telefonu olmayan talep sayılmaz. Servislerin kendi parça siparişleri dahil değil.',
    'Tekrar gelen müşteri: seçilen dönemde talep açan müşterilerden birden çok talep açanların payı.',
    'En çok talep açan müşteriler: talepler önce müşteri kaydına kimlik veya telefon numarasıyla bağlanır. Kayıt bulunamazsa kimlik, o da yoksa telefon numarası kullanılır. İkisi de yoksa talep sayılmaz. Servislerin kendi parça siparişleri dâhil değildir. Aynı adı taşıyan farklı müşteriler ayrı satırlarda gösterilir; müşteri numarası kayıtlıysa bu sütundan ayırt edilebilir.',
    'Kampanya izni veren ve bildirim izni açık: bugün kayıtlı müşterilerin payı; tarih süzgecinden bağımsız.',
    'İl karnesi: müşteri, kaydındaki ile göre; kayıtlı makine, kayıt defterindeki ile göre sayılır. İli yazılı olmayan kayıt tabloda yok.',
    'Servisi olmayan makine: ildeki kayıtlı makinelerden, ne kendisine ne de satan bayiye servis atanmış olanlar. Servis Ağı sekmesindeki kapsama tablosuyla aynı kuralla sayılır.',
    'Yüzde farklar bir önceki eşit uzunluktaki dönemle karşılaştırılır. "Tüm zamanlar" seçiliyse karşılaştırma yapılmaz.',
  ],
}

/* Bildirim izninin kayıttaki değeri (bkz. lib/bildirim.js →
   BILDIRIM.VERILDI). O dosya Capacitor eklentilerini içe aldığı için
   backoffice'e çekilmiyor; değer burada tekrar yazılı. */
const IZIN_VERILDI = 'verildi'

const TURLER = ['servis', 'parca', 'satinalma']

const seriOku = (x) => String(x || '').trim()

/* Talebi müşteriye bağlayan okuyucu. Önce kayıt (kimlik, sonra
   telefon); kayıt yoksa kimlik ya da telefon anahtar oluyor. İkisi de
   yoksa talep hiçbir müşteriye yazılamıyor: null. (Başka bölümler de
   müşteri sayıyorsa hesap.js'e taşınabilir.) */
function musteriEslestirici(musteriler) {
  const kimlikle = new Map()
  const telefonla = new Map()
  for (const m of musteriler) {
    if (m.id && !kimlikle.has(m.id)) kimlikle.set(m.id, m)
    if (m.tel && !telefonla.has(String(m.tel))) telefonla.set(String(m.tel), m)
  }
  return (t) => {
    const kayit =
      (t.musteriId && kimlikle.get(t.musteriId)) || (t.telHam && telefonla.get(String(t.telHam))) || null
    if (kayit) return { anahtar: 'kayit:' + (kayit.id || kayit.tel), kayit }
    if (t.musteriId) return { anahtar: 'kimlik:' + t.musteriId, kayit: null }
    if (t.telHam) return { anahtar: 'tel:' + t.telHam, kayit: null }
    return null
  }
}

export const musteriBolumu = {
  id: 'musteri',
  ad: M.ad,
  soru: M.soru,

  uret({ veri, aralik, donem, onceki, donemde, oncekide, karsilastir, git }) {
    const f = (a, b) => (karsilastir ? fark(a, b) : null)
    const musteriler = veri.musteriler
    const eslestir = musteriEslestirici(musteriler)

    /* Talepleri müşteriye göre gruplar; servis siparişleri dışarıda. */
    const grupla = (liste) => {
      const gruplar = new Map()
      for (const t of liste) {
        if (!musteriTalebiMi(t)) continue
        const e = eslestir(t)
        if (!e) continue
        if (!gruplar.has(e.anahtar)) gruplar.set(e.anahtar, { kayit: e.kayit, talepler: [] })
        gruplar.get(e.anahtar).talepler.push(t)
      }
      return [...gruplar.values()]
    }

    /* Seri → defterdeki ilk satırı (bütün zamanlar) ve dönemdeki /
       önceki dönemdeki ilk satırı. */
    const ilkSatir = new Map()
    const donemSatiri = new Map()
    const oncekiSatiri = new Map()
    for (const k of veri.makineler) {
      const s = seriOku(k.seri)
      if (!s) continue
      if (!ilkSatir.has(s)) ilkSatir.set(s, k)
      if (donemde(k.tarih) && !donemSatiri.has(s)) donemSatiri.set(s, k)
      if (oncekide(k.tarih) && !oncekiSatiri.has(s)) oncekiSatiri.set(s, k)
    }

    /* ------------------------------------------------------- Ölçüler */

    const yeniMusteriler = musteriler.filter((m) => donemde(m.createdAt))
    const yeniMusteriOnceki = musteriler.filter((m) => oncekide(m.createdAt)).length

    const gruplarDonem = grupla(donem)
    const gruplarOnceki = grupla(onceki)
    const tekrarDonem = gruplarDonem.filter((g) => g.talepler.length > 1).length
    const tekrarOnceki = gruplarOnceki.filter((g) => g.talepler.length > 1).length

    const kampanyaIzni = musteriler.filter((m) => m.onaylar?.kampanya === true).length
    const bildirimIzni = musteriler.filter((m) => m.bildirim?.izin === IZIN_VERILDI).length

    const olculer = [
      {
        ad: M.yeniMusteri,
        deger: yeniMusteriler.length,
        fark: f(yeniMusteriler.length, yeniMusteriOnceki),
        iyi: 'artis',
        alt: M.yeniMusteriAlt,
      },
      {
        ad: M.toplamMusteri,
        deger: musteriler.length,
        iyi: null,
        alt: M.toplamMusteriAlt,
      },
      {
        ad: M.yeniMakine,
        deger: donemSatiri.size,
        fark: f(donemSatiri.size, oncekiSatiri.size),
        iyi: 'artis',
        alt: M.yeniMakineAlt,
      },
      {
        ad: M.talepAcan,
        deger: gruplarDonem.length,
        fark: f(gruplarDonem.length, gruplarOnceki.length),
        iyi: null,
        alt: gruplarDonem.length ? M.talepAcanAlt(topla(gruplarDonem.map((g) => g.talepler.length))) : undefined,
      },
      {
        ad: M.tekrar,
        deger: yuzde(tekrarDonem, gruplarDonem.length),
        fark: karsilastir ? farkPuan(oran(tekrarDonem, gruplarDonem.length), oran(tekrarOnceki, gruplarOnceki.length)) : null,
        farkBirim: 'puan',
        iyi: null,
        alt: M.tekrarAlt(tekrarDonem),
      },
      {
        ad: M.kampanya,
        deger: yuzde(kampanyaIzni, musteriler.length),
        iyi: null,
        alt: M.izinAlt(kampanyaIzni, musteriler.length),
      },
      {
        ad: M.bildirim,
        deger: yuzde(bildirimIzni, musteriler.length),
        iyi: null,
        alt: M.izinAlt(bildirimIzni, musteriler.length),
      },
    ]

    /* ------------------------------------------------------ Grafikler */

    const makineDonem = [...donemSatiri.values()]
    const kovalar = zamanKovalari(aralik, [
      ...musteriler.map((m) => m.createdAt),
      ...veri.makineler.map((k) => k.tarih),
    ])
    const adetSerisi = (ad) => [{ anahtar: 'adet', ad, renk: RENK.bir }]

    /* Müşteriler ve Kayıtlı Makineler ekranları süzgeç almıyor; sütuna
       tıklamak süzgeçsiz listeyi açardı, o yüzden tıklama yok. */
    const grafikler = [
      {
        tur: 'kucukCoklu',
        genis: true,
        baslik: M.grafikKayit,
        alt: M.grafikKayitAlt,
        parcalar: [
          {
            baslik: M.parcaMusteri,
            toplam: yeniMusteriler.length,
            seriler: adetSerisi(M.parcaMusteri),
            kovalar: kovayaDagit(kovalar, yeniMusteriler, (m) => m.createdAt, () => 'adet'),
          },
          {
            baslik: M.parcaMakine,
            toplam: makineDonem.length,
            seriler: adetSerisi(M.parcaMakine),
            kovalar: kovayaDagit(kovalar, makineDonem, (k) => k.tarih, () => 'adet'),
          },
        ],
      },
    ]

    const musteriTalepleri = donem.filter(musteriTalebiMi)
    const ilTalep = new Map()
    for (const t of musteriTalepleri) {
      if (!t.il) continue
      if (!ilTalep.has(t.il)) ilTalep.set(t.il, { servis: 0, parca: 0, satinalma: 0, toplam: 0 })
      const k = ilTalep.get(t.il)
      k.toplam++
      if (k[t.tur] !== undefined) k[t.tur]++
    }
    const ilSuzgeci = (il) => ({ durum: 'hepsi', il, aralik })

    grafikler.push({
      tur: 'yatay',
      genis: true,
      baslik: M.grafikIl,
      alt: M.grafikIlAlt,
      renk: RENK.bir,
      satirlar: [...ilTalep.entries()]
        .sort((a, b) => b[1].toplam - a[1].toplam || a[0].localeCompare(b[0], 'tr'))
        .slice(0, 10)
        .map(([il, k]) => ({
          ad: il,
          deger: k.toplam,
          onSec: git ? () => git('talepler', ilSuzgeci(il)) : undefined,
        })),
    })

    /* ------------------------------------------------------- Tablolar */

    const iller = new Set()
    const musteriIl = new Map()
    const makineIl = new Map()
    const servissizIl = new Map()
    const say = (harita, anahtar) => harita.set(anahtar, (harita.get(anahtar) || 0) + 1)
    for (const m of musteriler) {
      if (!m.il) continue
      iller.add(m.il)
      say(musteriIl, m.il)
    }
    for (const k of ilkSatir.values()) {
      if (!k.il) continue
      iller.add(k.il)
      say(makineIl, k.il)
      if (!makineninServisi(seriOku(k.seri))) say(servissizIl, k.il)
    }
    for (const il of ilTalep.keys()) iller.add(il)

    const ilSatirlari = [...iller]
      .map((il) => {
        const talep = ilTalep.get(il) || { servis: 0, parca: 0, satinalma: 0, toplam: 0 }
        return {
          il,
          talep,
          musteri: musteriIl.get(il) || 0,
          makine: makineIl.get(il) || 0,
          servissiz: servissizIl.get(il) || 0,
        }
      })
      .sort(
        (a, b) =>
          b.talep.toplam - a.talep.toplam || b.musteri - a.musteri || a.il.localeCompare(b.il, 'tr'),
      )

    const ilToplam = (oku) => String(topla(ilSatirlari.map(oku)))

    const musteriSatirlari = gruplarDonem
      .map((g) => {
        const son = g.talepler.reduce((a, t) => ((t.createdAt || 0) > (a.createdAt || 0) ? t : a))
        const urunler = g.kayit
          ? (g.kayit.makineler || []).map((mk) => mk.productId)
          : g.talepler.map((t) => t.makine?.productId)
        const modeller = [...new Set(urunler.filter(Boolean).map(modelAdi))]
        return { g, son, modeller }
      })
      .sort(
        (a, b) =>
          b.g.talepler.length - a.g.talepler.length || (b.son.createdAt || 0) - (a.son.createdAt || 0),
      )

    const tablolar = [
      {
        baslik: M.tabloIl,
        aciklama: M.tabloIlAciklama,
        basliklar: [
          M.sutunIl.il, M.sutunIl.musteri, M.sutunIl.makine, M.sutunIl.servis,
          M.sutunIl.parca, M.sutunIl.satinalma, M.sutunIl.servissiz,
        ],
        sag: [1, 2, 3, 4, 5, 6],
        satirlar: ilSatirlari.map((s) => ({
          hucreler: [
            s.il,
            String(s.musteri),
            String(s.makine),
            String(s.talep.servis),
            String(s.talep.parca),
            String(s.talep.satinalma),
            String(s.servissiz),
          ],
          git: git ? () => git('talepler', ilSuzgeci(s.il)) : undefined,
          vurgu: s.servissiz > 0 ? 'kirmizi' : undefined,
        })),
        toplamSatiri: [
          M.toplam,
          ilToplam((s) => s.musteri),
          ilToplam((s) => s.makine),
          ilToplam((s) => s.talep.servis),
          ilToplam((s) => s.talep.parca),
          ilToplam((s) => s.talep.satinalma),
          ilToplam((s) => s.servissiz),
        ],
      },
      {
        baslik: M.tabloMusteri,
        aciklama: M.tabloMusteriAciklama,
        basliklar: [
          M.sutunMusteri.no, M.sutunMusteri.musteri, M.sutunMusteri.il, M.sutunMusteri.toplam,
          M.sutunMusteri.servis, M.sutunMusteri.parca, M.sutunMusteri.satinalma,
          M.sutunMusteri.makineler, M.sutunMusteri.son,
        ],
        sag: [3, 4, 5, 6],
        satirlar: musteriSatirlari.map(({ g, son, modeller }) => {
          const ad = g.kayit?.ad || son.ad || ''
          /* Talepler ekranının araması talepteki ada, telefona ve talep
             numarasına bakıyor (bkz. Talepler.jsx). Telefon iki
             müşteriyi ayırt eden tek alan; adla aranırsa aynı adı
             taşıyan başka müşterinin talepleri de geliyor. */
          const aranan = son.tel || g.kayit?.tel || son.ad || ad || son.no
          return {
            hucreler: [
              g.kayit?.no || '—',
              ad || '—',
              g.kayit?.il || son.il || '—',
              String(g.talepler.length),
              ...TURLER.map((tur) => String(g.talepler.filter((t) => t.tur === tur).length)),
              modeller.join(' · ') || '—',
              tarihYaz(son.createdAt, false),
            ],
            git: git ? () => git('talepler', { durum: 'hepsi', ara: aranan, aralik }) : undefined,
          }
        }),
        toplamSatiri: [
          M.toplam,
          '',
          '',
          String(topla(gruplarDonem.map((g) => g.talepler.length))),
          ...TURLER.map((tur) =>
            String(topla(gruplarDonem.map((g) => g.talepler.filter((t) => t.tur === tur).length))),
          ),
          '',
          '',
        ],
      },
      {
        baslik: M.tabloYeni,
        aciklama: M.tabloYeniAciklama,
        basliklar: [
          M.sutunYeni.no, M.sutunYeni.ad, M.sutunYeni.il, M.sutunYeni.tarih,
          M.sutunYeni.makine, M.sutunYeni.satici,
        ],
        sag: [4],
        satirlar: [...yeniMusteriler]
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .map((m) => ({
            hucreler: [
              m.no || '—',
              m.ad || '—',
              m.il || '—',
              tarihYaz(m.createdAt, false),
              String((m.makineler || []).length),
              m.satici || '—',
            ],
            git: git ? () => git('musteriler') : undefined,
          })),
      },
    ]

    return { olculer, grafikler, tablolar, notlar: M.notlar }
  },
}
