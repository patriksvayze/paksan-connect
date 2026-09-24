import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { TelefonAlani } from '../components/TelefonAlani'
import { SifreAlani } from '../components/SifreAlani'
import { telGecerliMi, telGoster } from '../lib/tel'
import {
  mevcutHesap, otpGonder, otpKontrol, otpTemizle, ozetHatasiMi, sifreHazirla,
  sifreGecerliMi, SIFRE_HANE, OTP_SURE, OTP_SONUC,
} from '../lib/hesap'
import { save } from '../lib/storage'
import { VARSAYILAN_ULKE } from '../data/ulkeler'
import { GIRIS } from '../config'
import { IconBack, IconAlert, IconRight } from '../components/Icons'

/* ==========================================================================
   Şifremi unuttum

   Üç adım: telefon → SMS kodu → yeni şifre.

   BURADAKİ ASIL MESELE:
   Müşteri telefon numarasını değiştirmiş olabilir. O zaman SMS kodu
   eski numaraya gider ve müşteriye hiç ulaşmaz; kod ekranında öylece
   bekler. Bu yüzden kodun süresi dolduğunda aşağıda "Telefon numaranızı
   mı değiştirdiniz?" diye bir yol açılıyor.

   Bu yol ZORUNLU DEĞİL, sadece bir seçenek: kod geç gelmiş olabilir,
   müşteri gerçekten sadece şifresini unutmuş olabilir. Bu yüzden
   "kodu tekrar gönder" hep üstte ve daha belirgin duruyor.
   ========================================================================== */

export default function SifreSifirla() {
  const nav = useNavigate()
  const { showToast } = useApp()
  const { t } = useDil()

  const [adim, setAdim] = useState('telefon') // telefon | kod | yeni
  const [ulke, setUlke] = useState(VARSAYILAN_ULKE)
  const [tel, setTel] = useState('')
  const [kod, setKod] = useState('')
  const [sifre, setSifre] = useState('')
  const [sifre2, setSifre2] = useState('')
  const [hata, setHata] = useState('')
  const [demoKod, setDemoKod] = useState('')
  const [kalan, setKalan] = useState(0)

  /* Geri sayım. Sıfıra inince "numaranızı mı değiştirdiniz?" yolu açılır. */
  const sayacRef = useRef(null)
  useEffect(() => {
    if (adim !== 'kod') return undefined
    sayacRef.current = setInterval(() => {
      setKalan((k) => (k > 0 ? k - 1 : 0))
    }, 1000)
    return () => clearInterval(sayacRef.current)
  }, [adim])

  useEffect(() => () => otpTemizle(), [])

  async function koduGonder() {
    if (!telGecerliMi(tel, ulke))
      return setHata(t('giris.telefonHatali'))

    /* Numara kayıtlı değilse de aynı ekranı gösteriyoruz: "bu numara
       kayıtlı değil" demek, kimin müşteri olduğunu dışarıya söylemek
       olurdu. Kod yine gitmiş gibi görünür, sadece doğrulanmaz. */
    setHata('')
    const sonuc = await otpGonder({ ulke, tel })
    if (!sonuc.gonderildi) {
      return setHata(t('sifre.gonderilemedi'))
    }
    setDemoKod(sonuc.demoKod || '')
    setKod('')
    setKalan(OTP_SURE)
    setAdim('kod')
  }

  function koduDogrula() {
    if (kod.length < 6) return setHata(t('sifre.kodKisa'))

    const sonuc = otpKontrol(kod)

    /* SUNUCU AÇIKKEN "KOD YANLIŞ" DEMİYORUZ.

       Kod cihazda bilinmiyor, doğrulamayı yapacak bir sunucu ucu da
       yok (eksiğin tamamı src/lib/hesap.js → otpGonder içinde yazılı).
       Doğru kodu yazan kullanıcıya "yanlış" demek, hatayı onda
       aratmak olur; olan şeyi söylüyoruz. */
    if (sonuc === OTP_SONUC.SUNUCUDA) return setHata(t('sifre.dogrulamaSunucuda'))
    if (sonuc === OTP_SONUC.SURE_DOLDU) return setHata(t('sifre.kodSuresiDoldu'))
    if (sonuc !== OTP_SONUC.GECERLI) return setHata(t('sifre.kodYanlis'))

    setHata('')
    setAdim('yeni')
  }

  async function sifreyiKaydet() {
    if (!sifreGecerliMi(sifre)) return setHata(t('kayit.sifreHaneHata', { n: SIFRE_HANE }))
    if (sifre !== sifre2) return setHata(t('kayit.sifreTutmuyor'))

    const hesap = mevcutHesap(ulke, tel)
    if (!hesap) {
      /* Sunucu yokken kayıt yalnızca kendi telefonunda duruyor. */
      return setHata(t('sifre.hesapYok'))
    }

    /* Özet üretilemezse kayıt hiç yazılmıyor ve sebebi ekrana çıkıyor:
       güvenli köken yoksa bu çağrı hata atıyor ve eskiden düğmeye
       basıldığında hiçbir şey olmuyordu (bkz. src/lib/hesap.js → ozet). */
    let sifreOzeti
    try {
      sifreOzeti = await sifreHazirla(sifre)
    } catch (e) {
      if (!ozetHatasiMi(e)) throw e
      return setHata(t('giris.ozetYok'))
    }

    /* Hesap kaydı güncelleniyor; oturum açılmıyor — kullanıcı yeni
       şifresiyle girsin ki şifreyi bir kez daha yazıp aklında kalsın. */
    save('hesap', { ...hesap, sifre: sifreOzeti })
    otpTemizle()
    showToast(t('sifre.degistirildi'))
    nav('/giris', { replace: true })
  }

  const dakika = String(Math.floor(kalan / 60)).padStart(2, '0')
  const saniye = String(kalan % 60).padStart(2, '0')

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__row">
          <button
            className="backbtn"
            onClick={() => (adim === 'telefon' ? nav('/giris') : setAdim('telefon'))}
          >
            <IconBack size={21} />
            {t('ortak.geri')}
          </button>
          {/* Logo başlıkta yok; sayfa adı onun yerinde (bkz. components/Chrome.jsx → TopBar). */}
          <div className="topbar__ad topbar__ad--sag">
            <h1>
              {adim === 'telefon' && t('sifre.unuttumBaslik')}
              {adim === 'kod' && t('sifre.kodBaslik')}
              {adim === 'yeni' && t('sifre.yeniBaslik')}
            </h1>
          </div>
        </div>
      </header>

      <div className="screen screen--nonav wrap fade-in" style={{ paddingTop: 20 }}>
        {/* ------------------------------------------------ 1. Telefon */}
        {adim === 'telefon' && (
          <div className="stack" style={{ gap: 16 }}>
            <p className="muted" style={{ lineHeight: 1.6 }}>
              {t('sifre.aciklama')}
            </p>

            <TelefonAlani
              ulke={ulke}
              onUlke={setUlke}
              tel={tel}
              onTel={setTel}
              ipucu={t('sifre.telefonIpucu')}
              autoFocus
            />

            {hata && <div className="field__error">{hata}</div>}

            <button className="btn btn--orange btn--lg" onClick={koduGonder}>
              {t('sifre.kodGonder')}
            </button>
          </div>
        )}

        {/* ----------------------------------------------------- 2. Kod */}
        {adim === 'kod' && (
          <div className="stack" style={{ gap: 16 }}>
            <p className="muted" style={{ lineHeight: 1.6 }}>
              {t('sifre.kodGonderildi', { numara: telGoster(ulke, tel) })}
            </p>

            <label className="field">
              <span className="field__label">{t('sifre.kodEtiket')}</span>
              <input
                className="input kod-giris"
                value={kod}
                onChange={(e) => {
                  setKod(e.target.value.replace(/\D/g, '').slice(0, 6))
                  setHata('')
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="––––––"
                autoFocus
              />
            </label>

            {/* Kalan süre. Sıfırlanınca kod geçersiz oluyor. */}
            <div className="center small muted">
              {kalan > 0 ? (
                <>
                  {t('sifre.kodSuresi')} <strong className="serial-mono">{dakika}:{saniye}</strong>
                </>
              ) : (
                t('sifre.kodBitti')
              )}
            </div>

            {hata && <div className="field__error">{hata}</div>}

            <button className="btn btn--orange btn--lg" onClick={koduDogrula}>
              {t('ortak.devam')}
            </button>

            {kalan === 0 && (
              <>
                <button className="btn btn--soft" onClick={koduGonder}>
                  {t('sifre.kodTekrar')}
                </button>

                {/* Kod gelmediyse ihtimallerden biri: numara değişmiş.
                    Zorunlu değil, sadece bir yol. Bu yüzden en altta ve
                    sade duruyor; asıl beklenen "tekrar gönder". */}
                <div className="divider" />
                <button
                  className="listitem"
                  onClick={() => nav('/numara-degisikligi')}
                >
                  <div
                    className="listitem__icon"
                    style={{ background: 'var(--pk-orange-soft)', color: 'var(--pk-orange-ink)' }}
                  >
                    <IconAlert size={22} />
                  </div>
                  <div className="listitem__body">
                    <div className="listitem__title" style={{ fontSize: 15.5 }}>
                      {t('sifre.numaraDegisti')}
                    </div>
                    <div className="listitem__sub">
                      {t('sifre.numaraDegistiAlt')}
                    </div>
                  </div>
                  <IconRight size={20} />
                </button>
              </>
            )}

            {/* Sunucu yokken kod gerçekten gönderilemiyor; denemek
                isteyen görebilsin diye ekranda gösteriliyor.
                PROD'A ÇIKARKEN KALDIRILACAK — bkz. PRODA-CIKIS.md → C. */}
            {!GIRIS.sunucu && demoKod && (
              <div className="uyari-kart">
                <strong>{t('sifre.demoEtiket')}</strong> {t('sifre.demoUyari')}{' '}
                <strong className="serial-mono">{demoKod}</strong>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------- 3. Yeni şifre */}
        {adim === 'yeni' && (
          <div className="stack" style={{ gap: 16 }}>
            <p className="muted" style={{ lineHeight: 1.6 }}>
              {t('sifre.dogrulandi')}
            </p>

            <SifreAlani
              deger={sifre}
              onDegis={setSifre}
              etiket={t('sifre.yeniSifre', { n: SIFRE_HANE })}
              autoComplete="new-password"
              autoFocus
            />
            <SifreAlani
              deger={sifre2}
              onDegis={setSifre2}
              etiket={t('sifre.yeniSifreTekrar')}
              autoComplete="new-password"
            />

            {hata && <div className="field__error">{hata}</div>}

            <button className="btn btn--orange btn--lg" onClick={sifreyiKaydet}>
              {t('sifre.sifreyiKaydet')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
