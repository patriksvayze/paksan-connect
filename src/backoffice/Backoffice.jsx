import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SIRKET } from '../data/kimlik.js'
import logo from '../assets/logo/paksan-logo.png'
/* Giriş ekranının fotoğrafı: PAKSAN'ın kendi tarla çekimi (SÜPER
   S8002 E). Önce Higgsfield ile üretilmiş bir çizim vardı — makineyi
   temsil ediyordu ama firmanın makinesi değildi. Personelin her sabah
   gördüğü ilk ekranda üretilmiş bir çizimin durması için sebep yok:
   fotoğraf var.

   Ölçekleme ve JPEG sıkıştırma tools/gorsel-hazirla.mjs ile yapıldı,
   kaynağı tools/kaynak/backoffice-giris-girdi.jpg. Backoffice ayrı
   derlendiği için (dist-backoffice/) bu dosya APK'ya girmiyor. */
import girisGorseli from '../assets/gorseller/backoffice-giris.jpg'
import {
  izinli, oturumGetir, oturumKapat, oturumuBuSekmedeBirak, backofficeGiris, personelBaslat,
  personelGetir,
  rolBilgi, rolunTalepleri, sifreJetonuGecerli, sifreJetonuKullan, sifreTalebiOlustur,
  talepleriGetir, geriBildirimGetir, numaraTalepleriGetir, teklifBekliyorMu,
  makineKayitlariGetir, BACKOFFICE_SIFRE_HANE,
  servisSifreTalepleriGetir,
} from './veri'
import { servisiAtanmamisKayitlar } from '../lib/servisAtama'
import { baskaSekmeDegistirince } from '../lib/storage'
import { ozetHatasiMi } from '../lib/hesap'
import { bildirimGonder, izinDurumu, izinIste, sayiliBaslik } from './bildirim'
import { TemaSecici } from './Tema'
import {
  IconPano, IconTalep, IconUser, IconPin, IconMail, IconRapor,
  IconChat, IconBell, IconPhone, IconPersonel, IconKayit, IconMachine,
  IconCart,
  IconParca,
  IconTag,
  IconShield,
} from '../components/Icons'

import { Ozet } from './ekranlar/Ozet'
import { Duyurular } from './ekranlar/Duyurular'
import { DestekKayitlari } from './ekranlar/DestekKayitlari'
import { Raporlar } from './ekranlar/Raporlar'
import { Talepler } from './ekranlar/Talepler'
import { NumaraTalepleri } from './ekranlar/NumaraTalepleri'
import { Musteriler } from './ekranlar/Musteriler'
import { Personel } from './ekranlar/Personel'
import { Roller } from './ekranlar/Roller'
import { GeriBildirimler } from './ekranlar/GeriBildirimler'
import { Servisler } from './ekranlar/Servisler'
import { Bayiler } from './ekranlar/Bayiler'
import { ParcaKatalogu } from './ekranlar/ParcaKatalogu'
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
  /* Sayaç: servisi atanmamış MAKİNE (21 Eylül 2026, kullanıcının
     kararı). Atama makine başına: aynı müşterinin yem karmasına bir
     servis, balya makinesine başka bir servis bakabilir — her servis
     her makinede uzman değil. Personel sayıyı buradan görüyor, atamayı
     Kayıtlı Makineler ekranından yapıyor. Aynı gün önce Müşteriler
     düğmesinde müşteri sayısı olarak denenmiş, geri alınmıştı. */
  { id: 'makineler', ad: 'Kayıtlı Makineler', izin: 'makineler', sayac: 'servissiz', Ikon: IconMachine },
  { id: 'servisler', ad: 'Servisler', izin: 'servisler', sayac: 'sifreYardimi', Ikon: IconPin },
  /* Bayi ayrı bir ekran: kaydı var, paneli yok. Servisin çalıştığı
     bayiler Servisler ekranından bağlanıyor; burası künye. */
  { id: 'bayiler', ad: 'Bayiler', izin: 'servisler', Ikon: IconCart },
  /* Yedek parça kataloğu: müşterinin ve servisin gördüğü parça adını,
     grubunu ve fiyat listesini yöneten ekran. Katalog uygulamanın içinde
     değil, sunucudan iniyor (bkz. lib/parcaKatalogu.js). */
  { id: 'parcaKatalogu', ad: 'Yedek Parça Kataloğu', izin: 'parcaKatalogu', Ikon: IconParca },
  /* Müşteriler katalogdan sonra (6 Ekim 2026, kullanıcının isteği). */
  { id: 'musteriler', ad: 'Müşteriler', izin: 'musteriler', Ikon: IconUser },
  /* "SERVİS SİPARİŞLERİ" EKRANI KALDIRILDI.

     Servisin PAKSAN'dan istediği parça kendi deposunda ve kendi
     ekranında duruyordu. İki sonucu vardı: yedek parça personeli
     gününü Talepler ekranında geçiriyor ve o siparişleri hiç
     görmüyordu; ayrıca aynı iş iki ayrı yerde iki satır oluyordu.

     Sipariş artık normal bir yedek parça talebi — aynı listede, aynı
     durumlarda, aynı kapanışla (bkz. veri.js → servisParcaSiparisi).
     Yeni iş türü için yeni ekran açmak, sonunda hiçbir ekranın tam
     resmi göstermemesi demek. */
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
  /* Rol ve yetki düzenleme. `rolYonetimi` yetkisi varsayılan olarak yalnız
     admin rolünde; başka bir rolde bu satır menüde hiç görünmüyor. */
  { id: 'roller', ad: 'Roller ve Yetkiler', izin: 'rolYonetimi', Ikon: IconShield },
  { id: 'kayit', ad: 'İşlem Kaydı', izin: 'kayit', Ikon: IconKayit },
]

const ILK_EKRAN = 'ozet'

/* EKRAN ADRES ÇUBUĞUNDA (1 Ekim 2026, kullanıcının bildirdiği: "backoffice
   web tabanlı değilmiş gibi duruyor, sayfa geçişlerinde arama çubuğunda
   değişiklik olmuyor"). Açık ekran yalnız bellekteydi: tarayıcının Geri
   düğmesi panelden çıkıyordu, yenileyince hep Genel Bakış açılıyordu,
   bir ekranın bağlantısı kaydedilemiyor ve gönderilemiyordu.

   Ekran artık adresin `#/` kısmında: `backoffice.html#/talepler`. Menüden
   geçiş tarayıcı geçmişine bir satır ekliyor (Geri ve İleri ekranlar
   arasında gidiyor), yenileme aynı ekranı açıyor. `#` seçildi, yol
   (`/talepler`) değil: sunucuda her yolu bu sayfaya yönlendiren ayar
   gerekmiyor, derlenen klasör olduğu gibi yükleniyor. Şifre bağlantısının
   `?sifre=` kısmı ayrı, dokunulmadı.

   Süzgeç (Genel Bakış'taki kutudan Talepler'e taşınan) adreste yok; Geri
   ile dönülen ekran süzgeçsiz açılıyor. Yetkisi olmayan ekranın adresi
   Genel Bakış'a çevriliyor. Çıkışta adres temizleniyor: sonraki kişi
   öncekinin ekranında açılmıyor; gelen bir bağlantıyla giriş yapan ise o
   ekranda açılıyor. Sekmenin başlığı ekranın adını taşıyor (geçmiş
   listesinde ekranlar ayırt edilsin). Tur B-ADRES. */
const adrestekiEkran = () => {
  const id = location.hash.replace(/^#\/?/, '').split(/[?/]/)[0]
  return MENU.some((m) => m.id === id) ? id : ILK_EKRAN
}
const ekranAdresi = (id) => location.pathname + location.search + '#/' + id
/* Sayfanın kendi başlığı (backoffice.html); ekran adı önüne ekleniyor. */
const SAYFA_BASLIGI = typeof document !== 'undefined' ? document.title : ''

/* Aynı tarayıcıdaki backoffice sekmelerinin birbirine "bu kişi çıkış
   yaptı" dediği kanal (25 Eylül 2026, kullanıcı sınaması O6). Ad
   markasız: yalnız bu tarayıcının kendi sekmeleri arasında. */
const OTURUM_KANALI = 'backoffice-oturum'

/* Yeni iş kontrolü. Sunucu geldiğinde bu aralık yerine sunucu haber
   verecek; şimdilik sekme açıkken düzenli bakılıyor. */
const KONTROL_ARALIK = 15000

export function Backoffice() {
  const [oturum, setOturum] = useState(() => oturumGetir())
  const [ekran, setEkran] = useState(adrestekiEkran)
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

  /* Oturum kapanınca: adres temizleniyor, ekran Genel Bakış'a dönüyor. */
  const ekraniBirak = () => {
    history.replaceState(null, '', location.pathname + location.search)
    setEkran(ILK_EKRAN)
  }

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
      /* Yalnız servis atayabilene: atama yapamayan birine sayı göstermek
         yapamayacağı bir işi hatırlatmak olur. Atama 25 Eylül 2026'dan
         beri ayrı yetki (`makineAtama`; önce `servisDuzenle` idi, o izin
         servis hesabını da açıyordu). Kayıtlı Makineler'deki uyarı kartı
         ve Genel Bakış kutusu aynı kurala bakıyor. */
      servissiz: izinli(oturum.rol, 'makineAtama')
        ? servisiAtanmamisKayitlar(makineKayitlariGetir()).length
        : 0,
      /* Servisim'den "Şifremi Unuttum" diyen, aranmayı bekleyen servisler
         (22 Eylül 2026, kullanıcının isteği). Talep yalnız Servisler
         ekranının üstündeki kartta görünüyordu; ekranı açmayan personel
         haberdar olmuyordu, servis de "arayacaklar" diye bekliyordu. Kartı
         görebilen ve şifre sıfırlayabilen personele gösteriliyor. */
      sifreYardimi: izinli(oturum.rol, 'servisDuzenle')
        ? servisSifreTalepleriGetir().filter((t) => t.durum === 'bekliyor').length
        : 0,
    }
  }, [surum, oturum])

  useYeniIsHaberi(oturum, tazele)

  /* OTURUM SEKMEYE AİT (25 Eylül 2026, kullanıcı sınaması O6) ve BAŞKA
     SEKMENİN YAZDIĞI BU SEKMEDE DE GÖRÜNÜR (O7).

     Oturum açılışta bir kez okunuyordu. Kapatılan ya da silinen
     personelin açık sekmesi çalışmaya devam ediyor, rolü değişen kişi
     eski rolüyle kalıyordu. Rol, ücret ve iskonto değişikliği de öteki
     sekmelerde ancak sayfa yenilenince görünüyordu.

     Şimdi üç yerden haber geliyor:
       - Tarayıcının `storage` olayı: başka sekme depoya bir şey yazdı
         (rol, personel, talep…). Oturum yeniden denetleniyor ve ekran
         yeniden okunuyor. Olay yalnız ÖTEKİ sekmelere gidiyor; art arda
         gelen yazımlar 150 ms'de toplanıyor. Rollerin bellekteki kopyası
         aynı olayla boşalıyor (lib/icerikDeposu.js).
       - Sekme öne gelince (`focus`) oturum yeniden denetleniyor.
       - Sekmeler arası kanal: AYNI kişi başka sekmede çıkış yaptıysa bu
         sekme de giriş ekranına dönüyor. Başkasının oturumuna
         dokunulmuyor (veri.js → oturumuBuSekmedeBirak).

     Denetim yalnız okuyor; okurken kalıcı depoya yazmıyor, yoksa her
     sekme ötekini tetikleyip döngü kurardı (veri.js → oturumGetir'in
     devralma yazısı oturum deposuna gidiyor, olay üretmiyor). */
  const kanalRef = useRef(null)
  const denetle = useCallback(() => {
    if (!oturum) return
    const guncel = oturumGetir()
    if (!guncel) {
      ekraniBirak()
      setOturum(null)
      return
    }
    if (guncel.rol !== oturum.rol || guncel.ad !== oturum.ad) setOturum(guncel)
  }, [oturum])

  /* AYNI SEKMENİN YAZDIĞI DA DENETLENİYOR (25 Eylül 2026, inceleme).
     Tarayıcı `storage` olayını yazan sekmeye göndermiyor. Personel bu
     sekmede Personel ekranından kendi hesabını kapatır, siler ya da rolünü
     değiştirirse sekme eski kimlikle çalışmaya devam ediyordu; oturum ancak
     pencere odağı gidip gelince düşüyordu. Ekranlar yazdıktan sonra
     `tazele` çağırıyor; oturum o sürümle de yeniden okunuyor. */
  useEffect(() => {
    denetle()
  }, [surum]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!oturum) return undefined

    let bekleyen = null
    const birak = baskaSekmeDegistirince(() => {
      clearTimeout(bekleyen)
      bekleyen = setTimeout(() => {
        denetle()
        tazele()
      }, 150)
    })
    window.addEventListener('focus', denetle)

    let kanal = null
    if (typeof BroadcastChannel === 'function') {
      kanal = new BroadcastChannel(OTURUM_KANALI)
      kanal.onmessage = (e) => {
        if (e.data?.cikis && e.data.cikis === oturum.personelId) {
          oturumuBuSekmedeBirak()
          ekraniBirak()
          setOturum(null)
        }
      }
    }
    kanalRef.current = kanal

    return () => {
      clearTimeout(bekleyen)
      birak()
      window.removeEventListener('focus', denetle)
      kanal?.close()
      if (kanalRef.current === kanal) kanalRef.current = null
    }
  }, [oturum, tazele, denetle])

  /* Tarayıcının Geri ve İleri düğmesi: adres değişti, ekran ona uyuyor. */
  useEffect(() => {
    const dinle = () => {
      setSorgu(null)
      setEkran(adrestekiEkran())
    }
    window.addEventListener('popstate', dinle)
    return () => window.removeEventListener('popstate', dinle)
  }, [])

  /* Adres ve sekme başlığı açık ekranı söylüyor. Yetkisiz ya da bilinmeyen
     ekranın adresi Genel Bakış'a çevriliyor (geçmişe satır eklemeden). */
  useEffect(() => {
    if (!oturum || jeton) {
      document.title = SAYFA_BASLIGI
      return
    }
    const m = MENU.find((x) => x.id === ekran && (!x.izin || izinli(oturum.rol, x.izin)))
      || MENU.find((x) => x.id === ILK_EKRAN)
    if (location.hash !== '#/' + m.id) history.replaceState(null, '', ekranAdresi(m.id))
    document.title = `${m.ad} · ${SAYFA_BASLIGI}`
  }, [oturum, ekran, jeton])

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
             kaldığı ekranda açılmasın (çıkış adresi temizliyor). Bir
             ekranın bağlantısıyla gelindiyse o ekran açılıyor. */
          setEkran(adrestekiEkran())
          setOturum(o)
        }}
      />
    )
  }

  /* git('talepler', { durum: 'gecikmis' }) → ekranı açıp süzgeci kuruyor */
  const git = (hedef, istek = null) => {
    setSorgu(istek)
    setEkran(hedef)
    /* Yeni ekran geçmişe bir satır; aynı ekrana yeniden basmak eklemiyor. */
    if (location.hash !== '#/' + hedef) history.pushState(null, '', ekranAdresi(hedef))
  }

  const ortak = { personel: oturum.ad, rol: oturum.rol, bildir, tazele, surum, git, sorgu }

  const menu = MENU.filter((m) => !m.izin || izinli(oturum.rol, m.izin))

  /* Yetkisi olmayan bir ekranda kalmasın (rol değişmiş olabilir) */
  const acik = menu.some((m) => m.id === ekran) ? ekran : ILK_EKRAN

  const dugme = (m) => (
    <button
      key={m.id}
      className={'yan__bag' + (acik === m.id ? ' yan__bag--on' : '')}
      /* Ekran turu menü satırını kodla buluyor (tools/ekosistem-turu.mjs →
         B-ROL): kısıtlı rolün menüsü kısa, sıra tutmaz; yazı Codex'in. */
      data-menu={m.id}
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
          <img src={logo} alt={SIRKET.ad} />
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
        {acik === 'servisler' && <Servisler {...ortak} />}
        {acik === 'bayiler' && <Bayiler {...ortak} />}
        {acik === 'parcaKatalogu' && <ParcaKatalogu {...ortak} />}
        {acik === 'geribildirim' && <GeriBildirimler {...ortak} />}
        {acik === 'numara' && <NumaraTalepleri {...ortak} />}
        {acik === 'personel' && <Personel {...ortak} />}
        {acik === 'roller' && <Roller {...ortak} />}
        {acik === 'kayit' && <IslemKaydi {...ortak} />}
      </main>

      {profil && <Profil oturum={oturum} onKapat={() => setProfil(false)} />}

      {cikisOnayi && (
        <CikisOnayi
          oturum={oturum}
          onVazgec={() => setCikisOnayi(false)}
          onCik={() => {
            oturumKapat(oturum)
            /* Aynı kişinin bu tarayıcıdaki öteki sekmeleri de kapanıyor
               (O6). Mesaj bu sekmenin kendi kanalından gidiyor; kanal
               kendi mesajını almıyor. Kanal yoksa (eski tarayıcı) öteki
               sekme, sekme öne gelince kendi oturumuyla devam ediyor. */
            kanalRef.current?.postMessage({ cikis: oturum.personelId })
            setCikisOnayi(false)
            ekraniBirak()
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
            <b>{oturum.ad}</b> oturumu bu tarayıcıdaki bütün sekmelerde kapatılacak.
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
        <ProfilSatir k="Personel Numarası" v={kisi.no} mono />
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
              <button className="dg dg--ana" onClick={sifreDegistir}>Şifre Değiştir</button>
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
        Bildirimlere İzin Ver
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
        /* Servisim'den "Şifremi Unuttum" (22 Eylül 2026): artınca
           tarayıcı bildirimi gidiyor ve yan menüdeki Servisler sayacı
           sayfa yenilenmeden tazeleniyor. Yalnız şifre sıfırlayabilen
           personele — sayaçla aynı kural. */
        sifre: !izinli(oturum.rol, 'servisDuzenle') ? 0 : servisSifreTalepleriGetir().filter((t) => t.durum === 'bekliyor').length,
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
      if (yeni.sifre > eski.sifre) {
        bildirimGonder(sayiliBaslik(yeni.sifre - eski.sifre, 'Şifre Yardımı Talebi'), 'sifre')
      }
      if (
        yeni.talep !== eski.talep ||
        yeni.gorus !== eski.gorus ||
        yeni.teklif !== eski.teklif ||
        yeni.sifre !== eski.sifre
      ) {
        tazele()
      }

      onceki.current = yeni
    }, KONTROL_ARALIK)

    return () => clearInterval(zamanlayici)
  }, [oturum, tazele])
}

/* ------------------------------------------------------------------- Giriş */

/* ŞİFRE ÖZETİ ÜRETİLEMEDİĞİNDE YAZILACAK METİN.

   Tarayıcı güvenli kökende değilse (düz HTTP ile yayınlanan bir iç ağ
   adresi) şifre doğrulanamıyor; bkz. src/lib/hesap.js → ozet. Önceden
   bu durumda düğme "Giriliyor…" yazısında kalıyor, ekranda hiçbir şey
   çıkmıyordu.

   Metin personel diliyle yazıldı: backoffice'te terim yasağı yok ve
   "https" doğrudan geçiyor — yöneticinin yapacağı şey tam olarak o. */
const OZET_HATASI_METNI = 'Bağlantı güvenli olmadığı için şifre doğrulanamıyor. Adresi https ile açın veya yöneticinize başvurun.'

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
    /* Bekleme hâlinden çıkış `finally`de: hangi hata olursa olsun düğme
       kilitli kalmasın. */
    try {
      const sonuc = await backofficeGiris(kullanici, sifre)
      if (sonuc.hata) {
        setHata(sonuc.hata)
        return
      }
      onGiris(sonuc.oturum)
    } catch (e) {
      if (!ozetHatasiMi(e)) throw e
      setHata(OZET_HATASI_METNI)
    } finally {
      setBekliyor(false)
    }
  }

  if (unuttum) return <SifreTalebi onKapat={() => setUnuttum(false)} />

  return (
    <GirisSayfasi>
      <form className="giris__kart" onSubmit={gir}>
        <img className="giris__logo" src={logo} alt={SIRKET.ad} />
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
          {bekliyor ? 'Giriliyor…' : 'Giriş'}
        </button>

        <button className="giris__bag" type="button" onClick={() => setUnuttum(true)}>
          Şifremi Unuttum
        </button>

        <div className="giris__dip">
          {SIRKET.ad} · Hesabınız yoksa yöneticinize başvurun.
        </div>
      </form>
    </GirisSayfasi>
  )
}

/* Giriş, şifre talebi ve şifre değiştirme ekranlarının ortak zemini.

   FOTOĞRAF KARTIN İÇİNDE DEĞİL, SAYFANIN ÜSTÜNDE.

   Önce kartın içinde bir şeritti ve 380 piksele sıkışıyordu. Eldeki
   fotoğraf 1900x650 — bir kart şeridi için değil, sayfa başlığı için
   çekilmiş bir oran. Şerit olarak kullanmak makineyi 130 piksele
   indiriyordu.

   Şimdi tam genişlikte duruyor, kart alt kenarına biniyor. Kartın
   binmesi ikisini tek kompozisyon yapıyor; yan yana iki blok
   olmalarını engelliyor.

   Fotoğrafın altı lacivere eritiliyor: sayfanın geri kalanı zaten o
   renk ve fotoğraf keskin bir çizgiyle bitmiyor. */
function GirisSayfasi({ children }) {
  /* Kaydırma çubuğu için ayrılan pay `body`nin dışında; oradaki açık
     gri, koyu giriş ekranının sağında şerit gibi duruyordu. İşaret
     duruyorken `html` de laciverde boyanıyor. */
  useEffect(() => {
    const kok = document.documentElement
    kok.setAttribute('data-ekran', 'giris')
    return () => kok.removeAttribute('data-ekran')
  }, [])

  return (
    <div className="giris">
      <div className="giris__manzara">
        <img src={girisGorseli} alt="" />
      </div>
      {children}
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
    <GirisSayfasi>
      <form className="giris__kart" onSubmit={gonder}>
        <img className="giris__logo" src={logo} alt={SIRKET.ad} />
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
              Giriş Ekranına Dön
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
    </GirisSayfasi>
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
    try {
      const cevap = await sifreJetonuKullan(jeton, yeni)
      if (cevap.hata) {
        setHata(cevap.hata)
        return
      }
      setBitti(true)
    } catch (e) {
      if (!ozetHatasiMi(e)) throw e
      setHata(OZET_HATASI_METNI)
    } finally {
      setBekliyor(false)
    }
  }

  return (
    <GirisSayfasi>
      <form className="giris__kart" onSubmit={kaydet}>
        <img className="giris__logo" src={logo} alt={SIRKET.ad} />
        <div className="giris__baslik">Şifre Değiştirme</div>
        <div className="giris__cizgi" />

        {!kayit ? (
          <>
            <p className="giris__yazi">Bağlantı geçersiz veya süresi dolmuş.</p>
            <button className="dg dg--ana dg--lg" type="button" onClick={onBitti}>
              Giriş Ekranına Dön
            </button>
          </>
        ) : bitti ? (
          <>
          <p className="giris__yazi">Şifreniz değiştirildi.</p>
            <button className="dg dg--ana dg--lg" type="button" onClick={onBitti}>
              Giriş Yap
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
    </GirisSayfasi>
  )
}
