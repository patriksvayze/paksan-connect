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
     2. Kullanılan anahtar — koddaki t('...') çağrılarının ve bildirim
                           kaydına yazılan anahtarların (baslikAnahtar,
                           metinAnahtar) karşılığı var mı
     3. CSS token'ları   — styles.css ve backoffice.css aynı değerleri
                           veriyor mu (iki dosya elle senkron tutuluyor)
     4. Derleme ayrımı   — dist/ içine backoffice kodu sızmış mı
     5. Marka sınırı     — motor marka klasörüne yalnız kapıdan bakıyor mu
     6. Marka adı        — firma adı motor kodunda düz yazıyla geçiyor mu
     7. Bayi kalıntısı   — servis uygulamasında bayi kelimesi kalmış mı
     8. Sınamalar — tools/ altındaki dokuz sınama betiği
     9. Yedek parça      — katalog tutarlı mı, uydurma fiyat geri geldi mi
    10. Sürüm numarası   — Connect'in üç yeri tutuyor mu, Servisim ayrı mı
    11. Yayın anahtarları — geliştirme ayarı APK'ya gidiyor mu (saymıyor)
    12. Yazılmamış metin — Codex'i bekleyen yer tutucu ekrana çıkıyor mu
    13. Veritabanı betikleri — SQL statik denetimi, tohum betikleri
                           kaynakla aynı mı, ortam dosyası git'te mi

   4. kontrol yalnız dist/ varsa çalışır; yoksa atlanır.
   13. kontrol yalnız veritabani/ klasörü varsa çalışır; yoksa atlanır.

   8. kontrol tek tek çalıştırılan betikleri bir araya getiriyor. Ayrı
   dururken unutuluyorlardı: `bolge-testi.mjs` marka klasörü taşınırken
   kırıldı ve haftalarca kırık kaldı, çünkü hiçbir komut onu
   çağırmıyordu. `destek-dogrula.mjs` aynı şeyi yaşadı: veri paketi
   src/data altından src/marka/icerik altına taşınınca betik ENOENT
   verip durdu ve kimse görmedi. Bir sınama çağrılmıyorsa yoktur.

   11. kontrol SAYMIYOR: bulduğu şeyler bugün bilerek öyle, gerekçesi
   kendi başlığının altında.
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

/* TERİM YASAĞI CONNECT SÖZLÜĞÜNDE (25 Eylül 2026, inceleme). CLAUDE.md:
   "iskonto", "kapsam", "künye" müşteri ve servis ekranlarında, "hak ediş"
   müşteri ekranlarında geçmez. tr.js yalnız Connect'in (müşteri) metni.
   Kural yalnız okunarak uygulanıyordu; düzeltme yarım kaldı ve üç anahtar
   "kapsam" ile yerinde duruyordu. Kelimenin başına bakılıyor; "kapsamlı"
   başka bir kelime, yasağın konusu değil. */
function degerler(nesne, onEk = '', kova = []) {
  for (const [k, v] of Object.entries(nesne)) {
    const yol = onEk ? onEk + '.' + k : k
    if (v && typeof v === 'object' && !Array.isArray(v)) degerler(v, yol, kova)
    else if (typeof v === 'string') kova.push([yol, v])
  }
  return kova
}
const YASAK_TERIM = /(^|[^\p{L}])(iskonto|kapsam(?!l[ıi])|künye|hak ?ediş)/iu
const yasakli = degerler(tr).filter(([, v]) => YASAK_TERIM.test(v))
if (!yasakli.length) tamam('tr.js\'de yasak terim yok (iskonto, kapsam, künye, hak ediş)')
else for (const [k, v] of yasakli) bildir(`tr.js'de yasak terim: ${k} — "${v.match(YASAK_TERIM)[2]}"`)

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

/* KAYDA YAZILAN SÖZLÜK ANAHTARLARI — t('...') taramasının görmediği yer
   (25 Eylül 2026).

   Bildirim kaydı metni değil ANAHTARI saklıyor
   (`baslikAnahtar: 'bildirimler.gonderildiBaslik'`): backoffice
   yazıyor, Connect müşterinin dilinde çeviriyor (backoffice/veri.js →
   musteriyeBildir, lib/bildirimler.js). Anahtar çağrı olarak değil
   dizgi olarak geçtiği için yukarıdaki tarama onu görmüyordu; sözlüğe
   eklenmesi unutulan anahtar müşterinin ekranında HAM olarak çıkardı
   ("bildirimler.servisKaldirildiMetin"). Aynı gün dört yeni anahtar
   veri.js'e sözlükten önce yazıldı.

   Değer bir üçlü ifade olabiliyor ve satırlara bölünüyor (veri.js →
   talepKapat: `metinAnahtar: parcaGonderimi ? parcaSevk ? '…' : '…' :
   '…'`); tek satırlık desen ikinci satırdaki anahtarı kaçırırdı. Bu
   yüzden özelliğin değeri, virgüle ya da kapanan paranteze kadar
   (iç içe parantez ve dizgiler atlanarak) okunuyor ve içindeki her
   `bölüm.anahtar` dizgisi İKİ sözlükte de aranıyor. `+` ile
   birleştirilen parça (`'bildirimler.durum_' + durum`) çalışırken
   kuruluyor; aranmıyor.

   Bozularak denendi: veri.js'te tek satırlık bir anahtar ve talepKapat
   üçlüsünün İKİNCİ satırındaki anahtar yanlış yazılınca ikisi de iki
   sözlük için ayrı ayrı düştü. */
function ozellikDegeri(metin, bas) {
  let i = bas
  let derinlik = 0
  let tirnak = null
  for (; i < metin.length; i++) {
    const c = metin[i]
    if (tirnak) {
      if (c === '\\') i++
      else if (c === tirnak) tirnak = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') tirnak = c
    else if ('([{'.includes(c)) derinlik++
    else if (')]}'.includes(c)) {
      if (derinlik === 0) break
      derinlik--
    } else if (c === ',' && derinlik === 0) break
  }
  return metin.slice(bas, i)
}

const kayittaki = new Map()
for (const d of kaynaklar) {
  const metin = readFileSync(d, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  for (const e of metin.matchAll(/\b(?:baslik|metin)Anahtar\s*:/g)) {
    const deger = ozellikDegeri(metin, e.index + e[0].length)
    for (const k of deger.matchAll(/'([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)'(\s*\+)?/g)) {
      if (k[2]) continue
      if (!kayittaki.has(k[1])) kayittaki.set(k[1], d.replace(KOK + '\\', '').replace(/\\/g, '/'))
    }
  }
}
const kayittaYok = []
for (const [k, d] of kayittaki) {
  if (!aTr.has(k)) kayittaYok.push(`tr.js → ${k}  (${d})`)
  if (!aEn.has(k)) kayittaYok.push(`en.js → ${k}  (${d})`)
}
if (!kayittaki.size) {
  bildir('kayda yazılan anahtar bulunamadı — desen değişmiş olabilir')
} else if (kayittaYok.length) {
  for (const x of kayittaYok) bildir(`kayda yazılan anahtar sözlükte yok: ${x}`)
} else {
  tamam(`kayda yazılan ${kayittaki.size} bildirim anahtarının ikisi de sözlükte var`)
}

/* BİRLEŞTİRİLEN ANAHTARLAR — yukarıdaki tarama bunları GÖREMİYOR.

   `t('talepDurum.' + durum)` gibi çağrılar çalışırken birleşiyor;
   düzenli ifade sabit anahtar arıyor ve bunları atlıyor. Sonucu
   ekranda görüldü: `DURUMLAR` listesine iki yeni durum eklendi,
   sözlüklere eklenmedi, müşteri uygulaması talebin durumu olarak
   ham anahtarı yazdı — "talepDurum.parcaBekliyor".

   Bu yüzden birleştirilen anahtarların KAYNAK LİSTESİ ile sözlük
   burada karşılaştırılıyor. Yeni bir durum eklendiğinde sözlük
   unutulursa derleme değil, bu kontrol yakalar. */
/* Yalnız `DURUMLAR` dizisinin içi okunuyor (24 Eylül 2026). Aynı dosyada
   aynı biçimde yazılmış bir gösterim nesnesi var (`PARCA_YOLDA`: bir
   durumun ekrandaki hâli, kendi kodu yok); müşteri uygulaması durumu
   kodundan çeviriyor, o nesne için sözlük anahtarı aranmamalı. */
const veriMetni = readFileSync(join(KOK, 'src/backoffice/veri.js'), 'utf8')
const durumlarBasi = veriMetni.indexOf('export const DURUMLAR = [')
const durumlarBlogu =
  durumlarBasi >= 0 ? veriMetni.slice(durumlarBasi, veriMetni.indexOf('\n]\n', durumlarBasi)) : ''
const talepDurumlari = [
  ...durumlarBlogu.matchAll(/\{\s*id:\s*'([a-zA-Z]+)',\s*ad:\s*'[^']*',\s*ton:/g),
].map((e) => e[1])

const durumEksik = []
for (const d of talepDurumlari) {
  if (!aTr.has('talepDurum.' + d)) durumEksik.push(`tr.js → talepDurum.${d}`)
  if (!aEn.has('talepDurum.' + d)) durumEksik.push(`en.js → talepDurum.${d}`)
}

if (!talepDurumlari.length) {
  bildir('DURUMLAR listesi okunamadı — desen değişmiş olabilir')
} else if (durumEksik.length) {
  for (const x of durumEksik) bildir(`durum karşılığı yok: ${x}`)
} else {
  tamam(`${talepDurumlari.length} talep durumunun ikisi de sözlükte var`)
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

   Servis paneli backoffice.css'i paylaşıyor; src/servis/ altında kendi
   :root bloğu olsaydı elle senkron tutulacak üçüncü bir renk listesi
   doğardı. Bu kural koda yazılı olmasa unutulur. */
const servisCss = join(KOK, 'src/servis')
if (existsSync(servisCss)) {
  for (const d of dosyalar(servisCss, ['.css'])) {
    if (/^\s*:root\s*\{/m.test(readFileSync(d, 'utf8'))) {
      bildir(`${d.split(/[\\/]/).pop()} içinde :root var — servis paneli backoffice.css'i paylaşmalı`)
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

     dist/         müşterinin telefonuna kurulan APK. Ne personel ne
                   servis kodu girmeli.
     dist-servis/  servisin cihazı. PAKSAN'ın iç ekranları girmemeli. */
const AYRIMLAR = [
  {
    klasor: 'dist/assets',
    ad: 'dist/',
    izler: ['Backoffice', 'panelOturum', 'ServisPanel', 'servisOturum'],
    aciklama: 'personel ve servis kodu',
  },
  {
    klasor: 'dist-servis/assets',
    ad: 'dist-servis/',
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
   özellikler ve güvenlik çizimleri ağır dosyalar (29 Eylül 2026'ya
   kadar 1,7 MB'lık kılavuz paketi de buradaydı). Kapıdan verilselerdi `../marka` yazan her dosya
   onları da paketine çekerdi; servis paneli arıza bilgi tabanını hiç
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

/* ------------------------------------------------ 6. Marka adı sızıntısı

   Sınırı çizmek yetmiyor: Firma adı kodun içine düz yazıyla
   serpilmişse yeni firma onu tek tek aramak zorunda kalır ve biri
   mutlaka gözden kaçar.

   BÜYÜK HARF İLE KÜÇÜK HARF AYRI ŞEYLER

   Bu kontrol yalnızca GÖRÜNEN yazıyı arıyor: `PAKSAN`. Küçük harfli
   `paksan` bir iç anahtar — talebin kimde olduğunu tutan `sahip`
   alanının değeri, `paksan.` depolama öneki, `paksan-ekler` veri
   tabanı adı. Bunlar kullanıcıya hiç görünmüyor ve değiştirilirse
   kurulu cihazlardaki kayıtlar okunamaz hâle gelir. O yüzden
   dokunulmuyorlar; yeni firmada da anlamsız değil, "üretici tarafı"
   demek.

   YORUMLAR MUAF

   Yorumlarda firmanın iş kuralını anlatan gerekçeler var ("bayi
   PAKSAN'dan satın aldığı kadar stok tutar"). Onları silmek bilgi
   kaybı olur; yeni firma okuyup kendi karşılığını görebilir.

   Adın kendisi kimlik dosyasından okunuyor — kontrol, firmaya değil,
   kuralın kendisine bağlı. */

baslik('6. Marka adı sızıntısı')

const { SIRKET: SRK } = await import('../src/marka/kimlik.js')
const AD = SRK.kisaAd

const sizintilar = []
for (const d of dosyalar(join(KOK, 'src'), ['.js', '.jsx'])) {
  if (d.includes(`${SEP}marka${SEP}`)) continue /* markanın kendi klasörü */
  const satirlar = readFileSync(d, 'utf8').split(/\r?\n/)
  let blokta = false
  satirlar.forEach((s, i) => {
    const ac = s.indexOf('/*')
    const kap = s.indexOf('*/')
    const oncekiBlokta = blokta
    if (!blokta && ac >= 0 && kap < ac) blokta = true
    else if (blokta && kap >= 0) blokta = false
    if (oncekiBlokta) return
    const kod = s
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\*.*$/, '')
      .replace(/^\s*\*.*$/, '')
      .replace(/\/\/.*$/, '')
    if (kod.includes(AD)) {
      sizintilar.push(`${d.split(/[\\/]/).pop()}:${i + 1} ${kod.trim()}`)
    }
  })
}

if (!sizintilar.length) {
  tamam(`"${AD}" motor kodunda geçmiyor (yorumlar hariç)`)
} else {
  for (const x of sizintilar) bildir(`marka adı kodda: ${x}`)
}

/* -------------------------------------------------- 7. Bayi kalıntısı

   BAYİ VE SERVİS AYRI TARAFLAR.

     bayi   = makineyi satan firma. Kaydı var; hesabı ve paneli YOK.
     servis = işi yapan taraf. Hesabı ve paneli VAR.

   Panel bir zamanlar bayi için yazılmıştı ve servise devredildi
   (bkz. 08.09.2026 toplantı kararı). Böyle bir devirde asıl tehlike
   yarım kalmasıdır: bir yerde `bayi`, bir yerde `servis` denir ve
   altı ay sonra hangisinin ne demek olduğu kimseye belli olmaz.

   İKİ KURAL

     1. SERVİSİ ANLATAN DOSYADA `bayi` kelimesi hiç geçmez. Servis
        paneli bayiyi tanımıyor; müşteriye servis gösteren ekranlar da
        bayiden söz etmiyor. Servis–bayi bağı backoffice tarafında
        kuruluyor.

     2. Hiçbir depolama anahtarı `bayi` ile başlamaz. Anahtar adı
        veriyi kimin ürettiğini söylüyor ve o taraf artık servis.

   1. KURALIN KAPSAMI DOSYA DOSYA YAZILI, klasör kuralı yetmiyor:

     · `src/servis/`         uygulamanın tamamı
     · `src/lib/servis*.js`  servisin iş mantığı

   Kapsam iki kez genişledi ve ikisinde de aynı sebeple: klasör kuralı
   dışında kalan bir dosyada "bayi" kelimesi sessizce kaldı. Yeni bir
   servis dosyası açılırsa buraya EKLENMELİ.

   TEK İSTİSNA: `src/lib/servisAtama.js`. Adı `servis` ile başlıyor
   ama servis uygulamasının dosyası değil — müşterinin servisini
   bulan köprü, ve o köprünün orta halkası tam olarak bayi:
   makine → bayi → bayinin servisi. Bayiden söz etmeden yazılamaz.

   BACKOFFICE KAPSAM DIŞINDA ve bilerek: orada iki taraf da var,
   "Servisler" ekranı bayi bağını kuruyor, "Bayiler" ekranı bayiyi
   yönetiyor. `bayileriGetir`, `bayiDuzenle` gibi adlar da kural dışı
   değil — onlar gerçekten bayi varlığını yönetiyor.

   `src/marka/katalog/servisler.js` de dışarıda: servis kaydının
   `bayiler` alanı zincirin orta halkası.

   Müşteri uygulamasının geri kalanı da dışarıda: `Register.jsx`
   "makineyi kimden aldınız" diye soruyor ve cevabı bayidir;
   `screens/Bayiler.jsx` zaten bayileri listeliyor. */

baslik('7. Bayi kalıntısı')

const kalintilar = []

/* Kapsam dışı tutulan dosyalar — gerekçesi yukarıda.

   `Bayilerim.jsx` ikinci istisna ve sebebi ilkiyle aynı: orada da
   gerçekten BAYİ VARLIĞINDAN söz ediliyor. Servisin hangi bayilerle
   çalıştığını PAKSAN backoffice'ten belirliyor (Servisler ekranı →
   `bayiler` alanı) ve servis kendi uygulamasında bunu göremiyordu.
   Ekran bayiyi servisin kendisi gibi değil, AYRI BİR TARAF olarak
   gösteriyor; kuralın koruduğu kimlik karışması burada doğmuyor.

   `servisFormu.js` üçüncü istisna (22 Eylül 2026), sebebi yine aynı:
   PAKSAN'ın basılı servis formunda "Bayi adı" kutusu var ve form
   makineyi satan bayiyi AYRI BİR TARAF olarak yazıyor — servisin
   kendisi değil.

   İstisna DOSYA ADINA yazılı, klasöre değil: `src/servis/` içinde
   yazılacak yeni bir dosya yine kurala giriyor. */
const BAYI_GECEBILIR = new Set(['servisAtama.js', 'Bayilerim.jsx', 'servisFormu.js'])

/* O dosyanın ADI da öteki dosyalarda geçiyor: `ServisPanel.jsx` onu
   içe aktarıyor ve bir satır çiziyor. Bileşen adını uydurma bir
   eşanlamlıya çevirmek ("SatisNoktalari" gibi) kuralı değil, yalnız
   denetimi kandırırdı — ve kuralın asıl derdi zaten adların
   belirsizleşmesi. Bu yüzden tam olarak bu ad serbest bırakılıyor;
   satırda BAŞKA bir `bayi` geçerse yine yakalanıyor. */
const BAYI_SERBEST = /Bayilerim/g

/* 1. kural — servisi anlatan dosyalarda bayi geçmiyor */
const SERVIS_TARAFI = [
  join(KOK, 'src', 'servis'),
  ...dosyalar(join(KOK, 'src', 'lib'), ['.js']).filter(
    (d) =>
      /[\\/]servis[A-Za-z]*\.js$/.test(d) &&
      !BAYI_GECEBILIR.has(d.split(/[\\/]/).pop()),
  ),
]

for (const yol of SERVIS_TARAFI) {
  if (!existsSync(yol)) continue
  const liste = (
    yol.endsWith('.js') || yol.endsWith('.jsx') ? [yol] : dosyalar(yol, ['.js', '.jsx', '.css'])
  ).filter((d) => !BAYI_GECEBILIR.has(d.split(/[\\/]/).pop()))
  for (const d of liste) {
    readFileSync(d, 'utf8')
      .split(/\r?\n/)
      .forEach((s, i) => {
        if (/bayi/i.test(s.replace(BAYI_SERBEST, ''))) {
          kalintilar.push(`${d.split(/[\\/]/).pop()}:${i + 1} ${s.trim().slice(0, 90)}`)
        }
      })
  }
}

/* 2. kural — depolama anahtarı bayi ile başlamıyor */
const ANAHTAR_KALIP = /(load|save|sil)\(\s*'(bayi[A-Za-z]*)'/g
for (const d of dosyalar(join(KOK, 'src'), ['.js', '.jsx'])) {
  for (const e of readFileSync(d, 'utf8').matchAll(ANAHTAR_KALIP)) {
    kalintilar.push(`${d.split(/[\\/]/).pop()} depolama anahtarı: '${e[2]}'`)
  }
}

if (!kalintilar.length) {
  tamam('servis uygulamasında bayi kalıntısı yok')
} else {
  for (const x of kalintilar) bildir(`bayi kalıntısı: ${x}`)
}

/* ------------------------------------------------------ 8. Sınamalar

   Betikler ayrı ayrı çalıştırılıyordu ve unutuluyorlardı. Şimdi
   `npm run dogrula` hepsini çağırıyor; biri düşerse bütün doğrulama
   düşüyor. Kural tek cümle: BİR SINAMA ÇAĞRILMIYORSA YOKTUR.

   Ayrı süreçte çalıştırılıyorlar: her biri kendi başına da
   çalıştırılabilsin ve biri çökerse ötekiler etkilenmesin.

   Son üçü ötekilerden farklı. Dördü metin okuyor; `ekosistem-sinamasi`
   ve `veritabani-eslesme-denetimi` üç uygulamanın paylaştığı veri
   katmanını gerçekten ÇALIŞTIRIYOR ve bu yüzden daha yavaş (Vite ile
   modülleri yüklüyor, ~10 sn her biri). Yavaşlığın karşılığı: bir
   uygulamanın ötekinin okuyamayacağı bir kayıt yazdığını, ya da
   veritabanında karşılığı olmayan bir alan yazdığını başka hiçbir
   kontrol göremiyor. */

baslik('8. Sınamalar')

const { spawnSync } = await import('node:child_process')

const SINAMALAR = [
  ['marka-ek-testi.mjs', 'marka adının Türkçe ekleri'],
  ['bolge-testi.mjs', 'servis bölge eşleştirmesi'],
  ['duyuru-hedef-testi.mjs', 'duyuru hedeflemesi'],
  /* Destek veri paketini denetliyor: dokununca boş açılan arıza,
     güvenlik uyarısı olmayan model, kaynaksız cümle. Listeye 12 Eylül
     2026'da girdi — dosya taşınınca kırılmış, çağıran komut olmadığı
     için haftalarca kırık kalmıştı. 29 Eylül 2026'dan beri hiçbir ekran
     paketi okumuyor (kılavuz PDF oldu); paket dururken denetleniyor,
     çünkü veritabanı tohumu (Marka satırı) ve kapalı duran asistanın
     veri seti onu kullanıyor. */
  ['destek-dogrula.mjs', 'destek veri paketi'],
  /* Ötekilerden farklı: bu metin okumuyor, üç uygulamanın PAYLAŞTIĞI
     veri katmanını gerçekten çalıştırıyor. Talep açılıyor, servise
     düşüyor, servis kaydı gidiyor, hak ediş doğuyor, cariye alacak
     yazılıyor. Bir uygulamanın ötekinin okuyamayacağı bir kayıt
     yazdığını ancak zinciri yürüten görür. Ayrıntısı betiğin başında;
     her senaryonun taşıdığı, bilerek bozularak gösterildi. */
  ['ekosistem-sinamasi.mjs', 'ekosistem akışları'],
  /* Uygulama ile veritabanı arasındaki kayma. Uygulama veritabanına
     henüz bağlı değil; yeni bir alan, karşılığı olmasa da hata
     vermiyordu. Aynı senaryoları koşturup depoya düşen her alanı
     veritabani/uygulama-eslesmesi.mjs ile karşılaştırıyor; eşlemesiz
     alan, betiklerde olmayan sütun ya da eşlemesiz veri.js işlevi
     burayı düşürür. Ayrıntısı betiğin başında. */
  ['veritabani-eslesme-denetimi.mjs', 'uygulama–veritabanı eşlemesi'],
  /* Yeni fiyat listesi backoffice'ten PDF olarak yükleniyor (21 Eylül
     2026). Okuyucu aynı PDF'ten bugünkü katalogla birebir aynı sonucu
     vermeli; sunucunun yayına alma adımı bozuk listeyi reddetmeli ve
     eski listeyi arşive taşımalı. PDF bulunamazsa okuma kısmı
     "atlandı" der, yayına alma kısmı yine koşar. */
  ['fiyat-listesi-okuma-sinamasi.mjs', 'fiyat listesi okuma ve yayına alma'],
  /* Kullanım kılavuzları sunucudaki klasörde PDF (29 Eylül 2026).
     Kılavuzu olan her ürünün kodu klasörün listesinde, listedeki her
     dosya gerçekten PDF, boyutu ve sayfa sayısı listedekiyle aynı, arıza
     tablosunun sayfası kılavuzun içinde. Liste yanlışsa çiftçi yanlış
     boyutu görür ya da kılavuz hiç açılmaz. */
  ['kilavuz-dosyalari-denetimi.mjs', 'kullanım kılavuzu dosyaları'],
  /* Ekran tarafı. Geliştirme sunucusu ya da Chrome yoksa kendini
     `atlandı` deyip 0 ile bitiriyor — bu yüzden etiketi "sunucu varsa"
     diyor: burada "ok" görmek her zaman turun koştuğu anlamına gelmez.
     Koştuğundan emin olmak için doğrudan çalıştırın:
     node tools/ekosistem-turu.mjs */
  ['ekosistem-turu.mjs', 'ekosistem ekran turu (sunucu varsa)'],
]

for (const [dosya, ad] of SINAMALAR) {
  const yol = join(KOK, 'tools', dosya)
  if (!existsSync(yol)) {
    bildir(`${ad}: ${dosya} bulunamadı`)
    continue
  }
  const sonuc = spawnSync(process.execPath, [yol], { encoding: 'utf8' })
  if (sonuc.status === 0) {
    tamam(ad)
  } else {
    /* Betiğin kendi çıktısı gösteriliyor: hangi durumun düştüğü
       orada yazıyor, burada tekrarlamanın anlamı yok. */
    bildir(`${ad} DÜŞTÜ (${dosya})`)
    const cikti = ((sonuc.stdout || '') + (sonuc.stderr || '')).trim()
    for (const s of cikti.split(/\r?\n/).slice(-12)) console.log('      ' + s)
  }
}

/* ------------------------------------------------ 9. Yedek parça verisi

   Uygulamada bir dönem UYDURMA bir yedek parça fiyat listesi vardı
   (`src/marka/katalog/parcaFiyat.js`, 30 kayıt, `PKS-` ile başlayan
   kodlar) ve müşteriye o uydurma tutar havale ettirilmek üzereydi.
   12 Eylül 2026'da tamamen kaldırıldı; fiyatın tek kaynağı artık
   PAKSAN'ın kendi yedek parça kataloğu.

   Bu kontrol üç şeyi birden koruyor:

   - Uydurma veri geri gelemez. Kodda `PKS-` kodu ya da silinen
     fonksiyonlardan biri görünürse doğrulama düşüyor.
   - Katalog kendi içinde tutarlı kalır. Alanı eksik parça, mükerrer
     kod, karşılığı olmayan grup ya da görselsiz parça ekranda sessiz
     bir tire olarak görünür; müşteriye eksik tutar söyletir.
   - Makine köprüsü eksiksiz kalır. Yeni bir fiyat listesi yeni bir grup
     getirir ve köprüye yazılmazsa o grubun parçaları müşteri ekranından
     SESSİZCE kaybolur. Sessiz kayıp, görünür hatadan tehlikelidir. */

baslik('9. Yedek parça verisi')

const UYDURMA_IZLERI = [
  ['PKS-', 'uydurma parça kodu'],
  ['PARCA_FIYAT', 'silinen uydurma fiyat tablosu'],
  ['parcaFiyatBilgisi', 'silinen ada göre fiyat araması'],
  ['fiyatliMi', 'silinen fiyat kontrolü'],
  ['FIYATSIZ', 'silinen fiyatsız liste'],
  ['katalog/parcaFiyat', 'silinen dosyaya atıf'],
]

const uydurmaBulgular = []
for (const dosya of kaynaklar) {
  const metin = readFileSync(dosya, 'utf8')
  for (const [iz, ne] of UYDURMA_IZLERI) {
    if (metin.includes(iz)) {
      uydurmaBulgular.push(`${dosya.replace(KOK + SEP, '')} → ${ne} (${iz})`)
    }
  }
}
if (uydurmaBulgular.length) {
  bildir('kodda uydurma parça verisi izi var:')
  for (const b of uydurmaBulgular) console.log('      ' + b)
} else {
  tamam('kodda uydurma parça verisi izi yok')
}

/* Kataloğu tek kapı okuyor mu? İkinci kapı açılırsa doğrulama, bellek
   ve hata yüzeyi ikiye ayrılır.

   Yorumlar ayıklanıyor: `src/config.js` ve marka dosyaları katalog
   dosyasının adını gerekçe anlatırken anıyor, onları kapı saymak
   yanlış alarm olur. */
function yorumsuz(metin) {
  return metin.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

const KATALOG_KAPISI = join('src', 'lib', 'parcaKatalogu.js')
const izinsizKapi = kaynaklar
  .filter((d) => yorumsuz(readFileSync(d, 'utf8')).includes('katalog.json'))
  .map((d) => d.replace(KOK + SEP, ''))
  .filter((d) => d !== KATALOG_KAPISI)
if (izinsizKapi.length) {
  bildir('katalog.json tek kapı dışından okunuyor: ' + izinsizKapi.join(', '))
} else {
  tamam('katalog yalnız parcaKatalogu.js üzerinden okunuyor')
}

const KATALOG_YOLU = join(KOK, 'sunucu-taklidi', 'parca-katalogu', 'katalog.json')
const GORSEL_KLASORU = join(KOK, 'sunucu-taklidi', 'parca-katalogu', 'gorseller')

if (!existsSync(KATALOG_YOLU)) {
  bildir('katalog dosyası bulunamadı: sunucu-taklidi/parca-katalogu/katalog.json')
} else {
  const katalog = JSON.parse(readFileSync(KATALOG_YOLU, 'utf8'))
  const parcalar = katalog.parcalar || []
  const gruplar = katalog.gruplar || []
  const grupKimlikleri = new Set(gruplar.map((g) => g.id))

  const eksikAlan = parcalar.filter(
    (p) =>
      !p || typeof p.kod !== 'string' || !p.kod ||
      typeof p.ad !== 'string' || !p.ad ||
      typeof p.grup !== 'string' || !p.grup ||
      typeof p.fiyat !== 'number' || !Number.isFinite(p.fiyat) ||
      typeof p.gorsel !== 'string' || !p.gorsel,
  )
  const kodlar = parcalar.map((p) => p && p.kod)
  const mukerrer = [...new Set(kodlar.filter((k, i) => kodlar.indexOf(k) !== i))]
  const yetimGrup = parcalar
    .filter((p) => p && p.grup && !grupKimlikleri.has(p.grup))
    .map((p) => `${p.kod} → ${p.grup}`)
  const adetYanlis = gruplar.filter(
    (g) => g.adet !== parcalar.filter((p) => p && p.grup === g.id).length,
  )

  if (eksikAlan.length) {
    bildir(`katalogda alanı eksik ${eksikAlan.length} parça var`)
  } else if (mukerrer.length) {
    bildir('katalogda mükerrer parça kodu: ' + mukerrer.join(', '))
  } else if (yetimGrup.length) {
    bildir('karşılığı olmayan gruba bağlı parça: ' + yetimGrup.slice(0, 5).join(', '))
  } else if (adetYanlis.length) {
    bildir('grup sayaçları gerçek sayımla tutmuyor: ' + adetYanlis.map((g) => g.id).join(', '))
  } else {
    tamam(`katalog tutarlı — ${gruplar.length} grupta ${parcalar.length} parça`)
  }

  if (!existsSync(GORSEL_KLASORU)) {
    bildir('görsel klasörü bulunamadı: sunucu-taklidi/parca-katalogu/gorseller')
  } else {
    const diskte = new Set(readdirSync(GORSEL_KLASORU))
    const gorselsiz = parcalar.filter((p) => p && p.gorsel && !diskte.has(p.gorsel))
    const yetimGorsel = [...diskte].filter(
      (d) => d.endsWith('.webp') && !parcalar.some((p) => p && p.gorsel === d),
    )
    if (gorselsiz.length) {
      bildir(`görseli eksik ${gorselsiz.length} parça`)
    } else if (yetimGorsel.length) {
      bildir(`parçası olmayan ${yetimGorsel.length} görsel`)
    } else {
      tamam(`görseller birebir — ${parcalar.length} parça, ${parcalar.length} görsel`)
    }
  }

  const { eslenmemisGruplar, artikOlmayanGruplar } = await import(
    '../src/marka/katalog/parcaGruplari.js'
  )
  const eslenmemis = eslenmemisGruplar(gruplar)
  const olmayan = artikOlmayanGruplar(gruplar)
  if (eslenmemis.length) {
    bildir('köprüde eşlenmemiş grup, parçaları müşteri ekranında görünmez: ' + eslenmemis.join(', '))
  } else if (olmayan.length) {
    bildir('köprüde artık var olmayan grup: ' + olmayan.join(', '))
  } else {
    tamam('her parça grubu bir makine ailesine eşlenmiş')
  }

  /* DESTEK'İN PARÇA ADI → KATALOG KODU (29 Eylül 2026). "Bu Parçaları
     Talep Et" adları talep formunda bu tabloyla koda çevriliyor
     (src/marka/icerik/destekVerisi.js → PARCA_KODU). Yeni fiyat listesi
     bir kodu kaldırırsa ya da parça başka gruba taşınırsa form sessizce
     seçmez olurdu; yanlış aileye yazılan kod çiftçiye başka makinenin
     parçasını seçerdi. Ürünün ailesi products.js → supportGroup ile aynı
     kuralla (kategori → aile) okunuyor; o dosya bir video içe aktardığı
     için burada doğrudan yüklenemiyor.
     Bozarak sınandı (29 Eylül 2026): katalogda olmayan kod, başka
     aileden ürün, Destek'te geçmeyen ad — üçünde de düştü. */
  const { PARCA_KODU, DESTEK } = await import('../src/marka/icerik/destekVerisi.js')
  const { PARCA_GRUBU_AILESI } = await import('../src/marka/katalog/parcaGruplari.js')
  const AILE_KATEGORILERI = {
    balya: ['kucuk-balya', 'buyuk-balya'],
    rulo: ['rulo-balya'],
    yem: ['yem-karma'],
    silaj: ['silaj'],
    cayir: ['cayir-ot'],
    toprak: ['toprak'],
  }
  const urunKaynagi = readFileSync(join(KOK, 'src/marka/katalog/products.js'), 'utf8')
  const urunKategorisi = (id) =>
    urunKaynagi.match(new RegExp(`id: '${id}',\\s*\\n\\s*name: '[^']*',\\s*\\n\\s*category: '([^']+)'`))?.[1] || null
  const parcaSorunu = []
  for (const [aile, tablo] of Object.entries(PARCA_KODU)) {
    const adlar = new Set(
      (DESTEK[aile]?.bolumler || []).flatMap((b) => b.belirtiler || []).flatMap((x) => x.parcalar || []),
    )
    for (const [ad, { kod, urunler }] of Object.entries(tablo)) {
      const parca = parcalar.find((p) => p && p.kod === kod)
      if (!adlar.has(ad)) parcaSorunu.push(`${aile}/${ad}: Destek'te bu ad yok`)
      if (!parca) parcaSorunu.push(`${aile}/${ad}: ${kod} katalogda yok`)
      else if (PARCA_GRUBU_AILESI[parca.grup] !== aile) parcaSorunu.push(`${aile}/${ad}: ${kod} başka ailenin parçası (${parca.grup})`)
      for (const u of urunler || []) {
        const kategori = urunKategorisi(u)
        if (!kategori) parcaSorunu.push(`${aile}/${ad}: ${u} diye ürün yok`)
        else if (!(AILE_KATEGORILERI[aile] || []).includes(kategori)) parcaSorunu.push(`${aile}/${ad}: ${u} bu ailede değil`)
      }
    }
  }
  const eslesenAd = Object.values(PARCA_KODU).reduce((n, t) => n + Object.keys(t).length, 0)
  if (parcaSorunu.length) bildir('Destek parça adı → kod tablosu: ' + parcaSorunu.join('; '))
  else tamam(`Destek'in ${eslesenAd} parça adı katalogdaki koduyla eşli`)
}

/* ------------------------------------------------- 10. Sürüm numarası

   PAKSAN Connect'in sürümü ÜÇ YERDE birden yazılı: `src/marka/kimlik.js`
   içindeki `SURUM` (uygulamanın ekranında görünen), `package.json`
   içindeki `version` ve `android/app/build.gradle` içindeki
   `versionName`. Üçü elle artırılıyor; bugüne kadar tutmalarını sağlayan
   tek şey dikkat oldu, ne kanca var ne CI.

   Tutmazlarsa ne olur: telefondaki sürüm bir şey, mağazadaki başka bir
   şey söyler; bir hatanın hangi derlemede olduğu bulunamaz. APK dosya
   adı da `SURUM`'dan geliyor, yani var olan bir dosyanın üstüne yazma
   riski de buradan doğuyor.

   PAKSAN Servisim'in hattı AYRI ve bilerek ayrı (0.1.0 / versionCode 1,
   10 Eylül 2026). Bu kontrol onun FARKLI olmasından şikâyet etmez;
   tersine, ikisi birden (hem `versionName` hem `versionCode`) eşitlenirse
   Servisim'in numarası Connect'e bitişmiş demektir ve bunu söyler.

   `versionCode` tam sayı olmalı: Gradle metin kabul etmiyor ve derleme
   anında düşüyor. Burada düşmesi, Android Studio'da düşmesinden ucuz. */

baslik('10. Sürüm numarası')

const { SURUM } = await import('../src/marka/kimlik.js')
const paketJson = JSON.parse(readFileSync(join(KOK, 'package.json'), 'utf8'))

/** build.gradle'daki sürüm alanlarını okur. */
function gradleSurum(yol) {
  if (!existsSync(yol)) return null
  const metin = readFileSync(yol, 'utf8')
  const ad = metin.match(/versionName\s+"([^"]+)"/)
  const kod = metin.match(/versionCode\s+([^\s/]+)/)
  return { ad: ad && ad[1], kod: kod && kod[1] }
}

const connect = gradleSurum(join(KOK, 'android', 'app', 'build.gradle'))

if (!connect) {
  bildir('android/app/build.gradle bulunamadı, Connect sürümü karşılaştırılamadı')
} else if (SURUM === paketJson.version && paketJson.version === connect.ad) {
  tamam(`Connect sürümü üç yerde de ${SURUM} (versionCode ${connect.kod})`)
} else {
  bildir('Connect sürümü üç yerde aynı değil:')
  console.log(`      src/marka/kimlik.js SURUM   ${SURUM}`)
  console.log(`      package.json version        ${paketJson.version}`)
  console.log(`      android versionName         ${connect && connect.ad}`)
}

if (connect && !/^\d+$/.test(String(connect.kod))) {
  bildir(`Connect versionCode tam sayı değil: ${connect.kod}`)
}

/* Servisim kendi hattında. Klasör ilk servis derlemesinde oluşuyor;
   yoksa bu adım atlanıyor, eksiklik değil. */
const servisim = gradleSurum(join(KOK, 'android-servis', 'app', 'build.gradle'))

if (!servisim) {
  tamam('android-servis henüz üretilmemiş, Servisim hattı atlandı')
} else if (!/^\d+$/.test(String(servisim.kod))) {
  bildir(`Servisim versionCode tam sayı değil: ${servisim.kod}`)
} else if (connect && servisim.ad === connect.ad && servisim.kod === connect.kod) {
  bildir(
    `Servisim sürümü Connect'e bitişmiş (${servisim.ad} / versionCode ${servisim.kod}); ` +
      'Servisim kendi hattında artıyor',
  )
} else {
  tamam(`Servisim kendi hattında: ${servisim.ad} (versionCode ${servisim.kod})`)
}

/* --------------------------------------------- 11. Yayın anahtarları

   Altı ayar bugün BİLEREK geliştirme değerinde, yayına çıkarken mutlaka
   değişecek:

     · `AI.kok`, `PARCA_KATALOG.kok` ve `KILAVUZ.kok` (29 Eylül 2026)
       göreli adres. Telefonda uygulamanın kendi kökü sunucu değil; APK'da
       göreli adres çözülmüyor, destek ekranı, parça listesi ve kılavuzlar
       boş açılıyor. Gerekçe `src/config.js` içindeki kendi yorumlarında
       yazılı.
     · `PARCA_KATALOG.taklitGecikme`, sunucu hızını taklit eden 800 ms.
       Gerçek sunucu bağlanınca bu gecikme yalan olur.
     · `servis.html` kök etiketindeki `data-demo="acik"`: demo verisi
       kuruluyor — uydurma müşteriler ve çalışan bir demo hesabı dahil.
     · `index.html` (Connect) kök etiketindeki `data-demo="acik"`: Makine
       Kaydet ekranında örnek seri numaraları ("DENEME" kutusu) görünüyor
       (25 Eylül 2026, kullanıcı sınaması O10; bkz. src/lib/demoSurumu.js).

   NİYE SORUN SAYMIYOR

   Bunlar bugün DOĞRU durumda: sunucu yok, demo hesabı olmadan servis
   uygulamasına girilemiyor, gerçek plaka olmadan Connect'e makine
   kaydedilemiyor. Günlük `npm run dogrula` bunlar yüzünden
   kırmızı dönerse kırmızı dönmek normalleşir, asıl sorunlar o gürültünün
   içinde kaybolur ve kontrolün kendisi işe yaramaz hale gelir. Bu yüzden
   burada yalnız RAPOR ediliyor; sayaç artmıyor.

   Yayın derlemesinde sayması için açık bir işaret gerekiyor:

       npm run dogrula -- --yayin          (ya da PAKSAN_YAYIN=1)

   O kipte aynı satırlar sorun sayılıyor ve çıkış kodu 1 oluyor. Karar
   şöyle okunmalı: listeyi her gün görüyorsun, yalnız yayın günü seni
   durduruyor. */

baslik('11. Yayın anahtarları')

const YAYIN_KIPI = process.argv.includes('--yayin') || process.env.PAKSAN_YAYIN === '1'

const { AI, PARCA_KATALOG, KILAVUZ } = await import('../src/config.js')

const goreliAdres = (adres) => !/^https?:\/\//i.test(String(adres || ''))

const engeller = []
if (goreliAdres(AI.kok)) engeller.push(`src/config.js → AI.kok göreli: '${AI.kok}'`)
if (goreliAdres(PARCA_KATALOG.kok)) {
  engeller.push(`src/config.js → PARCA_KATALOG.kok göreli: '${PARCA_KATALOG.kok}'`)
}
if (goreliAdres(KILAVUZ.kok)) engeller.push(`src/config.js → KILAVUZ.kok göreli: '${KILAVUZ.kok}'`)
if (PARCA_KATALOG.taklitGecikme !== 0) {
  engeller.push(`src/config.js → taklitGecikme ${PARCA_KATALOG.taklitGecikme} ms (0 olmalı)`)
}

/* Yalnız kök etikete bakılıyor: dosyanın başındaki yorum işaretin ne
   olduğunu anlatırken aynı metni yazıyor, onu bulgu saymak yanlış
   alarm olurdu. */
const SERVIS_HTML = join(KOK, 'servis.html')
if (existsSync(SERVIS_HTML)) {
  const kok = /<html[^>]*\sdata-demo=["']acik["']/.test(readFileSync(SERVIS_HTML, 'utf8'))
  if (kok) engeller.push('servis.html → kök etikette data-demo="acik" (demo verisi kuruluyor)')
}
/* Connect'in işareti aynı biçimde (25 Eylül 2026): Makine Kaydet'teki
   örnek seri kutusu yalnız bu işaretle çiziliyor. */
const CONNECT_HTML = join(KOK, 'index.html')
if (existsSync(CONNECT_HTML)) {
  const kok = /<html[^>]*\sdata-demo=["']acik["']/.test(readFileSync(CONNECT_HTML, 'utf8'))
  if (kok) engeller.push('index.html → kök etikette data-demo="acik" (Connect Makine Kaydet ekranında örnek seri numaraları görünüyor)')
}

if (!engeller.length) {
  tamam('yayına çıkışı engelleyen geliştirme ayarı yok')
} else if (YAYIN_KIPI) {
  for (const e of engeller) bildir(e)
} else {
  console.log(`  - ${engeller.length} geliştirme ayarı açık (bugün böyle olması doğru):`)
  for (const e of engeller) console.log('      ' + e)
  console.log('    yayın derlemesinde saydırmak için: npm run dogrula -- --yayin')
}

/* ------------------------------------------------- 12. Yazılmamış metin

   Bu projede ekranda görünen her Türkçe kelime Codex'ten geçiyor
   (bkz. CLAUDE.md). Yeni bir ekran yazılırken metin hemen yazılmıyor:
   yerine göze batan bir işaret bırakılıyor ve işaretler toplu hâlde
   Codex'e veriliyor.

   NEDEN KONTROL GEREKİYOR. 12 Eylül 2026'da yedi parti düzeltme aynı
   anda çalıştı ve geride 15 yazılmamış dizgi bıraktı: hata ekranının
   başlığı, iki panelin okuma hatası satırı, garanti gerekçesi. Hiçbiri
   yakalanmadı, çünkü o güne kadar bu kontrol yoktu — doğrulama on bir
   kez "temiz" deyip yer tutucuların üç uygulamaya da girmesine izin
   verecekti. Yer tutucunun göze batması, onu gören bir göz olduğu
   sürece işe yarıyor.

   İŞARETİN BİÇİMİ SABİT DEĞİL. Her parti kendi kalıbını uydurdu
   (`TODO_CODEX_`, `TODO-TR`, `[[CODEX: …]]`, `[TR-METİN BEKLENİYOR: …]`,
   `[[ metin bekleniyor: … ]]`). Hepsi burada listeli; yeni bir kalıp
   uyduran parti onu bu listeye de yazmak zorunda.

   Yorumlar ayıklanıyor: yer tutucunun ne olduğunu anlatan gerekçe
   yorumları dosyalarda kalıyor ve onları bulgu saymak yanlış alarm
   olur. Aranan şey KODDAKİ dizgi. */

baslik('12. Yazılmamış metin')

const YER_TUTUCU_KALIPLARI = [
  [/TODO_CODEX/g, 'Codex bekleyen yer tutucu'],
  [/TODO-(?:TR|EN)/g, 'yazılmamış tr/en metni'],
  [/\[\[\s*CODEX\s*:/g, 'Codex işareti'],
  [/\[\[\s*TR\s*:/g, 'Türkçe metin işareti'],
  [/\[\s*TR-MET[İI]N BEKLEN[İI]YOR/g, 'Türkçe metin bekleniyor'],
  [/\[\[\s*metin bekleniyor/gi, 'metin bekleniyor'],
  /* Raporlar ekranı (17 Eylül 2026): metin nesnesi okunur taslakla
     duruyor, işareti sarmalayıcı (bkz. backoffice/ekranlar/rapor/metin.js). */
  [/\bcodexBekliyor\s*\(/g, 'Codex bekleyen taslak metin'],
]

const yazilmamis = []
for (const dosya of kaynaklar) {
  const govde = yorumsuz(readFileSync(dosya, 'utf8'))
  const satirlar = govde.split('\n')
  for (let i = 0; i < satirlar.length; i++) {
    for (const [kalip, ne] of YER_TUTUCU_KALIPLARI) {
      kalip.lastIndex = 0
      if (kalip.test(satirlar[i])) {
        yazilmamis.push(`${dosya.replace(KOK + SEP, '')}:${i + 1} → ${ne}`)
        break
      }
    }
  }
}

/* CODEX-BEKLEYEN.md (17 Eylül 2026, kullanıcının kararı): Codex sınırı
   doluyken yazılan taslaklar orada listeleniyor. Connect sözlüğündeki
   taslak anahtarlar ve tek dilli ekranların taslak metinli dosyaları
   dosya içinde işaretsiz duruyor (ekran okunur kalsın diye); ağ bu
   listeden kuruluyor. Liste boşalınca bu kontrol de susuyor. */
const BEKLEYEN = join(KOK, 'CODEX-BEKLEYEN.md')
if (existsSync(BEKLEYEN)) {
  const liste = readFileSync(BEKLEYEN, 'utf8')
  const blok = (ad) => {
    const m = liste.match(new RegExp(`<!-- ${ad} -->([\\s\\S]*?)<!-- /${ad} -->`))
    return m ? [...m[1].matchAll(/^- `([^`]+)`/gm)].map((x) => x[1]) : []
  }
  for (const anahtar of blok('anahtarlar:connect')) {
    yazilmamis.push(`src${SEP}i18n${SEP}tr.js → ${anahtar} → Codex bekleyen taslak (CODEX-BEKLEYEN.md)`)
  }
  for (const dosya of blok('dosyalar:tekdil')) {
    yazilmamis.push(`${dosya} → Codex bekleyen taslak (CODEX-BEKLEYEN.md)`)
  }
}

if (yazilmamis.length) {
  bildir(`ekrana çıkacak ${yazilmamis.length} yazılmamış metin var:`)
  for (const y of yazilmamis) console.log('      ' + y)
} else {
  tamam('yer tutucu metin kalmadı')
}

/* ------------------------------------------------ 13. Veritabanı betikleri

   Planın "Doğrulama → Eşleşme denetimi (npm run dogrula)" maddesi üç şey
   istiyor ve üçü de buradan koşar:

     a) statik SQL denetimi (yasak özellikler) — tools/vt/denetle.mjs
     b) tohumlar güncel — üretilmiş T/B/O betikleri tohum/kaynak/*.json ile
        aynı mı
     c) ortam dosyası git'te yok — bağlantı şifreleri depoya girmemeli

   Üçü de yazılıydı ama hiçbiri bu komuttan çağrılmıyordu: (a) yalnız elle
   ya da `vt sinama` içinden, (b) yalnız elle `vt tohum --denetle`, (c) hiç.
   Bir sınama çağrılmıyorsa yoktur (8. kontrolün başlığındaki gerekçe).

   (b) ile `vt sinama` KR-04'ü aynı şey değildir: KR-04 betiklerin ikinci
   kez çalıştırılınca satır değiştirmediğini ölçer, yani VERİTABANI ile
   BETİK'i karşılaştırır. Burada BETİK ile KAYNAK JSON karşılaştırılır:
   kaynağı düzeltip betiği yeniden üretmeyi unutmak KR-04'ten sessizce
   geçerdi.

   Veritabanı klasörü yoksa (marka devri, yalnız uygulama kopyası) kontrol
   atlanır. */

baslik('13. Veritabanı betikleri')

const VT_KLASOR = join(KOK, 'veritabani')
if (!existsSync(VT_KLASOR)) {
  tamam('veritabani klasörü yok, atlandı')
} else {
  /* a) Statik SQL denetimi */
  const { statikDenetim, yerTutucuUyarilari } = await import('./vt/denetle.mjs')
  const sqlSorunlari = statikDenetim()
  if (sqlSorunlari.length) {
    bildir(`SQL betiklerinde ${sqlSorunlari.length} sorun var:`)
    for (const s of sqlSorunlari.slice(0, 40)) console.log('      ' + s)
    if (sqlSorunlari.length > 40) console.log(`      … ve ${sqlSorunlari.length - 40} tane daha`)
  } else {
    tamam('SQL betikleri kurallara uyuyor')
  }
  /* Yer tutucular 12. kontrolün konusu; burada yalnız sayısı yazılır. */
  const sqlYerTutucu = yerTutucuUyarilari()
  if (sqlYerTutucu.length) console.log(`      (SQL betiklerinde Codex bekleyen ${sqlYerTutucu.length} metin)`)

  /* b) Tohum betikleri kaynakla tutuyor mu (hiçbir dosyaya yazmaz).
        Yer tutucu sayısı burada SORUN DEĞİL: bugün bilerek var, 12.
        kontrolün konusu. Sorun sayılan yalnız "kaynak ile betik ayrışmış". */
  const { tohumDurumu } = await import('./vt/tohum-uret.mjs')
  const tohum = await tohumDurumu()
  if (tohum.hata) {
    bildir(`tohum üretilemedi: ${tohum.hata}`)
  } else if (tohum.farkli.length || tohum.fazla.length) {
    if (tohum.farkli.length) {
      bildir(`${tohum.farkli.length} tohum betiği kaynakla tutmuyor (npm run vt -- tohum):`)
      for (const a of tohum.farkli) console.log('      ' + a)
    }
    if (tohum.fazla.length) {
      bildir(`üreticinin yazmadığı tohum betiği var: ${tohum.fazla.join(', ')}`)
    }
  } else {
    tamam(`tohum betikleri kaynakla aynı (${tohum.dosyalar.size} dosya)`)
  }

  /* c) Ortam dosyası git'te olmamalı: içinde sunucu girişlerinin şifreleri
        var. ornek.env bilerek izlenir (şifresiz şablon). Git yoksa ya da
        burası bir depo değilse kontrol atlanır — sorun sayılmaz. */
  const gitSonuc = spawnSync('git', ['ls-files', '--', 'veritabani/ortam'], {
    cwd: KOK,
    encoding: 'utf8',
  })
  if (gitSonuc.error || gitSonuc.status !== 0) {
    tamam('ortam dosyası: git sorgulanamadı, atlandı')
  } else {
    const izlenen = gitSonuc.stdout
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((x) => x !== 'veritabani/ortam/ornek.env')
    if (izlenen.length) {
      bildir(`ortam dosyası git'te izleniyor (şifre içerir): ${izlenen.join(', ')}`)
    } else {
      tamam("ortam dosyaları git'e girmiyor (yalnız ornek.env izleniyor)")
    }
  }
}

/* ------------------------------------------------------------- Sonuç */

console.log('')
if (sorun) {
  console.log(`SONUÇ: ${sorun} sorun bulundu.`)
  process.exit(1)
}
console.log(
  YAYIN_KIPI ? 'SONUÇ: on üç kontrol de temiz, yayına hazır.' : 'SONUÇ: on üç kontrol de temiz.',
)
