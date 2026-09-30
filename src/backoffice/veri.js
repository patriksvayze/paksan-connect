/* ==========================================================================
   Backoffice’in veri katmanı

   Bütün ekranlar veriye yalnız buradan ulaşıyor. Şu an veri tarayıcının
   hafızasında; sunucu geldiğinde bu dosyadaki fonksiyonların içi sunucu
   çağrısıyla değişecek, ekranlara dokunulmayacak.
   ========================================================================== */

import { load, save, uid, remove, oturumYukle, oturumKaydet, oturumSil } from '../lib/storage'
import { sifreHazirla, sifreDogruMu, sifreGecerliMi } from '../lib/hesap'
import { yeniNo } from '../lib/numara'
import { talepNo, makinesizTeklif, sevkSatiriMi } from '../lib/talep'
import { SIRKET, MARKA, markaEk, PARA_BIRIMI, kdvTutari } from '../marka'
import { urun } from '../lib/urun'
import { ASAMA, iscilikAlanlari, kaydiDogrula, kaydiCozume, kapininSonucu, satirlarinAdedi, siparisGonderimi } from '../lib/servisKaydi.js'
import { teslimatTemizle } from '../lib/teslimat.js'
import { servisleriGetir, getProduct } from '../marka'
import { icerikListe, icerikTazele } from '../lib/icerikDeposu.js'
import { altBilgi } from '../data/duyuruTurleri.js'
import { SERI_CAKISMASI } from '../lib/numaraTalebi.js'
import { telGoster, telHamYap } from '../lib/tel.js'
import { hesabaBaglanirMi, musterininMi, talepSahibiBulucu } from '../lib/musteriEslesmesi.js'
import { serviseBildirimYaz } from '../lib/serviseBildirim.js'
import { extractYear, formatSerial, normalizeSerial } from '../lib/serial.js'
import { makineKayitlari, makineKaydiGuncelle } from '../lib/makineKaydi.js'
import { kaydinServisi } from '../lib/servisAtama.js'
import {
  KALEMLER, ozelleriKaldir, tarifeCoz, tarifeFarki, tarifeleriDuzenle, ucretOku,
} from '../lib/servisTarifesi.js'
import {
  ONAY_TUTAR_SURESI, bakiyeIskontosu, bakiyeYetmiyor, gonderilenTutar, iskontoCoz, iskontolariDuzenle, onayTazeMi, oranOku,
  iptalEdilenSatirlar, siparisNetTutari, siparisToplami, yuzdeYap,
} from '../lib/servisFiyat.js'
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

/* YETKİ BÖLÜNÜNCE ESKİ ROLLER TAŞINIYOR.

   Yukarıdaki kural "yeni izin kimseye sessizce dağıtılmaz" diyor; bu
   onun tek istisnası ve bir izin YENİ DEĞİL, BÖLÜNDÜĞÜNDE geçerli.
   22 Eylül 2026'da Kayıtlı Makineler `musteriler` izninden ayrılıp
   `makineler` oldu. Depodaki rol o gün Müşteriler'i görüyorsa makineleri
   de görüyordu; taşınmasaydı ekranı bir sabah kendiliğinden kaybolurdu.

   25 Eylül 2026'da (kullanıcı sınaması) makineye servis atama
   `servisDuzenle`den ayrılıp `makineAtama` oldu: servis birimi atama
   yapar ama servis hesaplarını düzenlemez. Depoda `servisDuzenle`
   taşıyan rol dün makineye servis atayabiliyordu; taşınmasaydı bu gücü
   bir sabah sessizce kaybederdi. Yalnız o rol alıyor, izin kimseye
   yeni dağıtılmıyor.

   `izinSurumu` taşımanın bir kez yapıldığını söylüyor. Olmasaydı,
   personel satış rolünden `makineler` kutusunu kaldırdığında bir
   sonraki okumada izin geri eklenirdi. Taşınan rol bir sonraki
   kaydedişte bu alanla birlikte depoya yazılıyor. Adımlar sırayla ve
   tek sürüm sayacıyla: yeni bir bölünme bir sonraki sürüme adım ekler. */
const IZIN_SURUMU = 3

function rolIzinleriniTasi(r) {
  const surum = r.izinSurumu || 1
  if (surum >= IZIN_SURUMU) return r
  let izinler = r.izinler || []
  if (surum < 2 && izinler.includes('musteriler') && !izinler.includes('makineler')) {
    izinler = [...izinler, 'makineler']
  }
  if (surum < 3 && izinler.includes('servisDuzenle') && !izinler.includes('makineAtama')) {
    izinler = [...izinler, 'makineAtama']
  }
  return { ...r, izinSurumu: IZIN_SURUMU, izinler }
}

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
    r.id === 'admin' ? { ...r, izinler: TUM_IZINLER } : rolIzinleriniTasi(r),
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

/* Rolün gördüğü talep türleri — boşsa (null) bütün türler.

   BİRDEN ÇOK TÜR SEÇİLEBİLİYOR (21 Eylül 2026, kullanıcının isteği:
   "Gördüğü Talepler başlığı altındaki talepler birden fazla
   seçilebilmeli"). Önce rol tek bir tür taşıyordu (`talepTuru`);
   depoda o biçimde duran roller burada listeye çevriliyor, yeniden
   kaydedilince yeni biçime (`talepTurleri`) geçiyor. Ekranların hepsi
   bu işlevden okuyor, rolün alanına doğrudan bakmıyor. */
const TALEP_TURLERI = ['servis', 'parca', 'satinalma']

export function rolunTurleri(rol) {
  const r = typeof rol === 'string' ? rolBilgi(rol) : rol
  const ham = Array.isArray(r?.talepTurleri) ? r.talepTurleri : r?.talepTuru ? [r.talepTuru] : []
  const turler = TALEP_TURLERI.filter((t) => ham.includes(t))
  return turler.length && turler.length < TALEP_TURLERI.length ? turler : null
}

/* Formdan gelen tür listesini temizler: bilinmeyeni atar, sırayı sabitler,
   hepsi seçildiyse "hepsi" (null) yazar. */
function temizTurler(liste) {
  return rolunTurleri({ talepTurleri: Array.isArray(liste) ? liste : [] })
}

/* ==========================================================================
   Rolün göreceği talepler

   Üç kapı var ve üçü de gerekli:

     1. KENDİ TÜRÜ — servis rolü servis taleplerini, yedek parça rolü
        parça taleplerini görüyor. Talep türü seçilmemiş rol (admin,
        yönetici) hepsini görüyor.

     2. MASASINDA BEKLEYEN — türü başka olsa bile şu an o masanın
        önünde duran talep.

     3. GÖNDERDİĞİ PARÇA YOLDAYKEN (25 Eylül 2026, kullanıcı sınaması
        O2) — yedek parça rolü, servise gönderdiği garanti parçasının
        işini parça yolda kaldıkça (durum "parça bekleniyor" ve sevk
        yazılı) görüyor. Takip numarası girilince masa boşalıyor ve iş
        listeden düşüyordu: yanlış yazılmış numarayı düzeltmek isteyen
        kişi talebi bulamıyor, servis "parça gelmedi" diye aradığında
        paketi gönderen birim takip numarasına ulaşamıyordu. Masanın
        anlamı değişmedi, sıra serviste; iş tek, satır tek kalıyor.
        Servis parçayı takıp kaydı gönderince durum değişiyor ve iş
        listeden kendiliğinden düşüyor.

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

function parcasiYoldaMi(t) {
  return t.status === 'parcaBekliyor' && Boolean(t.parcaSevk)
}

/** Rolün göreceği talepler: kendi türleri + masasında bekleyenler + gönderdiği parçası yolda olanlar. */
export function rolunTalepleri(liste, rol) {
  const turler = rolunTurleri(rol)
  if (!turler) return liste
  return liste.filter(
    (t) =>
      turler.includes(t.tur) ||
      turler.includes(t.masa) ||
      (turler.includes('parca') && parcasiYoldaMi(t)),
  )
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
export function rolEkle({ ad, aciklama, talepTurleri, izinler }, personel) {
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
    talepTurleri: temizTurler(talepTurleri),
    izinler: temizIzinler(izinler),
    izinSurumu: IZIN_SURUMU,
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
  const yeni = liste.map((r) => {
    if (r.id !== id) return r
    /* Eski tek-tür alanı yazılmıyor; tür listesi tek alanda. */
    const { talepTuru: _eski, ...kalan } = r
    return {
      ...kalan,
      ad: temizAd,
      aciklama: String(degisiklik.aciklama ?? r.aciklama ?? '').trim(),
      talepTurleri:
        degisiklik.talepTurleri !== undefined ? temizTurler(degisiklik.talepTurleri) : rolunTurleri(r),
      izinler,
    }
  })
  if (!yonetimKaliyorMu(yeni)) {
    return { hata: 'Personel hesabı açma yetkisine sahip hiçbir rol kalmıyor. Bu değişiklik yapılamaz.' }
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
    return { hata: 'Personel hesabı açma yetkisine sahip hiçbir rol kalmıyor. Bu rol silinemez.' }
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
  return `${rol.ad} rolü silindi · Taşınan kişilerin yeni rolleri: ${parcalar.join(', ')}`
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

/* ------------------------------------------------------------------ Oturum

   OTURUM SEKMEYE AİT (25 Eylül 2026, kullanıcı sınaması O6).

   Oturum yalnız kalıcı depoda (localStorage) duruyordu ve kalıcı depo
   tarayıcının bütün sekmelerinde ortak. İkinci sekmede başka bir
   personel girince birinci sekme yenilendiğinde onun kimliğine
   geçiyordu; yenilenmeden de işlem kaydına öteki sekmenin rolü
   yazılıyordu. Kapatılan ya da silinen personelin açık oturumu da
   sürüyordu, çünkü oturum yalnız rolün varlığına bakıyordu.

   ŞİMDİ:
     - Her sekmenin oturumu kendi oturum deposunda (sessionStorage).
       Başka sekmenin girişi bu sekmenin kimliğini değiştirmiyor.
     - Son giriş kalıcı depoda da duruyor: yeni açılan sekme onu bir kez
       devralıyor, personel her sekmede yeniden giriş yapmıyor.
     - Oturum her okumada personel kaydına bağlanıyor. Kayıt yoksa ya da
       kapatıldıysa oturum düşüyor; rol ve ad kayıttan geliyor, oturumun
       kopyasından değil. Rolü değişen kişi yeni rolle çalışıyor.
     - Çıkış bu sekmenin oturumunu ve (çıkan kişininse) son girişi
       siliyor; son giriş başka birininse yerinde kalıyor. İşlem kaydı
       da rolü kayıttan okuyor (islemYaz). Aynı kişinin bu tarayıcıdaki öteki
       sekmelerini ekran kapatıyor (Backoffice.jsx, sekmeler arası
       kanal); başkasının oturumuna dokunulmuyor.

   Sunucuda da aynı kural: sunucu istemcinin taşıdığı role güvenmez,
   oturumun kullanıcısından okur (bkz. uygulama-eslesmesi.mjs →
   panelOturum.rol). */

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
  oturumKaydet(ANAHTAR.oturum, oturum) // bu sekme
  save(ANAHTAR.oturum, oturum) // son giriş: yeni açılan sekme devralır
  islemYaz({ tur: 'oturum', ozet: 'Backoffice girişi', personel: kayit.ad, rol: kayit.rol })
  return { oturum }
}

export function oturumGetir() {
  /* Önce bu sekmenin oturumu. Yoksa (yeni sekme) son giriş devralınıyor
     ve bu sekmeye yazılıyor; bundan sonra başka sekmenin girişi bu
     sekmeyi etkilemiyor. Oturum deposuna yazmak `storage` olayı
     doğurmuyor, öteki sekmeleri tetiklemez. */
  let o = oturumYukle(ANAHTAR.oturum, null)
  if (!o) {
    o = load(ANAHTAR.oturum, null)
    if (o?.personelId) oturumKaydet(ANAHTAR.oturum, o)
  }

  /* Eski biçimdeki oturum kayıtlarında rol yok; yetkisi
     belirsiz biriyle backoffice açılmasın, yeniden giriş istensin. */
  if (!o?.rol || !o?.personelId) return null

  /* KAPATILAN YA DA SİLİNEN PERSONELİN OTURUMU DÜŞÜYOR. Bu sekmenin
     oturumu siliniyor; kalıcı depodaki son giriş de AYNI kişininse
     siliniyor, yoksa yeni açılan sekme onu yeniden devralırdı.
     Başkasının son girişine dokunulmuyor. */
  const kisi = personelGetir().find((p) => p.id === o.personelId)
  if (!kisi || kisi.aktif === false) {
    oturumSil(ANAHTAR.oturum)
    if (load(ANAHTAR.oturum, null)?.personelId === o.personelId) remove(ANAHTAR.oturum)
    return null
  }

  /* ROLÜ SİLİNMİŞ KİŞİNİN OTURUMU KAPANIYOR.

     Roller silinebiliyor; açık bir sekmenin oturumu, artık var olmayan
     bir rolü taşıyor olabilir. Kişinin rolü silinirken başka bir role
     taşınıyor (bkz. rolSil); rol artık kayıttan okunduğu için kişi
     taşındığı rolle devam ediyor. Kayıtta da tanınmayan bir rol varsa
     yeniden giriş isteniyor. */
  const rol = kisi.rol || o.rol
  if (!rolleriGetir().some((r) => r.id === rol)) return null

  return { ...o, ad: kisi.ad || o.ad, kullanici: kisi.kullanici || o.kullanici, rol }
}

export function oturumKapat(o) {
  islemYaz({ tur: 'oturum', ozet: 'Backoffice çıkışı', personel: o?.ad, rol: o?.rol })
  /* Kalıcı depodaki son giriş yalnız çıkan kişininse siliniyor. Başka
     sekmede başka bir personel girmişse son giriş onundur; silinseydi o
     kişinin yeni açacağı sekme giriş ekranına düşerdi (oturumGetir'deki
     kapatılan personel dalıyla aynı kural). */
  const kim = o?.personelId || oturumYukle(ANAHTAR.oturum, null)?.personelId
  oturumSil(ANAHTAR.oturum)
  if (load(ANAHTAR.oturum, null)?.personelId === kim) remove(ANAHTAR.oturum)
}

/* Başka sekmede AYNI kişi çıkış yaptı: yalnız bu sekmenin oturumu
   siliniyor. İşlem kaydı yazılmıyor, çıkışı o sekme zaten yazdı. */
export function oturumuBuSekmedeBirak() {
  oturumSil(ANAHTAR.oturum)
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
  islemYaz({ tur: 'sifre', ozet: 'Şifre değiştirme bağlantısı istendi', personel: kisi.ad, rol: kisi.rol })

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
  /* "BAYİYE İLETİLDİ" — FİYAT TEKLİFİNİN KENDİ KAPANIŞI (21 Eylül 2026,
     kullanıcının kararı).

     Bir dönem "Bayide" diye bir durum vardı ve kaldırılmıştı: bayiye
     atanan talep "Kapandı" oluyordu, çünkü iki ayrı "bitti" hâli
     personelin kafasını karıştırıyordu. Kullanıcı bunu geri istedi ve
     bu sefer iki hâl gerçekten iki ayrı SONUÇ anlatıyor:

       Bayiye İletildi   PAKSAN talebi bir bayiye verdi; satışı bayi
                         yapacak. PAKSAN'ın işi burada biter.
       Kapandı           PAKSAN talebi kendisi sonuçlandırdı (bayisiz,
                         doğrudan satış).

     Karışıklık bu sefer kuralla önleniyor: "Bayiye İletildi" yalnız
     "Yeni" talepten, bayi seçilerek girilir ve o durumdan hiçbir
     duruma geçilmez; teklif verilmiş talep de bayiye iletilemez
     (bkz. durumGecisiEngeli). Kapalı durumdur (KAPALI_DURUMLAR).
     Müşteriye bildirim gitmez: PAKSAN o müşteriyle ilgilenmeyecek. */
  { id: 'bayiyeIletildi', ad: 'Bayiye İletildi', ton: 'mavi' },
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
  /* Ekranda iki hâli var: gönderilmemişken "Parça Hazırlanıyor",
     gönderildikten sonra "Parça Yolda" (bkz. gorunenDurum). Kodu tek:
     iş, servis parçayı takana kadar aynı durumda. */
  { id: 'parcaBekliyor', ad: 'Parça Hazırlanıyor', ton: 'turuncu' },
  { id: 'kapandi', ad: 'Kapandı', ton: 'yesil' },
  { id: 'iptal', ad: 'İptal', ton: 'gri' },
]

/* ==========================================================================
   EKRANDA GÖRÜNEN DURUM (24 Eylül 2026, kullanıcının isteği: "Talepler
   ekranındaki etiket ve filtre sistemini bir elden geçir")

   Kullanıcının gördüğü karışıklık: "Parça hazırlığı bekleyenler"
   süzgeci "Parça Bekleniyor" rozetli talepleri, "Parça Bekleniyor"
   süzgeci ise hem "Parça Bekleniyor" hem "Parça Yolda" rozetlilerini
   listeliyordu. Sebep: "Parça Yolda" bir durum değil, `parcaBekliyor`
   durumunun gönderim kaydı (`parcaSevk`) olan hâli; rozet onu
   ayırıyordu, süzgeç ayırmıyordu. Üç ad (hazırlık, bekleniyor, yolda)
   iki şeyi anlatıyordu.

   Artık ekranda İKİ ad var ve rozet, süzgeç, sıralama, Excel ve geçmiş
   aynı işlevden okuyor:

     Parça Hazırlanıyor   parcaBekliyor, gönderim yok    (turuncu: iş PAKSAN'da)
     Parça Yolda          parcaBekliyor, gönderim var    (turkuaz: iş serviste)

   Veritabanındaki kod değişmedi (`parcaBekliyor`); bu ayrım yalnız
   gösterim. `id`ler süzgeç anahtarı: 'parcaHazirlik' Dashboard'un
   kutusunun eski anahtarı, aynen kaldı.
   ========================================================================== */
export const PARCA_YOLDA = { id: 'parcaYolda', ad: 'Parça Yolda', ton: 'turkuaz' }
const PARCA_HAZIRLIK = { ...DURUMLAR.find((d) => d.id === 'parcaBekliyor'), id: 'parcaHazirlik' }

/** Talebin ekranda görünen durumu: {id, ad, ton}. */
export function gorunenDurum(talep) {
  const s = talep?.status || 'yeni'
  if (s === 'parcaBekliyor') return talep?.parcaSevk ? PARCA_YOLDA : PARCA_HAZIRLIK
  return durumBilgi(s)
}

/* Geçmiş satırının adı. Gönderim kaydı geçmişe `parcaBekliyor` diye
   ikinci bir satır yazıyor (servisParcasiGonderildi) ve bu satır ekranda
   ikinci kez aynı ad olarak görünüyordu. Gönderimin anına denk gelen
   satır "Parça Yolda". Kural Connect'le ortak, arşivdeki ziyaretlerin
   sevki de sayılıyor (lib/talep.js → sevkSatiriMi; 26 Eylül 2026). */
export function gecmisDurumu(talep, satir) {
  if (sevkSatiriMi(talep, satir)) return PARCA_YOLDA
  return durumBilgi(satir?.durum)
}

/* Süzgecin durum seçenekleri ve sıralamanın sırası: `parcaBekliyor`un
   yerinde iki görünen hâli. */
export const GORUNEN_DURUMLAR = DURUMLAR.flatMap((d) =>
  d.id === 'parcaBekliyor' ? [PARCA_HAZIRLIK, PARCA_YOLDA] : [d],
)

/* Kapalı = PAKSAN'ın üzerinde iş kalmamış. Not eklemek kapalı talepte
   de serbest. */
export const KAPALI_DURUMLAR = ['kapandi', 'iptal', 'bayiyeIletildi']

export function durumBilgi(id) {
  return DURUMLAR.find((d) => d.id === id) || DURUMLAR[0]
}

/* Her türün kendi aşamaları var; hepsini her türe göstermek karışıklık
   yaratıyordu.

   servis      → yeni · incelemede · planlandı · kapandı · iptal
   parça       → yeni · incelemede · planlandı · kapandı · iptal
   fiyat teklifi → yeni · bayiye iletildi · teklif verildi · kapandı · iptal

   Fiyat teklifinde planlanacak bir iş yok. Buna karşılık teklifin
   verilip müşterinin cevabının beklendiği uzun bir aşama var; o aşama
   "Teklif Verildi". Yedek parçada kargoya verme ayrı bir aşama değil,
   kapanışın kendisi.

   FİYAT TEKLİFİNDE "İNCELEMEDE" YOK (21 Eylül 2026, kullanıcının
   kararı). Satış personelinin bu talepte vereceği tek karar var:
   bayiye mi iletilecek, PAKSAN mı teklif verecek. Arada beklenen bir
   inceleme aşaması yok. */
/* ONAY BEKLİYOR ve PARÇA BEKLENİYOR bu listede yok — bilerek.

   İkisini de servisin gönderdiği kayıt doğuruyor, personel elle
   seçmiyor (bkz. servisKaydiGonder, hakkedisOnayla). Açılır listede
   dursalardı personel "onay bekliyor" seçip kaydı hiç görmeden talebi
   bekletebilirdi; durum ile arkasındaki kayıt birbirinden kopardı.
   Rozette ve süzgeçte görünüyorlar, elle seçilemiyorlar. */
const ELLE_SECILMEZ = ['onayBekliyor', 'parcaBekliyor']

/* Sıra kullanıcının verdiği sıra; süzgeç listesi de bu sırayla çıkıyor.
   DURUMLAR'ın genel sırası değişmedi: veritabanındaki kod listesi ve
   raporların sütunları ona bakıyor. */
const TEKLIF_DURUMLARI = ['yeni', 'bayiyeIletildi', 'teklif', 'kapandi', 'iptal']

export function talepDurumlari(tur) {
  const liste = DURUMLAR.filter((d) => !ELLE_SECILMEZ.includes(d.id))
  if (tur === 'satinalma') {
    return TEKLIF_DURUMLARI.map((id) => liste.find((d) => d.id === id)).filter(Boolean)
  }
  return liste.filter((d) => d.id !== 'teklif' && d.id !== 'bayiyeIletildi')
}

/* ==========================================================================
   FİYAT TEKLİFİNDE DURUM KAPILARI (21 Eylül 2026, kullanıcının kararı)

   İki kural:
     1. "Bayiye İletildi" durumundaki talep hiçbir duruma geçmez. Talep
        bayiye verildi; PAKSAN'ın sonradan teklif vermesi ya da
        kapatması, müşterinin iki ayrı yerden fiyat alması demek.
     2. "Bayiye İletildi" durumuna yalnız "Yeni" talepten, bayi seçilerek
        girilir (talebiBayiyeAta). Teklif verilmiş talep sonradan bayiye
        iletilmez; PAKSAN müşteriye fiyat vermiş.

   Tek istisna: yanlış tıklamanın düzeltilmesi. "Bayiye İletildi"den
   "Yeni"ye dönüş ayrı bir işlev (bayiAtamasiniKaldir) ve talep geri
   açma yetkisi ister; ileri bir durum değil, geri alma.

   Kural ekranda da uygulanıyor (Talepler.jsx) ama asıl yeri burası:
   sunucu yazıldığında da aynı kapıdan geçilecek.
   ========================================================================== */
export function durumGecisiEngeli(talep, yeniDurum) {
  if (talep?.tur !== 'satinalma') return null
  const suanki = talep.status || 'yeni'
  if (suanki === 'bayiyeIletildi') {
    return 'Bayiye iletilen talebin durumu değiştirilemez.'
  }
  if (yeniDurum === 'bayiyeIletildi') {
    return 'Talebi bayiye iletmek için "Bayiye ilet" bölümünden bayi seçin.'
  }
  return null
}

/* ==========================================================================
   DURUM KİLİDİ VE NEDENİ (25 Eylül 2026, kullanıcı sınaması O8)

   Talebin durum çipleri kimde kilitli ve NEDEN. Kural yalnız ekrandaydı
   (Talepler.jsx): kilitli çip tıklanınca hiçbir şey olmuyor, altındaki
   soluk gerekçe de genel kalıyordu ("Bu talep kapandı…"). Yedek parça
   personeli gönderilmiş servis siparişini iptal etmek istiyor, "yeniden
   açma" yazısını kendi işiyle eşleştiremiyordu.

   KİLİT KALIYOR. Gönderilmiş siparişin iptali servisin bakiyesine para
   geri yazıyor (siparisIadesiniYaz); kapanmış işi geri çevirmekle aynı
   yetkiyi (`talepGeriAc`) istiyor. Varsayılan rollere izin eklenmedi:
   yeni izin kimseye sessizce dağıtılmaz. Değişen, kilidin ve nedeninin
   tek yerden gelmesi; ekran nedeni söylüyor.

   Dönen değer nedenin kodu, metni ekranda:
     'bayide'            bayiye iletilmiş teklif (herkese kilitli,
                         bkz. durumGecisiEngeli)
     'siparisGonderildi' gönderilmiş servis siparişi, izin yok
     'kapandi'           kapanmış talep, izin yok
     null                kilit yok

   Sunucu talepGeriAc iznini aynı kapıda denetlemeli.
   ========================================================================== */
export function durumKilidi(talep, rol) {
  const s = talep?.status || 'yeni'
  if (s === 'bayiyeIletildi') return 'bayide'
  if (!KAPALI_DURUMLAR.includes(s) || izinli(rol, 'talepGeriAc')) return null
  if (talep.servisSiparisi && s === 'kapandi') return 'siparisGonderildi'
  /* İptal ayrı neden (26 Eylül 2026, ikinci kullanıcı sınaması): durum
     rozeti "İptal" derken kilit "Bu talep kapandı" diyordu. */
  return s === 'iptal' ? 'iptal' : 'kapandi'
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
  /* "Bayiye İletildi" çipte yok: bayi seçmeden girilemez, Bayi
     bölümündeki düğmeyle giriliyor (bkz. durumGecisiEngeli). */
  const liste = talepDurumlari(tur).filter((d) => d.id !== 'bayiyeIletildi')
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
  /* Fiyat teklifinde makine yok (Y1, 25.09.2026): o tarihten önce
     Connect'in teklif kaydına hatayla yazılmış makine okurken ayıklanıyor
     (lib/talep.js → makinesizTeklif). Connect listesi aynı işlevden geçiyor. */
  return [...load(ANAHTAR.talepler, []), ...load(ANAHTAR.demoTalepler, [])]
    .filter((t) => !t.ihracat)
    .map(makinesizTeklif)
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

/* EKRANDAKİ KOPYA DEĞİL, DEPODAKİ KAYIT (24 Eylül 2026).

   İşlevler talebi ekranın elindeki nesneden alıyor ve kararı ona göre
   veriyordu. Ekran açıkken başka bir sekme, başka bir personel ya da
   Servisim aynı talebe dokunduysa karar ESKİ duruma göre çıkıyordu:
   aynı hak ediş iki kez onaylanıp servisin cari hesabına iki kez alacak
   yazılabiliyor, onaylanmış hak ediş sonradan "reddedildi" yapılıp
   alacak yerinde kalabiliyordu. Parayı ya da durumu değiştiren işlevler
   kararı artık buradan, depodaki güncel kayıttan veriyor. */
function guncelTalep(talep) {
  return (talep?.id && talepleriGetir().find((t) => t.id === talep.id)) || talep
}

/* SERVİS KAPANMIŞ İŞE YAZAMIYOR (25 Eylül 2026, inceleme).

   Servisim'de detay artık depodan okunuyor (ServisPanel.jsx → acikId)
   ama açık duran pencere ekranda kalıyordu; veri katmanı da servisin
   yazımını talebin durumuna bakmadan kabul ediyordu. PAKSAN talebi
   başka sekmede iptal ettiğinde servis açık Randevu penceresinde
   Kaydet'e basınca iptal edilmiş talep "planlandı"ya dönüyor, müşteriye
   randevu bildirimi gidiyordu; açık "Talebi Kapat" onayı iptal edilmiş
   talebi "kapandı" yapıp müşteriye "tamamlandı" diyordu. Servisin
   kapanmış işi yeniden açma yetkisi yok; karar depodaki güncel kayıttan.
   servisKaydiGonder'deki kapının aynısı. Backoffice'in çağrısı
   (`servisten` yok) bu kapıdan geçmiyor: kapanmış talebi yeniden açmak
   yetkili personelin işi (bkz. durumKilidi). */
const SERVIS_KAPALI_IS_HATASI = 'Siz işlem yaparken bu iş kapandı ya da iptal edildi. İşleminiz kaydedilmedi.'
function servisinKapaliIsEngeli(talep) {
  return KAPALI_DURUMLAR.includes(talep?.status || 'yeni') ? SERVIS_KAPALI_IS_HATASI : null
}

/** Durumu değiştirir, geçmişe yazar ve müşteriye bildirim düşürür. */
/**
 * Durumu değiştirir, geçmişe yazar ve müşteriye bildirim düşürür.
 *
 * @param {boolean} bildirme true ise müşteriye haber gitmez. Kapanmış
 *   bir talebi admin düzeltme amacıyla geri açtığında kullanılıyor:
 *   müşteri kapandı bildirimini almışken "yeniden açıldı" mesajı
 *   kafa karıştırır, işi PAKSAN kendi içinde toparlıyor.
 * @param {boolean} servisten true ise değişikliği servis kendisi yaptı;
 *   servise bildirim gitmez.
 */
export function talepDurumDegistir(talep, yeniDurum, personel, { bildirme, servisten } = {}) {
  if (servisten) {
    talep = guncelTalep(talep)
    const kapali = servisinKapaliIsEngeli(talep)
    if (kapali) return { hata: kapali }
  }
  const engel = durumGecisiEngeli(talep, yeniDurum)
  if (engel) return { hata: engel }

  const gecmis = [...(talep.gecmis || []), { durum: yeniDurum, tarih: Date.now(), personel }]

  talepYaz(talep.id, { status: yeniDurum, gecmis })

  islemYaz({
    tur: 'durum',
    ozet: `${talep.no} → ${durumBilgi(yeniDurum).ad}${bildirme ? ' (kapalı talep açıldı, bildirim gitmedi)' : ''}`,
    personel,
  })

  /* Kapanmış siparişi durum düğmesiyle "İptal"e almak da iptal: düşülen
     tutar bakiyeye dönüyor (bkz. siparisIadesiniYaz). Backoffice servis
     siparişinde iptali formdan geçiriyor; bu, formu atlayan çağrı için. */
  if (yeniDurum === 'iptal') siparisIadesiniYaz(talep, personel)

  /* "Yeni"ye dönüş yanlış tıklamanın düzeltilmesi; servis açısından da
     olmuş bir şey yok (müşteriye de gitmiyor, bkz. bildirimsizMi). */
  if (!servisten && yeniDurum !== 'yeni') {
    serviseBildir(talep, 'durum', { durum: yeniDurum })
  }

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

   BAYİYE İLETME BİR ATAMA DEĞİL, BİR KAYIT (21 Eylül 2026,
   kullanıcının kararı). Bayinin paneli yok; satış personeli bayiye
   telefonla, mesajla kendisi haber veriyor. Sistemin işi yalnız
   HANGİ BAYİNİN YETKİLENDİRİLDİĞİNİ yazmak. Talep "Bayiye İletildi"
   durumuna geçiyor ve orada kalıyor: PAKSAN'ın işi bitti, sonraki bir
   duruma geçilmiyor (bkz. durumGecisiEngeli).

   YALNIZ YENİ TALEP İLETİLİR. PAKSAN teklif verdiyse müşteri fiyatı
   PAKSAN'dan almış; aynı talebi sonradan bayiye vermek müşteriye iki
   ayrı fiyat demek.

   MÜŞTERİYE BİLDİRİM GİTMİYOR. PAKSAN bu müşteriyle ilgilenmeyecek;
   müşteriyi bayi arayacak. Bayinin adı ve telefonu müşterinin talep
   detayında yine duruyor: tanımadığı bir numaradan arandığında
   kimin aradığını oradan görebilir.

   PAKSAN kendisi ilgilenecekse iletme yapılmıyor: talep her zamanki
   akışta kalıyor, teklif verilip kapanıyor.
   ========================================================================== */
export function talebiBayiyeAta(talep, bayi, personel) {
  if (!bayi?.id) return { hata: 'Bayi seçin.' }
  if ((talep.status || 'yeni') !== 'yeni') {
    return { hata: 'Yalnızca "Yeni" durumundaki talepler bayiye iletilebilir.' }
  }
  /* Durumu "Yeni"ye geri alınmış olsa da bir kez teklif verilmişse
     müşteri fiyatı PAKSAN'dan almıştır; kapı geçmişe bakıyor. */
  if (talep.teklif) return { hata: 'Daha önce teklif verilmiş bir talep bayiye iletilemez.' }

  const kayit = { id: bayi.id, ad: bayi.ad, tel: bayi.tel || '', tarih: Date.now() }
  const gecmis = [
    ...(talep.gecmis || []),
    { durum: 'bayiyeIletildi', tarih: Date.now(), personel },
  ]
  talepYaz(talep.id, { bayi: kayit, sahip: 'bayi', status: 'bayiyeIletildi', gecmis })

  islemYaz({
    tur: 'durum',
    ozet: `${talep.no} → ${durumBilgi('bayiyeIletildi').ad} · ${bayi.ad}`,
    personel,
  })

  return { bayi: kayit }
}

/* Yanlış tıklamanın düzeltilmesi: talep "Yeni"ye döner. İleri bir
   durum değil, geri alma; ekranda talep geri açma yetkisi istiyor.
   Müşteriye iletme sırasında bildirim gitmediği için geri alırken de
   gitmiyor. */
export function bayiAtamasiniKaldir(talep, personel) {
  if (talep.status !== 'bayiyeIletildi') return { hata: 'Bu talep bayiye iletilmemiş.' }
  const gecmis = [...(talep.gecmis || []), { durum: 'yeni', tarih: Date.now(), personel }]
  talepYaz(talep.id, { bayi: null, sahip: 'paksan', status: 'yeni', gecmis })
  islemYaz({ tur: 'durum', ozet: `${talep.no} · bayiye iletme işlemi geri alındı`, personel })
  return { tamam: true }
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
     (bkz. servis/ekranlar/TalepDetay.jsx) ve servise talep bildirimi
     gidiyor (bkz. serviseBildir). Müşteriyi ilgilendiren bir şey
     değil: PAKSAN ile servis arasında konuşuluyor. */
  if (servise && !servisten) serviseBildir(talep, 'not', { metin })
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
   (Connect talebi, numara talebi ve servisin kayıtlı müşteriyle
   eşleştirip açtığı kayıt taşıyor). Yoksa telefondan eşleştiriliyor:
   lib/musteriEslesmesi.js → musterininMi, ülke koduyla ve yazılıştan
   bağımsız (25 Eylül 2026, kullanıcı sınaması Y3). Önce hesabın `tel`
   alanıyla harfi harfine karşılaştırılıyordu; hesap numarayı boşluklu,
   servis "0532…" diye yazdığı için aynı kişi bulunamıyordu.

   İKİ BİLİNÇLİ İSTİSNA (25 Eylül 2026, kullanıcı sınaması Y4):
     - Servis siparişinin müşterisi yok. Siparişi servis kendisi
       veriyor; talebin ad/tel alanlarında servisin adı ve telefonu
       duruyor (bkz. servisParcaSiparisi). Telefonla eşleşme ya kimseyi
       bulmuyordu, ya da servisin sahibi aynı numarayla Connect
       kullanıyorsa siparişi o kişinin bildirimlerine düşürüyordu.
       Siparişle ilgili her haber serviseBildir'den gidiyor. Kapı burada
       olduğu için durum, plan, kapanış, iptal, ödeme ve not yollarının
       hepsi birden kapanıyor.
     - Servisin elle açtığı KİMLİKSİZ kayıt telefonla eşleştirilmiyor.
       Connect bu talebi yalnız hesap kimliğiyle gösteriyor
       (lib/musterininTalepleri.js → talepHesabinMi; ikisi de
       lib/musteriEslesmesi.js → hesabaBaglanirMi'ye bakıyor); telefonu
       servis yazdı. Eşleşseydi müşteri açamadığı bir talebin
       bildirimini alırdı. Müşteri kartı ve rapor o talebi numarayla
       müşteriye bağlamaya devam ediyor (gerekçe musteriEslesmesi.js
       başında).

   EŞLEŞME YOKSA null ve kayıt YAZILMIYOR (bkz. musteriyeBildir).
   Yanlış hesaba damga vurmak bildirimi sahibinden saklamak demek; o
   yüzden kimlik uydurulmuyor. */
function bildirimAlicisi(kayit) {
  if (!kayit || kayit.servisSiparisi) return null
  if (kayit.musteriId) return kayit.musteriId
  return musterileriGetir().find((m) => hesabaBaglanirMi(kayit, m))?.id || null
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
   ekranında iki ayrı liste demekti.

   Yazıldıysa true döner; alıcı yoksa false. */
export function musteriyeBildir(bildirim) {
  /* ALICISI ÇÖZÜLMEYEN BİLDİRİM YAZILMIYOR (25 Eylül 2026, kullanıcı
     sınaması Y4). Önce `musteriId`siz de yazılıyordu, `kisisel`
     damgasıyla kimseye gösterilmeden: "depoda durması onu sonradan
     doğru hesaba bağlamanın tek yolu" diye. Bağlayan kod hiç
     yazılmadı; veritabanı da böyle satırı kabul etmiyor
     (V0013 → CK_bildirim_Bildirim_Alici: müşteri bildiriminde
     HesapKimlik zorunlu). Kayıt yalnız ölçümde "sahipsiz" diye
     görünüyordu. İşlemin izi işlem kaydında ve talebin geçmişinde
     duruyor; müşteri uygulamaya sonradan gelirse talebin güncel
     durumunu talebin kendisinde görür. Ekran "bildirim gitti" demeden
     önce aynı kuralı soruyor (bildirimAlicilari).

     Hesapsız müşteri olağan bir hâl (Servisim'in elle kaydı); konsola
     uyarı yazılmıyor.

     `kisisel` DAMGASI yazılan her kayıtta. Süzgece "bu kayıt bir
     kişinin" diyor; yayılımdan SONRA konuyor ki çağıran yanlışlıkla da
     olsa `kisisel: false` geçirip süzgeci kapatamasın. 25 Eylül 2026'dan
     önce yazılmış alıcısız kayıtları süzgeç kimseye göstermemeye devam
     ediyor (lib/duyuruHedef.js). Damgasız çok eski kayıtlar tek hesaplı
     cihazda üretildi; süzgeç onları eskisi gibi geçiriyor. */
  if (!bildirim?.musteriId) return false
  save(ANAHTAR.duyurular, [
    { id: uid(), tarih: Date.now(), ...bildirim, kisisel: true },
    ...load(ANAHTAR.duyurular, []),
  ])
  return true
}

/**
 * PAKSAN'ın bu talepteki işleminden kim haberdar oluyor (25 Eylül 2026,
 * kullanıcı sınaması Y4). Backoffice ve Servisim'in onay pencereleri ve
 * "bildirim gitti" yazıları buradan okuyor; kural yazan işlevlerle aynı
 * (bildirimAlicisi, serviseBildir). Ekran kendi tahminini yürütünce
 * servis siparişinde "müşteriye bildirim gitti" diyordu.
 *
 * @returns {{ musteri: boolean, servis: boolean }}
 */
export function bildirimAlicilari(talep) {
  return { musteri: Boolean(bildirimAlicisi(talep)), servis: Boolean(talep?.servis?.id) }
}

/* ==========================================================================
   Servise talep bildirimi (21 Eylül 2026, kullanıcının isteği)

   "PAKSAN'ın ilgili talep ile yaptığı işlemlerde servise bildirim
   gitmeli."

   ÖNCE NE VARDI. Servisim uygulama açıkken 15 saniyede bir depoya bakıp
   beş şeyi fark ediyordu (yeni iş, parça yolda, kayıt onaylandı, kabul
   edilmedi, PAKSAN'dan not) ve telefona bildirim düşürüyordu. PAKSAN
   talebi iptal ettiğinde, kapattığında, durumunu değiştirdiğinde ya da
   hak edişi düzelttiğinde servisin hiçbir haberi olmuyordu. Olanlar da
   talebe bağlı değildi ("2 kayıt onaylandı") ve kalıcı değildi:
   telefondaki bildirim kapatılınca uygulamada izi kalmıyordu.

   ŞİMDİ. PAKSAN'ın servise dokunan her işlemi burada bir kayıt yazıyor.
   Kayıt talebe bağlı (talep numarası), kalıcı ve Servisim'de iki yerde
   görünüyor: İşlerim'in üstünde okunmamışlar, talebin içinde o talebin
   bütün geçmişi (bkz. servis/talepBildirimleri.js). Telefon bildirimi
   de bu kayıttan çıkıyor (bkz. servis/haber.js).

   AYRI DEPO YOK. Müşteri bildirimleriyle aynı `duyurular` deposu;
   `alici: 'servis'` ve `servisId` taşıyor, `musteriId` taşımıyor. Süzgeç
   müşteri kimliği olmayan kişisel kaydı hiçbir müşteriye göstermiyor
   (lib/duyuruHedef.js), yani bu kayıt müşterinin ekranına sızmaz.
   Veritabanındaki karşılığı aynı tablo: bildirim.Bildirim.ServisKimlik.

   METİN DEĞİL OLAY SAKLANIYOR (`olay`): yazının kendisi Servisim'in
   sözlüğünde. Müşteri bildiriminde anahtar saklanmasıyla aynı gerekçe;
   ayrıca yazı değiştiğinde eski kayıtlar da yeni yazıyla görünür.

   BU KAPI PAKSAN'IN İŞLEMİ İÇİN. Servisin kendi yaptığı iş kendisine
   bildirilmez; paylaşılan işlevler servisten çağrıldığında
   `servisten: true` alıyor ve bu kapı çağrılmıyor.

   MÜŞTERİNİN İŞLEMİ DE SERVİSE GİDİYOR, AYNI KAYITLA (25 Eylül 2026,
   kullanıcı sınaması O5 ve "Sorun Devam Ediyor"). Müşteri Connect'ten
   talebe ekleme yaptığında (`musteriEkledi`) ya da kapanmış işte "Sorun
   Devam Ediyor" dediğinde (`musteriSorunDevam`) işi yürüten servis haber
   alıyor. Bu iki olay buradan değil lib/talepEkleme.js'ten yazılıyor:
   Connect bu dosyayı içe aktaramıyor. Olay adı işlemin müşterinin
   olduğunu söylüyor; Servisim onları "Müşteriden" diye ayırıyor,
   PAKSAN'ın işlemi gibi görünmüyor.

   KAYDI YAZAN GÖVDE lib/serviseBildirim.js'te (25 Eylül 2026). Aynı
   kaydın iki kopyası yazılmasın diye gövde oraya taşındı; bu işlevin
   adı ve imzası değişmedi.
   ========================================================================== */
export function serviseBildir(talep, olay, degerler = {}) {
  serviseBildirimYaz(talep, olay, degerler)
}

/** Bir servisin talep bildirimleri, yeniden eskiye. */
export function servisBildirimleri(servisId) {
  if (!servisId) return []
  return load(ANAHTAR.duyurular, []).filter(
    (d) => d.alici === 'servis' && d.servisId === servisId,
  )
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


/* ---------------------------------------------- Servis siparişinin gönderimi

   EKSİK GÖNDERİLEN SİPARİŞ (24 Eylül 2026, kullanıcının kararı:
   "kapanışta gönderilen parçalar işaretlensin"). Siparişteki bir parça
   stokta yoksa personel talebi kapatırken onun işaretini kaldırıyor.
   Bakiyeden ödenen siparişte servisin bakiyesinden yalnız GÖNDERİLEN
   parçaların tutarı düşülüyor, sipariş anındaki fiyatla; kalan parça
   stok gelince kalanParcalariGonder ile gidiyor ve tutarı o gün
   düşülüyor. Önce kapanışta siparişin tamamı düşülüyordu: zincir
   gönderilemese de servisin bakiyesinden onun parası da kesiliyordu.

   Satırlar siparişin fiyat görüntüsündeki sırayla anılıyor (0'dan);
   gönderimler talepte `gonderimler: [{no, tarih, personel, satirlar}]`. */

/* Kapanıştaki seçimden yeni gönderimi kurar. Servis siparişi değilse
   ya da görüntüsü yoksa hiçbir şey yapmaz. */
function servisSiparisiGonderimi(talep, secim, personel) {
  const satirlar = talep?.parcaFiyat?.satirlar
  if (!talep?.servisSiparisi || !Array.isArray(satirlar) || !satirlar.length) return {}
  const tum = satirlar.map((_, i) => i)
  const secilen = Array.isArray(secim)
    ? [...new Set(secim.map(Number))].filter((i) => Number.isInteger(i) && i >= 0 && i < satirlar.length)
    : tum
  if (!secilen.length) return { hata: 'En az bir parçayı işaretleyin.' }
  const once = Array.isArray(talep.gonderimler) ? talep.gonderimler : []
  const gitmis = new Set(once.flatMap((g) => g?.satirlar || []))
  /* İptal edilmiş kalem (kalanParcalariIptalEt) yeniden kapanışta
     gönderilemiyor: siparişte artık yok. */
  const iptal = new Set(iptalEdilenSatirlar(talep))
  const yeni = secilen.filter((i) => !gitmis.has(i) && !iptal.has(i)).sort((a, b) => a - b)
  const gonderimler = yeni.length
    ? [...once, { no: once.length + 1, tarih: Date.now(), personel, satirlar: yeni }]
    : once
  const giden = new Set([...gitmis, ...yeni])
  return { gonderimler, kismi: tum.some((i) => !giden.has(i) && !iptal.has(i)) }
}

/* SİPARİŞİN BORCU: gönderilenlerin tutarı eksi önce yazılan borç.

   Tek yer: kapanış da kalan parçaların gönderimi de buradan yazıyor.
   Deftere yazılan her zaman FARK: gönderilenlerin KDV dâhil tutarı
   (lib/servisFiyat.js → gonderilenTutar) eksi bu talebe daha önce
   yazılmış borç. Böylece
     · iki gönderime bölünen siparişte düşülenlerin toplamı siparişin
       toplamına eşit kalıyor;
     · "Geri Aç" ile açılıp yeniden kapanan sipariş ikinci kez
       düşülmüyor (fark sıfır).
   Borç talep KİMLİĞİYLE aranıyor: talep numarası tekil değil (gün +
   dört rastgele hane). Kimliği olmayan eski borçta numaraya bakılıyor.
   Veritabanında talep başına tek etkin borç var (V0012,
   ParcaTalepKimlik); ikinci gönderimin nasıl yazılacağı
   VT-TASARIM-EKLERI §9'da. */
function siparisBorcunuYaz(talep, personel) {
  if (!talep?.servisSiparisi || talep.odeme !== 'bakiye') return
  const g = siparisGonderimi(talep)
  const hedef = g ? gonderilenTutar(talep.parcaFiyat, g.gonderilen, 'bakiye') : siparisToplami(talep)
  const fark = hedef - siparisHesabi(talep).dusulen
  if (fark <= 0) return
  /* Hareket hangi gönderimin karşılığı olduğunu taşıyor: iki gönderime
     bölünen siparişte Servisim'in Hak Ediş ekranı o hareketin
     parçalarını ve siparişin kalanını gösterebilsin. */
  const son = Array.isArray(talep.gonderimler) ? talep.gonderimler[talep.gonderimler.length - 1] : null
  cariHareketEkle({
    servisId: talep.servis?.id,
    servisAd: talep.servis?.ad,
    tur: 'borc',
    tutar: fark,
    aciklama: `${talep.no} · parça siparişi`,
    talepNo: talep.no,
    talepId: talep.id,
    ...(son?.no ? { gonderimNo: son.no } : {}),
    personel,
  })
}

/* Cari hareket bu siparişin mi: talep kimliğiyle; kimliği olmayan eski
   harekette numarayla (numara tekil değil, bkz. siparisBorcunuYaz). */
function siparisinHareketi(h, talep) {
  return h.talepId ? h.talepId === talep.id : Boolean(talep.no) && h.talepNo === talep.no
}

/**
 * Servis siparişinin para durumu — ekranların "ne kadar düşüldü, ne
 * kadar kaldı" sorusunun tek cevabı (24 Eylül 2026).
 *
 * Kullanıcı siparişin tutarı ile hak edişten düşen rakamı
 * karşılaştırıp tutmadığını gördü: liste KDV hariç tutarı, hak ediş KDV
 * dâhil ve kısmen gönderilmiş siparişte yalnız gönderilen parçaların
 * tutarını gösteriyordu, hiçbir ekran aradaki farkı söylemiyordu.
 * Artık üç ekran da bu işlevden okuyor.
 *
 *   toplam       siparişin tutarı, KDV dâhil (lib/servisFiyat.js → siparisToplami)
 *   iptalEdilen  PAKSAN'ın iptal ettiği kalemlerin payı (kalanParcalariIptalEt)
 *   net          iptal edilenler çıktıktan sonra servisin ödeyeceği
 *                (lib/servisFiyat.js → siparisNetTutari); iptal yoksa toplam
 *   dusulen      bu sipariş için bakiyeden düşülen, iadeler çıkarılmış
 *   bekleyen     parçalar gönderildikçe düşülecek kalan (iptal edilen
 *                siparişte sıfır)
 *   iade         iptalde bakiyeye geri eklenen
 *
 * Her zaman  toplam = iptalEdilen + net  ve bakiye siparişinde, bütün
 * kalan gönderildiğinde  net = dusulen.
 *
 * Faturayla ödenen siparişte bakiyeye hiçbir şey yazılmıyor; yalnız
 * `toplam`, `iptalEdilen` ve `net` anlamlı.
 */
export function siparisHesabi(talep) {
  const toplam = siparisToplami(talep)
  const net = talep?.servisSiparisi ? siparisNetTutari(talep) : toplam
  const iptalEdilen = toplam - net
  if (!talep?.servisSiparisi || talep.odeme !== 'bakiye') {
    return { toplam, iptalEdilen, net, dusulen: 0, bekleyen: 0, iade: 0 }
  }
  let borc = 0
  let iade = 0
  for (const h of cariHareketleri(talep.servis?.id)) {
    if (h.tur === 'borc' && siparisinHareketi(h, talep)) borc += Number(h.tutar) || 0
    /* İade yalnız kimlikle: numara eşleşmesi başka bir işin alacağını
       iade sanabilirdi. İade hareketi her zaman kimlik taşıyor. */
    else if (h.tur === 'alacak' && h.talepId && h.talepId === talep.id) iade += Number(h.tutar) || 0
  }
  const dusulen = borc - iade
  return {
    toplam,
    iptalEdilen,
    net,
    dusulen,
    bekleyen: talep.status === 'iptal' ? 0 : Math.max(0, net - dusulen),
    iade,
  }
}

/* İPTAL EDİLEN SİPARİŞİN TUTARI BAKİYEYE GERİ EKLENİYOR (24 Eylül 2026,
   kullanıcının kararı: "İptal edilen taleplerde bakiyeden düşüldüyse
   düşülen tutar bakiyeye geri eklenmeli").

   Borç parça gönderilince yazılıyor (siparisBorcunuYaz); gönderilmeden
   iptal edilen siparişte düşülmüş bir şey yok, iade de yok. Gönderildikten
   sonra (tamamı ya da bir kısmı) iptal edilen siparişte bu siparişe
   düşülmüş NET tutar tek bir alacak hareketiyle geri yazılıyor. Hareket
   talep kimliğini taşıyor; siparisHesabi onu iade olarak sayıyor. İptal
   edilmiş sipariş sonra yeniden açılıp kapanırsa borç yeniden yazılıyor
   (fark, iadeyi hesaba katıyor).

   Faturayla ödenen siparişte uygulama para yazmıyor: fatura LOGO'da,
   iadesi de orada (bkz. VT-TASARIM-EKLERI §9). */
function siparisIadesiniYaz(talep, personel) {
  if (!talep?.servisSiparisi || talep.odeme !== 'bakiye') return 0
  const { dusulen } = siparisHesabi(talep)
  if (dusulen <= 0) return 0
  cariHareketEkle({
    servisId: talep.servis?.id,
    servisAd: talep.servis?.ad,
    tur: 'alacak',
    tutar: dusulen,
    aciklama: `${talep.no} · sipariş iptali · tutar bakiyeye geri eklendi`,
    talepNo: talep.no,
    talepId: talep.id,
    personel,
  })
  return dusulen
}

/**
 * Servisin kendi parça siparişini iptal etmesi (24 Eylül 2026,
 * kullanıcının kararı). Yalnız sipariş "Yeni" iken: PAKSAN işleme
 * aldıktan sonra servis iptal edemiyor, backoffice'e yazıyor.
 * Durum depodan yeniden okunuyor — servis ekranı açıkken PAKSAN
 * siparişi işleme almış olabilir. Parça gönderilmediği için bakiyeden
 * düşülmüş bir şey yok.
 */
export function servisSiparisiniIptalEt(talep, servisAd) {
  const guncel = talepleriGetir().find((t) => t.id === talep?.id)
  if (!guncel?.servisSiparisi) return { hata: 'Sipariş bulunamadı.' }
  if (guncel.status !== 'yeni') {
    return {
      hata: `${MARKA} siparişinizi işleme aldığı için artık buradan iptal edemezsiniz. İptal için ${markaEk('in')} yedek parça birimine ulaşın.`,
      durumDegisti: true,
    }
  }
  return talepIptal(guncel, { neden: 'Servis siparişten vazgeçti' }, servisAd, { servisten: true })
}

/**
 * Servisin bakiyesi ve siparişlere ayrılan kısmı (24 Eylül 2026).
 *
 * Bakiyeden ödenen sipariş verildiği anda bakiyeden düşülmüyor; düşüm
 * parça gönderilince yapılıyor. Arada bakiye, bekleyen siparişi hiç
 * bilmiyordu: bakiyesi 1.000 TL olan servis 900'er TL'lik üç sipariş
 * verebiliyor, parçalar gönderildikçe bakiye eksiye düşüyordu. Artık
 * gönderilmeyi bekleyen tutar "ayrılan" sayılıyor; yeni siparişin
 * bakiyeden ödenip ödenemeyeceği kullanılabilir kısma bakıyor. İptal
 * edilen siparişin ayrılan tutarı kendiliğinden serbest kalıyor
 * (siparisHesabi → bekleyen sıfır).
 *
 * @returns {{bakiye: number, ayrilan: number, kullanilabilir: number}}
 */
export function bakiyeDurumu(servisId) {
  const bakiye = cariBakiye(servisId)
  const ayrilan = servisinSiparisleri(talepleriGetir(), servisId)
    .filter((t) => t.odeme === 'bakiye' && t.status !== 'iptal')
    .reduce((top, t) => top + siparisHesabi(t).bekleyen, 0)
  return { bakiye, ayrilan, kullanilabilir: bakiye - ayrilan }
}

/**
 * Kapanmış servis siparişinin bekleyen parçalarını gönderir: gönderimi
 * talebe yazar, bakiyeden ödenen siparişte o parçaların tutarını düşer,
 * servise bildirir.
 *
 * @param {number[]} secim  gönderilen satırların sırası (0'dan)
 */
export function kalanParcalariGonder(talep, secim, personel) {
  talep = guncelTalep(talep)
  const g = siparisGonderimi(talep)
  if (!g || talep.status !== 'kapandi' || !g.kalan.length) {
    return { hata: 'Gönderilecek kalan parça yok.' }
  }
  const yeni = [...new Set((secim || []).map(Number))]
    .filter((i) => g.kalan.includes(i))
    .sort((a, b) => a - b)
  if (!yeni.length) return { hata: 'En az bir parçayı işaretleyin.' }
  const once = Array.isArray(talep.gonderimler) ? talep.gonderimler : []
  const gonderimler = [...once, { no: once.length + 1, tarih: Date.now(), personel, satirlar: yeni }]
  talepYaz(talep.id, { gonderimler })
  const guncel = { ...talep, gonderimler }
  siparisBorcunuYaz(guncel, personel)
  serviseBildir(guncel, 'kalanGonderildi', { kalan: siparisGonderimi(guncel).kalan.length })
  islemYaz({
    tur: 'talep',
    ozet: `${talep.no} · kalan parçalar gönderildi · ${yeni.length} kalem`,
    personel,
  })
  return { gonderimler }
}

/**
 * KALAN PARÇALARIN İPTALİ (24 Eylül 2026, kullanıcının onayı).
 *
 * Kısmen gönderilmiş siparişte bekleyen parça stoktan kalkmışsa ya da
 * servis ondan vazgeçtiyse, o kalemi kapatmanın tek yolu siparişin
 * tamamını iptal etmekti; gönderilmiş parçaların parası da geri
 * dönüyordu. Artık yalnız seçilen BEKLEYEN kalemler siparişten
 * çıkıyor, gönderilenler yerinde kalıyor.
 *
 * Para: bakiyeden düşüm parça gönderilince yapılıyor
 * (siparisBorcunuYaz), bekleyen kalem için düşülmüş bir şey yok; bu
 * yüzden cariye hiçbir şey yazılmıyor. Siparişin tutarı iptal edilen
 * pay kadar iniyor (siparisHesabi → net) ve o pay bakiyeden ayrılmış
 * olmaktan çıkıyor (bakiyeDurumu). Faturalı siparişte fatura LOGO'da;
 * uygulama para yazmıyor.
 *
 * Sebep ve açıklama servise gidiyor (sipariş iptaliyle aynı:
 * IptalFormu → SIPARIS_IPTAL_SEBEPLERI).
 *
 * @param {number[]} secim  iptal edilen satırların sırası (0'dan)
 */
export function kalanParcalariIptalEt(talep, secim, { neden, aciklama } = {}, personel) {
  talep = guncelTalep(talep)
  const g = siparisGonderimi(talep)
  if (!g || talep.status !== 'kapandi' || !g.kalan.length) {
    return { hata: 'İptal edilecek kalan parça yok.' }
  }
  const satirlar = [...new Set((secim || []).map(Number))]
    .filter((i) => g.kalan.includes(i))
    .sort((a, b) => a - b)
  if (!satirlar.length) return { hata: 'En az bir parçayı işaretleyin.' }
  if (!neden) return { hata: 'İptal nedenini seçin.' }
  const once = Array.isArray(talep.kalemIptalleri) ? talep.kalemIptalleri : []
  const kalemIptalleri = [
    ...once,
    {
      no: once.length + 1,
      tarih: Date.now(),
      personel,
      neden,
      ...(aciklama ? { aciklama } : {}),
      satirlar,
    },
  ]
  const tutar = siparisNetTutari(talep) - siparisNetTutari({ ...talep, kalemIptalleri })
  talepYaz(talep.id, { kalemIptalleri })
  const guncel = { ...talep, kalemIptalleri }
  /* `adet` çıkarılan PARÇA adedi, `kalem` satır sayısı (25 Eylül 2026,
     kullanıcı sınaması). Önce `adet` alanına satır sayısı yazılıyordu:
     adedi 2 olan tek satır "1 parça" sayılıyordu. 24 Eylül'de yazılmış
     eski bildirimlerde `adet` hâlâ kalem sayısı; Servisim'in yazısı bu
     yüzden sayıyı bildirimden değil talepten okuyor. */
  serviseBildir(guncel, 'kalanIptalEdildi', {
    adet: satirlarinAdedi(talep, satirlar),
    kalem: satirlar.length,
    kalan: siparisGonderimi(guncel).kalan.length,
    neden,
    ...(aciklama ? { aciklama } : {}),
    tutar,
    odeme: talep.odeme,
  })
  islemYaz({
    tur: 'talep',
    ozet: `${talep.no} · kalan parçalar iptal edildi · ${satirlar.length} kalem · ${neden}`,
    personel,
  })
  return { kalemIptalleri, tutar }
}

/* --------------------------------------------------- Talep kapanışı

   Kapatırken ne yapıldığı yazılmazsa makinenin arıza geçmişi
   oluşmuyor. Bu kayıt birikince "hangi modelde hangi parça sık
   bozuluyor" sorusunun cevabı çıkıyor — imalatçı için en değerli veri
   bu.                                                                */

export function talepKapat(talep, cozum, personel, { servisten } = {}) {
  /* Kapanmış talep ikinci kez kapatılmıyor: müşteriye ve servise ikinci
     "tamamlandı / kargoya verildi" bildirimi giderdi. */
  talep = guncelTalep(talep)
  if (servisten) {
    const kapali = servisinKapaliIsEngeli(talep)
    if (kapali) return { hata: kapali }
  }
  if (talep.status === 'kapandi') return { hata: 'Bu talep zaten kapanmış.' }
  const engel = durumGecisiEngeli(talep, 'kapandi')
  if (engel) return { hata: engel }

  /* EKSİK GÖNDERİM (24 Eylül 2026, kullanıcının kararı). Servis
     siparişi kapanırken personel gönderdiği satırları işaretliyor
     (`cozum.gonderilen`, satır sıraları); gönderilmeyen satır talepte
     bekliyor ve sonra kalanParcalariGonder ile gidiyor. Seçim yoksa
     (eski çağrı) hepsi gönderilmiş sayılıyor. Seçim `cozum`a değil
     talebin `gonderimler` listesine yazılıyor: üç uygulamanın okuduğu
     kapanış nesnesi aynı kalıyor. */
  const gonderim = servisSiparisiGonderimi(talep, cozum?.gonderilen, personel)
  if (gonderim.hata) return { hata: gonderim.hata }
  const { gonderilen: _secim, kargo, ...cozumKaydi } = cozum || {}

  /* KARGO KAPANIŞIN İÇİNDE (25 Eylül 2026, kullanıcı sınaması).
     Müşterinin parça talebinde kapanış = kargoya verildi. Takip numarası
     kapanışta sorulmuyordu; personel onu ayrı bir "müşteriye not" ile
     gönderiyor ve çiftçiye art arda iki benzer bildirim düşüyordu. Değer
     talebin `parcaSevk` alanına yazılıyor (servis parçasının sevkiyle
     aynı alan; veritabanında talep.ParcaSevki) ve kapanış bildirimi onu
     taşıyor. `cozum`a yazılmıyor: üç uygulamanın okuduğu kapanış nesnesi
     aynı kalıyor. Servis siparişi dışarıda: gönderimi bölünebiliyor
     (`gonderimler`), kargosu gönderim başına düşünülmeli. */
  const firma = String(kargo?.firma || '').trim()
  const takipNo = String(kargo?.takipNo || '').trim()
  const kargoYazi = [firma, takipNo].filter(Boolean).join(' · ')
  const parcaSevk =
    talep.tur === 'parca' && !talep.servisSiparisi && kargoYazi
      ? {
          firma,
          takipNo,
          tarih: talep.parcaSevk?.tarih || Date.now(),
          personel: talep.parcaSevk?.personel || personel,
        }
      : null

  const gecmis = [
    ...(talep.gecmis || []),
    { durum: 'kapandi', tarih: Date.now(), personel },
  ]
  talepYaz(talep.id, {
    status: 'kapandi',
    gecmis,
    cozum: { ...cozumKaydi, tarih: Date.now(), personel },
    ...(gonderim.gonderimler ? { gonderimler: gonderim.gonderimler } : {}),
    ...(parcaSevk ? { parcaSevk } : {}),
  })

  islemYaz({
    tur: 'durum',
    ozet: `${talep.no} kapandı · ${cozum.ozet}${parcaSevk ? ' · ' + kargoYazi : ''}`,
    personel,
  })

  /* Servisin kendi parça siparişinde kapanış = parça kargoya verildi;
     öteki taleplerde PAKSAN işi servisin yerine kapattı. */
  if (!servisten) {
    serviseBildir(
      talep,
      talep.servisSiparisi ? (gonderim.kismi ? 'siparisKismenGonderildi' : 'siparisGonderildi') : 'kapandi',
    )
  }

  /* SERVİSİN HAK EDİŞİNDEN DÜŞÜLECEK SİPARİŞ.

     Servis siparişi verirken bedelin hak edişinden düşülmesini
     istemiş olabiliyor (bkz. servisParcaSiparisi → odeme). Düşüm o an
     yapılmıyor: sipariş henüz onaylanmamış.
     Parça kargoya verildiğinde iş kesinleşiyor ve borç deftere o
     zaman yazılıyor.

     Tutar sipariş anındaki fiyattan ve BAĞLAYICI (24 Eylül 2026,
     kullanıcının kararı: "sipariş verildiği zamanki tutar üzerinden
     ücretlendirilmeli"). Fatura da bu tutarla kesilir; faturanın
     tutarı bu satırın yerine geçmiyor. Önce öyle planlanmıştı.

     RAKAM KAYDIN İÇİNDEKİ FİYAT GÖRÜNTÜSÜNDEN OKUNUYOR.

     Sipariş verilirken o günün satırları, KDV'si ve toplamı kaydın
     içine yazılıyor (`parcaFiyat`, bkz. servisParcaSiparisi). Deftere
     yazılan borç oradan geliyor; katalog yeniden açılıp fiyat yeniden
     hesaplanmıyor — fiyat listesi aradan geçen günlerde değişmiş
     olabilir ve servise söylenen tutar sipariş günündeki tutardır.

     Eski siparişlerde görüntü yok, yalnız `tutarKdvli` var; onlar için
     o alan kullanılıyor.

     BAKİYEDEN ÖDEMEDE EK İSKONTO bu toplamın İÇİNDE (24 Eylül 2026):
     görüntünün `toplam`ı ek iskonto düşülmüş ara toplam + KDV
     (lib/servisFiyat.js → siparisTutari). Burada ayrıca düşülmüyor;
     düşülseydi servis iki kez indirim almış olurdu.

     EKSİK GÖNDERİMDE yalnız gönderilen satırlar düşülüyor, kalanı
     gönderildiği gün (bkz. siparisBorcunuYaz, kalanParcalariGonder). */
  siparisBorcunuYaz(
    { ...talep, status: 'kapandi', gonderimler: gonderim.gonderimler ?? talep.gonderimler },
    personel,
  )

  /* YEDEK PARÇADA KAPANIŞ = KARGOYA VERİLDİ.

     Bildirim de ona göre yazılıyor. Kapanışta kargo bilgisi girildiyse
     (25 Eylül 2026'dan beri, yukarıda) bildirim onu taşıyor: müşteri
     firma ve takip numarasını uygulamayı açmadan, bildirimin içinde
     görüyor; tek bildirim gidiyor. Girilmediyse "kargoya verildi"
     demekle kalıyor. Eskiden bu iş ayrı bir "Gönderildi" durumundan
     çıkıyordu; o durum kaldırıldı (bkz. DURUMLAR).

     Servis siparişinde müşteri alıcısı yok (bildirimAlicisi); haber
     yukarıdaki serviseBildir'den gidiyor. */
  const parcaGonderimi = talep.tur === 'parca'
  musteriyeBildir({
    musteriId: bildirimAlicisi(talep),
    tur: 'talep',
    baslikAnahtar: parcaGonderimi
      ? 'bildirimler.gonderildiBaslik'
      : 'bildirimler.durumBaslik',
    metinAnahtar: parcaGonderimi
      ? parcaSevk
        ? 'bildirimler.gonderildiMetinKargo'
        : 'bildirimler.gonderildiMetin'
      : 'bildirimler.durum_kapandi',
    degerler: {
      no: talep.no,
      durum: 'kapandi',
      talepTur: talep.tur,
      ...(parcaSevk ? { kargo: kargoYazi } : {}),
    },
    talepNo: talep.no,
  })
  return { kismi: Boolean(gonderim.kismi) }
}

/* ------------------------------------------------------- Talep iptali

   İptal, kapanışın sessiz kardeşi değil: müşteri bir iş bekliyordu ve
   o iş yapılmayacak. Sebebi yazılmadan iptal edilemiyor ve sebep
   müşteriye AYNEN gidiyor.

   Önceki hâlinde iptal, öteki durum değişiklikleri gibi tek tıkla
   oluyordu; müşteriye giden bildirimde yalnız "talebiniz kapatıldı"
   yazıyordu. Bildirime dokunan kişi hiçbir şey öğrenemiyordu.        */

export function talepIptal(talep, iptal, personel, { servisten } = {}) {
  if (servisten) {
    talep = guncelTalep(talep)
    const kapali = servisinKapaliIsEngeli(talep)
    if (kapali) return { hata: kapali }
  }
  const engel = durumGecisiEngeli(talep, 'iptal')
  if (engel) return { hata: engel }

  const gecmis = [...(talep.gecmis || []), { durum: 'iptal', tarih: Date.now(), personel }]
  talepYaz(talep.id, {
    status: 'iptal',
    gecmis,
    iptalBilgi: { ...iptal, tarih: Date.now(), personel },
  })

  islemYaz({ tur: 'durum', ozet: `${talep.no} iptal edildi · ${iptal.neden}`, personel })

  /* Bakiyeden ödenmiş ve parçası gönderilmiş siparişte düşülen tutar
     bakiyeye geri ekleniyor (bkz. siparisIadesiniYaz). */
  const iade = siparisIadesiniYaz(talep, personel)

  /* İptal edilen iş servisin listesinden "Tamamlanan"a düşüyor; haber
     verilmezse servis o müşteriye gitmeye devam edebilir. */
  if (!servisten) serviseBildir(talep, 'iptal', { neden: iptal.neden, ...(iade ? { iade } : {}) })

  /* Servis siparişinde müşteri alıcısı yok (bildirimAlicisi); haber
     yukarıdaki serviseBildir'den gidiyor. */
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
  const engel = durumGecisiEngeli(talep, 'teklif')
  if (engel) return { hata: engel }

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
  /* İkinci onay (eski ekran, iki sekme) hiçbir şey yazmıyor: istenen
     sonuç zaten var; müşteriye ikinci "ödemeniz alındı" gitmesin. */
  talep = guncelTalep(talep)
  if (talep.odemeOnay) return { zatenOnayli: true }
  const simdi = Date.now()
  const degisiklik = { odemeOnay: { tarih: simdi, personel, not: not || '' } }

  /* Servisin kendi parça siparişinin ödemesi onaylandıysa servis
     bilmeli: parçası artık hazırlanıyor. Müşterinin siparişinde talep
     servise bağlı değil; kapı sessizce geçer. */
  serviseBildir(talep, 'odemeOnay')

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

   SAHİP TEK KURALDAN (25 Eylül 2026, kullanıcı sınaması Y3). Önce
   `telHam` harfi harfine karşılaştırılıyordu: Connect talebi numarayı
   boşluklu, servisin elle açtığı talep "0532…" diye yazdığı için aynı
   müşterinin işleri birbirini görmüyordu. Artık lib/musteriEslesmesi.js
   → talepSahibiBulucu: önce `musteriId`, yoksa ülke kodlu telefon
   anahtarı. Servis siparişinde "müşteri" servisin kendisi; aynı
   servisin öteki siparişleri servis kimliğiyle geliyor, müşteri
   talebi karışmıyor.

   @param {boolean} yalnizAcik kapanmışları dışarıda bırak */
export function musterininDigerTalepleri(talep, hepsi, { yalnizAcik = false } = {}) {
  const sahibi = talepSahibiBulucu(musterileriGetir())
  const anahtar = sahibi(talep)?.anahtar
  if (!anahtar) return []
  return hepsi
    .filter((t) => t.id !== talep.id && sahibi(t)?.anahtar === anahtar)
    .filter((t) => !yalnizAcik || !KAPALI_DURUMLAR.includes(t.status || 'yeni'))
    .sort((a, b) => b.createdAt - a.createdAt)
}

/* ------------------------------------------------------- Planlama

   "Planlandı" demek tek başına bir şey anlatmıyor: müşteri neyin ne
   zaman yapılacağını bilmek istiyor. Bu yüzden planlanan iş ve tarih
   kaydediliyor, bildirimde de ikisi birden gidiyor.                   */

/* SERVİS İŞİNİN RANDEVUSU SERVİSİN (29 Eylül 2026, kullanıcının kararı:
   "PAKSAN'a devredilmemiş işin randevusunu PAKSAN belirleyememeli").
   Randevuyu servis veriyor: müşteriyle o konuşuyor, tarlaya o gidiyor.
   PAKSAN ancak servisin kendisine devrettiği işte (Servisim → "PAKSAN'a
   Devret", `sahip: 'paksan'`) gün verebilir. Backoffice'in çip listesi
   servis talebinde "Planlandı"yı zaten göstermiyordu
   (elleSecilebilirDurumlar); kural artık veri katmanında da duruyor,
   demo ve ileride yazılacak bir ekran onu aşamasın. Yedek parça ve
   servisin parça siparişinde gönderim gününü PAKSAN veriyor; orada
   engel yok. Sınaması AK-15. */
export function paksanRandevuEngeli(talep) {
  if (!talep || talep.tur !== 'servis' || talep.servisSiparisi) return null
  if (talep.devir && (talep.sahip || 'paksan') === 'paksan') return null
  return `Bu işin randevusunu servis verir. ${MARKA} yalnızca kendisine devredilen işlere randevu verebilir.`
}

export function talepPlanla(talep, plan, personel, { servisten } = {}) {
  if (servisten) {
    talep = guncelTalep(talep)
    const kapali = servisinKapaliIsEngeli(talep)
    if (kapali) return { hata: kapali }
  }
  const engel = !servisten && paksanRandevuEngeli(guncelTalep(talep) || talep)
  if (engel) return { hata: engel }
  const gecmis = [
    ...(talep.gecmis || []),
    { durum: 'planlandi', tarih: Date.now(), personel },
  ]
  /* SAAT GİRİLDİ Mİ (25 Eylül 2026, kullanıcı sınaması). Servisim
     randevuda yalnız günü soruyor (lib/tarih.js → gunlukRandevu,
     `saatBelirtildi: false`), backoffice gün ve saati (`true`). Önce bu
     bilgi yazılmıyordu; saatsiz randevu gece yarısı UTC okunup Servisim'de
     "03:00" diye görünüyordu. Alan plan nesnesiyle olduğu gibi geçiyor;
     taşımayan eski kaydı lib/tarih.js → randevuSaatliMi geriye dönük
     kuralla okuyor. Veritabanında talep.Randevu.SaatBelirtildi. */
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

  /* Servis randevu verdiğinde de bu işlev çağrılıyor (servisten: true).
     PAKSAN'ın planı iki şey olabilir: servisin parça siparişinde gönderim
     günü, servis talebinde ise müşteriyle konuşulmuş ziyaret günü.
     Servisim ikisini ayrı yazıyor; `siparis` o ayrımı taşıyor. */
  if (!servisten) {
    serviseBildir(talep, 'planlandi', {
      tarih: plan.tarihYazi,
      siparis: Boolean(talep.servisSiparisi),
    })
  }

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
  /* Talebe yazılan numara ham (rakam, sıfırsız, ülke kodsuz): hesap
     numarayı boşluklu saklıyor (Y3, 25.09.2026). */
  const hedefUlke = yeni?.ulke || talep.yeniUlke || ''
  const hedef = {
    id: yeniId,
    no: yeni?.no || talep.yeniHesap?.musteriNo || null,
    ad: yeni?.ad || talep.ad || '',
    telHam: telHamYap(hedefUlke, yeni?.tel || talep.yeniTelHam || ''),
    ulke: hedefUlke,
  }

  const defter = makineKayitlariGetir().map((k) =>
    eskiHesabinMi(talep, k)
      ? { ...k, musteriId: hedef.id, musteriNo: hedef.no, musteriAd: hedef.ad }
      : k
  )
  const defterSayisi = makineKayitlariGetir().filter((k) => eskiHesabinMi(talep, k)).length

  /* Eski hesabın talebi tek kuraldan (lib/musteriEslesmesi.js →
     hesabaBaglanirMi, Y3): önce kimlik, yoksa ülke kodlu telefon anahtarı.
     Önce `telHam` harfi harfine karşılaştırılıyordu; başka hesabın
     kimliğini taşıyan talep de numarası tuttu diye taşınıyordu.

     Servisin elle açtığı KİMLİKSİZ iş taşınmıyor (25 Eylül 2026,
     inceleme): numara değişikliğinde bağlanmayan iş birleştirmede de
     bağlanmasın. Taşınsaydı yeni hesabın Connect listesine girer,
     bildirimi ona giderdi (gerekçe musteriEslesmesi.js başında). */
  const eskiTel = eski?.tel ? String(eski.tel) : ''
  const talebinMi = (t) => hesabaBaglanirMi(t, eski || { id: eskiId })
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
        /* Defterdeki eski satırın yılı eskisi gibi okunuyor: seri
           doğrulaması sıkılaştı (Y2, 25.09.2026) ve bozuk eski seride
           validateSerial yıl vermiyor. */
        year: extractYear(k.seri) || null,
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

/* NUMARASI DEĞİŞECEK HESABIN KİMLİKSİZ TALEPLERİ (25 Eylül 2026,
   kullanıcı sınaması Y3).

   24 Eylül'den önce Connect talebi hesap kimliği taşımıyordu; hesaba
   yalnız numarasıyla bağlıydı. Numara değişince bu talepler müşteri
   kartından ve Connect listesinden düşer, eski numarayı alan kişi
   onları görürdü. Numara değişmeden önce hesabın kimliği yazılıyor.

   Servisin elle açtığı kimliksiz iş BAĞLANMIYOR: Connect onu numarayla
   da göstermiyor (gerekçe lib/musteriEslesmesi.js başında);
   görünürlüğü burada değişmesin.

   GÖRÜŞLER DE BAĞLANIYOR (25 Eylül 2026, inceleme). Görüş kaydı da 25
   Eylül'den önce kimlik taşımıyordu; numara değiştikten sonra eski
   görüşe yazılan cevap numarayla eşleşip eski numarayı alan kişiye
   gidiyordu. Aynı gerekçe, aynı kural. */
function kimliksizTalepleriBagla(hesap) {
  const baglanir = (t) => !t.musteriId && hesabaBaglanirMi(t, hesap)
  ;[ANAHTAR.talepler, ANAHTAR.demoTalepler, ANAHTAR.geriBildirim].forEach((k) => {
    const liste = load(k, [])
    if (liste.some(baglanir)) save(k, liste.map((t) => (baglanir(t) ? { ...t, musteriId: hesap.id } : t)))
  })
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
        ? `${talep.ad} · hesap birleştirme talebi reddedildi; kayıtlar taşınmadı · ${talep.seri}${not ? ' · ' + not : ''}`
        : sonuc.bos
          ? `${talep.ad} · hesap birleştirme talebi onaylandı · eski hesap ${
              sonuc.eskiNo || '—'
            } · eski hesapta taşınacak kayıt bulunamadı${not ? ' · ' + not : ''}`
          : `${talep.ad} · hesap birleştirme talebi onaylandı · eski hesap ${sonuc.eskiNo || '—'} → ${
              sonuc.yeniNo || '—'
            } · ${sonuc.makine} makine, ${sonuc.defter} makine kaydı, ${sonuc.talep} talep yeni hesaba taşındı${
              sonuc.eskiTelBilinmiyor ? ' · eski numara bilinmiyor, numarayla açılan talepler taşınamadı' : ''
            }${not ? ' · ' + not : ''}`,
      personel,
    })
    return liste
  }

  if (onay) {
    /* Numara değişmeden ÖNCE eski numarayla açılmış kimliksiz talepler
       hesaba bağlanıyor (Y3, 25.09.2026); yoksa karttan ve Connect
       listesinden düşerler, eski numarayı alan kişi onları görür. */
    const hesap = talebinMusterisi(talep)
    if (hesap) kimliksizTalepleriBagla(hesap)

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

  /* Görüş kaydı 25 Eylül 2026'dan beri hesabın kimliğini (`musteriId`)
     taşıyor (screens/Profile.jsx → yorumGonder): cevap numara değişse de
     o hesaba gidiyor. Eski kayıtta yalnız telefon var; kimlik ondan
     eşleştiriliyor (bildirimAlicisi). Sınaması AK-32. Alıcı depodaki
     kayıttan: numara değişikliğinde bağlanan kimlik ekranın elindeki
     eski kopyada yok (sınaması AK-30). */
  musteriyeBildir({
    musteriId: bildirimAlicisi(liste.find((g) => g.id === gorus.id) || gorus),
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

/* ------------------------------------------ Yedek parça kataloğu düzeltmeleri

   Katalog PAKSAN'ın bastığı fiyat listesinden üretiliyor ve listede
   yanlış yazılmış bir ad ya da yanlış gruba düşmüş bir parça olabiliyor.
   Personel bunu yeni liste beklemeden düzeltiyor.

   DÜZELTME PARÇA KODUNA BAĞLI. Katalog dosyasının içine yazılmıyor,
   üstüne biniyor (bkz. lib/parcaKatalogu.js → duzeltmeleriUygula). Yeni
   fiyat listesi geldiğinde dosya bütünüyle değişiyor ama düzeltmeler
   kodla eşleştiği için ayakta kalıyor.

   FİYAT BURADAN DEĞİŞMİYOR. Ad, grup ve "listede görünmesin" işareti
   var; fiyat ancak yeni liste sürümüyle bütün olarak değişiyor. Tek tek
   değiştirilebilseydi altı ay sonra hangi tutarın ne zaman geçerli
   olduğu çıkarılamazdı — verilmiş siparişlerin tutarı da o kayıttan
   doğrulanıyor (bkz. parcaKatalogu.js → fiyatGoruntusu). */

export function parcaDuzeltmeleriGetir() {
  const v = load(ANAHTAR.icerik, {}).parcaDuzeltme
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
}

/**
 * Bir parçanın düzeltmesini yazar. `duzeltme` alanlarından yalnız
 * verilenler değişiyor; `null` verilirse o parçanın düzeltmesi siliniyor
 * ve parça asıl hâline dönüyor.
 *
 * @param {string} kod parça kodu
 * @param {{ad?: string, grup?: string, gizli?: boolean}|null} duzeltme
 */
export function parcaDuzeltmesiYaz(kod, duzeltme, personel, ozet) {
  const mevcut = load(ANAHTAR.icerik, {})
  const hepsi = { ...parcaDuzeltmeleriGetir() }
  if (!duzeltme) delete hepsi[kod]
  else hepsi[kod] = { ...hepsi[kod], ...duzeltme }
  save(ANAHTAR.icerik, { ...mevcut, parcaDuzeltme: hepsi })
  icerikTazele()
  islemYaz({ tur: 'katalog', ozet, personel })
  return hepsi
}

/**
 * Yeni fiyat listesinin yayına alındığını işlem kaydına yazar (21 Eylül
 * 2026). Listeyi sunucu yayına alıyor (lib/parcaKatalogu.js →
 * fiyatListesiYayinla); burada yalnız "kim, ne zaman, hangi listeyi"
 * sorusunun cevabı tutuluyor. Fiyatlar bütün müşterileri ve servisleri
 * etkilediği için bu kayıt olmadan bir zammın kimden çıktığı bilinmez.
 */
export function fiyatListesiYayinlandi({ kaynak, parca, surum }, personel) {
  islemYaz({
    tur: 'katalog',
    ozet: `Yeni fiyat listesi yayına alındı · Kaynak: ${kaynak} · ${parca} parça · Sürüm: ${surum}`,
    personel,
  })
}

/* ==========================================================================
   Servis hizmet ücreti ve parça iskontosu (23 Eylül 2026)

   KULLANICININ İKİ İSTEĞİ

     ÜCRET   "Servislerin hizmet ücretlendirmelerini, yani KM başına ücret
             ve saat başına ücret bilgilerinin (makine bazında da
             ayarlanabilse iyi olur) BackOffice üzerinden ilgili personel
             tarafından değiştirilebileceği bir alan yaratmalıyız."
     İSKONTO "Servislerimize genel veya servise özel iskonto
             uygulayabileceğimiz bir alan oluşturulmalı … yapılan
             iskontolar veya değişiklikler bildirim olarak da gitmeli."

   İkisi de koddaki bir sabitti (lib/servisKaydi.js → TARIFE,
   marka/katalog/makineFiyat.js → PARCA_SERVIS_ISKONTO). Sabitler yerinde
   kalıyor: personel hiçbir şey yazmadıysa geçerli olan BAŞLANGIÇ değeri.
   Hesabın kendisi saf modüllerde (lib/servisTarifesi.js,
   lib/servisFiyat.js); burada yalnız depo, işlem kaydı ve bildirim.

   DEPO `panelIcerik` İÇİNDE (`hizmetTarifesi`, `parcaIskontosu`):
   backoffice'in servise ve parçaya dair düzelttiği her şey orada
   (servis listesi, parça düzeltmeleri). Veritabanında hakedis.Tarife ve
   servis iskontosu tablosu (VT-TASARIM-EKLERI.md §5, §6).

   GENEL DEĞİŞİNCE ÖZEL OLANLAR SORULUYOR. Kullanıcının kuralı: özel
   ücreti olan servisler varken genel ücret değiştirilirse uyarı çıkıyor
   ve "onlar da değişsin mi" diye soruluyor. Soruyu ekran soruyor; cevap
   buraya `ozelleriDegistir` diye geliyor. Evet derse yalnız DEĞİŞEN
   kalemin özel ücreti kalkıyor (yalnız saat ücreti değiştiyse özel yol
   ücreti yerinde kalıyor).

   SERVİSE BİLDİRİM GİDİYOR — yalnız ücreti GERÇEKTEN değişen servise.
   Genel ücret değişti ama servisin özel ücreti yerinde kaldıysa o
   servisin eline geçen para değişmedi; ona bildirim gitmiyor. Bildirim
   talebe bağlı değil (`tur: 'hesap'`, talep numarası yok); Servisim onu
   İşlerim'in üstündeki bildirimlerde gösteriyor ve dokununca Hesap
   ekranındaki ücretleri açıyor (bkz. servis/talepBildirimleri.js).

   GEÇMİŞ DEĞİŞMİYOR. Ücret servis kaydına gönderildiği anda
   (servisKaydiGonder), iskonto oranı siparişe verildiği anda
   (servisParcaSiparisi) yazılıyor.
   ========================================================================== */

/* Servise, bir talebe bağlı olmayan bildirim: ücreti ya da iskontosu
   değişti. Talep bildirimiyle aynı depo ve aynı biçim (bkz.
   serviseBildir); farkı `tur: 'hesap'` ve talep alanlarının yokluğu. */
function servisHesapBildir(servisId, olay, degerler) {
  save(ANAHTAR.duyurular, [
    {
      id: uid(),
      tarih: Date.now(),
      tur: 'hesap',
      kisisel: true,
      alici: 'servis',
      servisId,
      olay,
      degerler,
    },
    ...load(ANAHTAR.duyurular, []),
  ])
}

/* ÜCRETİN KISA GEÇMİŞİ (24 Eylül 2026).

   Servisim onay penceresinde gördüğü oranla ya da ücretle gönderiyor ve
   o değer PAKSAN'ın tam o sırada değiştirdiği değer olabiliyor (bkz.
   servisParcaSiparisi, servisKaydiGonder). Veri katmanı bunu kabul
   ederken "bu değer, ekranın okuduğu anda gerçekten geçerli miydi?"
   diye bakabilmeli; yoksa taze okuma anı taşıyan her rakam geçerdi
   (son inceleme bir %90 iskontoyla ve 999 TL/km'yle bunu gösterdi).

   Hizmet tarifesi ve parça iskontosu her değiştiğinde ÖNCEKİ hâli,
   bittiği anla birlikte saklanıyor. Yalnız son ONAY_TUTAR_SURESI (30
   dakika) tutuluyor: daha eskisini hiçbir onay kullanamaz. Değer JSON
   yazısı olarak duruyor — geçmiş, kayıt biçiminin kopyası değil,
   yalnız "o an neydi" sorusunun cevabı. Sunucuda karşılığı sistem
   sürümlü tablolar ve tarifenin tarih aralığı (VT-TASARIM-EKLERI §9). */
const GECMISLI_ALANLAR = ['parcaIskontosu', 'hizmetTarifesi']

function icerikAlaniYaz(alan, deger) {
  const mevcut = load(ANAHTAR.icerik, {})
  const sonraki = { ...mevcut, [alan]: deger }
  const eski = JSON.stringify(mevcut[alan] ?? null)
  if (GECMISLI_ALANLAR.includes(alan) && eski !== JSON.stringify(deger ?? null)) {
    const simdi = Date.now()
    const liste = [...(mevcut.ucretGecmisi?.[alan] || []), { deger: eski, bitis: simdi }].filter(
      (x) => simdi - x.bitis <= ONAY_TUTAR_SURESI,
    )
    sonraki.ucretGecmisi = { ...(mevcut.ucretGecmisi || {}), [alan]: liste }
  }
  save(ANAHTAR.icerik, sonraki)
  icerikTazele()
}

/* Ekranın `zaman` anında okuduğu kayıt: o andan SONRA kapanmış en eski
   önceki hâl; öyle bir hâl yoksa o andan beri değişmemiş, yani bugünkü. */
function okunduguAnkiIcerik(alan, zaman) {
  const icerik = load(ANAHTAR.icerik, {})
  const onceki = (icerik.ucretGecmisi?.[alan] || [])
    .filter((x) => x.bitis > zaman)
    .sort((a, b) => a.bitis - b.bitis)[0]
  if (!onceki) return icerik[alan] ?? null
  try {
    return JSON.parse(onceki.deger)
  } catch {
    return null
  }
}

const ucretYazisi = (t) =>
  `Yol ${t.yolKm} ${PARA_BIRIMI}/km · İşçilik ${t.iscilikSaat} ${PARA_BIRIMI}/saat`

/* Makineye göre satırları okunur biçime: gelen nesnede boş kutu olabilir. */
function modelSatirlari(modeller) {
  const sonuc = {}
  for (const [urunId, satir] of Object.entries(modeller || {})) {
    const temiz = {}
    for (const k of KALEMLER) {
      const v = ucretOku(satir?.[k])
      if (v !== null) temiz[k] = v
    }
    if (urunId && Object.keys(temiz).length) sonuc[urunId] = temiz
  }
  return sonuc
}

/** Hizmet tarifesinin tamamı: genel, makineye göre, servise özel. */
export function hizmetTarifesiGetir() {
  return tarifeleriDuzenle(load(ANAHTAR.icerik, {}).hizmetTarifesi)
}

/**
 * Bir servisin bir makinedeki geçerli ücretleri — Servisim kaydın ön
 * hesabında, veri katmanı kaydı gönderirken bunu okuyor.
 * @returns {{yolKm, iscilikSaat, kaynak}}
 */
export function servisinTarifesi(servisId, urunId = null) {
  return tarifeCoz(hizmetTarifesiGetir(), servisId, urunId)
}

/* Tarife değişti; ücreti gerçekten değişen her servise bildirim. */
function tarifeDegisiminiBildir(onceki, sonraki, servisKimlikleri) {
  let sayi = 0
  for (const servisId of servisKimlikleri) {
    const fark = tarifeFarki(onceki, sonraki, servisId)
    if (!fark) continue
    servisHesapBildir(servisId, 'tarife', fark)
    sayi += 1
  }
  return sayi
}

/* Bütün servislerin kimliği: listedekiler ve tarifede özel satırı
   duranlar (listeden çıkarılmış bir servis de olsa kaydı var). */
function butunServisKimlikleri(...tarifeler) {
  const kimlikler = new Set(servisleriGetir().map((x) => x.id))
  for (const t of tarifeler) Object.keys(t?.servisler || {}).forEach((id) => kimlikler.add(id))
  return [...kimlikler]
}

/**
 * Genel tarifeyi kaydeder.
 *
 * @param {{yolKm, iscilikSaat, modeller?}} yeni  genel ücretler ve
 *        (verilirse) genel makineye göre satırlar
 * @param {{ozelleriDegistir?: boolean}} secim  değişen kalemde servislerin
 *        özel ücreti de kalksın mı
 * @returns {{hata}|{tarife, bildirilen: number, degisen: string[]}}
 */
export function genelTarifeyiKaydet(yeni, { ozelleriDegistir = false } = {}, personel) {
  const yolKm = ucretOku(yeni?.yolKm)
  const iscilikSaat = ucretOku(yeni?.iscilikSaat)
  if (yolKm === null) return { hata: 'Kilometre başına ücreti yazın.' }
  if (iscilikSaat === null) return { hata: 'Saat başına ücreti yazın.' }

  const onceki = hizmetTarifesiGetir()
  const degisen = KALEMLER.filter((k) => onceki.genel[k] !== { yolKm, iscilikSaat }[k])
  let sonraki = tarifeleriDuzenle({
    ...onceki,
    genel: { yolKm, iscilikSaat, guncelleme: { tarih: Date.now(), personel: personel || '' } },
    modeller: yeni.modeller === undefined ? onceki.modeller : modelSatirlari(yeni.modeller),
  })
  if (ozelleriDegistir && degisen.length) sonraki = ozelleriKaldir(sonraki, degisen)

  icerikAlaniYaz('hizmetTarifesi', sonraki)
  const bildirilen = tarifeDegisiminiBildir(onceki, sonraki, butunServisKimlikleri(onceki, sonraki))

  islemYaz({
    tur: 'tarife',
    ozet:
      `Genel servis ücreti güncellendi · ${ucretYazisi(onceki.genel)} → ${ucretYazisi(sonraki.genel)}` +
      (ozelleriDegistir && degisen.length ? ' · Servislerin özel ücretleri de değiştirildi' : '') +
      ` · ${bildirilen} servise bildirim gönderildi`,
    personel,
  })
  return { tarife: sonraki, bildirilen, degisen }
}

/**
 * Bir servisin özel ücretlerini kaydeder. `ozel` boşsa (ya da null) servis
 * genel tarifeye döner.
 *
 * @param {null|{yolKm?, iscilikSaat?, modeller?}} ozel  boş kutu = genelden
 * @returns {{tarife, bildirildi: boolean}}
 */
export function servisTarifesiniKaydet(servisId, ozel, personel) {
  if (!servisId) return { hata: 'Servis bulunamadı.' }
  const onceki = hizmetTarifesiGetir()
  const servisler = { ...onceki.servisler }
  const kalemler = {}
  for (const k of KALEMLER) {
    const v = ucretOku(ozel?.[k])
    if (v !== null) kalemler[k] = v
  }
  const modeller = modelSatirlari(ozel?.modeller)
  if (!Object.keys(kalemler).length && !Object.keys(modeller).length) delete servisler[servisId]
  else {
    servisler[servisId] = {
      ...kalemler,
      modeller,
      guncelleme: { tarih: Date.now(), personel: personel || '' },
    }
  }
  const sonraki = tarifeleriDuzenle({ ...onceki, servisler })

  const fark = tarifeFarki(onceki, sonraki, servisId)
  if (!fark) return { tarife: onceki, bildirildi: false }

  icerikAlaniYaz('hizmetTarifesi', sonraki)
  servisHesapBildir(servisId, 'tarife', fark)
  const ad = servisleriGetir().find((x) => x.id === servisId)?.ad || servisId
  islemYaz({
    tur: 'tarife',
    ozet: servisler[servisId]
      ? `${ad} için özel servis ücreti kaydedildi · ${ucretYazisi(tarifeCoz(sonraki, servisId, null))}`
      : `${ad} genel servis ücretine döndü · ${ucretYazisi(sonraki.genel)}`,
    personel,
  })
  return { tarife: sonraki, bildirildi: true }
}

/** Parça iskontosunun tamamı: genel oran ve servise özel oranlar. */
export function parcaIskontosuGetir() {
  return iskontolariDuzenle(load(ANAHTAR.icerik, {}).parcaIskontosu)
}

/**
 * Bir servisin geçerli parça iskontosu.
 * @returns {{oran: number, kaynak: 'servis'|'genel'}}
 */
export function servisinIskontosu(servisId) {
  return iskontoCoz(parcaIskontosuGetir(), servisId)
}

/* İskonto değişti; oranı gerçekten değişen her servise bildirim. */
function iskontoDegisiminiBildir(onceki, sonraki, servisKimlikleri) {
  let sayi = 0
  for (const servisId of servisKimlikleri) {
    const a = iskontoCoz(onceki, servisId).oran
    const b = iskontoCoz(sonraki, servisId).oran
    if (a === b) continue
    servisHesapBildir(servisId, 'iskonto', { once: yuzdeYap(a), simdi: yuzdeYap(b) })
    sayi += 1
  }
  return sayi
}

/**
 * Bütün servislere uygulanan iskontoyu kaydeder.
 *
 * @param {number|string} yuzde  yüzde olarak (30 = %30)
 * @param {{ozelleriDegistir?: boolean}} secim  servislerin özel oranları
 *        da kalksın mı
 */
export function genelIskontoyuKaydet(yuzde, { ozelleriDegistir = false } = {}, personel) {
  const oran = oranOku(yuzde, true)
  if (oran === null) return { hata: 'İskonto oranını 0 ile 90 arasında bir sayı olarak yazın.' }

  const onceki = parcaIskontosuGetir()
  const sonraki = iskontolariDuzenle({
    genel: oran,
    servisler: ozelleriDegistir ? {} : onceki.servisler,
    /* Bakiyeden ödemede ek iskonto bu kaydın parçası ama genel orandan
       bağımsız; genel oran değişince yerinde kalıyor. */
    bakiye: onceki.bakiye,
    guncelleme: { tarih: Date.now(), personel: personel || '' },
  })
  icerikAlaniYaz('parcaIskontosu', sonraki)

  const kimlikler = new Set([...servisleriGetir().map((x) => x.id), ...Object.keys(onceki.servisler)])
  const bildirilen = iskontoDegisiminiBildir(onceki, sonraki, [...kimlikler])
  islemYaz({
    tur: 'iskonto',
    ozet:
      `Genel servis iskontosu güncellendi · %${yuzdeYap(onceki.genel)} → %${yuzdeYap(oran)}` +
      (ozelleriDegistir && Object.keys(onceki.servisler).length ? ' · Servislerin özel oranları da değiştirildi' : '') +
      ` · ${bildirilen} servise bildirim gönderildi`,
    personel,
  })
  return { iskonto: sonraki, bildirilen }
}

/**
 * Bir servise özel iskonto yazar; `yuzde` boşsa (null, '') servis genel
 * orana döner.
 */
export function servisIskontosunuKaydet(servisId, yuzde, personel) {
  if (!servisId) return { hata: 'Servis bulunamadı.' }
  const bos = yuzde === null || yuzde === undefined || yuzde === ''
  const oran = bos ? null : oranOku(yuzde, true)
  if (!bos && oran === null) return { hata: 'İskonto oranını 0 ile 90 arasında bir sayı olarak yazın.' }

  const onceki = parcaIskontosuGetir()
  const servisler = { ...onceki.servisler }
  if (bos) delete servisler[servisId]
  else servisler[servisId] = oran
  const sonraki = iskontolariDuzenle({
    ...onceki,
    servisler,
    guncelleme: { tarih: Date.now(), personel: personel || '' },
  })
  icerikAlaniYaz('parcaIskontosu', sonraki)

  const bildirildi = iskontoDegisiminiBildir(onceki, sonraki, [servisId]) > 0
  const ad = servisleriGetir().find((x) => x.id === servisId)?.ad || servisId
  islemYaz({
    tur: 'iskonto',
    ozet: bos
      ? `${ad} genel servis iskontosuna döndü · %${yuzdeYap(sonraki.genel)}`
      : `${ad} için özel iskonto kaydedildi · %${yuzdeYap(oran)}`,
    personel,
  })
  return { iskonto: sonraki, bildirildi }
}

/* ------------------------------------------ Bakiyeden ödemede ek iskonto

   24 Eylül 2026, kullanıcının isteği: "Servisim'de yedek parça
   siparişlerinde bakiyeden düşsün seçeneği ile yapılan siparişlerde ek
   indirim uygulayabilelim." Oran tek ve bütün servislere aynı (gerekçesi
   lib/servisFiyat.js başında); aynı `parcaIskontosu` kaydında `bakiye`
   alanı, aynı yetki (`servisIskontosu`).

   BİLDİRİM BÜTÜN SERVİSLERE, YALNIZ ORAN GERÇEKTEN DEĞİŞİNCE. Oran
   servise göre değişmediği için değişim her servisin eline geçen parayı
   değiştiriyor. Aynı oran yeniden kaydedilirse hiçbir şey yazılmıyor:
   ne depo ne işlem kaydı ne bildirim.

   Siparişe oran ve düşülen tutar sipariş anında yazılıyor
   (`parcaFiyat.bakiyeIskontoOrani`, `bakiyeIskontoTutari`); veri
   katmanı oranı bugünküyle doğruluyor (bkz. servisParcaSiparisi). */

/** Bakiyeden ödemede ek iskonto oranı (kesir); 0 ise kapalı. */
export function bakiyeIskontosuGetir() {
  return bakiyeIskontosu(parcaIskontosuGetir())
}

/**
 * Bakiyeden ödemede ek iskontoyu kaydeder.
 *
 * @param {number|string} yuzde  yüzde olarak (3 = %3); 0 özelliği kapatır
 * @returns {{hata}|{iskonto, oran: number, bildirilen: number}}
 */
export function bakiyeIskontosunuKaydet(yuzde, personel) {
  const oran = oranOku(yuzde, true)
  if (oran === null) return { hata: 'İskonto oranını 0 ile 90 arasında bir sayı olarak yazın.' }

  const onceki = parcaIskontosuGetir()
  if (oran === onceki.bakiye) return { iskonto: onceki, oran, bildirilen: 0 }

  const sonraki = iskontolariDuzenle({
    ...onceki,
    bakiye: oran,
    guncelleme: { tarih: Date.now(), personel: personel || '' },
  })
  icerikAlaniYaz('parcaIskontosu', sonraki)

  const degerler = { once: yuzdeYap(onceki.bakiye), simdi: yuzdeYap(oran) }
  const kimlikler = servisleriGetir().map((x) => x.id)
  for (const servisId of kimlikler) servisHesapBildir(servisId, 'bakiyeIskonto', degerler)

  /* İşlem kaydı cümlesi kardeşleriyle aynı yapıda (Codex, 24 Eylül
     2026): genelIskontoyuKaydet, servisIskontosunuKaydet. */
  islemYaz({
    tur: 'iskonto',
    ozet:
      `Bakiyeden ödemede ek iskonto güncellendi · %${degerler.once} → %${degerler.simdi}` +
      ` · ${kimlikler.length} servise bildirim gönderildi`,
    personel,
  })
  return { iskonto: sonraki, oran, bildirilen: kimlikler.length }
}

/* TOPLU GERİ ALMA YOK (18.09.2026, kullanıcının kararı): "Hem riskli hem
   de ne olduğu anlaşılmayan bir buton." Tek dokunuşla bütün düzeltmeleri
   silen bir düğme, ne sildiğini ekranda göstermiyordu. Düzeltmeler tek
   tek geri alınıyor; pasiflik düzeltme penceresinden kaldırılıyor. */

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
  /* KAPANMIŞ TALEBE KAYIT GÖNDERİLMİYOR (25 Eylül 2026, hak ediş reddi
     tasarım kararı). İşlev talebin durumuna hiç bakmıyor ve ekranın
     kopyasıyla çalışıyordu: ret anında Servisim'de açık kalmış bir kayıt
     ekranı, reddedilmiş (kapanmış) talebe yeni kayıt gönderebiliyordu.
     Durum "onay bekliyor"a dönüyor, reddedilen kayıt "önceki ziyaret"
     diye arşive gidiyordu; kesin olması gereken ret istenmeden bir
     "yeniden gönderme"ye dönüşüyordu (bkz. hakkedisReddet). Karar
     depodaki güncel kayıttan veriliyor. Müşteri "sorun devam ediyor"
     derse talep "yeni"ye dönüyor; yeni ziyaretin kaydı bu kapıdan geçer. */
  talep = guncelTalep(talep)
  if (KAPALI_DURUMLAR.includes(talep.status || 'yeni')) {
    return { hata: 'Bu iş kapandığı için kaydınız gönderilmedi. İşin son durumunu görmek için geri dönün.' }
  }

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
  /* PARÇA İSTEĞİ YAPILAN İŞ, YOL VE İŞÇİLİK TAŞIMIYOR (26 Eylül 2026,
     ikinci kullanıcı sınaması). 1. aşamada iş bitmedi; bu üçü sorulmuyor
     (lib/servisKaydi.js → kaydiDogrula). Ekran yine de formun durumundan
     gönderiyordu: yeniden açılan işte form geçen ziyaretin "Ayar Yapıldı
     · 20 km · 1 saat"iyle doluydu, parça isteği bu değerlerle yazıldı ve
     backoffice'e bu ziyaretinmiş gibi göründü. Sorulmayan sorunun cevabı
     kayda girmiyor; 2. aşama (`devam`) kendi değerleriyle üstüne yazıyor. */
  if (kayit.asama === ASAMA.parca) {
    const teslimat = teslimatTemizle(kayit.teslimat)
    if (!teslimat) return { hata: 'Teslimat adresini seçin.' }
    kayit = { ...kayit, teslimat, yapilanIs: '', km: 0, ...iscilikAlanlari(0, kayit.saatUcreti ?? undefined) }
  }

  /* ÜCRET KAYDA BURADA YAZILIYOR (23 Eylül 2026).

     Hizmet ücreti backoffice'ten değişiyor ve servise, makineye göre
     farklı olabiliyor (bkz. lib/servisTarifesi.js). Kayıt ücretini
     taşıyor; sonra tarife değişse de bu kayıt değişmiyor
     (hakkedisHesapla kaydın kendi ücretini okuyor).

     SERVİSİN ONAYLADIĞI ÜCRET GEÇER (24 Eylül 2026, kullanıcının
     kararı: "sipariş verildiği zamanki tutar üzerinden
     ücretlendirilmeli müşteri veya servis"). Servisim onay penceresinde
     "Hesabınıza eklenecek tutar"ı gösteriyor ve kayıt o tutarın
     ücretlerini (`kmUcreti`, `saatUcreti`) ve ekranın onları okuduğu
     anı (`ucretZamani`) taşıyor. PAKSAN ücreti tam o sırada
     değiştirdiyse servisin gördüğü ücret geçiyor. Önce ekranın ücreti
     sessizce bugünküyle değiştiriliyordu: servis 300 TL onaylıyor,
     hesabına 330 TL (ya da 270 TL) yazılıyordu.

     Bugünküyle tutmayan ücret iki şartla geçiyor: okuma anı taze
     (ONAY_TUTAR_SURESI, 30 dakika; bkz. lib/servisFiyat.js →
     onayTazeMi) ve ücret O ANDA o servisin o makinedeki ücretiydi
     (ücretin kısa geçmişinden, bkz. okunduguAnkiIcerik). Tutmazsa kayıt
     GÖNDERİLMİYOR, ekran yeni tutarı gösteriyor. Okuma anını taşımayan
     çağrı (eski ekran) eskisi gibi bugünkü ücretle kaydediliyor.

     Makine, ekranın kullandığı sırayla seçiliyor: kaydın kendi makinesi
     (servisin yazdığı şaseden), yoksa talebinki. Önce tersiydi; ikisi
     ayrışırsa ekran bir modelin ücretini gösterip veri katmanı
     ötekininkini yazıyordu.

     Yalnız garanti kaydının 2. aşamasında: parça istenirken yol ve
     işçilik sorulmuyor. Süresi olmayan eski biçimli kayıtta işçilik
     tutarına dokunulmuyor. */
  if (kayit.kapi === 'garanti' && kayit.asama !== ASAMA.parca) {
    const urunId = kayit.makine?.productId || talep.makine?.productId || null
    const tarife = servisinTarifesi(talep.servis?.id || null, urunId)
    const sureli = kayit.iscilikSaat !== undefined && kayit.iscilikSaat !== null
    const gorulenKm = Number(kayit.kmUcreti)
    const gorulenSaat = Number(kayit.saatUcreti)
    const gecerliSayi = (n) => Number.isFinite(n) && n >= 0
    const ayni = gorulenKm === tarife.yolKm && (!sureli || gorulenSaat === tarife.iscilikSaat)
    let ucret = tarife
    if (kayit.ucretZamani !== undefined && !ayni) {
      /* Bugünküyle tutmayan ücret ancak ekranın okuduğu anda GERÇEKTEN
         geçerliyse kabul ediliyor (bkz. okunduguAnkiIcerik). */
      const onayda = onayTazeMi(kayit.ucretZamani)
        ? tarifeCoz(
            tarifeleriDuzenle(okunduguAnkiIcerik('hizmetTarifesi', kayit.ucretZamani)),
            talep.servis?.id || null,
            urunId,
          )
        : null
      const taze =
        !!onayda &&
        gecerliSayi(gorulenKm) &&
        gorulenKm === onayda.yolKm &&
        (!sureli || (gecerliSayi(gorulenSaat) && gorulenSaat === onayda.iscilikSaat))
      if (!taze) {
        return {
          hata: 'Onay penceresi 30 dakikadan uzun açık kaldığı ve hizmet ücreti değiştiği için kayıt gönderilmedi. Ekrandaki tutar güncellendi; kontrol edip kaydı yeniden gönderin.',
          ucretDegisti: true,
        }
      }
      ucret = { yolKm: gorulenKm, iscilikSaat: sureli ? gorulenSaat : tarife.iscilikSaat }
    }
    kayit = {
      ...kayit,
      kmUcreti: ucret.yolKm,
      ...(sureli ? iscilikAlanlari(kayit.iscilikSaat, ucret.iscilikSaat) : {}),
    }
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
    /* `atamaDisi` (servisin elle açtığı işte makinenin o anki ataması,
       lib/elleTalep.js) yamada BİLEREK yok: işin açıldığı anın kaydı.
       Hak edişi onaylayan personel onu görüyor; kayıt gönderimi ve onay
       silmemeli (Y5, 25.09.2026). */
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
    /* Telefon tek biçimde (Y3, 25.09.2026): ham numara rakam, sıfırsız
       ve ülke kodsuz; görünen hâli ülke koduyla. Önce "0532…" diye düz
       rakam yazılıyor, ülke hiç yazılmıyordu; aynı müşteri ekranlarda
       üç biçimde görünüyor, müşteri kartında eşleşmiyordu. Servisim
       yalnız Türkiye'de çalışıyor. */
    const ham = telHamYap('TR', kayit.musteri.tel)
    yama.telHam = ham
    yama.telUlke = 'TR'
    yama.tel = telGoster('TR', ham)
  }
  if (!talep.adres && kayit.musteri?.adres) yama.adres = kayit.musteri.adres
  if (!talep.makine?.serial && kayit.makine?.serial) {
    /* Seri numarası olmadan açılmış talepte (ElleKayit → seriYok) servis
       şaseyi sahada bulduysa makine seriyle tamamlanıyor; tahmini yıl ve
       "seri yok" işareti artık doğru değil, düşüyor. */
    const { seriYok: _seriYok, tahminiYil: _tahminiYil, ...onceki } = talep.makine || {}
    yama.makine = { ...onceki, ...kayit.makine }
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
  /* Onaylanmış ya da reddedilmiş hak ediş düzeltilemiyor: tutarı
     değişir ama cari hareketi değişmezdi. */
  talep = guncelTalep(talep)
  if (talep.status !== 'onayBekliyor') return { hata: 'Bu talep onay beklemiyor.' }
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
        /* Süre de yazılıyor (22 Eylül 2026'dan beri işçilik süreyle
           soruluyor); servis "5 saat → 3 saat" satırını görüyor. Süresi
           olmayan eski kayıtta alan boş kalıyor, satır tutarı gösteriyor
           (bkz. lib/servisKaydi.js → duzeltmeYazisi). */
        onceki: {
          km: onceki.km,
          iscilik: onceki.iscilik,
          ...(onceki.iscilikSaat != null ? { iscilikSaat: onceki.iscilikSaat } : {}),
          parcalar: onceki.parcalar,
        },
        yeni: {
          km: yeniKayit.km,
          iscilik: yeniKayit.iscilik,
          ...(yeniKayit.iscilikSaat != null ? { iscilikSaat: yeniKayit.iscilikSaat } : {}),
          parcalar,
        },
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
  /* Servis kendi kaydının değiştiğini bilmeli: km, işçilik ya da parça
     değişti ve parası buna göre hesaplanacak. Gerekçe de gidiyor. */
  serviseBildir(talep, 'hakedisDuzelt', { neden: neden.trim() })
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
  talep = guncelTalep(talep)
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
      /* Talep numarası tekil değil (gün + dört rastgele hane); hareketi
         talebe kimlik bağlıyor. */
      talepId: talep.id,
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
  serviseBildir(talep, 'hakedisOnay', { tutar: hakkedis.toplam })
  return { hakkedis, durum }
}

/** Hak edişi reddeder; gerekçe servise görünüyor. */
/* RET KESİN (25 Eylül 2026, tasarım kararı; kullanıcı sınamasında
   personel reddi "düzeltip yeniden gönderin" diye kullanmıştı).
   "Servise geri gönder" yolu açılmadı:
     - Düzeltilebilir hatanın aracı zaten var: km, işçilik süresi ve
       parça hakkedisDuzelt ile PAKSAN tarafından, gerekçesi servise
       görünerek düzeltiliyor; eksik bilgi için onay beklerken iki yönlü
       not var.
     - Ret, PAKSAN'ın "bu işi ödemiyorum" kararı (garanti dışı,
       yapılmamış ya da mükerrer iş). Cari, garanti raporu ve servisin
       hesabı bu kararın kesin olmasına dayanıyor; üçüncü bir "geri
       gönderildi" hâli hepsine yeni bir durum öğretmeyi gerektirirdi.
     - Kaldıraç hak ediş: kesin ret, servisin kaydı ilk seferde doğru
       doldurmasını sağlıyor.
   Kapanmış talebe yeni kayıt gönderilemiyor (servisKaydiGonder başı).
   Müşteri "sorun devam ediyor" derse talep "yeni"ye dönüyor ve yeni
   ziyaret yeni kayıt açıyor; bu yol değişmedi. */
export function hakkedisReddet(talep, neden, personel) {
  /* Onaylanmış hak ediş sonradan reddedilemiyor: cari alacak yerinde
     kalır, kayıt "reddedildi" derdi. */
  talep = guncelTalep(talep)
  if (talep.status !== 'onayBekliyor') return { hata: 'Bu talep onay beklemiyor.' }
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
  serviseBildir(talep, 'hakedisRed', { neden: neden.trim() })
  return { tamam: true }
}

/**
 * Yedek parça personeli parçayı kargoya verdi (ya da kargo bilgisini
 * sonradan girdi / düzeltti).
 *
 * @returns {{tamam: true, guncelleme: boolean}|{hata: string}}
 *   guncelleme: sevk zaten vardı, bu çağrı kargo bilgisini değiştirdi
 */
export function servisParcasiGonderildi(talep, kargo, personel) {
  /* EKRANIN KOPYASI DEĞİL, DEPODAKİ KAYIT; PARÇA BEKLENMİYORSA YAZILMIYOR
     (25 Eylül 2026, kullanıcı sınaması O2). "Önceki sevk var mı" ekranın
     elindeki kopyadan okunuyordu: eski ekranla ikinci kayıt ilk sevkin
     tarihini ve personelini eziyor, servise ikinci bir "parça yolda"
     bildirimi gidiyordu. Servis parçayı takıp kaydı onaya gönderdikten
     sonra da sevk yazılabiliyordu. */
  talep = guncelTalep(talep)
  if (talep.status !== 'parcaBekliyor') {
    return { hata: 'Parça artık beklenmiyor; kargo bilgisi kaydedilmedi.' }
  }
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

     Masa, işin hâlâ parça biriminde olduğunu söylüyor (sunucuda
     MasaKodu). Formun ikinci açılışında her hâlükârda boşalıyor: numara
     girilmişse iş bitti, girilmemişse personel "böyle gidecek" demiş
     oluyor.

     LİSTELEME ARTIK MASAYA BAĞLI DEĞİL (25 Eylül 2026, O2). Önce masa
     boşalınca talep yedek parça personelinin listesinden düşüyor ve
     yanlış yazılmış numarayı düzeltmek isteyen kişi talebi bir daha
     bulamıyordu. Parça yoldayken işi `rolunTalepleri`'nin üçüncü kapısı
     gösteriyor. */
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
  serviseBildir(talep, onceki ? 'kargoGuncellendi' : 'parcaYolda', {
    firma: kargo?.firma || '',
    takipNo: kargo?.takipNo || '',
  })
  return { tamam: true, guncelleme: Boolean(onceki) }
}

/**
 * Müşterinin kapanmış parça talebine kargo bilgisini sonradan yazar.
 *
 * @returns {{tamam: true}|{hata: string}}
 */
/* KAPANIŞTAN SONRA KARGO BİLGİSİ (26 Eylül 2026, ikinci kullanıcı
   sınaması O2).

   Müşterinin parça talebinde kargo kapanış formunda soruluyor
   (talepKapat) ve iki kutu da isteğe bağlı: takip numarası çoğu zaman
   paket kargoya verildikten sonra geliyor. Talep kapandıktan sonra onu
   girmenin yolu yoktu; Yedek Parça rolünün yeniden açma izni yok, açılsa
   da kapanış bildirimi ikinci kez giderdi. Personel numarayı unutunca
   çiftçi takip numarasını hiç alamadı (YPR2609268517, "Kargo: Aras
   Kargo"). Servisin garanti parçasında aynı iş servisParcasiGonderildi'nin
   ikinci çağrısı; bu onun müşteri tarafı.

   Talep KAPALI KALIYOR, yalnız `parcaSevk` değişiyor. İlk gönderimin
   tarihi ve personeli korunuyor, düzelten ayrıca yazılıyor. Müşteriye
   kargo bilgisini taşıyan tek bildirim gidiyor. Karar depodaki kayıttan. */
export function musteriKargosunuGuncelle(talep, kargo, personel) {
  talep = guncelTalep(talep)
  if (!talep || talep.tur !== 'parca' || talep.servisSiparisi || talep.status !== 'kapandi') {
    return { hata: 'Kargo bilgisi yalnızca parçası kargoya verilmiş müşteri taleplerinde değiştirilebilir.' }
  }
  const firma = String(kargo?.firma || '').trim()
  const takipNo = String(kargo?.takipNo || '').trim()
  if (!firma && !takipNo) return { hata: 'Kargo firmasını ya da takip numarasını yazın.' }
  const onceki = talep.parcaSevk || null
  if (onceki && (onceki.firma || '') === firma && (onceki.takipNo || '') === takipNo) {
    return { hata: 'Kargo bilgisi değişmedi.' }
  }
  const simdi = Date.now()
  talepYaz(talep.id, {
    parcaSevk: {
      firma,
      takipNo,
      tarih: onceki?.tarih || talep.cozum?.tarih || simdi,
      personel: onceki?.personel || talep.cozum?.personel || personel,
      guncelleme: simdi,
      guncelleyen: personel,
    },
  })
  const kargoYazi = [firma, takipNo].filter(Boolean).join(' · ')
  islemYaz({ tur: 'sevk', ozet: `${talep.no} · kargo bilgisi güncellendi · ${kargoYazi}`, personel })
  musteriyeBildir({
    musteriId: bildirimAlicisi(talep),
    tur: 'talep',
    baslikAnahtar: 'bildirimler.kargoGuncellendiBaslik',
    metinAnahtar: 'bildirimler.kargoGuncellendiMetin',
    degerler: { no: talep.no, talepTur: talep.tur, kargo: kargoYazi },
    talepNo: talep.no,
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

   KAYDI KURMAK AYRI, YAZMAK AYRI (29 Eylül 2026). Denetim ve kaydın
   kendisi `servisSiparisKaydi`nde; hiçbir şey yazmıyor. Servisim'in
   demo verisi (backoffice/demoSahne.js) siparişi o gövdeyle kurup demo
   deposuna yazıyor: demo siparişi gerçek siparişin kapılarından
   geçiyor (bakiye, oran, teslimat) ama müşterinin ortak listesine
   (`requests`) düşmüyor. Yazan tek yol aşağıdaki servisParcaSiparisi.
   ========================================================================== */
export function servisParcaSiparisi(girdi) {
  const sonuc = servisSiparisKaydi(girdi)
  if (sonuc.hata) return sonuc
  const { talep } = sonuc
  save(ANAHTAR.talepler, [talep, ...load(ANAHTAR.talepler, [])])
  islemYaz({
    tur: 'talep',
    ozet: `${talep.no} · servis parça siparişi · ${talep.servis.ad} · ${talep.parcalar.length} kalem`,
    personel: talep.servis.ad,
  })
  return { talep }
}

/**
 * Servis siparişinin kaydını kurar ve denetler; hiçbir yere yazmaz.
 * @returns {{talep: object}|{hata: string}}
 */
export function servisSiparisKaydi({
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
  if (!teslimYazi) return { hata: 'Teslimat adresini seçin.' }

  /* Satırları olmayan bir görüntü kaydedilmiyor: okuyan ekranlar
     `parcaFiyat`ın varlığını "fiyat yazılı" diye anlıyor (bkz.
     ekranlar/Talepler.jsx → BeklenenTutar). Boş bir nesne, tutarı
     bilinmeyen siparişi tutarı sıfır gibi gösterirdi. */
  const goruntu =
    parcaFiyat && Array.isArray(parcaFiyat.satirlar) && parcaFiyat.satirlar.length
      ? parcaFiyat
      : null

  /* SERVİSİN ONAYLADIĞI ORAN GEÇER (24 Eylül 2026, kullanıcının
     kararı: "sipariş verildiği zamanki tutar üzerinden
     ücretlendirilmeli").

     Oran backoffice'ten değişiyor (genel ya da servise özel, bkz.
     parcaIskontosuGetir). Görüntü, servisin onay penceresinde gördüğü
     oranı (`iskontoOrani`) ve ekranın onu okuduğu anı (`fiyatZamani`)
     taşıyor. PAKSAN oranı tam o sırada değiştirdiyse sipariş yine
     SERVİSİN GÖRDÜĞÜ oranla kaydediliyor — ister lehine ister aleyhine.

     Önce tersiydi (23 Eylül): bugünkü oranla tutmayan sipariş
     reddediliyor, ekran yeni tutarı gösterip yeniden onay istiyordu.
     Şimdi bugünküyle tutmayan oran iki şartla geçiyor: okuma anı taze
     (ONAY_TUTAR_SURESI, 30 dakika; bkz. lib/servisFiyat.js →
     onayTazeMi) ve oran O ANDA gerçekten geçerliydi (ücretin kısa
     geçmişinden, bkz. okunduguAnkiIcerik). İkisinden biri tutmazsa
     sipariş kaydedilmiyor, ekran yeni tutarı gösteriyor. Ekran okuma
     anını hiç yazmadıysa (eski çağrı) oran bugünküyle tutmalı. Oranı
     taşımayan eski çağrılara dokunulmuyor.

     Sunucu istemcinin oranına güvenmeyecek; onay penceresi açılırken
     kendi verdiği süreli fiyat teklifine bakacak (VT-TASARIM-EKLERI §9). */
  const oranDegisti = {
    hata: 'Onay penceresi 30 dakikadan uzun açık kaldığı ve indirim oranınız değiştiği için sipariş kaydedilmedi. Tutarlar güncellendi; sipariş özetini kontrol edip yeniden gönderin.',
    iskontoDegisti: true,
  }
  /* Bugünküyle tutmayan değer ancak ekranın okuduğu anda GERÇEKTEN
     geçerliyse kabul ediliyor (bkz. okunduguAnkiIcerik). */
  const onaydakiOranlar =
    goruntu && onayTazeMi(goruntu.fiyatZamani)
      ? iskontolariDuzenle(okunduguAnkiIcerik('parcaIskontosu', goruntu.fiyatZamani))
      : null
  if (goruntu && goruntu.iskontoOrani !== undefined) {
    const gorulen = oranOku(goruntu.iskontoOrani)
    if (gorulen === null) return oranDegisti
    const gecerli = servisinIskontosu(servisId).oran
    const onaydaGecerli = onaydakiOranlar && gorulen === iskontoCoz(onaydakiOranlar, servisId).oran
    if (gorulen !== gecerli && !onaydaGecerli) return oranDegisti
  }

  /* BAKİYEDEN ÖDEMEDE EK İSKONTO: AYNI KURAL (24 Eylül 2026).

     Bakiyeden ödenen siparişin taşıdığı ek oran (taşımayan görüntü 0
     sayılıyor) servisin onayda gördüğü oran; tutar tazeyse ve oran
     okunduğu anda geçerliyse bugünkü oranla tutmasa da geçiyor. PAKSAN
     ek iskontoyu tam o sırada açtı ya da kapattıysa da öyle.

     FATURAYLA ÖDENEN SİPARİŞ EK İSKONTO TAŞIYAMAZ — bu bir tazelik
     sorunu değil, kuralın kendisi: ek iskonto yalnız bakiyeden ödemenin
     karşılığı. Ekran bunu hiç göndermiyor; gelirse bozuk ya da
     kurcalanmış bir çağrıdır. Kendi uyarısı var, "oran değişti" demiyor. */
  if (goruntu) {
    const tasinan = oranOku(goruntu.bakiyeIskontoOrani ?? 0)
    if (tasinan === null) return oranDegisti
    if (odeme !== 'bakiye' && tasinan > 0) {
      return {
        hata: 'Sipariş kaydedilmedi; tutarlar güncellendi. Sipariş özetini kontrol edip yeniden gönderin.',
        iskontoDegisti: true,
        faturayaEkIndirim: true,
      }
    }
    if (
      odeme === 'bakiye' &&
      tasinan !== bakiyeIskontosuGetir() &&
      !(onaydakiOranlar && tasinan === bakiyeIskontosu(onaydakiOranlar))
    ) {
      return oranDegisti
    }
  }

  /* TUTAR TEK YERDEN: kaydedilen görüntüden. Ayrıca gelen `tutar` ve
     `tutarKdvli` yalnız görüntüsü olmayan çağrılar için duruyor.
     KDV elle çarpılmıyor — oranı ve "liste KDV hariç mi" kararını
     `kdvTutari` biliyor (bkz. marka/katalog/para.js). */
  const araToplam = Number(goruntu ? goruntu.araToplam : tutar) || 0
  const kdvliToplam =
    Number(goruntu ? goruntu.toplam : tutarKdvli) || araToplam + kdvTutari(araToplam)

  /* BAKİYE YETMELİ — GÖNDERİLMEYİ BEKLEYEN SİPARİŞLER DÜŞÜLEREK
     (24 Eylül 2026, bkz. bakiyeDurumu). Ekran seçeneği zaten kapatıyor;
     bu kapı ekranı atlayan ya da iki cihazdan aynı anda verilen sipariş
     için. Önce hiç bakılmıyordu. Kural ekranın "bakiye yetmiyor"
     cümlesiyle ve "yeter" kararıyla tek işlevden (lib/servisFiyat.js →
     bakiyeYetmiyor; 25 Eylül 2026, inceleme: burada ayrı bir kopya
     duruyordu, sınır değişse ikisi ayrışırdı). */
  if (odeme === 'bakiye' && bakiyeYetmiyor(bakiyeDurumu(servisId).kullanilabilir, kdvliToplam)) {
    return {
      hata: 'Kullanılabilir bakiyeniz bu sipariş için yeterli değil. Gönderilmeyi bekleyen siparişlerinizin tutarı bakiyenizden ayrıldı. Faturayla ödemeyi seçin.',
      bakiyeYetmiyor: true,
    }
  }

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
       Karar burada kaydediliyor, PARA BURADA İŞLENMİYOR: sipariş henüz
       onaylanmadı. Tutar ise bugünden bağlayıcı (24 Eylül 2026): düşüm,
       parça gönderilip talep kapandığında bu kayıttaki tutarla yapılıyor
       (bkz. talepKapat). */
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
  if (!o?.servisId) return null

  /* PANELİ KAPATILAN YA DA LİSTEDEN SİLİNEN SERVİSİN OTURUMU DÜŞÜYOR
     (25 Eylül 2026, kullanıcı sınaması O6). Önce yalnız oturumun varlığına
     bakılıyordu; PAKSAN servisin hesabını kapatsa da açık uygulama
     çalışmaya devam ediyordu. Girişteki kuralın aynısı (servisGirisi):
     yalnız açıkça kapatılmış hesap reddediliyor, alanı hiç yazılmamış
     servis açık sayılıyor. */
  const kayit = servisleriGetir().find((b) => b.id === o.servisId)
  if (!kayit || kayit.panelAktif === false) {
    oturumSil(ANAHTAR.servisOturum)
    return null
  }
  return o
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
  /* Oturum OTURUM DEPOSUNDA (sessionStorage). Burada kalıcı depoya
     yazılıyordu; servisOturumuGetir o kopyayı silip oturum deposunu
     okuduğu için `ilkGiris: true` kalıyor ve sayfa yenilenince şifre
     ekranı yeniden açılıyordu (24 Eylül 2026). */
  const o = servisOturumuGetir()
  if (o?.servisId === servisId) oturumKaydet(ANAHTAR.servisOturum, { ...o, ilkGiris: false })
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
   Logo bağlıysa satırda faturanın kesildiği bayi de yazıyor; bağlı
   değilse o alan boş kalıyor (bkz. src/lib/logo.js).

   Okuma lib/makineKaydi.js'ten: bir seriye tek satır düşüyor ve eski
   kopyalar orada birleşiyor (21 Eylül 2026). Depoya doğrudan bakılsaydı
   Kayıtlı Makineler aynı makineyi yine iki kez gösterirdi.           */

export function makineKayitlariGetir() {
  return makineKayitlari()
}

/* MAKİNENİN BAYİSİ YA DA SERVİSİ DEĞİŞTİ — Kayıtlı Makineler ekranından.

   MÜŞTERİYE BİLDİRİM (21 Eylül 2026, kullanıcının isteği): "Müşteriye
   ait makineye servis atandığında PAKSAN Connect uygulamasında
   müşteriye bildirim gitmeli." Servisi olmayan makinenin sahibi talep
   açamıyor ve uygulama ona "PAKSAN en kısa sürede atayacak" diyor; o
   sözün tutulduğunu müşteri ancak bildirimle öğreniyor.

   NE ZAMAN GİDİYOR: makineye bakan servis — `kaydinServisi`'nin cevabı,
   müşterinin uygulamasının da okuduğu — gerçekten DEĞİŞTİYSE. Bu yüzden
   bayi değişikliği de bildirim doğurabiliyor: bayinin servisi makineye
   geçiyor. Servis aynı kaldıysa (bayinin servisi ile doğrudan atanan
   aynı servisse) sessiz.

   BİLDİRİM MAKİNENİN GÜNCEL DURUMUNU SÖYLÜYOR (25 Eylül 2026, kullanıcı
   sınaması). Personel yanlış servisi seçip düzeltince çiftçinin
   listesinde "artık A bakacak" ve "artık B bakacak" yan yana kalıyor,
   hangisinin geçerli olduğunu hiçbir şey söylemiyordu. Atama
   kaldırılınca hiç bildirim gitmiyordu: listede en son yanlış servis
   kalıyor, çiftçi onu arıyordu. Şimdi:
     - ilk atamada "atandı", önce başka servis bakıyorduysa "değişti"
       (yanlış atamanın düzeltmesi de bayi değişikliği de böyle okunuyor)
     - makinenin servisi kalmayınca "yeniden belirleniyor": eski
       bildirimi geçersiz kılabilen tek şey yeni bir bildirim; telefona
       düşmüş anlık bildirim geri alınamıyor
     - Connect aynı makinenin yalnız SON atama bildirimini gösteriyor
       (lib/bildirimler.js); eskisi silinmiyor, listeden düşüyor.

   KİME: satırdaki hesaba. Hesapsız satırda (servisin elle açtığı, sahibi
   uygulamayı kullanmayan makine) kimse yok; bildirim yazılmıyor.

   Metin değil anahtar saklanıyor, müşterinin dilinde çıksın diye
   (bkz. musteriyeBildir). Model adı ve servis adı özel ad; çevrilmiyor. */
export function makineAtamasiniKaydet(kayitId, yama, { ozet, personel } = {}) {
  const once = makineKayitlari().find((k) => k.id === kayitId)
  if (!once) return null
  const onceki = kaydinServisi(once)?.servis?.id || null

  const sonra = makineKaydiGuncelle(kayitId, yama)
  islemYaz({ tur: 'makine', ozet, personel })

  const yeni = kaydinServisi(sonra)?.servis || null
  if (!sonra.musteriId || (yeni?.id || null) === onceki) return sonra

  const degerler = {
    makine: getProduct(sonra.productId)?.name || '',
    seri: formatSerial(sonra.seri),
  }
  musteriyeBildir(
    yeni
      ? {
          musteriId: sonra.musteriId,
          tur: 'makine',
          baslikAnahtar: onceki ? 'bildirimler.servisDegistiBaslik' : 'bildirimler.servisAtandiBaslik',
          metinAnahtar: 'bildirimler.servisAtandiMetin',
          degerler: { ...degerler, servis: yeni.ad },
        }
      : {
          musteriId: sonra.musteriId,
          tur: 'makine',
          baslikAnahtar: 'bildirimler.servisKaldirildiBaslik',
          metinAnahtar: 'bildirimler.servisKaldirildiMetin',
          degerler,
        },
  )
  return sonra
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

     Karar tarayıcıya değil, çalışan derlemeye ait (src/lib/urun.js).

     Backoffice'te önce BU SEKMENİN oturumu (25 Eylül 2026, O6): kalıcı
     depodaki son giriş başka sekmenin kişisi olabilir. Kalıcı depo
     yalnız sekmenin oturumu hiç yoksa yedek, o da yalnız işlem aynı
     kişi adına yazılıyorsa (ya da ad verilmediyse). Giriş ekranındaki
     "Şifremi unuttum" isteği sekmesi oturumsuz bir personelin işlemi;
     tarayıcıdaki son giriş başka birininse onun rolü bu kayda yazılmaz.

     ROL VE AD PERSONEL KAYDINDAN (25 Eylül 2026, inceleme). Oturumun
     taşıdığı rol girişteki kopya; rolü sonradan değişen kişinin ekranı
     yeni rolle çalışırken (oturumGetir) işlem kaydı eski rolü
     yazıyordu. Rol, oturumun personel kimliğiyle kayıttan okunuyor. */
  const serviste = urun() === 'servis'
  let oturum = serviste ? oturumYukle(ANAHTAR.servisOturum, null) : oturumYukle(ANAHTAR.oturum, null)
  const kaydi = (o) => (o?.personelId ? personelGetir().find((p) => p.id === o.personelId) : null)
  if (!serviste && !oturum) {
    const son = load(ANAHTAR.oturum, null)
    if (son && (!personel || personel === (kaydi(son)?.ad || son.ad))) oturum = son
  }
  const kisi = serviste ? null : kaydi(oturum)
  const kayit = {
    id: uid(),
    tarih: Date.now(),
    tur,
    ozet,
    personel: personel || kisi?.ad || oturum?.ad || '—',
    rol: rol || (serviste ? 'servis' : kisi?.rol || oturum?.rol) || null,
  }
  save(ANAHTAR.islemKaydi, [kayit, ...islemKaydiGetir()].slice(0, 500))
  return kayit
}
