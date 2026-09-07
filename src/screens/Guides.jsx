import { Link } from 'react-router-dom'
import { TopBar, TabBar } from '../components/Chrome'
import { rehberListesi, mevsimRehberi } from '../marka/icerik/rehber'
import { useDil } from '../i18n'
import { IconCalendar, IconRight } from '../components/Icons'

/* Bakım rehberlerinin tam listesi.

   Ana sayfada üç rehber sığıyor ama liste büyüdüğünde orada tutmak
   mümkün olmayacak; asıl yer burası. Ana sayfadaki "Tümü" bağlantısı
   bu ekrana getiriyor.

   İçinde bulunulan aya denk gelen rehber listenin en üstüne alınıyor —
   çiftçi hangi mevsimde ne yapması gerektiğini aramadan bulsun. Ayrıca
   bir etiket konmuyor; sıra yeterli.                                   */

export default function Guides() {
  const { t, dil } = useDil()
  const simdiki = mevsimRehberi()
  const REHBERLER = rehberListesi(dil)

  /* Mevsime denk gelen rehber başa alınır, sıra bozulmadan */
  const sirali = [
    ...REHBERLER.filter((r) => r.id === simdiki.id),
    ...REHBERLER.filter((r) => r.id !== simdiki.id),
  ]

  return (
    <div className="app">
      <TopBar title={t('rehberler.baslik')} sub={t('ortak.rehberSayisi', { n: REHBERLER.length })} back="auto" />

      <div className="screen wrap fade-in" style={{ paddingTop: 16 }}>
        <p className="muted" style={{ lineHeight: 1.6, marginBottom: 18 }}>
          {t('rehberler.giris')}
        </p>

        <div className="stack">
          {sirali.map((r) => (
            <Link key={r.id} to={`/bakim/${r.id}`} className="listitem">
              <div
                className="listitem__icon"
                style={{ background: 'var(--pk-green-soft)', color: 'var(--pk-green-yazi)' }}
              >
                <IconCalendar size={22} />
              </div>
              <div className="listitem__body">
                <div className="listitem__title">{r.baslik}</div>
                <div className="listitem__sub">{r.ozet}</div>
                <div className="listitem__sub" style={{ marginTop: 2 }}>
                  {r.neZaman}
                </div>
              </div>
              <span className="listitem__chev">
                <IconRight size={21} />
              </span>
            </Link>
          ))}
        </div>
      </div>

      <TabBar />
    </div>
  )
}
