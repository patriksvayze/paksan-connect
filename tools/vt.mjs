#!/usr/bin/env node
/* ==========================================================================
   vt — PAKSAN veritabanı aracı

   KULLANIM   npm run vt -- <komut> [--ayar dosya] [--ortam yerel|sinama|test|canli]

     kur              Veritabanını ve girişleri açar (yoksa), ortam işaretini
                      yazar, ardından "guncelle" çalıştırır.
     guncelle         Bekleyen V betiklerini, değişen R/T/B betiklerini uygular.
                      --ornek   örnek veriyi de yükler (yalnız yerel/sinama)
                      --yedeksiz  test/canlıda yedek denetimini atlar
     durum            Ortam, sunucu sürümü, uygulanmış/bekleyen betikler.
     sifirla-yerel    YALNIZ Paksan_Yerel: veritabanını silip baştan kurar.
                      --evet olmadan çalışmaz.
     sozluk           VERITABANI.md içindeki veri sözlüğünü yeniden üretir.
     tohum            Başlangıç verisi betiklerini src dosyalarından üretir.
                      --denetle  üretmeden karşılaştırır (fark varsa çıkış 1)
     sinama           Sınama veritabanlarını kurup bütün doğrulamaları çalıştırır.
     ilk-yonetici     İlk backoffice yöneticisini geçici şifreyle açar.
     yedekle          Tam yedek alır.

   AYNI BETİKLER HER ORTAMDA: yerelde çalışan kurulum VPS'te de aynen
   çalışır; farkı yalnız ortam dosyası belirler (bkz. tools/vt/ortam.mjs).
   ========================================================================== */

import { eksikSifreleriUret, ortamYukle } from './vt/ortam.mjs'
import { sorguJson, sqlcmd, sqlHatasi } from './vt/sqlcmd.mjs'
import {
  betikleriListele,
  betikleriUygula,
  kurulumBetikleriniCalistir,
  ortamIsaretiniDenetle,
  planCikar,
  uygulanmislar,
  yedekDenetle,
} from './vt/calistir.mjs'

const [komut, ...geriKalan] = process.argv.slice(2)

function secenekleriOku(arg) {
  const s = { bayrak: new Set() }
  for (let i = 0; i < arg.length; i++) {
    const a = arg[i]
    if (a === '--ayar' || a === '--ortam' || a === '--betik-klasoru' || a === '--veritabani') {
      s[a.slice(2).replace(/-([a-z])/g, (_, h) => h.toUpperCase())] = arg[++i]
    } else if (a.startsWith('--')) s.bayrak.add(a.slice(2))
  }
  return s
}

function veritabaniVarMi(ayar) {
  const s = sorguJson({
    ayar,
    giris: 'kurulum',
    veritabani: 'master',
    sorgu: `SELECT name FROM sys.databases WHERE name = N'${ayar.veritabani}' FOR JSON PATH`,
  })
  return s.length > 0
}

async function kur(ayar, s) {
  const uretilen = eksikSifreleriUret(ayar.dosya)
  if (uretilen.length) {
    console.log(`Ortam dosyasına şifre üretildi: ${uretilen.join(', ')} (ekrana yazılmaz)`)
    ayar = ortamYukle({ ayar: ayar.dosya })
  }
  if (veritabaniVarMi(ayar)) {
    /* Var olan veritabanı başka bir ortamınsa dokunulmaz. */
    const isaret = sqlcmd({
      ayar,
      giris: 'kurulum',
      sorgu: `SET NOCOUNT ON; IF OBJECT_ID(N'sistem.Ortam') IS NULL THROW 50000, N'ortam işareti yok', 1;
              SELECT OrtamKodu FROM sistem.Ortam;`,
    })
    if (isaret.kod !== 0 || isaret.cikti.trim() !== ayar.ortam) {
      throw new Error(
        `${ayar.veritabani} zaten var ve ortam işareti "${ayar.ortam}" değil. Dokunulmadı.`,
      )
    }
  }
  console.log(`Kurulum: ${ayar.veritabani} (${ayar.ortam}) @ ${ayar.sunucu}`)
  kurulumBetikleriniCalistir(ayar)
  await guncelle(ayar, s)
}

async function guncelle(ayar, s) {
  ortamIsaretiniDenetle(ayar)
  if (!s.bayrak.has('yedeksiz')) yedekDenetle(ayar)
  const plan = planCikar(ayar, { ornek: s.bayrak.has('ornek'), betikKlasoru: s.betikKlasoru })
  if (!plan.length) {
    console.log('Güncel: uygulanacak betik yok.')
    return
  }
  console.log(`Uygulanacak ${plan.length} betik:`)
  betikleriUygula(ayar, plan)
  console.log('Tamam.')
}

function durum(ayar, s) {
  const sunucu = sorguJson({
    ayar,
    giris: 'sahip',
    sorgu: `SELECT CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(40)) AS Surum,
                   CAST(SERVERPROPERTY('Edition') AS nvarchar(80)) AS SurumTuru,
                   DB_NAME() AS Veritabani,
                   CAST(DATABASEPROPERTYEX(DB_NAME(), 'Collation') AS nvarchar(80)) AS Harmanlama,
                   (SELECT compatibility_level FROM sys.databases WHERE name = DB_NAME()) AS Uyumluluk,
                   (SELECT OrtamKodu FROM sistem.Ortam) AS Ortam
            FOR JSON PATH`,
  })[0]
  console.log(sunucu)
  const kayit = new Map(uygulanmislar(ayar).map((x) => [x.BetikAdi, x]))
  for (const tur of ['V', 'R', 'T', 'B', 'O']) {
    const betikler = betikleriListele(tur, s.betikKlasoru)
    const say = { uygulanmis: 0, bekleyen: 0, degismis: 0 }
    for (const b of betikler) {
      const k = kayit.get(b.ad)
      if (!k) say.bekleyen++
      else if (k.Ozet !== b.ozet) say.degismis++
      else say.uygulanmis++
    }
    console.log(`  ${tur}: ${betikler.length} dosya · uygulanmış ${say.uygulanmis} · bekleyen ${say.bekleyen} · değişmiş ${say.degismis}`)
  }
  try {
    planCikar(ayar, { betikKlasoru: s.betikKlasoru })
    console.log('  Değişiklik koruması: temiz')
  } catch (e) {
    console.log('  ' + e.message)
    process.exitCode = 1
  }
}

async function sifirlaYerel(ayar, s) {
  if (ayar.ortam !== 'yerel' || ayar.veritabani !== 'Paksan_Yerel') {
    throw new Error('sifirla-yerel yalnız yerel ortamdaki Paksan_Yerel için çalışır')
  }
  if (!/^(tcp:)?(127\.0\.0\.1|localhost|\.)(,\d+)?$/i.test(ayar.sunucu)) {
    throw new Error(`sifirla-yerel yalnız bu bilgisayardaki sunucuda çalışır (${ayar.sunucu})`)
  }
  if (!s.bayrak.has('evet')) {
    throw new Error('Paksan_Yerel silinip baştan kurulacak. Emin iseniz --evet ekleyin.')
  }
  if (veritabaniVarMi(ayar)) {
    const r = sqlcmd({
      ayar,
      giris: 'kurulum',
      veritabani: 'master',
      sorgu: `ALTER DATABASE [Paksan_Yerel] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [Paksan_Yerel];`,
    })
    if (r.kod !== 0) throw new Error(sqlHatasi(r))
    console.log('Paksan_Yerel silindi.')
  }
  s.bayrak.add('ornek')
  await kur(ayar, s)
}

const KOMUTLAR = {
  kur,
  guncelle,
  durum,
  'sifirla-yerel': sifirlaYerel,
}

/* Sonradan eklenecek komutlar ayrı modüllerde; yoksa açıkça söylenir. */
const MODUL_KOMUTLARI = {
  sozluk: './vt/sozluk.mjs',
  tohum: './vt/tohum-uret.mjs',
  sinama: './vt/sinama.mjs',
  'ilk-yonetici': './vt/ilk-yonetici.mjs',
  yedekle: './vt/yedekle.mjs',
}

async function ana() {
  if (!komut || komut === 'yardim' || komut === '--help') {
    console.log(readmeYaz())
    return
  }
  const s = secenekleriOku(geriKalan)
  if (MODUL_KOMUTLARI[komut]) {
    const modul = await import(MODUL_KOMUTLARI[komut]).catch(() => null)
    if (!modul?.calistir) throw new Error(`"${komut}" komutu henüz hazır değil`)
    await modul.calistir(s)
    return
  }
  const is = KOMUTLAR[komut]
  if (!is) throw new Error(`Bilinmeyen komut: ${komut}`)
  const ayar = ortamYukle({ ayar: s.ayar, ortam: s.ortam })
  if (s.veritabani) ayar.veritabani = s.veritabani
  await is(ayar, s)
}

function readmeYaz() {
  return 'Kullanım: npm run vt -- <kur|guncelle|durum|sifirla-yerel|sozluk|tohum|sinama|ilk-yonetici|yedekle> [--ayar dosya] [--ortam ad]'
}

ana().catch((e) => {
  console.error('\n✗ ' + e.message)
  process.exit(1)
})
