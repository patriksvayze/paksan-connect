import { useEffect, useRef, useState } from 'react'
import { useDil } from '../i18n'
import { boyutYaz, ekAdresi, ekSil, ekYaz, EK_SINIR, fotoKucult, videoSuresi } from '../lib/ekler'
import { IconCamera, IconVideo, IconClose, IconAlert } from './Icons'

/* Talebe fotoğraf ve video ekleme.

   Arızayı anlatmak zor, göstermek kolay: kırık bir parçanın fotoğrafı
   üç paragraf yazıdan iyi anlatıyor.

   Sınırlar: 5 fotoğraf, 1 video ve video en fazla 30 saniye. Video
   sınırı keyfî değil — tarladaki şebekeyle uzun video yüklenmiyor,
   yarıda kalıyor. Süre aşılırsa dosya alınmıyor ve sebebi yazılıyor.

   Fotoğraflar alınırken küçültülüyor (bkz. src/lib/ekler.js). */

export function EkAlani({ ekler, onDegis }) {
  const { t } = useDil()
  const fotoRef = useRef(null)
  const videoRef = useRef(null)
  const [hata, setHata] = useState('')
  const [calisiyor, setCalisiyor] = useState(false)

  const fotolar = ekler.filter((e) => e.tur === 'foto')
  const video = ekler.find((e) => e.tur === 'video')

  async function fotoSecildi(e) {
    const dosyalar = [...(e.target.files || [])]
    e.target.value = ''
    if (!dosyalar.length) return

    const yer = EK_SINIR.foto - fotolar.length
    if (yer <= 0) return setHata(t('ek.fotoSinir', { n: EK_SINIR.foto }))

    setHata('')
    setCalisiyor(true)
    const yeniler = []

    for (const dosya of dosyalar.slice(0, yer)) {
      try {
        const kucuk = await fotoKucult(dosya)
        const id = await ekYaz(kucuk)
        yeniler.push({ id, tur: 'foto', ad: dosya.name, boyut: kucuk.size })
      } catch {
        setHata(t('ek.fotoHata'))
      }
    }

    setCalisiyor(false)
    if (yeniler.length) onDegis([...ekler, ...yeniler])
    if (dosyalar.length > yer) setHata(t('ek.fotoSinir', { n: EK_SINIR.foto }))
  }

  async function videoSecildi(e) {
    const dosya = e.target.files?.[0]
    e.target.value = ''
    if (!dosya) return

    setHata('')
    setCalisiyor(true)
    try {
      const sure = await videoSuresi(dosya)
      if (sure > EK_SINIR.videoSaniye + 0.5) {
        setHata(
          t('ek.videoUzun', {
            n: EK_SINIR.videoSaniye,
            sure: Math.round(sure),
          })
        )
        return
      }
      const id = await ekYaz(dosya)
      onDegis([
        ...ekler.filter((x) => x.tur !== 'video'),
        { id, tur: 'video', ad: dosya.name, boyut: dosya.size, sure: Math.round(sure) },
      ])
    } catch {
      setHata(t('ek.videoHata'))
    } finally {
      setCalisiyor(false)
    }
  }

  function cikar(ek) {
    ekSil(ek.id)
    onDegis(ekler.filter((x) => x.id !== ek.id))
    setHata('')
  }

  return (
    <div className="ek">
      <div className="ek__dugmeler">
        <button
          className="ek__dugme"
          type="button"
          disabled={calisiyor || fotolar.length >= EK_SINIR.foto}
          onClick={() => fotoRef.current?.click()}
        >
          <IconCamera size={20} />
          {t('ek.fotoEkle')}
          <span className="ek__sayi">
            {fotolar.length}/{EK_SINIR.foto}
          </span>
        </button>

        <button
          className="ek__dugme"
          type="button"
          disabled={calisiyor || Boolean(video)}
          onClick={() => videoRef.current?.click()}
        >
          <IconVideo size={20} />
          {t('ek.videoEkle')}
          <span className="ek__sayi">{t('ek.videoSure', { n: EK_SINIR.videoSaniye })}</span>
        </button>
      </div>

      <input
        ref={fotoRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={fotoSecildi}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={videoSecildi}
      />

      {hata && (
        <div className="ek__hata">
          <IconAlert size={18} />
          <span>{hata}</span>
        </div>
      )}

      {ekler.length > 0 && (
        <div className="ek__liste">
          {ekler.map((ek) => (
            <Onizleme key={ek.id} ek={ek} onCikar={() => cikar(ek)} />
          ))}
        </div>
      )}
    </div>
  )
}

function Onizleme({ ek, onCikar }) {
  const [adres, setAdres] = useState(null)

  useEffect(() => {
    let gecerli = true
    let acik = null
    ekAdresi(ek.id).then((a) => {
      if (!gecerli) return a && URL.revokeObjectURL(a)
      acik = a
      setAdres(a)
    })
    return () => {
      gecerli = false
      if (acik) URL.revokeObjectURL(acik)
    }
  }, [ek.id])

  return (
    <div className="ek__parca">
      {ek.tur === 'foto' ? (
        adres && <img src={adres} alt="" />
      ) : (
        <div className="ek__video">
          <IconVideo size={22} />
          <span>{ek.sure} sn</span>
        </div>
      )}
      <span className="ek__boyut">{boyutYaz(ek.boyut)}</span>
      <button className="ek__sil" type="button" onClick={onCikar} aria-label="Kaldır">
        <IconClose size={15} />
      </button>
    </div>
  )
}
