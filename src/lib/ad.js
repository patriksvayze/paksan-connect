/* Ad ve soyad alanları.

   İsimlerde harften başka bir şey olmaz. Rakam ve simgeler yazılırken
   sessizce eleniyor — "geçersiz karakter" uyarısı çıkarıp kullanıcıyı
   uğraştırmıyoruz, tuşa basıyor ve harf değilse ekrana gelmiyor.

   Elenmeyenler:
     · harfler (Türkçe dahil, \p{L} bütün alfabeleri kapsıyor —
       yurtdışındaki müşteriler de kendi adlarını yazabilsin)
     · boşluk — iki adı olanlar için
     · tire ve kesme işareti — "Ali-Rıza", "D'Amico" gibi adlar var    */

export function adTemizle(deger) {
  return (deger || '').replace(/[^\p{L}\s'’-]/gu, '')
}
