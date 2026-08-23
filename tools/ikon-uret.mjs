/* ==========================================================================
   Android uygulama ikonlarını üretir.

   Kaynak: src/assets/marka/paksan-amblem.png (192x192, kalkan amblemi)

   Amblem çok renkli (lacivert kalkan + beyaz detaylar) olduğu için zemin
   BEYAZ seçildi — uygulamanın karşılama ekranındaki beyaz rozetin aynısı.
   Lacivert zemine koyulsa amblemin kendi lacivertiyle karışırdı.

   Her mipmap klasörüne üç dosya yazılır:
     ic_launcher.png            eski Android (kare)
     ic_launcher_round.png      eski Android (yuvarlak)
     ic_launcher_foreground.png Android 8+ uyarlanır ikon katmanı

   Çalıştırmak için:  node tools/ikon-uret.mjs
   ========================================================================== */

import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const KAYNAK = 'src/assets/marka/paksan-amblem.png'
const HEDEF = 'android/app/src/main/res'
const ZEMIN = { r: 255, g: 255, b: 255, alpha: 1 }

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

async function uret() {
  for (const { ad, boy } of YOGUNLUKLAR) {
    const klasor = path.join(HEDEF, `mipmap-${ad}`)
    await mkdir(klasor, { recursive: true })

    /* Kare ikon — amblem beyaz zeminin %72'sini kaplar */
    const kare = await (await ortala(boy, Math.round(boy * 0.72), ZEMIN)).toBuffer()
    await writeFile(path.join(klasor, 'ic_launcher.png'), kare)

    /* Yuvarlak ikon — aynı görsel, daire maskesiyle kırpılmış */
    const yuvarlak = await sharp(kare)
      .composite([{ input: daireMaskesi(boy), blend: 'dest-in' }])
      .png()
      .toBuffer()
    await writeFile(path.join(klasor, 'ic_launcher_round.png'), yuvarlak)

    /* Uyarlanır ikon ön katmanı — zemin saydam, amblem güvenli alanda */
    const onTuval = Math.round(boy * ONKATMAN_ORANI)
    const on = await (
      await ortala(onTuval, Math.round(onTuval * GUVENLI_ORAN), null)
    ).toBuffer()
    await writeFile(path.join(klasor, 'ic_launcher_foreground.png'), on)

    console.log(`  mipmap-${ad}: ${boy}px kare, ${onTuval}px ön katman`)
  }

  /* Uyarlanır ikonun zemin rengi */
  await writeFile(
    path.join(HEDEF, 'values', 'ic_launcher_background.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n' +
      '    <color name="ic_launcher_background">#FFFFFF</color>\n</resources>\n',
    'utf8'
  )

  console.log('\nİkonlar üretildi. Şimdi: npx cap sync android')
}

uret().catch((e) => {
  console.error('İkon üretilemedi:', e.message)
  process.exit(1)
})
