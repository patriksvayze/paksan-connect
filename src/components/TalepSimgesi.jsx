import { IconCart, IconParca, IconWrench } from './Icons'

/* ==========================================================================
   Talep türünün simgesi ve rengi — her ekranda aynı

   29 Eylül 2026, görünüm önerisi C3 ve C4 (kullanıcının onayı).

   Taleplerim ve Bildirimler her talebin yanına yeşil bir onay işareti
   koyuyordu; "Ekibimiz inceliyor" ve "Randevu verildi" diyen, işi süren
   talepler de dahil. Yeşil tik herkes için "bitti" demek: çiftçi ya
   boşuna bekliyor ya boşuna arıyordu. Durumu yazan renkli etiket zaten
   satırda duruyor; simgenin işi talebin NE olduğunu söylemek.

   Tür, ana ekrandaki satırlarla aynı simge ve renkte: servis turuncu
   anahtar, parça mor somun, teklif mavi sepet. Çiftçi servis ile parçayı
   karıştırıyordu; okumadan, rengine ve şekline bakarak ayırt edebilmeli.
   Renkler talep türlerinin her yerdeki renkleri (styles.css → --tur-*).
   ========================================================================== */

const SIMGELER = { servis: IconWrench, parca: IconParca, satinalma: IconCart }

/** Talep türünün simgesi; bilinmeyen tür servis sayılır. */
export function talepSimgesi(tur) {
  return SIMGELER[tur] || IconWrench
}

/** Renk sınıfının adı (`talep-simge--<ad>`); bilinmeyen tür servis sayılır. */
export function talepSimgeAdi(tur) {
  return SIMGELER[tur] ? tur : 'servis'
}

/**
 * Liste satırının solundaki simge kutusu. `sinif` varsa kutunun kendi
 * sınıfının yanına eklenir (ör. `listitem__icon`).
 */
export function TalepSimgesi({ tur, size = 22, sinif = 'listitem__icon' }) {
  const Ikon = talepSimgesi(tur)
  return (
    <div className={sinif + ' talep-simge talep-simge--' + talepSimgeAdi(tur)} aria-hidden="true">
      <Ikon size={size} />
    </div>
  )
}
