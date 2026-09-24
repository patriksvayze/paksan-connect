import { useLayoutEffect, useRef, useState } from 'react'
import { TopBar } from '../components/Chrome'
import { ParcaKarti } from '../components/ParcaKarti'
import {
  destekGrubununGruplari, grubunParcalari, parcaAra,
} from '../lib/parcaKatalogu'
import { useGeriYakala } from '../lib/geriYakala'
import { useDil } from '../i18n'
import { IconCheck, IconClose, IconRight, IconSearch } from '../components/Icons'

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

   GÖRÜNÜM DE SERVİSİM'İN AYNISI (24 Eylül 2026, kullanıcının isteği).
   Akış aynıydı ama parçalar 44 piksellik resimli liste satırlarıyla,
   bölümler de genel liste satırıyla çiziliyordu. Kullanıcı: "Servisim'deki
   sistem daha iyi, daha büyük görseller var, direkt aynısını koy."
   Artık bölümler Servisim'in montaj satırı (`.montaj`), parçalar
   Servisim'in iki sütunlu büyük görselli kartı (`ParcaKarti`).

   KART ORTAK KLASÖRDEN GELİYOR, SERVİS KLASÖRÜNDEN DEĞİL. Kart
   `src/components/ParcaKarti.jsx` içinde; Servisim de onu kullanıyor.
   Müşteri APK'sına servis kodu girmemeli (`npm run dogrula` 4. kontrol);
   bu yüzden kart `src/servis/` altından import edilmiyor. Görünümü
   `styles.css` içinde, Connect'in kendi renk değişkenleriyle yeniden
   yazıldı (iki CSS kökü renk paylaşmıyor, bkz. CLAUDE.md → CSS).

   Müşteri liste fiyatını görüyor; servise tanınan indirim bu ekranda
   yok, o PAKSAN ile servis arasında.
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
              listenin sırası; çiftçi kâğıttakiyle aynı yerde arıyor.

              Satır Servisim'in montaj satırı: solda bölümün adı, sağda
              o bölümde kaç parça olduğu. Servisim sağda yalnız sayıyı
              yazıyor; burada sayı "12 parça" diye yazıyla duruyor —
              çiftçi o sayının neyi saydığını tahmin etmek zorunda
              kalmasın, hap da bu yazıya yetecek kadar geniş. */}
          {!montaj && !aramaVar && (
            <>
              <span className="field__hint" style={{ marginTop: 0 }}>
                {t('parcaSec.montajSec')}
              </span>
              <div className="montaj-liste">
                {montajlar.map((g) => (
                  <button key={g.id} type="button" className="montaj" onClick={() => montajAc(g)}>
                    <span className="montaj__ad">{g.ad}</span>
                    <span className="montaj__sayi">{t('parcaSec.grupAdet', { n: g.adet })}</span>
                    <IconRight size={18} />
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

              {/* Parçalar Servisim'deki gibi iki sütunlu kartlarda: üstte
                  büyük görsel, altında kod, ad ve liste fiyatı. Bir
                  dokunuş parçayı seçiyor, ikincisi bırakıyor; seçili
                  kart kenarı ve köşedeki onay işaretiyle ayrılıyor. */}
              {listelenen.length === 0 ? (
                <span className="field__hint">{t('parcaSec.sonucYok')}</span>
              ) : (
                <div className="parca-izgara">
                  {listelenen.map((p) => (
                    <ParcaKarti
                      key={p.kod}
                      parca={p}
                      fiyat={p.fiyat}
                      secili={taslak.has(p.kod)}
                      onSec={() => cevir(p.kod)}
                      gorselYok={t('parcaSec.gorselYok')}
                    />
                  ))}
                </div>
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
