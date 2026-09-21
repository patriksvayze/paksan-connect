/* ==========================================================================
   Fiyat listesi okuma ve yayına alma sınaması

       node tools/fiyat-listesi-okuma-sinamasi.mjs

   `npm run dogrula` bunu 8. kontrolden çağırıyor.

   İKİ ŞEYİ DENETLİYOR

   1. OKUMA (src/lib/fiyatListesiOku.js). Backoffice'te personelin
      yüklediği PDF bu dosyayla okunuyor. 21 Eylül 2026'ya kadar aynı işi
      bir Python betiği yapıyordu ve bugünkü katalog
      (sunucu-taklidi/parca-katalogu/) onun çıktısı. Sınama aynı PDF'i
      yeni okuyucuyla okuyup kataloğa karşılaştırıyor: her parçanın kodu,
      adı, fiyatı, grubu ve görseli olup olmadığı, grupların sırası ve
      sayısı, ve her görselin kırpılmış boyutu (görseller dosyadan
      okunuyor). Boyut, resmin doğru parçaya gittiğinin ve aynı
      kırpıldığının ölçüsü.

      PDF depoda değil (7,8 MB, PAKSAN'ın belgesi). Aranan yer:
      PAKSAN_FIYAT_LISTESI_PDF ortam değişkeni, yoksa depo klasörünün
      yanındaki kaynaklar/ASD/<katalogdaki kaynak adı>. Bulunamazsa ya
      da katalog başka bir listeden yayına alınmışsa bu bölüm "atlandı"
      yazar — sessizce "geçti" demez.

   2. YAYINA ALMA (sunucu-taklidi/fiyat-listesi-yayini.mjs). Geçici bir
      klasörde: yeni liste sürümü bir artırıyor mu, eski liste arşive
      gidiyor mu, görseller ve PDF yazılıyor mu; ve kurala uymayan liste
      (fiyatı okunmamış, aynı kod iki kez, başka klasöre yazmaya çalışan
      görsel adı ya da ek dosya, PDF olmayan dosya) reddediliyor mu. Reddedilen listede
      yürürlükteki liste hiç değişmiyor mu.

   BİLEREK BOZULARAK DENENDİ (21 Eylül 2026):

     fiyatListesiOku.js sütun merkezi 283 → 300            düştü
     fiyatListesiOku.js süs eşiği 5 → 50 (logo parça olur)  düştü
     fiyatListesiOku.js kırpma payı /40 → /20               düştü
     fiyat-listesi-yayini.mjs fiyat denetimi kaldırılırsa   düştü
     fiyat-listesi-yayini.mjs görsel adı kalıbı gevşerse    düştü
     fiyat-listesi-yayini.mjs arşive kopyalama kaldırılırsa düştü
     fiyat-listesi-yayini.mjs çıkan parçanın görselini silmezse düştü

   DÜŞMEYENLER DE YAZILI, çünkü neyi iddia etmediğimiz de bilgi:
   okuyucudaki yazı yükseltisi düzeltmesi ve resimlerin satır bütününde
   paylaştırılması bugünkü listede sonucu değiştirmiyor (aralıklar
   geniş, her resim zaten kendi sütununa en yakın). İkisi eski betiğin
   ölçülerine sadakat için duruyor; bu sınama onları korumuyor.
   ========================================================================== */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..')
const ice = (yol) => import(pathToFileURL(join(KOK, yol)).href)

let dusen = 0
const iddia = (kosul, ad, ayrinti = '') => {
  if (kosul) return
  dusen += 1
  console.log(`  ! ${ad}${ayrinti ? ` — ${ayrinti}` : ''}`)
}

/* ----------------------------------------------------------- 1. Okuma */

function webpBoyutu(b) {
  const tur = b.toString('ascii', 12, 16)
  if (tur === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]
  if (tur === 'VP8L') {
    const v = b.readUInt32LE(21)
    return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]
  }
  if (tur === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)]
  return null
}

async function okumaSinamasi() {
  const katalogYolu = join(KOK, 'sunucu-taklidi', 'parca-katalogu', 'katalog.json')
  const katalog = JSON.parse(readFileSync(katalogYolu, 'utf8'))
  const adaylar = [
    process.env.PAKSAN_FIYAT_LISTESI_PDF,
    join(KOK, '..', 'kaynaklar', 'ASD', katalog.kaynak || ''),
  ].filter(Boolean)
  const pdfYolu = adaylar.find((y) => existsSync(y) && y.toLowerCase().endsWith('.pdf'))
  if (!pdfYolu) {
    console.log(`  okuma: atlandı — "${katalog.kaynak}" bulunamadı (PAKSAN_FIYAT_LISTESI_PDF ile yol verilebilir)`)
    return
  }
  if (basename(pdfYolu) !== katalog.kaynak) {
    console.log(`  okuma: atlandı — yürürlükteki katalog "${katalog.kaynak}" listesinden, PDF "${basename(pdfYolu)}"`)
    return
  }

  const pdfjs = await ice('node_modules/pdfjs-dist/legacy/build/pdf.mjs')
  const { fiyatListesiniOku, rgbaYap, kirpmaKutusu, GORSEL_EN } = await ice('src/lib/fiyatListesiOku.js')

  const sonuc = await fiyatListesiniOku(readFileSync(pdfYolu), {
    pdfjs,
    kaynak: basename(pdfYolu),
    gorselIsle: async (r) => {
      const k = kirpmaKutusu(rgbaYap(r), r.width, r.height)
      return k.w > GORSEL_EN ? [GORSEL_EN, Math.max(1, Math.round((k.h * GORSEL_EN) / k.w))] : [k.w, k.h]
    },
  })

  const beklenen = katalog.parcalar
  const okunan = sonuc.katalog.parcalar
  iddia(okunan.length === beklenen.length, 'parça sayısı', `${okunan.length} okundu, katalogda ${beklenen.length}`)

  let alanFarki = 0
  let ilkFark = ''
  for (let i = 0; i < Math.max(okunan.length, beklenen.length); i++) {
    const a = beklenen[i]
    const b = okunan[i]
    for (const alan of ['kod', 'ad', 'fiyat', 'grup']) {
      if (a?.[alan] !== b?.[alan]) {
        alanFarki += 1
        ilkFark ||= `${i}. parça ${alan}: katalogda ${JSON.stringify(a?.[alan])}, okunan ${JSON.stringify(b?.[alan])}`
      }
    }
    if (Boolean(a?.gorsel) !== Boolean(b?.gorsel)) {
      alanFarki += 1
      ilkFark ||= `${i}. parça (${a?.kod}) görseli: katalogda ${a?.gorsel ? 'var' : 'yok'}, okunan ${b?.gorsel ? 'var' : 'yok'}`
    }
  }
  iddia(alanFarki === 0, 'parçaların kod, ad, fiyat, grup ve görsel alanları katalogla aynı', `${alanFarki} fark; ilki ${ilkFark}`)

  const gruplar = (g) => g.map((x) => `${x.id}:${x.ad}:${x.adet}`).join('|')
  iddia(gruplar(sonuc.katalog.gruplar) === gruplar(katalog.gruplar), 'grupların sırası, adı ve sayısı katalogla aynı')

  let boyutFarki = 0
  let ilkBoyut = ''
  for (const p of beklenen) {
    if (!p.gorsel) continue
    const dosya = join(KOK, 'sunucu-taklidi', 'parca-katalogu', 'gorseller', p.gorsel)
    if (!existsSync(dosya) || !p.gorsel.endsWith('.webp')) continue
    const var_ = webpBoyutu(readFileSync(dosya))
    const hesap = sonuc.gorseller.get(p.kod)
    if (!var_ || !hesap || var_[0] !== hesap[0] || var_[1] !== hesap[1]) {
      boyutFarki += 1
      ilkBoyut ||= `${p.kod}: dosyada ${var_?.join('x')}, hesaplanan ${hesap?.join('x')}`
    }
  }
  iddia(boyutFarki === 0, 'her görselin kırpılmış boyutu katalogdakiyle aynı', `${boyutFarki} fark; ilki ${ilkBoyut}`)

  console.log(`  okuma: ${basename(pdfYolu)} · ${sonuc.sayfaSayisi} sayfa · ${okunan.length} parça · ${sonuc.katalog.gruplar.length} grup · ${sonuc.gorseller.size} görsel`)
}

/* --------------------------------------------------- 2. Yayına alma */

async function yayinSinamasi() {
  const { fiyatListesiniYayinla } = await ice('sunucu-taklidi/fiyat-listesi-yayini.mjs')
  const kok = mkdtempSync(join(tmpdir(), 'paksan-fiyat-listesi-'))
  const b64 = (s) => Buffer.from(s).toString('base64')

  try {
    /* Yürürlükteki liste: sürüm 1, tek parça. */
    const canli = join(kok, 'parca-katalogu')
    mkdirSync(join(canli, 'gorseller'), { recursive: true })
    writeFileSync(join(canli, 'katalog.json'), JSON.stringify({
      surum: 1, kaynak: 'eski.pdf',
      gruplar: [{ id: 'g1', ad: 'G1', adet: 1 }],
      parcalar: [
        { kod: '100', ad: 'ESKİ', fiyat: 10, grup: 'g1', gorsel: '100.webp' },
        { kod: '999', ad: 'LİSTEDEN ÇIKAN', fiyat: 7, grup: 'g1', gorsel: '999.webp' },
      ],
    }))
    writeFileSync(join(canli, 'gorseller', '100.webp'), 'eski-gorsel')
    writeFileSync(join(canli, 'gorseller', '999.webp'), 'cikan-gorsel')

    const gecerli = () => ({
      katalog: {
        kaynak: 'yeni.pdf',
        gruplar: [{ id: 'g1', ad: 'G1', adet: 2 }],
        parcalar: [
          { kod: '100', ad: 'YENİ AD', fiyat: 12, grup: 'g1', gorsel: '100.webp' },
          { kod: '200.01', ad: 'İKİNCİ', fiyat: 5, grup: 'g1', gorsel: null },
        ],
      },
      gorseller: { '100.webp': b64('yeni-gorsel') },
      kaynakPdf: b64('%PDF-1.7 deneme'),
      personel: 'Sınama',
    })

    /* Reddedilmesi gerekenler — ve reddedilince yürürlükteki liste değişmemeli. */
    const bozuklar = {
      'fiyatı okunmamış parça': (g) => { g.katalog.parcalar[1].fiyat = null },
      'aynı kod iki kez': (g) => { g.katalog.parcalar[1].kod = '100' },
      'başka klasöre yazmaya çalışan görsel adı': (g) => {
        g.katalog.parcalar[0].gorsel = '../100.webp'
        g.gorseller = { '../100.webp': b64('x') }
      },
      /* Listede adı geçmeyen ek dosya: parça koduyla eşleşme denetimi
         buna bakmıyor, onu yalnız dosya adı kalıbı durduruyor. */
      'listede olmayan, klasör dışına yazmaya çalışan ek görsel': (g) => {
        g.gorseller['../../kotu.webp'] = b64('x')
      },
      'görseli yazılı ama dosyası gelmemiş parça': (g) => { g.gorseller = {} },
      'listede olmayan grup': (g) => { g.katalog.parcalar[1].grup = 'yok' },
      'PDF olmayan kaynak dosya': (g) => { g.kaynakPdf = b64('merhaba') },
      'boş liste': (g) => { g.katalog.parcalar = [] },
    }
    for (const [ad, boz] of Object.entries(bozuklar)) {
      const g = gecerli()
      boz(g)
      let reddedildi = false
      try {
        fiyatListesiniYayinla(kok, g)
      } catch (e) {
        reddedildi = Boolean(e.kod)
      }
      iddia(reddedildi, `${ad} reddediliyor`)
    }
    const hala = JSON.parse(readFileSync(join(canli, 'katalog.json'), 'utf8'))
    iddia(hala.surum === 1 && hala.parcalar[0].ad === 'ESKİ', 'reddedilen listeler yürürlüktekini değiştirmedi')
    iddia(!existsSync(join(kok, 'parca-katalogu.yeni')), 'reddedilen listeden yarım klasör kalmadı')

    /* Geçerli liste. */
    const simdi = new Date('2026-09-21T10:00:00Z')
    const sonuc = fiyatListesiniYayinla(kok, gecerli(), simdi)
    iddia(sonuc.surum === 2 && sonuc.parca === 2, 'sürüm bir arttı, iki parça yayında', JSON.stringify(sonuc))

    const yeni = JSON.parse(readFileSync(join(canli, 'katalog.json'), 'utf8'))
    iddia(yeni.surum === 2 && yeni.kaynak === 'yeni.pdf' && yeni.yayinlayan === 'Sınama', 'yeni katalogda sürüm, kaynak ve yayınlayan yazılı')
    iddia(yeni.parcalar[0].ad === 'YENİ AD' && yeni.parcalar[1].gorsel === null, 'yeni katalogdaki parçalar gelen liste')
    iddia(yeni.gruplar[0].adet === 2, 'grup sayısı sunucuda yeniden sayıldı')
    iddia(readFileSync(join(canli, 'gorseller', '100.webp'), 'utf8') === 'yeni-gorsel', 'yeni görsel yazıldı')
    iddia(readFileSync(join(canli, 'kaynak.pdf'), 'latin1').startsWith('%PDF'), 'kaynak PDF listeyle birlikte saklandı')

    const arsivler = existsSync(join(kok, 'parca-katalogu-arsiv')) ? readdirSync(join(kok, 'parca-katalogu-arsiv')) : []
    iddia(arsivler.length === 1 && arsivler[0].startsWith('1-'), 'eski liste sürüm numarasıyla arşive gitti', arsivler.join(', '))
    if (arsivler[0]) {
      const eski = JSON.parse(readFileSync(join(kok, 'parca-katalogu-arsiv', arsivler[0], 'katalog.json'), 'utf8'))
      iddia(eski.parcalar[0].ad === 'ESKİ', 'arşivdeki liste eskisinin aynısı')
      iddia(existsSync(join(kok, 'parca-katalogu-arsiv', arsivler[0], 'gorseller', '999.webp')), 'listeden çıkan parçanın görseli arşivde duruyor')
    }
    iddia(!existsSync(join(canli, 'gorseller', '999.webp')), 'listeden çıkan parçanın görseli yürürlükten kalktı')
    iddia(!existsSync(join(kok, 'parca-katalogu.yeni')) && !existsSync(join(canli, 'katalog.json.yeni')), 'yayından sonra yan klasör ve geçici dosya kalmadı')
    console.log('  yayına alma: 8 bozuk liste reddedildi, geçerli liste arşivle birlikte yayına girdi')
  } finally {
    rmSync(kok, { recursive: true, force: true })
  }
}

await okumaSinamasi()
await yayinSinamasi()

if (dusen) {
  console.log(`\nSONUÇ: ${dusen} iddia düştü.`)
  process.exit(1)
}
console.log('\nSONUÇ: fiyat listesi okuma ve yayına alma sınaması geçti.')
