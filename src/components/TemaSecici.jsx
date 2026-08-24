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

/* İKİ SEÇENEK, ÜÇ DEĞİL.

   "Otomatik" düğmesi kaldırıldı: üç düğme profil satırına sığmıyor,
   yazılar kırpılıp okunmaz hâle geliyordu.

   Davranış kaybolmadı. Kullanıcı hiç dokunmadıysa kayıt boş kalıyor ve
   telefonun kendi ayarı geçerli oluyor — yani varsayılan hâlâ otomatik.
   Değişen tek şey, bir kere seçim yapıldıktan sonra o seçimin kalıcı
   olması. */
export const TEMALAR = [
  { kod: 'acik', anahtar: 'tema.acik' },
  { kod: 'koyu', anahtar: 'tema.koyu' },
]

/** Kayıtlı tercihi belgeye uygular. Uygulama açılırken de çağrılıyor. */
export function temayiUygula(kod) {
  const k = kod !== undefined ? kod : load(ANAHTAR, '')
  /* Seçim yoksa öznitelik hiç konmuyor; CSS o durumda işletim
     sisteminin ayarına bakıyor. */
  if (k !== 'acik' && k !== 'koyu') document.documentElement.removeAttribute('data-tema')
  else document.documentElement.setAttribute('data-tema', k)
  return k
}

export function TemaSecici() {
  const { t } = useDil()
  /* Kayıt boşsa "otomatik" demek: hiçbir düğme seçili görünmüyor ve
     telefonun ayarı geçerli. */
  const [tema, setTema] = useState(() => load(ANAHTAR, ''))

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
