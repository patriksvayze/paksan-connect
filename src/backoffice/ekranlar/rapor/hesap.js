/* ==========================================================================
   Raporların ortak hesapları

   Her rapor bölümü (bkz. rapor/bolumler/) bu dosyadaki okuyucularla
   çalışıyor. Aynı soru ("talep ne zaman kapandı", "bu iş garanti mi")
   iki bölümde iki ayrı yoldan cevaplanırsa iki sekme aynı dönem için
   iki farklı sayı gösterir ve yönetici ikisine de güvenmez.

   UYDURMA SAYI YOK. Hesaplanamayan değer `null` döner ve ekranda "—"
   yazar; sıfırla doldurulmaz. Ortalama, hiç ölçüsü olmayan kaydı
   paydaya katmaz.
   ========================================================================== */

import { araligiCoz } from '../suzgec'
import { getProduct, paraYaz } from '../../../marka'

export const SAAT = 3600000
export const GUN = 86400000

/* Grafik renkleri — backoffice.css → --grafik-1/2/3 ve --grafik-notr.

   Bir grafikte EN ÇOK ÜÇ renkli seri var. Dördüncüsü "diğer" olarak
   nötr gri alıyor. Renkler renk körlüğü denetiminden geçirildi
   (dataviz doğrulayıcısı, aydınlık ve karanlık yüzeyde ayrı ayrı);
   talep türlerinin rozet renkleri (--tur-*) bu denetimden geçmiyor —
   parça moru ile satış mavisi kırmızı-yeşil renk körlüğünde aynı
   görünüyor. Bu yüzden türler grafikte renkle değil, her türün kendi
   başlıklı küçük grafiğiyle ayrılıyor. */
export const RENK = {
  bir: 'var(--grafik-1)',
  iki: 'var(--grafik-2)',
  uc: 'var(--grafik-3)',
  notr: 'var(--grafik-notr)',
}

/* --------------------------------------------------------------- Sayı */

export function ortalama(dizi) {
  const gecerli = dizi.filter((x) => x !== null && x !== undefined && !Number.isNaN(x))
  if (!gecerli.length) return null
  return gecerli.reduce((a, b) => a + b, 0) / gecerli.length
}

/* Yüzdelik dilim — ortalamanın sakladığı kuyruğu gösteriyor.
   "Ortalama 19 saat" iyi görünür ama işlerin onda biri dokuz gün
   bekliyorsa o dokuz gün müşteri kaybıdır; p90 onu gösteriyor.

   SIRA CEIL İLE SEÇİLİYOR (17 Eylül 2026). İndis `floor(n × oran)`
   iken, n onun katı olduğu dönemlerde bir sıra fazlaya denk geliyor ve
   p90 yerine listenin EN BÜYÜK değeri dönüyordu: 1–10 saatte kapanan
   tam on talepte ekran "en yavaş %10: 10 sa" yazıyordu, doğrusu 9 sa.
   Yüzdelik dilimin sıra karşılığı ceil(oran × n), indis de bir eksiği. */
export function dilim(dizi, oran) {
  const gecerli = dizi.filter((x) => x !== null && x !== undefined && !Number.isNaN(x)).sort((a, b) => a - b)
  if (!gecerli.length) return null
  const i = Math.min(gecerli.length - 1, Math.max(0, Math.ceil(gecerli.length * oran) - 1))
  return gecerli[i]
}

export function topla(dizi) {
  return dizi.filter((x) => x !== null && x !== undefined && !Number.isNaN(x)).reduce((a, b) => a + b, 0)
}

/** Oran 0–1; payda yoksa null. */
export function oran(bolum, toplam) {
  if (!toplam) return null
  return bolum / toplam
}

/** "%12"; payda yoksa "—". */
export function yuzde(bolum, toplam) {
  if (!toplam) return '—'
  return '%' + Math.round((bolum / toplam) * 100)
}

/** Bir önceki döneme göre yüzde fark; taban yoksa null. */
export function fark(simdi, once) {
  if (simdi === null || simdi === undefined || !once) return null
  return Math.round(((simdi - once) / once) * 100)
}

/* ORAN ÖLÇÜSÜNÜN FARKI PUANLA.

   Oranın kendisine göreli fark uygulamak yanıltıyor: dönüşüm %8'den
   %12'ye çıkınca "▲ %50" yazıyordu; yönetici bunu "yarısı daha satışa
   döndü" diye okur. Doğrusu "▲ 4 puan". Girdiler 0–1 arası oran;
   önceki dönemde oran %0 olsa da fark hesaplanır (0'dan 20'ye 20 puan).
   Ölçü `farkBirim: 'puan'` ile işaretlenir (bkz. Gorunum.jsx).

   FARK EKRANDAKİ İKİ YÜZDENİN FARKI (17 Eylül 2026). Önce ham oranların
   farkı yuvarlanıyordu; ekrandaki değer ise kendi başına yuvarlanıyor
   (bkz. yuzde). 2/3 ile 1/3 ekranda %67 ve %33 yazıyor — arası 34 puan —
   ama rozet "33 puan" diyordu. Rozet artık ekranda görünen iki sayının
   farkını veriyor; yönetici iki dönemi açıp çıkarma yapınca aynı sayıyı
   buluyor. */
export function farkPuan(simdiOran, onceOran) {
  if (simdiOran === null || simdiOran === undefined || onceOran === null || onceOran === undefined) return null
  return Math.round(simdiOran * 100) - Math.round(onceOran * 100)
}

/** "1,4" — tek ondalık, Türkçe virgül. */
export function ondalik(sayi, basamak = 1) {
  if (sayi === null || sayi === undefined || Number.isNaN(sayi)) return '—'
  return sayi.toFixed(basamak).replace('.', ',')
}

export function sayiYaz(sayi) {
  if (sayi === null || sayi === undefined || Number.isNaN(sayi)) return '—'
  return Math.round(sayi).toLocaleString('tr-TR')
}

/* Süre: saat cinsinden gelir, okunur birime çevrilir. */
export function sureYaz(saat) {
  if (saat === null || saat === undefined || Number.isNaN(saat)) return '—'
  if (saat < 1) return `${Math.max(1, Math.round(saat * 60))} dk`
  if (saat < 48) return `${Math.round(saat)} sa`
  return `${ondalik(saat / 24)} gün`
}

/* Para alanlarının okunması. Personel bu alanlara her zaman sayı
   yazmıyor ("Garanti kapsamında" doğru bir cevap); rakam içermeyen
   değer toplama girmiyor. */
export function paraOku(deger) {
  if (typeof deger === 'number') return Number.isFinite(deger) ? deger : null
  const ham = String(deger ?? '')
  if (!/\d/.test(ham)) return null
  const rakam = ham.replace(/\D/g, '')
  return rakam ? Number(rakam) : null
}

/** Kutucukta para birimiyle; tabloda birimsiz (başlık zaten söylüyor). */
export function paraKutu(sayi) {
  if (sayi === null || sayi === undefined) return '—'
  const v = paraYaz(sayi)
  return v === '—' ? v : v + ' ₺'
}

export function paraHucre(sayi) {
  if (sayi === null || sayi === undefined) return '—'
  return paraYaz(sayi)
}

/* -------------------------------------------------------------- Dönem */

/* Bir önceki eşit uzunlukta dönem. "Tüm zamanlar" ya da açık uçlu özel
   aralıkta karşılaştırılacak dönem yok; uydurma taban üretilmiyor.

   BİTİŞ BUGÜNÜ GEÇEMEZ. "1–30 Eylül" 17 Eylül'de seçildiğinde elde 17
   günlük veri var; önceki dönem 30 gün alınınca 17 günle 30 gün
   karşılaştırılıyor ve fark olduğundan küçük görünüyordu. Dönemin
   uzunluğu verinin gerçekten olabileceği güne kadar sayılıyor. */
function karsilastirmaSiniri(aralik) {
  const { bas, bit } = araligiCoz(aralik)
  if (!Number.isFinite(bas) || !Number.isFinite(bit) || bas === 0) return null
  const bugunSonu = new Date().setHours(23, 59, 59, 999)
  const son = Math.min(bit, bugunSonu)
  if (son <= bas) return null
  return { bas, son }
}

export function oncekiDonemdeMi(zaman, aralik) {
  const s = karsilastirmaSiniri(aralik)
  if (!s) return false
  const uzunluk = s.son - s.bas
  return zaman >= s.bas - uzunluk - 1 && zaman < s.bas
}

export function karsilastirilabilirMi(aralik) {
  return Boolean(karsilastirmaSiniri(aralik))
}

function iso(zaman) {
  const d = new Date(zaman)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

/* ZAMAN KOVALARI — grafiğin yatay ekseni.

   Seçilen döneme göre kova boyu değişiyor: bir aya kadar gün, altı
   aya kadar hafta (pazartesiden başlar), daha uzunu ay. 90 günü gün
   gün çizmek okunmayan bir çubuk yığını; bir yılı hafta hafta çizmek
   de öyle.

   "Tüm zamanlar" seçiliyse başlangıç verideki en eski kayıt. Her
   kova, tıklanınca Talepler ekranına verilebilecek özel aralığı da
   taşıyor. */
export function zamanKovalari(aralik, zamanlar = []) {
  let { bas, bit } = araligiCoz(aralik)
  const simdi = Date.now()
  if (!Number.isFinite(bit)) bit = simdi
  if (!bas) {
    const enEski = zamanlar.filter(Number.isFinite).reduce((a, b) => Math.min(a, b), simdi)
    bas = new Date(enEski).setHours(0, 0, 0, 0)
  }
  bit = Math.min(bit, new Date(simdi).setHours(23, 59, 59, 999))
  const gunSayisi = Math.max(1, Math.round((bit - bas) / GUN))

  const kovalar = []
  if (gunSayisi <= 31) {
    for (let g = new Date(bas); g.getTime() <= bit; g.setDate(g.getDate() + 1)) {
      const b = new Date(g).setHours(0, 0, 0, 0)
      const s = new Date(g).setHours(23, 59, 59, 999)
      kovalar.push({
        bas: b, bit: s, boy: 'gun',
        etiket: `${g.getDate()}.${g.getMonth() + 1}`,
        tamEtiket: g.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }),
      })
    }
  } else if (gunSayisi <= 186) {
    const ilk = new Date(bas)
    ilk.setHours(0, 0, 0, 0)
    ilk.setDate(ilk.getDate() - ((ilk.getDay() + 6) % 7))
    for (let g = ilk; g.getTime() <= bit; g.setDate(g.getDate() + 7)) {
      const b = Math.max(bas, g.getTime())
      const son = new Date(g)
      son.setDate(son.getDate() + 6)
      son.setHours(23, 59, 59, 999)
      const s = Math.min(bit, son.getTime())
      const bd = new Date(b)
      kovalar.push({
        bas: b, bit: s, boy: 'hafta',
        etiket: `${bd.getDate()} ${AYLAR[bd.getMonth()]}`,
        tamEtiket: `${new Date(b).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} – ${new Date(s).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}`,
      })
    }
  } else {
    const ilk = new Date(bas)
    ilk.setDate(1)
    ilk.setHours(0, 0, 0, 0)
    for (let g = ilk; g.getTime() <= bit; g.setMonth(g.getMonth() + 1)) {
      const b = Math.max(bas, g.getTime())
      const son = new Date(g.getFullYear(), g.getMonth() + 1, 0, 23, 59, 59, 999)
      const s = Math.min(bit, son.getTime())
      kovalar.push({
        bas: b, bit: s, boy: 'ay',
        etiket: `${AYLAR[g.getMonth()]} ${String(g.getFullYear()).slice(2)}`,
        tamEtiket: g.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
      })
    }
  }
  return kovalar.map((k) => ({ ...k, aralik: { tur: 'ozel', bas: iso(k.bas), bit: iso(k.bit) } }))
}

/**
 * Kayıtları kovalara dağıtır.
 * @param {Array} kovalar zamanKovalari() çıktısı
 * @param {Array} kayitlar
 * @param {(k) => number|null} zamanAl
 * @param {(k) => string|null} seriAl hangi seriye düştüğü (null → sayılmaz)
 * @param {(k) => number} [degerAl] varsayılan 1 (adet)
 */
/* ARALIK DIŞINDA KALAN KAYIT EN YAKIN KOVAYA DÜŞÜYOR (17 Eylül 2026).

   Kovalar bugünün sonunda kesiliyor (bkz. zamanKovalari); "Tüm
   zamanlar" ve bitişi boş bırakılmış özel aralıkta ise dönemin kendisi
   kesilmiyor. Araya ileri tarihli bir kayıt girdiğinde — createdAt
   müşterinin kendi cihazının saatiyle yazılıyor, saati ileri kurulmuş
   bir telefon böyle bir kayıt üretebiliyor — kayıt ölçüye ve tabloya
   giriyor ama hiçbir kovaya düşmüyordu: aynı kartta "Servis 2" yazarken
   çubukların toplamı 1 çıkıyordu. Kayıt artık sessizce kaybolmuyor, en
   yakın kovaya (ilkinden önceyse ilkine, sonuncudan sonraysa
   sonuncusuna) düşüyor. */
export function kovayaDagit(kovalar, kayitlar, zamanAl, seriAl, degerAl = () => 1) {
  const sonuc = kovalar.map((k) => ({ ...k, degerler: {} }))
  const ilk = sonuc[0]
  const son = sonuc[sonuc.length - 1]
  for (const kayit of kayitlar) {
    const z = zamanAl(kayit)
    if (!Number.isFinite(z)) continue
    const kova =
      sonuc.find((k) => z >= k.bas && z <= k.bit) || (son && z > son.bit ? son : ilk && z < ilk.bas ? ilk : null)
    if (!kova) continue
    const seri = seriAl(kayit)
    if (seri === null || seri === undefined) continue
    kova.degerler[seri] = (kova.degerler[seri] || 0) + (Number(degerAl(kayit)) || 0)
  }
  return sonuc
}

/* ------------------------------------------------------------- Talep */

export function modelAdi(productId) {
  if (!productId) return null
  return getProduct(productId)?.name || productId
}

export function talepModeli(t) {
  return modelAdi(t?.makine?.productId || t?.urunId)
}

/* Servisin kendi parça siparişi de bir yedek parça talebi olarak aynı
   depoda duruyor (bkz. veri.js → servisParcaSiparisi); müşterisi
   servisin kendisi. Müşteri sayan her hesap onu dışarıda bırakmalı,
   yoksa servisin telefonu müşteri, ili talep ili gibi sayılır. */
export function musteriTalebiMi(t) {
  return !t?.servisSiparisi
}

/* İlk işlem: talebin açılışından SONRA geçmişe düşen ilk satır.
   Açılış satırı sayılmıyor (servisin kendi siparişinde geçmişin ilk
   satırı açılışın kendisi, süre sıfır çıkıyordu). */
export function ilkIslemZamani(t) {
  const satir = (t?.gecmis || []).find((g) => g?.tarih && g.tarih > (t.createdAt || 0) + 1000)
  return satir ? satir.tarih : null
}

/* KAPANIŞI İKİ AYRI SORU SORUYOR; İKİSİNİN OKUYUCUSU AYRI.

   `kapanisZamani`  "talep ŞU AN kapalı mı, ne zaman kapandı?"
                    Kapanışın hâlâ geçerli olmasını isteyen hesaplar
                    bunu kullanıyor: parça gönderildi mi (Yedek Parça),
                    teklif sonuçlandı mı (Satış), kapanma süresi.
   `kapanisOlayi`   "bu dönemde bir kapanış OLDU mu?"
                    Sayım yapan hesaplar bunu kullanıyor: Genel
                    Bakış'taki "Kapanan talep", Servis Ağı'ndaki
                    "Tamamlanan iş".

   İKİSİ NEDEN AYRILDI (17 Eylül 2026). Tek okuyucu vardı ve şu anki
   duruma bakıyordu; dönem içinde kapanmış, sonra müşteri "sorun devam
   ediyor" deyince yeniden açılmış bir iş kapanan sayısından tamamen
   düşüyordu. Kapanış bir OLAY: 3 Eylül'de gerçekleştiyse eylül
   raporunda durur. Aksi hâlde geçmiş bir dönemin sayısı, sonradan
   yapılan bir yeniden açma yüzünden geriye dönük azalıyor ve aynı ay
   iki kez bakıldığında iki farklı sayı çıkıyordu.

   İkisi de yeniden açılıp TEKRAR kapanan talepte son kapanışı alıyor:
   talep bir dönemde bir kez sayılıyor. */
export function kapanisZamani(t) {
  if (t?.status !== 'kapandi') return null
  return kapanisOlayi(t)
}

export function kapanisOlayi(t) {
  const satirlar = (t?.gecmis || []).filter((g) => g?.durum === 'kapandi' && g.tarih)
  if (satirlar.length) return satirlar[satirlar.length - 1].tarih
  return t?.status === 'kapandi' ? t.cozum?.tarih || null : null
}

/* İptal anı: geçmişteki son "iptal" satırı, yoksa iptal kaydının
   tarihi. Kapanış gibi bir olay; talebin bugünkü durumuna bakmıyor. */
export function iptalZamani(t) {
  const satirlar = (t?.gecmis || []).filter((g) => g?.durum === 'iptal' && g.tarih)
  if (satirlar.length) return satirlar[satirlar.length - 1].tarih
  return t?.iptalBilgi?.tarih || null
}

export function ilkIslemSuresi(t) {
  const z = ilkIslemZamani(t)
  return z ? (z - t.createdAt) / SAAT : null
}

export function kapanisSuresi(t) {
  const z = kapanisZamani(t)
  return z ? (z - t.createdAt) / SAAT : null
}

/** Açılıştan kapanış OLAYINA kadar; yeniden açılmış talepte de dolu. */
export function kapanisOlaySuresi(t) {
  const z = kapanisOlayi(t)
  return z && Number.isFinite(t?.createdAt) ? (z - t.createdAt) / SAAT : null
}

/* Yeniden açılma: müşteri "sorun devam ediyor" dediğinde talebin
   `tekrar` dizisine bir satır ekleniyor (bkz. screens/RequestDetail.jsx). */
export function yenidenAcilmaSayisi(t) {
  return Array.isArray(t?.tekrar) ? t.tekrar.length : 0
}

/* SERVİS İŞİNİN SINIFI — garanti mi, garanti dışı mı.

   Kaydın kendi alanlarından okunuyor, ücret yazısından değil:
   1. `cozum.garantiDisi` ya da eski garanti dışı kapı (`eldeParca`,
      `parcaIste`) → garanti dışı. Parayı müşteri servise ödedi.
   2. `kapi === 'garanti'` ve hak edişi reddedilmiş → reddedilen.
   3. `kapi === 'garanti'` ya da servis kaydı var → garanti.
   4. Servis kaydı yok, backoffice kapanış formuyla kapanmış: ücret
      alanında rakam varsa ücretli, yoksa garanti.
   Kapanmamış ve kaydı olmayan iş: null (henüz sınıfı yok). */
export function servisSinifi(t) {
  const kapi = t?.servisKaydi?.kapi
  if (t?.cozum?.garantiDisi || kapi === 'eldeParca' || kapi === 'parcaIste') return 'garantiDisi'
  if (kapi === 'garanti') return t.hakkedis?.durum === 'reddedildi' ? 'reddedilen' : 'garanti'
  if (t?.servisKaydi) return 'garanti'
  if (!t?.cozum) return null
  return paraOku(t.cozum.ucret) === null ? 'garanti' : 'ucretli'
}

/* SERVİS ZİYARETLERİ — talebin bütün ziyaret kayıtları.

   Bir talepte birden çok ziyaret olabiliyor: müşteri "sorun devam
   ediyor" dediğinde servis ikinci kez gidiyor ve ilk kayıt
   `oncekiKayitlar` dizisine arşivleniyor (bkz. veri.js →
   servisKaydiGonder). Garanti maliyeti ve arıza geçmişi yalnız son
   kayda bakarsa ilk ziyaretin hak edişi ve parçası kaybolur.

   Her ziyaret: { talep, tarih, kapi, asama, yapilanIs, parcalar,
   hakkedis, parcaSevk, duzeltmeler, garantiDisi, guncel } */
export function servisZiyaretleri(t) {
  const liste = []
  for (const k of t?.oncekiKayitlar || []) {
    liste.push({
      talep: t,
      tarih: k.tarih || null,
      kapi: k.garantiDisi ? 'garantiDisi' : k.kapi || null,
      asama: k.asama || null,
      yapilanIs: k.yapilanIs || null,
      parcalar: Array.isArray(k.parcalar) ? k.parcalar : [],
      hakkedis: k.hakkedis || null,
      parcaSevk: k.parcaSevk || null,
      duzeltmeler: k.duzeltmeler || [],
      servisAd: k.servisAd || t.servis?.ad || null,
      garantiDisi: Boolean(k.garantiDisi),
      guncel: false,
    })
  }
  if (t?.servisKaydi) {
    const k = t.servisKaydi
    liste.push({
      talep: t,
      tarih: k.tarih || null,
      kapi: k.kapi || null,
      asama: k.asama || null,
      yapilanIs: k.yapilanIs || null,
      parcalar: Array.isArray(k.parcalar) ? k.parcalar : [],
      hakkedis: t.hakkedis || null,
      parcaSevk: t.parcaSevk || null,
      duzeltmeler: k.duzeltmeler || [],
      servisAd: k.servisAd || t.servis?.ad || null,
      garantiDisi: false,
      guncel: true,
    })
  } else if (t?.cozum?.garantiDisi) {
    liste.push({
      talep: t,
      tarih: t.cozum.tarih || null,
      kapi: 'garantiDisi',
      asama: null,
      yapilanIs: null,
      parcalar: [],
      hakkedis: null,
      parcaSevk: null,
      duzeltmeler: [],
      servisAd: t.cozum.personel || t.servis?.ad || null,
      garantiDisi: true,
      guncel: true,
    })
  }
  return liste
}

/* Fiyat anlık görüntüsü: talep açılırken kaydın içine yazılan fiyat.
   Rapor bugünkü fiyat listesine bakmıyor; eski kayıtta görüntü yoksa
   tutar bilinmiyor sayılıyor (null), sıfır değil. */
export function parcaGoruntusu(t) {
  const g = t?.parcaFiyat
  return g && Number.isFinite(Number(g.toplam)) ? g : null
}
