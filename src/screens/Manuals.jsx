import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { TopBar, TabBar } from '../components/Chrome'
import { UrunFoto } from '../components/Gorsel'
import {
  getCategory, getProduct, kategoriDilde, kilavuzSirasiyla, PRODUCTS, urunDilde,
} from '../data/katalog/products.js'
import {
  boyutYaz,
  kilavuzAdi,
  kilavuzDurumu,
  kilavuzKodu,
  kilavuzListesiGetir,
  kilavuzVarMi,
  sonKilavuzListesi,
} from '../lib/kilavuzPdf'
import { IconRight, IconShield, IconInfo } from '../components/Icons'

/* ==========================================================================
   Kullanım kılavuzları listesi

   Ana sayfadaki "Kılavuzlar" karosu buraya geliyor. Önce kullanıcının
   kendi makineleri (aradığı kılavuz büyük ihtimalle onlardan biri),
   altında öteki modeller makine türüne göre. Bir modele dokununca o
   modelin kılavuzu açılıyor.

   YALNIZ GERÇEK KILAVUZU OLANLAR. Listede kılavuzu olan modeller var
   (bkz. data/icerik/kilavuzEslesme.js).
   Kılavuzu olmayan modeller burada görünmüyor — uygulamanın kendi
   yazdığı genel bir özeti "kılavuz" diye göstermek, müşteriyi kılavuzu
   varmış gibi bir yere götürüyordu. Kayıtlı makinesinin kılavuzu yoksa
   bunun nedeni listenin başında yazıyor.

   YENİDEN DÜZENLENDİ (29 Eylül 2026, kullanıcının isteği): kılavuzun adı
   ve sayfa sayısı satırda; öteki modeller türlerine göre başlık başlık;
   güvenlik kuralları kırmızı bir duvar yerine kendi satırında.

   KILAVUZ ARTIK PDF (aynı gün, kullanıcının kararı; bkz.
   screens/KilavuzPdf.jsx). Satırda kılavuzun adı, sayfa sayısı ve dosya
   boyutu; telefona indirilmişse bu yazıyor. Ad ve boyut sunucudaki
   listeden geliyor; internet yoksa telefondaki son listeden.
   ========================================================================== */

export default function Manuals() {
  const { t, dil } = useDil()
  const { machines } = useApp()

  const [liste, setListe] = useState(() => sonKilavuzListesi())
  /* Telefonda duran kılavuzların kodları. */
  const [kayitli, setKayitli] = useState(() => new Set())
  useEffect(() => {
    let iptal = false
    kilavuzListesiGetir()
      .then((l) => !iptal && setListe(l))
      .catch(() => {})
    return () => {
      iptal = true
    }
  }, [])
  useEffect(() => {
    let iptal = false
    Promise.all(
      Object.entries(liste).map(async ([kod, bilgi]) => [kod, await kilavuzDurumu(kod, bilgi)]),
    ).then((durumlar) => {
      if (!iptal) setKayitli(new Set(durumlar.filter(([, d]) => d !== 'yok').map(([kod]) => kod)))
    })
    return () => {
      iptal = true
    }
  }, [liste])

  /* Kullanıcının makinelerinin modelleri — aynı modelden iki tane varsa
     kılavuz listesinde bir kez görünsün. */
  const benimModellerim = []
  /* Kılavuzu HENÜZ olmayan kayıtlı makineler. Bunlar listede
     görünemiyor; kullanıcıya sebebini söylemek gerekiyor. */
  const kilavuzsuzlarim = []
  for (const m of machines) {
    const p = getProduct(m.productId)
    if (!p) continue
    const hedef = kilavuzVarMi(p.id) ? benimModellerim : kilavuzsuzlarim
    if (!hedef.some((x) => x.id === p.id)) hedef.push(p)
  }

  /* Öteki modeller makine türüne göre öbekleniyor; sıra kılavuz
     sırası (küçük balya → büyük balya → rulo balya → diğerleri). */
  const turler = []
  for (const p of kilavuzSirasiyla(PRODUCTS)) {
    if (!kilavuzVarMi(p.id) || benimModellerim.some((x) => x.id === p.id)) continue
    let tur = turler.find((x) => x.id === p.category)
    if (!tur) {
      tur = { id: p.category, ad: kategoriDilde(getCategory(p.category), dil)?.name || '', urunler: [] }
      turler.push(tur)
    }
    tur.urunler.push(p)
  }

  return (
    <div className="app">
      <TopBar title={t('urun.kilavuzlarBaslik')} back="auto" />

      <div className="screen wrap fade-in kilavuzlar">
        <p className="kilavuzlar-giris">{t('kilavuz.listeGiris')}</p>

        {/* Güvenlik kuralları burada, tek yerde. Beş kılavuzun güvenlik
            bölümleri neredeyse birebir aynı; her modelin sayfasında
            yalnız "makineye el sürmeden önce" kuralları duruyor. */}
        <Link to="/kilavuzlar/guvenlik" className="kilavuzlar-guvenlik">
          <span className="kilavuzlar-guvenlik__ikon"><IconShield size={24} /></span>
          <span className="kilavuzlar-satir__metin">
            <span className="kilavuzlar-satir__ad">{t('guvenlik.baslik')}</span>
            <span className="kilavuzlar-satir__alt">{t('guvenlik.girisAlt')}</span>
          </span>
          <span className="kilavuzlar-satir__ok" aria-hidden="true"><IconRight size={20} /></span>
        </Link>

        {/* Kayıtlı makinesinin kılavuzu yoksa kullanıcı listede kendi
            makinesini arayıp bulamıyordu ve neden olmadığı hiçbir yerde
            yazmıyordu. */}
        {kilavuzsuzlarim.length > 0 && (
          <div className="kilavuzlar-eksik">
            <IconInfo size={20} />
            <div>
              <strong>{t('kilavuz.makinemYok')}</strong>
              <p>
                {t('kilavuz.makinemYokAlt', {
                  makineler: kilavuzsuzlarim.map((p) => urunDilde(p, dil).name).join(', '),
                })}
              </p>
            </div>
          </div>
        )}

        {benimModellerim.length > 0 && (
          <>
            <h2 className="kilavuzlar-baslik">{t('urun.benimMakinelerim')}</h2>
            <div className="stack" style={{ gap: 10 }}>
              {benimModellerim.map((p) => (
                <KilavuzSatiri key={p.id} urun={urunDilde(p, dil)} dil={dil} t={t} liste={liste} kayitli={kayitli} />
              ))}
            </div>
          </>
        )}

        {turler.map((tur) => (
          <section key={tur.id} aria-labelledby={'kilavuz-tur-' + tur.id}>
            <h2 id={'kilavuz-tur-' + tur.id} className="kilavuzlar-baslik">
              {tur.ad}
              <span className="sectionhead__count">{tur.urunler.length}</span>
            </h2>
            <div className="stack" style={{ gap: 10 }}>
              {tur.urunler.map((p) => (
                <KilavuzSatiri key={p.id} urun={urunDilde(p, dil)} dil={dil} t={t} liste={liste} kayitli={kayitli} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <TabBar />
    </div>
  )
}

function KilavuzSatiri({ urun, dil, t, liste, kayitli }) {
  const kod = kilavuzKodu(urun.id)
  const bilgi = liste[kod]

  return (
    <Link to={`/kilavuz/${urun.id}`} className="kilavuzlar-satir">
      <UrunFoto urunId={urun.id} ad={urun.name} tip="thumb" ikonBoyut={24} />
      <span className="kilavuzlar-satir__metin">
        <span className="kilavuzlar-satir__ad">{urun.name}</span>
        <span className="kilavuzlar-satir__alt">{bilgi ? kilavuzAdi(bilgi, dil) : urun.tagline}</span>
        {bilgi && (
          <span className="kilavuzlar-satir__sayfa">
            {kayitli.has(kod)
              ? t('kilavuz.telefonda')
              : t('kilavuz.ozet', { sayfa: bilgi.sayfa, boyut: boyutYaz(bilgi.boyut, dil) })}
          </span>
        )}
      </span>
      <span className="kilavuzlar-satir__ok" aria-hidden="true"><IconRight size={20} /></span>
    </Link>
  )
}
