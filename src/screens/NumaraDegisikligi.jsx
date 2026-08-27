import { useNavigate } from 'react-router-dom'
import { useDil } from '../i18n'
import { PaksanRozet } from '../components/Marka'
import { NumaraTalepFormu } from '../components/NumaraTalepFormu'
import { IconBack } from '../components/Icons'

/* ==========================================================================
   Telefon numarası değişikliği

   Numarayı kullanıcı kendisi değiştiremiyor: giriş numarası hesabın
   kimliği, telefonu eline geçiren biri hesabı devralırdı. Değişikliği
   PAKSAN yapıyor.

   Kullanıcı yazılı talep bırakıyor — yeni numarası ve makinesinin seri
   numarası. Talep backoffice'e düşüyor; backoffice eski numarayı ve seri
   numarasını hesapla karşılaştırıyor, yetkili onaylayınca numara
   değişiyor ve kullanıcıya bildirim gidiyor.

   Kimseyi telefona yönlendirmiyoruz: hem müşteri sırada beklemesin hem
   de ekibin telefon yükü artmasın.

   Ekrana üç yoldan geliniyor:
     · Şifremi unuttum → kod gelmedi → "numaranızı mı değiştirdiniz?"
     · Profil → giriş numarasının yanındaki bağlantı
     · Talep onayı → "bu numarayı artık kullanmıyorum"

   ÜÇÜNCÜ YOL BURAYA GELMİYOR, FORMU KENDİ İÇİNDE AÇIYOR. Sebebi:
   kullanıcı o sırada doldurduğu talebin ortasında; başka bir ekrana
   götürülse yazdıkları kaybolurdu. Form ortak bir bileşende duruyor
   (src/components/NumaraTalepFormu.jsx), iki yer de aynısını
   kullanıyor.
   ========================================================================== */

export default function NumaraDegisikligi() {
  const nav = useNavigate()
  const { t } = useDil()

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__row">
          <button className="backbtn" onClick={() => nav(-1)}>
            <IconBack size={21} />
            {t('ortak.geri')}
          </button>
          <div className="spacer" />
          <PaksanRozet />
        </div>
        <div className="topbar__titles">
          <h1>{t('numara.baslik')}</h1>
        </div>
      </header>

      <div className="screen screen--nonav wrap fade-in" style={{ paddingTop: 20 }}>
        <NumaraTalepFormu onKapat={() => nav('/profil')} />
      </div>
    </div>
  )
}
