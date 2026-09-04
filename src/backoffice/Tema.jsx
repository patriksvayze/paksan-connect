import { useEffect, useState } from 'react'
import { urun } from '../lib/urun'

/* ==========================================================================
   Backoffice görünüm ayarı — açık / koyu

   Uygulamadaki ayarın backoffice karşılığı. Aynı mantık, ayrı depo
   anahtarı: personel kendi bilgisayarında koyu çalışmak isteyebilir,
   bu tercih müşterinin telefonundakiyle ilgisi olmayan bir şey.

   VARSAYILAN AÇIK. Bilgisayarın karanlık mod ayarı izlenmiyor; personel
   hiç dokunmadıysa backoffice her zaman açık temada açılır.

   Ayar profil penceresinde duruyor. Kendi başına bir menü satırı
   açmaya değmez; personelin günde bir kez dokunacağı bir şey.

   BAYİ PANELİ BU DOSYAYI PAYLAŞIYOR AMA TERCİHİ PAYLAŞMIYOR

   Bayi paneli aynı bileşeni kullanıyor; ikisi de aynı tarayıcıda aynı
   adresten açıldığı için tek bir anahtar yazıldığında tercih öteki
   ürüne de sıçrıyordu. Bayinin telefonundaki görünüm tercihiyle
   PAKSAN personelinin bilgisayarındaki tercihin birbiriyle ilgisi yok.

   Anahtar hangi derlemenin çalıştığına göre seçiliyor; kararı giriş
   dosyası veriyor (bkz. src/lib/urun.js).
   ========================================================================== */

function anahtar() {
  return urun() === 'bayi' ? 'paksan.bayiTema' : 'paksan.backofficeTema'
}

export const TEMALAR = [
  { kod: 'acik', ad: 'Açık' },
  { kod: 'koyu', ad: 'Koyu' },
]

function oku() {
  try {
    return localStorage.getItem(anahtar()) || 'acik'
  } catch {
    return 'acik'
  }
}

/** Kayıtlı tercihi belgeye uygular. Açılışta da çağrılıyor. */
export function temayiUygula(kod) {
  const k = kod || oku()
  document.documentElement.setAttribute('data-tema', k === 'koyu' ? 'koyu' : 'acik')
  return k
}

export function TemaSecici() {
  const [tema, setTema] = useState(oku)

  useEffect(() => {
    temayiUygula(tema)
  }, [tema])

  return (
    <div className="tema-secici" role="group" aria-label="Görünüm">
      {TEMALAR.map((x) => (
        <button
          key={x.kod}
          className={'tema-secici__dg' + (tema === x.kod ? ' tema-secici__dg--on' : '')}
          onClick={() => {
            if (x.kod === tema) return
            try {
              localStorage.setItem(anahtar(), x.kod)
            } catch {
              /* Depolama kapalıysa tercih bu oturumda geçerli olsun. */
            }
            setTema(x.kod)
          }}
          aria-pressed={tema === x.kod}
        >
          {x.ad}
        </button>
      ))}
    </div>
  )
}
