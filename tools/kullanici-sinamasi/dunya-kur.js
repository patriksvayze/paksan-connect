/* ==========================================================================
   Kullanıcı sınaması — test dünyasını kurar (tarayıcıda koşar)

   Orkestratör sınamanın başında bu dosyanın içeriğini localhost:3000'de
   bir kez çalıştırır. Tekrar çalıştırmak zararsız: var olanı bulup
   üstüne yazar, çoğaltmaz.

   Kurduğu:
     · Çiftçi hesabı (Connect): `hesap` ve tek makine; makine defterinde
       Selçuk Tarım Servisi'ne (konya-servis) atanmış. İkinci makineyi
       çiftçi ajanı kendisi ekleyecek; o makinenin servisi yok, PAKSAN
       servis personeli atayacak.
     · İki personel kaydı, varsayılan "Servis" ve "Yedek Parça" rollerinde,
       ŞİFRESİZ: kimse bu hesaplarla giriş formundan giremez. Oturumu her
       turun başında orkestratör açar (bkz. README.md); ajanlar şifre
       yazmaz, hesap açmaz.

   Kayıtların hiçbiri `demo` işaretli değil: servis.html açılışındaki demo
   sıfırlaması (src/servis/demoKur.js) onlara dokunmaz.
   ========================================================================== */
export default async function dunyaKur() {
  const veri = await import('/src/backoffice/veri.js')
  const P = 'paksan.'
  const oku = (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(P + k)) ?? d
    } catch {
      return d
    }
  }
  const yaz = (k, v) => localStorage.setItem(P + k, JSON.stringify(v))
  const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const simdi = Date.now()

  /* ------------------------------------------------------------- Çiftçi */
  const SERI = 'ORK1270202599901'
  const musteri = {
    id: 'msc-sinama-ciftci',
    no: 'MST900001',
    createdAt: simdi,
    ad: 'Mehmet Kaya',
    adi: 'Mehmet',
    soyadi: 'Kaya',
    ulke: 'TR',
    tel: '5321112233',
    konumUlke: 'TR',
    il: 'Konya',
    ilce: 'Selçuklu',
    adres: 'Tatköy Mahallesi, kooperatifin arkası, Selçuklu / Konya',
    satici: 'PAKSAN Konya Ana Bayi',
    onaylar: { aydinlatma: true, acikRiza: true, kampanya: true, surum: '1.1', tarih: simdi },
    bildirim: { izin: 'verildi', tarih: simdi },
  }
  const makine = {
    id: 'mk-sinama-1',
    productId: 'orkinos-1270',
    serial: SERI,
    year: 2025,
    nickname: '',
    addedAt: simdi,
    hours: 0,
    doneMaintenance: [],
  }
  yaz('hesap', musteri)
  const makineler = oku('machines', []).filter((m) => norm(m.serial) !== SERI)
  yaz('machines', [makine, ...makineler])
  yaz('makineKayitlari', [
    {
      id: 'mkk-sinama-1',
      tarih: simdi,
      seri: SERI,
      productId: 'orkinos-1270',
      musteriId: musteri.id,
      musteriNo: musteri.no,
      musteriAd: musteri.ad,
      il: 'Konya',
      ilce: 'Selçuklu',
      bayiId: 'konya-merkez',
      bayiAd: 'PAKSAN Konya Ana Bayi',
      servisId: 'konya-servis',
      servisAd: 'Selçuk Tarım Servisi',
      uretimTarihi: null,
      faturaTarihi: null,
      logoBildi: false,
      yeniSatis: false,
      kaynak: 'musteri',
    },
    ...oku('makineKayitlari', []).filter((k) => norm(k.seri) !== SERI),
  ])
  if (!localStorage.getItem(P + 'dil')) yaz('dil', 'tr')

  /* ------------------------------------------------ Personel (şifresiz)

     Roller uygulamanın VARSAYILAN "Servis" ve "Yedek Parça" rolleri
     (kullanıcının kararı, 24 Eylül 2026: "2 yeni rol oluşturmana gerek
     yok"). Bu rollerin göremediği iş (servis ataması, hizmet ücreti,
     katalog, iskonto) sınamada bulgu olarak raporlanır. */
  if (!veri.rolleriGetir().some((r) => r.id === 'servis') || !veri.rolleriGetir().some((r) => r.id === 'parca')) {
    return { hata: 'Varsayılan "servis" ya da "parca" rolü yok; Roller ve Yetkiler ekranına bakın.' }
  }
  const personel = oku('personel', [])
  const kisiler = [
    { id: 'prs-sinama-servis', no: 'PRS900001', ad: 'Selin Aksoy', kullanici: 'selin.aksoy', rol: 'servis' },
    { id: 'prs-sinama-parca', no: 'PRS900002', ad: 'Burak Demirtaş', kullanici: 'burak.demirtas', rol: 'parca' },
  ]
  for (const k of kisiler) {
    const i = personel.findIndex((p) => p.id === k.id)
    const kayit = { ...k, eposta: '', tel: '', aktif: true, createdAt: simdi, sonGiris: null }
    if (i >= 0) personel[i] = { ...personel[i], ...kayit }
    else personel.push(kayit)
  }
  yaz('personel', personel)

  return {
    ciftci: `${musteri.ad} · ${musteri.tel}`,
    makine: SERI,
    personel: kisiler.map((k) => `${k.ad} (${k.rol})`),
  }
}
