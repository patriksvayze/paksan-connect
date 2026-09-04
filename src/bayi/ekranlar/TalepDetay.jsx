import { useState } from 'react'
import { talepKapat, talepNotEkle, talepPlanla } from '../../backoffice/veri'
import { parcaAdedi, stokDus } from '../../lib/bayiStok'
import { Sayfa } from '../Kabuk'
import {
  extractYear,
  formatSerial,
  matchProduct,
  warrantyStatus,
  GARANTI_YIL,
} from '../../lib/serial'
import {
  IconBook,
  IconCalendar,
  IconCheckCircle,
  IconPhone,
  IconRight,
  IconShield,
} from '../../components/Icons'

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

export function TalepDetay({ talep, bayiAd, bayiId, onKapat, onDestekIste }) {
  const [pencere, setPencere] = useState(null)
  const paksanda = (talep.sahip || 'paksan') === 'paksan'
  const kapali = ['kapandi', 'iptal'].includes(talep.status)
  const islemVar = !kapali && !paksanda

  /* ASIL İŞLEM EKRANIN DİBİNE YAPIŞIK.

     Dört düğme yan yana dururken hangisinin asıl iş olduğu belli
     değildi. Bayinin bu ekranda yapacağı tek şey var: işi bitirmek.
     O düğme altta, parmağın durduğu yerde ve tek başına; ötekiler
     detayın içinde, sırası gelince bakılan seçenekler. */
  const asilIslem = islemVar && (
    <button
      className="dg dg--ana dg--blok"
      onClick={() => setPencere(talep.tur === 'parca' ? 'gonderdim' : 'tamamladim')}
    >
      {talep.tur === 'parca' ? 'Parçayı gönderdim' : 'İşi tamamladım'}
    </button>
  )

  return (
    <Sayfa
      baslik={talep.ad || '—'}
      alt={talep.no}
      onGeri={onKapat}
      dip={asilIslem}
    >
      <div className="kart" style={{ padding: 16 }}>
        <div className="is__ust">
          <span className={'tur tur--' + talep.tur}>
            {TUR_ADI[talep.tur] || talep.tur}
          </span>
        </div>

        {/* Numara dokunulabilir: bayi ezberleyip tuşlamıyor. Listedeki
            arama düğmesinin aynısı, burada satır hâlinde. */}
        {talep.tel && (
          <div style={{ marginTop: 10 }}>
            <div className="kucuk sonuk">Telefon</div>
            <a className="ara-satir" href={'tel:' + String(talep.tel).replace(/\D/g, '')}>
              <IconPhone size={19} />
              <span className="mono">{talep.tel}</span>
            </a>
          </div>
        )}
        <Satir
          ad="Konum"
          deger={talep.ilce ? `${talep.ilce} / ${talep.il}` : talep.il}
        />
        {talep.makine?.serial && <Makine makine={talep.makine} />}
        {talep.durum && <Satir ad="Makinenin durumu" deger={talep.durum} />}
        {talep.belirtiler?.length > 0 && (
          <Satir ad="Belirtiler" deger={talep.belirtiler.join(', ')} />
        )}
        {talep.parcalar?.length > 0 && (
          <ParcaDurumu talep={talep} bayiId={bayiId} />
        )}
        {talep.aciklama && <Satir ad="Müşterinin anlattığı" deger={talep.aciklama} />}
        {talep.ulasim && <Satir ad="Aranma tercihi" deger={talep.ulasim} />}
      </div>

      {/* RANDEVU ALINMIŞ TALEP AYNI EKRANI GÖSTERMEMELİ.

          Randevu verildikten sonra talep bayi tarafında yine "bekleyen"
          listesinde duruyor (doğrusu da bu, iş bitmedi) ama detayı yeni
          gelmiş bir taleple birebir aynı görünüyordu: bayi randevu
          verdiğini unutup ikinci kez veriyordu. */}
      {talep.plan && !kapali && (
        <div className="not not--mavi">
          <IconCalendar size={19} />
          <div>
            <strong>Randevu verildi · {talep.plan.tarihYazi}</strong>
            <p>
              {talep.plan.is}
              {talep.plan.gorusuldu ? ' · müşteriyle görüşüldü' : ''}
            </p>
          </div>
        </div>
      )}

      {paksanda && talep.devir && (
        <div className="not not--mavi">
          <IconShield size={19} />
          <div>
            <strong>PAKSAN bu talebe destek veriyor.</strong>
            <p>
              Müşteri hâlâ sizin müşteriniz. PAKSAN'ın attığı adımları
              burada görmeye devam edeceksiniz.
            </p>
          </div>
        </div>
      )}

      {kapali && (
        <div className="not not--yesil">
          <IconCheckCircle size={19} />
          <div>
            <strong>Bu talep tamamlandı.</strong>
          </div>
        </div>
      )}

      {islemVar && (
        <div className="secenek">
          {talep.tur === 'servis' && (
            <button className="secenek__dg" onClick={() => setPencere('randevu')}>
              <IconCalendar size={19} />
              {talep.plan ? 'Randevuyu değiştir' : 'Randevu'}
              <IconRight size={17} />
            </button>
          )}
          <button className="secenek__dg" onClick={() => setPencere('not')}>
            <IconBook size={19} />
            Not ekle
            <IconRight size={17} />
          </button>
          <button className="secenek__dg" onClick={() => setPencere('destek')}>
            <IconShield size={19} />
            PAKSAN'dan destek iste
            <IconRight size={17} />
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
          bayiId={bayiId}
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
    </Sayfa>
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

/* MAKİNE VE GARANTİ.

   Bayinin ilk sorduğu şey bu: iş garanti kapsamında mı, ücret alacak mı?
   Eskiden yalnız seri numarası yazıyordu, bayi yılı kafasından
   hesaplıyordu.

   Yıl ve model seri numarasından çıkıyor (bkz. lib/serial.js), ayrıca
   bir yere kaydedilmesi gerekmiyor. Etiket burada Türkçe yazılı çünkü
   bayi paneli tek dilli; `warrantyStatus` sözlük anahtarı döndürüyor ve
   bu tarafta sözlük yok. Metinler `i18n/tr.js` içindekilerle birebir
   aynı tutuluyor: müşteri ve bayi aynı makineye baktığında aynı şeyi
   okumalı. */
const GARANTI_YAZI = {
  bilinmiyor: () => 'Garanti bilgisi yok',
  devam: (kalan) => `Garanti devam ediyor · ${kalan} yıl`,
  son: () => 'Garantinin son yılı',
  bitti: () => 'Garanti süresi doldu',
}

function Makine({ makine }) {
  const yil = extractYear(makine.serial)
  const durum = warrantyStatus(yil)
  const kalan = yil ? yil + GARANTI_YIL - new Date().getFullYear() : 0
  const model = matchProduct(makine.serial)?.product?.name

  return (
    <div style={{ marginTop: 10 }}>
      <div className="kucuk sonuk">Makine</div>
      <div className="mono">{formatSerial(makine.serial)}</div>
      {model && <div className="kucuk">{model}</div>}
      <div className={'garanti garanti--' + durum.state}>
        {(GARANTI_YAZI[durum.state] || GARANTI_YAZI.bilinmiyor)(kalan)}
        {yil ? ` · ${yil} üretimi` : ''}
      </div>
    </div>
  )
}

/* İstenen parçaların yanında bayinin kendi stoğu.

   Sayı bir BİLGİ, kilit değil: stok sıfır olsa da "Parçayı gönderdim"
   düğmesi açık kalıyor. Bayiyi kendi stok kaydının doğruluğuna
   hapsetmek, ilk yanlış sayımda paneli kullanılmaz yapardı.

   "Girilmedi" ile "0" ayrı yazılıyor: biri "ben bu parçayı takip
   etmiyorum", diğeri "bende yok". */
function ParcaDurumu({ talep, bayiId }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div className="kucuk sonuk">İstenen parçalar</div>
      {talep.parcalar.map((ad) => {
        const adet = parcaAdedi(bayiId, ad)
        const istenen = Number(talep.parcaAdet?.[ad]) || 1
        return (
          <div key={ad} className="satir" style={{ gap: 8, alignItems: 'baseline' }}>
            <span>
              {ad}
              {istenen > 1 && <span className="kucuk sonuk"> × {istenen}</span>}
            </span>
            <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>
              {adet === null
                ? 'stok girilmedi'
                : adet === 0
                  ? 'stokta yok'
                  : `stokta ${adet}`}
            </span>
          </div>
        )
      })}
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

/* "Ne yapılacak" alanı kaldırıldı; yerine türden çıkarılıyor.

   O alan müşterinin bildirimine gidiyor (bkz. talepPlanla → plan.is).
   Boş bırakılamazdı, ama bayiden ayrıca yazmasını istemek gereksizdi:
   yapılacak iş zaten talebin türü. Müşteri de "servis ziyareti" diye
   okuyor, bayinin yazdığı serbest metni değil. */
const PLAN_ISI = {
  servis: 'Servis ziyareti',
  parca: 'Parça teslimi',
  satinalma: 'Görüşme',
}

function Randevu({ talep, bayiAd, onKapat, onBitti }) {
  /* Var olan randevu varsa kutular onunla doluyor: bayi tarihi
     değiştirmek için baştan yazmıyor. */
  const [tarih, setTarih] = useState(() =>
    talep.plan?.tarih ? new Date(talep.plan.tarih).toISOString().slice(0, 10) : '',
  )
  const [onay, setOnay] = useState(false)
  const [hata, setHata] = useState('')
  const degisiklik = Boolean(talep.plan)

  function kaydet() {
    if (!tarih) return setHata('Gideceğiniz tarihi seçin.')
    /* Backoffice'teki kuralın aynısı: randevu müşteriyle konuşulmadan
       kaydedilmiyor. Müşteri o gün tarlada olmayabilir. */
    if (!onay) return setHata('Randevuyu kaydetmeden önce müşteriyle görüşün.')
    const g = new Date(tarih)
    talepPlanla(
      talep,
      {
        tarih: g.getTime(),
        tarihYazi: g.toLocaleDateString('tr-TR'),
        is: PLAN_ISI[talep.tur] || 'Ziyaret',
        gorusuldu: true,
      },
      bayiAd,
    )
    onBitti()
  }

  return (
    <Pencere baslik={degisiklik ? 'Randevuyu değiştir' : 'Randevu'} onKapat={onKapat}>
      <label className="alan">
        <span className="alan__ad">Gideceğiniz tarih</span>
        <input className="gir" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
      </label>

      <label className="secim">
        <input type="checkbox" checked={onay} onChange={(e) => setOnay(e.target.checked)} />
        <span>Müşteriden randevu onayı alındı</span>
      </label>

      {hata && <div className="uyari">{hata}</div>}

      <p className="kucuk sonuk" style={{ margin: '4px 0 14px' }}>
        Bu tarih müşterinin bildirimlerine aynen gidiyor.
      </p>

      <div className="satir">
        <button className="dg dg--ana" onClick={kaydet}>Kaydet</button>
        <button className="dg" onClick={onKapat}>Vazgeç</button>
      </div>
    </Pencere>
  )
}

function Kapanis({ talep, bayiAd, bayiId, parca, onKapat, onBitti }) {
  const [ozet, setOzet] = useState('')
  const [dus, setDus] = useState(true)
  const [hata, setHata] = useState('')

  function kaydet() {
    if (ozet.trim().length < 3) {
      return setHata(parca ? 'Ne gönderdiğinizi yazın.' : 'Yaptığınız işi yazın.')
    }
    talepKapat(talep, { ozet: ozet.trim() }, bayiAd)
    if (parca && dus) {
      stokDus(bayiId, talep.parcalar || [], talep.parcaAdet || {}, talep.no, bayiAd)
    }
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
      {parca && (
        <label className="satir" style={{ gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={dus} onChange={(e) => setDus(e.target.checked)} />
          <span className="kucuk">
            Stoğumdan düş
            {/* Varsayılan açık ama kaldırılabilir: bayi stok tutmuyorsa
                ya da parçayı başka yerden getirttiyse düşmemeli. */}
          </span>
        </label>
      )}
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
