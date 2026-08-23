import { useEffect, useRef, useState } from 'react'
import { useDil } from '../i18n'
import { boyutYaz, ekAdresi, ekSil, ekYaz, fotoKucult } from '../lib/ekler'
import { IconCamera, IconCheckCircle, IconClose, IconAlert } from './Icons'

/* ==========================================================================
   Dekont yükleme

   Yedek parça bedeli havaleyle ödeniyor; dekont ödemenin tek kanıtı.
   Muhasebe onu görmeden parça hazırlanmıyor.

   İki dosya türü kabul ediliyor:
     · Fotoğraf — banka uygulamasının ekran görüntüsü. Küçültülüyor,
       yoksa 6 MB'lık kare tarladaki şebekeden geçmiyor.
     · PDF — bankadan indirilen dekont. Olduğu gibi saklanıyor;
       küçültmeye çalışmak bozar.

   Dosya IndexedDB'de duruyor, talebin içinde yalnız kimliği yazıyor —
   ekler ile aynı yol (bkz. src/lib/ekler.js).
   ========================================================================== */

/* Bankadan inen PDF dekontlar birkaç yüz KB oluyor; 8 MB fazlasıyla
   geniş bir sınır. Bunun üstü büyük ihtimalle yanlış dosya. */
const SINIR_MB = 8

export function DekontAlani({ dekont, onDegis }) {
  const { t } = useDil()
  const dosyaRef = useRef(null)
  const [hata, setHata] = useState('')
  const [calisiyor, setCalisiyor] = useState(false)
  const [onizleme, setOnizleme] = useState(null)

  /* Fotoğrafsa küçük bir önizleme gösteriliyor: kullanıcı doğru
     dosyayı seçtiğini görsün. PDF'in önizlemesi yok, adı yazıyor. */
  useEffect(() => {
    let gecerli = true
    let adres = null

    if (dekont?.id && dekont.tur === 'foto') {
      ekAdresi(dekont.id).then((a) => {
        adres = a
        if (gecerli) setOnizleme(a)
        else if (a) URL.revokeObjectURL(a)
      })
    } else {
      setOnizleme(null)
    }

    return () => {
      gecerli = false
      if (adres) URL.revokeObjectURL(adres)
    }
  }, [dekont])

  async function secildi(e) {
    const dosya = e.target.files?.[0]
    e.target.value = ''
    if (!dosya) return

    if (dosya.size > SINIR_MB * 1024 * 1024) {
      return setHata(t('parcaOdeme.dekontBuyuk', { n: SINIR_MB }))
    }

    setHata('')
    setCalisiyor(true)

    try {
      const pdf = dosya.type === 'application/pdf'
      const veri = pdf ? dosya : await fotoKucult(dosya)
      const id = await ekYaz(veri)

      /* Öncekini bırakmayı unutmayalım — yenisi yüklendiyse eskisi
         hafızada boşuna duruyor. */
      if (dekont?.id) await ekSil(dekont.id).catch(() => {})

      onDegis({
        id,
        tur: pdf ? 'pdf' : 'foto',
        ad: dosya.name,
        boyut: veri.size,
      })
    } catch {
      setHata(t('parcaOdeme.dekontHata'))
    } finally {
      setCalisiyor(false)
    }
  }

  async function kaldir() {
    if (dekont?.id) await ekSil(dekont.id).catch(() => {})
    onDegis(null)
  }

  return (
    <div className="field" data-alan="dekont">
      <span className="field__label">{t('parcaOdeme.dekontBaslik')}</span>

      {dekont ? (
        <div className="listitem listitem--flat" style={{ alignItems: 'center' }}>
          {onizleme ? (
            <img
              src={onizleme}
              alt=""
              style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 12, flex: 'none' }}
            />
          ) : (
            <div
              className="listitem__icon"
              style={{ background: 'var(--pk-green-soft)', color: 'var(--pk-green)' }}
            >
              <IconCheckCircle size={22} />
            </div>
          )}
          <div className="listitem__body">
            <div className="listitem__title" style={{ fontSize: 14.5 }}>
              {t('parcaOdeme.dekontYuklendi')}
            </div>
            <div className="listitem__sub">
              {[dekont.ad, boyutYaz(dekont.boyut)].filter(Boolean).join(' · ')}
            </div>
          </div>
          <button className="circbtn" onClick={kaldir} aria-label={t('ortak.sil')}>
            <IconClose size={19} />
          </button>
        </div>
      ) : (
        <button
          className="btn btn--soft btn--lg"
          disabled={calisiyor}
          onClick={() => dosyaRef.current?.click()}
        >
          <IconCamera size={21} />
          {calisiyor ? t('ortak.gonderiliyor') : t('parcaOdeme.dekontSec')}
        </button>
      )}

      <input
        ref={dosyaRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={secildi}
      />

      <span className="field__hint">{t('parcaOdeme.dekontIpucu')}</span>

      {hata && (
        <div className="hata-kutu" style={{ marginTop: 10 }}>
          <span className="hata-kutu__ikon"><IconAlert size={20} /></span>
          {hata}
        </div>
      )}
    </div>
  )
}
