import { useMemo, useState } from 'react'
import { destekOturumlariGetir } from '../veri'
import { useVeri } from '../kanca'
import { Baslik, Bekleme, Bos, tarihSaat, tarihYaz } from './ortak'
import { araliktaMi, BOS_ARALIK, Secim, SuzgecCubugu, TarihAraligi } from './suzgec'
import { DisaAktar } from './aktar'
import { formatSerial } from '../../lib/serial'

/* ==========================================================================
   Destek kayıtları

   NE İŞE YARIYOR

   Destek ekranı bir yapay zekâ değil, hazır soru-cevap seti. Ama
   müşterinin o sette NE ARADIĞI, PAKSAN için makinenin kendisi kadar
   değerli:

     · Hangi modelde hangi arıza konuşuluyor → imalata giden geri bildirim
     · Hangi soru en çok seçiliyor → kılavuzun eksik kaldığı yer
     · Hangi cümle cevapsız kalıyor → bilgi tabanının eksik listesi
     · Kaç konuşma servis talebine dönüyor → destek işe yarıyor mu

   Son maddesi en önemlisi: destek ekranının amacı çiftçinin sorununu
   ekrandan çözmek. Her konuşma servis talebiyle bitiyorsa ekran işini
   yapmıyor demektir.

   CEVAPSIZ KALANLAR bu ekranın en değerli sütunu. Müşterinin yazdığı
   ama bilgi tabanının karşılayamadığı cümleler; her biri yazılması
   gereken bir kayıt.

   Kayıt müşterinin telefonunda tutuluyor, backoffice oradan okuyor
   (bkz. src/lib/destekLog.js). Sunucu geldiğinde tüm müşterilerin
   kaydı burada toplanacak; ekran aynı kalacak.
   ========================================================================== */

const SONUC_ADI = {
  servis: 'Servis talebi açtı',
  parca: 'Yedek parça talebi açtı',
  satinalma: 'Fiyat teklifi istedi',
  telefon: 'Telefonla aradı',
}

export function DestekKayitlari({ rol, surum }) {
  const [aralik, setAralik] = useState({ ...BOS_ARALIK, tur: 'gun30' })
  const [sonuc, setSonuc] = useState('hepsi')
  const [makine, setMakine] = useState('hepsi')
  const [secili, setSecili] = useState(null)

  const { veri: hepsi, yukleniyor } = useVeri(destekOturumlariGetir, [surum], [])

  const makineler = [
    ...new Set(hepsi.map((o) => o.urun?.ad).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, 'tr'))

  const liste = useMemo(
    () =>
      hepsi
        .filter((o) => araliktaMi(o.baslangic, aralik))
        .filter((o) => makine === 'hepsi' || o.urun?.ad === makine)
        .filter((o) => {
          if (sonuc === 'hepsi') return true
          if (sonuc === 'cevapsiz') return cevapsizlar(o).length > 0
          if (sonuc === 'talep') return Boolean(yonlendirme(o))
          if (sonuc === 'coz') return !yonlendirme(o) && cevapsizlar(o).length === 0
          return true
        })
        .sort((a, b) => b.baslangic - a.baslangic),
    [hepsi, aralik, makine, sonuc]
  )

  const acik = secili ? hepsi.find((o) => o.id === secili) : null

  /* Cevapsız kalan cümleler — sıklığa göre. Bilgi tabanına yazılacak
     kayıtların listesi bu. */
  const eksikler = useMemo(() => {
    const kova = {}
    liste.forEach((o) => {
      cevapsizlar(o).forEach((c) => {
        const k = c.toLocaleLowerCase('tr-TR')
        kova[k] = (kova[k] || 0) + 1
      })
    })
    return Object.entries(kova).sort((a, b) => b[1] - a[1])
  }, [liste])

  if (yukleniyor) {
    return (
      <>
        <Baslik ad="Destek Kayıtları" />
        <Bekleme satir={6} />
      </>
    )
  }

  return (
    <>
      <Baslik ad="Destek Kayıtları" />

      <SuzgecCubugu>
        <TarihAraligi aralik={aralik} onDegis={setAralik} />
        <Secim
          ad="Makine"
          deger={makine}
          onDegis={setMakine}
          secenekler={[
            { deger: 'hepsi', ad: 'Tüm makineler' },
            ...makineler.map((x) => ({ deger: x, ad: x })),
          ]}
          genislik={180}
        />
        <Secim
          ad="Sonuç"
          deger={sonuc}
          onDegis={setSonuc}
          secenekler={[
            { deger: 'hepsi', ad: 'Hepsi' },
            { deger: 'coz', ad: 'Ekranda çözüldü' },
            { deger: 'talep', ad: 'Talebe dönüştü' },
            { deger: 'cevapsiz', ad: 'Cevapsız kalan var' },
          ]}
          genislik={175}
        />
        <DisaAktar
          ad="Destek Kayıtları"
          basliklar={AKTAR_BASLIK}
          satirlar={liste.map(aktarSatiri)}
          personel={rol}
        />
        <span className="suzgec-cubugu__sayi">{liste.length} oturum</span>
      </SuzgecCubugu>

      {/* Cevapsız kalanlar en üstte: bu ekranın asıl çıktısı bu. */}
      {eksikler.length > 0 && (
        <div className="kart" style={{ marginBottom: 18 }}>
          <div className="kart__tepe">
            <h2>Cevapsız Kalan Sorular</h2>
            <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>
              {eksikler.length} farklı soru
            </span>
          </div>
          <div className="kart__ic">
            <p className="kucuk sonuk" style={{ margin: '0 0 12px' }}>
              Müşterinin destek ekranında arayıp bulamadığı cümleler. Her biri, kılavuzda
              ya da destek veri setinde eksik olan bir arıza kaydına işaret ediyor.
            </p>
            <div className="tablo-sar">
              <table>
                <thead>
                  <tr>
                    <th>Soru</th>
                    <th style={{ width: 110 }}>Kaç kez</th>
                  </tr>
                </thead>
                <tbody>
                  {eksikler.slice(0, 25).map(([soru, adet]) => (
                    <tr key={soru}>
                      <td>{soru}</td>
                      <td className="kucuk">{adet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="ikili">
        <div className="kart">
          {liste.length === 0 ? (
            <Bos metin="Bu dönemde destek konuşması yok." />
          ) : (
            <div className="tablo-sar">
              <table className="tablo--esit">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Müşteri</th>
                    <th>Makine</th>
                    <th>Sorular</th>
                    <th>Sonuç</th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((o) => (
                    <tr
                      key={o.id}
                      className={'tiklanir' + (secili === o.id ? ' secili' : '')}
                      onClick={() => setSecili(o.id)}
                    >
                      <td className="kucuk sonuk">{tarihYaz(o.baslangic)}</td>
                      <td>
                        <div>{o.kullanici?.ad || '—'}</div>
                        <div className="kucuk sonuk">{o.kullanici?.il || ''}</div>
                      </td>
                      <td className="kucuk">{o.urun?.ad || 'Genel'}</td>
                      <td className="kucuk">
                        <span className="satir" style={{ gap: 8, alignItems: 'center' }}>
                          <span>{sorular(o).length} soru</span>
                          {cevapsizlar(o).length > 0 && (
                            <span className="rz rz--kirmizi">
                              {cevapsizlar(o).length} cevapsız
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="kucuk">
                        {yonlendirme(o) ? (
                          <span className="rz rz--turuncu">
                            {SONUC_ADI[yonlendirme(o)] || yonlendirme(o)}
                          </span>
                        ) : (
                          <span className="rz rz--yesil">Ekranda çözüldü</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="kart">
          {acik ? <OturumDetay oturum={acik} /> : <Bos metin="Soldan oturum seçin." />}
        </div>
      </div>

      <p className="kucuk sonuk">
        Oturum, aynı makinede 30 dakika içindeki hareketlerden oluşuyor; sonrası yeni
        oturum sayılıyor. Çözümlerin tam metni saklanmıyor — o zaten kılavuzun
        kendisinde duruyor.
      </p>
    </>
  )
}

/* ------------------------------------------------------------------ Detay */

const OLAY_ADI = {
  konu: 'Konu seçti',
  soru: 'Hazır soruya dokundu',
  serbest: 'Kendisi yazdı',
  cevap: 'Cevap verildi',
  cevapsiz: 'CEVAP BULUNAMADI',
  cozulmedi: 'Sorun devam ediyor dedi',
  yonlendirme: 'Yönlendirildi',
}

function OturumDetay({ oturum }) {
  return (
    <>
      <div className="kart__tepe">
        <div>
          <div style={{ fontWeight: 700 }}>{oturum.kullanici?.ad || 'Bilinmeyen müşteri'}</div>
          <div className="kucuk sonuk">
            {tarihYaz(oturum.baslangic)} · {oturum.dil === 'tr' ? 'Türkçe' : 'İngilizce'}
          </div>
        </div>
      </div>

      <div className="kart__ic">
        <div style={{ marginBottom: 18 }}>
          <S k="Müşteri No" v={oturum.kullanici?.no} mono />
          <S k="Telefon" v={oturum.kullanici?.tel} mono />
          <S
            k="Konum"
            v={
              oturum.kullanici?.ilce
                ? `${oturum.kullanici.ilce} / ${oturum.kullanici.il}`
                : oturum.kullanici?.il
            }
          />
          <S k="Makine" v={oturum.urun?.ad} />
          <S
            k="Seri No"
            v={oturum.makine?.serial ? formatSerial(oturum.makine.serial) : ''}
            mono
          />
          <S k="Destek Grubu" v={oturum.grup} />
        </div>

        <div
          className="alan__ad"
          style={{ borderBottom: '1px solid var(--cizgi)', paddingBottom: 6, marginBottom: 10 }}
        >
          Konuşmanın Akışı
        </div>

        <div className="zaman">
          {(oturum.olaylar || []).map((o, i) => (
            <div key={i} className="zaman__a">
              <div className={o.tur === 'cevapsiz' ? 'kirmizi-yazi' : undefined}>
                <b>{OLAY_ADI[o.tur] || o.tur}</b>
                {o.deger ? ' · ' + o.deger : ''}
                {o.kayitId ? ' · ' + o.kayitId : ''}
              </div>
              <div className="kucuk sonuk">{tarihYaz(o.tarih)}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function S({ k, v, mono }) {
  if (!v) return null
  return (
    <div className="satir" style={{ gap: 10, alignItems: 'baseline', marginBottom: 5 }}>
      <span className="kucuk sonuk" style={{ minWidth: 105 }}>{k}</span>
      <span className={mono ? 'mono' : undefined}>{v}</span>
    </div>
  )
}

/* ------------------------------------------------------------ Yardımcılar

   Aynı hesaplar hem burada hem Raporlar'da kullanılıyor; oturum
   nesnesinin biçimi tek yerde biliniyor. */

export function sorular(oturum) {
  return (oturum.olaylar || [])
    .filter((o) => o.tur === 'soru' || o.tur === 'serbest')
    .map((o) => o.deger)
    .filter(Boolean)
}

export function konular(oturum) {
  return (oturum.olaylar || [])
    .filter((o) => o.tur === 'konu')
    .map((o) => o.deger)
    .filter(Boolean)
}

/** Cevapsız kalan cümleler: cevapsız olayının hemen öncesindeki soru. */
export function cevapsizlar(oturum) {
  const olaylar = oturum.olaylar || []
  const sonuc = []
  olaylar.forEach((o, i) => {
    if (o.tur !== 'cevapsiz') return
    for (let j = i - 1; j >= 0; j--) {
      if (olaylar[j].tur === 'serbest' || olaylar[j].tur === 'soru') {
        if (olaylar[j].deger) sonuc.push(olaylar[j].deger)
        break
      }
    }
  })
  return sonuc
}

/** Oturum bir talebe/telefona döndüyse hangisine? */
export function yonlendirme(oturum) {
  const y = (oturum.olaylar || []).filter((o) => o.tur === 'yonlendirme')
  return y.length ? y[y.length - 1].deger : null
}

/* --------------------------------------------------------- Excel aktarımı */

const AKTAR_BASLIK = [
  'Tarih', 'Saat', 'Müşteri no', 'Müşteri', 'Telefon', 'İl', 'Makine', 'Seri no',
  'Dil', 'Konular', 'Sorulan', 'Cevapsız kalan', 'Sonuç',
]

function aktarSatiri(o) {
  return [
    ...tarihSaat(o.baslangic),
    o.kullanici?.no || '',
    o.kullanici?.ad || '',
    o.kullanici?.tel || '',
    o.kullanici?.il || '',
    o.urun?.ad || 'Genel',
    o.makine?.serial ? formatSerial(o.makine.serial) : '',
    o.dil === 'tr' ? 'Türkçe' : 'İngilizce',
    konular(o).join(' · '),
    sorular(o).join(' · '),
    cevapsizlar(o).join(' · '),
    yonlendirme(o) ? SONUC_ADI[yonlendirme(o)] || yonlendirme(o) : 'Ekranda çözüldü',
  ]
}
