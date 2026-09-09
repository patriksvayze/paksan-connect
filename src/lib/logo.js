/* ==========================================================================
   Logo ERP bağlantısı

   PAKSAN'ın satış ve üretim kayıtları Logo'da. Uygulamanın ve backoffice’in
   Logo'dan öğrenmek istediği tek şey seri numarasının geçmişi:

       · makine ne zaman üretildi
       · ne zaman fatura edildi (satıldı)
       · hangi bayiye satıldı

   NEDEN GEREKLİ:
   Müşteri makinesini uygulamaya seri numarasıyla kaydediyor. Seri
   numarası tek başına "bu makine yeni satıldı" demeye yetmiyor —
   2019'da satılmış bir makine bugün de kaydedilebilir, ikinci el
   alınmış olabilir. Faturayı yalnız Logo biliyor.

   Bu yüzden hem bayiye satış sayısı yazmak hem de müşteriye "hayırlı
   olsun" demek Logo'nun cevabına bağlı. Logo bağlı değilken ikisi de
   olmuyor; yanlış bilgi vermektense hiç vermemek doğru.

   ------------------------------------------------------------------
   BAĞLANTI NASIL KURULACAK

   Logo'ya doğrudan uygulamadan bağlanılmıyor. Araya PAKSAN'ın kendi
   sunucusu giriyor:

       Uygulama / Backoffice  →  PAKSAN sunucusu  →  Logo (REST / SQL)

   Sebebi: Logo kullanıcı bilgileri ve veritabanı erişimi telefona
   konamaz. Sunucu Logo'dan okuduğu bilgiyi sadeleştirip veriyor.

   PAKSAN tarafında yapılması gerekenler:
     1. Logo'da REST servisinin (Logo Objects / LogoConnect) açılması
        veya veritabanına okuma yetkili bir kullanıcı tanımlanması.
     2. Sunucuda `/logo/seri/{seriNo}` uç noktasının yazılması.
     3. Aşağıdaki `LOGO.aktif` alanının true yapılması.

   Bu dosya bağlantıyı bekleyen tarafı hazır tutuyor: cevabın biçimi
   belli, ekranlar buna göre yazıldı. Logo açıldığında yalnız bu
   dosyanın içi çalışır hâle geliyor.
   ========================================================================== */

export const LOGO = {
  /* PAKSAN sunucusundaki Logo uç noktası hazır olunca true */
  aktif: false,

  /* Örnek: 'https://backoffice.paksanmakina.com.tr/api/logo' */
  endpoint: '',

  zamanAsimi: 15000,

  /* Faturadan sonra kaç gün içindeki kayıt "yeni satış" sayılsın?
     Makine bayiden çıkıp tarlaya gidene, kullanıcı uygulamayı indirene
     kadar geçen süre. Uzun tutulursa ikinci el alan kişiye de "hayırlı
     olsun" denir; kısa tutulursa gerçek alıcı bunu kaçırır. */
  yeniSatisGun: 120,
}

/**
 * Seri numarasının Logo'daki geçmişi.
 *
 * Beklenen cevap:
 *   {
 *     "seri": "1270240001",
 *     "uretimTarihi": "2024-03-11",
 *     "faturaTarihi": "2024-05-02",
 *     "servisId": "konya-merkez",
 *     "servisAd": "Paksan Konya Ana Servis",
 *     "model": "orkinos-1270"
 *   }
 *
 * @returns {Promise<object|null>} Logo kapalıysa veya kayıt yoksa null
 */
export async function seriBilgisi(seri) {
  if (!LOGO.aktif || !LOGO.endpoint) return null
  const temiz = String(seri || '').replace(/\D/g, '')
  if (!temiz) return null

  const iptal = new AbortController()
  const sayac = setTimeout(() => iptal.abort(), LOGO.zamanAsimi)

  try {
    const cevap = await fetch(`${LOGO.endpoint}/seri/${temiz}`, { signal: iptal.signal })
    if (!cevap.ok) return null
    return await cevap.json()
  } catch {
    /* Logo'ya ulaşılamadı. Bilgi yok demek, "yeni değil" demek değil —
       çağıran taraf ikisini ayırt etsin diye null dönüyoruz. */
    return null
  } finally {
    clearTimeout(sayac)
  }
}

/**
 * Bu kayıt yeni bir satış mı?
 *
 * Üç şart birden aranıyor:
 *   1. Logo bu seri numarasını tanıyor,
 *   2. faturası kesilmiş,
 *   3. fatura üstünden `yeniSatisGun` günden az geçmiş.
 *
 * Üçü de sağlanmadıkça false. "Bilmiyorum" da false sayılıyor: müşteriye
 * yanlışlıkla "hayırlı olsun" demek, hiç dememekten kötü.
 */
export function yeniSatisMi(bilgi) {
  if (!bilgi?.faturaTarihi) return false
  const fatura = new Date(bilgi.faturaTarihi).getTime()
  if (!fatura) return false
  const gun = (Date.now() - fatura) / 86400000
  return gun >= 0 && gun <= LOGO.yeniSatisGun
}
