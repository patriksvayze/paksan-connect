/* ==========================================================================
   Sunum için ekran görüntüsü üretici

   Sunum dosyasındaki (sunum/PAKSAN_CONNECT_SUNUM.md) bütün görseller
   bu araçla üretiliyor. Elle ekran görüntüsü alınmıyor: ekran
   değiştiğinde araç yeniden çalıştırılıyor, görseller kendiliğinden
   güncelleniyor.

   NASIL ÇALIŞIYOR

   Bilgisayardaki Chrome'u görünmeden (headless) açıyor, geliştirme
   sunucusuna bağlanıyor, her ekranı sırayla geziyor ve PNG olarak
   `sunum/gorseller/` klasörüne yazıyor. Chrome'a DevTools Protokolü
   ile konuşuluyor; ek bir paket kurulmuyor (Node 22+ içindeki
   WebSocket yetiyor).

   ÇALIŞTIRMAK

     1. Ayrı bir terminalde:  npm run dev
     2. Sonra:                node tools/ekran-goruntusu.mjs

   Tek bir ekranı yenilemek için ad süzgeci verilebilir:

     node tools/ekran-goruntusu.mjs destek

   VERİ

   Uygulama tarafı sahte bir müşteri hesabıyla açılıyor (aşağıdaki
   MUSTERI). Backoffice tarafı kendi "Demo verisi" düğmesiyle
   dolduruluyor — yani görsellerdeki talepler, müşteriler ve raporlar
   backoffice'in kendi demo üreticisinden geliyor.
   ========================================================================== */


import { mkdirSync, rmSync } from 'node:fs'

import { join } from 'node:path'
import { bekle, chromeAc, Cdp, Sayfa, PROFIL } from './tarayici.mjs'

const ADRES = process.env.PAKSAN_ADRES || 'http://localhost:5174'
const CIKTI = 'sunum/gorseller'
const SUZGEC = process.argv[2] || ''

/* Telefon ölçüsü: iPhone 13 / orta sınıf Android. 2x çünkü sunum
   çıktı alınacak — 1x görseller kâğıtta bulanık çıkıyor. */
const TELEFON = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }
const MASAUSTU = { width: 1600, height: 1000, deviceScaleFactor: 2, mobile: false }

/* --------------------------------------------------------- Demo hesabı */

const MUSTERI = {
  id: 'u1',
  no: 'MST000900',
  ad: 'Onur Gökay',
  adi: 'Onur',
  soyadi: 'Gökay',
  tel: '5398472784',
  ulke: 'TR',
  konumUlke: 'TR',
  il: 'Balıkesir',
  ilce: 'Bandırma',
  createdAt: 1787293029940,
  onaylar: { aydinlatma: true, riza: true, kampanya: true },
}

const MAKINELER = [
  {
    id: 'mk1', productId: 'hammer', serial: 'HMR202400123', year: 2024,
    nickname: '', addedAt: 1787293021675, hours: 0, doneMaintenance: [],
  },
  {
    id: 'mk2', productId: 'ipak-rulo', serial: 'IPAK202300456', year: 2023,
    nickname: '', addedAt: 1787293021675, hours: 0, doneMaintenance: [],
  },
]

/* Makine defteri: iki makineye İKİ AYRI servis bakıyor (atama makine
   başına, bkz. src/lib/servisAtama.js → servisGruplari). Defter satırı
   olmadan servis zinciri boş dönüyordu ve Connect'in ana ekranı
   "Servisiniz henüz atanmadı", servis talebi ekranı da dolu form yerine
   o uyarıyı çiziyordu. Servis kimlikleri marka kataloğundaki gerçek
   kayıtlar (src/marka/katalog/servisler.js). Tohumlanırken defterdeki
   öteki satırlara dokunulmuyor: backoffice'in demo satırları duruyor. */
const DEFTER = [
  {
    id: 'mkd-ekran-1', tarih: 1787293021675, seri: 'HMR202400123', productId: 'hammer',
    musteriId: MUSTERI.id, musteriNo: MUSTERI.no, musteriAd: MUSTERI.ad, il: MUSTERI.il, ilce: MUSTERI.ilce,
    bayiId: null, bayiAd: '', servisId: 'bandirma-servis', servisAd: 'Kemal Aydın Tarım Servisi',
    uretimTarihi: null, faturaTarihi: null, logoBildi: false, yeniSatis: false, kaynak: 'musteri',
  },
  {
    id: 'mkd-ekran-2', tarih: 1787293021675, seri: 'IPAK202300456', productId: 'ipak-rulo',
    musteriId: MUSTERI.id, musteriNo: MUSTERI.no, musteriAd: MUSTERI.ad, il: MUSTERI.il, ilce: MUSTERI.ilce,
    bayiId: null, bayiAd: '', servisId: 'konya-servis', servisAd: 'Selçuk Tarım Servisi',
    uretimTarihi: null, faturaTarihi: null, logoBildi: false, yeniSatis: false, kaynak: 'musteri',
  },
]

const FATURA = {
  tuzel: false, tel: '+90 539 847 27 84', adres: 'Yeni Mahalle, Bahçe Sokak No:12',
  il: 'Balıkesir', ilce: 'Bandırma', ulke: 'TR', farkliKisi: false,
  ad: 'Onur Gökay', tc: '10000000146',
}

const ORTAK_TALEP = {
  ulke: 'TR', ihracat: false, ses: null, ekler: [], urunId: null,
  ad: 'Onur Gökay', tel: '+90 539 847 27 84', telUlke: 'TR',
  telHam: '5398472784', il: 'Balıkesir', ilce: 'Bandırma',
  urunTipi: '', arazi: '', traktor: '',
}

const GUN = 86400000
const SIMDI = 1787293350214

const TALEPLER = [
  {
    ...ORTAK_TALEP,
    id: 'tlp-parca-1', no: 'YPR2608215823', createdAt: SIMDI, status: 'incelemede',
    tur: 'parca', aciklama: 'Düğüm atıcı bıçağı kırıldı, yenisi gerekiyor.',
    makine: { id: 'mk1', serial: 'HMR202400123', productId: 'hammer' },
    durum: null, belirtiler: [],
    /* Görselli tablo (components/ParcaTablosu.jsx) için gerçek bir
       anlık görüntü (bkz. lib/parcaKatalogu.js → fiyatGoruntusu). Kod,
       ad, görsel dosya adı ve fiyat çalışan sunucudaki gerçek
       kataloğun (http://localhost:3000/parca-katalogu/katalog.json)
       "baglama-grubu" grubundan — uydurma değil. `parcalar`/`parcaAdet`
       eski biçim okuyucular için aynı adlarla tutuluyor. */
    parcalar: ['İPLİ BIÇAK', 'İPLİ BIÇAK KOLU MİLİ'],
    parcaAdet: { 'İPLİ BIÇAK': 1, 'İPLİ BIÇAK KOLU MİLİ': 1 },
    parcaFiyat: {
      surum: 1, kaynak: 'PAKSAN TEMMUZ 2026 FİYAT LİSTESİ.pdf',
      satirlar: [
        { kod: '20131010104.01', ad: 'İPLİ BIÇAK', adet: 1, gorsel: '20131010104.01.webp', birimFiyat: 285, tutar: 285 },
        { kod: '20131010102.01', ad: 'İPLİ BIÇAK KOLU MİLİ', adet: 1, gorsel: '20131010102.01.webp', birimFiyat: 250, tutar: 250 },
      ],
      araToplam: 535, kdv: 107, toplam: 642, eksikFiyat: false,
    },
    fatura: FATURA,
    dekont: { id: 'dk1', tur: 'pdf', ad: 'dekont.pdf', boyut: 8 },
    odemeOnay: { tarih: SIMDI + 36000, personel: 'Sistem Yöneticisi', not: '' },
    gecmis: [{ durum: 'incelemede', tarih: SIMDI + 36000, personel: 'Sistem Yöneticisi' }],
  },
  {
    ...ORTAK_TALEP,
    id: 'tlp-servis-1', no: 'SRV2608214417', createdAt: SIMDI - 2 * GUN, status: 'planlandi',
    tur: 'servis',
    aciklama: 'Bağlama grubunda ip sık sık kopuyor. Tarlada iki gün kaybettik.',
    makine: { id: 'mk1', serial: 'HMR202400123', productId: 'hammer' },
    durum: 'Çalışıyor ama sorunlu', belirtiler: ['İp düğümlemiyor', 'Ses geliyor'],
    parcalar: [], parcaAdet: {}, fatura: null, dekont: null,
    randevu: { tarih: SIMDI + 1.5 * GUN, personel: 'Sistem Yöneticisi' },
    gecmis: [
      { durum: 'incelemede', tarih: SIMDI - 2 * GUN + 7200000, personel: 'Sistem Yöneticisi' },
      { durum: 'planlandi', tarih: SIMDI - GUN, personel: 'Sistem Yöneticisi' },
    ],
  },
  {
    ...ORTAK_TALEP,
    id: 'tlp-teklif-1', no: 'TKF2608211102', createdAt: SIMDI - 5 * GUN, status: 'teklif',
    tur: 'satinalma', aciklama: 'Orkinos 1270 için fiyat ve teslim süresi öğrenmek istiyorum.',
    makine: null, urunId: 'orkinos-1270', durum: null, belirtiler: [],
    parcalar: [], parcaAdet: {}, fatura: null, dekont: null,
    teklif: {
      tutar: '1.450.000 TL + KDV',
      gecerlilik: '15 gün',
      not: 'Fiyata teslim ve devreye alma dâhildir. Bandırma bayimiz iletişime geçecek.',
      personel: 'Sistem Yöneticisi',
      tarih: SIMDI - 4 * GUN,
    },
    gecmis: [
      { durum: 'incelemede', tarih: SIMDI - 5 * GUN + 5400000, personel: 'Sistem Yöneticisi' },
      { durum: 'teklif', tarih: SIMDI - 4 * GUN, personel: 'Sistem Yöneticisi' },
    ],
  },
  {
    ...ORTAK_TALEP,
    id: 'tlp-servis-2', no: 'SRV2608102244', createdAt: SIMDI - 16 * GUN, status: 'kapandi',
    tur: 'servis', aciklama: 'Pikap yaylarından biri kırılmış, toplama düzensiz.',
    makine: { id: 'mk2', serial: 'IPAK202300456', productId: 'ipak-rulo' },
    durum: 'Çalışıyor ama sorunlu', belirtiler: ['Pikap toplamıyor'],
    parcalar: [], parcaAdet: {}, fatura: null, dekont: null,
    kapanis: {
      not: 'Pikap yayı değiştirildi, makine yerinde teslim edildi.',
      personel: 'Sistem Yöneticisi',
      tarih: SIMDI - 13 * GUN,
    },
    gecmis: [
      { durum: 'incelemede', tarih: SIMDI - 16 * GUN + 6000000, personel: 'Sistem Yöneticisi' },
      { durum: 'planlandi', tarih: SIMDI - 15 * GUN, personel: 'Sistem Yöneticisi' },
      { durum: 'kapandi', tarih: SIMDI - 13 * GUN, personel: 'Sistem Yöneticisi' },
    ],
  },
  /* 21 Eylül 2026: RequestDetail'e "bayiyeIletildi" için mor kart
     eklendi (bkz. src/screens/RequestDetail.jsx, styles.css
     .durum-kart--bayiyeIletildi). Önceki dört talepte bu durum yoktu;
     ekranın yeni hâlini göstermek için eklendi. `bayi` alanı
     src/marka/katalog/bayiler.js'teki gerçek Bandırma bayisi. */
  {
    ...ORTAK_TALEP,
    id: 'tlp-teklif-2', no: 'TKF2608219944', createdAt: SIMDI - 1 * GUN, status: 'bayiyeIletildi',
    tur: 'satinalma', aciklama: 'Süper Yunus 2 İpli modelini bölgemdeki bayiden almak istiyorum.',
    makine: null, urunId: 'super-yunus', durum: null, belirtiler: [],
    parcalar: [], parcaAdet: {}, fatura: null, dekont: null,
    bayi: { id: 'balikesir', ad: 'Marmara Ziraat Makineleri', tel: '02667330012', tarih: SIMDI - 12 * 3600000 },
    gecmis: [
      { durum: 'incelemede', tarih: SIMDI - 1 * GUN + 3600000, personel: 'Sistem Yöneticisi' },
      { durum: 'bayiyeIletildi', tarih: SIMDI - 12 * 3600000, personel: 'Sistem Yöneticisi' },
    ],
  },
]

/* Bildirimler ekranındaki "Makinenize Servis Atandı" türü (21 Eylül
   2026, bkz. src/backoffice/veri.js → makineAtamasiniKaydet ve
   src/lib/bildirimler.js → BILDIRIM_TURU.MAKINE). Backoffice'in gerçek
   akışını kurmak yerine (makine kaydı + servis atama + islemYaz) aynı
   şekli doğrudan `paksan.duyurular`'a yazıyoruz — üretilen kayıt
   `musteriyeBildir`'in yazdığıyla birebir aynı alanları taşıyor. */
const BILDIRIM_SERVIS_ATANDI = {
  id: 'dyr-servis-atandi-1',
  tarih: SIMDI - 3 * 3600000,
  musteriId: MUSTERI.id,
  kisisel: true,
  tur: 'makine',
  baslikAnahtar: 'bildirimler.servisAtandiBaslik',
  metinAnahtar: 'bildirimler.servisAtandiMetin',
  degerler: {
    makine: 'Hammer 2 İpli Haşbaysız',
    seri: 'HMR2024-00123',
    servis: 'Kemal Aydın Tarım Servisi',
  },
}

function tohum() {
  const d = {
    'paksan.user': MUSTERI,
    'paksan.hesap': MUSTERI,
    'paksan.machines': MAKINELER,
    'paksan.requests': TALEPLER,
    'paksan.duyurular': [BILDIRIM_SERVIS_ATANDI],
    'paksan.destekUrun': 'hammer',
  }
  return `(() => {
    const d = ${JSON.stringify(d)};
    for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v));
    sessionStorage.setItem('paksan.user', JSON.stringify(d['paksan.user']));
    const defter = ${JSON.stringify(DEFTER)};
    const anahtar = (x) => String(x || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const seriler = defter.map((k) => anahtar(k.seri));
    const oteki = JSON.parse(localStorage.getItem('paksan.makineKayitlari') || '[]')
      .filter((k) => !seriler.includes(anahtar(k.seri)));
    localStorage.setItem('paksan.makineKayitlari', JSON.stringify([...defter, ...oteki]));
    return Object.keys(localStorage).length;
  })()`
}

/* ------------------------------------------------- Destek kayıtları

   Backoffice'teki "Destek Kayıtları" ekranı, müşterinin destek
   ekranında ne aradığını gösteriyor. Ekranın asıl çıktısı en üstteki
   "Cevapsız kalan sorular" listesi — kullanıcının arayıp bulamadığı
   cümleler. Görselde o listenin görünmesi için birkaç oturum
   tohumlanıyor.

   Biçim: src/lib/destekLog.js. Yeni oturum listenin BAŞINA yazılıyor. */

const DESTEK_OTURUM = [
  {
    anahtar: 'MCH_HAMMER_2K', gecikme: 2 * GUN, grup: 'balya',
    model: 'Hammer 2 İpli Haşbaysız',
    makine: { id: 'mk1', serial: 'HMR202400123', productId: 'hammer' },
    olaylar: [
      { tur: 'soru', deger: 'İp düğümlenmiyor' },
      { tur: 'serbest', deger: 'mekik dili ayarı kaç mm' },
      { tur: 'cevapsiz' },
      { tur: 'yonlendirme', deger: 'servis' },
    ],
  },
  {
    anahtar: 'MCH_HAMMER_2K', gecikme: 3 * GUN, grup: 'balya',
    model: 'Hammer 2 İpli Haşbaysız',
    makine: { id: 'mk1', serial: 'HMR202400123', productId: 'hammer' },
    olaylar: [
      { tur: 'soru', deger: 'Balya gevşek çıkıyorsa' },
      { tur: 'soru', deger: 'Balya yamuk çıkıyorsa' },
    ],
  },
  {
    anahtar: 'MCH_SUPER_YUNUS_2K', gecikme: 5 * GUN, grup: 'balya',
    model: 'Süper YUNUS 2 İpli Haşbaysız',
    makine: null,
    olaylar: [
      { tur: 'serbest', deger: 'hidrolik yağ kaçırıyor' },
      { tur: 'cevapsiz' },
      { tur: 'serbest', deger: 'mekik dili ayarı kaç mm' },
      { tur: 'cevapsiz' },
      { tur: 'yonlendirme', deger: 'servis' },
    ],
  },
  {
    anahtar: 'MCH_ORKA_870', gecikme: 6 * GUN, grup: 'balya',
    model: 'ORKA 870 4 İPLİ BÜYÜK BALYA MAKİNESİ',
    makine: null,
    olaylar: [
      { tur: 'soru', deger: 'Pikap toplamıyor' },
      { tur: 'serbest', deger: 'zincir gerginliği nasıl ayarlanır' },
      { tur: 'cevapsiz' },
    ],
  },
  {
    anahtar: 'MCH_IPAK_RULO', gecikme: 9 * GUN, grup: 'rulo',
    model: 'I-PAK YUVARLAK BALYA MAKİNESİ',
    makine: { id: 'mk2', serial: 'IPAK202300456', productId: 'ipak-rulo' },
    olaylar: [
      { tur: 'soru', deger: 'Sensör uyarı veriyor' },
    ],
  },
]

function destekKaydi() {
  const kisi = {
    no: MUSTERI.no, ad: MUSTERI.ad, tel: MUSTERI.tel,
    il: MUSTERI.il, ilce: MUSTERI.ilce,
  }

  const liste = DESTEK_OTURUM.map((o, i) => {
    const bas = SIMDI - o.gecikme
    return {
      id: 'dstk' + i,
      anahtar: o.anahtar,
      baslangic: bas,
      son: bas + o.olaylar.length * 90000,
      dil: 'tr',
      grup: o.grup,
      kullanici: kisi,
      makine: o.makine,
      /* Destek ekrani makineyi paket katalogundan seciyor; kayitta model
         adi `urun` alaninda duruyor (bkz. Support.jsx -> kaydet). */
      urun: { id: o.anahtar, ad: o.model },
      olaylar: o.olaylar.map((e, j) => ({ ...e, tarih: bas + j * 90000 })),
    }
  })

  /* İki kez stringify: biri veriyi metne çeviriyor, öteki o metni
     sayfada çalıştırılacak JavaScript'in içine tırnaklı gömüyor. */
  return "localStorage.setItem('paksan.destekLog', "
    + JSON.stringify(JSON.stringify(liste)) + "), 'ok'"
}

/* ============================================================== Sahneler

   Her sahne bir görsel. `yol` uygulamanın adresi, `adimlar` ise
   görüntü alınmadan önce yapılacaklar (sekmeye dokun, kutuyu aç…).
   ========================================================================== */

/* Destek sohbeti gerçek sunucu çağrısıyla ilerliyor (bkz. aşağıdaki
   DESTEK notu); sabit bir bekleme yerine ilgili sınıf DOM'a
   düşünceye kadar bekleniyor. */
const MAKINE_BEKLE = `(() => new Promise((coz) => {
  const hazir = () => document.querySelector('.dst-makineler');
  if (hazir()) { coz('OK'); return; }
  const aralik = setInterval(() => { if (hazir()) { clearInterval(aralik); coz('OK'); } }, 300);
  setTimeout(() => { clearInterval(aralik); coz('ZAMAN-ASIMI'); }, 15000);
}))()`

const CEVAP_BEKLE = `(() => new Promise((coz) => {
  const hazir = () => document.querySelector('.chip--ana');
  if (hazir()) { coz('OK'); return; }
  const aralik = setInterval(() => { if (hazir()) { clearInterval(aralik); coz('OK'); } }, 400);
  setTimeout(() => { clearInterval(aralik); coz('ZAMAN-ASIMI'); }, 60000);
}))()`

const UYGULAMA = [
  {
    /* Şafak sahnesi 7,2 saniyelik tek seferlik açılış animasyonuyla
       geliyor (bkz. src/components/Safak.jsx → SAHNE_SURESI). Sabit
       bir bekleme yerine `.safak--bitti` işareti bekleniyor — hem
       animasyon erken kesilmiyor hem gereksiz yere uzun sürmüyor. */
    ad: '01-karsilama', baslik: 'Karşılama', yol: '/hosgeldiniz', cikisYap: true,
    adimlar: [
      {
        js: `(() => new Promise((coz) => {
          const bitti = () => document.querySelector('.safak--bitti');
          if (bitti()) { coz('OK'); return; }
          const aralik = setInterval(() => {
            if (bitti()) { clearInterval(aralik); coz('OK'); }
          }, 200);
          setTimeout(() => { clearInterval(aralik); coz('ZAMAN-ASIMI'); }, 8000);
        }))()`,
      },
    ],
  },
  { ad: '02-giris', baslik: 'Giriş', yol: '/giris', cikisYap: true },
  { ad: '03-kayit', baslik: 'Hesap açma', yol: '/kayit', cikisYap: true },
  { ad: '04-ana-sayfa', baslik: 'Ana Sayfa', yol: '/' },
  { ad: '05-makinelerim', baslik: 'Makinelerim', yol: '/makinelerim' },
  { ad: '05b-servislerim', baslik: 'Makinelerim — Servislerim sekmesi', yol: '/makinelerim?sekme=servisler' },
  { ad: '06-makine-detay', baslik: 'Makine detayı', yol: '/makine/mk1' },
  { ad: '07-makine-ekle', baslik: 'Makine ekleme', yol: '/makine-ekle' },
  { ad: '08-urunler', baslik: 'Ürünler', yol: '/urunler' },
  { ad: '09-urun-detay', baslik: 'Ürün detayı', yol: '/urun/orkinos-1270' },
  {
    ad: '10-destek-makine-secimi', baslik: 'Destek — makine seçimi', yol: '/destek',
    adimlar: [{ js: "localStorage.removeItem('paksan.destekUrun')" }, { yenile: true }],
  },
  /* DESTEK — sohbet asistanı (10 Eylül 2026'dan beri).

     Üç adımlı sabit yönlendirme (konu grubu → belirti → cevap,
     `.chip--konu`/`.dst-sebepler`/`.dst-guvenlik`) kalktı; ekran artık
     sunucudaki kılavuz asistanıyla konuşan bir sohbet
     (bkz. src/screens/Support.jsx, src/config.js → AI). Akış: soru →
     (makine seçilmemişse "hangi makine" listesi, `.dst-makineler` /
     `.dst-makine`) → cevap ve kaynaklar, cevap bitince `.chip--ana`
     görünür (çözüldü mü / talep düğmeleri). Cevap gerçek bir sunucu
     çağrısıyla geliyor (D:\PAKSAN\paksan-rag\sohbet) — sabit bekleme
     yerine ilgili sınıf DOM'da görününceye kadar bekleniyor. */
  { ad: '11-destek-konular', baslik: 'Destek — karşılama ve örnek sorular', yol: '/destek' },
  {
    ad: '12-destek-belirtiler', baslik: 'Destek — hangi makine soruluyor', yol: '/destek',
    adimlar: [
      { tiklaMetin: 'Kaç beygir traktör gerekir?' },
      { js: MAKINE_BEKLE },
      { bekle: 400 },
    ],
  },
  {
    ad: '13-destek-cevap', baslik: 'Destek — cevap ve kaynaklar', yol: '/destek',
    adimlar: [
      { tiklaMetin: 'Hangi yağı kullanmalıyım?' },
      { js: MAKINE_BEKLE },
      { tiklaMetin: 'Hammer', kapsam: '.dst-makine' },
      { js: CEVAP_BEKLE },
      { bekle: 400 },
    ],
  },
  {
    /* Örnek sorular arasında güvenlik sınıflamasını tetikleyen yok;
       yazı kutusuna gerçek bir soru yazılıp gönderiliyor. Değer
       "girdi" — ekrana yerleşen bir metin değil, DESTEK_OTURUM'daki
       'İp düğümlenmiyor' sorusuyla aynı temayı taşıyor. */
    ad: '14-destek-guvenlik', baslik: 'Destek — müdahale uyarısı', yol: '/destek',
    adimlar: [
      {
        js: `(() => {
          const yaz = (el, v) => {
            const p = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
            p.call(el, v);
            el.dispatchEvent(new Event('input', { bubbles: true }));
          };
          const g = document.querySelector('.composer .input');
          if (!g) return 'YOK';
          yaz(g, 'İp düğümlenmiyor, ayar nasıl yapılır?');
          return 'OK';
        })()`,
      },
      { bekle: 250 },
      {
        js: `(() => {
          const f = document.querySelector('.composer');
          if (!f) return 'YOK';
          f.requestSubmit();
          return 'OK';
        })()`,
      },
      { js: MAKINE_BEKLE },
      { tiklaMetin: 'Hammer', kapsam: '.dst-makine' },
      { js: CEVAP_BEKLE },
      { bekle: 400 },
    ],
  },
  { ad: '18-kilavuzlar', baslik: 'Kılavuzlar', yol: '/kilavuzlar' },
  { ad: '19-kilavuz', baslik: 'Kılavuz detayı', yol: '/kilavuz/hammer' },
  { ad: '20-bakim-rehberi', baslik: 'Bakım rehberi', yol: '/bakim' },
  { ad: '21-talep-servis', baslik: 'Servis talebi formu', yol: '/talep?tur=servis' },
  /* PARÇA LİSTESİ FORMDAN ÇIKTI (15 Eylül 2026).
     Seçim artık formun içinde değil, "Parça Seç" düğmesiyle açılan tam
     ekran seçicide yapılıyor (bkz. ParcaSecEkrani.jsx). Katalog ağdan
     geliyor ve gerçekçi gecikmeyle geliyor (PARCA_KATALOG.taklitGecikme,
     800ms) — düğmeye basmadan önce yüklenmesini bekliyoruz. */
  {
    ad: '22-talep-parca', baslik: 'Yedek parça talebi formu', yol: '/talep?tur=parca',
    adimlar: [
      { bekle: 700 },
      { tikla: '.parca-alan__ekle' },
      { bekle: 500 },
      { tiklaSira: '.listitem', sira: 0 },
      { bekle: 400 },
      { tiklaSira: '.listitem', sira: 0 },
      { bekle: 300 },
      { tikla: '.parca-dip__tamam' },
      { bekle: 500 },
    ],
  },
  {
    ad: '22b-talep-parca-secici', baslik: 'Yedek parça talebi — parça seçici', yol: '/talep?tur=parca',
    adimlar: [
      { bekle: 700 },
      { tikla: '.parca-alan__ekle' },
      { bekle: 500 },
      { tiklaSira: '.listitem', sira: 0 },
      { bekle: 400 },
      { tiklaSira: '.listitem', sira: 0 },
      { bekle: 300 },
    ],
  },
  { ad: '23-talep-teklif', baslik: 'Fiyat teklifi talebi formu', yol: '/talep?tur=satinalma' },
  { ad: '24-talep-detay', baslik: 'Talep detayı', yol: '/talebim/tlp-servis-1' },
  { ad: '25-talep-detay-parca', baslik: 'Yedek parça talebi detayı', yol: '/talebim/tlp-parca-1' },
  { ad: '25b-talep-detay-teklif', baslik: 'Fiyat teklifi detayı', yol: '/talebim/tlp-teklif-1' },
  { ad: '25c-talep-detay-bayide', baslik: 'Fiyat teklifi — bayiye iletildi', yol: '/talebim/tlp-teklif-2' },
  { ad: '26-bayiler', baslik: 'Bayi ve servis ağı', yol: '/bayiler' },
  { ad: '27-bildirimler', baslik: 'Bildirimler', yol: '/bildirimler' },
  { ad: '28-profil', baslik: 'Profil', yol: '/profil' },
  {
    ad: '28b-taleplerim', baslik: 'Taleplerim', yol: '/profil',
    adimlar: [
      {
        js: `(() => {
          const b = [...document.querySelectorAll('h2')].find(e => e.innerText.includes('Taleplerim'));
          if (!b) return 'YOK';
          window.scrollTo({ top: b.getBoundingClientRect().top + window.scrollY - 80 });
          return 'OK';
        })()`,
      },
      { bekle: 500 },
    ],
  },
  { ad: '29-numara-degisikligi', baslik: 'Numara değişikliği', yol: '/numara-degisikligi' },
]

/* HİZMET ÜCRETİ VE SERVİS İSKONTOSU TOHUMU (23 Eylül 2026).

   Ücret ve iskonto ekranları boş hâlde yalnız başlangıç değerlerini
   gösteriyor; sunum görselinde özelliğin ne işe yaradığı görünsün diye
   gerçekçi bir durum yazılıyor: iki makinede farklı saat ücreti, iki
   serviste özel ücret, iki serviste özel iskonto. Değerler uydurma
   değil, ekranın yapabildiklerinin örneği; kimlikler uygulamanın kendi
   servis ve ürün kimlikleri. Sahne tohumdan sonra sayfayı yeniliyor. */
const UCRET_TOHUMU = `(() => {
  const ic = JSON.parse(localStorage.getItem('paksan.panelIcerik') || '{}');
  const once = Date.now() - 3 * 86400000;
  ic.hizmetTarifesi = {
    genel: { yolKm: 12, iscilikSaat: 50, guncelleme: { tarih: once, personel: 'Sistem Yöneticisi' } },
    modeller: { 'orkinos-1270': { iscilikSaat: 80 }, 'orkinos-870': { iscilikSaat: 70 } },
    servisler: {
      'konya-servis': { iscilikSaat: 60, modeller: { 'orkinos-1270': { iscilikSaat: 90 } }, guncelleme: { tarih: once, personel: 'Sistem Yöneticisi' } },
      'ankara-servis': { yolKm: 15, modeller: {}, guncelleme: { tarih: once, personel: 'Sistem Yöneticisi' } },
    },
  };
  /* bakiye: bakiyeden ödemede ek iskonto (24 Eylül 2026) — sahnelerde
     Servis iskontosu kartının ikinci karosu, Servisim'de ödeme rozeti ve
     Ücretlendirmeler karosu görünsün diye açık. */
  ic.parcaIskontosu = {
    genel: 0.3,
    servisler: { 'konya-servis': 0.35, 'ankara-servis': 0.32 },
    bakiye: 0.03,
    guncelleme: { tarih: once, personel: 'Sistem Yöneticisi' },
  };
  localStorage.setItem('paksan.panelIcerik', JSON.stringify(ic));
  setTimeout(() => location.reload(), 50);
  return 'OK';
})()`

/* Kapalı açılan kartı (ortak.jsx → AcilirTepe) açar; açıksa dokunmaz —
   bir önceki sahne açık bırakmış olabilir, basmak onu kapatırdı. */
const KARTI_AC = `(() => {
  const b = document.querySelector('.acilir-tepe__dugme');
  if (!b) return 'YOK';
  if (b.getAttribute('aria-expanded') !== 'true') b.click();
  return 'OK';
})()`

/* Duyurular hedefleme kutularını açar (24 Eylül 2026'dan beri kapalı
   açılıyorlar); açık olana dokunmaz. */
const hedefKutulariniAc = `(() => {
  const d = [...document.querySelectorAll('.hedefleme .hedef-blok__dugme')];
  if (!d.length) return 'YOK';
  d.forEach((b) => b.getAttribute('aria-expanded') !== 'true' && b.click());
  return 'OK';
})()`

/* Duyurular hedeflemesinde bir çipe basar: kutu sırası (0 bölge, 1 model,
   2 servis) ve çipin yazısı; yazı boşsa kutudaki ilk çip. */
const hedefCipi = (kutu, yazi) => `(() => {
  const k = document.querySelectorAll('.hedefleme .hedef-blok')[${kutu}];
  if (!k) return 'YOK';
  const c = [...k.querySelectorAll('.cip')].find((x) => ${JSON.stringify(yazi)} ? x.innerText.trim() === ${JSON.stringify(yazi)} : true);
  if (!c) return 'YOK';
  c.click();
  return 'OK';
})()`

/* React'in denetlediği kutuya değer yazmak: değer doğrudan atanırsa
   React değişikliği görmüyor; yerleşik ayarlayıcı ve input olayı. */
const kutuyaYaz = (secici, sira, deger) => `(() => {
  const el = document.querySelectorAll(${JSON.stringify(secici)})[${sira}];
  if (!el) return 'YOK';
  const p = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
  p.call(el, ${JSON.stringify(deger)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return 'OK';
})()`

const BACKOFFICE = [
  { ad: '40-backoffice-giris', baslik: 'Backoffice girişi', giris: false },
  { ad: '41-dashboard', baslik: 'Dashboard', menu: 'Dashboard' },
  { ad: '42-talepler', baslik: 'Talepler', menu: 'Talepler' },
  {
    ad: '43-talep-detay', baslik: 'Talep detayı', menu: 'Talepler',
    adimlar: [{ tiklaSira: 'tbody tr', sira: 0 }, { bekle: 600 }],
  },
  { ad: '44-musteriler', baslik: 'Müşteriler', menu: 'Müşteriler' },
  /* 21 Eylül 2026: Servis açılır kutusundaki "atanmamış" seçeneği
     "Servis atanmamış" onay kutusuyla değişti (bkz. Makineler.jsx).
     Sahnesi hiç yoktu — sidebar'da bağlantı var ama liste dışıydı. */
  { ad: '44b-kayitli-makineler', baslik: 'Kayıtlı Makineler', menu: 'Kayıtlı Makineler' },
  /* Hizmet ücretleri (23 Eylül 2026): Servisler sayfasının üstündeki kart
     ve listedeki "Ücret" sütunu; genel ücret değişirken özel ücretli
     servisler için çıkan uyarı; servis formundaki özel ücret alanı. */
  {
    ad: '44c-servis-ucretleri', baslik: 'Servisler — hizmet ücretleri', menu: 'Servisler',
    adimlar: [
      { js: UCRET_TOHUMU },
      { bekle: 1800 },
      { tiklaMetin: 'Servisler', kapsam: '.yan__bag' },
      { bekle: 900 },
      /* Kart kapalı açılıyor (kullanıcının isteği); görselde içi görünsün. */
      { js: KARTI_AC },
      { bekle: 500 },
    ],
  },
  {
    ad: '44d-servis-ucret-uyari', baslik: 'Servisler — özel ücretli servis uyarısı', menu: 'Servisler',
    adimlar: [
      { js: KARTI_AC },
      { bekle: 400 },
      { tiklaMetin: 'Ücretleri Düzenle' },
      { bekle: 400 },
      { js: kutuyaYaz('.ucret-kart .esit input', 1, '55') },
      { bekle: 300 },
      { tiklaMetin: 'Kaydet', kapsam: '.ucret-kart button' },
      { bekle: 600 },
    ],
  },
  {
    ad: '44e-servis-formu-ucret', baslik: 'Servis formu — servise özel ücret', menu: 'Servisler',
    adimlar: [
      {
        js: `(() => {
          const satir = [...document.querySelectorAll('tbody tr')].find((tr) => tr.innerText.includes('Selçuk'));
          const d = satir && [...satir.querySelectorAll('button')].find((b) => b.innerText.includes('Düzenle'));
          if (!d) return 'YOK';
          d.click();
          return 'OK';
        })()`,
      },
      { bekle: 600 },
      /* Pencere kendi içinde kayıyor; sayfa kaydırması oraya inmiyor. */
      { js: `(() => { const e = document.querySelector('.ucret-ozet'); if (!e) return 'YOK'; e.scrollIntoView({ block: 'center' }); return 'OK' })()` },
      { bekle: 300 },
    ],
  },
  /* Özel Ücret süzgeci (24 Eylül 2026): yalnız servise özel ücreti olanlar. */
  {
    ad: '44f-servis-ozel-ucret-suzgeci', baslik: 'Servisler — özel ücret süzgeci', menu: 'Servisler',
    adimlar: [
      { js: UCRET_TOHUMU },
      { bekle: 1800 },
      { tiklaMetin: 'Servisler', kapsam: '.yan__bag' },
      { bekle: 900 },
      {
        js: `(() => {
          const s = [...document.querySelectorAll('select.sec')].find((x) => [...x.options].some((o) => o.value === 'ozel'));
          if (!s) return 'YOK';
          const p = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
          p.call(s, 'ozel');
          s.dispatchEvent(new Event('change', { bubbles: true }));
          return 'OK';
        })()`,
      },
      { bekle: 500 },
    ],
  },
  {
    ad: '45-musteri-detay', baslik: 'Müşteri detayı', menu: 'Müşteriler',
    adimlar: [{ tiklaSira: 'tbody tr', sira: 0 }, { bekle: 600 }],
  },
  { ad: '46-bayiler', baslik: 'Bayiler', menu: 'Bayiler' },
  /* Servis iskontosu (23 Eylül 2026): Yedek Parça Kataloğu ekranı. */
  {
    ad: '46b-servis-iskontosu', baslik: 'Yedek Parça Kataloğu — servis iskontosu', menu: 'Yedek Parça Kataloğu',
    adimlar: [
      { js: UCRET_TOHUMU },
      { bekle: 1800 },
      { tiklaMetin: 'Yedek Parça Kataloğu', kapsam: '.yan__bag' },
      { bekle: 900 },
      { js: KARTI_AC },
      { bekle: 500 },
      { kaydirSecici: '.iskonto-satir', bosluk: 260 },
      { bekle: 300 },
    ],
  },
  { ad: '47-geri-bildirimler', baslik: 'Geri Bildirimler', menu: 'Geri Bildirimler' },
  { ad: '48-raporlar', baslik: 'Raporlar', menu: 'Raporlar' },
  { ad: '49-destek-kayitlari', baslik: 'Destek Kayıtları', menu: 'Destek Kayıtları' },
  { ad: '50-duyurular', baslik: 'Duyurular', menu: 'Duyurular' },
  /* Hedefleme (23 Eylül 2026): bölge, makine ve servis formda açık;
     örnek seçim iki il, bir model, bir servis. */
  {
    ad: '50b-duyuru-hedefleme', baslik: 'Duyurular — hedefleme', menu: 'Duyurular',
    adimlar: [
      /* Kutular kapalı açılıyor; önce üçü de açılıyor, çipler sonra. */
      { js: hedefKutulariniAc },
      { bekle: 300 },
      { js: hedefCipi(0, 'Konya') },
      { bekle: 200 },
      { js: hedefCipi(0, 'Karaman') },
      { bekle: 200 },
      { js: hedefCipi(1, '') },
      { bekle: 200 },
      { js: hedefCipi(2, '') },
      { bekle: 300 },
      { kaydirSecici: '.hedefleme', bosluk: 90 },
      { bekle: 300 },
    ],
  },
  { ad: '51-numara-talepleri', baslik: 'Numara Değişikliği Talepleri', menu: 'Numara Değişikliği' },
  { ad: '52-personel', baslik: 'Personel', menu: 'Personel' },
  { ad: '53-islem-kaydi', baslik: 'İşlem Kaydı', menu: 'İşlem Kaydı' },
  {
    ad: '54-cikis-onayi', baslik: 'Çıkış onayı', menu: 'Dashboard',
    adimlar: [{ tikla: '.yan__cikis' }, { bekle: 400 }],
  },
]

/* Servisim ayrı bir HTML girişinden açılıyor (servis.html), UYGULAMA
   listesindeki hash route'larla aynı sayfada değil — bkz. CLAUDE.md
   "Servis tarafı YALNIZ MOBİL UYGULAMA".

   GİRİŞ FORM DEĞİL, OTURUM TOHUMU (21 Eylül 2026). Demo APK'sı
   (servis.html → data-demo="acik") açılışta kendi demo verisini ve
   'konya' servis hesabını kuruyor (bkz. src/servis/demoKur.js). Giriş
   formunu doldurup göndermek yerine — backoffice sahnesinin yaptığının
   aksine — o hesabın oturumu doğrudan `sessionStorage`'a yazılıyor
   (bkz. servisimOturumAc), tıpkı UYGULAMA sahnelerinin `tohum()` ile
   localStorage'a yazması gibi. */
const SERVIS = [
  { ad: '60-servisim-giris', baslik: 'Servisim — giriş', bekle: 2600, giris: false },
  {
    ad: '61-servisim-islerim', baslik: 'Servisim — işlerim',
    /* Varsayılan sekme zaten "İşlerim": PAKSAN'dan gelen bildirimler
       listesi ve gecikme şeridi burada, ek adım gerekmiyor. */
  },
  /* "PAKSAN tarafından yapılan işlemler" kartı (TalepDetay.jsx →
     paksanIslemleri) yalnız gerçek bir backoffice işlemi (durum
     değiştirme, iptal, not, hak ediş onayı…) `serviseBildir` çağırınca
     doluyor (bkz. backoffice/veri.js). demoServis.js talepleri doğrudan
     nesne olarak kuruyor, bu çağrıların hiçbirinden geçmiyor — taze bir
     demo profilinde bu kart hiç görünmez. Sahne yine de gerçek bir iş
     kartını açıyor; kart varsa görünür, yoksa ekran yine doğru, yalnız
     o bölüm eksik. */
  {
    ad: '62-servisim-is-detay', baslik: 'Servisim — iş detayı',
    adimlar: [
      { tiklaSira: '.is__ac', sira: 0 },
      { bekle: 500 },
    ],
  },
  /* HAK EDİŞ — bakiye kartındaki simge para işaretine döndü
     (21 Eylül 2026, bkz. Hakkedis.jsx → .bakiye__simge). Sekmeye
     geçmek yeterli, ek adım gerekmiyor. */
  {
    ad: '63-servisim-hakkedis', baslik: 'Servisim — hak ediş',
    adimlar: [
      { tiklaMetin: 'Hak Ediş', kapsam: '.uyg__tab' },
      { bekle: 700 },
    ],
  },
  /* Hesap hareketine dokununca açılan yaprakta, işin değiştirilen
     parçaları görselli listeleniyor (components/ParcaTablosu.jsx).
     Demo hareketleri karışık (servis ödemesi / parça siparişi /
     ödeme); parçası olan ilk satır bulunana kadar sırayla açılıp
     kapatılıyor — sabit bir sıra numarası her demo turunda aynı
     satıra denk gelmeyebiliyor. */
  {
    ad: '64-servisim-hakkedis-is', baslik: 'Servisim — hak ediş iş kağıdı (parça görselleri)',
    adimlar: [
      { tiklaMetin: 'Hak Ediş', kapsam: '.uyg__tab' },
      { bekle: 700 },
      {
        js: `(() => new Promise(async (coz) => {
          const satirlar = [...document.querySelectorAll('.hareket')];
          for (const s of satirlar) {
            s.click();
            await new Promise((r) => setTimeout(r, 400));
            if (document.querySelector('.onay .parca-tablo')) { coz('OK'); return; }
            const perde = document.querySelector('.onay-perde');
            if (perde) perde.click();
            await new Promise((r) => setTimeout(r, 250));
          }
          coz('YOK');
        }))()`,
      },
      { bekle: 400 },
    ],
  },
  /* ELLE KAYIT — Ad/Soyad yan yana (Connect'in kayıt ekranıyla aynı
     düzen). Form açılır açılmaz görünüyor, ek adım gerekmiyor. */
  {
    ad: '65-servisim-elle-kayit', baslik: 'Servisim — elle kayıt',
    adimlar: [
      { tiklaMetin: 'Kayıt Aç' },
      { bekle: 600 },
    ],
  },
  /* Seri numarası başka müşteride kayıtlıysa çıkan uyarı kutusu
     ("Anladım" düğmeli). Uyarıyı tetiklemek için gerçek bir seri
     gerekiyor: backoffice'in demo verisi zaten `makineKayitlari`
     defterine hesaplı satırlar yazdığı için (bkz. src/backoffice/demo.js)
     oradan hesabı olan ilk satır okunup seri kutusuna yazılıyor —
     sahte bir seri uydurmuyoruz. Telefon kutusuna da eşleşmeyecek bir
     numara yazılıyor ki "Seri Numarası" alanı görünsün (kayıtlı
     müşteride bu alan değil, makine seçimi çıkıyor). Kutu formun
     altında kaldığı için görüntü alınmadan önce ona kaydırılıyor. */
  {
    ad: '65b-servisim-elle-kayit-uyari', baslik: 'Servisim — elle kayıt, başka müşteriye kayıtlı seri uyarısı',
    adimlar: [
      { tiklaMetin: 'Kayıt Aç' },
      { bekle: 500 },
      {
        js: `(() => {
          const yaz = (el, v) => {
            const p = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
            p.call(el, v);
            el.dispatchEvent(new Event('input', { bubbles: true }));
          };
          const tel = document.querySelector('input[placeholder="532 111 22 33"]');
          if (!tel) return 'YOK-TEL';
          yaz(tel, '5559998877');
          return 'OK';
        })()`,
      },
      { bekle: 400 },
      {
        js: `(() => {
          const yaz = (el, v) => {
            const p = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
            p.call(el, v);
            el.dispatchEvent(new Event('input', { bubbles: true }));
          };
          const seriKutu = document.querySelector('input[placeholder="ORK1270-2024-00157"]');
          if (!seriKutu) return 'YOK-SERI';
          const liste = JSON.parse(localStorage.getItem('paksan.makineKayitlari') || '[]');
          const satir = liste.find((k) => (k.musteriId || k.musteriNo) && k.seri);
          if (!satir) return 'YOK-SATIR';
          yaz(seriKutu, satir.seri);
          return 'OK';
        })()`,
      },
      { bekle: 600 },
      { kaydirSecici: '.not__onay', bosluk: 200 },
      { bekle: 300 },
    ],
  },
  /* Ücretlendirmeler (23 Eylül 2026): Hesap ekranındaki bölüm; servisin özel
     saat ücreti, makineye göre farklar ve parça indirimi. */
  {
    ad: '66-servisim-ucretlerim', baslik: 'Servisim — ücretlendirmeler',
    adimlar: [
      { js: UCRET_TOHUMU },
      { bekle: 2200 },
      { tikla: '.uyg__hesap' },
      { bekle: 700 },
      { kaydirSecici: '#ucretlerim', bosluk: 80 },
      { bekle: 300 },
    ],
  },
  /* Sipariş ekranı: indirim şeridi ve liste fiyatı üstü çizili kartlar,
     sonra özet — liste fiyatıyla toplam, indirim, ara toplam. */
  {
    ad: '67-servisim-siparis-indirim', baslik: 'Servisim — sipariş, indirimli fiyatlar',
    adimlar: [
      { js: UCRET_TOHUMU },
      { bekle: 2200 },
      { tiklaMetin: 'Parça', kapsam: '.uyg__tab' },
      { bekle: 500 },
      { tikla: '.uyg__fab' },
      { bekle: 2600 },
      { tiklaSira: '.montaj', sira: 0 },
      { bekle: 900 },
      { tiklaSira: '.parca-kart__ac', sira: 0 },
      { tiklaSira: '.parca-kart__ac', sira: 1 },
      { bekle: 500 },
      { kaydirSecici: '.parca-izgara', bosluk: 330 },
      { bekle: 300 },
    ],
  },
  {
    ad: '67b-servisim-siparis-ozeti', baslik: 'Servisim — sipariş özeti, indirim satırı',
    adimlar: [
      { tiklaMetin: 'Parça', kapsam: '.uyg__tab' },
      { bekle: 500 },
      { tikla: '.uyg__fab' },
      { bekle: 2600 },
      { tiklaSira: '.montaj', sira: 0 },
      { bekle: 900 },
      { tiklaSira: '.parca-kart__ac', sira: 0 },
      { tiklaSira: '.parca-kart__ac', sira: 1 },
      { bekle: 400 },
      { tiklaMetin: 'Devam' },
      { bekle: 800 },
      { kaydirSecici: '.fiyat-kart', bosluk: 120 },
      { bekle: 300 },
    ],
  },
]

/* ====================================================== Chrome sürücüsü

   Motor artık tools/tarayici.mjs'te. Buradan çıkarıldı çünkü
   ekosistem turu da aynı motoru kullanıyor ve iki kopya zamanla
   ayrışıyor — bir kez ayrıştı bile (denetim/duyuru-goruntu.mjs). */

/* ---------------------------------------------------------- Adımları uygula */

async function adimlariUygula(s, adimlar = [], yol) {
  for (const a of adimlar) {
    if (a.bekle) { await bekle(a.bekle); continue }
    if (a.kaydir) { await s.kaydir(a.kaydir); await bekle(250); continue }
    if (a.kaydirSecici) {
      const k = await s.kaydirSecici(a.kaydirSecici, a.bosluk)
      if (k === 'YOK') console.warn('    ! kaydırılamadı:', a.kaydirSecici)
      await bekle(250)
      continue
    }
    if (a.js) {
      const r = await s.js(a.js)
      if (r === 'ZAMAN-ASIMI' || r === 'YOK') console.warn('    ! js adımı:', r, JSON.stringify(a.js).slice(0, 60))
      continue
    }
    if (a.yenile) { await s.git(ADRES + '/#' + yol); await bekle(600); continue }

    let sonuc
    if (a.tiklaMetin) sonuc = await s.tiklaMetin(a.tiklaMetin, a.kapsam)
    else if (a.tikla) sonuc = await s.tikla(a.tikla)
    else if (a.tiklaSon) sonuc = await s.tiklaSon(a.tiklaSon)
    else if (a.tiklaSira !== undefined) sonuc = await s.tiklaSira(a.tiklaSira, a.sira || 0)

    if (sonuc === 'YOK') {
      console.warn('    ! bulunamadı:', JSON.stringify(a))
    }
    await bekle(350)
  }
}

/* ================================================================= Akış */

async function main() {
  mkdirSync(CIKTI, { recursive: true })

  try {
    const r = await fetch(ADRES + '/')
    if (!r.ok) throw new Error('sunucu ' + r.status)
  } catch {
    console.error(`Geliştirme sunucusu ${ADRES} adresinde yok. Önce "npm run dev" çalıştırın.`)
    process.exit(1)
  }

  const { surec, bilgi } = await chromeAc()
  const cdp = await Cdp.bagla(bilgi.webSocketDebuggerUrl)

  /* Backoffice'in tepesindeki "Bildirimlere izin ver" şeridi görsele
     karışmasın diye izin baştan veriliyor. */
  await cdp.gonder('Browser.grantPermissions', {
    origin: ADRES,
    permissions: ['notifications'],
  })

  const s = await Sayfa.ac(cdp)

  let sayi = 0

  /* ------------------------------------------------------- Uygulama */
  await s.olcu(TELEFON)
  await s.git(ADRES + '/')
  await s.js(tohum())

  for (const sahne of UYGULAMA) {
    if (SUZGEC && !sahne.ad.includes(SUZGEC) && !sahne.baslik.toLowerCase().includes(SUZGEC)) continue
    process.stdout.write(`  ${sahne.ad}  ${sahne.baslik}\n`)

    /* Karşılama ve giriş ekranları yalnız hesapsızken görünüyor. */
    await s.js(sahne.cikisYap
      ? "localStorage.removeItem('paksan.user'); sessionStorage.removeItem('paksan.user')"
      : tohum())

    await s.git(ADRES + '/#' + sahne.yol)
    await bekle(sahne.bekle || 900)
    await adimlariUygula(s, sahne.adimlar, sahne.yol)
    await s.cek(join(CIKTI, sahne.ad + '.png'))
    sayi++
  }

  /* ----------------------------------------------------- Backoffice */
  await s.olcu(MASAUSTU)
  await s.git(ADRES + '/backoffice.html')
  await s.js(destekKaydi())

  let girildi = false
  for (const sahne of BACKOFFICE) {
    if (SUZGEC && !sahne.ad.includes(SUZGEC) && !sahne.baslik.toLowerCase().includes(SUZGEC)) continue
    process.stdout.write(`  ${sahne.ad}  ${sahne.baslik}\n`)

    if (sahne.giris === false) {
      await s.js("localStorage.removeItem('paksan.panelOturum')")
      await s.git(ADRES + '/backoffice.html')
      await bekle(900)
      girildi = false
    } else {
      if (!girildi) {
        await backofficeGiris(s)
        await demoYukle(s)
        girildi = true
      }
      await s.git(ADRES + '/backoffice.html')
      await bekle(900)
      if (sahne.menu) {
        const t = await s.tiklaMetin(sahne.menu, '.yan__bag')
        if (t === 'YOK') console.warn('    ! menü bulunamadı:', sahne.menu)
        await bekle(900)
      }
    }

    await adimlariUygula(s, sahne.adimlar)
    await s.cek(join(CIKTI, sahne.ad + '.png'))
    sayi++
  }

  /* ------------------------------------------------------- Servisim */
  await s.olcu(TELEFON)
  let servisGirildi = false
  for (const sahne of SERVIS) {
    if (SUZGEC && !sahne.ad.includes(SUZGEC) && !sahne.baslik.toLowerCase().includes(SUZGEC)) continue
    process.stdout.write(`  ${sahne.ad}  ${sahne.baslik}\n`)

    if (sahne.giris === false) {
      await s.js("sessionStorage.removeItem('paksan.servisOturum')")
      await s.git(ADRES + '/servis.html')
      await bekle(sahne.bekle || 900)
      servisGirildi = false
    } else {
      if (!servisGirildi) {
        await servisimOturumAc(s)
        servisGirildi = true
      }
      await s.git(ADRES + '/servis.html')
      await bekle(sahne.bekle || 900)
    }

    await adimlariUygula(s, sahne.adimlar)
    await s.cek(join(CIKTI, sahne.ad + '.png'))
    sayi++
  }

  cdp.ws.close()
  surec.kill()
  try { rmSync(PROFIL, { recursive: true, force: true }) } catch { /* olsun */ }

  console.log(`\n${sayi} görsel → ${CIKTI}/`)
}

async function backofficeGiris(s) {
  await s.git(ADRES + '/backoffice.html')
  await bekle(900)
  await s.js(`(() => {
    const yaz = (el, v) => {
      const p = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
      p.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const g = [...document.querySelectorAll('input')];
    if (g[0]) yaz(g[0], 'admin');
    if (g[1]) yaz(g[1], '123456');
    return g.length;
  })()`)
  await bekle(200)
  await s.js(`(() => {
    const f = document.querySelector('form');
    if (f) f.requestSubmit();
    return 'OK';
  })()`)
  await bekle(1400)
}

/* Backoffice'in kendi demo üreticisi: görsellerdeki talepler,
   müşteriler ve raporlar oradan geliyor (bkz. src/backoffice/demo.js). */
async function demoYukle(s) {
  await s.tiklaMetin('Personel', '.yan__bag')
  await bekle(900)
  const t = await s.tiklaMetin('Demo verisini yükle', 'button')
  if (t === 'YOK') {
    console.warn('    ! demo düğmesi yok (veri zaten yüklü olabilir)')
  }
  await bekle(2500)
}

/* Servisim'in 'konya' demo hesabıyla oturum açması: form doldurup
   göndermek yerine demoKur()'un kurduğu servis kaydını okuyup
   oturumu doğrudan sessionStorage'a yazıyor (bkz. SERVIS notu ve
   src/lib/storage.js → oturumKaydet, anahtar 'paksan.servisOturum').
   Sayfa ilk açılışta demo verisini kendi kuruyor; o bitmeden okumamak
   için sabit bir bekleme var (aşağıdaki 2600ms, giriş sahnesiyle aynı
   süre). */
async function servisimOturumAc(s) {
  await s.git(ADRES + '/servis.html')
  await bekle(2600)
  const r = await s.js(`(() => {
    const ic = JSON.parse(localStorage.getItem('paksan.panelIcerik') || '{}');
    const k = (ic.servisler || []).find((b) => b.kullanici === 'konya');
    if (!k) return 'YOK';
    const oturum = { servisId: k.id, no: k.no, ad: k.ad, il: k.il, ilkGiris: false, giris: Date.now() };
    sessionStorage.setItem('paksan.servisOturum', JSON.stringify(oturum));
    return 'OK';
  })()`)
  if (r === 'YOK') console.warn('    ! demo servis hesabı yok ("konya")')
  await s.git(ADRES + '/servis.html')
  await bekle(900)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
