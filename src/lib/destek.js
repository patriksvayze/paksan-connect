import paket from '../marka/icerik/mobile_support_package.json'
import { MobileSupportRuntime } from './mobile_support_runtime'

/* ==========================================================================
   Destek verisine erişim

   İKİ DOSYA, BAŞKA HİÇBİR ŞEY

     src/data/mobile_support_package.json   veri
     src/lib/mobile_support_runtime.ts      akış motoru

   Veri paketi `paksan-support-dataset` deposundan alınır; uygulama
   tarafında kullanıcıya gösterilen Türkçe metinler gerektiğinde
   düzeltilir. Veri seti yenilenince paket yeniden gözden geçirilir,
   uygulamanın geri kalanına dokunulmaz.

   Bu dosya arada duran ince bir katman: motoru bir kez kurup ekranların
   ihtiyaç duyduğu birkaç seçmeyi (makine listesi, hızlı cevaplar,
   prosedür kartları, kaynak yazısı) veriyor. Teşhis akışının kendisi
   motorda yürüyor — burada kopyalanmıyor.

   METİN ÜRETİLMİYOR: ekranda görünen teknik cümleler paketten gelir;
   yalnızca kullanıcıya gösterilen dil ve teknik etiket eşlemeleri
   uygulama tarafında düzenlenir.
   ========================================================================== */

export const PAKET = paket
export const MOTOR = new MobileSupportRuntime(paket)

export const VERI_SURUMU = paket.dataset_version
export const PAKET_SURUMU = paket.package_version

/** {tr, en} → seçili dildeki metin; İngilizcesi yoksa Türkçesi. */
export function yaz(deger, dil = 'tr') {
  if (!deger) return ''
  if (typeof deger === 'string') return deger
  return (dil === 'en' ? deger.en || deger.tr : deger.tr) || ''
}

/* ------------------------------------------------------------- Makineler

   Pakette 14 makine kaydı var ama ikisi "kapsam kaydı": bir kılavuzun
   kapsadığı modelleri toplayan iç kayıtlar (MCH_HAMMER_SERIES,
   MCH_PAKSAN_BALYA_SUPER). Bunlar müşteriye gösterilmiyor — müşteri
   kendi modelini seçiyor, akışlar zaten `model_scope` üzerinden ona da
   ulaşıyor.
   ========================================================================== */

function kapsamKaydiMi(m) {
  return !m.model || /kapsam kaydi/i.test(m.name || '')
}

/** Müşterinin seçebileceği modeller — kılavuz ailesine göre öbeklenmiş. */
export function makineListesi() {
  return MOTOR.listMachines()
    .filter((m) => !kapsamKaydiMi(m))
    .map((m) => ({
      ...m,
      /* Ekranda model adı yazıyor; "name" çoğu kayıtta modelle aynı. */
      ekranAdi: m.model && m.model !== m.name ? `${m.name} · ${m.model}` : m.name,
      aile: aileAdi(m),
    }))
}

/* Aynı kılavuzdan gelen modeller bir arada dursun. Aile adı
   makinenin `tags` alanından ya da kimliğinden çıkıyor. */
function aileAdi(m) {
  const id = m.machine_id
  if (id.startsWith('MCH_HAMMER')) return 'Hammer'
  if (id.startsWith('MCH_TWIN_HAMMER')) return 'Twin Hammer'
  if (id.startsWith('MCH_ORKA')) return 'Orka'
  if (id.startsWith('MCH_IPAK')) return 'i-Pak'
  if (id.startsWith('MCH_SUPER')) return 'Süper / Yunus'
  return 'Diğer'
}

export function makineBul(machineId) {
  return MOTOR.listMachines().find((m) => m.machine_id === machineId) || null
}

/* --------------------------------------------------------- Arıza akışları */

export function arizalar(machineId, arama) {
  return MOTOR.listFlows(machineId, arama)
}

export function arizaBul(flowId) {
  return PAKET.flows.find((f) => f.flow_id === flowId) || null
}

/* ---------------------------------------------------- Sebep-cozum satirlari

   Kilavuzlarin ariza bolumu bir tablo: SORUN | SEBEP | COZUM. Paket bu
   tabloyu bir karar agacina cevirmis (dugumler, evet/hayir dallari) ama
   agacin YAPRAKLARI tablonun satirlarinin ta kendisi: her `result` bir
   sebep ve onun cozumu.

   Ekran tabloyu tablo olarak gosteriyor — cifci arizasina dokunuyor,
   kilavuzdaki butun olasi sebepleri ve cozumlerini bir arada goruyor.
   Soru sorulmuyor.

   Bir sonucun bagli oldugu ariza `problem_id` ile yaziyor; akislarda da
   ayni alan var (`flow_id` ile ayni deger). */
export function cozumler(flowId) {
  const f = arizaBul(flowId)
  if (!f) return []
  const anahtar = f.problem_id || f.flow_id
  return PAKET.results.filter((r) => r.problem_id === anahtar)
}

/** Kilavuz bu ariza icin yetkili servise gonderiyor mu? */
export function servisGerekli(flowId) {
  return cozumler(flowId).some((r) => r.service_cta === 'CONTACT_AUTHORIZED_SERVICE')
}

export function sistemAdi(flow, dil = 'tr') {
  void dil
  return flow?.system_name || ''
}

/* ------------------------------------------------- Kapsam kaydı bağlantısı

   Pakette bir kılavuzun kapsadığı modeller "kapsam kaydı" altında
   toplanıyor (MCH_HAMMER_SERIES, MCH_PAKSAN_BALYA_SUPER).

   Kayıtların hangi modele bağlandığı ailelere göre değişiyor:

     Hammer ailesinde güvenlik notlarının `model_scope` alanı
     varyantları da sayıyor → doğrudan eşleşiyor.

     Süper / Yunus ailesinde saymıyor; kayıt yalnız kapsam kaydına
     bağlı. Doğrudan eşleştirmede o modellerin güvenlik notu SIFIR
     çıkıyordu — çözüm adımlarından önce hiçbir uyarı gösterilmeden.

   Motor bu durumu zaten doğru çözüyor: akış içindeki güvenlik
   listesini alırken akışın kendi makine kaydına da bakıyor
   (bkz. mobile_support_runtime.ts → safetyFor). Buradaki liste
   yardımcıları da aynı kuralı izliyor.

   Bir modelin kapsam kaydı, o modele açık olan akışların bağlı olduğu
   makine kayıtlarından çıkarılıyor. */
function kapsamKimlikleri(machineId) {
  const kimlikler = new Set([machineId])
  for (const f of PAKET.flows) {
    if (f.machine_id === machineId || (f.model_scope || []).includes(machineId)) {
      kimlikler.add(f.machine_id)
    }
  }
  return kimlikler
}

function kapsamdaMi(kayit, kimlikler, machineId) {
  return (
    kimlikler.has(kayit.machine_id) || (kayit.model_scope || []).includes(machineId)
  )
}

/* ------------------------------------------------------- Hızlı cevaplar

   Teknik özelliklerden üretilmiş soru-cevap görünümleri. Paket bunları
   "kaynak FAQ kaydı değildir" diye işaretliyor; ekranda da böyle
   etiketleniyorlar.

   Hızlı cevaplar KAPSAMA GENİŞLETİLMİYOR: bunlar ağırlık, ölçü,
   bağlayıcı sayısı gibi varyanta özel değerler. Kapsam kaydına
   yayılırsa iki ipli makinenin sahibine üç ipli makinenin değerleri
   gösterilir.                                                          */

export function hizliCevaplar(machineId) {
  if (!machineId) return []
  return PAKET.quick_answers.filter(
    (q) => q.machine_id === machineId || (q.model_scope || []).includes(machineId)
  )
}

/* ------------------------------------------------------ Prosedür kartları */

export function bilgiKartlari(machineId) {
  if (!machineId) return []
  const kimlikler = kapsamKimlikleri(machineId)
  return PAKET.knowledge_cards.filter((c) => kapsamdaMi(c, kimlikler, machineId))
}

/* ------------------------------------------------------------- Güvenlik */

export function guvenlikNotlari(machineId) {
  if (!machineId) return []
  const kimlikler = kapsamKimlikleri(machineId)
  return PAKET.safety.filter((s) => kapsamdaMi(s, kimlikler, machineId))
}

/* Makineye el surmeden once okunmasi gerekenler.

   Guvenlik kayitlarinin tamami (bir makinede 50'yi geciyor) bir ariza
   satirinin altina sigmaz; cogu tasima ve tarlada calisma uyarisi.
   Burada yalniz "makineyi durdurup uzerinde is yapmak" ile ilgili
   kategoriler suzuluyor: bakim, hareketli parca, kuyruk mili. */
const MUDAHALE_KATEGORI = ['MAINTENANCE', 'MOVING_PARTS', 'PTO']

/* Kategori her kilavuzda dolu degil: ORKA kilavuzunun 58 uyarisinin
   tamami "OTHER" olarak cikmis. Kategori bir sey vermezse uyarinin
   METNINE bakiliyor — makineyi durdurmayi, kontagi kapatmayi, kuyruk
   milini ayirmayi anlatan cumleler zaten aranan cumleler.

   Uyari uydurulmuyor; yalniz kilavuzun kendi cumleleri suzuluyor. */
const MUDAHALE_KELIME = [
  'durdur', 'kontak', 'kuyruk mili', 'pto', 'takoz', 'hareketli',
  'bakım', 'tamir', 'onarım', 'anahtarı',
]

export function mudahaleUyarilari(machineId) {
  const hepsi = guvenlikNotlari(machineId)

  const kategoriyle = hepsi.filter((s) =>
    MUDAHALE_KATEGORI.includes(s.hazard_category)
  )
  if (kategoriyle.length) return kategoriyle

  return hepsi.filter((s) => {
    const metin = yaz(s.text).toLocaleLowerCase('tr')
    return MUDAHALE_KELIME.some((k) => metin.includes(k))
  })
}

/* --------------------------------------------------------- Kaynak yazısı

   "Kılavuz, s. 34" — pakette her kaydın kaynağı duruyor. Müşteri
   bilginin nereden geldiğini görüyor, servisçi kılavuzu açabiliyor. */

export function kaynak(kayit) {
  const k = kayit?.source?.[0]
  if (!k) return null
  return {
    kilavuz: (k.document_filename || '').replace(/\s*\d{8}\.pdf$/i, ''),
    sayfa: k.page,
    bolum: k.section,
    alinti: k.source_text,
  }
}

export function kaynakYazisi(kayit) {
  const k = kaynak(kayit)
  if (!k) return ''
  return k.sayfa ? `${k.kilavuz} · s. ${k.sayfa}` : k.kilavuz
}
