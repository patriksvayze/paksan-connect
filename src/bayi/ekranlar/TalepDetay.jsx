import { useState } from 'react'
import {
  parcaIlerlemeEngeli,
  talepKapat,
  talepNotEkle,
  talepPlanla,
} from '../../backoffice/veri'
import { parcaAdedi, stokDus } from '../../lib/bayiStok'
import { makineDurumAdi } from '../../data/talepAlanlari'
import { getProduct, MARKA, markaEk } from '../../marka'
import { PARA_BIRIMI, paraYaz } from '../../marka'
import { ServisKapanisi } from './ServisKapanisi'
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
  IconTag,
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

   KAPANIŞ TÜRE GÖRE DEĞİŞİYOR

   Üç talep türü üç ayrı iş anlatıyor, o yüzden üç ayrı kapanışı var:

     servis     → adım adım kapanış (bkz. ekranlar/ServisKapanisi.jsx)
     parca      → gönderim penceresi; yapılan iş bir onarım değil
     satinalma  → satış sonucu; ortada yapılmış bir iş yok

   Üçü de aynı biçimde yazıyor: `cozum` nesnesi backoffice'in kendi
   kapanış formuyla aynı alanları taşıyor (bkz. lib/bayiServis.js).
   ========================================================================== */

const TUR_ADI = { servis: 'Servis', parca: 'Yedek Parça', satinalma: 'Fiyat Teklifi' }

export function TalepDetay({
  talep,
  oturum,
  bayiAd,
  bayiId,
  onKapat,
  onDestekIste,
  onTeklifHazirla,
}) {
  const [pencere, setPencere] = useState(null)
  const paksanda = (talep.sahip || 'paksan') === 'paksan'
  const kapali = ['kapandi', 'iptal'].includes(talep.status)
  const islemVar = !kapali && !paksanda

  /* Kapanış tam ekran açılıyor, pencere olarak değil: her adımda tek
     soru soruluyor; cevaplar geniş düğmelerle sunuluyor. Gerekçesi
     ServisKapanisi.jsx başında yazılı. */
  if (pencere === 'kapanis') {
    return (
      <ServisKapanisi
        talep={talep}
        oturum={oturum}
        onKapat={() => setPencere(null)}
        onBitti={onKapat}
      />
    )
  }

  /* ASIL İŞLEM EKRANIN DİBİNE YAPIŞIK.

     Dört düğme yan yana dururken hangisinin asıl iş olduğu belli
     değildi. Bayinin bu ekranda yapacağı tek şey var: işi bitirmek.
     O düğme altta, parmağın durduğu yerde ve tek başına; ötekiler
     detayın içinde, sırası gelince bakılan seçenekler. */
  /* ÖDEME ONAYI BAYİ TARAFINDA DA KİLİT.

     Parça bedeli önden alınıyor ve dekontu PAKSAN kontrol ediyor.
     Backoffice bu kuralı zaten uyguluyordu (`parcaIlerlemeEngeli`)
     ama bayi paneli uygulamıyordu: bayi, ödemesi onaylanmamış bir
     talebi "gönderdim" diye kapatabiliyor ve müşteriye "Parçanız Yola
     Çıktı" bildirimi gidiyordu. Aynı kural iki tarafta da geçerli. */
  const odemeEngeli = parcaIlerlemeEngeli(talep, 'kapandi')

  /* KAPANIŞ TÜRE GÖRE DEĞİŞİYOR — hepsi aynı formla kapanmıyor.

     Servis kapanışı bir onarımı anlatıyor; yedek parça kapanışı bir
     gönderimi; fiyat teklifi kapanışı ise bir SATIŞ SONUCUNU. Üçü tek
     forma sokulunca fiyat teklifi talebi "Ne yapıldı? Ayar yapıldı"
     diye kapanıyordu — sorulan soru işin kendisiyle ilgisizdi.

     Alan adları backoffice'in kendi kapanış formuyla aynı
     (bkz. Talepler.jsx `KAPANIS_ALANLARI`), böylece PAKSAN ve müşteri
     bayinin kapattığı işi kendi ekranlarında okuyor. */
  const KAPANIS = {
    parca: { pencere: 'gonderdim', ad: 'Parçayı Gönderdim' },
    servis: { pencere: 'kapanis', ad: 'İşi Tamamla' },
    satinalma: { pencere: 'sonuc', ad: 'Görüşmeyi Sonuçlandır' },
  }
  const kapanis = KAPANIS[talep.tur] || KAPANIS.servis

  const asilIslem = islemVar && (
    <button
      className="dg dg--ana dg--blok"
      onClick={() => setPencere(kapanis.pencere)}
      disabled={Boolean(odemeEngeli)}
    >
      {kapanis.ad}
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
        {/* FİYAT TEKLİFİNDE ASIL KONU İLGİLENİLEN ÜRÜN.

            Talep hem müşterinin kayıtlı makinesini hem sorduğu ürünü
            taşıyor. Ekranda yalnız kayıtlı makine görünüyordu ve talep
            o makineyle ilgiliymiş gibi okunuyordu; oysa müşteri başka
            bir makinenin fiyatını soruyor. */}
        {talep.tur === 'satinalma' && talep.urunId && (
          <Satir
            ad="İlgilendiği Ürün"
            deger={getProduct(talep.urunId)?.name || talep.urunId}
          />
        )}
        {talep.makine?.serial && <Makine makine={talep.makine} />}

        {/* SATIŞ SORULARININ CEVAPLARI BAYİDE GÖRÜNMÜYORDU.

            Bu üç soru, satış ekibinin telefonda ilk sorduğu üç soru
            olduğu için forma kondu: cevapları önden gelirse fiyat ilk
            aramada verilebiliyor. Satışı yapan bayi olduğu hâlde
            cevapları yalnız backoffice görüyordu. */}
        {talep.urunTipi && <Satir ad="Balya İçeriği" deger={talep.urunTipi} />}
        {talep.arazi && <Satir ad="Arazi Büyüklüğü" deger={talep.arazi} />}
        {talep.traktor && <Satir ad="Traktör Gücü" deger={talep.traktor} />}
        {/* Kimlik değil okunur karşılık: ekranda "sorunlu" yazıyordu. */}
        {talep.durum && (
          <Satir ad="Makinenin Durumu" deger={makineDurumAdi(talep.durum)} />
        )}
        {talep.belirtiler?.length > 0 && (
          <Satir ad="Belirtiler" deger={talep.belirtiler.join(', ')} />
        )}
        {talep.parcalar?.length > 0 && (
          <ParcaDurumu talep={talep} bayiId={bayiId} />
        )}
        {/* TESLİMAT ADRESİ BAYİDE GÖRÜNMÜYORDU.

            Bayiden "Parçayı Gönderdim" demesi isteniyor ama parçanın
            nereye gideceği ekranda yazmıyordu: yalnız il ve ilçe
            vardı. Müşteri adresi talebin fatura bilgisinde duruyor ve
            kargo oraya çıkacak. */}
        {talep.fatura?.adres && (
          <Satir
            ad="Teslimat Adresi"
            deger={
              talep.fatura.adres +
              (talep.fatura.ilce ? ` · ${talep.fatura.ilce} / ${talep.fatura.il}` : '')
            }
          />
        )}
        {talep.fatura?.ad && talep.fatura.ad !== talep.ad && (
          <Satir ad="Fatura Adı" deger={talep.fatura.ad} />
        )}
        {talep.aciklama && <Satir ad="Müşterinin Anlattığı" deger={talep.aciklama} />}
        {talep.ulasim && <Satir ad="Aranma Tercihi" deger={talep.ulasim} />}
      </div>

      {/* RANDEVU ALINMIŞ TALEP AYNI EKRANI GÖSTERMEMELİ.

          Randevu verildikten sonra talep bayi tarafında yine "bekleyen"
          listesinde duruyor (doğrusu da bu, iş bitmedi) ama detayı yeni
          gelmiş bir taleple birebir aynı görünüyordu: bayi randevu
          verdiğini unutup ikinci kez veriyordu. */}
      {/* Ödemenin durumu bayinin de bilmesi gereken bilgi: parçayı
          hazırlamaya başlayıp başlamayacağına buna bakarak karar
          veriyor. */}
      {talep.tur === 'parca' && !kapali && talep.fatura && (
        <div className={'not ' + (talep.odemeOnay ? 'not--yesil' : 'not--turuncu')}>
          <IconCheckCircle size={19} />
          <div>
            <strong>
              {talep.odemeOnay
                ? 'Ödeme onaylandı'
                : 'Ödeme onayı bekleniyor'}
            </strong>
            <p>
              {talep.odemeOnay
                ? 'Parçayı hazırlayıp kargoya verebilirsiniz.'
                : `${MARKA} dekontu kontrol ediyor. Onaylanmadan parçayı göndermeyin.`}
            </p>
          </div>
        </div>
      )}

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
            <strong>{MARKA} bu talebe destek veriyor.</strong>
            <p>
              Müşteri hâlâ sizin müşteriniz. {markaEk('in')} attığı adımları
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

      {/* Kapanış kaydı: bayi aylar sonra "Burada ne yapmıştık?" diye
          baktığında cevap burada. Alanlar backoffice'in kendi kapanış
          formuyla aynı; müşteri de bunları kendi uygulamasında
          okuyor. */}
      {kapali && talep.cozum && (
        <div className="kart" style={{ padding: 16 }}>
          <Satir ad="Yapılan İş" deger={talep.cozum.yapilanIs} />
          <Satir ad="Değişen Parça" deger={talep.cozum.parcalar} />
          <Satir ad="Ücret" deger={talep.cozum.ucret} />
          <Satir ad="Garanti Talebi" deger={talep.cozum.garantiNo} />
          <Satir ad="Sonuç" deger={talep.cozum.sonuc} />
          <Satir ad="Satış Fiyatı" deger={talep.cozum.satisFiyati} />
          <Satir ad="Not" deger={talep.cozum.not} />
        </div>
      )}

      {islemVar && (
        <div className="secenek">
          {/* MÜŞTERİNİN FİYAT SORUSU, BAYİNİN FİYAT EKRANINA BAĞLANIYOR.

              Müşteri "Bu makine kaça?" diye sordu; bayinin elinde zaten
              liste fiyatını, kendi alış fiyatını ve kârını gösteren bir
              teklif ekranı var. İkisi birbirinden habersizdi: bayi
              talebi okuyup teklif ekranını ayrıca açıyor, müşteriyi ve
              ürünü elle yeniden giriyordu. */}
          {talep.tur === 'satinalma' && onTeklifHazirla && (
            <button className="secenek__dg" onClick={() => onTeklifHazirla(talep)}>
              <IconTag size={19} />
              Fiyat Teklifi Hazırla
              <IconRight size={17} />
            </button>
          )}
          {talep.tur === 'servis' && (
            <button className="secenek__dg" onClick={() => setPencere('randevu')}>
              <IconCalendar size={19} />
              {talep.plan ? 'Randevuyu Değiştir' : 'Randevu'}
              <IconRight size={17} />
            </button>
          )}
          <button className="secenek__dg" onClick={() => setPencere('not')}>
            <IconBook size={19} />
            Not Ekle
            <IconRight size={17} />
          </button>
          <button className="secenek__dg" onClick={() => setPencere('destek')}>
            <IconShield size={19} />
            {markaEk('dan')} Destek İste
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
      {pencere === 'sonuc' && (
        <SatisSonucu
          talep={talep}
          bayiAd={bayiAd}
          onKapat={() => setPencere(null)}
          onBitti={onKapat}
        />
      )}
      {pencere === 'gonderdim' && (
        <Kapanis
          talep={talep}
          bayiAd={bayiAd}
          bayiId={bayiId}
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

/* İstenen parçaların yanında bayinin kendi stoku.

   Sayı bir BİLGİ, kilit değil: stok sıfır olsa da "Parçayı gönderdim"
   düğmesi açık kalıyor. Bayiyi kendi stok kaydının doğruluğuna
   hapsetmek, ilk yanlış sayımda paneli kullanılmaz yapardı.

   "Girilmedi" ile "0" ayrı yazılıyor: biri "ben bu parçayı takip
   etmiyorum", diğeri "bende yok". */
function ParcaDurumu({ talep, bayiId }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div className="kucuk sonuk">İstenen Parçalar</div>
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

/* "Ne yapılacak" alanı kaldırıldı; yapılacak iş türden çıkarılıyor.

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
  /* Kayıtlı randevu varsa kutular onunla doluyor: bayi tarihi
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
    <Pencere baslik={degisiklik ? 'Randevuyu Değiştir' : 'Randevu'} onKapat={onKapat}>
      <label className="alan">
        <span className="alan__ad">Gideceğiniz Tarih</span>
        <input className="gir" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
      </label>

      <label className="secim">
        <input type="checkbox" checked={onay} onChange={(e) => setOnay(e.target.checked)} />
        <span>Müşteriden randevu onayı alındı</span>
      </label>

      {hata && <div className="uyari">{hata}</div>}

      <p className="kucuk sonuk" style={{ margin: '4px 0 14px' }}>
        Müşteriye bu tarih için bildirim gönderilecek.
      </p>

      <div className="satir">
        <button className="dg dg--ana" onClick={kaydet}>Kaydet</button>
        <button className="dg" onClick={onKapat}>Vazgeç</button>
      </div>
    </Pencere>
  )
}

/* Fiyat teklifi talebinin kapanışı.

   Müşteri "Bu makine kaça?" diye sordu; kapanışta sorulacak tek şey
   görüşmenin sonucu. Sonuç listesi backoffice'in kendi kapanış
   formundaki listeyle birebir aynı: iki taraf aynı işi kapatırken
   aynı kelimeleri kullanmalı, yoksa rapor iki ayrı sayı üretir.

   SATIŞ OLDUYSA FİYAT ZORUNLU. Rakamsız kapatılan satış, raporda
   "satış var ama cirosu yok" satırı üretiyor. */
const SATIS_SONUCLARI = [
  'Satış oldu',
  'Müşteri vazgeçti',
  'Rakibe gitti',
  'Ulaşılamadı',
]

function SatisSonucu({ talep, bayiAd, onKapat, onBitti }) {
  const [sonuc, setSonuc] = useState('')
  const [fiyat, setFiyat] = useState('')
  const [not, setNot] = useState('')
  const [hata, setHata] = useState('')

  function kaydet() {
    if (!sonuc) return setHata('Görüşmenin sonucunu seçin.')
    if (sonuc === 'Satış oldu' && !Number(fiyat)) {
      return setHata('Satış fiyatını yazın.')
    }
    /* Fiyat BACKOFFICE'TEKİ BİÇİMDE saklanıyor: binlik ayraçlı yazı
       ("2.600.000"). İki taraf aynı alana iki ayrı biçimde yazarsa
       rapor ve müşteri ekranı iki ayrı sayı gösterir. */
    const cozum = {
      sonuc,
      satisFiyati: sonuc === 'Satış oldu' ? paraYaz(Number(fiyat)) : '',
      not: not.trim(),
      ozet:
        sonuc +
        (sonuc === 'Satış oldu' ? ` · ${paraYaz(Number(fiyat))} ${PARA_BIRIMI}` : ''),
    }
    talepKapat(talep, cozum, bayiAd)
    onBitti()
  }

  return (
    <Pencere baslik="Görüşmeyi Sonuçlandır" onKapat={onKapat}>
      <div className="secenek">
        {SATIS_SONUCLARI.map((s) => (
          <button
            key={s}
            className={'makine-sec' + (sonuc === s ? ' makine-sec--on' : '')}
            onClick={() => {
              setSonuc(s)
              setHata('')
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {sonuc === 'Satış oldu' && (
        <label className="alan" style={{ marginTop: 12 }}>
          <span className="alan__ad">Satış Fiyatı</span>
          <input
            className="gir mono"
            inputMode="numeric"
            value={fiyat}
            onChange={(e) => setFiyat(e.target.value.replace(/\D/g, ''))}
            placeholder="Örnek: 2600000"
          />
        </label>
      )}

      <label className="alan" style={{ marginTop: 12 }}>
        <span className="alan__ad">Not</span>
        <textarea
          className="gir"
          rows={2}
          value={not}
          onChange={(e) => setNot(e.target.value)}
          placeholder="Görüşmede konuşulanlar"
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

/* Yedek parça talebinin kapanışı. Servis işi bu pencereden çıktı;
   burada yapılan iş bir onarım değil, bir gönderim. */
function Kapanis({ talep, bayiAd, bayiId, onKapat, onBitti }) {
  const [ozet, setOzet] = useState('')
  const [dus, setDus] = useState(true)
  const [hata, setHata] = useState('')

  function kaydet() {
    if (ozet.trim().length < 3) return setHata('Ne gönderdiğinizi yazın.')
    /* ORTAK ALANA DA YAZILIYOR.

       Burası yalnız `ozet` alanına yazıyordu. `ozet` işlem kaydına giden
       satır; talebi OKUYAN iki ekran ona bakmıyor. Backoffice
       `yapilanIs` alanını okuyor (bkz. Talepler.jsx →
       KAPANIS_ALANLARI.parca), müşteri uygulaması da aynı alanı
       (bkz. screens/RequestDetail.jsx). Sonuç: bayi kargo takip
       numarasını yazıyordu ve iki tarafta da boş bir kutu görünüyordu.

       Aynı metin iki alana yazılıyor: `yapilanIs` okunan alan,
       `ozet` işlem kaydının satırı. */
    const yazi = ozet.trim()
    talepKapat(talep, { yapilanIs: yazi, ozet: yazi }, bayiAd)
    if (dus) {
      stokDus(bayiId, talep.parcalar || [], talep.parcaAdet || {}, talep.no, bayiAd)
    }
    onBitti()
  }

  return (
    <Pencere baslik="Parçayı Gönderdim" onKapat={onKapat}>
      <label className="alan">
        <span className="alan__ad">Ne Gönderdiniz?</span>
        <textarea
          className="gir"
          rows={3}
          value={ozet}
          onChange={(e) => setOzet(e.target.value)}
          placeholder="Örnek: 2 adet düğüm bıçağı kargoya verildi"
        />
      </label>
      {/* Varsayılan açık ama kaldırılabilir: bayi stok tutmuyorsa ya da
          parçayı başka yerden getirttiyse düşmemeli. */}
      <label className="satir" style={{ gap: 8, alignItems: 'center' }}>
        <input type="checkbox" checked={dus} onChange={(e) => setDus(e.target.checked)} />
        <span className="kucuk">Stokumdan düş</span>
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
    <Pencere baslik="Not Ekle" onKapat={onKapat}>
      <p className="kucuk sonuk" style={{ marginTop: 0 }}>
        Bu not müşteriye gönderilmez; talep kaydında saklanır.
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
    <Pencere baslik={`${markaEk('dan')} Destek İste`} onKapat={onKapat}>
      <p className="kucuk sonuk" style={{ marginTop: 0 }}>
        Talep {markaEk('a')} geçecek ama müşteri sizin müşteriniz olmaya devam
        edecek. {markaEk('in')} attığı adımları burada görmeye devam
        edeceksiniz.
      </p>
      <label className="alan">
        <span className="alan__ad">Neden Destek İstiyorsunuz?</span>
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
          Destek İste
        </button>
        <button className="dg" onClick={onKapat}>Vazgeç</button>
      </div>
    </Pencere>
  )
}
