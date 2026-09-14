import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { load, save, remove } from '../lib/storage'
import { ozetHatasiMi } from '../lib/hesap'
import { duyuruGecerliMi } from '../lib/duyuruHedef'
import { Kabuk, Sayfa, Bolum, Bos, ListeKarti } from './Kabuk'
import { DEMO_HESAP, demoAPKmi } from './demoKimlik'
import {
  IconWrench,
  IconParca,
  IconPlus,
  IconBell,
  IconCalendar,
  IconShield,
  IconMachine,
  IconTag,
  IconAlert,
  IconCheckCircle,
  IconUndo,
  IconChevronDown as IconChevron,
} from '../components/Icons'
import { altBilgi } from '../data/duyuruTurleri'
import { makineDurumAdi } from '../data/talepAlanlari'
import { useBildirimIzni, useServisHaberi } from './haber'
import { Logo, MARKA, SIRKET, getProduct } from '../marka'
/* Çizimler Higgsfield ile üretildi, uygulamanın kendi görsel diline
   (kalın lacivert kontur, düz dolgu, sınırlı palet) referans verilerek.
   Küçültme ve sıkıştırma: tools/gorsel-hazirla.mjs */
import bosIsGorseli from '../assets/gorseller/servis-bos-is.png'
/* Giriş ekranının görseli: PAKSAN ORKINOS 1270'İN BAŞINDA SERVİS
   TEKNİSYENİ, ŞAFAKTA TARLADA.

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
import girisGorseli from '../assets/gorseller/servis-giris-orkinos.jpg'
import { TalepDetay } from './ekranlar/TalepDetay'
import { Parca } from './ekranlar/Parca'
import { Bayilerim } from './ekranlar/Bayilerim'
import { SiparisVer } from './ekranlar/SiparisVer'
import { Hakkedis } from './ekranlar/Hakkedis'
import { ElleKayit } from './ekranlar/ElleKayit'

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

/* GİRİŞ EKRANI ARTIK PANEL AÇILIŞI DEĞİL, UYGULAMA AÇILIŞI.

   Önce backoffice'in giriş kartını kullanıyordu: ekranın ortasında
   yüzen, gölgeli, 380 piksellik bir kutu. Bilgisayarda doğru — orada
   pencere büyük, kart onu toparlıyor. Telefonda aynı kutu, ekranın
   ortasına yapıştırılmış bir web sayfası gibi duruyor: üstünde ve
   altında ölü boşluk, kenarlarda kırpılmış bir çerçeve.

   Şimdi ekranın kendisi giriş ekranı. Görsel tepede, kenarlara
   dayanmış ve laciverde eriyor; başlık o geçişin üstünde, form alttan
   yükselen bir kâğıtta ve o kâğıt ekranın dibine kadar iniyor. Aynı
   üç şeyi soruyor, aynı yerden giriliyor; değişen yalnız durduğu
   yüzey.

   Şifre belirleme ekranı da buradan geçiyor: ikisi de oturum
   açılmadan görülen ekranlar ve aynı yüzeyde durmaları gerekiyor. */
function GirisEkrani({ baslik, aciklama, children }) {
  return (
    <div className="sgiris">
      <div className="sgiris__tepe">
        <img className="sgiris__resim" src={girisGorseli} alt="" />
        {/* Marka işareti tepede: kâğıtta başlıkla logo alt alta iki
            kimlik oluyordu. 20 pikselken kullanıcı çok küçük buldu;
            PAKSAN Connect karşılamasındakiyle aynı boyda. */}
        <Logo height={50} beyaz sadeceYazi className="sgiris__marka" />
        {/* Başlık fotoğrafın laciverde eridiği yerde, kâğıtta değil:
            resimle yazı tek yüzey olsun (bkz. servis.css → .sgiris__tepe). */}
        <div className="sgiris__baslikalani">
          <h1 className="sgiris__baslik">{baslik}</h1>
          {aciklama ? <p className="sgiris__alt">{aciklama}</p> : null}
        </div>
      </div>

      <div className="sgiris__kagit">{children}</div>
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
       başlık söylüyor. Hesabı olmayan için yol dipteki künye satırında. */
    <GirisEkrani baslik={`${MARKA} Servisim`}>
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

        <label className="sgiris__hatirla">
          <input
            type="checkbox"
            checked={hatirla}
            onChange={(e) => setHatirla(e.target.checked)}
          />
          <span>Beni Hatırla</span>
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

        <button
          className="dg dg--ana dg--blok sgiris__gir"
          type="submit"
          disabled={bekliyor}
        >
          {bekliyor ? 'Kontrol ediliyor…' : 'Giriş'}
        </button>

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
        <button className="dg dg--ana dg--blok sgiris__gir" type="submit">
          Kaydet
        </button>
      </form>
    </GirisEkrani>
  )
}

/* ------------------------------------------------------------- Uygulama */

const KAPALI = ['kapandi', 'iptal']

function Uygulama({ oturum, onCikis }) {
  const [sekme, setSekme] = useState('isler')
  const [acik, setAcik] = useState(null)
  /* Sekmelerin üstüne tam ekran açılan alt sayfa: 'kayit' | 'hesap'. */
  const [alt, setAlt] = useState(null)
  const [tazele, setTazele] = useState(0)
  const [talepler, setTalepler] = useState([])

  useEffect(() => {
    setTalepler(servisinTalepleri(talepleriGetir(), oturum.servisId))
  }, [oturum.servisId, tazele])

  /* Yeni iş, yola çıkan parça ve onaylanan hak ediş telefonun
     bildirim perdesine düşüyor (bkz. haber.js). */
  const yenile = useCallback(() => setTazele((x) => x + 1), [])
  useServisHaberi(oturum, yenile)

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
        onYenile={() => setAcik(talepleriGetir().find((t) => t.id === acik.id) || null)}
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
        <ElleKayit
          oturum={oturum}
          onKaydedildi={(talep) => {
            setAlt(null)
            setSekme('isler')
            setTazele((x) => x + 1)
            if (talep) setAcik(talep)
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
        <SiparisVer
          oturum={oturum}
          onKapat={() => setAlt(null)}
          onVerildi={() => {
            setAlt(null)
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

  /* ÜÇ SEKME VE ÜÇÜ DE SERVİSİN KENDİ İŞİ.

     "Ürünler" sekmesi kaldırıldı: yirmi makinenin kataloğunu
     listeliyordu ve servis makine satmıyor. Yerine hak ediş geldi —
     servisin bu uygulamada en çok merak ettiği şey.

     "Parça" sekmesi stok defteri tutuyordu; o da kaldırıldı, çünkü
     rakam hiçbir zaman gerçeğe uymuyordu (gerekçe ekranlar/Parca.jsx
     başında). Geriye ekranın işe yarayan tek parçası kaldı: sipariş.

     Kalan üçü servisin gününü anlatıyor: bekleyen işleri, ısmarladığı
     parçalar, alacağı para. */
  const sekmeler = [
    { id: 'isler', ad: 'İşlerim', Icon: IconWrench, rozet: bekleyen.length },
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
          onAc={setAcik}
          onYeniKayit={() => setAlt('kayit')}
        />
      )}
      {sekme === 'parca' && (
        <Parca
          oturum={oturum}
          onAc={setAcik}
          onSiparis={() => setAlt('siparis')}
          surum={tazele}
        />
      )}
      {sekme === 'hakkedis' && <Hakkedis oturum={oturum} onAc={setAcik} />}
    </Kabuk>
  )
}

/* ---------------------------------------------------------------- İşler */

/* ==========================================================================
   İşlerim — ekranın sırası

   ÖNCEKİ SIRA İŞİ EN ALTA İTİYORDU

   Bugün bloğu · Yeni Kayıt düğmesi · üç duyuru kartı · bekleyen işler.
   Servis sabah uygulamayı açtığında ekranda fuar duyurusu ve yeni
   model tanıtımı görüyor, gideceği işi görmek için iki ekran boyu
   aşağı kaydırıyordu. Bir saha uygulamasında ilk ekranda duracak tek
   şey vardır: BUGÜN NEREYE GİDİLECEK.

   YENİ SIRA

     1. Bugünün planı — yalnız plan varken. Randevu da gecikme de
        yoksa blok hiç çizilmiyor; "randevunuz yok" demek için koca
        bir kutu ayırmak, boşluğu bilgi diye sunmak.
     2. ACİL duyurular — geri çağırma ve uyarı. Bunlar duyuru değil
        iş emri: "bu makineleri arayıp servise çağırın" diyor.
     3. Bekleyen işler — asıl liste.
     4. Öteki duyurular — tek satırın ardında (kampanya, fuar, yeni
        ürün). Okunmayı hak ediyorlar ama işin önünde değil.
     5. Tamamlananlar — tek satırın ardında. Biten iş bir kayıt,
        bir görev değil.

   "Yeni Kayıt" gövdeden çıktı, üst çubuktaki "+" düğmesine taşındı.
   ========================================================================== */
function Isler({ oturum, bekleyen, biten, onAc, onYeniKayit }) {
  const [bitenAcik, setBitenAcik] = useState(false)

  /* Servisin henüz el sürmediği iş: randevu verilmemiş, kayıt
     açılmamış, PAKSAN'a devredilmemiş, parça ya da onay beklemiyor. */
  const [yeniIsler, devamEden] = useMemo(() => {
    const dokunulmamis = (t) =>
      !t.plan &&
      !t.servisKaydi &&
      !t.devir &&
      !['parcaBekliyor', 'onayBekliyor'].includes(t.status)
    return [bekleyen.filter(dokunulmamis), bekleyen.filter((t) => !dokunulmamis(t))]
  }, [bekleyen])

  return (
    <>
      <BildirimIzni />

      <Bugun bekleyen={bekleyen} onAc={onAc} />

      <ServisDuyurulari oturum={oturum} acil />

      {/* İKİ DUYURU AÇILIRI ALT ALTA.

          "PAKSAN duyuruları" bekleyen işlerin ALTINDA duruyordu;
          "Okuduğunuz uyarılar" üstünde. İkisi de tek satırlık kapalı
          bir başlık ve ikisi de aynı şeyi barındırıyor — okunmayı
          bekleyen ama işin önüne geçmeyen duyurular. Ekranın iki ayrı
          ucunda durmaları için sebep yoktu; ayrıca aradaki liste
          uzadıkça alttaki hiç görünmüyordu.

          Sıra korunuyor: acil olanlar hâlâ kart hâlinde ve en üstte.
          Kapalı iki satır bekleyen işleri 96 piksel aşağı itmiyor. */}
      <ServisDuyurulari oturum={oturum} />

      {/* YENİ VE DEVAM EDEN AYRI.

          Açık işlerin hepsi "Bekleyen" başlığı altında tek listedeydi:
          dün gelmiş, kimsenin dokunmadığı bir talep ile randevusu
          verilmiş, parçası yolda olan bir iş aynı görünüyordu. Servisin
          sabah sorduğu ilk soru "bana yeni ne düştü" ve cevabı listenin
          içinde kayboluyordu.

          Yeni: servisin henüz el sürmediği iş.
          Devam Eden: geri kalan açık işler. Her kartın altında neyi
          beklediği yazıyor (randevu günü, parça, onay).

          İKİSİ DE BOŞSA TEK BİR BOŞ EKRAN. İş yokken de bölüm
          çiziliyor: yalnız "Tamamlanan" görünseydi servis bekleyen
          işinin olup olmadığını bilemezdi. */}
      {yeniIsler.length === 0 && devamEden.length === 0 ? (
        <Bolum ad="Yeni" sayi={0}>
          <Bos
            gorsel={bosIsGorseli}
            baslik="Bekleyen işiniz yok"
            alt={
              biten.length > 0
                ? 'Tüm işleri tamamladınız. Dükkâna gelen bir müşteri için aşağıdaki Kayıt Aç düğmesine dokunun.'
                : 'Size bir talep geldiğinde burada görünecek. Dükkâna gelen bir müşteri için aşağıdaki Kayıt Aç düğmesine dokunun.'
            }
          />
        </Bolum>
      ) : (
        <>
          {yeniIsler.length > 0 && (
            <Bolum ad="Yeni" sayi={yeniIsler.length}>
              {yeniIsler.map((t) => (
                <TalepKarti key={t.id} talep={t} onAc={() => onAc(t)} />
              ))}
            </Bolum>
          )}
          {devamEden.length > 0 && (
            <Bolum ad="Devam Eden" sayi={devamEden.length}>
              {devamEden.map((t) => (
                <TalepKarti key={t.id} talep={t} onAc={() => onAc(t)} />
              ))}
            </Bolum>
          )}
        </>
      )}

      {/* Tamamlananlar kapalı başlıyor: biten iş bir kayıt, bir görev
          değil. Açık dururken bekleyen işlerle aynı ağırlıkta
          görünüyor ve listeyi uzatıyordu. */}
      {biten.length > 0 && (
        <div className="bolum">
          <button
            className="katla"
            onClick={() => setBitenAcik((x) => !x)}
            aria-expanded={bitenAcik}
          >
            <IconCheckCircle size={18} />
            <span>Tamamlanan işler</span>
            <span className="katla__sayi">{biten.length}</span>
            <IconChevron size={18} className={bitenAcik ? 'katla__ok--acik' : ''} />
          </button>
          {bitenAcik &&
            biten.map((t) => (
              <TalepKarti key={t.id} talep={t} onAc={() => onAc(t)} />
            ))}
        </div>
      )}
    </>
  )
}

/* İzin şeridi. Karar verilmişse hiç çıkmıyor; verilmediyse ne için
   izin istendiğini yazıyor. "Bildirimlere izin verin" tek başına bir
   şey anlatmıyor — servis neyi kaçırdığını bilmeli. */
function BildirimIzni() {
  const { durum, destekli, iste, BILDIRIM: B } = useBildirimIzni()

  if (!destekli || durum === null) return null
  if (durum === B.VERILDI || durum === B.DESTEKLENMIYOR) return null

  if (durum === B.ENGELLI || durum === B.REDDEDILDI) {
    return (
      <div className="not not--mavi">
        <IconBell size={19} />
        <div>
          <strong>Bildirimler kapalı</strong>
          <p>
            Yeni işlerden ve yola çıkan parçalardan haber alamıyorsunuz.
            Telefonunuzun ayarlarından bu uygulamaya bildirim izni
            verebilirsiniz.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="not not--mavi">
      <IconBell size={19} />
      <div>
        <strong>Yeni iş geldiğinde haberiniz olsun</strong>
        <p>
          Size bir iş düştüğünde, istediğiniz parça yola çıktığında ve
          kaydınız onaylandığında telefonunuza bildirim gelir.
        </p>
        <button
          className="dg dg--ana dg--blok"
          style={{ marginTop: 12 }}
          onClick={iste}
        >
          Bildirimlere İzin Ver
        </button>
      </div>
    </div>
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

  const bugunku = randevulu.filter((t) => gunBasi(t.plan.tarih) <= bugun)
  const yarinki = randevulu.filter((t) => gunBasi(t.plan.tarih) === yarin)
  const geciken = bekleyen.filter((t) => !t.plan && gecikmisMi(t))

  /* BLOK GÜNÜN PLANIDIR; PLAN YOKSA ÇIKMIYOR.

     Önceden bekleyen iş varsa hep çiziliyor ve çoğu sabah "Bugün için
     verilmiş randevunuz yok" yazan koca bir kutu oluyordu. Bir kutu
     bir şeyin olduğunu söylemek için vardır; olmadığını söylemek için
     ekranın en değerli yerini tutmaz.

     Gecikme özeti de blok zaten çıkıyorsa yazılıyor. Tek başına bir
     kutuya değmiyor: gecikmiş işin kartında kendi kırmızı satırı
     duruyor ve liste hemen altında. */
  if (!bugunku.length && !yarinki.length) return null

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

      {bugunku.length > 0 && (
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
      )}

      {!bugunku.length && yarinki.length > 0 && (
        <p className="bugun__bos">
          Bugün randevunuz yok; yarın {yarinki.length} randevunuz var.
        </p>
      )}

      {/* Gecikme altta ve tek satır: randevu somut bir plan, bu bir
          hatırlatma. Aynı ağırlıkta gösterilmemeleri gerekiyor. */}
      {geciken.length > 0 && (
        <div className="bugun__sayilar">
          <span className="bugun__rozet bugun__rozet--gec">
            {geciken.length} işin üzerinden 48 saat geçti
          </span>
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
  /* MAKİNE ADI KÜNYEDE. Servis yola çıkmadan hangi makineye gittiğini
     bilmek zorunda: alet çantası ve yedek parça ona göre hazırlanıyor.
     Bu bilgi talebin içinde vardı, listede yoktu. */
  const makine = talep.makine ? getProduct(talep.makine.productId)?.name : null
  const tekrar = (talep.tekrar || []).length > 0

  /* ARIZA KARTTA. Servis listeye bakarken "ne olmuş" sorusunun
     cevabını görmek istiyor; o bilgi talebin içinde vardı ama kartta
     yoktu ve sekiz kartı tek tek açmak gerekiyordu.

     Kaynak sırası müşterinin ne kadar anlattığına göre: belirti
     seçtiyse onlar, yazdıysa yazdığı, ikisi de yoksa makinenin
     durumu. */
  const ozet =
    (talep.belirtiler || []).join(', ') ||
    (talep.aciklama || '').trim() ||
    (talep.durum ? makineDurumAdi(talep.durum) : '')

  /* BEKLEYEN İŞİN NEYİ BEKLEDİĞİ. Parça bekleyen ve onay bekleyen
     talepler listede öteki işlerle aynı görünüyordu; servis hangisine
     gidebileceğini ancak açınca anlıyordu. */
  const bekleme =
    talep.status === 'parcaBekliyor'
      ? talep.parcaSevk
        ? 'Parça yolda'
        : 'Parça hazırlanıyor'
      : talep.status === 'onayBekliyor'
        ? `${MARKA} kaydı inceliyor`
        : null

  return (
    <ListeKarti
      ad={talep.ad || '—'}
      tur={talep.tur}
      turAdi={TUR_ADI[talep.tur] || talep.tur}
      uyari={tekrar ? 'Sorun devam ediyor' : null}
      kunye={
        <>
          {makine ? `${makine} · ` : ''}
          {yer}
        </>
      }
      ozet={ozet}
      /* Randevu listede de görünüyor: servis hangi işe gün verdiğini
         karta girmeden biliyor. Randevu yoksa yerini PAKSAN'ın devraldığı
         bilgisi alıyor — ikisi birden olmuyor. */
      /* Bekleme durumu randevunun önünde: parça beklerken verilmiş
         bir randevunun anlamı yok, servis o gün gidemez. */
      sol={
        bekleme ? (
          bekleme
        ) : talep.plan ? (
          <>
            <IconCalendar size={14} /> {randevuYazi(talep.plan)}
          </>
        ) : paksanda && talep.devir ? (
          `${MARKA} destek veriyor`
        ) : null
      }
      /* GECİKME YAZIYLA DA SÖYLENMİYOR ARTIK.

         Gecikmiş kartta sağda "48 saati geçti" yazıyordu. Kartın sol
         kenarındaki kırmızı şerit zaten aynı şeyi söylüyor ve yazı,
         servisin gerçekten kullandığı bilgiyi — işin ne kadar
         beklediğini — ekrandan siliyordu. Şerit uyarıyor, yazı
         süreyi veriyor; ikisi aynı yuvada yarışmıyor. */
      sag={gecenSure(talep.createdAt || talep.tarih)}
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

/* METİN ÜÇ SATIRDA KESİLİYOR.

   Geri çağırma metni beş paragraf olabiliyor ve kart 250 pikseli
   geçince bekleyen işler ekranın dışına düşüyordu. Servisin sabah
   göreceği ilk şey gideceği iş olmalı; uyarı onun üstünde ama
   önünde değil.

   Başlık hiç kesilmiyor — uyarının ne olduğu ilk satırda yazılı.
   "Tamamını oku" tek dokunuş, metnin tamamı açılıyor. */
function DuyuruKarti({ duyuru, okunmamis, onKapat }) {
  const bilgi = altBilgi(duyuru)
  const Ikon = DUYURU_IKON[bilgi.ikon] || IconBell
  const [tam, setTam] = useState(false)
  const uzun = (duyuru.metin || '').length > 150

  return (
    <div className={'duyuru duyuru--' + bilgi.ton}>
      <div className="duyuru__ust">
        <Ikon size={17} />
        <span className="duyuru__tur">{bilgi.ad}</span>
      </div>
      <strong className="duyuru__baslik">{duyuru.baslik}</strong>
      <p className={'duyuru__metin' + (uzun && !tam ? ' duyuru__metin--kisa' : '')}>
        {duyuru.metin}
      </p>
      {/* İki düğme tek satırda: alt alta dizildiklerinde kart 96
          piksel daha uzuyor ve bekleyen işler ekranın dışına
          düşüyordu. */}
      {(uzun || okunmamis) && (
        <div className="duyuru__dip">
          {uzun && (
            <button className="duyuru__daha" onClick={() => setTam((x) => !x)}>
              {tam ? 'Kısalt' : 'Tamamını oku'}
            </button>
          )}
          {okunmamis && (
            <button className="dg dg--kucuk" onClick={onKapat}>
              Anladım
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ACİL DUYURU İŞ EMRİDİR, DUYURU DEĞİL.

   Geri çağırma ve uyarı, servisten BİR ŞEY YAPMASINI istiyor: "bu
   makineleri kullanan müşterilerinizi arayıp servise çağırın". Fuar
   duyurusuyla ya da yeni model tanıtımıyla aynı yığında durmaları,
   ikisini de okunmaz yapıyordu.

   Acil olanlar bekleyen işlerin ÜSTÜNDE, açık hâlde; ötekiler
   listenin ALTINDA, tek satırın ardında.

   Ayrım duyurunun ÜST TÜRÜNDEN çıkıyor: 'uyari' (güvenlik uyarısı ve
   geri çağırma) acil, 'duyuru' (kampanya, yeni ürün, etkinlik) değil.
   Bu ayrım zaten backoffice formunda da var — orada da izin kuralı
   üst türe bakıyor (bkz. data/duyuruTurleri.js → DUYURU_UST). */

function ServisDuyurulari({ oturum, acil = false }) {
  const [hepsi, setHepsi] = useState([])
  const [gorulen, setGorulen] = useState(() => new Set(load(GORULEN, [])))
  const [acikMi, setAcikMi] = useState(false)

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

  const bolum = hepsi.filter((d) => (altBilgi(d).ust === 'uyari') === acil)
  if (!bolum.length) return null

  /* Acil bölümde okunmamışlar açık duruyor; okunanlar tek satıra
     iniyor. "Anladım" denen bir geri çağırma ekrandan tamamen
     kaybolmuyor — geri getirmenin yolu olmalı. */
  const yeniler = bolum.filter((d) => !gorulen.has(d.id))
  const okunmus = bolum.filter((d) => gorulen.has(d.id))

  if (acil) {
    return (
      <>
        {yeniler.map((d) => (
          <DuyuruKarti key={d.id} duyuru={d} okunmamis onKapat={() => kapat(d.id)} />
        ))}
        {okunmus.length > 0 && (
          <>
            <button
              className="katla"
              onClick={() => setAcikMi((x) => !x)}
              aria-expanded={acikMi}
            >
              <IconAlert size={18} />
              <span>Uyarılar</span>
              <span className="katla__sayi">{okunmus.length}</span>
              <IconChevron size={18} className={acikMi ? 'katla__ok--acik' : ''} />
            </button>
            {acikMi &&
              okunmus.map((d) => (
                <DuyuruKarti key={d.id} duyuru={d} okunmamis={false} />
              ))}
          </>
        )}
      </>
    )
  }

  return (
    <div className="bolum">
      <button
        className="katla"
        onClick={() => setAcikMi((x) => !x)}
        aria-expanded={acikMi}
      >
        <IconBell size={18} />
        <span>Duyurular</span>
        {yeniler.length > 0 && <span className="katla__sayi">{yeniler.length}</span>}
        <IconChevron size={18} className={acikMi ? 'katla__ok--acik' : ''} />
      </button>
      {acikMi &&
        bolum.map((d) => (
          <DuyuruKarti
            key={d.id}
            duyuru={d}
            okunmamis={!gorulen.has(d.id)}
            onKapat={() => kapat(d.id)}
          />
        ))}
    </div>
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

      <Bayilerim oturum={oturum} />

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
