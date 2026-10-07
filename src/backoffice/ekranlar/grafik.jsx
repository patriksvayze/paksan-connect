import { useLayoutEffect, useRef, useState } from 'react'

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

/* `degerYazi` verilirse sağdaki sayı onunla yazılıyor (tutar, oran);
   çubuğun boyu yine `deger`e göre. `onSec` verilen satırın adı düğme
   oluyor ve ilgili listeyi açıyor. */
export function YatayBar({ satirlar, renk = 'var(--mavi)' }) {
  if (!satirlar.length) return <BosGrafik />
  const enYuksek = Math.max(1, ...satirlar.map((s) => s.deger))

  return (
    <div className="ybar">
      {satirlar.map((s, i) => (
        <div key={i} className="ybar__satir">
          {s.onSec ? (
            <button type="button" className="ybar__ad ybar__ad--dg" title={s.ad} onClick={s.onSec}>
              {s.ad}
            </button>
          ) : (
            <span className="ybar__ad" title={s.ad}>{s.ad}</span>
          )}
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
          <span className="ybar__deger">{s.degerYazi ?? s.deger}</span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------ Yığılmış sütun

   Zaman içinde bir ölçü (gelen talep, hak ediş tutarı), en çok üç
   seriye bölünmüş. Raporlar ekranının ana grafiği.

   ÇİZİM KURALLARI (dataviz yönergesi):
     · Çubuk en çok 24 piksel kalın; tepesi 4 piksel yuvarlak, tabanı düz.
     · Yığının dilimleri arasında 2 piksellik yüzey boşluğu — dilimleri
       çizgi değil boşluk ayırıyor.
     · Her çubuğa sayı yazılmıyor: yalnız en yüksek ve son çubuğun
       toplamı. Geri kalanı üstüne gelinince açılan kutuda ve tabloda.
     · İki ya da daha çok seride renk anahtarı hep var; tek seride
       yok, başlık zaten ne çizildiğini söylüyor.
     · Üstüne gelinen sütunun bütün hücresi hedef: ince bir çubuğu
       fareyle yakalamak zorunda kalınmıyor.

   `enYuksek` dışarıdan verilebiliyor: yan yana duran küçük grafikler
   (türlere göre) aynı ölçeği paylaşmazsa 3 talep ile 30 talep aynı
   boyda görünür. */

/**
 * @param {Array<{etiket, tamEtiket, degerler: Object}>} kovalar
 * @param {Array<{anahtar, ad, renk}>} seriler alttan üste sırası
 * @param {(sayi:number)=>string} [yaz] değerin yazılışı (tutar vb.)
 * @param {(kova)=>void} [onSec] sütuna tıklanınca
 */
export function YiginSutun({ kovalar, seriler, yaz = (x) => String(x), onSec, enYuksek, yukseklik = 180, anahtarGizli = false, toplamAdi = '' }) {
  const [aktif, setAktif] = useState(null)
  /* HER SÜTUNUN ETİKETİ YAZILIYOR (6 Ekim 2026, kullanıcının onayı:
     "hiçbir çubuk etiketsiz kalmasın"). Önce N'de bir yazılıyordu; boş
     kalan sütunun hangi aralık olduğu anlaşılmıyordu. Ekseni ölçüp sütun
     başına düşen genişliğe göre yazılış seçiliyor: genişse düz (gerekirse
     iki satır), darsa dik (yan yana duran küçük grafikler). */
  const eksenRef = useRef(null)
  const [dik, setDik] = useState(false)
  useLayoutEffect(() => {
    const el = eksenRef.current
    if (!el || !kovalar.length) return undefined
    const olc = () => setDik(el.clientWidth / kovalar.length < 34)
    olc()
    const izle = new ResizeObserver(olc)
    izle.observe(el)
    return () => izle.disconnect()
  }, [kovalar.length])
  const toplamlar = kovalar.map((k) => seriler.reduce((t, s) => t + (k.degerler?.[s.anahtar] || 0), 0))
  const hepsi = toplamlar.reduce((a, b) => a + b, 0)
  if (!kovalar.length || !hepsi) return <BosGrafik />

  const tepe = Math.max(1, enYuksek ?? Math.max(...toplamlar))
  const basamak = temizBasamak(tepe)
  const cizgiler = []
  for (let v = basamak; v <= tepe + 1e-9; v += basamak) cizgiler.push(v)
  const olcekTepe = Math.max(tepe, cizgiler[cizgiler.length - 1] || tepe)

  const enYuksekSira = toplamlar.indexOf(Math.max(...toplamlar))
  const sonSira = toplamlar.length - 1

  return (
    <div className="ysutun" style={{ '--ysutun-h': `${yukseklik}px` }}>
      {seriler.length > 1 && !anahtarGizli && (
        <RenkAnahtari ogeler={seriler.map((s) => ({ ad: s.ad, renk: s.renk }))} ust />
      )}
      <div className="ysutun__govde">
        <div className="ysutun__olcek" aria-hidden="true">
          {[...cizgiler].reverse().map((v) => (
            <span key={v} style={{ bottom: `${(v / olcekTepe) * 100}%` }}>{kisaSayi(v)}</span>
          ))}
          <span style={{ bottom: 0 }}>0</span>
        </div>

        <div
          className="ysutun__alan"
          style={{ '--sutun-adet': kovalar.length }}
          role="img"
          aria-label={kovalar.map((k, i) => `${k.tamEtiket || k.etiket}: ${yaz(toplamlar[i])}`).join(', ')}
          onMouseLeave={() => setAktif(null)}
        >
          {cizgiler.map((v) => (
            <span key={v} className="ysutun__cizgi" style={{ bottom: `${(v / olcekTepe) * 100}%` }} />
          ))}

          {kovalar.map((k, i) => {
            const toplam = toplamlar[i]
            const tiklanir = Boolean(onSec) && toplam > 0
            const etiketli = toplam > 0 && (i === enYuksekSira || i === sonSira)
            return (
              <div
                key={i}
                className={
                  'ysutun__hucre' +
                  (tiklanir ? ' ysutun__hucre--tiklanir' : '') +
                  (aktif === i ? ' ysutun__hucre--aktif' : '')
                }
                onMouseEnter={() => setAktif(i)}
                onClick={tiklanir ? () => onSec(k) : undefined}
              >
                <div className="ysutun__yigin" style={{ height: `${(toplam / olcekTepe) * 100}%` }}>
                  {etiketli && <span className="ysutun__sayi">{yaz(toplam)}</span>}
                  {seriler.map((s) => {
                    const d = k.degerler?.[s.anahtar] || 0
                    if (!d) return null
                    return (
                      <span
                        key={s.anahtar}
                        className="ysutun__dilim"
                        style={{ flexGrow: d, background: s.renk }}
                      />
                    )
                  })}
                </div>

                {aktif === i && (
                  <div className={'ysutun__kutu' + (i > kovalar.length / 2 ? ' ysutun__kutu--sol' : '')}>
                    <div className="ysutun__kutu-bas">{k.tamEtiket || k.etiket}</div>
                    {seriler.length > 1 &&
                      seriler.map((s) => (
                        <div key={s.anahtar} className="ysutun__kutu-satir">
                          <span className="halka__nokta" style={{ background: s.renk }} />
                          <span>{s.ad}</span>
                          <b>{yaz(k.degerler?.[s.anahtar] || 0)}</b>
                        </div>
                      ))}
                    <div className="ysutun__kutu-satir ysutun__kutu-toplam">
                      <span>{seriler.length > 1 ? toplamAdi : seriler[0]?.ad}</span>
                      <b>{yaz(toplam)}</b>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div
        ref={eksenRef}
        className={'ysutun__eksen' + (dik ? ' ysutun__eksen--dik' : '')}
        style={{ '--sutun-adet': kovalar.length }}
        aria-hidden="true"
      >
        {kovalar.map((k, i) => (
          <span key={i} className="ysutun__etiket">
            {k.etiket}
          </span>
        ))}
      </div>
    </div>
  )
}

/* Ölçek çizgileri yuvarlak sayılara oturuyor: 0 · 5 · 10 · 15,
   0 · 20.000 · 40.000. "0 · 7 · 14 · 21" gözle okunmuyor. */
function temizBasamak(tepe) {
  const kaba = tepe / 4
  const us = Math.pow(10, Math.floor(Math.log10(Math.max(kaba, 1))))
  const oran = kaba / us
  const adim = oran <= 1 ? 1 : oran <= 2 ? 2 : oran <= 5 ? 5 : 10
  return Math.max(1, adim * us)
}

/* Eksen yazısı dar: 12.500 yerine 12,5 B; 1.250.000 yerine 1,25 Mn. */
function kisaSayi(v) {
  if (v >= 1e6) return `${String(+(v / 1e6).toFixed(2)).replace('.', ',')} Mn`
  if (v >= 1e4) return `${String(+(v / 1e3).toFixed(1)).replace('.', ',')} B`
  return v.toLocaleString('tr-TR')
}

/* Grafiğin renk açıklaması. `ust` verilirse grafiğin üstünde duruyor
   (raporlarda anahtar grafiği okumadan önce görünüyor). */
export function RenkAnahtari({ ogeler, ust = false }) {
  return (
    <div className={'yigin__liste' + (ust ? ' yigin__liste--ust' : '')}>
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
