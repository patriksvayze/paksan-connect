/* ==========================================================================
   SQL betiklerinin statik denetimi

   VPS'teki SQL Server'ın sürümü ve türü (Express/Standard, Windows/Linux)
   henüz belli değil. Bu bilgisayardaki sunucu SQL Server 2025 Enterprise
   Evaluation — burada çalışıp VPS'te çalışmayacak bir özellik yazmak çok
   kolay. Denetim, en az SQL Server 2019 (uyumluluk 150) ve her sürüm
   türünde bulunmayan özellikleri betiklerde arar.

   Ayrıca betiklerin yazım kuralları: BOM yok, CASCADE yok, her tablonun
   birincil anahtarı var, geçici tablolar harmanlamayı açıkça belirtir.

   `npm run dogrula` ve `vt sinama` çağırır. Sorun bulursa listesini
   döndürür; çağıran çıkış kodunu belirler.
   ========================================================================== */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { KOK, VT_KLASORU } from './ortam.mjs'

/* [kalıp, gerekçe] — yorum ve dizgi dışındaki metinde aranır. */
const YASAKLAR = [
  [/\bGREATEST\s*\(|\bLEAST\s*\(/i, 'GREATEST/LEAST 2022 ile geldi'],
  [/\bDATETRUNC\s*\(/i, 'DATETRUNC 2022 ile geldi'],
  [/\bJSON_OBJECT\s*\(|\bJSON_ARRAY\s*\(|\bJSON_PATH_EXISTS\s*\(/i, 'JSON_OBJECT/ARRAY 2022 ile geldi'],
  [/\bGENERATE_SERIES\s*\(/i, 'GENERATE_SERIES 2022 ile geldi'],
  [/\bIS\s+(NOT\s+)?DISTINCT\s+FROM\b/i, 'IS DISTINCT FROM 2022 ile geldi'],
  [/\bREGEXP_[A-Z]+\s*\(/i, 'REGEXP işlevleri 2025 ile geldi'],
  [/\bAPPROX_PERCENTILE_/i, 'APPROX_PERCENTILE 2022 ile geldi'],
  [/\bSTRING_SPLIT\s*\([^)]*,[^)]*,/i, 'STRING_SPLIT üçüncü parametresi 2022 ile geldi'],
  [/\b(?:AS|,)\s*json\b|\bjson\s*(?:NOT\s+)?NULL\b/i, 'yerel json türü 2025 ile geldi'],
  [/\bvector\s*\(/i, 'vector türü 2025 ile geldi'],
  [/\bLEDGER\s*=/i, 'defter (ledger) tabloları 2022 ile geldi'],
  [/\bMEMORY_OPTIMIZED\b/i, 'bellek içi tablolar kullanılmıyor'],
  [/\bFILESTREAM\b|\bFILETABLE\b/i, 'FILESTREAM kullanılmıyor (dosyalar diskte)'],
  [/\bCREATE\s+ASSEMBLY\b/i, 'CLR kullanılmıyor'],
  [/\bxp_cmdshell\b/i, 'xp_cmdshell yasak'],
  [/\bENCRYPTED\s+WITH\b/i, 'Always Encrypted kullanılmıyor (uygulama tarafı şifreleme)'],
  [/\bONLINE\s*=\s*ON\b/i, 'ONLINE dizin işlemleri Express/Standard\'da yok'],
  [/\bDATA_COMPRESSION\b/i, 'sıkıştırma kararı yok; taşınabilirlik için kullanılmıyor'],
  [/\bPARTITION\s+(FUNCTION|SCHEME)\b/i, 'bölümleme kullanılmıyor'],
  [/\bCREATE\s+FULLTEXT\b|\bCONTAINS\s*\(|\bFREETEXT\s*\(/i, 'tam metin arama Express/Linux varsayılan kurulumda yok'],
  [/\bOPENROWSET\s*\(|\bOPENDATASOURCE\s*\(/i, 'dış veri kaynağı yasak'],
  [/\bON\s+DELETE\s+CASCADE\b|\bON\s+UPDATE\s+CASCADE\b/i, 'CASCADE yok: silme ve güncelleme bilinçli yapılır'],
  [/\bsp_executesql\b[\s\S]{0,40}\+\s*@/i, "dinamik SQL'e parametre birleştirme yok; parametre kullanın"],
  /* tasarim.md 1.18 listesinde olup burada eksik kalanlar */
  [/\bHISTORY_RETENTION_PERIOD\b/i, 'geçmiş saklama süresi kullanılmıyor (saklama sistem.SaklamaUygula ile)'],
  [/_UTF8\b/i, 'UTF-8 harmanlamaları kullanılmıyor (nvarchar + açık harmanlama)'],
  [/\bsp_OA\w*/i, 'OLE otomasyon prosedürleri yasak'],
  [/\bBULK\s+INSERT\b/i, 'BULK INSERT kullanılmıyor (dış dosya erişimi yok)'],
]

/* Bölüm 7.2'nin istediği denetimlerin gerekçeli istisnaları. Her satır neden
   istisna olduğunu yazar; yeni satır eklemeden önce gerekçeyi okuyun. Bir
   denetimi bütünüyle kapatmak için buraya satır eklenmez; kural değişecekse
   tasarim.md 7.2 değişir. */
const ISTISNALAR = [
  {
    denetim: 'tur',
    dosya: /R08__yonetim\.sql$/,
    kalip: /@(?:Alfabe|Kod)\s+varchar/i,
    gerekce: 'karışmayan kod alfabesi ve üretilen kod yalnız ASCII harf ve rakam (tasarim.md 1.14.4 başvuru uygulaması)',
  },
  {
    denetim: 'tur',
    dosya: /(?:parmak-izi|veri-ozeti)\.sql$/,
    kalip: /n?char\s*\(\s*64/i,
    gerekce: 'SHA-256 özetinin onaltılık gösterimi: 64 ASCII karakter (Bölüm 7 parmak izi)',
  },
  {
    denetim: 'harmanlama',
    dosya: /R01__islevler\.sql$/,
    kalip: /(?:SUBSTRING\s*\(\s*t\.Duz|^\s*Duz\s*$)/i,
    gerekce: "yardim.Sadelestir girdiyi yukarıda Latin1_General_100_BIN2 ile düzleştirip Duz'a yazar; harmanlama orada sabitlenmiştir (tasarim.md 3.1.4)",
  },
  {
    denetim: 'harmanlama',
    dosya: /(?:parmak-izi|veri-ozeti)\.sql$/,
    kalip: /CONVERT\s*\(\s*n?char/i,
    gerekce: 'onaltılık özet ASCII; büyük/küçük harf dönüşümü harmanlamadan bağımsız',
  },
  {
    denetim: 'yardimYazma',
    dosya: /R07__yardim\.sql$/,
    kalip: /^dbo\.AciklamaYaz$/i,
    gerekce: 'MS_Description yazar, veri yazmaz; prosedürlerin dışında, kurulum anında çalışır (tasarim.md 3.4)',
  },
]

function istisnaMi(denetim, ad, parca) {
  return ISTISNALAR.some((x) => x.denetim === denetim && x.dosya.test(ad) && x.kalip.test(parca))
}

/* Ad olarak kullanılmayacak T-SQL ayrılmış sözcükleri (tasarim.md 7.2).
   Köşeli ayraç istemeyen, okunur adlar için. */
const AYRILMIS = new Set(
  `ADD ALL ALTER AND ANY AS ASC AUTHORIZATION BACKUP BEGIN BETWEEN BREAK BROWSE BULK BY CASCADE CASE
   CHECK CHECKPOINT CLOSE CLUSTERED COALESCE COLLATE COLUMN COMMIT COMPUTE CONSTRAINT CONTAINS
   CONTINUE CONVERT CREATE CROSS CURRENT CURSOR DATABASE DBCC DEALLOCATE DECLARE DEFAULT DELETE DENY
   DESC DISK DISTINCT DISTRIBUTED DOUBLE DROP ELSE END ERRLVL ESCAPE EXCEPT EXEC EXECUTE EXISTS EXIT
   EXTERNAL FETCH FILE FILLFACTOR FOR FOREIGN FREETEXT FROM FULL FUNCTION GOTO GRANT GROUP HAVING
   HOLDLOCK IDENTITY IF IN INDEX INNER INSERT INTERSECT INTO IS JOIN KEY KILL LEFT LIKE LINENO LOAD
   MERGE NATIONAL NOCHECK NONCLUSTERED NOT NULL NULLIF OF OFF OFFSETS ON OPEN OPTION OR ORDER OUTER
   OVER PERCENT PIVOT PLAN PRIMARY PRINT PROC PROCEDURE PUBLIC RAISERROR READ READTEXT RECONFIGURE
   REFERENCES REPLICATION RESTORE RESTRICT RETURN REVERT REVOKE RIGHT ROLLBACK ROWCOUNT ROWGUIDCOL
   RULE SAVE SCHEMA SELECT SESSION_USER SET SETUSER SHUTDOWN SOME STATISTICS SYSTEM_USER TABLE
   TABLESAMPLE TEXTSIZE THEN TO TOP TRAN TRANSACTION TRIGGER TRUNCATE UNION UNIQUE UNPIVOT UPDATE
   UPDATETEXT USE USER VALUES VARYING VIEW WAITFOR WHEN WHERE WHILE WITH WRITETEXT`
    .split(/\s+/)
    .filter(Boolean),
)

/* Dosya adı kalıpları (tasarim.md 7.2; calistir.mjs aynı kalıpları çalıştırma
   anında uygular ama yalnız tür harfiyle başlayan dosyaları görür). */
const DOSYA_KALIPLARI = [
  { klasor: 'kurulum', kalip: /^K\d{2}__[a-z0-9_]+\.sql$/ },
  { klasor: 'semalar', kalip: /^V\d{4}__[a-z0-9_]+\.sql$/ },
  { klasor: 'tekrar', kalip: /^R\d{2}__[a-z0-9_]+\.sql$/ },
  { klasor: 'tohum', kalip: /^[TB]\d{2}__[a-z0-9_]+\.sql$/ },
  { klasor: 'ornek', kalip: /^O\d{2}__[a-z0-9_]+\.sql$/ },
  /* sinama: S betikleri artı elle çalıştırılan iki yardımcı (Bölüm 7). */
  { klasor: 'sinama', kalip: /^(?:S\d{2}__[a-z0-9_]+|parmak-izi|veri-ozeti)\.sql$/ },
]

/* '(' konumundan başlayıp dengeli kapanışı bulur. */
function dengeliGovde(metin, acik) {
  let derinlik = 0
  for (let j = acik; j < metin.length; j++) {
    if (metin[j] === '(') derinlik++
    else if (metin[j] === ')') {
      derinlik--
      if (derinlik === 0) return { govde: metin.slice(acik + 1, j), bitis: j }
    }
  }
  return null
}

/* Gövdeyi üst düzey virgüllerden böler (parantez içindekiler bölünmez). */
function ustDuzeyParcalar(govde) {
  const parcalar = []
  let derinlik = 0
  let bas = 0
  for (let j = 0; j < govde.length; j++) {
    if (govde[j] === '(') derinlik++
    else if (govde[j] === ')') derinlik--
    else if (govde[j] === ',' && derinlik === 0) {
      parcalar.push({ metin: govde.slice(bas, j), ofset: bas })
      bas = j + 1
    }
  }
  parcalar.push({ metin: govde.slice(bas), ofset: bas })
  return parcalar
}

/* Codex'ten geçmemiş Türkçe metin yer tutucusu (tasarim.md 1.20, KR-12).
   Dizgi içinde aranır; sorun sayılmaz, uyarı olarak listelenir. Test ve
   canlıda betiğin çalıştırılmaması tools/vt/calistir.mjs'in işidir. */
export function yerTutucuUyarilari(klasor = VT_KLASORU) {
  const uyarilar = []
  for (const yol of sqlDosyalari(klasor)) {
    const ad = relative(KOK, yol).replace(/\\/g, '/')
    const ham = readFileSync(yol, 'utf8')
    for (const m of ham.matchAll(/<Codex metni:/g)) {
      uyarilar.push(`${ad}:${satirNo(ham, m.index)}: Codex'ten geçmemiş metin yer tutucusu`)
    }
  }
  return uyarilar
}

/* Yorumları ve dizgi içlerini boşaltır; satır numaraları korunur. */
export function yorumsuz(metin) {
  let cikti = ''
  let i = 0
  while (i < metin.length) {
    const iki = metin.slice(i, i + 2)
    if (iki === '--') {
      const son = metin.indexOf('\n', i)
      const bitis = son < 0 ? metin.length : son
      cikti += ' '.repeat(bitis - i)
      i = bitis
    } else if (iki === '/*') {
      const son = metin.indexOf('*/', i + 2)
      const bitis = son < 0 ? metin.length : son + 2
      cikti += metin.slice(i, bitis).replace(/[^\n]/g, ' ')
      i = bitis
    } else if (metin[i] === "'") {
      let j = i + 1
      while (j < metin.length) {
        if (metin[j] === "'" && metin[j + 1] === "'") j += 2
        else if (metin[j] === "'") break
        else j++
      }
      cikti += "'" + metin.slice(i + 1, j).replace(/[^\n]/g, ' ') + "'"
      i = j + 1
    } else {
      cikti += metin[i]
      i++
    }
  }
  return cikti
}

function sqlDosyalari(klasor) {
  if (!existsSync(klasor)) return []
  const sonuc = []
  for (const ad of readdirSync(klasor)) {
    const yol = join(klasor, ad)
    if (statSync(yol).isDirectory()) sonuc.push(...sqlDosyalari(yol))
    else if (ad.endsWith('.sql')) sonuc.push(yol)
  }
  return sonuc
}

function satirNo(metin, indeks) {
  return metin.slice(0, indeks).split('\n').length
}

/* Kalıcı tabloların gövdeleri: [{ tam, govde, ofset }]. Geçici tablolar ve
   tablo değişkenleri dışarıda (onların kısıtları adlandırılmaz ve
   harmanlamaları ayrı kuralla denetlenir). */
function kaliciTablolar(metin) {
  const sonuc = []
  for (const m of metin.matchAll(/CREATE\s+TABLE\s+(\[?\w+\]?\.\[?\w+\]?)\s*\(/gi)) {
    const acik = m.index + m[0].length - 1
    const d = dengeliGovde(metin, acik)
    if (d) sonuc.push({ tam: m[1], govde: d.govde, ofset: acik + 1, bas: m.index })
  }
  return sonuc
}

/* Adsız kısıt: kısıt sözcüğünün hemen öncesinde CONSTRAINT <ad> olmalı. */
function adsizKisitlar(metin, ad, ekle) {
  const KISIT = /\bCONSTRAINT\s+\w+|\bPRIMARY\s+KEY\b|\bUNIQUE\b|\bFOREIGN\s+KEY\b|\bREFERENCES\b|\bCHECK\s*\(|(?<!DATABASE_)\bDEFAULT\b/gi
  const alanlar = kaliciTablolar(metin).map((t) => ({ govde: t.govde, ofset: t.ofset }))
  for (const m of metin.matchAll(/\bALTER\s+TABLE\s+[\w.\[\]]+\s+ADD\b([\s\S]*?);/gi)) {
    alanlar.push({ govde: m[1], ofset: m.index + m[0].indexOf(m[1]) })
  }
  for (const alan of alanlar) {
    for (const parca of ustDuzeyParcalar(alan.govde)) {
      let oncekiAdli = false
      for (const k of parca.metin.matchAll(KISIT)) {
        const sozcuk = k[0].trim()
        if (/^CONSTRAINT\b/i.test(sozcuk)) {
          oncekiAdli = true
          continue
        }
        /* FOREIGN KEY ... REFERENCES tek kısıttır; REFERENCES ayrı sayılmaz. */
        if (/^REFERENCES$/i.test(sozcuk) && /\bFOREIGN\s+KEY\b/i.test(parca.metin.slice(0, k.index))) continue
        if (!oncekiAdli) {
          ekle(alan.ofset + parca.ofset + k.index, `adsız kısıt (${sozcuk.replace(/\s+/g, ' ')}); CONSTRAINT <ad> ile adlandırın`)
        }
        oncekiAdli = false
      }
    }
  }
}

/* Metin kolonu açık COLLATE ister; yasak türler hiç kullanılmaz. */
const YASAK_TUR = /\b(?:varchar|char|nchar|text|ntext)\b/i

function turVeHarmanlama(metin, ad, ekle) {
  for (const t of kaliciTablolar(metin)) {
    for (const parca of ustDuzeyParcalar(t.govde)) {
      const govde = parca.metin
      if (/^\s*(?:CONSTRAINT|PRIMARY|UNIQUE|FOREIGN|CHECK|INDEX|PERIOD)\b/i.test(govde)) continue
      if (/\bAS\b/i.test(govde.split(/\s+/).slice(0, 3).join(' '))) continue /* hesaplanmış kolon */
      if (!/\bn(?:var)?char\b/i.test(govde)) continue
      if (!/\bCOLLATE\b/i.test(govde)) {
        const kolon = (govde.trim().split(/\s+/)[0] || '?').replace(/[\[\]]/g, '')
        ekle(t.ofset + parca.ofset, `${t.tam}.${kolon}: metin kolonu açık COLLATE almamış`)
      }
    }
  }

  /* DECLARE, CAST/CONVERT ve kolon tanımlarında yasak metin türleri. */
  const yerler = [
    /\bDECLARE\s+@\w+\s+((?:var)?char|n(?:var)?char|text|ntext)\b[^;\n]*/gi,
    /\bCONVERT\s*\(\s*((?:var)?char|n(?:var)?char|text|ntext)\b[^,)]*/gi,
    /\bCAST\s*\([^()]*?\bAS\s+((?:var)?char|n(?:var)?char|text|ntext)\b[^)]*/gi,
  ]
  for (const kalip of yerler) {
    for (const m of metin.matchAll(kalip)) {
      if (!YASAK_TUR.test(m[1])) continue
      if (istisnaMi('tur', ad, m[0])) continue
      ekle(m.index, `yasak metin türü ${m[1]} (nvarchar kullanın)`)
    }
  }
  for (const t of kaliciTablolar(metin)) {
    for (const parca of ustDuzeyParcalar(t.govde)) {
      const tur = /^\s*\[?\w+\]?\s+((?:var)?char|nchar|text|ntext)\b/i.exec(parca.metin)
      if (tur && YASAK_TUR.test(tur[1]) && !istisnaMi('tur', ad, parca.metin)) {
        ekle(t.ofset + parca.ofset, `${t.tam}: yasak metin türü ${tur[1]} (nvarchar kullanın)`)
      }
    }
  }
}

/* UPPER( / LOWER( çağrısının gövdesinde harmanlama belirtilmeli. */
function harmanlamasizBuyukKucuk(metin, ad, ekle) {
  for (const m of metin.matchAll(/\b(UPPER|LOWER)\s*\(/gi)) {
    const d = dengeliGovde(metin, m.index + m[0].length - 1)
    if (!d) continue
    if (/\bCOLLATE\b/i.test(d.govde)) continue
    if (istisnaMi('harmanlama', ad, d.govde)) continue
    ekle(m.index, `${m[1].toUpperCase()}( harmanlama belirtmiyor; COLLATE yazın`)
  }
}

/* Ayrılmış sözcük ad olarak: kolon adları, nesne adları, parametreler. */
function ayrilmisAdlar(metin, ekle) {
  for (const t of kaliciTablolar(metin)) {
    for (const ek of t.tam.split('.')) {
      if (AYRILMIS.has(ek.replace(/[\[\]]/g, '').toUpperCase())) ekle(t.bas, `ayrılmış sözcük nesne adı: ${ek}`)
    }
    for (const parca of ustDuzeyParcalar(t.govde)) {
      if (/^\s*(?:CONSTRAINT|PRIMARY|UNIQUE|FOREIGN|CHECK|INDEX|PERIOD)\b/i.test(parca.metin)) continue
      const kolon = (parca.metin.trim().split(/\s+/)[0] || '').replace(/[\[\]]/g, '')
      if (kolon && AYRILMIS.has(kolon.toUpperCase())) ekle(t.ofset + parca.ofset, `ayrılmış sözcük kolon adı: ${kolon}`)
    }
  }
  for (const m of metin.matchAll(/\bCREATE\s+(?:OR\s+ALTER\s+)?(?:PROCEDURE|VIEW|FUNCTION|TRIGGER)\s+(\[?\w+\]?)\.(\[?\w+\]?)/gi)) {
    for (const ek of [m[1], m[2]]) {
      if (AYRILMIS.has(ek.replace(/[\[\]]/g, '').toUpperCase())) ekle(m.index, `ayrılmış sözcük nesne adı: ${ek}`)
    }
  }
  /* Yalnız BİZİM verdiğimiz adlar: DECLARE'ler ve prosedür/işlev parametre
     listeleri. Çağrılan sistem prosedürünün parametre adı (sp_set_session_context
     @key) bizim seçimimiz değildir; @@ROWCOUNT gibi sistem işlevleri de. */
  for (const m of metin.matchAll(/(?<!@)\bDECLARE\s+@(\w+)/gi)) {
    if (AYRILMIS.has(m[1].toUpperCase())) ekle(m.index, `ayrılmış sözcük değişken adı: @${m[1]}`)
  }
  for (const m of metin.matchAll(/\bCREATE\s+(?:OR\s+ALTER\s+)?(?:PROCEDURE|FUNCTION)\s+[\w.\[\]]+([\s\S]*?)\bAS\b/gi)) {
    for (const p of m[1].matchAll(/(?<!@)@(\w+)/g)) {
      if (AYRILMIS.has(p[1].toUpperCase())) ekle(m.index + m[0].indexOf(m[1]) + p.index, `ayrılmış sözcük parametre adı: @${p[1]}`)
    }
  }
}

/* Aynı modülde (GO ile ayrılan toplu iş) aynı adın farklı harf dizilişi. */
function harfDizilisi(metin, ekle) {
  let ofset = 0
  for (const toplu of metin.split(/^[ \t]*GO[ \t]*$/im)) {
    const gorulen = new Map()
    for (const m of toplu.matchAll(/(?<!@)@(\w+)/g)) {
      const anahtar = m[1].toLowerCase()
      const onceki = gorulen.get(anahtar)
      if (!onceki) gorulen.set(anahtar, { yazim: m[1], indeks: m.index })
      else if (onceki.yazim !== m[1]) {
        ekle(ofset + m.index, `aynı modülde iki yazım: @${onceki.yazim} ve @${m[1]}`)
        gorulen.set(anahtar, { yazim: m[1], indeks: m.index })
      }
    }
    ofset += toplu.length + 3
  }
}

export function statikDenetim(klasor = VT_KLASORU) {
  const sorunlar = []

  /* Dosya adı kalıpları (tasarim.md 7.2). */
  for (const { klasor: alt, kalip } of DOSYA_KALIPLARI) {
    const yol = join(klasor, alt)
    if (!existsSync(yol)) continue
    for (const dosyaAdi of readdirSync(yol)) {
      if (statSync(join(yol, dosyaAdi)).isDirectory()) continue
      if (!dosyaAdi.endsWith('.sql')) continue
      if (!kalip.test(dosyaAdi)) sorunlar.push(`veritabani/${alt}/${dosyaAdi}: dosya adı kurala uymuyor (${kalip})`)
    }
  }

  for (const yol of sqlDosyalari(klasor)) {
    const ad = relative(KOK, yol).replace(/\\/g, '/')
    const ham = readFileSync(yol, 'utf8')
    if (ham.charCodeAt(0) === 0xfeff) sorunlar.push(`${ad}: BOM ile kaydedilmiş`)
    const metin = yorumsuz(ham)
    const ekle = (indeks, mesaj) => sorunlar.push(`${ad}:${satirNo(metin, indeks)}: ${mesaj}`)

    adsizKisitlar(metin, ad, ekle)
    turVeHarmanlama(metin, ad, ekle)
    harmanlamasizBuyukKucuk(metin, ad, ekle)
    ayrilmisAdlar(metin, ekle)
    harfDizilisi(metin, ekle)

    /* yardim betiği yalnız okur (tasarim.md 3.4). */
    if (/R\d{2}__yardim\.sql$/.test(ad)) {
      for (const m of metin.matchAll(/\b(INSERT|UPDATE|DELETE|MERGE)\b/gi)) {
        ekle(m.index, `yardim betiğinde yazma ifadesi: ${m[1].toUpperCase()}`)
      }
      for (const m of metin.matchAll(/(?<!\bGRANT\s)(?<!\bDENY\s)(?<!\bREVOKE\s)\bEXEC(?:UTE)?\s+([\w.\[\]]+)/gi)) {
        const hedef = m[1].replace(/[\[\]]/g, '')
        if (/^yardim\./i.test(hedef)) continue
        if (istisnaMi('yardimYazma', ad, hedef)) continue
        ekle(m.index, `yardim betiğinde yardim.* dışı EXEC: ${hedef}`)
      }
    }

    /* R betiklerinde dinamik SQL yok (tasarim.md 7.2). */
    if (/\/tekrar\/R\d{2}__/.test(ad)) {
      for (const m of metin.matchAll(/\bsp_executesql\b|\bEXEC(?:UTE)?\s*\(/gi)) {
        ekle(m.index, 'R betiğinde dinamik SQL')
      }
    }

    for (const [kalip, gerekce] of YASAKLAR) {
      const m = kalip.exec(metin)
      if (m) sorunlar.push(`${ad}:${satirNo(metin, m.index)}: ${gerekce}`)
    }

    /* Geçici tabloda karakter kolonu DATABASE_DEFAULT harmanlaması ister:
       VPS'te tempdb'nin harmanlaması veritabanınkinden farklı olabilir. */
    for (const m of metin.matchAll(/CREATE\s+TABLE\s+#\w+\s*\(([\s\S]*?)\)\s*;/gi)) {
      const govde = m[1]
      if (/\b(n?var)?char\b/i.test(govde) && !/DATABASE_DEFAULT/i.test(govde)) {
        sorunlar.push(`${ad}:${satirNo(metin, m.index)}: geçici tabloda karakter kolonları COLLATE DATABASE_DEFAULT almalı`)
      }
    }

    /* Her kalıcı tablonun birincil anahtarı olmalı. */
    for (const m of metin.matchAll(/CREATE\s+TABLE\s+(\[?\w+\]?\.\[?\w+\]?)\s*\(/gi)) {
      const bas = m.index + m[0].length
      let derinlik = 1
      let j = bas
      while (j < metin.length && derinlik > 0) {
        if (metin[j] === '(') derinlik++
        else if (metin[j] === ')') derinlik--
        j++
      }
      const govde = metin.slice(bas, j)
      if (!/PRIMARY\s+KEY/i.test(govde)) {
        sorunlar.push(`${ad}:${satirNo(metin, m.index)}: ${m[1]} birincil anahtarsız`)
      }
    }

    /* Nesne adlarında Türkçe harf yok (yalnız dizgi ve yorum dışında). */
    const turkce = /[çğıöşüÇĞİÖŞÜ]/.exec(metin)
    if (turkce) sorunlar.push(`${ad}:${satirNo(metin, turkce.index)}: nesne adında Türkçe harf`)
  }
  return sorunlar
}

/* ==========================================================================
   CANLI DENETİM (tasarim.md 7.2)

   Statik denetim betiklerin metnine bakar; canlı denetim kurulmuş
   veritabanına bakar (sys.* katalogları ve iş verisi). `vt sinama` CD
   adımında çağırır; sorun listesi döner, boş liste "temiz" demektir.

   On dört denetim: CD-TIP, CD-HARMANLAMA, CD-ARAMA, CD-SADELESTIR,
   CD-FK-DIZIN, CD-UX-NULL, CD-ACIKLAMA, CD-YETKI, CD-RAPOR-KOLON,
   CD-GORUNUM, CD-TEMPORAL, CD-CK-IN, CD-CEVIRI, CD-SAHIP.

   CD-SADELESTIR dışındakiler tek SQL toplu işiyle ölçülür. CD-SADELESTIR
   iki tarafı karşılaştırır: yardim.Sadelestir ile API'nin JavaScript
   normalleştirmesi aynı girdide aynı sonucu vermeli (Bölüm 3.1.4); bu
   yüzden JavaScript karşılığı burada, denetimin yanında durur.
   ========================================================================== */

/* Bölüm 1.4.3 ve 3.1.4'ün 18 harfi; sıra SQL'deki REPLACE sırasıdır. */
const TURKCE_HARFLER = [
  ['ç', 'c'], ['Ç', 'C'], ['ğ', 'g'], ['Ğ', 'G'], ['ı', 'i'], ['İ', 'I'],
  ['ö', 'o'], ['Ö', 'O'], ['ş', 's'], ['Ş', 'S'], ['ü', 'u'], ['Ü', 'U'],
  ['â', 'a'], ['Â', 'A'], ['î', 'i'], ['Î', 'I'], ['û', 'u'], ['Û', 'U'],
]

function turkcesiz(metin) {
  let s = metin
  for (const [a, b] of TURKCE_HARFLER) s = s.split(a).join(b)
  return s
}

/** yardim.Sadelestir'in JavaScript karşılığı (tasarim.md 3.1.4). */
export function sadelestir(metin) {
  const ham = (metin ?? '').trim()
  const duz = turkcesiz(ham)
  const kod = duz.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const rakam = duz.replace(/[^0-9]/g, '')
  const sifirsiz = rakam.replace(/^0+/, '')
  let e164 = null
  if (rakam) {
    if (ham.startsWith('+')) e164 = '+' + rakam
    else if (rakam.startsWith('00')) e164 = '+' + rakam.slice(2)
    else if (rakam.startsWith('90') && rakam.length === 12) e164 = '+' + rakam
    else if (sifirsiz.length === 10) e164 = '+90' + sifirsiz
    if (e164 && (e164.length < 8 || e164.length > 16)) e164 = null
  }
  const ulusal = e164 && e164.startsWith('+90') && e164.length === 13 ? e164.slice(-10) : sifirsiz || null
  return {
    Kod: kod || null,
    Rakam: rakam || null,
    TelefonE164: e164,
    TelefonUlusal: ulusal,
    GirisAdi: duz.toLowerCase().replace(/[^a-z0-9.]/g, '') || null,
    Arama: duz.toLowerCase(),
  }
}

/* Bölüm 3.1.4 tablosundaki örnekler + IZMIR.MERKEZ + küçük harfli i içeren
   seri (tasarim.md 7.2 CD-SADELESTIR). */
const SADELESTIR_GIRDILERI = [
  'SRV-26-00123',
  'orK1270-2024-00157',
  'ıpak-2024-001',
  'IZMIR.Merkez',
  'ızmır.merkez',
  'IZMIR.MERKEZ',
  'ork1270-2024-00157',
  '0532 123 45 67',
  '+90 532 123 45 67',
  '905321234567',
  '00905321234567',
  'IŞIK Makina',
  'Örnek Müşteri',
  '320.ORNEK.0001',
]

const CANLI_SORGU = `
DECLARE @Sonuc TABLE (Denetim nvarchar(20) COLLATE DATABASE_DEFAULT NOT NULL,
                      Sorun   nvarchar(600) COLLATE DATABASE_DEFAULT NOT NULL);

/* Kullanici tablolarinin kolonlari, tam tip metniyle. */
DECLARE @Kolon TABLE (
    Sema nvarchar(128) COLLATE DATABASE_DEFAULT,
    Tablo nvarchar(128) COLLATE DATABASE_DEFAULT,
    Kolon nvarchar(128) COLLATE DATABASE_DEFAULT,
    TamAd nvarchar(400) COLLATE DATABASE_DEFAULT,
    Tip nvarchar(60) COLLATE DATABASE_DEFAULT,
    TamTip nvarchar(80) COLLATE DATABASE_DEFAULT,
    Uzunluk int, Duyarlik int, Olcek int,
    Harmanlama nvarchar(128) COLLATE DATABASE_DEFAULT,
    Hesaplanmis bit, Kalici bit, Kimlikli bit, BosOlabilir bit);

INSERT @Kolon
SELECT s.name COLLATE DATABASE_DEFAULT, t.name COLLATE DATABASE_DEFAULT, c.name COLLATE DATABASE_DEFAULT,
       CONCAT(s.name COLLATE DATABASE_DEFAULT, N'.', t.name COLLATE DATABASE_DEFAULT, N'.', c.name COLLATE DATABASE_DEFAULT),
       TYPE_NAME(c.user_type_id) COLLATE DATABASE_DEFAULT,
       CONCAT(TYPE_NAME(c.user_type_id) COLLATE DATABASE_DEFAULT,
              CASE WHEN TYPE_NAME(c.user_type_id) IN (N'nvarchar', N'nchar')
                       THEN CONCAT(N'(', IIF(c.max_length = -1, N'max', CAST(c.max_length / 2 AS nvarchar(10))), N')')
                   WHEN TYPE_NAME(c.user_type_id) IN (N'varbinary', N'binary')
                       THEN CONCAT(N'(', IIF(c.max_length = -1, N'max', CAST(c.max_length AS nvarchar(10))), N')')
                   WHEN TYPE_NAME(c.user_type_id) IN (N'decimal', N'numeric')
                       THEN CONCAT(N'(', c.precision, N',', c.scale, N')')
                   WHEN TYPE_NAME(c.user_type_id) = N'datetime2'
                       THEN CONCAT(N'(', c.scale, N')')
                   ELSE N'' END),
       CASE WHEN c.max_length = -1 THEN -1
            WHEN TYPE_NAME(c.user_type_id) LIKE N'n%' THEN c.max_length / 2
            ELSE c.max_length END,
       c.precision, c.scale, c.collation_name COLLATE DATABASE_DEFAULT,
       c.is_computed, ISNULL(cc.is_persisted, 0), c.is_identity, c.is_nullable
FROM sys.columns AS c
JOIN sys.tables AS t ON t.object_id = c.object_id
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
LEFT JOIN sys.computed_columns AS cc ON cc.object_id = c.object_id AND cc.column_id = c.column_id
WHERE t.is_ms_shipped = 0 AND s.name <> N'gecmis';

/* ---------------------------------------------------------------- CD-TIP */
DECLARE @Kural TABLE (Kalip nvarchar(60) COLLATE DATABASE_DEFAULT,
                      TamMi bit, BeklenenTip nvarchar(40) COLLATE DATABASE_DEFAULT);
INSERT @Kural (Kalip, TamMi, BeklenenTip) VALUES
    (N'Kimlik',        0, N'uniqueidentifier'),
    (N'%Zamani',       0, N'datetime2(3)'),
    (N'%Tarihi',       0, N'date'),
    (N'%Orani',        0, N'decimal(7,4)'),
    (N'%Ozeti',        0, N'binary(32)'),
    (N'%Sifreli',      0, N'varbinary(512)'),
    (N'%Maskeli',      0, N'nvarchar(40)'),
    (N'Numara',        1, N'nvarchar(10)'),
    (N'KayitNo',       1, N'bigint'),
    (N'SatirSurumu',   1, N'timestamp'),
    (N'Sira',          1, N'smallint'),
    (N'SifreKaydi',    1, N'nvarchar(255)'),
    (N'TelefonE164',   0, N'nvarchar(16)'),
    (N'TelefonUlusal', 0, N'nvarchar(15)'),
    (N'Eposta',        0, N'nvarchar(254)'),
    (N'IpAdresi',      0, N'nvarchar(45)'),
    (N'UygulamaSurumu',0, N'nvarchar(20)'),
    (N'Km',            1, N'decimal(9,1)');

INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-TIP', CONCAT(k.TamAd, N' ', k.TamTip, N' — beklenen ', r.BeklenenTip)
FROM @Kolon AS k
JOIN @Kural AS r ON (r.TamMi = 1 AND k.Kolon = r.Kalip) OR (r.TamMi = 0 AND k.Kolon LIKE r.Kalip)
WHERE k.TamTip <> r.BeklenenTip
  /* Arac sozlesmesi: dbo.SemaGecmisi.Kimlik int IDENTITY (tasarim.md 7.2). */
  AND NOT (k.TamAd = N'dbo.SemaGecmisi.Kimlik');

/* Para ekleri decimal(18,2) */
INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-TIP', CONCAT(k.TamAd, N' ', k.TamTip, N' — para kolonu decimal(18,2) olmalı')
FROM @Kolon AS k
WHERE (k.Kolon = N'Tutar' OR k.Kolon LIKE N'%Tutar' OR k.Kolon LIKE N'%Tutari'
       OR k.Kolon LIKE N'%Toplam' OR k.Kolon LIKE N'%Toplami'
       OR k.Kolon LIKE N'%Fiyat' OR k.Kolon LIKE N'%Fiyati')
  AND k.TamTip <> N'decimal(18,2)';

/* Arama kolonu kalici hesaplanmis olmali */
INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-TIP', CONCAT(k.TamAd, N' — %Arama kolonu kalıcı hesaplanmış olmalı')
FROM @Kolon AS k
WHERE k.Kolon LIKE N'%Arama' AND (k.Hesaplanmis = 0 OR k.Kalici = 0);

/* uniqueidentifier kolonlarin adi Kimlik ile biter (1.3.2 ek kural) */
INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-TIP', CONCAT(k.TamAd, N' — uniqueidentifier kolonun adı Kimlik ile bitmeli')
FROM @Kolon AS k
WHERE k.Tip = N'uniqueidentifier' AND k.Kolon NOT LIKE N'%Kimlik'
  AND k.TamAd NOT IN (N'sistem.TekrarAnahtari.Anahtar', N'entegrasyon.BelgeBagi.Ettn');

/* nvarchar(max) yalniz belirtilen yerlerde */
INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-TIP', CONCAT(k.TamAd, N' — nvarchar(max) yalnız …Json, sistem.Giden.Govde, katalog.Urun.Aciklama, katalog.UrunCevirisi.Aciklama')
FROM @Kolon AS k
WHERE k.Tip = N'nvarchar' AND k.Uzunluk = -1
  AND k.Kolon NOT LIKE N'%Json'
  AND k.TamAd NOT IN (N'sistem.Giden.Govde', N'katalog.Urun.Aciklama', N'katalog.UrunCevirisi.Aciklama');

/* --------------------------------------------------------- CD-HARMANLAMA */
INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-HARMANLAMA', CONCAT(k.TamAd, N' — harmanlama ', ISNULL(k.Harmanlama, N'(yok)'))
FROM @Kolon AS k
WHERE k.Tip IN (N'nvarchar', N'nchar')
  AND ISNULL(k.Harmanlama, N'') NOT IN (N'Turkish_100_CI_AS', N'Latin1_General_100_CI_AS', N'Latin1_General_100_BIN2');

/* Kod benzeri kolonlar BIN2 (Bolum 1.4.1 madde 4) */
INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-HARMANLAMA', CONCAT(k.TamAd, N' — kod benzeri kolon BIN2 olmalı, ', ISNULL(k.Harmanlama, N'(yok)'))
FROM @Kolon AS k
WHERE k.Tip = N'nvarchar'
  AND ISNULL(k.Harmanlama, N'') <> N'Latin1_General_100_BIN2'
  AND (k.Kolon = N'Kod' OR (k.Kolon LIKE N'%Kodu' AND k.Kolon NOT IN (N'IlKodu', N'IlceKodu'))
       /* Anahtar ve Deger yalnız sistem.Ayar'da kod benzeridir (1.4.1 madde 4
          "Anahtar (ayar), Deger (ayar)"); başka tablolardaki Deger insan
          metnidir ve Türkçe harmanlama alır. */
       OR k.TamAd IN (N'sistem.Ayar.Anahtar', N'sistem.Ayar.Deger')
       OR k.Kolon IN (N'Numara', N'NumaraOneki', N'Onek', N'SeriNo', N'SeriNoYazildigiGibi', N'SeriOneki',
                      N'GirisAdi', N'GirisAdiBeyani', N'CariKodu', N'MalzemeKodu', N'LogoMalzemeKodu',
                      N'BelgeNo', N'TakipNo', N'DisKayitNo', N'EskiKayitNo', N'EskiNumara',
                      N'CihazNumarasi', N'IlgiliNumara', N'SablonKodu',
                      N'BaslikAnahtari', N'MetinAnahtari', N'IslemKodu', N'UygulamaSurumu',
                      N'IsletimSistemiSurumu', N'IpAdresi', N'KullaniciAjani', N'MimeTuru',
                      N'DepolamaYolu', N'SohbetAnahtari', N'BilgiKaydiNo', N'SaglayiciMesajNo',
                      N'PushJetonu', N'Surum', N'ListeAdi', N'AlanAdi', N'EskiDeger', N'YeniKod',
                      N'Ikon', N'Ton', N'Sembol', N'KilavuzDilleri', N'Govde', N'Konu',
                      N'AliciAdres', N'SonHata', N'HataMesaji', N'KaynakDosyaAdi', N'OrijinalAd',
                      N'SifreKaydi')
       OR k.Kolon LIKE N'%Maskeli' OR k.Kolon LIKE N'%TelefonE164' OR k.Kolon LIKE N'%TelefonUlusal'
       OR k.Kolon LIKE N'%Json' OR k.Kolon LIKE N'%Url' OR k.Kolon LIKE N'%Yolu');

/* -------------------------------------------------------------- CD-ARAMA */
/* Ifade Bolum 1.4.3'tekiyle ayni olmali: BIN2, 18 REPLACE, LOWER, CAST. */
INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-ARAMA', CONCAT(s.name COLLATE DATABASE_DEFAULT, N'.', t.name COLLATE DATABASE_DEFAULT, N'.',
                           cc.name COLLATE DATABASE_DEFAULT, N' — ifade 1.4.3''teki gibi değil')
FROM sys.computed_columns AS cc
JOIN sys.tables AS t ON t.object_id = cc.object_id
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
WHERE cc.name LIKE N'%Arama'
  AND (cc.definition NOT LIKE N'%Latin1_General_100_BIN2%'
       OR cc.definition NOT LIKE N'%lower%'
       OR (LEN(cc.definition) - LEN(REPLACE(cc.definition COLLATE Latin1_General_100_CI_AS, N'replace', N''))) / 7 <> 18);

/* -------------------------------------------------------- CD-FK-DIZIN */
INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-FK-DIZIN', CONCAT(fk.name COLLATE DATABASE_DEFAULT, N' — öndeki kolonu dizinle karşılanmıyor')
FROM sys.foreign_keys AS fk
JOIN sys.tables AS t ON t.object_id = fk.parent_object_id
WHERE NOT EXISTS (
    SELECT 1
    FROM sys.index_columns AS ic
    JOIN sys.foreign_key_columns AS fkc
      ON fkc.constraint_object_id = fk.object_id AND fkc.constraint_column_id = 1
    WHERE ic.object_id = fk.parent_object_id
      AND ic.key_ordinal = 1
      AND ic.is_included_column = 0
      AND ic.column_id = fkc.parent_column_id);

/* ---------------------------------------------------------- CD-UX-NULL */
INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-UX-NULL', CONCAT(s.name COLLATE DATABASE_DEFAULT, N'.', t.name COLLATE DATABASE_DEFAULT, N'.',
                             i.name COLLATE DATABASE_DEFAULT, N' — ', c.name COLLATE DATABASE_DEFAULT,
                             N' boş olabilir ama süzgeçte IS [NOT] NULL yok')
FROM sys.indexes AS i
JOIN sys.tables AS t ON t.object_id = i.object_id
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
JOIN sys.index_columns AS ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0
JOIN sys.columns AS c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
/* CHARINDEX, LIKE değil: süzgeç metni kolon adını köşeli parantezle yazar
   ve LIKE'ta köşeli parantez karakter kümesi anlamına gelir. */
WHERE i.is_unique = 1 AND i.has_filter = 1 AND c.is_nullable = 1 AND s.name <> N'gecmis'
  AND CHARINDEX(CONCAT(N'[', c.name COLLATE DATABASE_DEFAULT, N'] IS NOT NULL'),
                i.filter_definition COLLATE DATABASE_DEFAULT) = 0
  AND CHARINDEX(CONCAT(N'[', c.name COLLATE DATABASE_DEFAULT, N'] IS NULL'),
                i.filter_definition COLLATE DATABASE_DEFAULT) = 0;

/* ---------------------------------------------------------- CD-ACIKLAMA */
INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-ACIKLAMA', CONCAT(N'şema ', s.name COLLATE DATABASE_DEFAULT, N' — açıklaması yok')
FROM sys.schemas AS s
WHERE s.schema_id BETWEEN 5 AND 16383 AND s.name NOT IN (N'gecmis', N'guest')
  AND NOT EXISTS (SELECT 1 FROM sys.extended_properties AS e
                  WHERE e.class = 3 AND e.major_id = s.schema_id AND e.name = N'MS_Description');

INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-ACIKLAMA', CONCAT(o.tur, N' ', o.ad, N' — açıklaması yok')
FROM (
    SELECT N'tablo' AS tur, CONCAT(s.name COLLATE DATABASE_DEFAULT, N'.', t.name COLLATE DATABASE_DEFAULT) AS ad,
           t.object_id AS anahtar, 0 AS alt
    FROM sys.tables AS t JOIN sys.schemas AS s ON s.schema_id = t.schema_id
    WHERE t.is_ms_shipped = 0 AND s.name <> N'gecmis'
    UNION ALL
    SELECT N'görünüm', CONCAT(s.name COLLATE DATABASE_DEFAULT, N'.', v.name COLLATE DATABASE_DEFAULT), v.object_id, 0
    FROM sys.views AS v JOIN sys.schemas AS s ON s.schema_id = v.schema_id
    WHERE v.is_ms_shipped = 0
    UNION ALL
    SELECT N'modül', CONCAT(s.name COLLATE DATABASE_DEFAULT, N'.', p.name COLLATE DATABASE_DEFAULT), p.object_id, 0
    FROM sys.objects AS p JOIN sys.schemas AS s ON s.schema_id = p.schema_id
    WHERE p.type IN ('P', 'FN', 'IF', 'TF', 'TR') AND p.is_ms_shipped = 0
) AS o
WHERE NOT EXISTS (SELECT 1 FROM sys.extended_properties AS e
                  WHERE e.class = 1 AND e.major_id = o.anahtar AND e.minor_id = 0 AND e.name = N'MS_Description');

INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-ACIKLAMA', CONCAT(N'kolon ', k.TamAd, N' — açıklaması yok')
FROM @Kolon AS k
JOIN sys.tables AS t ON t.name COLLATE DATABASE_DEFAULT = k.Tablo AND SCHEMA_NAME(t.schema_id) COLLATE DATABASE_DEFAULT = k.Sema
JOIN sys.columns AS c ON c.object_id = t.object_id AND c.name COLLATE DATABASE_DEFAULT = k.Kolon
WHERE NOT EXISTS (SELECT 1 FROM sys.extended_properties AS e
                  WHERE e.class = 1 AND e.major_id = t.object_id AND e.minor_id = c.column_id AND e.name = N'MS_Description');

INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-ACIKLAMA', CONCAT(N'görünüm kolonu ', SCHEMA_NAME(v.schema_id) COLLATE DATABASE_DEFAULT, N'.',
                              v.name COLLATE DATABASE_DEFAULT, N'.', c.name COLLATE DATABASE_DEFAULT, N' — açıklaması yok')
FROM sys.views AS v
JOIN sys.columns AS c ON c.object_id = v.object_id
WHERE v.is_ms_shipped = 0
  AND NOT EXISTS (SELECT 1 FROM sys.extended_properties AS e
                  WHERE e.class = 1 AND e.major_id = v.object_id AND e.minor_id = c.column_id AND e.name = N'MS_Description');

INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-ACIKLAMA', CONCAT(N'parametre ', SCHEMA_NAME(o.schema_id) COLLATE DATABASE_DEFAULT, N'.',
                              o.name COLLATE DATABASE_DEFAULT, N' ', p.name COLLATE DATABASE_DEFAULT, N' — açıklaması yok')
FROM sys.parameters AS p
JOIN sys.objects AS o ON o.object_id = p.object_id
WHERE o.type IN ('P', 'FN', 'IF', 'TF') AND o.is_ms_shipped = 0 AND p.parameter_id > 0
  AND NOT EXISTS (SELECT 1 FROM sys.extended_properties AS e
                  WHERE e.class = 2 AND e.major_id = o.object_id AND e.minor_id = p.parameter_id AND e.name = N'MS_Description');

/* ------------------------------------------------------------- CD-YETKI */
INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-YETKI', CONCAT(s.name COLLATE DATABASE_DEFAULT, N'.', t.name COLLATE DATABASE_DEFAULT,
                           N' — rol_uygulama için ne GRANT ne DENY var')
FROM sys.tables AS t
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
WHERE t.is_ms_shipped = 0 AND s.name NOT IN (N'gecmis', N'dbo')
  AND NOT EXISTS (
      SELECT 1 FROM sys.database_permissions AS pm
      JOIN sys.database_principals AS dp ON dp.principal_id = pm.grantee_principal_id
      WHERE dp.name = N'rol_uygulama'
        AND ((pm.class = 1 AND pm.major_id = t.object_id) OR (pm.class = 3 AND pm.major_id = s.schema_id)));

INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-YETKI', N'rol_yonetici veritabanı düzeyi DENY INSERT/UPDATE/DELETE eksik'
WHERE (SELECT COUNT(*) FROM sys.database_permissions AS pm
       JOIN sys.database_principals AS dp ON dp.principal_id = pm.grantee_principal_id
       WHERE dp.name = N'rol_yonetici' AND pm.class = 0 AND pm.state_desc = N'DENY'
         AND pm.permission_name IN (N'INSERT', N'UPDATE', N'DELETE')) <> 3;

/* rol_rapor SELECT izinleri Bolum 4.2 listesiyle birebir ayni */
DECLARE @RaporGorunum TABLE (Ad nvarchar(128) COLLATE DATABASE_DEFAULT PRIMARY KEY);
INSERT @RaporGorunum (Ad) VALUES
    (N'Bugun'), (N'TalepIstatistigi'), (N'HakEdisListesi'), (N'ServisHesapHareketleri'),
    (N'ServisBakiyesi'), (N'DuyuruListesi'), (N'KontrolLogoCariKoduEksik'),
    (N'KontrolOnayBekleyenHakEdis'), (N'KontrolHakEdisToplamiUyusmuyor'),
    (N'KontrolHakEdisHareketiUyusmuyor'), (N'KontrolOdemeOnayiBekleyenParca'),
    (N'KontrolOdemeTutariUyusmayanParca'), (N'KontrolOdemeSuresiDolanParca'),
    (N'KontrolSeriBicimiUyumsuzMakine'), (N'KontrolServisiOlmayanSahipliMakine'),
    (N'KontrolKapanmamisDonem'), (N'MutabakatHakEdisLogo'), (N'MutabakatParcaLogo');

INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-YETKI', CONCAT(N'rol_rapor SELECT fazlası: ', OBJECT_NAME(pm.major_id) COLLATE DATABASE_DEFAULT)
FROM sys.database_permissions AS pm
JOIN sys.database_principals AS dp ON dp.principal_id = pm.grantee_principal_id
WHERE dp.name = N'rol_rapor' AND pm.class = 1 AND pm.state_desc = N'GRANT' AND pm.permission_name = N'SELECT'
  AND OBJECT_NAME(pm.major_id) COLLATE DATABASE_DEFAULT NOT IN (SELECT Ad FROM @RaporGorunum);

INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-YETKI', CONCAT(N'rol_rapor SELECT eksiği: gorunum.', r.Ad)
FROM @RaporGorunum AS r
WHERE NOT EXISTS (
    SELECT 1 FROM sys.database_permissions AS pm
    JOIN sys.database_principals AS dp ON dp.principal_id = pm.grantee_principal_id
    WHERE dp.name = N'rol_rapor' AND pm.class = 1 AND pm.state_desc = N'GRANT'
      AND pm.permission_name = N'SELECT'
      AND pm.major_id = OBJECT_ID(CONCAT(N'gorunum.', r.Ad)));

/* -------------------------------------------------------- CD-RAPOR-KOLON */
INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-RAPOR-KOLON', CONCAT(N'gorunum.', r.Ad, N'.', c.name COLLATE DATABASE_DEFAULT, N' — kişisel kolon adı')
FROM @RaporGorunum AS r
JOIN sys.columns AS c ON c.object_id = OBJECT_ID(CONCAT(N'gorunum.', r.Ad))
WHERE c.name COLLATE DATABASE_DEFAULT LIKE N'%Telefon%' OR c.name COLLATE DATABASE_DEFAULT LIKE N'%Adres%'
   OR c.name COLLATE DATABASE_DEFAULT LIKE N'%Eposta%' OR c.name COLLATE DATABASE_DEFAULT LIKE N'%MusteriAdi%'
   OR c.name COLLATE DATABASE_DEFAULT LIKE N'%SahibiAdi%' OR c.name COLLATE DATABASE_DEFAULT LIKE N'%AdSoyad%'
   OR c.name COLLATE DATABASE_DEFAULT LIKE N'%Maskeli%' OR c.name COLLATE DATABASE_DEFAULT LIKE N'%Aciklama%'
   OR c.name COLLATE DATABASE_DEFAULT LIKE N'%Metin%' OR c.name COLLATE DATABASE_DEFAULT LIKE N'%Notu%'
   OR c.name COLLATE DATABASE_DEFAULT LIKE N'%Nedeni%';

/* ----------------------------------------------------------- CD-GORUNUM */
INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-GORUNUM', CONCAT(SCHEMA_NAME(v.schema_id) COLLATE DATABASE_DEFAULT, N'.',
                             v.name COLLATE DATABASE_DEFAULT, N'.', c.name COLLATE DATABASE_DEFAULT,
                             N' — ', CASE WHEN TYPE_NAME(c.user_type_id) = N'uniqueidentifier'
                                          THEN N'uniqueidentifier kolon' ELSE N'UTC …Zamani kolonu' END)
FROM sys.views AS v
JOIN sys.columns AS c ON c.object_id = v.object_id
WHERE SCHEMA_NAME(v.schema_id) = N'gorunum'
  AND (TYPE_NAME(c.user_type_id) = N'uniqueidentifier'
       OR (c.name COLLATE DATABASE_DEFAULT LIKE N'%Zamani'
           AND c.name COLLATE DATABASE_DEFAULT NOT LIKE N'%Turkiye'));

INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-GORUNUM', CONCAT(N'yardim.', o.name COLLATE DATABASE_DEFAULT, N'.', r.name COLLATE DATABASE_DEFAULT,
                             N' — sonuç kümesinde ',
                             CASE WHEN r.system_type_name = N'uniqueidentifier'
                                  THEN N'uniqueidentifier kolon' ELSE N'UTC …Zamani kolonu' END)
FROM sys.objects AS o
CROSS APPLY sys.dm_exec_describe_first_result_set_for_object(o.object_id, 0) AS r
WHERE o.type = 'P' AND SCHEMA_NAME(o.schema_id) = N'yardim'
  AND r.name IS NOT NULL
  AND (r.system_type_name = N'uniqueidentifier'
       OR (r.name COLLATE DATABASE_DEFAULT LIKE N'%Zamani'
           AND r.name COLLATE DATABASE_DEFAULT NOT LIKE N'%Turkiye'));

/* ---------------------------------------------------------- CD-TEMPORAL */
DECLARE @Temporal TABLE (Ad nvarchar(256) COLLATE DATABASE_DEFAULT PRIMARY KEY);
INSERT @Temporal (Ad) VALUES
    (N'katalog.Marka'), (N'katalog.Urun'), (N'katalog.Parca'), (N'sirket.Sirket'),
    (N'sirket.BankaHesabi'), (N'personel.Personel'), (N'erisim.Rol'), (N'erisim.RolIzin'),
    (N'bayi.Bayi'), (N'bayi.MarkaYetkisi'), (N'servis.Servis'), (N'servis.BayiBagi'),
    (N'servis.Bolge'), (N'servis.MarkaYetkisi'), (N'sistem.Ayar'), (N'hakedis.Tarife');

INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-TEMPORAL', CONCAT(CONCAT(s.name COLLATE DATABASE_DEFAULT, N'.', t.name COLLATE DATABASE_DEFAULT),
                              N' — listede olmayan sistem sürümlü tablo')
FROM sys.tables AS t JOIN sys.schemas AS s ON s.schema_id = t.schema_id
WHERE t.temporal_type = 2
  AND CONCAT(s.name COLLATE DATABASE_DEFAULT, N'.', t.name COLLATE DATABASE_DEFAULT) NOT IN (SELECT Ad FROM @Temporal);

INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-TEMPORAL', CONCAT(m.Ad, N' — sistem sürümlü değil ya da geçmiş tablosu gecmis.<sema>_<Tablo> değil')
FROM @Temporal AS m
WHERE NOT EXISTS (
    SELECT 1 FROM sys.tables AS t
    JOIN sys.schemas AS s ON s.schema_id = t.schema_id
    JOIN sys.tables AS h ON h.object_id = t.history_table_id
    JOIN sys.schemas AS hs ON hs.schema_id = h.schema_id
    WHERE t.temporal_type = 2
      AND CONCAT(s.name COLLATE DATABASE_DEFAULT, N'.', t.name COLLATE DATABASE_DEFAULT) = m.Ad
      AND hs.name = N'gecmis'
      AND h.name COLLATE DATABASE_DEFAULT = REPLACE(m.Ad, N'.', N'_'));

/* ------------------------------------------------------------- CD-CK-IN */
INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-CK-IN', CONCAT(cc.name COLLATE DATABASE_DEFAULT, N' — CHECK içinde IN (…), izinli liste dışında')
FROM sys.check_constraints AS cc
WHERE cc.definition LIKE N'% IN (%'
  AND cc.name COLLATE DATABASE_DEFAULT NOT LIKE N'%_Yapan'
  AND cc.name COLLATE DATABASE_DEFAULT NOT LIKE N'%_Alici'
  AND cc.name COLLATE DATABASE_DEFAULT NOT LIKE N'%Atama%'
  AND cc.name COLLATE DATABASE_DEFAULT NOT LIKE N'%Gizli%';

/* ------------------------------------------------------------ CD-CEVIRI */
INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-CEVIRI', CONCAT(N'kod.Ceviri ', c.ListeAdi, N' — liste gerçek tablo değil')
FROM kod.Ceviri AS c WHERE OBJECT_ID(c.ListeAdi) IS NULL;

INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-CEVIRI', CONCAT(N'kod.Ceviri ', c.ListeAdi, N'.', c.AlanAdi, N' — alan o tablonun kolonu değil')
FROM kod.Ceviri AS c
WHERE OBJECT_ID(c.ListeAdi) IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM sys.columns AS k
                  WHERE k.object_id = OBJECT_ID(c.ListeAdi)
                    AND k.name COLLATE DATABASE_DEFAULT = c.AlanAdi COLLATE DATABASE_DEFAULT);

INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-CEVIRI', CONCAT(N'kod.EskiDegerEslesmesi ', e.ListeAdi, N' — liste gerçek tablo değil')
FROM kod.EskiDegerEslesmesi AS e WHERE OBJECT_ID(e.ListeAdi) IS NULL;

/* ------------------------------------------------------------- CD-SAHIP */
INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-SAHIP', CONCAT(N'şema ', s.name COLLATE DATABASE_DEFAULT, N' sahibi dbo değil')
FROM sys.schemas AS s
WHERE s.schema_id BETWEEN 5 AND 16383 AND s.name <> N'guest'
  AND USER_NAME(s.principal_id) <> N'dbo';

INSERT @Sonuc (Denetim, Sorun)
SELECT N'CD-SAHIP', CONCAT(SCHEMA_NAME(o.schema_id) COLLATE DATABASE_DEFAULT, N'.',
                           o.name COLLATE DATABASE_DEFAULT, N' — nesne sahibi ayrı')
FROM sys.objects AS o
WHERE o.is_ms_shipped = 0 AND o.principal_id IS NOT NULL AND USER_NAME(o.principal_id) <> N'dbo';

SELECT Denetim, Sorun FROM @Sonuc ORDER BY Denetim, Sorun FOR JSON PATH;
`

/**
 * Kurulmuş veritabanını denetler (tasarim.md 7.2).
 * @param {object} ayar ortamYukle() sonucu
 * @returns {Promise<string[]>} sorun listesi; boşsa temiz
 */
export async function canliDenetim(ayar) {
  const { sqlcmd, sqlHatasi } = await import('./sqlcmd.mjs')
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const gecici = mkdtempSync(join(tmpdir(), 'paksan-cd-'))

  /* Sorgular DOSYADAN çalıştırılır: canlı denetim betiği birkaç KB'dir ve
     komut satırına (-Q) sığmaz; satır başındaki tire de sqlcmd'nin
     ayrıştırıcısını bozar. */
  const jsonCalistir = (ad, sorgu) => {
    const dosya = join(gecici, `${ad}.sql`)
    writeFileSync(dosya, `SET NOCOUNT ON;\n${sorgu}\n`, 'utf8')
    const r = sqlcmd({ ayar, giris: 'sahip', dosya, json: true })
    if (r.kod !== 0) throw new Error(sqlHatasi(r))
    const metin = r.cikti.split(/\r?\n/).join('').trim()
    return metin ? JSON.parse(metin) : []
  }

  let sorunlar
  let sqlSonuc
  try {
    sorunlar = jsonCalistir('canli', CANLI_SORGU).map((x) => `${x.Denetim}: ${x.Sorun}`)

  /* CD-SADELESTIR: SQL işlevi ile JavaScript aynı sonucu vermeli. */
  const birlesim = SADELESTIR_GIRDILERI.map(
    (g, i) =>
      `SELECT ${i} AS Sira, Kod, Rakam, TelefonE164, TelefonUlusal, GirisAdi, Arama
       FROM yardim.Sadelestir(N'${g.replace(/'/g, "''")}')`,
  ).join(' UNION ALL ')
    sqlSonuc = jsonCalistir(
      'sadelestir',
      `SELECT * FROM (${birlesim}) AS x ORDER BY Sira FOR JSON PATH, INCLUDE_NULL_VALUES`,
    )
  } finally {
    rmSync(gecici, { recursive: true, force: true })
  }
  for (const satir of sqlSonuc) {
    const girdi = SADELESTIR_GIRDILERI[satir.Sira]
    const js = sadelestir(girdi)
    for (const alan of ['Kod', 'Rakam', 'TelefonE164', 'TelefonUlusal', 'GirisAdi', 'Arama']) {
      const sql = satir[alan] ?? null
      const bizim = js[alan] ?? null
      if (sql !== bizim) {
        sorunlar.push(
          `CD-SADELESTIR: "${girdi}" ${alan} — SQL ${JSON.stringify(sql)}, JavaScript ${JSON.stringify(bizim)}`,
        )
      }
    }
  }
  return sorunlar
}

/* Doğrudan çalıştırılırsa sonucu basar. */
if (process.argv[1] && process.argv[1].endsWith('denetle.mjs')) {
  const u = yerTutucuUyarilari()
  if (u.length) console.log('Uyarı:\n' + u.join('\n'))
  const s = statikDenetim()
  if (s.length) {
    console.log(s.join('\n'))
    process.exit(1)
  }
  console.log('SQL statik denetimi temiz.')
}
