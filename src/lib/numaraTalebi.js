/* ==========================================================================
   Telefon numarası değişikliği talebi

   Giriş numarası hesabın kimliği. Kullanıcı kendi başına
   değiştirebilseydi, telefonu bir süreliğine eline geçiren biri numarayı
   kendi numarasıyla değiştirip hesabı devralabilirdi. Bu yüzden
   değişikliği PAKSAN yapıyor.

   Müşteri uygulamadan yazılı talep bırakıyor: yeni numarası ve
   makinesinin seri numarası. Seri numarasını yalnızca makinenin
   başındaki kişi bilir; kimlik böyle doğrulanıyor. Talep backoffice’e düşüyor,
   iki kontrolden geçiyor, numarayı yetkili değiştiriyor.

   Talep telefonda değil yazılı alınıyor: müşteri de ekip de sırada
   beklemesin.
   ========================================================================== */

import { load, save, uid } from './storage'
import { telAnahtar, telGoster, telKullanici, telSifirsiz } from './tel'
import { uygulamaKaydi } from './kayit'

const ANAHTAR = 'numaraTalepleri'

export function numaraTalepleri() {
  return load(ANAHTAR, [])
}

/* İKİ KAYNAK, İKİ AYRI SORU

   'numara'         (alan yoksa da bu) Müşteri numarasını değiştirmek
                    istiyor: bu hesabın numarası yenisiyle değişecek.
   'seriCakismasi'  Müşteri makine eklerken seri başka bir hesapta
                    çıktı ve "numaram değişti" dedi: bu hesap YENİ
                    numarayla açılmış; eski numaranın hesabındaki
                    kayıtlar bu hesaba geçecek (bkz. lib/makineKaydi.js
                    → seriBaskaHesaptaMi).

   Bekleyen talep aranırken kaynaklar karışmıyor. Karışsaydı makine
   eklerken bırakılan talep, profildeki numara formunu "talebiniz
   inceleniyor" diye kapatırdı — oysa o talep bu hesabın numarasına
   dokunmuyor. */
export const SERI_CAKISMASI = 'seriCakismasi'

/**
 * Bu hesabın cevap bekleyen talebi varsa onu döndürür.
 *
 * @param {object} user
 * @param {{kaynak?: string, eskiHesapId?: string|null, seri?: string}} [secim]
 *   `kaynak: SERI_CAKISMASI` verilirse yalnız o kaynaktan, aynı eski
 *   hesaba ya da aynı seriye bakan talep aranır: eski hesabın bütün
 *   kayıtları tek talepte geçtiği için ikinci makine yeni talep istemez.
 */
export function acikNumaraTalebi(user, { kaynak, eskiHesapId, seri } = {}) {
  if (!user) return null
  return numaraTalepleri().find((t) => {
    if (t.musteriId !== user.id || t.durum !== 'bekliyor') return false
    if (kaynak !== SERI_CAKISMASI) return t.kaynak !== SERI_CAKISMASI
    if (t.kaynak !== SERI_CAKISMASI) return false
    return (
      (eskiHesapId && t.eskiHesap?.musteriId === eskiHesapId) ||
      (seri && t.seri === seri)
    )
  }) || null
}

/** Bu hesabın en son sonuçlanmış talebi. */
export function sonNumaraTalebi(user) {
  if (!user) return null
  return numaraTalepleri().find((t) => t.musteriId === user.id) || null
}

/**
 * Yeni talep bırakır.
 * @returns {object} oluşan talep
 */
export function numaraTalebiGonder({ user, yeniUlke, yeniTel, seri }) {
  const talep = {
    kaynak: 'numara',
    id: uid(),
    tarih: Date.now(),
    durum: 'bekliyor',

    musteriId: user?.id || null,
    ad: user?.ad || '',

    /* Eski numara ekranda göründüğü gibi; backoffice kıyaslarken rakamlara
       bakıyor, biçim önemli değil. */
    eskiTel: telKullanici(user),
    eskiUlke: user?.ulke || '',

    /* Yeni numara iki biçimde: ekranda gösterilecek hâli ve hesaba
       yazılacak ham hâli. Ham hâl yazılmazsa giriş bir daha çalışmaz. */
    yeniTel,
    yeniTelHam: yeniTel,
    yeniUlke,
    yeniAnahtar: telAnahtar(yeniUlke, yeniTel),

    seri: String(seri || '').trim(),
  }

  save(ANAHTAR, [talep, ...numaraTalepleri()])
  uygulamaKaydi('numara', `${talep.ad} numara değişikliği istedi`)
  return talep
}

/* Seri çakışmasından gelen talep.

   Yön ters: YENİ numara bu hesabın numarası (müşteri o numarayla
   giriş yaptı, değiştiremez), ESKİ numarayı müşteri yazıyor. Seri
   numarası kanıt; müşteri yazmadı, ekleme ekranından geldi.

   Alan adları öteki kaynakla aynı (`eskiTel`, `yeniTelHam`, `seri`) ki
   backoffice iki talebi tek listede, aynı kartta gösterebilsin. Ek
   olarak:
     yeniHesap  bu hesabın kimliği (talebi açan; `musteriId` de o)
     eskiHesap  defterde seriyi tutan hesabın kimliği — ad ve telefon
                yok; ekranda gösterilmedi, burada da taşınmıyor.
                Backoffice adı kendi kaydından buluyor. */
export function seriCakismasiTalebi({ user, eskiUlke, eskiTel, seri, eskiHesap }) {
  const talep = {
    kaynak: SERI_CAKISMASI,
    id: uid(),
    tarih: Date.now(),
    durum: 'bekliyor',

    musteriId: user?.id || null,
    ad: user?.ad || '',

    eskiTel: telGoster(eskiUlke, eskiTel),
    eskiTelHam: telSifirsiz(eskiTel),
    eskiUlke,

    yeniTel: telKullanici(user),
    yeniTelHam: user?.tel || '',
    yeniUlke: user?.ulke || '',
    yeniAnahtar: user ? telAnahtar(user.ulke, user.tel) : '',

    seri: String(seri || '').trim(),

    yeniHesap: { musteriId: user?.id || null, musteriNo: user?.no || null },
    eskiHesap: {
      musteriId: eskiHesap?.musteriId || null,
      musteriNo: eskiHesap?.musteriNo || null,
    },
  }

  save(ANAHTAR, [talep, ...numaraTalepleri()])
  uygulamaKaydi(
    'numara',
    `${talep.ad} · seri numarası başka hesapta kayıtlı; eski hesabındaki kayıtların yeni hesabına taşınmasını istedi · ${talep.seri}`
  )
  return talep
}
