import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { TopBar, TabBar, Sheet } from '../components/Chrome'
import { ILLER, ilceleriGetir } from '../data/iller'
import { telKullanici } from '../lib/tel'
import { adTemizle } from '../lib/ad'
import { geriBildirimGonder } from '../lib/geriBildirim'
import { GonderButonu } from '../components/GonderButonu'
import { sifreyiDegistir, sifreGecerliMi, sifreDogruMu, SIFRE_HANE } from '../lib/hesap'
import { SifreAlani } from '../components/SifreAlani'
import { DilSecici } from '../components/DilSecici'
import { TemaSecici } from '../components/TemaSecici'
import { useDil } from '../i18n'
import { SIRKET, SURUM, UYGULAMA } from '../marka'
import {
  IconUser, IconBaler, IconMachine, IconWrench, IconRight, IconPin,
  IconGorunum, IconLock, IconPhone, IconGlobe, IconMail, IconShield,
} from '../components/Icons'

/* TALEP LİSTESİ BURADA DEĞİL (25 Eylül 2026, kullanıcı sınaması).
   Hesap kartının altında duruyordu; ana ekrandaki "Aktif taleplerim"
   sayacı Profil'e gidip listeye kaydırıyor, başlıkta "Profil" yazıyordu.
   Liste kendi ekranında: screens/Taleplerim.jsx. Buradaki "Talep"
   sayacı oraya götürüyor. */

export default function Profile() {
  const nav = useNavigate()
  const { t, dil } = useDil()
  const { user, machines, requests, updateUser, logout, showToast } = useApp()
  const [duzenle, setDuzenle] = useState(false)
  const [cikis, setCikis] = useState(false)
  const [geriBildirim, setGeriBildirim] = useState(false)
  const [yorum, setYorum] = useState('')
  const [yorumHata, setYorumHata] = useState('')
  const [yorumGonderiliyor, setYorumGonderiliyor] = useState(false)
  /* Kısa yazıda uyarı çıkınca imleç kutuya dönüyor (aşağıda yorumGonder). */
  const yorumKutusu = useRef(null)
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
    /* Kısa yazı kaydedilmiyor (veritabanı da 5-1000 karakter istiyor).
       Uyarı görünür bir kutuda ve imleç kutuya dönüyor (25 Eylül 2026,
       kullanıcı sınaması): tek satırlık küçük kırmızı yazı gözden
       kaçıyordu, ikinci basışta ekranda hiçbir şey değişmiyordu. */
    if (yorum.trim().length < 5) {
      yorumKutusu.current?.focus()
      return setYorumHata(t('profil.geriBildirimKisa'))
    }
    setYorumHata('')
    setYorumGonderiliyor(true)
    try {
      await geriBildirimGonder({
        metin: yorum.trim(),
        dil,
        surum: SURUM,
        tel: user?.tel || '',
        ad: user?.ad || '',
        /* Hesabın kimliği ve numaranın ülkesi (25 Eylül 2026, kullanıcı
           sınaması Y3): görüşe verilen cevap numara değişse de doğru
           hesaba gidiyor (backoffice/veri.js → bildirimAlicisi önce
           musteriId'ye bakıyor) ve numara doğru ülke koduyla görünüyor
           (lib/tel.js → kayitTelGoster). */
        musteriId: user?.id || null,
        telUlke: user?.ulke || '',
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
          <button className="btn btn--soft" style={{ marginTop: 14 }} data-eylem="bilgi-duzenle" onClick={() => setDuzenle(true)}>
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
            {/* Balya makinesi yatay bir çizim; komşu kutudaki anahtarla aynı
                ağırlıkta görünsün diye biraz büyük (bkz. Icons.jsx → IconBaler). */}
            <div className="ozet__ikon" style={{ color: 'var(--pk-blue-yazi)' }}><IconBaler size={30} /></div>
            <div style={{ fontWeight: 700, fontSize: 24, marginTop: 6 }}>{machines.length}</div>
            <div className="small muted">{t('profil.kayitliMakine')}</div>
          </button>
          {/* Komşusu gibi dokunulabilir (25 Eylül 2026, kullanıcı
              sınaması): düz bir kutuydu, sayı 0 da olsa 5 de olsa
              dokunmak bir şey yapmıyordu. Talepler kendi ekranında. */}
          <button className="card card--tap center" onClick={() => nav('/taleplerim')}>
            <div className="ozet__ikon" style={{ color: 'var(--pk-orange-ink)' }}><IconWrench size={26} /></div>
            <div style={{ fontWeight: 700, fontSize: 24, marginTop: 6 }}>{requests.length}</div>
            <div className="small muted">{t('profil.talep')}</div>
          </button>
        </div>

        {/* Menü ikiye ayrıldı.

            Beş satır arka arkaya dizilince hangisinin ne olduğu
            karışıyordu: dil ayarıyla bayi telefonu aynı yığında
            duruyordu. Artık iki öbek var — "Hesabım" kendi hesabına
            dair işler, "Yardım" dışarıya bakanlar. Özet kutularından
            bir çizgiyle ayrıldı. */}
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

          {/* Görünüm — açık/koyu. Uygulama seçim yapılmamışken açık temada
              açılıyor; telefonun ayarı izlenmiyor (components/TemaSecici.jsx).
              Altındaki "Seçmezseniz telefonunuzun ayarı geçerli olur" satırı
              bu yüzden yanlıştı ve kaldırıldı (29 Eylül 2026, görünüm önerisi
              C8). */}
          <div className="listitem listitem--sarmal">
            <div className="listitem__icon"><IconGorunum size={22} /></div>
            <div className="listitem__body">
              <div className="listitem__title">{t('tema.baslik')}</div>
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

          {/* GİZLİLİK VE İZİNLER GÖRÜNÜR SATIR (29 Eylül 2026, kullanıcının
              isteği: "KVKK, Açık Rıza Metni ve İzinler kısmı gözden
              geçirilecek"). Önce yalnız sayfanın dibindeki küçük
              bağlantıdan açılıyordu; kampanya iznini kapatmak, başvuru
              ve hesap kapatma yolu aranınca bulunmuyordu. Sayfa
              screens/Gizlilik.jsx; dipteki bağlantı da oraya gidiyor. */}
          <button className="listitem" data-eylem="gizlilik" onClick={() => nav('/gizlilik')}>
            <div className="listitem__icon"><IconShield size={22} /></div>
            <div className="listitem__body">
              <div className="listitem__title">{t('profil.gizlilik')}</div>
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
          <button
            className="listitem"
            data-eylem="geri-bildirim"
            onClick={() => setGeriBildirim(true)}
          >
            <div className="listitem__icon"><IconMail size={22} /></div>
            <div className="listitem__body">
              <div className="listitem__title">{t('profil.geriBildirim')}</div>
            </div>
            <IconRight size={20} />
          </button>
        </div>

        {/* Renk --pk-red değil --pk-red-yazi: ana kırmızı karanlık temada
            koyu kart üstünde 3,17 kontrastta kalıyordu, yazı hâli 4,64. */}
        <button
          className="btn btn--soft"
          style={{ marginTop: 22, color: 'var(--pk-red-yazi)' }}
          onClick={() => setCikis(true)}
        >
          {t('profil.cikis')}
        </button>

        {/* Sayfanın dibi: yalnız uygulama adı ve sürüm. KVKK bağlantısı
            29 Eylül 2026'da kalktı (kullanıcının isteği): aynı sayfayı
            yukarıdaki "Gizlilik ve İzinler" satırı açıyor. */}
        <p className="small muted center" style={{ marginTop: 22, lineHeight: 1.7 }}>
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
                color: 'var(--pk-blue-yazi)',
                textDecoration: 'underline',
                /* Dokunma alanı yazı yüksekliği kadardı (20 piksel);
                   dolgu ile 44'e çıkıyor, negatif dış boşluk yerleşimi
                   olduğu gibi bırakıyor. */
                marginTop: 10,
                padding: '12px 6px',
                margin: '10px -6px 0',
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
              <span className="field__label">{t('ortak.il')}</span>
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
              <span className="field__label">{t('ortak.ilce')}</span>
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
            ref={yorumKutusu}
            className="textarea"
            value={yorum}
            onChange={(e) => {
              setYorum(e.target.value)
              /* Yazmaya başlayınca uyarı kalkıyor. */
              if (yorumHata) setYorumHata('')
            }}
            placeholder={t('profil.geriBildirimOrnek')}
            rows={5}
            maxLength={1000}
          />
          {/* Talep detayındaki ekleme penceresiyle aynı uyarı kartı. */}
          {yorumHata && <div className="uyari-kart" role="alert">{yorumHata}</div>}
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

      <TabBar />
    </div>
  )
}
