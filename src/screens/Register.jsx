import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { KonumAlani } from '../components/KonumAlani'
import { useDil } from '../i18n'
import { AYDINLATMA, ACIK_RIZA, TICARI_ILETI, KVKK_SURUM, metinDilde } from '../data/kvkk'
import { telGecerliMi } from '../lib/tel'
import { adTemizle } from '../lib/ad'
import { alanaGit } from '../lib/formOdak'
import { izinIste, bildirimGoster, engelNerede, BILDIRIM } from '../lib/bildirim'
import { mevcutHesap, sifreHazirla, sifreGecerliMi, SIFRE_HANE } from '../lib/hesap'
import { VARSAYILAN_ULKE } from '../data/ulkeler'
import { Rozet } from '../marka'
import { TelefonAlani } from '../components/TelefonAlani'
import { SifreAlani } from '../components/SifreAlani'
import { Metin, OnayKutusu } from '../components/Metin'
import { Sheet } from '../components/Chrome'
import { IconBack, IconCheck, IconBell, IconRight, IconAlert } from '../components/Icons'

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

  const [adim, setAdim] = useState('form') // 'form' | 'bildirim'
  /* İzin ekranında "şimdi değil" denirse de kayıt tamamlanıyor;
     bildirimin cevabı hesaba o hâliyle yazılıyor. */
  const [bildirimSonuc, setBildirimSonuc] = useState(BILDIRIM.SORULMADI)
  /* İzin sistem tarafından engellenmişse ekran ilerlemiyor; kullanıcı
     ne olduğunu ve nereden açacağını okuyor. */
  const [bildirimEngeli, setBildirimEngeli] = useState(false)
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

  /* Bir alan değiştiğinde hata mesajı siliniyor.

     Önce silinmiyordu: kullanıcı boş formu gönderip "Lütfen adınızı
     yazın." uyarısını alıyor, adını yazıyor ama uyarı ekranda kalıyordu.
     Formu doğru doldurduğu hâlde kırmızı bir hata görmeye devam edip
     nerede yanlış yaptığını arıyordu. Hata gerçekten sürüyorsa bir
     sonraki gönderimde yeniden hesaplanıyor. */
  const hatayiTemizle = () => setHata((h) => (h ? '' : h))

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

  /* Kayıt burada tamamlanıyor: bildirim adımı geçildikten sonra.

     KONUM İZNİ ARTIK İSTENMİYOR. Kayıttan sonra bir adım daha vardı ve
     telefonun konum iznini istiyordu; tek tüketicisi "en yakın bayi"
     ekranındaki yön haritasıydı. Harita kaldırılınca izin de kalktı:
     kullanılmayan bir izni istemek çiftçiye bedava bir soru sormak
     değil, ona hesabını açarken güvenmesi gereken bir şey daha
     saymak. Bayiler kayıtlı ile göre sıralanıyor, o bilgi zaten
     formda. */
  async function kaydiBitir(bildirimDurumu) {
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
    })
    nav('/', { replace: true })
  }

  async function bildirimeIzinVer() {
    const sonuc = await izinIste()

    /* İzin alınır alınmaz ilk bildirim çıkıyor.

       İki işi birden görüyor. Kullanıcı iznin gerçekten çalıştığını
       görüyor — "izin verdim ama bir şey olmadı" hissi kalmıyor. Bir de
       PAKSAN bildiriminin telefonda nasıl göründüğünü daha ilk anda
       gösteriyor. */
    if (sonuc === BILDIRIM.VERILDI) {
      bildirimGoster({
        baslik: t('kayit.bildirimOrnekBaslik'),
        metin: t('kayit.bildirimOrnekMetin'),
        yol: '/bildirimler',
      })
    }

    /* Çok eski bir tarayıcıda bildirim hiç yok; düğme sessizce
       geçmesin, kullanıcı ne olduğunu bilsin. */
    if (sonuc === BILDIRIM.DESTEKLENMIYOR) {
      showToast(t('kayit.bildirimDemo'))
    }

    setBildirimSonuc(sonuc)

    /* İZİN ENGELLİYSE EKRAN İLERLEMİYOR.

       Daha önce bir kez reddedilmiş izin için ne tarayıcı ne Android
       pencereyi açıyor; düğmeye basılıyor ve hiçbir şey olmuyordu.
       Ekran sonraki adıma geçince kullanıcı izin verdiğini sanıyordu.
       Artık burada kalıyor ve izni nereden geri açacağını okuyor. */
    if (sonuc === BILDIRIM.ENGELLI) {
      setBildirimEngeli(true)
      return
    }

    kaydiBitir(sonuc)
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
          <Rozet />
        </div>
        <div className="topbar__titles">
          <h1>
            {adim === 'form' ? t('kayit.baslik') : t('kayit.bildirimBaslik')}
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
                  onChange={(e) => { hatayiTemizle(); setAd(adTemizle(e.target.value)) }}
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
                  onChange={(e) => { hatayiTemizle(); setSoyad(adTemizle(e.target.value)) }}
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
                hatayiTemizle()
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
              onDegis={(x) => { hatayiTemizle(); setSifre(x) }}
              etiket={t('kayit.sifre', { n: SIFRE_HANE })}
              autoComplete="new-password"
              ipucu={t('kayit.sifreIpucu')}
            />
            <SifreAlani
              alan="sifre2"
              deger={sifre2}
              onDegis={(x) => { hatayiTemizle(); setSifre2(x) }}
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
              onIl={(x) => { hatayiTemizle(); setIl(x) }}
              ilce={ilce}
              onIlce={(x) => { hatayiTemizle(); setIlce(x) }}
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
                onChange={(e) => { hatayiTemizle(); setSatici(e.target.value) }}
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
                onDegis={(x) => { hatayiTemizle(); setAydinlatmaOnay(x) }}
                onOku={() => setAcikMetin(metinDilde(AYDINLATMA, dil))}
              />
              <OnayKutusu
                cumle={metinDilde(ACIK_RIZA, dil).onayCumlesi}
                deger={rizaOnay}
                onDegis={(x) => { hatayiTemizle(); setRizaOnay(x) }}
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
      ) : (
        /* ------------------------------------------------- Bildirim adımı

           İKİ ADIM KALDI. Üçüncü bir adım vardı ve telefonun konum
           iznini istiyordu; kullanan ekran kaldırılınca o adım da
           kalktı (bkz. kaydiBitir). */
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

          {bildirimEngeli && (
            <div className="uyari-kart" style={{ marginTop: 22 }}>
              <strong>{t('kayit.bildirimEngelBaslik')}</strong>
              <p style={{ margin: '6px 0 0' }}>
                {t(
                  engelNerede().tarayici
                    ? 'kayit.bildirimEngelTarayici'
                    : 'kayit.bildirimEngelTelefon',
                )}
              </p>
            </div>
          )}

          <div className="stack" style={{ gap: 10, marginTop: 28 }}>
            <button className="btn btn--orange btn--lg" onClick={bildirimeIzinVer}>
              {bildirimEngeli ? t('kayit.bildirimTekrarDene') : t('kayit.bildirimIzin')}
            </button>
            <button
              className="btn btn--soft"
              onClick={() => {
                if (!bildirimEngeli) setBildirimSonuc(BILDIRIM.SORULMADI)
                kaydiBitir(BILDIRIM.SORULMADI)
              }}
            >
              {bildirimEngeli ? t('kayit.bildirimEngelDevam') : t('kayit.bildirimSonra')}
            </button>
          </div>

          <p className="small muted center" style={{ marginTop: 18, lineHeight: 1.55 }}>
            {t('kayit.bildirimNot')}
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
          color: 'var(--pk-green-yazi)',
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
