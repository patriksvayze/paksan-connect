import { useMemo, useState } from 'react'
import { MARKA, markaEk, PARA_BIRIMI, paraYaz } from '../../marka'
import {
  extractYear,
  formatSerial,
  matchProduct,
  normalizeSerial,
  validateSerial,
  warrantyStatus,
  GARANTI_YIL,
} from '../../lib/serial'
import { telGiris } from '../../lib/tel'
import {
  ASAMA,
  TARIFE,
  YAPILAN_IS,
  eksikAlanlar,
  hakkedisHesapla,
  temizParcalar,
} from '../../lib/servisKaydi'
import { ekYaz, fotoKucult } from '../../lib/ekler'
import { servisKaydiGonder } from '../../backoffice/veri'
import { Bolum, Onay, Sayfa } from '../Kabuk'
import { ParcaTablosu } from '../../components/ParcaTablosu'
import { ParcaSec } from './ParcaSec'
import { DikteliKutu } from '../Dikte'
import { AdresSecici, teslimatHatasi } from '../AdresSecici'
import { firmaAdresiOnerisi } from '../adresler'
import { adresYazisi, teslimatTemizle, teslimatYazisi } from '../../lib/teslimat'
import { servisleriGetir } from '../../marka'
import { makineDurumAdi } from '../../data/talepAlanlari'
import {
  IconAlert,
  IconCamera,
  IconMinus,
  IconPlus,
  IconShield,
  IconTrash,
} from '../../components/Icons'

/* ==========================================================================
   Servis kaydı — sahada yapılan işin belgesi

   TEK SAYFA. ADIM ADIM DEĞİL.

   Bu ekran bir dönem yedi adımlık bir sihirbazdı: her ekranda tek soru,
   cevap verilince bir sonraki açılıyordu. Geri alındı ve sebebi şu:

     · Servis kaydı bir ANKET DEĞİL, BİR BELGE. Sahada doldurulan iş
       emrinin karşılığı. Belgeyi dolduran kişi neyin sorulacağını
       baştan görmek ister; "daha kaç ekran var" diye ilerlemek
       istemez.
     · Sihirbazda geri dönüp bir rakamı düzeltmek üç dokunuş; tek
       sayfada parmağı yukarı kaydırmak yetiyor.
     · Alan sayısı zaten az; uzun görünmesinin sebebi soruların
       çokluğu değil, ekranların çokluğuydu.

   "Tek ekranda tek soru" kuralı yerinde duruyor ama başka bir yerde:
   HIZLI KARAR ekranlarında. Belge doldurmak başka bir iş.

   AYNI EKRAN İKİ AŞAMAYI DA AÇIYOR

   Garanti işinde önce parça isteniyor, parça gelince takılıyor ve iş
   o zaman bitiyor (gerekçesi lib/servisKaydi.js başında). İkisi ayrı
   ekran olsaydı aynı sorular iki yerde yazılı olurdu; ekran aşamayı
   kaydın kendisinden okuyor:

     1. AŞAMA   arıza, teşhis, gereken parça. Para sorulmuyor.
     2. AŞAMA   ne yapıldı, yol, işçilik. 1. aşamanın cevapları
                üstte okunur satır olarak duruyor.

   EKSİK OLMAYAN SORULMUYOR

   Talep uygulamadan geldiyse müşterinin adı, telefonu, adresi ve
   makinenin künyesi zaten içinde. O alanlar okunur satır olarak
   duruyor, kutu olarak değil. Yalnız gerçekten boş olanlar soruluyor
   (bkz. lib/servisKaydi.js → eksikAlanlar). Servisin dükkânında
   açılan bir kayıtta hepsi boş gelir ve hepsi sorulur.

   GÖNDERMEDEN ÖNCE ONAY

   İki düğme de geri alınamaz bir şey yapıyor: talep durum değiştiriyor,
   PAKSAN'a düşüyor, müşteriye bildirim gidiyor. Onay yaprağı ne
   olacağını yazıyor ve tutarı son bir kez gösteriyor.
   ========================================================================== */

const GARANTI_YAZI = {
  bilinmiyor: () => 'Garanti bilgisi yok',
  devam: (kalan) => `Garanti devam ediyor · ${kalan} yıl`,
  son: () => 'Garantinin son yılı',
  bitti: () => 'Garanti süresi doldu',
}

/* ==========================================================================
   GARANTİ KARARI NEYE DAYANIYOR — EKRAN BUNU SÖYLEMEK ZORUNDA

   Yukarıdaki dört satır kesin konuşuyor ama altındaki hesap kesin
   değil: `warrantyStatus` şase numarasındaki ÜRETİM YILINI okuyor,
   satış tarihini değil. Satış tarihi sistemde hiçbir yerde yok.

   Sonucu somut: 2024'te üretilip 2026'da satılmış bir makine burada
   "garanti süresi doldu" görünüyor. Servis, gerçekte geçerli olan bir
   garanti işini garanti dışı sanıp parçayı müşteriye ödetiyor ya da
   kaydı "PAKSAN reddeder" diye gönderiyor. Ekranın dayanağını
   saklaması, yanlış kararı servisin sırtına yıkıyor.

   HESAP DEĞİŞMİYOR, EKRAN DÜRÜST OLUYOR. Satış tarihi gelmeden
   hesabı düzeltmenin yolu yok; yapılabilecek olan, kararın nereden
   geldiğini yazmak ve servisi tahmine değil PAKSAN'a yönlendirmek.

   AŞAĞIDAKİ İKİ METİN CODEX'TEN GELDİ (proje kuralı: ekranda görünen
   her Türkçe kelime Codex'ten geçer):

     garantiDayanak — kararın dayanağını söylüyor: şase numarasındaki
       üretim yılı, satış kaydı değil. Üç kararın hepsinde, üretim
       yılı okunabildiği sürece görünüyor.
     garantiDisiUyari — şase numarası yazılı ama üretim yılına göre
       süre dolmuş (ya da okunamıyor) görünüyorsa çıkıyor. Kaydın yine de
       gönderilebileceğini söylüyor, sonra servisin haklı olabileceğini
       kabul ediyor ve tahmin etmek yerine {MARKA} ile doğrulamasını
       istiyor.
   ========================================================================== */
const GARANTI_METNI = {
  garantiDayanak: 'Garanti süresi satış tarihine değil, şase numarasındaki üretim yılına göre hesaplanır.',
  garantiDisiUyari: `Kaydı yine de gönderebilirsiniz. Garanti süresi üretim yılına göre hesaplanır; satış tarihi burada yazılı olmadığı için sonradan satılan makinenin garantisi devam ediyor olabilir. Şase numarasını kontrol edin; hâlâ emin değilseniz göndermeden önce ${MARKA} yetkilisiyle doğrulayın.`,
}

export function ServisKapanisi({ talep, oturum, onKapat, onBitti }) {
  const onceki = talep.servisKaydi || null
  /* İkinci aşama: 1. aşamada parça istenmiş, parça gelmiş, servis
     takmış. Kalan tek soru işin kendisi ve hak ediş. */
  const ikinci = onceki?.asama === ASAMA.parca

  /* Talepte olmayan alanlar. Bir kez hesaplanıyor: kullanıcı yazdıkça
     liste kısalsaydı kutular gözünün önünde kaybolurdu. */
  const eksik = useMemo(() => eksikAlanlar(talep), [talep])

  const [ad, setAd] = useState(talep.ad || '')
  const [tel, setTel] = useState(talep.tel || '')
  const [adres, setAdres] = useState(talep.adres || talep.fatura?.adres || '')
  const [seri, setSeri] = useState(talep.makine?.serial || '')
  const [ariza, setAriza] = useState(onceki?.ariza || talep.aciklama || '')
  const [yapilanIs, setYapilanIs] = useState(onceki?.yapilanIs || '')
  const [sonuc, setSonuc] = useState(onceki?.sonuc || '')
  const [parcalar, setParcalar] = useState(onceki?.parcalar || [])
  const [foto, setFoto] = useState(onceki?.foto || null)
  const [km, setKm] = useState(onceki?.km ? String(onceki.km) : '')
  const [iscilik, setIscilik] = useState(onceki?.iscilik ? String(onceki.iscilik) : '')
  const [hata, setHata] = useState('')
  const [onay, setOnay] = useState(false)
  const [katalogAcik, setKatalogAcik] = useState(false)
  /* Parçanın gönderileceği adres (bkz. aşağıda "Parçanın Gönderileceği
     Adres" bölümü). Yalnız parça isteğinde soruluyor. */
  const [teslimat, setTeslimat] = useState(onceki?.teslimat || null)

  const seriDegeri = seri.trim() || talep.makine?.serial || ''
  const urun = useMemo(() => matchProduct(seriDegeri)?.product || null, [seriDegeri])

  /* "son" = garantinin SON YILI, yani garanti hâlâ sürüyor. */
  const garantiDurumu = warrantyStatus(extractYear(seriDegeri)).state
  const garantiVar = garantiDurumu === 'devam' || garantiDurumu === 'son'

  const secilenler = temizParcalar(parcalar)

  /* SERVİS KAYDI YALNIZ GARANTİ İŞİ İÇİN (15 Eylül 2026, kullanıcının
     kararı).

     Burada "Hizmet Kapsamı" diye üç seçenek vardı: Garanti Kapsamında,
     Garanti Dışı · Parçayı Ben Taktım, Garanti Dışı · Parçayı PAKSAN
     Göndersin. Kaldırıldı, çünkü:

       · Garanti dışında elindeki parçayla yapılan iş PAKSAN'ı
         ilgilendirmiyor: parayı müşteri ödüyor, PAKSAN'ın ödeyeceği
         ya da göndereceği bir şey yok. Kayıt istemek, servisten
         karşılığı olmayan bir iş istemekti.
       · Garanti dışında parça gerekiyorsa servis zaten parça
         siparişini kendi Parça ekranından veriyor.

     Garanti dışı yapılmış bir müşteri talebi servis kaydı açılmadan
     talep detayından kapatılıyor (bkz. TalepDetay.jsx → garantiDisi).

     Kayda `kapi: 'garanti'` yazılmaya devam ediyor: hak ediş hesabı,
     doğrulama ve backoffice o alanı okuyor; eski kayıtlarda öteki iki
     değer duruyor ve okunmaya devam ediyor (bkz. lib/servisKaydi.js →
     KAPI). Müşteri "Sorun Devam Ediyor" deyip talep yeniden açıldıysa
     önceki kaydın kapısı buraya taşınmıyor; yeni kayıt garanti kaydı.

     AŞAMAYI SEÇİLEN PARÇA BELİRLİYOR, AYRI BİR SORU DEĞİL.

     Burada "Parça gerekiyor mu?" diye bir soru vardı ve kaldırıldı.
     Cevabı zaten ekranda duruyordu: servis parça seçtiyse parça
     gerekiyor demektir.

     GARANTİDE PARÇAYI HER ZAMAN PAKSAN GÖNDERİYOR. Seçilen her parça
     bir PARÇA İSTEĞİDİR: kayıt 1. aşamada duruyor, hak ediş doğmuyor,
     iş parça takıldığında bitiyor. Hiç parça gerekmiyorsa (yalnız
     ayar yapıldıysa) liste boş kalıyor ve kayıt bugün onaya gidiyor. */
  const parcaIstegi = !ikinci && secilenler.length > 0
  const asama = parcaIstegi ? ASAMA.parca : ASAMA.bitti

  /* Parça yalnız 1. aşamada seçiliyor; 2. aşamada istenen parça
     üstteki özet tablosunda okunur duruyor. */
  const parcaBolumu = !ikinci

  /* "PARÇA GEREKMİYORSA BOŞ BIRAKIN" CÜMLESİ KALDIRILDI (kullanıcının
     isteği, 15 Eylül 2026). Garantide parçayı PAKSAN'ın gönderdiği
     bilgisi yeterli; boş bırakma talimatı gereksiz uzatıyordu. */
  const parcaBaslik = {
    ad: 'Gereken Parça',
    ipucu: `${MARKA} seçtiğiniz parçaları hazırlayıp size gönderecek.`,
  }

  /* İş bittiğinde sorulanlar: ne yapıldı, yol, işçilik. Parça
     isteğinde hiçbiri sorulmuyor — henüz olmamış bir işin parası
     yazılamaz. */
  const isBitti = ikinci || !parcaIstegi
  const paraSorulur = isBitti

  /* "Adres Ekle"nin ilk önerisi servisin firma adresi; "Elle Gir"
     müşterinin bilgileriyle açılıyor — parça çoğu zaman ya dükkâna ya
     doğrudan bu müşterinin makinesinin başına gidiyor. */
  const adresOnerisi = useMemo(
    () =>
      firmaAdresiOnerisi(
        servisleriGetir().find((s) => s.id === oturum.servisId) || null,
        oturum.ad,
      ),
    [oturum.servisId, oturum.ad],
  )
  const musteriAdresi = {
    alici: ad.trim(),
    tel,
    il: talep.il || '',
    ilce: talep.ilce || '',
    acikAdres: adres.trim(),
  }

  const kayit = {
    asama,
    kapi: 'garanti',
    yapilanIs,
    sonuc,
    parcalar,
    foto,
    km: Number(km) || 0,
    iscilik: Number(iscilik) || 0,
  }
  const hakkedis = hakkedisHesapla(kayit)

  function adetDegistir(kod, fark) {
    setParcalar((l) =>
      l.map((p) => (p.kod === kod ? { ...p, adet: Math.max(1, p.adet + fark) } : p)),
    )
  }

  function parcaCikar(kod) {
    setParcalar((l) => l.filter((p) => p.kod !== kod))
  }

  /* UYARI EKSİK YERİN BAŞLIĞIYLA AYNI DİLİ KONUŞUYOR.

     "Tespitiniz" boşken "Ne bulduğunuzu bir cümleyle yazın" çıkıyordu;
     servis ekranda öyle bir başlık arıyordu. Başlıklar değişince
     uyarılar geride kalmıştı. Her uyarı artık doldurulacak bölümün
     adını taşıyor.

     Formun kendi soruları. Model katmanına ancak hepsi doluysa
     gidiliyor; sıra ekrandaki sıranın aynısı, böylece hata mesajı hep
     en yukarıdaki eksiği gösteriyor. */
  function formHatasi() {
    if (!ikinci) {
      if (eksik.includes('ad') && ad.trim().length < 3) return 'Müşterinin adını ve soyadını yazın.'
      if (eksik.includes('tel') && telGiris(tel).replace(/\D/g, '').length < 10) {
        return 'Telefon numarasını eksiksiz yazın.'
      }
      if (eksik.includes('seri') && seri.trim() && !validateSerial(normalizeSerial(seri)).ok) {
        return 'Şase numarasını kontrol edip yeniden yazın.'
      }
      if (ariza.trim().length < 5) return 'Servis talebinin nedenini yazın.'
    }
    if (parcaIstegi) {
      const teslimHatasi = teslimatHatasi(teslimat)
      if (teslimHatasi) return teslimHatasi
    }
    if (sonuc.trim().length < 5) {
      return parcaIstegi ? 'Tespitinizi yazın.' : 'Yapılan işin ayrıntısını yazın.'
    }
    return null
  }

  function onaylat() {
    const h = formHatasi()
    if (h) return setHata(h)
    setHata('')
    setOnay(true)
  }

  function gonder() {
    setOnay(false)

    /* Servisin doldurduğu eksikler talebin kendisine de işleniyor:
       telefonla gelen bir işte müşterinin adı ve makinenin şasesi ilk
       kez burada öğreniliyor. */
    const tam = {
      ...kayit,
      /* Adres yalnız parça isteğinde kayda giriyor. 2. aşamada anahtar
         hiç yazılmıyor: veri katmanı kaydı üstüne yazarken 1. aşamanın
         adresi yerinde kalıyor (bkz. veri.js → servisKaydiGonder). */
      ...(parcaIstegi ? { teslimat: teslimatTemizle(teslimat) } : {}),
      musteri: { ad: ad.trim(), tel: telGiris(tel), adres: adres.trim() },
      makine: seri.trim()
        ? { serial: normalizeSerial(seri), productId: urun?.id || null }
        : null,
      ariza: ariza.trim(),
    }
    const sonucKayit = servisKaydiGonder(talep, tam, oturum.ad)
    if (sonucKayit.hata) return setHata(sonucKayit.hata)
    onBitti()
  }

  /* Onay yaprağının içeriği. "Ne olacak" bilgisi eskiden formun
     dibinde duran bir kutuydu; ekranı uzatıyor ve okunmuyordu. Karar
     anına taşındı. */
  const onayBilgisi = parcaIstegi
    ? {
        baslik: 'Parça isteğiniz gönderilecek',
        metin: `${MARKA} yedek parça birimi parçayı hazırlayıp size gönderecek. Parça elinize geçtiğinde bu talebi açıp "Parçayı Taktım" düğmesine dokunacaksınız. Yol ve işçilik bilgileri o zaman sorulacak.`,
        parcalar: secilenler,
        kalemler: [{ ad: 'Teslimat adresi', deger: adresYazisi(teslimat) }],
        dugme: 'Parça Talebini Gönder',
      }
    : {
        baslik: `Kayıt ${markaEk('a')} onaya gidecek`,
        metin: `${MARKA} yolu, işçiliği ve parçaları inceleyecek. Onaylandığında tutar hesabınıza eklenecek ve talep kapanacak.`,
        parcalar: secilenler,
        kalemler: [
          { ad: 'Yapılan iş', deger: yapilanIs || '—' },
          { ad: 'Hesabınıza eklenecek tutar', deger: `${paraYaz(hakkedis.toplam)} ${PARA_BIRIMI}` },
        ],
        dugme: 'Kaydı Gönder',
      }

  const dugmeYazi = parcaIstegi
    ? 'Parça Talebini Gönder'
    : ikinci
      ? 'İşi Tamamla'
      : 'Kaydı Tamamla'

  /* KATALOG TAM EKRAN AÇILIYOR, PENCERE OLARAK DEĞİL.

     Kartlarda görsel var ve görsel bu ekranın asıl işi; pencereye
     sıkıştırıldığında parça tanınmıyor. Kayıt ekranı arkada duruyor,
     seçim bitince aynı yerden devam ediliyor. */
  if (katalogAcik) {
    return (
      <ParcaSec
        secili={parcalar}
        onKapat={() => setKatalogAcik(false)}
        onBitti={(secilenler) => {
          setParcalar(secilenler)
          setKatalogAcik(false)
          setHata('')
        }}
      />
    )
  }

  return (
    <div className="katman">
      <Sayfa
        baslik={ikinci ? 'Parçayı Taktım' : 'Servis Kaydı'}
        alt={[talep.no, ad].filter(Boolean).join(' · ')}
        onGeri={onKapat}
        dip={
          <div className="kayit-dip">
            {paraSorulur && (
              <div className="kayit-dip__hesap">
                <span>Hesabınıza eklenecek</span>
                <strong>
                  {paraYaz(hakkedis.toplam)} {PARA_BIRIMI}
                </strong>
              </div>
            )}
            <button className="dg dg--ana dg--blok" onClick={onaylat}>
              {dugmeYazi}
            </button>
          </div>
        }
      >
        {/* ------------------------------- 1. aşamanın cevapları (2. aşama) */}
        {ikinci && <IlkAsama kayit={onceki} talep={talep} />}

        {/* ------------------------------------------- Müşteri ve makine */}
        {!ikinci && (
          <Bolum ad="Müşteri ve Makine">
            {eksik.includes('ad') ? (
              <Kutu ad="Adı Soyadı" deger={ad} onDegis={setAd} />
            ) : (
              <Satir ad="Adı Soyadı" deger={ad} />
            )}

            {eksik.includes('tel') ? (
              <Kutu
                ad="Telefon"
                deger={tel}
                onDegis={(v) => setTel(telGiris(v))}
                tur="tel"
                ipucu="05xx xxx xx xx"
              />
            ) : (
              <Satir ad="Telefon" deger={tel} />
            )}

            {eksik.includes('adres') ? (
              <Kutu ad="Adres" deger={adres} onDegis={setAdres} satir={2} />
            ) : (
              <Satir ad="Adres" deger={adres} />
            )}

            {eksik.includes('seri') ? (
              <Kutu
                ad="Şase Numarası"
                deger={seri}
                onDegis={setSeri}
                ipucu="Makinenin üstündeki etiket"
              />
            ) : (
              <Satir ad="Şase Numarası" deger={formatSerial(seri)} mono />
            )}

            {/* MODEL, KOD VE İMAL YILI SORULMUYOR: ŞASEDEN OKUNUYOR.

                Üçü de şase numarasının içinde yazılı. Servise ayrıca
                sordurmak, aynı bilgiyi ikinci kez ve bu sefer yanlış
                girme ihtimali demekti. */}
            {urun && <Satir ad="Makine" deger={urun.name} />}
            {urun?.code && <Satir ad="Kod" deger={urun.code} mono />}
            {extractYear(seriDegeri) && (
              <Satir ad="İmal Yılı" deger={String(extractYear(seriDegeri))} />
            )}

            {/* GARANTİ KARTI ŞASENİN YANINDA. Kaldırılan "Hizmet
                Kapsamı" bölümünün içindeydi; kart bir soru değil, şase
                numarasından okunan bilgi, yeri de şasenin yanı. */}
            {seriDegeri && <Garanti seri={seriDegeri} urun={urun} />}
          </Bolum>
        )}

        {/* --------------------------------------------- Servis talebi nedeni

            BÖLÜM ADI ve ALAN ADI ÜST ÜSTE YAZMIYOR: tek alanlı bölümde
            başlığın altına ikinci bir etiket konmuyor, bölüm adı
            sorunun kendisi oluyor. */}
        {!ikinci && (
          <Bolum ad="Servis Talebi Nedeni">
            <TalepBelirtileri talep={talep} />
            <Kutu
              etiket="Servis Talebi Nedeni"
              deger={ariza}
              onDegis={setAriza}
              satir={3}
              ipucu={
                talep.aciklama
                  ? 'Talepten geldi; eksik varsa ekleyin.'
                  : 'Örnek: Balya bağlamıyor, ip sürekli kopuyor'
              }
            />
          </Bolum>
        )}

        {/* UYARI ARTIK SUÇU ŞASEYE ATMIYOR.

            Burada "Şase numarasını kontrol edin" yazıyordu: tek
            olasılığın servisin yanlış yazması olduğunu ima ediyordu.
            Oysa doğru yazılmış bir şasede de karar yanlış çıkabiliyor,
            çünkü hesap üretim yılından gidiyor ve satış tarihi
            sistemde yok. Uyarı artık dayanağı söylüyor ve servisi
            tahmine değil PAKSAN'a yönlendiriyor.

            Şase yazılmadan çıkmıyor: seçim kalkınca her kayıt garanti
            kaydı oldu ve şasesiz her formun başında bu uyarı
            belirecekti; dayanağı olmayan uyarı kör edilir. */}
        {!ikinci && seriDegeri && !garantiVar && (
          <div className="not not--turuncu">
            <IconAlert size={19} />
            <div>
              <strong>Bu makinenin garantisi görünmüyor.</strong>
              <p>{GARANTI_METNI.garantiDisiUyari}</p>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------- Parça */}
        {parcaBolumu && (
          <>
            <SecilenParcalar
              ad={parcaBaslik.ad}
              ipucu={parcaBaslik.ipucu}
              secili={parcalar}
              onAdet={adetDegistir}
              onCikar={parcaCikar}
              onKatalog={() => setKatalogAcik(true)}
            />

            {/* PARÇANIN GÖNDERİLECEĞİ ADRES (17 Eylül 2026, kullanıcının
                isteği). Parça seçilince çıkıyor, parçanın hemen altında:
                ne istendiği ile nereye gideceği aynı yerde okunuyor.

                Servis bunu doldurduğunda ne alıyor? Parçası kendi
                seçtiği kapıya geliyor — dükkânına ya da doğrudan
                müşterinin tarlasına. Soru sorulmadan önce PAKSAN
                parçayı servisin firma adresine yolluyordu. Kayıtlı
                adres tek dokunuş; varsayılan zaten seçili geliyor. */}
            {parcaIstegi && (
              <Bolum ad="Teslimat adresi">
                <AdresSecici
                  servisId={oturum.servisId}
                  deger={teslimat}
                  onDegis={(t) => {
                    setTeslimat(t)
                    setHata('')
                  }}
                  oneri={adresOnerisi}
                  elleOneri={musteriAdresi}
                  elleNotu={
                    musteriAdresi.alici || musteriAdresi.acikAdres
                      ? 'Müşterinin adres bilgileri hazır olarak dolduruldu. Parça başka bir adrese gidecekse değiştirebilirsiniz.'
                      : ''
                  }
                />
              </Bolum>
            )}

            {/* FOTOĞRAF İSTEĞE BAĞLI VE ESKİ PARÇA GERİ İSTENMİYOR.

                Burada "eski parçayı PAKSAN'a geri gönderin, yoksa
                kayıt açık kalır" yazan bir kutu vardı; böyle bir kural
                yok. Yanında da "Parçanın nesi var?" diye bir soru
                vardı, o da kaldırıldı (gerekçesi lib/servisKaydi.js).
                Fotoğraf kaldı: garanti tartışmasında bakılacak tek
                şey o. */}
            {secilenler.length > 0 && (
              <Bolum ad="Parçanın Fotoğrafı">
                <Fotograf foto={foto} onFoto={setFoto} />
              </Bolum>
            )}
          </>
        )}

        {/* --------------------------------------------------- Yapılan iş */}
        {/* İKİ BÖLÜM BİRLEŞTİ.

            Üstte "Ne Yapıldı?", altında "Ne Buldunuz, Ne Yaptınız?"
            duruyordu. İkisi aynı soruyu iki kez soruyor gibiydi;
            listeden seçilen ise cümlenin başlığı. Tek bölüm oldu:
            önce liste, altında ayrıntı. */}
        {isBitti && (
          <Bolum ad="Yapılan İş">
            <Secenekler
              secenekler={YAPILAN_IS.map((x) => ({ deger: x, ad: x }))}
              secili={yapilanIs}
              onSec={(v) => {
                setYapilanIs(v)
                setHata('')
              }}
            />
            <Kutu
              ad="Ayrıntı"
              deger={sonuc}
              onDegis={setSonuc}
              satir={3}
              ipucu="Örnek: Düğüm bıçağı aşınmıştı, değiştirildi ve ayar yapıldı"
            />
          </Bolum>
        )}

        {/* 1. aşamada iş bitmedi; sorulan tek şey ne bulunduğu. */}
        {parcaIstegi && (
          <Bolum ad="Tespitiniz">
            <Kutu
              etiket="Tespitiniz"
              deger={sonuc}
              onDegis={setSonuc}
              satir={3}
              ipucu="Örnek: Düğüm bıçağı aşınmış, balyayı bağlamıyor"
            />
          </Bolum>
        )}

        {/* ------------------------------------------------- Yol ve işçilik */}
        {paraSorulur && (
          <Bolum ad="Yol ve İşçilik">
            <Kutu
              ad="Gidilen Yol (km)"
              deger={km}
              onDegis={(v) => setKm(v.replace(/\D/g, ''))}
              tur="sayi"
              ipucu={`Gidiş ve dönüş toplamı · kilometre başına ${paraYaz(TARIFE.yolKm)} ${PARA_BIRIMI}`}
            />
            <Kutu
              ad={`İşçilik Tutarı (${PARA_BIRIMI})`}
              deger={iscilik}
              onDegis={(v) => setIscilik(v.replace(/\D/g, ''))}
              tur="sayi"
              ipucu="İşçilik almadıysanız boş bırakın"
            />

            {hakkedis.kalemler.length > 0 && (
              <div className="hesap">
                {hakkedis.kalemler.map((k) => (
                  <div key={k.ad} className="hesap__satir">
                    <span>{k.ad}</span>
                    <span>
                      {paraYaz(k.tutar)} {PARA_BIRIMI}
                    </span>
                  </div>
                ))}
                <div className="hesap__satir hesap__satir--toplam">
                  <span>Toplam</span>
                  <span>
                    {paraYaz(hakkedis.toplam)} {PARA_BIRIMI}
                  </span>
                </div>
              </div>
            )}
          </Bolum>
        )}

        {hata && <div className="uyari">{hata}</div>}
      </Sayfa>

      {onay && (
        <Onay
          baslik={onayBilgisi.baslik}
          metin={onayBilgisi.metin}
          parcalar={onayBilgisi.parcalar}
          kalemler={onayBilgisi.kalemler}
          dugme={onayBilgisi.dugme}
          onOnayla={gonder}
          onVazgec={() => setOnay(false)}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------- Müşterinin seçtikleri

   MAKİNENİN DURUMU VE BELİRTİLER BU EKRANDA YOKTU (21 Eylül 2026,
   kullanıcının bildirdiği eksik). Müşteri talebi açarken makinenin
   durumunu ve belirtileri listeden seçiyor; talep ayrıntısında
   görünüyordu ama servis kaydını doldururken — teşhisi yazdığı anda —
   görünmüyordu. Servis ya ayrıntıya geri dönüyor ya da ezberden
   yazıyordu. Etiketler talep ayrıntısındakilerle aynı
   (ekranlar/TalepDetay.jsx): iki ekranda aynı bilgi aynı adla.
   Telefonla açılan talepte bu alanlar boş; o zaman kart hiç çıkmıyor. */
function TalepBelirtileri({ talep }) {
  const belirtiler = talep?.belirtiler || []
  if (!talep?.durum && !belirtiler.length) return null
  return (
    <div className="kart" style={{ padding: 16, marginBottom: 12 }}>
      {talep.durum && <Satir ad="Makinenin Durumu" deger={makineDurumAdi(talep.durum)} />}
      {belirtiler.length > 0 && <Satir ad="Belirtiler" deger={belirtiler.join(', ')} />}
    </div>
  )
}

/* --------------------------------------------------------------- Parçalar */

/* İkinci aşamada 1. aşamada yazılanlar okunur duruyor: servis aradan
   günler geçmiş olabilecek bir işe dönüyor ve neyi neden istediğini
   hatırlamak zorunda değil. */
function IlkAsama({ kayit, talep }) {
  return (
    <Bolum ad="Bu İş İçin Yazdıklarınız">
      <TalepBelirtileri talep={talep} />
      <div className="kart" style={{ padding: 16 }}>
        <Satir ad="Müşterinin Anlattığı" deger={kayit.ariza} />
        <Satir ad="Bulduğunuz" deger={kayit.sonuc} />
        {/* Parçanın nereye istendiği de okunur: servis parçayı nerede
            bekleyeceğini hatırlasın. */}
        <Satir ad="Teslimat adresi" deger={teslimatYazisi(kayit.teslimat)} />
      </div>
      <p className="alan__ipucu parca-ipucu">İstediğiniz parça</p>
      <ParcaTablosu parcalar={temizParcalar(kayit.parcalar)} />
    </Bolum>
  )
}

/* Okunur satır: bilgi zaten var, kutu açmanın anlamı yok. */
function Satir({ ad, deger, mono }) {
  if (!deger) return null
  return (
    <div className="kv">
      <span className="kv__ad">{ad}</span>
      <span className={'kv__deger' + (mono ? ' mono' : '')}>{deger}</span>
    </div>
  )
}

/* Yazı kutusu. `satir` verilirse çok satırlı.

   Çok satırlı kutunun içinde sesle yazma şeridi var (bkz. Dikte.jsx);
   tek satırlık kutular ad, telefon, şase, km ve tutar — onlarda yok. */
function Kutu({ ad, etiket, deger, onDegis, satir, ipucu, tur }) {
  if (satir) {
    return (
      <DikteliKutu
        ad={ad}
        etiket={etiket}
        deger={deger}
        onDegis={onDegis}
        satir={satir}
        ipucu={ipucu && <span className="alan__ipucu">{ipucu}</span>}
      />
    )
  }
  return (
    <label className="alan">
      {ad && <span className="alan__ad">{ad}</span>}
      {satir ? (
        <textarea
          className="gir"
          rows={satir}
          value={deger}
          onChange={(e) => onDegis(e.target.value)}
        />
      ) : (
        <input
          className="gir"
          inputMode={tur === 'sayi' ? 'numeric' : tur === 'tel' ? 'tel' : undefined}
          value={deger}
          onChange={(e) => onDegis(e.target.value)}
        />
      )}
      {ipucu && <span className="alan__ipucu">{ipucu}</span>}
    </label>
  )
}

/* Cevap listesi. Tam genişlikte satırlar. Seçili olan kenarındaki
   şeritle de ayrılıyor, yalnız renkle değil (renk körlüğü). */
export function Secenekler({ secenekler, secili, onSec }) {
  return (
    <div className="secenek">
      {secenekler.map((s) => (
        <button
          key={s.deger}
          className={'buyuk-sec' + (secili === s.deger ? ' buyuk-sec--on' : '')}
          onClick={() => onSec(s.deger)}
        >
          <span className="buyuk-sec__ad">{s.ad}</span>
          {s.alt && <span className="buyuk-sec__alt">{s.alt}</span>}
        </button>
      ))}
    </div>
  )
}

/* ==========================================================================
   Kayıttaki parçalar — katalogdan seçiliyor

   ÖNCE BURADA ON TANE İSİM VARDI

   Makinenin destek grubuna göre "Rulman", "Kayış", "Zincir" gibi on
   kadar genel ad listeleniyordu. İki sorunu vardı ve ikisi de büyük:

     · PAKSAN'IN GERÇEK PARÇALARI DEĞİLDİ. Fiyat listesinde 538 parça
       var; kayda giden "Rulman" satırı yedek parça personelinin
       hangi rulmanı hazırlayacağını söylemiyordu.
     · Servis parçayı adıyla değil, RESMİYLE ve KODUYLA tanıyor.

   Şimdi seçim PAKSAN'ın kendi kataloğundan yapılıyor (bkz.
   ekranlar/ParcaSec.jsx) ve kayda kod, ad ve fiyat birlikte gidiyor.
   Bu ekranda yalnız SEÇİLENLER duruyor: adet ayarı ve çıkarma.

   Liste boşken de bölüm çiziliyor. "Parça Seç" düğmesi ekranın o
   noktasında bir yer tutuyor; sonradan belirseydi servis parça
   ekleyebileceğini bilmezdi.
   ========================================================================== */
function SecilenParcalar({ ad, ipucu, secili, onAdet, onCikar, onKatalog }) {
  return (
    <Bolum ad={ad} sayi={secili.length}>
      {ipucu && <p className="alan__ipucu parca-ipucu">{ipucu}</p>}

      {secili.length > 0 && (
        <div className="parca-liste" style={{ marginBottom: 12 }}>
          {secili.map((p) => (
            <div key={p.kod} className="parca-satir parca-satir--on">
              <span className="parca-satir__ac" style={{ cursor: 'default' }}>
                <span className="parca-satir__ad">
                  {p.ad}
                  <span className="secili-parca__kod mono">
                    {p.kod}
                    {p.fiyat ? ` · ${paraYaz(p.fiyat)} ${PARA_BIRIMI}` : ''}
                  </span>
                </span>
              </span>

              <div className="parca-satir__adet">
                <button
                  className="stok-dus"
                  onClick={() => onAdet(p.kod, -1)}
                  aria-label={p.ad + ' adedini azalt'}
                >
                  <IconMinus size={19} />
                </button>
                <span className="parca-satir__sayi">{p.adet}</span>
                <button
                  className="stok-dus"
                  onClick={() => onAdet(p.kod, 1)}
                  aria-label={p.ad + ' adedini artır'}
                >
                  <IconPlus size={19} />
                </button>
                <button
                  className="stok-dus"
                  onClick={() => onCikar(p.kod)}
                  aria-label={p.ad + ' satırını kaldır'}
                >
                  <IconTrash size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="dg dg--blok" onClick={onKatalog}>
        <IconPlus size={19} />
        {secili.length ? 'Parça Ekle' : 'Parça Seç'}
      </button>
    </Bolum>
  )
}

/* Fotoğraf tek kare. Telefonun kamerası doğrudan açılıyor
   (`capture`), galeriye gitmek gerekmiyor. Küçültme `ekler.js`
   içinde; tarladan zayıf şebekeyle 8 MB'lık kare yollanmıyor. */
function Fotograf({ foto, onFoto }) {
  const [adres, setAdres] = useState('')

  async function sec(e) {
    const dosya = e.target.files?.[0]
    if (!dosya) return
    const kucuk = await fotoKucult(dosya)
    const id = await ekYaz(kucuk)
    onFoto({ id, ad: dosya.name, boyut: kucuk.size })
    setAdres(URL.createObjectURL(kucuk))
  }

  return (
    <>
      {adres && <img className="foto-onizleme" src={adres} alt="" />}
      <label className="dg dg--blok">
        <IconCamera size={19} />
        {foto ? 'Fotoğrafı Değiştir' : 'Fotoğraf Çek'}
        <input type="file" accept="image/*" capture="environment" onChange={sec} hidden />
      </label>
    </>
  )
}

function Garanti({ seri, urun }) {
  const yil = extractYear(seri)
  const durum = warrantyStatus(yil)
  const kalan = yil ? yil + GARANTI_YIL - new Date().getFullYear() : 0
  /* Son yıl da kapsam içi; yeşil kalıyor. */
  const kapsamda = durum.state === 'devam' || durum.state === 'son'

  return (
    <div className={'not ' + (kapsamda ? 'not--yesil' : 'not--mavi')}>
      <IconShield size={19} />
      <div>
        <strong>{(GARANTI_YAZI[durum.state] || GARANTI_YAZI.bilinmiyor)(kalan)}</strong>
        <p className="mono">
          {formatSerial(seri)}
          {urun ? ` · ${urun.name}` : ''}
        </p>
        {/* DAYANAK SATIRI. Üstteki karar şase numarasındaki üretim
            yılından çıkıyor; satış tarihi sistemde yok. Servis neye
            baktığını bilmeden "garanti bitti" yazısına güvenemez
            (gerekçesi yukarıda, GARANTI_METNI başlığında). Üretim
            yılı okunamadıysa yazılacak bir dayanak da yok. */}
        {yil ? <p>{GARANTI_METNI.garantiDayanak}</p> : null}
      </div>
    </div>
  )
}
