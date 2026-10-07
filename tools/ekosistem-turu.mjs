/* ==========================================================================
   Ekosistem ekran turu — üç uygulamanın GEZİLEBİLİR YÜZEYİNİN TAMAMI

       node tools/ekosistem-turu.mjs [--adres http://localhost:3000] [--yalniz C-27,X-03]

   `--yalniz` yalnız adı verilen denetimleri koşturur (bozma denemesi
   için: bozuk dosya sunucuda üç dakika durmasın). Kapsam iddiası ancak
   tam koşuda bir şey ifade eder; `npm run dogrula` tam koşuyor.

   tools/ekosistem-sinamasi.mjs veri katmanını sınıyor: kayıt doğru
   kuruldu mu, doğru masaya düştü mü, cariye doğru tutar yazıldı mı.
   Doğru kaydın EKRANDA ÇIKTIĞINI kanıtlamıyor; doğru fonksiyonu çağırıp
   sonucu yanlış çizen —ya da hiç açılmayan— bir ekran oradan geçer.

   NE YAPIYOR

     1. Veri katmanını Node içinde koşturup gerçek bir dünya kuruyor
        (aynı tohum, aynı modüller), sonra o depoyu Chrome'a yazıyor.
     2. `ekosistem/ekranlar.mjs` envanterindeki HER ekranı sırayla
        açıyor. Her birinde üç şey: boş mu açıldı, hata verdi mi,
        beklenen ekili değer basılı mı.
     3. Uygulamalar arası ispat: bir uygulamanın yazdığı kaydın öteki
        ikisinin ekranında göründüğünü doğruluyor.
     4. Rol bazlı menü: yetkisi kısıtlı personelin menüsü gerçekten
        kısalıyor mu.
     5. Gezinme kayıt yazmıyor: bütün turdan sonra defterlerin satır
        sayısı değişmemiş olmalı.
     6. Formlar (`ekosistem/formlar.mjs`): her formun asıl eylem
        düğmesine BOŞ hâlde basılıyor ve tek şey soruluyor — deftere
        kayıt düştü mü? Düşmemeli. Uyarı METNİ aranmıyor; o Codex'in
        alanı ve yenilenince değişecek.

   TURUN TEK KURALI — CODEX'E DAYANIKLILIK

   Tur yalnız KENDİ EKTİĞİ değerleri arar: talep numarası, seri
   numarası, tutar, müşteri ve servis adı. Çevresindeki kelimelere
   BAKMAZ.

   BU KARAR SINANDI. 19 Eylül 2026'da bekleyen 48 ekran metninin
   tamamı Codex'ten geçti: sözlükte 25 anahtar, tek dilli ekranlarda
   12 dosya, Raporlar ekranında 11 dosya yeniden yazıldı; beş ayrı
   "teslimat adresi" başlığı tek ada indi. Tur o gün 63 denetimle
   yeşil kaldı — çünkü hiçbiri kelimeye bakmıyordu. Başlığa ya da
   düğme yazısına bakan bir tur topluca kırmızıya dönerdi ve gerçek
   bir kırılmayı o gürültünün içinde kimse göremezdi.
   `SRV2608212204` ise çevrilebilir bir şey değil.

   GİRİŞ YAPILMAZ, ŞİFRE YAZILMAZ. Oturumlar doğrudan tohumlanıyor.
   Adres her zaman localhost: `src/lib/hesap.js:84` güvenli köken
   istiyor, LAN adresinde parola özeti alınamıyor.

   SESSİZCE ATLAMA YOK. Gidilemeyen ekran "erişilemedi" diye ayrı
   sayılıyor; kapsam iddiası ancak sayı doğruysa bir şey ifade eder.

   EKRAN-GORUNTUSU.MJS'TEN FARKI: orada eksik bir seçici uyarı yazıp
   geçiyor ve çıkış kodu 0 kalıyor. Burada bulunamayan şey DÜŞÜŞTÜR.

   ÖNCE DÜŞÜRÜLEREK DENENDİ. Turun gerçekten bir şey iddia ettiği
   bilerek bozularak gösterildi:

     bir ekran açılırken patlarsa (Machines.jsx throw)         düştü
     menüye yeni satır eklenirse (B-MENU sayım)                düştü
     servisinTalepleri boş dönerse (Servisim listesi)          düştü
     servis oturumu `id` ile yazılırsa (giriş ekranında kalır)  düştü
     Duyurular'ın iki kapısı kaldırılırsa (boş duyuru yayınlanır) düştü

   25 Eylül 2026 kullanıcı sınamasının düzeltmeleriyle gelen sekiz
   denetim (67 → 75) ve B-ROL'ün eki, her biri ayrı bozularak:

     C-27  Taleplerim listeyi kaldırılanlardan okursa           düştü
     C-28  talep detayından servisin adres satırı kalkarsa      düştü
     F-11  Profil'in 5 karakter kapısı kalkarsa (boş görüş yazılır) düştü
     S-10  Hak Ediş özetinden makineye göre ücret satırı kalkarsa düştü
     X-03  Hakkedis listesi `surum`a bağlı değilse               düştü
     X-03  ServisPanel'in depo dinleyicisi kaldırılırsa          düştü
     X-04  açık talep tazelemede depodan yeniden okunmazsa       düştü
     X-04  ServisPanel'in depo dinleyicisi kaldırılırsa  ERİŞİLEMEDİ
           (kart listeye hiç düşmedi; tur bunu ayrı sayıyor, yeşil değil)
     X-05  yüzen düğme tek parçalı yuvarlağa dönerse (hap yok)   düştü
     B-SEKME  Backoffice'in depo dinleyicisi kaldırılırsa        düştü
     B-ROL  Kayıtlı Makineler atama bölümü yetkiye bakmazsa     düştü

   Aynı akşamki inceleme onarımının beş denetimi (75 → 80), bozmalar
   deponun kopyasında ve kopyanın kendi sunucusunda:

     C-29  talep formu süren işte de açılırsa                   düştü
     C-29  kartın düğmesi formun açıklamasını taşımazsa         düştü
     C-30  "Sorun Devam Ediyor" süren işe bakmazsa              düştü
     C-31  geri alma düğmesi defterden çıkarmazsa               düştü
     C-32  DENEME kutusu demo işaretine bakmazsa                düştü
     C-33  servissiz makinede form yine açılırsa (26.09.2026)   düştü
     C-33  makine kartlarının radyo rolü kalkarsa (29.09.2026;
           seçim artık açılır kutudan değil kartlardan)          düştü
     C-34  rehber kontrol edilen nedeni talebe taşımazsa (29.09.2026) düştü
     C-35  kılavuz PDF'i telefona kaydedilmezse (29.09.2026)     düştü
     C-35  ?bolum=ariza arıza sayfasına atlamazsa               düştü
     C-36  talep formu parça adını koda çevirmezse (29.09.2026)  düştü
     C-36  parça uymadığı makinede de seçili gelirse             düştü
     X-08  Yol Tarifi bağlantısı adresi taşımazsa (29.09.2026)   düştü
     C-37  eski sürümü onaylamış hesaba pencere çıkmazsa (29.09.2026) düştü
     C-37  kampanya değişikliği olay yazmazsa                    düştü
     C-37  Gizlilik ve İzinler onay sürümünü göstermezse        düştü
     C-37  güncelleme penceresi zemine dokununca kapanırsa      düştü
     C-37  mikrofonun İzin Ver'i izni istemezse (30.09 üçüncü tur) düştü
     C-37  kamera satırı geri gelirse                           düştü
     C-39  pencere açıkken kök kilitlenmezse (30.09.2026)        düştü
           (ilk hâli düşmedi: aşağı ve yukarı eşit kaydırma toplamda
           sıfır ediyordu; artık her hareketten sonra ölçülüyor)
     C-39  kökte esneme açık kalırsa                            düştü
     C-38  banka hesabı kapatılırsa (BANKA.aktif false; 30.09.2026) düştü
     C-38  IBAN düğmesi boşluklu IBAN kopyalarsa                 düştü
     C-38  kartın tutarı ara toplamdan okunursa (özetle tutmaz)  düştü
           (tutar satırı aynı gün kalktı; bu bozma artık uygulanmıyor)
     C-38  kartta tutar yeniden gösterilirse (30.09 ikinci tur)  düştü
     C-38  formun seçili parça satırından resim kalkarsa         düştü
     C-38  IBAN yazısı küçülmezse (360 pikselde taşar)           düştü
     C-38  açıklama kalıbından {no} silinirse (inceleme, 30.09)  düştü
     C-38  Hesaplar'a talep numarası verilmezse                  düştü
     C-38  IBAN öbekleri arasındaki boşluk kalkarsa              düştü
     C-38  IBAN yine esnek kutu olursa (seçim alt alta gelir)    düştü
     C-38  açıklama düğmesi yalnız adı kopyalarsa                düştü
     X-09  Servisim'in gizlilik kapısı kaldırılırsa (29.09.2026) düştü
     X-09  kabul depoya yazılmazsa                               düştü
     X-10  Hesap'taki Gizlilik ve İzinler satırı kalkarsa (30.09.2026) düştü
     X-10  sayfa kabulün sürümünü göstermezse                   düştü
     X-10  sorulmamış mikrofon izninde İzin Ver yoksa (30.09)   düştü
     X-11  Gizlilik satırı yine kendi bölümüne sarılırsa (30.09.2026) düştü
     X-11  Çıkış Yap Hesabım'dan ayrı bir bölüme çıkarsa        düştü
     X-11  Hesabım'ın altına başka bölüm eklenirse (Çıkış Yap sonda değil) düştü
     X-11  Çıkış Yap Hesabım'ın içinde kartın üstüne taşınırsa  düştü
     X-11  Çıkış Yap olağan düğme renginde kalırsa (30.09 ikinci tur) düştü
     X-11  Şifremi Değiştir satırı formu açmazsa                düştü
     X-11  şifre satırı Hesabım kartından çıkarsa (eski Güvenlik) düştü
     X-11  üst çubuğun daireleri yine 44 piksel olursa (30.09)  düştü
     X-14  yaprak açıkken kök kilitlenmezse (30.09.2026)         düştü
     X-14  Servisim kökünde esneme açık kalırsa                 düştü
     X-15  hareketlerin hepsi birden gösterilirse (30.09.2026)   düştü
     X-15  düğme 10 yerine 5 açarsa                              düştü
     X-15  sekme seçimi ServisPanel'de tutulmazsa               düştü
     X-16  yapılan iş yine tek seçimli olursa (6.10.2026)          düştü
     X-16  parçasız "Parça Değişti" uyarısı hesaplanmazsa        düştü
     X-16  uyarı yerinde, gönderim kuralı atlanırsa             düştü
     X-16  Parçayı Taktım'da kilit kalkarsa                     düştü
     X-16  Parçayı Taktım'da ön seçim kalkarsa                  düştü
     B-ADRES menü geçişi geçmişe satır eklemezse (1.10.2026)    düştü
           (adres yine değişiyordu, düşen Geri: adresi uyduran
           replaceState pushState'in eksikliğini örtüyor)
     B-ADRES Geri/İleri dinlenmezse                             düştü
     B-ADRES açılışta adres okunmazsa (yenileme Genel Bakış)    düştü
     B-ADRES bilinmeyen ekran adresi düzeltilmezse              düştü
     B-ADRES sekme başlığı ekranla değişmezse                   düştü
     C-40  formda bölge dışı hiç hesaplanmazsa (5.10.2026)      düştü
     C-40  düğmenin yazısı değişmezse                           düştü
     C-40  il değişince önerilen adres boşalmazsa               düştü
     C-40  çiftçinin yazdığı adres de silinirse                 düştü
     B-BOLGE atama bölümü hiç çizilmezse (5.10.2026)            düştü
     B-BOLGE bölgeye bakan servisler önerilmezse                düştü
     B-BOLGE atamanın izi gösterilmezse                         düştü
     B-BOLGE onay yine tarayıcının uyarı kutusuyla sorulursa (7.10.2026) düştü
     B-RAPOR seçili sekmenin çizgisi kutunun altına taşarsa (6.10.2026) düştü
     B-RAPOR Dikkat İsteyenler satırı açıklamayı yeniden çizerse  düştü
     B-RAPOR zaman grafiği etiketleri yine N'de bir yazılırsa   düştü
     B-RAPOR haftalık etiket yine yalnız başlangıç günü olursa  düştü
     B-RAPOR bilgi kutusu alt açıklamayı yeniden çizerse         düştü
     B-TARIH yarım yazılan yıl (0002) tarih sayılırsa (6.10.2026)  düştü
     B-TARIH on yıl sınırı tek başına kalkarsa: DÜŞMEDİ — ilk kat tutuyor;
             ikinci kat bozuk tarihli eski kayıt için (sınama verisinde yok)
     B-TARIH iki kat birlikte kalkarsa (24.298 sütun)               düştü
     X-12  özetteki artı adedi değiştirmezse (30.09.2026)         düştü
     X-12  Kaldır satırı çıkarmazsa                               düştü
     X-12  özetten dönünce seçimin adedi 1'e inerse               düştü
     X-12  son parça kalkınca seçim adımına dönülmezse           düştü
     X-12  bakiye yetince seçim kendiliğinden Bakiyem'e dönerse (inceleme, 30.09) düştü
     X-12  adedi 1 olan satırın eksisi kapalı değilse            düştü
     X-12  eksinin üst işlevdeki 1 sınırı kalkarsa        DÜŞMEDİ
           (iki kat kapı: eksi kapalı olduğu için basılamıyor)
     X-12  ikisi birden kalkarsa (eksi satırı siler)             düştü
     X-12  adım kilidi sıfırlanırsa (ADIM_KILIDI_MS 0; "Devam"ın
           ikinci dokunuşu özetin Geri'sine düşüp seçime döndürdü) düştü
     X-12  kilit yalnız özete geçişte çalışırsa (son Kaldır'ın
           ikinci dokunuşu seçim kartını yeniden seçti)          düştü
     X-12  ortak eksi-artının artısı adedi değiştirmezse         düştü
     X-13  devretme düğmesi yine kulaklık simgesiyle çizilirse (30.09.2026) düştü
     X-13  devretme penceresi kendi işaretini taşımazsa         düştü
     X-13  devretme düğmesinin yazısı silinirse (yalnız simge)  düştü
     X-06  Servisim açık pencereyi durum değişince kapatmazsa   düştü
     X-07  geçiş kilidi sıfırlanırsa (26.09.2026)               düştü
     --yalniz bilinmeyen kodla verilirse   çıkış 1 ("böyle bir denetim yok")

   BOZMA TURU İKİ KEZ KENDİ SINAMAMI DÜZELTTİ, ikisi de sessiz
   yalancıydı:

     · Form aşaması formun gönder düğmesine değil, üstteki duyuru
       penceresinin "Anladım" düğmesine basıyordu (ikisi de
       `.btn--primary`). Hiçbir şey sınamıyordu ve yeşil geçiyordu.
     · Onay penceresi açıldığında arkadaki form ekranda kalıyor ve
       DOM'da önce geliyor; ilk düğmeye basan döngü onayı hiç görmeden
       aynı düğmeye üç kez basıyordu.

   İkisi de ancak bilerek bozarak görüldü. Yeşil bir sınama, çalışan bir
   sınama değildir.

   SUNUCU YA DA CHROME YOKSA tur `atlandı` deyip 0 ile çıkıyor —
   `npm run dogrula` Chrome'u olmayan makinede kırılmasın diye.
   ========================================================================== */

import { chromeAc, Cdp, Sayfa, bekle, PROFIL, CHROME } from './tarayici.mjs'
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ortamKur, modulleriYukle, modulYukle, depoTemizle, kapat } from './ekosistem/ortam.mjs'
import { SERVIS, MUSTERI, PARCA_PERSONELI, KVKK_SURUMU, dunyaKur, personelKaydiEkle, talepVerisi, talebiYaz } from './ekosistem/tohum.mjs'
import {
  CONNECT,
  CONNECT_OTURUMSUZ,
  BACKOFFICE,
  BACKOFFICE_OTURUMSUZ,
  SERVISIM,
  SERVISIM_OTURUMSUZ,
  TOPLAM,
} from './ekosistem/ekranlar.mjs'
import { FORMLAR } from './ekosistem/formlar.mjs'

/* Deponun kökü: C-35 ve C-36 ekilen değeri sunucu klasöründen okuyor. */
const KOK = fileURLToPath(new URL('..', import.meta.url))

const arg = process.argv.slice(2)
const adresArg = arg.indexOf('--adres') >= 0 ? arg[arg.indexOf('--adres') + 1] : null
const YALNIZ = arg.indexOf('--yalniz') >= 0 ? new Set(String(arg[arg.indexOf('--yalniz') + 1] || '').split(',').filter(Boolean)) : null
/** Denetim bu koşuda var mı? `--yalniz` yoksa hepsi. */
const secili = (kod) => !YALNIZ || YALNIZ.has(kod)

/* ENVANTER DIŞINDAKİ DENETİMLER: ekran değil, davranış. Kodları burada
   tek listede; `--yalniz` denetimi de buna bakıyor. */
const EK_DENETIMLER = [
  'B-MENU', 'B-ROL', 'B-SEKME', 'B-ADRES',
  'X-01', 'X-02', 'X-03', 'X-04', 'X-05', 'X-06', 'X-07', 'X-08', 'X-09', 'X-10', 'X-11', 'X-12', 'X-13',
  'X-14', 'X-15', 'X-16',
  'C-29', 'C-30', 'C-31', 'C-32', 'C-33', 'C-34', 'C-35', 'C-36', 'C-37', 'C-38', 'C-39', 'C-40',
  'B-BOLGE', 'B-RAPOR', 'B-TARIH',
]

/* BİLİNMEYEN KOD SESSİZCE GEÇMİYOR (25 Eylül 2026, inceleme).
   `--yalniz C-99` hiçbir şey koşturmadan "0 adımın hepsi geçti" deyip 0
   ile çıkıyordu. Bozma denemesinde kod yanlış yazılırsa sonuç "düşmedi"
   diye kaydedilir ve gerçek bir kapsam sorunuyla karışırdı.
   ekosistem-sinamasi.mjs aynı durumda "böyle bir senaryo yok" diyor. */
if (YALNIZ) {
  const bilinen = new Set([
    ...CONNECT_OTURUMSUZ, ...CONNECT, ...BACKOFFICE_OTURUMSUZ, ...BACKOFFICE,
    ...SERVISIM_OTURUMSUZ, ...SERVISIM, ...FORMLAR,
  ].map((e) => e.kod).concat(EK_DENETIMLER))
  const yok = [...YALNIZ].filter((k) => !bilinen.has(k))
  if (!YALNIZ.size || yok.length) {
    console.log('')
    console.log(`Ekosistem ekran turu: böyle bir denetim yok: ${yok.join(', ') || '(boş liste)'}`)
    console.log('SONUÇ: hiçbir denetim koşturulmadı.')
    process.exit(1)
  }
}

function atla(neden) {
  console.log('')
  console.log('Ekosistem ekran turu')
  console.log('--------------------')
  console.log(`  - atlandı: ${neden}`)
  console.log('')
  console.log('SONUÇ: ekran turu atlandı.')
  process.exit(0)
}

async function sunucuBul() {
  const adaylar = [adresArg, process.env.PAKSAN_ADRES, 'http://localhost:5174', 'http://localhost:3000']
  for (const a of adaylar) {
    if (!a) continue
    try {
      const r = await fetch(a + '/servis.html', { signal: AbortSignal.timeout(2500) })
      if (r.ok) return a
    } catch { /* sıradaki */ }
  }
  return null
}

const ADRES = await sunucuBul()
if (!ADRES) atla('geliştirme sunucusu bulunamadı (npm run dev)')
if (!CHROME) atla('Chrome bulunamadı')

/* ------------------------------------- Dünyayı veri katmanında kur */

ortamKur()
const m = await modulleriYukle()
depoTemizle()

const { urunId, kisi, makineler } = dunyaKur(m)

/* Servis kaydı gönderilmiş, PAKSAN'ın onayını bekleyen bir talep.

   TALEP BİLEREK AÇIK BIRAKILIYOR, ONAYLANMIYOR. Ölçüldü: kapanmış talep
   iki listede de varsayılan olarak GİZLİ — backoffice'te `durum ===
   'acik'` süzgeci (Talepler.jsx:176), Servisim'de açık/kapalı ayrımı
   (ServisPanel.jsx:498). İkisi de kasıtlı; kapanmış bir kayıtla tur
   atılsaydı "ekranda yok" derdi ve bu yanlış alarm olurdu. */
/* SERVİSE ÖZEL ÜCRET VE İSKONTO (23 Eylül 2026). Değerler bilerek
   başlangıç tarifesinden ve başlangıç oranından farklı: ekranda
   görülen rakam gerçekten backoffice'in yazdığı kayıttan gelmeli —
   sabit yerinde kalsaydı tur onu bulamazdı. Aşağıdaki servis kaydı da
   bu ücretle hesaplanıyor (hak edişi 40 km × 12 + 5 saat × 73). */
const OZEL_SAAT = 73
const OZEL_ISKONTO = 37
/* MAKİNEYE GÖRE ÜCRET (25 Eylül 2026, kullanıcı sınaması: Hak Ediş'in
   "güncel ücretleriniz" özeti modele göre farklı ücreti söylemiyordu).
   Servisin BAŞKA bir modelde özel saat ücreti var; aşağıdaki talebin
   makinesi o modelde değil, hak edişi değişmiyor. 8765 başka bir
   rakamın içinde geçmesin diye. */
const MODEL_SAAT = 8765
const digerUrunId = m.marka.PRODUCTS.find((p) => p.id !== urunId).id
m.veri.servisTarifesiniKaydet(
  SERVIS.id,
  { iscilikSaat: OZEL_SAAT, modeller: { [digerUrunId]: { iscilikSaat: MODEL_SAAT } } },
  'Sınama Yöneticisi',
)
m.veri.servisIskontosunuKaydet(SERVIS.id, OZEL_ISKONTO, 'Sınama Yöneticisi')

const talep = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi))
m.veri.servisKaydiGonder(
  talep,
  { asama: 'bitti', kapi: 'garanti', yapilanIs: 'Ayar Yapıldı', parcalar: [], km: 40, iscilikSaat: 5, saatUcreti: 50, iscilik: 250 },
  SERVIS.ad,
)
const bitmis = m.veri.talepleriGetir().find((t) => t.id === talep.id)

/* Servisin kendi parça siparişi: backoffice'te ayrı görünmesi gereken kayıt. */
const siparis = m.veri.servisParcaSiparisi({
  servisId: SERVIS.id,
  servisAd: SERVIS.ad,
  servisNo: SERVIS.no,
  servisTel: '3323450014',
  il: SERVIS.il,
  ilce: 'Selçuklu',
  kalemler: [{ kod: 'PRC-1', ad: 'Rulman', adet: 1 }],
  teslimat: {
    kaynak: 'elle',
    alici: SERVIS.ad,
    tel: '3323450014',
    il: 'Konya',
    ilce: 'Selçuklu',
    acikAdres: 'Fevzi Çakmak Mah. 10680 Sk. No:3',
  },
  odeme: 'fatura',
  parcaFiyat: null,
  tutar: 100,
  tutarKdvli: 118,
})
const siparisNo = (siparis?.talep || siparis)?.no || null

/* Müşterinin bildirim ekranı boş açılmasın. */
m.veri.duyuruYayinla(
  { tur: 'uyari', baslik: 'Sınama uyarısı', metin: 'Tur için', hedef: { kime: 'ikisi' } },
  'Sınama Yöneticisi',
)

/* DUYURU PENCERESİ GÖRÜLMÜŞ SAYILIYOR.

   Yayınlanan duyuru her ekranın ÜSTÜNE açılır pencere olarak çıkıyor ve
   penceredeki "Anladım" düğmesi de `.btn--primary` sınıfını taşıyor.
   Ölçüldü: form aşaması o yüzden formun gönder düğmesine değil
   pencerenin kapatma düğmesine basıyordu — yani hiçbir şey sınamıyordu
   ve yine de yeşil geçiyordu. Duyuru "görüldü" işaretlenince pencere
   açılmıyor, liste ekranlarında kayıt yine duruyor. */
const duyuruIdleri = m.veri.duyurulariGetir().map((d) => d.id)
m.depo.save('gorulenDuyurular', duyuruIdleri)
m.depo.save('gorulenDuyurularServis', duyuruIdleri)

/* SERVİSİM'İN DEMO TOHUMU DEVRE DIŞI BIRAKILIYOR.

   `servis.html` kökünde `data-demo="acik"` var ve açılışta demoKur()
   çalışıp rastgele üretilmiş demo verisi yazıyor. O veri turun ektiği
   kaydı listelerde aşağı itebilir ve sonucu koşudan koşuya
   değiştirebilirdi. demoKur, demo hesabı varsa ve `demoSurumu` güncelse
   hemen dönüyor (src/servis/demoKur.js) — ikisini de kuruyoruz.
   Sürüm numarası elle yazılmıyor, demoKur'un kendisinden okunuyor:
   sürüm artınca (21 Eylül 2026'da 2 → 3 oldu) tur demoyu kapatamaz
   hâle gelmesin. */
await m.veri.servisHesabiYaz(SERVIS.id, { kullanici: 'konya', sifre: '123456' }, 'Sınama')
const { DEMO_SURUMU } = await modulYukle('/src/servis/demoKur.js')
m.depo.save('demoSurumu', DEMO_SURUMU)

/* Bakım rehberi kimliği uydurulmuyor, uygulamanın kendi listesinden
   alınıyor: rehber silinir ya da yeniden adlandırılırsa tur onu görür. */
const rehberId = m.rehber.rehberListesi('tr')[0]?.id || ''

/* Kısıtlı personelin KAYDI da ekiliyor (25 Eylül 2026, O6): backoffice
   oturumu personel kaydına bağlanıyor, kaydı olmayan kişinin oturumu
   kabul edilmeyecek. Kayıt olmasaydı B-ROL "menü kısaldı" yerine giriş
   ekranını görürdü. */
personelKaydiEkle(m, PARCA_PERSONELI)

const YEREL = {}
for (const a of globalThis.localStorage.anahtarlar()) YEREL[a] = globalThis.localStorage.getItem(a)
const OTURUM = {}
for (const a of globalThis.sessionStorage.anahtarlar()) OTURUM[a] = globalThis.sessionStorage.getItem(a)

/* Yetkisi kısıtlı personel oturumu — rol bazlı menü sınaması için.
   Kişi tohumdan (tools/ekosistem/tohum.mjs → PARCA_PERSONELI); kaydı
   yukarıda ekildi. */
const KISITLI_OTURUM = JSON.stringify({ ...PARCA_PERSONELI, giris: Date.now() })

/* BAŞKA SEKMENİN ROL DEĞİŞİKLİĞİ (B-SEKME, 25 Eylül 2026, kullanıcı
   sınaması O7). Parça rolünden bir menü izni çıkarılmış rol listesi;
   tur onu "başka bir sekme yazmış gibi" depoya koyup depo olayını
   gönderiyor. İzin gerçekten parça rolünde olmalı, yoksa menü zaten
   kısa olur ve denetim hiçbir şey sınamaz. */
const SEKME_IZNI = 'musteriler'
const ASIL_ICERIK = YEREL['paksan.panelIcerik'] ?? null
const SEKME_KURULDU = m.veri.izinli(PARCA_PERSONELI.rol, SEKME_IZNI)
const SEKME_ICERIGI = JSON.stringify({
  ...JSON.parse(ASIL_ICERIK || '{}'),
  roller: m.veri
    .rolleriGetir()
    .map((r) => (r.id === PARCA_PERSONELI.rol ? { ...r, izinler: r.izinler.filter((i) => i !== SEKME_IZNI) } : r)),
})

await kapat()

/* EKİLEN DEĞERLER — tur yalnız bunları arar. */
const IZ = {
  talepNo: bitmis.no,
  seri: makineler[0].serial,
  musteriAdi: MUSTERI.ad,
  servisAdi: SERVIS.ad,
  hakkedis: String(bitmis.hakkedis.toplam),
  siparisNo,
  /* Servise özel saat ücreti ve iskonto: backoffice'in servis listesinde,
     Yedek Parça Kataloğu'nda, Servisim'in Hesap ve sipariş ekranında. */
  saatUcreti: `${m.marka.paraYaz(OZEL_SAAT)} ${m.marka.PARA_BIRIMI}`,
  iskontoOrani: `%${OZEL_ISKONTO}`,
  /* Connect talep detayında servisin geleceği adres (C-28): talebe
     formdan yazılan adres, hesabın adresinden gelmiş olsa da. */
  servisAdresi: bitmis.adres,
  /* Servisim Hak Ediş özetinde makineye göre ücret (S-10). */
  modelUcreti: `${m.marka.paraYaz(MODEL_SAAT)} ${m.marka.PARA_BIRIMI}`,
}

const YER = {
  makineId: makineler[0].id,
  urunId,
  talepId: bitmis.id,
  rehberId,
}

/* ------------------------------------------------------- Tarayıcı */

const sonuclar = []
const kasitliDavranislar = []
function kaydet(kod, ad, hata, ornek) {
  sonuclar.push({ kod, ad, hata: hata || null, ornek: hata ? ornek : null })
}

const { surec, bilgi } = await chromeAc()
const cdp = await Cdp.bagla(bilgi.webSocketDebuggerUrl)
const s = await Sayfa.ac(cdp)
await s.olcu({ width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false })

/* BİLDİRİM İZNİ ÖNCEDEN VERİLİYOR.

   İzin sorulmadığında uygulamalar "Bildirimlere İzin Ver" kartını
   çiziyor ve o düğme de ev düzeninin birincil sınıfını taşıyor.
   Ölçüldü: form aşaması backoffice'te formun değil o kartın düğmesine
   basıyordu. Ekran görüntüsü aracı da aynı sebeple izin veriyor
   (tools/ekran-goruntusu.mjs). */
await cdp.gonder('Browser.grantPermissions', {
  origin: ADRES,
  permissions: ['notifications'],
})

/* MİKROFON İZNİ "SORULMADI" (30 Eylül 2026). Headless Chrome mikrofonu
   baştan "reddedildi" sayıyor; gerçek bir telefonda ve tarayıcıda ilk
   durum "sorulmadı". C-37 ve X-10 "İzin Ver" düğmesini bu durumda
   sınıyor (bkz. izinSatirlariniSina). */
await cdp.gonder('Browser.setPermission', {
  origin: ADRES,
  permission: { name: 'microphone' },
  setting: 'prompt',
})

/* HATA KANCASI SAYFANIN KENDİ KODUNDAN ÖNCE KURULUYOR.

   Gezindikten sonra enjekte edilen bir dinleyici yüklenme sırasındaki
   hataları kaçırıyor — React'in bir bileşende patlaması da dahil, ki en
   çok görülen hata odur. `console.error` de sarılıyor: React yakalanan
   bir hatayı oraya yazıyor, yani hata sınırı devreye girdiğinde de
   buradan görülüyor. */
await s.onceden(`
  window.__hatalar = [];
  window.addEventListener('error', (e) => window.__hatalar.push('error: ' + (e.message || e)));
  window.addEventListener('unhandledrejection', (e) => window.__hatalar.push('promise: ' + (e.reason && e.reason.message || e.reason)));
  (function () {
    const asil = console.error;
    console.error = function (...a) {
      try { window.__hatalar.push('console: ' + a.map(String).join(' ').slice(0, 200)) } catch (x) {}
      return asil.apply(console, a);
    };
  })();
`)

async function metin() {
  return (await s.js('document.body.innerText')) || ''
}

async function hatalar() {
  return (await s.js('JSON.stringify(window.__hatalar || [])')) || '[]'
}

async function depoYaz(yerel, oturum) {
  await s.js(`(() => {
    localStorage.clear(); sessionStorage.clear();
    const y = ${JSON.stringify(yerel)}, o = ${JSON.stringify(oturum)};
    for (const k in y) localStorage.setItem(k, y[k]);
    for (const k in o) sessionStorage.setItem(k, o[k]);
    return 1
  })()`)
}

/**
 * Bir ekranı denetler: boş mu, hata verdi mi, ekili değer basılı mı.
 *
 * BEKLENEN DEĞER BELİRENE KADAR YOKLANIYOR, sabit süre beklenmiyor.
 * Sebebi ölçüldü: backoffice listeleri `useVeri` ile eşzamansız
 * geliyor ve sabit 700 ms'de Müşteriler ekranı henüz boştu. Sabit süre
 * makinenin hızına göre bazen yetiyor bazen yetmiyor; öyle bir sınama
 * "bazen düşüyor" der ve güvenilmez olur. Yoklama hem hızlı makinede
 * beklemiyor hem yavaş makinede yanlış alarm vermiyor.
 */
async function denetle(ekran) {
  /* DONMUŞ SAAT YÜZÜNDEN SAYAÇ KULLANILIYOR. Bu betik ortamKur()
     çağırdığı için globalThis.Date donmuş durumda ve Date.now() gerçek
     zamanı vermiyor — ona dayanan bir zaman aşımı hiç dolmazdı. */
  const enCok = ekran.tur || 20
  let t = ''
  let h = []

  for (let i = 0; i < enCok; i++) {
    await bekle(300)
    t = await metin()
    h = JSON.parse(await hatalar())
    if (h.length) break
    if (!ekran.iz && t.trim()) break
    if (ekran.iz && t.includes(IZ[ekran.iz])) break
  }

  if (h.length) {
    kaydet(ekran.kod, ekran.ad, `${h.length} hata: ${h[0]}`, t)
    return
  }
  if (!t.trim()) {
    kaydet(ekran.kod, ekran.ad, 'ekran BOŞ açıldı', '')
    return
  }
  if (ekran.iz && !t.includes(IZ[ekran.iz])) {
    kaydet(ekran.kod, ekran.ad, `ekili değer yok: ${IZ[ekran.iz]}`, t)
    return
  }
  kaydet(ekran.kod, ekran.ad, null)
}

function adresCoz(yol) {
  return yol.replace(/\{(\w+)\}/g, (_, ad) => YER[ad] ?? '')
}

try {
  /* ---------------------------------- 1 · Connect, giriş yapılmamış */
  if (CONNECT_OTURUMSUZ.some((e) => secili(e.kod))) {
    await s.git(ADRES + '/')
    await s.js('localStorage.clear(); sessionStorage.clear(); 1')
    for (const e of CONNECT_OTURUMSUZ.filter((x) => secili(x.kod))) {
      await s.git(ADRES + '/#' + e.yol)
      await denetle(e)
    }
  }

  /* ---------------------------------- 2 · Backoffice ve Servisim girişi */
  if (secili(BACKOFFICE_OTURUMSUZ[0].kod) || secili(SERVISIM_OTURUMSUZ[0].kod)) {
    await s.git(ADRES + '/backoffice.html')
    await s.js('localStorage.clear(); sessionStorage.clear(); 1')
    await s.git(ADRES + '/backoffice.html')
    if (secili(BACKOFFICE_OTURUMSUZ[0].kod)) await denetle(BACKOFFICE_OTURUMSUZ[0])

    await s.git(ADRES + '/servis.html')
    if (secili(SERVISIM_OTURUMSUZ[0].kod)) await denetle(SERVISIM_OTURUMSUZ[0])
  }

  /* ---------------------------------- 3 · Connect, giriş yapılmış */
  if (CONNECT.some((e) => secili(e.kod))) {
    await s.git(ADRES + '/')
    await depoYaz(YEREL, OTURUM)
    for (const e of CONNECT.filter((x) => secili(x.kod))) {
      await s.git(ADRES + '/#' + adresCoz(e.yol))
      await denetle(e)
    }
  }

  /* ---------------------------------- 4 · Backoffice, bütün menü */
  await s.git(ADRES + '/backoffice.html')
  await depoYaz(YEREL, OTURUM)
  await s.git(ADRES + '/backoffice.html')
  await bekle(1200)

  const menuSayisi = await s.js(`document.querySelectorAll('.yan__bag').length`)
  /* Envanterde aynı menü satırına iki iz olabiliyor (B-05 ve B-16,
     23 Eylül 2026); sayılan FARKLI menü sırası. */
  const envanterMenu = new Set(BACKOFFICE.map((e) => e.menu)).size
  if (!secili('B-MENU')) {
    /* bu koşuda yok */
  } else if (menuSayisi !== envanterMenu) {
    kaydet(
      'B-MENU',
      'Menü satır sayısı',
      `envanterde ${envanterMenu}, ekranda ${menuSayisi} — envanter eskimiş olabilir`,
      '',
    )
  } else {
    kaydet('B-MENU', 'Menü satır sayısı', null)
  }

  for (const e of BACKOFFICE.filter((x) => secili(x.kod))) {
    const bastim = await s.js(`(() => {
      const d = document.querySelectorAll('.yan__bag')[${e.menu}]
      if (!d) return 0
      d.click(); return 1
    })()`)
    if (!bastim) {
      kaydet(e.kod, e.ad, `kenar çubuğunda ${e.menu}. sıra yok — ERİŞİLEMEDİ`, '')
      continue
    }
    /* Ekranın içinde açılması gereken bir parça varsa (kapalı açılan
       kart, 23 Eylül 2026) önce ona basılıyor. Bulunamazsa ERİŞİLEMEDİ:
       sessizce atlanmıyor. */
    if (e.tikla) {
      await bekle(700)
      const t = await s.js(`(() => {
        const d = document.querySelector(${JSON.stringify(e.tikla)})
        if (!d) return 0
        d.click(); return 1
      })()`)
      if (!t) {
        kaydet(e.kod, e.ad, `${e.tikla} bulunamadı — ERİŞİLEMEDİ`, '')
        continue
      }
    }
    await denetle(e)
  }

  /* B-ADRES · Backoffice'in ekranı adres çubuğunda (1 Ekim 2026,
     kullanıcının bildirdiği: "sayfa geçişlerinde arama çubuğunda
     değişiklik olmuyor"). Yönetici oturumuyla: (a) menüden Talepler'e
     geçince adres `#/talepler` oluyor ve sekmenin başlığı değişiyor;
     (b) Müşteriler'e geçip tarayıcının Geri'si Talepler'i, İleri'si
     Müşteriler'i açıyor; (c) adres `#/servisler` ile yenilenince Servisler
     açık geliyor; (d) bilinmeyen ekran adresi Genel Bakış'a çevriliyor.
     Açık ekran seçili menü satırından (`.yan__bag--on[data-menu]`)
     okunuyor; yazılara bakılmıyor. */
  if (secili('B-ADRES')) {
    const acikEkran = `document.querySelector('.yan__bag--on')?.dataset.menu || ''`
    const ekranBekle = async (id) => {
      let v = ''
      for (let i = 0; i < 15 && v !== id; i++) {
        await bekle(200)
        v = await s.js(acikEkran)
      }
      return v
    }
    let hata = null
    await s.git(ADRES + '/backoffice.html')
    await bekle(800)
    const ilkBaslik = await s.js('document.title')
    await s.js(`document.querySelector('.yan__bag[data-menu="talepler"]')?.click(); 1`)
    await ekranBekle('talepler')
    const adres1 = await s.js('location.hash')
    const baslik1 = await s.js('document.title')
    if (adres1 !== '#/talepler') hata = `Talepler açılınca adres değişmedi ("${adres1}")`
    else if (baslik1 === ilkBaslik) hata = 'ekran değişince sekmenin başlığı değişmedi'
    if (!hata) {
      await s.js(`document.querySelector('.yan__bag[data-menu="musteriler"]')?.click(); 1`)
      await ekranBekle('musteriler')
      await s.js('history.back(); 1')
      const geri = await ekranBekle('talepler')
      if (geri !== 'talepler') hata = `Geri Talepler'i açmadı ("${geri}")`
      else {
        await s.js('history.forward(); 1')
        const ileri = await ekranBekle('musteriler')
        if (ileri !== 'musteriler') hata = `İleri Müşteriler'i açmadı ("${ileri}")`
      }
    }
    if (!hata) {
      await s.git(ADRES + '/backoffice.html#/servisler')
      await bekle(800)
      const v = await ekranBekle('servisler')
      if (v !== 'servisler') hata = `#/servisler adresiyle açılınca Servisler gelmedi ("${v}")`
    }
    if (!hata) {
      await s.git(ADRES + '/backoffice.html#/boyle-bir-ekran-yok')
      await bekle(800)
      const v = await ekranBekle('ozet')
      const a = await s.js('location.hash')
      if (v !== 'ozet' || a !== '#/ozet') hata = `bilinmeyen ekran adresi Genel Bakış'a çevrilmedi (ekran "${v}", adres "${a}")`
    }
    kaydet('B-ADRES', "Backoffice: açık ekran adres çubuğunda, Geri/İleri ve yenileme çalışıyor", hata, await metin())
  }

  /* ---------------------------------- 5 · Rol bazlı menü kısalıyor mu
     Sekmenin kendi oturumu (oturum deposu) da siliniyor: oturum sekmeye
     ait olunca (O6) sekme, kalıcı depodaki son girişe değil kendi
     oturumuna bakar; yönetici oturumu orada kalsaydı menü kısalmazdı. */
  if (secili('B-ROL') || secili('B-SEKME')) {
    await s.js(`sessionStorage.removeItem('paksan.panelOturum'); localStorage.setItem('paksan.panelOturum', ${JSON.stringify(KISITLI_OTURUM)}); 1`)
    await s.git(ADRES + '/backoffice.html')
    await bekle(1200)
  }
  const kisitliMenu = await s.js(`document.querySelectorAll('.yan__bag').length`)
  if (secili('B-ROL')) {
    let hata =
      kisitliMenu >= BACKOFFICE.length
        ? `parça personeli ${kisitliMenu} satır görüyor, admin ${BACKOFFICE.length} — kısalmamış`
        : kisitliMenu === 0
          ? 'menü tamamen boş — oturum kabul edilmemiş olabilir'
          : null

    /* KAYITLI MAKİNELER YETKİSİZ ROLDE (25 Eylül 2026, kullanıcı
       sınaması). Yedek parça rolü makineleri görüyor ama servis
       atayamıyor (izin `makineAtama`). Ekran "servis ataması buradan
       yapılır" diyor, kart atanmamış makineleri hatırlatıyordu; pencerede
       atama bölümü yoktu. Artık kart çıkmıyor, pencerede atama seçicisi
       yok. Metne bakılmıyor: kartın sınıfı ve pencerenin seçicisi
       sayılıyor. Menü satırı kodla bulunuyor (`data-menu`, Backoffice.jsx);
       rolün menüsü admininkinden kısa, sırası tutmaz. */
    if (!hata) {
      const makine = await s.js(`(() => {
        const d = document.querySelector('.yan__bag[data-menu="makineler"]')
        if (!d) return 'menu-yok'
        d.click(); return 'tamam'
      })()`)
      if (makine !== 'tamam') {
        hata = 'Kayıtlı Makineler menüde yok — ERİŞİLEMEDİ'
      } else {
        await bekle(1200)
        const kart = await s.js(`document.querySelectorAll('.kart--dikkat').length`)
        const pencere = await s.js(`(() => {
          const satir = document.querySelector('tr.tiklanir')
          if (!satir) return 'satir-yok'
          satir.click(); return 'tamam'
        })()`)
        await bekle(900)
        const secici = await s.js(`(() => {
          const p = document.querySelector('.pencere')
          return p ? p.querySelectorAll('select').length : -1
        })()`)
        if (pencere !== 'tamam' || secici < 0) hata = 'makine penceresi açılmadı — ERİŞİLEMEDİ'
        else if (kart > 0) hata = `yetkisiz role atanmamış makine kartı çıktı (${kart})`
        else if (secici > 0) hata = `yetkisiz rolün penceresinde atama seçicisi var (${secici})`
        await s.js(`document.querySelector('.pencere')?.click(); 1`)
        await bekle(400)
      }
    }
    kaydet('B-ROL', 'Yetkisi kısıtlı personelin menüsü kısalıyor, atama bölümü yok', hata, '')
  }

  /* ---------------------------------- 5b · Başka sekmenin rol değişikliği

     B-SEKME (25 Eylül 2026, kullanıcı sınaması O7). Rol, ücret ve
     iskonto başka sekmede değişince bu sekme sayfa yenilenene kadar eski
     hâli gösteriyordu. Tarayıcı başka sekmenin yazısını `storage`
     olayıyla bildiriyor; tur aynı olayı kendisi gönderiyor. Menü satırı
     SAYILIYOR, metne bakılmıyor. Sonra özgün liste geri yazılıyor. */
  if (secili('B-SEKME')) {
    const olay = `window.dispatchEvent(new StorageEvent('storage', { key: 'paksan.panelIcerik' }))`
    let hata = SEKME_KURULDU ? null : `parça rolünde "${SEKME_IZNI}" izni yok — denetim kurulamadı`
    if (!hata) {
      await s.js(`localStorage.setItem('paksan.panelIcerik', ${JSON.stringify(SEKME_ICERIGI)}); ${olay}; 1`)
      let sonra = kisitliMenu
      for (let i = 0; i < 10 && sonra !== kisitliMenu - 1; i++) {
        await bekle(300)
        sonra = await s.js(`document.querySelectorAll('.yan__bag').length`)
      }
      if (sonra !== kisitliMenu - 1) {
        hata = `başka sekmede izin kaldırıldı, menü ${kisitliMenu} satırda kaldı (beklenen ${kisitliMenu - 1})`
      }
      await s.js(
        ASIL_ICERIK === null
          ? `localStorage.removeItem('paksan.panelIcerik'); ${olay}; 1`
          : `localStorage.setItem('paksan.panelIcerik', ${JSON.stringify(ASIL_ICERIK)}); ${olay}; 1`,
      )
      await bekle(700)
    }
    kaydet('B-SEKME', 'Başka sekmenin rol değişikliği yenilemeden okunuyor', hata, '')
  }

  /* ---------------------------------- 6 · Servisim */
  await s.git(ADRES + '/servis.html')
  await depoYaz(YEREL, OTURUM)
  await s.git(ADRES + '/servis.html')
  await bekle(1800)

  for (const e of SERVISIM.filter((x) => secili(x.kod))) {
    await s.git(ADRES + '/servis.html')
    await bekle(1500)
    const sekmeVar = await s.js(`(() => {
      const d = document.querySelectorAll('.uyg__tab')[${e.sekme}]
      if (!d) return 0
      d.click(); return 1
    })()`)
    if (!sekmeVar) {
      kaydet(e.kod, e.ad, `alt çubukta ${e.sekme}. sekme yok — ERİŞİLEMEDİ`, await metin())
      continue
    }
    await bekle(900)

    if (e.tikla) {
      const t = await s.js(`(() => {
        const d = document.querySelector(${JSON.stringify(e.tikla)})
        if (!d) return 0
        d.click(); return 1
      })()`)
      if (!t) {
        kaydet(e.kod, e.ad, `${e.tikla} bulunamadı — ERİŞİLEMEDİ`, await metin())
        continue
      }
      await bekle(900)
    }

    if (e.izeTikla) {
      /* Kart ekilen değerden bulunuyor, ekran metninden değil. */
      const t = await s.js(`(() => {
        const h = [...document.querySelectorAll('button, [role="button"], a')]
          .find((x) => (x.innerText || '').includes(${JSON.stringify(IZ[e.izeTikla])}))
        if (!h) return 0
        h.click(); return 1
      })()`)
      if (!t) {
        kaydet(e.kod, e.ad, `"${IZ[e.izeTikla]}" taşıyan kart tıklanamadı — ERİŞİLEMEDİ`, await metin())
        continue
      }
      await bekle(1100)
    }

    await denetle(e)
  }

  /* ---------------------------------- 7 · Servis siparişi backoffice'te */
  if (secili('X-01')) {
    await s.git(ADRES + '/backoffice.html')
    await depoYaz(YEREL, OTURUM)
    await s.git(ADRES + '/backoffice.html')
    await bekle(1200)
    await s.js(`document.querySelectorAll('.yan__bag')[1]?.click()`)
    await bekle(1400)
    const boTalep = await metin()
    kaydet(
      'X-01',
      'Servis siparişi backoffice listesinde',
      !siparisNo
        ? 'sipariş kurulamadı'
        : !boTalep.includes(siparisNo)
          ? `sipariş numarası ${siparisNo} listede yok`
          : null,
      boTalep,
    )
  }

  /* ---------------------------------- 8 · Gezinmek kayıt yazmadı mı?

     Bütün turdan sonra defterlerin satır sayısı değişmemiş olmalı.
     Salt okunur bir gezinti sırasında talep, makine kaydı ya da cari
     hareket doğması, bir ekranın açılırken yazdığı anlamına gelir —
     sessiz veri üretimi, sonradan bulunması en zor hatalardan biri. */
  const sayim = await s.js(`(() => {
    const oku = (k) => { try { return (JSON.parse(localStorage.getItem('paksan.' + k)) || []).length } catch (e) { return -1 } }
    return JSON.stringify({
      requests: oku('requests'),
      makineKayitlari: oku('makineKayitlari'),
      cariHareket: oku('cariHareket'),
      numaraTalepleri: oku('numaraTalepleri'),
    })
  })()`)
  const gelen = JSON.parse(sayim)
  const beklenen = {
    requests: JSON.parse(YEREL['paksan.requests'] || '[]').length,
    makineKayitlari: JSON.parse(YEREL['paksan.makineKayitlari'] || '[]').length,
    cariHareket: JSON.parse(YEREL['paksan.cariHareket'] || '[]').length,
    numaraTalepleri: JSON.parse(YEREL['paksan.numaraTalepleri'] || '[]').length,
  }
  const sapan = Object.keys(beklenen).filter((k) => gelen[k] !== beklenen[k])
  if (secili('X-02')) {
    kaydet(
      'X-02',
      'Gezinmek yeni kayıt yazmıyor',
      sapan.length
        ? sapan.map((k) => `${k}: ${beklenen[k]} → ${gelen[k]}`).join(', ')
        : null,
      '',
    )
  }

  /* ---------------------------------- 8b · Servisim açıkken gelen kayıt

     X-03, X-04 (25 Eylül 2026, kullanıcı sınaması O3). Servisim'in Hak
     Ediş ekranı ve açık talep ekranı, açık kaldıkça depodaki değişikliği
     göstermiyordu: PAKSAN'ın onayı, iptali ya da yeni iş sayfa
     yenilenene kadar görünmüyordu. Tarayıcı başka sekmenin yazısını
     `storage` olayıyla bildiriyor (lib/storage.js →
     baskaSekmeDegistirince, dinleyici ServisPanel.jsx'te); tur olayı
     kendisi gönderiyor. Yalnız EKİLEN değer aranıyor. Gezinme
     denetiminden (X-02) SONRA, çünkü depoya kayıt ekliyor; ardından
     depo yeniden kuruluyor. */
  const CANLI_NO = 'SRV2609990001'
  const CANLI_IPTAL = 'CANLI-IPTAL-0001'
  const depoOlayi = (anahtar) => `window.dispatchEvent(new StorageEvent('storage', { key: ${JSON.stringify(anahtar)} })); 1`
  async function metinBekle(parca, n = 10) {
    for (let i = 0; i < n; i++) {
      await bekle(300)
      if ((await metin()).includes(parca)) return true
    }
    return false
  }
  if (secili('X-03') || secili('X-04')) {
    await s.git(ADRES + '/servis.html')
    await depoYaz(YEREL, OTURUM)
    await s.git(ADRES + '/servis.html')
    await bekle(1800)
    const hakedisSekmesi = await s.js(`(() => { const d = document.querySelectorAll('.uyg__tab')[2]; if (!d) return 0; d.click(); return 1 })()`)
    await bekle(900)
    const canli = {
      ...bitmis,
      id: 'canli-1',
      no: CANLI_NO,
      status: 'onayBekliyor',
      hakkedis: { ...bitmis.hakkedis, durum: 'bekliyor', toplam: 4321 },
    }
    await s.js(`(() => { const k = 'paksan.requests'; const l = JSON.parse(localStorage.getItem(k) || '[]'); l.unshift(${JSON.stringify(canli)}); localStorage.setItem(k, JSON.stringify(l)); return 1 })()`)
    await s.js(depoOlayi('paksan.requests'))
    const x03 = hakedisSekmesi ? await metinBekle(CANLI_NO) : false
    if (secili('X-03')) {
      kaydet(
        'X-03',
        'Servisim Hak Ediş açıkken gelen kayıt listeye düşüyor',
        !hakedisSekmesi ? 'Hak Ediş sekmesi yok — ERİŞİLEMEDİ' : x03 ? null : `${CANLI_NO} depoya yazıldı, ekrana düşmedi`,
        await metin(),
      )
    }
    if (secili('X-04')) {
      const kart = x03
        ? await s.js(`(() => {
            const h = [...document.querySelectorAll('button, [role="button"], a')].find((x) => (x.innerText || '').includes(${JSON.stringify(CANLI_NO)}))
            if (!h) return 0
            h.click(); return 1
          })()`)
        : 0
      let x04 = false
      if (kart) {
        await bekle(900)
        await s.js(`(() => { const k = 'paksan.requests'; const l = JSON.parse(localStorage.getItem(k) || '[]').map((t) => t.id === 'canli-1' ? { ...t, status: 'iptal', iptalBilgi: { neden: ${JSON.stringify(CANLI_IPTAL)} } } : t); localStorage.setItem(k, JSON.stringify(l)); return 1 })()`)
        await s.js(depoOlayi('paksan.requests'))
        x04 = await metinBekle(CANLI_IPTAL)
      }
      kaydet(
        'X-04',
        'Açık talep ekranı depodaki değişikliği gösteriyor',
        !kart ? `${CANLI_NO} taşıyan kart açılamadı — ERİŞİLEMEDİ` : x04 ? null : 'talep başka sekmede iptal edildi, açık ekran eski hâlinde kaldı',
        await metin(),
      )
    }
  }

  /* X-05 (25 Eylül 2026, kullanıcı sınaması). Yüzen "Sipariş Ver" /
     "Kayıt Aç" düğmesi bazen tepki vermiyor ya da alttaki karta
     tıklatıyordu: görünen hap ile dokunulan alan aynı değildi. Hapın
     dört köşesinin 2 piksel içi düğmeye düşmeli. */
  if (secili('X-05')) {
    await s.git(ADRES + '/servis.html')
    await depoYaz(YEREL, OTURUM)
    await s.git(ADRES + '/servis.html')
    await bekle(1800)
    await s.js(`document.querySelectorAll('.uyg__tab')[1]?.click(); 1`)
    await bekle(900)
    const kose = await s.js(`(() => {
      const hap = document.querySelector('.uyg__fab-hap') || document.querySelector('.uyg__fab')
      if (!hap) return 'yok'
      const r = hap.getBoundingClientRect()
      const n = [[r.left + 2, r.top + 2], [r.right - 2, r.top + 2], [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2]]
      return JSON.stringify(n.map(([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest('.uyg__fab'))))
    })()`)
    kaydet(
      'X-05',
      'Yüzen düğmenin köşeleri düğmeye düşüyor',
      kose === 'yok' ? 'yüzen düğme yok — ERİŞİLEMEDİ' : kose === '[true,true,true,true]' ? null : `köşeler: ${kose}`,
      '',
    )
  }

  /* ---------------------------------- 8c · Connect davranışları

     C-29…C-32 (25 Eylül 2026, inceleme). Ekrandaki kararlar (formun
     yerine kart, "Sorun Devam Ediyor"un yerine kart, kaldırılan talebin
     geri alma görünümü, DENEME kutusunun demo işaretine bağlılığı)
     hiçbir sınamada yoktu; kapısı kaldırılsa hiçbir şey düşmezdi. Metne
     bakılmıyor: `data-eylem`, `data-deneme` işaretleri ve ekilen
     değerler sayılıyor. Kayıtlar depoya burada ekleniyor, gezinme
     denetiminden (X-02) SONRA; sonraki bölüm depoyu yeniden kuruyor. */
  const CANLI_OZET = 'CANLI-OZET-0001'
  const makineOf = (mk) => ({ id: mk.id, serial: mk.serial, productId: mk.productId })
  const connectTalebi = (ek) => ({
    ...bitmis,
    servisKaydi: null,
    hakkedis: null,
    cozum: null,
    plan: null,
    tekrar: [],
    eklemeler: [],
    gecmis: [],
    ...ek,
  })
  const SUREN = connectTalebi({ id: 'canli-s', no: 'SRV2609990012', status: 'planlandi', makine: makineOf(makineler[1]) })
  const KAPANAN = connectTalebi({
    id: 'canli-k',
    no: 'SRV2609990011',
    status: 'kapandi',
    makine: makineOf(makineler[1]),
    cozum: { yapilanIs: 'Ayar Yapıldı', ozet: 'Sınama kapanışı', tarih: Date.now() },
  })
  const KAPANAN2 = connectTalebi({
    id: 'canli-k2',
    no: 'SRV2609990013',
    status: 'kapandi',
    makine: makineOf(makineler[2]),
    cozum: { yapilanIs: 'Ayar Yapıldı', ozet: 'Sınama kapanışı', tarih: Date.now() },
  })
  const say = (secici) => s.js(`document.querySelectorAll(${JSON.stringify(secici)}).length`)
  async function sayiBekle(secici, hedef, n = 12) {
    let v = -1
    for (let i = 0; i < n; i++) {
      await bekle(300)
      v = await say(secici)
      if (hedef(v)) return v
    }
    return v
  }
  /* Gizlilik ve İzinler'in izin satırları (30 Eylül 2026, kullanıcının
     itirazı: "listelenen izinler için herhangi bir izin alınmıyor …
     tıklandığında da izin alma ekranı gelmiyor"). İki uygulamada aynı
     sınama: satırlar yalnız gerçek izinler (bildirim, mikrofon; kamera ve
     konum kalktı); mikrofonun durumu okunmuş; tarayıcıda izin henüz
     sorulmamış ve "İzin Ver" var; düğmeye basınca mikrofon GERÇEKTEN
     isteniyor (getUserMedia sayfada taklit: headless Chrome'da mikrofon
     yok) ve satır "açık"a dönüp düğme kalkıyor. Yazılara bakılmıyor. */
  async function izinSatirlariniSina() {
    const izinler = await s.js(`[...document.querySelectorAll('[data-izin]')].map((x) => x.dataset.izin).join(',')`)
    if (izinler !== 'bildirim,mikrofon') return `izin satırları yalnız bildirim ve mikrofon olmalı ("${izinler}")`
    let durum = ''
    for (let i = 0; i < 12 && !durum; i++) {
      await bekle(250)
      durum = await s.js(`document.querySelector('[data-izin="mikrofon"]')?.dataset.durum || ''`)
    }
    if (!durum) return 'mikrofon satırı izin durumunu okumadı'
    if (durum !== 'sorulmadi') return `tarayıcıda mikrofon durumu beklenmedik ("${durum}") — ERİŞİLEMEDİ`
    if ((await say('[data-izin="mikrofon"] [data-eylem="mikrofon-izni"]')) < 1) return 'sorulmamış mikrofon izninde "İzin Ver" yok'
    await s.js(`(() => {
      window.__mikrofonIstendi = false;
      navigator.mediaDevices.getUserMedia = async (k) => { window.__mikrofonIstendi = !!(k && k.audio); return { getTracks: () => [] } };
      document.querySelector('[data-eylem="mikrofon-izni"]').click();
      return 1
    })()`)
    let sonra = ''
    for (let i = 0; i < 12 && sonra !== 'acik'; i++) {
      await bekle(250)
      sonra = await s.js(`document.querySelector('[data-izin="mikrofon"]')?.dataset.durum || ''`)
    }
    if (!(await s.js('window.__mikrofonIstendi'))) return '"İzin Ver" mikrofon iznini istemedi'
    if (sonra !== 'acik') return `izin verildikten sonra satır "açık" göstermiyor ("${sonra}")`
    if ((await say('[data-eylem="mikrofon-izni"]')) > 0) return 'izin verildikten sonra "İzin Ver" kalkmadı'
    return null
  }
  async function connectKur(ekTalepler, gizlenen = []) {
    await s.git(ADRES + '/')
    await depoYaz(
      {
        ...YEREL,
        'paksan.requests': JSON.stringify([...ekTalepler, ...JSON.parse(YEREL['paksan.requests'] || '[]')]),
        'paksan.gizlenenTalepler': JSON.stringify(gizlenen),
      },
      OTURUM,
    )
  }

  /* C-29 · Makinede süren iş varken talep formu yerine kart; kartın
     düğmesi süren talebin ekleme penceresini Destek'ten gelen özetle
     açıyor (O5, Destek özeti). */
  if (secili('C-29')) {
    await connectKur([SUREN])
    await s.git(ADRES + '/#/talep?tur=servis&makine=' + makineler[1].id + '&destek=' + CANLI_OZET)
    const kart = await sayiBekle('[data-eylem="acik-talebe-ekle"]', (v) => v > 0)
    const gonder = await say('.btn--primary.btn--lg')
    let hata = kart < 1 ? 'süren iş varken kart çıkmadı (form açık)' : gonder > 0 ? 'süren iş varken formun gönder düğmesi duruyor' : null
    if (!hata) {
      await s.js(`document.querySelector('[data-eylem="acik-talebe-ekle"] button')?.click(); 1`)
      let not = false
      for (let i = 0; i < 12 && !not; i++) {
        await bekle(300)
        not = await s.js(`[...document.querySelectorAll('textarea')].some((x) => x.value.includes(${JSON.stringify(CANLI_OZET)}))`)
      }
      const adres = await s.js('location.hash')
      if (!String(adres).includes(SUREN.id)) hata = `kart süren talebe götürmedi (${adres})`
      else if (!not) hata = 'ekleme penceresi Destek özetini taşımadı'
    }
    kaydet('C-29', 'Makinede süren iş varken talep formu yerine ekleme kartı', hata, await metin())
  }

  /* C-30 · Kapanmış talepte "Sorun Devam Ediyor": aynı makinede başka iş
     sürerken yerine süren talebe ekleme kartı; başka iş yoksa düğme. */
  if (secili('C-30')) {
    await connectKur([SUREN, KAPANAN, KAPANAN2])
    await s.git(ADRES + '/#/talebim/' + KAPANAN.id)
    const kart = await sayiBekle('[data-eylem="suren-talebe-ekle"]', (v) => v > 0)
    const devam = await say('[data-eylem="sorun-devam"]')
    await s.git(ADRES + '/#/talebim/' + KAPANAN2.id)
    const devam2 = await sayiBekle('[data-eylem="sorun-devam"]', (v) => v > 0)
    const hata =
      kart < 1 ? 'süren iş varken kart çıkmadı'
        : devam > 0 ? 'süren iş varken "Sorun Devam Ediyor" duruyor (makinede iki açık talep olur)'
          : devam2 < 1 ? 'başka iş yokken "Sorun Devam Ediyor" çıkmadı — ERİŞİLEMEDİ'
            : null
    kaydet('C-30', 'Süren iş varken kapanmış talep yeniden açılmıyor', hata, await metin())
  }

  /* C-31 · Kaldırılan talebe gelindiğinde geri alma görünümü; geri alınca
     talep listeye dönüyor ve gizleme defterinden çıkıyor (O9). */
  if (secili('C-31')) {
    await connectKur([KAPANAN2], [KAPANAN2.id])
    await s.git(ADRES + '/#/talebim/' + KAPANAN2.id)
    const geriAl = await sayiBekle('[data-eylem="talep-geri-al"]', (v) => v > 0)
    let hata = geriAl < 1 ? 'kaldırılan talepte geri alma düğmesi yok' : null
    if (!hata) {
      await s.js(`document.querySelector('[data-eylem="talep-geri-al"]')?.click(); 1`)
      const acildi = await sayiBekle('[data-eylem="sorun-devam"]', (v) => v > 0)
      const defter = await s.js(`localStorage.getItem('paksan.gizlenenTalepler') || '[]'`)
      if (acildi < 1) hata = 'geri alınan talep ekranda açılmadı'
      else if (String(defter).includes(KAPANAN2.id)) hata = 'geri alınan talep gizleme defterinde kaldı'
    }
    kaydet('C-31', 'Kaldırılan talep geri alınabiliyor', hata, await metin())
  }

  /* C-32 · DENEME kutusu yalnız demo işaretli derlemede (O10). Sunucunun
     index.html'i işaretli: kutu çıkmalı; işaret kaldırılınca (canlı
     derleme gibi) aynı ekran kutusuz. Sayfa yenilenmiyor, işaret kodda
     çağrı anında okunuyor (lib/demoSurumu.js). */
  if (secili('C-32')) {
    await connectKur([])
    await s.git(ADRES + '/#/makine-ekle')
    const demoda = await sayiBekle('[data-deneme]', (v) => v > 0)
    await s.js(`document.documentElement.removeAttribute('data-demo'); location.hash = '#/'; 1`)
    await bekle(600)
    await s.js(`location.hash = '#/makine-ekle'; 1`)
    const canlida = await sayiBekle('[data-deneme]', (v) => v === 0, 6)
    const hata =
      demoda < 1 ? 'demo işaretli derlemede DENEME kutusu yok — ERİŞİLEMEDİ'
        : canlida > 0 ? 'demo işareti kalkınca DENEME kutusu hâlâ çiziliyor'
          : null
    kaydet('C-32', 'DENEME kutusu yalnız demo derlemesinde', hata, '')
  }

  /* C-33 · Servisi atanmamış makine seçilince talep formu yerine kart,
     gönder düğmesi yok (26 Eylül 2026, ikinci kullanıcı sınaması O1).
     Önce yalnız makine kutusunun altında not çıkıyor, form açık
     kalıyordu; çiftçi her şeyi doldurup "Gönder"de geri çevriliyordu.
     Hesabın öteki makinelerinin servisi var: ekranın tamamını kaplayan
     "servis yok" kartı (hiç servisi olmayan hesap) çıkmamalı. Makine
     defterde olmayan seriyle ekleniyor; zincirde servisi yok. */
  if (secili('C-33')) {
    const servissiz = {
      id: 'canli-servissiz',
      serial: String(makineler[0].serial).slice(0, -5) + '99901',
      productId: makineler[0].productId,
      year: 2025,
      addedAt: Date.now(),
      hours: 0,
      doneMaintenance: [],
      nickname: '',
    }
    await s.git(ADRES + '/')
    await depoYaz(
      { ...YEREL, 'paksan.machines': JSON.stringify([...JSON.parse(YEREL['paksan.machines'] || '[]'), servissiz]) },
      OTURUM,
    )
    await s.git(ADRES + '/#/talep?tur=servis&makine=' + servissiz.id)
    const kart = await sayiBekle('[data-eylem="servis-atanmamis"]', (v) => v > 0)
    const gonder = await say('.btn--primary.btn--lg')
    /* Makine 29 Eylül 2026'dan beri açılır kutudan değil fotoğraflı
       kartlardan seçiliyor (RequestForm.jsx → makine-secim, görünüm
       önerisi C5); kartlar radyo düğmesi rolünde sayılıyor. */
    const secim = await say('.makine-secim [role="radio"]')
    const hata =
      kart < 1 ? 'servisi olmayan makinede kart çıkmadı (form açık)'
        : gonder > 0 ? 'servisi olmayan makinede formun gönder düğmesi duruyor'
          : secim < 1 ? 'makine seçimi kalktı (ekranın tamamı "servis yok" kartı oldu)'
            : null
    kaydet('C-33', 'Servisi atanmamış makinede talep formu yerine kart', hata, await metin())
  }

  /* C-34 · Destek'in arıza rehberi uçtan uca (29 Eylül 2026). Destek
     sunucudaki asistandan hazır arıza-çözüm ağacına döndü
     (screens/ArizaCozumu.jsx, src/config.js → DESTEK_KIPI). Makine
     adresten geliyor; bölüm → belirti → çözüm yürünüyor, ilk neden
     "Kontrol Ettim" ile işaretleniyor, "Hayır, Devam Ediyor" ve servis
     talebine geçiliyor. Talep formunun açıklaması hem belirtiyi hem
     işaretlenen nedeni taşımalı: servis aynı kontrolü baştan yapmasın
     (RequestForm.jsx → destek, denenen). Yazılara bakılmıyor, sınıflara
     ve ekrandan okunan adlara bakılıyor. */
  if (secili('C-34')) {
    await connectKur([])
    await s.git(ADRES + '/#/destek/' + makineler[1].id)
    const bolumler = await sayiBekle('.destek-secenek', (v) => v > 0)
    let hata = bolumler < 1 ? 'Destek bölüm listesi boş — ERİŞİLEMEDİ' : null
    if (!hata) {
      await s.js(`document.querySelector('.destek-secenek')?.click(); 1`)
      await bekle(400)
      await s.js(`document.querySelector('.destek-secenek')?.click(); 1`)
      const nedenler = await sayiBekle('.destek-neden', (v) => v > 0)
      if (nedenler < 1) hata = 'belirti seçilince çözüm açılmadı'
    }
    let belirti = ''
    let neden = ''
    if (!hata) {
      belirti = await s.js(`document.querySelector('.destek-cozum__baslik')?.textContent || ''`)
      neden = await s.js(`document.querySelector('.destek-neden h4')?.textContent || ''`)
      await s.js(`document.querySelector('.destek-isaret')?.click(); 1`)
      const isaretli = await sayiBekle('.destek-isaret[aria-pressed="true"]', (v) => v > 0)
      if (isaretli < 1) hata = '"Kontrol Ettim" işareti tutmadı'
    }
    if (!hata) {
      /* İki cevap artık aynı biçimde (29 Eylül 2026, görünüm önerisi C6);
         "Hayır" sınıfıyla değil kendi işaretiyle bulunuyor. */
      await s.js(`document.querySelector('.destek-sonuc [data-cevap="hayir"]')?.click(); 1`)
      const talepDugmesi = await sayiBekle('.destek-sonuc .btn--primary', (v) => v > 0)
      if (talepDugmesi < 1) hata = '"Devam Ediyor" deyince servis talebi düğmesi çıkmadı'
    }
    if (!hata) {
      await s.js(`document.querySelector('.destek-sonuc .btn--primary')?.click(); 1`)
      let aciklama = ''
      for (let i = 0; i < 12; i++) {
        await bekle(300)
        aciklama = await s.js(`[...document.querySelectorAll('textarea')].map((x) => x.value).join('\\n')`)
        if (aciklama) break
      }
      if (!aciklama) hata = 'talep formu açılmadı ya da açıklama boş'
      else if (!aciklama.includes(belirti)) hata = 'talep açıklaması belirtiyi taşımıyor'
      else if (!aciklama.includes(neden)) hata = 'kontrol edilen neden talebe yazılmadı'
    }
    kaydet('C-34', 'Destek arıza rehberi: kontrol edilen neden servis talebine yazılıyor', hata, await metin())
  }

  /* C-35 · Kullanım kılavuzu PDF'i (29 Eylül 2026). Kılavuz sunucudaki
     klasörden bir kez indiriliyor, telefonda saklanıyor ve internetsiz
     açılıyor (screens/KilavuzPdf.jsx, lib/kilavuzPdf.js). İndirme
     kartındaki ana düğmeye basılıyor, ilk sayfanın tuvali çizilmeli.
     Sonra uygulamanın içinde listeye dönülüp bağlantı KESİLİYOR ve
     kılavuz yeniden açılıyor: telefondan açılmalı. Son olarak Destek'in
     bağlantısı (?bolum=ariza) arıza tablosunun sayfasına atlamalı;
     sayfa numarası sunucudaki listeden, yazıya değil rakama bakılıyor.
     PDF sunucuda yoksa (depoda değil, bkz. sunucu-taklidi/BENIOKU.md)
     indirme hata verir ve denetim düşer. */
  if (secili('C-35')) {
    const cizildi = (no) =>
      `(() => { const c = document.querySelector('#kilavuz-sayfa-${no} canvas'); return c ? c.width : 0 })()`
    const bekleCizim = async (no, n = 60) => {
      for (let i = 0; i < n; i++) {
        await bekle(500)
        if ((await s.js(cizildi(no))) > 0) return true
      }
      return false
    }
    await connectKur([])
    await s.js(`caches.delete('paksan-kilavuzlar').then(() => 1)`)
    await s.git(ADRES + '/#/kilavuz/hammer')
    const kart = await sayiBekle('.kilavuz-pdf__kart .btn--primary', (v) => v > 0)
    let hata = kart < 1 ? 'kılavuzun indirme kartı çıkmadı — ERİŞİLEMEDİ' : null
    if (!hata) {
      await s.js(`document.querySelector('.kilavuz-pdf__kart .btn--primary').click(); 1`)
      if (!(await bekleCizim(1))) hata = 'kılavuz indirilip açılmadı (ilk sayfa çizilmedi)'
    }
    if (!hata) {
      const kayitli = await s.js(`caches.open('paksan-kilavuzlar').then((c) => c.keys()).then((k) => k.length)`)
      if (kayitli < 1) hata = 'kılavuz telefona kaydedilmedi'
    }
    if (!hata) {
      await s.js(`location.hash = '#/kilavuzlar'; 1`)
      await bekle(900)
      await s.cdp.gonder('Network.enable', {}, s.oturum)
      await s.cdp.gonder('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, s.oturum)
      await s.js(`location.hash = '#/kilavuz/hammer'; 1`)
      const acildi = await bekleCizim(1, 30)
      await s.cdp.gonder('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, s.oturum)
      if (!acildi) hata = 'kaydedilen kılavuz internetsiz açılmadı'
    }
    if (!hata) {
      await s.git(ADRES + '/#/kilavuz/hammer?bolum=ariza')
      const liste = JSON.parse(readFileSync(join(KOK, 'sunucu-taklidi', 'kilavuzlar', 'kilavuzlar.json'), 'utf8'))
      const sayfa = liste.kilavuzlar.MCH_HAMMER_SERIES.arizaSayfasi
      await bekleCizim(sayfa, 30)
      await bekle(800)
      const gorunen = await s.js(`document.querySelector('.kilavuz-pdf-arac__sayfa')?.textContent || ''`)
      if (!gorunen.startsWith(sayfa + ' ')) hata = `arıza tablosuna atlamadı (${sayfa}. sayfa beklendi, "${gorunen}")`
    }
    kaydet('C-35', 'Kılavuz PDF: indiriliyor, internetsiz açılıyor, arıza sayfasına atlıyor', hata, await metin())
  }

  /* C-36 · Destek'in parça adı talep formunda katalog koduna çevriliyor
     (29 Eylül 2026). "Bu Parçaları Talep Et" adları taşıyor; form adı
     marka tablosuyla koda çeviriyor (data/icerik/destekVerisi.js →
     PARCA_KODU), yalnız o parçanın uyduğu makinede. Süper 8002'de
     "Mekik dili" seçili gelmeli, tabloda olmayan "Yatak" açıklamaya
     yazılmalı; Hammer'da "Mekik dili" seçili GELMEMELİ (Hammer'ın
     parçaları kendi grubunda). Ekilen değer katalog kodu ve adı. */
  if (secili('C-36')) {
    const katalog = JSON.parse(readFileSync(join(KOK, 'sunucu-taklidi', 'parca-katalogu', 'katalog.json'), 'utf8'))
    const MEKIK = katalog.parcalar.find((p) => p.kod === '201310101110')?.ad || ''
    const formuAc = async (model) => {
      await connectKur([])
      await s.git(ADRES + '/#/talep?tur=parca&model=' + model + '&parcalar=' + encodeURIComponent('Mekik dili|Yatak'))
      let aciklama = ''
      for (let i = 0; i < 20; i++) {
        await bekle(400)
        aciklama = await s.js(`[...document.querySelectorAll('textarea')].map((x) => x.value).join('\\n')`)
        if (aciklama) break
      }
      return { aciklama, sayfa: await metin() }
    }
    let hata = MEKIK ? null : 'katalogda 201310101110 yok — ERİŞİLEMEDİ'
    if (!hata) {
      const kucuk = await formuAc('super-8002')
      if (!kucuk.sayfa.includes(MEKIK)) hata = `Süper 8002'de "${MEKIK}" seçili gelmedi`
      else if (!kucuk.aciklama.includes('Yatak')) hata = 'eşleşmeyen parça adı açıklamaya yazılmadı'
    }
    if (!hata) {
      const hammer = await formuAc('hammer')
      if (hammer.sayfa.includes(MEKIK)) hata = `Hammer'da küçük balyanın "${MEKIK}" parçası seçili geldi`
      else if (!hammer.aciklama.includes('Mekik dili')) hata = 'Hammer\'da eşleşmeyen "Mekik dili" açıklamaya yazılmadı'
    }
    kaydet('C-36', 'Destek parça adı talepte koda çevriliyor, yalnız uyduğu makinede', hata, await metin())
  }

  /* X-06 · Servisim'de açık pencere, talep başka sekmede iptal edilince
     kapanıyor (25 Eylül 2026, inceleme). Detay depodan okunuyordu ama
     açık Randevu penceresi ekranda kalıyor ve Kaydet iptal edilmiş
     talebi "planlandı"ya çeviriyordu. Veri katmanının reddi AK-28'de. */
  if (secili('X-06')) {
    const CANLI_AD = 'Canlı Pencere Sınaması'
    const yeni = connectTalebi({ id: 'canli-2', no: 'SRV2609990002', status: 'yeni', ad: CANLI_AD })
    await s.git(ADRES + '/servis.html')
    await depoYaz(YEREL, OTURUM)
    await s.git(ADRES + '/servis.html')
    await bekle(1800)
    await s.js(`(() => { const k = 'paksan.requests'; const l = JSON.parse(localStorage.getItem(k) || '[]'); l.unshift(${JSON.stringify(yeni)}); localStorage.setItem(k, JSON.stringify(l)); return 1 })()`)
    await s.js(depoOlayi('paksan.requests'))
    await metinBekle(CANLI_AD)
    const kart = await s.js(`(() => {
      const h = [...document.querySelectorAll('button, [role="button"], a')].find((x) => (x.innerText || '').includes(${JSON.stringify(CANLI_AD)}))
      if (!h) return 0
      h.click(); return 1
    })()`)
    let hata = kart ? null : `"${CANLI_AD}" taşıyan kart açılamadı — ERİŞİLEMEDİ`
    if (!hata) {
      const randevu = await sayiBekle('[data-eylem="randevu"]', (v) => v > 0)
      if (randevu < 1) hata = 'Randevu düğmesi yok — ERİŞİLEMEDİ'
      else {
        /* Servisim ekran değişince 350 ms dokunuş yutuyor (ServisPanel.jsx →
           GECIS_KILIDI_MS, 26 Eylül 2026: çift dokunuşun ikincisi yeni
           ekrandaki başka bir işi açıyordu). İş açılır açılmaz basılan
           düğme o süre içinde kalıyordu; insan elinden hızlı bir basış. */
        await bekle(400)
        await s.js(`document.querySelector('[data-eylem="randevu"]').click(); 1`)
        const acik = await sayiBekle('[data-pencere]', (v) => v > 0)
        if (acik < 1) hata = 'Randevu penceresi açılmadı — ERİŞİLEMEDİ'
        else {
          await s.js(`(() => { const k = 'paksan.requests'; const l = JSON.parse(localStorage.getItem(k) || '[]').map((t) => t.id === 'canli-2' ? { ...t, status: 'iptal', iptalBilgi: { neden: 'Sınama' } } : t); localStorage.setItem(k, JSON.stringify(l)); return 1 })()`)
          await s.js(depoOlayi('paksan.requests'))
          const kaldi = await sayiBekle('[data-pencere]', (v) => v === 0)
          if (kaldi > 0) hata = 'talep başka sekmede iptal edildi, Randevu penceresi açık kaldı'
        }
      }
    }
    kaydet('X-06', 'Servisim: talep iptal edilince açık pencere kapanıyor', hata, await metin())
  }

  /* X-07 · Servisim'de ekran değişince çift dokunuşun ikincisi yutuluyor
     (26 Eylül 2026, ikinci kullanıcı sınaması: "Kaydı Gönder"e iki kez
     dokunan servisin ikinci dokunuşu hemen açılan listede başka bir işi
     açtı). İş açılır açılmaz gelen basış Randevu penceresini açmamalı;
     kilit bitince (ServisPanel.jsx → GECIS_KILIDI_MS) açmalı. */
  if (secili('X-07')) {
    const CANLI_AD = 'Canlı Çift Dokunuş Sınaması'
    const yeni = connectTalebi({ id: 'canli-7', no: 'SRV2609990007', status: 'yeni', ad: CANLI_AD })
    await s.git(ADRES + '/servis.html')
    await depoYaz(YEREL, OTURUM)
    await s.git(ADRES + '/servis.html')
    await bekle(1800)
    await s.js(`(() => { const k = 'paksan.requests'; const l = JSON.parse(localStorage.getItem(k) || '[]'); l.unshift(${JSON.stringify(yeni)}); localStorage.setItem(k, JSON.stringify(l)); return 1 })()`)
    await s.js(depoOlayi('paksan.requests'))
    await metinBekle(CANLI_AD)
    /* Kartı aç ve AYNI GÖREVDE, ekran çizilir çizilmez Randevu'ya bas:
       çift dokunuşun ikincisi. */
    const ilk = await s.js(`new Promise((bitti) => {
      const h = [...document.querySelectorAll('button, [role="button"], a')].find((x) => (x.innerText || '').includes(${JSON.stringify(CANLI_AD)}))
      if (!h) return bitti(-1)
      h.click()
      let n = 0
      const dene = () => {
        const r = document.querySelector('[data-eylem="randevu"]')
        if (r) { r.click(); return bitti(1) }
        if (++n > 20) return bitti(0)
        requestAnimationFrame(dene)
      }
      requestAnimationFrame(dene)
    })`)
    let hata =
      ilk === -1 ? `"${CANLI_AD}" taşıyan kart açılamadı — ERİŞİLEMEDİ`
        : ilk === 0 ? 'Randevu düğmesi çizilmedi — ERİŞİLEMEDİ'
          : null
    if (!hata) {
      await bekle(150)
      const hemen = await say('[data-pencere]')
      if (hemen > 0) hata = 'iş açılır açılmaz gelen dokunuş Randevu penceresini açtı (çift dokunuş yutulmadı)'
      else {
        await bekle(400)
        await s.js(`document.querySelector('[data-eylem="randevu"]')?.click(); 1`)
        const sonra = await sayiBekle('[data-pencere]', (v) => v > 0)
        if (sonra < 1) hata = 'kilit bittikten sonraki dokunuş da yutuldu (Randevu açılmadı)'
      }
    }
    kaydet('X-07', 'Servisim: ekran değişince çift dokunuşun ikincisi yutuluyor', hata, await metin())
  }

  /* X-08 · Servisim'de "Yol Tarifi" (29 Eylül 2026). İş ayrıntısında
     adresin altındaki bağlantı telefonun harita uygulamasını işin YAZILI
     adresiyle açıyor (lib/yolTarifi.js). Bağlantının hedefi adresi, ilçeyi
     ve ili taşımalı; adresi olmayan işte bağlantı çıkmamalı. Bağlantıya
     basılmıyor, dış siteye gidilmiyor. */
  if (secili('X-08')) {
    const CANLI_AD = 'Canlı Yol Tarifi Sınaması'
    const ADRES_YAZI = 'Tatköy Mahallesi, kooperatifin arkası'
    const adresli = connectTalebi({ id: 'canli-8', no: 'SRV2609990008', status: 'yeni', ad: CANLI_AD, il: 'Konya', ilce: 'Selçuklu', adres: ADRES_YAZI })
    await s.git(ADRES + '/servis.html')
    await depoYaz(YEREL, OTURUM)
    await s.git(ADRES + '/servis.html')
    await bekle(1800)
    await s.js(`(() => { const k = 'paksan.requests'; const l = JSON.parse(localStorage.getItem(k) || '[]'); l.unshift(${JSON.stringify(adresli)}); localStorage.setItem(k, JSON.stringify(l)); return 1 })()`)
    await s.js(depoOlayi('paksan.requests'))
    await metinBekle(CANLI_AD)
    const acti = await s.js(`(() => { const h = [...document.querySelectorAll('button, [role="button"], a')].find((x) => (x.innerText || '').includes(${JSON.stringify(CANLI_AD)})); if (!h) return 0; h.click(); return 1 })()`)
    let hata = acti ? null : `"${CANLI_AD}" taşıyan kart açılamadı — ERİŞİLEMEDİ`
    if (!hata) {
      await bekle(900)
      const hedef = await s.js(`(() => { const a = document.querySelector('a[href^="https://www.google.com/maps/dir/"]'); return a ? decodeURIComponent(a.href.split('destination=')[1] || '') : '' })()`)
      if (!hedef) hata = 'adresli işte Yol Tarifi bağlantısı yok'
      else if (!hedef.includes(ADRES_YAZI) || !hedef.includes('Selçuklu') || !hedef.includes('Konya')) hata = `Yol Tarifi hedefi eksik: "${hedef}"`
    }
    kaydet('X-08', 'Servisim: Yol Tarifi işin yazılı adresini haritaya taşıyor', hata, await metin())
  }

  /* C-37 · KVKK: metin güncellemesinde yeniden onay ve Gizlilik ve
     İzinler sayfası (29 Eylül 2026). (a) Eski sürümü (1.0) onaylamış
     hesap Connect'i açınca güncelleme penceresi çıkıyor; iki kutu
     işaretlenip onaylanınca pencere kalkıyor ve hesaba yeni sürüm ile
     "connectGuncelleme" kanallı iki olay yazılıyor. (b) Gizlilik ve
     İzinler sayfası onay tarihini ve sürümünü gösteriyor; kampanya
     kutusu kapatılınca hesaba "geriCekme" olayı ve son değişiklik tarihi
     yazılıyor ve sayfada görünüyor. Ekilen değer: onay sürümü ve
     sabit onay tarihi. */
  if (secili('C-37')) {
    const ONAY_ANI = Date.UTC(2026, 7, 14, 9, 0, 0)
    const hesapla = (surum) => {
      const y = { ...YEREL }
      const o = { ...OTURUM }
      for (const [depo, k] of [[y, 'paksan.hesap'], [o, 'paksan.user']]) {
        if (!depo[k]) continue
        const h = JSON.parse(depo[k])
        h.onaylar = { ...h.onaylar, surum, tarih: ONAY_ANI }
        depo[k] = JSON.stringify(h)
      }
      return { y, o }
    }
    const hesapOku = `JSON.parse(localStorage.getItem('paksan.hesap') || 'null')`
    let hata = null

    // (a) eski sürüm → pencere
    const eski = hesapla('1.0')
    await s.git(ADRES + '/')
    await depoYaz(eski.y, eski.o)
    await s.git(ADRES + '/')
    const pencere = await sayiBekle('[data-kvkk-guncelleme]', (v) => v > 0)
    if (pencere < 1) hata = 'eski sürümü onaylamış hesapta güncelleme penceresi çıkmadı'
    /* Onay zorunlu (29.09.2026, kullanıcının kararı): pencere zemine
       dokunarak kapanmıyor, ertele düğmesi yok. */
    if (!hata) {
      await bekle(500)
      await s.js(`(() => { const z = document.querySelector('.sheet-backdrop'); z?.dispatchEvent(new MouseEvent('click', { bubbles: true })); return 1 })()`)
      await bekle(300)
      if ((await say('[data-kvkk-guncelleme]')) < 1) hata = 'güncelleme penceresi zemine dokununca kapandı (onay zorunlu olmalı)'
      else if ((await say('[data-kvkk-guncelleme] .btn--soft')) > 0) hata = 'güncelleme penceresinde erteleme düğmesi var'
    }
    if (!hata) {
      await s.js(`(() => { document.querySelectorAll('[data-kvkk-guncelleme] .onay__giris').forEach((c) => c.click()); return 1 })()`)
      await bekle(200)
      await s.js(`document.querySelector('[data-kvkk-guncelleme] .btn--primary')?.click(); 1`)
      const kalan = await sayiBekle('[data-kvkk-guncelleme]', (v) => v === 0)
      const h = await s.js(hesapOku)
      const son = (h?.onaylar?.olaylar || []).slice(-2)
      if (kalan > 0) hata = 'onaydan sonra güncelleme penceresi kalkmadı'
      else if (h?.onaylar?.surum !== KVKK_SURUMU) hata = `onaydan sonra hesabın sürümü "${h?.onaylar?.surum}"`
      else if (son.length < 2 || !son.every((o) => o.kanal === 'connectGuncelleme' && o.secim === 'onay'))
        hata = 'güncelleme onayı olay olarak yazılmadı'
    }

    // (b) Gizlilik ve İzinler sayfası
    if (!hata) {
      const guncel = hesapla(KVKK_SURUMU)
      await s.git(ADRES + '/')
      await depoYaz(guncel.y, guncel.o)
      await s.git(ADRES + '/#/gizlilik')
      await sayiBekle('[data-metin="aydinlatma"]', (v) => v > 0)
      const alt = await s.js(`document.querySelector('[data-metin="aydinlatma"] .listitem__sub')?.innerText || ''`)
      if (!alt.includes(KVKK_SURUMU)) hata = `Aydınlatma Metni satırı onay sürümünü göstermiyor ("${alt}")`
    }
    if (!hata) hata = await izinSatirlariniSina()
    if (!hata) {
      await s.js(`document.querySelector('[data-alan="kampanya"] .onay__giris')?.click(); 1`)
      await sayiBekle('[data-kampanya-tarih]', (v) => v > 0)
      const h = await s.js(hesapOku)
      const son = (h?.onaylar?.olaylar || []).slice(-1)[0]
      if (h?.onaylar?.kampanya !== false) hata = 'kampanya kutusu kapatılınca hesapta izin kapanmadı'
      else if (son?.metin !== 'ticariIleti' || son?.secim !== 'geriCekme' || son?.kanal !== 'connectProfil')
        hata = `kampanya kapatma olay olarak yazılmadı (${JSON.stringify(son)})`
      else if (!h.onaylar.kampanyaTarih) hata = 'kampanya izninin son değişiklik tarihi yazılmadı'
      else if ((await say('[data-kampanya-tarih]')) < 1) hata = 'sayfada son değişiklik tarihi görünmüyor'
    }
    kaydet('C-37', 'KVKK: metin güncellemesinde yeniden onay, Gizlilik ve İzinler sayfası ve kampanya kaydı', hata, await metin())
  }

  /* C-38 · Yedek parçanın ödeme adımında banka hesabı kartı (30 Eylül
     2026, kullanıcının isteği: PAKSAN'ın hesap bilgileri "Hesap Bilgileri
     kısmına güzel ve en iyi şekilde entegre" edilsin; RequestForm.jsx →
     Hesaplar). Parça talebi C-36'nın yoluyla açılıyor (Destek'in parça
     adı Süper 8002'de seçili geliyor), form gönderilip ödeme adımına
     geçiliyor. Kartta: (a) görünen IBAN data/kimlik.js'tekiyle aynı —
     ekilen değer src/data/kimlik.js'ten okunan IBAN; (b) IBAN düğmesi
     panoya IBAN'ı BOŞLUKSUZ yazıyor (pano sayfada taklit ediliyor);
     (c) kartta tutar YOK (30.09.2026, kullanıcının isteği: tutar yalnız
     sayfanın başındaki özette); (d) havale açıklaması
     müşterinin (tohumun) adını VE özetteki talep numarasını
     (data-talep-no) taşıyor, açıklama düğmesi panoya aynısını yazıyor —
     numara yoksa muhasebe ödemeyi talebe bağlayamıyor (inceleme bulgusu,
     30.09.2026: önce yalnız ad aranıyordu, kalıptan {no} silinince tur
     yeşil kalıyordu); (e) IBAN'ın seçimi tek satır, öbekler arasında
     boşluk — pano kapalıyken elle kopyalamanın yolu; (f) formun seçili
     parça satırında parçanın resmi var; (g) IBAN tek satırda, taşmadan.
     Yazılara bakılmıyor. */
  if (secili('C-38')) {
    const kimlik = readFileSync(join(KOK, 'src', 'data', 'kimlik.js'), 'utf8')
    const IBAN_YAZI = kimlik.match(/iban:\s*'([A-Z]{2}[0-9 ]{10,})'/)?.[1] || ''
    const IBAN = IBAN_YAZI.replace(/\s/g, '')
    const katalog = JSON.parse(readFileSync(join(KOK, 'sunucu-taklidi', 'parca-katalogu', 'katalog.json'), 'utf8'))
    const MEKIK = katalog.parcalar.find((p) => p.kod === '201310101110')?.ad || ''
    let hata = !IBAN ? "kimlik.js'te IBAN yok — ERİŞİLEMEDİ" : !MEKIK ? 'katalogda 201310101110 yok — ERİŞİLEMEDİ' : null
    if (!hata) {
      await connectKur([])
      await s.git(ADRES + '/#/talep?tur=parca&model=super-8002&parcalar=' + encodeURIComponent('Mekik dili'))
      let secildi = false
      for (let i = 0; i < 20 && !secildi; i++) {
        await bekle(400)
        secildi = (await metin()).includes(MEKIK)
      }
      if (!secildi) hata = `parça seçili gelmedi ("${MEKIK}") — ERİŞİLEMEDİ`
    }
    if (!hata) {
      /* (f) Formun seçili parçalar listesinde satır parçanın resmini
         taşıyor (30.09.2026, kullanıcının isteği: "Connect formundaki
         seçili parçalar listesinde de görseller gelsin"). Kodun resmi
         katalogda var; img aranıyor, "Görsel yok" yazısı değil. */
      const resim = await sayiBekle('[data-secili-parca="201310101110"] .parca-resmi img', (v) => v > 0)
      if (resim < 1) hata = 'formun seçili parça satırında parçanın resmi yok'
    }
    if (!hata) {
      await s.js(`document.querySelector('.btn--primary.btn--lg')?.click(); 1`)
      const kart = await sayiBekle('[data-banka-hesabi]', (v) => v > 0)
      if (kart < 1) hata = 'ödeme adımında banka hesabı kartı yok'
    }
    if (!hata) {
      const gorunen = await s.js(`(document.querySelector('[data-iban]')?.innerText || '').replace(/\\s/g, '')`)
      /* Uzun basınca olan seçimin aynısı: IBAN'ın tamamı seçiliyor. */
      const secim = await s.js(`(() => {
        const el = document.querySelector('[data-iban]');
        if (!el) return '';
        const sec = getSelection();
        sec.selectAllChildren(el);
        const yazi = sec.toString();
        sec.removeAllRanges();
        return yazi
      })()`)
      if (gorunen !== IBAN) hata = `kartta görünen IBAN data/kimlik.js'tekiyle aynı değil ("${gorunen}")`
      else if (secim.trim() !== IBAN_YAZI) hata = `IBAN seçilince öbekler boşlukla tek satır gelmiyor (${JSON.stringify(secim)})`
      else if ((await say('[data-kopyala="iban"]')) < 1) hata = 'IBAN kopyalama düğmesi yok'
      else {
        /* (g) IBAN tek satırda (30.09.2026, kullanıcının isteği): yüksekliği
           bir satır yüksekliğini aşmıyor ve yazı taşmıyor. Tur 1400
           piksellik pencerede koşuyor, orada kart zaten geniş; ölçü
           360 piksellik telefon boyunda alınıyor, sonra pencere geri. */
        await s.olcu({ width: 360, height: 780, deviceScaleFactor: 1, mobile: true })
        await bekle(500)
        const satir = await s.js(`(() => { const e = document.querySelector('[data-iban]');
          const cs = getComputedStyle(e); return { h: e.getBoundingClientRect().height, lh: parseFloat(cs.lineHeight), sw: e.scrollWidth, cw: e.clientWidth, w: innerWidth } })()`)
        await s.olcu({ width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false })
        await bekle(300)
        if (satir.h > satir.lh * 1.3 || satir.sw > satir.cw)
          hata = `IBAN tek satırda değil (${satir.w} piksel ekran; yükseklik ${Math.round(satir.h)}, satır ${Math.round(satir.lh)}, taşma ${satir.sw - satir.cw})`
      }
    }
    if (!hata) {
      await s.js(`(() => {
        window.__kopya = null;
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: (x) => { window.__kopya = x; return Promise.resolve() } },
        });
        document.querySelector('[data-kopyala="iban"]').click();
        return 1
      })()`)
      await bekle(300)
      const kopya = await s.js('window.__kopya')
      if (kopya !== IBAN) hata = `IBAN düğmesi panoya IBAN'ı boşluksuz yazmadı (${JSON.stringify(kopya)})`
    }
    if (!hata) {
      const kartta = await s.js(`document.querySelector('[data-banka-hesabi]')?.innerText || ''`)
      const ozette = await s.js(`document.querySelector('.tutar-kutu__satir--toplam span:last-child')?.textContent.trim() || ''`)
      const aciklama = await s.js(`document.querySelector('[data-aciklama]')?.textContent || ''`)
      const talepNo = await s.js(`document.querySelector('[data-talep-no]')?.textContent.trim() || ''`)
      if (!ozette) hata = 'özette gönderilecek tutar yok — ERİŞİLEMEDİ'
      else if (!talepNo) hata = 'ödeme adımının özetinde talep numarası yok (data-talep-no)'
      else if (kartta.includes(ozette)) hata = `kartta tutar görünüyor ("${ozette}"); tutar yalnız özette olmalı`
      else if (!aciklama.includes(MUSTERI.ad)) hata = `havale açıklaması müşterinin adını taşımıyor ("${aciklama}")`
      else if (!aciklama.includes(talepNo)) hata = `havale açıklaması talep numarasını (${talepNo}) taşımıyor ("${aciklama}")`
      else {
        await s.js(`window.__kopya = null; document.querySelector('[data-kopyala="aciklama"]')?.click(); 1`)
        await bekle(300)
        const kopya = await s.js('window.__kopya')
        if (kopya !== aciklama) hata = `açıklama düğmesi panoya açıklamayı yazmadı (${JSON.stringify(kopya)})`
      }
    }
    kaydet('C-38', 'Yedek parça ödemesi: banka hesabı kartı IBAN, kopyalama ve havale açıklaması doğru, tutar yalnız özette', hata, await metin())
  }

  /* X-09 · Servisim'in gizlilik kapısı (29 Eylül 2026, kullanıcının
     kararı: "İlk girişte onay ekranı"). Kabul kaydı olmayan servis
     işleri değil kapıyı görüyor; "Okudum, Kabul Ediyorum"dan sonra
     İşlerim açılıyor ve depoya servisin kimliği ve metin sürümüyle bir
     kabul satırı yazılıyor. Ekilen değer: servisin kimliği. */
  if (secili('X-09')) {
    const y = { ...YEREL }
    delete y['paksan.servisKabulleri']
    await s.git(ADRES + '/servis.html')
    await depoYaz(y, OTURUM)
    await s.git(ADRES + '/servis.html')
    const kapi = await sayiBekle('[data-gizlilik-kapisi]', (v) => v > 0)
    let hata = null
    if (kapi < 1) hata = 'kabul kaydı olmayan servis kapıyı görmedi'
    else if ((await say('.is-sekme')) > 0) hata = 'kapı açıkken İşlerim de çizildi'
    if (!hata) {
      await s.js(`document.querySelector('[data-eylem="gizlilik-kabul"]')?.click(); 1`)
      const sekme = await sayiBekle('.is-sekme', (v) => v > 0)
      const kayit = await s.js(`JSON.parse(localStorage.getItem('paksan.servisKabulleri') || '[]')`)
      if (sekme < 1) hata = 'kabulden sonra İşlerim açılmadı'
      else if (!kayit.some((k) => k.servisId === SERVIS.id && k.surum)) hata = 'kabul depoya servisin kimliğiyle yazılmadı'
    }
    kaydet('X-09', 'Servisim: gizlilik metinleri kabul edilmeden işler açılmıyor', hata, await metin())
  }

  /* X-10 · Servisim'in Gizlilik ve İzinler sayfası (30 Eylül 2026,
     kullanıcının isteği: Connect'teki sayfanın Servisim karşılığı).
     Hesap → "Gizlilik ve İzinler": kabul edilen iki metin kabulün sürümüyle,
     bildirim izninin durumu ve izin satırları; metne dokununca metin
     açılıyor. Ekilen değer: tohumun yazdığı kabulün sürümü. */
  if (secili('X-10')) {
    await s.git(ADRES + '/servis.html')
    await depoYaz(YEREL, OTURUM)
    await s.git(ADRES + '/servis.html')
    const kabul = JSON.parse(YEREL['paksan.servisKabulleri'] || '[]').find((k) => k.servisId === SERVIS.id)
    let hata = kabul ? null : 'tohumda servisin kabulü yok — ERİŞİLEMEDİ'
    if (!hata) {
      await sayiBekle('.uyg__hesap', (v) => v > 0)
      await s.js(`document.querySelector('.uyg__hesap')?.click(); 1`)
      const satir = await sayiBekle('[data-eylem="gizlilik-izinler"]', (v) => v > 0)
      if (satir < 1) hata = "Hesap'ta Gizlilik ve İzinler satırı yok"
    }
    if (!hata) {
      /* Ekran değişince 350 ms dokunuş yutuluyor (ServisPanel.jsx →
         GECIS_KILIDI_MS); X-07 onu sınıyor, burada beklenir. */
      await bekle(500)
      await s.js(`document.querySelector('[data-eylem="gizlilik-izinler"]').click(); 1`)
      const sayfa = await sayiBekle('[data-gizlilik-sayfasi]', (v) => v > 0)
      const kabulYazisi = await s.js(`[...document.querySelectorAll('[data-kabul-satiri]')].map((x) => x.innerText).join(' | ')`)
      if (sayfa < 1) hata = 'Gizlilik ve İzinler sayfası açılmadı'
      else if ((await say('[data-kabul-satiri]')) < 2 || !kabulYazisi.includes(kabul.surum))
        hata = `iki metnin satırı kabulün sürümünü göstermiyor ("${kabulYazisi}")`
      else if ((await say('[data-izin="bildirim"]')) < 1) hata = 'bildirim izninin satırı yok'
    }
    if (!hata) hata = await izinSatirlariniSina()
    if (!hata) {
      await bekle(500)
      await s.js(`document.querySelector('[data-metin="servisGizlilik"]').click(); 1`)
      const yasal = await sayiBekle('[data-yasal="servisGizlilik"]', (v) => v > 0)
      if (yasal < 1) hata = 'metne dokununca Müşteri Bilgilerinin Gizliliği açılmadı'
    }
    kaydet('X-10', 'Servisim: Gizlilik ve İzinler sayfası kabulü ve izinleri gösteriyor', hata, await metin())
  }

  /* X-11 · Servisim Hesap'ı: "Hesabım" (30 Eylül 2026, kullanıcının
     isteği: "Görünüm, Gizlilik, Oturum başlıklarını sil, bunların
     altındaki butonları 'Hesabım' başlığı altında topla"). Görünüm
     seçicisi, Gizlilik ve İzinler satırı ve Çıkış Yap tek bölümde; o
     bölüm ekranın son bölümü ve içinde başka başlık yok — üçünün de en
     yakın bölümü Hesabım, kendi bölümleri kalmadı. Çıkış Yap bölümün
     içinde de en sonda: iki satırın ardında ve son düğme. Bölüm ve satırlar
     `data-*` işaretleriyle aranıyor, başlığın kelimesiyle değil.
     Davranış da: bölümdeki seçicide öteki temaya basınca belgenin teması
     değişiyor; Çıkış Yap önce onay penceresini açıyor, oturumu hemen
     kapatmıyor. Ekilen değer: tohumun servis oturumu.
     Aynı gün ikinci istek ("Güvenlik satırını kaldır ve Şifremi Değiştir
     butonunu da Hesabım satırı altında konumlandır. Çıkış Yap butonu
     Connect'teki gibi kırmızı olsun"): Şifremi Değiştir de Hesabım'ın
     içinde ve Çıkış Yap'tan önce; satıra dokununca şifre formu açılıyor,
     Vazgeç kapatıyor; Çıkış Yap'ın yazı rengi Servisim'in olağan düğme
     yazısından farklı (hangi kırmızı olduğuna bakılmıyor). */
  if (secili('X-11')) {
    await s.git(ADRES + '/servis.html')
    await depoYaz(YEREL, OTURUM)
    await s.git(ADRES + '/servis.html')
    let hata = null
    await sayiBekle('.uyg__hesap', (v) => v > 0)
    /* Üst çubuğun iki dairesi 50 piksel (30 Eylül 2026, kullanıcının
       isteği: "Bildirim ve Hesap buton büyüklüklerini biraz daha arttır"). */
    const daire = await s.js(`['.uyg__bildirim-ic', '.uyg__hesap'].map((x) => { const e = document.querySelector(x); return e ? Math.round(e.getBoundingClientRect().width) : 0 })`)
    if (daire.some((b) => b < 50)) hata = `İşlerim'in üst çubuğundaki daireler küçük (bildirim ${daire[0]}, hesap ${daire[1]} piksel)`
    await s.js(`document.querySelector('.uyg__hesap')?.click(); 1`)
    const bolum = await sayiBekle('[data-bolum="hesabim"]', (v) => v > 0)
    if (!hata && bolum !== 1) hata = `Hesap'ta tek bir Hesabım bölümü yok (${bolum})`
    if (!hata) {
      const d = await s.js(`(() => {
        const b = document.querySelector('[data-bolum="hesabim"]');
        const ogeler = {
          gorunum: '[data-hesabim-satir="gorunum"] .tema-secici',
          gizlilik: '[data-eylem="gizlilik-izinler"]',
          sifre: '[data-hesabim-satir="sifre"]',
          cikis: '[data-eylem="cikis"]',
        };
        const yer = {};
        for (const [ad, sec] of Object.entries(ogeler)) {
          const l = [...document.querySelectorAll(sec)];
          yer[ad] = l.length === 1 && l[0].closest('.bolum') === b ? 'icinde' : 'sayi ' + l.length + (l[0] && l[0].closest('.bolum') !== b ? ', kendi bölümünde' : '');
        }
        const bolumler = [...document.querySelectorAll('.bolum')];
        /* Çıkış Yap bölümün içinde de en sonda: iki satırın ardından
           geliyor ve bölümün son düğmesi (gözden geçirmenin bulgusu:
           önce yalnız bölümün ekranın sonunda olduğuna bakılıyordu,
           Çıkış Yap kartın üstüne çıksa adım geçiyordu). */
        const cikis = b.querySelector('[data-eylem="cikis"]');
        const sonra = (sec) => {
          const o = b.querySelector(sec);
          return !!(o && cikis && (o.compareDocumentPosition(cikis) & Node.DOCUMENT_POSITION_FOLLOWING));
        };
        return {
          yer,
          secici: document.querySelectorAll('.tema-secici').length,
          baslik: b.querySelectorAll('.bolum__ad').length,
          son: bolumler[bolumler.length - 1] === b,
          cikisSonda: sonra('[data-hesabim-satir="gorunum"]') && sonra('[data-eylem="gizlilik-izinler"]')
            && sonra('[data-hesabim-satir="sifre"]')
            && [...b.querySelectorAll('button')].pop() === cikis,
          cikisRengi: cikis ? getComputedStyle(cikis).color : '',
          olaganRenk: (() => {
            const o = document.createElement('button');
            o.className = 'dg dg--blok';
            b.appendChild(o);
            const c = getComputedStyle(o).color;
            o.remove();
            return c;
          })(),
        };
      })()`)
      const disarida = Object.entries(d.yer).filter(([, v]) => v !== 'icinde')
      if (disarida.length) hata = 'Hesabım bölümünün dışında ya da kendi bölümünde: ' + disarida.map(([k, v]) => `${k} (${v})`).join(', ')
      else if (d.secici !== 1) hata = `ekranda ${d.secici} görünüm seçicisi var`
      else if (d.baslik !== 1) hata = `Hesabım bölümünün içinde ${d.baslik - 1} başlık daha var`
      else if (!d.son) hata = 'Hesabım ekranın son bölümü değil'
      else if (!d.cikisSonda) hata = "Çıkış Yap Hesabım'ın sonunda değil (satırların önünde ya da ardında başka düğme var)"
      else if (!d.cikisRengi || d.cikisRengi === d.olaganRenk) hata = `Çıkış Yap olağan düğme renginde (${d.cikisRengi})`
    }
    if (!hata) {
      await bekle(500)
      await s.js(`document.querySelector('[data-bolum="hesabim"] [data-hesabim-satir="sifre"]').click(); 1`)
      const alan = await sayiBekle('[data-bolum="hesabim"] input[type="password"]', (v) => v >= 3)
      if (alan < 3) hata = `Şifremi Değiştir'e dokununca Hesabım'da şifre formu açılmadı (${alan} alan)`
      else {
        await s.js(`document.querySelector('[data-bolum="hesabim"] [data-eylem="sifre-vazgec"]')?.click(); 1`)
        const kalan = await sayiBekle('[data-bolum="hesabim"] input[type="password"]', (v) => v === 0)
        if (kalan !== 0) hata = 'şifre formu Vazgeç ile kapanmadı'
      }
    }
    if (!hata) {
      /* Ekran değişince 350 ms dokunuş yutuluyor (GECIS_KILIDI_MS). */
      await bekle(500)
      const once = await s.js(`document.documentElement.getAttribute('data-tema')`)
      await s.js(`document.querySelector('[data-bolum="hesabim"] [data-hesabim-satir="gorunum"] [aria-pressed="false"]')?.click(); 1`)
      await bekle(300)
      const sonra = await s.js(`document.documentElement.getAttribute('data-tema')`)
      if (!once || once === sonra) hata = `Hesabım'daki görünüm seçicisi temayı değiştirmedi (${once} → ${sonra})`
    }
    if (!hata) {
      await s.js(`document.querySelector('[data-bolum="hesabim"] [data-eylem="cikis"]').click(); 1`)
      const onay = await sayiBekle('.onay', (v) => v > 0)
      const oturum = await s.js(`sessionStorage.getItem('paksan.servisOturum')`)
      if (onay < 1) hata = 'Çıkış Yap onay penceresini açmadı'
      else if (!oturum || (await say('[data-bolum="hesabim"]')) < 1) hata = 'Çıkış Yap onay beklemeden oturumu kapattı'
    }
    kaydet('X-11', "Servisim: Hesap'taki Görünüm, Gizlilik ve İzinler, Şifremi Değiştir ve kırmızı Çıkış Yap tek Hesabım bölümünde", hata, await metin())
  }

  /* X-13 · Servisim'de "PAKSAN'a Devret" (30 Eylül 2026, kullanıcının
     isteği: "'PAKSAN'dan Destek İste' seçeneği adı 'PAKSAN'a Devret'
     olmalı. Buna göre de butonun ikonunu düzenle"). Açık işin
     ayrıntısında devretme düğmesi (`data-eylem="devret"`) iletme okuyla
     çiziliyor (Icons.jsx → IconDevret, Lucide'ın Forward'ı); basınca KENDİ
     penceresi (`data-pencere="devret"`) başlığı ve onay düğmesiyle
     açılıyor. Gönderilmiyor: pencereyi açmak talebe bir şey yazmamalı;
     devrin kendisi veri katmanında (veri.js → destekTalepEt). Ekilen
     değer işin müşteri adı; düğme ve başlık yazısı aranmıyor. */
  if (secili('X-13')) {
    const CANLI_AD = 'Canlı Devretme Sınaması'
    const yeni = connectTalebi({ id: 'canli-13', no: 'SRV2609990013', status: 'yeni', ad: CANLI_AD })
    await s.git(ADRES + '/servis.html')
    await depoYaz(YEREL, OTURUM)
    await s.git(ADRES + '/servis.html')
    await bekle(1800)
    await s.js(`(() => { const k = 'paksan.requests'; const l = JSON.parse(localStorage.getItem(k) || '[]'); l.unshift(${JSON.stringify(yeni)}); localStorage.setItem(k, JSON.stringify(l)); return 1 })()`)
    await s.js(depoOlayi('paksan.requests'))
    await metinBekle(CANLI_AD)
    const acti = await s.js(`(() => { const h = [...document.querySelectorAll('button, [role="button"], a')].find((x) => (x.innerText || '').includes(${JSON.stringify(CANLI_AD)})); if (!h) return 0; h.click(); return 1 })()`)
    let hata = acti ? null : `"${CANLI_AD}" taşıyan kart açılamadı — ERİŞİLEMEDİ`
    if (!hata) {
      const dugme = await sayiBekle('[data-eylem="devret"]', (v) => v > 0)
      if (dugme < 1) hata = 'açık işte devretme düğmesi yok'
      else if ((await say('[data-eylem="devret"] svg.lucide-forward')) < 1)
        hata = 'devretme düğmesinde iletme oku yok (Icons.jsx → IconDevret)'
      /* Simge tek başına anlam taşımaz (CLAUDE.md, Servis Panelinin
         Kullanıcısı): düğmenin yazısı boşsa düşer. Hangi kelime olduğuna
         bakılmıyor, yalnız yazının varlığına. */
      else if ((await s.js(`(document.querySelector('[data-eylem="devret"]')?.innerText || '').trim().length`)) < 1)
        hata = 'devretme düğmesinin yazısı yok (simge tek başına)'
    }
    if (!hata) {
      /* Ekran değişince 350 ms dokunuş yutuluyor (X-07); beklenir. */
      await bekle(500)
      await s.js(`document.querySelector('[data-eylem="devret"]').click(); 1`)
      const pencere = await sayiBekle('[data-pencere="devret"]', (v) => v > 0)
      const baslik = await s.js(`(document.querySelector('[data-pencere="devret"] [data-pencere-baslik]')?.innerText || '').trim().length`)
      if (pencere < 1) hata = 'devretme düğmesi kendi penceresini açmadı'
      else if (baslik < 1) hata = 'devretme penceresinin başlığı yok'
      else if ((await say('[data-pencere="devret"] [data-eylem="devret-onay"]')) < 1) hata = 'devretme penceresinde onay düğmesi yok'
    }
    if (!hata) {
      const t = await s.js(`JSON.parse(localStorage.getItem('paksan.requests') || '[]').find((x) => x.id === 'canli-13') || null`)
      if (!t) hata = 'sınama talebi depoda yok'
      else if (t.devir || t.sahip !== yeni.sahip) hata = 'pencereyi açmak talebi devretti (onaylanmadan yazıldı)'
    }
    kaydet('X-13', 'Servisim: işi devretme düğmesi yazılı ve iletme okuyla, kendi penceresini açıyor', hata, await metin())
  }

  /* C-39 · Connect'te alttan açılan pencere açıkken arkadaki sayfa
     kaymıyor, sayfa kökünde esneme kapalı (30 Eylül 2026, kullanıcının
     bildirdiği: "Bilgilerimi Düzenle'ye tıklandığında alttan gelen ekranda
     kaydırma denendiğinde arkadaki profil sayfası kayıyor"; "Esneme
     tamamen kapansın"). Telefon boyunda (360x640) Profil biraz aşağı
     kaydırılıyor, Bilgilerimi Düzenle açılıyor; pencerenin üstünde ve
     zeminde gerçek kaydırma hareketi (CDP synthesizeScrollGesture) iki
     yöne yapılıyor: sayfanın kaydırma yeri değişmemeli. Pencere kapanınca
     sayfa kilitli kalmamalı. Kökün `overscroll-behavior`ı `none`. */
  if (secili('C-39')) {
    await connectKur([])
    await s.olcu({ width: 360, height: 640, deviceScaleFactor: 1, mobile: true })
    await s.git(ADRES + '/#/profil')
    let hata = null
    if ((await sayiBekle('[data-eylem="bilgi-duzenle"]', (v) => v > 0)) < 1) hata = "Profil'de Bilgilerimi Düzenle düğmesi yok — ERİŞİLEMEDİ"
    if (!hata) {
      const kok = await s.js(`getComputedStyle(document.documentElement).overscrollBehaviorY`)
      if (kok !== 'none') hata = `sayfa kökünde esneme kapalı değil (overscroll-behavior "${kok}")`
    }
    let once = 0
    if (!hata) {
      await s.js(`window.scrollTo(0, 150); 1`)
      await bekle(300)
      once = await s.js('Math.round(scrollY)')
      if (once < 50) hata = `Profil kaymıyor (${once}); kilit sınanamıyor — ERİŞİLEMEDİ`
    }
    if (!hata) {
      await s.js(`document.querySelector('[data-eylem="bilgi-duzenle"]').click(); 1`)
      if ((await sayiBekle('.sheet', (v) => v > 0)) < 1) hata = 'Bilgilerimi Düzenle penceresi açılmadı'
    }
    if (!hata) {
      await bekle(500)
      const k = await s.js(`(() => { const r = document.querySelector('.sheet').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + 24), zy: Math.max(4, Math.round(r.top / 2)) } })()`)
      /* Her hareketten sonra ölçülüyor: aşağı ve yukarı eşit kaydırma
         toplamda sıfır ederdi (ilk bozma denemesi bunu gösterdi). */
      for (const y of [k.y, k.zy]) {
        for (const yon of [-300, 300]) {
          if (hata) break
          await s.cdp.gonder('Input.synthesizeScrollGesture', { x: k.x, y, yDistance: yon, speed: 3000, gestureSourceType: 'mouse' }, s.oturum)
          await bekle(150)
          const sonra = await s.js('Math.round(scrollY)')
          if (sonra !== once) hata = `pencere açıkken arkadaki Profil kaydı (${once} → ${sonra})`
        }
      }
    }
    if (!hata) {
      await s.js(`document.querySelector('.sheet-backdrop')?.click(); 1`)
      await sayiBekle('.sheet', (v) => v === 0)
      const ov = await s.js(`getComputedStyle(document.documentElement).overflowY`)
      const yer = await s.js('Math.round(scrollY)')
      if (ov === 'hidden') hata = 'pencere kapandıktan sonra sayfa kilitli kaldı'
      else if (yer !== once) hata = `pencere kapanınca sayfa yerinde değil (${once} → ${yer})`
    }
    await s.olcu({ width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false })
    kaydet('C-39', 'Connect: alttan açılan pencere açıkken arkadaki sayfa kaymıyor, kökte esneme kapalı', hata, await metin())
  }

  /* C-40 · Bölge dışı servis talebi (5 Ekim 2026, kullanıcının kararı).
     Servisi atanmış makinenin formunda yer önce hesabın yeri (Konya,
     servisin bölgesi): uyarı yok. Makinenin yeri Eskişehir / Alpu
     seçilince formun içinde uyarı çıkıyor (`data-uyari="bolge-disi"`,
     makinenin servisinin adı içinde: ekili değer) ve gönder düğmesinin
     yazısı değişiyor. Bölgedeki başka bir ilçeye (Konya / Çumra) dönünce
     uyarı kalkıyor, düğme ilk yazısına dönüyor. Gönderilmiyor; kayıt
     tarafı AK-38'de. Kelimelere bakılmıyor, yazının değişip değişmediğine
     bakılıyor.

     ADRES KUTUSU (aynı gün, kullanıcının onayı): kutu hesabın adresiyle
     dolu geliyor (ekili değer); il değişince önerilen adres boşalıyor,
     çiftçinin kendi yazdığı adres sonraki il/ilçe değişikliğinde
     silinmiyor. */
  /* İSTEĞE BAĞLI EKRAN GÖRÜNTÜSÜ (5 Ekim 2026). PAKSAN_TUR_CEKIM bir
     klasör adıysa C-40 ve B-BOLGE uyarı ve atama anlarını oraya PNG olarak
     yazıyor (Connect telefon boyunda). Kullanıcıya göstermek için;
     değişken yoksa hiçbir şey değişmiyor. */
  const CEKIM = process.env.PAKSAN_TUR_CEKIM || ''
  const cek = async (ad, secici) => {
    if (!CEKIM) return
    if (secici) await s.kaydirSecici(secici)
    await bekle(400)
    await s.cek(join(CEKIM, ad + '.png'))
  }
  if (secili('C-40')) {
    const sec = (secici, deger) => s.js(`(() => {
      const el = document.querySelector(${JSON.stringify(secici)})
      if (!el) return 0
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, ${JSON.stringify(deger)})
      el.dispatchEvent(new Event('change', { bubbles: true }))
      return 1
    })()`)
    const IL = '[data-alan="servisAdres"] [data-alan="il"] select'
    const ILCE = '[data-alan="servisAdres"] [data-alan="ilce"] select'
    const dugme = () => s.js(`document.querySelector('[data-eylem="talep-gonder"]')?.textContent.trim() || ''`)
    const ADRES_KUTU = '[data-alan-kutu="servisAdres"]'
    const adres = () => s.js(`document.querySelector(${JSON.stringify(ADRES_KUTU)})?.value ?? null`)
    const ELLE_ADRES = 'Tur adresi, köy yolu 2. km'
    await connectKur([])
    if (CEKIM) await s.olcu({ width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
    await s.git(ADRES + '/#/talep?tur=servis&makine=' + makineler[0].id)
    let hata = null
    if ((await sayiBekle(IL, (v) => v > 0)) < 1) hata = 'servis formunda makinenin yeri alanı yok — ERİŞİLEMEDİ'
    let ilk = ''
    if (!hata) {
      /* Form hesabın yeriyle açılıyor (Konya / Selçuklu); burada seçim
         yaptırılmıyor: aynı ili yeniden seçmek gerçek telefonda olay
         doğurmaz, burada ilçeyi sıfırlayıp önerilen adresi boşaltırdı. */
      await bekle(400)
      const yer = await s.js(`[document.querySelector(${JSON.stringify(IL)})?.value, document.querySelector(${JSON.stringify(ILCE)})?.value].join('/')`)
      if (yer !== `${MUSTERI.il}/${MUSTERI.ilce}`) hata = `form hesabın yeriyle açılmadı (${yer}) — ERİŞİLEMEDİ`
      ilk = await dugme()
      if (hata) { /* yukarıda */ } else if (!ilk) hata = 'gönder düğmesi yok — ERİŞİLEMEDİ'
      else if ((await say('[data-uyari="bolge-disi"]')) > 0) hata = 'servisin bölgesindeki yerde bölge dışı uyarısı çıktı'
      else if ((await adres()) !== MUSTERI.adres) hata = `adres kutusu hesabın adresiyle dolu gelmedi ("${await adres()}") — ERİŞİLEMEDİ`
    }
    if (!hata) {
      await sec(IL, 'Eskişehir')
      await bekle(300)
      await sec(ILCE, 'Alpu')
      if ((await sayiBekle('[data-uyari="bolge-disi"]', (v) => v > 0)) < 1) hata = 'servisin bölgesi dışındaki yerde uyarı çıkmadı'
      else if (!(await s.js(`document.querySelector('[data-uyari="bolge-disi"]').textContent.includes(${JSON.stringify(SERVIS.ad)})`)))
        hata = 'uyarı makinenin servisinin adını taşımıyor'
      else if ((await dugme()) === ilk) hata = 'bölge dışında gönder düğmesinin yazısı değişmedi'
      else if ((await adres()) !== '') hata = `il değişince önerilen adres boşalmadı ("${await adres()}")`
      await cek('c40-uyari', '[data-alan="servisAdres"]')
      await cek('c40-dugme', '[data-eylem="talep-gonder"]')
    }
    if (!hata) {
      /* Çiftçi adresi kendisi yazıyor; sonraki yer değişikliği onu silmemeli. */
      await s.js(`(() => {
        const el = document.querySelector(${JSON.stringify(ADRES_KUTU)})
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, ${JSON.stringify(ELLE_ADRES)})
        el.dispatchEvent(new Event('input', { bubbles: true }))
        return 1
      })()`)
      await bekle(200)
      await sec(IL, 'Konya')
      await bekle(300)
      await sec(ILCE, 'Çumra')
      await sayiBekle('[data-uyari="bolge-disi"]', (v) => v === 0)
      if ((await say('[data-uyari="bolge-disi"]')) > 0) hata = 'bölgedeki başka ilçeye dönünce uyarı kalkmadı'
      else if ((await dugme()) !== ilk) hata = 'bölgeye dönünce düğme ilk yazısına dönmedi'
      else if ((await adres()) !== ELLE_ADRES) hata = `çiftçinin yazdığı adres il değişince silindi ("${await adres()}")`
    }
    if (CEKIM) await s.olcu({ width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false })
    kaydet('C-40', 'Connect: makine servisinin bölgesi dışındaysa formda uyarı ve PAKSAN düğmesi', hata, await metin())
  }

  /* B-BOLGE · Backoffice'te bölge dışı talebe bu iş için servis atama
     (5 Ekim 2026). Depoya PAKSAN'da bekleyen bir bölge dışı talep
     ekleniyor (servisi yok, `bolgeDisi` Eskişehir / Alpu, makinenin
     servisi Selçuk). Ayrıntıda atama bölümü (`data-bolum="bolge-disi"`)
     ve servis seçimi var; Eskişehir servisi ilk öbekte (o bölgeye bakan)
     öneriliyor. Seçilip "Bu İşe Ata" basılınca (onay penceresi kabul)
     depodaki talep o servise geçiyor, atamanın izi yazılıyor, bölüm
     kalkıyor ve Servis bölümünde iz satırı (`data-iz="bolge-disi"`)
     görünüyor; makinenin kayıt defterindeki servisi değişmiyor. */
  if (secili('B-BOLGE')) {
    const BD = connectTalebi({
      id: 'canli-bd',
      no: 'SRV2609990021',
      status: 'yeni',
      servis: null,
      sahip: 'paksan',
      masa: null,
      makine: makineOf(makineler[0]),
      il: 'Eskişehir',
      ilce: 'Alpu',
      bolgeDisi: { il: 'Eskişehir', ilce: 'Alpu', makineServisi: { id: SERVIS.id, ad: SERVIS.ad }, tarih: Date.now() },
    })
    await s.git(ADRES + '/backoffice.html')
    await depoYaz({ ...YEREL, 'paksan.requests': JSON.stringify([BD, ...JSON.parse(YEREL['paksan.requests'] || '[]')]) }, OTURUM)
    await s.git(ADRES + '/backoffice.html')
    let hata = null
    await bekle(1200)
    await s.js(`document.querySelector('.yan__bag[data-menu="talepler"]')?.click(); 1`)
    await sayiBekle('tr.tiklanir', (v) => v > 0)
    /* Varsayılan süzgeç "Açık olanlar"; talep yeni olduğu için listede. */
    const acildi = await s.js(`(() => { const tr = [...document.querySelectorAll('tr.tiklanir')].find((x) => x.textContent.includes(${JSON.stringify(BD.no)})); if (!tr) return 0; tr.click(); return 1 })()`)
    if (!acildi) hata = 'bölge dışı talep listede yok — ERİŞİLEMEDİ'
    if (!hata && (await sayiBekle('[data-bolum="bolge-disi"]', (v) => v > 0)) < 1) hata = 'bölge dışı talepte atama bölümü yok'
    if (!hata) {
      const ilkObek = await s.js(`JSON.stringify([...(document.querySelector('[data-alan="bolge-disi-servis"] optgroup')?.querySelectorAll('option') || [])].map((o) => o.value))`)
      if (!JSON.parse(ilkObek).includes('eskisehir-servis')) hata = `o bölgeye bakan servis ilk öbekte önerilmiyor (${ilkObek})`
      await cek('bbolge-once', '[data-bolum="bolge-disi"]')
    }
    if (!hata) {
      /* ONAY BACKOFFICE'İN PENCERESİNDEN (7 Ekim 2026, kullanıcının
         bildirdiği: tarayıcının uyarı kutusu geliyordu). Tarayıcı kutusu
         açılırsa işaret düşüyor ve adım kırmızı; pencere çıkmalı ve
         onun düğmesiyle atanmalı (ekranlar/ortak.jsx → useOnay). */
      await s.js(`(() => {
        window.__tarayiciUyarisi = 0
        window.confirm = () => { window.__tarayiciUyarisi = 1; return true }
        const el = document.querySelector('[data-alan="bolge-disi-servis"]')
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, 'eskisehir-servis')
        el.dispatchEvent(new Event('change', { bubbles: true }))
        return 1
      })()`)
      await bekle(300)
      await s.js(`document.querySelector('[data-eylem="bolge-disi-ata"]')?.click(); 1`)
      const pencere = await sayiBekle('[data-pencere="onay"] [data-eylem="onay-evet"]', (v) => v > 0, 8)
      if (await s.js('window.__tarayiciUyarisi')) hata = 'atama onayı tarayıcının uyarı kutusuyla soruldu'
      else if (pencere < 1) hata = 'atama onayı için backoffice penceresi açılmadı'
      else {
        await cek('bbolge-onay', '[data-pencere="onay"] .pencere__kart')
        await s.js(`document.querySelector('[data-pencere="onay"] [data-eylem="onay-evet"]').click(); 1`)
        await sayiBekle('[data-bolum="bolge-disi"]', (v) => v === 0)
      }
    }
    if (!hata) {
      const kayit = await s.js(`JSON.stringify((JSON.parse(localStorage.getItem('paksan.requests') || '[]').find((x) => x.id === 'canli-bd')) || null)`).then(JSON.parse)
      const defter = await s.js(`JSON.stringify((JSON.parse(localStorage.getItem('paksan.makineKayitlari') || '[]').find((k) => k.seri && k.seri.replace(/-/g, '') === ${JSON.stringify(String(makineler[0].serial).replace(/-/g, ''))})) || null)`).then(JSON.parse)
      if (kayit?.servis?.id !== 'eskisehir-servis') hata = `talep seçilen servise geçmedi (${kayit?.servis?.id || 'servis yok'})`
      else if (kayit?.bolgeDisi?.atama?.servisId !== 'eskisehir-servis') hata = 'atamanın izi talebe yazılmadı'
      else if ((await say('[data-bolum="bolge-disi"]')) > 0) hata = 'atamadan sonra atama bölümü duruyor'
      else if ((await sayiBekle('[data-iz="bolge-disi"]', (v) => v > 0)) < 1) hata = 'Servis bölümünde bölge dışı atamanın izi yok'
      else if (defter && defter.servisId !== SERVIS.id) hata = `atama makinenin kalıcı servisini değiştirdi (${defter.servisId})`
      await cek('bbolge-sonra', '[data-iz="bolge-disi"]')
    }
    kaydet('B-BOLGE', 'Backoffice: bölge dışı talebe bu iş için servis atama', hata, await metin())
  }

  /* B-RAPOR · Raporlar'ın sekme satırında kaydırma çubuğu yok (6 Ekim
     2026, kullanıcının bildirdiği: "sekme satırında sağda kaydırma çubuğu
     çıkıyor. Burada kaydırılacak bir şey yok"). Seçili sekmenin çizgisi
     kutunun altına taşıyor, yatay kaydırma için açık taşma dikeyde de
     çubuk açıyordu. Masaüstü genişliğinde (1400) satır ne dikeyde ne
     yatayda taşmamalı; seçili sekmenin çizgisi kutunun içinde görünmeli.
     Aynı gün: Genel Bakış'ın "Dikkat İsteyenler" satırlarında başlığın
     altında açıklama yok (kullanıcının isteği); satır yalnız başlık,
     nokta ve Göster düğmesi.
     Aynı gün: zaman grafiklerinde HER SÜTUNUN etiketi var ve etiketler
     birbirine binmiyor (kullanıcının onayı). "Tüm zamanlar" seçiliyor
     (sınama verisi 31 günden uzun: haftalık sütunlar, etiket aralık);
     her eksende boş etiket sayılıyor, komşu etiketlerin kutuları
     ölçülüyor. */
  if (secili('B-RAPOR')) {
    await s.git(ADRES + '/backoffice.html')
    await depoYaz(YEREL, OTURUM)
    await s.git(ADRES + '/backoffice.html#/raporlar')
    let hata = null
    if ((await sayiBekle('.rapor-sekmeler', (v) => v > 0, 20)) < 1) hata = 'Raporlar ekranında sekme satırı yok — ERİŞİLEMEDİ'
    if (!hata) {
      await bekle(600)
      const o = await s.js(`(() => {
        const n = document.querySelector('.rapor-sekmeler')
        const on = n.querySelector('.rapor-sekme--on')
        const c = on && getComputedStyle(on, '::after')
        const kutu = n.getBoundingClientRect(), sek = on && on.getBoundingClientRect()
        return JSON.stringify({ dikey: n.scrollHeight - n.clientHeight, yatay: n.scrollWidth - n.clientWidth,
          cizgiAlti: sek ? Math.round(sek.bottom - kutu.bottom) - parseFloat(c.bottom || '0') : null })
      })()`).then(JSON.parse)
      if (o.dikey > 0) hata = `sekme satırı dikeyde ${o.dikey} piksel taşıyor (kaydırma çubuğu çıkar)`
      else if (o.yatay > 0) hata = `sekme satırı 1400 piksel genişlikte yatayda ${o.yatay} piksel taşıyor`
      const satir = await sayiBekle('.uyari-satir', (v) => v > 0)
      const aciklamali = await s.js(`[...document.querySelectorAll('.uyari-satir')].filter((x) => x.querySelector('.uyari-satir__ad')?.parentElement.children.length > 1).length`)
      if (!hata && satir < 1) hata = 'Dikkat İsteyenler satırı yok — ERİŞİLEMEDİ'
      else if (!hata && aciklamali > 0) hata = `${aciklamali} Dikkat İsteyenler satırında başlığın altında açıklama var`
      await cek('brapor', '.rapor-sekmeler')
    }
    if (!hata) {
      await s.js(`(() => {
        const el = [...document.querySelectorAll('select')].find((x) => [...x.options].some((o) => o.value === 'gun30'))
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, 'hepsi')
        el.dispatchEvent(new Event('change', { bubbles: true }))
        return 1
      })()`)
      await bekle(900)
      const e = await s.js(`JSON.stringify([...document.querySelectorAll('.ysutun__eksen')].map((ek) => {
        const et = [...ek.querySelectorAll('.ysutun__etiket')]
        const kutu = et.map((x) => { const r = x.getBoundingClientRect(); return [r.left, r.right] })
        let binen = 0
        for (let i = 1; i < kutu.length; i++) if (kutu[i][0] < kutu[i - 1][1] - 1) binen++
        return { n: et.length, bos: et.filter((x) => !x.textContent.trim()).length, binen, ilk: et[0]?.textContent || '' }
      }))`).then(JSON.parse)
      if (!e.length) hata = 'Genel Bakış\'ta zaman grafiği yok — ERİŞİLEMEDİ'
      else if (e.some((x) => x.bos > 0)) hata = `etiketsiz sütun var (${e.map((x) => x.bos + '/' + x.n).join(', ')})`
      else if (e.some((x) => x.binen > 0)) hata = `etiketler birbirine biniyor (${e.map((x) => x.binen).join(', ')})`
      else if (!e.some((x) => /–/.test(x.ilk))) hata = `haftalık sütunun etiketi aralık değil ("${e[0].ilk}")`
      await cek('brapor-eksen', '.ysutun')
    }
    /* Her sekme açılıyor ve hesaplanabiliyor (6 Ekim 2026: sekmeler ve
       ölçüler kaldırılırken bir bölümün hesabı kırılırsa ekranda
       "bölüm hesaplanamadı" kutusu çıkar). */
    if (!hata) {
      const sekmeSayisi = await say('.rapor-sekme')
      for (let i = 0; i < sekmeSayisi && !hata; i++) {
        await s.js(`document.querySelectorAll('.rapor-sekme')[${i}].click(); 1`)
        await bekle(700)
        const ad = await s.js(`document.querySelectorAll('.rapor-sekme')[${i}].textContent.trim()`)
        if ((await say('.rapor-bolum-bas ~ .hata, .hata')) > 0) hata = `"${ad}" sekmesi hesaplanamadı`
        /* Bilgi kutularında alt açıklama yok (6 Ekim 2026, kullanıcının isteği). */
        else if ((await say('.olculer--rapor .deger__aciklama')) > 0) hata = `"${ad}" sekmesinin bilgi kutularında alt açıklama var`
        await cek('brapor-sekme-' + i, '.rapor-bolum-bas')
      }
    }
    kaydet('B-RAPOR', 'Backoffice: Raporlar sekme satırında kaydırma çubuğu yok', hata, await metin())
  }

  /* B-TARIH · Raporlar'da tarihi elle yazarken ekran donmuyor (6 Ekim
     2026, kullanıcının bildirdiği: "başlangıç tarihini gün-ay-yıl
     sırasıyla girmek istediğimde sistem çöküyor"). Tarih kutusu yıl
     yazılırken her tuşta ara bir tarih veriyor (0002, 0020, 0202, 2026).
     "Tarih seç" açılıp Başlangıç'a bu dört değer sırayla veriliyor;
     hiçbirinde grafik 400'den çok sütun çizmemeli. */
  if (secili('B-TARIH')) {
    await s.git(ADRES + '/backoffice.html')
    await depoYaz(YEREL, OTURUM)
    await s.git(ADRES + '/backoffice.html#/raporlar')
    let hata = null
    if ((await sayiBekle('.rapor-sekmeler', (v) => v > 0, 20)) < 1) hata = 'Raporlar açılmadı — ERİŞİLEMEDİ'
    const sec = (secici, deger, olay) => s.js(`(() => {
      const el = ${secici}
      if (!el) return 0
      const P = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(P, 'value').set.call(el, ${JSON.stringify(deger)})
      el.dispatchEvent(new Event(${JSON.stringify(olay)}, { bubbles: true }))
      return 1
    })()`)
    if (!hata) {
      await sec(`[...document.querySelectorAll('select')].find((x) => [...x.options].some((o) => o.value === 'ozel'))`, 'ozel', 'change')
      if ((await sayiBekle('input[type="date"]', (v) => v > 0)) < 1) hata = '"Tarih seç" başlangıç kutusunu açmadı'
    }
    /* Süre değil SÜTUN SAYISI ölçülüyor: tarayıcıda süre ölçümü
       çizimden önce dönüyordu (ilk denemede 1 ms ölçüldü, sayfada 24.298
       sütun vardı). Grafik sütunları 400'ü geçmemeli (10 yıl, aylık 120). */
    /* Yarım yıl başlangıç yokmuş gibi okunmalı: grafik, başlangıç boşken
       çizilenle AYNI sayıda sütun çizmeli (ikinci kat — on yıl sınırı —
       tek başına 120 aylık sütuna indirirdi; bu ölçü ilk katı ayrıca
       yakalıyor). Tam yıl (2026) için yalnız 400 sınırı. */
    const sutunSay = () => s.js(`Math.max(0, ...[...document.querySelectorAll('.ysutun__eksen')].map((e) => e.children.length))`)
    await bekle(600)
    const bos = await sutunSay()
    const sayimlar = [`boş: ${bos} sütun`]
    for (const deger of ['0002-01-01', '0020-01-01', '0202-01-01', '2026-01-01']) {
      if (hata) break
      await sec(`document.querySelector('input[type="date"]')`, deger, 'input')
      await bekle(600)
      const sutun = await sutunSay()
      sayimlar.push(`${deger.slice(0, 4)}: ${sutun} sütun`)
      if (sutun > 400) hata = `başlangıç yılı ${deger.slice(0, 4)} yazılırken grafik ${sutun} sütun çizdi (sayfa donar)`
      else if (deger < '2000' && sutun !== bos) hata = `yarım yazılan yıl ${deger.slice(0, 4)} tarih sayıldı (${sutun} sütun, boşken ${bos})`
    }
    kaydet('B-TARIH', 'Backoffice: Raporlar tarihi elle yazılırken donmuyor', hata, sayimlar.join(' · '))
  }

  /* X-14 · Servisim'de aynısı (30 Eylül 2026). Telefon boyunda Hesap
     ekranı aşağı kaydırılıyor, Çıkış Yap'ın onay yaprağı açılıyor (onay
     verilmiyor); yaprağın üstünde ve perdede iki yöne kaydırma: hiçbir
     kaydırıcının yeri değişmemeli (kök ve `.uyg__ic`). Yaprak Vazgeç ile
     kapanınca kilit kalkmalı. Kökte esneme kapalı. */
  if (secili('X-14')) {
    await s.olcu({ width: 360, height: 640, deviceScaleFactor: 1, mobile: true })
    await s.git(ADRES + '/servis.html')
    await depoYaz(YEREL, OTURUM)
    await s.git(ADRES + '/servis.html')
    let hata = null
    if ((await sayiBekle('.uyg__hesap', (v) => v > 0)) < 1) hata = 'Servisim açılmadı — ERİŞİLEMEDİ'
    if (!hata) {
      /* Ana sekmeler sayfanın kökünü kaydırıyor; dip çubuklu sayfalar
         (`.uyg--dipli`) kendi gövdesini — o kural servis.css'te aynı
         satırda, burada kök ölçülüyor. */
      const esneme = await s.js(`getComputedStyle(document.documentElement).overscrollBehaviorY`)
      if (esneme !== 'none') hata = `sayfa kökünde esneme kapalı değil (${esneme})`
    }
    const yerler = `[document.scrollingElement, ...document.querySelectorAll('.uyg__ic, .katman')].map((e) => Math.round(e.scrollTop)).join(',')`
    let once = ''
    if (!hata) {
      await s.js(`document.querySelector('.uyg__hesap').click(); 1`)
      await sayiBekle('[data-eylem="cikis"]', (v) => v > 0)
      await bekle(500)
      await s.js(`(() => { window.scrollTo(0, 250); document.querySelectorAll('.uyg__ic, .katman').forEach((e) => { e.scrollTop = 250 }); return 1 })()`)
      await bekle(300)
      once = await s.js(yerler)
      if (!once.split(',').some((v) => Number(v) > 50)) hata = `Hesap ekranı kaymıyor (${once}); kilit sınanamıyor — ERİŞİLEMEDİ`
    }
    if (!hata) {
      await s.js(`document.querySelector('[data-eylem="cikis"]').click(); 1`)
      if ((await sayiBekle('.onay-perde', (v) => v > 0)) < 1) hata = 'Çıkış Yap onay yaprağı açılmadı'
    }
    if (!hata) {
      await bekle(500)
      const k = await s.js(`(() => { const r = document.querySelector('.onay').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + 24), zy: Math.max(4, Math.round(r.top / 2)) } })()`)
      for (const y of [k.y, k.zy]) {
        for (const yon of [-300, 300]) {
          if (hata) break
          await s.cdp.gonder('Input.synthesizeScrollGesture', { x: k.x, y, yDistance: yon, speed: 3000, gestureSourceType: 'mouse' }, s.oturum)
          await bekle(150)
          const sonra = await s.js(yerler)
          if (sonra !== once) hata = `yaprak açıkken arkadaki ekran kaydı (${once} → ${sonra})`
        }
      }
    }
    if (!hata) {
      await s.js(`document.querySelector('.onay__vazgec')?.click(); 1`)
      await sayiBekle('.onay-perde', (v) => v === 0)
      const kilitli = await s.js(`[document.documentElement, ...document.querySelectorAll('.uyg--dipli .uyg__ic')].some((e) => getComputedStyle(e).overflowY === 'hidden')`)
      if (kilitli) hata = 'yaprak kapandıktan sonra ekran kilitli kaldı'
    }
    await s.olcu({ width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false })
    kaydet('X-14', 'Servisim: alttan açılan yaprak açıkken arkadaki ekran kaymıyor, esneme kapalı', hata, await metin())
  }

  /* X-15 · Servisim Hak Ediş'i iki sekme, hareketler onar onar (30 Eylül
     2026, kullanıcının seçimi: "Sekmeler + Daha Fazla Göster"). Servise
     23 hareket daha ekleniyor (depoda, X-12'nin yaptığı gibi). Sekmeler
     `data-hakedis-sekme`; Onay Bekleyen sekmesinde hareket satırı yok;
     Hesap Hareketleri'nde ilk 10 satır, düğme (`data-eylem="daha-fazla"`)
     her basışta 10 daha açıyor, hepsi açılınca kalkıyor. Sekme adedi
     depodaki hareket sayısı. Bir işe gidip dönünce seçili sekme kalıyor
     (Onay Bekleyen'deki kart açılıp geri dönülüyor). */
  if (secili('X-15')) {
    await s.git(ADRES + '/servis.html')
    await depoYaz(YEREL, OTURUM)
    await s.js(`(() => {
      const k = 'paksan.cariHareket';
      const l = JSON.parse(localStorage.getItem(k) || '[]');
      for (let i = 0; i < 23; i++) l.push({ id: 'tur-x15-' + i, servisId: ${JSON.stringify(SERVIS.id)}, tarih: Date.now() - (i + 1) * 86400000 * 40, tur: 'alacak', tutar: 100 + i, aciklama: 'Tur X-15' });
      localStorage.setItem(k, JSON.stringify(l));
      return 1
    })()`)
    await s.git(ADRES + '/servis.html')
    let hata = null
    const toplam = await s.js(`JSON.parse(localStorage.getItem('paksan.cariHareket') || '[]').filter((h) => h.servisId === ${JSON.stringify(SERVIS.id)}).length`)
    await sayiBekle('.uyg__tab', (v) => v > 2)
    await s.js(`document.querySelectorAll('.uyg__tab')[2]?.click(); 1`)
    if ((await sayiBekle('[data-hakedis-sekme]', (v) => v > 0)) !== 2) hata = "Hak Ediş'te iki sekme yok"
    if (!hata) {
      await bekle(500)
      await s.js(`document.querySelector('[data-hakedis-sekme="bekleyen"]').click(); 1`)
      await sayiBekle('[data-hakedis-liste="bekleyen"]', (v) => v > 0)
      if ((await say('[data-hareket]')) > 0) hata = 'Onay Bekleyen sekmesinde hesap hareketi görünüyor'
    }
    if (!hata) {
      await s.js(`document.querySelector('[data-hakedis-sekme="hareket"]').click(); 1`)
      await sayiBekle('[data-hakedis-liste="hareket"]', (v) => v > 0)
      const sayi = await s.js(`document.querySelector('[data-hakedis-sekme="hareket"] .is-sekme__sayi')?.textContent.trim()`)
      if (String(toplam) !== sayi) hata = `sekmenin adedi (${sayi}) depodaki hareket sayısı (${toplam}) değil`
    }
    let acik = 10
    while (!hata) {
      const n = await say('[data-hareket]')
      const beklenen = Math.min(acik, toplam)
      if (n !== beklenen) { hata = `${beklenen} hareket görünmeliydi, ${n} görünüyor`; break }
      const dugme = await say('[data-eylem="daha-fazla"]')
      if (beklenen >= toplam) { if (dugme > 0) hata = 'bütün hareketler açıkken düğme duruyor'; break }
      if (dugme < 1) { hata = `${beklenen}/${toplam} hareket açıkken "Daha Göster" düğmesi yok`; break }
      await s.js(`document.querySelector('[data-eylem="daha-fazla"]').click(); 1`)
      acik += 10
      await sayiBekle('[data-hareket]', (v) => v === Math.min(acik, toplam))
    }
    if (!hata) {
      /* Sekme seçimi Hak Ediş ekrandan kalkıp gelince kalıyor. */
      await s.js(`document.querySelectorAll('.uyg__tab')[0]?.click(); 1`)
      await bekle(600)
      await s.js(`document.querySelectorAll('.uyg__tab')[2]?.click(); 1`)
      await sayiBekle('[data-hakedis-liste]', (v) => v > 0)
      const secik = await s.js(`document.querySelector('[data-hakedis-liste]')?.dataset.hakedisListe`)
      if (secik !== 'hareket') hata = `başka sekmeye gidip dönünce Hak Ediş'in seçili sekmesi kayboldu ("${secik}")`
    }
    kaydet('X-15', "Servisim: Hak Ediş iki sekmede, hesap hareketleri onar onar açılıyor", hata, await metin())
  }

  /* X-16 · Servis kaydında yapılan iş çok seçimli, parçasız "Parça
     Değişti" gitmiyor, "Parçayı Taktım"da seçili ve kilitli (6 Ekim 2026,
     kullanıcının bildirdiği ve istediği). İki iş depoya ekleniyor: yeni
     bir iş (servis kaydı) ve parçası yola çıkmış 1. aşama işi. Seçenekler
     sırayla sayılıyor (lib/servisKaydi.js → YAPILAN_IS; 3 = Parça
     Değişti), yazılara bakılmıyor. Gönderim engelinin nedeni, formun hata
     satırının alanın altındaki uyarıyla aynı metin olmasından okunuyor:
     başka bir eksik yüzünden gitmemesi sayılmıyor. */
  if (secili('X-16')) {
    const AD_YENI = 'Canlı Kayıt Sınaması'
    const AD_TAKTIM = 'Canlı Taktım Sınaması'
    const simdi = Date.now()
    const yeni = connectTalebi({ id: 'canli-16', no: 'SRV2609990016', status: 'yeni', ad: AD_YENI })
    const taktim = connectTalebi({
      id: 'canli-16b',
      no: 'SRV2609990017',
      status: 'parcaBekliyor',
      masa: 'servis',
      ad: AD_TAKTIM,
      parcaSevk: { firma: 'Aras', takipNo: 'TUR16', tarih: simdi - 3600000, personel: 'Tur' },
      servisKaydi: {
        asama: 'parca',
        kapi: 'garanti',
        parcalar: [{ ad: 'Tur Parçası', kod: 'TUR-16', adet: 1, fiyat: 100 }],
        teslimat: { alici: 'Tur', tel: '5051112233', il: 'Konya', ilce: 'Selçuklu', acikAdres: 'Tur adresi' },
        ariza: 'Tur arızası',
        sonuc: 'Tur tespiti',
        tarih: simdi - 7200000,
        servisAd: SERVIS.ad,
      },
    })
    await s.git(ADRES + '/servis.html')
    await depoYaz(YEREL, OTURUM)
    if (CEKIM) await s.olcu({ width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
    await s.git(ADRES + '/servis.html')
    await bekle(1800)
    await s.js(`(() => { const k = 'paksan.requests'; const l = JSON.parse(localStorage.getItem(k) || '[]'); l.unshift(${JSON.stringify(yeni)}, ${JSON.stringify(taktim)}); localStorage.setItem(k, JSON.stringify(l)); return 1 })()`)
    await s.js(depoOlayi('paksan.requests'))
    const kartiAc = async (ad) => {
      await metinBekle(ad)
      return s.js(`(() => { const h = [...document.querySelectorAll('button, [role="button"], a')].find((x) => (x.innerText || '').includes(${JSON.stringify(ad)})); if (!h) return 0; h.click(); return 1 })()`)
    }
    const SEC = '[data-alan="yapilanIs"] .buyuk-sec'
    /* Servisim'in kaydırıcısı sayfanın içinde; görüntüden önce bölüm ortaya. */
    const ortala = () => s.js(`document.querySelector('[data-alan="yapilanIs"]')?.scrollIntoView({ block: 'center' }); 1`)
    const secim = (i) => s.js(`document.querySelectorAll(${JSON.stringify(SEC)})[${i}]?.click(); 1`)
    const basili = () => s.js(`[...document.querySelectorAll(${JSON.stringify(SEC)})].map((b) => (b.getAttribute('aria-pressed') === 'true' ? 1 : 0)).join('')`)
    let hata = (await kartiAc(AD_YENI)) ? null : `"${AD_YENI}" taşıyan kart açılamadı — ERİŞİLEMEDİ`
    if (!hata) {
      if ((await sayiBekle('[data-eylem="servis-kaydi-ac"]', (v) => v > 0)) < 1) hata = 'yeni işte Servis Kaydını Aç düğmesi yok — ERİŞİLEMEDİ'
      else {
        await bekle(500)
        await s.js(`document.querySelector('[data-eylem="servis-kaydi-ac"]').click(); 1`)
        if ((await sayiBekle(SEC, (v) => v === 5)) !== 5) hata = 'servis kaydında beş yapılan iş seçeneği yok'
      }
    }
    if (!hata) {
      await bekle(400)
      await secim(1)
      await secim(2)
      await bekle(250)
      const b = await basili()
      if (b !== '01100') hata = `iki seçenek birlikte işaretlenemiyor (çok seçimli değil): ${b}`
    }
    if (!hata) {
      await secim(3)
      await bekle(250)
      if ((await say('.yapilan-is__uyari')) < 1) hata = 'parça seçilmeden "Parça Değişti" işaretlenince uyarı çıkmadı'
    }
    if (!hata) {
      await ortala()
      await cek('x16-parcasiz-uyari')
      await s.js(`document.querySelector('.kayit-dip .dg--ana')?.click(); 1`)
      await bekle(500)
      const pencere = await say('.onay-perde')
      const ayni = await s.js(`(() => { const u = document.querySelector('.yapilan-is__uyari')?.textContent.trim(); const h = document.querySelector('.uyari')?.textContent.trim(); return Boolean(u) && u === h })()`)
      if (pencere > 0) hata = 'parçasız "Parça Değişti" ile kayıt onay penceresine geçti'
      else if (!ayni) hata = 'gönderim bu kural yüzünden durmadı (hata satırı uyarının metni değil)'
    }
    if (!hata) {
      await secim(3)
      await bekle(250)
      if ((await say('.yapilan-is__uyari')) > 0) hata = '"Parça Değişti" kaldırılınca uyarı gitmedi'
    }
    if (!hata) {
      await s.git(ADRES + '/servis.html')
      await bekle(1500)
      /* Parçası yoldaki iş "Devam Eden" sekmesinde (Islerim.jsx → SEKMELER). */
      await sayiBekle('[data-is-sekme="devam"]', (v) => v > 0)
      await s.js(`document.querySelector('[data-is-sekme="devam"]')?.click(); 1`)
      await bekle(500)
      if (!(await kartiAc(AD_TAKTIM))) hata = `"${AD_TAKTIM}" taşıyan kart açılamadı — ERİŞİLEMEDİ`
      else if ((await sayiBekle('[data-eylem="parcayi-taktim"]:not([disabled])', (v) => v > 0)) < 1) {
        hata = 'parçası yoldaki işte Parçayı Taktım düğmesi açık değil — ERİŞİLEMEDİ'
      } else {
        await bekle(500)
        await s.js(`document.querySelector('[data-eylem="parcayi-taktim"]').click(); 1`)
        if ((await sayiBekle(SEC, (v) => v === 5)) !== 5) hata = 'Parçayı Taktım ekranında beş yapılan iş seçeneği yok'
      }
    }
    if (!hata) {
      await bekle(400)
      const ilk = await basili()
      const kilitli = await s.js(`document.querySelectorAll(${JSON.stringify(SEC)})[3]?.getAttribute('aria-disabled')`)
      await secim(3)
      await bekle(250)
      const sonra = await basili()
      if (ilk !== '00010') hata = `Parçayı Taktım'da "Parça Değişti" kendiliğinden seçili gelmedi: ${ilk}`
      else if (kilitli !== 'true') hata = '"Parça Değişti" kilitli işaretlenmemiş'
      else if (sonra !== '00010') hata = `kilitli "Parça Değişti" dokununca kalktı: ${sonra}`
      else {
        await ortala()
        await cek('x16-parcayi-taktim')
      }
    }
    if (CEKIM) await s.olcu({ width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false })
    kaydet('X-16', 'Servisim: servis kaydında yapılan iş çok seçimli; parçasız "Parça Değişti" uyarıyor ve gitmiyor; Parçayı Taktım\'da seçili ve kilitli', hata, await metin())
  }

  /* X-12 · Servisim sipariş özetinde adet ve Kaldır (30 Eylül 2026,
     kullanıcının isteği: "checkout ekranında seçilen parçaları sadece
     kaldırabiliyoruz, adetlerini değiştiremiyoruz. Bunu yapmak için geri
     gelmek gerekiyor"). Özetin satırı Connect'in "Talebiniz" satırı
     (components/ParcaOzeti.jsx); her satırda eksi-artı ve Kaldır. Metne
     bakılmıyor: satır `data-parca-satiri` + `data-adet`, toplam
     `data-siparis-toplam`, düğmeler `data-eylem`, ödeme seçenekleri
     `data-odeme` (adı "Bakiyem", `data-odeme-ad`; kullanılabilir bakiye
     `data-bakiye`), seçili seçenek `.buyuk-sec--on`. Seçim kartında yalnız
     parçanın kodu ve adet sayısı okunuyor. Sıra: iki parça seç → "Devam"a
     çift dokunuş (ikincisi yutulmalı) → özet; adedi 1 olan satırın eksisi
     kapalı → bakiye toplamın 1 TL üstüne kurulur, "Bakiyem" seçilir →
     birincinin adedini artır (toplam değişmeli, "Bakiyem" kapanmalı) →
     azalt ("Bakiyem" açılır ama seçim Faturayla'da kalmalı) → yeniden
     artır → özetten geri (seçim kartında aynı adet) → özet → ikinciyi
     kaldır (satır gitmeli, toplam inmeli) → sonuncuyu kaldır, ikinci
     dokunuş seçim kartına (seçim adımına dönülmeli, seçili kart
     kalmamalı). Adım değişince 350 ms dokunuş yutuluyor
     (SiparisVer.jsx → ADIM_KILIDI_MS); kilidi sınayan iki dokunuş dışında
     her geçişten sonra beklenir.

     İnceleme eki (aynı gün): eksinin 1'de durması, adım kilidi ve ödeme
     seçiminin kendiliğinden "Bakiyem"e dönmemesi önce sınanmıyordu. */
  if (secili('X-12')) {
    const satirlar = () => s.js(`JSON.stringify([...document.querySelectorAll('[data-parca-satiri]')].map((x) => [x.dataset.parcaSatiri, x.dataset.adet]))`).then(JSON.parse)
    const toplam = () => s.js(`Number(document.querySelector('[data-siparis-toplam]')?.dataset.siparisToplam)`)
    const odemeHali = () => s.js(`JSON.stringify({
      fatura: !!document.querySelector('[data-odeme="fatura"].buyuk-sec--on'),
      bakiye: !!document.querySelector('[data-odeme="bakiye"].buyuk-sec--on'),
      kapali: !!document.querySelector('[data-odeme="bakiye"]')?.disabled,
    })`).then(JSON.parse)
    const artir = (kod) => s.js(`document.querySelector('[data-parca-satiri="${kod}"] [data-eylem="adet-artir"]')?.click(); 1`)
    const azalt = (kod) => s.js(`document.querySelector('[data-parca-satiri="${kod}"] [data-eylem="adet-azalt"]')?.click(); 1`)
    const sayiDegisti = async (oku, eski, n = 12) => {
      let v = eski
      for (let i = 0; i < n && v === eski; i++) {
        await bekle(250)
        v = await oku()
      }
      return v
    }
    const haliBekle = async (kosul, n = 12) => {
      let h = await odemeHali()
      for (let i = 0; i < n && !kosul(h); i++) {
        await bekle(250)
        h = await odemeHali()
      }
      return h
    }
    await s.git(ADRES + '/servis.html')
    await depoYaz(YEREL, OTURUM)
    await s.git(ADRES + '/servis.html')
    await sayiBekle('.uyg__tab', (v) => v > 1)
    await s.js(`document.querySelectorAll('.uyg__tab')[1]?.click(); 1`)
    await bekle(600)
    await s.js(`document.querySelector('.uyg__fab')?.click(); 1`)
    /* Katalog ağdan geliyor (taklit gecikmeli); montaj listesi beklenir. */
    const montaj = await sayiBekle('.montaj', (v) => v > 0, 30)
    let hata = montaj < 1 ? 'sipariş ekranında montaj listesi yok — ERİŞİLEMEDİ' : null
    if (!hata) {
      await bekle(500)
      await s.js(`document.querySelector('.montaj').click(); 1`)
      if ((await sayiBekle('.parca-kart__ac', (v) => v > 1)) < 2) hata = 'montajda iki parça kartı yok — ERİŞİLEMEDİ'
    }
    let kodlar = []
    let t0 = NaN
    if (!hata) {
      await s.js(`document.querySelectorAll('.parca-kart__ac')[0].click(); 1`)
      await bekle(200)
      await s.js(`document.querySelectorAll('.parca-kart__ac')[1].click(); 1`)
      await bekle(300)
      /* "DEVAM"A ÇİFT DOKUNUŞ. İlk dokunuştan 100 ms sonra ikinci dokunuş
         aynı noktaya, bir de özetin ilk satırının artısına gidiyor; adım
         kilidi ikisini de yutmalı. Noktanın altında ne olduğuna
         bakılmıyor, sonucuna bakılıyor: adetler 1 kalmalı, pencere
         açılmamalı. */
      await s.js(`(async () => {
        const d = document.querySelector('.siparis-dip__devam')
        if (!d) return 0
        const r = d.getBoundingClientRect()
        d.click()
        await new Promise((ok) => setTimeout(ok, 100))
        document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.click()
        document.querySelector('[data-parca-satiri] [data-eylem="adet-artir"]')?.click()
        return 1
      })()`)
      await sayiBekle('[data-parca-satiri]', (v) => v === 2)
      await bekle(300)
      const ilk = await satirlar()
      kodlar = ilk.map(([k]) => k)
      t0 = await toplam()
      /* Kilit yokken ikinci dokunuş özetin altındaki "Geri"ye düşüyordu
         (bozularak görüldü): özet açılıp hemen seçime dönülüyor. Bu
         erişilemeyen ekran değil, düşüş. */
      if (kodlar.length !== 2 && (await say('.parca-kart--on')) === 2)
        hata = '"Devam"a çift dokunuşun ikincisi işledi: özet açıldı, seçim adımına geri dönüldü'
      else if (kodlar.length !== 2) hata = `özette iki parça satırı yok (${kodlar.length}) — ERİŞİLEMEDİ`
      else if (ilk.some(([, a]) => a !== '1') || (await say('.onay')) > 0)
        hata = `"Devam"a çift dokunuşun ikincisi özette işledi (adetler ${ilk.map(([, a]) => a).join(', ')}, açık pencere ${await say('.onay')})`
      else if (!(t0 > 0)) hata = 'özetin toplamı data-siparis-toplam ile okunamadı'
      else if ((await say('[data-odeme="fatura"]')) !== 1 || (await say('[data-odeme="bakiye"] [data-odeme-ad="bakiye"]')) !== 1)
        hata = 'ödeme seçenekleri (Faturayla, Bakiyem) data-odeme ile bulunamadı'
      else if ((await say('[data-parca-satiri] [data-eylem="adet-artir"]')) !== 2 || (await say('[data-parca-satiri] [data-eylem="parca-kaldir"]')) !== 2)
        hata = 'özetin satırlarında adet ya da Kaldır düğmesi yok'
    }
    if (!hata) {
      /* EKSİ 1'DE DURUYOR: çıkarmak "Kaldır"ın işi. Eksi kapalı ve
         basılınca satır yerinde; iki kat kapı (kapalılık ve üst işlevin
         sınırı), biri tek başına silinirse öteki tutuyor. */
      await bekle(500)
      const kapali = await s.js(`!!document.querySelector('[data-parca-satiri="${kodlar[1]}"] [data-eylem="adet-azalt"]')?.disabled`)
      await azalt(kodlar[1])
      await bekle(300)
      const ikinci = (await satirlar()).find(([k]) => k === kodlar[1])
      if (!ikinci) hata = "adedi 1 olan satırın eksisi satırı sildi (çıkarmak Kaldır'ın işi)"
      else if (ikinci[1] !== '1') hata = `adedi 1 olan satırın eksisi adedi değiştirdi (${ikinci[1]})`
      else if (!kapali) hata = 'adedi 1 olan satırın eksisi kapalı değil'
    }
    if (!hata) {
      /* BAKİYE ÖZETİN TOPLAMININ 1 TL ÜSTÜNE KURULUYOR: başka sekme cari
         hareket yazmış gibi (depo olayı; Servisim bakiyeyi yeniden
         okuyor). Artı bakiyeyi aşıyor, eksi yeniden sığdırıyor. Hareket
         X-02'den sonra ekleniyor; sonraki aşama depoyu yeniden kuruyor. */
      const b0 = await s.js(`Number(document.querySelector('[data-odeme="bakiye"]')?.dataset.bakiye)`)
      const servisId = await s.js(`JSON.parse(sessionStorage.getItem('paksan.servisOturum') || '{}').servisId || null`)
      const fark = Math.round((t0 + 1 - b0) * 100) / 100
      if (!Number.isFinite(b0) || !servisId) hata = 'kullanılabilir bakiye data-bakiye ile okunamadı — ERİŞİLEMEDİ'
      else {
        await s.js(`(() => { const k = 'paksan.cariHareket'; const l = JSON.parse(localStorage.getItem(k) || '[]');
          l.unshift({ id: 'canli-12', servisId: ${JSON.stringify(servisId)}, tarih: Date.now(), tur: ${JSON.stringify(fark >= 0 ? 'alacak' : 'odeme')}, tutar: ${Math.abs(fark)}, aciklama: 'Tur X-12' });
          localStorage.setItem(k, JSON.stringify(l)); return 1 })()`)
        await s.js(depoOlayi('paksan.cariHareket'))
        const h = await haliBekle((x) => !x.kapali)
        if (h.kapali) hata = `bakiye toplamın üstüne kurulunca "Bakiyem" açılmadı (toplam ${t0}) — ERİŞİLEMEDİ`
      }
      if (!hata) {
        await s.js(`document.querySelector('[data-odeme="bakiye"]').click(); 1`)
        const h = await haliBekle((x) => x.bakiye)
        if (!h.bakiye || h.fatura) hata = '"Bakiyem" seçilemedi'
      }
    }
    let t1 = NaN
    if (!hata) {
      await artir(kodlar[0])
      t1 = await sayiDegisti(toplam, t0)
      const adet = (await satirlar()).find(([k]) => k === kodlar[0])?.[1]
      const h = await haliBekle((x) => x.kapali)
      if (adet !== '2') hata = `artı düğmesi özetteki adedi artırmadı (adet ${adet})`
      else if (t1 === t0) hata = `adet 2 oldu, toplam değişmedi (${t0})`
      else if (!h.kapali || !h.fatura || h.bakiye) hata = `adet artınca bakiye yetmedi ama "Bakiyem" kapanıp Faturayla seçilmedi (${JSON.stringify(h)})`
    }
    if (!hata) {
      /* Eksiyle bakiye yeniden yetiyor: seçenek açılıyor, seçim
         Faturayla'da kalıyor (servis "Bakiyem"i yeniden seçmedi). */
      await azalt(kodlar[0])
      const h = await haliBekle((x) => !x.kapali)
      if (h.kapali) hata = `adet 1'e inince "Bakiyem" yeniden açılmadı (${JSON.stringify(h)})`
      else if (h.bakiye || !h.fatura) hata = `bakiye yeniden yetince seçim kendiliğinden "Bakiyem"e döndü (${JSON.stringify(h)})`
      else {
        await artir(kodlar[0])
        const adet = await sayiDegisti(async () => (await satirlar()).find(([k]) => k === kodlar[0])?.[1], '1')
        if (adet !== '2') hata = `ikinci artı adedi 2 yapmadı (${adet})`
      }
    }
    if (!hata) {
      /* Özetten geri: seçim kartı aynı adedi göstermeli (adet tek yerde). */
      await s.js(`document.querySelector('[data-eylem="ozet-geri"]').click(); 1`)
      await sayiBekle('.parca-kart--on', (v) => v === 2)
      const kartAdedi = await s.js(`(() => {
        const k = [...document.querySelectorAll('.parca-kart--on')].find((x) => x.querySelector('.parca-kart__kod')?.innerText.trim() === ${JSON.stringify(kodlar[0])})
        return k ? k.querySelector('.parca-kart__sayi')?.innerText.trim() : null
      })()`)
      if (kartAdedi !== '2') hata = `özette artırılan adet seçim kartına geçmedi (kartta ${kartAdedi})`
    }
    if (!hata) {
      await bekle(500)
      await s.js(`document.querySelector('.siparis-dip__devam')?.click(); 1`)
      await sayiBekle('[data-parca-satiri]', (v) => v === 2)
      await bekle(500)
      await s.js(`document.querySelector('[data-parca-satiri="${kodlar[1]}"] [data-eylem="parca-kaldir"]')?.click(); 1`)
      await sayiBekle('[data-parca-satiri]', (v) => v === 1)
      const kalan = (await satirlar()).map(([k]) => k)
      const t2 = await toplam()
      if (kalan.length !== 1 || kalan[0] !== kodlar[0]) hata = `Kaldır satırı çıkarmadı (özette ${kalan.join(', ')})`
      else if (!(t2 < t1)) hata = `parça kaldırıldı, toplam inmedi (${t1} → ${t2})`
    }
    if (!hata) {
      /* Son parçanın Kaldır'ı seçim adımına döndürüyor; 100 ms sonraki
         ikinci dokunuş seçim ekranında altta kalan parça kartına gidiyor
         ve kilit onu yutmalı (yoksa kart yeniden seçilirdi). */
      await bekle(300)
      await s.js(`(async () => {
        document.querySelector('[data-parca-satiri="${kodlar[0]}"] [data-eylem="parca-kaldir"]')?.click()
        await new Promise((ok) => setTimeout(ok, 100))
        document.querySelector('.parca-kart__ac')?.click()
        return 1
      })()`)
      const kart = await sayiBekle('.parca-kart__ac', (v) => v > 0)
      await bekle(300)
      const ozet = await say('[data-parca-satiri]')
      const secilen = await say('.parca-kart--on')
      if (ozet > 0 || kart < 1) hata = 'son parça kaldırılınca seçim adımına dönülmedi'
      else if (secilen > 0) hata = `son parça kaldırıldı, seçim ekranında ${secilen} seçili kart kaldı (ikinci dokunuş yutulmadı)`
    }
    kaydet('X-12', 'Servisim: sipariş özetinde adet değişiyor (eksi 1\'de duruyor), Kaldır satırı çıkarıyor, seçimle aynı adet, çift dokunuş yutuluyor, ödeme seçimi kendiliğinden değişmiyor', hata, await metin())
  }

  /* ---------------------------------- 9 · Formlar: boş gönderim

     Tek soru: form boşken asıl eylem düğmesine basılırsa deftere kayıt
     düşüyor mu? Düşmemeli. Uyarı METNİ aranmıyor — o Codex'in alanı ve
     yenilenince değişecek; burada sorulan şey davranış. */
  async function defterOku(anahtar, bicim) {
    return await s.js(`(() => {
      const ham = localStorage.getItem('paksan.' + ${JSON.stringify(anahtar)})
      if (${JSON.stringify(bicim)} === 'tekil') return ham ? 'var' : 'yok'
      try { return String((JSON.parse(ham) || []).length) } catch (e) { return 'okunamadi' }
    })()`)
  }

  for (const f of FORMLAR.filter((x) => secili(x.kod))) {
    /* Ekrana git. */
    if (f.uygulama === 'connect') {
      await s.git(ADRES + '/')
      if (f.oturumsuz) await s.js('localStorage.clear(); sessionStorage.clear(); 1')
      else await depoYaz(YEREL, OTURUM)
      await s.git(ADRES + '/#' + f.yol)
      await bekle(1400)
      /* Form bir pencerede açılıyorsa (Profil'in geri bildirimi, F-11)
         önce onu açan düğme. Bulunamazsa ERİŞİLEMEDİ. */
      if (f.tikla) {
        const t = await s.js(`(() => { const d = document.querySelector(${JSON.stringify(f.tikla)}); if (!d) return 0; d.click(); return 1 })()`)
        if (!t) {
          kaydet(f.kod, f.ad, `${f.tikla} bulunamadı — ERİŞİLEMEDİ`, await metin())
          continue
        }
        await bekle(700)
      }
    } else if (f.uygulama === 'backoffice') {
      await s.git(ADRES + '/backoffice.html')
      await depoYaz(YEREL, OTURUM)
      await s.git(ADRES + '/backoffice.html')
      await bekle(1400)
      await s.js(`document.querySelectorAll('.yan__bag')[${f.menu}]?.click()`)
      await bekle(1200)
    } else {
      await s.git(ADRES + '/servis.html')
      await depoYaz(YEREL, OTURUM)
      await s.git(ADRES + '/servis.html')
      await bekle(1800)
      await s.js(`document.querySelectorAll('.uyg__tab')[${f.sekme}]?.click()`)
      await bekle(900)
      await s.js(`document.querySelector(${JSON.stringify(f.tikla)})?.click()`)
      await bekle(1200)
    }

    const once = await defterOku(f.defter, f.bicim)

    if (process.env.PAKSAN_TUR_AYRINTI) {
      const d = await s.js(`JSON.stringify({
        yol: location.hash,
        dugmeler: [...document.querySelectorAll(${JSON.stringify(f.dugme)})]
          .map((b) => ({ t: (b.innerText || '').replace(/\\s+/g, ' ').slice(0, 24), kapali: b.disabled, gorunur: b.offsetParent !== null })),
      })`)
      console.log(`    [ayrıntı] ${f.kod} defter=${once} ${d}`)
    }

    /* ÜÇ AYRI SONUÇ, ÜÇÜ DE FARKLI ŞEY SÖYLÜYOR:

         yok      düğme hiç çizilmemiş → gidilemedi, kapsam iddia edilemez
         kapali   düğme var ama `disabled` → uygulama boş gönderimi HİÇ
                  önermiyor; bu geçmekten de güçlü bir güvence
         basildi  basıldı, şimdi deftere bakılacak

       Ölçüldü: Servisim'in sipariş formu ikinci yolu kullanıyor
       (`SiparisVer.jsx:517` → `disabled={!secili.length}`). Bunu
       "erişilemedi" saymak yanlış olurdu. */
    /* BİRİNCİL EYLEME ÜÇ KEZ BASILIYOR, BİR KEZ DEĞİL.

       Formların bir kısmı çok adımlı: Makine Ekle önce `kontrolEt`,
       sonra `kaydet` çağırıyor (AddMachine.jsx:66 ve :87); talep formu
       da adım adım ilerliyor. Tek basış yalnız İLK kapıyı sınar ve asıl
       yazma yoluna hiç gelmez — ölçüldü: seri doğrulaması bilerek
       bozulduğunda tek basışlı sınama bunu YAKALAYAMADI. Üç basış
       sihirli bir sayı değil, bu projedeki en uzun boş-form zincirinin
       (üç adım) bir fazlası. Boş formda hiçbir adım açılmamalı, yani
       kaç kez basılırsa basılsın defter büyümemeli. */
    let durum = 'yok'
    for (let basis = 0; basis < 3; basis++) {
      /* EN SONDAKİ düğmeye basılıyor, ilkine değil.

         Onay penceresi açıldığında altındaki form ekranda kalmaya devam
         ediyor ve onun düğmesi DOM'da önce geliyor. İlkine basan bir
         döngü onay penceresini hiç görmeden aynı düğmeye üç kez basar —
         ölçüldü, Duyurular ekranında tam olarak bu oldu ve bilerek
         bozulmuş bir kapı yakalanamadı. Katman sonradan çizildiği için
         doğru hedef sonuncusu. */
      const d = await s.js(`(() => {
        const hepsi = [...document.querySelectorAll(${JSON.stringify(f.dugme)})]
          .filter((x) => x.offsetParent !== null)
        if (!hepsi.length) return 'yok'
        const acikOlanlar = hepsi.filter((x) => !x.disabled)
        if (!acikOlanlar.length) return 'kapali'
        acikOlanlar[acikOlanlar.length - 1].click(); return 'basildi'
      })()`)
      if (basis === 0) durum = d
      else if (d === 'basildi') durum = 'basildi'
      if (d !== 'basildi') break
      await bekle(900)
    }

    if (durum === 'yok') {
      kaydet(f.kod, f.ad, `${f.dugme} ekranda hiç yok — ERİŞİLEMEDİ`, await metin())
      continue
    }
    if (durum === 'kapali') {
      kaydet(f.kod, f.ad + ' (düğme kapalı — gönderim hiç sunulmuyor)', null)
      continue
    }
    await bekle(1200)

    const sonra = await defterOku(f.defter, f.bicim)

    if (process.env.PAKSAN_TUR_AYRINTI) {
      const d = await s.js(`JSON.stringify({
        yol: location.hash,
        dugmeler: [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null)
          .map((b) => (b.innerText || '').replace(/\\s+/g, ' ').slice(0, 20)).slice(0, 8),
        govde: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 160),
      })`)
      console.log(`    [sonrası] ${f.kod} defter=${sonra} ${d}`)
    }

    const yazdi = once !== sonra

    if (f.yazmasiBekleniyor) {
      /* KUSUR DEĞİL, KARAR. Bu form boş da gönderilebiliyor ve kayıt
         YAZMASI bekleniyor; gerekçesi formlar.mjs'te kullanıcının
         kendi sözleriyle yazılı. İddia bu yüzden ters: yazmazsa
         düşüyor. Biri sonradan kapı eklerse bu satır kırmızıya döner
         ve kararın yeniden okunmasını ister. */
      kasitliDavranislar.push(`${f.kod} ${f.ad} — ${f.defter}: ${once} → ${sonra}`)
      kaydet(
        f.kod,
        f.ad + ' (kayıt yazılıyor)',
        yazdi
          ? null
          : 'kayıt yazılmadı: kapı eklenmiş olmalı — formlar.mjs\'teki kararı yeniden oku',
        await metin(),
      )
      continue
    }

    kaydet(
      f.kod,
      f.ad,
      yazdi ? `BOŞ FORM KAYIT YAZDI — ${f.defter}: ${once} → ${sonra}` : null,
      await metin(),
    )
  }
} finally {
  try {
    cdp.ws.close()
  } catch { /* olsun */ }
  surec.kill()
  try {
    rmSync(PROFIL, { recursive: true, force: true })
  } catch { /* olsun */ }
}

/* ----------------------------------------------------------- Özet */

const erisilemez = sonuclar.filter((r) => r.hata && r.hata.includes('ERİŞİLEMEDİ'))
const dusen = sonuclar.filter((r) => r.hata && !r.hata.includes('ERİŞİLEMEDİ'))
const gecen = sonuclar.filter((r) => !r.hata)

console.log('')
console.log(`Ekosistem ekran turu — ${ADRES}`)
console.log('-'.repeat(52))
for (const r of sonuclar) {
  if (!r.hata) {
    console.log(`  ok ${r.kod}  ${r.ad}`)
    continue
  }
  console.log(`  !  ${r.kod}  ${r.ad}`)
  console.log(`       ${r.hata}`)
  if (r.ornek) console.log('       ekranda: ' + r.ornek.replace(/\s+/g, ' ').slice(0, 220))
}

console.log('')
console.log(`  Envanterdeki ekran: ${TOPLAM} · denetlenen: ${sonuclar.length}`)
if (YALNIZ) console.log(`  YALNIZ ${[...YALNIZ].join(', ')} — tam koşu değil, kapsam iddia edilmez`)
if (kasitliDavranislar.length) {
  console.log('  KASITLI DAVRANIŞLAR — kusur değil, kararı formlar.mjs icinde yazılı:')
  for (const k of kasitliDavranislar) console.log('    · ' + k)
  console.log('')
}
console.log('  Aranan ekili değerler: ' + Object.values(IZ).filter(Boolean).join(' · '))
console.log('')
if (dusen.length || erisilemez.length) {
  console.log(
    `SONUÇ: ${gecen.length} geçti, ${dusen.length} düştü, ${erisilemez.length} ekrana erişilemedi.`,
  )
  process.exit(1)
}
/* Hiçbir denetim koşmadıysa başarı yok: seçim bir şeye denk gelmeli. */
if (!sonuclar.length) {
  console.log('SONUÇ: hiçbir denetim koşmadı.')
  process.exit(1)
}
console.log(`SONUÇ: ${sonuclar.length} adımın hepsi geçti.`)
