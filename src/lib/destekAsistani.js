import { AI } from '../config'

/* ==========================================================================
   DESTEK ASİSTANI — tek kapı

   Destek ekranı asistana yalnız bu dosyadan ulaşıyor. Ekran asistanın
   nerede çalıştığını bilmiyor: bugün geliştirme sunucusunun aktardığı
   yerel sohbet sunucusu, yarın PAKSAN'ın sunucusu. Değişecek tek şey
   `AI.kok` (bkz. src/config.js).

   ASİSTANIN HİÇBİR PARÇASI BURADA DEĞİL. Kılavuzlar, arama indeksi ve
   dil modeli sunucuda. Bu dosya soruyu gönderiyor ve cevabı parça parça
   ekrana aktarıyor; o kadar.

   CEVAP AKARAK GELİYOR. Dil modeli cevabı kelime kelime üretiyor.
   Tamamı beklenseydi çiftçi yarım dakika boş ekrana bakardı; akış
   sayesinde ilk kelime gelir gelmez okumaya başlıyor. Sunucu her
   satıra bir olay yazıyor (NDJSON):

     durum      araniyor · model_yukleniyor · yaziyor (ekran bekleme
                yazısını buna göre seçiyor)
     kaynaklar  kılavuzun hangi sayfalarına bakıldığı
     parca      cevabın bir sonraki parçası
     son        bitti; durumu ve varsa kaynaksız alıntılar

   ZAMAN AŞIMI TOPLAM SÜREYE DEĞİL SESSİZLİĞE BAKIYOR. Her olay sayacı
   sıfırlıyor. İşlemcide çalışan model ilk kelimeyi yarım dakikada
   verebiliyor; toplam süreye sınır konsaydı uzun ama sağlıklı bir cevap
   yarıda kesilirdi. Sunucu o bekleme sırasında da 15 saniyede bir
   `durum` olayını yineliyor; AI.bekleme boyunca hiç olay gelmezse
   bağlantı kopmuş demektir.
   ========================================================================== */

function kok() {
  return String(AI.kok || '').replace(/\/+$/, '')
}

/* Yalnız katalogda açıkça yazan model adını tanır; kılavuz seçme kararı
   sunucudadır. Bu eşleşme, sonraki soruya ve destek kaydına model
   bilgisini taşır. Birden fazla ayrı model varsa tahmin yürütmez. */
function modelYazisi(metin) {
  return String(metin || '').toLocaleLowerCase('tr-TR').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ').trim()
}

export function sorudakiUrun(metin, urunler, yalnizAd = false) {
  const soru = modelYazisi(metin)
  const eslesen = urunler.flatMap((urun) => {
    const ad = [urun.id, urun.name, urun.enName].filter(Boolean).map(modelYazisi)
      .filter((ad) => ad && (yalnizAd ? soru === ad : ` ${soru} `.includes(` ${ad} `)))
      .sort((a, b) => b.length - a.length)[0]
    return ad ? [{ urun, ad }] : []
  })
  /* "Süper Yunus Dual 2" içinde geçen "Süper Yunus" ayrı model sayılmaz. */
  const adaylar = eslesen.filter((a) => !eslesen.some((b) =>
    b.ad.length > a.ad.length && ` ${b.ad} `.includes(` ${a.ad} `),
  ))
  return adaylar.length === 1 ? adaylar[0].urun : null
}

/** Kaynak gösterilen kılavuz sayfasının adresi. */
export function kilavuzAdresi(belge, sayfa) {
  return `${kok()}/kilavuz/${encodeURIComponent(belge)}${sayfa ? `#page=${sayfa}` : ''}`
}

/** Hangi kılavuzlar yüklü, model hazır mı. Hata olursa null. */
export async function durumGetir() {
  try {
    const cevap = await fetch(`${kok()}/durum`, { signal: AbortSignal.timeout(8000) })
    if (!cevap.ok) return null
    return await cevap.json()
  } catch {
    return null
  }
}

/**
 * Soruyu sorar; cevap geldikçe `onOlay` çağrılır.
 *
 * @param {{soru: string, urun?: string, dil?: string, gecmis?: Array<{kim, metin}>}} istek
 * @param {{onOlay?: Function, signal?: AbortSignal}} secenek
 * @returns {Promise<object>} son olay: { tur: 'son', durum, … }
 *   `durum`: cevaplandi · bulunamadi · makine_gerekli · kilavuz_yok ·
 *   model_farkli · llm_yok · hazir_degil · hata · baglanti · iptal
 */
export async function soruSor({ soru, urun = '', dil = 'tr', gecmis = [] }, { onOlay, signal } = {}) {
  const durdurucu = new AbortController()
  const disaridan = () => durdurucu.abort()
  signal?.addEventListener('abort', disaridan)

  let zamanlayici
  const sayaciKur = () => {
    clearTimeout(zamanlayici)
    zamanlayici = setTimeout(() => durdurucu.abort(), AI.bekleme)
  }
  sayaciKur()

  try {
    const cevap = await fetch(`${kok()}/sohbet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ soru, urun, dil, gecmis }),
      signal: durdurucu.signal,
    })
    if (!cevap.ok || !cevap.body) {
      return { tur: 'son', durum: cevap.status === 503 ? 'baglanti' : 'hata' }
    }

    const okuyucu = cevap.body.getReader()
    const cozucu = new TextDecoder()
    let tampon = ''
    let son = null

    for (;;) {
      const { done, value } = await okuyucu.read()
      if (done) break
      sayaciKur()
      tampon += cozucu.decode(value, { stream: true })
      let i
      while ((i = tampon.indexOf('\n')) >= 0) {
        const satir = tampon.slice(0, i).trim()
        tampon = tampon.slice(i + 1)
        if (!satir) continue
        const olay = JSON.parse(satir)
        if (olay.tur === 'son') son = olay
        onOlay?.(olay)
      }
    }
    return son || { tur: 'son', durum: 'hata' }
  } catch {
    if (signal?.aborted) return { tur: 'son', durum: 'iptal' }
    return { tur: 'son', durum: 'baglanti' }
  } finally {
    clearTimeout(zamanlayici)
    signal?.removeEventListener('abort', disaridan)
  }
}
