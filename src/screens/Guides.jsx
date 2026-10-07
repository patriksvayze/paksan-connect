import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { TopBar, TabBar } from '../components/Chrome'
import { araligiBolme, RehberIlerlemesi, RehberMakineSecici } from '../components/Rehber'
import { rehberListesi, mevsimRehberi } from '../data/icerik/rehber'
import { rehberCizimi } from '../data/bakimCizimleri'
import { getProduct, supportGroup } from '../data/katalog/products.js'
import { isaretleriGetir, rehberIlerlemesi } from '../lib/rehberIsaret'
import { useDil } from '../i18n'
import { IconCalendar, IconRight } from '../components/Icons'

/* ==========================================================================
   Bakım rehberleri — liste

   YENİDEN DÜZENLENDİ (29 Eylül 2026, kullanıcının isteği). Üç rehber
   aynı biçimde alt alta duruyordu; hangisinin şimdi yapılacağı, ne
   kadarının yapıldığı görünmüyordu.

     · İçinde bulunulan mevsimin rehberi büyük kartta, başta
       (data/icerik/rehber.js → mevsimRehberi). Kartın üstündeki "bu
       mevsim" rozeti neden başta olduğunu söylüyor.
     · Her rehberde seçili makinedeki ilerleme: kaç adımın yapıldığı
       rehberin içindekiyle aynı sayı (lib/rehberIsaret.js →
       rehberIlerlemesi).
     · Birden çok makinesi olan çiftçi makineyi burada seçiyor; rehber o
       makineyle açılıyor (?makine=). Makine sayfasından gelindiyse o
       makine seçili.
   ========================================================================== */

export default function Guides() {
  const { t, dil } = useDil()
  const { machines } = useApp()
  const [params] = useSearchParams()
  const [secili, setSecili] = useState(
    () => machines.find((m) => m.id === params.get('makine'))?.id || machines[0]?.id || null,
  )

  const makine = machines.find((m) => m.id === secili) || null
  const grup = makine ? supportGroup(getProduct(makine.productId)) : null
  const isaretler = isaretleriGetir()
  const rehberler = rehberListesi(dil)
  const simdiki = mevsimRehberi()
  const oneCikan = rehberler.find((r) => r.id === simdiki.id) || rehberler[0]
  const digerleri = rehberler.filter((r) => r.id !== oneCikan.id)

  const adres = (r) => `/bakim/${r.id}${makine ? `?makine=${makine.id}` : ''}`
  const ilerleme = (r) => rehberIlerlemesi(r, makine?.id || null, grup, isaretler)

  const one = ilerleme(oneCikan)

  return (
    <div className="app">
      <TopBar title={t('rehberler.baslik')} back="auto" />

      <div className="screen wrap fade-in bakim">
        <p className="bakim-giris">{t('rehberler.giris')}</p>

        {machines.length > 1 && (
          <RehberMakineSecici
            machines={machines}
            secili={secili}
            onSec={setSecili}
            baslik={t('rehberler.hangiMakine')}
            dil={dil}
          />
        )}

        {/* Mevsimin rehberi. Kartın tamamı dokunulur; alttaki düğme
            görünüşte, dokunma alanı kartın kendisi. */}
        <Link to={adres(oneCikan)} className="bakim-one">
          <div className="bakim-one__ust">
            <span className="bakim-one__rozet">
              <IconCalendar size={16} /> {t('rehberler.buMevsim')}
            </span>
            {rehberCizimi(oneCikan.id) && (
              <img className="bakim-one__cizim" src={rehberCizimi(oneCikan.id)} alt="" />
            )}
          </div>
          <h2 className="bakim-one__baslik">{oneCikan.baslik}</h2>
          <p className="bakim-one__ozet">{araligiBolme(oneCikan.ozet)}</p>
          <p className="bakim-one__zaman">{oneCikan.neZaman}</p>
          <RehberIlerlemesi
            yapilan={one.yapilan}
            toplam={one.toplam}
            yazi={t('rehberler.ilerlemeUzun', one)}
          />
          <span className="btn btn--primary bakim-one__dugme">
            {one.yapilan > 0 ? t('rehberler.devamEt') : t('rehberler.basla')}
            <IconRight size={20} />
          </span>
        </Link>

        <h2 className="bakim-baslik">{t('rehberler.digerRehberler')}</h2>
        <div className="stack" style={{ gap: 12 }}>
          {digerleri.map((r) => {
            const { yapilan, toplam } = ilerleme(r)
            return (
              <Link key={r.id} to={adres(r)} className="bakim-satir">
                {rehberCizimi(r.id) && (
                  <span className="bakim-satir__cizim">
                    <img src={rehberCizimi(r.id)} alt="" />
                  </span>
                )}
                <span className="bakim-satir__metin">
                  <span className="bakim-satir__ad">{r.baslik}</span>
                  <span className="bakim-satir__alt">{araligiBolme(r.ozet)}</span>
                  <span className="bakim-satir__zaman">{r.neZaman}</span>
                  <RehberIlerlemesi
                    kucuk
                    yapilan={yapilan}
                    toplam={toplam}
                    yazi={t('rehberler.ilerlemeUzun', { yapilan, toplam })}
                  />
                </span>
                <span className="bakim-satir__ok" aria-hidden="true"><IconRight size={20} /></span>
              </Link>
            )
          })}
        </div>

        {/* Makinesi olmayana ilerleme sayılmıyor (işaret makine başına);
            rehber yine açılıyor, yalnız ortak adımlarla. */}
        {machines.length === 0 && <p className="bakim-not">{t('rehberler.makineKaydet')}</p>}
      </div>

      <TabBar />
    </div>
  )
}
