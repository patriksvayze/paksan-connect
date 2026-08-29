/* ==========================================================================
   Kod grafiğine komut satırından erişim

   NEDEN VAR

   Kod grafiği (codebase-memory) normalde MCP üzerinden kullanılıyor.
   Codex'e iş devredildiğinde bu yol kapalı: Codex'in çalışma kipinde
   MCP araçları onay istiyor, onay veremediği için `search_graph` gibi
   çağrılar başarısız oluyor ("MCP tool call requires approval, but
   approval policy is never").

   Aynı sunucunun bir komut satırı kipi var ve orada onay sorunu yok.
   Bu betik onu sarmalıyor; böylece grafı MCP'si olmayan bir taraf da
   kullanabiliyor.

   KULLANIM

     npm run graf -- search_graph --query "tema uygula"
     npm run graf -- trace_path --function-name temayiUygula --direction inbound
     npm run graf -- get_code_snippet --qualified-name <tam-ad>
     npm run graf -- get_architecture

   `--project paksan-connect` kendiliğinden ekleniyor, yazmaya gerek yok.

   Bir aracın bayraklarını görmek için:

     npm run graf -- search_graph --help

   YÖN DEĞERLERİ

   `trace_path --direction` yalnız şunları kabul ediyor:
   `inbound` (bunu kim çağırıyor), `outbound` (bu neyi çağırıyor),
   `both`.
   ========================================================================== */

import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const PROJE = 'paksan-connect'

/* Sunucunun kurulu olabileceği yerler. Makineye göre değişiyor;
   ilk bulunan kullanılıyor. */
const ADAYLAR = [
  join(
    process.env.LOCALAPPDATA || '',
    'Programs/codebase-memory-mcp/codebase-memory-mcp.exe',
  ),
  join(process.env.USERPROFILE || '', '.local/bin/codebase-memory-mcp.exe'),
  'codebase-memory-mcp',
]

const sunucu = ADAYLAR.find((y) => y === 'codebase-memory-mcp' || existsSync(y))

if (!sunucu) {
  console.error('codebase-memory-mcp bulunamadı. Bakılan yerler:')
  for (const y of ADAYLAR) console.error('  ' + y)
  process.exit(2)
}

const argumanlar = process.argv.slice(2)

if (!argumanlar.length) {
  console.error('Kullanım: npm run graf -- <arac> [--bayrak deger ...]')
  console.error('Örnek   : npm run graf -- search_graph --query "tema uygula"')
  process.exit(2)
}

/* Proje adı zaten verilmişse tekrar ekleme. */
const tam = argumanlar.includes('--project')
  ? ['cli', ...argumanlar]
  : ['cli', argumanlar[0], '--project', PROJE, ...argumanlar.slice(1)]

const sonuc = spawnSync(sunucu, tam, { encoding: 'utf8' })

if (sonuc.error) {
  console.error('çalıştırılamadı:', sonuc.error.message)
  process.exit(2)
}

/* Sunucu başlangıçta bellek günlüğü basıyor; bunlar sonucu
   okunmaz hâle getiriyor, ayıklanıyor. */
const temiz = (sonuc.stdout || '')
  .split('\n')
  .filter((s) => !/^level=(info|warn|debug)\b/.test(s))
  .filter((s) => !/^warning: passing raw JSON/.test(s))
  .join('\n')
  .trim()

if (temiz) console.log(temiz)

const hata = (sonuc.stderr || '')
  .split('\n')
  .filter((s) => !/^level=(info|warn|debug)\b/.test(s))
  .join('\n')
  .trim()

if (hata) console.error(hata)

process.exit(sonuc.status ?? 0)
