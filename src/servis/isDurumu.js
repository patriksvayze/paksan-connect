import { gecikmisMi } from '../backoffice/veri'

/* ==========================================================================
   Servisim'de bir işin hangi bölümde durduğu ve gecikip gecikmediği

   İşlerim iki bölüm: "Yeni" (servisin henüz el sürmediği iş) ve "Devam
   Eden" (geri kalan açık işler). Kural burada, ekran ServisPanel.jsx'te;
   ayrı dosyada olmasının sebebi sınanabilmesi (tools/ekosistem → AK-17).
   ========================================================================== */

/* Servisin henüz el sürmediği iş: randevu verilmemiş, kayıt açılmamış,
   PAKSAN'a devredilmemiş, parça ya da onay beklemiyor. */
export function dokunulmamis(t) {
  return (
    !t.plan &&
    !t.servisKaydi &&
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
