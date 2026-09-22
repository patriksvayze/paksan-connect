/* ==========================================================================
   Servis APK'sı — demo kurulumu

   YALNIZCA DEMO İŞARETLİ SÜRÜMDE ÇALIŞIR.

   Servis uygulamasının verisi bugün cihazın kendi hafızasında duruyor.
   Telefona kurulan APK ilk açıldığında o hafıza bomboş: kayıtlı servis
   hesabı yok, talep yok. Giriş ekranı çıkıyor ama girilecek hesap
   bulunmuyor.

   Bu dosya hafızayı doldurup bir servise hesap açıyor:

     1. Backoffice'in demo üreticisini çalıştırıyor (personel, müşteri,
        talep, servis kayıtları, hesap hareketleri, duyuru)
     2. Demo servisine uygulama hesabı açıyor

   TALEPLER BURADA DAĞITILMIYOR ARTIK. Önceden servis talepleri il ve
   ilçeye bakılarak servislere dağıtılıyordu; gerçek talep ise makineden
   çıkan servise düşüyor (bkz. lib/servisAtama.js). Demo üreticisi aynı
   zinciri kullanıyor ve demo servisinin işlerini kendisi kuruyor
   (bkz. backoffice/demoServis.js).

   DEMO SÜRÜMÜ. Akış değiştiğinde eski demo verisi yeni ekranlarda
   anlamsız görünüyor: onay bekleyen iş yok, parça masası boş. Sürüm
   numarası değişince eski demo kayıtları silinip yenisi kuruluyor.
   Servisin elle açtığı kayıtlara dokunulmuyor; onlar demo deposunda
   değil.

   ÜRETİMDE ÇALIŞMIYOR. Çağrı `main.jsx` içinde `demoAPKmi()` ile
   koşula bağlı. Sunucu bağlandığında dosya tamamen siliniyor.
   ========================================================================== */

import { load, save } from '../lib/storage'
import { servisHesabiYaz, servisleriYaz } from '../backoffice/veri'
import { servisleriGetir } from '../marka'
import { demoTemizle, demoVarMi, demoYukle } from '../backoffice/demo'
import { DEMO_SERVIS } from '../backoffice/demoServis'
import { DEMO_HESAP } from './demoKimlik'

/* Servis akışı değiştiğinde bir artırılıyor.
   3 (21 Eylül 2026): fiyat teklifinin durumları ve demo talepleri
   değişti (bkz. backoffice/veri.js → DURUMLAR); eski demo o durumlarla
   kalmasın.
   4 (22 Eylül 2026): işçilik tutar yerine süreyle yazılıyor ve talep
   formundaki aranma tercihi kaldırıldı; eski demo kayıtları eski
   biçimde kalmasın.
   Dışa açık: ekran turu demoyu kapatmak için bu sayıyı yazıyor
   (tools/ekosistem-turu.mjs); elle yazsaydı sürüm değişince bozulurdu. */
export const DEMO_SURUMU = 4
const SURUM_ANAHTARI = 'demoSurumu'

export async function demoKur() {
  const hesapVar = servisleriGetir().some((b) => b.kullanici === DEMO_HESAP.kullanici)
  const guncel = load(SURUM_ANAHTARI, 0) === DEMO_SURUMU

  /* Hesap da demo da güncelse kurulum yapılmış demektir. Her açılışta
     tekrarlanırsa servisin demo işlerde yaptığı değişiklikler silinir. */
  if (hesapVar && guncel) return

  if (!guncel && demoVarMi()) demoTemizle()
  if (!demoVarMi()) await demoYukle()
  if (!hesapVar) await hesapAc()

  save(SURUM_ANAHTARI, DEMO_SURUMU)
}

/* ------------------------------------------------------------------ Hesap */

async function hesapAc() {
  const sonuc = await servisHesabiYaz(DEMO_SERVIS, DEMO_HESAP, 'Demo')
  if (sonuc.hata) return

  /* İlk girişte şifre belirleme adımı demo APK'sında atlanıyor: burada
     şifreyi PAKSAN yetkilisi değil, uygulamanın kendisi belirledi. */
  servisleriYaz(
    servisleriGetir().map((b) =>
      b.id === DEMO_SERVIS ? { ...b, ilkGiris: false } : b,
    ),
    'Demo',
    'Demo servis hesabı hazırlandı',
  )
}
