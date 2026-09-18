/* ==========================================================================
   Betik uygulayıcı — veritabanını betiklerden kurar ve günceller

   BETİK TÜRLERİ (veritabani/ altında)

     K  kurulum/K01__*.sql, K02__*.sql   veritabanı, girişler, ortam işareti.
        Sunucu yöneticisiyle, işlem dışında; her çalıştırmada tekrar
        çalışabilir (idempotent).
     V  semalar/V0001__*.sql …           şema değişiklikleri. BİR KEZ uygulanır
        ve UYGULANDIKTAN SONRA DEĞİŞTİRİLEMEZ. Değişiklik gerekiyorsa yeni
        numaralı V betiği yazılır.
     R  tekrar/R01__*.sql …              prosedür, görünüm, tetikleyici.
        İçeriği değişince yeniden uygulanır (CREATE OR ALTER).
     T  tohum/T01__*.sql …               üretilmiş başlangıç verisi (MERGE);
        değişince yeniden.
     B  tohum/B01__*.sql …               bir kez konan, sonra uygulamadan
        düzenlenebilen başlangıç verisi (yalnız yoksa ekler); değişince
        yeniden (yine yalnız eksikleri ekler).
     O  ornek/O01__*.sql …               örnek veri — yalnız yerel ve sınama.

   Her V/R/T/B/O betiği TEK İŞLEMDE çalışır: bir hata olursa betiğin tamamı
   geri alınır ve araç durur. Uygulanan her betik dbo.SemaGecmisi'ne adı,
   türü ve içerik özetiyle (SHA-256) yazılır.

   NEDEN ÖZET: canlı veritabanında "kimse elle değişiklik yapmaz" kuralının
   bekçisi. Uygulanmış bir V betiği sonradan düzenlenirse test ve canlı
   birbirinden sessizce ayrışırdı; araç bunu fark edip durur.
   ========================================================================== */

import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir, hostname } from 'node:os'
import { join } from 'node:path'
import { VT_KLASORU } from './ortam.mjs'
import { sqlcmd, sorguJson, sqlHatasi } from './sqlcmd.mjs'

const KLASOR = {
  K: 'kurulum',
  V: 'semalar',
  R: 'tekrar',
  T: 'tohum',
  B: 'tohum',
  O: 'ornek',
}

const AD_KALIBI = {
  K: /^K\d{2}__[a-z0-9_]+\.sql$/,
  V: /^V(\d{4})__[a-z0-9_]+\.sql$/,
  R: /^R\d{2}__[a-z0-9_]+\.sql$/,
  T: /^T\d{2}__[a-z0-9_]+\.sql$/,
  B: /^B\d{2}__[a-z0-9_]+\.sql$/,
  O: /^O\d{2}__[a-z0-9_]+\.sql$/,
}

/* Satır sonu ve BOM farkı özeti değiştirmesin: git VPS'te dosyayı CRLF
   ya da LF getirebilir. */
export function betikOzeti(icerik) {
  const duz = icerik.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  return createHash('sha256').update(duz, 'utf8').digest('hex')
}

export function betikleriListele(tur, klasorKoku = VT_KLASORU) {
  const klasor = join(klasorKoku, KLASOR[tur])
  if (!existsSync(klasor)) return []
  const dosyalar = readdirSync(klasor).filter((a) => a.endsWith('.sql') && a.startsWith(tur))
  for (const a of dosyalar) {
    if (!AD_KALIBI[tur].test(a)) {
      throw new Error(`Betik adı kurala uymuyor: ${KLASOR[tur]}/${a} (${AD_KALIBI[tur]})`)
    }
  }
  return dosyalar.sort().map((ad) => {
    const yol = join(klasor, ad)
    const icerik = readFileSync(yol, 'utf8')
    if (icerik.charCodeAt(0) === 0xfeff) throw new Error(`BOM ile kaydedilmiş: ${ad}`)
    return { tur, ad, yol, ozet: betikOzeti(icerik) }
  })
}

/* ------------------------------------------------- yer tutucu koruması */

/* Codex'ten geçmemiş Türkçe metin yer tutucusu (tasarim.md 1.20, 7.1
   KR-12). Yerel ve sınamada engel değil (statik denetim uyarı olarak
   listeler); test ve canlıda yer tutucu içeren betik ÇALIŞTIRILMAZ:
   kullanıcının ya da yöneticinin göreceği metin taslak kalmış demektir. */
const YER_TUTUCU = '<Codex metni:'

export function yerTutucuKorumasi(ayar, betikler) {
  if (ayar.ortam !== 'test' && ayar.ortam !== 'canli') return
  const bulunan = betikler
    .map((b) => {
      const metin = readFileSync(b.yol, 'utf8')
      const say = metin.split(YER_TUTUCU).length - 1
      return say ? `${b.ad} (${say})` : null
    })
    .filter(Boolean)
  if (bulunan.length) {
    throw new Error(
      `Codex'ten geçmemiş metin yer tutucusu (${YER_TUTUCU}) içeren betik ${ayar.ortam} ortamında ` +
        `çalıştırılmaz. Hiçbir betik uygulanmadı:\n  - ${bulunan.join('\n  - ')}`,
    )
  }
}

/* ------------------------------------------------------------------ K */

export function kurulumBetikleriniCalistir(ayar) {
  yerTutucuKorumasi(ayar, betikleriListele('K'))
  for (const b of betikleriListele('K')) {
    /* K01 veritabanını açar: master'a bağlanır. */
    const veritabani = b.ad.startsWith('K01') ? 'master' : ayar.veritabani
    const r = sqlcmd({ ayar, giris: 'kurulum', veritabani, dosya: b.yol })
    if (r.kod !== 0) throw new Error(`${b.ad} başarısız:\n${sqlHatasi(r)}`)
    console.log(`  ✓ ${b.ad}`)
  }
}

/* ------------------------------------------------------ V R T B O */

function sarmalayiciYaz(klasor, b, ayar) {
  const yol = join(klasor, `sarmal-${b.ad}`)
  const baslangic = new Date().toISOString().replace('T', ' ').replace('Z', '')
  const metin = [
    ':on error exit',
    'SET NOCOUNT ON;',
    'SET ANSI_NULLS ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON;',
    'SET CONCAT_NULL_YIELDS_NULL ON; SET QUOTED_IDENTIFIER ON; SET NUMERIC_ROUNDABORT OFF;',
    'SET XACT_ABORT ON;',
    'BEGIN TRANSACTION;',
    'GO',
    `:r "${b.yol}"`,
    'GO',
    'INSERT dbo.SemaGecmisi (BetikAdi, Tur, Ozet, SureMs, Makine)',
    `VALUES (N'${b.ad}', '${b.tur}', '${b.ozet}',`,
    `  DATEDIFF(millisecond, CONVERT(datetime2(3), '${baslangic}'), SYSUTCDATETIME()),`,
    `  N'${hostname().replace(/'/g, "''").slice(0, 120)}');`,
    'COMMIT TRANSACTION;',
    'GO',
    '',
  ].join('\n')
  writeFileSync(yol, metin, 'utf8')
  return yol
}

export function uygulanmislar(ayar) {
  return sorguJson({
    ayar,
    giris: 'sahip',
    sorgu: `SELECT g.BetikAdi, g.Tur, g.Ozet
            FROM dbo.SemaGecmisi g
            WHERE g.Kimlik = (SELECT MAX(h.Kimlik) FROM dbo.SemaGecmisi h WHERE h.BetikAdi = g.BetikAdi)
            ORDER BY g.BetikAdi FOR JSON PATH`,
  })
}

export function ortamIsaretiniDenetle(ayar) {
  const satir = sorguJson({
    ayar,
    giris: 'sahip',
    sorgu: `SELECT OrtamKodu, VeritabaniAdi FROM sistem.Ortam FOR JSON PATH`,
  })[0]
  if (!satir) throw new Error(`${ayar.veritabani}: ortam işareti (sistem.Ortam) yok`)
  if (satir.OrtamKodu !== ayar.ortam || satir.VeritabaniAdi !== ayar.veritabani) {
    throw new Error(
      `Ortam uyuşmuyor: dosya ${ayar.ortam}/${ayar.veritabani}, veritabanı ` +
        `${satir.OrtamKodu}/${satir.VeritabaniAdi}. İşlem durduruldu.`,
    )
  }
}

/**
 * Bekleyen betikleri hesaplar ve değişiklik korumasını uygular.
 * Hata fırlatırsa hiçbir şey uygulanmamıştır.
 */
export function planCikar(ayar, secenek = {}) {
  const kok = secenek.betikKlasoru || VT_KLASORU
  const kayit = new Map(uygulanmislar(ayar).map((s) => [s.BetikAdi, s]))

  const V = betikleriListele('V', kok)
  const adlar = new Set(V.map((b) => b.ad))
  const sorunlar = []
  let enBuyukUygulanan = 0
  for (const [ad, s] of kayit) {
    if (s.Tur !== 'V') continue
    const no = Number(ad.slice(1, 5))
    enBuyukUygulanan = Math.max(enBuyukUygulanan, no)
    if (!adlar.has(ad)) sorunlar.push(`${ad} veritabanında uygulanmış ama dosyası yok`)
  }
  for (const b of V) {
    const s = kayit.get(b.ad)
    if (s && s.Ozet !== b.ozet) {
      sorunlar.push(`${b.ad} uygulandıktan sonra DEĞİŞTİRİLMİŞ. Uygulanmış V betiği düzenlenmez; yeni V betiği yazın.`)
    }
    if (!s && Number(b.ad.slice(1, 5)) < enBuyukUygulanan) {
      sorunlar.push(`${b.ad} uygulanmış V${String(enBuyukUygulanan).padStart(4, '0')}'dan küçük numaralı; yeni betik en sona eklenir.`)
    }
  }
  if (sorunlar.length) throw new Error('Değişiklik koruması:\n  - ' + sorunlar.join('\n  - '))

  const bekleyen = V.filter((b) => !kayit.has(b.ad))
  const degisenler = (tur) =>
    betikleriListele(tur, kok).filter((b) => kayit.get(b.ad)?.Ozet !== b.ozet)
  const plan = [...bekleyen, ...degisenler('R'), ...degisenler('T'), ...degisenler('B')]
  if (secenek.ornek) {
    if (!ayar.ornekVeriIzinli) throw new Error(`${ayar.ortam} ortamında örnek veri yüklenemez`)
    plan.push(...degisenler('O'))
  }
  yerTutucuKorumasi(ayar, plan)
  return plan
}

export function betikleriUygula(ayar, plan) {
  yerTutucuKorumasi(ayar, plan)
  const gecici = mkdtempSync(join(tmpdir(), 'paksan-vt-'))
  try {
    for (const b of plan) {
      const sarmal = sarmalayiciYaz(gecici, b, ayar)
      const bas = Date.now()
      const r = sqlcmd({ ayar, giris: 'sahip', dosya: sarmal })
      if (r.kod !== 0) {
        throw new Error(`${b.ad} başarısız, betiğin tamamı geri alındı:\n${sqlHatasi(r)}`)
      }
      console.log(`  ✓ ${b.ad}  (${Date.now() - bas} ms)`)
    }
  } finally {
    rmSync(gecici, { recursive: true, force: true })
  }
}

/* Test ve canlıda son 2 saatte tam yedek yoksa güncelleme yapılmaz. */
export function yedekDenetle(ayar) {
  if (ayar.ortam !== 'test' && ayar.ortam !== 'canli') return
  const satir = sorguJson({
    ayar,
    giris: 'kurulum',
    veritabani: 'master',
    sorgu: `SELECT MAX(backup_finish_date) AS Son FROM msdb.dbo.backupset
            WHERE database_name = N'${ayar.veritabani}' AND type = 'D'
            AND backup_finish_date > DATEADD(hour, -2, GETDATE()) FOR JSON PATH`,
  })[0]
  if (!satir?.Son) {
    throw new Error(
      `${ayar.veritabani} için son 2 saatte tam yedek yok. Önce "vt yedekle" çalıştırın ` +
        `(bilerek yedeksiz: --yedeksiz).`,
    )
  }
}
