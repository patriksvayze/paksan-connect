import { useMemo, useState } from 'react'
import { CATEGORIES, PRODUCTS, supportGroup } from '../../marka'
import { TEKNIK } from '../../marka/icerik/teknikOzellikler'
import { DESTEK, GUVENLIK, ZORLUK } from '../../marka/icerik/destekVerisi'
import { KDV_ORANI, PARA_BIRIMI, paraYaz } from '../../marka'
import { MAKINE_FIYAT_AKTIF } from '../../marka'
import { acikKampanyalar, makineFiyati } from '../../lib/bayiFiyat'
import { UrunFoto } from '../../components/Gorsel'
import { Bolum, Sayfa } from '../Kabuk'
import {
  IconAlert,
  IconBook,
  IconChevronDown,
  IconRight,
  IconSearch,
  IconShield,
  IconTag,
  IconWrench,
} from '../../components/Icons'

/* ==========================================================================
   Bayi paneli — Ürünler

   ÖNCE İKİ AYRI SEKMEYDİ VE İKİSİ DE ANLAŞILMADI

   "Satış" adında bir fiyat listesi, "Makine" adında bir teknik
   kütüphane vardı. İkisi de aynı yirmi ürünü listeliyordu. Sonuç:
   sekmenin adı ekranın ne yaptığını anlatmıyordu — "Satış" bayinin
   yaptığı satış mı, PAKSAN'ın bayiye yaptığı satış mı belli değildi.

   Tek liste kaldı. Bayi ürüne dokunuyor, o ürünle ilgili her şeyi
   orada buluyor: fiyatı, teslim süresi, arızası, teknik değerleri,
   bakım programı. Müşteri uygulamasındaki "Makinelerim" akışının
   aynısı — orada da makineye dokunulup her şey tek sayfada açılıyor.

   FOTOĞRAF VAR

   Ürün fotoğrafları müşteri uygulamasında zaten kullanılıyor
   (`src/data/gorseller.js`). Bayi listesi yazıdan ibaretti; yirmi
   satırlık bir model listesinde göz aradığını yazıyı okuyarak
   buluyordu.

   FİYATTA ÜÇ SATIR VAR, DÖRT DEĞİL

   Bir ara hem "Liste fiyatı" hem "Tavsiye satış fiyatı" ayrı satır
   olarak yazılıyordu ve ikisi de aynı sayıydı. Tavsiye fiyatı liste
   fiyatına eşit tutuluyor; iki kez yazmak kartı okunmaz yapıyordu.
   ========================================================================== */

export function Urunler({ oturum, onAc }) {
  const [arama, setArama] = useState('')
  const kampanyalar = useMemo(() => acikKampanyalar(), [])

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
      {kampanyalar.length > 0 && (
        <Bolum ad="Kampanya" sayi={kampanyalar.length}>
          {kampanyalar.map((k) => (
            <div key={k.id} className="kampanya">
              <div className="kampanya__ust">
                <IconTag size={17} />
                <strong>{k.ad}</strong>
                <span className="kampanya__oran">
                  +%{Math.round(k.ekIskonto * 100)}
                </span>
              </div>
              <p className="kampanya__metin">{k.aciklama}</p>
              {k.biter && (
                <div className="kampanya__son">
                  Son gün: {new Date(k.biter).toLocaleDateString('tr-TR')}
                </div>
              )}
            </div>
          ))}
        </Bolum>
      )}

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
              <UrunKarti
                key={u.id}
                urun={u}
                oturum={oturum}
                onAc={() => onAc(u)}
              />
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
   fotoğraf, model adı, alt başlık, ok.

   KARTTA TEK ROZET VAR. Önce iki rozet yan yanaydı — teslim ve
   kampanya. Dar ekranda sığmayıp alt alta düşüyor, kartı iki satır
   uzatıyor ve fotoğrafın yanını rozet yığınına çeviriyordu. Teslim
   bilgisi düz yazıya indi; rozet yalnız kampanyada kaldı, o da adın
   sağında. Aynı kural liste kartında da geçerli (bkz. Kabuk.jsx). */
function UrunKarti({ urun, oturum, onAc }) {
  const f = makineFiyati(urun.id, oturum)

  return (
    <button className="urun" onClick={onAc}>
      <UrunFoto urunId={urun.id} ad={urun.name} tip="thumb" ikonBoyut={28} />

      <span className="urun__govde">
        <span className="urun__bas">
          <span className="urun__ad">{urun.name}</span>
          {f?.kampanya && <span className="rozet rozet--kampanya">Kampanyalı</span>}
        </span>
        <span className="urun__alt">{urun.tagline}</span>
        <span className="urun__alt">
          <Teslim fiyat={f} />
        </span>
        {f && (
          <span className="urun__fiyat">
            {paraYaz(f.alis)} {PARA_BIRIMI} <small>bayi alış</small>
          </span>
        )}
      </span>

      <span className="urun__ok">
        <IconRight size={20} />
      </span>
    </button>
  )
}

/* Modelin bayide durup durmadığını değil, MÜŞTERİYE NE ZAMAN TESLİM
   EDİLECEĞİNİ söylüyor. Bayinin müşteriden aldığı soru bu. */
function Teslim({ fiyat }) {
  if (!fiyat) return null
  if (fiyat.tedarik === 'stok') {
    return <span className="urun__stok">Hemen teslim</span>
  }
  return (
    <>
      Sipariş üzerine
      {fiyat.teslimGun ? ` · ${fiyat.teslimGun} gün` : ''}
    </>
  )
}

/* ------------------------------------------------------------------ Detay */

const SEKMELER = [
  { id: 'ariza', ad: 'Arıza', Icon: IconWrench },
  { id: 'teknik', ad: 'Teknik', Icon: IconBook },
  { id: 'bakim', ad: 'Bakım', Icon: IconShield },
]

export function UrunDetay({ urun, oturum, onKapat, onTeklif }) {
  const [sekme, setSekme] = useState('ariza')
  const f = makineFiyati(urun.id, oturum)

  return (
    <Sayfa
      baslik={urun.name}
      alt={urun.tagline}
      onGeri={onKapat}
      /* Fiyata bakan bayinin bir sonraki işi teklif vermek. Düğme
         ekranın dibinde: uzun bir arıza listesinin sonuna kadar
         kaydırmak gerekmesin. */
      dip={
        onTeklif && (
          <button className="dg dg--ana dg--blok" onClick={onTeklif}>
            <IconTag size={19} /> Bu Ürüne Teklif Hazırla
          </button>
        )
      }
    >
      {/* Fotoğraf ve üstüne binen fiyat kartı: müşteri uygulamasındaki
          makine detayının aynı düzeni. */}
      <div className="urun-hero">
        <UrunFoto urunId={urun.id} ad={urun.name} tip="hero" ikonBoyut={64} />
      </div>

      <div className="urun-kart">
        {MAKINE_FIYAT_AKTIF && f ? (
          <>
            <Satir ad="Müşteri Fiyatı" deger={paraYaz(f.liste)} />
            <Satir
              ad={'İskontonuz' + (f.kampanya ? ' (Kampanyalı)' : '')}
              deger={'%' + Math.round(f.iskonto * 100)}
            />
            <Satir ad="Bayi Alış Fiyatı" deger={paraYaz(f.alis)} vurgu />
            <Satir ad="Kârınız" deger={paraYaz(f.liste - f.alis)} yesil />
            <div className="urun-kart__dip">
              Fiyatlar KDV hariçtir. Müşteri fiyatı KDV dâhil{' '}
              {paraYaz(Math.round(f.liste * (1 + KDV_ORANI)))} {PARA_BIRIMI}.
            </div>
          </>
        ) : (
          <p className="kucuk sonuk" style={{ margin: 0 }}>
            Bu ürünün fiyatı listede yok. PAKSAN satış birimine danışın.
          </p>
        )}
      </div>

      {f?.kampanya && (
        <div className="not not--yesil">
          <IconTag size={19} />
          <div>
            <strong>{f.kampanya.ad}</strong>
            <p>{f.kampanya.aciklama}</p>
          </div>
        </div>
      )}

      {f && (
        <div className="not not--mavi">
          <IconTag size={19} />
          <div>
            <strong>
              {f.tedarik === 'stok' ? 'Hemen Teslim' : 'Sipariş Üzerine'}
            </strong>
            <p>
              {f.tedarik === 'stok'
                ? 'Bu model stokunuzdaysa müşteriye hemen teslim edebilirsiniz.'
                : `Bu model müşteri siparişiyle üretiliyor.${
                    f.teslimGun ? ` Tahmini teslim süresi ${f.teslimGun} gün.` : ''
                  }`}
            </p>
          </div>
        </div>
      )}

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

function Satir({ ad, deger, vurgu, yesil }) {
  return (
    <div
      className={
        'urun-kart__satir' +
        (vurgu ? ' urun-kart__satir--vurgu' : '') +
        (yesil ? ' urun-kart__satir--yesil' : '')
      }
    >
      <span>{ad}</span>
      <strong>{deger}</strong>
    </div>
  )
}

/* --------------------------------------------------------------- Arıza

   İÇERİK ZATEN YAZILMIŞTI, BAYİYE VERİLMİYORDU.

   Arıza bilgi tabanı, teknik özellikler ve bakım programı müşteri
   uygulamasında var ve yalnız çiftçiye gösteriliyordu. Oysa makineyi
   açan, arızayı bulan ve parçayı değiştiren kişi bayinin ustası.

   VERİ PAYLAŞILIYOR, EKRAN PAYLAŞILMIYOR. Müşteri uygulamasının
   ekranları (`Support.jsx`, `Manual.jsx`) `styles.css` köküne ve iki
   dilli sözlüğe bağlı; ikisi de bayi derlemesinde yok. Alınan şey
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
