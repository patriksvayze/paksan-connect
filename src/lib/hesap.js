/* ==========================================================================
   Hesap işlemleri — kayıt, giriş, şifre

   Uygulamanın geri kalanı "hesap nerede tutuluyor" sorusunu bilmez;
   yalnızca buradaki fonksiyonları çağırır. Sunucu geldiğinde sadece bu
   dosya değişir (config.js → GIRIS.sunucu = true).

   GİRİŞ NEDEN ŞİFRELİ:
   Bir çiftlikte aynı hesabı birden fazla kişi kullanabiliyor (baba,
   oğul, çalışan). Her birine ayrı hesap açtırmak yerine tek hesabın
   şifresi paylaşılıyor. Bu yüzden giriş "telefon + şifre".

   Şifre 6 rakam: tarlada eldivenle uzun şifre yazmak zor, rakam tuş
   takımı büyük çıkıyor ve akılda kalıyor.

   NUMARA DEĞİŞİKLİĞİ KULLANICIDA DEĞİL:
   Giriş numarası hesabın kimliği. Kullanıcı kendi başına
   değiştirebilseydi, telefonu eline geçiren biri hesabı devralabilirdi.
   Bu yüzden numara değişikliği yalnızca PAKSAN yetkilisi tarafından,
   müşteri talebiyle yapılıyor (bkz. src/screens/NumaraDegisikligi.jsx).
   ========================================================================== */

import { GIRIS } from '../config'
import { load, save } from './storage'
import { telAnahtar } from './tel'
import { VARSAYILAN_ULKE } from '../data/ulkeler'

export const SIFRE_HANE = 6

export const GIRIS_SONUC = {
  BULUNDU: 'bulundu',
  BULUNAMADI: 'bulunamadi',
  SIFRE_YANLIS: 'sifre-yanlis',
  HATA: 'hata',
  /* Şifresiz açılmış eski kayıt: giriş verilmiyor, şifre koyma yoluna
     gönderiliyor (aşağıda gerekçesi yazılı). */
  SIFRE_KURULUM: 'sifre-kurulum',
}

/* ------------------------------------------------------------------ Şifre */

/* Şifre asla düz metin saklanmıyor. Telefonun hafızasına bakan biri
   şifreyi okuyamasın diye tuzlanıp özetleniyor (SHA-256). Sunucu
   geldiğinde bu iş sunucuya geçecek; o zaman şifre cihazda hiç
   durmayacak. */

function tuzUret() {
  const d = new Uint8Array(16)
  crypto.getRandomValues(d)
  return [...d].map((x) => x.toString(16).padStart(2, '0')).join('')
}

/* ÖZET ÜRETİLEMEYEN HÂL SESSİZ KALMIYOR.

   `crypto.subtle` yalnızca güvenli kökende var: https, ya da localhost.
   Telefonla denerken adres http://<yerel-IP> oluyor (vite.config.js →
   host: true), iç ağda düz HTTP ile yayınlanan bir backoffice de aynı
   durumda. O kökende `crypto.subtle` tanımsız ve digest çağrısı hata
   atıyor.

   Eskiden bu hata hiçbir yerde yakalanmıyordu: giriş düğmesi
   "Giriliyor…" yazısında sonsuza kadar kalıyor, ekranda tek kelime
   çıkmıyordu. Artık tanınabilir bir hata atılıyor; çağıran ekran
   `ozetHatasiMi()` ile bunu ayırıp düğmeyi serbest bırakıyor ve
   sebebini yazıyor.                                                    */

export const OZET_HATA = 'ozet-uretilemedi'

export class OzetHatasi extends Error {
  constructor(sebep) {
    super(OZET_HATA)
    this.name = 'OzetHatasi'
    this.kod = OZET_HATA
    this.sebep = sebep
  }
}

/** Yakalanan hata şifre özetinin üretilememesinden mi? */
export function ozetHatasiMi(e) {
  return e?.kod === OZET_HATA
}

async function ozet(metin) {
  if (!globalThis.crypto?.subtle?.digest) throw new OzetHatasi('guvenli-koken-yok')
  try {
    const veri = new TextEncoder().encode(metin)
    const tampon = await crypto.subtle.digest('SHA-256', veri)
    return [...new Uint8Array(tampon)].map((x) => x.toString(16).padStart(2, '0')).join('')
  } catch (e) {
    if (ozetHatasiMi(e)) throw e
    throw new OzetHatasi(e?.message || 'digest-hatasi')
  }
}

/** Yeni şifre için saklanacak nesneyi üretir. */
export async function sifreHazirla(sifre) {
  const tuz = tuzUret()
  return { tuz, ozet: await ozet(tuz + ':' + sifre) }
}

/** Girilen şifre kayıtlı şifreyle aynı mı? */
export async function sifreDogruMu(sifre, kayitliSifre) {
  if (!kayitliSifre?.tuz) return false
  return (await ozet(kayitliSifre.tuz + ':' + sifre)) === kayitliSifre.ozet
}

export function sifreGecerliMi(sifre) {
  return new RegExp(`^\\d{${SIFRE_HANE}}$`).test(sifre || '')
}

/* ------------------------------------------------------------------ Giriş */

/**
 * Telefon numarası ve şifreyle giriş dener.
 * @returns {Promise<{durum: string, user?: object, mesaj?: string}>}
 */
export async function girisDene({ ulke = VARSAYILAN_ULKE, tel, sifre }) {
  const anahtar = telAnahtar(ulke, tel)

  if (GIRIS.sunucu && GIRIS.endpoint) {
    /* Sunucu hazır olduğunda burası devreye girer. Beklenen akış:
         POST {endpoint}/giris   { tel, sifre }  → { user } | 401
       Şifre kontrolü sunucuda yapılacak; cihazda şifre hiç durmayacak. */
    try {
      const cevap = await fetch(GIRIS.endpoint + '/giris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tel: anahtar, sifre }),
      })
      if (cevap.status === 401) return { durum: GIRIS_SONUC.SIFRE_YANLIS }
      if (!cevap.ok) throw new Error('sunucu')
      const veri = await cevap.json()
      return veri.user
        ? { durum: GIRIS_SONUC.BULUNDU, user: veri.user }
        : { durum: GIRIS_SONUC.BULUNAMADI }
    } catch {
      return {
        durum: GIRIS_SONUC.HATA,
        mesaj: 'giris.sunucuYok',
      }
    }
  }

  /* Sunucusuz hâl: bu telefonda kayıt var mı?
     'hesap' çıkışta silinmez, bu yüzden çıkış yapan kullanıcı aynı
     numara ve şifreyle geri girebilir. */
  const kayitli = load('hesap', null)
  if (!kayitli || hesapAnahtari(kayitli) !== anahtar) {
    return { durum: GIRIS_SONUC.BULUNAMADI }
  }

  /* ŞİFRESİZ ESKİ KAYIT ARTIK İÇERİ ALINMIYOR.

     Şifre sisteminden önce açılmış kayıtlarda `sifre` alanı yok. Burada
     bir süre "ilk girişte şifresiz geç, kullanıcı sonra profilden şifre
     koyar" yazıyordu: telefonu eline geçiren herkes o hesaba şifre
     sormadan giriyordu — hesabın tek kilidi olan şifre, kilidi hiç
     konmamış kayıtlarda yok sayılıyordu. "Sonra koyar" kısmı da
     kullanıcının isteğine bırakılmıştı.

     Artık giriş verilmiyor, kullanıcı şifre koyma yoluna gönderiliyor
     (ekran: src/screens/SifreSifirla.jsx). Orada şifre cihazın kendi
     kaydına yazılıyor, sunucu gerekmiyor — yani bu karar kimseyi
     hesabının dışında bırakmıyor, yalnızca bir kez şifre koymasını
     istiyor. */
  if (!kayitli.sifre) return { durum: GIRIS_SONUC.SIFRE_KURULUM, user: kayitli }

  /* Özet üretilemezse (güvenli köken yok) "şifre yanlış" demek yanlış
     olur: şifre doğru olabilir, kontrol edilemiyor. */
  let dogru
  try {
    dogru = await sifreDogruMu(sifre, kayitli.sifre)
  } catch (e) {
    if (!ozetHatasiMi(e)) throw e
    return { durum: GIRIS_SONUC.HATA, mesaj: 'giris.ozetYok' }
  }

  if (!dogru) return { durum: GIRIS_SONUC.SIFRE_YANLIS }
  return { durum: GIRIS_SONUC.BULUNDU, user: kayitli }
}

/** Bir hesabın eşleştirme anahtarı (ülke kodu + numara). */
export function hesapAnahtari(hesap) {
  if (!hesap) return ''
  return telAnahtar(hesap.ulke || VARSAYILAN_ULKE, hesap.tel)
}

/**
 * Bu numaraya ait bir hesap zaten var mı?
 * Kayıt ekranında aynı numarayla ikinci hesap açılmasını engellemek için.
 * @returns {object|null} varsa kayıtlı hesap
 */
export function mevcutHesap(ulke, tel) {
  const anahtar = telAnahtar(ulke, tel)
  if (!anahtar) return null
  const kayitli = load('hesap', null)
  if (kayitli && hesapAnahtari(kayitli) === anahtar) return kayitli
  return null
}

/** Kayıtlı hesabın şifresini değiştirir (oturum açıkken). */
export async function sifreyiDegistir(yeniSifre) {
  const kayitli = load('hesap', null)
  if (!kayitli) return false
  const yeni = { ...kayitli, sifre: await sifreHazirla(yeniSifre) }
  save('hesap', yeni)
  return yeni
}

/* -------------------------------------------------------------------- OTP

   Şifre sıfırlama SMS koduyla yapılıyor. Sunucu olmadığı için kod
   şimdilik cihazda üretiliyor ve ekranda gösteriliyor (demo uyarısı).
   Sunucu geldiğinde `otpGonder` gerçek SMS isteyecek, kod bir daha
   ekranda görünmeyecek — bkz. PRODA-CIKIS.md → C.                      */

export const OTP_SURE = 120 /* saniye */

/* Kod kontrolünün sonucu "doğru/yanlış" değil, dört ayrı hâl. Önce
   boolean dönüyordu ve bu bir tuzak kurmuştu: sunucu açıkken kod
   cihazda bilinmediği için karşılaştırma her zaman false veriyor,
   ekran da doğru kodu yazan kullanıcıya "kod yanlış" diyordu. Hâller
   ayrılınca ekran sebebi söyleyebiliyor. */
export const OTP_SONUC = {
  GECERLI: 'gecerli',
  YANLIS: 'yanlis',
  SURE_DOLDU: 'sure-doldu',
  KOD_YOK: 'kod-yok',
  /* Sunucu açık: doğrulama cihazda yapılamaz, sunucuda da yapılacak
     bir uç yok. Şifre sıfırlama bu hâlde ÇALIŞMIYOR; ekran bunu
     açıkça söylüyor (aşağıdaki nota bak). */
  SUNUCUDA: 'dogrulama-sunucuda',
}

let acikKod = null

/** Kodu "gönderir". Demo sürümünde kodu geri döndürür. */
export async function otpGonder({ ulke = VARSAYILAN_ULKE, tel }) {
  const kod = String(Math.floor(100000 + Math.random() * 900000))
  acikKod = {
    kod,
    anahtar: telAnahtar(ulke, tel),
    bitis: Date.now() + OTP_SURE * 1000,
  }

  if (GIRIS.sunucu && GIRIS.endpoint) {
    try {
      await fetch(GIRIS.endpoint + '/sifre-sifirla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tel: acikKod.anahtar }),
      })
    } catch {
      return { gonderildi: false }
    }
    /* SUNUCU AÇIKKEN ŞİFRE SIFIRLAMA TAMAMLANAMIYOR — EKSİK OLAN NE:

       Kod cihazda bilinmiyor (doğru olan bu: bilinirse ekranda da
       görünebilir). Doğrulamanın sunucuda yapılması gerekiyor ama
       sözleşmede öyle bir uç yok: src/config.js → GIRIS yalnız
       `/giris` ve `/sifre-sifirla` yollarını tanımlıyor.

       Sunucudan beklenen, bugün OLMAYAN iki yol:
         POST {endpoint}/sifre-dogrula  { tel, kod }        → { jeton } | 401
         POST {endpoint}/sifre-yaz      { tel, jeton, sifre } → { tamam } | 401
       İkincisi de gerekiyor: yeni şifre şu an yalnız cihaza yazılıyor
       (src/screens/SifreSifirla.jsx → sifreyiKaydet), sunucudaki
       şifreyi değiştiren bir yol yok (sifreyiDegistir'in de sunucu
       dalı yok).

       Bu yüzden burada uydurma bir çağrı yapılmıyor; eksiklik açıkça
       işaretleniyor. `sunucuda` damgası otpKontrol'ü
       OTP_SONUC.SUNUCUDA döndürmeye zorluyor, ekran da "kod yanlış"
       demek yerine durumu söylüyor. Bayrağı açan kişi bunu ilk
       denemede görsün diye konsola da yazılıyor. */
    acikKod = { ...acikKod, kod: null, sunucuda: true }
    console.error(
      'hesap.otpGonder: GIRIS.sunucu=true — sifre sifirlama dogrulama ucu yok'
      + ' (bkz. src/lib/hesap.js → OTP_SONUC.SUNUCUDA)',
    )
    return { gonderildi: true, dogrulama: OTP_SONUC.SUNUCUDA }
  }

  return { gonderildi: true, demoKod: kod }
}

/** @returns {string} OTP_SONUC değerlerinden biri. */
export function otpKontrol(girilen) {
  if (!acikKod) return OTP_SONUC.KOD_YOK
  if (acikKod.sunucuda) return OTP_SONUC.SUNUCUDA
  if (Date.now() > acikKod.bitis) return OTP_SONUC.SURE_DOLDU
  return acikKod.kod === String(girilen || '').trim()
    ? OTP_SONUC.GECERLI
    : OTP_SONUC.YANLIS
}

export function otpTemizle() {
  acikKod = null
}

