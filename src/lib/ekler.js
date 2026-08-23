/* ==========================================================================
   Talep ekleri — fotoğraf ve video

   Tarlada "ne olduğunu anlatmak" zor; göstermek kolay. Servis ve yedek
   parça taleplerine en fazla 5 fotoğraf ve 1 kısa video eklenebiliyor.

   NEDEN localStorage DEĞİL:
   Uygulamanın geri kalanı telefonun `localStorage` alanını kullanıyor
   ama oranın sınırı ~5 MB ve yalnızca yazı saklıyor. Tek bir video bunu
   tek başına doldurur. Bu yüzden ekler IndexedDB'de, dosyanın kendisi
   olarak (blob) duruyor; talebin içinde yalnızca ekin kimliği yazıyor.

   Backoffice aynı tarayıcıda çalıştığı için ekleri buradan okuyabiliyor.
   Sunucu geldiğinde ekler yüklenip adresleri saklanacak; talebin
   içindeki alanlar aynı kalacak (bkz. PRODA-CIKIS.md → A1c).
   ========================================================================== */

const DB_ADI = 'paksan-ekler'
const DEPO = 'ekler'

export const EK_SINIR = {
  foto: 5,
  video: 1,
  videoSaniye: 30,
  /* Fotoğraf küçültüldükten sonraki uzun kenarı */
  fotoKenar: 1600,
}

function db() {
  return new Promise((tamam, hata) => {
    const istek = indexedDB.open(DB_ADI, 1)
    istek.onupgradeneeded = () => {
      if (!istek.result.objectStoreNames.contains(DEPO)) {
        istek.result.createObjectStore(DEPO)
      }
    }
    istek.onsuccess = () => tamam(istek.result)
    istek.onerror = () => hata(istek.error)
  })
}

function islem(mod, is) {
  return db().then(
    (baglanti) =>
      new Promise((tamam, hata) => {
        const t = baglanti.transaction(DEPO, mod)
        const sonuc = is(t.objectStore(DEPO))
        t.oncomplete = () => tamam(sonuc?.result ?? sonuc)
        t.onerror = () => hata(t.error)
      })
  )
}

function kimlik() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

/** Dosyayı saklar, geriye kaydın kimliğini döndürür. */
export async function ekYaz(blob) {
  const id = kimlik()
  await islem('readwrite', (depo) => depo.put(blob, id))
  return id
}

export async function ekOku(id) {
  return islem('readonly', (depo) => depo.get(id))
}

export async function ekSil(id) {
  return islem('readwrite', (depo) => depo.delete(id))
}

/** Talep silinince eklerini de siler. */
export async function ekleriSil(ekler = []) {
  for (const ek of ekler) {
    try {
      await ekSil(ek.id)
    } catch {
      /* yoksa geç */
    }
  }
}

/** Ekranda göstermek için geçici adres üretir. Kullanıldıktan sonra bırakılmalı. */
export async function ekAdresi(id) {
  const blob = await ekOku(id)
  return blob ? URL.createObjectURL(blob) : null
}

/* ------------------------------------------------------------- Fotoğraf

   Telefon kamerası 4-8 MB'lık kare çekiyor. Tarladan zayıf şebekeyle
   bunu yollamak uzun sürer, hafızayı da doldurur. Uzun kenar 1600
   piksele indiriliyor — servisçinin arızayı görmesi için fazlasıyla
   yeterli.                                                            */

export function fotoKucult(dosya) {
  return new Promise((tamam, hata) => {
    const adres = URL.createObjectURL(dosya)
    const resim = new Image()

    resim.onload = () => {
      URL.revokeObjectURL(adres)
      const oran = Math.min(1, EK_SINIR.fotoKenar / Math.max(resim.width, resim.height))
      const en = Math.round(resim.width * oran)
      const boy = Math.round(resim.height * oran)

      const tuval = document.createElement('canvas')
      tuval.width = en
      tuval.height = boy
      tuval.getContext('2d').drawImage(resim, 0, 0, en, boy)

      tuval.toBlob(
        (blob) => (blob ? tamam(blob) : hata(new Error('Fotoğraf işlenemedi.'))),
        'image/jpeg',
        0.82
      )
    }

    resim.onerror = () => {
      URL.revokeObjectURL(adres)
      hata(new Error('Fotoğraf açılamadı.'))
    }
    resim.src = adres
  })
}

/* ---------------------------------------------------------------- Video */

/* Videonun saniye cinsinden süresi.

   Telefonla çekilen bazı videolarda süre bilgisi dosyanın sonunda
   duruyor ve tarayıcı ilk okumada `Infinity` diyor. O durumda videonun
   çok ileri bir saniyesine atlanıyor; tarayıcı gerçek sonu bulunca
   süreyi bildiriyor. Bu numara olmadan 5 saniyelik video bile "30
   saniyeyi aştı" diye reddedilirdi. */
export function videoSuresi(dosya) {
  return new Promise((tamam, hata) => {
    const adres = URL.createObjectURL(dosya)
    const video = document.createElement('video')
    video.preload = 'metadata'

    const bitir = (sure) => {
      URL.revokeObjectURL(adres)
      tamam(sure)
    }

    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) return bitir(video.duration)

      video.ontimeupdate = () => {
        video.ontimeupdate = null
        bitir(Number.isFinite(video.duration) ? video.duration : 0)
      }
      /* Ulaşılamayacak bir saniyeye atlayınca tarayıcı sonu buluyor */
      video.currentTime = 1e6
    }

    video.onerror = () => {
      URL.revokeObjectURL(adres)
      hata(new Error('Video açılamadı.'))
    }
    video.src = adres
  })
}

/** Okunabilir dosya boyutu: "2,4 MB" */
export function boyutYaz(bayt) {
  if (!bayt) return ''
  if (bayt < 1024 * 1024) return `${Math.round(bayt / 1024)} KB`
  return `${(bayt / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}
