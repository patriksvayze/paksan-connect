import { useEffect, useMemo, useState } from 'react'
import {
  servisGirisi,
  servisOturumuGetir,
  servisOturumuKapat,
  servisSifresiniDegistir,
  servisSifreTalebiAc,
  servisinTalepleri,
  destekTalepEt,
  gecikmisMi,
  talepleriGetir,
  BACKOFFICE_SIFRE_HANE,
} from '../backoffice/veri'
import { gecenSure } from '../backoffice/ekranlar/ortak'
import { TemaSecici } from '../backoffice/Tema'
import { load, save } from '../lib/storage'
import { duyuruGecerliMi } from '../lib/duyuruHedef'
import { Kabuk, Sayfa, Bolum, Bos, ListeKarti } from './Kabuk'
import { DEMO_HESAP, demoAPKmi } from './demoKimlik'
import {
  IconWrench,
  IconParca,
  IconPlus,
  IconBell,
  IconCalendar,
  IconPhone,
  IconShield,
  IconMachine,
  IconTag,
  IconAlert,
  IconUndo,
} from '../components/Icons'
import { altBilgi } from '../data/duyuruTurleri'
import { Logo, MARKA, SIRKET } from '../marka'
/* Çizimler Higgsfield ile üretildi, uygulamanın kendi görsel diline
   (kalın lacivert kontur, düz dolgu, sınırlı palet) referans verilerek.
   Küçültme ve sıkıştırma: tools/gorsel-hazirla.mjs */
import bosIsGorseli from '../assets/gorseller/servis-bos-is.png'
import girisGorseli from '../assets/gorseller/servis-giris.png'
import { TalepDetay } from './ekranlar/TalepDetay'
import { Stok } from './ekranlar/Stok'
import { ElleKayit } from './ekranlar/ElleKayit'
import { Urunler, UrunDetay } from './ekranlar/Urunler'

/* ==========================================================================
   PAKSAN Servis

   NEDEN BACKOFFICE GİBİ DEĞİL

   Servisler PAKSAN personeli değil. Talep durumlarını takip etmiyorlar,
   statülerle ilgilenmiyorlar, günleri bunu yapmakla geçmiyor. Backoffice
   ekranlarını servise vermek, kullanılmayan bir panel üretirdi.

   Bu yüzden panelde DURUM ADI HİÇ GEÇMİYOR. Servis "incelemede" ya da
   "planlandı" diye bir şey görmüyor; yaptığı işi anlatan düğmelere
   basıyor, durum arka planda mevcut modelle ilerliyor. Böylece
   raporlar, müşteri bildirimleri ve Excel çıktısı tek satır
   değişmeden çalışmaya devam ediyor.

   DÖRT SEKME

   Servisin işi dört başlıkta toplanıyor: bekleyen işleri, elindeki stok,
   dükkâna gelen müşteri için yeni kayıt, bir de kendi hesabı. Dördü de
   alt çubuktan tek dokunuşla açılıyor; ekranlar birbirinin üstünü
   kapatmıyor. Kabuk `Kabuk.jsx` içinde, gerekçesiyle yazılı.

   ÇIKIŞ ARTIK HESAP SEKMESİNDE. Önce günlük işlerle aynı satırda,
   aynı boyda duruyordu; günde yirmi kez basılan düğmelerin yanında
   ayda bir basılan bir düğme yanlışlıkla basılmayı bekliyor demektir.

   BUGÜNKÜ SINIR

   Veri tarayıcının kendi hafızasında. Servis paneli ayrı bir cihazda
   açıldığında müşterinin telefonunda oluşan talebi göremiyor. Ekranlar
   ve veri düzeni hazır; sunucu bağlandığında yalnız veri katmanı
   değişecek, buraya dokunulmayacak.
   ========================================================================== */

export function ServisPanel() {
  const [oturum, setOturum] = useState(() => servisOturumuGetir())

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
  /* Demo APK'sında alanlar dolu geliyor: hesabı uygulamanın kendisi
     açtı, kullanıcının bilmediği bir kullanıcı adını tahmin etmesi
     beklenemez. Tarayıcı panelinde alanlar boş. */
  const demo = demoAPKmi()
  const [kullanici, setKullanici] = useState(demo ? DEMO_HESAP.kullanici : '')
  const [sifre, setSifre] = useState(demo ? DEMO_HESAP.sifre : '')
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
    const sonuc = await servisGirisi(kullanici, sifre)
    setBekliyor(false)
    if (sonuc.hata) return setHata(sonuc.hata)
    onGiris(sonuc.oturum)
  }

  return (
    <div className="giris">
      <form className="giris__kart" onSubmit={gir}>
        {/* Şerit kartın en üstünde, tam genişlikte. Giriş ekranı
            uygulamanın ilk izlenimi ve tek kimliği logo değil: servis
            burada ne işi olduğunu da görüyor. */}
        <img className="giris__serit" src={girisGorseli} alt="" />
        <Logo height={26} style={{ marginBottom: 14 }} />
        <div className="giris__baslik">Servis Girişi</div>
        <div className="giris__cizgi" />

        <label className="alan">
          <span className="alan__ad">Kullanıcı Adı</span>
          <input
            className="gir"
            value={kullanici}
            onChange={(e) => setKullanici(e.target.value)}
            placeholder="servis.adi"
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
              <strong>{MARKA} sizi arayacak</strong>
              <p>
                Talebiniz iletildi. {MARKA} yetkilisi size geçici bir şifre
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

            Personelin sıfırlaması e-postayla çalışıyor; serviste e-posta
            yok, iletişim telefonla yürüyor. Kendi kendine sıfırlayan bir
            akış, kullanıcı adını bilen herkese hesabı açardı. Servis talep
            bırakıyor, PAKSAN arıyor. */}
        <button
          type="button"
          className="giris__yardim"
          onClick={() => {
            servisSifreTalebiAc(kullanici)
            setHata('')
            setYardim(true)
          }}
        >
          Şifremi Unuttum
        </button>

        <p className="giris__dip">
          {demo
            ? `Demo sürümü · Kullanıcı adı ${DEMO_HESAP.kullanici} · Şifre ${DEMO_HESAP.sifre}`
            : `${SIRKET.ad} · Hesabınız yoksa ${MARKA} yetkilinize başvurun.`}
        </p>
      </form>
    </div>
  )
}

/* İlk girişte şifre değiştirme.

   PAKSAN hesabı açarken geçici bir şifre belirliyor; o şifreyi hesabı
   açan personel de biliyor. Servis kendi şifresini burada koyuyor. */
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
    const sonuc = await servisSifresiniDegistir(oturum.servisId, sifre)
    if (sonuc.hata) return setHata(sonuc.hata)
    onBitti()
  }

  return (
    <div className="giris">
      <form className="giris__kart" onSubmit={kaydet}>
        <Logo height={26} style={{ marginBottom: 14 }} />
        <div className="giris__baslik">Şifrenizi Belirleyin</div>
        <div className="giris__cizgi" />
        <p className="kucuk sonuk" style={{ marginTop: 0 }}>
          Hesabınız {MARKA} tarafından açıldı. Kendi şifrenizi belirleyin;
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
  /* Sekmelerin üstüne tam ekran açılan alt sayfa: 'kayit' | 'hesap'. */
  const [alt, setAlt] = useState(null)
  /* Açık ürün detayı.

     TAM EKRAN AÇILAN HER ŞEY BURADAN AÇILIYOR. Detay ekranları bir ara
     kendi sekmelerinin içinde açılıyordu; `Sayfa` kendi üst çubuğunu
     çizdiği için iki başlık üst üste biniyordu. */
  const [urun, setUrun] = useState(null)
  const [tazele, setTazele] = useState(0)
  const [talepler, setTalepler] = useState([])

  useEffect(() => {
    setTalepler(servisinTalepleri(talepleriGetir(), oturum.servisId))
  }, [oturum.servisId, tazele])

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
        oturum={oturum}
        servisAd={oturum.ad}
        servisId={oturum.servisId}
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

  /* YENİ KAYIT VE HESAP ARTIK SEKME DEĞİL.

     Alt çubukta dört yer var ve dördü de servisin günlük işine
     ayrılmalı. "Yeni Kayıt" günde birkaç kez, "Hesap" ayda bir
     açılıyordu; ikisi de satış ve makine bilgisi gibi her gün
     bakılan bölümlerin yerini tutuyordu.

     Yeni Kayıt İşlerim'in başındaki düğmeye taşındı — zaten oradan
     bakılan bir listenin devamı. Hesap başlıktaki isme geçti. */
  if (urun) {
    return <UrunDetay urun={urun} oturum={oturum} onKapat={() => setUrun(null)} />
  }

  if (alt === 'kayit') {
    return (
      <Sayfa
        baslik="Yeni Kayıt"
        alt="Size gelen bir müşteri için talep açın"
        onGeri={() => setAlt(null)}
      >
        <ElleKayit
          oturum={oturum}
          onKaydedildi={() => {
            setAlt(null)
            setSekme('isler')
            setTazele((x) => x + 1)
          }}
        />
      </Sayfa>
    )
  }

  if (alt === 'hesap') {
    return (
      <Sayfa
        baslik="Hesap"
        alt={oturum.no + ' · ' + oturum.il}
        onGeri={() => setAlt(null)}
      >
        <Hesap oturum={oturum} onCikis={onCikis} />
      </Sayfa>
    )
  }

  /* ÜÇ SEKME.

     Dört sekme vardı ve ikisi ("Satış", "Makine") aynı yirmi ürünü
     listeliyordu. "Satış" adı da kimin satışı olduğunu söylemiyordu.
     Tek liste kaldı: servis ürüne dokunuyor, fiyatını, teslim süresini,
     arızasını ve teknik değerlerini aynı sayfada buluyor. */
  const sekmeler = [
    { id: 'isler', ad: 'İşlerim', Icon: IconWrench, rozet: bekleyen.length },
    { id: 'urunler', ad: 'Ürünler', Icon: IconMachine },
    { id: 'parca', ad: 'Parça', Icon: IconParca },
  ]

  const BASLIK = {
    isler: { baslik: 'İşlerim', alt: oturum.ad },
    urunler: { baslik: 'Ürünler', alt: 'Arıza, bakım ve makine bilgileri' },
    parca: { baslik: 'Parça', alt: `Stokunuz ve ${MARKA} siparişleri` },
  }

  return (
    <Kabuk
      {...BASLIK[sekme]}
      islem={
        <button
          className="uyg__hesap"
          onClick={() => setAlt('hesap')}
          aria-label="Hesap"
        >
          {(oturum.ad || '?').charAt(0)}
        </button>
      }
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
          onYeniKayit={() => setAlt('kayit')}
        />
      )}
      {sekme === 'urunler' && <Urunler oturum={oturum} onAc={setUrun} />}
      {sekme === 'parca' && <Stok oturum={oturum} />}
    </Kabuk>
  )
}

/* ---------------------------------------------------------------- İşler */

function Isler({ oturum, bekleyen, biten, onAc, onYeniKayit }) {
  return (
    <>
      <Bugun bekleyen={bekleyen} onAc={onAc} />

      {/* Servisin kendi başlattığı iş: uygulamadan düşen talebi
          beklemeden, telefonla gelen ya da kendi gittiği işi kaydetmek.
          İlk kurulum ve çalıştırma da buradan giriliyor. */}
      <div className="baslangic">
        <button className="dg dg--ana dg--blok" onClick={onYeniKayit}>
          <IconPlus size={19} />
          Yeni Kayıt
        </button>
      </div>

      <ServisDuyurulari oturum={oturum} />

      {/* BEKLEYEN BÖLÜMÜ İŞ YOKKEN DE ÇIKIYOR.

          Önce yalnız iş varsa çiziliyordu. Sonuç: tamamlanmış işi olan
          bir servis ekranı açtığında yalnız "TAMAMLANAN" görüyordu ve
          bekleyen işinin olup olmadığı hiçbir yerde yazmıyordu.
          Bilginin yokluğu, bilgi değil — "acaba yüklenmedi mi?" diye
          düşündürüyor.

          Şimdi bölüm her zaman duruyor; boşken çizimiyle birlikte
          "bekleyen iş yok" diyor. Servis baktığı anda cevabını alıyor. */}
      <Bolum ad="Bekleyen" sayi={bekleyen.length}>
        {bekleyen.length > 0 ? (
          bekleyen.map((t) => (
            <TalepKarti key={t.id} talep={t} onAc={() => onAc(t)} />
          ))
        ) : (
          /* Altında "Tamamlanan" varsa küçük boy: o bölüm ekranın
             dışına düşmemeli. Ekran tamamen boşsa büyük boy. */
          <Bos
            kucuk={biten.length > 0}
            gorsel={bosIsGorseli}
            baslik="Bekleyen İşiniz Yok"
            alt={
              biten.length > 0
                ? 'Hepsini tamamladınız.'
                : 'Bölgenizden bir talep geldiğinde burada görünecek.'
            }
          />
        )}
      </Bolum>

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

/* ==========================================================================
   Bugün

   BURADA ÖNCE BİR SAYAÇ VARDI

   "1 iş sizi bekliyor" yazan büyük bir blok. Sorun şuydu: sayı zaten
   listenin kendisinde duruyor — kartları görüyorsunuz. Ekranın en
   değerli yerini, hiçbir soruyu cevaplamayan bir tekrar tutuyordu.

   Saha uygulamalarında o alanın karşılığı bellidir: teknisyen
   uygulamayı açtığında GÜNÜN PROGRAMINI görür, iş sayısını değil.
   Servisin sabah sorduğu soru "kaç işim var" değil, "bugün nereye
   gideceğim".

   Bu yüzden blok üç şeyi bu sırayla söylüyor:

     1. BUGÜNKÜ RANDEVULAR — tarih, müşteri, yer. Dokununca talep açılıyor.
     2. GECİKEN İŞ — 48 saati aşmış, randevusu da yok.
     3. RANDEVUSUZ İŞ — sırada bekleyen, henüz gün verilmemiş.

   Randevusu olan iş varsa o listeleniyor. Yoksa blok bir cümleye
   iniyor. Hiç iş yoksa hiç çıkmıyor — boş bir kutu, boşluğun
   kendisinden daha kötü.

   YARINI DA GÖSTERİYOR: randevu bugün yoksa ama yarın varsa, servis bunu
   akşamdan bilmek istiyor.
   ========================================================================== */

function gunBasi(t = Date.now()) {
  return new Date(t).setHours(0, 0, 0, 0)
}

/* Randevu gün ve saat olarak; yıl yazılmıyor. "03.09.2026 20:11"
   satırın üçte birini kaplıyor ve servisin randevusu bu hafta içinde:
   yıl hiçbir soruya cevap vermiyor.

   Tarih elle kuruluyor: `toLocaleString` yıl istenmediğinde Türkçe
   yerelde bile eğik çizgi veriyor ("05/09"), oysa Türkçe tarih
   noktayla yazılıyor. */
function randevuYazi(plan) {
  if (!plan?.tarih) return plan?.tarihYazi || ''
  const d = new Date(plan.tarih)
  const iki = (n) => String(n).padStart(2, '0')
  const saat = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  return `${iki(d.getDate())}.${iki(d.getMonth() + 1)} · ${saat}`
}

function Bugun({ bekleyen, onAc }) {
  const bugun = gunBasi()
  const yarin = bugun + 86400000

  const randevulu = bekleyen
    .filter((t) => t.plan?.tarih)
    .sort((a, b) => a.plan.tarih - b.plan.tarih)

  const bugunku = randevulu.filter((t) => {
    const g = gunBasi(t.plan.tarih)
    return g <= bugun
  })
  const yarinki = randevulu.filter((t) => gunBasi(t.plan.tarih) === yarin)

  const geciken = bekleyen.filter((t) => !t.plan && gecikmisMi(t))
  const sirada = bekleyen.filter((t) => !t.plan && !gecikmisMi(t))

  if (!bekleyen.length) return null

  return (
    <div className="bugun">
      <div className="bugun__ust">
        <IconCalendar size={17} />
        <strong>Bugün</strong>
        <span className="bugun__tarih">
          {new Date().toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            weekday: 'long',
          })}
        </span>
      </div>

      {bugunku.length > 0 ? (
        <div className="bugun__liste">
          {bugunku.map((t) => {
            /* Tarihi geçmiş randevu da bu listede: servis o işe gitmedi
               ve gitmesi gerekiyor. Sessizce düşerse unutuluyor. */
            const gecti = gunBasi(t.plan.tarih) < bugun
            return (
              <button
                key={t.id}
                className={'bugun__satir' + (gecti ? ' bugun__satir--gec' : '')}
                onClick={() => onAc(t)}
              >
                <span className="bugun__saat">
                  {gecti ? randevuYazi(t.plan) : 'bugün'}
                </span>
                <span className="bugun__ad">{t.ad || '—'}</span>
                <span className="bugun__yer">{t.ilce || t.il || ''}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="bugun__bos">
          Bugün için verilmiş randevunuz yok.
          {yarinki.length > 0 && ` Yarın ${yarinki.length} randevunuz var.`}
        </p>
      )}

      {/* Sayılar altta, tek satırda. Randevu somut bir plan; bunlar
          hatırlatma. Aynı ağırlıkta gösterilmemeleri gerekiyor. */}
      {(geciken.length > 0 || sirada.length > 0) && (
        <div className="bugun__sayilar">
          {geciken.length > 0 && (
            <span className="bugun__rozet bugun__rozet--gec">
              {geciken.length} işin üzerinden 48 saat geçti
            </span>
          )}
          {/* "gün bekliyor" iki türlü okunuyordu — "günlerdir bekliyor"
              da anlaşılabiliyordu. Kastedilen: randevusu verilmemiş. */}
          {sirada.length > 0 && (
            <span className="bugun__rozet">
              {sirada.length} işe gün verilmedi
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/* Fiyat teklifi burada yok: servis makine satmıyor, o talep bu
   uygulamaya hiç düşmüyor. */
const TUR_ADI = { servis: 'Servis', parca: 'Yedek Parça' }

/* Talep kartı. İskeleti `ListeKarti` (Kabuk.jsx) veriyor; burada
   yalnız talebin hangi alanının hangi yuvaya gireceği yazıyor.

   Yol tarifi düğmesi EKLENMEDİ. Talepte koordinat yok, yalnız il ve
   ilçe var (bkz. KonumAlani.jsx); düğme servisi ilçe merkezine
   götürürdü, tarlaya değil. Adresi telefonda öğreniyor. */
function TalepKarti({ talep, onAc }) {
  const paksanda = (talep.sahip || 'paksan') === 'paksan'
  const gecikti = gecikmisMi(talep)
  const tel = String(talep.tel || '').replace(/\D/g, '')
  const yer = talep.ilce ? `${talep.ilce} / ${talep.il}` : talep.il || '—'

  return (
    <ListeKarti
      ad={talep.ad || '—'}
      tur={talep.tur}
      turAdi={TUR_ADI[talep.tur] || talep.tur}
      kunye={
        <>
          {yer} · <span className="mono">{talep.no}</span>
        </>
      }
      /* Randevu listede de görünüyor: servis hangi işe gün verdiğini
         karta girmeden biliyor. Randevu yoksa yerini PAKSAN'ın devraldığı
         bilgisi alıyor — ikisi birden olmuyor. */
      sol={
        talep.plan ? (
          <>
            <IconCalendar size={14} /> {randevuYazi(talep.plan)}
          </>
        ) : paksanda && talep.devir ? (
          `${MARKA} destek veriyor`
        ) : null
      }
      sag={gecikti ? '48 saati geçti' : gecenSure(talep.createdAt || talep.tarih)}
      sagGec={gecikti}
      gec={gecikti}
      onAc={onAc}
      tel={tel}
      telAd={(talep.ad || 'Müşteriyi') + ' ara'}
    />
  )
}

/* ==========================================================================
   PAKSAN'ın servislere yönelttiği duyurular

   Ayrı bir bildirim deposu kurulmadı: aynı duyuru deposu okunuyor,
   kime gideceğine duyuruHedef.js karar veriyor. Servise ulaşması için
   duyurunun hedefinde "servislere" ya da "ikisine de" seçilmiş olması
   gerekiyor; hedefsiz duyuru müşteriye gider, servise değil.

   "ANLADIM" ARTIK SİLMİYOR

   Önceden okunan duyuru ekrandan tamamen kayboluyordu ve geri getirmenin
   yolu yoktu. Müşteri uygulamasında duyuru Bildirimler listesinde
   kalıyordu, servis panelinde karşılığı hiç yoktu.

   Geri çağırma yalnızca servise gidiyor (bkz. data/duyuruTurleri.js):
   yanlışlıkla "Anladım" denilen bir geri çağırma, o makineleri servise
   çağıracak tek kişinin elinden çıkmış oluyordu. Okunanlar artık
   "Geçmiş duyurular" başlığının altında duruyor.

   TÜRÜN KENDİ RENGİ VAR. Bütün duyurular aynı zilli kutuda çıkıyordu;
   kampanya ile geri çağırma ayırt edilemiyordu.
   ========================================================================== */

/* Tablodaki `ikon` adının servis panelindeki karşılığı. */
const DUYURU_IKON = {
  etiket: IconTag,
  makine: IconMachine,
  takvim: IconCalendar,
  uyari: IconAlert,
  geri: IconUndo,
}

function DuyuruKarti({ duyuru, okunmamis, onKapat }) {
  const bilgi = altBilgi(duyuru)
  const Ikon = DUYURU_IKON[bilgi.ikon] || IconBell

  return (
    <div className={'duyuru duyuru--' + bilgi.ton}>
      <div className="duyuru__ust">
        <Ikon size={17} />
        <span className="duyuru__tur">{bilgi.ad}</span>
      </div>
      <strong className="duyuru__baslik">{duyuru.baslik}</strong>
      <p className="duyuru__metin">{duyuru.metin}</p>
      {okunmamis && (
        <button className="dg dg--kucuk" onClick={onKapat}>
          Anladım
        </button>
      )}
    </div>
  )
}

function ServisDuyurulari({ oturum }) {
  const [hepsi, setHepsi] = useState([])
  const [gorulen, setGorulen] = useState(() => new Set(load(GORULEN, [])))
  const [gecmisAcik, setGecmisAcik] = useState(false)

  useEffect(() => {
    setHepsi(
      load('duyurular', [])
        .filter((d) => duyuruGecerliMi(d, { servis: oturum }))
        .sort((a, b) => b.tarih - a.tarih),
    )
  }, [oturum])

  function kapat(id) {
    const yeni = [...new Set([...load(GORULEN, []), id])]
    save(GORULEN, yeni)
    setGorulen(new Set(yeni))
  }

  const yeniler = hepsi.filter((d) => !gorulen.has(d.id))
  const gecmis = hepsi.filter((d) => gorulen.has(d.id))

  if (!hepsi.length) return null

  return (
    <>
      {yeniler.map((d) => (
        <DuyuruKarti key={d.id} duyuru={d} okunmamis onKapat={() => kapat(d.id)} />
      ))}

      {/* Geçmiş kapalı başlıyor: servisin ekranı bugünkü işi göstermeli,
          okunmuş duyuru yığınını değil. Tek dokunuşla açılıyor ve kaç
          tane olduğu düğmenin üzerinde yazıyor. */}
      {gecmis.length > 0 && (
        <>
          <button
            className="dg dg--blok"
            onClick={() => setGecmisAcik((x) => !x)}
          >
            <IconBell size={18} />
            {gecmisAcik
              ? 'Geçmiş duyuruları gizle'
              : `Geçmiş duyurular · ${gecmis.length}`}
          </button>
          {gecmisAcik &&
            gecmis.map((d) => (
              <DuyuruKarti key={d.id} duyuru={d} okunmamis={false} />
            ))}
        </>
      )}
    </>
  )
}

const GORULEN = 'gorulenDuyurularServis'

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
            servisOturumuKapat(oturum)
            onCikis()
          }}
        >
          Çıkış Yap
        </button>
        <p className="kucuk sonuk" style={{ marginTop: 10 }}>
          Şifrenizi unutursanız {MARKA} yetkilinize başvurun.
        </p>
      </Bolum>
    </>
  )
}

/* Şifre değiştirme.

   Mevcut şifre SORULUYOR. Açık oturumun sahibi olmak yetmiyor: telefon
   birinin elinde kalmış olabilir ve servis paneli müşteri bilgisi
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
    const sonuc = await servisSifresiniDegistir(oturum.servisId, yeni, eski)
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
          Şifremi Değiştir
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
