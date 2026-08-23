import { Link } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { TopBar, TabBar } from '../components/Chrome'
import { UrunFoto } from '../components/Gorsel'
import { getProduct, kilavuzSirasiyla, PRODUCTS, urunDilde } from '../data/products'
import { kilavuzBelgesi, kilavuzVarMi } from '../lib/kilavuzVeri'
import { IconRight, IconAlert } from '../components/Icons'

/* Kullanım kılavuzları listesi.

   Ana sayfadaki "Kılavuzlar" karosu buraya geliyor. Önce kullanıcının
   kendi makineleri (aradığı kılavuz büyük ihtimalle onlardan biri),
   altında tüm ürünler. Bir modele dokununca o modelin kılavuzu açılıyor.

   YALNIZ GERÇEK KILAVUZU OLANLAR

   Listede, PAKSAN'ın kullanım kılavuzu veri sete girmiş modeller var
   (bkz. src/lib/kilavuzVeri.js). Kılavuzu olmayan modeller burada
   görünmüyor — uygulamanın kendi yazdığı genel bir özeti "kılavuz" diye
   göstermek, müşteriyi kılavuzu varmış gibi bir yere götürüyordu.
   O modeller Ürünler ve Makineler ekranlarında duruyor. */

export default function Manuals() {
  const { t, dil } = useDil()
  const { machines } = useApp()

  /* Kullanıcının makinelerinin modelleri — aynı modelden iki tane varsa
     kılavuz listesinde bir kez görünsün. */
  const benimModellerim = []
  for (const m of machines) {
    const p = getProduct(m.productId)
    if (!p || !kilavuzVarMi(p.id)) continue
    if (!benimModellerim.some((x) => x.id === p.id)) benimModellerim.push(p)
  }

  /* Sıralama makine tipine göre: küçük balya → büyük balya →
     rulo balya → diğerleri. Çiftçi kendi tipini aramadan bulsun. */
  const digerleri = kilavuzSirasiyla(PRODUCTS).filter(
    (p) => kilavuzVarMi(p.id) && !benimModellerim.some((x) => x.id === p.id)
  )

  return (
    <div className="app">
      <TopBar title={t('urun.kilavuzlarBaslik')} back="auto" />

      <div className="screen wrap fade-in" style={{ paddingTop: 16 }}>
        {/* Güvenlik kuralları burada, tek yerde.

            Beş kılavuzun güvenlik bölümleri neredeyse birebir aynı
            (47 madde ortak). Her modelin sayfasında aynı 51 maddeyi
            tekrarlamak yerine ortak sayfaya alındı; model sayfalarında
            yalnız "makineye el sürmeden önce" kuralları duruyor. */}
        <Link to="/kilavuzlar/guvenlik" className="listitem listitem--uyari">
          <div className="listitem__icon listitem__icon--uyari">
            <IconAlert size={22} />
          </div>
          <div className="listitem__body">
            <div className="listitem__title">{t('guvenlik.baslik')}</div>
            <div className="listitem__sub">{t('guvenlik.girisAlt')}</div>
          </div>
          <span className="listitem__chev">
            <IconRight size={21} />
          </span>
        </Link>

        {benimModellerim.length > 0 && (
          <>
            <div className="sectionhead" style={{ marginTop: 0 }}>
              <h2>{t('urun.benimMakinelerim')}</h2>
            </div>
            <div className="stack">
              {benimModellerim.map((p) => (
                <KilavuzSatiri key={p.id} urun={urunDilde(p, dil)} />
              ))}
            </div>
          </>
        )}

        <div className="sectionhead">
          <h2>{benimModellerim.length > 0 ? t('urun.digerModeller') : t('urun.tumModeller')}</h2>
          <span className="sectionhead__count">{digerleri.length}</span>
        </div>
        <div className="stack">
          {digerleri.map((p) => (
            <KilavuzSatiri key={p.id} urun={urunDilde(p, dil)} />
          ))}
        </div>
      </div>

      <TabBar />
    </div>
  )
}

function KilavuzSatiri({ urun }) {
  const belge = kilavuzBelgesi(urun.id)

  return (
    <Link to={`/kilavuz/${urun.id}`} className="listitem">
      <UrunFoto
        urunId={urun.id}
        ad={urun.name}
        tip="thumb"
        ikonBoyut={24}
        style={{ width: 52, height: 44, borderRadius: 12 }}
      />
      <div className="listitem__body">
        <div className="listitem__title">{urun.name}</div>
        <div className="listitem__sub">{belge ? belge.ad : urun.tagline}</div>
      </div>
      <span className="listitem__chev">
        <IconRight size={21} />
      </span>
    </Link>
  )
}
