import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { load, save } from '../lib/storage'
import { ekAdresi } from '../lib/ekler'
import { duyuruGecerliMi, personelDuyurusuMu } from '../lib/duyuruHedef'
import { makinelereServisEkle } from '../lib/servisAtama'
import { yurtdisiTalepMi } from '../lib/ihracat'
import { Sheet } from './Chrome'
import { altBilgi } from '../data/duyuruTurleri'
import {
  IconAlert, IconBell, IconCalendar, IconMachine, IconTag, IconUndo,
} from './Icons'

/* Alt türün ikonu. Tablodaki `ikon` adı burada bileşene bağlanıyor —
   veri dosyası JSX taşımıyor, üç ürün de kendi ikon setini kullanıyor. */
const IKONLAR = {
  etiket: IconTag,
  makine: IconMachine,
  takvim: IconCalendar,
  uyari: IconAlert,
  geri: IconUndo,
}

/* ==========================================================================
   Duyuru penceresi

   NEDEN PENCERE

   Duyuru yalnız Bildirimler listesinde dursaydı kimse görmezdi: o
   listeye kendiliğinden bakan kullanıcı yok. Kampanya ya da güvenlik
   uyarısı yapılıyorsa görülmesi gerekiyor.

   NEDEN YALNIZ PENCERE DEĞİL

   Pencereyi kapatan kişi bir daha ulaşamasın istemiyoruz. Bu yüzden
   duyuru iki yerde birden: burada bir kez pencere olarak, sonrasında
   Bildirimler listesinde kalıcı olarak.

   HANGİSİ KİME GİDİYOR

     duyuru → kampanya, yeni ürün. YALNIZ izin verene gidiyor. Ticari
              elektronik ileti kuralı (6563) bunu şart koşuyor.
     uyari  → güvenlik uyarısı, geri çağırma. Herkese gidiyor; hizmete
              ilişkin bildirim ticari ileti sayılmıyor ve zaten
              görülmemesi tehlikeli.

   ÜST ÜSTE YIĞILMIYOR: duyurular tek pencerede sırayla gösteriliyor.

   GÖRÜLDÜ BİLGİSİ okundu bilgisinden AYRI tutuluyor: pencereyi
   kapatmak duyuruyu okundu saymıyor, Bildirimler listesinde mavi
   noktası duruyor. Kapatan kişi "sonra bakarım" demiş olabilir.
   ========================================================================== */

const ANAHTAR = 'gorulenDuyurular'

export function Duyuru() {
  const nav = useNavigate()
  const { user, machines } = useApp()
  const { t } = useDil()
  const [duyurular, setDuyurular] = useState([])
  const [sira, setSira] = useState(0)


  useEffect(() => {
    if (!user) return

    const gorulen = new Set(load(ANAHTAR, []))
    /* Kime gideceği kararı tek yerde: src/lib/duyuruHedef.js.
       Kampanya izni, yurtdışı ve hedefleme kuralları orada; burada
       yalnız pencereye özel iki koşul kalıyor. */
    const aday = load('duyurular', [])
      .filter((d) => d.pencere && personelDuyurusuMu(d))
      .filter((d) =>
        duyuruGecerliMi(d, {
          user,
          /* Makineye bakan servis de ekleniyor: servis seçilmiş duyuru
             o servisin baktığı makinelerin sahiplerine gidiyor. */
          makineler: makinelereServisEkle(machines),
          yurtdisi: yurtdisiTalepMi(user),
        }),
      )
      .filter((d) => !gorulen.has(d.id))
      .sort((a, b) => b.tarih - a.tarih)

    setDuyurular(aday)
    setSira(0)
  }, [user, machines])

  function kapat() {
    const acik = duyurular[sira]
    if (acik) save(ANAHTAR, [...new Set([...load(ANAHTAR, []), acik.id])])
    setDuyurular([])
  }

  function ilerle() {
    const acik = duyurular[sira]
    if (!acik) return
    save(ANAHTAR, [...new Set([...load(ANAHTAR, []), acik.id])])
    if (sira < duyurular.length - 1) setSira(sira + 1)
    else setDuyurular([])
  }

  const acik = duyurular[sira]
  if (!acik) return null

  /* ------------------------------------------------------------- Tasarım

     ÖNCEKİ HÂLİ TÜRÜ ANLATMIYORDU. Bütün duyurular aynı kutuda,
     yuvarlak ikonla ve tek başlıkla görünüyordu; kampanya ile güvenlik
     uyarısı arasındaki tek fark ikonun rengiydi. Okuyan kişi neyle
     karşılaştığını başlığı okuyana kadar bilmiyordu.

     Şimdi türün kendi şeridi var: renk, ikon ve türün adı en üstte.
     Renkli şerit, ekranın en üstünde ve metinden önce görülüyor —
     kampanya turuncu, güvenlik uyarısı kırmızı.

     Sınıf adları backoffice önizlemesiyle birebir aynı
     (bkz. backoffice/ekranlar/Duyurular.jsx → Onizleme); personelin
     yayınlamadan önce gördüğü kutu ile müşterinin gördüğü kutu
     ayrışmasın diye. */
  const bilgi = altBilgi(acik)
  const Ikon = IKONLAR[bilgi.ikon] || IconBell
  const sonuncu = sira >= duyurular.length - 1

  /* Pencere başlığı ÜST türü söylüyor, şerit alt türü. İkisi de alt
     türü yazınca "Kampanya" iki kez okunuyordu. Üstte hukuki sınıf,
     altta ne olduğu: "PAKSAN Duyurusu" › KAMPANYA. */
  return (
    <Sheet
      open
      onClose={kapat}
      title={bilgi.ust === 'uyari' ? t('duyuru.uyariBaslik') : t('duyuru.baslik')}
    >
      <div className={'duyuru-kutu duyuru-kutu--' + bilgi.ton}>
        <div className="duyuru-kutu__tepe">
          <Ikon size={18} />
          <span className="duyuru-kutu__etiket">{t(bilgi.anahtar)}</span>
        </div>

        <div className="duyuru-kutu__ic">
          {/* Görsel varsa metnin üstünde, tam genişlikte. `contain` ile:
              kampanya görselinin üzerindeki yazı kırpılmasın. */}
          {acik.gorsel && <DuyuruGorseli gorsel={acik.gorsel} />}

          <h2 className="duyuru-kutu__baslik">{acik.baslik}</h2>
          <p className="duyuru-kutu__metin">{acik.metin}</p>
        </div>
      </div>

      <div className="stack" style={{ gap: 10, marginTop: 16 }}>
        <button className="btn btn--primary btn--lg" onClick={ilerle}>
          {sonuncu ? t('duyuru.anladim') : t('duyuru.sonraki')}
        </button>
        {/* Sıradaki duyuru varken listeye gitme düğmesi görünmüyor:
            arkada bekleyen duyuru okunmadan kapanırdı. */}
        {sonuncu && (
          <button
            className="btn btn--soft"
            onClick={() => {
              kapat()
              nav('/bildirimler')
            }}
          >
            {t('duyuru.tumBildirimler')}
          </button>
        )}
      </div>
    </Sheet>
  )
}

/* Duyuru görseli.

   Dosyanın kendisi IndexedDB'de duruyor (backoffice oraya yazıyor); burada
   geçici bir adres üretilip gösteriliyor ve ekrandan çıkarken
   bırakılıyor — yoksa hafızada birikiyor. */
function DuyuruGorseli({ gorsel }) {
  const [adres, setAdres] = useState(null)

  useEffect(() => {
    let gecerli = true
    let acik = null
    ekAdresi(gorsel.id).then((a) => {
      if (!gecerli) return a && URL.revokeObjectURL(a)
      acik = a
      setAdres(a)
    })
    return () => {
      gecerli = false
      if (acik) URL.revokeObjectURL(acik)
    }
  }, [gorsel.id])

  if (!adres) return null
  return <img className="duyuru-gorsel" src={adres} alt="" />
}
