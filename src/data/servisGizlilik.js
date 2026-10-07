/* ==========================================================================
   Servisim — gizlilik metinleri

   NEDEN VAR (29 Eylül 2026, kullanıcının isteği: "Servisim için de
   hukuki açıdan bizi ve kullanıcıyı koruyacak aksiyonların alınması
   gerekiyor Connect'te olduğu gibi"). Servisim'de hiçbir metin yoktu.
   Servis çiftçinin adını, telefonunu, adresini, makinesini ve gönderdiği
   fotoğraf, video, ses kayıtlarını görüyor; firma da servisin kendi
   verisini (vergi numarası, IBAN, iş kayıtları) işliyor.

   ÜÇ METİN:
     · Aydınlatma Metni — firmanın servis kullanıcısının verisini nasıl
       işlediği. Açık rıza İSTENMİYOR: servis işi sözleşmeye, vergi
       kayıtları kanuni yükümlülüğe, denetim meşru menfaate dayanıyor;
       gereksiz rıza istemek hem yanıltıcı hem hukuken zayıf.
     · Müşteri Bilgilerinin Gizliliği — servisin çiftçi verisini yalnız
       iş için kullanması. Firma ile servis arasındaki sözleşmenin
       gizlilik hükümlerini HATIRLATIYOR, onların yerine geçmiyor.
     · Uygulama İzinleri — bilgi; onay istenmiyor (30 Eylül 2026'dan beri
       Hesap → Gizlilik ve İzinler sayfasında).

   İlk ikisi ilk girişte (ve sürüm değişince) okunup kabul ediliyor
   (ServisPanel.jsx → GizlilikKapisi, kayıt lib/servisGizlilik.js). Sürüm
   değişirse SERVIS_METIN_SURUM artırılır; servis bir sonraki girişte
   yeni hâlini kabul eder.

   ⚠ TASLAK: hukuk danışmanı onaylamalı (CANLIYA-CIKIS.md → "KVKK: hukuk
   danışmanına sorulacaklar"). Servisim tek dilli; İngilizcesi yok.
   METİNLER CODEX'TEN GEÇTİ (proje kuralı).
   ========================================================================== */

import { SIRKET } from './kimlik.js'

export const SERVIS_METIN_SURUM = '1.0'
export const SERVIS_METIN_TARIH = '29 Eylül 2026'

export const SERVIS_AYDINLATMA = {
  id: 'servisAydinlatma',
  baslik: 'Servis Kullanıcıları İçin Aydınlatma Metni',
  kisaAd: 'Aydınlatma Metni',
  ozet: [
    `Hesap, iş ve ödeme bilgilerinizi PAKSAN işler.`,
    'Bilgileriniz yalnızca servis işlerini ve ödemeleri yürütmek için kullanılır.',
    'Haklarınız ve başvuru yolları bu metinde açıklanır.',
  ],
  bolumler: [
    {
      baslik: 'Veri sorumlusu kim?',
      paragraflar: [
        `Bu uygulamayı kullanan servis sahiplerinin ve çalışanlarının kişisel verilerini, veri sorumlusu ${SIRKET.unvan} işler. Veriler, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca, bu metinde açıklanan şekilde işlenir.`,
        `Adres: ${SIRKET.adres}`,
        `Telefon: ${SIRKET.telefon} · ${SIRKET.telefon2}`,
        `E-posta: ${SIRKET.eposta}`,
      ],
    },
    {
      baslik: 'Hangi verileriniz işleniyor?',
      maddeler: [
        'Servis ve kişi bilgileri: servisin veya işletmenin adı, yetkili kişinin adı, telefon numarası, il, ilçe ve adres.',
        'Fatura ve ödeme bilgileri: fatura unvanı, vergi dairesi, vergi numarası veya şahıs işletmelerinde T.C. kimlik numarası, banka hesap bilgisi (IBAN).',
        'Hesap ve güvenlik bilgileri: kullanıcı adı, şifrenizin geri döndürülemeyen özeti, giriş ve çıkış zamanları, uygulamada yaptığınız işlemlerin kaydı.',
        'İş kayıtları: aldığınız işler, verdiğiniz randevular, servis kayıtları, kilometre ve işçilik süresi, yüklediğiniz fotoğraflar, yazdığınız notlar.',
        'Parça ve ödeme kayıtları: parça siparişleriniz, teslimat adresleriniz, hak edişleriniz ve bakiye hareketleriniz.',
        'Kullanım bilgileri: uygulama sürümü ve bildirimlere izin verdiyseniz cihazınızın bildirim kimliği.',
      ],
    },
    {
      baslik: 'Hangi amaçlarla ve hukuki sebeplerle işleniyor?',
      maddeler: [
        'Hesabınızı açmak, uygulamaya girişinizi ve hesap güvenliğinizi sağlamak için: sözleşmenin ifası (md. 5/2-c) ve meşru menfaat (md. 5/2-f).',
        'Size servis işi iletmek, iş kayıtlarınızı almak ve müşteriye servis bilgilerini göstermek için: sözleşmenin ifası (md. 5/2-c).',
        'Hak edişinizi hesaplamak, ödemelerinizi ve bakiye işlemlerinizi yürütmek, parça siparişlerinizi faturalandırmak ve göndermek için: sözleşmenin ifası (md. 5/2-c) ve hukuki yükümlülük (md. 5/2-ç).',
        'Servis kalitesini ve garanti işlemlerini denetlemek için: meşru menfaat (md. 5/2-f).',
        'Olası uyuşmazlıklarda haklarımızı korumak ve resmî makamların taleplerini karşılamak için: md. 5/2-e ve md. 5/2-ç.',
      ],
    },
    {
      baslik: 'Kimlere aktarılıyor?',
      maddeler: [
        `Müşteriler: işi size verilen çiftçi, PAKSAN Connect uygulamasında servisinizin adını ve telefon numarasını görür.`,
        'Bankalar ve muhasebe birimleri: ödemelerin yapılması ve kayıtların tutulması için gereken ölçüde bilgi aktarılır.',
        `Hizmet sağlayıcılar: uygulamayı barındıran sunucu ve bildirim altyapısı gibi hizmetleri PAKSAN’ın adına sunan firmalara bilgi aktarılır.`,
        'Mali müşavirler, denetçiler, hukuk danışmanları ve yetkili kamu kurumları: mevzuatın gerektirdiği hâllerde bilgi aktarılır.',
      ],
    },
    {
      baslik: 'Sesle yazma',
      paragraflar: [
        `Bir alana konuşarak yazdığınızda sesiniz, metne çevrilmek için telefonunuzun ses tanıma hizmetine gönderilir. Bu hizmet, telefonunuzun üreticisine veya Google’a ait olabilir. PAKSAN sesinizi kaydetmez ve saklamaz. Yalnızca alana yazılan metin kaydedilir.`,
      ],
    },
    {
      baslik: 'Nasıl toplanıyor ve ne kadar saklanıyor?',
      paragraflar: [
        `Verileriniz, servis sözleşmesi sırasında PAKSAN’a verdiğiniz bilgilerden ve uygulamada yaptığınız işlemlerden elektronik ortamda toplanır. Uygulama telefonunuzun konumunu kullanmaz.`,
        'Verileriniz, servis ilişkisi boyunca saklanır. Bu ilişki sona erdikten sonra da vergi ve ticaret mevzuatında öngörülen süreler ile zamanaşımı süreleri boyunca saklanır. Bu süreler dolunca silinir, yok edilir veya anonim hâle getirilir.',
      ],
    },
    {
      baslik: 'Haklarınız ve başvuru',
      paragraflar: [
        `KVKK’nın 11. maddesi uyarınca verilerinizin işlenip işlenmediğini öğrenme, bilgi isteme, düzeltilmesini veya silinmesini isteme haklarınız vardır. Ayrıca verilerinizin aktarıldığı kişileri öğrenebilir, itiraz edebilir ve zararınızın giderilmesini isteyebilirsiniz. Bu haklarınızı kullanmak için adresimize ıslak imzalı dilekçeyle başvurabilirsiniz. Kayıtlı elektronik posta (KEP), güvenli elektronik imza veya mobil imza yoluyla da başvuru yapabilirsiniz. Ayrıca sistemimizde kayıtlı e-posta adresinizden ${SIRKET.eposta} adresine başvurabilirsiniz. Başvurunuz en geç 30 gün içinde ücretsiz olarak sonuçlandırılır.`,
      ],
    },
  ],
}

export const SERVIS_GIZLILIK = {
  id: 'servisGizlilik',
  baslik: 'Müşteri Bilgilerinin Gizliliği',
  kisaAd: 'Müşteri Bilgilerinin Gizliliği',
  ozet: [
    'Müşteri bilgilerini yalnızca size verilen iş için kullanın.',
    'Bilgileri kopyalamayın, başkalarıyla paylaşmayın.',
    `Telefonunuz kaybolursa hemen PAKSAN’a haber verin.`,
  ],
  bolumler: [
    {
      baslik: 'Neden önemli?',
      paragraflar: [
        `Uygulamada gördüğünüz çiftçi bilgileri, PAKSAN’ın sorumluluğundaki kişisel verilerdir. Bunlar ad, telefon, adres, makine bilgileri ile fotoğraf, video ve ses kayıtlarıdır. Bu bilgiler size yalnızca işi yapabilmeniz için gösterilir. Bu bilgileri korumak hem çiftçinin hem sizin hem de PAKSAN’ın yasal yükümlülüğüdür.`,
      ],
    },
    {
      baslik: 'Uymanız gereken kurallar',
      maddeler: [
        'Müşteri bilgilerini yalnızca size verilen veya sizin açtığınız iş için kullanın.',
        'Bilgileri, fotoğrafları ve kayıtları uygulama dışına kopyalamayın. Başkalarıyla paylaşmayın. Kendi reklam veya satış faaliyetleriniz için kullanmayın.',
        '“Kayıt Aç” ekranında telefon veya seri numarasıyla yalnızca gerçekten yapacağınız bir iş için arama yapın.',
        'Giriş bilgilerinizi kimseyle paylaşmayın. Telefonunuzu kilitli tutun. Başkasının telefonunda işiniz bitince oturumu kapatın.',
        'İş için telefonunuza kaydettiğiniz fotoğrafları iş bitince silin.',
        `Telefonunuz kaybolursa, çalınırsa veya bilgilerin başkasının eline geçtiğini düşünürseniz hemen PAKSAN’ı arayın. Hesabınız geçici olarak kapatılır.`,
        `Bu yükümlülükler, PAKSAN ile çalışmanız sona erdikten sonra da devam eder.`,
      ],
    },
    {
      baslik: 'Kurallara uyulmazsa',
      paragraflar: [
        `PAKSAN, bu kurallara uyulup uyulmadığını denetleyebilir. Kurallara uymazsanız hesabınız kapatılabilir. Servis sözleşmesinde ve kanunda öngörülen sonuçlar da doğar. Bu metin, PAKSAN ile servisiniz arasındaki sözleşmenin gizlilik hükümlerini hatırlatır. Bu hükümlerin yerine geçmez.`,
      ],
    },
  ],
}


/* Uygulama izinleri — bilgi, onay değil. Gizlilik ve İzinler sayfasında
   "İzin Açıklamalarını Oku" ile açılıyor (servis/ekranlar/Gizlilik.jsx). */
export const SERVIS_IZINLER = {
  id: 'servisIzinler',
  baslik: 'Uygulama İzinleri',
  kisaAd: 'Uygulama İzinleri',
  ozet: [],
  bolumler: [
    {
      baslik: 'Bildirimler',
      paragraflar: [
        'Yeni iş geldiğinde, randevu veya parça durumu değiştiğinde ve hak edişiniz onaylandığında size haber vermek için bildirim izni istenir. İzin istenmeden önce amacı açıklanır. İzni telefonunuzun ayarlarından dilediğiniz zaman kapatabilirsiniz.',
      ],
    },
    {
      baslik: 'Mikrofon',
      paragraflar: [
        `Mikrofon izni yalnızca “Konuşarak Yaz” düğmesine bastığınızda istenir. Sesiniz, metne çevrilmek için telefonunuzun ses tanıma hizmetine gönderilir. PAKSAN sesinizi kaydetmez ve saklamaz.`,
      ],
    },
    {
      baslik: 'Kamera ve fotoğraflar',
      paragraflar: [
        'Kamera ve fotoğraf erişimi yalnızca servis kaydına fotoğraf eklerken kullanılır. Erişim, sizin çektiğiniz veya seçtiğiniz fotoğrafla sınırlıdır.',
      ],
    },
    {
      baslik: 'Konum',
      paragraflar: [
        'Uygulama konumunuzu kullanmaz ve konum izni istemez. “Yol Tarifi”, işin yazılı adresini telefonunuzun harita uygulamasında açar. Bu sırada adres, harita uygulamasına gönderilir.',
      ],
    },
    {
      baslik: 'Telefon araması',
      paragraflar: [
        'Müşteriyi veya bayiyi aramak için numaraya dokunduğunuzda telefonunuzun arama ekranı açılır. Aramayı siz başlatırsınız.',
      ],
    },
  ],
}

/* İlk girişte kabul edilen iki metin, ekrandaki sırayla. */
export const SERVIS_KABUL_METINLERI = [SERVIS_AYDINLATMA, SERVIS_GIZLILIK]
