/* ==========================================================================
   KVKK Aydınlatma Metni ve Açık Rıza Metni

   ⚠ ÖNEMLİ — BU METİNLER TASLAKTIR.
   Uygulamanın işleyişine göre yazıldı: hangi veriyi topladığımız, ne için
   kullandığımız ve kime aktardığımız buradaki maddelerle birebir uyuşuyor.
   Ancak yayına çıkmadan önce PAKSAN'ın hukuk danışmanı okuyup onaylamalı.

   Unvan ve adresler siteden alındı (src/config.js → SIRKET). Resmî
   unvanda A.Ş. / Ltd. Şti. gibi bir ek varsa ve VERBİS kaydı varsa
   oraya eklenmeli.

   Metin değişirse SURUM numarasını artırın: kullanıcıların onayı sürümle
   birlikte saklanıyor, böylece kimin hangi metni onayladığı belli oluyor.
   ========================================================================== */

import { SIRKET, MARKA, markaEk } from '../marka'
import { KVKK_EN, ASIL_METIN_NOTU } from './kvkk.en'

export const KVKK_SURUM = '1.0'
export const KVKK_TARIH = '14 Ağustos 2026'

export const AYDINLATMA = {
  id: 'aydinlatma',
  baslik: 'KVKK Aydınlatma Metni',
  kisaAd: 'Aydınlatma Metni',
  onayCumlesi: 'Aydınlatma Metni’ni okudum ve anladım.',
  bolumler: [
    {
      baslik: 'Veri sorumlusu kim?',
      paragraflar: [
        `Kişisel verileriniz, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusu sıfatıyla ${SIRKET.unvan} tarafından, aşağıda açıklanan kapsamda işlenmektedir.`,
        `Adres: ${SIRKET.adres}`,
        `Adres: ${SIRKET.adres2}`,
        `Telefon: ${SIRKET.telefon} · ${SIRKET.telefon2} · Faks: ${SIRKET.faks}`,
        `E-posta: ${SIRKET.eposta}`,
      ],
    },
    {
      baslik: 'Hangi verileriniz işleniyor?',
      maddeler: [
        'Kimlik ve iletişim bilgisi: ad soyad, cep telefonu numarası',
        'Konum bilgisi: yaşadığınız il, talep oluştururken yazdığınız ilçe/köy',
        'Anlık konum: yalnızca "size en yakın bayiyi bul" özelliğini kullandığınızda, yalnızca telefonunuzun içinde',
        'Ürün bilgisi: kaydettiğiniz makinenin seri numarası, modeli ve üretim yılı',
        'Talep bilgisi: servis, yedek parça ve fiyat teklifi taleplerinizde yazdıklarınız',
        'Fatura ve teslimat bilgisi: yedek parça siparişinde faturanın kesileceği kişi/firma adı, T.C. kimlik numarası veya vergi numarası, teslimat adresi ve yüklediğiniz ödeme dekontu',
        'Destek kayıtları: destek asistanına yazdığınız sorular ve verilen cevaplar',
        'Bildirim bilgisi: uygulama bildirimlerine izin verirseniz, bildirimin telefonunuza ulaşmasını sağlayan cihaz bildirim kimliği',
      ],
    },
    {
      baslik: 'Ne amaçla işleniyor?',
      maddeler: [
        'Satın aldığınız makineye teknik destek ve arıza desteği verebilmek',
        'Servis ve yedek parça taleplerinizi karşılamak, sizi doğru ekibe yönlendirmek',
        'Garanti süreçlerini yürütmek ve garanti kapsamını değerlendirmek',
        'Size en yakın yetkili bayi ve servisi gösterebilmek',
        'Ürün güvenliğiyle ilgili bir durum çıkarsa sizi bilgilendirebilmek',
        'Fiyat teklifi taleplerinizi yanıtlamak',
        'Yedek parça siparişinizin faturasını düzenlemek, ödemenizi doğrulamak ve parçayı belirttiğiniz adrese göndermek',
        'Talebinizin durumu değiştiğinde uygulama bildirimi göndermek',
        'Ayrıca izin verirseniz, kampanya ve duyurularımızı uygulama bildirimiyle iletmek',
      ],
    },
    {
      baslik: 'Hukuki sebep nedir?',
      paragraflar: [
        'Verileriniz KVKK’nın 5. maddesinde sayılan şu sebeplere dayanılarak işlenir:',
      ],
      maddeler: [
        'Bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması (satış sonrası hizmet ve garanti) — md. 5/2-c',
        'Veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi (garanti, tüketici ve vergi mevzuatı; fatura düzenleme yükümlülüğü) — md. 5/2-ç',
        'İlgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla meşru menfaat — md. 5/2-f',
        'Yetkili bayi ve servislere aktarım ile açıkça rıza verdiğiniz işlemler için açık rızanız — md. 5/1',
      ],
    },
    {
      baslik: 'Kimlere aktarılıyor?',
      paragraflar: [
        'Talebinizi karşılayabilmek için gerektiği kadarıyla, size en yakın yetkili bayi ve yetkili servise aktarılabilir. Örneğin servis talebinizde adınız, telefonunuz ve makinenizin seri numarası ilgili servise iletilir.',
        'Bunun dışında, kanunen yetkili kamu kurum ve kuruluşlarına mevzuatın gerektirdiği hâllerde aktarım yapılabilir.',
        'Verileriniz pazarlama amacıyla üçüncü kişilere satılmaz veya kiralanmaz.',
      ],
    },
    {
      baslik: 'Nasıl topluyoruz?',
      paragraflar: [
        'Verileriniz, uygulamaya kendiniz yazdığınız bilgiler üzerinden elektronik ortamda toplanır. Uygulama, siz girmediğiniz hiçbir bilgiyi kendiliğinden toplamaz.',
        'Anlık konumunuz yalnızca siz "Konumumu kullan" düğmesine bastığınızda alınır, yalnızca en yakın bayiyi sıralamak için telefonunuzun içinde kullanılır ve hiçbir yere gönderilmez.',
        'Cihaz bildirim kimliği yalnızca uygulama bildirimlerine izin verdiğinizde oluşur. İzni telefonunuzun ayarlarından dilediğiniz zaman kapatabilirsiniz; kapattığınızda bildirim gönderilemez.',
      ],
    },
    {
      baslik: 'Ne kadar süre saklanıyor?',
      paragraflar: [
        'Verileriniz, satış sonrası hizmet ilişkisi sürdüğü ve ilgili mevzuatın öngördüğü zamanaşımı süreleri boyunca saklanır. Sürenin sonunda silinir, yok edilir veya anonim hâle getirilir.',
      ],
    },
    {
      baslik: 'Haklarınız neler?',
      paragraflar: ['KVKK’nın 11. maddesi uyarınca şunları talep edebilirsiniz:'],
      maddeler: [
        'Kişisel verinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme',
        'İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme',
        'Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme',
        'Eksik veya yanlış işlenmişse düzeltilmesini isteme',
        'Şartları oluştuğunda silinmesini veya yok edilmesini isteme',
        'Düzeltme ve silme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme',
        'Yalnızca otomatik sistemlerle analiz edilmesi sonucu aleyhinize bir sonuç çıkmasına itiraz etme',
        'Kanuna aykırı işlenmesi sebebiyle zarara uğrarsanız zararın giderilmesini talep etme',
      ],
    },
    {
      baslik: 'Nasıl başvurursunuz?',
      paragraflar: [
        `Yukarıdaki haklarınız için ${SIRKET.eposta} adresine yazabilirsiniz. Başvurunuz en geç 30 gün içinde sonuçlandırılır.`,
        `Hesabınızın ve kayıtlarınızın tamamen silinmesini istiyorsanız da aynı adrese yazmanız yeterli; işlem ${MARKA} tarafından yapılır.`,
      ],
    },
  ],
}

export const ACIK_RIZA = {
  id: 'acikRiza',
  baslik: 'Açık Rıza Metni',
  kisaAd: 'Açık Rıza Metni',
  onayCumlesi:
    'Açık Rıza Metni’ni okudum, kişisel verilerimin bu kapsamda işlenmesine ve yetkili bayi/servise aktarılmasına açık rıza veriyorum.',
  bolumler: [
    {
      baslik: 'Neye rıza veriyorsunuz?',
      paragraflar: [
        `Aydınlatma Metni’ni okuduğumu; ad soyad, cep telefonu numaram, ilim, kaydettiğim makinenin seri numarası ve oluşturduğum taleplerin içeriğinin ${SIRKET.ad} tarafından satış sonrası destek, servis, yedek parça ve garanti süreçlerinin yürütülmesi amacıyla işlenmesine açık rıza veriyorum.`,
      ],
    },
    {
      baslik: 'Bayi ve servise aktarım',
      paragraflar: [
        'Servis, yedek parça veya fiyat teklifi talebi oluşturduğumda; talebimin karşılanabilmesi için ad soyadımın, telefon numaramın, konum bilgimin (il/ilçe) ve makinemin seri numarasının bana en yakın yetkili bayi ve yetkili servise aktarılmasına açık rıza veriyorum.',
      ],
    },
    {
      baslik: 'Sizinle iletişim',
      paragraflar: [
        `Oluşturduğum taleplerle ilgili olarak ${markaEk('in')} veya yönlendirdiği yetkili servisin telefon, SMS ve uygulama bildirimi yoluyla benimle iletişime geçmesine rıza veriyorum.`,
        'Bu kapsamdaki bildirimler yalnızca hizmete ilişkindir: talebimin alındığı, servis randevusu, makinemle ilgili güvenlik uyarısı gibi. Kampanya ve duyuru bildirimleri buna dâhil değildir; onlar için ayrıca izin verilmesi gerekir.',
      ],
    },
    {
      baslik: 'Rızanızı geri alabilirsiniz',
      paragraflar: [
        `Bu rızayı dilediğiniz zaman geri alabilirsiniz. ${SIRKET.eposta} adresine yazmanız yeterlidir. Rızanızı geri aldığınızda, geri alma tarihine kadar yapılmış işlemler geçerliliğini korur.`,
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
    'Kampanya, duyuru ve yeni ürün bildirimlerinin uygulama üzerinden bana gönderilmesini istiyorum. (İsteğe bağlı)',
  bolumler: [
    {
      baslik: 'Ne gönderiyoruz?',
      paragraflar: [
        'İzin verirseniz; yeni ürün duyuruları, sezon kampanyaları, bayi etkinlikleri ve yedek parça fırsatları hakkındaki bildirimleri uygulama üzerinden telefonunuza gönderiyoruz.',
      ],
    },
    {
      baslik: 'Bu izin zorunlu değil',
      paragraflar: [
        'Bu izni vermeseniz de uygulamayı eksiksiz kullanabilirsiniz. Makine kaydı, arıza desteği, servis ve yedek parça talepleri bu izinden bağımsız çalışır.',
        'Talebinizin durumu veya makinenizle ilgili güvenlik uyarısı gibi hizmete ilişkin bildirimler kampanya bildirimi sayılmaz; onlar bu izinden bağımsız olarak gönderilir.',
      ],
    },
    {
      baslik: 'İstediğiniz zaman kapatabilirsiniz',
      paragraflar: [
        `Bu izni uygulamanın Profil sayfasından tek dokunuşla açıp kapatabilirsiniz. İsterseniz ${SIRKET.eposta} adresine yazarak da geri alabilirsiniz. Ayrıca telefonunuzun ayarlarından uygulamanın tüm bildirimlerini kapatabilirsiniz.`,
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
