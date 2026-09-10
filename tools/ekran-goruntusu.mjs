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

import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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

const FATURA = {
  tuzel: false, tel: '+90 539 847 27 84', adres: 'Yeni Mahalle, Bahçe Sokak No:12',
  il: 'Balıkesir', ilce: 'Bandırma', ulke: 'TR', farkliKisi: false,
  ad: 'Onur Gökay', tc: '10000000146',
}

const ORTAK_TALEP = {
  ulke: 'TR', ihracat: false, ses: null, ekler: [], urunId: null,
  ad: 'Onur Gökay', tel: '+90 539 847 27 84', telUlke: 'TR',
  telHam: '5398472784', il: 'Balıkesir', ilce: 'Bandırma',
  urunTipi: '', arazi: '', traktor: '', ulasim: 'Farketmez',
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
    parcalar: ['Düğüm atıcı bıçağı'], parcaAdet: { 'Düğüm atıcı bıçağı': 1 },
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
]

function tohum() {
  const d = {
    'paksan.user': MUSTERI,
    'paksan.hesap': MUSTERI,
    'paksan.machines': MAKINELER,
    'paksan.requests': TALEPLER,
    'paksan.destekUrun': 'hammer',
  }
  return `(() => {
    const d = ${JSON.stringify(d)};
    for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v));
    sessionStorage.setItem('paksan.user', JSON.stringify(d['paksan.user']));
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

const UYGULAMA = [
  { ad: '01-karsilama', baslik: 'Karşılama', yol: '/hosgeldiniz', cikisYap: true },
  { ad: '02-giris', baslik: 'Giriş', yol: '/giris', cikisYap: true },
  { ad: '03-kayit', baslik: 'Hesap açma', yol: '/kayit', cikisYap: true },
  { ad: '04-ana-sayfa', baslik: 'Ana Sayfa', yol: '/' },
  { ad: '05-makinelerim', baslik: 'Makinelerim', yol: '/makinelerim' },
  { ad: '06-makine-detay', baslik: 'Makine detayı', yol: '/makine/mk1' },
  { ad: '07-makine-ekle', baslik: 'Makine ekleme', yol: '/makine-ekle' },
  { ad: '08-urunler', baslik: 'Ürünler', yol: '/urunler' },
  { ad: '09-urun-detay', baslik: 'Ürün detayı', yol: '/urun/orkinos-1270' },
  {
    ad: '10-destek-makine-secimi', baslik: 'Destek — makine seçimi', yol: '/destek',
    adimlar: [{ js: "localStorage.removeItem('paksan.destekUrun')" }, { yenile: true }],
  },
  /* DESTEK — üç adımlı yönlendirme.

     Ekran yenilendi: düz arıza listesi yerine önce konu grubu,
     sonra belirti, sonra cevap geliyor. Seçiciler buna göre. */
  { ad: '11-destek-konular', baslik: 'Destek — konu grupları', yol: '/destek' },
  {
    ad: '12-destek-belirtiler', baslik: 'Destek — belirtiler', yol: '/destek',
    adimlar: [
      { tiklaMetin: 'Bağlama ve düğüm', kapsam: '.chip--konu' },
      { bekle: 600 },
    ],
  },
  {
    ad: '13-destek-cevap', baslik: 'Destek — sebepler ve çözümler', yol: '/destek',
    adimlar: [
      { tiklaMetin: 'Bağlama ve düğüm', kapsam: '.chip--konu' },
      { bekle: 500 },
      { tiklaMetin: 'İp sürekli kopuyor', kapsam: '.chip' },
      { bekle: 800 },
      { kaydirSecici: '.dst-sebepler' },
    ],
  },
  {
    ad: '14-destek-guvenlik', baslik: 'Destek — müdahale uyarısı', yol: '/destek',
    adimlar: [
      { tiklaMetin: 'Bağlama ve düğüm', kapsam: '.chip--konu' },
      { bekle: 500 },
      { tiklaMetin: 'İp sürekli kopuyor', kapsam: '.chip' },
      { bekle: 800 },
      { kaydirSecici: '.dst-guvenlik' },
    ],
  },
  { ad: '18-kilavuzlar', baslik: 'Kılavuzlar', yol: '/kilavuzlar' },
  { ad: '19-kilavuz', baslik: 'Kılavuz detayı', yol: '/kilavuz/hammer' },
  { ad: '20-bakim-rehberi', baslik: 'Bakım rehberi', yol: '/bakim' },
  { ad: '21-talep-servis', baslik: 'Servis talebi formu', yol: '/talep?tur=servis' },
  { ad: '22-talep-parca', baslik: 'Yedek parça talebi formu', yol: '/talep?tur=parca' },
  { ad: '23-talep-teklif', baslik: 'Fiyat teklifi talebi formu', yol: '/talep?tur=satinalma' },
  { ad: '24-talep-detay', baslik: 'Talep detayı', yol: '/talebim/tlp-servis-1' },
  { ad: '25-talep-detay-parca', baslik: 'Yedek parça talebi detayı', yol: '/talebim/tlp-parca-1' },
  { ad: '25b-talep-detay-teklif', baslik: 'Fiyat teklifi detayı', yol: '/talebim/tlp-teklif-1' },
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

const BACKOFFICE = [
  { ad: '40-backoffice-giris', baslik: 'Backoffice girişi', giris: false },
  { ad: '41-dashboard', baslik: 'Dashboard', menu: 'Dashboard' },
  { ad: '42-talepler', baslik: 'Talepler', menu: 'Talepler' },
  {
    ad: '43-talep-detay', baslik: 'Talep detayı', menu: 'Talepler',
    adimlar: [{ tiklaSira: 'tbody tr', sira: 0 }, { bekle: 600 }],
  },
  { ad: '44-musteriler', baslik: 'Müşteriler', menu: 'Müşteriler' },
  {
    ad: '45-musteri-detay', baslik: 'Müşteri detayı', menu: 'Müşteriler',
    adimlar: [{ tiklaSira: 'tbody tr', sira: 0 }, { bekle: 600 }],
  },
  { ad: '46-bayiler', baslik: 'Bayiler', menu: 'Bayiler' },
  { ad: '47-geri-bildirimler', baslik: 'Geri Bildirimler', menu: 'Geri Bildirimler' },
  { ad: '48-raporlar', baslik: 'Raporlar', menu: 'Raporlar' },
  { ad: '49-destek-kayitlari', baslik: 'Destek Kayıtları', menu: 'Destek Kayıtları' },
  { ad: '50-duyurular', baslik: 'Duyurular', menu: 'Duyurular' },
  { ad: '51-numara-talepleri', baslik: 'Numara Değişikliği Talepleri', menu: 'Numara Değişikliği' },
  { ad: '52-personel', baslik: 'Personel', menu: 'Personel' },
  { ad: '53-islem-kaydi', baslik: 'İşlem Kaydı', menu: 'İşlem Kaydı' },
  {
    ad: '54-cikis-onayi', baslik: 'Çıkış onayı', menu: 'Dashboard',
    adimlar: [{ tikla: '.yan__cikis' }, { bekle: 400 }],
  },
]

/* ====================================================== Chrome sürücüsü */

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((y) => existsSync(y))

if (!CHROME) {
  console.error('Chrome bulunamadı. Yolu PAKSAN_CHROME ile verebilirsiniz.')
  process.exit(1)
}

const PORT = 9333 + Math.floor(Math.random() * 400)
const PROFIL = join(tmpdir(), 'paksan-ekran-' + Date.now())

function bekle(ms) {
  return new Promise((c) => setTimeout(c, ms))
}

async function chromeAc() {
  const p = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + PROFIL,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-color-profile=srgb',
    'about:blank',
  ], { stdio: 'ignore' })

  for (let i = 0; i < 60; i++) {
    await bekle(250)
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (r.ok) return { surec: p, bilgi: await r.json() }
    } catch { /* henüz açılmadı */ }
  }
  throw new Error('Chrome açılmadı')
}

/* CDP: tek bir WebSocket üzerinden komut gönderip cevabını bekliyoruz. */
class Cdp {
  constructor(ws) {
    this.ws = ws
    this.no = 0
    this.bekleyen = new Map()
    this.olaylar = new Map()
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data)
      if (m.id && this.bekleyen.has(m.id)) {
        const { coz, red } = this.bekleyen.get(m.id)
        this.bekleyen.delete(m.id)
        m.error ? red(new Error(m.error.message)) : coz(m.result)
      } else if (m.method) {
        const d = this.olaylar.get(m.method)
        if (d) { this.olaylar.delete(m.method); d(m.params) }
      }
    })
  }

  static async bagla(url) {
    const ws = new WebSocket(url)
    await new Promise((c, r) => {
      ws.addEventListener('open', c, { once: true })
      ws.addEventListener('error', r, { once: true })
    })
    return new Cdp(ws)
  }

  gonder(method, params = {}, sessionId) {
    const id = ++this.no
    this.ws.send(JSON.stringify({ id, method, params, sessionId }))
    return new Promise((coz, red) => this.bekleyen.set(id, { coz, red }))
  }

  olay(method, sure = 8000) {
    return new Promise((coz) => {
      const zaman = setTimeout(() => { this.olaylar.delete(method); coz(null) }, sure)
      this.olaylar.set(method, (p) => { clearTimeout(zaman); coz(p) })
    })
  }
}

/* ------------------------------------------------------------- Sayfa */

class Sayfa {
  constructor(cdp, oturum) {
    this.cdp = cdp
    this.oturum = oturum
  }

  static async ac(cdp) {
    const { targetId } = await cdp.gonder('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await cdp.gonder('Target.attachToTarget', { targetId, flatten: true })
    const s = new Sayfa(cdp, sessionId)
    await s.cdp.gonder('Page.enable', {}, sessionId)
    await s.cdp.gonder('Runtime.enable', {}, sessionId)
    return s
  }

  olcu(m) {
    return this.cdp.gonder('Emulation.setDeviceMetricsOverride', {
      ...m, screenWidth: m.width, screenHeight: m.height,
    }, this.oturum)
  }

  /* Uygulama HashRouter kullaniyor: yalniz `#` degisince Chrome sayfayi
     yeniden yuklemiyor ve bir onceki ekranin durumu (acik akordiyon,
     secili sekme) ustte kaliyor. Her sahne temiz baslasin diye adres
     yazildiktan sonra sayfa acikca yenileniyor. */
  async git(url) {
    await this.cdp.gonder('Page.navigate', { url }, this.oturum)
    await bekle(150)
    const yuklendi = this.cdp.olay('Page.loadEventFired', 15000)
    await this.cdp.gonder('Page.reload', {}, this.oturum)
    await yuklendi
    await bekle(600)
  }

  async js(kod) {
    const r = await this.cdp.gonder('Runtime.evaluate', {
      expression: kod, awaitPromise: true, returnByValue: true,
    }, this.oturum)
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + kod.slice(0, 80))
    return r.result?.value
  }

  /* Metnine göre düğme bulup tıklıyor. `kapsam` verilirse yalnız o
     seçicideki öğelere bakılıyor — "Kullanım" hem sekmede hem kart
     başlığında geçebiliyor. */
  tiklaMetin(metin, kapsam = 'button, a, [role="button"]') {
    return this.js(`(() => {
      const ara = ${JSON.stringify(metin)};
      const hepsi = [...document.querySelectorAll(${JSON.stringify(kapsam)})];
      const h = hepsi.find(e => (e.innerText || '').includes(ara));
      if (!h) return 'YOK';
      h.click();
      return 'OK';
    })()`)
  }

  tikla(secici) {
    return this.js(`(() => {
      const e = document.querySelector(${JSON.stringify(secici)});
      if (!e) return 'YOK';
      e.click();
      return 'OK';
    })()`)
  }

  tiklaSon(secici) {
    return this.js(`(() => {
      const l = [...document.querySelectorAll(${JSON.stringify(secici)})];
      if (!l.length) return 'YOK';
      l[l.length - 1].click();
      return 'OK';
    })()`)
  }

  tiklaSira(secici, sira) {
    return this.js(`(() => {
      const l = [...document.querySelectorAll(${JSON.stringify(secici)})];
      if (!l[${sira}]) return 'YOK';
      l[${sira}].click();
      return 'OK';
    })()`)
  }

  kaydir(px) {
    return this.js(`(window.scrollTo({top:${px}}), 'OK')`)
  }

  /* Acilan akordiyon ekranin altinda kalabiliyor; goruntu alinmadan
     once o kutuyu ekranin ustune getiriyor. */
  kaydirSecici(secici, bosluk = 90) {
    return this.js(`(() => {
      const e = document.querySelector(${JSON.stringify(secici)});
      if (!e) return 'YOK';
      const y = e.getBoundingClientRect().top + window.scrollY - ${bosluk};
      window.scrollTo({ top: Math.max(0, y) });
      return 'OK';
    })()`)
  }

  async cek(dosya) {
    const { data } = await this.cdp.gonder('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: false,
    }, this.oturum)
    writeFileSync(dosya, Buffer.from(data, 'base64'))
  }
}

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
    if (a.js) { await s.js(a.js); continue }
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

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
