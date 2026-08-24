import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { TopBar, TabBar, Sheet } from '../components/Chrome'
import { getProduct, urunDilde } from '../data/products'
import { alanEtiketi } from '../data/talepAlanlari'
import { ILLER, ilceleriGetir } from '../data/iller'
import { AYDINLATMA, TICARI_ILETI, metinDilde, metinListesi } from '../data/kvkk'
import { Metin, OnayKutusu } from '../components/Metin'
import { KaydirilirSatir } from '../components/Kaydir'
import { talepTuru } from '../lib/talep'
import { formatSerial } from '../lib/serial'
import { telKullanici } from '../lib/tel'
import { adTemizle } from '../lib/ad'
import { geriBildirimGonder } from '../lib/geriBildirim'
import { GonderButonu } from '../components/GonderButonu'
import { sifreyiDegistir, sifreGecerliMi, sifreDogruMu, SIFRE_HANE } from '../lib/hesap'
import { SifreAlani } from '../components/SifreAlani'
import { DilSecici } from '../components/DilSecici'
import { TemaSecici } from '../components/TemaSecici'
import { useDil } from '../i18n'
import { SIRKET, SURUM, UYGULAMA } from '../config'
import {
  IconUser, IconBaler, IconMachine, IconWrench, IconRight, IconPin, IconCheckCircle,
  IconGorunum, IconParca, IconLock, IconPhone, IconMic, IconGlobe, IconMail, IconSend,
} from '../components/Icons'

export default function Profile() {
  const nav = useNavigate()
  const konum = useLocation()
  const { t, dil } = useDil()
  const {
    user, machines, requests, updateUser, logout, showToast,
    removeRequest,
  } = useApp()
  const [duzenle, setDuzenle] = useState(false)
  /* 'acik' | 'kapali' — talep listesinin hangi sekmesi açık */
  const [talepSekme, setTalepSekme] = useState('acik')
  const [tumTalepler, setTumTalepler] = useState(false)
  const [cikis, setCikis] = useState(false)
  const [kvkk, setKvkk] = useState(null) // okunmak üzere açılan metin
  const [silinecek, setSilinecek] = useState(null)
  const [geriBildirim, setGeriBildirim] = useState(false)
  const [yorum, setYorum] = useState('')
  const [yorumHata, setYorumHata] = useState('')
  const [yorumGonderiliyor, setYorumGonderiliyor] = useState(false)
  const [ad, setAd] = useState(user?.adi || user?.ad?.split(' ')[0] || '')
  const [soyad, setSoyad] = useState(user?.soyadi || user?.ad?.split(' ').slice(1).join(' ') || '')
  const [il, setIl] = useState(user?.il || '')
  const [ilce, setIlce] = useState(user?.ilce || '')
  const [satici, setSatici] = useState(user?.satici || '')

  /* Telefon numarası burada da düzenlenemiyor. Uygulamanın hiçbir
     yerinde düzenlenemiyor: numara hesabın kimliği, değişikliği
     yalnızca PAKSAN yetkilisi yapıyor. */

  /* Şifre değiştirme */
  const [sifrePenceresi, setSifrePenceresi] = useState(false)
  const [eskiSifre, setEskiSifre] = useState('')
  const [yeniSifre, setYeniSifre] = useState('')
  const [yeniSifre2, setYeniSifre2] = useState('')
  const [sifreHata, setSifreHata] = useState('')

  /* Ana sayfadaki "Aktif taleplerim" karosundan gelindiğinde sayfa
     tepeden değil, talep listesinden açılıyor — kullanıcı aradığı yeri
     kendisi aramasın. Uygulamanın geri kalanı her sayfayı tepeden
     açtığı için (bkz. App.jsx → ScrollTop) kaydırma bir kare sonra,
     o iş bittikten sonra yapılıyor. */
  const taleplerRef = useRef(null)
  /* Açık ve tamamlanmış talepler.

     "Tamamlanmış" = üzerinde iş kalmamış: kapandı, iptal edildi ya da
     parça gönderildi. Backoffice’in KAPALI_DURUMLAR listesiyle aynı mantık;
     uygulama backoffice’in kodunu almadığı için burada tekrar yazılı. */
  const KAPALI = ['kapandi', 'iptal', 'gonderildi']
  const acikTalepler = requests.filter((r) => !KAPALI.includes(r.status || 'yeni'))
  const kapaliTalepler = requests.filter((r) => KAPALI.includes(r.status || 'yeni'))
  const seciliListe = talepSekme === 'acik' ? acikTalepler : kapaliTalepler

  /* İlk beş satır; gerisi isteyene. Profil sayfasının altında hesap
     ayarları var, oraya ulaşmak için kırk satır kaydırılmamalı. */
  const ILK_TALEP = 5
  const gosterilen = tumTalepler ? seciliListe : seciliListe.slice(0, ILK_TALEP)
  const kalan = seciliListe.length - gosterilen.length

  const odak = konum.state?.odak
  const odakTalep = konum.state?.talepId

  useEffect(() => {
    if (odak !== 'talepler' && odak !== 'talep') return undefined

    let vurgulanan = null
    let zaman = null

    /* Aranan talep listenin bir parçası; liste bazen bir kare sonra
       çiziliyor. Bulunamazsa kısa bir süre sonra bir kez daha
       deneniyor, yoksa hiç kaydırmadan kalıyordu. */
    function dene(kalanDeneme) {
      const kart = odakTalep && document.querySelector(`[data-talep="${odakTalep}"]`)
      if (!kart && odakTalep && kalanDeneme > 0) {
        zaman = setTimeout(() => dene(kalanDeneme - 1), 120)
        return
      }

      const hedef = kart || taleplerRef.current
      if (!hedef) return

      /* Yapışkan başlığın yüksekliği kadar pay bırakılıyor, yoksa
         hedef başlığın arkasında kalıyor. */
      const bar = document.querySelector('.topbar')?.getBoundingClientRect().height || 110
      const y = hedef.getBoundingClientRect().top + window.scrollY
      window.scrollTo({ top: Math.max(0, y - bar - 8), behavior: 'auto' })

      /* Kısa bir vurgu: kullanıcı hangi talebe geldiğini görsün */
      if (kart) {
        vurgulanan = kart
        kart.classList.add('talep--vurgu')
        zaman = setTimeout(() => kart.classList.remove('talep--vurgu'), 2200)
      }
    }

    const kare = requestAnimationFrame(() => dene(5))

    return () => {
      cancelAnimationFrame(kare)
      if (zaman) clearTimeout(zaman)
      if (vurgulanan) vurgulanan.classList.remove('talep--vurgu')
    }
  }, [odak, odakTalep])

  function kaydet() {
    updateUser({
      adi: ad.trim(),
      soyadi: soyad.trim(),
      ad: `${ad.trim()} ${soyad.trim()}`.trim(),
      il,
      ilce,
      satici: satici.trim(),
    })
    setDuzenle(false)
    showToast(t('profil.guncellendi'))
  }

  async function sifreKaydet() {
    /* Şifre sisteminden önce açılmış hesaplarda şifre yok; o zaman
       eski şifre sorulmuyor, doğrudan yenisi konuyor. */
    if (user?.sifre && !(await sifreDogruMu(eskiSifre, user.sifre))) {
      return setSifreHata(t('sifre.mevcutYanlis'))
    }
    if (!sifreGecerliMi(yeniSifre)) return setSifreHata(t('kayit.sifreHaneHata', { n: SIFRE_HANE }))
    if (yeniSifre !== yeniSifre2) return setSifreHata(t('sifre.tutmuyor'))

    const guncel = await sifreyiDegistir(yeniSifre)
    if (guncel) updateUser({ sifre: guncel.sifre })
    setSifreHata('')
    setEskiSifre('')
    setYeniSifre('')
    setYeniSifre2('')
    setSifrePenceresi(false)
    showToast(t('sifre.degistirildi'))
  }

  async function yorumGonder() {
    if (yorum.trim().length < 5) return setYorumHata(t('profil.geriBildirimKisa'))
    setYorumHata('')
    setYorumGonderiliyor(true)
    try {
      await geriBildirimGonder({
        metin: yorum.trim(),
        dil,
        surum: SURUM,
        tel: user?.tel || '',
        ad: user?.ad || '',
      })
      setYorum('')
      setGeriBildirim(false)
      showToast(t('profil.geriBildirimAlindi'))
    } catch {
      setYorumHata(t('ortak.gonderilemedi'))
    } finally {
      setYorumGonderiliyor(false)
    }
  }

  return (
    <div className="app">
      <TopBar title={t('profil.baslik')} back="/" />

      <div className="screen wrap" style={{ paddingTop: 18 }}>
        {/* Kullanıcı kartı */}
        <div className="card">
          <div className="row">
            <div
              className="listitem__icon"
              style={{ width: 56, height: 56, background: 'var(--pk-blue)', color: '#fff' }}
            >
              <IconUser size={28} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{user?.ad || t('profil.misafir')}</div>
              <div className="row small muted" style={{ gap: 5, marginTop: 3 }}>
                <IconPhone size={15} /> {telKullanici(user)}
              </div>
              {user?.il && (
                <div className="row small muted" style={{ gap: 5, marginTop: 3 }}>
                  <IconPin size={15} /> {user.ilce ? `${user.ilce} / ${user.il}` : user.il}
                </div>
              )}
              {user?.satici && (
                <div className="row small muted" style={{ gap: 5, marginTop: 3 }}>
                  <IconMachine size={15} /> {t('profil.satinAlinanYer', { yer: user.satici })}
                </div>
              )}
            </div>
          </div>
          <button className="btn btn--soft" style={{ marginTop: 14 }} onClick={() => setDuzenle(true)}>
            {t('profil.duzenle')}
          </button>
        </div>

        {/* Özet */}
        {/* İki kutunun simgeleri farklı yükseklikte çiziliyor (balya
            makinesi geniş ve basık, anahtar kare). Serbest bıraktığımızda
            altlarındaki sayı ve yazı da farklı hizada başlıyordu; simgeye
            sabit yükseklik verilip ortalanıyor. */}
        <div className="ozet" style={{ marginTop: 14 }}>
          <button className="card card--tap center" onClick={() => nav('/makinelerim')}>
            <div className="ozet__ikon" style={{ color: 'var(--pk-blue)' }}><IconBaler size={26} /></div>
            <div style={{ fontWeight: 700, fontSize: 24, marginTop: 6 }}>{machines.length}</div>
            <div className="small muted">{t('profil.kayitliMakine')}</div>
          </button>
          <div className="card center">
            <div className="ozet__ikon" style={{ color: 'var(--pk-orange)' }}><IconWrench size={26} /></div>
            <div style={{ fontWeight: 700, fontSize: 24, marginTop: 6 }}>{requests.length}</div>
            <div className="small muted">{t('profil.talep')}</div>
          </div>
        </div>

        {/* Talepler.

            İKİ SEKME. Talepler birikince sayfa metrelerce uzuyordu ve
            asıl bakılan şey — bekleyen işler — kapanmışların arasında
            kayboluyordu. Açık talepler önde, tamamlananlar ikinci
            sekmede.

            Her sekme ilk beş satırı gösteriyor, gerisi "daha fazla"
            düğmesinin ardında. Profil sayfası yalnızca talep listesi
            değil; altında hesap ayarları var ve oraya ulaşmak için
            kırk satır kaydırmak gerekmemeli. */}
        <div className="sectionhead" ref={taleplerRef}>
          <h2>{t('profil.taleplerim')}</h2>
        </div>

        {requests.length > 0 && (
          <div className="sekmeler">
            <button
              className={'sekme' + (talepSekme === 'acik' ? ' sekme--on' : '')}
              onClick={() => {
                setTalepSekme('acik')
                setTumTalepler(false)
              }}
            >
              {t('profil.acikTalepler')}
              <span className="sekme__sayi">{acikTalepler.length}</span>
            </button>
            <button
              className={'sekme' + (talepSekme === 'kapali' ? ' sekme--on' : '')}
              onClick={() => {
                setTalepSekme('kapali')
                setTumTalepler(false)
              }}
            >
              {t('profil.tamamlananTalepler')}
              <span className="sekme__sayi">{kapaliTalepler.length}</span>
            </button>
          </div>
        )}

        {requests.length === 0 ? (
          /* Boş liste. Tek bir "Talep Oluştur" butonu vardı ama hangi
             talebi açacağı belli olmuyordu; artık iki iş de adıyla
             yazılı, kullanıcı ne açtığını bilerek dokunuyor. */
          <div className="card" style={{ padding: 22 }}>
            <p className="muted small center" style={{ lineHeight: 1.6 }}>
              {t('profil.talepYok')}
            </p>
            <button
              className="btn btn--brand btn--lg"
              style={{ marginTop: 18 }}
              onClick={() => nav('/talep?tur=parca')}
            >
              <IconParca size={21} /> {t('anasayfa.yedekParcaTalebi')}
            </button>
            <button
              className="btn btn--brand btn--lg"
              style={{ marginTop: 10 }}
              onClick={() => nav('/talep?tur=servis')}
            >
              <IconWrench size={21} /> {t('anasayfa.servisTalebi')}
            </button>
          </div>
        ) : gosterilen.length === 0 ? (
          <div className="card" style={{ padding: 22 }}>
            <p className="muted small center" style={{ lineHeight: 1.6 }}>
              {talepSekme === 'acik' ? t('profil.acikTalepYok') : t('profil.kapaliTalepYok')}
            </p>
          </div>
        ) : (
          <>
            <p className="small muted" style={{ marginBottom: 10 }}>
              {t('profil.kaydirIpucu')}
            </p>
            <div className="stack">
              {gosterilen.map((r) => {
                const pr = r.makine ? urunDilde(getProduct(r.makine.productId), dil) : null
                const tur = talepTuru(r.tur)
                return (
                  <KaydirilirSatir
                    key={r.id}
                    onSil={() => setSilinecek(r)}
                    onDokun={() => nav('/talebim/' + r.id)}
                  >
                    <div
                      className="listitem"
                      style={{ alignItems: 'flex-start' }}
                      data-talep={r.id}
                    >
                      <div
                        className="listitem__icon"
                        style={{ background: 'var(--pk-green-soft)', color: 'var(--pk-green)' }}
                      >
                        <IconCheckCircle size={22} />
                      </div>
                      <div className="listitem__body">
                        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                          <span className="listitem__title" style={{ fontSize: 15.5 }}>
                            {t(`talep.${r.tur}.baslik`)}
                          </span>
                          {/* Talep numarası türün rengiyle: servis kırmızı,
                              yedek parça turuncu, teklif mavi. */}
                          <span
                            className={'badge serial-mono badge--' + tur.ton}
                            style={{ fontSize: 11.5 }}
                          >
                            {r.no}
                          </span>
                        </div>
                        {/* Talebin hangi aşamada olduğu.

                            Düz yazıyla yazınca öteki satırların
                            arasında kayboluyordu; durum listedeki en
                            önemli bilgi. Renkli hap hâlinde ve durumun
                            kendi rengiyle. */}
                        <div style={{ marginTop: 5 }}>
                          <span className={'durum-hap durum-hap--' + (r.status || 'yeni')}>
                            {t('talepDurum.' + (r.status || 'yeni'))}
                          </span>
                        </div>

                        {/* Randevu verildiyse tarihi ve işi burada */}
                        {r.plan && r.status === 'planlandi' && (
                          <div className="randevu-kutu">
                            <div className="randevu-kutu__tarih">{r.plan.tarihYazi}</div>
                            <div>{r.plan.is}</div>
                          </div>
                        )}

                        {pr && (
                          <div className="listitem__sub">
                            {pr.name} ·{' '}
                            <span className="serial-mono">{formatSerial(r.makine.serial)}</span>
                          </div>
                        )}
                        {/* Formda işaretlenen belirti / parça başlıkları —
                            açıklamayı okumadan talebin ne olduğu anlaşılsın */}
                        {(r.belirtiler?.length > 0 || r.parcalar?.length > 0) && (
                          <div className="listitem__sub" style={{ marginTop: 4 }}>
                            {/* Kayıt Türkçe; ekranda kullanıcının dilinde */}
                            {[...(r.belirtiler || []), ...(r.parcalar || [])]
                              .map((x) => alanEtiketi(x, dil))
                              .join(' · ')}
                          </div>
                        )}
                        {r.ses?.veri && (
                          <div className="row small muted" style={{ gap: 5, marginTop: 5 }}>
                            <IconMic size={14} /> {t('profil.sesEklendi')}
                          </div>
                        )}
                        {r.aciklama && (
                          <p className="small muted" style={{ marginTop: 5, lineHeight: 1.5 }}>
                            {r.aciklama.length > 90 ? r.aciklama.slice(0, 90) + '…' : r.aciklama}
                          </p>
                        )}
                        {/* İptal ve kapanışta "neden" burada değil,
                            talebin kendi ekranında. Listede yalnız
                            böyle bir bilgi OLDUĞU söyleniyor. */}
                        {(r.iptalBilgi || r.cozum || r.teklif || r.gonderim) && (
                          <div className="small" style={{ marginTop: 6, color: 'var(--pk-blue)' }}>
                            {t('profil.detayGor')}
                          </div>
                        )}
                        <div className="small muted" style={{ marginTop: 6 }}>
                          {new Date(r.createdAt).toLocaleDateString(
                            dil === 'tr' ? 'tr-TR' : 'en-GB',
                            { day: 'numeric', month: 'long', year: 'numeric' }
                          )}
                        </div>
                      </div>
                      <span className="listitem__chev"><IconRight size={20} /></span>
                    </div>
                  </KaydirilirSatir>
                )
              })}
            </div>

            {kalan > 0 && (
              <button
                className="btn btn--soft"
                style={{ marginTop: 12 }}
                onClick={() => setTumTalepler(true)}
              >
                {t('profil.dahaFazlaTalep', { n: kalan })}
              </button>
            )}
          </>
        )}

        {/* Menü ikiye ayrıldı.

            Beş satır arka arkaya dizilince hangisinin ne olduğu
            karışıyordu: dil ayarıyla bayi telefonu aynı yığında
            duruyordu. Artık iki öbek var — "Hesabım" kendi hesabına
            dair işler, "Yardım" dışarıya bakanlar. Taleplerden de bir
            çizgiyle ayrıldı. */}
        <div className="divider" style={{ marginTop: 26 }} />

        <div className="sectionhead">
          <h2>{t('profil.hesabim')}</h2>
        </div>
        <div className="stack">
          {/* Dil — karşılama ekranında seçiliyor, sonradan buradan
              değiştiriliyor. */}
          <div className="listitem">
            <div className="listitem__icon"><IconGlobe size={22} /></div>
            <div className="listitem__body">
              <div className="listitem__title">{t('dil.baslik')}</div>
            </div>
            <DilSecici />
          </div>

          {/* Görünüm — açık/koyu. "Otomatik" telefonun kendi ayarını
              izliyor ve varsayılan o; telefonu gün batımında kendiliğinden
              koyuya dönen kullanıcı bu davranışı kaybetmesin. */}
          <div className="listitem listitem--sarmal">
            <div className="listitem__icon"><IconGorunum size={22} /></div>
            <div className="listitem__body">
              <div className="listitem__title">{t('tema.baslik')}</div>
              <div className="listitem__sub">{t('tema.otoAlt')}</div>
            </div>
            <TemaSecici />
          </div>

          {/* Satırlarda yalnızca düğme adı duruyor; alt açıklamalar
              kaldırıldı. Şifresi olmayan kullanıcıya bunu söylemek
              gerekiyordu, o bilgi başlığın kendisine taşındı: satır
              "Şifre belirle" yazıyor. */}
          <button className="listitem" onClick={() => setSifrePenceresi(true)}>
            <div className="listitem__icon"><IconLock size={22} /></div>
            <div className="listitem__body">
              <div className="listitem__title">
                {user?.sifre ? t('profil.sifreDegistir') : t('profil.sifreBelirle')}
              </div>
            </div>
            <IconRight size={20} />
          </button>

          <button className="listitem" onClick={() => nav('/numara-degisikligi')}>
            <div className="listitem__icon"><IconPhone size={22} /></div>
            <div className="listitem__body">
              <div className="listitem__title">{t('profil.telefonDegisti')}</div>
            </div>
            <IconRight size={20} />
          </button>
        </div>

        <div className="sectionhead">
          <h2>{t('profil.yardim')}</h2>
        </div>
        <div className="stack">
          <button className="listitem" onClick={() => nav('/bayiler')}>
            <div className="listitem__icon"><IconPin size={22} /></div>
            <div className="listitem__body">
              <div className="listitem__title">{t('profil.bayiIletisim')}</div>
            </div>
            <IconRight size={20} />
          </button>

          {/* Geri bildirim — meraklı kullanıcı için, sade bir satır.
              Uygulamayı düzeltmenin en ucuz yolu kullanandan duymak.

              Simge zarf, konuşma balonu değil: balon alt menüde Destek'i
              anlatıyor. İkisi de mesajlaşma gibi görünse de farklı
              işler — destek makinesiyle ilgili, geri bildirim
              uygulamayla. Backoffice tarafında da aynı ayrım var. */}
          <button className="listitem" onClick={() => setGeriBildirim(true)}>
            <div className="listitem__icon"><IconMail size={22} /></div>
            <div className="listitem__body">
              <div className="listitem__title">{t('profil.geriBildirim')}</div>
            </div>
            <IconRight size={20} />
          </button>
        </div>

        <button
          className="btn btn--soft"
          style={{ marginTop: 22, color: 'var(--pk-red)' }}
          onClick={() => setCikis(true)}
        >
          {t('profil.cikis')}
        </button>

        {/* Sayfanın dibi: yalnızca KVKK bağlantısı ve sürüm.
            Kurum satırı ve e-posta buradan kaldırıldı — iletişim
            bilgisinin yeri "Bayi ve iletişim" ekranı, profilin dibinde
            kimse aramıyor.

            KVKK metinlerine erişim menüden kaldırıldı ama tamamen
            kapatılmadı — kullanıcının onayladığı metni sonradan
            okuyabilmesi gerekiyor, o yüzden burada sade bir bağlantı. */}
        <p className="small muted center" style={{ marginTop: 22, lineHeight: 1.7 }}>
          <button
            onClick={() => setKvkk(metinDilde(AYDINLATMA, dil))}
            className="small"
            style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}
          >
            {t('profil.kvkkBaglanti')}
          </button>
          <br />
          <span style={{ color: 'var(--ink-3)' }}>{UYGULAMA} · {t('ortak.surum', { s: SURUM })}</span>
        </p>
      </div>

      {/* Bilgi düzenleme */}
      <Sheet open={duzenle} onClose={() => setDuzenle(false)} title={t('profil.duzenleBaslik')}>
        <div className="stack" style={{ gap: 16 }}>
          <div className="grid-2">
            <label className="field">
              <span className="field__label">{t('kayit.ad')}</span>
              <input
                className="input"
                value={ad}
                onChange={(e) => setAd(adTemizle(e.target.value))}
                autoCapitalize="words"
              />
            </label>
            <label className="field">
              <span className="field__label">{t('kayit.soyad')}</span>
              <input
                className="input"
                value={soyad}
                onChange={(e) => setSoyad(adTemizle(e.target.value))}
                autoCapitalize="words"
              />
            </label>
          </div>
          {/* Giriş numarası kilitli. Kullanıcı kendi başına
              değiştirebilseydi, telefonu bir süreliğine eline geçiren
              biri hesabı devralabilirdi. Değişiklik Paksan'da. */}
          <div className="field">
            <span className="field__label">{t('profil.girisNumarasi')}</span>
            <div className="onay-kutu">
              <span className="onay-kutu__ikon"><IconLock size={19} /></span>
              <span className="onay-kutu__body">
                <span className="onay-kutu__deger">{telKullanici(user)}</span>
                <span className="onay-kutu__etiket" style={{ marginTop: 3 }}>
                  {t('profil.girisNumarasiAlt')}
                </span>
              </span>
            </div>
            <button
              className="small"
              style={{
                color: 'var(--pk-blue)',
                textDecoration: 'underline',
                marginTop: 10,
                display: 'block',
              }}
              onClick={() => {
                setDuzenle(false)
                nav('/numara-degisikligi')
              }}
            >
              {t('profil.numaramDegisti')}
            </button>
          </div>

          <div className="grid-2">
            <label className="field">
              <span className="field__label">İl</span>
              <select
                className="select"
                value={il}
                onChange={(e) => {
                  setIl(e.target.value)
                  setIlce('')
                }}
              >
                <option value="">{t('ortak.secin')}</option>
                {ILLER.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">İlçe</span>
              <select
                className="select"
                value={ilce}
                onChange={(e) => setIlce(e.target.value)}
                disabled={!il}
              >
                <option value="">{il ? t('ortak.secin') : t('ortak.onceIl')}</option>
                {ilceleriGetir(il).map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
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
          </label>
          <button className="btn btn--primary btn--lg" onClick={kaydet}>
            {t('ortak.kaydet')}
          </button>
        </div>
      </Sheet>

      {/* Şifre değiştirme */}
      <Sheet
        open={sifrePenceresi}
        onClose={() => setSifrePenceresi(false)}
        title={t('sifre.degistirBaslik')}
      >
        <div className="stack" style={{ gap: 14 }}>
          {user?.sifre ? (
            <SifreAlani deger={eskiSifre} onDegis={setEskiSifre} etiket={t('sifre.mevcut')} />
          ) : (
            <p className="muted" style={{ lineHeight: 1.6 }}>
              {t('sifre.sifreYok')}
            </p>
          )}
          <SifreAlani
            deger={yeniSifre}
            onDegis={setYeniSifre}
            etiket={t('sifre.yeniSifre', { n: SIFRE_HANE })}
            autoComplete="new-password"
          />
          <SifreAlani
            deger={yeniSifre2}
            onDegis={setYeniSifre2}
            etiket={t('sifre.yeniSifreTekrar')}
            autoComplete="new-password"
          />

          {sifreHata && <div className="field__error">{sifreHata}</div>}

          <button className="btn btn--primary btn--lg" onClick={sifreKaydet}>
            {t('ortak.kaydet')}
          </button>
          <button className="btn btn--soft" onClick={() => setSifrePenceresi(false)}>
            {t('ortak.vazgec')}
          </button>
        </div>
      </Sheet>

      {/* Çıkış — oturumu kapatır, kayıtları silmez.
          Silme ayrı ve açıkça uyarılmış bir işlem. */}
      <Sheet open={cikis} onClose={() => setCikis(false)} title={t('profil.cikisSor')}>
        <div className="stack" style={{ gap: 14 }}>
          <p style={{ lineHeight: 1.65 }}>
            {t('profil.cikisAciklama')}
          </p>

          <button
            className="btn btn--primary btn--lg"
            onClick={() => {
              logout()
              nav('/', { replace: true })
            }}
          >
            {t('profil.cikis')}
          </button>
          <button className="btn btn--soft" onClick={() => setCikis(false)}>
            {t('ortak.vazgec')}
          </button>

          {/* Hesap silme uygulamadan yapılmaz: işlem PAKSAN yetkilisince
              yürütülür. Kullanıcıya nasıl talep edeceği söyleniyor. */}
          <p className="small muted" style={{ lineHeight: 1.6, marginTop: 4 }}>
            {t('profil.hesapSilme', { eposta: SIRKET.eposta })}
          </p>
        </div>
      </Sheet>

      {/* Geri bildirim.

          Sunucu yokken telefonun içinde biriktiriliyor; sunucu açılınca
          bu kayıtlar oraya gönderilecek (bkz. PRODA-CIKIS.md → A1e).
          Gönderme durumu talep formundakiyle aynı: düğme yanıt gelene
          kadar "Gönderiliyor" yazıyor. */}
      <Sheet
        open={geriBildirim}
        onClose={() => { setGeriBildirim(false); setYorumHata('') }}
        title={t('profil.geriBildirim')}
      >
        <div className="stack" style={{ gap: 14 }}>
          <p className="muted" style={{ lineHeight: 1.6 }}>{t('profil.geriBildirimAlt')}</p>
          <textarea
            className="textarea"
            value={yorum}
            onChange={(e) => setYorum(e.target.value)}
            placeholder={t('profil.geriBildirimOrnek')}
            rows={5}
            maxLength={1000}
          />
          {yorumHata && <div className="field__error">{yorumHata}</div>}
          <GonderButonu
            gonderiliyor={yorumGonderiliyor}
            etiket={t('profil.geriBildirimGonder')}
            gonderiliyorEtiket={t('ortak.gonderiliyor')}
            onClick={yorumGonder}
          />
          <button
            className="btn btn--soft"
            onClick={() => { setGeriBildirim(false); setYorumHata('') }}
          >
            {t('ortak.vazgec')}
          </button>
        </div>
      </Sheet>

      {/* Talep silme */}
      <Sheet
        open={Boolean(silinecek)}
        onClose={() => setSilinecek(null)}
        title={t('profil.talepSilSor')}
      >
        {silinecek && (
          <div className="stack" style={{ gap: 14 }}>
            <p style={{ lineHeight: 1.65 }}>
              {t('profil.talepSilAciklama', {
                no: silinecek.no,
                tur: t(`talep.${silinecek.tur}.baslik`).toLocaleLowerCase(),
              })}
            </p>
            <button
              className="btn btn--lg"
              style={{ background: 'var(--pk-red)', color: '#fff' }}
              onClick={() => {
                removeRequest(silinecek.id)
                setSilinecek(null)
                showToast(t('profil.talepSilindi'))
              }}
            >
              {t('profil.evetSil')}
            </button>
            <button className="btn btn--soft" onClick={() => setSilinecek(null)}>
              {t('ortak.vazgec')}
            </button>
          </div>
        )}
      </Sheet>

      {/* KVKK metinleri — kayıt sırasında onaylananların aynısı */}
      <Sheet open={Boolean(kvkk)} onClose={() => setKvkk(null)} title={kvkk?.baslik}>
        <div className="pill-list" style={{ padding: '0 0 16px' }}>
          {metinListesi(dil).map((m) => (
            <button
              key={m.id}
              className={'pill' + (kvkk?.id === m.id ? ' pill--on' : '')}
              onClick={() => setKvkk(m)}
            >
              {m.kisaAd}
            </button>
          ))}
        </div>

        {/* Kampanya izni YALNIZCA kendi sekmesinde.

            Önce üç sekmenin de üstünde duruyordu; Aydınlatma Metni'ni
            okuyan kullanıcıya kampanya izni sorulmuş gibi görünüyor,
            hangi metnin neyi onayladığı karışıyordu. İzin, sözü veren
            metnin yanında duruyor. */}
        {kvkk?.id === TICARI_ILETI.id && (
          <div style={{ marginBottom: 20 }}>
            <OnayKutusu
              cumle={metinDilde(TICARI_ILETI, dil).onayCumlesi}
              deger={Boolean(user?.onaylar?.kampanya)}
              onDegis={(v) => {
                updateUser({ onaylar: { ...user.onaylar, kampanya: v } })
                showToast(
                  v ? t('profil.kampanyaAcik') : t('profil.kampanyaKapali')
                )
              }}
            />
          </div>
        )}

        {kvkk && <Metin metin={kvkk} />}

        {user?.onaylar?.tarih && (
          <p className="small muted" style={{ marginTop: 16, lineHeight: 1.6 }}>
            {t('profil.onayTarihi', {
              tarih: new Date(user.onaylar.tarih).toLocaleDateString(
                dil === 'tr' ? 'tr-TR' : 'en-GB',
                { day: 'numeric', month: 'long', year: 'numeric' }
              ),
              surum: user.onaylar.surum,
            })}
          </p>
        )}

        <button className="btn btn--primary" style={{ marginTop: 18 }} onClick={() => setKvkk(null)}>
          {t('ortak.kapat')}
        </button>
      </Sheet>

      <TabBar />
    </div>
  )
}
