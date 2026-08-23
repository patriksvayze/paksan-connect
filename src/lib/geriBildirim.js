/* Kullanıcı geri bildirimi.

   Sunucu açılana kadar telefonun içinde biriktiriliyor; sunucu
   açıldığında bu kayıtların da gönderilmesi gerekiyor
   (bkz. PRODA-CIKIS.md → A1e). */

import { load, save, uid } from './storage'
import { yeniNo } from './numara'
import { uygulamaKaydi } from './kayit'
import { sunucuyaGonder } from './sunucu'
import { SUNUCU } from '../config'

export function geriBildirimListesi() {
  return load('geribildirim', [])
}

export async function geriBildirimGonder(veri) {
  const kayit = {
    id: uid(),
    no: yeniNo('geribildirim'),
    tarih: Date.now(),
    gonderildi: false,
    ...veri,
  }

  await sunucuyaGonder(SUNUCU.geriBildirimEndpoint, kayit)
  kayit.gonderildi = SUNUCU.aktif

  save('geribildirim', [kayit, ...geriBildirimListesi()].slice(0, 50))
  uygulamaKaydi('geribildirim', `${kayit.no} geldi · ${kayit.ad || 'İsimsiz'}`)
  return kayit
}
