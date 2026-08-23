import { KVKK_SURUM, KVKK_TARIH } from '../data/kvkk'
import { IconCheck } from './Icons'
import { useDil } from '../i18n'

/* Uzun bilgilendirme metinlerini (KVKK, açık rıza) ekranda okunur biçimde
   çizer. Metinlerin kendisi src/data/kvkk.js içinde durur; burada yalnızca
   nasıl görüneceği tarif edilir.

   Satır aralığı ve punto kasıtlı olarak yüksek: bu metinler telefonda,
   çoğu zaman gözlük olmadan okunacak. */

export function Metin({ metin }) {
  return (
    <div className="metin">
      {/* Çeviri uyarısı — İngilizce metinlerin başında duruyor */}
      {metin.ustNot && <p className="metin__not">{metin.ustNot}</p>}
      {metin.bolumler.map((b) => (
        <section key={b.baslik} className="metin__bolum">
          <h3 className="metin__baslik">{b.baslik}</h3>

          {b.paragraflar?.map((p) => (
            <p key={p} className="metin__p">
              {p}
            </p>
          ))}

          {b.maddeler && (
            <ul className="metin__liste">
              {b.maddeler.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <p className="metin__alt">
        {KVKK_SURUM} · {KVKK_TARIH}
      </p>
    </div>
  )
}

/* Onay satırı. Satırın tamamı dokunulabilir; içindeki "oku" bağlantısı
   satırı işaretlemeden metni açar. `onOku` verilmezse bağlantı çıkmaz —
   metnin zaten açık olduğu yerlerde (profil) böyle kullanılır. */
export function OnayKutusu({ cumle, deger, onDegis, onOku }) {
  const { t } = useDil()
  return (
    <label className={'onay' + (deger ? ' onay--on' : '')}>
      <input
        type="checkbox"
        className="onay__giris"
        checked={deger}
        onChange={(e) => onDegis(e.target.checked)}
      />
      <span className="onay__kutu">
        <IconCheck size={15} />
      </span>
      <span className="onay__metin">
        {cumle}
        {onOku && (
          <>
            {' '}
            <span
              className="onay__oku"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onOku()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onOku()
                }
              }}
            >
              {t('ortak.metniOku')}
            </span>
          </>
        )}
      </span>
    </label>
  )
}
