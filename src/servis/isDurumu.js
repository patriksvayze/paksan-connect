import { gecikmisMi, KAPALI_DURUMLAR } from '../backoffice/veri'
import { buZiyaretinKaydi } from '../lib/servisKaydi'
import { gunBasi, randevuSaatliMi } from '../lib/tarih'

/* ==========================================================================
   Servisim'de bir işin hangi bölümde durduğu ve gecikip gecikmediği

   İşlerim iki bölüm: "Yeni" (servisin henüz el sürmediği iş) ve "Devam
   Eden" (geri kalan açık işler). Kural ve iki bölümün sırası burada,
   ekran ekranlar/Islerim.jsx'te; ayrı dosyada olmasının sebebi
   sınanabilmesi (tools/ekosistem → AK-17).
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

/* Randevunun sıralama anı: saatsiz randevu günün sonunda. İşlerim'in
   Randevular kutusu ve "Devam Eden" sırası aynı kuralı kullanıyor. */
export function randevuSirasi(plan) {
  return randevuSaatliMi(plan) ? plan.tarih : gunBasi(plan.tarih) + 86400000 - 1
}

/* "DEVAM EDEN" SEKMESİNDE SIRASI SERVİSE GELEN İŞ ÜSTTE (29 Eylül 2026,
   kullanıcının onayı; görünüm önerisinin karar bekleyen maddesi).

   Sekme işleri geldiği sırada, en yeni önce diziyordu: yarın gidilecek
   iş, PAKSAN'ın kaydını incelediği işin altında kalabiliyordu. Bu
   sekmede iki tür iş var ve servis için ikisi aynı şey değil:

     SIRA SERVİSTE       randevu verilmiş iş (gidilecek), parçası yola
                         çıkmış iş (parça takılacak)
     SIRA PAKSAN'DA      parça hazırlanıyor, kayıt inceleniyor, PAKSAN
                         destek veriyor

   Sırası servise gelen işler üstte, servisin gününe göre:

     1. geçmiş günlerin ve bugünün randevuları, saatiyle (saatsiz günün
        sonunda). Müşterinin "Sorun Devam Ediyor" dediği iş geçen
        ziyaretin randevusuyla buraya düşüyor ve yeni gün bekliyor.
     2. parçası yola çıkmış işler, en önce gönderilen önce: parça ne
        zaman gelirse o gün takılacak, ileri tarihli randevunun önünde.
     3. ileri tarihli randevular, en yakını önce.

   PAKSAN'ı bekleyen işler altta, geldiği sırada. Kartların durum
   etiketi zaten hangisi olduğunu söylüyor (Islerim.jsx → TalepKarti);
   başlık eklenmedi. */
export function siraServisteMi(t) {
  if (t.devir && (t.sahip || 'paksan') === 'paksan') return false
  if (t.status === 'onayBekliyor') return false
  if (t.status === 'parcaBekliyor') return Boolean(t.parcaSevk)
  return true
}

/* [gün, öbek, an]: önce gün, aynı günde randevu parçadan önce. Parça
   ve randevusuz iş bugüne sayılıyor. */
function siraAni(t, bugun) {
  if (t.status === 'parcaBekliyor') return [bugun, 1, t.parcaSevk?.tarih || 0]
  if (Number.isFinite(t.plan?.tarih)) return [gunBasi(t.plan.tarih), 0, randevuSirasi(t.plan)]
  return [bugun, 2, t.createdAt || 0]
}

export function devamSirasi(isler = []) {
  const bugun = gunBasi()
  const an = new Map(isler.map((t) => [t, siraAni(t, bugun)]))
  const once = (a, b) => {
    const x = an.get(a)
    const y = an.get(b)
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
  }
  const serviste = isler.filter(siraServisteMi).sort(once)
  return [...serviste, ...isler.filter((t) => !siraServisteMi(t))]
}
