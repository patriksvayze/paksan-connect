import { useMemo, useState } from 'react'
import { useDil } from '../i18n'
import { TEKNIK } from '../data/icerik/teknikOzellikler'
import { bolumDilde, varyantlarDilde } from '../data/icerik/teknikSozluk'
import { IconChevronDown } from './Icons'

/* ==========================================================================
   Tüm teknik özellikler

   NEDEN VARDI, NEDEN YETMİYORDU

   Ürün sayfasında dört beş satırlık kısa bir özet vardı. Oysa
   paksanmakina.com.tr'de aynı makinenin kırk satırı aşan tablosu
   duruyor: piston kursu, tırmık teli sayısı, sac kalınlıkları, lastik
   ölçüleri... Makinesini alacak ya da yedek parça arayan kişi tam
   olarak bunlara bakıyor.

   SAYFA UZAMASIN

   Kırk satırı alt alta dökmek ürün sayfasını kullanılamaz hâle
   getirirdi. Bu yüzden özellikler kaynaktaki bölümlere ayrılmış hâlde
   duruyor (BALYA ÖLÇÜLERİ, PİSTON, LASTİK ÖLÇÜLERİ...) ve bölümler
   kapalı geliyor. Kullanıcı hangi bölümü merak ediyorsa onu açıyor;
   sayfa da bir düğme listesi kadar kısa kalıyor.

   İlk bölüm açık geliyor: hepsi kapalı olsaydı bölüm başlıklarının
   altında ne olduğu anlaşılmaz, kimse dokunmazdı.

   MODEL SEÇİCİ

   Bir ürünün birden çok modeli olabiliyor (Orkinos 1270 ve 1270 H gibi;
   Diamond'ın on ayrı hacmi var). Tabloyu telefonda yan yana on sütun
   olarak göstermek imkânsız. Onun yerine üstte model seçici var, altta
   yalnız seçili modelin değerleri.

   O MODELDE OLMAYAN SATIR GÖSTERİLMİYOR

   Kaynak tabloda bir satır bazı modeller için boş. Boş satır göstermek
   "bu bilgi eksik" izlenimi veriyor; oysa o özellik o modelde yok.
   Boş hücreli satır atlanıyor, bütün satırları boş kalan bölüm de
   hiç çizilmiyor.
   ========================================================================== */

export function TeknikOzellikler({ urunId }) {
  const { t, dil } = useDil()
  const veri = TEKNIK[urunId]

  const [varyant, setVaryant] = useState(0)
  const [acik, setAcik] = useState(0)

  /* Çeviri ve süzme her çizimde değil, dil ya da model değişince
     yapılıyor; kırk satırlık tablo her dokunuşta yeniden çevrilmesin. */
  const bolumler = useMemo(() => {
    if (!veri) return []
    return veri.bolumler
      .map((b) => {
        const c = bolumDilde(b, dil)
        return {
          baslik: c.baslik,
          satirlar: c.satirlar.filter((s) => s[2][varyant]),
        }
      })
      .filter((b) => b.satirlar.length > 0)
  }, [veri, dil, varyant])

  if (!veri || bolumler.length === 0) return null

  const varyantlar = varyantlarDilde(veri.varyantlar, dil)
  const cokModel = varyantlar.length > 1

  return (
    <>
      <div className="sectionhead">
        <h2>{t('detay.teknikTumu')}</h2>
      </div>

      {cokModel && (
        <>
          <p className="small muted" style={{ margin: '0 0 8px' }}>
            {t('detay.teknikModel')}
          </p>
          <div className="tkn__modeller">
            {varyantlar.map((v, i) => (
              <button
                key={v + i}
                className={'pill' + (i === varyant ? ' pill--on' : '')}
                onClick={() => setVaryant(i)}
                aria-pressed={i === varyant}
              >
                {v}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="stack" style={{ gap: 8 }}>
        {bolumler.map((b, i) => {
          const acikMi = acik === i
          return (
            <div key={(b.baslik || '') + i} className={'tkn' + (acikMi ? ' tkn--acik' : '')}>
              <button
                className="tkn__baslik"
                onClick={() => setAcik(acikMi ? -1 : i)}
                aria-expanded={acikMi}
              >
                <span className="tkn__ad">{b.baslik || t('detay.teknikGenel')}</span>
                <span className="tkn__sayi">{b.satirlar.length}</span>
                <span className="tkn__ok"><IconChevronDown size={20} /></span>
              </button>

              {acikMi && (
                <div className="tkn__ic">
                  {b.satirlar.map(([ad, birim, degerler], j) => (
                    <div className="tkn__satir" key={ad + j}>
                      <span className="tkn__etiket">{ad}</span>
                      <span className="tkn__deger">
                        {degerler[varyant]}
                        {birim ? <span className="tkn__birim"> {birim}</span> : null}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bilginin nereden geldiği yazılı: müşteri değerin uydurulmadığını
          bilsin, şüphe duyduğunda kaynağa bakabilsin. */}
      <p className="small muted" style={{ marginTop: 12, lineHeight: 1.5 }}>
        {t('detay.teknikKaynak')}
      </p>
    </>
  )
}
