/* ==========================================================================
   Uygulamadaki çizimler

   Boş ekranlar ve karşılama ekranı için hazırlanmış düz vektör
   çizimler.

   Eski Destek ekranının dört güvenlik çizimi de buradaydı; ekranın
   gömülü rehberiyle birlikte 10 Eylül 2026'da uygulamadan çıkarıldı
   (arşiv: D:\PAKSAN\paksan-rag\arsiv\eski-destek-ekrani).

   NASIL ÜRETİLDİ

   Higgsfield ile üretildi, sonra `tools/gorsel-hazirla.py` ile
   uygulamaya hazırlandı: zemin kenardan yayılarak saydam yapıldı,
   boş kenarlar kırpıldı, palet 32 renge indirildi. Dosya boyutu
   101 KB'den 8 KB'ye düşüyor; uygulama internetsiz çalıştığı ve
   APK'nın içinde taşındığı için bu önemli.

   Zeminin saydam olması karanlık modda da çalışmalarını sağlıyor —
   sayfanın rengi çizimin arkasından geçiyor.

   NEDEN MAKİNE ÇİZİLMİYOR

   Güvenlik çizimleri makine değil İNSAN HAREKETİ gösteriyordu: kolu
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

export const CIZIM = {
  bosMakine,
  bosBildirim,
  bosArama,
  karsilama,
}

