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
import { telAnahtar, telKullanici } from './tel'
import { uygulamaKaydi } from './kayit'

const ANAHTAR = 'numaraTalepleri'

export function numaraTalepleri() {
  return load(ANAHTAR, [])
}

/** Bu hesabın cevap bekleyen talebi varsa onu döndürür. */
export function acikNumaraTalebi(user) {
  if (!user) return null
  return numaraTalepleri().find(
    (t) => t.musteriId === user.id && t.durum === 'bekliyor'
  ) || null
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
