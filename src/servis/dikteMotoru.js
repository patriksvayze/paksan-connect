import { Capacitor, registerPlugin } from '@capacitor/core'

/* ==========================================================================
   Sesle yazma motoru

   İKİ YOL, TEK ARAYÜZ

     APK     android-servis içindeki DiktePlugin.java (telefonun kendi
             Türkçe ses tanıması). Android WebView tarayıcının ses
             tanımasını taşımıyor; bu yüzden yerel eklenti.
     Tarayıcı  webkitSpeechRecognition — yalnız geliştirme ve ekran
             görüntüsü için. Servisim tarayıcıdan kullanılmıyor.

   Hiçbiri yoksa `kullanilabilir()` false dönüyor ve düğme hiç çizilmiyor:
   basınca "olmuyor" diyen bir düğme çıkmaz sokak olurdu.

   AYNI ANDA TEK OTURUM. Telefon tek mikrofon dinliyor; ikinci kutuda
   başlatılan dikte, birincisini durduruyor.

   DİNLEME KULLANICI DURDURANA KADAR SÜRÜYOR (18 Eylül 2026, kullanıcının
   isteği). Hem Android'in SpeechRecognizer'ı hem tarayıcının ses tanıması
   tek cümlelik çalışıyor: konuşma durunca oturumu bitiriyorlar. Eskiden
   bu dikteyi kapatıyordu ve teknisyen iki cümle arasında nefes alınca
   düğmeye yeniden basmak zorunda kalıyordu. Şimdi iki yol da duraklamada
   kendini yeniden başlatıyor; oturum yalnız kullanıcı durdurunca, gerçek
   bir hata olunca ya da sessizlik sınırı dolunca bitiyor.

   Olaylar: onKismi(metin) konuşma sürerken, onSonuc(metin) bir cümle
   tamamlanınca — BİR OTURUMDA BİRDEN ÇOK KEZ gelebilir, çağıran onları
   üst üste ekliyor (bkz. Dikte.jsx) —, onHata(kod) 'izin' | 'internet' |
   'anlasilamadi' | 'baslatilamadi', onBitti() her durumda en son.

   Bu dosya src/servis altında kalmalı: PAKSAN Connect'e girmemeli.
   ========================================================================== */

const Yerel = registerPlugin('Dikte')
const yerelMi = () => Capacitor.isNativePlatform()
const TarayiciTanima =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

const DIL = 'tr-TR'

/* Sessizlikte dinlemeye devam edilecek en uzun süre; konuşulduğu an
   sıfırlanıyor. Yerel eklentideki SESSIZ_SINIR_MS ile aynı olmalı
   (android-servis → DiktePlugin.java): iki yolun davranışı ayrışırsa
   geliştirmede görülen şey telefonda olanı anlatmaz. */
const SESSIZ_SINIR_MS = 120000

let aktif = null

export async function kullanilabilir() {
  if (yerelMi()) {
    try {
      const durum = await Yerel.durum()
      return Boolean(durum?.kullanilabilir)
    } catch {
      return false
    }
  }
  return Boolean(TarayiciTanima)
}

/** 'verildi' | 'sorulacak' | 'engelli'. Tarayıcı izni kendisi soruyor. */
export async function izinDurumu() {
  if (!yerelMi()) return 'verildi'
  try {
    const { mikrofon } = await Yerel.checkPermissions()
    if (mikrofon === 'granted') return 'verildi'
    if (mikrofon === 'denied') return 'engelli'
    return 'sorulacak'
  } catch {
    return 'sorulacak'
  }
}

/** İzin penceresini açar; sonucu `izinDurumu` biçiminde döner. */
export async function izinIste() {
  if (!yerelMi()) return 'verildi'
  try {
    const { mikrofon } = await Yerel.requestPermissions({ permissions: ['mikrofon'] })
    if (mikrofon === 'granted') return 'verildi'
    /* Reddedildikten sonra telefon bir daha sormuyorsa Capacitor
       'denied' döndürüyor; ilk reddin karşılığı 'prompt-with-rationale'. */
    return mikrofon === 'denied' ? 'engelli' : 'reddedildi'
  } catch {
    return 'reddedildi'
  }
}

/**
 * Dinlemeyi başlatır. Dönen nesnenin `durdur()`u konuşmayı bitirir
 * (söylenen yazıya döner), `iptal()`i sonuç beklemeden bırakır.
 */
export async function baslat({ onKismi, onSonuc, onHata, onBitti }) {
  if (aktif) await aktif.iptal()

  let oturum = null
  let bitti = false
  const bitir = () => {
    if (bitti) return
    bitti = true
    if (oturum && aktif === oturum) aktif = null
    onBitti?.()
  }

  oturum = yerelMi()
    ? await yerelOturum({ onKismi, onSonuc, onHata, bitir })
    : tarayiciOturumu({ onKismi, onSonuc, onHata, bitir })

  if (oturum && !bitti) aktif = oturum
  return oturum
}

async function yerelOturum({ onKismi, onSonuc, onHata, bitir }) {
  const dinleyiciler = await Promise.all([
    Yerel.addListener('kismi', (v) => onKismi?.(v.metin || '')),
    Yerel.addListener('sonuc', (v) => onSonuc?.(v.metin || '')),
    Yerel.addListener('hata', (v) => onHata?.(v.kod || 'baslatilamadi')),
    Yerel.addListener('bitti', () => temizle()),
  ])
  let temiz = false
  function temizle() {
    if (temiz) return
    temiz = true
    dinleyiciler.forEach((d) => d.remove())
    bitir()
  }

  try {
    await Yerel.baslat({ dil: DIL })
  } catch (e) {
    onHata?.(e?.message === 'izin' ? 'izin' : 'baslatilamadi')
    temizle()
    return null
  }

  return {
    durdur: () => Yerel.durdur().catch(() => temizle()),
    iptal: async () => {
      await Yerel.iptal().catch(() => {})
      temizle()
    },
  }
}

/**
 * Tarayıcı yolu. APK'daki yerel eklentiyle AYNI davranışı vermeli:
 * dinleme kullanıcı durdurana kadar sürer, duraklamada kapanmaz.
 * İki yol ayrışırsa geliştirmede görülen şey telefonda olanı anlatmaz.
 */
function tarayiciOturumu({ onKismi, onSonuc, onHata, bitir }) {
  if (!TarayiciTanima) {
    onHata?.('baslatilamadi')
    bitir()
    return null
  }
  const t = new TarayiciTanima()
  t.lang = DIL
  t.interimResults = true
  /* `continuous` kısa duraklamada oturumu ayakta tutuyor; yine de
     tarayıcı kendiliğinden bitirebiliyor, o yüzden aşağıda `onend`
     yeniden başlatıyor. İkisi birlikte gerekiyor. */
  t.continuous = true
  t.maxAlternatives = 1

  let kullaniciDurdurdu = false
  let sonSes = Date.now()

  t.onresult = (e) => {
    let kesin = ''
    let gecici = ''
    for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) kesin += r[0].transcript
      else gecici += r[0].transcript
    }
    if (kesin || gecici) sonSes = Date.now()
    if (kesin) onSonuc?.(kesin)
    else if (gecici) onKismi?.(gecici)
  }

  t.onerror = (e) => {
    /* Sessizlik hata değil duraklamadır — yerel eklentideki 6/7/8'in
       tarayıcı karşılığı. Uyarı gösterilmiyor, `onend` yeniden
       başlatıyor. */
    if (e.error === 'no-speech' || e.error === 'no-match' || e.error === 'aborted') return
    const kod =
      e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'izin'
        : e.error === 'network'
          ? 'internet'
          : 'baslatilamadi'
    kullaniciDurdurdu = true
    onHata?.(kod)
  }

  t.onend = () => {
    if (kullaniciDurdurdu || Date.now() - sonSes > SESSIZ_SINIR_MS) {
      bitir()
      return
    }
    try {
      t.start()
    } catch {
      bitir()
    }
  }

  try {
    t.start()
  } catch {
    onHata?.('baslatilamadi')
    bitir()
    return null
  }

  return {
    durdur: async () => {
      kullaniciDurdurdu = true
      t.stop()
    },
    iptal: async () => {
      kullaniciDurdurdu = true
      t.onresult = null
      t.onerror = null
      t.onend = null
      t.abort()
      bitir()
    },
  }
}

/* --------------------------------------------------------------------------
   Söyleneni kutudaki yazıya eklemek

   Var olan yazı silinmiyor; konuşma SONA ekleniyor. Cümle başıysa ilk
   harf büyütülüyor (Türkçe kuralıyla: i → İ). Telefon noktalama
   koymuyor; teknisyen yazıyı kutuda görüp düzeltiyor.
   -------------------------------------------------------------------------- */
export function yaziyaEkle(onceki, soylenen) {
  const yeni = String(soylenen || '').trim()
  if (!yeni) return onceki
  const eski = String(onceki || '')
  const cumleBasi = !eski.trim() || /[.!?]\s*$/.test(eski) || /\n\s*$/.test(eski)
  const parca = cumleBasi ? yeni.charAt(0).toLocaleUpperCase('tr-TR') + yeni.slice(1) : yeni
  if (!eski) return parca
  return /\s$/.test(eski) ? eski + parca : eski + ' ' + parca
}
