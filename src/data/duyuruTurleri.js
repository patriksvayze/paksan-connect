/* ==========================================================================
   Duyuru alt türleri

   ÜST TÜR HUKUKİ, ALT TÜR GÖRSEL

   `tur` alanı iki değer taşıyor ve aradaki fark hukuki:

     duyuru → ticari elektronik ileti (6563). Müşteri tarafında YALNIZCA
              izin verenlere gidiyor.
     uyari  → hizmete ilişkin bildirim. İzin aranmaz, herkese gider.

   Bu ayrım değişmedi ve değişmemeli; süzgeçler, izin kontrolü ve eski
   kayıtlar hep ona bakıyor (bkz. lib/duyuruHedef.js).

   Alt tür (`alt`) bunun ÜSTÜNE eklendi: aynı hukuki sınıfın içinde
   kampanya ile yeni ürün duyurusu, okuyan için aynı şey değil. Alt tür
   ekranda hangi temanın kullanılacağını, hangi ikonun görüneceğini ve
   duyurunun kime gideceğini belirliyor.

   ESKİ KAYITLARDA `alt` YOK. `altBilgi()` üst türe göre bir varsayılan
   döndürüyor; taşıma yazılmadı, geriye uyum bedava.

   ÜÇ ÜRÜN AYNI TABLODAN OKUYOR

   Backoffice yayınlıyor, müşteri uygulaması ve servis paneli okuyor.
   Türkçe adlar burada; müşteri uygulaması iki dilli olduğu için orada
   `anahtar` ile sözlükten geçiyor (bkz. i18n/tr.js → duyuruTuru).

   `ton` üç üründe de CSS sınıfı olarak kullanılıyor. Renkleri her ürün
   kendi kökünde tanımlıyor — token'lar paylaşılmıyor (bkz. CLAUDE.md).
   ========================================================================== */

export const DUYURU_ALT = [
  {
    id: 'kampanya',
    ust: 'duyuru',
    ad: 'Kampanya',
    alt: 'İndirim, sezon fırsatı, ödeme kolaylığı',
    anahtar: 'duyuruTuru.kampanya',
    ton: 'kampanya',
    ikon: 'etiket',
    /* Kampanya metni son kullanıcıya yazılıyor; serviste gürültü olur. */
    varsayilanKime: 'musteri',
    ipucu: 'Örnek: Sezon öncesi yedek parça kampanyası',
  },
  {
    id: 'yeniUrun',
    ust: 'duyuru',
    ad: 'Yeni Ürün',
    alt: 'Yeni model, yeni donanım, ürün güncellemesi',
    anahtar: 'duyuruTuru.yeniUrun',
    ton: 'yeniUrun',
    ikon: 'makine',
    /* Yeni model hem müşteriyi hem satacak bayiyi ilgilendiriyor. */
    varsayilanKime: 'ikisi',
    ipucu: 'Örnek: Orkinos 1290 satışa çıktı',
  },
  {
    id: 'etkinlik',
    ust: 'duyuru',
    ad: 'Etkinlik',
    alt: 'Fuar, tarla günü, servis toplantısı, eğitim',
    anahtar: 'duyuruTuru.etkinlik',
    ton: 'etkinlik',
    ikon: 'takvim',
    varsayilanKime: 'ikisi',
    ipucu: 'Örnek: Konya Tarım Fuarı’nda standımızdayız',
  },
  {
    id: 'guvenlik',
    ust: 'uyari',
    ad: 'Güvenlik Uyarısı',
    alt: 'Kullanım tehlikesi, kontrol edilmesi gereken parça',
    anahtar: 'duyuruTuru.guvenlik',
    ton: 'guvenlik',
    ikon: 'uyari',
    /* Makineyi elinde tutan müşteri, servisi veren servis: ikisi de. */
    varsayilanKime: 'ikisi',
    ipucu: 'Örnek: Çalıştırmadan önce kuyruk mili koruma kapağını kontrol edin',
  },
  {
    id: 'geriCagirma',
    ust: 'uyari',
    ad: 'Geri Çağırma',
    alt: 'Belirli seri numaralı makinelerin servise çağrılması',
    anahtar: 'duyuruTuru.geriCagirma',
    ton: 'geriCagirma',
    ikon: 'geri',
    /* GERİ ÇAĞIRMA YALNIZCA SERVİSE GİDİYOR.

       Kararı PAKSAN verdi. Dayanağı ekosistemin kendisi: makineyi
       satan, servisini veren ve müşteriyi arayacak olan servis. Geri
       çağırma bir kampanya duyurusu değil, yürütülecek bir iş —
       çiftçiye "makinenizi kullanmayın" yazısı düşmesi değil, servisin
       o çiftçiyi araması gerekiyor.

       Ekranda seçim de kapalı: alıcı kitlesi kilitli
       (bkz. kilitliKime) ve okuma tarafında ikinci bir kapı var
       (bkz. lib/duyuruHedef.js). Tek yerde kalsaydı, kural ekranı
       atlayan bir kayıtta işlemezdi. */
    varsayilanKime: 'servis',
    kilitliKime: 'servis',
    ipucu: 'Örnek: ORK1270-2024 serisi düğüm atıcı kontrolü',
    /* YENİ YAYINLANMIYOR (23 Eylül 2026, kullanıcının isteği: "Geri
       Çağırma önemli uyarısını kaldır"). Backoffice formunda seçenek
       yok; tür burada eski kayıtlar doğru adla ve renkle görünsün,
       okuma tarafının "yalnız servise" kapısı da onlar için çalışmaya
       devam etsin diye duruyor (lib/duyuruHedef.js). Belirli seri
       numaralı makineler için yapılacak duyuru artık Güvenlik Uyarısı
       ile ve Hedefleme'deki seri numarası alanıyla gönderiliyor. */
    yayinlanmaz: true,
  },
]

/* Üst tür başlıkları. Backoffice formunda artık öbek başlığı olarak
   görünmüyor — türler tek "Bildirim Tipi" başlığı altında (23 Eylül
   2026, kullanıcının isteği) — ama hukuki sınıfın açıklaması (`kime`)
   seçilen türün altında yazmaya devam ediyor. */
export const DUYURU_UST = [
  {
    id: 'duyuru',
    ad: 'Duyuru',
    kime: 'Müşteri tarafında yalnızca ticari ileti izni verenlere gider.',
  },
  {
    id: 'uyari',
    ad: 'Önemli Uyarı',
    kime: 'Hizmete ilişkin bildirim; izin aranmaz.',
  },
]

const ALT_KIMLIK = Object.fromEntries(DUYURU_ALT.map((x) => [x.id, x]))

/* Eski kayıtlarda `alt` yok; üst türün ilk alt türü varsayılıyor.
   Kampanya ve güvenlik uyarısı en sık kullanılanlar, sıralama ona
   göre. */
const VARSAYILAN = { duyuru: 'kampanya', uyari: 'guvenlik' }

/** Kaydın alt tür bilgisi. `alt` yoksa üst türden türetiliyor. */
export function altBilgi(kayit) {
  const id = kayit?.alt || VARSAYILAN[kayit?.tur] || 'kampanya'
  return ALT_KIMLIK[id] || ALT_KIMLIK.kampanya
}

/** Bir üst türün alt türleri. */
export function altTurler(ust) {
  return DUYURU_ALT.filter((x) => x.ust === ust)
}

/** Backoffice'te yeni duyuru için seçilebilen türler (yayından kalkanlar hariç). */
export function yayinlanabilirTurler() {
  return DUYURU_ALT.filter((x) => !x.yayinlanmaz)
}
