import { KVKK_SURUM } from '../data/kvkk'
import { SURUM } from '../marka'

/* ==========================================================================
   KVKK onaylarının kaydı — Connect

   NEDEN VAR (29 Eylül 2026, kullanıcının isteği: "KVKK, Açık Rıza Metni
   ve İzinler kısmı gözden geçirilecek"). Önce hesapta yalnız son durum
   duruyordu: üç evet/hayır, bir sürüm, bir tarih. Kampanya izni
   Profil'den açılıp kapatılınca tarih yazılmıyordu; kimin hangi metni ne
   zaman, hangi dilde onayladığı, iznini ne zaman geri aldığı sonradan
   gösterilemiyordu. Rıza bir kanıt meselesi: "evet" yetmez, ne zaman ve
   hangi metne verildiği de gerekir.

   ŞİMDİ İKİSİ BİRDEN. `hesap.onaylar` bugünkü durumu taşımaya devam
   ediyor (duyuru süzgeci, backoffice ve rapor onu okuyor); yanına
   `olaylar` geldi: her karar ayrı satır, SİLİNMEZ ve DEĞİŞTİRİLMEZ,
   yalnız eklenir. Veritabanında karşılığı kvkk.RizaOlayi (metin kodu,
   sürüm, dil, seçim, kanal) — kodlar oradaki listelerle aynı
   (veritabani/tohum/kaynak/kod-adlari.json → kod.RizaSecimi,
   kod.RizaKanali).

   METİN SÜRÜMÜ DEĞİŞİNCE (src/data/kvkk.js → KVKK_SURUM) eski sürümü
   onaylamış hesaba uygulama açılınca yeni metin gösteriliyor ve onayı
   yeniden alınıyor (components/KvkkGuncelleme.jsx). Açık rıza kayıtta
   zorunlu olduğu için (kullanıcının kararı, 29 Eylül 2026: "şimdilik
   olduğu gibi kalsın") değişen metne de yeniden verilmeli.
   ========================================================================== */

/* Metin kodları src/data/kvkk.js'teki `id` alanıyla ve veritabanındaki
   MetinKodu ile aynı. */
export const RIZA_METNI = {
  AYDINLATMA: 'aydinlatma',
  ACIK_RIZA: 'acikRiza',
  KAMPANYA: 'ticariIleti',
}

export const RIZA_KANALI = {
  KAYIT: 'connectKayit',
  PROFIL: 'connectProfil',
  GUNCELLEME: 'connectGuncelleme',
}

/** Tek bir karar satırı. `secim`: onay | ret | geriCekme. */
export function rizaOlayi(metin, secim, kanal, dil, zaman = Date.now()) {
  return { metin, secim, surum: KVKK_SURUM, dil: dil || 'tr', kanal, tarih: zaman, uygulamaSurumu: SURUM }
}

/** Kayıt ekranının yazdığı onaylar: iki zorunlu metin ve kampanya kararı. */
export function kayitOnaylari({ kampanya, dil }) {
  const z = Date.now()
  return {
    aydinlatma: true,
    acikRiza: true,
    kampanya: Boolean(kampanya),
    surum: KVKK_SURUM,
    tarih: z,
    kampanyaTarih: z,
    olaylar: [
      rizaOlayi(RIZA_METNI.AYDINLATMA, 'onay', RIZA_KANALI.KAYIT, dil, z),
      rizaOlayi(RIZA_METNI.ACIK_RIZA, 'onay', RIZA_KANALI.KAYIT, dil, z),
      /* Kutuyu işaretlemeyen de karar vermiş sayılıyor: "ret" yazılıyor,
         sonradan açarsa ne zaman açtığı ayrı görünsün. */
      rizaOlayi(RIZA_METNI.KAMPANYA, kampanya ? 'onay' : 'ret', RIZA_KANALI.KAYIT, dil, z),
    ],
  }
}

/** Kampanya izni Profil → Gizlilik ve İzinler'den açıldı ya da kapandı. */
export function kampanyaDegisti(onaylar, acik, dil) {
  const z = Date.now()
  return {
    ...(onaylar || {}),
    kampanya: Boolean(acik),
    kampanyaTarih: z,
    olaylar: [
      ...(onaylar?.olaylar || []),
      rizaOlayi(RIZA_METNI.KAMPANYA, acik ? 'onay' : 'geriCekme', RIZA_KANALI.PROFIL, dil, z),
    ],
  }
}

/** Metin güncellenince iki zorunlu metnin yeni sürümüne verilen onay. */
export function guncellemeOnayi(onaylar, dil) {
  const z = Date.now()
  return {
    ...(onaylar || {}),
    aydinlatma: true,
    acikRiza: true,
    surum: KVKK_SURUM,
    tarih: z,
    olaylar: [
      ...(onaylar?.olaylar || []),
      rizaOlayi(RIZA_METNI.AYDINLATMA, 'onay', RIZA_KANALI.GUNCELLEME, dil, z),
      rizaOlayi(RIZA_METNI.ACIK_RIZA, 'onay', RIZA_KANALI.GUNCELLEME, dil, z),
    ],
  }
}

/** Hesap bugünkü metinleri onaylamamışsa true (eski sürüm ya da hiç). */
export function onayYenilenmeli(user) {
  if (!user) return false
  return user.onaylar?.surum !== KVKK_SURUM
}

/** Kampanya izninin son değiştiği an: yeni alan yoksa eski kayıtlarda
    kayıt anı. */
export function kampanyaSonDegisiklik(onaylar) {
  if (!onaylar) return null
  if (onaylar.kampanyaTarih) return onaylar.kampanyaTarih
  const son = [...(onaylar.olaylar || [])].reverse().find((o) => o.metin === RIZA_METNI.KAMPANYA)
  return son?.tarih || onaylar.tarih || null
}
