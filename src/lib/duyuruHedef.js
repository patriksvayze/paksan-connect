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
       kime:    'musteri' | 'bayi' | 'ikisi',   yoksa 'musteri'
       iller:   ['Konya', 'Karaman'],           boş/yok = tüm iller
       ilceler: ['Ereğli'],                     boş/yok = ilin tamamı
       bayiler: ['konya-merkez'],               kime 'bayi' iken
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
 * @param {object} baglam.user      müşteri hesabı (bayi tarafında null)
 * @param {Array}  baglam.makineler kullanıcının makineleri
 * @param {object} baglam.bayi      bayi oturumu (müşteri tarafında null)
 * @param {boolean} baglam.yurtdisi kullanıcı Türkiye dışında mı
 *                  (çağıran `yurtdisiTalepMi` ile hesaplıyor)
 */
export function duyuruGecerliMi(
  d,
  { user = null, makineler = [], bayi = null, yurtdisi = false } = {},
) {
  /* KİŞİYE ÖZEL BİLDİRİM.

     `musteriId` taşıyan kayıt yalnız o hesaba gidiyor. Bayi panelinden
     gönderilen fiyat teklifi böyle: bayi kendi müşterisine yazıyor,
     bildirim başkasının ekranında görünmemeli. Alanı taşımayan eski
     kayıtlar (talep durumu, numara değişikliği) tek hesaplı cihazda
     üretildikleri için buradan geçmiyor. */
  if (d?.musteriId && d.musteriId !== user?.id) return false

  /* Talep, numara ve görüş bildirimleri buradan hiç süzülmüyor:
     onlar zaten kişiye özel üretiliyor.

     BAYİ TARAFI HARİÇ. Bu kayıtlar bir MÜŞTERİNİN kendi bildirimi:
     "talebiniz alındı", "numaranız değişti". Bayi paneline hiçbir
     koşulda düşmemeleri gerekiyor. Düşüyorlardı da: bayi ekranında
     içi boş, yalnız "Anladım" düğmesi olan kutular çıkıyordu — çünkü
     o kayıtlarda `baslik`/`metin` yok, sözlük anahtarı var ve bayi
     tarafında sözlük yok. Kutu boş görünüyordu ama asıl sorun
     görünmesiydi: başkasının bildirimi. */
  if (!personelDuyurusuMu(d)) return !bayi

  /* GERİ ÇAĞIRMA YALNIZ BAYİYE.

     Yayınlama ekranında alıcı kitlesi zaten kilitli, ama kural iki
     yerde birden duruyor. Ekranı atlayan bir kayıt — elle yazılmış,
     içe aktarılmış ya da ileride sunucudan gelen — çiftçinin
     telefonunda "makinenizi kullanmayın" penceresi açardı. Kararı
     veren PAKSAN'dı: geri çağırmayı bayi yürütür, müşteriyi bayi
     arar (bkz. data/duyuruTurleri.js). */
  if (d.alt === 'geriCagirma' && !bayi) return false

  /* Kampanya duyurusu yalnız izin verene. Ticari elektronik ileti
     kuralı (6563). Güvenlik uyarısı izinden bağımsız. */
  if (d.tur === 'duyuru' && !bayi && !user?.onaylar?.kampanya) return false

  /* Yurt dışındaki kullanıcıya Türkçe duyuru gösterilmiyor.
     `dil: 'en'` ileride açılacak ayrı kanal için. */
  if (!bayi && yurtdisi && d.dil !== 'en') return false

  const hedef = d.hedef

  /* KİME KAPISI HEDEFTEN ÖNCE.

     Varsayılan alıcı müşteri. Hedefi olmayan duyuru bayi paneline
     DÜŞMÜYOR: bayiye ulaşması için "bayilere" ya da "ikisine de"
     seçilmiş olması gerekiyor.

     İki sebebi var. Son kullanıcıya yazılmış bir kampanya metni bayide
     gürültüdür. Ayrıca ticari ileti izni müşteriden alınıyor; bayiyle
     ilişki başka bir zeminde. */
  const kime = hedef?.kime || 'musteri'
  if (bayi) {
    if (kime === 'musteri') return false
    if (!kapsiyorMu(hedef?.bayiler, bayi.bayiId)) return false
    if (!kapsiyorMu(hedef?.iller, bayi.il)) return false
    return true
  }
  if (kime === 'bayi') return false

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
