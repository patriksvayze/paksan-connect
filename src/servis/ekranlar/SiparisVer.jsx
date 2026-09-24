import { useEffect, useMemo, useState } from 'react'
import { useGeri } from '../geri'
import {
  bakiyeIskontosuGetir,
  cariBakiye,
  servisinIskontosu,
  servisParcaSiparisi,
} from '../../backoffice/veri'
import { servisleriGetir, MARKA, markaEk } from '../../marka'
import {
  KDV_HARIC_LISTE,
  KDV_ORANI,
  PARA_BIRIMI,
  paraYaz,
} from '../../marka'
import {
  grubunParcalari,
  katalogGetir,
  parcaAra,
  parcaBul,
} from '../../lib/parcaKatalogu'
import { parcaServisFiyati, siparisTutari, yuzdeYap } from '../../lib/servisFiyat'
import { Bolum, Onay } from '../Kabuk'
import { DikteliKutu } from '../Dikte'
import { ParcaKarti } from '../ParcaKarti'
import { AdresSecici, teslimatHatasi } from '../AdresSecici'
import { firmaAdresiOnerisi } from '../adresler'
import { adresYazisi, teslimatTemizle } from '../../lib/teslimat'
import {
  IconAlert,
  IconBack,
  IconCheckCircle,
  IconMinus,
  IconPlus,
  IconRight,
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
   kendisi — kalem, adet, birim fiyat, satır tutarı.

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
   görüntüsüne yazılıyor (`iskontoOrani`); servis sepeti hazırlarken
   PAKSAN oranı değiştirirse veri katmanı siparişi reddediyor, ekran
   yeni oranı okuyup tutarları yeniliyor. Servis ekranında "iskonto"
   yazmıyor, "indirim" yazıyor (yasak terim).

   ADET KUTUYA YAZILMIYOR, DÜĞMEYLE SAYILIYOR

   Her satırın sağında bir yazı kutusu vardı ve servis oraya rakam
   yazıyordu. Tarlada, eldivenle, tek elle kullanılan bir uygulamada
   sayı klavyesi açıp "2" yazmak, iki dokunuşluk bir işi beş dokunuşa
   çıkarıyordu. Satırlar da seçili olup olmadıklarını söylemiyordu.
   Şimdi servis kaydındaki parça seçimiyle aynı kart kullanılıyor
   (bkz. servis/ParcaKarti.jsx): büyük görsel, kod, ad, fiyat; seçili
   kartın altında eksi-artı.

   İSTENEN TESLİM TARİHİ KALDIRILDI

   Soruluyordu ve hiçbir yere bağlanmıyordu — ne sevkiyat planına ne
   kapanış formuna giriyordu. Cevabı hiçbir şeyi değiştirmeyen bir
   soru, formu uzatmaktan başka iş yapmaz.

   YERİNE ÖDEME BİÇİMİ GELDİ

   Servis cari hesaplı bir iş ortağı: PAKSAN ona hak ediş borçlu.
   Bakiyesi siparişi karşılıyorsa bedelin oradan düşülmesini
   isteyebiliyor. Yetmiyorsa seçenek kapalı.

   SEÇENEKTE YALNIZ BAKİYE YAZIYOR (24 Eylül 2026, kullanıcının isteği:
   "Bakiyemden Düşülsün kutucuğu içindeki eksik tutar bilgisini kaldır,
   sadece bakiye gözüksün"). Eksik tutar satırı kaldırıldı; kapalı
   seçeneğin sebebi, hemen üstündeki genel toplamla yan yana okunan
   bakiye. Faturayla seçeneğinin açıklaması da kullanıcının cümlesi:
   "Ödemeler ay sonu yapılır."

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

   Para bu ekranda işlenmiyor: sipariş henüz onaylanmadı ve tutar
   bağlayıcı değil. Düşüm, parça kargoya verilip talep kapandığında
   yapılıyor (bkz. backoffice/veri.js → talepKapat).

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

export function SiparisVer({ oturum, onKapat, onVerildi }) {
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
  /* Oran, veri katmanı "değişti" deyince yeniden okunuyor. */
  const [iskontoSurum, setIskontoSurum] = useState(0)
  const iskonto = useMemo(() => {
    void iskontoSurum
    return servisinIskontosu(oturum.servisId)
  }, [oturum.servisId, iskontoSurum])
  /* Bakiyeden ödemede ek indirim oranı (kesir, 0 = yok). Aynı sürümle
     yenileniyor: veri katmanı "oran değişti" deyince ikisi birlikte. */
  const bakiyeOrani = useMemo(() => {
    void iskontoSurum
    return bakiyeIskontosuGetir()
  }, [iskontoSurum])

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

  const bakiye = useMemo(() => cariBakiye(oturum.servisId), [oturum.servisId, adim])

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
     geliyor — servis iskontolu fiyatı ödüyor. */
  const secili = useMemo(() => {
    const liste = []
    for (const [kod, ham] of Object.entries(adetler)) {
      const adet = Number(ham) || 0
      if (adet <= 0) continue
      const parca = parcaBul(katalog, kod)
      const f = parcaServisFiyati(parca, iskonto.oran)
      liste.push({
        kod,
        ad: parca?.ad || kod,
        grup: parca?.grup || null,
        gorsel: parca?.gorsel ?? null,
        adet,
        listeFiyati: f ? f.fiyat : null,
        birimFiyat: f ? f.alis : null,
        satirTutari: f ? f.alis * adet : null,
      })
    }
    return liste
  }, [katalog, adetler, iskonto.oran])

  /* Sepetin toplamları. Ek indirim ve KDV burada değil: ikisi ödeme
     biçimine göre `siparisTutari`den geliyor (aşağıda). */
  const sepet = useMemo(() => {
    let araToplam = 0
    let listeToplam = 0
    let eksik = false
    for (const k of secili) {
      if (k.satirTutari === null) eksik = true
      else {
        araToplam += k.satirTutari
        listeToplam += k.listeFiyati * k.adet
      }
    }
    return { araToplam, listeToplam, iskontoTutari: listeToplam - araToplam, eksik }
  }, [secili])

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

  /* Bakiye siparişin KDV dâhil tutarını — ek indirim düşülmüş hâlini —
     karşılıyor mu? Karşılamıyorsa seçenek kapalı. */
  const bakiyeYeter = bakiye >= bakiyeHesabi.toplam && bakiyeHesabi.toplam > 0
  const gecerliOdeme = bakiyeYeter ? odeme : 'fatura'
  const hesap = gecerliOdeme === 'bakiye' ? bakiyeHesabi : faturaHesabi

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
      kalemler: secili.map((k) => ({
        kod: k.kod,
        ad: k.ad,
        adet: k.adet,
        birimFiyat: k.birimFiyat,
        satirTutari: k.satirTutari,
      })),
      /* Fiyat anlık görüntüsü: sipariş anındaki satırlar, katalog
         sürümü ve kaynağı. Tutarlar servisin ödediği iskontolu
         fiyattan — liste fiyatından değil. */
      parcaFiyat: {
        surum: katalog?.surum ?? null,
        kaynak: katalog?.kaynak || null,
        /* O günkü görselin dosya adı da satırda: katalog değişse de
           sipariş kendi resmini gösteriyor (bkz. lib/parcaKatalogu.js →
           fiyatGoruntusu). */
        satirlar: secili.map((k) => ({
          kod: k.kod,
          ad: k.ad,
          gorsel: k.gorsel,
          adet: k.adet,
          listeFiyati: k.listeFiyati,
          birimFiyat: k.birimFiyat,
          tutar: k.satirTutari,
        })),
        /* İndirim o günkü oranıyla: oran sonra değişse de bu siparişin
           tutarı değişmiyor. Veri katmanı oranı bugünküyle doğruluyor. */
        iskontoOrani: iskonto.oran,
        listeToplam: hesap.listeToplam,
        iskontoTutari: hesap.iskontoTutari,
        /* Bakiyeden ödemede ek indirim: yalnız uygulandıysa. Oran tutar
           sıfıra yuvarlansa da yazılıyor — veri katmanı oranı bugünküyle
           karşılaştırıyor. `araToplam` ve `toplam` ek indirim düşülmüş. */
        ...(hesap.bakiyeIskontoOrani > 0
          ? {
              bakiyeIskontoOrani: hesap.bakiyeIskontoOrani,
              bakiyeIskontoTutari: hesap.bakiyeIskontoTutari,
            }
          : {}),
        araToplam: hesap.araToplam,
        kdv: hesap.kdv,
        toplam: hesap.toplam,
        eksikFiyat: hesap.eksik,
      },
      not,
      teslimat: teslimatTemizle(teslimat),
      odeme: gecerliOdeme,
      tutar: hesap.araToplam,
      tutarKdvli: hesap.toplam,
    })
    if (sonuc.hata) {
      if (sonuc.iskontoDegisti) setIskontoSurum((x) => x + 1)
      return setHata(sonuc.hata)
    }

    setSiparis(sonuc.talep)
    setAdim('sonuc')
  }

  /* Geri tuşu bir kademe geri gider, siparişi kapatmaz (bkz.
     servis/geri.jsx): özetten seçime, aramadan ve parça listesinden
     montaj listesine — ParcaSec'teki "Geri" ile aynı sıra. */
  useGeri(adim === 'onay' || (adim === 'secim' && Boolean(arama.trim() || grup)), () => {
    if (adim === 'onay') {
      setAdim('secim')
      setHata('')
    } else if (arama.trim()) setArama('')
    else setGrup(null)
  })

  if (adim === 'sonuc' && siparis) {
    return <Sonuc siparis={siparis} hesap={hesap} onBitir={onVerildi} />
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
          bakiyeYeter={bakiyeYeter}
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
            setOnay(true)
          }}
          onSil={(k) => adetDegistir(k.kod, -k.adet)}
        />

        {onay && (
          <Onay
            baslik={`Sipariş ${markaEk('a')} gidecek`}
            metin={`${MARKA} yedek parça birimi siparişi görecek ve hazırlayacak. Tutar fiyat listesinden hesaplandı; kesin tutar faturada belirlenir.`}
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
              {
                ad: 'Ödeme',
                deger: gecerliOdeme === 'bakiye' ? 'Bakiyemden düşülsün' : 'Faturayla',
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
      /* Seçim adımındaki toplam kartlardaki fiyatların toplamı; ek
         indirim ödeme biçimi seçilince, özette. */
      hesap={faturaHesabi}
      iskontoOrani={iskonto.oran}
      onKapat={onKapat}
      onDevam={() => setAdim('onay')}
      onTekrar={() => {
        setDurum('yukleniyor')
        yenidenDene(setDurum, setKatalog)
      }}
    />
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
  onKapat,
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
          {!grup && !aranan && (
            <div className="montaj-liste">
              {(katalog?.gruplar || []).map((g) => (
                <button key={g.id} className="montaj" onClick={() => onGrup(g)}>
                  <span className="montaj__ad">{g.ad}</span>
                  <span className="montaj__sayi">{g.adet}</span>
                  <IconRight size={18} />
                </button>
              ))}
            </div>
          )}

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

      <div className="yapisik">
        {secili.length > 0 && (
          <div className="siparis-toplam">
            <span>
              {secili.length} parça türü · {adetToplam} adet
            </span>
            <strong>
              {paraYaz(hesap.araToplam)} {PARA_BIRIMI}
            </strong>
            {KDV_HARIC_LISTE && <small>KDV hariç</small>}
          </div>
        )}
        <button
          className="dg dg--ana dg--blok"
          onClick={onDevam}
          disabled={!secili.length}
        >
          Devam
        </button>
        <button className="dg dg--blok" style={{ marginTop: 8 }} onClick={onKapat}>
          Vazgeç
        </button>
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
      {secili && (
        <div className="parca-kart__adet">
          <button
            type="button"
            className="stok-dus"
            onClick={() => onAdet(-1)}
            aria-label={parca.ad + ' adedini azalt'}
          >
            <IconMinus size={19} />
          </button>
          <span className="parca-kart__sayi">{adet}</span>
          <button
            type="button"
            className="stok-dus"
            onClick={() => onAdet(1)}
            aria-label={parca.ad + ' adedini artır'}
          >
            <IconPlus size={19} />
          </button>
        </div>
      )}
    </ParcaKarti>
  )
}

/* Yükleme sırasında kartların iskeleti duruyor: boş bir ekran
   "bir şey yok" der, iskelet "geliyor" der. Servis kaydındaki parça
   seçimiyle birebir aynı yüzey. */
function Yukleniyor() {
  return (
    <>
      <p className="ipucu">Parça listesi {MARKA} sunucusundan yükleniyor…</p>
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
    <div className="not not--turuncu">
      <IconAlert size={19} />
      <div>
        <strong>Parça listesi yüklenemedi</strong>
        <p>
          Liste {MARKA} sunucusundan geliyor. Bağlantınızı kontrol edip
          yeniden deneyin.
        </p>
        <button className="dg dg--ana dg--blok" style={{ marginTop: 12 }} onClick={onTekrar}>
          Yeniden Dene
        </button>
      </div>
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
  bakiyeYeter,
  bakiyeOrani,
  hata,
  onGeri,
  onVer,
  onSil,
}) {
  return (
    <>
      <p className="ipucu">
        Siparişinizi vermeden önce kontrol edin. Satırı kaldırmak için
        çöp kutusuna dokunun.
      </p>

      <Bolum ad="Sipariş Özeti" sayi={secili.length}>
        <div className="kart" style={{ padding: '4px 16px' }}>
          {secili.map((k) => (
            <div key={k.kod} className="ozet-kalem">
              <div className="ozet-kalem__ad">
                <div>{k.ad}</div>
                <div className="kucuk sonuk">
                  <span className="mono">{k.kod}</span> · {k.adet} ×{' '}
                  {k.birimFiyat === null
                    ? 'Fiyat bilgisi yok'
                    : `${paraYaz(k.birimFiyat)} ${PARA_BIRIMI}`}
                </div>
              </div>
              <div className="ozet-kalem__tutar">
                {k.satirTutari === null ? '—' : paraYaz(k.satirTutari)}
              </div>
              <button
                className="ozet-kalem__sil"
                onClick={() => onSil(k)}
                aria-label={k.ad + ' satırını kaldır'}
              >
                <IconTrash size={18} />
              </button>
            </div>
          ))}
        </div>

        <div className="fiyat-kart" style={{ marginTop: 12 }}>
          {/* İNDİRİM AYRI SATIR (23 Eylül 2026): liste fiyatıyla toplam,
              oran ve düşülen tutar. Satır tutarları zaten indirimli. */}
          {hesap.iskontoTutari > 0 && (
            <>
              <div className="urun-kart__satir">
                <span>Liste fiyatıyla toplam</span>
                <strong>
                  {paraYaz(hesap.listeToplam)} {PARA_BIRIMI}
                </strong>
              </div>
              <div className="urun-kart__satir urun-kart__satir--indirim">
                <span>Yedek parça indiriminiz (%{yuzdeYap(iskontoOrani)})</span>
                <strong>
                  −{paraYaz(hesap.iskontoTutari)} {PARA_BIRIMI}
                </strong>
              </div>
            </>
          )}
          {/* BAKİYEDEN ÖDEMEDE EK İNDİRİM (24 Eylül 2026): yalnız bakiye
              seçiliyken. KDV'den önce düşülüyor; ara toplam ve KDV ek
              indirimli tutardan. */}
          {hesap.bakiyeIskontoTutari > 0 && (
            <div className="urun-kart__satir urun-kart__satir--indirim">
              <span>Bakiyeden ödeme ek indirimi (%{yuzdeYap(hesap.bakiyeIskontoOrani)})</span>
              <strong>
                −{paraYaz(hesap.bakiyeIskontoTutari)} {PARA_BIRIMI}
              </strong>
            </div>
          )}
          <div className="urun-kart__satir">
            <span>Ara toplam</span>
            <strong>
              {paraYaz(hesap.araToplam)} {PARA_BIRIMI}
            </strong>
          </div>
          {/* KDV satırı yalnız liste fiyatı KDV hariçse görünüyor;
              kararın gerekçesi marka/katalog/para.js içinde. */}
          {KDV_HARIC_LISTE && (
            <div className="urun-kart__satir">
              <span>KDV %{Math.round(KDV_ORANI * 100)}</span>
              <strong>
                {paraYaz(hesap.kdv)} {PARA_BIRIMI}
              </strong>
            </div>
          )}
          <div className="urun-kart__satir urun-kart__satir--vurgu">
            <span>Genel toplam</span>
            <strong>
              {paraYaz(hesap.toplam)} {PARA_BIRIMI}
            </strong>
          </div>
          <div className="urun-kart__dip">
            {hesap.eksik
              ? 'Fiyatı listede olmayan parça var; gösterilen toplam eksik. '
              : ''}
            Tutar fiyat listesinden hesaplandı; kesin tutar faturada belirlenir.
          </div>
        </div>
      </Bolum>

      {/* ÖDEME BİÇİMİ.

          Bakiye yetmiyorsa seçenek kapalı. İçinde yalnız bakiye yazıyor
          (kullanıcının isteği, 24 Eylül 2026); kapalı olmasının sebebi
          üstteki genel toplamla bakiyenin yan yana okunması. Ek indirim
          varsa rozeti başlığın yanında — kapalıyken de görünüyor. */}
      <Bolum ad="Ödeme">
        <div className="secenek">
          <button
            className={'buyuk-sec' + (odeme === 'fatura' ? ' buyuk-sec--on' : '')}
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
            onClick={() => onOdeme('bakiye')}
          >
            <span className="buyuk-sec__ad">
              Bakiyemden Düşülsün
              {bakiyeOrani > 0 && (
                <span className="odeme-rozet">%{yuzdeYap(bakiyeOrani)} ek indirim</span>
              )}
            </span>
            <span className="buyuk-sec__alt">
              {`Bakiyeniz: ${paraYaz(bakiye)} ${PARA_BIRIMI}`}
            </span>
          </button>
        </div>
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
          placeholder={`${markaEk('a')} iletmek istediğiniz bir şey varsa yazın`}
        />
      </Bolum>

      {hata && <div className="uyari">{hata}</div>}

      <div className="yapisik">
        <button className="dg dg--ana dg--blok" onClick={onVer}>
          Sipariş Ver
        </button>
        <button className="dg dg--blok" style={{ marginTop: 8 }} onClick={onGeri}>
          Geri
        </button>
      </div>
    </>
  )
}

/* -------------------------------------------------------------- 3. Sonuç */

function Sonuc({ siparis, hesap, onBitir }) {
  const adet = Object.values(siparis.parcaAdet || {}).reduce((t, n) => t + Number(n), 0)

  return (
    <div className="siparis-sonuc">
      <IconCheckCircle size={54} />
      <h2>Siparişiniz {markaEk('a')} İletildi</h2>
      <p className="mono siparis-sonuc__no">{siparis.no}</p>
      <p className="kucuk sonuk">
        {(siparis.parcalar || []).length} kalem · {adet} adet ·{' '}
        {paraYaz(hesap.araToplam)} {PARA_BIRIMI}
        {KDV_HARIC_LISTE ? ' (KDV hariç)' : ''}
      </p>
      <p className="kucuk sonuk">
        Siparişin durumunu Parça bölümünden takip edebilirsiniz. {MARKA}{' '}
        onayladığında haberdar olacaksınız.
      </p>
      <button className="dg dg--ana dg--blok" onClick={onBitir}>
        Tamam
      </button>
    </div>
  )
}
