import { durumBilgi, servisBildirimleri } from '../backoffice/veri'
import { load, save } from '../lib/storage'
import { duyuruGecerliMi } from '../lib/duyuruHedef'
import { servisDuyuruBaglami } from '../lib/servisAtama'
import { PARA_BIRIMI, paraYaz } from '../data/katalog/para.js'

/* ==========================================================================
   PAKSAN'dan servise gelen talep bildirimleri (21 Eylül 2026)

   PAKSAN bir talepte servise dokunan bir işlem yaptığında veri
   katmanı bir kayıt yazıyor (bkz. backoffice/veri.js → serviseBildir).
   25 Eylül 2026'dan beri müşterinin Connect'ten talebe yaptığı iki
   işlem de aynı kaydı yazıyor: talebe ekleme (`musteriEkledi`) ve
   kapanmış işte "Sorun Devam Ediyor" (`musteriSorunDevam`; bkz.
   lib/talepEkleme.js). Servisim bunları "Müşteriden" diye ayırıyor
   (musteridenMi): PAKSAN'ın işlemi gibi görünmesinler.
   Bu dosya o kaydın Servisim'de NASIL okunduğunu tutuyor:

     - yazısı: kayıtta metin yok, olay var; metin burada
     - okunmuşluğu: bu cihazda hangisinin açıldığı
     - süzgeçleri: okunmamışlar, bir talebin bütün bildirimleri

   Üç yerde kullanılıyor: iş kartının "Yeni bildirim" etiketi
   (ekranlar/Islerim.jsx; İşlerim'in üstündeki özet satırı 9 Ekim 2026'da
   kalktı, ondan önce her bildirim ayrı satırdı) ve Bildirimler ekranı,
   talebin içinde o talebin geçmişi (ekranlar/TalepDetay.jsx) ve telefon
   bildirimi (haber.js).

   OKUNMUŞLUK CİHAZDA. Müşteri uygulamasındaki okunan bildirimlerin
   aynısı; sunucu geldiğinde bildirim.Teslimat.OkunmaZamani'na geçecek.
   ========================================================================== */

const OKUNAN = 'okunanBildirimlerServis'

/* METİNLER TEK NESNEDE. Olayların listesi veri.js'te serviseBildir'i
   çağıran yerlerde; buraya eklenmeyen bir olay "işlem yaptı" diye
   genel yazıyla görünür, kaybolmaz. */
const METIN = {
  durum: (d) => ({
    baslik: `PAKSAN talebin durumunu değiştirdi`,
    metin: `Yeni durum: ${durumBilgi(d.durum).ad}`,
  }),
  /* İptal edilen bakiye siparişinde düşülmüş tutar bakiyeye döndüyse
     (24 Eylül 2026, veri.js → siparisIadesiniYaz) rakam metinde. */
  iptal: (d) => ({
    baslik: `PAKSAN talebi iptal etti`,
    metin:
      [
        d.neden ? `İptal nedeni: ${d.neden}` : !d.iade && 'Bu işe gitmenize gerek kalmadı.',
        d.iade && `${paraYaz(d.iade)} ${PARA_BIRIMI} bakiyenize geri eklendi.`,
      ]
        .filter(Boolean)
        .join(' · '),
  }),
  kapandi: () => ({
    baslik: `PAKSAN talebi kapattı`,
    metin: 'Bu iş için yapmanız gereken başka bir işlem yok.',
  }),
  /* KARGO TAKİBİ VAAT EDİLMİYOR (25 Eylül 2026). Metin "kargo takip
     bilgilerini talepte görebilirsiniz" diyordu; oysa servis siparişinde
     kargo bilgisi hiçbir yere yazılmıyor ve Servisim onu göstermiyor.
     Gönderim başına kargo ayrı bir iş olarak gelene kadar metin yalnız
     talepte gerçekten görünen şeyi söylüyor. */
  siparisGonderildi: () => ({
    baslik: 'Parça siparişiniz kargoya verildi',
    metin: 'Gönderilen parçaları talepte görebilirsiniz.',
  }),
  /* Eksik gönderim (24 Eylül 2026): siparişin bir kısmı gitti, kalanı
     talepte bekliyor (backoffice/veri.js → talepKapat). */
  siparisKismenGonderildi: () => ({
    baslik: 'Parça siparişinizin bir kısmı kargoya verildi',
    metin: 'Gönderilmeyen parçaları talepte görebilirsiniz. Bu parçalar hazır olunca ayrıca gönderilecek.',
  }),
  /* Bekleyen parçalar sonradan gönderildi (veri.js →
     kalanParcalariGonder); hâlâ bekleyen olabilir. */
  kalanGonderildi: () => ({
    baslik: 'Siparişinizin kalan parçaları kargoya verildi',
    metin: 'Hangi parçaların gönderildiğini talepte görebilirsiniz.',
  }),
  /* PAKSAN bekleyen parçaların bir kısmını ya da hepsini siparişten
     çıkardı (veri.js → kalanParcalariIptalEt). Bekleyen parçanın parası
     henüz düşülmediği için bakiyeye bir şey dönmüyor; düşülmeyeceği
     söyleniyor.

     METİNDE SAYI YOK, BİLEREK (25 Eylül 2026). Değerlerde `adet` artık
     çıkarılan parça ADEDİ, `kalem` satır sayısı. 24 Eylül'de yazılmış
     bildirimlerde ise `adet` satır sayısını taşıyor; sayı metne girseydi
     eski kayıt yanlış rakam gösterirdi. Kaç parça çıkarıldığı talebin
     içinde, satırlardan hesaplanıyor (TalepDetay.jsx →
     lib/servisKaydi.js → satirlarinAdedi). */
  kalanIptalEdildi: (d) => ({
    baslik: 'Siparişinizdeki bazı parçalar iptal edildi',
    metin: [
      d.neden && `İptal nedeni: ${d.neden}`,
      d.tutar > 0 &&
        (d.odeme === 'bakiye'
          ? `Bu parçaların tutarı (${paraYaz(d.tutar)} ${PARA_BIRIMI}) bakiyenizden düşülmeyecek.`
          : 'Bu parçalar için sizden ücret alınmayacak.'),
    ]
      .filter(Boolean)
      .join(' · '),
  }),
  planlandi: (d) =>
    d.siparis
      ? {
          baslik: 'Siparişinizin kargoya verileceği gün belli oldu',
          metin: d.tarih ? `${d.tarih} tarihinde kargoya verilecek.` : '',
        }
      : {
          baslik: `PAKSAN ziyaret gününü belirledi`,
          metin: d.tarih ? `Müşteriyle kararlaştırılan ziyaret günü: ${d.tarih}` : '',
        },
  odemeOnay: () => ({
    baslik: 'Siparişinizin ödemesi onaylandı',
    metin: 'Parçalarınız hazırlanıyor.',
  }),
  parcaYolda: (d) => ({
    baslik: 'Parça yola çıktı',
    metin:
      [d.firma, d.takipNo].filter(Boolean).join(' · ') ||
      'Parça elinize ulaştığında parçayı takıp işi tamamlayabilirsiniz.',
  }),
  kargoGuncellendi: (d) => ({
    baslik: 'Kargo bilgileri güncellendi',
    metin: [d.firma, d.takipNo].filter(Boolean).join(' · '),
  }),
  hakedisOnay: (d) => ({
    baslik: 'Servis kaydınız onaylandı',
    metin: d.tutar ? `${paraYaz(d.tutar)} hak ediş hesabınıza eklendi.` : 'Tutar hak ediş hesabınıza eklendi.',
  }),
  /* RET KESİN (25 Eylül 2026, tasarım kararı; bkz. veri.js →
     hakkedisReddet). Metin yalnız nedeni yazıyordu; servis kaydı
     düzeltip yeniden gönderebileceğini sanıyordu. Artık sonucu da
     söylüyor: bu iş için ödeme yok. */
  hakedisRed: (d) => ({
    baslik: 'Servis kaydınız reddedildi',
    metin: d.neden
      ? `Ret nedeni: ${cumleSonu(d.neden)}. Bu iş için ödeme yapılmayacak.`
      : 'Bu iş için ödeme yapılmayacak.',
  }),
  hakedisDuzelt: (d) => ({
    baslik: `PAKSAN servis kaydınızı düzeltti`,
    metin: d.neden ? `Düzeltme nedeni: ${d.neden}` : '',
  }),
  not: (d) => ({
    baslik: `PAKSAN size not bıraktı`,
    metin: d.metin || '',
  }),
  /* BÖLGE DIŞI TALEP (5 Ekim 2026). Makinenin servisi o bölgeye bakmadığı
     için talep PAKSAN'a düştü, PAKSAN işi bu servise verdi (veri.js →
     bolgeDisiTalebeServisAta). Makinenin servisinin adı burada YOK:
     atama PAKSAN ile servisler arasındaki ticari bir karar. */
  bolgeDisiAtandi: (d) => ({
    baslik: 'PAKSAN size yeni bir iş verdi',
    metin: `Makine şu an ${[d.ilce, d.il].filter(Boolean).join(' / ')} bölgesinde. Müşteriyle görüşüp randevu belirleyin.`,
  }),

  /* MÜŞTERİNİN İŞLEMİ (25 Eylül 2026, kullanıcı sınaması O5 ve
     "Sorun Devam Ediyor"). Kaydı Connect yazıyor (lib/talepEkleme.js →
     eklemeyiServiseBildir, sorunDevaminiServiseBildir); değer
     taşımıyor: eklenen not ve müşterinin açıklaması talebin kendisinde.
     Servisim bu iki olayı "Müşteriden" diye ayırıyor (musteridenMi). */
  musteriEkledi: () => ({
    baslik: 'Müşteri Talebe Yeni Bilgi Ekledi',
    metin: 'Eklenen notu, ses kaydını ya da fotoğrafı talebin içinde bulabilirsiniz.',
  }),
  musteriSorunDevam: () => ({
    baslik: 'Müşteri Sorunun Devam Ettiğini Bildirdi',
    metin: 'Talep yeniden açıldı. Müşterinin açıklamasını talebin içinde görebilirsiniz.',
  }),
  /* MÜŞTERİNİN İPTALİ (8 Ekim 2026). Kaydı Connect yazıyor
     (lib/musteriIptal.js): dokunulmamış talepte hemen iptal
     (`musteriIptal`), işleme alınmışta istek (`musteriIptalIstedi`;
     kararı PAKSAN veriyor, iş o zamana kadar sürüyor). */
  musteriIptal: (d) => ({
    baslik: 'Müşteri talebi iptal etti',
    metin: `İptal nedeni: ${cumleSonu(d.neden || '')}. Bu işe gitmenize gerek kalmadı.`,
  }),
  musteriIptalIstedi: (d) => ({
    baslik: 'Müşteri talebin iptalini istedi',
    metin: `PAKSAN karar verene kadar iş devam ediyor. İptal nedeni: ${d.neden || ''}`,
  }),
  /* PAKSAN müşterinin iptal isteğini reddetti (veri.js →
     iptalIsteginiKarara); onayda "iptal" olayı gidiyor. */
  iptalIstegiReddedildi: (d) => ({
    baslik: 'PAKSAN iptal isteğini kabul etmedi',
    metin: `İş devam ediyor. Gerekçe: ${d.gerekce || ''}`,
  }),

  /* TALEBE BAĞLI OLMAYAN BİLDİRİMLER (23 Eylül 2026, `tur: 'hesap'`).
     Değerleri veri.js yazıyor: ücrette kalem kalem eski ve yeni tutar
     (servisTarifesi.js → tarifeFarki), indirimde eski ve yeni yüzde.
     Servis ekranında "iskonto" değil "indirim" (yasak terim). */
  tarife: (d) => ({
    baslik: 'Hizmet ücretleriniz değişti',
    metin:
      [
        d.yolKm && `Yol: ${paraYaz(d.yolKm.once)} → ${paraYaz(d.yolKm.simdi)} ${PARA_BIRIMI}/km`,
        d.iscilikSaat && `İşçilik: ${paraYaz(d.iscilikSaat.once)} → ${paraYaz(d.iscilikSaat.simdi)} ${PARA_BIRIMI}/saat`,
        d.makine && 'Bazı makine modellerinde ücret değişti',
      ]
        .filter(Boolean)
        .join(' · ') || 'Güncel ücretlerinizi Hesap ekranında görebilirsiniz.',
  }),
  iskonto: (d) => ({
    baslik: 'Yedek parça indiriminiz değişti',
    metin: `%${d.once ?? 0} → %${d.simdi ?? 0}. Yeni oran bundan sonraki siparişlerinizde geçerli.`,
  }),
  /* Bakiyeden ödemede ek indirim (24 Eylül 2026): oran bütün servislere
     tek, değişince hepsine gidiyor (veri.js → bakiyeIskontosunuKaydet).
     Talebe bağlı değil; dokununca Ücretlendirmeler açılıyor. */
  bakiyeIskonto: (d) => ({
    baslik: 'Bakiyeden ödemede ek indiriminiz değişti',
    metin: `%${d.once ?? 0} → %${d.simdi ?? 0}. Yeni oran, bundan sonra bakiyenizden ödeyeceğiniz siparişlerde geçerli.`,
  }),
}

const GENEL = () => ({ baslik: `PAKSAN bu taleple ilgili işlem yaptı`, metin: '' })

/* Serbest yazının sonundaki nokta: metin ardına kendi noktasını koyuyor,
   "Garanti süresi dolmuş.." çıkmasın. */
function cumleSonu(s) {
  return String(s).trim().replace(/[.!?…]+$/, '')
}

/** Bildirimin ekranda görünen başlığı ve açıklaması. */
export function bildirimYazisi(b) {
  return (METIN[b?.olay] || GENEL)(b?.degerler || {})
}

/* Müşterinin Connect'ten yaptığı işlemin olayları; geri kalanı PAKSAN'ın. */
const MUSTERI_OLAYLARI = new Set(['musteriEkledi', 'musteriSorunDevam', 'musteriIptal', 'musteriIptalIstedi'])

/** Bildirim müşterinin işleminden mi doğdu (PAKSAN'ınkinden değil)? */
export function musteridenMi(b) {
  return MUSTERI_OLAYLARI.has(b?.olay)
}

function okunanlar() {
  return new Set(load(OKUNAN, []))
}

export function okunduMu(id) {
  return okunanlar().has(id)
}

/** Okunmamış bildirimler, yeniden eskiye. */
export function okunmamislar(servisId) {
  const okunan = okunanlar()
  return servisBildirimleri(servisId).filter((b) => !okunan.has(b.id))
}

/** Bir talebin bütün bildirimleri, yeniden eskiye. */
export function talebinBildirimleri(servisId, talepId) {
  return servisBildirimleri(servisId).filter((b) => b.talepId === talepId)
}

/* Okundu sayılanlar depoda sınırsız birikmesin: en yeni 500 kimlik
   tutuluyor. Daha eskisi zaten listede aşağıda kalmış bir bildirim. */
export function okunduSay(kimlikler) {
  if (!kimlikler?.length) return
  const hepsi = [...new Set([...kimlikler, ...load(OKUNAN, [])])].slice(0, 500)
  save(OKUNAN, hepsi)
}

/* ==========================================================================
   DUYURULAR (24 Eylül 2026, bildirim geçmişi için buraya taşındı)

   PAKSAN'ın servise yönelik duyuruları ve uyarıları talep bildirimi
   değil, ayrı bir kayıt: hedeflemeye göre süzülüyor (lib/duyuruHedef.js)
   ve okunmuşluğu "Anladım" ile ayrı anahtarda tutuluyor. İşlerim onları
   kendi bölümünde, Bildirimler ekranı hepsini tek listede gösteriyor;
   iki ekran aynı süzgeci ve aynı anahtarı buradan okuyor.
   ========================================================================== */

export const GORULEN_DUYURU = 'gorulenDuyurularServis'

/** Servise gösterilen duyurular, yeniden eskiye. */
export function servisDuyurulari(oturum) {
  const baglam = servisDuyuruBaglami(oturum)
  return load('duyurular', [])
    .filter((d) => duyuruGecerliMi(d, baglam))
    .sort((a, b) => b.tarih - a.tarih)
}

export function gorulenDuyurular() {
  return new Set(load(GORULEN_DUYURU, []))
}

export function duyuruGorulduSay(kimlikler) {
  if (!kimlikler?.length) return
  save(GORULEN_DUYURU, [...new Set([...load(GORULEN_DUYURU, []), ...kimlikler])])
}

/** Üst çubuktaki sayı: okunmamış bildirimler ve duyurular. */
export function okunmamisSayisi(oturum) {
  const gorulen = gorulenDuyurular()
  return (
    okunmamislar(oturum?.servisId).length +
    servisDuyurulari(oturum).filter((d) => !gorulen.has(d.id)).length
  )
}
