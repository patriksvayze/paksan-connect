import { useNavigate } from 'react-router-dom'
import { Safak } from '../components/Safak'
import { IconRight } from '../components/Icons'
import { SIRKET, SURUM } from '../config'
import { DilSecici } from '../components/DilSecici'
import { useDil } from '../i18n'

/* ==========================================================================
   Karşılama — uygulamanın ilk ekranı

   İçerik sade: "1970'ten beri / Yanınızdayız" ve iki buton. Rakamlar
   ve slogan yok — ilk ekranın işi bilgi vermek değil, marka duygusu
   verip kullanıcıyı içeri almak.

   Arkasında gün doğumu sahnesi var (bkz. src/components/Safak.jsx):
   gökyüzü geceden şafağa dönüyor, güneş ufkun arkasından yükseliyor ve
   PAKSAN yazısı onunla birlikte doğuyor. Altta tarla ve balyalar.

   Marka yazısı bu yüzden burada değil, sahnenin içinde: hareket eden
   bir katman.
   ========================================================================== */

export default function Welcome() {
  const nav = useNavigate()
  const { t } = useDil()

  return (
    <Safak>
      <div className="app giris">
        <div className="giris__ic">
        {/* Dil seçimi en tepede: uygulamayı ilk açan kişi hiçbir şey
            okumadan önce kendi dilini seçebilsin. */}
        <div className="giris__dil">
          <DilSecici koyu />
        </div>

        {/* Marka yazısı sahnenin kendi katmanında, güneşle birlikte
            doğuyor. Burada yalnız onun kapladığı yer bırakılıyor. */}
        <div className="spacer" style={{ flexGrow: 1.9 }} />

        {/* ------------------------------------------------------- Söz

            İki satır: üstte küçük ve aralıklı "1970'TEN BERİ", altında
            iri "Yanınızdayız". Aynı satıra sığdırılsaydı ya yazı küçülüp
            etkisini kaybedecekti ya da dar telefonlarda kendiliğinden
            bölünecekti. */}
        <div className="giris__soz fade-in">
          <p className="giris__yanindayiz">
            <span className="giris__ustsatir">
              {t('karsilama.ustSatir', { yil: SIRKET.kurulus })}
            </span>
            {t('karsilama.slogan')}
          </p>
        </div>

        <div className="spacer" />

        {/* ------------------------------------------------------ İşlem */}
        {/* İki yol da ne olduğunu söylüyor.

             Önce turuncu düğmede yalnız "Hemen Başlayın" yazıyordu; ne
             yaptığı belli değildi ve zaten üye olan kullanıcı da ona
             basıyordu. Şimdi düğmeler "Kayıt Ol" ve "Giriş Yap", altlarında
             da kimin hangisine basacağı yazılı. Kayıt hâlâ ön planda —
             turuncu ve büyük — çünkü şimdilik yeni üyeye ihtiyaç var. */}
        <div className="stack fade-in" style={{ gap: 12 }}>
          <button className="btn btn--orange btn--lg" onClick={() => nav('/kayit')}>
            {t('karsilama.basla')}
            <IconRight size={21} />
          </button>
          <p className="karsilama__ipucu">{t('karsilama.baslaAlt')}</p>

          <button className="btn btn--on-dark" onClick={() => nav('/giris')}>
            {t('karsilama.girisYap')}
          </button>
          <p className="karsilama__ipucu">{t('karsilama.girisYapAlt')}</p>
        </div>

        {/* Yalnızca sürüm. Hangi sürümün kurulu olduğu, uzaktan destek
            verirken ilk sorulan şey; kullanıcı uygulamaya girmeden
            söyleyebilsin diye burada. */}
        <p className="giris__surum">{t('ortak.surum', { s: SURUM })}</p>
        </div>
      </div>
    </Safak>
  )
}
