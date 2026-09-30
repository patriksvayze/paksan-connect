import { useMemo } from 'react'
import { TopBar, TabBar } from '../components/Chrome'
import { useDil } from '../i18n'
import { guvenlikObekleri, guvenlikMaddeSayisi } from '../marka/icerik/guvenlik'
import { IconAlert } from '../components/Icons'

/* ==========================================================================
   Güvenlik kuralları — beş kılavuzun tamamı, tek sayfada

   Neden ayrı bir sayfa: her kılavuzun güvenlik bölümü 51-58 madde ve
   kılavuzların maddeleri neredeyse birebir aynı. Makine sayfalarında
   yalnız "makineye el sürmeden önce" kuralları duruyor, tamamı burada.

   Liste ham kılavuz verisinden değil, derlenmiş hâlinden geliyor (bkz.
   marka/icerik/guvenlik.js): tekrarlar birleştirildi, dil düzeltildi,
   öbekler işin sırasına göre dizildi.

   YENİDEN DÜZENLENDİ (29 Eylül 2026, kullanıcının isteği). Kırk madde tek
   sütunda uzun bir liste; aradığı öbeği bulmak için sayfanın dibine kadar
   kaydırmak gerekiyordu. Başta altı öbeğe atlayan düğmeler var; maddeler
   öbek içinde numaralı, aralarında çizgi, yazı 16 piksel.
   ========================================================================== */

function obegeGit(id) {
  const el = document.getElementById('guvenlik-' + id)
  if (!el) return
  const azalt = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: azalt ? 'auto' : 'smooth', block: 'start' })
}

export default function ManualSafety() {
  const { t, dil } = useDil()
  const oebekler = useMemo(() => guvenlikObekleri(dil), [dil])
  const toplam = guvenlikMaddeSayisi()

  return (
    <div className="app">
      <TopBar title={t('guvenlik.baslik')} back />

      <div className="screen wrap fade-in guvenlik">
        <section className="guvenlik-kapak">
          <h2 className="guvenlik-kapak__baslik">
            <IconAlert size={24} /> {t('guvenlik.uyariBaslik')}
          </h2>
          <p>{t('guvenlik.giris', { n: toplam })}</p>
        </section>

        <nav className="kilavuz-icindekiler guvenlik-icindekiler" aria-label={t('kilavuz.icindekiler')}>
          {oebekler.map((o) => (
            <button key={o.id} type="button" className="kilavuz-icindekiler__dugme" onClick={() => obegeGit(o.id)}>
              {t('guvenlik.k_' + o.id)}
            </button>
          ))}
        </nav>

        {oebekler.map((o) => (
          <section key={o.id} id={'guvenlik-' + o.id} className="guvenlik-obek" aria-labelledby={'guvenlik-b-' + o.id}>
            <h2 id={'guvenlik-b-' + o.id} className="guvenlik-obek__baslik">
              {t('guvenlik.k_' + o.id)}
              <span className="sectionhead__count">{o.maddeler.length}</span>
            </h2>
            <ol className="guvenlik-maddeler">
              {o.maddeler.map((madde) => (
                <li key={madde}>{madde}</li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <TabBar />
    </div>
  )
}
