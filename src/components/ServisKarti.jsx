import { Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProduct, urunDilde } from '../data/katalog/products.js'
import { formatSerial } from '../lib/serial'
import { araProps, telFirma } from '../lib/tel'
import { IconPhone, IconShield, IconWrench } from './Icons'

/* ==========================================================================
   Servis kartı — "makineme kim bakıyor?"

   Ana ekranda (screens/Home.jsx) ve makine detayında
   (screens/MachineDetail.jsx) aynı kart. Önce yalnız ana ekranda,
   müşterinin TEK servisi için vardı.

   ATAMA MAKİNE BAŞINA (bkz. lib/servisAtama.js → servisGruplari): aynı
   müşterinin iki makinesine iki servis bakabiliyor. Ana ekranda her
   servis kendi kartında; müşterinin birden çok servisi varsa ya da
   servisi olmayan makinesi varsa kartın altında hangi makineye baktığı
   yazıyor. Tek servis bütün makinelere bakıyorsa o satır yok — söylediği
   bir şey olmazdı.

   ATANMAMIŞSA ne eksik ve kimin yapacağı yazıyor. Atama PAKSAN'ın işi ve
   PAKSAN onu kendisi yapıyor (21 Eylül 2026, kullanıcının kararı);
   kartta bu yüzden arama düğmesi yok — eskiden "bizi arayın, hemen
   atayalım" diyordu ve işi müşteriye yüklüyordu.
   ========================================================================== */

/* Makinelerin listede görünen adları: model (varsa takma adıyla). Aynı
   modelden iki makine varsa ad tek başına ayırt etmiyor; seri eklenir. */
function makineAdListesi(makineler, dil) {
  const adlar = makineler.map((m) => {
    const pr = urunDilde(getProduct(m.productId), dil)
    return pr?.name ? pr.name + (m.nickname ? ` (${m.nickname})` : '') : formatSerial(m.serial)
  })
  return adlar.map((ad, i) =>
    adlar.indexOf(ad) !== adlar.lastIndexOf(ad) ? `${ad} · ${formatSerial(makineler[i].serial)}` : ad,
  )
}

export function makineAdlari(makineler, dil) {
  return makineAdListesi(makineler, dil).join(', ')
}

/* "Baktığı makine: Süper Yunus" — MAKİNE ADI BAĞLANTI (22 Eylül 2026,
   kullanıcının isteği: "servisin ilgilendiği makine daha belirgin
   gösterilsin, altı çizili olabilir"). Adın altı çizili ve marka
   mavisinde; altı çizili yazı bağlantı gibi okunduğu için dokununca o
   makinenin sayfası açılıyor — orada da aynı servis kartı duruyor.
   Cümle sözlükten geliyor ("Baktığı makine: {liste}"); ad yer tutucunun
   yerine düğme olarak konuyor, cümlenin geri kalanı olduğu gibi. */
function MakineSatiri({ makineler, t, dil }) {
  const nav = useNavigate()
  const ayrac = '\u0001'
  const [once, sonra = ''] = t(makineler.length > 1 ? 'servisim.baktigiMakineler' : 'servisim.baktigiMakine', {
    liste: ayrac,
  }).split(ayrac)
  const adlar = makineAdListesi(makineler, dil)
  return (
    <div className="card__sub servis-karti__makine">
      {once}
      {makineler.map((m, i) => (
        <Fragment key={m.id || m.serial}>
          {i > 0 && ', '}
          <button type="button" className="servis-karti__makine-ad" onClick={() => nav('/makine/' + m.id)}>
            {adlar[i]}
          </button>
        </Fragment>
      ))}
      {sonra}
    </div>
  )
}

/**
 * Servisi atanmış kart. `makineler` verilirse altında hangi makineye
 * baktığı yazıyor.
 *
 * `sade`: ana ekranda birden çok servis alt alta dururken. Büyük mavi
 * arama düğmesiyle iki kart ekranın yarısını kaplıyor, hızlı işlemleri
 * ekranın dışına itiyordu. Sade kartta "Servisiniz" üst yazısı yok
 * (bölüm başlığı "Servislerim" zaten söylüyor) ve numara ikincil
 * düğmede; tek servisin kartı eskisi gibi büyük.
 */
export function ServisKarti({ servis, makineler, sade, yeni, showToast, t, dil }) {
  const numara = telFirma(servis.tel)

  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div
          className="listitem__icon"
          style={{ background: 'var(--pk-green-soft)', color: 'var(--pk-green-yazi)' }}
        >
          <IconWrench size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {!sade && <div className="card__sub">{t('servisim.baslik')}</div>}
          <div className="card__title" style={{ fontSize: 17 }}>
            {servis.ad}
            {/* Yeni atanan servis: Makinelerim → Servislerim sekmesinde, o
                ziyaret boyunca (bkz. screens/Machines.jsx). */}
            {yeni && <span className="badge badge--yeni baslik-rozeti">{t('anasayfa.yeni')}</span>}
          </div>
          <div className="card__sub" style={{ marginTop: 2 }}>
            {[servis.ilce, servis.il].filter(Boolean).join(' / ')}
          </div>
          {makineler?.length > 0 && <MakineSatiri makineler={makineler} t={t} dil={dil} />}
        </div>
      </div>

      {numara && (
        <a
          className={sade ? 'btn btn--soft btn--sm' : 'btn btn--blue'}
          style={{ marginTop: sade ? 10 : 12 }}
          {...araProps(servis.tel, numara, showToast)}
        >
          <IconPhone size={sade ? 19 : 20} /> {numara}
        </a>
      )}
    </div>
  )
}

/**
 * Servisi olmayan makineler için turuncu kart.
 *
 * `hicbiri`: müşterinin HİÇBİR makinesinin servisi yok — o zaman
 * servis talebi hiç açılamıyor ve bugünkü cümle ("Servisiniz henüz
 * atanmadı") doğru. Bazılarının servisi varsa kart hangi makinelerde
 * eksik olduğunu yazıyor.
 */
export function ServisYokKarti({ makineler = [], hicbiri, t, dil }) {
  return (
    <div className="card" style={{ background: 'var(--pk-orange-soft)', boxShadow: 'none' }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--pk-orange-ink)', flex: 'none' }}>
          <IconShield size={22} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card__title">{t(hicbiri ? 'servisim.yok' : 'servisim.eksik')}</div>
          <div className="card__sub">
            {hicbiri
              ? t('servisim.yokAlt')
              : t('servisim.eksikAlt', { liste: makineAdlari(makineler, dil) })}
          </div>
        </div>
      </div>
    </div>
  )
}
