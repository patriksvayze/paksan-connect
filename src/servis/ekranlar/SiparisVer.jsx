import { useEffect, useMemo, useState } from 'react'
import { useGeri } from '../geri'
import {
  bakiyeDurumu,
  bakiyeIskontosuGetir,
  servisinIskontosu,
  servisParcaSiparisi,
} from '../../backoffice/veri'
import { servisleriGetir } from '../../data/katalog/servisler.js'
import { KDV_HARIC_LISTE, KDV_ORANI, PARA_BIRIMI, paraYaz } from '../../data/katalog/para.js'
import {
  grubunParcalari,
  katalogGetir,
  parcaAra,
  parcaBul,
} from '../../lib/parcaKatalogu'
import {
  bakiyeYetmiyor as bakiyeYetmiyorMu,
  parcaServisFiyati,
  sepetSatirlari,
  sepetToplami,
  siparisGoruntusu,
  siparisKalemleri,
  siparisTutari,
  yuzdeYap,
} from '../../lib/servisFiyat'
import { siparisOzeti } from '../../lib/servisKaydi'
import { Bolum, Onay } from '../Kabuk'
import { DikteliKutu } from '../Dikte'
import { ParcaKarti } from '../ParcaKarti'
import { MontajListesi } from '../MontajListesi'
import { ParcaOzetSatiri, TutarKutusu } from '../../components/ParcaOzeti'
import { AdresSecici, teslimatHatasi } from '../AdresSecici'
import { firmaAdresiOnerisi } from '../adresler'
import { adresYazisi, teslimatTemizle } from '../../lib/teslimat'
import {
  IconAlert,
  IconBack,
  IconCheckCircle,
  IconMinus,
  IconPlus,
  IconSearch,
  IconTrash,
} from '../../components/Icons'

/* ==========================================================================
   Servis uygulaması — PAKSAN'a sipariş

   ÜÇ ADIM

     1. SEÇİM   kalemler ve adetler
     2. ONAY    satır satır özet, tutar, teslim yeri, ödeme
     3. SONUÇ   sipariş numarası

   Onay adımı ayrı bir ekran, aynı sayfanın altı değil. Servis ne
   gönderdiğini gördükten sonra gönderiyor; gördüğü şey de siparişin
   kendisi — kalem, adet, satır tutarı. Birim fiyat 30 Eylül 2026'dan
   beri özette yazmıyor, seçim kartlarında duruyor: özetin satırı
   Connect'in "Talebiniz" satırının biçiminde, "kod · × adet" (kullanıcı:
   "parçaları paylaştığım ekran görüntüsündeki gibi görmek istiyorum,
   format anlamında yani"; aşağıda "ÖZETTE DE ADET DEĞİŞİYOR").

   TUTAR BAĞLAYICI DEĞİL ve bu ekranda yazıyor. Fiyat listesi
   göstergedir; siparişi PAKSAN onaylıyor, fatura LOGO'dan çıkıyor.

   SİPARİŞ ARTIK PAKSAN'IN KENDİ KATALOĞUNDAN VERİLİYOR

   Bu ekran bir dönem uydurma bir fiyat tablosundan (30 kalem, sahte
   kodlar) liste kuruyordu. Tablo 12 Eylül 2026'da kaldırıldı; parçanın
   tek kaynağı PAKSAN'ın bastığı yedek parça listesi — 538 parça, 35 alt
   montaj (bkz. lib/parcaKatalogu.js). Liste ekran açılınca ağdan
   iniyor; yükleme ve hata durumları gerçek.

   ANAHTAR AD DEĞİL KOD. Katalogda ad tekil değil, aynı ad birden fazla
   montajda geçiyor. Seçim, sepet ve sipariş satırları bu yüzden kodla
   taşınıyor; ad yalnız ekranda okunan yazı.

   PARÇA SEÇİMİYLE AYNI YOL: ÖNCE MONTAJ, SONRA PARÇA

   538 parça tek listede gösterilemez. Servis kaydındaki parça seçimi
   (bkz. ekranlar/ParcaSec.jsx) bu işi alt montajlara bölerek çözüyor ve
   servis o ekranı zaten kullanıyor. Sipariş ekranı ayrı bir düzen
   kurmuyor: aynı grup listesi, aynı arama kutusu, aynı sıra — fiyat
   listesinin sırası. Arama kestirme, asıl yol montaj listesi.

   FİYAT SERVİSİN ÖDEDİĞİ FİYAT. Katalogdaki tutar tavsiye satış
   fiyatı; satırda görünen ve toplanan, onun iskontolu hâli
   (bkz. lib/servisFiyat.js).

   İNDİRİM EKRANDA GÖRÜNÜYOR (23 Eylül 2026, kullanıcının isteği:
   "Uygulanan iskonto, servisim uygulamasında parça siparişi checkout
   ekranında görebilmeli servis"). Oran artık backoffice'ten değişiyor
   ve servise özel olabiliyor (veri.js → servisinIskontosu). Kartlarda
   liste fiyatı üstü çizili duruyor; özette liste fiyatıyla toplam,
   indirim oranı ve düşülen tutar ayrı satır. Oran siparişin fiyat
   görüntüsüne yazılıyor (`iskontoOrani`). Servis ekranında "iskonto"
   yazmıyor, "indirim" yazıyor (yasak terim).

   ONAYDA GÖRÜLEN TUTAR GEÇER (24 Eylül 2026, kullanıcının kararı:
   "sipariş verildiği zamanki tutar üzerinden ücretlendirilmeli").
   Oranlar ve bakiye onay penceresi açılırken yeniden okunuyor;
   pencerede görünen tutar kaydedilen tutar. PAKSAN oranı tam o sırada
   değiştirse de servisin onayladığı geçiyor. Önce veri katmanı eski
   oranla gelen siparişi reddediyordu. Pencere 30 dakikadan uzun açık
   kalırsa sipariş kaydedilmiyor, ekran yeni tutarı gösteriyor (bkz.
   lib/servisFiyat.js → ONAY_TUTAR_SURESI).

   ADET KUTUYA YAZILMIYOR, DÜĞMEYLE SAYILIYOR

   Her satırın sağında bir yazı kutusu vardı ve servis oraya rakam
   yazıyordu. Tarlada, eldivenle, tek elle kullanılan bir uygulamada
   sayı klavyesi açıp "2" yazmak, iki dokunuşluk bir işi beş dokunuşa
   çıkarıyordu. Satırlar da seçili olup olmadıklarını söylemiyordu.
   Şimdi servis kaydındaki parça seçimiyle aynı kart kullanılıyor
   (bkz. servis/ParcaKarti.jsx): büyük görsel, kod, ad, fiyat; seçili
   kartın altında eksi-artı.

   ÖZETTE DE ADET DEĞİŞİYOR, SATIR CONNECT'İN SATIRI (30 Eylül 2026,
   kullanıcının isteği: "checkout ekranında seçilen parçaları sadece
   kaldırabiliyoruz, adetlerini değiştiremiyoruz. Bunu yapmak için geri
   gelmek gerekiyor" ve "parçaları paylaştığım ekran görüntüsündeki gibi
   görmek istiyorum, format anlamında yani, ek olarak buna parça
   satırlarına trash ikonu gelebilir"). Ekran görüntüsü Connect'in
   "Talebiniz" kartıydı. Özetin satırı artık onun satırı: solda resim,
   adın altında "kod · × adet", sağda satır tutarı; altında tutar kutusu
   (ortak bileşen, bkz. components/ParcaOzeti.jsx). Her satırın altında
   seçim adımındaki eksi-artı ve yazılı "Kaldır". Adet seçimle aynı
   durumda (`adetler`): özetten geri dönen servis seçim ekranında aynı
   adetleri görüyor; tutar, ödeme seçeneği ve bakiyenin yetip yetmediği
   aynı işlevlerden yeniden hesaplanıyor. Eksi 1'de duruyor; parçayı
   çıkarmak "Kaldır"ın işi. Son parça kaldırılınca ekran seçim adımına
   dönüyor: boş bir özetin tek işi zaten parça seçmeye geri göndermek.

   İSTENEN TESLİM TARİHİ KALDIRILDI

   Soruluyordu ve hiçbir yere bağlanmıyordu — ne sevkiyat planına ne
   kapanış formuna giriyordu. Cevabı hiçbir şeyi değiştirmeyen bir
   soru, formu uzatmaktan başka iş yapmaz.

   YERİNE ÖDEME BİÇİMİ GELDİ

   Servis cari hesaplı bir iş ortağı: PAKSAN ona hak ediş borçlu.
   Bakiyesi siparişi karşılıyorsa bedelin oradan düşülmesini
   isteyebiliyor. Yetmiyorsa seçenek kapalı. Seçeneğin adı 30 Eylül
   2026'dan beri "Bakiyem" (kullanıcının isteği: "'Bakiyemden
   düşülsün'ün geçtiği yerleri 'Bakiyem' olarak değiştir"); aşağıdaki
   alıntılar o günden önceki adı taşıyor.

   SEÇENEKTE YALNIZ BAKİYE YAZIYOR (24 Eylül 2026, kullanıcının isteği:
   "Bakiyemden Düşülsün kutucuğu içindeki eksik tutar bilgisini kaldır,
   sadece bakiye gözüksün"). Eksik tutar satırı kaldırıldı; kapalı
   seçeneğin sebebi, hemen üstündeki genel toplamla yan yana okunan
   bakiye. Faturayla seçeneğinin açıklaması da kullanıcının cümlesi:
   "Ödemeler ay sonu yapılır." Kapalı olmasının nedeni 25 Eylül
   2026'dan beri seçeneklerin ALTINDA tek, rakamsız cümle: açıklamasız
   kapalı düğme çıkmaz sokaktı ve servis bakiyeyi toplamla kendisi
   karşılaştırmak zorundaydı (kullanıcı sınaması). Kutunun içi
   kullanıcının istediği gibi yalnız bakiye.

   BAKİYEDEN ÖDEMEDE EK İNDİRİM (24 Eylül 2026). PAKSAN bakiyeden
   ödenen siparişe servisin yedek parça indirimine ek bir indirim
   uygulayabiliyor (oran backoffice'te, Yedek Parça Kataloğu → Servis
   iskontosu; bkz. lib/servisFiyat.js). Oran sıfırdan büyükse seçeneğin
   başlığının yanında "%3 ek indirim" rozeti duruyor — servis, hangi
   seçeneğin ona para kazandırdığını seçmeden görüyor. Seçince özette
   ve onay penceresinde ayrı satır. Bakiyenin yetip yetmediği ek
   indirimli toplama göre ölçülüyor: indirim, bakiyesi sınırda olan
   servise bu seçeneği açabiliyor. Tutar formülü tek yerde
   (`siparisTutari`); veri katmanı ve sınama aynısını kullanıyor.

   Para bu ekranda işlenmiyor: sipariş henüz onaylanmadı. Tutar ise
   bağlayıcı; düşüm, parça kargoya verilip talep kapandığında bu
   siparişin tutarıyla yapılıyor (bkz. backoffice/veri.js → talepKapat).

   SİPARİŞ AYRI BİR DEFTERE DEĞİL, TALEPLER'E DÜŞÜYOR

   Önce kendi deposu ve backoffice'te kendi ekranı vardı. Kaldırıldı:
   yedek parça personeli gününü Talepler ekranında geçiriyor ve
   servisin siparişi oraya hiç düşmüyordu. Artık sipariş normal bir
   yedek parça talebi — aynı liste, aynı durumlar, aynı kapanış
   (bkz. backoffice/veri.js → servisParcaSiparisi).

   SİPARİŞİN İÇİNE FİYAT ANLIK GÖRÜNTÜSÜ YAZILIYOR

   Fiyat listesi değişiyor. Altı ay sonra bu siparişe bakan personel o
   günün fiyatını değil, siparişin verildiği günün fiyatını görmeli.
   Bu yüzden satırlar, katalog sürümü ve kaynağı kaydın içine
   gönderiliyor (`parcaFiyat`). Tutarlar servisin ödediği iskontolu
   fiyattan; kaydın canlı katalogla yeniden hesaplanması gerekmiyor.
   ========================================================================== */

/* Seçim ile özet arasında geçince dokunuşun yutulduğu süre; Servisim'in
   ekran geçişindeki kilitle aynı (ServisPanel.jsx → GECIS_KILIDI_MS). */
const ADIM_KILIDI_MS = 350

/* `geriRef`: sayfanın üstündeki "Geri" düğmesi önce buraya soruyor
   (ServisPanel.jsx). Dönen `true`, "ben karşıladım" demek. */
export function SiparisVer({ oturum, surum, onKapat, onVerildi, geriRef }) {
  const [adim, setAdim] = useState('secim')
  /* Seçim kod → adet. Ad anahtar olarak kullanılmıyor: katalogda
     tekrar eden adlar var, ikisi tek satıra düşerdi. */
  const [adetler, setAdetler] = useState({})
  const [arama, setArama] = useState('')
  const [not, setNot] = useState('')
  const [odeme, setOdeme] = useState('fatura')
  const [hata, setHata] = useState('')
  const [onay, setOnay] = useState(false)
  const [siparis, setSiparis] = useState(null)
  /* Oranlar ve bakiye onay penceresi açılırken ve veri katmanı
     "değişti" deyince yeniden okunuyor. `fiyatZamani` pencerede
     görünen tutarların okunduğu an; siparişle gidiyor. */
  const [iskontoSurum, setIskontoSurum] = useState(0)
  const [fiyatZamani, setFiyatZamani] = useState(null)
  const iskonto = useMemo(() => {
    void iskontoSurum
    return servisinIskontosu(oturum.servisId)
  }, [oturum.servisId, iskontoSurum])
  /* Bakiyeden ödemede ek indirim oranı (kesir, 0 = yok). Aynı sürümle
     yenileniyor: ikisi birlikte okunuyor. */
  const bakiyeOrani = useMemo(() => {
    void iskontoSurum
    return bakiyeIskontosuGetir()
  }, [iskontoSurum])

  /* BAŞKA SEKMEDE DEĞİŞEN ORAN KARTLARA DÜŞÜYOR (25 Eylül 2026, kullanıcı
     sınaması O7). `surum` Servisim'in tazeleme sayacı (ServisPanel.jsx):
     PAKSAN indirimi ya da bakiyeyi değiştirince kartlardaki fiyat ve
     bakiye yeniden okunuyor. Onay penceresi açıkken DOKUNULMUYOR:
     pencerede görünen tutar kaydedilecek tutar ("ONAYDA GÖRÜLEN TUTAR
     BAĞLAYICI"). Pencere kapanınca (Vazgeç) bekleyen değişiklik okunuyor:
     `onay` da bağımlılıkta; yoksa pencere açıkken gelen değişiklik bir
     sonraki depo olayına kadar kartlara düşmüyordu (25 Eylül 2026,
     inceleme). */
  useEffect(() => {
    if (!onay) setIskontoSurum((x) => x + 1)
  }, [surum, onay]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Katalog ağdan iniyor; üç hâl de gerçek. Servis kaydındaki parça
     seçimiyle aynı yükleme ve hata yüzeyi kullanılıyor. */
  const [durum, setDurum] = useState('yukleniyor')
  const [katalog, setKatalog] = useState(null)
  const [grup, setGrup] = useState(null)

  useEffect(() => {
    let gecerli = true
    setDurum('yukleniyor')
    katalogGetir()
      .then((k) => {
        if (!gecerli) return
        setKatalog(k)
        setDurum('hazir')
      })
      .catch(() => gecerli && setDurum('hata'))
    return () => {
      gecerli = false
    }
  }, [])

  const servis = useMemo(
    () => servisleriGetir().find((b) => b.id === oturum.servisId) || null,
    [oturum.servisId],
  )

  /* KULLANILABİLİR BAKİYE (24 Eylül 2026). Bakiyeden ödenen sipariş
     parça gönderilince düşülüyor; gönderilmeyi bekleyen siparişlerin
     tutarı bu arada "ayrılmış" sayılıyor. Önce yalnız hesaptaki tutara
     bakılıyordu ve aynı bakiyeyle birkaç sipariş verilebiliyordu
     (bkz. veri.js → bakiyeDurumu). */
  const bakiyeBilgi = useMemo(() => {
    void iskontoSurum
    return bakiyeDurumu(oturum.servisId)
  }, [oturum.servisId, adim, iskontoSurum])
  const bakiye = bakiyeBilgi.kullanilabilir

  /* TESLİM ADRESİ ARTIK ADRESLERİM'DEN SEÇİLİYOR (17 Eylül 2026,
     kullanıcının isteği).

     Burada servisin firma adresiyle dolu serbest bir kutu vardı. Her
     siparişte aynı adres yeniden okunuyor, başka bir yere gidecekse
     elle siliniyor ve baştan yazılıyordu; PAKSAN'a da alıcısı ve
     telefonu belli olmayan tek satırlık bir yazı düşüyordu.

     Şimdi defterdeki varsayılan adres seçili geliyor; başka bir kayıtlı
     adres tek dokunuş, müşterinin tarlası gibi bir kerelik yer "Elle
     Gir". Değer yapısal: alıcı, telefon, il, ilçe, açık adres (bkz.
     lib/teslimat.js). Firma adresi yalnız ilk adresin önerisi. */
  const [teslimat, setTeslimat] = useState(null)
  const adresOnerisi = useMemo(() => firmaAdresiOnerisi(servis, oturum.ad), [servis, oturum.ad])

  /* Sepet. Sıra, seçim sırası: servis en son dokunduğu parçayı özetin
     sonunda bulur. Fiyat katalogdan değil `parcaServisFiyati`den
     geliyor — servis iskontolu fiyatı ödüyor. Satırlar, toplamlar ve
     siparişe yazılan fiyat görüntüsü lib/servisFiyat.js'te (29 Eylül
     2026): Servisim'in demo verisi siparişi aynı işlevlerle veriyor. */
  const secili = useMemo(
    () =>
      sepetSatirlari(
        Object.entries(adetler).map(([kod, adet]) => ({ kod, adet, parca: parcaBul(katalog, kod) })),
        iskonto.oran,
      ),
    [katalog, adetler, iskonto.oran],
  )

  /* Sepetin toplamları. Ek indirim ve KDV burada değil: ikisi ödeme
     biçimine göre `siparisTutari`den geliyor (aşağıda). */
  const sepet = useMemo(() => sepetToplami(secili), [secili])

  /* İki ödeme biçiminin tutarı. `araToplam`, `kdv`, `toplam` ek indirim
     düşülmüş hâliyle üzerine yazılıyor; faturada ek indirim yok. */
  const faturaHesabi = useMemo(
    () => ({ ...sepet, ...siparisTutari(sepet.araToplam, { odeme: 'fatura' }) }),
    [sepet],
  )
  const bakiyeHesabi = useMemo(
    () => ({ ...sepet, ...siparisTutari(sepet.araToplam, { odeme: 'bakiye', bakiyeOrani }) }),
    [sepet, bakiyeOrani],
  )

  /* Seçeneğin altındaki cümle yalnız gerçekten bakiye yetmediğinde:
     fiyatı olmayan parça yüzünden toplam sıfırsa kapalılığın nedeni
     bakiye değil (lib/servisFiyat.js → bakiyeYetmiyor). */
  const bakiyeYetmiyor = bakiyeYetmiyorMu(bakiye, bakiyeHesabi.toplam)
  /* Bakiye siparişin KDV dâhil tutarını — ek indirim düşülmüş hâlini —
     karşılıyor mu? Karşılamıyorsa seçenek kapalı. Aynı işlevden: veri
     katmanının reddi de onu çağırıyor (veri.js → servisParcaSiparisi);
     ekranın "yeter" dediği sipariş reddedilmesin (25 Eylül 2026, inceleme). */
  const bakiyeYeter = bakiyeHesabi.toplam > 0 && !bakiyeYetmiyor
  const gecerliOdeme = bakiyeYeter ? odeme : 'fatura'
  const hesap = gecerliOdeme === 'bakiye' ? bakiyeHesabi : faturaHesabi

  /* BAKİYE YETMEYİNCE SEÇİM FATURAYA GEÇİYOR VE ORADA KALIYOR (30 Eylül
     2026, inceleme). Bakiye yetmeyince ekran "Faturayla"yı seçili
     gösteriyor ve "bu sipariş faturayla verilecek" diyordu, ama seçim
     arkada "bakiye" kalıyordu. Özete adet düğmeleri gelince bu tek
     dokunuşla görünür oldu: artıyla bakiye yetmez oluyor, eksiyle
     yeniden yetiyor ve servis seçmeden "Bakiyem" yeniden seçili
     geliyordu. Ödeme biçimi para demek; ekranda görünen seçim servisin
     seçimi olmalı. Bakiye yeniden yetse de "Bakiyem"i servis kendisi
     seçiyor. Seçim adımında sepet boşalınca da (toplam sıfır) aynısı
     oluyor. Aynı kural başka sekmeden gelen bakiye ve oran
     değişikliğinde de geçerli. */
  useEffect(() => {
    if (!bakiyeYeter && odeme === 'bakiye') setOdeme('fatura')
  }, [bakiyeYeter, odeme])

  function adetDegistir(kod, fark) {
    setAdetler((a) => {
      const simdiki = Number(a[kod]) || 0
      const yeni = Math.max(0, simdiki + fark)
      const sonraki = { ...a }
      if (yeni > 0) sonraki[kod] = yeni
      else delete sonraki[kod]
      return sonraki
    })
    setHata('')
  }

  function gonder() {
    setOnay(false)
    const teslimHatasi = teslimatHatasi(teslimat)
    if (teslimHatasi) return setHata(teslimHatasi)

    const sonuc = servisParcaSiparisi({
      servisId: oturum.servisId,
      servisAd: oturum.ad,
      servisNo: oturum.no,
      servisTel: servis?.tel || '',
      il: servis?.il || '',
      ilce: servis?.ilce || '',
      /* Kalem satırında artık kod da var: talebi okuyan taraf parçayı
         adıyla değil koduyla buluyor. */
      kalemler: siparisKalemleri(secili),
      /* Fiyat anlık görüntüsü: sipariş anındaki satırlar, katalog
         sürümü ve kaynağı, onayda görülen oran ve okunma anı. Tutarlar
         servisin ödediği iskontolu fiyattan — liste fiyatından değil
         (bkz. lib/servisFiyat.js → siparisGoruntusu). */
      parcaFiyat: siparisGoruntusu({
        katalog,
        satirlar: secili,
        hesap,
        iskontoOrani: iskonto.oran,
        fiyatZamani,
      }),
      not,
      teslimat: teslimatTemizle(teslimat),
      odeme: gecerliOdeme,
      tutar: hesap.araToplam,
      tutarKdvli: hesap.toplam,
    })
    if (sonuc.hata) {
      /* Bakiye yetmediyse de yeniden okunuyor: seçenek kapanıyor ve
         ödeme faturaya dönüyor (bkz. veri.js → bakiyeDurumu). */
      if (sonuc.iskontoDegisti || sonuc.bakiyeYetmiyor) setIskontoSurum((x) => x + 1)
      return setHata(sonuc.hata)
    }

    setSiparis(sonuc.talep)
    setAdim('sonuc')
  }

  /* Geri tuşu bir kademe geri gider, siparişi kapatmaz (bkz.
     servis/geri.jsx): özetten seçime, aramadan ve parça listesinden
     montaj listesine — ParcaSec'teki "Geri" ile aynı sıra.

     SEPET SORULMADAN BOŞALMIYOR (29 Eylül 2026, görünüm önerisi;
     kullanıcının onayı). Sayfanın üstündeki "Geri" bu sırayı bilmiyordu:
     parça listesindeyken ona basan servisin bütün seçimi siliniyordu.
     Şimdi o düğme de aynı sırayı izliyor (`geriRef`); en üst kademede
     sepet doluysa, "Vazgeç"te olduğu gibi, önce soruluyor. */
  const [cikisSor, setCikisSor] = useState(false)
  const geriGit = () => {
    if (adim === 'onay') {
      setAdim('secim')
      setHata('')
      return true
    }
    if (adim !== 'secim') return false
    if (arama.trim()) {
      setArama('')
      return true
    }
    if (grup) {
      setGrup(null)
      return true
    }
    if (secili.length) {
      setCikisSor(true)
      return true
    }
    return false
  }
  if (geriRef) geriRef.current = geriGit

  /* ADIM DEĞİŞİNCE ÇİFT DOKUNUŞUN İKİNCİSİ YUTULUYOR (30 Eylül 2026).
     Servisim ekran değişince 350 ms dokunuş yutuyor (ServisPanel.jsx →
     GECIS_KILIDI_MS); seçimden özete ve özetten seçime geçiş o kilidin
     dışındaydı, çünkü sayfa aynı. Özete adet düğmeleri ve "Kaldır"
     gelince açık kaldı: "Devam"a iki kez dokunan servisin ikinci dokunuşu
     özette o noktadaki düğmeye, son parçayı kaldırırken ikinci dokunuş
     seçim ekranında altta kalan parça kartına gidip onu yeniden seçerdi.
     Aynı süre, aynı yakalama. */
  useEffect(() => {
    const bitis = Date.now() + ADIM_KILIDI_MS
    const yut = (e) => {
      if (Date.now() < bitis) {
        e.stopPropagation()
        e.preventDefault()
      }
    }
    window.addEventListener('click', yut, true)
    const zaman = setTimeout(() => window.removeEventListener('click', yut, true), ADIM_KILIDI_MS)
    return () => {
      clearTimeout(zaman)
      window.removeEventListener('click', yut, true)
    }
  }, [adim])

  useGeri(adim === 'onay' || (adim === 'secim' && Boolean(arama.trim() || grup || secili.length)), () => {
    geriGit()
  })
  if (adim === 'sonuc' && siparis) {
    return <Sonuc siparis={siparis} onBitir={onVerildi} />
  }

  if (adim === 'onay') {
    return (
      <>
        <Ozet
          secili={secili}
          hesap={hesap}
          iskontoOrani={iskonto.oran}
          teslimat={teslimat}
          onTeslimat={(t) => {
            setTeslimat(t)
            setHata('')
          }}
          servisId={oturum.servisId}
          adresOnerisi={adresOnerisi}
          not={not}
          onNot={setNot}
          odeme={gecerliOdeme}
          onOdeme={setOdeme}
          bakiye={bakiye}
          ayrilan={bakiyeBilgi.ayrilan}
          bakiyeYeter={bakiyeYeter}
          bakiyeYetmiyor={bakiyeYetmiyor}
          bakiyeOrani={bakiyeOrani}
          hata={hata}
          onGeri={() => {
            setAdim('secim')
            setHata('')
          }}
          onVer={() => {
            const teslimHatasi = teslimatHatasi(teslimat)
            if (teslimHatasi) return setHata(teslimHatasi)
            setHata('')
            /* Pencerede görünen tutar o anın tutarı: oranlar ve bakiye
               burada yeniden okunuyor, okunma anı siparişle gidiyor. */
            setIskontoSurum((x) => x + 1)
            setFiyatZamani(Date.now())
            setOnay(true)
          }}
          katalog={katalog}
          /* Özetteki eksi-artı seçim adımının işleviyle: adet tek yerde
             (`adetler`), geri dönülünce seçim ekranı aynı sayıyı gösteriyor.
             Eksi 1'in altına inmiyor; çıkarmak "Kaldır"ın işi. */
          onAdet={(k, fark) => {
            if (k.adet + fark >= 1) adetDegistir(k.kod, fark)
          }}
          onSil={(k) => {
            adetDegistir(k.kod, -k.adet)
            /* Son parça çıkınca seçim adımına (30 Eylül 2026): boş özette
               verilecek sipariş yok; servisin yapacağı iş parça seçmek. */
            if (secili.length <= 1) {
              setAdim('secim')
              setHata('')
            }
          }}
        />

        {onay && (
          <Onay
            baslik={`Sipariş PAKSAN’a gidecek`}
            metin={`PAKSAN yedek parça birimi siparişi görecek ve hazırlayacak. Tutar, sipariş anındaki fiyat ve indirimle hesaplanır; sipariş verildikten sonra değişmez.`}
            /* Sipariş onayında listenin kendisi duruyor, sayısı değil.
               "3 tür · 7 adet" satırı neyin sipariş edildiğini
               söylemiyordu; yanlış adet ancak parça geldiğinde fark
               ediliyordu. */
            parcalar={secili.map((k) => ({ kod: k.kod, ad: k.ad, adet: k.adet }))}
            kalemler={[
              ...(hesap.iskontoTutari > 0
                ? [{
                    ad: `İndirim (%${yuzdeYap(iskonto.oran)})`,
                    deger: `−${paraYaz(hesap.iskontoTutari)} ${PARA_BIRIMI}`,
                  }]
                : []),
              /* Bakiyeden ödemede ek indirim; yalnız bakiye seçiliyken. */
              ...(hesap.bakiyeIskontoTutari > 0
                ? [{
                    ad: `Ek indirim (%${yuzdeYap(hesap.bakiyeIskontoOrani)})`,
                    deger: `−${paraYaz(hesap.bakiyeIskontoTutari)} ${PARA_BIRIMI}`,
                  }]
                : []),
              { ad: 'Tutar', deger: `${paraYaz(hesap.toplam)} ${PARA_BIRIMI}` },
              /* Seçeneğin adı "Bakiyem" (30 Eylül 2026, kullanıcının
                 isteği: "'Bakiyemden düşülsün'ün geçtiği yerleri
                 'Bakiyem' olarak değiştir"); özetteki seçenekle aynı. */
              {
                ad: 'Ödeme',
                deger: gecerliOdeme === 'bakiye' ? 'Bakiyem' : 'Faturayla',
              },
              /* Adres de son özette: yanlış adrese çıkan parçanın geri
                 dönüşü günler sürüyor. */
              { ad: 'Teslimat adresi', deger: adresYazisi(teslimat) },
            ]}
            dugme="Sipariş Ver"
            onOnayla={gonder}
            onVazgec={() => setOnay(false)}
          />
        )}
      </>
    )
  }

  return (
    <>
    <Secim
      durum={durum}
      katalog={katalog}
      grup={grup}
      onGrup={setGrup}
      adetler={adetler}
      arama={arama}
      onArama={setArama}
      onAdet={adetDegistir}
      secili={secili}
      /* Seçim adımındaki toplam kartlardaki fiyatların toplamı, KDV
         dâhil; ek indirim ödeme biçimi seçilince, özette. */
      hesap={faturaHesabi}
      iskontoOrani={iskonto.oran}
      onDevam={() => setAdim('onay')}
      onTekrar={() => {
        setDurum('yukleniyor')
        yenidenDene(setDurum, setKatalog)
      }}
    />
    {cikisSor && (
      <Onay
        baslik="Sipariş verilmedi"
        metin="Şimdi çıkarsanız seçtiğiniz parçalar silinecek."
        dugme="Seçimi Sil ve Çık"
        onOnayla={() => {
          setCikisSor(false)
          onKapat()
        }}
        onVazgec={() => setCikisSor(false)}
      />
    )}
    </>
  )
}

/* Yeniden deneme: bellekteki hata zaten silinmiş oluyor
   (bkz. lib/parcaKatalogu.js), tek yapılacak yeni bir istek. */
function yenidenDene(setDurum, setKatalog) {
  katalogGetir()
    .then((k) => {
      setKatalog(k)
      setDurum('hazir')
    })
    .catch(() => setDurum('hata'))
}

/* -------------------------------------------------------------- 1. Seçim */

function Secim({
  durum,
  katalog,
  grup,
  onGrup,
  adetler,
  arama,
  onArama,
  onAdet,
  secili,
  hesap,
  iskontoOrani,
  onDevam,
  onTekrar,
}) {
  const aranan = arama.trim()
  const aramaAcik = aranan.length >= 2
  const sonuclar = useMemo(() => parcaAra(katalog, arama), [katalog, arama])

  /* Listelenen parçalar: arama varsa sonuçlar, yoksa seçili montajın
     parçaları. Hiçbiri yoksa ekranda montaj listesi duruyor. */
  const listelenen = aramaAcik
    ? sonuclar
    : grup
      ? grubunParcalari(katalog, grup.id)
      : []

  const adetToplam = secili.reduce((t, k) => t + k.adet, 0)

  return (
    <>
      <p className="ipucu">
        Almak istediğiniz parçaları seçin. Bir sonraki adımda özeti
        görecek ve siparişi vereceksiniz.
      </p>

      {/* İndirim sipariş ekranının başında: kartlardaki fiyatın neden
          liste fiyatından düşük olduğu buradan belli. Yazı 24 Eylül
          2026'da değişti; kullanıcı eskisini anlaşılmaz buldu ("Fiyatlar,
          yedek parça indiriminiz düşülmüş olarak gösteriliyor"). */}
      {iskontoOrani > 0 && (
        <div className="indirim-serit">
          <span className="indirim-serit__oran">%{yuzdeYap(iskontoOrani)}</span>
          <span>Fiyatlara yedek parça indiriminiz uygulandı.</span>
        </div>
      )}

      {durum === 'yukleniyor' && <Yukleniyor />}
      {durum === 'hata' && <Hata onTekrar={onTekrar} />}

      {durum === 'hazir' && (
        <>
          <label className="ara-kutu">
            <IconSearch size={18} />
            <input
              className="gir"
              value={arama}
              onChange={(e) => onArama(e.target.value)}
              placeholder="Parça adı veya kodu"
              aria-label="Parça ara"
            />
          </label>

          {/* Montaj listesi: arama boşken ve bir montaj seçilmemişken.
              Sıra katalogdan geliyor, yani basılı fiyat listesinin
              sırası; sağdaki sayı o montajda kaç parça olduğunu
              söylüyor. */}
          {!grup && !aranan && <MontajListesi katalog={katalog} onSec={onGrup} />}

          {(grup || aramaAcik) && (
            <>
              {/* Montaja girildiğinde geri dönüş yolu ekranda duruyor:
                  sayfanın geri düğmesi siparişin tamamından çıkıyor,
                  servisin istediği ise bir üst kademe. */}
              {grup && !aranan && (
                <button
                  className="dg dg--blok"
                  style={{ marginBottom: 12 }}
                  onClick={() => onGrup(null)}
                >
                  <IconBack size={17} />
                  Bölüm Listesine Dön
                </button>
              )}

              {aramaAcik && (
                <p className="ipucu">
                  “{aranan}” için {listelenen.length} parça bulundu.
                </p>
              )}

              {listelenen.length === 0 ? (
                <p className="kucuk sonuk">Eşleşen parça yok.</p>
              ) : (
                <Bolum ad={grup && !aranan ? grup.ad : 'Yedek Parça'}>
                  <div className="parca-izgara">
                    {listelenen.map((p) => (
                      <SecimKarti
                        key={p.kod}
                        parca={p}
                        oran={iskontoOrani}
                        adet={Number(adetler[p.kod]) || 0}
                        onAdet={(fark) => onAdet(p.kod, fark)}
                      />
                    ))}
                  </div>
                </Bolum>
              )}
            </>
          )}
        </>
      )}

      {/* ALT ÇUBUK TEK SATIR (29 Eylül 2026, görünüm önerisi S8). Toplam
          kutusu, "Devam" ve "Vazgeç" üst üste ekranın %29'unu kaplıyordu;
          parça seçilen alan küçülüyordu. Şimdi solda toplam, sağda
          "Devam". "Vazgeç" kalktı: sayfanın üstündeki "Geri" aynı işi
          yapıyor ve sepet doluysa, "Vazgeç"in yaptığı gibi, önce soruyor
          (yukarıda `geriGit`). */}
      <div className="yapisik">
        <div className="siparis-dip">
          {secili.length > 0 && (
            <div className="siparis-dip__hesap">
              <span className="siparis-dip__sayi">
                {secili.length} parça türü · {adetToplam} adet
              </span>
              {/* KDV DÂHİL (29 Eylül 2026, kullanıcının onayı). Burada KDV
                  hariç ara toplam yazıyordu; özet, onay penceresi, liste ve
                  Hak Ediş KDV dâhil tutarı gösteriyor ("SİPARİŞİN TUTARI HER
                  EKRANDA KDV DÂHİL"). Servis seçerken gördüğü rakamı listede
                  bulamıyordu. */}
              <span className="siparis-dip__tutar">
                <strong>
                  {paraYaz(hesap.toplam)} {PARA_BIRIMI}
                </strong>
                <small>KDV dâhil</small>
              </span>
            </div>
          )}
          <button
            className={'dg dg--ana siparis-dip__devam' + (secili.length ? '' : ' dg--blok')}
            onClick={onDevam}
            disabled={!secili.length}
          >
            Devam
          </button>
        </div>
      </div>
    </>
  )
}

/* Servis kaydındaki parça seçimiyle AYNI KART (bkz. servis/ParcaKarti.jsx).

   Önce 44 piksellik görselli satırlardı; resimde parça tanınmıyordu
   ve servis ne sipariş edeceğini adından tahmin ediyordu. Artık iki
   sütunlu kartta büyük görsel, kod, ad ve servisin ödeyeceği fiyat.

   Kartın tamamı dokunma hedefi: seçilmemişken bir kez dokunmak bir
   adet ekliyor, seçiliyken dokunmak parçayı sepetten çıkarıyor.
   Seçilince kartın altına eksi-artı düğmeleri geliyor; kartın
   genişliğini dolduruyorlar ve parmak boyundalar. */
function SecimKarti({ parca, oran, adet, onAdet }) {
  const f = parcaServisFiyati(parca, oran)
  const secili = adet > 0

  return (
    <ParcaKarti
      parca={parca}
      fiyat={f ? f.alis : null}
      listeFiyati={f && f.fiyat > f.alis ? f.fiyat : null}
      secili={secili}
      onSec={() => onAdet(secili ? -adet : 1)}
    >
      {/* Kartta eksi 1'den 0'a inip parçayı çıkarıyor: alt sınır yok. */}
      {secili && <AdetDugmeleri sinif="parca-kart" ad={parca.ad} adet={adet} onDegis={onAdet} />}
    </ParcaKarti>
  )
}

/* EKSİ-ARTI TEK YERDE (30 Eylül 2026, inceleme). Seçim kartı ve özetin
   satırı aynı düğmeleri kullanıyor; özete adet gelince aynı işaretleme
   bu dosyada ikinci kez yazılmıştı ve ikisi ayrı ayrı değişebilirdi.
   `enAz`: eksinin kapandığı adet (özette 1: parçayı çıkarmak "Kaldır"ın
   işi); verilmezse eksi hep açık. `sinif`: kutunun ve sayının sınıf öneki
   (`parca-kart` / `parca-ozet`); iki yerin görünümü servis.css'te ayrı.
   `data-eylem` turun (X-12) okuduğu işaret; ekrandaki yazıya bakılmıyor. */
function AdetDugmeleri({ sinif, ad, adet, onDegis, enAz }) {
  return (
    <div className={sinif + '__adet'}>
      <button
        type="button"
        className="stok-dus"
        data-eylem="adet-azalt"
        onClick={() => onDegis(-1)}
        disabled={enAz !== undefined && adet <= enAz}
        aria-label={ad + ' adedini azalt'}
      >
        <IconMinus size={19} />
      </button>
      <span className={sinif + '__sayi'} aria-live="polite">
        {adet}
      </span>
      <button
        type="button"
        className="stok-dus"
        data-eylem="adet-artir"
        onClick={() => onDegis(1)}
        aria-label={ad + ' adedini artır'}
      >
        <IconPlus size={19} />
      </button>
    </div>
  )
}

/* Yükleme sırasında kartların iskeleti duruyor: boş bir ekran
   "bir şey yok" der, iskelet "geliyor" der. Servis kaydındaki parça
   seçimiyle birebir aynı yüzey. */
function Yukleniyor() {
  return (
    <>
      <p className="ipucu">Parça listesi PAKSAN sunucusundan yükleniyor…</p>
      <div className="parca-izgara">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="parca-kart parca-kart--iskelet">
            <span className="parca-kart__resim" />
            <span className="iskelet-satir iskelet-satir--kisa" />
            <span className="iskelet-satir" />
            <span className="iskelet-satir iskelet-satir--kisa" />
          </div>
        ))}
      </div>
    </>
  )
}

function Hata({ onTekrar }) {
  return (
    <div className="not not--sari not--dugmeli">
      <IconAlert size={19} />
      <div>
        <strong>Parça listesi yüklenemedi</strong>
        <p>
          Liste PAKSAN sunucusundan geliyor. Bağlantınızı kontrol edip
          yeniden deneyin.
        </p>
      </div>
      {/* Düğme yazı sütununun dışında, kartın tam genişliğinde: iki yanda
          eşit boşluk (servis.css → .not--dugmeli). */}
      <button className="dg dg--ana dg--blok not__dugme" onClick={onTekrar}>
        Yeniden Dene
      </button>
    </div>
  )
}

/* --------------------------------------------------------------- 2. Özet */

function Ozet({
  secili,
  hesap,
  iskontoOrani,
  teslimat,
  onTeslimat,
  servisId,
  adresOnerisi,
  not,
  onNot,
  odeme,
  onOdeme,
  bakiye,
  ayrilan = 0,
  bakiyeYeter,
  bakiyeYetmiyor,
  bakiyeOrani,
  hata,
  onGeri,
  onVer,
  onAdet,
  onSil,
  katalog,
}) {
  return (
    <>
      {/* Yazı 30 Eylül 2026'da değişti: özette adet de değişiyor. */}
      <p className="ipucu">
        Siparişinizi vermeden önce kontrol edin. Adetleri eksi ve artı düğmeleriyle
        değiştirin; bir parçayı çıkarmak için Kaldır düğmesine dokunun.
      </p>

      {/* CONNECT'İN "TALEBİNİZ" KARTININ DÜZENİ (30 Eylül 2026, kullanıcının
          isteği; bkz. dosyanın başı ve components/ParcaOzeti.jsx). Satırda
          resim, ad, "kod · × adet" ve satır tutarı; altında adet düğmeleri
          ve yazılı "Kaldır". Satır tutarı servisin ödediği indirimli fiyattan
          (lib/servisFiyat.js → sepetSatirlari); kutudaki rakamlar ekranın
          hesabından (`hesap`: sepetToplami + siparisTutari), burada hesap
          yapılmıyor. Tur (X-12) satırı `data-parca-satiri`, toplamı
          `data-siparis-toplam` ile okuyor. */}
      <Bolum ad="Sipariş Özeti" sayi={secili.length}>
        <div className="kart siparis-parcalar">
          {secili.map((k) => (
            <ParcaOzetSatiri
              key={k.kod}
              katalog={katalog}
              kod={k.kod}
              gorsel={k.gorsel}
              ad={k.ad}
              /* "· × adet" birlikte kalıyor: "·"dan ve "×"ten sonraki
                 boşluk bölünmeyen boşluk (\u00a0). 320 piksellik telefonda
                 satır kırılınca nokta satır sonunda asılı kalıyordu
                 ("2013101010 ·" / "× 4"; 30 Eylül 2026, inceleme); şimdi
                 kod üstte, "· × 4" altta. Connect'in iki satırı da aynı
                 (bkz. components/ParcaOzeti.jsx). */
              alt={`${k.kod} ·\u00a0×\u00a0${k.adet}`}
              tutar={k.satirTutari === null ? '—' : `${paraYaz(k.satirTutari)} ${PARA_BIRIMI}`}
              data-parca-satiri={k.kod}
              data-adet={k.adet}
            >
              {/* Seçim kartındaki eksi-artının kendisi; eksi 1'de kapalı. */}
              <AdetDugmeleri
                sinif="parca-ozet"
                ad={k.ad}
                adet={k.adet}
                enAz={1}
                onDegis={(fark) => onAdet(k, fark)}
              />
              {/* Çöp kutusunun yanında yazısı (29 Eylül 2026, görünüm
                  önerisi S8): simge tek başına anlam taşımıyor. */}
              <button
                type="button"
                className="parca-ozet__kaldir"
                data-eylem="parca-kaldir"
                onClick={() => onSil(k)}
                aria-label={k.ad + ' satırını kaldır'}
              >
                <IconTrash size={17} />
                Kaldır
              </button>
            </ParcaOzetSatiri>
          ))}

          {/* İNDİRİM AYRI SATIR (23 Eylül 2026): liste fiyatıyla toplam,
              oran ve düşülen tutar. Satır tutarları zaten indirimli.
              BAKİYEDEN ÖDEMEDE EK İNDİRİM (24 Eylül 2026): yalnız bakiye
              seçiliyken; KDV'den önce düşülüyor, ara toplam ve KDV ek
              indirimli tutardan. KDV satırı yalnız liste fiyatı KDV
              hariçse (gerekçesi data/katalog/para.js içinde). */}
          <TutarKutusu
            data-siparis-toplam={hesap.toplam}
            satirlar={[
              hesap.iskontoTutari > 0 && {
                ad: 'Liste fiyatıyla toplam',
                deger: `${paraYaz(hesap.listeToplam)} ${PARA_BIRIMI}`,
              },
              hesap.iskontoTutari > 0 && {
                ad: `Yedek parça indiriminiz (%${yuzdeYap(iskontoOrani)})`,
                deger: `−${paraYaz(hesap.iskontoTutari)} ${PARA_BIRIMI}`,
                indirim: true,
              },
              hesap.bakiyeIskontoTutari > 0 && {
                ad: `Bakiyeden ödeme ek indirimi (%${yuzdeYap(hesap.bakiyeIskontoOrani)})`,
                deger: `−${paraYaz(hesap.bakiyeIskontoTutari)} ${PARA_BIRIMI}`,
                indirim: true,
              },
              { ad: 'Ara toplam', deger: `${paraYaz(hesap.araToplam)} ${PARA_BIRIMI}` },
              KDV_HARIC_LISTE && {
                ad: `KDV %${Math.round(KDV_ORANI * 100)}`,
                deger: `${paraYaz(hesap.kdv)} ${PARA_BIRIMI}`,
              },
            ]}
            toplam={{ ad: 'Genel toplam', deger: `${paraYaz(hesap.toplam)} ${PARA_BIRIMI}` }}
          />
          <p className="siparis-parcalar__not">
            {hesap.eksik
              ? `Fiyatı listede olmayan parça var; gösterilen toplam bu parçayı içermiyor. Bu parçanın tutarını PAKSAN bildirecek. `
              : ''}
            Tutar, sipariş anındaki fiyat ve indirimle hesaplanır. Sipariş verildikten sonra fiyat ya
            da indirim değişse de tutar değişmez.
          </p>
        </div>
      </Bolum>

      {/* ÖDEME BİÇİMİ.

          Bakiye yetmiyorsa seçenek kapalı. İçinde yalnız bakiye yazıyor
          (kullanıcının isteği, 24 Eylül 2026). Kapalı olmasının nedeni
          seçeneklerin altında tek cümle, rakamsız (25 Eylül 2026,
          kullanıcı sınaması): açıklamasız kapalı düğme çıkmaz sokaktı;
          eksik tutar kullanıcının kararıyla geri gelmiyor. Ek indirim
          varsa rozeti başlığın yanında — kapalıyken de görünüyor. */}
      <Bolum ad="Ödeme">
        <div className="secenek">
          <button
            className={'buyuk-sec' + (odeme === 'fatura' ? ' buyuk-sec--on' : '')}
            data-odeme="fatura"
            onClick={() => onOdeme('fatura')}
          >
            <span className="buyuk-sec__ad">Faturayla</span>
            <span className="buyuk-sec__alt">Ödemeler ay sonu yapılır.</span>
          </button>

          <button
            className={
              'buyuk-sec' +
              (odeme === 'bakiye' ? ' buyuk-sec--on' : '') +
              (bakiyeYeter ? '' : ' buyuk-sec--kapali')
            }
            disabled={!bakiyeYeter}
            aria-describedby={bakiyeYetmiyor ? 'bakiye-yetmiyor' : undefined}
            data-odeme="bakiye"
            /* Kullanılabilir bakiye: tur (X-12) bakiyeyi siparişin
               toplamına göre kurup "Bakiyem"in kapanmasını sınıyor. */
            data-bakiye={bakiye}
            onClick={() => onOdeme('bakiye')}
          >
            {/* Seçeneğin adı "Bakiyem" (30 Eylül 2026, kullanıcının isteği:
                "'Bakiyemden düşülsün'ün geçtiği yerleri 'Bakiyem' olarak
                değiştir"). Bakiyeden düşüleceğini altındaki bakiye satırı
                ve özetteki ek indirim satırı söylüyor. */}
            <span className="buyuk-sec__ad" data-odeme-ad="bakiye">
              Bakiyem
              {bakiyeOrani > 0 && (
                <span className="odeme-rozet">%{yuzdeYap(bakiyeOrani)} ek indirim</span>
              )}
            </span>
            <span className="buyuk-sec__alt">
              {ayrilan > 0
                ? `Kullanılabilir bakiyeniz: ${paraYaz(bakiye)} ${PARA_BIRIMI} · ${paraYaz(ayrilan)} ${PARA_BIRIMI} gönderilmeyi bekleyen siparişlerinize ayrıldı`
                : `Bakiyeniz: ${paraYaz(bakiye)} ${PARA_BIRIMI}`}
            </span>
          </button>
        </div>
        {bakiyeYetmiyor && (
          <p id="bakiye-yetmiyor" className="ipucu" style={{ marginTop: 8 }}>
            Kullanılabilir bakiyeniz yetmediği için bu sipariş faturayla verilecek.
          </p>
        )}
      </Bolum>

      <Bolum ad="Teslimat adresi">
        <AdresSecici
          servisId={servisId}
          deger={teslimat}
          onDegis={onTeslimat}
          oneri={adresOnerisi}
        />
      </Bolum>

      {/* NOT ZORUNLU DEĞİL ve bunu etiketin kendisi söylüyor. Boş
          bırakılabileceği yazmıyorsa kullanıcı doldurmak zorunda
          olduğunu sanıyor. */}
      <Bolum ad="Not">
        <DikteliKutu
          ad="Not (isteğe bağlı)"
          deger={not}
          onDegis={onNot}
          satir={3}
          placeholder={`PAKSAN’a iletmek istediğiniz bir şey varsa yazın`}
        />
      </Bolum>

      {hata && <div className="uyari">{hata}</div>}

      <div className="yapisik">
        <button className="dg dg--ana dg--blok" onClick={onVer}>
          Sipariş Ver
        </button>
        <button className="dg dg--blok" style={{ marginTop: 8 }} onClick={onGeri} data-eylem="ozet-geri">
          Geri
        </button>
      </div>
    </>
  )
}

/* -------------------------------------------------------------- 3. Sonuç */

/* TUTAR TEK YERDEN (25 Eylül 2026, kullanıcı sınaması O1). Başarı
   ekranı KDV hariç ara toplamı yazıyordu; liste, onay penceresi ve Hak
   Ediş KDV dâhil tutarı. Servis aynı siparişi iki ekranda iki rakamla
   görüyordu ("SİPARİŞİN TUTARI HER EKRANDA KDV DÂHİL"). Kalem, adet ve
   tutar artık Parça listesindeki kartla aynı işlevden
   (lib/servisKaydi.js → siparisOzeti); adet de satırlardan sayılıyor,
   `parcaAdet`ten değil. KDV notu her zaman yazıyor: toplam KDV dâhil. */
function Sonuc({ siparis, onBitir }) {
  const ozet = siparisOzeti(siparis)

  return (
    <div className="siparis-sonuc">
      <IconCheckCircle size={54} />
      <h2>Siparişiniz PAKSAN’a İletildi</h2>
      <p className="mono siparis-sonuc__no">{siparis.no}</p>
      <p className="kucuk sonuk">
        {ozet.kalem} kalem · {ozet.adet} adet · {paraYaz(ozet.toplam)} {PARA_BIRIMI} (KDV dâhil)
      </p>
      <p className="kucuk sonuk">
        Siparişin durumunu Parça bölümünden takip edebilirsiniz. PAKSAN{' '}
        onayladığında haberdar olacaksınız.
      </p>
      <button className="dg dg--ana dg--blok" onClick={onBitir}>
        Tamam
      </button>
    </div>
  )
}
