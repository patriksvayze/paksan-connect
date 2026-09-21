/* ==========================================================================
   vt yedekle — veritabanının yedeği

       npm run vt -- yedekle [--gunluk] [--klasor yol]
                             [--ayar dosya | --ortam ad] [--veritabani ad]

   TASARIM: veritabani/tasarim.md 1.19.2. Bu dosya o bölümün uygulaması;
   bir şey değişecekse önce orası değişir.

   NE YAPIYOR
     tam yedek   BACKUP DATABASE … WITH CHECKSUM
                 → <ad>_tam_YYYYMMDD_HHMMSS.bak
     --gunluk    BACKUP LOG … WITH CHECKSUM
                 → <ad>_gunluk_YYYYMMDD_HHMMSS.trn
                 Yalnız FULL kurtarma modelinde anlamlı (canlı). SIMPLE'da
                 SQL Server günlük yedeği almaz; araç bunu önceden söyler.
     ardından    RESTORE VERIFYONLY … WITH CHECKSUM — dosya okunuyor mu,
                 sağlama toplamları tutuyor mu. Tutmazsa çıkış kodu 1.
     son olarak  yedeğin msdb.dbo.backupset'e düştüğünü okur ve basar.

   NEDEN SON ADIM ÖNEMLİ. `vt guncelle` test ve canlıda son 2 saatte tam
   yedek arıyor ve tam olarak msdb.dbo.backupset'e bakıyor (calistir.mjs
   → yedekDenetle). Bu komut yazılana kadar yedek alınamıyordu, yedeksiz
   güncelleme de yapılamıyordu; test ve canlı veritabanı hiç
   güncellenemezdi. Yedek oraya düşmediyse kapı açılmaz; araç bunu
   kendisi görüp söylüyor.

   VERIFYONLY GERİ YÜKLEME DEĞİLDİR. Dosyanın bozuk yazılmadığını söyler,
   içindeki verinin işe yaradığını değil. "Geri yükleme en az bir kez
   denenmemişse, yedeğiniz yok demektir" (SUNUCU-VE-VERITABANI.md §12):
   yılda bir kez test ortamına gerçek bir geri yükleme yapılır.

   KLASÖR: --klasor > PAKSAN_VT_YEDEK_KLASORU > SQL Server'ın varsayılan
   yedek klasörü. Dosyayı bu araç değil SQL Server HİZMETİ yazar;
   klasöre hizmet hesabının (yerelde NT SERVICE\MSSQLSERVER) yazma izni
   olmalı. Varsayılan klasör çoğu zaman yalnız o hesaba açıktır — orayı
   bu bilgisayarın kullanıcısı göremez, bu normal.

   BAĞLANTI: "kurulum" girişi (sunucu yöneticisi). Yedek almak ve msdb'yi
   okumak sunucu düzeyinde iş; `vt guncelle`'nin yedek kapısı da aynı
   girişle bakıyor.

   HENÜZ YAPMADIKLARI
     - Saklama (7 gün / 4 hafta / 12 ay, tasarim.md 1.19.2). Dosya
       sildiği için zamanlanmış işlerle birlikte yazılacak.
     - Zamanlama. Express'te Agent yok; işletim sisteminin zamanlayıcısı
       çalıştıracak.
     - VPS dışına kopya. Araç dosyayı üretir; kopyalamak bilgi işlemin
       düzenine bağlı.
   ========================================================================== */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ortamYukle, veritabaniDegistir } from './ortam.mjs'
import { sorguJson, sqlcmd, sqlHatasi } from './sqlcmd.mjs'

/* Büyük bir veritabanının yedeği sqlcmd sarmalayıcısının varsayılan
   10 dakikasını aşabilir. */
const ZAMAN_ASIMI_MS = 2 * 60 * 60 * 1000

/* T-SQL dizgisi içine konacak değer (dosya yolu). Veritabanı adı zaten
   ortam.mjs'te Paksan_* kalıbıyla denetleniyor. */
const dizgi = (s) => String(s).replace(/'/g, "''")

function damga(t = new Date()) {
  const iki = (n) => String(n).padStart(2, '0')
  return (
    `${t.getFullYear()}${iki(t.getMonth() + 1)}${iki(t.getDate())}_` +
    `${iki(t.getHours())}${iki(t.getMinutes())}${iki(t.getSeconds())}`
  )
}

function yonetici(ayar, sorgu) {
  const r = sqlcmd({ ayar, giris: 'kurulum', veritabani: 'master', sorgu, zamanAsimiMs: ZAMAN_ASIMI_MS })
  if (r.kod !== 0) {
    const ham = sqlHatasi(r)
    /* 4214: tam yedek zinciri başlamadan günlük yedeği istendi. */
    if (/\b4214\b/.test(ham)) {
      throw new Error(
        'Bu veritabanının henüz tam yedeği yok; günlük yedeği ancak bir tam ' +
          'yedeğin ardından alınabilir. Önce "npm run vt -- yedekle" çalıştırın.\n\n' +
          ham,
      )
    }
    throw new Error(ham)
  }
  return r
}

export async function calistir(s) {
  let ayar = ortamYukle({ ayar: s.ayar, ortam: s.ortam })
  if (s.veritabani) ayar = veritabaniDegistir(ayar, s.veritabani)
  const gunluk = s.bayrak.has('gunluk')
  const ad = ayar.veritabani

  const [vt] = sorguJson({
    ayar,
    giris: 'kurulum',
    veritabani: 'master',
    sorgu: `SELECT name AS Ad, recovery_model_desc AS Kurtarma, state_desc AS Durum,
              CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS nvarchar(400)) AS VarsayilanKlasor
            FROM sys.databases WHERE name = N'${dizgi(ad)}' FOR JSON PATH`,
  })
  if (!vt) throw new Error(`${ad} bu sunucuda yok; yedeklenecek bir şey yok.`)
  if (vt.Durum !== 'ONLINE') throw new Error(`${ad} çevrimiçi değil (${vt.Durum}); yedek alınamaz.`)
  if (gunluk && vt.Kurtarma === 'SIMPLE') {
    throw new Error(
      `${ad} SIMPLE kurtarma modelinde; SQL Server bu modelde günlük yedeği almaz. ` +
        `Günlük yedeği yalnız canlıda (FULL) alınır — tasarim.md 1.19.2. ` +
        `Tam yedek için --gunluk olmadan çalıştırın.`,
    )
  }

  const klasor = s.klasor || ayar.yedekKlasoru || vt.VarsayilanKlasor
  if (!klasor) {
    throw new Error('Yedek klasörü belirlenemedi. --klasor ya da PAKSAN_VT_YEDEK_KLASORU verin.')
  }
  const tur = gunluk ? 'gunluk' : 'tam'
  const dosya = join(klasor, `${ad}_${tur}_${damga()}.${gunluk ? 'trn' : 'bak'}`)
  /* Adın saniyesi var; yine de aynı saniyede ikinci çağrı üzerine
     yazmasın. Klasörü bu kullanıcı göremiyorsa (varsayılan klasör gibi)
     existsSync false döner; o zaman çakışma ihtimali yalnız aynı saniye. */
  if (existsSync(dosya)) throw new Error(`${dosya} zaten var; yedek üzerine yazılmaz.`)

  console.log(`${ad} — ${gunluk ? 'günlük' : 'tam'} yedek alınıyor`)
  console.log(`  dosya     ${dosya}`)

  const bas = Date.now()
  /* INIT yalnız yeni dosyaya yazar (tasarim.md 1.19.2); ad her seferinde
     yeni olduğu için eski bir yedek hiç ezilmez. */
  yonetici(
    ayar,
    gunluk
      ? `BACKUP LOG [${ad}] TO DISK = N'${dizgi(dosya)}' WITH CHECKSUM, INIT, NAME = N'${ad} günlük yedek';`
      : `BACKUP DATABASE [${ad}] TO DISK = N'${dizgi(dosya)}' WITH CHECKSUM, INIT, NAME = N'${ad} tam yedek';`,
  )
  console.log(`  alındı    ${((Date.now() - bas) / 1000).toFixed(1)} sn`)

  yonetici(ayar, `RESTORE VERIFYONLY FROM DISK = N'${dizgi(dosya)}' WITH CHECKSUM;`)
  console.log('  doğrulama RESTORE VERIFYONLY geçti (sağlama toplamları tutuyor)')

  const [kayit] = sorguJson({
    ayar,
    giris: 'kurulum',
    veritabani: 'master',
    sorgu: `SELECT TOP (1) b.backup_finish_date AS Bitis, b.type AS Tur,
              CAST(b.backup_size / 1048576.0 AS decimal(12, 1)) AS BoyutMB,
              b.has_backup_checksums AS Saglama
            FROM msdb.dbo.backupset AS b
            JOIN msdb.dbo.backupmediafamily AS m ON m.media_set_id = b.media_set_id
            WHERE b.database_name = N'${dizgi(ad)}'
              AND m.physical_device_name = N'${dizgi(dosya)}'
            ORDER BY b.backup_finish_date DESC FOR JSON PATH`,
  })
  if (!kayit) {
    throw new Error(
      'Yedek dosyası yazıldı ama msdb.dbo.backupset\'te kaydı görünmüyor. ' +
        '"vt guncelle" bu yedeği görmez; test ve canlıda güncelleme yine durur.',
    )
  }
  console.log(`  boyut     ${kayit.BoyutMB} MB${kayit.Saglama ? ', sağlama toplamlı' : ''}`)
  console.log(`  kayıt     msdb.dbo.backupset (${kayit.Bitis})`)
  if (!gunluk && (ayar.ortam === 'test' || ayar.ortam === 'canli')) {
    console.log('            "vt guncelle" önümüzdeki 2 saat bu yedeği görecek.')
  }
}
