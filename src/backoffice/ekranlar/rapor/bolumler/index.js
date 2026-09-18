/* Raporlar ekranının sekmeleri — soldan sağa bu sırayla.

   Sıra yöneticinin sorularının sırası: önce genel durum, sonra işin
   kendisi (servis, garanti, ürün, parça), sonra büyüme (satış,
   müşteri), en sonda destek ve ekip. */

import { genelBolumu } from './genel'
import { servisBolumu } from './servis'
import { garantiBolumu } from './garanti'
import { urunBolumu } from './urun'
import { parcaBolumu } from './parca'
import { satisBolumu } from './satis'
import { musteriBolumu } from './musteri'
import { destekBolumu } from './destek'
import { ekipBolumu } from './ekip'

export const BOLUMLER = [
  genelBolumu,
  servisBolumu,
  garantiBolumu,
  urunBolumu,
  parcaBolumu,
  satisBolumu,
  musteriBolumu,
  destekBolumu,
  ekipBolumu,
]
