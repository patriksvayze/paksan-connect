/* ==========================================================================
   Form envanteri — boş gönderim deftere ne yazıyor?

   Ekran turu formların AÇILDIĞINI doğruluyor. Bu liste bir adım öteye
   gidiyor ve tek bir soru soruyor:

       Form boşken asıl eylem düğmesine basılırsa KAYIT YAZILIYOR MU?

   Cevap "hayır" olmalı. Yazılıyorsa müşteri boş bir talep açabiliyor,
   servis boş bir sipariş verebiliyor, personel boş bir duyuru
   yayınlayabiliyor demektir — üçü de canlıda sessizce birikir ve
   PAKSAN onlara bakarak karar alır.

   NEDEN METNE BAKILMIYOR. "Adınızı yazın" gibi uyarı cümleleri Codex'in
   alanı ve sınır yenilendiğinde yeniden yazılacaklar. Uyarı metnini
   arayan bir sınama o gün topluca kırmızıya dönerdi. Burada sorulan şey
   metin değil DAVRANIŞ: defterin satır sayısı değişti mi.

   NEDEN `requestSubmit()` DEĞİL. Ölçüldü: müşteri ve servis ekranlarında
   `<form>` etiketi HİÇ kullanılmıyor (Register, Login, AddMachine,
   RequestForm, NumaraDegisikligi, SiparisVer, ElleKayit, Duyurular —
   sekizinde de sıfır). Düğmeler `onClick` ile çalışıyor. Bu yüzden asıl
   eylem düğmesi ev düzeninin sınıfından bulunuyor: Connect'te
   `.btn--primary` / `.btn--orange`, Servisim ve backoffice'te `.dg--ana`.
   Sınıf değişirse tur "ERİŞİLEMEDİ" der — sessizce geçmez.

   ŞİFRE YAZILMIYOR. Kayıt ve giriş formlarında yalnız BOŞ gönderim
   deneniyor; geçerli bir giriş denemesi parola yazmayı gerektirirdi ve
   bu projede tarayıcı sınaması parola yazmıyor (bkz. CLAUDE.md).
   Zaten değerli olan olumsuz hâl: boş form kayıt açmamalı.

   `defter`  değişmemesi gereken depo anahtarı
   `bicim`   'liste' → satır sayısı artmamalı, 'tekil' → varlığı değişmemeli
   ========================================================================== */

export const FORMLAR = [
  {
    kod: 'F-01',
    ad: 'Kayıt Ol — boş gönderim',
    uygulama: 'connect',
    oturumsuz: true,
    yol: '/kayit',
    dugme: '.btn--orange',
    defter: 'hesap',
    bicim: 'tekil',
  },
  {
    kod: 'F-02',
    ad: 'Giriş — boş gönderim',
    uygulama: 'connect',
    oturumsuz: true,
    yol: '/giris',
    dugme: '.btn--orange',
    defter: 'hesap',
    bicim: 'tekil',
  },
  {
    kod: 'F-03',
    ad: 'Makine Ekle — boş seri',
    uygulama: 'connect',
    yol: '/makine-ekle',
    dugme: '.btn--primary',
    defter: 'machines',
    bicim: 'liste',
  },
  {
    kod: 'F-04',
    ad: 'Servis Talebi — boş gönderim',
    uygulama: 'connect',
    yol: '/talep?tur=servis',
    dugme: '.btn--primary',
    defter: 'requests',
    bicim: 'liste',
  },
  {
    kod: 'F-05',
    ad: 'Yedek Parça Talebi — boş gönderim',
    uygulama: 'connect',
    yol: '/talep?tur=parca',
    dugme: '.btn--primary',
    defter: 'requests',
    bicim: 'liste',
  },
  {
    /* BOŞ GÖNDERİM BURADA KASITLI — 18 Eylül 2026, kullanıcının kararı.

       Fiyat teklifi formunda doğrulama kapısı yok: `aciklamaZorunlu`
       yalnız servis ve parça için açılıyor (RequestForm.jsx:273-276) ve
       `urunId` boş geçilebiliyor (:652). Yani hiçbir ürün seçmeden
       gönderilen talep `urunId: null`, `aciklama: ""` ile satış
       masasına düşüyor.

       Bu sınama kurulurken kusur sanıldı ve kullanıcıya soruldu.
       Kullanıcının cevabı: "Fiyat teklifi taleplerinde hiçbir şey
       seçmeden de gönderilebilir, bunda pek sorun göremedim; amaç
       müşteriden talebi almak zaten. Satış ekibi talebi aldığında
       hemen arayıp bilgi verebilir ve alabilir."

       Gerekçe ekosistemin kuralıyla da uyuyor: teklifi servis değil
       bayi hazırlıyor ve iş telefonda yürüyor. Formu sıkılaştırmak,
       müşteriyi kaydı hiç açmadan geri çevirirdi.

       Bu yüzden sınamanın beklentisi TERS: burada kayıt YAZILMALI.
       Biri ileride kapı eklerse form yazmayı bırakacak, bu satır
       düşecek ve kararın yeniden okunmasını isteyecek. */
    kod: 'F-06',
    ad: 'Fiyat Teklifi — boş gönderim kasıtlı',
    uygulama: 'connect',
    yol: '/talep?tur=satinalma',
    dugme: '.btn--primary',
    defter: 'requests',
    bicim: 'liste',
    yazmasiBekleniyor: true,
  },
  {
    kod: 'F-07',
    ad: 'Numara Değişikliği — boş gönderim',
    uygulama: 'connect',
    yol: '/numara-degisikligi',
    /* Ölçüldü: bu form ortak NumaraTalepFormu bileşenini kullanıyor ve
       gönder düğmesi `.btn--orange` (NumaraTalepFormu.jsx:225). */
    dugme: '.btn--orange',
    defter: 'numaraTalepleri',
    bicim: 'liste',
  },
  {
    kod: 'F-08',
    ad: 'Servisim · Yeni Kayıt — boş gönderim',
    uygulama: 'servisim',
    sekme: 0,
    tikla: '.uyg__fab',
    dugme: '.dg--ana',
    defter: 'requests',
    bicim: 'liste',
  },
  {
    kod: 'F-09',
    ad: 'Servisim · Sipariş Ver — boş gönderim',
    uygulama: 'servisim',
    sekme: 1,
    tikla: '.uyg__fab',
    dugme: '.dg--ana',
    defter: 'requests',
    bicim: 'liste',
  },
  {
    kod: 'F-10',
    ad: 'Backoffice · Duyuru Yayınla — boş gönderim',
    uygulama: 'backoffice',
    menu: 10,
    dugme: '.dg--ana',
    defter: 'duyurular',
    bicim: 'liste',
  },
]
