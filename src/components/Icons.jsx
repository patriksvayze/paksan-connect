import { IKON_YOLLARI } from '../data/ikonYollari'
/* Adlandırılmış içe aktarma: yalnız kullanılan simgeler derlemeye
   giriyor, kütüphanenin tamamı değil. */
import {
  Phone as LucidePhone,
  Tag as LucideTag,
  Undo2 as LucideUndo,
} from 'lucide-react'

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

/* ==========================================================================
   Lucide köprüsü — eksik kalan simgeler için

   NEDEN TOPLU DEĞİŞTİRMEDİK

   Lucide profesyonel, açık kaynak bir simge kütüphanesi (1500+ simge).
   Buradaki seti onunla değiştirmeyi düşündük ve ÖLÇTÜK: sekiz simge
   96 pikselde çizilip mürekkep kaplama oranları karşılaştırıldı.

     mevcut  %15,4 – %26,8   ortalama %21,4
     lucide  %18,1 – %31,6   ortalama %25,0

   İki sonuç çıktı:

     1. Buradaki set zaten kütüphane kalitesinde. Toplu değişim
        kazanç değil, gereksiz bir değişiklik olurdu — üstelik
        simgelerin PAKSAN için üretilmiş olma bağı da kopardı.
     2. Lucide yaklaşık %17 daha kalın çiziyor. Yan yana durduklarında
        fark görünüyor.

   BU YÜZDEN LUCIDE BOŞLUK DOLDURUCU

   Burada olmayan bir simge gerektiğinde — geri alma oku, filtre,
   dışa aktarma — üretip izlemek yerine Lucide'dan alınıyor. `lucide`
   sarmalayıcısı iki şeyi yapıyor: `size` düzenini buradakiyle aynı
   tutuyor ve çizgi kalınlığını 1,75'e çekiyor.

   1,75 SAYISI ÖLÇÜMDEN: Lucide'ın varsayılanı 2 ve %17 fazla mürekkep
   bırakıyor. 2 / 1,17 ≈ 1,71; en yakın çeyrek adım 1,75.
   ========================================================================== */

export const lucide = (L, ad) => {
  const S = ({ size = 24, className, style }) => (
    <L
      size={size}
      strokeWidth={1.75}
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    />
  )
  S.displayName = 'Lucide(' + ad + ')'
  return S
}

/* ------------------------------------------------------------ Gezinme */

export const IconHome = simge('ev')
export const IconGrid = simge('izgara')
export const IconChat = simge('balon')
export const IconUser = simge('kisi')

/* ------------------------------------------------ Makine: balya makinesi

   Alt menüdeki "Makinelerim", makine kartlarının boş hâli, bildirimler,
   Servisim ve backoffice'in "Kayıtlı Makineler" menüsü aynı çizimi
   kullanıyor. Aynı kavramı iki ayrı resimle göstermek kullanıcıya iki
   şey öğretmeye çalışmak demek; oysa ikisi de "makine" diyor.

   YENİDEN ÇİZİLDİ (22 Eylül 2026, kullanıcı eskisini beğenmedi). Eskisi
   boş liste resminin (assets/gorseller/bos-makine.png) izlenmiş hâliydi:
   geniş bir çizimdi, 24 pikselde komşularının yarısı kadar kalıyordu ve
   çizgileri titrekti; menüde 36 piksele büyütülerek idare ediliyordu.

   Açık kaynaklı ikon setlerinin hiçbirinde balya makinesi yok (Lucide,
   Tabler, Phosphor, Fluent, Material ve Iconify'daki öteki setler tarandı;
   hepsinde traktör var). Atıf isteyen sitelerdeki çizimler de öteki
   simgelerle uyuşmuyordu. Bu yüzden:

     1. Higgsfield'a (gpt_image_2_5) çizgi ikonu üslubunda bir RULO BALYA
        makinesi taslağı çizdirildi: yuvarlak arka kapak, önde eğimli
        gövde, göbekli tekerlek, dişli toplayıcı, çeki oku.
     2. Taslak izlenmedi; ölçüleri okunup 24 birimlik ızgarada düz çizgi
        ve yaylarla YENİDEN KURULDU. İzlenen çizim titrek bir dış hat
        verir; kurulan çizim her boyda temiz kalır.

   Öteki simgelerden farkı: dış hat dolgusu değil ÇİZGİ (stroke). Kalınlık
   1,5 — menüdeki komşularıyla aynı görünen kalınlık; `currentColor`
   geçerli, simge bulunduğu yerin rengini alıyor. Çizim lisanssız, PAKSAN'ın. */
const BALYA_MAKINESI =
  'M6.40 4.58A5.63 5.63 0 0 0 6.22 15.84 M6.40 4.58L14.49 5.54Q15.67 5.70 16.20 6.60L18.16 9.40Q18.60 10.02 18.60 10.96L18.60 13.76Q18.60 14.75 17.60 14.82L13.95 15.10 M6.40 4.58L6.40 13.76 M6.90 16.00a3.24 3.24 0 1 0 6.47 0a3.24 3.24 0 1 0 -6.47 0 M9.01 16.00a1.12 1.12 0 1 0 2.24 0a1.12 1.12 0 1 0 -2.24 0 M14.05 15.87L19.16 15.87 M15.42 16.87L15.92 18.36 M17.91 16.87L18.41 18.36 M18.60 13.38L21.64 14.94L22.89 14.94'

export function IconBaler({ size = 24, className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d={BALYA_MAKINESI} />
    </svg>
  )
}
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

/* TELEFON LUCIDE'DAN.

   Ölçümde setin tek sapan simgesi buydu: 96 pikselde %15,4 mürekkep
   bırakıyordu, benzer karmaşıklıktaki kardeşleri %17–21 aralığında
   (zil %21,3, kişi %17,4). Yani gözle bakınca daha ince, daha soluk
   duruyordu — ve bu simge servis panelinde her iş kartının sağında,
   ekranın en çok basılan düğmesinde duruyor.

   Tek tek üretilen simgelerde beklenen kayma bu. Kütüphanenin çözdüğü
   sorun da tam olarak bu. */
export const IconPhone = lucide(LucidePhone, 'telefon')

/* Geri alma oku. Bu sette hiç yoktu; stok düşüşünü geri alan düğmede
   `IconBack` (sola ok) ödünç kullanılıyordu — "geri git" ile "geri al"
   aynı şey değil. */
export const IconUndo = lucide(LucideUndo, 'geri-al')
/* Fiyat etiketi — servis fiyat listesi ve kampanya. Sette karşılığı yoktu. */
export const IconTag = lucide(LucideTag, 'etiket')
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
