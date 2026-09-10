/* ==========================================================================
   Android uygulama ikonlarını üretir — iki uygulama için

       node tools/ikon-uret.mjs app      PAKSAN Connect   (beyaz zemin)
       node tools/ikon-uret.mjs servis   PAKSAN Servisim  (turuncu zemin)

   Kaynak: src/marka/varliklar/paksan-amblem.png (kalkan amblemi)

   İKİ UYGULAMA AYNI AMBLEMİ TAŞIYOR, ZEMİNLE AYRILIYOR

   Hem müşteri hem servis uygulamasını kuran biri (bayi personeli, test
   eden PAKSAN çalışanı) iki simgeyi telefonda yan yana görecek. İkisi
   aynı olsaydı hangisine dokunacağını ancak altındaki yazıyı okuyarak
   bulurdu.

     Connect   beyaz zemin — karşılama ekranındaki beyaz rozetin aynısı.
     Servisim  marka turuncusu — makinelerin gövde rengi. Amblemin
               lacivert kalkanı turuncunun üstünde net ayrılıyor.

   Lacivert zemin denenmedi ve bilerek: amblemin kendi kalkanı lacivert,
   üstüne konduğunda kalkanın kenarı kayboluyor.

   Turuncu `src/marka/renkler.css` dosyasından okunuyor; marka rengi
   değişirse simge de onunla değişiyor.

   ÇIKTI

   Her mipmap klasörüne üç dosya:
     ic_launcher.png            eski Android (kare)
     ic_launcher_round.png      eski Android (yuvarlak)
     ic_launcher_foreground.png Android 8+ uyarlanır ikon ön katmanı
   ve values/ic_launcher_background.xml (uyarlanır ikonun zemin rengi).

   Uygulama adı da values/strings.xml içine yazılıyor: Capacitor adı
   yalnız Android projesi İLK oluşturulurken yazıyor, sonradan değişen
   ad (PAKSAN Servis → PAKSAN Servisim gibi) oraya kendiliğinden
   geçmiyor.

   Android projesi henüz yoksa (servis için `android-servis/` ilk APK
   derlemesinde oluşuyor) yalnız önizleme üretiliyor:
   tools/kaynak/ikon-onizleme-<uygulama>.png
   ========================================================================== */

import sharp from 'sharp'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const KAYNAK = 'src/marka/varliklar/paksan-amblem.png'

function markaRengi(ad) {
  const css = readFileSync('src/marka/renkler.css', 'utf8')
  const eslesme = css.match(new RegExp(`--${ad}:\\s*(#[0-9a-fA-F]{6})`))
  if (!eslesme) throw Error(`renkler.css içinde --${ad} bulunamadı`)
  return eslesme[1]
}

const HEDEFLER = {
  app: { ad: 'PAKSAN Connect', res: 'android/app/src/main/res', zemin: '#FFFFFF' },
  servis: { ad: 'PAKSAN Servisim', res: 'android-servis/app/src/main/res', zemin: markaRengi('marka-turuncu') },
}

const onaltiliyaRenk = (h) => ({
  r: parseInt(h.slice(1, 3), 16),
  g: parseInt(h.slice(3, 5), 16),
  b: parseInt(h.slice(5, 7), 16),
  alpha: 1,
})

/* Her yoğunluk için ikon boyutu (px) */
const YOGUNLUKLAR = [
  { ad: 'mdpi', boy: 48 },
  { ad: 'hdpi', boy: 72 },
  { ad: 'xhdpi', boy: 96 },
  { ad: 'xxhdpi', boy: 144 },
  { ad: 'xxxhdpi', boy: 192 },
]

/* Uyarlanır ikonun ön katmanı, kare ikonun 1.5 katı tuval ister; içeriğin
   güvenli alanda kalması için amblem tuvalin %58'ini kaplıyor. Android
   ikonu daire, kare veya damla şeklinde kırpsa da amblem hep içeride. */
const ONKATMAN_ORANI = 1.5
const GUVENLI_ORAN = 0.58

/** Amblemi verilen tuvalin ortasına, verilen oranda yerleştirir. */
async function ortala(tuval, amblemBoyu, zemin) {
  const amblem = await sharp(KAYNAK)
    .resize(amblemBoyu, amblemBoyu, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()

  return sharp({
    create: {
      width: tuval,
      height: tuval,
      channels: 4,
      background: zemin || { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: amblem, gravity: 'center' }])
    .png()
}

/** Yuvarlak maske — eski Android'in yuvarlak ikonu için */
function daireMaskesi(boy) {
  const r = boy / 2
  return Buffer.from(
    `<svg width="${boy}" height="${boy}"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`
  )
}

async function uret(anahtar) {
  const hedef = HEDEFLER[anahtar]
  if (!hedef) {
    console.error('Kullanım: node tools/ikon-uret.mjs app|servis')
    process.exit(2)
  }
  const zemin = onaltiliyaRenk(hedef.zemin)

  /* Önizleme: Android projesi olmasa da simgenin nasıl göründüğü
     görülebilsin. Yuvarlak hâli, telefonların çoğunun gösterdiği biçim. */
  await mkdir('tools/kaynak', { recursive: true })
  const kareOnizleme = await (await ortala(512, Math.round(512 * 0.72), zemin)).toBuffer()
  const yuvarlakOnizleme = await sharp(kareOnizleme)
    .composite([{ input: daireMaskesi(512), blend: 'dest-in' }])
    .png()
    .toBuffer()
  await writeFile(`tools/kaynak/ikon-onizleme-${anahtar}.png`, yuvarlakOnizleme)
  console.log(`${hedef.ad} · zemin ${hedef.zemin}`)
  console.log(`  önizleme: tools/kaynak/ikon-onizleme-${anahtar}.png`)

  if (!existsSync(hedef.res)) {
    console.log(
      `\n${hedef.res} henüz yok. Android projesi ilk APK derlemesinde oluşuyor;` +
        ' npm run apk:servis bu komutu kendisi çalıştırıyor.',
    )
    return
  }

  for (const { ad, boy } of YOGUNLUKLAR) {
    const klasor = path.join(hedef.res, `mipmap-${ad}`)
    await mkdir(klasor, { recursive: true })

    /* Kare ikon — amblem zeminin %72'sini kaplar */
    const kare = await (await ortala(boy, Math.round(boy * 0.72), zemin)).toBuffer()
    await writeFile(path.join(klasor, 'ic_launcher.png'), kare)

    /* Yuvarlak ikon — aynı görsel, daire maskesiyle kırpılmış */
    const yuvarlak = await sharp(kare)
      .composite([{ input: daireMaskesi(boy), blend: 'dest-in' }])
      .png()
      .toBuffer()
    await writeFile(path.join(klasor, 'ic_launcher_round.png'), yuvarlak)

    /* Uyarlanır ikon ön katmanı — zemin saydam, amblem güvenli alanda */
    const onTuval = Math.round(boy * ONKATMAN_ORANI)
    const on = await (await ortala(onTuval, Math.round(onTuval * GUVENLI_ORAN), null)).toBuffer()
    await writeFile(path.join(klasor, 'ic_launcher_foreground.png'), on)

    console.log(`  mipmap-${ad}: ${boy}px kare, ${onTuval}px ön katman`)
  }

  await mkdir(path.join(hedef.res, 'values'), { recursive: true })
  await writeFile(
    path.join(hedef.res, 'values', 'ic_launcher_background.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n' +
      `    <color name="ic_launcher_background">${hedef.zemin.toUpperCase()}</color>\n</resources>\n`,
    'utf8',
  )

  const dizgiler = path.join(hedef.res, 'values', 'strings.xml')
  if (existsSync(dizgiler)) {
    const eski = readFileSync(dizgiler, 'utf8')
    const yeni = eski
      .replace(/(<string name="app_name">)[^<]*(<\/string>)/, `$1${hedef.ad}$2`)
      .replace(/(<string name="title_activity_main">)[^<]*(<\/string>)/, `$1${hedef.ad}$2`)
    if (yeni !== eski) {
      await writeFile(dizgiler, yeni, 'utf8')
      console.log(`  uygulama adı: ${hedef.ad}`)
    }
  }

  console.log('\nİkonlar üretildi.')
}

uret(process.argv[2] || 'app').catch((e) => {
  console.error('İkon üretilemedi:', e.message)
  process.exit(1)
})
