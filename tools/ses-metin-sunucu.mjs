/* ==========================================================================
   Ses metni köprüsü — n8n ile backoffice arasında

   NE İŞE YARIYOR

   Müşteri talebe sesli not bıraktığında ses kaydı n8n akışına gidiyor,
   orada yazıya çevriliyor (Groq / Whisper). n8n'in çevrilen metni
   yazacağı bir adres gerekiyor: bu sunucu o adresi veriyor.

     n8n  ──POST──►  /api/destek/ses-metni       metni bırakıyor
     Backoffice ─GET─►  /api/destek/ses-metni    metni alıp talebe işliyor

   NEDEN AYRI BİR SUNUCU

   Uygulama ve backoffice şu an sunucusuz çalışıyor; kayıtlar tarayıcının
   kendi hafızasında duruyor. n8n bir tarayıcıya POST atamaz. Bu küçük
   sunucu aradaki tek eksik parçayı kapatıyor: metni dosyada tutuyor,
   backoffice de kendi düzenli kontrolünde gelip alıyor.

   Aşama 2'de gerçek sunucu geldiğinde bu dosya silinecek; n8n aynı
   yolu (`/api/destek/ses-metni`) gerçek sunucuda bulacak, adresten
   başka hiçbir şey değişmeyecek.

   ÇALIŞTIRMAK

     node tools/ses-metin-sunucu.mjs

   Ayarlar (hepsi isteğe bağlı, ortam değişkeniyle):

     PAKSAN_SES_PORT     varsayılan 5180
     PAKSAN_SES_ANAHTAR  paylaşılan gizli anahtar; verilirse n8n'in
                         X-Paksan-Anahtar başlığında aynısı olmalı

   n8n TARAFINDA NE YAPILACAK

   Akışın sonuna bir HTTP Request düğümü eklenecek:

     Method : POST
     URL    : http://<bu-bilgisayarin-adresi>:5180/api/destek/ses-metni
     Body   : JSON
       {
         "recording_id": "{{ $json.recording_id }}",
         "user_id":      "{{ $json.user_id }}",
         "transcript":   "{{ $json.transcript }}",
         "language":     "{{ $json.language }}"
       }

   `recording_id` uygulamanın gönderdiği TALEP NUMARASI (SRV2608214417
   gibi). Metin o numaralı talebe işleniyor.

   > n8n bulutta çalışıyorsa `localhost` adresini göremez. O durumda ya
   > n8n'i bu bilgisayarda çalıştırın ya da bu porta bir tünel açın
   > (cloudflared, ngrok vb.) ve tünel adresini URL'ye yazın.
   ========================================================================== */

import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const PORT = Number(process.env.PAKSAN_SES_PORT || 5180)
const ANAHTAR = process.env.PAKSAN_SES_ANAHTAR || ''
const KUYRUK = 'tools/ses-metni-kuyruk.json'
const YOL = '/api/destek/ses-metni'

/* Metinler dosyada bekliyor: backoffice sekmesi kapalıyken gelen metin
   kaybolmasın, sekme açılınca alsın. Alınanlar silinmiyor — aynı talep
   ikinci kez açıldığında da görünsün diye; liste son 500 kayıtta
   tutuluyor. */
function oku() {
  if (!existsSync(KUYRUK)) return []
  try {
    return JSON.parse(readFileSync(KUYRUK, 'utf8'))
  } catch {
    return []
  }
}

function yaz(liste) {
  writeFileSync(KUYRUK, JSON.stringify(liste.slice(0, 500), null, 1))
}

function govdeOku(istek) {
  return new Promise((coz, red) => {
    let veri = ''
    istek.on('data', (p) => {
      veri += p
      /* 1 MB'ı geçen bir metin yazıya çevrilmiş ses kaydı olamaz */
      if (veri.length > 1_000_000) red(new Error('gövde çok büyük'))
    })
    istek.on('end', () => coz(veri))
    istek.on('error', red)
  })
}

function cevap(yanit, kod, govde) {
  yanit.writeHead(kod, {
    'Content-Type': 'application/json; charset=utf-8',
    /* Backoffice tarayıcıda başka bir porttan çalışıyor */
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Paksan-Anahtar',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  })
  yanit.end(JSON.stringify(govde))
}

const sunucu = createServer(async (istek, yanit) => {
  const adres = new URL(istek.url, 'http://localhost')

  if (istek.method === 'OPTIONS') return cevap(yanit, 204, {})

  if (adres.pathname !== YOL) {
    return cevap(yanit, 404, { hata: 'Bilinmeyen adres. Doğrusu: ' + YOL })
  }

  /* ---------------------------------------------- Backoffice metni alıyor */
  if (istek.method === 'GET') {
    const sonra = Number(adres.searchParams.get('sonra') || 0)
    const liste = oku().filter((k) => k.tarih > sonra)
    return cevap(yanit, 200, { kayitlar: liste })
  }

  /* --------------------------------------------------- n8n metni bırakıyor */
  if (istek.method === 'POST') {
    if (ANAHTAR && istek.headers['x-paksan-anahtar'] !== ANAHTAR) {
      return cevap(yanit, 401, { hata: 'Anahtar geçersiz' })
    }

    let govde
    try {
      govde = JSON.parse(await govdeOku(istek))
    } catch {
      return cevap(yanit, 400, { hata: 'Gövde JSON olmalı' })
    }

    const talepNo = String(govde.recording_id || govde.talep_no || '').trim()
    const metin = String(govde.transcript || '').trim()

    if (!talepNo) return cevap(yanit, 400, { hata: 'recording_id gerekli' })
    if (!metin) return cevap(yanit, 400, { hata: 'transcript boş' })

    const kayit = {
      talepNo,
      metin,
      dil: String(govde.language || '').trim() || null,
      musteriNo: String(govde.user_id || '').trim() || null,
      tarih: Date.now(),
    }

    /* Aynı talep için yeniden çeviri gelirse eskisi düşüyor */
    yaz([kayit, ...oku().filter((k) => k.talepNo !== talepNo)])
    console.log(`  ${talepNo} · ${metin.length} karakter`)
    return cevap(yanit, 200, { sonuc: 'alindi', talepNo })
  }

  cevap(yanit, 405, { hata: 'GET veya POST' })
})

sunucu.listen(PORT, () => {
  console.log(`
PAKSAN ses metni köprüsü

  n8n buraya yazacak   POST  http://localhost:${PORT}${YOL}
  Backoffice buradan alacak  GET   http://localhost:${PORT}${YOL}
  Kuyruk dosyası             ${KUYRUK}
  Anahtar                    ${ANAHTAR ? 'tanımlı' : 'yok (herkes yazabilir)'}
`)
})
