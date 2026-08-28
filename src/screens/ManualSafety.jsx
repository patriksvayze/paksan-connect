import { useMemo } from 'react'
import { TopBar, TabBar } from '../components/Chrome'
import { useDil } from '../i18n'
import { guvenlikObekleri, guvenlikMaddeSayisi } from '../data/guvenlik'
import { IconAlert } from '../components/Icons'

/* ==========================================================================
   Güvenlik kuralları — beş kılavuzun tamamı, tek sayfada

   Neden ayrı bir sayfa: her kılavuzun güvenlik bölümü 51-58 madde ve
   kılavuzların maddeleri neredeyse birebir aynı. Her makinenin kendi
   sayfasında aynı listeyi tekrar etmenin anlamı yoktu; makine
   sayfalarında yalnız "makineye el sürmeden önce" kuralları duruyor,
   tamamı burada.

   Liste artık ham kılavuz verisinden değil, derlenmiş halinden
   geliyor (bkz. src/data/guvenlik.js): tekrarlar birleştirildi, dil
   düzeltildi, öbekler işin sırasına göre dizildi.
   ========================================================================== */

export default function ManualSafety() {
  const { t, dil } = useDil()
  const oebekler = useMemo(() => guvenlikObekleri(dil), [dil])
  const toplam = guvenlikMaddeSayisi()

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
          <div key={o.id}>
            <div className="sectionhead">
              <h2>{t('guvenlik.k_' + o.id)}</h2>
              <span className="sectionhead__count">{o.maddeler.length}</span>
            </div>
            <ol className="guvenlik-liste">
              {o.maddeler.map((madde) => (
                <li key={madde}>{madde}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <TabBar />
    </div>
  )
}
