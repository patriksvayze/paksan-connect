/* ==========================================================================
   Veritabanı eşleme denetimi — uygulama ile veritabanı arasındaki kayma

       node tools/veritabani-eslesme-denetimi.mjs [--envanter]

   `npm run dogrula` bunu 8. kontrolden çağırıyor.

   SORDUĞU SORU: uygulamaların bugün depoya yazdığı her alanın
   veritabanında bir karşılığı var mı — ya da yokluğu bilerek mi?

   Uygulama henüz veritabanına bağlı değil. Bu yüzden uygulamaya eklenen
   bir alan, veritabanında karşılığı olmasa da hiçbir hata vermiyor; kayma
   sessizce birikiyor ve sunucu yazılırken hepsi birden ortaya çıkardı.
   Bu denetim kaymayı yazıldığı gün kırmızı yapar.

   NASIL: ekosistem sınamasının bütün senaryolarını (tools/ekosistem/)
   uygulamanın GERÇEK koduyla koşturur, her senaryodan sonra depoya düşen
   her alanın yolunu toplar (`requests[].servis.id` gibi) ve
   veritabani/uygulama-eslesmesi.mjs ile karşılaştırır. Sütun adlarını
   veritabani/semalar betiklerinden okur (tools/vt/denetle.mjs →
   tablolarVeSutunlar); SQL Server'a bağlanmaz.

   DÜŞÜREN BEŞ DURUM
     YENİ ANAHTAR       uygulama eşlemede olmayan bir depo anahtarına yazıyor
     YENİ ALAN          uygulama eşlemede olmayan bir alan yazıyor
     VERİTABANINDA YOK  eşlemenin gösterdiği sütun ya da tablo betiklerde yok
     İŞLEV              veri.js'te eşlemede olmayan bir işlev var, ya da
                        eşlemede olup veri.js'te artık olmayan
     ÇİFT SATIR         eşlemede aynı yol, anahtar ya da işlev iki kez yazılı.
                        JavaScript nesnesinde ikinci satır birincinin yerine
                        geçer ve hiçbir şey hata vermez; iki grubun aynı alanı
                        ayrı ayrı eklediği bir günde (25 Eylül 2026, yedi
                        düzeltme grubu) önceki satırın notu sessizce
                        kaybolurdu

   DÜŞÜRMEYEN, AMA SAYILAN
     bilinen boşluk     eşlemede "yok" diye gerekçesiyle yazılmış alanlar —
                        sunucu aşamasının iş listesi
     ölü alan           uygulamanın yazıp hiçbir yerde okumadığı alanlar;
                        veritabanına taşınmaz, iş listesine girmez
     sınanmıyor         eşlemede olup hiçbir senaryonun yazmadığı anahtar
                        ve alanlar. Denetim onları GÖREMEZ; sessizce
                        atlanmıyor, sayısı her koşuda basılıyor. Kapsamı
                        büyütmenin yolu senaryo eklemek.

   --envanter  senaryoların yazdığı her yolu ve eşlemedeki karşılığını
               basar. Yeni alan ekleyen, satırını buradan yazar.

   ÖNCE DÜŞÜRÜLEREK DENENDİ (her denetimin taşıdığı):

     veri.js'te talebe deneme alanı eklenirse          YENİ ALAN
     eşlemede bir sütun adı bozulursa                  VERİTABANINDA YOK
     veri.js'e eşlemesiz bir işlev eklenirse           İŞLEV
     eşlemede bir satır iki kez yazılırsa              ÇİFT SATIR
     saat dilimi kurulmazsa (TZ=UTC)           0. ADIM DURDURUR
     depo taklidi kaldırılırsa                 0. ADIM DURDURUR

   Son satır yine en önemlisi: src/lib/storage.js her hatayı yutuyor;
   taklit kurulmazsa depoya hiçbir şey düşmez, toplanacak yol olmaz ve
   denetim "yeni alan yok" diye yeşil geçerdi.
   ========================================================================== */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ortamKur,
  modulleriYukle,
  nisanTuru,
  depoTemizle,
  kapat,
  tohumla,
  kaynaklariTopla,
  modulYukle,
  KOK,
  TOHUM,
} from './ekosistem/ortam.mjs'
import { SENARYOLAR } from './ekosistem/senaryolar.mjs'
import { tablolarVeSutunlar } from './vt/denetle.mjs'
import {
  ANAHTARLAR,
  ALANLAR,
  HARITALAR,
  ISLEVLER,
  DEPO_DISI,
} from '../veritabani/uygulama-eslesmesi.mjs'

const envanter = process.argv.includes('--envanter')
const ONEK = 'paksan.'

/* Alanları tek tek eşlenmeyen anahtar türleri. */
const ALANSIZ = new Set(['cihaz', 'demo', 'sunucuVerir'])

/* ------------------------------------------------------------- 0. adım */

ortamKur()
tohumla(TOHUM)
const m = await modulleriYukle()

const nisanHatasi = nisanTuru(m.depo)
if (nisanHatasi) {
  console.log('')
  console.log('0. adım — depo taklidi ve saat dilimi')
  console.log(`  ! ${nisanHatasi}`)
  if (nisanHatasi.startsWith('saat dilimi')) {
    console.log('    Senaryolar Türkiye saatinde koşmazsa gün hesabına bağlı dallar')
    console.log('    başka türlü yürür; depoya düşen alanlar uygulamanın gerçekte')
    console.log('    yazdıklarıyla aynı olmayabilir.')
  } else {
    console.log('    Taklit çalışmıyorsa depoya hiçbir şey düşmez; toplanacak yol')
    console.log('    olmaz ve denetim YANLIŞLIKLA "yeni alan yok" derdi.')
  }
  console.log('')
  console.log('SONUÇ: denetim yapılamadı.')
  await kapat()
  process.exit(1)
}

/* ------------------------------------------------ Yolları toplamak

   Her yol iki kümeden birine girer: YAPRAK (değer: sayı, yazı, null,
   boş dizi, boş nesne) ya da KAP (altında başka yol olan). Yalnız
   hiçbir senaryoda altı dolmamış yapraklar eşleme ister. Talepteki
   `servis` bir senaryoda null, ötekinde {id, ad} olabiliyor — null hâli
   ayrı bir alan değil. */

const yaprak = new Map() // yol -> Set(senaryo)
const kap = new Set()
const anahtarlar = new Map() // anahtar -> Set(senaryo)

function yaprakEkle(yol, sen) {
  if (!yaprak.has(yol)) yaprak.set(yol, new Set())
  yaprak.get(yol).add(sen)
}

function gez(deger, yol, sen) {
  if (Array.isArray(deger)) {
    if (!deger.length) return yaprakEkle(yol + '[]', sen)
    for (const x of deger) {
      if (x && typeof x === 'object') kap.add(yol + '[]')
      gez(x, yol + '[]', sen)
    }
    return
  }
  if (deger && typeof deger === 'object') {
    const alt = Object.keys(deger)
    if (!alt.length) return yaprakEkle(yol, sen)
    kap.add(yol)
    if (HARITALAR.includes(yol)) {
      for (const v of Object.values(deger)) gez(v, yol + '{}', sen)
      return
    }
    for (const k of alt) gez(deger[k], `${yol}.${k}`, sen)
    return
  }
  yaprakEkle(yol, sen)
}

const ctx = { kaynaklar: kaynaklariTopla(), modulYukle }
const patlayan = []

/* Senaryolar kendi iddialarını basmasın: burada sorulan onlar değil
   (ekosistem sınaması ayrıca koşuyor). Yalnız çalışıp depoya yazsınlar. */
const konsol = { log: console.log, warn: console.warn }
for (const senaryo of SENARYOLAR) {
  depoTemizle()
  console.log = console.warn = () => {}
  try {
    await senaryo(m, ctx)
  } catch (e) {
    patlayan.push(`${senaryo.name}: ${e?.message || e}`)
  } finally {
    Object.assign(console, konsol)
  }
  for (const depo of [globalThis.localStorage, globalThis.sessionStorage]) {
    for (const tam of depo.anahtarlar()) {
      if (!tam.startsWith(ONEK)) continue
      const anahtar = tam.slice(ONEK.length)
      if (!anahtarlar.has(anahtar)) anahtarlar.set(anahtar, new Set())
      anahtarlar.get(anahtar).add(senaryo.name)
      let deger
      try {
        deger = JSON.parse(depo.getItem(tam))
      } catch {
        deger = depo.getItem(tam)
      }
      gez(deger, anahtar, senaryo.name)
    }
  }
}
await kapat()

/* ------------------------------------------------------ Eşlemede aramak */

const ANAHTAR_ADI = (yol) => yol.split(/[.[{]/)[0]

function eslemeBul(yol) {
  if (ALANLAR[yol]) return ALANLAR[yol]
  for (const [kalip, e] of Object.entries(ALANLAR)) {
    if (!kalip.endsWith('.*')) continue
    const kok = kalip.slice(0, -2)
    if (yol === kok || yol.startsWith(kok + '.') || yol.startsWith(kok + '[') || yol.startsWith(kok + '{')) {
      return e
    }
  }
  return null
}

/* `user` gibi, alanları başka bir anahtarla aynı olanlar. */
function eslemeYolu(yol) {
  const a = ANAHTAR_ADI(yol)
  const ayni = ANAHTARLAR[a]?.alanlarAyniDir
  return ayni ? ayni + yol.slice(a.length) : yol
}

/* ----------------------------------------------------------- Denetimler */

const yeniAnahtar = []
const yeniAlan = []
const vtdeYok = []
const islevSorunu = []
const kullanilanEsleme = new Set()

// 1. Anahtarlar
for (const a of [...anahtarlar.keys()].sort()) {
  if (!ANAHTARLAR[a]) yeniAnahtar.push(a)
}

// 2. Alanlar
for (const yol of [...yaprak.keys()].sort()) {
  if (kap.has(yol)) continue
  const a = ANAHTAR_ADI(yol)
  const tanim = ANAHTARLAR[a]
  if (!tanim || ALANSIZ.has(tanim.tur) || tanim.bosluk) continue
  const esYol = eslemeYolu(yol)
  const e = eslemeBul(esYol)
  if (!e) yeniAlan.push(yol)
  else kullanilanEsleme.add(Object.keys(ALANLAR).find((k) => ALANLAR[k] === e))
}

// 3. Eşlemenin gösterdiği tablo ve sütunlar betiklerde var mı
const sema = tablolarVeSutunlar()
function sutunVarMi(tam) {
  const parca = tam.split('.')
  if (parca.length !== 3) return false
  const tablo = `${parca[0]}.${parca[1]}`
  return sema.has(tablo) && sema.get(tablo).has(parca[2])
}
for (const [yol, e] of Object.entries(ALANLAR)) {
  if (e.tur !== 'sutun' && e.tur !== 'turer') continue
  for (const s of [].concat(e.sutun)) {
    if (!sutunVarMi(s)) vtdeYok.push(`${yol} → ${s}`)
  }
}
const tabloGosterenler = [
  ...Object.entries(ANAHTARLAR).map(([a, t]) => [a, t.tablo]),
  ...Object.entries(DEPO_DISI).map(([a, t]) => [a, t.tablo]),
]
for (const [a, t] of tabloGosterenler) {
  for (const tablo of String(t || '').split(',').map((x) => x.trim()).filter(Boolean)) {
    if (!sema.has(tablo)) vtdeYok.push(`${a} → ${tablo} (tablo)`)
  }
}

// 4. veri.js işlevleri
const veriMetni = readFileSync(join(KOK, 'src', 'backoffice', 'veri.js'), 'utf8')
const disaAktarilan = new Set(
  [...veriMetni.matchAll(/^export (?:async )?function ([A-Za-z0-9_]+)/gm)].map((x) => x[1]),
)
for (const ad of [...disaAktarilan].sort()) {
  if (!(ad in ISLEVLER)) islevSorunu.push(`${ad}: veri.js'te var, eşlemede yok`)
}
for (const ad of Object.keys(ISLEVLER).sort()) {
  if (!disaAktarilan.has(ad)) islevSorunu.push(`${ad}: eşlemede var, veri.js'te artık yok`)
}

// 5. Aynı satır iki kez. Nesne değil METİN okunuyor: yüklenen nesnede
//    ikinci satır birinciyi çoktan ezmiş, iz kalmamış oluyor.
const eslemeMetni = readFileSync(join(KOK, 'veritabani', 'uygulama-eslesmesi.mjs'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
function blokMetni(ad) {
  const bas = `export const ${ad} = {`
  const i = eslemeMetni.indexOf(bas)
  if (i < 0) return ''
  let govde = eslemeMetni.slice(i + bas.length, eslemeMetni.indexOf('\n}\n', i))
  /* ALANLAR dışında değerler nesne: içleri atılınca geriye yalnız
     üst düzey adlar kalıyor ({ tur, not } sayılmasın). */
  if (ad !== 'ALANLAR') {
    let once
    do {
      once = govde
      govde = govde.replace(/\{[^{}]*\}/g, '')
    } while (govde !== once)
  }
  return govde
}
const ciftSatir = []
for (const [ad, desen] of [
  ['ALANLAR', /^\s*'([^']+)'\s*:/gm],
  ['ANAHTARLAR', /([A-Za-z_][A-Za-z0-9_]*)\s*:/g],
  ['ISLEVLER', /([A-Za-z_][A-Za-z0-9_]*)\s*:/g],
]) {
  const say = new Map()
  for (const e of blokMetni(ad).matchAll(desen)) say.set(e[1], (say.get(e[1]) || 0) + 1)
  for (const [k, n] of say) if (n > 1) ciftSatir.push(`${ad} → ${k} (${n} kez)`)
}

// Sayılanlar
const bosluklar = Object.entries(ALANLAR).filter(([, e]) => e.tur === 'yok')
/* Ölü alan boşluk değil: yazılıyor ama okunmuyor, veritabanına
   taşınmayacak. Ayrı sayılır ki iş listesi şişmesin. */
const oluler = Object.entries(ALANLAR).filter(([, e]) => e.tur === 'olu')
const anahtarBosluklari = Object.entries(ANAHTARLAR).filter(([, t]) => t.bosluk)
const sinanmayanAnahtar = Object.entries(ANAHTARLAR)
  .filter(([a, t]) => !ALANSIZ.has(t.tur) && !anahtarlar.has(a))
  .map(([a]) => a)
const sinanmayanAlan = Object.keys(ALANLAR).filter((k) => {
  if (kullanilanEsleme.has(k)) return false
  /* `user` hesabın alanlarını paylaşıyor; hesabın satırı kullanıldıysa
     sınanmış sayılır. Anahtarı hiç yazılmamış alanlar anahtar
     sayımında zaten görünüyor. */
  return anahtarlar.has(ANAHTAR_ADI(k))
})

/* ------------------------------------------------------------ Envanter */

if (envanter) {
  console.log('')
  console.log('Senaryoların yazdığı alanlar ve eşlemedeki karşılıkları')
  console.log('-'.repeat(56))
  for (const yol of [...yaprak.keys()].sort()) {
    if (kap.has(yol)) continue
    const a = ANAHTAR_ADI(yol)
    const tanim = ANAHTARLAR[a]
    let karsilik
    if (!tanim) karsilik = 'ANAHTAR EŞLEMEDE YOK'
    else if (ALANSIZ.has(tanim.tur)) karsilik = `(${tanim.tur})`
    else if (tanim.bosluk) karsilik = `yok — ${tanim.bosluk.not}`
    else {
      const e = eslemeBul(eslemeYolu(yol))
      karsilik = !e
        ? 'EŞLEMEDE YOK'
        : e.tur === 'yok'
          ? `yok — ${e.not}`
          : e.tur === 'olu'
            ? `ölü alan — ${e.not}`
            : `${e.tur === 'turer' ? '← ' : ''}${[].concat(e.sutun).join(', ')}`
    }
    console.log(`  ${yol.padEnd(48)} ${karsilik}`)
  }
}

/* ------------------------------------------------------------ Ayrıntı */

function bolum(baslik, liste, aciklama) {
  if (!liste.length) return
  console.log('')
  console.log(`  ! ${baslik} — ${liste.length}`)
  if (aciklama) console.log(`    ${aciklama}`)
  for (const x of liste) console.log(`      ${x}`)
}

bolum('Senaryo patladı', patlayan, 'Bu senaryonun yazdıkları eksik toplandı; ekosistem sınamasına bakın.')
bolum(
  'YENİ ANAHTAR',
  yeniAnahtar,
  'veritabani/uygulama-eslesmesi.mjs → ANAHTARLAR\'a eklenmeli.',
)
bolum(
  'YENİ ALAN',
  yeniAlan,
  'veritabani/uygulama-eslesmesi.mjs → ALANLAR\'a eklenmeli: sütunu, türediği yer ya da yok(gerekçe).',
)
bolum('VERİTABANINDA YOK', vtdeYok, 'Eşleme bu sütunu gösteriyor ama veritabani/semalar betiklerinde yok.')
bolum('İŞLEV', islevSorunu, 'veritabani/uygulama-eslesmesi.mjs → ISLEVLER ile veri.js aynı olmalı.')
bolum('ÇİFT SATIR', ciftSatir, 'veritabani/uygulama-eslesmesi.mjs: satırlardan biri kalmalı, notları birleştirilerek.')

if (sinanmayanAnahtar.length) {
  console.log('')
  console.log(`  sınanmıyor — hiçbir senaryonun yazmadığı ${sinanmayanAnahtar.length} anahtar:`)
  console.log(`      ${sinanmayanAnahtar.join(', ')}`)
}
if (sinanmayanAlan.length) {
  console.log('')
  console.log(`  sınanmıyor — eşlemede olup hiçbir senaryonun yazmadığı ${sinanmayanAlan.length} alan:`)
  console.log(`      ${sinanmayanAlan.join(', ')}`)
}

/* ------------------------------------------------------------ Özet

   EN SONDA OLMAK ZORUNDA: `npm run dogrula` düşen sınamanın yalnız son
   12 satırını basıyor. */

const dusen = yeniAnahtar.length + yeniAlan.length + vtdeYok.length + islevSorunu.length + ciftSatir.length + patlayan.length
const ilk = (l) => (l.length ? '   ' + l.slice(0, 2).join(' · ') + (l.length > 2 ? ' …' : '') : '')

console.log('')
console.log(`  YENİ ANAHTAR       ${String(yeniAnahtar.length).padStart(4)}${ilk(yeniAnahtar)}`)
console.log(`  YENİ ALAN          ${String(yeniAlan.length).padStart(4)}${ilk(yeniAlan)}`)
console.log(`  VERİTABANINDA YOK  ${String(vtdeYok.length).padStart(4)}${ilk(vtdeYok)}`)
console.log(`  İŞLEV              ${String(islevSorunu.length).padStart(4)}${ilk(islevSorunu)}`)
console.log(`  ÇİFT SATIR         ${String(ciftSatir.length).padStart(4)}${ilk(ciftSatir)}`)
console.log(
  `  bilinen boşluk     ${String(bosluklar.length + anahtarBosluklari.length).padStart(4)}   ` +
    `sunucu aşamasının iş listesi (eşlemede "yok") · ölü alan ${oluler.length}`,
)
console.log(
  `  sınanmıyor         ${String(sinanmayanAnahtar.length).padStart(4)} anahtar, ` +
    `${sinanmayanAlan.length} alan — denetim bunları göremiyor`,
)
console.log(
  `  toplanan           ${String([...yaprak.keys()].filter((y) => !kap.has(y)).length).padStart(4)} alan, ` +
    `${anahtarlar.size} anahtar, ${SENARYOLAR.length} senaryo`,
)
console.log('')
if (dusen) {
  console.log(`SONUÇ: uygulama ile veritabanı eşlemesinde ${dusen} sorun var.`)
  process.exit(1)
}
console.log('SONUÇ: uygulamanın yazdığı her alanın veritabanında karşılığı ya da yazılı gerekçesi var.')
