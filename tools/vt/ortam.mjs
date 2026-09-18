/* ==========================================================================
   Veritabanı ortam dosyası

   HANGİ VERİTABANINA, HANGİ GİRİŞLE BAĞLANILACAĞI TEK DOSYADA.

   Dosya: veritabani/ortam/<ortam>.env  (git'e girmez; yalnız ornek.env
   izlenir). VPS'te dosya depo dışında durur, yolu `--ayar` ile verilir.

   Neden kendi okuyucumuz: dotenv gibi bir paket eklemek npm indirmesi
   demek; dosya biçimi basit (ANAHTAR=değer, # yorum).

   ORTAMLAR ve VERİTABANI ADLARI — başka ad kabul edilmez:
     yerel   Paksan_Yerel          bu bilgisayar, örnek veri serbest
     sinama  Paksan_Sinama1/2      doğrulama; kurulur, sınanır, silinir
     test    Paksan_Test           VPS provası, örnek veri YASAK
     canli   Paksan_Canli          VPS canlı (pilot canlının ilk dönemi)
   ========================================================================== */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const KOK = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const VT_KLASORU = join(KOK, 'veritabani')

export const ORTAMLAR = ['yerel', 'sinama', 'test', 'canli']

/* Ortam başına izinli veritabanı adları. */
const AD_KALIBI = {
  yerel: /^Paksan_Yerel$/,
  sinama: /^Paksan_Sinama\d$/,
  test: /^Paksan_Test$/,
  canli: /^Paksan_Canli$/,
}

/* Ortam başına dört SQL girişi. Adlar koddan türetilir, dosyada yazmaz;
   böylece yanlışlıkla canlı girişiyle testte çalışılamaz. */
export function girisAdlari(ortam) {
  return {
    sahip: `paksan_${ortam}_sahip`,
    uygulama: `paksan_${ortam}_uygulama`,
    yonetici: `paksan_${ortam}_yonetici`,
    rapor: `paksan_${ortam}_rapor`,
  }
}

const SIFRE_ANAHTARLARI = {
  sahip: 'PAKSAN_VT_SAHIP_SIFRE',
  uygulama: 'PAKSAN_VT_UYGULAMA_SIFRE',
  yonetici: 'PAKSAN_VT_YONETICI_SIFRE',
  rapor: 'PAKSAN_VT_RAPOR_SIFRE',
}

export function envOku(yol) {
  const degerler = {}
  const metin = readFileSync(yol, 'utf8').replace(/^﻿/, '')
  for (const [i, ham] of metin.split(/\r?\n/).entries()) {
    const satir = ham.trim()
    if (!satir || satir.startsWith('#')) continue
    const esit = satir.indexOf('=')
    if (esit < 1) throw new Error(`${yol}:${i + 1} "ANAHTAR=değer" biçiminde değil`)
    const anahtar = satir.slice(0, esit).trim()
    let deger = satir.slice(esit + 1).trim()
    /* Satır sonu yorumu yalnız boşluktan sonra gelen # ile. */
    const yorum = deger.search(/\s#/)
    if (yorum >= 0) deger = deger.slice(0, yorum).trim()
    if (/^".*"$/.test(deger)) deger = deger.slice(1, -1)
    degerler[anahtar] = deger
  }
  return degerler
}

/* Eksik şifreleri üretip dosyaya yazar. Şifre ekrana basılmaz.
   Harf ve rakam: Windows karmaşıklık kuralını geçer, T-SQL dizgisinde
   kaçış gerektirmez. */
function sifreUret() {
  const harfler = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const baytlar = randomBytes(64)
  let s = ''
  for (const b of baytlar) {
    if (s.length === 32) break
    if (b < 248) s += harfler[b % harfler.length]
  }
  /* Her sınıftan en az bir karakter garanti. */
  return 'Pk7' + s.slice(3)
}

export function eksikSifreleriUret(yol) {
  const metin = readFileSync(yol, 'utf8')
  const degerler = envOku(yol)
  let yeni = metin
  const uretilen = []
  for (const [rol, anahtar] of Object.entries(SIFRE_ANAHTARLARI)) {
    if (degerler[anahtar]) continue
    const sifre = sifreUret()
    const satirKalibi = new RegExp(`^${anahtar}=.*$`, 'm')
    yeni = satirKalibi.test(yeni)
      ? yeni.replace(satirKalibi, `${anahtar}=${sifre}`)
      : yeni.replace(/\s*$/, '') + `\n${anahtar}=${sifre}\n`
    uretilen.push(rol)
  }
  if (uretilen.length) writeFileSync(yol, yeni)
  return uretilen
}

/**
 * Ortam ayarını okur ve denetler.
 * @param {{ayar?: string, ortam?: string}} secenek
 */
export function ortamYukle(secenek = {}) {
  const yol = secenek.ayar
    ? resolve(secenek.ayar)
    : join(VT_KLASORU, 'ortam', `${secenek.ortam || 'yerel'}.env`)
  if (!existsSync(yol)) {
    throw new Error(
      `Ortam dosyası yok: ${yol}\n` +
        `veritabani/ortam/ornek.env dosyasını kopyalayıp doldurun.`,
    )
  }
  const d = envOku(yol)
  const ortam = d.PAKSAN_VT_ORTAM
  if (!ORTAMLAR.includes(ortam)) {
    throw new Error(`PAKSAN_VT_ORTAM geçersiz: "${ortam}" (${ORTAMLAR.join(', ')})`)
  }
  const veritabani = d.PAKSAN_VT_VERITABANI
  if (!AD_KALIBI[ortam].test(veritabani || '')) {
    throw new Error(
      `PAKSAN_VT_VERITABANI "${veritabani}" ${ortam} ortamında kullanılamaz ` +
        `(izinli: ${AD_KALIBI[ortam]})`,
    )
  }
  /* "Kurulum girişi" sunucu yöneticisidir (veritabanı ve giriş açar);
     paksan_<ortam>_yonetici ile karıştırılmasın diye adı ayrı. */
  const kurulumGiris = d.PAKSAN_VT_KURULUM_GIRIS || 'windows'
  if (!['windows', 'sql'].includes(kurulumGiris)) {
    throw new Error('PAKSAN_VT_KURULUM_GIRIS "windows" ya da "sql" olmalı')
  }
  return {
    dosya: yol,
    ortam,
    veritabani,
    sunucu: d.PAKSAN_VT_SUNUCU || 'tcp:127.0.0.1,1433',
    sqlcmd: d.PAKSAN_VT_SQLCMD || '',
    /* Kurulum (veritabanı ve giriş oluşturma) sunucu yöneticisiyle
       yapılır: yerelde Windows girişi, VPS'te ayrı bir yönetici. */
    kurulumGirisi: {
      tur: kurulumGiris,
      kullanici: d.PAKSAN_VT_KURULUM_KULLANICI || '',
      sifre: d.PAKSAN_VT_KURULUM_SIFRE || '',
    },
    girisler: girisAdlari(ortam),
    sifreler: Object.fromEntries(
      Object.entries(SIFRE_ANAHTARLARI).map(([rol, anahtar]) => [rol, d[anahtar] || '']),
    ),
    ornekVeriIzinli: ortam === 'yerel' || ortam === 'sinama',
  }
}

/* Aynı ortam dosyasıyla başka bir sınama veritabanı (Sinama1 → Sinama2). */
export function veritabaniDegistir(ayar, yeniAd) {
  if (!AD_KALIBI[ayar.ortam].test(yeniAd)) {
    throw new Error(`${yeniAd} ${ayar.ortam} ortamında kullanılamaz`)
  }
  return { ...ayar, veritabani: yeniAd }
}
