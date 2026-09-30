/* ==========================================================================
   Bir makinenin açık servis talepleri

   Connect'in talep formu, Servisim'in Kayıt Aç ekranı ve backoffice'in
   Talepler ekranı "bu makinede şu an süren bir iş var mı?" sorusunu
   buradan soruyor (kullanıcı sınaması O5, 25 Eylül 2026). Önce hiçbiri
   sormuyordu: aynı makineye aynı anda iki servis talebi açılabiliyor,
   ne engel ne uyarı çıkıyordu. Tek dosya olmasının sebebi "açık"
   tanımının üç üründe ayrışmaması.

   İKİ YÜKLEM, BİLEREK

     acikServisTalebiMi — türü servis ve durumu kapalı değil. Onay
     bekleyen iş de açık: ziyaret bitti ama PAKSAN hak edişi henüz
     onaylamadı, yani iş ödenmedi. Backoffice'in "makinede başka açık
     iş" işareti ve hak ediş onayındaki uyarı buna bakıyor: PAKSAN aynı
     makinede ödenmemiş iki işi yan yana görmeli.

     isSurenServisTalebiMi — açık ve onay beklemiyor. Connect'teki engel
     ve Servisim'deki "bu makine için açık bir işiniz var" kartı buna
     bakıyor. Onay bekleyen iş için ikisi de yanlış olurdu: servis
     ziyareti bitirmiş, makinedeki yeni arıza yeni bir iş; Servisim'in
     "İşi Aç" düğmesi de servisi üzerinde hiçbir işlem yapamayacağı bir
     talebe götürürdü.

   Eşleşme normalize edilmiş seriyle (lib/serial.js → normalizeSerial):
   "ork1270-2024-00157" ile "ORK1270202400157" aynı makine. Serisi
   olmayan makine hiçbir talebe eşleştirilmiyor; uydurma eşleşme yok.
   Parça talebi ve servisin kendi parça siparişi servis işi değil,
   sayılmıyor.

   ARGÜMAN SIRASI HEP AYNI: önce makine (nesne ya da seri numarası),
   sonra talep listesi.

   Kapalı durum listesi lib/talepEkleme.js'ten: Connect backoffice
   kodunu içe aktaramıyor; backoffice listesiyle eşitliğini ekosistem
   sınaması denetliyor (AK-06). Ekrana çıkan metin yok.

   SUNUCU NOTU: sunucu geldiğinde Servisim'e başka servisin talebi
   inmeyecek. Cevap "var/yok" ve varsa servisin kendi işinin numarası
   olacak; ekranlar bugünden yalnız bunları gösteriyor.
   ========================================================================== */

import { normalizeSerial } from './serial'
import { KAPALI_DURUMLAR } from './talepEkleme'

/** Makinenin eşleşme anahtarı: normalize seri. Serisizse null. */
export function makineAnahtari(makine) {
  const seri = typeof makine === 'string' ? makine : makine?.serial
  return normalizeSerial(seri) || null
}

/** Servis talebi açık mı? Onay bekleyen iş de açık (ödenmedi). */
export function acikServisTalebiMi(t) {
  return t?.tur === 'servis' && !t.servisSiparisi && !KAPALI_DURUMLAR.includes(t.status || 'yeni')
}

/** Servis talebinde iş sürüyor mu? Açık ve onay beklemiyor. */
export function isSurenServisTalebiMi(t) {
  return acikServisTalebiMi(t) && (t.status || 'yeni') !== 'onayBekliyor'
}

/**
 * Makinenin açık servis talepleri, listedeki sırayla.
 *
 * @param {object|string} makine  makine nesnesi ya da seri numarası
 * @param {Array} talepler
 * @param {{haric?: string|null, yuklem?: Function}} ayar
 *   haric: sonuçtan çıkarılacak talep kimliği (talebin kendisi)
 *   yuklem: hangi talep sayılsın; varsayılan acikServisTalebiMi
 * @returns {Array} talep nesneleri; boşsa açık iş yok
 */
export function makineninAcikServisTalepleri(makine, talepler = [], { haric = null, yuklem = acikServisTalebiMi } = {}) {
  const anahtar = makineAnahtari(makine)
  if (!anahtar) return []
  return (talepler || []).filter((t) => t && t.id !== haric && yuklem(t) && makineAnahtari(t.makine) === anahtar)
}

/**
 * Makinede işi süren en yeni servis talebi (onay bekleyen hariç).
 * Connect'te ikinci servis talebinin yerine bu talebe ekleme yapılıyor.
 *
 * @param {object|string} makine  makine nesnesi ya da seri numarası
 * @param {Array} talepler
 * @returns {object|null}
 */
export function makineninIsSurenServisTalebi(makine, talepler = []) {
  return (
    makineninAcikServisTalepleri(makine, talepler, { yuklem: isSurenServisTalebiMi })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] || null
  )
}

/**
 * Kapanmış servis talebini "Sorun Devam Ediyor" ile yeniden açmanın
 * önündeki iş: aynı makinede işi süren BAŞKA servis talebi (25 Eylül
 * 2026, inceleme). Düğme kapanmış talebi yeniden açıyordu; makinede
 * başka bir iş sürerken bu, talep formundaki O5 engelinin atlandığı
 * ikinci yoldu ve makinede iki açık talep oluşuyordu. Doluysa Connect
 * düğmenin yerinde o talebe ekleme yolunu gösteriyor
 * (screens/RequestDetail.jsx).
 *
 * @param {object} talep     kapanmış talep
 * @param {Array} talepler   müşterinin talepleri
 * @returns {object|null}    süren talep; yoksa ya da talep uygun değilse null
 */
export function sorunDevamEngeli(talep, talepler = []) {
  if (talep?.tur !== 'servis' || talep.status !== 'kapandi') return null
  return makineninIsSurenServisTalebi(talep.makine, (talepler || []).filter((t) => t?.id !== talep.id))
}

/**
 * Servisim'in Kayıt Aç ekranındaki iki uyarının cevabı (O5): makinede
 * servisin KENDİ ELİNDEKİ süren işi ve makinedeki başka açık iş.
 *
 *   kendi — servisin yürüttüğü, işi süren en yeni talep ("Bu makine için
 *           açık bir işiniz var" kartı ve "İşi Aç" düğmesi)
 *   baska — makinede başka açık servis talebi var mı ("açık başka bir
 *           servis talebi var" kartı; numara ve ad gösterilmiyor)
 *   onayda — servisin kendi, onay bekleyen en yeni işi ("onay bekleyen
 *           bir işiniz var" kartı; 28 Eylül 2026)
 *
 * DEVREDİLMİŞ İŞ SERVİSİN ELİNDE DEĞİL (25 Eylül 2026, inceleme). Servis
 * işi "PAKSAN'a Devret" ile devrettiyse (`sahip: 'paksan'`; 30 Eylül
 * 2026'ya kadar adı "Destek İste") kart
 * servise "o işe devam edin" diyor, "İşi Aç" onu not bile ekleyemediği
 * bir talebe götürüyordu (TalepDetay.jsx → paksanda). Onay bekleyen işin
 * çıkmaz sokağıyla aynı kusur (dosyanın başı). Devredilmiş iş artık
 * "başka açık talep" sayılıyor: talep yine açılabilir, PAKSAN iki işi
 * karşılaştırır.
 *
 * ONAY BEKLEYEN KENDİ İŞİ İÇİN UYARI (28 Eylül 2026, kullanıcının kararı:
 * "Uyarsın"). Onay bekleyen iş "süren iş" sayılmıyor (iş bitti, servis
 * orada devam edemez) ve hiçbir kartta değildi: ikinci kullanıcı
 * sınamasında servis, onayda bekleyen işinin makinesine ikinci iş açtı ve
 * Servisim bir şey söylemedi; PAKSAN ancak hak edişi onaylarken "aynı
 * makinede açık iş" işaretini görüyordu. Artık kendi kartı var. Uyarı,
 * engel değil: aynı makinede yeni bir arıza yeni bir iştir.
 *
 * @param {object|string} makine  makine nesnesi ya da seri numarası
 * @param {Array} talepler
 * @param {string} servisId  Servisim'deki servis
 * @returns {{kendi: object|null, baska: boolean, onayda: object|null}}
 */
export function servisinMakinedekiIsleri(makine, talepler = [], servisId) {
  const acik = makineninAcikServisTalepleri(makine, talepler)
  const kendisinin = (t) => t.servis?.id === servisId
  const elinde = (t) => kendisinin(t) && (t.sahip || 'paksan') === 'servis'
  return {
    kendi: makineninIsSurenServisTalebi(makine, acik.filter(elinde)),
    baska: acik.some((t) => !kendisinin(t) || (!elinde(t) && isSurenServisTalebiMi(t))),
    onayda:
      acik
        .filter((t) => elinde(t) && (t.status || 'yeni') === 'onayBekliyor')
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] || null,
  }
}

/**
 * Makinenin en son servis talebindeki adres (kullanıcı sınaması O4,
 * 25 Eylül 2026). Connect'in servis talebi formu il, ilçe ve adresi
 * hesaptan dolduruyordu; hesabın ili başka bir talepte değişince makine
 * başka ilde görünüyordu. Form artık önce makinenin kendi son servis
 * adresini öneriyor. Kapanmış talep de sayılıyor: makinenin yeri
 * talebin durumuna bağlı değil. İl ya da adresi boş talep atlanıyor.
 *
 * @param {object|string} makine  makine nesnesi ya da seri numarası
 * @param {Array} talepler
 * @returns {{il: string, ilce: string, adres: string}|null}
 */
export function makineninSonServisAdresi(makine, talepler = []) {
  const anahtar = makineAnahtari(makine)
  if (!anahtar) return null
  const son = (talepler || [])
    .filter((t) => t && t.tur === 'servis' && t.il && t.adres?.trim() && makineAnahtari(t.makine) === anahtar)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0]
  return son ? { il: son.il, ilce: son.ilce || '', adres: son.adres } : null
}
