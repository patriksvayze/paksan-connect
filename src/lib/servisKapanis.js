/* ==========================================================================
   Servis servis kapanışı

   BAYİDEN KARŞILIKSIZ VERİ İSTENMEZ

   Servis ayrı bir şirket ve kendi menfaati dışında bir şey yapmaz.
   Yalnız PAKSAN'a yarayan bir form ya doldurulmaz ya geçiştirilir;
   geçiştirilmiş veri, verinin olmamasından beterdir — PAKSAN ona
   bakıp karar alır.

   Kural şu: servisten istenen her alan için tek soru sorulur —
   BAYİ BUNU DOLDURDUĞU AN NE ALIYOR? Cevap yoksa alan sorulmaz.

   Buradan üç kapı çıkıyor ve her kapı servisin aldığı şeye göre soru
   soruyor:

     PARÇA DEĞİŞMEDİ
       Servis PAKSAN'dan bir şey almıyor. Tek soru "ne yapıldı" ve o da
       tek dokunuş — karşılığı müşterinin uygulamasında görünen kayıt,
       yani servisin kendi vitrini.

     MÜŞTERİ ÖDEDİ
       Servis parçayı kendi stokundan verdi. Aldığı şey: stok düşüyor ve
       kalem bitince "sipariş vereyim mi" diye soruluyor. Servis stokunu
       PAKSAN için değil, malsız kalmamak için tutmaya başlıyor.

     GARANTİ — PAKSAN'DAN İSTİYORUM
       Servis bedelsiz parça alacak. Ayrıntı BURADA sorulabilir, çünkü
       form bir rapor değil TALEBİN KENDİSİ: servis onu PAKSAN'a rapor
       vermek için değil, parçayı almak için dolduruyor. Doğruluğun
       bekçisi iyi niyet değil, servisin kendi cebi.

   VERDİKT SORULMUYOR

   "Üretim hatası mı, kullanım hatası mı" diye sorulsa servis her zaman
   "üretim hatası" der — talebinin kabul edilmesi ona bağlı. Bu yüzden
   servise YALNIZ GÖZLEDİĞİ ŞEY soruluyor: parça kırılmış mı, aşınmış
   mı, kaçırıyor mu. Yalan söylemesinin bir kazancı yok, veri de daha
   doğru çıkıyor. Kararı PAKSAN, eski parça eline geçtiğinde veriyor.

   KAPANIŞ ORTAK BİÇİMDE YAZILIYOR

   `talepKapat` çağrısına giden `cozum` nesnesi backoffice'in kendi
   kapanış formuyla AYNI alanları taşıyor (bkz. Talepler.jsx
   `KAPANIS_ALANLARI`): `yapilanIs`, `parcalar`, `ucret`, `ozet`.
   Böylece servisin kapattığı iş, PAKSAN'ın kendi kapattığı işle aynı
   yerde ve aynı biçimde görünüyor; müşteri de kendi uygulamasında
   okuyor (bkz. screens/RequestDetail.jsx). Servise özel ikinci bir
   depo AÇILMADI — açılsaydı iki taraf da birbirini göremezdi.
   ========================================================================== */

import { siparisAc } from './servisSiparis.js'
import { stokDus } from './servisStok.js'

/* Yapılan iş — tek dokunuş. Liste kısa: dört madde bir servis
   ziyaretinin gerçekten ayrıldığı öbekler. Uzun listede servis
   aradığını bulamıyor ve en üsttekini seçiyor. */
export const YAPILAN_IS = [
  'Ayar yapıldı',
  'Bakım yapıldı',
  'Parça değişti',
  'Arıza bulunamadı',
]

/* Ödemeyi kim yaptı — kapanışın tek asıl sorusu.

   Bunlar DÜĞMEDE yazan cevaplar; servise ne olacağını söylüyorlar. */
export const ODEME = {
  yok: 'Parça değişmedi',
  musteri: 'Parçanın ücretini müşteri ödedi',
  garanti: 'Garantiden parça iste',
}

/* Kayda geçen ücret satırı — DÜĞME YAZISIYLA AYNI DEĞİL.

   Bu yazı `cozum.ucret` alanına gidiyor ve MÜŞTERİNİN kendi
   uygulamasında "Ücret" satırı olarak görünüyor
   (bkz. screens/RequestDetail.jsx). Düğme yazısı oraya konsaydı
   çiftçi kendi servis kaydında "Garantiden parça iste" okurdu. */
export const UCRET_YAZI = {
  yok: '',
  musteri: 'Müşteri ödedi',
  garanti: 'Garanti kapsamında',
}

/* Servise "hata kimin" diye sorulmuyor; NE GÖRDÜĞÜ soruluyor.
   Gerekçesi dosyanın başında. */
export const PARCA_DURUMU = [
  'Kırıldı',
  'Aşındı',
  'Çalışmıyor',
  'Kaçırıyor',
  'Eğildi',
]

/* Süre yazılmıyor, seçiliyor. Kutuya "90" yazmak listeden "1,5 saat"
   seçmekten yavaş ve hataya açık. Değer dakika olarak saklanıyor.

   GARANTİ İŞÇİLİĞİ BUGÜN ÖDENMİYOR, o yüzden süre ve usta adı
   İSTEĞE BAĞLI ve yalnız garanti kapısında soruluyor. Ödendiği gün
   bu iki satır hakediş belgesinin dayanağı olacak ve zorunluya
   çevrilecek; servis parasını almak için doğru yazacak. Veri düzeni o
   gün değişmeyecek şekilde bugünden kuruldu. */
export const SURELER = [
  { dk: 30, ad: '30 dakika' },
  { dk: 60, ad: '1 saat' },
  { dk: 90, ad: '1,5 saat' },
  { dk: 180, ad: '3 saat' },
  { dk: 480, ad: 'Tam gün' },
]

/** Parça listesini tek satır yazıya çeviriyor: "Rulman × 2, Kayış × 1" */
export function parcaYazisi(parcalar = []) {
  return parcalar.map((p) => `${p.ad} × ${p.adet}`).join(', ')
}

/**
 * Servis talebini kapatır.
 *
 * Üç iş yapıyor ve üçü de seçilen kapıya bağlı:
 *   · ortak biçimde `cozum` üretiyor
 *   · müşteri ödediyse stoktan düşüyor
 *   · garantiyse PAKSAN'a parça talebi açıyor
 *
 * `talepKapat`'ı ÇAĞIRMIYOR — onu ekran çağırıyor. Sebebi katman:
 *  bu dosya `lib/`, `talepKapat` backoffice veri katmanında; ikisi
 *  arasında bağ kurulmuyor (bkz. servisSiparis.js, servisStok.js).
 *
 * @param {{servisId, servisAd, servisNo, talep, yapilanIs, odeme, parcalar,
 *          parcaDurumu, foto, iade, not, sureDk, kim}} veri
 *        parcalar: [{ ad, adet }]
 * @returns {{cozum} | {hata}}
 */
export function servisKapat(veri) {
  const { odeme, talep } = veri
  if (!ODEME[odeme]) return { hata: 'Parça değişip değişmediğini seçin.' }
  if (!veri.yapilanIs) return { hata: 'Ne yapıldığını seçin.' }

  const parcalar = (veri.parcalar || [])
    .filter((p) => p.ad && Number(p.adet) > 0)
    .map((p) => ({ ad: p.ad, adet: Number(p.adet) }))

  if (odeme !== 'yok' && !parcalar.length) {
    return { hata: 'Değişen parçayı seçin.' }
  }
  if (odeme === 'garanti' && !veri.parcaDurumu) {
    return { hata: 'Parçadaki sorunu seçin.' }
  }

  let garantiSiparis = null

  /* Garanti talebi AYRI BİR SİSTEM DEĞİL: mevcut sipariş akışının bir
     türü. Servis ister, PAKSAN onaylar, hazırlar, gönderir, stok artar —
     hepsi aynı yoldan. Fark yalnız türünde ve taşıdığı kanıtta. */
  if (odeme === 'garanti') {
    const sonuc = siparisAc({
      servisId: veri.servisId,
      servisAd: veri.servisAd,
      servisNo: veri.servisNo,
      tur: 'garanti',
      kalemler: parcalar.map((p) => ({
        tur: 'parca',
        anahtar: p.ad,
        ad: p.ad,
        adet: p.adet,
      })),
      garanti: {
        talepNo: talep.no,
        seri: talep.makine?.serial || '',
        parcaDurumu: veri.parcaDurumu,
        foto: veri.foto || null,
        iade: veri.iade !== false,
        sureDk: veri.sureDk || null,
        kim: (veri.kim || '').trim(),
      },
      not: (veri.not || '').trim(),
    })
    if (sonuc.hata) return { hata: sonuc.hata }
    garantiSiparis = sonuc.siparis
  }

  /* Müşterinin ödediği parça servisin kendi malı: stoktan düşüyor.
     Garantide düşmüyor — o parçayı PAKSAN gönderecek, servis kendi
     stokundan verdiyse zaten yerine yenisi gelecek. */
  if (odeme === 'musteri' && parcalar.length) {
    stokDus(
      veri.servisId,
      parcalar.map((p) => p.ad),
      Object.fromEntries(parcalar.map((p) => [p.ad, p.adet])),
      talep.no,
      veri.servisAd,
      'Serviste kullanıldı',
    )
  }

  const parcaYazi = parcaYazisi(parcalar)
  const ucret = UCRET_YAZI[odeme] || ''

  const cozum = {
    yapilanIs: veri.yapilanIs,
    parcalar: parcaYazi,
    ucret,
    ozet: [veri.yapilanIs, parcaYazi, ucret].filter(Boolean).join(' · '),
  }
  if (veri.not?.trim()) cozum.not = veri.not.trim()
  if (garantiSiparis) cozum.garantiNo = garantiSiparis.no

  return { cozum, garantiSiparis, parcalar }
}
