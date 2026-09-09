/* ==========================================================================
   Duyuru kime gidiyor

   NEDEN TEK DOSYA

   Bu süzme iki yerde ayrı ayrı yazılıydı: açılış penceresi
   (src/components/Duyuru.jsx) ve bildirimler listesi
   (src/lib/bildirimler.js). İki kopya şimdiden ayrışmıştı —
   bildirimler.js talep/numara bildirimlerini yurt dışı süzgecinden
   muaf tutuyordu, pencere zaten yalnız duyuru/uyarıya bakıyordu.
   Hedefleme kuralları iki yere ayrı yazılsaydı üçüncü bir ayrışma
   doğardı.

   DİKKAT — `duyurular` ANAHTARI PAYLAŞILIYOR

   Aynı listede personelin yazdığı duyuru/uyarı ile uygulamanın
   ürettiği talep ve numara bildirimleri birlikte duruyor
   (bkz. veri.js `musteriyeBildir`). Hedefleme YALNIZ duyuru ve uyarıya
   uygulanıyor; müşterinin kendi talep bildirimi asla süzülmüyor.

   HEDEF ALANI

     hedef: {
       kime:    'musteri' | 'servis' | 'ikisi',   yoksa 'musteri'
       iller:   ['Konya', 'Karaman'],           boş/yok = tüm iller
       ilceler: ['Ereğli'],                     boş/yok = ilin tamamı
       servisler: ['konya-merkez'],               kime 'servis' iken
       urunler: ['orkinos-1270'],               model VE tip buradan
       seriler: ['ORK1270-2024-00157'],
     }

   YOKLUK = SINIR YOK. Eski duyurularda `hedef` alanı yok; olmaması
   "herkese" demek. Taşıma (migration) yazılmadı, geriye uyum bedava.

   Makine tipi ayrı alan değil: kategori seçimi yayınlama anında ürün
   kimliklerine genişletiliyor, okuma tarafında tek `includes` kalıyor.
   ========================================================================== */

/* BU MODÜL HİÇBİR ŞEY İÇE AKTARMIYOR.

   Yurt dışı kararını çağıran veriyor (`yurtdisi` bayrağı). Sebebi hem
   tasarım hem pratik: burası "bu duyuru bu kişiye uyuyor mu" sorusunu
   cevaplıyor, gerçekleri toplamak çağıranın işi. Pratik tarafı da şu:
   `ihracat.js` zinciri `products.js` üzerinden bir video dosyası içe
   aktarıyor, o da düz Node'da yüklenemiyor. Bağımsız kalınca bu
   mantık tek komutla sınanabiliyor (tools/duyuru-hedef-testi.mjs).

   Yurt dışı kuralının tek tanımı hâlâ `ihracat.js` içindeki
   `yurtdisiTalepMi`; burada tekrarlanmıyor. */

/** Duyuru/uyarı mı, yoksa uygulamanın ürettiği bildirim mi? */
export function personelDuyurusuMu(d) {
  return d?.tur === 'duyuru' || d?.tur === 'uyari'
}

/** Dizi boşsa "sınır yok" demek. */
function kapsiyorMu(dizi, deger) {
  if (!dizi || !dizi.length) return true
  return dizi.includes(deger)
}

/**
 * Bu duyuru bu kişiye gösterilecek mi?
 *
 * @param {object} d duyuru kaydı
 * @param {object} baglam
 * @param {object} baglam.user      müşteri hesabı (servis tarafında null)
 * @param {Array}  baglam.makineler kullanıcının makineleri
 * @param {object} baglam.servis      servis oturumu (müşteri tarafında null)
 * @param {boolean} baglam.yurtdisi kullanıcı Türkiye dışında mı
 *                  (çağıran `yurtdisiTalepMi` ile hesaplıyor)
 */
export function duyuruGecerliMi(
  d,
  { user = null, makineler = [], servis = null, yurtdisi = false } = {},
) {
  /* KİŞİYE ÖZEL BİLDİRİM.

     `musteriId` taşıyan kayıt yalnız o hesaba gidiyor. Servis panelinden
     gönderilen fiyat teklifi böyle: servis kendi müşterisine yazıyor,
     bildirim başkasının ekranında görünmemeli. Alanı taşımayan eski
     kayıtlar (talep durumu, numara değişikliği) tek hesaplı cihazda
     üretildikleri için buradan geçmiyor. */
  if (d?.musteriId && d.musteriId !== user?.id) return false

  /* Talep, numara ve görüş bildirimleri buradan hiç süzülmüyor:
     onlar zaten kişiye özel üretiliyor.

     SERVİS TARAFI HARİÇ. Bu kayıtlar bir MÜŞTERİNİN kendi bildirimi:
     "talebiniz alındı", "numaranız değişti". Servis paneline hiçbir
     koşulda düşmemeleri gerekiyor. Düşüyorlardı da: servis ekranında
     içi boş, yalnız "Anladım" düğmesi olan kutular çıkıyordu — çünkü
     o kayıtlarda `baslik`/`metin` yok, sözlük anahtarı var ve servis
     tarafında sözlük yok. Kutu boş görünüyordu ama asıl sorun
     görünmesiydi: başkasının bildirimi. */
  if (!personelDuyurusuMu(d)) return !servis

  /* GERİ ÇAĞIRMA YALNIZ SERVİSE.

     Yayınlama ekranında alıcı kitlesi zaten kilitli, ama kural iki
     yerde birden duruyor. Ekranı atlayan bir kayıt — elle yazılmış,
     içe aktarılmış ya da ileride sunucudan gelen — çiftçinin
     telefonunda "makinenizi kullanmayın" penceresi açardı. Kararı
     veren PAKSAN'dı: geri çağırmayı servis yürütür, müşteriyi servis
     arar (bkz. data/duyuruTurleri.js). */
  if (d.alt === 'geriCagirma' && !servis) return false

  /* Kampanya duyurusu yalnız izin verene. Ticari elektronik ileti
     kuralı (6563). Güvenlik uyarısı izinden bağımsız. */
  if (d.tur === 'duyuru' && !servis && !user?.onaylar?.kampanya) return false

  /* Yurt dışındaki kullanıcıya Türkçe duyuru gösterilmiyor.
     `dil: 'en'` ileride açılacak ayrı kanal için. */
  if (!servis && yurtdisi && d.dil !== 'en') return false

  const hedef = d.hedef

  /* KİME KAPISI HEDEFTEN ÖNCE.

     Varsayılan alıcı müşteri. Hedefi olmayan duyuru servis paneline
     DÜŞMÜYOR: servise ulaşması için "servislere" ya da "ikisine de"
     seçilmiş olması gerekiyor.

     İki sebebi var. Son kullanıcıya yazılmış bir kampanya metni serviste
     gürültüdür. Ayrıca ticari ileti izni müşteriden alınıyor; servisle
     ilişki başka bir zeminde. */
  const kime = hedef?.kime || 'musteri'
  if (servis) {
    if (kime === 'musteri') return false
    if (!kapsiyorMu(hedef?.servisler, servis.servisId)) return false
    if (!kapsiyorMu(hedef?.iller, servis.il)) return false
    return true
  }
  if (kime === 'servis') return false

  if (!hedef) return true

  if (!kapsiyorMu(hedef.iller, user?.il)) return false
  if (!kapsiyorMu(hedef.ilceler, user?.ilce)) return false

  /* Makine hedefi: kullanıcının makinelerinden EN AZ BİRİ tutmalı. */
  if (hedef.urunler?.length) {
    if (!makineler.some((m) => hedef.urunler.includes(m.productId))) return false
  }
  if (hedef.seriler?.length) {
    const temiz = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    const istenen = hedef.seriler.map(temiz)
    if (!makineler.some((m) => istenen.includes(temiz(m.serial)))) return false
  }

  return true
}
