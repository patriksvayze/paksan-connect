/* ==========================================================================
   Sınamanın dünyası

   Her senaryo temiz depoyla başlıyor ve gereken parçayı buradan
   tohumluyor. Demo verisi (src/backoffice/demo.js, src/servis/demoKur.js)
   dünya olarak KULLANILMIYOR: o veri her seferinde rastgele üretiliyor ve
   bir sınamanın beklentisi rastgele bir sayıya dayanamaz. Demonun
   kendisini AK-34 sınıyor (25 Eylül 2026): üç tohumla kuruyor ve
   iddiaları sayıya değil kurala bakıyor (parça makinenin mi, garanti
   notu garantideki makinede mi).

   Kimlikler uydurma değil, kataloğun kendisinden: `konya-servis` ve
   `ankara-servis` src/data/katalog/servisler.js içinde gerçekten var,
   `konya-merkez` ve `ankara` da bayiler.js içinde. Katalog değişirse
   sınama düşer — ve düşmesi doğrudur, çünkü o zaman zincir de değişmiş
   demektir.
   ========================================================================== */

/* KVKK metinlerinin bugünkü sürümü (src/data/kvkk.js → KVKK_SURUM).
   Hesap eski sürümü onaylamışsa Connect açılışta yeniden onay penceresi
   gösteriyor (components/KvkkGuncelleme.jsx); tohumun hesabı güncel
   olmalı, yoksa ekran turundaki her Connect adımı o pencerenin arkasında
   kalır. Burada düz yazılı çünkü bu dosya modül yüklenmeden okunuyor;
   AK-37 ikisinin aynı olduğunu denetliyor — metin sürümü artınca
   AK-37 düşer, bu satır güncellenir. */
export const KVKK_SURUMU = '1.1'

/* Seri numaraları defterde GELDİĞİ GİBİ duruyor; okuma normalize
   ediliyor (bkz. lib/servisAtama.js). AK-02 tam bu yüzden aynı seriyi
   üç ayrı yazımla arıyor. */
export const SERI = {
  atanmis: 'ORK1270-2024-00157',
  bayili: 'ORK1270-2024-00312',
  sahipsiz: 'ORK1270-2024-00999',
}

export const SERVIS = {
  id: 'konya-servis',
  no: 'SRV001',
  ad: 'Selçuk Tarım Servisi',
  il: 'Konya',
}

export const BAYI = { atanmis: 'konya-merkez', bayili: 'ankara' }
export const BAYI_SERVISI = 'ankara-servis'

export const MUSTERI = {
  id: 'msc-1',
  no: 'MST000001',
  /* createdAt ZORUNLU, süs değil. Backoffice müşteri listesi tarih
     aralığıyla süzüyor ve varsayılan "Tüm zamanlar" bile
     `zaman >= 0` karşılaştırması yapıyor (ekranlar/suzgec.jsx:100-103);
     alan yoksa `undefined >= 0` YANLIŞ döner ve müşteri hiçbir süzgeçte
     görünmez — üstelik ekran "Bu süzgeçle müşteri bulunamadı" diyerek
     suçu süzgece atar. Gerçek kayıtta AppState.jsx:176 bu alanı
     yazıyor; fiş de yazmalı. Ekran turu B-03 bunu yakaladı. */
  createdAt: 1787293350000,
  ad: 'Ahmet Çiftçi',
  adi: 'Ahmet',
  soyadi: 'Çiftçi',
  ulke: 'TR',
  tel: '5321112233',
  konumUlke: 'TR',
  il: 'Konya',
  ilce: 'Selçuklu',
  adres: 'Konya ovası, 14. km',
  onaylar: { aydinlatma: true, acikRiza: true, kampanya: true, surum: KVKK_SURUMU, tarih: 0 },
}

/* İkinci müşteri "bildirim yanlış kişiye gitti mi" sorusu için (AK-07).
   TELEFONUN SON DÖRT HANESİ BİRİNCİYLE AYNI, BİLEREK. Eşleşme telefonla
   yapılıyor (veri.js:947) ve gevşetilmiş bir eşleşme —örneğin son dört
   haneye bakmak— bildirimi yanlış kişiye gönderir; KVKK açısından da bir
   sızıntıdır. Haneler farklı seçilseydi o bozma sınamadan görünmeden
   geçerdi. Bir kez öyle oldu: bozma turu senaryoyu yakalayamadı ve
   fişler bu yüzden değiştirildi. */
export const MUSTERI2 = {
  id: 'msc-2',
  no: 'MST000002',
  createdAt: 1787293350000,
  ad: 'Zeynep Yılmaz',
  adi: 'Zeynep',
  soyadi: 'Yılmaz',
  ulke: 'TR',
  tel: '5339992233',
  konumUlke: 'TR',
  il: 'Ankara',
  ilce: 'Polatlı',
  onaylar: { aydinlatma: true, acikRiza: true, kampanya: true, surum: KVKK_SURUMU, tarih: 0 },
}

export const PERSONEL = {
  personelId: 'prs-1',
  ad: 'Sınama Yöneticisi',
  kullanici: 'admin',
  rol: 'admin',
}

/* Parça rolündeki ikinci personel: rol bazlı menü (ekran turu B-ROL) ve
   "oturum sekmeye ait" sınaması için. Kaydı da yazılıyor (bkz.
   personelKaydiEkle); kaydı olmayan kişinin oturumu kabul edilmeyecek. */
export const PARCA_PERSONELI = {
  personelId: 'prs-2',
  ad: 'Parça Personeli',
  kullanici: 'parca',
  rol: 'parca',
}

/* -------------------------------------------------------------------- */

/** Müşteri hesabı + açık oturum. Connect'in "giriş yapılmış" hâli. */
export function musteriKur(m, kisi = MUSTERI) {
  m.depo.save('hesap', kisi)
  m.depo.oturumKaydet('user', kisi)
  return kisi
}

/**
 * Personel kaydı (backoffice'in `personel` deposu).
 *
 * OTURUM PERSONEL KAYDINA BAĞLI (25 Eylül 2026, kullanıcı sınaması O6).
 * Backoffice oturumu her okumada personel kaydına bakacak: kaydı
 * olmayan ya da kapatılmış kişinin oturumu düşecek, rol ve ad kayıttan
 * gelecek. Fiş bir dönem yalnız oturumu yazıyordu; o denetim gelince
 * ekran turundaki bütün backoffice ekranları giriş ekranına düşerdi.
 *
 * Şifre yazılmıyor: kimse bu kayıtla giriş yapmıyor, oturum doğrudan
 * tohumlanıyor. Aynı kimlik varsa yerinde değiştirilir; iki kez
 * çağrılınca ikinci satır açılmaz.
 */
export function personelKaydiEkle(m, kisi) {
  const kayit = {
    id: kisi.personelId,
    ad: kisi.ad,
    kullanici: kisi.kullanici,
    rol: kisi.rol,
    aktif: true,
  }
  const liste = m.depo.load('personel', [])
  const yeni = liste.some((p) => p.id === kayit.id)
    ? liste.map((p) => (p.id === kayit.id ? kayit : p))
    : [...liste, kayit]
  m.depo.save('personel', yeni)
  return kayit
}

/**
 * Personel oturumu ve kaydı. `rol` verilmezse tam yetkili admin; kişi
 * verilmezse PERSONEL. Kayıt oturumla aynı rolü taşır: rol kayıttan
 * okunacağı için ikisi ayrışırsa oturum sessizce başka rolle açılırdı.
 */
export function personelKur(m, rol = 'admin', kisi = PERSONEL) {
  personelKaydiEkle(m, { ...kisi, rol })
  const oturum = { ...kisi, rol, giris: Date.now() }
  m.depo.save('panelOturum', oturum)
  return oturum
}

/**
 * Servis oturumu.
 *
 * ALAN ADI `servisId`, `id` DEĞİL. `servisOturumuGetir()` (veri.js:2688)
 * oturumu yalnız `servisId` doluysa kabul ediyor. Burada bir dönem
 * `{ ...SERVIS }` yazılıyordu, yani `id` — veri katmanı sınaması bunu
 * göremedi çünkü hiçbir senaryo o fonksiyonu çağırmıyor; ekran turunda
 * Servisim giriş ekranında kalınca ortaya çıktı. AK-10 artık oturumun
 * gerçekten kabul edildiğini de doğruluyor.
 *
 * `ilkGiris` yanlış olmak zorunda, yoksa uygulama şifre değiştirme
 * ekranında kalır (bkz. servis/ServisPanel.jsx).
 */
export function servisKur(m) {
  const oturum = {
    servisId: SERVIS.id,
    no: SERVIS.no,
    ad: SERVIS.ad,
    il: SERVIS.il,
    ilkGiris: false,
    giris: Date.now(),
  }
  m.depo.oturumKaydet('servisOturum', oturum)
  /* Gizlilik metinleri kabul edilmiş (29 Eylül 2026). Kabul edilmemiş
     servis işlerini değil kabul ekranını görüyor (ServisPanel.jsx →
     GizlilikKapisi); ekran turu kapının kendisini X-09'da ayrıca
     sınıyor. Gerçek işlevle yazılıyor: sürümü o belirliyor. */
  m.servisGizlilik.servisKabulunuKaydet(oturum, 'servisimIlkGiris')
  return oturum
}

/**
 * Makine kayıt defteri — servis atama zincirinin kökü.
 * Üç satır, üç dal: elle atanmış servis, yalnız bayi, hiçbiri.
 */
export function defterKur(m, urunId) {
  const satir = (seri, servisId, servisAd, bayiId) => ({
    id: m.depo.uid(),
    tarih: Date.now(),
    seri,
    productId: urunId,
    musteriId: MUSTERI.id,
    musteriNo: MUSTERI.no,
    musteriAd: MUSTERI.ad,
    il: MUSTERI.il,
    ilce: MUSTERI.ilce,
    bayiId,
    bayiAd: bayiId ? m.marka.bayiAdi(bayiId) : '',
    servisId,
    servisAd,
    uretimTarihi: null,
    faturaTarihi: null,
    logoBildi: false,
    yeniSatis: false,
    kaynak: 'musteri',
  })

  m.depo.save('makineKayitlari', [
    satir(SERI.atanmis, SERVIS.id, SERVIS.ad, BAYI.atanmis),
    satir(SERI.bayili, null, '', BAYI.bayili),
    satir(SERI.sahipsiz, null, '', null),
  ])
}

/** Müşterinin kendi makine listesi (Connect'in `machines` deposu). */
export function makineleriKur(m, urunId) {
  const makine = (id, seri) => ({
    id,
    productId: urunId,
    serial: seri,
    year: 2024,
    nickname: '',
    addedAt: Date.now(),
    hours: 0,
    doneMaintenance: [],
  })
  const liste = [
    makine('mk-atanmis', SERI.atanmis),
    makine('mk-bayili', SERI.bayili),
    makine('mk-sahipsiz', SERI.sahipsiz),
  ]
  m.depo.save('machines', liste)
  return liste
}

/**
 * Tam dünya: müşteri, makineler, defter, personel (kaydı ve oturumu)
 * ve servis oturumu.
 * Senaryoların çoğu bununla başlıyor.
 */
export function dunyaKur(m) {
  const urunId = m.marka.PRODUCTS[0].id
  const kisi = musteriKur(m)
  const makineler = makineleriKur(m, urunId)
  defterKur(m, urunId)
  personelKur(m)
  servisKur(m)
  return { urunId, kisi, makineler }
}

/**
 * Connect'ten açılmış gibi bir talep verisi.
 * `addRequest`'in aldığı `data` ne ise o — kaydı `talepKaydiOlustur`
 * kuruyor, depoya yazmayı senaryo yapıyor.
 */
export function talepVerisi(tur, urunId, makine, ek = {}) {
  return {
    tur,
    ad: MUSTERI.ad,
    tel: MUSTERI.tel,
    telUlke: 'TR',
    telHam: MUSTERI.tel,
    il: MUSTERI.il,
    ilce: MUSTERI.ilce,
    adres: MUSTERI.adres,
    musteriId: MUSTERI.id,
    makine: makine ? { id: makine.id, serial: makine.serial, productId: urunId } : null,
    urunId,
    aciklama: 'Sınama talebi',
    belirtiler: [],
    ekler: [],
    ...ek,
  }
}

/** Talebi Connect'in yazdığı yere koyar (`requests` deposu). */
export function talebiYaz(m, kayit) {
  m.depo.save('requests', [kayit, ...m.depo.load('requests', [])])
  return kayit
}
