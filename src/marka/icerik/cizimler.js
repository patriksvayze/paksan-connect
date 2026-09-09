/* ==========================================================================
   Uygulamadaki çizimler

   Boş ekranlar, karşılama ekranı ve Destek cevabındaki güvenlik
   adımları için hazırlanmış düz vektör çizimler.

   NASIL ÜRETİLDİ

   Higgsfield ile üretildi, sonra `tools/gorsel-hazirla.py` ile
   uygulamaya hazırlandı: zemin kenardan yayılarak saydam yapıldı,
   boş kenarlar kırpıldı, palet 32 renge indirildi. Dosya boyutu
   101 KB'den 8 KB'ye düşüyor; uygulama internetsiz çalıştığı ve
   APK'nın içinde taşındığı için bu önemli.

   Zeminin saydam olması karanlık modda da çalışmalarını sağlıyor —
   sayfanın rengi çizimin arkasından geçiyor.

   NEDEN MAKİNE ÇİZİLMİYOR

   Güvenlik çizimleri makine değil İNSAN HAREKETİ gösteriyor: kolu
   indiren el, kontaktan çıkan anahtar, duran dişli ve dur işareti,
   destekle kaldırılmış yük. Görsel üreticiler tarım makinesi
   ayrıntılarında güvenilir değil; PAKSAN'ın kendi uygulamasında
   uydurma bir parça çizimi göstermek, müşterinin makinesinde olmayan
   bir şeyi aramasına yol açar. Anlatmak istediğimiz şey zaten
   hareketin kendisi.

   "Makinelerim boş" çiziminde bir makine var ama o da kasıtlı olarak
   genel: çeki oku, gövde, iki tekerlek. Traktör DEĞİL — PAKSAN
   traktör üretmiyor.

   MAKİNE TURUNCU, LACİVERT DEĞİL

   O çizim önce lacivert gövdeliydi: uygulamanın arayüz rengiyle
   makinenin boyası karıştırılmıştı. Lacivert markanın rengi (logo,
   başlık çubuğu, düğmeler); PAKSAN makinesinin gövdesi turuncu.

   Renk tahmin edilmedi, ürün fotoğraflarından ölçüldü: 15 üründe
   45.479 doygun piksel, ağırlıklı ortalama **#E16025**. Ölçüm betiği
   `tools/marka-rengi.mjs`; gerçek stüdyo çekimleri geldiğinde yeniden
   çalıştırılmalı.

   Aynı kural servis panelindeki çizimler için de geçerli
   (bkz. src/assets/gorseller/servis-*.png).
   ========================================================================== */

import bosMakine from '../../assets/gorseller/bos-makine.png'
import bosBildirim from '../../assets/gorseller/bos-bildirim.png'
import bosArama from '../../assets/gorseller/bos-arama.png'
import karsilama from '../../assets/gorseller/karsilama.png'
import guvenlikKuyruk from '../../assets/gorseller/guvenlik-kuyruk.png'
import guvenlikAnahtar from '../../assets/gorseller/guvenlik-anahtar.png'
import guvenlikBekle from '../../assets/gorseller/guvenlik-bekle.png'
import guvenlikDestek from '../../assets/gorseller/guvenlik-destek.png'

export const CIZIM = {
  bosMakine,
  bosBildirim,
  bosArama,
  karsilama,
}

/* Destek cevabındaki dört güvenlik maddesinin sırasıyla karşılığı
   (bkz. src/data/destekVerisi.js → GUVENLIK). Sıra bozulursa çizimler
   yanlış maddeye düşer. */
export const GUVENLIK_CIZIMLERI = [
  guvenlikKuyruk,
  guvenlikAnahtar,
  guvenlikBekle,
  guvenlikDestek,
]
