import { useState } from 'react'
import { Sheet } from './Chrome'
import { Metin, OnayKutusu } from './Metin'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { AYDINLATMA, ACIK_RIZA, metinDilde } from '../data/kvkk'
import { guncellemeOnayi } from '../lib/rizaKaydi'

/* ==========================================================================
   Metinler güncellenince yeniden onay — Connect

   NEDEN VAR (29 Eylül 2026). KVKK metinleri 1.0'dan 1.1'e geçti (yanlış
   cümleler düzeltildi, eksikler eklendi; bkz. data/kvkk.js başı). Açık
   rıza kayıtta zorunlu (kullanıcının kararı); eski metne verilmiş rıza
   değişen metni kapsamıyor. Eski sürümü onaylamış hesap uygulamayı
   açınca bu pencere çıkıyor: iki zorunlu metin, okuma bağlantılarıyla.
   Kampanya izni değişmiyor; o isteğe bağlı ve kararı ayrı duruyor.

   ONAY ZORUNLU, ERTELENMİYOR (29 Eylül 2026, kullanıcının kararı:
   "'Daha Sonra' seçeneği olmamalı, bu izinler zorunlu şekilde
   onaylanmalı. Müşterinin uygulamayı kullanmaması onun seçeneği").
   Pencere kapatılamıyor: zemine dokunmak ve aşağı sürüklemek bir şey
   yapmıyor; onaylanana kadar uygulama kullanılamıyor. Önce "Daha Sonra"
   vardı ve uygulama onaysız kullanılabiliyordu.

   Kayıt: lib/rizaKaydi.js → guncellemeOnayi (kanal connectGuncelleme).
   ========================================================================== */

export function KvkkGuncelleme() {
  const { user, updateUser } = useApp()
  const { t, dil } = useDil()
  const [aydinlatma, setAydinlatma] = useState(false)
  const [riza, setRiza] = useState(false)
  const [hata, setHata] = useState('')
  const [okunan, setOkunan] = useState(null)

  function onayla() {
    if (!aydinlatma) return setHata(t('kayit.aydinlatmaGerekli'))
    if (!riza) return setHata(t('kayit.rizaGerekli'))
    updateUser({ onaylar: guncellemeOnayi(user?.onaylar, dil) })
  }

  return (
    <Sheet open title={okunan ? okunan.baslik : t('guncelleme.baslik')}>
      {okunan ? (
        <>
          <Metin metin={okunan} />
          <button className="btn btn--primary" style={{ marginTop: 18 }} onClick={() => setOkunan(null)}>
            {t('ortak.kapat')}
          </button>
        </>
      ) : (
        <div className="stack" style={{ gap: 12 }} data-kvkk-guncelleme>
          <p className="muted" style={{ lineHeight: 1.6 }}>{t('guncelleme.metin')}</p>
          <OnayKutusu
            cumle={metinDilde(AYDINLATMA, dil).onayCumlesi}
            deger={aydinlatma}
            onDegis={(x) => { setHata(''); setAydinlatma(x) }}
            onOku={() => setOkunan(metinDilde(AYDINLATMA, dil))}
          />
          <OnayKutusu
            cumle={metinDilde(ACIK_RIZA, dil).onayCumlesi}
            deger={riza}
            onDegis={(x) => { setHata(''); setRiza(x) }}
            onOku={() => setOkunan(metinDilde(ACIK_RIZA, dil))}
          />
          {hata && <div className="uyari-kart" role="alert">{hata}</div>}
          <button className="btn btn--primary btn--lg" onClick={onayla}>
            {t('guncelleme.onayla')}
          </button>
        </div>
      )}
    </Sheet>
  )
}
