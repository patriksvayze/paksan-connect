import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { load, save } from '../lib/storage'
import { ekAdresi } from '../lib/ekler'
import { Sheet } from './Chrome'
import { IconAlert, IconBell } from './Icons'

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

   ÜST ÜSTE YIĞILMIYOR: bir seferde tek duyuru gösteriliyor. Beş duyuru
   birikmişse en yenisi çıkıyor, kapatılınca bir sonraki değil
   Bildirimler listesi devreye giriyor — uygulamayı açan kişiyi pencere
   zinciriyle karşılamak kaçırtır.

   GÖRÜLDÜ BİLGİSİ okundu bilgisinden AYRI tutuluyor: pencereyi
   kapatmak duyuruyu okundu saymıyor, Bildirimler listesinde mavi
   noktası duruyor. Kapatan kişi "sonra bakarım" demiş olabilir.
   ========================================================================== */

const ANAHTAR = 'gorulenDuyurular'

export function Duyuru() {
  const nav = useNavigate()
  const { user } = useApp()
  const { t } = useDil()
  const [acik, setAcik] = useState(null)

  const kampanyaIzni = Boolean(user?.onaylar?.kampanya)

  useEffect(() => {
    if (!user) return

    const gorulen = new Set(load(ANAHTAR, []))
    const aday = load('duyurular', [])
      .filter((d) => d.pencere && (d.tur === 'duyuru' || d.tur === 'uyari'))
      .filter((d) => (d.tur === 'duyuru' ? kampanyaIzni : true))
      .filter((d) => !gorulen.has(d.id))
      .sort((a, b) => b.tarih - a.tarih)[0]

    if (aday) setAcik(aday)
  }, [user, kampanyaIzni])

  function kapat() {
    if (acik) save(ANAHTAR, [...new Set([...load(ANAHTAR, []), acik.id])])
    setAcik(null)
  }

  if (!acik) return null

  const uyari = acik.tur === 'uyari'

  return (
    <Sheet open onClose={kapat} title={uyari ? t('duyuru.uyariBaslik') : t('duyuru.baslik')}>
      <div className="stack" style={{ gap: 16 }}>
        <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <span
            className="listitem__icon"
            style={
              uyari
                ? { background: 'var(--pk-orange-soft)', color: 'var(--pk-orange-ink)' }
                : { background: 'var(--pk-blue-soft)', color: 'var(--pk-blue-yazi)' }
            }
          >
            {uyari ? <IconAlert size={22} /> : <IconBell size={22} />}
          </span>
          <h2 style={{ fontSize: 18, lineHeight: 1.4, margin: 0, flex: 1 }}>{acik.baslik}</h2>
        </div>

        {/* Görsel varsa metnin üstünde, tam genişlikte. `contain` ile:
            kampanya görselinin üzerindeki yazı kırpılmasın. */}
        {acik.gorsel && <DuyuruGorseli gorsel={acik.gorsel} />}

        <p style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{acik.metin}</p>

        <button className="btn btn--primary btn--lg" onClick={kapat}>
          {t('duyuru.anladim')}
        </button>
        <button
          className="btn btn--soft"
          onClick={() => {
            kapat()
            nav('/bildirimler')
          }}
        >
          {t('duyuru.tumBildirimler')}
        </button>
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
