import { useMemo, useState } from 'react'
import {
  geriBildirimGetir, geriBildirimKapat, geriBildirimNotEkle, geriBildirimOkundu,
  gorusCevaplanabilirMi, gorusDurumu, notMusteriyeMi,
} from '../veri'
import { useVeri } from '../kanca'
import { Baslik, Bekleme, Bos, gecenSure, tarihYaz } from './ortak'
import { Secim, SuzgecCubugu } from './suzgec'
import { DisaAktar } from './aktar'
import { kayitTelGoster } from '../../lib/tel'

/* ==========================================================================
   Geri bildirimler

   Uygulamada Profil > Görüş ve önerileriniz'den gelen mesajlar.

   8 EKİM 2026'DA GENİŞLEDİ (kullanıcının seçimi: "Konu seçimi",
   "Backoffice'te durum ve süzgeç", "İç not ile cevabı ayırma"). Önce
   tek liste vardı: okunmamışlar üstte, her nota yazılan cevap müşteriye
   gidiyordu, arama ve Excel yoktu. Şimdi:

     · DURUM  Yeni / Cevaplandı / Kapatıldı (veri.js → gorusDurumu; ayrı
              alan yok, kayıttan türüyor). Süzgeç çipleri sayılarıyla.
     · KONU   çiftçinin seçtiği konu; eski kayıtta "Konu seçilmemiş".
     · ARAMA  görüş metninde, adda, telefonda ve numarada.
     · İKİ TÜR NOT  "Cevap Yaz" müşterinin Bildirimler ekranına gidiyor;
              "İç Not Ekle" yalnız personelde kalıyor. Görüş bir hesaba
              bağlı değilse cevap düğmesi yok, nedeni yazıyor (önce
              "Cevap gönderildi" deniyordu, oysa kimseye bir şey gitmiyordu).
     · MÜŞTERİ KARTI  görüş bir hesaba bağlıysa Müşteriler'de o kart
              açılıyor.
     · EXCEL  ekranda süzülmüş liste iniyor.
   ========================================================================== */

const DURUMLAR = [
  { id: 'hepsi', ad: 'Hepsi' },
  { id: 'yeni', ad: 'Yeni', rozet: 'rz--turuncu' },
  { id: 'cevaplandi', ad: 'Cevaplandı', rozet: 'rz--yesil' },
  { id: 'kapandi', ad: 'Kapatıldı', rozet: 'rz--gri' },
]
const DURUM_ADI = Object.fromEntries(DURUMLAR.map((d) => [d.id, d]))

/* Çiftçinin seçtiği konular (screens/Profile.jsx → GORUS_KONULARI ile aynı kimlikler). */
const KONULAR = [
  { id: 'oneri', ad: 'Öneri' },
  { id: 'sorun', ad: 'Sorun' },
  { id: 'tesekkur', ad: 'Teşekkür' },
  { id: 'diger', ad: 'Diğer' },
]
const KONU_YOK = 'Konu seçilmemiş'
const konuAdi = (g) => KONULAR.find((k) => k.id === g.konu)?.ad || KONU_YOK

const AKTAR_BASLIK = [
  'Numara', 'Tarih', 'Konu', 'Durum', 'Ad soyad', 'Telefon',
  'Görüş', 'Cevaplar', 'İç notlar', 'Uygulama dili', 'Uygulama sürümü',
]

function aktarSatiri(g) {
  const notlar = g.notlar || []
  return [
    g.no || '',
    tarihYaz(g.tarih),
    konuAdi(g),
    DURUM_ADI[gorusDurumu(g)].ad,
    g.ad || '',
    kayitTelGoster(g) || '',
    g.metin || '',
    notlar.filter(notMusteriyeMi).map((n) => `${n.metin} (${n.personel})`).join(' | '),
    notlar.filter((n) => !notMusteriyeMi(n)).map((n) => `${n.metin} (${n.personel})`).join(' | '),
    (g.dil || '').toUpperCase(),
    g.surum || '',
  ]
}

export function GeriBildirimler({ personel, bildir, tazele, surum, git }) {
  const { veri: liste, yukleniyor } = useVeri(() => geriBildirimGetir(), [surum], [])
  const [durum, setDurum] = useState('hepsi')
  const [konu, setKonu] = useState('hepsi')
  const [ara, setAra] = useState('')
  const okunmamis = liste.filter((g) => !g.okundu).length

  const sayilar = useMemo(() => {
    const s = { hepsi: liste.length, yeni: 0, cevaplandi: 0, kapandi: 0 }
    liste.forEach((g) => { s[gorusDurumu(g)] += 1 })
    return s
  }, [liste])

  const gosterilen = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase('tr-TR')
    const rakam = q.replace(/\D/g, '')
    return liste
      .filter((g) => durum === 'hepsi' || gorusDurumu(g) === durum)
      .filter((g) => konu === 'hepsi' || (konu === 'yok' ? !g.konu : g.konu === konu))
      .filter((g) => {
        if (!q) return true
        const alanlar = [g.metin, g.ad, g.no].filter(Boolean).map((x) => String(x).toLocaleLowerCase('tr-TR'))
        if (alanlar.some((x) => x.includes(q))) return true
        /* Telefon yazılışından bağımsız: yalnız rakamlar. */
        return rakam.length >= 3 && String(g.tel || '').replace(/\D/g, '').includes(rakam)
      })
      /* Okunmamış üstte, sonra en yeni. */
      .sort((a, b) => (a.okundu === b.okundu ? b.tarih - a.tarih : a.okundu ? 1 : -1))
  }, [liste, durum, konu, ara])

  return (
    <>
      <Baslik
        ad="Geri Bildirimler"
        sag={
          <div className="satir" style={{ gap: 12, alignItems: 'center' }}>
            <span className="kucuk sonuk">{okunmamis} okunmamış / {liste.length}</span>
            <DisaAktar
              ad="Geri Bildirimler"
              basliklar={AKTAR_BASLIK}
              satirlar={gosterilen.map(aktarSatiri)}
              personel={personel}
            />
          </div>
        }
      />

      <div className="suzgec" style={{ marginBottom: 12 }} data-suzgec="gorus-durum">
        {DURUMLAR.map((d) => (
          <button
            key={d.id}
            className={'cip' + (durum === d.id ? ' cip--on' : '')}
            data-gorus-durum={d.id}
            onClick={() => setDurum(d.id)}
          >
            {d.ad} · {sayilar[d.id]}
          </button>
        ))}
      </div>

      <SuzgecCubugu>
        <Secim
          ad="Konu"
          deger={konu}
          onDegis={setKonu}
          secenekler={[
            { deger: 'hepsi', ad: 'Tüm konular' },
            ...KONULAR.map((k) => ({ deger: k.id, ad: k.ad })),
            { deger: 'yok', ad: KONU_YOK },
          ]}
          genislik={170}
        />
        <label className="secim-alan secim-alan--genis">
          <span className="secim-alan__ad">Ara</span>
          <input
            className="sec"
            value={ara}
            onChange={(e) => setAra(e.target.value)}
            placeholder="Görüş, ad, telefon veya numara ara"
          />
        </label>
      </SuzgecCubugu>

      <div className="kart">
        {yukleniyor ? (
          <Bekleme satir={3} />
        ) : liste.length === 0 ? (
          <Bos metin="Geri bildirim yok." />
        ) : gosterilen.length === 0 ? (
          <Bos metin="Seçtiğiniz süzgeçlere uyan geri bildirim yok." />
        ) : (
          <div className="satirlar">
            {gosterilen.map((g) => (
              <Gorus key={g.id} gorus={g} personel={personel} bildir={bildir} tazele={tazele} git={git} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function Gorus({ gorus, personel, bildir, tazele, git }) {
  const [not, setNot] = useState('')
  /* null | 'cevap' | 'ic' */
  const [yaziyor, setYaziyor] = useState(null)
  const d = gorusDurumu(gorus)
  const cevaplanabilir = gorusCevaplanabilirMi(gorus)
  const kapali = d === 'kapandi'

  function gonder() {
    const metin = not.trim()
    if (metin.length < 3) return
    const { gitti } = geriBildirimNotEkle(gorus, metin, personel, { musteriye: yaziyor === 'cevap' })
    setNot('')
    setYaziyor(null)
    tazele()
    bildir(yaziyor === 'cevap' && gitti ? 'Cevap gönderildi ve müşterinin bildirimlerinde görünüyor.' : 'İç not eklendi.')
  }

  return (
    <div className={'kalem' + (gorus.okundu ? '' : ' kalem--yeni')} data-gorus={gorus.no || gorus.id}>
      <div className="kalem__gov">
        <div className="satir" style={{ gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
          <span className={'rz ' + DURUM_ADI[d].rozet} data-gorus-durum-rozet={d}>{DURUM_ADI[d].ad}</span>
          <span className="rz rz--mavi">{konuAdi(gorus)}</span>
        </div>
        <div style={{ whiteSpace: 'pre-wrap' }}>{gorus.metin}</div>

        {/* Numara her ekranda aynı biçimde, ülke koduyla (25 Eylül 2026,
            lib/tel.js → kayitTelGoster). Ülkesi yazılmamış eski görüşte
            Türkiye. Dil ve sürüm hangi ekranın ve hangi baskının
            konuşulduğunu söylüyor (kayıtta vardı, gösterilmiyordu). */}
        <div className="kalem__alt">
          <span className="mono">{gorus.no || '—'}</span> · {gorus.ad || 'İsimsiz'} ·{' '}
          <span className="mono">{kayitTelGoster(gorus) || '—'}</span> · {gecenSure(gorus.tarih)}
        </div>
        {(gorus.dil || gorus.surum) && (
          <div className="kalem__alt">
            {[gorus.dil && `Uygulama dili: ${gorus.dil.toUpperCase()}`, gorus.surum && `Uygulama sürümü: ${gorus.surum}`]
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}

        {gorus.okundu && gorus.okuyan && (
          <div className="kalem__alt">
            Okundu: {gorus.okuyan}
            {gorus.okumaTarih ? ` · ${tarihYaz(gorus.okumaTarih)}` : ''}
          </div>
        )}
        {kapali && (
          <div className="kalem__alt">
            {DURUM_ADI.kapandi.ad}: {gorus.kapandi.personel} · {tarihYaz(gorus.kapandi.tarih)}
          </div>
        )}

        {gorus.notlar?.length > 0 && (
          <div className="cevap">
            {gorus.notlar.map((n, i) => {
              const musteriye = notMusteriyeMi(n)
              return (
                <div key={i} className={'cevap__a' + (musteriye ? '' : ' cevap__a--ic')}>
                  <div>{n.metin}</div>
                  <div className="kucuk sonuk">
                    {n.personel} · {tarihYaz(n.tarih)}
                    <span className={'rz ' + (musteriye ? 'rz--mavi' : 'rz--gri')} style={{ marginLeft: 8 }}>
                      {musteriye ? 'Müşteriye gönderildi' : 'İç not'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!cevaplanabilir && !kapali && (
          <p className="kucuk sonuk" style={{ margin: '10px 0 0' }} data-uyari="gorus-hesapsiz">
            Bu görüş uygulamadaki bir hesaba bağlı değil. Müşteriye cevap gönderilemez. İç not ekleyebilirsiniz.
          </p>
        )}

        {yaziyor && (
          <div style={{ marginTop: 12 }}>
            <textarea
              className="metin"
              style={{ minHeight: 66 }}
              value={not}
              maxLength={2000}
              onChange={(e) => setNot(e.target.value)}
              placeholder={yaziyor === 'cevap' ? 'Müşterinin bildirimlerinde görünecek cevabı yazın' : 'Bu notu yalnız PAKSAN personeli görür.'}
              autoFocus
            />
            <div className="satir" style={{ marginTop: 8 }}>
              <button className="dg dg--ana" disabled={not.trim().length < 3} onClick={gonder}>
                {yaziyor === 'cevap' ? 'Cevabı Gönder' : 'Notu Kaydet'}
              </button>
              <button className="dg" onClick={() => { setYaziyor(null); setNot('') }}>Vazgeç</button>
            </div>
          </div>
        )}
      </div>

      {!yaziyor && (
        <div className="satir" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 360 }}>
          {cevaplanabilir && !kapali && (
            <button className="dg" data-eylem="gorus-cevap" onClick={() => setYaziyor('cevap')}>Cevap Yaz</button>
          )}
          <button className="dg" data-eylem="gorus-ic-not" onClick={() => setYaziyor('ic')}>İç Not Ekle</button>
          <button
            className="dg"
            data-eylem={kapali ? 'gorus-yeniden-ac' : 'gorus-kapat'}
            onClick={() => {
              geriBildirimKapat(gorus.id, personel, !kapali)
              tazele()
              bildir(kapali ? 'Görüş yeniden açıldı.' : 'Görüş kapatıldı.')
            }}
          >
            {kapali ? 'Yeniden Aç' : 'Görüşü Kapat'}
          </button>
          {!gorus.okundu && (
            <button
              className="dg"
              onClick={() => {
                geriBildirimOkundu(gorus.id, personel)
                tazele()
                bildir('Okundu işaretlendi')
              }}
            >
              Okundu
            </button>
          )}
          {gorus.musteriId && git && (
            <button className="dg" data-eylem="gorus-musteri" onClick={() => git('musteriler', { musteriId: gorus.musteriId })}>
              Müşteri Kartını Aç
            </button>
          )}
        </div>
      )}
    </div>
  )
}
