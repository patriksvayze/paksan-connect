/* ==========================================================================
   Ekosistem senaryoları — AK-01 … AK-14

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
function kisiselBildirimler(m) {
  return m.depo.load('duyurular', []).filter((x) => x.kisisel)
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

export function AK06(m) {
  const d = defter('AK-06', 'Fiyat teklifi bayiye')
  depoTemizle()
  const { urunId, kisi } = dunyaKur(m)

  const r = talebiYaz(
    m,
    m.talepOlustur.talepKaydiOlustur(talepVerisi('satinalma', urunId, null, { urunId }), kisi),
  )
  d.esit(r.servis, null, 'teklif talebi servise atanmıyor')
  d.dogru(/^TKF/.test(r.no || ''), 'talep numarası TKF önekli')

  const bayi = m.marka.bayiGetir(BAYI.atanmis)
  m.veri.talebiBayiyeAta(r, bayi, 'Sınama Yöneticisi')
  const t2 = bul(m, r.id)

  d.esit(t2?.sahip, 'bayi', 'sahiplik bayiye geçti')
  d.esit(t2?.status, 'kapandi', 'PAKSAN kuyruğundan çıktı')
  d.esit(t2?.bayi?.id, BAYI.atanmis, 'bayi kaydı yazıldı')

  d.esit(t2?.masa, null, 'hiçbir masada beklemiyor')

  /* ÖLÇÜLDÜ: `rolunTalepleri` türe VE masaya bakıyor (veri.js:138), duruma
     değil — kapanmış bir teklif talebi satış rolünün listesinde kalmaya
     devam ediyor, ekran durumu ayrıca süzüyor. O yüzden "satıştan düştü"
     diye bir iddia yanlış olurdu. Doğru iddia şu: talep türü kendi
     masasının dışına SIZMIYOR. */
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

  /* ASIL İDDİA: "Bayide" bir DURUM DEĞİL, türetilmiş bir etikettir.
     Biri gerçek bir durum eklerse ikinci bir doğruluk kaynağı doğar ve
     `sahip`/`bayi` ile durum birbirinden ayrılabilir. */
  const durumIdleri = m.veri.DURUMLAR.map((x) => x.id)
  d.yanlis(durumIdleri.includes('Bayide'), 'DURUMLAR içinde "Bayide" diye bir durum yok')
  d.yanlis(durumIdleri.includes('bayide'), 'DURUMLAR içinde "bayide" diye bir durum yok')

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

export const SENARYOLAR = [AK01, AK02, AK03, AK04, AK05, AK06, AK07, AK08, AK09, AK10, AK11, AK12, AK13, AK14]
