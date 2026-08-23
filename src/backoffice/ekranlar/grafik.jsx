/* ==========================================================================
   Grafikler

   Dışarıdan grafik kütüphanesi kullanılmıyor — backoffice PAKSAN'ın kendi
   sunucusundan gelecek ve dışarıya bağlanmayacak. Grafiklerin hepsi
   düz SVG.

   Hepsi `viewBox` ile çiziliyor ve genişliği %100; ekran daraldığında
   kendiliğinden küçülüyorlar.

   Renkler backoffice değişkenlerinden geliyor (`--mavi`, `--yesil` …) ki
   marka tek yerden yönetilsin.
   ========================================================================== */

/* ------------------------------------------------------------- Sütunlar

   Günlük talep sayısı. Önceki hâlinde çubukların hangi güne ve kaça
   denk geldiği belli olmuyordu; artık her çubuğun üstünde sayısı,
   altında günü yazıyor. Gün sayısı arttıkça etiketler seyrekleşiyor
   (90 günde her günü yazmak okunmaz oluyor).                          */

/**
 * @param {Function} onSec çubuğa tıklanınca çağrılıyor (veri öğesiyle)
 */
export function SutunGrafik({ veri, renk = 'var(--mavi)', onSec }) {
  if (!veri.length) return <BosGrafik />

  const enYuksek = Math.max(1, ...veri.map((d) => d.deger))
  /* Etiket her N günde bir yazılıyor; 14 günde hepsi, 90 günde 7'de bir */
  const atla = Math.ceil(veri.length / 14)

  /* Kılavuz çizgilerinin değerleri — göz yüksekliği kıyaslasın */
  const basamak = enYuksek <= 4 ? 1 : Math.ceil(enYuksek / 4)
  const cizgiler = []
  for (let v = basamak; v <= enYuksek; v += basamak) cizgiler.push(v)

  return (
    <div className="sutun">
      <div className="sutun__govde">
        <div className="sutun__olcek">
          {[...cizgiler].reverse().map((v) => (
            <span key={v}>{v}</span>
          ))}
          <span>0</span>
        </div>

        <div className="sutun__alan" style={{ '--sutun-adet': veri.length }}>
          {cizgiler.map((v) => (
            <span
              key={v}
              className="sutun__cizgi"
              style={{ bottom: `${(v / enYuksek) * 100}%` }}
            />
          ))}

          {veri.map((d, i) => {
            /* Dolu çubuk tıklanabilir: o günün talepleri açılıyor */
            const tiklanir = Boolean(onSec) && d.deger > 0
            return (
              <div
                className={'sutun__hucre' + (tiklanir ? ' sutun__hucre--tiklanir' : '')}
                key={i}
                title={
                  `${d.tamEtiket || d.etiket}: ${d.deger}` +
                  (tiklanir ? ' · tıklayın' : '')
                }
                onClick={tiklanir ? () => onSec(d) : undefined}
              >
                <span
                  className="sutun__cubuk"
                  style={{
                    height: `${(d.deger / enYuksek) * 100}%`,
                    background: renk,
                    opacity: d.deger ? 1 : 0.16,
                  }}
                >
                  {/* Sayı çubuğun tepesine yapışık duruyor */}
                  {d.deger > 0 && <span className="sutun__sayi">{d.deger}</span>}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="sutun__eksen" style={{ '--sutun-adet': veri.length }}>
        {veri.map((d, i) => (
          <span key={i} className="sutun__etiket">
            {i % atla === 0 || i === veri.length - 1 ? d.etiket : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- Halka

   Tür dağılımı gibi "bütünün parçaları" için. Ortada toplam yazıyor;
   sayının kendisi de lazım oluyor. */

export function Halka({ dilimler, toplamAdi = 'Toplam' }) {
  const toplam = dilimler.reduce((t, d) => t + d.deger, 0)
  if (!toplam) return <BosGrafik />

  const r = 15.9155 /* çevresi 100 olan yarıçap — yüzde hesabı kolaylaşıyor */
  let baslangic = 0

  return (
    <div className="halka">
      <svg viewBox="0 0 42 42" className="halka__cizim" role="img">
        <circle cx="21" cy="21" r={r} fill="none" stroke="var(--yuzey-2)" strokeWidth="5" />
        {dilimler.map((d, i) => {
          const yuzde = (d.deger / toplam) * 100
          const dilim = (
            <circle
              key={i}
              cx="21"
              cy="21"
              r={r}
              fill="none"
              stroke={d.renk}
              strokeWidth="5"
              strokeDasharray={`${yuzde} ${100 - yuzde}`}
              strokeDashoffset={25 - baslangic}
            >
              <title>{`${d.ad}: ${d.deger}`}</title>
            </circle>
          )
          baslangic += yuzde
          return dilim
        })}
        <text x="21" y="20.4" className="halka__sayi">{toplam}</text>
        <text x="21" y="24.6" className="halka__yazi">{toplamAdi}</text>
      </svg>

      <div className="halka__liste">
        {dilimler.map((d, i) => (
          <div key={i} className="halka__satir">
            <span className="halka__nokta" style={{ background: d.renk }} />
            <span className="halka__ad">{d.ad}</span>
            <span className="halka__deger">{d.deger}</span>
            <span className="halka__yuzde">%{Math.round((d.deger / toplam) * 100)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- Yatay barlar

   Sıralama gösterirken (en çok talep gelen il, en çok arızalanan model)
   yatay bar dikeyden iyi okunuyor: ad soldan yazılıyor, kesilmiyor.

   Satır `parcalar` taşıyorsa bar türlere bölünüyor — "bu ilden 12 talep
   geldi" yerine "8 servis, 3 parça, 1 satış" okunuyor. Tek grafik hem
   sıralamayı hem dağılımı gösteriyor.                                 */

export function YatayBar({ satirlar, renk = 'var(--mavi)' }) {
  if (!satirlar.length) return <BosGrafik />
  const enYuksek = Math.max(1, ...satirlar.map((s) => s.deger))

  return (
    <div className="ybar">
      {satirlar.map((s, i) => (
        <div key={i} className="ybar__satir">
          <span className="ybar__ad" title={s.ad}>{s.ad}</span>
          <span className="ybar__yol">
            <span className="ybar__dolu" style={{ width: `${(s.deger / enYuksek) * 100}%` }}>
              {s.parcalar
                ? s.parcalar
                    .filter((p) => p.deger > 0)
                    .map((p, j) => (
                      <span
                        key={j}
                        className="ybar__parca"
                        style={{ width: `${(p.deger / s.deger) * 100}%`, background: p.renk }}
                        title={`${s.ad} · ${p.ad}: ${p.deger}`}
                      />
                    ))
                : <span className="ybar__parca" style={{ width: '100%', background: s.renk || renk }} />}
            </span>
          </span>
          <span className="ybar__deger">{s.deger}</span>
        </div>
      ))}
    </div>
  )
}

/* Grafiğin altındaki renk açıklaması */
export function RenkAnahtari({ ogeler }) {
  return (
    <div className="yigin__liste">
      {ogeler.map((o, i) => (
        <span key={i} className="yigin__etiket">
          <span className="halka__nokta" style={{ background: o.renk }} />
          {o.ad}
        </span>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------ Yığın bar

   Bekleyen işin yaşı gibi tek satırda toplanan dağılımlar için. */

export function YiginBar({ dilimler }) {
  const toplam = dilimler.reduce((t, d) => t + d.deger, 0)
  if (!toplam) return <BosGrafik />

  return (
    <div className="ybar">
      <div className="yigin">
        {dilimler
          .filter((d) => d.deger > 0)
          .map((d, i) => (
            <span
              key={i}
              className="yigin__parca"
              style={{ width: `${(d.deger / toplam) * 100}%`, background: d.renk }}
              title={`${d.ad}: ${d.deger}`}
            />
          ))}
      </div>
      <div className="yigin__liste">
        {dilimler.map((d, i) => (
          <span key={i} className="yigin__etiket">
            <span className="halka__nokta" style={{ background: d.renk }} />
            {d.ad} · <b>{d.deger}</b>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ KPI

   Tek sayı ve altında geçen haftaya göre değişim. Yön oku yeşil/kırmızı
   değil: "talep sayısı arttı" iyi mi kötü mü ekibe göre değişiyor. */

export function Deger({ ad, deger, alt, degisim }) {
  return (
    <div className="deger">
      <div className="deger__ad">{ad}</div>
      <div className="deger__v">{deger}</div>
      {(alt || degisim !== undefined) && (
        <div className="deger__alt">
          {degisim !== undefined && (
            <span className="deger__fark">
              {degisim > 0 ? '▲' : degisim < 0 ? '▼' : '■'} %{Math.abs(degisim)}
            </span>
          )}
          {alt}
        </div>
      )}
    </div>
  )
}

function BosGrafik() {
  return <div className="grafik__bos">Gösterilecek veri yok.</div>
}
