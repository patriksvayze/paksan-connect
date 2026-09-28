/* ==========================================================================
   Talep türleri

   Talep numarası türden okunabilsin diye her tür kendi ön ekini alıyor:

       SRV2508144821   servis talebi
       YPR2508144822   yedek parça talebi
       TKF2508144823   fiyat teklifi talebi

   Biçim: ÖNEK + YYAAGG + 4 hane, bitişik
   Böylece hem müşteri telefonda numarayı okurken hangi tür olduğunu
   söyleyebiliyor hem de kayıtlar veritabanında ön eke göre süzülebiliyor.
   Tarih parçası, arşivde göz kararı sıralamayı kolaylaştırıyor.
   ========================================================================== */

export const TALEP_TURLERI = {
  servis: {
    id: 'servis',
    onek: 'SRV',
    ad: 'Servis talebi',
    kisa: 'Servis',
    /* Ekrandaki rozet rengi — badge--* sınıfları.

       RENKLER BACKOFFICE’TEKİLERLE AYNI. Önceden uygulama servisi kırmızı,
       parçayı turuncu gösteriyordu; backoffice ise servisi turuncu, parçayı
       mor. Aynı talebe iki ekranda iki renk, telefonda konuşurken
       ("turuncu olan hangisiydi?") karışıklık üretiyordu.

       Servis kırmızı DEĞİL: kırmızı backoffice’te gecikme ünleminin rengi,
       ikisi yan yana gelince ekran baştan aşağı kırmızı görünüyordu. */
    ton: 'servis',
  },
  parca: {
    id: 'parca',
    onek: 'YPR',
    ad: 'Yedek parça talebi',
    kisa: 'Yedek parça',
    ton: 'parca',
  },
  satinalma: {
    id: 'satinalma',
    onek: 'TKF',
    ad: 'Fiyat teklifi talebi',
    kisa: 'Fiyat teklifi',
    ton: 'satinalma',
  },
}

/* SERVİSİM'İN RANDEVUSUNDA "NE YAPILACAK" SORULMUYOR: iş türden geliyor.
   Servis randevuda yalnız günü seçiyor (servis/ekranlar/TalepDetay.jsx →
   Randevu); müşterinin bildirimine giden "planlanan iş" bu yazı. Tek
   yerde duruyor, çünkü demo verisi de Servisim'in randevusunu bu
   biçimde yazıyor (backoffice/demoServis.js); ikinci bir kopyası Servisim
   metni değiştiğinde demoyu geride bırakırdı (25 Eylül 2026). */
export const RANDEVU_ISI = {
  servis: 'Servis ziyareti',
  parca: 'Parça teslimi',
}

export function talepTuru(tur) {
  return TALEP_TURLERI[tur] || TALEP_TURLERI.servis
}

/** SRV2508144821 biçiminde talep numarası üretir. */
export function talepNo(tur) {
  const t = talepTuru(tur)
  const d = new Date()
  const iki = (n) => String(n).padStart(2, '0')
  const tarih = `${iki(d.getFullYear() % 100)}${iki(d.getMonth() + 1)}${iki(d.getDate())}`
  const sira = String(Math.floor(1000 + Math.random() * 9000))
  return t.onek + tarih + sira
}

/* FİYAT TEKLİFİNDE MAKİNE YOK (25 Eylül 2026, kullanıcı sınaması Y1).

   Teklif müşterinin henüz sahip olmadığı ürün için. Connect'in talep
   formu makine seçimini her türde çiftçinin ilk makinesiyle
   başlatıyordu; teklif formunda makine kutusu hiç çizilmediği hâlde
   seçim kayda gidiyordu ("Süper Yunus teklifi · Makine: Orkinos 1270").
   25 Eylül öncesi Connect teklif kayıtlarında bu yüzden bir makine
   yazılı olabilir. Alan OKURKEN ayıklanıyor; depodaki kayıt yeniden
   yazılmıyor (taşımada NULL yazılır). Öteki türlere dokunulmuyor. */
export function makinesizTeklif(talep) {
  return talep?.tur === 'satinalma' && talep.makine ? { ...talep, makine: null } : talep
}

/* MÜŞTERİNİN GÖRDÜĞÜ DURUM ADI (25 Eylül 2026, kullanıcı sınaması).

   `planlandi` serviste randevu günü, yedek parçada gönderim günü
   demek; Connect ikisine de "Randevu verildi" yazıyordu. Kayıttaki
   kod değişmiyor, yalnız müşterinin gördüğü adın sözlük anahtarı
   (backoffice'teki veri.js → gorunenDurum gibi). `durum` verilmezse
   talebin bugünkü durumu; talebin geçmişindeki bir satır için o
   satırın durumu verilir. */
export function musteriDurumAnahtari(talep, durum = talep?.status || 'yeni') {
  return durum === 'planlandi' && talep?.tur === 'parca' ? 'talepDurum.planlandiParca' : 'talepDurum.' + durum
}

/* GEÇMİŞTE PARÇANIN YOLA ÇIKTIĞI SATIR (26 Eylül 2026, ikinci kullanıcı
   sınaması). Yedek parça personelinin "Parçayı Gönderdim"i geçmişe
   `parcaBekliyor` diye ikinci bir satır yazıyor (backoffice/veri.js →
   servisParcasiGonderildi); satır sevkin tarihini taşıyor. Connect onu
   "Makineniz için parça bekleniyor" diye ikinci kez yazıyordu. Backoffice
   ayırıyordu ama yalnız bugünkü sevke bakıyordu: talep yeniden açılıp
   yeni ziyaret kaydı gelince sevk arşive gidiyor (`oncekiKayitlar[]
   .parcaSevk`) ve eski ziyaretin satırı yine "hazırlanıyor" oluyordu.
   Arşivdeki sevkler de sayılıyor. */
export function sevkSatiriMi(talep, satir) {
  if (satir?.durum !== 'parcaBekliyor' || !satir.tarih) return false
  const sevkler = [talep?.parcaSevk, ...(talep?.oncekiKayitlar || []).map((k) => k?.parcaSevk)]
  return sevkler.some((s) => s?.tarih === satir.tarih)
}

/** Talebin geçmişindeki bir satırın müşteriye görünen adının anahtarı. */
export function gecmisSatiriAnahtari(talep, satir) {
  return sevkSatiriMi(talep, satir) ? 'talepDurum.parcaYolda' : musteriDurumAnahtari(talep, satir?.durum)
}
