import { useEffect, useState } from 'react'
import { Sheet } from './Chrome'
import { useDil } from '../i18n'

/* Video oynatıcı.

   İki tür video var:
     dosya → uygulamanın içine gömülü mp4. Burada, uygulamadan çıkmadan
             oynatılır; tarlada internet olmasa da açılır.
     url   → dış bağlantı (YouTube gibi). Tarayıcıda açılır.

   Gömülü videoyu ayrı sekmede açmak yerine burada oynatıyoruz: müşteri
   makinenin başında, tek eliyle telefonu tutarken uygulamadan çıkmasın.  */

export function VideoOynatici({ video, onClose }) {
  const { t } = useDil()
  return (
    <Sheet open={Boolean(video)} onClose={onClose} title={video?.title}>
      {video?.dosya && (
        <video
          className="video"
          src={video.dosya}
          controls
          autoPlay
          playsInline
          preload="metadata"
        />
      )}
      <button className="btn btn--soft" style={{ marginTop: 16 }} onClick={onClose}>
        {t('ortak.kapat')}
      </button>
    </Sheet>
  )
}

/**
 * Videoya dokunulduğunda ne olacağını tek yerden belirler.
 * @returns {'oynat'|'dis'|'yok'}
 */
export function videoTuru(video) {
  if (video?.dosya) return 'oynat'
  if (video?.url) return 'dis'
  return 'yok'
}

function sureBicimle(saniye) {
  const d = Math.floor(saniye / 60)
  const s = Math.round(saniye % 60)
  return `${d}:${String(s).padStart(2, '0')}`
}

/**
 * Video süresi.
 *
 * Gömülü videolarda süre DOSYADAN okunuyor, elle yazılan değere
 * güvenilmiyor: Orkinos tanıtımında listede "2:14" yazarken video
 * gerçekte 26 saniyeydi. Elle girilen değer eskiyor, dosya eskimiyor.
 *
 * Dış bağlantılı videolarda (YouTube) dosyaya erişemediğimiz için
 * veri dosyasındaki `dur` değeri kullanılıyor.
 */
export function VideoSure({ video }) {
  const [sure, setSure] = useState(null)

  useEffect(() => {
    if (!video?.dosya) return
    let birakildi = false

    const el = document.createElement('video')
    el.preload = 'metadata'
    el.onloadedmetadata = () => {
      if (!birakildi && isFinite(el.duration)) setSure(sureBicimle(el.duration))
    }
    el.src = video.dosya

    return () => {
      birakildi = true
      el.src = ''
    }
  }, [video?.dosya])

  return <>{sure || video?.dur || '—'}</>
}
