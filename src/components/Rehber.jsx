import { getProduct, urunDilde } from '../marka'

/* ==========================================================================
   Bakım rehberi ekranlarının ortak iki parçası (29 Eylül 2026)

   Rehber listesi (screens/Guides.jsx) ve rehberin kendisi
   (screens/Guide.jsx) aynı makine seçimini ve aynı ilerleme çubuğunu
   gösteriyor. İki kopya zamanla ayrışırdı: listede "5 / 22", rehberde
   "5 / 18" yazan bir ekran güven kaybettirir. Sayının kendisi de tek
   yerden (lib/rehberIsaret.js → rehberIlerlemesi).
   ========================================================================== */

/**
 * Hangi makine için — yatay kayan haplar. İşaretler makine başına
 * tutuluyor (Hammer'ın günlük bakımı i-Pak'ınkini yapmış saymaz), bu
 * yüzden seçim ekranın üstünde ve her zaman görünür.
 */
export function RehberMakineSecici({ machines, secili, onSec, baslik, dil }) {
  return (
    <div className="bakim-makineler">
      <h2 className="bakim-makineler__baslik">{baslik}</h2>
      <div className="pill-list" role="radiogroup" aria-label={baslik}>
        {machines.map((m) => {
          const p = urunDilde(getProduct(m.productId), dil)
          if (!p) return null
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={secili === m.id}
              className={'pill' + (secili === m.id ? ' pill--on' : '')}
              onClick={() => onSec(m.id)}
            >
              {m.nickname || p.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* "10–15 dakika", "2–3 hafta": aralık satır sonunda bölünmesin. Tire
   "10–" satırın sonunda, "15 dakika" alt satırda kalıyordu (390 piksel,
   rehber listesinin büyük kartı). İki yanına görünmez "bölme" işareti
   (U+2060) konuyor; metnin kendisi değişmiyor. */
export function araligiBolme(metin) {
  return String(metin || '').replace(/(\d)\s*([–-])\s*(\d)/g, '$1⁠$2⁠$3')
}

/** Kaç adım yapıldı: çubuk ve yazı. Çubuk süs değil, sayının kendisi. */
export function RehberIlerlemesi({ yapilan, toplam, yazi, kucuk }) {
  const oran = toplam > 0 ? yapilan / toplam : 0
  return (
    <div className={'bakim-ilerleme' + (kucuk ? ' bakim-ilerleme--kucuk' : '')}>
      <div
        className="bakim-ilerleme__cubuk"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={toplam}
        aria-valuenow={yapilan}
        aria-label={yazi}
      >
        <span style={{ width: `${oran * 100}%` }} />
      </div>
      <span className="bakim-ilerleme__yazi">{yazi}</span>
    </div>
  )
}
