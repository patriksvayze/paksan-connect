/* Raporlar ekranının sekmeleri — soldan sağa bu sırayla.

   Sıra yöneticinin sorularının sırası: önce genel durum, sonra işin
   kendisi (servis, garanti, ürün, parça), sonra müşteri.

   DESTEK ASİSTANI VE EKİP SEKMELERİ KALDIRILDI (6 Ekim 2026,
   kullanıcının isteği: "tamamen kaldır, gerekirse daha sonra ekleriz").
   Dosyaları yerinde duruyor (`destek.js`, `ekip.js`); geri eklemek için
   içe aktarıp aşağıdaki listeye koymak yeter. Genel Bakış'ın "cevapsız
   soru" uyarısı sekmeye değil Destek Kayıtları ekranına götürüyor,
   yerinde kaldı.

   SATIŞ VE BAYİLER SEKMESİ DE KALDIRILDI (aynı gün, kullanıcının
   isteği). Ama Dashboard'un yönetim özeti bu bölümün iki ölçüsünü
   (teklif dönüşümü, satış) kimliğiyle okuyor; bölüm Raporlar'da sekme
   olarak görünmüyor, hesabı `HESAP_BOLUMLERI` ile özete açık. Sekmeyi
   geri getirmek için `satisBolumu`'nu `BOLUMLER`'e eklemek yeter. */

import { genelBolumu } from './genel'
import { servisBolumu } from './servis'
import { garantiBolumu } from './garanti'
import { urunBolumu } from './urun'
import { parcaBolumu } from './parca'
import { satisBolumu } from './satis'
import { musteriBolumu } from './musteri'

/** Raporlar ekranının sekmeleri. */
export const BOLUMLER = [
  genelBolumu,
  servisBolumu,
  garantiBolumu,
  urunBolumu,
  parcaBolumu,
  musteriBolumu,
]

/** Hesabı başka ekranlara (Dashboard'un yönetim özeti) açık bölümler:
    sekmeler artı sekmesi kaldırılmış olanlar. */
export const HESAP_BOLUMLERI = [...BOLUMLER, satisBolumu]
