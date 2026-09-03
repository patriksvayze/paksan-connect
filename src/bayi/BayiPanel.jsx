import { useEffect, useState } from 'react'
import {
  bayiGirisi,
  bayiOturumuGetir,
  bayiOturumuKapat,
  bayiSifresiniDegistir,
  bayininTalepleri,
  destekTalepEt,
  talepleriGetir,
  BACKOFFICE_SIFRE_HANE,
} from '../backoffice/veri'
import { load, save } from '../lib/storage'
import { duyuruGecerliMi } from '../lib/duyuruHedef'
import { TalepDetay } from './ekranlar/TalepDetay'
import { Stok } from './ekranlar/Stok'
import { ElleKayit } from './ekranlar/ElleKayit'
import logo from '../assets/marka/paksan-logo.png'

/* ==========================================================================
   PAKSAN Bayi Paneli

   NEDEN BACKOFFICE GİBİ DEĞİL

   Bayiler PAKSAN personeli değil. Talep durumlarını takip etmiyorlar,
   statülerle ilgilenmiyorlar, günleri bunu yapmakla geçmiyor. Backoffice
   ekranlarını bayiye vermek, kullanılmayan bir panel üretirdi.

   Bu yüzden panelde DURUM ADI HİÇ GEÇMİYOR. Bayi "incelemede" ya da
   "planlandı" diye bir şey görmüyor; yaptığı işi anlatan düğmelere
   basıyor, durum arka planda mevcut modelle ilerliyor. Böylece
   raporlar, müşteri bildirimleri ve Excel çıktısı tek satır
   değişmeden çalışmaya devam ediyor.

   BUGÜNKÜ SINIR

   Veri tarayıcının kendi hafızasında. Bayi paneli ayrı bir cihazda
   açıldığında müşterinin telefonunda oluşan talebi göremiyor. Ekranlar
   ve veri düzeni hazır; sunucu bağlandığında yalnız veri katmanı
   değişecek, buraya dokunulmayacak.
   ========================================================================== */

export function BayiPanel() {
  const [oturum, setOturum] = useState(() => bayiOturumuGetir())

  if (!oturum) return <Giris onGiris={setOturum} />
  if (oturum.ilkGiris) {
    return (
      <IlkSifre
        oturum={oturum}
        onBitti={() => setOturum({ ...oturum, ilkGiris: false })}
      />
    )
  }
  return <Liste oturum={oturum} onCikis={() => setOturum(null)} />
}

/* ------------------------------------------------------------------ Giriş */

function Giris({ onGiris }) {
  const [kullanici, setKullanici] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState('')
  const [bekliyor, setBekliyor] = useState(false)

  async function gir(e) {
    e.preventDefault()
    if (bekliyor) return
    if (!kullanici.trim()) return setHata('Kullanıcı adınızı yazın.')
    if (sifre.length !== BACKOFFICE_SIFRE_HANE) {
      return setHata('Şifre 6 rakamdan oluşmalı.')
    }
    setHata('')
    setBekliyor(true)
    const sonuc = await bayiGirisi(kullanici, sifre)
    setBekliyor(false)
    if (sonuc.hata) return setHata(sonuc.hata)
    onGiris(sonuc.oturum)
  }

  return (
    <div className="giris">
      <form className="giris__kart" onSubmit={gir}>
        <img className="giris__logo" src={logo} alt="PAKSAN" />
        <div className="giris__baslik">Bayi Paneli</div>
        <div className="giris__cizgi" />

        <label className="alan">
          <span className="alan__ad">Kullanıcı Adı</span>
          <input
            className="gir"
            value={kullanici}
            onChange={(e) => setKullanici(e.target.value)}
            placeholder="bayi.adi"
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
            autoComplete="current-password"
          />
        </label>

        {hata && <div className="uyari">{hata}</div>}

        <button className="dg dg--ana" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Kontrol ediliyor…' : 'Gir'}
        </button>

        <p className="kucuk sonuk" style={{ textAlign: 'center', marginTop: 12 }}>
          PAKSAN Makina · Hesabınız yoksa PAKSAN yetkilinize başvurun.
        </p>
      </form>
    </div>
  )
}

/* İlk girişte şifre değiştirme.

   PAKSAN hesabı açarken geçici bir şifre belirliyor; o şifreyi hesabı
   açan personel de biliyor. Bayi kendi şifresini burada koyuyor. */
function IlkSifre({ oturum, onBitti }) {
  const [sifre, setSifre] = useState('')
  const [tekrar, setTekrar] = useState('')
  const [hata, setHata] = useState('')

  async function kaydet(e) {
    e.preventDefault()
    if (sifre.length !== BACKOFFICE_SIFRE_HANE) {
      return setHata('Şifre 6 rakamdan oluşmalı.')
    }
    if (sifre !== tekrar) return setHata('Şifreler eşleşmiyor.')
    const sonuc = await bayiSifresiniDegistir(oturum.bayiId, sifre)
    if (sonuc.hata) return setHata(sonuc.hata)
    onBitti()
  }

  return (
    <div className="giris">
      <form className="giris__kart" onSubmit={kaydet}>
        <img className="giris__logo" src={logo} alt="PAKSAN" />
        <div className="giris__baslik">Şifrenizi Belirleyin</div>
        <div className="giris__cizgi" />
        <p className="kucuk sonuk">
          Hesabınız PAKSAN tarafından açıldı. Kendi şifrenizi belirleyin;
          bundan sonra bu şifreyle gireceksiniz.
        </p>

        <label className="alan">
          <span className="alan__ad">Yeni Şifre</span>
          <input
            className="gir gir--kod"
            type="password"
            inputMode="numeric"
            maxLength={BACKOFFICE_SIFRE_HANE}
            value={sifre}
            onChange={(e) => setSifre(e.target.value.replace(/\D/g, ''))}
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
          />
        </label>

        {hata && <div className="uyari">{hata}</div>}
        <button className="dg dg--ana" type="submit">Kaydet</button>
      </form>
    </div>
  )
}

/* ---------------------------------------------------------------- Liste */

function Liste({ oturum, onCikis }) {
  const [talepler, setTalepler] = useState([])
  const [acik, setAcik] = useState(null)
  const [ekran, setEkran] = useState('liste')
  const [tazele, setTazele] = useState(0)

  useEffect(() => {
    setTalepler(bayininTalepleri(talepleriGetir(), oturum.bayiId))
  }, [oturum.bayiId, tazele])

  if (ekran === 'stok') {
    return <Stok oturum={oturum} onKapat={() => setEkran('liste')} />
  }

  if (ekran === 'elle') {
    return (
      <ElleKayit
        oturum={oturum}
        onKapat={() => setEkran('liste')}
        onKaydedildi={() => {
          setEkran('liste')
          setTazele((x) => x + 1)
        }}
      />
    )
  }

  if (acik) {
    return (
      <TalepDetay
        talep={acik}
        bayiAd={oturum.ad}
        bayiId={oturum.bayiId}
        onKapat={() => {
          setAcik(null)
          setTazele((x) => x + 1)
        }}
        onDestekIste={(neden) => {
          destekTalepEt(acik, neden, oturum.ad)
          setAcik(null)
          setTazele((x) => x + 1)
        }}
      />
    )
  }

  /* Açık talepler önce: bayinin bakması gereken iş bunlar. Kapanmışlar
     altta, geçmiş olarak duruyor. */
  const acikOlanlar = talepler.filter((t) => !['kapandi', 'iptal'].includes(t.status))
  const kapananlar = talepler.filter((t) => ['kapandi', 'iptal'].includes(t.status))

  return (
    <div className="bayi-govde">
      <div className="bayi-tepe">
        <img src={logo} alt="PAKSAN" style={{ height: 28 }} />
        <div>
          <div className="bayi-tepe__ad">{oturum.ad}</div>
          <div className="bayi-tepe__alt">{oturum.no} · {oturum.il}</div>
        </div>
        <div className="satir" style={{ marginLeft: 'auto', gap: 8 }}>
          <button className="dg" onClick={() => setEkran('elle')}>Elle kayıt</button>
          <button className="dg" onClick={() => setEkran('stok')}>Stoğum</button>
          <button
            className="dg"
            onClick={() => {
              bayiOturumuKapat(oturum)
              onCikis()
            }}
          >
            Çıkış
          </button>
        </div>
      </div>

      <BayiDuyurulari oturum={oturum} />

      {talepler.length === 0 && (
        <div className="kart" style={{ padding: 20 }}>
          <p style={{ margin: 0 }}>Şu an size düşen talep yok.</p>
          <p className="kucuk sonuk" style={{ marginBottom: 0 }}>
            Bölgenizden bir talep geldiğinde burada görünecek.
          </p>
        </div>
      )}

      {acikOlanlar.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, margin: '0 0 10px' }}>Bekleyen İşler</h2>
          {acikOlanlar.map((t) => (
            <TalepKarti key={t.id} talep={t} onAc={() => setAcik(t)} />
          ))}
        </>
      )}

      {kapananlar.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, margin: '20px 0 10px' }}>Tamamlananlar</h2>
          {kapananlar.map((t) => (
            <TalepKarti key={t.id} talep={t} onAc={() => setAcik(t)} />
          ))}
        </>
      )}
    </div>
  )
}

/* PAKSAN'ın bayilere yönelttiği duyurular.

   Ayrı bir bildirim listesi kurulmadı: aynı duyuru deposu okunuyor,
   kime gideceğine duyuruHedef.js karar veriyor. Bayiye ulaşması için
   duyurunun hedefinde "bayilere" ya da "ikisine de" seçilmiş olması
   gerekiyor; hedefsiz duyuru müşteriye gider, bayiye değil. */
function BayiDuyurulari({ oturum }) {
  const [liste, setListe] = useState([])

  useEffect(() => {
    const gorulen = new Set(load(GORULEN, []))
    setListe(
      load('duyurular', [])
        .filter((d) => duyuruGecerliMi(d, { bayi: oturum }))
        .filter((d) => !gorulen.has(d.id))
        .sort((a, b) => b.tarih - a.tarih),
    )
  }, [oturum])

  function kapat(id) {
    save(GORULEN, [...new Set([...load(GORULEN, []), id])])
    setListe((l) => l.filter((d) => d.id !== id))
  }

  if (!liste.length) return null

  return (
    <>
      {liste.map((d) => (
        <div key={d.id} className="bayi-devir" style={{ marginBottom: 10 }}>
          <div className="satir" style={{ alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <strong>{d.baslik}</strong>
              <div className="kucuk" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                {d.metin}
              </div>
            </div>
            <button className="dg" onClick={() => kapat(d.id)}>Anladım</button>
          </div>
        </div>
      ))}
    </>
  )
}

const GORULEN = 'gorulenDuyurularBayi'

const TUR_ADI = { servis: 'Servis', parca: 'Yedek Parça', satinalma: 'Fiyat Teklifi' }

function TalepKarti({ talep, onAc }) {
  const paksanda = (talep.sahip || 'paksan') === 'paksan'
  return (
    <button className="bayi-talep" onClick={onAc}>
      <div className="bayi-talep__ust">
        <span className={'tur tur--' + talep.tur}>{TUR_ADI[talep.tur] || talep.tur}</span>
        <span className="mono kucuk sonuk">{talep.no}</span>
        {paksanda && talep.devir && (
          <span className="kucuk sonuk">· PAKSAN destek veriyor</span>
        )}
      </div>
      <div className="bayi-talep__ad">{talep.ad || '—'}</div>
      <div className="bayi-talep__alt">
        {talep.ilce ? `${talep.ilce} / ${talep.il}` : talep.il || '—'}
        {talep.tel ? ` · ${talep.tel}` : ''}
      </div>
    </button>
  )
}
