import { useState } from 'react'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { izinIste, bildirimGoster, engelNerede, BILDIRIM } from '../lib/bildirim'
import { IconBell, IconCheck } from './Icons'

/* Bildirim izni adımı — kayıttan ve girişten sonra.

   Önce yalnız kayıt ekranındaydı (screens/Register.jsx). Var olan bir
   hesapla giriş yapan kullanıcıya — yeni telefon, uygulamayı silip
   yeniden kuran — izin hiç sorulmuyordu; bildirimsiz kalıyordu ve
   bunu bilmiyordu (22 Eylül 2026, kullanıcı bildirdi). Adım bu yüzden
   ortak bileşene alındı; giriş ekranı, bu cihazda izin henüz
   sorulmamışsa aynı adımı gösteriyor (screens/Login.jsx).

   İzin kutusu kendiliğinden açılmıyor; önce ne için istendiği
   anlatılıyor, kullanıcı düğmeye bastığında soruluyor.

   @param {boolean} kampanya   hesap kampanya iletisine onay verdiyse
                               dördüncü satır da gösteriliyor
   @param {Function} onBitti   (BILDIRIM.*) — izin verildi ya da
                               "şimdi değil" dendi; adım bitiyor        */
export function BildirimIzniAdimi({ kampanya, onBitti }) {
  const { showToast } = useApp()
  const { t } = useDil()
  /* İzin sistem tarafından engellenmişse ekran ilerlemiyor; kullanıcı
     ne olduğunu ve nereden açacağını okuyor. */
  const [engelli, setEngelli] = useState(false)

  async function izinVer() {
    const sonuc = await izinIste()

    /* İzin alınır alınmaz ilk bildirim çıkıyor.

       İki işi birden görüyor. Kullanıcı iznin gerçekten çalıştığını
       görüyor — "izin verdim ama bir şey olmadı" hissi kalmıyor. Bir de
       PAKSAN bildiriminin telefonda nasıl göründüğünü daha ilk anda
       gösteriyor. */
    if (sonuc === BILDIRIM.VERILDI) {
      bildirimGoster({
        baslik: t('kayit.bildirimOrnekBaslik'),
        metin: t('kayit.bildirimOrnekMetin'),
        yol: '/bildirimler',
      })
    }

    /* Çok eski bir tarayıcıda bildirim hiç yok; düğme sessizce
       geçmesin, kullanıcı ne olduğunu bilsin. */
    if (sonuc === BILDIRIM.DESTEKLENMIYOR) {
      showToast(t('kayit.bildirimDemo'))
    }

    /* İZİN ENGELLİYSE EKRAN İLERLEMİYOR.

       Daha önce bir kez reddedilmiş izin için ne tarayıcı ne Android
       pencereyi açıyor; düğmeye basılıyor ve hiçbir şey olmuyordu.
       Ekran sonraki adıma geçince kullanıcı izin verdiğini sanıyordu.
       Artık burada kalıyor ve izni nereden geri açacağını okuyor. */
    if (sonuc === BILDIRIM.ENGELLI) {
      setEngelli(true)
      return
    }

    onBitti(sonuc)
  }

  return (
    <div className="screen screen--nonav wrap fade-in" style={{ paddingTop: 26 }}>
      <div className="center">
        <div className="bildirim__ikon">
          <IconBell size={34} />
        </div>
        <h2 style={{ fontSize: 21, marginTop: 16 }}>{t('kayit.bildirimUst')}</h2>
        <p className="muted" style={{ marginTop: 8, lineHeight: 1.6, fontSize: 15.5 }}>
          {t('kayit.bildirimAlt')}
        </p>
      </div>

      <div className="stack" style={{ gap: 10, marginTop: 24 }}>
        <BildirimSatiri metin={t('kayit.bildirim1')} />
        <BildirimSatiri metin={t('kayit.bildirim2')} />
        <BildirimSatiri metin={t('kayit.bildirim3')} />
        {kampanya && <BildirimSatiri metin={t('kayit.bildirim4')} />}
      </div>

      {engelli && (
        <div className="uyari-kart" style={{ marginTop: 22 }}>
          <strong>{t('kayit.bildirimEngelBaslik')}</strong>
          <p style={{ margin: '6px 0 0' }}>
            {t(engelNerede().tarayici ? 'kayit.bildirimEngelTarayici' : 'kayit.bildirimEngelTelefon')}
          </p>
        </div>
      )}

      <div className="stack" style={{ gap: 10, marginTop: 28 }}>
        <button className="btn btn--orange btn--lg" onClick={izinVer}>
          {engelli ? t('kayit.bildirimTekrarDene') : t('kayit.bildirimIzin')}
        </button>
        <button className="btn btn--soft" onClick={() => onBitti(BILDIRIM.SORULMADI)}>
          {engelli ? t('kayit.bildirimEngelDevam') : t('kayit.bildirimSonra')}
        </button>
      </div>

      <p className="small muted center" style={{ marginTop: 18, lineHeight: 1.55 }}>
        {t('kayit.bildirimNot')}
      </p>
    </div>
  )
}

function BildirimSatiri({ metin }) {
  return (
    <div className="listitem listitem--flat" style={{ alignItems: 'flex-start' }}>
      <div
        className="listitem__icon"
        style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          background: 'var(--pk-green-soft)',
          color: 'var(--pk-green-yazi)',
        }}
      >
        <IconCheck size={18} />
      </div>
      <div className="listitem__body">
        <div style={{ fontSize: 14.5, lineHeight: 1.5 }}>{metin}</div>
      </div>
    </div>
  )
}
