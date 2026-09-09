import { useMemo, useState } from 'react'
import { CATEGORIES, PRODUCTS, supportGroup } from '../../marka'
import { TEKNIK } from '../../marka/icerik/teknikOzellikler'
import { DESTEK, GUVENLIK, ZORLUK } from '../../marka/icerik/destekVerisi'
import { UrunFoto } from '../../components/Gorsel'
import { Bolum, Sayfa } from '../Kabuk'
import {
  IconAlert,
  IconBook,
  IconChevronDown,
  IconRight,
  IconSearch,
  IconShield,
  IconWrench,
} from '../../components/Icons'

/* ==========================================================================
   Servis paneli — Ürünler

   NE İŞE YARIYOR

   Servis ürüne dokunuyor, o ürünle ilgili bilmesi gereken her şeyi
   orada buluyor: arızası, teknik değerleri, bakım programı. Müşteri
   uygulamasındaki "Makinelerim" akışının aynısı — orada da makineye
   dokunulup her şey tek sayfada açılıyor.

   MAKİNE FİYATI BURADA YOK

   Ekran bir zamanlar makine fiyat listesiydi: liste fiyatı, iskonto,
   alış fiyatı, kâr, kampanya. Makineyi satan tarafın paneli yok; bu
   paneli kullanan servis ise makine satmıyor. Fiyat bölümleri bu
   yüzden kaldırıldı, teknik içerik kaldı — servisin en çok ihtiyaç
   duyduğu kısım zaten oydu.

   FOTOĞRAF VAR

   Ürün fotoğrafları müşteri uygulamasında zaten kullanılıyor
   (bkz. src/marka/katalog/gorseller.js). Liste yazıdan ibaretti; yirmi
   satırlık bir model listesinde göz aradığını yazıyı okuyarak
   buluyordu.
   ========================================================================== */

export function Urunler({ onAc }) {
  const [arama, setArama] = useState('')

  const bulunan = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR')
    if (!q) return PRODUCTS
    return PRODUCTS.filter(
      (u) =>
        u.name.toLocaleLowerCase('tr-TR').includes(q) ||
        (u.tagline || '').toLocaleLowerCase('tr-TR').includes(q) ||
        (u.serialPrefix || '').toLocaleLowerCase('tr-TR').includes(q),
    )
  }, [arama])

  return (
    <>
      <div className="ara-kutu">
        <IconSearch size={18} />
        <input
          className="gir"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Ürün adı veya seri öneki"
          aria-label="Ürün Ara"
        />
      </div>

      {CATEGORIES.map((kat) => {
        const liste = bulunan.filter((u) => u.category === kat.id)
        if (!liste.length) return null
        return (
          <Bolum key={kat.id} ad={kat.short} sayi={liste.length}>
            {liste.map((u) => (
              <UrunKarti key={u.id} urun={u} onAc={() => onAc(u)} />
            ))}
          </Bolum>
        )
      })}

      {!bulunan.length && (
        <p className="kucuk sonuk">“{arama}” ile eşleşen ürün yok.</p>
      )}
    </>
  )
}

/* Kart müşteri uygulamasındaki `MachineCard` düzenini izliyor:
   fotoğraf, model adı, alt başlık, ok. */
function UrunKarti({ urun, onAc }) {
  return (
    <button className="urun" onClick={onAc}>
      <UrunFoto urunId={urun.id} ad={urun.name} tip="thumb" ikonBoyut={28} />

      <span className="urun__govde">
        <span className="urun__bas">
          <span className="urun__ad">{urun.name}</span>
        </span>
        <span className="urun__alt">{urun.tagline}</span>
      </span>

      <span className="urun__ok">
        <IconRight size={20} />
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------ Detay */

const SEKMELER = [
  { id: 'ariza', ad: 'Arıza', Icon: IconWrench },
  { id: 'teknik', ad: 'Teknik', Icon: IconBook },
  { id: 'bakim', ad: 'Bakım', Icon: IconShield },
]

export function UrunDetay({ urun, onKapat }) {
  const [sekme, setSekme] = useState('ariza')

  return (
    <Sayfa baslik={urun.name} alt={urun.tagline} onGeri={onKapat}>
      <div className="urun-hero">
        <UrunFoto urunId={urun.id} ad={urun.name} tip="hero" ikonBoyut={64} />
      </div>

      <div className="ic-sekme">
        {SEKMELER.map(({ id, ad, Icon }) => (
          <button
            key={id}
            className={'ic-sekme__dg' + (sekme === id ? ' ic-sekme__dg--on' : '')}
            onClick={() => setSekme(id)}
            aria-current={sekme === id ? 'true' : undefined}
          >
            <Icon size={17} />
            {ad}
          </button>
        ))}
      </div>

      {sekme === 'ariza' && <Ariza urun={urun} />}
      {sekme === 'teknik' && <Teknik urun={urun} />}
      {sekme === 'bakim' && <Bakim urun={urun} />}
    </Sayfa>
  )
}

/* --------------------------------------------------------------- Arıza

   İÇERİK ZATEN YAZILMIŞTI, BAYİYE VERİLMİYORDU.

   Arıza bilgi tabanı, teknik özellikler ve bakım programı müşteri
   uygulamasında var ve yalnız çiftçiye gösteriliyordu. Oysa makineyi
   açan, arızayı bulan ve parçayı değiştiren kişi servisin ustası.

   VERİ PAYLAŞILIYOR, EKRAN PAYLAŞILMIYOR. Müşteri uygulamasının
   ekranları (`Support.jsx`, `Manual.jsx`) `styles.css` köküne ve iki
   dilli sözlüğe bağlı; ikisi de servis derlemesinde yok. Alınan şey
   `src/data/` altındaki veri.                                        */

/* Güvenlik uyarısı listenin üstünde ve kapatılamıyor. Müşteri
   uygulamasında da böyle: bu dört madde atlandığında insan sakatlanıyor.
   Ustanın deneyimli olması gerekçe değil — kazalar çoğunlukla
   deneyimlinin başına geliyor. */
function Ariza({ urun }) {
  const grup = DESTEK[supportGroup(urun)]
  const [acikBelirti, setAcikBelirti] = useState(null)

  if (!grup) {
    return (
      <p className="kucuk sonuk">Bu ürün için arıza rehberi henüz hazırlanmadı.</p>
    )
  }

  return (
    <>
      <div className="not not--turuncu">
        <IconAlert size={19} />
        <div>
          <strong>Makineye Müdahale Öncesi</strong>
          <ul className="guvenlik-liste">
            {GUVENLIK.tr.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      </div>

      {grup.bolumler.map((bolum) => (
        <Bolum key={bolum.id} ad={bolum.ad.tr}>
          {bolum.belirtiler.map((b) => {
            const acik = acikBelirti === b.id
            return (
              <div key={b.id} className={'belirti' + (acik ? ' belirti--on' : '')}>
                <button
                  className="belirti__ac"
                  onClick={() => setAcikBelirti(acik ? null : b.id)}
                  aria-expanded={acik}
                >
                  <span>{b.ad.tr}</span>
                  <IconChevronDown size={18} />
                </button>

                {acik && (
                  <div className="belirti__ic">
                    {b.sebepler.map((s) => (
                      <div key={s.ad.tr} className="sebep">
                        <div className="sebep__ust">
                          <strong>{s.ad.tr}</strong>
                          <span className={'zorluk zorluk--' + s.zorluk}>
                            {ZORLUK[s.zorluk]?.tr}
                          </span>
                        </div>
                        <p className="sebep__satir">
                          <span>Kontrol</span>
                          {s.kontrol.tr}
                        </p>
                        <p className="sebep__satir">
                          <span>Yapılacak</span>
                          {s.yap.tr}
                        </p>
                      </div>
                    ))}

                    {b.parcalar?.length > 0 && (
                      <div className="belirti__parca">
                        Gerekli olabilecek parçalar: {b.parcalar.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </Bolum>
      ))}
    </>
  )
}

/* -------------------------------------------------------------- Teknik */

function Teknik({ urun }) {
  const kayit = TEKNIK[urun.id]

  if (!kayit) {
    return (
      <div className="kart" style={{ padding: 14 }}>
        {urun.specs.map(([ad, deger]) => (
          <div key={ad} className="ozet-satir">
            <span>{ad}</span>
            <strong>{deger}</strong>
          </div>
        ))}
      </div>
    )
  }

  /* Varyantı olan modellerde her satır birden çok değer taşıyor.
     Değerler aynıysa tek kez yazılıyor: "120 X 70 / 120 X 70" iki ayrı
     ölçü sanılıyordu. */
  const varyantlar = (kayit.varyantlar || []).filter(Boolean)

  return (
    <>
      {varyantlar.length > 1 && (
        <p className="kucuk sonuk" style={{ marginTop: 0 }}>
          Varyantlar: {varyantlar.join(' / ')}
        </p>
      )}

      {kayit.bolumler.map((bolum) => (
        <Bolum key={bolum.baslik} ad={bolum.baslik}>
          <div className="kart" style={{ padding: 14 }}>
            {bolum.satirlar.map(([ad, birim, degerler]) => (
              <div key={ad} className="ozet-satir">
                <span>{ad}</span>
                <strong>
                  {[...new Set(degerler)].join(' / ')}
                  {birim ? ' ' + birim : ''}
                </strong>
              </div>
            ))}
          </div>
        </Bolum>
      ))}
    </>
  )
}

/* --------------------------------------------------------------- Bakım */

function Bakim({ urun }) {
  if (!urun.bakim?.length) {
    return <p className="kucuk sonuk">Bu ürün için bakım programı yok.</p>
  }

  return (
    <Bolum ad="Bakım Programı" sayi={urun.bakim.length}>
      {urun.bakim.map((b) => (
        <div key={b.baslik + b.saat} className="bakim-satir">
          <span className="bakim-satir__saat">{b.saat} sa</span>
          <div>
            <strong>{b.baslik}</strong>
            <p>{b.detay}</p>
          </div>
        </div>
      ))}
    </Bolum>
  )
}
