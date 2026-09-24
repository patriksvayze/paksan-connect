import { useNavigate } from 'react-router-dom'
import { Safak, SafakLogo } from '../components/Safak'
import { IconRight } from '../components/Icons'
import { SIRKET, SURUM } from '../marka'
import { DilSecici } from '../components/DilSecici'
import { useDil } from '../i18n'

/* ==========================================================================
   Karşılama — uygulamanın ilk ekranı

   İçerik sade: "1970'ten beri / Yanınızdayız" ve iki buton. Rakamlar
   ve slogan yok — ilk ekranın işi bilgi vermek değil, marka duygusu
   verip kullanıcıyı içeri almak.

   Arkasında sahne var (bkz. src/components/Safak.jsx): 24 Eylül
   2026'dan beri firmanın gerçek bir tarla fotoğrafı, güneşli gök
   altında. Amblem ve PAKSAN yazısı açılışta gökte beliriyor.

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

        {/* Marka bloğu: amblem ve PAKSAN yazısı, güneşle birlikte
            doğuyor (bkz. src/components/Safak.jsx). Akışın içinde
            duruyor ki altındaki başlıkla hiçbir ekran boyunda
            çakışmasın. */}
        {/* Boşluk oranları (24 Eylül 2026): düğmeler ekranın dibine
            indi, "Yanınızdayız" onların hemen üstünde. Artan boşluğun
            büyüğü logonun ALTINA gidiyor: orası fotoğraftaki makinenin
            yeri. Üstteki pay amblemi ekranın dörtte birinin biraz
            altında tutuyor. */}
        <div className="spacer" style={{ flexGrow: 1 }} />
        <SafakLogo />
        <div className="spacer" style={{ flexGrow: 1.6 }} />

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

        {/* ------------------------------------------------------ İşlem */}
        {/* İki düğme, aynı boyda.

             Önce turuncu düğmede yalnız "Hemen Başlayın" yazıyordu; ne
             yaptığı belli değildi ve zaten üye olan kullanıcı da ona
             basıyordu. Yazılar "Kayıt Ol" ve "Giriş Yap" oldu — ikisi de
             ne yaptığını kendi söylüyor, altlarına açıklama gerekmiyor.

             Ayrım artık boyutla değil renkle: kayıt turuncu, giriş
             saydam. Kayıt yine önde ama giriş küçük düşürülmüş
             görünmüyor.

             Düğmeler ve sürüm satırı ekranın dibine dayalı (24 Eylül
             2026, kullanıcının isteği; yaygın uygulamalarda da böyle):
             başparmağın uzandığı yer. Önce altta ekranın beşte biri
             kadar boş lacivert pay vardı. */}
        <div className="stack fade-in giris__islem" style={{ gap: 12 }}>
          <button className="btn btn--orange btn--lg" onClick={() => nav('/kayit')}>
            {t('karsilama.basla')}
            <IconRight size={21} />
          </button>

          <button className="btn btn--on-dark btn--lg" onClick={() => nav('/giris')}>
            {t('karsilama.girisYap')}
            <IconRight size={21} />
          </button>
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
