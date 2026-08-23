/* ==========================================================================
   Dil desteği

   Uygulama iki dilde: Türkçe ve İngilizce. PAKSAN altı kıtaya ihracat
   yapıyor; yurtdışındaki müşteriler de aynı uygulamayı kullanacak.

   NASIL ÇALIŞIYOR

     import { useDil } from '../i18n'
     const { t, dil } = useDil()
     <h1>{t('anasayfa.merhaba')}</h1>

   Metinler `tr.js` ve `en.js` dosyalarında, aynı anahtarlarla duruyor.
   Bir anahtarın İngilizcesi henüz yazılmadıysa TÜRKÇESİ GÖSTERİLİYOR —
   ekran boş kalmıyor, eksik yer belli oluyor. Eksikleri toplu görmek
   için: tools/dil-kontrol.js

   YERİNE KOYMA

     t('talep.no', { no: 'SRV-123' })   → "Talep no: SRV-123"
     Metinde {no} şeklinde yazılır.

   İÇERİK DOSYALARI (ürünler, destek, rehberler, KVKK) burada değil,
   kendi dosyalarının yanında `*.en.js` olarak duruyor; oradaki
   yardımcılar dili parametre alıyor.
   ========================================================================== */

import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { tr } from './tr'
import { en } from './en'

export const DILLER = [
  { kod: 'tr', ad: 'Türkçe', kisa: 'TR' },
  { kod: 'en', ad: 'English', kisa: 'EN' },
]

export const VARSAYILAN_DIL = 'tr'

const SOZLUK = { tr, en }

const DilCtx = createContext(null)

/* Telefonun dili İngilizceyse açılışta İngilizce öneriliyor. Kullanıcı
   bir kez seçim yaptıysa onun seçimi geçerli; buraya bakılmıyor. */
export function cihazDili() {
  if (typeof navigator === 'undefined') return VARSAYILAN_DIL
  const d = (navigator.language || '').toLowerCase()
  if (d.startsWith('tr')) return 'tr'
  return 'en'
}

function bul(sozluk, anahtar) {
  return anahtar.split('.').reduce((o, p) => (o == null ? undefined : o[p]), sozluk)
}

/** Anahtardan metni bulur; İngilizcesi yoksa Türkçesine düşer. */
export function ceviri(dil, anahtar, degerler) {
  let metin = bul(SOZLUK[dil] || tr, anahtar)
  if (metin == null && dil !== 'tr') metin = bul(tr, anahtar)
  if (metin == null) metin = anahtar /* hiç yoksa anahtarı göster ki fark edilsin */

  if (degerler && typeof metin === 'string') {
    for (const [k, v] of Object.entries(degerler)) {
      metin = metin.replaceAll(`{${k}}`, v)
    }
  }
  return metin
}

export function DilSaglayici({ dil, children }) {
  /* Sayfanın dili HTML'e yazılıyor. Sadece bir etiket değil: CSS'teki
     `text-transform: uppercase` dile göre çalışıyor. Türkçe kilitli
     kalırsa İngilizce "which" → "WHİCH" oluyordu (Türkçe'de i'nin
     büyüğü İ). Ekran okuyucular da doğru dilde okuyor. */
  useEffect(() => {
    document.documentElement.lang = dil
  }, [dil])

  const t = useCallback((anahtar, degerler) => ceviri(dil, anahtar, degerler), [dil])
  const deger = useMemo(() => ({ dil, t, ingilizce: dil !== 'tr' }), [dil, t])
  return <DilCtx.Provider value={deger}>{children}</DilCtx.Provider>
}

export function useDil() {
  const v = useContext(DilCtx)
  if (!v) throw new Error('useDil bir DilSaglayici içinde kullanılmalı')
  return v
}
