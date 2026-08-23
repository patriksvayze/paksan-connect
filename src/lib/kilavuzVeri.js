import { PAKET, yaz } from './destek'

/* ==========================================================================
   Kılavuz içeriği — gerçek kullanım kılavuzlarından

   Kılavuzlar ekranı önce uygulamanın kendi yazdığı genel bir özeti
   gösteriyordu: her makine için aynı güvenlik maddeleri, aynı bakım
   listesi. Doğruydu ama makineye ait değildi.

   Artık içerik `mobile_support_package.json` içinden geliyor; o dosya da
   PAKSAN'ın beş gerçek kullanım kılavuzundan çıkarıldı. Ekranda görünen
   her cümlenin altında hangi kılavuzun kaçıncı sayfası olduğu yazıyor.

   BEŞ KILAVUZ, HANGİ MAKİNELER

     HAMMER KULLANIM KILAVUZU          Hammer
     PAKSAN BALYA KULLANIM KILAVUZU    Süper 8002 / 8002E / Yunus ailesi
     ORKA KULLANIM KILAVUZU            Orka 870
     YUVARLAK BALYA KULLANIM KILAVUZU  i-Pak rulo balya
     TWIN HAMMER KULLANIM KILAVUZU     (uygulamada karşılığı olan ürün yok)

   Kılavuzu olmayan modeller Kılavuzlar listesinde görünmüyor. Uydurma
   kılavuz göstermektense hiç göstermemek doğru; o modeller Makineler ve
   Ürünler ekranlarında duruyor.

   VARYANT MESELESİ

   Bir kılavuz birden çok modeli kapsıyor (Süper Yunus 2 ipli, 3 ipli,
   haşbaylı…). Güvenlik uyarıları ve kullanım prosedürleri hepsinde
   ortak; TEKNİK DEĞERLER değil — ağırlık, ölçü, bağlayıcı sayısı
   varyanta göre değişiyor.

   Bu yüzden teknik değerler bölümünde kullanıcı kendi varyantını
   seçiyor. Uygulama onun yerine tahmin etmiyor: iki ipli makinenin
   sahibine üç iplinin değerlerini göstermek, hiç göstermemekten kötü.
   ========================================================================== */

/* Uygulamadaki ürün → kılavuzun kapsam kaydı.

   Kapsam kaydı bir kılavuzun kapsadığı bütün modelleri toplayan iç
   kayıt (bkz. src/lib/destek.js). Güvenlik ve prosedür kayıtları bu
   kayda bağlı olduğu için eşleştirme kapsam üzerinden yapılıyor. */
const URUN_KILAVUZU = {
  hammer: 'MCH_HAMMER_SERIES',

  'super-8002': 'MCH_PAKSAN_BALYA_SUPER',
  'super-8002e': 'MCH_PAKSAN_BALYA_SUPER',
  'super-8002e-dual2': 'MCH_PAKSAN_BALYA_SUPER',
  'super-yunus': 'MCH_PAKSAN_BALYA_SUPER',
  'super-yunus-dual2': 'MCH_PAKSAN_BALYA_SUPER',
  'super-yunus-3yabali': 'MCH_PAKSAN_BALYA_SUPER',

  'orka-870': 'MCH_ORKA_870',
  'ipak-rulo': 'MCH_IPAK_ROUND_BALER',
}

/* Paksan Balya kılavuzu yedi modeli birden kapsıyor: Süper 8002 ailesi
   ve Yunus ailesi. Ürün Yunus'sa varyant listesinde 8002'leri
   göstermenin anlamı yok — ada göre daraltılıyor. Daraltma bir sonuç
   vermezse hepsi listeleniyor; eksik göstermektense fazla göstermek
   yeğdir. */
const AILE_SUZGECI = {
  'super-8002': 'S8002',
  'super-8002e': 'S8002',
  'super-8002e-dual2': 'S8002',
  'super-yunus': 'YUNUS',
  'super-yunus-dual2': 'YUNUS',
  'super-yunus-3yabali': 'YUNUS',
}

/** Bu ürünün gerçek kullanım kılavuzu veri setinde var mı? */
export function kilavuzVarMi(productId) {
  return Boolean(URUN_KILAVUZU[productId])
}

/** Kılavuzu olan ürün kimlikleri. */
export function kilavuzluUrunler() {
  return Object.keys(URUN_KILAVUZU)
}

export function kilavuzKapsami(productId) {
  return URUN_KILAVUZU[productId] || null
}

/* Kapsama giren kayıtlar: doğrudan kapsam kaydına bağlı olanlar ve
   kapsamdaki bir modele bağlı olanlar. */
function kapsamda(kayit, kapsam, modelIdler) {
  if (kayit.machine_id === kapsam) return true
  if (modelIdler.includes(kayit.machine_id)) return true
  return (kayit.model_scope || []).some((x) => x === kapsam || modelIdler.includes(x))
}

/** Kılavuzun kapsadığı modeller — teknik değerlerde seçiliyor. */
export function kilavuzModelleri(productId) {
  const kapsam = kilavuzKapsami(productId)
  if (!kapsam) return []

  /* Kapsam kaydının kendisi bir model değil, listede yok. Kapsama giren
     modeller akışların `model_scope` alanından çıkıyor. */
  const idler = new Set()
  for (const f of PAKET.flows) {
    if (f.machine_id !== kapsam) continue
    for (const m of f.model_scope || []) if (m !== kapsam) idler.add(m)
  }
  if (idler.size === 0) idler.add(kapsam)

  const hepsi = PAKET.machines
    .filter((m) => idler.has(m.machine_id))
    .map((m) => ({ id: m.machine_id, ad: m.name, model: m.model }))

  const suzgec = AILE_SUZGECI[productId]
  if (!suzgec) return hepsi
  const daraltilmis = hepsi.filter((m) => m.id.includes(suzgec))
  return daraltilmis.length ? daraltilmis : hepsi
}

/** Kılavuzun güvenlik bölümü. */
export function kilavuzGuvenlik(productId) {
  const kapsam = kilavuzKapsami(productId)
  if (!kapsam) return []
  const modeller = kilavuzModelleri(productId).map((m) => m.id)
  return PAKET.safety.filter((s) => kapsamda(s, kapsam, modeller))
}

/** Kılavuzun kullanım prosedürleri ve makine bilgisi kartları. */
export function kilavuzKartlari(productId, tur) {
  const kapsam = kilavuzKapsami(productId)
  if (!kapsam) return []
  const modeller = kilavuzModelleri(productId).map((m) => m.id)
  return PAKET.knowledge_cards.filter(
    (c) => (!tur || c.card_type === tur) && kapsamda(c, kapsam, modeller)
  )
}

/* Teknik değerler varyanta özel: kapsama YAYILMIYOR. Yalnız seçilen
   modelin kendi kaydı ve o modeli açıkça sayan kayıtlar geliyor. */
export function kilavuzTeknik(machineId) {
  if (!machineId) return []
  return PAKET.quick_answers.filter(
    (q) => q.machine_id === machineId || (q.model_scope || []).includes(machineId)
  )
}

/** Kılavuzun kendisi: dosya adı ve sayfa sayısı. */
export function kilavuzBelgesi(productId) {
  const kayit = kilavuzGuvenlik(productId)[0] || kilavuzKartlari(productId)[0]
  const kaynak = kayit?.source?.[0]
  if (!kaynak) return null

  const belge = PAKET.source_documents.find((b) => b.document_id === kaynak.document_id)
  if (!belge) return null

  return {
    ad: belge.filename.replace(/\.pdf$/i, '').replace(/\s+\d{8}$/, ''),
    sayfa: belge.page_count,
  }
}

/* ------------------------------------------------------- Genel güvenlik

   Bir kılavuzun güvenlik bölümü 51-58 madde. Hepsini her makinenin
   sayfasında tekrarlamak ekranı okunmaz yapıyordu; üstelik dört
   kılavuzun maddeleri neredeyse birebir aynı (47 madde ortak).

   Makinenin sayfasında YALNIZ bakım kategorisi duruyor: "makineye el
   sürmeden önce" kuralları. Bunlar kılavuzun kendi sınıflandırması,
   uygulamanın seçimi değil. Geri kalanı ortak Güvenlik Kuralları
   sayfasında (bkz. src/screens/ManualSafety.jsx).

   Orka kılavuzunda bu sınıflandırma yok — bütün maddeleri OTHER
   kategorisinde. Orada kılavuzun kendi sırası izleniyor. */
const BASA_SABIT = 'MAINTENANCE'
const SABIT_SINIR = 4

export function genelGuvenlik(productId) {
  const hepsi = kilavuzGuvenlik(productId)
  const bakim = hepsi.filter((s) => s.hazard_category === BASA_SABIT)
  return (bakim.length ? bakim : hepsi).slice(0, SABIT_SINIR)
}

/* --------------------------------------------------- Ortak güvenlik sayfası

   Beş kılavuzun güvenlik maddeleri tek sayfada, kılavuzun kendi
   kategorilerine göre öbeklenmiş. Aynı cümle birden çok kılavuzda
   geçiyorsa bir kez yazılıyor. */
export const GUVENLIK_KATEGORI = [
  'MAINTENANCE', 'PTO', 'MOVING_PARTS', 'TRANSPORT', 'OTHER',
]

function anahtarla(metin) {
  return (metin || '').toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

export function tumGuvenlikKurallari() {
  const gorulen = new Set()
  const oebek = new Map(GUVENLIK_KATEGORI.map((k) => [k, []]))

  for (const kayit of PAKET.safety) {
    const a = anahtarla(kayit.text?.tr)
    if (!a || gorulen.has(a)) continue
    gorulen.add(a)
    const k = oebek.has(kayit.hazard_category) ? kayit.hazard_category : 'OTHER'
    oebek.get(k).push(kayit)
  }

  return GUVENLIK_KATEGORI
    .map((k) => ({ kategori: k, maddeler: oebek.get(k) }))
    .filter((g) => g.maddeler.length > 0)
}

/* ------------------------------------------------------ Prosedür başlığı

   Veri setinde kullanım kartlarının başlığı gövdenin kendisi: ekranda
   başlık ve metin birebir aynı çıkıyordu, liste okunmuyordu.

   Aşağıdaki tablo her prosedüre KISA BİR AD veriyor. Ad, kılavuzun
   cümlesinden çıkarılan bir etiket; teknik içerik değil — metnin
   kendisi kartın içinde olduğu gibi duruyor. Eşleşme bulunmazsa
   uydurma ad üretilmiyor, cümlenin ilk parçası gösteriliyor. */
const PROSEDUR_ADI = [
  [/kriko ile kaldır|çeki kancasına bağlay/i, { tr: 'Traktöre Bağlama', en: 'Hitching to the Tractor' }],
  [/balya bağlayabilecek pozisyona getirmeden/i, { tr: 'Çalıştırmadan Önce', en: 'Before Starting' }],
  [/etrafında kimse olmadığından/i, { tr: 'İlk Çalıştırma', en: 'First Start-Up' }],
  [/boşta çalıştır/i, { tr: 'Boşta Çalıştırma', en: 'Idle Run' }],
  [/çalışmaya başlayınız/i, { tr: 'Çalışmaya Başlama', en: 'Starting Work' }],
  [/ilk yüz bal\s?ya(yı)? yapınız/i, { tr: 'İlk Yüz Balya', en: 'The First Hundred Bales' }],
  [/balya boyunu sıkılığını/i, { tr: 'Balya Kontrolü', en: 'Checking the Bale' }],
  [/540 devir\/dakika kuyruk mili/i, { tr: 'Kuyruk Mili Devri', en: 'PTO Speed' }],
  [/bir traktör ile çalıştırmanız tavsiye/i, { tr: 'Traktör Seçimi', en: 'Choosing the Tractor' }],
  [/teslim edil/i, { tr: 'Teslim Durumu', en: 'Condition on Delivery' }],
  [/kullanma kılavuzunu okuduktan sonra/i, { tr: 'Kılavuzu Okuduktan Sonra', en: 'After Reading the Manual' }],
]

export function prosedurBasligi(kart, dil = 'tr') {
  const govde = yaz(kart.body, 'tr')
  for (const [kalip, ad] of PROSEDUR_ADI) {
    if (kalip.test(govde)) return dil === 'en' ? ad.en : ad.tr
  }
  const s = yaz(kart.body, dil)
  return s.length > 60 ? s.slice(0, 60).trimEnd() + '…' : s
}

/* Teknik değer satırının etiketi.

   Paket bu değerleri soru cümlesine çevirmiş: "Süper YUNUS 2 İpli
   Haşbaysız için Ağırlık Weight nedir?". Tabloda soru değil etiket
   lazım; cümlenin ortasındaki etiket ayıklanıyor. Etiket kılavuzun
   kendi tablo başlığı — Türkçe ve İngilizcesi yan yana yazılı, öyle
   bırakılıyor.

   Kalıp tutmazsa soru cümlesi olduğu gibi gösteriliyor; uydurma bir
   etiket üretilmiyor. */
export function teknikEtiket(kayit, dil = 'tr') {
  const soru = yaz(kayit.question, dil)
  const tr = soru.match(/ için (.+) nedir\?$/)
  if (tr) return tr[1]
  const en = soru.match(/^What is (.+) for .+\?$/)
  if (en) return en[1]
  return soru
}
