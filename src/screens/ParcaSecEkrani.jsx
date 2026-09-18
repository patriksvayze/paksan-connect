import { useLayoutEffect, useRef, useState } from 'react'
import { TopBar } from '../components/Chrome'
import { PARA_BIRIMI, paraYaz } from '../marka'
import {
  destekGrubununGruplari, gorselAdresi, grubunParcalari, parcaAra,
} from '../lib/parcaKatalogu'
import { useGeriYakala } from '../lib/geriYakala'
import { useDil } from '../i18n'
import { IconCheck, IconClose, IconPlus, IconRight, IconSearch } from '../components/Icons'

/* ==========================================================================
   Yedek parça talebi — parça seçme ekranı

   ÖNCE KATALOG FORMUN İÇİNDEYDİ. Talep formunda bölüm listesi, arama
   kutusu ve parça satırları alt alta açılıyordu; seçilen parçalar ve
   adetleri de onların altında kalıyordu. Çiftçi bir bölüme girip
   parça işaretledikten sonra ne seçtiğini görmek için sayfanın dibine
   kaydırmak zorundaydı ve form, parça listesiyle birlikte ekranlarca
   uzuyordu.

   ŞİMDİ SERVİSİM'DEKİ GİBİ (bkz. src/servis/ekranlar/ParcaSec.jsx):
   formda yalnız seçilenler duruyor, "Parça Ekle" bu ekranı açıyor.
   Seçim burada yapılıyor, "Tamam" ile forma aktarılıyor. İki uygulama
   aynı işi aynı biçimde yapıyor; servis elemanı ile çiftçi aynı parçayı
   aynı yoldan buluyor.

   ADRES DEĞİŞMİYOR, BU BİR ALT GÖRÜNÜM. Sayfa geçişi adresi anahtar
   olarak kullanıyor (bkz. components/Gecis.jsx); ayrı bir adrese
   gidilseydi talep formu sökülür, doldurulan her şey kaybolurdu.
   Ekran, ödeme adımı gibi talep formunun içinden çiziliyor.

   TASLAK ÜZERİNDE ÇALIŞIYOR. Açılışta formdaki seçimin kopyası
   alınıyor (adetler ve sıra korunuyor). "Tamam" taslağı forma
   yazıyor; geri ile çıkılırsa taslak atılıyor ve form eski hâlinde
   kalıyor — Servisim ile aynı.

   KATALOG BURADA İNMİYOR. Form indirmiş olmalı; bu ekran ancak liste
   hazırken açılıyor. Servisim'deki ekran listeyi kendisi indiriyordu
   ve liste gelmeden "Seçimi Bitir"e basılırsa seçimi siliyordu. Burada
   o yol yok: taslak katalogdan süzülmüyor, kodlar olduğu gibi dönüyor.
   ========================================================================== */

export function ParcaSecEkrani({ katalog, grup, secili, onTamam, onVazgec }) {
  const { t } = useDil()
  const [taslak, setTaslak] = useState(() => new Map(secili))
  const [montaj, setMontaj] = useState(null)
  const [arama, setArama] = useState('')
  /* Bölüm listesinde nerede kalındığı. Bir bölüme girip dönen çiftçi
     listenin başına atılmasın, bıraktığı yerden devam etsin. */
  const listeKonumu = useRef(0)

  /* Makinenin kendi alt montajları. PAKSAN'ın fiyat listesinde makine
     alanı yok; köprü grup adlarından kuruluyor (bkz. marka/katalog/
     parcaGruplari.js). `ayriListeVar` false dönen makinelerde listede o
     makineye ait hiç parça yok — kataloğun tamamı gösteriliyor ve bu
     ekranda yazıyla söyleniyor. */
  const { ayriListeVar, gruplar: montajlar } = destekGrubununGruplari(katalog, grup)

  /* Arama kestirme, asıl yol alt montaj. Kodu bilen çiftçinin 35 grubu
     gezmesi gereksiz; arama iki harften sonra çalışıyor ve Türkçe
     küçültmeyi biliyor (bkz. lib/parcaKatalogu.js → parcaAra). */
  const aramaVar = arama.trim().length >= 2
  const listelenen = aramaVar
    ? parcaAra(katalog, arama)
    : montaj
      ? grubunParcalari(katalog, montaj.id)
      : []

  /* Bölüme girince sayfanın başına, bölümden çıkınca bırakılan yere.
     Çizimden önce çalışıyor ki ekran bir an eski konumda görünmesin.
     İlk açılışta da başa gidiyor: form aşağıya kaydırılmış olabilir. */
  useLayoutEffect(() => {
    window.scrollTo(0, montaj ? 0 : listeKonumu.current)
  }, [montaj])

  function montajAc(g) {
    listeKonumu.current = window.scrollY
    setMontaj(g)
  }

  /* Bir dokunuş parçayı 1 adetle ekliyor, ikinci dokunuş çıkarıyor.
     Adet formda ayarlanıyor; önceden seçilmiş parçanın adedi, parça
     burada çıkarılmadıkça olduğu gibi kalıyor. */
  function cevir(kod) {
    setTaslak((eski) => {
      const yeni = new Map(eski)
      if (yeni.has(kod)) yeni.delete(kod)
      else yeni.set(kod, 1)
      return yeni
    })
  }

  /* GERİ KADEME KADEME. Önce arama temizleniyor, sonra açık bölüm
     kapanıyor, en sonda ekran kapanıyor. Telefonda "geri" tek düğme;
     iki kademeyi birden atlarsa seçim kayboldu sanılıyor. Aynı iş
     hem üst çubuktaki düğmede hem Android'in geri hareketinde. */
  function geri() {
    if (arama) return setArama('')
    if (montaj) return setMontaj(null)
    onVazgec()
  }
  useGeriYakala(true, geri)

  const sayiMetni =
    taslak.size === 0
      ? t('parcaSec.secilenYok')
      : taslak.size === 1
        ? t('parcaSec.secilenBir')
        : t('parcaSec.secilenSayi', { n: taslak.size })

  return (
    <div className="app">
      <TopBar
        title={montaj && !aramaVar ? montaj.ad : t('parcaSec.baslik')}
        back={geri}
      />

      <div className="screen screen--nonav wrap parca-sec" style={{ paddingTop: 16 }}>
        <div className="stack" style={{ gap: 12 }}>
          {/* Bu makinenin PAKSAN fiyat listesinde kendi parçası yoksa
              kataloğun tamamı açılıyor ve bu ekranda söyleniyor —
              sessizce 538 parça göstermek, çiftçiye kendi makinesinin
              listesine baktığını sandırırdı. Bölüm listesinde duruyor;
              bölümün içinde tekrar etmesi yer kaplıyor. */}
          {!ayriListeVar && !montaj && !aramaVar && (
            <div className="uyari-kart">{t('parcaSec.tumKatalog')}</div>
          )}

          {/* `label` değil `div`: içindeki temizleme düğmesi etikete
              bağlı olsaydı dokunuş hem düğmeye hem kutuya gidiyordu.
              Kutunun adı `aria-label` ile veriliyor. */}
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <span style={{ color: 'var(--ink-3)', flex: 'none' }}>
              <IconSearch size={19} />
            </span>
            <input
              className="input"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder={t('parcaSec.ara')}
              aria-label={t('parcaSec.ara')}
            />
            {arama && (
              <button
                className="adet-kutu__dg"
                style={{ flex: 'none' }}
                onClick={() => setArama('')}
                aria-label={t('parcaSec.aramaTemizle')}
              >
                <IconClose size={18} />
              </button>
            )}
          </div>

          {/* Alt montaj listesi — fiyat listesindeki sırayla. Sıra basılı
              listenin sırası; çiftçi kâğıttakiyle aynı yerde arıyor. */}
          {!montaj && !aramaVar && (
            <>
              <span className="field__hint" style={{ marginTop: 0 }}>
                {t('parcaSec.montajSec')}
              </span>
              <div className="stack" style={{ gap: 8 }}>
                {montajlar.map((g) => (
                  <button key={g.id} className="listitem" onClick={() => montajAc(g)}>
                    <span className="listitem__body">
                      <span className="listitem__title">{g.ad}</span>
                      <span className="listitem__sub">
                        {t('parcaSec.grupAdet', { n: g.adet })}
                      </span>
                    </span>
                    <IconRight size={20} className="listitem__chev" />
                  </button>
                ))}
              </div>
            </>
          )}

          {(montaj || aramaVar) && (
            <div className="stack" style={{ gap: 8 }}>
              {aramaVar ? (
                <span className="field__hint" style={{ marginTop: 0 }}>
                  {t('parcaSec.sonuc', { sorgu: arama.trim(), n: listelenen.length })}
                </span>
              ) : (
                /* Görünen geri yolu. Üst çubuktaki "Geri" de aynı işi
                   yapıyor; ama ekranda gizli etkileşim yok, bölümden
                   çıkmanın yolu yazıyla da duruyor. */
                <button
                  className="secenek secenek--daha"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => setMontaj(null)}
                >
                  {t('parcaSec.montajaDon')}
                </button>
              )}

              {listelenen.length === 0 ? (
                <span className="field__hint">{t('parcaSec.sonucYok')}</span>
              ) : (
                listelenen.map((p) => (
                  <ParcaSatiri
                    key={p.kod}
                    parca={p}
                    secili={taslak.has(p.kod)}
                    onSec={() => cevir(p.kod)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* DİPTE SABİT ÇUBUK. Kaç parça seçildiği ve "Tamam" her an elde:
          uzun bir bölüm listesinin ortasında seçim bitince yukarı ya da
          aşağı kaydırıp düğme aramak gerekmiyor. Alt menü bu ekranda
          yok; olsaydı çubukla aynı yere düşerdi.

          Çubuk `.screen` dışında: sayfa geçişi `.screen`e `transform`
          veriyor ve içindeki `position: fixed` öğeler kayıyor
          (bkz. styles.css → Sayfa geçişi). */}
      <div className="parca-dip">
        <span className="parca-dip__sayi" aria-live="polite">
          {sayiMetni}
        </span>
        <button className="btn btn--primary parca-dip__tamam" onClick={() => onTamam(taslak)}>
          <IconCheck size={20} /> {t('parcaSec.tamam')}
        </button>
      </div>
    </div>
  )
}

/* ==========================================================================
   Katalogdaki bir parçanın satırı

   Düzen fiyat listesinin aynısı: solda parçanın resmi, yanında kodu,
   adı ve fiyatı. Çiftçi kâğıttaki listeye alışkın; ekranda başka bir
   sıra kurmak aynı parçayı iki biçimde ezberlemesini istemek olurdu.

   İKON TEK BAŞINA ANLAM TAŞIMIYOR: resmin yanında kod ve ad her zaman
   yazıyor. Resmi olmayan parçada kutu boş kalmıyor, yerine yazı
   giriyor.

   SEÇİLİ OLAN YALNIZ RENKLE AYRILMIYOR: sağdaki onay işareti ve
   `aria-pressed` de söylüyor. Güneşte ve renk körlüğünde renk tek
   başına yetmiyor.
   ========================================================================== */
function ParcaSatiri({ parca, secili, onSec }) {
  const { t } = useDil()
  const adres = gorselAdresi(parca.gorsel)

  return (
    <button
      className="listitem"
      onClick={onSec}
      aria-pressed={secili}
      style={
        secili
          ? { outline: '2px solid var(--pk-blue-yazi)', outlineOffset: -2 }
          : undefined
      }
    >
      <span
        className="listitem__icon"
        style={{ background: 'var(--surface-3)', overflow: 'hidden' }}
      >
        {adres ? (
          /* Listede otuz satır olabiliyor; hepsini birden indirmek
             tarlada zayıf şebekede ekranı kilitler. */
          <img
            src={adres}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <span className="small muted" style={{ fontSize: 10, textAlign: 'center' }}>
            {t('parcaSec.gorselYok')}
          </span>
        )}
      </span>

      <span className="listitem__body">
        <span className="listitem__sub serial-mono" style={{ marginTop: 0 }}>
          {parca.kod}
        </span>
        <span className="listitem__title" style={{ fontSize: 15 }}>
          {parca.ad}
        </span>
        <span className="listitem__sub" style={{ fontWeight: 700 }}>
          {paraYaz(parca.fiyat)} {PARA_BIRIMI}
        </span>
      </span>

      <span style={{ flex: 'none', color: secili ? 'var(--pk-green-yazi)' : 'var(--ink-3)' }}>
        {secili ? <IconCheck size={20} /> : <IconPlus size={20} />}
      </span>
    </button>
  )
}
