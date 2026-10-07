import { useMemo, useState } from 'react'
import { bayileriGetirBackoffice, bayileriSifirla, bayileriYaz, izinli } from '../veri'
import { useVeri } from '../kanca'
import { BAYILER } from '../../data/katalog/bayiler.js'
import { servisleriGetir } from '../../data/katalog/servisler.js'
import { ILLER, ilceleriGetir } from '../../data/iller'
import { Baslik, Bekleme, Bos, siraliListe, SiraliBaslik, useOnay, useSiralama } from './ortak'
import { Secim, SuzgecCubugu } from './suzgec'
import { DisaAktar, IceAktar } from './aktar'
import { uid } from '../../lib/storage'
import { yeniNo, sayaciEnAz } from '../../lib/numara'
import { telFirma, telGiris } from '../../lib/tel'

/* ==========================================================================
   Bayiler — makineyi satan taraf

   BU EKRAN SERVİSLER EKRANININ KOPYASI DEĞİL, DAHA KISASI.

   Bayi kaydında panel hesabı, şifre, sorumluluk bölgesi ve hizmet
   listesi YOK ve olmayacak:

     · Bayinin paneli yok — servis talebi, parça talebi ve stok
       bayinin işi değil.
     · Sorumluluk bölgesi yok — talep bayiye değil servise düşüyor,
       bölge servis kaydında.
     · Hizmet listesi yok — bayinin tek işi satış.

   Bu ekran künye tutuyor: müşteri "makineyi şuradan aldım" dediğinde
   ya da LOGO faturası bir bayi kimliği verdiğinde karşılığı burada.

   HANGİ SERVİS ÇALIŞIYOR — BURADA GİRİLMİYOR

   Bağ servis kaydında duruyor (bkz. Servisler ekranı → Çalıştığı
   Bayiler). Burada yalnız GÖSTERİLİYOR: bir bayinin servisi yoksa
   o bayiden makine alan müşteriye kimin bakacağı belli değil demektir
   ve bunun görünmesi gerekiyor.
   ========================================================================== */

/* Koordinat ve ikinci telefon alanı YOK.

   Enlem/boylam tek bir yerde kullanılıyordu: müşteri uygulamasındaki
   yön haritası. Harita kaldırıldı, alanlar da gitti.

   "Ekranda görünen telefon" da gitti; boşlukları ekran koyuyor
   (bkz. lib/tel.js → telFirma). */
const BOS_BAYI = { ad: '', il: '', ilce: '', adres: '', tel: '' }

export function Bayiler({ personel, rol, bildir, tazele, surum }) {
  const duzenleyebilir = izinli(rol, 'servisDuzenle')
  const yonetici = izinli(rol, 'personelDuzenle')
  const [duzenlenen, setDuzenlenen] = useState(null)
  const [sor, onayPenceresi] = useOnay()
  const [yerel, setYerel] = useState(null)
  const [il, setIl] = useState('hepsi')
  const [ara, setAra] = useState('')

  const { veri: kayitli, yukleniyor } = useVeri(() => bayileriGetirBackoffice(), [surum], null)
  const tumBayiler = yerel || kayitli || BAYILER

  /* Bayi → ona bakan servisler. Bağ servis kaydında olduğu için
     ters çevriliyor. */
  const servisHaritasi = useMemo(() => {
    void surum
    const harita = {}
    for (const s of servisleriGetir()) {
      for (const bId of s.bayiler || []) {
        harita[bId] = [...(harita[bId] || []), s]
      }
    }
    return harita
  }, [surum])

  const iller = [...new Set(tumBayiler.map((b) => b.il).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  )

  const suzulmus = tumBayiler.filter((b) => {
    if (il !== 'hepsi' && b.il !== il) return false
    const q = ara.trim().toLocaleLowerCase('tr-TR')
    if (!q) return true
    const alanlar = [b.no, b.ad, b.il, b.ilce, b.adres, b.tel]
    if (alanlar.filter(Boolean).some((x) => String(x).toLocaleLowerCase('tr-TR').includes(q))) {
      return true
    }
    const qRakam = q.replace(/\D/g, '')
    if (!qRakam) return false
    return [b.no, b.tel].filter(Boolean).some((x) => String(x).replace(/\D/g, '').includes(qRakam))
  })

  const { siralama, cevir } = useSiralama('ad', 'artan')
  const liste = siraliListe(suzulmus, siralama, {
    no: (b) => b.no,
    ad: (b) => b.ad,
    konum: (b) => b.il,
    tel: (b) => b.tel,
    servis: (b) => (servisHaritasi[b.id] || []).length,
  })
  const ozel = Boolean(yerel || kayitli)

  function kaydet(yeniListe) {
    setYerel(yeniListe)
    bayileriYaz(yeniListe, personel, `Bayi listesi güncellendi (${yeniListe.length} bayi)`)
    tazele()
  }

  const servissiz = tumBayiler.filter((b) => !(servisHaritasi[b.id] || []).length).length

  return (
    <>
      {onayPenceresi}
      <Baslik
        ad="Bayiler"
        sag={
          duzenleyebilir && (
            <>
              <DisaAktar
                ad="Bayiler"
                basliklar={AKTAR_BASLIK}
                satirlar={liste.map(aktarSatiri)}
                personel={personel}
              />
              {yonetici && (
                <IceAktar
                  ad="Bayiler"
                  basliklar={AKTAR_BASLIK}
                  ornek={ORNEK_SATIR}
                  bildir={bildir}
                  tazele={tazele}
                  personel={personel}
                  onVeri={(kayitlar) => iceAl(kayitlar, liste, kaydet)}
                />
              )}
              {ozel && (
                <button
                  className="dg"
                  onClick={async () => {
                    const evet = await sor({
                      baslik: 'Bayi listesi sıfırlansın mı?',
                      metin: 'Bayi listesinde yaptığınız değişiklikler silinecek ve temsilî listeye geri dönülecek.',
                      dugme: 'Listeyi Sıfırla',
                      sil: true,
                    })
                    if (!evet) return
                    bayileriSifirla(personel)
                    setYerel(null)
                    tazele()
                    bildir('Fabrika ayarına dönüldü')
                  }}
                >
                  Fabrika ayarına dön
                </button>
              )}
              <button
                className="dg dg--ana"
                onClick={() => setDuzenlenen({ ...BOS_BAYI, id: uid(), yeni: true })}
              >
                Bayi ekle
              </button>
            </>
          )
        }
      />

      {/* Servisi olmayan bayi, zincirin kopuk halkası: o bayiden makine
          alan müşteriye kimin bakacağı belli değil. */}
      {servissiz > 0 && (
        <div className="uyari" style={{ marginBottom: 14, display: 'block' }}>
          <b>{servissiz} bayinin servisi tanımlı değil.</b>
          <p style={{ margin: '6px 0 0' }}>
            Bu bayilerden makine alan müşterinin talebi, kayıtlı servise
            değil en yakın servise düşüyor. Bağ, Servisler ekranındaki
            "Çalıştığı Bayiler" alanından kuruluyor.
          </p>
        </div>
      )}

      <SuzgecCubugu>
        <Secim
          ad="İl"
          deger={il}
          onDegis={setIl}
          secenekler={[
            { deger: 'hepsi', ad: 'Tüm iller' },
            ...iller.map((x) => ({ deger: x, ad: x })),
          ]}
          genislik={150}
        />

        <label className="secim-alan secim-alan--genis">
          <span className="secim-alan__ad">Ara</span>
          <input
            className="sec"
            value={ara}
            onChange={(e) => setAra(e.target.value)}
            placeholder="Bayi adı, il/ilçe, telefon"
          />
        </label>

        <span className="suzgec-cubugu__sayi">{liste.length} bayi</span>
      </SuzgecCubugu>

      <div className="kart">
        {yukleniyor ? (
          <Bekleme satir={5} />
        ) : liste.length === 0 ? (
          <Bos metin="Bu süzgeçle bayi bulunamadı." />
        ) : (
          <div className="tablo-sar">
            <table>
              <thead>
                <tr>
                  <SiraliBaslik ad="No" alan="no" siralama={siralama} onSirala={cevir} genislik={90} />
                  <SiraliBaslik ad="Bayi" alan="ad" siralama={siralama} onSirala={cevir} />
                  <SiraliBaslik ad="Konum" alan="konum" siralama={siralama} onSirala={cevir} />
                  <SiraliBaslik ad="Telefon" alan="tel" siralama={siralama} onSirala={cevir} />
                  <SiraliBaslik ad="Bakan Servis" alan="servis" siralama={siralama} onSirala={cevir} />
                  {duzenleyebilir && <th style={{ width: 1 }}></th>}
                </tr>
              </thead>
              <tbody>
                {liste.map((b) => {
                  const servisler = servisHaritasi[b.id] || []
                  return (
                    <tr key={b.id}>
                      <td className="mono kucuk sonuk">{b.no || '—'}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{b.ad}</div>
                        <div className="kucuk sonuk">{b.adres}</div>
                      </td>
                      <td className="kucuk">{b.ilce} / {b.il}</td>
                      <td className="kucuk mono">{telFirma(b.tel)}</td>
                      <td className="kucuk">
                        {servisler.length ? (
                          servisler.map((s) => <div key={s.id}>{s.ad}</div>)
                        ) : (
                          <span className="rz rz--turuncu">Tanımlı değil</span>
                        )}
                      </td>
                      {duzenleyebilir && (
                        <td>
                          <div className="satir" style={{ gap: 6, flexWrap: 'nowrap' }}>
                            <button className="dg" onClick={() => setDuzenlenen({ ...b })}>
                              Düzenle
                            </button>
                            <button
                              className="dg"
                              onClick={async () => {
                                if (servisler.length) {
                                  return bildir(
                                    `"${b.ad}" bir servise bağlı. Önce Servisler ekranından bağı kaldırın.`,
                                  )
                                }
                                const evet = await sor({
                                  baslik: 'Bayi silinsin mi?',
                                  metin: `"${b.ad}" listeden çıkarılacak.`,
                                  dugme: 'Bayiyi Sil',
                                  sil: true,
                                })
                                if (!evet) return
                                kaydet(liste.filter((x) => x.id !== b.id))
                                bildir('Bayi çıkarıldı')
                              }}
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {duzenlenen && (
        <Form
          bayi={duzenlenen}
          onKapat={() => setDuzenlenen(null)}
          onKaydet={(b) => {
            sayaciEnAz('bayi', liste.length)
            const temiz = { ...b, no: b.no || yeniNo('bayi') }
            delete temiz.yeni
            kaydet(b.yeni ? [...liste, temiz] : liste.map((x) => (x.id === b.id ? temiz : x)))
            setDuzenlenen(null)
            bildir(b.yeni ? 'Bayi eklendi' : 'Bayi güncellendi')
          }}
        />
      )}
    </>
  )
}

function Form({ bayi, onKapat, onKaydet }) {
  const [d, setD] = useState(bayi)
  const [hata, setHata] = useState('')
  const yaz = (k) => (e) => setD({ ...d, [k]: e.target.value })

  function kaydet() {
    if (d.ad.trim().length < 2) return setHata('Bayi adını yazın.')
    if (!d.il.trim()) return setHata('İl adını yazın.')
    if (!d.tel.replace(/\D/g, '')) return setHata('Telefon numarasını yazın.')
    setHata('')
    onKaydet(d)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(10,26,51,.45)',
        display: 'grid', placeItems: 'center', padding: 20, zIndex: 50,
      }}
      onClick={(e) => e.target === e.currentTarget && onKapat()}
    >
      <div className="kart" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="kart__tepe">
          <h2>{bayi.yeni ? 'Yeni bayi' : 'Bayiyi düzenle'}</h2>
          <button className="dg" style={{ marginLeft: 'auto' }} onClick={onKapat}>Kapat</button>
        </div>
        <div className="kart__ic">
          <label className="alan">
            <span className="alan__ad">Bayi Adı</span>
            <input className="gir" value={d.ad} onChange={yaz('ad')} autoFocus />
          </label>

          <div className="esit">
            <label className="alan">
              <span className="alan__ad">İl</span>
              <select
                className="gir"
                value={d.il}
                onChange={(e) => setD({ ...d, il: e.target.value, ilce: '' })}
              >
                <option value="">Seçin</option>
                {ILLER.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
            <label className="alan">
              <span className="alan__ad">İlçe</span>
              <select className="gir" value={d.ilce} onChange={yaz('ilce')} disabled={!d.il}>
                <option value="">{d.il ? 'Seçin' : 'Önce il'}</option>
                {ilceleriGetir(d.il).map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
          </div>

          <label className="alan">
            <span className="alan__ad">Adres</span>
            <input className="gir" value={d.adres} onChange={yaz('adres')} />
          </label>

          <label className="alan">
            <span className="alan__ad">Telefon</span>
            <input
              className="gir mono"
              value={telFirma(d.tel)}
              onChange={(e) => setD({ ...d, tel: telGiris(e.target.value) })}
              inputMode="tel"
              placeholder="0332 321 00 01"
            />
          </label>

          <p className="kucuk sonuk" style={{ marginTop: -6 }}>
            Bayinin panel hesabı yoktur. Servis talebi, parça talebi ve stok
            servisin işi; bu kayıt yalnız künye tutuyor.
          </p>

          {hata && <div className="uyari">{hata}</div>}

          <div className="satir">
            <button className="dg dg--ana" onClick={kaydet}>Kaydet</button>
            <button className="dg" onClick={onKapat}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- Excel aktarımı */

const AKTAR_BASLIK = ['Bayi Adı', 'İl', 'İlçe', 'Adres', 'Telefon']

const ORNEK_SATIR = [
  'Örnek Tarım Makineleri',
  'Konya',
  'Selçuklu',
  'Ankara Yolu 12. km No: 5',
  '0332 321 00 00',
]

function aktarSatiri(b) {
  return [b.ad || '', b.il || '', b.ilce || '', b.adres || '', telFirma(b.tel)]
}

function iceAl(kayitlar, mevcut, kaydet) {
  const hatalar = []
  const yeniler = []
  sayaciEnAz('bayi', mevcut.length)

  kayitlar.forEach((k, i) => {
    const satir = i + 2
    const ad = k['Bayi Adı']
    if (!ad) return hatalar.push(`${satir}. satır: bayi adı boş, atlandı.`)
    if (!k['İl']) return hatalar.push(`${satir}. satır (${ad}): il boş, atlandı.`)

    yeniler.push({
      id: uid(),
      no: yeniNo('bayi'),
      ad,
      il: k['İl'],
      ilce: k['İlçe'] || '',
      adres: k['Adres'] || '',
      tel: telGiris(k['Telefon'] || ''),
    })
  })

  if (yeniler.length) kaydet([...mevcut, ...yeniler])
  return { eklendi: yeniler.length, atlandi: hatalar.length, hatalar }
}
