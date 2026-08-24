import { IKON_YOLLARI } from '../data/ikonYollari'

/* ==========================================================================
   Uygulamanın simgeleri

   NEREDEN GELİYORLAR

   Simgeler Higgsfield ile üretildi. Üretilen çizimler PNG'ydi; PNG
   olarak konulamazlardı çünkü alt menüde seçili sekmede beyaz,
   seçilmemişte soluk, karanlık modda bambaşka bir renk oluyorlar. Hazır
   bir PNG tek renkte donar ve 24 pikselde bulanıklaşır.

   Elle yeniden çizmek de doğru cevap değildi: o zaman ekranda görünen
   şey üretilen çizim değil, ona benzetilmiş başka bir çizim olurdu.

   Üçüncü yol seçildi: üretilen çizimin KENDİSİ izlenip vektöre
   dönüştürüldü (bkz. tools/ikon-svg.py). Ekranda görünen şey birebir
   üretilen çizim, ama vektör olduğu için her boyda net ve istenen renge
   dönüyor.

   NEDEN ÇİZGİ DEĞİL DOLGU

   Yollar çizginin KENDİSİNİ değil, çizginin dış hattını gösteriyor —
   izleme öyle çalışıyor. Bu yüzden `stroke` değil `fill` kullanılıyor.
   Sonuç aynı: `currentColor` yine geçerli, simge bulunduğu yerin rengini
   alıyor. Tek fark, `strokeWidth` gibi bir ayar olmaması; kalınlık
   çizimin kendisinde.

   YOLLARIN DOSYASI ELLE DÜZENLENMEZ

   src/data/ikonYollari.js üretiliyor. Bir simgeyi değiştirmek için
   üretilen sayfa yenilenip izleme betiği yeniden çalıştırılır.

   ADLAR ANLAMA GÖRE

   Buradaki adlar simgenin ŞEKLİNİ değil İŞİNİ söylüyor: yedek parçanın
   simgesi altıgen somun ama adı `IconParca` — ekranda ne anlattığı
   önemli. Aynı çizimi iki iş paylaşıyorsa ikinci ad birincinin
   diğer adı oluyor, çizim tekrar edilmiyor.
   ========================================================================== */

/** Bir yol adından simge bileşeni üretir. */
const simge = (ad) => {
  const S = ({ size = 24, className, style }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d={IKON_YOLLARI[ad]} />
    </svg>
  )
  /* React araçlarında bileşen adı görünsün */
  S.displayName = 'Simge(' + ad + ')'
  return S
}

/* ------------------------------------------------------------ Gezinme */

export const IconHome = simge('ev')
export const IconGrid = simge('izgara')
export const IconChat = simge('balon')
export const IconUser = simge('kisi')

/* Alt menüdeki "Makineler" ve genel makine simgesi aynı çizim.

   Aynı kavramı iki ayrı resimle göstermek kullanıcıya iki şey
   öğretmeye çalışmak demek; oysa ikisi de "makine" diyor. */
export const IconBaler = simge('makine')
export const IconMachine = IconBaler

/* ----------------------------------------------------------- Yön okları */

export const IconRight = simge('ok-sag')
export const IconBack = simge('ok-sol')
export const IconChevronDown = simge('ok-asagi')
export const IconPlus = simge('arti')
export const IconMinus = simge('eksi')
export const IconClose = simge('kapat')

/* --------------------------------------------------------- Durum ve onay */

export const IconCheck = simge('onay')
export const IconCheckCircle = simge('onay-daire')
export const IconAlert = simge('uyari')
export const IconInfo = simge('bilgi')
export const IconShield = simge('kalkan')
export const IconLock = simge('kilit')
export const IconEye = simge('goz')
export const IconEyeOff = simge('goz-kapali')
export const IconTrash = simge('cop')
export const IconSearch = simge('arama')

/* ------------------------------------------------------------- İletişim */

export const IconPhone = simge('telefon')
export const IconMail = simge('zarf')
export const IconSend = simge('ucak')
export const IconMic = simge('mikrofon')
export const IconStop = simge('stop')
export const IconCamera = simge('fotograf')
export const IconVideo = simge('video')
export const IconPlay = simge('oynat')
export const IconBell = simge('zil')
export const IconGlobe = simge('dunya')

/* --------------------------------------------------------- İş simgeleri */

export const IconWrench = simge('anahtar')
export const IconCart = simge('sepet')
export const IconPin = simge('pin')
export const IconBook = simge('kitap')
export const IconCalendar = simge('takvim')

/* Seri numarası — makinenin üzerindeki künye etiketi.

   Barkod DEĞİL. Barkod simgesi "okut" demek; uygulamada barkod okuma
   yok, numara etiketten okunup elle yazılıyor. Adı `IconBarcode` kaldı
   çünkü ekranlarda o adla çağrılıyor; çizim künye. */
export const IconBarcode = simge('kunye')

/* Yedek parça — altıgen somun.

   Dişli DEĞİL. Dişli "ayar" çağrıştırıyor; yedek parça anlatan simge
   somun olmalı. Uygulamada üç ayrı yerde parça anlatılıyordu (anahtar,
   sepet, dişli); üçü aynı işi anlatınca hiçbiri öğrenilmiyordu. */
export const IconParca = simge('somun')
export const IconCog = IconParca

/* --------------------------------------------------------- Backoffice */

export const IconPano = simge('pano')
export const IconTalep = simge('talep')
export const IconRapor = simge('rapor')
export const IconPersonel = simge('kimlik')
export const IconKayit = simge('saat-gecmis')
export const IconGorunum = simge('gorunum')
