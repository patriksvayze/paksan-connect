import { useEffect, useState } from 'react'
import { useDil } from '../i18n'
import { load, save } from '../lib/storage'

/* ==========================================================================
   Tema seçici — otomatik / açık / koyu

   NEDEN GEREKLİ

   Karanlık mod önce yalnız telefonun kendi ayarını izliyordu. Bu çoğu
   kullanıcı için doğru davranış ama iki durumu karşılamıyordu:

     · Telefonu koyu ayarlı olan biri uygulamayı gündüz açık görmek
       isteyebilir.
     · Tersi de geçerli: telefonu açık ayarlı biri, akşam ahırda
       uygulamayı koyu isteyebilir.

   Telefonun ayarını değiştirmek için uygulamadan çıkmak gerekiyordu.

   ÜÇ SEÇENEK, İKİ DEĞİL

   "Otomatik" seçeneği bilerek duruyor ve varsayılan o. Telefonu
   gün batımında kendiliğinden koyuya dönen bir kullanıcı için en
   doğrusu bu; iki seçenek olsaydı o davranışı kaybederdi.

   NASIL ÇALIŞIYOR

   Seçim `<html>` etiketine `data-tema` olarak yazılıyor. CSS iki yerden
   bakıyor: işletim sisteminin ayarı (otomatik için) ve bu öznitelik
   (elle seçim için). Ayrıntı src/styles.css içinde.
   ========================================================================== */

const ANAHTAR = 'tema'

export const TEMALAR = [
  { kod: 'oto', anahtar: 'tema.oto' },
  { kod: 'acik', anahtar: 'tema.acik' },
  { kod: 'koyu', anahtar: 'tema.koyu' },
]

/** Kayıtlı tercihi belgeye uygular. Uygulama açılırken de çağrılıyor. */
export function temayiUygula(kod) {
  const k = kod || load(ANAHTAR, 'oto')
  /* "Otomatik"te öznitelik hiç konmuyor; CSS o durumda işletim
     sisteminin ayarına bakıyor. */
  if (k === 'oto') document.documentElement.removeAttribute('data-tema')
  else document.documentElement.setAttribute('data-tema', k)
  return k
}

export function TemaSecici() {
  const { t } = useDil()
  const [tema, setTema] = useState(() => load(ANAHTAR, 'oto'))

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
