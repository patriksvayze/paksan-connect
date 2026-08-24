/* Basit, çizgi tabanlı ikon seti. Dışarıdan kütüphane kullanmıyoruz ki
   uygulama küçük kalsın ve internet olmadan da çalışsın. */

const base = (props) => ({
  width: props.size || 24,
  height: props.size || 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: props.sw || 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
})

export const IconHome = (p) => (
  <svg {...base(p)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.6V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.6" />
  </svg>
)

/* Genel makine simgesi — çekilir tarım makinesi.

   ÖNCEDEN TRAKTÖRDÜ VE YANLIŞTI. Küçük arka tekerlek, büyük ön
   tekerlek, kabin çizgisi: tipik bir traktör silueti. Oysa PAKSAN
   traktör üretmiyor. Ürünlerin tamamı traktörün ARKASINA takılan
   makineler — balya makinesi, yem karma, silaj, çayır biçme,
   rotovatör. Müşteriye kendi makinesini gösterirken üretmediğimiz bir
   makineyi çizmek, kataloğun tamamıyla çelişiyordu.

   Yerine gelen çizim ortak paydayı alıyor: çeki oku, gövde, iki eşit
   tekerlek. Yedi ürün kategorisinin hepsi bu silüete uyuyor; hiçbirine
   ait olmayan bir ayrıntı (kabin, egzoz, ön yükleyici) yok. */
export const IconMachine = (p) => (
  <svg {...base(p)} strokeWidth={p.sw || 1.9}>
    {/* Çeki oku — traktör kancasına doğru eğimli, gerçekte olduğu gibi.
        Düz çizildiğinde silüet el arabasına benziyordu; eğim makineyi
        "çekilen" bir şey yapıyor. */}
    <path d="M2 13.5 6.8 10.5" />
    <circle cx="2.2" cy="13.6" r="1" />
    {/* Gövde — alçak ve geniş, balya makinesi oranlarında */}
    <rect x="6.8" y="6" width="14.6" height="7.4" rx="1.8" />
    {/* Üstteki kapak — balya, yem karma ve silaj makinelerinin
        hepsinde var; silüeti sandıktan ayıran ayrıntı bu. */}
    <path d="M10.5 6V4.6h5.4V6" />
    {/* Tekerlekler ve gövdeye bağlandıkları kısa kollar */}
    <path d="M11 13.4v1.4M17.6 13.4v1.4" />
    <circle cx="11" cy="17.6" r="2.8" />
    <circle cx="17.6" cy="17.6" r="2.8" />
  </svg>
)

/* Balya makinesi — alt menüdeki "Makineler" sekmesi.

   PAKSAN'IN KENDİ ÇİZİMİNDEN GELİYOR. "Makinelerim" listesi boşken
   gösterilen çizimle (src/assets/gorseller/bos-makine.png) aynı
   makine: yüksek gövde, üstte kapak, soldan aşağı inen çeki oku,
   ucunda kanca topu, altta iki eşit tekerlek.

   Çizimdeki her ayrıntı gelmedi. Kapağın üstündeki küçük ağız denendi
   ve çıkarıldı: 24 piksellik kutuda o parça çizgi kalınlığından daha
   kısa kalıyor, üst üste üç kutu gibi görünüp silüeti bulandırıyordu.
   Yer çizgileri ve yandaki rulolar da yok — onlar boş liste çiziminin
   manzarası, makinenin parçası değil.

   AYNI MAKİNENİN İKİ BOYU. Boş liste çizimi ile alt menü simgesi artık
   aynı şeyi gösteriyor; kullanıcı "makine" kavramını bir kere
   öğreniyor. Önceki simge dolu bir siluetti ve o çizimle ilgisi yoktu.

   ÇİZGİ, DOLU DEĞİL. Alt menüdeki diğer dört simge (ana sayfa, ürünler,
   destek, profil) çizgi tabanlı; dolu siluet aralarında ağır duruyordu.
   Kaynak çizim de zaten çizgi. Yalnızca göbekler ve kanca topu dolu —
   24 pikselde içi boş küçük daireler leke gibi görünüyor.

   Renk `currentColor`: sekme seçiliyken beyaza, değilken soluğuna
   kendiliğinden dönüyor. */
export const IconBaler = (p) => (
  <svg {...base(p)} strokeWidth={p.sw || 1.7}>
    {/* Kapak */}
    <rect x="9" y="3.3" width="6" height="1.9" rx="0.7" />
    {/* Gövde */}
    <rect x="5.5" y="5.2" width="14.8" height="9" rx="1.8" />
    {/* Çeki oku — traktör kancasına doğru eğimli iniyor. Düz çizilirse
        silüet el arabasına benziyor; eğim makineyi "çekilen" bir şey
        yapıyor. */}
    <path d="M5.6 10.6 2.8 13.9" />
    <circle cx="2.1" cy="14.6" r="1" fill="currentColor" stroke="none" />
    {/* Tekerlekler ve göbekleri.

        ÖLÇÜLER DENENEREK BULUNDU. Önce tekerlekler daha büyük ve
        birbirine yakındı; 27 pikselde çizgi kalınlığı ikisinin arasını
        kapatıyor, tek bir leke hâline geliyorlardı. Yarıçap küçültülüp
        aralık açıldı — aradaki boşluk artık çizgi kalınlığından geniş. */}
    <circle cx="9.8" cy="16.8" r="2.25" />
    <circle cx="9.8" cy="16.8" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="17" cy="16.8" r="2.25" />
    <circle cx="17" cy="16.8" r="0.7" fill="currentColor" stroke="none" />
  </svg>
)


export const IconBell = (p) => (
  <svg {...base(p)}>
    <path d="M18 9a6 6 0 0 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9Z" />
    <path d="M13.7 20a2 2 0 0 1-3.4 0" />
  </svg>
)

export const IconChat = (p) => (
  <svg {...base(p)}>
    <path d="M20.5 12.3c0 4.1-3.8 7.4-8.5 7.4-1 0-2-.15-2.9-.43L4 21l1.4-3.6C4.2 16.05 3.5 14.26 3.5 12.3c0-4.1 3.8-7.4 8.5-7.4s8.5 3.3 8.5 7.4Z" />
    <path d="M9 11.5h6M9 14.5h3.5" />
  </svg>
)

export const IconGrid = (p) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
  </svg>
)

export const IconUser = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5c1.3-3.6 4.1-5.5 7.5-5.5s6.2 1.9 7.5 5.5" />
  </svg>
)

export const IconPlus = (p) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconMinus = (p) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
)

/* Aşağı ok — açılıp kapanan bölümlerde. Açıkken CSS ile ters
   çevriliyor, ikinci bir simge gerekmiyor. */
export const IconChevronDown = (p) => (
  <svg {...base(p)}>
    <path d="M6 9.5 12 15.5 18 9.5" />
  </svg>
)

export const IconRight = (p) => (
  <svg {...base(p)}>
    <path d="M9 5l7 7-7 7" />
  </svg>
)

export const IconBack = (p) => (
  <svg {...base(p)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)

export const IconPhone = (p) => (
  <svg {...base(p)}>
    <path d="M6.6 3.5h3l1.4 4-2 1.5a12.5 12.5 0 0 0 6 6l1.5-2 4 1.4v3a2 2 0 0 1-2.2 2A16.8 16.8 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" />
  </svg>
)

export const IconBook = (p) => (
  <svg {...base(p)}>
    <path d="M4 5.5A2 2 0 0 1 6 3.5h13v14H6a2 2 0 0 0-2 2Z" />
    <path d="M4 19.5a2 2 0 0 1 2-2h13v3H6a2 2 0 0 1-2-1Z" />
    <path d="M8 8h7M8 11.5h5" />
  </svg>
)

export const IconPlay = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M10.2 8.8 15.5 12l-5.3 3.2Z" fill="currentColor" />
  </svg>
)

export const IconWrench = (p) => (
  <svg {...base(p)}>
    <path d="M15.6 3.6a5 5 0 0 0-5.9 6.4L3.8 15.9a2 2 0 0 0 0 2.8l1.5 1.5a2 2 0 0 0 2.8 0l5.9-5.9a5 5 0 0 0 6.4-5.9l-3 3-2.8-2.8Z" />
  </svg>
)

export const IconCalendar = (p) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
)

export const IconSearch = (p) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
)

export const IconCheck = (p) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)

export const IconCheckCircle = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.3 2.6 2.6L16 9.5" />
  </svg>
)

export const IconAlert = (p) => (
  <svg {...base(p)}>
    <path d="M12 3.8 21 19.5H3L12 3.8Z" />
    <path d="M12 9.5v4.2M12 16.8v.1" />
  </svg>
)

/* Seri numarası — makinenin üzerindeki künye etiketi.

   ÖNCEDEN BARKODDU VE YANILTIYORDU. Köşe ayraçlarının arasındaki
   çizgiler okutma çerçevesi anlatıyor; uygulamada barkod okuma yok ve
   eklenmesi de planlanmıyor. Müşteri numarayı makinenin üzerindeki
   metal etiketten okuyup elle yazıyor. Kamera açılmasını bekleyen
   kullanıcı ekranda yalnız bir yazı kutusu bulunca ne yapacağını
   şaşırıyordu.

   Yeni çizim o metal etiketin kendisi: perçinli plaka ve üzerindeki
   iki satır. Müşterinin makinede arayacağı şeyle aynı. */
/* Seri numarası — makinenin üzerindeki künye etiketi.

   BARKOD DEĞİL. Barkod simgesi "okut" demek; uygulamada barkod okuma
   yok, numara etiketten okunup elle yazılıyor. Yanlış işi vaat eden
   bir simge, kullanıcıyı olmayan bir düğmeyi aramaya gönderiyor.

   İLK ETİKET DENEMESİ EKSİKTİ: perçinler yalnızca üstteydi ve iki
   yazı satırı sola kaçıyordu; etiket bir kenarından asılmış gibi
   duruyor, künyeye benzemiyordu.

   Şimdi dört köşesinden perçinli — asıl künyeyi künye yapan ayrıntı
   bu — ve üç satır var: üstte model, ortada KALIN olan seri numarası,
   altta üretim yılı. Ortadaki satır en uzun ve tam koyu; simgenin
   anlattığı şey o.

   Soluk satırlar 24 piksele inince silikleşip kayboluyor, geriye
   perçinli etiket ve numara satırı kalıyor — küçükte de doğru şeyi
   anlatıyor. */
export const IconBarcode = (p) => (
  <svg {...base(p)}>
    {/* Etiketin kendisi */}
    <rect x="2.6" y="5.2" width="18.8" height="13.6" rx="2.2" />
    {/* Dört köşedeki perçinler */}
    <circle cx="5.3" cy="7.9" r="0.75" />
    <circle cx="18.7" cy="7.9" r="0.75" />
    <circle cx="5.3" cy="16.1" r="0.75" />
    <circle cx="18.7" cy="16.1" r="0.75" />
    {/* Model (soluk) — seri numarası (koyu) — yıl (soluk) */}
    <path d="M8.5 9.7h4.4" opacity="0.55" />
    <path d="M8.5 12.4h7" />
    <path d="M8.5 15.1h4.8" opacity="0.55" />
  </svg>
)

export const IconPin = (p) => (
  <svg {...base(p)}>
    <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
)

export const IconSend = (p) => (
  <svg {...base(p)}>
    <path d="M4.5 12 20 4.5 15.5 20l-3.8-5.6L4.5 12Z" />
  </svg>
)

export const IconCart = (p) => (
  <svg {...base(p)}>
    <path d="M3 4h2.2l2.4 11.2a1.6 1.6 0 0 0 1.6 1.3h7.9a1.6 1.6 0 0 0 1.6-1.2L20.5 8H6.2" />
    <circle cx="10" cy="20" r="1.4" />
    <circle cx="17.5" cy="20" r="1.4" />
  </svg>
)

export const IconTrash = (p) => (
  <svg {...base(p)}>
    <path d="M4 6.5h16M9.5 6.5V4.2A1.2 1.2 0 0 1 10.7 3h2.6a1.2 1.2 0 0 1 1.2 1.2v2.3" />
    <path d="M6.5 6.5 7.4 20a1.5 1.5 0 0 0 1.5 1.4h6.2A1.5 1.5 0 0 0 16.6 20l.9-13.5" />
  </svg>
)

export const IconShield = (p) => (
  <svg {...base(p)}>
    <path d="M12 3 5 6v6c0 4.4 3 7.9 7 9 4-1.1 7-4.6 7-9V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

export const IconInfo = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.8v.1" />
  </svg>
)

export const IconClose = (p) => (
  <svg {...base(p)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
)

/* Yedek parça — altıgen somun.

   Denenip elenenler: dişli (küçükken gemi dümenine benzedi),
   somun+cıvata birlikte (cıvatanın dişleri cetvel gibi okundu).

   Sadeleştirildi: tek bir büyük altıgen somun. Silüeti benzersiz,
   24px'te de 110px'te de aynı şekilde okunuyor. "Servis"in anahtarı
   yanında durunca ikisi birlikte anlam veriyor: anahtar = servis,
   somun = parça. */
export const IconCog = (p) => (
  <svg {...base(p)} strokeWidth={p.sw || 1.9}>
    <path d="M19.4 12 15.7 18.4H8.3L4.6 12l3.7-6.4h7.4L19.4 12Z" />
    <circle cx="12" cy="12" r="3.4" />
  </svg>
)

/* Yedek parçanın simgesi somun; adı da onu söylesin.

   `IconCog` adı "ayar/dişli" çağrıştırdığı için ekranlarda tutmadı:
   yedek parça kimi yerde anahtarla, kimi yerde sepetle çizilmişti.
   Üç ayrı simge aynı işi anlatınca hiçbiri öğrenilmiyor. Anlamı adına
   yazınca karışma ihtimali kalmıyor:

       IconWrench  servis      makineye müdahale
       IconParca   yedek parça değişecek parça
       IconCart    satın alma  yeni makine, teklif

   Çizim `IconCog` ile aynı; ayrı bir simge değil, anlamı belli olan
   adı. */
export const IconParca = IconCog

/* Dil — dünya */
export const IconGlobe = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9.2" />
    <path d="M2.8 12h18.4" />
    <path d="M12 2.8c2.4 2.5 3.7 5.8 3.7 9.2s-1.3 6.7-3.7 9.2c-2.4-2.5-3.7-5.8-3.7-9.2S9.6 5.3 12 2.8Z" />
  </svg>
)

/* E-posta */
export const IconMail = (p) => (
  <svg {...base(p)}>
    <rect x="2.8" y="4.8" width="18.4" height="14.4" rx="2.4" />
    <path d="m3.4 6.6 8.6 6.2 8.6-6.2" />
  </svg>
)

/* Ses kaydı — mikrofon ve durdurma */
export const IconMic = (p) => (
  <svg {...base(p)}>
    <rect x="9" y="2.5" width="6" height="11.5" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
    <path d="M12 18v3.5" />
  </svg>
)

export const IconStop = (p) => (
  <svg {...base(p)}>
    <rect x="6" y="6" width="12" height="12" rx="2.2" />
  </svg>
)

/* Şifre alanındaki göz düğmesi */
export const IconEye = (p) => (
  <svg {...base(p)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3.1" />
  </svg>
)

export const IconEyeOff = (p) => (
  <svg {...base(p)}>
    <path d="M10.6 6.1A8.9 8.9 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.9 3.5" />
    <path d="M6.3 7.7A16 16 0 0 0 2.5 12S6 18 12 18a9.2 9.2 0 0 0 3.6-.7" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="M3.5 3.5 20.5 20.5" />
  </svg>
)

/* Kilit — değiştirilemeyen alanların yanında */
export const IconLock = (p) => (
  <svg {...base(p)}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
  </svg>
)

/* Marka logosu ve amblemi için components/Marka.jsx dosyasına bakın —
   orada sitedeki gerçek PAKSAN dosyaları kullanılıyor. */

/* Talep eklerinde kullanılıyor: fotoğraf makinesi ve video kamera. */

export const IconCamera = (p) => (
  <svg {...base(p)}>
    <path d="M3 8.5a1.5 1.5 0 0 1 1.5-1.5h2.2l1.3-2h6l1.3 2h2.2A1.5 1.5 0 0 1 19 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 17.5z" />
    <circle cx="11" cy="13" r="3.4" />
  </svg>
)

export const IconVideo = (p) => (
  <svg {...base(p)}>
    <rect x="3" y="6.5" width="12.5" height="11" rx="2" />
    <path d="M15.5 11.2 21 8.2v7.6l-5.5-3z" />
  </svg>
)

/* ==========================================================================
   Backoffice menü simgeleri

   Yan menüde on bir başlık vardı ve hepsi düz yazıydı. Personel gün
   içinde ekranlar arasında sürekli gidip geliyor; yazı okumak yerine
   şekli tanımak çok daha hızlı. Düğmenin biçimi zaten ikon için yer
   ayırmıştı (`.yan__bag` içinde `gap: 10px`), yalnız ikon konmamıştı.

   Uygulamadakilerle aynı çizgi kalınlığı ve dili — iki taraf tek bir
   ürün gibi dursun.

   Anlamların çakışmamasına dikkat edildi: Müşteriler kişi, Personel
   kimlik kartı; Geri Bildirimler zarf, Destek Kayıtları konuşma
   balonu. İkisi de "mesaj" ama farklı şeyler.
   ========================================================================== */

/* Dashboard — bir büyük, iki küçük kutu. Panonun kendi yerleşimi.
   IconGrid'den (dört eşit kare) bilerek farklı. */
export const IconPano = (p) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="7.5" height="18" rx="2" />
    <rect x="13.5" y="3" width="7.5" height="7" rx="2" />
    <rect x="13.5" y="14" width="7.5" height="7" rx="2" />
  </svg>
)

/* Talepler — gelen kutusu. Yığılan iş anlamını taşıyor. */
export const IconTalep = (p) => (
  <svg {...base(p)}>
    <path d="M3 13.5h4.2l1.4 2.4h6.8l1.4-2.4H21" />
    <path d="M5.2 13.5 6.9 5.2a1.4 1.4 0 0 1 1.4-1.1h7.4a1.4 1.4 0 0 1 1.4 1.1l1.7 8.3" />
    <path d="M3 13.5v4.9A2.6 2.6 0 0 0 5.6 21h12.8a2.6 2.6 0 0 0 2.6-2.6v-4.9" />
  </svg>
)

/* Raporlar — sütun grafik. */
export const IconRapor = (p) => (
  <svg {...base(p)}>
    <path d="M3.5 20.5h17" />
    <path d="M7 20.5v-5.5M12 20.5v-11M17 20.5v-7.5" />
  </svg>
)

/* Personel — kimlik kartı. Müşteriyi gösteren kişi simgesiyle
   karışmasın diye kart seçildi; personelin kurumla bağı var. */
export const IconPersonel = (p) => (
  <svg {...base(p)}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
    <circle cx="8.5" cy="10.5" r="2.1" />
    <path d="M5.4 15.8c.5-1.7 1.7-2.5 3.1-2.5s2.6.8 3.1 2.5" />
    <path d="M14.5 10h4M14.5 13.5h4" />
  </svg>
)

/* İşlem Kaydı — geriye dönen saat. Geçmişte ne olduğuna bakılan ekran. */
export const IconKayit = (p) => (
  <svg {...base(p)}>
    <path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1" />
    <path d="M3.1 4.2v4.6h4.6" />
    <path d="M12 7.8V12l3 1.8" />
  </svg>
)

/* Görünüm ayarı — yarısı dolu daire. Açık/koyu tema seçiminin yerleşik
   simgesi; ay ya da güneş çizmek "otomatik" seçeneğini anlatamıyor. */
export const IconGorunum = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none" />
  </svg>
)
