import { useMemo, useState } from 'react'
import { cariBakiye, cariHareketleri, servisinTalepleri, siparisHesabi, talepleriGetir } from '../../backoffice/veri'
import { PARA_BIRIMI, PARA_SIMGESI, paraYaz, MARKA, markaEk, getProduct } from '../../marka'
import { gecenSure, tarihYaz } from '../../backoffice/ekranlar/ortak'
import { Bos, ListeKarti, Yaprak } from '../Kabuk'
import { IconAlert, IconCheckCircle, IconRight } from '../../components/Icons'
import { formatSerial } from '../../lib/serial'
import { siparisGonderimi, talebinParcalari, temizParcalar } from '../../lib/servisKaydi'
import bosIsGorseli from '../../assets/gorseller/servis-bos-is.png'
import { UcretOzeti } from './Ucretlerim'

/* ==========================================================================
   Servis paneli — hak ediş

   BU EKRAN "ÜRÜNLER"İN YERİNE GELDİ

   Orada yirmi makinenin kataloğu duruyordu: fiyatı, teslim süresi,
   teknik değerleri. Servis makine satmıyor; o listeye bakmasının bir
   sebebi yoktu ve bakmıyordu da.

   Servisin bu uygulamada en çok merak ettiği şeyin karşılığı bu:
   PAKSAN bana ne kadar borçlu, hangi iş onaylandı, hangisi bekliyor.

   NEDEN ÖNEMLİ — VERİNİN DOĞRULUĞU BURADAN GELİYOR

   Servis ayrı bir şirket ve kendi menfaati dışında bir şey yapmıyor.
   `lib/servisKaydi.js` başındaki kural bu ekranda tamamlanıyor: kayıt
   doldurulmadan para doğmuyor, para bu ekranda görünüyor. Kaydın
   doğru dolmasının bekçisi iyi niyet değil, servisin kendi cebi —
   ama cebini göremezse o kaldıraç da çalışmıyor.

   ÜÇ BÖLÜM

     BAKİYE     PAKSAN'ın bugünkü borcu, tek rakam
     BEKLEYEN   gönderildi, onay bekliyor          ┐ 30 Eylül 2026'dan
     GEÇMİŞ     cari hesap hareketleri, en yeni    ┘ beri iki sekme;
                üstte, onar onar                     hareketler onar onar

   BUGÜNKÜ SINIR: veri tarayıcının kendi hafızasında. Servisin
   telefonundaki bakiye PAKSAN'ın ekranına ulaşmıyor. Defterin biçimi
   doğru; sunucu geldiğinde yalnız veri katmanı değişecek.
   ========================================================================== */

const HAK_SEKMELERI = [
  { id: 'bekleyen', ad: 'Onay Bekleyen' },
  { id: 'hareket', ad: 'Hesap Hareketleri' },
]

/* Hesap Hareketleri'nde bir seferde açılan satır sayısı. */
export const HAREKET_SAYFASI = 10

/**
 * @param {{sekme: string|null, adet: number}} gorunum  seçili sekme ve açılan
 *   hareket sayısı; ServisPanel'de tutuluyor (iş açılıp dönülünce kalsın)
 * @param {Function} onGorunum
 */
export function Hakkedis({ oturum, onAc, surum, onUcretler, gorunum, onGorunum }) {
  /* LİSTE VE BAKİYE AYNI OKUMADAN (25 Eylül 2026, kullanıcı sınaması O3).
     Talepler ve hareketler yalnız ekran açılınca okunuyordu, bakiye her
     çizimde: PAKSAN kaydı onaylayınca bakiye güncelleniyor, "Onay
     Bekleyen" listesi eski kalıyordu. Üçü artık birlikte ve her
     tazelemede (`surum`: yeni haber, başka sekmenin yazdığı) okunuyor. */
  const { talepler, hareketler, bakiye } = useMemo(() => {
    void surum
    return {
      talepler: servisinTalepleri(talepleriGetir(), oturum.servisId),
      hareketler: cariHareketleri(oturum.servisId),
      bakiye: cariBakiye(oturum.servisId),
    }
  }, [oturum.servisId, surum])
  const [secili, setSecili] = useState(null)

  /* Gönderilmiş ama onaylanmamış kayıtlar. Servis "param nerede"
     sorusunun cevabını burada buluyor. */
  const bekleyen = talepler.filter((t) => t.hakkedis?.durum === 'bekliyor')
  const bekleyenToplam = bekleyen.reduce((t, x) => t + (x.hakkedis?.toplam || 0), 0)
  const sekme = gorunum.sekme || (bekleyen.length ? 'bekleyen' : 'hareket')
  const gorunenAdet = Math.max(HAREKET_SAYFASI, gorunum.adet || 0)
  const kalan = hareketler.length - gorunenAdet

  return (
    <>
      {/* TEK RAKAM, EN ÜSTTE. Servis ekranı bunun için açıyor.

          Connect'in "Servisiniz" kartıyla aynı anatomi: soluk turuncu
          simge karesi, küçük etiket, büyük lacivert rakam.

          SİMGE PARA İŞARETİ (21 Eylül 2026, kullanıcının isteği): önce
          onay işareti vardı; kart "onaylandı" değil "ne kadar" diyor.
          İşaret yazı olarak çiziliyor, ikon değil — ölçüsü rakamla aynı
          yazı ailesinden geliyor. Ekran okuyucu tutarın yanındaki
          birimi zaten okuyor; işaret ona kapalı. */}
      <section className="bakiye">
        <div className="bakiye__ikon" aria-hidden="true">
          <span className="bakiye__simge">{PARA_SIMGESI}</span>
        </div>
        <div className="bakiye__govde">
          <div className="bakiye__etiket">Hesabınızdaki Tutar</div>
          <div className="bakiye__tutar">
            {paraYaz(bakiye)}
            <small>{PARA_BIRIMI}</small>
          </div>
          <p className="bakiye__aciklama">
            {bakiye > 0
              ? 'Onaylanan işlerinizin tutarı. Ödeme yapıldıkça buradan düşer.'
              : 'Onaylanmış ve ödenmemiş işiniz görünmüyor.'}
          </p>
        </div>
      </section>

      {/* Hak edişin hesaplandığı ücretler bakiyenin hemen altında; dokununca
          Hesap'taki "Ücretlendirmeler" bölümü açılıyor (bkz. Ucretlerim.jsx). */}
      <UcretOzeti oturum={oturum} surum={surum} onAc={onUcretler} />

      {/* İKİ SEKME (30 Eylül 2026, kullanıcının isteği: "Onay Bekleyen ve
          Hesap Hareketleri kısımlarını, İşlerim ekranındaki … sekmeler gibi
          sekmelere ayırıp göstersek daha iyi olur mu? Şu anki haliyle çok
          kaydırmak gerekiyor"; seçeneği "Sekmeler + Daha Fazla Göster").
          İki liste alt alta duruyordu; hareketlere ulaşmak için bütün
          bekleyen işlerin üstünden kaydırmak gerekiyordu. Sekmeler
          İşlerim'inkiyle aynı görünüşte (`.is-sekmeler`, kaydırınca üste
          yapışıyor), yanlarında adet. İlk sekme bekleyen iş varsa Onay
          Bekleyen, yoksa Hesap Hareketleri. Seçim ve açılan hareket
          sayısı ServisPanel'de tutuluyor: iş açılıp geri dönülünce servis
          aynı sekmeye ve aynı yere dönüyor. */}
      <div className="is-sekmeler" role="tablist" aria-label="Hak Ediş">
        {HAK_SEKMELERI.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={sekme === x.id}
            data-hakedis-sekme={x.id}
            className={'is-sekme' + (sekme === x.id ? ' is-sekme--on' : '')}
            onClick={() => onGorunum({ ...gorunum, sekme: x.id })}
          >
            <span className="is-sekme__ad">{x.ad}</span>
            <span className="is-sekme__sayi">{x.id === 'bekleyen' ? bekleyen.length : hareketler.length}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" className="is-liste" data-hakedis-liste={sekme}>
        {sekme === 'bekleyen' ? (
          bekleyen.length > 0 ? (
            <>
              {/* ÖNCE PARA (29 Eylül 2026, görünüm önerisi S3). Bekleyen
                  toplam gri bir yardım satırıydı; kartlarda en belirgin yazı
                  mavi ve kalın "2 gün önce"ydi, tutar ince griydi. Servis bu
                  ekranı "ne kadar alacağım" diye açıyor: toplam kalın, kartta
                  tutar büyük, zaman küçük. Her kartta aynı olan "Servis"
                  rozeti kalktı. */}
              <p className="ipucu bekleyen-toplam">
                <strong>
                  Toplam {paraYaz(bekleyenToplam)} {PARA_BIRIMI}
                </strong>{' '}
                · {markaEk('in')} servis personeli inceliyor.
              </p>
              {bekleyen.map((t) => (
                <ListeKarti
                  key={t.id}
                  ad={t.ad || '—'}
                  tur="servis"
                  tutar
                  kunye={t.no}
                  sol={gecenSure(t.servisKaydi?.tarih || t.createdAt)}
                  sag={`${paraYaz(t.hakkedis.toplam)} ${PARA_BIRIMI}`}
                  onAc={() => onAc(t)}
                />
              ))}
            </>
          ) : (
            <Bos
              kucuk
              Icon={IconCheckCircle}
              baslik="Onay bekleyen işiniz yok"
              alt={`Gönderdiğiniz servis kayıtları, ${MARKA} tarafından onaylanana kadar burada görünür.`}
            />
          )
        ) : hareketler.length === 0 ? (
          <Bos
            gorsel={bosIsGorseli}
            baslik="Henüz ödemeniz yok"
            /* "kapsam" servis ekranında yasak kelime; metin Codex'ten
               (15 Eylül 2026). */
            alt="Garanti için tamamladığınız işler onaylandığında burada görünür."
          />
        ) : (
          <>
            {hareketler.slice(0, gorunenAdet).map((h) => (
              <button
                key={h.id}
                type="button"
                className="hareket"
                data-hareket={h.id}
                onClick={() => setSecili(h)}
              >
                {/* Satırın başında müşterinin adı (29 Eylül 2026, S3).
                    "SRV2609296604 · servis ödemesi" yazıyordu; servis işi
                    numarasından değil müşterisinden hatırlıyor. Numara ve
                    hareketin cinsi alt satırda duruyor. Kendi siparişinde
                    ve ödemede müşteri yok; satır eskisi gibi. */}
                <div className="hareket__sol">
                  <div className="hareket__ad">{hareketinMusterisi(h, talepler) || hareketAdi(h, talepler)}</div>
                  <div className="hareket__zaman">
                    {hareketinMusterisi(h, talepler)
                      ? `${hareketAdi(h, talepler)} · ${gecenSure(h.tarih)}`
                      : gecenSure(h.tarih)}
                  </div>
                </div>
                {/* Alacak artı, ödeme eksi. İşaret rakamın önünde ve renk
                    tek başına anlam taşımıyor. */}
                <span
                  className={
                    'hareket__tutar' +
                    (h.tur === 'alacak' ? ' hareket__tutar--alacak' : '')
                  }
                >
                  {h.tur === 'alacak' ? '+' : '−'}
                  {paraYaz(h.tutar)} {PARA_BIRIMI}
                </span>
                <span className="hareket__ok" aria-hidden="true">
                  <IconRight size={18} />
                </span>
              </button>
            ))}
            {/* ONAR ONAR (aynı gün, kullanıcının seçimi). Sayfa numarası
                yerine alttan açılan düğme: telefonda numaraya basmak zor ve
                sayfa değişince servis nerede kaldığını kaybediyor. Düğme
                kalan hareket onun altındaysa kalan kadarını söylüyor. */}
            {kalan > 0 && (
              <button
                type="button"
                className="dg dg--blok hareket-daha"
                data-eylem="daha-fazla"
                onClick={() => onGorunum({ ...gorunum, adet: gorunenAdet + HAREKET_SAYFASI })}
              >
                {Math.min(HAREKET_SAYFASI, kalan)} Hareket Daha Göster
              </button>
            )}
          </>
        )}
      </div>

      {/* ÖDEMENİN NASIL YAPILDIĞI YAZIYOR.

          Bakiye ekranı olan her yerde ilk sorulan soru bu. Cevabı
          yoksa servis telefon ediyor; telefon eden servis, ekranın
          işe yaramadığı anlamına geliyor. */}
      {secili && (
        <HareketAyrinti
          hareket={secili}
          talepler={talepler}
          onKapat={() => setSecili(null)}
          onAc={(t) => {
            setSecili(null)
            onAc(t)
          }}
        />
      )}

      <p className="ipucu">
        Ödemeler {MARKA} muhasebesi tarafından hesabınıza yapılır.
        Hesabınızla ilgili bir sorunuz varsa servis personeline yazın.
      </p>
    </>
  )
}

/* ==========================================================================
   Hesap hareketinin özeti

   Satırda yalnız "SRV2609106112 · servis ödemesi" yazıyordu; servis
   numaradan hangi iş olduğunu çıkaramıyordu (kullanıcı, 10 Eylül 2026).
   Dokununca işin kimin için, hangi makinede, ne için yapıldığı açılıyor;
   düğme işin kendisini açıyor. Parça siparişinde parçalar ve ödeme
   biçimi, ödeme satırında tutar ve tarih görünüyor.
   ========================================================================== */
/* Siparişin parça satırları lib/servisKaydi.js → talebinParcalari'den
   okunuyor; kaydın hangi biçimlerde durduğu orada yazılı.

   Burada bir dönem parça kodu ADDAN TÜRETİLİYORDU: siparişin adlar
   listesi uydurma fiyat tablosunda aranıyor, bulunursa kodu
   yazılıyordu. Tablo kalkınca o yol tamamen kapandı, ama kapanmasa
   da işe yaramıyordu: servis parçayı PAKSAN'ın kendi kataloğundan
   seçiyor (bkz. ParcaSec.jsx) ve oradaki adlar tabloda geçmiyordu —
   lookup her gerçek parçada boş dönüyordu. Ekranda kodun yerinde
   hiçbir şey olmaması, kodu olmayan bir parça gibi görünüyordu. */

/* Hareketin işi: talep kimliğiyle, kimliği olmayan eski harekette
   numarayla (numara tekil değil). */
/** Hareketin ait olduğu müşteri işinin müşterisi; sipariş ve ödemede yok. */
function hareketinMusterisi(h, talepler) {
  const t = hareketinTalebi(h, talepler)
  return t && !t.servisSiparisi && t.ad ? t.ad : null
}

function hareketinTalebi(h, talepler) {
  if (h.talepId) {
    const t = talepler.find((x) => x.id === h.talepId)
    if (t) return t
  }
  return h.talepNo ? talepler.find((x) => x.no === h.talepNo) || null : null
}

/* Siparişin parçaları birden fazla gönderimde gittiyse ya da gidecekse
   hareket hangi gönderimin karşılığı olduğunu söylüyor. */
function gonderimiBolunmus(t) {
  const g = siparisGonderimi(t)
  /* Kalemi iptal edilmiş siparişte de: hareketin parçaları siparişin
     bütün parçaları değil (veri.js → kalanParcalariIptalEt). */
  return (t.gonderimler?.length || 0) > 1 || Boolean(g?.kalan.length) || Boolean(g?.iptal.length)
}

/* Satırdaki ad. EKSİK GÖNDERİMDE bir sipariş iki harekete bölünüyor;
   ikisi de "YPR… · parça siparişi" yazıp farklı tutar gösterince servis
   hangisinin ne olduğunu çıkaramıyordu (kullanıcı, 24 Eylül 2026). */
function hareketAdi(h, talepler) {
  const t = h.gonderimNo ? hareketinTalebi(h, talepler) : null
  return t?.servisSiparisi && gonderimiBolunmus(t) ? `${h.aciklama} · ${h.gonderimNo}. gönderim` : h.aciklama
}

function HareketAyrinti({ hareket: h, talepler, onKapat, onAc }) {
  const t = hareketinTalebi(h, talepler)
  const tutar = `${h.tur === 'alacak' ? '+' : '−'}${paraYaz(h.tutar)} ${PARA_BIRIMI}`
  const son = [
    { ad: 'Tutar', deger: tutar },
    { ad: 'Tarih', deger: tarihYaz(h.tarih) },
  ]

  if (!t) {
    return <Yaprak baslik="Hesap Hareketi" metin={h.aciklama} kalemler={son} onKapat={onKapat} />
  }

  /* SİPARİŞİN TUTARI VE BU HAREKETİN PAYI (24 Eylül 2026). Yaprak
     yalnız hareketin tutarını gösteriyordu. Sipariş listesi başka rakam
     (KDV hariç), hak ediş başka rakam (KDV dâhil ya da yalnız gönderilen
     parçalar) gösterince servis bakiyesinden yanlış para düştüğünü
     düşünüyordu. Şimdi siparişin KDV dâhil tutarı, bu hareketin hangi
     gönderim olduğu ve o gönderimin parçaları, kalan varsa ne zaman
     düşüleceği yazıyor (bkz. veri.js → siparisHesabi). */
  if (t.servisSiparisi) {
    const hesap = siparisHesabi(t)
    const tum = talebinParcalari(t)
    const bolunmus = gonderimiBolunmus(t)
    const gonderim = bolunmus && h.gonderimNo ? t.gonderimler?.find((g) => g.no === h.gonderimNo) : null
    const parcalar = gonderim ? tum.filter((_, i) => gonderim.satirlar?.includes(i)) : tum
    const para = (n) => `${paraYaz(n)} ${PARA_BIRIMI}`
    return (
      <Yaprak
        baslik="Parça Siparişi"
        kalemler={[
          { ad: 'Sipariş no.', deger: t.no },
          { ad: 'Genel toplam', deger: `${para(hesap.toplam)} (KDV dâhil)` },
          /* Kalemi iptal edilmiş siparişte ödenecek tutar iptal edilen
             pay kadar az (veri.js → siparisHesabi → net). */
          ...(hesap.iptalEdilen > 0
            ? [
                { ad: 'İptal edilen parçalar', deger: `−${para(hesap.iptalEdilen)}` },
                { ad: 'Siparişin yeni tutarı', deger: para(hesap.net) },
              ]
            : []),
          {
            ad: 'Ödeme',
            deger:
              t.odeme !== 'bakiye'
                ? `${MARKA} tarafından faturalandırıldı`
                : h.tur === 'alacak'
                  ? 'Bakiyenizden ödenmişti'
                  : 'Bakiyenizden düşüldü',
          },
          ...(h.tur === 'alacak'
            ? [{ ad: 'İşlem', deger: 'Sipariş iptal edildi, tutar bakiyenize geri eklendi' }]
            : gonderim
              ? [{ ad: 'Gönderim', deger: `${gonderim.no}. gönderim` }]
              : []),
          ...son,
          ...(t.odeme === 'bakiye' && hesap.bekleyen > 0
            ? [{ ad: 'Kalan parçalar gönderilince düşülecek', deger: para(hesap.bekleyen) }]
            : []),
        ]}
        parcalar={parcalar}
        parcaBaslik={gonderim ? 'Bu gönderimdeki parçalar' : undefined}
        dugme="Siparişi Aç"
        onDugme={() => onAc(t)}
        onKapat={onKapat}
      />
    )
  }

  const urun = t.makine?.productId ? getProduct(t.makine.productId) : null
  const makine = [urun?.name, t.makine?.serial && formatSerial(t.makine.serial)]
    .filter(Boolean)
    .join(' · ')

  /* İŞİN PARÇALARI GÖRSELİYLE (21 Eylül 2026, kullanıcının isteği).
     Garanti işinde değiştirilen parça servis kaydında duruyor; özet onu
     hiç göstermiyordu. Etiket TalepDetay'daki servis kaydı özetiyle
     aynı: hak edişe düşen iş bitmiş iş, parça değiştirildi. */
  const parcalar = temizParcalar(t.servisKaydi?.parcalar)

  return (
    <Yaprak
      baslik="Servis İşi"
      parcalar={parcalar}
      parcaBaslik="Değiştirilen parça"
      kalemler={[
        { ad: 'Talep no.', deger: t.no },
        { ad: 'Müşteri', deger: t.ad || '—' },
        { ad: 'Yer', deger: [t.ilce, t.il].filter(Boolean).join(' / ') || '—' },
        { ad: 'Makine', deger: makine || '—' },
        { ad: 'Yapılan iş', deger: t.servisKaydi?.yapilanIs || t.cozum?.yapilanIs || '—' },
        ...(t.hakkedis?.kalemler || []).map((k) => ({
          ad: k.ad,
          deger: `${paraYaz(k.tutar)} ${PARA_BIRIMI}`,
        })),
        ...son,
      ]}
      dugme="İşi Aç"
      onDugme={() => onAc(t)}
      onKapat={onKapat}
    />
  )
}
