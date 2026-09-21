import { rolBilgi } from '../../../veri'
import {
  fark, ilkIslemSuresi, ilkIslemZamani, ortalama, RENK, servisZiyaretleri, sureYaz,
} from '../hesap'

/* ==========================================================================
   Ekip — "Kim ne kadar iş üstleniyor, ne kadar sürede sonuçlandırıyor?"

   Backoffice personelinin talepler üzerindeki izleri: durum
   değişikliği, not, kapanış, hak ediş onayı ve reddi, parça gönderimi,
   ödeme onayı, teklif, planlama, iptal, servis kaydı düzeltmesi. Her iz
   KENDİ TARİHİYLE döneme giriyor; talebin açıldığı gün değil.

   YALNIZ PERSONEL LİSTESİNDEKİ ADLAR. Eski rapor `gecmis[].personel`
   alanındaki her adı personel sayıyordu. Oysa servis kendi işlemini
   aynı alana kendi firma adıyla yazıyor (bkz. veri.js →
   servisKaydiGonder, destekTalepEt); servis firmaları tabloda personel
   satırı alıyordu. Artık yalnız `veri.personel` listesindeki adlar
   sayılıyor. Bedeli: listeden silinen ya da adı değişen kişinin eski
   işlemleri görünmüyor — kayıt kişinin o günkü adını tutuyor ve
   servisten ayırmanın başka bir yolu yok.

   ÇİFT SAYMA YOK. Çoğu işlem iki yere birden yazıyor: hak ediş onayı
   hem `hakkedis.onay` hem geçmişte bir "kapandı" satırı; teklif hem
   `teklif` hem "teklif" satırı; parça gönderimi hem `parcaSevk` hem
   "parça bekliyor" satırı. Her alan, aynı talepte AYNI KİŞİNİN beklenen
   durumdaki, henüz eşleşmemiş ve tarihçe en yakın satırıyla
   eşleştiriliyor; eşleşen çift tek işlem sayılıyor ve türünü alandan
   alıyor. Eşleşecek satır bulunamazsa (eski kayıt) alan kendi başına bir
   işlem oluyor.
   ÖDEME ONAYI İSTİSNA: geçmiş satırını yalnız talep "yeni" iken ve aynı
   anda yazıyor (bkz. veri.js → odemeOnayla). Tarihsiz eşleşme, kişinin
   daha önce elle yaptığı "incelemede" satırını yutardı; bu yüzden
   ödeme onayı yalnız bir dakika içindeki satırla eşleşiyor.
   Not, düzeltme ve kargo bilgisinin sonradan girilmesi geçmişe satır
   yazmıyor; her biri ayrı işlem.

   İLK İŞLEM hesap.js'teki tanımla: açılıştan sonra geçmişe düşen ilk
   satır. O satırı personel yazdıysa talep o kişinin; servis yazdıysa
   talep bu bölümde yok. Genel Bakış'taki "İlk işleme kadar" ile aynı
   kural, yalnız personelin yaptıklarıyla sınırlı.

   HASSAS BİR EKRAN. Sayı iş yükünü gösteriyor, işin kalitesini değil:
   telefonla çözülen zor bir iş tek satır, kolay on not on satır. Notlar
   bunu açıkça söylüyor. Satırlar tıklanmıyor; Talepler ekranında
   personel süzgeci yok.
   ========================================================================== */

const M = {
  ad: 'Ekip',
  soru: 'Kim ne kadar iş üstleniyor, ne kadar sürede sonuçlandırıyor?',

  personel: 'İşlem yapan personel',
  personelAlt: (n) => `Kayıtlı ${n} personel içinde seçilen dönemde işlem yapanlar`,
  islem: 'Toplam işlem',
  islemAlt: 'Personelin durum değişikliği, not, onay, gönderim ve düzeltme işlemleri; talep sayısı değildir',
  /* ADLAR ÖTEKİ SEKMELERDEN AYRI. Genel Bakış'taki "Kapanan talep" ve
     "İlk işleme kadar" bütün talepleri sayıyor, buradakiler yalnız
     personelin yaptıklarını — aynı dönemde farklı sayı çıkıyor (15'e
     13). Garanti sekmesindeki "Onaylanan hak ediş tutarı" TUTAR,
     burada ADET. "Gönderilen parça" 9 yazıyordu, Garanti sekmesinde
     "Garantide değişen parça" 20 adet: burada sayılan parça değil
     gönderim. */
  kapanan: 'Personelin kapattığı talep',
  kapananAlt: 'Personelin bu dönemde kapattığı talepler',
  onay: 'Onaylanan hak ediş sayısı',
  onayAlt: (n) => `Seçilen dönemde reddedilen hak ediş sayısı: ${n}`,
  sevk: 'Garanti parçası gönderim sayısı',
  sevkAlt: 'Garanti işleri için servise yapılan gönderimler; parça adedi değildir',
  ilkIslem: 'Personelin ilk işlemine kadar',
  ilkIslemAlt: 'Talebin açılışından personelin yaptığı ilk işleme kadar geçen ortalama süre; ilk işlemi servis yaptıysa dahil edilmez',

  grafik: 'Personele göre işlem',
  /* Grafik en çok işlem yapan on iki kişiyle kesiliyor ama alt yazı
     "her personelin" diyordu ve notlarda kesimden söz edilmiyordu:
     personel sayısı on ikiyi geçtiğinde "Toplam işlem" ölçüsü herkesi
     sayarken hemen altındaki çubuklar daha azını topluyor, aynı ekran
     iki farklı toplam gösteriyordu. Tam liste zaten tabloda. */
  grafikAlt: (kesim) =>
    `Seçilen dönemde işlem sayısına göre ilk ${kesim} personel gösterilir; diğer personel grafikte yer almaz. Tam liste aşağıdaki tabloda. İş yükünü gösterir, işin kalitesini göstermez.`,

  tablo: 'Personel',
  tabloAciklama: 'Her işlem, yapıldığı tarihe göre seçilen döneme dahil edilir. Bu dönemde işlemi olmayan aktif personel listenin sonundadır. Hesabı kapatılmış ve bu dönemde işlem yapmamış personel gösterilmez.',
  sutun: {
    personel: 'Personel', rol: 'Rol', islem: 'İşlem', kapanan: 'Kapattığı talep', not: 'Not',
    hakkedis: 'Onayladığı / kabul etmediği hak ediş', sevk: 'Parça gönderimi', odeme: 'Onayladığı ödeme',
    teklif: 'Verdiği teklif', ilk: 'İlk işlemini yaptığı talep', ilkSure: 'Ort. ilk işlem süresi',
  },
  toplam: 'Toplam',

  notlar: [
    'Bu sayılar iş yükünü gösterir, işin kalitesini göstermez. Ekip içinde kişileri karşılaştırmak için değil, işin nasıl dağıldığını görmek için kullanılmalı.',
    'Yalnız backoffice personel listesindeki kişiler sayılır. Servislerin kendi uygulamasından yaptığı işlemler (servis kaydı, randevu, servis notu) burada yer almaz.',
    'İşlemler kişinin o günkü adıyla kaydedilir. Personel listesinden silinen ya da adı değiştirilen kişinin eski işlemleri bu raporda görünmez.',
    'İşlem: talebin geçmişine düşen durum değişiklikleri (talebin açılışı hariç), eklenen notlar, hak ediş onayı ve reddi, parça gönderimi, kargo bilgisinin sonradan girilmesi, ödeme onayı, teklif, planlama, iptal ve servis kaydında yapılan düzeltmeler. Her işlem kendi tarihine göre döneme girer.',
    'Aynı işlem iki kez sayılmaz. Hak ediş onayı, teklif, planlama, iptal ya da parça gönderimi hem talebin geçmişine bir satır hem kendi kaydını yazar; ikisi tek işlem sayılır.',
    'Kapattığı talep: kişinin kapattığı talepler. Hak ediş onayı ya da reddiyle kapanan garanti işleri ve bayiye atanarak kapanan fiyat teklifleri de dahildir. Yedek parça talebinde kapanış, parçanın kargoya verilmesidir. Toplam satırında iki kişinin kapattığı aynı talep bir kez sayılır.',
    'Garanti parçası gönderim sayısı ve parça gönderimi: garanti işinde servise yapılan gönderimlerin sayısı; bir gönderimde birden çok parça olabilir, parça adedi Garanti ve Hak Ediş sekmesinde. Kargo bilgisini sonradan başka biri girdiyse gönderim ilk gönderen kişiye yazılır.',
    'Onaylanan hak ediş sayısı: personelin seçilen dönemde onayladığı hak edişlerin adedi; tutarı Garanti ve Hak Ediş sekmesinde.',
    'Personelin kapattığı talep ve personelin ilk işlemine kadar: yalnız personelin yaptıkları. Genel Bakış sekmesindeki "Kapanan talep" ve "İlk işleme kadar" bütün talepleri sayar; bu yüzden sayılar farklı olabilir.',
    'Onayladığı ödeme: yedek parça talebinde müşterinin gönderdiği ödemenin onayı. Verdiği teklif: fiyat teklifi talebinde müşteriye verilen teklif.',
    'İlk işlemini yaptığı talep: açılışından sonraki ilk işlemi bu kişinin yaptığı talepler; ilk işlemin tarihi seçilen döneme düşüyorsa sayılır. Ortalama süre, talebin açılışından bu ilk işleme kadar geçen süredir. İlk işlemi servisin yaptığı talepler burada yer almaz.',
    'Yüzde farklar bir önceki eşit uzunluktaki dönemle karşılaştırılır. "Tüm zamanlar" seçiliyse karşılaştırma yapılmaz.',
  ],
}

/* Grafikte kaç personel çiziliyor (alt yazıda da yazılı). */
const GRAFIK_KESIM = 12

/* Alanın geçmişte yazdığı satırın durumu (eşleştirme için). */
const ALAN_SATIRI = {
  onay: 'kapandi',
  red: 'kapandi',
  kapanis: 'kapandi',
  sevk: 'parcaBekliyor',
  teklif: 'teklif',
  plan: 'planlandi',
  iptal: 'iptal',
  odeme: 'incelemede',
}

/* Eşleşmemiş geçmiş satırının türü; listede olmayan durum "durum". */
const SATIR_TURU = { kapandi: 'kapanis', teklif: 'teklif', planlandi: 'plan', iptal: 'iptal' }

/* Eşleşme sırası: özel alanlar önce. Hak ediş onayı ile kapanış formu
   aynı "kapandı" satırını isteyebilir; onay önce alır. */
const ESLESME_SIRASI = ['onay', 'red', 'sevk', 'teklif', 'plan', 'iptal', 'kapanis', 'odeme']

const KAPATAN = new Set(['kapanis', 'onay', 'red'])
const SAYILAN = ['not', 'onay', 'red', 'sevk', 'odeme', 'teklif']
const ESZAMAN = 60 * 1000

/* Bir talepteki bütün personel işlemleri: { tur, personel, tarih, talep }.
   Eşleştirmenin gerekçesi dosya başında. */
function talebinIslemleri(t, kisiMi) {
  const islemler = []
  const ekle = (tur, personel, tarih) => {
    if (kisiMi(personel) && Number.isFinite(tarih)) islemler.push({ tur, personel, tarih, talep: t })
  }

  /* Açılış satırı hesap.js → ilkIslemZamani ile aynı ölçüyle ayıklanıyor. */
  const acilis = (t.createdAt || 0) + 1000
  const satirlar = (t.gecmis || [])
    .filter((g) => g && kisiMi(g.personel) && Number.isFinite(g.tarih) && g.tarih > acilis)
    .map((g) => ({ durum: g.durum, personel: g.personel, tarih: g.tarih, tur: null }))

  const alanlar = []
  const alan = (tur, kayit, tarih) => {
    if (kayit && kisiMi(kayit.personel)) {
      alanlar.push({ tur, personel: kayit.personel, tarih: Number.isFinite(tarih) ? tarih : null })
    }
  }

  for (const z of servisZiyaretleri(t)) {
    alan('onay', z.hakkedis?.onay, z.hakkedis?.onay?.tarih)
    alan('red', z.hakkedis?.red, z.hakkedis?.red?.tarih)
    alan('sevk', z.parcaSevk, z.parcaSevk?.tarih)
    if (z.parcaSevk?.guncelleyen) ekle('kargo', z.parcaSevk.guncelleyen, z.parcaSevk.guncelleme)
    for (const d of z.duzeltmeler) ekle('duzeltme', d?.personel, d?.tarih)
  }
  alan('teklif', t.teklif, t.teklif?.tarih)
  /* `plan.tarih` planlanan gün; planın yapıldığı an `kayitTarihi`. */
  alan('plan', t.plan, t.plan?.kayitTarihi)
  alan('iptal', t.iptalBilgi, t.iptalBilgi?.tarih)
  alan('kapanis', t.cozum, t.cozum?.tarih)
  alan('odeme', t.odemeOnay, t.odemeOnay?.tarih)

  alanlar.sort((a, b) => ESLESME_SIRASI.indexOf(a.tur) - ESLESME_SIRASI.indexOf(b.tur))

  for (const a of alanlar) {
    let en = null
    for (const s of satirlar) {
      if (s.tur || s.durum !== ALAN_SATIRI[a.tur] || s.personel !== a.personel) continue
      const uzak = a.tarih === null ? 0 : Math.abs(s.tarih - a.tarih)
      if (a.tur === 'odeme' && (a.tarih === null || uzak > ESZAMAN)) continue
      if (!en || uzak < en.uzak) en = { s, uzak }
    }
    if (en) en.s.tur = a.tur
    else ekle(a.tur, a.personel, a.tarih)
  }

  for (const s of satirlar) ekle(s.tur || SATIR_TURU[s.durum] || 'durum', s.personel, s.tarih)
  for (const n of t.notlar || []) ekle('not', n?.personel, n?.tarih)

  return islemler
}

/* Bir dönemin kişi kişi sayıları. */
function ozetle(islemler, talepler, kisiMi, icinde) {
  const kisiler = new Map()
  const kisi = (ad) => {
    if (!kisiler.has(ad)) {
      kisiler.set(ad, {
        islem: 0, kapanan: new Set(), not: 0, onay: 0, red: 0, sevk: 0, odeme: 0, teklif: 0,
        ilk: 0, sureler: [],
      })
    }
    return kisiler.get(ad)
  }

  const kapanan = new Set()
  let islem = 0
  for (const i of islemler) {
    if (!icinde(i.tarih)) continue
    const k = kisi(i.personel)
    k.islem++
    islem++
    if (KAPATAN.has(i.tur)) {
      k.kapanan.add(i.talep)
      kapanan.add(i.talep)
    }
    if (SAYILAN.includes(i.tur)) k[i.tur]++
  }

  const sureler = []
  for (const t of talepler) {
    const z = ilkIslemZamani(t)
    if (!icinde(z)) continue
    const satir = (t.gecmis || []).find((g) => g?.tarih === z)
    if (!satir || !kisiMi(satir.personel)) continue
    const k = kisi(satir.personel)
    const sure = ilkIslemSuresi(t)
    k.ilk++
    k.sureler.push(sure)
    sureler.push(sure)
  }

  const topla = (alan) => [...kisiler.values()].reduce((a, k) => a + k[alan], 0)
  return {
    kisiler,
    calisan: [...kisiler.values()].filter((k) => k.islem > 0).length,
    islem,
    kapanan: kapanan.size,
    not: topla('not'),
    onay: topla('onay'),
    red: topla('red'),
    sevk: topla('sevk'),
    odeme: topla('odeme'),
    teklif: topla('teklif'),
    ilk: topla('ilk'),
    ilkSure: ortalama(sureler),
  }
}

export const ekipBolumu = {
  id: 'ekip',
  ad: M.ad,
  soru: M.soru,

  uret({ veri, donemde, oncekide, karsilastir }) {
    const f = (a, b) => (karsilastir ? fark(a, b) : null)
    const talepler = veri.talepler
    const personel = veri.personel || []
    const adlar = new Set(personel.map((p) => p.ad).filter(Boolean))
    const kisiMi = (ad) => typeof ad === 'string' && adlar.has(ad)

    const islemler = talepler.flatMap((t) => talebinIslemleri(t, kisiMi))
    const simdi = ozetle(islemler, talepler, kisiMi, donemde)
    const once = ozetle(islemler, talepler, kisiMi, oncekide)

    /* ------------------------------------------------------- Ölçüler */

    const olculer = [
      {
        ad: M.personel,
        deger: simdi.calisan,
        fark: f(simdi.calisan, once.calisan),
        iyi: null,
        alt: M.personelAlt(adlar.size),
      },
      {
        ad: M.islem,
        deger: simdi.islem,
        fark: f(simdi.islem, once.islem),
        iyi: null,
        alt: M.islemAlt,
      },
      {
        ad: M.kapanan,
        deger: simdi.kapanan,
        fark: f(simdi.kapanan, once.kapanan),
        iyi: 'artis',
        alt: M.kapananAlt,
      },
      {
        ad: M.onay,
        deger: simdi.onay,
        fark: f(simdi.onay, once.onay),
        iyi: null,
        alt: M.onayAlt(simdi.red),
      },
      {
        ad: M.sevk,
        deger: simdi.sevk,
        fark: f(simdi.sevk, once.sevk),
        iyi: null,
        alt: M.sevkAlt,
      },
      {
        ad: M.ilkIslem,
        deger: sureYaz(simdi.ilkSure),
        fark: f(simdi.ilkSure, once.ilkSure),
        iyi: 'azalis',
        alt: M.ilkIslemAlt,
      },
    ]

    /* ------------------------------------------------ Kişi satırları */

    /* İşlemi olanlar çoktan aza, olmayanlar adına göre sonda. Hesabı
       kapatılmış ve bu dönemde işlemi olmayan kişi listeye girmiyor. */
    const gorulen = new Set()
    const satirlar = personel
      .filter((p) => {
        if (!p.ad || gorulen.has(p.ad)) return false
        gorulen.add(p.ad)
        return p.aktif !== false || (simdi.kisiler.get(p.ad)?.islem || 0) > 0
      })
      .map((p) => ({ p, k: simdi.kisiler.get(p.ad) }))
      .sort((a, b) => (b.k?.islem || 0) - (a.k?.islem || 0) || a.p.ad.localeCompare(b.p.ad, 'tr'))

    const sayilar = (k, kapanan) => [
      String(k?.islem || 0),
      String(kapanan),
      String(k?.not || 0),
      `${k?.onay || 0} / ${k?.red || 0}`,
      String(k?.sevk || 0),
      String(k?.odeme || 0),
      String(k?.teklif || 0),
      String(k?.ilk || 0),
    ]

    /* ------------------------------------------------------ Grafikler */

    const grafikler = [
      {
        tur: 'yatay',
        genis: true,
        baslik: M.grafik,
        alt: M.grafikAlt(GRAFIK_KESIM),
        renk: RENK.bir,
        satirlar: satirlar
          .filter(({ k }) => k?.islem > 0)
          .slice(0, GRAFIK_KESIM)
          .map(({ p, k }) => ({ ad: p.ad, deger: k.islem, degerYazi: String(k.islem) })),
      },
    ]

    /* -------------------------------------------------------- Tablo */

    const tablolar = [
      {
        baslik: M.tablo,
        aciklama: M.tabloAciklama,
        basliklar: [
          M.sutun.personel, M.sutun.rol, M.sutun.islem, M.sutun.kapanan, M.sutun.not, M.sutun.hakkedis,
          M.sutun.sevk, M.sutun.odeme, M.sutun.teklif, M.sutun.ilk, M.sutun.ilkSure,
        ],
        sag: [2, 3, 4, 5, 6, 7, 8, 9, 10],
        satirlar: satirlar.map(({ p, k }) => ({
          hucreler: [
            p.ad, rolBilgi(p.rol).ad, ...sayilar(k, k?.kapanan.size || 0), sureYaz(ortalama(k?.sureler || [])),
          ],
        })),
        toplamSatiri: [M.toplam, '', ...sayilar(simdi, simdi.kapanan), sureYaz(simdi.ilkSure)],
      },
    ]

    return { olculer, grafikler, tablolar, notlar: M.notlar }
  },
}
