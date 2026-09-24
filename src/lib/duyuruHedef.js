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
       servisler: ['konya-merkez'],             bkz. aşağıda
       urunler: ['orkinos-1270'],               model VE tip buradan
       seriler: ['ORK1270-2024-00157'],
     }

   BÖLGE, MAKİNE VE SERVİS İKİ TARAFA DA UYGULANIYOR (23 Eylül 2026,
   kullanıcının isteği: "Bildirimler bölgeye, makineye ve servise
   spesifik gönderilebilsin"). Önce servis süzgeci yalnız servise giden
   duyuruda, makine süzgeci yalnız müşteride işliyordu.

     Müşteri  il: hesabın ili. Makine ve servis süzgeci MAKİNE BAŞINA:
              müşterinin makinelerinden en az biri seçilen modelde /
              seride VE seçilen servislerin baktığı makine olmalı
              ("Konya servisinin baktığı Orkinos'ların sahipleri").
              Makinenin servisini çağıran ekliyor (`m.servisId`,
              lib/servisAtama.js → makinelereServisEkle).
     Servis   il: servisin ili VEYA hizmet verdiği illerden biri
              (`servis.iller`). Makine süzgeci: servisin baktığı
              makinelerden en az biri tutmalı (`makineler`, çağıran
              veriyor: servisAtama.js → servisDuyuruBaglami).

   Aynı alanda birden çok seçim "herhangi biri", farklı alanlar "hepsi".

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

const dolu = (dizi) => Boolean(dizi && dizi.length)

/* Seri numarası biçimden bağımsız karşılaştırılıyor: tire, boşluk ve
   küçük harf farkı eşleşmeyi bozmasın. */
const seriTemiz = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

/* Bir makine hedefin makine ve servis süzgeçlerine uyuyor mu? Aynı
   makinede birlikte aranıyor: "Orkinos sahibi" ile "Konya servisinin
   müşterisi" iki ayrı makineden sağlanırsa "Konya servisinin baktığı
   Orkinos" sağlanmış olmaz. `servisSuz` false ise servis süzgeci
   atlanıyor (servis tarafı: servisin kendisi zaten seçili). */
function makineTutuyorMu(m, hedef, servisSuz = true) {
  if (dolu(hedef.urunler) && !hedef.urunler.includes(m?.productId)) return false
  if (dolu(hedef.seriler) && !hedef.seriler.map(seriTemiz).includes(seriTemiz(m?.serial))) return false
  if (servisSuz && dolu(hedef.servisler) && !hedef.servisler.includes(m?.servisId)) return false
  return true
}

/**
 * Bu duyuru bu kişiye gösterilecek mi?
 *
 * @param {object} d duyuru kaydı
 * @param {object} baglam
 * @param {object} baglam.user      müşteri hesabı (servis tarafında null)
 * @param {Array}  baglam.makineler müşteride kullanıcının makineleri (her
 *                  birinde `servisId`: makineye bakan servis); serviste
 *                  servisin baktığı makineler
 * @param {object} baglam.servis      servis oturumu (müşteri tarafında null);
 *                  `iller` varsa servisin hizmet verdiği iller
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
     üretildikleri için buradan geçmiyor.

     `kisisel` DAMGALI AMA KİMLİKSİZ KAYIT KİMSEYE GÖSTERİLMİYOR.
     Damgayı `veri.js → musteriyeBildir` her kişisel bildirime vuruyor;
     `musteriId` ise alıcı telefondan eşleşmediğinde boş kalıyor.
     Damga varken kimlik yoksa bu bir kişinin bildirimidir ama kimin
     olduğu bilinmiyor: alansız diye HERKESE AÇIK sayılırsa yabancının
     talep numarası, kargo notu ve randevusu her ekranda çıkar. */
  if (d?.kisisel && !d?.musteriId) return false
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

  /* SÜRESİ DOLMUŞ DUYURU GÖSTERİLMİYOR.

     Duyuruların bitiş tarihi yoktu ve hiçbiri kendiliğinden düşmüyordu:
     geçen yılın fuar duyurusu, biten kampanya, tarihi geçmiş bakım
     çağrısı ekranda kalıyordu. Personelin elle silmesi bekleniyordu ve
     kimsenin görevi değildi.

     `bitis` YOKSA SÜRESİZ. Geri çağırma ve güvenlik uyarısı gibi
     süresi olmayan kayıtlar tarih almadan yayınlanıyor; eski
     kayıtlarda da alan yok ve geriye uyum bedava (bkz. veri.js →
     duyuruYayinla). */
  if (d.bitis && Date.now() > d.bitis) return false

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
    /* Bölge: servisin kendi ili ya da hizmet verdiği illerden biri.
       Ankara'daki bir servis Konya'ya da bakıyorsa Konya duyurusu ona
       da gidiyor. */
    if (dolu(hedef?.iller)) {
      const iller = [servis.il, ...(servis.iller || [])].filter(Boolean)
      if (!iller.some((il) => hedef.iller.includes(il))) return false
    }
    /* Makine: servisin baktığı makinelerden en az biri tutmalı. */
    if (dolu(hedef?.urunler) || dolu(hedef?.seriler)) {
      if (!makineler.some((m) => makineTutuyorMu(m, hedef, false))) return false
    }
    return true
  }
  if (kime === 'servis') return false

  if (!hedef) return true

  if (!kapsiyorMu(hedef.iller, user?.il)) return false
  if (!kapsiyorMu(hedef.ilceler, user?.ilce)) return false

  /* Makine ve servis hedefi: kullanıcının makinelerinden EN AZ BİRİ
     hepsini birden tutmalı (bkz. makineTutuyorMu). */
  if (dolu(hedef.urunler) || dolu(hedef.seriler) || dolu(hedef.servisler)) {
    if (!makineler.some((m) => makineTutuyorMu(m, hedef))) return false
  }

  return true
}
