import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import logo from '../assets/marka/paksan-logo.png'
import {
  izinli, oturumGetir, oturumKapat, backofficeGiris, personelBaslat, personelGetir,
  rolBilgi, rolunTalepleri, sifreJetonuGecerli, sifreJetonuKullan, sifreTalebiOlustur,
  talepleriGetir, geriBildirimGetir, numaraTalepleriGetir, teklifBekliyorMu,
  BACKOFFICE_SIFRE_HANE,
} from './veri'
import { bildirimGonder, izinDurumu, izinIste, sayiliBaslik } from './bildirim'
import { SIRKET } from '../config'
import { TemaSecici } from './Tema'
import {
  IconPano, IconTalep, IconUser, IconPin, IconMail, IconRapor,
  IconChat, IconBell, IconPhone, IconPersonel, IconKayit, IconMachine,
} from '../components/Icons'

import { Ozet } from './ekranlar/Ozet'
import { Duyurular } from './ekranlar/Duyurular'
import { DestekKayitlari } from './ekranlar/DestekKayitlari'
import { Raporlar } from './ekranlar/Raporlar'
import { Talepler } from './ekranlar/Talepler'
import { NumaraTalepleri } from './ekranlar/NumaraTalepleri'
import { Musteriler } from './ekranlar/Musteriler'
import { Personel } from './ekranlar/Personel'
import { GeriBildirimler } from './ekranlar/GeriBildirimler'
import { Bayiler } from './ekranlar/Bayiler'
import { Makineler } from './ekranlar/Makineler'
import { IslemKaydi } from './ekranlar/IslemKaydi'

/* PAKSAN Backoffice — uygulamanın arka ofisi.

   Hesaplar elle açılıyor; giren kişinin rolü hesabında yazılı. Servis,
   yedek parça ve satış yalnız kendi taleplerini görüyor; yönetici
   hepsini görüyor; admin ayrıca personel açıyor, müşteri bilgisi
   düzeltiyor ve numara değişikliklerini onaylıyor.

   Menü ikiye ayrılıyor: üstte günlük iş, altta ayar işleri. */

/* Simgeler anlamca çakışmayacak şekilde seçildi:

     Müşteriler  kişi        · Personel  kimlik kartı
     Geri Bildirimler zarf   · Destek Kayıtları  konuşma balonu

   İkisi de "mesaj" ama farklı şeyler; aynı simgeyi paylaşsalar menüde
   ayırt edilemezlerdi. */
/* MENÜ TEK LİSTE.

   Önce ikiye bölünmüştü: üstte "günlük iş", altta "ayar işleri". Aradaki
   boşluk kategori olduğunu düşündürüyordu ama iki grubun sınırı
   kullanıcı için belli değildi — Raporlar neden ayar işi, Duyurular
   neden günlük iş değil? Ayrım açıklanmadıkça bilgi vermiyor, yalnızca
   menüyü kesiyordu.

   Şimdi bütün düğmeler eşit aralıklı tek listede. Sıra aynı: en sık
   açılanlar üstte.

   ROL KURALLARI DEĞİŞMEDİ. Her satırın `izin` alanı duruyor; kimin
   neyi göreceği yine rolüne göre süzülüyor (bkz. izinli()). */
const MENU = [
  { id: 'ozet', ad: 'Dashboard', Ikon: IconPano },
  { id: 'talepler', ad: 'Talepler', izin: 'talepler', sayac: 'talep', Ikon: IconTalep },
  { id: 'musteriler', ad: 'Müşteriler', izin: 'musteriler', Ikon: IconUser },
  { id: 'makineler', ad: 'Kayıtlı Makineler', izin: 'musteriler', Ikon: IconMachine },
  { id: 'bayiler', ad: 'Bayiler', izin: 'bayiler', Ikon: IconPin },
  {
    id: 'geribildirim', ad: 'Geri Bildirimler', izin: 'geribildirim',
    sayac: 'gorus', Ikon: IconMail,
  },
  { id: 'raporlar', ad: 'Raporlar', izin: 'raporlar', Ikon: IconRapor },
  { id: 'destek', ad: 'Destek Kayıtları', izin: 'destek', Ikon: IconChat },
  { id: 'duyurular', ad: 'Duyurular', izin: 'duyurular', Ikon: IconBell },
  {
    id: 'numara', ad: 'Numara Değişikliği Talepleri', izin: 'numara',
    sayac: 'numara', Ikon: IconPhone,
  },
  { id: 'personel', ad: 'Personel', izin: 'personel', Ikon: IconPersonel },
  { id: 'kayit', ad: 'İşlem Kaydı', izin: 'kayit', Ikon: IconKayit },
]

const ILK_EKRAN = 'ozet'

/* Yeni iş kontrolü. Sunucu geldiğinde bu aralık yerine sunucu haber
   verecek; şimdilik sekme açıkken düzenli bakılıyor. */
const KONTROL_ARALIK = 15000

export function Backoffice() {
  const [oturum, setOturum] = useState(() => oturumGetir())
  const [ekran, setEkran] = useState(ILK_EKRAN)
  const [tost, setTost] = useState(null)
  const [surum, setSurum] = useState(0)
  const [profil, setProfil] = useState(false)
  const [cikisOnayi, setCikisOnayi] = useState(false)
  /* Bir ekrandan ötekine süzgeç taşımak için: Dashboard'daki kutuya
     tıklayınca Talepler o süzgeçle açılıyor. */
  const [sorgu, setSorgu] = useState(null)

  /* Şifre değiştirme bağlantısıyla gelindiyse önce o ekran açılıyor. */
  const [jeton, setJeton] = useState(() => new URLSearchParams(location.search).get('sifre'))

  const tazele = useCallback(() => setSurum((s) => s + 1), [])

  const bildir = useCallback((metin) => {
    setTost(metin)
    setTimeout(() => setTost((t) => (t === metin ? null : t)), 2400)
  }, [])

  const sayaclar = useMemo(() => {
    void surum
    if (!oturum) return {}
    return {
      talep: rolunTalepleri(talepleriGetir(), oturum.rol).filter(
        (t) => (t.status || 'yeni') === 'yeni'
      ).length,
      gorus: geriBildirimGetir().filter((g) => !g.okundu).length,
      numara: numaraTalepleriGetir().filter((t) => t.durum === 'bekliyor').length,
    }
  }, [surum, oturum])

  useYeniIsHaberi(oturum, tazele)

  if (jeton) {
    return (
      <SifreDegistir
        jeton={jeton}
        onBitti={() => {
          history.replaceState(null, '', location.pathname)
          setJeton(null)
        }}
      />
    )
  }

  if (!oturum) {
    return (
      <Giris
        onGiris={(o) => {
          /* Her giriş Dashboard'dan başlıyor — önceki kullanıcının
             kaldığı ekranda açılmasın. */
          setEkran(ILK_EKRAN)
          setOturum(o)
        }}
      />
    )
  }

  /* git('talepler', { durum: 'gecikmis' }) → ekranı açıp süzgeci kuruyor */
  const git = (hedef, istek = null) => {
    setSorgu(istek)
    setEkran(hedef)
  }

  const ortak = { personel: oturum.ad, rol: oturum.rol, bildir, tazele, surum, git, sorgu }

  const menu = MENU.filter((m) => !m.izin || izinli(oturum.rol, m.izin))

  /* Yetkisi olmayan bir ekranda kalmasın (rol değişmiş olabilir) */
  const acik = menu.some((m) => m.id === ekran) ? ekran : ILK_EKRAN

  const dugme = (m) => (
    <button
      key={m.id}
      className={'yan__bag' + (acik === m.id ? ' yan__bag--on' : '')}
      onClick={() => git(m.id)}
    >
      {m.Ikon && (
        <span className="yan__ikon" aria-hidden="true">
          <m.Ikon size={18} />
        </span>
      )}
      <span className="yan__ad">{m.ad}</span>
      {m.sayac && sayaclar[m.sayac] > 0 && <span className="yan__sayi">{sayaclar[m.sayac]}</span>}
    </button>
  )

  return (
    <div className="duzen">
      <nav className="yan">
        <div className="yan__marka">
          <img src={logo} alt="PAKSAN" />
        </div>

        {menu.map(dugme)}

        <div className="yan__dip">
          <button className="yan__kisi" onClick={() => setProfil(true)}>
            <b>{oturum.ad}</b>
            <span className="yan__rol">{rolBilgi(oturum.rol).ad}</span>
          </button>
          <button className="yan__cikis" onClick={() => setCikisOnayi(true)}>
            Çıkış
          </button>
        </div>
      </nav>

      <main className="govde">
        <BildirimSeridi />

        {acik === 'ozet' && <Ozet {...ortak} />}
        {acik === 'talepler' && <Talepler {...ortak} />}
        {acik === 'raporlar' && <Raporlar {...ortak} />}
        {acik === 'destek' && <DestekKayitlari {...ortak} />}
        {acik === 'duyurular' && <Duyurular {...ortak} />}
        {acik === 'musteriler' && <Musteriler {...ortak} />}
        {acik === 'makineler' && <Makineler {...ortak} />}
        {acik === 'bayiler' && <Bayiler {...ortak} />}
        {acik === 'geribildirim' && <GeriBildirimler {...ortak} />}
        {acik === 'numara' && <NumaraTalepleri {...ortak} />}
        {acik === 'personel' && <Personel {...ortak} />}
        {acik === 'kayit' && <IslemKaydi {...ortak} />}
      </main>

      {profil && <Profil oturum={oturum} onKapat={() => setProfil(false)} />}

      {cikisOnayi && (
        <CikisOnayi
          oturum={oturum}
          onVazgec={() => setCikisOnayi(false)}
          onCik={() => {
            oturumKapat(oturum)
            setCikisOnayi(false)
            setEkran(ILK_EKRAN)
            setOturum(null)
          }}
        />
      )}

      {tost && <div className="tost">{tost}</div>}
    </div>
  )
}

/* ---------------------------------------------------------- Çıkış onayı

   Ortak bilgisayarda çalışılıyor ve menüdeki "Çıkış" düğmesi profil
   düğmesinin hemen altında. Yanlışlıkla basıldığında yarım kalmış bir
   talep kaydı gidiyordu; bu yüzden çıkış onay istiyor. */
function CikisOnayi({ oturum, onVazgec, onCik }) {
  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onVazgec()}>
      <div className="kart pencere__kart" style={{ maxWidth: 420 }}>
        <div className="kart__tepe">
          <h2>Çıkış Yapılsın mı?</h2>
        </div>
        <div className="kart__ic">
          <p style={{ margin: '0 0 6px', lineHeight: 1.6 }}>
            <b>{oturum.ad}</b> oturumu kapatılacak.
          </p>
          <p className="kucuk sonuk" style={{ margin: '0 0 18px', lineHeight: 1.6 }}>
            Kaydedilmemiş bilgiler varsa kaybolur.
          </p>
          <div className="satir">
            <button className="dg dg--ana" onClick={onCik} autoFocus>Çıkış yap</button>
            <button className="dg" onClick={onVazgec}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- Profil

   Sol alttaki ada tıklayınca açılıyor. Kişinin kendi bilgileri ve şifre
   değiştirme burada; şifre değiştirme giriş ekranındakiyle aynı yoldan
   gidiyor — bağlantı kişinin şirket e-postasına düşüyor. */
function Profil({ oturum, onKapat }) {
  const [sonuc, setSonuc] = useState(null)
  const [hata, setHata] = useState('')

  const kisi = personelGetir().find((p) => p.id === oturum.personelId) || {}

  function sifreDegistir() {
    const cevap = sifreTalebiOlustur(oturum.kullanici)
    if (cevap.hata) return setHata(cevap.hata)
    setHata('')
    setSonuc(cevap)
  }

  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart" style={{ maxWidth: 460 }}>
        <div className="kart__tepe">
          <div>
            <h2>{oturum.ad}</h2>
            <div className="kucuk sonuk">{rolBilgi(oturum.rol).ad}</div>
          </div>
          <button className="dg" style={{ marginLeft: 'auto' }} onClick={onKapat}>Kapat</button>
        </div>

        <div className="kart__ic">
        <ProfilSatir k="Personel numarası" v={kisi.no} mono />
          <ProfilSatir k="Kullanıcı Adı" v={oturum.kullanici} mono />
          <ProfilSatir k="E-posta" v={kisi.eposta} />
          <ProfilSatir k="Telefon" v={kisi.tel} mono />
          <ProfilSatir
            k="Bu Oturum"
            v={new Date(oturum.giris).toLocaleString('tr-TR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          />

          <div style={{ borderTop: '1px solid var(--cizgi)', margin: '16px 0 16px' }} />

          {/* Görünüm — bu bilgisayara özel. "Otomatik" işletim sisteminin
              ayarını izliyor ve varsayılan o. */}
          <div className="satir" style={{ gap: 10, alignItems: 'center' }}>
            <span className="kucuk sonuk" style={{ minWidth: 110 }}>Görünüm</span>
            <TemaSecici />
          </div>

          <div style={{ borderTop: '1px solid var(--cizgi)', margin: '16px 0 16px' }} />

          {sonuc ? (
            <>
              <p className="giris__yazi" style={{ margin: '0 0 14px' }}>
                Şifre değiştirme bağlantısı <b>{sonuc.eposta}</b> adresine gönderildi.
              </p>
              <div className="giris__deneme">
          <span>Sunucu bağlı değil. Bağlantı:</span>
                <a href={sonuc.baglanti}>Şifre değiştirme ekranı</a>
              </div>
            </>
          ) : (
            <>
              <p className="kucuk sonuk" style={{ margin: '0 0 12px' }}>
                Şifrenizi değiştirmek için e-posta adresinize bağlantı gönderilir.
              </p>
              {hata && <div className="uyari">{hata}</div>}
              <button className="dg dg--ana" onClick={sifreDegistir}>Şifre değiştir</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ProfilSatir({ k, v, mono }) {
  if (!v) return null
  return (
    <div className="satir" style={{ gap: 10, alignItems: 'baseline', marginBottom: 7 }}>
      <span className="kucuk sonuk" style={{ minWidth: 110 }}>{k}</span>
      <span className={mono ? 'mono' : undefined}>{v}</span>
    </div>
  )
}

/* ---------------------------------------------------------------- Bildirim */

function BildirimSeridi() {
  const [durum, setDurum] = useState(() => izinDurumu())

  if (durum === 'granted' || durum === 'yok') return null

  if (durum === 'denied') {
    return (
      <div className="serit">
        <span>
          Bildirimler kapalı. Açmak için adres çubuğundaki kilit simgesinden bu sayfaya
          bildirim izni verin.
        </span>
      </div>
    )
  }

  return (
    <div className="serit">
      <span>Yeni talep ve geri bildirimlerde haber almak ister misiniz?</span>
      <button className="dg dg--ana" onClick={async () => setDurum(await izinIste())}>
        Bildirimlere izin ver
      </button>
    </div>
  )
}

/* Yeni iş geldiğinde tarayıcı bildirimi gönderir.

   Sayılar oturum açılırken bir kez okunuyor; sonraki her kontrolde
   artan kadarı bildiriliyor. Böylece backoffice ilk açıldığında birikmiş
   işler için üst üste bildirim yağmıyor. */
function useYeniIsHaberi(oturum, tazele) {
  const onceki = useRef(null)

  useEffect(() => {
    if (!oturum) {
      onceki.current = null
      return
    }

    const oku = () => {
      const talepler = rolunTalepleri(talepleriGetir(), oturum.rol)
      return {
        talep: talepler.filter((t) => (t.status || 'yeni') === 'yeni').length,
        gorus: geriBildirimGetir().filter((g) => !g.okundu).length,
        /* Teklif verilmiş ama müşteri haftalardır dönmemiş talepler.
           Kimse yeni bir olay üretmediği için bunlar sessizce
           unutuluyordu; sayı arttığında satış ekibine haber gidiyor. */
        teklif: talepler.filter(teklifBekliyorMu).length,
      }
    }

    if (onceki.current === null) onceki.current = oku()

    const zamanlayici = setInterval(() => {
      const yeni = oku()
      const eski = onceki.current

      if (yeni.talep > eski.talep) {
        bildirimGonder(sayiliBaslik(yeni.talep - eski.talep, 'Talep'), 'talep')
      }
      if (yeni.gorus > eski.gorus) {
        bildirimGonder(sayiliBaslik(yeni.gorus - eski.gorus, 'Geri Bildirim'), 'gorus')
      }
      if (yeni.teklif > eski.teklif) {
        bildirimGonder(
          sayiliBaslik(yeni.teklif - eski.teklif, 'Cevap Beklenen Teklif'),
          'teklif'
        )
      }
      if (
        yeni.talep !== eski.talep ||
        yeni.gorus !== eski.gorus ||
        yeni.teklif !== eski.teklif
      ) {
        tazele()
      }

      onceki.current = yeni
    }, KONTROL_ARALIK)

    return () => clearInterval(zamanlayici)
  }, [oturum, tazele])
}

/* ------------------------------------------------------------------- Giriş */

function Giris({ onGiris }) {
  const [kullanici, setKullanici] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [unuttum, setUnuttum] = useState(false)

  useEffect(() => {
    personelBaslat()
  }, [])

  async function gir(e) {
    e.preventDefault()
    if (bekliyor) return
    if (!kullanici.trim()) return setHata('Kullanıcı adınızı yazın.')
    if (sifre.length !== BACKOFFICE_SIFRE_HANE) return setHata('Şifre 6 rakamdan oluşmalı.')

    setHata('')
    setBekliyor(true)
    const sonuc = await backofficeGiris(kullanici, sifre)
    setBekliyor(false)

    if (sonuc.hata) return setHata(sonuc.hata)
    onGiris(sonuc.oturum)
  }

  if (unuttum) return <SifreTalebi onKapat={() => setUnuttum(false)} />

  return (
    <div className="giris">
      <form className="giris__kart" onSubmit={gir}>
        <img className="giris__logo" src={logo} alt="PAKSAN" />
        <div className="giris__baslik">Backoffice</div>
        <div className="giris__cizgi" />

        <label className="alan">
          <span className="alan__ad">Kullanıcı Adı</span>
          <input
            className="gir"
            value={kullanici}
            onChange={(e) => setKullanici(e.target.value)}
            placeholder="isim.soyisim"
            autoComplete="username"
            autoFocus
          />
        </label>

        <label className="alan">
          <span className="alan__ad">Şifre</span>
          <input
            className="gir gir--kod"
            type="password"
            inputMode="numeric"
            maxLength={BACKOFFICE_SIFRE_HANE}
            value={sifre}
            onChange={(e) => setSifre(e.target.value.replace(/\D/g, ''))}
            placeholder="••••••"
            autoComplete="current-password"
          />
        </label>

        {hata && <div className="hata">{hata}</div>}

        <button className="dg dg--ana dg--lg" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Giriliyor…' : 'Gir'}
        </button>

        <button className="giris__bag" type="button" onClick={() => setUnuttum(true)}>
          Şifremi unuttum
        </button>

        <div className="giris__dip">
          {SIRKET.ad} · Hesabınız yoksa yöneticinize başvurun.
        </div>
      </form>
    </div>
  )
}

/* Şifre değiştirme bağlantısı isteme.

   Bağlantı kişinin kendi şirket e-postasına gidiyor; e-posta kutusuna
   erişebilen kişi hesabın sahibidir. */
function SifreTalebi({ onKapat }) {
  const [kullanici, setKullanici] = useState('')
  const [sonuc, setSonuc] = useState(null)
  const [hata, setHata] = useState('')

  function gonder(e) {
    e.preventDefault()
    const cevap = sifreTalebiOlustur(kullanici)
    if (cevap.hata) return setHata(cevap.hata)
    setHata('')
    setSonuc(cevap)
  }

  return (
    <div className="giris">
      <form className="giris__kart" onSubmit={gonder}>
        <img className="giris__logo" src={logo} alt="PAKSAN" />
        <div className="giris__baslik">Şifre Değiştirme</div>
        <div className="giris__cizgi" />

        {sonuc ? (
          <>
            <p className="giris__yazi">
              Bağlantı <b>{sonuc.eposta}</b> adresine gönderildi.
            </p>

            {/* Sunucu bağlanana kadar e-posta gerçekten gitmiyor;
                bağlantı denenebilsin diye burada duruyor. */}
            <div className="giris__deneme">
          <span>Sunucu bağlı değil. Bağlantı:</span>
              <a href={sonuc.baglanti}>Şifre değiştirme ekranı</a>
            </div>

            <button className="dg dg--ana dg--lg" type="button" onClick={onKapat}>
              Giriş ekranına dön
            </button>
          </>
        ) : (
          <>
            <p className="giris__yazi">
              Bağlantı şirket e-posta adresinize gönderilecek.
            </p>

            <label className="alan">
              <span className="alan__ad">Kullanıcı Adı</span>
              <input
                className="gir"
                value={kullanici}
                onChange={(e) => setKullanici(e.target.value)}
                placeholder="isim.soyisim"
                autoFocus
              />
            </label>

            {hata && <div className="hata">{hata}</div>}

            <button className="dg dg--ana dg--lg" type="submit">Gönder</button>
            <button className="giris__bag" type="button" onClick={onKapat}>Vazgeç</button>
          </>
        )}
      </form>
    </div>
  )
}

/* E-postadaki bağlantıyla açılan ekran. Eski şifre sorulmuyor; kimlik
   e-posta kutusuna erişimle doğrulanmış oluyor. */
function SifreDegistir({ jeton, onBitti }) {
  const kayit = sifreJetonuGecerli(jeton)
  const [yeni, setYeni] = useState('')
  const [tekrar, setTekrar] = useState('')
  const [hata, setHata] = useState('')
  const [bitti, setBitti] = useState(false)
  const [bekliyor, setBekliyor] = useState(false)

  async function kaydet(e) {
    e.preventDefault()
    if (bekliyor) return
    if (yeni.length !== BACKOFFICE_SIFRE_HANE) return setHata('Şifre 6 rakamdan oluşmalı.')
    if (yeni !== tekrar) return setHata('Şifreler eşleşmiyor.')

    setHata('')
    setBekliyor(true)
    const cevap = await sifreJetonuKullan(jeton, yeni)
    setBekliyor(false)
    if (cevap.hata) return setHata(cevap.hata)
    setBitti(true)
  }

  return (
    <div className="giris">
      <form className="giris__kart" onSubmit={kaydet}>
        <img className="giris__logo" src={logo} alt="PAKSAN" />
        <div className="giris__baslik">Şifre Değiştirme</div>
        <div className="giris__cizgi" />

        {!kayit ? (
          <>
            <p className="giris__yazi">Bağlantı geçersiz veya süresi dolmuş.</p>
            <button className="dg dg--ana dg--lg" type="button" onClick={onBitti}>
              Giriş ekranına dön
            </button>
          </>
        ) : bitti ? (
          <>
          <p className="giris__yazi">Şifreniz değiştirildi.</p>
            <button className="dg dg--ana dg--lg" type="button" onClick={onBitti}>
              Giriş yap
            </button>
          </>
        ) : (
          <>
          <p className="giris__yazi">{kayit.kullanici} · yeni şifre 6 rakamdan oluşmalı.</p>

            <label className="alan">
              <span className="alan__ad">Yeni Şifre</span>
              <input
                className="gir gir--kod"
                type="password"
                inputMode="numeric"
                maxLength={BACKOFFICE_SIFRE_HANE}
                value={yeni}
                onChange={(e) => setYeni(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                autoFocus
              />
            </label>

            <label className="alan">
              <span className="alan__ad">Yeni Şifre (tekrar)</span>
              <input
                className="gir gir--kod"
                type="password"
                inputMode="numeric"
                maxLength={BACKOFFICE_SIFRE_HANE}
                value={tekrar}
                onChange={(e) => setTekrar(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
              />
            </label>

            {hata && <div className="hata">{hata}</div>}

            <button className="dg dg--ana dg--lg" type="submit" disabled={bekliyor}>
              {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
