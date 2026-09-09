import { ILLER, ilceleriGetir } from '../data/iller'
import { bolgeleriGetir, bolgeListesiVarMi } from '../data/bolgeler'
import { ulkeAdi, ulkeListesi, VARSAYILAN_ULKE } from '../data/ulkeler'
import { useDil } from '../i18n'

/* ==========================================================================
   Konum alanı — ülke / bölge / şehir

   Türkçe kullanan müşteri Türkiye'de: ülke sorulmuyor, doğrudan il ve
   ilçe seçiliyor (81 il, 973 ilçe).

   İngilizce seçildiğinde önce ÜLKE soruluyor, sonra o ülkeye göre:

     Türkiye          → il seçimi + ilçe seçimi (aynı listeler)
     Listesi olan
     ülkeler          → bölge seçimi (eyalet/vilayet) + şehir yazılıyor
     Diğer ülkeler    → bölge ve şehir yazılıyor

   70 ülkenin ilçe listesini telefonda taşımak mümkün değil (yüz binlerce
   satır, onlarca megabayt) ve uygulama internetsiz çalışıyor. Bu yüzden
   ikinci kademe yalnızca Türkiye'de seçim, diğerlerinde serbest yazı.
   Ülke eklemek kolay: src/data/bolgeler.js dosyasına bir dizi yazmak
   yeterli, burası kendiliğinden seçim kutusuna döner.

   VERİ MODELİ DEĞİŞMİYOR: `il` alanı bölge/eyaleti, `ilce` alanı şehri
   tutuyor. Böylece talepler, servis eşleştirmesi ve profil aynı kalıyor.
   ========================================================================== */

export function KonumAlani({
  ulke = VARSAYILAN_ULKE,
  onUlke,
  il,
  onIl,
  ilce,
  onIlce,
  ilceZorunlu = true,
  ulkeGoster,
}) {
  const { t, dil, ingilizce } = useDil()

  /* Ülke seçimi yabancı dilde görünüyor; Türkçede müşteri Türkiye'de. */
  const ulkeSecimi = ulkeGoster ?? ingilizce
  const turkiye = ulke === 'TR'
  const bolgeListesi = bolgeleriGetir(ulke)
  const bolgeSecilir = turkiye || bolgeListesiVarMi(ulke)

  return (
    <>
      {ulkeSecimi && (
        <label className="field">
          <span className="field__label">{t('ortak.ulke')}</span>
          <select
            className="select"
            value={ulke}
            onChange={(e) => {
              onUlke?.(e.target.value)
              /* Ülke değişince eski bölge ve şehir anlamsız kalıyor */
              onIl('')
              onIlce('')
            }}
          >
            {ulkeListesi(dil).map((x) => (
              <option key={x.iso} value={x.iso}>
                {ulkeAdi(x.iso, dil)}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid-2">
        {/* Birinci kademe: il (TR) veya bölge/eyalet */}
        <label className="field" data-alan="il">
          <span className="field__label">{turkiye ? t('ortak.il') : t('ortak.bolge')}</span>
          {bolgeSecilir ? (
            <select
              className="select"
              value={il}
              onChange={(e) => {
                onIl(e.target.value)
                onIlce('')
              }}
            >
              <option value="">{t('ortak.secin')}</option>
              {(turkiye ? ILLER : bolgeListesi).map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          ) : (
            <input
              className="input"
              value={il}
              onChange={(e) => onIl(e.target.value)}
              autoCapitalize="words"
            />
          )}
        </label>

        {/* İkinci kademe: ilçe (TR, seçim) veya şehir (yazı) */}
        <label className="field" data-alan="ilce">
          <span className="field__label">
            {turkiye ? t('ortak.ilce') : t('ortak.sehir')}
            {!ilceZorunlu && (
              <span className="field__istege"> · {t('ortak.istegeBagli')}</span>
            )}
          </span>
          {turkiye ? (
            <select
              className="select"
              value={ilce}
              onChange={(e) => onIlce(e.target.value)}
              disabled={!il}
            >
              <option value="">{il ? t('ortak.secin') : t('ortak.onceIl')}</option>
              {ilceleriGetir(il).map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          ) : (
            <input
              className="input"
              value={ilce}
              onChange={(e) => onIlce(e.target.value)}
              autoCapitalize="words"
            />
          )}
        </label>
      </div>
    </>
  )
}
