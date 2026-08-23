import { useApp } from '../context/AppState'
import { DILLER, useDil } from '../i18n'

/* Dil seçici.

   İki yerde duruyor:
     · Karşılama ekranının tepesinde — uygulamayı ilk açan kişi, hiçbir
       şey okumadan önce kendi dilini seçebilsin.
     · Profil ekranında — sonradan değiştirmek isteyen için.

   İki dil olduğu için açılır liste değil, yan yana iki düğme: tek
   dokunuşla değişiyor ve hangi dilde olunduğu bakar bakmaz görünüyor.  */

export function DilSecici({ koyu = false }) {
  const { dil, setDil, showToast } = useApp()
  const { t } = useDil()

  return (
    <div className={'dilsec' + (koyu ? ' dilsec--koyu' : '')}>
      {DILLER.map((d) => (
        <button
          key={d.kod}
          className={'dilsec__dugme' + (dil === d.kod ? ' dilsec__dugme--on' : '')}
          onClick={() => {
            if (d.kod === dil) return
            setDil(d.kod)
            /* Bildirim yeni dilde çıksın diye sözlükten doğrudan
               okunuyor; `t` bir sonraki çizime kadar eski dilde. */
            showToast(d.kod === 'tr' ? 'Dil değiştirildi' : 'Language changed')
          }}
          aria-label={t('dil.sec') + ': ' + d.ad}
        >
          {d.kisa}
        </button>
      ))}
    </div>
  )
}
