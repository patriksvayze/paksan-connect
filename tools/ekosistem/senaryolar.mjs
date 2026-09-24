/* ==========================================================================
   Ekosistem senaryoları — AK-01 … AK-27

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

import { defter, depoTemizle, modulYukle, saat } from './ortam.mjs'
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

/* SERVİSE BAKİYE (24 Eylül 2026). Bakiyeden ödenen sipariş artık
   servisin kullanılabilir bakiyesi yetmezse reddediliyor (veri.js →
   bakiyeDurumu). Bakiye siparişi veren senaryo önce bakiye yüklüyor;
   yükleme bir alacak hareketi, bu yüzden cariyi sayan iddialar yalnız
   borç hareketlerine bakıyor (`borcHareketleri`). */
function bakiyeYukle(m, tutar = 1000000) {
  m.veri.cariHareketEkle({
    servisId: SERVIS.id,
    servisAd: SERVIS.ad,
    tur: 'alacak',
    tutar,
    aciklama: 'sınama bakiyesi',
    personel: 'Sınama Yöneticisi',
  })
}

function borcHareketleri(m) {
  return m.veri.cariHareketleri(SERVIS.id).filter((h) => h.tur === 'borc')
}

/** Garanti kaydının bitmiş hâli. */
function bitmisKayit(ek = {}) {
  return {
    asama: 'bitti',
    kapi: 'garanti',
    yapilanIs: 'Ayar Yapıldı',
    parcalar: [],
    km: 40,
    /* İşçilik 22 Eylül 2026'dan beri süreyle yazılıyor; Servisim'in
       yazdığı üç alan (bkz. lib/servisKaydi.js → iscilikAlanlari). */
    iscilikSaat: 5,
    saatUcreti: 50,
    iscilik: 250,
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
  const { urunId, kisi, makineler } = dunyaKur(m)

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

  /* MAKİNE BAŞINA SERVİS (22 Eylül 2026). Sınama müşterisinin üç makinesi
     var: birine PAKSAN servis atamış, birine satan bayinin servisi
     bakıyor, birinin servisi yok. Connect'in ana ekranı ve servis talebi
     formu bu gruplamadan okuyor; önce yalnız İLK bulunan servis
     gösteriliyordu ve ikinci servis ekranda hiç çıkmıyordu. */
  const g = m.servisAtama.servisGruplari(makineler)
  d.esit(g.gruplar.length, 2, 'iki makineye bakan iki servis, iki ayrı grup')
  d.esit(
    g.gruplar.map((x) => x.servis.id).join(','),
    `${SERVIS.id},${BAYI_SERVISI}`,
    'her grubun servisi o makinenin kendi servisi',
  )
  d.esit(
    g.gruplar.map((x) => x.makineler.map((k) => k.id).join('+')).join(','),
    'mk-atanmis,mk-bayili',
    'her grup yalnız kendi makinesini taşıyor',
  )
  d.esit(g.atanmamis.map((k) => k.id).join(','), 'mk-sahipsiz', 'servisi olmayan makine ayrı listede')

  /* İkinci makinenin talebi ikinci servise, servisi olmayanınki hiçbir
     servise düşmüyor (Connect o makine için talebi göndermiyor). */
  const ikinci = m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[1]), kisi)
  d.esit(ikinci.servis?.id, BAYI_SERVISI, 'ikinci makinenin talebi kendi servisine düşüyor')
  const ucuncu = m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[2]), kisi)
  d.esit(ucuncu.servis, null, 'servisi olmayan makinenin talebine servis uydurulmuyor')

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
    bakiyeYukle(m)
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
    const hareketler = borcHareketleri(m)
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
  bakiyeYukle(m)
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
  d.esit(borcHareketleri(m).length, 0, 'tutarsız siparişte sıfırlık hareket yazılmıyor')

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

  /* BÖLGE, MAKİNE VE SERVİS İKİ TARAFA DA (23 Eylül 2026, kullanıcının
     isteği). Makineye bakan servis uygulamanın kendi zincirinden
     (servisAtama.js) geliyor; Connect ve Servisim de süzgece aynı
     yardımcılarla bağlam veriyor. Dünya: müşterinin üç makinesi — biri
     Selçuk servisine atanmış, biri Ankara bayisi üzerinden Ankara
     servisinde, biri servissiz; üçü de aynı modelde. */
  const urunId = makineler[0].productId
  const baskaModel = m.marka.PRODUCTS.find((p) => p.id !== urunId).id
  const servisli = m.servisAtama.makinelereServisEkle(makineler)
  const yayinla = (hedef) => {
    m.veri.duyuruYayinla({ tur: 'uyari', baslik: 'Hedefli', metin: 'Hedef sınaması', hedef }, 'Sınama Yöneticisi')
    return m.veri.duyurulariGetir()[0]
  }
  const musteriGorur = (dy, liste = servisli) =>
    m.duyuruHedef.duyuruGecerliMi(dy, { user: MUSTERI, makineler: liste, servis: null })
  const servisGorur = (dy, servisId) =>
    m.duyuruHedef.duyuruGecerliMi(dy, m.servisAtama.servisDuyuruBaglami({ ...SERVIS, servisId }))

  const ankaraServisine = yayinla({ kime: 'musteri', servisler: [BAYI_SERVISI] })
  d.dogru(musteriGorur(ankaraServisine), 'servis seçilmiş duyuru, makinesine o servis bakan müşteriye gidiyor')
  d.yanlis(
    musteriGorur(ankaraServisine, servisli.filter((x) => x.serial === SERI.sahipsiz)),
    'makinesine o servis bakmayan müşteriye gitmiyor',
  )

  /* Makine ve servis AYNI makinede aranıyor: Selçuk servisinin baktığı
     makine başka modelde değil. */
  const selcukBaskaModel = yayinla({ kime: 'musteri', servisler: [SERVIS.id], urunler: [baskaModel] })
  d.yanlis(musteriGorur(selcukBaskaModel), 'servis ve model iki ayrı makineden sağlanınca duyuru gitmiyor')

  const modele = yayinla({ kime: 'servis', urunler: [urunId] })
  d.dogru(servisGorur(modele, SERVIS.id), 'model seçilmiş duyuru, o modelde makineye bakan servise gidiyor')
  const baskaModele = yayinla({ kime: 'servis', urunler: [baskaModel] })
  d.yanlis(servisGorur(baskaModele, SERVIS.id), 'o modelde makineye bakmayan servise gitmiyor')

  const seriye = yayinla({ kime: 'servis', seriler: [SERI.bayili] })
  d.yanlis(servisGorur(seriye, SERVIS.id), 'seri seçilmiş duyuru, o makineye bakmayan servise gitmiyor')
  d.dogru(servisGorur(seriye, BAYI_SERVISI), 'o makineye bayi üzerinden bakan servise gidiyor')

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

/* ========================================================== AK-19 */

/* KATALOG DEĞİŞİNCE GEÇMİŞ İŞLEM DEĞİŞMİYOR.

   KULLANICININ KARARI (22 Eylül 2026): "İleride yedek parça kataloğunun
   değişmesi halinde geçmiş işlemlerdeki yedek parça kodları, isimleri
   ve görselleri değişmemeli." Kod, ad ve tutar zaten kaydın içine o
   günün hâliyle yazılıyordu; görsel ise ekranlarda bugünkü katalogtan
   bulunuyordu. Artık parça satırı o günkü görselin dosya adını taşıyor
   (lib/parcaKatalogu.js → fiyatGoruntusu, servis/ekranlar/ParcaSec.jsx)
   ve sunucu o dosyayı ne eziyor ne siliyor
   (sunucu-taklidi/fiyat-listesi-yayini.mjs; onu
   tools/fiyat-listesi-okuma-sinamasi.mjs sınıyor).

   Bu senaryo üç yolu koşturuyor — Connect'in parça talebi, Servisim'in
   servis kaydı, Servisim'in parça siparişi — ve kayıt yazıldıktan sonra
   liste değişince okuyan işlevlerin (talebinParcalari, temizParcalar)
   o günkü kodu, adı ve görseli vermeye devam ettiğini doğruluyor. Asıl
   yakaladığı şey, bu alanı yolda düşüren bir değişiklik: görsel
   satırdan düşerse ekran bugünkü katalogtaki resme döner. */
export async function AK19(m) {
  const d = defter('AK-19', 'Katalog değişince geçmiş işlem değişmiyor')
  depoTemizle()
  const { urunId, kisi, makineler } = dunyaKur(m)
  const pk = await modulYukle('/src/lib/parcaKatalogu.js')

  const TEMMUZ = {
    surum: 1,
    kaynak: 'temmuz.pdf',
    parcalar: [
      { kod: 'PRC-1', ad: 'Rulman', fiyat: 100, grup: 'g', gorsel: 'PRC-1.webp' },
      { kod: 'PRC-2', ad: 'Kayış', fiyat: 50, grup: 'g', gorsel: null },
    ],
  }
  /* Yeni liste: aynı kodlar; ad, fiyat ve resim değişti, resmi
     olmayan parçaya resim geldi. */
  const EKIM = {
    surum: 2,
    kaynak: 'ekim.pdf',
    parcalar: [
      { kod: 'PRC-1', ad: 'Rulman 6204', fiyat: 180, grup: 'g', gorsel: 'PRC-1.1a2b3c4d.webp' },
      { kod: 'PRC-2', ad: 'Kayış A42', fiyat: 70, grup: 'g', gorsel: 'PRC-2.webp' },
    ],
  }
  const secim = [{ kod: 'PRC-1', adet: 2 }, { kod: 'PRC-2', adet: 1 }]

  /* 1 · Connect: müşteri Temmuz listesinden parça istiyor. */
  const talep = talebiYaz(
    m,
    m.talepOlustur.talepKaydiOlustur(
      talepVerisi('parca', urunId, makineler[0], {
        parcalar: ['Rulman', 'Kayış'],
        parcaFiyat: pk.fiyatGoruntusu(TEMMUZ, secim),
      }),
      kisi,
    ),
  )

  /* 2 · Servisim: servis kaydında Temmuz listesinden iki parça
     (ParcaSec.jsx → bitir()'in yazdığı satır biçimi). */
  const servisTalebi = talebiYaz(
    m,
    m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi),
  )
  const secilen = TEMMUZ.parcalar.map((p) => ({
    kod: p.kod, ad: p.ad, fiyat: p.fiyat, gorsel: p.gorsel ?? null, adet: 1,
  }))
  const gonder = m.veri.servisKaydiGonder(servisTalebi, bitmisKayit({ parcalar: secilen }), SERVIS.ad)
  d.esit(gonder?.hata, undefined, 'servis kaydı parçalarla kabul edildi')

  /* 3 · Servisim: Temmuz listesinden parça siparişi
     (SiparisVer.jsx'in kurduğu görüntü). */
  bakiyeYukle(m)
  const siparis = m.veri.servisParcaSiparisi({
    servisId: SERVIS.id,
    servisAd: SERVIS.ad,
    servisNo: SERVIS.no,
    servisTel: '3323450014',
    il: SERVIS.il,
    ilce: 'Selçuklu',
    kalemler: [{ kod: 'PRC-1', ad: 'Rulman', adet: 1 }],
    parcaFiyat: {
      surum: 1,
      kaynak: 'temmuz.pdf',
      satirlar: [{ kod: 'PRC-1', ad: 'Rulman', gorsel: 'PRC-1.webp', adet: 1, birimFiyat: 80, tutar: 80 }],
      araToplam: 80,
      kdv: 16,
      toplam: 96,
      eksikFiyat: false,
    },
    not: '',
    teslimat: { ...ADRES },
    odeme: 'bakiye',
  })
  d.esit(siparis?.hata, undefined, 'parça siparişi kabul edildi')

  /* 4 · Liste değişti. Yeni talep yeni listeyi alıyor — değişikliğin
     gerçekten görünür olduğunu gösteren kontrol. */
  const ekimGoruntusu = pk.fiyatGoruntusu(EKIM, secim)
  d.esit(ekimGoruntusu.satirlar[0].gorsel, 'PRC-1.1a2b3c4d.webp', 'yeni talep yeni listenin görselini alıyor')
  d.esit(ekimGoruntusu.satirlar[0].ad, 'Rulman 6204', 'yeni talep yeni listenin adını alıyor')

  /* 5 · Geçmiş parça talebi: kod, ad, görsel, tutar o günkü. */
  const t = m.servisKaydi.talebinParcalari(bul(m, talep.id))
  d.esit(t[0]?.kod, 'PRC-1', 'parça talebinde kod o günkü')
  d.esit(t[0]?.ad, 'Rulman', 'parça talebinde ad o günkü')
  d.esit(t[0]?.gorsel, 'PRC-1.webp', 'parça talebinde görsel o günkü dosya')
  d.esit(t[0]?.tutar, 200, 'parça talebinde tutar o günkü')
  d.esit(t[1]?.gorsel, null, 'o gün görseli olmayan parçaya yeni listenin resmi taşınmadı')
  d.esit(bul(m, talep.id)?.parcaFiyat?.surum, 1, 'görüntü hangi listeden alındığını söylüyor')

  /* 6 · Geçmiş servis kaydı: backoffice'in kayıt kartı, Servisim'in
     talep ekranı ve hak ediş yaprağı bu okumadan geçiyor. */
  const k = m.servisKaydi.temizParcalar(bul(m, servisTalebi.id)?.servisKaydi?.parcalar)
  d.esit(k.length, 2, 'servis kaydında iki parça')
  d.esit(k[0]?.ad, 'Rulman', 'servis kaydında ad o günkü')
  d.esit(k[0]?.gorsel, 'PRC-1.webp', 'servis kaydında görsel o günkü dosya')
  d.esit(k[1]?.gorsel, null, 'servis kaydında görselsiz parça görselsiz kaldı')

  /* 7 · Geçmiş parça siparişi: Servisim'in Parça sekmesi ve
     backoffice'in talep detayı bu okumadan geçiyor. */
  const s = m.servisKaydi.talebinParcalari(bul(m, siparis?.talep?.id || siparis?.id))
  d.esit(s[0]?.gorsel, 'PRC-1.webp', 'parça siparişinde görsel o günkü dosya')
  d.esit(s[0]?.ad, 'Rulman', 'parça siparişinde ad o günkü')

  return d
}

/* ========================================================== AK-20 */

/* İŞÇİLİK SÜREYLE HESAPLANIYOR.

   KULLANICININ KARARI (22 Eylül 2026): "İşçilik tutarı yerine saat başı
   ücret ile hesaplanacak bir hesaplama gelsin. Servis personeli talep
   için harcadığı süreyi girecek, bu süre sabit bir çarpan ile
   çarpılacak." Servisim süreyi, o günün saat ücretini ve tutarı kayda
   yazıyor (lib/servisKaydi.js → iscilikAlanlari); hak ediş, cari ve
   rapor tutarı okumaya devam ediyor.

   Senaryonun taşıdığı dört şey:
     1  hak ediş süre × ücretten doğuyor ve cariye o tutar yazılıyor
     2  tarife sonradan değişse de gönderilmiş kaydın tutarı değişmiyor
        (kayıt kendi ücretini taşıyor — AK-19'daki ilkenin parası)
     3  PAKSAN süreyi düzeltince tutar yeniden hesaplanıyor, düzeltme
        satırı eski ve yeni süreyi taşıyor, servise bildirim gidiyor
     4  süresi olmayan ESKİ kayıt servisin yazdığı tutarla okunuyor */
export function AK20(m) {
  const d = defter('AK-20', 'İşçilik süreyle hesaplanıyor')
  depoTemizle()
  const { urunId, kisi, makineler } = dunyaKur(m)
  const sk = m.servisKaydi
  const ucret = sk.TARIFE.iscilikSaat

  /* 1 · Servis 2,5 saat yazıyor. */
  const r = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi))
  const kayit = bitmisKayit({ km: 10, iscilikSaat: undefined, saatUcreti: undefined, iscilik: undefined, ...sk.iscilikAlanlari('2,5') })
  d.esit(kayit.iscilikSaat, 2.5, 'virgüllü süre sayıya çevrildi')
  d.esit(kayit.saatUcreti, ucret, 'kayda bugünün saat ücreti yazıldı')
  d.esit(sk.kaydiDogrula(kayit), null, 'süreli kayıt doğrulamadan geçiyor')

  const sonuc = m.veri.servisKaydiGonder(r, kayit, SERVIS.ad)
  d.esit(sonuc?.hata, undefined, 'kayıt hatasız kabul edildi')
  const t1 = bul(m, r.id)
  const beklenenIscilik = Math.round(2.5 * ucret)
  d.esit(t1?.servisKaydi?.iscilikSaat, 2.5, 'depodaki kayıtta süre duruyor')
  d.esit(t1?.servisKaydi?.saatUcreti, ucret, 'depodaki kayıtta ücret duruyor')
  d.esit(t1?.hakkedis?.iscilik, beklenenIscilik, 'hak ediş işçiliği süre × ücret')
  d.esit(t1?.hakkedis?.toplam, 10 * sk.TARIFE.yolKm + beklenenIscilik, 'hak ediş toplamı yol + işçilik')
  d.dogru(
    (t1?.hakkedis?.kalemler || []).some((k) => k.ad === 'İşçilik · 2,5 saat' && k.tutar === beklenenIscilik),
    'kalem satırı süreyi yazıyor',
  )

  /* 2 · Tarife değişiyor; gönderilmiş kaydın tutarı değişmiyor. */
  const eskiUcret = sk.TARIFE.iscilikSaat
  sk.TARIFE.iscilikSaat = eskiUcret + 30
  try {
    d.esit(sk.hakkedisHesapla(bul(m, r.id).servisKaydi).iscilik, beklenenIscilik, 'tarife değişince eski kaydın işçiliği aynı')
    d.esit(sk.iscilikAlanlari(1).saatUcreti, eskiUcret + 30, 'yeni kayıt yeni ücreti alıyor')
  } finally {
    sk.TARIFE.iscilikSaat = eskiUcret
  }

  /* 3 · PAKSAN süreyi 1 saate düzeltiyor. */
  const t2 = bul(m, r.id)
  const duz = m.veri.hakkedisDuzelt(
    t2,
    { ...t2.servisKaydi, ...sk.iscilikAlanlari(1, t2.servisKaydi.saatUcreti) },
    'Süre fazla yazılmış',
    'Sınama Yöneticisi',
  )
  d.esit(duz?.hata, undefined, 'düzeltme kabul edildi')
  const t3 = bul(m, r.id)
  d.esit(t3?.hakkedis?.iscilik, ucret, 'düzeltilen hak ediş yeni süreden')
  d.esit(t3?.servisKaydi?.iscilikSaat, 1, 'kayıttaki süre düzeltildi')
  const satir = (t3?.servisKaydi?.duzeltmeler || [])[0]
  d.esit(satir?.onceki?.iscilikSaat, 2.5, 'düzeltme satırında eski süre')
  d.esit(satir?.yeni?.iscilikSaat, 1, 'düzeltme satırında yeni süre')
  d.esit(
    sk.duzeltmeYazisi(satir),
    'Yol 10 km → 10 km · İşçilik 2,5 saat → 1 saat',
    "servisin ve PAKSAN'ın gördüğü düzeltme satırı",
  )
  d.dogru(servisBildirimleriDepodan(m).some((x) => x.talepNo === r.no), 'düzeltme servise bildirildi')

  m.veri.hakkedisOnayla(t3, 'Sınama Yöneticisi')
  d.esit(m.veri.cariBakiye(SERVIS.id), 10 * sk.TARIFE.yolKm + ucret, 'cariye düzeltilmiş tutar yazıldı')

  /* 4 · Süresi olmayan eski kayıt. */
  const eski = { kapi: 'garanti', asama: 'bitti', yapilanIs: 'Ayar Yapıldı', parcalar: [], km: 0, iscilik: 700 }
  d.esit(sk.hakkedisHesapla(eski).iscilik, 700, 'eski kayıtta servisin yazdığı tutar')
  d.esit(sk.iscilikYazisi(eski), sk.iscilikYazisi({ iscilik: 700 }), 'eski kayıt süresiz yazılıyor')
  d.esit(
    sk.kaydiDogrula({ ...eski, iscilik: 0, ...sk.iscilikAlanlari('') }),
    'Gidilen yolu ya da işçilik süresini yazın.',
    'süre de yol da yoksa kayıt geçmiyor',
  )

  return d
}

/* ========================================================== AK-21 */

/* SERVİS HİZMET ÜCRETİ BACKOFFICE'TEN DEĞİŞİYOR.

   KULLANICININ İSTEĞİ (23 Eylül 2026): km ve saat ücreti backoffice'ten
   genel, makineye göre ve servise özel olarak değişebilsin; genel ücret
   değişirken özel ücretli servisler varsa "onlar da değişsin mi" diye
   sorulsun; Servisim güncel ücreti görsün (lib/servisTarifesi.js,
   veri.js → genelTarifeyiKaydet, servisTarifesiniKaydet).

   Senaryonun taşıdığı beş şey:
     1  kayıt gönderildiği günün km ve saat ücretini taşıyor; tarife
        sonra değişse de hak edişi değişmiyor, PAKSAN'ın düzeltmesi de
        kaydın kendi ücretiyle hesaplanıyor
     2  katman sırası: servis+makine > servis > genel+makine > genel,
        kalem kalem
     3  "özel ücretler de değişsin" yalnız DEĞİŞEN kalemin özel ücretini
        kaldırıyor; "değişmesin" hiçbirine dokunmuyor
     4  bildirim yalnız ücreti GERÇEKTEN değişen servise gidiyor ve
        müşterinin bildirimlerine sızmıyor
     5  hak edişin km kalemi kaydın km ücretiyle — sabit tarifeyle değil
     6  servisin onay penceresinde gördüğü ücret geçiyor: PAKSAN ücreti
        o sırada değiştirse de kayıt onu taşıyor; okuma anı 30
        dakikadan eskiyse ve ücret değiştiyse kayıt gönderilmiyor
        (24 Eylül 2026, "sipariş verildiği zamanki tutar") */
export function AK21(m) {
  const d = defter('AK-21', 'Servis hizmet ücreti backoffice\'ten değişiyor')
  depoTemizle()
  const { urunId, kisi, makineler } = dunyaKur(m)
  const sk = m.servisKaydi
  const baslangic = { ...sk.TARIFE }
  const baskaUrun = m.marka.PRODUCTS.find((p) => p.id !== urunId).id
  const tarifeBildirimleri = (servisId) =>
    servisBildirimleriDepodan(m).filter((x) => x.olay === 'tarife' && x.servisId === servisId)

  /* 0 · Hiçbir şey yazılmamış: başlangıç tarifesi. */
  const t0 = m.veri.servisinTarifesi(SERVIS.id, urunId)
  d.esit(t0.yolKm, baslangic.yolKm, 'yazılmamış tarifede km ücreti başlangıç değeri')
  d.esit(t0.iscilikSaat, baslangic.iscilikSaat, 'yazılmamış tarifede saat ücreti başlangıç değeri')
  d.esit(t0.kaynak.iscilikSaat, 'genel', 'kaynak genel')

  /* 1 · Genel tarife değişiyor; özel ücretli servis yok. */
  const g1 = m.veri.genelTarifeyiKaydet({ yolKm: 14, iscilikSaat: 60 }, {}, 'Sınama Yöneticisi')
  d.esit(g1?.hata, undefined, 'genel tarife kabul edildi')
  d.dogru(g1.bildirilen >= 2, 'bütün servislere bildirim gitti')
  const b1 = tarifeBildirimleri(SERVIS.id)
  d.esit(b1.length, 1, 'servise tek tarife bildirimi')
  d.esit(b1[0]?.degerler?.yolKm?.once, baslangic.yolKm, 'bildirimde eski km ücreti')
  d.esit(b1[0]?.degerler?.yolKm?.simdi, 14, 'bildirimde yeni km ücreti')
  d.esit(b1[0]?.tur, 'hesap', 'bildirim talebe bağlı değil (hesap)')
  d.esit(b1[0]?.talepId, undefined, 'bildirimde talep kimliği yok')
  d.esit(kisiselBildirimler(m).length, 0, 'ücret bildirimi müşteriye sızmadı')
  d.dogru(m.veri.islemKaydiGetir().some((x) => x.tur === 'tarife'), 'işlem kaydına tarife satırı yazıldı')

  /* 2 · Okuma anını taşımayan (eski) çağrı: güncel ücret kayda
     yazılıyor. Bugünkü Servisim okuma anını taşıyor (bkz. 11). */
  const r = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi))
  const gonder = m.veri.servisKaydiGonder(
    r,
    bitmisKayit({ km: 10, kmUcreti: 1, ...sk.iscilikAlanlari(2, 1) }),
    SERVIS.ad,
  )
  d.esit(gonder?.hata, undefined, 'kayıt kabul edildi')
  const k1 = bul(m, r.id)
  d.esit(k1?.servisKaydi?.kmUcreti, 14, 'kayda güncel km ücreti yazıldı (ekranın eski ücreti değil)')
  d.esit(k1?.servisKaydi?.saatUcreti, 60, 'kayda güncel saat ücreti yazıldı')
  d.esit(k1?.hakkedis?.toplam, 10 * 14 + 2 * 60, 'hak ediş güncel ücretlerle')

  /* 3 · Tarife yeniden değişiyor; gönderilmiş kayıt değişmiyor. */
  m.veri.genelTarifeyiKaydet({ yolKm: 20, iscilikSaat: 60 }, {}, 'Sınama Yöneticisi')
  d.esit(sk.hakkedisHesapla(bul(m, r.id).servisKaydi).toplam, 260, 'tarife değişince eski kaydın hak edişi aynı')
  d.esit(sk.hakkedisHesapla({ kapi: 'garanti', km: 10, iscilik: 0 }).yol, 10 * baslangic.yolKm, 'km ücreti olmayan eski kayıt başlangıç ücretiyle')
  const k2 = bul(m, r.id)
  const duz = m.veri.hakkedisDuzelt(k2, { ...k2.servisKaydi, km: 20 }, 'Yol eksik yazılmış', 'Sınama Yöneticisi')
  d.esit(duz?.hata, undefined, 'düzeltme kabul edildi')
  d.esit(bul(m, r.id)?.hakkedis?.yol, 20 * 14, 'düzeltme kaydın kendi km ücretiyle (bugünkü 20 değil)')

  /* 4 · Servise özel saat ücreti. */
  const oncekiBildirim = tarifeBildirimleri(BAYI_SERVISI).length
  m.veri.servisTarifesiniKaydet(SERVIS.id, { iscilikSaat: 70 }, 'Sınama Yöneticisi')
  const t4 = m.veri.servisinTarifesi(SERVIS.id, urunId)
  d.esit(t4.iscilikSaat, 70, 'servise özel saat ücreti geçerli')
  d.esit(t4.kaynak.iscilikSaat, 'servis', 'kaynak servis')
  d.esit(t4.yolKm, 20, 'yazılmayan km ücreti genelden')
  d.esit(t4.kaynak.yolKm, 'genel', 'km kaynağı genel')
  d.esit(m.veri.servisinTarifesi(BAYI_SERVISI, urunId).iscilikSaat, 60, 'öteki servis genel ücrette')
  d.esit(tarifeBildirimleri(BAYI_SERVISI).length, oncekiBildirim, 'özel ücret öteki servise bildirilmedi')

  /* 5 · Makineye göre genel satır: özel ücreti olmayan servise geçiyor,
     özel ücreti olana geçmiyor (servis katmanı önde). */
  const servisOnce = tarifeBildirimleri(SERVIS.id).length
  const bayiOnce = tarifeBildirimleri(BAYI_SERVISI).length
  m.veri.genelTarifeyiKaydet(
    { yolKm: 20, iscilikSaat: 60, modeller: { [urunId]: { iscilikSaat: 90 } } },
    {},
    'Sınama Yöneticisi',
  )
  const t5b = m.veri.servisinTarifesi(BAYI_SERVISI, urunId)
  d.esit(t5b.iscilikSaat, 90, 'makineye göre genel ücret özel ücreti olmayan serviste geçerli')
  d.esit(t5b.kaynak.iscilikSaat, 'makine', 'kaynak makine')
  d.esit(m.veri.servisinTarifesi(BAYI_SERVISI, baskaUrun).iscilikSaat, 60, 'başka makinede genel ücret')
  d.esit(m.veri.servisinTarifesi(SERVIS.id, urunId).iscilikSaat, 70, 'servise özel ücret makineye göre genel satırın önünde')
  d.esit(tarifeBildirimleri(BAYI_SERVISI).length, bayiOnce + 1, 'makine ücreti değişen servise bildirildi')
  d.dogru(tarifeBildirimleri(BAYI_SERVISI)[0]?.degerler?.makine === true, 'bildirim makinede değişim olduğunu söylüyor')
  d.esit(tarifeBildirimleri(SERVIS.id).length, servisOnce, 'ücreti değişmeyen servise bildirim gitmedi')

  /* 6 · Servisin kendi makineye göre satırı en önde. */
  m.veri.servisTarifesiniKaydet(
    SERVIS.id,
    { yolKm: 25, iscilikSaat: 70, modeller: { [urunId]: { iscilikSaat: 100 } } },
    'Sınama Yöneticisi',
  )
  const t6 = m.veri.servisinTarifesi(SERVIS.id, urunId)
  d.esit(t6.iscilikSaat, 100, 'servis + makine satırı geçerli')
  d.esit(t6.kaynak.iscilikSaat, 'servisMakine', 'kaynak servis + makine')
  d.esit(m.veri.servisinTarifesi(SERVIS.id, baskaUrun).iscilikSaat, 70, 'servisin öteki makinesinde servis ücreti')
  const r2 = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi))
  m.veri.servisKaydiGonder(r2, bitmisKayit({ km: 4, ...sk.iscilikAlanlari(1) }), SERVIS.ad)
  const k6 = bul(m, r2.id)
  d.esit(k6?.servisKaydi?.saatUcreti, 100, 'kayda servis + makine ücreti yazıldı')
  d.esit(k6?.servisKaydi?.kmUcreti, 25, 'kayda servisin özel km ücreti yazıldı')

  /* 7 · Genel saat ücreti değişiyor, "özel ücretler değişmesin". */
  const liste7 = m.servisTarifesi.ozelUcretliServisler(m.veri.hizmetTarifesiGetir(), ['iscilikSaat'])
  d.dogru(liste7.some((x) => x.servisId === SERVIS.id && x.makineli), 'uyarı listesinde özel ücretli servis (makine satırıyla)')
  d.yanlis(liste7.some((x) => x.servisId === BAYI_SERVISI), 'özel ücreti olmayan servis uyarı listesinde yok')
  m.veri.genelTarifeyiKaydet({ yolKm: 20, iscilikSaat: 65, modeller: { [urunId]: { iscilikSaat: 90 } } }, { ozelleriDegistir: false }, 'Sınama Yöneticisi')
  d.esit(m.veri.servisinTarifesi(SERVIS.id, baskaUrun).iscilikSaat, 70, '"değişmesin": özel saat ücreti yerinde')
  d.esit(m.veri.servisinTarifesi(BAYI_SERVISI, baskaUrun).iscilikSaat, 65, '"değişmesin": özel ücreti olmayan servis yeni ücrette')

  /* 8 · Genel saat ücreti değişiyor, "özel ücretler de değişsin". Yalnız
     değişen kalemin (saat) özel ücreti kalkıyor; özel km ücreti kalıyor. */
  m.veri.genelTarifeyiKaydet({ yolKm: 20, iscilikSaat: 66, modeller: { [urunId]: { iscilikSaat: 90 } } }, { ozelleriDegistir: true }, 'Sınama Yöneticisi')
  const t8 = m.veri.servisinTarifesi(SERVIS.id, baskaUrun)
  d.esit(t8.iscilikSaat, 66, '"değişsin": özel saat ücreti kalktı, genel geçerli')
  d.esit(t8.yolKm, 25, '"değişsin": değişmeyen kalemin özel ücreti (km) yerinde')
  d.esit(m.veri.servisinTarifesi(SERVIS.id, urunId).iscilikSaat, 90, '"değişsin": servisin makine satırı da kalktı, genel makine ücreti geçerli')
  d.esit(
    m.servisTarifesi.ozelUcretliServisler(m.veri.hizmetTarifesiGetir(), ['iscilikSaat']).length,
    0,
    'saat ücretinde özel ücretli servis kalmadı',
  )

  /* 9 · Öteki serviste makineye göre km ücreti: genel makine satırının
     km'si ve servisin kendi makine satırı. */
  m.veri.genelTarifeyiKaydet(
    { yolKm: 20, iscilikSaat: 66, modeller: { [urunId]: { iscilikSaat: 90, yolKm: 22 } } },
    {},
    'Sınama Yöneticisi',
  )
  m.veri.servisTarifesiniKaydet(
    BAYI_SERVISI,
    { iscilikSaat: 55, modeller: { [baskaUrun]: { yolKm: 30, iscilikSaat: 75 } } },
    'Sınama Yöneticisi',
  )
  d.esit(m.veri.servisinTarifesi(BAYI_SERVISI, urunId).yolKm, 22, 'servisin özel km ücreti yoksa genel makine km ücreti')
  d.esit(m.veri.servisinTarifesi(BAYI_SERVISI, urunId).iscilikSaat, 55, 'servisin özel saat ücreti genel makine satırının önünde')
  d.esit(m.veri.servisinTarifesi(BAYI_SERVISI, baskaUrun).yolKm, 30, 'servisin makine satırındaki km ücreti')
  d.esit(
    m.servisTarifesi.makineFarklari(m.veri.hizmetTarifesiGetir(), BAYI_SERVISI).length,
    2,
    'Servisim iki makinede farklı ücret gösteriyor',
  )

  /* 10 · Geçersiz ücret kabul edilmiyor ve hiçbir şey yazılmıyor. */
  const once9 = JSON.stringify(m.veri.hizmetTarifesiGetir())
  d.dogru(Boolean(m.veri.genelTarifeyiKaydet({ yolKm: '', iscilikSaat: 66 }, {}, 'Sınama Yöneticisi')?.hata), 'boş km ücreti reddedildi')
  d.esit(JSON.stringify(m.veri.hizmetTarifesiGetir()), once9, 'reddedilen kayıt tarifeye dokunmadı')

  /* 11 · Onayda görülen ücret geçiyor (24 Eylül 2026, kullanıcının
     kararı). Servis onay penceresini açtı ve ücreti okudu; PAKSAN tam
     o sırada servisin ücretini değiştirdi. Okuma anı tazeyse kayıt
     servisin GÖRDÜĞÜ ücreti taşıyor; 30 dakikadan eskiyse ya da ücret o
     anda hiç geçerli olmamışsa kayıt gönderilmiyor ve talebe hiçbir
     şey yazılmıyor. Ücret bugünküyle aynıysa okuma anının yaşı önemli
     değil. */
  const okuma = saat.simdi()
  const gorulen = m.veri.servisinTarifesi(SERVIS.id, urunId)
  const artir = { yolKm: gorulen.yolKm + 3, iscilikSaat: gorulen.iscilikSaat + 5 }
  m.veri.servisTarifesiniKaydet(SERVIS.id, { ...artir, modeller: { [urunId]: artir } }, 'Sınama Yöneticisi')
  const guncel = m.veri.servisinTarifesi(SERVIS.id, urunId)
  d.dogru(
    guncel.yolKm !== gorulen.yolKm && guncel.iscilikSaat !== gorulen.iscilikSaat,
    'ücret servis okuduktan sonra değişti (iki kalem de)',
  )
  const yeniTalep = () =>
    talebiYaz(m, m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi))
  const gonderUcretle = (talep, ucret, zaman) =>
    m.veri.servisKaydiGonder(
      talep,
      bitmisKayit({
        km: 10,
        kmUcreti: ucret.yolKm,
        ...sk.iscilikAlanlari(2, ucret.iscilikSaat),
        ucretZamani: zaman,
      }),
      SERVIS.ad,
    )
  const r11 = yeniTalep()
  const g11 = gonderUcretle(r11, gorulen, okuma)
  d.esit(g11?.hata, undefined, 'taze onaydaki eski ücretle kayıt kabul edildi')
  const k11 = bul(m, r11.id)
  d.esit(k11?.servisKaydi?.kmUcreti, gorulen.yolKm, 'kayıt servisin gördüğü km ücretini taşıyor')
  d.esit(k11?.servisKaydi?.saatUcreti, gorulen.iscilikSaat, 'kayıt servisin gördüğü saat ücretini taşıyor')
  d.esit(k11?.hakkedis?.toplam, 10 * gorulen.yolKm + 2 * gorulen.iscilikSaat, 'hak ediş onaylanan tutar')
  const r11b = yeniTalep()
  const g11b = gonderUcretle(r11b, gorulen, saat.simdi() - 31 * 60 * 1000)
  d.dogru(Boolean(g11b?.hata), '30 dakikadan eski onaydaki eski ücret reddedildi')
  d.esit(g11b?.ucretDegisti, true, 'ret sebebi ücret değişikliği')
  const g11u = gonderUcretle(r11b, { yolKm: 999, iscilikSaat: 999 }, saat.simdi())
  d.esit(g11u?.ucretDegisti, true, 'taze okuma anıyla gelen, hiç geçerli olmamış ücret reddedildi')
  const g11k = gonderUcretle(r11b, { yolKm: 999, iscilikSaat: gorulen.iscilikSaat }, okuma)
  d.esit(g11k?.ucretDegisti, true, 'yalnız km ücreti o anda geçerli değilse de reddedildi')
  const g11s = gonderUcretle(r11b, { yolKm: gorulen.yolKm, iscilikSaat: 999 }, okuma)
  d.esit(g11s?.ucretDegisti, true, 'yalnız saat ücreti o anda geçerli değilse de reddedildi')
  d.esit(bul(m, r11b.id)?.servisKaydi, undefined, 'reddedilen kayıtlar talebe yazılmadı')
  const g11c = gonderUcretle(r11b, guncel, saat.simdi() - 31 * 60 * 1000)
  d.esit(g11c?.hata, undefined, 'eski onay ama ücret aynı: kayıt kabul edildi')
  d.esit(bul(m, r11b.id)?.servisKaydi?.kmUcreti, guncel.yolKm, 'kayıt güncel ücreti taşıyor')

  return d
}

/* ========================================================== AK-22 */

/* SERVİS PARÇA İSKONTOSU BACKOFFICE'TEN DEĞİŞİYOR.

   KULLANICININ İSTEĞİ (23 Eylül 2026): servislere genel ya da servise
   özel iskonto; oran Servisim'in sipariş özetinde görünsün, değişince
   servise bildirim gitsin (lib/servisFiyat.js → iskontoCoz, veri.js →
   genelIskontoyuKaydet, servisIskontosunuKaydet, servisParcaSiparisi).

   Senaryonun taşıdığı dört şey:
     1  servise özel oran genelin önünde
     2  sipariş o günkü oranı taşıyor ve oran sonra değişse de kendi
        oranıyla kalıyor
     3  servisin onay penceresinde gördüğü oran geçiyor: PAKSAN oranı
        o sırada değiştirse de sipariş kabul ediliyor ve gördüğü oranı
        taşıyor; okuma anı 30 dakikadan eski (ya da hiç yok) ve oran
        değiştiyse reddediliyor ve hiçbir şey yazmıyor (24 Eylül 2026,
        kullanıcının kararı: "sipariş verildiği zamanki tutar")
     4  genel oran değişirken "özel oranlar değişsin mi" cevabı doğru
        uygulanıyor; bildirim yalnız oranı değişen servise gidiyor */
export function AK22(m) {
  const d = defter('AK-22', 'Servis parça iskontosu backoffice\'ten değişiyor')
  depoTemizle()
  dunyaKur(m)
  const baslangic = m.marka.PARCA_SERVIS_ISKONTO
  const iskontoBildirimleri = (servisId) =>
    servisBildirimleriDepodan(m).filter((x) => x.olay === 'iskonto' && x.servisId === servisId)

  /* Servisim'in sipariş ekranının gönderdiği görüntü (SiparisVer.jsx).
     `yas` verilirse görüntü, oranın o kadar önce okunduğunu söyleyen
     `fiyatZamani`nı taşıyor (ekran onay penceresi açılırken okuyor). */
  const siparisVer = (oran, yas) => {
    const f = m.servisFiyat.parcaServisFiyati({ kod: 'PRC-1', ad: 'Rulman', fiyat: 1000 }, oran)
    const adet = 2
    const araToplam = f.alis * adet
    const listeToplam = f.fiyat * adet
    return m.veri.servisParcaSiparisi({
      servisId: SERVIS.id,
      servisAd: SERVIS.ad,
      servisNo: SERVIS.no,
      servisTel: '3323450014',
      il: SERVIS.il,
      ilce: 'Selçuklu',
      kalemler: [{ kod: 'PRC-1', ad: 'Rulman', adet }],
      parcaFiyat: {
        surum: 1,
        kaynak: 'sınama',
        satirlar: [{ kod: 'PRC-1', ad: 'Rulman', adet, listeFiyati: f.fiyat, birimFiyat: f.alis, tutar: araToplam }],
        iskontoOrani: oran,
        ...(yas !== undefined ? { fiyatZamani: saat.simdi() - yas } : {}),
        listeToplam,
        iskontoTutari: listeToplam - araToplam,
        araToplam,
        kdv: m.marka.kdvTutari(araToplam),
        toplam: araToplam + m.marka.kdvTutari(araToplam),
        eksikFiyat: false,
      },
      not: '',
      teslimat: { ...ADRES },
      odeme: 'fatura',
    })
  }

  /* 0 · Başlangıç oranı. */
  const i0 = m.veri.servisinIskontosu(SERVIS.id)
  d.esit(i0.oran, baslangic, 'yazılmamış iskontoda başlangıç oranı')
  d.esit(i0.kaynak, 'genel', 'kaynak genel')
  d.esit(m.servisFiyat.parcaServisFiyati({ kod: 'X', ad: 'X', fiyat: 1000 }, 0.35).alis, 650, 'oranla alış fiyatı')

  /* 1 · Başlangıç oranıyla sipariş. */
  const s1 = siparisVer(baslangic)
  d.esit(s1?.hata, undefined, 'başlangıç oranıyla sipariş kabul edildi')
  const t1 = bul(m, s1?.talep?.id)
  d.esit(t1?.parcaFiyat?.iskontoOrani, baslangic, 'siparişe oran yazıldı')
  d.esit(t1?.parcaFiyat?.listeToplam, 2000, 'siparişte liste fiyatıyla toplam')
  d.esit(t1?.parcaFiyat?.iskontoTutari, 2000 * baslangic, 'siparişte düşülen tutar')
  d.esit(t1?.tutar, 2000 - 2000 * baslangic, 'siparişin tutarı iskontolu')

  /* 2 · Servise özel oran. */
  const oz = m.veri.servisIskontosunuKaydet(SERVIS.id, 35, 'Sınama Yöneticisi')
  d.esit(oz?.hata, undefined, 'özel oran kabul edildi')
  const i2 = m.veri.servisinIskontosu(SERVIS.id)
  d.esit(i2.oran, 0.35, 'servise özel oran geçerli')
  d.esit(i2.kaynak, 'servis', 'kaynak servis')
  d.esit(m.veri.servisinIskontosu(BAYI_SERVISI).oran, baslangic, 'öteki servis genel oranda')
  const b2 = iskontoBildirimleri(SERVIS.id)
  d.esit(b2.length, 1, 'servise iskonto bildirimi gitti')
  d.esit(b2[0]?.degerler?.once, Math.round(baslangic * 100), 'bildirimde eski oran (yüzde)')
  d.esit(b2[0]?.degerler?.simdi, 35, 'bildirimde yeni oran (yüzde)')
  d.esit(iskontoBildirimleri(BAYI_SERVISI).length, 0, 'öteki servise bildirim gitmedi')
  d.esit(kisiselBildirimler(m).length, 0, 'iskonto bildirimi müşteriye sızmadı')

  /* 3 · Onayda görülen oran geçiyor, ama süresiz değil. Oran %35'e
     çıktı; servis onay penceresinde eski oranı (başlangıç) görmüştü. */
  const talepSayisi = m.veri.talepleriGetir().length
  const s3 = siparisVer(baslangic)
  d.dogru(Boolean(s3?.hata), 'okuma anı olmayan eski oranlı sipariş reddedildi')
  d.esit(s3?.iskontoDegisti, true, 'ret sebebi oran değişikliği')
  const s3y = siparisVer(baslangic, 31 * 60 * 1000)
  d.esit(s3y?.iskontoDegisti, true, '30 dakikadan eski onaydaki eski oran reddedildi')
  d.esit(m.veri.talepleriGetir().length, talepSayisi, 'reddedilen siparişler yazılmadı')
  const s3t = siparisVer(baslangic, 5 * 60 * 1000)
  d.esit(s3t?.hata, undefined, 'taze onaydaki eski oranla sipariş kabul edildi')
  const t3 = bul(m, s3t?.talep?.id)
  d.esit(t3?.parcaFiyat?.iskontoOrani, baslangic, 'sipariş servisin gördüğü oranı taşıyor')
  d.esit(t3?.tutar, 2000 - 2000 * baslangic, 'siparişin tutarı onaylanan tutar')
  const s3u = siparisVer(0.9, 60 * 1000)
  d.esit(s3u?.iskontoDegisti, true, 'taze okuma anıyla gelen, hiç geçerli olmamış oran reddedildi')
  const s3b = siparisVer(0.35, 45 * 60 * 1000)
  d.esit(s3b?.hata, undefined, 'güncel oranla sipariş kabul edildi (okuma anının yaşı önemsiz)')

  /* 4 · Genel oran değişiyor, "özel oranlar değişmesin". */
  m.veri.genelIskontoyuKaydet(25, { ozelleriDegistir: false }, 'Sınama Yöneticisi')
  d.esit(m.veri.servisinIskontosu(SERVIS.id).oran, 0.35, '"değişmesin": özel oran yerinde')
  d.esit(m.veri.servisinIskontosu(BAYI_SERVISI).oran, 0.25, '"değişmesin": öteki servis yeni genel oranda')
  d.esit(iskontoBildirimleri(SERVIS.id).length, 1, 'oranı değişmeyen servise yeni bildirim gitmedi')
  d.esit(iskontoBildirimleri(BAYI_SERVISI).length, 1, 'oranı değişen servise bildirim gitti')

  /* 5 · Genel oran değişiyor, "özel oranlar da değişsin". */
  m.veri.genelIskontoyuKaydet(20, { ozelleriDegistir: true }, 'Sınama Yöneticisi')
  d.esit(m.veri.servisinIskontosu(SERVIS.id).oran, 0.2, '"değişsin": özel oran kalktı')
  d.esit(m.veri.servisinIskontosu(SERVIS.id).kaynak, 'genel', '"değişsin": servis genel orana geçti')
  d.esit(iskontoBildirimleri(SERVIS.id)[0]?.degerler?.simdi, 20, 'servise yeni oran bildirildi')

  /* 6 · Verilmiş sipariş kendi oranıyla kalıyor. */
  d.esit(bul(m, s1.talep.id)?.parcaFiyat?.iskontoOrani, baslangic, 'ilk sipariş kendi oranıyla')
  d.esit(bul(m, s3b.talep.id)?.parcaFiyat?.iskontoOrani, 0.35, 'özel oranlı sipariş kendi oranıyla')

  /* 7 · Öteki servise özel oran; genel orana dönüş. */
  m.veri.servisIskontosunuKaydet(BAYI_SERVISI, 15, 'Sınama Yöneticisi')
  d.esit(m.veri.servisinIskontosu(BAYI_SERVISI).oran, 0.15, 'öteki servise özel oran')
  m.veri.servisIskontosunuKaydet(SERVIS.id, 40, 'Sınama Yöneticisi')
  m.veri.servisIskontosunuKaydet(SERVIS.id, '', 'Sınama Yöneticisi')
  d.esit(m.veri.servisinIskontosu(SERVIS.id).kaynak, 'genel', 'boş oran servisi genel orana döndürüyor')
  d.esit(iskontoBildirimleri(SERVIS.id)[0]?.degerler?.simdi, 20, 'genel orana dönüş servise bildirildi')

  /* 8 · Sınır: %90'ın üstü ve anlamsız değer kabul edilmiyor. */
  const once7 = JSON.stringify(m.veri.parcaIskontosuGetir())
  d.dogru(Boolean(m.veri.genelIskontoyuKaydet(95, {}, 'Sınama Yöneticisi')?.hata), '%95 reddedildi')
  d.dogru(Boolean(m.veri.servisIskontosunuKaydet(SERVIS.id, 'abc', 'Sınama Yöneticisi')?.hata), 'anlamsız oran reddedildi')
  d.esit(JSON.stringify(m.veri.parcaIskontosuGetir()), once7, 'reddedilen oran hiçbir şey yazmadı')

  return d
}

/* ========================================================== AK-23 */

/* BAKİYEDEN ÖDEMEDE EK İSKONTO.

   KULLANICININ İSTEĞİ (24 Eylül 2026): Servisim'de bakiyeden ödenen
   parça siparişine ek indirim; oranı PAKSAN belirler (lib/servisFiyat.js
   → bakiyeIskontosu, siparisTutari; veri.js → bakiyeIskontosunuKaydet,
   servisParcaSiparisi, talepKapat).

   Senaryonun taşıdığı beş şey:
     1  başlangıçta oran 0 ve bakiyeden ödenen sipariş ek iskonto almıyor
     2  oran değişince BÜTÜN servislere bildirim gidiyor; aynı oran
        yeniden kaydedilince hiçbir şey yazılmıyor
     3  ek iskonto KDV'den ÖNCE, servisin iskontolu ara toplamından
        düşülüyor ve siparişe oranıyla, tutarıyla yazılıyor
     4  servisin onayda gördüğü ek oran geçiyor (okuma anı tazeyse);
        30 dakikadan eski ya da okuma anı olmayan eski oran ve ek
        iskonto taşıyan faturalı sipariş reddediliyor, hiçbir şey
        yazılmıyor — faturalı olan okuma anı taze olsa da
     5  kapanışta cariden düşülen borç ek iskontolu KDV dâhil toplam ve
        talep yeniden açılıp kapatılsa da tek borç

   Tutarlar formülden değil elle hesaplanıyor: senaryo siparisTutari'yi
   yalnız Servisim'in yaptığı gibi siparişi KURMAK için çağırıyor;
   iddialar ondan bağımsız rakamlara bakıyor. Yoksa formül bozulunca
   iki taraf birlikte bozulur ve senaryo yine geçerdi. */
export async function AK23(m, ctx) {
  const d = defter('AK-23', 'Bakiyeden ödemede ek iskonto')
  depoTemizle()
  dunyaKur(m)
  bakiyeYukle(m)
  const sf = m.servisFiyat
  const tb = await ctx.modulYukle('/src/servis/talepBildirimleri.js')
  const servisler = m.marka.servisleriGetir().map((x) => x.id)
  const ekBildirimler = (servisId) =>
    servisBildirimleriDepodan(m).filter((x) => x.olay === 'bakiyeIskonto' && x.servisId === servisId)
  const hepsininBildirimi = () =>
    servisBildirimleriDepodan(m).filter((x) => x.olay === 'bakiyeIskonto').length

  /* Servisim'in sipariş ekranının gönderdiği görüntü (SiparisVer.jsx):
     satırlar servisin iskontolu fiyatında, ek iskonto sipariş satırı.
     `ekOran` ekranın o an okuduğu ek iskonto; `ek` görüntünün üstüne
     yazılır (eski ya da uydurma oran taşıyan istemci için). `yas`
     verilirse görüntü, tutarların o kadar önce okunduğunu söyleyen
     `fiyatZamani`nı taşıyor; `okuma` o anı doğrudan veriyor. */
  const ADET = 3
  const siparisVer = ({ odeme, ekOran = 0, ek = {}, yas, okuma }) => {
    const oran = m.veri.servisinIskontosu(SERVIS.id).oran
    const f = sf.parcaServisFiyati({ kod: 'PRC-1', ad: 'Rulman', fiyat: 1000 }, oran)
    const taban = f.alis * ADET
    const listeToplam = f.fiyat * ADET
    const t = sf.siparisTutari(taban, { odeme, bakiyeOrani: ekOran })
    const sonuc = m.veri.servisParcaSiparisi({
      servisId: SERVIS.id,
      servisAd: SERVIS.ad,
      servisNo: SERVIS.no,
      servisTel: '3323450014',
      il: SERVIS.il,
      ilce: 'Selçuklu',
      kalemler: [{ kod: 'PRC-1', ad: 'Rulman', adet: ADET }],
      parcaFiyat: {
        surum: 1,
        kaynak: 'sınama',
        satirlar: [{ kod: 'PRC-1', ad: 'Rulman', adet: ADET, listeFiyati: f.fiyat, birimFiyat: f.alis, tutar: taban }],
        iskontoOrani: oran,
        listeToplam,
        iskontoTutari: listeToplam - taban,
        ...(t.bakiyeIskontoOrani > 0
          ? { bakiyeIskontoOrani: t.bakiyeIskontoOrani, bakiyeIskontoTutari: t.bakiyeIskontoTutari }
          : {}),
        araToplam: t.araToplam,
        kdv: t.kdv,
        toplam: t.toplam,
        eksikFiyat: false,
        ...(okuma !== undefined
          ? { fiyatZamani: okuma }
          : yas !== undefined
            ? { fiyatZamani: saat.simdi() - yas }
            : {}),
        ...ek,
      },
      not: '',
      teslimat: { ...ADRES },
      odeme,
      tutar: t.araToplam,
      tutarKdvli: t.toplam,
    })
    return { sonuc, taban, birim: f.alis, talep: sonuc?.talep ? bul(m, sonuc.talep.id) : null }
  }

  /* 0 · Başlangıç: ek iskonto kapalı. */
  d.esit(sf.BAKIYE_EK_ISKONTO, 0, 'başlangıç sabiti 0 (özellik kapalı)')
  d.esit(m.veri.bakiyeIskontosuGetir(), 0, 'yazılmamış ek iskonto 0')
  d.esit(m.veri.parcaIskontosuGetir().bakiye, 0, 'iskonto kaydında ek iskonto 0')
  const s0 = siparisVer({ odeme: 'bakiye', ekOran: m.veri.bakiyeIskontosuGetir() })
  d.esit(s0.sonuc?.hata, undefined, 'oran 0 iken bakiye siparişi kabul edildi')
  d.esit(s0.talep?.parcaFiyat?.bakiyeIskontoTutari, undefined, 'oran 0 iken siparişe ek iskonto yazılmadı')
  d.esit(s0.talep?.tutarKdvli, s0.taban + m.marka.kdvTutari(s0.taban), 'oran 0 iken tutar iskontolu ara toplam + KDV')

  /* 1 · Personel %5 yazıyor: bütün servislere bildirim. */
  const islemOnce = m.veri.islemKaydiGetir().length
  const k1 = m.veri.bakiyeIskontosunuKaydet(5, 'Sınama Yöneticisi')
  d.esit(k1?.hata, undefined, 'ek iskonto kabul edildi')
  d.esit(m.veri.bakiyeIskontosuGetir(), 0.05, 'ek iskonto kesir olarak okunuyor')
  d.dogru(servisler.length >= 2, 'dünyada en az iki servis var')
  d.esit(k1?.bildirilen, servisler.length, 'bildirim sayısı servis sayısı kadar')
  for (const id of servisler) {
    const b = ekBildirimler(id)
    d.esit(b.length, 1, `${id}: tek ek iskonto bildirimi`)
    d.esit(b[0]?.degerler?.once, 0, `${id}: bildirimde eski oran (yüzde)`)
    d.esit(b[0]?.degerler?.simdi, 5, `${id}: bildirimde yeni oran (yüzde)`)
  }
  const b1 = ekBildirimler(SERVIS.id)[0]
  d.esit(b1?.tur, 'hesap', 'bildirim talebe bağlı değil (hesap)')
  d.esit(b1?.talepId, undefined, 'bildirimde talep kimliği yok')
  d.bak(
    tb.bildirimYazisi(b1).baslik !== tb.bildirimYazisi({ olay: '__tanimsiz__' }).baslik,
    '"bakiyeIskonto" olayının Servisim\'de kendi yazısı var',
    'olaya özel başlık',
    tb.bildirimYazisi(b1).baslik,
  )
  d.esit(kisiselBildirimler(m).length, 0, 'ek iskonto bildirimi müşteriye sızmadı')
  d.esit(m.veri.islemKaydiGetir().length, islemOnce + 1, 'işlem kaydına tek satır')
  d.esit(m.veri.islemKaydiGetir()[0]?.tur, 'iskonto', 'işlem kaydı satırı iskonto türünde')

  /* 2 · Aynı oran yeniden: hiçbir şey yazılmıyor. */
  const k2 = m.veri.bakiyeIskontosunuKaydet('5', 'Sınama Yöneticisi')
  d.esit(k2?.bildirilen, 0, 'aynı oran: bildirilen 0')
  d.esit(hepsininBildirimi(), servisler.length, 'aynı oran: yeni bildirim gitmedi')
  d.esit(m.veri.islemKaydiGetir().length, islemOnce + 1, 'aynı oran: işlem kaydı yazılmadı')

  /* 3 · Servis iskontosunun kayıtları ek iskontoya dokunmuyor. */
  m.veri.genelIskontoyuKaydet(25, {}, 'Sınama Yöneticisi')
  d.esit(m.veri.bakiyeIskontosuGetir(), 0.05, 'genel oran değişince ek iskonto yerinde')
  m.veri.servisIskontosunuKaydet(BAYI_SERVISI, 20, 'Sınama Yöneticisi')
  d.esit(m.veri.bakiyeIskontosuGetir(), 0.05, 'servise özel oran yazılınca ek iskonto yerinde')
  d.esit(hepsininBildirimi(), servisler.length, 'servis iskontosu değişimi ek iskonto bildirimi yazmadı')

  /* 4 · Bakiyeden sipariş: ek iskonto KDV'den önce, ara toplamdan. */
  const s4 = siparisVer({ odeme: 'bakiye', ekOran: m.veri.bakiyeIskontosuGetir() })
  d.esit(s4.sonuc?.hata, undefined, 'güncel ek iskontolu bakiye siparişi kabul edildi')
  const g4 = s4.talep?.parcaFiyat
  const ekTutar = Math.round(s4.taban * 0.05)
  const net = s4.taban - ekTutar
  d.esit(s4.taban, 750 * ADET, 'satırlar servisin iskontolu fiyatında (%25)')
  d.esit(g4?.bakiyeIskontoOrani, 0.05, 'siparişe ek iskonto oranı yazıldı')
  d.esit(g4?.bakiyeIskontoTutari, ekTutar, 'siparişe ek iskonto tutarı yazıldı')
  d.esit(g4?.araToplam, net, 'ara toplam ek iskonto düşülmüş')
  d.esit(g4?.kdv, m.marka.kdvTutari(net), "KDV ek iskontolu ara toplamdan (iskonto KDV'den önce)")
  d.esit(g4?.toplam, net + m.marka.kdvTutari(net), 'genel toplam ek iskontolu')
  d.esit(g4?.satirlar?.[0]?.birimFiyat, s4.birim, 'satır fiyatı ek iskontodan etkilenmedi')
  d.esit(s4.talep?.tutar, net, 'siparişin tutarı (KDV hariç) ek iskontolu')
  d.esit(s4.talep?.tutarKdvli, net + m.marka.kdvTutari(net), 'siparişin KDV dâhil tutarı ek iskontolu')
  d.esit(s4.talep?.odeme, 'bakiye', 'ödeme bakiyeden')
  const hesap4 = sf.siparisTutari(s4.taban, { odeme: 'fatura', bakiyeOrani: 0.05 })
  d.esit(hesap4.bakiyeIskontoTutari, 0, 'formül: faturada ek iskonto yok')

  /* 5 · Eski oranla gelen bakiye siparişi: okuma anı yoksa ya da 30
     dakikadan eskiyse reddediliyor; tazeyse ve oran o anda geçerliyse
     servisin gördüğü oran geçiyor. Saat donmuş: bütün adımlar aynı
     dakikada; "5 dakika önce" ek iskonto henüz açılmamıştı (0). */
  const sayi5 = m.veri.talepleriGetir().length
  const s5a = siparisVer({ odeme: 'bakiye', ekOran: 0 })
  d.esit(s5a.sonuc?.iskontoDegisti, true, 'okuma anı olmayan, ek iskontosuz bakiye siparişi reddedildi')
  const s5b = siparisVer({ odeme: 'bakiye', ekOran: 0.03 })
  d.esit(s5b.sonuc?.iskontoDegisti, true, 'okuma anı olmayan eski ek oranlı bakiye siparişi reddedildi')
  const s5y = siparisVer({ odeme: 'bakiye', ekOran: 0.03, yas: 31 * 60 * 1000 })
  d.esit(s5y.sonuc?.iskontoDegisti, true, '30 dakikadan eski onaydaki eski ek oran reddedildi')
  d.esit(m.veri.talepleriGetir().length, sayi5, 'reddedilen siparişler yazılmadı')
  const s5u = siparisVer({ odeme: 'bakiye', ekOran: 0.03, yas: 60 * 1000 })
  d.esit(s5u.sonuc?.iskontoDegisti, true, 'taze okuma anıyla gelen, hiç geçerli olmamış ek oran reddedildi')
  d.esit(m.veri.talepleriGetir().length, sayi5, 'reddedilen siparişler yazılmadı')
  const s5t = siparisVer({ odeme: 'bakiye', ekOran: 0, yas: 5 * 60 * 1000 })
  d.esit(s5t.sonuc?.hata, undefined, 'ek iskonto açılmadan onaylanan bakiye siparişi kabul edildi')
  d.esit(s5t.talep?.parcaFiyat?.bakiyeIskontoOrani, undefined, 'sipariş servisin gördüğü oranı (ek iskontosuz) taşıyor')
  d.esit(s5t.talep?.tutar, s5t.taban, 'siparişin tutarı onaylanan tutar')

  /* 6 · Faturayla sipariş ek iskonto almıyor, uydurursa reddediliyor. */
  const s6 = siparisVer({ odeme: 'fatura', ekOran: m.veri.bakiyeIskontosuGetir() })
  d.esit(s6.sonuc?.hata, undefined, 'faturalı sipariş kabul edildi')
  d.esit(s6.talep?.parcaFiyat?.bakiyeIskontoTutari, undefined, 'faturalı siparişe ek iskonto yazılmadı')
  d.esit(s6.talep?.tutarKdvli, s6.taban + m.marka.kdvTutari(s6.taban), 'faturalı siparişin tutarı ek iskontosuz')
  const sayi6 = m.veri.talepleriGetir().length
  const s6b = siparisVer({
    odeme: 'fatura',
    ek: { bakiyeIskontoOrani: 0.05, bakiyeIskontoTutari: Math.round(s6.taban * 0.05) },
  })
  d.esit(s6b.sonuc?.iskontoDegisti, true, 'ek iskonto taşıyan faturalı sipariş reddedildi')
  d.esit(s6b.sonuc?.faturayaEkIndirim, true, 'ret sebebi faturaya ek indirim (oran değişikliği değil)')
  const s6c = siparisVer({
    odeme: 'fatura',
    yas: 60 * 1000,
    ek: { bakiyeIskontoOrani: 0.05, bakiyeIskontoTutari: Math.round(s6.taban * 0.05) },
  })
  d.esit(s6c.sonuc?.faturayaEkIndirim, true, 'okuma anı taze olsa da faturalı sipariş ek iskonto taşıyamaz')
  d.esit(m.veri.talepleriGetir().length, sayi6, 'reddedilen faturalı sipariş yazılmadı')

  /* 7 · Kapanış: cariden ek iskontolu KDV dâhil toplam düşülüyor. */
  m.veri.talepKapat(s6.talep, { yapilanIs: 'Gönderildi', not: '' }, 'Sınama Yöneticisi')
  d.esit(borcHareketleri(m).length, 0, 'faturalı sipariş cariye yazmadı')
  m.veri.talepKapat(s4.talep, { yapilanIs: 'Gönderildi', not: '' }, 'Sınama Yöneticisi')
  const hareket = borcHareketleri(m)
  d.esit(hareket.length, 1, 'bakiye siparişi tek borç hareketi yazdı')
  d.esit(hareket[0]?.tur, 'borc', 'hareket borç')
  d.esit(hareket[0]?.tutar, net + m.marka.kdvTutari(net), 'borç ek iskontolu KDV dâhil toplam')
  /* Talep geri açılıp yeniden kapatılıyor (backoffice "Geri Aç"):
     aynı sipariş bakiyeden ikinci kez düşülmüyor. */
  m.veri.talepDurumDegistir(bul(m, s4.talep.id), 'yeni', 'Sınama Yöneticisi', { bildirme: true })
  m.veri.talepKapat(bul(m, s4.talep.id), { yapilanIs: 'Gönderildi', not: '' }, 'Sınama Yöneticisi')
  d.esit(borcHareketleri(m).length, 1, 'yeniden kapanan sipariş ikinci borç yazmadı')

  /* 8 · Oran kapatılıyor, sonra yeniden açılıyor. */
  const okuma8 = saat.simdi()
  const k8 = m.veri.bakiyeIskontosunuKaydet(0, 'Sınama Yöneticisi')
  d.esit(k8?.hata, undefined, 'ek iskonto kapatılabiliyor (0)')
  d.esit(ekBildirimler(SERVIS.id)[0]?.degerler?.simdi, 0, 'kapatma servise bildirildi')
  const s8 = siparisVer({ odeme: 'bakiye', ekOran: 0.05 })
  d.esit(s8.sonuc?.iskontoDegisti, true, 'kapatıldıktan sonra okuma anı olmayan ek iskontolu sipariş reddedildi')
  const s8t = siparisVer({ odeme: 'bakiye', ekOran: 0.05, okuma: okuma8 })
  d.esit(s8t.sonuc?.hata, undefined, 'kapatılmadan hemen önce onaylanan ek iskontolu sipariş kabul edildi')
  d.esit(s8t.talep?.parcaFiyat?.bakiyeIskontoOrani, 0.05, 'sipariş servisin gördüğü ek oranı taşıyor')

  /* 9 · Sınır: %90'ın üstü ve anlamsız değer kabul edilmiyor. */
  const once9 = JSON.stringify(m.veri.parcaIskontosuGetir())
  d.dogru(Boolean(m.veri.bakiyeIskontosunuKaydet(95, 'Sınama Yöneticisi')?.hata), '%95 reddedildi')
  d.dogru(Boolean(m.veri.bakiyeIskontosunuKaydet('abc', 'Sınama Yöneticisi')?.hata), 'anlamsız oran reddedildi')
  d.dogru(Boolean(m.veri.bakiyeIskontosunuKaydet('', 'Sınama Yöneticisi')?.hata), 'boş oran reddedildi')
  d.esit(JSON.stringify(m.veri.parcaIskontosuGetir()), once9, 'reddedilen oran hiçbir şey yazmadı')

  /* 10 · Tek borç TALEP KİMLİĞİYLE: talep numarası tekil değil (gün +
     dört rastgele hane). Aynı numaralı başka bir siparişin borcu, bu
     siparişin borcunu yutmamalı. */
  m.veri.bakiyeIskontosunuKaydet(0, 'Sınama Yöneticisi')
  const s10 = siparisVer({ odeme: 'bakiye', ekOran: 0 })
  d.esit(s10.sonuc?.hata, undefined, 'yeni bakiye siparişi kabul edildi')
  m.veri.cariHareketEkle({
    servisId: SERVIS.id,
    servisAd: SERVIS.ad,
    tur: 'borc',
    tutar: 1,
    aciklama: 'aynı numaralı başka sipariş',
    talepNo: s10.talep.no,
    talepId: 'baska-siparis',
    personel: 'Sınama Yöneticisi',
  })
  m.veri.talepKapat(bul(m, s10.talep.id), { yapilanIs: 'Gönderildi', not: '' }, 'Sınama Yöneticisi')
  d.esit(
    m.veri
      .cariHareketleri(SERVIS.id)
      .filter((h) => h.tur === 'borc' && h.talepId === s10.talep.id)
      .reduce((t, h) => t + h.tutar, 0),
    s10.talep.parcaFiyat.toplam,
    'aynı numaralı başka siparişin borcu varken bu siparişin tamamı düşüldü',
  )

  /* Son durum: oran açık ve depoda ek iskontolu bir sipariş duruyor —
     veritabanı eşleme denetimi senaryonun sonunda depoya bakıyor ve
     yeni alanları ancak böyle görüyor. */
  m.veri.bakiyeIskontosunuKaydet(3, 'Sınama Yöneticisi')
  const son = siparisVer({ odeme: 'bakiye', ekOran: m.veri.bakiyeIskontosuGetir() })
  d.esit(son.talep?.parcaFiyat?.bakiyeIskontoOrani, 0.03, 'yeniden açılan oranla sipariş kabul edildi')

  return d
}

/* ========================================================== AK-24 */

/* EKSİK GÖNDERİLEN SERVİS SİPARİŞİ.

   KULLANICININ KARARI (24 Eylül 2026): siparişteki bir parça stokta
   yoksa personel talebi kapatırken onun işaretini kaldırıyor;
   bakiyeden ödenen siparişte servisin bakiyesinden yalnız gönderilen
   parçaların tutarı düşülüyor. Kalan parça sonra "Kalan Parçaları
   Gönder" ile gidiyor, tutarı o gün düşülüyor (veri.js → talepKapat,
   kalanParcalariGonder, siparisBorcunuYaz; lib/servisFiyat.js →
   gonderilenTutar; lib/servisKaydi.js → siparisGonderimi).

   Senaryonun taşıdığı beş şey:
     1  işaretlenmeyen satır bekliyor; bakiyeden yalnız gönderilenlerin
        tutarı düşülüyor — sipariş anındaki satır fiyatı, siparişin ek
        iskontosu, sonra KDV
     2  kalan gönderilince yalnız farkı düşülüyor; düşülenlerin toplamı
        siparişin toplamına kuruşu kuruşuna eşit
     3  servise kısmi gönderimde ve kalan gönderiminde kendi bildirimi
     4  faturalı siparişte gönderim yazılıyor, cariye hiçbir şey yok
     5  işaretsiz kapanış, kalanı olmayan gönderim ve yeniden kapanış
        hiçbir şey yazmıyor */
export function AK24(m) {
  const d = defter('AK-24', 'Eksik gönderilen servis siparişi')
  depoTemizle()
  dunyaKur(m)
  bakiyeYukle(m)
  const sf = m.servisFiyat
  const sk = m.servisKaydi
  const EK = 0.05
  m.veri.bakiyeIskontosunuKaydet(EK * 100, 'Sınama Yöneticisi')
  const oran = m.veri.servisinIskontosu(SERVIS.id).oran

  /* Üç satırlık sipariş, Servisim'in gönderdiği görüntüyle
     (SiparisVer.jsx). Rulman 1000, kayış 500, zincir 300 × 2. */
  const PARCALAR = [
    { kod: 'PRC-1', ad: 'Rulman', fiyat: 1000, adet: 1 },
    { kod: 'PRC-2', ad: 'Kayış', fiyat: 500, adet: 1 },
    { kod: 'PRC-3', ad: 'Zincir', fiyat: 300, adet: 2 },
  ]
  const alis = (x) => Math.round(x.fiyat * (1 - oran))
  const siparisVer = (odeme) => {
    const satirlar = PARCALAR.map((x) => ({
      kod: x.kod, ad: x.ad, adet: x.adet, listeFiyati: x.fiyat, birimFiyat: alis(x), tutar: alis(x) * x.adet,
    }))
    const taban = satirlar.reduce((t, x) => t + x.tutar, 0)
    const listeToplam = PARCALAR.reduce((t, x) => t + x.fiyat * x.adet, 0)
    const t = sf.siparisTutari(taban, { odeme, bakiyeOrani: EK })
    const sonuc = m.veri.servisParcaSiparisi({
      servisId: SERVIS.id, servisAd: SERVIS.ad, servisNo: SERVIS.no, servisTel: '3323450014',
      il: SERVIS.il, ilce: 'Selçuklu',
      kalemler: PARCALAR.map((x) => ({ kod: x.kod, ad: x.ad, adet: x.adet })),
      parcaFiyat: {
        surum: 1, kaynak: 'sınama', satirlar,
        iskontoOrani: oran, listeToplam, iskontoTutari: listeToplam - taban,
        ...(t.bakiyeIskontoOrani > 0
          ? { bakiyeIskontoOrani: t.bakiyeIskontoOrani, bakiyeIskontoTutari: t.bakiyeIskontoTutari }
          : {}),
        araToplam: t.araToplam, kdv: t.kdv, toplam: t.toplam, eksikFiyat: false,
      },
      not: '', teslimat: { ...ADRES }, odeme, tutar: t.araToplam, tutarKdvli: t.toplam,
    })
    return { sonuc, talep: sonuc?.talep ? bul(m, sonuc.talep.id) : null }
  }
  const borclar = (talepId) =>
    m.veri.cariHareketleri(SERVIS.id).filter((h) => h.tur === 'borc' && h.talepId === talepId)
  const toplamBorc = (talepId) => borclar(talepId).reduce((t, h) => t + h.tutar, 0)
  const bildirimi = (talepId) =>
    servisBildirimleriDepodan(m).filter((x) => x.talepId === talepId).map((x) => x.olay)
  const kapat = (talep, gonderilen) =>
    m.veri.talepKapat(bul(m, talep.id), { yapilanIs: 'Gönderildi', not: '', ...(gonderilen ? { gonderilen } : {}) }, 'Sınama Yöneticisi')

  /* 0 · Bakiyeden ödenen sipariş. */
  const s = siparisVer('bakiye')
  d.esit(s.sonuc?.hata, undefined, 'bakiye siparişi kabul edildi')
  const siparisToplami = s.talep.parcaFiyat.toplam

  /* 1 · Hiç parça işaretlenmeden kapanmıyor. */
  const k0 = kapat(s.talep, [])
  d.dogru(Boolean(k0?.hata), 'işaretsiz kapanış reddedildi')
  d.esit(bul(m, s.talep.id)?.status, 'yeni', 'reddedilen kapanış talebi kapatmadı')
  d.esit(borclar(s.talep.id).length, 0, 'reddedilen kapanış cariye yazmadı')

  /* 2 · Rulman ve kayış gönderildi, zincir stokta yok. */
  const k1 = kapat(s.talep, [0, 1])
  d.esit(k1?.kismi, true, 'kapanış kısmi olduğunu söylüyor')
  const t1 = bul(m, s.talep.id)
  d.esit(t1?.status, 'kapandi', 'talep kapandı')
  d.esit(t1?.cozum?.gonderilen, undefined, 'seçim kapanış nesnesine yazılmadı')
  d.esit(JSON.stringify(t1?.gonderimler?.map((g) => g.satirlar)), '[[0,1]]', 'ilk gönderimde iki satır')
  d.esit(JSON.stringify(sk.siparisGonderimi(t1)?.kalan), '[2]', 'zincir bekliyor')
  const ara1 = alis(PARCALAR[0]) + alis(PARCALAR[1])
  const net1 = ara1 - Math.round(ara1 * EK)
  const beklenen1 = net1 + m.marka.kdvTutari(net1)
  d.esit(borclar(s.talep.id).length, 1, 'tek borç yazıldı')
  d.esit(toplamBorc(s.talep.id), beklenen1, 'borç yalnız gönderilenler: satır fiyatı, ek iskonto, KDV')
  d.dogru(beklenen1 < siparisToplami, 'düşülen, siparişin toplamından az')
  d.dogru(bildirimi(s.talep.id).includes('siparisKismenGonderildi'), 'servise kısmi gönderim bildirimi')
  d.yanlis(bildirimi(s.talep.id).includes('siparisGonderildi'), 'tam gönderim bildirimi gitmedi')

  /* 3 · Kalan parça: geçersiz seçim reddediliyor, sonra zincir gidiyor. */
  d.dogru(Boolean(m.veri.kalanParcalariGonder(t1, [0], 'Sınama Yöneticisi')?.hata), 'gönderilmiş satır yeniden gönderilemiyor')
  d.dogru(Boolean(m.veri.kalanParcalariGonder(t1, [], 'Sınama Yöneticisi')?.hata), 'işaretsiz gönderim reddedildi')
  d.esit(borclar(s.talep.id).length, 1, 'reddedilen gönderimler cariye yazmadı')
  const g2 = m.veri.kalanParcalariGonder(t1, [2], 'Sınama Yöneticisi')
  d.esit(g2?.hata, undefined, 'zincir gönderildi')
  const t2 = bul(m, s.talep.id)
  d.esit(t2?.gonderimler?.length, 2, 'ikinci gönderim yazıldı')
  d.esit(sk.siparisGonderimi(t2)?.kalan.length, 0, 'bekleyen parça kalmadı')
  d.esit(borclar(s.talep.id).length, 2, 'ikinci borç yazıldı')
  d.esit(toplamBorc(s.talep.id), siparisToplami, 'düşülenlerin toplamı siparişin toplamına eşit')
  d.esit(borclar(s.talep.id)[0]?.tutar, siparisToplami - beklenen1, 'ikinci borç yalnız fark')
  d.dogru(bildirimi(s.talep.id).includes('kalanGonderildi'), 'servise kalan gönderim bildirimi')
  d.dogru(Boolean(m.veri.kalanParcalariGonder(t2, [2], 'Sınama Yöneticisi')?.hata), 'kalanı olmayan siparişte gönderim yok')

  /* 4 · Yeniden açılıp kapanan sipariş yeniden düşülmüyor. */
  m.veri.talepDurumDegistir(t2, 'yeni', 'Sınama Yöneticisi', { bildirme: true })
  kapat(t2, [0, 1, 2])
  d.esit(toplamBorc(s.talep.id), siparisToplami, 'yeniden kapanış borç eklemedi')
  d.esit(bul(m, s.talep.id)?.gonderimler?.length, 2, 'yeniden kapanış gönderim eklemedi')

  /* 5 · Faturalı sipariş: gönderim yazılıyor, cariye bir şey yok. */
  const f = siparisVer('fatura')
  const cariOnce = m.veri.cariHareketleri(SERVIS.id).length
  const kf = kapat(f.talep, [1])
  d.esit(kf?.kismi, true, 'faturalı siparişte de kısmi kapanış')
  d.esit(JSON.stringify(sk.siparisGonderimi(bul(m, f.talep.id))?.kalan), '[0,2]', 'faturalı siparişte iki satır bekliyor')
  d.esit(m.veri.cariHareketleri(SERVIS.id).length, cariOnce, 'faturalı sipariş cariye yazmadı')
  m.veri.kalanParcalariGonder(bul(m, f.talep.id), [0, 2], 'Sınama Yöneticisi')
  d.esit(m.veri.cariHareketleri(SERVIS.id).length, cariOnce, 'faturalı siparişin kalanı da cariye yazmadı')

  /* 6 · Seçimsiz (eski) çağrı: hepsi gönderilmiş sayılıyor. */
  const e = siparisVer('bakiye')
  const ke = kapat(e.talep, null)
  d.esit(ke?.kismi, false, 'seçimsiz kapanış tam gönderim')
  d.esit(toplamBorc(e.talep.id), e.talep.parcaFiyat.toplam, 'seçimsiz kapanışta siparişin tamamı düşüldü')

  /* Son durum: depoda kısmen gönderilmiş, bekleyen satırı olan bir
     sipariş dursun — eşleme denetimi yeni alanları ancak böyle görüyor. */
  const son = siparisVer('bakiye')
  kapat(son.talep, [0])
  d.esit(sk.siparisGonderimi(bul(m, son.talep.id))?.kalan.length, 2, 'depoda bekleyen satırlı sipariş var')

  return d
}

/* ========================================================== AK-25 */

/* SİPARİŞİN TUTARI, İPTALİ VE BAKİYESİ (24 Eylül 2026).

   KULLANICININ BULDUĞU HATA: Servisim'in sipariş listesi ve
   backoffice'in "Sipariş tutarı" satırı KDV HARİÇ ara toplamı
   gösteriyordu, bakiyeden düşülen KDV dâhil tutardı. Ekranlar tutarı
   artık lib/servisFiyat.js → siparisToplami'den okuyor; bu senaryo
   onun kapanışta düşülen rakamla aynı olduğunu tutuyor.

   KULLANICININ KARARLARI (aynı gün):
     · servis kendi siparişini yalnız "Yeni" iken iptal edebiliyor
     · iptal edilen siparişte bakiyeden düşülen tutar bakiyeye dönüyor
   Ve bunlarla gelen: gönderilmeyi bekleyen bakiye siparişlerinin
   tutarı bakiyeden "ayrılmış" sayılıyor, yeni sipariş kullanılabilir
   kısma bakıyor (veri.js → bakiyeDurumu, siparisHesabi,
   siparisIadesiniYaz, servisSiparisiniIptalEt).

   Taşıdıkları:
     1  ekranın tutarı = kapanışta düşülen; KDV hariç ara toplam değil
     2  siparisHesabi: gönderilmeden, kısmen ve tamamen gönderilince
     3  borç hareketi hangi gönderimin karşılığı olduğunu taşıyor
     4  bekleyen sipariş bakiyeden ayrılıyor; yetmeyen sipariş reddediliyor
     5  servis "Yeni" siparişi iptal ediyor, işleme alınanı edemiyor
     6  gönderilmiş siparişin iptalinde düşülen tutar geri ekleniyor —
        form yolundan da durum düğmesinden de, bir kez
     7  iptal edilip yeniden kapanan sipariş yeniden düşülüyor
     8  faturalı siparişin iptali cariye yazmıyor */
export function AK25(m) {
  const d = defter('AK-25', 'Siparişin tutarı, iptali ve bakiyesi')
  depoTemizle()
  dunyaKur(m)
  const sf = m.servisFiyat
  const oran = m.veri.servisinIskontosu(SERVIS.id).oran
  const PARCALAR = [
    { kod: 'PRC-1', ad: 'Rulman', fiyat: 1000, adet: 1 },
    { kod: 'PRC-2', ad: 'Kayış', fiyat: 500, adet: 2 },
  ]
  const alis = (x) => Math.round(x.fiyat * (1 - oran))
  const siparisVer = (odeme) => {
    const satirlar = PARCALAR.map((x) => ({
      kod: x.kod, ad: x.ad, adet: x.adet, listeFiyati: x.fiyat, birimFiyat: alis(x), tutar: alis(x) * x.adet,
    }))
    const taban = satirlar.reduce((t, x) => t + x.tutar, 0)
    const listeToplam = PARCALAR.reduce((t, x) => t + x.fiyat * x.adet, 0)
    const t = sf.siparisTutari(taban, { odeme })
    const sonuc = m.veri.servisParcaSiparisi({
      servisId: SERVIS.id, servisAd: SERVIS.ad, servisNo: SERVIS.no, servisTel: '3323450014',
      il: SERVIS.il, ilce: 'Selçuklu',
      kalemler: PARCALAR.map((x) => ({ kod: x.kod, ad: x.ad, adet: x.adet })),
      parcaFiyat: {
        surum: 1, kaynak: 'sınama', satirlar,
        iskontoOrani: oran, listeToplam, iskontoTutari: listeToplam - taban,
        araToplam: t.araToplam, kdv: t.kdv, toplam: t.toplam, eksikFiyat: false,
      },
      not: '', teslimat: { ...ADRES }, odeme, tutar: t.araToplam, tutarKdvli: t.toplam,
    })
    return { sonuc, talep: sonuc?.talep ? bul(m, sonuc.talep.id) : null }
  }
  const kapat = (talep, gonderilen) =>
    m.veri.talepKapat(bul(m, talep.id), { yapilanIs: 'Gönderildi', not: '', ...(gonderilen ? { gonderilen } : {}) }, 'Sınama Yöneticisi')
  const hareketleri = (talepId) => m.veri.cariHareketleri(SERVIS.id).filter((h) => h.talepId === talepId)
  const bakiye = () => m.veri.cariBakiye(SERVIS.id)

  bakiyeYukle(m, 10000)

  /* 1 · Ekranın gösterdiği tutar kapanışta düşülen tutar. */
  const a = siparisVer('bakiye')
  d.esit(a.sonuc?.hata, undefined, 'bakiye siparişi kabul edildi')
  const toplam = a.talep.parcaFiyat.toplam
  d.esit(sf.siparisToplami(a.talep), toplam, 'ekranın tutarı siparişin KDV dâhil toplamı')
  d.dogru(sf.siparisToplami(a.talep) !== a.talep.tutar, 'ekranın tutarı KDV hariç ara toplam değil')

  /* 2 · Gönderilmeden: düşülen yok, tamamı bekliyor ve bakiyeden ayrıldı. */
  let h = m.veri.siparisHesabi(bul(m, a.talep.id))
  d.esit(h.dusulen, 0, 'gönderilmeden bakiyeden bir şey düşülmedi')
  d.esit(h.bekleyen, toplam, 'gönderilmeden tamamı bekliyor')
  let b = m.veri.bakiyeDurumu(SERVIS.id)
  d.esit(b.bakiye, 10000, 'hesaptaki tutar değişmedi')
  d.esit(b.ayrilan, toplam, 'bekleyen sipariş bakiyeden ayrıldı')
  d.esit(b.kullanilabilir, 10000 - toplam, 'kullanılabilir bakiye ayrılan kadar az')

  /* 4 · Kullanılabilir kısım yetmeyen bakiye siparişi reddediliyor;
     faturalısı geçiyor. */
  const sayi = m.veri.talepleriGetir().length
  const tasan = []
  for (let i = 0; i < 20 && m.veri.bakiyeDurumu(SERVIS.id).kullanilabilir >= toplam; i++) {
    tasan.push(siparisVer('bakiye'))
  }
  d.dogru(tasan.length >= 3 && tasan.every((x) => !x.sonuc?.hata), 'bakiye yettikçe siparişler kabul edildi')
  const fazla = siparisVer('bakiye')
  d.esit(fazla.sonuc?.bakiyeYetmiyor, true, 'bekleyenler düşülünce yetmeyen bakiye siparişi reddedildi')
  d.esit(m.veri.talepleriGetir().length, sayi + tasan.length, 'reddedilen sipariş yazılmadı')
  const fat = siparisVer('fatura')
  d.esit(fat.sonuc?.hata, undefined, 'bakiye yetmese de faturalı sipariş kabul edildi')

  /* 5 · Servis iptali: "Yeni" iken geçiyor, işleme alınanda geçmiyor. */
  const ilk = tasan[0]
  const ayrilanOnce = m.veri.bakiyeDurumu(SERVIS.id).ayrilan
  const si = m.veri.servisSiparisiniIptalEt(ilk.talep, SERVIS.ad)
  d.esit(si?.hata, undefined, 'servis Yeni siparişini iptal etti')
  d.esit(bul(m, ilk.talep.id)?.status, 'iptal', 'sipariş iptal durumunda')
  d.esit(hareketleri(ilk.talep.id).length, 0, 'gönderilmemiş siparişin iptali cariye yazmadı')
  d.esit(m.veri.bakiyeDurumu(SERVIS.id).ayrilan, ayrilanOnce - toplam, 'iptal edilen siparişin ayrılan tutarı serbest kaldı')
  const ikinci = tasan[1]
  m.veri.talepDurumDegistir(bul(m, ikinci.talep.id), 'incelemede', 'Sınama Yöneticisi')
  const sj = m.veri.servisSiparisiniIptalEt(ikinci.talep, SERVIS.ad)
  d.dogru(Boolean(sj?.hata), 'işleme alınan siparişi servis iptal edemedi')
  d.esit(bul(m, ikinci.talep.id)?.status, 'incelemede', 'reddedilen iptal durumu değiştirmedi')
  /* Ekran eski kopyayla çağırsa da depodaki durum esas. */
  const sk2 = m.veri.servisSiparisiniIptalEt({ ...ikinci.talep, status: 'yeni' }, SERVIS.ad)
  d.dogru(Boolean(sk2?.hata), 'ekranın eski kopyası "Yeni" dese de işleme alınan sipariş iptal edilmedi')

  /* 2 · 3 · Kısmi gönderim: düşülen ve bekleyen; borç gönderim no'lu. */
  kapat(a.talep, [0])
  h = m.veri.siparisHesabi(bul(m, a.talep.id))
  const kismi = sf.gonderilenTutar(a.talep.parcaFiyat, [0], 'bakiye')
  d.esit(h.dusulen, kismi, 'kısmi gönderimde düşülen gönderilenlerin tutarı')
  d.esit(h.bekleyen, toplam - kismi, 'kısmi gönderimde kalanı bekliyor')
  d.esit(hareketleri(a.talep.id)[0]?.gonderimNo, 1, 'borç birinci gönderimin karşılığı')
  m.veri.kalanParcalariGonder(bul(m, a.talep.id), [1], 'Sınama Yöneticisi')
  h = m.veri.siparisHesabi(bul(m, a.talep.id))
  d.esit(h.dusulen, toplam, 'tamamı gönderilince düşülen siparişin toplamı')
  d.esit(h.bekleyen, 0, 'tamamı gönderilince bekleyen yok')
  d.esit(hareketleri(a.talep.id)[0]?.gonderimNo, 2, 'ikinci borç ikinci gönderimin karşılığı')
  d.esit(
    hareketleri(a.talep.id).reduce((t, x) => t + x.tutar, 0),
    sf.siparisToplami(bul(m, a.talep.id)),
    'düşülenlerin toplamı ekranın gösterdiği tutar',
  )

  /* 6 · Gönderilmiş siparişin iptali (backoffice formu): tutar geri. */
  const bakiyeOnce = bakiye()
  m.veri.talepIptal(bul(m, a.talep.id), { neden: 'Parçalar iade alındı' }, 'Sınama Yöneticisi')
  const iade = hareketleri(a.talep.id).filter((x) => x.tur === 'alacak')
  d.esit(iade.length, 1, 'iptalde tek iade hareketi')
  d.esit(iade[0]?.tutar, toplam, 'iade düşülen tutarın tamamı')
  d.esit(bakiye(), bakiyeOnce + toplam, 'bakiye iptalden önceki düşümü geri aldı')
  h = m.veri.siparisHesabi(bul(m, a.talep.id))
  d.esit(h.dusulen, 0, 'iptalden sonra net düşülen sıfır')
  d.esit(h.iade, toplam, 'iptalden sonra iade görünüyor')
  d.esit(h.bekleyen, 0, 'iptal edilen sipariş bakiyeden bir şey ayırmıyor')
  const iptalBildirimi = servisBildirimleriDepodan(m).find((x) => x.talepId === a.talep.id && x.olay === 'iptal')
  d.esit(iptalBildirimi?.degerler?.iade, toplam, 'servise giden iptal bildirimi iade tutarını taşıyor')
  m.veri.talepIptal(bul(m, a.talep.id), { neden: 'Parçalar iade alındı' }, 'Sınama Yöneticisi')
  d.esit(hareketleri(a.talep.id).filter((x) => x.tur === 'alacak').length, 1, 'ikinci iptal ikinci iade yazmadı')

  /* 7 · İptal edilip yeniden kapanan sipariş yeniden düşülüyor. */
  m.veri.talepDurumDegistir(bul(m, a.talep.id), 'yeni', 'Sınama Yöneticisi', { bildirme: true })
  kapat(a.talep, [0, 1])
  d.esit(m.veri.siparisHesabi(bul(m, a.talep.id)).dusulen, toplam, 'yeniden kapanan sipariş yeniden düşüldü')

  /* 6 · Durum düğmesiyle kısmen gönderilmiş siparişi iptal: yalnız
     düşülen kadar geri. */
  const c = tasan[2]
  kapat(c.talep, [1])
  const cDusulen = m.veri.siparisHesabi(bul(m, c.talep.id)).dusulen
  d.dogru(cDusulen > 0 && cDusulen < toplam, 'kısmen gönderilen siparişten bir kısmı düşüldü')
  m.veri.talepDurumDegistir(bul(m, c.talep.id), 'iptal', 'Sınama Yöneticisi', { bildirme: true })
  const cIade = hareketleri(c.talep.id).filter((x) => x.tur === 'alacak')
  d.esit(cIade.reduce((t, x) => t + x.tutar, 0), cDusulen, 'durum düğmesiyle iptalde düşülen kadar iade')

  /* 8 · Faturalı siparişin iptali cariye yazmıyor. */
  kapat(fat.talep, [0, 1])
  const cariOnce = m.veri.cariHareketleri(SERVIS.id).length
  m.veri.talepIptal(bul(m, fat.talep.id), { neden: 'Parçalar iade alındı' }, 'Sınama Yöneticisi')
  d.esit(m.veri.cariHareketleri(SERVIS.id).length, cariOnce, 'faturalı siparişin iptali cariye yazmadı')

  return d
}

/* ========================================================== AK-26 */

/* KALAN PARÇALARIN İPTALİ (24 Eylül 2026, kullanıcının onayı).

   Kısmen gönderilmiş siparişin bekleyen kalemi stoktan kalkınca onu
   kapatmanın tek yolu siparişin tamamını iptal etmekti. Artık PAKSAN
   yalnız seçtiği bekleyen kalemleri siparişten çıkarıyor (veri.js →
   kalanParcalariIptalEt, siparisHesabi; lib/servisFiyat.js →
   siparisNetTutari; lib/servisKaydi.js → siparisGonderimi).

   Taşıdıkları:
     1  seçilen bekleyen kalem siparişten çıkıyor; gönderilen ve
        seçilmeyen kalem yerinde, talebin durumu değişmiyor
     2  cariye hiçbir şey yazılmıyor; bekleyen ve bakiyeden ayrılan,
        iptal edilen pay kadar iniyor
     3  kalanın geri kalanı gönderilince düşülenlerin toplamı yeni
        tutara, düşülen + iptal edilen siparişin ilk toplamına eşit
     4  gönderilmiş, zaten iptal edilmiş kalem ve kapanmamış ya da
        kalanı olmayan sipariş iptal edilemiyor; sebepsiz iptal yok
     5  servise giden bildirim düşülmeyecek tutarı ve ödeme biçimini
        taşıyor
     6  yeniden kapanışta iptal edilen kalem gönderilmiyor, borca girmiyor
     7  faturalı siparişte de iptal yazılıyor, cariye bir şey yok
     8  kalemi iptal edilmiş siparişin tamamı iptal edilince yalnız
        düşülen geri ekleniyor */
export function AK26(m) {
  const d = defter('AK-26', 'Kalan parçaların iptali')
  depoTemizle()
  dunyaKur(m)
  bakiyeYukle(m, 100000)
  const sf = m.servisFiyat
  const sk = m.servisKaydi
  const EK = 0.05
  m.veri.bakiyeIskontosunuKaydet(EK * 100, 'Sınama Yöneticisi')
  const oran = m.veri.servisinIskontosu(SERVIS.id).oran
  const PARCALAR = [
    { kod: 'PRC-1', ad: 'Rulman', fiyat: 1000, adet: 1 },
    { kod: 'PRC-2', ad: 'Kayış', fiyat: 500, adet: 1 },
    { kod: 'PRC-3', ad: 'Zincir', fiyat: 300, adet: 2 },
  ]
  const alis = (x) => Math.round(x.fiyat * (1 - oran))
  const siparisVer = (odeme) => {
    const satirlar = PARCALAR.map((x) => ({
      kod: x.kod, ad: x.ad, adet: x.adet, listeFiyati: x.fiyat, birimFiyat: alis(x), tutar: alis(x) * x.adet,
    }))
    const taban = satirlar.reduce((t, x) => t + x.tutar, 0)
    const listeToplam = PARCALAR.reduce((t, x) => t + x.fiyat * x.adet, 0)
    const t = sf.siparisTutari(taban, { odeme, bakiyeOrani: EK })
    const sonuc = m.veri.servisParcaSiparisi({
      servisId: SERVIS.id, servisAd: SERVIS.ad, servisNo: SERVIS.no, servisTel: '3323450014',
      il: SERVIS.il, ilce: 'Selçuklu',
      kalemler: PARCALAR.map((x) => ({ kod: x.kod, ad: x.ad, adet: x.adet })),
      parcaFiyat: {
        surum: 1, kaynak: 'sınama', satirlar,
        iskontoOrani: oran, listeToplam, iskontoTutari: listeToplam - taban,
        ...(t.bakiyeIskontoOrani > 0
          ? { bakiyeIskontoOrani: t.bakiyeIskontoOrani, bakiyeIskontoTutari: t.bakiyeIskontoTutari }
          : {}),
        araToplam: t.araToplam, kdv: t.kdv, toplam: t.toplam, eksikFiyat: false,
      },
      not: '', teslimat: { ...ADRES }, odeme, tutar: t.araToplam, tutarKdvli: t.toplam,
    })
    return { sonuc, talep: sonuc?.talep ? bul(m, sonuc.talep.id) : null }
  }
  const PERSONEL = 'Sınama Yöneticisi'
  const IPTAL = { neden: 'Parça temin edilemiyor', aciklama: 'Üretimden kalktı' }
  const iptalEt = (talepId, secim, iptal = IPTAL) =>
    m.veri.kalanParcalariIptalEt(bul(m, talepId), secim, iptal, PERSONEL)
  const borclar = (talepId) =>
    m.veri.cariHareketleri(SERVIS.id).filter((h) => h.tur === 'borc' && h.talepId === talepId)
  const toplamBorc = (talepId) => borclar(talepId).reduce((t, h) => t + h.tutar, 0)
  const bildirimi = (talepId) =>
    servisBildirimleriDepodan(m).find((x) => x.talepId === talepId && x.olay === 'kalanIptalEdildi')
  const kapat = (talep, gonderilen) =>
    m.veri.talepKapat(bul(m, talep.id), { yapilanIs: 'Gönderildi', not: '', gonderilen }, PERSONEL)

  /* 0 · Bakiye siparişi: rulman gönderildi, kayış ve zincir bekliyor. */
  const s = siparisVer('bakiye')
  d.esit(s.sonuc?.hata, undefined, 'bakiye siparişi kabul edildi')
  const toplam = s.talep.parcaFiyat.toplam
  kapat(s.talep, [0])
  d.esit(JSON.stringify(sk.siparisGonderimi(bul(m, s.talep.id))?.kalan), '[1,2]', 'iki kalem bekliyor')
  const dusulen0 = toplamBorc(s.talep.id)
  const ayrilan0 = m.veri.bakiyeDurumu(SERVIS.id).ayrilan

  /* 4 · Geçersiz iptaller hiçbir şey yazmıyor. */
  d.dogru(Boolean(iptalEt(s.talep.id, [0])?.hata), 'gönderilmiş kalem iptal edilemiyor')
  d.dogru(Boolean(iptalEt(s.talep.id, [])?.hata), 'işaretsiz iptal reddedildi')
  d.dogru(Boolean(iptalEt(s.talep.id, [2], {})?.hata), 'sebepsiz iptal reddedildi')
  d.esit(bul(m, s.talep.id)?.kalemIptalleri, undefined, 'reddedilen iptaller talebe yazmadı')

  /* 1 · 2 · Zincir iptal ediliyor. */
  const cariOnce = m.veri.cariHareketleri(SERVIS.id).length
  const i1 = iptalEt(s.talep.id, [2])
  d.esit(i1?.hata, undefined, 'zincir iptal edildi')
  const t1 = bul(m, s.talep.id)
  const g1 = sk.siparisGonderimi(t1)
  d.esit(JSON.stringify(g1?.iptal), '[2]', 'zincir iptal edilenlerde')
  d.esit(JSON.stringify(g1?.kalan), '[1]', 'kayış hâlâ bekliyor')
  d.esit(JSON.stringify(g1?.gonderilen), '[0]', 'rulman gönderilmiş olarak kaldı')
  d.esit(t1?.status, 'kapandi', 'talebin durumu değişmedi')
  d.esit(t1?.kalemIptalleri?.[0]?.neden, IPTAL.neden, 'iptal sebebi talepte')
  d.esit(t1?.kalemIptalleri?.[0]?.personel, PERSONEL, 'iptal eden personel talepte')
  d.esit(m.veri.cariHareketleri(SERVIS.id).length, cariOnce, 'kalem iptali cariye yazmadı')
  const net1 = sf.gonderilenTutar(t1.parcaFiyat, [0, 1], 'bakiye')
  let h = m.veri.siparisHesabi(t1)
  d.esit(h.toplam, toplam, 'siparişin ilk toplamı değişmedi')
  d.esit(h.net, net1, 'yeni tutar kalan kalemlerin tutarı')
  d.esit(h.iptalEdilen, toplam - net1, 'iptal edilen pay toplamla yeni tutarın farkı')
  d.esit(h.bekleyen, net1 - dusulen0, 'bekleyen yalnız kayışın payı')
  d.esit(m.veri.bakiyeDurumu(SERVIS.id).ayrilan, ayrilan0 - h.iptalEdilen, 'iptal edilen pay bakiyeden ayrılmaktan çıktı')
  d.esit(sf.siparisNetTutari(t1), net1, 'Servisim kartının tutarı yeni tutar')
  d.dogru(Boolean(iptalEt(s.talep.id, [2])?.hata), 'iptal edilmiş kalem yeniden iptal edilemiyor')

  /* 5 · Servise bildirim. */
  const b1 = bildirimi(s.talep.id)
  d.dogru(Boolean(b1), 'servise kalem iptali bildirimi gitti')
  d.esit(b1?.degerler?.tutar, toplam - net1, 'bildirim düşülmeyecek tutarı taşıyor')
  d.esit(b1?.degerler?.odeme, 'bakiye', 'bildirim ödeme biçimini taşıyor')
  d.esit(b1?.degerler?.neden, IPTAL.neden, 'bildirim iptal sebebini taşıyor')

  /* 3 · Kayış gönderiliyor: düşülenler yeni tutara eşit. */
  m.veri.kalanParcalariGonder(bul(m, s.talep.id), [1], PERSONEL)
  const t2 = bul(m, s.talep.id)
  d.esit(sk.siparisGonderimi(t2)?.kalan.length, 0, 'bekleyen kalem kalmadı')
  d.esit(toplamBorc(s.talep.id), net1, 'düşülenlerin toplamı siparişin yeni tutarı')
  h = m.veri.siparisHesabi(t2)
  d.esit(h.bekleyen, 0, 'bekleyen yok')
  d.esit(h.dusulen + h.iptalEdilen, toplam, 'düşülen ile iptal edilen siparişin ilk toplamına eşit')
  d.dogru(Boolean(iptalEt(s.talep.id, [1])?.hata), 'kalanı olmayan siparişte kalem iptali yok')

  /* 6 · Yeniden açılıp kapanan sipariş iptal edilen kalemi göndermiyor. */
  m.veri.talepDurumDegistir(t2, 'yeni', PERSONEL, { bildirme: true })
  const k6 = kapat(t2, [0, 1, 2])
  d.esit(k6?.kismi, false, 'iptal edilen kalem yeniden kapanışı kısmi yapmıyor')
  const t3 = bul(m, s.talep.id)
  d.yanlis((t3?.gonderimler || []).some((g) => g.satirlar?.includes(2)), 'iptal edilen kalem gönderime yazılmadı')
  d.esit(toplamBorc(s.talep.id), net1, 'yeniden kapanış iptal edilen kalemi düşmedi')

  /* 7 · Faturalı sipariş: iptal yazılıyor, cariye bir şey yok. */
  const f = siparisVer('fatura')
  kapat(f.talep, [0])
  const cariF = m.veri.cariHareketleri(SERVIS.id).length
  d.esit(iptalEt(f.talep.id, [1, 2])?.hata, undefined, 'faturalı siparişte kalem iptali')
  d.esit(m.veri.cariHareketleri(SERVIS.id).length, cariF, 'faturalı siparişin kalem iptali cariye yazmadı')
  d.esit(
    m.veri.siparisHesabi(bul(m, f.talep.id)).net,
    sf.gonderilenTutar(f.talep.parcaFiyat, [0], 'fatura'),
    'faturalı siparişin yeni tutarı gönderilenlerin tutarı',
  )
  d.esit(sk.siparisGonderimi(bul(m, f.talep.id))?.kalan.length, 0, 'faturalı siparişte bekleyen kalmadı')
  d.esit(bildirimi(f.talep.id)?.degerler?.odeme, 'fatura', 'faturalı siparişin bildirimi ödeme biçimini taşıyor')

  /* 8 · Kalemi iptal edilmiş siparişin tamamı iptal: yalnız düşülen geri. */
  const c = siparisVer('bakiye')
  kapat(c.talep, [1])
  iptalEt(c.talep.id, [0])
  const cDusulen = m.veri.siparisHesabi(bul(m, c.talep.id)).dusulen
  d.dogru(cDusulen > 0, 'kısmen gönderilen siparişten düşüldü')
  m.veri.talepIptal(bul(m, c.talep.id), { neden: 'Parçalar iade alındı' }, PERSONEL)
  const cIade = m.veri
    .cariHareketleri(SERVIS.id)
    .filter((x) => x.talepId === c.talep.id && x.tur === 'alacak')
    .reduce((t, x) => t + x.tutar, 0)
  d.esit(cIade, cDusulen, 'siparişin tamamı iptal edilince yalnız düşülen geri eklendi')
  d.esit(m.veri.siparisHesabi(bul(m, c.talep.id)).bekleyen, 0, 'iptal edilen sipariş bakiyeden bir şey ayırmıyor')

  /* 4 · Kapanmamış siparişte kalem iptali yok: siparişin kendisi iptal edilir. */
  const y = siparisVer('bakiye')
  d.dogru(Boolean(iptalEt(y.talep.id, [0])?.hata), 'kapanmamış siparişte kalem iptali yok')

  /* Son durum: depoda kalemi iptal edilmiş, bekleyeni de olan bir
     sipariş dursun — eşleme denetimi yeni alanı ancak böyle görüyor. */
  const son = siparisVer('bakiye')
  kapat(son.talep, [0])
  iptalEt(son.talep.id, [1])
  const gSon = sk.siparisGonderimi(bul(m, son.talep.id))
  d.esit(`${gSon?.iptal}|${gSon?.kalan}`, '1|2', 'depoda iptal edilmiş ve bekleyen kalemli sipariş var')

  return d
}

/* ========================================================== AK-27 */

/* SERİ NUMARASI OLMADAN AÇILAN TALEP (24 Eylül 2026).

   KULLANICININ KARARI: Servisim'in elle kaydında seri yazılmadıysa
   "Seri Numarası Yok" seçilip model ve tahmini üretim yılı giriliyor;
   talepte `makine.seriYok`, `makine.tahminiYil` (ElleKayit.jsx).
   KULLANICININ BULDUĞU HATA (aynı gün): servis kaydı ekranı bu talepte
   seri numarasını yine soruyordu; servis "yok" demişti.

   Taşıdıkları:
     1  servis kaydı serisiz talepte seriyi ve modeli eksik saymıyor
        (lib/servisKaydi.js → eksikAlanlar)
     2  işareti olmayan, serisi boş talepte seri hâlâ soruluyor
     3  servis kaydı serisiz gidiyor; model, tahmini yıl ve işaret
        yerinde kalıyor, seri uydurulmuyor (veri.js → servisKaydiGonder)
     4  seri sonradan gelirse makine seriyle tamamlanıyor, işaret ve
        tahmini yıl düşüyor */
export function AK27(m) {
  const d = defter('AK-27', 'Seri numarası olmadan açılan talep')
  depoTemizle()
  const { urunId } = dunyaKur(m)
  const sk = m.servisKaydi
  let sira = 0
  /* ElleKayit.jsx → kaydet'in "Seri Numarası Yok" dalının yazdığı talep. */
  const serisiz = () =>
    talebiYaz(m, {
      id: m.depo.uid(),
      no: `SRV26092490${++sira}`,
      createdAt: Date.now(),
      status: 'yeni',
      tur: 'servis',
      ad: MUSTERI.ad,
      tel: MUSTERI.tel,
      telHam: MUSTERI.tel,
      il: MUSTERI.il,
      ilce: MUSTERI.ilce,
      adres: MUSTERI.adres,
      ulke: 'TR',
      ihracat: false,
      aciklama: 'Sınama talebi',
      makine: { id: m.depo.uid(), productId: urunId, seriYok: true, tahminiYil: 2015 },
      elle: true,
      musteriId: null,
      sahip: 'servis',
      servis: { id: SERVIS.id, ad: SERVIS.ad, kademe: 'elle', tarih: Date.now() },
    })

  /* 1 · 2 · Eksik alanlar. */
  const r = serisiz()
  const eksik = sk.eksikAlanlar(r)
  d.yanlis(eksik.includes('seri'), 'serisiz talepte seri eksik sayılmıyor')
  d.yanlis(eksik.includes('urun'), 'serisiz talepte model eksik sayılmıyor')
  d.dogru(
    sk.eksikAlanlar({ ...r, makine: { id: r.makine.id, productId: urunId } }).includes('seri'),
    'işareti olmayan, serisi boş talepte seri soruluyor',
  )

  /* 3 · Servis kaydı serisiz gidiyor: ServisKapanisi seri yoksa
     `makine: null` gönderiyor. */
  const sonuc = m.veri.servisKaydiGonder(r, bitmisKayit({ makine: null }), SERVIS.ad)
  d.esit(sonuc?.hata, undefined, 'serisiz talebin servis kaydı kabul edildi')
  const t = bul(m, r.id)
  d.esit(t?.makine?.seriYok, true, 'seri yok işareti yerinde')
  d.esit(t?.makine?.tahminiYil, 2015, 'tahmini yıl yerinde')
  d.esit(t?.makine?.productId, urunId, 'model yerinde')
  d.esit(t?.makine?.serial, undefined, 'seri uydurulmadı')
  d.esit(t?.hakkedis?.durum, 'bekliyor', 'serisiz işte de hak ediş doğdu')

  /* 4 · Seri sonradan gelirse makine tamamlanıyor. */
  const r2 = serisiz()
  const SERI_SONRA = 'ORK1270-2024-00555'
  m.veri.servisKaydiGonder(r2, bitmisKayit({ makine: { serial: SERI_SONRA, productId: urunId } }), SERVIS.ad)
  const t2 = bul(m, r2.id)
  d.esit(t2?.makine?.serial, SERI_SONRA, 'sonradan gelen seri talebe yazıldı')
  d.esit(t2?.makine?.seriYok, undefined, 'seri gelince "seri yok" işareti düştü')
  d.esit(t2?.makine?.tahminiYil, undefined, 'seri gelince tahmini yıl düştü')

  return d
}

export const SENARYOLAR = [
  AK01, AK02, AK03, AK04, AK05, AK06, AK07, AK08, AK09, AK10, AK11, AK12, AK13, AK14,
  AK15, AK16, AK17, AK18, AK19, AK20, AK21, AK22, AK23, AK24, AK25, AK26, AK27,
]
