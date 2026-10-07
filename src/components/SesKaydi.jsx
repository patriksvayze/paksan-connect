import { useEffect, useRef, useState } from 'react'
import { IconMic, IconStop, IconTrash } from './Icons'
import { useDil } from '../i18n'

/* ==========================================================================
   Ses kaydı

   Neden var: çiftçinin çoğu telefonda uzun yazı yazmak istemiyor —
   eldivenli parmak, güneş altında ekran, küçük klavye. "Şu düğüm atıcı
   var ya, ondan gelen ses…" demek yazmaktan hem kolay hem daha anlaşılır.
   Servis ekibi de arızayı duyunca daha iyi anlıyor.

   Yazı kutusunun ALTERNATİFİ, yerine geçeni değil: isteyen yazıyor,
   isteyen konuşuyor.

   SINIR: kayıt en fazla 60 saniye. Uzun kayıt hem dinleyene yük hem de
   sunucu gelene kadar telefonun hafızasında duracağı için yer kaplıyor.
   Ses düşük bit hızıyla (24 kbps) alınıyor; konuşma için fazlasıyla
   yeterli, 60 saniye ≈ 180 KB.

   PROD NOTU: kayıt şu anda talebin içinde, telefonun hafızasında
   saklanıyor. Sunucu geldiğinde dosya olarak yüklenmeli
   (bkz. PRODA-CIKIS.md → A1).
   ========================================================================== */

const AZAMI_SANIYE = 60

export function SesKaydi({ ses, onDegis }) {
  const { t } = useDil()
  const [kayitta, setKayitta] = useState(false)
  const [sure, setSure] = useState(0)
  const [hata, setHata] = useState('')

  const kaydediciRef = useRef(null)
  const parcalarRef = useRef([])
  const sayacRef = useRef(null)
  const akisRef = useRef(null)
  /* Kaydın uzunluğu ayrıca ref'te tutuluyor: `onstop` işleyicisi kayıt
     başlarken tanımlandığı için oradan `sure` durumuna bakılınca hep
     0 görünüyordu. */
  const sureRef = useRef(0)

  /* Ekrandan çıkılırsa mikrofon açık kalmasın */
  useEffect(() => () => temizle(), [])

  function temizle() {
    clearInterval(sayacRef.current)
    akisRef.current?.getTracks().forEach((t) => t.stop())
    akisRef.current = null
    kaydediciRef.current = null
  }

  async function basla() {
    setHata('')

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      return setHata(t('ses.desteklenmiyor'))
    }

    let akis
    try {
      akis = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      /* İzin verilmediyse kullanıcıyı suçlamadan ne yapacağını söyle */
      return setHata(
        e?.name === 'NotAllowedError'
          ? t('ses.izinYok')
          : t('ses.acilamadi')
      )
    }

    akisRef.current = akis
    parcalarRef.current = []

    const kaydedici = new MediaRecorder(akis, { audioBitsPerSecond: 24000 })
    kaydediciRef.current = kaydedici

    kaydedici.ondataavailable = (e) => {
      if (e.data?.size > 0) parcalarRef.current.push(e.data)
    }

    kaydedici.onstop = () => {
      const blob = new Blob(parcalarRef.current, { type: kaydedici.mimeType || 'audio/webm' })
      const okuyucu = new FileReader()
      okuyucu.onloadend = () => onDegis({ veri: okuyucu.result, sure: sureRef.current })
      okuyucu.readAsDataURL(blob)
      temizle()
    }

    kaydedici.start()
    setKayitta(true)
    setSure(0)
    sureRef.current = 0

    sayacRef.current = setInterval(() => {
      setSure((s) => {
        const yeni = Math.min(s + 1, AZAMI_SANIYE)
        sureRef.current = yeni
        if (yeni >= AZAMI_SANIYE) durdur()
        return yeni
      })
    }, 1000)
  }

  function durdur() {
    clearInterval(sayacRef.current)
    setKayitta(false)
    if (kaydediciRef.current?.state === 'recording') kaydediciRef.current.stop()
  }

  const dk = String(Math.floor(sure / 60)).padStart(2, '0')
  const sn = String(sure % 60).padStart(2, '0')

  /* -------------------------------------------------- Kayıt alınmışsa */
  if (ses?.veri) {
    return (
      <div className="ses">
        <div className="ses__baslik">
          <span className="ses__nokta ses__nokta--bitti" />
          {t('ses.hazir')}
        </div>
        {/* İndirme ve çalma hızı menüsü kapalı (7 Ekim 2026, kullanıcının
            isteği): oynatıcı yalnız dinletiyor. Uzun basınca açılan
            "Sesi kaydet" menüsü de kapalı. */}
        <audio
          className="ses__oynatici"
          src={ses.veri}
          controls
          controlsList="nodownload noplaybackrate"
          onContextMenu={(e) => e.preventDefault()}
          preload="metadata"
        />
        <button className="btn btn--soft btn--sm" onClick={() => onDegis(null)}>
          <IconTrash size={18} /> {t('ses.sil')}
        </button>
      </div>
    )
  }

  /* ---------------------------------------------------- Kayıt sürüyor */
  if (kayitta) {
    return (
      <div className="ses ses--kayitta">
        <div className="ses__baslik">
          <span className="ses__nokta" />
          {t('ses.dinliyoruz')} <strong className="serial-mono">{dk}:{sn}</strong>
        </div>
        <p className="small muted" style={{ lineHeight: 1.5 }}>
          {t('ses.sure', { n: AZAMI_SANIYE })}
        </p>
        <button className="btn btn--lg ses__dur" onClick={durdur}>
          <IconStop size={20} /> {t('ses.bitir')}
        </button>
      </div>
    )
  }

  /* ------------------------------------------------------- Başlangıç */
  return (
    <div className="ses">
      <div className="ses__yada">{t('ses.yada')}</div>
      <button className="btn btn--soft btn--lg" onClick={basla}>
        <IconMic size={21} /> {t('ses.birak')}
      </button>
      <p className="small muted center" style={{ lineHeight: 1.5, marginTop: 8 }}>
        {t('ses.aciklama')}
      </p>
      {hata && <div className="field__error">{hata}</div>}
    </div>
  )
}
