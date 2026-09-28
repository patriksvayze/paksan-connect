import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  servisGirisi,
  servisOturumuGetir,
  servisOturumuKapat,
  servisSifresiniDegistir,
  servisSifreTalebiAc,
  servisinTalepleri,
  destekTalepEt,
  talepleriGetir,
  BACKOFFICE_SIFRE_HANE,
} from '../backoffice/veri'
import { TemaSecici } from '../backoffice/Tema'
import { load, save, remove, baskaSekmeDegistirince } from '../lib/storage'
import { ozetHatasiMi } from '../lib/hesap'
import { Kabuk, Sayfa, Bolum, Onay } from './Kabuk'
import { DEMO_HESAP, demoAPKmi } from './demoKimlik'
import { IconWrench, IconParca, IconShield, IconTag, IconRight, IconBell } from '../components/Icons'
import { useServisHaberi } from './haber'
import { koyuZeminIcinBoya, temayaGoreBoya } from '../lib/sistemCubuklari'
import { Bildirimler } from './ekranlar/Bildirimler'
import { okunmamisSayisi } from './talepBildirimleri'
import { yeniIsSayisi } from './isDurumu'
import { Logo, Amblem, MARKA, SIRKET } from '../marka'
/* Giriş ekranının görseli: PAKSAN ORKA 870'İN BAŞINDA SERVİS
   TEKNİSYENİ, ŞAFAKTA TARLADA.

   ORKA 870 GERÇEK FOTOĞRAFTAN (24 Eylül 2026, kullanıcının isteği:
   "Orkinos'a müdahale eden servis personeli görseli Orka 870 ile
   değiştirilecek. Her şey aynı, sadece makine değişecek").
   İlk deneme makineyi yapay zekâya yeniden çizdirdi; kullanıcı
   "gerçeğine hiç benzemiyor" dedi. Bu yüzden makine çizdirilmedi:
   katalogdaki Orka 870 fotoğrafından (marka/varliklar/urunler/
   orka-870.jpg) arka planı ayrılıp sahneye yerleştirildi, ışığı
   şafağa göre elle ısıtıldı. Aynı sahnenin makinesiz, teknisyensiz
   hâli Higgsfield'a (GPT Image 2.5) boşaltıldı; teknisyen ve takım
   çantası model tarafından eklendi, sonra makinenin pikselleri
   fotoğraftakiyle geri yazıldı — modelin bozduğu "king of the bale"
   yazısı dahil. Birleşik girdi: tools/kaynak/servis-giris-orka870-
   birlesik.jpg. Aşağıdaki not Orkinos'lu önceki görsele ait.

   (Önceki görsel) ORKINOS 1270'İN BAŞINDA SERVİS TEKNİSYENİ.

   Konu uygulamanın kullanıcısının kendisi: makine duruyor, teknisyen
   toplayıcının zincir dişlisinde anahtarla çalışıyor, yanında açık
   takım çantası. Servis elemanı uygulamayı tam da bu anda açıyor.

   MAKİNE PAKSAN'IN KENDİ MODELİ (14 Eylül 2026, kullanıcının isteği).
   Önceki üretimde makine firmanın videosundan referans alınmıştı ama
   genel bir balya makinesi olarak çıkmıştı. Kullanıcı ekranı "sonradan
   konmuş, ucuz" buldu ve görselin PAKSAN'ın makinelerinden biri
   olmasını istedi. Amiral model Orkinos 1270 seçildi: kabartma desenli
   uzun turuncu kaput ve iki aks ilk bakışta tanınıyor.

   ÜRETİLDİ, FOTOĞRAF DEĞİL. Higgsfield, Nano Banana Pro; referanslar
   katalogdaki Orkinos 1270 fotoğrafı, tanıtım videosundan tarlada bir
   kare ve ışık için PAKSAN Connect karşılamasının şafak sahnesi (iki
   uygulamanın açılışı aynı sabahın içinde duruyor).

   Bir deneme kadraj için eski görseli de referans aldı; model eski
   makineyi koruyup yalnız kaputun desenini ve yazısını ekledi, ortaya
   PAKSAN'da olmayan melez bir makine çıktı. Referanslardan eski görsel
   çıkarılınca model doğru makineyi üretti. Bu görsel yenilenecekse
   kadraj referansı verilmemeli.

   Kaputtaki "paksan" yazısı üretimde doğru çıktı ve bırakıldı.
   Teknisyenin sırtındaki yarım harf izi silindi. Koyu tonlar markanın
   laciverdine çekildi, tarlanın doygunluğu indirildi; turuncuya
   dokunulmadı (bkz. servis.css → .sgiris__tepe).

   Kaynak tools/kaynak/servis-giris-orkinos-girdi.jpg (1792x2400,
   işlenmemiş üretim); uygulamadaki dosya 1200x1607 JPEG. */
import girisGorseli from '../assets/gorseller/servis-giris-orka870.jpg'
import { TalepDetay } from './ekranlar/TalepDetay'
import { Isler } from './ekranlar/Islerim'
import { Parca } from './ekranlar/Parca'
import { Bayilerim } from './ekranlar/Bayilerim'
import { Ucretlerim } from './ekranlar/Ucretlerim'
import { SiparisVer } from './ekranlar/SiparisVer'
import { Hakkedis } from './ekranlar/Hakkedis'
import { ElleKayit } from './ekranlar/ElleKayit'
import { Adreslerim } from './ekranlar/Adreslerim'

/* ==========================================================================
   PAKSAN Servisim

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
  /* Tek kimlik: Uygulama'daki denetim etkisi bu işleve bağlı; her
     çizimde yeni işlev verilseydi etki her çizimde yeniden kurulurdu. */
  const cikis = useCallback(() => setOturum(null), [])

  if (!oturum) return <Giris onGiris={setOturum} />
  if (oturum.ilkGiris) {
    return (
      <IlkSifre
        oturum={oturum}
        onBitti={() => setOturum({ ...oturum, ilkGiris: false })}
      />
    )
  }
  return <Uygulama oturum={oturum} onCikis={cikis} />
}

/* ------------------------------------------------------------------ Giriş */

/* GİRİŞ EKRANI: PAKSAN CONNECT KARŞILAMASININ KARDEŞİ.

   Önce backoffice'in giriş kartını kullanıyordu, sonra onun telefona
   uyarlanmış hâlini (tepede fotoğraf, altında beyaz form kutusu).
   Kullanıcı ikisini de backoffice'ten devşirme buldu: Servisim,
   PAKSAN Connect'in kardeşi. Artık düzen Connect karşılamasının düzeni:
   fotoğraf ekranın arkasında, amblem ve logo ortada, büyük başlık ve
   turuncu düğme fotoğrafın koyu kısmında (ölçüler ve gerekçe
   servis.css → "Giriş ekranı").

   Şifre belirleme ekranı da buradan geçiyor: ikisi de oturum
   açılmadan görülen ekranlar ve aynı yüzeyde durmaları gerekiyor. */

/* GÖRSEL ÖLÇÜLEREK YERLEŞİYOR.

   Fotoğraf arka planda ve genişliği ekran kadar; makine ile takım
   çantası görselin yüksekliğinin %30-68'inde. Görsel, bu bant marka
   bloğunun altı ile başlığın üstü arasındaki boşluğun ortasına gelecek
   kadar kaydırılıyor. Boşluk bandı almıyorsa (kısa telefon) bandın
   üstü marka bloğunun hemen altına oturuyor; makinenin dibi başlığın
   koyu perdesine iniyor ama makine logoya çarpmıyor.

   Ölçüm `offsetTop` ile: başlık ve logo açılışta aşağıdan süzülüyor,
   dönüşümü sayan bir ölçü görseli o kadar kaydırırdı. Form uzayınca
   (hata ya da "PAKSAN sizi arayacak" kutusu çıkınca) başlık yukarı
   kalkıyor; ResizeObserver formu da izliyor ve yeniden yerleştiriyor.
   Aynı iki çizgi perdenin duraklarını da veriyor (--perde-ust,
   --perde-alt). Connect de amblemin yerini ölçüp güneşi ona hizalıyor
   (bkz. src/components/Safak.jsx). */
const RESIM_ORAN = 1607 / 1200
const MAKINE_UST = 0.3
const MAKINE_ALT = 0.68
const RESIM_PAY = 12

function resimYerlesimi(kok) {
  const ic = kok.querySelector('.sgiris__ic')
  const marka = kok.querySelector('.sgiris__marka')
  const baslik = kok.querySelector('.sgiris__baslikalani')
  const W = kok.clientWidth
  if (!ic || !marka || !baslik || !W) return null

  const ustSinir = ic.offsetTop + marka.offsetTop + marka.offsetHeight + RESIM_PAY
  const altSinir = ic.offsetTop + baslik.offsetTop - RESIM_PAY
  const yuk = W * RESIM_ORAN
  const bantUst = MAKINE_UST * yuk
  const bantAlt = MAKINE_ALT * yuk

  let ust = (ustSinir + altSinir) / 2 - (bantUst + bantAlt) / 2
  if (bantAlt - bantUst > altSinir - ustSinir) ust = ustSinir - bantUst
  return { ust, ustSinir, altSinir }
}

function GirisEkrani({ ustSatir, baslik, aciklama, children }) {
  const kok = useRef(null)

  /* Giriş fotoğrafın üstünde: telefonun saat ve pil simgeleri açık
     renk, ekrandan çıkınca temaya göre (lib/sistemCubuklari.js). */
  useEffect(() => {
    koyuZeminIcinBoya()
    return temayaGoreBoya
  }, [])

  useLayoutEffect(() => {
    const el = kok.current
    if (!el) return undefined
    const yerlestir = () => {
      const y = resimYerlesimi(el)
      if (!y) return
      el.style.setProperty('--resim-ust', `${y.ust.toFixed(1)}px`)
      el.style.setProperty('--perde-ust', `${y.ustSinir.toFixed(1)}px`)
      el.style.setProperty('--perde-alt', `${y.altSinir.toFixed(1)}px`)
    }
    yerlestir()
    const izle = new ResizeObserver(yerlestir)
    izle.observe(el)
    el.querySelectorAll('.sgiris__ic > *').forEach((c) => izle.observe(c))
    return () => izle.disconnect()
  }, [])

  return (
    <div className="sgiris" ref={kok}>
      <img className="sgiris__resim" src={girisGorseli} alt="" />
      <div className="sgiris__perde" />

      <div className="sgiris__ic">
        {/* Connect karşılamasındaki marka bloğu: amblem beyaz dairede,
            yazı altında. */}
        <div className="sgiris__marka">
          <span className="sgiris__amblem">
            <Amblem size={64} cerceve />
          </span>
          <span className="sgiris__yazi">
            <Logo height={50} sadeceYazi beyaz />
          </span>
        </div>

        {/* Makinenin göründüğü pencere */}
        <div className="sgiris__bosluk" />

        <div className="sgiris__baslikalani">
          <h1 className="sgiris__baslik">
            {ustSatir ? <span className="sgiris__ustsatir">{ustSatir}</span> : null}
            {ustSatir ? ' ' : null}
            {baslik}
          </h1>
          {aciklama ? <p className="sgiris__alt">{aciklama}</p> : null}
        </div>

        {children}
      </div>
    </div>
  )
}

/* ŞİFRE ÖZETİ ÜRETİLEMEDİĞİNDE YAZILACAK METİN.

   Tarayıcı güvenli kökende değilse (düz HTTP adresi) şifre
   doğrulanamıyor; bkz. src/lib/hesap.js → ozet. Önceden düğme
   "Kontrol ediliyor…" yazısında kalıyor, ekranda hiçbir şey
   çıkmıyordu.

   Metin servis sesiyle yazıldı: tek cümle, terim yok. Teknisyen
   ekranı tarlada ayakta okuyor; ona "güvenli köken" demek bir şey
   anlatmaz, yapacağı şeyi söylemek anlatır. */
const OZET_HATASI_METNI = `Şifre kontrol edilemiyor; uygulamayı yeniden açın, sorun sürerse ${MARKA} yetkilisini arayın.`

function Giris({ onGiris }) {
  /* Demo APK'sında alanlar dolu geliyor: hesabı uygulamanın kendisi
     açtı, kullanıcının bilmediği bir kullanıcı adını tahmin etmesi
     beklenemez. Tarayıcı panelinde alanlar boş. */
  const demo = demoAPKmi()
  /* BENİ HATIRLA — kullanıcı adı bu telefonda saklanıyor. Şifre
     saklanmıyor: uygulama her açılışta bu ekrandan başlıyor. */
  const [kullanici, setKullanici] = useState(
    () => (demo ? DEMO_HESAP.kullanici : load('servisHatirla', '') || ''),
  )
  const [hatirla, setHatirla] = useState(() => Boolean(load('servisHatirla', '')))
  const [sifre, setSifre] = useState(demo ? DEMO_HESAP.sifre : '')
  const [hata, setHata] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [yardim, setYardim] = useState(false)

  async function gir(e) {
    e.preventDefault()
    if (bekliyor) return
    /* "PAKSAN sizi arayacak" notu açıksa kapanıyor: hata kutusuyla üst
       üste açık kalınca form uzuyor, kısa telefonda ekran kayıyordu. */
    setYardim(false)
    if (!kullanici.trim()) return setHata('Kullanıcı adınızı yazın.')
    if (sifre.length !== BACKOFFICE_SIFRE_HANE) {
      return setHata('Şifre 6 rakamdan oluşmalı.')
    }
    setHata('')
    setBekliyor(true)
    /* Bekleme hâlinden çıkış `finally`de: hangi hata olursa olsun düğme
       kilitli kalmasın — tarlada tek çıkış yolu uygulamayı kapatmak
       olmasın. */
    try {
      const sonuc = await servisGirisi(kullanici, sifre)
      if (sonuc.hata) {
        setHata(sonuc.hata)
        return
      }
      if (hatirla) save('servisHatirla', kullanici.trim())
      else remove('servisHatirla')
      onGiris(sonuc.oturum)
    } catch (e) {
      if (!ozetHatasiMi(e)) throw e
      setHata(OZET_HATASI_METNI)
    } finally {
      setBekliyor(false)
    }
  }

  return (
    /* BAŞLIĞIN ALTINDA AÇIKLAMA YOK (14 Eylül 2026, kullanıcının kararı).
       "Hesabınızı PAKSAN açar, giriş yaptığınızda bekleyen işlerinizi
       görürsünüz" satırı vardı; kullanıcı gereksiz buldu. Servis elemanı
       hesabını PAKSAN'dan zaten alıyor, ekranın ne olduğunu da görselle
       başlık söylüyor. Hesabı olmayan için yol dipteki künye satırında.

       Başlık Connect'teki "1970'TEN BERİ / Yanınızdayız" gibi iki
       katlı: üstte küçük aralıklı marka adı, altında iri "Servisim".
       Ekran okuyucu ikisini tek başlık olarak okuyor. */
    <GirisEkrani ustSatir={MARKA} baslik="Servisim">
      <form onSubmit={gir}>
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

        {/* "Beni Hatırla" ile "Şifremi Unuttum" aynı satırda: ikisi de
            şifre alanına ait; ayrı satırlarda form 56 piksel uzuyordu. */}
        <div className="sgiris__satir">
          <label className="sgiris__hatirla">
            <input
              type="checkbox"
              checked={hatirla}
              onChange={(e) => setHatirla(e.target.checked)}
            />
            <span>Beni Hatırla</span>
          </label>

          {/* ŞİFREMİ UNUTTUM E-POSTA GÖNDERMİYOR.

              Personelin sıfırlaması e-postayla çalışıyor; serviste e-posta
              yok, iletişim telefonla yürüyor. Kendi kendine sıfırlayan bir
              akış, kullanıcı adını bilen herkese hesabı açardı. Servis talep
              bırakıyor, PAKSAN arıyor. */}
          <button
            type="button"
            className="sgiris__yardim"
            onClick={() => {
              servisSifreTalebiAc(kullanici)
              setHata('')
              setYardim(true)
            }}
          >
            Şifremi Unuttum
          </button>
        </div>

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

        <button className="sgiris__gir" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Kontrol ediliyor…' : 'Giriş'}
          {bekliyor ? null : <IconRight size={21} />}
        </button>
      </form>

      <p className="sgiris__dip">
        {demo
          ? `Demo sürümü · Kullanıcı adı ${DEMO_HESAP.kullanici} · Şifre ${DEMO_HESAP.sifre}`
          : `${SIRKET.ad} · Hesabınız yoksa ${MARKA} yetkilinize başvurun.`}
      </p>
    </GirisEkrani>
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
    try {
      const sonuc = await servisSifresiniDegistir(oturum.servisId, sifre)
      if (sonuc.hata) return setHata(sonuc.hata)
    } catch (e) {
      if (!ozetHatasiMi(e)) throw e
      return setHata(OZET_HATASI_METNI)
    }
    onBitti()
  }

  return (
    <GirisEkrani
      baslik="Şifrenizi Belirleyin"
      aciklama={`Hesabınız ${MARKA} tarafından açıldı. Kendi şifrenizi belirleyin; bundan sonra bu şifreyle gireceksiniz.`}
    >
      <form onSubmit={kaydet}>
        <label className="alan">
          <span className="alan__ad">Yeni Şifre</span>
          <input
            className="gir gir--kod"
            type="password"
            inputMode="numeric"
            maxLength={BACKOFFICE_SIFRE_HANE}
            value={sifre}
            onChange={(e) => setSifre(e.target.value.replace(/\D/g, ''))}
            autoComplete="new-password"
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
            autoComplete="new-password"
          />
        </label>

        {hata && <div className="uyari">{hata}</div>}
        <button className="sgiris__gir" type="submit">
          Kaydet
        </button>
      </form>
    </GirisEkrani>
  )
}

/* ------------------------------------------------------------- Uygulama */

const KAPALI = ['kapandi', 'iptal']

/* Ekran değişince dokunuşun yutulduğu süre (bkz. ServisPanel içinde
   "EKRAN DEĞİŞİNCE ÇİFT DOKUNUŞUN İKİNCİSİ YUTULUYOR"). */
const GECIS_KILIDI_MS = 350

function Uygulama({ oturum, onCikis }) {
  const [sekme, setSekme] = useState('isler')
  /* AÇIK TALEP KİMLİKLE TUTULUYOR, KOPYAYLA DEĞİL (25 Eylül 2026,
     kullanıcı sınaması O3).

     Açılan talebin o anki kopyası saklanıyordu ve yalnız not yazılınca
     elle yeniden okunuyordu. Detay açıkken PAKSAN parçayı gönderse
     "Parçayı Taktım" kapalı kalıyor, talebi iptal etse işlem düğmeleri
     yerinde duruyordu. Şimdi yalnız kimlik tutuluyor; talep her
     tazelemede (yeni haber, başka sekmenin yazdığı, işlem sonrası)
     depodan okunuyor. Talep depodan kalktıysa detay kapanıyor. */
  const [acikId, setAcikId] = useState(null)
  /* Sekmelerin üstüne tam ekran açılan alt sayfa: 'kayit' | 'hesap'. */
  const [alt, setAlt] = useState(null)
  const [tazele, setTazele] = useState(0)
  const [talepler, setTalepler] = useState([])
  /* İşlerim'in seçili sekmesi (Yeni · Devam Eden · Tamamlanan). Burada
     tutuluyor: iş detayı açılınca İşlerim ekrandan kalkıyor, dönünce
     aynı sekme açık gelmeli (bkz. ekranlar/Islerim.jsx). */
  const [isSekme, setIsSekme] = useState(null)

  useEffect(() => {
    setTalepler(servisinTalepleri(talepleriGetir(), oturum.servisId))
  }, [oturum.servisId, tazele])

  const acik = useMemo(
    () => (acikId ? talepleriGetir().find((t) => t.id === acikId) || null : null),
    [acikId, tazele],
  )

  /* EKRAN DEĞİŞİNCE ÇİFT DOKUNUŞUN İKİNCİSİ YUTULUYOR (26 Eylül 2026,
     ikinci kullanıcı sınaması). "Kaydı Gönder"e iki kez dokunan servis
     elemanının ikinci dokunuşu, hemen açılan listede o noktaya gelen
     başka bir müşterinin işini açtı. İş açılınca, listeye dönülünce ya da
     tam ekran sayfa açılıp kapanınca 350 ms boyunca gelen dokunuş hiçbir
     düğmeye ulaşmıyor: çift dokunmanın aralığından uzun, bilerek yapılan
     bir sonraki dokunuştan kısa. Yakalama pencerede ve en önde, React'in
     dinleyicisinden önce. */
  useEffect(() => {
    const bitis = Date.now() + GECIS_KILIDI_MS
    const yut = (e) => {
      if (Date.now() < bitis) {
        e.stopPropagation()
        e.preventDefault()
      }
    }
    window.addEventListener('click', yut, true)
    const zaman = setTimeout(() => window.removeEventListener('click', yut, true), GECIS_KILIDI_MS)
    return () => {
      clearTimeout(zaman)
      window.removeEventListener('click', yut, true)
    }
  }, [acikId, alt])
  const ac = useCallback((t) => setAcikId(t?.id ?? null), [])

  /* Üst çubuktaki Bildirimler düğmesinin sayısı. Ekran değiştikçe ve
     yeni haber geldikçe (tazele) yeniden sayılıyor. */
  const okunmamis = useMemo(
    () => okunmamisSayisi(oturum),
    [oturum, tazele, alt, acikId],
  )

  /* Yeni iş, yola çıkan parça ve onaylanan hak ediş telefonun
     bildirim perdesine düşüyor (bkz. haber.js). */
  const yenile = useCallback(() => setTazele((x) => x + 1), [])
  useServisHaberi(oturum, yenile)

  /* OTURUM YAŞIYOR MU, BAŞKA SEKME NE YAZDI (25 Eylül 2026, kullanıcı
     sınaması O6 ve O7).

     Oturum açılışta bir kez okunuyordu: PAKSAN servisin hesabını
     kapatsa da açık uygulama çalışmaya devam ediyordu. Başka sekmenin
     yazdığı (PAKSAN'ın ücret ve indirim değişikliği, talepteki işlem,
     cari hareket) da ekrana ancak yeni bir iş ya da bildirim gelince
     düşüyordu; Hak Ediş açık kaldıkça eski listeyi gösteriyordu.

     Şimdi iki yerden haber geliyor:
       - Tarayıcının `storage` olayı (lib/storage.js →
         baskaSekmeDegistirince): üç uygulama tarayıcıda aynı depoyu
         paylaşıyor, başka sekmenin yazımı bu olayı doğuruyor. Olay
         yalnız ÖTEKİ sekmelere gidiyor; art arda gelen yazımlar 150
         ms'de toplanıyor. Oturum yeniden denetleniyor ve ekran
         depodan yeniden okunuyor. Servis listesinin bellekteki kopyası
         aynı olayla boşalıyor (lib/icerikDeposu.js).
       - Uygulama öne gelince (`visibilitychange`): telefonda başka
         sekme yok; oturum PAKSAN servisin hesabını kapattıktan sonra
         uygulama ilk açıldığında düşüyor.

     TEK DİNLEYİCİ. Bu dinleyici backoffice'tekinin (Backoffice.jsx)
     kardeşi; Servisim'de sekmeler arası ikinci bir dinleyici yok
     (haber.js'e eklenmesi planlanan kopya bu yüzden yazılmadı).
     Telefonda (APK) olay gelmiyor, zaten başka yazan da yok; sunucu
     gelince yerini sunucunun haberi alacak. 15 saniyelik yoklama
     telefon bildirimi için aynen duruyor (haber.js).

     Denetim yalnız okuyor: okurken depoya zaman damgalı bir şey
     yazsaydı her sekme ötekini tetikleyip döngü kurardı. */
  useEffect(() => {
    const denetle = () => {
      if (!servisOturumuGetir()) onCikis()
    }
    let bekleyen = null
    const birak = baskaSekmeDegistirince(() => {
      clearTimeout(bekleyen)
      bekleyen = setTimeout(() => {
        denetle()
        yenile()
      }, 150)
    })
    const gorunur = () => {
      if (document.visibilityState === 'visible') denetle()
    }
    document.addEventListener('visibilitychange', gorunur)
    return () => {
      clearTimeout(bekleyen)
      birak()
      document.removeEventListener('visibilitychange', gorunur)
    }
  }, [onCikis, yenile])

  /* İŞLERİM ROZETİ YENİ İŞİ SAYIYOR (25 Eylül 2026, kullanıcı
     sınaması). Önce servisin bütün açık işlerini sayıyordu: randevulu,
     parça bekleyen ve onaydaki iş de kırmızı dairede "9+" diye
     duruyor, okunmamış bildirim sanılıyordu. Artık yalnız el
     sürülmemiş iş — İşlerim'deki "Yeni" sekmesinin sayısı
     (isDurumu.js → yeniIsSayisi). */
  const yeniIs = useMemo(() => yeniIsSayisi(talepler), [talepler])

  /* SERVİSİN KENDİ SİPARİŞİ "İŞ" DEĞİL.

     Servisin PAKSAN'dan ısmarladığı parça da bir talep ve servisin
     üstünde duruyor; ama bir müşteri işi değil, kendi satın alması.
     İşlerim listesinde görünseydi sabah bakılan liste, yapılacak iş
     olmayan satırlarla dolardı. Onlar Parça sekmesinde. */
  const [bekleyen, biten] = useMemo(() => {
    const isler = talepler.filter((t) => !t.servisSiparisi)
    return [
      isler.filter((t) => !KAPALI.includes(t.status)),
      isler.filter((t) => KAPALI.includes(t.status)),
    ]
  }, [talepler])

  /* Talep detayı sekmelerin üstüne tam ekran açılıyor. */
  if (acik) {
    return (
      <TalepDetay
        talep={acik}
        oturum={oturum}
        servisAd={oturum.ad}
        /* Not gibi detayı kapatmayan işlemlerden sonra talep depodan
           yeniden okunuyor; ekran yazılanı hemen gösteriyor. */
        onYenile={yenile}
        onKapat={() => {
          setAcikId(null)
          setTazele((x) => x + 1)
        }}
        onDestekIste={(neden) => {
          destekTalepEt(acik, neden, oturum.ad)
          setAcikId(null)
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
  if (alt === 'kayit') {
    return (
      <Sayfa
        baslik="Yeni Kayıt"
        alt="Size gelen bir müşteri için talep açın"
        onGeri={() => setAlt(null)}
      >
        {/* KAYIT AÇILINCA DOĞRUDAN O TALEBE GİDİLİYOR.

            Önce listeye dönülüyordu: servis açtığı kaydı listede
            bulmak, doğru satır olduğundan emin olmak ve açmak
            zorundaydı. Oysa kayıt açmanın hemen ardından yapılacak iş
            belli — randevu vermek, not eklemek ya da doğrudan servis
            kaydını doldurmak. */}
        {/* AYNI MAKİNEDE İŞİ SÜREN KENDİ TALEBİ VARSA (25 Eylül 2026,
            kullanıcı sınaması O5) Kayıt Aç ekranı o işi gösteriyor ve
            "İşi Aç" ile doğrudan oraya götürüyor (ekranlar/ElleKayit.jsx). */}
        <ElleKayit
          oturum={oturum}
          onKaydedildi={(talep) => {
            setAlt(null)
            setSekme('isler')
            setTazele((x) => x + 1)
            if (talep) setAcikId(talep.id)
          }}
          onIsiAc={(t) => {
            setAlt(null)
            setSekme('isler')
            ac(t)
          }}
        />
      </Sayfa>
    )
  }

  /* SİPARİŞ EKRANI ARTIK ÜST ÇUBUKTAKİ "+" DÜĞMESİNDEN AÇILIYOR.

     Parça sekmesinin en üstünde tam genişlikte bir "Sipariş Ver"
     düğmesi duruyordu ve altındaki sipariş listesini aşağı itiyordu.
     Aynı sorun İşlerim'de de vardı ve aynı şekilde çözülmüştü:
     ekranın gövdesi LİSTEDİR, yeni kayıt açmak üst çubuğun işi.
     İki sekme artık aynı yerden, aynı düğmeyle iş açıyor. */
  if (alt === 'siparis') {
    return (
      <Sayfa
        baslik="Sipariş Ver"
        alt={`${MARKA} yedek parça birimine`}
        onGeri={() => setAlt(null)}
      >
        {/* `surum`: başka sekmede PAKSAN indirimi ya da bakiyeyi
            değiştirince kartlar tazeleniyor; açık onay penceresindeki
            tutar değişmiyor (SiparisVer.jsx). */}
        <SiparisVer
          oturum={oturum}
          surum={tazele}
          onKapat={() => setAlt(null)}
          onVerildi={() => {
            setAlt(null)
            setTazele((x) => x + 1)
          }}
        />
      </Sayfa>
    )
  }


  /* ÜÇ SEKME VE ÜÇÜ DE SERVİSİN KENDİ İŞİ.

     "Ürünler" sekmesi kaldırıldı: yirmi makinenin kataloğunu
     listeliyordu ve servis makine satmıyor. Yerine hak ediş geldi —
     servisin bu uygulamada en çok merak ettiği şey.

     "Parça" sekmesi stok defteri tutuyordu; o da kaldırıldı, çünkü
     rakam hiçbir zaman gerçeğe uymuyordu (gerekçe ekranlar/Parca.jsx
     başında). Geriye ekranın işe yarayan tek parçası kaldı: sipariş.

     Kalan üçü servisin gününü anlatıyor: bekleyen işleri, ısmarladığı
     parçalar, alacağı para.

     İşlerim'in rozeti yeni iş sayısı (yukarıda `yeniIs`); ekran
     okuyucu da onu "yeni iş" diye okuyor (Kabuk.jsx → rozetYazi). */
  const sekmeler = [
    { id: 'isler', ad: 'İşlerim', Icon: IconWrench, rozet: yeniIs, rozetYazi: `${yeniIs} yeni iş` },
    { id: 'parca', ad: 'Parça', Icon: IconParca },
    { id: 'hakkedis', ad: 'Hak Ediş', Icon: IconTag },
  ]

  /* SELAMLAMA (10 Eylül 2026). PAKSAN Connect ana sayfası müşteriyi
     adıyla selamlıyor; servis uygulaması da servisi adıyla selamlıyor.
     Yeri başlığın altındaki satır: ekran düzeni değişmiyor. */
  const BASLIK = {
    isler: { baslik: 'İşlerim', alt: `Merhaba, ${oturum.ad}` },
    parca: { baslik: 'Parça', alt: `${MARKA} siparişleriniz` },
    hakkedis: { baslik: 'Hak Ediş', alt: `${MARKA} ile hesabınız` },
  }

  /* HESAP ALT MENÜYÜ GİZLEMİYOR (22 Eylül 2026, kullanıcının sorusu:
     "profil ekranındayken neden navigasyon bar kayboluyor?"). Hesap, iş
     detayı gibi tam ekran bir alt sayfa olarak açılıyordu; o kalıp alt
     menüyü bilerek gizliyor — bir formun ortasındayken yanlışlıkla başka
     sekmeye geçilmesin diye. Hesap ekranında yarım kalan bir iş yok:
     artık sekmeli kabuğun içinde açılıyor, sol üstte "Geri" var, alt
     menüden bir sekmeye dokunmak Hesap'ı kapatıp o sekmeyi açıyor. Yeni
     Kayıt ve Sipariş Ver birer form; onlar alt sayfa olarak kalıyor. */
  /* BİLDİRİM GEÇMİŞİ (24 Eylül 2026, kullanıcının isteği). Hesap gibi
     sekmeli kabuğun içinde açılıyor: yarım kalan bir iş yok, alt menü
     duruyor. Bir bildirime dokununca talep açılıyor; talep kapanınca
     buraya dönülüyor (talep detayı bu kontrolden önce çiziliyor). */
  if (alt === 'bildirimler') {
    /* Alt başlık yalnız PAKSAN'ı anmıyor (25 Eylül 2026): müşterinin
       talebe eklemesi ve "Sorun Devam Ediyor" demesi de bu listede. */
    return (
      <Kabuk
        baslik="Bildirimler"
        alt={`${MARKA} ve müşterilerinizden gelenler`}
        onGeri={() => setAlt(null)}
        sekmeler={sekmeler}
        sekme={null}
        onSekme={(id) => {
          setAlt(null)
          setSekme(id)
        }}
      >
        <Bildirimler
          oturum={oturum}
          talepler={talepler}
          onAc={ac}
          onUcretler={() => setAlt('ucretler')}
        />
      </Kabuk>
    )
  }

  /* `ucretler`: Hesap açılıp "Ücretlendirmeler" bölümüne kayılıyor —
     Hak Ediş'teki özet satırdan ve ücret/indirim bildiriminden gelindi. */
  if (alt === 'hesap' || alt === 'ucretler') {
    return (
      <Kabuk
        baslik="Hesap"
        alt={oturum.no + ' · ' + oturum.il}
        onGeri={() => setAlt(null)}
        sekmeler={sekmeler}
        sekme={null}
        onSekme={(id) => {
          setAlt(null)
          setSekme(id)
        }}
      >
        <Hesap oturum={oturum} onCikis={onCikis} surum={tazele} ucretlereOdak={alt === 'ucretler'} />
      </Kabuk>
    )
  }

  return (
    <Kabuk
      {...BASLIK[sekme]}
      islem={
        /* ÜST ÇUBUKTA YALNIZ HESAP.

           "+" düğmesi bir dönem burada, hesap harfinin yanında
           duruyordu. Gün içinde en çok basılan düğme ekranın parmağa en
           uzak köşesindeydi: telefonu tek elle tutan servisin başparmağı
           oraya yetişmiyor. Yüzen düğme olarak alt menünün üstüne indi
           (bkz. Kabuk.jsx → fab). Hesap ayda bir açılıyor; üstte kalması
           doğru. */
        <div className="uyg__islemler">
          {/* BİLDİRİMLER (24 Eylül 2026): zil yazısıyla birlikte;
              okunmamış varsa sayısı. Geçmişin tamamı arkasında. */}
          <button className="uyg__bildirim" onClick={() => setAlt('bildirimler')}>
            <span className="uyg__bildirim-ic">
              <IconBell size={18} />
              Bildirimler
              {okunmamis > 0 && (
                <span className="uyg__bildirim-sayi">{okunmamis > 9 ? '9+' : okunmamis}</span>
              )}
            </span>
          </button>
          <button
            className="uyg__hesap"
            onClick={() => setAlt('hesap')}
            aria-label="Hesap"
          >
            {(oturum.ad || '?').charAt(0)}
          </button>
        </div>
      }
      fab={
        sekme === 'isler'
          ? { ad: 'Kayıt Aç', onClick: () => setAlt('kayit') }
          : sekme === 'parca'
            ? { ad: 'Sipariş Ver', onClick: () => setAlt('siparis') }
            : null
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
          tumTalepler={talepler}
          onAc={ac}
          onUcretler={() => setAlt('ucretler')}
          sekme={isSekme}
          onSekme={setIsSekme}
          surum={tazele}
        />
      )}
      {sekme === 'parca' && (
        <Parca
          oturum={oturum}
          onAc={ac}
          onSiparis={() => setAlt('siparis')}
          surum={tazele}
        />
      )}
      {sekme === 'hakkedis' && (
        <Hakkedis oturum={oturum} onAc={ac} surum={tazele} onUcretler={() => setAlt('ucretler')} />
      )}
    </Kabuk>
  )
}

/* ---------------------------------------------------------------- İşler

   İşlerim ekranı kendi dosyasında: ekranlar/Islerim.jsx (22 Eylül 2026'da
   baştan tasarlanırken ayrıldı; eski hâlinin yedeği
   yedekler/servisim-islerim-22-eylul-2026/). */

/* ---------------------------------------------------------------- Hesap */

function Hesap({ oturum, onCikis, surum, ucretlereOdak }) {
  /* ÇIKIŞ ONAYLA YAPILIYOR (14 Eylül 2026, kullanıcının bildirdiği hata).
     Düğmeye basıldığı anda oturum kapanıyordu. Sahada eldivenle, tek
     elle kullanılan ekranda yanlış dokunuş kullanıcıyı giriş ekranına
     atıyor ve şifreyi yeniden yazdırıyordu. Onay yaprağı ne olacağını
     söylüyor, "Emin misiniz?" diye sormuyor (bkz. Kabuk.jsx → Onay). */
  const [cikisOnayi, setCikisOnayi] = useState(false)

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

      {/* ADRESLERİM KİMLİĞİN HEMEN ALTINDA (17 Eylül 2026, kullanıcının
          isteği). Hesap ekranında servisin kendi eliyle değiştirdiği tek
          iş verisi bu; alttaki liste PAKSAN'ın bağladığı, okunur bir
          liste. Gerekçe ve düzen ekranlar/Adreslerim.jsx başında. */}
      <Adreslerim oturum={oturum} />

      {/* ÜCRETLERİNİZ (23 Eylül 2026, kullanıcının isteği: "Servisim
          uygulamasında da kullanıcının güncel tarifeyi görebileceği bir
          alan yaratılmalı"). Ayrıntısı ekranlar/Ucretlerim.jsx başında. */}
      <Ucretlerim oturum={oturum} surum={surum} odak={ucretlereOdak} />

      <Bayilerim oturum={oturum} surum={surum} />

      <Bolum ad="Görünüm">
        <div className="kart" style={{ padding: 14 }}>
          <TemaSecici />
        </div>
      </Bolum>

      <Bolum ad="Güvenlik">
        <SifreDegistir oturum={oturum} />
      </Bolum>

      <Bolum ad="Oturum">
        <button className="dg dg--blok" onClick={() => setCikisOnayi(true)}>
          Çıkış Yap
        </button>
        <p className="kucuk sonuk" style={{ marginTop: 10 }}>
          Şifrenizi unutursanız {MARKA} yetkilinize başvurun.
        </p>
      </Bolum>

      {cikisOnayi && (
        <Onay
          baslik="Oturum kapanacak"
          metin="İşleriniz ve kayıtlarınız korunacak; tekrar giriş yapmak için şifreniz gerekecek."
          dugme="Çıkış Yap"
          onOnayla={() => {
            setCikisOnayi(false)
            servisOturumuKapat(oturum)
            onCikis()
          }}
          onVazgec={() => setCikisOnayi(false)}
        />
      )}
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
    let sonuc
    try {
      sonuc = await servisSifresiniDegistir(oturum.servisId, yeni, eski)
    } catch (e) {
      if (!ozetHatasiMi(e)) throw e
      return setHata(OZET_HATASI_METNI)
    }
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
