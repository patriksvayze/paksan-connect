/* ==========================================================================
   Backoffice’in veri katmanı

   Bütün ekranlar veriye yalnız buradan ulaşıyor. Şu an veri tarayıcının
   hafızasında; sunucu geldiğinde bu dosyadaki fonksiyonların içi sunucu
   çağrısıyla değişecek, ekranlara dokunulmayacak.
   ========================================================================== */

import { load, save, uid, remove, oturumYukle, oturumKaydet, oturumSil } from '../lib/storage'
import { sifreHazirla, sifreDogruMu, sifreGecerliMi } from '../lib/hesap'
import { yeniNo } from '../lib/numara'
import { talepNo } from '../lib/talep'
import { SIRKET, MARKA, markaEk, PARA_BIRIMI, kdvTutari } from '../marka'
import { urun } from '../lib/urun'
import { ASAMA, kaydiDogrula, kaydiCozume, kapininSonucu } from '../lib/servisKaydi.js'
import { teslimatTemizle } from '../lib/teslimat.js'
import { servisleriGetir } from '../marka'
import { icerikListe, icerikTazele } from '../lib/icerikDeposu.js'
import { altBilgi } from '../data/duyuruTurleri.js'
import { SERI_CAKISMASI } from '../lib/numaraTalebi.js'
import { telGoster } from '../lib/tel.js'
import { normalizeSerial, validateSerial } from '../lib/serial.js'
import {
  rolKimligi, TUM_IZINLER, VARSAYILAN_ROLLER, YETKISIZ_ROL,
} from '../data/yetkiler.js'

export const ANAHTAR = {
  kullanici: 'user',
  hesap: 'hesap',
  makineler: 'machines',
  makineKayitlari: 'makineKayitlari',
  talepler: 'requests',
  geriBildirim: 'geribildirim',
  duyurular: 'duyurular',
  /* İki anahtar hâlâ eski adıyla: 'panel' → 'backoffice' değişikliğinde
     bunlar bilerek dokunulmadı. Anahtar değişse tarayıcıda duran oturum
     kapanır ve girilmiş servis listesi kaybolur. Sunucuya geçilirken bu
     veriler taşınacağı için o zaman düzeltilecek. */
  icerik: 'panelIcerik',
  islemKaydi: 'islemKaydi',
  oturum: 'panelOturum',
  servisOturum: 'servisOturum',
  personel: 'personel',
  numaraTalepleri: 'numaraTalepleri',
  sifreTalepleri: 'sifreTalepleri',
  /* Servisin "şifremi unuttum" kaydı. Personelinkinden ayrı: serviste
     e-posta yok, akış telefonla yürüyor. */
  servisSifreTalep: 'servisSifreTalep',
  destekLog: 'destekLog',

  /* Servisin PAKSAN'daki cari hesap hareketleri. Hak ediş onaylandıkça
     alacak, ödeme yapıldıkça borç yazılıyor. */
  cari: 'cariHareket',

  /* Demo kayıtları uygulamanın kendi kayıtlarından ayrı duruyor:
     backoffice’te görünüyor ama müşterinin telefonuna karışmıyor. */
  demoMusteriler: 'demoMusteriler',
  demoTalepler: 'demoTalepler',
}

/* ------------------------------------------------------------------ Roller

   Uygulamada üç tür talep açılıyor ve her birine şirkette başka bir ekip
   bakıyor. Backoffice’e giren kişi bölümünü kendisi seçmiyor — hesabı admin
   açarken hangi rolde olduğu belirleniyor.

   ROLLER ARTIK KODDA SABİT DEĞİL. Tanımları ve yetkileri backoffice'ten
   düzenleniyor (bkz. ekranlar/Roller.jsx); bu dosya yalnız depoyu
   yönetiyor. Varsayılan liste ve yetki kataloğu src/data/yetkiler.js
   içinde, gerekçeleriyle birlikte.                                     */

/** Yürürlükteki rol listesi — düzenlenmediyse koddaki varsayılan. */
/* ADMİNİN İZİNLERİ KATALOGTAN OKUNUYOR, DEPODAN DEĞİL.

   Rol listesine bir kez dokunulduğunda listenin TAMAMI depoya yazılıyor
   (bkz. lib/icerikDeposu.js → icerikListe) ve o günün izin kümesi orada
   donuyor. Katalogta sonradan açılan bir izin hiçbir role girmiyor,
   ADMİNE DE: izni arayan düğme ekranda hiç çıkmıyor ve bu fark
   edilmiyor, çünkü görünmeyen bir düğmenin yokluğu hata vermiyor.
   `kimlikNo` izni tam böyle oldu — maskeyi kaldıran düğme yazıldı,
   katalog satırı eklendi, ama depoda eski küme duruyordu.

   Admin sistemin çıpası ve kilitli: `rolGuncelle` onu değiştirmeyi
   reddediyor, tanımı da "her şeyi görür ve yapar" (bkz. yetkiler.js →
   VARSAYILAN_ROLLER). O tanım burada her okumada yeniden kuruluyor;
   katalog büyüdükçe admin de büyüyor.

   ÖTEKİ ROLLER DEPODAKİNİ KORUYOR. Yeni bir izin kimseye sessizce
   dağıtılmaz: hangi rolün neyi göreceğine PAKSAN karar veriyor. */
export function rolleriGetir() {
  return icerikListe('roller', VARSAYILAN_ROLLER).map((r) =>
    r.id === 'admin' ? { ...r, izinler: TUM_IZINLER } : r,
  )
}

/* Rolün kaydı.

   TANINMAYAN ROL YETKİSİZ DÖNÜYOR. Önce listenin üçüncü satırı (Servis)
   dönüyordu; rolü silinen kişi Servis yetkisiyle çalışmaya başlardı.
   Gerekçesi yetkiler.js → YETKISIZ_ROL. */
export function rolBilgi(id) {
  return rolleriGetir().find((r) => r.id === id) || YETKISIZ_ROL
}

/** Bu roldeki kişi bu işi yapabiliyor mu? */
export function izinli(rol, is) {
  return (rolBilgi(rol).izinler || []).includes(is)
}

/* ==========================================================================
   Rolün göreceği talepler

   İki kapı var ve ikisi de gerekli:

     1. KENDİ TÜRÜ — servis rolü servis taleplerini, yedek parça rolü
        parça taleplerini görüyor. Talep türü seçilmemiş rol (admin,
        yönetici) hepsini görüyor.

     2. MASASINDA BEKLEYEN — türü başka olsa bile şu an o masanın
        önünde duran talep.

   İKİNCİ KAPI NEDEN VAR

   Servis sahada iş bitirip garanti dışı bir parça istediğinde, o
   parçayı hazırlayacak kişi yedek parça personeli. Ama talebin türü
   `servis`; birinci kapı onu yedek parçaya hiç göstermezdi.

   Alternatifi aynı iş için ikinci bir talep açmaktı — yani bir işin
   listede iki satır olması. Tam da kaçınılan şey o: talebi bölmek
   yerine, talebi bekleyen masaya gösteriyoruz. İş tek, satır tek,
   kimin sırası olduğu `masa` alanında yazılı.

   `masa` alanı rolün `talepTuru` ile AYNI SÖZLÜĞÜ kullanıyor
   ('servis' | 'parca'). Böylece yönlendirme tek karşılaştırma
   kalıyor ve üçüncü bir eşleme tablosu doğmuyor.                    */

/** Rolün göreceği talepler: kendi türü + şu an masasında bekleyenler. */
export function rolunTalepleri(liste, rol) {
  const tur = rolBilgi(rol).talepTuru
  if (!tur) return liste
  return liste.filter((t) => t.tur === tur || t.masa === tur)
}

/* -------------------------------------------------- Rol listesini yazmak

   Servis listesiyle aynı yol: depoya yazılıyor, okuyan tarafın belleği
   tazeleniyor, işlem kaydına satır düşüyor. Rol değişikliği bir güvenlik
   olayı — kaydı tutulmadan yapılmıyor.                                  */

function rolleriYaz(liste, personel, ozet) {
  const mevcut = load(ANAHTAR.icerik, {})
  save(ANAHTAR.icerik, { ...mevcut, roller: liste })
  icerikTazele()
  islemYaz({ tur: 'rol', ozet, personel })
}

/** Rolde kaç kişi var? Silme ve son admin kontrolü buna bakıyor. */
export function rolunPersoneli(rolId) {
  return personelGetir().filter((p) => p.rol === rolId)
}

/**
 * Yeni rol açar.
 *
 * @returns {{rol}|{hata}}
 */
export function rolEkle({ ad, aciklama, talepTuru, izinler }, personel) {
  const temizAd = String(ad || '').trim()
  if (temizAd.length < 2) return { hata: 'Rol adını yazın.' }

  const id = rolKimligi(temizAd)
  if (!id) return { hata: 'Rol adı en az bir harf içermeli.' }

  const liste = rolleriGetir()
  if (liste.some((r) => r.id === id)) return { hata: 'Bu adda bir rol zaten var.' }

  const rol = {
    id,
    ad: temizAd,
    aciklama: String(aciklama || '').trim(),
    talepTuru: talepTuru || null,
    izinler: temizIzinler(izinler),
  }
  rolleriYaz([...liste, rol], personel, `${rol.ad} rolü oluşturuldu`)
  return { rol }
}

/**
 * Rolün adını, açıklamasını, gördüğü talep türünü ve yetkilerini yazar.
 *
 * ADMIN DEĞİŞTİRİLEMİYOR: yetkisini kaldıran admin ekranı bir daha
 * açamaz ve geri dönüş yolu yoktur (bkz. yetkiler.js).
 *
 * @returns {{rol}|{hata}}
 */
export function rolGuncelle(id, degisiklik, personel) {
  const liste = rolleriGetir()
  const mevcut = liste.find((r) => r.id === id)
  if (!mevcut) return { hata: 'Rol bulunamadı.' }
  if (mevcut.sistem) return { hata: 'Admin rolü değiştirilemez.' }

  const temizAd = String(degisiklik.ad ?? mevcut.ad).trim()
  if (temizAd.length < 2) return { hata: 'Rol adını yazın.' }

  const izinler = temizIzinler(degisiklik.izinler ?? mevcut.izinler)

  /* SON YÖNETİCİ KORUMASI.

     Personel hesabı açma yetkisini hiç kimsede bırakmayacak bir değişiklik
     engelleniyor. Admin rolü kilitli olduğu için bu normalde
     olamıyor — ama admin rolündeki tek kişi silinmişse
     (`personelSil` onu da engelliyor) ikinci bir kapı olarak duruyor. */
  const yeni = liste.map((r) =>
    r.id === id
      ? {
          ...r,
          ad: temizAd,
          aciklama: String(degisiklik.aciklama ?? r.aciklama ?? '').trim(),
          talepTuru: degisiklik.talepTuru !== undefined ? degisiklik.talepTuru : r.talepTuru,
          izinler,
        }
      : r,
  )
  if (!yonetimKaliyorMu(yeni)) {
    return { hata: 'Personel hesabı açabilecek hiçbir rol kalmıyor. Bu değişiklik yapılamaz.' }
  }

  rolleriYaz(yeni, personel, `${temizAd} rolünün yetkileri güncellendi`)
  return { rol: yeni.find((r) => r.id === id) }
}

/**
 * Rolü siler ve o roldeki personeli başka rollere taşır.
 *
 * PERSONEL ROLSÜZ BIRAKILMIYOR: rolde kişi varsa her biri için hedef
 * rol şart. Ekran bunu silme penceresinde soruyor.
 *
 * HERKES AYNI ROLE GİTMEK ZORUNDA DEĞİL. Önce tek bir hedef rol
 * alınıyordu; dört kişilik bir rol silinirken dördü de aynı yere gitmek
 * zorundaydı. Oysa bir ekip dağılırken ikisi servise, ikisi satışa
 * geçebilir. Taşıma artık kişi başına.
 *
 * @param {Object<string,string>} tasima { personelId: yeniRolId }
 * @returns {{silinen, tasinan}|{hata}}
 */
export function rolSil(id, tasima, personel) {
  const liste = rolleriGetir()
  const rol = liste.find((r) => r.id === id)
  if (!rol) return { hata: 'Rol bulunamadı.' }
  if (rol.sistem) return { hata: 'Admin rolü silinemez.' }

  const kisiler = rolunPersoneli(id)
  const harita = tasima || {}

  for (const k of kisiler) {
    const hedef = harita[k.id]
    if (!hedef || hedef === id) return { hata: `${k.ad} için yeni bir rol seçin.` }
    if (!liste.some((r) => r.id === hedef)) return { hata: 'Seçilen rol bulunamadı.' }
  }

  const kalan = liste.filter((r) => r.id !== id)
  if (!yonetimKaliyorMu(kalan)) {
    return { hata: 'Personel hesabı açabilecek hiçbir rol kalmıyor. Bu rol silinemez.' }
  }

  /* Önce personel taşınıyor, sonra rol siliniyor. Ters sırada olsaydı
     araya giren bir hata kişileri var olmayan bir rolde bırakırdı. */
  if (kisiler.length) {
    personelYaz(
      personelGetir().map((p) => (p.rol === id ? { ...p, rol: harita[p.id] } : p)),
    )
  }

  rolleriYaz(kalan, personel, silmeOzeti(rol, kisiler, harita, liste))
  return { silinen: rol, tasinan: kisiler.length }
}

/* İşlem kaydı satırı. Herkes aynı role gittiyse tek cümle; dağıldıysa
   hangi role kaç kişinin gittiği yazıyor — "3 kişi taşındı" demek,
   sonradan bakıldığında kimin nereye gittiğini söylemiyordu. */
function silmeOzeti(rol, kisiler, harita, liste) {
  if (!kisiler.length) return `${rol.ad} rolü silindi`

  const sayac = {}
  for (const k of kisiler) sayac[harita[k.id]] = (sayac[harita[k.id]] || 0) + 1

  const adi = (rolId) => liste.find((r) => r.id === rolId)?.ad || rolId
  const parcalar = Object.entries(sayac).map(([rolId, n]) => `${n} kişi ${adi(rolId)}`)
  return `${rol.ad} rolü silindi · ${parcalar.join(', ')} rolüne taşındı`
}

/** Katalogda olmayan izin kaydedilmiyor; ekran dışından gelen çöp durmasın. */
function temizIzinler(izinler) {
  return (izinler || []).filter((x) => TUM_IZINLER.includes(x))
}

/** Personel hesabı açabilecek en az bir rol kaldı mı? */
function yonetimKaliyorMu(liste) {
  return liste.some((r) => (r.izinler || []).includes('personelDuzenle'))
}

/* ---------------------------------------------------------------- Personel

   Hesaplar elle açılıyor: admin adı, kullanıcı adını ve rolü giriyor,
   6 haneli şifreyi belirliyor. Şifre düz metin saklanmıyor, uygulamada
   olduğu gibi tuzlanıp özetleniyor.                                    */

export const BACKOFFICE_SIFRE_HANE = 6

export function personelGetir() {
  return load(ANAHTAR.personel, [])
}

function personelYaz(liste) {
  save(ANAHTAR.personel, liste)
  return liste
}

/** Kullanıcı adı önerisi: "Serhat Tecimen" → "serhat.tecimen" */
export function kullaniciAdiOner(ad) {
  return String(ad || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .join('.')
}

function epostaAnahtari(eposta) {
  return String(eposta || '').trim().toLowerCase()
}

/* Backoffice boşken kimse giremezdi. İlk admin hesabı burada açılıyor;
   admin kendi hesabını açtıktan sonra bunu silebilir. */
export const ILK_ADMIN = { kullanici: 'admin', sifre: '123456' }

export async function personelBaslat() {
  const liste = personelGetir()
  if (liste.length) return liste
  return personelYaz([
    {
      id: uid(),
      no: yeniNo('personel'),
      ad: 'Sistem Yöneticisi',
      kullanici: ILK_ADMIN.kullanici,
      rol: 'admin',
      eposta: SIRKET.eposta,
      tel: '',
      aktif: true,
      createdAt: Date.now(),
      sonGiris: null,
      sifre: await sifreHazirla(ILK_ADMIN.sifre),
    },
  ])
}

export async function personelEkle(veri, yapan) {
  const liste = personelGetir()
  const kullanici = veri.kullanici.trim().toLocaleLowerCase('tr-TR')
  const eposta = epostaAnahtari(veri.eposta)

  if (liste.some((p) => p.kullanici === kullanici)) {
    return { hata: 'Bu kullanıcı adı zaten kullanılıyor.' }
  }
  if (eposta && liste.some((p) => epostaAnahtari(p.eposta) === eposta)) {
    return { hata: 'Bu e-posta adresi zaten kayıtlı. / This email address is already in use.' }
  }
  if (!sifreGecerliMi(veri.sifre)) {
    return { hata: 'Şifre 6 rakamdan oluşmalı.' }
  }

  const kayit = {
    id: uid(),
    no: yeniNo('personel'),
    ad: veri.ad.trim(),
    kullanici,
    rol: veri.rol,
    eposta,
    tel: veri.tel.trim(),
    aktif: true,
    createdAt: Date.now(),
    sonGiris: null,
    sifre: await sifreHazirla(veri.sifre),
  }

  personelYaz([...liste, kayit])
  islemYaz({
    tur: 'personel',
    ozet: `${kayit.no} ${kayit.ad} eklendi (${rolBilgi(kayit.rol).ad})`,
    personel: yapan,
  })
  return { kayit }
}

export async function personelGuncelle(id, degisiklik, yapan) {
  const liste = personelGetir()
  const eski = liste.find((p) => p.id === id)
  if (!eski) return { hata: 'Kayıt bulunamadı.' }

  const kullanici = (degisiklik.kullanici ?? eski.kullanici)
    .trim()
    .toLocaleLowerCase('tr-TR')
  const eposta = epostaAnahtari(degisiklik.eposta ?? eski.eposta)

  if (liste.some((p) => p.id !== id && p.kullanici === kullanici)) {
    return { hata: 'Bu kullanıcı adı zaten kullanılıyor.' }
  }
  if (eposta && liste.some((p) => p.id !== id && epostaAnahtari(p.eposta) === eposta)) {
    return { hata: 'Bu e-posta adresi zaten kayıtlı. / This email address is already in use.' }
  }

  const yeni = { ...eski, ...degisiklik, kullanici, eposta }

  /* Şifre yalnız yazıldıysa değişiyor; boş bırakılırsa eskisi kalıyor. */
  if (degisiklik.sifre) {
    if (!sifreGecerliMi(degisiklik.sifre)) return { hata: 'Şifre 6 rakamdan oluşmalı.' }
    yeni.sifre = await sifreHazirla(degisiklik.sifre)
  }

  personelYaz(liste.map((p) => (p.id === id ? yeni : p)))
  islemYaz({
    tur: 'personel',
    ozet: `${yeni.no} ${yeni.ad} güncellendi`,
    personel: yapan,
  })
  return { kayit: yeni }
}

export function personelSil(id, yapan) {
  const liste = personelGetir()
  const kayit = liste.find((p) => p.id === id)
  if (!kayit) return { hata: 'Kayıt bulunamadı.' }

  /* Son admin silinirse backoffice’e bir daha girilemez. */
  const kalanAdmin = liste.filter((p) => p.rol === 'admin' && p.id !== id).length
  if (kayit.rol === 'admin' && kalanAdmin === 0) {
    return { hata: 'Son yönetici hesabı silinemez.' }
  }

  personelYaz(liste.filter((p) => p.id !== id))
  islemYaz({ tur: 'personel', ozet: `${kayit.no} ${kayit.ad} silindi`, personel: yapan })
  return { silindi: true }
}

/* ------------------------------------------------------------------ Oturum */

export async function backofficeGiris(kullanici, sifre) {
  await personelBaslat()
  const ad = String(kullanici || '').trim().toLocaleLowerCase('tr-TR')
  const kayit = personelGetir().find((p) => p.kullanici === ad)

  if (!kayit) return { hata: 'Kullanıcı adı veya şifre yanlış.' }
  if (!kayit.aktif) return { hata: 'Bu hesap kapalı. Yöneticinize başvurun.' }
  if (!(await sifreDogruMu(sifre, kayit.sifre))) {
    return { hata: 'Kullanıcı adı veya şifre yanlış.' }
  }

  personelYaz(
    personelGetir().map((p) => (p.id === kayit.id ? { ...p, sonGiris: Date.now() } : p))
  )

  const oturum = {
    personelId: kayit.id,
    ad: kayit.ad,
    kullanici: kayit.kullanici,
    rol: kayit.rol,
    giris: Date.now(),
  }
  save(ANAHTAR.oturum, oturum)
  islemYaz({ tur: 'oturum', ozet: 'Backoffice girişi', personel: kayit.ad, rol: kayit.rol })
  return { oturum }
}

export function oturumGetir() {
  const o = load(ANAHTAR.oturum, null)
  /* Eski biçimdeki oturum kayıtlarında rol yok; yetkisi
     belirsiz biriyle backoffice açılmasın, yeniden giriş istensin. */
  if (!o?.rol || !o?.personelId) return null

  /* ROLÜ SİLİNMİŞ KİŞİNİN OTURUMU KAPANIYOR.

     Roller silinebiliyor; açık bir sekmenin oturumu, artık var olmayan
     bir rolü taşıyor olabilir. Kişinin rolü silinirken başka bir role
     taşınıyor (bkz. rolSil) ama oturumdaki kopya eski kimliği tutuyor.
     Yeniden giriş isteniyor; girişte güncel rol okunuyor. */
  if (!rolleriGetir().some((r) => r.id === o.rol)) return null

  return o
}

export function oturumKapat(o) {
  islemYaz({ tur: 'oturum', ozet: 'Backoffice çıkışı', personel: o?.ad, rol: o?.rol })
  save(ANAHTAR.oturum, null)
}

/* --------------------------------------------------------- Şifre değiştirme

   Personel şifresini kendisi değiştiriyor ama şifreyi bilmeden
   değiştiremiyor: giriş ekranından talep bırakınca kendi şirket e-posta
   adresine bir bağlantı gidiyor. Bağlantıyı açan kişi e-posta kutusuna
   erişebilen kişidir; kimlik böyle doğrulanıyor. Eski şifre sorulmuyor —
   zaten unutulduğu için buraya gelindi.

   Bağlantı tek kullanımlık ve 24 saat geçerli.                          */

export const SIFRE_BAGLANTI_SAAT = 24

export function sifreTalepleriGetir() {
  return load(ANAHTAR.sifreTalepleri, [])
}

function jeton() {
  const d = new Uint8Array(16)
  crypto.getRandomValues(d)
  return [...d].map((x) => x.toString(16).padStart(2, '0')).join('')
}

/**
 * Şifre değiştirme bağlantısı üretir.
 * @returns {{eposta: string, baglanti: string} | {hata: string}}
 */
export function sifreTalebiOlustur(kullanici) {
  const ad = String(kullanici || '').trim().toLocaleLowerCase('tr-TR')
  if (!ad) return { hata: 'Kullanıcı adınızı yazın.' }

  const kisi = personelGetir().find((p) => p.kullanici === ad)
  if (!kisi) return { hata: 'Bu kullanıcı adı bulunamadı.' }
  if (!kisi.eposta) return { hata: 'Bu hesapta e-posta adresi yok. Yöneticinize başvurun.' }

  const kayit = {
    id: uid(),
    jeton: jeton(),
    personelId: kisi.id,
    kullanici: ad,
    eposta: kisi.eposta,
    tarih: Date.now(),
    kullanildi: false,
  }
  save(ANAHTAR.sifreTalepleri, [kayit, ...sifreTalepleriGetir()].slice(0, 50))
  islemYaz({ tur: 'sifre', ozet: 'Şifre değiştirme bağlantısı istendi', personel: kisi.ad })

  return {
    eposta: kisi.eposta,
    baglanti: `${location.origin}${location.pathname}?sifre=${kayit.jeton}`,
  }
}

/** Bağlantıdaki jeton geçerli mi? */
export function sifreJetonuGecerli(jetonDegeri) {
  if (!jetonDegeri) return null
  const kayit = sifreTalepleriGetir().find((t) => t.jeton === jetonDegeri)
  if (!kayit || kayit.kullanildi) return null
  if (Date.now() - kayit.tarih > SIFRE_BAGLANTI_SAAT * 3600000) return null
  return kayit
}

/** Bağlantıyı kullanıp yeni şifreyi yazar. */
export async function sifreJetonuKullan(jetonDegeri, yeniSifre) {
  const kayit = sifreJetonuGecerli(jetonDegeri)
  if (!kayit) return { hata: 'Bağlantı geçersiz veya süresi dolmuş.' }
  if (!sifreGecerliMi(yeniSifre)) return { hata: 'Şifre 6 rakamdan oluşmalı.' }

  const liste = personelGetir()
  const kisi = liste.find((p) => p.id === kayit.personelId)
  if (!kisi) return { hata: 'Hesap bulunamadı.' }

  const sifre = await sifreHazirla(yeniSifre)
  personelYaz(liste.map((p) => (p.id === kisi.id ? { ...p, sifre } : p)))
  save(
    ANAHTAR.sifreTalepleri,
    sifreTalepleriGetir().map((t) => (t.jeton === jetonDegeri ? { ...t, kullanildi: true } : t))
  )
  islemYaz({ tur: 'sifre', ozet: 'Şifre değiştirildi', personel: kisi.ad, rol: kisi.rol })
  return { tamam: true }
}

/* ---------------------------------------------------------------- Talepler */

export const DURUMLAR = [
  { id: 'yeni', ad: 'Yeni', ton: 'kirmizi' },
  { id: 'incelemede', ad: 'İncelemede', ton: 'turuncu' },
  { id: 'planlandi', ad: 'Planlandı', ton: 'mavi' },
  { id: 'teklif', ad: 'Teklif Verildi', ton: 'mor' },
  /* "Gönderildi" DİYE AYRI BİR DURUM YOK.

     Vardı ve kaldırıldı. Sebebi: yedek parçada iki ayrı "bitti"
     durumu oluyordu — "Gönderildi" ve "Kapandı". İkisi de
     KAPALI_DURUMLAR içindeydi, yani sistem zaten ikisini aynı şey
     sayıyordu; fark yalnız etiketteydi. Raporda "kapanan parça
     talebi" saymak için iki durumu birden toplamak gerekiyordu ve
     personel hangisini seçeceğini bilmiyordu.

     Parça kargoya verildiğinde iş bitiyor: talep "Kapandı" oluyor,
     kargo firması ve takip numarası kapanış formunda soruluyor
     (bkz. Talepler.jsx → KAPANIS_ALANLARI.parca). Müşteriye giden
     bildirim de aynı yerden çıkıyor, takip numarasıyla birlikte. */
  /* "BAYİDE" DİYE AYRI BİR DURUM YOK.

     Kısa süre vardı ve kaldırıldı. Sebebi "Gönderildi" durumunun
     kaldırılma sebebiyle aynı: fiyat teklifi bayiye atandığında
     PAKSAN'ın o talepte işi biter, yani talep KAPANIR. Ayrı bir durum
     ikinci bir "bitti" hâli üretiyordu ve personel hangisini
     seçeceğini bilmiyordu.

     Talebin bayide olduğu durumdan değil SAHİPLİKTEN okunuyor:
     `talep.bayi` dolu, `sahip: 'bayi'`, listede "Bayide · <bayi adı>"
     yazıyor ve Sahiplik süzgecinde kendi seçeneği var. Bilgi
     kaybolmuyor, yalnız iki yerde birden durmuyor. */
  /* SERVİS KAYDININ ÜRETTİĞİ İKİ AŞAMA.

     Servis sahada işi bitirip kaydı gönderdiğinde talep kapanmıyor:
     PAKSAN'da yapılacak bir iş kalıyor ve o iş bu iki durumda
     görünüyor (bkz. lib/servisKaydi.js → kapininSonucu).

       onayBekliyor    garanti kaydı PAKSAN servis personelinin
                       onayında. Yol, işçilik ve parçalar inceleniyor;
                       onaylanınca servisin cari hesabına alacak
                       yazılıyor.
       parcaBekliyor   parça hazırlanıyor ya da yolda. Servis parçayı
                       takınca talebi kendisi kapatıyor.

     İkisi de AÇIK durum: PAKSAN'ın kuyruğunda bekliyorlar ve gecikme
     ünlemi alıyorlar. Kapalı sayılsalardı iki tarafın da unuttuğu
     işler olurdu. */
  { id: 'onayBekliyor', ad: 'Onay Bekliyor', ton: 'mor' },
  { id: 'parcaBekliyor', ad: 'Parça Bekleniyor', ton: 'turuncu' },
  { id: 'kapandi', ad: 'Kapandı', ton: 'yesil' },
  { id: 'iptal', ad: 'İptal', ton: 'gri' },
]

/* Kapalı = PAKSAN'ın üzerinde iş kalmamış. Not eklemek kapalı talepte
   de serbest. */
export const KAPALI_DURUMLAR = ['kapandi', 'iptal']

export function durumBilgi(id) {
  return DURUMLAR.find((d) => d.id === id) || DURUMLAR[0]
}

/* Her türün kendi aşamaları var; hepsini her türe göstermek karışıklık
   yaratıyordu.

   servis      → yeni · incelemede · planlandı · kapandı · iptal
   parça       → yeni · incelemede · planlandı · kapandı · iptal
   fiyat teklifi → yeni · incelemede · teklif verildi · kapandı · iptal

   Fiyat teklifinde planlanacak bir iş yok. Buna karşılık teklifin
   verilip müşterinin cevabının beklendiği uzun bir aşama var; o aşama
   "Teklif Verildi". Yedek parçada kargoya verme ayrı bir aşama değil,
   kapanışın kendisi. */
/* ONAY BEKLİYOR ve PARÇA BEKLENİYOR bu listede yok — bilerek.

   İkisini de servisin gönderdiği kayıt doğuruyor, personel elle
   seçmiyor (bkz. servisKaydiGonder, hakkedisOnayla). Açılır listede
   dursalardı personel "onay bekliyor" seçip kaydı hiç görmeden talebi
   bekletebilirdi; durum ile arkasındaki kayıt birbirinden kopardı.
   Rozette ve süzgeçte görünüyorlar, elle seçilemiyorlar. */
const ELLE_SECILMEZ = ['onayBekliyor', 'parcaBekliyor']

export function talepDurumlari(tur) {
  const liste = DURUMLAR.filter((d) => !ELLE_SECILMEZ.includes(d.id))
  if (tur === 'satinalma') {
    return liste.filter((d) => d.id !== 'planlandi')
  }
  return liste.filter((d) => d.id !== 'teklif')
}

/* ==========================================================================
   PERSONELİN ELLE SEÇEBİLECEĞİ DURUMLAR

   `talepDurumlari` bir türün BAŞINA GELEBİLECEK durumları veriyor;
   süzgeç onu okuyor, çünkü servis talebi gerçekten "Planlandı"
   olabiliyor ve personel o listeyi süzebilmeli.

   ÇİP LİSTESİ AYNI ŞEY DEĞİL: orada personelin ELLE geçirebileceği
   durumlar duruyor.

   SERVİS TALEBİNDE "PLANLANDI" PAKSAN'IN ELİNDE DEĞİL.

   Randevuyu servis veriyor: müşteriyle o konuşuyor, tarlaya o
   gidiyor, günü ancak o bilir (bkz. servis/ekranlar/TalepDetay.jsx →
   talepPlanla). Çipe basan PAKSAN personeli kendi uydurduğu bir günü
   müşterinin telefonuna bildirim olarak gönderiyordu — tutulacağının
   garantisi olmayan bir söz.

   Durumun kendisi duruyor: servis randevu verdiğinde talep yine
   "Planlandı" oluyor, rozette ve süzgeçte görünüyor. Kalkan yalnız
   PAKSAN'ın onu elle seçebilmesi.

   Yedek parça ve fiyat teklifinde durum tersine: orada işi PAKSAN
   yürütüyor, gönderim gününü de PAKSAN veriyor. Çip orada kalıyor.

   ÖTEKİ DÖRDÜ SERVİSTE DE ANLAMLI:
     Yeni        talebin doğduğu durum; yanlış tıklama buradan geri
                 alınıyor (bkz. bildirimsizMi — geri alışta müşteriye
                 bildirim gitmiyor).
     İncelemede  servis destek istediğinde ya da PAKSAN işi
                 devraldığında (bkz. destekTalepEt).
     Kapandı     müşteri vazgeçtiğinde ya da iş servis kaydı
                 açılmadan bittiğinde.
     İptal       gerekçesiyle birlikte.
   ========================================================================== */
export function elleSecilebilirDurumlar(tur) {
  const liste = talepDurumlari(tur)
  if (tur === 'servis') return liste.filter((d) => d.id !== 'planlandi')
  return liste
}

export const TALEP_ADI = {
  servis: 'Servis',
  parca: 'Yedek parça',
  satinalma: 'Fiyat teklifi',
}

/* Backoffice’te YURT İÇİ talepler görünüyor.

   Yurtdışından gelen talepler ihracat ekibinin e-postasına gidiyor;
   servisin ekranında yapamayacağı bir iş, satışın ekranında yanlış
   fiyat listesinden cevaplanacak bir talep birikmesin
   (bkz. src/lib/ihracat.js). Kayıt duruyor, yalnız bu listeye
   girmiyor. */
export function talepleriGetir() {
  return [...load(ANAHTAR.talepler, []), ...load(ANAHTAR.demoTalepler, [])]
    .filter((t) => !t.ihracat)
    .sort((a, b) => b.createdAt - a.createdAt)
}

/* Talep hangi depodaysa oraya yazılıyor; demo talebi müşterinin kendi
   listesine karışmıyor. */
/* MASAYI DURUMLA BİRLİKTE TEMİZLEYEN TEK YER BURASI.

   `masa`, talebin ŞU AN hangi PAKSAN masasında beklediğini söylüyor ve
   yalnız iki kayıt durumunda anlamlı (bkz. lib/servisKaydi.js →
   kapininSonucu). Durum başka bir şeye geçtiğinde masa da düşmeli;
   yoksa kapanmış ya da iptal edilmiş bir talep yedek parça
   personelinin kuyruğunda kalıyor (`rolunTalepleri` masaya bakıyor).

   KURAL NEDEN `talepDurumDegistir`'DE DEĞİL: durumu yazan tek yol o
   değil. `talepKapat`, `talepIptal`, `talepTeklifVer`, `talepPlanla`
   ve bayi ataması `status` alanını doğrudan buraya yazıyor. Denetimde
   ölçüldü: iptal edilen talep `masa: 'parca'` ile kalıyordu. Kural
   yazma noktasına konunca bugünkü ve yarınki bütün yollar kapsanıyor.

   Yamada `masa` açıkça varsa ona dokunulmuyor — kaydın kendi
   yönlendirmesi (servisKaydiGonder, hakkedisOnayla) böyle geçiyor. */
const MASALI_DURUM = ['onayBekliyor', 'parcaBekliyor']

function talepYaz(id, degisiklik) {
  const depo = load(ANAHTAR.talepler, []).some((t) => t.id === id)
    ? ANAHTAR.talepler
    : ANAHTAR.demoTalepler

  const yama = { ...degisiklik }
  if (yama.status && !('masa' in yama) && !MASALI_DURUM.includes(yama.status)) {
    yama.masa = null
  }

  save(
    depo,
    load(depo, []).map((t) => (t.id === id ? { ...t, ...yama } : t))
  )
}

/** Durumu değiştirir, geçmişe yazar ve müşteriye bildirim düşürür. */
/**
 * Durumu değiştirir, geçmişe yazar ve müşteriye bildirim düşürür.
 *
 * @param {boolean} bildirme true ise müşteriye haber gitmez. Kapanmış
 *   bir talebi admin düzeltme amacıyla geri açtığında kullanılıyor:
 *   müşteri kapandı bildirimini almışken "yeniden açıldı" mesajı
 *   kafa karıştırır, işi PAKSAN kendi içinde toparlıyor.
 */
export function talepDurumDegistir(talep, yeniDurum, personel, { bildirme } = {}) {
  const gecmis = [...(talep.gecmis || []), { durum: yeniDurum, tarih: Date.now(), personel }]

  talepYaz(talep.id, { status: yeniDurum, gecmis })

  islemYaz({
    tur: 'durum',
    ozet: `${talep.no} → ${durumBilgi(yeniDurum).ad}${bildirme ? ' (kapalı talep açıldı, bildirim gitmedi)' : ''}`,
    personel,
  })

  if (bildirme) return

  musteriyeBildir({
    musteriId: bildirimAlicisi(talep),
    tur: 'talep',
    baslikAnahtar: 'bildirimler.durumBaslik',
    metinAnahtar: 'bildirimler.durum_' + yeniDurum,
    degerler: { no: talep.no, durum: yeniDurum, talepTur: talep.tur },
    talepNo: talep.no,
  })
}

/* ==========================================================================
   Fiyat teklifini bayiye atama

   MAKİNEYİ SATAN TARAF BAYİ. Uygulamadan gelen fiyat teklifi talebi
   PAKSAN'a düşüyor çünkü müşteri PAKSAN'ın uygulamasını kullanıyor;
   ama teklifi hazırlayacak, müşteriyi arayacak ve satışı yapacak olan
   bayi. Satış personelinin buradaki işi doğru bayiyi seçmek.

   ATAMADAN SONRA PAKSAN'IN İŞİ BİTİYOR — TALEP KAPANIR

   Durum **"Kapandı"** oluyor, ayrı bir "Bayide" durumu yok. Bir dönem
   vardı ve kaldırıldı: ikinci bir "bitti" hâli üretiyordu ve personel
   hangisini seçeceğini bilmiyordu. Talebin bayide olduğu bilgisi zaten
   SAHİPLİKTE duruyor — `sahip: 'bayi'`, listede "Bayide · <bayi adı>",
   Sahiplik süzgecinde kendi seçeneği.

   Bayinin paneli olmadığı için takip PAKSAN'ın ekranında değil telefonda
   yürüyor; sistemin bunu bekleyen bir iş gibi göstermesi yanlış olurdu.

   PAKSAN kendisi ilgilenecekse atama yapılmıyor: talep her zamanki
   akışta kalıyor, teklif verilip kapanıyor.

   MÜŞTERİ KİMİN ARAYACAĞINI GÖRÜYOR. Bildirim gidiyor ve talep
   detayında bayinin adı ile telefonu duruyor; yoksa çiftçi tanımadığı
   bir numaradan gelen aramayı beklemek zorunda kalır.
   ========================================================================== */
export function talebiBayiyeAta(talep, bayi, personel) {
  if (!bayi?.id) return { hata: 'Bayi seçin.' }

  const kayit = { id: bayi.id, ad: bayi.ad, tel: bayi.tel || '', tarih: Date.now() }
  const gecmis = [...(talep.gecmis || []), { durum: 'kapandi', tarih: Date.now(), personel }]
  talepYaz(talep.id, { bayi: kayit, sahip: 'bayi', status: 'kapandi', gecmis })

  islemYaz({ tur: 'durum', ozet: `${talep.no} → Kapandı · bayiye atandı: ${bayi.ad}`, personel })

  musteriyeBildir({
    musteriId: bildirimAlicisi(talep),
    tur: 'talep',
    baslikAnahtar: 'bildirimler.bayiBaslik',
    metinAnahtar: 'bildirimler.bayiMetin',
    degerler: { no: talep.no, bayi: bayi.ad, talepTur: talep.tur },
    talepNo: talep.no,
  })

  return { bayi: kayit }
}

/** Atamayı geri alır: yanlış bayi seçildiğinde talep PAKSAN'a döner. */
export function bayiAtamasiniKaldir(talep, personel) {
  const gecmis = [...(talep.gecmis || []), { durum: 'incelemede', tarih: Date.now(), personel }]
  talepYaz(talep.id, { bayi: null, sahip: 'paksan', status: 'incelemede', gecmis })
  islemYaz({ tur: 'durum', ozet: `${talep.no} · bayi ataması kaldırıldı`, personel })
}

/* Talebe not.

   İki tür not var ve ayrımı önemli:

     İÇ NOT       yalnız backoffice’te görünüyor. Ekibin kendi arasında
                  konuştuğu şeyler; müşteriye gitmiyor.
     MÜŞTERİ NOTU müşterinin uygulamasına düşüyor ve bildirim gidiyor.
                  Kargo takip numarası, "parçanız yarın çıkıyor" gibi.

   Not eklemek kapalı talepte de serbest: parça kargoya verildikten
   sonra takip numarası ancak böyle iletilebiliyor.

   @param {boolean} musteriye true ise not müşteriye de gidiyor. */
export function talepNotEkle(
  talep,
  metin,
  personel,
  { musteriye = false, servise = false, servisten = false } = {},
) {
  /* `servisten`: notu servis kendi uygulamasından yazdı. PAKSAN görüyor,
     müşteri görmüyor; servis de kendi ekranında görüyor
     (bkz. servis/ekranlar/TalepDetay.jsx → benimNotlarim). */
  const not = {
    metin,
    tarih: Date.now(),
    personel,
    musteriye,
    servise,
    ...(servisten ? { servisten } : {}),
  }
  /* Not talebin GÜNCEL hâline ekleniyor. Ekrandaki talep nesnesi
     eskimiş olabilir; eskimiş nesnenin not listesine eklemek, arada
     yazılmış başka bir notu siler. */
  const guncel = talepleriGetir().find((t) => t.id === talep.id) || talep
  const notlar = [...(guncel.notlar || []), not]
  talepYaz(talep.id, { notlar })

  const nereye = musteriye
    ? 'müşteriye not gönderildi'
    : servise
      ? 'servise not gönderildi'
      : servisten
        ? 'servis not ekledi'
        : 'iç not eklendi'
  islemYaz({ tur: 'not', ozet: `${talep.no} · ${nereye}`, personel })

  /* SERVİSE GİDEN NOTA MÜŞTERİ BİLDİRİMİ ÇIKMIYOR.

     Not servisin uygulamasında talebin içinde görünüyor
     (bkz. servis/ekranlar/TalepDetay.jsx) ve servisin haber
     yoklaması onu yakalıyor (bkz. servis/haber.js). Müşteriyi
     ilgilendiren bir şey değil: PAKSAN ile servis arasında
     konuşuluyor. */
  if (!musteriye) return

  /* Personelin yazdığı cümle olduğu gibi gidiyor — çeviremeyiz.
     Başlık sözlükten geliyor, o müşterinin dilinde çıkıyor. */
  musteriyeBildir({
    musteriId: bildirimAlicisi(talep),
    tur: 'talep',
    baslikAnahtar: 'bildirimler.notBaslik',
    degerler: { no: talep.no, talepTur: talep.tur },
    metin,
    talepNo: talep.no,
  })
}

/* ------------------------------------------------- Bildirim kimin kaydı

   `duyurular` ANAHTARI PAYLAŞILIYOR. Aynı listede personelin yayımladığı
   duyuru ile uygulamanın ürettiği kişiye özel bildirim birlikte duruyor
   (bkz. lib/duyuruHedef.js). Süzgeç kişiye özel kaydı YALNIZCA
   `musteriId` alanından tanıyor; alan yoksa kayıt herkese açık sayılıyor
   ve her hesabın ekranında çiziliyor.

   Alan hiçbir çağırandan gelmiyordu. Sonucu ekranda görülüyordu: bir
   cihazda ikinci bir hesap açıldığında önceki müşterinin talep
   numarası, kargo notu, randevu tarihi, atanan bayi adı ve görüşüne
   yazılan cevap yeni hesabın Bildirimler ekranında çıkıyordu.

   KİMLİK İKİ YERDEN OKUNUYOR. Kayıtta `musteriId` varsa o geçerli
   (numara talebi ve servisin elle açtığı kayıt taşıyor). Yoksa
   telefondan eşleştiriliyor: uygulamadan açılan talep bugün yalnız
   `telHam` taşıyor (bkz. screens/RequestForm.jsx) ve hesabın `tel`
   alanı da ham numara.

   EŞLEŞME YOKSA null. Yanlış hesaba damga vurmak, bildirimi
   sahibinden saklamak demek; o yüzden kimlik uydurulmuyor. null
   dönünce kayıt kimliksiz yazılıyor ve `musteriyeBildir`in vurduğu
   `kisisel` damgası sayesinde KİMSEYE gösterilmiyor — eskiden bu
   durumda kayıt herkese açık sayılıyordu. */
function bildirimAlicisi(kayit) {
  if (kayit?.musteriId) return kayit.musteriId
  const tel = kayit?.telHam || kayit?.tel
  if (!tel) return null
  return musterileriGetir().find((m) => m.tel === tel)?.id || null
}

/* Müşterinin Bildirimler ekranına düşen kayıt.

   Metin değil ANAHTAR saklanıyor: backoffice Türkçe ama müşteri uygulamayı
   İngilizce kullanıyor olabilir. Anahtar saklanınca yazı müşterinin
   kendi dilinde çıkıyor. Personelin elle yazdığı cevaplarda `metin`
   doğrudan gidiyor — o cümleyi çeviremeyiz.

   `musteriId` ZORUNLU: bu kayıt bir kişinin kendi bildirimi ve yalnız
   onun ekranına düşmeli (yukarıdaki gerekçe). Çağıran alanı
   `bildirimAlicisi()` ile hesaplıyor.

   Dışa açık: servis paneli de aynı kapıdan yazıyor (fiyat teklifi
   gönderildiğinde). İkinci bir bildirim deposu açmak, müşterinin
   ekranında iki ayrı liste demekti. */
export function musteriyeBildir(bildirim) {
  /* `kisisel` DAMGASI HER KAYITTA, ALICISI ÇÖZÜLSE DE ÇÖZÜLMESE DE.

     `bildirimAlicisi()` kimseyi bulamadığında kayıt `musteriId`
     ALANSIZ yazılıyordu ve süzgeç alansız kaydı HERKESE AÇIK duyuru
     sayıyor (bkz. lib/duyuruHedef.js). Yani kimliği çözülemeyen bir
     kişisel bildirim —talep numarası, kargo notu, randevu tarihi,
     atanan bayi adı— her hesabın Bildirimler ekranında çiziliyordu.
     Tam olarak kapatılmak istenen sızıntının kendisi.

     Damga süzgece "bu kayıt bir kişinin" diyor. Kişi bulunamadıysa
     kayıt KİMSEYE gösterilmiyor: bildirimi sahibinden saklamak,
     yabancıya göstermekten iyidir. Kayıt yine de yazılıyor, çünkü
     depoda durması onu sonradan doğru hesaba bağlamanın tek yolu.

     Damga yayılımdan SONRA konuyor: çağıran yanlışlıkla da olsa
     `kisisel: false` geçirip süzgeci kapatamasın.

     Eski kayıtlarda damga yok; süzgeç onları eskisi gibi geçiriyor.
     Tek hesaplı cihazda üretildiler, geriye uyum bozulmuyor. */
  if (!bildirim?.musteriId) {
    console.warn(
      'musteriyeBildir: alıcı çözülemedi, bildirim kimseye gösterilmeyecek —',
      bildirim?.tur || '?',
      bildirim?.no || '',
    )
  }
  save(ANAHTAR.duyurular, [
    { id: uid(), tarih: Date.now(), ...bildirim, kisisel: true },
    ...load(ANAHTAR.duyurular, []),
  ])
}

/* ------------------------------------------------------------- Gecikme

   Bekleyen talep 48 saati geçtiyse gecikmiş sayılıyor; listede kırmızı
   ünlemle işaretleniyor ve süzgeçten ayrı çekilebiliyor. Kapanmış
   talepte gecikme bir şey anlatmadığı için işaret çıkmıyor. */

export const GECIKME_SAAT = 48

/* ------------------------------------------- Gönderim tarihi geçti mi?

   Yedek parça talebi planlanırken bir tarih ve saat veriliyor
   (bkz. talepPlanla) ve müşteriye bildiriliyor: "parçanız şu gün
   kargoya verilecek". O an geçtiği hâlde talep hâlâ kapanmadıysa
   (yani parça gönderilmediyse) verilen söz tutulmamış demektir.

   GECİKME ÜNLEMİNDEN AYRI BİR ŞEY. Gecikme "talebe kimse bakmadı"
   diyor; bu ise "bakıldı, planlandı, tarihi geçti ama gönderilmedi".
   İkisi farklı iş gerektirdiği için ayrı işaret.

   Yalnız yedek parçada var: servis randevusunda ekip sahaya gidiyor
   ve kapanış başka türlü işliyor. */
export function gonderimGecikti(talep) {
  if (talep.tur !== 'parca') return false
  const durum = talep.status || 'yeni'
  if (KAPALI_DURUMLAR.includes(durum)) return false
  const planlanan = talep.plan?.tarih
  if (!planlanan) return false
  return Date.now() > planlanan
}

/** Planlanan gönderimin üstünden kaç saat geçti? */
export function gonderimGecikmeSaati(talep) {
  const planlanan = talep.plan?.tarih
  if (!planlanan) return 0
  return Math.max(0, Math.floor((Date.now() - planlanan) / 3600000))
}

export function gecikmisMi(talep) {
  const durum = talep.status || 'yeni'
  if (KAPALI_DURUMLAR.includes(durum)) return false

  /* Teklif verilmiş talep "bekletiliyor" değil, bekliyor: top
     müşteride. Onun kendi süresi var (bkz. teklifBekliyorMu); ikisini
     karıştırırsak satış ekibi her teklifi kırmızı ünlemli görür ve
     ünlem hiçbir şey anlatmaz olur. */
  if (durum === 'teklif') return false

  return Date.now() - (talep.createdAt || 0) > GECIKME_SAAT * 3600000
}

/* --------------------------------------------------- Talep kapanışı

   Kapatırken ne yapıldığı yazılmazsa makinenin arıza geçmişi
   oluşmuyor. Bu kayıt birikince "hangi modelde hangi parça sık
   bozuluyor" sorusunun cevabı çıkıyor — imalatçı için en değerli veri
   bu.                                                                */

export function talepKapat(talep, cozum, personel) {
  const gecmis = [
    ...(talep.gecmis || []),
    { durum: 'kapandi', tarih: Date.now(), personel },
  ]
  talepYaz(talep.id, {
    status: 'kapandi',
    gecmis,
    cozum: { ...cozum, tarih: Date.now(), personel },
  })

  islemYaz({
    tur: 'durum',
    ozet: `${talep.no} kapandı · ${cozum.ozet}`,
    personel,
  })

  /* SERVİSİN HAK EDİŞİNDEN DÜŞÜLECEK SİPARİŞ.

     Servis siparişi verirken bedelin hak edişinden düşülmesini
     istemiş olabiliyor (bkz. servisParcaSiparisi → odeme). Düşüm o an
     yapılmıyor: sipariş henüz onaylanmamış, tutar da bağlayıcı değil.
     Parça kargoya verildiğinde iş kesinleşiyor ve borç deftere o
     zaman yazılıyor.

     Tutar sipariş anındaki fiyattan; sunucu geldiğinde faturanın
     kendi tutarı gelecek ve değişecek tek şey bu satır olacak.

     RAKAM KAYDIN İÇİNDEKİ FİYAT GÖRÜNTÜSÜNDEN OKUNUYOR.

     Sipariş verilirken o günün satırları, KDV'si ve toplamı kaydın
     içine yazılıyor (`parcaFiyat`, bkz. servisParcaSiparisi). Deftere
     yazılan borç oradan geliyor; katalog yeniden açılıp fiyat yeniden
     hesaplanmıyor — fiyat listesi aradan geçen günlerde değişmiş
     olabilir ve servise söylenen tutar sipariş günündeki tutardır.

     Eski siparişlerde görüntü yok, yalnız `tutarKdvli` var; onlar için
     o alan kullanılıyor. */
  const dusulecek =
    Number(talep.parcaFiyat?.toplam) || Number(talep.tutarKdvli) || Number(talep.tutar) || 0
  if (talep.servisSiparisi && talep.odeme === 'bakiye' && dusulecek > 0) {
    cariHareketEkle({
      servisId: talep.servis?.id,
      servisAd: talep.servis?.ad,
      tur: 'borc',
      tutar: dusulecek,
      aciklama: `${talep.no} · parça siparişi`,
      talepNo: talep.no,
      personel,
    })
  }

  /* YEDEK PARÇADA KAPANIŞ = KARGOYA VERİLDİ.

     Bildirim de ona göre yazılıyor: takip numarası girildiyse
     müşteri uygulamayı açmadan, bildirimin içinde görüyor. Eskiden
     bu iş ayrı bir "Gönderildi" durumundan çıkıyordu; o durum
     kaldırıldı (bkz. DURUMLAR). */
  const parcaGonderimi = talep.tur === 'parca'
  musteriyeBildir({
    musteriId: bildirimAlicisi(talep),
    tur: 'talep',
    baslikAnahtar: parcaGonderimi
      ? 'bildirimler.gonderildiBaslik'
      : 'bildirimler.durumBaslik',
    metinAnahtar: parcaGonderimi
      ? 'bildirimler.gonderildiMetin'
      : 'bildirimler.durum_kapandi',
    degerler: { no: talep.no, durum: 'kapandi', talepTur: talep.tur },
    talepNo: talep.no,
  })
}

/* ------------------------------------------------------- Talep iptali

   İptal, kapanışın sessiz kardeşi değil: müşteri bir iş bekliyordu ve
   o iş yapılmayacak. Sebebi yazılmadan iptal edilemiyor ve sebep
   müşteriye AYNEN gidiyor.

   Önceki hâlinde iptal, öteki durum değişiklikleri gibi tek tıkla
   oluyordu; müşteriye giden bildirimde yalnız "talebiniz kapatıldı"
   yazıyordu. Bildirime dokunan kişi hiçbir şey öğrenemiyordu.        */

export function talepIptal(talep, iptal, personel) {
  const gecmis = [...(talep.gecmis || []), { durum: 'iptal', tarih: Date.now(), personel }]
  talepYaz(talep.id, {
    status: 'iptal',
    gecmis,
    iptalBilgi: { ...iptal, tarih: Date.now(), personel },
  })

  islemYaz({ tur: 'durum', ozet: `${talep.no} iptal edildi · ${iptal.neden}`, personel })

  musteriyeBildir({
    musteriId: bildirimAlicisi(talep),
    tur: 'talep',
    baslikAnahtar: 'bildirimler.iptalBaslik',
    metinAnahtar: 'bildirimler.iptalMetin',
    degerler: { no: talep.no, neden: iptal.neden, talepTur: talep.tur },
    talepNo: talep.no,
  })
}

/* --------------------------------------------------- Teklif verildi

   Fiyat teklifinin en uzun aşaması burası: fiyat çalışıldı, müşteriye
   iletildi ve müşteri düşünüyor. Bu haftalar sürebiliyor.

   Önceden bu aşama yoktu; talep "İncelemede" duruyordu. İki farklı şey
   aynı kutuda görünüyordu: fiyatı henüz çalışılmamış talep ile fiyatı
   verilip cevabı beklenen talep. Satış ekibi hangisinin peşine
   düşeceğini listeye bakarak bilemiyordu.

   Burada SONUÇ SORULMUYOR — sonuç henüz yok. Sonuç, müşteri döndüğünde
   kapanış ekranında giriliyor.                                       */

export function talepTeklifVer(talep, teklif, personel) {
  const gecmis = [...(talep.gecmis || []), { durum: 'teklif', tarih: Date.now(), personel }]
  talepYaz(talep.id, {
    status: 'teklif',
    gecmis,
    teklif: { ...teklif, tarih: Date.now(), personel },
  })

  islemYaz({
    tur: 'durum',
    ozet: `${talep.no} · teklif verildi${teklif.tutar ? ' · ' + teklif.tutar : ''}`,
    personel,
  })

  musteriyeBildir({
    musteriId: bildirimAlicisi(talep),
    tur: 'talep',
    baslikAnahtar: 'bildirimler.teklifBaslik',
    metinAnahtar: teklif.gecerlilik
      ? 'bildirimler.teklifMetinGecerlilik'
      : 'bildirimler.teklifMetin',
    degerler: {
      no: talep.no,
      tutar: teklif.tutar,
      gecerlilik: teklif.gecerlilik,
      talepTur: talep.tur,
    },
    talepNo: talep.no,
  })
}

/* Teklif verildi ama müşteri dönmedi.

   Müşterinin düşünmesi normal; unutulması değil. Bu süreyi geçen
   teklifler listede işaretleniyor, dashboard'da sayılıyor ve backoffice
   açıkken tarayıcı bildirimi gidiyor — satış ekibi telefonu açsın.

   14 gün: iki haftada dönmeyen müşteri çoğu zaman ya unuttu ya da
   başka yere baktı. İkisinde de aranması gerekiyor. */
export const TEKLIF_BEKLEME_GUN = 14

export function teklifBekliyorMu(talep) {
  if ((talep.status || 'yeni') !== 'teklif') return false
  const bas = talep.teklif?.tarih || talep.createdAt || 0
  return Date.now() - bas > TEKLIF_BEKLEME_GUN * 86400000
}

/** Teklif verileli kaç gün oldu? */
export function teklifBeklemeGunu(talep) {
  const bas = talep.teklif?.tarih || talep.createdAt || 0
  return Math.floor((Date.now() - bas) / 86400000)
}

/* --------------------------------------------------- Yedek parça: ödeme

   Müşteri parça bedelini uygulamadaki hesap bilgilerine gönderiyor ve
   dekontunu yüklüyor. Parça hazırlanmadan önce paranın gerçekten
   geldiği kontrol edilmeli; onay burada veriliyor.

   Onaylanmamış ödeme, parçanın hazırlanmasını durdurmuyor (bazen
   bilinen müşteriye önden gönderiliyor) ama listede görünüyor ki kimse
   unutmasın.                                                          */

export function odemeOnayla(talep, personel, not) {
  const simdi = Date.now()
  const degisiklik = { odemeOnay: { tarih: simdi, personel, not: not || '' } }

  /* ÖDEME ONAYI TALEBİ KENDİLİĞİNDEN AÇIYOR.

     Yedek parçada ödemenin onaylanması zaten "bu işe başlıyoruz"
     demek: para hesapta, parça hazırlanacak. Personelin ardından bir
     de "İncelemede" düğmesine basması gereksiz bir adımdı ve
     unutulduğunda talep "Yeni" kutusunda kalıp gecikmiş görünüyordu.

     Talep hâlâ "Yeni" ise açılıyor. Daha ileri bir aşamadaysa
     dokunulmuyor — geriye almak yanlış olurdu. */
  const acilsinMi = (talep.status || 'yeni') === 'yeni'
  if (acilsinMi) {
    degisiklik.status = 'incelemede'
    degisiklik.gecmis = [
      ...(talep.gecmis || []),
      { durum: 'incelemede', tarih: simdi, personel },
    ]
  }

  talepYaz(talep.id, degisiklik)

  islemYaz({
    tur: 'odeme',
    ozet: `${talep.no} · ödeme onaylandı${not ? ' · ' + not : ''}${
      acilsinMi ? ' · talep incelemeye alındı' : ''
    }`,
    personel,
  })

  musteriyeBildir({
    musteriId: bildirimAlicisi(talep),
    tur: 'talep',
    baslikAnahtar: 'bildirimler.odemeBaslik',
    metinAnahtar: 'bildirimler.odemeMetin',
    degerler: { no: talep.no, talepTur: talep.tur },
    talepNo: talep.no,
  })
}

/* Yedek parça talebi ilerleyebilir mi?

   Parça bedeli önden alınıyor. Ödeme onaylanmadan talebi "İncelemede"
   veya "Gönderildi" yapmak, parası gelmemiş siparişi hazırlamaya
   başlamak demek. Personel dekonta bakmadan tıklayabiliyordu.

   İPTAL BU KURALIN DIŞINDA: ödemesi hiç gelmemiş talebi kapatmak tam
   da ihtiyaç duyulan şey.

   @returns {string|null} engel varsa sebebi, yoksa null */
/* ONAY BEKLEYEN HAK EDİŞ, ELLE DURUM DEĞİŞİKLİĞİNİ KİLİTLER.

   Bulunan boşluk şuydu: `talepDurumDegistir` yalnız `status` ve
   `gecmis` yazıyor; `hakkedis` ve `masa` alanlarına dokunmuyor.
   Personel onay bekleyen bir talebi açılır listeden başka bir duruma
   (ya da kapanış formuna) alınca:

     · `hakkedisOnayla` bir daha çalışmıyor — "Bu talep onay
       beklemiyor" diyor ve düğmesi de ekrandan kalkıyor,
     · ama servisin uygulamasında kayıt "Onay Bekleyen" listesinde,
       tutarıyla birlikte SONSUZA KADAR duruyor (o ekran yalnız
       `hakkedis.durum === 'bekliyor'` diye bakıyor).

   Sonuç: servise ödeneceği söylenen ve kimsenin onaylayamayacağı bir
   para. Ürünün bütün kurgusu servisin kaydı doğru doldurmasına, o da
   bu rakamı görmesine dayanıyor (bkz. lib/servisKaydi.js). Sessizce
   silmek de olmaz: para kararı görünür olmalı.

   Bu yüzden kapı: onay bekleyen bir hak ediş varken durum elle
   değişmiyor. Personel ya Onayla ya Kabul Etme diyecek — ikisi de
   gerekçesiyle kayda geçiyor. Yedek parçadaki ödeme kapısının
   (`parcaIlerlemeEngeli`) aynısı.

   @returns {string|null} engel varsa sebebi, yoksa null */
export function hakkedisIlerlemeEngeli(talep, yeniDurum) {
  if (talep.hakkedis?.durum !== 'bekliyor') return null
  if (talep.status !== 'onayBekliyor') return null
  if (yeniDurum === 'onayBekliyor') return null
  return 'hakkedisOnayiYok'
}
export function parcaIlerlemeEngeli(talep, yeniDurum) {
  if (talep.tur !== 'parca') return null
  /* SERVİSİN KENDİ SİPARİŞİ ÖN ÖDEMEYE TABİ DEĞİL.

     Bu kural son müşteri için var: parasını almadan parça
     göndermemek. Servis ise cari hesaplı bir iş ortağı — ödemesi
     ay sonunda hesaplaşmayla yürüyor. Buradan geçseydi her servis
     siparişi "dekont bekleniyor" diye kilitlenirdi ve yükleyecek bir
     dekont hiç olmayacaktı. */
  if (talep.servisSiparisi) return null
  if (yeniDurum === 'yeni' || yeniDurum === 'iptal') return null
  if (talep.odemeOnay) return null
  if (!talep.fatura && !talep.dekont) return null /* eski talepler */
  return 'odemeOnayiYok'
}

/* ------------------------------------------------------------ Duyurular

   Personelin müşterilere yaptığı duyuru. Uygulamada iki yerde birden
   görünüyor: açılışta bir kez pencere olarak, sonrasında Bildirimler
   listesinde kalıcı olarak.

   Pencere olması şart: bildirim listesine kimse kendiliğinden
   bakmıyor. Ama pencere tek başına da yetmiyor — kapatan kişi bir daha
   ulaşamasın istemiyoruz, o yüzden listede duruyor.

   İki tür var:
     duyuru → kampanya, yeni ürün. YALNIZ izin verene gidiyor (6563).
     uyari  → güvenlik uyarısı, geri çağırma. Herkese gidiyor; hizmete
              ilişkin bildirim ticari ileti değildir.                  */

export function duyurulariGetir() {
  return load(ANAHTAR.duyurular, []).filter((d) => d.tur === 'duyuru' || d.tur === 'uyari')
}

/**
 * @param {string} alt duyuru alt türü — kampanya, yeniUrun, etkinlik,
 *   guvenlik, geriCagirma (bkz. src/data/duyuruTurleri.js). Ekranda
 *   hangi temanın çıkacağını bu belirliyor. `tur` yerini ALMIYOR:
 *   ticari ileti izni ve bütün eski süzgeçler hâlâ ona bakıyor.
 */
export function duyuruYayinla({ tur, alt, baslik, metin, gorsel, hedef, gun }, personel) {
  /* Hedef boşsa alan hiç yazılmıyor: yokluk "herkese" demek
     (bkz. src/lib/duyuruHedef.js). Boş dizilerle dolu bir nesne
     yazmak da aynı sonucu verirdi ama kayıt gereksiz şişerdi. */
  const doluHedef =
    hedef && Object.values(hedef).some((v) => (Array.isArray(v) ? v.length : v && v !== 'musteri'))

  const kayit = {
    id: uid(),
    tarih: Date.now(),
    tur,
    ...(alt ? { alt } : {}),
    baslik: baslik.trim(),
    metin: metin.trim(),
    /* Görselin kendisi IndexedDB'de, burada yalnız kimliği —
       eklerle aynı yol (bkz. src/lib/ekler.js). */
    gorsel: gorsel || null,
    personel,
    /* Uygulamada açılışta pencere olarak çıksın */
    pencere: true,
    /* DUYURUNUN SON GÜNÜ.

       Yoktu ve her duyuru sonsuza kadar ekranda kalıyordu: geçen
       yılın fuar duyurusu, biten kampanya, tarihi geçmiş bakım
       hatırlatması. Personel elle silmedikçe hiçbiri düşmüyordu ve
       elle silmek kimsenin görevi değildi.

       `gun` verilmezse `bitis` hiç yazılmıyor ve duyuru süresiz
       kalıyor — geri çağırma gibi süresi olmayan uyarılar için
       gereken davranış bu. Eski kayıtlarda alan yok; yokluk yine
       "süresiz" demek, taşıma gerekmiyor. */
    ...(Number(gun) > 0 ? { bitis: Date.now() + Number(gun) * 86400000 } : {}),
    ...(doluHedef ? { hedef } : {}),
  }
  save(ANAHTAR.duyurular, [kayit, ...load(ANAHTAR.duyurular, [])])
  islemYaz({
    tur: 'duyuru',
    /* İşlem kaydına alt tür yazılıyor: "Duyuru yayınlandı" satırı
       hangi duyurudan söz ettiğini söylemiyordu. */
    ozet: `${altBilgi(kayit).ad} yayınlandı · ${kayit.baslik}`,
    personel,
  })
  return kayit
}

export function duyuruSil(id, personel) {
  const liste = load(ANAHTAR.duyurular, [])
  const kayit = liste.find((d) => d.id === id)
  save(ANAHTAR.duyurular, liste.filter((d) => d.id !== id))
  islemYaz({ tur: 'duyuru', ozet: `Duyuru yayından kaldırıldı · ${kayit?.baslik || id}`, personel })
}

/* ---------------------------------------- Müşterinin diğer talepleri

   Personel talebi açtığında "bu müşterinin başka ne işi var" bilmek
   istiyor. Talep numaraları tıklanabiliyor, aralarında gezilebiliyor.

   ZAMAN SIRASI YOK. Önceki hâli yalnız DAHA ESKİ talepleri
   gösteriyordu; bu ilişkiyi tek yönlü yapıyordu: A'nın içinde B
   görünüyor ama B'nin içinde A görünmüyordu. Aynı müşterinin iki açık
   işi varsa ikisinden de ötekine geçilebilmeli.

   Varsayılan liste yalnız AÇIK talepler. Kapanmışlar yıllar içinde
   birikip bu alanı şişiriyor; onlar "Tümü" düğmesinin ardında duruyor.

   Tür süzgeci burada YOK: `hepsi` zaten rolün görebildiği taleplerden
   oluşuyor (bkz. rolunTalepleri). Servisçi zaten yalnız servis
   taleplerini görüyor; yöneticinin ise müşterinin bekleyen fiyat
   teklifini de görmesi işine yarıyor.

   @param {boolean} yalnizAcik kapanmışları dışarıda bırak */
export function musterininDigerTalepleri(talep, hepsi, { yalnizAcik = false } = {}) {
  if (!talep.telHam) return []
  return hepsi
    .filter((t) => t.id !== talep.id && t.telHam === talep.telHam)
    .filter((t) => !yalnizAcik || !KAPALI_DURUMLAR.includes(t.status || 'yeni'))
    .sort((a, b) => b.createdAt - a.createdAt)
}

/* ------------------------------------------------------- Planlama

   "Planlandı" demek tek başına bir şey anlatmıyor: müşteri neyin ne
   zaman yapılacağını bilmek istiyor. Bu yüzden planlanan iş ve tarih
   kaydediliyor, bildirimde de ikisi birden gidiyor.                   */

export function talepPlanla(talep, plan, personel) {
  const gecmis = [
    ...(talep.gecmis || []),
    { durum: 'planlandi', tarih: Date.now(), personel },
  ]
  talepYaz(talep.id, {
    status: 'planlandi',
    gecmis,
    plan: { ...plan, kayitTarihi: Date.now(), personel },
  })

  islemYaz({
    tur: 'durum',
    ozet: `${talep.no} planlandı · ${plan.tarihYazi} · ${plan.is}${
      plan.gorusuldu ? ' · müşteriyle görüşüldü' : ''
    }`,
    personel,
  })

  musteriyeBildir({
    musteriId: bildirimAlicisi(talep),
    tur: 'talep',
    baslikAnahtar: 'bildirimler.durumBaslik',
    metinAnahtar: 'bildirimler.durum_planlandiDetay',
    degerler: { no: talep.no, tarih: plan.tarihYazi, is: plan.is },
    talepNo: talep.no,
  })
}

/* -------------------------------------------------------------- Müşteriler */

/* Uygulamaya kayıt olan kişi ve demo müşterileri. Sunucu gelince burası
   müşteri listesini ağdan çekecek. */
export function musterileriGetir() {
  const kisi = load(ANAHTAR.hesap, null) || load(ANAHTAR.kullanici, null)
  const kendi = kisi ? [{ ...kisi, makineler: load(ANAHTAR.makineler, []) }] : []
  return [...kendi, ...load(ANAHTAR.demoMusteriler, [])]
}

/** Müşteri bilgisini düzeltir (yalnız admin). Telefon buradan değişmez. */
export function musteriGuncelle(musteri, degisiklik, personel) {
  const alanlar = ['ad', 'il', 'ilce', 'konumUlke', 'satici']
  const temiz = {}
  alanlar.forEach((a) => {
    if (degisiklik[a] !== undefined) temiz[a] = degisiklik[a]
  })

  const degisen = Object.keys(temiz).filter((a) => temiz[a] !== musteri[a])
  if (!degisen.length) return { degismedi: true }

  ;[ANAHTAR.hesap, ANAHTAR.kullanici].forEach((k) => {
    const kayitli = load(k, null)
    if (kayitli && kayitli.id === musteri.id) save(k, { ...kayitli, ...temiz })
  })

  save(
    ANAHTAR.demoMusteriler,
    load(ANAHTAR.demoMusteriler, []).map((m) =>
      m.id === musteri.id ? { ...m, ...temiz } : m
    )
  )

  islemYaz({
    tur: 'musteri',
    ozet: `${musteri.no || musteri.ad} güncellendi (${degisen.join(', ')})`,
    personel,
  })
  return { guncellendi: true }
}

/* ------------------------------------------------- Numara değişikliği

   Giriş numarası hesabın kimliği; müşteri kendi başına değiştiremiyor,
   yoksa telefonu eline geçiren biri hesabı devralırdı. Müşteri
   uygulamadan talep bırakıyor, kimliği seri numarasıyla doğrulanıyor,
   numarayı admin değiştiriyor.                                        */

export function numaraTalepleriGetir() {
  return load(ANAHTAR.numaraTalepleri, [])
}

function talebinMusterisi(talep) {
  const kisi = load(ANAHTAR.hesap, null) || load(ANAHTAR.kullanici, null)
  if (kisi && kisi.id === talep.musteriId) {
    return { ...kisi, makineler: load(ANAHTAR.makineler, []) }
  }
  return load(ANAHTAR.demoMusteriler, []).find((m) => m.id === talep.musteriId) || null
}

/* SERİ ÇAKIŞMASINDAN GELEN TALEP (17 Eylül 2026)

   Müşteri makine eklerken seri başka bir hesapta çıktı ve "numaram
   değişti" dedi (bkz. lib/numaraTalebi.js → seriCakismasiTalebi). Yön
   öteki talebin tersi: talebi açan hesap YENİ numarayla açılmış,
   müşteri ESKİ numarasını yazmış. İstenen, eski hesabın kayıtlarının bu
   hesaba geçmesi.

   Kanıtlar da o yüzden eski hesaba bakıyor: yazılan eski numara o
   hesabın numarası mı, seri o hesaba kayıtlı makine mi. Seri makinenin
   üstünde yazıyor, tek başına kanıt değil; asıl kanıt eski numara —
   uygulama onu hiçbir yerde göstermedi. */
export function seriCakismasiMi(talep) {
  return talep?.kaynak === SERI_CAKISMASI
}

/** Seri çakışması talebinde eski hesabın kaydı; bu tarayıcıda yoksa null. */
function eskiHesapKaydi(talep) {
  const { musteriId, musteriNo } = talep?.eskiHesap || {}
  if (!musteriId && !musteriNo) return null
  return musterileriGetir().find(
    (m) => (musteriId && m.id === musteriId) || (musteriNo && m.no === musteriNo)
  ) || null
}

/** Ekranda gösterilecek eski hesap: numara ve ad. Ad yoksa defterden. */
export function eskiHesapBilgisi(talep) {
  const kayit = eskiHesapKaydi(talep)
  const satir = eskiHesabinDefteri(talep)[0]
  return {
    no: kayit?.no || talep?.eskiHesap?.musteriNo || '',
    ad: kayit?.ad || satir?.musteriAd || '',
    bulundu: Boolean(kayit),
  }
}

function eskiHesabinMi(talep, k) {
  const { musteriId, musteriNo } = talep?.eskiHesap || {}
  return Boolean(
    (musteriId && k.musteriId === musteriId) || (musteriNo && k.musteriNo === musteriNo)
  )
}

function eskiHesabinDefteri(talep) {
  return makineKayitlariGetir().filter((k) => eskiHesabinMi(talep, k))
}

/** Talepteki seri no müşterinin kayıtlı makinelerinden biri mi? */
export function seriDogruMu(talep) {
  /* Seri çakışmasında makine ESKİ hesapta: defter satırı ya da eski
     hesabın makine listesi. */
  if (seriCakismasiMi(talep)) {
    const aranan = normalizeSerial(talep.seri)
    if (!aranan) return false
    return (
      eskiHesabinDefteri(talep).some((k) => normalizeSerial(k.seri) === aranan) ||
      (eskiHesapKaydi(talep)?.makineler || []).some(
        (m) => normalizeSerial(m.serial) === aranan
      )
    )
  }

  const seriler = (talebinMusterisi(talep)?.makineler || []).map((m) =>
    String(m.serial || '').replace(/\D/g, '')
  )
  const girilen = String(talep.seri || '').replace(/\D/g, '')
  return Boolean(girilen) && seriler.includes(girilen)
}

/** Talepteki eski numara hesaptaki numarayla aynı mı? */
export function numaraDogruMu(talep) {
  /* Seri çakışmasında karşılaştırılan hesap talebi açan değil, seriyi
     tutan eski hesap. O hesap bu tarayıcıda yoksa doğrulanamıyor. */
  const hesap = seriCakismasiMi(talep) ? eskiHesapKaydi(talep) : talebinMusterisi(talep)
  const kayitli = String(hesap?.tel || '').replace(/\D/g, '')
  const girilen = String(talep.eskiTel || '').replace(/\D/g, '')
  if (!kayitli || !girilen) return false
  return girilen.endsWith(kayitli) || kayitli.endsWith(girilen)
}

/* ESKİ HESABIN KAYITLARI YENİ HESABA — plan ve uygulama ayrı.

   Plan hiçbir şey yazmıyor; backoffice kartı onaydan önce neyin
   taşınacağını aynı hesapla gösteriyor. Onayda aynı plan yazılıyor —
   ekrandaki sayı ile yapılan iş ayrışamasın.

   NE TAŞINIYOR (demo: tarayıcı deposunun gördüğü kadarı)
     · Makine defteri: eski hesaba ait satırların müşteri bilgisi
       (musteriId/No/Ad) yeni hesaba. Makinenin yeri (il/ilçe), bayisi,
       servisi olduğu gibi kalıyor: makine aynı makine.
     · Talepler: eski numarayla (telHam) ya da eski hesabın kimliğiyle
       açılmış taleplerin telHam/tel/musteriId'si yeni hesaba.
     · Makine listesi: eski hesabın makineleri yeni hesabın listesine;
       eski hesabın listesi boşalıyor. Eski hesap bu tarayıcıda yoksa
       liste defter satırlarından kuruluyor ki müşteri makinesini görsün.
     · Eski hesap `birlesti` işaretini alıyor (yalnız demo müşterisinde).
       İşareti Müşteriler ekranı okuyor: hem listede hem müşteri
       kartında "… hesabına geçirildi" yazıyor. Okuyan ekran olmadan
       geriye açıklamasız, makinesi boşalmış bir kayıt kalıyordu.

   NE TAŞINAMIYOR
     · Eski hesap başka bir telefonda açılmışsa (bu tarayıcıda kaydı
       yoksa) numarası bilinmiyor: yalnız kimliğiyle işaretli talepler
       taşınıyor, numarayla açılanlar kalıyor. İşlem kaydına yazılıyor.
     · Başka cihazdaki oturum, bildirimler (`duyurular`), destek ve
       geri bildirim kayıtları taşınmıyor. Bunlar sunucuda
       hesap birleştirmenin işi (bkz. veritabani/tasarim.md). */
function hesapBirlesmePlani(talep) {
  const eski = eskiHesapKaydi(talep)
  const eskiId = talep.eskiHesap?.musteriId || null

  /* Yeni hesabın GÜNCEL kaydı: talep bırakıldıktan sonra numarası
     değişmiş olabilir; talepteki kopya değil güncel olan yazılıyor. */
  const yeniId = talep.yeniHesap?.musteriId || talep.musteriId
  const yeni = musterileriGetir().find((m) => m.id === yeniId) || null
  const hedef = {
    id: yeniId,
    no: yeni?.no || talep.yeniHesap?.musteriNo || null,
    ad: yeni?.ad || talep.ad || '',
    telHam: yeni?.tel || talep.yeniTelHam || '',
    ulke: yeni?.ulke || talep.yeniUlke || '',
  }

  const defter = makineKayitlariGetir().map((k) =>
    eskiHesabinMi(talep, k)
      ? { ...k, musteriId: hedef.id, musteriNo: hedef.no, musteriAd: hedef.ad }
      : k
  )
  const defterSayisi = makineKayitlariGetir().filter((k) => eskiHesabinMi(talep, k)).length

  const eskiTel = eski?.tel ? String(eski.tel) : ''
  const talebinMi = (t) =>
    (eskiTel && t.telHam === eskiTel) || (eskiId && t.musteriId === eskiId)
  const talepYamasi = (t) => ({
    ...t,
    telHam: hedef.telHam,
    tel: telGoster(hedef.ulke, hedef.telHam),
    telUlke: hedef.ulke,
    musteriId: hedef.id,
  })
  const talepler = load(ANAHTAR.talepler, [])
  const demoTalepler = load(ANAHTAR.demoTalepler, [])
  const talepSayisi = [...talepler, ...demoTalepler].filter(talebinMi).length

  /* Taşınacak makineler: eski hesabın listesi; yoksa defterden. */
  const kaynakMakineler = eski
    ? eski.makineler || []
    : eskiHesabinDefteri(talep).map((k) => ({
        id: uid(),
        productId: k.productId,
        serial: k.seri,
        year: validateSerial(k.seri).year || null,
        nickname: '',
        addedAt: k.tarih || Date.now(),
        hours: 0,
        doneMaintenance: [],
      }))
  const yeniMakineler = yeni?.makineler || []
  const eklenecek = kaynakMakineler.filter(
    (m) => !yeniMakineler.some((x) => normalizeSerial(x.serial) === normalizeSerial(m.serial))
  )

  return {
    eski, eskiId, hedef, defter, defterSayisi, talebinMi, talepYamasi,
    talepler, demoTalepler, talepSayisi, eklenecek,
    eskiTelBilinmiyor: !eskiTel,
  }
}

/** Onaydan önce gösterilecek özet: kaç makine, kaç defter satırı, kaç talep. */
export function hesapBirlesmeOzeti(talep) {
  const p = hesapBirlesmePlani(talep)
  return {
    makine: p.eklenecek.length,
    defter: p.defterSayisi,
    talep: p.talepSayisi,
    eskiTelBilinmiyor: p.eskiTelBilinmiyor,
  }
}

/* Makine listesi hesabın durduğu yerde: bu telefondaki hesap `machines`
   deposunda, demo müşterisi kendi kaydının içinde. */
function hesabinMakineleriniYaz(hesapId, degistir) {
  if (!hesapId) return
  const kisi = load(ANAHTAR.hesap, null) || load(ANAHTAR.kullanici, null)
  if (kisi && kisi.id === hesapId) {
    save(ANAHTAR.makineler, degistir(load(ANAHTAR.makineler, [])))
    return
  }
  save(
    ANAHTAR.demoMusteriler,
    load(ANAHTAR.demoMusteriler, []).map((m) =>
      m.id === hesapId ? { ...m, makineler: degistir(m.makineler || []) } : m
    )
  )
}

function hesaplariBirlestir(talep) {
  const p = hesapBirlesmePlani(talep)
  const kimlik = {
    eskiNo: p.eski?.no || talep.eskiHesap?.musteriNo || '',
    yeniNo: p.hedef.no || '',
    eskiTelBilinmiyor: p.eskiTelBilinmiyor,
  }

  /* TAŞINACAK HİÇBİR ŞEY YOKSA HİÇBİR DEPO YAZILMIYOR.

     Aynı eski hesap için ikinci bir talep daha onaylanabilir: kayıtlar
     ilk onayda taşındığı için ikincisinde taşınacak bir şey kalmıyor.
     Yine de yazsaydık eski hesabın `birlesti` işareti ikinci hesabı
     gösterirdi — kayıtlar birincide dururken. İşlem kaydına da
     "0 makine taşındı" diye yanıltıcı bir satır düşerdi. */
  if (!p.eklenecek.length && !p.defterSayisi && !p.talepSayisi) {
    return { bos: true, makine: 0, defter: 0, talep: 0, ...kimlik }
  }

  save(ANAHTAR.makineKayitlari, p.defter)
  save(ANAHTAR.talepler, p.talepler.map((t) => (p.talebinMi(t) ? p.talepYamasi(t) : t)))
  save(ANAHTAR.demoTalepler, p.demoTalepler.map((t) => (p.talebinMi(t) ? p.talepYamasi(t) : t)))

  hesabinMakineleriniYaz(p.hedef.id, (liste) => [...p.eklenecek, ...liste])
  if (p.eski) hesabinMakineleriniYaz(p.eski.id, () => [])

  if (p.eskiId) {
    save(
      ANAHTAR.demoMusteriler,
      load(ANAHTAR.demoMusteriler, []).map((m) =>
        m.id === p.eskiId
          ? { ...m, birlesti: { hesapId: p.hedef.id, hesapNo: p.hedef.no, tarih: Date.now() } }
          : m
      )
    )
  }

  return {
    bos: false,
    makine: p.eklenecek.length,
    defter: p.defterSayisi,
    talep: p.talepSayisi,
    ...kimlik,
  }
}

export function numaraTalebiKarar(talep, onay, personel, not) {
  const liste = numaraTalepleriGetir().map((t) =>
    t.id === talep.id
      ? {
          ...t,
          durum: onay ? 'onaylandi' : 'reddedildi',
          karar: { personel, tarih: Date.now(), not: not || '' },
        }
      : t
  )
  save(ANAHTAR.numaraTalepleri, liste)

  /* Seri çakışması: bu hesabın numarasına dokunulmuyor; eski hesabın
     kayıtları bu hesaba geçiyor. Reddedilirse yalnız talep kapanıyor. */
  if (seriCakismasiMi(talep)) {
    const sonuc = onay ? hesaplariBirlestir(talep) : null

    musteriyeBildir({
      musteriId: talep.musteriId,
      tur: 'numara',
      baslikAnahtar: 'bildirimler.cakismaBaslik',
      metinAnahtar: onay ? 'bildirimler.cakismaOnay' : 'bildirimler.cakismaRet',
      degerler: {},
    })

    islemYaz({
      tur: 'numara',
      ozet: !sonuc
        ? `${talep.ad} · seri çakışması reddedildi · ${talep.seri}${not ? ' · ' + not : ''}`
        : sonuc.bos
          ? `${talep.ad} · seri çakışması onaylandı · eski hesap ${
              sonuc.eskiNo || '—'
            } · taşınacak kayıt bulunamadı${not ? ' · ' + not : ''}`
          : `${talep.ad} · seri çakışması onaylandı · eski hesap ${sonuc.eskiNo || '—'} → ${
              sonuc.yeniNo || '—'
            } · ${sonuc.makine} makine, ${sonuc.defter} makine kaydı, ${sonuc.talep} talep taşındı${
              sonuc.eskiTelBilinmiyor ? ' · eski numara bilinmiyor, numarayla açılan talepler taşınamadı' : ''
            }${not ? ' · ' + not : ''}`,
      personel,
    })
    return liste
  }

  if (onay) {
    /* Ekranda görünen biçim değil, ham numara yazılıyor — yoksa giriş
       bir daha çalışmaz. Yalnız talebi açan hesabın numarası değişiyor. */
    ;[ANAHTAR.hesap, ANAHTAR.kullanici].forEach((k) => {
      const kayitli = load(k, null)
      if (kayitli && kayitli.id === talep.musteriId) {
        save(k, { ...kayitli, tel: talep.yeniTelHam, ulke: talep.yeniUlke })
      }
    })

    save(
      ANAHTAR.demoMusteriler,
      load(ANAHTAR.demoMusteriler, []).map((m) =>
        m.id === talep.musteriId
          ? { ...m, tel: talep.yeniTelHam, ulke: talep.yeniUlke }
          : m
      )
    )

    musteriyeBildir({
      musteriId: bildirimAlicisi(talep),
      tur: 'numara',
      baslikAnahtar: 'bildirimler.numaraBaslik',
      metinAnahtar: 'bildirimler.numaraOnay',
      degerler: {},
    })
  } else {
    musteriyeBildir({
      musteriId: bildirimAlicisi(talep),
      tur: 'numara',
      baslikAnahtar: 'bildirimler.numaraBaslik',
      metinAnahtar: 'bildirimler.numaraRet',
      degerler: {},
    })
  }

  islemYaz({
    tur: 'numara',
    ozet: `${talep.ad} · numara değişikliği ${onay ? 'onaylandı' : 'reddedildi'}${
      not ? ' · ' + not : ''
    }`,
    personel,
  })
  return liste
}

/* --------------------------------------------------------- Geri bildirimler */

export function geriBildirimGetir() {
  return load(ANAHTAR.geriBildirim, [])
}

/* Geri bildirime cevap.

   Personelin yazdığı not müşterinin Bildirimler ekranına düşüyor.
   Başlık sözlükten geliyor (müşterinin dilinde), notun kendisi yazıldığı
   gibi gidiyor — personelin cümlesini çeviremeyiz. */
export function geriBildirimNotEkle(gorus, metin, personel) {
  const not = { metin, tarih: Date.now(), personel }
  const liste = geriBildirimGetir().map((g) =>
    g.id === gorus.id
      ? { ...g, notlar: [...(g.notlar || []), not], okundu: true, okuyan: personel }
      : g
  )
  save(ANAHTAR.geriBildirim, liste)

  /* Görüş kaydı `musteriId` taşımıyor, yalnız telefonu var
     (bkz. lib/geriBildirim.js); kimlik oradan eşleştiriliyor. */
  musteriyeBildir({
    musteriId: bildirimAlicisi(gorus),
    tur: 'gorus',
    baslikAnahtar: 'bildirimler.gorusCevapBaslik',
    metin,
  })

  islemYaz({
    tur: 'geribildirim',
    ozet: `${gorus.no || 'Geri bildirim'} cevaplandı`,
    personel,
  })
  return liste
}

export function geriBildirimOkundu(id, personel) {
  const liste = geriBildirimGetir().map((g) =>
    g.id === id ? { ...g, okundu: true, okuyan: personel, okumaTarih: Date.now() } : g
  )
  save(ANAHTAR.geriBildirim, liste)
  const kayit = liste.find((g) => g.id === id)
  islemYaz({
    tur: 'geribildirim',
    ozet: `${kayit?.no || 'Geri bildirim'} okundu işaretlendi`,
    personel,
  })
  return liste
}

/* ----------------------------------------------------------------- Servisler */

export function servisleriGetirBackoffice() {
  return load(ANAHTAR.icerik, {}).servisler || null
}

/* `tur` genelde 'servis' (liste değişikliği). Şifre işlemleri kendi
   türünü veriyor: servis kendi şifresini değiştirdiğinde kayıt "Servis
   listesi" başlığı altında görünüyordu, oysa listeye dokunulmuyor. */
export function servisleriYaz(liste, personel, ozet, tur = 'servis') {
  const mevcut = load(ANAHTAR.icerik, {})
  save(ANAHTAR.icerik, { ...mevcut, servisler: liste })
  /* Okuyan taraf listeyi bellekte tutuyor; tazelenmezse aynı sayfada
     eski liste okunmaya devam ediyor (bkz. icerikDeposu.js). */
  icerikTazele()
  islemYaz({ tur, ozet, personel })
}

/* ------------------------------------------------------------------ Bayiler

   Bayi kaydının servis kaydından tek farkı yok denecek kadar azdır ama
   o fark önemli: bayide hesap yok. Bu yüzden burada şifre, oturum ve
   panel fonksiyonlarının karşılığı bulunmuyor — bilerek.

   İşlem kaydı türü de ayrı (`bayi`): "servis listesi değişti" ile
   "bayi listesi değişti" aynı satırda görünmemeli. */

export function bayileriGetirBackoffice() {
  return load(ANAHTAR.icerik, {}).bayiler || null
}

export function bayileriYaz(liste, personel, ozet) {
  const mevcut = load(ANAHTAR.icerik, {})
  save(ANAHTAR.icerik, { ...mevcut, bayiler: liste })
  icerikTazele()
  islemYaz({ tur: 'bayi', ozet, personel })
}

export function bayileriSifirla(personel) {
  const mevcut = { ...load(ANAHTAR.icerik, {}) }
  delete mevcut.bayiler
  save(ANAHTAR.icerik, mevcut)
  icerikTazele()
  islemYaz({ tur: 'bayi', ozet: 'Bayi listesi koddaki listeye döndürüldü', personel })
}

/* ------------------------------------------------------- Servis ve sahiplik

   Talep oluşurken bir servise yazılıyor (bkz. AppState.jsx). İki alan
   var ve ikisi farklı soruları cevaplıyor:

     talep.servis   → hangi servisin müşterisi. BİR DAHA DEĞİŞMİYOR.
     talep.sahip  → şu an kim ilgileniyor: 'servis' veya 'paksan'.

   Servis yetersiz kalıp PAKSAN'dan destek istediğinde yalnız `sahip`
   değişiyor. `servis` sabit kaldığı için servis, PAKSAN'ın attığı adımları
   görmeye devam ediyor — müşteri onun müşterisi olmaya devam ediyor.

   PAKSAN personeli talep servisteyken de görüyor ve müdahale edebiliyor.
   Müdahale ettiğinde `gecmis[]`'e düşüyor, servis de görüyor. Yetki
   kilidi konmadı: iş tanımı "PAKSAN izler ve gerektiğinde yönlendirir"
   diyor, kilit kimsenin istemediği bir engel olurdu.                 */

/** Bu servise düşen talepler. */
export function servisinTalepleri(liste, servisId) {
  return liste.filter((t) => t.servis?.id === servisId)
}

/** Servis PAKSAN'dan destek istiyor; sorumluluk PAKSAN'a geçiyor. */
export function destekTalepEt(talep, neden, servisAd) {
  /* Talep hâlâ "yeni" ise incelemeye alınıyor: PAKSAN'ın yeni talep
     kutusunda çakılı kalmasın, personel bildirimi düşsün. Ödeme
     onayındaki kalıbın aynısı. */
  const durum = talep.status === 'yeni' ? 'incelemede' : talep.status

  /* GEÇMİŞ SATIRI KAYNAĞIYLA YAZILIYOR (17 Eylül 2026). Satır, talebin
     o anki durumunu ve SERVİSİN ADINI taşıyor; durum 'parcaBekliyor' ya
     da 'onayBekliyor' ise gerçek bir servis kaydından ayırt
     edilemiyordu ve Raporlar'da destek istemek sahaya çıkmak gibi
     sayılıyordu ("İş yapan servis" ölçüsü). `kaynak` bunu söylüyor;
     tarih de tek okumadan geliyor, böylece `devir.tarih` ile geçmiş
     satırı bir milisaniye ayrışmıyor. */
  const simdi = Date.now()
  talepYaz(talep.id, {
    sahip: 'paksan',
    devir: { tarih: simdi, neden: neden || '', servisAd },
    status: durum,
    gecmis: [...(talep.gecmis || []), { durum, tarih: simdi, personel: servisAd, kaynak: 'devir' }],
  })
  islemYaz({
    tur: 'devir',
    ozet: `${talep.no} · ${servisAd} ${markaEk('dan')} destek istedi`,
    personel: servisAd,
    rol: 'servis',
  })
  /* Müşteriye bildirim gitmiyor: onun açısından değişen bir şey yok,
     muhatabı hâlâ servis. */
}

/* ==========================================================================
   SERVİS KAYDI AKIŞI

   Servis sahada işi bitirip kaydı gönderiyor; kayıt talebin üstüne
   yazılıyor ve talep içeriğine göre doğru masaya düşüyor. Kapıların
   gerekçesi lib/servisKaydi.js başında.

   BURADA YAZAN, ORADA HESAPLAYAN. `lib/servisKaydi.js` saf: doğruluyor
   ve hesaplıyor, hiçbir şeye yazmıyor. Depoya yazan tek yer burası —
   `talepYaz` bu dosyaya özel ve öyle kalmalı.
   ========================================================================== */

/** Servis sahadaki işi bitirdi, kaydı gönderiyor. */
export function servisKaydiGonder(talep, kayit, servisAd) {
  const hata = kaydiDogrula(kayit)
  if (hata) return { hata }

  /* PARÇANIN GÖNDERİLECEĞİ ADRES PARÇA İSTEĞİYLE BİRLİKTE (17 Eylül 2026).

     Garanti parçasını PAKSAN servise gönderiyor ama nereye
     gönderileceği sorulmuyordu; personel servisin firma adresine
     yolluyordu, parça bazen doğrudan tarlaya gitmeliydi. Adres 1.
     aşamada kaydın içine yazılıyor (`servisKaydi.teslimat`), yarım
     adres kabul edilmiyor. 2. aşamada soru yok: kayıt üstüne
     yazılırken (`devam`) alan olduğu gibi kalıyor; yeni ziyarette
     eski kayıtla birlikte arşive gidiyor. */
  if (kayit.asama === ASAMA.parca) {
    const teslimat = teslimatTemizle(kayit.teslimat)
    if (!teslimat) return { hata: 'Parçanın gönderileceği adresi seçin.' }
    kayit = { ...kayit, teslimat }
  }

  const { cozum, hakkedis, parcalar } = kaydiCozume(kayit)
  const sonuc = kapininSonucu(kayit)
  const simdi = Date.now()

  /* ÖNCEKİ KAYIT SİLİNMİYOR, ARŞİVLENİYOR.

     Müşteri kapanmış bir talepte "sorun devam ediyor" diyebiliyor;
     talep `yeni` durumuna dönüyor ve servis aynı talebe İKİNCİ kez
     gidiyor. İkinci kaydı gönderdiğinde `servisKaydi` alanı üzerine
     yazılıyordu: ilk ziyarette ne yapıldığı, hangi parça değiştiği ve
     ne kadar hak ediş doğduğu kayboluyordu.

     Kaybolan şey tam da bu ürünün en değerli verisi: makinenin arıza
     geçmişi (bkz. lib/servisKaydi.js başı). Üstelik ikinci ziyaretin
     sebebi çoğu zaman birincide yapılan iş — karşılaştırılacak kayıt
     yoksa "aynı arıza tekrar etti mi" sorusu cevapsız kalıyor.

     Artık her yeni kayıt, öncekini `oncekiKayitlar` dizisine itiyor.
     `servisKaydi` her zaman EN SON kayıt — okuyan ekranlar
     değişmedi. */
  /* AYNI ZİYARETİN İKİNCİ AŞAMASI ARŞİVE GİTMİYOR.

     Garanti işinde servis önce parçayı istiyor, parça gelince takıp
     "Parçayı Taktım" diyor. İkincisi YENİ BİR ZİYARET DEĞİL, aynı
     kaydın tamamlanması: arşivlenseydi tek iş, geçmişte iki ayrı
     ziyaret gibi görünürdü. Üstüne yazılıyor ve 1. aşamada girilen
     arıza, teşhis ve parça korunuyor. */
  const devam = talep.servisKaydi?.asama === ASAMA.parca && kayit.asama !== ASAMA.parca

  /* GARANTİ DIŞI KAPANIŞ DA ARŞİVE GİRİYOR (15 Eylül 2026).

     Servis garanti dışı işi kayıt açmadan kapatabiliyor (bkz.
     servis/ekranlar/TalepDetay.jsx → garantiDisi); o kapanışın izi
     yalnız `cozum`da. Müşteri "sorun devam ediyor" deyip servis bu
     kez garanti kaydı gönderirse `cozum` üzerine yazılıyor ve PAKSAN,
     aynı arızanın daha önce müşteriden ücret alınarak kapatıldığını
     hak edişi onaylarken "Önceki ziyaretler"de göremiyordu. */
  const garantiDisiKapanis =
    !devam && talep.cozum?.garantiDisi
      ? [{
          tarih: talep.cozum.tarih,
          servisAd: talep.cozum.personel,
          yapilanIs: talep.cozum.ozet,
          parcalar: [],
          garantiDisi: true,
        }]
      : []

  /* ESKİ SEVK BİLGİSİ YENİ ZİYARETE TAŞINMIYOR. Önceki ziyaretin
     parçası kargoyla gelmişse `parcaSevk` talepte kalıyordu; yeni
     ziyarette parça istenince Servisim "Parça yola çıktı" deyip eski
     takip numarasını gösteriyor, "Parçayı Taktım" parça gelmeden
     açılıyor, backoffice'te de "Parçayı Gönderdim" yerine "Kargo
     Bilgisini Gir" çıkıyordu. Sevk arşivdeki kayıtla birlikte
     saklanıyor, talepteki alan boşalıyor. Aynı ziyaretin 2. aşamasında
     (devam) sevk yerinde kalıyor. */
  const arsiv = !devam
    ? [
        ...(talep.oncekiKayitlar || []),
        ...(talep.servisKaydi
          ? [{ ...talep.servisKaydi, hakkedis: talep.hakkedis || null, parcaSevk: talep.parcaSevk || null }]
          : []),
        ...garantiDisiKapanis,
      ]
    : talep.oncekiKayitlar || []

  const yama = {
    status: sonuc.durum,
    masa: sonuc.masa,
    ...(devam ? {} : { parcaSevk: null }),
    /* Kayıt talebin üstünde duruyor; `cozum` eskisi gibi korunuyor
       çünkü müşteri uygulaması ve raporlar onu okuyor. */
    servisKaydi: devam
      ? { ...talep.servisKaydi, ...kayit, parcalar, tarih: simdi, servisAd }
      : { ...kayit, parcalar, tarih: simdi, servisAd },
    ...(arsiv.length ? { oncekiKayitlar: arsiv } : {}),
    cozum: { ...cozum, tarih: simdi, personel: servisAd },
    gecmis: [...(talep.gecmis || []), { durum: sonuc.durum, tarih: simdi, personel: servisAd }],
  }

  /* SERVİSİN DOLDURDUĞU EKSİK, TALEBİN KENDİSİNE DE İŞLENİYOR.

     Müşteri telefonla aradıysa talebin adı, telefonu, adresi ve
     makinesi boş açılıyor; o bilgiler ilk kez servis kaydında
     öğreniliyor. Yalnız kayıtta kalsalardı backoffice'in müşteri
     listesi, arama ve Excel çıktısı boş satırı görmeye devam
     ederdi. DOLU ALANIN ÜSTÜNE YAZILMIYOR: müşterinin kendi girdiği
     bilgi, servisin sahada duyduğundan önce gelir. */
  if (!talep.ad?.trim() && kayit.musteri?.ad) yama.ad = kayit.musteri.ad
  if (!talep.tel && kayit.musteri?.tel) {
    yama.tel = kayit.musteri.tel
    yama.telHam = kayit.musteri.tel.replace(/\D/g, '')
  }
  if (!talep.adres && kayit.musteri?.adres) yama.adres = kayit.musteri.adres
  if (!talep.makine?.serial && kayit.makine?.serial) {
    yama.makine = { ...(talep.makine || {}), ...kayit.makine }
  }
  if (!talep.aciklama?.trim() && kayit.ariza) yama.aciklama = kayit.ariza

  /* HAK EDİŞ İŞ BİTTİĞİNDE DOĞUYOR, İSTENDİĞİNDE DEĞİL.

     Yalnız garanti kapısında doğuyor — garanti dışı işin parasını
     müşteri servise ödüyor, PAKSAN'ı ilgilendirmiyor. Ayrıca yalnız
     2. aşamada: parça istenirken yol ve işçilik daha sorulmadı,
     ortada ödenecek bir tutar yok. */
  if (kayit.kapi === 'garanti' && kayit.asama !== ASAMA.parca) {
    yama.hakkedis = { ...hakkedis, durum: 'bekliyor', olusma: simdi }
  } else if (talep.hakkedis && !devam) {
    /* İkinci ziyaret garanti dışıysa eski hak ediş talebin üstünde
       kalmamalı: arşive taşındı, güncel kayıtta karşılığı yok. */
    yama.hakkedis = null
  }

  talepYaz(talep.id, yama)
  islemYaz({
    tur: 'servisKaydi',
    ozet: `${talep.no} · ${servisAd} servis kaydını gönderdi · ${cozum.ozet}`,
    personel: servisAd,
    rol: 'servis',
  })

  /* SERVİS GELDİ, MÜŞTERİ HABER ALMIYORDU.

     Bildirim yalnız `kapandi` sonucunda gidiyordu. Oysa kapının üç
     sonucu var (bkz. lib/servisKaydi.js → kapininSonucu): iş bitti,
     parça bekleniyor, kayıt PAKSAN'da inceleniyor. Son ikisinde servis
     sahaya gidiyor, işi yazıyor ve müşterinin uygulamasında günlerce
     hiçbir şey olmuyordu — çiftçi makinesinin başına kimin geldiğini
     ve şimdi ne beklediğini uygulamadan göremiyordu.

     METİN YENİ YAZILMADI. Müşterinin bu iki aşama için gördüğü
     karşılık sözlükte zaten duruyor (`talepDurum.*`, iki dilde de
     yazılı) ve ekranın durum rozetinde aynı cümle çıkıyor; bildirim
     de onu kullanıyor, böylece iki yerde iki ayrı cümle olmuyor. */
  const DURUM_METNI = {
    kapandi: 'bildirimler.durum_kapandi',
    parcaBekliyor: 'talepDurum.parcaBekliyor',
    onayBekliyor: 'talepDurum.onayBekliyor',
  }
  const metinAnahtar = DURUM_METNI[sonuc.durum]
  if (metinAnahtar) {
    musteriyeBildir({
      musteriId: bildirimAlicisi(talep),
      tur: 'talep',
      baslikAnahtar: 'bildirimler.durumBaslik',
      metinAnahtar,
      degerler: { no: talep.no, durum: sonuc.durum, talepTur: talep.tur },
      talepNo: talep.no,
    })
  }
  return { kayit: yama.servisKaydi, hakkedis: yama.hakkedis || null }
}

/* PAKSAN personeli servisin girdiği rakamı düzeltiyor.

   DÜZELTME GİZLİ DEĞİL. Servis uygulamasında "siz şunu yazdınız,
   PAKSAN şuna çevirdi" satırı ve gerekçesi duruyor. Para konusunda
   sessiz değişiklik güveni bitirir; ayrıca servis neyi yanlış
   girdiğini ancak böyle öğreniyor. */
export function hakkedisDuzelt(talep, yeniKayit, neden, personel) {
  const hata = kaydiDogrula(yeniKayit)
  if (hata) return { hata }
  if (!neden?.trim()) return { hata: 'Düzeltme gerekçesini yazın.' }

  const onceki = talep.servisKaydi || {}
  const { cozum, hakkedis, parcalar } = kaydiCozume(yeniKayit)
  const simdi = Date.now()

  const kayit = {
    ...onceki,
    ...yeniKayit,
    parcalar,
    duzeltmeler: [
      ...(onceki.duzeltmeler || []),
      {
        tarih: simdi,
        personel,
        neden: neden.trim(),
        onceki: { km: onceki.km, iscilik: onceki.iscilik, parcalar: onceki.parcalar },
        yeni: { km: yeniKayit.km, iscilik: yeniKayit.iscilik, parcalar },
      },
    ],
  }

  talepYaz(talep.id, {
    servisKaydi: kayit,
    cozum: { ...(talep.cozum || {}), ...cozum },
    hakkedis: { ...(talep.hakkedis || {}), ...hakkedis, durum: 'bekliyor' },
  })
  islemYaz({
    tur: 'hakkedis',
    ozet: `${talep.no} · servis kaydı düzeltildi · ${neden.trim()}`,
    personel,
  })
  return { kayit }
}

/* Hak edişi onaylıyor: servisin cari hesabına alacak yazılıyor.

   ONAY ARTIK SON ADIM. Bir dönem parça istenmişse talep onaydan sonra
   `parcaBekliyor` durumuna geçiyordu: parça hazırlanması onaya bağlıydı
   ve servis, işini bitirmeden parasını almış oluyordu. Sıra tersine
   çevrildi — parça önce hazırlanıyor, servis takıyor, kayıt ondan sonra
   onaya geliyor (bkz. lib/servisKaydi.js başı). Onay bu yüzden hep
   talebi kapatıyor. */
export function hakkedisOnayla(talep, personel) {
  if (talep.status !== 'onayBekliyor') return { hata: 'Bu talep onay beklemiyor.' }

  const hakkedis = { ...(talep.hakkedis || {}), durum: 'onaylandi', onay: { personel, tarih: Date.now() } }
  const durum = 'kapandi'

  talepYaz(talep.id, {
    hakkedis,
    status: durum,
    masa: null,
    gecmis: [...(talep.gecmis || []), { durum, tarih: Date.now(), personel }],
  })

  if (hakkedis.toplam > 0) {
    cariHareketEkle({
      servisId: talep.servis?.id,
      servisAd: talep.servis?.ad,
      tur: 'alacak',
      tutar: hakkedis.toplam,
      /* SERVİSİN GÖRDÜĞÜ SATIR. Kendi ekranında "hak ediş" terimi
         geçmiyor (bkz. servis/ekranlar/Hakkedis.jsx); defterdeki
         açıklama da aynı dili konuşuyor. */
      aciklama: `${talep.no} · servis ödemesi`,
      talepNo: talep.no,
      personel,
    })
  }

  /* MÜŞTERİ ARTIK HABER ALIYOR.

     Onay talebi kapatan adım oldu; kapanan her talepte müşteriye
     bildirim gidiyor (bkz. talepKapat). Burada gitmiyordu: garanti
     işi tamamlanıyor, müşterinin uygulamasında talep sessizce
     kapanıyordu. */
  musteriyeBildir({
    musteriId: bildirimAlicisi(talep),
    tur: 'talep',
    baslikAnahtar: 'bildirimler.durumBaslik',
    metinAnahtar: 'bildirimler.durum_kapandi',
    degerler: { no: talep.no, durum: 'kapandi', talepTur: talep.tur },
    talepNo: talep.no,
  })

  islemYaz({
    tur: 'hakkedis',
    ozet: `${talep.no} · hak ediş onaylandı · ${hakkedis.toplam} ${PARA_BIRIMI}`,
    personel,
  })
  return { hakkedis, durum }
}

/** Hak edişi reddeder; gerekçe servise görünüyor. */
export function hakkedisReddet(talep, neden, personel) {
  if (!neden?.trim()) return { hata: 'Red gerekçesini yazın.' }
  talepYaz(talep.id, {
    hakkedis: {
      ...(talep.hakkedis || {}),
      durum: 'reddedildi',
      red: { personel, tarih: Date.now(), neden: neden.trim() },
    },
    status: 'kapandi',
    masa: null,
    gecmis: [...(talep.gecmis || []), { durum: 'kapandi', tarih: Date.now(), personel }],
  })
  islemYaz({ tur: 'hakkedis', ozet: `${talep.no} · hak ediş reddedildi · ${neden.trim()}`, personel })
  return { tamam: true }
}

/** Yedek parça personeli parçayı kargoya verdi. */
export function servisParcasiGonderildi(talep, kargo, personel) {
  const simdi = Date.now()
  /* İKİNCİ ÇAĞRI SEVKİ TEKRARLAMIYOR, ÜSTÜNE YAZIYOR.

     Kargo firması ve takip numarası çoğu zaman gönderim anında belli
     değil: paket kargoya veriliyor, numara akşam ya da ertesi gün
     geliyor. Bu yüzden ikisi de boş bırakılabiliyor ve aynı form
     sonradan yeniden açılıyor. İlk sevkin tarihi ve o işi yapan
     personel korunuyor — sonradan numara giren başka biri olabilir,
     parçayı gönderen o değil. */
  const onceki = talep.parcaSevk || null

  /* MASA TAKİP NUMARASI GELENE KADAR BOŞALMIYOR.

     Sıra normalde serviste: parçayı takıp talebi kendisi kapatacak,
     yedek parça masasında yapılacak bir şey kalmıyor. Ama takip
     numarası boş bırakıldıysa KALIYOR — numara akşam ya da ertesi
     gün geliyor ve girilmesi gereken yer burası.

     Masa hemen boşalsaydı talep yedek parça personelinin listesinden
     düşerdi (`rolunTalepleri` masaya bakıyor) ve numarayı girmek
     isteyen kişi talebi bir daha bulamazdı. Ölçülerek görüldü.

     Formun ikinci açılışında masa her hâlükârda boşalıyor: numara
     girilmişse zaten iş bitti, girilmemişse personel "böyle
     gidecek" demiş oluyor — kendi elindeki işi kendisi kapatıyor. */
  const masaKalsin = !onceki && !kargo?.takipNo
  talepYaz(talep.id, {
    masa: masaKalsin ? 'parca' : null,
    parcaSevk: {
      ...kargo,
      tarih: onceki?.tarih || simdi,
      personel: onceki?.personel || personel,
      ...(onceki ? { guncelleme: simdi, guncelleyen: personel } : {}),
    },
    gecmis: onceki
      ? talep.gecmis || []
      : [...(talep.gecmis || []), { durum: 'parcaBekliyor', tarih: simdi, personel }],
  })
  const kargoYazi = [kargo?.firma, kargo?.takipNo].filter(Boolean).join(' ')
  islemYaz({
    tur: 'sevk',
    ozet: onceki
      ? `${talep.no} · kargo bilgisi güncellendi${kargoYazi ? ' · ' + kargoYazi : ''}`
      : `${talep.no} · parça gönderildi${kargoYazi ? ' · ' + kargoYazi : ''}`,
    personel,
  })
  return { tamam: true }
}

/* ==========================================================================
   Servisin kendi parça siparişi

   AYRI BİR SİPARİŞ DEFTERİ YOK.

   Bir dönem vardı (`servisSiparis` + backoffice'te Servis Siparişleri
   ekranı) ve kaldırıldı: yedek parça personeli günü Talepler ekranında
   geçiriyor, servisin siparişi oraya hiç düşmüyordu. Her yeni iş türü
   için yeni bir ekran açmak, sonunda hiçbir ekranın tam resmi
   göstermemesi demek.

   Servisin siparişi artık NORMAL BİR YEDEK PARÇA TALEBİ. Aynı listede,
   aynı durumlarda, aynı kapanış formuyla. Tek farkı `servisSiparisi`
   işareti: müşterisi yok, müşterisi servisin kendisi.

   SATIRIN KİMLİĞİ KOD, AD DEĞİL

   Adetler bir dönem parça ADINA göre anahtarlanıyordu. PAKSAN'ın
   gerçek fiyat listesinde aynı adı taşıyan altı parça var: iki ayrı
   kod tek satıra düşüyor, biri diğerinin adedini siliyor ve sipariş
   eksik geliyordu. Anahtar artık kod (bkz. lib/parcaKatalogu.js →
   parcaBul: birincil anahtar `kod`).

   FİYAT ANLIK GÖRÜNTÜSÜ KAYDIN İÇİNE YAZILIYOR

   Sipariş anındaki satırlar, katalog sürümü ve kaynağı `parcaFiyat`
   alanında duruyor — müşterinin parça talebinde kullanılan alanın
   aynısı, böylece backoffice iki kayıt için tek biçim okuyor
   (bkz. ekranlar/Talepler.jsx → parcaKalemleri). Tutarlar servisin
   ödediği iskontolu fiyattan geliyor; kayıt canlı katalogla yeniden
   hesaplanmıyor.
   ========================================================================== */
export function servisParcaSiparisi({
  servisId,
  servisAd,
  servisNo,
  servisTel,
  il,
  ilce,
  kalemler,
  parcaFiyat,
  not,
  teslimat,
  odeme,
  tutar,
  tutarKdvli,
}) {
  const temiz = (kalemler || [])
    .map((k) => ({
      kod: String(k?.kod || '').trim(),
      ad: String(k?.ad || '').trim(),
      adet: Number(k?.adet) || 0,
    }))
    .filter((k) => k.adet > 0 && (k.kod || k.ad))
  if (!temiz.length) return { hata: 'En az bir parça seçin.' }

  /* TESLİMAT YAPISAL (17 Eylül 2026). Servisim adresi Adreslerim'den
     ya da "Elle Gir"den nesne olarak veriyor: alıcı, telefon, il, ilçe,
     açık adres (bkz. lib/teslimat.js). Yarım adres kaydedilmiyor —
     parçayı hazırlayan personel onu tam sanıp kargoya verirdi.
     Düz yazı gelirse (eski çağrı) eskisi gibi yalnız `fatura.adres`. */
  const teslim = teslimatTemizle(teslimat)
  const teslimYazi = teslim ? teslim.yazi : typeof teslimat === 'string' ? teslimat.trim() : ''
  if (!teslimYazi) return { hata: 'Parçanın gönderileceği adresi seçin.' }

  /* Satırları olmayan bir görüntü kaydedilmiyor: okuyan ekranlar
     `parcaFiyat`ın varlığını "fiyat yazılı" diye anlıyor (bkz.
     ekranlar/Talepler.jsx → BeklenenTutar). Boş bir nesne, tutarı
     bilinmeyen siparişi tutarı sıfır gibi gösterirdi. */
  const goruntu =
    parcaFiyat && Array.isArray(parcaFiyat.satirlar) && parcaFiyat.satirlar.length
      ? parcaFiyat
      : null

  /* TUTAR TEK YERDEN: kaydedilen görüntüden. Ayrıca gelen `tutar` ve
     `tutarKdvli` yalnız görüntüsü olmayan çağrılar için duruyor.
     KDV elle çarpılmıyor — oranı ve "liste KDV hariç mi" kararını
     `kdvTutari` biliyor (bkz. marka/katalog/para.js). */
  const araToplam = Number(goruntu ? goruntu.araToplam : tutar) || 0
  const kdvliToplam =
    Number(goruntu ? goruntu.toplam : tutarKdvli) || araToplam + kdvTutari(araToplam)

  const simdi = Date.now()
  const talep = {
    id: uid(),
    no: talepNo('parca'),
    createdAt: simdi,
    status: 'yeni',
    tur: 'parca',
    /* Müşteri alanına servisin kendisi yazılıyor: talebi açan o,
       parça ona gidecek, telefonu aranacak numara. */
    ad: servisAd,
    tel: servisTel || '',
    telHam: String(servisTel || '').replace(/\D/g, ''),
    il: il || '',
    ilce: ilce || '',
    ulke: 'TR',
    ihracat: false,
    musteriId: null,
    aciklama: (not || '').trim(),
    /* Ekranlarda görünen ad listesi. Kod, adet ve tutar `parcaFiyat`
       içinde yazılı; okuyan taraf parçayı oradan koduyla buluyor. */
    parcalar: temiz.map((k) => k.ad || k.kod),
    /* ADET KOD ANAHTARLI. Aynı adı taşıyan iki parça artık ayrı ayrı
       duruyor. Kodu olmayan satır (katalog dışı, elle yazılmış) ancak
       adıyla anahtarlanabiliyor; kod uydurulmuyor. */
    parcaAdet: Object.fromEntries(temiz.map((k) => [k.kod || k.ad, k.adet])),
    /* Sipariş anındaki fiyat görüntüsü. Müşterinin parça talebindeki
       alanın aynısı; yoksa null (bkz. backoffice/demo.js). */
    parcaFiyat: goruntu,
    /* `fatura.adres` geriye uyum için tek satır: onu okuyan ekranlar
       (Servisim talep detayı, Excel) değişmeden çalışıyor. Yapısal hâli
       `teslimat`ta; backoffice parçayı gönderirken onu okuyor. */
    fatura: { ad: servisAd, adres: teslimYazi },
    teslimat: teslim,
    /* İSTENEN TESLİM TARİHİ KALDIRILDI.

       Soruluyordu ve hiçbir şeye bağlanmıyordu: ne sevkiyat planına
       ne kapanış formuna giriyordu. Cevabı olmayan bir soru, formu
       uzatmaktan başka bir iş yapmaz.

       ÖDEME BİÇİMİ ONUN YERİNE GELDİ. Servis cari hesaplı çalışıyor;
       bu siparişin bedelinin hak edişinden düşülmesini isteyebiliyor.
       Karar burada kaydediliyor, PARA BURADA İŞLENMİYOR: tutar
       bağlayıcı değil ve sipariş henüz onaylanmadı. Düşüm, parça
       gönderilip talep kapandığında yapılıyor (bkz. talepKapat). */
    odeme: odeme === 'bakiye' ? 'bakiye' : 'fatura',
    /* Sipariş anındaki tutar kaydediliyor: fiyat listesi sonradan
       değişince "bu siparişi hangi fiyattan verdim" sorusunun cevabı
       kalsın. Rakam `parcaFiyat` görüntüsünden geliyor; iki alan
       listelerin kestirmesi, kaynağı değil. */
    tutar: araToplam,
    /* Hak edişten düşülecek tutar KDV dâhil olan. `tutar` alanı KDV
       hariç ve listelerde o görünüyor; ikisini tek alana sıkıştırmak,
       bir yerde eksik bir yerde fazla rakam demekti. */
    tutarKdvli: kdvliToplam,
    servisSiparisi: true,
    sahip: 'paksan',
    masa: 'parca',
    servis: { id: servisId, ad: servisAd, no: servisNo, tarih: simdi },
    gecmis: [{ durum: 'yeni', tarih: simdi, personel: servisAd }],
  }

  save(ANAHTAR.talepler, [talep, ...load(ANAHTAR.talepler, [])])
  islemYaz({
    tur: 'talep',
    ozet: `${talep.no} · servis parça siparişi · ${servisAd} · ${temiz.length} kalem`,
    personel: servisAd,
  })
  return { talep }
}

/** Servisin kendi siparişleri; müşteri işlerinden ayrı listeleniyor. */
export function servisinSiparisleri(liste, servisId) {
  return liste.filter((t) => t.servisSiparisi && t.servis?.id === servisId)
}

/* ==========================================================================
   Cari hesap

   Servisin PAKSAN'daki bakiyesi. Hak ediş onaylandığında alacak,
   ödeme yapıldığında borç yazılıyor.

   TEK DEFTER. Servisin uygulamasındaki bakiye ile backoffice'in
   gördüğü bakiye aynı kayıttan okunuyor; paralel bir depo açmak iki
   tarafın birbirini görmemesi demekti.

   BUGÜNKÜ SINIR: her şey `localStorage`. Servisin telefonundaki
   bakiye PAKSAN'ın ekranına ulaşmıyor. Defterin biçimi doğru;
   sunucu geldiğinde yalnız okuma-yazma katmanı değişecek.
   ========================================================================== */

export function cariHareketleri(servisId) {
  const hepsi = load(ANAHTAR.cari, [])
  return servisId ? hepsi.filter((h) => h.servisId === servisId) : hepsi
}

export function cariHareketEkle(hareket) {
  const kayit = { id: uid(), tarih: Date.now(), ...hareket }
  save(ANAHTAR.cari, [kayit, ...load(ANAHTAR.cari, [])])
  return kayit
}

/** Servisin bakiyesi: alacak eksi ödenen. Artı değer PAKSAN'ın borcu. */
export function cariBakiye(servisId) {
  return cariHareketleri(servisId).reduce(
    (t, h) => t + (h.tur === 'alacak' ? h.tutar : -h.tutar),
    0,
  )
}

/* ------------------------------------------------------------- Servis girişi

   Servis paneli ayrı bir derleme ama servis kaydı ayrı bir varlık değil:
   servis kaydı ile servis hesabı aynı şey. İkiye bölmek, iki yerde senkron
   tutulacak liste demek olurdu.

   Hesabı PAKSAN açıyor. Servis kendi kaydını oluşturamıyor, şifresini
   unutursa da PAKSAN'ı arıyor — hesap silme ve numara değişikliğinde
   uygulanan kuralın aynısı.

   `ILK_ADMIN` kalıbı burada TEKRARLANMIYOR: bilinen kullanıcı adı ve
   şifreyle kendiliğinden açılan hesap yok. Hesabı olmayan servis
   giremiyor.                                                         */

/** Servise panel hesabı tanımlar veya şifresini yeniler. */
export async function servisHesabiYaz(servisId, { kullanici, sifre }, personel) {
  const ad = String(kullanici || '').trim().toLocaleLowerCase('tr-TR')
  if (!ad) return { hata: 'Kullanıcı adı boş olamaz.' }
  if (sifre && !sifreGecerliMi(sifre)) {
    return { hata: `Şifre ${BACKOFFICE_SIFRE_HANE} rakamdan oluşmalı.` }
  }

  const liste = servisleriGetir()
  const hedef = liste.find((b) => b.id === servisId)
  if (!hedef) return { hata: 'Servis bulunamadı.' }

  const cakisma = liste.find((b) => b.id !== servisId && b.kullanici === ad)
  if (cakisma) return { hata: `Bu kullanıcı adı ${cakisma.ad} için zaten kullanılıyor.` }

  const yeniSifre = sifre ? await sifreHazirla(sifre) : hedef.sifre
  if (!yeniSifre) return { hata: 'İlk hesap açılışında şifre gereklidir.' }

  const yeni = liste.map((b) =>
    b.id === servisId
      ? { ...b, kullanici: ad, sifre: yeniSifre, panelAktif: true, ilkGiris: Boolean(sifre) }
      : b,
  )
  servisleriYaz(
    yeni,
    personel,
    `${hedef.ad} için panel hesabı ${hedef.kullanici ? 'güncellendi' : 'açıldı'}`,
  )
  return { tamam: true }
}

/** Servisin panel hesabını kapatır; kayıt ve geçmiş duruyor. */
export function servisHesabiKapat(servisId, personel) {
  const liste = servisleriGetir()
  const hedef = liste.find((b) => b.id === servisId)
  if (!hedef) return { hata: 'Servis bulunamadı.' }
  servisleriYaz(
    liste.map((b) => (b.id === servisId ? { ...b, panelAktif: false } : b)),
    personel,
    `${hedef.ad} için panel hesabı kapatıldı`,
  )
  return { tamam: true }
}

export async function servisGirisi(kullanici, sifre) {
  const ad = String(kullanici || '').trim().toLocaleLowerCase('tr-TR')
  const kayit = servisleriGetir().find((b) => b.kullanici === ad)

  if (!kayit) return { hata: 'Kullanıcı adı veya şifre yanlış.' }
  if (kayit.panelAktif === false) {
    return { hata: `Bu hesap kapalı. ${MARKA} yetkilinize başvurun.` }
  }
  if (!(await sifreDogruMu(sifre, kayit.sifre))) {
    return { hata: 'Kullanıcı adı veya şifre yanlış.' }
  }

  const oturum = {
    servisId: kayit.id,
    no: kayit.no,
    ad: kayit.ad,
    il: kayit.il,
    ilkGiris: Boolean(kayit.ilkGiris),
    giris: Date.now(),
  }
  oturumKaydet(ANAHTAR.servisOturum, oturum)
  islemYaz({ tur: 'oturum', ozet: 'Servis paneline giriş', personel: kayit.ad, rol: 'servis' })
  return { oturum }
}

export function servisOturumuGetir() {
  /* OTURUM UYGULAMA KAPANINCA BİTİYOR (10 Eylül 2026): açılışta her
     zaman giriş ekranı. Eski sürümlerin kalıcı depoya yazdığı oturum
     burada siliniyor (bkz. lib/storage.js → oturumYukle). */
  remove(ANAHTAR.servisOturum)
  const o = oturumYukle(ANAHTAR.servisOturum, null)
  return o?.servisId ? o : null
}

export function servisOturumuKapat(o) {
  islemYaz({ tur: 'oturum', ozet: 'Servis panelinden çıkış', personel: o?.ad, rol: 'servis' })
  oturumSil(ANAHTAR.servisOturum)
}

/** Servis ilk girişte kendi şifresini belirliyor. */
export async function servisSifresiniDegistir(servisId, yeniSifre, eskiSifre) {
  if (!sifreGecerliMi(yeniSifre)) {
    return { hata: `Şifre ${BACKOFFICE_SIFRE_HANE} rakamdan oluşmalı.` }
  }
  const liste = servisleriGetir()
  const hedef = liste.find((b) => b.id === servisId)
  if (!hedef) return { hata: 'Servis bulunamadı.' }

  /* ESKİ ŞİFRE YALNIZ İSTEYEREK DEĞİŞTİRİRKEN SORULUYOR.

     İlk giriş akışında sorulmuyor ve sorulmamalı: servis zaten geçici
     şifreyle o an giriş yaptı, kimliği kanıtlandı. Hesap ekranından
     kendi isteğiyle değiştirirken ise açık oturumun sahibi olmak
     yetmiyor — telefon başkasının elinde kalmış olabilir. */
  if (eskiSifre !== undefined) {
    if (!(await sifreDogruMu(eskiSifre, hedef.sifre))) {
      return { hata: 'Mevcut şifreniz yanlış.' }
    }
    if (await sifreDogruMu(yeniSifre, hedef.sifre)) {
      return { hata: 'Yeni şifre eskisiyle aynı olamaz.' }
    }
  }

  const hazir = await sifreHazirla(yeniSifre)
  servisleriYaz(
    liste.map((b) => (b.id === servisId ? { ...b, sifre: hazir, ilkGiris: false } : b)),
    hedef.ad,
    `${hedef.ad} panel şifresini değiştirdi`,
    'sifre',
  )
  const o = servisOturumuGetir()
  if (o?.servisId === servisId) save(ANAHTAR.servisOturum, { ...o, ilkGiris: false })
  return { tamam: true }
}

/* ------------------------------------------------- Servis şifre talepleri

   BAYİ ŞİFRESİNİ KENDİ SIFIRLAYAMIYOR.

   Personelin şifre sıfırlaması e-postayla çalışıyor (bkz.
   `sifreTalebiOlustur`). Serviste e-posta yok: hesabı PAKSAN açıyor,
   iletişim telefonla yürüyor. Kendi kendine sıfırlayan bir akış
   kurmak, servisin kullanıcı adını bilen herkese hesabı açardı.

   Bunun yerine servis TALEP bırakıyor, PAKSAN backoffice'te görüyor ve
   servisi arayıp geçici şifre veriyor. Servis o şifreyle girince
   `ilkGiris` akışı kendi şifresini belirletiyor — zaten var olan yol.

   Hesap silme ve numara değişikliğinde uygulanan kuralın aynısı:
   hesabın kendisine dair kararlar PAKSAN'da.                          */

export function servisSifreTalepleriGetir() {
  return load(ANAHTAR.servisSifreTalep, []).sort((a, b) => b.tarih - a.tarih)
}

/** Servis giriş ekranından "şifremi unuttum" der. */
export function servisSifreTalebiAc(kullanici) {
  const ad = String(kullanici || '').trim().toLocaleLowerCase('tr-TR')
  if (!ad) return { hata: 'Önce kullanıcı adınızı yazın.' }

  const kayit = servisleriGetir().find((b) => b.kullanici === ad)

  /* Kullanıcı adı bulunamasa da AYNI cevap dönüyor: "böyle bir servis
     yok" demek, deneme yanılmayla kullanıcı adı bulmayı kolaylaştırır.
     Kayıt yalnız gerçek servis için yazılıyor. */
  if (kayit) {
    const acikVar = load(ANAHTAR.servisSifreTalep, []).some(
      (t) => t.servisId === kayit.id && t.durum === 'bekliyor',
    )
    if (!acikVar) {
      save(ANAHTAR.servisSifreTalep, [
        {
          id: uid(),
          servisId: kayit.id,
          servisAd: kayit.ad,
          servisNo: kayit.no,
          kullanici: ad,
          durum: 'bekliyor',
          tarih: Date.now(),
        },
        ...load(ANAHTAR.servisSifreTalep, []),
      ])
      islemYaz({
        tur: 'sifre',
        ozet: `${kayit.ad} panel şifresi için yardım istedi`,
        rol: 'servis',
      })
    }
  }
  return { tamam: true }
}

/** PAKSAN talebi kapatır (servisi aradı, geçici şifreyi verdi). */
export function servisSifreTalebiKapat(talepId, personel) {
  const liste = load(ANAHTAR.servisSifreTalep, [])
  save(
    ANAHTAR.servisSifreTalep,
    liste.map((t) =>
      t.id === talepId
        ? { ...t, durum: 'kapandi', kapatan: personel, kapanis: Date.now() }
        : t,
    ),
  )
  islemYaz({ tur: 'sifre', ozet: 'Servis şifre talebi kapatıldı', personel })
}

/* --------------------------------------------------------- Makine kayıtları

   Müşteri makinesini uygulamaya kaydettiğinde buraya bir satır düşüyor.
   Logo bağlıysa satırda faturanın kesildiği servis de yazıyor; bağlı
   değilse servis alanı boş kalıyor (bkz. src/lib/logo.js).             */

export function makineKayitlariGetir() {
  return load(ANAHTAR.makineKayitlari, [])
}

/* ------------------------------------------------------- Destek kayıtları

   Müşteri destek ekranında ne aradı, hangi soruyu seçti, cevap
   bulabildi mi — hepsi uygulamada kaydediliyor (bkz. src/lib/destekLog.js).
   Backoffice o kaydı okuyor; yazmıyor.                                     */

export function destekOturumlariGetir() {
  return load(ANAHTAR.destekLog, [])
}

/* ------------------------------------------------------------- İşlem kaydı */

export function islemKaydiGetir() {
  return load(ANAHTAR.islemKaydi, [])
}

export function islemYaz({ tur, ozet, personel, rol }) {
  /* ROL AÇIKÇA YAZILMADIYSA ÇALIŞAN DERLEMEYE BAKILIYOR.

     Önce yalnız backoffice oturumuna bakılıyordu. Servis panelinde öyle
     bir oturum yok: servisin randevusu, kapattığı iş ve eklediği not
     rolsüz kaydediliyor, İşlem Kaydı ekranında "—" görünüyordu. Aynı
     tarayıcıda personel de backoffice'e girmişse rol daha da yanlış
     oluyordu — servisin işlemi personelin rolüyle yazılıyordu.

     Karar tarayıcıya değil, çalışan derlemeye ait (src/lib/urun.js). */
  const serviste = urun() === 'servis'
  const oturum = serviste
    ? oturumYukle(ANAHTAR.servisOturum, null)
    : load(ANAHTAR.oturum, null)
  const kayit = {
    id: uid(),
    tarih: Date.now(),
    tur,
    ozet,
    personel: personel || oturum?.ad || '—',
    rol: rol || (serviste ? 'servis' : oturum?.rol) || null,
  }
  save(ANAHTAR.islemKaydi, [kayit, ...islemKaydiGetir()].slice(0, 500))
  return kayit
}
