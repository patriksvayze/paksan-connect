/* ==========================================================================
   Bildirim listesi

   Sunucu olmadığı için ekranda gösterilen bildirimler UYDURULMUYOR —
   uygulamanın kendi bildiği gerçek olaylardan üretiliyor. Şu an tek
   kaynak var: oluşturulan talepler. Her talep için "talebiniz alındı"
   satırı çıkıyor; talep silinirse satırı da gidiyor.

   Sunucu bağlandığında buraya iki kaynak daha eklenecek: talebin durumu
   değiştiğinde gelen bildirimler ve Paksan'ın duyuruları
   (bkz. PRODA-CIKIS.md → A1g).

   Okundu bilgisi hesapla birlikte saklanıyor (`okunanBildirimler`), tek
   tek kimlik listesi hâlinde. Böylece okunmuş bir satır uygulama
   kapanıp açılınca yeniden okunmamış görünmüyor.
   ========================================================================== */

import { load } from './storage'
import { duyuruGecerliMi } from './duyuruHedef.js'
import { makinelereServisEkle } from './servisAtama.js'
import { yurtdisiTalepMi } from './ihracat'
import { formatSerial, normalizeSerial } from './serial'
import { randevuSaatliMi } from './tarih'

export const BILDIRIM_TURU = {
  TALEP: 'talep',
  DUYURU: 'duyuru',
  UYARI: 'uyari',
  RANDEVU: 'randevu',
  /* Müşterinin makinesiyle ilgili kişisel bildirim (21 Eylül 2026):
     makinenin servisiyle ilgili üç hâli var — servis atandı, servis
     değişti, servis yeniden belirleniyor (backoffice/veri.js →
     makineAtamasiniKaydet). Listede her makinenin yalnız son hâli
     duruyor (aşağıda sonAtamaBildirimleri). Duyuru türüne düşseydi
     satırda "Kampanya" etiketi çıkardı; talep türüne düşseydi talep
     ikonu. */
  MAKINE: 'makine',
}

/* BİR MAKİNE İÇİN YALNIZ SON ATAMA BİLDİRİMİ (25 Eylül 2026, kullanıcı
   sınaması). "Makinenize servis atandı" bir olay değil, makinenin
   bugünkü durumu. Personel yanlış servisi seçip düzeltince çiftçinin
   listesinde iki servis adı yan yana duruyordu ve hangisinin geçerli
   olduğunu hiçbir şey söylemiyordu. Aynı makinenin (seri numarasıyla)
   daha eski atama bildirimi listeden düşüyor; yenisi "değişti" ya da
   "yeniden belirleniyor" diyor (backoffice/veri.js →
   makineAtamasiniKaydet). Kayıt silinmiyor. Depo yeniden eskiye sıralı
   (musteriyeBildir başa ekliyor): ilk görülen en yenisi — saati donmuş
   sınamada da. Depoya SONA ekleyen bir yazma yolu açılırsa bu kural
   bozulur. Serisiz makinede birleştirme yok. */
function sonAtamaBildirimleri(liste) {
  const gorulen = new Set()
  return liste.filter((d) => {
    if (d.tur !== 'makine') return true
    const seri = normalizeSerial(d.degerler?.seri)
    if (!seri) return true
    if (gorulen.has(seri)) return false
    gorulen.add(seri)
    return true
  })
}

/* Randevu hatırlatması kaç saat önce çıksın.

   Çiftçi bildirimi anında görmüyor; tarlada olabilir. Randevudan bir
   gün önce ekranın tepesinde duran bir hatırlatma, "unuttum" ihtimalini
   düşürüyor. Hatırlatma saklanmıyor — uygulama her açıldığında
   randevunun tarihine bakılıp üretiliyor. */
const HATIRLATMA_SAAT = 24

/* Randevu saatinden kaç saat sonra hatırlatma listeden düşsün. Adı
   olan bir sabit, çünkü veritabanı tohumu değeri buradan okuyor
   (veritabani/tohum/kaynak/ayarlar.json → RandevuHatirlatmaSonraSaati;
   önce satır içi "-12 * 3600000" diye yazılıydı).

   Saati belli olmayan (yalnız gün) randevu günün sonuna kadar duruyor:
   zamanı günün başı, gün GUN_SAAT sonra bitiyor (aşağıda randevular). */
const HATIRLATMA_SONRA_SAAT = 12
const GUN_SAAT = 24

/**
 * Uygulamanın bildiklerinden bildirim listesi üretir — en yeni en üstte.
 *
 * İki kaynak var:
 *   1. Kullanıcının kendi oluşturduğu talepler ("talebiniz alındı")
 *   2. PAKSAN backoffice'ten gelenler: talebin durumu değiştiğinde
 *      gönderilen bildirimler, güvenlik uyarıları ve kampanya duyuruları
 *
 * @param {{requests: array, kampanyaIzni: boolean}} kaynak
 */
export function bildirimListesi({ requests = [], user = null, makineler = [] } = {}) {
  /* Yaklaşan randevular — backoffice’ten planlanan servis/parça işleri */
  const randevular = requests
    .filter((r) => r.plan?.tarih && r.status === 'planlandi')
    .filter((r) => {
      const kalan = r.plan.tarih - Date.now()
      /* Bir gün kala çıkıyor, randevu saatinden 12 saat sonra düşüyor.

         SAATSİZ RANDEVU GÜN BOYU (25 Eylül 2026, kullanıcı sınaması).
         Servisim randevuda yalnız gün soruyor; o randevunun zamanı
         günün başı (lib/tarih.js → gunlukRandevu). "12 saat sonra"
         kuralı onu öğlen düşürüyordu — servis akşamüstü gelecekken.
         Saati belli olmayan randevu günün sonuna kadar duruyor. */
      const bitis = (randevuSaatliMi(r.plan) ? HATIRLATMA_SONRA_SAAT : GUN_SAAT) * 3600000
      return kalan <= HATIRLATMA_SAAT * 3600000 && kalan > -bitis
    })
    .map((r) => ({
      id: 'randevu-' + r.id,
      tur: BILDIRIM_TURU.RANDEVU,
      /* Yedek parçada `planlandi` gönderim günü demek, randevu değil
         (25 Eylül 2026, kullanıcı sınaması: parça talebinde "Yaklaşan
         Randevunuz" yazıyordu). Metin ("{tarih} · {is}") iki türde de
         doğru. */
      baslikAnahtar: r.tur === 'parca' ? 'bildirimler.gonderimBaslik' : 'bildirimler.randevuBaslik',
      metinAnahtar: 'bildirimler.randevuMetin',
      degerler: { no: r.no, tarih: r.plan.tarihYazi, is: r.plan.is },

      /* SABİT: bu satır listenin içinde değil, listenin ÜSTÜNDE ayrı
         bir kart olarak duruyor (bkz. src/screens/Notifications.jsx).

         Önceden zamanı geleceğe kurulup listenin başına
         zorlanıyordu. Sonuç: yeni gelen bildirim ikinci sıraya
         düşüyordu. Bildirim listesinde en üstteki satırın en yeni
         olması bir alışkanlık değil, beklenti — o bozulunca müşteri
         "bildirim gelmemiş" diye düşünüp bakmayı bırakıyor.

         Hatırlatma artık listeyi bozmuyor: kendi kartında, kendi
         başlığıyla, listenin dışında. */
      sabit: true,
      tarih: r.plan.tarih,
      yol: '/talebim/' + r.id,
    }))

  const kendi = requests.map((r) => ({
    id: 'talep-' + r.id,
    tur: BILDIRIM_TURU.TALEP,
    /* Ekranda gösterilecek yazılar sözlükten geliyor; burada yalnızca
       hangi yazının hangi değerlerle kullanılacağı duruyor. Böylece bu
       dosya dilden bağımsız kalıyor. */
    baslikAnahtar: 'bildirimler.talepAlindi',
    /* ARAMA SÖZÜ YALNIZ FİYAT TEKLİFİNDE (29 Eylül 2026, görünüm önerisi
       C8). Her türe "En kısa sürede sizi arayacağız" yazıyordu; oysa
       talebin başarı ekranı servis ve parçada bilerek arama sözü vermiyor
       (RequestForm.jsx: randevu bildirimle gidiyor, parça kargoya
       veriliyor). Çiftçi gelmeyecek bir aramayı bekliyordu. Servis ve
       parçada başarı ekranının cümlesi, teklifte arama sözü. */
    metinAnahtar: r.tur === 'satinalma' ? 'bildirimler.talepAlindiAlt' : 'talep.uygulamadanBilgi',
    degerler: { tur: r.tur, no: r.no },
    tarih: r.createdAt,
    /* Dokunulunca talebin kendi ekranına gidiliyor */
    yol: '/talebim/' + r.id,
  }))

  /* Backoffice’ten gelenler. Kampanya duyurusu yalnızca izin verene gidiyor;
     hizmete ilişkin bildirim (talep durumu, güvenlik uyarısı) izinden
     bağımsız. Bu ayrım KVKK / ticari elektronik ileti kuralı. */
  /* Makineye bakan servis ekleniyor: servis seçilmiş duyuru o servisin
     baktığı makinelerin sahiplerine gidiyor (lib/duyuruHedef.js). */
  const servisli = makinelereServisEkle(makineler)
  /* Kime gideceği kararı tek yerde: src/lib/duyuruHedef.js. Kampanya
     izni, yurtdışı ve hedefleme kuralları orada. Talep ve numara
     bildirimleri o yardımcıdan hiç süzülmüyor; onlar zaten kişiye
     özel üretiliyor. Aynı makinenin eski atama bildirimleri ardından
     düşüyor (yukarıda sonAtamaBildirimleri). */
  const backofficeden = sonAtamaBildirimleri(
    load('duyurular', []).filter((d) =>
      duyuruGecerliMi(d, { user, makineler: servisli, yurtdisi: yurtdisiTalepMi(user) }),
    ),
  )
    .map((d) => ({
      id: 'duyuru-' + d.id,
      tur: d.tur === 'uyari' ? BILDIRIM_TURU.UYARI
        : d.tur === 'talep' ? BILDIRIM_TURU.TALEP
        : d.tur === 'makine' ? BILDIRIM_TURU.MAKINE
        : BILDIRIM_TURU.DUYURU,
      /* Personelin elle yazdığı duyuru hazır metin; uygulamanın
         ürettiği otomatik bildirim sözlük anahtarı taşıyor ki müşterinin
         kendi dilinde çıksın. */
      baslik: d.baslik,
      metin: d.metin,
      gorsel: d.gorsel || null,
      /* Alt tür ekrana kadar taşınıyor: bildirim satırının ikonu ve
         rengi ona göre çıkıyor (bkz. screens/Notifications.jsx).
         Duyuru olmayan kayıtlarda yok ve olmaması doğru. */
      alt: d.alt || null,
      baslikAnahtar: d.baslikAnahtar,
      metinAnahtar: d.metinAnahtar,
      degerler: d.degerler,
      talepNo: d.talepNo || null,
      tarih: d.tarih,
      /* Nereye gideceği bildirimin ne olduğuna bağlı:

           talep durumu  → o talebin kendisi (silinmişse gitmiyor)
           numara        → profildeki hesap bilgileri
           servis ataması→ o makinenin ekranı (silinmişse listesi)
           görüş cevabı  → gidilecek yer yok, okunup geçiliyor
           duyuru        → gidilecek yer yok                        */
      ...yonlendir(d, requests, makineler),
    }))

  /* Sabit satırlar önde döndürülüyor ki ekran onları ayırabilsin;
     geri kalan her şey saf zaman sırasında — en yeni en üstte. */
  const akis = [...kendi, ...backofficeden].sort((a, b) => b.tarih - a.tarih)
  return [...randevular, ...akis]
}

/** Listeyi ekranın kullandığı iki öbeğe ayırır. */
export function bildirimleriAyir(liste) {
  return {
    sabitler: liste.filter((b) => b.sabit),
    akis: liste.filter((b) => !b.sabit),
  }
}

/* Backoffice’ten gelen bildirimin dokunulunca nereye gideceği.

   ÖNEMLİ: talep bildirimleri artık profildeki listeye değil, TALEBİN
   KENDİ EKRANINA gidiyor. Eskisi kullanıcıyı listeye atıyordu; orada
   yalnız durum yazısı vardı. "Talebiniz iptal edildi" bildirimine
   dokunan kişi yine "İptal" yazısını görüyor, sebebini
   öğrenemiyordu — dokunmanın hiçbir karşılığı yoktu.

   Bildirim bir yere gidemiyorsa (talep silinmiş, görüş cevabı, duyuru)
   `yol` boş kalıyor ve satır tıklanınca yalnızca okundu işaretleniyor.
   Ekranda da o satır ok işareti göstermiyor — dokunmanın bir şey
   yapacağı izlenimi verilmiyor. */
function yonlendir(d, requests, makineler = []) {
  if (d.talepNo) {
    const talep = requests.find((r) => r.no === d.talepNo)
    /* Müşteri talebi silmişse bildirim artık bir yere gitmiyor */
    if (!talep) return { yol: null, durum: null }
    return { yol: '/talebim/' + talep.id, durum: null }
  }
  if (d.tur === 'numara') return { yol: '/profil', durum: { odak: 'hesap' } }
  /* Servis ataması: makine seri numarasıyla bulunuyor, çünkü PAKSAN'ın
     defteri telefondaki makinenin kimliğini bilmiyor. Müşteri makineyi
     telefonundan silmişse makine listesi açılıyor. */
  if (d.tur === 'makine') {
    const aranan = normalizeSerial(d.degerler?.seri)
    const makine = aranan && makineler.find((m) => normalizeSerial(m.serial) === aranan)
    return { yol: makine ? '/makine/' + makine.id : '/makinelerim', durum: null }
  }
  return { yol: null, durum: null }
}

export function okunmamisSayisi(liste, okunanlar = []) {
  const set = new Set(okunanlar)
  return liste.filter((b) => !set.has(b.id)).length
}

/* Tarih başlıkları: bugün / dün / bu hafta / daha eski.
   Bildirim ekranlarının hepsinde olan gruplama; uzun listede tarih
   aramak yerine göz doğrudan doğru öbeğe gidiyor. */
export function tarihObegi(zaman, simdi = Date.now()) {
  const gun = 86400000
  const bugunBas = new Date(simdi).setHours(0, 0, 0, 0)
  if (zaman >= bugunBas) return 'bugun'
  if (zaman >= bugunBas - gun) return 'dun'
  if (zaman >= bugunBas - 7 * gun) return 'buHafta'
  return 'daha'
}

export const OBEK_SIRASI = ['bugun', 'dun', 'buHafta', 'daha']

/* Sözlük anahtarı taşıyan bildirimin yazısını çözer.

   İki kaynak var: uygulamanın kendi ürettiği ("talebiniz alındı") ve
   backoffice’ten gelen otomatik durum bildirimi. İkisi de anahtar taşıyor ki
   müşterinin kendi dilinde çıksın; personelin elle yazdığı duyuru ise
   hazır metin olarak geliyor.

   Önce Bildirimler ekranının içindeydi; telefonun bildirim perdesine
   giden yazı (lib/bildirimYayini.js) türün adını çevirmeden basıyordu:
   "satinalma alındı" (22 Eylül 2026, kullanıcı bildirdi). İkisi artık
   bu tek işlevi kullanıyor. */
export function bildirimYazisi(t, b, dil, hangi) {
  const anahtar = b[hangi]
  if (!anahtar) return ''
  const d = b.degerler || {}
  const turAnahtar = d.tur || d.talepTur
  /* BAŞLIKLAR TEK DÜZENDE (29 Eylül 2026, görünüm önerisi C8). Öteki
     bildirimler "Makinenize Servis Atandı" diye yazılırken talep
     bildirimi "Servis talebi alındı" diyordu; aynı listede iki düzen
     vardı. Tür adı artık talebin başlığından ("Servis Talebi"). Önce
     `adi` kullanılıyordu, çünkü fiyat teklifinin başlığı bir düğme
     yazısıydı ("Fiyat Teklifi İste" → "Fiyat teklifi iste alındı");
     o başlık artık bir ad.

     SERİ NUMARASI TİRELİ. Atama bildirimi seriyi defterdeki hâliyle
     taşıyor ("HMR2024-00123"); ekranın her yerinde "HMR-2024-00123"
     yazıyor (lib/serial.js → formatSerial). */
  return t(anahtar, {
    ...d,
    ...(d.seri ? { seri: formatSerial(d.seri) } : {}),
    tur: turAnahtar ? t(`talep.${turAnahtar}.baslik`) : '',
  })
}
