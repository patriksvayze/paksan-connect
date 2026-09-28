import { gecikmisMi, KAPALI_DURUMLAR } from '../backoffice/veri'
import { buZiyaretinKaydi } from '../lib/servisKaydi'

/* ==========================================================================
   Servisim'de bir işin hangi bölümde durduğu ve gecikip gecikmediği

   İşlerim iki bölüm: "Yeni" (servisin henüz el sürmediği iş) ve "Devam
   Eden" (geri kalan açık işler). Kural burada, ekran ServisPanel.jsx'te;
   ayrı dosyada olmasının sebebi sınanabilmesi (tools/ekosistem → AK-17).
   ========================================================================== */

/* Servisin henüz el sürmediği iş: randevu verilmemiş, kayıt açılmamış,
   PAKSAN'a devredilmemiş, parça ya da onay beklemiyor.

   Kayıt BU ZİYARETİN kaydı (26 Eylül 2026, ikinci kullanıcı sınaması):
   yeniden açılan işte geçen ziyaretin kaydı talepte duruyor; iş o yüzden
   "Yeni"ye hiç düşmüyor, 48 saat şeridi de çıkmıyordu (bkz.
   lib/servisKaydi.js → buZiyaretinKaydi). Geçen ziyaretin randevusu
   (`plan`) ise hâlâ sayılıyor: iş "Devam Eden"de, Randevu düğmesiyle. */
export function dokunulmamis(t) {
  return (
    !t.plan &&
    !buZiyaretinKaydi(t) &&
    !t.devir &&
    !['parcaBekliyor', 'onayBekliyor'].includes(t.status)
  )
}

/* GECİKME ŞERİDİ YALNIZ SERVİSİN ELİNDEKİ İŞTE (21 Eylül 2026).

   Şerit `gecikmisMi` ile çiziliyordu: talep açılalı 48 saat olduysa,
   hangi aşamada olursa olsun. Backoffice için doğru bir ölçü — orada
   soru "PAKSAN bu talebi ne zamandır kapatmadı". Servis için yanlıştı:
   "Devam Eden" bölümündeki işlerin çoğunda top servisin elinde değil.

     parça bekliyor, onay bekliyor   PAKSAN'ın işi
     PAKSAN destek veriyor           PAKSAN'ın işi
     randevu verilmiş                servis ilgilendi, gün bekleniyor

   Şerit bu kartlarda servisi PAKSAN'ın beklettiği iş için uyarıyordu
   ve iki bölümde aynı renk iki ayrı şey anlatır olmuştu (kullanıcının
   bildirdiği sorun). Artık tek anlamı var: SANA DÜŞTÜ, 48 SAATTİR EL
   SÜRMEDİN. Randevu günü geçmiş iş ayrı bir şey ve kendi yerinde
   görünüyor: "Bugün" kutusunda geçmiş tarihli satır olarak. */
export function servisGecikti(t) {
  return dokunulmamis(t) && gecikmisMi(t)
}

/* İŞLERİM ROZETİ YENİ İŞİ SAYIYOR (kullanıcı sınaması, 24 Eylül 2026).

   Alt çubuktaki rozet servisin AÇIK İŞLERİNİN TAMAMINI sayıyordu:
   randevulu, parça bekleyen, onayda olan iş de. Kırmızı dairede "9+"
   okunmamış bildirim gibi duruyordu ve üst çubuktaki Bildirimler
   sayısıyla karışıyordu. Rozet artık yalnız servisin henüz el sürmediği
   açık işi sayıyor: İşlerim'deki "Yeni" sekmesinin sayısıyla aynı.
   Servisin kendi parça siparişi iş değil. */
export function yeniIsSayisi(talepler = []) {
  return talepler.filter(
    (t) => !t.servisSiparisi && !KAPALI_DURUMLAR.includes(t.status || 'yeni') && dokunulmamis(t),
  ).length
}

/* "YENİ" SEKMESİNİN SIRASI (kullanıcı sınaması, 24 Eylül 2026).

   48 saati geçen iş listenin dibinde kalıyordu: sekme işleri yeniden
   eskiye diziyor, geciken iş de en eskisi. Geciken işler artık başta,
   en eskisi önce; gerisi geldiği sırada kalıyor. */
export function yeniIsSirasi(isler = []) {
  const geciken = isler.filter(servisGecikti).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
  return [...geciken, ...isler.filter((t) => !servisGecikti(t))]
}
