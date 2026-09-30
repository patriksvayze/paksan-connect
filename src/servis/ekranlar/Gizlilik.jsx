import { useState } from 'react'
import { Sayfa, Bolum } from '../Kabuk'
import { markaEk } from '../../marka'
import {
  SERVIS_KABUL_METINLERI,
  SERVIS_IZINLER,
  SERVIS_METIN_SURUM,
  SERVIS_METIN_TARIH,
} from '../../data/servisGizlilik'
import { servisinSonKabulu, servisKabulunuKaydet } from '../../lib/servisGizlilik'
import { useBildirimIzni } from '../haber'
import { IconBell, IconBook, IconCamera, IconMic, IconPin, IconRight, IconShield } from '../../components/Icons'

/* ==========================================================================
   Servisim — gizlilik: ilk giriş kapısı, metin sayfası, Hesap'taki satır

   KARAR (29 Eylül 2026, kullanıcının: "İlk girişte onay ekranı").
   Servis ilk girişte, şifresini belirledikten hemen sonra, iki kısa
   metni görüyor: kendisine yönelik aydınlatma metni ve "Müşteri
   Bilgilerinin Gizliliği". Her birinin üç satırlık özeti ekranda, tamamı
   "Metni Oku" ile. Tek düğme: "Okudum, Kabul Ediyorum". Metin sürümü
   değişince (data/servisGizlilik.js → SERVIS_METIN_SURUM) bir sonraki
   girişte yeniden soruluyor.

   NEDEN KAPI, NEDEN TEK DÜĞME. Servisin kullanıcısı tarlada, ayakta;
   "tek ekranda tek soru" kuralı. Kabul etmeden devam edilemiyor: çiftçi
   verisi ancak gizlilik kurallarını okumuş kişiye açılıyor. İki ayrı
   kutu işaretletmek sorulan soruyu artırırdı; iki metin de aynı
   kararın (bu uygulamayla çalışıyorum) parçası. Açık rıza İSTENMİYOR;
   gerekçesi data/servisGizlilik.js başında.

   GİZLİLİK VE İZİNLER SAYFASI (30 Eylül 2026, kullanıcının isteği:
   "Servisim'de de, Connect'te olduğu gibi, Servisim için uyarlanmış
   Gizlilik ve İzinler kısmı olsun"). Hesap → "Gizlilik ve İzinler":
   kabul edilen iki metin ve kabulün tarihi/sürümü, uygulamanın
   telefondan istediği izinler (bildirim izninin bugünkü durumu ve "İzin
   Ver"; mikrofon, kamera, konum) ve izinlerin açıklaması. Connect'in
   sayfasının (screens/Gizlilik.jsx) karşılığı; kampanya izni yok,
   servise kampanya bildirimi gitmiyor. Bir gün önce Hesap'ta duran
   "Gizlilik ve kurallar" ile "Telefonunuz kaybolursa" bölümleri
   kullanıcının isteğiyle kaldırılmıştı; yerine bu sayfa geldi.
   ========================================================================== */

const METIN = {
  kapiBaslik: 'Başlamadan Önce',
  kapiGiris: 'Uygulamayı kullanmak için iki kısa metni okuyup kabul etmeniz gerekiyor.',
  kapiGirisGuncel: 'Metinlerimiz güncellendi. Devam etmek için güncel metinleri okuyup kabul edin.',
  metniOku: 'Metni Oku',
  kabul: 'Okudum, Kabul Ediyorum',
  cikis: 'Çıkış Yap',
  kabulHata: 'Onayınız kaydedilemedi. Tekrar deneyin.',
  surum: (surum, tarih) => `Sürüm ${surum} · ${tarih}`,
  /* Gizlilik ve İzinler (Codex'ten geçti, 30 Eylül 2026). Hesap'taki
     "Gizlilik" bölüm başlığı aynı gün kalktı: satır "Hesabım"da. */
  satir: 'Gizlilik ve İzinler',
  satirAlt: 'Kabul ettiğiniz metinler ve uygulama izinleri',
  baslik: 'Gizlilik ve İzinler',
  giris: `Burada ${markaEk('in')} bilgilerinizi nasıl işlediğini, kabul ettiğiniz metinleri ve uygulamanın istediği telefon izinlerini görebilirsiniz.`,
  metinlerBaslik: 'Kabul ettiğiniz metinler',
  kabulEdildi: (tarih, surum) => `Kabul ettiniz · ${tarih} · sürüm ${surum}`,
  izinlerBaslik: 'Uygulama izinleri',
  bildirim: 'Bildirimler',
  durumAcik: 'Açık',
  durumKapali: 'Kapalı',
  durumSorulmadi: 'Henüz sorulmadı',
  durumYok: 'Bu cihazda kullanılamıyor',
  bildirimKapaliAlt: 'Telefonunuzun ayarlarından açabilirsiniz',
  izinVer: 'İzin Ver',
  mikrofon: 'Mikrofon',
  mikrofonAlt: 'Yalnızca “Konuşarak Yaz” düğmesine bastığınızda izin istenir',
  kamera: 'Kamera ve fotoğraflar',
  kameraAlt: 'Yalnızca servis kaydına fotoğraf eklerken kullanılır',
  konum: 'Konum',
  konumAlt: 'Uygulama konumunuzu kullanmaz',
  izinlerAyrinti: 'İzin Açıklamalarını Oku',
}

const tarihYaz = (z) =>
  new Date(z).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

/* ------------------------------------------------------------ Kapı */

/**
 * @param {object}   oturum
 * @param {string}   surum      uygulama sürümü (kabul satırına yazılıyor)
 * @param {Function} onKabul    kabul kaydedildi
 * @param {Function} onCikis    oturumu kapat
 */
export function GizlilikKapisi({ oturum, surum, onKabul, onCikis }) {
  const [okunan, setOkunan] = useState(null)
  const [hata, setHata] = useState('')
  /* Daha önce eski bir sürümü kabul ettiyse cümle "güncellendi" diyor. */
  const guncelleme = Boolean(servisinSonKabulu(oturum.servisId))

  if (okunan) return <MetinSayfasi metin={okunan} onGeri={() => setOkunan(null)} />

  function kabulEt() {
    try {
      servisKabulunuKaydet(oturum, guncelleme ? 'servisimGuncelleme' : 'servisimIlkGiris', surum)
    } catch {
      return setHata(METIN.kabulHata)
    }
    onKabul()
  }

  return (
    <Sayfa
      baslik={METIN.kapiBaslik}
      dip={
        <button className="dg dg--ana dg--blok" data-eylem="gizlilik-kabul" onClick={kabulEt}>
          {METIN.kabul}
        </button>
      }
    >
      <div className="kapi" data-gizlilik-kapisi>
        <p className="kapi__giris">{guncelleme ? METIN.kapiGirisGuncel : METIN.kapiGiris}</p>

        {SERVIS_KABUL_METINLERI.map((m) => (
          <section key={m.id} className="kart kapi__kart">
            <h2 className="kapi__baslik">
              <IconShield size={20} />
              {m.baslik}
            </h2>
            <ul className="kapi__ozet">
              {m.ozet.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <button className="dg dg--blok" data-metin={m.id} onClick={() => setOkunan(m)}>
              {METIN.metniOku}
            </button>
          </section>
        ))}

        {hata && <div className="uyari">{hata}</div>}

        <button className="dg dg--blok kapi__cikis" onClick={onCikis}>
          {METIN.cikis}
        </button>
      </div>
    </Sayfa>
  )
}

/* ------------------------------------------------------ Metin sayfası */

export function MetinSayfasi({ metin, onGeri }) {
  return (
    <Sayfa baslik={metin.kisaAd} onGeri={onGeri}>
      <article className="yasal" data-yasal={metin.id}>
        {/* Sayfanın başlığı kısa ad; tam ad farklıysa bir kez burada. */}
        {metin.baslik !== metin.kisaAd && <h2 className="yasal__baslik">{metin.baslik}</h2>}
        {metin.bolumler.map((b) => (
          <section key={b.baslik} className="yasal__bolum">
            <h3 className="yasal__alt">{b.baslik}</h3>
            {b.paragraflar?.map((p) => (
              <p key={p} className="yasal__p">{p}</p>
            ))}
            {b.maddeler && (
              <ul className="yasal__liste">
                {b.maddeler.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <p className="yasal__surum">{METIN.surum(SERVIS_METIN_SURUM, SERVIS_METIN_TARIH)}</p>
      </article>
    </Sayfa>
  )
}

/* ------------------------------------------- Hesap'taki satır

   KENDİ BAŞLIĞI VE KARTI YOK (30 Eylül 2026, kullanıcının isteği:
   "Görünüm, Gizlilik, Oturum başlıklarını sil, bunların altındaki
   butonları 'Hesabım' başlığı altında topla"). Satır Hesap'taki
   "Hesabım" kartının içinde, Görünüm satırının altında duruyor; kartı ve
   başlığı orası veriyor (ServisPanel.jsx → Hesap). Önce kendini
   "Gizlilik" başlıklı ayrı bir bölüme sarıyordu. */

export function GizlilikSatiri({ onAc }) {
  return (
    <button className="sgizlilik__satir" data-eylem="gizlilik-izinler" onClick={onAc}>
      <span className="sgizlilik__ikon"><IconShield size={20} /></span>
      <span className="sgizlilik__govde">
        <span className="sgizlilik__ad">{METIN.satir}</span>
        <span className="sgizlilik__alt">{METIN.satirAlt}</span>
      </span>
      <IconRight size={18} />
    </button>
  )
}

/* ------------------------------------------- Gizlilik ve İzinler */

export function GizlilikSayfasi({ oturum, onGeri }) {
  const [okunan, setOkunan] = useState(null)
  const izin = useBildirimIzni()
  if (okunan) return <MetinSayfasi metin={okunan} onGeri={() => setOkunan(null)} />

  const kabul = servisinSonKabulu(oturum.servisId)
  const B = izin.BILDIRIM
  const bildirimYazisi = !izin.destekli
    ? METIN.durumYok
    : {
        [B.VERILDI]: METIN.durumAcik,
        [B.REDDEDILDI]: METIN.durumKapali,
        [B.ENGELLI]: METIN.durumKapali,
        [B.SORULMADI]: METIN.durumSorulmadi,
        [B.DESTEKLENMIYOR]: METIN.durumYok,
      }[izin.durum]
  const kapali = izin.durum === B.REDDEDILDI || izin.durum === B.ENGELLI

  return (
    <Sayfa baslik={METIN.baslik} onGeri={onGeri}>
      <div className="sgizlilik" data-gizlilik-sayfasi>
        <p className="kapi__giris">{METIN.giris}</p>

        <Bolum ad={METIN.metinlerBaslik}>
          <div className="kart sgizlilik__liste">
            {SERVIS_KABUL_METINLERI.map((m) => (
              <button key={m.id} className="sgizlilik__satir" data-metin={m.id} onClick={() => setOkunan(m)}>
                <span className="sgizlilik__ikon"><IconBook size={20} /></span>
                <span className="sgizlilik__govde">
                  <span className="sgizlilik__ad">{m.kisaAd}</span>
                  {kabul && (
                    <span className="sgizlilik__alt" data-kabul-satiri>
                      {METIN.kabulEdildi(tarihYaz(kabul.tarih), kabul.surum)}
                    </span>
                  )}
                </span>
                <IconRight size={18} />
              </button>
            ))}
          </div>
        </Bolum>

        <Bolum ad={METIN.izinlerBaslik}>
          <div className="kart sgizlilik__liste">
            <div className="sgizlilik__satir sgizlilik__satir--sabit" data-izin="bildirim">
              <span className="sgizlilik__ikon"><IconBell size={20} /></span>
              <span className="sgizlilik__govde">
                <span className="sgizlilik__ad">{METIN.bildirim}</span>
                {bildirimYazisi && <span className="sgizlilik__alt">{bildirimYazisi}</span>}
                {kapali && <span className="sgizlilik__alt">{METIN.bildirimKapaliAlt}</span>}
              </span>
              {izin.destekli && izin.durum === B.SORULMADI && (
                <button className="dg sgizlilik__izin" onClick={izin.iste}>
                  {METIN.izinVer}
                </button>
              )}
            </div>
            <IzinSatiri Ikon={IconMic} ad={METIN.mikrofon} alt={METIN.mikrofonAlt} />
            <IzinSatiri Ikon={IconCamera} ad={METIN.kamera} alt={METIN.kameraAlt} />
            <IzinSatiri Ikon={IconPin} ad={METIN.konum} alt={METIN.konumAlt} />
          </div>
          <button className="dg dg--blok" style={{ marginTop: 12 }} onClick={() => setOkunan(SERVIS_IZINLER)}>
            {METIN.izinlerAyrinti}
          </button>
        </Bolum>
      </div>
    </Sayfa>
  )
}

function IzinSatiri({ Ikon, ad, alt }) {
  return (
    <div className="sgizlilik__satir sgizlilik__satir--sabit">
      <span className="sgizlilik__ikon"><Ikon size={20} /></span>
      <span className="sgizlilik__govde">
        <span className="sgizlilik__ad">{ad}</span>
        <span className="sgizlilik__alt">{alt}</span>
      </span>
    </div>
  )
}
