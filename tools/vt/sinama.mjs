/* ==========================================================================
   vt sinama — sınama veritabanlarını kurar, bütün doğrulamaları çalıştırır

   KULLANIM   npm run vt -- sinama [--ayar dosya] [--birak] [--yerel] [--ayrinti]
                                   [--betik-klasoru klasör]

     --birak          Paksan_Sinama2 sonda silinmez (fark incelemek için)
     --yerel          Paksan_Yerel'in parmak izi de karşılaştırılır (KR-06;
                      yalnız okur, veritabanı yoksa adım "yapılamadı" olur)
     --ayrinti        S betiklerinin bütün çıktısı ekrana yazılır
     --betik-klasoru  V/R/T/B/O/S betikleri bu klasörden okunur (geliştirme);
                      K betikleri, parmak-izi.sql ve veri-ozeti.sql her zaman
                      depodan

   ORTAM: yalnız sinama ortam dosyası (veritabani/ortam/sinama.env,
   PAKSAN_VT_VERITABANI=Paksan_Sinama1). İkinci veritabanı Paksan_Sinama2
   aynı dosyanın girişleriyle kurulur: K01 ve K02 Paksan_Sinama[0-9]
   adına izin verir, girişler iki veritabanında ortaktır.

   YALNIZ Paksan_Sinama1 VE Paksan_Sinama2 SİLİNİR. Silmeden önce ortam
   işareti (sistem.Ortam) okunur; işaret "sinama" değilse dokunulmaz.
   Sinama1 sonda kalır (S betiklerinin bıraktığı veriyle), Sinama2 silinir.

   ADIMLAR (kodlar tasarim.md Bölüm 7)
     ST     Statik denetim (tools/vt/denetle.mjs); yer tutucular yalnız sayılır
     KR-01  Paksan_Sinama1 sıfırdan: K01, K02, V/R/T/B + O (guncelle --ornek)
     KR-10  Harmanlama, uyumluluk 150, RCSI, kurtarma modeli, sahip
     KR-02  İkinci guncelle: "uygulanacak betik yok"
     KR-03  İkinci kur: parmak izi, veritabanı seçenekleri ve girişler aynı
     KR-04  T, B ve O betikleri yeniden: hiçbir tablonun verisi değişmez
            (veri-ozeti.sql; SatirSurumu ve geçmiş tabloları dahil)
     PI-01  Paksan_Sinama1 parmak izi (veritabani/sinama/parmak-izi.sql)
     KR-05  Paksan_Sinama2 sıfırdan; iki parmak izi birebir aynı
     KR-06  Paksan_Yerel parmak izi (yalnız --yerel)
     KR-11  Örnek veri koruması: araç test ortamında O betiği planlamaz;
            O betiği test işaretli veritabanında 50001 verir (Sinama2'de,
            işaret işlem içinde değiştirilip geri alınır)
     KR-12  Yer tutucu koruması: test ortamında <Codex metni: içeren betik
            çalıştırılmaz (tools/vt/calistir.mjs)
     S01…   veritabani/sinama/S*.sql, Paksan_Sinama1'de sırayla
     KS-52  NumaraAl: iki oturum, sayaç satırı yokken 500'er çağrı (S01'den sonra)
     KS-56  İki oturum aynı hak edişi aynı SatirSurumu ile onaylar (S
            betiklerinin "bekliyor" bıraktığı hak edişle)
     ES-19  T05'e ürün, T06'ya parça eklenmiş kopyayla guncelle: veriyle
            eklenmiş aktif satırlar pasife düşmez, eklenenler yazılır;
            ardından depodaki T05/T06 geri uygulanır, eklenenler pasife
            düşer. S betikleri aktif satır eklememişse "yapılamadı"
     CD     Canlı denetim (tasarim.md 7.2): tools/vt/denetle.mjs
            canliDenetim(ayar) işlevini dışa açtığında çalışır
     ES-20  S betiklerinden sonra Sinama1 parmak izi PI-01 ile aynı;
            guncelle hâlâ "uygulanacak betik yok"
     KR-07  Uygulanmış V betiğine yorum eklenmiş kopya: araç durur
     KR-08  Uygulanmış V betiğinin dosyası yok: araç durur
     KR-09  Uygulanmış en büyük numaradan küçük yeni V: araç durur

   Bir adım başarısız olursa sonraki adımlar yine çalışır (bağımlı olanlar
   "atlandı" yazar); sonda özet tablo basılır. Hata ya da "yapılamadı"
   durumunda çıkış kodu 1.

   S BETİKLERİNİN SÖZLEŞMESİ (veritabani/sinama/S\d{2}__ad.sql)
     - Betiğin başında, ilk SQL satırından önce:  -- giris: uygulama
       (uygulama | yonetici | rapor | sahip). Satır sütun 1'den başlar,
       blok yorumun içinde sayılmaz.
     - Betik içinde satır başında yeni bir "-- giris: <ad>" satırı yeni bir
       bölüm açar: bölüm ayrı sqlcmd oturumunda o girişle çalışır. Değişken
       ve geçici tablo bölümler arasında taşınmaz; satırı GO'dan sonra yazın.
     - Araç işlem açmaz; betik kendi işlemini yönetir. sqlcmd -b: ilk hata
       betiği durdurur ve adım kırmızı olur. Tutmayan beklenti
       THROW 59999, N'<adım kodu>: beklenen <no>, gelen <no>', 1 (6.6).
     - Sınama değişkenleri ortam değişkeni olarak gelir; betikte dolar ve
       parantezle okunur (sqlcmd değişkeni). Bu yorumda o biçim bilerek
       yazılmadı. Adlar:
         PAKSAN_SINAMA_ANAHTAR_NO                       1
         PAKSAN_SINAMA_TC_NO / _VERGI_NO / _IBAN        düz değer (SN-16 araması)
         PAKSAN_SINAMA_TC_SIFRELI / _VERGI_ / _IBAN_    0x… AES-256-GCM (1.14.1 düzeni)
         PAKSAN_SINAMA_TC_OZETI  / _VERGI_ / _IBAN_     0x… HMAC-SHA256 (32 bayt)
         PAKSAN_SINAMA_TC_MASKELI / _VERGI_ / _IBAN_    maskeli metin
       Anahtar atılabilir sınama anahtarıdır (4.5); şifreli değer her
       çalıştırmada farklı IV alır, özet sabittir.

   Kurallar: tasarim.md 6.6, 7.1, 7.3 (KS-52, KS-56), 7.6 (ES-19, ES-20).
   ========================================================================== */

import { spawn } from 'node:child_process'
import { createCipheriv, createHash, createHmac, randomBytes } from 'node:crypto'
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { eksikSifreleriUret, ortamYukle, veritabaniDegistir, VT_KLASORU } from './ortam.mjs'
import { gizliDegiskenler, sorguJson, sqlcmd, sqlcmdBul, sqlHatasi } from './sqlcmd.mjs'
import {
  betikleriListele,
  betikleriUygula,
  kurulumBetikleriniCalistir,
  ortamIsaretiniDenetle,
  planCikar,
} from './calistir.mjs'
import * as denetle from './denetle.mjs'

const SINAMA1 = 'Paksan_Sinama1'
const SINAMA2 = 'Paksan_Sinama2'
/* Bu araç yalnız bu iki veritabanını siler. */
const SILINEBILIR = new Set([SINAMA1, SINAMA2])
const GIRISLER = ['uygulama', 'yonetici', 'rapor', 'sahip']
const S_KALIBI = /^S\d{2}__[a-z0-9_]+\.sql$/
/* tasarim.md 6.6'da listelenen sınama betikleri; biri yoksa adım "yapılamadı". */
const BEKLENEN_S = ['S01', 'S02', 'S03', 'S04', 'S05']
const GIRIS_SATIRI = /^--[ \t]*giris[ \t]*:[ \t]*([A-Za-z]+)[ \t]*$/
const S_ZAMAN_ASIMI_MS = 60 * 60 * 1000
const NUMARA_CAGRI = 500

/* Parmak izi ve veri özeti betikleri aracın parçası: her zaman depodan. */
const PARMAK_IZI_BETIGI = join(VT_KLASORU, 'sinama', 'parmak-izi.sql')
const VERI_OZETI_BETIGI = join(VT_KLASORU, 'sinama', 'veri-ozeti.sql')

/* ------------------------------------------------------------ çıktı */

const RENKLI = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR
const boya = (kod) => (m) => (RENKLI ? `\x1b[${kod}m${m}\x1b[0m` : m)
const kirmizi = boya('31')
const yesil = boya('32')
const sari = boya('33')
const kalin = boya('1')
const soluk = boya('2')

function sureYaz(ms) {
  if (ms < 1000) return `${ms} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1).replace('.', ',')} sn`
  return `${Math.floor(ms / 60000)} dk ${Math.round((ms % 60000) / 1000)} sn`
}

function girintile(metin, renk = (x) => x, bosluk = '    ') {
  return String(metin)
    .split(/\r?\n/)
    .map((s) => bosluk + renk(s))
    .join('\n')
}

function kisalt(metin, uzunluk = 400) {
  return metin.length > uzunluk ? metin.slice(0, uzunluk) + ` … (${metin.length} karakter)` : metin
}

/* Sınama yapılamadı: gereken dosya, nesne ya da veri yok. Hata gibi
   çıkış kodunu 1 yapar ama ayrı sayılır. */
export class EksikAdim extends Error {}

class Rapor {
  constructor() {
    this.adimlar = []
  }

  async adim(kod, ad, is) {
    const bas = Date.now()
    console.log(`\n${kalin(`▶ ${kod}`)}  ${ad}`)
    try {
      const sonuc = await is()
      const sure = sureYaz(Date.now() - bas)
      this.adimlar.push({ kod, ad, durum: 'tamam', sure })
      console.log(`  ${yesil('✓')} ${kod} ${soluk(`(${sure})`)}`)
      return sonuc === undefined ? true : sonuc
    } catch (e) {
      const sure = sureYaz(Date.now() - bas)
      const eksik = e instanceof EksikAdim
      this.adimlar.push({ kod, ad, durum: eksik ? 'eksik' : 'hata', sure })
      console.log(`  ${eksik ? sari(`! ${kod} YAPILAMADI`) : kirmizi(`✗ ${kod} HATA`)} ${soluk(`(${sure})`)}`)
      console.log(girintile(e.message, eksik ? sari : kirmizi))
      return undefined
    }
  }

  atla(kod, ad, neden) {
    this.adimlar.push({ kod, ad, durum: 'atlandi', sure: '' })
    console.log(`\n${kalin(`▶ ${kod}`)}  ${ad}\n  ${soluk(`– atlandı: ${neden}`)}`)
  }

  ozet(notlar = []) {
    const isaret = { tamam: yesil('✓'), hata: kirmizi('✗'), eksik: sari('!'), atlandi: soluk('–') }
    const genislik = Math.max(...this.adimlar.map((a) => a.kod.length), 5)
    console.log(`\n${kalin('──────── Sınama özeti ────────')}`)
    for (const a of this.adimlar) {
      console.log(` ${isaret[a.durum]} ${a.kod.padEnd(genislik)}  ${a.ad}  ${soluk(a.sure)}`)
    }
    const say = (d) => this.adimlar.filter((a) => a.durum === d).length
    for (const n of notlar) console.log(soluk(` ${n}`))
    const satir =
      `Sonuç: ${say('tamam')} tamam · ${say('hata')} hata · ` +
      `${say('eksik')} yapılamadı · ${say('atlandi')} atlandı`
    const basarisiz = say('hata') + say('eksik') > 0
    console.log(basarisiz ? kirmizi(kalin(satir)) : yesil(kalin(satir)))
    return !basarisiz
  }
}

/* ------------------------------------------------------ sqlcmd yardımcıları */

/* sqlcmd.mjs'teki sqlcmd() ile aynı bayraklar; eşzamanlı iki oturum için
   süreci beklemeden başlatır. */
let oturumSayaci = 0
function sqlcmdEszamansiz(p) {
  const { ayar, giris } = p
  /* Yalnız ortamın kendi girişleri (kurulum girişi eşzamanlı adımda kullanılmaz). */
  const ad = ayar.girisler[giris]
  if (!ad) throw new Error(`Bilinmeyen giriş: ${giris}`)
  const sifre = ayar.sifreler[giris]
  if (!sifre) throw new Error(`${giris} girişinin şifresi ortam dosyasında yok`)
  /* Çıktı dosyaya: gizli pencerede sqlcmd ekran çıktısının kod sayfası
     bozulur (bkz. sqlcmd.mjs). */
  const ciktiDosyasi = `${p.dosya}.${++oturumSayaci}.cikti.txt`
  const arg = [
    '-S', ayar.sunucu,
    '-d', p.veritabani || ayar.veritabani,
    '-U', ad,
    '-C', '-b', '-I', '-f', '65001', '-l', '30',
    '-h', '-1', '-W',
    '-i', p.dosya,
    '-o', ciktiDosyasi,
  ]
  const env = { ...process.env, ...gizliDegiskenler(ayar), ...(p.gizli || {}) }
  env.SQLCMDPASSWORD = sifre
  return new Promise((coz, reddet) => {
    const surec = spawn(sqlcmdBul(ayar), arg, { env, windowsHide: true })
    let cikti = ''
    let hata = ''
    surec.stdout.setEncoding('utf8').on('data', (d) => (cikti += d))
    surec.stderr.setEncoding('utf8').on('data', (d) => (hata += d))
    const zamanlayici = setTimeout(() => surec.kill(), p.zamanAsimiMs || 10 * 60 * 1000)
    surec.on('error', (e) => {
      clearTimeout(zamanlayici)
      reddet(e)
    })
    surec.on('close', (kod) => {
      clearTimeout(zamanlayici)
      const dosyadan = existsSync(ciktiDosyasi) ? readFileSync(ciktiDosyasi, 'utf8').replace(/^﻿/, '') : ''
      rmSync(ciktiDosyasi, { force: true })
      coz({ kod, cikti: dosyadan + cikti, hata })
    })
  })
}

/* Uzun sorguyu komut satırına koymadan dosyadan çalıştırır; sonuç FOR JSON. */
function jsonDosyadan(ayar, giris, gecici, ad, metin) {
  const yol = join(gecici, `${ad}.sql`)
  writeFileSync(yol, metin, 'utf8')
  const r = sqlcmd({ ayar, giris, dosya: yol, json: true })
  if (r.kod !== 0) throw new Error(sqlHatasi(r))
  const duz = r.cikti.split(/\r?\n/).join('').trim()
  return duz ? JSON.parse(duz) : []
}

/* ------------------------------------------------------ veritabanı */

function veritabaniVarMi(ayar, ad) {
  if (!/^Paksan_[A-Za-z0-9]+$/.test(ad)) throw new Error(`Geçersiz veritabanı adı: ${ad}`)
  return (
    sorguJson({
      ayar,
      giris: 'kurulum',
      veritabani: 'master',
      sorgu: `SELECT name FROM sys.databases WHERE name = N'${ad}' FOR JSON PATH`,
    }).length > 0
  )
}

/**
 * Yalnız sinama ortamındaki Paksan_Sinama1/2'yi siler. Ortam işareti
 * "sinama" değilse dokunmaz. Silindiyse true.
 */
export function veritabaniniSil(ayar, ad) {
  if (ayar.ortam !== 'sinama' || !SILINEBILIR.has(ad)) {
    throw new Error(`${ad} silinmez: bu araç yalnız sinama ortamındaki ${[...SILINEBILIR].join(' ve ')} veritabanını siler`)
  }
  if (!veritabaniVarMi(ayar, ad)) return false
  const isaret = sqlcmd({
    ayar,
    giris: 'kurulum',
    veritabani: 'master',
    sorgu: `SET NOCOUNT ON;
            IF OBJECT_ID(N'[${ad}].sistem.Ortam', N'U') IS NOT NULL
                EXEC (N'SELECT OrtamKodu FROM [${ad}].sistem.Ortam;');`,
  })
  if (isaret.kod !== 0) throw new Error(`${ad} ortam işareti okunamadı:\n${sqlHatasi(isaret)}`)
  const kod = isaret.cikti.trim()
  if (kod && kod !== 'sinama') {
    throw new Error(`${ad} ortam işareti "${kod}"; sinama veritabanı değil, silinmedi`)
  }
  const r = sqlcmd({
    ayar,
    giris: 'kurulum',
    veritabani: 'master',
    sorgu: `SET NOCOUNT ON;
            ALTER DATABASE [${ad}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
            BEGIN TRY
                DROP DATABASE [${ad}];
            END TRY
            BEGIN CATCH
                ALTER DATABASE [${ad}] SET MULTI_USER;
                THROW;
            END CATCH;`,
  })
  if (r.kod !== 0) throw new Error(`${ad} silinemedi:\n${sqlHatasi(r)}`)
  return true
}

/** Veritabanını silip kur + guncelle --ornek yapar; uygulanan betik sayısı. */
export function sifirdanKur(ayar, kok) {
  const silindi = veritabaniniSil(ayar, ayar.veritabani)
  console.log(`  ${ayar.veritabani} ${silindi ? 'silindi' : 'yoktu'}; kurulum başlıyor`)
  kurulumBetikleriniCalistir(ayar)
  ortamIsaretiniDenetle(ayar)
  const plan = planCikar(ayar, { ornek: true, betikKlasoru: kok })
  console.log(`  Uygulanacak ${plan.length} betik:`)
  betikleriUygula(ayar, plan)
  return plan.length
}

export function guncelOlmali(ayar, kok) {
  const plan = planCikar(ayar, { ornek: true, betikKlasoru: kok })
  if (plan.length) {
    throw new Error(`guncelle ${plan.length} betik uygulayacaktı: ${plan.map((b) => b.ad).join(', ')}`)
  }
  console.log('  Güncel: uygulanacak betik yok.')
}

/* ------------------------------------------------------ parmak izi */

/**
 * parmak-izi.sql'i sahip girişiyle, bölüm içerikleriyle birlikte çalıştırır.
 * { etiket, toplam, bolumler: Map(bolüm → özet), icerik: Map(bolüm → JSON) }
 * İçerik bellekte tutulur: sonradan değişen veritabanıyla karşılaştırırken
 * (KR-03, ES-20) farkı "önceki" hâlden gösterebilmek için.
 */
export function parmakIziAl(ayar, gecici, etiket = ayar.veritabani) {
  if (!existsSync(PARMAK_IZI_BETIGI)) throw new EksikAdim(`${PARMAK_IZI_BETIGI} yok`)
  const sarmal = join(gecici, `parmak-izi-${ayar.veritabani}.sql`)
  writeFileSync(
    sarmal,
    [
      ':on error exit',
      'SET NOCOUNT ON;',
      'CREATE TABLE #ParmakIziAyrinti (Tur int NOT NULL PRIMARY KEY);',
      'GO',
      `:r "${PARMAK_IZI_BETIGI}"`,
      'GO',
      '',
    ].join('\n'),
    'utf8',
  )
  const r = sqlcmd({ ayar, giris: 'sahip', dosya: sarmal, json: true })
  if (r.kod !== 0) throw new Error(`${ayar.veritabani} parmak izi alınamadı:\n${sqlHatasi(r)}`)
  let satirlar
  try {
    satirlar = JSON.parse(r.cikti.split(/\r?\n/).join('').trim())
  } catch {
    throw new Error(`${ayar.veritabani} parmak izi çıktısı okunamadı:\n${kisalt(r.cikti, 2000)}`)
  }
  const bolumler = new Map()
  const icerik = new Map()
  let toplam = null
  for (const s of satirlar) {
    if (s.Bolum === 'TOPLAM') toplam = s.Ozet
    else {
      bolumler.set(s.Bolum, s.Ozet)
      icerik.set(s.Bolum, s.Icerik)
    }
  }
  if (!/^[0-9a-f]{64}$/.test(toplam || '')) throw new Error(`${ayar.veritabani} parmak izinde TOPLAM yok`)
  return { etiket, toplam, bolumler, icerik }
}

/** İki parmak izi aynıysa null; değilse farklı bölümleri ve öğelerini anlatan metin. */
export function parmakIziFarki(a, b) {
  if (a.toplam === b.toplam) return null
  const adlar = [...new Set([...a.bolumler.keys(), ...b.bolumler.keys()])].sort()
  const farkli = adlar.filter((k) => a.bolumler.get(k) !== b.bolumler.get(k))
  const satirlar = [
    `Parmak izi farklı: ${a.etiket} ${a.toplam.slice(0, 16)}… · ${b.etiket} ${b.toplam.slice(0, 16)}…`,
    `Farklı bölümler: ${farkli.join(', ')}`,
  ]
  const ogeler = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]).map((o) => JSON.stringify(o))
  for (const bolum of farkli) {
    const oA = ogeler(a.icerik.get(bolum))
    const oB = ogeler(b.icerik.get(bolum))
    const kA = new Set(oA)
    const kB = new Set(oB)
    const yalnizA = oA.filter((x) => !kB.has(x))
    const yalnizB = oB.filter((x) => !kA.has(x))
    satirlar.push(`${bolum}: yalnız ${a.etiket} ${yalnizA.length} öğe (-), yalnız ${b.etiket} ${yalnizB.length} öğe (+)`)
    for (const x of yalnizA.slice(0, 8)) satirlar.push(`  - ${kisalt(x)}`)
    if (yalnizA.length > 8) satirlar.push(`  - … ${yalnizA.length - 8} öğe daha`)
    for (const x of yalnizB.slice(0, 8)) satirlar.push(`  + ${kisalt(x)}`)
    if (yalnizB.length > 8) satirlar.push(`  + … ${yalnizB.length - 8} öğe daha`)
    if (!yalnizA.length && !yalnizB.length) satirlar.push('  (öğeler aynı, sıraları farklı)')
  }
  return satirlar.join('\n')
}

/* ------------------------------------------------------ veri özeti */

/** veri-ozeti.sql: { toplam, satir, tablolar: Map(tablo → {satir, ozet}) } */
export function veriOzetiAl(ayar) {
  if (!existsSync(VERI_OZETI_BETIGI)) throw new EksikAdim(`${VERI_OZETI_BETIGI} yok`)
  const r = sqlcmd({ ayar, giris: 'sahip', dosya: VERI_OZETI_BETIGI })
  if (r.kod !== 0) throw new Error(`${ayar.veritabani} veri özeti alınamadı:\n${sqlHatasi(r)}`)
  const tablolar = new Map()
  for (const satir of r.cikti.split(/\r?\n/)) {
    const m = /^(\S+)\s+(\d+)\s+([0-9a-f]{64}|NULL)$/.exec(satir.trim())
    if (m) tablolar.set(m[1], { satir: Number(m[2]), ozet: m[3] })
  }
  const toplam = tablolar.get('TOPLAM')
  if (!toplam) throw new Error(`${ayar.veritabani} veri özeti çıktısı okunamadı:\n${kisalt(r.cikti, 2000)}`)
  tablolar.delete('TOPLAM')
  return { toplam: toplam.ozet, satir: toplam.satir, tablolar }
}

function veriFarki(once, sonra) {
  const adlar = [...new Set([...once.tablolar.keys(), ...sonra.tablolar.keys()])].sort()
  const fark = []
  for (const ad of adlar) {
    const a = once.tablolar.get(ad)
    const b = sonra.tablolar.get(ad)
    if (!a || !b) fark.push(`${ad}: tablo ${a ? 'kayboldu' : 'sonradan çıktı'}`)
    else if (a.ozet !== b.ozet) {
      fark.push(`${ad}: ${a.satir === b.satir ? `${a.satir} satır, içerik değişti` : `${a.satir} → ${b.satir} satır`}`)
    }
  }
  return fark
}

/* ------------------------------------------------------ aktif satırlar */

/* Aktif kolonu olan her tablonun Aktif = 1 satırlarının birincil anahtarları.
   Birincil anahtarsız tablolar (geçmiş tabloları) dışarıda. */
const AKTIF_KUMESI_SORGUSU = `SET NOCOUNT ON;
DECLARE @Sonuc TABLE (Tablo nvarchar(300) NOT NULL PRIMARY KEY, Anahtarlar nvarchar(max) NULL);
DECLARE @Tablo nvarchar(300), @TamAd nvarchar(300), @Kolonlar nvarchar(max), @Sorgu nvarchar(max), @J nvarchar(max);
DECLARE tablolar CURSOR LOCAL FAST_FORWARD FOR
    SELECT SCHEMA_NAME(t.schema_id) + N'.' + t.name,
           QUOTENAME(SCHEMA_NAME(t.schema_id)) + N'.' + QUOTENAME(t.name),
           (SELECT STRING_AGG(CONVERT(nvarchar(max), QUOTENAME(COL_NAME(ic.object_id, ic.column_id))), N',')
                       WITHIN GROUP (ORDER BY ic.key_ordinal)
            FROM sys.indexes AS i
            JOIN sys.index_columns AS ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
            WHERE i.object_id = t.object_id AND i.is_primary_key = 1)
    FROM sys.tables AS t
    WHERE t.is_ms_shipped = 0
      AND EXISTS (SELECT 1 FROM sys.columns AS c WHERE c.object_id = t.object_id AND c.name = N'Aktif');
OPEN tablolar;
FETCH NEXT FROM tablolar INTO @Tablo, @TamAd, @Kolonlar;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF @Kolonlar IS NOT NULL
    BEGIN
        SET @Sorgu = N'SELECT @J = (SELECT ' + @Kolonlar + N' FROM ' + @TamAd + N' WHERE Aktif = 1 FOR JSON PATH);';
        EXEC sys.sp_executesql @Sorgu, N'@J nvarchar(max) OUTPUT', @J = @J OUTPUT;
        INSERT @Sonuc (Tablo, Anahtarlar) VALUES (@Tablo, @J);
    END;
    FETCH NEXT FROM tablolar INTO @Tablo, @TamAd, @Kolonlar;
END;
CLOSE tablolar;
DEALLOCATE tablolar;
SELECT Tablo, JSON_QUERY(ISNULL(Anahtarlar, N'[]')) AS Anahtarlar FROM @Sonuc ORDER BY Tablo FOR JSON PATH;
`

export function aktifKumesiAl(ayar, gecici) {
  const satirlar = jsonDosyadan(ayar, 'sahip', gecici, 'aktif-kumesi', AKTIF_KUMESI_SORGUSU)
  return new Map(satirlar.map((x) => [x.Tablo, new Set((x.Anahtarlar || []).map((a) => JSON.stringify(a)))]))
}

function aktifKaybi(once, sonra) {
  const kayip = []
  for (const [tablo, anahtarlar] of once) {
    const simdi = sonra.get(tablo) || new Set()
    const giden = [...anahtarlar].filter((a) => !simdi.has(a))
    if (giden.length) kayip.push(`${tablo}: ${giden.length} aktif satır pasife düştü ya da silindi (ör. ${giden.slice(0, 3).join(' ')})`)
  }
  return kayip
}

/* ------------------------------------------------------ sınama değişkenleri */

function tcNoUret(dokuz) {
  const d = [...dokuz].map(Number)
  const tek = d[0] + d[2] + d[4] + d[6] + d[8]
  const cift = d[1] + d[3] + d[5] + d[7]
  const onuncu = (((tek * 7 - cift) % 10) + 10) % 10
  const onbirinci = (d.reduce((a, b) => a + b, 0) + onuncu) % 10
  return dokuz + onuncu + onbirinci
}

function vergiNoUret(dokuz) {
  let toplam = 0
  for (let i = 0; i < 9; i++) {
    const gecici = (Number(dokuz[i]) + (9 - i)) % 10
    let deger = (gecici * 2 ** (9 - i)) % 9
    if (gecici !== 0 && deger === 0) deger = 9
    toplam += deger
  }
  return dokuz + ((10 - (toplam % 10)) % 10)
}

function ibanUret(bban) {
  const sayisal = (bban + 'TR00').replace(/[A-Z]/g, (h) => String(h.charCodeAt(0) - 55))
  const kontrol = 98n - (BigInt(sayisal) % 97n)
  return 'TR' + String(kontrol).padStart(2, '0') + bban
}

/** S betiklerine ortam değişkeni olarak verilen sınama değerleri (tasarim.md 1.14.1, 7.4). */
export function sinamaDegiskenleri() {
  const veriAnahtari = createHash('sha256').update('paksan-sinama-veri-anahtari-1').digest()
  const aramaAnahtari = createHash('sha256').update('paksan-sinama-arama-anahtari').digest()
  const sifrele = (duz) => {
    const iv = randomBytes(12)
    const c = createCipheriv('aes-256-gcm', veriAnahtari, iv)
    const govde = Buffer.concat([c.update(duz, 'utf8'), c.final()])
    /* [1 bayt biçim][1 bayt anahtar no][12 bayt IV][şifreli metin][16 bayt etiket] */
    return '0x' + Buffer.concat([Buffer.from([1, 1]), iv, govde, c.getAuthTag()]).toString('hex').toUpperCase()
  }
  const ozet = (duz) => '0x' + createHmac('sha256', aramaAnahtari).update(duz, 'utf8').digest('hex').toUpperCase()
  const tc = tcNoUret('100000001')
  const vergi = vergiNoUret('123456789')
  const iban = ibanUret('0006100519786457841326')
  return {
    PAKSAN_SINAMA_ANAHTAR_NO: '1',
    PAKSAN_SINAMA_TC_NO: tc,
    PAKSAN_SINAMA_TC_SIFRELI: sifrele(tc),
    PAKSAN_SINAMA_TC_OZETI: ozet(tc),
    PAKSAN_SINAMA_TC_MASKELI: '*'.repeat(9) + tc.slice(-2),
    PAKSAN_SINAMA_VERGI_NO: vergi,
    PAKSAN_SINAMA_VERGI_SIFRELI: sifrele(vergi),
    PAKSAN_SINAMA_VERGI_OZETI: ozet(vergi),
    PAKSAN_SINAMA_VERGI_MASKELI: '*'.repeat(8) + vergi.slice(-2),
    PAKSAN_SINAMA_IBAN: iban,
    PAKSAN_SINAMA_IBAN_SIFRELI: sifrele(iban),
    PAKSAN_SINAMA_IBAN_OZETI: ozet(iban),
    PAKSAN_SINAMA_IBAN_MASKELI: `TR** **** **** **** **** **${iban.slice(-2)}`,
  }
}

/* ------------------------------------------------------ S betikleri */

/* Her satırın başında tarayıcının durumu: kod, blok yorum ya da dizgi. */
function satirBasiDurumlari(metin) {
  const durumlar = ['kod']
  let durum = 'kod'
  let i = 0
  while (i < metin.length) {
    const c = metin[i]
    const iki = metin.slice(i, i + 2)
    if (durum === 'kod') {
      if (iki === '--') {
        const son = metin.indexOf('\n', i)
        if (son < 0) break
        i = son
        continue
      }
      if (iki === '/*') {
        durum = 'yorum'
        i += 2
        continue
      }
      if (c === "'") {
        durum = 'dizgi'
        i++
        continue
      }
    } else if (durum === 'yorum') {
      if (iki === '*/') {
        durum = 'kod'
        i += 2
        continue
      }
    } else if (c === "'") {
      if (metin[i + 1] === "'") {
        i += 2
        continue
      }
      durum = 'kod'
      i++
      continue
    }
    if (c === '\n') durumlar.push(durum)
    i++
  }
  return durumlar
}

/** S betiğini "-- giris:" satırlarından bölümlere ayırır. */
export function sBolumleri(icerik) {
  const metin = icerik.replace(/^﻿/, '').replace(/\r\n/g, '\n')
  const satirlar = metin.split('\n')
  const durumlar = satirBasiDurumlari(metin)
  const kodSatirlari = denetle.yorumsuz(metin).split('\n')
  const ilkKod = kodSatirlari.findIndex((s) => s.trim() !== '')
  const basliklar = []
  satirlar.forEach((s, i) => {
    const m = GIRIS_SATIRI.exec(s.trimEnd())
    if (m && durumlar[i] === 'kod') basliklar.push({ satir: i, giris: m[1].toLowerCase() })
  })
  if (!basliklar.length) {
    throw new Error('betiğin başında "-- giris: uygulama|yonetici|rapor|sahip" satırı yok')
  }
  if (ilkKod >= 0 && basliklar[0].satir > ilkKod) {
    throw new Error(`"-- giris:" satırı ilk SQL satırından (${ilkKod + 1}) önce olmalı; şu an ${basliklar[0].satir + 1}. satırda`)
  }
  for (const b of basliklar) {
    if (!GIRISLER.includes(b.giris)) {
      throw new Error(`${b.satir + 1}. satır: bilinmeyen giriş "${b.giris}" (${GIRISLER.join(', ')})`)
    }
  }
  return basliklar.map((b, k) => ({
    giris: b.giris,
    ilkSatir: k === 0 ? 1 : b.satir + 1,
    metin: satirlar.slice(k === 0 ? 0 : b.satir, k + 1 < basliklar.length ? basliklar[k + 1].satir : satirlar.length).join('\n'),
  }))
}

/** veritabani/sinama/S*.sql: [{ ad, kod, yol, bolumler | sorun }] */
export function sBetikleriniListele(kok) {
  const klasor = join(kok, 'sinama')
  if (!existsSync(klasor)) return []
  return readdirSync(klasor)
    .filter((a) => /^S\d/.test(a) && a.toLowerCase().endsWith('.sql'))
    .sort()
    .map((ad) => {
      const yol = join(klasor, ad)
      const b = { ad, kod: ad.slice(0, 3), yol }
      try {
        if (!S_KALIBI.test(ad)) throw new Error(`betik adı kurala uymuyor (${S_KALIBI})`)
        const icerik = readFileSync(yol, 'utf8')
        if (icerik.charCodeAt(0) === 0xfeff) throw new Error('BOM ile kaydedilmiş')
        b.bolumler = sBolumleri(icerik)
      } catch (e) {
        b.sorun = e.message
      }
      return b
    })
}

export function sBetiginiCalistir(ayar, b, gecici, degiskenler, { ayrinti = false } = {}) {
  if (b.sorun) throw new Error(`${b.ad}: ${b.sorun}`)
  const coklu = b.bolumler.length > 1
  b.bolumler.forEach((bolum, n) => {
    let dosya = b.yol
    if (coklu) {
      dosya = join(gecici, `${b.ad.replace(/\.sql$/, '')}.bolum${n + 1}.sql`)
      writeFileSync(dosya, bolum.metin, 'utf8')
    }
    const etiket = coklu ? `${b.ad} bölüm ${n + 1}/${b.bolumler.length} (${bolum.ilkSatir}. satırdan)` : b.ad
    console.log(`  ${etiket}: ${bolum.giris} girişi (${ayar.girisler[bolum.giris]})`)
    const bas = Date.now()
    const r = sqlcmd({ ayar, giris: bolum.giris, dosya, gizli: degiskenler, zamanAsimiMs: S_ZAMAN_ASIMI_MS })
    if (ayrinti && r.cikti.trim()) console.log(girintile(r.cikti.trimEnd(), soluk))
    if (r.kod !== 0) {
      throw new Error(`${etiket} başarısız (çıkış kodu ${r.kod}):\n${sqlHatasi(r)}`)
    }
    console.log(`    ${yesil('✓')} ${soluk(sureYaz(Date.now() - bas))}`)
  })
}

/* ------------------------------------------------------ eşzamanlılık */

/** KS-52: sayaç satırı yokken iki oturum 500'er NumaraAl çağırır. */
export async function numaraAlEszamanli(ayar, gecici, cagri = NUMARA_CAGRI) {
  const on = sorguJson({
    ayar,
    giris: 'sahip',
    sorgu: `SELECT OBJECT_ID(N'sistem.NumaraAl', N'P') AS Nesne,
                   (SELECT Aktif FROM sistem.NumaraOneki WHERE Onek = N'SRV') AS OnekAktif
            FOR JSON PATH, INCLUDE_NULL_VALUES`,
  })[0]
  if (!on.Nesne) throw new EksikAdim('sistem.NumaraAl yok (R02 uygulanmamış)')
  if (on.OnekAktif !== true) throw new EksikAdim('SRV öneki yok ya da pasif (T01)')

  /* Sayaç satırı olmayan bir yıl: 2099'dan geriye. */
  const dolu = new Set(
    sorguJson({
      ayar,
      giris: 'sahip',
      sorgu: `SELECT Yil FROM sistem.NumaraSayaci WHERE Onek = N'SRV' AND Yil >= 2050 FOR JSON PATH`,
    }).map((x) => x.Yil),
  )
  let yil = 2099
  while (dolu.has(yil) && yil > 2050) yil--
  if (dolu.has(yil)) throw new Error('2050–2099 arasında sayaç satırı olmayan yıl kalmadı')

  /* İki oturum aynı anda başlasın: ikisi de aynı UTC anını bekler. */
  const bas = new Date(Date.now() + 5000).toISOString().replace('T', ' ').replace('Z', '')
  const betik = `SET NOCOUNT ON;
SET XACT_ABORT ON;
DECLARE @Bas datetime2(3) = '${bas}';
WHILE SYSUTCDATETIME() < @Bas WAITFOR DELAY '00:00:00.010';
DECLARE @i int = 0, @Numara nvarchar(10);
DECLARE @Sonuc TABLE (Sira int NOT NULL PRIMARY KEY, Numara nvarchar(10) NOT NULL);
WHILE @i < ${cagri}
BEGIN
    BEGIN TRANSACTION;
    EXEC sistem.NumaraAl @Onek = N'SRV', @Numara = @Numara OUTPUT, @Zaman = '${yil}-06-15T09:00:00';
    COMMIT TRANSACTION;
    SET @i += 1;
    INSERT @Sonuc (Sira, Numara) VALUES (@i, @Numara);
END;
SELECT Numara FROM @Sonuc ORDER BY Sira;
`
  const dosya = join(gecici, 'ks52.sql')
  writeFileSync(dosya, betik, 'utf8')
  console.log(`  İki oturum, ${cagri}'er çağrı, SRV${String(yil).slice(2)} (sayaç satırı yok)`)
  const sonuclar = await Promise.all([
    sqlcmdEszamansiz({ ayar, giris: 'uygulama', dosya }),
    sqlcmdEszamansiz({ ayar, giris: 'uygulama', dosya }),
  ])
  const sorunlar = []
  const hepsi = []
  const kalip = new RegExp(`^SRV${String(yil).slice(2)}\\d{5}$`)
  sonuclar.forEach((r, i) => {
    if (r.kod !== 0) sorunlar.push(`oturum ${i + 1} hata verdi (çıkış ${r.kod}):\n${sqlHatasi(r)}`)
    const numaralar = r.cikti.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    const uymayan = numaralar.filter((n) => !kalip.test(n))
    if (uymayan.length) sorunlar.push(`oturum ${i + 1} biçim dışı çıktı: ${uymayan.slice(0, 5).join(' | ')}`)
    if (r.kod === 0 && numaralar.length !== cagri) sorunlar.push(`oturum ${i + 1} ${numaralar.length} numara döndürdü (beklenen ${cagri})`)
    hepsi.push(...numaralar.filter((n) => kalip.test(n)))
  })
  const farkli = new Set(hepsi).size
  if (farkli !== hepsi.length) sorunlar.push(`${hepsi.length - farkli} numara iki kez verildi`)
  const sayac = sorguJson({
    ayar,
    giris: 'sahip',
    sorgu: `SELECT SonSira FROM sistem.NumaraSayaci WHERE Onek = N'SRV' AND Yil = ${yil} FOR JSON PATH`,
  })[0]
  if (!sayac || sayac.SonSira !== cagri * 2) {
    sorunlar.push(`MAX(SonSira) ${sayac ? sayac.SonSira : 'yok'} (beklenen ${cagri * 2})`)
  }
  if (sorunlar.length) throw new Error(sorunlar.join('\n'))
  console.log(`  ${farkli} farklı numara, hata yok, SonSira ${sayac.SonSira}`)
}

/** KS-56: iki oturum aynı hak edişi aynı SatirSurumu ile onaylar; biri 1, diğeri 0 satır. */
export async function hakEdisOnayiEszamanli(ayar, gecici) {
  const aday = sorguJson({
    ayar,
    giris: 'sahip',
    sorgu: `SELECT TOP (1)
                   CONVERT(nvarchar(36), h.Kimlik) AS Kimlik,
                   CONVERT(nvarchar(20), CONVERT(binary(8), h.SatirSurumu), 1) AS SatirSurumu
            FROM hakedis.HakEdis AS h
            WHERE h.DurumKodu = N'bekliyor'
              AND h.NetTutar = ISNULL((SELECT SUM(k.Tutar) FROM hakedis.HakEdisKalemi AS k
                                       WHERE k.HakEdisKimlik = h.Kimlik), 0)
            ORDER BY h.OlusmaZamani DESC
            FOR JSON PATH`,
  })[0]
  if (!aday) {
    throw new EksikAdim(
      'bekliyor durumunda, NetTutar kalem toplamına eşit bir hak ediş yok. KS-56 S betiklerinin ' +
        'bıraktığı hak edişi kullanır (Node bu adımda iş verisi üretmez): S01 ya da S02 bir tane ' +
        'onaylanmamış bırakmalı.',
    )
  }
  const onaylayan = sorguJson({
    ayar,
    giris: 'sahip',
    sorgu: `SELECT TOP (1) CONVERT(nvarchar(36), Kimlik) AS Kimlik FROM erisim.Kullanici
            WHERE TurKodu = N'personel' AND Aktif = 1 ORDER BY KayitNo FOR JSON PATH`,
  })[0]
  if (!onaylayan) throw new EksikAdim('aktif personel kullanıcısı yok (onaylayan için)')
  if (!/^[0-9A-Fa-f-]{36}$/.test(aday.Kimlik) || !/^0x[0-9A-Fa-f]{16}$/.test(aday.SatirSurumu)) {
    throw new Error(`beklenmeyen aday değeri: ${JSON.stringify(aday)}`)
  }
  const bas = new Date(Date.now() + 5000).toISOString().replace('T', ' ').replace('Z', '')
  /* Tasarım 1.9.4 ve 1.10: API onayı "WHERE Kimlik AND SatirSurumu AND
     DurumKodu = bekliyor" ile yazar. İlk oturum kilidi 2 saniye tutar;
     ikinci oturum bekler, sonra değişmiş satırı görüp 0 satır günceller. */
  const betik = `SET NOCOUNT ON;
SET XACT_ABORT ON;
DECLARE @Bas datetime2(3) = '${bas}';
WHILE SYSUTCDATETIME() < @Bas WAITFOR DELAY '00:00:00.010';
DECLARE @Satir int;
BEGIN TRANSACTION;
UPDATE hakedis.HakEdis
   SET DurumKodu = N'onaylandi',
       OnayZamani = SYSUTCDATETIME(),
       OnaylayanKullaniciKimlik = '${onaylayan.Kimlik}',
       OnaylayanAdi = N'KS-56',
       KdvOrani = 0.2000,
       KdvTutari = ROUND(NetTutar * 0.2, 2),
       TevkifatOrani = 0.2000,
       TevkifatTutari = ROUND(ROUND(NetTutar * 0.2, 2) * 0.2, 2),
       StopajOrani = 0.0000,
       StopajTutari = 0.00
 WHERE Kimlik = '${aday.Kimlik}'
   AND SatirSurumu = ${aday.SatirSurumu}
   AND DurumKodu = N'bekliyor';
SET @Satir = @@ROWCOUNT;
WAITFOR DELAY '00:00:02';
COMMIT TRANSACTION;
SELECT CONCAT(N'SATIR=', @Satir);
`
  const dosya = join(gecici, 'ks56.sql')
  writeFileSync(dosya, betik, 'utf8')
  console.log(`  Hak ediş ${aday.Kimlik}, SatirSurumu ${aday.SatirSurumu}: iki oturum aynı anda onaylıyor`)
  const sonuclar = await Promise.all([
    sqlcmdEszamansiz({ ayar, giris: 'uygulama', dosya }),
    sqlcmdEszamansiz({ ayar, giris: 'uygulama', dosya }),
  ])
  const sorunlar = []
  const sayilar = sonuclar.map((r, i) => {
    if (r.kod !== 0) sorunlar.push(`oturum ${i + 1} hata verdi (çıkış ${r.kod}):\n${sqlHatasi(r)}`)
    const m = /SATIR=(\d+)/.exec(r.cikti)
    return m ? Number(m[1]) : null
  })
  if (!sorunlar.length && [...sayilar].sort().join(',') !== '0,1') {
    sorunlar.push(`güncellenen satırlar ${sayilar.join(' ve ')} (beklenen biri 1, diğeri 0)`)
  }
  if (sorunlar.length) throw new Error(sorunlar.join('\n'))
  console.log(`  Oturumlar ${sayilar.join(' ve ')} satır güncelledi`)
}

/* ------------------------------------------------------ korumalar */

function durmali(is, beklenenParcalar) {
  let hata = null
  try {
    is()
  } catch (e) {
    hata = e
  }
  if (!hata) throw new Error('Araç durmadı')
  const eksik = beklenenParcalar.filter((p) => !hata.message.includes(p))
  if (eksik.length) {
    throw new Error(`Araç durdu ama mesajda beklenen ${eksik.map((p) => `"${p}"`).join(', ')} yok:\n${hata.message}`)
  }
  console.log(girintile(hata.message, soluk))
}

function semalarKopyasi(kok, gecici, ad) {
  const klasor = join(gecici, ad)
  cpSync(join(kok, 'semalar'), join(klasor, 'semalar'), { recursive: true })
  return klasor
}

/** KR-07, KR-08, KR-09: değişiklik koruması. Veritabanına yazmaz. */
export function degisiklikKorumasi(ayar, kok, gecici, kod) {
  const uygulanmisV = betikleriListele('V', kok)
  if (uygulanmisV.length < 2) throw new EksikAdim('en az iki V betiği gerekir')
  const hedef = uygulanmisV.find((b) => b.ad.startsWith('V0003__')) || uygulanmisV[1]
  if (kod === 'KR-07') {
    const klasor = semalarKopyasi(kok, gecici, 'kr07')
    appendFileSync(join(klasor, 'semalar', hedef.ad), '\n-- KR-07: uygulandıktan sonra eklenen yorum satırı\n')
    durmali(() => planCikar(ayar, { betikKlasoru: klasor }), [hedef.ad])
  } else if (kod === 'KR-08') {
    const klasor = semalarKopyasi(kok, gecici, 'kr08')
    rmSync(join(klasor, 'semalar', hedef.ad))
    durmali(() => planCikar(ayar, { betikKlasoru: klasor }), [hedef.ad])
  } else if (kod === 'KR-09') {
    const klasor = semalarKopyasi(kok, gecici, 'kr09')
    const no = hedef.ad.slice(0, 5)
    const yeni = `${no}__araya_giren_sinama.sql`
    writeFileSync(join(klasor, 'semalar', yeni), 'SELECT 1;\n', 'utf8')
    durmali(() => planCikar(ayar, { betikKlasoru: klasor }), [yeni])
  }
}

/** KR-11: örnek veri koruması. ayar ikinci (atılacak) veritabanıdır. */
export function ornekVeriKorumasi(ayar, kok, gecici) {
  /* 1. Araç: test ortamında O betiği planlanmaz. */
  durmali(
    () => planCikar({ ...ayar, ortam: 'test', ornekVeriIzinli: false }, { ornek: true, betikKlasoru: kok }),
    ['örnek veri'],
  )
  /* 2. Betik: test işaretli veritabanında 50001. İşaret işlem içinde
     değiştirilir; betik hata verince oturum kapanır ve işlem geri alınır. */
  const O = betikleriListele('O', kok)
  if (!O.length) throw new EksikAdim('O betiği yok')
  const sorunlar = []
  for (const b of O) {
    const sarmal = join(gecici, `kr11-${b.ad}`)
    writeFileSync(
      sarmal,
      [
        ':on error exit',
        'SET NOCOUNT ON;',
        'SET ANSI_NULLS ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON;',
        'SET CONCAT_NULL_YIELDS_NULL ON; SET QUOTED_IDENTIFIER ON; SET NUMERIC_ROUNDABORT OFF;',
        'SET XACT_ABORT ON;',
        'BEGIN TRANSACTION;',
        'DISABLE TRIGGER sistem.TR_sistem_Ortam_Koruma ON sistem.Ortam;',
        "UPDATE sistem.Ortam SET OrtamKodu = N'test', VeritabaniAdi = N'Paksan_Test';",
        'ENABLE TRIGGER sistem.TR_sistem_Ortam_Koruma ON sistem.Ortam;',
        'GO',
        `:r "${b.yol}"`,
        'GO',
        'IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;',
        "SELECT N'BETIK_DURMADI';",
        'GO',
        '',
      ].join('\n'),
      'utf8',
    )
    const r = sqlcmd({ ayar, giris: 'sahip', dosya: sarmal })
    const metin = r.cikti + '\n' + r.hata
    if (r.kod === 0 || metin.includes('BETIK_DURMADI')) sorunlar.push(`${b.ad}: test işaretli veritabanında durmadı`)
    else if (!/Msg 50001\b/.test(metin)) sorunlar.push(`${b.ad}: 50001 yerine başka hata:\n${sqlHatasi(r)}`)
    else console.log(`  ${b.ad}: 50001`)
  }
  const isaret = sorguJson({ ayar, giris: 'sahip', sorgu: 'SELECT OrtamKodu, VeritabaniAdi FROM sistem.Ortam FOR JSON PATH' })[0]
  if (!isaret || isaret.OrtamKodu !== 'sinama' || isaret.VeritabaniAdi !== ayar.veritabani) {
    sorunlar.push(`ortam işareti geri alınmadı: ${JSON.stringify(isaret)}`)
  }
  if (sorunlar.length) throw new Error(sorunlar.join('\n'))
}

/** KR-12: test ortamında yer tutucu içeren betik çalıştırılmaz. ayar ikinci (atılacak) veritabanıdır. */
export function yerTutucuKorumasi(ayar, kok, gecici) {
  const klasor = semalarKopyasi(kok, gecici, 'kr12')
  const ad = 'R99__yer_tutucu_sinamasi.sql'
  mkdirSync(join(klasor, 'tekrar'), { recursive: true })
  writeFileSync(join(klasor, 'tekrar', ad), "SELECT N'<Codex metni: KR-12 sınaması>' AS Deneme;\n", 'utf8')
  const sahte = { ...ayar, ortam: 'test', ornekVeriIzinli: false }
  const durduMu = (e) => /Codex|yer tutucu/i.test(e.message)
  let plan
  try {
    plan = planCikar(sahte, { betikKlasoru: klasor })
  } catch (e) {
    if (durduMu(e)) {
      console.log(girintile(e.message, soluk))
      return
    }
    throw new Error(`planCikar beklenmeyen hata verdi:\n${e.message}`)
  }
  const hedef = plan.filter((b) => b.ad === ad)
  if (!hedef.length) throw new Error(`plan ${ad} betiğini içermiyor: ${plan.map((b) => b.ad).join(', ')}`)
  try {
    betikleriUygula(sahte, hedef)
  } catch (e) {
    if (durduMu(e)) {
      console.log(girintile(e.message, soluk))
      return
    }
    throw new Error(`betikleriUygula beklenmeyen hata verdi:\n${e.message}`)
  }
  throw new Error(
    `Araç test ortamında "<Codex metni:" içeren ${ad} betiğini çalıştırdı. ` +
      'tasarim.md 1.20 ve 7.1 KR-12: koruma tools/vt/calistir.mjs yerTutucuKorumasi (planCikar ve betikleriUygula) içinde olmalı; çalışmadı.',
  )
}

/* ES-19'un değişmiş kopyasına eklenen satırların kodları. Kod kuralları:
   katalog.Urun küçük harf, rakam ve tire; katalog.Parca büyük harf, rakam
   ve nokta (CK_katalog_Urun_Kod, CK_katalog_Parca_Kod). */
export const ES19_EKLENEN = [
  { dosya: /^T05__/, tablo: 'katalog.Urun', kod: 'es19-sinama' },
  { dosya: /^T06__/, tablo: 'katalog.Parca', kod: 'ES19.SINAMA' },
]

/**
 * Üretilmiş tohum betiğinde bir tablonun MERGE bloğuna satır ekler: VALUES
 * listesinin ilk satırı kopyalanır, yalnız Kod değiştirilir. Böylece yabancı
 * anahtar ve CHECK kurallarına uyan değerler üreticiden gelir. Blok
 * "/* <tablo> — …" başlığıyla, "FROM (VALUES" satırıyla ve
 * ") AS v (MarkaKodu, Kod, …)" kolon listesiyle bulunur; biçim değişmişse
 * açıkça hata verir. Eklenen satırın { marka, kod } değeri döner.
 */
export function tohumKopyasinaSatirEkle(yol, tablo, yeniKod) {
  const satirlar = readFileSync(yol, 'utf8').replace(/\r\n/g, '\n').split('\n')
  const bicim = (neden) =>
    new Error(`${yol}: ${tablo} bloğu beklenen biçimde değil (${neden}); tools/vt/tohum-uret.mjs çıktısı değişmiş olabilir`)
  const baslik = satirlar.findIndex((s) => s.startsWith(`/* ${tablo} — `))
  if (baslik < 0) throw bicim('başlık yorumu yok')
  const degerler = satirlar.findIndex((s, i) => i > baslik && /^\s*FROM \(VALUES\s*$/.test(s))
  if (degerler < 0) throw bicim('FROM (VALUES satırı yok')
  const kolonSatiri = satirlar.findIndex((s, i) => i > degerler && /^\s*\) AS v \(/.test(s))
  if (kolonSatiri < 0) throw bicim(') AS v (…) satırı yok')
  const kolonlar = /\) AS v \(([^)]*)\)/.exec(satirlar[kolonSatiri])[1].split(',').map((k) => k.trim())
  if (kolonlar[0] !== 'MarkaKodu' || kolonlar[1] !== 'Kod') throw bicim(`kolonlar ${kolonlar.slice(0, 2).join(', ')}`)
  const m = /^(\s*\(N'([^']*)', N')([^']*)('.*\)),?\s*$/.exec(satirlar[degerler + 1])
  if (!m) throw bicim('ilk değer satırı okunamadı')
  if (satirlar.slice(degerler + 1, kolonSatiri).some((s) => s.includes(`N'${m[2]}', N'${yeniKod}'`))) {
    throw bicim(`${yeniKod} kaynakta zaten var`)
  }
  satirlar.splice(degerler + 1, 0, `${m[1]}${yeniKod}${m[4]},`)
  writeFileSync(yol, satirlar.join('\n'), 'utf8')
  return { marka: m[2], kod: yeniKod }
}

function eklenenSatirlarinDurumu(ayar, eklenenler) {
  const kosul = eklenenler
    .map((e) => `SELECT N'${e.tablo}' AS Tablo, N'${e.kod}' AS Kod,
                        (SELECT CONVERT(int, Aktif) FROM ${e.tablo}
                         WHERE MarkaKodu = N'${e.marka}' AND Kod = N'${e.kod}') AS Aktif`)
    .join(' UNION ALL ')
  return sorguJson({ ayar, giris: 'sahip', sorgu: `SELECT * FROM (${kosul}) AS x FOR JSON PATH, INCLUDE_NULL_VALUES` })
}

function aktifFarki(buyuk, kucuk) {
  let say = 0
  const tablolar = []
  for (const [tablo, anahtarlar] of buyuk) {
    const onceki = kucuk?.get(tablo) || new Set()
    const n = [...anahtarlar].filter((a) => !onceki.has(a)).length
    if (n) {
      say += n
      tablolar.push(`${tablo} ${n}`)
    }
  }
  return { say, tablolar }
}

/**
 * ES-19: veri eklendikten sonra değişmiş (markaya ürün ve parça eklenmiş)
 * T05/T06 ile guncelle. Veriyle eklenmiş aktif satırlar (S betiklerinin
 * ES-01, ES-08, ES-18 satırları) pasife düşmez.
 * aktifTohum: KR-01'den hemen sonraki aktif satırlar; veriyle eklenenler
 * bundan ayırt edilir. Yoksa ya da S betikleri aktif satır eklememişse
 * sınama boş kalır ve adım "yapılamadı" olur.
 */
export function esneklikTohumTekrari(ayar, kok, gecici, aktifTohum) {
  const T = betikleriListele('T', kok)
  const hedefler = T.filter((b) => /^T0[56]__/.test(b.ad))
  if (hedefler.length !== 2) throw new EksikAdim('T05 ve T06 betikleri bulunamadı')
  const once = aktifKumesiAl(ayar, gecici)
  const veriyle = aktifTohum ? aktifFarki(once, aktifTohum) : null

  /* Değişmiş kopya: T05'e bir ürün, T06'ya bir parça eklenir (tasarım:
     "paksan'a ürün ve parça eklenmiş"). İçerik özeti değişir, araç yalnız
     bu ikisini yeniden uygular. */
  const klasor = join(gecici, 'es19')
  for (const alt of ['semalar', 'tekrar', 'tohum', 'ornek']) {
    if (existsSync(join(kok, alt))) cpSync(join(kok, alt), join(klasor, alt), { recursive: true })
  }
  const eklenenler = ES19_EKLENEN.map((e) => {
    const b = hedefler.find((h) => e.dosya.test(h.ad))
    return { ...e, ...tohumKopyasinaSatirEkle(join(klasor, 'tohum', b.ad), e.tablo, e.kod) }
  })
  const plan = planCikar(ayar, { ornek: true, betikKlasoru: klasor })
  const adlar = new Set(hedefler.map((b) => b.ad))
  if (plan.length !== 2 || plan.some((b) => !adlar.has(b.ad))) {
    throw new Error(`kopya planı yalnız T05 ve T06 olmalıydı: ${plan.map((b) => b.ad).join(', ')}`)
  }
  betikleriUygula(ayar, plan)
  const sorunlar = aktifKaybi(once, aktifKumesiAl(ayar, gecici)).map((s) => `değişmiş kopya: ${s}`)
  for (const d of eklenenSatirlarinDurumu(ayar, eklenenler)) {
    if (d.Aktif !== 1) sorunlar.push(`değişmiş kopya: eklenen ${d.Tablo} ${d.Kod} ${d.Aktif === null ? 'yazılmadı' : 'aktif değil'}`)
  }

  /* Depodaki T05/T06 geri uygulanır; kayıt yeniden depoyla aynı olur.
     Kaynakta artık olmayan eklenen ürün ve parça, markanın kendi satırı
     olduğu için pasife düşmelidir (T05/T06 kuralı); öteki satırlar kalır. */
  const geri = planCikar(ayar, { ornek: true, betikKlasoru: kok })
  betikleriUygula(ayar, geri)
  sorunlar.push(...aktifKaybi(once, aktifKumesiAl(ayar, gecici)).map((s) => `depo sürümü: ${s}`))
  for (const d of eklenenSatirlarinDurumu(ayar, eklenenler)) {
    if (d.Aktif !== 0) sorunlar.push(`depo sürümü: kaynaktan çıkan ${d.Tablo} ${d.Kod} pasife düşmedi (Aktif ${d.Aktif})`)
  }
  if (sorunlar.length) throw new Error(sorunlar.join('\n'))

  const toplam = [...once.values()].reduce((a, s) => a + s.size, 0)
  console.log(`  Eklenen ürün ve parça yazıldı; depo sürümüyle pasife düştü`)
  console.log(`  ${once.size} tablodaki ${toplam} aktif satırın hepsi aktif kaldı`)
  if (!veriyle) {
    throw new EksikAdim('KR-01 sonrası aktif satırlar alınamadı; veriyle eklenen satırlar ayırt edilemedi, ES-19 eksik sınandı')
  }
  if (!veriyle.say) {
    throw new EksikAdim(
      'S betikleri kurulumdan sonra aktif satır eklememiş; ES-01 (globale), ES-08 ve ES-18 satırları olmadan ' +
        'ES-19 boş sınama olur. S04 verisini işlemle geri almadan bırakmalı.',
    )
  }
  console.log(`  Veriyle eklenmiş ${veriyle.say} aktif satır korundu (${veriyle.tablolar.join(', ')})`)
}

/* ------------------------------------------------------ kurulum denetimleri */

/** KR-10: K01'in uyguladığı seçenekler ve sahiplik. */
export function secenekleriDenetle(ayar) {
  const d = sorguJson({
    ayar,
    giris: 'sahip',
    sorgu: `SELECT d.collation_name AS Harmanlama, d.compatibility_level AS Uyumluluk,
                   d.is_read_committed_snapshot_on AS Rcsi, d.snapshot_isolation_state AS AnlikGoruntu,
                   d.recovery_model_desc AS KurtarmaModeli, d.is_auto_close_on AS OtomatikKapanma,
                   d.is_auto_shrink_on AS OtomatikKuculme, d.page_verify_option_desc AS SayfaDenetimi,
                   d.is_trustworthy_on AS Guvenilir, SUSER_SNAME(d.owner_sid) AS Sahip
            FROM sys.databases AS d WHERE d.database_id = DB_ID() FOR JSON PATH`,
  })[0]
  const beklenen = {
    Harmanlama: 'Latin1_General_100_CI_AS',
    Uyumluluk: 150,
    Rcsi: true,
    AnlikGoruntu: 0,
    KurtarmaModeli: ayar.ortam === 'canli' ? 'FULL' : 'SIMPLE',
    OtomatikKapanma: false,
    OtomatikKuculme: false,
    SayfaDenetimi: 'CHECKSUM',
    Guvenilir: false,
    Sahip: ayar.girisler.sahip,
  }
  const fark = Object.entries(beklenen)
    .filter(([k, v]) => d?.[k] !== v)
    .map(([k, v]) => `${k}: ${JSON.stringify(d?.[k])} (beklenen ${JSON.stringify(v)})`)
  if (fark.length) throw new Error(fark.join('\n'))
  console.log(`  ${d.Harmanlama}, uyumluluk ${d.Uyumluluk}, RCSI açık, ${d.KurtarmaModeli}, sahip ${d.Sahip}`)
}

/** KR-03: K betikleri ikinci kez; parmak izi, seçenekler, girişler, işaret aynı. */
export function ikinciKurDenetimi(ayar, kok, gecici) {
  if (!/^Paksan_[A-Za-z0-9]+$/.test(ayar.veritabani)) throw new Error(`Geçersiz veritabanı adı: ${ayar.veritabani}`)
  const girisAdlari = Object.values(ayar.girisler).map((g) => `N'${g}'`).join(', ')
  const durumSorgusu = `SELECT d.recovery_model_desc AS KurtarmaModeli, d.is_query_store_on AS SorguDeposu,
                               d.compatibility_level AS Uyumluluk, d.is_read_committed_snapshot_on AS Rcsi,
                               (SELECT l.name AS Ad, l.is_policy_checked AS ParolaKurali,
                                       l.is_expiration_checked AS SureDolumu, l.is_disabled AS Kapali,
                                       l.default_database_name AS VarsayilanVeritabani
                                FROM sys.sql_logins AS l WHERE l.name IN (${girisAdlari})
                                ORDER BY l.name FOR JSON PATH) AS Girisler,
                               (SELECT mf.file_id AS No, mf.growth AS Buyume, mf.is_percent_growth AS Yuzde
                                FROM sys.master_files AS mf WHERE mf.database_id = d.database_id
                                ORDER BY mf.file_id FOR JSON PATH) AS Dosyalar
                        FROM sys.databases AS d WHERE d.name = N'${ayar.veritabani}' FOR JSON PATH`
  const isaretSorgusu = `SELECT OrtamKodu, VeritabaniAdi, KurulumZamani, KurulumMakinesi,
                                (SELECT CONVERT(nvarchar(20), ep.value) FROM sys.extended_properties AS ep
                                 WHERE ep.class = 0 AND ep.name = N'PaksanOrtam') AS PaksanOrtam,
                                (SELECT COUNT(*) FROM dbo.SemaGecmisi) AS BetikKaydi
                         FROM sistem.Ortam FOR JSON PATH`
  const durum = () => JSON.stringify(sorguJson({ ayar, giris: 'kurulum', veritabani: 'master', sorgu: durumSorgusu }))
  const isaret = () => JSON.stringify(sorguJson({ ayar, giris: 'sahip', sorgu: isaretSorgusu }))
  const izOnce = parmakIziAl(ayar, gecici, 'ikinci kurdan önce')
  const durumOnce = durum()
  const isaretOnce = isaret()
  kurulumBetikleriniCalistir(ayar)
  const izSonra = parmakIziAl(ayar, gecici, 'ikinci kurdan sonra')
  const durumSonra = durum()
  const isaretSonra = isaret()
  const sorunlar = []
  const fark = parmakIziFarki(izOnce, izSonra)
  if (fark) sorunlar.push(fark)
  if (durumOnce !== durumSonra) sorunlar.push(`veritabanı/giriş durumu değişti:\n  önce  ${durumOnce}\n  sonra ${durumSonra}`)
  if (isaretOnce !== isaretSonra) sorunlar.push(`ortam işareti değişti:\n  önce  ${isaretOnce}\n  sonra ${isaretSonra}`)
  if (sorunlar.length) throw new Error(sorunlar.join('\n'))
  guncelOlmali(ayar, kok)
  console.log('  Parmak izi, veritabanı seçenekleri, girişler ve ortam işareti aynı')
}

/** KR-04: T, B ve O betikleri yeniden uygulanır; hiçbir tablonun verisi değişmez. */
export function tohumTekrariDenetimi(ayar, kok) {
  const plan = [
    ...betikleriListele('T', kok),
    ...betikleriListele('B', kok),
    ...(ayar.ornekVeriIzinli ? betikleriListele('O', kok) : []),
  ]
  if (!plan.length) throw new EksikAdim('T/B/O betiği yok')
  const once = veriOzetiAl(ayar)
  console.log(`  Önce: ${once.tablolar.size} tablo, ${once.satir} satır`)
  betikleriUygula(ayar, plan)
  const sonra = veriOzetiAl(ayar)
  const fark = veriFarki(once, sonra)
  if (fark.length) {
    throw new Error(`Yeniden uygulama ${fark.length} tablonun verisini değiştirdi:\n${fark.join('\n')}`)
  }
  guncelOlmali(ayar, kok)
  console.log(`  ${plan.length} betik yeniden uygulandı; veri özeti aynı (${once.toplam.slice(0, 16)}…)`)
}

/* ------------------------------------------------------ ana akış */

/**
 * @param {{ bayrak: Set<string>, ayar?: string, ortam?: string, betikKlasoru?: string, veritabani?: string }} s
 */
export async function calistir(s = { bayrak: new Set() }) {
  const bayrak = s.bayrak || new Set()
  if (s.ortam && s.ortam !== 'sinama') {
    throw new Error(`sinama komutu yalnız sinama ortamında çalışır (--ortam ${s.ortam} verildi)`)
  }
  if (s.veritabani) {
    throw new Error(`sinama komutu veritabanı adını kendisi seçer (${SINAMA1}, ${SINAMA2}); --veritabani verilmez`)
  }
  const dosya = s.ayar ? resolve(s.ayar) : join(VT_KLASORU, 'ortam', 'sinama.env')
  if (!existsSync(dosya)) throw new Error(`Ortam dosyası yok: ${dosya}`)
  const uretilen = eksikSifreleriUret(dosya)
  if (uretilen.length) console.log(`Ortam dosyasına şifre üretildi: ${uretilen.join(', ')} (ekrana yazılmaz)`)
  const ayar1 = ortamYukle({ ayar: dosya })
  if (ayar1.ortam !== 'sinama') throw new Error(`Ortam dosyası sinama değil: ${ayar1.ortam}`)
  if (ayar1.veritabani !== SINAMA1) {
    throw new Error(`sinama ortam dosyasında PAKSAN_VT_VERITABANI=${SINAMA1} olmalı (şu an ${ayar1.veritabani})`)
  }
  const ayar2 = veritabaniDegistir(ayar1, SINAMA2)
  const kok = s.betikKlasoru ? resolve(s.betikKlasoru) : VT_KLASORU
  const gecici = mkdtempSync(join(tmpdir(), 'paksan-sinama-'))
  const rapor = new Rapor()
  const notlar = []
  const bas = Date.now()

  console.log(kalin(`Sınama: ${SINAMA1} + ${SINAMA2} @ ${ayar1.sunucu}`))
  if (kok !== VT_KLASORU) console.log(`Betik klasörü: ${kok}`)

  try {
    /* ---- statik denetim */
    await rapor.adim('ST', 'Statik denetim', () => {
      const uyarilar = denetle.yerTutucuUyarilari(kok)
      notlar.push(`Codex yer tutucusu: ${uyarilar.length} (sinama ortamında engel değil; test/canlıda durdurur)`)
      console.log(`  Codex yer tutucusu: ${uyarilar.length}`)
      const sorunlar = denetle.statikDenetim(kok)
      if (sorunlar.length) throw new Error(sorunlar.join('\n'))
      console.log('  SQL statik denetimi temiz.')
    })

    /* ---- Paksan_Sinama1 */
    /* Kurulumdan hemen sonraki aktif satırlar: ES-19 veriyle eklenenleri
       bundan ayırt eder. */
    let aktifTohum = null
    const kuruldu1 = await rapor.adim('KR-01', `${SINAMA1} sıfırdan: kur + guncelle --ornek`, () => {
      sifirdanKur(ayar1, kok)
      aktifTohum = aktifKumesiAl(ayar1, gecici)
    })
    if (!kuruldu1) {
      notlar.push(`${SINAMA1} kurulamadı; ona bağlı adımlar atlandı`)
      return
    }

    await rapor.adim('KR-10', 'Harmanlama, uyumluluk, RCSI, kurtarma modeli, sahip', () => secenekleriDenetle(ayar1))

    await rapor.adim('KR-02', 'İkinci guncelle', () => guncelOlmali(ayar1, kok))

    await rapor.adim('KR-03', 'İkinci kur: hiçbir şey değişmez', () => ikinciKurDenetimi(ayar1, kok, gecici))

    await rapor.adim('KR-04', 'T, B ve O betikleri yeniden: veri değişmez', () => tohumTekrariDenetimi(ayar1, kok))


    const iz1 = await rapor.adim('PI-01', `${SINAMA1} parmak izi`, () => {
      const iz = parmakIziAl(ayar1, gecici)
      console.log(`  ${iz.toplam}`)
      return iz
    })

    /* ---- Paksan_Sinama2 */
    const kuruldu2 = await rapor.adim('KR-05', `${SINAMA2} sıfırdan; iki parmak izi aynı`, () => {
      sifirdanKur(ayar2, kok)
      if (!iz1) throw new Error(`${SINAMA1} parmak izi alınamadığı için karşılaştırılamadı`)
      const iz2 = parmakIziAl(ayar2, gecici)
      const fark = parmakIziFarki(iz1, iz2)
      if (fark) throw new Error(fark)
      console.log(`  İki parmak izi aynı: ${iz2.toplam}`)
    })
    const sinama2Var = (() => {
      try {
        return veritabaniVarMi(ayar1, SINAMA2)
      } catch {
        return false
      }
    })()

    if (bayrak.has('yerel')) {
      await rapor.adim('KR-06', 'Paksan_Yerel parmak izi sınamayla aynı', () => {
        const ayarY = ortamYukle({ ortam: 'yerel' })
        if (!veritabaniVarMi(ayarY, ayarY.veritabani)) throw new EksikAdim(`${ayarY.veritabani} yok`)
        if (!iz1) throw new Error(`${SINAMA1} parmak izi yok`)
        const izY = parmakIziAl(ayarY, gecici)
        const fark = parmakIziFarki(iz1, izY)
        if (fark) throw new Error(fark)
        console.log(`  Aynı: ${izY.toplam}`)
      })
    } else {
      rapor.atla('KR-06', 'Paksan_Yerel parmak izi', '--yerel verilmedi')
    }

    if (sinama2Var) {
      await rapor.adim('KR-11', 'Örnek veri test ortamında yüklenmez', () => ornekVeriKorumasi(ayar2, kok, gecici))
      await rapor.adim('KR-12', 'Yer tutucu içeren betik test ortamında çalışmaz', () => yerTutucuKorumasi(ayar2, kok, gecici))
    } else {
      rapor.atla('KR-11', 'Örnek veri test ortamında yüklenmez', `${SINAMA2} ${kuruldu2 ? 'yok' : 'kurulamadı'}`)
      rapor.atla('KR-12', 'Yer tutucu içeren betik test ortamında çalışmaz', `${SINAMA2} ${kuruldu2 ? 'yok' : 'kurulamadı'}`)
    }

    /* ---- S betikleri (Paksan_Sinama1) */
    const degiskenler = sinamaDegiskenleri()
    const sBetikleri = sBetikleriniListele(kok)
    const eszamanliAdimi = () =>
      rapor.adim('KS-52', 'NumaraAl: iki oturum, 500\'er çağrı', () => numaraAlEszamanli(ayar1, gecici))
    /* Kod sırasıyla: tasarımdaki S01–S05 ve klasörde bulunan öteki S
       betikleri. Tasarımdaki bir betik yoksa adım "yapılamadı". KS-52
       S01 grubundan hemen sonra (tasarımda S01'in adımı). */
    const kodlar = [...new Set([...BEKLENEN_S, ...sBetikleri.map((b) => b.kod)])].sort()
    let ks52Yapildi = false
    for (const kod of kodlar) {
      if (!ks52Yapildi && kod > 'S01') {
        await eszamanliAdimi()
        ks52Yapildi = true
      }
      const grup = sBetikleri.filter((b) => b.kod === kod)
      if (!grup.length) {
        await rapor.adim(kod, 'Sınama betiği', () => {
          throw new EksikAdim(`veritabani/sinama/${kod}__*.sql yok (tasarim.md 6.6)`)
        })
      }
      for (const b of grup) {
        await rapor.adim(b.kod, b.ad, () =>
          sBetiginiCalistir(ayar1, b, gecici, degiskenler, { ayrinti: bayrak.has('ayrinti') }),
        )
      }
    }
    if (!ks52Yapildi) await eszamanliAdimi()

    await rapor.adim('KS-56', 'Aynı hak ediş, aynı SatirSurumu, iki oturum', () => hakEdisOnayiEszamanli(ayar1, gecici))

    await rapor.adim('ES-19', 'Değişmiş T05/T06 ile guncelle: aktif satırlar kalır', () =>
      esneklikTohumTekrari(ayar1, kok, gecici, aktifTohum),
    )

    if (typeof denetle.canliDenetim === 'function') {
      await rapor.adim('CD', 'Canlı denetim (tasarim.md 7.2)', async () => {
        const sorunlar = await denetle.canliDenetim(ayar1)
        if (sorunlar && sorunlar.length) throw new Error(sorunlar.join('\n'))
      })
    } else {
      await rapor.adim('CD', 'Canlı denetim (tasarim.md 7.2)', () => {
        throw new EksikAdim(
          'tools/vt/denetle.mjs canliDenetim(ayar) işlevini dışa açmıyor; CD-TIP, CD-HARMANLAMA, CD-ARAMA, ' +
            'CD-SADELESTIR, CD-FK-DIZIN, CD-UX-NULL, CD-ACIKLAMA, CD-YETKI, CD-RAPOR-KOLON, CD-GORUNUM, ' +
            'CD-TEMPORAL, CD-CK-IN, CD-CEVIRI, CD-SAHIP yapılmadı',
        )
      })
    }

    await rapor.adim('ES-20', `Sınamalardan sonra ${SINAMA1} şeması değişmedi`, () => {
      if (!iz1) throw new Error('PI-01 parmak izi yok')
      const izSon = parmakIziAl(ayar1, gecici, `${SINAMA1} sınamalardan sonra`)
      const fark = parmakIziFarki(iz1, izSon)
      if (fark) throw new Error(fark)
      guncelOlmali(ayar1, kok)
      console.log(`  Parmak izi aynı: ${izSon.toplam}`)
    })

    for (const [kod, ad] of [
      ['KR-07', 'Uygulanmış V betiği değişmiş: araç durur'],
      ['KR-08', 'Uygulanmış V betiğinin dosyası yok: araç durur'],
      ['KR-09', 'Uygulanmıştan küçük numaralı yeni V: araç durur'],
    ]) {
      await rapor.adim(kod, ad, () => degisiklikKorumasi(ayar1, kok, gecici, kod))
    }
  } finally {
    try {
      if (bayrak.has('birak')) {
        notlar.push(`${SINAMA2} bırakıldı (--birak)`)
      } else if (veritabaniVarMi(ayar1, SINAMA2)) {
        await rapor.adim('SON', `${SINAMA2} silinir (${SINAMA1} kalır)`, () => {
          veritabaniniSil(ayar2, SINAMA2)
        })
      }
    } catch (e) {
      console.log(kirmizi(`${SINAMA2} silinemedi: ${e.message}`))
      process.exitCode = 1
    }
    rmSync(gecici, { recursive: true, force: true })
    notlar.push(`Süre: ${sureYaz(Date.now() - bas)}`)
    const basarili = rapor.ozet(notlar)
    if (!basarili) process.exitCode = 1
  }
}
