import { useEffect, useState } from 'react'
import { useDil } from '../i18n'
import { load, save } from '../lib/storage'

/* ==========================================================================
   Tema seçici — açık / koyu

   VARSAYILAN AÇIK

   Uygulama hiçbir seçim yapılmamışken her zaman açık temada açılır.
   Telefonun kendi karanlık mod ayarı izlenmiyor. Kullanıcı isterse
   koyu temaya geçer; o seçim kalıcı olur.
   ========================================================================== */

const ANAHTAR = 'tema'

export const TEMALAR = [
  { kod: 'acik', anahtar: 'tema.acik' },
  { kod: 'koyu', anahtar: 'tema.koyu' },
]

/** Kayıtlı tercihi belgeye uygular. Uygulama açılırken de çağrılıyor. */
export function temayiUygula(kod) {
  const k = kod !== undefined ? kod : load(ANAHTAR, 'acik')
  document.documentElement.setAttribute('data-tema', k === 'koyu' ? 'koyu' : 'acik')
  return k
}

export function TemaSecici() {
  const { t } = useDil()
  const [tema, setTema] = useState(() => load(ANAHTAR, 'acik'))

  useEffect(() => {
    temayiUygula(tema)
  }, [tema])

  return (
    <div className="dilsec" role="group" aria-label={t('tema.baslik')}>
      {TEMALAR.map((x) => (
        <button
          key={x.kod}
          className={'dilsec__dugme' + (tema === x.kod ? ' dilsec__dugme--on' : '')}
          onClick={() => {
            if (x.kod === tema) return
            save(ANAHTAR, x.kod)
            setTema(x.kod)
          }}
          aria-pressed={tema === x.kod}
        >
          {t(x.anahtar)}
        </button>
      ))}
    </div>
  )
}
