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
import { rmSync } from 'node:fs'
import { ortamKur, modulleriYukle, modulYukle, depoTemizle, kapat } from './ekosistem/ortam.mjs'
import { SERVIS, MUSTERI, PARCA_PERSONELI, dunyaKur, personelKaydiEkle, talepVerisi, talebiYaz } from './ekosistem/tohum.mjs'
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

const arg = process.argv.slice(2)
const adresArg = arg.indexOf('--adres') >= 0 ? arg[arg.indexOf('--adres') + 1] : null
const YALNIZ = arg.indexOf('--yalniz') >= 0 ? new Set(String(arg[arg.indexOf('--yalniz') + 1] || '').split(',').filter(Boolean)) : null
/** Denetim bu koşuda var mı? `--yalniz` yoksa hepsi. */
const secili = (kod) => !YALNIZ || YALNIZ.has(kod)

/* ENVANTER DIŞINDAKİ DENETİMLER: ekran değil, davranış. Kodları burada
   tek listede; `--yalniz` denetimi de buna bakıyor. */
const EK_DENETIMLER = [
  'B-MENU', 'B-ROL', 'B-SEKME',
  'X-01', 'X-02', 'X-03', 'X-04', 'X-05', 'X-06', 'X-07',
  'C-29', 'C-30', 'C-31', 'C-32', 'C-33',
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
    const secim = await say('select.select')
    const hata =
      kart < 1 ? 'servisi olmayan makinede kart çıkmadı (form açık)'
        : gonder > 0 ? 'servisi olmayan makinede formun gönder düğmesi duruyor'
          : secim < 1 ? 'makine seçimi kalktı (ekranın tamamı "servis yok" kartı oldu)'
            : null
    kaydet('C-33', 'Servisi atanmamış makinede talep formu yerine kart', hata, await metin())
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
