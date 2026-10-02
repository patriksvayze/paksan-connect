import { Capacitor, registerPlugin } from '@capacitor/core'

/* ==========================================================================
   Mikrofon izni — Gizlilik ve İzinler sayfalarının satırı

   NEDEN (30 Eylül 2026, kullanıcının itirazı): "Gizlilik ve İzinler
   sayfasında Uygulama İzinleri altında listelenen izinler için herhangi
   bir izin alınmıyor kullanıcıdan. Tıklandığında da izin alma ekranı
   gelmiyor. Bu izinler neden gösteriliyor?" Mikrofon, kamera ve konum
   satırları yalnız bilgiydi. Kamera ve konum satırları kalktı: uygulama
   telefondan o izinleri hiç istemiyor (fotoğraf telefonun kendi kamera
   ve dosya ekranıyla geliyor, konum kullanılmıyor; manifestte ikisi de
   yok). Kalan iki gerçek izin — bildirim ve mikrofon — bugünkü durumunu
   gösteriyor ve "İzin Ver" telefonun izin penceresini açıyor.

   İKİ YOL, TEK ARAYÜZ
     APK       MikrofonIzniPlugin.java (Connect ve Servisim'de aynısı):
               Capacitor'ın checkPermissions / requestPermissions'ı.
     Tarayıcı  Permissions API ve getUserMedia — geliştirme ve ekran turu.

   DURUMLAR: 'acik' | 'sorulmadi' | 'kapali' | 'yok'
     sorulmadi  hiç sorulmadı ya da bir kez reddedildi (telefon yeniden
                sorabiliyor: Capacitor'ın 'prompt-with-rationale'ı)
     kapali     telefon artık sormuyor; ancak ayarlardan açılır
     yok        bu cihazda mikrofon yolu yok

   Ses kaydının kendisi (components/SesKaydi.jsx) ve sesle yazma
   (servis/dikteMotoru.js) izni kendi anında yine istiyor; bu dosya
   yalnız sayfanın satırı için.
   ========================================================================== */

const Yerel = registerPlugin('MikrofonIzni')
const yerelMi = () => Capacitor.isNativePlatform()

const yereldenDurum = (d) =>
  d === 'granted' ? 'acik' : d === 'denied' ? 'kapali' : 'sorulmadi'

export async function mikrofonIzniDurumu() {
  if (yerelMi()) {
    try {
      const { mikrofon } = await Yerel.checkPermissions()
      return yereldenDurum(mikrofon)
    } catch {
      return 'yok'
    }
  }
  if (!navigator.mediaDevices?.getUserMedia) return 'yok'
  try {
    const { state } = await navigator.permissions.query({ name: 'microphone' })
    return state === 'granted' ? 'acik' : state === 'denied' ? 'kapali' : 'sorulmadi'
  } catch {
    return 'sorulmadi'
  }
}

/** Telefonun izin penceresini açar; sonucu `mikrofonIzniDurumu` biçiminde döner. */
export async function mikrofonIzniIste() {
  if (yerelMi()) {
    try {
      const { mikrofon } = await Yerel.requestPermissions({ permissions: ['mikrofon'] })
      return yereldenDurum(mikrofon)
    } catch {
      return 'yok'
    }
  }
  if (!navigator.mediaDevices?.getUserMedia) return 'yok'
  try {
    /* Tarayıcıda izni sormanın tek yolu mikrofonu açmak; akış hemen
       kapatılıyor, hiçbir şey kaydedilmiyor. */
    const akis = await navigator.mediaDevices.getUserMedia({ audio: true })
    akis.getTracks().forEach((iz) => iz.stop())
    return 'acik'
  } catch (e) {
    return e?.name === 'NotAllowedError' ? 'kapali' : 'yok'
  }
}
