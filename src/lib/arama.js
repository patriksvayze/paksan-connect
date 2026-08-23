/* ==========================================================================
   Metin arama yardımcısı

   Ürün kataloğu gibi yerlerde kullanılıyor: "sıralama" yazan kullanıcı
   "Sıralama"yı da bulsun, "supr" yazan "Süper"i de.

   Türkçe küçültme ayrı bir iş: İngilizce kurallarıyla küçültülen "İ"
   harfi "i̇" oluyor ve eşleşme kaçıyor. Aksanlar da düşürülüyor ki
   klavyesinde Türkçe karakter olmayan kullanıcı da arayabilsin.
   ========================================================================== */

export function norm(metin) {
  return (metin || '')
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .replaceAll('İ', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
    .replaceAll('â', 'a')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
