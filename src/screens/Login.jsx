import { useState } from 'react'
import { load, remove, save } from '../lib/storage'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { Rozet } from '../marka'
import { TelefonAlani } from '../components/TelefonAlani'
import { SifreAlani } from '../components/SifreAlani'
import { telGecerliMi } from '../lib/tel'
import { girisDene, GIRIS_SONUC, sifreGecerliMi, SIFRE_HANE } from '../lib/hesap'
import { VARSAYILAN_ULKE } from '../data/ulkeler'
import { useDil } from '../i18n'
import { IconBack } from '../components/Icons'

/* Giriş — daha önce kayıt olmuş kullanıcı için.

   Telefon + şifre. Şifre var çünkü bir çiftlikte aynı hesabı birden
   fazla kişi kullanabiliyor; herkese ayrı hesap açtırmak yerine tek
   hesabın şifresi paylaşılıyor.

   Sunucu geldiğinde şifre kontrolü sunucuya geçecek; ekran aynı kalacak
   (bkz. src/lib/hesap.js).                                             */

export default function Login() {
  const nav = useNavigate()
  const { girisYap, showToast } = useApp()
  const { t } = useDil()
  /* BENİ HATIRLA — telefon numarası bu cihazda saklanıyor ve giriş
     ekranı açıldığında hazır geliyor. Şifre saklanmıyor: uygulama her
     açılışta karşılama ekranından başlıyor ve giriş şifreyle yapılıyor. */
  const [ulke, setUlke] = useState(() => load('hatirla', null)?.ulke || VARSAYILAN_ULKE)
  const [tel, setTel] = useState(() => load('hatirla', null)?.tel || '')
  const [hatirla, setHatirla] = useState(() => Boolean(load('hatirla', null)))
  const [sifre, setSifre] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [bulunamadi, setBulunamadi] = useState(false)
  const [sifreYanlis, setSifreYanlis] = useState(false)

  async function dene() {
    if (!telGecerliMi(tel, ulke))
      return setHata(t('giris.telefonHatali'))
    if (!sifreGecerliMi(sifre)) return setHata(t('giris.sifreHane', { n: SIFRE_HANE }))

    setHata('')
    setBulunamadi(false)
    setSifreYanlis(false)
    setBekliyor(true)

    const sonuc = await girisDene({ ulke, tel, sifre })
    setBekliyor(false)

    if (sonuc.durum === GIRIS_SONUC.BULUNDU) {
      if (hatirla) save('hatirla', { ulke, tel })
      else remove('hatirla')
      girisYap(sonuc.user)
      showToast(t('giris.hosgeldiniz', { ad: sonuc.user.ad?.split(' ')[0] || '' }))
      nav('/', { replace: true })
      return
    }
    if (sonuc.durum === GIRIS_SONUC.HATA) {
      setHata(t(sonuc.mesaj))
      return
    }
    if (sonuc.durum === GIRIS_SONUC.SIFRE_YANLIS) {
      setSifreYanlis(true)
      return
    }
    setBulunamadi(true)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__row">
          <button className="backbtn" onClick={() => nav('/')}>
            <IconBack size={21} />
            {t('ortak.geri')}
          </button>
          <div className="spacer" />
          <Rozet />
        </div>
        <div className="topbar__titles">
          <h1>{t('giris.baslik')}</h1>
        </div>
      </header>

      <div className="screen screen--nonav wrap fade-in" style={{ paddingTop: 20 }}>
        <div className="stack" style={{ gap: 16 }}>
          {/* Kayıt bulunamazsa uyarı kutunun hemen altında, kısa ve
              kırmızı. Ayrıntılı açıklama yerine aşağıdaki kayıt butonu
              bir kez ışıklandırılıyor — kullanıcı nereye gideceğini
              okumadan görsün. */}
          <TelefonAlani
            ulke={ulke}
            onUlke={(x) => {
              setUlke(x)
              setBulunamadi(false)
            }}
            tel={tel}
            onTel={(x) => {
              setTel(x)
              setBulunamadi(false)
            }}
            hata={bulunamadi ? t('giris.bulunamadi') : ''}
            ipucu={t('giris.telefonIpucu')}
            autoFocus
          />

          <SifreAlani
            deger={sifre}
            onDegis={(x) => {
              setSifre(x)
              setSifreYanlis(false)
            }}
          />

          <label className="hatirla">
            <input
              type="checkbox"
              checked={hatirla}
              onChange={(e) => setHatirla(e.target.checked)}
            />
            <span>{t('giris.beniHatirla')}</span>
          </label>

          {sifreYanlis && (
            <div className="field__error">{t('giris.sifreYanlis')}</div>
          )}
          {hata && <div className="field__error">{hata}</div>}

          <button className="btn btn--orange btn--lg" onClick={dene} disabled={bekliyor}>
            {bekliyor ? t('giris.kontrolEdiliyor') : t('giris.buton')}
          </button>

          <button
            className={'btn btn--ghost' + (sifreYanlis ? ' btn--dikkat' : '')}
            onClick={() => nav('/sifremi-unuttum')}
          >
            {t('giris.sifremiUnuttum')}
          </button>

          <div className="divider" />

          {/* Buraya "yardım için bizi arayın" konmuyor: giriş ekranından
              santrale yönlendirmek operasyonel yükü artırıyor, oysa
              kullanıcının burada ihtiyacı olan iki şey zaten ekranda —
              şifre sıfırlama ve kayıt. */}
          <button
            className={'btn btn--soft' + (bulunamadi ? ' btn--dikkat' : '')}
            onClick={() => nav('/kayit')}
          >
            {t('giris.kayitOl')}
          </button>
        </div>
      </div>
    </div>
  )
}
