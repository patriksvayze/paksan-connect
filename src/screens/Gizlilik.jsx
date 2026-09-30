import { useEffect, useState } from 'react'
import { TopBar, TabBar, Sheet } from '../components/Chrome'
import { Metin, OnayKutusu } from '../components/Metin'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { AYDINLATMA, ACIK_RIZA, TICARI_ILETI, IZINLER, metinDilde } from '../data/kvkk'
import { BILDIRIM, izinIste, mevcutIzin } from '../lib/bildirim'
import { RIZA_METNI, kampanyaDegisti, kampanyaSonDegisiklik } from '../lib/rizaKaydi'
import { IconBell, IconBook, IconCamera, IconMic, IconPin, IconRight } from '../components/Icons'

/* ==========================================================================
   Gizlilik ve İzinler — Profil'in içinde

   NEDEN VAR (29 Eylül 2026, kullanıcının isteği: "KVKK, Açık Rıza Metni
   ve İzinler kısmı gözden geçirilecek, geliştirilmesi gerekiyorsa
   geliştirilecek, hem ekran hem içerik"). Önce Profil'in en dibinde küçük
   bir bağlantı vardı ("KVKK | Açık Rıza Metni | İzinler"); açılan
   pencerede üç sekme, kampanya izni üçüncü sekmenin içinde. "İzinler"
   diye bir bölüm yoktu; hesap silmenin yolu çıkış penceresinde bir
   cümleydi. İnceleme bulguları:

     · Kampanya iznini kapatmak üç dokunuş derindeydi; metin "tek
       dokunuşla" diyordu.
     · Uygulamanın telefondan ne istediği (bildirim, mikrofon, kamera)
       hiçbir yerde toplu yazmıyordu.
     · Hangi metni ne zaman onayladığınız yalnız tek satırdı; kampanya
       izninin ne zaman değiştiği hiç görünmüyordu.
     · Başvuru ve hesap kapatma yolu aranınca bulunmuyordu.

   Sayfa bunları tek yerde topluyor: metinler ve onay tarihleri, kampanya
   izni (son değişikliğiyle) ve uygulama izinlerinin bugünkü durumu.
   "Haklarınız ve başvuru" ile "Onay geçmişi" bölümleri aynı gün
   kaldırıldı (kullanıcının isteği); başvuru yolu Aydınlatma Metni'nde,
   onay geçmişi backoffice'in müşteri kartında. Kayıt biçimi
   lib/rizaKaydi.js başında.
   ========================================================================== */

const METIN_SIRASI = [AYDINLATMA, ACIK_RIZA, TICARI_ILETI]

export default function Gizlilik() {
  const { user, updateUser, showToast } = useApp()
  const { t, dil } = useDil()
  const [acik, setAcik] = useState(null)
  const [bildirimDurum, setBildirimDurum] = useState(null)

  useEffect(() => {
    let iptal = false
    mevcutIzin().then((d) => !iptal && setBildirimDurum(d))
    return () => {
      iptal = true
    }
  }, [])

  const onaylar = user?.onaylar || {}
  const tarihYaz = (z) =>
    new Date(z).toLocaleDateString(dil === 'tr' ? 'tr-TR' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  /* Metnin satırındaki alt yazı: zorunlu iki metin onay tarihiyle,
     kampanya metni açık/kapalı durumuyla. */
  function metinAlti(m) {
    if (m.id === RIZA_METNI.KAMPANYA) {
      return onaylar.kampanya ? t('gizlilik.kampanyaAcik') : t('gizlilik.kampanyaKapali')
    }
    const onayli = m.id === RIZA_METNI.AYDINLATMA ? onaylar.aydinlatma : onaylar.acikRiza
    if (!onayli || !onaylar.tarih) return t('gizlilik.onayYok')
    return t('gizlilik.onaylandi', { tarih: tarihYaz(onaylar.tarih), surum: onaylar.surum })
  }

  function kampanyaDegistir(v) {
    updateUser({ onaylar: kampanyaDegisti(onaylar, v, dil) })
    showToast(v ? t('profil.kampanyaAcik') : t('profil.kampanyaKapali'))
  }

  async function bildirimIzniVer() {
    const d = await izinIste()
    setBildirimDurum(d)
    updateUser({ bildirim: { izin: d, tarih: Date.now() } })
  }

  const bildirimYazisi = {
    [BILDIRIM.VERILDI]: t('gizlilik.durumAcik'),
    [BILDIRIM.REDDEDILDI]: t('gizlilik.durumKapali'),
    [BILDIRIM.ENGELLI]: t('gizlilik.durumKapali'),
    [BILDIRIM.SORULMADI]: t('gizlilik.durumSorulmadi'),
    [BILDIRIM.DESTEKLENMIYOR]: t('gizlilik.durumYok'),
  }[bildirimDurum]
  const bildirimKapali = bildirimDurum === BILDIRIM.REDDEDILDI || bildirimDurum === BILDIRIM.ENGELLI

  const kampanyaSon = kampanyaSonDegisiklik(onaylar)

  return (
    <div className="app">
      <TopBar title={t('gizlilik.baslik')} back="/profil" />

      <div className="screen wrap gizlilik">
        <p className="gizlilik__giris">{t('gizlilik.giris')}</p>

        {/* ------------------------------------------------ Metinler */}
        <div className="sectionhead">
          <h2>{t('gizlilik.metinlerBaslik')}</h2>
        </div>
        <div className="stack">
          {METIN_SIRASI.map((m) => {
            const md = metinDilde(m, dil)
            return (
              <button key={m.id} className="listitem" data-metin={m.id} onClick={() => setAcik(md)}>
                <div className="listitem__icon"><IconBook size={22} /></div>
                <div className="listitem__body">
                  <div className="listitem__title">{md.kisaAd}</div>
                  <div className="listitem__sub">{metinAlti(m)}</div>
                </div>
                <IconRight size={20} />
              </button>
            )
          })}
        </div>

        {/* ------------------------------------- Kampanya bildirimleri */}
        <div className="sectionhead">
          <h2>{t('gizlilik.kampanyaBaslik')}</h2>
        </div>
        <div className="gizlilik__kart" data-alan="kampanya">
          <OnayKutusu
            cumle={metinDilde(TICARI_ILETI, dil).onayCumlesi}
            deger={Boolean(onaylar.kampanya)}
            onDegis={kampanyaDegistir}
          />
          {kampanyaSon && (
            <p className="gizlilik__not" data-kampanya-tarih>
              {t('gizlilik.sonDegisiklik', { tarih: tarihYaz(kampanyaSon) })}
            </p>
          )}
        </div>

        {/* ----------------------------------------- Uygulama izinleri */}
        <div className="sectionhead">
          <h2>{t('gizlilik.izinlerBaslik')}</h2>
        </div>
        <div className="stack">
          <div className="listitem listitem--sarmal" data-izin="bildirim">
            <div className="listitem__icon"><IconBell size={22} /></div>
            <div className="listitem__body">
              <div className="listitem__title">{t('gizlilik.izinBildirim')}</div>
              {bildirimYazisi && <div className="listitem__sub">{bildirimYazisi}</div>}
              {bildirimKapali && <div className="listitem__sub">{t('gizlilik.bildirimKapaliAlt')}</div>}
            </div>
            {bildirimDurum === BILDIRIM.SORULMADI && (
              <button className="btn btn--soft listitem__eylem" onClick={bildirimIzniVer}>
                {t('gizlilik.izinVer')}
              </button>
            )}
          </div>
          <IzinSatiri Ikon={IconMic} ad={t('gizlilik.izinMikrofon')} alt={t('gizlilik.izinMikrofonAlt')} />
          <IzinSatiri Ikon={IconCamera} ad={t('gizlilik.izinKamera')} alt={t('gizlilik.izinKameraAlt')} />
          <IzinSatiri Ikon={IconPin} ad={t('gizlilik.izinKonum')} alt={t('gizlilik.izinKonumAlt')} />
        </div>
        <button className="btn btn--soft" style={{ marginTop: 12 }} onClick={() => setAcik(metinDilde(IZINLER, dil))}>
          {t('gizlilik.izinlerAyrinti')}
        </button>
      </div>

      <Sheet open={Boolean(acik)} onClose={() => setAcik(null)} title={acik?.baslik}>
        {acik && <Metin metin={acik} />}
        <button className="btn btn--primary" style={{ marginTop: 18 }} onClick={() => setAcik(null)}>
          {t('ortak.kapat')}
        </button>
      </Sheet>

      <TabBar />
    </div>
  )
}

function IzinSatiri({ Ikon, ad, alt }) {
  return (
    <div className="listitem">
      <div className="listitem__icon"><Ikon size={22} /></div>
      <div className="listitem__body">
        <div className="listitem__title">{ad}</div>
        <div className="listitem__sub">{alt}</div>
      </div>
    </div>
  )
}
