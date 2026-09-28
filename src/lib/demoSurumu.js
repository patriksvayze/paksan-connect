/* ==========================================================================
   Demo sürümü mü

   Demo derlemesinin kök etiketinde `data-demo="acik"` işareti duruyor
   (bkz. servis.html). İşaret demo verisini ve demo kolaylıklarını
   açıyor: Servisim'de demo hesabı ve demo kayıtları. Connect'in Makine
   Kaydet ekranındaki örnek seri numaraları da bu işarete bağlanıyor
   (kullanıcı sınaması O10, 25 Eylül 2026: kutu çiftçiye görünüyordu).
   Canlıya çıkarken işaret siliniyor; gidince bunların hiçbiri
   görünmüyor (bkz. CANLIYA-CIKIS.md; `npm run dogrula -- --yayin`
   işaret duruyorsa durduruyor).

   TEK YER (25 Eylül 2026). İşareti okuyan ikinci bir kopya
   (servis/demoKimlik.js) vardı; Connect servis kodunu içe
   aktaramadığı için (npm run dogrula 4. kontrol) okuma buraya alındı,
   Servisim de buradan okuyor.

   Belge yoksa (Node'da ekosistem sınaması) ya da okunamıyorsa demo
   değil: demo kolaylığı yanlışlıkla açılmasın. Ekrana çıkan metin yok.
   ========================================================================== */

export function demoSurumuMu() {
  try {
    return document.documentElement.dataset.demo === 'acik'
  } catch {
    return false
  }
}
