import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { KonumAlani } from '../components/KonumAlani'
import { useDil } from '../i18n'
import { AYDINLATMA, ACIK_RIZA, TICARI_ILETI, KVKK_SURUM, metinDilde } from '../data/kvkk'
import { telGecerliMi } from '../lib/tel'
import { adTemizle } from '../lib/ad'
import { alanaGit } from '../lib/formOdak'
import { izinIste, BILDIRIM } from '../lib/bildirim'
import { konumIzniIste, KONUM } from '../lib/konum'
import { mevcutHesap, sifreHazirla, sifreGecerliMi, SIFRE_HANE } from '../lib/hesap'
import { VARSAYILAN_ULKE } from '../data/ulkeler'
import { PaksanRozet } from '../components/Marka'
import { TelefonAlani } from '../components/TelefonAlani'
import { SifreAlani } from '../components/SifreAlani'
import { Metin, OnayKutusu } from '../components/Metin'
import { Sheet } from '../components/Chrome'
import { IconBack, IconCheck, IconBell, IconRight, IconPin, IconAlert } from '../components/Icons'

/* Kayıt.

   Tek form: ad, telefon, şifre, il + onaylar. E-posta yok.

   Telefon ülke koduyla ve BAŞTA SIFIR OLMADAN alınıyor — yurtdışındaki
   müşteriler de aynı ekranı kullanacak.

   Şifre var çünkü bir çiftlikte aynı hesabı birden fazla kişi
   kullanabiliyor; herkese ayrı hesap açtırmak yerine tek hesabın
   şifresi paylaşılıyor.

   NOT — "Makinem var / Makine almak istiyorum" ayrımı kaldırıldı:
   iki yol da aynı ekranlara çıkıyordu, yani soru boşa soruluyordu.
   Müşterinin makinesi olup olmadığı zaten seri numarasıyla kayıt
   açtığında belli oluyor; ana sayfada makine kaydı çağrısı da duruyor.
   Kayıt ne kadar kısaysa o kadar iyi.

   Kayıttan hemen sonra bildirim izni isteniyor. İzin kutusu kendiliğinden
   açılmıyor; önce ne için istendiği anlatılıyor, kullanıcı düğmeye
   bastığında soruluyor.                                                 */

export default function Register() {
  const nav = useNavigate()
  const { login, showToast } = useApp()
  const { t, dil } = useDil()

  const [adim, setAdim] = useState('form') // 'form' | 'bildirim' | 'konum'
  /* Bildirim izninin sonucu konum adımına geçilirken elde tutuluyor;
     kayıt iki iznin de cevabı alındıktan sonra bir kerede yazılıyor. */
  const [bildirimSonuc, setBildirimSonuc] = useState(BILDIRIM.SORULMADI)
  const [ad, setAd] = useState('')
  const [soyad, setSoyad] = useState('')
  const [ulke, setUlke] = useState(VARSAYILAN_ULKE)
  const [tel, setTel] = useState('')
  const [sifre, setSifre] = useState('')
  const [sifre2, setSifre2] = useState('')
  const [konumUlke, setKonumUlke] = useState(VARSAYILAN_ULKE)
  const [il, setIl] = useState('')
  const [ilce, setIlce] = useState('')
  const [satici, setSatici] = useState('')
  const [hata, setHata] = useState('')

  /* Zorunlu onaylar */
  const [aydinlatmaOnay, setAydinlatmaOnay] = useState(false)
  const [rizaOnay, setRizaOnay] = useState(false)
  /* İsteğe bağlı: kampanya bildirimleri */
  const [kampanyaOnay, setKampanyaOnay] = useState(false)

  const [acikMetin, setAcikMetin] = useState(null)
  const [varOlanHesap, setVarOlanHesap] = useState(false)

  /* Hangi alanda sorun var, hem mesajı hem alanın adı dönüyor:
     mesaj gönder düğmesinin üstünde kutu içinde çıkıyor, alan da
     ekrana getirilip işaretleniyor. */
  function formuDogrula() {
    if (ad.trim().length < 2) return { alan: 'ad', mesaj: t('kayit.adGerekli') }
    if (soyad.trim().length < 2) return { alan: 'soyad', mesaj: t('kayit.soyadGerekli') }
    if (!telGecerliMi(tel, ulke))
      return { alan: 'tel', mesaj: t('giris.telefonHatali') }
    if (!sifreGecerliMi(sifre))
      return { alan: 'sifre', mesaj: t('kayit.sifreHaneHata', { n: SIFRE_HANE }) }
    if (sifre !== sifre2) return { alan: 'sifre2', mesaj: t('kayit.sifreTutmuyor') }
    if (!il)
      return {
        alan: 'il',
        mesaj: t(konumUlke === 'TR' ? 'kayit.ilGerekli' : 'kayit.bolgeGerekli'),
      }
    if (!ilce)
      return {
        alan: 'ilce',
        mesaj: t(konumUlke === 'TR' ? 'kayit.ilceGerekli' : 'kayit.sehirGerekli'),
      }
    if (!aydinlatmaOnay)
      return { alan: 'onaylar', mesaj: t('kayit.aydinlatmaGerekli') }
    if (!rizaOnay) return { alan: 'onaylar', mesaj: t('kayit.rizaGerekli') }
    return null
  }

  function devamEt() {
    /* Aynı numarayla ikinci hesap açılmasın — kullanıcı kendi kayıtlarının
       üstüne yazıp makinelerini kaybetmesin. Uyarı telefon kutusunun
       altında çıkıyor, hemen ardından giriş butonu beliriyor; alta ayrıca
       hata yazmıyoruz ki aynı şey iki kez söylenmesin. */
    if (mevcutHesap(ulke, tel)) {
      setVarOlanHesap(true)
      setHata('')
      return
    }

    const sorun = formuDogrula()
    if (sorun) {
      setHata(sorun.mesaj)
      alanaGit(sorun.alan)
      return
    }
    setHata('')
    setAdim('bildirim')
  }

  /* Kayıt burada tamamlanıyor: bildirim adımı geçildikten sonra. */
  async function kaydiBitir(bildirimDurumu, konumDurumu = KONUM.SORULMADI) {
    login({
      /* Ad ve soyad ayrı tutuluyor: veriler işlenirken ayıklamak
         gerekmesin. `ad` alanı ekranlarda tam ad olarak kullanılıyor. */
      adi: ad.trim(),
      soyadi: soyad.trim(),
      ad: `${ad.trim()} ${soyad.trim()}`,
      /* Giriş numarası: ülke + sıfırsız numara. Değiştirilmesi yalnızca
         PAKSAN yetkilisinin yapabileceği bir işlem. */
      ulke,
      tel,
      /* Şifre düz metin saklanmıyor, tuzlanıp özetleniyor */
      sifre: await sifreHazirla(sifre),
      konumUlke,
      il,
      ilce,
      satici: satici.trim(),
      /* Kimin hangi metni ne zaman onayladığı saklanıyor. */
      onaylar: {
        aydinlatma: true,
        acikRiza: true,
        kampanya: kampanyaOnay,
        surum: KVKK_SURUM,
        tarih: Date.now(),
      },
      bildirim: {
        izin: bildirimDurumu,
        tarih: Date.now(),
      },
      /* Konumun kendisi değil, yalnızca izin durumu saklanıyor —
         koordinat birkaç gün sonra yanlış oluyor ve kişisel veri.
         Bkz. src/lib/konum.js */
      konumIzni: konumDurumu,
    })
    nav('/', { replace: true })
  }

  async function bildirimeIzinVer() {
    const sonuc = await izinIste()
    /* Android uygulamasında web bildirim arayüzü bulunmuyor; gerçek
       bildirim Capacitor eklentisiyle gelecek (Aşama 4). O zamana kadar
       düğme sessizce geçmesin, kullanıcı ne olduğunu bilsin. */
    if (sonuc === BILDIRIM.DESTEKLENMIYOR) {
      showToast(t('kayit.bildirimDemo'))
    }
    setBildirimSonuc(sonuc)
    setAdim('konum')
  }

  /* Konum izni.

     İki izin arka arkaya soruluyor ama ayrı ekranlarda: telefon iki
     pencereyi üst üste açarsa kullanıcı hangisine ne dediğini bilemez.
     Her ekran neyi ne için istediğini önce yazıyor. */
  async function konumaIzinVer() {
    const sonuc = await konumIzniIste()
    if (sonuc === KONUM.VERILDI) showToast(t('kayit.konumAlindi'))
    kaydiBitir(bildirimSonuc, sonuc)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__row">
          {/* Bildirim adımında geri yok. Form bitti, bilgiler alındı;
              geri dönüp düzenlemeye kalkmak yarım kalmış bir kayıtla
              uğraşmak demek. Bu adımdan çıkışın iki yolu var, ikisi de
              aşağıda ve ikisi de kaydı tamamlıyor: izin ver / şimdi
              değil. */}
          {adim === 'form' ? (
            <button className="backbtn" onClick={() => nav('/')}>
              <IconBack size={21} />
              {t('ortak.geri')}
            </button>
          ) : (
            <span />
          )}
          <div className="spacer" />
          <PaksanRozet />
        </div>
        <div className="topbar__titles">
          <h1>
            {adim === 'form'
              ? t('kayit.baslik')
              : adim === 'bildirim'
                ? t('kayit.bildirimBaslik')
                : t('kayit.konumBaslik')}
          </h1>
        </div>
      </header>

      {adim === 'form' ? (
        <div className="screen screen--nonav wrap fade-in" style={{ paddingTop: 20 }}>
          <div className="stack" style={{ gap: 16 }}>
            <div className="grid-2">
              <label className="field" data-alan="ad">
                <span className="field__label">{t('kayit.ad')}</span>
                <input
                  className="input"
                  value={ad}
                  onChange={(e) => setAd(adTemizle(e.target.value))}
                  placeholder={t('kayit.adOrnek')}
                  autoComplete="given-name"
                  autoCapitalize="words"
                />
              </label>
              <label className="field" data-alan="soyad">
                <span className="field__label">{t('kayit.soyad')}</span>
                <input
                  className="input"
                  value={soyad}
                  onChange={(e) => setSoyad(adTemizle(e.target.value))}
                  placeholder={t('kayit.soyadOrnek')}
                  autoComplete="family-name"
                  autoCapitalize="words"
                />
              </label>
            </div>

            <TelefonAlani
              alan="tel"
              ulke={ulke}
              onUlke={(x) => {
                setUlke(x)
                setVarOlanHesap(false)
                /* Konum ülkesi telefonun ülkesini takip ediyor: numarası
                   +49 ile başlayan biri Almanya'da yaşıyordur. Yanlışsa
                   aşağıdaki ülke kutusundan değiştirilebiliyor — o kutu
                   bu yüzden Türkiye dışı seçildiğinde Türkçede de
                   görünür hâle geliyor. Ülke değişince il ve ilçe
                   anlamsız kalıyor, temizleniyor. */
                if (x !== konumUlke) {
                  setKonumUlke(x)
                  setIl('')
                  setIlce('')
                }
              }}
              tel={tel}
              onTel={(x) => {
                setTel(x)
                setVarOlanHesap(false)
              }}
              hata={varOlanHesap ? t('kayit.hesapVar') : ''}
              ipucu={t('kayit.telefonIpucu')}
            />

            {/* Numara zaten kayıtlıysa çıkış yolu göster */}
            {varOlanHesap && (
              <button className="btn btn--brand" onClick={() => nav('/giris')}>
                {t('giris.buton')}
                <IconRight size={20} />
              </button>
            )}

            {/* Şifre — aynı hesabı ailede birden fazla kişi kullanabilsin
                diye var. Altı rakam: eldivenle yazması ve söylemesi kolay. */}
            <SifreAlani
              alan="sifre"
              deger={sifre}
              onDegis={setSifre}
              etiket={t('kayit.sifre', { n: SIFRE_HANE })}
              autoComplete="new-password"
              ipucu={t('kayit.sifreIpucu')}
            />
            <SifreAlani
              alan="sifre2"
              deger={sifre2}
              onDegis={setSifre2}
              etiket={t('kayit.sifreTekrar')}
              autoComplete="new-password"
            />

            {/* Konum. Türkçede doğrudan il + ilçe; İngilizcede önce
                ülke soruluyor, sonra o ülkeye göre bölge ve şehir
                (bkz. src/components/KonumAlani.jsx). */}
            <KonumAlani
              ulke={konumUlke}
              onUlke={setKonumUlke}
              /* Türkiye dışı bir ülke seçildiyse kutu Türkçede de
                 görünsün, kullanıcı geri dönebilsin */
              ulkeGoster={konumUlke !== 'TR' ? true : undefined}
              il={il}
              onIl={setIl}
              ilce={ilce}
              onIlce={setIlce}
            />

            {/* Makineyi kimden aldığı — isteğe bağlı.
                Bayi ağını takip edebilmek ve servis talebini doğru bayiye
                yönlendirebilmek için değerli; ama zorunlu tutulmuyor,
                çünkü ikinci elde satıcıyı hatırlamayan çok olur. */}
            <label className="field">
              {/* "(Varsa)" — kayıt olan herkesin makinesi olmayabilir;
                  makine almak için de kayıt olunuyor. */}
              <span className="field__label">
                {t('kayit.satici')}
                <span className="field__istege"> {t('ortak.varsa')}</span>
              </span>
              <input
                className="input"
                value={satici}
                onChange={(e) => setSatici(e.target.value)}
                placeholder={t('kayit.saticiOrnek')}
                autoCapitalize="words"
              />
              <span className="field__hint">{t('kayit.saticiIpucu')}</span>
            </label>

            <div className="divider" />

            {/* Onaylar — ilk ikisi zorunlu, üçüncüsü isteğe bağlı */}
            <div className="stack" style={{ gap: 10 }} data-alan="onaylar">
              <OnayKutusu
                cumle={metinDilde(AYDINLATMA, dil).onayCumlesi}
                deger={aydinlatmaOnay}
                onDegis={setAydinlatmaOnay}
                onOku={() => setAcikMetin(metinDilde(AYDINLATMA, dil))}
              />
              <OnayKutusu
                cumle={metinDilde(ACIK_RIZA, dil).onayCumlesi}
                deger={rizaOnay}
                onDegis={setRizaOnay}
                onOku={() => setAcikMetin(metinDilde(ACIK_RIZA, dil))}
              />
              <OnayKutusu
                cumle={metinDilde(TICARI_ILETI, dil).onayCumlesi}
                deger={kampanyaOnay}
                onDegis={setKampanyaOnay}
                onOku={() => setAcikMetin(metinDilde(TICARI_ILETI, dil))}
              />
            </div>

            {hata && (
              <div className="hata-kutu">
                <span className="hata-kutu__ikon"><IconAlert size={20} /></span>
                {hata}
              </div>
            )}

            <button className="btn btn--orange btn--lg" onClick={devamEt}>
              {t('ortak.devam')}
              <IconRight size={21} />
            </button>

            <p className="small muted center" style={{ lineHeight: 1.55 }}>
              {t('kayit.gizlilik')}
            </p>
          </div>
        </div>
      ) : adim === 'bildirim' ? (
        /* ------------------------------------------------- Bildirim adımı */
        <div className="screen screen--nonav wrap fade-in" style={{ paddingTop: 26 }}>
          <div className="center">
            <div className="bildirim__ikon">
              <IconBell size={34} />
            </div>
            <h2 style={{ fontSize: 21, marginTop: 16 }}>{t('kayit.bildirimUst')}</h2>
            <p className="muted" style={{ marginTop: 8, lineHeight: 1.6, fontSize: 15.5 }}>
              {t('kayit.bildirimAlt')}
            </p>
          </div>

          <div className="stack" style={{ gap: 10, marginTop: 24 }}>
            <BildirimSatiri metin={t('kayit.bildirim1')} />
            <BildirimSatiri metin={t('kayit.bildirim2')} />
            <BildirimSatiri metin={t('kayit.bildirim3')} />
            {kampanyaOnay && (
              <BildirimSatiri metin={t('kayit.bildirim4')} />
            )}
          </div>

          <div className="stack" style={{ gap: 10, marginTop: 28 }}>
            <button className="btn btn--orange btn--lg" onClick={bildirimeIzinVer}>
              {t('kayit.bildirimIzin')}
            </button>
            <button
              className="btn btn--soft"
              onClick={() => {
                setBildirimSonuc(BILDIRIM.SORULMADI)
                setAdim('konum')
              }}
            >
              {t('kayit.bildirimSonra')}
            </button>
          </div>

          <p className="small muted center" style={{ marginTop: 18, lineHeight: 1.55 }}>
            {t('kayit.bildirimNot')}
          </p>
        </div>
      ) : (
        /* ---------------------------------------------------- Konum adımı

           Bayiyi bulmak uygulamanın en somut faydalarından biri; izin
           burada bir kez isteniyor ki müşteri "en yakın bayi" ekranında
           hiçbir şeye dokunmadan doğru sıralamayı görsün.

           Zorunlu değil: verilmezse bayiler kayıtlı ile göre sıralanıyor
           ve izin daha sonra bayi ekranından istenebiliyor.            */
        <div className="screen screen--nonav wrap fade-in" style={{ paddingTop: 26 }}>
          <div className="center">
            <div className="bildirim__ikon">
              <IconPin size={34} />
            </div>
            <h2 style={{ fontSize: 21, marginTop: 16 }}>{t('kayit.konumUst')}</h2>
            <p className="muted" style={{ marginTop: 8, lineHeight: 1.6, fontSize: 15.5 }}>
              {t('kayit.konumAlt')}
            </p>
          </div>

          <div className="stack" style={{ gap: 10, marginTop: 24 }}>
            <BildirimSatiri metin={t('kayit.konum1')} />
            <BildirimSatiri metin={t('kayit.konum2')} />
            <BildirimSatiri metin={t('kayit.konum3')} />
          </div>

          <div className="stack" style={{ gap: 10, marginTop: 28 }}>
            <button className="btn btn--orange btn--lg" onClick={konumaIzinVer}>
              {t('kayit.konumIzin')}
            </button>
            <button
              className="btn btn--soft"
              onClick={() => kaydiBitir(bildirimSonuc, KONUM.SORULMADI)}
            >
              {t('kayit.konumSonra')}
            </button>
          </div>

          <p className="small muted center" style={{ marginTop: 18, lineHeight: 1.55 }}>
            {t('kayit.konumNot')}
          </p>
        </div>
      )}

      {/* Metinler tam hâliyle burada okunur */}
      <Sheet
        open={Boolean(acikMetin)}
        onClose={() => setAcikMetin(null)}
        title={acikMetin?.baslik}
      >
        {acikMetin && <Metin metin={acikMetin} />}
        <button
          className="btn btn--primary"
          style={{ marginTop: 22 }}
          onClick={() => setAcikMetin(null)}
        >
          {t('ortak.kapat')}
        </button>
      </Sheet>
    </div>
  )
}

function BildirimSatiri({ metin }) {
  return (
    <div className="listitem listitem--flat" style={{ alignItems: 'flex-start' }}>
      <div
        className="listitem__icon"
        style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          background: 'var(--pk-green-soft)',
          color: 'var(--pk-green)',
        }}
      >
        <IconCheck size={18} />
      </div>
      <div className="listitem__body">
        <div style={{ fontSize: 14.5, lineHeight: 1.5 }}>{metin}</div>
      </div>
    </div>
  )
}
