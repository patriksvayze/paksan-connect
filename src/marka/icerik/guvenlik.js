/* ==========================================================================
   Güvenlik kuralları — derlenmiş liste

   NEDEN AYRI BİR DOSYA:

   Bu liste önce kılavuz veri paketinden (mobile_support_package.json →
   safety) doğrudan okunuyordu. Orada 262 kayıt var; birebir aynı olan
   cümleler ayıklanınca 116 madde kalıyordu. O listede üç sorun vardı:

     1. 28 madde Türkçe alanında İNGİLİZCE duruyordu (Orka 870'in
        güvenlik bölümü öyle taranmış, İngilizce alanı da boş kalmış).
        Bu maddelerin çoğunun Türkçe ikizi listede zaten vardı — aynı
        kural iki kez, iki ayrı dilde görünüyordu.
     2. "Safety Recommendations:" gibi bölüm başlıkları madde olarak
        listeye sızmıştı; "TEHLİKE 7." gibi kalıntılar cümle sonuna
        yapışmıştı.
     3. Kaynak metinde yazım hataları vardı: "bir şey yey içmemelidir",
        "yeyip içmemelidir", "istihab haddi" (doğrusu istiap),
        "makina kesinlikle yaklaşmayınız" (eksik ek).

   Kılavuz veri paketindeki metinler uygulama tarafında da güvenlik
   kurallarıyla birlikte gözden geçiriliyor. Bu dosyada, farklı
   kılavuzlardaki ortak kurallar sadeleştirilip tek bir listede sunuluyor.

   NE DEĞİŞTİ, NE DEĞİŞMEDİ:

   Hiçbir güvenlik BİLGİSİ atılmadı. Yapılan iş, aynı kuralı anlatan
   maddeleri tek maddede birleştirmek, dili düzeltmek ve kuralları
   çiftçinin işi yaparken izlediği sıraya göre öbeklemek. 116 madde
   40 maddeye indi; kaybolan tek şey tekrar.

   ÖBEKLER işin sırasına göre: önce hazırlık, sonra bağlama, kuyruk
   mili, çalışma, yol, en son park ve bakım.
   ========================================================================== */

import { GUVENLIK_EN } from './guvenlik.en'

export const GUVENLIK_OBEK = [
  {
    id: 'hazirlik',
    maddeler: [
      'Makineyi ilk kez kullanacaksanız kılavuzun tamamını okuyun. Anlamadığınız bir yer olursa PAKSAN’a danışın.',
      'Makineyi kullanan kişi F sınıfı ehliyetli, eğitimli ve deneyimli olmalıdır.',
      'Çalıştırmadan önce kumandaları ve ne işe yaradıklarını öğrenin.',
      'Makine üzerindeki tehlike etiketleri kısa uyarılardır; okunmuyorsa yenisini isteyin.',
      'Vücuda oturan kıyafet giyin. Bol elbise, uzun ceket ve gömlek hareketli parçalara takılır. Uzun kollu gömlek giymek zorundaysanız düğmelerini tam ilikleyin.',
      'Çalışırken bir şey yiyip içmeyin.',
      'Makineyi yangın riskine karşı temiz tutun. Çıkma merdivenini ve üzerinde yürünen yüzeyleri her gün temizleyin; kaymaz kaplama ancak temizken iş görür.',
    ],
  },
  {
    id: 'baglama',
    maddeler: [
      'Bağlamadan önce traktörün motorunu durdurun, el frenini çekin ve vitesi boşa alın.',
      'Bağlama ve çözme sırasında makine ile traktör arasında kimse bulunmamalıdır.',
      'Makineyi traktöre çeki demiri ile bağlayın. Bağlantı pimleri traktörünkiyle aynı türden olmalıdır.',
      'Bağlarken ve çözerken makineyi dengelemek için denge ayağını (kriko) kullanın. Ezilme ve kesilme riskine karşı dikkatli olun.',
      'Traktöre ek ekipman takmak akslara binen yükü değiştirir. Bağladıktan sonra traktörün performansını ve uyumunu kontrol edin; şüphedeyseniz PAKSAN’a danışın.',
      'Makineyi traktörden ayırmadan önce denge ayaklarının takılı, el freninin çekili, motorun durmuş ve kontak anahtarının çıkarılmış olduğundan emin olun. Şaft bağlantısını mutlaka çözün.',
      'Motor çalışırken, şaft dönerken, el freni çekili değilken veya tekerlekler takozsuzken traktörle makine arasına girmeyin.',
      'Kaldırma kollarının hareket alanında durmayın.',
    ],
  },
  {
    id: 'kuyrukmili',
    maddeler: [
      'Şaftı takarken ve sökerken mutlaka motoru durdurun. Şaftın doğru takıldığından emin olun.',
      'Şaftın uzunluğu ayarlı olmalı; makine, şaft ve traktör aynı doğrultuda durmalıdır. Şafttaki geçme payı en az 30 cm olmalıdır.',
      'Şaft takıldıktan sonra muhafazayı şasiye bağlayarak dönmesini engelleyin.',
      'Motor çalışırken mafsal alanından uzak durun.',
      'Tarla dönüşlerinde ve keskin virajlarda şaftın hareketini kesin.',
    ],
  },
  {
    id: 'calisma',
    maddeler: [
      'Koruma kapakları ve mafsal koruyucuları takılı olmadan makineyi çalıştırmayın.',
      'Çalıştırmadan önce makinenin doğru takıldığını ve ayarlandığını kontrol edin; tüm koruma ve güvenlik donanımını yerine takın.',
      'Çalıştırmadan önce çevrede kimsenin — özellikle çocukların ve hayvanların — olmadığından emin olun. Görüşünüzü açın ve hareket edeceğinizi kornayla belirtin.',
      'Makineyi tarlada balya bağlayabilecek konuma getirmeden çalıştırmayın.',
      'Çalışma sırasında makineye yaklaşmayın, kimseyi yaklaştırmayın. Dönen ve mafsallı parçalardan uzak durun.',
      'Pikap gibi besleme organlarından her zaman güvenli mesafede durun; bu parçalar işlevleri gereği tam olarak kapatılamaz.',
      'Yay ve hidrolik gibi dış kuvvetle hareket eden parçalara ayrıca dikkat edin; sıkışma ve kesilme riski taşırlar.',
      'Makine çalışırken üzerine çıkmayın, ağırlık koymayın, elinizi sokmayın.',
      'Makinenin istiap haddi ve çalışma devri gibi sınırlarını zorlamayın.',
      'Makineye herhangi bir işlem veya ayar yapmadan önce makineyi durdurun ve traktörün motorunu kapatın.',
      'İp ve düğüm bağlama donanımına dokunmadan önce motoru durdurun ve kontak anahtarını çıkarın.',
      'Kumanda kutusunu, taşıma ve çalışma sırasında kazara devreye giremeyecek şekilde monte edin.',
    ],
  },
  {
    id: 'yol',
    maddeler: [
      'Trafiğe çıkmadan önce ışıkları, sinyalleri ve güvenlik donanımını kontrol edin. Karayolu kurallarına ve trafik işaretlerine uyun.',
      'Takılan ekipman traktörün ışıklarını veya güvenlik etiketlerini kapatıyorsa yardımcı işaret ve ışık kullanın.',
      'Yola çıkmadan önce makineyi taşıma konumuna getirin: yan kol zincirleri ayarlı, kapaklar tam kapalı, hidrolik kumanda kolu kilitli olmalıdır.',
      'Çekilen yük yön tutuşunu ve fren kapasitesini doğrudan etkiler. Çalışma ve sürüş hızını yola ve hava koşullarına göre ayarlayın.',
      'Yokuş çıkarken, inerken ve eğimli arazide ani dönüş yapmayın. Dönüşlerde makinenin ağırlığından doğan savrulmayı hesaba katın.',
      'Yokuş aşağı inerken vitesi boşa almayın.',
      'Makine hareket hâlindeyken traktöre binmeyin ve inmeyin.',
      'Makinenin arkasına römork takarak karayoluna çıkmayın.',
      'Makine çalışırken veya taşınırken üzerinde durmayın. Üzerine çıkmanız gerekiyorsa önce motoru durdurun, kontak anahtarını çıkarın ve kuyruk milini ayırın.',
    ],
  },
  {
    id: 'bakim',
    maddeler: [
      'Ayar ve tamiratı yalnızca traktörün motoru kapalı ve tekerlekler takozluyken yapın. İşe başlamadan önce kontak anahtarını yanınıza alın.',
      'Traktörden inmeden önce motoru durdurun, kontak anahtarını çıkarın ve el frenini çekin.',
      'Makinenin kazara hareket etmesini önlemek için tekerleklerin altına takoz koyun.',
      'Mümkünse düz bir yerde park edin; vitese takın ve el frenini çekin. Eğimli arazide park edecekseniz yokuş yukarı birinci vitese, yokuş aşağı geri vitese takın ve her iki durumda da el frenini çekin.',
    ],
  },
]

/** Ekranda gösterilecek öbekler — seçili dile göre. */
export function guvenlikObekleri(dil = 'tr') {
  if (dil !== 'tr') {
    return GUVENLIK_OBEK.map((o) => ({
      id: o.id,
      maddeler: GUVENLIK_EN[o.id] || o.maddeler,
    }))
  }
  return GUVENLIK_OBEK
}

/** Toplam madde sayısı — giriş cümlesinde yazıyor. */
export function guvenlikMaddeSayisi() {
  return GUVENLIK_OBEK.reduce((n, o) => n + o.maddeler.length, 0)
}
