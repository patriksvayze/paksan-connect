import { useEffect, useMemo, useState } from 'react'
import {
  ACIK_DURUMLAR,
  SIPARIS_DURUM,
  siparisDurumu,
  siparisleriGetir,
} from '../../lib/bayiSiparis'
import { ekAdresi } from '../../lib/ekler'
import { formatSerial } from '../../lib/serial'
import { tarihYaz } from './ortak'
import { islemYaz, izinli } from '../veri'

/* ==========================================================================
   Bayi Siparişleri — PAKSAN tarafı

   Bayi stokunu kendi artıramıyor; artışın tek yolu bu ekran. Bayi
   sipariş veriyor, PAKSAN burada ilerletiyor:

     PAKSAN'a iletildi → Onaylandı → Hazırlanıyor → Gönderildi

   "Gönderildi" işaretlendiği anda bayinin stoku artıyor. Onay ve
   hazırlık adımlarında artmıyor — parça henüz bayide değil. Kargo
   bilgisi burada giriliyor, bayi panelinde görünüyor.

   İPTAL GERİ ALINMIYOR. Kapanmış sipariş (gönderildi/iptal) bir daha
   değişmiyor; yanlışlık olursa yeni sipariş açılıyor. Gönderilmiş
   siparişi geri almak stoku da geri almak demek, o da bayinin elindeki
   gerçek malı yok saymak olurdu.
   ========================================================================== */

/* GARANTİ TALEBİ AYRI SÜZGEÇTE.

   Garanti talebi de bir sipariş — akış birebir aynı ilerliyor. Ama
   PAKSAN'ın orada verdiği karar farklı: parayla satılan bir siparişi
   onaylamakla, bedelsiz parça göndermeyi kabul etmek aynı iş değil.
   İkisi tek listede karışınca garanti talepleri gözden kaçıyordu. */
const SUZGECLER = [
  { id: 'acik', ad: 'Bekleyen' },
  { id: 'garanti', ad: 'Garanti Talepleri' },
  { id: 'kapali', ad: 'Kapanan' },
  { id: 'hepsi', ad: 'Hepsi' },
]

export function BayiSiparisleri({ rol, personel }) {
  const [suzgec, setSuzgec] = useState('acik')
  const [tazele, setTazele] = useState(0)
  const [acik, setAcik] = useState(null)

  const liste = useMemo(() => {
    const hepsi = siparisleriGetir()
    if (suzgec === 'acik') return hepsi.filter((s) => ACIK_DURUMLAR.includes(s.durum))
    if (suzgec === 'garanti') return hepsi.filter((s) => s.tur === 'garanti')
    if (suzgec === 'kapali') return hepsi.filter((s) => !ACIK_DURUMLAR.includes(s.durum))
    return hepsi
  }, [suzgec, tazele])

  /* Yalnız bayi kaydını düzenleyebilen personel siparişi ilerletebiliyor:
     sevkiyat kararı ticari bir karar, her rolün işi değil. */
  const yetkili = izinli(rol, 'bayiDuzenle')

  return (
    <>
      <div className="kart__tepe">
        <h2>Bayi Siparişleri</h2>
        <div className="suzgec" style={{ marginLeft: 'auto' }}>
          {SUZGECLER.map((s) => (
            <button
              key={s.id}
              className={'cip' + (suzgec === s.id ? ' cip--on' : '')}
              onClick={() => setSuzgec(s.id)}
            >
              {s.ad}
            </button>
          ))}
        </div>
      </div>

      {!liste.length && (
        <p className="sonuk" style={{ padding: 20 }}>
          {suzgec === 'acik'
            ? 'Bekleyen sipariş yok.'
            : 'Bu süzgeçte sipariş yok.'}
        </p>
      )}

      {liste.map((s) => (
        <SiparisSatiri
          key={s.id}
          siparis={s}
          acik={acik === s.id}
          onAc={() => setAcik(acik === s.id ? null : s.id)}
          yetkili={yetkili}
          personel={personel}
          onDegisti={() => setTazele((x) => x + 1)}
        />
      ))}
    </>
  )
}

/* ==========================================================================
   Garanti talebinin dayanağı

   Bayi bu talebi bir servis işinin sonunda açıyor; talep boşluktan
   doğmuyor. Dayanağı olmayan bir garanti talebi, PAKSAN'ın neyin
   karşılığında parça gönderdiğini bilmemesi demek — o yüzden burada
   hangi işten doğduğu, hangi makine olduğu ve parçanın nesi olduğu
   yazıyor.

   PARÇANIN NESİ VAR — BAYİNİN VERDİĞİ HÜKÜM DEĞİL

   Bayiye "üretim hatası mı, kullanım hatası mı" diye sorulmuyor;
   sorulsaydı her talepte "üretim hatası" yazardı, çünkü talebinin
   kabulü ona bağlı. Bayi yalnız GÖZLEDİĞİNİ yazıyor: kırıldı,
   aşındı, kaçırıyor. Hükmü PAKSAN veriyor — eski parça eline
   geçtiğinde.
   ========================================================================== */

function GarantiBilgisi({ garanti }) {
  const [adres, setAdres] = useState('')

  useEffect(() => {
    if (!garanti.foto?.id) return
    let iptal = false
    ekAdresi(garanti.foto.id).then((a) => {
      if (!iptal) setAdres(a || '')
    })
    return () => {
      iptal = true
    }
  }, [garanti.foto?.id])

  return (
    <div className="not not--turuncu" style={{ marginBottom: 14 }}>
      <div>
        <strong>Garanti Talebi</strong>
        <p className="kucuk">
          Servis işi <span className="mono">{garanti.talepNo}</span>
          {garanti.seri && (
            <>
              {' · '}
              Makine <span className="mono">{formatSerial(garanti.seri)}</span>
            </>
          )}
        </p>
        <p className="kucuk">
          Parçanın durumu: <b>{garanti.parcaDurumu || '—'}</b>
          {garanti.sureDk ? ` · Süre: ${garanti.sureDk} dakika` : ''}
          {garanti.kim ? ` · İşi yapan: ${garanti.kim}` : ''}
        </p>
        <p className="kucuk">
          {garanti.iade
            ? 'Bayi eski parçayı geri gönderecek.'
            : 'Eski parça geri gönderilmeyecek.'}
        </p>
        {adres && (
          <a href={adres} target="_blank" rel="noreferrer">
            <img
              src={adres}
              alt="Eski parça"
              style={{ maxWidth: 220, borderRadius: 8, marginTop: 8 }}
            />
          </a>
        )}
      </div>
    </div>
  )
}

/* Sıradaki adım tek düğme: personel "şimdi ne olacak" diye durum
   listesinden seçmiyor, akış zaten tek yönlü. */
const SONRAKI = {
  yeni: { durum: 'onaylandi', ad: 'Onayla' },
  onaylandi: { durum: 'hazirlaniyor', ad: 'Hazırlığa Al' },
  hazirlaniyor: { durum: 'gonderildi', ad: 'Gönderildi Olarak İşaretle' },
}

function SiparisSatiri({ siparis, acik, onAc, yetkili, personel, onDegisti }) {
  const [firma, setFirma] = useState('')
  const [takip, setTakip] = useState('')
  const [hata, setHata] = useState('')
  const d = SIPARIS_DURUM[siparis.durum] || SIPARIS_DURUM.yeni
  const sonraki = SONRAKI[siparis.durum]
  const adet = siparis.kalemler.reduce((t, k) => t + Number(k.adet), 0)

  /* Sipariş hareketleri İşlem Kaydı'na da yazılıyor: stoku değiştiren
     tek adım gönderim ve "bu bayinin stoku neden arttı" sorusunun
     cevabı denetlenebilir bir yerde durmalı. */
  function yaz(ozet) {
    islemYaz({ tur: 'siparis', ozet: `${siparis.no} · ${siparis.bayiAd} · ${ozet}`, personel })
  }

  function ilerlet() {
    const kargo = siparis.durum === 'hazirlaniyor' ? { firma, takipNo: takip } : undefined
    const sonuc = siparisDurumu(siparis.id, sonraki.durum, personel, kargo)
    if (sonuc.hata) return setHata(sonuc.hata)
    yaz(
      sonraki.durum === 'gonderildi'
        ? `gönderildi · stok işlendi${takip ? ' · ' + (firma || 'kargo') + ' ' + takip : ''}`
        : SIPARIS_DURUM[sonraki.durum].ad.toLocaleLowerCase('tr-TR'),
    )
    onDegisti()
  }

  function iptal() {
    const sonuc = siparisDurumu(siparis.id, 'iptal', personel)
    if (sonuc.hata) return setHata(sonuc.hata)
    yaz('iptal edildi')
    onDegisti()
  }

  return (
    <div className="kart" style={{ marginBottom: 10 }}>
      <button
        className="siparis-bas"
        onClick={onAc}
        aria-expanded={acik}
      >
        <span className={'rz rz--' + d.ton}>{d.ad}</span>
        {siparis.tur === 'garanti' && <span className="rz rz--turuncu">Garanti</span>}
        <strong>{siparis.bayiAd}</strong>
        <span className="mono kucuk sonuk">{siparis.no}</span>
        <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>
          {siparis.kalemler.length} kalem · {adet} adet · {tarihYaz(siparis.tarih, false)}
        </span>
      </button>

      {acik && (
        <div className="kart__ic">
          {siparis.garanti && <GarantiBilgisi garanti={siparis.garanti} />}

          <table>
            <thead>
              <tr>
                <th>Kalem</th>
                <th>Tür</th>
                <th style={{ textAlign: 'right' }}>Adet</th>
              </tr>
            </thead>
            <tbody>
              {siparis.kalemler.map((k) => (
                <tr key={k.tur + k.anahtar}>
                  <td>{k.ad}</td>
                  <td>{k.tur === 'makine' ? 'Makine' : 'Yedek parça'}</td>
                  <td style={{ textAlign: 'right' }}>{k.adet}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {siparis.not && (
            <p style={{ marginTop: 12 }}>
              <span className="kucuk sonuk">Bayinin Notu</span>
              <br />
              {siparis.not}
            </p>
          )}

          {siparis.kargo?.takipNo && (
            <p className="kucuk" style={{ marginTop: 12 }}>
              Kargo: {siparis.kargo.firma || '—'} · {siparis.kargo.takipNo}
            </p>
          )}

          <div className="zaman" style={{ marginTop: 12 }}>
            {(siparis.gecmis || []).map((g, i) => (
              <div key={i} className="kucuk sonuk">
                {SIPARIS_DURUM[g.durum]?.ad || g.durum} · {tarihYaz(g.tarih)} · {g.kim}
              </div>
            ))}
          </div>

          {yetkili && sonraki && (
            <>
              {/* Kargo bilgisi yalnız gönderim adımında soruluyor;
                  önceki adımlarda henüz kargo yok. */}
              {siparis.durum === 'hazirlaniyor' && (
                <div className="esit" style={{ marginTop: 14 }}>
                  <label className="alan">
                    <span className="alan__ad">Kargo Firması</span>
                    <input
                      className="gir"
                      value={firma}
                      onChange={(e) => setFirma(e.target.value)}
                      placeholder="Örnek: Aras Kargo"
                    />
                  </label>
                  <label className="alan">
                    <span className="alan__ad">Takip Numarası</span>
                    <input
                      className="gir mono"
                      value={takip}
                      onChange={(e) => setTakip(e.target.value)}
                    />
                  </label>
                </div>
              )}

              {hata && <div className="uyari">{hata}</div>}

              <div className="satir" style={{ marginTop: 12 }}>
                <button className="dg dg--ana" onClick={ilerlet}>
                  {sonraki.ad}
                </button>
                <button className="dg" onClick={iptal}>
                  Siparişi İptal Et
                </button>
              </div>

              {siparis.durum === 'hazirlaniyor' && (
                <p className="kucuk sonuk" style={{ marginTop: 8 }}>
                  Gönderildi olarak işaretlenince ürünler bayinin stokuna
                  eklenecek.
                </p>
              )}
            </>
          )}

          {!yetkili && (
            <p className="kucuk sonuk" style={{ marginTop: 12 }}>
              Siparişi ilerletmek için bayi düzenleme yetkisi gerekiyor.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
