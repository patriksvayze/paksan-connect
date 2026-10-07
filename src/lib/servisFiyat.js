/* ==========================================================================
   Servis parça fiyatı

   Liste fiyatından servisin ödeyeceği fiyatı çıkaran tek yer. Hesabın
   birden fazla ekranda tekrarlanması, bir gün birinin güncellenip
   diğerinin unutulması demek — fiyat hatasının bedeli yüksek.

   MAKİNE FİYATI ARTIK BURADA YOK

   Dosya bir zamanlar makine fiyatını da hesaplıyordu: liste fiyatı,
   satıcıya özel iskonto, kampanya, kâr. Makineyi satan tarafın
   paneli yok; servis makine almıyor, parça alıyor. Makine
   fiyat katmanı bu yüzden kaldırıldı.

   PARÇA FİYATINDA KDV YOK. Fiyatlar KDV hariç konuşuluyor. KDV yalnız
   siparişin toplamında giriyor (`siparisTutari`), o da `kdvTutari()`
   üzerinden — oranı ve "liste KDV hariç mi" kararını o biliyor.

   ARTIK PARÇA ADI DEĞİL, PARÇANIN KENDİSİ GİRİYOR

   Bu dosya bir dönem parça ADINA bakıp uydurma bir fiyat tablosundan
   fiyat buluyordu. O tablo 12 Eylül 2026'da kaldırıldı; fiyatın tek
   kaynağı PAKSAN'ın yedek parça kataloğu. Katalogdaki birincil anahtar
   `kod` (ad tekil değil), bu yüzden fonksiyon artık katalogdan gelen
   parça nesnesini alıyor. Eski hâli gerçek katalogun hiçbir parçasında
   çalışmıyordu: ada göre arama 538 parçanın tamamında boş dönüyordu.

   İSKONTO ARTIK BACKOFFICE'TEN (23 Eylül 2026, kullanıcının isteği:
   "Servislerimize genel veya servise özel iskonto uygulayabileceğimiz
   bir alan oluşturulmalı"). Oran kodda sabitti (%30,
   data/katalog/makineFiyat.js → PARCA_SERVIS_ISKONTO). O sabit artık
   yalnız BAŞLANGIÇ oranı: personel hiçbir oran yazmadıysa geçerli olan.
   Güncel oran Yedek Parça Kataloğu ekranından yazılıyor — bütün
   servislere tek oran, istenen servise ayrı oran (bkz. `iskontoCoz`).
   Depo işi backoffice/veri.js'te (parcaIskontosuGetir,
   genelIskontoyuKaydet, servisIskontosunuKaydet); bu dosya saf kalıyor.

   GEÇMİŞ SİPARİŞ DEĞİŞMİYOR. Oran siparişin fiyat görüntüsüne
   (`parcaFiyat.iskontoOrani`) sipariş anında yazılıyor; oran sonra
   değişse de verilmiş siparişin tutarı aynı kalıyor.

   SERVİS EKRANINDA "İSKONTO" YAZMIYOR: servis ekranlarında yasak terim
   (CLAUDE.md "Servis Panelinin Kullanıcısı"); Servisim "indirim" diyor.
   Kodda ve backoffice'te "iskonto".

   BAKİYEDEN ÖDEMEDE EK İSKONTO (24 Eylül 2026, kullanıcının isteği:
   "Servisim'de yedek parça siparişlerinde bakiyeden düşsün seçeneği ile
   yapılan siparişlerde ek indirim uygulayabilelim"). Servis siparişini
   cari bakiyesinden öderse PAKSAN parayı ayrıca tahsil etmiyor; bu
   oran servisi o yola çekmek için. Tek oran, bütün servislere: servise
   özel katman yok, çünkü amaç ödeme BİÇİMİNİ ödüllendirmek, servisi
   değil. Oran aynı depoda (`parcaIskontosu.bakiye`), aynı ekrandan
   (Yedek Parça Kataloğu → Servis iskontosu) yazılıyor.

   HESAP SIRASI: ek iskonto satır fiyatlarına girmiyor. Satırlar
   servisin iskontolu fiyatında kalıyor; ek iskonto siparişin KDV hariç
   ara toplamından tek satır olarak düşülüyor, KDV kalan tutardan
   hesaplanıyor (bkz. `siparisTutari`). Böylece sipariş ekranı, veri
   katmanı ve sınama aynı formülü okuyor — iki yerde yazılan formül bir
   gün ayrışır.

   Başlangıç oranı 0: personel bir oran yazana kadar özellik kapalı.
   `BAKIYE_EK_ISKONTO` yalnız başlangıç değeri, çalışırken
   değiştirilmez.
   ========================================================================== */

import { PARCA_SERVIS_ISKONTO } from '../data/katalog/makineFiyat.js'
import { kdvTutari } from '../data/katalog/para.js'

/* Bakiyeden ödemede ek iskontonun başlangıç oranı: kapalı. */
export const BAKIYE_EK_ISKONTO = 0

/* ONAYDA GÖRÜLEN TUTAR BAĞLAYICI (24 Eylül 2026, kullanıcının kararı:
   "sipariş verildiği zamanki tutar üzerinden ücretlendirilmeli müşteri
   veya servis").

   Servis onay penceresinde gördüğü tutarla sipariş verir ya da servis
   kaydını gönderir. PAKSAN iskontoyu ya da hizmet ücretini tam o
   sırada değiştirse de servisin onayladığı tutar geçer. Önce tersiydi:
   veri katmanı eski oranla gelen siparişi reddediyor, servis yeni
   tutarı görüp yeniden onaylıyordu; hak edişte ise ekranın gösterdiği
   ücret sessizce bugünküyle değiştiriliyordu.

   SINIR: ekranların tutarı okuduğu an (`fiyatZamani`, `ucretZamani`)
   en çok bu kadar eski olabilir. Daha eskisiyle gelen gönderim
   kaydedilmiyor, ekran yeni tutarı gösterip yeniden onay istiyor —
   sınır olmasaydı günlerce açık bırakılmış bir ekran eski indirimi
   süresiz taşırdı. Ekranlar tutarı onay penceresi açılırken yeniden
   okuyor; sınıra yalnız uzun süre açık bırakılan pencere takılıyor.

   Sunucuda istemcinin rakamına güvenilmez: karşılığı, onay penceresi
   açılırken sunucunun verdiği süreli fiyat teklifi (VT-TASARIM-EKLERI
   §9). */
export const ONAY_TUTAR_SURESI = 30 * 60 * 1000

/** Ekranın tutarı okuduğu an hâlâ geçerli mi? Zaman yoksa, bozuksa ya
 *  da ileri bir tarihse (bir dakikalık saat farkı dışında) hayır. */
export function onayTazeMi(zaman, simdi = Date.now()) {
  const z = Number(zaman)
  return Number.isFinite(z) && z > 0 && z <= simdi + 60 * 1000 && simdi - z <= ONAY_TUTAR_SURESI
}

/**
 * Bir yedek parçanın servis fiyatı.
 *
 * Katalogdaki `fiyat` tavsiye satış fiyatı; servisin ödediği onun
 * iskontolu hâli. Aradaki fark servisin garanti dışı işte kalan payı.
 *
 * @param {null|{kod: string, ad: string, fiyat: number}} parca
 *   `katalogGetir()` / `parcaBul()` sonucundan gelen parça.
 * @returns {null|{kod, ad, fiyat, tavsiye, alis, iskonto}}
 *   Parça yoksa ya da fiyatı sayı değilse null.
 */
export function parcaServisFiyati(parca, oran = PARCA_SERVIS_ISKONTO) {
  if (!parca || typeof parca.fiyat !== 'number' || !Number.isFinite(parca.fiyat)) {
    return null
  }
  const r = oranOku(oran) ?? PARCA_SERVIS_ISKONTO
  return {
    kod: parca.kod,
    ad: parca.ad,
    fiyat: parca.fiyat,
    tavsiye: parca.fiyat,
    alis: Math.round(parca.fiyat * (1 - r)),
    iskonto: r,
  }
}

/* İskonto oranı kesir olarak tutuluyor (0,3 = %30); ekranlar yüzde
   yazıyor. Yüzde tam sayı: "yüzde 27,5" gibi bir oran konuşulmuyor ve
   yarım yüzde tutarı liranın altına düşürüyor. En çok %90 — %100
   iskonto bedava parça demek, o bir iskonto değil garanti. */
export const ISKONTO_EN_COK = 0.9

/** 0,3 → 30. */
export function yuzdeYap(oran) {
  return Math.round((Number(oran) || 0) * 100)
}

/** Kesir ya da yüzde → kesir; anlamsızsa null. `yuzde` true ise 30 → 0,3. */
export function oranOku(deger, yuzde = false) {
  if (deger === null || deger === undefined || deger === '') return null
  const n = Number(String(deger).replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return null
  const kesir = Math.round(yuzde ? n : n * 100) / 100
  return kesir <= ISKONTO_EN_COK ? kesir : null
}

/**
 * Depodaki iskonto kaydını okunur biçime getirir. Hiç yazılmamışsa
 * başlangıç oranı (PARCA_SERVIS_ISKONTO).
 *
 * @returns {{genel: number, servisler: Object<string, number>, bakiye: number, guncelleme?: object}}
 */
export function iskontolariDuzenle(ham) {
  const servisler = {}
  for (const [servisId, oran] of Object.entries(ham?.servisler || {})) {
    const r = oranOku(oran)
    if (servisId && r !== null) servisler[servisId] = r
  }
  return {
    genel: oranOku(ham?.genel) ?? PARCA_SERVIS_ISKONTO,
    servisler,
    /* Bakiyeden ödemede ek iskonto; yazılmamışsa kapalı (0). */
    bakiye: oranOku(ham?.bakiye) ?? BAKIYE_EK_ISKONTO,
    ...(ham?.guncelleme ? { guncelleme: ham.guncelleme } : {}),
  }
}

/**
 * Bir servisin geçerli iskontosu: servise özel oran varsa o, yoksa genel.
 * @returns {{oran: number, kaynak: 'servis'|'genel'}}
 */
export function iskontoCoz(iskontolar, servisId) {
  const i = iskontolar || iskontolariDuzenle(null)
  const ozel = servisId ? i.servisler?.[servisId] : undefined
  return ozel !== undefined ? { oran: ozel, kaynak: 'servis' } : { oran: i.genel, kaynak: 'genel' }
}

/**
 * Bakiyeden ödemede ek iskonto oranı (kesir). Servise göre değişmiyor.
 * @returns {number}  0 ise ek iskonto yok
 */
export function bakiyeIskontosu(iskontolar) {
  return (iskontolar || iskontolariDuzenle(null)).bakiye ?? BAKIYE_EK_ISKONTO
}

/**
 * Siparişin tutarı — ek iskonto ve KDV dâhil. Sipariş ekranı, veri
 * katmanı ve sınama bu tek formülü kullanıyor.
 *
 * Ek iskonto yalnız ödeme bakiyeden ve oran sıfırdan büyükse var;
 * servisin iskontolu KDV hariç ara toplamından düşülüyor, KDV kalan
 * tutardan hesaplanıyor. Kuruş yok: tutarlar tam lira (bkz. paraYaz).
 *
 * @param {number} araToplamIskontolu  satır tutarlarının toplamı (servis
 *        iskontosu düşülmüş, KDV hariç)
 * @param {{odeme?: 'bakiye'|'fatura', bakiyeOrani?: number}} secim
 * @returns {{bakiyeIskontoOrani: number, bakiyeIskontoTutari: number,
 *            araToplam: number, kdv: number, toplam: number}}
 */
export function siparisTutari(araToplamIskontolu, { odeme, bakiyeOrani = 0 } = {}) {
  const taban = Number(araToplamIskontolu) || 0
  const oran = odeme === 'bakiye' ? oranOku(bakiyeOrani) ?? 0 : 0
  const bakiyeIskontoTutari = oran > 0 ? Math.round(taban * oran) : 0
  const araToplam = taban - bakiyeIskontoTutari
  const kdv = kdvTutari(araToplam)
  return { bakiyeIskontoOrani: oran, bakiyeIskontoTutari, araToplam, kdv, toplam: araToplam + kdv }
}

/* ==========================================================================
   SİPARİŞİN SEPETİ VE FİYAT GÖRÜNTÜSÜ — TEK GÖVDE (29 Eylül 2026)

   Servisim'in sipariş ekranı (servis/ekranlar/SiparisVer.jsx) seçilen
   parçalardan sepeti, sepetten toplamları, onaydan sonra da siparişe
   yazılacak fiyat görüntüsünü (`parcaFiyat`) kuruyordu; üçü de ekranın
   içindeydi. Servisim'in demo verisi (backoffice/demoSahne.js) siparişi
   aynı yoldan vermeli: kendi kopyasını yazsaydı ekranın hiç yazmayacağı
   bir kayıt üretebilirdi ("indirim" kartı `iskontoOrani` ve
   `listeToplam` olmadan çizilmiyor). Şimdi ikisi de bu üç işlevi
   çağırıyor. Depoya bakmıyorlar; oran, katalog ve parçalar çağırandan.
   ========================================================================== */

/**
 * Sepetin satırları: servisin ödediği fiyatla. Sıra verilen sıra;
 * adedi sıfır ya da eksi olan satır atılıyor.
 *
 * @param {Array<{kod: string, adet: number, parca: object|null}>} secim
 *   `parca` katalogdaki parça (lib/parcaKatalogu.js → parcaBul); yoksa null
 * @param {number} oran servisin geçerli iskonto oranı (kesir)
 */
export function sepetSatirlari(secim, oran) {
  const liste = []
  for (const { kod, adet: ham, parca } of secim || []) {
    const adet = Number(ham) || 0
    if (adet <= 0) continue
    const f = parcaServisFiyati(parca, oran)
    liste.push({
      kod,
      ad: parca?.ad || kod,
      grup: parca?.grup || null,
      gorsel: parca?.gorsel ?? null,
      adet,
      listeFiyati: f ? f.fiyat : null,
      birimFiyat: f ? f.alis : null,
      satirTutari: f ? f.alis * adet : null,
    })
  }
  return liste
}

/** Sepetin toplamları: iskontolu ara toplam, liste fiyatıyla toplam, fark
 *  ve fiyatı bulunamayan satır olup olmadığı. Ek indirim ve KDV burada
 *  değil: ödeme biçimine göre `siparisTutari`den geliyor. */
export function sepetToplami(satirlar) {
  let araToplam = 0
  let listeToplam = 0
  let eksik = false
  for (const k of satirlar || []) {
    if (k.satirTutari === null) eksik = true
    else {
      araToplam += k.satirTutari
      listeToplam += k.listeFiyati * k.adet
    }
  }
  return { araToplam, listeToplam, iskontoTutari: listeToplam - araToplam, eksik }
}

/**
 * Siparişe yazılan fiyat görüntüsü (`parcaFiyat`): sipariş anındaki
 * satırlar, katalog sürümü ve kaynağı, servisin onayda gördüğü oran ve
 * okuma anı, toplamlar. Tutarlar servisin ödediği iskontolu fiyattan.
 *
 * @param {{katalog: object|null, satirlar: Array, hesap: object,
 *          iskontoOrani: number, fiyatZamani: number|null}} girdi
 *   `hesap`: sepetToplami ile siparisTutari'nın birleşimi (seçilen ödeme
 *   biçimine göre)
 */
export function siparisGoruntusu({ katalog, satirlar, hesap, iskontoOrani, fiyatZamani }) {
  return {
    surum: katalog?.surum ?? null,
    kaynak: katalog?.kaynak || null,
    /* O günkü görselin dosya adı da satırda: katalog değişse de sipariş
       kendi resmini gösteriyor (bkz. lib/parcaKatalogu.js → fiyatGoruntusu). */
    satirlar: (satirlar || []).map((k) => ({
      kod: k.kod,
      ad: k.ad,
      gorsel: k.gorsel,
      adet: k.adet,
      listeFiyati: k.listeFiyati,
      birimFiyat: k.birimFiyat,
      tutar: k.satirTutari,
    })),
    /* İndirim, servisin onay penceresinde gördüğü oranla: oran sonra
       değişse de bu siparişin tutarı değişmiyor. Okunma anı da gidiyor;
       veri katmanı 30 dakikadan eski tutarı kabul etmiyor (onayTazeMi). */
    iskontoOrani,
    fiyatZamani,
    listeToplam: hesap.listeToplam,
    iskontoTutari: hesap.iskontoTutari,
    /* Bakiyeden ödemede ek indirim: yalnız uygulandıysa. Oran tutar
       sıfıra yuvarlansa da yazılıyor — siparişin hangi oranla verildiği
       kayıtta kalsın. `araToplam` ve `toplam` ek indirim düşülmüş. */
    ...(hesap.bakiyeIskontoOrani > 0
      ? {
          bakiyeIskontoOrani: hesap.bakiyeIskontoOrani,
          bakiyeIskontoTutari: hesap.bakiyeIskontoTutari,
        }
      : {}),
    araToplam: hesap.araToplam,
    kdv: hesap.kdv,
    toplam: hesap.toplam,
    eksikFiyat: hesap.eksik,
  }
}

/** Sipariş kaydına giden kalem satırları (veri.js → servisParcaSiparisi):
 *  talebi okuyan taraf parçayı adıyla değil koduyla buluyor. */
export function siparisKalemleri(satirlar) {
  return (satirlar || []).map((k) => ({
    kod: k.kod,
    ad: k.ad,
    adet: k.adet,
    birimFiyat: k.birimFiyat,
    satirTutari: k.satirTutari,
  }))
}

/**
 * "Bakiyem" (30 Eylül 2026'ya kadar "Bakiyemden Düşülsün") ödeme
 * seçeneği bu sipariş için neden kapalı: kullanılabilir
 * bakiye tutara yetmiyor (25 Eylül 2026, kullanıcı sınaması).
 *
 * Seçenek bakiye yetmeyince pasif kalıyor, neden kapalı olduğu hiçbir
 * yerde yazmıyordu; servis bakiyesini genel toplamla kendisi
 * karşılaştırmak zorundaydı (ek indirim varsa bakiye ek indirimli
 * toplamla kıyaslanıyor, ekrandaki genel toplam ise faturalı toplam).
 * Servisim seçeneğin altında tek cümle yazıyor; cümlenin çıkıp
 * çıkmayacağı buradan. Tutarı olmayan (fiyatı bulunmayan parçalı)
 * sepette cümle çıkmıyor: orada kapalılığın nedeni bakiye değil.
 *
 * Veri katmanının reddiyle aynı kural (backoffice/veri.js →
 * servisParcaSiparisi: bakiyeden ödenen siparişin KDV dâhil tutarı
 * kullanılabilir bakiyeden büyükse sipariş kaydedilmiyor); ekran
 * seçeneği kapattığı sürece o ret hiç görülmüyor.
 *
 * @param {number} kullanilabilir servisin kullanılabilir bakiyesi
 *        (veri.js → bakiyeDurumu: gönderilmeyi bekleyen siparişler ayrılmış)
 * @param {number} toplam bakiyeden ödemenin tutarı — ek indirim
 *        düşülmüş, KDV dâhil (siparisTutari(…, { odeme: 'bakiye' }).toplam)
 */
export function bakiyeYetmiyor(kullanilabilir, toplam) {
  const t = Number(toplam) || 0
  return t > 0 && (Number(kullanilabilir) || 0) < t
}

/**
 * Siparişin gönderilen satırlarının KDV dâhil tutarı — kısmi gönderimde
 * bakiyeden düşülecek rakam (24 Eylül 2026, kullanıcının kararı: eksik
 * gönderilen siparişte bakiyeden yalnız gönderilen parçalar düşülür).
 *
 * Fiyatlar siparişin kendi görüntüsünden: satırın sipariş anındaki
 * tutarı, siparişin ek iskonto oranı. Fiyatlı satırların HEPSİ
 * gönderildiyse siparişin kendi toplamı dönüyor, yeniden
 * hesaplanmıyor: iki gönderime bölünen siparişte düşülenlerin toplamı
 * siparişin toplamına kuruşu kuruşuna eşit kalsın (ikinci gönderim
 * "toplam − önce düşülen" olarak yazılıyor, bkz. veri.js →
 * siparisBorcunuYaz). Fiyatı olmayan satır tutara girmiyor.
 *
 * @param {object} parcaFiyat  siparişin fiyat görüntüsü
 * @param {number[]} satirlar  gönderilen satırların sırası (0'dan)
 * @param {'bakiye'|'fatura'} odeme
 */
export function gonderilenTutar(parcaFiyat, satirlar, odeme) {
  const hepsi = Array.isArray(parcaFiyat?.satirlar) ? parcaFiyat.satirlar : []
  const secili = new Set(satirlar || [])
  const fiyatli = hepsi
    .map((s, i) => ({ i, tutar: s?.tutar }))
    .filter((x) => typeof x.tutar === 'number' && Number.isFinite(x.tutar))
  if (fiyatli.length && fiyatli.every((x) => secili.has(x.i))) return Number(parcaFiyat.toplam) || 0
  const ara = fiyatli.filter((x) => secili.has(x.i)).reduce((t, x) => t + x.tutar, 0)
  if (!ara) return 0
  return siparisTutari(ara, { odeme, bakiyeOrani: Number(parcaFiyat?.bakiyeIskontoOrani) || 0 }).toplam
}

/**
 * Servis siparişinin TUTARI: KDV dâhil, ek iskonto düşülmüş — servisin
 * ödediği rakam. Bakiyeden düşülen de faturaya yazılan da bu.
 *
 * EKRANLAR BU RAKAMI GÖSTERİYOR (24 Eylül 2026, kullanıcının bildirdiği
 * hata). Servisim'in sipariş listesi ve backoffice'in "Sipariş tutarı"
 * satırı kaydın `tutar` alanını, yani KDV HARİÇ ara toplamı
 * gösteriyordu; hak edişten düşülen ise KDV dâhil tutardı. İki ekran
 * birbiriyle tutuyor, bakiyeden düşen rakam ikisinden de %20 fazla
 * görünüyordu ve hiçbir yerde "KDV hariç" yazmıyordu. Artık tutar
 * gösteren her yer bu işlevi çağırıyor; KDV hariç rakam yalnız
 * dökümün "Ara toplam" satırında, adıyla görünüyor.
 *
 * Eski kayıtta görüntü yok: önce `tutarKdvli`, o da yoksa `tutar`.
 */
export function siparisToplami(talep) {
  return (
    Number(talep?.parcaFiyat?.toplam) || Number(talep?.tutarKdvli) || Number(talep?.tutar) || 0
  )
}

/** Siparişten iptal edilen satırların sırası (0'dan), tekrarsız. */
export function iptalEdilenSatirlar(talep) {
  const iptaller = Array.isArray(talep?.kalemIptalleri) ? talep.kalemIptalleri : []
  return [...new Set(iptaller.flatMap((k) => k?.satirlar || []))].sort((a, b) => a - b)
}

/**
 * Siparişin iptal edilen kalemler çıktıktan sonraki tutarı, KDV dâhil
 * (24 Eylül 2026, "Kalan Parçaları İptal Et").
 *
 * PAKSAN gönderemeyeceği bekleyen parçayı siparişten çıkarınca servis o
 * parçanın parasını ödemiyor. Ekranlar siparişin ilk tutarını
 * (siparisToplami) ve iptal edilen payı ayrı ayrı gösteriyor; servisin
 * ödeyeceği bu rakam. Hesap gonderilenTutar'ın aynısı — kalan satırlar,
 * siparişin kendi fiyatları ve ek iskontosu — böylece bütün kalan
 * gönderildiğinde bakiyeden düşülenlerin toplamı bu rakama kuruşu
 * kuruşuna eşit çıkıyor (veri.js → siparisBorcunuYaz aynı işlevi
 * çağırıyor). İptal yoksa siparişin kendi toplamı.
 */
export function siparisNetTutari(talep) {
  const iptal = new Set(iptalEdilenSatirlar(talep))
  const satirlar = talep?.parcaFiyat?.satirlar
  if (!iptal.size || !Array.isArray(satirlar)) return siparisToplami(talep)
  const kalan = satirlar.map((_, i) => i).filter((i) => !iptal.has(i))
  return gonderilenTutar(talep.parcaFiyat, kalan, talep.odeme)
}
