import { useEffect, useMemo, useState } from 'react'
import {
  bayiGirisi,
  bayiOturumuGetir,
  bayiOturumuKapat,
  bayiSifresiniDegistir,
  bayiSifreTalebiAc,
  bayininTalepleri,
  destekTalepEt,
  gecikmisMi,
  talepleriGetir,
  BACKOFFICE_SIFRE_HANE,
} from '../backoffice/veri'
import { gecenSure } from '../backoffice/ekranlar/ortak'
import { TemaSecici } from '../backoffice/Tema'
import { load, save } from '../lib/storage'
import { duyuruGecerliMi } from '../lib/duyuruHedef'
import { Kabuk, Bolum, Bos } from './Kabuk'
import {
  IconWrench,
  IconParca,
  IconPlus,
  IconUser,
  IconBell,
  IconPhone,
  IconShield,
} from '../components/Icons'
import { PaksanLogo } from '../components/Marka'
import { TalepDetay } from './ekranlar/TalepDetay'
import { Stok } from './ekranlar/Stok'
import { ElleKayit } from './ekranlar/ElleKayit'

/* ==========================================================================
   PAKSAN Bayi

   NEDEN BACKOFFICE GİBİ DEĞİL

   Bayiler PAKSAN personeli değil. Talep durumlarını takip etmiyorlar,
   statülerle ilgilenmiyorlar, günleri bunu yapmakla geçmiyor. Backoffice
   ekranlarını bayiye vermek, kullanılmayan bir panel üretirdi.

   Bu yüzden panelde DURUM ADI HİÇ GEÇMİYOR. Bayi "incelemede" ya da
   "planlandı" diye bir şey görmüyor; yaptığı işi anlatan düğmelere
   basıyor, durum arka planda mevcut modelle ilerliyor. Böylece
   raporlar, müşteri bildirimleri ve Excel çıktısı tek satır
   değişmeden çalışmaya devam ediyor.

   DÖRT SEKME

   Bayinin işi dört başlıkta topluyor: bekleyen işleri, elindeki stok,
   dükkâna gelen müşteri için yeni kayıt, bir de kendi hesabı. Dördü de
   alt çubuktan tek dokunuşla açılıyor; ekranlar birbirinin üstünü
   kapatmıyor. Kabuk `Kabuk.jsx` içinde, gerekçesiyle yazılı.

   ÇIKIŞ ARTIK HESAP SEKMESİNDE. Önce günlük işlerle aynı satırda,
   aynı boyda duruyordu; günde yirmi kez basılan düğmelerin yanında
   ayda bir basılan bir düğme yanlışlıkla basılmayı bekliyor demektir.

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
  return <Uygulama oturum={oturum} onCikis={() => setOturum(null)} />
}

/* ------------------------------------------------------------------ Giriş */

function Giris({ onGiris }) {
  const [kullanici, setKullanici] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [yardim, setYardim] = useState(false)

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
        <PaksanLogo height={26} style={{ marginBottom: 14 }} />
        <div className="giris__baslik">Bayi Girişi</div>
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
        {yardim && (
          <div className="not not--mavi" style={{ marginTop: 0 }}>
            <IconShield size={19} />
            <div>
              <strong>PAKSAN sizi arayacak</strong>
              <p>
                Talebiniz iletildi. PAKSAN yetkilisi size geçici bir şifre
                verecek; o şifreyle girdiğinizde kendi şifrenizi
                belirleyeceksiniz.
              </p>
            </div>
          </div>
        )}

        <button className="dg dg--ana dg--blok" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Kontrol ediliyor…' : 'Gir'}
        </button>

        {/* ŞİFREMİ UNUTTUM E-POSTA GÖNDERMİYOR.

            Personelin sıfırlaması e-postayla çalışıyor; bayide e-posta
            yok, iletişim telefonla yürüyor. Kendi kendine sıfırlayan bir
            akış, kullanıcı adını bilen herkese hesabı açardı. Bayi talep
            bırakıyor, PAKSAN arıyor. */}
        <button
          type="button"
          className="giris__yardim"
          onClick={() => {
            bayiSifreTalebiAc(kullanici)
            setHata('')
            setYardim(true)
          }}
        >
          Şifremi unuttum
        </button>

        <p className="giris__dip">
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
        <PaksanLogo height={26} style={{ marginBottom: 14 }} />
        <div className="giris__baslik">Şifrenizi Belirleyin</div>
        <div className="giris__cizgi" />
        <p className="kucuk sonuk" style={{ marginTop: 0 }}>
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
        <button className="dg dg--ana dg--blok" type="submit">Kaydet</button>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------- Uygulama */

const KAPALI = ['kapandi', 'iptal']

function Uygulama({ oturum, onCikis }) {
  const [sekme, setSekme] = useState('isler')
  const [acik, setAcik] = useState(null)
  const [tazele, setTazele] = useState(0)
  const [talepler, setTalepler] = useState([])

  useEffect(() => {
    setTalepler(bayininTalepleri(talepleriGetir(), oturum.bayiId))
  }, [oturum.bayiId, tazele])

  const [bekleyen, biten] = useMemo(
    () => [
      talepler.filter((t) => !KAPALI.includes(t.status)),
      talepler.filter((t) => KAPALI.includes(t.status)),
    ],
    [talepler],
  )

  /* Talep detayı sekmelerin üstüne tam ekran açılıyor. */
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

  const sekmeler = [
    { id: 'isler', ad: 'İşlerim', Icon: IconWrench, rozet: bekleyen.length },
    { id: 'stok', ad: 'Stoğum', Icon: IconParca },
    { id: 'kayit', ad: 'Yeni Kayıt', Icon: IconPlus },
    { id: 'hesap', ad: 'Hesap', Icon: IconUser },
  ]

  const BASLIK = {
    isler: { baslik: 'İşlerim', alt: oturum.ad },
    stok: { baslik: 'Stoğum', alt: 'Eldeki mal ve PAKSAN siparişleri' },
    kayit: { baslik: 'Yeni Kayıt', alt: 'Size gelen bir müşteri için talep açın' },
    hesap: { baslik: 'Hesap', alt: oturum.no + ' · ' + oturum.il },
  }

  return (
    <Kabuk
      {...BASLIK[sekme]}
      sekmeler={sekmeler}
      sekme={sekme}
      onSekme={setSekme}
    >
      {sekme === 'isler' && (
        <Isler
          oturum={oturum}
          bekleyen={bekleyen}
          biten={biten}
          onAc={setAcik}
        />
      )}
      {sekme === 'stok' && <Stok oturum={oturum} />}
      {sekme === 'kayit' && (
        <ElleKayit
          oturum={oturum}
          onKaydedildi={() => {
            setSekme('isler')
            setTazele((x) => x + 1)
          }}
        />
      )}
      {sekme === 'hesap' && <Hesap oturum={oturum} onCikis={onCikis} />}
    </Kabuk>
  )
}

/* ---------------------------------------------------------------- İşler */

function Isler({ oturum, bekleyen, biten, onAc }) {
  const geciken = bekleyen.filter(gecikmisMi).length

  return (
    <>
      {/* Günün durumu listenin ÜSTÜNDE.

          Bayi uygulamayı açtığında ilk sorusu "bugün ne var" oluyor;
          cevabı kartları sayarak bulmak zorundaydı. Geciken iş varsa
          ayrıca yazılıyor: listede kırmızı şeritle de görünüyor ama
          o şerit ancak o karta bakınca fark ediliyor. */}
      {bekleyen.length > 0 && (
        <div className={'ozet' + (geciken ? ' ozet--gec' : '')}>
          <div className="ozet__sayi">{bekleyen.length}</div>
          <div>
            <strong>iş sizi bekliyor</strong>
            {/* Sayı yazılmıyor: Codex tekil/çoğul kalıbı yerine bunu
                verdi ve kaç tane olduğu zaten listede kırmızı şeritli
                kartlardan görülüyor. */}
            {geciken > 0 && <p>48 saati aşan işlere önce bakın.</p>}
          </div>
        </div>
      )}

      <BayiDuyurulari oturum={oturum} />

      {bekleyen.length === 0 && biten.length === 0 && (
        <Bos
          Icon={IconWrench}
          baslik="Şu an size düşen iş yok"
          alt="Bölgenizden bir talep geldiğinde burada görünecek."
        />
      )}

      {bekleyen.length > 0 && (
        <Bolum ad="Bekleyen" sayi={bekleyen.length}>
          {bekleyen.map((t) => (
            <TalepKarti key={t.id} talep={t} onAc={() => onAc(t)} />
          ))}
        </Bolum>
      )}

      {biten.length > 0 && (
        <Bolum ad="Tamamlanan" sayi={biten.length}>
          {biten.map((t) => (
            <TalepKarti key={t.id} talep={t} onAc={() => onAc(t)} />
          ))}
        </Bolum>
      )}
    </>
  )
}

const TUR_ADI = { servis: 'Servis', parca: 'Yedek Parça', satinalma: 'Fiyat Teklifi' }

/* ARAMA DÜĞMESİ KARTIN ÜSTÜNDE.

   Bayinin bu listede yaptığı ilk iş müşteriyi aramak: nerede olduğunu,
   makinenin ne yaptığını telefonda soruyor. Numara eskiden kartın alt
   satırında düz yazıydı; bayi ezberleyip tuşluyordu.

   Yol tarifi düğmesi EKLENMEDİ. Talepte koordinat yok, yalnız il ve
   ilçe var (bkz. KonumAlani.jsx); düğme bayiyi ilçe merkezine
   götürürdü, tarlaya değil. Adresi telefonda öğreniyor.

   Kart iç içe düğme DEĞİL: soldaki alan detayı açıyor, sağdaki bağlantı
   arıyor. İkisi kardeş — `<button>` içine `<button>` geçerli değil. */
function TalepKarti({ talep, onAc }) {
  const paksanda = (talep.sahip || 'paksan') === 'paksan'
  const gecikti = gecikmisMi(talep)
  const tel = String(talep.tel || '').replace(/\D/g, '')

  return (
    <div className={'is' + (gecikti ? ' is--gec' : '')}>
      <button className="is__ac" onClick={onAc}>
        <div className="is__ust">
          <span className={'tur tur--' + talep.tur}>
            {TUR_ADI[talep.tur] || talep.tur}
          </span>
          <span className="is__zaman">{gecenSure(talep.createdAt || talep.tarih)}</span>
        </div>

        <div className="is__ad">{talep.ad || '—'}</div>

        <div className="is__alt">
          {talep.ilce ? `${talep.ilce} / ${talep.il}` : talep.il || '—'}
          <span className="is__no mono"> · {talep.no}</span>
        </div>

        {/* İki uyarı da satır hâlinde altta: kartın üst kısmı her
            talepte aynı yerde dursun, göz alışsın. */}
        {/* Randevu listede de görünüyor: bayi hangi işe gün verdiğini
            karta girmeden biliyor. */}
        {talep.plan && (
          <div className="is__isaret is__isaret--plan">
            Randevu · {talep.plan.tarihYazi}
          </div>
        )}
        {gecikti && <div className="is__isaret is__isaret--gec">48 saati geçti</div>}
        {paksanda && talep.devir && (
          <div className="is__isaret">PAKSAN destek veriyor</div>
        )}
      </button>

      {tel && (
        <a
          className="is__ara"
          href={'tel:' + tel}
          aria-label={(talep.ad || 'Müşteriyi') + ' ara'}
        >
          <IconPhone size={21} />
        </a>
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
        <div key={d.id} className="duyuru">
          <div className="duyuru__ust">
            <IconBell size={17} />
            <strong>{d.baslik}</strong>
          </div>
          <p className="duyuru__metin">{d.metin}</p>
          <button className="dg dg--kucuk" onClick={() => kapat(d.id)}>
            Anladım
          </button>
        </div>
      ))}
    </>
  )
}

const GORULEN = 'gorulenDuyurularBayi'

/* ---------------------------------------------------------------- Hesap */

function Hesap({ oturum, onCikis }) {
  return (
    <>
      <div className="kimlik">
        <div className="kimlik__harf">{(oturum.ad || '?').charAt(0)}</div>
        <div>
          <div className="kimlik__ad">{oturum.ad}</div>
          <div className="kimlik__alt mono">{oturum.no}</div>
          <div className="kimlik__alt">{oturum.il}</div>
        </div>
      </div>

      <Bolum ad="Görünüm">
        <div className="kart" style={{ padding: 14 }}>
          <TemaSecici />
        </div>
      </Bolum>

      <Bolum ad="Güvenlik">
        <SifreDegistir oturum={oturum} />
      </Bolum>

      <Bolum ad="Oturum">
        <button
          className="dg dg--blok"
          onClick={() => {
            bayiOturumuKapat(oturum)
            onCikis()
          }}
        >
          Çıkış yap
        </button>
        <p className="kucuk sonuk" style={{ marginTop: 10 }}>
          Şifrenizi unutursanız PAKSAN yetkilinize başvurun.
        </p>
      </Bolum>
    </>
  )
}

/* Şifre değiştirme.

   Mevcut şifre SORULUYOR. Açık oturumun sahibi olmak yetmiyor: telefon
   birinin elinde kalmış olabilir ve bayi paneli müşteri bilgisi
   taşıyor. İlk giriş akışında sorulmuyor, sebebi veri.js'te yazılı. */
function SifreDegistir({ oturum }) {
  const [acik, setAcik] = useState(false)
  const [eski, setEski] = useState('')
  const [yeni, setYeni] = useState('')
  const [tekrar, setTekrar] = useState('')
  const [hata, setHata] = useState('')
  const [oldu, setOldu] = useState(false)

  const rakam = (v) => v.replace(/\D/g, '')

  async function kaydet() {
    if (yeni.length !== BACKOFFICE_SIFRE_HANE) {
      return setHata(`Yeni şifre ${BACKOFFICE_SIFRE_HANE} rakamdan oluşmalı.`)
    }
    if (yeni !== tekrar) return setHata('Yeni şifreler eşleşmiyor.')
    const sonuc = await bayiSifresiniDegistir(oturum.bayiId, yeni, eski)
    if (sonuc.hata) return setHata(sonuc.hata)
    setEski('')
    setYeni('')
    setTekrar('')
    setHata('')
    setOldu(true)
    setAcik(false)
  }

  if (!acik) {
    return (
      <>
        <button className="dg dg--blok" onClick={() => { setAcik(true); setOldu(false) }}>
          Şifremi değiştir
        </button>
        {oldu && (
          <p className="kucuk" style={{ marginTop: 10, color: 'var(--yesil)' }}>
            Şifreniz değiştirildi.
          </p>
        )}
      </>
    )
  }

  return (
    <div className="kart" style={{ padding: 16 }}>
      <label className="alan">
        <span className="alan__ad">Mevcut Şifre</span>
        <input
          className="gir gir--kod"
          type="password"
          inputMode="numeric"
          maxLength={BACKOFFICE_SIFRE_HANE}
          value={eski}
          onChange={(e) => setEski(rakam(e.target.value))}
          autoComplete="current-password"
        />
      </label>
      <label className="alan">
        <span className="alan__ad">Yeni Şifre</span>
        <input
          className="gir gir--kod"
          type="password"
          inputMode="numeric"
          maxLength={BACKOFFICE_SIFRE_HANE}
          value={yeni}
          onChange={(e) => setYeni(rakam(e.target.value))}
          autoComplete="new-password"
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
          onChange={(e) => setTekrar(rakam(e.target.value))}
          autoComplete="new-password"
        />
      </label>

      {hata && <div className="uyari">{hata}</div>}

      <button className="dg dg--ana dg--blok" onClick={kaydet}>Kaydet</button>
      <button
        className="dg dg--blok"
        style={{ marginTop: 8 }}
        onClick={() => { setAcik(false); setHata('') }}
      >
        Vazgeç
      </button>
    </div>
  )
}

