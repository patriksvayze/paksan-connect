/* ==========================================================================
   Ekosistem ekran turu — üç uygulamanın GEZİLEBİLİR YÜZEYİNİN TAMAMI

       node tools/ekosistem-turu.mjs [--adres http://localhost:3000]

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
import { ortamKur, modulleriYukle, depoTemizle, kapat } from './ekosistem/ortam.mjs'
import { SERVIS, MUSTERI, dunyaKur, talepVerisi, talebiYaz } from './ekosistem/tohum.mjs'
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
const talep = talebiYaz(m, m.talepOlustur.talepKaydiOlustur(talepVerisi('servis', urunId, makineler[0]), kisi))
m.veri.servisKaydiGonder(
  talep,
  { asama: 'bitti', kapi: 'garanti', yapilanIs: 'Ayar Yapıldı', parcalar: [], km: 40, iscilik: 500 },
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
   hemen dönüyor (src/servis/demoKur.js:44-50) — ikisini de kuruyoruz. */
await m.veri.servisHesabiYaz(SERVIS.id, { kullanici: 'konya', sifre: '123456' }, 'Sınama')
m.depo.save('demoSurumu', 2)

/* Bakım rehberi kimliği uydurulmuyor, uygulamanın kendi listesinden
   alınıyor: rehber silinir ya da yeniden adlandırılırsa tur onu görür. */
const rehberId = m.rehber.rehberListesi('tr')[0]?.id || ''

const YEREL = {}
for (const a of globalThis.localStorage.anahtarlar()) YEREL[a] = globalThis.localStorage.getItem(a)
const OTURUM = {}
for (const a of globalThis.sessionStorage.anahtarlar()) OTURUM[a] = globalThis.sessionStorage.getItem(a)

/* Yetkisi kısıtlı personel oturumu — rol bazlı menü sınaması için. */
const KISITLI_OTURUM = JSON.stringify({
  personelId: 'prs-2',
  ad: 'Parça Personeli',
  kullanici: 'parca',
  rol: 'parca',
  giris: Date.now(),
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
  await s.git(ADRES + '/')
  await s.js('localStorage.clear(); sessionStorage.clear(); 1')
  for (const e of CONNECT_OTURUMSUZ) {
    await s.git(ADRES + '/#' + e.yol)
    await denetle(e)
  }

  /* ---------------------------------- 2 · Backoffice ve Servisim girişi */
  await s.git(ADRES + '/backoffice.html')
  await s.js('localStorage.clear(); sessionStorage.clear(); 1')
  await s.git(ADRES + '/backoffice.html')
  await denetle(BACKOFFICE_OTURUMSUZ[0])

  await s.git(ADRES + '/servis.html')
  await denetle(SERVISIM_OTURUMSUZ[0])

  /* ---------------------------------- 3 · Connect, giriş yapılmış */
  await s.git(ADRES + '/')
  await depoYaz(YEREL, OTURUM)
  for (const e of CONNECT) {
    await s.git(ADRES + '/#' + adresCoz(e.yol))
    await denetle(e)
  }

  /* ---------------------------------- 4 · Backoffice, bütün menü */
  await s.git(ADRES + '/backoffice.html')
  await depoYaz(YEREL, OTURUM)
  await s.git(ADRES + '/backoffice.html')
  await bekle(1200)

  const menuSayisi = await s.js(`document.querySelectorAll('.yan__bag').length`)
  if (menuSayisi !== BACKOFFICE.length) {
    kaydet(
      'B-MENU',
      'Menü satır sayısı',
      `envanterde ${BACKOFFICE.length}, ekranda ${menuSayisi} — envanter eskimiş olabilir`,
      '',
    )
  } else {
    kaydet('B-MENU', 'Menü satır sayısı', null)
  }

  for (const e of BACKOFFICE) {
    const bastim = await s.js(`(() => {
      const d = document.querySelectorAll('.yan__bag')[${e.menu}]
      if (!d) return 0
      d.click(); return 1
    })()`)
    if (!bastim) {
      kaydet(e.kod, e.ad, `kenar çubuğunda ${e.menu}. sıra yok — ERİŞİLEMEDİ`, '')
      continue
    }
    await denetle(e)
  }

  /* ---------------------------------- 5 · Rol bazlı menü kısalıyor mu */
  await s.js(`localStorage.setItem('paksan.panelOturum', ${JSON.stringify(KISITLI_OTURUM)}); 1`)
  await s.git(ADRES + '/backoffice.html')
  await bekle(1200)
  const kisitliMenu = await s.js(`document.querySelectorAll('.yan__bag').length`)
  kaydet(
    'B-ROL',
    'Yetkisi kısıtlı personelin menüsü kısalıyor',
    kisitliMenu >= BACKOFFICE.length
      ? `parça personeli ${kisitliMenu} satır görüyor, admin ${BACKOFFICE.length} — kısalmamış`
      : kisitliMenu === 0
        ? 'menü tamamen boş — oturum kabul edilmemiş olabilir'
        : null,
    '',
  )

  /* ---------------------------------- 6 · Servisim */
  await s.git(ADRES + '/servis.html')
  await depoYaz(YEREL, OTURUM)
  await s.git(ADRES + '/servis.html')
  await bekle(1800)

  for (const e of SERVISIM) {
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
  kaydet(
    'X-02',
    'Gezinmek yeni kayıt yazmıyor',
    sapan.length
      ? sapan.map((k) => `${k}: ${beklenen[k]} → ${gelen[k]}`).join(', ')
      : null,
    '',
  )

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

  for (const f of FORMLAR) {
    /* Ekrana git. */
    if (f.uygulama === 'connect') {
      await s.git(ADRES + '/')
      if (f.oturumsuz) await s.js('localStorage.clear(); sessionStorage.clear(); 1')
      else await depoYaz(YEREL, OTURUM)
      await s.git(ADRES + '/#' + f.yol)
      await bekle(1400)
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
console.log(`SONUÇ: ${sonuclar.length} adımın hepsi geçti.`)
