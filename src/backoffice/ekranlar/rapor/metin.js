/* ==========================================================================
   Codex'ten geçmemiş metin işareti

   ŞU AN HİÇBİR YERDE KULLANILMIYOR — ve bu doğru hâli. Dosya bir araç,
   bir iş değil: bekleyen metin varken kullanılır, bittiğinde boşa çıkar.

   NE İŞE YARIYOR. Ekranda görünen her Türkçe Codex'ten geçiyor
   (bkz. CLAUDE.md → "Codex ile iş bölümü"). Codex'in kullanım sınırı
   dolduğunda yazılan metinler taslak olarak kalıyor: ekran
   değerlendirilebilsin diye okunur duruyorlar ama yayına çıkmamaları
   gerekiyor. Metin nesnesi bu işaretle sarılınca `npm run dogrula`
   12. kontrolü onu "yazılmamış taslak" diye bildiriyor ve çıkış kodu
   1 oluyor; işaret kalkmadan yayına çıkılamıyor.

   NASIL KULLANILIR. Yeni yazılan metinler tek bir nesnede toplanır,
   nesne `codexBekliyor({ ... })` ile sarılır, dosya adı
   CODEX-BEKLEYEN.md'ye yazılır. Sınır yenilenince nesne olduğu gibi
   Codex'e verilir, dönen metinler yerine yazılır ve sarmalayıcı
   kaldırılır.

   NEDEN DURUYOR. Raporlar ekranının metinleri 17 Eylül 2026'da bu
   işaretle yazıldı, 19 Eylül 2026'da Codex'ten geçti ve sarmalayıcılar
   kalktı. Dosya silinmedi: `tools/dogrula.mjs:858` hâlâ bu işareti
   arıyor, yani ağ kurulu duruyor. Sınır bir daha dolduğunda — ki
   doldu — sarmalayıcı yeniden gerekecek. Silinseydi o gün ya yeniden
   yazılırdı ya da taslak metin işaretsiz kalıp yayına sızardı.
   ========================================================================== */

export const codexBekliyor = (metinler) => metinler
