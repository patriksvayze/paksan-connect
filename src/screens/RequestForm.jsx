import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { TopBar, TabBar, Sheet } from '../components/Chrome'
import { getProduct, PRODUCTS, supportGroup, urunDilde } from '../data/products'
import { GonderButonu } from '../components/GonderButonu'
import { alanaGit } from '../lib/formOdak'
import {
  ULASIM_ZAMANI, PARCA_DIGER,
  makineDurumu, ulasimSecenekleri, urunTipiSecenekleri,
  araziSecenekleri, traktorSecenekleri, belirtiSecenekleri, parcaSecenekleri,
} from '../data/talepAlanlari'
import {
  KDV_ORANI, PARA_BIRIMI, PARCA_FIYAT_AKTIF, parcaFiyatBilgisi, parcaToplami, paraYaz,
} from '../data/parcaFiyat'
import { formatSerial } from '../lib/serial'
import { telKullanici, araProps } from '../lib/tel'
import { SesKaydi } from '../components/SesKaydi'
import { EkAlani } from '../components/EkAlani'
import { KonumAlani } from '../components/KonumAlani'
import { OnayKutusu } from '../components/Metin'
import { DekontAlani } from '../components/DekontAlani'
import { tcGecerliMi, vergiNoGecerliMi } from '../lib/kimlik'
import { talepNo } from '../lib/talep'
import { useGeriYakala } from '../lib/geriYakala'
import { numaraMetni } from '../data/numaraDegisikligi'
import { useDil } from '../i18n'
import { BANKA, SIRKET } from '../config'
import {
  IconCheckCircle, IconPhone, IconPin, IconRight, IconLock, IconCheck, IconAlert,
  IconPlus, IconMinus, IconCart, IconInfo,
} from '../components/Icons'

/* Tür başlıkları sözlükte: talep.servis.baslik gibi. Placeholder
   metinlerinde ikinci elden söz edilmiyor — PAKSAN ikinci el satışı
   yapmıyor, öyle bir örnek olmayan bir hizmeti çağrıştırır. */
const TURLER = ['servis', 'parca', 'satinalma']

/* Talep türü adres satırında (?tur=servis) taşınıyor. Tür değişince
   React bileşeni yeniden kurmuyor; eski formun içi (ve "gönderildi"
   ekranı) yeni türde de karşımıza çıkıyordu. `key` bunu engelliyor. */
export default function RequestForm() {
  const [params] = useSearchParams()
  return <TalepFormu key={params.get('tur') || 'servis'} />
}

function TalepFormu() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { user, machines, addRequest, updateUser, showToast } = useApp()
  const { t, dil } = useDil()
  const numaraM = numaraMetni(dil)

  const tur = TURLER.includes(params.get('tur')) ? params.get('tur') : 'servis'
  const cfg = (a) => t(`talep.${tur}.${a}`)

  const [makineId, setMakineId] = useState(params.get('makine') || machines[0]?.id || '')
  const [urunId, setUrunId] = useState(params.get('urun') || '')
  /* Destek ekranından gelindiyse konuşulan arıza açıklamaya hazır
     yazılıyor: müşteri aynı şeyi ikinci kez anlatmasın, servis de
     talebin arkasında ne konuşulduğunu görsün (bkz. Support.jsx). */
  const destekArizasi = params.get('destek') || ''
  const [aciklama, setAciklama] = useState(
    destekArizasi ? t('talep.destektenGeldi', { ariza: destekArizasi }) : ''
  )
  /* Yazı kutusunun alternatifi: { veri, sure } ya da null */
  const [ses, setSes] = useState(null)
  const [ekler, setEkler] = useState([])

  /* Talebi işe yarar hâle getiren alanlar — türe göre değişiyor */
  const [durum, setDurum] = useState('')
  const [belirtiler, setBelirtiler] = useState([])
  const [parcalar, setParcalar] = useState([])
  /* Parça başına adet: { 'Pikap dişi': 2 }.

     Ayrı bir alanda tutuluyor, `parcalar` dizisi olduğu gibi kalıyor.
     Backoffice’in raporları ("en çok istenen parçalar") ve Excel aktarımı o
     diziyi okuyor; biçimini değiştirmek geçmiş kayıtları da bozardı. */
  const [parcaAdet, setParcaAdet] = useState({})
  const [urunTipi, setUrunTipi] = useState('')
  const [arazi, setArazi] = useState('')
  const [traktor, setTraktor] = useState('')
  const [ulasim, setUlasim] = useState(ULASIM_ZAMANI[0])

  /* Belirti ve parça listeleri uzun. Hepsi birden açılınca ekran düğme
     duvarına dönüyordu; ilk altısı gösteriliyor, gerisi isteyene. */
  const [tumBelirti, setTumBelirti] = useState(false)
  const [tumParca, setTumParca] = useState(false)

  /* Ad, telefon ve konum formda sorulmuyor; hesaptan geliyor. Gönder'e
     basınca açılan onay penceresinde teyit ediliyor.

     TELEFON BURADA DA DEĞİŞTİRİLEMİYOR. Numara hesabın kimliği; burada
     serbest bırakmak, profildeki kilidi anlamsız kılardı. Numarası
     değişmiş kullanıcı, şifremi-unuttum ekranındakiyle aynı yola
     çıkıyor: değişikliği Paksan yapıyor.

     Konum serbest — orada güvenlik meselesi yok, ilçe teklifi hangi
     bayinin hazırlayacağını belirlediği için düzeltilebilmesi gerekiyor. */
  const [konumUlke, setKonumUlke] = useState(user?.konumUlke || user?.ulke || 'TR')
  const [il, setIl] = useState(user?.il || '')
  const [ilce, setIlce] = useState(user?.ilce || '')

  /* ---------------------------------------------- Yedek parça: 2. adım

     Yedek parça talebi tek ekranda bitmiyor: parça satın alınıyor,
     yani faturası kesilecek ve bir yere gönderilecek. O bilgiler
     olmadan talep işe yaramıyor — backoffice’e düşen talebi alan personel
     "kime keseyim, nereye yollayayım" diye telefon açmak zorunda
     kalıyordu.

     Talep numarası bu adımda ÜRETİLİYOR, gönderimde değil: müşteri
     havalenin açıklamasına o numarayı yazacak. Numara olmadan
     muhasebe hangi ödemenin hangi talep olduğunu bulamıyor. */
  const [adim, setAdim] = useState('form') /* 'form' | 'odeme' */
  const [no, setNo] = useState('')

  const [faturaTuzel, setFaturaTuzel] = useState(false)
  const [faturaBaskasi, setFaturaBaskasi] = useState(false)
  const [faturaAd, setFaturaAd] = useState('')
  const [faturaTc, setFaturaTc] = useState('')
  const [faturaTel, setFaturaTel] = useState('')
  const [faturaUnvan, setFaturaUnvan] = useState('')
  const [faturaVergiNo, setFaturaVergiNo] = useState('')
  const [faturaAdres, setFaturaAdres] = useState('')
  const [dekont, setDekont] = useState(null)
  const [odemeHata, setOdemeHata] = useState('')

  const [onay, setOnay] = useState(false)
  /* 'onay' → bilgiler doğru mu | 'konum' → il/ilçe düzelt
     'numara' → numaram değişti, ne yapmalıyım */
  const [pencere, setPencere] = useState('onay')
  const [hata, setHata] = useState('')
  const [onayHata, setOnayHata] = useState('')
  const [sonuc, setSonuc] = useState(null)
  const [gonderiliyor, setGonderiliyor] = useState(false)

  /* Seçili makinenin grubu: belirti ve parça listeleri buna göre geliyor.
     Rulo balyacısı olan kullanıcıya "helezon sıkışıyor" sormuyoruz. */
  const secilen = machines.find((m) => m.id === makineId)
  const grup = supportGroup(getProduct(secilen?.productId))

  /* AÇIKLAMA NE ZAMAN ZORUNLU?

     · Yedek parçada hep zorunlu: kaç adet istendiği başka türlü belli
       olmuyor.
     · Serviste yalnızca "Diğer" işaretlendiyse zorunlu. Belirti
       listesinden seçim yapıldıysa servis ekibi ne olduğunu zaten
       biliyor, bir de yazı yazdırmanın anlamı yok.
     · Fiyat teklifinde hiç zorunlu değil.

     Ses kaydı bırakıldıysa yazı zorunluluğu düşüyor — ikisi de aynı
     işi görüyor, kullanıcı hangisi kolayına geliyorsa onu seçsin. */
  /* AÇIKLAMA NE ZAMAN ZORUNLU?

     Yedek parçada ARTIK ZORUNLU DEĞİL. Eskiden zorunluydu çünkü adet
     bilgisi başka türlü alınamıyordu; artık adet ayrı bir alan ve
     parça listeden seçiliyor. Listeden "Pikap parmağı × 4" seçen
     çiftçiye ayrıca bir paragraf yazdırmanın karşılığı yok.

     İstisna: "Diğer" seçildiyse hâlâ zorunlu — o seçenekte ne
     istendiği yalnız yazıdan anlaşılıyor.

     Serviste yalnızca "Diğer" belirtisi işaretlendiyse zorunlu.
     Fiyat teklifinde hiç zorunlu değil.

     Ses kaydı bırakıldıysa yazı zorunluluğu düşüyor — ikisi de aynı
     işi görüyor. */
  const aciklamaZorunlu =
    !ses &&
    ((tur === 'parca' && parcalar.includes(PARCA_DIGER)) ||
      (tur === 'servis' && belirtiler.includes('Diğer')))
  /* Teklifi hangi bayinin hazırlayacağını ilçe belirliyor; onay
     penceresinde boş geçilemiyor. */
  const ilceZorunlu = tur === 'satinalma'

  /* Art arda hızlı dokunuşta seçim kaybolmasın diye listenin son hâli
     üzerinden çalışıyor. */
  function cevir(ayarla, deger) {
    ayarla((liste) =>
      liste.includes(deger) ? liste.filter((x) => x !== deger) : [...liste, deger]
    )
  }

  /* Parça seçilince adedi 1 oluyor, seçim kaldırılınca adet de
     siliniyor — yoksa vazgeçilen parçanın adedi kayıtta kalıyordu. */
  /* Parça seçimi.

     "Diğer" ÖZEL BİR SEÇENEK: listede olmayan bir parça isteniyor
     demek. Adet sorulmuyor (neyin adedi belli değil) ve yanına başka
     parça seçilemiyor — karışık bir talep hem fiyatlanamıyor hem de
     depoda toplanamıyor. Listeden bir parça seçilirse "Diğer"
     kendiliğinden kalkıyor, tersi de geçerli.

     Seçim kaldırılınca adet de siliniyor; yoksa vazgeçilen parçanın
     adedi kayıtta kalıyordu. */
  function parcaCevir(deger) {
    setParcalar((liste) => {
      const vardi = liste.includes(deger)

      if (vardi) {
        setParcaAdet((a) => {
          const yeni = { ...a }
          delete yeni[deger]
          return yeni
        })
        return liste.filter((x) => x !== deger)
      }

      if (deger === PARCA_DIGER) {
        setParcaAdet({})
        return [PARCA_DIGER]
      }

      setParcaAdet((a) => {
        const yeni = { ...a }
        delete yeni[PARCA_DIGER]
        yeni[deger] = 1
        return yeni
      })
      return [...liste.filter((x) => x !== PARCA_DIGER), deger]
    })
  }

  /* "Diğer" seçiliyken adet bölümü ve fiyat toplamı gösterilmiyor. */
  const digerSecili = parcalar.includes(PARCA_DIGER)
  const adetliParcalar = parcalar.filter((x) => x !== PARCA_DIGER)
  const hesap = parcaToplami(adetliParcalar, parcaAdet)

  /* En az 1, en çok 99. Üst sınır kaza koruması: düğmeye basılı kalan
     parmak 400 adet pikap dişi sipariş etmesin. */
  function adetDegis(deger, fark) {
    setParcaAdet((a) => ({
      ...a,
      [deger]: Math.min(99, Math.max(1, (a[deger] || 1) + fark)),
    }))
  }

  /* Android'in geri hareketi ödeme adımından uygulamayı kapatmasın,
     talep formuna dönsün — doldurulan fatura bilgileri kaybolmasın. */
  useGeriYakala(adim === 'odeme', () => setAdim('form'))

  /* Onay penceresindeki cümle türe göre değişiyor.

     Servis ve yedek parçada "sizi arayacağız" demiyoruz (bkz. talebin
     gönderildiği ekran); numara yine de doğru olmalı — gerektiğinde
     ulaşılacak tek adres o. */
  const onayYazisi =
    tur === 'satinalma' ? t('talep.onayAciklama') : t('talep.onayAciklamaUlasim')
  const numaraEtiketi =
    tur === 'satinalma' ? t('talep.arayacagimizNumara') : t('talep.ulasacagimizNumara')

  const ILK = 6 /* açılışta gösterilen seçenek sayısı */

  const belirtiListesi = belirtiSecenekleri(grup, dil)
  const parcaListesi = parcaSecenekleri(grup, dil)

  /* Kayıtlar Türkçe anahtarla tutuluyor; ekranda kullanıcının dilinde
     görünmeli (bkz. src/data/talepAlanlari.js). */
  const parcaEtiket = (deger) =>
    parcaListesi.find((x) => x.deger === deger)?.etiket || deger

  /* 1. adım — talebin kendisi doğru mu? */
  function gonder() {
    /* Sorun formun en üstünde olabiliyor ama kullanıcı en altta, gönder
       düğmesinin başında. Hem düğmenin üstüne kutu içinde ne eksik
       olduğu yazılıyor hem de o alan ekrana getirilip işaretleniyor. */
    const sorunlu = (alan, mesaj) => {
      setHata(mesaj)
      alanaGit(alan)
    }

    if (tur === 'servis' && !durum)
      return sorunlu('durum', t('talep.durumSecin'))
    if (tur === 'servis' && belirtiler.length === 0)
      return sorunlu('belirti', t('talep.belirtiSecin'))
    if (tur === 'parca' && parcalar.length === 0)
      return sorunlu('parca', t('talep.parcaSecin'))
    if (aciklamaZorunlu && aciklama.trim().length < 10)
      return sorunlu('aciklama', t('talep.aciklamaKisa'))

    setHata('')

    /* Yedek parçada araya fatura ve ödeme adımı giriyor; talep oradan
       gönderiliyor. Öteki türlerde doğrudan onay penceresi açılıyor. */
    if (tur === 'parca') {
      if (!no) setNo(talepNo('parca'))
      setOdemeHata('')
      setAdim('odeme')
      window.scrollTo(0, 0)
      return
    }

    /* Konum eksikse pencere doğrudan düzeltme kipinde açılsın,
       kullanıcı iki kez dokunmasın. */
    setPencere(!il || (ilceZorunlu && !ilce) ? 'konum' : 'onay')
    setOnayHata('')
    setOnay(true)
  }

  /* Fatura ve ödeme adımının kontrolü.

     Buradaki alanların hepsi faturanın kesilebilmesi için gerekli;
     eksik bilgiyle gönderilen talep backoffice’te bekliyor ve müşteri
     aranıyor — tam da kaçınmak istediğimiz şey. */
  function odemeDevam() {
    const sorunlu = (alan, mesaj) => {
      setOdemeHata(mesaj)
      alanaGit(alan)
    }

    if (faturaTuzel) {
      if (faturaUnvan.trim().length < 3) {
        return sorunlu('unvan', t('parcaOdeme.unvanEksik'))
      }
      if (!vergiNoGecerliMi(faturaVergiNo)) {
        return sorunlu('vergiNo', t('parcaOdeme.vergiNoHatali'))
      }
    } else {
      /* Kontrol sırası ekrandaki sırayla aynı: önce ad, sonra kimlik.
         Yoksa kullanıcı en alttaki hataya gönderiliyor, düzeltiyor,
         bu sefer yukarıdaki hata çıkıyor. */
      if (faturaBaskasi && faturaAd.trim().length < 3) {
        return sorunlu('faturaAd', t('parcaOdeme.adEksik'))
      }
      if (!tcGecerliMi(faturaTc)) {
        return sorunlu('tc', t('parcaOdeme.tcHatali'))
      }
    }

    if (faturaBaskasi && faturaTel.replace(/\D/g, '').length < 10) {
      return sorunlu('faturaTel', t('parcaOdeme.telEksik'))
    }
    if (faturaAdres.trim().length < 15) {
      return sorunlu('adres', t('parcaOdeme.adresEksik'))
    }
    if (!dekont) {
      return sorunlu('dekont', t('parcaOdeme.dekontEksik'))
    }

    setOdemeHata('')
    setPencere(!il ? 'konum' : 'onay')
    setOnayHata('')
    setOnay(true)
  }

  /* Backoffice’e giden fatura kaydı.

     "Başkası adına" işaretlenmediyse ad ve telefon hesaptan geliyor;
     müşteriye iki kez yazdırmanın anlamı yok ve hesaptaki bilgi zaten
     doğrulanmış olan. */
  function faturaBilgisi() {
    const ortak = {
      tuzel: faturaTuzel,
      tel: faturaBaskasi ? faturaTel.trim() : telKullanici(user),
      adres: faturaAdres.trim(),
      il,
      ilce,
      ulke: konumUlke,
      farkliKisi: faturaBaskasi,
    }
    if (faturaTuzel) {
      return {
        ...ortak,
        unvan: faturaUnvan.trim(),
        vergiNo: faturaVergiNo.replace(/\D/g, ''),
      }
    }
    return {
      ...ortak,
      ad: faturaBaskasi ? faturaAd.trim() : user?.ad || '',
      tc: faturaTc.replace(/\D/g, ''),
    }
  }

  /* 2. adım — kendisine ulaşacağımız bilgi doğru mu?

     Gönderim sunucudan cevap gelene kadar sürüyor. O sürede düğme
     "Gönderiliyor" durumunda kalıyor ve ikinci kez basılamıyor: tarlada
     şebeke zayıfken kullanıcı sabırsızlanıp tekrar basarsa aynı talep
     iki kez gitmesin. Cevap gelmezse pencere kapanmıyor, hata gösterilip
     aynı yerden yeniden denenebiliyor — doldurulan form kaybolmuyor. */
  async function onayla() {
    if (gonderiliyor) return
    if (!il) {
      setPencere('konum')
      return setOnayHata(t('talep.ilSecin'))
    }
    if (ilceZorunlu && !ilce) {
      setPencere('konum')
      return setOnayHata(t('talep.ilceSecin'))
    }

    /* Konum düzeltildiyse hesaba da işlensin — bir daha sorulmasın.
       Telefona burada dokunulmuyor; onu yalnızca Paksan değiştirebiliyor. */
    if (il !== user?.il || ilce !== (user?.ilce || '')) {
      updateUser({ konumUlke, il, ilce })
      showToast(t('talep.konumGuncellendi'))
    }

    setOnayHata('')
    setGonderiliyor(true)

    const makine = machines.find((m) => m.id === makineId)
    let r
    try {
      r = await addRequest({
        tur,
        /* Yedek parçada numara ödeme adımında üretildi; müşteri onu
           havalenin açıklamasına yazdı, aynısı kalmalı. */
        ...(no ? { no } : {}),
        aciklama: aciklama.trim(),
        /* Ses kaydı — sunucu gelene kadar talebin içinde duruyor */
        ses,
        /* Fotoğraf ve videolar IndexedDB'de; burada yalnız kimlikleri */
        ekler: tur === 'satinalma' ? [] : ekler,
        makine: makine
          ? { id: makine.id, serial: makine.serial, productId: makine.productId }
          : null,
        urunId: tur === 'satinalma' ? urunId || null : null,
        durum: tur === 'servis' ? durum : null,
        belirtiler: tur === 'servis' ? belirtiler : [],
        parcalar: tur === 'parca' ? parcalar : [],
        parcaAdet: tur === 'parca' ? parcaAdet : null,
        /* Fatura, teslimat ve dekont — yalnız yedek parçada */
        fatura: tur === 'parca' ? faturaBilgisi() : null,
        dekont: tur === 'parca' ? dekont : null,
        urunTipi: tur === 'satinalma' ? urunTipi : '',
        arazi: tur === 'satinalma' ? arazi : '',
        traktor: tur === 'satinalma' ? traktor : '',
        ulasim,
        /* Ad ve telefon hesaptan alınıyor; kullanıcıya tekrar
           yazdırılmıyor, burada değiştirilemiyor. */
        ad: user?.ad || '',
        tel: telKullanici(user),
        telUlke: user?.ulke || '',
        telHam: user?.tel || '',
        il,
        ilce,
      })
    } catch {
      setOnayHata(t('talep.gonderilemedi'))
      return
    } finally {
      setGonderiliyor(false)
    }

    setOnay(false)
    setSonuc(r)
    window.scrollTo(0, 0)
  }

  /* --------------------------------------------------- Gönderildi ekranı */
  if (sonuc) {
    const teklifUrunu = sonuc.urunId ? urunDilde(getProduct(sonuc.urunId), dil) : null
    return (
      <div className="app">
        <TopBar title={t('talep.alindi')} />
        <div className="screen wrap" style={{ paddingTop: 28 }}>
          <div className="card center" style={{ padding: '30px 20px' }}>
            <div style={{ color: 'var(--pk-green)' }}>
              <IconCheckCircle size={62} />
            </div>
            <h2 style={{ fontSize: 21, marginTop: 12 }}>{t('talep.ulasti')}</h2>
            {/* Talep türüne göre farklı söz veriyoruz.

                Önceden hepsinde "sizi arayacağız" yazıyordu. Servis ve
                yedek parçada bu doğru değil: servis randevusu backoffice’ten
                planlanıp bildirimle gidiyor, parça hazırlanıp kargoya
                veriliyor — ikisinde de aramayı gerektiren bir şey yok.
                Tutulmayacak bir söz vermek, tutulan sözü de
                değersizleştiriyor.

                Fiyat teklifinde arama gerçekten oluyor: satış ekibi
                fiyatı telefonda konuşuyor. Orada söz duruyor. */}
            <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
              {sonuc.tur === 'satinalma'
                ? t('talep.arayacagiz', {
                    ne: sonuc.ulasim === ULASIM_ZAMANI[0] ? t('talep.enKisaSurede') : sonuc.ulasim,
                    tel: sonuc.tel,
                  })
                : t('talep.uygulamadanBilgi')}
            </p>
            <div className="divider" />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted small">{t('talep.talepNo')}</span>
              <strong className="serial-mono">{sonuc.no}</strong>
            </div>
          </div>

          {/* Fiyat teklifinden sonra ürünün kendi sayfasına davet.

              Teklif isteyen kişi o makineyi merak ediyor; satış ekibi
              dönene kadar teknik özellikleri, fotoğrafları ve bakım
              takvimi elinin altında olsun. YÖNLENDİRME KENDİLİĞİNDEN
              YAPILMIYOR — "talebiniz alındı" ekranından habersiz başka
              bir sayfaya atmak, işin bittiğini görmek isteyen kişiyi
              şaşırtır. Soruluyor, isteyen dokunuyor. */}
          {sonuc.tur === 'satinalma' && teklifUrunu && (
            <button
              className="card card--tap"
              style={{ marginTop: 16, padding: 16, textAlign: 'left', width: '100%' }}
              onClick={() => nav('/urun/' + teklifUrunu.id)}
            >
              <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                <span
                  className="listitem__icon"
                  style={{ background: 'var(--pk-blue-soft)', color: 'var(--pk-blue)' }}
                >
                  <IconInfo size={22} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, lineHeight: 1.45 }}>
                    {t('talep.urunuIncele', { ad: teklifUrunu.name })}
                  </span>
                  <span className="small muted" style={{ display: 'block', marginTop: 2 }}>
                    {t('talep.urunuInceleAlt')}
                  </span>
                </span>
                <IconRight size={20} />
              </div>
            </button>
          )}

          {/* Yedek parçada ödeme kontrolü var; müşteri sıradaki adımı
              bilsin ki "para gitti, ses yok" hissi oluşmasın. */}
          {sonuc.tur === 'parca' && (
            <div className="uyari-kart" style={{ marginTop: 16 }}>
              {t('parcaOdeme.sonrakiAdim')}
            </div>
          )}

          {/* Buraya "acele mi, bizi arayın" gibi bir yönlendirme kasıtlı
              olarak konmuyor. Talep açan müşteriyi telefona yollamak hem
              az önce yaptığı işi anlamsız kılıyor hem de santral yükünü
              artırıyor. Talep yazılı geldi, takibi de yazılı olacak. */}
          <div className="stack" style={{ marginTop: 18 }}>
            <button className="btn btn--primary" onClick={() => nav('/', { replace: true })}>
              {t('ortak.anaSayfayaDon')}
            </button>
            <button className="btn btn--soft" onClick={() => nav('/talebim/' + sonuc.id)}>
              {t('talep.talebiGor')}
            </button>
          </div>
        </div>
        <TabBar />
      </div>
    )
  }

  /* ------------------------------------------- Fatura ve ödeme adımı

      YALNIZ YEDEK PARÇADA. Servis ve fiyat teklifi bir hizmet talebi;
      yedek parça ise satış. Satışın faturası kesiliyor ve parça bir
      yere gönderiliyor — o bilgiler alınmadan talep işe yaramıyor.

      Ekran talep formunun ÜSTÜNE değil, ARDINA konuldu: kullanıcı önce
      ne istediğini söylüyor, sonra parayı konuşuyor. Tersi olsaydı
      daha ilk ekranda kimlik numarası isteyen bir uygulamayla
      karşılaşırdı.

      Form durumu kaybolmuyor: aynı bileşenin içinde ayrı bir adım,
      geri dönülünce seçimler yerinde duruyor. */
  if (adim === 'odeme') {
    return (
      <div className="app">
        <TopBar
          title={t('parcaOdeme.baslik')}
          sub={t('parcaOdeme.altBaslik')}
          back={() => setAdim('form')}
        />

        <div className="screen wrap talep-form" style={{ paddingTop: 20 }}>
          <div className="stack" style={{ gap: 20 }}>
            {/* Ne sipariş edildiğinin ve ne kadar tutacağının özeti.

                Ödeme yapılacak ekran burası; gönderilecek tutarın
                ekranın en üstünde, tek bakışta okunur olması gerekiyor.
                Müşteri bankacılık uygulamasına geçmeden önce son kez
                buraya bakıyor. */}
            <div className="card" style={{ padding: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                {t('parcaOdeme.ozet')}
              </div>
              {adetliParcalar.map((p) => {
                const bilgi = parcaFiyatBilgisi(p)
                const adet = parcaAdet[p] || 1
                return (
                  <div key={p} className="detay-satir">
                    <span>
                      {parcaEtiket(p)}
                      <span className="detay-satir__alt"> {adetYaz(adet)}</span>
                    </span>
                    <span className="detay-satir__vurgu">
                      {bilgi ? paraYaz(bilgi.fiyat * adet) + ' ' + PARA_BIRIMI : '—'}
                    </span>
                  </div>
                )
              })}
              {digerSecili && (
                <div className="detay-satir">
                  <span>{parcaEtiket(PARCA_DIGER)}</span>
                  <span className="small muted">{t('parcaFiyat.sonraBelirlenecek')}</span>
                </div>
              )}

              {PARCA_FIYAT_AKTIF && hesap.araToplam > 0 && (
                <div className="tutar-kutu" style={{ marginTop: 12 }}>
                  <div className="tutar-kutu__satir">
                    <span>{t('parcaFiyat.araToplam')}</span>
                    <span>{paraYaz(hesap.araToplam)} {PARA_BIRIMI}</span>
                  </div>
                  <div className="tutar-kutu__satir">
                    <span>{t('parcaFiyat.kdv', { oran: KDV_ORANI * 100 })}</span>
                    <span>{paraYaz(hesap.kdv)} {PARA_BIRIMI}</span>
                  </div>
                  <div className="tutar-kutu__satir tutar-kutu__satir--toplam">
                    <span>{t('parcaFiyat.gonderilecek')}</span>
                    <span>{paraYaz(hesap.toplam)} {PARA_BIRIMI}</span>
                  </div>
                </div>
              )}

              <div className="divider" />
              <div className="detay-satir">
                <span className="small muted">{t('talep.talepNo')}</span>
                <span className="serial-mono">{no}</span>
              </div>
              <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
                {t('parcaFiyat.kargoHaric')}
              </p>
            </div>

            {/* -------------------------------------------- Fatura tipi */}
            <div className="field">
              <span className="field__label">{t('parcaOdeme.faturaTipi')}</span>
              <div className="durumlar">
                <button
                  className={'durum' + (!faturaTuzel ? ' durum--on' : '')}
                  onClick={() => setFaturaTuzel(false)}
                >
                  <span className="durum__isaret" />
                  <span>
                    <span className="durum__ad">{t('parcaOdeme.gercekKisi')}</span>
                    <span className="durum__alt">{t('parcaOdeme.gercekKisiAlt')}</span>
                  </span>
                </button>
                <button
                  className={'durum' + (faturaTuzel ? ' durum--on' : '')}
                  onClick={() => setFaturaTuzel(true)}
                >
                  <span className="durum__isaret" />
                  <span>
                    <span className="durum__ad">{t('parcaOdeme.tuzelKisi')}</span>
                    <span className="durum__alt">{t('parcaOdeme.tuzelKisiAlt')}</span>
                  </span>
                </button>
              </div>
            </div>

            {/* -------------------------------------------- Gerçek kişi */}
            {!faturaTuzel && (
              <>
                {/* SIRA ÖNEMLİ: önce "kime kesilecek", sonra o kişinin
                    bilgileri — kimlik numarası dâhil.

                    Önceki düzende TC kimlik numarası kutusu en üstteydi,
                    "başkası adına" kutucuğu onun ALTINDAydı. Kullanıcı
                    kendi numarasını yazıyor, sonra kutucuğu işaretleyip
                    başkasının adını ve telefonunu giriyor, ama yukarıda
                    kalan kimlik numarasını değiştirmeyi unutuyordu.
                    Sonuç: bir kişinin adına, başkasının kimlik
                    numarasıyla kesilmiş fatura. Muhasebede fark edilene
                    kadar da anlaşılmıyor.

                    Şimdi kimlik numarası, adı ve telefonu ile aynı
                    öbekte ve onlardan sonra geliyor. */}
                <OnayKutusu
                  cumle={t('parcaOdeme.baskasiAdina')}
                  deger={faturaBaskasi}
                  onDegis={setFaturaBaskasi}
                />

                {faturaBaskasi ? (
                  <>
                    <label className="field" data-alan="faturaAd">
                      <span className="field__label">{t('parcaOdeme.adSoyad')}</span>
                      <input
                        className="input"
                        value={faturaAd}
                        onChange={(e) => setFaturaAd(e.target.value)}
                        placeholder={t('parcaOdeme.adIpucu')}
                      />
                    </label>
                    <label className="field" data-alan="faturaTel">
                      <span className="field__label">{t('parcaOdeme.telefon')}</span>
                      <input
                        className="input"
                        inputMode="tel"
                        value={faturaTel}
                        onChange={(e) => setFaturaTel(e.target.value)}
                      />
                    </label>
                  </>
                ) : (
                  <KayitliBilgi
                    ad={user?.ad}
                    tel={telKullanici(user)}
                    etiket={t('parcaOdeme.hesaptan')}
                  />
                )}

                <label className="field" data-alan="tc">
                  <span className="field__label">
                    {faturaBaskasi ? t('parcaOdeme.tcNoBaskasi') : t('parcaOdeme.tcNo')}
                  </span>
                  <input
                    className="input"
                    inputMode="numeric"
                    maxLength={11}
                    value={faturaTc}
                    onChange={(e) => setFaturaTc(rakam(e.target.value, 11))}
                    placeholder={t('parcaOdeme.tcIpucu')}
                  />
                  <span className="field__hint">
                    {faturaBaskasi
                      ? t('parcaOdeme.tcAciklamaBaskasi')
                      : t('parcaOdeme.tcAciklama')}
                  </span>
                </label>
              </>
            )}

            {/* --------------------------------------------- Tüzel kişi */}
            {faturaTuzel && (
              <>
                <label className="field" data-alan="unvan">
                  <span className="field__label">{t('parcaOdeme.unvan')}</span>
                  <input
                    className="input"
                    value={faturaUnvan}
                    onChange={(e) => setFaturaUnvan(e.target.value)}
                    placeholder={t('parcaOdeme.unvanIpucu')}
                  />
                  <span className="field__hint">{t('parcaOdeme.unvanAciklama')}</span>
                </label>

                <label className="field" data-alan="vergiNo">
                  <span className="field__label">{t('parcaOdeme.vergiNo')}</span>
                  <input
                    className="input"
                    inputMode="numeric"
                    maxLength={10}
                    value={faturaVergiNo}
                    onChange={(e) => setFaturaVergiNo(rakam(e.target.value, 10))}
                  />
                </label>

                <OnayKutusu
                  cumle={t('parcaOdeme.farkliTelefon')}
                  deger={faturaBaskasi}
                  onDegis={setFaturaBaskasi}
                />

                {faturaBaskasi ? (
                  <label className="field" data-alan="faturaTel">
                    <span className="field__label">{t('parcaOdeme.telefon')}</span>
                    <input
                      className="input"
                      inputMode="tel"
                      value={faturaTel}
                      onChange={(e) => setFaturaTel(e.target.value)}
                    />
                  </label>
                ) : (
                  <KayitliBilgi tel={telKullanici(user)} etiket={t('parcaOdeme.hesaptan')} />
                )}
              </>
            )}

            {/* --------------------------------------- Teslimat adresi */}
            <div className="field" data-alan="adres">
              <span className="field__label">{t('parcaOdeme.adresBaslik')}</span>
              <KonumAlani
                ulke={konumUlke}
                onUlke={setKonumUlke}
                il={il}
                onIl={setIl}
                ilce={ilce}
                onIlce={setIlce}
              />
              <textarea
                className="textarea"
                style={{ marginTop: 12 }}
                value={faturaAdres}
                onChange={(e) => setFaturaAdres(e.target.value)}
                placeholder={t('parcaOdeme.adresIpucu')}
              />
              <span className="field__hint">{t('parcaOdeme.adresAciklama')}</span>
            </div>

            {/* ------------------------------------------------- Ödeme */}
            <div className="field">
              <span className="field__label">{t('parcaOdeme.hesapBaslik')}</span>
              <Hesaplar no={no} ad={user?.ad} t={t} showToast={showToast} />
            </div>

            <DekontAlani dekont={dekont} onDegis={setDekont} />

            {odemeHata && (
              <div className="hata-kutu">
                <span className="hata-kutu__ikon"><IconAlert size={20} /></span>
                {odemeHata}
              </div>
            )}

            <button className="btn btn--primary btn--lg" onClick={odemeDevam}>
              <IconCart size={21} /> {t('parcaOdeme.gonder')}
            </button>
            <button className="btn btn--soft" onClick={() => setAdim('form')}>
              {t('parcaOdeme.geriDon')}
            </button>
          </div>
        </div>

        {/* Onay penceresi.

            ÖTEKİ TALEPLERDEN TEK FARKI: burada "konumumu düzelt"
            satırı YOK. Sebebi ekranın kendisi — teslimat adresi il ve
            ilçesiyle birlikte hemen yukarıda, kullanıcının az önce
            doldurduğu hâliyle duruyor. Aynı bilgiyi pencerede ikinci
            kez sormak "hangisi, adresim mi konumum mu?" sorusunu
            doğuruyordu; ikisi de aynı alan.

            Numara kilidi ve "bu numarayı kullanmıyorum" yolu ise
            aynen duruyor: kilit her ekranda aynı sebeple var. */}
        <Sheet
          open={onay}
          onClose={() => setOnay(false)}
          title={
            pencere === 'numara' ? t('talep.numaraBaslik') : t('talep.onayBaslik')
          }
        >
          <div className="stack" style={{ gap: 14 }}>
            {pencere === 'onay' && (
              <>
                <p className="muted" style={{ lineHeight: 1.6 }}>{onayYazisi}</p>

                <div className="onay-kutu">
                  <span className="onay-kutu__ikon"><IconLock size={19} /></span>
                  <span className="onay-kutu__body">
                    <span className="onay-kutu__etiket">{numaraEtiketi}</span>
                    <span className="onay-kutu__deger">{telKullanici(user) || '—'}</span>
                  </span>
                </div>
                <button
                  className="small"
                  style={{ color: 'var(--pk-blue)', textDecoration: 'underline', textAlign: 'left' }}
                  onClick={() => setPencere('numara')}
                >
                  {t('talep.kullanmiyorum')}
                </button>

                <div className="onay-kutu">
                  <span className="onay-kutu__ikon"><IconPin size={20} /></span>
                  <span className="onay-kutu__body">
                    <span className="onay-kutu__etiket">{t('parcaOdeme.teslimat')}</span>
                    <span className="onay-kutu__deger">
                      {ilce ? `${ilce} / ${il}` : il || '—'}
                    </span>
                  </span>
                </div>

                {onayHata && <div className="field__error">{onayHata}</div>}

                <GonderButonu
                  gonderiliyor={gonderiliyor}
                  etiket={t('talep.evetGonder')}
                  gonderiliyorEtiket={t('ortak.gonderiliyor')}
                  onClick={onayla}
                />
                <button
                  className="btn btn--soft"
                  onClick={() => setOnay(false)}
                  disabled={gonderiliyor}
                >
                  {t('ortak.vazgec')}
                </button>
              </>
            )}

            {pencere === 'numara' && (
              <NumaraDegisti
                numaraM={numaraM}
                showToast={showToast}
                onGeri={() => setPencere('onay')}
              />
            )}
          </div>
        </Sheet>

        <TabBar />
      </div>
    )
  }

  /* --------------------------------------------------------------- Form */
  return (
    <div className="app">
      <TopBar title={cfg('baslik')} back />

      <div className="screen wrap talep-form" style={{ paddingTop: 20 }}>
        <div className="stack" style={{ gap: 20 }}>
          {/* Makine seçimi */}
          {(tur === 'servis' || tur === 'parca') && (
            <label className="field">
              <span className="field__label">{t('talep.hangiMakine')}</span>
              {machines.length > 0 ? (
                <select
                  className="select"
                  value={makineId}
                  onChange={(e) => setMakineId(e.target.value)}
                >
                  <option value="">{t('talep.makineSec')}</option>
                  {machines.map((m) => {
                    const pr = urunDilde(getProduct(m.productId), dil)
                    return (
                      <option key={m.id} value={m.id}>
                        {pr?.name +
                          (m.nickname ? ` (${m.nickname})` : '') +
                          ' · ' +
                          formatSerial(m.serial)}
                      </option>
                    )
                  })}
                </select>
              ) : (
                <button className="listitem" onClick={() => nav('/makine-ekle')}>
                  <div className="listitem__body">
                    <div className="listitem__title" style={{ fontSize: 15.5 }}>
                      {t('talep.onceKaydet')}
                    </div>
                    <div className="listitem__sub">
                      {t('talep.onceKaydetAlt')}
                    </div>
                  </div>
                  <IconRight size={20} />
                </button>
              )}
            </label>
          )}

          {/* ---------------------------------------------------- Servis */}
          {tur === 'servis' && (
            <>
              <div className="field" data-alan="durum">
                <span className="field__label">{t('talep.neDurumda')}</span>
                <div className="durumlar">
                  {makineDurumu(dil).map((d) => (
                    <button
                      key={d.id}
                      className={'durum' + (durum === d.id ? ' durum--on' : '')}
                      onClick={() => setDurum(d.id)}
                    >
                      <span className="durum__isaret" />
                      <span>
                        <span className="durum__ad">{d.ad}</span>
                        <span className="durum__alt">{d.alt}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="field" data-alan="belirti">
                <span className="field__label">
                  {t('talep.sorunNedir')}
                  <span className="field__istege"> · {t('talep.birdenFazla')}</span>
                </span>
                <div className="secenekler">
                  {(tumBelirti ? belirtiListesi : belirtiListesi.slice(0, ILK)).map((b) => (
                    <button
                      key={b.deger}
                      className={'secenek' + (belirtiler.includes(b.deger) ? ' secenek--on' : '')}
                      onClick={() => cevir(setBelirtiler, b.deger)}
                    >
                      {b.etiket}
                    </button>
                  ))}
                  {!tumBelirti && belirtiListesi.length > ILK && (
                    <button className="secenek secenek--daha" onClick={() => setTumBelirti(true)}>
                      {t('talep.dahaFazla', { n: belirtiListesi.length - ILK })}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ----------------------------------------------- Yedek parça

              ACİLİYET SORULMUYOR. Parça talebinde herkes "hemen" der;
              soru sıralamaya katkı vermiyordu. Yerine ADET soruluyor —
              o gerçekten gerekli bilgi: kaç tane hazırlanacağı, kaç
              tanenin faturası kesileceği başka türlü bilinmiyor. */}
          {tur === 'parca' && (
            <>
              <div className="field" data-alan="parca">
                <span className="field__label">
                  {t('talep.hangiParca')}
                  <span className="field__istege"> · {t('talep.birdenFazla')}</span>
                </span>
                <div className="secenekler">
                  {(tumParca ? parcaListesi : parcaListesi.slice(0, ILK)).map((x) => (
                    <button
                      key={x.deger}
                      className={'secenek' + (parcalar.includes(x.deger) ? ' secenek--on' : '')}
                      onClick={() => parcaCevir(x.deger)}
                    >
                      {x.etiket}
                    </button>
                  ))}
                  {!tumParca && parcaListesi.length > ILK && (
                    <button className="secenek secenek--daha" onClick={() => setTumParca(true)}>
                      {t('talep.dahaFazla', { n: parcaListesi.length - ILK })}
                    </button>
                  )}
                </div>
              </div>

              {/* "Diğer" seçildiğinde adet sorulmuyor: neyin adedi
                  olduğu belli değil. Ne istendiği açıklama kutusuna
                  yazılıyor, tutarı PAKSAN belirleyip müşteriyle
                  konuşuyor. */}
              {digerSecili && (
                <div className="uyari-kart">{t('talep.digerAciklama')}</div>
              )}

              {/* Adet ve fiyat — yalnız seçilen parçalar için.

                  Her seçeneğin yanına kutu koymak ekranı düğme
                  duvarına çeviriyordu. Seçim yapılınca altta kısa bir
                  liste açılıyor; artı-eksi düğmeleri eldivenli parmakla
                  basılacak kadar geniş.

                  FİYAT NEDEN BURADA: müşteri parça bedelini havaleyle
                  ÖNDEN gönderiyor. Ne kadar göndereceğini seçim
                  yaparken görmezse, ödeme adımında sürprizle
                  karşılaşıyor ya da telefon açmak zorunda kalıyor. */}
              {adetliParcalar.length > 0 && (
                <div className="field">
                  <span className="field__label">{t('talep.kacAdet')}</span>
                  <div className="adetler">
                    {adetliParcalar.map((p) => {
                      const bilgi = parcaFiyatBilgisi(p)
                      const adet = parcaAdet[p] || 1
                      return (
                        <div key={p} className="adet-satir">
                          <span className="adet-satir__ad">
                            {parcaEtiket(p)}
                            {bilgi && (
                              <span className="adet-satir__alt">{bilgi.kod}</span>
                            )}
                          </span>
                          <div className="adet-kutu">
                            <button
                              className="adet-kutu__dg"
                              onClick={() => adetDegis(p, -1)}
                              disabled={adet <= 1}
                              aria-label={t('talep.adetAzalt')}
                            >
                              <IconMinus size={18} />
                            </button>
                            <span className="adet-kutu__sayi">{adet}</span>
                            <button
                              className="adet-kutu__dg"
                              onClick={() => adetDegis(p, 1)}
                              aria-label={t('talep.adetArtir')}
                            >
                              <IconPlus size={18} />
                            </button>
                          </div>
                          {/* BİRİM fiyat — adetle çarpılmıyor.

                              Önce satır tutarı yazıyordu ve adet
                              arttıkça buradaki rakam da artıyordu; alt
                              toplam zaten aynı sayıyı gösterdiği için
                              aynı bilgi iki kez, iki farklı yerde
                              değişiyordu. */}
                          {bilgi && (
                            <span className="adet-satir__tutar">
                              {paraYaz(bilgi.fiyat)} {PARA_BIRIMI}
                              <span className="adet-satir__birim">
                                {' / '}{t('parcaFiyat.birim_' + bilgi.birim)}
                              </span>
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {PARCA_FIYAT_AKTIF && hesap.araToplam > 0 && (
                    <div className="tutar-kutu">
                      <div className="tutar-kutu__satir">
                        <span>{t('parcaFiyat.araToplam')}</span>
                        <span>{paraYaz(hesap.araToplam)} {PARA_BIRIMI}</span>
                      </div>
                      <div className="tutar-kutu__satir">
                        <span>{t('parcaFiyat.kdv', { oran: KDV_ORANI * 100 })}</span>
                        <span>{paraYaz(hesap.kdv)} {PARA_BIRIMI}</span>
                      </div>
                      <div className="tutar-kutu__satir tutar-kutu__satir--toplam">
                        <span>{t('parcaFiyat.toplam')}</span>
                        <span>{paraYaz(hesap.toplam)} {PARA_BIRIMI}</span>
                      </div>
                      <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
                        {t('parcaFiyat.kargoHaric')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* -------------------------------------------- Fiyat teklifi */}
          {tur === 'satinalma' && (
            <>
              <label className="field">
                <span className="field__label">{t('talep.ilgilendiginiz')}</span>
                <select
                  className="select"
                  value={urunId}
                  onChange={(e) => setUrunId(e.target.value)}
                >
                  <option value="">{t('talep.kararVermedim')}</option>
                  {PRODUCTS.map((p) => (
                    <option key={p.id} value={p.id}>{urunDilde(p, dil).name}</option>
                  ))}
                </select>
              </label>

              {/* Satış ekibinin telefonda sorduğu üç soru. Cevapları
                  önden gelirse teklif ilk aramada verilebiliyor. */}
              <div className="field">
                <span className="field__label">{t('talep.neBalyalayacak')}</span>
                <div className="secenekler">
                  {urunTipiSecenekleri(dil).map((x) => (
                    <button
                      key={x.deger}
                      className={'secenek' + (urunTipi === x.deger ? ' secenek--on' : '')}
                      onClick={() => setUrunTipi(urunTipi === x.deger ? '' : x.deger)}
                    >
                      {x.etiket}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <span className="field__label">{t('talep.neKadarArazi')}</span>
                <div className="secenekler">
                  {araziSecenekleri(dil).map((x) => (
                    <button
                      key={x.deger}
                      className={'secenek' + (arazi === x.deger ? ' secenek--on' : '')}
                      onClick={() => setArazi(arazi === x.deger ? '' : x.deger)}
                    >
                      {x.etiket}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <span className="field__label">{t('talep.traktorGucu')}</span>
                <div className="secenekler">
                  {traktorSecenekleri(dil).map((x) => (
                    <button
                      key={x.deger}
                      className={'secenek' + (traktor === x.deger ? ' secenek--on' : '')}
                      onClick={() => setTraktor(traktor === x.deger ? '' : x.deger)}
                    >
                      {x.etiket}
                    </button>
                  ))}
                </div>
                <span className="field__hint">
                  {t('talep.traktorIpucu')}
                </span>
              </div>
            </>
          )}

          {/* Açıklama — ya yazarak ya da sesle. İkisi de aynı işi
              görüyor; hangisi kolayına geliyorsa kullanıcı onu seçiyor. */}
          <div className="field" data-alan="aciklama">
            <label>
              <span className="field__label">
                {cfg('aciklamaLabel')}
                {!aciklamaZorunlu && <span className="field__istege"> · {t('ortak.istegeBagli')}</span>}
              </span>
              <textarea
                className="textarea"
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                placeholder={cfg('aciklamaPlaceholder')}
              />
            </label>

            <SesKaydi ses={ses} onDegis={setSes} />

            {/* Fiyat teklifinde ek istenmiyor: orada makine henüz
                müşterinin elinde değil, gösterecek bir şey yok. */}
            {tur !== 'satinalma' && <EkAlani ekler={ekler} onDegis={setEkler} />}
          </div>

          {/* Çiftçi gün boyu tarlada; ne zaman aranmak istediğini
              söylerse boşa arama sayısı düşer. */}
          <div className="field">
            <span className="field__label">{t('talep.neZamanArayalim')}</span>
            <div className="secenekler">
              {ulasimSecenekleri(dil).map((z) => (
                <button
                  key={z.deger}
                  className={'secenek' + (ulasim === z.deger ? ' secenek--on' : '')}
                  onClick={() => setUlasim(z.deger)}
                >
                  {z.etiket}
                </button>
              ))}
            </div>
          </div>

          {hata && (
            <div className="hata-kutu">
              <span className="hata-kutu__ikon"><IconAlert size={20} /></span>
              {hata}
            </div>
          )}

          {/* Buraya kasıtlı olarak "bizi arayın" seçeneği konmuyor:
              talebin yazılı gelmesi hem operasyon yükünü azaltıyor hem de
              kaydı takip edilebilir kılıyor. */}
          <button className="btn btn--primary btn--lg" onClick={gonder}>
            {cfg('buton')}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------ Onay penceresi

          Talep gitmeden önce son bir kontrol: sizi bu numaradan arayacağız,
          doğru mu? Numara değişip de uygulamada güncellenmediyse talep
          boşa gider.

          NUMARA BURADAN DEĞİŞTİRİLEMİYOR. Serbest bıraksaydık profildeki
          kilit anlamsız kalırdı: telefonu eline geçiren biri talep
          ekranından numarayı değiştirip hesabı devralabilirdi. Numarası
          değişen kullanıcı, şifremi-unuttum ekranındakiyle aynı yola
          çıkıyor: değişikliği Paksan yapıyor.

          Konum serbest — orada güvenlik meselesi yok.

          Üç kip de aynı pencerede: başka ekrana gidilmediği için
          doldurulan form kaybolmuyor. */}
      <Sheet
        open={onay}
        onClose={() => setOnay(false)}
        title={
          pencere === 'konum'
            ? t('talep.konumBaslik')
            : pencere === 'numara'
              ? t('talep.numaraBaslik')
              : t('talep.onayBaslik')
        }
      >
        <div className="stack" style={{ gap: 14 }}>
          {pencere === 'onay' && (
            <>
              <p className="muted" style={{ lineHeight: 1.6 }}>
                {onayYazisi}
              </p>

              {/* Numara kilitli; yanındaki bağlantı düzeltmeye değil,
                  ne yapılması gerektiğini anlatan kipe götürüyor. */}
              <div className="onay-kutu">
                <span className="onay-kutu__ikon"><IconLock size={19} /></span>
                <span className="onay-kutu__body">
                  <span className="onay-kutu__etiket">{numaraEtiketi}</span>
                  <span className="onay-kutu__deger">{telKullanici(user) || '—'}</span>
                </span>
              </div>
              <button
                className="small"
                style={{ color: 'var(--pk-blue)', textDecoration: 'underline', textAlign: 'left' }}
                onClick={() => setPencere('numara')}
              >
                {t('talep.kullanmiyorum')}
              </button>

              <div className="onay-kutu">
                <span className="onay-kutu__ikon"><IconPin size={20} /></span>
                <span className="onay-kutu__body">
                  <span className="onay-kutu__etiket">{t('talep.konum')}</span>
                  <span className="onay-kutu__deger">
                    {ilce ? `${ilce} / ${il}` : il || '—'}
                  </span>
                </span>
              </div>
              <button
                className="small"
                style={{ color: 'var(--pk-blue)', textDecoration: 'underline', textAlign: 'left' }}
                onClick={() => setPencere('konum')}
              >
                {t('talep.konumDuzelt')}
              </button>

              {onayHata && <div className="field__error">{onayHata}</div>}

              <GonderButonu
                gonderiliyor={gonderiliyor}
                etiket={t('talep.evetGonder')}
                gonderiliyorEtiket={t('ortak.gonderiliyor')}
                onClick={onayla}
              />
              <button
                className="btn btn--soft"
                onClick={() => setOnay(false)}
                disabled={gonderiliyor}
              >
                {t('ortak.vazgec')}
              </button>
            </>
          )}

          {/* ------------------------------ Numaram değişti (kilitli yol) */}
          {pencere === 'numara' && (
            <NumaraDegisti
              numaraM={numaraM}
              showToast={showToast}
              onGeri={() => setPencere('onay')}
            />
          )}

          {/* ------------------------------------------- Konum düzeltme */}
          {pencere === 'konum' && (
            <>
              <p className="muted" style={{ lineHeight: 1.6 }}>
                {t('talep.konumAciklama')}
              </p>

              <KonumAlani
                ulke={konumUlke}
                onUlke={setKonumUlke}
                il={il}
                onIl={setIl}
                ilce={ilce}
                onIlce={setIlce}
                ilceZorunlu={ilceZorunlu}
              />

              {onayHata && <div className="field__error">{onayHata}</div>}

              <button className="btn btn--primary btn--lg" onClick={onayla}>
                {t('talep.konumKaydet')}
              </button>
              <button className="btn btn--soft" onClick={() => setPencere('onay')}>
                {t('ortak.vazgec')}
              </button>
            </>
          )}
        </div>
      </Sheet>

      <TabBar />
    </div>
  )
}

/* ==========================================================================
   Fatura ve ödeme adımının parçaları
   ========================================================================== */

/* Numaram değişti — kilitli yolun anlatımı.

   Talep formunda ve yedek parça ödeme adımında AYNI pencere çıkıyor.
   İki yerde ayrı ayrı yazılıydı; biri değişince öteki geride kalıyordu.
   Tek yerden geçiyor.

   Numara hesabın kimliği: burada serbest bırakmak, profildeki kilidi
   anlamsız kılardı. Numarası değişen kullanıcı PAKSAN'ı arıyor,
   değişikliği PAKSAN yapıyor. */
function NumaraDegisti({ numaraM, showToast, onGeri }) {
  return (
    <>
      <p className="muted" style={{ lineHeight: 1.6 }}>{numaraM.neden}</p>

      <div className="uyari-kart">{numaraM.talepUyari}</div>

      <div>
        <span className="field__label">{numaraM.ararkenYaninizda}</span>
        <div className="stack" style={{ gap: 8 }}>
          {numaraM.hazirlanacaklar.map((x) => (
            <div key={x} className="listitem listitem--flat" style={{ alignItems: 'center' }}>
              <div
                className="listitem__icon"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'var(--pk-green-soft)',
                  color: 'var(--pk-green)',
                }}
              >
                <IconCheck size={17} />
              </div>
              <div className="listitem__body">
                <div style={{ fontSize: 14.5, lineHeight: 1.5 }}>{x}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <a
        className="btn btn--orange btn--lg"
        {...araProps(SIRKET.telefonHam, SIRKET.telefon, showToast)}
      >
        <IconPhone size={21} /> {SIRKET.ad} · {SIRKET.telefon}
      </a>
      <button className="btn btn--soft" onClick={onGeri}>{numaraM.geriDon}</button>

      <p className="small muted center" style={{ lineHeight: 1.6 }}>
        {numaraM.talepKaybolmadi}
      </p>
    </>
  )
}

/** Kutuya yalnız rakam girsin, en fazla `uzunluk` hane. */
function rakam(deger, uzunluk) {
  return String(deger || '').replace(/\D/g, '').slice(0, uzunluk)
}

/** Adet yazısı: 1 ise gösterilmiyor, kalabalık yapıyor. */
function adetYaz(n) {
  return '× ' + (n || 1)
}

/* Hesaptan gelen bilgi.

   Ad ve telefon zaten kayıtlı; yeniden yazdırmanın anlamı yok.
   Değiştirilemez olduğu görünsün diye kutu içinde ve soluk. */
function KayitliBilgi({ ad, tel, etiket }) {
  return (
    <div className="onay-kutu">
      <span className="onay-kutu__ikon"><IconCheck size={19} /></span>
      <span className="onay-kutu__body">
        <span className="onay-kutu__etiket">{etiket}</span>
        <span className="onay-kutu__deger">{[ad, tel].filter(Boolean).join(' · ')}</span>
      </span>
    </div>
  )
}

/* PAKSAN'ın banka hesapları.

   Hesap bilgileri girilmediyse (BANKA.aktif false) IBAN uydurmuyoruz —
   yanlış IBAN'a para göndermek geri dönüşü zor bir hata. O durumda
   müşteri telefona yönlendiriliyor.

   IBAN kopyalama düğmesi şart: 26 haneli numarayı ekrandan bakarak
   bankacılık uygulamasına yazmak hata üretiyor. */
function Hesaplar({ no, ad, t, showToast }) {
  const aciklama = BANKA.aciklamaKalibi
    .replace('{no}', no || '')
    .replace('{ad}', ad || '')
    .trim()

  async function kopyala(metin, mesaj) {
    try {
      await navigator.clipboard.writeText(metin)
      showToast(mesaj)
    } catch {
      /* Bazı WebView'larda pano kapalı olabiliyor; kullanıcı elle
         yazabilsin diye ekranda zaten yazılı duruyor. */
      showToast(t('parcaOdeme.kopyalanamadi'))
    }
  }

  if (!BANKA.aktif || BANKA.hesaplar.length === 0) {
    return (
      <div className="uyari-kart">
        {t('parcaOdeme.hesapYok', { tel: SIRKET.telefon })}
      </div>
    )
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      {BANKA.hesaplar.map((h) => (
        <div key={h.iban} className="card" style={{ padding: 14 }}>
          <div style={{ fontWeight: 700 }}>{h.banka}</div>
          {h.sube && <div className="small muted">{h.sube}</div>}
          <div className="serial-mono" style={{ marginTop: 8, fontSize: 15, lineHeight: 1.5 }}>
            {h.iban}
          </div>
          <button
            className="btn btn--soft btn--sm"
            style={{ marginTop: 10 }}
            onClick={() => kopyala(h.iban.replace(/\s/g, ''), t('parcaOdeme.ibanKopyalandi'))}
          >
            {t('parcaOdeme.ibanKopyala')}
          </button>
        </div>
      ))}

      <div className="card" style={{ padding: 14 }}>
        <div className="small muted">{t('parcaOdeme.alici')}</div>
        <div style={{ marginTop: 3 }}>{BANKA.unvan}</div>

        {/* Havalenin açıklamasına talep numarası yazılmazsa muhasebe
            hangi ödemenin hangi talep olduğunu bulamıyor. */}
        <div className="small muted" style={{ marginTop: 12 }}>
          {t('parcaOdeme.aciklamaAlani')}
        </div>
        <div className="serial-mono" style={{ marginTop: 3 }}>{aciklama}</div>
        <button
          className="btn btn--soft btn--sm"
          style={{ marginTop: 10 }}
          onClick={() => kopyala(aciklama, t('parcaOdeme.aciklamaKopyalandi'))}
        >
          {t('parcaOdeme.aciklamaKopyala')}
        </button>
      </div>

      <p className="small muted" style={{ lineHeight: 1.6 }}>
        {t('parcaOdeme.hesapNot')}
      </p>
    </div>
  )
}
