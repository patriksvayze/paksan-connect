/* ==========================================================================
   Backoffice’in veri katmanı

   Bütün ekranlar veriye yalnız buradan ulaşıyor. Şu an veri tarayıcının
   hafızasında; sunucu geldiğinde bu dosyadaki fonksiyonların içi sunucu
   çağrısıyla değişecek, ekranlara dokunulmayacak.
   ========================================================================== */

import { load, save, uid } from '../lib/storage'
import { sifreHazirla, sifreDogruMu, sifreGecerliMi } from '../lib/hesap'
import { yeniNo } from '../lib/numara'
import { SIRKET } from '../config'
import { urun } from '../lib/urun'
import { bayileriGetir } from '../data/bayiler.js'
import { icerikTazele } from '../lib/icerikDeposu.js'

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
     kapanır ve girilmiş bayi listesi kaybolur. Sunucuya geçilirken bu
     veriler taşınacağı için o zaman düzeltilecek. */
  icerik: 'panelIcerik',
  islemKaydi: 'islemKaydi',
  oturum: 'panelOturum',
  bayiOturum: 'bayiOturum',
  personel: 'personel',
  numaraTalepleri: 'numaraTalepleri',
  sifreTalepleri: 'sifreTalepleri',
  /* Bayinin "şifremi unuttum" kaydı. Personelinkinden ayrı: bayide
     e-posta yok, akış telefonla yürüyor. */
  bayiSifreTalep: 'bayiSifreTalep',
  destekLog: 'destekLog',

  /* Demo kayıtları uygulamanın kendi kayıtlarından ayrı duruyor:
     backoffice’te görünüyor ama müşterinin telefonuna karışmıyor. */
  demoMusteriler: 'demoMusteriler',
  demoTalepler: 'demoTalepler',
}

/* ------------------------------------------------------------------ Roller

   Uygulamada üç tür talep açılıyor ve her birine şirkette başka bir ekip
   bakıyor. Backoffice’e giren kişi bölümünü kendisi seçmiyor — hesabı admin
   açarken hangi rolde olduğu belirleniyor.

   Admin ve yönetici bütün talepleri görüyor. Aralarındaki fark yetkide:
   personel hesabı açmak, müşteri bilgisi değiştirmek ve numara
   değişikliği onaylamak yalnız adminde.                                 */

export const ROLLER = [
  { id: 'admin', ad: 'Admin', talepTuru: null },
  { id: 'yonetici', ad: 'Yönetici', talepTuru: null },
  { id: 'servis', ad: 'Servis', talepTuru: 'servis' },
  { id: 'parca', ad: 'Yedek Parça', talepTuru: 'parca' },
  { id: 'satis', ad: 'Satış', talepTuru: 'satinalma' },
]

export function rolBilgi(id) {
  return ROLLER.find((r) => r.id === id) || ROLLER[2]
}

const IZINLER = {
  admin: [
    'talepler', 'numara', 'musteriler', 'bayiler', 'personel', 'geribildirim',
    'raporlar', 'kayit', 'duyurular', 'destek',
    'personelDuzenle', 'musteriDuzenle', 'bayiDuzenle',
  ],
  yonetici: [
    'talepler', 'musteriler', 'bayiler', 'personel', 'geribildirim',
    'raporlar', 'kayit', 'duyurular', 'destek', 'bayiDuzenle',
  ],
  /* Geri bildirimler ekibe kapalı: orası uygulamanın gelişimi için,
     günlük işin parçası değil. */
  servis: ['talepler', 'musteriler', 'bayiler'],
  parca: ['talepler', 'musteriler', 'bayiler'],
  /* Satış personeli bayinin sorumluluk bölgesini değiştirebilmeli:
     bayi ağını tanıyan, hangi bayinin nereye baktığını bilen o. */
  satis: ['talepler', 'musteriler', 'bayiler', 'bayiDuzenle'],
}

/** Bu roldeki kişi bu işi yapabiliyor mu? */
export function izinli(rol, is) {
  return (IZINLER[rol] || []).includes(is)
}

/** Rolün göreceği talepler; admin ve yöneticide hepsi. */
export function rolunTalepleri(liste, rol) {
  const tur = rolBilgi(rol).talepTuru
  return tur ? liste.filter((t) => t.tur === tur) : liste
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
  { id: 'kapandi', ad: 'Kapandı', ton: 'yesil' },
  { id: 'iptal', ad: 'İptal', ton: 'gri' },
]

/* Kapalı = üzerinde iş kalmamış. Not eklemek kapalı talepte de
   serbest. */
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
export function talepDurumlari(tur) {
  if (tur === 'satinalma') return DURUMLAR.filter((d) => d.id !== 'planlandi')
  return DURUMLAR.filter((d) => d.id !== 'teklif')
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
function talepYaz(id, degisiklik) {
  const depo = load(ANAHTAR.talepler, []).some((t) => t.id === id)
    ? ANAHTAR.talepler
    : ANAHTAR.demoTalepler
  save(
    depo,
    load(depo, []).map((t) => (t.id === id ? { ...t, ...degisiklik } : t))
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
    tur: 'talep',
    baslikAnahtar: 'bildirimler.durumBaslik',
    metinAnahtar: 'bildirimler.durum_' + yeniDurum,
    degerler: { no: talep.no, durum: yeniDurum, talepTur: talep.tur },
    talepNo: talep.no,
  })
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
export function talepNotEkle(talep, metin, personel, { musteriye = false } = {}) {
  const not = { metin, tarih: Date.now(), personel, musteriye }
  const notlar = [...(talep.notlar || []), not]
  talepYaz(talep.id, { notlar })

  islemYaz({
    tur: 'not',
    ozet: `${talep.no} · ${musteriye ? 'müşteriye not gönderildi' : 'iç not eklendi'}`,
    personel,
  })

  if (!musteriye) return

  /* Personelin yazdığı cümle olduğu gibi gidiyor — çeviremeyiz.
     Başlık sözlükten geliyor, o müşterinin dilinde çıkıyor. */
  musteriyeBildir({
    tur: 'talep',
    baslikAnahtar: 'bildirimler.notBaslik',
    degerler: { no: talep.no, talepTur: talep.tur },
    metin,
    talepNo: talep.no,
  })
}

/* Müşterinin Bildirimler ekranına düşen kayıt.

   Metin değil ANAHTAR saklanıyor: backoffice Türkçe ama müşteri uygulamayı
   İngilizce kullanıyor olabilir. Anahtar saklanınca yazı müşterinin
   kendi dilinde çıkıyor. Personelin elle yazdığı cevaplarda `metin`
   doğrudan gidiyor — o cümleyi çeviremeyiz.

   Dışa açık: bayi paneli de aynı kapıdan yazıyor (fiyat teklifi
   gönderildiğinde). İkinci bir bildirim deposu açmak, müşterinin
   ekranında iki ayrı liste demekti. */
export function musteriyeBildir(bildirim) {
  save(ANAHTAR.duyurular, [
    { id: uid(), tarih: Date.now(), ...bildirim },
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

  /* YEDEK PARÇADA KAPANIŞ = KARGOYA VERİLDİ.

     Bildirim de ona göre yazılıyor: takip numarası girildiyse
     müşteri uygulamayı açmadan, bildirimin içinde görüyor. Eskiden
     bu iş ayrı bir "Gönderildi" durumundan çıkıyordu; o durum
     kaldırıldı (bkz. DURUMLAR). */
  const parcaGonderimi = talep.tur === 'parca'
  musteriyeBildir({
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
export function parcaIlerlemeEngeli(talep, yeniDurum) {
  if (talep.tur !== 'parca') return null
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

export function duyuruYayinla({ tur, baslik, metin, gorsel, hedef }, personel) {
  /* Hedef boşsa alan hiç yazılmıyor: yokluk "herkese" demek
     (bkz. src/lib/duyuruHedef.js). Boş dizilerle dolu bir nesne
     yazmak da aynı sonucu verirdi ama kayıt gereksiz şişerdi. */
  const doluHedef =
    hedef && Object.values(hedef).some((v) => (Array.isArray(v) ? v.length : v && v !== 'musteri'))

  const kayit = {
    id: uid(),
    tarih: Date.now(),
    tur,
    baslik: baslik.trim(),
    metin: metin.trim(),
    /* Görselin kendisi IndexedDB'de, burada yalnız kimliği —
       eklerle aynı yol (bkz. src/lib/ekler.js). */
    gorsel: gorsel || null,
    personel,
    /* Uygulamada açılışta pencere olarak çıksın */
    pencere: true,
    ...(doluHedef ? { hedef } : {}),
  }
  save(ANAHTAR.duyurular, [kayit, ...load(ANAHTAR.duyurular, [])])
  islemYaz({
    tur: 'duyuru',
    ozet: `${tur === 'uyari' ? 'Uyarı' : 'Duyuru'} yayınlandı · ${kayit.baslik}`,
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

/** Talepteki seri no müşterinin kayıtlı makinelerinden biri mi? */
export function seriDogruMu(talep) {
  const seriler = (talebinMusterisi(talep)?.makineler || []).map((m) =>
    String(m.serial || '').replace(/\D/g, '')
  )
  const girilen = String(talep.seri || '').replace(/\D/g, '')
  return Boolean(girilen) && seriler.includes(girilen)
}

/** Talepteki eski numara hesaptaki numarayla aynı mı? */
export function numaraDogruMu(talep) {
  const kayitli = String(talebinMusterisi(talep)?.tel || '').replace(/\D/g, '')
  const girilen = String(talep.eskiTel || '').replace(/\D/g, '')
  if (!kayitli || !girilen) return false
  return girilen.endsWith(kayitli) || kayitli.endsWith(girilen)
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
      tur: 'numara',
      baslikAnahtar: 'bildirimler.numaraBaslik',
      metinAnahtar: 'bildirimler.numaraOnay',
      degerler: {},
    })
  } else {
    musteriyeBildir({
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

  musteriyeBildir({
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

/* ----------------------------------------------------------------- Bayiler */

export function bayileriGetirBackoffice() {
  return load(ANAHTAR.icerik, {}).bayiler || null
}

/* `tur` genelde 'bayi' (liste değişikliği). Şifre işlemleri kendi
   türünü veriyor: bayi kendi şifresini değiştirdiğinde kayıt "Bayi
   listesi" başlığı altında görünüyordu, oysa listeye dokunulmuyor. */
export function bayileriYaz(liste, personel, ozet, tur = 'bayi') {
  const mevcut = load(ANAHTAR.icerik, {})
  save(ANAHTAR.icerik, { ...mevcut, bayiler: liste })
  /* Okuyan taraf listeyi bellekte tutuyor; tazelenmezse aynı sayfada
     eski liste okunmaya devam ediyor (bkz. icerikDeposu.js). */
  icerikTazele()
  islemYaz({ tur, ozet, personel })
}

export function bayileriSifirla(personel) {
  const mevcut = { ...load(ANAHTAR.icerik, {}) }
  delete mevcut.bayiler
  save(ANAHTAR.icerik, mevcut)
  icerikTazele()
  islemYaz({ tur: 'bayi', ozet: 'Bayi listesi koddaki listeye döndürüldü', personel })
}

/* ------------------------------------------------------- Bayi ve sahiplik

   Talep oluşurken bir bayiye yazılıyor (bkz. AppState.jsx). İki alan
   var ve ikisi farklı soruları cevaplıyor:

     talep.bayi   → hangi bayinin müşterisi. BİR DAHA DEĞİŞMİYOR.
     talep.sahip  → şu an kim ilgileniyor: 'bayi' veya 'paksan'.

   Bayi yetersiz kalıp PAKSAN'dan destek istediğinde yalnız `sahip`
   değişiyor. `bayi` sabit kaldığı için bayi, PAKSAN'ın attığı adımları
   görmeye devam ediyor — müşteri onun müşterisi olmaya devam ediyor.

   PAKSAN personeli talep bayideyken de görüyor ve müdahale edebiliyor.
   Müdahale ettiğinde `gecmis[]`'e düşüyor, bayi de görüyor. Yetki
   kilidi konmadı: iş tanımı "PAKSAN izler ve gerektiğinde yönlendirir"
   diyor, kilit kimsenin istemediği bir engel olurdu.                 */

/** Bu bayiye düşen talepler. */
export function bayininTalepleri(liste, bayiId) {
  return liste.filter((t) => t.bayi?.id === bayiId)
}

/** Bayi PAKSAN'dan destek istiyor; sorumluluk PAKSAN'a geçiyor. */
export function destekTalepEt(talep, neden, bayiAd) {
  /* Talep hâlâ "yeni" ise incelemeye alınıyor: PAKSAN'ın yeni talep
     kutusunda çakılı kalmasın, personel bildirimi düşsün. Ödeme
     onayındaki kalıbın aynısı. */
  const durum = talep.status === 'yeni' ? 'incelemede' : talep.status
  talepYaz(talep.id, {
    sahip: 'paksan',
    devir: { tarih: Date.now(), neden: neden || '', bayiAd },
    status: durum,
    gecmis: [...(talep.gecmis || []), { durum, tarih: Date.now(), personel: bayiAd }],
  })
  islemYaz({
    tur: 'devir',
    ozet: `${talep.no} · ${bayiAd} PAKSAN'dan destek istedi`,
    personel: bayiAd,
    rol: 'bayi',
  })
  /* Müşteriye bildirim gitmiyor: onun açısından değişen bir şey yok,
     muhatabı hâlâ bayi. */
}

/* ------------------------------------------------------------- Bayi girişi

   Bayi paneli ayrı bir derleme ama bayi kaydı ayrı bir varlık değil:
   bayi kaydı ile bayi hesabı aynı şey. İkiye bölmek, iki yerde senkron
   tutulacak liste demek olurdu.

   Hesabı PAKSAN açıyor. Bayi kendi kaydını oluşturamıyor, şifresini
   unutursa da PAKSAN'ı arıyor — hesap silme ve numara değişikliğinde
   uygulanan kuralın aynısı.

   `ILK_ADMIN` kalıbı burada TEKRARLANMIYOR: bilinen kullanıcı adı ve
   şifreyle kendiliğinden açılan hesap yok. Hesabı olmayan bayi
   giremiyor.                                                         */

/** Bayiye panel hesabı tanımlar veya şifresini yeniler. */
export async function bayiHesabiYaz(bayiId, { kullanici, sifre }, personel) {
  const ad = String(kullanici || '').trim().toLocaleLowerCase('tr-TR')
  if (!ad) return { hata: 'Kullanıcı adı boş olamaz.' }
  if (sifre && !sifreGecerliMi(sifre)) {
    return { hata: `Şifre ${BACKOFFICE_SIFRE_HANE} rakamdan oluşmalı.` }
  }

  const liste = bayileriGetir()
  const hedef = liste.find((b) => b.id === bayiId)
  if (!hedef) return { hata: 'Bayi bulunamadı.' }

  const cakisma = liste.find((b) => b.id !== bayiId && b.kullanici === ad)
  if (cakisma) return { hata: `Bu kullanıcı adı ${cakisma.ad} için zaten kullanılıyor.` }

  const yeniSifre = sifre ? await sifreHazirla(sifre) : hedef.sifre
  if (!yeniSifre) return { hata: 'İlk hesap açılışında şifre gereklidir.' }

  const yeni = liste.map((b) =>
    b.id === bayiId
      ? { ...b, kullanici: ad, sifre: yeniSifre, panelAktif: true, ilkGiris: Boolean(sifre) }
      : b,
  )
  bayileriYaz(
    yeni,
    personel,
    `${hedef.ad} için panel hesabı ${hedef.kullanici ? 'güncellendi' : 'açıldı'}`,
  )
  return { tamam: true }
}

/** Bayinin panel hesabını kapatır; kayıt ve geçmiş duruyor. */
export function bayiHesabiKapat(bayiId, personel) {
  const liste = bayileriGetir()
  const hedef = liste.find((b) => b.id === bayiId)
  if (!hedef) return { hata: 'Bayi bulunamadı.' }
  bayileriYaz(
    liste.map((b) => (b.id === bayiId ? { ...b, panelAktif: false } : b)),
    personel,
    `${hedef.ad} için panel hesabı kapatıldı`,
  )
  return { tamam: true }
}

export async function bayiGirisi(kullanici, sifre) {
  const ad = String(kullanici || '').trim().toLocaleLowerCase('tr-TR')
  const kayit = bayileriGetir().find((b) => b.kullanici === ad)

  if (!kayit) return { hata: 'Kullanıcı adı veya şifre yanlış.' }
  if (kayit.panelAktif === false) {
    return { hata: 'Bu hesap kapalı. PAKSAN yetkilinize başvurun.' }
  }
  if (!(await sifreDogruMu(sifre, kayit.sifre))) {
    return { hata: 'Kullanıcı adı veya şifre yanlış.' }
  }

  const oturum = {
    bayiId: kayit.id,
    no: kayit.no,
    ad: kayit.ad,
    il: kayit.il,
    ilkGiris: Boolean(kayit.ilkGiris),
    giris: Date.now(),
  }
  save(ANAHTAR.bayiOturum, oturum)
  islemYaz({ tur: 'oturum', ozet: 'Bayi paneline giriş', personel: kayit.ad, rol: 'bayi' })
  return { oturum }
}

export function bayiOturumuGetir() {
  const o = load(ANAHTAR.bayiOturum, null)
  return o?.bayiId ? o : null
}

export function bayiOturumuKapat(o) {
  islemYaz({ tur: 'oturum', ozet: 'Bayi panelinden çıkış', personel: o?.ad, rol: 'bayi' })
  save(ANAHTAR.bayiOturum, null)
}

/** Bayi ilk girişte kendi şifresini belirliyor. */
export async function bayiSifresiniDegistir(bayiId, yeniSifre, eskiSifre) {
  if (!sifreGecerliMi(yeniSifre)) {
    return { hata: `Şifre ${BACKOFFICE_SIFRE_HANE} rakamdan oluşmalı.` }
  }
  const liste = bayileriGetir()
  const hedef = liste.find((b) => b.id === bayiId)
  if (!hedef) return { hata: 'Bayi bulunamadı.' }

  /* ESKİ ŞİFRE YALNIZ İSTEYEREK DEĞİŞTİRİRKEN SORULUYOR.

     İlk giriş akışında sorulmuyor ve sorulmamalı: bayi zaten geçici
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
  bayileriYaz(
    liste.map((b) => (b.id === bayiId ? { ...b, sifre: hazir, ilkGiris: false } : b)),
    hedef.ad,
    `${hedef.ad} panel şifresini değiştirdi`,
    'sifre',
  )
  const o = bayiOturumuGetir()
  if (o?.bayiId === bayiId) save(ANAHTAR.bayiOturum, { ...o, ilkGiris: false })
  return { tamam: true }
}

/* ------------------------------------------------- Bayi şifre talepleri

   BAYİ ŞİFRESİNİ KENDİ SIFIRLAYAMIYOR.

   Personelin şifre sıfırlaması e-postayla çalışıyor (bkz.
   `sifreTalebiOlustur`). Bayide e-posta yok: hesabı PAKSAN açıyor,
   iletişim telefonla yürüyor. Kendi kendine sıfırlayan bir akış
   kurmak, bayinin kullanıcı adını bilen herkese hesabı açardı.

   Bunun yerine bayi TALEP bırakıyor, PAKSAN backoffice'te görüyor ve
   bayiyi arayıp geçici şifre veriyor. Bayi o şifreyle girince
   `ilkGiris` akışı kendi şifresini belirletiyor — zaten var olan yol.

   Hesap silme ve numara değişikliğinde uygulanan kuralın aynısı:
   hesabın kendisine dair kararlar PAKSAN'da.                          */

export function bayiSifreTalepleriGetir() {
  return load(ANAHTAR.bayiSifreTalep, []).sort((a, b) => b.tarih - a.tarih)
}

/** Bayi giriş ekranından "şifremi unuttum" der. */
export function bayiSifreTalebiAc(kullanici) {
  const ad = String(kullanici || '').trim().toLocaleLowerCase('tr-TR')
  if (!ad) return { hata: 'Önce kullanıcı adınızı yazın.' }

  const kayit = bayileriGetir().find((b) => b.kullanici === ad)

  /* Kullanıcı adı bulunamasa da AYNI cevap dönüyor: "böyle bir bayi
     yok" demek, deneme yanılmayla kullanıcı adı bulmayı kolaylaştırır.
     Kayıt yalnız gerçek bayi için yazılıyor. */
  if (kayit) {
    const acikVar = load(ANAHTAR.bayiSifreTalep, []).some(
      (t) => t.bayiId === kayit.id && t.durum === 'bekliyor',
    )
    if (!acikVar) {
      save(ANAHTAR.bayiSifreTalep, [
        {
          id: uid(),
          bayiId: kayit.id,
          bayiAd: kayit.ad,
          bayiNo: kayit.no,
          kullanici: ad,
          durum: 'bekliyor',
          tarih: Date.now(),
        },
        ...load(ANAHTAR.bayiSifreTalep, []),
      ])
      islemYaz({
        tur: 'sifre',
        ozet: `${kayit.ad} panel şifresi için yardım istedi`,
        rol: 'bayi',
      })
    }
  }
  return { tamam: true }
}

/** PAKSAN talebi kapatır (bayiyi aradı, geçici şifreyi verdi). */
export function bayiSifreTalebiKapat(talepId, personel) {
  const liste = load(ANAHTAR.bayiSifreTalep, [])
  save(
    ANAHTAR.bayiSifreTalep,
    liste.map((t) =>
      t.id === talepId
        ? { ...t, durum: 'kapandi', kapatan: personel, kapanis: Date.now() }
        : t,
    ),
  )
  islemYaz({ tur: 'sifre', ozet: 'Bayi şifre talebi kapatıldı', personel })
}

/* --------------------------------------------------------- Makine kayıtları

   Müşteri makinesini uygulamaya kaydettiğinde buraya bir satır düşüyor.
   Logo bağlıysa satırda faturanın kesildiği bayi de yazıyor; bağlı
   değilse bayi alanı boş kalıyor (bkz. src/lib/logo.js).             */

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

     Önce yalnız backoffice oturumuna bakılıyordu. Bayi panelinde öyle
     bir oturum yok: bayinin randevusu, kapattığı iş ve eklediği not
     rolsüz kaydediliyor, İşlem Kaydı ekranında "—" görünüyordu. Aynı
     tarayıcıda personel de backoffice'e girmişse rol daha da yanlış
     oluyordu — bayinin işlemi personelin rolüyle yazılıyordu.

     Karar tarayıcıya değil, çalışan derlemeye ait (src/lib/urun.js). */
  const bayide = urun() === 'bayi'
  const oturum = load(bayide ? ANAHTAR.bayiOturum : ANAHTAR.oturum, null)
  const kayit = {
    id: uid(),
    tarih: Date.now(),
    tur,
    ozet,
    personel: personel || oturum?.ad || '—',
    rol: rol || (bayide ? 'bayi' : oturum?.rol) || null,
  }
  save(ANAHTAR.islemKaydi, [kayit, ...islemKaydiGetir()].slice(0, 500))
  return kayit
}
