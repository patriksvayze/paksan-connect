/* ==========================================================================
   Destek veri paketi denetimi

   Veri seti yenilendiğinde (src/marka/icerik/mobile_support_package.json
   yeniden kopyalandığında) çalıştırılır. Ekranın açıkta kalacağı durumları
   arar: dokununca boş açılan bir arıza, kaynağı olmayan bir cümle,
   listede görünmemesi gereken bir kapsam kaydı.

     node tools/destek-dogrula.mjs

   Ekranın veriyi nasıl okuduğu src/lib/destek.js içinde; burası o
   dosyanın dayandığı varsayımları denetliyor.
   ========================================================================== */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/* Paket yolu betiğin kendi yerine göre kuruluyor, çalıştırıldığı
   klasöre göre değil: dosya bir kere src/data altından src/marka/icerik
   altına taşındı ve bu betik ENOENT verip durdu. Kimse görmedi, çünkü
   `npm run dogrula` onu çağırmıyordu. Artık çağırıyor (8. kontrol). */
const PAKET_YOLU = join(
  dirname(fileURLToPath(import.meta.url)), '..', 'src', 'marka', 'icerik', 'mobile_support_package.json',
)

const paket = JSON.parse(readFileSync(PAKET_YOLU, 'utf8'))

let hata = 0
const yaz = (durum, metin) => {
  if (durum === 'hata') hata++
  console.log((durum === 'hata' ? '  HATA  ' : durum === 'uyari' ? '  uyarı ' : '  ok    ') + metin)
}

console.log(`\nPaket ${paket.package_version} · veri seti ${paket.dataset_version}\n`)

/* ------------------------------------------------------------- Makineler

   Ekran kapsam kayıtlarını listeden çıkarıyor: bunlar bir kılavuzun
   kapsadığı modelleri toplayan iç kayıtlar, müşterinin seçeceği model
   değil (bkz. src/lib/destek.js → kapsamKaydiMi). */

const kapsam = paket.machines.filter((m) => !m.model || /kapsam kaydi/i.test(m.name || ''))
const secilebilir = paket.machines.filter((m) => !kapsam.includes(m))

yaz('ok', `${paket.machines.length} makine kaydı · ${secilebilir.length} seçilebilir model · ${kapsam.length} kapsam kaydı`)

if (!secilebilir.length) yaz('hata', 'Seçilebilir model kalmadı — makine seçici boş açılır')

/* --------------------------------------------------------------- Arızalar

   Ekranda bir arızaya dokunulduğunda `problem_id` ile eşleşen `result`
   satırları açılıyor. Eşleşme yoksa satır boş açılır. */

const sonucSayisi = new Map()
for (const r of paket.results) {
  sonucSayisi.set(r.problem_id, (sonucSayisi.get(r.problem_id) || 0) + 1)
}

const bosArizalar = paket.flows.filter((f) => !sonucSayisi.get(f.problem_id || f.flow_id))
yaz(bosArizalar.length ? 'hata' : 'ok',
  `${paket.flows.length} arıza · sebep-çözüm satırı olmayan: ${bosArizalar.length}`)
for (const f of bosArizalar.slice(0, 5)) yaz('hata', `    ${f.flow_id}`)

const aksiyonsuz = paket.results.filter((r) => !(r.actions || []).length)
yaz(aksiyonsuz.length ? 'hata' : 'ok',
  `${paket.results.length} sebep-çözüm satırı · çözümü yazılmamış: ${aksiyonsuz.length}`)

/* ----------------------------------------------------------- Her modelin
   listesi dolu mu? Boş açılan bir sekme kullanıcıya "veri yok" diyor. */

for (const m of secilebilir) {
  const id = m.machine_id
  const ariza = paket.flows.filter(
    (f) => f.machine_id === id || (f.model_scope || []).includes(id)
  ).length

  /* Güvenlik ve kartlar kapsam kaydına bağlı olabiliyor; ekran o bağı
     akışlar üzerinden kuruyor (bkz. src/lib/destek.js → kapsamKimlikleri). */
  const kimlikler = new Set([id])
  for (const f of paket.flows) {
    if (f.machine_id === id || (f.model_scope || []).includes(id)) kimlikler.add(f.machine_id)
  }
  const kapsamda = (k) => kimlikler.has(k.machine_id) || (k.model_scope || []).includes(id)

  const guvenlik = paket.safety.filter(kapsamda).length
  const kart = paket.knowledge_cards.filter(kapsamda).length
  const cevap = paket.quick_answers.filter(
    (q) => q.machine_id === id || (q.model_scope || []).includes(id)
  ).length

  const satir = `${m.name} — ${ariza} arıza · ${cevap} hızlı cevap · ${kart} kart · ${guvenlik} güvenlik`

  if (!ariza) yaz('hata', satir + '   ← arıza listesi boş')
  else if (!guvenlik) yaz('hata', satir + '   ← güvenlik uyarısı yok, müdahale şeridi çıkmaz')
  else yaz('ok', satir)
}

/* ---------------------------------------------------------------- Kaynak

   Ekranda görünen her cümlenin altında hangi kılavuzun kaçıncı
   sayfasından geldiği yazıyor. Kaynağı olmayan kayıt o satırı
   kaynaksız gösterir. */

const kaynaksiz = (liste, ad) => {
  const yok = liste.filter((k) => !k.source?.[0])
  yaz(yok.length ? 'uyari' : 'ok', `${ad}: ${liste.length} kayıt · kaynağı olmayan ${yok.length}`)
}

kaynaksiz(paket.flows, 'Arızalar')
kaynaksiz(paket.results, 'Çözümler')
kaynaksiz(paket.quick_answers, 'Hızlı cevaplar')
kaynaksiz(paket.knowledge_cards, 'Kullanım kartları')
kaynaksiz(paket.safety, 'Güvenlik notları')

console.log(hata ? `\n${hata} hata bulundu.\n` : '\nSorun yok.\n')
process.exit(hata ? 1 : 0)
