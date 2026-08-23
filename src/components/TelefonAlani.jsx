import { ulkeAdi, ulkeGetir, ulkeListesi } from '../data/ulkeler'
import { useDil } from '../i18n'
import { formatTel } from '../lib/tel'

/* Ülke kodlu telefon alanı.

   Kayıt, giriş ve talep onayı — üçünde de aynı görünsün diye tek
   bileşen. Ülke ayrı bir kutuda seçiliyor, numara sıfırsız yazılıyor;
   numaranın soluna ülke kodu sabit olarak basılı duruyor ki kullanıcı
   ne yazması gerektiğini görsün.

   `ulkeKilitli` verilirse ülke değiştirilemiyor (giriş numarası
   kilitliyken kullanılıyor).                                          */

export function TelefonAlani({
  ulke,
  onUlke,
  tel,
  onTel,
  etiket,
  ipucu,
  hata,
  autoFocus,
  ulkeKilitli = false,
  disabled = false,
  alan,
}) {
  const { t, dil } = useDil()
  const u = ulkeGetir(ulke)

  return (
    <div className="stack" style={{ gap: 10 }}>
      <label className="field">
        <span className="field__label">{t('ortak.ulkeKodu')}</span>
        <select
          className="select"
          value={u.iso}
          onChange={(e) => onUlke(e.target.value)}
          disabled={ulkeKilitli || disabled}
        >
          {ulkeListesi(dil).map((x) => (
            <option key={x.iso} value={x.iso}>
              {ulkeAdi(x.iso, dil)} ({x.kod})
            </option>
          ))}
        </select>
      </label>

      <label className="field" data-alan={alan}>
        <span className="field__label">{etiket || t('ortak.cepTelefonu')}</span>
        <div className={'tel-kutu' + (disabled ? ' tel-kutu--kapali' : '')}>
          <span className="tel-kutu__kod">{u.kod}</span>
          <input
            className="tel-kutu__giris"
            value={formatTel(tel, u.hane)}
            /* Hane sınırı seçili ülkeden geliyor: Türkiye'de 10 haneden
               fazlası yazılamıyor (bkz. src/lib/tel.js). */
            onChange={(e) => onTel(formatTel(e.target.value, u.hane))}
            maxLength={u.hane ? u.hane + 3 : 18}
            placeholder={u.iso === 'TR' ? t('ortak.telOrnek') : ''}
            inputMode="tel"
            autoComplete="tel-national"
            autoFocus={autoFocus}
            disabled={disabled}
          />
        </div>
        {hata ? (
          <span className="field__error" style={{ marginTop: 8, display: 'block' }}>
            {hata}
          </span>
        ) : (
          ipucu && <span className="field__hint">{ipucu}</span>
        )}
      </label>
    </div>
  )
}
