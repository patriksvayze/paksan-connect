import { useEffect, useMemo, useState } from 'react'
import { gecenSure } from '../../backoffice/ekranlar/ortak'
import { load, save } from '../../lib/storage'
import { duyuruGecerliMi } from '../../lib/duyuruHedef'
import { servisDuyuruBaglami } from '../../lib/servisAtama'
import { Bolum, Bos, Yaprak } from '../Kabuk'
import {
  IconBell,
  IconCalendar,
  IconMachine,
  IconTag,
  IconAlert,
  IconCheckCircle,
  IconUndo,
  IconChevronDown as IconChevron,
  IconPhone,
  IconRight,
} from '../../components/Icons'
import { altBilgi } from '../../data/duyuruTurleri'
import { makineDurumAdi } from '../../data/talepAlanlari'
import { kayitTelHref } from '../../lib/tel'
import { randevuSaatliMi } from '../../lib/tarih'
import { useBildirimIzni } from '../haber'
import { bildirimYazisi, GORULEN_DUYURU, musteridenMi, okunduSay, okunmamislar } from '../talepBildirimleri'
import { devamSirasi, dokunulmamis, randevuSirasi, servisGecikti, yeniIsSirasi } from '../isDurumu'
import { getProduct } from '../../data/katalog/products.js'
import { PARA_BIRIMI, paraYaz } from '../../data/katalog/para.js'
/* Boş liste çizimi Higgsfield ile üretildi, uygulamanın kendi görsel
   diline (kalın lacivert kontur, düz dolgu, sınırlı palet) referans
   verilerek. Küçültme ve sıkıştırma: tools/gorsel-hazirla.mjs */
import bosIsGorseli from '../../assets/gorseller/servis-bos-is.png'

/* ---------------------------------------------------------------- İşler */

/* ==========================================================================
   İşlerim — ekranın sırası

   ÖNCEKİ SIRA İŞİ EN ALTA İTİYORDU

   Bugün bloğu · Yeni Kayıt düğmesi · üç duyuru kartı · bekleyen işler.
   Servis sabah uygulamayı açtığında ekranda fuar duyurusu ve yeni
   model tanıtımı görüyor, gideceği işi görmek için iki ekran boyu
   aşağı kaydırıyordu. Bir saha uygulamasında ilk ekranda duracak tek
   şey vardır: BUGÜN NEREYE GİDİLECEK.

   YENİ SIRA

     1. Randevular — yedi günlük şerit ve seçili günün randevuları
        (22 Eylül 2026'dan beri; önce yalnız bugünü gösteren lacivert
        "Bugün" kutusuydu). Yedi günde randevu yoksa hiç çizilmiyor.
     2. ACİL duyurular — geri çağırma ve uyarı, tek satırlık şerit
        olarak (tamamı dokununca alttan açılıyor). Bunlar duyuru değil
        iş emri: "bu makineleri arayıp servise çağırın" diyor.
        Hemen altında PAKSAN'ın talep bildirimleri — yalnız okunmamış
        varken (iptal, kapatma, durum değişikliği, onay…). İşin önünde
        duruyorlar, çünkü çoğu doğrudan işi değiştiriyor: iptal edilen
        bir işe gidilmemeli. Müşterinin Connect'ten yaptığı işlem
        (talebe ekleme, "Sorun Devam Ediyor") ayrı başlık altında,
        PAKSAN'ınki gibi görünmesin diye.
        Altında 48 saati geçen işlerin şeridi (25 Eylül 2026): hangi iş
        olduğunu söylüyor ve dokununca o işe götürüyor.
     3. Bekleyen işler — asıl liste.
     4. Öteki duyurular — tek satırın ardında (kampanya, fuar, yeni
        ürün). Okunmayı hak ediyorlar ama işin önünde değil.
     5. Tamamlananlar — tek satırın ardında. Biten iş bir kayıt,
        bir görev değil.

   "Yeni Kayıt" gövdeden çıktı, üst çubuktaki "+" düğmesine taşındı.
   ========================================================================== */
/* "Yeni" / "Devam Eden" ayrımı ve gecikme şeridi kuralı: isDurumu.js. */

/* ==========================================================================
   İş sekmeleri — Yeni · Devam Eden · Tamamlanan (22 Eylül 2026)

   KULLANICININ İSTEĞİ: "Yeni, Devam Eden ve Tamamlanan işler için
   sekmeler oluşturalım… Şu anki ekranda talepleri görmek için çok
   fazla kaydırma yapılmak zorunda kalınıyor."

   Önce üç liste alt alta duruyordu: Yeni, altında Devam Eden, en altta
   kapalı "Tamamlanan işler" başlığı. Devam eden bir işe ulaşmak için
   bütün yeni işlerin üstünden kaydırmak gerekiyordu. Artık üçü aynı
   yerde sekme; seçilen sekmenin işleri listeleniyor, sekmenin yanında
   adedi yazıyor.

   SEKMELER KAYDIRINCA ÜSTE YAPIŞIYOR: uzun listenin ortasındayken başka
   sekmeye geçmek için başa dönmek gerekmiyor.

   İLK SEKME yeni iş varsa Yeni, yoksa Devam Eden. Seçim Uygulama'da
   tutuluyor (bkz. ServisPanel.jsx): iş açılıp geri dönülünce servis
   aynı sekmeye dönüyor.
   ========================================================================== */
const SEKMELER = [
  { id: 'yeni', ad: 'Yeni' },
  { id: 'devam', ad: 'Devam Eden' },
  { id: 'biten', ad: 'Tamamlanan' },
]

const BOS = {
  yeni: { baslik: 'Yeni işiniz yok', alt: 'Size yeni bir iş atandığında burada görünür.' },
  devam: {
    baslik: 'Devam eden işiniz yok',
    alt: `Randevu verdiğiniz, parça beklediğiniz ya da kaydı PAKSAN tarafından incelenen işler burada görünür.`,
  },
  biten: { baslik: 'Tamamlanan işiniz yok', alt: 'Kapanan ve iptal edilen işler burada görünür.' },
}

export function Isler({ oturum, bekleyen, biten, tumTalepler, onAc, onUcretler, sekme: secilen, onSekme, surum }) {
  /* 48 saati geçen işler "Yeni" sekmesinin başında, en eskisi önce
     (isDurumu.js → yeniIsSirasi); şerit de onları aynı sırayla sayıyor. */
  const geciken = useMemo(() => yeniIsSirasi(bekleyen.filter(servisGecikti)), [bekleyen])
  /* "Devam Eden"de sırası servise gelen iş üstte (isDurumu.js →
     devamSirasi, 29 Eylül 2026). */
  const [yeniIsler, devamEden] = useMemo(
    () => [yeniIsSirasi(bekleyen.filter(dokunulmamis)), devamSirasi(bekleyen.filter((t) => !dokunulmamis(t)))],
    [bekleyen],
  )
  const listeler = { yeni: yeniIsler, devam: devamEden, biten }
  const sekme = secilen || (yeniIsler.length || !devamEden.length ? 'yeni' : 'devam')
  const liste = listeler[sekme]
  /* Hiç açık iş yoksa Yeni sekmesinde eski büyük boş ekran: çizim ve
     "Kayıt Aç" yönlendirmesi. */
  const hicAcikYok = !yeniIsler.length && !devamEden.length

  return (
    <>
      <BildirimIzni />

      <Planlayici bekleyen={bekleyen} onAc={onAc} />

      {/* `surum`: yeni acil duyuru ekranda da hemen çıksın. Telefon
          "İşlerim ekranının üst bölümünde okuyabilirsiniz" diyor; liste
          yalnız ekran açılınca okunuyordu (25 Eylül 2026, kullanıcı
          sınaması O3). */}
      <ServisDuyurulari oturum={oturum} acil surum={surum} />

      {/* Bildirim servisin kendi parça siparişine de ait olabilir;
          sipariş İşlerim'in listelerinde yok. Önce yalnız işler
          veriliyordu ve sipariş bildirimine dokunmak hiçbir şey açmıyordu
          (24 Eylül 2026). */}
      <PaksanBildirimleri
        oturum={oturum}
        talepler={tumTalepler || [...bekleyen, ...biten]}
        onAc={onAc}
        onUcretler={onUcretler}
      />

      <GecikmeSeridi
        geciken={geciken}
        onGoster={() => {
          if (geciken.length === 1) return onAc(geciken[0])
          onSekme('yeni')
          requestAnimationFrame(() =>
            document
              .getElementById('is-' + geciken[0].id)
              ?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
          )
        }}
      />

      {/* İKİ DUYURU AÇILIRI ALT ALTA.

          "PAKSAN duyuruları" bekleyen işlerin ALTINDA duruyordu;
          "Okuduğunuz uyarılar" üstünde. İkisi de tek satırlık kapalı
          bir başlık ve ikisi de aynı şeyi barındırıyor — okunmayı
          bekleyen ama işin önüne geçmeyen duyurular. Ekranın iki ayrı
          ucunda durmaları için sebep yoktu; ayrıca aradaki liste
          uzadıkça alttaki hiç görünmüyordu.

          Sıra korunuyor: acil olanlar hâlâ kart hâlinde ve en üstte.
          Kapalı iki satır bekleyen işleri 96 piksel aşağı itmiyor.

          KAPALI DUYURULAR ARTIK LİSTENİN ALTINDA (29 Eylül 2026, görünüm
          önerisi S1; kullanıcının onayı). İşlerim açıldığında iş
          görünmüyordu; kampanya, yeni ürün ve etkinlik satırı işlerin
          önündeydi. Yukarı taşınma gerekçesi ("liste uzayınca alttaki hiç
          görünmüyordu") 24 Eylül'den beri geçerli değil: her duyuru üst
          çubuktaki Bildirimler'de okunmamış sayısıyla duruyor. Acil olanlar
          (güvenlik uyarısı, geri çağırma) yine en üstte, kart hâlinde. */}

      <div className="is-sekmeler" role="tablist" aria-label="İşlerim">
        {SEKMELER.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={sekme === x.id}
            data-is-sekme={x.id}
            className={
              'is-sekme' +
              (sekme === x.id ? ' is-sekme--on' : '') +
              (x.id === 'yeni' && yeniIsler.length ? ' is-sekme--yeni' : '')
            }
            onClick={() => onSekme(x.id)}
          >
            <span className="is-sekme__ad">{x.ad}</span>
            <span className="is-sekme__sayi">{listeler[x.id].length}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" className="is-liste">
        {liste.length > 0 ? (
          liste.map((t) => <TalepKarti key={t.id} talep={t} onAc={() => onAc(t)} />)
        ) : sekme === 'yeni' && hicAcikYok ? (
          <Bos
            gorsel={bosIsGorseli}
            baslik="Bekleyen işiniz yok"
            alt={
              biten.length > 0
                ? 'Tüm işleri tamamladınız. Dükkâna gelen bir müşteri için aşağıdaki Kayıt Aç düğmesine dokunun.'
                : 'Size bir talep geldiğinde burada görünecek. Dükkâna gelen bir müşteri için aşağıdaki Kayıt Aç düğmesine dokunun.'
            }
          />
        ) : (
          <Bos kucuk Icon={sekme === 'biten' ? IconCheckCircle : IconCalendar} baslik={BOS[sekme].baslik} alt={BOS[sekme].alt} />
        )}
      </div>

      <div className="islerim-duyurular">
        <ServisDuyurulari oturum={oturum} surum={surum} />
      </div>
    </>
  )
}

/* İzin şeridi. Karar verilmişse hiç çıkmıyor; verilmediyse ne için
   izin istendiğini yazıyor. "Bildirimlere izin verin" tek başına bir
   şey anlatmıyor — servis neyi kaçırdığını bilmeli. */
function BildirimIzni() {
  const { durum, destekli, iste, BILDIRIM: B } = useBildirimIzni()

  if (!destekli || durum === null) return null
  if (durum === B.VERILDI || durum === B.DESTEKLENMIYOR) return null

  if (durum === B.ENGELLI || durum === B.REDDEDILDI) {
    return (
      <div className="not not--mavi">
        <IconBell size={19} />
        <div>
          <strong>Bildirimler kapalı</strong>
          <p>
            Yeni işlerden ve yola çıkan parçalardan haber alamıyorsunuz.
            Telefonunuzun ayarlarından bu uygulamaya bildirim izni
            verebilirsiniz.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="not not--mavi">
      <IconBell size={19} />
      <div>
        <strong>Yeni iş geldiğinde haberiniz olsun</strong>
        <p>
          Size bir iş düştüğünde, istediğiniz parça yola çıktığında ve
          kaydınız onaylandığında telefonunuza bildirim gelir.
        </p>
        <button
          className="dg dg--ana dg--blok"
          style={{ marginTop: 12 }}
          onClick={iste}
        >
          Bildirimlere İzin Ver
        </button>
      </div>
    </div>
  )
}

/* ==========================================================================
   Randevular — planlayıcı (22 Eylül 2026, baştan)

   KULLANICININ İSTEĞİ: "İşlerim ekranında en üstteki planlayıcı ekran
   iyileştirilebilir mi? İşlerim ekranı profesyonel gözükmüyor pek."

   ÖNCEKİ "BUGÜN" KUTUSU yalnız bugünü gösteriyordu ve bugünkü randevunun
   saatini yazmıyordu: saat sütununda "bugün" kelimesi duruyordu. Yarını
   ancak "yarın 1 randevunuz var" cümlesinden, haftanın gerisini hiç
   göremiyordu. Servis gününü ve haftasını ona bakarak planlıyor.

   ŞİMDİ SAHA SERVİS UYGULAMALARININ DÜZENİ: üstte bugünden başlayan
   yedi günlük şerit — her günün altında randevusu varsa nokta; bir güne
   dokununca altında o günün randevuları SAAT SIRASIYLA. Gün seçmek tek
   dokunuş, gizli etkileşim yok (kaydırma, uzun basma yok).

   GİDİLMEMİŞ RANDEVU bugünün başında, kırmızı: gün geçmiş, iş hâlâ
   açık. Sessizce düşerse unutuluyor.

   48 SAAT UYARISI ARTIK BURADA DEĞİL (25 Eylül 2026, kullanıcı
   sınaması). Kartın dibinde tek satırdı: hangi iş olduğunu söylemiyor,
   dokunulamıyor, yedi günde randevu yoksa kartla birlikte kayboluyordu.
   Şimdi bildirimlerin altında kendi şeridi var (aşağıda GecikmeSeridi).

   SAATİ GİRİLMEMİŞ RANDEVU (25 Eylül 2026, kullanıcı sınaması).
   Servisim randevuda yalnız gün soruyor; gün UTC gece yarısı okunuyor
   ve Türkiye'de "03:00" görünüyordu. Randevu artık saatin girilip
   girilmediğini taşıyor (lib/tarih.js → randevuSaatliMi): saatsiz
   randevunun saat sütununda "Gün içi" yazıyor ve günün sonunda
   sıralanıyor.

   KART YALNIZ PLAN VARKEN ÇIKIYOR. Yedi günde de randevu yoksa kutu
   yok: bir kutu bir şeyin olduğunu söylemek için vardır.
   ========================================================================== */

const GUN = 86400000

function gunBasi(t = Date.now()) {
  return new Date(t).setHours(0, 0, 0, 0)
}

/* Randevu gün ve saat olarak; yıl yazılmıyor. "03.09.2026 20:11"
   satırın üçte birini kaplıyor ve servisin randevusu bu hafta içinde:
   yıl hiçbir soruya cevap vermiyor.

   Tarih elle kuruluyor: `toLocaleString` yıl istenmediğinde Türkçe
   yerelde bile eğik çizgi veriyor ("05/09"), oysa Türkçe tarih
   noktayla yazılıyor. */
const iki = (n) => String(n).padStart(2, '0')
const saatYazi = (t) => new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
const gunAyYazi = (t) => `${iki(new Date(t).getDate())}.${iki(new Date(t).getMonth() + 1)}`
const tarihUzun = (g) =>
  new Date(g).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })

function randevuYazi(plan) {
  if (!plan?.tarih) return plan?.tarihYazi || ''
  return randevuSaatliMi(plan)
    ? `${gunAyYazi(plan.tarih)} · ${saatYazi(plan.tarih)}`
    : gunAyYazi(plan.tarih)
}

function Planlayici({ bekleyen, onAc }) {
  const bugun = gunBasi()
  const gunler = useMemo(() => Array.from({ length: 7 }, (_, i) => bugun + i * GUN), [bugun])

  const randevulu = useMemo(
    () =>
      bekleyen
        .filter((t) => t.plan?.tarih)
        .sort((a, b) => randevuSirasi(a.plan) - randevuSirasi(b.plan)),
    [bekleyen],
  )
  const gecmis = randevulu.filter((t) => gunBasi(t.plan.tarih) < bugun)
  const gununkiler = (g) => randevulu.filter((t) => gunBasi(t.plan.tarih) === g)
  const adet = (g) => gununkiler(g).length + (g === bugun ? gecmis.length : 0)
  const haftada = gunler.reduce((n, g) => n + gununkiler(g).length, 0)

  /* İlk seçili gün: bugünün planı (ya da gidilmemiş randevusu) varsa
     bugün; yoksa randevusu olan ilk gün. */
  const ilkGun = adet(bugun) ? bugun : gunler.find((g) => adet(g)) ?? bugun
  const [secili, setSecili] = useState(null)
  const gun = secili !== null && gunler.includes(secili) ? secili : ilkGun

  if (!haftada && !gecmis.length) return null

  const liste = [...(gun === bugun ? gecmis : []), ...gununkiler(gun)]
  const etiket = gun === bugun ? 'Bugün' : gun === bugun + GUN ? 'Yarın' : ''

  return (
    <section className="plan" aria-label="Randevular">
      <div className="plan__ust">
        <h2 className="plan__baslik">
          <IconCalendar size={19} />
          Randevular
        </h2>
        <span className="plan__toplam">{`7 günde ${haftada} randevu`}</span>
      </div>

      <div className="plan__serit">
        {gunler.map((g) => {
          const n = adet(g)
          const d = new Date(g)
          return (
            <button
              key={g}
              type="button"
              className={
                'plan__gun' +
                (g === gun ? ' plan__gun--secili' : '') +
                (g === bugun ? ' plan__gun--bugun' : '')
              }
              aria-pressed={g === gun}
              aria-label={`${tarihUzun(g)}, ${n} randevu`}
              onClick={() => setSecili(g)}
            >
              <span className="plan__gun-ad">{d.toLocaleDateString('tr-TR', { weekday: 'short' })}</span>
              <span className="plan__gun-no">{d.getDate()}</span>
              <span
                className={
                  'plan__nokta' +
                  (n ? ' plan__nokta--var' : '') +
                  (g === bugun && gecmis.length ? ' plan__nokta--gec' : '')
                }
                aria-hidden="true"
              />
            </button>
          )
        })}
      </div>

      {/* Bugün seçiliyken satır yok (29 Eylül 2026, S1): seçili kutu
          zaten bugün, satır aynı şeyi ikinci kez söylüyor ve listeyi
          aşağı itiyordu. Başka gün seçilince hangi gün olduğunu yazıyor. */}
      {gun !== bugun && (
        <div className="plan__gun-etiket">
          {etiket ? `${etiket} · ` : ''}
          {tarihUzun(gun)}
        </div>
      )}

      {liste.length > 0 ? (
        <div className="plan__liste">
          {liste.map((t) => {
            const gecti = gunBasi(t.plan.tarih) < bugun
            const makine = t.makine ? getProduct(t.makine.productId)?.name : null
            return (
              <button
                key={t.id}
                type="button"
                className={'plan__satir' + (gecti ? ' plan__satir--gec' : '')}
                onClick={() => onAc(t)}
              >
                <span className="plan__saat">
                  {gecti ? (
                    <>
                      <span>{gunAyYazi(t.plan.tarih)}</span>
                      <span className="plan__gecti">Gecikti</span>
                    </>
                  ) : randevuSaatliMi(t.plan) ? (
                    saatYazi(t.plan.tarih)
                  ) : (
                    'Gün içi'
                  )}
                </span>
                <span className="plan__govde">
                  <span className="plan__ad">{t.ad || '—'}</span>
                  <span className="plan__alt">{[makine, t.ilce || t.il].filter(Boolean).join(' · ')}</span>
                </span>
                <IconRight size={18} />
              </button>
            )
          })}
        </div>
      ) : (
        <p className="plan__bos">Bu tarihte randevunuz yok.</p>
      )}
    </section>
  )
}

/* 48 SAATİ GEÇEN İŞ (25 Eylül 2026, kullanıcı sınaması). Uyarı
   planlayıcının dibinde tek satırdı; hangi iş olduğunu söylemiyor,
   dokunulamıyor, randevu yoksa hiç çıkmıyordu. Tek işse o iş açılıyor,
   birden çoksa Yeni sekmesine geçilip ilkine kayılıyor; geciken işler
   o sekmenin başında (isDurumu.js → yeniIsSirasi). Düğme yazılı:
   simge ya da renk tek başına bir şey söylemiyor. Yazı eşiği söylüyor,
   süreyi değil: şerit 48 saati GEÇEN her işte çıkıyor (veri.js →
   gecikmisMi, üst sınır yok); "48 saattir bekliyor" 96 saatlik işte
   yanlıştı ve kartın "48 saati geçti" etiketini tutmuyordu. */
function GecikmeSeridi({ geciken, onGoster }) {
  if (!geciken.length) return null
  const tek = geciken.length === 1
  return (
    <button type="button" className="gecikme-serit" onClick={onGoster}>
      <IconAlert size={18} />
      <span className="gecikme-serit__govde">
        {tek ? `${geciken[0].ad || '—'} · 48 saati geçti` : `${geciken.length} işte süre 48 saati geçti`}
      </span>
      <span className="gecikme-serit__git">
        {tek ? 'İşi Aç' : 'Göster'}
        <IconRight size={15} />
      </span>
    </button>
  )
}

/* ==========================================================================
   PAKSAN'ın talep bildirimleri — okunmamışlar (21 Eylül 2026)

   PAKSAN bir talepte servise dokunan bir işlem yaptığında (iptal,
   kapatma, durum değişikliği, parça, kaydın onayı ya da düzeltilmesi,
   not) kayıt düşüyor; burada okunmamışlar talep talep listeleniyor
   (bkz. talepBildirimleri.js).

   NEDEN İŞ LİSTESİNİN İÇİNDE DEĞİL. İptal ya da kapatılan iş "Tamamlanan"
   bölümüne düşüyor ve o bölüm kapalı duruyor; bildirim kartın üstünde
   olsaydı tam da en önemli haber — "bu işe gitme" — görünmezdi.

   Satıra dokununca bildirim okundu sayılıyor ve talep açılıyor. Hepsini
   birden okundu saymak için ayrı düğme var: servis haberleri telefonun
   bildirim perdesinde zaten okumuş olabilir.

   Bölüm yalnız okunmamış varken çiziliyor; okunmuşlar talebin içinde
   duruyor.

   MÜŞTERİNİN İŞLEMİ AYRI BAŞLIKTA (25 Eylül 2026). Müşteri Connect'ten
   talebe bir şey eklediğinde ya da "Sorun Devam Ediyor" dediğinde işi
   yürüten servise aynı kayıttan bildirim gidiyor (lib/talepEkleme.js).
   "PAKSAN'dan gelen bildirimler" başlığının altında dursaydı müşterinin
   işi PAKSAN'ınki gibi okunurdu. Ayrım yeni bir alandan değil, olayın
   adından (talepBildirimleri.js → musteridenMi). */
function PaksanBildirimleri({ oturum, talepler, onAc, onUcretler }) {
  const [, setSurum] = useState(0)
  const liste = okunmamislar(oturum?.servisId)
  if (!liste.length) return null

  /* ÜCRET VE İNDİRİM BİLDİRİMİ BİR TALEBE BAĞLI DEĞİL (23 Eylül 2026,
     `tur: 'hesap'`, bkz. veri.js → servisHesapBildir). Dokununca Hesap'taki
     "Ücretlendirmeler" bölümü açılıyor; satırında talep numarası yok. */
  const ac = (b) => {
    okunduSay([b.id])
    setSurum((s) => s + 1)
    if (!b.talepId) return onUcretler?.()
    const t = talepler.find((x) => x.id === b.talepId)
    if (t) onAc(t)
  }
  const okunduYap = (kimlikler) => {
    okunduSay(kimlikler)
    setSurum((s) => s + 1)
  }

  return (
    <>
      <BildirimBolumu
        ad={`PAKSAN’dan gelen bildirimler`}
        liste={liste.filter((b) => !musteridenMi(b))}
        talepler={talepler}
        onAc={ac}
        onHepsi={okunduYap}
      />
      <BildirimBolumu
        ad="Müşteriden Gelen Bildirimler"
        liste={liste.filter(musteridenMi)}
        talepler={talepler}
        onAc={ac}
        onHepsi={okunduYap}
      />
    </>
  )
}

function BildirimBolumu({ ad, liste, talepler, onAc: ac, onHepsi }) {
  if (!liste.length) return null
  return (
    <Bolum ad={ad} sayi={liste.length}>
      <div className="talep-haberi">
        {liste.map((b) => {
          const y = bildirimYazisi(b)
          const t = talepler.find((x) => x.id === b.talepId)
          return (
            <button key={b.id} className="talep-haberi__satir" onClick={() => ac(b)}>
              <span className="talep-haberi__nokta" aria-hidden="true" />
              <span className="talep-haberi__govde">
                <span className="talep-haberi__baslik">{y.baslik}</span>
                {y.metin && <span className="talep-haberi__metin">{y.metin}</span>}
                <span className="talep-haberi__alt">
                  {[b.talepNo, t?.servisSiparisi ? null : t?.ad, gecenSure(b.tarih)].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      {liste.length > 1 && (
        <button className="talep-haberi__hepsi" onClick={() => onHepsi(liste.map((b) => b.id))}>
          Tümünü Okundu Say
        </button>
      )}
    </Bolum>
  )
}

/* Fiyat teklifi burada yok: servis makine satmıyor, o talep bu
   uygulamaya hiç düşmüyor. */
const TUR_ADI = { servis: 'Servis', parca: 'Yedek Parça' }

/* ==========================================================================
   İş kartı (22 Eylül 2026, baştan)

   ÖNCEKİ KART Parça sekmesindeki sipariş kartıyla aynı iskeleti
   (Kabuk.jsx → ListeKarti) kullanıyordu. İşlerim'de üç sorunu vardı:

     · Her kartta "Servis" rozeti: listedeki işlerin neredeyse hepsi
       servis işi, rozet her kartta aynı şeyi söyleyen bir gürültüydü.
       Artık tür yalnız istisna olan YEDEK PARÇA işinde yazıyor.
     · Sağda, kartın ortasında havada duran mavi yuvarlak telefon
       düğmesi — yazısız. Servisin kuralı: simge tek başına anlam
       taşımaz (bkz. CLAUDE.md). Artık kartın dibinde, yanında "Ara"
       yazısıyla.
     · İşin durumu (randevu, parça yolda, onayda) zaman bilgisiyle aynı
       satırda sıkışıyordu. Artık dipte kendi etiketinde; zaman adın
       yanında, e-posta uygulamalarındaki gibi.

   KART İKİ KATMAN: üst katman (ad, makine ve yer, arıza) detayı açan
   düğme; alt katman durum etiketi ve "Ara". İç içe düğme değil — `<a>`
   düğmenin içine konamaz.

   GECİKME RENGİ TEK YERDE: kartın sol kenarındaki kırmızı şerit ve
   zamanın rengi (bkz. isDurumu.js). Sekiz kartlık listede on altı
   renkli işaret olmasın diye durum etiketleri sönük tonlarda. */
/* TAMAMLANAN İŞ NASIL BİTTİ (29 Eylül 2026, görünüm önerisi S3).
   Kapanan işte etiket çıkmıyordu: iptal edilen, garanti dışı kapanan ve
   onaylanıp parası yazılan iş listede birbirinin aynısıydı. "Tamamlanan"
   servisin yaptığı işin kanıtı; her kart nasıl bittiğini ve para varsa
   tutarını söylüyor. Veri talebin kendisinden (hakkedis, cozum). */
const KAPANDI = ['kapandi', 'iptal']

function isinSonucu(t) {
  if (t.status === 'iptal') return { ton: 'iptal', yazi: 'İptal edildi' }
  if (t.cozum?.garantiDisi) return { ton: 'bitti', yazi: 'Garanti dışı kapandı' }
  if (t.hakkedis?.durum === 'onaylandi') {
    return { ton: 'odeme', yazi: `Onaylandı · ${paraYaz(t.hakkedis.toplam || 0)} ${PARA_BIRIMI}`, Ikon: IconCheckCircle }
  }
  if (t.hakkedis?.durum === 'reddedildi') return { ton: 'iptal', yazi: 'Kayıt reddedildi' }
  return { ton: 'bitti', yazi: 'Tamamlandı' }
}

function TalepKarti({ talep, onAc }) {
  const paksanda = (talep.sahip || 'paksan') === 'paksan'
  const gecikti = servisGecikti(talep)
  /* ARA DÜĞMESİ ÜLKE KODUYLA ÇEVİRİYOR (25 Eylül 2026, kullanıcı
     sınaması). Numaranın rakamları olduğu gibi bağlantıya
     konuyordu; Connect talebinde "+90 532…" "tel:90532…" oluyor ve
     Türkiye'den yanlış numara çevriliyordu. Bağlantı artık kayıttaki
     ülke ve ham numaradan (lib/tel.js → kayitTelHref): tel:+90532… */
  const tel = kayitTelHref(talep)
  const yer = talep.ilce ? `${talep.ilce} / ${talep.il}` : talep.il || '—'
  /* MAKİNE ADI KARTTA. Servis yola çıkmadan hangi makineye gittiğini
     bilmek zorunda: alet çantası ve yedek parça ona göre hazırlanıyor. */
  const makine = talep.makine ? getProduct(talep.makine.productId)?.name : null
  const tekrar = (talep.tekrar || []).length > 0

  /* ARIZA KARTTA. Kaynak sırası müşterinin ne kadar anlattığına göre:
     belirti seçtiyse onlar, yazdıysa yazdığı, ikisi de yoksa makinenin
     durumu. Tek satırda kesiliyor. */
  const ozet =
    (talep.belirtiler || []).join(', ') ||
    (talep.aciklama || '').trim() ||
    (talep.durum ? makineDurumAdi(talep.durum) : '')

  /* DURUM ETİKETİ. Bekleme randevunun önünde: parça beklerken verilmiş
     bir randevunun anlamı yok, servis o gün gidemez. Randevu yoksa
     PAKSAN'ın devraldığı bilgisi; ikisi birden olmuyor.

     48 SAATİ GEÇEN İŞ yazıyla da belli (25 Eylül 2026, kullanıcı
     sınaması): gecikme yalnız kırmızı şerit ve kırmızı zamanla
     anlaşılıyordu; renk tek başına anlam taşımaz. El sürülmemiş işte
     plan olmadığı için bu dala düşüyor. */
  const durum = KAPANDI.includes(talep.status)
    ? isinSonucu(talep)
    : talep.status === 'parcaBekliyor'
      ? { ton: 'parca', yazi: talep.parcaSevk ? 'Parça yolda' : 'Parça hazırlanıyor' }
      : talep.status === 'onayBekliyor'
        ? { ton: 'onay', yazi: `PAKSAN kaydı inceliyor` }
        : talep.plan
          ? { ton: 'randevu', yazi: randevuYazi(talep.plan), Ikon: IconCalendar }
          : paksanda && talep.devir
            ? { ton: 'onay', yazi: `PAKSAN destek veriyor` }
            : gecikti
              ? { ton: 'gec', yazi: '48 saati geçti', Ikon: IconAlert }
              : null
  const tur = talep.tur !== 'servis' ? TUR_ADI[talep.tur] || talep.tur : null

  return (
    /* Kimlik gecikme şeridinin kaydırması için (GecikmeSeridi). */
    <div id={'is-' + talep.id} className={'iskart' + (gecikti ? ' iskart--gec' : '')}>
      <button type="button" className="iskart__ac is__ac" onClick={onAc}>
        <span className="iskart__bas">
          <span className="iskart__ad">{talep.ad || '—'}</span>
          <span className={'iskart__zaman' + (gecikti ? ' iskart__zaman--gec' : '')}>
            {gecenSure(talep.createdAt || talep.tarih)}
          </span>
        </span>
        <span className="iskart__makine">
          {makine ? `${makine} · ` : ''}
          {yer}
        </span>
        {ozet && <span className="iskart__ozet">{ozet}</span>}
        {/* Kartın tek kırmızı yazısı: bu iş bir kez kapandı, müşteri
            "hâlâ aynı" dedi. Servis hangi işe ikinci kez gittiğini bilmeli. */}
        {tekrar && <span className="iskart__uyari">Sorun devam ediyor</span>}
      </button>

      {(durum || tur || tel) && (
        <div className="iskart__dip">
          <span className="iskart__etiketler">
            {tur && <span className="iskart__etiket iskart__etiket--tur">{tur}</span>}
            {durum && (
              <span className={'iskart__etiket iskart__etiket--' + durum.ton}>
                {durum.Ikon && <durum.Ikon size={14} />}
                {durum.yazi}
              </span>
            )}
          </span>
          {tel && (
            <a className="iskart__ara" href={tel} aria-label={(talep.ad || 'Müşteriyi') + ' ara'}>
              <IconPhone size={17} />
              Ara
            </a>
          )}
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   PAKSAN'ın servislere yönelttiği duyurular

   Ayrı bir bildirim deposu kurulmadı: aynı duyuru deposu okunuyor,
   kime gideceğine duyuruHedef.js karar veriyor. Servise ulaşması için
   duyurunun hedefinde "servislere" ya da "ikisine de" seçilmiş olması
   gerekiyor; hedefsiz duyuru müşteriye gider, servise değil.

   "ANLADIM" ARTIK SİLMİYOR

   Önceden okunan duyuru ekrandan tamamen kayboluyordu ve geri getirmenin
   yolu yoktu. Müşteri uygulamasında duyuru Bildirimler listesinde
   kalıyordu, servis panelinde karşılığı hiç yoktu.

   Geri çağırma yalnızca servise gidiyor (bkz. data/duyuruTurleri.js):
   yanlışlıkla "Anladım" denilen bir geri çağırma, o makineleri servise
   çağıracak tek kişinin elinden çıkmış oluyordu. Okunanlar artık
   "Geçmiş duyurular" başlığının altında duruyor.

   TÜRÜN KENDİ RENGİ VAR. Bütün duyurular aynı zilli kutuda çıkıyordu;
   kampanya ile geri çağırma ayırt edilemiyordu.
   ========================================================================== */

/* Tablodaki `ikon` adının servis panelindeki karşılığı. Bildirimler
   ekranı da okuyor. */
export const DUYURU_IKON = {
  etiket: IconTag,
  makine: IconMachine,
  takvim: IconCalendar,
  uyari: IconAlert,
  geri: IconUndo,
}

/* METİN ÜÇ SATIRDA KESİLİYOR.

   Geri çağırma metni beş paragraf olabiliyor ve kart 250 pikseli
   geçince bekleyen işler ekranın dışına düşüyordu. Servisin sabah
   göreceği ilk şey gideceği iş olmalı; uyarı onun üstünde ama
   önünde değil.

   Başlık hiç kesilmiyor — uyarının ne olduğu ilk satırda yazılı.
   "Tamamını oku" tek dokunuş, metnin tamamı açılıyor. */
function DuyuruKarti({ duyuru, okunmamis, onKapat }) {
  const bilgi = altBilgi(duyuru)
  const Ikon = DUYURU_IKON[bilgi.ikon] || IconBell
  const [tam, setTam] = useState(false)
  const uzun = (duyuru.metin || '').length > 150

  return (
    <div className={'duyuru duyuru--' + bilgi.ton}>
      <div className="duyuru__ust">
        <Ikon size={17} />
        <span className="duyuru__tur">{bilgi.ad}</span>
      </div>
      <strong className="duyuru__baslik">{duyuru.baslik}</strong>
      <p className={'duyuru__metin' + (uzun && !tam ? ' duyuru__metin--kisa' : '')}>
        {duyuru.metin}
      </p>
      {/* İki düğme tek satırda: alt alta dizildiklerinde kart 96
          piksel daha uzuyor ve bekleyen işler ekranın dışına
          düşüyordu. */}
      {(uzun || okunmamis) && (
        <div className="duyuru__dip">
          {uzun && (
            <button className="duyuru__daha" onClick={() => setTam((x) => !x)}>
              {tam ? 'Kısalt' : 'Tamamını oku'}
            </button>
          )}
          {okunmamis && (
            <button className="dg dg--kucuk" onClick={onKapat}>
              Anladım
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ACİL DUYURU ŞERİDİ (22 Eylül 2026, İşlerim baştan tasarlanırken).

   Geri çağırma önce ekranın üstünde açık bir kart olarak duruyordu:
   başlık, üç satır metin, "Tamamını oku" ve "Anladım" — telefonda 430
   piksel. Planlayıcının hemen altında iş listesini ilk ekranın dışına
   itiyordu. Artık tek satırlık bir şerit: türü kendi renginde, başlığı
   iki satıra kadar. Dokununca metnin tamamı ve "Anladım" alttan açılan
   yaprakta (bkz. Kabuk.jsx → Yaprak). Okunana kadar şerit yerinde
   duruyor; iş emri gözden kaybolmuyor. */
function AcilSerit({ duyuru, onAc }) {
  const bilgi = altBilgi(duyuru)
  const Ikon = DUYURU_IKON[bilgi.ikon] || IconBell
  return (
    <button type="button" className={'acil acil--' + bilgi.ton} onClick={onAc}>
      <span className="acil__ikon">
        <Ikon size={18} />
      </span>
      <span className="acil__govde">
        <span className="acil__tur">{bilgi.ad}</span>
        <span className="acil__baslik">{duyuru.baslik}</span>
      </span>
      <span className="acil__oku">
        Tamamını oku
        <IconRight size={15} />
      </span>
    </button>
  )
}

/* ACİL DUYURU İŞ EMRİDİR, DUYURU DEĞİL.

   Geri çağırma ve uyarı, servisten BİR ŞEY YAPMASINI istiyor: "bu
   makineleri kullanan müşterilerinizi arayıp servise çağırın". Fuar
   duyurusuyla ya da yeni model tanıtımıyla aynı yığında durmaları,
   ikisini de okunmaz yapıyordu.

   Acil olanlar bekleyen işlerin ÜSTÜNDE, açık hâlde; ötekiler
   listenin ALTINDA, tek satırın ardında.

   Ayrım duyurunun ÜST TÜRÜNDEN çıkıyor: 'uyari' (güvenlik uyarısı ve
   geri çağırma) acil, 'duyuru' (kampanya, yeni ürün, etkinlik) değil.
   Bu ayrım zaten backoffice formunda da var — orada da izin kuralı
   üst türe bakıyor (bkz. data/duyuruTurleri.js → DUYURU_UST). */

function ServisDuyurulari({ oturum, acil = false, surum }) {
  const [hepsi, setHepsi] = useState([])
  const [gorulen, setGorulen] = useState(() => new Set(load(GORULEN, [])))
  const [acikMi, setAcikMi] = useState(false)
  /* Acil şeritlerden hangisinin yaprağı açık. */
  const [okunan, setOkunan] = useState(null)

  /* `surum` her tazelemede (yeni haber, başka sekmenin yazdığı) listeyi
     yeniden okutuyor. Önce yalnız oturum değişince okunuyordu: telefon
     "İşlerim ekranının üst bölümünde okuyabilirsiniz" derken İşlerim
     açıksa şerit hiç çıkmıyordu (25 Eylül 2026, kullanıcı sınaması O3).
     Görülenler de aynı anda: Bildirimler ekranında "Anladım" denen
     duyuru burada da okunmuş görünsün. */
  useEffect(() => {
    /* Bağlam: servisin hizmet verdiği iller ve baktığı makineler; bölge
       ve makine seçilmiş duyuru bunlara bakıyor (lib/servisAtama.js). */
    const baglam = servisDuyuruBaglami(oturum)
    setHepsi(
      load('duyurular', [])
        .filter((d) => duyuruGecerliMi(d, baglam))
        .sort((a, b) => b.tarih - a.tarih),
    )
    setGorulen(new Set(load(GORULEN, [])))
  }, [oturum, surum])

  function kapat(id) {
    const yeni = [...new Set([...load(GORULEN, []), id])]
    save(GORULEN, yeni)
    setGorulen(new Set(yeni))
  }

  const bolum = hepsi.filter((d) => (altBilgi(d).ust === 'uyari') === acil)
  if (!bolum.length) return null

  /* Acil bölümde okunmamışlar açık duruyor; okunanlar tek satıra
     iniyor. "Anladım" denen bir geri çağırma ekrandan tamamen
     kaybolmuyor — geri getirmenin yolu olmalı. */
  const yeniler = bolum.filter((d) => !gorulen.has(d.id))
  const okunmus = bolum.filter((d) => gorulen.has(d.id))

  if (acil) {
    return (
      <>
        {yeniler.map((d) => (
          <AcilSerit key={d.id} duyuru={d} onAc={() => setOkunan(d)} />
        ))}
        {okunan && (
          <Yaprak
            baslik={okunan.baslik}
            metin={okunan.metin}
            dugme="Anladım"
            onDugme={() => {
              kapat(okunan.id)
              setOkunan(null)
            }}
            onKapat={() => setOkunan(null)}
          />
        )}
        {okunmus.length > 0 && (
          <>
            <button
              className="katla"
              onClick={() => setAcikMi((x) => !x)}
              aria-expanded={acikMi}
            >
              <IconAlert size={18} />
              <span>Uyarılar</span>
              <span className="katla__sayi">{okunmus.length}</span>
              <IconChevron size={18} className={acikMi ? 'katla__ok--acik' : ''} />
            </button>
            {acikMi &&
              okunmus.map((d) => (
                <DuyuruKarti key={d.id} duyuru={d} okunmamis={false} />
              ))}
          </>
        )}
      </>
    )
  }

  return (
    <div className="bolum">
      <button
        className="katla"
        onClick={() => setAcikMi((x) => !x)}
        aria-expanded={acikMi}
      >
        <IconBell size={18} />
        <span>Duyurular</span>
        {yeniler.length > 0 && <span className="katla__sayi">{yeniler.length}</span>}
        <IconChevron size={18} className={acikMi ? 'katla__ok--acik' : ''} />
      </button>
      {acikMi &&
        bolum.map((d) => (
          <DuyuruKarti
            key={d.id}
            duyuru={d}
            okunmamis={!gorulen.has(d.id)}
            onKapat={() => kapat(d.id)}
          />
        ))}
    </div>
  )
}

/* Anahtar bildirim geçmişiyle ortak (talepBildirimleri.js). */
const GORULEN = GORULEN_DUYURU

