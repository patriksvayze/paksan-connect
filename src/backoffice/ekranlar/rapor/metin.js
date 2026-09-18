/* ==========================================================================
   Codex'ten geçmemiş metin işareti

   Raporlar ekranı 17 Eylül 2026'da baştan kuruldu. O gün Codex'in
   kullanım sınırı doluydu (19 Eylül 11:29'a kadar); yeni ekranın Türkçe
   metinleri Codex'e verilemedi.

   Metinler ekranda okunur bir taslak olarak duruyor ki ekran
   değerlendirilebilsin, ama her dosyanın metin nesnesi bu işaretle
   sarılı. `npm run dogrula` 12. kontrolü işareti görünce "yazılmamış
   metin" diye bildiriyor; işaret kalkmadan yayına çıkılamıyor.

   Codex geçişi: dosyanın metin nesnesi olduğu gibi Codex'e verilir,
   dönen metinler yerine yazılır ve sarmalayıcı kaldırılır. Metinler
   her dosyanın başında tek bir nesnede toplu duruyor; bu yüzden
   Codex'e tek seferde verilebiliyor.
   ========================================================================== */

export const codexBekliyor = (metinler) => metinler
