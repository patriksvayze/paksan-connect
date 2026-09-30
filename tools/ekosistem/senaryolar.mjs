/* ==========================================================================
   Ekosistem senaryoları — AK-01 … AK-37

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

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { defter, depoTemizle, modulYukle, saat, tohumla, TOHUM, KOK } from './ortam.mjs'
import {
  SERI,
  SERVIS,
  BAYI,
  BAYI_SERVISI,
  MUSTERI,
  MUSTERI2,
  PERSONEL,
  PARCA_PERSONELI,
  dunyaKur,
  musteriKur,
  personelKur,
  personelKaydiEkle,
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

  /* PARÇA YOLDAYKEN İŞ YEDEK PARÇADA (25 Eylül 2026, kullanıcı sınaması
     O2). Takip numarası girilince masa boşalıyor ve iş yedek parça
     rolünün listesinden düşüyordu; yanlış yazılmış numarayı düzeltmek
     isteyen personel talebi bir daha bulamıyordu. Artık parça yolda
     kaldıkça iş listede (veri.js → rolunTalepleri, üçüncü kapı) ve
     ikinci giriş sevki tekrarlamıyor, düzeltiyor: ilk gönderimin tarihi
     ve personeli kalıyor, servise "kargo bilgisi değişti" gidiyor. */
  const turunTalepleri = (rol) => m.veri.rolunTalepleri(m.veri.talepleriGetir(), rol).some((t) => t.id === r.id)
  d.esit(t2?.masa, null, 'takip numarası girilince masa boşaldı')
  d.dogru(turunTalepleri('parca'), 'parça yoldayken yedek parça rolü talebi görüyor')
  d.yanlis(turunTalepleri('satis'), 'satış rolü parçası yoldaki servis işini görmüyor')

  const ilkSevk = t2?.parcaSevk || {}
  const gecmisSayisi = (t2?.gecmis || []).length
  const duzeltme = m.veri.servisParcasiGonderildi(t2, { firma: 'Aras', takipNo: 'SINAMA-2' }, 'Parça Personeli')
  const t2d = bul(m, r.id)
  d.esit(duzeltme?.guncelleme, true, 'ikinci giriş düzeltme sayıldı')
  d.esit(t2d?.parcaSevk?.takipNo, 'SINAMA-2', 'yanlış takip numarası düzeltildi')
  d.esit(t2d?.parcaSevk?.tarih, ilkSevk.tarih, 'gönderim tarihi ilk gönderimin tarihi kaldı')
  d.esit(t2d?.parcaSevk?.personel, ilkSevk.personel, 'parçayı gönderen personel değişmedi')
  d.esit(t2d?.parcaSevk?.guncelleyen, 'Parça Personeli', 'düzelten personel ayrıca yazıldı')
  d.esit((t2d?.gecmis || []).length, gecmisSayisi, 'düzeltme geçmişe ikinci bir satır eklemedi')
  const olaylari = (olay) => servisBildirimleriDepodan(m).filter((b) => b.talepId === r.id && b.olay === olay).length
  d.esit(olaylari('kargoGuncellendi'), 1, 'düzeltme servise "kargo bilgisi değişti" diye bildirildi')

  /* Sevkten ÖNCE açılmış ekranın kopyasıyla yapılan giriş de düzeltme:
     karar depodaki kayıttan veriliyor (guncelTalep). */
  m.veri.servisParcasiGonderildi(t1, { firma: 'Aras', takipNo: 'SINAMA-3' }, 'Sınama Yöneticisi')
  d.esit(bul(m, r.id)?.parcaSevk?.tarih, ilkSevk.tarih, 'sevk öncesi ekran kopyasıyla giriş gönderim tarihini ezmedi')
  d.esit(olaylari('parcaYolda'), 1, 'eski kopya servise ikinci bir "parça yolda" bildirimi yazmadı')

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

  /* Parça takılınca iş yedek parçanın listesinden düşüyor ve kargo
     bilgisi artık yazılmıyor (parça beklenmiyor). */
  d.yanlis(turunTalepleri('parca'), 'parça takılınca talep yedek parça listesinden düştü')
  const gec = m.veri.servisParcasiGonderildi(t3, { firma: 'Aras', takipNo: 'SINAMA-4' }, 'Sınama Yöneticisi')
  d.dogru(Boolean(gec?.hata), 'parça beklenmiyorken kargo girişi reddedildi')
  d.esit(bul(m, r.id)?.parcaSevk?.takipNo, 'SINAMA-3', 'reddedilen giriş sevki değiştirmedi')

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

  /* KARGO KAPANIŞIN İÇİNDE (25 Eylül 2026, kullanıcı sınaması). Takip
     numarası kapanışta sorulmuyordu; personel onu ayrı bir "müşteriye
     not" ile gönderiyor, çiftçiye art arda iki benzer bildirim
     düşüyordu. Kargo talebin `parcaSevk` alanına yazılıyor (cozum'a
     değil: üç uygulamanın okuduğu kapanış nesnesi aynı kalıyor) ve tek
     kapanış bildirimi onu taşıyor (veri.js → talepKapat). */
  m.veri.talepKapat(
    t2,
    { yapilanIs: 'Parça gönderildi', not: '', kargo: { firma: 'Yurtiçi Kargo', takipNo: '123456789012' } },
    'Sınama Yöneticisi',
  )
  const t3 = bul(m, r.id)
  d.esit(t3?.status, 'kapandi', 'talep kapandı')
  d.esit(m.veri.cariHareketleri(SERVIS.id).length, 0, 'müşteri parça talebi cariye HİÇBİR ŞEY yazmıyor')
  d.esit(t3?.parcaSevk?.takipNo, '123456789012', 'takip numarası talebe yazıldı')
  d.esit(t3?.parcaSevk?.firma, 'Yurtiçi Kargo', 'kargo firması talebe yazıldı')
  d.esit(typeof t3?.parcaSevk?.tarih, 'number', 'gönderim tarihi yazıldı')
  d.esit(t3?.cozum?.kargo, undefined, 'kargo kapanış nesnesine sızmadı')
  const kapanis = kisiselBildirimler(m).filter(
    (b) => b.talepNo === r.no && b.baslikAnahtar === 'bildirimler.gonderildiBaslik',
  )
  d.esit(kapanis.length, 1, 'kargo için müşteriye tek bildirim')
  d.esit(kapanis[0]?.metinAnahtar, 'bildirimler.gonderildiMetinKargo', 'bildirim kargolu metni seçti')
  d.dogru(String(kapanis[0]?.degerler?.kargo || '').includes('123456789012'), 'takip numarası bildirimin içinde')

  /* Kargosuz kapanış: sevk uydurulmuyor, metin kargosuz. */
  const r2 = talebiYaz(
    m,
    m.talepOlustur.talepKaydiOlustur(
      talepVerisi('parca', urunId, makineler[0], {
        parcalar: ['Rulman'],
        parcaAdet: { Rulman: 1 },
        fatura: { ad: MUSTERI.ad, tel: MUSTERI.tel, adres: MUSTERI.adres },
        dekont: { id: 'dk-2', ad: 'dekont.pdf', boyut: 1024 },
      }),
      kisi,
    ),
  )
  m.veri.odemeOnayla(r2, 'Sınama Yöneticisi', '')
  m.veri.talepKapat(bul(m, r2.id), { yapilanIs: 'Parça gönderildi', not: '' }, 'Sınama Yöneticisi')
  d.esit(bul(m, r2.id)?.parcaSevk, undefined, 'kargo yazılmayan kapanışta sevk uydurulmadı')
  d.esit(
    kisiselBildirimler(m).find((b) => b.talepNo === r2.no && b.baslikAnahtar === 'bildirimler.gonderildiBaslik')?.metinAnahtar,
    'bildirimler.gonderildiMetin',
    'kargosuz kapanışın bildirimi kargosuz metin',
  )

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
  /* Ekranın "bildirim gitti" cümlesi yazan kuralla aynı yerden
     (veri.js → bildirimAlicilari, 25 Eylül 2026, Y4). */
  d.dogru(m.veri.bildirimAlicilari(r).musteri, 'telefonu eşleşen talepte ekran müşteriye gittiğini biliyor')

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

  /* Eşleşmeyen telefon: müşteri bildirimi YAZILMIYOR.

     BEKLENTİ BİLEREK DEĞİŞTİ (25 Eylül 2026, kullanıcı sınaması Y4).
     Önce kayıt kimliksiz yazılıyor ve `kisisel` damgasıyla kimseye
     gösterilmiyordu: "sonradan doğru hesaba bağlanır" diye. Bağlayan
     kod hiç yazılmadı, veritabanı da böyle satırı kabul etmiyor
     (CK_bildirim_Bildirim_Alici); kayıt yalnız ölçümü kirletiyordu.
     Artık hiç yazılmıyor (veri.js → musteriyeBildir). Eski kaydın
     süzgeçteki davranışını tools/duyuru-hedef-testi.mjs sınıyor. */
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

  d.esit(kisiselBildirimler(m).length, 0, 'eşleşmeyen telefonda müşteri bildirimi YAZILMADI')
  d.esit(servisBildirimleriDepodan(m).length, 1, 'aynı işlem servise yine bildirildi')
  d.yanlis(m.veri.bildirimAlicilari(r2).musteri, 'ekran da müşteriye gitmediğini biliyor')

  /* SERVİSİN ELLE AÇTIĞI HESAPSIZ TALEP TELEFONLA EŞLEŞTİRİLMİYOR
     (25 Eylül 2026, Y4). Telefon kayıtlı bir hesapla TAM eşleşse de
     bildirim o hesaba yazılmıyor: Connect bu talebi müşterinin
     listesinde göstermiyor (lib/musterininTalepleri.js → talepHesabinMi),
     müşteri açamayacağı bir talebin bildirimini alırdı. Müşteri kartı ve
     rapor talebi numarayla o müşteriye bağlamaya devam ediyor; bilinçli
     istisna (lib/musteriEslesmesi.js başı). */
  const elle = talebiYaz(
    m,
    m.talepOlustur.talepKaydiOlustur(
      talepVerisi('servis', d2.urunId, d2.makineler[0], {
        musteriId: null,
        tel: MUSTERI2.tel,
        telHam: MUSTERI2.tel,
        elle: true,
      }),
      d2.kisi,
    ),
  )
  m.veri.talepDurumDegistir(elle, 'incelemede', 'Sınama Yöneticisi')
  d.esit(kisiselBildirimler(m).length, 0, 'servisin elle açtığı hesapsız talep telefonla eşleşen hesaba bildirim düşürmedi')
  d.yanlis(m.veri.bildirimAlicilari(elle).musteri, 'ekran elle açılmış hesapsız talepte müşteriye gitmediğini biliyor')

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

  /* ÜÇÜNCÜ KAPI: GÖNDERDİĞİ PARÇA YOLDAYKEN (25 Eylül 2026, kullanıcı
     sınaması O2). Yedek parça rolü servise gönderdiği garanti parçasının
     işini, parça yolda kaldıkça (durum "parça bekleniyor" VE sevk yazılı)
     görüyor; takip numarası girilip masa boşalınca iş listeden
     düşüyordu. Sevk yoksa ya da servis parçayı takıp kaydı gönderdiyse
     (durum değişti) görmüyor. Ayrı liste: yukarıdaki iddialar değişmedi. */
  const yoldakiler = [
    { id: 'y', tur: 'servis', status: 'parcaBekliyor', parcaSevk: { tarih: 1 } },
    { id: 'h', tur: 'servis', status: 'parcaBekliyor' },
    { id: 'o', tur: 'servis', status: 'onayBekliyor', parcaSevk: { tarih: 1 } },
  ]
  const yoldaGorulen = (rolId) => m.veri.rolunTalepleri(yoldakiler, rolId).map((t) => t.id).join(',')
  d.esit(yoldaGorulen('parca'), 'y', 'yedek parça rolü gönderdiği parça yoldayken işi görüyor, sevksizi ve takılanı görmüyor')
  d.esit(yoldaGorulen('satis'), '', 'satış rolü yoldaki parçanın işini görmüyor')

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

  /* (d) YETKİ BÖLÜNÜNCE ESKİ ROL BİR KEZ TAŞINIYOR (25 Eylül 2026,
     kullanıcı sınaması). Makineye servis atama `servisDuzenle`den ayrılıp
     `makineAtama` oldu. Depoda `servisDuzenle` taşıyan rol dün makineye
     servis atayabiliyordu; taşınmasaydı bu gücü bir sabah sessizce
     kaybederdi. Taşıma yalnız o role ve yalnız bir kez (veri.js →
     rolIzinleriniTasi, izinSurumu 3): izin kimseye yeni dağıtılmıyor,
     personelin kaldırdığı izin bir sonraki okumada geri gelmiyor. */
  const bolunmeOncesi = [
    { id: 'sinama-servis-duzenle', ad: 'Sınama Servis Düzenle', izinler: ['servisDuzenle'], izinSurumu: 2 },
    { id: 'sinama-duzenlemesiz', ad: 'Sınama Düzenlemesiz', izinler: ['talepler'], izinSurumu: 2 },
    { id: 'sinama-kaldirilmis', ad: 'Sınama Kaldırılmış', izinler: ['servisDuzenle'], izinSurumu: 3 },
  ]
  m.depo.save('panelIcerik', {
    ...m.depo.load('panelIcerik', {}),
    roller: [...m.yetkiler.VARSAYILAN_ROLLER, ...bolunmeOncesi],
  })
  m.icerik.icerikTazele()
  d.dogru(m.veri.izinli('sinama-servis-duzenle', 'makineAtama'), 'servisDuzenle taşıyan eski rol atamayı bir kez aldı')
  d.yanlis(m.veri.izinli('sinama-duzenlemesiz', 'makineAtama'), 'izin kimseye sessizce dağıtılmadı')
  d.yanlis(m.veri.izinli('sinama-kaldirilmis', 'makineAtama'), 'taşıma bir kez; kaldırılan izin geri gelmiyor')

  /* Taşınan rol Roller ekranında düzenlenince izni kalıyor. Kayıt,
     katalogta olmayan izni atıyor (veri.js → temizIzinler): katalog
     satırı eksik olsaydı rol atamayı ilk kaydedişte kaybeder, sürümü 3
     yazıldığı için de bir daha taşınmazdı. */
  m.veri.rolGuncelle('sinama-servis-duzenle', { aciklama: 'Sınama' }, 'Sınama')
  const kaydedilen = (m.depo.load('panelIcerik', {}).roller || []).find((r) => r.id === 'sinama-servis-duzenle')
  d.dogru(Boolean(kaydedilen?.izinler?.includes('makineAtama')), 'taşınan rol düzenlenince atama izni depoya yazıldı')
  d.esit(kaydedilen?.izinSurumu, 3, 'taşınan rol sürümüyle birlikte yazıldı')

  m.depo.remove('panelIcerik')
  m.icerik.icerikTazele()

  /* (e) VARSAYILAN ROLLER (25 Eylül 2026). Servis birimi makineye servis
     atar ama servis hesaplarını düzenlemez; atamayı dün servisDuzenle ile
     yapan Yönetici ve Satış yetki kaybetmedi; Yedek Parça atamaz. */
  d.dogru(m.veri.izinli('servis', 'makineAtama'), 'Servis rolü makineye servis atıyor')
  d.yanlis(m.veri.izinli('servis', 'servisDuzenle'), 'Servis rolü servis hesabını düzenlemiyor')
  d.yanlis(m.veri.izinli('parca', 'makineAtama'), 'Yedek Parça rolü atama yapmıyor')
  d.dogru(m.veri.izinli('yonetici', 'makineAtama'), 'Yönetici atama yapıyor')
  d.dogru(m.veri.izinli('satis', 'makineAtama'), 'Satış atamayı kaybetmedi')

  /* İZİN VARSAYILAN LİSTENİN KENDİSİNDE. Yukarıdaki üç okuma taşımadan
     geçiyor: depo boşken varsayılan roller de taşınıyor, servisDuzenle'si
     olan Yönetici ve Satış makineAtama'yı oradan da alırdı. Veritabanı
     tohumu (B03, tools/vt/tohum-uret.mjs) ise listeyi TAŞIMADAN okuyor.
     İzin listede yazılı olmasaydı tarayıcı atama yetkisi verir,
     veritabanı vermezdi; bu fark başka hiçbir yerde görünmüyor. */
  const varsayilanda = (rolId, izin) =>
    Boolean(m.yetkiler.VARSAYILAN_ROLLER.find((r) => r.id === rolId)?.izinler.includes(izin))
  for (const rolId of ['servis', 'yonetici', 'satis']) {
    d.dogru(varsayilanda(rolId, 'makineAtama'), `varsayılan ${rolId} rolü atama iznini listede taşıyor (tohum taşımasız okuyor)`)
  }

  /* (f) DURUM KİLİDİ VE NEDENİ (25 Eylül 2026, kullanıcı sınaması O8).
     Kapanmış servis siparişinde "İptal" çipi yedek parça rolünde hiçbir
     şey yapmıyordu. Kilit kalıyor (iptal servisin bakiyesine para geri
     yazıyor, `talepGeriAc` istiyor) ama nedeni tek işlevden geliyor ve
     sipariş için ayrı söyleniyor (veri.js → durumKilidi). */
  const gonderilmisSiparis = { tur: 'parca', servisSiparisi: true, status: 'kapandi' }
  d.esit(m.veri.durumKilidi(gonderilmisSiparis, 'parca'), 'siparisGonderildi', 'gönderilmiş sipariş yedek parça rolüne kilitli, neden sipariş')
  d.esit(m.veri.durumKilidi(gonderilmisSiparis, 'admin'), null, 'geri açma izni olan için kilit yok')
  d.esit(m.veri.durumKilidi({ tur: 'servis', status: 'kapandi' }, 'parca'), 'kapandi', 'kapanmış talepte neden kapandı')
  d.esit(m.veri.durumKilidi({ ...gonderilmisSiparis, status: 'iptal' }, 'parca'), 'iptal', 'iptal edilmiş talepte neden iptal (ikinci sınama, 26.09.2026)')
  d.esit(m.veri.durumKilidi({ tur: 'satinalma', status: 'bayiyeIletildi' }, 'admin'), 'bayide', 'bayiye iletilen talep admine de kilitli')
  d.esit(m.veri.durumKilidi({ ...gonderilmisSiparis, status: 'incelemede' }, 'parca'), null, 'açık siparişte kilit yok')
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
  /* 25.09.2026: dunyaKur personel kaydını da yazıyor; backoffice
     oturumu o kayda bağlanıyor (tools/ekosistem/tohum.mjs →
     personelKaydiEkle). Yeni depo değil, backoffice'in kendi deposu. */
  'paksan.personel',
  'paksan.requests',
  /* 29.09.2026: dunyaKur servisin gizlilik kabulünü de yazıyor
     (tohum.mjs → servisKur); yoksa Servisim kabul ekranında kalır.
     Eşlemede kayıtlı (servisKabulleri, bilinen boşluk). */
  'paksan.servisKabulleri',
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

  /* 2 · SERVİSİN ELLE AÇTIĞI KİMLİKSİZ İŞ TAŞINMIYOR (25 Eylül 2026,
     inceleme). Eski hesap kayıtlı (demo müşterisi), numarası boşluklu;
     servis aynı numarayı "0532…" diye yazıp hesaba bağlamadan iş açmış.
     Numara değişikliği bu işi hesaba bağlamıyor; birleştirme de yeni
     hesaba taşımamalı (lib/musteriEslesmesi.js → hesabaBaglanirMi).
     Eski hesabın kimliksiz Connect talebi ise taşınıyor. */
  depoTemizle()
  personelKur(m)
  defterKur(m, urunId)
  musteriKur(m, yeni)
  const eskiHesap = { ...MUSTERI, id: 'msc-eski', no: 'MUS-0009', tel: '532 111 22 33', ulke: 'TR', makineler: [] }
  m.depo.save('demoMusteriler', [eskiHesap])
  const ortak = { tur: 'servis', status: 'yeni', createdAt: Date.now(), ad: MUSTERI.ad, makine: { serial: SERI.atanmis, productId: urunId } }
  talebiYaz(m, { ...ortak, id: 'elle-is', no: 'SRV2508140003', elle: true, musteriId: null, tel: '0532 111 22 33', telHam: '05321112233', sahip: 'servis', servis: { id: SERVIS.id, ad: SERVIS.ad } })
  talebiYaz(m, { ...ortak, id: 'eski-connect', no: 'SRV2508140004', musteriId: null, telUlke: 'TR', tel: '+90 532 111 22 33', telHam: '5321112233' })
  const talep2 = m.numaraTalebi.seriCakismasiTalebi({
    user: yeni,
    eskiUlke: 'TR',
    eskiTel: eskiHesap.tel,
    seri: SERI.atanmis,
    eskiHesap: { musteriId: eskiHesap.id, musteriNo: eskiHesap.no },
  })
  d.esit(m.veri.hesapBirlesmeOzeti(talep2).talep, 1, 'birleştirme özeti yalnız hesabın talebini sayıyor, servisin elle işini değil')
  m.veri.numaraTalebiKarar(talep2, true, 'Sınama Yöneticisi', '')
  d.esit(bul(m, 'eski-connect')?.musteriId, yeni.id, 'eski hesabın kimliksiz Connect talebi yeni hesaba taşındı')
  d.esit(bul(m, 'elle-is')?.musteriId ?? null, null, 'servisin elle açtığı kimliksiz iş yeni hesaba taşınmadı')
  d.esit(bul(m, 'elle-is')?.telHam, '05321112233', 'elle işin numarası yeni hesabın numarasıyla ezilmedi')
  m.veri.talepDurumDegistir(bul(m, 'elle-is'), 'incelemede', 'Sınama Yöneticisi')
  d.esit(
    kisiselBildirimler(m).filter((b) => b.talepNo === 'SRV2508140003').length,
    0,
    'birleştirmeden sonra elle işin bildirimi yeni hesaba yazılmadı',
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

  /* Servisin kendi işlemleri kendisine bildirilmiyor.

     SERVİSİM RANDEVUSU YALNIZ GÜN (25 Eylül 2026, kullanıcı sınaması:
     saati girilmeyen randevu "03:00" görünüyordu). Servisim randevuyu
     gerçekte böyle yazıyor: gün kutusunun değeri o günün YEREL
     başlangıcı, saat yok (lib/tarih.js → gunlukRandevu). Sınama
     Türkiye saatinde koşuyor (ortam.mjs → SAAT_DILIMI); UTC'de
     `new Date('2026-09-25')` ile yerel gece yarısı aynı anı verir ve
     bu kusur görünmezdi. */
  const tarih = await ctx.modulYukle('/src/lib/tarih.js')
  m.veri.talepPlanla(
    bul(m, r.id),
    { ...tarih.gunlukRandevu('2026-09-25'), is: 'Servis ziyareti', gorusuldu: true },
    SERVIS.ad,
    { servisten: true },
  )
  m.veri.talepNotEkle(bul(m, r.id), 'müşteriyi aradım', SERVIS.ad, { servisten: true })
  d.esit(bildirimler().length, sayi, 'servisin kendi randevusu ve notu kendisine bildirilmedi')

  const splan = bul(m, r.id)?.plan || {}
  d.esit(splan.saatBelirtildi, false, 'Servisim randevusu saatsiz yazılıyor')
  const g = new Date(splan.tarih)
  d.esit(`${g.getDate()}.${g.getMonth() + 1} ${g.getHours()}:${g.getMinutes()}`, '25.9 0:0', 'gün yerel gece yarısında başlıyor, 03:00 değil')
  d.esit(tarih.randevuSaatliMi(splan), false, 'saatsiz randevu saatli okunmuyor')
  d.esit(
    tarih.randevuSaatliMi({ tarih: Date.UTC(2026, 8, 25), tarihYazi: '25.09.2026' }),
    false,
    'alanı olmayan eski Servisim randevusu (UTC gece yarısı, yazıda saat yok) saatsiz sayılıyor',
  )
  d.esit(
    tarih.randevuSaatliMi({ tarih: new Date(2026, 8, 25, 14, 30).getTime(), tarihYazi: '25.09.2026 14:30' }),
    true,
    'backoffice planı (saatli) saatli kalıyor',
  )

  /* Connect'in hatırlatması: saatli randevu saatinden 12 saat sonra
     düşüyor, saatsiz randevu günün sonuna kadar duruyor
     (lib/bildirimler.js). Saat bugünün başına göre 22:30'a sarılıyor:
     "12 saat" kuralında hatırlatma öğlen düşmüş olurdu. */
  const bl = await ctx.modulYukle('/src/lib/bildirimler.js')
  const bugun = tarih.gunBasi(saat.simdi())
  const gunluk = {
    ...m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi),
    status: 'planlandi',
    plan: { tarih: bugun, tarihYazi: 'bugün', is: 'Servis ziyareti', saatBelirtildi: false },
  }
  const sarma = (bugun + 22.5 * 3600000 - saat.simdi()) / 86400000
  saat.ileri(sarma)
  d.dogru(
    bl.bildirimListesi({ requests: [gunluk] }).some((b) => b.id === 'randevu-' + gunluk.id),
    'saatsiz randevu gün sonuna kadar hatırlatılıyor',
  )
  d.yanlis(
    bl.bildirimListesi({ requests: [{ ...gunluk, plan: { ...gunluk.plan, saatBelirtildi: true } }] })
      .some((b) => b.id === 'randevu-' + gunluk.id),
    'aynı saatteki saatli randevu 12 saat sonra listeden düştü',
  )
  saat.ileri(-sarma)

  /* PAKSAN servise not yazdı. */
  m.veri.talepNotEkle(bul(m, r.id), 'iki koli gitti', 'Sınama Yöneticisi', { servise: true })
  d.esit(sonOlay(), 'not', 'PAKSAN\'ın notu servise bildirildi')

  /* PAKSAN DEVREDİLMEMİŞ İŞE RANDEVU VEREMİYOR (29 Eylül 2026,
     kullanıcının kararı; veri.js → paksanRandevuEngeli). Randevu
     servisin; PAKSAN ancak servisin devrettiği işte gün verebiliyor. */
  const oncekiPlan = bul(m, r.id)?.plan
  const red = m.veri.talepPlanla(
    bul(m, r.id),
    { tarih: saat.simdi() + 2 * 86400000, tarihYazi: '2 gün sonra', is: 'Ziyaret', gorusuldu: true, saatBelirtildi: true },
    'Sınama Yöneticisi',
  )
  d.dogru(typeof red?.hata === 'string', 'PAKSAN devredilmemiş işe randevu veremedi')
  d.esit(bul(m, r.id)?.plan?.tarih, oncekiPlan?.tarih, 'servisin randevusu yerinde kaldı')
  m.veri.destekTalepEt(bul(m, r.id), 'Sınama: destek', SERVIS.ad)

  /* PAKSAN devredilen servis talebine gün verdi: servis bunu "siparişinizin
     gönderim günü" diye okumamalı, ziyaret günü diye okumalı. */
  /* Backoffice'in plan formu gün ve saat soruyor: `saatBelirtildi: true`
     (ekranlar/Talepler.jsx → PlanFormu). */
  m.veri.talepPlanla(
    bul(m, r.id),
    { tarih: saat.simdi() + 2 * 86400000, tarihYazi: '2 gün sonra', is: 'Ziyaret', gorusuldu: true, saatBelirtildi: true },
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
  const { urunId } = dunyaKur(m)

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

  /* SERVİSİM'İN AÇTIĞI MAKİNE SERVİSSİZ SAYILIYOR (25 Eylül 2026,
     kullanıcı sınaması Y5). Servisim'in elle kaydı makineye servis
     atamıyor; kaydeden servis ayrı alanda (lib/makineKaydi.js →
     servisMakineKaydi). Atamayı PAKSAN yapıyor ve makine o zamana kadar
     Kayıtlı Makineler sayacında duruyor. */
  const YENI = 'ORK1270-2024-00777'
  m.makineKaydi.servisMakineKaydi({
    seri: YENI, productId: urunId, musteriAd: 'Kayıtsız Kişi', il: 'Konya',
    kaydedenServisId: SERVIS.id, kaydedenServisAd: SERVIS.ad,
  })
  d.esit(
    sayilan().map((s) => m.serial.normalizeSerial(s)).join(','),
    m.serial.normalizeSerial(YENI),
    'Servisim\'in açtığı makine servisi atanmamış sayılıyor',
  )

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

  /* İŞLERİM ROZETİ YENİ İŞİ SAYIYOR (25 Eylül 2026, kullanıcı sınaması).
     Rozet açık işlerin tamamını sayıyor, "9+" okunmamış bildirim
     sanılıyordu. Artık yalnız servisin el sürmediği açık iş: "Yeni"
     sekmesinin sayısıyla aynı (servis/isDurumu.js → yeniIsSayisi). */
  const rozetListesi = [
    talep({ id: 'y1' }),
    talep({ id: 'y2', createdAt: yeniAcilan }),
    talep({ id: 'r', plan: { tarih: saat.simdi() + 86400000 } }),
    talep({ id: 'o', status: 'onayBekliyor' }),
    talep({ id: 'k', status: 'kapandi' }),
    talep({ id: 's', servisSiparisi: true }),
  ]
  d.esit(is.yeniIsSayisi(rozetListesi), 2, 'İşlerim rozeti yalnız el sürülmemiş açık işleri sayıyor')

  /* "YENİ" SEKMESİNDE GECİKEN BAŞTA (aynı gün). 48 saati geçen iş
     listenin dibinde kalıyordu; şerit hangi işin geciktiğini
     göstermiyordu. Geciken işler başta, en eskisi önce; gerisi geldiği
     sırada (isDurumu.js → yeniIsSirasi). */
  const c = talep({ id: 'c', createdAt: saat.simdi() - 2 * 3600000 })
  const a = talep({ id: 'a', createdAt: saat.simdi() - 72 * 3600000 })
  const b = talep({ id: 'b', createdAt: saat.simdi() - 96 * 3600000 })
  d.esit(is.yeniIsSirasi([c, a, b]).map((t) => t.id).join(), 'b,a,c', 'Yeni sekmesinde 48 saati geçenler başta, en eskisi önce')

  /* "DEVAM EDEN"DE SIRASI SERVİSE GELEN İŞ ÜSTTE (29 Eylül 2026,
     kullanıcının onayı). Sırası serviste olan iş üstte: geçmiş ve bugünkü
     randevu, sonra parçası yola çıkmış iş, sonra ileri tarihli randevu;
     parça hazırlanan, kaydı incelenen ve PAKSAN'a devredilmiş iş altta,
     geldiği sırada (isDurumu.js → devamSirasi). Liste en yeni önce
     geliyor. Bugünkü randevu saatsiz: günün sonuna sayılıyor ama yine
     de parçanın önünde. */
  const GUN = 86400000
  const bugunBasi = new Date(saat.simdi()).setHours(0, 0, 0, 0)
  const devam = [
    talep({ id: 'onay', status: 'onayBekliyor' }),
    talep({ id: 'ileri', status: 'planlandi', plan: { tarih: saat.simdi() + 3 * GUN } }),
    talep({ id: 'hazir', status: 'parcaBekliyor' }),
    talep({ id: 'yolda', status: 'parcaBekliyor', parcaSevk: { tarih: saat.simdi() - 1 * GUN } }),
    talep({ id: 'bugun', status: 'planlandi', plan: { tarih: bugunBasi, saatBelirtildi: false } }),
    talep({ id: 'devir', status: 'incelemede', sahip: 'paksan', devir: { tarih: eski } }),
    talep({ id: 'gecmis', status: 'planlandi', plan: { tarih: saat.simdi() - 2 * GUN } }),
  ]
  d.esit(
    is.devamSirasi(devam).map((t) => t.id).join(),
    'gecmis,bugun,yolda,ileri,onay,hazir,devir',
    'Devam Eden: geçmiş ve bugünkü randevu, yolda parça, ileri randevu; PAKSAN\'ı bekleyen altta, geldiği sırada',
  )

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
   makineAtamasiniKaydet).

   DEFTER AYRIMI (25 Eylül 2026, kullanıcı sınaması Y5): Servisim'in
   açtığı satır makineye servis atamıyor; kaydeden servis
   `kaydedenServisId`de (lib/makineKaydi.js → servisMakineKaydi). 3. ve
   4. adımın iddiaları bunu taşıyor. Parametre adları da aynı gün
   değişti; eski adla çağrı sessizce yok sayılırdı.

   ATAMA BİLDİRİMİ MAKİNENİN GÜNCEL DURUMU (aynı gün): 7. adımın başlık
   iddiaları ve 8. adım (yanlış atama düzeltilince, bayi kaldırılınca). */
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
    kaydedenServisId: SERVIS.id,
    kaydedenServisAd: SERVIS.ad,
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
    kaydedenServisId: SERVIS.id, kaydedenServisAd: SERVIS.ad,
  })
  d.esit(ilk.yeni, true, 'yeni seri için satır açıldı')
  d.esit(ilk.kayit.kaynak, 'servis', 'kaynağı servis')
  /* DEFTER AYRIMI (25 Eylül 2026, kullanıcı sınaması Y5): Servisim'in
     açtığı satır makineye servis ATAMIYOR; kaydeden servis ayrı alanda.
     Atamayı PAKSAN yapıyor, makine o zamana kadar servissiz sayılıyor. */
  d.esit(ilk.kayit.servisId, null, 'Servisim kaydı makineye servis atamadı')
  d.esit(ilk.kayit.kaydedenServisId, SERVIS.id, 'kaydeden servis ayrı alanda')
  d.esit(m.servisAtama.makineninServisi(YENI), null, 'makine servisi atanmamış sayılıyor')
  /* Servis kayıtlı müşteriyi telefonundan bulduysa satır o hesaba
     bağlanıyor (form alanı gönderiyordu, işlev sessizce null yazıyordu). */
  const hesapli = mk.servisMakineKaydi({
    seri: 'ORK1270-2024-00888', productId: urunId, musteriId: MUSTERI2.id, musteriNo: MUSTERI2.no,
    musteriAd: MUSTERI2.ad, kaydedenServisId: SERVIS.id, kaydedenServisAd: SERVIS.ad,
  })
  d.esit(hesapli.kayit.musteriId, MUSTERI2.id, 'kayıtlı müşterinin hesabı satıra yazıldı')

  /* 4. Müşteri o makineyi Connect'ten ekliyor: hesapsız satırı sahipleniyor. */
  const sahiplen = await mk.makineKaydet({ serial: YENI, productId: urunId }, MUSTERI2)
  d.esit(satirSayisi(YENI), 1, 'sahiplenmek ikinci satır açmadı')
  d.esit(sahiplen.kayit?.musteriId, MUSTERI2.id, 'satır müşterinin hesabına geçti')
  d.esit(sahiplen.kayit?.kaynak, 'servis', 'ilk kaynağı (servis) yerinde kaldı')
  d.esit(sahiplen.kayit?.kaydedenServisId, SERVIS.id, 'makineyi kaydeden servis yerinde kaldı')
  d.esit(sahiplen.kayit?.servisId, null, 'sahiplenmek makineye servis atamadı')

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
  d.esit(b[0]?.baslikAnahtar, 'bildirimler.servisAtandiBaslik', 'ilk atamada "atandı" başlığı')
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
  d.esit(bildirimler()[0]?.baslikAnahtar, 'bildirimler.servisDegistiBaslik', 'servis değişince "değişti" başlığı')

  /* Hesapsız makinede kimseye bildirim yazılmıyor. */
  const hesapsiz = mk.servisMakineKaydi({ seri: YENI, productId: urunId, musteriAd: 'Kayıtsız', kaydedenServisId: null })
  const onceSay = bildirimler().length
  m.veri.makineAtamasiniKaydet(hesapsiz.kayit.id, { servisId: SERVIS.id, servisAd: SERVIS.ad }, { ozet: 'x', personel: 'Deneme' })
  d.esit(bildirimler().length, onceSay, 'hesapsız makinede bildirim yazılmadı')

  /* 8. YANLIŞ ATAMA DÜZELTİLİNCE (25 Eylül 2026, kullanıcı sınaması).
     Personel yanlış servisi seçip düzeltince çiftçinin listesinde iki
     servis adı yan yana kalıyordu; servisi kalmayan makinenin sahibine
     hiç haber gitmiyordu. Atama bildirimi bir olay değil, makinenin
     bugünkü durumu: Connect aynı makinenin yalnız SON atama bildirimini
     gösteriyor (lib/bildirimler.js → sonAtamaBildirimleri), yeni
     bildirim "değişti" ya da "yeniden belirleniyor" diyor
     (veri.js → makineAtamasiniKaydet). */
  const anahtar = m.serial.normalizeSerial(SERI.sahipsiz)
  const listede = () =>
    bl.bildirimListesi({ requests: [], user: MUSTERI, makineler })
      .filter((x) => x.tur === 'makine' && m.serial.normalizeSerial(x.degerler?.seri) === anahtar)
  d.esit(listede().length, 1, 'makinenin listede tek atama bildirimi var')

  /* Yanlış atama düzeltiliyor: doğrudan atama kalkıyor, bayisinin
     (ankara) servisi geçiyor. */
  m.veri.makineAtamasiniKaydet(sahipsiz.id, { servisId: null, servisAd: '' }, { ozet: 'düzeltme', personel: 'Deneme' })
  const bayininServisi = m.servisAtama.makineninServisi(SERI.sahipsiz)?.servis
  d.dogru(Boolean(bayininServisi) && bayininServisi.id !== SERVIS.id, 'atama kalkınca bayinin servisi geçerli')
  d.esit(bildirimler()[0]?.baslikAnahtar, 'bildirimler.servisDegistiBaslik', 'düzeltme "değişti" diye gitti')
  d.esit(listede().length, 1, 'yanlış atamanın bildirimi listeden düştü')
  d.esit(listede()[0]?.degerler?.servis, bayininServisi?.ad, 'listede kalan bildirim güncel servisi söylüyor')

  /* Bayi de kalkıyor: makinenin servisi kalmıyor. */
  m.veri.makineAtamasiniKaydet(sahipsiz.id, { bayiId: null, bayiAd: '' }, { ozet: 'bayi kaldırıldı', personel: 'Deneme' })
  d.yanlis(Boolean(m.servisAtama.makineninServisi(SERI.sahipsiz)?.servis), 'makinenin servisi kalmadı')
  d.esit(bildirimler()[0]?.metinAnahtar, 'bildirimler.servisKaldirildiMetin', 'servisi kalmayan makinenin sahibine haber gitti')
  d.esit(listede().length, 1, 'listede yine tek bildirim')
  d.esit(listede()[0]?.metinAnahtar, 'bildirimler.servisKaldirildiMetin', 'listede eski servis değil "yeniden belirleniyor" duruyor')

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

  /* SİPARİŞ ÖZETİ TEK YERDEN (25 Eylül 2026, kullanıcı sınaması O1).
     Servisim'in başarı ekranı KDV hariç ara toplamı ve `parcaAdet`ten
     sayılan adedi gösteriyordu; liste ve onay penceresi KDV dâhil
     tutarı. Artık başarı ekranı da listedeki kartın kaynağından okuyor
     (lib/servisKaydi.js → siparisOzeti). */
  const ozet = m.servisKaydi.siparisOzeti(a.talep)
  d.esit(ozet.toplam, toplam, 'başarı ekranının tutarı listedeki kartın KDV dâhil tutarı')
  d.esit(ozet.kalem, PARCALAR.length, 'başarı ekranı kalemi satırlardan sayıyor')
  d.esit(ozet.adet, PARCALAR.reduce((t, x) => t + x.adet, 0), 'başarı ekranı adedi satırlardan sayıyor (kalem sayısı değil)')

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
  /* SINIR: kullanılabilir bakiye siparişin tutarına TAM eşitken sipariş
     kabul ediliyor. Ekranın "yeter" kararı ve veri katmanının reddi tek
     işlevden (lib/servisFiyat.js → bakiyeYetmiyor; 25 Eylül 2026,
     inceleme); ikisi ayrışırsa ekranın "yeter" dediği sipariş reddedilir. */
  bakiyeYukle(m, toplam - m.veri.bakiyeDurumu(SERVIS.id).kullanilabilir)
  d.esit(m.veri.bakiyeDurumu(SERVIS.id).kullanilabilir, toplam, 'kullanılabilir bakiye siparişin tutarına eşit (kurgu doğru)')
  const sinir = siparisVer('bakiye')
  d.esit(sinir.sonuc?.hata, undefined, 'bakiye siparişin tutarına tam yeterken sipariş kabul edildi')
  tasan.push(sinir)
  /* "BAKİYE YETMİYOR" CÜMLESİ REDDİN KURALIYLA AYNI (25 Eylül 2026,
     kullanıcı sınaması). Servisim'de "Bakiyemden Düşülsün" seçeneği
     açıklamasız pasif kalıyordu; cümle artık veri katmanının reddiyle
     aynı kuraldan (lib/servisFiyat.js → bakiyeYetmiyor). */
  const kullanilabilir = m.veri.bakiyeDurumu(SERVIS.id).kullanilabilir
  d.dogru(sf.bakiyeYetmiyor(kullanilabilir, toplam), 'reddedilecek siparişte ekran "bakiye yetmiyor" diyor')
  d.yanlis(sf.bakiyeYetmiyor(toplam, toplam), 'tam yeten bakiyede cümle çıkmıyor')
  d.yanlis(sf.bakiyeYetmiyor(0, 0), 'tutarı olmayan siparişte cümle çıkmıyor')
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
  /* ADET, KALEM DEĞİL (25 Eylül 2026, kullanıcı sınaması): adedi 2 olan
     tek satırlık zincir iptal edilince Servisim "1 parçayı siparişten
     çıkardı" diyordu (lib/servisKaydi.js → satirlarinAdedi). */
  d.esit(sk.satirlarinAdedi(t1, t1?.kalemIptalleri?.[0]?.satirlar), 2, 'iptal edilen zincirin adedi 2 sayılıyor, kalem sayısı değil')

  /* 5 · Servise bildirim. */
  const b1 = bildirimi(s.talep.id)
  d.dogru(Boolean(b1), 'servise kalem iptali bildirimi gitti')
  d.esit(b1?.degerler?.tutar, toplam - net1, 'bildirim düşülmeyecek tutarı taşıyor')
  d.esit(b1?.degerler?.odeme, 'bakiye', 'bildirim ödeme biçimini taşıyor')
  d.esit(b1?.degerler?.neden, IPTAL.neden, 'bildirim iptal sebebini taşıyor')
  d.esit(b1?.degerler?.adet, 2, 'bildirim iptal edilen parça adedini taşıyor')
  d.esit(b1?.degerler?.kalem, 1, 'bildirim kalem sayısını ayrı taşıyor')

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

/* ========================================================== AK-28 */

/* ESKİ EKRANDAN İKİNCİ İŞLEM (24 Eylül 2026).

   Kod okunarak bulundu: backoffice işlevleri kararı ekranın elindeki
   talep nesnesinden veriyordu. İki sekme ya da iki personel aynı talebi
   açıkken ikinci işlem eski duruma göre yürüyordu. Artık para ya da durum
   değiştiren işlevler depodaki güncel kaydı okuyor (veri.js →
   guncelTalep). Aynı gün düzeltilen iki komşu hata da burada:
   Servisim'de şifre değiştirilince oturumun yanlış depoya yazılması ve
   Connect talebinin açanın hesap kimliğini taşımaması.

   Taşıdıkları:
     1  eski kopyayla ikinci hak ediş onayı reddediliyor; cariye tek
        alacak, alacak talebin kimliğini taşıyor
     2  onaylanmış hak ediş eski kopyayla reddedilemiyor ve düzeltilemiyor
     3  ikinci ödeme onayı hiçbir şey yazmıyor, müşteriye ikinci bildirim yok
     4  kapanmış talep eski kopyayla yeniden kapatılamıyor, ikinci bildirim yok
     5  servisin şifresi değişince oturum deposundaki oturum "ilk giriş"
        olmaktan çıkıyor (yenilemede şifre ekranı dönmüyor)
     6  Connect talebi açanın hesap kimliğini taşıyor
     7  reddedilen işin talebine eski kayıt ekranından kayıt
        gönderilemiyor: ret kesin (25 Eylül 2026, kullanıcı sınaması;
        veri.js → servisKaydiGonder kapanmış talebe yazmıyor)
     8  Servisim'de açık kalmış pencereden kapanmış işe yazılamıyor:
        randevu, garanti dışı kapanış, "Parçayı Taktım", iptal (25 Eylül
        2026, inceleme; veri.js → servisinKapaliIsEngeli). Backoffice'in
        yetkili çağrısı bu kapıdan geçmiyor. */
export async function AK28(m) {
  const d = defter('AK-28', 'Eski ekrandan ikinci işlem')
  depoTemizle()
  const { urunId, kisi, makineler } = dunyaKur(m)
  const PERSONEL = 'Sınama Yöneticisi'
  const alacaklar = (talepId) =>
    m.veri.cariHareketleri(SERVIS.id).filter((h) => h.tur === 'alacak' && h.talepNo === bul(m, talepId)?.no)

  /* 1 · Hak edişi iki sekme onaylıyor. */
  const r = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi))
  m.veri.servisKaydiGonder(r, bitmisKayit(), SERVIS.ad)
  const ekrandaki = bul(m, r.id)
  d.esit(ekrandaki?.status, 'onayBekliyor', 'hak ediş onay bekliyor')
  const o1 = m.veri.hakkedisOnayla(ekrandaki, PERSONEL)
  d.esit(o1?.hata, undefined, 'ilk onay geçti')
  const o2 = m.veri.hakkedisOnayla(ekrandaki, PERSONEL)
  d.dogru(Boolean(o2?.hata), 'eski kopyayla ikinci onay reddedildi')
  d.esit(alacaklar(r.id).length, 1, 'cariye tek alacak yazıldı')
  d.esit(alacaklar(r.id)[0]?.talepId, r.id, 'alacak talebin kimliğini taşıyor')

  /* 2 · Onaylanmış hak ediş eski kopyayla reddedilemiyor, düzeltilemiyor. */
  const red = m.veri.hakkedisReddet(ekrandaki, 'Sınama gerekçesi', PERSONEL)
  d.dogru(Boolean(red?.hata), 'onaylanmış hak ediş reddedilemedi')
  d.esit(bul(m, r.id)?.hakkedis?.durum, 'onaylandi', 'hak ediş onaylı kaldı')
  const duz = m.veri.hakkedisDuzelt(ekrandaki, bitmisKayit({ km: 400 }), 'Sınama gerekçesi', PERSONEL)
  d.dogru(Boolean(duz?.hata), 'onaylanmış hak ediş düzeltilemedi')
  d.esit(bul(m, r.id)?.servisKaydi?.km, bitmisKayit().km, 'kayıt değişmedi')

  /* 3 · 4 · Müşterinin parça talebi: iki ödeme onayı, iki kapanış. */
  const p = talebiYaz(
    m,
    m.talepOlustur.talepKaydiOlustur(
      talepVerisi('parca', urunId, makineler[0], {
        parcalar: ['Rulman'],
        parcaAdet: { Rulman: 1 },
        fatura: { ad: MUSTERI.ad, tel: MUSTERI.tel, adres: MUSTERI.adres },
        dekont: { id: 'dk-28', ad: 'dekont.pdf', boyut: 1024 },
      }),
      kisi,
    ),
  )
  const bildirimSayisi = () => kisiselBildirimler(m).filter((b) => b.talepNo === p.no).length
  m.veri.odemeOnayla(p, PERSONEL, '')
  const odemeSonrasi = bildirimSayisi()
  const od2 = m.veri.odemeOnayla(p, PERSONEL, '')
  d.esit(od2?.zatenOnayli, true, 'ikinci ödeme onayı zaten onaylı dedi')
  d.esit(bildirimSayisi(), odemeSonrasi, 'ikinci ödeme onayı müşteriye bildirim göndermedi')
  const acik = bul(m, p.id)
  m.veri.talepKapat(acik, { yapilanIs: 'Parça gönderildi', not: '' }, PERSONEL)
  const kapanisSonrasi = bildirimSayisi()
  const k2 = m.veri.talepKapat(acik, { yapilanIs: 'Parça gönderildi', not: '' }, PERSONEL)
  d.dogru(Boolean(k2?.hata), 'kapanmış talep eski kopyayla yeniden kapatılamadı')
  d.esit(bildirimSayisi(), kapanisSonrasi, 'ikinci kapanış müşteriye bildirim göndermedi')

  /* 5 · Servisin ilk girişte şifre değiştirmesi. */
  m.depo.oturumKaydet('servisOturum', { servisId: SERVIS.id, no: SERVIS.no, ad: SERVIS.ad, il: SERVIS.il, ilkGiris: true, giris: Date.now() })
  const sd = await m.veri.servisSifresiniDegistir(SERVIS.id, '654321')
  d.esit(sd?.hata, undefined, 'şifre değişti')
  d.esit(m.veri.servisOturumuGetir()?.ilkGiris, false, 'yeniden okunan oturum artık ilk giriş değil')

  /* 6 · Connect talebi açanın hesabını taşıyor (veride kimlik yokken). */
  const { musteriId: _yok, ...kimliksiz } = talepVerisi('servis', urunId, makineler[0])
  d.esit(m.talepOlustur.talepKaydiOlustur(kimliksiz, kisi).musteriId, kisi.id, 'talep açanın hesap kimliğini taşıyor')

  /* 7 · RET KESİN. Hak ediş reddi talebi kapatıyor; personel "düzeltip
     yeniden gönderin" yazsa da servisin gönderme yolu yoktu, açık kalmış
     eski kayıt ekranından gönderilen kayıt ise kapanmış talebi yeniden
     onaya açıyordu. Kullanıcının kararı: ret kesin kalıyor, düzeltilebilir
     sorun için personel Düzelt'i kullanıyor. */
  const r7 = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi))
  m.veri.servisKaydiGonder(r7, bitmisKayit(), SERVIS.ad)
  const servisEkrani = bul(m, r7.id)
  const ret = m.veri.hakkedisReddet(bul(m, r7.id), 'Garanti süresi dolmuş', PERSONEL)
  d.esit(ret?.hata, undefined, 'hak ediş reddedildi')
  const yeniden = m.veri.servisKaydiGonder(servisEkrani, bitmisKayit({ km: 60 }), SERVIS.ad)
  d.dogru(Boolean(yeniden?.hata), 'reddedilen işin talebine kayıt gönderilemedi')
  d.esit(bul(m, r7.id)?.status, 'kapandi', 'talep kapalı kaldı')
  d.esit(bul(m, r7.id)?.hakkedis?.durum, 'reddedildi', 'ret kesin kaldı')
  d.esit((bul(m, r7.id)?.oncekiKayitlar || []).length, 0, 'reddedilen kayıt arşive itilmedi')

  /* 8 · SERVİSİM'DE AÇIK PENCERE. Servis talebin detayında Randevu (ya
     da "Talebi Kapat", İptal) penceresini açmış; PAKSAN o sırada talebi
     başka sekmede iptal ediyor. Pencerenin elindeki kopya hâlâ "yeni".
     Kaydet'e basılınca iptal edilmiş talep "planlandı"ya dönüyor, müşteriye
     randevu bildirimi gidiyordu. */
  const r8 = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi))
  const pencere = bul(m, r8.id)
  m.veri.talepIptal(bul(m, r8.id), { neden: 'Sınama iptali' }, PERSONEL)
  const r8Bildirim = () => kisiselBildirimler(m).filter((b) => b.talepNo === r8.no).length
  const iptalSonrasi = r8Bildirim()
  const randevu = { tarih: Date.now() + 86400000, tarihYazi: 'yarın', is: 'Servis ziyareti', gorusuldu: true, saatBelirtildi: false }
  const s1 = m.veri.talepPlanla(pencere, randevu, SERVIS.ad, { servisten: true })
  d.dogru(Boolean(s1?.hata), 'iptal edilmiş talebe açık pencereden randevu yazılamadı')
  const s2 = m.veri.talepKapat(pencere, { ozet: m.servisKaydi.GARANTI_DISI_OZET, garantiDisi: true }, SERVIS.ad, { servisten: true })
  d.dogru(Boolean(s2?.hata), 'iptal edilmiş talep açık pencereden garanti dışı kapatılamadı')
  const s3 = m.veri.talepIptal(pencere, { neden: 'Müşteri vazgeçti' }, SERVIS.ad, { servisten: true })
  d.dogru(Boolean(s3?.hata), 'iptal edilmiş talep açık pencereden ikinci kez iptal edilemedi')
  d.esit(bul(m, r8.id)?.status, 'iptal', 'talep iptal kaldı')
  d.esit(bul(m, r8.id)?.plan ?? null, null, 'iptal edilmiş talebe randevu yazılmadı')
  d.esit(r8Bildirim(), iptalSonrasi, 'müşteriye iptalden sonra bildirim gitmedi')

  /* Kapanmış iş: PAKSAN kapattı, servisin "Parçayı Taktım" onayı açık. */
  const r8b = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi))
  const pencereB = bul(m, r8b.id)
  m.veri.talepKapat(bul(m, r8b.id), { yapilanIs: 'Sınama', ozet: 'Sınama kapanışı' }, PERSONEL)
  const s4 = m.veri.talepDurumDegistir(pencereB, 'kapandi', SERVIS.ad, { servisten: true })
  d.dogru(Boolean(s4?.hata), 'kapanmış talepte açık "Parçayı Taktım" onayı reddedildi')
  const s5 = m.veri.talepIptal(pencereB, { neden: 'Müşteri vazgeçti' }, SERVIS.ad, { servisten: true })
  d.dogru(Boolean(s5?.hata), 'kapanmış talep servisten iptal edilemedi')
  d.esit(bul(m, r8b.id)?.status, 'kapandi', 'talep kapalı kaldı')
  /* Backoffice'in yetkili çağrısı kapıdan geçmiyor: kapanmış talebi iptal
     etmek (gönderilmiş siparişin iadesi) personelin işi. */
  m.veri.talepIptal(bul(m, r8b.id), { neden: 'Sınama düzeltmesi' }, PERSONEL)
  d.esit(bul(m, r8b.id)?.status, 'iptal', 'backoffice kapanmış talebi iptal edebiliyor (kapı yalnız servisin)')

  return d
}

/* ========================================================== AK-29 */

/* SERVİS SİPARİŞİ MÜŞTERİYE BİLDİRİM YAZMIYOR (25 Eylül 2026, kullanıcı
   sınaması Y4).

   Servisin kendi parça siparişi bir yedek parça talebi; müşterisi yok,
   müşterisi servisin kendisi ve kaydın telefonu servisin telefonu. O
   telefon bir Connect hesabıyla eşleşince (servisin sahibi aynı numarayla
   Connect kullanıyor) PAKSAN'ın siparişteki her işlemi o hesaba "talebiniz
   ..." bildirimi yazıyordu; backoffice de "müşteriye bildirim gitti"
   diyordu. Artık servis siparişinin müşteri alıcısı yok (veri.js →
   bildirimAlicisi) ve ekran aynı kuralı soruyor (bildirimAlicilari).
   Haber servise gidiyor (serviseBildir).

   KURGU BİLEREK: siparişin telefonu sınama müşterisinin, yani hesap
   olarak kayıtlı bir numara. Kapı kalksa bildirim o hesaba düşer.

   Taşıdıkları:
     1     ekranın alıcı sorusu: müşteri yok, servis var
     2-8   PAKSAN'ın her işlemi (durum, gönderim günü, ödeme onayı,
           "müşteriye" işaretli not, kısmi ve kalan gönderim, iptal)
           müşteriye yazmıyor, servise doğru olayla gidiyor
     9     servisin kendi iptali kimseye yazmıyor
     10    tam gönderim "sipariş gönderildi"; kapanışa kargo verilse de
           servis siparişine sevk yazılmıyor (kargo gönderim başına
           ayrıca tasarlanacak; veri.js → talepKapat) */
export function AK29(m) {
  const d = defter('AK-29', 'Servis siparişi müşteriye bildirim yazmaz')
  depoTemizle()
  dunyaKur(m)
  const PERSONEL_AD = 'Sınama Yöneticisi'
  const siparisKur = () =>
    m.veri.servisParcaSiparisi({
      servisId: SERVIS.id,
      servisAd: SERVIS.ad,
      servisNo: SERVIS.no,
      servisTel: MUSTERI.tel,
      il: SERVIS.il,
      ilce: 'Selçuklu',
      kalemler: [{ kod: 'PRC-1', ad: 'Rulman', adet: 1 }, { kod: 'PRC-2', ad: 'Zincir', adet: 1 }],
      parcaFiyat: {
        satirlar: [
          { kod: 'PRC-1', ad: 'Rulman', adet: 1, birimFiyat: 100, tutar: 100 },
          { kod: 'PRC-2', ad: 'Zincir', adet: 1, birimFiyat: 50, tutar: 50 },
        ],
        araToplam: 150,
        kdv: 30,
        toplam: 180,
      },
      teslimat: { ...ADRES },
      odeme: 'fatura',
      not: '',
    })?.talep
  const musteriye = () => kisiselBildirimler(m).length
  const sonOlay = () => m.veri.servisBildirimleri(SERVIS.id)[0]?.olay
  const servisSay = () => m.veri.servisBildirimleri(SERVIS.id).length

  /* 1 · Ekranın alıcı sorusu. */
  const s1 = siparisKur()
  d.dogru(Boolean(s1?.id), 'servis siparişi kuruldu')
  const alici = m.veri.bildirimAlicilari(bul(m, s1?.id))
  d.yanlis(alici.musteri, 'telefon bir hesapla eşleşse de servis siparişinin müşteri alıcısı yok')
  d.dogru(alici.servis, 'servis siparişinin alıcısı servis')

  /* 2 · Durum. */
  m.veri.talepDurumDegistir(bul(m, s1.id), 'incelemede', PERSONEL_AD)
  d.esit(musteriye(), 0, 'durum değişikliği müşteriye bildirim yazmadı')
  d.esit(sonOlay(), 'durum', 'durum değişikliği servise gitti')

  /* 3 · Gönderim günü. */
  m.veri.talepPlanla(
    bul(m, s1.id),
    { tarih: saat.simdi() + 86400000, tarihYazi: 'yarın', is: 'Kargo', gorusuldu: true, saatBelirtildi: true },
    PERSONEL_AD,
  )
  d.esit(musteriye(), 0, 'gönderim günü müşteriye bildirim yazmadı')
  d.esit(sonOlay(), 'planlandi', 'gönderim günü servise gitti')
  d.esit(m.veri.servisBildirimleri(SERVIS.id)[0]?.degerler?.siparis, true, 'servis günü siparişin gönderim günü diye okuyor')

  /* 4 · Ödeme onayı. */
  m.veri.odemeOnayla(bul(m, s1.id), PERSONEL_AD, '')
  d.esit(musteriye(), 0, 'ödeme onayı müşteriye bildirim yazmadı')
  d.esit(sonOlay(), 'odemeOnay', 'ödeme onayı servise gitti')

  /* 5 · "Müşteriye" işaretli not. */
  m.veri.talepNotEkle(bul(m, s1.id), 'deneme', PERSONEL_AD, { musteriye: true })
  d.esit(musteriye(), 0, '"müşteriye" işaretli not da müşteriye bildirim yazmadı')

  /* 6 · Kısmi gönderim. */
  const k1 = m.veri.talepKapat(bul(m, s1.id), { yapilanIs: 'Gönderildi', not: '', gonderilen: [0] }, PERSONEL_AD)
  d.esit(k1?.kismi, true, 'sipariş kısmen gönderildi')
  d.esit(musteriye(), 0, 'kısmi gönderim müşteriye bildirim yazmadı')
  d.esit(sonOlay(), 'siparisKismenGonderildi', 'kısmi gönderim servise gitti')

  /* 7 · Kalan gönderim. */
  m.veri.kalanParcalariGonder(bul(m, s1.id), [1], PERSONEL_AD)
  d.esit(musteriye(), 0, 'kalan gönderim müşteriye bildirim yazmadı')
  d.esit(sonOlay(), 'kalanGonderildi', 'kalan gönderim servise gitti')

  /* 8 · PAKSAN'ın iptali. */
  const s2 = siparisKur()
  m.veri.talepIptal(bul(m, s2.id), { neden: 'Stok yok' }, PERSONEL_AD)
  d.esit(musteriye(), 0, 'PAKSAN\'ın iptali müşteriye bildirim yazmadı')
  d.esit(sonOlay(), 'iptal', 'PAKSAN\'ın iptali servise gitti')

  /* 9 · Servisin kendi iptali. */
  const s3 = siparisKur()
  const once = servisSay()
  const iptal = m.veri.servisSiparisiniIptalEt(s3, SERVIS.ad)
  d.esit(iptal?.hata, undefined, 'servis Yeni siparişini iptal etti')
  d.esit(musteriye(), 0, 'servisin iptali müşteriye bildirim yazmadı')
  d.esit(servisSay(), once, 'servisin kendi iptali kendisine bildirilmedi')

  /* 10 · Tam gönderim; kapanışa kargo verilse de sevk yazılmıyor. */
  const s4 = siparisKur()
  m.veri.talepKapat(
    bul(m, s4.id),
    { yapilanIs: 'Gönderildi', not: '', kargo: { firma: 'X', takipNo: '1' } },
    PERSONEL_AD,
  )
  d.esit(musteriye(), 0, 'tam gönderim müşteriye bildirim yazmadı')
  d.esit(sonOlay(), 'siparisGonderildi', 'tam gönderim servise "sipariş gönderildi" diye gitti')
  d.esit(bul(m, s4.id)?.parcaSevk, undefined, 'servis siparişine kargo yazılmadı (gönderim başına tasarlanacak)')

  return d
}

/* ========================================================== AK-30 */

/* MÜŞTERİNİN TALEPLERİ TEK EŞLEŞMEDEN (25 Eylül 2026, kullanıcı sınaması
   Y3 ve telefon biçimi).

   Backoffice'in müşteri kartı, "Aktif diğer talepler", bildirim alıcısı
   ve Müşteriler raporu talebin `telHam`'ını hesabın telefonuyla harfi
   harfine karşılaştırıyor, talepteki `musteriId`'ye bakmıyordu.
   Servisin elle açtığı "0532…" talep, hesaptaki "532 …" numarayla
   eşleşmiyor; aynı müşteri iki kişi sayılıyordu. Kural artık tek yerde:
   lib/musteriEslesmesi.js (servis siparişi kimsenin değil; musteriId
   varsa yalnız o hesap; yoksa ülke kodlu numara, yazılıştan bağımsız).
   Telefon ekranlarda tek biçimde (lib/tel.js → kayitTelGoster,
   kayitTelHref).

   KURGU: hesabın numarası Connect'in gerçek biçiminde, boşluklu
   ("532 111 22 33"). İkinci müşteri (MUSTERI2) aynı numarayı sonradan
   almış bir kişinin talebi için.

   Taşıdıkları:
     1  Connect talebinin ham numarası yalnız rakam
     2  musterininMi: kimlik önce, sonra ülke kodlu numara; numara el
        değiştirmiş talep yeni sahibinin; servis siparişi kimsenin değil
     3  müşteri kartı ve "diğer talepler" aynı kuraldan, iki yönlü
     4  bildirim: kimlikli elle talepte müşteriye gidiyor; kimliksiz
        elle talepte gitmiyor (bilinçli istisna, bkz. AK-07 ve
        lib/musteriEslesmesi.js başı)
     5  telefon ekranlarda tek biçim, arama bağlantısı ülke kodlu
     6  numara değişikliği onaylanınca eski numarayla açılmış kimliksiz
        Connect talepleri hesaba bağlanıyor; servisin elle açtığı
        bağlanmıyor. Kimliksiz eski GÖRÜŞ de bağlanıyor: numarayı sonra
        alan kişi eski görüşün cevabını almıyor */
export function AK30(m) {
  const d = defter('AK-30', 'Müşterinin talepleri tek eşleşmeden')
  depoTemizle()
  const urunId = m.marka.PRODUCTS[0].id
  const kisi = musteriKur(m, { ...MUSTERI, tel: '532 111 22 33' })
  const makineler = makineleriKur(m, urunId)
  defterKur(m, urunId)
  personelKur(m)
  servisKur(m)
  m.depo.save('demoMusteriler', [MUSTERI2])
  const E = m.musteriEslesmesi
  const T = m.tel
  let sira = 0
  const talep = (ek) =>
    talebiYaz(m, {
      id: m.depo.uid(),
      no: `SRV26092500${++sira}`,
      createdAt: Date.now(),
      status: 'yeni',
      tur: 'servis',
      ad: 'Sınama Kişisi',
      sahip: 'servis',
      servis: { id: SERVIS.id, ad: SERVIS.ad },
      makine: { id: makineler[0].id, serial: makineler[0].serial, productId: urunId },
      ...ek,
    })
  const idler = (l) => l.map((t) => t.id).sort().join(',')

  /* 1 · Connect talebi. */
  const connect = talebiYaz(
    m,
    m.talepOlustur.talepKaydiOlustur(
      talepVerisi('servis', urunId, makineler[0], { tel: T.telGoster('TR', kisi.tel), telHam: kisi.tel }),
      kisi,
    ),
  )
  d.esit(connect.telHam, '5321112233', 'Connect talebinin ham numarası yalnız rakam')

  /* 2 · Kim kimin. */
  const elleKimlikli = talep({ elle: true, musteriId: kisi.id, tel: '+90 532 111 22 33', telUlke: 'TR', telHam: '5321112233' })
  const elleEski = talep({ elle: true, musteriId: null, tel: '0532 111 22 33', telHam: '05321112233' })
  const baskasi = talep({ musteriId: MUSTERI2.id, telUlke: 'TR', tel: '0532 111 22 33', telHam: '5321112233' })
  const siparis = () =>
    talep({ servisSiparisi: true, tur: 'parca', musteriId: null, tel: '0532 111 22 33', telHam: '05321112233' })
  const sip1 = siparis()
  const sip2 = siparis()
  d.dogru(E.musterininMi(connect, kisi), 'Connect talebi müşterinin')
  d.dogru(E.musterininMi(elleKimlikli, kisi), 'kimlikli elle talep müşterinin')
  d.dogru(E.musterininMi(elleEski, kisi), 'sıfırlı, ülkesiz eski elle talep numarayla müşterinin')
  d.yanlis(E.musterininMi(elleEski, MUSTERI2), 'eski elle talep başka müşteriye bağlanmıyor')
  d.yanlis(E.musterininMi(baskasi, kisi), 'numara el değiştirmiş talep numaranın eski sahibine bağlanmıyor')
  d.dogru(E.musterininMi(baskasi, MUSTERI2), 'numara el değiştirmiş talep açan hesapta kalıyor')
  d.yanlis(E.musterininMi(sip1, kisi), 'servis siparişi numara tutsa da müşterinin değil')

  /* 3 · Müşteri kartı ve "diğer talepler". */
  const hepsi = m.veri.talepleriGetir()
  const sahibi = E.talepSahibiBulucu(m.veri.musterileriGetir())
  d.esit(
    idler(hepsi.filter((t) => sahibi(t)?.kayit?.id === kisi.id)),
    idler([connect, elleKimlikli, elleEski]),
    'müşteri kartı Connect talebini ve iki elle talebi gösteriyor',
  )
  d.esit(
    idler(m.veri.musterininDigerTalepleri(connect, hepsi)),
    idler([elleKimlikli, elleEski]),
    'Connect talebinin "diğer talepleri" iki elle talep',
  )
  d.dogru(
    m.veri.musterininDigerTalepleri(elleEski, hepsi).some((t) => t.id === connect.id),
    'eşleşme iki yönlü: elle talebin "diğer talepleri" Connect talebini içeriyor',
  )
  d.esit(idler(m.veri.musterininDigerTalepleri(sip1, hepsi)), idler([sip2]), 'servis siparişinin "diğer talepleri" yalnız aynı servisin siparişi')

  /* 4 · Bildirim alıcısı. */
  m.veri.talepDurumDegistir(elleKimlikli, 'incelemede', 'Sınama Yöneticisi')
  d.esit(
    kisiselBildirimler(m).find((b) => b.talepNo === elleKimlikli.no)?.musteriId,
    kisi.id,
    'kimlikli elle talebin bildirimi müşteriye gitti',
  )
  m.veri.talepDurumDegistir(elleEski, 'incelemede', 'Sınama Yöneticisi')
  d.esit(
    kisiselBildirimler(m).filter((b) => b.talepNo === elleEski.no).length,
    0,
    'kimliksiz elle talebin bildirimi numara tutsa da yazılmadı (bilinçli istisna)',
  )
  /* Kimliksiz Connect talebi (24 Eylül öncesi): numara hesaptakinden
     başka yazılmış ("5321112233" ile "532 111 22 33"). Bildirim yine
     müşteriye: eşleşme yazılıştan bağımsız. */
  const kimliksiz = talep({ musteriId: null, telUlke: 'TR', tel: '+90 532 111 22 33', telHam: '5321112233' })
  m.veri.talepDurumDegistir(kimliksiz, 'incelemede', 'Sınama Yöneticisi')
  d.esit(
    kisiselBildirimler(m).find((b) => b.talepNo === kimliksiz.no)?.musteriId,
    kisi.id,
    'kimliksiz Connect talebinin bildirimi numara başka yazılmış olsa da müşteriye gitti',
  )

  /* 5 · Telefon tek biçimde. */
  const BICIM = '+90 532 111 22 33'
  d.esit(T.kayitTelGoster(connect), BICIM, 'Connect talebinin numarası ülke kodlu')
  d.esit(T.kayitTelGoster(elleEski), BICIM, 'sıfırlı, ülkesiz eski kaydın numarası aynı biçimde')
  d.esit(T.kayitTelGoster(elleKimlikli), BICIM, 'kimlikli elle talebin numarası aynı biçimde')
  d.esit(T.telGoster(kisi.ulke, kisi.tel), BICIM, 'Müşteriler ekranının numarası aynı biçimde')
  d.esit(T.telGoster('TR', BICIM), BICIM, 'ülke kodlu giriş bozulmuyor')
  d.esit(T.kayitTelHref(connect), 'tel:+905321112233', 'Servisim Ara bağlantısı ülke kodlu')
  d.esit(T.kayitTelHref(elleEski), 'tel:+905321112233', 'eski kayıtta da Ara bağlantısı ülke kodlu')
  d.esit(T.telAnahtar('TR', BICIM), T.telAnahtar('TR', '0532 111 22 33'), 'ülke kodlu ve sıfırlı yazım aynı anahtar')
  d.esit(T.telHamYap('TR', '0090 532 111 22 33'), '5321112233', '"0090" ile yazılan ülke kodu atılıyor')
  d.esit(T.telHamYap('TR', '90 532 111 22 33'), '5321112233', 'artısız "90" ile yazılan ülke kodu atılıyor')
  d.esit(T.kayitTelGoster(sip1), T.telFirma(sip1.tel), 'servis siparişinin numarası firma biçiminde')

  /* 6 · Numara değişikliği onaylanınca. */
  const eskiConnect = talep({ musteriId: null, telUlke: 'TR', tel: BICIM, telHam: '532 111 22 33' })
  m.numaraTalebi.numaraTalebiGonder({ user: kisi, yeniUlke: 'TR', yeniTel: '532 444 55 66', seri: SERI.atanmis })
  m.veri.numaraTalebiKarar(m.veri.numaraTalepleriGetir()[0], true, 'Sınama Yöneticisi', '')
  d.esit(bul(m, eskiConnect.id)?.musteriId, kisi.id, 'eski numarayla açılmış kimliksiz Connect talebi hesaba bağlandı')
  d.esit(bul(m, elleEski.id)?.musteriId ?? null, null, 'servisin elle açtığı kimliksiz talep hesaba bağlanmadı')
  d.dogru(E.musterininMi(bul(m, eskiConnect.id), m.depo.load('hesap', null)), 'yeni numaralı hesap eski talebini görüyor')

  /* 7 · Kimliksiz eski görüş (25 Eylül öncesi). Numara değişikliğinde
     hesaba bağlanıyor; numarayı sonra alan başka müşteri eski görüşün
     cevabını almıyor (25 Eylül 2026, inceleme). */
  depoTemizle()
  const kisi7 = musteriKur(m, { ...MUSTERI, tel: '532 111 22 33' })
  personelKur(m)
  const gorus = { id: 'gorus-eski', no: 'GB-0001', tarih: Date.now(), metin: 'Sınama görüşü', ad: kisi7.ad, tel: kisi7.tel }
  m.depo.save('geribildirim', [gorus])
  m.numaraTalebi.numaraTalebiGonder({ user: kisi7, yeniUlke: 'TR', yeniTel: '555 000 11 22', seri: SERI.atanmis })
  m.veri.numaraTalebiKarar(m.veri.numaraTalepleriGetir()[0], true, 'Sınama Yöneticisi', '')
  d.esit(
    m.veri.geriBildirimGetir().find((g) => g.id === gorus.id)?.musteriId,
    kisi7.id,
    'kimliksiz eski görüş numara değişince hesaba bağlandı',
  )
  const devralan = { ...MUSTERI2, id: 'msc-devralan', tel: '532 111 22 33', ulke: 'TR' }
  m.depo.save('demoMusteriler', [devralan])
  m.veri.geriBildirimNotEkle(gorus, 'Sınama cevabı', 'Sınama Yöneticisi')
  const cevap = kisiselBildirimler(m).find((b) => b.tur === 'gorus')
  d.esit(cevap?.musteriId, kisi7.id, 'eski görüşün cevabı numarayı sonra alan kişiye değil görüşün sahibine gitti')

  return d
}

/* ========================================================== AK-31 */

/* ATAMA DIŞI ELLE İŞ VE AYNI MAKİNEDE İKİ İŞ (25 Eylül 2026, kullanıcı
   sınaması Y5 ve O5).

   Servisim'in "Kayıt Aç" işi her zaman açan servisin adına yazıyor.
   Makine başka servise atanmışsa ya da hiç servisi yoksa ne servis
   uyarılıyor ne backoffice işaretliyordu. Kullanıcının kararı: uyar,
   engelleme. Talep açan serviste kalıyor ve çelişki `atamaDisi`
   olarak yazılıyor (lib/elleTalep.js → elleTalepKaydiOlustur,
   lib/servisAtama.js → elleIsinAtamasi); hak edişi onaylayan personel
   onu görüyor, ödeme işi açan servise gidiyor.

   Aynı makinede iki açık servis talebi (O5): "açık" iki anlamda
   (lib/makineTalepleri.js). Backoffice'in "makinede başka açık iş"
   işareti onay bekleyen işi de sayıyor (ödenmedi); Connect'in engeli ve
   Servisim'in "bu makinede işiniz var" kartı saymıyor (iş bitti, servis
   orada devam edemez).

   Taşıdıkları:
     1-4  işaret: kendi makinesinde yok; başka servisin makinesinde
          (atama ya da bayi yoluyla) baskaServis; servissiz makinede
          atanmamis; serisiz makinede seriYok
     5    elle talebin numarası tek biçimde (ülke kodlu)
     6    işaret depoda; kayıt gönderimi ve onay silmiyor; alacak işi
          açan servise
     7    Connect talep ayrıntısı işi yürüten servisi "sizin servisiniz"
          saymıyor (makineninKendiServisiMi)
     8    aynı makinedeki açık işler: tür, durum, seri yazımı, hariç
          tutulan talep; iki yüklemin ayrımı
     9    Servisim'in Kayıt Aç kartları: servisin elindeki süren iş "açık
          bir işiniz var"; PAKSAN'a devrettiği iş o kartta değil, "başka
          açık talep" kartında (servisinMakinedekiIsleri) */
export async function AK31(m, ctx) {
  const d = defter('AK-31', 'Atama dışı elle iş ve aynı makinede iki iş')
  depoTemizle()
  const { urunId, kisi, makineler } = dunyaKur(m)
  const et = await ctx.modulYukle('/src/lib/elleTalep.js')
  const mt = await ctx.modulYukle('/src/lib/makineTalepleri.js')
  const BIZ = { servisId: SERVIS.id, ad: SERVIS.ad }
  const OTEKI = { servisId: BAYI_SERVISI, ad: m.marka.servisGetir(BAYI_SERVISI)?.ad || BAYI_SERVISI }
  const mk = (seri) => ({ serial: seri, productId: urunId })
  /* ElleKayit.jsx'in formu: kayıtlı olmayan bir çiftçi. */
  const ac = (makine, oturum) =>
    et.elleTalepKaydiOlustur(
      {
        adi: 'veli',
        soyadi: 'yıldız',
        tel: '0532 777 88 99',
        il: 'Konya',
        ilce: 'Meram',
        adres: 'Tarla yolu, 3. km',
        aciklama: 'Elle açılan iş',
        makine,
        musteriId: null,
      },
      oturum,
    )

  /* 1 · Makinenin kendi servisi açınca işaret yok. */
  d.esit(ac(mk(SERI.atanmis), BIZ).atamaDisi, undefined, 'makinenin kendi servisi açınca işaret yok')
  d.esit(ac(mk(' ' + SERI.atanmis.toLowerCase().replace(/-/g, ' ')), BIZ).atamaDisi, undefined, 'küçük harfli, boşluklu yazımda da işaret yok')

  /* 2 · Başka servisin makinesi: atama ya da bayi yoluyla. */
  const a1 = ac(mk(SERI.atanmis), OTEKI).atamaDisi
  d.esit(a1?.durum, 'baskaServis', 'atanmış servisi başka olan makinede işaret')
  d.esit(a1?.servisId, SERVIS.id, 'işaret makinenin kendi servisini taşıyor')
  d.esit(a1?.kaynak, 'atama', 'servis PAKSAN\'ın atamasından')
  const a2 = ac(mk(SERI.bayili), BIZ).atamaDisi
  d.esit(a2?.durum, 'baskaServis', 'bayisinin servisi başka olan makinede işaret')
  d.esit(a2?.servisId, BAYI_SERVISI, 'işaret bayinin servisini taşıyor')
  d.esit(a2?.kaynak, 'bayi', 'servis bayiden')
  d.esit(ac(mk(SERI.bayili), OTEKI).atamaDisi, undefined, 'bayinin servisi açınca işaret yok')

  /* 3 · Servissiz ya da defterde olmayan makine. */
  d.esit(ac(mk(SERI.sahipsiz), BIZ).atamaDisi?.durum, 'atanmamis', 'servisi olmayan makinede "atanmamış"')
  d.esit(ac(mk('ORK1270-2024-00444'), BIZ).atamaDisi?.durum, 'atanmamis', 'defterde olmayan makinede "atanmamış"')

  /* 4 · Serisiz makine: denetlenemiyor, ayrı adla. */
  d.esit(
    ac({ seriYok: true, productId: urunId, tahminiYil: 2015 }, BIZ).atamaDisi?.durum,
    'seriYok',
    'serisiz makinede "seri yok"',
  )

  /* 5 · Numara tek biçimde (Servisim yalnız Türkiye'de). */
  const bicim = ac(mk(SERI.atanmis), BIZ)
  d.esit(bicim.telHam, '5327778899', 'elle talebin ham numarası sıfırsız rakam')
  d.esit(bicim.tel, '+90 532 777 88 99', 'elle talebin numarası ülke kodlu biçimde')
  d.esit(bicim.telUlke, 'TR', 'elle talep numaranın ülkesini taşıyor')

  /* 6 · Backoffice okuyor; kayıt ve onay işareti silmiyor; ödeme işi
     açan servise. */
  const r = talebiYaz(m, ac(mk(SERI.atanmis), OTEKI))
  d.esit(bul(m, r.id)?.atamaDisi?.durum, 'baskaServis', 'backoffice işareti okuyor')
  m.veri.servisKaydiGonder(r, bitmisKayit(), OTEKI.ad)
  d.esit(bul(m, r.id)?.atamaDisi?.servisId, SERVIS.id, 'servis kaydı işareti silmedi')
  m.veri.hakkedisOnayla(bul(m, r.id), 'Sınama Yöneticisi')
  d.esit(bul(m, r.id)?.atamaDisi?.servisId, SERVIS.id, 'hak ediş onayı işareti silmedi')
  d.esit(
    m.veri.cariHareketleri(BAYI_SERVISI).filter((h) => h.tur === 'alacak').length,
    1,
    'onaylanan atama dışı işin ödemesi işi açan servise yazıldı',
  )

  /* 7 · Connect'in "Servisiniz" sorusu. */
  d.yanlis(m.servisAtama.makineninKendiServisiMi(bul(m, r.id)), 'işi yürüten başka servis Connect\'te "servisiniz" sayılmıyor')
  const connect = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi))
  d.dogru(m.servisAtama.makineninKendiServisiMi(connect), 'Connect talebinde servis makinenin kendi servisi')

  /* 8 · Aynı makinede iki açık iş (O5). Onaylanıp kapanan `r` aynı
     seride duruyor ve sayılmamalı. */
  const B = talebiYaz(m, ac(mk(SERI.atanmis), OTEKI))
  const idler = (l) => l.map((t) => t.id).sort().join(',')
  const acik = (makine, ayar) => idler(mt.makineninAcikServisTalepleri(makine, m.veri.talepleriGetir(), ayar))
  d.esit(acik(SERI.atanmis), idler([connect, B]), 'aynı makinede iki açık servis talebi; kapanan sayılmadı')
  d.esit(acik(SERI.atanmis.toLowerCase(), { haric: B.id }), idler([connect]), 'seri yazımı fark etmiyor, talebin kendisi hariç')
  talebiYaz(
    m,
    m.talepOlustur.talepKaydiOlustur(
      talepVerisi('parca', urunId, makineler[0], {
        parcalar: ['Rulman'],
        parcaAdet: { Rulman: 1 },
        fatura: { ad: MUSTERI.ad, tel: MUSTERI.tel, adres: MUSTERI.adres },
        dekont: { id: 'dk-31', ad: 'dekont.pdf', boyut: 1024 },
      }),
      kisi,
    ),
  )
  d.esit(acik(SERI.atanmis), idler([connect, B]), 'aynı makinenin parça talebi sayılmıyor')
  m.veri.talepDurumDegistir(bul(m, B.id), 'iptal', 'Sınama Yöneticisi', { bildirme: true })
  d.esit(acik(SERI.atanmis), idler([connect]), 'iptal edilen talep sayılmıyor')
  d.esit(mt.makineninAcikServisTalepleri({ id: 'x', seriYok: true }, m.veri.talepleriGetir()).length, 0, 'serisiz makine eşleştirilmiyor')

  /* İki yüklem: onay bekleyen iş backoffice için açık, "iş sürüyor" değil. */
  m.veri.servisKaydiGonder(bul(m, connect.id), bitmisKayit(), SERVIS.ad)
  d.esit(bul(m, connect.id)?.status, 'onayBekliyor', 'Connect talebi onay bekliyor')
  d.esit(acik(SERI.atanmis), idler([connect]), 'onay bekleyen iş backoffice\'in "başka açık iş" sayımında')
  d.esit(
    mt.makineninIsSurenServisTalebi(SERI.atanmis, m.veri.talepleriGetir()),
    null,
    'onay bekleyen iş "iş sürüyor" sayılmıyor (Connect yeni talebi engellemez)',
  )

  /* 9 · Servisim'in Kayıt Aç kartları (25 Eylül 2026, inceleme). Kart
     "o işe devam edin" diyor ve "İşi Aç" ile talebe götürüyor; servis
     işi PAKSAN'a devrettiyse orada not bile ekleyemiyor. */
  const kartlar = () => mt.servisinMakinedekiIsleri(SERI.sahipsiz, m.veri.talepleriGetir(), SERVIS.id)
  const S1 = talebiYaz(m, ac(mk(SERI.sahipsiz), BIZ))
  d.esit(kartlar().kendi?.id, S1.id, 'servisin elindeki süren iş "açık bir işiniz var" kartında')
  d.yanlis(kartlar().baska, 'servisin kendi işi "başka açık talep" sayılmıyor')
  m.veri.destekTalepEt(bul(m, S1.id), 'Sınama nedeni', SERVIS.ad)
  d.esit(bul(m, S1.id)?.sahip, 'paksan', 'iş PAKSAN\'a devredildi (kurgu doğru)')
  d.esit(kartlar().kendi, null, 'devredilen iş "İşi Aç" kartına düşmüyor')
  d.dogru(kartlar().baska, 'devredilen iş "başka açık talep" kartında')
  d.esit(
    mt.makineninIsSurenServisTalebi(SERI.sahipsiz, m.veri.talepleriGetir())?.id,
    S1.id,
    'Connect\'in engeli devredilen işi hâlâ süren iş sayıyor',
  )

  /* 10 · Servisin onay bekleyen kendi işi (28 Eylül 2026, kullanıcının
     kararı: "Uyarsın"). Süren iş değil, "İşi Aç" kartında değil; ayrı
     uyarının konusu. */
  d.esit(kartlar().onayda, null, 'onay bekleyen işi yokken uyarı yok')
  const S2 = talebiYaz(m, ac(mk(SERI.sahipsiz), BIZ))
  m.veri.servisKaydiGonder(bul(m, S2.id), bitmisKayit(), SERVIS.ad)
  d.esit(bul(m, S2.id)?.status, 'onayBekliyor', 'iş onaya gitti (kurgu doğru)')
  d.esit(kartlar().onayda?.id, S2.id, 'onay bekleyen kendi işi uyarıda')
  d.esit(kartlar().kendi, null, 'onay bekleyen iş "İşi Aç" kartına düşmüyor')

  return d
}

/* ========================================================== AK-32 */

/* CONNECT FORMLARI VE TALEPLERİM (25 Eylül 2026, kullanıcı sınaması).

   Çiftçinin (Connect) bulguları; ekranda kalan kısımlar ekran turunda
   (C-27 Taleplerim, C-28 servisin geleceği adres, F-11 boş geri bildirim).

   Taşıdıkları:
     1  Y1  fiyat teklifi makine taşımıyor; 25 Eylül öncesi hatayla
            makine yazılmış teklif iki uygulamada da makinesiz okunuyor,
            depodaki kayıt yeniden yazılmıyor (lib/talep.js →
            makinesizTeklif)
     2  Y2  seri numarası önekle birlikte yıl ve sıra hanelerine
            bakıyor; O ve I rakama çevriliyor, model kodu çevrilmiyor
            (lib/serial.js → validateSerial, seriDuzelt)
     3  O4  servis talebinin yeri makinenin son servis adresinden
            (lib/makineTalepleri.js → makineninSonServisAdresi); en
            yeni, adresi dolu SERVİS talebi (adresi boş talep ve parça
            talebi atlanıyor). Onayda hesaba yalnız boş olan yazılıyor;
            dolu hesap yeri makinenin yeriyle değişmiyor (lib/talepOlustur.js
            → hesabaIslenecekKonum). KABUL EDİLEN SINIR: Servisim'in elle
            kaydı adresi hesaptan öneriyor; iki makineli çiftçide öneri
            hesabın yeri, makinenin değil (alan düzenlenebilir)
     4  O5  aynı makinede işi süren servis talebi varken ikinci talep
            açılmıyor, çiftçi eklemeye yönleniyor; onay bekleyen iş
            engellemiyor; birden çok süren iş varsa en yenisi. Kapanmış
            talebin "Sorun Devam Ediyor"u da süren başka iş varken
            yeniden açmıyor (lib/makineTalepleri.js → sorunDevamEngeli).
            Müşterinin eklemesi ve "Sorun Devam Ediyor"
            servise bildiriliyor ve Servisim bunları "Müşteriden" diye
            ayırıyor (lib/talepEkleme.js, servis/talepBildirimleri.js)
     5  O9  listeden kaldırılan talep geri alınabiliyor; yalnız bu
            hesabın talepleri (lib/musterininTalepleri.js). Gizleme
            yalnız kapalı talebi saklıyor: PAKSAN yeniden açarsa listede.
            Servisin elle açtığı kimliksiz iş numara tutsa da listede
            yok; backoffice'in müşteri kartı onu numarayla görüyor
            (bilinçli istisna, lib/musteriEslesmesi.js → hesabaBaglanirMi)
     6      parçada `planlandi` gönderim günü, serviste randevu
            (lib/talep.js → musteriDurumAnahtari, lib/bildirimler.js)
     7      görüşe verilen cevap numara tutmasa da görüşü yazan hesaba
            gidiyor (görüş hesabın kimliğini taşıyor) */
export async function AK32(m, ctx) {
  const d = defter('AK-32', 'Connect formları ve Taleplerim')
  depoTemizle()
  const { urunId, kisi, makineler } = dunyaKur(m)
  const mt = await ctx.modulYukle('/src/lib/musterininTalepleri.js')
  const mk = await ctx.modulYukle('/src/lib/makineTalepleri.js')
  const ekleme = await ctx.modulYukle('/src/lib/talepEkleme.js')
  const tb = await ctx.modulYukle('/src/servis/talepBildirimleri.js')
  const olustur = (tur, makine, ek = {}) =>
    m.talepOlustur.talepKaydiOlustur(talepVerisi(tur, urunId, makine, ek), kisi)

  /* 1 · Y1 — fiyat teklifinde makine yok. */
  const teklif = olustur('satinalma', makineler[0], { urunId })
  d.esit(teklif.makine, null, 'fiyat teklifi makine taşımıyor')
  d.esit(teklif.urunId, urunId, 'teklifin ürünü duruyor')
  d.dogru(Boolean(olustur('servis', makineler[0]).makine?.serial), 'servis talebi makinesini taşıyor')
  const eski = talebiYaz(m, {
    ...olustur('satinalma', null, { urunId }),
    makine: { id: makineler[0].id, serial: SERI.atanmis, productId: urunId },
  })
  d.esit(bul(m, eski.id)?.makine, null, 'backoffice eski teklifin makinesini göstermiyor')
  d.dogru(Boolean(m.depo.load('requests', []).find((t) => t.id === eski.id)?.makine), 'depodaki eski kayıt yeniden yazılmadı')
  d.esit(mt.gorunenTalepler([eski], kisi, [])[0]?.makine, null, 'Connect eski teklifin makinesini göstermiyor')
  const sv = olustur('servis', makineler[0])
  d.esit(m.talep.makinesizTeklif(sv), sv, 'öteki türlere dokunulmuyor')

  /* 2 · Y2 — seri numarası. Saat 2026'da donmuş: 2031 gelecek yıl. */
  const v = (s) => m.serial.validateSerial(s)
  const H = m.serial.SERIAL_ERRORS
  d.esit(v('ORK1270-2024-00157').serial, 'ORK1270202400157', 'doğru seri tanınıyor')
  d.esit(v(' ork1270 2024 00157 ').ok, true, 'küçük harf ve boşluk sorun değil')
  d.esit(v('ORK1270-2024-0157').error, H.SHORT, 'bir hane eksik: "eksik" deniyor')
  d.esit(v('ORK1270-2024-001570').error, H.FORMAT, 'bir hane fazla: biçim tutmuyor')
  d.esit(v('SYNS2O24 00318').serial, 'SYNS202400318', 'yıldaki O sıfır okunuyor')
  d.esit(v('SYNS-2024-0O3I8').serial, 'SYNS202400318', 'sıradaki O ve I rakama çevriliyor')
  d.esit(v('ORK1270-2031-00157').error, H.FORMAT, 'gelecek yıl kabul edilmiyor')
  d.esit(v('0RK1270-2024-00157').ok, false, 'model kodundaki 0 düzeltilmiyor')
  const onekHatasi = m.marka.PRODUCTS
    .filter((p) => v(m.serial.normalizeSerial(p.serialPrefix) + '202400001').product?.id !== p.id)
    .map((p) => p.serialPrefix)
  d.bak(onekHatasi.length === 0, 'her model öneki yeni kuralla doğru ürüne gidiyor', '[]', onekHatasi)
  const gecersiz = [...Object.values(SERI), ...m.serial.ORNEK_SERILER.map((o) => o.serial)].filter((s) => !v(s).ok)
  d.bak(gecersiz.length === 0, 'sınama fikstürleri ve örnek seriler yeni kurala uyuyor', '[]', gecersiz)

  /* 3 · O4 — makinenin yeri. */
  const eskiYer = { ...olustur('servis', makineler[0], { il: 'Konya', ilce: 'Selçuklu', adres: 'Eski tarla' }), createdAt: Date.now() - 86400000 }
  const yeniYer = { ...olustur('servis', makineler[0], { il: 'Konya', ilce: 'Çumra', adres: 'Yeni tarla' }), status: 'kapandi' }
  const obur = olustur('servis', makineler[1], { il: 'Ankara', ilce: 'Polatlı', adres: 'Öbür makine' })
  const yerler = [eskiYer, yeniYer, obur]
  d.esit(mk.makineninSonServisAdresi(SERI.atanmis.toLowerCase(), yerler)?.adres, 'Yeni tarla', 'makinenin en yeni servis adresi, kapanmış talepten de, başka yazımla da')
  d.esit(mk.makineninSonServisAdresi(makineler[0], yerler)?.ilce, 'Çumra', 'il ve ilçe aynı talepten')
  d.esit(mk.makineninSonServisAdresi(makineler[1], yerler)?.adres, 'Öbür makine', 'her makinenin yeri kendi talebinden')
  d.esit(mk.makineninSonServisAdresi(makineler[2], yerler), null, 'talebi olmayan makinede öneri yok (form hesaptaki adresi öneriyor)')
  const adressiz = { ...olustur('servis', makineler[0], { il: 'Konya', ilce: 'Meram', adres: '  ' }), createdAt: Date.now() + 60000 }
  const parcaYeri = { ...olustur('parca', makineler[0], { il: 'İzmir', ilce: 'Bornova', adres: 'Depo' }), createdAt: Date.now() + 120000 }
  d.esit(
    mk.makineninSonServisAdresi(makineler[0], [...yerler, adressiz, parcaYeri])?.adres,
    'Yeni tarla',
    'daha yeni ama adresi boş servis talebi ve parça talebi öneriye girmiyor',
  )
  const hk = m.talepOlustur.hesabaIslenecekKonum
  const hesap = { ...kisi, konumUlke: 'TR', il: 'Konya', ilce: 'Selçuklu', adres: 'Ev adresi' }
  d.esit(
    hk('servis', hesap, { konumUlke: 'TR', il: 'Balıkesir', ilce: 'Bandırma', adres: 'Öbür tarla' }),
    null,
    'servis talebinde makinenin yeri dolu hesap yerini değiştirmiyor',
  )
  d.esit(
    JSON.stringify(hk('servis', { ...hesap, il: '', ilce: '', adres: '' }, { konumUlke: 'TR', il: 'Konya', ilce: 'Çumra', adres: 'Tarla' })),
    JSON.stringify({ konumUlke: 'TR', il: 'Konya', ilce: 'Çumra', adres: 'Tarla' }),
    'boş hesaba ilk servis talebinin yeri yazılıyor (bir kez soruluyor)',
  )
  d.esit(
    hk('servis', { ...hesap, adres: '' }, { konumUlke: 'TR', il: 'Balıkesir', ilce: 'Bandırma', adres: 'Öbür tarla' }),
    null,
    'başka ildeki makinenin adresi hesabın iline yazılmıyor (yer karışmıyor)',
  )
  d.esit(
    hk('servis', { ...hesap, adres: '' }, { konumUlke: 'TR', il: 'Konya', ilce: 'Selçuklu', adres: 'Tarla' })?.adres,
    'Tarla',
    'aynı yerdeki makinenin adresi boş hesap adresine yazılıyor',
  )
  d.esit(
    hk('parca', hesap, { konumUlke: 'TR', il: 'Ankara', ilce: 'Polatlı' })?.il,
    'Ankara',
    'parça talebinde düzeltilen konum hesaba yazılıyor (eskisi gibi)',
  )

  /* 4 · O5 — işi süren servis talebi; müşterinin olayları servise. */
  const suren = { ...olustur('servis', makineler[0]), status: 'planlandi' }
  const onayda = { ...olustur('servis', makineler[1]), status: 'onayBekliyor' }
  const liste = [suren, onayda, olustur('parca', makineler[2]), { ...olustur('servis', makineler[2]), status: 'kapandi' }]
  d.esit(mk.makineninIsSurenServisTalebi(SERI.atanmis.replace(/-/g, ''), liste)?.id, suren.id, 'işi süren talep başka yazımla da bulunuyor')
  const surenDurumlar = ['yeni', 'incelemede', 'parcaBekliyor'].filter(
    (s) => mk.makineninIsSurenServisTalebi(SERI.atanmis, [{ ...suren, status: s }])?.id !== suren.id,
  )
  d.bak(surenDurumlar.length === 0, 'yeni, incelemede ve parça bekleyen iş "sürüyor" sayılıyor', '[]', surenDurumlar)
  d.esit(mk.makineninIsSurenServisTalebi(SERI.bayili, liste), null, 'onay bekleyen kayıt yeni talebi engellemiyor')
  d.esit(mk.makineninIsSurenServisTalebi(SERI.sahipsiz, liste), null, 'kapanmış servis talebi ve parça talebi engellemiyor')
  d.esit(mk.makineninIsSurenServisTalebi(SERI.atanmis, [{ ...suren, servisSiparisi: true }]), null, 'servis siparişi sayılmıyor')
  const surenYeni = { ...olustur('servis', makineler[0]), status: 'incelemede', createdAt: suren.createdAt + 60000 }
  d.esit(
    mk.makineninIsSurenServisTalebi(SERI.atanmis, [suren, surenYeni])?.id,
    surenYeni.id,
    'aynı makinede iki süren iş varsa en yenisi (liste sırasından bağımsız)',
  )
  /* Kapanmış talebin "Sorun Devam Ediyor"u (25 Eylül 2026, inceleme). */
  const kapanan = { ...olustur('servis', makineler[0]), status: 'kapandi' }
  d.esit(mk.sorunDevamEngeli(kapanan, [kapanan, suren])?.id, suren.id, 'süren başka iş varken kapanmış talep yeniden açılmıyor, o talebe yönleniyor')
  d.esit(mk.sorunDevamEngeli(kapanan, [kapanan]), null, 'başka iş yoksa "Sorun Devam Ediyor" açık')
  d.esit(mk.sorunDevamEngeli(kapanan, [kapanan, onayda, { ...suren, status: 'onayBekliyor' }]), null, 'başka makinedeki ya da onay bekleyen iş engellemiyor')

  const r4 = talebiYaz(m, olustur('servis', makineler[0]))
  const sonBildirim = () => m.veri.servisBildirimleri(SERVIS.id)[0]
  const once = m.veri.servisBildirimleri(SERVIS.id).length
  d.dogru(ekleme.eklemeyiServiseBildir(r4), 'müşterinin eklemesi servise bildirildi')
  d.esit(sonBildirim()?.olay, 'musteriEkledi', 'olay "müşteri ekledi"')
  d.esit(sonBildirim()?.talepId, r4.id, 'bildirim talebin kimliğini taşıyor')
  d.yanlis(ekleme.eklemeyiServiseBildir(talebiYaz(m, olustur('parca', makineler[0]))), 'parça talebine ekleme servise gitmiyor')
  d.yanlis(ekleme.eklemeyiServiseBildir({ ...r4, status: 'kapandi' }), 'kapanmış talep ekleme bildirimi üretmiyor')
  d.dogru(ekleme.sorunDevaminiServiseBildir({ ...r4, status: 'kapandi' }), '"Sorun Devam Ediyor" servise bildirildi')
  d.esit(sonBildirim()?.olay, 'musteriSorunDevam', 'olay "sorun devam ediyor"')
  d.yanlis(ekleme.sorunDevaminiServiseBildir({ ...r4, sahip: 'paksan' }), 'PAKSAN\'a devredilmiş işte servise gitmiyor')
  d.esit(m.veri.servisBildirimleri(SERVIS.id).length, once + 2, 'iki olay, iki bildirim')
  const genel = tb.bildirimYazisi({ olay: '__tanimsiz__' }).baslik
  for (const olay of ['musteriEkledi', 'musteriSorunDevam']) {
    d.bak(tb.bildirimYazisi({ olay, degerler: {} }).baslik !== genel, `"${olay}" Servisim'de kendi yazısıyla görünüyor`, 'olaya özel başlık', genel)
  }
  d.dogru(tb.musteridenMi(sonBildirim()), 'Servisim müşterinin olayını "Müşteriden" diye ayırıyor')
  d.yanlis(tb.musteridenMi({ olay: 'durum' }), 'PAKSAN\'ın işlemi müşteriden sayılmıyor')

  /* 5 · O9 — kaldırılan talep geri alınabiliyor. */
  const k1 = { ...olustur('servis', makineler[0]), status: 'kapandi' }
  const a1 = olustur('parca', makineler[0])
  const baskasi = { ...olustur('servis', makineler[1]), musteriId: MUSTERI2.id, status: 'kapandi' }
  const siparis = { ...olustur('parca', null), servisSiparisi: true, status: 'kapandi' }
  const hepsi = [k1, a1, baskasi, siparis]
  const gizli = [k1.id, baskasi.id, siparis.id]
  d.esit(mt.gorunenTalepler(hepsi, kisi, gizli).map((t) => t.id).join(','), a1.id, 'kaldırılan talep listede yok')
  d.esit(mt.kaldirilanTalepler(hepsi, kisi, gizli).map((t) => t.id).join(','), k1.id, 'kaldırılanlarda yalnız bu hesabın talebi')
  const geri = gizli.filter((x) => x !== k1.id)
  d.dogru(mt.gorunenTalepler(hepsi, kisi, geri).some((t) => t.id === k1.id), 'geri alınan talep listeye döndü')
  d.esit(mt.kaldirilanTalepler(hepsi, kisi, geri).length, 0, 'geri alınınca kaldırılanlardan çıktı')
  /* PAKSAN kaldırılmış talebi yeniden açtı: açık iş gizli kalmıyor
     (25 Eylül 2026, inceleme). */
  const yenidenAcilan = { ...k1, status: 'incelemede' }
  d.dogru(mt.gorunenTalepler([yenidenAcilan], kisi, gizli).some((t) => t.id === k1.id), 'yeniden açılan kaldırılmış talep listede')
  d.esit(mt.kaldirilanTalepler([yenidenAcilan], kisi, gizli).length, 0, 'yeniden açılan talep kaldırılanlarda değil')
  /* Servisin elle açtığı kimliksiz iş: numara tutsa da Connect'te yok,
     backoffice'in eşleşmesinde var (bilinçli istisna). */
  const elleKimliksiz = { ...olustur('servis', makineler[0]), elle: true, musteriId: null, telUlke: 'TR', tel: '0' + kisi.tel, telHam: '0' + kisi.tel }
  d.yanlis(mt.gorunenTalepler([elleKimliksiz], kisi, []).length > 0, 'servisin elle açtığı kimliksiz iş Connect listesinde yok')
  d.dogru(m.musteriEslesmesi.musterininMi(elleKimliksiz, kisi), 'aynı iş backoffice\'in müşteri eşleşmesinde var (istisna yalnız hesabın listesinde)')

  /* 6 · Parçada gönderim günü. Anahtar dinamik; dogrula 2. kontrol
     çalışırken birleşen anahtarı göremiyor, iki sözlük burada soruluyor. */
  d.esit(m.talep.musteriDurumAnahtari({ tur: 'parca' }, 'planlandi'), 'talepDurum.planlandiParca', 'parçada "planlandı" gönderim günü')
  d.esit(m.talep.musteriDurumAnahtari({ tur: 'servis' }, 'planlandi'), 'talepDurum.planlandi', 'serviste "planlandı" randevu')
  d.esit(m.talep.musteriDurumAnahtari({ tur: 'parca', status: 'kapandi' }), 'talepDurum.kapandi', 'öteki durumlar aynı')
  const { tr } = await ctx.modulYukle('/src/i18n/tr.js')
  const { en } = await ctx.modulYukle('/src/i18n/en.js')
  d.dogru(Boolean(tr.talepDurum?.planlandiParca && en.talepDurum?.planlandiParca), 'yeni durum adı iki sözlükte de var')
  const bl = await ctx.modulYukle('/src/lib/bildirimler.js')
  const plan = { tarih: Date.now() + 3600000, tarihYazi: 'yarın', is: 'Kargo' }
  const hatirlatma = (tur) =>
    bl.bildirimListesi({ requests: [{ ...olustur(tur, makineler[0]), status: 'planlandi', plan }] }).find((b) => b.sabit)?.baslikAnahtar
  d.esit(hatirlatma('parca'), 'bildirimler.gonderimBaslik', 'parça hatırlatması gönderim diye yazıyor')
  d.esit(hatirlatma('servis'), 'bildirimler.randevuBaslik', 'servis hatırlatması randevu diye yazıyor')

  /* 7 · Görüşün cevabı. Numara hiçbir hesapla eşleşmiyor: cevabı
     görüşteki hesap kimliği götürüyor. */
  const gb = await ctx.modulYukle('/src/lib/geriBildirim.js')
  const gorus = await gb.geriBildirimGonder({
    metin: 'Sınama görüşü',
    dil: 'tr',
    surum: 'sınama',
    tel: '5550001122',
    ad: kisi.ad,
    musteriId: kisi.id,
    telUlke: 'TR',
  })
  m.veri.geriBildirimNotEkle(gorus, 'Teşekkürler', 'Sınama Yöneticisi')
  d.esit(
    kisiselBildirimler(m).find((b) => b.tur === 'gorus')?.musteriId,
    kisi.id,
    'görüşe verilen cevap numara tutmasa da görüşü yazan hesaba gitti',
  )

  return d
}

/* ========================================================== AK-33 */

/* OTURUM SEKMEYE AİT (25 Eylül 2026, kullanıcı sınaması O6 ve O7).

   Backoffice oturumu yalnız kalıcı depoda duruyordu; ikinci sekmede
   başka personel girince birinci sekme yenilenince onun kimliğine
   geçiyordu, işlem kaydına öteki sekmenin rolü yazılıyordu. Kapatılan ya
   da silinen personelin, paneli kapatılan servisin oturumu sürüyordu.
   Rol, ücret ve iskonto değişikliği öteki sekmelerde sayfa yenilenene
   kadar görünmüyordu (veri.js → oturum bölümü, lib/icerikDeposu.js →
   baskaSekmedenGeldi).

   Taşıdıkları:
     1  yeni sekme son girişi bir kez devralıyor; başka sekmenin girişi
        bu sekmenin kimliğini değiştirmiyor
     2  işlem kaydı bu sekmenin rolünü taşıyor
     3  rol personel kaydından okunuyor
     4  kapatılan personelin oturumu düşüyor; başkasının son girişine
        dokunulmuyor
     3b rolü değişen kişinin işlem kaydı yeni rolü taşıyor (rol kayıttan)
     5  giriş iki depoya, çıkış iki depodan; silinen personelin son
        girişi yeni sekmeye kalmıyor; son giriş başkasınınsa çıkış ona
        dokunmuyor; oturumsuz sekmenin işlem kaydına son girişin rolü
        yalnız aynı kişinin işleminde yazılıyor
     6  başka sekmenin rol değişikliği depo olayıyla okunuyor (Node'da
        olay yok; işleyici doğrudan çağrılıyor. Olayın tarayıcıda
        ekrana ulaştığını ekran turunun B-SEKME'si gösteriyor.)
     7  paneli kapatılan servisin oturumu düşüyor */
export async function AK33(m) {
  const d = defter('AK-33', 'Oturum sekmeye ait')
  depoTemizle()
  dunyaKur(m)
  const Y = 'Sınama Yöneticisi'
  const sekmede = () => m.depo.oturumYukle('panelOturum', null)
  const sonGiris = () => m.depo.load('panelOturum', null)

  /* 1 · Yeni sekme ve başka sekmenin girişi. dunyaKur yalnız kalıcı
     depoya yazıyor: bu sekme yeni açılmış. */
  d.esit(sekmede(), null, 'yeni sekmenin kendi oturumu yok')
  d.esit(m.veri.oturumGetir()?.personelId, PERSONEL.personelId, 'yeni sekme son girişi devraldı')
  d.esit(sekmede()?.personelId, PERSONEL.personelId, 'devralınan oturum sekmenin kendi deposuna yazıldı')
  personelKaydiEkle(m, PARCA_PERSONELI)
  m.depo.save('panelOturum', { ...PARCA_PERSONELI, giris: Date.now() })
  d.esit(m.veri.oturumGetir()?.personelId, PERSONEL.personelId, 'başka sekmenin girişi bu sekmenin kimliğini değiştirmedi')

  /* 2 · İşlem kaydının rolü. */
  d.esit(m.veri.islemYaz({ tur: 'sinama', ozet: 'sekme', personel: PERSONEL.ad })?.rol, 'admin', 'işlem kaydı bu sekmenin rolünü taşıyor')

  /* 3 · Rol kayıttan. İşlem kaydı da: sekmenin oturumu girişteki rolü
     (admin) taşımaya devam ediyor; ekran yeni rolle çalışırken kayda eski
     rol yazılıyordu (25 Eylül 2026, inceleme). */
  await m.veri.personelGuncelle(PERSONEL.personelId, { rol: 'yonetici' }, Y)
  d.esit(m.veri.oturumGetir()?.rol, 'yonetici', 'rolü değişen kişi yeni rolle çalışıyor')
  d.esit(sekmede()?.rol, 'admin', 'sekmenin oturumu girişteki rolü taşıyor (kurgu doğru)')
  d.esit(
    m.veri.islemYaz({ tur: 'sinama', ozet: 'rol değişti', personel: PERSONEL.ad })?.rol,
    'yonetici',
    'rolü değişen kişinin işlem kaydı yeni rolü taşıyor',
  )

  /* 4 · Kapatılan personel. */
  await m.veri.personelGuncelle(PERSONEL.personelId, { aktif: false }, Y)
  d.esit(m.veri.oturumGetir(), null, 'kapatılan personelin oturumu düştü')
  d.esit(sekmede(), null, 'kapatılan personelin sekme oturumu silindi')
  d.esit(sonGiris()?.personelId, PARCA_PERSONELI.personelId, 'başka kişinin son girişine dokunulmadı')

  /* 5 · Giriş, çıkış, silinen personel. */
  const y = await m.veri.personelEkle(
    { ad: 'Sınama Parça', kullanici: 'sinama.parca', rol: 'parca', eposta: '', tel: '', sifre: '123456' },
    Y,
  )
  d.esit(y?.hata, undefined, 'personel eklendi')
  const g = await m.veri.backofficeGiris('sinama.parca', '123456')
  d.esit(g?.hata, undefined, 'yeni personel giriş yaptı')
  d.esit(sekmede()?.personelId, y.kayit?.id, 'giriş bu sekmenin oturumuna yazıldı')
  d.esit(sonGiris()?.personelId, y.kayit?.id, 'giriş son giriş olarak da yazıldı (yeni sekme devralsın)')
  m.veri.oturumKapat(m.veri.oturumGetir())
  d.esit(sekmede(), null, 'çıkış sekmenin oturumunu sildi')
  d.esit(sonGiris(), null, 'çıkış son girişi de sildi')
  /* Son giriş başka sekmedeki başka bir personelinse çıkış ona
     dokunmuyor; silinseydi o kişinin yeni sekmesi giriş ekranına düşerdi. */
  await m.veri.backofficeGiris('sinama.parca', '123456')
  m.depo.save('panelOturum', { ...PARCA_PERSONELI, giris: Date.now() })
  m.veri.oturumKapat(m.veri.oturumGetir())
  d.esit(sekmede(), null, 'çıkış bu sekmenin oturumunu sildi (son giriş başkasının)')
  d.esit(sonGiris()?.personelId, PARCA_PERSONELI.personelId, 'başka kişinin son girişi çıkışta yerinde kaldı')

  /* Oturumsuz sekme (giriş ekranı): "Şifremi unuttum" isteğinin kaydına
     tarayıcıdaki son girişin (parça personeli) rolü yazılmıyor; isteyen
     kişinin rolü yazılıyor. */
  const satis = await m.veri.personelEkle(
    { ad: 'Sınama Fiyat', kullanici: 'sinama.fiyat', rol: 'satis', eposta: 'sinama.fiyat@ornek.test', tel: '', sifre: '123456' },
    Y,
  )
  d.esit(satis?.hata, undefined, 'e-postalı personel eklendi')
  const eskiKonum = globalThis.location
  globalThis.location = { origin: 'http://sinama.test', pathname: '/backoffice.html' }
  try {
    d.esit(m.veri.sifreTalebiOlustur('sinama.fiyat')?.hata, undefined, 'oturumsuz sekmede şifre bağlantısı istendi')
  } finally {
    globalThis.location = eskiKonum
  }
  const sifreSatiri = m.veri.islemKaydiGetir().find((x) => x.tur === 'sifre')
  d.esit(sifreSatiri?.rol, 'satis', 'şifre isteğinin kaydı isteyenin rolünü taşıyor, son girişinkini değil')
  d.esit(
    m.veri.islemYaz({ tur: 'sinama', ozet: 'oturumsuz', personel: 'Sınama Fiyat' })?.rol,
    null,
    'oturumsuz sekmede başkasının işlemine son girişin rolü yazılmadı',
  )
  d.esit(
    m.veri.islemYaz({ tur: 'sinama', ozet: 'oturumsuz', personel: PARCA_PERSONELI.ad })?.rol,
    'parca',
    'oturumsuz sekmede son girişin kendi işlemi onun rolünü taşıyor',
  )

  await m.veri.backofficeGiris('sinama.parca', '123456')
  m.veri.personelSil(y.kayit?.id, Y)
  d.esit(m.veri.oturumGetir(), null, 'silinen personelin oturumu düştü')
  d.esit(sonGiris(), null, 'silinen personelin son girişi yeni sekmeye kalmadı')

  /* 6 · Başka sekmenin rol değişikliği (O7). Bellek eski kalırken bu
     sekme hâlâ eski izni görüyor; depo olayı gelince okuyor. */
  m.depo.remove('panelIcerik')
  m.icerik.icerikTazele()
  d.dogru(m.veri.izinli('parca', 'talepler'), 'yedek parça rolü talepleri görüyor')
  const kisitli = m.veri
    .rolleriGetir()
    .map((r) => (r.id === 'parca' ? { ...r, izinler: r.izinler.filter((i) => i !== 'talepler') } : r))
  m.depo.save('panelIcerik', { roller: kisitli })
  d.dogru(m.veri.izinli('parca', 'talepler'), 'olay gelmeden bu sekmenin belleği eski izni tutuyor (kurgu doğru)')
  m.icerik.baskaSekmedenGeldi('panelIcerik')
  d.yanlis(m.veri.izinli('parca', 'talepler'), 'başka sekmenin rol değişikliği depo olayıyla okundu')
  m.icerik.baskaSekmedenGeldi(null)
  m.depo.remove('panelIcerik')
  m.icerik.icerikTazele()

  /* 7 · Paneli kapatılan servis. En sonda: servis hesabı panelIcerik'e
     yazılıyor ve depoda kalıyor; eşleme denetimi hesabın alanlarını
     (kullanici, panelAktif) ancak böyle görüyor. */
  await m.veri.servisHesabiYaz(SERVIS.id, { kullanici: 'sinama.servis', sifre: '123456' }, Y)
  const sg = await m.veri.servisGirisi('sinama.servis', '123456')
  d.esit(sg?.hata, undefined, 'servis giriş yaptı')
  d.esit(m.veri.servisOturumuGetir()?.servisId, SERVIS.id, 'servisin oturumu kabul ediliyor')
  m.veri.servisHesabiKapat(SERVIS.id, Y)
  d.esit(m.veri.servisOturumuGetir(), null, 'paneli kapatılan servisin oturumu düştü')
  d.esit(m.depo.oturumYukle('servisOturum', null), null, 'servisin sekme oturumu silindi')

  return d
}

/* ========================================================== AK-34 */

/* DEMO VERİSİ MAKİNEYE UYUYOR (25 Eylül 2026, kullanıcı sınaması).

   Demo verisindeki servis kayıtları makineyle uyuşmuyordu: rotovatörde
   "düğüm atmıyor, ip kopuyor" arızası, garantisi bitmiş makinede
   "garanti kapsamında" notu, Süper 8002E kaydında Yunus parçası. Demo
   artık makinenin ailesine, modeline ve garantisine göre üretiliyor
   (backoffice/demoMakineAilesi.js, marka sabitleri PARCA_ADINDAKI_MODEL
   ve GRUBUN_MODELLERI) ve gerçek akışın yazacağı biçimde yazıyor.

   Demo dosyası sunucu bağlanınca silinecek (servis/demoKur.js başı);
   o gün bu senaryo da silinir.

   Demo gerçekten kuruluyor: üç tohumla (rastgelelik tohumlu), katalog
   taklit fetch'ten. Kurallar kayıt kayıt değil ihlal listesiyle
   sınanıyor; kural başına tek iddia.

   DEPO BOŞALTILMIYOR, BİLEREK. Eşleme denetimi her senaryodan sonra
   depoda kalanı topluyor; senaryo depoyu silseydi demonun paylaşılan
   anahtarlara yazdığı hiçbir alan görülmezdi. Demo alanları eşlemede
   `yok(...)` ile duruyor (veritabani/uygulama-eslesmesi.mjs).

   Taşıdıkları:
     G1   demo kuruldu
     G2   takvim: makinenin yılı serinin yılı; defterde üretim ≤ fatura
          ≤ kayıt; talep makineden sonra; seri yeni kurala uyuyor
     G3   belirti makinenin ailesinden; kurulum ve elle işte belirti yok
     G4   garanti kaydı yalnız garantideki makinede
     G5   parça makinenin havuzundan; G5b aynı kural yardımcıdan
          bağımsız (grup ailesi, Yunus adı, Hammer grubu)
     G6   servis kaydının arıza nedeni, kaydın gönderildiği andaki
          talep nedeni (yeniden açılan işte müşterinin "Sorun Devam"
          cümlesi; lib/servisKaydi.js → talepNedeni)
     G7   "garanti kapsamında" notu yalnız garantideki servis işinde
     G8   parça planı gönderim işi; teklifte plan yok
     G9   km ve saat ücreti tarifeden
     G10  servis kaydı parçası görseli taşıyor
     G11  kapsam: her durum var
     G12  demoTemizle bağlı cari ve bildirimi siliyor, gerçeğe
          dokunmuyor (yalnız son tohumda: yazdıkları eşleme denetimine
          kalsın)
     G14  marka sabitleri bayat değil
     G15  Servisim'in sahnesi (backoffice/demoSahne.js, 29 Eylül 2026):
          her iş kendi durumunda ve kendi izini taşıyor (ek, "Sorun
          Devam", düzeltme, kısmi gönderim, iade, atama dışı …)
     G16  sahnenin ayarları ve hesap bildirimleri: özel ücret, servis
          indirimi, bakiye ek indirimi; bildirimler demo damgalı
     G17  Servisim'in cihaz izleri: demo adresleri, iki günden eski
          bildirimler okunmuş, yeniler okunmamış, bir uyarı görülmüş
     G18  sahne İşlem Kaydı'na satır bırakmıyor (yalnız "Demo verisi
          yüklendi")
     G12 ayrıca (29 Eylül 2026): demoTemizle sahnenin hesap
          bildirimlerini, adreslerini ve okunmuş kimliklerini siliyor,
          ayarları eski hâline döndürüyor, demo sürümünü siliyor
     ve gerçek biçim: telefon ve hesap kimliği (Kayıt Aç'ın kayıtsız
     kişisi hariç), Servisim randevusu saatsiz, elle işte atamaDisi
     kuralla, bir makinede tek açık iş, tekil talep numarası */
export async function AK34(m, ctx) {
  const d = defter('AK-34', 'Demo verisi makineye uyuyor')
  const al = (yol) => ctx.modulYukle(yol)
  const demo = await al('/src/backoffice/demo.js')
  const aile = await al('/src/backoffice/demoMakineAilesi.js')
  const demoServis = await al('/src/backoffice/demoServis.js')
  const sahneMod = await al('/src/backoffice/demoSahne.js')
  const sk = await al('/src/lib/servisKaydi.js')
  const { DEMO_SURUMU } = await al('/src/servis/demoKur.js')
  const pk = await al('/src/lib/parcaKatalogu.js')
  const ta = await al('/src/data/talepAlanlari.js')
  const tarih = await al('/src/lib/tarih.js')
  const mt = await al('/src/lib/makineTalepleri.js')
  const { getProduct, supportGroup, PARCA_GRUBU_AILESI, PARCA_ADINDAKI_MODEL, GRUBUN_MODELLERI } = m.marka
  const ihlalYok = (ihlal, ne) => d.bak(ihlal.length === 0, ne, '[]', ihlal.slice(0, 5))

  /* 6 (29 Eylül 2026): demo adreslerinin köyü müşterinin ilçesinde
     (backoffice/demo.js → KOYLER); aşağıda G4b.
     7 (29 Eylül 2026): Servisim'in sahnesi sabit ve gerçek işlevlerden
     (backoffice/demoSahne.js); aşağıda G15-G18. */
  d.esit(DEMO_SURUMU, 8, 'demo sürümü 8 (29.09.2026: D10 servisin randevusu; tarayıcıdaki demo bir kez yeniden kuruluyor)')

  /* Katalog sunucudan fetch'le geliyor; Node'da taklit ediliyor. */
  const katalogJson = JSON.parse(readFileSync(join(KOK, 'sunucu-taklidi/parca-katalogu/katalog.json'), 'utf8'))
  const gercekFetch = globalThis.fetch
  globalThis.fetch = async (adres) => {
    if (String(adres).endsWith('/katalog.json')) return { ok: true, status: 200, json: async () => katalogJson }
    throw new Error('sınamanın fetch taklidi yalnız katalogu verir: ' + adres)
  }
  const asilTohum = TOHUM

  try {
    pk.katalogUnut()
    const katalog = await pk.katalogGetir()

    /* G14 · Marka sabitleri bayat değil. */
    const g14 = []
    for (const [kelime, urunler] of Object.entries(PARCA_ADINDAKI_MODEL)) {
      for (const u of urunler) if (!getProduct(u)) g14.push(`${kelime}: ${u} ürün yok`)
      const adda = katalog.parcalar.some((p) =>
        String(p.ad).toLocaleUpperCase('tr-TR').split(/[^0-9A-ZÇĞİÖŞÜ]+/).includes(kelime),
      )
      if (!adda) g14.push(`${kelime} hiçbir parça adında yok`)
    }
    for (const [grup, urunler] of Object.entries(GRUBUN_MODELLERI)) {
      if (!katalog.gruplar.some((x) => x.id === grup)) g14.push(`${grup} katalogda yok`)
      for (const u of urunler) if (!getProduct(u)) g14.push(`${grup}: ${u} ürün yok`)
    }
    ihlalYok(g14, 'G14 marka sabitleri bayat değil')

    const DURUMLAR = ['yeni', 'incelemede', 'planlandi', 'parcaBekliyor', 'onayBekliyor', 'kapandi', 'iptal']
    const sahneBeklenen = {}
    for (const g of sahneMod.SAHNE_ISLERI.filter((x) => x.tur === 'servis' && !x.servis)) {
      sahneBeklenen[g.durum] = (sahneBeklenen[g.durum] || 0) + 1
    }

    for (const [sira, tohum] of [asilTohum, asilTohum + 1, asilTohum + 2].entries()) {
      depoTemizle()
      tohumla(tohum)
      const dunya = dunyaKur(m)
      m.veri.genelTarifeyiKaydet({ yolKm: 14, iscilikSaat: 60 }, {}, 'Sınama Yöneticisi')
      /* Demodan önceki ayarlar ve İşlem Kaydı: G12 geri dönüşü, G18
         sahnenin iz bırakmadığını buna göre ölçüyor. */
      const ayarOnce = {
        tarife: m.veri.hizmetTarifesiGetir().servisler[SERVIS.id] ?? null,
        iskonto: m.veri.parcaIskontosuGetir(),
      }
      const islemOnce = m.depo.load('islemKaydi', []).length
      const demoSaati = saat.simdi()
      const o = await demo.demoYukle()
      const E = `[tohum ${tohum}]`
      d.bak(!o?.hata && o?.talep > 0, `${E} G1 demo kuruldu`, 'talep > 0', o)

      const musteriler = m.depo.load('demoMusteriler', [])
      const demoTalepler = m.depo.load('demoTalepler', [])
      const defterSatirlari = m.depo.load('makineKayitlari', []).filter((x) => x.demo)
      const makineBul = new Map(musteriler.flatMap((mu) => mu.makineler.map((mk) => [mk.id, { mu, mk }])))
      const musteriIdleri = new Set(musteriler.map((x) => x.id))
      const servisTalepleri = demoTalepler.filter((r) => r.tur === 'servis' && !r.servisSiparisi)

      /* G2 · Takvim ve seri. */
      const g2 = []
      for (const mu of musteriler) {
        for (const mk of mu.makineler) {
          if (mk.year !== m.serial.extractYear(mk.serial)) g2.push(`${mk.serial} yılı ${mk.year}`)
          const s = m.serial.validateSerial(mk.serial)
          if (!s.ok || s.product.id !== mk.productId) g2.push(`${mk.serial} seri kuralı`)
          if (mu.createdAt > mk.addedAt) g2.push(`${mu.ad} hesabı makineden sonra`)
        }
      }
      for (const k of defterSatirlari) {
        if (!k.uretimTarihi) continue
        if (new Date(k.uretimTarihi).getFullYear() !== m.serial.extractYear(k.seri)) g2.push(`defter ${k.seri} üretim yılı`)
        if (!(k.faturaTarihi >= k.uretimTarihi)) g2.push(`defter ${k.seri} fatura üretimden önce`)
        if (!(k.tarih >= k.faturaTarihi)) g2.push(`defter ${k.seri} kayıt faturadan önce`)
      }
      for (const r of demoTalepler) {
        const x = r.makine?.id && makineBul.get(r.makine.id)
        if (x && r.createdAt < x.mk.addedAt) g2.push(`${r.no} makineden önce açılmış`)
      }
      ihlalYok(g2, `${E} G2 takvim ve seri tutarlı`)

      /* G3 · Belirti makinenin ailesinden. */
      const g3 = []
      for (const r of servisTalepleri) {
        const izinli = ta.belirtileriGetir(aile.makineAilesi(r.makine.productId))
        for (const b of r.belirtiler || []) if (!izinli.includes(b) || b === 'Diğer') g3.push(`${r.no} "${b}"`)
        if ((r.durum === 'kurulum' || r.elle) && ((r.belirtiler || []).length || r.ses)) g3.push(`${r.no} kurulum/elle işte belirti`)
      }
      ihlalYok(g3, `${E} G3 belirti makinenin ailesinden`)

      /* G4 · Garanti kaydı garantideki makinede. */
      ihlalYok(
        servisTalepleri.filter((r) => r.servisKaydi?.kapi === 'garanti' && !aile.garantideMi(r.makine.serial)).map((r) => r.no),
        `${E} G4 garanti kaydı yalnız garantideki makinede`,
      )

      /* G4b · Adres müşterinin köyü (29 Eylül 2026). Servisim'in "Yol
         Tarifi" adresi haritada açıyor; köy müşterinin ilçesinden
         bağımsız seçilince demo yanlış yeri gösteriyordu, aynı müşterinin
         her talebinde başka köy çıkıyordu. Her müşterinin bir adresi var;
         adresli servis talebi o adresi taşıyor; Servisim'in elle açtığı
         işte adres hep var (Kayıt Aç zorunlu tutuyor). */
      const musteriBul = new Map(musteriler.map((x) => [x.id, x]))
      const g4b = []
      for (const mu of musteriler) if (!mu.adres) g4b.push(`${mu.ad} (${mu.il}/${mu.ilce}) adressiz`)
      for (const r of servisTalepleri) {
        const mu = musteriBul.get(r.musteriId)
        if (r.elle && !r.adres) g4b.push(`${r.no} elle iş adressiz`)
        if (r.adres && mu && r.adres !== mu.adres) g4b.push(`${r.no} adresi müşterinin köyü değil`)
      }
      ihlalYok(g4b, `${E} G4b servis talebinin adresi müşterinin köyü`)

      /* G5 · G5b · Parça makinenin. */
      const satirlar = []
      for (const r of servisTalepleri) for (const p of r.servisKaydi?.parcalar || []) satirlar.push([r, p.kod])
      for (const r of demoTalepler.filter((x) => x.tur === 'parca' && !x.servisSiparisi)) {
        for (const s of r.parcaFiyat?.satirlar || []) satirlar.push([r, s.kod])
      }
      const g5 = []
      const g5b = []
      for (const [r, kod] of satirlar) {
        const pid = r.makine.productId
        if (!aile.makineninParcaHavuzu(katalog, pid).some((p) => p.kod === kod)) g5.push(`${r.no} ${pid} ${kod}`)
        const parca = pk.parcaBul(katalog, kod)
        const urun = getProduct(pid)
        if (PARCA_GRUBU_AILESI[parca?.grup] !== supportGroup(urun)) g5b.push(`${r.no} ${pid} grup ${parca?.grup}`)
        if (/\bYUNUS\b/.test(parca?.ad || '') && !/Yunus/i.test(urun?.name || '')) g5b.push(`${r.no} ${urun?.name} Yunus parçası`)
        if (parca?.grup === 'hammer-yedek-parca' && pid !== 'hammer') g5b.push(`${r.no} ${urun?.name} Hammer grubu`)
      }
      d.bak(satirlar.length > 0, `${E} G5 parça satırı var`, '> 0', satirlar.length)
      ihlalYok(g5, `${E} G5 parça makinenin havuzunda`)
      ihlalYok(g5b, `${E} G5b parça makinenin ailesinden ve modelinden (yardımcıdan bağımsız)`)

      /* G6 · Arıza nedeni talepten: kaydın gönderildiği andaki neden.
         Yeniden açılan işte o an müşterinin son "Sorun Devam" cümlesi
         (lib/servisKaydi.js → talepNedeni); kayıttan SONRA yazılan
         cümle o kaydın nedeni olamaz (29 Eylül 2026, sahne D05, D15). */
      const kayittakiNeden = (r) =>
        sk.talepNedeni({ ...r, tekrar: (r.tekrar || []).filter((x) => x.tarih < r.servisKaydi.tarih) })
      ihlalYok(
        servisTalepleri
          .filter((r) => r.servisKaydi && r.servisKaydi.ariza !== kayittakiNeden(r))
          .map((r) => r.no),
        `${E} G6 servis kaydının arıza nedeni talebin o anki nedeni`,
      )

      /* G7 · Garanti notu. */
      ihlalYok(
        demoTalepler
          .filter((r) => (r.notlar || []).some((n) => n.metin === demo.GARANTI_NOTU))
          .filter((r) => r.tur !== 'servis' || !aile.garantideMi(r.makine?.serial) || r.cozum?.garantiDisi || r.hakkedis?.durum === 'reddedildi')
          .map((r) => r.no),
        `${E} G7 garanti notu yalnız garantideki servis işinde`,
      )

      /* G8 · Parça planı; teklifte plan yok. */
      const g8 = []
      for (const r of demoTalepler.filter((x) => x.tur === 'parca' && !x.servisSiparisi && x.plan)) {
        if (!demo.PARCA_PLAN_IS.includes(r.plan.is)) g8.push(`${r.no} "${r.plan.is}"`)
        if (r.plan.saatBelirtildi !== true) g8.push(`${r.no} backoffice planı saatsiz`)
      }
      for (const r of demoTalepler.filter((x) => x.tur === 'satinalma' && x.plan)) g8.push(`${r.no} teklifte plan`)
      ihlalYok(g8, `${E} G8 parça planı gönderim işi, backoffice'ten saatli`)

      /* G9 · Ücret tarifeden. */
      ihlalYok(
        servisTalepleri
          .filter((r) => r.servisKaydi?.kapi === 'garanti' && r.servisKaydi.asama === 'bitti')
          .filter((r) => {
            const tf = m.veri.servisinTarifesi(r.servis.id, r.makine.productId)
            return r.servisKaydi.kmUcreti !== tf.yolKm || r.servisKaydi.saatUcreti !== tf.iscilikSaat || tf.yolKm !== 14
          })
          .map((r) => r.no),
        `${E} G9 km ve saat ücreti tarifeden`,
      )

      /* G10 · Görsel. */
      ihlalYok(
        servisTalepleri.flatMap((r) => (r.servisKaydi?.parcalar || []).filter((p) => !('gorsel' in p)).map((p) => `${r.no} ${p.kod}`)),
        `${E} G10 servis kaydı parçası görseli taşıyor`,
      )

      /* G11 · Kapsam. */
      const durumlar = new Set(servisTalepleri.map((r) => r.status))
      ihlalYok(DURUMLAR.filter((x) => !durumlar.has(x)), `${E} G11 demo servis talepleri her durumda`)
      const sahne = servisTalepleri.filter((r) => r.servis?.id === SERVIS.id)
      ihlalYok(
        Object.entries(sahneBeklenen)
          .filter(([durum, n]) => sahne.filter((r) => r.status === durum).length < n)
          .map(([durum, n]) => `${durum} < ${n}`),
        `${E} G11 sahne servisinde her görevin durumu`,
      )

      /* Gerçek biçim · telefon ve hesap kimliği. */
      const tel = []
      for (const r of demoTalepler.filter((x) => !x.servisSiparisi)) {
        if (r.telUlke !== 'TR') tel.push(`${r.no} ülke`)
        if (!/^\d{10}$/.test(r.telHam || '') || r.telHam !== m.tel.telHamYap('TR', r.telHam)) tel.push(`${r.no} ham "${r.telHam}"`)
        if (r.tel !== m.tel.telGoster('TR', r.telHam)) tel.push(`${r.no} görünen "${r.tel}"`)
        /* Kayıt Aç'ın kayıtsız kişisi (sahne D07) hesapsız: gerçek
           kayıtta da `musteriId` yok (lib/elleTalep.js). */
        const hesapsizElle = r.elle && !r.musteriId
        if (!musteriIdleri.has(r.musteriId) && !hesapsizElle) tel.push(`${r.no} hesap ${r.musteriId}`)
        const mu = musteriler.find((x) => x.id === r.musteriId)
        if (mu && !m.musteriEslesmesi.musterininMi(r, mu)) tel.push(`${r.no} müşterisiyle eşleşmiyor`)
      }
      ihlalYok(tel, `${E} demo talebi telefonu tek biçimde, hesap kimliğiyle (kayıtsız elle iş hariç)`)

      /* Gerçek biçim · Servisim randevusu yalnız gün. */
      const randevular = servisTalepleri.filter((r) => r.plan && r.plan.personel === r.servis?.ad)
      d.bak(randevular.length > 0, `${E} Servisim randevusu var`, '> 0', randevular.length)
      ihlalYok(
        randevular
          .filter((r) => r.plan.saatBelirtildi !== false || tarih.gunBasi(r.plan.tarih) !== r.plan.tarih || tarih.randevuSaatliMi(r.plan))
          .map((r) => r.no),
        `${E} Servisim randevusu saatsiz, günün başında`,
      )

      /* Gerçek biçim · elle iş gerçek elle kaydın kuralıyla. */
      const elle = servisTalepleri.filter((r) => r.elle)
      d.bak(elle.length > 0, `${E} demo elle iş var`, '> 0', elle.length)
      ihlalYok(
        elle
          .filter((r) => JSON.stringify(m.servisAtama.elleIsinAtamasi(r.makine, r.servis.id)) !== JSON.stringify(r.atamaDisi ?? null))
          .map((r) => r.no),
        `${E} elle işin atamaDisi alanı kuralla aynı`,
      )

      /* Açık iş, uygun boş makine varken dolu makineye konmuyor. Demo her
         açık işi ayrı makineye koymaya ÇALIŞIYOR; uygun boş makine
         kalmazsa aynı makineye düşebiliyor (demo.js → uygunlar) ve bu
         başka tohumlarda gerçekten oluyor. "Hiç üst üste binmez" demek
         kural değil tercih olurdu. Denetlenen, tercihin kendisi: aynı
         makinedeki iki açık işin her biri için, sonunda hâlâ boş kalmış
         ve o işe uyan bir makine (aynı havuzda) varsa demo onu
         seçebilirdi. Boş makine yalnız azalıyor; sonda boşsa işin
         yerleştiği anda da boştu. Havuz: sahne servisinin işi için sahne
         müşterilerinin makineleri, öteki işler için servisi başka olan
         makineler (demo.js → sahneAday, servisliMakineler). */
      const acikIsler = servisTalepleri.filter(mt.acikServisTalebiMi)
      const dolu = new Map()
      for (const r of acikIsler) dolu.set(r.makine.id, (dolu.get(r.makine.id) || 0) + 1)
      const sahneMakineleri = musteriler.slice(0, sahneMod.SAHNE_MUSTERI).flatMap((mu) => mu.makineler)
      const servisliMakineler = musteriler
        .slice(sahneMod.SABIT_MUSTERI)
        .flatMap((mu) => mu.makineler)
        .filter((mk) => {
          const s = m.servisAtama.makineninServisi(mk)?.servis
          return s && s.id !== demoServis.DEMO_SERVIS
        })
      const ihtiyaci = (r) => ({
        garanti: r.servisKaydi?.kapi === 'garanti',
        parcali: (r.servisKaydi?.parcalar || []).length > 0,
      })
      ihlalYok(
        acikIsler
          .filter((r) => dolu.get(r.makine.id) > 1)
          .filter((r) => {
            const havuz = r.servis?.id === demoServis.DEMO_SERVIS ? sahneMakineleri : servisliMakineler
            return havuz.some((mk) => !dolu.has(mk.id) && aile.makineUyar(katalog, mk, ihtiyaci(r)))
          })
          .map((r) => `${r.no} ${r.makine.serial}`),
        `${E} açık iş, uygun boş makine varken dolu makineye konmadı`,
      )

      /* Tekil numara. */
      const nolar = demoTalepler.map((r) => r.no)
      ihlalYok(nolar.filter((no, i) => nolar.indexOf(no) !== i), `${E} demo talep numaraları tekil`)

      /* G15 · Servisim'in sahnesi (29 Eylül 2026). Her iş kendi
         durumunda ve Servisim'in ilgili ekranını dolduran izi taşıyor.
         İzler uygulamanın kendi işlevlerinin yazdığı alanlar; sahne
         bir adımı atlarsa ya da elle kayıt kurarsa düşüyor. */
      const duyurularHam = m.depo.load('duyurular', [])
      const sahneServisi = sahneMod.SAHNE_ISLERI
      const sahneTalebi = (kod) => demoTalepler.find((r) => r.demoSahne === kod) || null
      const olayi = (r, olay) => duyurularHam.some((x) => x.alici === 'servis' && x.talepId === r?.id && x.olay === olay)
      const hesap = (r) => m.veri.siparisHesabi(r)
      const gunBasi = tarih.gunBasi(demoSaati)
      const IZ = {
        D01: (r) => r.ses?.veri?.startsWith('data:audio/') && r.belirtiler.length > 0 && r.aciklama.includes('\n'),
        D02: (r) => r.eklemeler?.length === 1 && olayi(r, 'musteriEkledi'),
        D03: (r) => r.durum === 'kurulum' && !r.belirtiler.length && !r.aciklama,
        D04: (r) => r.notlar?.some((n) => n.servise) && olayi(r, 'not') && aile.garantideMi(r.makine.serial),
        D05: (r) => r.tekrar?.length === 1 && r.servisKaydi?.asama === 'bitti' && !sk.buZiyaretinKaydi(r) && olayi(r, 'musteriSorunDevam'),
        D06: (r) => r.elle && Boolean(r.musteriId) && !r.atamaDisi,
        D07: (r) => r.elle && !r.musteriId && r.makine?.seriYok && r.atamaDisi?.durum === 'seriYok',
        D08: (r) => r.plan?.saatBelirtildi === false && r.plan.tarih < gunBasi,
        D09: (r) => r.plan?.saatBelirtildi === false && r.plan.tarih === gunBasi && r.notlar?.some((n) => n.musteriye),
        D10: (r) => r.plan?.saatBelirtildi === false && r.plan.tarih > demoSaati,
        D11: (r) => Boolean(r.devir) && r.sahip === 'paksan',
        D12: (r) => r.servisKaydi?.asama === 'parca' && !r.parcaSevk && r.masa === 'parca',
        D13: (r) => Boolean(r.parcaSevk?.takipNo && r.parcaSevk.guncelleme) && r.servisKaydi?.teslimat?.kaynak === 'kayitli' && olayi(r, 'kargoGuncellendi'),
        D14: (r) => r.hakkedis?.durum === 'bekliyor' && r.servisKaydi?.parcalar?.length > 0,
        D15: (r) => r.oncekiKayitlar?.length === 1 && r.servisKaydi?.duzeltmeler?.length === 1 && r.tekrar?.length === 1,
        D16: (r) => r.elle && r.atamaDisi?.durum === 'baskaServis' && r.hakkedis?.durum === 'bekliyor',
        D17: (r) => r.hakkedis?.durum === 'onaylandi' && r.servisKaydi?.parcalar?.length > 0 && r.notlar?.some((n) => n.servisten),
        D18: (r) => r.hakkedis?.durum === 'onaylandi' && r.servisKaydi?.duzeltmeler?.length === 1,
        D19: (r) => r.hakkedis?.durum === 'reddedildi',
        D20: (r) => r.cozum?.garantiDisi === true && !aile.garantideMi(r.makine.serial),
        D21: (r) => Boolean(r.devir) && Boolean(r.cozum?.yapilanIs) && olayi(r, 'kapandi'),
        D22: (r) => Boolean(r.iptalBilgi?.aciklama) && olayi(r, 'iptal'),
        D23: (r) => r.odeme === 'bakiye' && r.parcaFiyat?.bakiyeIskontoOrani > 0 && hesap(r).bekleyen > 0,
        D24: (r) => r.plan?.saatBelirtildi === true && olayi(r, 'planlandi'),
        D25: (r) => r.odeme === 'bakiye' && hesap(r).dusulen === hesap(r).net,
        D26: (r) => r.gonderimler?.length === 1 && hesap(r).bekleyen > 0 && olayi(r, 'siparisKismenGonderildi'),
        D27: (r) => r.gonderimler?.length === 2 && r.kalemIptalleri?.length === 1 && hesap(r).iptalEdilen > 0 && hesap(r).dusulen === hesap(r).net,
        D28: (r) => hesap(r).iade > 0 && hesap(r).dusulen === 0,
        D29: (r) => r.iptalBilgi?.personel === SERVIS.ad && !olayi(r, 'iptal'),
        D30: (r) => r.odeme === 'fatura' && r.parcaFiyat?.iskontoOrani !== m.veri.servisinIskontosu(SERVIS.id).oran,
        N1A: (r) => r.servis?.id !== SERVIS.id && r.status === 'yeni',
      }
      ihlalYok(
        sahneServisi
          .map((x) => [x, sahneTalebi(x.kod)])
          .filter(([x, r]) => !r || r.status !== x.durum || !IZ[x.kod]?.(r) || (x.tur === 'siparis') !== Boolean(r.servisSiparisi))
          .map(([x, r]) => `${x.kod} ${r ? r.status : 'yok'}`),
        `${E} G15 Servisim sahnesinin her işi kendi durumunda ve izinde`,
      )

      /* G16 · Sahnenin ayarları ve hesap bildirimleri. Sınama deposu
         temiz başlıyor: üç ayar da sahnenin yazdığı. */
      const tarifeSimdi = m.veri.hizmetTarifesiGetir()
      const iskontoSimdi = m.veri.parcaIskontosuGetir()
      const hesapBildirimleri = duyurularHam.filter((x) => x.tur === 'hesap' && x.servisId === SERVIS.id && x.demo)
      const g16 = []
      if (!m.servisTarifesi.makineFarklari(tarifeSimdi, SERVIS.id).length) g16.push('makineye göre ücret yok')
      if (!(iskontoSimdi.servisler[SERVIS.id] > 0)) g16.push('servise özel indirim yok')
      if (!(iskontoSimdi.bakiye > 0)) g16.push('bakiye ek indirimi yok')
      for (const olay of ['tarife', 'iskonto', 'bakiyeIskonto']) {
        if (!hesapBildirimleri.some((x) => x.olay === olay)) g16.push(`${olay} bildirimi demo damgalı değil`)
      }
      if (!m.depo.load(sahneMod.AYAR_YEDEGI, null)) g16.push('ayar yedeği yok')
      ihlalYok(g16, `${E} G16 sahnenin ayarları ve hesap bildirimleri`)

      /* G17 · Servisim'in cihaz izleri: adres defteri, okunmuşluk,
         "Anladım" denmiş uyarı. */
      const okunan = new Set(m.depo.load('okunanBildirimlerServis', []))
      const servisBildirim = m.veri.servisBildirimleri(SERVIS.id)
      const g17 = []
      const demoAdresleri = (m.depo.load('servisAdresleri', {})[SERVIS.id] || []).filter((a) => a.demo)
      if (demoAdresleri.length !== 2) g17.push(`demo adresi ${demoAdresleri.length}`)
      const eski = servisBildirim.filter((b) => demoSaati - b.tarih > 2 * 86400000)
      const yeni = servisBildirim.filter((b) => demoSaati - b.tarih < 1.5 * 86400000)
      if (!eski.length || eski.some((b) => !okunan.has(b.id))) g17.push('eski bildirim okunmamış')
      if (!yeni.length || yeni.some((b) => okunan.has(b.id))) g17.push('yeni bildirim okunmuş')
      const gorulen = new Set(m.depo.load('gorulenDuyurularServis', []))
      const uyarilar = duyurularHam.filter((x) => x.demo && x.tur === 'uyari')
      if (uyarilar.filter((x) => gorulen.has(x.id)).length !== 1) g17.push('görülmüş uyarı tek değil')
      ihlalYok(g17, `${E} G17 Servisim'in cihaz izleri`)

      /* G18 · Sahne İşlem Kaydı'na satır bırakmıyor: gerçek işlevlerin
         yazdığı satırlar geri alınıyor, demonun özet satırı kalıyor. */
      const islemSonra = m.depo.load('islemKaydi', [])
      d.bak(
        islemSonra.length === islemOnce + 1 && islemSonra[0]?.tur === 'demo',
        `${E} G18 sahne İşlem Kaydı'na satır bırakmıyor`,
        `${islemOnce + 1} satır, ilki demo özeti`,
        { satir: islemSonra.length, ilk: islemSonra[0]?.ozet },
      )

      /* G12 · demoTemizle — yalnız SON tohum (25 Eylül 2026, inceleme).
         İlk tohumdaydı: sonraki tohumların başındaki depoTemizle() G12'nin
         gerçek (demo olmayan) yazımlarını siliyor, eşleme denetimi yalnız
         G12'siz depoyu görüyordu. Son tohumda kalan depo denetime gidiyor. */
      if (sira === 2) {
        const onay = demoTalepler.find((r) => r.status === 'onayBekliyor' && r.hakkedis?.toplam > 0)
        m.veri.hakkedisOnayla(onay, 'Sınama Yöneticisi')
        const demoAlacak = m.depo.load('cariHareket', []).filter((h) => !h.demo && h.talepId === onay?.id)
        d.esit(demoAlacak.length, 1, 'G12 ön koşul: demo işinin onayı işaretsiz bir alacak yazdı')

        const r = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', dunya.urunId, dunya.makineler[0]), dunya.kisi))
        m.veri.servisKaydiGonder(r, bitmisKayit({ saatUcreti: 60, iscilik: 300 }), SERVIS.ad)
        m.veri.hakkedisOnayla(bul(m, r.id), 'Sınama Yöneticisi')
        const gercekAlacak = m.depo.load('cariHareket', []).filter((h) => h.talepId === r.id).length
        const gercekBildirim = m.depo.load('duyurular', []).filter((x) => x.talepId === r.id || x.talepNo === r.no).length
        d.bak(gercekAlacak === 1 && gercekBildirim > 0, 'G12 ön koşul: gerçek iş alacak ve bildirim yazdı', '1 ve > 0', { gercekAlacak, gercekBildirim })

        const idler = new Set(demoTalepler.map((x) => x.id))
        const numaralar = new Set(demoTalepler.map((x) => x.no))
        /* Servisim demoyu kurmuş gibi: temizlik sürümü de silmeli. */
        m.depo.save('demoSurumu', DEMO_SURUMU)
        demo.demoTemizle()
        const cari = m.depo.load('cariHareket', [])
        const duyurular = m.depo.load('duyurular', [])
        ihlalYok(cari.filter((h) => idler.has(h.talepId) || h.demo).map((h) => h.aciklama), 'G12 demo talebine bağlı cari satırı kalmadı')
        ihlalYok(
          duyurular
            .filter((x) => x.kisisel && (idler.has(x.talepId) || (!x.talepId && numaralar.has(x.talepNo)) || musteriIdleri.has(x.musteriId)))
            .map((x) => x.olay || x.metinAnahtar),
          'G12 demo talebine bağlı bildirim kalmadı',
        )
        d.esit(cari.filter((h) => h.talepId === r.id).length, gercekAlacak, 'G12 gerçek işin alacağı duruyor')
        d.esit(duyurular.filter((x) => x.talepId === r.id || x.talepNo === r.no).length, gercekBildirim, 'G12 gerçek işin bildirimleri duruyor')

        /* G12 · sahnenin izleri (29 Eylül 2026): hesap bildirimi, adres,
           okunmuş kimlikler, ayarlar ve demo sürümü. */
        const g12 = []
        if (duyurular.some((x) => x.demo)) g12.push('demo damgalı bildirim kaldı')
        if (Object.values(m.depo.load('servisAdresleri', {})).flat().some((a) => a.demo)) g12.push('demo adresi kaldı')
        const kalan = new Set(duyurular.map((x) => x.id))
        for (const anahtar of ['okunanBildirimlerServis', 'gorulenDuyurularServis']) {
          if (m.depo.load(anahtar, []).some((id) => !kalan.has(id))) g12.push(`${anahtar} silinen kimliği tutuyor`)
        }
        const tarifeSon = m.veri.hizmetTarifesiGetir().servisler[SERVIS.id] ?? null
        const iskontoSon = m.veri.parcaIskontosuGetir()
        if (JSON.stringify(tarifeSon) !== JSON.stringify(ayarOnce.tarife)) g12.push('servisin ücreti eski hâline dönmedi')
        if (iskontoSon.servisler[SERVIS.id] !== ayarOnce.iskonto.servisler[SERVIS.id]) g12.push('servis indirimi eski hâline dönmedi')
        if (iskontoSon.bakiye !== ayarOnce.iskonto.bakiye) g12.push('bakiye ek indirimi eski hâline dönmedi')
        if (m.depo.load(sahneMod.AYAR_YEDEGI, null)) g12.push('ayar yedeği kaldı')
        if (m.depo.load('demoSurumu', null) !== null) g12.push('demo sürümü kaldı (Servisim yeniden kurmaz)')
        ihlalYok(g12, 'G12 sahnenin izleri gitti, ayarlar eski hâlinde')

        /* Demo yeniden kuruluyor: eşleme denetimi hem G12'nin gerçek
           yazımlarını hem demonun paylaşılan anahtarlara yazdığı alanları
           görsün (demoTemizle ikincisini silmişti). */
        const yeniden = await demo.demoYukle()
        d.bak(!yeniden?.hata && yeniden?.talep > 0, 'G12 sonrası demo yeniden kuruldu (kurgu doğru)', 'talep > 0', yeniden)
      }
    }
  } finally {
    globalThis.fetch = gercekFetch
    pk.katalogUnut()
    /* Tohum ilk hâline: depoTemizle() bundan sonraki senaryoyu aynı
       tohumla başlatsın. Depo BİLEREK boşaltılmıyor (başlığa bakın). */
    tohumla(asilTohum)
  }

  return d
}

/* ========================================================== AK-35 */

/* YENİDEN AÇILAN İŞTE GEÇEN ZİYARETİN KAYDI (26 Eylül 2026, ikinci
   kullanıcı sınaması Y1).

   Müşteri kapanmış işte "Sorun Devam Ediyor" deyince talep "yeni"ye
   dönüyor, son servis kaydı ise yerinde kalıyor. Servisim o kaydı bu
   ziyaretinmiş gibi okuyordu: kayıt formu geçen ziyaretin yapılan işi,
   km'si ve süresiyle dolu açıldı, parça isteği o değerlerle yazıldı
   (backoffice'e "Ayar Yapıldı · 20 km · 1 saat" göründü), "Parçayı
   Taktım" eski 20 km / 1 saatle hazır geldi, "Randevu" düğmesi çıkmadı,
   iş "Yeni"ye düşmedi. Kural lib/servisKaydi.js → buZiyaretinKaydi;
   form, randevu ve "Yeni" sekmesi onu soruyor. Veri katmanı parça
   isteğine sorulmayan alanları yazmıyor (veri.js → servisKaydiGonder).

   Connect'in "Sorun Devam Ediyor"u Connect'te yazılıyor
   (screens/RequestDetail.jsx); burada aynı yama depoya elle uygulanıyor.

   Taşıdıkları:
     1     kapanmış işin kaydı bu ziyaretin (onay sonrası da)
     2     yeniden açılınca kayıt önceki ziyaretin; iş "Yeni"de; kayıt
           formunun "talep nedeni" müşterinin son cümlesi
     3     parça isteği sorulmayan alanları taşımıyor; önceki ziyaret
           arşivde; parça isteği bu ziyaretin
     4     2. aşama aynı ziyaret: arşiv büyümüyor, hak ediş yeni değerle
     5     onayda iki ziyaretin iki alacağı
     6     kurulum ve belirti talebinde "talep nedeni" boş gelmiyor
     7     eski garanti dışı parça isteği (bitmiş kayıtla parça bekliyor)
           bu ziyaretin sayılıyor
     8     arşive giden sevkin geçmiş satırı iki uygulamada "parça yolda" */
export async function AK35(m, ctx) {
  const d = defter('AK-35', 'Yeniden açılan işte geçen ziyaretin kaydı')
  depoTemizle()
  const { urunId, kisi, makineler } = dunyaKur(m)
  const is = await ctx.modulYukle('/src/servis/isDurumu.js')
  const sk = m.servisKaydi
  const PERSONEL = 'Sınama Yöneticisi'
  const alacaklar = (no) => m.veri.cariHareketleri(SERVIS.id).filter((h) => h.tur === 'alacak' && h.talepNo === no)
  const connectSorunDevam = (id, aciklama) => {
    const simdi = saat.simdi()
    m.depo.save(
      'requests',
      m.depo.load('requests', []).map((t) =>
        t.id === id
          ? {
              ...t,
              status: 'yeni',
              tekrar: [...(t.tekrar || []), { tarih: simdi, aciklama }],
              gecmis: [...(t.gecmis || []), { durum: 'yeni', tarih: simdi }],
            }
          : t,
      ),
    )
  }

  /* 1 · İlk ziyaret bitiyor, PAKSAN onaylıyor. */
  const r = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi))
  m.veri.servisKaydiGonder(r, bitmisKayit({ km: 20, iscilikSaat: 1 }), SERVIS.ad)
  d.esit(sk.buZiyaretinKaydi(bul(m, r.id))?.km, 20, 'onay bekleyen işin kaydı bu ziyaretin')
  m.veri.hakkedisOnayla(bul(m, r.id), PERSONEL)
  d.esit(bul(m, r.id)?.status, 'kapandi', 'ilk ziyaret kapandı')
  d.esit(sk.buZiyaretinKaydi(bul(m, r.id))?.km, 20, 'kapanmış işin kaydı bu ziyaretin')

  /* 2 · Müşteri "Sorun Devam Ediyor" diyor. */
  connectSorunDevam(r.id, 'Yine aynı yay kırıldı')
  const acilan = bul(m, r.id)
  d.esit(acilan?.status, 'yeni', 'iş yeniden açıldı')
  d.esit(acilan?.servisKaydi?.km, 20, 'geçen ziyaretin kaydı talepte duruyor (sınamanın kurgusu)')
  d.esit(sk.buZiyaretinKaydi(acilan), null, 'yeniden açılan işte kayıt önceki ziyaretin: form boş, Randevu açık')
  d.dogru(is.dokunulmamis(acilan), 'yeniden açılan iş Servisim\'de "Yeni" sekmesinde')
  d.esit(sk.talepNedeni(acilan), 'Yine aynı yay kırıldı', 'talep nedeni müşterinin son cümlesi')

  /* 3 · Servis parça istiyor; form durumunda eski değerler var. */
  const eskiDegerli = {
    asama: 'parca',
    kapi: 'garanti',
    parcalar: [{ ad: 'Rulman', adet: 1, kod: 'PRC-1' }],
    teslimat: ADRES,
    sonuc: 'Yay yine kırılmış',
    yapilanIs: 'Ayar Yapıldı',
    km: 20,
    ...sk.iscilikAlanlari(1, 90),
  }
  const p = m.veri.servisKaydiGonder(acilan, eskiDegerli, SERVIS.ad)
  d.esit(p?.hata, undefined, 'parça isteği kabul edildi')
  const t3 = bul(m, r.id)
  d.esit(t3?.status, 'parcaBekliyor', 'parça bekleniyor')
  d.esit(t3?.servisKaydi?.yapilanIs, '', 'parça isteği "yapılan iş" taşımıyor')
  d.esit(t3?.servisKaydi?.km, 0, 'parça isteği km taşımıyor')
  d.esit(t3?.servisKaydi?.iscilikSaat, 0, 'parça isteği işçilik süresi taşımıyor')
  d.esit(t3?.servisKaydi?.iscilik, 0, 'parça isteği işçilik tutarı taşımıyor')
  d.esit((t3?.oncekiKayitlar || []).length, 1, 'geçen ziyaret arşive gitti')
  d.esit(t3?.oncekiKayitlar?.[0]?.km, 20, 'arşivdeki ziyaret kendi km\'siyle')
  d.esit(sk.buZiyaretinKaydi(t3)?.asama, 'parca', 'parça isteği bu ziyaretin kaydı')
  d.yanlis(is.dokunulmamis(t3), 'parça bekleyen iş "Devam Eden"de')

  /* 4 · Parça takıldı: aynı ziyaretin 2. aşaması. */
  m.veri.servisParcasiGonderildi(t3, { firma: 'Aras', takipNo: 'SINAMA-35' }, PERSONEL)
  /* Servisim 2. aşamada 1. aşamanın parçalarını formdan yeniden gönderiyor
     (ServisKapanisi.jsx → parcalar, `onceki`den). */
  const ikinci = bitmisKayit({
    yapilanIs: 'Parça Değişti', km: 35, iscilikSaat: 2, saatUcreti: 50, iscilik: 100,
    parcalar: t3.servisKaydi.parcalar,
  })
  const s2 = m.veri.servisKaydiGonder(bul(m, r.id), ikinci, SERVIS.ad)
  d.esit(s2?.hata, undefined, '2. aşama kabul edildi')
  const t4 = bul(m, r.id)
  d.esit(t4?.status, 'onayBekliyor', 'iş onaya gitti')
  d.esit((t4?.oncekiKayitlar || []).length, 1, '2. aşama arşivi büyütmedi (aynı ziyaret)')
  d.esit(t4?.servisKaydi?.km, 35, 'kayıt bu ziyaretin km\'siyle')
  d.esit(t4?.hakkedis?.toplam, sk.hakkedisHesapla(t4?.servisKaydi).toplam, 'hak ediş bu ziyaretin değerleriyle')
  d.esit(sk.temizParcalar(t4?.servisKaydi?.parcalar).length, 1, '1. aşamanın parçası kayıtta kaldı')

  /* 5 · Onay: iki ziyaret, iki alacak. */
  m.veri.hakkedisOnayla(t4, PERSONEL)
  d.esit(alacaklar(r.no).length, 2, 'iki ziyaretin iki alacağı')
  d.esit(
    alacaklar(r.no).reduce((a, h) => a + h.tutar, 0),
    t4.oncekiKayitlar[0].hakkedis.toplam + t4.hakkedis.toplam,
    'alacaklar iki ziyaretin hak edişleri toplamı',
  )

  /* 6 · Talep nedeni boş gelmiyor. */
  d.esit(sk.talepNedeni({ durum: 'kurulum', aciklama: '', belirtiler: [] }), 'İlk kurulum yapılacak', 'kurulum talebinde makinenin durumu')
  d.esit(sk.talepNedeni({ durum: 'sorunlu', aciklama: '', belirtiler: ['Anormal ses geliyor', 'Aşırı titriyor'] }), 'Anormal ses geliyor, Aşırı titriyor', 'belirtiler açıklamasız talepte')
  d.esit(sk.talepNedeni({ aciklama: 'İp kopuyor', tekrar: [{ tarih: 1, aciklama: '' }] }), 'İp kopuyor', 'boş "Sorun Devam" açıklaması ilk açıklamayı ezmiyor')

  /* 8 · Üçüncü ziyaret: 2. ziyaretin sevki arşive gidiyor; geçmişteki
     "parça yola çıktı" satırı iki uygulamada da öyle kalıyor
     (lib/talep.js → sevkSatiriMi). */
  connectSorunDevam(r.id, 'Yine ses geliyor')
  m.veri.servisKaydiGonder(bul(m, r.id), bitmisKayit({ km: 10, iscilikSaat: 1, sonuc: 'Ayar yapıldı, makine çalışıyor' }), SERVIS.ad)
  const t8 = bul(m, r.id)
  d.esit(t8?.parcaSevk ?? null, null, 'yeni ziyarette talepte sevk kalmadı (arşivde)')
  const parcaSatirlari = (t8?.gecmis || []).filter((g) => g.durum === 'parcaBekliyor')
  d.esit(parcaSatirlari.length, 2, 'geçmişte iki "parça bekliyor" satırı (istek ve sevk)')
  d.esit(parcaSatirlari.map((g) => m.veri.gecmisDurumu(t8, g).id).join(','), 'parcaBekliyor,parcaYolda', 'backoffice arşivdeki sevki "Parça Yolda" okuyor')
  d.esit(
    parcaSatirlari.map((g) => m.talep.gecmisSatiriAnahtari(t8, g)).join(','),
    'talepDurum.parcaBekliyor,talepDurum.parcaYolda',
    'Connect ikinci satırı "parça yola çıktı" yazıyor',
  )

  /* 7 · Eski garanti dışı parça isteği bitmiş kayıtla "parça bekliyor". */
  d.dogru(
    Boolean(sk.buZiyaretinKaydi({ status: 'parcaBekliyor', servisKaydi: { asama: 'bitti', kapi: 'parcaIste' } })),
    'eski parça isteğinin kaydı bu ziyaretin',
  )

  return d
}

/* ========================================================== AK-36 */

/* KAPANIŞTAN SONRA KARGO BİLGİSİ (26 Eylül 2026, ikinci kullanıcı
   sınaması O2).

   Müşterinin parça talebinde kargo kapanış formunda soruluyor ve iki
   kutu da isteğe bağlı. Personel takip numarasını boş bırakıp kapattı;
   talep kapandıktan sonra numarayı girmenin yolu yoktu, çiftçiye yalnız
   "Kargo bilgisi: Aras Kargo" gitti (YPR2609268517). Artık kapanmış
   talepte kargo bilgisi yazılabiliyor (veri.js → musteriKargosunuGuncelle):
   talep kapalı kalıyor, müşteriye kargo bilgisiyle tek bildirim gidiyor.

   Taşıdıkları:
     1     takip numarası kapanıştan sonra yazılıyor; talep kapalı, ilk
           gönderimin tarihi ve personeli korunuyor, düzelten ayrıca
     2     müşteriye kargo bilgisini taşıyan tek bildirim
     3     aynı bilgi ikinci kez yazılmıyor, bildirim tekrarlanmıyor;
           boş bilgi reddediliyor
     4     açık talebe, servis siparişine yazılmıyor
     5     hesaba bağlı olmayan talepte bildirim yazılmıyor */
export function AK36(m) {
  const d = defter('AK-36', 'Kapanmış parça talebinde kargo bilgisi')
  depoTemizle()
  const { urunId, kisi, makineler } = dunyaKur(m)
  const PERSONEL = 'Sınama Parça'
  const parcaTalebi = (ek = {}, hesap = kisi) =>
    talebiYaz(
      m,
      m.talepOlustur.talepKaydiOlustur(
        talepVerisi('parca', urunId, makineler[0], {
          parcalar: ['Rulman'],
          parcaAdet: { Rulman: 1 },
          fatura: { ad: MUSTERI.ad, tel: MUSTERI.tel, adres: MUSTERI.adres },
          dekont: { id: 'dk-36', ad: 'dekont.pdf', boyut: 1024 },
          ...ek,
        }),
        hesap,
      ),
    )
  const kargoBildirimleri = (no) =>
    kisiselBildirimler(m).filter((b) => b.talepNo === no && b.baslikAnahtar === 'bildirimler.kargoGuncellendiBaslik')

  /* 1 · Kapanışta yalnız firma yazıldı. */
  const r = parcaTalebi()
  m.veri.odemeOnayla(r, PERSONEL, '')
  const acik = bul(m, r.id)
  d.dogru(Boolean(m.veri.musteriKargosunuGuncelle(acik, { takipNo: '1' }, PERSONEL)?.hata), 'açık talebe kargo bilgisi yazılmadı')
  m.veri.talepKapat(acik, { yapilanIs: 'Parça gönderildi', not: '', kargo: { firma: 'Aras Kargo', takipNo: '' } }, PERSONEL)
  const kapali = bul(m, r.id)
  const ilkTarih = kapali?.parcaSevk?.tarih
  d.esit(kapali?.parcaSevk?.takipNo, '', 'kapanışta takip numarası boş')

  const g = m.veri.musteriKargosunuGuncelle(kapali, { firma: 'Aras Kargo', takipNo: '4455667788' }, 'Burak Sınama')
  d.esit(g?.hata, undefined, 'takip numarası kapanıştan sonra yazıldı')
  const t1 = bul(m, r.id)
  d.esit(t1?.status, 'kapandi', 'talep kapalı kaldı')
  d.esit(t1?.parcaSevk?.takipNo, '4455667788', 'takip numarası talepte')
  d.esit(t1?.parcaSevk?.tarih, ilkTarih, 'ilk gönderimin tarihi korundu')
  d.esit(t1?.parcaSevk?.personel, PERSONEL, 'parçayı gönderen personel korundu')
  d.esit(t1?.parcaSevk?.guncelleyen, 'Burak Sınama', 'düzelten ayrıca yazıldı')

  /* 2 · Müşteriye tek bildirim, kargo bilgisiyle. */
  const b = kargoBildirimleri(r.no)
  d.esit(b.length, 1, 'müşteriye kargo bildirimi gitti')
  d.esit(b[0]?.metinAnahtar, 'bildirimler.kargoGuncellendiMetin', 'bildirim kargo metnini taşıyor')
  d.dogru(String(b[0]?.degerler?.kargo || '').includes('4455667788'), 'takip numarası bildirimin içinde')
  d.esit(b[0]?.musteriId, kisi.id, 'bildirim talebin hesabına')

  /* 3 · Aynı bilgi ve boş bilgi. */
  const ayni = m.veri.musteriKargosunuGuncelle(t1, { firma: 'Aras Kargo', takipNo: '4455667788' }, PERSONEL)
  d.dogru(Boolean(ayni?.hata), 'değişmeyen kargo bilgisi yeniden yazılmadı')
  d.dogru(Boolean(m.veri.musteriKargosunuGuncelle(t1, { firma: ' ', takipNo: '' }, PERSONEL)?.hata), 'boş kargo bilgisi reddedildi')
  d.esit(kargoBildirimleri(r.no).length, 1, 'bildirim tekrarlanmadı')

  /* 4 · Servis siparişine yazılmıyor. */
  const siparis = talebiYaz(m, {
    ...parcaTalebi(),
    id: 'ak36-siparis',
    no: 'YPR2609990036',
    servisSiparisi: true,
    status: 'kapandi',
  })
  d.dogru(Boolean(m.veri.musteriKargosunuGuncelle(siparis, { takipNo: '9' }, PERSONEL)?.hata), 'servis siparişine müşteri kargosu yazılmadı')

  /* 5 · Hesaba bağlı olmayan talep: kayıt yazılıyor, bildirim yok. */
  const kimliksiz = parcaTalebi({ musteriId: null, tel: '5329990036', telHam: '5329990036' }, null)
  m.veri.odemeOnayla(kimliksiz, PERSONEL, '')
  m.veri.talepKapat(bul(m, kimliksiz.id), { yapilanIs: 'Parça gönderildi', not: '' }, PERSONEL)
  const k = m.veri.musteriKargosunuGuncelle(bul(m, kimliksiz.id), { firma: 'Yurtiçi', takipNo: '1234' }, PERSONEL)
  d.esit(k?.hata, undefined, 'hesapsız talebe de kargo bilgisi yazıldı')
  d.esit(kargoBildirimleri(kimliksiz.no).length, 0, 'hesaba bağlı olmayan talepte bildirim yazılmadı')

  return d
}

/* ========================================================== AK-37 */

/* KVKK ONAYLARININ KAYDI VE SERVİSİM'İN GİZLİLİK KABULÜ (29 Eylül 2026,
   kullanıcının isteği: "KVKK, Açık Rıza Metni ve İzinler kısmı gözden
   geçirilecek … Servisim için de hukuki açıdan bizi ve kullanıcıyı
   koruyacak aksiyonların alınması gerekiyor").

   Connect'te hesapta yalnız son durum vardı; kampanya izni Profil'den
   değişince tarih yazılmıyordu. Artık her karar ayrı satır
   (lib/rizaKaydi.js) ve kodları veritabanının listeleriyle aynı. Metin
   sürümü değişince eski sürümü onaylamış hesaba yeniden soruluyor.
   Servisim ilk girişte iki metni kabul ettiriyor (lib/servisGizlilik.js).

   Taşıdıkları:
     1     kayıt üç kararı yazıyor: iki onay, kampanya için onay ya da ret;
           sürüm bugünkü metnin, dil ve kanal doğru
     2     kampanya açılıp kapanınca olay ekleniyor (onay / geriCekme),
           son değişikliğin tarihi yazılıyor, eski olaylar yerinde
     3     eski sürümü onaylamış hesap yeniden onaya düşüyor; onay iki
           zorunlu metni yeni sürümle yazıyor, kampanya kararı değişmiyor
     4     sınama tohumunun hesabı bugünkü sürümde (yoksa ekran turundaki
           her Connect adımı güncelleme penceresinin arkasında kalır)
     5     yazılan her seçim ve kanal kodu veritabanının kod listesinde var
     6     Servisim: kabul etmemiş servis kapıda kalıyor, kabul eden
           geçiyor, başka servisin kabulü sayılmıyor, eski sürümün kabulü
           yeni sürüme sayılmıyor */
export async function AK37(m) {
  const d = defter('AK-37', 'KVKK onay kaydı ve Servisim gizlilik kabulü')
  depoTemizle()
  const R = m.rizaKaydi
  const { KVKK_SURUM } = await modulYukle('/src/data/kvkk.js')
  const { SERVIS_METIN_SURUM } = await modulYukle('/src/data/servisGizlilik.js')

  // 1 — kayıt
  const kayit = R.kayitOnaylari({ kampanya: false, dil: 'en' })
  d.esit(kayit.olaylar.length, 3, 'kayıt üç karar yazdı')
  d.esit(
    kayit.olaylar.map((o) => `${o.metin}:${o.secim}`).join(','),
    'aydinlatma:onay,acikRiza:onay,ticariIleti:ret',
    'iki zorunlu metin onaylı, işaretlenmeyen kampanya "ret"',
  )
  d.dogru(kayit.olaylar.every((o) => o.surum === KVKK_SURUM), 'olaylar bugünkü metin sürümünde')
  d.dogru(kayit.olaylar.every((o) => o.dil === 'en' && o.kanal === 'connectKayit'), 'dil ve kanal yazıldı')
  d.esit(kayit.surum, KVKK_SURUM, 'hesabın onay sürümü bugünkü metin')
  d.esit(kayit.kampanya, false, 'kampanya kapalı başladı')

  // 2 — kampanya aç / kapat
  const acik = R.kampanyaDegisti(kayit, true, 'tr')
  d.esit(acik.kampanya, true, 'kampanya açıldı')
  d.esit(acik.olaylar.length, 4, 'açma ayrı satır')
  d.esit(acik.olaylar[3].secim, 'onay', 'açma "onay"')
  d.esit(acik.olaylar[3].kanal, 'connectProfil', 'açma Profil kanalından')
  d.esit(kayit.olaylar.length, 3, 'önceki hâl değiştirilmedi (olaylar yalnız eklenir)')
  const kapali = R.kampanyaDegisti(acik, false, 'tr')
  d.esit(kapali.olaylar[4].secim, 'geriCekme', 'kapatma "geriCekme"')
  d.dogru(R.kampanyaSonDegisiklik(kapali) >= kayit.tarih, 'son değişikliğin tarihi yazıldı')

  // 3 — metin güncellemesi
  const eski = { ...kapali, surum: '1.0' }
  d.esit(R.onayYenilenmeli({ onaylar: eski }), true, 'eski sürümü onaylamış hesap yeniden onaya düştü')
  d.esit(R.onayYenilenmeli({ onaylar: kapali }), false, 'bugünkü sürümü onaylamış hesap düşmedi')
  d.esit(R.onayYenilenmeli({}), true, 'onayı hiç olmayan hesap da düştü')
  const yeni = R.guncellemeOnayi(eski, 'tr')
  d.esit(R.onayYenilenmeli({ onaylar: yeni }), false, 'güncelleme onayından sonra yeniden sorulmuyor')
  d.esit(
    yeni.olaylar.slice(-2).map((o) => `${o.metin}:${o.secim}:${o.kanal}`).join(','),
    'aydinlatma:onay:connectGuncelleme,acikRiza:onay:connectGuncelleme',
    'güncelleme iki zorunlu metni yeni sürümle yazdı',
  )
  d.esit(yeni.kampanya, false, 'kampanya kararı güncellemede değişmedi')
  /* Hesap depoya yazılıyor: eşleme denetimi (veritabani-eslesme-denetimi)
     olay alanlarını ancak depoda görürse denetleyebiliyor. */
  m.depo.save('hesap', { ...MUSTERI, onaylar: yeni })

  // 4 — tohum güncel
  d.esit(MUSTERI.onaylar.surum, KVKK_SURUM, 'sınama tohumunun hesabı bugünkü sürümde (tohum.mjs → KVKK_SURUMU)')

  // 5 — kodlar veritabanının listesinde
  const kodlar = JSON.parse(readFileSync(join(KOK, 'veritabani/tohum/kaynak/kod-adlari.json'), 'utf8'))
  const yazilan = [...yeni.olaylar, ...kapali.olaylar]
  const secimYok = yazilan.filter((o) => !kodlar['kod.RizaSecimi'][o.secim]).map((o) => o.secim)
  const kanalYok = yazilan.filter((o) => !kodlar['kod.RizaKanali'][o.kanal]).map((o) => o.kanal)
  d.esit(secimYok.join(','), '', 'her seçim kodu kod.RizaSecimi listesinde')
  d.esit(kanalYok.join(','), '', 'her kanal kodu kod.RizaKanali listesinde')

  // 6 — Servisim kabulü
  const G = m.servisGizlilik
  const oturum = { servisId: SERVIS.id, no: SERVIS.no, ad: SERVIS.ad }
  d.esit(G.servisKabulEttiMi(SERVIS.id), false, 'kabul etmemiş servis kapıda')
  const k = G.servisKabulunuKaydet(oturum, 'servisimIlkGiris')
  d.esit(G.servisKabulEttiMi(SERVIS.id), true, 'kabul eden servis geçti')
  d.esit(k.surum, SERVIS_METIN_SURUM, 'kabul bugünkü metin sürümüyle yazıldı')
  d.esit(k.metinler.join(','), 'servisAydinlatma,servisGizlilik', 'iki metin birlikte kabul edildi')
  d.esit(G.servisKabulEttiMi('baska-servis'), false, 'başka servisin kabulü sayılmadı')
  m.depo.save('servisKabulleri', [{ ...k, surum: '0.9' }])
  d.esit(G.servisKabulEttiMi(SERVIS.id), false, 'eski sürümün kabulü yeni sürüme sayılmadı')
  d.esit(G.servisinSonKabulu(SERVIS.id)?.surum, '0.9', 'eski kabul görünüyor (kapı "güncellendi" der)')

  return d
}

export const SENARYOLAR = [
  AK01, AK02, AK03, AK04, AK05, AK06, AK07, AK08, AK09, AK10, AK11, AK12, AK13, AK14,
  AK15, AK16, AK17, AK18, AK19, AK20, AK21, AK22, AK23, AK24, AK25, AK26, AK27, AK28,
  AK29, AK30, AK31, AK32, AK33, AK34, AK35, AK36, AK37,
]
