import { useMemo, useState } from 'react'
import { cariBakiye, cariHareketleri, servisinTalepleri, siparisHesabi, talepleriGetir } from '../../backoffice/veri'
import { PARA_BIRIMI, PARA_SIMGESI, paraYaz, MARKA, markaEk, getProduct } from '../../marka'
import { gecenSure, tarihYaz } from '../../backoffice/ekranlar/ortak'
import { Bolum, Bos, ListeKarti, Yaprak } from '../Kabuk'
import { IconAlert, IconRight } from '../../components/Icons'
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
     BEKLEYEN   gönderildi, onay bekliyor
     GEÇMİŞ     cari hesap hareketleri, en yeni üstte

   BUGÜNKÜ SINIR: veri tarayıcının kendi hafızasında. Servisin
   telefonundaki bakiye PAKSAN'ın ekranına ulaşmıyor. Defterin biçimi
   doğru; sunucu geldiğinde yalnız veri katmanı değişecek.
   ========================================================================== */

export function Hakkedis({ oturum, onAc, surum, onUcretler }) {
  const talepler = useMemo(
    () => servisinTalepleri(talepleriGetir(), oturum.servisId),
    [oturum.servisId],
  )
  const hareketler = useMemo(
    () => cariHareketleri(oturum.servisId),
    [oturum.servisId],
  )
  const bakiye = cariBakiye(oturum.servisId)
  const [secili, setSecili] = useState(null)

  /* Gönderilmiş ama onaylanmamış kayıtlar. Servis "param nerede"
     sorusunun cevabını burada buluyor. */
  const bekleyen = talepler.filter((t) => t.hakkedis?.durum === 'bekliyor')
  const bekleyenToplam = bekleyen.reduce((t, x) => t + (x.hakkedis?.toplam || 0), 0)

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

      {bekleyen.length > 0 && (
        <Bolum ad="Onay Bekleyen" sayi={bekleyen.length}>
          <p className="ipucu">
            Toplam {paraYaz(bekleyenToplam)} {PARA_BIRIMI} · {markaEk('in')} servis
            personeli inceliyor.
          </p>
          {bekleyen.map((t) => (
            <ListeKarti
              key={t.id}
              ad={t.ad || '—'}
              tur="servis"
              turAdi="Servis"
              kunye={t.no}
              sol={gecenSure(t.servisKaydi?.tarih || t.createdAt)}
              sag={`${paraYaz(t.hakkedis.toplam)} ${PARA_BIRIMI}`}
              onAc={() => onAc(t)}
            />
          ))}
        </Bolum>
      )}

      {hareketler.length === 0 ? (
        <Bos
          gorsel={bosIsGorseli}
          baslik="Henüz ödemeniz yok"
          /* "kapsam" servis ekranında yasak kelime; metin Codex'ten
             (15 Eylül 2026). */
          alt="Garanti için tamamladığınız işler onaylandığında burada görünür."
          kucuk={bekleyen.length > 0}
        />
      ) : (
        <Bolum ad="Hesap Hareketleri" sayi={hareketler.length}>
          {hareketler.map((h) => (
            <button
              key={h.id}
              type="button"
              className="hareket"
              onClick={() => setSecili(h)}
            >
              <div className="hareket__sol">
                <div className="hareket__ad">{hareketAdi(h, talepler)}</div>
                <div className="hareket__zaman">{gecenSure(h.tarih)}</div>
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
        </Bolum>
      )}

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
          { ad: 'Siparişin tutarı', deger: `${para(hesap.toplam)} (KDV dâhil)` },
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
