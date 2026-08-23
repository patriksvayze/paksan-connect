import { useNavigate } from 'react-router-dom'
import { PaksanLogo } from '../components/Marka'
import { IconRight } from '../components/Icons'
import { SIRKET, SURUM } from '../config'
import { DilSecici } from '../components/DilSecici'
import { useDil } from '../i18n'

/* ==========================================================================
   Karşılama — uygulamanın ilk ekranı

   İçerik sade: PAKSAN yazısı, "1970'ten beri / Yanınızdayız" ve iki
   buton. Rakamlar, kuruluş bilgisi ve slogan kaldırıldı — ilk ekranın
   işi bilgi vermek değil, marka duygusu verip kullanıcıyı içeri almak.

   Tasarım: neredeyse siyah lacivert zemin, üstünde ince teknik çizim
   ızgarası ve solda dikey turuncu bir çizgi. Yazılar sola hizalı, amblem
   yok — yalın yazı daha ciddi duruyor, mühendislik dosyası gibi.

   (Üç tasarım denenmişti; bu seçildikten sonra diğer ikisi ve
   arasında geçiş yapan adres anahtarı silindi.)
   ========================================================================== */

export default function Welcome() {
  const nav = useNavigate()
  const { t } = useDil()

  return (
    <div className="app giris">
      <div className="giris__ic">
        {/* Dil seçimi en tepede: uygulamayı ilk açan kişi hiçbir şey
            okumadan önce kendi dilini seçebilsin. */}
        <div className="giris__dil">
          <DilSecici koyu />
        </div>

        <div className="spacer" style={{ flexGrow: 0.9 }} />

        {/* ------------------------------------------------------- Marka */}
        <div className="giris__marka fade-in">
          <PaksanLogo height={68} sadeceYazi beyaz className="giris__logo giris__logo--yalin" />
        </div>

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
        <div className="stack fade-in" style={{ gap: 10 }}>
          <button className="btn btn--orange btn--lg" onClick={() => nav('/kayit')}>
            {t('karsilama.basla')}
            <IconRight size={21} />
          </button>
          <button className="btn btn--on-dark" onClick={() => nav('/giris')}>
            {t('karsilama.girisYap')}
          </button>
        </div>

        {/* Yalnızca sürüm. Hangi sürümün kurulu olduğu, uzaktan destek
            verirken ilk sorulan şey; kullanıcı uygulamaya girmeden
            söyleyebilsin diye burada. */}
        <p className="giris__surum">{t('ortak.surum', { s: SURUM })}</p>
      </div>
    </div>
  )
}
