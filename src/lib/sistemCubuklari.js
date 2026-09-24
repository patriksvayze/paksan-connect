import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'

/* ==========================================================================
   Sistem çubuklarının yazı rengi (24 Eylül 2026, Capacitor 8)

   Google Play hedef API 36 istiyor; Android 15'ten beri o hedefteki
   uygulama ekranın TAMAMINA çiziliyor (edge-to-edge): saat, pil ve
   bildirim simgelerinin durduğu üst çubuk ile alttaki gezinme çubuğu
   artık uygulamanın kendi zemininin üstünde, şeffaf. İçerik çentiğe ve
   çubuklara girmesin diye CSS güvenli alan payları var (styles.css →
   --safe-top, servis.css → --ust).

   Kalan tek şey simgelerin rengi. Capacitor'ın varsayılanı telefonun
   temasına bakıyor; oysa iki uygulamanın da kendi tema seçimi var
   (Açık · Koyu · Sistem). Telefon açık temadayken uygulama koyu
   seçilirse koyu zeminde koyu simgeler kalıyordu — saat okunmuyor.
   Tema her uygulandığında simgeler de ona göre boyanıyor.

   Karşılama ve giriş ekranları temadan bağımsız koyu bir fotoğrafın
   üstünde açılıyor; orada simgeler açık renk (`koyuZemin`), ekrandan
   çıkınca yeniden temaya göre.

   Tarayıcıda (backoffice, geliştirme) hiçbir şey yapmıyor.
   ========================================================================== */

function boya(koyuZeminde) {
  if (!Capacitor.isNativePlatform()) return
  SystemBars.setStyle({ style: koyuZeminde ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
}

/** Uygulanan temaya göre: koyu temada açık simgeler. */
export function temayaGoreBoya() {
  boya(document.documentElement.getAttribute('data-tema') === 'koyu')
}

/** Temadan bağımsız koyu zeminli ekran (karşılama, giriş fotoğrafı). */
export function koyuZeminIcinBoya() {
  boya(true)
}

/* Tema iki ayrı dosyada uygulanıyor (components/TemaSecici.jsx,
   backoffice/Tema.jsx); ikisi de yalnız `data-tema` niteliğini yazıyor.
   Uygulamanın girişi o niteliği izliyor: tema dosyaları Capacitor'ı
   bilmek zorunda kalmıyor, backoffice paketine de girmiyor. */
export function temayiIzle() {
  if (!Capacitor.isNativePlatform()) return
  temayaGoreBoya()
  new MutationObserver(temayaGoreBoya).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-tema'],
  })
}
