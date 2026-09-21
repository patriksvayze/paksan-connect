/* ==========================================================================
   Tohum üretici — başlangıç verisi betiklerini src dosyalarından üretir

   KULLANIM   npm run vt -- tohum              betikleri üretip yazar
              npm run vt -- tohum --denetle    üretmeden karşılaştırır;
                                               fark ya da Codex yer tutucusu
                                               varsa çıkış kodu 1
              --denetle --ortam sinama         ayrıca veritabanında olup
                                               kaynakta olmayan kod, coğrafya,
                                               izin ve saklama satırlarını
                                               listeler (sorun sayılmaz)

   ÜRETTİĞİ DOSYALAR (veritabani/tohum/, tasarim.md 5.1–5.3)

     T01 kod listeleri, numara önekleri, çeviri, eski değer eşleşmesi
     T02 coğrafya          T03 erişim izinleri      T04 şirket
     T05 katalog           T06 parça ve fiyat       T07 KVKK metinleri
     T08 saklama kuralları
     B01 ayarlar           B02 hak ediş tarifesi    B03 varsayılan roller

   NEREDEN OKUR

     - Dışa aktarılan sabitler Vite ssrLoadModule ile, uygulamanın kendi
       modül çözümlemesiyle okunur (şablonlu metinler, marka adı ve
       içe aktarılan dosya yolları uygulamadaki değeriyle gelir).
     - Dosyanın içindeki yerel sabitler (Talepler.jsx IPTAL_SEBEPLERI gibi)
       yalnız düz dizi/nesne sabiti olarak ayrıştırılır. Okunan yerde
       sabit olmayan bir ifade varsa üretim durur ve hangi sabitin
       okunamadığını söyler.
     - Kaynakta karşılığı olmayan her şey veritabani/tohum/kaynak/*.json
       dosyalarından gelir. Üretici metin uydurmaz; eşleşmesi olmayan
       etiket üretimi durdurur.

   ÇIKTI BELİRLENİMCİDİR: satırlar anahtara göre sıralı, metinler N'…',
   VALUES blokları en çok 1000 satır, satır sonu LF, BOM yok. Aynı girdi
   bayt bayt aynı dosyayı verir; --denetle bunun üstüne kurulu.

   KODEX YER TUTUCUSU: kod-adlari.json'daki <Codex metni: …> adlar
   betiğe olduğu gibi yazılır ve sayısı bildirilir (Codex bugün
   kullanılamıyor). --denetle yer tutucuyu hata sayar (tasarim.md 1.20);
   test ve canlıda yer tutuculu betiği çalıştırmamak calistir.mjs'in işi.
   ========================================================================== */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { KOK, VT_KLASORU } from './ortam.mjs'

const TOHUM_KLASORU = join(VT_KLASORU, 'tohum')
const KAYNAK_KLASORU = join(TOHUM_KLASORU, 'kaynak')
const YER_TUTUCU = '<Codex metni:'
const UUID_AD_ALANI = '4b7e2a9c-5d31-4f86-a0c2-9e1d7b3f6a58'
const ILK_SATIR = '-- ÜRETİLDİ, elle düzenlemeyin'
const BLOK = 1000

export class UretimHatasi extends Error {}

function dur(mesaj) {
  throw new UretimHatasi(mesaj)
}

/* ------------------------------------------------------------ kaynak JSON */

function kaynakJson(ad) {
  const yol = join(KAYNAK_KLASORU, ad)
  if (!existsSync(yol)) dur(`Kaynak dosyası yok: veritabani/tohum/kaynak/${ad}`)
  try {
    return JSON.parse(readFileSync(yol, 'utf8').replace(/^﻿/, ''))
  } catch (e) {
    dur(`veritabani/tohum/kaynak/${ad} okunamadı: ${e.message}`)
  }
}

/* Arşiv dosyasının özeti: BOM ve satır sonu farkı özeti değiştirmez
   (calistir.mjs betikOzeti ile aynı ilke). */
function metinOzeti(icerik) {
  const duz = icerik.replace(/^﻿/, '').replace(/\r\n/g, '\n')
  return createHash('sha256').update(duz, 'utf8').digest('hex')
}

function uuidv5(ad) {
  const alan = Buffer.from(UUID_AD_ALANI.replace(/-/g, ''), 'hex')
  const h = createHash('sha1').update(Buffer.concat([alan, Buffer.from(ad, 'utf8')])).digest()
  h[6] = (h[6] & 0x0f) | 0x50
  h[8] = (h[8] & 0x3f) | 0x80
  const x = h.subarray(0, 16).toString('hex')
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`
}

/* ------------------------------------------------ yerel sabit ayrıştırma */

const SABIT_DEGIL = Symbol('sabitDegil')

function sabitDeger(d, yol) {
  switch (d.type) {
    case 'Literal':
      if (d.regex || typeof d.value === 'bigint') return { [SABIT_DEGIL]: yol }
      return d.value
    case 'TemplateLiteral':
      if (d.expressions.length) return { [SABIT_DEGIL]: yol }
      return d.quasis[0].value.cooked
    case 'ArrayExpression':
      return d.elements.map((e, i) =>
        !e || e.type === 'SpreadElement' ? { [SABIT_DEGIL]: `${yol}[${i}]` } : sabitDeger(e, `${yol}[${i}]`),
      )
    case 'ObjectExpression': {
      const n = {}
      for (const p of d.properties) {
        if (p.type !== 'Property' || p.computed || p.kind !== 'init' || p.method) {
          n[`…${Object.keys(n).length}`] = { [SABIT_DEGIL]: `${yol}.…` }
          continue
        }
        const anahtar = p.key.type === 'Identifier' ? p.key.name : String(p.key.value)
        n[anahtar] = sabitDeger(p.value, `${yol}.${anahtar}`)
      }
      return n
    }
    case 'UnaryExpression': {
      const v = sabitDeger(d.argument, yol)
      if (d.operator === '-' && typeof v === 'number') return -v
      return { [SABIT_DEGIL]: yol }
    }
    case 'BinaryExpression': {
      const a = sabitDeger(d.left, yol)
      const b = sabitDeger(d.right, yol)
      if (typeof a !== 'number' || typeof b !== 'number') return { [SABIT_DEGIL]: yol }
      if (d.operator === '*') return a * b
      if (d.operator === '/') return a / b
      if (d.operator === '+') return a + b
      if (d.operator === '-') return a - b
      return { [SABIT_DEGIL]: yol }
    }
    default:
      return { [SABIT_DEGIL]: yol }
  }
}

function sabitMi(x) {
  return !(x && typeof x === 'object' && SABIT_DEGIL in x)
}

/** Değerin içinde sabit olmayan parça varsa üretimi durdurur. */
function saglam(x, dosya) {
  if (!sabitMi(x)) dur(`${dosya}: ${x[SABIT_DEGIL]} düz sabit değil, okunamadı`)
  if (Array.isArray(x)) x.forEach((e) => saglam(e, dosya))
  else if (x && typeof x === 'object') Object.values(x).forEach((e) => saglam(e, dosya))
  return x
}

const ayristirilmis = new Map()

async function agac(dosya) {
  if (ayristirilmis.has(dosya)) return ayristirilmis.get(dosya)
  const { transformWithEsbuild } = await import('vite')
  const { parseAst } = await import('rollup/parseAst')
  const yol = join(KOK, dosya)
  if (!existsSync(yol)) dur(`Kaynak yok: ${dosya}`)
  const ham = readFileSync(yol, 'utf8')
  const js = dosya.endsWith('.jsx')
    ? (await transformWithEsbuild(ham, yol, { loader: 'jsx', jsx: 'transform' })).code
    : ham
  const a = parseAst(js)
  ayristirilmis.set(dosya, a)
  return a
}

/** Dosyanın en üst düzeyindeki `const AD = <sabit>` değerini döndürür. */
async function yerelSabit(dosya, ad) {
  const a = await agac(dosya)
  for (let d of a.body) {
    if (d.type === 'ExportNamedDeclaration' && d.declaration) d = d.declaration
    if (d.type !== 'VariableDeclaration') continue
    for (const b of d.declarations) {
      if (b.id.type === 'Identifier' && b.id.name === ad) {
        if (!b.init) dur(`${dosya}: ${ad} değer almamış`)
        return sabitDeger(b.init, ad)
      }
    }
  }
  dur(`${dosya}: ${ad} sabiti bulunamadı`)
}

/** Bir işlevin gövdesindeki `s['tr'] = 'en'` atamalarını toplar
    (talepAlanlari.js sozlukKur: teklif sonuçlarının İngilizcesi). */
async function islevAtamalari(dosya, islev, nesne) {
  const a = await agac(dosya)
  const f = a.body.find((d) => d.type === 'FunctionDeclaration' && d.id?.name === islev)
  if (!f) dur(`${dosya}: ${islev} işlevi bulunamadı`)
  const sonuc = {}
  for (const s of f.body.body) {
    if (s.type !== 'ExpressionStatement' || s.expression.type !== 'AssignmentExpression') continue
    const { left, right } = s.expression
    if (left.type !== 'MemberExpression' || !left.computed || left.object.name !== nesne) continue
    const k = sabitDeger(left.property, islev)
    const v = sabitDeger(right, islev)
    if (typeof k === 'string' && typeof v === 'string') sonuc[k] = v
  }
  return sonuc
}

/* -------------------------------------------------------- SQL yazımı */

function metinSql(s) {
  if (/[ --]/.test(s)) dur(`Metinde denetim karakteri var: ${JSON.stringify(s).slice(0, 80)}`)
  /* Satır sonu dizginin içinde yazılmaz: sqlcmd "GO" ve ":r" satırlarını
     dizgi içinde de komut sayar. "$(" sqlcmd değişkeni sayılmasın diye
     iki parçaya bölünür. */
  const parcalar = []
  let parca = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '\n' || c === '\r') {
      parcalar.push(`N'${parca}'`, c === '\n' ? 'NCHAR(10)' : 'NCHAR(13)')
      parca = ''
    } else if (c === '$' && s[i + 1] === '(') {
      parcalar.push(`N'${parca}$'`)
      parca = ''
    } else {
      parca += c === "'" ? "''" : c
    }
  }
  parcalar.push(`N'${parca}'`)
  const dolu = parcalar.filter((p, i) => p !== "N''" || parcalar.length === 1)
  return dolu.join(' + ')
}

function metinUzunlugu(tip) {
  const m = /^nvarchar\((\d+|max)\)$/.exec(tip)
  return m ? (m[1] === 'max' ? Infinity : Number(m[1])) : null
}

function degerSql(deger, kolon, yer) {
  if (deger === null || deger === undefined) return 'NULL'
  const t = kolon.tip
  const n = metinUzunlugu(t)
  if (n !== null) {
    if (typeof deger !== 'string') dur(`${yer}.${kolon.ad}: metin bekleniyordu (${JSON.stringify(deger)})`)
    if (deger.length > n) dur(`${yer}.${kolon.ad}: ${deger.length} karakter, kolon ${t} (${deger.slice(0, 60)}…)`)
    return metinSql(deger)
  }
  if (t === 'bit') {
    if (deger === true || deger === 1) return '1'
    if (deger === false || deger === 0) return '0'
    dur(`${yer}.${kolon.ad}: bit bekleniyordu (${JSON.stringify(deger)})`)
  }
  if (/^(tinyint|smallint|int|bigint)$/.test(t)) {
    if (!Number.isInteger(deger)) dur(`${yer}.${kolon.ad}: tamsayı bekleniyordu (${JSON.stringify(deger)})`)
    return String(deger)
  }
  if (/^decimal\(/.test(t)) {
    const s = typeof deger === 'number' ? String(deger) : ''
    if (!/^-?\d+(\.\d+)?$/.test(s)) dur(`${yer}.${kolon.ad}: ondalık sayı bekleniyordu (${JSON.stringify(deger)})`)
    return s
  }
  if (t === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deger)) dur(`${yer}.${kolon.ad}: YYYY-AA-GG tarih bekleniyordu`)
    return `N'${deger}'`
  }
  if (t === 'binary(32)') {
    if (!/^[0-9a-f]{64}$/.test(deger)) dur(`${yer}.${kolon.ad}: 64 haneli özet bekleniyordu`)
    return '0x' + deger.toUpperCase()
  }
  if (/^datetime2/.test(t)) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(deger)) dur(`${yer}.${kolon.ad}: YYYY-AA-GGTSS:DD:ss zaman bekleniyordu`)
    return `N'${deger}'`
  }
  if (t === 'uniqueidentifier') {
    if (!/^[0-9a-f-]{36}$/.test(deger)) dur(`${yer}.${kolon.ad}: GUID bekleniyordu`)
    return `N'${deger}'`
  }
  dur(`${yer}.${kolon.ad}: bilinmeyen tip ${t}`)
}

const metinMi = (k) => metinUzunlugu(k.tip) !== null

function karsilastir(a, b) {
  if (a === b) return 0
  if (a === null || a === undefined) return -1
  if (b === null || b === undefined) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const x = String(a)
  const y = String(b)
  return x < y ? -1 : x > y ? 1 : 0
}

function sirala(satirlar, anahtar) {
  return [...satirlar].sort((p, q) => {
    for (const k of anahtar) {
      const c = karsilastir(p[k], q[k])
      if (c) return c
    }
    return 0
  })
}

function tekilDenetle(satirlar, anahtar, yer) {
  const gorulen = new Set()
  for (const s of satirlar) {
    const k = JSON.stringify(anahtar.map((a) => s[a]))
    if (gorulen.has(k)) dur(`${yer}: anahtar iki kez geliyor ${k}`)
    gorulen.add(k)
  }
}

function bloklar(dizi) {
  const b = []
  for (let i = 0; i < dizi.length; i += BLOK) b.push(dizi.slice(i, i + BLOK))
  return b
}

function kaynakSorgusu(kolonlar, satirlar, yer, girinti = '    ') {
  const satirMetni = satirlar
    .map((s) => `${girinti}    (${kolonlar.map((k) => degerSql(s[k.ad], k, yer)).join(', ')})`)
    .join(',\n')
  return [
    `${girinti}SELECT ${kolonlar.map((k) => `CONVERT(${k.tip}, v.${k.ad}) AS ${k.ad}`).join(',\n' + girinti + '       ')}`,
    `${girinti}FROM (VALUES`,
    satirMetni,
    `${girinti}) AS v (${kolonlar.map((k) => k.ad).join(', ')})`,
  ].join('\n')
}

function farkIfadesi(kolonlar) {
  const al = (on) => kolonlar.map((k) => (metinMi(k) ? `${on}.${k.ad} COLLATE Latin1_General_100_BIN2` : `${on}.${k.ad}`)).join(', ')
  return `EXISTS (SELECT ${al('k')} EXCEPT SELECT ${al('h')})`
}

/**
 * Kapsamlı MERGE (tasarim.md 5.5).
 * @param {object} t
 * @param {string} t.tablo
 * @param {Array<{ad, tip}>} t.kolonlar   VALUES kolonları
 * @param {string[]} t.anahtar
 * @param {string[]} t.guncellenen        karşılaştırılıp güncellenen kolonlar
 * @param {object} [t.sabitEkleme]        yalnız eklemede yazılan kolon → SQL ifadesi
 * @param {string} [t.hedefSuzgec]        hedefi sınırlayan WHERE
 * @param {'pasif'|'sil'} [t.kaynakDisi]   kaynakta olmayan hedef satıra ne olur
 * @param {object[]} t.satirlar
 */
function mergeYaz(t) {
  const yer = t.tablo
  tekilDenetle(t.satirlar, t.anahtar, yer)
  const satirlar = sirala(t.satirlar, t.anahtar)
  const baslik = `/* ${t.tablo} — ${satirlar.length} satır${t.not ? '; ' + t.not : ''} */`
  if (!satirlar.length) {
    if (t.kaynakDisi) dur(`${yer}: kaynakta satır yok ama kaynak dışı satırlara ${t.kaynakDisi} uygulanacaktı`)
    return `${baslik}\n-- Kaynakta satır yok; tabloya dokunulmaz.\n`
  }
  const kolonAdi = t.kolonlar.map((k) => k.ad)
  const guncellenen = t.guncellenen.map((a) => {
    const k = t.kolonlar.find((x) => x.ad === a)
    if (!k) dur(`${yer}: güncellenen kolon ${a} VALUES içinde yok`)
    return k
  })
  const ekleKolon = [...kolonAdi, ...Object.keys(t.sabitEkleme || {})]
  const ekleDeger = [...kolonAdi.map((a) => `k.${a}`), ...Object.values(t.sabitEkleme || {})]
  const tekBlok = satirlar.length <= BLOK
  const hedef = t.hedefSuzgec ? 'hedef' : t.tablo
  const parcalar = [baslik]
  for (const blok of bloklar(satirlar)) {
    const m = []
    if (t.hedefSuzgec) m.push(`WITH hedef AS (SELECT * FROM ${t.tablo} WHERE ${t.hedefSuzgec})`)
    m.push(`MERGE ${hedef} AS h`)
    m.push('USING (')
    m.push(kaynakSorgusu(t.kolonlar, blok, yer))
    m.push(') AS k')
    m.push(`    ON ${t.anahtar.map((a) => `h.${a} = k.${a}`).join(' AND ')}`)
    if (guncellenen.length) {
      m.push(`WHEN MATCHED AND ${farkIfadesi(guncellenen)} THEN`)
      m.push(`    UPDATE SET ${guncellenen.map((k) => `${k.ad} = k.${k.ad}`).join(', ')}`)
    }
    m.push('WHEN NOT MATCHED BY TARGET THEN')
    m.push(`    INSERT (${ekleKolon.join(', ')})`)
    m.push(`    VALUES (${ekleDeger.join(', ')})`)
    if (t.kaynakDisi && tekBlok) {
      if (t.kaynakDisi === 'pasif') {
        m.push('WHEN NOT MATCHED BY SOURCE AND h.Aktif = 1 THEN')
        m.push('    UPDATE SET Aktif = 0')
      } else {
        m.push('WHEN NOT MATCHED BY SOURCE THEN')
        m.push('    DELETE')
      }
    }
    parcalar.push(m.join('\n') + ';')
  }
  if (t.kaynakDisi && !tekBlok) {
    /* 1000 satırı aşan kaynakta "kaynakta yok" koşulu blok başına bir
       NOT EXISTS ile yazılır; MERGE'ün NOT MATCHED BY SOURCE kolu tek
       bloğu görürdü. */
    const kosullar = bloklar(satirlar).map(
      (blok) =>
        `  AND NOT EXISTS (SELECT 1 FROM (\n${kaynakSorgusu(t.kolonlar, blok, yer, '        ')}\n      ) AS k WHERE ${t.anahtar.map((a) => `k.${a} = h.${a}`).join(' AND ')})`,
    )
    const bas = t.kaynakDisi === 'pasif' ? `UPDATE h SET Aktif = 0\nFROM ${t.tablo} AS h` : `DELETE h\nFROM ${t.tablo} AS h`
    parcalar.push(
      `${bas}\nWHERE ${t.hedefSuzgec ? t.hedefSuzgec.replace(/\b([A-Z]\w*Kodu)\b/g, 'h.$1') : '1 = 1'}${t.kaynakDisi === 'pasif' ? '\n  AND h.Aktif = 1' : ''}\n${kosullar.join('\n')};`,
    )
  }
  return parcalar.join('\n\n') + '\n'
}

/** Yalnız ekleme: `INSERT … SELECT … WHERE NOT EXISTS`. */
function eklemeYaz(t) {
  const yer = t.tablo
  tekilDenetle(t.satirlar, t.anahtar, yer)
  const satirlar = sirala(t.satirlar, t.anahtar)
  const baslik = `/* ${t.tablo} — ${satirlar.length} satır, yalnız eksikler eklenir${t.not ? '; ' + t.not : ''} */`
  if (!satirlar.length) return `${baslik}\n-- Kaynakta satır yok.\n`
  const bosOlabilir = new Set(t.bosOlabilenAnahtar || [])
  const esit = t.anahtar
    .map((a) => (bosOlabilir.has(a) ? `((h.${a} IS NULL AND k.${a} IS NULL) OR h.${a} = k.${a})` : `h.${a} = k.${a}`))
    .join(' AND ')
  const kolonAdi = t.kolonlar.map((k) => k.ad)
  const parcalar = [baslik]
  for (const blok of bloklar(satirlar)) {
    parcalar.push(
      [
        `INSERT INTO ${t.tablo} (${kolonAdi.join(', ')})`,
        `SELECT ${kolonAdi.map((a) => `k.${a}`).join(', ')}`,
        'FROM (',
        kaynakSorgusu(t.kolonlar, blok, yer),
        ') AS k',
        `WHERE NOT EXISTS (SELECT 1 FROM ${t.tablo} AS h WHERE ${esit});`,
      ].join('\n'),
    )
  }
  return parcalar.join('\n\n') + '\n'
}

function betikBasligi(ad, satirlar) {
  return [
    ILK_SATIR,
    '/* ==========================================================================',
    `   ${ad}`,
    '',
    '   Üreten: tools/vt/tohum-uret.mjs (npm run vt -- tohum). Bu dosyayı elle',
    '   düzenlemeyin: kaynak değişince yeniden üretilir ve el değişikliği',
    '   kaybolur. Kaynağı değiştirin, sonra "npm run vt -- tohum" çalıştırın.',
    '',
    ...satirlar.map((s) => (s ? '   ' + s : '')),
    '',
    '   Araç betiği tek işlemde, sahip girişiyle çalıştırır (BEGIN/COMMIT',
    '   burada yazılmaz). İkinci çalıştırmada hiçbir satır değişmez.',
    '   ========================================================================== */',
    '',
  ].join('\n')
}

/* ------------------------------------------------------ ortak kolonlar */

const k = (ad, tip) => ({ ad, tip })
const KOD40 = 'nvarchar(40)'
const AD150 = 'nvarchar(150)'

/* ============================================================ KAYNAK */

async function kaynaklariOku() {
  const { createServer } = await import('vite')
  const sunucu = await createServer({
    configFile: false,
    root: KOK,
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  const y = async (m) => {
    try {
      return await sunucu.ssrLoadModule(m)
    } catch (e) {
      dur(`${m} yüklenemedi: ${e.message.split('\n')[0]}`)
    }
  }
  try {
    const K = {}
    K.marka = await y('/src/marka/index.js')
    K.urunEn = await y('/src/marka/katalog/products.en.js')
    K.teknik = await y('/src/marka/icerik/teknikOzellikler.js')
    K.teknikSozluk = await y('/src/marka/icerik/teknikSozluk.js')
    K.kilavuz = await y('/src/marka/icerik/kilavuzEslesme.js')
    K.talep = await y('/src/lib/talep.js')
    K.veri = await y('/src/backoffice/veri.js')
    K.talepAlanlari = await y('/src/data/talepAlanlari.js')
    K.talepAlanlariEn = await y('/src/data/talepAlanlari.en.js')
    K.servisKaydi = await y('/src/lib/servisKaydi.js')
    K.duyuru = await y('/src/data/duyuruTurleri.js')
    K.bildirim = await y('/src/lib/bildirim.js')
    K.yetkiler = await y('/src/data/yetkiler.js')
    K.tr = (await y('/src/i18n/tr.js')).tr
    K.en = (await y('/src/i18n/en.js')).en
    K.i18n = await y('/src/i18n/index.jsx')
    K.ulkeler = await y('/src/data/ulkeler.js')
    K.ulkelerEn = await y('/src/data/ulkeler.en.js')
    K.iller = await y('/src/data/iller.js')
    K.bolgeler = await y('/src/data/bolgeler.js')
    K.kvkk = await y('/src/data/kvkk.js')
    K.serial = await y('/src/lib/serial.js')
    K.moduller = { y }
    /* B01 kaynakları: ayarlar.json'daki "modul" alanlarının hepsi */
    K.ayarModulleri = {}
    for (const a of kaynakJson('ayarlar.json').ayarlar) {
      const m = a.kaynak.modul
      if (m && !K.ayarModulleri[m]) K.ayarModulleri[m] = await y(m)
    }
    K.paket = JSON.parse(readFileSync(join(KOK, 'src/marka/icerik/mobile_support_package.json'), 'utf8'))
    return K
  } finally {
    await sunucu.close()
  }
}

/* ============================================================ YARDIMCI */

function yolAl(nesne, yol, yer) {
  let x = nesne
  for (const p of yol.split('.')) {
    if (x === null || x === undefined || !(p in Object(x))) dur(`${yer}: ${yol} bulunamadı`)
    x = x[p]
  }
  return x
}

/** kod-adlari.json'dan liste; bayraklar satıra kopyalanır. */
function adlardan(adlar, tablo, ekKolonlar = []) {
  const liste = adlar[tablo]
  if (!liste) dur(`kod-adlari.json: ${tablo} yok`)
  return Object.entries(liste).map(([kod, x], i) => {
    if (typeof x.Ad !== 'string' || !x.Ad.trim()) dur(`kod-adlari.json: ${tablo}.${kod} Ad boş`)
    const satir = { Kod: kod, Ad: x.Ad, Sira: i + 1 }
    for (const e of ekKolonlar) {
      if (!(e in x)) dur(`kod-adlari.json: ${tablo}.${kod} ${e} yok`)
      satir[e] = x[e]
    }
    return satir
  })
}

function kumeEsit(a, b) {
  const x = new Set(a)
  const y = new Set(b)
  return x.size === y.size && [...x].every((e) => y.has(e))
}

/* ============================================================ T01 */

function kodListesi(tablo, satirlar, secenek = {}) {
  return {
    tablo,
    kodTipi: secenek.kodTipi || KOD40,
    ek: secenek.ek || [],
    satirlar,
    ceviri: secenek.ceviri || [],
    eski: secenek.eski || [],
  }
}

function etiketliListe(eslesme, tablo, etiketler, ingilizce, secenek = {}) {
  const tanim = eslesme.listeler[tablo]
  if (!tanim?.etiketler) dur(`kod-eslesmeleri.json: ${tablo} etiketleri yok`)
  const satirlar = []
  const ceviri = []
  const eski = []
  etiketler.forEach((etiket, i) => {
    const kod = tanim.etiketler[etiket]
    if (!kod) dur(`kod-eslesmeleri.json: ${tablo} için "${etiket}" etiketinin kodu yok`)
    satirlar.push({ Kod: kod, Ad: etiket, Sira: i + 1, ...(tanim.bayraklar?.[kod] || {}) })
    if (ingilizce && ingilizce[i]) ceviri.push({ Kod: kod, AlanAdi: 'Ad', Metin: ingilizce[i] })
    eski.push({ EskiDeger: etiket, YeniKod: kod, EslesmeNotu: `Eski veride ekran yazısı (${tanim.kaynak})` })
  })
  const fazla = Object.keys(tanim.etiketler).filter((e) => !etiketler.includes(e))
  if (fazla.length && !secenek.fazlaSerbest) dur(`kod-eslesmeleri.json: ${tablo} kaynakta olmayan etiketler: ${fazla.join(', ')}`)
  return kodListesi(tablo, satirlar, { ...secenek, ceviri, eski })
}

async function t01Verisi(K, eslesme, adlar) {
  const L = []
  const liste = (tablo) => L.find((x) => x.tablo === tablo)
  const kodlar = (tablo) => new Set(liste(tablo).satirlar.map((s) => s.Kod))
  const enAl = (yol) => {
    try {
      return yolAl(K.en, yol, 'en.js')
    } catch {
      return null
    }
  }

  /* kod.Dil — src/i18n/index.jsx DILLER */
  L.push(kodListesi('kod.Dil', K.i18n.DILLER.map((d, i) => ({ Kod: d.kod, Ad: d.ad, Sira: i + 1 })), { kodTipi: 'nvarchar(5)' }))

  /* kod.ParaBirimi — para.js PARA_BIRIMI (TL → TRY eşleşmesi) */
  const paraEski = eslesme.eskiDegerler['kod.ParaBirimi']?.[K.marka.PARA_BIRIMI]
  const paraKodu = paraEski ? paraEski.YeniKod : K.marka.PARA_BIRIMI
  const para = adlardan(adlar, 'kod.ParaBirimi', ['Sembol'])
  if (!para.find((p) => p.Kod === paraKodu)) dur(`kod-adlari.json: kod.ParaBirimi ${paraKodu} (para.js PARA_BIRIMI) yok`)
  L.push(kodListesi('kod.ParaBirimi', para, { kodTipi: 'nvarchar(3)', ek: [k('Sembol', 'nvarchar(5)')] }))

  for (const t of ['kod.KayitTuru', 'kod.KaynakUygulama', 'kod.AktorTuru', 'kod.KayitKaynagi', 'kod.DisSistem', 'kod.BildirimKanali']) {
    L.push(kodListesi(t, adlardan(adlar, t)))
  }

  /* kod.IslemKategorisi — IslemKaydi.jsx TURLER (yerel) + kod-adlari */
  {
    const dosya = 'src/backoffice/ekranlar/IslemKaydi.jsx'
    const turler = await yerelSabit(dosya, 'TURLER')
    if (!Array.isArray(turler)) dur(`${dosya}: TURLER dizi değil`)
    const tanim = eslesme.listeler['kod.IslemKategorisi']
    const ek = adlar['kod.IslemKategorisi'] || {}
    const satirlar = []
    for (const x of turler) {
      const kod = saglam(x.deger, dosya)
      if (tanim.haric.includes(kod)) continue
      let ad = x.ad
      if (!sabitMi(ad)) {
        if (!ek[kod]) dur(`${dosya}: TURLER "${kod}" adı sabit değil ve kod-adlari.json kod.IslemKategorisi.${kod} yok`)
        ad = ek[kod].Ad
      } else if (ek[kod]) {
        dur(`kod-adlari.json: kod.IslemKategorisi.${kod} kaynakta zaten etiketli ("${ad}"); ikisinden biri kalkmalı`)
      }
      satirlar.push({ Kod: kod, Ad: ad })
    }
    for (const [kod, x] of Object.entries(ek)) if (!satirlar.find((s) => s.Kod === kod)) satirlar.push({ Kod: kod, Ad: x.Ad })
    satirlar.forEach((s, i) => (s.Sira = i + 1))
    L.push(kodListesi('kod.IslemKategorisi', satirlar))
  }

  /* kod.IslemTuru */
  {
    const satirlar = adlardan(adlar, 'kod.IslemTuru', ['KategoriKodu'])
    const kat = kodlar('kod.IslemKategorisi')
    for (const s of satirlar) if (!kat.has(s.KategoriKodu)) dur(`kod-adlari.json: kod.IslemTuru.${s.Kod} kategorisi ${s.KategoriKodu} yok`)
    L.push(kodListesi('kod.IslemTuru', satirlar, { ek: [k('KategoriKodu', KOD40)] }))
  }

  /* kod.TalepTuru — src/lib/talep.js TALEP_TURLERI */
  {
    const turler = Object.values(K.talep.TALEP_TURLERI)
    L.push(
      kodListesi(
        'kod.TalepTuru',
        turler.map((t, i) => ({ Kod: t.id, Ad: t.ad, Sira: i + 1 })),
        { ceviri: turler.filter((t) => enAl(`talep.${t.id}.adi`)).map((t) => ({ Kod: t.id, AlanAdi: 'Ad', Metin: enAl(`talep.${t.id}.adi`) })) },
      ),
    )
  }

  L.push(kodListesi('kod.TalepKaynagi', adlardan(adlar, 'kod.TalepKaynagi')))

  /* kod.TalepDurumu — veri.js DURUMLAR, KAPALI_DURUMLAR */
  {
    const tanim = eslesme.listeler['kod.TalepDurumu']
    const satirlar = K.veri.DURUMLAR.map((d) => {
      const kapali = K.veri.KAPALI_DURUMLAR.includes(d.id)
      return {
        Kod: d.id,
        Ad: d.ad,
        Kapali: kapali ? 1 : 0,
        GecikmeSayilir: !kapali && !tanim.gecikmeSayilmayanAcikDurumlar.includes(d.id) ? 1 : 0,
        Ton: d.ton || null,
      }
    })
    for (const kapali of K.veri.KAPALI_DURUMLAR) if (!satirlar.find((s) => s.Kod === kapali)) dur(`veri.js: KAPALI_DURUMLAR ${kapali} DURUMLAR içinde yok`)
    for (const [kod, x] of Object.entries(adlar['kod.TalepDurumu'] || {})) {
      if (satirlar.find((s) => s.Kod === kod)) dur(`kod-adlari.json: kod.TalepDurumu.${kod} kaynakta zaten var`)
      const yer = satirlar.findIndex((s) => s.Kod === x.SonraGelir)
      if (yer < 0) dur(`kod-adlari.json: kod.TalepDurumu.${kod} SonraGelir ${x.SonraGelir} yok`)
      satirlar.splice(yer + 1, 0, { Kod: kod, Ad: x.Ad, Kapali: x.Kapali, GecikmeSayilir: x.GecikmeSayilir, Ton: x.Ton })
    }
    satirlar.forEach((s, i) => (s.Sira = i + 1))
    const ceviri = satirlar
      .filter((s) => enAl(`${tanim.ingilizceBolumu}.${s.Kod}`))
      .map((s) => ({ Kod: s.Kod, AlanAdi: 'Ad', Metin: enAl(`${tanim.ingilizceBolumu}.${s.Kod}`) }))
    L.push(
      kodListesi('kod.TalepDurumu', satirlar, {
        ek: [k('Kapali', 'bit'), k('GecikmeSayilir', 'bit'), k('Ton', 'nvarchar(20)')],
        ceviri,
      }),
    )
  }

  /* kod.Masa */
  {
    const satirlar = adlardan(adlar, 'kod.Masa', ['TalepTuruKodu'])
    const tur = kodlar('kod.TalepTuru')
    for (const s of satirlar) if (!tur.has(s.TalepTuruKodu)) dur(`kod-adlari.json: kod.Masa.${s.Kod} türü ${s.TalepTuruKodu} yok`)
    L.push(kodListesi('kod.Masa', satirlar, { ek: [k('TalepTuruKodu', KOD40)] }))
  }

  L.push(kodListesi('kod.Sahip', adlardan(adlar, 'kod.Sahip')))
  L.push(kodListesi('kod.ServisAtamaKaynagi', adlardan(adlar, 'kod.ServisAtamaKaynagi')))

  /* kod.UlasimZamani — talepAlanlari.js */
  L.push(etiketliListe(eslesme, 'kod.UlasimZamani', K.talepAlanlari.ULASIM_ZAMANI, K.talepAlanlariEn.ULASIM_ZAMANI_EN))

  /* kod.MakineDurumu — MAKINE_DURUMU, ARIZA_DURUMLARI */
  L.push(
    kodListesi(
      'kod.MakineDurumu',
      K.talepAlanlari.MAKINE_DURUMU.map((d, i) => ({ Kod: d.id, Ad: d.ad, Sira: i + 1, ArizaMi: K.talepAlanlari.ARIZA_DURUMLARI.includes(d.id) ? 1 : 0 })),
      {
        ek: [k('ArizaMi', 'bit')],
        ceviri: K.talepAlanlari.MAKINE_DURUMU.filter((d) => K.talepAlanlariEn.MAKINE_DURUMU_EN[d.id]?.ad).map((d) => ({
          Kod: d.id,
          AlanAdi: 'Ad',
          Metin: K.talepAlanlariEn.MAKINE_DURUMU_EN[d.id].ad,
        })),
      },
    ),
  )

  /* kod.DestekAilesi, kod.Belirti — talepAlanlari.js ORTAK_BELIRTI, BELIRTILER (yerel) */
  const talepDosyasi = 'src/data/talepAlanlari.js'
  const ortak = saglam(await yerelSabit(talepDosyasi, 'ORTAK_BELIRTI'), talepDosyasi)
  const belirtiler = saglam(await yerelSabit(talepDosyasi, 'BELIRTILER'), talepDosyasi)
  {
    const aileler = adlardan(adlar, 'kod.DestekAilesi')
    const kategoriAileleri = K.marka.CATEGORIES.map((c) => K.marka.supportGroup({ category: c.id }))
    const beklenen = [...new Set([...Object.keys(belirtiler), ...kategoriAileleri, K.marka.supportGroup(null)])]
    if (!kumeEsit(aileler.map((a) => a.Kod), beklenen)) {
      dur(`kod-adlari.json: kod.DestekAilesi kodları (${aileler.map((a) => a.Kod)}) kaynakla tutmuyor (${beklenen})`)
    }
    L.push(kodListesi('kod.DestekAilesi', aileler))
  }
  {
    const tanim = eslesme.listeler['kod.Belirti']
    const en = K.talepAlanlariEn
    const sira = []
    const ekle = (etiket, ingilizce, yer) => {
      const kod = tanim.etiketler[etiket]
      if (!kod) dur(`kod-eslesmeleri.json: kod.Belirti için "${etiket}" (${yer}) kodu yok`)
      const var_ = sira.find((s) => s.Kod === kod)
      if (var_) {
        if (var_.Ad !== etiket) dur(`kod-eslesmeleri.json: kod.Belirti ${kod} iki farklı etikete veriliyor`)
        if (ingilizce && var_.en && var_.en !== ingilizce) dur(`talepAlanlari.en.js: ${etiket} iki farklı İngilizceyle geçiyor`)
        return
      }
      sira.push({ Kod: kod, Ad: etiket, en: ingilizce || null })
    }
    for (const [aile, dizi] of Object.entries(belirtiler)) dizi.forEach((e, i) => ekle(e, en.BELIRTILER_EN[aile]?.[i], `BELIRTILER.${aile}`))
    ortak.forEach((e, i) => ekle(e, en.ORTAK_BELIRTI_EN[i], 'ORTAK_BELIRTI'))
    ekle(K.talepAlanlari.PARCA_DIGER, en.DIGER_EN, 'PARCA_DIGER')
    const kullanilan = new Set(sira.map((s) => s.Ad))
    const fazla = Object.keys(tanim.etiketler).filter((e) => !kullanilan.has(e))
    if (fazla.length) dur(`kod-eslesmeleri.json: kod.Belirti kaynakta olmayan etiketler: ${fazla.join(', ')}`)
    L.push(
      kodListesi(
        'kod.Belirti',
        sira.map((s, i) => ({ Kod: s.Kod, Ad: s.Ad, Sira: i + 1 })),
        {
          ceviri: sira.filter((s) => s.en).map((s) => ({ Kod: s.Kod, AlanAdi: 'Ad', Metin: s.en })),
          eski: sira.map((s) => ({ EskiDeger: s.Ad, YeniKod: s.Kod, EslesmeNotu: `Eski veride ekran yazısı (${tanim.kaynak})` })),
        },
      ),
    )
  }

  L.push(etiketliListe(eslesme, 'kod.UrunTipi', K.talepAlanlari.URUN_TIPI, K.talepAlanlariEn.URUN_TIPI_EN))
  L.push(etiketliListe(eslesme, 'kod.Arazi', K.talepAlanlari.ARAZI, K.talepAlanlariEn.ARAZI_EN))
  L.push(etiketliListe(eslesme, 'kod.TraktorGucu', K.talepAlanlari.TRAKTOR, K.talepAlanlariEn.TRAKTOR_EN))

  /* kod.IptalNedeni — Talepler.jsx IPTAL_SEBEPLERI + Servisim IPTAL_NEDENLERI */
  {
    const tanim = eslesme.listeler['kod.IptalNedeni']
    const bo = 'src/backoffice/ekranlar/Talepler.jsx'
    const sv = 'src/servis/ekranlar/TalepDetay.jsx'
    const sebepler = saglam(await yerelSabit(bo, 'IPTAL_SEBEPLERI'), bo)
    const nedenler = saglam(await yerelSabit(sv, 'IPTAL_NEDENLERI'), sv)
    const l = etiketliListe(eslesme, 'kod.IptalNedeni', sebepler, null, { ek: [k('AciklamaZorunlu', 'bit')] })
    for (const n of nedenler) {
      const kod = tanim.servisimDegerleri[n.deger]
      if (!kod) dur(`kod-eslesmeleri.json: kod.IptalNedeni servisimDegerleri "${n.deger}" yok`)
      if (!l.satirlar.find((s) => s.Kod === kod)) {
        l.satirlar.push({ Kod: kod, Ad: n.neden, Sira: l.satirlar.length + 1, ...(tanim.bayraklar?.[kod] || {}) })
      }
      for (const eskiDeger of [n.deger, n.ad, n.neden]) {
        l.eski.push({ EskiDeger: eskiDeger, YeniKod: kod, EslesmeNotu: `Eski veride Servisim iptal nedeni (${sv} IPTAL_NEDENLERI)` })
      }
    }
    for (const s of adlardan(adlar, 'kod.IptalNedeni', ['AciklamaZorunlu'])) {
      if (l.satirlar.find((x) => x.Kod === s.Kod)) dur(`kod-adlari.json: kod.IptalNedeni.${s.Kod} kaynakta zaten var`)
      l.satirlar.push({ ...s, Sira: l.satirlar.length + 1 })
    }
    for (const s of l.satirlar) if (s.AciklamaZorunlu === undefined) s.AciklamaZorunlu = 0
    L.push(l)
  }

  /* kod.TeklifSonucu — Talepler.jsx KAPANIS_ALANLARI.satinalma sonuc seçenekleri */
  {
    const bo = 'src/backoffice/ekranlar/Talepler.jsx'
    const alanlar = await yerelSabit(bo, 'KAPANIS_ALANLARI')
    const sonuc = Array.isArray(alanlar.satinalma) && alanlar.satinalma.find((a) => sabitMi(a.ad) && a.ad === 'sonuc')
    if (!sonuc) dur(`${bo}: KAPANIS_ALANLARI.satinalma içinde "sonuc" alanı yok`)
    const secenek = saglam(sonuc.secenek, bo)
    const sozluk = await islevAtamalari('src/data/talepAlanlari.js', 'sozlukKur', 's')
    const l = etiketliListe(eslesme, 'kod.TeklifSonucu', secenek, secenek.map((e) => sozluk[e] || null), { ek: [k('FiyatZorunlu', 'bit')] })
    for (const s of l.satirlar) if (s.FiyatZorunlu === undefined) s.FiyatZorunlu = 0
    L.push(l)
  }

  /* kod.YapilanIs — servisKaydi.js YAPILAN_IS; İngilizcesi en.js talepDetay */
  {
    const tanim = eslesme.listeler['kod.YapilanIs']
    const l = etiketliListe(eslesme, 'kod.YapilanIs', K.servisKaydi.YAPILAN_IS, null)
    l.ceviri = l.satirlar.filter((s) => enAl(tanim.ingilizce[s.Kod] || '-')).map((s) => ({ Kod: s.Kod, AlanAdi: 'Ad', Metin: enAl(tanim.ingilizce[s.Kod]) }))
    for (const s of l.satirlar) {
      const trMetin = yolAl(K.tr, tanim.ingilizce[s.Kod], 'tr.js')
      if (trMetin !== s.Ad) dur(`kod-eslesmeleri.json: kod.YapilanIs.${s.Kod} ingilizce anahtarı başka bir Türkçe metnin (${trMetin})`)
    }
    L.push(l)
  }

  /* kod.ServisKapisi — servisKaydi.js KAPI */
  {
    const tanim = eslesme.listeler['kod.ServisKapisi']
    const satirlar = Object.entries(K.servisKaydi.KAPI).map(([kod, ad], i) => {
      if (!tanim.bayraklar[kod]) dur(`kod-eslesmeleri.json: kod.ServisKapisi.${kod} Eski bayrağı yok`)
      return { Kod: kod, Ad: ad, Sira: i + 1, Eski: tanim.bayraklar[kod].Eski }
    })
    L.push(kodListesi('kod.ServisKapisi', satirlar, { ek: [k('Eski', 'bit')] }))
  }

  /* kod.ZiyaretAsamasi */
  {
    const satirlar = adlardan(adlar, 'kod.ZiyaretAsamasi')
    for (const a of Object.values(K.servisKaydi.ASAMA)) if (!satirlar.find((s) => s.Kod === a)) dur(`kod-adlari.json: kod.ZiyaretAsamasi ${a} (servisKaydi.js ASAMA) yok`)
    L.push(kodListesi('kod.ZiyaretAsamasi', satirlar))
  }

  /* kod.UcretDurumu — servisKaydi.js UCRET_YAZI (yerel) */
  {
    const dosya = 'src/lib/servisKaydi.js'
    const tanim = eslesme.listeler['kod.UcretDurumu']
    const yazi = saglam(await yerelSabit(dosya, 'UCRET_YAZI'), dosya)
    const etiketler = [...new Set(Object.values(yazi))]
    const l = etiketliListe(eslesme, 'kod.UcretDurumu', etiketler, null)
    l.ceviri = l.satirlar.filter((s) => enAl(tanim.ingilizce[s.Kod] || '-')).map((s) => ({ Kod: s.Kod, AlanAdi: 'Ad', Metin: enAl(tanim.ingilizce[s.Kod]) }))
    L.push(l)
  }

  for (const t of ['kod.KapanisTuru']) L.push(kodListesi(t, adlardan(adlar, t)))

  /* kod.FaturaTuru — tr.js / en.js parcaOdeme */
  {
    const tanim = eslesme.listeler['kod.FaturaTuru']
    const satirlar = Object.entries(tanim.i18n).map(([kod, anahtar], i) => ({ Kod: kod, Ad: yolAl(K.tr, anahtar, 'tr.js'), Sira: i + 1 }))
    const ceviri = Object.entries(tanim.i18n).filter(([, a]) => enAl(a)).map(([kod, a]) => ({ Kod: kod, AlanAdi: 'Ad', Metin: enAl(a) }))
    L.push(kodListesi('kod.FaturaTuru', satirlar, { ceviri }))
  }

  for (const t of ['kod.OdemeYontemi', 'kod.HakEdisDurumu', 'kod.Birim', 'kod.HakEdisKalemTuru']) L.push(kodListesi(t, adlardan(adlar, t)))
  L.push(kodListesi('kod.HesapHareketTuru', adlardan(adlar, 'kod.HesapHareketTuru', ['YonKodu']), { ek: [k('YonKodu', KOD40)] }))
  L.push(kodListesi('kod.DonemDokumuDurumu', adlardan(adlar, 'kod.DonemDokumuDurumu')))

  /* kod.HedefKitle — Duyurular.jsx KIMLER (yerel) */
  {
    const dosya = 'src/backoffice/ekranlar/Duyurular.jsx'
    const kimler = await yerelSabit(dosya, 'KIMLER')
    L.push(kodListesi('kod.HedefKitle', kimler.map((x, i) => ({ Kod: saglam(x.id, dosya), Ad: saglam(x.ad, dosya), Sira: i + 1 }))))
  }

  /* kod.DuyuruTuru, kod.DuyuruAltTuru — duyuruTurleri.js */
  L.push(kodListesi('kod.DuyuruTuru', K.duyuru.DUYURU_UST.map((x, i) => ({ Kod: x.id, Ad: x.ad, Sira: i + 1 }))))
  {
    const satirlar = K.duyuru.DUYURU_ALT.map((x, i) => ({
      Kod: x.id,
      Ad: x.ad,
      Sira: i + 1,
      UstTurKodu: x.ust,
      VarsayilanHedefKitleKodu: x.varsayilanKime,
      KilitliHedefKitleKodu: x.kilitliKime || null,
      Ton: x.ton || null,
      Ikon: x.ikon || null,
    }))
    const ceviri = K.duyuru.DUYURU_ALT.filter((x) => enAl(x.anahtar)).map((x) => ({ Kod: x.id, AlanAdi: 'Ad', Metin: enAl(x.anahtar) }))
    L.push(
      kodListesi('kod.DuyuruAltTuru', satirlar, {
        ek: [k('UstTurKodu', KOD40), k('VarsayilanHedefKitleKodu', KOD40), k('KilitliHedefKitleKodu', KOD40), k('Ton', 'nvarchar(20)'), k('Ikon', KOD40)],
        ceviri,
      }),
    )
  }

  for (const t of ['kod.BildirimTuru', 'kod.AliciTuru', 'kod.KararDurumu', 'kod.DestekOlayTuru', 'kod.DosyaTuru']) L.push(kodListesi(t, adlardan(adlar, t)))

  /* kod.ServisTuru — servisler.js SERVIS_TURU */
  L.push(kodListesi('kod.ServisTuru', Object.entries(K.marka.SERVIS_TURU).map(([kod, ad], i) => ({ Kod: kod, Ad: ad, Sira: i + 1 }))))

  for (const t of ['kod.FirmaDurumu', 'kod.KisiRolu', 'kod.SahiplikBitisNedeni']) L.push(kodListesi(t, adlardan(adlar, t)))

  /* kod.RizaMetni — kvkk.js METINLER kisaAd */
  L.push(
    kodListesi(
      'kod.RizaMetni',
      K.kvkk.METINLER.map((m, i) => ({ Kod: m.id, Ad: m.kisaAd, Sira: i + 1 })),
      {
        ceviri: K.kvkk.METINLER.map((m) => ({ Kod: m.id, AlanAdi: 'Ad', Metin: K.kvkk.metinDilde(m, 'en').kisaAd })).filter(
          (c, i) => c.Metin && c.Metin !== K.kvkk.METINLER[i].kisaAd,
        ),
      },
    ),
  )

  for (const t of ['kod.RizaSecimi', 'kod.RizaKanali']) L.push(kodListesi(t, adlardan(adlar, t)))

  /* kod.BildirimIzni — bildirim.js BILDIRIM değerleri */
  {
    const satirlar = adlardan(adlar, 'kod.BildirimIzni')
    const kaynak = Object.values(K.bildirim.BILDIRIM)
    if (!kumeEsit(satirlar.map((s) => s.Kod), kaynak)) dur(`kod-adlari.json: kod.BildirimIzni kodları bildirim.js BILDIRIM (${kaynak}) ile tutmuyor`)
    L.push(kodListesi('kod.BildirimIzni', satirlar))
  }

  for (const t of ['kod.BelgeTuru', 'kod.SatisTuru', 'kod.GarantiDayanagi', 'kod.GarantiBaslangicEsasi', 'kod.SeriKurali']) L.push(kodListesi(t, adlardan(adlar, t)))
  L.push(kodListesi('kod.KargoFirmasi', adlardan(adlar, 'kod.KargoFirmasi', ['DisSistemKodu']), { ek: [k('DisSistemKodu', KOD40)] }))
  for (const t of ['kod.KvkkBasvuruTuru', 'kod.IceAktarimTuru']) L.push(kodListesi(t, adlardan(adlar, t)))

  /* ---- bağlar */
  const numaraOnekleri = Object.entries(eslesme.numaraOnekleri)
    .filter(([o]) => !o.startsWith('_'))
    .map(([Onek, KayitTuruKodu]) => ({ Onek, KayitTuruKodu }))
  for (const t of Object.values(K.talep.TALEP_TURLERI)) {
    if (!numaraOnekleri.find((n) => n.Onek === t.onek && n.KayitTuruKodu === 'talep')) dur(`kod-eslesmeleri.json: numaraOnekleri ${t.onek} (talep.js ${t.id}) talep türüyle yok`)
  }
  const kayitTuru = kodlar('kod.KayitTuru')
  for (const n of numaraOnekleri) if (!kayitTuru.has(n.KayitTuruKodu)) dur(`kod-eslesmeleri.json: numaraOnekleri ${n.Onek} kayıt türü ${n.KayitTuruKodu} yok`)

  const tur = kodlar('kod.TalepTuru')
  const kaynak = kodlar('kod.TalepKaynagi')
  const numaraKurallari = eslesme.talepNumaraKurallari.map((x) => ({ ...x, MarkaKodu: null }))
  for (const r of numaraKurallari) {
    if (!tur.has(r.TurKodu) || !kaynak.has(r.KaynakKodu) || !numaraOnekleri.find((n) => n.Onek === r.NumaraOneki && n.KayitTuruKodu === 'talep')) {
      dur(`kod-eslesmeleri.json: talepNumaraKurallari ${JSON.stringify(r)} tanımsız kod içeriyor`)
    }
  }
  tekilDenetle(numaraKurallari, ['TurKodu', 'KaynakKodu'], 'talepNumaraKurallari (genel satırda tür+kaynak tekil)')

  const uydular = eslesme.talepTuruUydulari
  for (const u of uydular) if (!tur.has(u.TurKodu)) dur(`kod-eslesmeleri.json: talepTuruUydulari ${u.TurKodu} yok`)

  const durum = kodlar('kod.TalepDurumu')
  const turDurum = []
  for (const t of Object.values(K.talep.TALEP_TURLERI)) {
    const elle = new Set(K.veri.elleSecilebilirDurumlar(t.id).map((d) => d.id))
    for (const d of K.veri.talepDurumlari(t.id)) turDurum.push({ TurKodu: t.id, DurumKodu: d.id, ElleSecilebilir: elle.has(d.id) ? 1 : 0 })
    for (const d of eslesme.akisDurumlari[t.id] || []) turDurum.push({ TurKodu: t.id, DurumKodu: d, ElleSecilebilir: 0 })
  }
  for (const x of turDurum) if (!durum.has(x.DurumKodu)) dur(`TalepTuruDurumu: ${x.TurKodu}/${x.DurumKodu} durumu yok`)

  /* ---- T01 dışındaki listeler (eski değer eşleşmesi için)

     kod.EskiDegerEslesmesi.ListeAdi <sema>.<Tablo> biçimindedir ve kod
     şemasıyla sınırlı değildir; satırların hepsi T01'de yazılır (tasarim.md
     5.2 T01). Erişim izinleri T03'te üretilir ama adı ya da kodu değişen
     iznin eski kodu da bu tabloyla taşınır (tasarim.md 5.2 T03; T03 başlığı).
     Kodları burada bir kez daha hesaplayıp YeniKod'u onlara karşı doğrularız;
     erisimIzinVerisi saf bir işlevdir, T03 de aynısını çağırır. */
  const erisimIzin = erisimIzinVerisi(K, eslesme)
  const disListeler = new Map([
    ['erisim.IzinGrubu', new Set(erisimIzin.grup.map((g) => g.Kod))],
    ['erisim.Izin', new Set(erisimIzin.izin.map((x) => x.Kod))],
  ])
  const disEski = [...erisimIzin.eski]

  /* ---- eski değerler (kod-eslesmeleri.json eskiDegerler) */
  for (const [tablo, degerler] of Object.entries(eslesme.eskiDegerler)) {
    const l = liste(tablo)
    const disKodlar = disListeler.get(tablo)
    if (!l && !disKodlar) {
      dur(`kod-eslesmeleri.json: eskiDegerler ${tablo} bilinen bir listede yok (T01 kod listeleri ya da ${[...disListeler.keys()].join(', ')})`)
    }
    for (const [eskiDeger, x] of Object.entries(degerler)) {
      if (l) l.eski.push({ EskiDeger: eskiDeger, YeniKod: x.YeniKod, EslesmeNotu: x.Not })
      else disEski.push({ ListeAdi: tablo, EskiDeger: eskiDeger, YeniKod: x.YeniKod, EslesmeNotu: x.Not || null })
    }
  }

  /* T01 listelerininki aşağıda (l.eski döngüsü); bunlar orada denetlenmiyor */
  const disEskiler = new Map()
  for (const e of disEski) {
    const kodSet = disListeler.get(e.ListeAdi)
    if (!kodSet.has(e.YeniKod)) dur(`${e.ListeAdi}: eski değer "${e.EskiDeger}" → ${e.YeniKod} listede yok`)
    const anahtar = `${e.ListeAdi}|${e.EskiDeger}`
    const onceki = disEskiler.get(anahtar)
    if (onceki && onceki.YeniKod !== e.YeniKod) {
      dur(`${e.ListeAdi}: eski değer "${e.EskiDeger}" iki koda gidiyor (${onceki.YeniKod}, ${e.YeniKod})`)
    }
    if (!onceki) disEskiler.set(anahtar, e)
  }

  /* ---- denetimler */
  for (const l of L) {
    const kodTipiUzunluk = metinUzunlugu(l.kodTipi)
    for (const s of l.satirlar) {
      if (typeof s.Kod !== 'string' || s.Kod.length < 2 || s.Kod.length > kodTipiUzunluk || /[^A-Za-z0-9]/.test(s.Kod)) {
        dur(`${l.tablo}: kod biçime uymuyor "${s.Kod}" (en az 2, yalnız İngilizce harf ve rakam)`)
      }
      if (typeof s.Ad !== 'string' || !s.Ad.trim()) dur(`${l.tablo}.${s.Kod}: Ad boş`)
    }
    tekilDenetle(l.satirlar, ['Kod'], l.tablo)
    const kodSet = new Set(l.satirlar.map((s) => s.Kod))
    for (const c of l.ceviri) if (!kodSet.has(c.Kod)) dur(`${l.tablo}: çeviri kodu ${c.Kod} listede yok`)
    const eskiler = new Map()
    for (const e of l.eski) {
      if (!kodSet.has(e.YeniKod)) dur(`${l.tablo}: eski değer "${e.EskiDeger}" → ${e.YeniKod} listede yok`)
      const onceki = eskiler.get(e.EskiDeger)
      if (onceki && onceki.YeniKod !== e.YeniKod) dur(`${l.tablo}: eski değer "${e.EskiDeger}" iki koda gidiyor (${onceki.YeniKod}, ${e.YeniKod})`)
      if (!onceki) eskiler.set(e.EskiDeger, e)
    }
    l.eski = [...eskiler.values()]
  }
  const hedefKitle = kodlar('kod.HedefKitle')
  const ustTur = kodlar('kod.DuyuruTuru')
  for (const s of liste('kod.DuyuruAltTuru').satirlar) {
    if (!ustTur.has(s.UstTurKodu) || !hedefKitle.has(s.VarsayilanHedefKitleKodu) || (s.KilitliHedefKitleKodu && !hedefKitle.has(s.KilitliHedefKitleKodu))) {
      dur(`kod.DuyuruAltTuru.${s.Kod}: tanımsız üst tür ya da hedef kitle`)
    }
  }
  const pasif = []
  for (const [tablo, kodListe] of Object.entries(eslesme.pasif)) {
    const l = liste(tablo)
    if (!l) dur(`kod-eslesmeleri.json: pasif ${tablo} T01'de yok`)
    for (const kod of kodListe) if (!l.satirlar.find((s) => s.Kod === kod)) dur(`kod-eslesmeleri.json: pasif ${tablo}.${kod} listede yok`)
    pasif.push({ tablo, kodlar: kodListe })
  }

  return { L, numaraOnekleri, numaraKurallari, uydular, turDurum, pasif, belirtiler, ortak, disEski: [...disEskiler.values()] }
}

function t01Yaz(v) {
  const bolumler = []
  const kodMerge = (l) =>
    mergeYaz({
      tablo: l.tablo,
      kolonlar: [k('Kod', l.kodTipi), k('Ad', AD150), k('Sira', 'smallint'), ...l.ek],
      anahtar: ['Kod'],
      guncellenen: ['Ad', 'Sira', ...l.ek.map((e) => e.ad)],
      sabitEkleme: { Aktif: '1' },
      satirlar: l.satirlar,
    })
  /* FK sırası: önce bağlanılan listeler. */
  const sira = [
    'kod.Dil', 'kod.ParaBirimi', 'kod.KayitTuru',
  ]
  const yazildi = new Set()
  const listeYaz = (tablo) => {
    bolumler.push(kodMerge(v.L.find((l) => l.tablo === tablo)))
    yazildi.add(tablo)
  }
  sira.forEach(listeYaz)
  bolumler.push(
    mergeYaz({
      tablo: 'sistem.NumaraOneki',
      kolonlar: [k('Onek', 'nvarchar(3)'), k('KayitTuruKodu', KOD40)],
      anahtar: ['Onek'],
      guncellenen: ['KayitTuruKodu'],
      sabitEkleme: { Aktif: '1' },
      satirlar: v.numaraOnekleri,
    }),
  )
  const sonraGelenler = {
    'kod.IslemTuru': ['kod.IslemKategorisi'],
    'kod.Masa': ['kod.TalepTuru'],
    'kod.DuyuruAltTuru': ['kod.DuyuruTuru', 'kod.HedefKitle'],
    'kod.KargoFirmasi': ['kod.DisSistem'],
  }
  const kalan = v.L.map((l) => l.tablo).filter((t) => !yazildi.has(t))
  while (kalan.length) {
    const i = kalan.findIndex((t) => (sonraGelenler[t] || []).every((o) => yazildi.has(o)))
    if (i < 0) dur('T01: liste sırası çözülemedi')
    listeYaz(kalan.splice(i, 1)[0])
  }
  bolumler.push(
    mergeYaz({
      tablo: 'kod.TalepNumaraKurali',
      kolonlar: [k('TurKodu', KOD40), k('KaynakKodu', KOD40), k('NumaraOneki', 'nvarchar(3)')],
      anahtar: ['TurKodu', 'KaynakKodu', 'NumaraOneki'],
      guncellenen: [],
      hedefSuzgec: 'MarkaKodu IS NULL',
      satirlar: v.numaraKurallari,
      not: 'genel satırlar (MarkaKodu boş); markaya özgü satırlara dokunulmaz',
    }),
  )
  bolumler.push(
    mergeYaz({
      tablo: 'kod.TalepTuruDurumu',
      kolonlar: [k('TurKodu', KOD40), k('DurumKodu', KOD40), k('ElleSecilebilir', 'bit')],
      anahtar: ['TurKodu', 'DurumKodu'],
      guncellenen: ['ElleSecilebilir'],
      satirlar: v.turDurum,
    }),
  )
  bolumler.push(
    mergeYaz({
      tablo: 'kod.TalepTuruUydusu',
      kolonlar: [k('TurKodu', KOD40), k('UyduKodu', KOD40)],
      anahtar: ['TurKodu', 'UyduKodu'],
      guncellenen: [],
      satirlar: v.uydular,
    }),
  )
  const ceviri = v.L.flatMap((l) => l.ceviri.map((c) => ({ ListeAdi: l.tablo, Kod: c.Kod, AlanAdi: c.AlanAdi, DilKodu: 'en', Metin: c.Metin })))
  bolumler.push(ceviriMerge(ceviri, 'kod listeleri'))
  const eski = [
    ...v.L.flatMap((l) => l.eski.map((e) => ({ ListeAdi: l.tablo, EskiDeger: e.EskiDeger, YeniKod: e.YeniKod, EslesmeNotu: e.EslesmeNotu || null }))),
    ...v.disEski,
  ]
  bolumler.push(
    mergeYaz({
      tablo: 'kod.EskiDegerEslesmesi',
      kolonlar: [k('ListeAdi', 'nvarchar(128)'), k('EskiDeger', 'nvarchar(200)'), k('YeniKod', 'nvarchar(60)'), k('EslesmeNotu', 'nvarchar(400)')],
      anahtar: ['ListeAdi', 'EskiDeger'],
      guncellenen: ['YeniKod', 'EslesmeNotu'],
      satirlar: eski,
    }),
  )
  for (const p of v.pasif) {
    bolumler.push(
      `/* ${p.tablo} — kod-eslesmeleri.json "pasif" kaydı */\nUPDATE ${p.tablo} SET Aktif = 0\nWHERE Kod IN (${p.kodlar.map((x) => metinSql(x)).join(', ')}) AND Aktif = 1;\n`,
    )
  }
  const satirSayisi = v.L.reduce((t, l) => t + l.satirlar.length, 0)
  return (
    betikBasligi('T01 — kod listeleri, numara önekleri, çeviri ve eski değer eşleşmesi', [
      `${v.L.length} kod listesi, ${satirSayisi} kod; ${ceviri.length} çeviri; ${eski.length} eski değer eşleşmesi.`,
      '',
      'Kaynak: src/lib/talep.js, src/backoffice/veri.js, src/data/talepAlanlari.js',
      '(+ .en.js), src/backoffice/ekranlar/Talepler.jsx, IslemKaydi.jsx,',
      'Duyurular.jsx, src/servis/ekranlar/TalepDetay.jsx, src/lib/servisKaydi.js,',
      'src/data/duyuruTurleri.js, src/lib/bildirim.js, src/data/kvkk.js,',
      'src/marka (SERVIS_TURU, PARA_BIRIMI), src/i18n; tohum/kaynak/kod-eslesmeleri.json,',
      'kod-adlari.json. Tasarım: veritabani/tasarim.md 1.15, 5.2.',
      '',
      'Kod listelerinde kaynakta olmayan satır pasifleştirilmez ve silinmez;',
      'pasifleştirme yalnız kod-eslesmeleri.json "pasif" kaydından gelir.',
      'Aktif ve Aciklama kolonlarına tohum eklemeden sonra dokunmaz.',
    ]) +
    '\n' +
    bolumler.join('\n')
  )
}

function ceviriMerge(satirlar, not) {
  return mergeYaz({
    tablo: 'kod.Ceviri',
    kolonlar: [k('ListeAdi', 'nvarchar(128)'), k('Kod', 'nvarchar(60)'), k('AlanAdi', KOD40), k('DilKodu', 'nvarchar(5)'), k('Metin', 'nvarchar(1000)')],
    anahtar: ['ListeAdi', 'Kod', 'AlanAdi', 'DilKodu'],
    guncellenen: ['Metin'],
    satirlar,
    not,
  })
}

/* ============================================================ T02 */

function t02Yaz(K) {
  const { ULKELER } = K.ulkeler
  const ilPlaka = kaynakJson('il-plaka.json')
  const ilceKodlari = kaynakJson('ilce-kodlari.json')
  const iller = K.iller.ILLER
  if (iller.length !== 81 || ilPlaka.length !== 81) dur(`il sayısı 81 değil (iller.js ${iller.length}, il-plaka.json ${ilPlaka.length})`)
  const plaka = new Map(ilPlaka.map((x) => [x.Ad, x.IlKodu]))
  for (const il of iller) if (!plaka.has(il)) dur(`il-plaka.json: "${il}" (iller.js) eşleşmiyor`)
  const kodlar = ilPlaka.map((x) => x.IlKodu)
  if (new Set(kodlar).size !== 81 || kodlar.some((x) => !Number.isInteger(x) || x < 1 || x > 81)) dur('il-plaka.json: IlKodu 1–81 arasında ve tekil olmalı')

  /* ISO 3166-1'in kullanıcıya ayrılmış kodları (AA, QM–QZ, XA–XZ, ZZ)
     resmî ülke kodu değildir (Kosova XK). */
  const resmiDegil = /^(AA|Q[M-Z]|X[A-Z]|ZZ)$/
  const ulke = ULKELER.map((u, i) => ({
    Kod: u.iso,
    Ad: u.ad,
    TelefonKodu: u.kod,
    TelefonHaneSayisi: u.hane ?? null,
    ResmiIso: resmiDegil.test(u.iso) ? 0 : 1,
    BolgeListesiVar: K.bolgeler.bolgeListesiVarMi(u.iso) ? 1 : 0,
    Sira: i + 1,
  }))
  const ulkeKodlari = new Set(ulke.map((u) => u.Kod))
  const bolge = []
  for (const [iso, dizi] of Object.entries(K.bolgeler.BOLGELER)) {
    if (!ulkeKodlari.has(iso)) dur(`bolgeler.js: ${iso} ülke listesinde yok`)
    dizi.forEach((ad, i) => bolge.push({ UlkeKodu: iso, Ad: ad, Sira: i + 1 }))
  }
  const ceviri = ULKELER.filter((u) => K.ulkelerEn.ULKE_ADI_EN[u.iso]).map((u) => ({
    ListeAdi: 'cografya.Ulke',
    Kod: u.iso,
    AlanAdi: 'Ad',
    DilKodu: 'en',
    Metin: K.ulkelerEn.ULKE_ADI_EN[u.iso],
  }))

  const kayitli = new Map(ilceKodlari.map((x) => [`${x.IlKodu}|${x.Ad}`, x]))
  const ilce = []
  const eksik = []
  for (const il of iller) {
    for (const ad of K.iller.ILCELER[il] || []) {
      const x = kayitli.get(`${plaka.get(il)}|${ad}`)
      if (!x) eksik.push(`${il}/${ad}`)
      else ilce.push({ IlceKodu: x.IlceKodu, Ad: ad, IlKodu: x.IlKodu, ResmiIlceKodu: x.ResmiIlceKodu ?? null })
    }
  }
  if (eksik.length) dur(`ilce-kodlari.json: kaynakta olup kodu verilmemiş ilçe (yeni kodu sıradaki numarayla ekleyin): ${eksik.slice(0, 10).join(', ')}`)
  const numaralar = ilceKodlari.map((x) => x.IlceKodu)
  if (new Set(numaralar).size !== numaralar.length) dur('ilce-kodlari.json: IlceKodu tekrarlanıyor')
  for (const x of ilceKodlari) if (Math.floor(x.IlceKodu / 1000) !== x.IlKodu || x.IlceKodu % 1000 < 1) dur(`ilce-kodlari.json: ${x.Ad} kodu ${x.IlceKodu} ilin plaka kodundan türemiyor`)
  const kaynakDisi = ilceKodlari.length - ilce.length

  return (
    betikBasligi('T02 — coğrafya: ülke, il, ilçe, yurt dışı bölge', [
      `${ulke.length} ülke (${ceviri.length} İngilizce ad), 81 il, ${ilce.length} ilçe, ${bolge.length} yurt dışı bölge.`,
      '',
      'Kaynak: src/data/ulkeler.js (+ .en.js), src/data/iller.js, src/data/bolgeler.js;',
      'tohum/kaynak/il-plaka.json (il → plaka kodu), ilce-kodlari.json (kalıcı ilçe',
      'kodu = plaka × 1000 + sıra; yeniden numaralanmaz, yalnız eklenir).',
      'Resmî ilçe kodu kaynakta yok, boş kalır. Tasarım: tasarim.md 5.2 T02.',
      kaynakDisi ? `ilce-kodlari.json'da kaynakta artık bulunmayan ${kaynakDisi} ilçe yazılmadı (satırı silinmez).` : '',
      '',
      'Kaynakta olmayan satır pasifleştirilmez ve silinmez.',
    ]) +
    '\n' +
    [
      mergeYaz({
        tablo: 'cografya.Ulke',
        kolonlar: [k('Kod', 'nvarchar(2)'), k('Ad', 'nvarchar(100)'), k('TelefonKodu', 'nvarchar(5)'), k('TelefonHaneSayisi', 'tinyint'), k('ResmiIso', 'bit'), k('BolgeListesiVar', 'bit'), k('Sira', 'smallint')],
        anahtar: ['Kod'],
        guncellenen: ['Ad', 'TelefonKodu', 'TelefonHaneSayisi', 'ResmiIso', 'BolgeListesiVar', 'Sira'],
        satirlar: ulke,
      }),
      ceviriMerge(ceviri, 'ülke adları'),
      mergeYaz({
        tablo: 'cografya.Il',
        kolonlar: [k('IlKodu', 'tinyint'), k('Ad', 'nvarchar(50)')],
        anahtar: ['IlKodu'],
        guncellenen: ['Ad'],
        satirlar: ilPlaka.map((x) => ({ IlKodu: x.IlKodu, Ad: x.Ad })),
      }),
      mergeYaz({
        tablo: 'cografya.Ilce',
        kolonlar: [k('IlceKodu', 'int'), k('Ad', 'nvarchar(60)'), k('IlKodu', 'tinyint'), k('ResmiIlceKodu', 'nvarchar(10)')],
        anahtar: ['IlceKodu'],
        guncellenen: ['Ad', 'ResmiIlceKodu'],
        satirlar: ilce,
      }),
      mergeYaz({
        tablo: 'cografya.YurtdisiBolge',
        kolonlar: [k('UlkeKodu', 'nvarchar(2)'), k('Ad', 'nvarchar(100)'), k('Sira', 'smallint')],
        anahtar: ['UlkeKodu', 'Ad'],
        guncellenen: ['Sira'],
        satirlar: bolge,
      }),
    ].join('\n')
  )
}

/* ============================================================ T03 */

/* T03'ün satırları. T01 de çağırır: kod.EskiDegerEslesmesi T01'in tablosudur,
   bu yüzden izin gruplarının etiket eşleşmeleri ve eskiDegerler'deki
   erisim.* satırları orada yazılır. Saf işlev; iki kez çağrılması sakıncasız. */
function erisimIzinVerisi(K, eslesme) {
  const tanim = eslesme.listeler['erisim.IzinGrubu']
  if (!tanim?.etiketler) dur('kod-eslesmeleri.json: erisim.IzinGrubu etiketleri yok')
  const grup = []
  const izin = []
  const eski = []
  K.yetkiler.YETKI_KATALOG.forEach((g, i) => {
    const kod = tanim.etiketler[g.grup]
    if (!kod) dur(`kod-eslesmeleri.json: erisim.IzinGrubu "${g.grup}" kodu yok`)
    grup.push({ Kod: kod, Ad: g.grup, Sira: i + 1 })
    /* kod-eslesmeleri.json _aciklama: etiketler eski veride saklandığı için
       kod.EskiDegerEslesmesi'ne de girer (etiketliListe kod listelerinde
       aynısını yapar). */
    eski.push({ ListeAdi: 'erisim.IzinGrubu', EskiDeger: g.grup, YeniKod: kod, EslesmeNotu: `Eski veride ekran yazısı (${tanim.kaynak})` })
    g.izinler.forEach((x, j) => izin.push({ Kod: x.id, Ad: x.ad, GrupKodu: kod, Sira: j + 1 }))
  })
  for (const s of [...grup, ...izin]) if (s.Kod.length < 2 || /[^A-Za-z0-9]/.test(s.Kod)) dur(`yetkiler.js: izin kodu biçime uymuyor "${s.Kod}"`)
  return { grup, izin, eski }
}

function t03Yaz(K, eslesme) {
  const { grup, izin } = erisimIzinVerisi(K, eslesme)
  return (
    betikBasligi('T03 — erişim izin grupları ve izinler', [
      `${grup.length} izin grubu, ${izin.length} izin.`,
      '',
      'Kaynak: src/data/yetkiler.js YETKI_KATALOG; grup kodları',
      'tohum/kaynak/kod-eslesmeleri.json. Tasarım: tasarim.md 5.2 T03.',
      'Kaynakta olmayan izin pasifleştirilmez; adı değişen iznin eski kodu',
      'kod.EskiDegerEslesmesi (ListeAdi = erisim.Izin) ile taşınır: kaynağı',
      'kod-eslesmeleri.json eskiDegerler, satırları T01 yazar.',
    ]) +
    '\n' +
    [
      mergeYaz({
        tablo: 'erisim.IzinGrubu',
        kolonlar: [k('Kod', KOD40), k('Ad', 'nvarchar(150)'), k('Sira', 'smallint')],
        anahtar: ['Kod'],
        guncellenen: ['Ad', 'Sira'],
        sabitEkleme: { Aktif: '1' },
        satirlar: grup,
      }),
      mergeYaz({
        tablo: 'erisim.Izin',
        kolonlar: [k('Kod', KOD40), k('Ad', 'nvarchar(200)'), k('GrupKodu', KOD40), k('Sira', 'smallint')],
        anahtar: ['Kod'],
        guncellenen: ['Ad', 'GrupKodu', 'Sira'],
        sabitEkleme: { Aktif: '1' },
        satirlar: izin,
      }),
    ].join('\n')
  )
}

/* ============================================================ T04 */

function telefonBicimleri(ham, ulkeler, yer) {
  if (!ham) return { e164: null, ulusal: null }
  const rakam = String(ham).replace(/[^\d+]/g, '')
  if (rakam.startsWith('+')) {
    const aday = ulkeler
      .map((u) => u.kod)
      .filter((kod) => rakam.startsWith(kod))
      .sort((a, b) => b.length - a.length)[0]
    if (!aday) dur(`${yer}: ${ham} hiçbir ülke koduyla başlamıyor`)
    return { e164: rakam, ulusal: rakam.slice(aday.length) }
  }
  const varsayilan = ulkeler.find((u) => u.iso === 'TR')
  return { e164: varsayilan.kod + rakam, ulusal: rakam }
}

function t04Yaz(K, markalar) {
  const { SIRKET, UYGULAMA, BANKA } = K.marka
  const ulkeler = K.ulkeler.ULKELER
  const sirketKodlari = [...new Set(markalar.map((m) => m.SirketKodu))]
  if (sirketKodlari.length !== 1) dur('markalar.json: bugün tek src/marka klasörü ve tek şirket okunabiliyor')
  const kod = sirketKodlari[0]
  if (!/^[a-z]{2,20}$/.test(kod)) dur(`markalar.json: şirket kodu biçime uymuyor "${kod}"`)
  const tel1 = telefonBicimleri(SIRKET.telefonHam, ulkeler, 'kimlik.js SIRKET.telefonHam')
  const tel2 = telefonBicimleri(SIRKET.telefon2Ham, ulkeler, 'kimlik.js SIRKET.telefon2Ham')
  const sirket = {
    Kod: kod,
    Ad: SIRKET.ad,
    KisaAd: SIRKET.kisaAd,
    Unvan: SIRKET.unvan,
    UygulamaAdi: UYGULAMA,
    KurulusYili: SIRKET.kurulus ?? null,
    VergiNo: null,
    VergiDairesi: null,
    LogoFirmaNo: null,
    TelefonMetni: SIRKET.telefon ?? null,
    IkinciTelefonMetni: SIRKET.telefon2 ?? null,
    FaksMetni: SIRKET.faks ?? null,
    Eposta: SIRKET.eposta ?? null,
    SiteUrl: SIRKET.site ?? null,
    SiteMetni: SIRKET.siteKisa ?? null,
    Adres: SIRKET.adres ?? null,
    IkinciAdres: SIRKET.adres2 ?? null,
    TelefonE164: tel1.e164,
    TelefonUlusal: tel1.ulusal,
    IkinciTelefonE164: tel2.e164,
    IkinciTelefonUlusal: tel2.ulusal,
  }
  const sirketKolonlari = [
    k('Kod', 'nvarchar(20)'), k('Ad', 'nvarchar(100)'), k('KisaAd', 'nvarchar(50)'), k('Unvan', 'nvarchar(250)'), k('UygulamaAdi', 'nvarchar(100)'),
    k('KurulusYili', 'smallint'), k('VergiNo', 'nvarchar(11)'), k('VergiDairesi', 'nvarchar(100)'), k('LogoFirmaNo', 'smallint'),
    k('TelefonMetni', 'nvarchar(30)'), k('IkinciTelefonMetni', 'nvarchar(30)'), k('FaksMetni', 'nvarchar(30)'), k('Eposta', 'nvarchar(254)'),
    k('SiteUrl', 'nvarchar(200)'), k('SiteMetni', 'nvarchar(100)'), k('Adres', 'nvarchar(500)'), k('IkinciAdres', 'nvarchar(500)'),
    k('TelefonE164', 'nvarchar(16)'), k('TelefonUlusal', 'nvarchar(15)'), k('IkinciTelefonE164', 'nvarchar(16)'), k('IkinciTelefonUlusal', 'nvarchar(15)'),
  ]
  /* VergiNo, VergiDairesi, LogoFirmaNo kaynakta yok: tohum onlara dokunmaz
     (PAKSAN sahip girişiyle doldurabilir; boş bir kaynak dolu değeri
     silmesin). */
  const guncellenen = sirketKolonlari.map((x) => x.ad).filter((a) => !['Kod', 'VergiNo', 'VergiDairesi', 'LogoFirmaNo'].includes(a))

  const paraKodu = paraBirimiKodu(K)
  const hesaplar = (BANKA.hesaplar || []).map((h, i) => ({
    SirketKodu: kod,
    Iban: String(h.iban || '').replace(/\s+/g, '').toUpperCase(),
    BankaAdi: h.banka,
    SubeAdi: h.sube || null,
    HesapUnvani: BANKA.unvan,
    Sira: i + 1,
    ParaBirimiKodu: paraKodu,
    Aktif: 1,
  }))
  const bolumler = [
    mergeYaz({
      tablo: 'sirket.Sirket',
      kolonlar: sirketKolonlari,
      anahtar: ['Kod'],
      guncellenen,
      hedefSuzgec: `Kod IN (${metinSql(kod)})`,
      satirlar: [sirket],
    }),
  ]
  if (hesaplar.length) {
    bolumler.push(
      mergeYaz({
        tablo: 'sirket.BankaHesabi',
        kolonlar: [k('SirketKodu', 'nvarchar(20)'), k('Iban', 'nvarchar(34)'), k('BankaAdi', 'nvarchar(100)'), k('SubeAdi', 'nvarchar(100)'), k('HesapUnvani', 'nvarchar(250)'), k('Sira', 'smallint'), k('ParaBirimiKodu', 'nvarchar(3)'), k('Aktif', 'bit')],
        anahtar: ['SirketKodu', 'Iban'],
        guncellenen: ['BankaAdi', 'SubeAdi', 'HesapUnvani', 'Sira', 'ParaBirimiKodu', 'Aktif'],
        hedefSuzgec: `SirketKodu IN (${metinSql(kod)})`,
        kaynakDisi: 'pasif',
        satirlar: hesaplar,
      }),
    )
  } else {
    bolumler.push(
      `/* sirket.BankaHesabi — kaynakta hesap yok (kimlik.js BANKA.hesaplar boş) */\nUPDATE sirket.BankaHesabi SET Aktif = 0\nWHERE SirketKodu IN (${metinSql(kod)}) AND Aktif = 1;\n`,
    )
  }
  return (
    betikBasligi('T04 — şirket ve banka hesapları', [
      `1 şirket (${kod}), ${hesaplar.length} banka hesabı.`,
      '',
      'Kaynak: src/marka/kimlik.js SIRKET, UYGULAMA, BANKA.hesaplar;',
      'şirket kodu tohum/kaynak/markalar.json. Tasarım: tasarim.md 5.2 T04.',
      'Hedef kaynaktaki şirket koduyla sınırlıdır. Kaynakta olmayan hesap',
      'Aktif = 0 olur, silinmez. VergiNo, VergiDairesi ve LogoFirmaNo kaynakta',
      'yok: eklemede boş yazılır, sonra tohum bu kolonlara dokunmaz.',
    ]) +
    '\n' +
    bolumler.join('\n')
  )
}

function paraBirimiKodu(K) {
  const eslesme = kaynakJson('kod-eslesmeleri.json')
  const eski = eslesme.eskiDegerler['kod.ParaBirimi']?.[K.marka.PARA_BIRIMI]
  return eski ? eski.YeniKod : K.marka.PARA_BIRIMI
}

/* ============================================================ T05 */

function sureSaniye(sure, yer) {
  if (sure === null || sure === undefined) return null
  const m = /^(?:(\d+):)?(\d+):(\d{2})$/.exec(sure)
  if (!m) dur(`${yer}: süre "${sure}" dd:ss biçiminde değil`)
  return Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

function dosyaYolu(yol) {
  if (!yol) return null
  if (/^(data:|blob:)/.test(yol)) dur(`Gömülü dosya yolu yazılamaz: ${String(yol).slice(0, 40)}`)
  return String(yol).replace(/^\//, '')
}

async function t05Yaz(K, markalar, v01) {
  const m = K.marka
  if (markalar.length !== 1) dur('markalar.json: bugün tek marka kaynağı (src/marka) okunabiliyor')
  const mk = markalar[0]
  if (mk.KaynakKlasoru !== 'src/marka') dur('markalar.json: KaynakKlasoru yalnız src/marka olabilir')
  const markaKodu = mk.MarkaKodu
  if (!/^[a-z]{2,20}$/.test(markaKodu)) dur(`markalar.json: marka kodu biçime uymuyor "${markaKodu}"`)
  const suzgec = `MarkaKodu IN (${metinSql(markaKodu)})`

  if (m.SIRKET.garantiYil !== K.serial.GARANTI_YIL) dur(`Garanti yılı iki kaynakta farklı: kimlik.js ${m.SIRKET.garantiYil}, serial.js ${K.serial.GARANTI_YIL}`)
  const paket = K.paket
  const marka = {
    Kod: markaKodu,
    Ad: m.MARKA,
    GarantiYil: K.serial.GARANTI_YIL,
    ServisIskontoOrani: m.PARCA_SERVIS_ISKONTO,
    KdvOrani: m.KDV_ORANI,
    KilavuzDilleri: Array.isArray(paket.supported_locales) ? paket.supported_locales.join(',') : null,
    GorselYolu: dosyaYolu(m.LOGO_DOSYASI),
    SiteUrl: m.SIRKET.site ?? null,
    SiteMetni: m.SIRKET.siteKisa ?? null,
    KaynakNotu:
      'Garanti yılı: src/marka/kimlik.js SIRKET.garantiYil ve src/lib/serial.js GARANTI_YIL. İskonto: src/marka/katalog/makineFiyat.js PARCA_SERVIS_ISKONTO. KDV ve para birimi: src/marka/katalog/para.js (fiyat listesinin KDV esası doğrulanmadı). Seri kuralı: tohum/kaynak/markalar.json.',
    SirketKodu: mk.SirketKodu,
    GarantiBaslangicEsasiKodu: mk.GarantiBaslangicEsasiKodu ?? null,
    SeriKuraliKodu: mk.SeriKuraliKodu,
    ParaBirimiKodu: paraBirimiKodu(K),
    KilavuzPaketiKodu: paket.package_type || null,
    Aktif: 1,
  }
  const kodSet = (t) => new Set(v01.L.find((l) => l.tablo === t).satirlar.map((s) => s.Kod))
  if (!kodSet('kod.SeriKurali').has(marka.SeriKuraliKodu)) dur(`markalar.json: SeriKuraliKodu ${marka.SeriKuraliKodu} kod.SeriKurali'nda yok`)
  if (marka.GarantiBaslangicEsasiKodu && !kodSet('kod.GarantiBaslangicEsasi').has(marka.GarantiBaslangicEsasiKodu)) dur('markalar.json: GarantiBaslangicEsasiKodu tanımsız')

  /* Kategori */
  const aileler = kodSet('kod.DestekAilesi')
  const kategori = m.CATEGORIES.map((c, i) => {
    const aile = m.supportGroup({ category: c.id })
    if (!aileler.has(aile)) dur(`products.js: ${c.id} ailesi ${aile} kod.DestekAilesi'nde yok`)
    return { Kod: c.id, Ad: c.name, KisaAd: c.short, Ikon: c.icon, Sira: i + 1, DestekAilesiKodu: aile }
  })
  const kategoriCeviri = []
  for (const c of m.CATEGORIES) {
    const en = K.urunEn.KATEGORI_EN[c.id]
    if (en?.name) kategoriCeviri.push({ ListeAdi: 'katalog.Kategori', Kod: c.id, AlanAdi: 'Ad', DilKodu: 'en', Metin: en.name })
    if (en?.short) kategoriCeviri.push({ ListeAdi: 'katalog.Kategori', Kod: c.id, AlanAdi: 'KisaAd', DilKodu: 'en', Metin: en.short })
  }

  /* Bakım şablonları — products.js BAKIM (yerel) */
  const urunDosyasi = 'src/marka/katalog/products.js'
  const bakim = saglam(await yerelSabit(urunDosyasi, 'BAKIM'), urunDosyasi)
  const sablonMetni = new Map(Object.entries(bakim).map(([kod, adimlar]) => [JSON.stringify(adimlar), kod]))
  if (sablonMetni.size !== Object.keys(bakim).length) dur(`${urunDosyasi}: iki bakım şablonu birebir aynı; ürünün şablonu ayırt edilemez`)
  const sablon = Object.keys(bakim).map((kod) => ({ Kod: kod }))
  const adim = []
  const adimCeviri = []
  for (const [kod, adimlar] of Object.entries(bakim)) {
    for (const a of adimlar) {
      adim.push({ SablonKodu: kod, Saat: a.saat, Baslik: a.baslik, Detay: a.detay ?? null, Aktif: 1 })
      const en = K.urunEn.BAKIM_EN[a.baslik]
      if (en?.baslik) adimCeviri.push({ SablonKodu: kod, Saat: a.saat, DilKodu: 'en', Baslik: en.baslik, Detay: en.detay ?? null })
    }
  }

  /* Ürünler */
  const teknik = K.teknik.TEKNIK
  const kilavuz = K.kilavuz.URUN_KILAVUZU
  const urunKodlari = new Set(m.PRODUCTS.map((p) => p.id))
  for (const id of Object.keys(teknik)) if (!urunKodlari.has(id)) dur(`teknikOzellikler.js: ${id} katalogda yok`)
  for (const id of Object.keys(kilavuz)) if (!urunKodlari.has(id)) dur(`kilavuzEslesme.js: ${id} katalogda yok`)
  const kategoriKodlari = new Set(kategori.map((c) => c.Kod))
  const urun = []
  const urunCeviri = []
  const varyant = []
  const varyantCeviri = []
  const ozellik = []
  const ozellikCeviri = []
  const video = []
  const videoCeviri = []
  for (const p of m.PRODUCTS) {
    if (!kategoriKodlari.has(p.category)) dur(`products.js: ${p.id} kategorisi ${p.category} yok`)
    let sablonKodu = null
    if (p.bakim?.length) {
      sablonKodu = sablonMetni.get(JSON.stringify(p.bakim))
      if (!sablonKodu) dur(`products.js: ${p.id} bakım adımları hiçbir BAKIM şablonuyla birebir tutmuyor`)
    }
    const vitrin = m.VITRIN.indexOf(p.id)
    urun.push({
      MarkaKodu: markaKodu,
      Kod: p.id,
      Ad: p.name,
      Slogan: p.tagline ?? null,
      Aciklama: p.desc ?? null,
      SeriOneki: p.serialPrefix ?? null,
      VitrinSirasi: vitrin >= 0 ? vitrin + 1 : null,
      KilavuzUrl: p.manualUrl ?? null,
      TeknikKaynakUrl: teknik[p.id]?.kaynak ?? null,
      KategoriKodu: p.category,
      BakimSablonuKodu: sablonKodu,
      KilavuzKapsamKodu: kilavuz[p.id] ?? null,
      Aktif: 1,
    })
    const en = K.urunEn.URUN_EN[p.id] || {}
    const desc = K.urunEn.DESC_EN[p.id]
    if (en.name || en.tagline || desc) {
      urunCeviri.push({ MarkaKodu: markaKodu, UrunKodu: p.id, DilKodu: 'en', Ad: en.name ?? null, Slogan: en.tagline ?? null, Aciklama: desc ?? null })
    }
    /* Varyant: teknikOzellikler.js varyantlar (sitedeki model listesi);
       orada yoksa products.js variants (kart rozeti). İki kaynak aynı
       seçeneği farklı yazdığı için (4 m3 / 4 m³) birleştirilmez. */
    const teknikVaryant = (teknik[p.id]?.varyantlar || []).filter((x) => x && x.trim())
    const varyantlar = teknikVaryant.length ? teknikVaryant : (p.variants || []).filter((x) => x && x.trim())
    varyantlar.forEach((ad, i) => {
      varyant.push({ MarkaKodu: markaKodu, UrunKodu: p.id, Kod: ad, Ad: ad, Sira: i + 1, Aktif: 1 })
      const enAd = teknikVaryant.length ? K.teknikSozluk.TEKNIK_VARYANT_EN[ad] : K.urunEn.VARYANT_EN[ad]
      if (enAd) varyantCeviri.push({ MarkaKodu: markaKodu, UrunKodu: p.id, VaryantKodu: ad, DilKodu: 'en', Ad: enAd })
    })
    p.specs.forEach(([etiket, deger], i) => {
      ozellik.push({ MarkaKodu: markaKodu, UrunKodu: p.id, SiraNo: i + 1, Etiket: etiket, Deger: deger, Aktif: 1 })
      const enEtiket = K.urunEn.SPEC_EN[etiket]
      if (enEtiket) ozellikCeviri.push({ MarkaKodu: markaKodu, UrunKodu: p.id, SiraNo: i + 1, DilKodu: 'en', Etiket: enEtiket, Deger: K.urunEn.SPEC_DEGER_EN[deger] ?? null })
    })
    p.videos.forEach((x, i) => {
      if (!['tanitim', 'kullanim'].includes(x.type)) dur(`products.js: ${p.id} videosunun türü "${x.type}"`)
      video.push({
        MarkaKodu: markaKodu,
        UrunKodu: p.id,
        SiraNo: i + 1,
        Baslik: x.title,
        SureSaniye: sureSaniye(x.dur, `${p.id} video ${i + 1}`),
        Url: x.url ?? null,
        DosyaYolu: dosyaYolu(x.dosya),
        TurKodu: x.type,
        Aktif: 1,
      })
      const enBaslik = K.urunEn.VIDEO_EN[x.title]
      if (enBaslik) videoCeviri.push({ MarkaKodu: markaKodu, UrunKodu: p.id, SiraNo: i + 1, DilKodu: 'en', Baslik: enBaslik })
    })
  }

  /* kod.BelirtiKapsami — her aile: kendi belirtileri + ortak + diğer */
  const tanim = kaynakJson('kod-eslesmeleri.json').listeler['kod.Belirti']
  const belirtiKodu = (e) => tanim.etiketler[e] || dur(`kod-eslesmeleri.json: kod.Belirti "${e}" kodu yok`)
  const kapsam = []
  for (const aile of aileler) {
    const etiketler = K.talepAlanlari.belirtileriGetir(aile)
    const beklenen = [...(v01.belirtiler[aile] || []), ...v01.ortak, K.talepAlanlari.PARCA_DIGER]
    if (JSON.stringify(etiketler) !== JSON.stringify(beklenen)) dur(`talepAlanlari.js: belirtileriGetir(${aile}) sabitlerle tutmuyor`)
    etiketler.forEach((e, i) => kapsam.push({ MarkaKodu: markaKodu, DestekAilesiKodu: aile, BelirtiKodu: belirtiKodu(e), Sira: i + 1 }))
  }

  const bolumler = [
    mergeYaz({
      tablo: 'katalog.Marka',
      kolonlar: [
        k('Kod', 'nvarchar(20)'), k('Ad', 'nvarchar(100)'), k('GarantiYil', 'tinyint'), k('ServisIskontoOrani', 'decimal(7,4)'), k('KdvOrani', 'decimal(7,4)'),
        k('KilavuzDilleri', 'nvarchar(20)'), k('GorselYolu', 'nvarchar(260)'), k('SiteUrl', 'nvarchar(200)'), k('SiteMetni', 'nvarchar(100)'),
        k('KaynakNotu', 'nvarchar(1000)'), k('SirketKodu', 'nvarchar(20)'), k('GarantiBaslangicEsasiKodu', KOD40), k('SeriKuraliKodu', KOD40),
        k('ParaBirimiKodu', 'nvarchar(3)'), k('KilavuzPaketiKodu', 'nvarchar(60)'), k('Aktif', 'bit'),
      ],
      anahtar: ['Kod'],
      guncellenen: ['Ad', 'GarantiYil', 'ServisIskontoOrani', 'KdvOrani', 'KilavuzDilleri', 'GorselYolu', 'SiteUrl', 'SiteMetni', 'KaynakNotu', 'SirketKodu', 'GarantiBaslangicEsasiKodu', 'SeriKuraliKodu', 'ParaBirimiKodu', 'KilavuzPaketiKodu', 'Aktif'],
      hedefSuzgec: `Kod IN (${metinSql(markaKodu)})`,
      satirlar: [marka],
      not: 'Okunus, GarantiFaturaEkGun, AsinmaAnahtari, AmblemYolu, ParcaKatalogYolu kaynakta yok; tohum dokunmaz',
    }),
    mergeYaz({
      tablo: 'katalog.Kategori',
      kolonlar: [k('Kod', KOD40), k('Ad', 'nvarchar(100)'), k('KisaAd', 'nvarchar(50)'), k('Ikon', KOD40), k('Sira', 'smallint'), k('DestekAilesiKodu', KOD40)],
      anahtar: ['Kod'],
      guncellenen: ['Ad', 'KisaAd', 'Ikon', 'Sira', 'DestekAilesiKodu'],
      sabitEkleme: { Aktif: '1' },
      satirlar: kategori,
      not: 'markasız; kaynakta olmayan satıra dokunulmaz',
    }),
    ceviriMerge(kategoriCeviri, 'kategori adları'),
    mergeYaz({
      tablo: 'katalog.BakimSablonu',
      kolonlar: [k('Kod', KOD40)],
      anahtar: ['Kod'],
      guncellenen: [],
      sabitEkleme: { Aktif: '1' },
      satirlar: sablon,
      not: 'markasız',
    }),
    mergeYaz({
      tablo: 'katalog.BakimAdimi',
      kolonlar: [k('SablonKodu', KOD40), k('Saat', 'smallint'), k('Baslik', 'nvarchar(200)'), k('Detay', 'nvarchar(1000)'), k('Aktif', 'bit')],
      anahtar: ['SablonKodu', 'Saat'],
      guncellenen: ['Baslik', 'Detay', 'Aktif'],
      satirlar: adim,
      not: 'markasız',
    }),
    mergeYaz({
      tablo: 'katalog.BakimAdimiCevirisi',
      kolonlar: [k('SablonKodu', KOD40), k('Saat', 'smallint'), k('DilKodu', 'nvarchar(5)'), k('Baslik', 'nvarchar(200)'), k('Detay', 'nvarchar(1000)')],
      anahtar: ['SablonKodu', 'Saat', 'DilKodu'],
      guncellenen: ['Baslik', 'Detay'],
      satirlar: adimCeviri,
    }),
    mergeYaz({
      tablo: 'katalog.Urun',
      kolonlar: [
        k('MarkaKodu', 'nvarchar(20)'), k('Kod', 'nvarchar(60)'), k('Ad', 'nvarchar(100)'), k('Slogan', 'nvarchar(200)'), k('Aciklama', 'nvarchar(max)'),
        k('SeriOneki', 'nvarchar(20)'), k('VitrinSirasi', 'smallint'), k('KilavuzUrl', 'nvarchar(400)'), k('TeknikKaynakUrl', 'nvarchar(400)'),
        k('KategoriKodu', KOD40), k('BakimSablonuKodu', KOD40), k('KilavuzKapsamKodu', 'nvarchar(100)'), k('Aktif', 'bit'),
      ],
      anahtar: ['MarkaKodu', 'Kod'],
      guncellenen: ['Ad', 'Slogan', 'Aciklama', 'SeriOneki', 'VitrinSirasi', 'KilavuzUrl', 'TeknikKaynakUrl', 'KategoriKodu', 'BakimSablonuKodu', 'KilavuzKapsamKodu', 'Aktif'],
      hedefSuzgec: suzgec,
      kaynakDisi: 'pasif',
      satirlar: urun,
      not: 'SeriOnekiDogrulandi, EskiKayitNo, EskiNumara kaynakta yok; tohum dokunmaz',
    }),
    mergeYaz({
      tablo: 'katalog.UrunCevirisi',
      kolonlar: [k('MarkaKodu', 'nvarchar(20)'), k('UrunKodu', 'nvarchar(60)'), k('DilKodu', 'nvarchar(5)'), k('Ad', 'nvarchar(100)'), k('Slogan', 'nvarchar(200)'), k('Aciklama', 'nvarchar(max)')],
      anahtar: ['MarkaKodu', 'UrunKodu', 'DilKodu'],
      guncellenen: ['Ad', 'Slogan', 'Aciklama'],
      hedefSuzgec: suzgec,
      satirlar: urunCeviri,
    }),
    mergeYaz({
      tablo: 'katalog.UrunVaryanti',
      kolonlar: [k('MarkaKodu', 'nvarchar(20)'), k('UrunKodu', 'nvarchar(60)'), k('Kod', KOD40), k('Ad', 'nvarchar(60)'), k('Sira', 'smallint'), k('Aktif', 'bit')],
      anahtar: ['MarkaKodu', 'UrunKodu', 'Kod'],
      guncellenen: ['Ad', 'Sira', 'Aktif'],
      hedefSuzgec: suzgec,
      kaynakDisi: 'pasif',
      satirlar: varyant,
    }),
    mergeYaz({
      tablo: 'katalog.UrunVaryantiCevirisi',
      kolonlar: [k('MarkaKodu', 'nvarchar(20)'), k('UrunKodu', 'nvarchar(60)'), k('VaryantKodu', KOD40), k('DilKodu', 'nvarchar(5)'), k('Ad', 'nvarchar(60)')],
      anahtar: ['MarkaKodu', 'UrunKodu', 'VaryantKodu', 'DilKodu'],
      guncellenen: ['Ad'],
      hedefSuzgec: suzgec,
      satirlar: varyantCeviri,
    }),
    mergeYaz({
      tablo: 'katalog.UrunOzelligi',
      kolonlar: [k('MarkaKodu', 'nvarchar(20)'), k('UrunKodu', 'nvarchar(60)'), k('SiraNo', 'smallint'), k('Etiket', 'nvarchar(150)'), k('Deger', 'nvarchar(300)'), k('Aktif', 'bit')],
      anahtar: ['MarkaKodu', 'UrunKodu', 'SiraNo'],
      guncellenen: ['Etiket', 'Deger', 'Aktif'],
      hedefSuzgec: suzgec,
      kaynakDisi: 'pasif',
      satirlar: ozellik,
    }),
    mergeYaz({
      tablo: 'katalog.UrunOzelligiCevirisi',
      kolonlar: [k('MarkaKodu', 'nvarchar(20)'), k('UrunKodu', 'nvarchar(60)'), k('SiraNo', 'smallint'), k('DilKodu', 'nvarchar(5)'), k('Etiket', 'nvarchar(150)'), k('Deger', 'nvarchar(300)')],
      anahtar: ['MarkaKodu', 'UrunKodu', 'SiraNo', 'DilKodu'],
      guncellenen: ['Etiket', 'Deger'],
      hedefSuzgec: suzgec,
      satirlar: ozellikCeviri,
      not: 'Deger boş: değer her dilde aynı (sayı ve birim)',
    }),
    mergeYaz({
      tablo: 'katalog.UrunVideosu',
      kolonlar: [k('MarkaKodu', 'nvarchar(20)'), k('UrunKodu', 'nvarchar(60)'), k('SiraNo', 'smallint'), k('Baslik', 'nvarchar(200)'), k('SureSaniye', 'int'), k('Url', 'nvarchar(400)'), k('DosyaYolu', 'nvarchar(260)'), k('TurKodu', 'nvarchar(20)'), k('Aktif', 'bit')],
      anahtar: ['MarkaKodu', 'UrunKodu', 'SiraNo'],
      guncellenen: ['Baslik', 'SureSaniye', 'Url', 'DosyaYolu', 'TurKodu', 'Aktif'],
      hedefSuzgec: suzgec,
      kaynakDisi: 'pasif',
      satirlar: video,
    }),
    mergeYaz({
      tablo: 'katalog.UrunVideosuCevirisi',
      kolonlar: [k('MarkaKodu', 'nvarchar(20)'), k('UrunKodu', 'nvarchar(60)'), k('SiraNo', 'smallint'), k('DilKodu', 'nvarchar(5)'), k('Baslik', 'nvarchar(200)')],
      anahtar: ['MarkaKodu', 'UrunKodu', 'SiraNo', 'DilKodu'],
      guncellenen: ['Baslik'],
      hedefSuzgec: suzgec,
      satirlar: videoCeviri,
    }),
    '/* katalog.ParcaModel — kaynakta parça-model eşleşmesi yok (fiyat listesi bu bilgiyi vermiyor); tohum yazmaz. */\n',
    mergeYaz({
      tablo: 'kod.BelirtiKapsami',
      kolonlar: [k('MarkaKodu', 'nvarchar(20)'), k('DestekAilesiKodu', KOD40), k('BelirtiKodu', KOD40), k('Sira', 'smallint')],
      anahtar: ['MarkaKodu', 'DestekAilesiKodu', 'BelirtiKodu'],
      guncellenen: ['Sira'],
      hedefSuzgec: suzgec,
      kaynakDisi: 'sil',
      satirlar: kapsam,
      not: 'bağ satırı; kaynaktaki markada kaynakta olmayan bağ silinir (başka tablo bu bağa FK vermez)',
    }),
  ]
  return (
    betikBasligi('T05 — katalog: marka, kategori, bakım, ürün ve uyduları, belirti kapsamı', [
      `1 marka (${markaKodu}), ${kategori.length} kategori, ${sablon.length} bakım şablonu, ${adim.length} bakım adımı,`,
      `${urun.length} ürün, ${varyant.length} varyant, ${ozellik.length} özellik, ${video.length} video, ${kapsam.length} belirti bağı.`,
      '',
      'Kaynak: src/marka (kimlik.js, katalog/products.js + .en.js, katalog/para.js,',
      'katalog/makineFiyat.js, icerik/teknikOzellikler.js, icerik/teknikSozluk.js,',
      'icerik/kilavuzEslesme.js, icerik/mobile_support_package.json), src/lib/serial.js,',
      'src/data/talepAlanlari.js; tohum/kaynak/markalar.json. Tasarım: tasarim.md 5.2 T05.',
      '',
      'Marka kapsamlı tablolarda hedef kaynaktaki markalarla sınırlıdır; o markada',
      'kaynakta olmayan ürün, varyant, özellik ve video Aktif = 0 olur. Veriyle',
      'eklenen başka markanın satırlarına dokunulmaz. Kategori ve bakım şablonu',
      'markasızdır: kaynakta olmayan satıra dokunulmaz.',
    ]) +
    '\n' +
    bolumler.join('\n')
  )
}

/* ============================================================ T06 */

function t06Yaz(K, markalar) {
  const tanim = kaynakJson('fiyat-listeleri.json')
  const markaKodlari = new Set(markalar.map((x) => x.MarkaKodu))
  const listeler = tanim.listeler
  const arsiv = join(KAYNAK_KLASORU, 'fiyat-listeleri')
  const paraKodu = paraBirimiKodu(K)
  const yururlukte = new Map()
  const listeSatirlari = []
  const grup = new Map()
  const parca = new Map()
  const fiyat = []
  const gruplarAilesi = K.marka.PARCA_GRUBU_AILESI
  for (const [i, l] of listeler.entries()) {
    const yer = `fiyat-listeleri.json[${i}] ${l.MarkaKodu}/${l.Kod}`
    if (!markaKodlari.has(l.MarkaKodu)) dur(`${yer}: marka markalar.json'da yok`)
    if (!/^[a-z0-9-]{2,20}$/.test(l.Kod)) dur(`${yer}: liste kodu küçük harf, rakam ve tire olmalı`)
    if (!['taslak', 'yururlukte', 'arsiv'].includes(l.DurumKodu)) dur(`${yer}: DurumKodu ${l.DurumKodu}`)
    if (l.DurumKodu === 'yururlukte') {
      if (yururlukte.has(l.MarkaKodu)) dur(`${yer}: markada ikinci yururlukte liste`)
      yururlukte.set(l.MarkaKodu, l.Kod)
    }
    const dosya = join(arsiv, l.MarkaKodu, `${l.Kod}.json`)
    if (!existsSync(dosya)) dur(`${yer}: arşiv dosyası yok (tohum/kaynak/fiyat-listeleri/${l.MarkaKodu}/${l.Kod}.json)`)
    const icerik = readFileSync(dosya, 'utf8')
    const ozet = metinOzeti(icerik)
    if (ozet !== l.KaynakOzeti) dur(`${yer}: arşiv dosyası değişmiş (özet ${ozet}, kayıtlı ${l.KaynakOzeti}). Arşivdeki liste değiştirilmez; yeni liste kodu verin.`)
    const katalog = JSON.parse(icerik.replace(/^﻿/, ''))
    if (katalog.kaynak && katalog.kaynak !== l.KaynakDosyaAdi) dur(`${yer}: KaynakDosyaAdi arşivdeki "kaynak" ile tutmuyor`)
    if (l.ParaBirimiKodu !== paraKodu) dur(`${yer}: ParaBirimiKodu ${l.ParaBirimiKodu}, para.js ${paraKodu}`)
    listeSatirlari.push({
      MarkaKodu: l.MarkaKodu,
      Kod: l.Kod,
      KaynakDosyaAdi: l.KaynakDosyaAdi,
      KaynakOzeti: l.KaynakOzeti,
      KaynakSurumNo: Number.isInteger(katalog.surum) ? katalog.surum : null,
      ListeKdvHaric: l.ListeKdvHaric ? 1 : 0,
      KdvEsasiDogrulandi: l.KdvEsasiDogrulandi ? 1 : 0,
      YururlukBaslangicTarihi: l.YururlukBaslangicTarihi ?? null,
      ParaBirimiKodu: l.ParaBirimiKodu,
      DurumKodu: l.DurumKodu,
      sira: i,
    })
    const gorulenGrup = new Set()
    katalog.gruplar.forEach((g, j) => {
      if (gorulenGrup.has(g.id)) dur(`${yer}: grup ${g.id} iki kez`)
      gorulenGrup.add(g.id)
      grup.set(`${l.MarkaKodu}|${g.id}`, { MarkaKodu: l.MarkaKodu, Kod: g.id, Ad: g.ad, Sira: j + 1, DestekAilesiKodu: gruplarAilesi[g.id] ?? null, listeler: [...(grup.get(`${l.MarkaKodu}|${g.id}`)?.listeler || []), l.Kod] })
    })
    const gorulenParca = new Set()
    for (const p of katalog.parcalar) {
      if (gorulenParca.has(p.kod)) dur(`${yer}: parça ${p.kod} iki kez`)
      gorulenParca.add(p.kod)
      if (!gorulenGrup.has(p.grup)) dur(`${yer}: parça ${p.kod} grubu ${p.grup} listede yok`)
      if (typeof p.fiyat !== 'number' || p.fiyat < 0) dur(`${yer}: parça ${p.kod} fiyatı geçersiz`)
      const anahtar = `${l.MarkaKodu}|${p.kod}`
      const onceki = parca.get(anahtar)
      parca.set(anahtar, {
        MarkaKodu: l.MarkaKodu,
        Kod: p.kod,
        Ad: p.ad,
        GorselVar: p.gorsel ? 1 : 0,
        GrupKodu: p.grup,
        IlkFiyatListesiKodu: onceki ? onceki.IlkFiyatListesiKodu : l.Kod,
        SonFiyatListesiKodu: l.Kod,
      })
      fiyat.push({ MarkaKodu: l.MarkaKodu, FiyatListesiKodu: l.Kod, ParcaKodu: p.kod, BirimFiyat: p.fiyat, ParaBirimiKodu: l.ParaBirimiKodu })
    }
  }
  for (const g of grup.values()) {
    g.Aktif = g.listeler.includes(yururlukte.get(g.MarkaKodu)) ? 1 : 0
    delete g.listeler
  }
  for (const p of parca.values()) p.Aktif = p.SonFiyatListesiKodu === yururlukte.get(p.MarkaKodu) ? 1 : 0
  const eksikAile = [...grup.values()].filter((g) => g.Aktif && !g.DestekAilesiKodu).map((g) => g.Kod)
  if (eksikAile.length) dur(`parcaGruplari.js PARCA_GRUBU_AILESI: yürürlükteki listenin grupları eşlenmemiş: ${eksikAile.join(', ')}`)

  const suzgec = `MarkaKodu IN (${[...markaKodlari].sort().map(metinSql).join(', ')})`
  const bolumler = []
  bolumler.push(
    mergeYaz({
      tablo: 'katalog.ParcaGrubu',
      kolonlar: [k('MarkaKodu', 'nvarchar(20)'), k('Kod', 'nvarchar(60)'), k('Ad', 'nvarchar(100)'), k('Sira', 'smallint'), k('DestekAilesiKodu', KOD40), k('Aktif', 'bit')],
      anahtar: ['MarkaKodu', 'Kod'],
      guncellenen: ['Ad', 'Sira', 'DestekAilesiKodu', 'Aktif'],
      hedefSuzgec: suzgec,
      kaynakDisi: 'pasif',
      satirlar: [...grup.values()],
      not: 'arşivdeki bütün listelerin grupları; Aktif = 1 yalnız yürürlükteki listede olan',
    }),
  )
  /* Aynı liste koduna farklı içerik: durdur (tasarim.md 5.5). */
  const ozetKosulu = listeSatirlari
    .map((l) => `        (${metinSql(l.MarkaKodu)}, ${metinSql(l.Kod)}, 0x${l.KaynakOzeti.toUpperCase()})`)
    .join(',\n')
  bolumler.push(
    [
      '/* katalog.FiyatListesi — arşivdeki liste koduna farklı içerik gelmişse dur */',
      'IF EXISTS (',
      '    SELECT 1',
      '    FROM katalog.FiyatListesi AS h',
      '    JOIN (VALUES',
      ozetKosulu,
      '    ) AS k (MarkaKodu, Kod, KaynakOzeti)',
      '      ON h.MarkaKodu = k.MarkaKodu AND h.Kod = k.Kod',
      '    WHERE h.KaynakOzeti <> CONVERT(binary(32), k.KaynakOzeti)',
      ')',
      "    THROW 50002, N'bu fiyat listesi kodu veritabanında başka bir içerikle kayıtlı; arşivdeki liste değiştirilemez. Yeni listeye yeni bir kod verin.', 1;",
      '',
    ].join('\n'),
  )
  for (const [markaKodu, kod] of [...yururlukte.entries()].sort()) {
    bolumler.push(
      `/* katalog.FiyatListesi — ${markaKodu}: önce eski yürürlükteki liste arşive, sonra ${kod} yürürlüğe (markada tek yürürlükteki liste) */\nUPDATE katalog.FiyatListesi SET DurumKodu = N'arsiv'\nWHERE MarkaKodu = ${metinSql(markaKodu)} AND DurumKodu = N'yururlukte' AND Kod <> ${metinSql(kod)};\n`,
    )
  }
  bolumler.push(
    mergeYaz({
      tablo: 'katalog.FiyatListesi',
      kolonlar: [
        k('MarkaKodu', 'nvarchar(20)'), k('Kod', 'nvarchar(20)'), k('KaynakDosyaAdi', 'nvarchar(260)'), k('KaynakOzeti', 'binary(32)'), k('KaynakSurumNo', 'int'),
        k('ListeKdvHaric', 'bit'), k('KdvEsasiDogrulandi', 'bit'), k('YururlukBaslangicTarihi', 'date'), k('ParaBirimiKodu', 'nvarchar(3)'), k('DurumKodu', 'nvarchar(20)'),
      ],
      anahtar: ['MarkaKodu', 'Kod'],
      guncellenen: ['DurumKodu', 'KdvEsasiDogrulandi', 'ListeKdvHaric'],
      hedefSuzgec: suzgec,
      satirlar: listeSatirlari.map(({ sira, ...x }) => x),
      not: 'liste başlığında yalnız DurumKodu, KdvEsasiDogrulandi, ListeKdvHaric değişir',
    }),
  )
  bolumler.push(
    mergeYaz({
      tablo: 'katalog.Parca',
      kolonlar: [k('MarkaKodu', 'nvarchar(20)'), k('Kod', 'nvarchar(24)'), k('Ad', 'nvarchar(100)'), k('GorselVar', 'bit'), k('GrupKodu', 'nvarchar(60)'), k('IlkFiyatListesiKodu', 'nvarchar(20)'), k('SonFiyatListesiKodu', 'nvarchar(20)'), k('Aktif', 'bit')],
      anahtar: ['MarkaKodu', 'Kod'],
      guncellenen: ['Ad', 'GorselVar', 'GrupKodu', 'IlkFiyatListesiKodu', 'SonFiyatListesiKodu', 'Aktif'],
      hedefSuzgec: suzgec,
      kaynakDisi: 'pasif',
      satirlar: [...parca.values()],
      not: 'arşivdeki bütün listelerin birleşimi; Aktif = 1 yalnız yürürlükteki listede bulunan',
    }),
  )
  bolumler.push(
    eklemeYaz({
      tablo: 'katalog.FiyatListesiSatiri',
      kolonlar: [k('MarkaKodu', 'nvarchar(20)'), k('FiyatListesiKodu', 'nvarchar(20)'), k('ParcaKodu', 'nvarchar(24)'), k('BirimFiyat', 'decimal(18,2)'), k('ParaBirimiKodu', 'nvarchar(3)')],
      anahtar: ['MarkaKodu', 'FiyatListesiKodu', 'ParcaKodu'],
      satirlar: fiyat,
      not: 'satırlar değişmez ve pasifleşmez',
    }),
  )
  return (
    betikBasligi('T06 — yedek parça grupları, fiyat listeleri, parçalar ve fiyatlar', [
      `${listeSatirlari.length} fiyat listesi, ${grup.size} parça grubu, ${parca.size} parça, ${fiyat.length} fiyat satırı.`,
      '',
      'Kaynak: tohum/kaynak/fiyat-listeleri.json ve fiyat-listeleri/<MarkaKodu>/<Kod>.json',
      '(arşiv; her liste bir kez yazılır), src/marka/katalog/parcaGruplari.js',
      'PARCA_GRUBU_AILESI, src/marka/katalog/para.js. Tasarım: tasarim.md 5.5 fiyat listesi kuralı.',
      '',
      'Fiyat listesi SSMS\'ten ya da içe aktarımla yüklenmez; yeni liste arşive yeni',
      'kodla eklenir, önceki yürürlükteki liste arşive geçer.',
    ]) +
    '\n' +
    bolumler.join('\n')
  )
}

/* ============================================================ T07 */

const AYLAR = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık']

function turkceTarih(metin, yer) {
  const m = /^(\d{1,2}) (\S+) (\d{4})$/.exec(String(metin).trim())
  const ay = m ? AYLAR.indexOf(m[2].toLocaleLowerCase('tr-TR')) : -1
  if (!m || ay < 0) dur(`${yer}: "${metin}" tarih olarak okunamadı (ör. 14 Ağustos 2026)`)
  return `${m[3]}-${String(ay + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

function t07Yaz(K) {
  const { METINLER, KVKK_SURUM, KVKK_TARIH, metinDilde } = K.kvkk
  const tarih = turkceTarih(KVKK_TARIH, 'kvkk.js KVKK_TARIH')
  const diller = K.i18n.DILLER.map((d) => d.kod)
  const satirlar = []
  for (const m of METINLER) {
    for (const dil of diller) {
      const x = metinDilde(m, dil)
      if (dil !== 'tr' && x === m) continue
      const { id, baslik, ...icerik } = x
      const json = JSON.stringify(icerik)
      satirlar.push({
        MetinKodu: id,
        Surum: KVKK_SURUM,
        DilKodu: dil,
        Baslik: baslik,
        IcerikJson: json,
        IcerikOzeti: createHash('sha256').update(json, 'utf8').digest('hex'),
        AsilMetin: dil === 'tr' ? 1 : 0,
        MetinTarihi: tarih,
      })
    }
  }
  const kolonlar = [k('MetinKodu', KOD40), k('Surum', 'nvarchar(10)'), k('DilKodu', 'nvarchar(5)'), k('Baslik', 'nvarchar(200)'), k('IcerikJson', 'nvarchar(max)'), k('IcerikOzeti', 'binary(32)'), k('AsilMetin', 'bit'), k('MetinTarihi', 'date')]
  const ozetKosulu = sirala(satirlar, ['MetinKodu', 'Surum', 'DilKodu'])
    .map((s) => `        (${metinSql(s.MetinKodu)}, ${metinSql(s.Surum)}, ${metinSql(s.DilKodu)}, 0x${s.IcerikOzeti.toUpperCase()})`)
    .join(',\n')
  return (
    betikBasligi('T07 — KVKK metin sürümleri', [
      `${satirlar.length} metin satırı (sürüm ${KVKK_SURUM}, ${tarih}).`,
      '',
      'Kaynak: src/data/kvkk.js (METINLER, KVKK_SURUM, KVKK_TARIH), src/data/kvkk.en.js',
      '(metinDilde ile). IcerikJson: metnin başlık dışındaki bölümleri, şirket',
      'bilgileri yerleşmiş hâliyle; IcerikOzeti: o JSON metninin UTF-8 SHA-256 özeti.',
      'Tasarım: tasarim.md 5.2 T07.',
      '',
      'Yalnız ekleme: var olan sürümün içeriği değişmişse betik durur (sürümü',
      'artırın). MERGE yazılmaz: kvkk.MetinSurumu INSTEAD OF tetikleyicilidir.',
      'Hukuk onayı kaynakta yok; HukukOnayiZamani boş kalır.',
    ]) +
    '\n' +
    [
      [
        '/* kvkk.MetinSurumu — aynı sürüm numarasıyla farklı içerik: dur */',
        'IF EXISTS (',
        '    SELECT 1',
        '    FROM kvkk.MetinSurumu AS h',
        '    JOIN (VALUES',
        ozetKosulu,
        '    ) AS k (MetinKodu, Surum, DilKodu, IcerikOzeti)',
        '      ON h.MetinKodu = k.MetinKodu AND h.Surum = k.Surum AND h.DilKodu = k.DilKodu',
        '    WHERE h.IcerikOzeti <> CONVERT(binary(32), k.IcerikOzeti)',
        ')',
        "    THROW 50003, N'kişisel verilerin korunması metninin içeriği değişmiş ancak sürüm numarası aynı; src/data/kvkk.js içindeki KVKK_SURUM değerini artırın.', 1;",
        '',
      ].join('\n'),
      eklemeYaz({ tablo: 'kvkk.MetinSurumu', kolonlar, anahtar: ['MetinKodu', 'Surum', 'DilKodu'], satirlar }),
    ].join('\n')
  )
}

/* ============================================================ T08 */

function t08Yaz(v01) {
  const tanim = kaynakJson('saklama-kurallari.json')
  const kayitTuru = new Set(v01.L.find((l) => l.tablo === 'kod.KayitTuru').satirlar.map((s) => s.Kod))
  const satirlar = tanim.kurallar.map((x) => {
    if (!kayitTuru.has(x.KayitTuruKodu)) dur(`saklama-kurallari.json: ${x.KayitTuruKodu} kod.KayitTuru'nda yok`)
    if (!['sil', 'bosalt', 'sakla'].includes(x.EylemKodu)) dur(`saklama-kurallari.json: ${x.KayitTuruKodu} eylemi ${x.EylemKodu}`)
    if (x.SureGun !== null && (!Number.isInteger(x.SureGun) || x.SureGun < 0)) dur(`saklama-kurallari.json: ${x.KayitTuruKodu} süresi geçersiz`)
    return { KayitTuruKodu: x.KayitTuruKodu, SureGun: x.SureGun, EylemKodu: x.EylemKodu, HukukOnayli: x.HukukOnayli ? 1 : 0, Aciklama: x.Aciklama }
  })
  return (
    betikBasligi('T08 — saklama kuralları', [
      `${satirlar.length} kural.`,
      '',
      'Kaynak: tohum/kaynak/saklama-kurallari.json (tasarim.md 1.13.4). Hukukçu kararı',
      'bu dosyadan değişir. Kaynakta olmayan kural pasifleştirilmez ve silinmez.',
    ]) +
    '\n' +
    mergeYaz({
      tablo: 'sistem.SaklamaKurali',
      kolonlar: [k('KayitTuruKodu', KOD40), k('SureGun', 'int'), k('EylemKodu', KOD40), k('HukukOnayli', 'bit'), k('Aciklama', 'nvarchar(400)')],
      anahtar: ['KayitTuruKodu'],
      guncellenen: ['SureGun', 'EylemKodu', 'HukukOnayli', 'Aciklama'],
      satirlar,
    })
  )
}

/* ============================================================ B01 */

function b01Yaz(K, markalar, v01) {
  const tanim = kaynakJson('ayarlar.json')
  const eslesme = kaynakJson('kod-eslesmeleri.json')
  const sirketKodu = markalar[0].SirketKodu
  const satirlar = []
  for (const a of tanim.ayarlar) {
    const yer = `ayarlar.json ${a.Anahtar}`
    if (!/^[A-Za-z0-9]+$/.test(a.Anahtar)) dur(`${yer}: anahtar biçime uymuyor`)
    const kaynak = a.kaynak || {}
    let deger
    if (kaynak.modul) {
      const modul = K.ayarModulleri[kaynak.modul]
      if (!(kaynak.sabit in modul)) dur(`${yer}: ${kaynak.modul} ${kaynak.sabit} dışa aktarılmıyor`)
      deger = kaynak.yol ? yolAl(modul[kaynak.sabit], kaynak.yol, yer) : modul[kaynak.sabit]
      if (kaynak.eslesme) {
        const eski = eslesme.eskiDegerler[kaynak.eslesme]?.[deger]
        if (eski) deger = eski.YeniKod
      }
    } else if (kaynak.yerel) {
      deger = K.yerelAyar[`${kaynak.yerel}|${kaynak.sabit}`]
      if (typeof deger !== 'number') dur(`${yer}: ${kaynak.yerel} ${kaynak.sabit} sayı değil`)
      if (kaynak.bolen) deger = deger / kaynak.bolen
    } else if (kaynak.desen) {
      const metin = readFileSync(join(KOK, kaynak.desen.dosya), 'utf8')
      if (!new RegExp(kaynak.desen.ifade).test(metin)) dur(`${yer}: ${kaynak.desen.dosya} içinde "${kaynak.desen.ifade}" artık yok; değeri kaynaktan yeniden okuyun`)
      deger = kaynak.deger
    } else if ('dayanak' in kaynak) {
      deger = kaynak.deger
    } else {
      dur(`${yer}: kaynak tanımı yok`)
    }
    let metin
    if (deger === null || deger === undefined) metin = null
    else if (a.DegerTuru === 'tamsayi') {
      if (!Number.isInteger(deger)) dur(`${yer}: tamsayı değil (${deger})`)
      metin = String(deger)
    } else if (a.DegerTuru === 'ondalik') {
      if (typeof deger !== 'number') dur(`${yer}: sayı değil (${deger})`)
      metin = String(deger)
    } else if (a.DegerTuru === 'mantiksal') {
      if (typeof deger !== 'boolean') dur(`${yer}: mantıksal değil (${deger})`)
      metin = deger ? '1' : '0'
    } else if (a.DegerTuru === 'json') {
      metin = JSON.stringify(deger)
    } else if (a.DegerTuru === 'metin') {
      if (typeof deger !== 'string') dur(`${yer}: metin değil`)
      metin = deger
    } else dur(`${yer}: DegerTuru ${a.DegerTuru}`)
    if (a.Anahtar === 'GarantiBaslangicEsasi' && !v01.L.find((l) => l.tablo === 'kod.GarantiBaslangicEsasi').satirlar.find((s) => s.Kod === metin)) {
      dur(`${yer}: ${metin} kod.GarantiBaslangicEsasi'nde yok`)
    }
    if (a.Anahtar === 'ParaBirimi' && !v01.L.find((l) => l.tablo === 'kod.ParaBirimi').satirlar.find((s) => s.Kod === metin)) dur(`${yer}: ${metin} kod.ParaBirimi'nde yok`)
    if (!['genel', 'sirket'].includes(a.Kapsam)) dur(`${yer}: kapsam ${a.Kapsam}`)
    satirlar.push({
      Anahtar: a.Anahtar,
      SirketKodu: a.Kapsam === 'sirket' ? sirketKodu : null,
      MarkaKodu: null,
      DegerTuru: a.DegerTuru,
      Deger: metin,
      Aciklama: a.Aciklama,
    })
  }
  return (
    betikBasligi('B01 — ayarlar (başlangıç değerleri)', [
      `${satirlar.length} ayar.`,
      '',
      'Kaynak: tohum/kaynak/ayarlar.json (tasarim.md 5.3); değerler oradaki kaynak',
      'sabitlerden okunur. Yalnız yoksa ekler (anahtar + kapsam): PAKSAN değeri',
      'yonetim.AyarDegistir ile değiştirdiyse tohum ona dokunmaz.',
    ]) +
    '\n' +
    eklemeYaz({
      tablo: 'sistem.Ayar',
      kolonlar: [k('Anahtar', 'nvarchar(80)'), k('SirketKodu', 'nvarchar(20)'), k('MarkaKodu', 'nvarchar(20)'), k('DegerTuru', 'nvarchar(10)'), k('Deger', 'nvarchar(4000)'), k('Aciklama', 'nvarchar(400)')],
      anahtar: ['Anahtar', 'SirketKodu', 'MarkaKodu'],
      bosOlabilenAnahtar: ['SirketKodu', 'MarkaKodu'],
      satirlar,
    })
  )
}

/* ============================================================ B02 */

function b02Yaz(K) {
  const birimTutar = K.servisKaydi.TARIFE?.yolKm
  if (typeof birimTutar !== 'number' || birimTutar < 0) dur('servisKaydi.js TARIFE.yolKm okunamadı')
  const satir = {
    KalemTuruKodu: 'yol',
    MarkaKodu: null,
    BirimKodu: 'km',
    BirimTutar: birimTutar,
    ParaBirimiKodu: paraBirimiKodu(K),
    GecerlilikBaslangicTarihi: '2026-01-01',
  }
  const kolonlar = [k('KalemTuruKodu', KOD40), k('MarkaKodu', 'nvarchar(20)'), k('BirimKodu', KOD40), k('BirimTutar', 'decimal(18,2)'), k('ParaBirimiKodu', 'nvarchar(3)'), k('GecerlilikBaslangicTarihi', 'date')]
  return (
    betikBasligi('B02 — hak ediş tarifesi (başlangıç değeri)', [
      '1 tarife: yol, bütün markalar, km başına.',
      '',
      'Kaynak: src/lib/servisKaydi.js TARIFE.yolKm; para birimi src/marka/katalog/para.js;',
      'geçerlilik başlangıcı tasarim.md 5.3 B02. Yalnız yoksa ekler: markasız bir',
      'yol tarifesi (açık ya da kapanmış) varsa hiçbir şey yazılmaz; tarifeyi',
      'PAKSAN değiştirir.',
    ]) +
    '\n' +
    eklemeYaz({
      tablo: 'hakedis.Tarife',
      kolonlar,
      anahtar: ['KalemTuruKodu', 'MarkaKodu'],
      bosOlabilenAnahtar: ['MarkaKodu'],
      satirlar: [satir],
    })
  )
}

/* ============================================================ B03 */

function b03Yaz(K, eslesme) {
  const tanim = eslesme.listeler['erisim.Rol']
  const izinler = new Set(K.yetkiler.TUM_IZINLER)
  const roller = []
  const rolIzin = []
  for (const r of K.yetkiler.VARSAYILAN_ROLLER) {
    const kod = tanim.kodlar[r.id]
    if (!kod) dur(`kod-eslesmeleri.json: erisim.Rol "${r.id}" kodu yok`)
    const kimlik = uuidv5(`erisim.Rol:${kod}`)
    const tum = r.sistem === true || (r.izinler.length === izinler.size && r.izinler.every((x) => izinler.has(x)) && r.id === 'admin')
    roller.push({
      Kimlik: kimlik,
      Kod: kod,
      Ad: r.ad,
      Aciklama: r.aciklama ?? null,
      TumIzinler: tum ? 1 : 0,
      Sistem: r.sistem ? 1 : 0,
      TalepTuruKodu: r.talepTuru ?? null,
      EskiKayitNo: r.id,
    })
    if (!tum) {
      for (const iz of r.izinler) {
        if (!izinler.has(iz)) dur(`yetkiler.js: ${r.id} rolünün izni ${iz} katalogda yok`)
        rolIzin.push({ RolKimlik: kimlik, IzinKodu: iz })
      }
    }
  }
  const eksik = Object.keys(tanim.kodlar).filter((x) => !roller.find((r) => r.EskiKayitNo === x))
  if (eksik.length) dur(`kod-eslesmeleri.json: erisim.Rol kaynakta olmayan roller: ${eksik.join(', ')}`)
  const rolKolon = [k('Kimlik', 'uniqueidentifier'), k('Kod', KOD40), k('Ad', 'nvarchar(100)'), k('Aciklama', 'nvarchar(400)'), k('TumIzinler', 'bit'), k('Sistem', 'bit'), k('TalepTuruKodu', KOD40), k('EskiKayitNo', 'nvarchar(64)')]
  const rolSatir = sirala(roller, ['Kimlik'])
  const izinSatir = sirala(rolIzin, ['RolKimlik', 'IzinKodu'])
  return (
    betikBasligi('B03 — varsayılan roller ve izinleri (başlangıç değerleri)', [
      `${roller.length} rol, ${rolIzin.length} rol izni.`,
      '',
      'Kaynak: src/data/yetkiler.js VARSAYILAN_ROLLER; rol kodları',
      'tohum/kaynak/kod-eslesmeleri.json. Kimlik UUIDv5 (ad alanı tasarim.md 1.6,',
      'ad metni erisim.Rol:<Kod>): her ortamda aynıdır. Tasarım: tasarim.md 5.3 B03.',
      '',
      'Yalnız yoksa ekler. Rolün izinleri yalnız rol bu çalıştırmada eklendiyse',
      'yazılır: PAKSAN bir rolden izin kaldırdıysa tohum onu geri getirmez.',
      'TumIzinler = 1 olan rol (admin) izin satırı almaz; bütün izinleri,',
      'sonradan eklenenler dahil, bu bayraktan alır.',
    ]) +
    '\n' +
    [
      '/* erisim.Rol — yalnız eksik roller; eklenenlerin kimliği izin eklemek için tutulur */',
      'DECLARE @EklenenRol TABLE (Kimlik uniqueidentifier NOT NULL PRIMARY KEY);',
      '',
      'INSERT INTO erisim.Rol (Kimlik, Kod, Ad, Aciklama, TumIzinler, Sistem, TalepTuruKodu, EskiKayitNo, Aktif)',
      'OUTPUT inserted.Kimlik INTO @EklenenRol (Kimlik)',
      'SELECT k.Kimlik, k.Kod, k.Ad, k.Aciklama, k.TumIzinler, k.Sistem, k.TalepTuruKodu, k.EskiKayitNo, 1',
      'FROM (',
      kaynakSorgusu(rolKolon, rolSatir, 'erisim.Rol'),
      ') AS k',
      'WHERE NOT EXISTS (SELECT 1 FROM erisim.Rol AS h WHERE h.Kimlik = k.Kimlik);',
      '',
      '/* erisim.RolIzin — yalnız bu çalıştırmada eklenen rollere */',
      izinSatir.length
        ? [
            'INSERT INTO erisim.RolIzin (RolKimlik, IzinKodu)',
            'SELECT k.RolKimlik, k.IzinKodu',
            'FROM (',
            kaynakSorgusu([k('RolKimlik', 'uniqueidentifier'), k('IzinKodu', KOD40)], izinSatir, 'erisim.RolIzin'),
            ') AS k',
            'JOIN @EklenenRol AS e ON e.Kimlik = k.RolKimlik',
            'WHERE NOT EXISTS (SELECT 1 FROM erisim.RolIzin AS h WHERE h.RolKimlik = k.RolKimlik AND h.IzinKodu = k.IzinKodu);',
          ].join('\n')
        : '-- Kaynakta izin satırı yok.',
      '',
    ].join('\n')
  )
}

/* ============================================================ O (örnek) */

const ORNEK_KORUMA =
  "IF NOT EXISTS (SELECT 1 FROM sistem.Ortam WHERE OrnekVeriIzinli = 1) THROW 50001, N'bu veritabanına örnek veri yüklenemez; betiği örnek veriye izin verilen yerel veya sınama veritabanında çalıştırın.', 1;"

function ornekBasligi(ad, satirlar) {
  return ORNEK_KORUMA + '\n' + betikBasligi(ad, satirlar)
}

function konumBul(il, ilce, yer, notlar) {
  const plaka = new Map(kaynakJson('il-plaka.json').map((x) => [x.Ad, x.IlKodu]))
  const ilKodu = plaka.get(il)
  if (!ilKodu) dur(`${yer}: il "${il}" il-plaka.json'da yok`)
  if (!ilce) return { IlKodu: ilKodu, IlceKodu: null }
  const x = kaynakJson('ilce-kodlari.json').find((y) => y.IlKodu === ilKodu && y.Ad === ilce)
  if (!x) notlar.push(`${yer}: "${il}/${ilce}" ilçe listesinde yok, ilçe boş yazıldı`)
  return { IlKodu: ilKodu, IlceKodu: x ? x.IlceKodu : null }
}

const girisAdi = (x) => x.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')

function ornekVerisi(K, markalar, eslesme) {
  const markaKodu = markalar[0].MarkaKodu
  const sirketKodu = markalar[0].SirketKodu
  const notlar = []
  const bayiler = K.marka.BAYILER.map((b) => ({
    Kimlik: uuidv5(`bayi.Bayi:${b.id}`),
    Ad: `Örnek ${b.ad}`,
    DurumKodu: 'aktif',
    ...konumBul(b.il, b.ilce, `bayiler.js ${b.id}`, notlar),
    EskiKayitNo: b.id,
    EskiNumara: b.no,
  }))
  const bayiKimligi = new Map(K.marka.BAYILER.map((b) => [b.id, uuidv5(`bayi.Bayi:${b.id}`)]))
  const servisler = K.marka.SERVISLER.map((s) => ({
    Kimlik: uuidv5(`servis.Servis:${s.id}`),
    Ad: `Örnek ${s.ad}`,
    TurKodu: s.tur,
    DurumKodu: 'aktif',
    ...konumBul(s.il, s.ilce, `servisler.js ${s.id}`, notlar),
    EskiKayitNo: s.id,
    EskiNumara: s.no,
  }))
  const bayiBagi = []
  const bolge = []
  for (const s of K.marka.SERVISLER) {
    const servisKimlik = uuidv5(`servis.Servis:${s.id}`)
    for (const b of s.bayiler || []) {
      if (!bayiKimligi.has(b)) dur(`servisler.js ${s.id}: bayi ${b} bayiler.js'de yok`)
      bayiBagi.push({ ServisKimlik: servisKimlik, BayiKimlik: bayiKimligi.get(b) })
    }
    for (const x of s.bolge || []) {
      const ilceler = x.ilceler?.length ? x.ilceler : [null]
      for (const ilce of ilceler) {
        const konum = konumBul(x.il, ilce, `servisler.js ${s.id} bolge`, notlar)
        bolge.push({ Kimlik: uuidv5(`servis.Bolge:${s.id}:${konum.IlKodu}:${konum.IlceKodu ?? ''}`), ServisKimlik: servisKimlik, ...konum })
      }
    }
  }
  const roller = K.yetkiler.VARSAYILAN_ROLLER.map((r) => ({ r, kod: eslesme.listeler['erisim.Rol'].kodlar[r.id] }))
  const personelKullanici = roller.map(({ r, kod }) => ({
    Kimlik: uuidv5(`erisim.Kullanici:ornek.${girisAdi(kod)}`),
    GirisAdi: `ornek.${girisAdi(kod)}`,
    TurKodu: 'personel',
    Aktif: 1,
    personel: {
      Kimlik: uuidv5(`personel.Personel:ornek.${girisAdi(kod)}`),
      AdSoyad: `Örnek ${r.ad}`,
      KullaniciKimlik: uuidv5(`erisim.Kullanici:ornek.${girisAdi(kod)}`),
      RolKimlik: uuidv5(`erisim.Rol:${kod}`),
      AyrilmaZamani: null,
      EskiKayitNo: null,
    },
  }))
  const servisKullanici = K.marka.SERVISLER.map((s) => ({
    Kimlik: uuidv5(`erisim.Kullanici:${girisAdi(s.id)}`),
    GirisAdi: girisAdi(s.id),
    TurKodu: 'servis',
    Aktif: 1,
    servisKimlik: uuidv5(`servis.Servis:${s.id}`),
  }))
  return { markaKodu, sirketKodu, notlar, bayiler, servisler, bayiBagi, bolge, personelKullanici, servisKullanici }
}

const SERVIS_KOLONLARI = [k('Kimlik', 'uniqueidentifier'), k('Ad', 'nvarchar(200)'), k('TurKodu', KOD40), k('DurumKodu', KOD40), k('IlKodu', 'tinyint'), k('IlceKodu', 'int'), k('EskiKayitNo', 'nvarchar(64)'), k('EskiNumara', 'nvarchar(20)')]
const KULLANICI_KOLONLARI = [k('Kimlik', 'uniqueidentifier'), k('GirisAdi', KOD40), k('TurKodu', KOD40), k('Aktif', 'bit')]

function o01Yaz(o) {
  const yetki = (tablo, kolon, satirlar) =>
    eklemeYaz({
      tablo,
      kolonlar: [k(kolon, 'uniqueidentifier'), k('MarkaKodu', 'nvarchar(20)')],
      anahtar: [kolon, 'MarkaKodu'],
      satirlar: satirlar.map((x) => ({ [kolon]: x.Kimlik, MarkaKodu: o.markaKodu })),
    })
  return (
    ornekBasligi('O01 — örnek servisler ve bayiler (yalnız yerel ve sınama)', [
      `${o.servisler.length} servis, ${o.bayiler.length} bayi, ${o.bayiBagi.length} bayi bağı, ${o.bolge.length} bölge; hepsine ${o.markaKodu} yetkisi.`,
      '',
      'Kaynak: src/marka/katalog/servisler.js ve bayiler.js (temsilî liste). id →',
      'EskiKayitNo, no → EskiNumara. Adların başına "Örnek" eklenir; kaynaktaki',
      'adres ve telefonlar yazılmaz (uydurma değerler gerçek bir kişiye ait olabilir).',
      'Kimlikler UUIDv5 (<sema>.<Tablo>:<id>): her kurulumda aynıdır.',
      ...o.notlar,
      '',
      'Yalnız yoksa ekler. Test ve canlıda ilk satır 50001 ile durur.',
    ]) +
    '\n' +
    [
      eklemeYaz({ tablo: 'bayi.Bayi', kolonlar: SERVIS_KOLONLARI.filter((x) => x.ad !== 'TurKodu'), anahtar: ['Kimlik'], satirlar: o.bayiler }),
      eklemeYaz({ tablo: 'servis.Servis', kolonlar: SERVIS_KOLONLARI, anahtar: ['Kimlik'], satirlar: o.servisler }),
      eklemeYaz({ tablo: 'servis.BayiBagi', kolonlar: [k('ServisKimlik', 'uniqueidentifier'), k('BayiKimlik', 'uniqueidentifier')], anahtar: ['ServisKimlik', 'BayiKimlik'], satirlar: o.bayiBagi }),
      eklemeYaz({ tablo: 'servis.Bolge', kolonlar: [k('Kimlik', 'uniqueidentifier'), k('ServisKimlik', 'uniqueidentifier'), k('IlKodu', 'tinyint'), k('IlceKodu', 'int')], anahtar: ['Kimlik'], satirlar: o.bolge }),
      yetki('servis.MarkaYetkisi', 'ServisKimlik', o.servisler),
      yetki('bayi.MarkaYetkisi', 'BayiKimlik', o.bayiler),
    ].join('\n')
  )
}

function o02Yaz(o) {
  return (
    ornekBasligi('O02 — örnek personel ve servis girişleri (yalnız yerel ve sınama)', [
      `${o.personelKullanici.length} personel girişi (her varsayılan role bir), ${o.servisKullanici.length} servis girişi (her O01 servisine bir).`,
      '',
      'Kaynak: src/data/yetkiler.js VARSAYILAN_ROLLER (rol başına bir personel),',
      'src/marka/katalog/servisler.js (servis başına bir giriş). Giriş adı:',
      'personelde ornek.<rol kodu>, serviste servis kimliği (konya-servis → konya.servis).',
      'Şifre yazılmaz (SifreKaydi boş, SifreBelirlemeGerekli = 1): girişi açmak için',
      'tek kullanımlık kod gerekir (yonetim.GirisSifresiniSifirla).',
      '',
      'Yalnız yoksa ekler. O01 ve B03 (roller) önce çalışmış olmalıdır.',
    ]) +
    '\n' +
    [
      eklemeYaz({
        tablo: 'erisim.Kullanici',
        kolonlar: KULLANICI_KOLONLARI,
        anahtar: ['Kimlik'],
        satirlar: [...o.personelKullanici, ...o.servisKullanici].map(({ Kimlik, GirisAdi, TurKodu, Aktif }) => ({ Kimlik, GirisAdi, TurKodu, Aktif })),
        not: 'SifreKaydi boş, SifreBelirlemeGerekli varsayılanı 1',
      }),
      eklemeYaz({
        tablo: 'personel.Personel',
        kolonlar: [k('Kimlik', 'uniqueidentifier'), k('AdSoyad', 'nvarchar(150)'), k('KullaniciKimlik', 'uniqueidentifier'), k('RolKimlik', 'uniqueidentifier'), k('AyrilmaZamani', 'datetime2(3)'), k('EskiKayitNo', 'nvarchar(64)')],
        anahtar: ['Kimlik'],
        satirlar: o.personelKullanici.map((x) => x.personel),
      }),
      eklemeYaz({
        tablo: 'servis.GirisHesabi',
        kolonlar: [k('KullaniciKimlik', 'uniqueidentifier'), k('ServisKimlik', 'uniqueidentifier')],
        anahtar: ['KullaniciKimlik'],
        satirlar: o.servisKullanici.map((x) => ({ KullaniciKimlik: x.Kimlik, ServisKimlik: x.servisKimlik })),
      }),
    ].join('\n')
  )
}

function o03Yaz(o) {
  const notlar = []
  const izmir = konumBul('İzmir', 'Torbalı', 'O03 IŞIK Makina', notlar)
  const isik = { Kimlik: uuidv5('servis.Servis:isik-makina-ornek'), Ad: 'IŞIK Makina (Örnek)', TurKodu: 'tuzel', DurumKodu: 'aktif', ...izmir, EskiKayitNo: null, EskiNumara: null }
  const isikGiris = { Kimlik: uuidv5('erisim.Kullanici:izmir.merkez'), GirisAdi: 'izmir.merkez', TurKodu: 'servis', Aktif: 1 }
  const admin = o.personelKullanici.find((x) => x.GirisAdi === 'ornek.admin')
  if (!admin) dur('O03: ornek.admin personeli O02 listesinde yok')
  const ayrilan = {
    Kimlik: uuidv5('erisim.Kullanici:ornek.ayrilan'),
    GirisAdi: 'ornek.ayrilan',
    TurKodu: 'personel',
    Aktif: 0,
    personel: {
      Kimlik: uuidv5('personel.Personel:ornek.ayrilan'),
      AdSoyad: 'Örnek Ayrılan Personel',
      KullaniciKimlik: uuidv5('erisim.Kullanici:ornek.ayrilan'),
      RolKimlik: uuidv5('erisim.Rol:yonetici'),
      AyrilmaZamani: '2026-01-01T00:00:00',
      EskiKayitNo: null,
    },
  }
  const izmirBayi = o.bayiler.find((b) => b.IlKodu === izmir.IlKodu)
  if (!izmirBayi) dur('O03: İzmir ilinde O01 bayisi yok')
  const hesapKimlik = uuidv5('musteri.Hesap:ornek-musteri-1')
  const telefon = { e164: '+905321234567', ulusal: '5321234567' }
  const makineKimlik = uuidv5(`makine.Makine:${o.markaKodu}:IPAK202400157`)
  const ortakYapan = { YapanTuruKodu: 'musteri', YapanHesapKimlik: hesapKimlik, KaynakUygulamaKodu: 'connect' }
  return (
    ORNEK_KORUMA +
    '\n' +
    betikBasligi('O03 — sınama senaryolarının başlangıç verisi (yalnız sınama)', [
      'tasarim.md 5.4 ve Bölüm 7 (S02, S05) için sabit veri: "IŞIK Makina" servisi,',
      '"izmir.merkez" servis girişi (aramada IZMIR.MERKEZ), servis ve bayi LOGO cari',
      'kodları, çalışmayan (ayrılmış) bir personel, telefonu 0532 123 45 67 olan örnek',
      'müşteri ve ona ait IPAK-2024-00157 seri numaralı makine (servisi IŞIK Makina).',
      'SRV014 eski servis numarası O01\'deki örnek servistedir (servisler.js SRV014).',
      'Kişi ve firma adları "Örnek" işaretlidir; TC ya da vergi numarası yoktur.',
      ...notlar,
      '',
      'Ortam sinama değilse betik hiçbir şey yazmaz. Yalnız yoksa ekler; O01 ve O02',
      'önce çalışmış olmalıdır.',
    ]) +
    '\n' +
    "IF NOT EXISTS (SELECT 1 FROM sistem.Ortam WHERE OrtamKodu = N'sinama') RETURN;\n\n" +
    [
      eklemeYaz({ tablo: 'servis.Servis', kolonlar: SERVIS_KOLONLARI, anahtar: ['Kimlik'], satirlar: [isik] }),
      eklemeYaz({ tablo: 'servis.MarkaYetkisi', kolonlar: [k('ServisKimlik', 'uniqueidentifier'), k('MarkaKodu', 'nvarchar(20)')], anahtar: ['ServisKimlik', 'MarkaKodu'], satirlar: [{ ServisKimlik: isik.Kimlik, MarkaKodu: o.markaKodu }] }),
      eklemeYaz({ tablo: 'erisim.Kullanici', kolonlar: KULLANICI_KOLONLARI, anahtar: ['Kimlik'], satirlar: [isikGiris, { Kimlik: ayrilan.Kimlik, GirisAdi: ayrilan.GirisAdi, TurKodu: ayrilan.TurKodu, Aktif: ayrilan.Aktif }] }),
      eklemeYaz({ tablo: 'servis.GirisHesabi', kolonlar: [k('KullaniciKimlik', 'uniqueidentifier'), k('ServisKimlik', 'uniqueidentifier')], anahtar: ['KullaniciKimlik'], satirlar: [{ KullaniciKimlik: isikGiris.Kimlik, ServisKimlik: isik.Kimlik }] }),
      eklemeYaz({
        tablo: 'personel.Personel',
        kolonlar: [k('Kimlik', 'uniqueidentifier'), k('AdSoyad', 'nvarchar(150)'), k('KullaniciKimlik', 'uniqueidentifier'), k('RolKimlik', 'uniqueidentifier'), k('AyrilmaZamani', 'datetime2(3)'), k('EskiKayitNo', 'nvarchar(64)')],
        anahtar: ['Kimlik'],
        satirlar: [ayrilan.personel],
      }),
      eklemeYaz({
        tablo: 'entegrasyon.CariKarti',
        kolonlar: [k('Kimlik', 'uniqueidentifier'), k('DisSistemKodu', KOD40), k('SirketKodu', 'nvarchar(20)'), k('CariKodu', 'nvarchar(32)'), k('ServisKimlik', 'uniqueidentifier'), k('BayiKimlik', 'uniqueidentifier'), k('KaynakKodu', KOD40)],
        anahtar: ['Kimlik'],
        satirlar: [
          { Kimlik: uuidv5('entegrasyon.CariKarti:servis:isik-makina-ornek'), DisSistemKodu: 'logo', SirketKodu: o.sirketKodu, CariKodu: '320.ORNEK.0001', ServisKimlik: isik.Kimlik, BayiKimlik: null, KaynakKodu: 'personel' },
          { Kimlik: uuidv5(`entegrasyon.CariKarti:bayi:${izmirBayi.EskiKayitNo}`), DisSistemKodu: 'logo', SirketKodu: o.sirketKodu, CariKodu: '120.ORNEK.0001', ServisKimlik: null, BayiKimlik: izmirBayi.Kimlik, KaynakKodu: 'personel' },
        ],
      }),
      eklemeYaz({
        tablo: 'musteri.Hesap',
        kolonlar: [k('Kimlik', 'uniqueidentifier'), k('KonumUlkeKodu', 'nvarchar(2)'), k('IlKodu', 'tinyint'), k('TelefonUlkeKodu', 'nvarchar(2)'), k('TelefonE164', 'nvarchar(16)'), k('TelefonUlusal', 'nvarchar(15)'), k('DurumKodu', KOD40), k('DilKodu', 'nvarchar(5)')],
        anahtar: ['Kimlik'],
        satirlar: [{ Kimlik: hesapKimlik, KonumUlkeKodu: 'TR', IlKodu: izmir.IlKodu, TelefonUlkeKodu: 'TR', TelefonE164: telefon.e164, TelefonUlusal: telefon.ulusal, DurumKodu: 'aktif', DilKodu: 'tr' }],
      }),
      eklemeYaz({
        tablo: 'musteri.HesapKisisi',
        kolonlar: [k('Kimlik', 'uniqueidentifier'), k('HesapKimlik', 'uniqueidentifier'), k('Adi', 'nvarchar(75)'), k('Soyadi', 'nvarchar(75)'), k('RolKodu', KOD40), k('TelefonE164', 'nvarchar(16)'), k('TelefonUlusal', 'nvarchar(15)')],
        anahtar: ['Kimlik'],
        satirlar: [{ Kimlik: uuidv5('musteri.HesapKisisi:ornek-musteri-1'), HesapKimlik: hesapKimlik, Adi: 'Örnek', Soyadi: 'Müşteri', RolKodu: 'hesapSahibi', TelefonE164: telefon.e164, TelefonUlusal: telefon.ulusal }],
      }),
      eklemeYaz({
        tablo: 'musteri.HesapTelefonGecmisi',
        kolonlar: [k('Kimlik', 'uniqueidentifier'), k('HesapKimlik', 'uniqueidentifier'), k('TelefonE164', 'nvarchar(16)')],
        anahtar: ['Kimlik'],
        satirlar: [{ Kimlik: uuidv5('musteri.HesapTelefonGecmisi:ornek-musteri-1:1'), HesapKimlik: hesapKimlik, TelefonE164: telefon.e164 }],
      }),
      eklemeYaz({
        tablo: 'makine.Makine',
        kolonlar: [k('Kimlik', 'uniqueidentifier'), k('MarkaKodu', 'nvarchar(20)'), k('SeriNo', KOD40), k('SeriNoYazildigiGibi', 'nvarchar(60)'), k('SeridenUretimYili', 'smallint'), k('SeriBicimeUygun', 'bit'), k('UrunKodu', 'nvarchar(60)'), k('OlusmaKaynagiKodu', KOD40), k('YapanTuruKodu', KOD40), k('YapanHesapKimlik', 'uniqueidentifier'), k('KaynakUygulamaKodu', KOD40)],
        anahtar: ['MarkaKodu', 'SeriNo'],
        satirlar: [{ Kimlik: makineKimlik, MarkaKodu: o.markaKodu, SeriNo: 'IPAK202400157', SeriNoYazildigiGibi: 'IPAK-2024-00157', SeridenUretimYili: 2024, SeriBicimeUygun: 1, UrunKodu: 'ipak-rulo', OlusmaKaynagiKodu: 'musteri', ...ortakYapan }],
      }),
      eklemeYaz({
        tablo: 'makine.MakineSahipligi',
        kolonlar: [k('Kimlik', 'uniqueidentifier'), k('MakineKimlik', 'uniqueidentifier'), k('HesapKimlik', 'uniqueidentifier'), k('KaynakKodu', KOD40), k('YapanTuruKodu', KOD40), k('YapanHesapKimlik', 'uniqueidentifier'), k('KaynakUygulamaKodu', KOD40)],
        anahtar: ['Kimlik'],
        satirlar: [{ Kimlik: uuidv5('makine.MakineSahipligi:IPAK202400157:1'), MakineKimlik: makineKimlik, HesapKimlik: hesapKimlik, KaynakKodu: 'musteri', ...ortakYapan }],
      }),
      eklemeYaz({
        tablo: 'makine.MakineServisAtamasi',
        kolonlar: [k('Kimlik', 'uniqueidentifier'), k('MakineKimlik', 'uniqueidentifier'), k('MarkaKodu', 'nvarchar(20)'), k('ServisKimlik', 'uniqueidentifier'), k('KaynakKodu', KOD40), k('YapanTuruKodu', KOD40), k('YapanKullaniciKimlik', 'uniqueidentifier'), k('YapanAdi', 'nvarchar(150)'), k('KaynakUygulamaKodu', KOD40)],
        anahtar: ['Kimlik'],
        satirlar: [{ Kimlik: uuidv5('makine.MakineServisAtamasi:IPAK202400157:1'), MakineKimlik: makineKimlik, MarkaKodu: o.markaKodu, ServisKimlik: isik.Kimlik, KaynakKodu: 'personel', YapanTuruKodu: 'personel', YapanKullaniciKimlik: admin.Kimlik, YapanAdi: admin.personel.AdSoyad, KaynakUygulamaKodu: 'backoffice' }],
      }),
    ].join('\n')
  )
}

/* ============================================================ ÜRETİM */

export async function uret() {
  const eslesme = kaynakJson('kod-eslesmeleri.json')
  const adlar = kaynakJson('kod-adlari.json')
  const markalar = kaynakJson('markalar.json').markalar
  const K = await kaynaklariOku()
  K.yerelAyar = {}
  for (const a of kaynakJson('ayarlar.json').ayarlar) {
    if (a.kaynak?.yerel) {
      const x = await yerelSabit(a.kaynak.yerel, a.kaynak.sabit)
      K.yerelAyar[`${a.kaynak.yerel}|${a.kaynak.sabit}`] = saglam(x, a.kaynak.yerel)
    }
  }
  const v01 = await t01Verisi(K, eslesme, adlar)
  /* Anahtar: veritabani/ altındaki göreli yol */
  const dosyalar = new Map()
  dosyalar.set('tohum/T01__kod_listeleri.sql', t01Yaz(v01))
  dosyalar.set('tohum/T02__cografya.sql', t02Yaz(K))
  dosyalar.set('tohum/T03__erisim_izinleri.sql', t03Yaz(K, eslesme))
  dosyalar.set('tohum/T04__sirket.sql', t04Yaz(K, markalar))
  dosyalar.set('tohum/T05__katalog.sql', await t05Yaz(K, markalar, v01))
  dosyalar.set('tohum/T06__fiyat_listeleri_parcalar.sql', t06Yaz(K, markalar))
  dosyalar.set('tohum/T07__kvkk_metinleri.sql', t07Yaz(K))
  dosyalar.set('tohum/T08__saklama_kurallari.sql', t08Yaz(v01))
  dosyalar.set('tohum/B01__ayarlar.sql', b01Yaz(K, markalar, v01))
  dosyalar.set('tohum/B02__tarife.sql', b02Yaz(K))
  dosyalar.set('tohum/B03__roller.sql', b03Yaz(K, eslesme))
  const ornek = ornekVerisi(K, markalar, eslesme)
  dosyalar.set('ornek/O01__servis_bayi.sql', o01Yaz(ornek))
  dosyalar.set('ornek/O02__yerel_kullanicilar.sql', o02Yaz(ornek))
  dosyalar.set('ornek/O03__sinama_verisi.sql', o03Yaz(ornek))
  /* --denetle --ortam için: tohumun sahibi olduğu, NOT MATCHED BY SOURCE
     yazılmayan tabloların kaynaktaki anahtarları */
  const kaynakAnahtarlari = [
    ...v01.L.map((l) => ({ tablo: l.tablo, kolon: 'Kod', degerler: l.satirlar.map((s) => s.Kod) })),
    { tablo: 'erisim.IzinGrubu', kolon: 'Kod', degerler: K.yetkiler.YETKI_KATALOG.map((g) => eslesme.listeler['erisim.IzinGrubu'].etiketler[g.grup]) },
    { tablo: 'erisim.Izin', kolon: 'Kod', degerler: K.yetkiler.TUM_IZINLER },
    { tablo: 'cografya.Ulke', kolon: 'Kod', degerler: K.ulkeler.ULKELER.map((u) => u.iso) },
    { tablo: 'cografya.Il', kolon: 'IlKodu', degerler: kaynakJson('il-plaka.json').map((x) => x.IlKodu) },
    { tablo: 'cografya.Ilce', kolon: 'IlceKodu', degerler: kaynakJson('ilce-kodlari.json').map((x) => x.IlceKodu) },
    { tablo: 'katalog.Kategori', kolon: 'Kod', degerler: K.marka.CATEGORIES.map((c) => c.id) },
    { tablo: 'sistem.SaklamaKurali', kolon: 'KayitTuruKodu', degerler: kaynakJson('saklama-kurallari.json').kurallar.map((x) => x.KayitTuruKodu) },
  ]
  return { dosyalar, v01, kaynakAnahtarlari }
}

function yerTutucuSay(metin) {
  return (metin.match(/<Codex metni:/g) || []).length
}

/* --denetle --ortam: veritabanında olup kaynakta olmayan satırlar
   (tasarim.md 5.5: yalnız listelenir). */
async function veritabaniniKarsilastir(s, kaynakAnahtarlari) {
  const { ortamYukle } = await import('./ortam.mjs')
  const { sorguJson } = await import('./sqlcmd.mjs')
  const ayar = ortamYukle({ ayar: s.ayar, ortam: s.ortam })
  if (s.veritabani) ayar.veritabani = s.veritabani
  const liste = []
  for (const { tablo, kolon, degerler } of kaynakAnahtarlari) {
    const db = sorguJson({ ayar, giris: 'sahip', sorgu: `SELECT ${kolon} AS Anahtar FROM ${tablo} FOR JSON PATH` }).map((x) => x.Anahtar)
    const kaynak = new Set(degerler.map(String))
    const fazla = db.filter((x) => !kaynak.has(String(x)))
    if (fazla.length) liste.push(`${tablo}: ${fazla.join(', ')}`)
  }
  return { ayar, liste }
}

/**
 * Tohum betikleri kaynakla tutuyor mu — HİÇBİR DOSYAYA YAZMAZ.
 *
 * `calistir --denetle` ile aynı ölçüm; ayrı işlev olmasının nedeni,
 * `npm run dogrula` 13. kontrolünün sonucu kendi biçiminde yazması ve
 * neyi sorun sayacağına kendisinin karar vermesi (yer tutucu sayısı orada
 * sorun değil, 12. kontrolün konusu).
 *
 * @returns {Promise<{hata: string|null, dosyalar: Map<string,string>|null,
 *   kaynakAnahtarlari: unknown, farkli: string[], fazla: string[], yerTutucu: number}>}
 */
export async function tohumDurumu() {
  const bos = { hata: null, dosyalar: null, kaynakAnahtarlari: null, farkli: [], fazla: [], yerTutucu: 0 }
  let sonuc
  try {
    sonuc = await uret()
  } catch (e) {
    if (e instanceof UretimHatasi) return { ...bos, hata: e.message }
    throw e
  }
  const { dosyalar, kaynakAnahtarlari } = sonuc
  const beklenen = new Set(dosyalar.keys())
  const fazla = []
  for (const [klasor, kalip] of [['tohum', /^[TB]\d{2}__.*\.sql$/], ['ornek', /^O\d{2}__.*\.sql$/]]) {
    const yol = join(VT_KLASORU, klasor)
    if (!existsSync(yol)) continue
    for (const a of readdirSync(yol)) if (kalip.test(a) && !beklenen.has(`${klasor}/${a}`)) fazla.push(`${klasor}/${a}`)
  }
  let yerTutucu = 0
  const farkli = []
  for (const [ad, icerik] of dosyalar) {
    yerTutucu += yerTutucuSay(icerik)
    const yol = join(VT_KLASORU, ad)
    const eski = existsSync(yol) ? readFileSync(yol, 'utf8') : null
    if (eski !== icerik) farkli.push(ad)
  }
  return { hata: null, dosyalar, kaynakAnahtarlari, farkli, fazla, yerTutucu }
}

/**
 * tools/vt.mjs "tohum" komutu.
 * @param {{bayrak: Set<string>, ayar?: string, ortam?: string, veritabani?: string}} s
 */
export async function calistir(s = { bayrak: new Set() }) {
  const denetle = s.bayrak?.has('denetle')
  const durum = await tohumDurumu()
  if (durum.hata) {
    console.error(`Tohum üretilemedi: ${durum.hata}`)
    process.exitCode = 1
    return
  }
  const { dosyalar, kaynakAnahtarlari, farkli, fazla, yerTutucu } = durum
  if (!denetle) {
    for (const klasor of ['tohum', 'ornek']) mkdirSync(join(VT_KLASORU, klasor), { recursive: true })
    for (const ad of farkli) writeFileSync(join(VT_KLASORU, ad), dosyalar.get(ad), 'utf8')
  }
  if (denetle) {
    if (farkli.length) {
      console.log(`Tohum betikleri kaynakla tutmuyor (yeniden üretin: npm run vt -- tohum):\n  - ${farkli.join('\n  - ')}`)
      process.exitCode = 1
    } else {
      console.log(`Tohum betikleri kaynakla aynı (${dosyalar.size} dosya).`)
    }
    if (fazla.length) {
      console.log(`Üreticinin yazmadığı T/B betiği var: ${fazla.join(', ')}`)
      process.exitCode = 1
    }
    if (yerTutucu) {
      console.log(`Codex'ten geçmemiş ${yerTutucu} yer tutucu metin var (tohum/kaynak/kod-adlari.json ve betik iletileri).`)
      process.exitCode = 1
    }
    if (s.ortam || s.ayar) {
      const { ayar, liste } = await veritabaniniKarsilastir(s, kaynakAnahtarlari)
      console.log(liste.length ? `${ayar.veritabani}: veritabanında olup kaynakta olmayan satırlar (sorun sayılmaz):\n  - ${liste.join('\n  - ')}` : `${ayar.veritabani}: kaynakta olmayan satır yok.`)
    }
    return
  }
  console.log(farkli.length ? `Yazıldı: ${farkli.join(', ')}` : `Değişiklik yok (${dosyalar.size} dosya güncel).`)
  if (fazla.length) console.log(`Uyarı: üreticinin yazmadığı T/B betiği var: ${fazla.join(', ')}`)
  if (yerTutucu) console.log(`Uyarı: Codex'ten geçmemiş ${yerTutucu} yer tutucu metin (test/canlıya çıkmaz).`)
}

/* Doğrudan çalıştırılırsa: node tools/vt/tohum-uret.mjs [--denetle] */
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const bayrak = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2)))
  calistir({ bayrak }).catch((e) => {
    console.error(e.stack || e.message)
    process.exit(1)
  })
}
