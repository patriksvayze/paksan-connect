/* ==========================================================================
   Çizimin gökyüzünü saydam yapar

   NEDEN

   `karsilama-tarla.png` bu deseni zaten kullanıyor: çizim yalnız yer
   düzlemini taşıyor, ufkun üstü saydam ve arkadaki zemin rengi
   görünüyor. Böylece aynı çizim koyu bir başlık alanının dibine de
   oturabiliyor, açık bir kartın içine de.

   Servis giriş çiziminde gökyüzü düz beyaz basılıydı. Koyu bir tepe
   alanının içine konunca krem bir bant oluşuyordu; üstüne gradyan
   perde çekmek de beyazı griye çevirip sis gibi gösteriyordu.

   NASIL

   Üst kenardan taşma doldurma (flood fill): kenardan başlayıp beyaza
   yakın komşuları geziyor. Böylece gökyüzü siliniyor ama atölyenin
   beyaz duvarı gibi ADA hâlindeki açık alanlar korunuyor — onlara
   kenardan yol yok.

   Kenar pikselleri beyazla konturun karışımı; sertçe silinirse
   çevrede açık bir hale kalıyor. Onlarda beyaz matlaştırma geri
   alınıyor: a = 1 - beyazlık, renk = (piksel - beyaz*(1-a)) / a.

   Kullanım:
     node tools/gok-say.mjs <kaynak.png> <hedef.png>
   ========================================================================== */

import sharp from 'sharp'

const [, , kaynak, hedef] = process.argv
if (!kaynak || !hedef) {
  console.error('Kullanım: node tools/gok-say.mjs <kaynak.png> <hedef.png>')
  process.exit(1)
}

const { data, info } = await sharp(kaynak).ensureAlpha().raw()
  .toBuffer({ resolveWithObject: true })
const { width: G, height: Y, channels: K } = info

const BEYAZA_UZAK = 26 // taşma doldurmanın beyaz sayacağı sınır
const HALE_ESIK = 200 // kenar halesinde işlem görecek en koyu ton

const beyazMi = (i) =>
  255 - data[i] <= BEYAZA_UZAK &&
  255 - data[i + 1] <= BEYAZA_UZAK &&
  255 - data[i + 2] <= BEYAZA_UZAK

/* -------------------------------------------------- Üst kenardan taşma */

const gok = new Uint8Array(G * Y)
const yigin = []
for (let x = 0; x < G; x++) {
  const p = x
  if (beyazMi(p * K)) { gok[p] = 1; yigin.push(p) }
}

while (yigin.length) {
  const p = yigin.pop()
  const x = p % G
  const y = (p - x) / G
  const komsular = [
    x > 0 ? p - 1 : -1,
    x < G - 1 ? p + 1 : -1,
    y > 0 ? p - G : -1,
    y < Y - 1 ? p + G : -1,
  ]
  for (const k of komsular) {
    if (k < 0 || gok[k]) continue
    if (!beyazMi(k * K)) continue
    gok[k] = 1
    yigin.push(k)
  }
}

/* --------------------------------------------------------- Hale şeridi */

const hale = new Uint8Array(G * Y)
for (let p = 0; p < G * Y; p++) {
  if (gok[p]) continue
  const x = p % G
  const y = (p - x) / G
  const bitisik =
    (x > 0 && gok[p - 1]) || (x < G - 1 && gok[p + 1]) ||
    (y > 0 && gok[p - G]) || (y < Y - 1 && gok[p + G])
  if (!bitisik) continue
  const i = p * K
  if (Math.min(data[i], data[i + 1], data[i + 2]) >= HALE_ESIK) hale[p] = 1
}

/* ------------------------------------------------------------- Uygulama */

let silinen = 0
let yumusatilan = 0
for (let p = 0; p < G * Y; p++) {
  const i = p * K
  if (gok[p]) { data[i + 3] = 0; silinen++; continue }
  if (!hale[p]) continue
  const a = 1 - Math.min(data[i], data[i + 1], data[i + 2]) / 255
  if (a <= 0.004) { data[i + 3] = 0; silinen++; continue }
  for (let k = 0; k < 3; k++) {
    data[i + k] = Math.max(0, Math.min(255, Math.round((data[i + k] - 255 * (1 - a)) / a)))
  }
  data[i + 3] = Math.round(a * 255)
  yumusatilan++
}

await sharp(data, { raw: { width: G, height: Y, channels: K } })
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toFile(hedef)

console.log(`${hedef}  ${G}x${Y}  silinen ${silinen}  yumuşatılan ${yumusatilan}`)
