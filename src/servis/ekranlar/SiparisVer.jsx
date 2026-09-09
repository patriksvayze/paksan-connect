import { useMemo, useState } from 'react'
import { servisParcaSiparisi } from '../../backoffice/veri'
import { servisleriGetir, MARKA, markaEk } from '../../marka'
import { KDV_ORANI, PARA_BIRIMI, PARCA_FIYAT, paraYaz } from '../../marka'
import { parcaServisFiyati } from '../../lib/servisFiyat'
import { Bolum } from '../Kabuk'
import {
  IconCheckCircle,
  IconInfo,
  IconSearch,
  IconTrash,
} from '../../components/Icons'

/* ==========================================================================
   Servis paneli — PAKSAN'a sipariş

   ÖNCEKİ AKIŞ FAZLA BASİTTİ.

   Yirmi küsur kalem alt alta diziliyor, servis kutuya bir sayı yazıyor ve
   "Gönder" diyordu. Bir buçuk milyon liralık makine siparişi böyle
   veriliyordu. Eksik olanlar sıradan değildi:

     · Ne kadar tuttuğu görünmüyordu
     · Nereye gönderileceği yazılı değildi
     · Ne zaman istendiği sorulmuyordu
     · Gönderilmeden önce özet gösterilmiyordu
     · Yanlış basılan bir rakamın döneceği yer yoktu

   B2B siparişinde bunlar telefonda konuşulup sonra unutulan
   bilgilerdir; siparişin kendisinde durmaları gerekiyor.

   ÜÇ ADIM

     1. SEÇİM   kalemler ve adetler
     2. ONAY    satır satır özet, tutar, teslim yeri ve tarihi
     3. SONUÇ   sipariş numarası

   Onay adımı ayrı bir ekran, aynı sayfanın altı değil. Servis ne
   gönderdiğini gördükten sonra gönderiyor; gördüğü şey de siparişin
   kendisi — kalem, adet, birim fiyat, satır tutarı.

   TUTAR BAĞLAYICI DEĞİL ve bu ekranda yazıyor. Fiyat listesi
   göstergedir; siparişi PAKSAN onaylıyor, fatura LOGO'dan çıkıyor.

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
  const [hata, setHata] = useState('')
  const [siparis, setSiparis] = useState(null)

  const servis = useMemo(
    () => servisleriGetir().find((b) => b.id === oturum.servisId) || null,
    [oturum.servisId],
  )

  /* Teslim adresi servisin kayıtlı adresiyle doluyor ama kilitli değil:
     sevkiyat bazen doğrudan müşterinin tarlasına gidiyor. */
  const [teslimat, setTeslimat] = useState(() =>
    servis ? [servis.adres, servis.ilce, servis.il].filter(Boolean).join(', ') : '',
  )
  const [istenenTarih, setIstenenTarih] = useState('')

  const kalemler = useMemo(
    () =>
      Object.entries(PARCA_FIYAT).map(([ad, b]) => ({
        tur: 'parca',
        anahtar: ad,
        ad,
        alt: b.kod,
      })),
    [],
  )

  const secili = useMemo(
    () =>
      kalemler
        .map((k) => {
          const adet = Number(adetler[k.tur + ':' + k.anahtar]) || 0
          const f = parcaServisFiyati(k.anahtar)
          return {
            ...k,
            adet,
            birimFiyat: f?.alis ?? null,
            satirTutari: f ? f.alis * adet : null,
          }
        })
        .filter((k) => k.adet > 0),
    [kalemler, adetler, oturum],
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

  function adetYaz(k, deger) {
    const temiz = String(deger).replace(/\D/g, '')
    setAdetler((a) => ({ ...a, [k.tur + ':' + k.anahtar]: temiz }))
    setHata('')
  }

  function gonder() {
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
      istenenTarih: istenenTarih ? new Date(istenenTarih).getTime() : null,
      tutar: hesap.araToplam,
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
      <Onay
        secili={secili}
        hesap={hesap}
        teslimat={teslimat}
        onTeslimat={setTeslimat}
        istenenTarih={istenenTarih}
        onTarih={setIstenenTarih}
        not={not}
        onNot={setNot}
        hata={hata}
        onGeri={() => {
          setAdim('secim')
          setHata('')
        }}
        onGonder={gonder}
        onSil={(k) => adetYaz(k, '')}
      />
    )
  }

  return (
    <Secim
      kalemler={kalemler}
      adetler={adetler}
      arama={arama}
      onArama={setArama}
      onAdet={adetYaz}
      secili={secili}
      hesap={hesap}
      oturum={oturum}
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
  oturum,
  onKapat,
  onDevam,
}) {
  const q = arama.trim().toLocaleLowerCase('tr-TR')
  const suz = (liste) =>
    q
      ? liste.filter(
          (k) =>
            k.ad.toLocaleLowerCase('tr-TR').includes(q) ||
            (k.alt || '').toLocaleLowerCase('tr-TR').includes(q),
        )
      : liste

  const parcalar = suz(kalemler)

  return (
    <>
      <p className="ipucu">
        Almak istediğiniz kalemlerin adedini yazın. Bir sonraki adımda
        özeti göreceksiniz; sipariş oradan gönderiliyor.
      </p>

      <div className="ara-kutu">
        <IconSearch size={18} />
        <input
          className="gir"
          value={arama}
          onChange={(e) => onArama(e.target.value)}
          placeholder="Parça ara"
          aria-label="Kalem ara"
        />
      </div>

      {parcalar.length > 0 && (
        <Bolum ad="Yedek Parça" sayi={parcalar.length}>
          <div className="kart" style={{ padding: '4px 16px' }}>
            {parcalar.map((k) => (
              <SecimSatiri
                key={k.anahtar}
                kalem={k}
                deger={adetler[k.tur + ':' + k.anahtar]}
                onDegis={(v) => onAdet(k, v)}
              />
            ))}
          </div>
        </Bolum>
      )}

      {!parcalar.length && (
        <p className="kucuk sonuk">“{arama}” ile eşleşen kalem yok.</p>
      )}

      <div className="yapisik">
        {secili.length > 0 && (
          <div className="siparis-toplam">
            <span>
              {secili.length} kalem ·{' '}
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

function SecimSatiri({ kalem, deger, onDegis }) {
  const f = parcaServisFiyati(kalem.anahtar)
  const adet = Number(deger) || 0

  return (
    <div className={'stok-satir' + (adet > 0 ? ' stok-satir--secili' : '')}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div>{kalem.ad}</div>
        <div className="kucuk sonuk">
          {kalem.alt && <span className="mono">{kalem.alt}</span>}
          {kalem.alt && f ? ' · ' : ''}
          {f ? `${paraYaz(f.alis)} ${PARA_BIRIMI}` : ''}
        </div>
        {adet > 0 && f && (
          <div className="kucuk satir-tutar">
            {adet} × {paraYaz(f.alis)} = {paraYaz(f.alis * adet)} {PARA_BIRIMI}
          </div>
        )}
      </div>
      <input
        className="gir mono"
        style={{ width: 82, textAlign: 'right' }}
        inputMode="numeric"
        value={deger || ''}
        onChange={(e) => onDegis(e.target.value)}
        placeholder="0"
        aria-label={kalem.ad + ' sipariş adedi'}
      />
    </div>
  )
}

/* --------------------------------------------------------------- 2. Onay */

function Onay({
  secili,
  hesap,
  teslimat,
  onTeslimat,
  istenenTarih,
  onTarih,
  not,
  onNot,
  hata,
  onGeri,
  onGonder,
  onSil,
}) {
  /* Bugünden önceki bir tarih istenemiyor. */
  const enErken = new Date().toISOString().slice(0, 10)

  return (
    <>
      <p className="ipucu">
        Siparişinizi göndermeden önce kontrol edin. Satırı kaldırmak
        için çöp kutusuna dokunun.
      </p>

      <Bolum ad="Sipariş Özeti" sayi={secili.length}>
        <div className="kart" style={{ padding: '4px 16px' }}>
          {secili.map((k) => (
            <div key={k.tur + k.anahtar} className="ozet-kalem">
              <div className="ozet-kalem__ad">
                <div>{k.ad}</div>
                <div className="kucuk sonuk">
                  {k.adet} ×{' '}
                  {k.birimFiyat === null
                    ? 'fiyat yok'
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
          {hesap.eksik && (
            <div className="urun-kart__dip">
              Fiyatı listede olmayan kalem var; tutar eksik hesaplandı.
            </div>
          )}
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

        <label className="alan">
          <span className="alan__ad">İstenen Teslim Tarihi</span>
          <input
            className="gir"
            type="date"
            min={enErken}
            value={istenenTarih}
            onChange={(e) => onTarih(e.target.value)}
          />
        </label>
      </Bolum>

      <Bolum ad="Not">
        <label className="alan">
          <textarea
            className="gir"
            rows={3}
            value={not}
            onChange={(e) => onNot(e.target.value)}
            placeholder={`${markaEk('a')} iletmek istediğiniz bir şey varsa yazın`}
          />
        </label>
      </Bolum>

      <div className="not not--mavi">
        <IconInfo size={19} />
        <div>
          <strong>Tutar bağlayıcı değil</strong>
          <p>
            Buradaki tutar fiyat listesinden hesaplanıyor. Siparişi {MARKA}{' '}
            onaylayacak; kesin tutar faturada belirlenir.
          </p>
        </div>
      </div>

      {hata && <div className="uyari">{hata}</div>}

      <div className="yapisik">
        <button className="dg dg--ana dg--blok" onClick={onGonder}>
          Siparişi Gönder
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
