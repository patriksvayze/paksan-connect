import { useEffect, useState } from 'react'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { izinIste, mevcutIzin, bildirimGoster, BILDIRIM } from '../lib/bildirim'

/* ==========================================================================
   Profildeki bildirim satırı

   İzin kayıt sırasında bir kez soruluyor. O an "Şimdi değil" diyen ya da
   uygulamayı kayıt akışı değişmeden önce kurmuş olan kullanıcının izni
   sonradan açacak yeri yoktu.

   ÜÇ DURUM, ÜÇ AYRI DAVRANIŞ

     İzin verilmiş     durum yazıyor, düğme yok
     Hiç sorulmamış    "İzin ver" düğmesi, basınca sistem soruyor
     Reddedilmiş       Android ikinci kez sormuyor; satır kullanıcıyı
                       telefon ayarlarına yönlendiriyor

   Üçüncüsü önemli: reddedilmiş izinde "İzin ver" düğmesi göstermek,
   basıldığında hiçbir şey olmayan bir düğme demek. Kullanıcı uygulamayı
   bozuk sanır.
   ========================================================================== */

export function BildirimAyarSatiri({ ikon }) {
  const { t } = useDil()
  const { showToast } = useApp()
  const [durum, setDurum] = useState(null)
  const [bekliyor, setBekliyor] = useState(false)

  useEffect(() => {
    let iptal = false
    mevcutIzin().then((d) => {
      if (!iptal) setDurum(d)
    })
    return () => {
      iptal = true
    }
  }, [])

  /* Durum okunana kadar satır çizilmiyor: bir an "kapalı" yazıp sonra
     "açık"a dönmesi, izni kapalı sanan kullanıcı üretir. */
  if (durum === null) return null

  const verildi = durum === BILDIRIM.VERILDI
  const reddedildi = durum === BILDIRIM.REDDEDILDI
  const yok = durum === BILDIRIM.DESTEKLENMIYOR

  const alt = verildi
    ? t('profil.bildirimAcik')
    : reddedildi
      ? t('profil.bildirimKapali')
      : yok
        ? t('kayit.bildirimDemo')
        : t('profil.bildirimSorulmadi')

  async function ac() {
    setBekliyor(true)
    const sonuc = await izinIste()
    setDurum(sonuc)
    setBekliyor(false)

    if (sonuc === BILDIRIM.VERILDI) {
      /* İzin verildiği anda bir bildirim çıkıyor: kullanıcı hem iznin
         çalıştığını görüyor hem PAKSAN bildiriminin telefonunda nasıl
         durduğunu. Kayıt ekranında da aynısı yapılıyor. */
      bildirimGoster({
        baslik: t('kayit.bildirimOrnekBaslik'),
        metin: t('kayit.bildirimOrnekMetin'),
        yol: '/bildirimler',
      })
    } else if (sonuc === BILDIRIM.REDDEDILDI) {
      showToast(t('profil.bildirimAyardan'))
    }
  }

  return (
    <div className="listitem">
      <div className="listitem__icon">{ikon}</div>
      <div className="listitem__body">
        <div className="listitem__title">{t('profil.bildirimler')}</div>
        <div className="listitem__sub">{alt}</div>
      </div>
      {/* Açıkken düğme yok: kapatma işi telefonun kendi ayarlarında.
          Uygulama içinden kapatmak, sistem izni açık kalırken uygulamanın
          susması demek olurdu; kullanıcı iki ayrı yerde iki ayrı anahtar
          arar. */}
      {!verildi && !yok && (
        <button className="btn btn--soft btn--sm listitem__eylem" onClick={ac} disabled={bekliyor}>
          {reddedildi ? t('profil.bildirimTekrarDene') : t('profil.bildirimIzinVer')}
        </button>
      )}
    </div>
  )
}
