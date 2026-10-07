/* ==========================================================================
   KVKK Aydınlatma Metni, Açık Rıza Metni, Kampanya Bildirimleri ve
   Uygulama İzinleri — PAKSAN Connect

   ⚠ ÖNEMLİ — BU METİNLER TASLAKTIR.
   Uygulamanın işleyişine göre yazıldı: hangi veriyi topladığımız, ne için
   kullandığımız ve kime aktardığımız buradaki maddelerle birebir uyuşuyor.
   Ancak yayına çıkmadan önce firmanın hukuk danışmanı okuyup onaylamalı
   (sorulacaklar CANLIYA-CIKIS.md → "KVKK: hukuk danışmanına
   sorulacaklar").

   Unvan ve adresler src/data/kimlik.js → SIRKET'ten.
   MERSİS numarası, KEP adresi ve VERBİS kaydı oraya eklenmeli.

   SÜRÜM 1.1 (29 Eylül 2026). 1.0'daki yanlışlar düzeltildi: "size en
   yakın bayi ve servis" (atama coğrafyaya değil makineye göre), kaldırılan
   "Konumumu kullan" özelliği, "uygulama kendiliğinden hiçbir bilgi
   toplamaz" cümlesi (giriş zamanı, sürüm ve bildirim kimliği toplanıyor).
   Eksikler eklendi: fotoğraf, video, ses kaydı, servis kayıtları, kargo
   firması, hizmet sağlayıcılar, servisin telefon ya da seriyle hesabı
   bulabilmesi, amaç başına hukuki sebep, geçerli başvuru yolları, Kurul'a
   şikâyet hakkı, 18 yaş. Açık rıza kayıtta ZORUNLU kaldı (kullanıcının
   kararı: "şimdilik olduğu gibi kalsın"; hukuk danışmanına sorulacak).
   Kampanya metnindeki "tek dokunuşla" düzeltildi. Uygulama İzinleri
   yeni; onay istenmiyor, yalnız bilgi (METINLER listesinde değil).

   Metin değişirse KVKK_SURUM artırılır: onaylar sürümle saklanıyor,
   eski sürümü onaylamış hesaba yeni metin açılışta yeniden onaylatılıyor
   (lib/rizaKaydi.js, components/KvkkGuncelleme.jsx). Veritabanı tohumu
   (T07) bu dosyayı okuyor; sürüm artmadan içerik değişirse durur.

   METİNLER CODEX'TEN GEÇTİ (proje kuralı); İngilizcesi kvkk.en.js.
   ========================================================================== */

import { SIRKET } from './kimlik.js'
import { KVKK_EN, ASIL_METIN_NOTU } from './kvkk.en'

export const KVKK_SURUM = '1.1'
export const KVKK_TARIH = '29 Eylül 2026'

export const AYDINLATMA = {
  id: 'aydinlatma',
  baslik: 'KVKK Aydınlatma Metni',
  kisaAd: 'Aydınlatma Metni',
  onayCumlesi:
    'Aydınlatma Metni’ni okudum ve anladım.',
  bolumler: [
    {
      baslik: 'Veri sorumlusu kim?',
      paragraflar: [
        `Kişisel verileriniz, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca veri sorumlusu ${SIRKET.unvan} tarafından bu metinde açıklandığı şekilde işlenir.`,
        `Adres: ${SIRKET.adres}`,
        `Adres: ${SIRKET.adres2}`,
        `Telefon: ${SIRKET.telefon} · ${SIRKET.telefon2} · Faks: ${SIRKET.faks}`,
        `E-posta: ${SIRKET.eposta}`,
      ],
    },
    {
      baslik: 'Hangi verileriniz işleniyor?',
      maddeler: [
        'Kimlik ve iletişim: adınız, soyadınız ve cep telefonu numaranız',
        'Konum: iliniz ve ilçeniz, servis talebinde belirttiğiniz makinenin bulunduğu adres, yedek parçanın gönderileceği adres',
        'Makine: kaydettiğiniz makinenin seri numarası, modeli, üretim yılı, garanti durumu ve işaretlediğiniz bakımlar',
        'Talepler: servis, yedek parça ve fiyat teklifi taleplerinizde yazdıklarınız; eklediğiniz fotoğraf, video ve ses kayıtları; sonradan eklediğiniz bilgiler; randevular',
        'Servis kayıtları: yetkili servisin makinenizde yaptığı işlemler, değiştirdiği parçalar ve ziyaret bilgileri',
        'Fatura ve ödeme: adına fatura düzenlenecek kişi ya da firmanın adı, T.C. kimlik numarası ya da vergi numarası, fatura ve teslimat adresi, yüklediğiniz ödeme dekontu',
        'Destek kullanımı: Destek ekranında seçtiğiniz makine, bölüm ve belirti ile işaretlediğiniz kontroller',
        'Görüş ve talepler: uygulama hakkında gönderdiğiniz görüşler ve telefon numarası değişikliği başvurunuz',
        'İşlem güvenliği: şifrenizin geri döndürülemeyen özeti, giriş zamanları ve uygulama sürümü',
        'Bildirim: bildirimlere izin verdiyseniz cihazınızın bildirim kimliği ve izin durumu',
        'Tercihler: kampanya bildirimi izniniz, dil ve görünüm seçiminiz',
      ],
    },
    {
      baslik: 'Hangi amaçla ve hangi hukuki sebeple işleniyor?',
      paragraflar: [
        'Her amacın yanında KVKK’nın 5. maddesinde yer alan ilgili hukuki sebep belirtilmiştir:',
      ],
      maddeler: [
        'Hesabınızı açmak, giriş yapmanızı sağlamak ve hesap güvenliğinizi korumak — sözleşmenin kurulması ve ifası (md. 5/2-c), meşru menfaat (md. 5/2-f)',
        'Makinenizi kaydetmek ve garanti durumunu takip etmek — sözleşmenin ifası (md. 5/2-c), hukuki yükümlülük (md. 5/2-ç)',
        'Servis talebinizi makinenizle ilgilenen yetkili servise iletmek, randevu ve servis kaydı işlemlerini yürütmek — sözleşmenin ifası (md. 5/2-c)',
        'Yedek parça siparişinizin faturasını düzenlemek, ödemenizi doğrulamak ve parçayı göndermek — sözleşmenin ifası (md. 5/2-c), hukuki yükümlülük (md. 5/2-ç)',
        'Fiyat teklifi talebinizi yanıtlamak — sözleşmenin kurulması (md. 5/2-c)',
        'Talebinizin durumu değiştiğinde size bildirim göndermek — sözleşmenin ifası (md. 5/2-c)',
        'Makinenizle ilgili güvenlik uyarılarını iletmek — hukuki yükümlülük (md. 5/2-ç), meşru menfaat (md. 5/2-f)',
        'Destek ekranı kayıtlarından yararlanarak ürün ve hizmet kalitesini geliştirmek — meşru menfaat (md. 5/2-f)',
        'Olası uyuşmazlıklarda haklarımızı korumak ve resmî makamların taleplerini karşılamak — bir hakkın tesisi, kullanılması veya korunması (md. 5/2-e), hukuki yükümlülük (md. 5/2-ç)',
        'Açık Rıza Metni’nde belirtilen işlemleri yapmak — açık rızanız (md. 5/1)',
        'İzin verirseniz kampanya ve duyuruları iletmek — açık rızanız ve ticari elektronik ileti onayınız',
      ],
    },
    {
      baslik: 'Kimlere aktarılıyor?',
      paragraflar: [
        'Verileriniz, yalnızca ilgili amacın gerektirdiği ölçüde şu alıcılara aktarılır:',
      ],
      maddeler: [
        `Yetkili servis: adınız, telefon numaranız, makinenin bulunduğu adres, makine bilgileri, talebinizin içeriği ve ekleri, makinenize atanmış ya da talebinizi yürüten PAKSAN yetkili servisine aktarılır.`,
        'Yetkili servisin sizin için kayıt açması: yetkili bir servis, sizin için kayıt açarken telefon numaranız ya da makinenizin seri numarasıyla hesabınızı bulabilir. Bu durumda adınız, iliniz ve kayıtlı makineleriniz o servis tarafından görülebilir.',
        'Yetkili bayi: fiyat teklifi talebiniz olduğunda adınız, telefon numaranız, iliniz ve talebinizin içeriği, talebi karşılayacak yetkili bayiye aktarılır.',
        'Kargo şirketleri: yedek parça gönderimi için alıcının adı, teslimat adresi ve telefon numarası aktarılır.',
        `Hizmet sağlayıcılar: uygulamanın barındırıldığı sunucu ve bildirim altyapısı gibi hizmetleri sunan, PAKSAN’ın adına ve talimatıyla çalışan firmalara aktarılır.`,
        'Mali müşavir, denetçi ve hukuk danışmanları: mevzuatın gerektirdiği ölçüde aktarılır.',
        'Yetkili kamu kurum ve kuruluşları: mevzuatın gerektirdiği hâllerde aktarılır.',
      ],
    },
    {
      baslik: 'Yurt dışına aktarılıyor mu?',
      paragraflar: [
        'Kişisel verileriniz şu anda yurt dışına aktarılmamaktadır. Bu durum, örneğin bildirim altyapısı nedeniyle değişirse bu metin güncellenir ve KVKK’nın 9. maddesindeki şartlara uyulur.',
      ],
    },
    {
      baslik: 'Nasıl toplanıyor?',
      paragraflar: [
        'Verileriniz elektronik ortamda şu yollarla toplanır:',
      ],
      maddeler: [
        'Uygulamaya yazdığınız bilgiler ve yüklediğiniz fotoğraf, video, ses kaydı ve dekontlar',
        'Yetkili servisin sizin için açtığı kayıtlar ve makinenizde yaptığı işlemlere ilişkin kayıtlar',
        `Telefonla PAKSAN’a ilettiğiniz bilgiler`,
        'Uygulamanın otomatik olarak oluşturduğu kayıtlar: giriş zamanları, uygulama sürümü ve bildirim izni verdiyseniz cihazınızın bildirim kimliği',
        'Uygulama telefonunuzun konumunu kullanmaz; konum bilginiz yalnızca sizin yazdığınız il, ilçe ve adresten oluşur.',
      ],
    },
    {
      baslik: 'Ne kadar süre saklanıyor?',
      paragraflar: [
        'Verileriniz, hesabınız açık kaldığı sürece saklanır. Hesabınız kapandıktan sonra garanti, tüketici, vergi ve ticaret mevzuatının öngördüğü süreler ile olası uyuşmazlıklara ilişkin zamanaşımı süreleri boyunca saklanır. Bu sürelerin sonunda silinir, yok edilir ya da anonim hâle getirilir.',
      ],
    },
    {
      baslik: 'Haklarınız neler?',
      paragraflar: [
        'KVKK’nın 11. maddesi uyarınca şu haklara sahipsiniz:',
      ],
      maddeler: [
        'Kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme',
        'Kişisel verilerinizin işlenme amacını ve bu amaca uygun kullanılıp kullanılmadığını öğrenme',
        'Kişisel verilerinizin yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme',
        'Kişisel verileriniz eksik veya yanlış işlenmişse düzeltilmesini isteme',
        'Şartları oluştuğunda kişisel verilerinizin silinmesini veya yok edilmesini isteme',
        'Düzeltme ve silme işlemlerinin, kişisel verilerinizin aktarıldığı üçüncü kişilere bildirilmesini isteme',
        'Kişisel verilerinizin yalnızca otomatik sistemlerle analiz edilmesi sonucunda aleyhinize bir sonuç ortaya çıkmasına itiraz etme',
        'Kişisel verilerinizin kanuna aykırı işlenmesi nedeniyle zarara uğrarsanız zararın giderilmesini talep etme',
      ],
    },
    {
      baslik: 'Nasıl başvurursunuz?',
      paragraflar: [
        `Başvurunuzu yukarıdaki adresimize ıslak imzalı dilekçeyle iletebilirsiniz. Ayrıca kayıtlı elektronik posta (KEP), güvenli elektronik imza veya mobil imza kullanarak ya da daha önce bize bildirdiğiniz ve sistemimizde kayıtlı olan e-posta adresinizden ${SIRKET.eposta} adresine yazarak başvurabilirsiniz.`,
        'Başvurunuzda adınız ve soyadınız, T.C. kimlik numaranız (yabancıysanız uyruğunuz ve pasaport numaranız), tebligat adresiniz, varsa e-posta adresiniz ve telefon numaranız ile talebinizin konusu yer almalıdır.',
        'Başvurunuz en geç 30 gün içinde ücretsiz olarak sonuçlandırılır. Yanıtı yeterli bulmazsanız Kişisel Verileri Koruma Kurulu’na şikâyette bulunabilirsiniz.',
        `Hesabınızın kapatılmasını ve verilerinizin silinmesini de aynı yollarla isteyebilirsiniz. Bu işlemleri PAKSAN yapar. Yasal saklama süresine tabi kayıtlar (örneğin faturalar) bu sürenin sonuna kadar saklanır; diğer kayıtlar silinir ya da anonim hâle getirilir.`,
        'Uygulama, 18 yaşından büyük kullanıcılar içindir.',
      ],
    },
  ],
}

export const ACIK_RIZA = {
  id: 'acikRiza',
  baslik: 'Açık Rıza Metni',
  kisaAd: 'Açık Rıza Metni',
  onayCumlesi:
    'Açık Rıza Metni’ni okudum; kişisel verilerimin bu metinde belirtilen şekilde işlenmesine ve yetkili servis ile bayiye aktarılmasına açık rıza veriyorum.',
  bolumler: [
    {
      baslik: 'Neye rıza veriyorsunuz?',
      paragraflar: [
        `Aydınlatma Metni’ni ayrıca okudum. Adımın ve soyadımın, cep telefonu numaramın, il ve ilçe bilgilerimin, kaydettiğim makineye ait bilgilerin ve oluşturduğum taleplerin içeriğinin ${SIRKET.unvan} tarafından satış sonrası destek, servis, yedek parça ve garanti süreçlerinin yürütülmesi amacıyla işlenmesine açık rıza veriyorum.`,
      ],
    },
    {
      baslik: 'Servis ve bayiye aktarım',
      paragraflar: [
        'Servis talebi oluşturduğumda adımın ve soyadımın, telefon numaramın, makinemin bulunduğu adresin, makineme ait bilgilerin ve talebimin içeriğinin (fotoğraf, video ve ses kayıtları dâhil) makineme atanmış ya da talebimi yürüten yetkili servise aktarılmasına açık rıza veriyorum. Fiyat teklifi talebi oluşturduğumda adımın ve soyadımın, telefon numaramın, il bilgimin ve talebimin içeriğinin talebi karşılayacak yetkili bayiye aktarılmasına açık rıza veriyorum.',
      ],
    },
    {
      baslik: 'Sizinle iletişim',
      paragraflar: [
        `Oluşturduğum taleplerle ilgili olarak PAKSAN’ın ya da talebimi yürüten yetkili servisin telefon, SMS ve uygulama bildirimi yoluyla benimle iletişime geçmesine rıza veriyorum.`,
        'Bu iletişim yalnızca talebimin alındığının bildirilmesi, servis randevusu ve makinemle ilgili güvenlik uyarıları gibi hizmete ilişkin konuları kapsar. Kampanya ve duyuru bildirimleri bu kapsama girmez; bunlar için ayrıca izin verilmesi gerekir.',
      ],
    },
    {
      baslik: 'Rızanızı geri alabilirsiniz',
      paragraflar: [
        `Bu rızayı dilediğiniz zaman Aydınlatma Metni’nde belirtilen başvuru yollarıyla ya da ${SIRKET.eposta} adresine yazarak geri alabilirsiniz. Rızanızı geri almadan önce yapılan işlemler geçerliliğini korur. Rızanızı geri aldığınızda talepleriniz servise iletilemeyeceği için uygulamayı kullanmaya devam edemeyebilirsiniz. Bu durumda hesabınızın kapatılması için sizinle iletişime geçeriz.`,
      ],
    },
  ],
}

/* Ticari elektronik ileti izni — AYRI ve İSTEĞE BAĞLI.

   Kampanya ve duyurular uygulama bildirimiyle gönderilecek. 6563 sayılı
   kanuna göre bu izin hizmetin şartına bağlanamaz: kullanıcı izin
   vermeden de kayıt olabilmeli. Bu yüzden kayıt ekranında bu kutu
   zorunlu değil, işaretlenmese de kayıt tamamlanır. */
export const TICARI_ILETI = {
  id: 'ticariIleti',
  baslik: 'Kampanya ve Duyuru Bildirimleri',
  kisaAd: 'Kampanya Bildirimleri Metni',
  onayCumlesi:
    /* "(İsteğe bağlı)" yazısı 7 Ekim 2026'da kalktı (kullanıcının
       isteği); kutu yine zorunlu değil. */
    'Kampanya, duyuru ve yeni ürün bildirimlerinin uygulama üzerinden bana gönderilmesini istiyorum.',
  bolumler: [
    {
      baslik: 'Ne gönderiyoruz?',
      paragraflar: [
        'İzin verirseniz yeni ürün duyurularını, sezon kampanyalarını, bayi etkinliklerini ve yedek parça fırsatlarını uygulama bildirimi olarak telefonunuza gönderiyoruz. Şu anda bu bildirimler için SMS, e-posta ya da telefon araması kullanılmıyor. Bu iletişim yolları kullanılacak olursa ayrıca izninizi isteriz.',
      ],
    },
    {
      baslik: 'Bu izin zorunlu değil',
      paragraflar: [
        'Bu izni vermeseniz de uygulamayı eksiksiz kullanabilirsiniz. Makine kaydı, arıza desteği, servis ve yedek parça talepleri bu izinden bağımsız olarak çalışır.',
        'Talebinizin durumu ya da makinenizle ilgili güvenlik uyarıları gibi hizmete ilişkin bildirimler, kampanya bildirimi sayılmaz ve bu izinden bağımsız olarak gönderilir.',
      ],
    },
    {
      baslik: 'İstediğiniz zaman kapatabilirsiniz',
      paragraflar: [
        `Bu izni, "Profil" sayfasındaki "Gizlilik ve İzinler" sayfasından açıp kapatabilirsiniz. Son değişikliğin tarihi aynı sayfada görünür. İzninizi ${SIRKET.eposta} adresine yazarak da geri alabilirsiniz. Telefonunuzun ayarlarından uygulamanın tüm bildirimlerini de kapatabilirsiniz.`,
      ],
    },
  ],
}

/* Uygulama izinleri — BİLGİ, ONAY DEĞİL (29 Eylül 2026).
   Uygulamanın telefondan ne istediği ve ne için istediği. Onay kutusu
   yok; Gizlilik ve İzinler sayfasında okunuyor (screens/Gizlilik.jsx).
   Kayıt ekranında onaylanan metinlerin listesinde (METINLER) değil,
   veritabanının metin sürümleri tablosuna da girmiyor. */
export const IZINLER = {
  id: 'izinler',
  baslik: 'Uygulama İzinleri',
  kisaAd: 'Uygulama İzinleri',
  bolumler: [
    {
      baslik: 'Bildirimler',
      paragraflar: [
        'Bildirim izni, talebinizin durumu değiştiğinde, servis randevunuz oluşturulduğunda ya da makinenizle ilgili bir güvenlik uyarısı olduğunda size haber verebilmek için istenir. Uygulama bu izni kendiliğinden istemez; önce iznin ne için istendiğini açıklar. İzni telefonunuzun ayarlarından dilediğiniz zaman kapatabilirsiniz. Kapattığınızda gelişmeleri uygulamanın Bildirimler sayfasından takip edebilirsiniz.',
      ],
    },
    {
      baslik: 'Mikrofon',
      paragraflar: [
        `Mikrofon izni yalnızca talep formunda ses kaydı düğmesine bastığınızda istenir. Ses kaydı talebinize eklenir; kaydı PAKSAN ve talebinizi yürüten yetkili servis dinler. Uygulama, siz düğmeye basmadan mikrofonu açmaz.`,
      ],
    },
    {
      baslik: 'Kamera, fotoğraf ve dosyalar',
      paragraflar: [
        'Bu izinler yalnızca talebinize fotoğraf, video ya da dekont eklerken, sizin seçtiğiniz dosyalar için kullanılır. Fotoğraflar gönderilmeden önce küçültülür. Uygulama galerinizdeki diğer dosyalara erişmez.',
      ],
    },
    {
      baslik: 'Konum',
      paragraflar: [
        'Uygulama telefonunuzun konumunu kullanmaz ve konum izni istemez. Servisin geleceği yer, sizin yazdığınız adrestir.',
      ],
    },
    {
      baslik: 'Telefon araması',
      paragraflar: [
        `Servisi, bayiyi ya da PAKSAN’ı aramak için bir numaraya dokunduğunuzda telefonunuzun arama ekranı açılır. Aramayı siz başlatırsınız. Uygulama arama kayıtlarınıza erişmez.`,
      ],
    },
  ],
}


export const METINLER = [AYDINLATMA, ACIK_RIZA, TICARI_ILETI]

/* ==========================================================================
   Dil

   ⚠ İngilizce metinler ÇEVİRİDİR, ayrı bir hukuki metin değildir. Her
   metnin başında Türkçe aslın geçerli olduğu yazıyor. Avrupa'daki
   müşteri için GDPR'a göre yazılmış ayrı bir metin gerekiyor
   (bkz. PRODA-CIKIS.md → A3).
   ========================================================================== */

export function metinDilde(metin, dil = 'tr') {
  if (!metin || dil === 'tr') return metin
  const en = KVKK_EN[metin.id]
  if (!en) return metin
  return {
    ...metin,
    ...en,
    /* Çeviri olduğu her metnin başında yazılı */
    ustNot: ASIL_METIN_NOTU,
  }
}

export function metinListesi(dil = 'tr') {
  return METINLER.map((m) => metinDilde(m, dil))
}
