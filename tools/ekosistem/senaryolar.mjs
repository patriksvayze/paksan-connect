/* ==========================================================================
   Ekosistem senaryoları — AK-01 … AK-17

   Her senaryo temiz depoyla başlıyor, kendi dünyasını tohumluyor ve
   gerçek modülleri çağırıyor. Hiçbir iddia ekran metnine, CSS sınıfına
   ya da bir kopyaya bakmıyor; hepsi uygulamanın kendi dışa aktardığı
   fonksiyonlara bakıyor.

   BİR SENARYO NEYE GİRER: bilerek bozulmuş bir akışta BUGÜN
   düşebiliyorsa. Düşemiyorsa kontrol değil, rapor satırıdır ve
   agent tanımında yazılıdır.

   Senaryo sırası sonucu değiştirmemeli. Değiştiriyorsa bu bir
   bulgudur — AK-10 tam onu arıyor.
   ========================================================================== */

import { defter, depoTemizle, saat } from './ortam.mjs'
import {
  SERI,
  SERVIS,
  BAYI,
  BAYI_SERVISI,
  MUSTERI,
  MUSTERI2,
  dunyaKur,
  musteriKur,
  personelKur,
  servisKur,
  defterKur,
  makineleriKur,
  talepVerisi,
  talebiYaz,
} from './tohum.mjs'

/** Depodaki güncel hâlini getirir — her yazımdan sonra yeniden okunur. */
function bul(m, id) {
  return m.veri.talepleriGetir().find((t) => t.id === id) || null
}

/* Kişisel bildirimler `duyurular` anahtarında duruyor ama
   `duyurulariGetir()`ten GEÇMİYOR: o kapı yalnız `duyuru` ve `uyari`
   türlerini süzüyor (veri.js:1345). Tek anahtarda iki cins kayıt var;
   kişisel olanı okumak için ham depoya bakmak gerekiyor — müşteri
   uygulaması da öyle yapıyor. */
/* MÜŞTERİNİN kişisel bildirimleri. 21 Eylül 2026'dan beri aynı depoya
   servise giden talep bildirimleri de yazılıyor (`alici: 'servis'`,
   bkz. veri.js → serviseBildir); onlar müşterinin sayımına girmemeli.
   Servise gidenler ayrı yardımcıda. */
function kisiselBildirimler(m) {
  return m.depo.load('duyurular', []).filter((x) => x.kisisel && x.alici !== 'servis')
}

function servisBildirimleriDepodan(m) {
  return m.depo.load('duyurular', []).filter((x) => x.alici === 'servis')
}

/** Garanti kaydının bitmiş hâli. */
function bitmisKayit(ek = {}) {
  return {
    asama: 'bitti',
    kapi: 'garanti',
    yapilanIs: 'Ayar Yapıldı',
    parcalar: [],
    km: 40,
    iscilik: 500,
    ariza: 'İp sürekli kopuyor',
    ...ek,
  }
}

const ADRES = {
  kaynak: 'elle',
  alici: 'Selçuk Tarım Servisi',
  tel: '3323450014',
  il: 'Konya',
  ilce: 'Selçuklu',
  acikAdres: 'Fevzi Çakmak Mah. 10680 Sk. No:3',
}

/* ========================================================== AK-01 */

export function AK01(m) {
  const d = defter('AK-01', 'Servis talebi uçtan uca')
  depoTemizle()
  const { urunId, kisi, makineler } = dunyaKur(m)

  /* 1 · Connect talebi kuruyor. */
  const veri = talepVerisi('servis', urunId, makineler[0])
  const r = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(veri, kisi))

  d.esit(r.servis?.id, SERVIS.id, 'talep makinenin servisine düşüyor')
  d.esit(r.sahip, 'servis', 'sahiplik serviste')
  d.esit(r.status, 'yeni', 'açılış durumu')
  d.dogru(/^SRV/.test(r.no || ''), 'talep numarası SRV önekli')

  /* 2 · Backoffice aynı kaydı görüyor. */
  const liste = m.veri.talepleriGetir()
  d.dogru(liste.some((t) => t.id === r.id), 'backoffice listesinde var')

  /* 3 · Servisim aynı kaydı görüyor — ve yalnız onu. */
  const servisin = m.veri.servisinTalepleri(liste, SERVIS.id)
  d.esit(servisin.length, 1, 'servisin iş listesinde tek kayıt')
  d.esit(servisin[0]?.id, r.id, 'servisin gördüğü kayıt bu talep')

  /* 4 · Servis kaydı gidiyor. */
  const kayit = bitmisKayit()
  const beklenen = m.servisKaydi.hakkedisHesapla(kayit)
  const sonuc = m.veri.servisKaydiGonder(r, kayit, SERVIS.ad)
  d.esit(sonuc?.hata, undefined, 'kayıt hatasız kabul edildi')

  const t2 = bul(m, r.id)
  d.esit(t2?.status, 'onayBekliyor', 'kayıt sonrası durum')
  d.esit(t2?.masa, 'servis', 'servis masasına düştü')
  d.esit(t2?.hakkedis?.durum, 'bekliyor', 'hak ediş bekliyor')
  d.esit(t2?.hakkedis?.toplam, beklenen.toplam, 'hak ediş tutarı hesapla birebir')
  d.dogru(Boolean(t2?.cozum?.ozet), 'cozum.ozet dolu (Connect bunu gösteriyor)')

  /* 5 · PAKSAN onaylıyor: talep kapanıyor, cariye alacak yazılıyor. */
  m.veri.hakkedisOnayla(t2, 'Sınama Yöneticisi')
  const t3 = bul(m, r.id)
  d.esit(t3?.status, 'kapandi', 'onay sonrası talep kapandı')
  d.esit(t3?.masa, null, 'masa temizlendi')
  d.esit(t3?.hakkedis?.durum, 'onaylandi', 'hak ediş onaylandı')

  const hareketler = m.veri.cariHareketleri(SERVIS.id)
  d.esit(hareketler.length, 1, 'tek cari hareket yazıldı')
  d.esit(hareketler[0]?.tur, 'alacak', 'hareket alacak')
  d.esit(hareketler[0]?.tutar, beklenen.toplam, 'alacak tutarı hak edişle aynı')
  d.esit(m.veri.cariBakiye(SERVIS.id), beklenen.toplam, 'servisin bakiyesi')

  return d
}

/* ========================================================== AK-02 */

export function AK02(m) {
  const d = defter('AK-02', 'Servis atama zinciri')
  depoTemizle()
  dunyaKur(m)

  /* Üç dal. */
  const atanmis = m.servisAtama.makineninServisi(SERI.atanmis)
  d.esit(atanmis?.kaynak, 'atama', 'elle atanmış servis → atama')
  d.esit(atanmis?.servis?.id, SERVIS.id, 'atanan servis doğru')

  const bayili = m.servisAtama.makineninServisi(SERI.bayili)
  d.esit(bayili?.kaynak, 'bayi', 'servisi olmayan kayıt → bayinin servisi')
  d.esit(bayili?.servis?.id, BAYI_SERVISI, 'bayiden gelen servis doğru')

  const sahipsiz = m.servisAtama.makineninServisi(SERI.sahipsiz)
  d.esit(sahipsiz, null, 'ne servis ne bayi → null (uydurulmuyor)')

  /* Talep açılabilirlik kapısı. */
  d.dogru(
    m.servisAtama.servisTalebiAcilabilirMi([{ serial: SERI.atanmis }]),
    'servisi olan makinede talep açılabiliyor',
  )
  d.yanlis(
    m.servisAtama.servisTalebiAcilabilirMi([{ serial: SERI.sahipsiz }]),
    'servisi olmayan makinede talep açılamıyor',
  )

  /* AYNI SERİ, ÜÇ AYRI YAZIM. Defter seriyi geldiği gibi saklıyor;
     müşteri küçük harfle, boşlukla ya da tiresiz yazabilir. Üçü de
     aynı servise çıkmak zorunda — çıkmazsa o müşteri servis talebi
     açamıyor demektir. */
  const yazimlar = [
    SERI.atanmis.toLowerCase(),
    SERI.atanmis.replace(/-/g, ''),
    ' ' + SERI.atanmis.replace(/-/g, ' ') + ' ',
  ]
  for (const y of yazimlar) {
    const c = m.servisAtama.makineninServisi(y)
    d.bak(c?.servis?.id === SERVIS.id, `"${y}" aynı servise çıkıyor`, SERVIS.id, c?.servis?.id ?? null)
  }

  return d
}

/* ========================================================== AK-03 */

export function AK03(m) {
  const d = defter('AK-03', 'İki aşamalı garanti parçası')
  depoTemizle()
  const { urunId, kisi, makineler } = dunyaKur(m)

  const r = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi))

  /* 1. aşama — adressiz kayıt REDDEDİLMELİ, patlamamalı. */
  const parcalar = [{ ad: 'Rulman', adet: 2, kod: 'PRC-1' }]
  const adressiz = m.veri.servisKaydiGonder(r, { asama: 'parca', kapi: 'garanti', parcalar }, SERVIS.ad)
  d.dogru(typeof adressiz?.hata === 'string' && adressiz.hata.length > 0, 'adressiz parça isteği metinle reddedildi')
  d.esit(bul(m, r.id)?.status, 'yeni', 'reddedilen kayıt talebi değiştirmedi')

  /* 1. aşama — adresli kayıt kabul. */
  const asama1 = m.veri.servisKaydiGonder(
    r,
    { asama: 'parca', kapi: 'garanti', parcalar, teslimat: { ...ADRES } },
    SERVIS.ad,
  )
  d.esit(asama1?.hata, undefined, 'adresli parça isteği kabul edildi')

  const t1 = bul(m, r.id)
  d.esit(t1?.status, 'parcaBekliyor', '1. aşama sonrası durum')
  d.esit(t1?.masa, 'parca', 'parça masasına düştü')
  d.esit(t1?.hakkedis, undefined, '1. aşamada hak ediş DOĞMUYOR')
  d.dogru(Boolean(t1?.servisKaydi?.teslimat), 'teslimat adresi kayda yazıldı')

  /* PAKSAN parçayı gönderiyor. */
  m.veri.servisParcasiGonderildi(t1, { firma: 'Aras', takipNo: 'SINAMA-1' }, 'Sınama Yöneticisi')
  const t2 = bul(m, r.id)
  d.esit(t2?.parcaSevk?.takipNo, 'SINAMA-1', 'sevk bilgisi talebe yazıldı')

  /* 2. aşama — aynı ziyaretin devamı; iş bitiyor. */
  const kayit2 = bitmisKayit({ parcalar, teslimat: { ...ADRES } })
  const beklenen = m.servisKaydi.hakkedisHesapla(kayit2)
  m.veri.servisKaydiGonder(t2, kayit2, SERVIS.ad)
  const t3 = bul(m, r.id)

  d.esit(t3?.status, 'onayBekliyor', '2. aşama sonrası durum')
  d.esit(t3?.hakkedis?.toplam, beklenen.toplam, 'hak ediş yalnız 2. aşamada, tek kez')
  d.dogru(
    (t3?.servisKaydi?.parcalar || []).length === parcalar.length,
    'parça listesi iki katına çıkmadı',
  )

  return d
}

/* ========================================================== AK-04 */

export function AK04(m) {
  const d = defter('AK-04', 'Müşterinin yedek parça talebi')
  depoTemizle()
  const { urunId, kisi, makineler } = dunyaKur(m)

  const r = talebiYaz(
    m,
    m.talepOlustur.talepKaydiOlustur(
      talepVerisi('parca', urunId, makineler[0], {
        parcalar: ['Rulman'],
        parcaAdet: { Rulman: 2 },
        fatura: { ad: MUSTERI.ad, tel: MUSTERI.tel, adres: MUSTERI.adres },
        dekont: { id: 'dk-1', ad: 'dekont.pdf', boyut: 1024 },
      }),
      kisi,
    ),
  )

  d.esit(r.servis, null, 'parça talebi hiçbir servise atanmıyor')
  d.esit(r.sahip, 'paksan', 'sahibi PAKSAN')
  d.dogru(/^YPR/.test(r.no || ''), 'talep numarası YPR önekli')

  /* HİÇBİR servis bu talebi görmemeli — 14'ünde de arıyoruz. */
  const liste = m.veri.talepleriGetir()
  const goren = m.marka
    .servisleriGetir()
    .filter((s) => m.veri.servisinTalepleri(liste, s.id).some((t) => t.id === r.id))
  d.esit(goren.length, 0, 'katalogdaki 14 servisin hiçbiri görmüyor')

  /* Ödeme onayı talebi ilerletiyor. */
  m.veri.odemeOnayla(r, 'Sınama Yöneticisi', '')
  const t2 = bul(m, r.id)
  d.esit(t2?.status, 'incelemede', 'ödeme onayı talebi incelemeye aldı')
  d.dogru(Boolean(t2?.odemeOnay?.tarih), 'ödeme onayı damgalandı')

  m.veri.talepKapat(t2, { yapilanIs: 'Parça gönderildi', not: '' }, 'Sınama Yöneticisi')
  const t3 = bul(m, r.id)
  d.esit(t3?.status, 'kapandi', 'talep kapandı')
  d.esit(m.veri.cariHareketleri(SERVIS.id).length, 0, 'müşteri parça talebi cariye HİÇBİR ŞEY yazmıyor')

  return d
}

/* ========================================================== AK-05 */

export function AK05(m) {
  const d = defter('AK-05', 'Servisin kendi parça siparişi')

  /* Borç, kapanışta üç aşamalı bir zincirden okunuyor (veri.js:1091):
     parcaFiyat.toplam → tutarKdvli → tutar → 0. `tutar` KDV HARİÇ,
     yani yanlış dala düşmek servisi eksik borçlandırır.

     ÖLÇÜLDÜ VE ÖNEMLİ: uygulamanın kendi ürettiği siparişte o üçüncü
     dala DÜŞÜLEMİYOR. servisParcaSiparisi `tutarKdvli`yi boş
     bırakmıyor, görüntü yoksa kendisi hesaplıyor
     (`araToplam + kdvTutari(araToplam)`, veri.js:2493). Üçüncü dal
     yalnız o fonksiyondan geçmemiş eski kayıtlar için duruyor. Aşağıda
     ilk iki dal gerçek siparişle, üçüncüsü elle kurulmuş eski kayıtla
     sınanıyor — ve dördüncü bir iddia o kapının kapalı KALDIĞINI
     tutuyor. */
  const bicimler = [
    { ad: 'parcaFiyat.toplam', ek: { parcaFiyat: { satirlar: [{ kod: 'PRC-1', ad: 'Rulman', adet: 1, birimFiyat: 100, tutar: 100 }], araToplam: 100, kdv: 20, toplam: 120 }, tutar: 100, tutarKdvli: 118 }, beklenen: 120 },
    { ad: 'tutarKdvli', ek: { parcaFiyat: null, tutar: 100, tutarKdvli: 118 }, beklenen: 118 },
  ]

  for (const b of bicimler) {
    depoTemizle()
    dunyaKur(m)
    const siparis = m.veri.servisParcaSiparisi({
      servisId: SERVIS.id,
      servisAd: SERVIS.ad,
      servisNo: SERVIS.no,
      servisTel: '3323450014',
      il: SERVIS.il,
      ilce: 'Selçuklu',
      kalemler: [{ kod: 'PRC-1', ad: 'Rulman', adet: 1 }],
      not: '',
      teslimat: { ...ADRES },
      odeme: 'bakiye',
      ...b.ek,
    })
    d.esit(siparis?.hata, undefined, `${b.ad}: sipariş kabul edildi`)
    const t = bul(m, siparis?.talep?.id || siparis?.id)
    d.dogru(Boolean(t?.servisSiparisi), `${b.ad}: servis siparişi işareti var`)
    d.esit(t?.tur, 'parca', `${b.ad}: normal parça talebi olarak yazıldı`)

    m.veri.talepKapat(t, { yapilanIs: 'Gönderildi', not: '' }, 'Sınama Yöneticisi')
    const hareketler = m.veri.cariHareketleri(SERVIS.id)
    d.esit(hareketler.length, 1, `${b.ad}: tek borç hareketi`)
    d.esit(hareketler[0]?.tur, 'borc', `${b.ad}: hareket borç`)
    d.esit(hareketler[0]?.tutar, b.beklenen, `${b.ad}: doğru dal seçildi`)

    /* Uygulamanın ürettiği sipariş `tutarKdvli`yi hiçbir zaman boş
       bırakmamalı — bıraksaydı kapanış KDV hariç tutara düşerdi. */
    d.dogru(Number(t?.tutarKdvli) > 0, `${b.ad}: tutarKdvli boş bırakılmadı`)
  }

  /* 3. dal — yalnız eski kayıtta erişilebilir. Elle kuruluyor çünkü
     servisParcaSiparisi böyle bir kayıt üretemiyor (yukarı bakın). */
  depoTemizle()
  dunyaKur(m)
  const eski = talebiYaz(m, {
    id: 'eski-1',
    no: 'YPR2508140001',
    tur: 'parca',
    status: 'yeni',
    createdAt: Date.now(),
    servisSiparisi: true,
    odeme: 'bakiye',
    tutar: 100,
    servis: { id: SERVIS.id, ad: SERVIS.ad },
    ad: SERVIS.ad,
  })
  m.veri.talepKapat(eski, { yapilanIs: 'Gönderildi', not: '' }, 'Sınama Yöneticisi')
  const eskiHareket = m.veri.cariHareketleri(SERVIS.id)
  d.esit(eskiHareket.length, 1, 'eski kayıt: tek borç hareketi')
  d.esit(eskiHareket[0]?.tutar, 100, 'eski kayıt: son dal (tutar) kullanıldı')

  /* Üç alan da yoksa tutar 0 ve HİÇ hareket yazılmamalı — sıfırlık bir
     borç satırı defteri kirletir. */
  depoTemizle()
  dunyaKur(m)
  const bos = m.veri.servisParcaSiparisi({
    servisId: SERVIS.id,
    servisAd: SERVIS.ad,
    servisNo: SERVIS.no,
    servisTel: '3323450014',
    il: SERVIS.il,
    ilce: 'Selçuklu',
    kalemler: [{ kod: 'PRC-1', ad: 'Rulman', adet: 1 }],
    not: '',
    teslimat: { ...ADRES },
    odeme: 'bakiye',
    parcaFiyat: null,
    tutar: 0,
    tutarKdvli: 0,
  })
  const tb = bul(m, bos?.talep?.id || bos?.id)
  m.veri.talepKapat(tb, { yapilanIs: 'Gönderildi', not: '' }, 'Sınama Yöneticisi')
  d.esit(m.veri.cariHareketleri(SERVIS.id).length, 0, 'tutarsız siparişte sıfırlık hareket yazılmıyor')

  return d
}

/* ========================================================== AK-06 */

/* BEKLENTİ DEĞİŞTİ (21 Eylül 2026, kullanıcının kararı): "Bayi Atama'dan
   ziyade hangi bayinin yetkilendirildiği belirtilsin … Yeni, Bayiye
   İletildi, Teklif Verildi, Kapandı ve İptal olmalı … Bayiye İletilen
   talep aslında kapanmış sayılmalı ve sonraki statülere geçmemeli.
   Teklif Verilen talepler de bayiye iletilememeli … müşteri ile PAKSAN
   ilgilenmeyecekse müşteriye bildirim gitmemeli."

   Senaryonun eski asıl iddiası tam tersiydi ("Bayide bir durum değil,
   türetilmiş etiket"). Kural bilerek değiştiği için iddia da değişti;
   yeni kuralların her biri aşağıda ayrı bir iddia. */
export async function AK06(m, ctx) {
  const d = defter('AK-06', 'Fiyat teklifi bayiye iletilir')
  depoTemizle()
  const { urunId, kisi } = dunyaKur(m)

  const acTeklif = () =>
    talebiYaz(
      m,
      m.talepOlustur.talepKaydiOlustur(talepVerisi('satinalma', urunId, null, { urunId }), kisi),
    )

  const r = acTeklif()
  d.esit(r.servis, null, 'teklif talebi servise atanmıyor')
  d.dogru(/^TKF/.test(r.no || ''), 'talep numarası TKF önekli')

  /* Durum listesi: fiyat teklifinde "İncelemede" yok, "Bayiye İletildi" var. */
  const teklifDurumlari = m.veri.talepDurumlari('satinalma').map((x) => x.id)
  d.esit(
    teklifDurumlari.join(','),
    'yeni,bayiyeIletildi,teklif,kapandi,iptal',
    'fiyat teklifinin durumları kullanıcının saydığı beş durum',
  )
  d.yanlis(
    m.veri.elleSecilebilirDurumlar('satinalma').some((x) => x.id === 'bayiyeIletildi'),
    '"Bayiye İletildi" çipte yok — bayi seçilmeden girilemez',
  )
  for (const tur of ['servis', 'parca']) {
    d.yanlis(
      m.veri.talepDurumlari(tur).some((x) => x.id === 'bayiyeIletildi'),
      `${tur} talebinde "Bayiye İletildi" durumu yok`,
    )
  }
  d.dogru(m.veri.KAPALI_DURUMLAR.includes('bayiyeIletildi'), '"Bayiye İletildi" kapalı durum')
  /* Connect kapalı listesini ayrıca tutuyor (lib/talepEkleme.js; uygulama
     backoffice kodunu almıyor). İkisi ayrılırsa müşteri bayiye iletilmiş
     talebi açık görür ve kimsenin okumayacağı not ekler. */
  const ekleme = await ctx.modulYukle('/src/lib/talepEkleme.js')
  d.esit(
    [...ekleme.KAPALI_DURUMLAR].sort().join(','),
    [...m.veri.KAPALI_DURUMLAR].sort().join(','),
    'Connect\'in kapalı listesi backoffice\'inkiyle aynı',
  )

  /* Bayiye iletme: durum, sahiplik, bayi kaydı — ve MÜŞTERİYE BİLDİRİM YOK. */
  const onceBildirim = kisiselBildirimler(m).length
  const bayi = m.marka.bayiGetir(BAYI.atanmis)
  const ilet = m.veri.talebiBayiyeAta(r, bayi, 'Sınama Yöneticisi')
  const t2 = bul(m, r.id)
  d.dogru(!ilet?.hata, 'yeni talep bayiye iletilebiliyor')
  d.esit(t2?.status, 'bayiyeIletildi', 'durum "Bayiye İletildi"')
  d.esit(t2?.sahip, 'bayi', 'sahiplik bayiye geçti')
  d.esit(t2?.bayi?.id, BAYI.atanmis, 'yetkilendirilen bayi yazıldı')
  d.esit(t2?.masa, null, 'hiçbir masada beklemiyor')
  d.esit(kisiselBildirimler(m).length, onceBildirim, 'müşteriye bildirim GİTMEDİ')

  /* "Sonraki statülere geçmemeli": hiçbir kapı açılmıyor. */
  const denemeler = {
    'durum değiştirme': m.veri.talepDurumDegistir(t2, 'teklif', 'Sınama Yöneticisi'),
    kapatma: m.veri.talepKapat(t2, { ozet: 'deneme' }, 'Sınama Yöneticisi'),
    'teklif verme': m.veri.talepTeklifVer(t2, { tutar: 1000 }, 'Sınama Yöneticisi'),
    iptal: m.veri.talepIptal(t2, { neden: 'deneme' }, 'Sınama Yöneticisi'),
  }
  for (const [ne, sonuc] of Object.entries(denemeler)) {
    d.dogru(Boolean(sonuc?.hata), `bayiye iletilmiş talepte ${ne} reddedildi`)
  }
  d.esit(bul(m, r.id)?.status, 'bayiyeIletildi', 'reddedilen denemelerden sonra durum değişmedi')

  /* Yanlış tıklamanın düzeltilmesi: "Yeni"ye döner, bayi silinir. */
  m.veri.bayiAtamasiniKaldir(bul(m, r.id), 'Sınama Yöneticisi')
  const t3 = bul(m, r.id)
  d.esit(t3?.status, 'yeni', 'geri alınan talep "Yeni"ye döndü')
  d.esit(t3?.bayi, null, 'geri alınca bayi kaydı silindi')
  d.esit(t3?.sahip, 'paksan', 'geri alınca sahiplik PAKSAN\'a döndü')

  /* Teklif verilmiş talep bayiye iletilemez — durumu "Yeni"ye geri
     alınmış olsa bile: kapı talebin teklif geçmişine bakıyor. */
  const r2 = acTeklif()
  m.veri.talepTeklifVer(r2, { tutar: 150000 }, 'Sınama Yöneticisi')
  d.dogru(
    Boolean(m.veri.talebiBayiyeAta(bul(m, r2.id), bayi, 'Sınama Yöneticisi')?.hata),
    'teklif verilmiş talep bayiye iletilemiyor',
  )
  m.veri.talepDurumDegistir(bul(m, r2.id), 'yeni', 'Sınama Yöneticisi')
  d.dogru(
    Boolean(m.veri.talebiBayiyeAta(bul(m, r2.id), bayi, 'Sınama Yöneticisi')?.hata),
    '"Yeni"ye geri alınsa da teklif verilmiş talep iletilemiyor',
  )
  d.esit(bul(m, r2.id)?.status, 'yeni', 'reddedilen iletmeden sonra durum aynı')

  /* Masa sınırı eskisi gibi: talep türü kendi masasının dışına SIZMIYOR.
     `rolunTalepleri` türe ve masaya bakıyor, duruma değil (veri.js). */
  const liste = m.veri.talepleriGetir()
  d.dogru(
    m.veri.rolunTalepleri(liste, 'satis').some((t) => t.id === r.id),
    'satış rolü kendi türünü görmeye devam ediyor',
  )
  for (const rol of ['servis', 'parca']) {
    d.yanlis(
      m.veri.rolunTalepleri(liste, rol).some((t) => t.id === r.id),
      `${rol} masası teklif talebini görmüyor`,
    )
  }

  /* Son talep bayide kalıyor: depoda bir iletilmiş kayıt dursun ki
     eşleme denetimi bayi alanlarını (id, ad, tel, tarih) görebilsin. */
  const r3 = acTeklif()
  m.veri.talebiBayiyeAta(r3, bayi, 'Sınama Yöneticisi')
  const t4 = bul(m, r3.id)
  d.esit(t4?.status, 'bayiyeIletildi', 'ikinci iletme de "Bayiye İletildi"')
  d.dogru(Boolean(t4?.bayi?.tel), 'bayinin telefonu talepte — satış personeli arayacak')

  return d
}


/* ========================================================== AK-07 */

export function AK07(m) {
  const d = defter('AK-07', 'Kişisel bildirim doğru telefona')
  depoTemizle()
  const { urunId, kisi, makineler } = dunyaKur(m)

  /* İkinci müşteri `demoMusteriler`e yazılıyor: musterileriGetir()
     hesabı + o listeyi birleştiriyor (veri.js:1474). İki kişi olmadan
     "yanlış kişiye gitti mi" sorusu sorulamaz. */
  m.depo.save('demoMusteriler', [MUSTERI2])

  /* Talep KİMLİKSİZ açılıyor (müşteri telefonla aramış), yalnız telefon
     var — eşleşme telefonla yapılıyor (veri.js:943-948) ve asıl risk
     burada.

     TELEFON İKİNCİ MÜŞTERİNİNKİ, BİLEREK. `musterileriGetir()` önce
     hesabı, sonra öteki müşterileri veriyor; yani gevşetilmiş bir
     eşleşme LİSTEDE İLK OLANI bulur — bu kurguda yanlış kişiyi.
     İkisinin son dört hanesi aynı olduğu için o gevşeme burada
     yakalanıyor. */
  const veri = talepVerisi('servis', urunId, makineler[0], {
    musteriId: null,
    tel: MUSTERI2.tel,
    telHam: MUSTERI2.tel,
  })
  const r = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(veri, kisi))

  m.veri.talepDurumDegistir(r, 'incelemede', 'Sınama Yöneticisi')
  const kisisel = kisiselBildirimler(m)
  d.esit(kisisel.length, 1, 'tek kişisel bildirim yazıldı')
  d.esit(kisisel[0]?.musteriId, MUSTERI2.id, 'bildirim telefonu TAM eşleşen müşteriye bağlandı')

  /* Süzgeç: sahibi görüyor, öteki görmüyor. */
  const gorur = (kime) =>
    m.duyuruHedef.duyuruGecerliMi(kisisel[0], { user: kime, makineler, servis: null })
  d.dogru(gorur(MUSTERI2), 'alıcı kendi bildirimini görüyor')
  d.yanlis(gorur(MUSTERI), 'başka müşteri o bildirimi GÖRMÜYOR')

  /* Aynı işlem servise de bir kayıt yazdı (talebin servisi var). O kayıt
     aynı depoda ama HİÇBİR MÜŞTERİYE görünmemeli: müşteri kimliği yok. */
  const servise = servisBildirimleriDepodan(m)
  d.esit(servise.length, 1, 'aynı işlem servise de bir bildirim yazdı')
  for (const kime of [MUSTERI, MUSTERI2]) {
    d.yanlis(
      m.duyuruHedef.duyuruGecerliMi(servise[0], { user: kime, makineler, servis: null }),
      `servise giden bildirim ${kime.ad}'a görünmüyor`,
    )
  }

  /* Eşleşmeyen telefon: kayıt yazılıyor ama KİMSEYE görünmüyor —
     bildirimi sahibinden saklamak, yabancıya göstermekten iyidir. */
  depoTemizle()
  const d2 = dunyaKur(m)
  m.depo.save('demoMusteriler', [MUSTERI2])
  const yabanci = talepVerisi('servis', d2.urunId, d2.makineler[0], {
    musteriId: null,
    tel: '5550000000',
    telHam: '5550000000',
  })
  const r2 = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(yabanci, d2.kisi))
  m.veri.talepDurumDegistir(r2, 'incelemede', 'Sınama Yöneticisi')

  const oksuz = kisiselBildirimler(m)
  d.esit(oksuz.length, 1, 'eşleşmeyen telefonda kayıt yine de yazıldı')
  d.dogru(!oksuz[0]?.musteriId, 'alıcı çözülemedi, musteriId boş')
  d.esit(oksuz[0]?.kisisel, true, 'kişisel damgası yine de vuruldu')
  for (const kime of [MUSTERI, MUSTERI2]) {
    d.yanlis(
      m.duyuruHedef.duyuruGecerliMi(oksuz[0], { user: kime, makineler: [], servis: null }),
      `sahipsiz bildirim ${kime.ad}'a da görünmüyor`,
    )
  }

  return d
}

/* ========================================================== AK-08 */

export function AK08(m, ctx) {
  const d = defter('AK-08', 'Yetki sözleşmesi')
  depoTemizle()

  const katalog = new Set(m.yetkiler.TUM_IZINLER)

  /* (a) Kodda geçen her izin adı katalogda var mı?
         Yazım hatası ekranı sessizce kilitler: düğme hiç çıkmaz,
         hata da vermez. `kimlikNo` ve `parcaKatalogu` eklenirken bu
         sınıf hata iki kez yaşandı. */
  const kullanilan = new Set()
  const gecenMetinler = new Set()
  for (const [yol, metin] of ctx.kaynaklar) {
    if (yol.endsWith('yetkiler.js')) continue

    /* Doğrudan yazılmış hâl: izinli(rol, 'talepler') ya da izin: 'talepler'. */
    for (const e of metin.matchAll(/\bizinli\(\s*[^,]+,\s*'([a-zA-Z]+)'/g)) kullanilan.add(e[1])
    for (const e of metin.matchAll(/\bizin:\s*'([a-zA-Z]+)'/g)) kullanilan.add(e[1])

    /* SABİTE ALINMIŞ HÂL. Talepler.jsx:1586 `const KIMLIK_IZNI = 'kimlikNo'`
       yazıp `izinli(rol, KIMLIK_IZNI)` çağırıyor. Yalnız düz yazımı arayan
       bir tarama bunu göremez ve kullanılan bir izni "artık" sanar —
       bu sınamayı yazarken tam olarak o oldu. */
    const sabitler = new Map()
    for (const e of metin.matchAll(/\bconst\s+([A-Z][A-Z0-9_]*)\s*=\s*'([a-zA-Z]+)'/g)) {
      sabitler.set(e[1], e[2])
    }
    for (const e of metin.matchAll(/\bizinli\(\s*[^,]+,\s*([A-Z][A-Z0-9_]*)\s*\)/g)) {
      const d2 = sabitler.get(e[1])
      if (d2) kullanilan.add(d2)
    }

    /* (b) için: iznin adı bu dosyada bir dizgi olarak geçiyor mu? */
    for (const izin of katalog) {
      if (metin.includes(`'${izin}'`)) gecenMetinler.add(izin)
    }
  }
  const kayip = [...kullanilan].filter((i) => !katalog.has(i))
  d.bak(kayip.length === 0, 'kodda geçen her izin katalogda var', '[]', kayip)

  /* (b) Katalogdaki her izin kodda geçiyor mu?
         Geçmeyen satır, kaldırılmış bir ekranın artığıdır: yetki
         ekranında kutusu çıkar, işaretlenir, hiçbir şeyi açmaz. */
  const artik = [...katalog].filter((i) => !gecenMetinler.has(i))
  d.bak(artik.length === 0, 'katalogdaki her izin kodda geçiyor', '[]', artik)

  /* (c) Admin her okumada katalogdan yeniden kuruluyor mu?
         Depoda donmuş eski bir izin kümesi varsa yeni izin admin'e bile
         ulaşmaz. veri.js:90-93 tam bunun için var; koruması sınanıyor. */
  const roller = m.veri.rolleriGetir().map((r) => (r.id === 'admin' ? { ...r, izinler: ['talepler'] } : r))
  m.depo.save('panelIcerik', { roller })
  m.icerik.icerikTazele()
  const admin = m.veri.rolleriGetir().find((r) => r.id === 'admin')
  d.esit(admin?.izinler?.length, katalog.size, 'admin depodaki eksik kümeye rağmen tam yetkili')
  for (const izin of katalog) {
    if (!m.veri.izinli('admin', izin)) d.dogru(false, `admin "${izin}" iznini kaybetti`)
  }
  d.dogru(true, 'admin katalogdaki bütün izinleri taşıyor')

  /* Tanınmayan rol yetkisiz dönüyor — silinmiş rolle çalışmaya devam
     edilmesin diye (veri.js → YETKISIZ_ROL). */
  d.esit(m.veri.izinli('olmayan-rol', 'talepler'), false, 'tanınmayan rol yetkisiz')

  /* (c) ROL BİRDEN ÇOK TALEP TÜRÜ GÖREBİLİYOR (21 Eylül 2026, kullanıcının
     isteği: "Gördüğü Talepler başlığı altındaki talepler birden fazla
     seçilebilmeli"). Tür listesi tek işlevden okunuyor
     (veri.js → rolunTurleri); eski biçimde (tek tür) kayıtlı rol de
     çalışmaya devam etmeli. */
  const ornekTalepler = [
    { id: 's', tur: 'servis' },
    { id: 'p', tur: 'parca' },
    { id: 't', tur: 'satinalma' },
    { id: 'm', tur: 'servis', masa: 'parca' },
  ]
  const gorulen = (rolId) => m.veri.rolunTalepleri(ornekTalepler, rolId).map((t) => t.id).join(',')

  const karma = m.veri.rolEkle(
    { ad: 'Sınama Karma Masa', talepTurleri: ['satinalma', 'servis'], izinler: ['talepler'] },
    'Sınama',
  )
  d.dogru(!karma.hata, 'iki türlü rol açılabiliyor')
  d.esit((m.veri.rolunTurleri(karma.rol?.id) || []).join(','), 'servis,satinalma', 'rol seçilen iki türü taşıyor')
  d.esit(gorulen(karma.rol?.id), 's,t,m', 'iki türlü rol iki türün taleplerini görüyor, üçüncüyü görmüyor')

  const hepsi = m.veri.rolEkle(
    { ad: 'Sınama Her Tür', talepTurleri: ['servis', 'parca', 'satinalma'], izinler: ['talepler'] },
    'Sınama',
  )
  d.esit(m.veri.rolunTurleri(hepsi.rol?.id), null, 'üç tür birden seçilince rol "hepsi" sayılıyor')
  d.esit(gorulen(hepsi.rol?.id), 's,p,t,m', '"hepsi" rolü bütün talepleri görüyor')

  d.esit(
    (m.veri.rolunTurleri({ talepTuru: 'parca' }) || []).join(','),
    'parca',
    'eski biçimde (tek tür) kayıtlı rol okunuyor',
  )
  d.esit(gorulen('parca'), 'p,m', 'varsayılan yedek parça rolü kendi türünü ve masasındakini görüyor')

  /* Depoda eski biçimde duran bir rol: tek tür, `talepTuru` alanında.
     Güncellenince yeni biçime geçmeli, eski alan kalmamalı — kalsaydı
     iki alan birbirini tutmaz, hangisinin geçerli olduğu belirsizleşirdi. */
  const eskiRol = { id: 'sinama-eski-masa', ad: 'Sınama Eski Masa', talepTuru: 'parca', izinler: ['talepler'] }
  m.depo.save('panelIcerik', { ...m.depo.load('panelIcerik', {}), roller: [...m.veri.rolleriGetir(), eskiRol] })
  m.icerik.icerikTazele()
  d.esit(gorulen(eskiRol.id), 'p,m', 'eski biçimdeki rol kendi türünü görüyor')
  m.veri.rolGuncelle(eskiRol.id, { talepTurleri: ['servis', 'parca'] }, 'Sınama')
  const guncel = m.veri.rolBilgi(eskiRol.id)
  d.esit((guncel.talepTurleri || []).join(','), 'servis,parca', 'güncellenen rol yeni tür listesini yazdı')
  d.dogru(!('talepTuru' in guncel), 'güncellenen rolde eski tek-tür alanı kalmadı')

  m.depo.remove('panelIcerik')
  m.icerik.icerikTazele()
  return d
}

/* ========================================================== AK-09 */

export function AK09(m) {
  const d = defter('AK-09', 'Duyuru hedeflemesi')
  depoTemizle()
  const { makineler } = dunyaKur(m)

  /* Konya'ya duyuru: Konyalı müşteri görür, Ankaralı görmez. */
  m.veri.duyuruYayinla(
    {
      tur: 'duyuru',
      baslik: 'Sınama duyurusu',
      metin: 'Konya için',
      hedef: { kime: 'musteri', iller: ['Konya'] },
    },
    'Sınama Yöneticisi',
  )
  const duyuru = m.veri.duyurulariGetir()[0]
  d.dogru(Boolean(duyuru), 'duyuru yayınlandı')

  const gorur = (user, servis = null) =>
    m.duyuruHedef.duyuruGecerliMi(duyuru, { user, makineler, servis })

  d.dogru(gorur(MUSTERI), 'Konyalı müşteri görüyor')
  d.yanlis(gorur(MUSTERI2), 'Ankaralı müşteri görmüyor')
  d.yanlis(gorur(MUSTERI, SERVIS), 'müşteriye yazılan duyuru servise gitmiyor')

  /* Kampanya izni olmayan müşteri ticari iletiyi görmemeli. */
  const izinsiz = { ...MUSTERI, onaylar: { ...MUSTERI.onaylar, kampanya: false } }
  d.yanlis(gorur(izinsiz), 'kampanya izni yoksa duyuru görünmüyor')

  /* Uyarı ticari ileti değil: izinden bağımsız herkese. */
  depoTemizle()
  dunyaKur(m)
  m.veri.duyuruYayinla(
    { tur: 'uyari', baslik: 'Güvenlik', metin: 'Dikkat', hedef: { kime: 'ikisi' } },
    'Sınama Yöneticisi',
  )
  const uyari = m.veri.duyurulariGetir()[0]
  d.dogru(
    m.duyuruHedef.duyuruGecerliMi(uyari, { user: izinsiz, makineler, servis: null }),
    'uyarı kampanya izninden bağımsız görünüyor',
  )
  d.dogru(
    m.duyuruHedef.duyuruGecerliMi(uyari, { user: null, makineler: [], servis: SERVIS }),
    'ikisi hedefli uyarı servise de gidiyor',
  )

  return d
}

/* ========================================================== AK-10 */

/* Tam bir tur sonunda depoda hangi anahtarların bulunması BEKLENİYOR.
   Listede olmayan bir anahtar çıkarsa ya yeni bir depo açılmıştır ya da
   bir yazım yanlış yere gitmiştir. CLAUDE.md'nin kuralı: "Paralel bir
   depo açmak, iki tarafın birbirini görmemesi demektir."
   Yeni anahtar eklemek serbest — ama bilerek, bu listeye yazarak. */
const BEKLENEN_ANAHTARLAR = [
  'paksan.cariHareket',
  'paksan.duyurular',
  'paksan.hesap',
  'paksan.islemKaydi',
  'paksan.machines',
  'paksan.makineKayitlari',
  'paksan.panelOturum',
  'paksan.requests',
]

export function AK10(m, ctx) {
  const d = defter('AK-10', 'Depo ve sabit sözleşmesi')
  depoTemizle()
  const { urunId, kisi, makineler } = dunyaKur(m)

  const r = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi))
  m.veri.servisKaydiGonder(r, bitmisKayit(), SERVIS.ad)
  m.veri.hakkedisOnayla(bul(m, r.id), 'Sınama Yöneticisi')

  const yerel = globalThis.localStorage.anahtarlar()
  const fazla = yerel.filter((a) => !BEKLENEN_ANAHTARLAR.includes(a))
  d.bak(fazla.length === 0, 'beklenmeyen depo anahtarı açılmadı', '[]', fazla)
  d.dogru(yerel.every((a) => a.startsWith('paksan.')), 'bütün anahtarlar "paksan." önekli')

  /* Servis oturumu OTURUM deposunda kalmalı: veri.js:2692 her okumada
     yerel kopyayı siliyor, yani yerelde tutmak sessizce işe yaramaz. */
  const oturumda = globalThis.sessionStorage.anahtarlar()
  d.dogru(oturumda.includes('paksan.servisOturum'), 'servis oturumu oturum deposunda')
  d.yanlis(yerel.includes('paksan.servisOturum'), 'servis oturumu yerel depoya sızmadı')

  /* OTURUM YAZILMIŞ OLMASI YETMİYOR, KABUL EDİLMESİ GEREKİYOR.
     `servisOturumuGetir()` alanı `servisId` diye arıyor (veri.js:2688);
     `id` yazan bir oturum sessizce reddediliyor ve uygulama giriş
     ekranında kalıyor. Depoya bakan bir iddia bunu göremezdi — bu
     satır, tohumun bir kez yanlış alan adı yazmış olmasından sonra
     eklendi. */
  const kabul = m.veri.servisOturumuGetir()
  d.dogru(Boolean(kabul), 'yazılan servis oturumu uygulama tarafından kabul ediliyor')
  d.esit(kabul?.servisId, SERVIS.id, 'oturumdaki servis kimliği doğru')

  /* "Kapalı durumlar" sabiti kaç yerde elle tekrar yazılmış?
     Bugün ölçülen sayı eşik; ARTMAMALI. Aynı listenin iki kopyası, iki
     uygulamanın "bu talep kapandı mı" sorusuna farklı cevap vermesi
     demektir. Azaldıkça buradaki eşik de düşürülür. */
  const KALIP = /\[\s*'kapandi'\s*,\s*'iptal'\s*\]/g
  let tekrar = 0
  const yerler = []
  for (const [yol, metin] of ctx.kaynaklar) {
    const n = (metin.match(KALIP) || []).length
    if (n) {
      tekrar += n
      yerler.push(yol)
    }
  }
  d.bak(tekrar <= 5, `"kapandi/iptal" tekrarı artmamış (bugün ${tekrar})`, '5 ya da daha az', yerler)

  return d
}

/* ========================================================== AK-11 */

export function AK11(m) {
  const d = defter('AK-11', 'Garanti dışı kapanış')
  depoTemizle()
  const { urunId, kisi, makineler } = dunyaKur(m)

  const r = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi))

  /* Servis işi garanti dışı yaptı: kayıt açmıyor, parasını müşteriden
     alıyor. PAKSAN'a hak ediş doğmuyor (servis/ekranlar/TalepDetay.jsx). */
  m.veri.talepKapat(r, { ozet: m.servisKaydi.GARANTI_DISI_OZET, garantiDisi: true }, SERVIS.ad)
  const t = bul(m, r.id)

  d.esit(t?.status, 'kapandi', 'talep kapandı')
  d.esit(t?.masa, null, 'hiçbir masada beklemiyor')
  d.esit(t?.cozum?.garantiDisi, true, 'garanti dışı işareti kaydedildi')
  d.esit(t?.cozum?.ozet, m.servisKaydi.GARANTI_DISI_OZET, 'kapanış özeti sabitten geliyor')
  d.dogru(!t?.hakkedis, 'garanti dışı işte hak ediş DOĞMUYOR')
  d.esit(m.veri.cariHareketleri(SERVIS.id).length, 0, 'cariye hiçbir şey yazılmadı')

  const disi = m.servisKaydi.hakkedisHesapla({ kapi: 'eldeParca', km: 100, iscilik: 900 })
  d.esit(disi.toplam, 0, 'garanti dışı kayıt hak ediş üretmiyor')

  return d
}

/* ========================================================== AK-12 */

export function AK12(m) {
  const d = defter('AK-12', 'Seri çakışması ve hesap birleştirme')
  depoTemizle()

  const urunId = m.marka.PRODUCTS[0].id
  musteriKur(m, MUSTERI)
  makineleriKur(m, urunId)
  defterKur(m, urunId)
  personelKur(m)

  /* Eski hesabın bir talebi olsun ki birleştirmenin taşıyacağı kayıt olsun. */
  talebiYaz(m, {
    id: 'eski-talep',
    no: 'SRV2508140002',
    tur: 'servis',
    status: 'yeni',
    createdAt: Date.now(),
    musteriId: MUSTERI.id,
    ad: MUSTERI.ad,
    tel: MUSTERI.tel,
    telHam: MUSTERI.tel,
    telUlke: 'TR',
    makine: { serial: SERI.atanmis, productId: urunId },
  })

  /* Yeni hesap devrede; aynı seriyi eklemeye çalışıyor. */
  const yeni = { ...MUSTERI2, id: 'msc-yeni' }
  musteriKur(m, yeni)
  const talep = m.numaraTalebi.seriCakismasiTalebi({
    user: yeni,
    eskiUlke: 'TR',
    eskiTel: MUSTERI.tel,
    seri: SERI.atanmis,
    eskiHesap: { musteriId: MUSTERI.id, musteriNo: MUSTERI.no },
  })
  d.dogru(Boolean(talep?.id), 'çakışma talebi yazıldı')
  d.esit(talep?.kaynak, m.numaraTalebi.SERI_CAKISMASI, 'talebin kaynağı seri çakışması')

  const kuyruk = m.numaraTalebi.numaraTalepleri()
  d.esit(kuyruk.length, 1, 'backoffice kuyruğunda tek talep')

  m.veri.numaraTalebiKarar(kuyruk[0], true, 'Sınama Yöneticisi', '')

  const satir = m.depo.load('makineKayitlari', []).find((k) => k.seri === SERI.atanmis)
  d.esit(satir?.musteriId, yeni.id, 'makine defterinde sahip değişti')

  const tasinan = m.depo.load('requests', []).find((t) => t.id === 'eski-talep')
  d.esit(tasinan?.musteriId, yeni.id, 'eski talep yeni hesaba taşındı')

  d.esit(m.numaraTalebi.numaraTalepleri()[0]?.durum, 'onaylandi', 'talep onaylandı olarak kapandı')

  /* Sahiplik devri bir güvenlik olayı: kaydı tutulmadan yapılmıyor. */
  d.dogru(
    m.veri.islemKaydiGetir().some((x) => /seri|numara|birleş/i.test(x.ozet || '')),
    'devir işlem kaydına yazıldı',
  )

  return d
}

/* ========================================================== AK-13 */

export function AK13(m) {
  const d = defter('AK-13', 'Adres ve teslimat')
  depoTemizle()
  const { urunId, kisi, makineler } = dunyaKur(m)

  /* Yarım adres hiçbir yoldan geçmemeli: parçayı hazırlayan personel
     onu tam sanıp kargoya verirdi (lib/teslimat.js). */
  const yarim = { ...ADRES, acikAdres: '' }
  d.esit(m.teslimat.teslimatTemizle(yarim), null, 'yarım adres temizlikten null dönüyor')
  d.esit(m.teslimat.teslimatEksigi(yarim), 'acikAdres', 'eksik alanın adı bildiriliyor')
  d.esit(m.teslimat.teslimatEksigi(ADRES), null, 'tam adreste eksik yok')

  const r = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi))
  const kayitHata = m.veri.servisKaydiGonder(
    r,
    { asama: 'parca', kapi: 'garanti', parcalar: [{ ad: 'Rulman', adet: 1 }], teslimat: yarim },
    SERVIS.ad,
  )
  d.dogru(typeof kayitHata?.hata === 'string', 'servis kaydı yarım adresi reddetti')

  const siparisHata = m.veri.servisParcaSiparisi({
    servisId: SERVIS.id,
    servisAd: SERVIS.ad,
    servisNo: SERVIS.no,
    servisTel: '3323450014',
    il: SERVIS.il,
    ilce: 'Selçuklu',
    kalemler: [{ kod: 'PRC-1', ad: 'Rulman', adet: 1 }],
    teslimat: yarim,
    odeme: 'fatura',
  })
  d.dogru(typeof siparisHata?.hata === 'string', 'parça siparişi yarım adresi reddetti')

  /* Firma adresi TÜRETİLMİŞ: servisin PAKSAN kaydından geliyor, defterde
     saklanmıyor. Bu yüzden backoffice'te adres değişince kendiliğinden
     güncelleniyor ve serviste düzenlenemiyor. */
  const liste = m.adresler.adresleriGetir(SERVIS.id)
  const firma = liste.find((a) => a.id === m.adresler.FIRMA_ADRES_ID)
  d.dogru(Boolean(firma), 'firma adresi listede var')
  d.esit(firma?.varsayilan, true, 'firma adresi varsayılan')
  d.esit(m.depo.load('servisAdresleri', null), null, 'türetilmiş adres depoya YAZILMIYOR')

  m.adresler.adresGuncelle(SERVIS.id, m.adresler.FIRMA_ADRES_ID, { baslik: 'Değişti' })
  const sonra = m.adresler.adresleriGetir(SERVIS.id).find((a) => a.id === m.adresler.FIRMA_ADRES_ID)
  d.yanlis(sonra?.baslik === 'Değişti', 'firma adresi düzenlenemiyor')

  m.adresler.adresSil(SERVIS.id, m.adresler.FIRMA_ADRES_ID)
  d.dogru(
    m.adresler.adresleriGetir(SERVIS.id).some((a) => a.id === m.adresler.FIRMA_ADRES_ID),
    'firma adresi silinemiyor',
  )

  return d
}


/* ========================================================== AK-14 */

/* Sahte ses tanıma: tarayıcı yolunun davranışını sınamak için.
   Gerçek mikrofon yok, gerçek konuşma yok — sınanan şey oturumun
   duraklamadan sonra kendini yeniden başlatıp başlatmadığı. */
class SahteTanima {
  constructor() {
    SahteTanima.son = this
    this.baslatma = 0
    this.durduruldu = false
  }
  start() {
    this.baslatma++
    if (this.baslatma > 50) throw new Error('yeniden başlatma döngüsü')
  }
  stop() {
    this.durduruldu = true
    this.onend?.()
  }
  abort() {
    this.durduruldu = true
  }
  /* --- sınamanın sürdüğü uçlar --- */
  cumle(metin) {
    const r = [{ transcript: metin }]
    r.isFinal = true
    this.onresult?.({ resultIndex: 0, results: [r] })
  }
  duraklama() {
    this.onend?.()
  }
  hata(kod) {
    this.onerror?.({ error: kod })
  }
}

export async function AK14(m, ctx) {
  const d = defter('AK-14', 'Dikte duraklamada kapanmıyor')
  depoTemizle()

  /* Modül `window.SpeechRecognition`'ı gövdesinde okuyor; taklit ondan
     ÖNCE kurulmalı. Bu yüzden toplu yükleyicide değil, burada. */
  const oncekiPencere = globalThis.window
  globalThis.window = { SpeechRecognition: SahteTanima }
  let dikte
  try {
    dikte = await ctx.modulYukle('/src/servis/dikteMotoru.js')
  } finally {
    if (oncekiPencere === undefined) delete globalThis.window
    else globalThis.window = oncekiPencere
  }

  const yazilan = []
  let bittiSayisi = 0
  const uyarilar = []
  const oturum = await dikte.baslat({
    onKismi: () => {},
    onSonuc: (x) => yazilan.push(x),
    onHata: (k) => uyarilar.push(k),
    onBitti: () => bittiSayisi++,
  })
  const t = SahteTanima.son

  d.dogru(Boolean(oturum), 'oturum açıldı')
  d.esit(t.baslatma, 1, 'dinleme bir kez başladı')

  /* 1 · Cümle bitti, teknisyen nefes aldı. ESKİDEN BURADA KAPANIYORDU. */
  t.cumle('düğüm atmıyor')
  t.duraklama()
  d.esit(yazilan.length, 1, 'ilk cümle yazıya döndü')
  d.esit(bittiSayisi, 0, 'duraklamada oturum BİTMEDİ')
  d.esit(t.baslatma, 2, 'dinleme kendiliğinden yeniden başladı')

  /* 2 · İkinci cümle de aynı oturumda ekleniyor. */
  t.cumle('ip kopuyor')
  t.duraklama()
  d.esit(yazilan.length, 2, 'ikinci cümle de aynı oturumda geldi')
  d.esit(bittiSayisi, 0, 'hâlâ dinliyor')

  /* 3 · Sessizlik hatası uyarı olarak GÖSTERİLMİYOR; duraklamadır. */
  t.hata('no-speech')
  t.duraklama()
  d.esit(uyarilar.length, 0, 'sessizlik ekrana uyarı olarak çıkmıyor')
  d.esit(bittiSayisi, 0, 'sessizlik hatası oturumu kapatmadı')

  /* 4 · İki cümle üst üste ekleniyor (yazıya dönüşüm kuralı). */
  let yazi = ''
  for (const x of yazilan) yazi = dikte.yaziyaEkle(yazi, x)
  d.esit(yazi, 'Düğüm atmıyor ip kopuyor', 'cümleler yazının sonuna eklendi')

  /* 5 · Kullanıcı durdurunca BİTİYOR ve bir daha başlamıyor. */
  const oncekiBaslatma = t.baslatma
  await oturum.durdur()
  d.esit(bittiSayisi, 1, 'kullanıcı durdurunca oturum bitti')
  t.duraklama()
  d.esit(t.baslatma, oncekiBaslatma, 'durdurulduktan sonra yeniden başlamıyor')

  /* 6 · Gerçek hata oturumu bitiriyor — sessizlikle karıştırılmıyor. */
  const ikinci = []
  let ikinciBitti = 0
  await dikte.baslat({
    onKismi: () => {},
    onSonuc: () => {},
    onHata: (k) => ikinci.push(k),
    onBitti: () => ikinciBitti++,
  })
  const t2 = SahteTanima.son
  t2.hata('not-allowed')
  t2.duraklama()
  d.esit(ikinci[0], 'izin', 'izin hatası ekrana çıkıyor')
  d.esit(ikinciBitti, 1, 'gerçek hata oturumu bitiriyor')

  return d
}

/* ========================================================== AK-15 */

/* PAKSAN'IN İŞLEMİ SERVİSE BİLDİRİLİR (21 Eylül 2026, kullanıcının
   isteği): "PAKSAN'ın ilgili talep ile yaptığı işlemlerde servise
   bildirim gitmeli." Bildirim `duyurular` deposuna `alici: 'servis'`
   ile yazılıyor (veri.js → serviseBildir) ve Servisim onu talebe bağlı,
   kalıcı olarak gösteriyor (servis/talepBildirimleri.js).

   Üç soru: PAKSAN'ın işlemi yazılıyor mu, servisin KENDİ işlemi
   yazılmıyor mu (kendi yaptığını kendisine bildirmek gürültü), her
   olayın Servisim'de kendi yazısı var mı (yoksa "işlem yaptı" diye
   genel bir cümle çıkar ve servis ne olduğunu anlamaz). */
export async function AK15(m, ctx) {
  const d = defter('AK-15', 'PAKSAN işlemi servise bildirilir')
  depoTemizle()
  const { urunId, kisi, makineler } = dunyaKur(m)
  const tb = await ctx.modulYukle('/src/servis/talepBildirimleri.js')
  const genel = tb.bildirimYazisi({ olay: '__tanimsiz__' }).baslik

  const bildirimler = () => m.veri.servisBildirimleri(SERVIS.id)
  const sonOlay = () => bildirimler()[0]?.olay

  const r = talebiYaz(
    m,
    m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi),
  )
  d.esit(bildirimler().length, 0, 'talep açılışı servis bildirimi yazmıyor (yeni iş ayrı sayılıyor)')

  /* PAKSAN durumu değiştirdi. */
  m.veri.talepDurumDegistir(r, 'incelemede', 'Sınama Yöneticisi')
  const ilk = bildirimler()[0]
  d.esit(ilk?.olay, 'durum', 'PAKSAN\'ın durum değişikliği servise bildirildi')
  d.esit(ilk?.talepId, r.id, 'bildirim talebe bağlı')
  d.esit(ilk?.degerler?.durum, 'incelemede', 'yeni durum bildirimde')

  /* "Yeni"ye geri alma yanlış tıklamanın düzeltilmesi: bildirilmiyor. */
  let sayi = bildirimler().length
  m.veri.talepDurumDegistir(bul(m, r.id), 'yeni', 'Sınama Yöneticisi')
  d.esit(bildirimler().length, sayi, '"Yeni"ye geri alma servise bildirilmedi')

  /* Servisin kendi işlemleri kendisine bildirilmiyor. */
  m.veri.talepPlanla(
    bul(m, r.id),
    { tarih: saat.simdi() + 86400000, tarihYazi: 'yarın', is: 'Ziyaret', gorusuldu: true },
    SERVIS.ad,
    { servisten: true },
  )
  m.veri.talepNotEkle(bul(m, r.id), 'müşteriyi aradım', SERVIS.ad, { servisten: true })
  d.esit(bildirimler().length, sayi, 'servisin kendi randevusu ve notu kendisine bildirilmedi')

  /* PAKSAN servise not yazdı. */
  m.veri.talepNotEkle(bul(m, r.id), 'iki koli gitti', 'Sınama Yöneticisi', { servise: true })
  d.esit(sonOlay(), 'not', 'PAKSAN\'ın notu servise bildirildi')

  /* PAKSAN servis talebine gün verdi: servis bunu "siparişinizin
     gönderim günü" diye okumamalı, ziyaret günü diye okumalı. */
  m.veri.talepPlanla(
    bul(m, r.id),
    { tarih: saat.simdi() + 2 * 86400000, tarihYazi: '2 gün sonra', is: 'Ziyaret', gorusuldu: true },
    'Sınama Yöneticisi',
  )
  const plan = bildirimler()[0]
  d.esit(plan?.olay, 'planlandi', 'PAKSAN\'ın verdiği gün servise bildirildi')
  d.esit(plan?.degerler?.siparis, false, 'servis talebinin günü sipariş diye işaretlenmedi')
  d.dogru(
    tb.bildirimYazisi(plan).baslik !==
      tb.bildirimYazisi({ olay: 'planlandi', degerler: { siparis: true } }).baslik,
    'ziyaret günü ile sipariş gönderim günü Servisim\'de ayrı yazılıyor',
  )

  /* PAKSAN talebi iptal etti: servis o işe gitmemeli. */
  m.veri.talepIptal(bul(m, r.id), { neden: 'Müşteri vazgeçti' }, 'Sınama Yöneticisi')
  d.esit(sonOlay(), 'iptal', 'PAKSAN\'ın iptali servise bildirildi')
  d.esit(bildirimler()[0]?.degerler?.neden, 'Müşteri vazgeçti', 'iptal gerekçesi bildirimde')

  /* Servisin iptali kendisine bildirilmiyor. */
  const r2 = talebiYaz(
    m,
    m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi),
  )
  sayi = bildirimler().length
  m.veri.talepIptal(r2, { neden: 'Yanlış açılmış' }, SERVIS.ad, { servisten: true })
  d.esit(bildirimler().length, sayi, 'servisin kendi iptali kendisine bildirilmedi')

  /* Hak ediş: servisin kaydı bildirim yazmıyor, PAKSAN'ın onayı yazıyor. */
  const r3 = talebiYaz(
    m,
    m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi),
  )
  sayi = bildirimler().length
  m.veri.servisKaydiGonder(r3, bitmisKayit(), SERVIS.ad)
  d.esit(bildirimler().length, sayi, 'servisin gönderdiği kayıt kendisine bildirilmedi')
  m.veri.hakkedisOnayla(bul(m, r3.id), 'Sınama Yöneticisi')
  d.esit(sonOlay(), 'hakedisOnay', 'hak edişin onayı servise bildirildi')
  d.dogru(bildirimler()[0]?.degerler?.tutar > 0, 'onaylanan tutar bildirimde')

  /* Servisi olmayan talep (fiyat teklifi) servis bildirimi yazmıyor. */
  const teklif = talebiYaz(
    m,
    m.talepOlustur.talepKaydiOlustur(talepVerisi('satinalma', urunId, null, { urunId }), kisi),
  )
  sayi = m.depo.load('duyurular', []).filter((x) => x.alici === 'servis').length
  m.veri.talepTeklifVer(teklif, { tutar: 150000 }, 'Sınama Yöneticisi')
  d.esit(
    m.depo.load('duyurular', []).filter((x) => x.alici === 'servis').length,
    sayi,
    'servisi olmayan talepte servis bildirimi yazılmadı',
  )

  /* Her olayın Servisim'de kendi yazısı var. */
  for (const olay of [...new Set(bildirimler().map((b) => b.olay))]) {
    d.bak(
      tb.bildirimYazisi({ olay, degerler: {} }).baslik !== genel,
      `"${olay}" olayının Servisim'de kendi yazısı var`,
      'olaya özel başlık',
      genel,
    )
  }

  /* Okunmuşluk: talep açılınca o talebin bildirimleri listeden düşer. */
  d.esit(tb.okunmamislar(SERVIS.id).length, bildirimler().length, 'hepsi okunmamış başlıyor')
  tb.okunduSay(tb.talebinBildirimleri(SERVIS.id, r.id).map((b) => b.id))
  d.yanlis(
    tb.okunmamislar(SERVIS.id).some((b) => b.talepId === r.id),
    'okundu sayılan talebin bildirimleri okunmamışlardan düştü',
  )
  d.dogru(
    tb.okunmamislar(SERVIS.id).some((b) => b.talepId === r3.id),
    'öteki talebin bildirimi okunmamış kaldı',
  )

  return d
}

/* ========================================================== AK-16 */

/* SERVİSİ ATANMAMIŞ MAKİNE SAYIMI.

   BEKLENTİ DEĞİŞTİ (21 Eylül 2026, kullanıcının kararı): "Servis ataması
   müşteri bazında değil makine bazında olmalı … Müşteri 1 adet yem karma
   ve 1 adet balya makinesine sahip olabilir ve bunlar ile aynı servis
   ilgilenemeyebilir yetkinlik bakımından." Senaryo aynı gün müşteri
   sayımını denetliyordu (hiçbir makinesine servis bakmayan müşteri);
   sayaç Kayıtlı Makineler düğmesine taşındı ve makine sayıyor
   (lib/servisAtama.js → servisiAtanmamisKayitlar).

   Sınama verisinde AYNI müşterinin üç makinesi var: biri elle atanmış,
   biri bayisinin servisinden, biri servissiz. Müşteri sayımı bu
   müşteriyi hiç saymıyordu — servissiz makine gözden kaçıyordu. */
export function AK16(m) {
  const d = defter('AK-16', 'Servisi atanmamış makine sayımı')
  depoTemizle()
  dunyaKur(m)

  const kayitlar = () => m.depo.load('makineKayitlari', [])
  const sayilan = () => m.servisAtama.servisiAtanmamisKayitlar(kayitlar()).map((k) => k.seri)

  d.esit(sayilan().join(','), SERI.sahipsiz, 'yalnız servissiz makine sayıldı')
  d.esit(
    new Set(kayitlar().map((k) => k.musteriId)).size,
    1,
    'üç makine aynı müşterinin — sayım müşteriye değil makineye bakıyor',
  )

  /* Tek tanım: Kayıtlı Makineler'in cevabı müşterinin uygulamasındakiyle
     aynı (ikisi de kaydinServisi'den). */
  for (const k of kayitlar()) {
    d.esit(
      Boolean(m.servisAtama.kaydinServisi(k)),
      Boolean(m.servisAtama.makineninServisi(k.seri)),
      `${k.seri}: backoffice ve müşteri uygulaması aynı cevabı veriyor`,
    )
  }

  /* Bayisinin servisi olan makine atanmış sayılıyor (atama zinciri). */
  d.yanlis(sayilan().includes(SERI.bayili), 'bayisinin servisi olan makine sayılmadı')

  /* Servis atanınca makine sayıdan düşüyor. */
  const kayit = m.servisAtama.makineninKaydi(SERI.sahipsiz)
  d.dogru(Boolean(kayit), 'servissiz makinenin kayıt defterinde satırı var')
  m.makineKaydi.makineKaydiGuncelle(kayit.id, { servisId: SERVIS.id, servisAd: SERVIS.ad })
  d.esit(sayilan().length, 0, 'servis atanınca makine sayıdan düştü')

  return d
}

/* ========================================================== AK-17 */

/* SERVİSİM'DE GECİKME ŞERİDİ YALNIZ SERVİSİN ELİNDEKİ İŞTE (21 Eylül
   2026, kullanıcının bildirdiği sorun): "Yeni başlığı altındaki
   taleplerde belli bir süreyi geçtikten sonra turuncu border rengi
   oluyor. Bu border rengi Devam Eden başlığı altındaki taleplerde de
   var. Burası biraz karışıyor." Şerit artık yalnız servisin el
   sürmediği işte (servis/isDurumu.js → servisGecikti). */
export async function AK17(m, ctx) {
  const d = defter('AK-17', 'Servisim gecikme şeridi')
  depoTemizle()
  const is = await ctx.modulYukle('/src/servis/isDurumu.js')

  const eski = saat.simdi() - 72 * 3600000
  const yeniAcilan = saat.simdi() - 2 * 3600000
  const talep = (ek) => ({ id: 'x', tur: 'servis', status: 'yeni', createdAt: eski, ...ek })

  d.dogru(is.servisGecikti(talep()), 'el sürülmemiş, 72 saatlik iş gecikti')
  d.yanlis(is.servisGecikti(talep({ createdAt: yeniAcilan })), 'iki saatlik yeni iş gecikmedi')

  const devamEden = {
    'randevusu verilmiş': { plan: { tarih: saat.simdi() + 86400000 } },
    'parça bekleyen': { status: 'parcaBekliyor' },
    'onay bekleyen': { status: 'onayBekliyor' },
    'PAKSAN\'a devredilmiş': { devir: { tarih: eski } },
    'kaydı açılmış': { servisKaydi: { asama: 'parca' } },
  }
  for (const [ad, ek] of Object.entries(devamEden)) {
    const t = talep(ek)
    d.yanlis(is.dokunulmamis(t), `${ad} iş "Devam Eden" bölümünde`)
    d.yanlis(is.servisGecikti(t), `${ad} 72 saatlik iş servise gecikmiş gösterilmiyor`)
    /* Backoffice'in ölçüsü değişmedi: PAKSAN için bu talep hâlâ 48 saati
       geçmiş açık bir talep. */
    d.dogru(m.veri.gecikmisMi(t), `${ad} iş backoffice'te yine gecikmiş (ölçü orada değişmedi)`)
  }

  return d
}

/* ========================================================== AK-18 */

/* BİR MAKİNE, BİR KAYIT SATIRI — ve servis atanınca müşteriye bildirim.

   KULLANICININ BULDUĞU (21 Eylül 2026): "Paksan Connect üzerinden demo
   makinelerden birini ekliyorum, çıkarıyorum, tekrar ekliyorum ama
   Kayıtlı Makineler ekranında hepsi için yeni kayıt açılıyor. Servisim
   uygulamasında ise halihazırda bir müşteriye kayıtlı gözüken bir
   makineyi elle servis kaydı ile, kayıtlı olmayan bir müşteri üzerinden
   açtığımda da kaydı tamamlıyor." Kayıt yazan iki işlev de var olan
   satıra hiç bakmıyordu (bkz. lib/makineKaydi.js başı). Hiçbir senaryo
   aynı seriyi ikinci kez yazmıyordu; bu senaryo bunu yapıyor.

   İkinci yarı: "Müşteriye ait makineye servis atandığında Paksan Connect
   uygulamasında müşteriye bildirim gitmeli" (veri.js →
   makineAtamasiniKaydet). */
export async function AK18(m, ctx) {
  const d = defter('AK-18', 'Bir makine, bir kayıt satırı')
  depoTemizle()
  const { urunId, makineler } = dunyaKur(m)
  const mk = m.makineKaydi
  const ham = () => m.depo.load('makineKayitlari', [])
  const satirSayisi = (seri) => {
    const a = m.serial.normalizeSerial(seri)
    return ham().filter((k) => m.serial.normalizeSerial(k.seri) === a).length
  }
  const bildirimler = () => kisiselBildirimler(m).filter((b) => b.tur === 'makine')

  /* 1. Connect: aynı müşteri makineyi silip yeniden ekliyor — küçük harfle. */
  const once = mk.seriSatiri(SERI.atanmis)
  const tekrar = await mk.makineKaydet({ serial: SERI.atanmis.toLowerCase(), productId: urunId }, MUSTERI)
  d.esit(satirSayisi(SERI.atanmis), 1, 'yeniden ekleme yeni satır açmadı')
  d.esit(ham().length, 3, 'defterde hâlâ üç makine')
  d.esit(tekrar.kayit?.id, once.id, 'var olan satır güncellendi, kimliği aynı')
  d.esit(tekrar.kutlama, false, 'yeniden eklemede kutlama yok')
  d.esit(
    m.servisAtama.makineninServisi(SERI.atanmis)?.servis.id,
    SERVIS.id,
    'PAKSAN\'ın atadığı servis yeniden eklemede kaybolmadı',
  )

  /* 2. Servisim: başka müşteride kayıtlı seri, hesapsız biri için elle. */
  const yabanci = mk.servisMakineKaydi({
    seri: SERI.bayili,
    productId: urunId,
    musteriAd: 'Kayıtsız Kişi',
    il: 'Ankara',
    servisId: SERVIS.id,
    servisAd: SERVIS.ad,
  })
  d.esit(yabanci.yeni, false, 'Servisim kayıtlı seriye satır açmadı')
  d.esit(satirSayisi(SERI.bayili), 1, 'seri yine tek satırda')
  d.esit(mk.seriSatiri(SERI.bayili).musteriId, MUSTERI.id, 'makinenin sahibi değişmedi')
  d.esit(
    m.servisAtama.makineninServisi(SERI.bayili)?.kaynak,
    'bayi',
    'talebi açan servis kendini atayamadı: servis hâlâ bayiden',
  )

  /* 3. Servisim: sistemde olmayan seri — satır açılıyor, hesapsız. */
  const YENI = 'ORK1270-2024-00777'
  const ilk = mk.servisMakineKaydi({
    seri: YENI, productId: urunId, musteriAd: 'Kayıtsız Kişi', il: 'Konya', ilce: 'Meram',
    servisId: SERVIS.id, servisAd: SERVIS.ad,
  })
  d.esit(ilk.yeni, true, 'yeni seri için satır açıldı')
  d.esit(ilk.kayit.kaynak, 'servis', 'kaynağı servis')
  /* Servis kayıtlı müşteriyi telefonundan bulduysa satır o hesaba
     bağlanıyor (form alanı gönderiyordu, işlev sessizce null yazıyordu). */
  const hesapli = mk.servisMakineKaydi({
    seri: 'ORK1270-2024-00888', productId: urunId, musteriId: MUSTERI2.id, musteriNo: MUSTERI2.no,
    musteriAd: MUSTERI2.ad, servisId: SERVIS.id, servisAd: SERVIS.ad,
  })
  d.esit(hesapli.kayit.musteriId, MUSTERI2.id, 'kayıtlı müşterinin hesabı satıra yazıldı')

  /* 4. Müşteri o makineyi Connect'ten ekliyor: hesapsız satırı sahipleniyor. */
  const sahiplen = await mk.makineKaydet({ serial: YENI, productId: urunId }, MUSTERI2)
  d.esit(satirSayisi(YENI), 1, 'sahiplenmek ikinci satır açmadı')
  d.esit(sahiplen.kayit?.musteriId, MUSTERI2.id, 'satır müşterinin hesabına geçti')
  d.esit(sahiplen.kayit?.kaynak, 'servis', 'ilk kaynağı (servis) yerinde kaldı')
  d.esit(sahiplen.kayit?.servisId, SERVIS.id, 'makineyi kaydeden servis yerinde kaldı')

  /* 5. Başka hesabın makinesi: yazılmıyor, sahibi değişmiyor. */
  const baska = await mk.makineKaydet({ serial: SERI.sahipsiz, productId: urunId }, MUSTERI2)
  d.esit(baska.kayit, null, 'başka hesaptaki seri yazılmadı')
  d.esit(mk.seriSatiri(SERI.sahipsiz).musteriId, MUSTERI.id, 'sahibi ilk müşteri')
  d.dogru(Boolean(mk.seriBaskaHesaptaMi(SERI.sahipsiz, MUSTERI2)), 'Connect çakışmayı görüyor')

  /* 6. Düzeltmeden önce açılmış kopyalar okurken birleşiyor. En eski
     satır PAKSAN'ın atamasını taşıyor; sonra müşterinin servissiz
     yeniden eklemesi; en yenisi başka bir servisin elle açtığı satır. */
  const t0 = saat.simdi()
  const kopya = (ek) => ({
    seri: SERI.atanmis, productId: urunId, musteriId: null, musteriNo: null, musteriAd: '',
    il: '', ilce: '', bayiId: null, bayiAd: '', servisId: null, servisAd: '',
    uretimTarihi: null, faturaTarihi: null, logoBildi: false, yeniSatis: false, ...ek,
  })
  m.depo.save('makineKayitlari', [
    kopya({ id: 'k3', tarih: t0 - 1000, kaynak: 'servis', musteriAd: 'Başkası', servisId: BAYI_SERVISI }),
    kopya({ id: 'k2', tarih: t0 - 2000, kaynak: 'musteri', musteriId: MUSTERI.id, musteriNo: MUSTERI.no, musteriAd: MUSTERI.ad }),
    kopya({ id: 'k1', tarih: t0 - 3000, kaynak: 'musteri', musteriId: MUSTERI.id, musteriNo: MUSTERI.no, musteriAd: MUSTERI.ad, servisId: SERVIS.id, servisAd: SERVIS.ad }),
  ])
  const birlesik = mk.makineKayitlari()
  d.esit(birlesik.length, 1, 'üç kopya tek satır görünüyor')
  d.esit(birlesik[0].id, 'k1', 'kimlik ve ilk kayıt tarihi en eski satırdan')
  d.esit(birlesik[0].servisId, SERVIS.id, 'PAKSAN\'ın ataması korundu, sonraki elle kayıt yok sayıldı')
  d.esit(m.veri.makineKayitlariGetir().length, 1, 'backoffice de tek satır görüyor')
  mk.makineKaydiGuncelle('k1', { bayiId: BAYI.atanmis })
  d.esit(ham().length, 1, 'ilk yazmada depo da temizlendi')

  /* 7. Servis atanınca müşteriye bildirim. */
  depoTemizle()
  dunyaKur(m)
  const sahipsiz = mk.seriSatiri(SERI.sahipsiz)
  m.veri.makineAtamasiniKaydet(sahipsiz.id, { servisId: SERVIS.id, servisAd: SERVIS.ad }, { ozet: 'atama', personel: 'Deneme' })
  const b = bildirimler()
  d.esit(b.length, 1, 'servis atanınca müşteriye bir bildirim yazıldı')
  d.esit(b[0]?.musteriId, MUSTERI.id, 'bildirim makinenin sahibine')
  d.esit(b[0]?.degerler?.servis, SERVIS.ad, 'bildirimde servisin adı')
  d.esit(b[0]?.degerler?.seri, m.serial.formatSerial(SERI.sahipsiz), 'bildirimde makinenin seri numarası')
  d.dogru(
    m.duyuruHedef.duyuruGecerliMi(b[0], { user: MUSTERI, makineler, servis: null }),
    'sahibinin Bildirimler ekranında görünüyor',
  )
  d.yanlis(
    m.duyuruHedef.duyuruGecerliMi(b[0], { user: MUSTERI2, makineler: [], servis: null }),
    'başka müşterinin ekranında görünmüyor',
  )
  d.yanlis(
    m.duyuruHedef.duyuruGecerliMi(b[0], { user: null, makineler: [], servis: SERVIS }),
    'servisin ekranında görünmüyor',
  )

  const bl = await ctx.modulYukle('/src/lib/bildirimler.js')
  const satir = bl.bildirimListesi({ requests: [], user: MUSTERI, makineler }).find((x) => x.tur === 'makine')
  d.esit(satir?.yol, '/makine/mk-sahipsiz', 'bildirime dokununca o makinenin ekranı açılıyor')

  /* Servis değişmediyse sessiz: aynı servisi yeniden seçmek, ya da
     bayisi değişip servisi doğrudan atanmış kalan makine. */
  m.veri.makineAtamasiniKaydet(sahipsiz.id, { servisId: SERVIS.id, servisAd: SERVIS.ad }, { ozet: 'aynı', personel: 'Deneme' })
  m.veri.makineAtamasiniKaydet(sahipsiz.id, { bayiId: BAYI.bayili }, { ozet: 'bayi', personel: 'Deneme' })
  d.esit(bildirimler().length, 1, 'servis değişmeyince ikinci bildirim yok')

  /* Bayi değişikliği servisi değiştiriyorsa bildirim gidiyor: ankara
     bayisinin servisi ankara-servis, konya-merkez'inki konya-servis
     (marka/katalog/servisler.js → bayiler). */
  const bayili = mk.seriSatiri(SERI.bayili)
  m.veri.makineAtamasiniKaydet(bayili.id, { bayiId: BAYI.atanmis }, { ozet: 'bayi', personel: 'Deneme' })
  d.esit(m.servisAtama.makineninServisi(SERI.bayili)?.servis.id, SERVIS.id, 'yeni bayinin servisi makineye geçti')
  d.esit(bildirimler().length, 2, 'bayi değişince makinenin servisi değişti, bildirim gitti')

  /* Hesapsız makinede kimseye bildirim yazılmıyor. */
  const hesapsiz = mk.servisMakineKaydi({ seri: YENI, productId: urunId, musteriAd: 'Kayıtsız', servisId: null })
  const onceSay = bildirimler().length
  m.veri.makineAtamasiniKaydet(hesapsiz.kayit.id, { servisId: SERVIS.id, servisAd: SERVIS.ad }, { ozet: 'x', personel: 'Deneme' })
  d.esit(bildirimler().length, onceSay, 'hesapsız makinede bildirim yazılmadı')

  return d
}

export const SENARYOLAR = [
  AK01, AK02, AK03, AK04, AK05, AK06, AK07, AK08, AK09, AK10, AK11, AK12, AK13, AK14,
  AK15, AK16, AK17, AK18,
]
