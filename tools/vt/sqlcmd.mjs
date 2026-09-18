/* ==========================================================================
   sqlcmd sarmalayıcı

   NEDEN sqlcmd: SQL Server'ın kendi komut satırı aracı hem Windows'ta hem
   VPS'te (Linux'ta mssql-tools18) var. Node için sürücü paketi indirmek
   gerekmiyor; betikler SSMS'te açılıp okunabilen düz .sql dosyaları.

   DEĞİŞMEZ BAYRAKLAR
     -b          hata olunca çık (çıkış kodu 1) — sessiz başarısızlık yok
     -I          QUOTED_IDENTIFIER ON: filtreli dizin ve hesaplanmış kolon
                 dizini onsuz kurulamıyor (sqlcmd varsayılanı OFF)
     -f 65001    dosyalar UTF-8 okunur; Türkçe açıklamalar bozulmaz
     -C          sunucu sertifikasına güven (yerel/VPS öz imzalı)

   ŞİFRELER KOMUT SATIRINA YAZILMAZ: giriş şifresi SQLCMDPASSWORD ortam
   değişkeniyle, betiklerin ihtiyaç duyduğu şifreler de ortam değişkeni
   olarak verilir ($(PAKSAN_VT_...) biçiminde okunur). Süreç listesinde
   görünmezler.
   ========================================================================== */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ADAYLAR = [
  'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\180\\Tools\\Binn\\SQLCMD.EXE',
  'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\170\\Tools\\Binn\\SQLCMD.EXE',
  'C:\\Program Files\\SqlCmd\\sqlcmd.exe',
  '/opt/mssql-tools18/bin/sqlcmd',
  '/opt/mssql-tools/bin/sqlcmd',
]

let bulunan = null

export function sqlcmdBul(ayar) {
  if (ayar?.sqlcmd) {
    if (!existsSync(ayar.sqlcmd)) throw new Error(`PAKSAN_VT_SQLCMD bulunamadı: ${ayar.sqlcmd}`)
    return ayar.sqlcmd
  }
  if (bulunan) return bulunan
  bulunan = ADAYLAR.find((y) => existsSync(y))
  if (!bulunan) {
    const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['sqlcmd'], {
      encoding: 'utf8',
    })
    bulunan = r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : null
  }
  if (!bulunan) throw new Error('sqlcmd bulunamadı. PAKSAN_VT_SQLCMD ile yolunu verin.')
  return bulunan
}

/* Hangi girişle bağlanılacağı: "kurulum" sunucu yöneticisi; öteki dördü
   ortamın kendi girişleri. */
function girisBayraklari(ayar, giris) {
  if (giris === 'kurulum') {
    if (ayar.kurulumGirisi.tur === 'windows') return { bayrak: ['-E'], sifre: null }
    if (!ayar.kurulumGirisi.kullanici) throw new Error('PAKSAN_VT_KURULUM_KULLANICI boş')
    return { bayrak: ['-U', ayar.kurulumGirisi.kullanici], sifre: ayar.kurulumGirisi.sifre }
  }
  const ad = ayar.girisler[giris]
  if (!ad) throw new Error(`Bilinmeyen giriş: ${giris}`)
  if (!ayar.sifreler[giris]) throw new Error(`${giris} girişinin şifresi ortam dosyasında yok`)
  return { bayrak: ['-U', ad], sifre: ayar.sifreler[giris] }
}

/* Betiklerin $(DEGISKEN) ile okuduğu gizli değerler: yalnız ortam
   değişkeni olarak geçer. */
export function gizliDegiskenler(ayar) {
  return {
    PAKSAN_VT_ORTAM: ayar.ortam,
    PAKSAN_VT_VERITABANI: ayar.veritabani,
    PAKSAN_VT_GIRIS_SAHIP: ayar.girisler.sahip,
    PAKSAN_VT_GIRIS_UYGULAMA: ayar.girisler.uygulama,
    PAKSAN_VT_GIRIS_YONETICI: ayar.girisler.yonetici,
    PAKSAN_VT_GIRIS_RAPOR: ayar.girisler.rapor,
    PAKSAN_VT_SAHIP_SIFRE: ayar.sifreler.sahip,
    PAKSAN_VT_UYGULAMA_SIFRE: ayar.sifreler.uygulama,
    PAKSAN_VT_YONETICI_SIFRE: ayar.sifreler.yonetici,
    PAKSAN_VT_RAPOR_SIFRE: ayar.sifreler.rapor,
  }
}

/**
 * sqlcmd çalıştırır.
 * @param {object} p
 * @param {object} p.ayar        ortamYukle() sonucu
 * @param {string} p.giris       kurulum | sahip | uygulama | yonetici | rapor
 * @param {string} [p.veritabani] varsayılan ayar.veritabani
 * @param {string} [p.dosya]     -i ile çalıştırılacak dosya
 * @param {string} [p.sorgu]     -Q ile çalıştırılacak sorgu
 * @param {object} [p.degisken]  gizli olmayan -v değişkenleri
 * @param {object} [p.gizli]     ortam değişkeni olarak geçecek değerler
 * @param {boolean} [p.json]     çıktı FOR JSON: -y 0, satırlar birleştirilir
 * @param {number} [p.zamanAsimiMs]
 */
export function sqlcmd(p) {
  const { ayar, giris } = p
  const { bayrak, sifre } = girisBayraklari(ayar, giris)
  const arg = [
    '-S', ayar.sunucu,
    '-d', p.veritabani || ayar.veritabani,
    ...bayrak,
    '-C', '-b', '-I', '-f', '65001', '-l', '30',
  ]
  /* -y 0 ile -h birlikte verilemez (sqlcmd: "mutually exclusive");
     başlıksız çıktı yalnız JSON olmayan sorguda istenir. */
  if (p.json) arg.push('-y', '0')
  else arg.push('-h', '-1', '-W')
  for (const [k, v] of Object.entries(p.degisken || {})) arg.push('-v', `${k}=${v}`)
  if (p.dosya) arg.push('-i', p.dosya)
  else if (p.sorgu) arg.push('-Q', p.sorgu)
  else throw new Error('sqlcmd: dosya ya da sorgu gerekli')

  /* ÇIKTI DOSYAYA YAZILIR (-o). Windows'ta sqlcmd ekrana yazarken konsolun
     kod sayfasını kullanır; pencere gizli açıldığında (windowsHide) konsol
     yoktur ve -f 65001'e rağmen OEM kod sayfasına (857) düşer: ı, ş, ğ
     bozulur, → gibi karakterler 0x1A olur ve FOR JSON çıktısı JSON.parse'ta
     kırılır (17.09.2026, vt sinama parmak izinde görüldü). Dosyaya yazılan
     çıktı -f 65001 ile her durumda UTF-8'dir. Hata mesajları da aynı
     dosyaya düşer; stderr ayrıca okunur. */
  const ciktiKlasoru = mkdtempSync(join(tmpdir(), 'paksan-sqlcmd-'))
  const ciktiDosyasi = join(ciktiKlasoru, 'cikti.txt')
  arg.push('-o', ciktiDosyasi)

  const env = { ...process.env, ...gizliDegiskenler(ayar), ...(p.gizli || {}) }
  if (sifre) env.SQLCMDPASSWORD = sifre
  else delete env.SQLCMDPASSWORD

  try {
    const r = spawnSync(sqlcmdBul(ayar), arg, {
      env,
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      timeout: p.zamanAsimiMs || 10 * 60 * 1000,
      windowsHide: true,
    })
    if (r.error) throw r.error
    const dosyadan = existsSync(ciktiDosyasi)
      ? readFileSync(ciktiDosyasi, 'utf8').replace(/^﻿/, '')
      : ''
    return { kod: r.status, cikti: dosyadan + (r.stdout || ''), hata: r.stderr || '' }
  } finally {
    rmSync(ciktiKlasoru, { recursive: true, force: true })
  }
}

/* SELECT ... FOR JSON PATH sonucunu nesne olarak döndürür. sqlcmd uzun
   JSON'u ~2033 karakterde satırlara böldüğü için satırlar birleştirilir. */
export function sorguJson(p) {
  const sorgu = `SET NOCOUNT ON; ${p.sorgu}`
  const r = sqlcmd({ ...p, sorgu, json: true })
  if (r.kod !== 0) throw new Error(sqlHatasi(r))
  const metin = r.cikti.split(/\r?\n/).join('').trim()
  if (!metin) return []
  return JSON.parse(metin)
}

export function sqlHatasi(r) {
  const satirlar = (r.cikti + '\n' + r.hata).split(/\r?\n/).filter(Boolean)
  return satirlar.slice(-20).join('\n')
}
