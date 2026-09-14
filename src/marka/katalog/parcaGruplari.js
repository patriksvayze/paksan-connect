/* ==========================================================================
   Yedek parça grubu → makine ailesi köprüsü

   NEDEN BU DOSYA VAR

   PAKSAN'ın yedek parça kataloğu (`sunucu-taklidi/parca-katalogu/
   katalog.json`, kaynak: PAKSAN TEMMUZ 2026 fiyat listesi) parçaları
   35 GRUBA ayırıyor. Katalogda makine alanı YOKTUR — ölçüldü: 'makine',
   'model', 'seri', 'tip' kelimeleri ham dosyada hiç geçmiyor. Tek
   sınıflandırma `grup`, yani alt montaj adı.

   Müşteri uygulaması ise parçayı makineye göre soruyor: çiftçi
   "Orkinos'umun parçası" diyor, "bağlama grubu" demiyor. Bu köprü o
   boşluğu kapatıyor ve eşleme PAKSAN'ın kendi grup adlarından
   çıkarılıyor — uydurulmuyor.

   NE OLMADIĞI ÖNEMLİ

   Bir grubu birden fazla makine ailesine yazmıyoruz. Volan, sigorta,
   şaft, teker gibi gruplar başka makinelerde de kullanılabilir görünse
   de PAKSAN bunları fiyat listesinde balya makinesinin altında
   yayımlamış. Listede olmayan bir uyumluluğu buraya yazmak, kaldırdığımız
   uydurma verinin aynısını geri getirmek olur.

   KARŞILIĞI OLMAYAN AİLELER

   `rulo`, `silaj` ve `toprak` için PAKSAN'ın fiyat listesinde HİÇ PARÇA
   YOK. Bu bir eksiklik değil, listenin kapsamı. O makinelerin sahibi
   parçasız bırakılmıyor: kataloğun tamamında arama yapabiliyor ve
   "Diğer" ile parçayı yazıyla anlatabiliyor (bkz. `src/lib/parcaKatalogu.js`
   → `destekGrubununGruplari`).
   ========================================================================== */

/* Destek grubu anahtarları `supportGroup()` çıktısıdır
   (`src/marka/katalog/products.js`): balya · rulo · yem · silaj ·
   cayir · toprak · genel */
export const PARCA_GRUBU_AILESI = {
  /* Prizmatik balya makinesinin alt montajları — fiyat listesinin
     büyük bölümü. Hammer kendi grubuyla listede ayrı duruyor ama
     kategorisi küçük balya, o yüzden aynı aileye yazılıyor. */
  'baglama-grubu': 'balya',
  'ip-gerdirme-sistemi': 'balya',
  'sente-ve-otomatik-sistem': 'balya',
  'baglama-grubu-balata-sistemi': 'balya',
  'balya-boy-ayar-cark-sistemi': 'balya',
  'balya-boy-ayar-sistemi': 'balya',
  'balya-cikis-sistemi': 'balya',
  'ayna-mahruti-sistemi': 'balya',
  'volan': 'balya',
  'sigorta': 'balya',
  'saftlar': 'balya',
  'ok-sistemi': 'balya',
  'saft-aski-sistemi': 'balya',
  'teker-sistemi': 'balya',
  'piston-cikis-sistemi': 'balya',
  'piston-ray-sistemi': 'balya',
  'piston-sistemi': 'balya',
  'piston-emniyet-sistemi': 'balya',
  'besik-sistemi': 'balya',
  'besik-balata-sistemi': 'balya',
  'ip-yolu-sistemi': 'balya',
  'yaba-sasesi': 'balya',
  'yaba-sistemi': 'balya',
  'on-yaba-hareket-sistemi': 'balya',
  'yaba-sanzumani': 'balya',
  'tirmik-sistemi': 'balya',
  'tirmik-hareket-sistemi': 'balya',
  'tirmik-kaldirma-sistemi': 'balya',
  'kaporta-sistemi': 'balya',
  'haspay-sistemi': 'balya',
  'kayis-gerdirme-sistemi': 'balya',
  'hammer-yedek-parca': 'balya',

  /* Çayır biçme ve ot toplama */
  'ot-toplama': 'cayir',
  'cayir-bicme': 'cayir',

  /* Yem karma */
  'yem-karma': 'yem',
}

/* Fiyat listesinde karşılığı olmayan aileler. Ekran bu aileleri
   "bu makine için ayrı parça listesi yok" diye ele alıyor; parça
   isteme yolu kapanmıyor. */
export const PARCASIZ_AILELER = ['rulo', 'silaj', 'toprak', 'genel']

/**
 * Katalogdaki hangi gruplar bu köprüde eşlenmemiş?
 *
 * Yeni bir fiyat listesi yeni bir grup getirirse o grubun parçaları
 * müşteri ekranından sessizce kaybolur. `npm run dogrula` bu listeyi
 * okuyup boş olmadığında hata veriyor — sessiz kayıp olmasın.
 *
 * @param {Array<{id: string}>} gruplar katalog.gruplar
 * @returns {string[]} eşlenmemiş grup kimlikleri
 */
export function eslenmemisGruplar(gruplar = []) {
  return gruplar.map((g) => g.id).filter((id) => !PARCA_GRUBU_AILESI[id])
}

/**
 * Köprüde olup katalogda bulunmayan gruplar — liste küçüldüğünde
 * buradaki satır ölü kalır, o da denetimde görünmeli.
 *
 * @param {Array<{id: string}>} gruplar katalog.gruplar
 * @returns {string[]} artık var olmayan grup kimlikleri
 */
export function artikOlmayanGruplar(gruplar = []) {
  const katalogda = new Set(gruplar.map((g) => g.id))
  return Object.keys(PARCA_GRUBU_AILESI).filter((id) => !katalogda.has(id))
}
