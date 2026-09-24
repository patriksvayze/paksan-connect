import { useMemo, useState } from 'react'
import { genelTarifeyiKaydet, hizmetTarifesiGetir, izinli, parcaIskontosuGetir } from '../veri'
import {
  KALEMLER, makineFarklari, ozelUcretliServisler, tarifeCoz, tarifeleriDuzenle, ucretOku,
} from '../../lib/servisTarifesi'
import { iskontoCoz, yuzdeYap } from '../../lib/servisFiyat'
import { PARA_BIRIMI, PRODUCTS, paraYaz, servisleriGetir } from '../../marka'
import { AcilirTepe, tarihYaz } from './ortak'

/* ==========================================================================
   Servis hizmet ücreti — backoffice (23 Eylül 2026)

   KULLANICININ İSTEĞİ: "Servislerin hizmet ücretlendirmelerini, yani KM
   başına ücret ve saat başına ücret bilgilerinin (makine bazında da
   ayarlanabilse iyi olur) BackOffice üzerinden ilgili personel
   tarafından değiştirilebileceği bir alan yaratmalıyız. Bu alan
   Servisler sayfasında olabilir. Sayfa içinde tüm servislere ortak
   atanacak km ve saat başı ücret tanımlaması … Servis bazında da,
   servisin detayına girildiğinde ona özel KM ve saat ücretlendirilmesi
   girilebilir. Servisler arasında farklı ücretlendirmeler mevcutken, tüm
   servisler genelinde km ve saatlik ücret ataması yapılacağı zaman, bir
   uyarı ekranı belirmeli…"

   ÜÇ PARÇA

     HizmetUcretleriKarti  Servisler sayfasının üstünde: bütün servislere
                           geçen ücret ve makineye göre farklı olanlar.
     ServisUcretiAlani     servis formunun içinde: o servise özel ücret.
     OzelUcretUyarisi      genel ücret değişirken özel ücretli servisler
                           varsa çıkan pencere.

   Hesabın kendisi lib/servisTarifesi.js'te (katmanlar ve sırası orada
   yazılı); depo ve bildirim backoffice/veri.js'te.

   YETKİ AYRI: `servisUcreti`. Servis kaydını düzelten satış personeli
   ücreti değiştiremiyor; yetkisi olmayan kartı okuyor, düğme görmüyor.
   ========================================================================== */

const METIN = {
  baslik: 'Hizmet Ücretleri',
  aciklama:
    'Garanti kapsamındaki işlerde servise ödenen ücretler. Servis, gittiği yolu ve harcadığı süreyi yazar; hak edişi bu ücretlerle hesaplanır.',
  gecmisNotu:
    'Yeni ücretler bundan sonra gönderilen servis kayıtlarına uygulanır. Daha önce gönderilen kayıtların ücretleri değişmez.',
  yol: 'Yol',
  yolBirim: 'kilometre başına',
  iscilik: 'İşçilik',
  iscilikBirim: 'saat başına',
  makineBaslik: 'Makine modeline göre farklı ücretler',
  makineYok: 'Bütün makine modellerinde aynı ücret geçerli.',
  makineAciklama:
    'Bazı makine modellerinde işler daha uzun sürebilir veya daha zor olabilir. Eklediğiniz model için doldurduğunuz alanlardaki ücretler geçerli olur.',
  makineEkle: 'Makine Ekle',
  makineSec: 'Makine modeli seçin',
  kaldir: 'Kaldır',
  ozelBaslik: (n) => `Özel ücreti olan ${n} servis`,
  ozelYok: 'Bütün servisler genel ücretleri kullanıyor.',
  ozelNotu: 'Servise özel ücret, servisin Düzenle penceresinden girilir.',
  guncelleme: (tarih, kisi) => `Son değişiklik: ${tarih}${kisi ? ' · ' + kisi : ''}`,
  ozetGenel: (yol, iscilik) => `Genel: ${yol}/km · ${iscilik}/saat`,
  ozetOzel: (n) => `${n} serviste özel ücret`,
  duzenle: 'Ücretleri Düzenle',
  kaydet: 'Kaydet',
  vazgec: 'Vazgeç',
  kaydedildi: (n) => (n ? `Ücretler kaydedildi · ${n} servise bildirim gönderildi` : 'Ücretler kaydedildi'),
  degisiklikYok: 'Değişiklik yok.',
  bosKutu: 'Boş bırakılırsa genel ücret uygulanır',
  genelYerTutucu: (v) => `Genel: ${v}`,
  // Servis formu
  servisBaslik: 'Hizmet Ücreti',
  servisAciklama:
    'Bu servise genel ücretten farklı bir ücret ödenecekse yazın. Boş bıraktığınız alanlarda genel ücret uygulanır.',
  servisOzeti: 'Bu servisin ücreti',
  kaynakGenel: 'genel',
  kaynakOzel: 'özel',
  kaynakMakine: 'makine modeline göre',
  servisMakineAciklama:
    'Bu servise bazı makine modelleri için farklı ücret ödenecekse ekleyin.',
  servisOnceligi:
    'Bu servise yol veya işçilik için özel ücret girilirse, o kalemde genel tarifedeki model ücretleri uygulanmaz. Gerekirse bu servise model bazında da özel ücret ekleyin.',
  salttOkunur: 'Ücreti değiştirme yetkiniz yok.',
  iskontoSatiri: (oran, kaynak) =>
    `Yedek parça iskontosu: %${oran} (${kaynak}). Yedek Parça Kataloğu ekranından değiştirilir.`,
  // Uyarı penceresi
  uyariBaslik: 'Özel ücreti olan servisler var',
  uyariMetin: (n, kalemler) =>
    `${n} serviste ${kalemler} için özel ücret tanımlı. Genel ücret değişince bu servislerin ücreti de değişsin mi?`,
  uyariMakine: 'makine modeline göre özel ücreti de var',
  uyariOzelDe: 'Özel Ücretler de Değişsin',
  uyariYalnizGenel: 'Yalnız Genel Ücreti Değiştir',
  uyariAltNot:
    'Özel ücretler de değişirse bu servislerin özel ücretleri silinir ve genel ücret uygulanır. Özel ücretler korunursa yalnızca özel ücreti olmayan servislerin ücreti değişir.',
  kalemYol: 'yol',
  kalemIscilik: 'işçilik',
  ve: 've',
}

const KALEM_ADI = { yolKm: METIN.kalemYol, iscilikSaat: METIN.kalemIscilik }

const KAYNAK_ADI = {
  genel: METIN.kaynakGenel,
  makine: METIN.kaynakMakine,
  servis: METIN.kaynakOzel,
  servisMakine: METIN.kaynakOzel,
}

/* Makine seçeneği: katalogdaki ürünler, ada göre. */
const URUNLER = PRODUCTS.map((p) => ({ id: p.id, ad: p.name })).sort((a, b) =>
  a.ad.localeCompare(b.ad, 'tr'),
)

export function urunAdi(id) {
  return URUNLER.find((u) => u.id === id)?.ad || id
}

const tl = (v) => `${paraYaz(v)} ${PARA_BIRIMI}`

/** "12 TL/km · 50 TL/saat" */
export function ucretSatiri(t) {
  return `${tl(t.yolKm)}/km · ${tl(t.iscilikSaat)}/saat`
}

/* Makine satırının yalnız YAZILI kalemleri: "İşçilik 90 TL/saat".
   Boş kalem üstteki ücreti izliyor; yazılmıyor. */
function modelKalemleri(m) {
  return [
    m.yolKm !== undefined && `${METIN.yol} ${tl(m.yolKm)}/km`,
    m.iscilikSaat !== undefined && `${METIN.iscilik} ${tl(m.iscilikSaat)}/saat`,
  ]
    .filter(Boolean)
    .join(' · ')
}

/* Servisin temel ücreti, kalemin nereden geldiğiyle:
   "Yol 12 TL/km (genel) · İşçilik 60 TL/saat (özel)". */
function kaynakliSatir(c) {
  return `${METIN.yol} ${tl(c.yolKm)}/km (${KAYNAK_ADI[c.kaynak.yolKm]}) · ${METIN.iscilik} ${tl(c.iscilikSaat)}/saat (${KAYNAK_ADI[c.kaynak.iscilikSaat]})`
}

/* Kutuya yalnız rakam yazılıyor: ücret tam lira. */
const rakam = (v) => String(v ?? '').replace(/\D/g, '').slice(0, 6)

/* Depodaki { urunId: {yolKm, iscilikSaat} } ↔ düzenlenen satırlar.
   Satırlar yazı olarak tutuluyor: boş kutu "üstten al" demek, sıfır
   geçerli bir ücret. */
function satirlaraCevir(modeller) {
  return Object.entries(modeller || {}).map(([urunId, m]) => ({
    urunId,
    yolKm: m.yolKm === undefined ? '' : String(m.yolKm),
    iscilikSaat: m.iscilikSaat === undefined ? '' : String(m.iscilikSaat),
  }))
}

function modellereCevir(satirlar) {
  const sonuc = {}
  for (const s of satirlar || []) {
    if (!s.urunId) continue
    const m = {}
    for (const k of KALEMLER) {
      const v = ucretOku(s[k])
      if (v !== null) m[k] = v
    }
    if (Object.keys(m).length) sonuc[s.urunId] = m
  }
  return sonuc
}

const ayniMi = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/* ------------------------------------------------------------ Genel kart */

export function HizmetUcretleriKarti({ personel, rol, bildir, tazele, surum }) {
  const duzenleyebilir = izinli(rol, 'servisUcreti')
  const tarife = useMemo(() => {
    void surum
    return hizmetTarifesiGetir()
  }, [surum])
  const [taslak, setTaslak] = useState(null)
  const [uyari, setUyari] = useState(null)
  const [hata, setHata] = useState('')
  /* KART KAPALI AÇILIYOR (23 Eylül 2026, kullanıcının isteği): "çok yer
     kaplıyor … başlık başlık olsun ve kalan kısım gerektiğinde açılsın".
     Kapalıyken başlığın yanında genel ücret ve özel ücretli servis
     sayısı duruyor; sayfaya bakan kişi kartı açmadan bugünkü durumu
     okuyor. */
  const [acik, setAcik] = useState(false)

  const servisAdi = useMemo(() => {
    void surum
    const adlar = Object.fromEntries(servisleriGetir().map((s) => [s.id, s.ad]))
    return (id) => adlar[id] || id
  }, [surum])

  const ozeller = ozelUcretliServisler(tarife)
  const genelModeller = Object.entries(tarife.modeller)

  function duzenlemeyiAc() {
    setTaslak({
      yolKm: String(tarife.genel.yolKm),
      iscilikSaat: String(tarife.genel.iscilikSaat),
      satirlar: satirlaraCevir(tarife.modeller),
    })
    setHata('')
  }

  function kaydet(ozelleriDegistir) {
    const sonuc = genelTarifeyiKaydet(
      { yolKm: taslak.yolKm, iscilikSaat: taslak.iscilikSaat, modeller: modellereCevir(taslak.satirlar) },
      { ozelleriDegistir },
      personel,
    )
    if (sonuc.hata) {
      setUyari(null)
      return setHata(sonuc.hata)
    }
    setUyari(null)
    setTaslak(null)
    bildir(METIN.kaydedildi(sonuc.bildirilen))
    tazele()
  }

  function kaydetIste() {
    const yolKm = ucretOku(taslak.yolKm)
    const iscilikSaat = ucretOku(taslak.iscilikSaat)
    if (yolKm === null || iscilikSaat === null) {
      return setHata(yolKm === null ? 'Kilometre başına ücreti yazın.' : 'Saat başına ücreti yazın.')
    }
    const degisen = KALEMLER.filter((k) => tarife.genel[k] !== { yolKm, iscilikSaat }[k])
    const modelDegisti = !ayniMi(modellereCevir(taslak.satirlar), tarife.modeller)
    if (!degisen.length && !modelDegisti) {
      setTaslak(null)
      return bildir(METIN.degisiklikYok)
    }
    /* Kullanıcının kuralı: özel ücretli servis varken genel ücret
       değişiyorsa sor. Yalnız DEĞİŞEN kalemlere bakılıyor. */
    const etkilenen = degisen.length ? ozelUcretliServisler(tarife, degisen) : []
    if (etkilenen.length) return setUyari({ etkilenen, degisen })
    kaydet(false)
  }

  const guncelleme = tarife.genel.guncelleme

  return (
    <div className={'kart ucret-kart acilir-kart' + (acik ? ' acilir-kart--acik' : '')} style={{ marginBottom: 14 }}>
      <AcilirTepe
        baslik={METIN.baslik}
        ozet={[
          METIN.ozetGenel(tl(tarife.genel.yolKm), tl(tarife.genel.iscilikSaat)),
          ozeller.length ? METIN.ozetOzel(ozeller.length) : null,
        ]}
        acik={acik}
        onDegis={setAcik}
        govdeId="hizmet-ucretleri-govde"
      />

      {acik && (
      <div className="kart__ic" id="hizmet-ucretleri-govde">
        <div className="acilir-ust">
          <p className="kucuk sonuk" style={{ margin: 0, lineHeight: 1.55 }}>
            {METIN.aciklama}
          </p>
          {duzenleyebilir && !taslak && (
            <button className="dg" onClick={duzenlemeyiAc}>
              {METIN.duzenle}
            </button>
          )}
        </div>
        <p className="kucuk sonuk acilir-guncelleme">
          {guncelleme?.tarih ? METIN.guncelleme(tarihYaz(guncelleme.tarih), guncelleme.personel) : null}
        </p>

        {!taslak ? (
          <>
            <div className="ucret-sayilar">
              <UcretSayisi ad={METIN.yol} birim={METIN.yolBirim} deger={tarife.genel.yolKm} />
              <UcretSayisi ad={METIN.iscilik} birim={METIN.iscilikBirim} deger={tarife.genel.iscilikSaat} />
            </div>

            <div className="ucret-bolum">
              <div className="ucret-bolum__ad">{METIN.makineBaslik}</div>
              {genelModeller.length ? (
                <MakineListesi modeller={tarife.modeller} temel={tarife.genel} />
              ) : (
                <p className="kucuk sonuk" style={{ margin: 0 }}>{METIN.makineYok}</p>
              )}
            </div>

            <div className="ucret-bolum">
              <div className="ucret-bolum__ad">
                {ozeller.length ? METIN.ozelBaslik(ozeller.length) : METIN.ozelYok}
              </div>
              {/* SERVİSİN MAKİNE SATIRLARI DA YAZIYOR (23 Eylül 2026,
                  kullanıcı bildirdi): burada yalnız servisin temel ücreti
                  vardı; servise bir makine modeli için özel ücret girilince
                  o ücret hiçbir yerde görünmüyordu. Yalnız makine satırı
                  olan servis "özel" sayılıp genel ücretle listeleniyordu. */}
              {ozeller.length > 0 && (
                <div className="ucret-ozeller">
                  {ozeller.map((o) => (
                    <OzelServisSatiri
                      key={o.servisId}
                      ad={servisAdi(o.servisId)}
                      temel={tarifeCoz(tarife, o.servisId, null)}
                      modeller={tarife.servisler[o.servisId]?.modeller}
                    />
                  ))}
                </div>
              )}
              <p className="kucuk sonuk" style={{ margin: '8px 0 0' }}>{METIN.ozelNotu}</p>
            </div>
          </>
        ) : (
          <>
            <div className="esit">
              <UcretKutusu
                ad={`${METIN.yol} · ${METIN.yolBirim}`}
                deger={taslak.yolKm}
                onDegis={(v) => setTaslak({ ...taslak, yolKm: v })}
              />
              <UcretKutusu
                ad={`${METIN.iscilik} · ${METIN.iscilikBirim}`}
                deger={taslak.iscilikSaat}
                onDegis={(v) => setTaslak({ ...taslak, iscilikSaat: v })}
              />
            </div>

            <div className="ucret-bolum">
              <div className="ucret-bolum__ad">{METIN.makineBaslik}</div>
              <p className="kucuk sonuk" style={{ margin: '0 0 10px' }}>{METIN.makineAciklama}</p>
              <MakineSatirlari
                satirlar={taslak.satirlar}
                onDegis={(satirlar) => setTaslak({ ...taslak, satirlar })}
                temel={{ yolKm: taslak.yolKm, iscilikSaat: taslak.iscilikSaat }}
              />
            </div>

            <p className="kucuk sonuk" style={{ margin: '14px 0' }}>{METIN.gecmisNotu}</p>
            {hata && <div className="uyari">{hata}</div>}
            <div className="satir">
              <button className="dg dg--ana" onClick={kaydetIste}>{METIN.kaydet}</button>
              <button className="dg" onClick={() => setTaslak(null)}>{METIN.vazgec}</button>
            </div>
          </>
        )}
      </div>
      )}

      {uyari && (
        <OzelUcretUyarisi
          etkilenen={uyari.etkilenen}
          degisen={uyari.degisen}
          servisAdi={servisAdi}
          onOzelDe={() => kaydet(true)}
          onYalnizGenel={() => kaydet(false)}
          onVazgec={() => setUyari(null)}
        />
      )}
    </div>
  )
}

/* Özel ücretli servisin satırı: temel ücret kalem kalem nereden geldiğiyle,
   altında servise özel makine satırları. */
function OzelServisSatiri({ ad, temel, modeller }) {
  const satirlar = Object.entries(modeller || {})
  return (
    <div className="ucret-ozel">
      <div className="ucret-ozel__ad">{ad}</div>
      <div className="kucuk">{kaynakliSatir(temel)}</div>
      {satirlar.map(([urunId, m]) => (
        <div key={urunId} className="kucuk ucret-ozel__makine">
          <span className="ucret-ozel__model">{urunAdi(urunId)}</span> {modelKalemleri(m)}
        </div>
      ))}
    </div>
  )
}

function UcretSayisi({ ad, birim, deger }) {
  return (
    <div className="ucret-sayi">
      <div className="ucret-sayi__ad">{ad}</div>
      <div className="ucret-sayi__deger">
        {paraYaz(deger)} <small>{PARA_BIRIMI}</small>
      </div>
      <div className="ucret-sayi__birim">{birim}</div>
    </div>
  )
}

function UcretKutusu({ ad, deger, onDegis, yerTutucu }) {
  return (
    <label className="alan">
      <span className="alan__ad">{ad} ({PARA_BIRIMI})</span>
      <input
        className="gir mono"
        value={deger}
        onChange={(e) => onDegis(rakam(e.target.value))}
        inputMode="numeric"
        placeholder={yerTutucu}
      />
    </label>
  )
}

/* Okuma hâlinde makine satırları: "Orkinos 1270 · İşçilik 80 TL/saat".
   Boş kalem temel ücreti izliyor; yazılmıyor. */
function MakineListesi({ modeller }) {
  return (
    <div className="ucret-makineler">
      {Object.entries(modeller).map(([urunId, m]) => (
        <div key={urunId} className="ucret-makine">
          <span className="ucret-makine__ad">{urunAdi(urunId)}</span>
          <span className="kucuk">{modelKalemleri(m)}</span>
        </div>
      ))}
    </div>
  )
}

/* Düzenleme hâlinde makine satırları. Aynı makine iki kez seçilemiyor:
   seçenek listesi seçilmiş olanları gizliyor. */
function MakineSatirlari({ satirlar, onDegis, temel }) {
  const secilmis = new Set(satirlar.map((s) => s.urunId))
  const bosta = URUNLER.filter((u) => !secilmis.has(u.id))
  const degis = (i, alan, v) => onDegis(satirlar.map((s, j) => (j === i ? { ...s, [alan]: v } : s)))

  return (
    <>
      {satirlar.length > 0 && (
        <div className="ucret-satirlar">
          {/* Sütun başlığı: kutu doluyken yer tutucu görünmüyor; hangi
              kutunun yol, hangisinin işçilik olduğu buradan okunuyor. */}
          <div className="ucret-satir ucret-satir--baslik" aria-hidden="true">
            <span />
            <span>{METIN.yol} ({PARA_BIRIMI}/km)</span>
            <span>{METIN.iscilik} ({PARA_BIRIMI}/saat)</span>
            <span />
          </div>
          {satirlar.map((s, i) => (
            <div key={i} className="ucret-satir">
              <select
                className="gir"
                value={s.urunId}
                onChange={(e) => degis(i, 'urunId', e.target.value)}
                aria-label={METIN.makineSec}
              >
                <option value={s.urunId}>{urunAdi(s.urunId)}</option>
                {bosta.map((u) => (
                  <option key={u.id} value={u.id}>{u.ad}</option>
                ))}
              </select>
              <input
                className="gir mono"
                value={s.yolKm}
                onChange={(e) => degis(i, 'yolKm', rakam(e.target.value))}
                inputMode="numeric"
                placeholder={temel?.yolKm !== '' && temel?.yolKm !== undefined ? METIN.genelYerTutucu(temel.yolKm) : METIN.bosKutu}
                aria-label={`${urunAdi(s.urunId)} · ${METIN.yol} · ${METIN.yolBirim}`}
              />
              <input
                className="gir mono"
                value={s.iscilikSaat}
                onChange={(e) => degis(i, 'iscilikSaat', rakam(e.target.value))}
                inputMode="numeric"
                placeholder={temel?.iscilikSaat !== '' && temel?.iscilikSaat !== undefined ? METIN.genelYerTutucu(temel.iscilikSaat) : METIN.bosKutu}
                aria-label={`${urunAdi(s.urunId)} · ${METIN.iscilik} · ${METIN.iscilikBirim}`}
              />
              <button className="dg" onClick={() => onDegis(satirlar.filter((_, j) => j !== i))}>
                {METIN.kaldir}
              </button>
            </div>
          ))}
        </div>
      )}
      {bosta.length > 0 && (
        <button
          className="dg"
          onClick={() => onDegis([...satirlar, { urunId: bosta[0].id, yolKm: '', iscilikSaat: '' }])}
        >
          {METIN.makineEkle}
        </button>
      )}
    </>
  )
}

/* ------------------------------------------------------- Uyarı penceresi

   Genel ücret değişiyor ve değişen kalemde özel ücreti olan servisler
   var. Kullanıcının kuralı tam bu soruyu istiyor: "spesifik şekilde
   belirlenmiş km ve saatlik ücretli servisler de değişsin mi".
   Pencere kimlerin etkileneceğini ADIYLA ve bugünkü ücretiyle
   listeliyor; sayı tek başına personelin karar vermesine yetmez. */
export function OzelUcretUyarisi({ etkilenen, degisen, servisAdi, onOzelDe, onYalnizGenel, onVazgec }) {
  const kalemler = degisen.map((k) => KALEM_ADI[k]).join(` ${METIN.ve} `)
  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onVazgec()}>
      <div className="kart pencere__kart" style={{ maxWidth: 560 }}>
        <div className="kart__tepe">
          <h2>{METIN.uyariBaslik}</h2>
        </div>
        <div className="kart__ic">
          <p style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
            {METIN.uyariMetin(etkilenen.length, kalemler)}
          </p>
          <div className="ucret-uyari-liste">
            {etkilenen.map((o) => (
              <div key={o.servisId} className="ucret-uyari-satir">
                <strong>{servisAdi(o.servisId)}</strong>
                <span className="kucuk sonuk">
                  {[
                    o.kalemler.yolKm !== undefined && `${METIN.yol} ${tl(o.kalemler.yolKm)}/km`,
                    o.kalemler.iscilikSaat !== undefined && `${METIN.iscilik} ${tl(o.kalemler.iscilikSaat)}/saat`,
                    o.makineli && METIN.uyariMakine,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            ))}
          </div>
          <p className="kucuk sonuk" style={{ margin: '12px 0 16px', lineHeight: 1.55 }}>
            {METIN.uyariAltNot}
          </p>
          <div className="satir" style={{ flexWrap: 'wrap' }}>
            <button className="dg dg--ana" onClick={onOzelDe}>{METIN.uyariOzelDe}</button>
            <button className="dg" onClick={onYalnizGenel} autoFocus>{METIN.uyariYalnizGenel}</button>
            <button className="dg" onClick={onVazgec}>{METIN.vazgec}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------- Servis formu

   Servisin Düzenle penceresindeki bölüm. Değer formun kendi
   durumunda tutuluyor (`servisUcretTaslagi`) ve form kaydedilirken
   yazılıyor (bkz. Servisler.jsx → onKaydet → servisTarifesiniKaydet):
   personel iki ayrı "Kaydet"e basmıyor. */

/** Formun açılışındaki taslak: servisin bugünkü özel ücretleri. */
export function servisUcretTaslagi(servisId) {
  const s = hizmetTarifesiGetir().servisler[servisId]
  return {
    yolKm: s?.yolKm === undefined ? '' : String(s.yolKm),
    iscilikSaat: s?.iscilikSaat === undefined ? '' : String(s.iscilikSaat),
    satirlar: satirlaraCevir(s?.modeller),
  }
}

/** Taslağın veri katmanına gidecek hâli. */
export function taslaktanOzel(taslak) {
  return {
    yolKm: taslak.yolKm,
    iscilikSaat: taslak.iscilikSaat,
    modeller: modellereCevir(taslak.satirlar),
  }
}

/** Form açıldığından beri taslak değişti mi? */
export function taslakDegistiMi(servisId, taslak) {
  return !ayniMi(taslaktanOzel(taslak), taslaktanOzel(servisUcretTaslagi(servisId)))
}

export function ServisUcretiAlani({ servisId, rol, taslak, onDegis }) {
  const duzenleyebilir = izinli(rol, 'servisUcreti')
  const tarife = hizmetTarifesiGetir()
  const iskonto = iskontoCoz(parcaIskontosuGetir(), servisId)

  /* Kutulara yazılan henüz kaydedilmedi; özet, kaydedilince ne
     olacağını gösteriyor: taslak servisin yerine konup çözülüyor. */
  const deneme = tarifeleriDuzenle({
    ...tarife,
    servisler: { ...tarife.servisler, [servisId]: taslaktanOzel(taslak) },
  })
  const gecerli = tarifeCoz(deneme, servisId, null)
  const farklar = makineFarklari(deneme, servisId)

  /* Genel tarifede makineye göre satırı olan bir kalem bu serviste özel
     yazıldıysa o satırlar bu serviste geçmiyor (lib/servisTarifesi.js →
     katman sırası). Personel bunu bilmeden kaydetmesin. */
  const golgelenen = KALEMLER.some(
    (k) => ucretOku(taslak[k]) !== null && Object.values(tarife.modeller).some((m) => m[k] !== undefined),
  )

  return (
    <div className="alan" style={{ marginTop: 18 }}>
      <span className="alan__ad">{METIN.servisBaslik}</span>

      {duzenleyebilir ? (
        <>
          <p className="kucuk sonuk" style={{ margin: '0 0 10px' }}>{METIN.servisAciklama}</p>
          <div className="esit">
            <UcretKutusu
              ad={`${METIN.yol} · ${METIN.yolBirim}`}
              deger={taslak.yolKm}
              onDegis={(v) => onDegis({ ...taslak, yolKm: v })}
              yerTutucu={METIN.genelYerTutucu(tarife.genel.yolKm)}
            />
            <UcretKutusu
              ad={`${METIN.iscilik} · ${METIN.iscilikBirim}`}
              deger={taslak.iscilikSaat}
              onDegis={(v) => onDegis({ ...taslak, iscilikSaat: v })}
              yerTutucu={METIN.genelYerTutucu(tarife.genel.iscilikSaat)}
            />
          </div>
          <p className="kucuk sonuk" style={{ margin: '0 0 8px' }}>{METIN.servisMakineAciklama}</p>
          <MakineSatirlari
            satirlar={taslak.satirlar}
            onDegis={(satirlar) => onDegis({ ...taslak, satirlar })}
            temel={{
              yolKm: taslak.yolKm || String(tarife.genel.yolKm),
              iscilikSaat: taslak.iscilikSaat || String(tarife.genel.iscilikSaat),
            }}
          />
          {golgelenen && (
            <div className="uyari" style={{ marginTop: 12, marginBottom: 0 }}>
              <span>{METIN.servisOnceligi}</span>
            </div>
          )}
        </>
      ) : (
        <p className="kucuk sonuk" style={{ margin: '0 0 8px' }}>{METIN.salttOkunur}</p>
      )}

      <div className="ucret-ozet">
        <span className="kucuk sonuk">{METIN.servisOzeti}:</span>{' '}
        <strong className="kucuk">{kaynakliSatir(gecerli)}</strong>
        {farklar.length > 0 && (
          <div className="kucuk sonuk" style={{ marginTop: 4 }}>
            {farklar.map((f) => `${urunAdi(f.urunId)}: ${ucretSatiri(f)}`).join(' · ')}
          </div>
        )}
        <div className="kucuk sonuk" style={{ marginTop: 6 }}>
          {METIN.iskontoSatiri(yuzdeYap(iskonto.oran), iskonto.kaynak === 'servis' ? METIN.kaynakOzel : METIN.kaynakGenel)}
        </div>
      </div>
    </div>
  )
}

/* Servis listesindeki "Ücret" hücresi: servisin temel ücreti ve özel mi
   genel mi. Servise özel makine satırları altında, model adıyla: yalnız
   makine satırı olan servisin hücresi yoksa genel ücretle aynı görünürdü. */
export function ServisUcretHucresi({ tarife, servisId }) {
  const c = tarifeCoz(tarife, servisId, null)
  const ozel = Boolean(tarife.servisler[servisId])
  const modeller = Object.entries(tarife.servisler[servisId]?.modeller || {})
  return (
    <>
      <div className="kucuk mono">{ucretSatiri(c)}</div>
      {modeller.map(([urunId, m]) => (
        <div key={urunId} className="kucuk sonuk ucret-hucre__makine">
          {urunAdi(urunId)}: {modelKalemleri(m)}
        </div>
      ))}
      {ozel && <span className="rz rz--mavi" style={{ marginTop: 3 }}>{METIN.kaynakOzel}</span>}
    </>
  )
}
