import { useMemo, useState } from 'react'
import { cariBakiye, servisParcaSiparisi } from '../../backoffice/veri'
import { servisleriGetir, MARKA, markaEk } from '../../marka'
import { KDV_ORANI, PARA_BIRIMI, PARCA_FIYAT, paraYaz } from '../../marka'
import { parcaServisFiyati } from '../../lib/servisFiyat'
import { Bolum, Onay } from '../Kabuk'
import {
  IconCheck,
  IconCheckCircle,
  IconMinus,
  IconPlus,
  IconSearch,
  IconTrash,
} from '../../components/Icons'

/* ==========================================================================
   Servis uygulaması — PAKSAN'a sipariş

   ÜÇ ADIM

     1. SEÇİM   kalemler ve adetler
     2. ONAY    satır satır özet, tutar, teslim yeri, ödeme
     3. SONUÇ   sipariş numarası

   Onay adımı ayrı bir ekran, aynı sayfanın altı değil. Servis ne
   gönderdiğini gördükten sonra gönderiyor; gördüğü şey de siparişin
   kendisi — kalem, adet, birim fiyat, satır tutarı.

   TUTAR BAĞLAYICI DEĞİL ve bu ekranda yazıyor. Fiyat listesi
   göstergedir; siparişi PAKSAN onaylıyor, fatura LOGO'dan çıkıyor.

   ADET KUTUYA YAZILMIYOR, DÜĞMEYLE SAYILIYOR

   Her satırın sağında bir yazı kutusu vardı ve servis oraya rakam
   yazıyordu. Tarlada, eldivenle, tek elle kullanılan bir uygulamada
   sayı klavyesi açıp "2" yazmak, iki dokunuşluk bir işi beş dokunuşa
   çıkarıyordu. Satırlar da seçili olup olmadıklarını söylemiyordu.
   Şimdi servis kaydındaki parça seçimiyle aynı kalıp kullanılıyor:
   kutucuk, ad, artı-eksi.

   İSTENEN TESLİM TARİHİ KALDIRILDI

   Soruluyordu ve hiçbir yere bağlanmıyordu — ne sevkiyat planına ne
   kapanış formuna giriyordu. Cevabı hiçbir şeyi değiştirmeyen bir
   soru, formu uzatmaktan başka iş yapmaz.

   YERİNE ÖDEME BİÇİMİ GELDİ

   Servis cari hesaplı bir iş ortağı: PAKSAN ona hak ediş borçlu.
   Bakiyesi siparişi karşılıyorsa bedelin oradan düşülmesini
   isteyebiliyor. Yetmiyorsa seçenek kapalı ve KAÇ LİRA EKSİK OLDUĞU
   yazıyor — kapalı bir düğme sebebini söylemeden durmaz.

   Para bu ekranda işlenmiyor: sipariş henüz onaylanmadı ve tutar
   bağlayıcı değil. Düşüm, parça kargoya verilip talep kapandığında
   yapılıyor (bkz. backoffice/veri.js → talepKapat).

   SİPARİŞ AYRI BİR DEFTERE DEĞİL, TALEPLER'E DÜŞÜYOR

   Önce kendi deposu ve backoffice'te kendi ekranı vardı. Kaldırıldı:
   yedek parça personeli gününü Talepler ekranında geçiriyor ve
   servisin siparişi oraya hiç düşmüyordu. Artık sipariş normal bir
   yedek parça talebi — aynı liste, aynı durumlar, aynı kapanış
   (bkz. backoffice/veri.js → servisParcaSiparisi).
   ========================================================================== */

export function SiparisVer({ oturum, onKapat, onVerildi }) {
  const [adim, setAdim] = useState('secim')
  const [adetler, setAdetler] = useState({})
  const [arama, setArama] = useState('')
  const [not, setNot] = useState('')
  const [odeme, setOdeme] = useState('fatura')
  const [hata, setHata] = useState('')
  const [onay, setOnay] = useState(false)
  const [siparis, setSiparis] = useState(null)

  const servis = useMemo(
    () => servisleriGetir().find((b) => b.id === oturum.servisId) || null,
    [oturum.servisId],
  )

  const bakiye = useMemo(() => cariBakiye(oturum.servisId), [oturum.servisId, adim])

  /* Teslim adresi servisin kayıtlı adresiyle doluyor ama kilitli değil:
     sevkiyat bazen doğrudan müşterinin tarlasına gidiyor. */
  const [teslimat, setTeslimat] = useState(() =>
    servis ? [servis.adres, servis.ilce, servis.il].filter(Boolean).join(', ') : '',
  )

  const kalemler = useMemo(
    () =>
      Object.entries(PARCA_FIYAT).map(([ad, b]) => ({
        anahtar: ad,
        ad,
        kod: b.kod,
      })),
    [],
  )

  const secili = useMemo(
    () =>
      kalemler
        .map((k) => {
          const adet = Number(adetler[k.anahtar]) || 0
          const f = parcaServisFiyati(k.anahtar)
          return {
            ...k,
            adet,
            birimFiyat: f?.alis ?? null,
            satirTutari: f ? f.alis * adet : null,
          }
        })
        .filter((k) => k.adet > 0),
    [kalemler, adetler],
  )

  const hesap = useMemo(() => {
    let araToplam = 0
    let eksik = false
    for (const k of secili) {
      if (k.satirTutari === null) eksik = true
      else araToplam += k.satirTutari
    }
    const kdv = Math.round(araToplam * KDV_ORANI)
    return { araToplam, kdv, toplam: araToplam + kdv, eksik }
  }, [secili])

  /* Bakiye siparişin KDV dâhil tutarını karşılıyor mu? Karşılamıyorsa
     seçenek kapalı ve farkı yazıyor. */
  const bakiyeYeter = bakiye >= hesap.toplam && hesap.toplam > 0
  const eksikTutar = Math.max(0, hesap.toplam - bakiye)

  function adetDegistir(anahtar, fark) {
    setAdetler((a) => {
      const simdiki = Number(a[anahtar]) || 0
      const yeni = Math.max(0, simdiki + fark)
      return { ...a, [anahtar]: yeni || '' }
    })
    setHata('')
  }

  function gonder() {
    setOnay(false)
    if (!teslimat.trim()) return setHata('Teslim adresini yazın.')

    const sonuc = servisParcaSiparisi({
      servisId: oturum.servisId,
      servisAd: oturum.ad,
      servisNo: oturum.no,
      servisTel: servis?.tel || '',
      il: servis?.il || '',
      ilce: servis?.ilce || '',
      kalemler: secili,
      not,
      teslimat,
      odeme: bakiyeYeter ? odeme : 'fatura',
      tutar: hesap.araToplam,
      tutarKdvli: hesap.toplam,
    })
    if (sonuc.hata) return setHata(sonuc.hata)

    setSiparis(sonuc.talep)
    setAdim('sonuc')
  }

  if (adim === 'sonuc' && siparis) {
    return <Sonuc siparis={siparis} hesap={hesap} onBitir={onVerildi} />
  }

  if (adim === 'onay') {
    return (
      <>
        <Ozet
          secili={secili}
          hesap={hesap}
          teslimat={teslimat}
          onTeslimat={setTeslimat}
          not={not}
          onNot={setNot}
          odeme={bakiyeYeter ? odeme : 'fatura'}
          onOdeme={setOdeme}
          bakiye={bakiye}
          bakiyeYeter={bakiyeYeter}
          eksikTutar={eksikTutar}
          hata={hata}
          onGeri={() => {
            setAdim('secim')
            setHata('')
          }}
          onVer={() => {
            if (!teslimat.trim()) return setHata('Teslim adresini yazın.')
            setHata('')
            setOnay(true)
          }}
          onSil={(k) => setAdetler((a) => ({ ...a, [k.anahtar]: '' }))}
        />

        {onay && (
          <Onay
            baslik={`Sipariş ${markaEk('a')} gidecek`}
            metin={`${MARKA} yedek parça birimi siparişi görecek ve hazırlayacak. Tutar fiyat listesinden hesaplandı; kesin tutar faturada belirlenir.`}
            /* Sipariş onayında listenin kendisi duruyor, sayısı değil.
               "3 tür · 7 adet" satırı neyin sipariş edildiğini
               söylemiyordu; yanlış adet ancak parça geldiğinde fark
               ediliyordu. */
            parcalar={secili.map((k) => ({ kod: k.kod, ad: k.ad, adet: k.adet }))}
            kalemler={[
              { ad: 'Tutar', deger: `${paraYaz(hesap.toplam)} ${PARA_BIRIMI}` },
              {
                ad: 'Ödeme',
                deger:
                  bakiyeYeter && odeme === 'bakiye'
                    ? 'Bakiyemden düşülsün'
                    : 'Faturayla',
              },
            ]}
            dugme="Sipariş Ver"
            onOnayla={gonder}
            onVazgec={() => setOnay(false)}
          />
        )}
      </>
    )
  }

  return (
    <Secim
      kalemler={kalemler}
      adetler={adetler}
      arama={arama}
      onArama={setArama}
      onAdet={adetDegistir}
      secili={secili}
      hesap={hesap}
      onKapat={onKapat}
      onDevam={() => setAdim('onay')}
    />
  )
}

/* -------------------------------------------------------------- 1. Seçim */

function Secim({
  kalemler,
  adetler,
  arama,
  onArama,
  onAdet,
  secili,
  hesap,
  onKapat,
  onDevam,
}) {
  const q = arama.trim().toLocaleLowerCase('tr-TR')
  const suzulmus = q
    ? kalemler.filter(
        (k) =>
          k.ad.toLocaleLowerCase('tr-TR').includes(q) ||
          (k.kod || '').toLocaleLowerCase('tr-TR').includes(q),
      )
    : kalemler

  /* Seçilenler listenin başında: sepette ne olduğu, sepette olmayanın
     arasında aranmıyor. */
  const secilenAnahtarlar = secili.map((k) => k.anahtar)
  const sirali = [
    ...suzulmus.filter((k) => secilenAnahtarlar.includes(k.anahtar)),
    ...suzulmus.filter((k) => !secilenAnahtarlar.includes(k.anahtar)),
  ]

  return (
    <>
      <p className="ipucu">
        Almak istediğiniz parçaları seçin. Bir sonraki adımda özeti
        görecek ve siparişi vereceksiniz.
      </p>

      <div className="ara-kutu">
        <IconSearch size={18} />
        <input
          className="gir"
          value={arama}
          onChange={(e) => onArama(e.target.value)}
          placeholder="Parça ara"
          aria-label="Parça ara"
        />
      </div>

      {sirali.length > 0 ? (
        <Bolum ad="Yedek Parça" sayi={secili.length}>
          <div className="parca-liste">
            {sirali.map((k) => (
              <SecimSatiri
                key={k.anahtar}
                kalem={k}
                adet={Number(adetler[k.anahtar]) || 0}
                onAdet={(fark) => onAdet(k.anahtar, fark)}
              />
            ))}
          </div>
        </Bolum>
      ) : (
        <p className="kucuk sonuk">“{arama}” ile eşleşen parça yok.</p>
      )}

      <div className="yapisik">
        {secili.length > 0 && (
          <div className="siparis-toplam">
            <span>
              {secili.length} parça türü ·{' '}
              {secili.reduce((t, k) => t + k.adet, 0)} adet
            </span>
            <strong>
              {paraYaz(hesap.araToplam)} {PARA_BIRIMI}
            </strong>
            <small>KDV hariç</small>
          </div>
        )}
        <button
          className="dg dg--ana dg--blok"
          onClick={onDevam}
          disabled={!secili.length}
        >
          Devam
        </button>
        <button className="dg dg--blok" style={{ marginTop: 8 }} onClick={onKapat}>
          Vazgeç
        </button>
      </div>
    </>
  )
}

/* Satırın tamamı dokunma hedefi: seçilmemişken bir kez dokunmak bir
   adet ekliyor. Servis kaydındaki parça satırıyla aynı iskelet. */
function SecimSatiri({ kalem, adet, onAdet }) {
  const f = parcaServisFiyati(kalem.anahtar)
  const secili = adet > 0

  return (
    <div className={'parca-satir' + (secili ? ' parca-satir--on' : '')}>
      <button
        className="parca-satir__ac"
        onClick={() => onAdet(secili ? -adet : 1)}
        aria-pressed={secili}
      >
        <span className="parca-kutucuk">{secili && <IconCheck size={15} />}</span>
        <span className="parca-satir__ad">
          {kalem.ad}
          <span className="parca-satir__fiyat">
            {kalem.kod && <span className="mono">{kalem.kod}</span>}
            {kalem.kod && f ? ' · ' : ''}
            {f ? `${paraYaz(f.alis)} ${PARA_BIRIMI}` : 'Fiyat bilgisi yok'}
          </span>
        </span>
      </button>

      {secili && (
        <div className="parca-satir__adet">
          <button
            className="stok-dus"
            onClick={() => onAdet(-1)}
            aria-label={kalem.ad + ' adedini azalt'}
          >
            <IconMinus size={19} />
          </button>
          <span className="parca-satir__sayi">{adet}</span>
          <button
            className="stok-dus"
            onClick={() => onAdet(1)}
            aria-label={kalem.ad + ' adedini artır'}
          >
            <IconPlus size={19} />
          </button>
        </div>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- 2. Özet */

function Ozet({
  secili,
  hesap,
  teslimat,
  onTeslimat,
  not,
  onNot,
  odeme,
  onOdeme,
  bakiye,
  bakiyeYeter,
  eksikTutar,
  hata,
  onGeri,
  onVer,
  onSil,
}) {
  return (
    <>
      <p className="ipucu">
        Siparişinizi vermeden önce kontrol edin. Satırı kaldırmak için
        çöp kutusuna dokunun.
      </p>

      <Bolum ad="Sipariş Özeti" sayi={secili.length}>
        <div className="kart" style={{ padding: '4px 16px' }}>
          {secili.map((k) => (
            <div key={k.anahtar} className="ozet-kalem">
              <div className="ozet-kalem__ad">
                <div>{k.ad}</div>
                <div className="kucuk sonuk">
                  {k.adet} ×{' '}
                  {k.birimFiyat === null
                    ? 'Fiyat bilgisi yok'
                    : `${paraYaz(k.birimFiyat)} ${PARA_BIRIMI}`}
                </div>
              </div>
              <div className="ozet-kalem__tutar">
                {k.satirTutari === null ? '—' : paraYaz(k.satirTutari)}
              </div>
              <button
                className="ozet-kalem__sil"
                onClick={() => onSil(k)}
                aria-label={k.ad + ' satırını kaldır'}
              >
                <IconTrash size={18} />
              </button>
            </div>
          ))}
        </div>

        <div className="fiyat-kart" style={{ marginTop: 12 }}>
          <div className="urun-kart__satir">
            <span>Ara toplam</span>
            <strong>
              {paraYaz(hesap.araToplam)} {PARA_BIRIMI}
            </strong>
          </div>
          <div className="urun-kart__satir">
            <span>KDV %{Math.round(KDV_ORANI * 100)}</span>
            <strong>
              {paraYaz(hesap.kdv)} {PARA_BIRIMI}
            </strong>
          </div>
          <div className="urun-kart__satir urun-kart__satir--vurgu">
            <span>Genel toplam</span>
            <strong>
              {paraYaz(hesap.toplam)} {PARA_BIRIMI}
            </strong>
          </div>
          <div className="urun-kart__dip">
            {hesap.eksik
              ? 'Fiyatı listede olmayan parça var; gösterilen toplam eksik. '
              : ''}
            Tutar fiyat listesinden hesaplandı; kesin tutar faturada belirlenir.
          </div>
        </div>
      </Bolum>

      {/* ÖDEME BİÇİMİ.

          Bakiye yetmiyorsa seçenek kapalı ve farkı yazıyor. Kapalı
          düğmenin yanında sebebi yoksa kullanıcı ona bir daha
          dokunuyor ve hiçbir şey olmuyor. */}
      <Bolum ad="Ödeme">
        <div className="secenek">
          <button
            className={'buyuk-sec' + (odeme === 'fatura' ? ' buyuk-sec--on' : '')}
            onClick={() => onOdeme('fatura')}
          >
            <span className="buyuk-sec__ad">Faturayla</span>
            <span className="buyuk-sec__alt">
              {MARKA} faturayı gönderecek. Ödeme ay sonu hesaplaşmasında
              yapılacak.
            </span>
          </button>

          <button
            className={
              'buyuk-sec' +
              (odeme === 'bakiye' ? ' buyuk-sec--on' : '') +
              (bakiyeYeter ? '' : ' buyuk-sec--kapali')
            }
            disabled={!bakiyeYeter}
            onClick={() => onOdeme('bakiye')}
          >
            <span className="buyuk-sec__ad">Bakiyemden Düşülsün</span>
            <span className="buyuk-sec__alt">
              {bakiyeYeter
                ? `Bakiyeniz ${paraYaz(bakiye)} ${PARA_BIRIMI}. Parça gönderildiğinde tutar bakiyenizden düşülecek.`
                : `Bakiyeniz ${paraYaz(bakiye)} ${PARA_BIRIMI}; ${paraYaz(eksikTutar)} ${PARA_BIRIMI} eksik.`}
            </span>
          </button>
        </div>
      </Bolum>

      <Bolum ad="Teslimat">
        <label className="alan">
          <span className="alan__ad">Teslim Adresi</span>
          <textarea
            className="gir"
            rows={2}
            value={teslimat}
            onChange={(e) => onTeslimat(e.target.value)}
            placeholder="Sevkiyatın gideceği adres"
          />
        </label>
      </Bolum>

      {/* NOT ZORUNLU DEĞİL ve bunu etiketin kendisi söylüyor. Boş
          bırakılabileceği yazmıyorsa kullanıcı doldurmak zorunda
          olduğunu sanıyor. */}
      <Bolum ad="Not">
        <label className="alan">
          <span className="alan__ad">Not (isteğe bağlı)</span>
          <textarea
            className="gir"
            rows={3}
            value={not}
            onChange={(e) => onNot(e.target.value)}
            placeholder={`${markaEk('a')} iletmek istediğiniz bir şey varsa yazın`}
          />
        </label>
      </Bolum>

      {hata && <div className="uyari">{hata}</div>}

      <div className="yapisik">
        <button className="dg dg--ana dg--blok" onClick={onVer}>
          Sipariş Ver
        </button>
        <button className="dg dg--blok" style={{ marginTop: 8 }} onClick={onGeri}>
          Geri
        </button>
      </div>
    </>
  )
}

/* -------------------------------------------------------------- 3. Sonuç */

function Sonuc({ siparis, hesap, onBitir }) {
  const adet = Object.values(siparis.parcaAdet || {}).reduce((t, n) => t + Number(n), 0)

  return (
    <div className="siparis-sonuc">
      <IconCheckCircle size={54} />
      <h2>Siparişiniz {markaEk('a')} İletildi</h2>
      <p className="mono siparis-sonuc__no">{siparis.no}</p>
      <p className="kucuk sonuk">
        {(siparis.parcalar || []).length} kalem · {adet} adet ·{' '}
        {paraYaz(hesap.araToplam)} {PARA_BIRIMI} (KDV hariç)
      </p>
      <p className="kucuk sonuk">
        Siparişin durumunu Parça bölümünden takip edebilirsiniz. {MARKA}{' '}
        onayladığında haberdar olacaksınız.
      </p>
      <button className="dg dg--ana dg--blok" onClick={onBitir}>
        Tamam
      </button>
    </div>
  )
}
