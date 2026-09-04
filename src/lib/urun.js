/* ==========================================================================
   Hangi derleme çalışıyor

   Üç ayrı derleme var ve üçü de aynı kaynak dosyaların bir kısmını
   paylaşıyor: müşteri uygulaması (`app`), personel paneli
   (`backoffice`), bayi paneli ve uygulaması (`bayi`).

   Paylaşılan bir dosya bazen "beni kim çalıştırıyor" bilmek zorunda
   kalıyor. İki yerde oldu:

     · Görünüm tercihi (src/backoffice/Tema.jsx). Bayi paneli aynı
       bileşeni kullanıyor; tek anahtar yazılınca bayinin telefonunda
       seçilen koyu tema PAKSAN personelinin ekranına da geçiyordu.

     · İşlem kaydının rol alanı (src/backoffice/veri.js → islemYaz).
       Rol yazılmadığında backoffice oturumundan okunuyordu; bayi
       tarafında öyle bir oturum yok, ama personel aynı tarayıcıda
       backoffice'e girmişse bayinin işlemi onun rolüyle kaydediliyordu.

   İkisinde de tarayıcıya bakarak karar vermek yanlış sonuç veriyor:
   aynı tarayıcıda iki ürün birden açık olabiliyor. Doğru cevabı yalnız
   giriş dosyası biliyor, o da açılışta buraya yazıyor.

   Varsayılan `app`: müşteri uygulaması bu dosyayı çağırmıyor ve
   çağırmasına gerek de yok.
   ========================================================================== */

let simdiki = 'app'

/** Giriş dosyası açılışta bir kez çağırıyor (her derlemenin main.jsx'i). */
export function urunAyarla(ad) {
  simdiki = ad
}

export function urun() {
  return simdiki
}
