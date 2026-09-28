import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { TopBar, TabBar, Sheet } from '../components/Chrome'
import { getProduct, PRODUCTS, supportGroup, urunDilde } from '../marka'
import { GonderButonu } from '../components/GonderButonu'
import { alanaGit } from '../lib/formOdak'
import {
  PARCA_DIGER, alanEtiketi,
  makineDurumu, urunTipiSecenekleri, ARIZA_DURUMLARI,
  araziSecenekleri, traktorSecenekleri, belirtiSecenekleri,
} from '../data/talepAlanlari'
import {
  KDV_HARIC_LISTE, KDV_ORANI, PARA_BIRIMI, paraYaz,
} from '../marka'
/* Parça PAKSAN'ın kendi kataloğundan seçiliyor; bu dosya tek kapı
   (bkz. lib/parcaKatalogu.js). KDV hesabı da oradan geçiyor: tutarları
   `parcaToplami` hesaplıyor ve KDV'yi `kdvTutari()` ile ekliyor, ekran
   elle çarpma yapmıyor. */
import {
  fiyatGoruntusu, katalogGetir, parcaBul, parcaToplami,
} from '../lib/parcaKatalogu'
import { ParcaSecEkrani } from './ParcaSecEkrani'
import { ParcaResmi } from '../components/ParcaResmi'
import { formatSerial } from '../lib/serial'
import { telKullanici } from '../lib/tel'
import { CIZIM } from '../marka/icerik/cizimler'
import { makineninServisi, musterininServisleri } from '../lib/servisAtama'
import { makineninIsSurenServisTalebi, makineninSonServisAdresi } from '../lib/makineTalepleri'
import { hesabaIslenecekKonum } from '../lib/talepOlustur'
import { SesKaydi } from '../components/SesKaydi'
import { EkAlani } from '../components/EkAlani'
import { KonumAlani } from '../components/KonumAlani'
import { OnayKutusu } from '../components/Metin'
import { DekontAlani } from '../components/DekontAlani'
import { tcGecerliMi, vergiNoGecerliMi } from '../lib/kimlik'
import { talepNo } from '../lib/talep'
import { useGeriYakala } from '../lib/geriYakala'
import { numaraMetni } from '../data/numaraDegisikligi'
import { NumaraTalepFormu } from '../components/NumaraTalepFormu'
import { useDil } from '../i18n'
import { BANKA, SIRKET } from '../marka'
import {
  IconCheckCircle, IconPin, IconRight, IconLock, IconCheck, IconAlert,
  IconPlus, IconMinus, IconCart, IconInfo, IconClose,
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
  const { user, machines, requests, addRequest, updateUser, showToast } = useApp()
  const { t, dil } = useDil()
  const numaraM = numaraMetni(dil)

  const tur = TURLER.includes(params.get('tur')) ? params.get('tur') : 'servis'
  const cfg = (a) => t(`talep.${tur}.${a}`)

  /* Müşteriye bakan servis. Yoksa servis talebi açılamıyor; gerekçesi
     aşağıda, ekranın kendi yerinde yazılı. */
  const servisim = musterininServisleri(machines).ana

  /* Destek sohbetinde makine yalnız model adıyla belirlendiyse adreste
     `model` geliyor, `makine` gelmiyor. Önce ilk kayıtlı makine seçiliyordu:
     "Orka 870" diye soran çiftçinin talebi Hammer'ına açılabiliyordu. O
     modelden tek kayıtlı makine varsa o seçiliyor; yoksa ya da birden
     çoksa kutu boş kalıyor, müşteri kendisi seçiyor. */
  const [makineId, setMakineId] = useState(() => {
    /* FİYAT TEKLİFİNDE MAKİNE SEÇİLİ BAŞLAMIYOR (25 Eylül 2026,
       kullanıcı sınaması Y1). Teklif formunda makine kutusu hiç
       çizilmiyor, yine de ilk makine seçili başlıyor ve kayda
       gidiyordu: "Süper Yunus teklifi · Makine: Orkinos 1270". Kayıt
       tarafı da ayrıca makinesiz yazıyor (lib/talepOlustur.js). */
    if (tur === 'satinalma') return ''
    if (params.get('makine')) return params.get('makine')
    const model = params.get('model')
    if (model) {
      const ayni = machines.filter((m) => m.productId === model)
      return ayni.length === 1 ? ayni[0].id : ''
    }
    /* Servis talebinde ilk seçili makine SERVİSİ OLAN ilk makine: atama
       makine başına ve servisi olmayan makine için talep gönderilemiyor
       (aşağıda, makine kutusunun altında). Üzerinde işi süren servis
       talebi olan makine önce gelmiyor: o makine için form açılmıyor,
       çiftçi süren talebe ekleme yapmaya yönlendiriliyor (aşağıda,
       acikTalep). */
    if (tur === 'servis') {
      const servisli = machines.filter((m) => makineninServisi(m))
      return (
        servisli.find((m) => !makineninIsSurenServisTalebi(m, requests)) ||
        servisli[0] ||
        machines[0]
      )?.id || ''
    }
    return machines[0]?.id || ''
  })
  /* MAKİNENİN YERİ, HESABIN İLİ DEĞİL (25 Eylül 2026, kullanıcı
     sınaması O4). Servis talebinin il ve ilçesi hesaptan geliyordu;
     fiyat teklifinde bayi bölgesi için düzeltilen il hesaba yazılınca
     sonraki servis talebi makinenin olmadığı ili taşıyordu (adres
     "Konya Selçuklu", talep "Balıkesir / Bandırma"). Servis talebinde
     il, ilçe ve adres artık birlikte ve MAKİNENİN yeri olarak soruluyor:
     önce o makinenin son servis talebindeki yer, yoksa hesaptaki.
     Açılışta bir kez okunuyor. */
  const [ilkServisYeri] = useState(() =>
    tur === 'servis' ? makineninSonServisAdresi(machines.find((m) => m.id === makineId), requests) : null,
  )
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
  /* Destek ekranından gelindiyse orada konuşulan "gerekebilecek
     parçalar" adreste geliyor (bkz. Support.jsx → talepAc). Adlar destek
     bilgi tabanından çıkıyor; PAKSAN'ın kataloğundaki adla birebir
     tutmak zorunda değil. Eşleşme aşağıda kurulmaya çalışılıyor,
     tutmayan ad açıklamaya yazılıyor — hiçbiri sessizce kaybolmuyor. */
  const destekParcalari = (params.get('parcalar') || '')
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean)

  /* ------------------------------------------------- Parça seçimi (kod)

     ANAHTAR PARÇA KODU. Önce parça ADI anahtardı: seçim bir ad dizisi,
     adet de { 'Pikap parmağı': 2 } biçiminde bir nesneydi. PAKSAN'ın
     kataloğunda parça adı TEKİL DEĞİL — altı tekrar eden ad var; aynı
     adla iki farklı parça istendiğinde biri diğerinin adedini siliyordu.
     Kod tekil, o yüzden anahtar o.

     Seçim `Map` olarak tutuluyor: kod → adet. Sıra korunuyor, yani
     çiftçi ne sırayla seçtiyse ekranda ve kayıtta o sırayla görünüyor. */
  const [secim, setSecim] = useState(() => new Map())
  /* "Diğer" ayrı bir bayrak. Katalogdan seçilen parçalarla aynı kapta
     durmuyor: katalog inmese bile bu yol açık kalmalı. */
  const [diger, setDiger] = useState(false)
  /* İkisi de ÇOKTAN SEÇMELİ: çiftçi hem yonca hem saman balyalayabilir,
     arazisi de tek parça olmak zorunda değil. Tek seçimken satış
     ekibine eksik bilgi gidiyordu. */
  const [urunTipi, setUrunTipi] = useState([])
  const [arazi, setArazi] = useState([])
  const [traktor, setTraktor] = useState('')

  /* Belirti listesi uzun. Hepsi birden açılınca ekran düğme duvarına
     dönüyordu; ilk altısı gösteriliyor, gerisi isteyene. */
  const [tumBelirti, setTumBelirti] = useState(false)

  /* ------------------------------------------- Parça kataloğunun durumu

     Katalog uygulamanın içinde değil, PAKSAN'ın sunucusundan iniyor
     (538 parça, 35 alt montaj, 2 MB görsel). Üç durum da gerçek:
     yükleniyor · hata · hazır. Servis uygulamasındaki parça seçimi aynı
     şekilde çalışıyor (bkz. src/servis/ekranlar/ParcaSec.jsx) — iki ürün
     aynı işi iki farklı biçimde yapmasın.

     HATA TALEBİ KAPATMIYOR. Liste inmezse ekran "parça talebi
     açılamıyor" demiyor: "Diğer" yolu açık kalıyor, çiftçi istediği
     parçayı yazıyla anlatıp talebi gönderiyor, fiyat gösterilmiyor.
     Uygulama sunucu olmadan da çalışacağına göre bu akış da çalışmalı. */
  const [katalogDurum, setKatalogDurum] = useState('yukleniyor')
  const [katalog, setKatalog] = useState(null)
  /* Parça seçme ekranı açık mı (bkz. ParcaSecEkrani.jsx). Ayrı bir
     adres değil, bu bileşenin içinde bir görünüm: adres değişseydi
     sayfa geçişi formu söker, doldurulanlar kaybolurdu. */
  const [parcaEkrani, setParcaEkrani] = useState(false)

  /* Ad, telefon ve konum formda sorulmuyor; hesaptan geliyor. Gönder'e
     basınca açılan onay penceresinde teyit ediliyor.

     TELEFON BURADA DA DEĞİŞTİRİLEMİYOR. Numara hesabın kimliği; burada
     serbest bırakmak, profildeki kilidi anlamsız kılardı. Numarası
     değişmiş kullanıcı, şifremi-unuttum ekranındakiyle aynı yola
     çıkıyor: değişikliği Paksan yapıyor.

     Konum serbest — orada güvenlik meselesi yok, ilçe teklifi hangi
     bayinin hazırlayacağını belirlediği için düzeltilebilmesi gerekiyor.

     Servis talebinde il ve ilçe onay penceresinde değil, formun
     içinde, adresle aynı blokta soruluyor ve makinenin yeri olarak
     doluyor (yukarıda ilkServisYeri). */
  const [konumUlke, setKonumUlke] = useState(user?.konumUlke || user?.ulke || 'TR')
  const [il, setIl] = useState(ilkServisYeri?.il || user?.il || '')
  const [ilce, setIlce] = useState(ilkServisYeri ? ilkServisYeri.ilce : user?.ilce || '')

  /* MAKİNENİN BULUNDUĞU ADRES — YALNIZ SERVİS TALEBİNDE.

     Buraya kadar servis talebi yalnız İL ve İLÇE taşıyordu. Servis
     elemanı tarlaya gitmek zorunda ve "Konya / Çumra" ile kimse
     bulunamıyor; adres telefonla soruluyordu. Sahadaki servisin
     kayıt ekranında da adres kutusu boş çıkıyor ve elle
     dolduruluyordu — müşterinin uygulamada zaten söylemiş olması
     gereken bir bilgi.

     BİR KEZ SORULUYOR. Hesapta adres yoksa yazılan adres hesaba
     işleniyor (`updateUser`) ve sonraki taleplerde kutu dolu geliyor;
     çiftçinin makinesi çoğu zaman aynı yerde duruyor. Kilitli değil,
     çünkü bazen değişiyor. Hesabın DOLU yerine dokunulmuyor (25 Eylül
     2026, inceleme): burada yazılan makinenin yeri; kural
     lib/talepOlustur.js → hesabaIslenecekKonum.

     YEDEK PARÇADA SORULMUYOR: orada zaten teslimat adresi var
     (bkz. `faturaBilgisi`). Fiyat teklifinde de yok — ortada gidilecek
     bir makine yok.

     Önce makinenin son servis talebindeki adres geliyor (O4, yukarıda
     ilkServisYeri); yoksa hesaptaki. Çiftçi il, ilçe ya da adrese
     dokunmadıysa makine değişince üçü birden o makinenin yerine
     geçiyor; dokunduysa yazdığı kalıyor. */
  const [servisAdres, setServisAdres] = useState(ilkServisYeri?.adres || user?.adres || '')
  const adresDokunuldu = useRef(false)

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

  /* Fatura kime kesilecek: 'kendim' | 'baskasi' | 'firma'.

     Üçü birbirini dışlıyor. Eskiden iki ayrı bayrak vardı
     (`faturaTuzel` + `faturaBaskasi`) ve ikincisi iki farklı anlamda
     kullanıldığı için "kendi adıma" ile "başkası adına" aynı anda
     seçilebiliyordu. */
  const [faturaKime, setFaturaKime] = useState('kendim')
  /* Yalnız firma dalında: irtibat telefonu hesaptakinden farklı mı.
     Kendi değişkeni — kişi seçimiyle bağı yok. */
  const [faturaFarkliTel, setFaturaFarkliTel] = useState(false)
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

  /* SERVİS TALEBİ SEÇİLEN MAKİNENİN SERVİSİNE GİDİYOR (bkz.
     lib/talepOlustur.js → talebinServisi). Atama makine başına; aynı
     müşterinin öteki makinesine başka servis bakabiliyor. Ekran önce
     yalnız "müşterinin HİÇ servisi var mı" diye bakıyordu: bir makinenin
     servisi varsa servisi olmayan makine için de talep gidiyor ve
     talep hiçbir servise düşmüyordu (22 Eylül 2026). Artık makine
     kutusunun altında talebin gideceği servis yazıyor; servis yoksa
     gönderim duruyor. */
  const seciliServis = tur === 'servis' && secilen ? makineninServisi(secilen)?.servis || null : null

  /* AYNI MAKİNEDE İKİNCİ SERVİS TALEBİ AÇILMIYOR (25 Eylül 2026,
     kullanıcı sınaması O5). Makinede işi süren bir servis talebi varken
     form ikinci bir talep açtırıyordu; iki iş aynı arızayı iki kez
     anlatıyor, servis ikisini ayrı ayrı yürütüyordu. Artık formun
     yerinde o talebe "ekleme yap" yolu duruyor; ekleme servise bildirim
     olarak gidiyor (lib/talepEkleme.js → eklemeyiServiseBildir).

     "İşi süren": onay bekleyen talep sayılmıyor (lib/makineTalepleri.js
     → isSurenServisTalebiMi). Servis ziyareti bitirmiş, kayıt PAKSAN'ın
     onayında; makinedeki yeni arıza yeni bir iştir. Liste müşterinin
     kendi talepleri; servisin bu hesaba bağlı açtığı işler de içinde. */
  const acikTalep = tur === 'servis' && secilen ? makineninIsSurenServisTalebi(secilen, requests) : null

  /* SERVİSİ ATANMAMIŞ MAKİNE SEÇİLİNCE FORM AÇILMIYOR (26 Eylül 2026,
     ikinci kullanıcı sınaması). Makine kutusunun altında küçük bir not
     çıkıyor, formun geri kalanı açık kalıyordu: çiftçi durumu, belirtiyi,
     açıklamayı, fotoğrafı ve adresi doldurdu, "Gönder"de geri çevrildi.
     Açık talepteki gibi formun yerinde kart duruyor; hesabın hiçbir
     makinesinde servis yoksa bütün ekran zaten o karttı (yukarıda
     servisim). Gönderim kapısı (`gonder`) savunma olarak duruyor. */
  const servisiYokMakine = tur === 'servis' && Boolean(secilen) && !acikTalep && !seciliServis

  /* Makine değişince — çiftçi il, ilçe ya da adrese dokunmadıysa — yer
     o makinenin son servis talebinden geliyor; talebi yoksa hesaptaki
     (açılıştaki kuralın aynısı, yukarıda ilkServisYeri). */
  function makineSec(id) {
    setMakineId(id)
    if (tur !== 'servis' || adresDokunuldu.current) return
    const yer = makineninSonServisAdresi(machines.find((m) => m.id === id), requests) || {
      il: user?.il || '',
      ilce: user?.ilce || '',
      adres: user?.adres || '',
    }
    setIl(yer.il)
    setIlce(yer.ilce)
    setServisAdres(yer.adres)
  }

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
  /* KURULUM TALEBİNDE ARIZA SORULMUYOR.

     "İlk kurulum yapılacak" seçildiğinde ortada bir arıza yok:
     makine yeni geldi, kurulup çalıştırılacak. Belirti listesi ve
     açıklama kutusu bu yüzden kapanıyor; ikisi de "neyin bozuk
     olduğunu" soruyor ve cevabı yok. Zorunluluklar da onlarla
     birlikte düşüyor (bkz. `gonder`). */
  /* Henüz seçim yapılmamışken (`durum === ''`) form arıza kipinde
     duruyor: kullanıcı daha bir şey söylemedi, alanları saklamak için
     sebep yok. Yalnız arıza ANLATMAYAN bir durum seçildiğinde
     kapanıyorlar. */
  const arizaVar = !durum || ARIZA_DURUMLARI.includes(durum)

  const aciklamaZorunlu =
    !ses &&
    ((tur === 'parca' && diger) ||
      (tur === 'servis' && arizaVar && belirtiler.includes('Diğer')))
  /* Talebe hangi bayinin bakacağını ilçe belirliyor; onay penceresinde
     boş geçilemiyor.

     Eskiden yalnız satın almada zorunluydu. Bayi sorumluluk bölgeleri
     ilçe düzeyinde tanımlanabildiği için artık üç türde de gerekiyor:
     ilçesi olmayan talep, yalnız belirli ilçelerden sorumlu bir bayiyle
     eşleşemiyordu. Servis için zaten gerekli bilgi — teknisyenin nereye
     gideceği belli olmalı. */
  const ilceZorunlu = true

  /* Art arda hızlı dokunuşta seçim kaybolmasın diye listenin son hâli
     üzerinden çalışıyor. */
  function cevir(ayarla, deger) {
    ayarla((liste) =>
      liste.includes(deger) ? liste.filter((x) => x !== deger) : [...liste, deger]
    )
  }

  /* Katalogdan parça seçimi — kod üzerinden.

     Bir dokunuş parçayı 1 adetle ekliyor, ikinci dokunuş çıkarıyor.
     Seçim kalkınca adedi de gidiyor; Map'ten silindiği için geride
     kalmıyor.

     Katalogdan parça seçilirse "Diğer" kendiliğinden kalkıyor: karışık
     bir talep hem fiyatlanamıyor hem depoda toplanamıyor. */
  function parcaCevir(kod) {
    setSecim((eski) => {
      const yeni = new Map(eski)
      if (yeni.has(kod)) yeni.delete(kod)
      else yeni.set(kod, 1)
      return yeni
    })
    setDiger(false)
  }

  /* "Diğer" ÖZEL BİR SEÇENEK: listede olmayan bir parça isteniyor
     demek. Adet sorulmuyor (neyin adedi belli değil), fiyat
     gösterilmiyor ve yanına katalogdan parça seçilemiyor. */
  function digerCevir() {
    setDiger((a) => {
      const yeniDurum = !a
      if (yeniDurum) setSecim(new Map())
      return yeniDurum
    })
  }

  /* En az 1, en çok 99. Üst sınır kaza koruması: düğmeye basılı kalan
     parmak 400 adet parça sipariş etmesin. */
  function adetDegis(kod, fark) {
    setSecim((eski) => {
      const yeni = new Map(eski)
      yeni.set(kod, Math.min(99, Math.max(1, (yeni.get(kod) || 1) + fark)))
      return yeni
    })
  }

  /* Kapıya (lib/parcaKatalogu.js) verilecek biçim: [{kod, adet}].
     Seçim sırası korunuyor. */
  const secimler = [...secim].map(([kod, adet]) => ({ kod, adet }))
  /* Tutar gerçek katalogdan hesaplanıyor; KDV'yi `kdvTutari()` ekliyor.
     Katalog inmediyse `eksikFiyat` dolu dönüyor ve ekran fiyat
     göstermiyor. */
  const hesap = parcaToplami(katalog, secimler)
  /* Fiyat ancak katalog hazırsa ve eksik kalem yoksa gösterilebilir —
     yarım bir toplam, müşterinin eksik para havale etmesi demek. */
  const fiyatGosterilir =
    katalogDurum === 'hazir' && !hesap.eksikFiyat && hesap.araToplam > 0
  /* Parçanın katalogdaki adı; katalog yoksa kodun kendisi. */
  const parcaAdi = (kod) => parcaBul(katalog, kod)?.ad || kod

  /* Android'in geri hareketi ödeme adımından uygulamayı kapatmasın,
     talep formuna dönsün — doldurulan fatura bilgileri kaybolmasın. */
  useGeriYakala(adim === 'odeme' && !parcaEkrani, () => setAdim('form'))

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

  /* --------------------------------------- Katalog yalnız parça talebinde

     Servis ve fiyat teklifi formunda parça seçimi yok; 86 KB liste o
     ekranlarda boşa inmesin. */
  useEffect(() => {
    if (tur !== 'parca') return
    let gecerli = true
    setKatalogDurum('yukleniyor')
    katalogGetir()
      .then((k) => {
        if (!gecerli) return
        setKatalog(k)
        setKatalogDurum('hazir')
      })
      .catch(() => gecerli && setKatalogDurum('hata'))
    return () => {
      gecerli = false
    }
  }, [tur])

  /* Yeniden deneme GERÇEKTEN yeniden deniyor: kapı başarısız isteği
     bellekte tutmuyor, yeni çağrı ağa çıkıyor
     (bkz. lib/parcaKatalogu.js). */
  function katalogTekrar() {
    setKatalogDurum('yukleniyor')
    katalogGetir()
      .then((k) => {
        setKatalog(k)
        setKatalogDurum('hazir')
      })
      .catch(() => setKatalogDurum('hata'))
  }

  /* ------------------------------------------- Parça seçme ekranı

     "Parça Ekle" ekranı açıyor; ekran kendi taslağıyla çalışıyor.
     Makine formda değiştirilse de eski bir bölüm açık kalmıyor: ekran
     her açılışta bölüm listesinden ve boş aramayla başlıyor, bölümleri
     o anki makineye göre kuruyor.

     Katalog hazır değilken açılmıyor ve "Tamam" yazmıyor. Servisim'deki
     ekran liste inmeden bitirilince seçimi siliyordu; burada o yol
     kapalı. */
  function parcaEkraniniAc() {
    if (katalogDurum !== 'hazir') return
    setParcaEkrani(true)
  }

  /* `taslak` verilirse "Tamam" basıldı: seçim forma yazılıyor. Verilmezse
     geri ile çıkıldı: taslak atılıyor, form eski hâlinde kalıyor.

     Katalogdan parça seçildiyse "Diğer" kalkıyor — karışık bir talep hem
     fiyatlanamıyor hem depoda toplanamıyor (bkz. `parcaCevir`). */
  const parcaDonusu = useRef(false)
  function parcaEkranindanDon(taslak) {
    if (taslak && katalogDurum === 'hazir') {
      setSecim(taslak)
      if (taslak.size) setDiger(false)
      setHata('')
    }
    parcaDonusu.current = true
    setParcaEkrani(false)
  }

  /* Forma dönünce parça alanına. Seçici sayfayı başa kaydırmıştı;
     çiftçi ne seçtiğini ve adetleri görmek için aşağı inmek zorunda
     kalmasın. Başlık yapışkan; alan onun altına düşmesin diye başlığın
     boyu kadar pay bırakılıyor. Çizimden önce çalışıyor: form bir an
     en üstte görünüp sonra kaymıyor. */
  useLayoutEffect(() => {
    if (parcaEkrani || !parcaDonusu.current) return
    parcaDonusu.current = false
    const alan = document.querySelector('[data-alan="parca"]')
    if (!alan) return
    const baslik = document.querySelector('.topbar')?.offsetHeight || 0
    const y = alan.getBoundingClientRect().top + window.scrollY - baslik - 12
    window.scrollTo(0, Math.max(0, y))
  }, [parcaEkrani])

  /* Destekten gelen parça adları bir KEZ işleniyor; katalog indikten
     sonra çalışıyor. Kullanıcı sonradan kaldırırsa geri gelmiyor.

     EŞLEŞME ZORLANMIYOR. Destek ekranı arıza bilgi tabanından geliyor ve
     oradaki parça adı PAKSAN kataloğundaki adla birebir tutmak zorunda
     değil. Yalnız katalogda o adla TEK parça varsa işaretleniyor; iki
     parça varsa hangisi olduğunu uygulama bilemez, seçimi çiftçi yapar.
     Eşleşmeyen ad sessizce kaybolmuyor, açıklamaya yazılıyor — hem
     müşteri unutmuyor hem PAKSAN ne istendiğini görüyor. */
  const parcaBaslatildi = useRef(false)
  useEffect(() => {
    if (parcaBaslatildi.current) return
    if (tur !== 'parca' || destekParcalari.length === 0) return
    if (katalogDurum !== 'hazir') return
    parcaBaslatildi.current = true

    const eslesen = new Map()
    const eslesmeyen = []
    for (const ad of destekParcalari) {
      const aranan = ad.toLocaleLowerCase('tr-TR')
      const tam = (katalog?.parcalar || []).filter(
        (p) => p.ad.toLocaleLowerCase('tr-TR') === aranan
      )
      if (tam.length === 1) eslesen.set(tam[0].kod, 1)
      else eslesmeyen.push(ad)
    }

    if (eslesen.size) setSecim(eslesen)
    if (eslesmeyen.length) {
      setAciklama((eski) => {
        const satir = t('talep.listeDisiParca', { parcalar: eslesmeyen.join(', ') })
        return eski ? `${eski}\n${satir}` : satir
      })
    }
  }, [tur, katalogDurum])

  /* 1. adım — talebin kendisi doğru mu? */
  function gonder() {
    /* Sorun formun en üstünde olabiliyor ama kullanıcı en altta, gönder
       düğmesinin başında. Hem düğmenin üstüne kutu içinde ne eksik
       olduğu yazılıyor hem de o alan ekrana getirilip işaretleniyor. */
    const sorunlu = (alan, mesaj) => {
      setHata(mesaj)
      alanaGit(alan)
    }

    if (tur === 'servis' && !secilen)
      return sorunlu('makine', t('talep.makineSecinServis'))
    if (tur === 'servis' && !seciliServis)
      return sorunlu('makine', t('servisim.yokAlt'))
    /* Savunma: form bu durumda zaten çizilmiyor (aşağıda acikTalep). */
    if (tur === 'servis' && acikTalep)
      return sorunlu('makine', t('talep.acikTalepVar', { no: acikTalep.no }))
    if (tur === 'servis' && !durum)
      return sorunlu('durum', t('talep.durumSecin'))
    if (tur === 'servis' && arizaVar && belirtiler.length === 0)
      return sorunlu('belirti', t('talep.belirtiSecin'))
    if (tur === 'parca' && secim.size === 0 && !diger)
      return sorunlu('parca', t('talep.parcaSecin'))
    if (aciklamaZorunlu && aciklama.trim().length < 10)
      return sorunlu('aciklama', t('talep.aciklamaKisa'))
    /* Makinenin yeri formda soruluyor (O4); onay penceresinde ayrıca
       konum düzeltme kipi açılmıyor. */
    if (tur === 'servis' && !il)
      return sorunlu('il', t('talep.makineIlSecin'))
    if (tur === 'servis' && ilceZorunlu && !ilce)
      return sorunlu('ilce', t('talep.makineIlceSecin'))
    if (tur === 'servis' && servisAdres.trim().length < 15)
      return sorunlu('servisAdres', t('talep.servisAdresEksik'))

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
       kullanıcı iki kez dokunmasın. Servis talebinde konum formun
       içinde ve yukarıda denetlendi; düzeltme kipi yok. */
    setPencere(tur !== 'servis' && (!il || (ilceZorunlu && !ilce)) ? 'konum' : 'onay')
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

    if (faturaKime === 'firma') {
      if (faturaUnvan.trim().length < 3) {
        return sorunlu('unvan', t('parcaOdeme.unvanEksik'))
      }
      if (!vergiNoGecerliMi(faturaVergiNo)) {
        return sorunlu('vergiNo', t('parcaOdeme.vergiNoHatali'))
      }
      if (faturaFarkliTel && faturaTel.replace(/\D/g, '').length < 10) {
        return sorunlu('faturaTel', t('parcaOdeme.telEksik'))
      }
    } else {
      /* Kontrol sırası ekrandaki sırayla aynı: önce ad, sonra kimlik.
         Yoksa kullanıcı en alttaki hataya gönderiliyor, düzeltiyor,
         bu sefer yukarıdaki hata çıkıyor. */
      if (faturaKime === 'baskasi' && faturaAd.trim().length < 3) {
        return sorunlu('faturaAd', t('parcaOdeme.adEksik'))
      }
      if (!tcGecerliMi(faturaTc)) {
        return sorunlu('tc', t('parcaOdeme.tcHatali'))
      }
      if (faturaKime === 'baskasi' && faturaTel.replace(/\D/g, '').length < 10) {
        return sorunlu('faturaTel', t('parcaOdeme.telEksik'))
      }
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
    const firma = faturaKime === 'firma'
    const baskasi = faturaKime === 'baskasi'
    /* Telefon: firmada "farklı" işaretliyse yazılan, başka kişide o
       kişinin numarası, kendi adına ise hesaptaki. */
    const kendiTelefonu = firma ? !faturaFarkliTel : !baskasi
    const ortak = {
      tuzel: firma,
      tel: kendiTelefonu ? telKullanici(user) : faturaTel.trim(),
      adres: faturaAdres.trim(),
      il,
      ilce,
      ulke: konumUlke,
      farkliKisi: baskasi,
    }
    if (firma) {
      return {
        ...ortak,
        unvan: faturaUnvan.trim(),
        vergiNo: faturaVergiNo.replace(/\D/g, ''),
      }
    }
    return {
      ...ortak,
      ad: baskasi ? faturaAd.trim() : user?.ad || '',
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
    /* Servis talebinde makinenin yeri formun içinde; eksikse pencere
       kapanıp o alana gidiliyor (konum düzeltme kipi yalnız parça ve
       teklifte). */
    if (tur === 'servis' && (!il || (ilceZorunlu && !ilce))) {
      setOnay(false)
      setHata(t(!il ? 'talep.makineIlSecin' : 'talep.makineIlceSecin'))
      return alanaGit(!il ? 'il' : 'ilce')
    }
    if (!il) {
      setPencere('konum')
      return setOnayHata(t('talep.ilSecin'))
    }
    if (ilceZorunlu && !ilce) {
      setPencere('konum')
      return setOnayHata(t('talep.ilceSecin'))
    }

    /* Konum düzeltildiyse hesaba da işlensin — bir daha sorulmasın.
       Servis talebinde yer makinenin: hesaba yalnız boş olan yazılıyor,
       dolu yer sessizce değişmiyor (lib/talepOlustur.js →
       hesabaIslenecekKonum; 25 Eylül 2026, inceleme). Telefona burada
       dokunulmuyor; onu yalnızca Paksan değiştirebiliyor. */
    const hesabaYaz = hesabaIslenecekKonum(tur, user, {
      konumUlke,
      il,
      ilce,
      adres: tur === 'servis' ? servisAdres : '',
    })
    if (hesabaYaz) {
      updateUser(hesabaYaz)
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
        /* Fiyat teklifi makine taşımaz (Y1; yukarıda makineId). */
        makine: tur !== 'satinalma' && makine
          ? { id: makine.id, serial: makine.serial, productId: makine.productId }
          : null,
        urunId: tur === 'satinalma' ? urunId || null : null,
        durum: tur === 'servis' ? durum : null,
        belirtiler: tur === 'servis' ? belirtiler : [],
        /* PARÇA KAYDI İKİ KATMANLI.

           `parcaFiyat` ASIL KAYIT: o günün fiyat görüntüsü. Satırlarda
           kod, ad, adet, birim fiyat ve tutar; ayrıca katalog sürümü ve
           kaynağı (bkz. lib/parcaKatalogu.js → fiyatGoruntusu). Fiyat
           listesi değişiyor; altı ay sonra aynı talebe bakan personel o
           günün fiyatını değil müşterinin havale ettiği tutarı görmeli.
           Parçanın kimliği de burada: KOD.

           `parcalar` ve `parcaAdet` ESKİ OKUYUCULAR İÇİN duruyor: talep
           detayı, ihracat e-postası ve backoffice'in eski kayıtlara
           bakan yolları bu iki alanı okuyor. İkisi de parça ADIYLA
           yazılıyor, yani en iyi çabayla: katalogda altı tekrar eden ad
           var, aynı ad iki kez seçilirse `parcaAdet` birini siliyor.
           Doğrusu `parcaFiyat.satirlar`; çakışma orada olmuyor. */
        parcalar: tur !== 'parca'
          ? []
          : diger
            ? [PARCA_DIGER]
            : secimler.map((s) => parcaAdi(s.kod)),
        parcaAdet: tur === 'parca'
          ? Object.fromEntries(secimler.map((s) => [parcaAdi(s.kod), s.adet]))
          : null,
        /* Fiyat görüntüsü yalnız katalogdan seçim yapıldıysa ve katalog
           indiyse var. "Diğer" yolunda tutar yok: ne istendiği yazıyla
           anlatılıyor, fiyatı PAKSAN müşteriyle konuşuyor. */
        parcaFiyat:
          tur === 'parca' && katalogDurum === 'hazir' && secimler.length
            ? fiyatGoruntusu(katalog, secimler)
            : null,
        /* Fatura, teslimat ve dekont — yalnız yedek parçada */
        fatura: tur === 'parca' ? faturaBilgisi() : null,
        dekont: tur === 'parca' ? dekont : null,
        /* Backoffice tek satırda gösteriyor; liste virgülle
           birleştirilip gönderiliyor. */
        urunTipi: tur === 'satinalma' ? urunTipi.join(', ') : '',
        arazi: tur === 'satinalma' ? arazi.join(', ') : '',
        traktor: tur === 'satinalma' ? traktor : '',
        /* Ad ve telefon hesaptan alınıyor; kullanıcıya tekrar
           yazdırılmıyor, burada değiştirilemiyor. */
        ad: user?.ad || '',
        tel: telKullanici(user),
        telUlke: user?.ulke || '',
        telHam: user?.tel || '',
        il,
        ilce,
        /* Servis bu adrese gidiyor; sahadaki kayıt ekranı onu okunur
           satır olarak gösteriyor ve tekrar sormuyor
           (bkz. lib/servisKaydi.js → eksikAlanlar). */
        adres: tur === 'servis' ? servisAdres.trim() : '',
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

  /* ==================================================== Servis atanmamışsa

     SERVİS TALEBİ AÇILAMIYOR VE BU KASITLI.

     Talep, makineye bakan servisin uygulamasına düşüyor. Servis
     atanmamışsa talebin gideceği yer yok: PAKSAN'da bekler, kimse
     sahiplenmez, müşteri de bir şey olduğunu sanır. Boşa açılan bir
     talep, açılmamış talepten kötü.

     Atama PAKSAN'ın kararı (bkz. lib/servisAtama.js) ve PAKSAN onu
     kendisi yapıyor (21 Eylül 2026, kullanıcının kararı): ekran
     "atamayı en kısa sürede PAKSAN yapacak" diyor ve DÜĞME YOK.
     Önce altında "Geri" ve "PAKSAN'ı Ara" düğmeleri vardı; kullanıcı
     ikisini de kaldırttı: geri düğmesi zaten sol üstte, aramak da
     müşteriden istenen bir iş değil — atamayı PAKSAN yapıyor.

     MAKİNESİ HİÇ YOKSA AYRI EKRAN. Servis makineye göre belirleniyor;
     kayıtlı makinesi olmayan müşteri için "servis atanmadı" demek
     yanlış yönlendirmeydi (atanacak makine yok). Ona makinesini
     kaydetmesi söyleniyor ve kayıt ekranına götüren düğme veriliyor.

     "SERVİS ATANMADI" YALNIZ SERVİS TALEBİNDE. Yedek parça ve fiyat
     teklifi PAKSAN'da karşılık buluyor; servis beklemeleri gerekmiyor.

     YEDEK PARÇADA DA MAKİNESİ OLMAYAN AYNI EKRANI GÖRÜYOR (22 Eylül
     2026, kullanıcının isteği). Önce form açılıyor, makine alanında
     "Önce makinenizi kaydedin" satırı duruyordu; müşteri formun geri
     kalanını doldurmaya çalışıyordu. Parçalar makinenin modeline göre
     listeleniyor, makinesiz talep doğru parçayı bulamıyor. Açıklama
     parçaya göre (talep.makineYokAltParca). Fiyat teklifi makine
     istemiyor, engellenmiyor. */
  const parcadaMakineYok = tur === 'parca' && machines.length === 0
  if ((tur === 'servis' && !servisim) || parcadaMakineYok) {
    const makineYok = machines.length === 0
    return (
      <div className="app">
        <TopBar title={cfg('baslik')} back />
        <div className="screen wrap fade-in" style={{ paddingTop: 24 }}>
          {makineYok ? (
            <div className="empty">
              <img className="empty__cizim" src={CIZIM.bosMakine} alt="" />
              <h2 style={{ fontSize: 18.5, marginBottom: 8 }}>{t('talep.makineYokBaslik')}</h2>
              <p style={{ lineHeight: 1.6, marginBottom: 24 }}>
                {t(parcadaMakineYok ? 'talep.makineYokAltParca' : 'talep.makineYokAlt')}
              </p>
              <button className="btn btn--primary btn--lg" onClick={() => nav('/makine-ekle')}>
                <IconPlus size={22} /> {t('makine.ekle')}
              </button>
            </div>
          ) : (
            <div className="card center" style={{ padding: '30px 20px' }}>
              <div style={{ color: 'var(--pk-orange-ink)' }}>
                <IconAlert size={46} />
              </div>
              <h2 style={{ marginTop: 14 }}>{t('talep.servisYok')}</h2>
              <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
                {t('talep.servisYokAlt')}
              </p>
            </div>
          )}
        </div>
        <TabBar />
      </div>
    )
  }

  /* --------------------------------------------------- Gönderildi ekranı */
  if (sonuc) {
    const teklifUrunu = sonuc.urunId ? urunDilde(getProduct(sonuc.urunId), dil) : null
    return (
      <div className="app">
        <TopBar title={t('talep.alindi')} />
        <div className="screen wrap" style={{ paddingTop: 28 }}>
          <div className="card center" style={{ padding: '30px 20px' }}>
            <div style={{ color: 'var(--pk-green-yazi)' }}>
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
                ? t('talep.arayacagiz', { tel: sonuc.tel })
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
                  style={{ background: 'var(--pk-blue-soft)', color: 'var(--pk-blue-yazi)' }}
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

  /* ---------------------------------------------- Parça seçme ekranı

      Talep formunun yerine çiziliyor; form durumu bu bileşende kaldığı
      için dönüşte her şey yerinde. Servisim'deki servis kaydı ekranı da
      kataloğu aynı biçimde, tam ekran açıyor. */
  if (tur === 'parca' && parcaEkrani && katalogDurum === 'hazir') {
    return (
      <ParcaSecEkrani
        katalog={katalog}
        grup={grup}
        secili={secim}
        onTamam={(taslak) => parcaEkranindanDon(taslak)}
        onVazgec={() => parcaEkranindanDon(null)}
      />
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
              {/* Satırda kod da yazıyor: müşteri havale açıklamasını ya
                  da telefonu açtığında parçayı koduyla söylüyor. Ad
                  tekil değil, kod tekil. */}
              {/* Satırın başında parçanın resmi (22 Eylül 2026): müşteri
                  havale etmeden önce doğru parçayı seçtiğini resimden
                  görüyor (bkz. components/ParcaResmi.jsx). */}
              {hesap.satirlar.map((r) => (
                <div key={r.kod} className="detay-satir detay-satir--gorselli">
                  <span className="parca-satir">
                    <ParcaResmi katalog={katalog} kod={r.kod} yok={t('parcaSec.gorselYok')} />
                    <span>
                      {r.ad}
                      <span
                        className="small muted serial-mono"
                        style={{ display: 'block', marginTop: 2 }}
                      >
                        {r.kod} · {adetYaz(r.adet)}
                      </span>
                    </span>
                  </span>
                  <span className="detay-satir__vurgu">
                    {r.tutar === null ? '—' : `${paraYaz(r.tutar)} ${PARA_BIRIMI}`}
                  </span>
                </div>
              ))}
              {diger && (
                <div className="detay-satir">
                  <span>{alanEtiketi(PARCA_DIGER, dil)}</span>
                  <span className="small muted">{t('parcaFiyat.sonraBelirlenecek')}</span>
                </div>
              )}

              {fiyatGosterilir && (
                <div className="tutar-kutu" style={{ marginTop: 12 }}>
                  <div className="tutar-kutu__satir">
                    <span>{t('parcaFiyat.araToplam')}</span>
                    <span>{paraYaz(hesap.araToplam)} {PARA_BIRIMI}</span>
                  </div>
                  {/* KDV SATIRI LİSTENİN KDV'Lİ OLUP OLMAMASINA BAĞLI.
                      PAKSAN'ın fiyat listesinde KDV bilgisi yazmıyor;
                      bugün liste KDV hariç sayılıyor (`KDV_HARIC_LISTE`).
                      Teyit edilip tersi çıkarsa tek bayrak değişiyor ve
                      satır kendiliğinden kapanıyor — tutar da
                      `kdvTutari()` sıfır döndüğü için şişmiyor. */}
                  {KDV_HARIC_LISTE && (
                    <div className="tutar-kutu__satir">
                      <span>{t('parcaFiyat.kdv', { oran: KDV_ORANI * 100 })}</span>
                      <span>{paraYaz(hesap.kdv)} {PARA_BIRIMI}</span>
                    </div>
                  )}
                  <div className="tutar-kutu__satir tutar-kutu__satir--toplam">
                    <span>{t('parcaFiyat.gonderilecek')}</span>
                    <span>{paraYaz(hesap.toplam)} {PARA_BIRIMI}</span>
                  </div>
                </div>
              )}

              {/* Katalog inmediyse ödeme adımında tutar yazmıyor.
                  Müşteri ne kadar göndereceğini PAKSAN'dan öğreniyor;
                  uydurma ya da yarım bir toplam, eksik havale demek. */}
              {secimler.length > 0 && !fiyatGosterilir && (
                <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
                  {t('parcaSec.tutarYok')}
                </p>
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
              {/* ÜÇ SEÇENEK, BİRİ SEÇİLİ.

                  Eskiden iki düğme ve altında "fatura başkası adına
                  kesilecek" kutucuğu vardı. "Kendi adıma" seçiliyken
                  o kutucuk işaretlenebiliyordu — etiketle kutucuk
                  birbirini yalanlıyordu. Üçüncü seçenek kutucuğun
                  yerini aldı; çelişki artık kurulamıyor. */}
              <div className="durumlar">
                {[
                  ['kendim', 'kendiAdima', 'kendiAdimaAlt'],
                  ['baskasi', 'baskaKisi', 'baskaKisiAlt'],
                  ['firma', 'tuzelKisi', 'tuzelKisiAlt'],
                ].map(([kod, ad, alt]) => (
                  <button
                    key={kod}
                    className={'durum' + (faturaKime === kod ? ' durum--on' : '')}
                    onClick={() => setFaturaKime(kod)}
                  >
                    <span className="durum__isaret" />
                    <span>
                      <span className="durum__ad">{t('parcaOdeme.' + ad)}</span>
                      <span className="durum__alt">{t('parcaOdeme.' + alt)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* -------------------------------------------- Gerçek kişi */}
            {faturaKime !== 'firma' && (
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
                {faturaKime === 'baskasi' ? (
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
                    {faturaKime === 'baskasi'
                      ? t('parcaOdeme.tcNoBaskasi')
                      : t('parcaOdeme.tcNo')}
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
                    {faturaKime === 'baskasi'
                      ? t('parcaOdeme.tcAciklamaBaskasi')
                      : t('parcaOdeme.tcAciklama')}
                  </span>
                </label>
              </>
            )}

            {/* --------------------------------------------- Tüzel kişi */}
            {faturaKime === 'firma' && (
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

                {/* Kendi değişkeni: kişi seçimiyle bağı yok. Eskiden
                    ikisi aynı değişkeni paylaştığı için, kişi dalında
                    işaretlenen kutucuk firmaya geçilince burada
                    işaretli görünüyordu. */}
                <OnayKutusu
                  cumle={t('parcaOdeme.farkliTelefon')}
                  deger={faturaFarkliTel}
                  onDegis={setFaturaFarkliTel}
                />

                {faturaFarkliTel ? (
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
                  style={{ color: 'var(--pk-blue-yazi)', textDecoration: 'underline', textAlign: 'left' }}
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
              <NumaraTalepFormu
                onKapat={() => setPencere('onay')}
                kapatEtiketi={numaraM.geriDon}
                altNot={numaraM.talepKaybolmadi}
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
            <>
            <label className="field" data-alan="makine">
              <span className="field__label">{t('talep.hangiMakine')}</span>
              {/* Makine yoksa form hiç açılmıyor (bkz. yukarıdaki "makine yok"
                  ekranı); burada seçim her zaman var. */}
              <select
                  className="select"
                  value={makineId}
                  onChange={(e) => makineSec(e.target.value)}
                >
                  <option value="">{t('talep.makineSec')}</option>
                  {machines.map((m) => {
                    const pr = urunDilde(getProduct(m.productId), dil)
                    return (
                      <option key={m.id} value={m.id}>
                        {/* ÜRÜN TANINMAZSA ADI HİÇ YAZILMIYOR.

                            Önce `pr?.name + ' · ' + seri` yazılıyordu:
                            `pr` boş olduğunda satır ekranda
                            "undefined · SYNS-2023-00891" diye
                            görünüyordu. Seri numarası tek başına
                            makineyi zaten ayırt ediyor. */}
                        {[
                          pr?.name && pr.name + (m.nickname ? ` (${m.nickname})` : ''),
                          formatSerial(m.serial),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </option>
                    )
                  })}
                </select>
              {/* Talebin gideceği servis ya da neden gidemeyeceği. */}
              {/* Makinede süren talep varken yeni talep gitmiyor; aşağıdaki
                  kart o talebe ekleme yolunu gösteriyor. "Talebiniz …
                  servisine gidecek" o durumda yanlış olurdu. */}
              {tur === 'servis' && secilen && !acikTalep && seciliServis && (
                <span className="field__hint">
                  {t('talep.servisineGidecek', { servis: seciliServis.ad })}
                </span>
              )}
            </label>

            {/* Makinede işi süren servis talebi var: formun yerinde o
                talebe ekleme yolu (O5, yukarıda acikTalep). Düğme
                label'ın DIŞINDA; içinde olsaydı dokunuş seçim kutusuna
                giderdi. Tek ekranda tek soru: çiftçi formu doldurup
                sonunda geri çevrilmiyor. */}
            {/* Seçilen makinenin servisi yok: formun yerinde kart
                (yukarıda servisiYokMakine). Ana ekranın "servis
                atanmadı" kartıyla aynı iki cümle. */}
            {servisiYokMakine && (
              <div className="uyari-kart" role="status" data-eylem="servis-atanmamis">
                <strong style={{ display: 'block' }}>{t('talep.servisYok')}</strong>
                <p style={{ margin: '6px 0 0', lineHeight: 1.55 }}>{t('talep.servisYokAlt')}</p>
              </div>
            )}

            {acikTalep && (
              <div className="uyari-kart" role="status" data-eylem="acik-talebe-ekle">
                <strong style={{ display: 'block' }}>{t('talep.acikTalepBaslik')}</strong>
                <p style={{ margin: '6px 0 0', lineHeight: 1.55 }}>
                  {t('talep.acikTalepAlt', { no: acikTalep.no })}
                </p>
                <button
                  className="btn btn--primary"
                  style={{ marginTop: 12 }}
                  /* Formda yazılmış açıklama (Destek'ten gelen arıza
                     özeti dahil) ekleme penceresinin notuna taşınıyor;
                     çiftçi aynı şeyi ikinci kez anlatmasın. */
                  onClick={() =>
                    nav('/talebim/' + acikTalep.id, { state: { ekleme: true, not: aciklama.trim() } })
                  }
                >
                  <IconPlus size={20} /> {t('talepDetay.eklemeYap')}
                </button>
              </div>
            )}
            </>
          )}

          {/* Formun geri kalanı, makinede işi süren talep YOKSA ve seçilen
              makinenin servisi VARSA. İkisi de yalnız serviste dolu; parça
              ve teklif formu etkilenmiyor. */}
          {!acikTalep && !servisiYokMakine && (
          <>
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
                      onClick={() => {
                        setDurum(d.id)
                        /* Arızadan kuruluma geçildiğinde eski seçimler
                           kalmıyor: gizlenen bir alan hâlâ dolu olsaydı
                           kurulum talebi "İp kopuyor" belirtisiyle
                           gidiyordu. */
                        if (!ARIZA_DURUMLARI.includes(d.id)) {
                          setBelirtiler([])
                          setAciklama('')
                        }
                      }}
                    >
                      <span className="durum__isaret" />
                      <span className="durum__ad">{d.ad}</span>
                    </button>
                  ))}
                </div>
              </div>

              {arizaVar && (
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
              )}
            </>
          )}

          {/* ----------------------------------------------- Yedek parça

              ACİLİYET SORULMUYOR. Parça talebinde herkes "hemen" der;
              soru sıralamaya katkı vermiyordu. Yerine ADET soruluyor —
              o gerçekten gerekli bilgi: kaç tane hazırlanacağı, kaç
              tanenin faturası kesileceği başka türlü bilinmiyor.

              ÖNCE EKRANDA ON İSİM VARDI. Makinenin grubuna göre on
              kadar uydurma parça adı gösteriliyordu: "Rulman", "Kayış",
              "Pikap parmağı". Hiçbirinin PAKSAN'ın fiyat listesinde
              karşılığı yoktu; yanlarındaki fiyatlar da uydurmaydı.
              Çiftçi parçayı adıyla değil, kataloğun resmiyle ve
              KODUYLA tanıyor — PAKSAN'ın bastığı listede her parçanın
              resmi, kodu, adı ve fiyatı var. Ekran artık aynı şeyi
              gösteriyor.

              ÖNCE ALT MONTAJ, SONRA PARÇA. 538 parça tek listede
              gösterilemez; gösterilse de kimse sonuna kadar kaydırmaz.
              Fiyat listesi zaten alt montajlara ayrılmış ve seçme
              ekranı aynı sırayı izliyor. Arama bunun kestirmesi, yerine
              geçen yol değil.

              KATALOG FORMDA DEĞİL, AYRI EKRANDA. Önce bölüm listesi,
              arama ve parça satırları bu alanın içinde açılıyordu; form
              ekranlarca uzuyor, seçilenler listenin dibinde kalıyordu.
              Artık burada yalnız SEÇİLENLER duruyor: adet, fiyat ve
              toplam. "Parça Ekle" seçme ekranını açıyor (bkz.
              ParcaSecEkrani.jsx). Servis uygulamasındaki servis kaydı da
              böyle çalışıyor (bkz. src/servis/ekranlar/ServisKapanisi.jsx). */}
          {tur === 'parca' && (
            <>
              <div className="field" data-alan="parca">
                <span className="field__label">
                  {t('talep.hangiParca')}
                  <span className="field__istege"> · {t('talep.birdenFazla')}</span>
                </span>

                {/* Boş ekran çıkmıyor: liste inerken ne olduğu yazıyor. */}
                {katalogDurum === 'yukleniyor' && (
                  <span className="field__hint" style={{ marginTop: 0, marginBottom: 10 }}>
                    {t('parcaSec.yukleniyor')}
                  </span>
                )}

                {/* LİSTE İNMEZSE TALEP KAPANMIYOR.

                    Uygulama sunucu olmadan da çalışıyor; parça talebi de
                    çalışmalı. Hata kutusu bunu söylüyor ve altındaki
                    "Diğer" yolu yerinde duruyor: çiftçi istediği parçayı
                    yazıyla anlatıp talebi gönderiyor, tutarı PAKSAN
                    belirleyip kendisiyle konuşuyor.

                    Yeniden deneme gerçekten yeniden deniyor: kapı
                    başarısız isteği bellekte tutmuyor
                    (bkz. lib/parcaKatalogu.js). */}
                {katalogDurum === 'hata' && (
                  <div className="uyari-kart">
                    <strong style={{ display: 'block' }}>
                      {t('parcaSec.hataBaslik')}
                    </strong>
                    <p style={{ margin: '6px 0 0', lineHeight: 1.55 }}>
                      {t('parcaSec.hataMetin')}
                    </p>
                    <button
                      className="btn btn--soft"
                      style={{ marginTop: 12 }}
                      onClick={katalogTekrar}
                    >
                      {t('parcaSec.yenidenDene')}
                    </button>
                  </div>
                )}

                {/* Adet ve fiyat — yalnız seçilen parçalar için.

                    Her satırın yanına adet kutusu koymak listeyi düğme
                    duvarına çeviriyordu. Seçim yapılınca burada kısa bir
                    liste duruyor; artı-eksi düğmeleri eldivenli parmakla
                    basılacak kadar geniş.

                    FİYAT NEDEN BURADA: müşteri parça bedelini havaleyle
                    ÖNDEN gönderiyor. Ne kadar göndereceğini seçim
                    yaparken görmezse, ödeme adımında sürprizle
                    karşılaşıyor ya da telefon açmak zorunda kalıyor. */}
                {secimler.length > 0 && (
                  <>
                    <span className="parca-alan__alt">{t('talep.kacAdet')}</span>
                    <div className="adetler">
                      {hesap.satirlar.map((r) => (
                        <div key={r.kod} className="adet-satir">
                          <span className="adet-satir__ad">
                            {r.ad}
                            {/* Kod adın altında: müşteri telefonda ya da
                                havale açıklamasında parçayı koduyla
                                söylüyor, ad tekil değil. */}
                            <span className="adet-satir__alt serial-mono">{r.kod}</span>
                          </span>
                          {/* EKSİ DÜĞMESİ 1'DE PARÇAYI ÇIKARIYOR.

                              Önce 1'de kapalıydı ve vazgeçmek için parça
                              listesine dönüp aynı satırı bulmak
                              gerekiyordu. Ayrı bir çöp düğmesi de
                              konulamazdı: satırda dördüncü bir 44 piksel,
                              telefonda parça adına yer bırakmıyor
                              (ölçüldü: 360 piksel ekranda ada 34 piksel
                              kalıyor). Aynı düğme, 1'de işini değiştiriyor
                              ve simgesiyle bunu söylüyor. */}
                          <div className="adet-kutu">
                            <button
                              className="adet-kutu__dg"
                              onClick={() =>
                                r.adet <= 1 ? parcaCevir(r.kod) : adetDegis(r.kod, -1)
                              }
                              aria-label={
                                r.adet <= 1 ? t('parcaSec.cikar') : t('talep.adetAzalt')
                              }
                            >
                              {r.adet <= 1 ? <IconClose size={18} /> : <IconMinus size={18} />}
                            </button>
                            <span className="adet-kutu__sayi">{r.adet}</span>
                            <button
                              className="adet-kutu__dg"
                              onClick={() => adetDegis(r.kod, 1)}
                              aria-label={t('talep.adetArtir')}
                            >
                              <IconPlus size={18} />
                            </button>
                          </div>
                          {/* BİRİM fiyat — adetle çarpılmıyor.

                              Önce satır tutarı yazıyordu ve adet arttıkça
                              buradaki rakam da artıyordu; alt toplam zaten
                              aynı sayıyı gösterdiği için aynı bilgi iki
                              kez, iki farklı yerde değişiyordu. */}
                          {r.parca && (
                            <span className="adet-satir__tutar">
                              {paraYaz(r.parca.fiyat)} {PARA_BIRIMI}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {fiyatGosterilir && (
                      <div className="tutar-kutu">
                        <div className="tutar-kutu__satir">
                          <span>{t('parcaFiyat.araToplam')}</span>
                          <span>{paraYaz(hesap.araToplam)} {PARA_BIRIMI}</span>
                        </div>
                        {/* KDV satırı listenin KDV'li olup olmamasına
                            bağlı; gerekçesi ödeme adımında yazılı. */}
                        {KDV_HARIC_LISTE && (
                          <div className="tutar-kutu__satir">
                            <span>{t('parcaFiyat.kdv', { oran: KDV_ORANI * 100 })}</span>
                            <span>{paraYaz(hesap.kdv)} {PARA_BIRIMI}</span>
                          </div>
                        )}
                        <div className="tutar-kutu__satir tutar-kutu__satir--toplam">
                          <span>{t('parcaFiyat.toplam')}</span>
                          <span>{paraYaz(hesap.toplam)} {PARA_BIRIMI}</span>
                        </div>
                        <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
                          {t('parcaFiyat.kargoHaric')}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* PARÇA EKLE — seçme ekranının kapısı.

                    Liste boşken de duruyor: düğme ekranın bu noktasında
                    yer tutuyor, sonradan belirseydi çiftçi parçayı
                    nereden seçeceğini bilmezdi. Boşken "Parça Seç",
                    doluyken "Parça Ekle" yazıyor — Servisim'deki gibi.

                    "Diğer" seçiliyken görünmüyor: ikisi birbirini
                    dışlıyor. Liste inerken sönük duruyor ve basılmıyor;
                    liste inmediyse hiç görünmüyor, yerinde hata kutusu
                    ve "Diğer" yolu var. */}
                {!diger && katalogDurum !== 'hata' && (
                  <button
                    className="btn btn--soft parca-alan__ekle"
                    onClick={parcaEkraniniAc}
                    disabled={katalogDurum !== 'hazir'}
                  >
                    <IconPlus size={20} />
                    {secimler.length > 0 ? t('parcaSec.parcaEkle') : t('parcaSec.parcaSecDugme')}
                  </button>
                )}

                {/* "Diğer" HER DURUMDA burada: liste inmese de, makinenin
                    kendi listesi olmasa da çiftçinin parça isteyebileceği
                    yol bu. Seçme ekranında yok; orada bulamayan çiftçiye
                    buraya dönmesi söyleniyor. */}
                <div className="secenekler" style={{ marginTop: 12 }}>
                  <button
                    className={'secenek' + (diger ? ' secenek--on' : '')}
                    onClick={digerCevir}
                    aria-pressed={diger}
                  >
                    {alanEtiketi(PARCA_DIGER, dil)}
                  </button>
                </div>
                <span className="field__hint">{t('parcaSec.digerIpucu')}</span>
              </div>

              {/* "Diğer" seçildiğinde adet sorulmuyor: neyin adedi
                  olduğu belli değil. Ne istendiği açıklama kutusuna
                  yazılıyor, tutarı PAKSAN belirleyip müşteriyle
                  konuşuyor. */}
              {diger && (
                <div className="uyari-kart">{t('talep.digerAciklama')}</div>
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
                <span className="field__label">
                  {t('talep.neBalyalayacak')}
                  <span className="field__istege"> · {t('talep.birdenFazla')}</span>
                </span>
                <div className="secenekler">
                  {urunTipiSecenekleri(dil).map((x) => (
                    <button
                      key={x.deger}
                      className={'secenek' + (urunTipi.includes(x.deger) ? ' secenek--on' : '')}
                      onClick={() => cevir(setUrunTipi, x.deger)}
                    >
                      {x.etiket}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <span className="field__label">
                  {t('talep.neKadarArazi')}
                  <span className="field__istege"> · {t('talep.birdenFazla')}</span>
                </span>
                <div className="secenekler">
                  {araziSecenekleri(dil).map((x) => (
                    <button
                      key={x.deger}
                      className={'secenek' + (arazi.includes(x.deger) ? ' secenek--on' : '')}
                      onClick={() => cevir(setArazi, x.deger)}
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
              görüyor; hangisi kolayına geliyorsa kullanıcı onu seçiyor.

              KURULUM TALEBİNDE SORULMUYOR: alanın sorduğu şey "sorunu
              anlatın" ve kurulumda anlatılacak bir sorun yok. Ek ve ses
              de onunla birlikte kalkıyor — hepsi aynı kutunun içinde,
              hepsi arızayı anlatmak için. */}
          {(tur !== 'servis' || arizaVar) && (
          <div className="field" data-alan="aciklama">
            <label>
              <span className="field__label">
                {cfg('aciklamaLabel')}
                {!aciklamaZorunlu && <span className="field__istege"> · {t(tur === 'servis' ? 'ortak.varsa' : 'ortak.istegeBagli')}</span>}
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
          )}

          {/* Servis buraya gelecek. MAKİNENİN YERİ TEK BLOKTA (25 Eylül
              2026, kullanıcı sınaması O4): il ve ilçe onay penceresindeki
              "Konum" satırından buraya, adresin yanına geldi. Önce ayrı
              duruyorlardı ve hesaptan geliyorlardı; adres makinenin
              yerini, il başka bir yeri anlatabiliyordu. Hesaba yalnız boş
              olan yazılıyor (onayla → hesabaIslenecekKonum); Servisim'in
              elle kaydı hesabın üçlüsünü birlikte okuyor.

              ÜLKE SEÇİLEBİLİYOR (25 Eylül 2026, inceleme): İngilizce
              arayüzde hesabının ülkesi Türkiye olmayan çiftçi, Türkiye'deki
              makinesi için il listesi yerine serbest kutular görüyordu ve
              ülkeyi değiştirecek yer yoktu (konum penceresi servis talebinde
              artık açılmıyor). Seçim Türkçe arayüzde görünmüyor
              (KonumAlani → ulkeGoster varsayılanı). */}
          {tur === 'servis' && (
            <div className="field" data-alan="servisAdres">
              <span className="field__label">{t('talep.makineninYeri')}</span>
              <KonumAlani
                ulke={konumUlke}
                il={il}
                onIl={(v) => {
                  adresDokunuldu.current = true
                  setIl(v)
                }}
                ilce={ilce}
                onIlce={(v) => {
                  adresDokunuldu.current = true
                  setIlce(v)
                }}
                ilceZorunlu={ilceZorunlu}
                onUlke={(v) => {
                  adresDokunuldu.current = true
                  setKonumUlke(v)
                }}
              />
              <label style={{ display: 'block', marginTop: 16 }}>
                <span className="field__label">{t('talep.servisAdres')}</span>
                <span className="field__aciklama">{t('talep.servisAdresAciklama')}</span>
                <textarea
                  className="textarea"
                  style={{ minHeight: 84 }}
                  value={servisAdres}
                  onChange={(e) => {
                    adresDokunuldu.current = true
                    setServisAdres(e.target.value)
                  }}
                  placeholder={t('talep.servisAdresIpucu')}
                />
              </label>
            </div>
          )}

          {/* "Gün içinde ne zaman müsait olursunuz?" sorusu burada
              duruyordu; 22 Eylül 2026'da kaldırıldı (bkz.
              data/talepAlanlari.js başı). */}
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
          </>
          )}
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
                style={{ color: 'var(--pk-blue-yazi)', textDecoration: 'underline', textAlign: 'left' }}
                onClick={() => setPencere('numara')}
              >
                {t('talep.kullanmiyorum')}
              </button>

              {/* Servis talebinde "Konum" değil, servisin geleceği yer:
                  formda yazılan adres ve makinenin il/ilçesi birlikte
                  (O4). Düzeltme penceresi yok; bağlantı forma, adres
                  bloğuna götürüyor. Parça ve teklifte konum satırı ve
                  düzeltme kipi aynen duruyor. */}
              {tur === 'servis' ? (
                <>
                  <div className="onay-kutu">
                    <span className="onay-kutu__ikon"><IconPin size={20} /></span>
                    <span className="onay-kutu__body">
                      <span className="onay-kutu__etiket">{t('talep.servisGelecegiAdres')}</span>
                      <span className="onay-kutu__deger">
                        {[servisAdres.trim(), ilce ? `${ilce} / ${il}` : il].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </span>
                  </div>
                  <button
                    className="small"
                    style={{ color: 'var(--pk-blue-yazi)', textDecoration: 'underline', textAlign: 'left' }}
                    onClick={() => {
                      setOnay(false)
                      alanaGit('servisAdres')
                    }}
                  >
                    {t('talep.adresiDuzelt')}
                  </button>
                </>
              ) : (
                <>
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
                    style={{ color: 'var(--pk-blue-yazi)', textDecoration: 'underline', textAlign: 'left' }}
                    onClick={() => setPencere('konum')}
                  >
                    {t('talep.konumDuzelt')}
                  </button>
                </>
              )}

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
            <NumaraTalepFormu
              onKapat={() => setPencere('onay')}
              kapatEtiketi={numaraM.geriDon}
              altNot={numaraM.talepKaybolmadi}
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
