import { useRef, useState } from 'react'
import { useDil } from '../i18n'
import { IconPlus, IconMinus } from './Icons'

/* ==========================================================================
   Yakınınızdaki bayiler — yön ve mesafe haritası

   NEDEN SOKAK HARİTASI DEĞİL:

   Gerçek bir sokak haritası (Google Maps, Mapbox) her açılışta internetten
   harita karesi indirir. Bu uygulama tarlada, şebekenin zayıf olduğu
   yerde çalışmak üzere yazıldı; ayrıca harita servisleri anahtar ve
   kullanım başına ücret istiyor. Bu yüzden buradaki harita telefonun
   içinde çiziliyor: internet gerekmiyor, ücret yok, anahtar yok.

   Ne gösteriyor: ortada kullanıcı, çevresinde bayiler GERÇEK YÖNLERİNDE
   ve gerçek mesafe sırasında. Halkalar mesafe ölçeği.

   Ne göstermiyor: yollar. Yol tarifi için bayi kartındaki telefon var.

   YAKINLAŞTIRMA — RADAR MANTIĞI:

   Çizimi büyütmek işe yaramadı: büyütünce bayiler kutunun dışına çıkıyor,
   ortada yalnız kullanıcının noktası kalıyordu. Onun yerine MENZİL
   daralıyor — en dıştaki halkanın kaç kilometreyi gösterdiği küçülüyor.
   Yakınlaştıkça yakındaki bayiler tüm daireye yayılıyor, menzil dışında
   kalanlar düşüyor ve altta "2 bayi daha uzakta" yazılıyor. Radar ve
   balık bulucu ekranları böyle çalışır: hiçbir şey ekranın dışına
   taşmıyor, halka etiketleri de kendiliğinden güncelleniyor.

   Ayrıca üst üste binen noktalar çizilmeden önce birbirinden ayrılıyor
   (aşağıdaki `ayir`), yani varsayılan görünümde bile hepsi dokunulabilir
   durumda.
   ========================================================================== */

const BOY = 300
const MERKEZ = BOY / 2
const YARICAP = 118
/* En yakın bayi bile kullanıcı noktasının üstüne binmesin */
const EN_KUCUK = 40
/* Ölçek yazılarının durduğu yön (sol alt) */
const OLCEK_ACI = (218 * Math.PI) / 180

const EN_AZ_KAT = 1
const EN_COK_KAT = 64
const ADIM = 2
/* İki nokta merkezi arasında en az bu kadar boşluk kalsın (çizim birimi) */
const NOKTA_ARASI = 26
/* Menzil daralsa da en az bu kadar bayi ekranda kalsın */
const EN_AZ_BAYI = 2

/* Kuzeyden saat yönünde açı (derece). */
function yon(enlem1, boylam1, enlem2, boylam2) {
  const rad = (d) => (d * Math.PI) / 180
  const f1 = rad(enlem1)
  const f2 = rad(enlem2)
  const dl = rad(boylam2 - boylam1)
  const y = Math.sin(dl) * Math.cos(f2)
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl)
  return (Math.atan2(y, x) * 180) / Math.PI
}

/* Üst üste binen noktaları iterek ayırır.

   Birkaç tur dönüp birbirine çok yakın olan her çifti azar azar
   uzaklaştırıyor. İtme küçük tutuldu: bayi hâlâ doğru tarafta duruyor,
   yalnız komşusunun üstünde durmuyor. */
function ayir(noktalar) {
  const n = noktalar.map((p) => ({ ...p }))
  for (let tur = 0; tur < 24; tur++) {
    let oynadi = false
    for (let i = 0; i < n.length; i++) {
      for (let j = i + 1; j < n.length; j++) {
        const dx = n[j].x - n[i].x
        const dy = n[j].y - n[i].y
        const d = Math.hypot(dx, dy) || 0.01
        if (d >= NOKTA_ARASI) continue
        const it = (NOKTA_ARASI - d) / 2
        const bx = (dx / d) * it
        const by = (dy / d) * it
        n[i].x -= bx
        n[i].y -= by
        n[j].x += bx
        n[j].y += by
        oynadi = true
      }
    }
    if (!oynadi) break
  }
  return n
}

/* Halka etiketi: 1 km'nin altında metreye düşüyor */
function kmYaz(km) {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`
  return `${Math.round(km)} km`
}

export function BayiHarita({ konum, bayiler, secili, onSec }) {
  const { t } = useDil()
  const [kat, setKat] = useState(1)
  const hareket = useRef(null)

  const yakinlar = bayiler.slice(0, 8)
  if (!konum || yakinlar.length === 0) return null

  const enUzak = Math.max(1, ...yakinlar.map((b) => b.km || 0))

  /* Menzil: en dıştaki halkanın kaç kilometreyi gösterdiği. Yakınlaştıkça
     daralıyor ama en yakın birkaç bayi her zaman içinde kalıyor. */
  const zorunlu = yakinlar[Math.min(EN_AZ_BAYI, yakinlar.length) - 1]?.km || 0
  const menzil = Math.max(enUzak / kat, zorunlu, 0.5)

  const icerde = yakinlar.filter((b) => (b.km || 0) <= menzil)
  const disarda = yakinlar.length - icerde.length

  const olcek = (km) =>
    EN_KUCUK + ((YARICAP - EN_KUCUK) * Math.log1p(Math.max(km, 0))) / Math.log1p(menzil)

  const noktalar = ayir(
    icerde.map((b) => {
      const aci = (yon(konum.enlem, konum.boylam, b.enlem, b.boylam) * Math.PI) / 180
      const r = olcek(b.km)
      return { ...b, x: MERKEZ + r * Math.sin(aci), y: MERKEZ - r * Math.cos(aci) }
    })
  )

  const halkalar = [0.34, 0.67, 1].map((oran) => ({
    r: EN_KUCUK + (YARICAP - EN_KUCUK) * oran,
    km: Math.expm1(oran * Math.log1p(menzil)),
  }))

  /* Kat her zaman bir önceki değerin üzerinden hesaplanıyor: art arda
     iki kez basıldığında ikisi de aynı eski değeri okuyup tek adım
     ilerliyordu. */
  function katAyarla(hesapla) {
    setKat((onceki) => Math.min(EN_COK_KAT, Math.max(EN_AZ_KAT, hesapla(onceki))))
  }

  /* Menzil en yakın bayilerin mesafesine indiyse daha fazla
     yakınlaşmanın anlamı kalmıyor, düğme sönüyor. */
  const dahaYakinOlur = menzil > zorunlu * 1.02 && kat < EN_COK_KAT

  /* ------------------------------------------------- İki parmakla sıkma */

  function ikiParmakArasi(e) {
    const d = e.touches
    return Math.hypot(d[0].clientX - d[1].clientX, d[0].clientY - d[1].clientY)
  }

  function basla(e) {
    if (e.touches.length === 2) hareket.current = { mesafe: ikiParmakArasi(e), kat }
  }

  function surukle(e) {
    const h = hareket.current
    if (!h || e.touches.length !== 2) return
    katAyarla(() => h.kat * (ikiParmakArasi(e) / h.mesafe))
  }

  function bitir() {
    hareket.current = null
  }

  return (
    <div className="harita">
      <div className="harita__kap">
        <svg
          viewBox={`0 0 ${BOY} ${BOY}`}
          className="harita__cizim"
          role="img"
          aria-label={t('bayi.haritaAciklama')}
          onTouchStart={basla}
          onTouchMove={surukle}
          onTouchEnd={bitir}
          onTouchCancel={bitir}
        >
          {/* Mesafe halkaları */}
          {halkalar.map((h) => (
            <g key={h.r}>
              <circle cx={MERKEZ} cy={MERKEZ} r={h.r} className="harita__halka" />
              {/* Ölçek yazıları çapraz diziliyor: aynı yatay hatta
                  olunca iç halkaların yazıları üst üste biniyordu. */}
              <text
                x={MERKEZ + h.r * Math.sin(OLCEK_ACI)}
                y={MERKEZ - h.r * Math.cos(OLCEK_ACI) + 4}
                textAnchor="middle"
                className="harita__olcek"
              >
                {kmYaz(h.km)}
              </text>
            </g>
          ))}

          {/* Kuzey oku */}
          <path
            d={`M ${MERKEZ} ${MERKEZ - YARICAP - 20} l 5 11 h -10 z`}
            className="harita__kuzeyOk"
          />
          <text
            x={MERKEZ}
            y={MERKEZ - YARICAP - 26}
            textAnchor="middle"
            className="harita__kuzeyYazi"
          >
            {t('bayi.kuzey')}
          </text>

          {/* Kullanıcıdan bayiye ince çizgiler */}
          {noktalar.map((b) => (
            <line
              key={'c' + b.id}
              x1={MERKEZ}
              y1={MERKEZ}
              x2={b.x}
              y2={b.y}
              className={'harita__isin' + (secili === b.id ? ' harita__isin--on' : '')}
            />
          ))}

          {/* Bayiler */}
          {noktalar.map((b, i) => (
            <g
              key={b.id}
              className={'harita__bayi' + (secili === b.id ? ' harita__bayi--on' : '')}
              onClick={() => onSec?.(b.id)}
            >
              <circle cx={b.x} cy={b.y} r={13} className="harita__dokunma" />
              <circle cx={b.x} cy={b.y} r={i === 0 ? 7 : 5.5} className="harita__nokta" />
              {/* Ekranda az bayi kaldığında hepsinin adı yazılıyor;
                  kalabalıkken yalnız en yakın üçü. */}
              {(noktalar.length <= 4 || i < 3) && (
                <text x={b.x} y={b.y - 12} textAnchor="middle" className="harita__etiket">
                  {b.ilce}
                </text>
              )}
            </g>
          ))}

          {/* Kullanıcı */}
          <circle cx={MERKEZ} cy={MERKEZ} r={13} className="harita__benHale" />
          <circle cx={MERKEZ} cy={MERKEZ} r={6} className="harita__ben" />
        </svg>

        {/* Yakınlaştırma düğmeleri — parmakla sıkıştırma çalışsa da
            düğme olmadan bunun denenebileceği akla gelmiyor. */}
        <div className="harita__zoom">
          <button
            className="harita__zoomBtn"
            onClick={() => katAyarla((k) => k * ADIM)}
            disabled={!dahaYakinOlur}
            aria-label={t('bayi.yakinlastir')}
          >
            <IconPlus size={19} />
          </button>
          <button
            className="harita__zoomBtn"
            onClick={() => katAyarla((k) => k / ADIM)}
            disabled={kat <= EN_AZ_KAT}
            aria-label={t('bayi.uzaklastir')}
          >
            <IconMinus size={19} />
          </button>
        </div>
      </div>

      <p className="harita__not">
        {disarda > 0 ? t('bayi.haritaUzakta', { n: disarda }) : t('bayi.haritaNot')}
      </p>
    </div>
  )
}
