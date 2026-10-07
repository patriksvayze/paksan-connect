/* ==========================================================================
   Para birimi, KDV oranı ve tutar biçimleme

   Bu üçü bir dönem yedek parça fiyat listesinin içinde duruyordu
   (`parcaFiyat.js`). O dosya uydurma fiyatlar taşıyordu ve 12 Eylül
   2026'da tamamen kaldırıldı; para birimi ile tutar biçimleme ise
   fiyatın nereden geldiğinden bağımsız, her üç üründe de gereken
   ülke bilgisidir. Bu yüzden ayrı dosyaya alındı.

   Gerçek fiyatların tek kaynağı PAKSAN'ın yedek parça kataloğudur
   (`sunucu-taklidi/parca-katalogu/katalog.json`, kaynak: PAKSAN
   TEMMUZ 2026 fiyat listesi). Bu dosyada FİYAT YOKTUR ve olmamalıdır.
   ========================================================================== */

export const PARA_BIRIMI = 'TL'

/* Para biriminin işareti. Tutarın yanında yazı olarak `PARA_BIRIMI`
   duruyor; işaret yalnız simge yerine kullanılıyor (Servisim → Hak Ediş,
   "Hesabınızdaki Tutar" kartı). Ülkeye ait bilgi olduğu için motorda
   düz yazılmıyor. */
export const PARA_SIMGESI = '₺'

/* KDV oranı.

   ⚠ KATALOĞUN KDV TEMELİ HENÜZ DOĞRULANMADI. PAKSAN'ın fiyat listesi
   PDF'inden okunan tutarlar katalogda düz sayı olarak duruyor; katalogda
   ne para birimi ne KDV alanı var (fiyat listesi okuyucusu,
   `src/lib/fiyatListesiOku.js`, ₺ işaretini okuyup atıyor). Listenin KDV dâhil mi hariç mi olduğu kaynakta yazılı
   değil ve PDF depoda saklanmıyor.

   Bu oran yalnızca liste fiyatının KDV HARİÇ olduğu varsayımıyla
   anlamlıdır. Varsayım doğrulanınca: KDV dâhilse bu dosyadaki
   `KDV_HARIC_LISTE` false yapılır ve ekranlar KDV satırını göstermez.
   Katalog şemasına `kdvDahilMi` alanı eklenirse bu sabit tamamen
   kalkar ve değer katalogdan okunur. */
export const KDV_ORANI = 0.2

/* Liste fiyatı KDV hariç mi?

   KULLANICININ KARARI (12 Eylül 2026): *“Fiyat listesine KDV hariç
   olarak düşünelim şimdilik, büyük ihtimal dâhil değildir.”*

   Yani bu `true` artk önceki davranışın sürmesi değil, verilmiş bir
   karar — ama KESİNLEŞMİŞ değil: kullanıcı “şimdilik” ve “büyük
   ihtimal” dedi, PDF'e bakıp doğrulamadı. Kaynak PDF depoda yok.

   DEĞİŞTİRMEK GEREKİRSE burada tek satır: `false` yazılır, `kdvTutari()`
   0 döner ve ekranlar KDV satırını göstermez. Başka hiçbir yere
   dokunmak gerekmez.

   AMA GEÇMİŞE ETKİ ETMEZ. Talep açılırken o günün tutarı kaydın
   içine yazılıyor (`parcaFiyat` anlık görüntüsü, bkz.
   lib/parcaKatalogu.js → fiyatGoruntusu). Sabit sonradan çevrilirse
   bugün açılmış talepler kendi tutarını taşımaya devam eder; personel
   dekontu o rakamla karşılaştırıyor. Bu bilerek böyle — müşteri
   havaleyi o gün gördüğü tutardan yaptı. */
export const KDV_HARIC_LISTE = true

/** Tutarın KDV'si. Liste KDV dâhilse 0 döner. */
export function kdvTutari(araToplam) {
  if (!KDV_HARIC_LISTE) return 0
  return Math.round(araToplam * KDV_ORANI)
}

/** "12.500" — binlik ayracı nokta, Türkiye biçimi. */
export function paraYaz(sayi) {
  if (sayi === null || sayi === undefined || Number.isNaN(sayi)) return '—'
  return String(Math.round(sayi)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
