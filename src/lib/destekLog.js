/* ==========================================================================
   Destek oturum kaydı

   NEDEN VAR

   Destek ekranı bir yapay zekâ değil, hazır soru-cevap seti. Ama
   müşterinin o sette NE ARADIĞI, PAKSAN için makinenin kendisi kadar
   değerli: hangi modelde hangi arıza konuşuluyor, hangi soru en çok
   seçiliyor, müşteri hangi cümleyi yazdığında cevapsız kalıyor.

   Cevapsız kalan sorular bilgi tabanının eksik listesidir. Sık seçilen
   arızalar imalata giden geri bildirimdir. İkisi de ancak kayıt
   tutulursa görünür oluyor.

   NE KAYDEDİLİYOR

   Oturum başına tek satır: kim, hangi makine, hangi konular, hangi
   sorular, cevap bulundu mu, sonunda talep açtı mı. Sohbetin kendisi
   (bot cevaplarının tam metni) SAKLANMIYOR — o zaten bilgi tabanında
   duruyor, ikinci kez yazmanın anlamı yok. Saklanan şey müşterinin
   hareketi.

   NEREYE

   Şimdilik telefonun kendi hafızasına; backoffice aynı tarayıcıda çalıştığı
   için oradan okuyor (bkz. src/backoffice/veri.js → destekOturumlariGetir).
   Sunucu geldiğinde bu dosyadaki `yaz` fonksiyonu sunucuya da
   gönderecek, çağıran ekranlar aynı kalacak.

   OTURUM NE ZAMAN BİTER

   Ayrı bir "bitir" çağrısı yok — çiftçi uygulamayı çoğu zaman kapatmaz,
   cebine koyar. Onun yerine sessizlik süresine bakılıyor: aynı makinede
   30 dakika içindeki hareket aynı oturuma yazılıyor, sonrası yeni
   oturum. Böylece "bir oturuşta ne konuşuldu" sorusu doğru
   cevaplanıyor.
   ========================================================================== */

import { load, save, uid } from './storage'

const ANAHTAR = 'destekLog'

/* Kaç oturum saklanıyor. Telefonun hafızası sınırlı; eskiler düşüyor.
   Sunucu geldiğinde bu sınır kalkacak. */
const SINIR = 400

/* Tek oturumda en fazla kaç hareket. Kötü niyet değil, kaza koruması:
   düğmeye basılı kalan bir telefon dosyayı şişirmesin. */
const OLAY_SINIRI = 250

/* Bu süre boyunca hareket yoksa bir sonraki hareket yeni oturum sayılır */
const OTURUM_SESSIZLIK = 30 * 60 * 1000

function oku() {
  return load(ANAHTAR, [])
}

function yaz(liste) {
  save(ANAHTAR, liste.slice(0, SINIR))
}

/**
 * Açık oturumu bulur, yoksa açar. Her hareketten önce çağrılıyor.
 *
 * @param {object} baglam
 * @param {string} baglam.anahtar sohbetin kimliği — makine id'si ya da 'genel'
 * @param {object} [baglam.kullanici]
 * @param {object} [baglam.makine]
 * @param {object} [baglam.urun]
 * @param {string} [baglam.grup] destek grubu: balya, rulo, yem…
 * @param {string} [baglam.dil]
 * @returns {string} oturum kimliği
 */
export function destekOturumu({ anahtar, kullanici, makine, urun, grup, dil }) {
  const liste = oku()
  const acik = liste.find(
    (o) => o.anahtar === anahtar && Date.now() - (o.son || 0) < OTURUM_SESSIZLIK
  )
  if (acik) return acik.id

  const oturum = {
    id: uid(),
    anahtar,
    baslangic: Date.now(),
    son: Date.now(),
    dil: dil || 'tr',
    grup: grup || 'genel',
    /* Kimlik bilgisi kaydın işe yaraması için gerekli: "kim hangi
       makinede ne yaşıyor" sorusu ancak böyle cevaplanıyor. Telefon
       numarası müşteriyi backoffice’teki kaydına bağlayan alan. */
    kullanici: kullanici
      ? {
          no: kullanici.no || null,
          ad: kullanici.ad || '',
          tel: kullanici.tel || '',
          il: kullanici.il || '',
          ilce: kullanici.ilce || '',
        }
      : null,
    makine: makine
      ? { id: makine.id, serial: makine.serial, productId: makine.productId }
      : null,
    urun: urun ? { id: urun.id, ad: urun.name } : null,
    olaylar: [],
  }

  yaz([oturum, ...liste])
  return oturum.id
}

/**
 * Oturuma bir hareket yazar.
 *
 * @param {string} oturumId
 * @param {object} olay
 * @param {'konu'|'soru'|'serbest'|'cevap'|'cevapsiz'|'yonlendirme'|'temizlendi'} olay.tur
 * @param {string} [olay.deger]  seçilen konu / soru / yazılan cümle
 * @param {string} [olay.kayitId] bilgi tabanı kaydının kimliği
 */
export function destekOlay(oturumId, olay) {
  if (!oturumId || !olay?.tur) return

  const liste = oku()
  const i = liste.findIndex((o) => o.id === oturumId)
  if (i === -1) return

  const oturum = liste[i]
  if ((oturum.olaylar || []).length >= OLAY_SINIRI) return

  const kayit = { tur: olay.tur, tarih: Date.now() }
  if (olay.deger) kayit.deger = String(olay.deger).slice(0, 200)
  if (olay.kayitId) kayit.kayitId = olay.kayitId

  liste[i] = { ...oturum, son: kayit.tarih, olaylar: [...(oturum.olaylar || []), kayit] }
  yaz(liste)
}

/* ------------------------------------------------------------- Okuma

   Backoffice ve raporlar bu yardımcıları kullanıyor. Ham listeyi tek tek
   dolaşmak yerine sorunun cevabını doğrudan veriyorlar.              */

export function destekOturumlari() {
  return oku()
}

/** Oturumda kullanıcının sorduğu şeyler — konu başlıkları hariç. */
export function oturumSorulari(oturum) {
  return (oturum.olaylar || [])
    .filter((o) => o.tur === 'soru' || o.tur === 'serbest')
    .map((o) => o.deger)
    .filter(Boolean)
}

/** Oturumda cevapsız kalan cümleler — bilgi tabanının eksik listesi. */
export function oturumCevapsizlari(oturum) {
  const olaylar = oturum.olaylar || []
  const cevapsiz = []
  olaylar.forEach((o, i) => {
    if (o.tur !== 'cevapsiz') return
    /* Cevapsızın hemen öncesindeki soru, cevaplanamayan sorudur */
    for (let j = i - 1; j >= 0; j--) {
      if (olaylar[j].tur === 'serbest' || olaylar[j].tur === 'soru') {
        if (olaylar[j].deger) cevapsiz.push(olaylar[j].deger)
        break
      }
    }
  })
  return cevapsiz
}

/** Oturum bir talebe dönüştü mü, dönüştüyse hangi türe? */
export function oturumSonucu(oturum) {
  const y = (oturum.olaylar || []).filter((o) => o.tur === 'yonlendirme')
  return y.length ? y[y.length - 1].deger : null
}
