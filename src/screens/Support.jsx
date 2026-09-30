import { DESTEK_KIPI } from '../config'
import ArizaCozumu from './ArizaCozumu'
import DestekAsistani from './DestekAsistani'

/* ==========================================================================
   Destek ekranının kapısı

   Destek sekmesinin ve /destek adresinin açtığı ekran iki kipten biri
   (29 Eylül 2026, kullanıcının isteği; ayrıntı src/config.js →
   DESTEK_KIPI):

     'rehber'  → ArizaCozumu.jsx     hazır arıza-çözüm ağacı (bugün açık)
     'asistan' → DestekAsistani.jsx  sunucudaki kılavuz asistanı

   İkisi aynı adresleri kullanıyor (/destek, /destek/:machineId) ve
   ikisi de Destek Kayıtları'na aynı biçimde yazıyor; uygulamanın geri
   kalanı hangisinin açık olduğunu bilmiyor.
   ========================================================================== */

export default function Support() {
  return DESTEK_KIPI === 'asistan' ? <DestekAsistani /> : <ArizaCozumu />
}
