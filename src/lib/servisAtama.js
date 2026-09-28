/* ==========================================================================
   MÜŞTERİNİN SERVİSİ KİM

   Bu dosya tek bir soruya cevap veriyor ve o soruyu cevaplayan başka
   yer yok: bir makineye — dolayısıyla o makinenin sahibine — hangi
   servis bakıyor?

   NEDEN COĞRAFYA DEĞİL

   Eskiden müşteri talep açtığı anda sistem, ilinden ilçesinden bir
   servis buluyor ve talebi ona düşürüyordu. Bu yanlıştı: servis işini
   bayiye değil PAKSAN'a raporluyor ve hak edişini PAKSAN'dan alıyor.
   Kime iş verdiğini bilmeyen bir taraf, o işin parasını ödeyemez.

   Bugün zincir şu ve ikisi de bir KAYDA dayanıyor, tahmine değil:

     1. Makineye doğrudan atanmış servis
        Personel backoffice'ten seçti ya da LOGO'dan geldi.

     2. Makineyi satan bayinin çalıştığı servis
        Bayilerin çoğunun kendi servisi yok; anlaştıkları servise
        yönlendiriyorlar. Bağ servis kaydında duruyor
        (bkz. marka/katalog/servisler.js → bayiler).

   İkisi de boşsa cevap YOK. Uydurulmuş bir servis, servissizlikten
   kötü: müşteri yanlış kapıyı çalar, servis kendisine düşen işi
   tanımaz, PAKSAN kimin hak ettiğini bilemez.

   CEVAP YOKSA NE OLUYOR

   Müşteri servis talebi açamıyor; uygulama servisin henüz atanmadığını
   ve PAKSAN'ın en kısa sürede atayacağını söylüyor (bkz.
   screens/RequestForm.jsx). Bu bir eksiklik değil, kasıtlı bir kapı:
   atama PAKSAN'ın kararı. Sözü tutan backoffice'teki Kayıtlı Makineler
   ekranı: yan menüdeki sayı servisi olmayan makineleri sayıyor
   (servisiAtanmamisKayitlar), atama o ekrandan yapılıyor.

   ATAMA MAKİNE BAŞINA, MÜŞTERİ BAŞINA DEĞİL (21 Eylül 2026, kullanıcının
   kararı): "Her servis her makine üzerinde uzman sayılamaz. Müşteri 1
   adet yem karma ve 1 adet balya makinesine sahip olabilir ve bunlar
   ile aynı servis ilgilenemeyebilir." Aynı gün Müşteriler ekranına
   müşteri başına bir atama yeri ve müşteri sayacı eklenmiş, sonra geri
   alınmıştı.
   ========================================================================== */

import { bayininServisleri, servisGetir, bayiGetir } from '../marka'
import { makineKayitlari, seriSatiri } from './makineKaydi'
import { normalizeSerial } from './serial'

/* Seri numarasının kayıt defterindeki satırı.

   DEFTER TEK YERDEN OKUNUYOR (21 Eylül 2026): lib/makineKaydi.js →
   seriSatiri. Burada bir dönem deftere doğrudan bakılıyordu ve aynı
   serinin kopyaları arasından en yenisi seçiliyordu; müşteri makinesini
   silip yeniden ekleyince o en yeni kopya servissizdi ve PAKSAN'ın
   atadığı servis kayboluyordu. Artık bir seriye tek satır düşüyor.

   NORMALİZE EDİLEREK ARANIYOR. Defter seriyi GELDİĞİ GİBİ saklıyor
   (`seri: makine.serial`). Burada bir dönem yalnız `.trim()` vardı —
   tek defteri iki ayrı kuralla okuyan iki dosya. Sonucu ölçüldü:
   `ORK1270-2024-00157` servise bağlanıyor, `ork1270-2024-00157` null
   dönüyor ve o müşteri servis talebi AÇAMIYORDU. `seriSatiri` büyük
   harfe çeviriyor, harf ve rakam dışındaki her şeyi atıyor. */
export function makineninKaydi(seri) {
  return seriSatiri(seri)
}

/**
 * Bir makineye bakan servis.
 *
 * @param {{serial?: string}|string} makine makine nesnesi ya da seri numarası
 * @returns {null|{servis: object, kaynak: 'atama'|'bayi', bayi: object|null}}
 */
export function makineninServisi(makine) {
  const seri = typeof makine === 'string' ? makine : makine?.serial
  return kaydinServisi(makineninKaydi(seri))
}

/**
 * Kayıt defterindeki bir satırın servisi. Müşterinin tarafı
 * (makineninServisi) ve backoffice'in Kayıtlı Makineler ekranı aynı
 * işlevden okuyor; iki ayrı kural olsaydı biri "atanmış" derken öteki
 * "atanmamış" derdi.
 *
 * @returns {null|{servis: object, kaynak: 'atama'|'bayi', bayi: object|null}}
 */
export function kaydinServisi(kayit) {
  if (!kayit) return null

  const bayi = bayiGetir(kayit.bayiId)

  /* 1. Elle atanmış servis: personel bilerek atadı. */
  const atanan = servisGetir(kayit.servisId)
  if (atanan) return { servis: atanan, kaynak: 'atama', bayi }

  /* 2. Bayinin servisi. Birden çoksa ilki; hangisinin asıl olduğu
     bugün kayıtta yok (bkz. plan → açık uçlar). */
  const bayidenler = bayininServisleri(kayit.bayiId)
  if (bayidenler.length) return { servis: bayidenler[0], kaynak: 'bayi', bayi }

  return null
}

/**
 * Müşterinin servisi — makinelerinden çıkarılıyor.
 *
 * Birden çok makinesi varsa ve hepsine aynı servis bakıyorsa cevap
 * tek. Farklı servisler çıkıyorsa `hepsi` dolu dönüyor ve ekran
 * hangisinin hangi makineye baktığını gösterebiliyor.
 *
 * @returns {{ana: object|null, hepsi: Array<{makine, servis, kaynak, bayi}>}}
 */
export function musterininServisleri(makineler = []) {
  const hepsi = []
  for (const m of makineler) {
    const bulunan = makineninServisi(m)
    if (bulunan) hepsi.push({ makine: m, ...bulunan })
  }
  return { ana: hepsi[0]?.servis || null, hepsi }
}

/**
 * Müşterinin makineleri, onlara bakan servise göre gruplanmış.
 *
 * ATAMA MAKİNE BAŞINA (21 Eylül 2026, kullanıcının kararı): aynı
 * müşterinin iki makinesine iki ayrı servis bakabiliyor. Connect bir
 * süre yalnız `musterininServisleri().ana`yı — İLK bulunan servisi —
 * gösterdi; ikinci servis ekranda hiç çıkmadı, "Servisim" sayısı hep 1
 * dedi (22 Eylül 2026, kullanıcı ekran görüntüsüyle bildirdi). Ana
 * ekran ve talep formu artık bu gruplamadan okuyor: her servis kendi
 * kartında, hangi makineye baktığıyla; servisi olmayan makineler ayrı.
 *
 * @returns {{gruplar: Array<{servis: object, makineler: Array}>, atanmamis: Array}}
 */
export function servisGruplari(makineler = []) {
  const gruplar = []
  const atanmamis = []
  for (const m of makineler) {
    const servis = makineninServisi(m)?.servis
    if (!servis) {
      atanmamis.push(m)
      continue
    }
    const grup = gruplar.find((g) => g.servis.id === servis.id)
    if (grup) grup.makineler.push(m)
    else gruplar.push({ servis, makineler: [m] })
  }
  return { gruplar, atanmamis }
}

/** Müşteri servis talebi açabilir mi? */
export function servisTalebiAcilabilirMi(makineler = []) {
  return Boolean(musterininServisleri(makineler).ana)
}

/**
 * Servisi olmayan kayıt satırları: ne elle atanmış servisi var ne de
 * satan bayinin servisi. Backoffice'in yan menüsündeki Kayıtlı Makineler
 * sayısı ve o ekrandaki uyarı kartı bu listeyi sayıyor — ikisi aynı
 * sayıyı göstermeli.
 *
 * @param {Array<object>} kayitlar makineKayitlariGetir() çıktısı
 */
export function servisiAtanmamisKayitlar(kayitlar = []) {
  return kayitlar.filter((k) => !kaydinServisi(k))
}

/* ==========================================================================
   DUYURU HEDEFLEMESİ İÇİN (23 Eylül 2026)

   Duyuru bölgeye, makineye ve servise özel gönderilebiliyor
   (lib/duyuruHedef.js). O dosya saf, hiçbir şey içe aktarmıyor; "bu
   makineye kim bakıyor" sorusunun cevabını buradan alıyor. Servis
   seçilmiş bir duyuruyu müşteri, makinesine o servis bakıyorsa görüyor;
   makine seçilmiş bir duyuruyu servis, o makineye bakıyorsa görüyor.
   İkisi de bu dosyadaki zincirle: coğrafyaya değil, kayda bakarak.
   ========================================================================== */

/** Müşterinin makineleri, her birine bakan servisin kimliğiyle. */
export function makinelereServisEkle(makineler = []) {
  return makineler.map((m) => ({ ...m, servisId: makineninServisi(m)?.servis?.id || null }))
}

/** Bir servisin baktığı makineler — kayıt defterinden, duyurunun okuduğu biçimde. */
export function servisinMakineleri(servisId, kayitlar = makineKayitlari()) {
  if (!servisId) return []
  return kayitlar
    .filter((k) => kaydinServisi(k)?.servis?.id === servisId)
    .map((k) => ({ serial: k.seri, productId: k.productId, servisId }))
}

/**
 * Servisim'in duyuru süzgecine verdiği bağlam: oturum, servisin hizmet
 * verdiği iller (servis kaydındaki bölge) ve baktığı makineler.
 */
export function servisDuyuruBaglami(oturum) {
  if (!oturum) return { servis: null }
  const kayit = servisGetir(oturum.servisId)
  const iller = (kayit?.bolge || []).map((b) => b.il).filter(Boolean)
  return {
    servis: { ...oturum, il: oturum.il || kayit?.il, iller },
    makineler: servisinMakineleri(oturum.servisId),
  }
}

/* ==========================================================================
   SERVİSİN ELLE AÇTIĞI İŞ MAKİNENİN SERVİSİNDE DEĞİLSE
   (25 Eylül 2026, kullanıcı sınaması Y5; kullanıcının kararı: "uyar,
   engelleme")

   Servisim'in Kayıt Aç ekranı işi her zaman açan servisin adına
   yazıyor ve makinenin servisine hiç bakmıyordu. Makine başka servise
   atanmışsa ya da hiç servisi yoksa ne servis uyarılıyor ne de
   backoffice işaretliyordu; hak edişi onaylayan personel PAKSAN'ın o
   makineye kimi atadığını göremiyordu.

   İş yine açan serviste kalıyor ve açılabiliyor: servis tarlada,
   müşterinin yanında; kapıyı kapatmak müşteriyi servissiz bırakır.
   Talebe açıldığı ANIN durumu yazılıyor (`atamaDisi`, bkz.
   lib/elleTalep.js) ve hak edişi onaylayan personel onu görüyor.
   İşaret her okumada bugünkü atamadan hesaplanmıyor: PAKSAN makineyi
   sonradan atarsa bugünden hesaplanan işaret, işin alındığı andaki
   durumu, yani kanıtı silerdi. Bugünkü servis ayrıca okunuyor
   (makineninKendiServisiMi).
   ========================================================================== */

/**
 * Servisin elle açtığı işte makinenin ataması.
 *
 * @param {{serial?: string}} makine
 * @param {string} servisId işi açan servis
 * @returns {null|{durum: 'baskaServis'|'atanmamis'|'seriYok', servisId: string|null,
 *   servisAd: string, kaynak: 'atama'|'bayi'|null}}
 *   null: çelişki yok (makineye bu servis bakıyor) ya da makine yok
 */
export function elleIsinAtamasi(makine, servisId) {
  if (!makine) return null
  /* Serisiz makinenin servisi denetlenemiyor; "atanmamış" demek
     uydurma olurdu. Durum ayrı adla yazılıyor. */
  if (!normalizeSerial(makine.serial)) return { durum: 'seriYok', servisId: null, servisAd: '', kaynak: null }
  const bulunan = makineninServisi(makine)
  if (!bulunan) return { durum: 'atanmamis', servisId: null, servisAd: '', kaynak: null }
  if (bulunan.servis.id === servisId) return null
  return { durum: 'baskaServis', servisId: bulunan.servis.id, servisAd: bulunan.servis.ad, kaynak: bulunan.kaynak }
}

/**
 * Talebi yürüten servis makinenin BUGÜNKÜ servisi mi? Connect'in talep
 * ayrıntısı düğmenin adını buna göre seçiyor: işi yürüten servis
 * makineye bakan servis değilse ona "Servisiniz" demiyor. Servissiz
 * talepte true (söylenecek bir çelişki yok).
 */
export function makineninKendiServisiMi(talep) {
  if (!talep?.servis?.id) return true
  return makineninServisi(talep.makine)?.servis?.id === talep.servis.id
}
