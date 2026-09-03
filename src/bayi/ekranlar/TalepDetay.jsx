import { useState } from 'react'
import { talepKapat, talepNotEkle, talepPlanla } from '../../backoffice/veri'

/* ==========================================================================
   Bayi paneli — talep detayı

   DURUM ADI GEÇMİYOR. Bayi "incelemede", "planlandı" gibi kelimeler
   görmüyor; yaptığı işi anlatan düğmelere basıyor. Durum arka planda
   mevcut model üzerinden ilerliyor, böylece raporlar ve müşteri
   bildirimleri değişmeden çalışıyor.

     Randevu ver          → talepPlanla()   → planlandi
     İşi tamamladım       → talepKapat()    → kapandi
     Parçayı gönderdim    → talepKapat()    → kapandi
     PAKSAN'dan destek    → destekTalepEt() → sahiplik PAKSAN'a geçer

   Talep PAKSAN'a devredildiyse bayi işlem yapmıyor ama takip ediyor:
   müşteri hâlâ onun müşterisi.
   ========================================================================== */

const TUR_ADI = { servis: 'Servis', parca: 'Yedek Parça', satinalma: 'Fiyat Teklifi' }

export function TalepDetay({ talep, bayiAd, onKapat, onDestekIste }) {
  const [pencere, setPencere] = useState(null)
  const paksanda = (talep.sahip || 'paksan') === 'paksan'
  const kapali = ['kapandi', 'iptal'].includes(talep.status)

  return (
    <div className="bayi-govde">
      <div className="bayi-tepe">
        <button className="dg" onClick={onKapat}>Geri</button>
        <div>
          <div className="bayi-tepe__ad">{talep.ad || '—'}</div>
          <div className="bayi-tepe__alt mono">{talep.no}</div>
        </div>
      </div>

      <div className="kart" style={{ padding: 16 }}>
        <div className="bayi-talep__ust">
          <span className={'tur tur--' + talep.tur}>
            {TUR_ADI[talep.tur] || talep.tur}
          </span>
        </div>

        <Satir ad="Telefon" deger={talep.tel} />
        <Satir
          ad="Konum"
          deger={talep.ilce ? `${talep.ilce} / ${talep.il}` : talep.il}
        />
        {talep.makine?.serial && <Satir ad="Makine" deger={talep.makine.serial} />}
        {talep.durum && <Satir ad="Makinenin durumu" deger={talep.durum} />}
        {talep.belirtiler?.length > 0 && (
          <Satir ad="Belirtiler" deger={talep.belirtiler.join(', ')} />
        )}
        {talep.parcalar?.length > 0 && (
          <Satir ad="İstenen parçalar" deger={talep.parcalar.join(', ')} />
        )}
        {talep.aciklama && <Satir ad="Müşterinin anlattığı" deger={talep.aciklama} />}
        {talep.ulasim && <Satir ad="Aranma tercihi" deger={talep.ulasim} />}
      </div>

      {paksanda && talep.devir && (
        <div className="bayi-devir">
          <strong>Bu talebe PAKSAN destek veriyor.</strong>
          <div className="kucuk sonuk" style={{ marginTop: 4 }}>
            Müşteri hâlâ sizin müşteriniz. PAKSAN'ın attığı adımları burada
            görmeye devam edeceksiniz.
          </div>
        </div>
      )}

      {kapali && (
        <div className="bayi-devir">
          <strong>Bu talep tamamlandı.</strong>
        </div>
      )}

      {!kapali && !paksanda && (
        <div className="bayi-islem">
          {talep.tur === 'servis' && (
            <button className="dg" onClick={() => setPencere('randevu')}>
              Randevu ver
            </button>
          )}
          {talep.tur === 'parca' ? (
            <button className="dg dg--ana" onClick={() => setPencere('gonderdim')}>
              Parçayı gönderdim
            </button>
          ) : (
            <button className="dg dg--ana" onClick={() => setPencere('tamamladim')}>
              İşi tamamladım
            </button>
          )}
          <button className="dg" onClick={() => setPencere('not')}>
            Not ekle
          </button>
          <button className="dg" onClick={() => setPencere('destek')}>
            PAKSAN'dan destek iste
          </button>
        </div>
      )}

      {pencere === 'randevu' && (
        <Randevu
          talep={talep}
          bayiAd={bayiAd}
          onKapat={() => setPencere(null)}
          onBitti={onKapat}
        />
      )}
      {(pencere === 'tamamladim' || pencere === 'gonderdim') && (
        <Kapanis
          talep={talep}
          bayiAd={bayiAd}
          parca={pencere === 'gonderdim'}
          onKapat={() => setPencere(null)}
          onBitti={onKapat}
        />
      )}
      {pencere === 'not' && (
        <Not
          talep={talep}
          bayiAd={bayiAd}
          onKapat={() => setPencere(null)}
          onBitti={onKapat}
        />
      )}
      {pencere === 'destek' && (
        <Destek onKapat={() => setPencere(null)} onGonder={onDestekIste} />
      )}
    </div>
  )
}

function Satir({ ad, deger }) {
  if (!deger) return null
  return (
    <div style={{ marginTop: 10 }}>
      <div className="kucuk sonuk">{ad}</div>
      <div>{deger}</div>
    </div>
  )
}

/* Pencere kabuğu; backoffice'teki Form kalıbının aynısı. */
function Pencere({ baslik, children, onKapat }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(10,26,51,.45)',
        display: 'grid', placeItems: 'center', padding: 20, zIndex: 50,
      }}
      onClick={(e) => e.target === e.currentTarget && onKapat()}
    >
      <div className="kart" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="kart__tepe">
          <h2>{baslik}</h2>
          <button className="dg" style={{ marginLeft: 'auto' }} onClick={onKapat}>
            Kapat
          </button>
        </div>
        <div className="kart__ic">{children}</div>
      </div>
    </div>
  )
}

function Randevu({ talep, bayiAd, onKapat, onBitti }) {
  const [tarih, setTarih] = useState('')
  const [is, setIs] = useState('')
  const [hata, setHata] = useState('')

  function kaydet() {
    if (!tarih) return setHata('Gideceğiniz tarihi seçin.')
    if (is.trim().length < 3) return setHata('Ne yapılacağını kısaca yazın.')
    const g = new Date(tarih)
    talepPlanla(
      talep,
      {
        tarih: g.getTime(),
        tarihYazi: g.toLocaleDateString('tr-TR'),
        is: is.trim(),
        gorusuldu: true,
      },
      bayiAd,
    )
    onBitti()
  }

  return (
    <Pencere baslik="Randevu ver" onKapat={onKapat}>
      <label className="alan">
        <span className="alan__ad">Gideceğiniz tarih</span>
        <input className="gir" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
      </label>
      <label className="alan">
        <span className="alan__ad">Ne yapılacak</span>
        <input
          className="gir"
          value={is}
          onChange={(e) => setIs(e.target.value)}
          placeholder="Örnek: Düğüm atıcı kontrolü"
        />
      </label>
      {hata && <div className="uyari">{hata}</div>}
      <div className="satir">
        <button className="dg dg--ana" onClick={kaydet}>Kaydet</button>
        <button className="dg" onClick={onKapat}>Vazgeç</button>
      </div>
    </Pencere>
  )
}

function Kapanis({ talep, bayiAd, parca, onKapat, onBitti }) {
  const [ozet, setOzet] = useState('')
  const [hata, setHata] = useState('')

  function kaydet() {
    if (ozet.trim().length < 3) {
      return setHata(parca ? 'Ne gönderdiğinizi yazın.' : 'Yaptığınız işi yazın.')
    }
    talepKapat(talep, { ozet: ozet.trim() }, bayiAd)
    onBitti()
  }

  return (
    <Pencere baslik={parca ? 'Parçayı gönderdim' : 'İşi tamamladım'} onKapat={onKapat}>
      <label className="alan">
        <span className="alan__ad">{parca ? 'Ne gönderdiniz' : 'Ne yaptınız'}</span>
        <textarea
          className="gir"
          rows={3}
          value={ozet}
          onChange={(e) => setOzet(e.target.value)}
          placeholder={parca ? 'Örnek: 2 adet düğüm bıçağı kargoya verildi' : 'Örnek: İp kılavuzu değiştirildi'}
        />
      </label>
      {hata && <div className="uyari">{hata}</div>}
      <div className="satir">
        <button className="dg dg--ana" onClick={kaydet}>Kaydet</button>
        <button className="dg" onClick={onKapat}>Vazgeç</button>
      </div>
    </Pencere>
  )
}

function Not({ talep, bayiAd, onKapat, onBitti }) {
  const [metin, setMetin] = useState('')
  const [hata, setHata] = useState('')

  function kaydet() {
    if (metin.trim().length < 3) return setHata('Notunuzu yazın.')
    talepNotEkle(talep, metin.trim(), bayiAd)
    onBitti()
  }

  return (
    <Pencere baslik="Not ekle" onKapat={onKapat}>
      <p className="kucuk sonuk" style={{ marginTop: 0 }}>
        Bu not müşteriye gitmiyor; talebin kaydında duruyor.
      </p>
      <label className="alan">
        <span className="alan__ad">Not</span>
        <textarea className="gir" rows={3} value={metin} onChange={(e) => setMetin(e.target.value)} />
      </label>
      {hata && <div className="uyari">{hata}</div>}
      <div className="satir">
        <button className="dg dg--ana" onClick={kaydet}>Kaydet</button>
        <button className="dg" onClick={onKapat}>Vazgeç</button>
      </div>
    </Pencere>
  )
}

function Destek({ onKapat, onGonder }) {
  const [neden, setNeden] = useState('')
  const [hata, setHata] = useState('')

  return (
    <Pencere baslik="PAKSAN'dan destek iste" onKapat={onKapat}>
      <p className="kucuk sonuk" style={{ marginTop: 0 }}>
        Talep PAKSAN'a geçecek ama müşteri sizin müşteriniz olmaya devam
        edecek. PAKSAN'ın attığı adımları burada görmeye devam
        edeceksiniz.
      </p>
      <label className="alan">
        <span className="alan__ad">Neden destek istiyorsunuz</span>
        <textarea
          className="gir"
          rows={3}
          value={neden}
          onChange={(e) => setNeden(e.target.value)}
          placeholder="Örnek: Sorunu yerinde göremedik, elektronik arıza olabilir"
        />
      </label>
      {hata && <div className="uyari">{hata}</div>}
      <div className="satir">
        <button
          className="dg dg--ana"
          onClick={() => {
            if (neden.trim().length < 3) return setHata('Kısaca sebebini yazın.')
            onGonder(neden.trim())
          }}
        >
          Destek iste
        </button>
        <button className="dg" onClick={onKapat}>Vazgeç</button>
      </div>
    </Pencere>
  )
}
