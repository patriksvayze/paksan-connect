/* ==========================================================================
   Kullanım kılavuzu dosyaları — sunucudaki klasör uygulamayla tutuyor mu

   29 Eylül 2026'dan beri kılavuz, basılı kılavuzun PDF'i; sunucudaki bir
   klasörden okunuyor (bkz. src/lib/kilavuzPdf.js, sunucu-taklidi/
   BENIOKU.md). Geliştirmede klasör sunucu-taklidi/kilavuzlar/. Burada
   bakılanlar:

     1. Kılavuzu olan her ürünün kodu (data/icerik/kilavuzEslesme.js →
        URUN_KILAVUZU) klasörün listesinde (kilavuzlar.json) var mı.
        Yoksa ürün sayfası "Kullanım Kılavuzu" gösterir, dokununca
        kılavuz indirilemez.
     2. Listedeki her kaydın alanları doğru mu: dosya adı .pdf, adın iki
        dili, sayfa ve boyut sayı, diller, arıza tablosunun sayfası.
     3. Dosya klasörde var mı, gerçekten PDF mi, boyutu listedekiyle aynı
        mı. Liste başka, dosya başka olursa çiftçi yanlış boyutu görür;
        telefona inen dosya da "yeni baskı mı" sorusunu yanlış cevaplar.
     4. Sayfa sayısı listedekiyle aynı mı, arıza tablosunun sayfası
        kılavuzun içinde mi (pdf.js ile açılarak).
     5. Listede, hiçbir ürünün kullanmadığı kılavuz var mı (uyarı değil,
        hata: bir kılavuz yanlış koda yazılmış olabilir).

   PDF'ler depoda değil (.gitignore; 38 MB, sunucunun verisi). Dosya
   yoksa bu denetim DÜŞÜYOR: geliştirme sunucusu o kılavuzu veremez,
   ekran turu da kılavuzu açamaz. PDF'lerin kaynağı BENIOKU.md'de.

   BOZARAK SINANDI (29 Eylül 2026):
     listede bir boyut 1 bayt değiştirilince                     düştü
     listeden bir kılavuz silinince (ürün kodu kalınca)           düştü
     bir PDF klasörden kaldırılınca                               düştü
     arıza sayfası sayfa sayısından büyük yazılınca               düştü
     listede kullanılmayan bir kılavuz bırakılınca                düştü
   ========================================================================== */

import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const KOK = fileURLToPath(new URL('..', import.meta.url))
const KLASOR = join(KOK, 'sunucu-taklidi', 'kilavuzlar')

const sorunlar = []
const sorun = (m) => sorunlar.push(m)

const { URUN_KILAVUZU } = await import(
  pathToFileURL(join(KOK, 'src/data/icerik/kilavuzEslesme.js')).href
)

const listeYolu = join(KLASOR, 'kilavuzlar.json')
if (!existsSync(listeYolu)) {
  console.log('  ✗ sunucu-taklidi/kilavuzlar/kilavuzlar.json yok')
  process.exit(1)
}
const liste = JSON.parse(readFileSync(listeYolu, 'utf8')).kilavuzlar || {}

const pdfjs = await import(
  pathToFileURL(join(KOK, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs')).href
)

const kullanilan = new Set(Object.values(URUN_KILAVUZU))

/* 1 */
for (const [urun, kod] of Object.entries(URUN_KILAVUZU)) {
  if (!liste[kod]) sorun(`${urun} → ${kod}: kılavuz listesinde yok`)
}

/* 5 */
for (const kod of Object.keys(liste)) {
  if (!kullanilan.has(kod)) sorun(`${kod}: listede var ama hiçbir ürün kullanmıyor`)
}

for (const [kod, b] of Object.entries(liste)) {
  /* 2 */
  if (typeof b.dosya !== 'string' || !/\.pdf$/i.test(b.dosya)) { sorun(`${kod}: dosya adı .pdf değil`); continue }
  if (/[\\/]|\.\./.test(b.dosya)) { sorun(`${kod}: dosya adı klasör dışını gösteriyor`); continue }
  if (!b.ad?.tr || !b.ad?.en) sorun(`${kod}: adın Türkçesi ya da İngilizcesi eksik`)
  if (!Number.isInteger(b.sayfa) || b.sayfa < 1) sorun(`${kod}: sayfa sayısı geçersiz`)
  if (!Number.isInteger(b.boyut) || b.boyut < 1) sorun(`${kod}: boyut geçersiz`)
  if (!Array.isArray(b.diller) || !b.diller.includes('tr')) sorun(`${kod}: diller geçersiz`)
  if (!Number.isInteger(b.arizaSayfasi) || b.arizaSayfasi < 1) sorun(`${kod}: arıza tablosunun sayfası geçersiz`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.baski || '')) sorun(`${kod}: baskı tarihi geçersiz`)

  /* 3 */
  const yol = join(KLASOR, b.dosya)
  if (!existsSync(yol)) { sorun(`${kod}: ${b.dosya} klasörde yok (kaynağı: sunucu-taklidi/BENIOKU.md)`); continue }
  const gercekBoyut = statSync(yol).size
  if (gercekBoyut !== b.boyut) sorun(`${kod}: listede ${b.boyut} bayt, dosya ${gercekBoyut} bayt`)
  const bayt = readFileSync(yol)
  if (bayt.subarray(0, 5).toString('latin1') !== '%PDF-') { sorun(`${kod}: ${b.dosya} PDF değil`); continue }

  /* 4 */
  try {
    const belge = await pdfjs.getDocument({ data: new Uint8Array(bayt), isEvalSupported: false, verbosity: 0 }).promise
    if (belge.numPages !== b.sayfa) sorun(`${kod}: listede ${b.sayfa} sayfa, kılavuz ${belge.numPages} sayfa`)
    if (b.arizaSayfasi > belge.numPages) sorun(`${kod}: arıza sayfası ${b.arizaSayfasi}, kılavuz ${belge.numPages} sayfa`)
    await belge.loadingTask.destroy()
  } catch (e) {
    sorun(`${kod}: ${b.dosya} açılamadı (${e.message})`)
  }
}

if (sorunlar.length) {
  for (const m of sorunlar) console.log('  ✗ ' + m)
  process.exit(1)
}
console.log(`  ok ${Object.keys(liste).length} kılavuz, ${Object.keys(URUN_KILAVUZU).length} ürün; dosyalar listeyle aynı`)
