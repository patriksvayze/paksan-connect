import { useMemo } from 'react'
import { TopBar, TabBar } from '../components/Chrome'
import { useDil } from '../i18n'
import { yaz } from '../lib/destek'
import { tumGuvenlikKurallari } from '../lib/kilavuzVeri'
import { IconAlert } from '../components/Icons'

/* ==========================================================================
   Güvenlik kuralları — beş kılavuzun tamamı, tek sayfada

   Neden ayrı bir sayfa: bir kılavuzun güvenlik bölümü 51-58 madde ve
   dört kılavuzun maddeleri neredeyse birebir aynı (47 madde ortak).
   Her makinenin kendi sayfasında aynı listeyi tekrar etmenin anlamı
   yoktu; makine sayfalarında yalnız "makineye el sürmeden önce"
   kuralları duruyor, tamamı burada.

   Öbekler kılavuzun kendi sınıflandırması. Aynı cümle birden çok
   kılavuzda geçiyorsa bir kez yazılıyor.
   ========================================================================== */

export default function ManualSafety() {
  const { t, dil } = useDil()
  const oebekler = useMemo(() => tumGuvenlikKurallari(), [])
  const toplam = oebekler.reduce((n, o) => n + o.maddeler.length, 0)

  return (
    <div className="app">
      <TopBar title={t('guvenlik.baslik')} back />

      <div className="screen wrap fade-in" style={{ paddingTop: 16 }}>
        <div className="kilavuz-guvenlik">
          <div className="kilavuz-guvenlik__ust">
            <IconAlert size={20} />
            <h2>{t('guvenlik.uyariBaslik')}</h2>
          </div>
          <p className="kilavuz-guvenlik__giris" style={{ marginBottom: 0 }}>
            {t('guvenlik.giris', { n: toplam })}
          </p>
        </div>

        {oebekler.map((o) => (
          <div key={o.kategori}>
            <div className="sectionhead">
              <h2>{t('guvenlik.k_' + o.kategori)}</h2>
              <span className="sectionhead__count">{o.maddeler.length}</span>
            </div>
            <ol className="guvenlik-liste">
              {o.maddeler.map((g) => (
                <li key={g.safety_id}>{yaz(g.text, dil)}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <TabBar />
    </div>
  )
}
