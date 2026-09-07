/* ==========================================================================
   Bayi teklifi

   NEDEN VAR

   Bayinin günlük işi: dükkâna gelen ya da telefonla arayan çiftçinin
   "bu makine kaça?" sorusunu yanıtlamak, fiyat teklifi vermek.
   Bugüne kadar bu iş uygulamanın dışında yürüyordu — bayi kâğıda
   yazıyor, WhatsApp'tan mesaj atıyor, sonra ikisi de kayboluyordu.

   Kaybolan yalnız kâğıt değil:

     · Bayi kime ne fiyat verdiğini bir hafta sonra hatırlamıyor
     · Verilen teklifin süresi dolduğunda kimse geri dönmüyor
     · PAKSAN hangi modelin kaç kez teklif edilip kaç kez satıldığını
       hiçbir yerde göremiyor

   Üçüncüsü PAKSAN için en değerlisi: teklif–satış oranı, bugün
   hiçbir yerde toplanmayan pazar verisi.

   FİYATI BAYİ BELİRLİYOR

   Ekran liste fiyatını öneriyor ama kilitlemiyor. Bayi müşteriye
   indirim yapabilir; yaptığında kendi kârından veriyor ve ekran o
   kârdan ne kaldığını anında gösteriyor. Bayinin pazarlık sırasında
   ihtiyaç duyduğu tek sayı bu.

   ALIŞ FİYATI TEKLİFE YAZILIYOR — ama müşteriye gitmiyor.
   Fiyat listesi sonradan değiştiğinde "bu teklifi hangi maliyetle
   verdim" sorusunun cevabı kalsın diye. Paylaşılan metinde yalnız
   müşteri fiyatı var.

   GEÇERLİLİK SÜRESİ ZORUNLU

   Süresiz teklif, bir yıl sonra "sen bana şu fiyatı vermiştin"
   tartışması demek. Varsayılan 15 gün; bayi değiştirebiliyor.
   ========================================================================== */

import { load, save, uid } from './storage.js'
import { KDV_ORANI } from '../marka'

const ANAHTAR = 'bayiTeklif'

/** Varsayılan geçerlilik süresi. */
export const TEKLIF_GUN = 15

/* Kapanış sonuçları. `satis` dışındakiler de kayda geçiyor: PAKSAN'ın
   öğrenmek istediği şey satılanlar kadar satılamayanlar. */
export const TEKLIF_SONUC = {
  satis: { ad: 'Satış Oldu', ton: 'yesil' },
  vazgecti: { ad: 'Müşteri Vazgeçti', ton: 'gri' },
  rakip: { ad: 'Rakibe Gitti', ton: 'kirmizi' },
}

/* Numara talep numarasıyla aynı kalıpta: ÖNEK + YYAAGG + 4 hane.
   Önek `TKL`; müşteri uygulamasından gelen fiyat teklifi talebi `TKF`
   ve ikisi ayrı şeyler — biri müşterinin sorusu, biri bayinin cevabı. */
export function teklifNo() {
  const d = new Date()
  const iki = (n) => String(n).padStart(2, '0')
  const tarih = `${iki(d.getFullYear() % 100)}${iki(d.getMonth() + 1)}${iki(d.getDate())}`
  return 'TKL' + tarih + String(Math.floor(1000 + Math.random() * 9000))
}

export function teklifleriGetir() {
  return load(ANAHTAR, []).sort((a, b) => b.tarih - a.tarih)
}

export function bayininTeklifleri(bayiId) {
  return teklifleriGetir().filter((t) => t.bayiId === bayiId)
}

/** Kalemlerden toplamı çıkarır. Müşteriye giden rakamlar bunlar. */
export function teklifToplami(kalemler = []) {
  const araToplam = kalemler.reduce(
    (t, k) => t + (Number(k.birimFiyat) || 0) * (Number(k.adet) || 0),
    0,
  )
  const kdv = Math.round(araToplam * KDV_ORANI)
  return { araToplam, kdv, toplam: araToplam + kdv }
}

/** Bayinin bu teklifteki kârı. Müşteriye gitmiyor, ekranda duruyor. */
export function teklifKari(kalemler = []) {
  return kalemler.reduce(
    (t, k) =>
      t +
      ((Number(k.birimFiyat) || 0) - (Number(k.alisFiyat) || 0)) *
        (Number(k.adet) || 0),
    0,
  )
}

/**
 * Teklif açar.
 * @param {{bayiId, bayiAd, bayiNo, musteriId, ad, tel, il, ilce,
 *          kalemler, not, gecerlilikGun}} veri
 *        kalemler: [{ urunId, ad, adet, birimFiyat, listeFiyat, alisFiyat }]
 */
export function teklifAc(veri) {
  const kalemler = (veri.kalemler || []).filter((k) => Number(k.adet) > 0)
  if (!kalemler.length) return { hata: 'En az bir ürün seçin.' }
  if (!String(veri.ad || '').trim()) return { hata: 'Müşterinin adını yazın.' }

  const gun = Number(veri.gecerlilikGun) || TEKLIF_GUN
  const simdi = Date.now()
  const hesap = teklifToplami(kalemler)

  const teklif = {
    id: uid(),
    no: teklifNo(),
    bayiId: veri.bayiId,
    bayiAd: veri.bayiAd,
    bayiNo: veri.bayiNo,
    musteriId: veri.musteriId || null,
    ad: String(veri.ad).trim(),
    tel: String(veri.tel || '').trim(),
    il: veri.il || '',
    ilce: veri.ilce || '',
    kalemler: kalemler.map((k) => ({ ...k, adet: Number(k.adet) })),
    ...hesap,
    kar: teklifKari(kalemler),
    not: String(veri.not || '').trim(),
    tarih: simdi,
    gecerlilik: simdi + gun * 86400000,
    durum: 'acik',
    kapanis: null,
  }

  save(ANAHTAR, [teklif, ...load(ANAHTAR, [])])
  return { teklif }
}

/** Teklifi sonuçlandırır. Kapanan teklif tekrar açılmıyor. */
export function teklifKapat(teklifId, sonuc, kim, not) {
  if (!TEKLIF_SONUC[sonuc]) return { hata: 'Sonuç seçin.' }

  const liste = load(ANAHTAR, [])
  const t = liste.find((x) => x.id === teklifId)
  if (!t) return { hata: 'Teklif bulunamadı.' }
  if (t.durum !== 'acik') return { hata: 'Bu teklif zaten kapandı.' }

  const guncel = {
    ...t,
    durum: sonuc,
    kapanis: { tarih: Date.now(), kim, not: String(not || '').trim() },
  }
  save(
    ANAHTAR,
    liste.map((x) => (x.id === teklifId ? guncel : x)),
  )
  return { teklif: guncel }
}

/* Teklifin müşteriye gönderildiği an kaydediliyor: bayi listeye
   baktığında hangi teklifi yolladığını, hangisini hazırlayıp
   unuttuğunu görüyor. Kanal da yazılıyor — kayıtlı müşteriye SMS'in
   yanında uygulama bildirimi de gidiyor. */
export function teklifGonderildi(teklifId, kanallar) {
  const liste = load(ANAHTAR, [])
  const t = liste.find((x) => x.id === teklifId)
  if (!t) return { hata: 'Teklif bulunamadı.' }

  const guncel = { ...t, gonderim: { tarih: Date.now(), kanallar } }
  save(
    ANAHTAR,
    liste.map((x) => (x.id === teklifId ? guncel : x)),
  )
  return { teklif: guncel }
}

/** Süresinin bitmesine kaç gün kaldı; geçtiyse negatif. */
export function kalanGun(teklif, simdi = Date.now()) {
  return Math.ceil((teklif.gecerlilik - simdi) / 86400000)
}

export function acikMi(teklif) {
  return teklif.durum === 'acik'
}

/** Açık ama süresi dolmuş. Kapanmıyor — bayi ne olduğunu yazmalı. */
export function suresiDoldu(teklif, simdi = Date.now()) {
  return acikMi(teklif) && teklif.gecerlilik < simdi
}

/* Süresi bu kadar gün içinde dolacak teklifler ana ekranda
   hatırlatılıyor. Üç gün: müşteriyi arayıp "hâlâ düşünüyor musunuz"
   demeye yetecek kadar erken, her gün ekranı doldurmayacak kadar geç. */
export const HATIRLATMA_GUN = 3

export function hatirlatilacaklar(bayiId, simdi = Date.now()) {
  return bayininTeklifleri(bayiId).filter(
    (t) => acikMi(t) && kalanGun(t, simdi) <= HATIRLATMA_GUN,
  )
}

/* ==========================================================================
   Müşteriye gidecek metin

   KANAL SMS

   Önce WhatsApp bağlantısı üretiliyordu. WhatsApp herkeste yok ve
   olmayana hiç ulaşmıyor; numarası olan herkeste SMS var. Teklif bir
   ticari belge — "ulaşmamış olabilir" ihtimali taşıyamaz.

   Uygulaması olan müşteri ayrıca kendi bildirim ekranından da görüyor;
   bildirimi ekran oluşturuyor (bkz. ekranlar/Teklif.jsx), bu dosya yalnız metni
   üretiyor.

   METİN KISA VE TÜRKÇE HARFSİZ

   İkisi de SMS'in kendi kuralından: bir SMS 160 karakter, ama içinde
   tek bir Türkçe harf varsa mesaj 70 karakterlik parçalara bölünüyor.
   Aynı teklif 1 SMS yerine 5 SMS oluyor ve parasını bayi ödüyor.
   Türkçe ticari SMS'in yerleşik uygulaması da bu.

   Kalemler tek tek yazılmıyor: iki kalemden sonrası sayıya iniyor.
   Müşterinin SMS'te aradığı iki şey var — toplam tutar ve son gün.
   Ayrıntı bayiyi aradığında konuşuluyor.

   ALIŞ FİYATI VE KÂR BU METİNDE YOK. Müşteriye yalnız kendi
   ödeyeceği rakam gidiyor.
   ========================================================================== */

function tarihYaz(t) {
  return new Date(t).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function sayiYaz(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/* Türkçe harfleri karşılıklarına indiriyor. Tek amacı SMS'i tek
   parçada tutmak; ekrandaki yazılara uygulanmıyor. */
const TR_ASCII = {
  ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I',
  ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U',
}

export function smsHarfi(metin) {
  return String(metin || '').replace(/[çÇğĞıİöÖşŞüÜ]/g, (h) => TR_ASCII[h])
}

/** Teklifin SMS ile gönderilecek hâli. */
export function teklifSms(teklif, bayi) {
  const kalemler = teklif.kalemler
    .slice(0, 2)
    .map((k) => `${k.ad} x${k.adet}`)
  const kalan = teklif.kalemler.length - kalemler.length
  if (kalan > 0) kalemler.push(`ve ${kalan} kalem daha`)

  const parcalar = [
    teklif.bayiAd,
    `Fiyat teklifi ${teklif.no}`,
    kalemler.join(', '),
    `Toplam: ${sayiYaz(teklif.toplam)} TL (KDV dahil)`,
    `Son gun: ${tarihYaz(teklif.gecerlilik)}`,
  ]

  if (bayi?.telYazi) parcalar.push(`Bilgi: ${bayi.telYazi}`)

  return smsHarfi(parcalar.join('\n'))
}

/* Kaç SMS olarak gideceği. Bayi düğmeye basmadan önce görüyor:
   ücretini o ödüyor. Türkçe harf kalmadığı için 160'lık sayım
   geçerli; çok parçalı mesajda parça başına 153 karakter kalıyor. */
export function smsAdedi(metin) {
  const n = String(metin || '').length
  return n <= 160 ? 1 : Math.ceil(n / 153)
}
