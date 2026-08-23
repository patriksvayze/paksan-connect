import { useState } from 'react'
import { SIFRE_HANE } from '../lib/hesap'
import { useDil } from '../i18n'
import { IconEye, IconEyeOff } from './Icons'

/* Şifre alanı — 6 rakam.

   Neden rakam: tarlada eldivenle harf yazmak zor, telefon rakam tuş
   takımını büyük açıyor. Bir çiftlikte aynı hesabı birkaç kişi
   kullandığı için şifrenin akılda kalması ve söylenebilmesi de önemli.

   Yanındaki göz düğmesi yazılanı gösteriyor: kullanıcı yanlış
   yazdığını anlayamadan üç kez denemesin.                             */

export function SifreAlani({
  deger,
  onDegis,
  etiket,
  ipucu,
  autoFocus,
  autoComplete = 'current-password',
  alan,
}) {
  const { t } = useDil()
  const [gorunur, setGorunur] = useState(false)

  return (
    <label className="field" data-alan={alan}>
      <span className="field__label">{etiket || t('ortak.sifre')}</span>
      <div className="sifre-kutu">
        <input
          className="sifre-kutu__giris"
          type={gorunur ? 'text' : 'password'}
          value={deger}
          onChange={(e) => onDegis(e.target.value.replace(/\D/g, '').slice(0, SIFRE_HANE))}
          inputMode="numeric"
          autoComplete={autoComplete}
          placeholder="••••••"
          autoFocus={autoFocus}
        />
        <button
          type="button"
          className="sifre-kutu__goz"
          onClick={() => setGorunur((g) => !g)}
          aria-label={gorunur ? t('sifre.gizle') : t('sifre.goster')}
        >
          {gorunur ? <IconEyeOff size={21} /> : <IconEye size={21} />}
        </button>
      </div>
      {ipucu && <span className="field__hint">{ipucu}</span>}
    </label>
  )
}
