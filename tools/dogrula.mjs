/* ==========================================================================
   Değişiklik sonrası doğrulama

   Bu projede test altyapısı yok. Bir değişiklikten sonra elle bakılan
   şeyler hep aynıydı: iki dil sözlüğü eşit mi, iki CSS dosyasındaki
   renkler tutuyor mu, backoffice kodu APK'ya sızmış mı. Elle bakınca
   hem zaman gidiyor hem yanlış sonuç çıkabiliyordu.

   ÇALIŞTIRMAK

     npm run dogrula

   Sorun bulunursa çıkış kodu 1 olur; hiçbir şey bulunmazsa 0.

   NE KONTROL EDİYOR

     1. Sözlük eşitliği  — tr.js ve en.js aynı anahtarları içeriyor mu
     2. Kullanılan anahtar — koddaki t('...') çağrılarının karşılığı var mı
     3. CSS token'ları   — styles.css ve backoffice.css aynı değerleri
                           veriyor mu (iki dosya elle senkron tutuluyor)
     4. Derleme ayrımı   — dist/ içine backoffice kodu sızmış mı

   4. kontrol yalnız dist/ varsa çalışır; yoksa atlanır.
   ========================================================================== */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, sep as SEP } from 'node:path'

const KOK = process.cwd()
let sorun = 0

function baslik(s) {
  console.log('\n' + s)
  console.log('-'.repeat(s.length))
}

function bildir(satir) {
  console.log('  ! ' + satir)
  sorun++
}

function tamam(satir) {
  console.log('  ok ' + satir)
}

/* ------------------------------------------------ 1. Sözlük eşitliği */

/** İç içe nesnedeki bütün yaprak anahtarları "a.b.c" biçiminde toplar. */
function yapraklar(nesne, onEk = '', kova = []) {
  for (const [k, v] of Object.entries(nesne)) {
    const yol = onEk ? onEk + '.' + k : k
    if (v && typeof v === 'object' && !Array.isArray(v)) yapraklar(v, yol, kova)
    else kova.push(yol)
  }
  return kova
}

const { tr } = await import('../src/i18n/tr.js')
const { en } = await import('../src/i18n/en.js')

const aTr = new Set(yapraklar(tr))
const aEn = new Set(yapraklar(en))

baslik('1. Sözlük eşitliği')
const trdeYok = [...aEn].filter((k) => !aTr.has(k))
const endeYok = [...aTr].filter((k) => !aEn.has(k))

if (!trdeYok.length && !endeYok.length) {
  tamam(`tr ve en aynı ${aTr.size} anahtarı içeriyor`)
} else {
  for (const k of endeYok) bildir(`en.js'de yok: ${k}`)
  for (const k of trdeYok) bildir(`tr.js'de yok: ${k}`)
}

/* --------------------------------------- 2. Kodda kullanılan anahtarlar */

/** Bir klasörü tarayıp verilen uzantılı dosyaların yollarını döndürür. */
function dosyalar(dizin, uzantilar, kova = []) {
  for (const g of readdirSync(dizin, { withFileTypes: true })) {
    const yol = join(dizin, g.name)
    if (g.isDirectory()) dosyalar(yol, uzantilar, kova)
    else if (uzantilar.some((u) => g.name.endsWith(u))) kova.push(yol)
  }
  return kova
}

baslik('2. Kodda kullanılan anahtarlar')
const kaynaklar = dosyalar(join(KOK, 'src'), ['.jsx', '.js'])
const kullanilan = new Map()

for (const d of kaynaklar) {
  /* Yorumlar ayıklanıyor: dosya başındaki kullanım örnekleri
     (`t('talep.no', { no: 'SRV-123' })` gibi) gerçek çağrı değil. */
  const metin = readFileSync(d, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  /* Sondaki karakter de yakalanıyor: `t('talep.' + no)` gibi parçalı
     anahtarlar sabit değil, çalışırken birleştiriliyor — bunlar
     "sözlükte yok" sayılmamalı. */
  for (const e of metin.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'\s*(.)/g)) {
    if (e[2] === '+') continue
    if (!kullanilan.has(e[1])) kullanilan.set(e[1], d.replace(KOK + '\\', '').replace(/\\/g, '/'))
  }
}

const karsiligiYok = [...kullanilan].filter(([k]) => !aTr.has(k))
if (!karsiligiYok.length) {
  tamam(`${kullanilan.size} anahtarın tamamı sözlükte var`)
} else {
  for (const [k, d] of karsiligiYok) bildir(`sözlükte yok: ${k}  (${d})`)
}

/* ------------------------------------------------- 3. CSS token'ları */

/** :root bloklarındaki --token: değer çiftlerini toplar. */
function tokenlar(dosya) {
  const metin = readFileSync(dosya, 'utf8')
  const harita = new Map()
  for (const e of metin.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gim)) {
    const deger = e[2].replace(/\/\*.*?\*\//g, '').trim().toLowerCase()
    if (!harita.has(e[1])) harita.set(e[1], deger)
  }
  return harita
}

baslik('3. CSS token eşitliği')
const tUyg = tokenlar(join(KOK, 'src/styles.css'))
const tBo = tokenlar(join(KOK, 'src/backoffice/backoffice.css'))

/* `var(--x)` referansları karşılaştırmadan önce kendi dosyası içinde
   çözülüyor. İki dosya aynı rengi farklı token adıyla veriyor olabilir
   (--pk-navy / --lacivert); asıl soru rengin aynı olup olmadığı. */
function coz(deger, harita, derinlik = 0) {
  const e = /^var\(\s*(--[a-z0-9-]+)\s*\)$/.exec(deger)
  if (!e || derinlik > 5) return deger
  const hedef = harita.get(e[1])
  return hedef === undefined ? deger : coz(hedef, harita, derinlik + 1)
}

/* Bilerek ayrışan token'lar.

   Her ayrışma hata değil. Backoffice'te talep rozetlerinin yazısı
   beyaz ve küçük; uygulamanın açık tonlarında kontrast 4,5'in altına
   düşüyordu, o yüzden orada koyu ton kullanılıyor (gerekçe
   backoffice.css içinde ölçülmüş hâliyle yazılı). Köşe yarıçapı da
   masaüstünde daha sıkı.

   Buraya bir token eklemeden önce backoffice.css'teki gerekçeyi oku.
   Gerekçesi yoksa ayrışma muhtemelen gerçek bir hatadır. */
const BILEREK_AYRI = new Map([
  ['--tur-servis', 'backoffice beyaz yazı için koyu ton kullanıyor (kontrast)'],
  ['--tur-parca', 'backoffice beyaz yazı için koyu ton kullanıyor (kontrast)'],
  ['--tur-satis', 'backoffice beyaz yazı için koyu ton kullanıyor (kontrast)'],
  ['--r', 'masaüstünde daha sıkı köşe yarıçapı'],
])

const ortak = [...tUyg.keys()].filter((k) => tBo.has(k))
const ayrisan = ortak.filter(
  (k) =>
    !BILEREK_AYRI.has(k) && coz(tUyg.get(k), tUyg) !== coz(tBo.get(k), tBo),
)

/* Üçüncü bir CSS kökü açılmadığının denetimi.

   Bayi paneli backoffice.css'i paylaşıyor; src/bayi/ altında kendi
   :root bloğu olsaydı elle senkron tutulacak üçüncü bir renk listesi
   doğardı. Bu kural koda yazılı olmasa unutulur. */
const bayiCss = join(KOK, 'src/bayi')
if (existsSync(bayiCss)) {
  for (const d of dosyalar(bayiCss, ['.css'])) {
    if (/^\s*:root\s*\{/m.test(readFileSync(d, 'utf8'))) {
      bildir(`${d.split(/[\\/]/).pop()} içinde :root var — bayi paneli backoffice.css'i paylaşmalı`)
    }
  }
}

if (!ayrisan.length) {
  tamam(
    `${ortak.length - BILEREK_AYRI.size} ortak token aynı, ` +
      `${BILEREK_AYRI.size} tanesi bilerek ayrı`,
  )
} else {
  for (const k of ayrisan) {
    bildir(`${k}: styles.css "${coz(tUyg.get(k), tUyg)}" / backoffice.css "${coz(tBo.get(k), tBo)}"`)
  }
}

/* -------------------------------------------------- 4. Derleme ayrımı */

baslik('4. Derleme ayrımı')

/* Üç ayrı derleme var ve her birinin içine girmemesi gereken şeyler
   farklı:

     dist/       müşterinin telefonuna kurulan APK. Ne personel ne bayi
                 kodu girmeli.
     dist-bayi/  bayinin cihazı. PAKSAN'ın iç ekranları girmemeli. */
const AYRIMLAR = [
  {
    klasor: 'dist/assets',
    ad: 'dist/',
    izler: ['Backoffice', 'panelOturum', 'BayiPanel', 'bayiOturum'],
    aciklama: 'personel ve bayi kodu',
  },
  {
    klasor: 'dist-bayi/assets',
    ad: 'dist-bayi/',
    izler: ['IslemKaydi', 'Raporlar', 'sifreTalepleri'],
    aciklama: "PAKSAN'ın iç ekranları",
  },
]

for (const a of AYRIMLAR) {
  const yol = join(KOK, a.klasor)
  if (!existsSync(yol)) {
    console.log(`  - ${a.ad} yok, atlandı`)
    continue
  }
  const bulunan = []
  for (const d of dosyalar(yol, ['.js'])) {
    const metin = readFileSync(d, 'utf8')
    for (const iz of a.izler) {
      const n = metin.split(iz).length - 1
      /* Tek tük geçiş metin olabilir; bir eşiğin üstü kod demek. */
      if (n > 3) bulunan.push(`${a.ad} ${iz} x${n} → ${d.split(/[\\/]/).pop()}`)
    }
  }
  if (!bulunan.length) tamam(`${a.ad} içinde ${a.aciklama} yok`)
  else for (const b of bulunan) bildir(b)
}

/* ------------------------------------------------ 5. Marka sınırı

   Firmaya ait olan her şey `src/marka/` içinde; motor oraya TEK
   KAPIDAN bakıyor (`src/marka/index.js`). Bu ayrım belgeyle
   korunmuyor, burada korunuyor: derinden import eden bir dosya
   eklenirse kontrol düşüyor ve marka klasörünün iç düzeni bir daha
   serbestçe değiştirilemez hâle gelir.

   TEK İSTİSNA `src/marka/icerik/`. Arıza bilgi tabanı, teknik
   özellikler ve kılavuz paketi ağır dosyalar — kılavuz paketi tek
   başına 1,7 MB. Kapıdan verilselerdi `../marka` yazan her dosya
   onları da paketine çekerdi; bayi paneli arıza bilgi tabanını hiç
   kullanmadığı hâlde taşırdı. İçerik bu yüzden doğrudan, yalnız
   çizildiği ekrandan import ediliyor. */

baslik('5. Marka sınırı')

const DERIN = /from\s+'[^']*\/marka\/(?!icerik\/)[^']*'/
const derinler = []
for (const d of dosyalar(join(KOK, 'src'), ['.js', '.jsx'])) {
  if (d.includes(`${SEP}marka${SEP}`)) continue /* kendi içi serbest */
  for (const [i, satir] of readFileSync(d, 'utf8').split('\n').entries()) {
    if (DERIN.test(satir)) {
      derinler.push(`${d.split(/[\\/]/).pop()}:${i + 1} ${satir.trim()}`)
    }
  }
}

if (!derinler.length) {
  tamam('motor marka klasörüne yalnız kapıdan bakıyor')
} else {
  for (const x of derinler) bildir(`marka klasörüne derin import: ${x}`)
}

/* ------------------------------------------------------------- Sonuç */

console.log('')
if (sorun) {
  console.log(`SONUÇ: ${sorun} sorun bulundu.`)
  process.exit(1)
}
console.log('SONUÇ: beş kontrol de temiz.')
