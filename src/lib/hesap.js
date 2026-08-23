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

async function ozet(metin) {
  const veri = new TextEncoder().encode(metin)
  const tampon = await crypto.subtle.digest('SHA-256', veri)
  return [...new Uint8Array(tampon)].map((x) => x.toString(16).padStart(2, '0')).join('')
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

  /* Şifre sisteminden önce açılmış kayıtlarda şifre yok; ilk girişte
     şifresiz geçiliyor, kullanıcı sonra profilden şifre koyabiliyor. */
  if (!kayitli.sifre) return { durum: GIRIS_SONUC.BULUNDU, user: kayitli }

  if (!(await sifreDogruMu(sifre, kayitli.sifre))) {
    return { durum: GIRIS_SONUC.SIFRE_YANLIS }
  }
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
    /* Sunucu varken kod cihazda bilinmiyor, doğrulama sunucuda */
    acikKod = { ...acikKod, kod: null }
    return { gonderildi: true }
  }

  return { gonderildi: true, demoKod: kod }
}

export function otpKontrol(girilen) {
  if (!acikKod) return false
  if (Date.now() > acikKod.bitis) return false
  return acikKod.kod === String(girilen || '').trim()
}

export function otpTemizle() {
  acikKod = null
}

