import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

/* ==========================================================================
   Uygulama bildirimleri

   Uygulamanın geri kalanı bildirimin nasıl çalıştığını bilmez; yalnızca
   buradaki fonksiyonları çağırır.

   İKİ AYRI ORTAM, TEK ARAYÜZ

   Telefonda (APK) Android'in kendi bildirim izni isteniyor ve bildirim
   telefonun bildirim perdesinde çıkıyor. Tarayıcıda ise tarayıcının
   kendi izni isteniyor. Çağıran ekran hangisinde olduğunu bilmiyor.

   ÖNCEDEN TELEFONDA HİÇ SORULMUYORDU

   Burada yalnızca tarayıcının `Notification` arayüzü kullanılıyordu.
   Android'in WebView'inde o arayüz yok; sonuç "desteklenmiyor" olarak
   dönüyor, kullanıcı izin verdiğini sanıyor ama hiçbir şey sorulmuyordu.
   Kayıt sırasında konum izni çıkıp bildirim izni çıkmamasının sebebi
   buydu.

   ANDROID 13 VE SONRASI

   İzin istemek için `POST_NOTIFICATIONS` iznini AndroidManifest.xml
   içinde ilan etmek şart; ilan edilmemişse Android istek penceresini
   hiç açmıyor, doğrudan "reddedildi" diyor. İlanı orada duruyor.

   YEREL BİLDİRİM, UZAK BİLDİRİM DEĞİL

   Şu an uygulama bildirimleri KENDİ üretiyor: backoffice'ten gelen bir
   duyuruyu gördüğünde telefonun bildirim perdesine kendisi koyuyor.
   Uygulama kapalıyken bildirim gönderebilmek için sunucu ve Firebase
   gerekiyor (bkz. PRODA-CIKIS.md → A1g). O geldiğinde değişecek tek
   dosya yine bu dosya: izin isteme ve gösterme aynı kalıyor, araya
   cihaz kimliğinin sunucuya gönderilmesi ekleniyor.
   ========================================================================== */

export const BILDIRIM = {
  VERILDI: 'verildi',
  REDDEDILDI: 'reddedildi',
  SORULMADI: 'sorulmadi',
  DESTEKLENMIYOR: 'desteklenmiyor',
  /* SİSTEM SORMAYI REDDEDİYOR — "kullanıcı az önce hayır dedi" değil.

     Hem tarayıcı hem Android, izin bir kez reddedildikten sonra bir
     daha PENCEREYİ AÇMIYOR: `requestPermission()` hiçbir şey
     göstermeden anında "denied" dönüyor. Kullanıcının gördüğü şey
     "izin ver" düğmesine bastım, hiçbir şey olmadı.

     İkisi `REDDEDILDI` altında toplanınca ekran ikisini de aynı
     şekilde geçiştiriyordu. Ayrıldı: bu durumda kullanıcıya izni
     nereden geri açacağı söyleniyor. */
  ENGELLI: 'engelli',
}

/* Telefondaki uygulama mı, tarayıcı mı? */
const telefonda = () => Capacitor.isNativePlatform()

/* Android bildirimleri kanallara ayırıyor. Kanal olmazsa bildirim
   sistemin varsayılan kanalına düşüyor; kullanıcı da "PAKSAN duyuruları"
   yerine adı belirsiz bir kanalı kapatmak zorunda kalıyor. */
const KANAL = 'paksan-duyuru'
let kanalKuruldu = false

async function kanaliKur() {
  if (kanalKuruldu || Capacitor.getPlatform() !== 'android') return
  try {
    await LocalNotifications.createChannel({
      id: KANAL,
      name: `PAKSAN duyuruları`,
      description: `Talep durumu, servis randevusu ve PAKSAN duyuruları`,
      importance: 4, // perdede sesli çıkar
      visibility: 1, // kilit ekranında görünür
    })
    kanalKuruldu = true
  } catch {
    /* Kanal kurulamazsa bildirim yine çıkar, sadece varsayılan kanalda. */
  }
}

/** Cihaz bildirim gösterebiliyor mu? */
export function bildirimDestekleniyorMu() {
  if (telefonda()) return true
  return typeof window !== 'undefined' && 'Notification' in window
}

/** Daha önce verilmiş bir karar var mı?
    Telefonda cevap ancak Android'e sorulduktan sonra geldiği için
    tarayıcıda da söz (Promise) dönüyor — çağıran taraf iki ayrı
    davranışla uğraşmasın. */
export async function mevcutIzin() {
  if (!bildirimDestekleniyorMu()) return BILDIRIM.DESTEKLENMIYOR

  if (telefonda()) {
    try {
      const x = await LocalNotifications.checkPermissions()
      return cevir(x.display)
    } catch {
      return BILDIRIM.SORULMADI
    }
  }

  if (Notification.permission === 'granted') return BILDIRIM.VERILDI
  if (Notification.permission === 'denied') return BILDIRIM.REDDEDILDI
  return BILDIRIM.SORULMADI
}

/* Capacitor'ın verdiği karşılık: granted / denied / prompt /
   prompt-with-rationale */
function cevir(durum) {
  if (durum === 'granted') return BILDIRIM.VERILDI
  if (durum === 'denied') return BILDIRIM.REDDEDILDI
  return BILDIRIM.SORULMADI
}

/**
 * Bildirim izni ister. Kullanıcının bir düğmeye basmasıyla çağrılmalı —
 * hem Android hem tarayıcı, kendiliğinden açılan izin kutularını iyi
 * karşılamıyor.
 * @returns {Promise<string>} BILDIRIM.* değerlerinden biri
 */
export async function izinIste() {
  if (!bildirimDestekleniyorMu()) return BILDIRIM.DESTEKLENMIYOR

  if (telefonda()) {
    try {
      /* Zaten karar verilmişse Android pencereyi ikinci kez açmıyor;
         kullanıcı reddettiyse ayarlardan değiştirmesi gerekiyor. */
      const onceki = await LocalNotifications.checkPermissions()
      if (onceki.display === 'granted') {
        await kanaliKur()
        return BILDIRIM.VERILDI
      }
      if (onceki.display === 'denied') return BILDIRIM.ENGELLI

      const sonuc = await LocalNotifications.requestPermissions()
      if (sonuc.display === 'granted') await kanaliKur()
      return cevir(sonuc.display)
    } catch {
      return BILDIRIM.REDDEDILDI
    }
  }

  /* Tarayıcıda da aynısı: karar zaten varsa pencere açılmıyor. Daha
     önce reddedilmişse bunu ENGELLI olarak söylüyoruz, yoksa ekran
     "kullanıcı şimdi hayır dedi" sanıp sessizce geçiyordu. */
  const simdiki = await mevcutIzin()
  if (simdiki === BILDIRIM.VERILDI) return BILDIRIM.VERILDI
  if (simdiki === BILDIRIM.REDDEDILDI) return BILDIRIM.ENGELLI

  try {
    const sonuc = await Notification.requestPermission()
    return sonuc === 'granted' ? BILDIRIM.VERILDI : BILDIRIM.REDDEDILDI
  } catch {
    return BILDIRIM.REDDEDILDI
  }
}

/**
 * İzin engellendiğinde kullanıcıya ne yapacağını anlatan metin.
 * Ekranlar bunu doğrudan gösteriyor; sözlük anahtarı değil çünkü
 * içeriği çalışılan ortama göre değişiyor.
 * @returns {{tarayici: boolean}} hangi ortamda olduğumuz
 */
export function engelNerede() {
  return { tarayici: !telefonda() }
}

/* Her bildirimin ayrı bir numarası olmalı; aynı numara verilirse
   bildirim öncekinin üstüne yazıyor. Küçük tutuluyor: Android numarayı
   32 bitlik tam sayı olarak istiyor, zaman damgası taşıyor. */
let sonNo = Math.floor(Date.now() / 1000) % 100000

/**
 * Telefonun bildirim perdesine bir bildirim koyar.
 *
 * Uygulama açıkken de çağrılabilir — Android bildirimi yine gösterir.
 *
 * @param {{baslik: string, metin: string, yol?: string}} bildirim
 *        `yol` bildirime dokununca açılacak ekran (örn. '/bildirimler').
 * @returns {Promise<boolean>} gösterilebildi mi
 */
export async function bildirimGoster({ baslik, metin, yol }) {
  if (!baslik) return false

  if (telefonda()) {
    try {
      const izin = await LocalNotifications.checkPermissions()
      if (izin.display !== 'granted') return false
      await kanaliKur()
      await LocalNotifications.schedule({
        notifications: [
          {
            id: (sonNo += 1),
            title: baslik,
            body: metin || '',
            channelId: KANAL,
            /* Küçük simge bilerek verilmiyor: olmayan bir kaynak adı
               yazılırsa Android bildirimi hiç göstermiyor. Ad boş
               kalınca uygulamanın kendi simgesi kullanılıyor. */
            extra: yol ? { yol } : undefined,
          },
        ],
      })
      return true
    } catch {
      return false
    }
  }

  /* Tarayıcı: geliştirme sırasında ekranın doğru çalıştığını görmeye
     yetiyor. */
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false
    new Notification(baslik, { body: metin || '' })
    return true
  } catch {
    return false
  }
}

/**
 * Bildirime dokunulduğunda çağrılacak işi kaydeder.
 * Yalnızca telefonda çalışır; tarayıcıda hiçbir şey yapmaz.
 * @param {(yol: string) => void} isle
 * @returns {Promise<() => void>} dinleyiciyi kaldıran fonksiyon
 */
export async function dokunmayiDinle(isle) {
  if (!telefonda()) return () => {}
  try {
    const kayit = await LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (olay) => {
        const yol = olay?.notification?.extra?.yol
        if (yol) isle(yol)
      },
    )
    return () => kayit.remove()
  } catch {
    return () => {}
  }
}
