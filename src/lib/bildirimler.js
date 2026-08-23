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

export const BILDIRIM_TURU = {
  TALEP: 'talep',
  DUYURU: 'duyuru',
  UYARI: 'uyari',
  RANDEVU: 'randevu',
}

/* Randevu hatırlatması kaç saat önce çıksın.

   Çiftçi bildirimi anında görmüyor; tarlada olabilir. Randevudan bir
   gün önce ekranın tepesinde duran bir hatırlatma, "unuttum" ihtimalini
   düşürüyor. Hatırlatma saklanmıyor — uygulama her açıldığında
   randevunun tarihine bakılıp üretiliyor. */
const HATIRLATMA_SAAT = 24

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
export function bildirimListesi({ requests = [], kampanyaIzni = false } = {}) {
  /* Yaklaşan randevular — backoffice’ten planlanan servis/parça işleri */
  const randevular = requests
    .filter((r) => r.plan?.tarih && r.status === 'planlandi')
    .filter((r) => {
      const kalan = r.plan.tarih - Date.now()
      /* Bir gün kala çıkıyor, randevu saatinden 12 saat sonra düşüyor */
      return kalan <= HATIRLATMA_SAAT * 3600000 && kalan > -12 * 3600000
    })
    .map((r) => ({
      id: 'randevu-' + r.id,
      tur: BILDIRIM_TURU.RANDEVU,
      baslikAnahtar: 'bildirimler.randevuBaslik',
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
    metinAnahtar: 'bildirimler.talepAlindiAlt',
    degerler: { tur: r.tur, no: r.no },
    tarih: r.createdAt,
    /* Dokunulunca talebin kendi ekranına gidiliyor */
    yol: '/talebim/' + r.id,
  }))

  /* Backoffice’ten gelenler. Kampanya duyurusu yalnızca izin verene gidiyor;
     hizmete ilişkin bildirim (talep durumu, güvenlik uyarısı) izinden
     bağımsız. Bu ayrım KVKK / ticari elektronik ileti kuralı. */
  const backofficeden = load('duyurular', [])
    .filter((d) => (d.tur === 'duyuru' ? kampanyaIzni : true))
    .map((d) => ({
      id: 'duyuru-' + d.id,
      tur: d.tur === 'uyari' ? BILDIRIM_TURU.UYARI
        : d.tur === 'talep' ? BILDIRIM_TURU.TALEP
        : BILDIRIM_TURU.DUYURU,
      /* Personelin elle yazdığı duyuru hazır metin; uygulamanın
         ürettiği otomatik bildirim sözlük anahtarı taşıyor ki müşterinin
         kendi dilinde çıksın. */
      baslik: d.baslik,
      metin: d.metin,
      gorsel: d.gorsel || null,
      baslikAnahtar: d.baslikAnahtar,
      metinAnahtar: d.metinAnahtar,
      degerler: d.degerler,
      talepNo: d.talepNo || null,
      tarih: d.tarih,
      /* Nereye gideceği bildirimin ne olduğuna bağlı:

           talep durumu  → o talebin kendisi (silinmişse gitmiyor)
           numara        → profildeki hesap bilgileri
           görüş cevabı  → gidilecek yer yok, okunup geçiliyor
           duyuru        → gidilecek yer yok                        */
      ...yonlendir(d, requests),
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
function yonlendir(d, requests) {
  if (d.talepNo) {
    const talep = requests.find((r) => r.no === d.talepNo)
    /* Müşteri talebi silmişse bildirim artık bir yere gitmiyor */
    if (!talep) return { yol: null, durum: null }
    return { yol: '/talebim/' + talep.id, durum: null }
  }
  if (d.tur === 'numara') return { yol: '/profil', durum: { odak: 'hesap' } }
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
