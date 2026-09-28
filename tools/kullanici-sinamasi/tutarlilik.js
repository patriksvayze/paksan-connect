/* ==========================================================================
   Kullanıcı sınaması — tur arası tutarlılık denetimi (tarayıcıda koşar)

   Orkestratör her turdan sonra bu dosyanın içeriğini tarayıcıda
   (localhost:3000, herhangi bir sayfa) javascript olarak çalıştırır. Dosya
   uygulamanın kendi modüllerini Vite üzerinden yükler; hiçbir şey YAZMAZ.

   Döndürdüğü:
     ozet    — sayılar (talepler türe ve duruma göre, cari toplamları,
               bildirimler); iki tur arasında karşılaştırılır
     ihlal   — kural dışı durumlar: {kod, ciddiyet, aciklama, kayit}

   Kurallar sınama senaryolarının (tools/ekosistem/senaryolar.mjs) iddia
   ettiklerinin canlı veride karşılığı; bir kural düşerse ya uygulama
   bozuldu ya da bir ajan bir açığı kullandı. Hangisi olduğuna orkestratör
   ajanın raporuna bakarak karar verir.
   ========================================================================== */
export default async function tutarlilik() {
  const veri = await import('/src/backoffice/veri.js')
  const sk = await import('/src/lib/servisKaydi.js')
  const marka = await import('/src/marka/index.js')
  const P = 'paksan.'
  const oku = (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(P + k)) ?? d
    } catch {
      return d
    }
  }
  const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const ihlal = []
  const ekle = (kod, ciddiyet, aciklama, kayit) => ihlal.push({ kod, ciddiyet, aciklama, kayit })

  const talepler = veri.talepleriGetir()
  const cari = oku('cariHareket', [])
  const duyurular = oku('duyurular', [])
  const servisler = marka.servisleriGetir()
  const servisIdleri = new Set(servisler.map((s) => s.id))
  const durumlar = new Set(veri.DURUMLAR.map((d) => d.id))

  /* ------------------------------------------------------------- Talepler */
  const idSay = {}
  const noSay = {}
  for (const t of talepler) {
    idSay[t.id] = (idSay[t.id] || 0) + 1
    if (t.no) noSay[t.no] = (noSay[t.no] || 0) + 1
    if (!durumlar.has(t.status)) ekle('T3', 'yüksek', `bilinmeyen durum "${t.status}"`, t.no)
    if (t.servis?.id && !servisIdleri.has(t.servis.id)) ekle('T4', 'orta', `var olmayan servise bağlı (${t.servis.id})`, t.no)
    if (t.tur === 'parca' && !t.servisSiparisi && ['incelemede', 'planlandi', 'kapandi'].includes(t.status) && !t.odemeOnay) {
      ekle('P1', 'yüksek', `müşteri parça talebi ödeme onayı olmadan "${t.status}"`, t.no)
    }
    if (t.hakkedis?.durum === 'bekliyor' && t.status !== 'onayBekliyor') {
      ekle('H3', 'orta', `hak ediş bekliyor ama durum "${t.status}"`, t.no)
    }
    /* Yeniden açılan talepte her ziyaretin kendi hak edişi var: önceki
       ziyaretinki `oncekiKayitlar`'da arşivde (veri.js → servisKaydiGonder).
       Beklenen alacak sayısı ONAYLANMIŞ ziyaret sayısı; yalnız son
       ziyarete bakılınca iki ziyaretli talep "iki kez yazılmış" görünüyordu
       (ikinci sınama, 26 Eylül 2026, SRV2609243039: 330 + 600). */
    const onaylananZiyaretler = [
      ...(t.oncekiKayitlar || []).map((k) => k.hakkedis),
      t.hakkedis,
    ].filter((h) => h?.durum === 'onaylandi' && h.toplam > 0)
    if (onaylananZiyaretler.length) {
      const alacak = cari.filter((h) => h.tur === 'alacak' && h.talepNo === t.no && /servis ödemesi/.test(h.aciklama || ''))
      if (alacak.length < onaylananZiyaretler.length) {
        ekle('H1', 'yüksek', `onaylanan ${onaylananZiyaretler.length} hak edişin ${alacak.length} alacağı var`, t.no)
      }
      if (alacak.length > onaylananZiyaretler.length) {
        ekle('H2', 'yüksek', `${onaylananZiyaretler.length} onaylı hak ediş için ${alacak.length} alacak yazılmış`, t.no)
      }
    }
    const km = Number(t.servisKaydi?.km) || 0
    const saat = Number(t.servisKaydi?.iscilikSaat) || 0
    if (km > 1000 || saat > 24 || km < 0 || saat < 0) {
      ekle('K1', 'orta', `servis kaydında olağan dışı değer (km ${km}, saat ${saat})`, t.no)
    }
    if (t.servisSiparisi) {
      const h = veri.siparisHesabi(t)
      const g = sk.siparisGonderimi(t)
      if (t.odeme === 'bakiye') {
        if (h.dusulen < 0) ekle('S1', 'yüksek', `siparişten eksi tutar düşülmüş (${h.dusulen})`, t.no)
        if (h.dusulen > h.net + 1) ekle('S1', 'yüksek', `siparişin tutarından fazla düşülmüş (${h.dusulen} > ${h.net})`, t.no)
        if (t.status === 'kapandi' && g && !g.kalan.length && Math.abs(h.dusulen - h.net) > 1) {
          ekle('S2', 'yüksek', `tamamı gönderilmiş siparişte düşülen (${h.dusulen}) yeni tutara (${h.net}) eşit değil`, t.no)
        }
        if (t.status === 'iptal' && Math.abs(h.dusulen) > 1) ekle('S3', 'yüksek', `iptal edilen siparişte net düşülen ${h.dusulen}`, t.no)
        if (['yeni', 'incelemede'].includes(t.status) && h.dusulen > 0 && !(t.gonderimler || []).length) {
          ekle('S5', 'orta', 'hiç gönderilmemiş siparişten bakiye düşülmüş', t.no)
        }
      } else if (cari.some((x) => x.talepId === t.id)) {
        ekle('S4', 'yüksek', 'faturalı siparişe cari hareket yazılmış', t.no)
      }
      const toplam = Number(t.parcaFiyat?.toplam)
      const satirToplam = (t.parcaFiyat?.satirlar || []).reduce((a, s) => a + (Number(s.tutar) || 0), 0)
      if (t.parcaFiyat && Number(t.parcaFiyat.araToplam) > satirToplam + 1) {
        ekle('S6', 'orta', `ara toplam (${t.parcaFiyat.araToplam}) satırların toplamından (${satirToplam}) büyük`, t.no)
      }
      if (t.parcaFiyat && !(toplam >= 0)) ekle('S7', 'yüksek', `sipariş toplamı geçersiz (${toplam})`, t.no)
    }
  }
  for (const [id, n] of Object.entries(idSay)) if (n > 1) ekle('T1', 'yüksek', `aynı kimlikte ${n} talep`, id)
  for (const [no, n] of Object.entries(noSay)) if (n > 1) ekle('T2', 'düşük', `aynı numarada ${n} talep`, no)

  /* ----------------------------------------------------------------- Cari */
  const talepIdleri = new Set(talepler.map((t) => t.id))
  for (const h of cari) {
    if (!(Number(h.tutar) > 0)) ekle('C1', 'yüksek', `cari hareket tutarı geçersiz (${h.tutar})`, h.aciklama)
    if (h.talepId && !talepIdleri.has(h.talepId)) ekle('C2', 'orta', 'cari hareketin talebi yok (silinmiş ya da sıfırlanmış)', h.aciklama)
    if (h.servisId && !servisIdleri.has(h.servisId)) ekle('C3', 'orta', `cari hareket var olmayan serviste (${h.servisId})`, h.aciklama)
  }
  const bakiyeler = {}
  for (const s of servisler) {
    const b = veri.bakiyeDurumu(s.id)
    if (b.bakiye || b.ayrilan) bakiyeler[s.id] = b
    if (b.kullanilabilir < 0) ekle('C4', 'orta', `kullanılabilir bakiye eksi (${b.kullanilabilir})`, s.id)
  }

  /* ------------------------------------------------------------ Bildirimler */
  for (const d of duyurular) {
    if (d.alici === 'servis' && !d.servisId) ekle('N1', 'orta', 'servis bildirimi servissiz', d.olay || d.baslik)
    if (d.kisisel && d.alici !== 'servis' && !d.musteriId && !d.tel && !d.musteriTel) {
      ekle('N2', 'orta', 'müşteri bildiriminin alıcısı yok (kimse görmüyor)', d.metinAnahtar || d.baslik)
    }
  }

  /* ---------------------------------------------------------- Makine defteri */
  const defter = oku('makineKayitlari', [])
  const seriSay = {}
  for (const k of defter) seriSay[norm(k.seri)] = (seriSay[norm(k.seri)] || 0) + 1
  for (const [s, n] of Object.entries(seriSay)) if (n > 1) ekle('M1', 'yüksek', `bir seri numarası defterde ${n} satır`, s)
  for (const mk of oku('machines', [])) {
    if (mk.serial && !seriSay[norm(mk.serial)]) ekle('M2', 'orta', 'çiftçinin makinesi defterde yok', mk.serial)
  }

  /* ------------------------------------------------------------ Demo verisi

     Demo kaydı makineye uymalı (25 Eylül 2026; ilk sınamada rotovatörde
     "düğüm atmıyor", garantisi bitmiş makinede garanti kaydı, Süper
     8002E'de Yunus parçası vardı). Demonun kendi kuralları okunuyor
     (src/backoffice/demoMakineAilesi.js), yazılmıyor. Katalog inmezse D3
     atlanıyor; o durumda demo da kurulamaz. */
  const demoAile = await import('/src/backoffice/demoMakineAilesi.js')
  const talepAlanlari = await import('/src/data/talepAlanlari.js')
  let katalog = null
  try {
    katalog = await (await import('/src/lib/parcaKatalogu.js')).katalogGetir()
  } catch {
    katalog = null
  }
  const havuzlar = new Map()
  const havuz = (pid) => {
    if (!havuzlar.has(pid)) havuzlar.set(pid, new Set(demoAile.makineninParcaHavuzu(katalog, pid).map((p) => p.kod)))
    return havuzlar.get(pid)
  }
  for (const t of talepler.filter((x) => x.demo && !x.servisSiparisi && x.makine?.productId)) {
    const pid = t.makine.productId
    if (t.tur === 'servis') {
      if (t.servisKaydi?.kapi === 'garanti' && !demoAile.garantideMi(t.makine.serial)) {
        ekle('D1', 'düşük', 'demo: garantisi bitmiş makinede garanti kaydı', t.no)
      }
      const izinli = talepAlanlari.belirtileriGetir(demoAile.makineAilesi(pid))
      if ((t.belirtiler || []).some((b) => !izinli.includes(b) || b === 'Diğer')) {
        ekle('D2', 'düşük', 'demo: belirti makinenin ailesinden değil', t.no)
      }
    }
    if (katalog) {
      const kodlar = [
        ...(t.servisKaydi?.parcalar || []).map((p) => p.kod),
        ...(t.tur === 'parca' ? (t.parcaFiyat?.satirlar || []).map((s) => s.kod) : []),
      ].filter(Boolean)
      if (kodlar.some((k) => !havuz(pid).has(k))) ekle('D3', 'düşük', 'demo: parça makinenin ailesinden ya da modelinden değil', t.no)
    }
  }

  /* ------------------------------------------------------------------ Özet */
  const say = (dizi, f) => dizi.reduce((a, x) => ((a[f(x)] = (a[f(x)] || 0) + 1), a), {})
  const ozet = {
    talep: talepler.length,
    turDurum: say(talepler, (t) => `${t.servisSiparisi ? 'siparis' : t.tur}:${t.status}`),
    cariHareket: cari.length,
    bakiyeler,
    bildirim: {
      musteri: duyurular.filter((d) => d.kisisel && d.alici !== 'servis').length,
      servis: duyurular.filter((d) => d.alici === 'servis').length,
      duyuru: duyurular.filter((d) => !d.kisisel).length,
    },
    makineDefteri: defter.length,
    ciftciMakine: oku('machines', []).length,
    demoSurumu: localStorage.getItem(P + 'demoSurumu'),
    oturumBackoffice: oku('panelOturum', null)?.rol || null,
  }
  return { ozet, ihlalSayisi: ihlal.length, ihlal }
}
