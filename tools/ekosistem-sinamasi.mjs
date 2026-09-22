/* ==========================================================================
   Ekosistem sınaması — üç uygulamanın paylaştığı veri katmanını koşturur

       node tools/ekosistem-sinamasi.mjs [--tohum N] [--yalniz AK-03]

   `npm run dogrula` bunu 8. kontrolden çağırıyor. Ayrı bir komutu yok:
   ikinci bir komut, unutulacak ikinci bir yer demek.

   NE YAPIYOR. PAKSAN Connect, backoffice ve Servisim tek bir veri
   katmanını paylaşıyor (sunucu yok; devir `paksan.` önekli depodan
   oluyor). Bu betik o katmanı Node içinde gerçekten çalıştırıp uçtan
   uca akışları yürütüyor: talep açılıyor, servise düşüyor, servis
   kaydı gidiyor, hak ediş doğuyor, PAKSAN onaylıyor, cariye alacak
   yazılıyor. Kırılma buradan geliyor — bir uygulama ötekinin
   okuyamayacağı bir kayıt yazıyor ve kimse görmüyor. Ekran görüntüsü
   de statik denetim de bunu yakalayamaz; zincirin koptuğunu ancak
   zinciri yürüten görür.

   NE YAPMIYOR. Hiçbir ekran açmıyor, tek bir CSS seçicisine bakmıyor.
   Ekran tarafı ayrı: tools/ekosistem-turu.mjs.

   ÖNCE DÜŞÜRÜLEREK DENENDİ. Hiç düştüğü görülmemiş bir sınama, hiçbir
   şey iddia etmeyen sınamadan ayırt edilemez. Her senaryonun taşıyıcı
   olduğu tek tek bozularak gösterildi; liste aşağıda. Yeni senaryo
   yazan aynısını yapar ve satırını ekler.

     AK-01  talepOlustur.js `sahip` sabitlenirse               düştü
     AK-01  veri.js:2312 `tur:'alacak'` → `'borc'`             düştü
     AK-02  servisAtama.js normalizeSerial → .trim()           düştü
     AK-02  servisGruplari her makineyi ilk servise yazarsa     düştü
     AK-03  veri.js:2086 teslimat kapısı kaldırılırsa          düştü
     AK-04  talepOlustur.js tür kapısı kaldırılırsa            düştü
     AK-05  veri.js:1091 zincirden `tutarKdvli` çıkarılırsa    düştü
     AK-06  veri.js durumGecisiEngeli hep boş dönerse          düştü
     AK-06  talebiBayiyeAta teklif geçmişine bakmazsa          düştü
     AK-06  talebiBayiyeAta müşteriye yine bildirirse          düştü
     AK-06  talepEkleme.js kapalı listesi ayrılırsa            düştü
     AK-07  veri.js:947 eşleşme son dört haneye indirilirse    düştü
     AK-08  Talepler.jsx:1586 izin adı yanlış yazılırsa        düştü
     AK-08  rolunTalepleri yalnız ilk türe bakarsa             düştü
     AK-08  rolunTurleri eski tek-tür alanını okumazsa         düştü
     AK-08  rolGuncelle eski tek-tür alanını bırakırsa         düştü
     AK-09  duyuruHedef.js:159 il süzgeci kapatılırsa          düştü
     AK-10  veri.js ANAHTAR.islemKaydi adı değişirse           düştü
     AK-11  servisKaydi.js garanti kapısı kaldırılırsa         düştü
     AK-12  veri.js birleştirmede defter yazılmazsa            düştü
     AK-13  veri.js:2086 teslimat kapısı kaldırılırsa          düştü
     AK-14  dikteMotoru.js duraklamada yine bitirilirse       düştü
     AK-15  talepPlanla `servisten`e bakmazsa                  düştü
     AK-15  talepIptal servise bildirmezse                     düştü
     AK-15  ziyaret günü sipariş diye işaretlenirse            düştü
     AK-16  sayım bayinin servisini hesaba katmazsa           düştü
     AK-16  sayım müşteri düzeyine dönerse                    düştü
     AK-17  isDurumu.js şerit eski kurala (gecikmisMi) dönerse düştü
     AK-18  makineKaydet var olan satırı aramazsa              düştü
     AK-18  servisMakineKaydi kayıtlı seride de yazarsa        düştü
     AK-18  kayitIsle Servisim kopyasını kabul ederse          düştü
     AK-18  okuma kopyaları birleştirmezse                     düştü
     AK-18  servisMakineKaydi müşteri hesabını yazmazsa        düştü
     AK-18  atama bildirimi servis değişmeden de giderse       düştü
     AK-18  atama bildirimi hiç gitmezse                       düştü
     AK-18  hesapsız makineye bildirim yazılırsa               düştü
     AK-18  bildirim makine ekranına yönlenmezse               düştü
     AK-18  bildirimler.js 'makine' türünü tanımazsa           düştü
     AK-19  servisKaydi.js temizParcalar görseli düşürürse     düştü
     AK-19  parcaKatalogu.js fiyatGoruntusu görsel yazmazsa    düştü
     AK-19  talebinParcalari görüntüden görseli düşürürse      düştü
     AK-20  eski kayıt bugünkü saat ücretiyle hesaplanırsa     düştü
     AK-20  hakkedisDuzelt satıra süreyi yazmazsa              düştü
     AK-20  saatOku virgüllü süreyi ("2,5") okumazsa           düştü
     ---    ortam.mjs'te depo taklidi kaldırılırsa    0. ADIM DURDURUR

   Son satır en önemlisi: src/lib/storage.js her hatayı yutup
   varsayılanı döndürüyor, yani taklit kurulmazsa bütün senaryolar boş
   depoya bakar ve HEPSİ YEŞİL GEÇER. 0. adım tam onu tutuyor.
   ========================================================================== */

import {
  ortamKur,
  modulleriYukle,
  nisanTuru,
  depoTemizle,
  kapat,
  tohumla,
  kaynaklariTopla,
  modulYukle,
  TOHUM,
} from './ekosistem/ortam.mjs'
import { SENARYOLAR } from './ekosistem/senaryolar.mjs'

const arg = process.argv.slice(2)
const deger = (ad) => {
  const i = arg.indexOf(ad)
  return i >= 0 ? arg[i + 1] : null
}
const tohum = Number(deger('--tohum')) || TOHUM
const yalniz = deger('--yalniz')

/* Depo, saat ve rastgelelik modüllerden ÖNCE kurulmak zorunda. */
ortamKur()
tohumla(tohum)

const m = await modulleriYukle()
const ctx = { kaynaklar: kaynaklariTopla(), modulYukle }

/* ----------------------------------------------------------- 0. adım */

const nisanHatasi = nisanTuru(m.depo)
if (nisanHatasi) {
  console.log('')
  console.log('0. adım — depo taklidi')
  console.log('----------------------')
  console.log(`  ! ${nisanHatasi}`)
  console.log('')
  console.log('    Depo taklidi çalışmıyor. src/lib/storage.js her hatayı yutup')
  console.log('    varsayılanı döndürdüğü için senaryolar koşsaydı hepsi boş bir')
  console.log('    depoya bakar ve YANLIŞLIKLA geçerdi. Hiçbiri koşturulmadı.')
  console.log('')
  console.log('SONUÇ: sınama yapılamadı.')
  await kapat()
  process.exit(1)
}

/* --------------------------------------------------------- Senaryolar */

const secili = yalniz
  ? SENARYOLAR.filter((f) => f.name.replace(/^AK/, 'AK-') === yalniz)
  : SENARYOLAR

if (yalniz && !secili.length) {
  console.log(`  ! "${yalniz}" diye bir senaryo yok`)
  await kapat()
  process.exit(1)
}

console.log('')
console.log(`Ekosistem akışları — ${secili.length} senaryo · tohum ${tohum}`)
console.log('-'.repeat(46))

const sonuclar = []

for (const senaryo of secili) {
  depoTemizle()
  let d
  try {
    d = await senaryo(m, ctx)
  } catch (e) {
    sonuclar.push({
      kod: senaryo.name.replace(/^AK/, 'AK-'),
      ad: '(patladı)',
      sayi: 0,
      dusen: [{ ne: 'senaryo hata fırlattı', beklenen: 'çalışması', gelen: String(e?.message || e) }],
      patladi: e,
    })
    continue
  }
  sonuclar.push(d)
}

/* ----------------------------------------------------------- Ayrıntı */

for (const s of sonuclar) {
  if (!s.dusen.length) {
    console.log(`  ok ${s.kod}  ${s.ad}  (${s.sayi} iddia)`)
    continue
  }
  console.log(`  !  ${s.kod}  ${s.ad}  — ${s.dusen.length}/${s.sayi} iddia düştü`)
  for (const h of s.dusen) {
    console.log(`       ${h.ne}`)
    console.log(`         beklenen: ${h.beklenen}`)
    console.log(`         gelen   : ${h.gelen}`)
  }
  if (s.patladi?.stack) {
    console.log(
      s.patladi.stack
        .split('\n')
        .slice(0, 4)
        .map((x) => '       ' + x.trim())
        .join('\n'),
    )
  }
}

/* ------------------------------------------------------------ Özet

   TABLO EN SONDA OLMAK ZORUNDA. `npm run dogrula` 8. kontrol, düşen
   bir sınamanın yalnız SON 12 SATIRINI basıyor. Hüküm başta yazılsaydı
   dilimin dışında kalır ve dogrula çıktısında görünmezdi. */

const dusenler = sonuclar.filter((s) => s.dusen.length)
const iddia = sonuclar.reduce((t, s) => t + s.sayi, 0)

console.log('')
console.log('  KOD     SENARYO                              İDDİA  SONUÇ')
for (const s of sonuclar) {
  const ad = (s.ad.length > 35 ? s.ad.slice(0, 34) + '…' : s.ad).padEnd(35)
  const say = String(s.sayi).padStart(5)
  console.log(`  ${s.kod}  ${ad}${say}  ${s.dusen.length ? 'DÜŞTÜ' : 'geçti'}`)
}

console.log('')
if (dusenler.length) {
  console.log(
    `SONUÇ: ${sonuclar.length} senaryonun ${dusenler.length} tanesi düştü (${iddia} iddia koşturuldu).`,
  )
  await kapat()
  process.exit(1)
}
console.log(`SONUÇ: ${sonuclar.length} senaryonun hepsi geçti, ${iddia} iddia doğrulandı.`)
await kapat()
