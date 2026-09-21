import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { dosyaAdi, indir, xlsxSayfalarYap, xlsxYap } from '../../excel'
import { islemYaz } from '../../veri'
import { Bos, hucreDegeri, Sayfalama, SiraliBaslik, useSiralama } from '../ortak'
import { RenkAnahtari, YatayBar, YiginSutun } from '../grafik'

/* ==========================================================================
   Rapor bölümünün görünümü

   Her bölüm (bkz. rapor/bolumler/) ekrana ne çizileceğini VERİ olarak
   döndürüyor; çizim tek yerde, burada:

     {
       olculer:   [{ ad, deger, fark, iyi: 'artis'|'azalis'|null, alt }],
       uyarilar:  [{ ad, alt, ton, goster }],
       grafikler: [{ tur: 'sutun'|'kucukCoklu'|'yatay', baslik, alt, genis, … }],
       tablolar:  [{ baslik, aciklama, basliklar, satirlar, toplamSatiri, sag }],
       notlar:    ['Nasıl hesaplanıyor' maddeleri],
     }

   NEDEN VERİ. Ekran ile Excel aynı şeyi göstermeli; tabloda ne varsa
   dosyaya o inmeli. Bölümler çizimi bilmediği için dokuz sekme aynı
   biçimde okunuyor, biri ötekinden ayrı bir düzen uydurmuyor.
   ========================================================================== */

const M = {
  dikkat: 'Dikkat İsteyenler',
  /* İKİ SATIR DÖNEME BAĞLI. Alt yazı "tarih süzgecinden bağımsız"
     diyordu, ama "cevapsız soru" ve "en çok servis isteyen model"
     satırları seçilen döneme bakıyor: süzgeç değişince sayı değişiyor,
     hatta satır tümden kayboluyordu. Satırların kendi metninde
     "(seçilen dönemde)" yazılı; kartın alt yazısı da artık tersini
     söylemiyor. */
  dikkatAlt: 'İşlem veya inceleme gerektiren kayıtlar. Cevapsız sorular ve en çok servis isteyen model seçilen döneme göre gösterilir; diğer satırlar tarih süzgecinden bağımsızdır.',
  temiz: 'Bu kartta gösterilecek uyarı yok. İşlerin durumunu ölçülerden ve tablolardan inceleyebilirsiniz.',
  goster: 'Göster →',
  oncekiDonem: 'önceki döneme göre',
  puan: (n) => `${n} puan`,
  excelOlcu: 'Ölçü',
  excelDeger: 'Değer',
  excelAciklama: 'Açıklama',
  /* Satır tıklamasıyla açılan liste raporun sayısıyla her zaman birebir
     tutmuyor (bağımsız denetimde ölçüldü: "Serviste 19" → liste 31);
     yönetici bunu listeye bakınca değil, burada öğrenmeli. */
  listeNotu:
    'Bir satıra, sütuna ya da "Göster" düğmesine tıkladığınızda açılan talep listesinde rapora en yakın süzgeç kullanılır. Talepler ekranı yalnız açılış tarihi, tür, durum ve sahipliğe göre süzer; rapordaki servis siparişi, iptal, iş veya onay tarihi ve bekleme yeri ayrımlarını aynı şekilde uygulamaz. Bu nedenle listedeki kayıt sayısı rapordaki sayıdan farklı olabilir.',
  puanNotu: 'Oran gösteren ölçülerde fark yüzde puan olarak verilir. Örneğin oran %8 iken %12 olursa fark "4 puan" olarak gösterilir; "%50" yazılmaz.',
  excel: "Excel'e Aktar",
  satir: 'satır',
  satirSayisi: (n) => `${n} satır`,
  satirAc: (ilk) => `${ilk} Satırının Listesini Aç`,
  bos: 'Bu dönemde gösterilecek kayıt yok. Başka bir dönem seçerek yeniden bakabilirsiniz.',
  nasil: 'Bu Sayılar Nasıl Hesaplanıyor?',
  toplam: 'Toplam',
}

const SAYFA = 15

export function RaporBolumu({ sonuc, personel }) {
  const { olculer = [], uyarilar, grafikler = [], tablolar = [], notlar = [] } = sonuc

  return (
    <>
      {uyarilar && <Uyarilar uyarilar={uyarilar} />}

      {olculer.length > 0 && <OlcuSeridi olculer={olculer} />}

      {grafikler.length > 0 && (
        <div className="pano pano--rapor">
          {tekKalanGenis(grafikler).map((g, i) => (
            <GrafikKart key={g.baslik || i} g={g} />
          ))}
        </div>
      )}

      {tablolar.map((t, i) => (
        <RaporTablosu key={t.baslik || i} t={t} personel={personel} />
      ))}

      {notlar.length > 0 && (
        <details className="rapor-not">
          <summary>{M.nasil}</summary>
          <ul>
            {notlar.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
            {olculer.some((o) => o.farkBirim === 'puan') && <li>{M.puanNotu}</li>}
            <li>{M.listeNotu}</li>
          </ul>
        </details>
      )}
    </>
  )
}

/* Bölümün bütün tabloları tek Excel dosyasında: ilk sekmede ölçüler,
   sonra her tablo kendi sekmesinde. */
export function bolumuExceleAktar(bolumAd, sonuc, personel) {
  const sayfalar = []
  if (sonuc.olculer?.length) {
    sayfalar.push({
      ad: bolumAd,
      satirlar: [
        [M.excelOlcu, M.excelDeger, M.oncekiDonem, M.excelAciklama],
        ...sonuc.olculer.map((o) => [
          o.ad,
          String(o.deger ?? '—'),
          o.fark === null || o.fark === undefined
            ? '—'
            : o.farkBirim === 'puan'
              ? `${o.fark > 0 ? '+' : ''}${M.puan(o.fark)}`
              : `${o.fark > 0 ? '+' : ''}%${o.fark}`,
          o.alt || '',
        ]),
      ],
    })
  }
  if (sonuc.uyarilar?.length) {
    sayfalar.push({
      ad: M.dikkat,
      satirlar: [[M.dikkat, M.excelAciklama], ...sonuc.uyarilar.map((u) => [u.ad, u.alt || ''])],
    })
  }
  for (const t of sonuc.tablolar || []) {
    sayfalar.push({
      ad: t.excelAd || t.baslik,
      satirlar: [t.basliklar, ...satirHucreleri(t.satirlar), ...(t.toplamSatiri ? [t.toplamSatiri] : [])],
    })
  }
  if (!sayfalar.length) return
  indir(xlsxSayfalarYap(sayfalar), dosyaAdi(bolumAd))
  islemYaz({ tur: 'excel', ozet: `Rapor dışa aktarıldı · ${bolumAd}`, personel })
}

/* Grafikler ikişerli dizilir. Arka arkaya gelen dar grafiklerden biri
   eşsiz kalırsa (tek dar grafik, ya da tek sayıda) sonuncusu tam
   genişliğe yayılıyor; yarım satırlık kart yanında boşlukla
   duruyordu. */
function tekKalanGenis(grafikler) {
  const sonuc = grafikler.map((g) => ({ ...g }))
  let grup = []
  const kapat = () => {
    if (grup.length % 2 === 1) grup[grup.length - 1].genis = true
    grup = []
  }
  for (const g of sonuc) {
    if (g.genis) kapat()
    else grup.push(g)
  }
  kapat()
  return sonuc
}

function satirHucreleri(satirlar) {
  return satirlar.map((s) => (Array.isArray(s) ? s : s.hucreler))
}

/* ------------------------------------------------------------ Uyarılar */

function Uyarilar({ uyarilar }) {
  return (
    <div className="kart" style={{ marginBottom: 16 }}>
      <div className="kart__tepe">
        <h2>{M.dikkat}</h2>
        <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>{M.dikkatAlt}</span>
      </div>
      <div className="kart__ic">
        {uyarilar.length === 0 ? (
          <p className="kucuk sonuk" style={{ margin: 0 }}>{M.temiz}</p>
        ) : (
          <div className="uyari-liste">
            {uyarilar.map((u) => (
              <div key={u.ad} className={'uyari-satir uyari-satir--' + u.ton}>
                <span className="uyari-satir__nokta" />
                <div style={{ flex: 1 }}>
                  <div className="uyari-satir__ad">{u.ad}</div>
                  {u.alt && <div className="kucuk sonuk">{u.alt}</div>}
                </div>
                {u.goster && (
                  <button className="dg dg--kucuk" onClick={u.goster}>
                    {M.goster}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------- Ölçü şeridi

   Fark oku her ölçüde; RENK yalnız iyi yönü bilinen ölçüde. "Gelen
   talep arttı" ne iyi ne kötü, gri kalıyor. "Kapanma süresi kısaldı"
   iyi, yeşil. Yön okla da yazıldığı için renk tek başına anlam
   taşımıyor. */
function OlcuSeridi({ olculer }) {
  return (
    <div className="olculer olculer--rapor">
      {olculer.map((o) => {
        const farkVar = o.fark !== null && o.fark !== undefined
        let ton = 'notr'
        if (farkVar && o.fark !== 0 && o.iyi) {
          const artti = o.fark > 0
          ton = (o.iyi === 'artis') === artti ? 'iyi' : 'kotu'
        }
        return (
          <div className="deger" key={o.ad}>
            <div className="deger__ad">{o.ad}</div>
            <div className="deger__v">{o.deger ?? '—'}</div>
            {farkVar && (
              <div className="deger__alt">
                <span className={'deger__fark deger__fark--' + ton}>
                  {o.fark > 0 ? '▲' : o.fark < 0 ? '▼' : '■'}{' '}
                  {o.farkBirim === 'puan' ? M.puan(Math.abs(o.fark)) : `%${Math.abs(o.fark)}`}
                </span>
                <span className="sonuk">{M.oncekiDonem}</span>
              </div>
            )}
            {o.alt && <div className="deger__aciklama">{o.alt}</div>}
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------ Grafikler */

function GrafikKart({ g }) {
  return (
    <div className={'kart' + (g.genis ? ' pano__genis' : '')}>
      <div className="kart__tepe">
        <h2 className={g.genis ? 'baslik--buyuk' : undefined}>{g.baslik}</h2>
        {g.sag && (
          <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>{g.sag}</span>
        )}
      </div>
      <div className="kart__ic">
        {g.alt && <p className="kucuk sonuk" style={{ margin: '0 0 12px' }}>{g.alt}</p>}
        <GrafikCiz g={g} />
      </div>
    </div>
  )
}

function GrafikCiz({ g }) {
  if (g.tur === 'sutun') {
    return (
      <YiginSutun
        kovalar={g.kovalar}
        seriler={g.seriler}
        yaz={g.yaz}
        onSec={g.onSec}
        yukseklik={g.yukseklik}
        toplamAdi={M.toplam}
      />
    )
  }

  /* Küçük çoklu: aynı ölçü her tür için ayrı, AYNI ÖLÇEKTE. Türler
     renkle değil başlıkla ayrılıyor (bkz. rapor/hesap.js → RENK). */
  if (g.tur === 'kucukCoklu') {
    const enYuksek = Math.max(
      1,
      ...g.parcalar.flatMap((p) =>
        p.kovalar.map((k) => p.seriler.reduce((t, s) => t + (k.degerler?.[s.anahtar] || 0), 0)),
      ),
    )
    return (
      <>
        {g.anahtar && <RenkAnahtari ogeler={g.anahtar} ust />}
        <div className="kucuk-coklu">
          {g.parcalar.map((p) => (
            <div key={p.baslik}>
              <div className="kucuk-coklu__bas">
                {p.baslik}
                {p.toplam !== undefined && <span>{p.toplam}</span>}
              </div>
              <YiginSutun
                kovalar={p.kovalar}
                seriler={p.seriler}
                yaz={g.yaz}
                onSec={p.onSec}
                enYuksek={enYuksek}
                yukseklik={g.yukseklik || 120}
                anahtarGizli={Boolean(g.anahtar)}
                toplamAdi={M.toplam}
              />
            </div>
          ))}
        </div>
      </>
    )
  }

  if (g.tur === 'yatay') {
    return (
      <>
        {g.anahtar && <RenkAnahtari ogeler={g.anahtar} ust />}
        <YatayBar satirlar={g.satirlar} renk={g.renk} />
      </>
    )
  }

  return null
}

/* ------------------------------------------------------- Rapor tablosu

   Satır iki biçimde gelebiliyor: düz hücre dizisi ya da
   { hucreler, git, vurgu }. `git` verilen satır tıklanınca ilgili
   ekranı süzgeçli açıyor; `vurgu` satırın solunda renkli şerit.

   Sıralama sütun sırasına göre ve hücrenin YAZISINDAN değer
   çıkarılarak (bkz. ortak.jsx → hucreDegeri): "1.850.000", "%12",
   "3,5 gün" sayı gibi sıralanıyor. Toplam satırı sıralamaya karışmıyor.

   Uzun tablo 15 satırlık sayfalara bölünüyor; Excel her zaman bütün
   satırları alıyor.

   Sütun genişlikleri sabit (bkz. aşağıda "Sabit sütun genişliği"). */
function RaporTablosu({ t, personel }) {
  const { siralama, cevir } = useSiralama(null, 'artan')
  const [sayfa, setSayfa] = useState(0)

  const satirlar = useMemo(() => t.satirlar.map((s) => (Array.isArray(s) ? { hucreler: s } : s)), [t.satirlar])
  const sag = useMemo(() => new Set(t.sag || []), [t.sag])
  const { sarRef, tabloRef, genislik } = useSabitSutunlar(t.basliklar, satirlar, t.toplamSatiri, sag)

  const sirali = useMemo(() => {
    if (siralama.alan === null || siralama.alan === undefined) return satirlar
    const i = Number(siralama.alan)
    const bos = (v) => v === null || v === undefined || v === ''
    return [...satirlar].sort((a, b) => {
      const x = hucreDegeri(a.hucreler[i])
      const y = hucreDegeri(b.hucreler[i])
      if (bos(x) && bos(y)) return 0
      if (bos(x)) return 1
      if (bos(y)) return -1
      const f =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y), 'tr', { numeric: true, sensitivity: 'base' })
      return siralama.yon === 'artan' ? f : -f
    })
  }, [satirlar, siralama])

  const sayfaSayisi = Math.max(1, Math.ceil(sirali.length / SAYFA))
  const gecerli = Math.min(sayfa, sayfaSayisi - 1)
  const gorunen = sirali.slice(gecerli * SAYFA, (gecerli + 1) * SAYFA)

  const sayfalama = {
    sayfa: gecerli,
    sayfaSayisi,
    toplam: sirali.length,
    boy: SAYFA,
    birim: M.satir,
    onDegis: setSayfa,
  }

  return (
    <div className="kart" style={{ marginBottom: 16 }}>
      <div className="kart__tepe">
        <h2>{t.baslik}</h2>
        <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>{M.satirSayisi(sirali.length)}</span>
        <button
          className="dg dg--kucuk"
          disabled={!satirlar.length}
          onClick={() => {
            /* Ekranda seçili sıralamayla: yönetici tabloyu tutara göre
               sıralayıp indirdiyse dosya da o sırada. */
            const govde = sirali.map((s) => s.hucreler)
            indir(
              xlsxYap(t.excelAd || t.baslik, [t.basliklar, ...govde, ...(t.toplamSatiri ? [t.toplamSatiri] : [])]),
              dosyaAdi(t.excelAd || t.baslik),
            )
            islemYaz({ tur: 'excel', ozet: `${t.baslik} dışa aktarıldı (${govde.length} kayıt)`, personel })
          }}
        >
          {M.excel}
        </button>
      </div>

      {t.aciklama && (
        <p className="kucuk sonuk" style={{ margin: 0, padding: '0 18px 10px' }}>{t.aciklama}</p>
      )}

      {satirlar.length === 0 ? (
        <Bos metin={t.bos || M.bos} />
      ) : (
        <>
          <Sayfalama {...sayfalama} onDegis={(n) => { setSayfa(n) }} />
          <div className="tablo-sar" ref={sarRef}>
            <table
              ref={tabloRef}
              className={'rapor-tablo' + (genislik ? ' rapor-tablo--sabit' : '')}
              style={genislik ? { width: genislik.toplam } : undefined}
            >
              {genislik && (
                <colgroup>
                  {genislik.sutunlar.map((w, j) => (
                    <col key={j} style={{ width: w }} />
                  ))}
                </colgroup>
              )}
              <thead>
                <tr>
                  {t.basliklar.map((b, i) => (
                    <SiraliBaslikSinifli
                      key={b + i}
                      ad={b}
                      alan={i}
                      siralama={siralama}
                      onSirala={(a) => { cevir(a); setSayfa(0) }}
                      sag={sag.has(i)}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {gorunen.map((s, i) => (
                  /* Tıklanabilir satır KLAVYEYLE DE AÇILIYOR (18 Eylül 2026
                     erişilebilirlik denetimi): sekme ile odaklanıyor, Enter
                     ve boşluk aynı listeyi açıyor, ekran okuyucuya düğme
                     diye tanıtılıyor. */
                  <tr
                    key={i}
                    className={
                      [s.git ? 'tiklanir' : '', s.vurgu ? 'rapor-satir--' + s.vurgu : ''].filter(Boolean).join(' ') ||
                      undefined
                    }
                    onClick={s.git || undefined}
                    role={s.git ? 'button' : undefined}
                    tabIndex={s.git ? 0 : undefined}
                    aria-label={s.git ? M.satirAc(s.hucreler[0]) : undefined}
                    onKeyDown={
                      s.git
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              s.git()
                            }
                          }
                        : undefined
                    }
                  >
                    {s.hucreler.map((h, j) => (
                      <td key={j} className={[j === 0 ? '' : 'kucuk', sag.has(j) ? 'sag' : ''].filter(Boolean).join(' ') || undefined}>
                        {h}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {t.toplamSatiri && (
                <tfoot>
                  <tr className="toplam-satir">
                    {t.toplamSatiri.map((h, j) => (
                      <td key={j} className={[j === 0 ? '' : 'kucuk', sag.has(j) ? 'sag' : ''].filter(Boolean).join(' ') || undefined}>
                        {h}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {sirali.length > SAYFA && <Sayfalama {...sayfalama} alt onDegis={(n) => setSayfa(n)} />}
        </>
      )}
    </div>
  )
}

/* Sağa yaslı sayı sütununun başlığı da sağa yaslanıyor. */
function SiraliBaslikSinifli({ sag, ...p }) {
  if (!sag) return <SiraliBaslik {...p} />
  const secili = p.siralama?.alan === p.alan
  const yon = secili ? p.siralama.yon : null
  return (
    <th className="sag">
      <button
        type="button"
        className={'th-sirala' + (secili ? ' th-sirala--on' : '')}
        onClick={() => p.onSirala(p.alan)}
      >
        {p.ad}
        <span className="th-sirala__ok" aria-hidden="true">
          {secili ? (yon === 'artan' ? '▲' : '▼') : '⇅'}
        </span>
      </button>
    </th>
  )
}

/* ------------------------------------------------ Sabit sütun genişliği

   SIRALAYINCA YA DA SAYFA DEĞİŞİNCE TABLO OYNAMIYOR (17 Eylül 2026,
   kullanıcının şikâyeti: "En çok istenen parçalar" tablosunda bir
   sütuna göre sıralayınca başlıklar ve tablonun kendisi genişleyip
   daralıyordu).

   KÖK NEDEN. Tablo otomatik yerleşimdeydi: tarayıcı sütun genişliğini
   o an EKRANDAKİ 15 satırın yazısına göre veriyordu. Sıralama ya da
   sayfa değişince başka 15 satır geliyor, en uzun parça adı ya da
   model listesi değişiyor ve bütün sütunlar kayıyordu.

   ŞİMDİ genişlik bir kez, tablonun BÜTÜN satırlarından (sayfadan ve
   sıralamadan bağımsız), toplam satırından ve başlıktan ölçülüyor;
   tablo sabit yerleşimle (<colgroup>, table-layout: fixed) çiziliyor.
   Genişliği yalnız verinin kendisi ve kartın genişliği değiştirir.

     · Sayı sütunu (`sag`) en uzun değeri sığacak kadar; kırılmıyor.
     · Başlık iki satıra iniyor: en dar iki satırlık bölünmesi sütunun
       istediği genişlik.
     · Yazı sütunu en uzun yazısına kadar, ama METIN_TAVAN'ı geçmeden
       açılıyor; daha uzun yazı alt satıra sarılıyor.
     · Kart genişse artan yer önce yazısı sarılan sütunlara (yazı tek
       satıra sığana kadar), kalanı bütün sütunlara oranla dağılıyor.
     · Kart darsa önce BAŞLIKLAR daralıyor (ikiden çok satıra inebilir,
       en uzun kelimesine kadar), satırların yazısı tek satırda kalıyor. Bu da
       yetmezse yazı sütunları en uzun kelimelerine kadar daralıyor —
       ama yalnız tablo böylece karta SIĞIYORSA. Sığmayacaksa yazıyı
       kırmak kaydırmayı kaldırmıyor, yalnız satırları uzatıyor; o
       durumda tablo kartın içinde yana kayıyor. (On iki sütunlu servis
       karnesi 1440 piksel ekranda böyle: servis adları tek satırda.)

   Ölçü tuval (canvas) üzerinde yazı tipiyle alınıyor. Yazı tipi, harf
   aralığı ve iç boşluk çizilmiş hücrelerin kendi CSS'inden okunuyor;
   backoffice.css değişirse ölçü de onunla değişir. */

const METIN_TAVAN = 280
const EN_DAR = 64
const PAY = 2
const OKLAR = ['⇅', '▲', '▼']

function yaziOlcer() {
  const ctx = document.createElement('canvas').getContext('2d')
  let sonFont = ''
  return (metin, b) => {
    if (!metin || !ctx) return 0
    if (b.font !== sonFont) {
      ctx.font = b.font
      sonFont = b.font
    }
    return ctx.measureText(metin).width + b.harfAraligi * [...metin].length
  }
}

function bicimOku(el) {
  const cs = getComputedStyle(el)
  return {
    font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
    harfAraligi: parseFloat(cs.letterSpacing) || 0,
    buyuk: cs.textTransform === 'uppercase',
    bosluk: (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0),
    aralik: parseFloat(cs.columnGap) || 0,
  }
}

function enUzunKelime(metin, olc, b) {
  return Math.max(0, ...metin.split(/\s+/).map((k) => olc(k, b)))
}

/* Başlığın iki satırda kapladığı en dar genişlik. */
function ikiSatirda(metin, olc, b) {
  const kelimeler = metin.split(/\s+/).filter(Boolean)
  if (kelimeler.length < 2) return olc(metin, b)
  let en = Infinity
  for (let i = 1; i < kelimeler.length; i++) {
    const ust = olc(kelimeler.slice(0, i).join(' '), b)
    const alt = olc(kelimeler.slice(i).join(' '), b)
    en = Math.min(en, Math.max(ust, alt))
  }
  return en
}

function sutunIhtiyaclari(tablo, basliklar, satirlar, toplamSatiri, sag) {
  const olc = yaziOlcer()
  const baslikSatiri = tablo.tHead?.rows[0]
  const govdeSatiri = tablo.tBodies[0]?.rows[0]
  const altSatir = tablo.tFoot?.rows[0]

  return basliklar.map((baslik, j) => {
    const th = baslikSatiri?.cells[j]
    const dugme = th?.querySelector('.th-sirala')
    const ok = th?.querySelector('.th-sirala__ok')
    const thBicim = th ? bicimOku(th) : { bosluk: 0 }
    const dugmeBicim = dugme ? bicimOku(dugme) : th ? bicimOku(th) : null
    const okBicim = ok ? bicimOku(ok) : null
    const okGenislik = okBicim ? Math.max(...OKLAR.map((o) => olc(o, okBicim))) + dugmeBicim.aralik : 0
    const yazi = dugmeBicim?.buyuk ? String(baslik).toLocaleUpperCase('tr-TR') : String(baslik)
    const baslikEk = dugmeBicim ? thBicim.bosluk + okGenislik + PAY : 0
    const baslikIki = dugmeBicim ? baslikEk + ikiSatirda(yazi, olc, dugmeBicim) : 0
    const baslikKelime = dugmeBicim ? baslikEk + enUzunKelime(yazi, olc, dugmeBicim) : 0

    const govde = govdeSatiri?.cells[j] ? bicimOku(govdeSatiri.cells[j]) : dugmeBicim
    const alt = altSatir?.cells[j] ? bicimOku(altSatir.cells[j]) : govde
    let uzun = 0
    let kelime = 0
    const bak = (hucre, b) => {
      const metin = hucre === null || hucre === undefined ? '' : String(hucre)
      uzun = Math.max(uzun, olc(metin, b))
      kelime = Math.max(kelime, enUzunKelime(metin, olc, b))
    }
    for (const s of satirlar) bak(s.hucreler[j], govde)
    if (toplamSatiri) bak(toplamSatiri[j], alt)

    const bosluk = (govde?.bosluk || 0) + PAY
    const tekSatirYazi = sag.has(j) ? uzun : Math.min(uzun, METIN_TAVAN)
    return {
      /* istenen: başlık iki satırda, yazı tek satırda (tavana kadar) */
      ihtiyac: Math.max(tekSatirYazi + bosluk, baslikIki, EN_DAR),
      /* başlık daralmış, yazı hâlâ tek satırda */
      baslikDar: Math.max(tekSatirYazi + bosluk, baslikKelime, EN_DAR),
      /* yazı da en uzun kelimesine kadar sarılmış (sayı sütunu kırılmaz) */
      enAz: Math.max((sag.has(j) ? uzun : Math.min(kelime, METIN_TAVAN)) + bosluk, baslikKelime, EN_DAR),
      /* bütün yazı tek satırda */
      dogal: Math.max(uzun + bosluk, baslikIki, EN_DAR),
      esnek: !sag.has(j),
    }
  })
}

/* Ölçülen ihtiyacı kartın genişliğine dağıtır (kurallar yukarıda).
   Tam piksele yuvarlanıyor: kesirli genişlik tarayıcıdan tarayıcıya
   farklı yuvarlanıp yarım piksel oynatabiliyor. */
function genislikDagit(sutunlar, alan) {
  const topla = (d) => d.reduce((a, b) => a + b, 0)
  const w = sutunlar.map((s) => s.ihtiyac)
  const ihtiyac = topla(w)

  if (alan > ihtiyac) {
    let fazla = alan - ihtiyac
    const eksik = sutunlar.map((s, j) => (s.esnek ? Math.max(0, s.dogal - w[j]) : 0))
    const eksikToplam = topla(eksik)
    if (eksikToplam > 0) {
      const k = Math.min(1, fazla / eksikToplam)
      eksik.forEach((e, j) => { w[j] += e * k })
      fazla -= eksikToplam * k
    }
    if (fazla > 0) {
      const t = topla(w)
      w.forEach((x, j) => { w[j] += (fazla * x) / t })
    }
  } else if (alan < ihtiyac) {
    /* Bir basamaktan ötekine oranla daralt; `hedef` basamağına inmek
       yetmiyorsa hepsini o basamakta bırak. */
    const daralt = (hedef) => {
      const pay = sutunlar.map((s, j) => Math.max(0, w[j] - s[hedef]))
      const payToplam = topla(pay)
      const k = payToplam > 0 ? Math.min(1, Math.max(0, topla(w) - alan) / payToplam) : 0
      pay.forEach((p, j) => { w[j] -= p * k })
    }
    daralt('baslikDar')
    if (topla(w) > alan && topla(sutunlar.map((s) => s.enAz)) <= alan) daralt('enAz')
  }

  const tam = w.map((x) => Math.floor(x))
  const artan = Math.floor(alan) - topla(tam)
  if (artan > 0) {
    /* Yuvarlamadan kalan birkaç piksel en geniş yazı sütununa. */
    let hedef = 0
    sutunlar.forEach((s, j) => {
      if (s.esnek && (!sutunlar[hedef].esnek || tam[j] > tam[hedef])) hedef = j
    })
    tam[hedef] += artan
  }
  return { sutunlar: tam, toplam: topla(tam) }
}

function useSabitSutunlar(basliklar, satirlar, toplamSatiri, sag) {
  const sarRef = useRef(null)
  const tabloRef = useRef(null)
  const [ihtiyac, setIhtiyac] = useState(null)
  const [alan, setAlan] = useState(null)
  const tabloVar = satirlar.length > 0

  /* Ölçü: veri değişince bir kez; yazı tipi sonradan yüklenirse bir
     kez daha. Boyamadan önce çalışıyor, tablo otomatik hâliyle hiç
     görünmüyor. */
  useLayoutEffect(() => {
    if (!tabloVar) return undefined
    let bitti = false
    const olc = () => {
      if (!bitti && tabloRef.current) {
        setIhtiyac(sutunIhtiyaclari(tabloRef.current, basliklar, satirlar, toplamSatiri, sag))
      }
    }
    olc()
    if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(olc)
    return () => {
      bitti = true
    }
  }, [basliklar, satirlar, toplamSatiri, sag, tabloVar])

  useLayoutEffect(() => {
    const sar = sarRef.current
    if (!tabloVar || !sar) return undefined
    setAlan(sar.clientWidth)
    if (typeof ResizeObserver === 'undefined') return undefined
    const izleyici = new ResizeObserver(() => setAlan(sar.clientWidth))
    izleyici.observe(sar)
    return () => izleyici.disconnect()
  }, [tabloVar])

  const genislik = useMemo(
    () => (tabloVar && ihtiyac && ihtiyac.length === basliklar.length && alan ? genislikDagit(ihtiyac, alan) : null),
    [tabloVar, ihtiyac, alan, basliklar.length],
  )

  return { sarRef, tabloRef, genislik }
}
