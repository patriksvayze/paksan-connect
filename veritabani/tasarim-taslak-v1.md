<!-- İLK TASLAK (16.09.2026, İngilizce çalışma notu). Onaylanan planla şu adlar değişti: kurum→sirket/personel, kimlik→erisim, taraf→servis/bayi, rapor→gorunum; kod listelerinde AdTr/AdEn → Ad + kod.Ceviri; Sirket tek satır değil. Son hâl: veritabani/tasarim.md -->

# PAKSAN Database Foundation: Implementation Plan

This covers only the database foundation: schema, seeds, the migration runner, the data dictionary and verification. It changes no app code. Identifiers are Turkish ASCII.

---

## 0. What I checked, and findings that change the brief

- **Local instance.** I ran read-only queries.
  - Server collation is `Turkish_CI_AS` (so tempdb uses it too). The server is 17.0.1000.7 Enterprise Evaluation, Windows-auth only, and `Pc\Pc` is sysadmin.
  - `sys.databases` shows **only the 4 system databases**. `e_ticaret_db` and `UniversiteDB` are not on MSSQLSERVER; they are probably on another instance. The runner will allow a fixed list of database names anyway.
  - SSMS 22 is installed. `SQLServerManager17.msc` exists. sqlcmd is the ODBC build, version 17.0.1000.7.
- **sqlcmd pitfalls:**
  - It starts with `QUOTED_IDENTIFIER OFF`. Filtered indexes and computed-column indexes fail without `-I`, so `-I` is mandatory.
  - It reads files in the OEM codepage unless given `-f 65001`.
- **Code lists that only exist as local constants in JSX** (not importable from Node):
  - `IPTAL_SEBEPLERI` (src/backoffice/ekranlar/Talepler.jsx:3052), with 6 items
  - `IPTAL_NEDENLERI` (src/servis/ekranlar/TalepDetay.jsx:1072), with 4 different items
  - quote results (Talepler.jsx:1910)
  - audit filter labels `TURLER` (IslemKaydi.jsx:28)

  The seed generator must extract these literals. The two cancel lists get merged.
- **Other facts:**
  - The permission catalog has **17** ids (src/data/yetkiler.js).
  - `BILDIRIM` permission values are `verildi | reddedildi | sorulmadi | desteklenmiyor | engelli` (src/lib/bildirim.js:41).
  - Maintenance templates are shared per family (`BAKIM.balya/yem/silaj/toprak`, products.js:26).
  - The export flow (`ihracat`) sends email, which needs an outbox.
- **Device keys missing from the inventory** (each gets a decision in B and in `eslesme.json`): `chats`, `rehberIsaret`, `hatirla`, `servisHatirla`, `tema`, `talep--vurgu`, `alan-vurgu`, `demoSurumu`, `yayinlananBildirimler`, `gizlenenTalepler`, `sayaclar`.
- **Numbering conflict.** The multi-brand plan (serene-tickling-possum.md) already claims `dogrula` section 13 ("Ürün markası kaydı"). Decision: the DB check takes the next free number when it is implemented. If the brand plan is still pending, the DB check becomes 13 and I update the plan file to say 14.

---

## A. Conventions (decisions)

**A1. Database names and environments**
- `Paksan_Yerel` (this PC), `Paksan_Sinama1`/`Paksan_Sinama2` (throwaway, verification only), `Paksan_Test` (VPS rehearsal), `Paksan_Canli` (VPS; the pilot is its first period).
- The runner only allows names matching `^Paksan_(Yerel|Test|Canli|Sinama\d)$`.
- Each database carries an environment marker row, `sistem.Ortam`, with `OrtamKodu ∈ yerel|sinama|test|canli`. It is written once by the setup script and protected by a trigger. It is also written as the database extended property `PaksanOrtam`.
- The runner aborts if the env file's environment differs from the marker.
- Test and live on the same VPS is acceptable if they have separate databases and separate logins; a separate instance is preferred.

**A2. Schemas (domain-based)**

`sistem`, `kod`, `cografya`, `kurum`, `katalog`, `kimlik`, `musteri`, `kvkk`, `taraf` (dealers and services), `makine`, `talep`, `hakedis`, `duyuru`, `bildirim`, `destek`, `dosya`, `denetim`, `entegrasyon`, `rapor` (views only), `gecmis` (temporal history tables). `dbo` holds only runner objects.

**A3. Naming style**
- PascalCase Turkish ASCII, singular table names (`talep.DurumGecmisi`).
- Column suffixes:
  - `…Kimlik` = uniqueidentifier FK
  - `…Kodu` = code, varchar BIN2, FK to a code table or CHECK
  - `…Zamani` = UTC instant, datetime2(3)
  - `…Tarihi` = calendar date in Turkey, `date`
  - `…Tutari`/`Tutar` = decimal(18,2)
  - `…Orani` = decimal(7,4)
  - `…Sifreli` = varbinary; `…Arama` = binary(32) HMAC; `…Maskeli` = varchar
  - `SatirSurumu` = rowversion
- Constraint names: `PK_Sema_Tablo`, `FK_Tablo_Hedef_Kolon`, `UQ_`, `CK_`, `DF_`, `IX_`, `CX_`.
- No Turkish characters in identifiers. Every table and column gets an `MS_Description`.

**A4. Collation**
- Database default is **`Turkish_100_CI_AS`**, explicitly set in `CREATE DATABASE`. Forgotten text columns then sort and compare correctly for Turkish. PAKSAN IT already knows this collation from LOGO.
- **Code-like columns** use explicit `COLLATE Latin1_General_100_BIN2`: codes, numbers, serials, part codes, login names, E.164 phones, LOGO codes, masked values. This makes comparison exact, ASCII-range `LIKE` patterns reliable, and removes the Turkish i/I trap.
- **Accent-folded search** uses persisted computed columns `…Arama` (for example `AdArama`). The expression is nested `REPLACE` of the 12 Turkish letters (ç ğ ı İ ö ş ü and their capitals) to ASCII, then `LOWER`, `COLLATE Latin1_General_100_BIN2`. It is deterministic, indexable and has no UDF. Search uses `LIKE N'%x%'` on it. No full-text search (not in plain Express or the default Linux install).
- **Identifier rule:** always write object names in exact case. A Turkish-collation database treats `Il` vs `il` as different because i upper-cases to İ. The lint (D10) flags case mismatches against `sys.objects`.
- **Temp tables:** avoid `#temp`. If one is used, every character column gets `COLLATE DATABASE_DEFAULT` (the VPS tempdb collation is unknown).

**A5. Primary keys (one choice)**

Entity tables:
- `Kimlik uniqueidentifier NOT NULL DEFAULT NEWID()` is the **PRIMARY KEY NONCLUSTERED**.
- `Sira bigint IDENTITY(1,1)` has a **UNIQUE CLUSTERED** index.
- Clients (phones) send UUIDv7 values in `Kimlik` for offline creation (KOD 4.1.1, 4.1.4). The API generates UUIDv7 for server-created rows; `NEWID()` is only a fallback for scripts.
- **Idempotency for creates is the PK itself.** A duplicate insert raises 2627, and the API returns the existing row after checking ownership.
- Commands that are not plain inserts (approve, status change) use `sistem.TekrarAnahtari`.

Why not the alternatives:
- A clustered GUID: SQL Server orders uniqueidentifier by its last 6 bytes, so UUIDv7's time prefix gives random insert order.
- `NEWSEQUENTIALID`: server-only, which breaks offline ids.
- A bigint PK with a GUID alternate key: two ids everywhere, and API translation on every link.

Cost: 16-byte FKs and one extra index per table, which is negligible below about 1M rows a year.

Code and catalog tables use natural keys, clustered (`Kod`, `(MarkaKodu, Kod)`). Link tables use a composite natural PK with no `Kimlik`. Reference rows that need a GUID (default roles) get deterministic UUIDv5 values computed by the generator, so every environment is identical.

**A6. Readable numbers**
- Table `sistem.NumaraOneki` (seeds SRV, YPR, TKF, SPS, HAK, TEL, GBD). Prefixes are checked as 3 letters A-Z with no O or I.
- Table `sistem.NumaraSayaci (Onek, Yil smallint, SonSira int CK 0..99999, PK(Onek,Yil))`.
- Procedure `sistem.NumaraAl @Onek, @Numara char(10) OUTPUT, @Zaman datetime2(3)=NULL`:
  - The year is `YEAR(ISNULL(@Zaman,SYSUTCDATETIME()) AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time')`. `@Zaman` is honored only when the environment is yerel or sinama (for tests).
  - It runs `UPDATE … WITH (UPDLOCK,ROWLOCK) SET SonSira+=1 OUTPUT inserted.SonSira`. If no row is updated, it inserts a row with 1, catching 2627/2601 and retrying the update. The row for a new year is created automatically, so no job is needed at year start.
  - It throws 51001 when the sequence passes 99999.
  - The result is `Onek + RIGHT(YY,2) + RIGHT('0000'+sira,5)`.
- The API calls it inside the same transaction as the insert. Gaps are allowed.
- Stored number columns are `char(10) BIN2 UNIQUE` with `CK LIKE '[A-Z][A-Z][A-Z][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'`. They are displayed as `SRV-26-00123`, which is the app's concern.
- The app has no SELECT/UPDATE permission on the counter table; only the procedure writes it (ownership chaining).

**A7. Time**
- `datetime2(3)` UTC, `DEFAULT SYSUTCDATETIME()` (matches JS millisecond precision).
- `datetimeoffset` is rejected: the offset would always be +00:00, it invites mixed offsets, and drivers map both to a JS Date anyway.
- Calendar facts (invoice date, delivery date, warranty) use `date` in Turkish local time.
- Records created on a device also store `IstemciOlusmaZamani` (informational; the server time is authoritative).

**A8. Money**
- `decimal(18,2)` plus `ParaBirimiKodu char(3)` (FK `kod.ParaBirimi`, seed `TRY` with legacy map `TL→TRY`).
- Rates are `decimal(7,4)`. No money stored as text; the legacy free text gets separate `…Metni` columns.
- Amounts have `CHECK ≥0`. Totals have consistency CHECKs, for example `GenelToplam = AraToplam + KdvTutari`.

**A9. Concurrency**
- The database runs with `READ_COMMITTED_SNAPSHOT ON`.
- `SatirSurumu rowversion` on mutable business rows: Talep, HakEdis, Hesap, Servis, Bayi, Personel, Kullanici, Makine, DonemDokumu, Duyuru, FaturaBilgisi, ServisZiyareti, TelefonDegisikligiTalebi, GeriBildirim.
- Approvals use `UPDATE … WHERE DurumKodu='bekliyor' AND SatirSurumu=@v`; 0 rows affected means someone else already acted.

**A10. History (per case)**
- **System-versioned temporal tables** (available in every edition since 2016) for non-customer master and configuration data: `katalog.Marka`, `katalog.Urun`, `katalog.Parca`, `kurum.Sirket`, `kurum.BankaHesabi`, `kurum.Personel`, `kimlik.Rol`, `kimlik.RolIzin`, `taraf.Bayi`, `taraf.Servis`, `taraf.ServisBayi`, `taraf.ServisBolgesi`, `taraf.ServisMarkaYetkisi`, `taraf.BayiMarkaYetkisi`, `sistem.Ayar`, `hakedis.Tarife`. History goes to `gecmis.<sema>_<Tablo>`. Period columns are `GecerlilikBaslangici/GecerlilikBitisi datetime2(7) … HIDDEN`.
- **Explicit history tables** where business periods matter: machine ownership, service assignment, phone history, request status history.
- **No temporal on customer-data tables** (Hesap, FaturaBilgisi, requests). Anonymizing temporal history would require turning system versioning off. Changes there go to the audit log without values.
- No `CASCADE` anywhere.

**A11. JSON columns** (nvarchar(max) with `CK ISJSON(x)=1`), only where justified:
- `bildirim.Bildirim.DegerlerJson`: i18n template parameters
- `denetim.IslemKaydi.AyrintiJson`: typed payload per event type
- `entegrasyon.LogoSeriSorgusu.CevapJson` and `IceAktarimSatiri.HamVeriJson`: raw external data
- `sistem.TekrarAnahtari.SonucJson`: cached response
- `sistem.Giden.DegiskenlerJson`
- `kvkk.MetinSurumu.IcerikJson`: sectioned legal text
- `sistem.Ayar.Deger` when its type is `json`

Everything else is normalized. PAKSAN corrections to parts lines are also normalized, not JSON.

**A12. Deletion, archiving and KVKK**
- **No hard delete of business rows.** Master data uses `Aktif`/`PasifZamani`/`DurumKodu`. Requests are cancelled, not deleted. Announcements are removed from publication (`YayindanKaldirmaZamani`) and archived.
- Receipts and files are marked invalid (`GecersizZamani`, `GecersizNedeni`).
- DELETE is granted only on true link or purge tables (listed in C).
- **Anonymization procedure `musteri.HesabiAnonimlestir @HesapKimlik`.** It sets to NULL or replaces:
  - `Hesap` phone, password hash, address and seller statement; `HesapKisisi` names and phones; `HesapTelefonGecmisi` phones
  - Request contact name, phone and address snapshots; all `FaturaBilgisi` personal fields
  - Feedback contact snapshot
  - Phone-change request phones and names
  - Push tokens; active sessions are closed
  - Outbox recipient addresses
  - Free text in support events of type `serbest`
  - Customer-uploaded files: sets `SilinmeIstendiZamani`, and the API job removes the file from disk. Receipts are kept per the retention decision.

  It keeps statistics (province, product, dates), consent events (legal proof) and the audit log. The audit log never stores customer names (`AktorAdi` is NULL for customers), so it needs no change. It sets `Hesap.DurumKodu='anonim'`.
- Login attempts store only an HMAC of the identifier, so they never need anonymizing.

**A13. Encryption of TC, VKN and IBAN**
- **App-level AES-256-GCM** blob in `…Sifreli varbinary(512)`. Layout: `[1 byte format][1 byte key no][12 byte IV][ciphertext][16 byte tag]`.
- Plus a **HMAC-SHA256 lookup** column `…Arama binary(32)` computed over the normalized value with a separate key, and `…Maskeli` (for example `*********45`) for list screens.
- Keys come from the VPS env file (`PAKSAN_VERI_ANAHTARI_<n>`, `PAKSAN_ARAMA_ANAHTARI`), outside the repo, with restricted permissions. An offline copy is held by PAKSAN IT; losing the key loses the data. The key number supports rotation.
- **Always Encrypted rejected:** the Node driver (tedious) has only partial support, its column master key store is awkward on Linux, deterministic mode leaks equality anyway, and sqlcmd scripting gets complicated.
- TDE is not relied on (not in Express); OS-level backup encryption is recommended instead.
- Company IBANs are public and stored in plain text.
- `node:crypto` covers AES-GCM and HMAC, so no npm package is needed.

**A14. Code lists**
- **One table per business list** in `kod`, all with the same shape: `Kod varchar(40) BIN2 PK`, `AdTr nvarchar(150) NULL`, `AdEn nvarchar(150) NULL`, `Sira smallint`, `Aktif bit DF 1`, `Aciklama nvarchar(400) NULL`, plus list-specific extra columns. Simple FKs, and non-developers can read them.
- **Purely technical state fields** that are never shown on screen use `CHECK … IN (…)` instead.
- **Legacy text maps** live in one table: `kod.EskiDegerEslesmesi (ListeAdi, EskiDeger nvarchar(200) BIN2, YeniKod, Not, PK(ListeAdi,EskiDeger))`.
- **Labels are copied verbatim from the existing src files** (text already approved through Codex); where no source label exists, `AdTr` stays NULL. There are no defaults on code columns, so an unknown value fails the FK; the only exception is `MarkaKodu DF 'paksan'`.

**A15. Actor and client metadata**

Business history and event rows carry a standard actor group, `[A]`:
- `AktorTuruKodu` (FK `kod.AktorTuru`: musteri|personel|servis|sistem|entegrasyon)
- `AktorKullaniciKimlik uid?` (FK `kimlik.Kullanici`), `AktorHesapKimlik uid?` (FK `musteri.Hesap`)
- `AktorAdi nvarchar(150)?` (name snapshot for staff/service; NULL for customers)
- `KaynakUygulamaKodu` (FK: connect|backoffice|servisim|api|betik|entegrasyon), `UygulamaSurumu varchar(20)?`
- A CHECK ties these together: personel/servis require the user FK; musteri requires the account FK and `AktorAdi` NULL; sistem requires both FKs NULL.

`denetim.IslemKaydi` uses the same columns without FKs (append-only independence).

No name snapshots on plain links (service, dealer); names come from temporal history when needed.

**A16. Version and edition guard**
- Minimum target is **SQL Server 2019, compatibility level 150**, set explicitly in every environment. Express, Standard, Windows and Linux are all supported.
- A lint rejects in `veritabani/**/*.sql`: `GREATEST`, `LEAST`, `DATETRUNC`, `JSON_OBJECT`, `JSON_ARRAY`, `GENERATE_SERIES`, `IS [NOT] DISTINCT FROM`, `REGEXP_`, native `json`/`vector` types, `LEDGER`, `MEMORY_OPTIMIZED`, `FILESTREAM`, `CREATE ASSEMBLY`, `xp_cmdshell`, `ENCRYPTED WITH`, `WITH (ONLINE`, `COMPRESSION`, `PARTITION`, `CREATE FULLTEXT`, `OPENROWSET`, `#temp` without `DATABASE_DEFAULT`, and a leading BOM.
- **SQL Ledger rejected:** it needs 2022+, and ledger tables are permanent. Append-only is enforced by DENY plus triggers instead.

**A17. Database options (setup script)**
- `COLLATE Turkish_100_CI_AS`, `COMPATIBILITY_LEVEL=150`
- `READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE`
- `AUTO_CLOSE OFF` (Express defaults it ON), `AUTO_SHRINK OFF`, `PAGE_VERIFY CHECKSUM`, `QUERY_STORE=ON`
- `RECOVERY SIMPLE` for yerel/sinama/test, `FULL` for canli
- File growth 64 MB
- Database owner is the `paksan_<ortam>_sahip` login (maps to dbo)
- Every schema is created `AUTHORIZATION dbo`
- Every script runs with `SET ANSI_NULLS, QUOTED_IDENTIFIER, ANSI_PADDING, ANSI_WARNINGS, ARITHABORT, CONCAT_NULL_YIELDS_NULL ON; NUMERIC_ROUNDABORT OFF`. The API phase must verify the driver's session settings match.

---

## B. Table catalog

**Legend**
- `[K]` = `Kimlik uid PK NONCLUSTERED DF NEWID()` + `Sira bigint IDENTITY` (CX)
- `[O]` = `OlusmaZamani dt DF SYSUTCDATETIME()`
- `[R]` = `SatirSurumu rowversion`
- `[A]` = actor group (A15)
- `[I]` = `IstemciOlusmaZamani dt?`
- `[E]` = `EskiKimlik k(64)?` + `EskiNumara k(20)?`
- `[T]` = temporal
- `[L]` = code-list shape (A14)
- `[Y]` = location group:
  - `KonumUlkeKodu char(2)` FK Ulke, `IlKodu tinyint?` FK Il, `IlceNo int?`
  - FK `(IlKodu,IlceNo)` → `cografya.Ilce`
  - `YurtdisiBolge m(100)?`, `YurtdisiIlce m(100)?`, `Adres m(500)?`
  - CK: TR requires the abroad fields to be NULL; non-TR requires `IlKodu` NULL
- `[F]` = phone group: `TelefonE164 k(16)?` with CK `LIKE '+[1-9]%'`, only digits after the +, length 8..16; plus `TelefonUlusal k(15)?` (national number, for search)

Types: `uid` = uniqueidentifier, `dt` = datetime2(3), `tarih` = date, `k(n)` = varchar(n) BIN2, `m(n)` = nvarchar(n), `para` = decimal(18,2), `oran` = decimal(7,4), `sif` = varbinary(512), `hmac` = binary(32), `?` = nullable, `F` = filtered index.

**Phase tags:** **[P]** needed at pilot, **[C]** needed before live, **[S]** later. All tables are created now.

### dbo (runner)
- **dbo.SemaGecmisi** [P]
  - Columns: `Kimlik int IDENTITY PK`, `BetikAdi m(260)`, `Tur char(1) CK V|R|T|B`, `Ozet char(64)` (SHA-256 hex), `UygulanmaZamani dt`, `SureMs int`, `Uygulayan sysname DF SUSER_SNAME()`, `Makine m(128)`.
  - UQ F `(BetikAdi) WHERE Tur='V'`.
  - Denied to app and report roles.
- **dbo.AciklamaYaz** `(@Sema,@Tablo,@Kolon=NULL,@Metin)`: add or update `MS_Description`.

### sistem
- **Ortam** [P]
  - Columns: `Kimlik tinyint PK CK=1`, `OrtamKodu k(10) CK`, `VeritabaniAdi sysname`, `KurulumZamani dt`, `KurulumMakinesi m(128)`, `OrnekVeriIzinli AS (CASE WHEN OrtamKodu IN('yerel','sinama') THEN 1 ELSE 0 END)`.
  - Trigger blocks UPDATE and DELETE for everyone. New table (KOD 5.3).
- **Ayar** [P][T]
  - Columns: `Anahtar k(80) PK`, `Deger m(4000)`, `DegerTuru CK tamsayi|ondalik|metin|mantiksal|json`, `Aciklama m(400)?`.
  - Source: `GECIKME_SAAT` 48, `TEKLIF_BEKLEME_GUN` 14, `SIFRE_BAGLANTI_SAAT` 24 (veri.js); `OTP_SURE` 120, `SIFRE_HANE` 6 (hesap.js); `EK_SINIR.*` (ekler.js); `LOGO.yeniSatisGun` 120; `KDV_ORANI` 0.2, `KDV_HARIC_LISTE` (para.js); `BANKA.aktif`, `aciklamaKalibi`; `IHRACAT.aktif`, `epostalar` (kimlik.js); support session silence 30 min (destekLog.js).
- **NumaraOneki** [P]
  - Columns: `Onek char(3) BIN2 PK` (CK pattern, no O/I), `KayitTuruKodu` FK, `Aciklama`.
  - Replaces the per-device `sayaclar`.
- **NumaraSayaci** [P]: see A6. **NumaraAl** procedure [P].
- **TekrarAnahtari** [P] (idempotency)
  - Columns: `Anahtar uid PK`, `AktorTuruKodu`, `AktorKimlik uid?`, `IslemKodu k(60)`, `IstekOzeti hmac`, `DurumKodu CK isleniyor|tamamlandi|hata`, `SonucJson?`, `[O]`, `SonGecerlilikZamani dt`.
  - IX `(SonGecerlilikZamani)`. DELETE granted (purge).
- **AktorAyarla** procedure [P]
  - Parameters: `@AktorTuru, @AktorKimlik, @AktorAdi, @KaynakUygulama, @UygulamaSurumu, @MusteriyeBildirildi`.
  - Wraps `sp_set_session_context`. Read by the status-history trigger. The API calls it per request; a connection-pool reset clears it — verify in the API phase.
- **Giden** [P] (transactional outbox)
  - Columns: `[K]`, `KanalKodu CK sms|eposta|push|webPush`, `AliciAdres m(400)?`, `AliciHesapKimlik?`, `AliciKullaniciKimlik?`, `CihazKimlik?`, `SablonKodu k(80)`, `DilKodu` FK, `DegiskenlerJson?`, `Konu m(300)?`, `Govde m(max)?`, `IlgiliKayitTuruKodu?`, `IlgiliKimlik uid?`, `DurumKodu CK bekliyor|gonderiliyor|gonderildi|hata|vazgecildi`, `DenemeSayisi tinyint`, `SonrakiDenemeZamani?`, `SonHata m(1000)?`, `SaglayiciMesajKimligi k(200)?`, `[O]`, `GonderilmeZamani?`.
  - IX F `(DurumKodu,SonrakiDenemeZamani) WHERE DurumKodu IN('bekliyor','hata')`.
  - Source: export email (ihracat.js), download-link SMS (ElleKayit), OTP SMS, staff password-link email, push.
- **GidenEki** [S]: `(GidenKimlik, DosyaKimlik)` PK.
- **IcerikPaketi** [C]
  - Columns: `(Kod k(60), Surum k(40)) PK`, `IcerikOzeti binary(32)`, `YayinZamani dt`, `Aciklama`.
  - Records which content package version was live (mobile_support_package.json, rehber, guvenlik, teknikOzellikler). The content itself stays as versioned files.
- **SaklamaKurali** [C]
  - Columns: `KayitTuruKodu PK`, `SureGun int?`, `EylemKodu CK anonimlestir|sil|sakla`, `HukukOnayli bit DF 0`, `Aciklama`.
  - Seeded with proposed defaults (H6).

### kod (all [P], shape [L], seeded by the generator)
- `Dil` (tr, en)
- `ParaBirimi` (+Sembol; TRY)
- `KaynakUygulama` (connect, backoffice, servisim, api, betik, entegrasyon; legacy app→connect, servis→servisim)
- `AktorTuru`
- `KayitTuru` (talep, hesap, makine, servis, bayi, personel, rol, duyuru, bildirim, geriBildirim, telefonDegisikligi, hakEdis, donemDokumu, dosya, ayar, kvkkBasvurusu, iceAktarim, oturum)
- `IslemKategorisi`
  - Codes and labels from IslemKaydi.jsx `TURLER`: talep, durum, not, odeme, makine, numara, musteri, geribildirim, duyuru, personel, rol, sifre, servis, bayi, siparis, teklif, devir, excel, oturum.
  - Added: servisKaydi, hakEdis, sevk, kvkk, sistem.
  - `stok` and `demo` are inactive.
- `IslemTuru` (+KategoriKodu FK), granular codes, all of which have ≥1 call site in veri.js/Servisim:
  - talep: talepOlusturuldu, talepElleAcildi, servisSiparisiOlusturuldu, eklemeYapildi, talepGizlendi, talepYenidenAcildi
  - durum: durumDegisti, talepKapatildi, talepIptalEdildi, teklifVerildi, randevuPlanlandi, bayiyeAtandi, bayiAtamasiKaldirildi
  - notEklendi
  - odeme: dekontYuklendi, dekontGecersizKilindi, odemeOnaylandi
  - makine: makineKaydedildi, makineServisiAtandi, makineSahibiDegisti, makineSatisiKaydedildi, garantiBelgesiKararlandi
  - telefon: telefonDegisikligiIstendi, telefonDegisikligiKararlandi
  - hesap: hesapAcildi, hesapGuncellendi, hesapAnonimlestirildi, kimlikNoGoruntulendi (the `kimlikNo` permission reveal)
  - geribildirim: geriBildirimGeldi, geriBildirimOkundu, geriBildirimCevaplandi
  - duyuru: duyuruYayinlandi, duyuruKaldirildi
  - personel/rol: personelEklendi, personelGuncellendi, personelPasiflestirildi, rolEklendi, rolGuncellendi, rolSilindi
  - sifre: sifreSifirlamaIstendi, sifreDegistirildi, servisSifreYardimIstendi, servisSifreYardimKapatildi
  - servis/bayi: servisEklendi, servisGuncellendi, servisHesabiAcildi, servisHesabiKapatildi, servisYetkisiDegisti, bayiEklendi, bayiGuncellendi, logoCariKoduEslendi
  - servisDestekIstedi
  - servis kaydı: servisKaydiGonderildi, garantiDisiKapatildi, parcaTakildi
  - hak ediş: hakEdisDuzeltildi, hakEdisOnaylandi, hakEdisReddedildi, donemDokumuOlusturuldu, donemDokumuOdendi
  - sevk: parcaGonderildi, kargoBilgisiGuncellendi
  - excel: excelDisaAktarildi, excelIceAktarildi
  - oturum: girisYapildi, cikisYapildi
  - kvkk: rizaKaydedildi, basvuruAlindi
  - ayarDegisti
- `TalepTuru` (+NumaraOneki FK): servis/SRV, parca/YPR, satinalma/TKF (labels from talep.js)
- `TalepKaynagi`: connect, servisElle, servisSiparisi, backoffice
- `TalepNumaraKurali (TurKodu,KaynakKodu,NumaraOneki)` PK(Tur,Kaynak), 8 valid combinations; SPS only for parca+servisSiparisi
- `TalepDurumu` (+Kapali bit, Ton)
  - 8 codes from veri.js:578.
  - Legacy: gonderildi→kapandi, bayide→kapandi (+ owner bayi).
- `TalepTuruDurumu (TurKodu,DurumKodu,ElleSecilebilir)` PK
  - From talepDurumlari/elleSecilebilirDurumlar plus the system states onayBekliyor/parcaBekliyor for servis.
  - The PAKSAN desk cannot pick `planlandi` for servis.
- `Masa`: servisMasasi, parcaMasasi (legacy servis, parca)
- `Sahip`: paksan, servis, bayi
- `ServisAtamaKaynagi`: makineAtamasi, bayiServisi, servisElle (legacy atama, bayi, elle)
- `UlasimZamani`: farkEtmez, sabah, ogledenSonra, aksamustu
- `MakineDurumu` (+ArizaMi): durdu, sorunlu, kontrol, kurulum
- `DestekAilesi`: balya, rulo, yem, silaj, cayir, toprak, genel
- `Belirti` (+Ortak bit)
  - Common: anormalSes, asiriTitresim, yagKacagi, saftMafsal, hidrolikSorunu, kayisZincirAtiyor, isinmaYanikKokusu
  - Balya: dugumAtmiyor, ipKopuyor, balyaGevsek, balyaDagiliyor, pikapOtAlmiyor, pistonVurma, balyaSayaciCalismiyor
  - Rulo: balyaSarilmiyor, agIpSarmiyor, kapakAcilmiyor
  - Yem: karistirmaYetersiz, bicaklarKesmiyor, bosaltmaYapmiyor, tartiCalismiyor, helezonSikisiyor
  - Silaj: kesmeBoyuTutmuyor, bicaklarKorelmis, tikanma, beslemeDuzgunDegil
  - Çayır: bicmeDuzgunDegil, bicakParmakKiriliyor, tirmikOtToplamiyor
  - Toprak: derinlikTutmuyor, ucAyakKiriliyor, topragiDuzgunIslemiyor
  - Plus `diger`.
- `BelirtiAilesi (BelirtiKodu,DestekAilesiKodu,Sira)` PK: family-specific links only; balyaGevsek and pikapOtAlmiyor link to both balya and rulo
- `UrunTipi`: yonca, samanBugday, otCayir, misirSilaji, diger
- `Arazi`: elliDonumAlti, elliYuzelliDonum, yuzelliBesyuzDonum, besyuzDonumUstu, baskaTarladaCalisiyor
- `TraktorGucu`: elliBeygirAlti, elliSeksenBeygir, seksenYuzonBeygir, yuzonYuzelliBeygir, yuzelliBeygirUstu, bilmiyor
- `IptalNedeni` (+AciklamaZorunlu)
  - musteriVazgecti, musteriyeUlasilamadi, yanlisAcilmis, ayniKonudaBaskaTalep, telefondaCozuldu, kapsamDisi, baskaNeden(1).
  - Labels are the backoffice texts, plus Servisim "Başka bir neden". Legacy maps cover both lists' texts and Servisim `deger`s.
- `TeklifSonucu` (+FiyatZorunlu): satisOldu(1), musteriVazgecti, rakibeGitti, ulasilamadi (EN from talepAlanlari.js sozlukKur)
- `YapilanIs`: ilkKurulum, ayar, bakim, parcaDegisimi, arizaBulunamadi (legacy = YAPILAN_IS texts)
- `ServisKapisi` (+Eski): garanti, eldeParca(1), parcaIste(1)
- `ZiyaretAsamasi`: parca, bitti
- `UcretDurumu`: garanti, musteriOdedi (legacy UCRET_YAZI texts)
- `KapanisTuru`: personelFormu, servisKaydi, garantiDisi, parcaTakildi, bayiAtamasi, hakEdisOnayi, hakEdisReddi
- `FaturaTuru`: kendisi, baskaKisi, firma
- `OdemeYontemi`: havale, bakiye, fatura
- `HakEdisDurumu`: bekliyor, onaylandi, reddedildi
- `HakEdisKalemTuru`: yol, iscilik, diger
- `HesapHareketTuru` (+YonKodu CK): hakEdisAlacagi, parcaSiparisiBorcu, odeme, duzeltmeAlacak, duzeltmeBorc
- `DonemDokumuDurumu`: taslak, kesinlesti, faturaGeldi, odendi, iptal
- `DuyuruTuru`: duyuru, uyari
- `DuyuruAltTuru` (+UstTurKodu FK, VarsayilanHedefKitleKodu, KilitliHedefKitleKodu?, Ton, Ikon; UQ(Kod,UstTurKodu)): 5 rows from DUYURU_ALT
- `HedefKitle`: musteri, servis, ikisi
- `BildirimTuru`: talep, numara, gorus, randevu
- `AliciTuru`: musteri, servis, personel
- `KararDurumu`: bekliyor, onaylandi, reddedildi
- `DestekOlayTuru`: konu, soru, serbest, cevap, cevapsiz, cozulmedi, yonlendirme, temizlendi
- `DosyaTuru`: foto, video, ses, pdf, belge (legacy gorsel→foto)
- `ServisTuru`: sahis, tuzel (SERVIS_TURU)
- `TarafDurumu`: logoKoduBekliyor, aktif, pasif
- `RizaMetni`: aydinlatma, acikRiza, ticariIleti
- `RizaSecimi`: okundu, onay, ret, geriCekme
- `RizaKanali`: connectKayit, connectProfil, personel, telefon, yazili
- `BildirimIzni`: 5 values from BILDIRIM
- `LogoBelgeTuru`: satisFaturasi, alisFaturasi, giderPusulasi, irsaliye, siparisFisi, tahsilatFisi, bankaFisi
- `SatisTuru`: paksanBayiye, bayiCiftciye, dogrudanCiftciye, ikinciEl
- `GarantiDayanagi`: teslimOnayli, faturaArtiSure, uretimYili, bilinmiyor
- `KargoFirmasi`: empty until PAKSAN supplies a list (H7)
- `KvkkBasvuruTuru`: silme, erisim, duzeltme, itiraz
- `EskiDegerEslesmesi`: see A14

Codes to add as seed rows only when PAKSAN decides (no schema change): `odemeBekliyor` (KOD 4.2.1/Q11), `tekrarZiyaretBekliyor` (KOD 4.2/Q17).

### cografya [P]
- **Ulke**: `Kod char(2) BIN2 PK`, `AdTr`, `AdEn`, `TelefonKodu k(5)`, `TelefonHane tinyint?`, `ResmiIso bit` (XK=0), `BolgeListesiVar bit`, `Sira`. Source: ulkeler.js (+.en), 72 rows.
- **Il**: `PlakaKodu tinyint PK CK 1..81`, `Ad m(50)`, `AdArama`. Source: iller.js plus a tracked `tohum/kaynak/il-plaka.json` (public plate codes; the generator requires all 81 to map).
- **Ilce**
  - Columns: `IlceNo int PK` (= plate×1000 + stable sequence; an internal number, not official), `IlKodu` FK, `Ad m(60)`, `AdArama`, `ResmiKod k(10)?` (UQ F; filled before live).
  - UQ `(IlKodu,IlceNo)` and UQ `(IlKodu,Ad)`.
  - Source: ILCELER plus a tracked `tohum/kaynak/ilce-numaralari.json`. The generator only appends and never renumbers.
- **YurtdisiBolge**: `(UlkeKodu, Ad m(100)) PK`, `Sira`. Source: bolgeler.js. Records store abroad region as text, no FK.

### kurum
- **Sirket** [P][T]
  - Columns: `Kimlik tinyint PK CK=1`, `KisaAd`, `Ad`, `Unvan m(250)`, `Telefon`, `TelefonHam`, `Telefon2`, `Faks`, `Eposta`, `Site`, `SiteKisa`, `Adres1`, `Adres2`, `KurulusYili smallint`, `UygulamaAdi`.
  - Seeded once (insert only). Source: kimlik.js SIRKET, UYGULAMA.
- **BankaHesabi** [P][T]
  - Columns: `[K]`, `BankaAdi m(100)`, `SubeAdi m(100)?`, `Iban k(34)` (CK format), `HesapUnvani m(250)`, `ParaBirimiKodu`, `Aktif`, `Sira`.
  - Seeded once; empty today (BANKA.hesaplar).
- **Personel** [P][T][R][E]
  - Columns: `[K]`, `KullaniciKimlik` UQ FK, `AdSoyad m(150)`, `AdArama`, `Eposta nvarchar(254) COLLATE Latin1_General_100_CI_AS?` (UQ F), `Telefon k(16)?`, `RolKimlik` FK kimlik.Rol, `Aktif`, `AyrilmaZamani?`, `[O]`.
  - Source: `personel` (veri.js:371). Mapping: `no`→EskiNumara (no PRS number per KOD); `kullanici`, `sifre` and `sonGiris` go to kimlik.Kullanici; `demo` is dropped (environments are separated instead).

### katalog
- **Marka** [P][T]
  - Columns: `Kod k(20) PK CK [a-z]`, `Ad`, `Okunus?`, `Aktif`, `LogoYolu k(200)?`, `AmblemYolu?`, `Site?`, `SiteKisa?`, `GarantiYil tinyint?`, `GarantiBaslangicEsasi CK teslim|fatura|uretim?`, `GarantiFaturaEkGun smallint?`, `AsinmaAnahtari k(60)?`, `SeriKurali k(40)?`, `ParcaKaynagi k(200)?`, `ServisIskontoOrani oran?`, `ParaBirimiKodu?`, `KdvOrani oran?`, `KilavuzPaketi k(100)?`, `KilavuzDilleri k(20)?`, `KaynakNotu m(1000)?`.
  - CK: an active brand must have GarantiYil, SeriKurali and KaynakNotu (mirrors the plan's rule).
  - Seed: `paksan` only (garanti 2 from serial.js:90, `onekYilSira`, iskonto 0.3) until `markalar.js` exists.
- **Kategori** [P]: `Kod k(40) PK`, `AdTr`, `KisaAdTr`, `AdEn?`, `KisaAdEn?`, `Ikon k(40)`, `DestekAilesiKodu` FK, `Sira`. Source: CATEGORIES, KATEGORI_EN, supportGroup().
- **BakimSablonu** [P]: `Kod k(40) PK` (balya, yem, silaj, toprak).
- **BakimAdimi** [P]: `(SablonKodu, Saat smallint) PK`, `BaslikTr`, `DetayTr`, `BaslikEn?`, `DetayEn?`. Source: BAKIM and BAKIM_EN.
- **Urun** [P][T][E]
  - Columns: `(MarkaKodu, Kod k(60)) PK`, `Ad m(100)`, `KategoriKodu` FK, `BakimSablonuKodu?` FK, `SloganTr?`, `SloganEn?`, `AciklamaTr m(max)?`, `AciklamaEn?`, `SeriOneki k(20)?`, `SeriOnekiDogrulandi bit DF 0`, `KilavuzUrl?`, `KilavuzKapsamKodu k(100)?`, `TeknikKaynakUrl?`, `VitrinSirasi smallint?`, `Aktif`.
  - Source: PRODUCTS, URUN_EN, DESC_EN, VITRIN, kilavuzEslesme URUN_KILAVUZU, teknikOzellikler `kaynak`.
- **UrunVaryanti** [C]: `(MarkaKodu,UrunKodu,Kod k(40)) PK`, `Ad m(60)`, `Sira`. Source: products `variants`, teknikOzellikler `varyantlar`.
- **UrunOzelligi** [S]: `(MarkaKodu,UrunKodu,SiraNo) PK`, `EtiketTr`, `EtiketEn?`, `DegerTr`, `DegerEn?`. Source: specs, SPEC_EN, SPEC_DEGER_EN.
- **UrunVideosu** [S]: `(MarkaKodu,UrunKodu,SiraNo) PK`, `BaslikTr`, `BaslikEn?`, `TurKodu CK tanitim|kullanim`, `Sure k(8)?`, `Url?`, `DosyaYolu?`. Source: videos, VIDEO_EN.
- **ParcaGrubu** [P]: `(MarkaKodu,Kod k(60)) PK`, `Ad m(100)`, `DestekAilesiKodu?` FK, `Sira`. Source: katalog.json gruplar + PARCA_GRUBU_AILESI.
- **Parca** [P][T]
  - Columns: `(MarkaKodu, Kod k(24)) PK` (CK `NOT LIKE '%[^A-Z0-9.]%'`, length 3..24), `Ad m(100)` (not unique), `GrupKodu` (FK composite), `GorselVar bit`, `Aktif`, `IlkFiyatListesiKodu?`, `SonFiyatListesiKodu?`.
  - Source: katalog.json parcalar (538).
- **FiyatListesi** [P]
  - Columns: `(MarkaKodu, Kod k(20)) PK` (e.g. `2026-07-1`), `KaynakDosyaAdi m(260)`, `KaynakOzeti binary(32)?`, `KaynakSurum int?` (legacy `surum`), `ParaBirimiKodu`, `ListeKdvHaric bit`, `KdvEsasiDogrulandi bit DF 0`, `YururlukBaslangicTarihi?`, `DurumKodu CK taslak|yururlukte|arsiv`, `[O]`.
  - UQ F one `yururlukte` per brand.
  - The list code and date come from a tracked `tohum/kaynak/fiyat-listeleri.json`.
- **FiyatListesiSatiri** [P]: `(MarkaKodu,FiyatListesiKodu,ParcaKodu) PK`, `BirimFiyat para CK≥0`.
- **ParcaModel** [C]: `[K]`, `MarkaKodu`, `ParcaKodu`, `UrunKodu`, `VaryantKodu?`, `Not?`; UQ `(MarkaKodu,ParcaKodu,UrunKodu,VaryantKodu)`. Empty until the parts-to-model list arrives (KOD Q19).

### kimlik
- **Kullanici** [P][R]: one login table for staff and service users, so login names are unique across all user types (KOD 4.3)
  - Columns: `[K]`, `TurKodu CK personel|servis`, `GirisAdi k(40)` UQ with CK `NOT LIKE '%[^a-z0-9.]%'`, length 3..40, no leading/trailing dot, no `..`; `SifreOzeti k(255)?` (CK NULL or `LIKE '$%$%'`), `SifreBelirlemeGerekli bit`, `SifreDegistirmeZamani?`, `Aktif`, `SonGirisZamani?`, `BasarisizGirisSayisi smallint`, `KilitBitisZamani?`, `[O]`.
  - The app role may not UPDATE `SifreOzeti`; only procedure `kimlik.SifreYaz` writes it. This prevents the "staff edit wipes password" defect.
  - Source: personel.kullanici/sifre/sonGiris; servisler.kullanici/sifre/panelAktif/ilkGiris.
- **Rol** [P][T][E]
  - Columns: `[K]`, `Kod k(40)?` (UQ F; `admin`, `yonetici`, `servis-masasi`, `yedek-parca`, `satis`; EskiKimlik holds `servis`/`parca`), `Ad m(100)` UQ, `Aciklama?`, `TalepTuruKodu?`, `TumIzinler bit` (admin gets the whole catalog dynamically), `Sistem bit`, `Aktif`, `[O]`.
  - Default roles seeded once with UUIDv5 ids. Source: VARSAYILAN_ROLLER, panelIcerik.roller.
- **IzinGrubu** [P]: `Kod PK`, `AdTr`, `Sira`.
- **Izin** [P]: `Kod k(40) PK`, `GrupKodu`, `AdTr m(200)`, `Sira`, `Aktif`. The 17 ids from YETKI_KATALOG; renamed ids get legacy-map rows.
- **RolIzin** [P][T]: `(RolKimlik,IzinKodu) PK`; DELETE granted.
- **Oturum** [P]
  - Columns: `[K]`, `KullaniciKimlik?`, `HesapKimlik?` (CK exactly one), `CihazKimlik?`, `KaynakUygulamaKodu`, `UygulamaSurumu?`, `YenilemeJetonuOzeti binary(32)` UQ, `OncekiOturumKimlik?` (rotation chain for reuse detection), `BaslangicZamani`, `SonKullanimZamani`, `BitisZamani NOT NULL`, `KapanmaZamani?`, `KapanmaNedeni CK cikis|sure|iptal|sifreDegisti|rolSilindi|yenidenKullanim?`, `IpAdresi k(45)?`, `KullaniciAjani m(300)?`.
  - IX F open sessions per user and per account.
  - Source: panelOturum, servisOturum, sessionStorage `user`. Access tokens are short-lived and not stored.
- **SifreSifirlamaJetonu** [P]: `[K]`, `KullaniciKimlik`, `JetonOzeti binary(32)` UQ, `[O]`, `SonGecerlilikZamani`, `KullanilmaZamani?`, `IptalZamani?`, `IsteyenIp?`. Source: sifreTalepleri (plain token becomes a hash; email not copied).
- **DogrulamaKodu** [P] (OTP)
  - Columns: `[K]`, `AmacKodu CK sifreSifirlama|kayit|telefonDegisikligi|giris`, `TelefonE164?`, `HesapKimlik?`, `KodOzeti binary(32)`, `[O]`, `SonGecerlilikZamani`, `DenemeSayisi tinyint`, `EnFazlaDeneme tinyint DF 5`, `KullanilmaZamani?`, `GidenKimlik?`.
  - IX `(TelefonE164, OlusmaZamani)`. Source: hesap.js otpGonder (memory only today).
- **GirisDenemesi** [P]
  - Columns: `[K]`, `Zaman dt`, `TanimlayiciTuruKodu CK girisAdi|telefon`, `TanimlayiciOzeti hmac`, `KaynakUygulamaKodu`, `IpAdresi?`, `SonucKodu CK basarili|yanlisSifre|bilinmeyen|kilitli|pasif`.
  - IX `(TanimlayiciOzeti,Zaman)` and `(IpAdresi,Zaman)`. DELETE granted (purge). New table.

### musteri
- **Hesap** [P][R][E]
  - Columns: `[K]`, `[F]` (`TelefonE164` UQ F NOT NULL) + `TelefonUlkeKodu char(2)?`, `SifreOzeti k(255)?` (procedure-only, `musteri.SifreYaz`), `SifreDegistirmeZamani?`, `[Y]`, `SaticiBeyani m(150)?`, `BeyanBayiKimlik?` (FK taraf.Bayi, resolved by staff), `DilKodu?`, `DurumKodu CK aktif|kapali|anonim`, `LogoCariKodu k(32)?`, `[O]`, `SonGirisZamani?`, `KapanmaZamani?`, `AnonimlestirmeZamani?`.
  - CK `anonim` requires phone NULL. IX TelefonUlusal, IX IlKodu.
  - Source: hesap (id, `no`→EskiNumara, ulke, tel, sifre, konumUlke, il, ilce, adres, satici, createdAt, dil).
  - One login phone per account; the family shares it.
- **HesapKisisi** [P]
  - Columns: `[K]`, `HesapKimlik`, `Adi m(75)?`, `Soyadi m(75)?`, `AdSoyadArama`, `RolKodu CK hesapSahibi|yetkili`, `TelefonE164?` (contact only, not unique), `[O]`, `PasifZamani?`.
  - UQ F one active hesapSahibi per account. Source: hesap.adi/soyadi/ad (KOD 4.3 multiple authorized persons).
- **HesapTelefonGecmisi** [P]: `[K]`, `HesapKimlik`, `TelefonE164?`, `BaslangicZamani`, `BitisZamani?`, `TelefonDegisikligiTalebiKimlik?`; UQ F current per account. App may INSERT and UPDATE only `BitisZamani`.
- **TelefonDegisikligiTalebi** [P][R]
  - Columns: `[K]`, `Numara char(10)` UQ (TEL), `HesapKimlik?` (can be filed while logged out), `BeyanAdi?`, `EskiTelefonE164?`, `YeniTelefonE164?`, `KanitMarkaKodu?`, `KanitSeriNo k(40)?`, `SeriEslesti bit?`, `EskiNumaraEslesti bit?`, `YeniNumaraBaskaHesapta bit?`, `KararDurumuKodu`, `[O]`, `[I]`, `KaynakUygulamaKodu`, `KararZamani?`, `KararVerenKullaniciKimlik?`, `KararVerenAdi?`, `KararNotu m(500)?`, `UygulanmaZamani?`.
  - UQ F one open request per account. Source: numaraTalepleri.
- **GeriBildirim** [P][R][E]
  - Columns: `[K]`, `Numara char(10)` UQ (GBD), `HesapKimlik?`, `Metin m(1000)` (CK length 5..1000), `DilKodu`, `UygulamaSurumu k(20)`, `IletisimAdi?`, `IletisimTelefonE164?`, `[O]`, `[I]`, `OkunmaZamani?`, `OkuyanKullaniciKimlik?`, `OkuyanAdi?`.
  - IX F unread. Source: geribildirim (id, no, tarih, metin, dil, surum, tel, ad, okundu, okuyan, okumaTarih).
- **GeriBildirimNotu** [P]: `[K]`, `GeriBildirimKimlik`, `Metin m(2000)`, `MusteriyeGonderildi bit`, `[O]`, `[A]`. Source: notlar[].

### kvkk
- **MetinSurumu** [P]
  - Columns: `(MetinKodu, Surum k(10), DilKodu) PK`, `Baslik m(200)`, `IcerikJson` (sections, rendered with company values), `IcerikOzeti binary(32)`, `AsilMetin bit` (TR=1), `MetinTarihi date`, `HukukOnayiZamani?`, `[O]`.
  - The app is denied INSERT, UPDATE and DELETE. A trigger blocks any update to content columns. The seed fails if an existing (code, version, language) row has a different hash, which forces a version bump.
  - Source: kvkk.js/kvkk.en.js (1.0 is a draft, so `HukukOnayiZamani` is NULL).
- **RizaOlayi** [P]
  - Columns: `[K]`, `HesapKimlik`, `MetinKodu`, `Surum`, `DilKodu` (composite FK to MetinSurumu), `SecimKodu`, `KanalKodu`, `[O]`, `[I]`, `UygulamaSurumu?`, `CihazKimlik?`, `IpAdresi?`, `KaydedenKullaniciKimlik?`, `Not m(500)?`.
  - IX `(HesapKimlik,MetinKodu,OlusmaZamani DESC)`. App INSERT only; UPDATE and DELETE denied.
  - Source: hesap.onaylar → 3 rows at registration: aydinlatma=okundu, acikRiza=onay, ticariIleti=onay|ret.
- **vw_GuncelRiza** [P]: latest event per (account, text).
- **BasvuruTalebi** [C]: `[K]`, `HesapKimlik?`, `TurKodu`, `KanalKodu`, `BasvuranAdi?`, `IletisimBilgisi?`, `Aciklama?`, `DurumKodu CK alindi|isleniyor|sonuclandi|reddedildi`, `[O]`, `YanitSonTarihi date`, `SonuclanmaZamani?`, `SonucAciklamasi?`, `SorumluKullaniciKimlik?`. Covers "account deletion only by PAKSAN".

### taraf
- **Bayi** [P][T][R][E]: `[K]`, `Ad m(200)`, `AdArama`, `IlKodu`, `IlceNo?`, `Adres?`, `Telefon k(20)?`, `DurumKodu` FK TarafDurumu, `PilotKatilimcisi bit`, `[O]`, `PasifZamani?`. Source: bayiler (`id`→EskiKimlik, `no`→EskiNumara).
- **BayiMarkaYetkisi** [P][T]: `(BayiKimlik,MarkaKodu) PK`, `BaslangicZamani`, `BitisZamani?`.
- **Servis** [P][T][R][E]: `[K]`, `Ad`, `AdArama`, `TurKodu` FK ServisTuru, `IlKodu`, `IlceNo?`, `Adres?`, `Telefon k(20)?`, `DurumKodu`, `PilotKatilimcisi`, `[O]`, `PasifZamani?`. Source: servisler.
- **ServisFaturaBilgisi** [P][R]
  - Columns: `ServisKimlik PK`, `Unvan m(250)`, `VergiDairesi?`, `KimlikNoTuruKodu CK tckn|vkn`, `VergiNoSifreli sif?`, `VergiNoArama hmac?`, `VergiNoMaskeli k(20)?`, `Adres?`, `IbanSifreli sif?`, `IbanArama hmac?`, `IbanMaskeli k(40)?`, `IbanHesapAdi m(200)?`, `AnahtarNo tinyint?`, `GuncellemeZamani`.
  - Source: servisler.cari{unvan, vergiDairesi, vergiNo, adres, iban, ibanAd}.
- **ServisBayi** [P][T]: `(ServisKimlik,BayiKimlik) PK`, `Oncelik smallint DF 100`, `BaslangicZamani`. Source: servisler.bayiler[]. `Oncelik` resolves "which service is primary" (servisAtama.js:67).
- **ServisBolgesi** [P][T]: `[K]`, `ServisKimlik`, `IlKodu`, `IlceNo?` (NULL = whole province); UQ `(ServisKimlik,IlKodu,IlceNo)`; DELETE granted. Source: bolge[{il, ilceler}].
- **ServisMarkaYetkisi** [P][T]: `(ServisKimlik,MarkaKodu) PK`, `BaslangicZamani`, `BitisZamani?`, `VerenKullaniciKimlik?`. Rows are ended, never deleted, because FKs reference them.
- **ServisKullanicisi** [P]: `KullaniciKimlik PK`, `ServisKimlik`, `Aciklama m(100)?`, `[O]`. One per firm today by policy; more allowed later (KOD Q18).
- **ServisSifreYardimTalebi** [P]: `[K]`, `ServisKimlik`, `GirisAdiBeyani k(40)`, `DurumKodu CK bekliyor|kapandi`, `[O]`, `KapanmaZamani?`, `KapatanKullaniciKimlik?`, `KapatanAdi?`; UQ F one open per service. Source: servisSifreTalep.
- **LogoCariKarti** [P]
  - Columns: `[K]`, `BayiKimlik?`, `ServisKimlik?` (CK exactly one), `LogoFirmaNo smallint`, `CariKodu k(32)`, `LogicalRef int?`, `MarkaKodu?`, `Aktif`, `KaynakKodu CK excel|entegrasyon|elle`, `DogrulayanKullaniciKimlik?`, `DogrulamaZamani?`, `[O]`.
  - UQ `(LogoFirmaNo,CariKodu)`. New table (KOD 4.7, 4.8).
- **vw_LogoKoduBekleyenTaraf** [P].

### makine
- **Makine** [P][R][E]
  - Columns: `[K]`, `MarkaKodu DF 'paksan'`, `SeriNo k(40)` (CK A-Z0-9, length 3..40, letters never stripped), `SeriNoYazildigiGibi m(60)?`, `UrunKodu k(60)?` + FK `(MarkaKodu,UrunKodu)`, `VaryantKodu?`, `SeridenUretimYili smallint?`, `UretimTarihi date?`, `SeriBicimeUygun bit?`, `LogoMalzemeKodu k(32)?` (pilot: raw invoice value), `OlusmaKaynagiKodu CK musteri|servis|personel|logo|iceAktarim`, `[O]`, `[A]`.
  - **UQ (MarkaKodu,SeriNo)**, UQ `(Kimlik,MarkaKodu)` (for composite FKs), IX `SeriNo`, IX `(MarkaKodu,UrunKodu)`.
  - Source: machines[] (serial, productId, year) and makineKayitlari (seri, productId, uretimTarihi).
- **MakineSahipligi** [P]
  - Columns: `[K]`, `MakineKimlik`, `HesapKimlik`, `TakmaAd m(30)?`, `BaslangicZamani`, `BitisZamani?`, `BitisNedeniKodu CK musteriKaldirdi|devir|personel|anonimlestirme?`, `KaynakKodu CK connect|servisElle|personel|iceAktarim`, `[A]`.
  - **UQ F (MakineKimlik) WHERE BitisZamani IS NULL**; IX F `(HesapKimlik)` current.
  - App may UPDATE only `TakmaAd`, `BitisZamani`, `BitisNedeniKodu`.
  - Source: machines[] (nickname, addedAt), makineKayitlari.musteriId.
- **MakineServisAtamasi** [P]
  - Columns: `[K]`, `MakineKimlik`, `MarkaKodu`, `ServisKimlik`, `BaslangicZamani`, `BitisZamani?`, `KaynakKodu CK personel|logo|iceAktarim`, `Not?`, `[A]` (CK AktorTuru IN personel, entegrasyon, sistem, so a service cannot assign itself), `BitirenKullaniciKimlik?`.
  - FK `(MakineKimlik,MarkaKodu)` → Makine; **FK (ServisKimlik,MarkaKodu) → ServisMarkaYetkisi**, so an unauthorized service cannot be assigned.
  - UQ F current per machine; IX F `(ServisKimlik)` current.
  - Source: makineKayitlari.servisId (Makineler.jsx assignment).
- **MakineSatisi** [P]
  - Columns: `[K]`, `MakineKimlik`, `SatisTuruKodu`, `SaticiBayiKimlik?`, `AliciBayiKimlik?`, `AliciHesapKimlik?`, `FaturaTarihi date?`, `TeslimTarihi date?`, `BelgeDosyaKimlik?`, `LogoBelgeBagiKimlik?`, `DogrulamaDurumuKodu` FK KararDurumu, `DogrulayanKullaniciKimlik?`, `DogrulamaZamani?`, `KaynakKodu CK logo|excel|bayi|musteri|personel`, `IptalZamani?`, `[O]`, `[A]`.
  - Source: makineKayitlari.bayiId, faturaTarihi, yeniSatis; KOD warranty dates (a) and (b).
- **KayitOlayi** [P]: `[K]`, `MakineKimlik`, `KaynakKodu CK musteri|servis|logo|personel`, `HesapKimlik?`, `ServisKimlik?`, `KonumIlKodu?`, `KonumIlceNo?`, `LogoBildi bit`, `YeniSatis bit`, `LogoSeriSorgusuKimlik?`, `[O]`, `[A]`. Keeps the register's history of registration events.
- **BakimTamamlama** [P]: `[K]`, `MakineKimlik`, `HesapKimlik`, `BakimSablonuKodu`, `Saat` (FK BakimAdimi), `IsaretlemeZamani`, `KaldirmaZamani?`; UQ F active. Source: machines[].doneMaintenance.
- **Views** [P]:
  - **vw_MakineGuncelSahibi**
  - **vw_MakineninServisi**: the single source of the service chain:
    1. The current assignment, if its brand authorization is active (`makineAtamasi`).
    2. Otherwise, the dealer from the latest valid `paksanBayiye` sale → `ServisBayi` ordered by `Oncelik`, restricted to active services where both the service and the dealer are authorized for the machine's brand (`bayiServisi`).
    3. Otherwise NULL.
  - **vw_MakineGarantisi**:
    1. An approved delivery date gives `teslimOnayli`.
    2. Otherwise the dealer invoice date plus `Marka.GarantiFaturaEkGun` gives `faturaArtiSure` (not verified).
    3. Otherwise production year gives `uretimYili` (legacy, not verified).
    4. Otherwise `bilinmiyor`.

    End date = start + `GarantiYil`.
- **Device only (no table):** `hours` (unused); `rehberIsaret` (fragile keys based on list order; per-device progress); `chats` (support chat transcripts; the support log keeps events only, for KVKK data minimization).

### talep
- **Talep** [P][R] (core)
  - Numbering: `[K]`; `Numara char(10)` UQ + CK pattern; `NumaraOneki char(3)` (CK `LEFT(Numara,3)=NumaraOneki`); `TurKodu`; `KaynakKodu`; FK `(TurKodu,KaynakKodu,NumaraOneki)` → kod.TalepNumaraKurali.
  - Brand and state: `MarkaKodu DF 'paksan'`; `DurumKodu` + FK `(TurKodu,DurumKodu)` → TalepTuruDurumu; `MasaKodu?`; `SahipKodu`.
  - Links: `HesapKimlik?` (**requests link to the customer by id, never by phone**); `MakineKimlik?` + FK `(MakineKimlik,MarkaKodu)` → Makine; `ServisKimlik?` + FK `(ServisKimlik,MarkaKodu)` → ServisMarkaYetkisi; `ServisAtamaKaynagiKodu?`; `ServisAtamaZamani?`.
  - Location and contact: `Ihracat bit`; `[Y]` (service location); `IletisimAdi m(150)?`; `IletisimAdArama`; `IletisimTelefonE164?`; `IletisimTelefonUlusal?`; `UlasimZamaniKodu?`.
  - Content and bookkeeping: `Aciklama m(2000)?`; `SesDosyaKimlik?`; `[O]`; `[I]`; `KapanmaZamani?`; `GuncellemeZamani`; `[A]` (creator); `CihazNumarasi k(20)?`; `EskiNumara k(20)?`.
  - UQ `(Kimlik,TurKodu)`, `(Kimlik,MarkaKodu)`, `(Kimlik,ServisKimlik)` for composite FKs.
  - CHECKs:
    - servisElle requires ServisKimlik.
    - servisSiparisi requires HesapKimlik NULL and ServisKimlik NOT NULL.
    - connect + servis requires MakineKimlik.
    - SahipKodu servis requires ServisKimlik; bayi requires TurKodu satinalma.
    - Closed or cancelled if and only if KapanmaZamani is set.
  - Indexes:
    - `(DurumKodu, OlusmaZamani DESC)` INCLUDE (TurKodu, MasaKodu, SahipKodu, ServisKimlik, IlKodu, MarkaKodu)
    - `(TurKodu, OlusmaZamani)`, `(MarkaKodu, OlusmaZamani)`, `(IlKodu, OlusmaZamani)`
    - F `(ServisKimlik, DurumKodu, OlusmaZamani)`, F `(HesapKimlik, OlusmaZamani)`, F `(MakineKimlik)`, F `(MasaKodu)`
    - F open requests `WHERE DurumKodu IN (<6 open codes>)`
    - F `(IletisimTelefonUlusal)`, `(IletisimAdArama)`, F `(EskiNumara)`, F `(CihazNumarasi)`
  - Source: requests / demoTalepler core fields (see the field map in G/`eslesme.json`).
  - **Trigger `trg_Talep_DurumGecmisi`** (AFTER INSERT, UPDATE): writes DurumGecmisi whenever status, owner or desk changes, with the actor taken from SESSION_CONTEXT. It throws 51010 if the actor is missing, so no write path can skip history (defect 11).
- **ServisTalebiAyrinti** [P]: `TalepKimlik PK`, `TurKodu CK='servis'` + composite FK, `MakineDurumuKodu?`. Source: `durum`.
- **ParcaTalebiAyrinti** [P]
  - Columns: `TalepKimlik PK`, `TurKodu CK='parca'`, `OdemeYontemiKodu`, `FiyatListesiMarkaKodu?` + `FiyatListesiKodu?` (FK), `ParaBirimiKodu?`, `KdvOrani?`, `ListeKdvHaric bit?`, `IskontoOrani?`, `AraToplam?`, `KdvTutari?`, `GenelToplam?` (CK consistency), `EksikFiyatVar bit`, `TeslimatAdresi m(500)?`.
  - Source: parcaFiyat header, odeme, tutar, tutarKdvli.
- **TeklifTalebiAyrinti** [P]: `TalepKimlik PK`, `TurKodu CK='satinalma'`, `IlgiUrunMarkaKodu?`, `IlgiUrunKodu?`, `TraktorGucuKodu?`. Source: urunId, traktor.
- **TalepBelirtisi** [P] `(TalepKimlik,BelirtiKodu)`, **TeklifUrunTipi** [P] `(TalepKimlik,UrunTipiKodu)`, **TeklifArazi** [P] `(TalepKimlik,AraziKodu)`. Source: belirtiler[] and the comma-joined urunTipi/arazi.
- **DurumGecmisi** [P]
  - Columns: `[K]`, `TalepKimlik`, `OncekiDurumKodu?`, `YeniDurumKodu`, `OncekiSahipKodu?`, `YeniSahipKodu?`, `OncekiMasaKodu?`, `YeniMasaKodu?`, `MusteriyeBildirildi bit`, `[O]`, `[A]`.
  - IX `(TalepKimlik,Sira)`. Written only by the trigger; the app is denied DML. Source: gecmis[].
- **Not** [P]: `[K]`, `TalepKimlik`, `Metin m(2000)`, `MusteriGorur bit`, `ServisGorur bit`, `ServistenGeldi bit`, `[O]`, `[I]`, `[A]`. Source: notlar[] (musteriye, servise, servisten).
- **Randevu** [P]: `[K]`, `TalepKimlik`, `PlanlananZaman dt`, `SaatBelirtildi bit`, `IsTanimi m(300)?`, `MusteriyleGorusuldu bit`, `[O]`, `[A]`, `IptalZamani?`; IX F `(PlanlananZaman)` active. Source: plan{tarih, is, gorusuldu, kayitTarihi, personel}. `tarihYazi` is dropped (derived for display).
- **Teklif** [P]: `[K]`, `TalepKimlik`, `SiraNo tinyint` (UQ per request), `Tutar para?`, `ParaBirimiKodu?`, `KdvDahil bit?`, `GecerlilikBitisTarihi date?`, `GecerlilikMetni m(200)?` (legacy), `Not m(1000)?`, `[O]`, `[A]`. Source: teklif; each offer is a numbered child row (KOD).
- **Iptal** [P]: `[K]`, `TalepKimlik`, `IptalNedeniKodu`, `Aciklama m(1000)?`, `[O]`, `[A]`. Source: iptalBilgi.
- **Kapanis** [P]
  - Columns: `[K]`, `TalepKimlik`, `KapanisTuruKodu`, `YapilanIsKodu?`, `YapilanIsMetni m(2000)?`, `DegisenParcalarMetni m(1000)?`, `UcretDurumuKodu?`, `UcretTutari para?`, `ParaBirimiKodu?`, `TeklifSonucuKodu?`, `SatisFiyati para?`, `Not m(2000)?`, `ServisFisiDosyaKimlik?`, `ServisZiyaretiKimlik?`, `[O]`, `[A]`.
  - CK: satisOldu requires SatisFiyati.
  - Source: every variant of `cozum`. `ozet` is derived, never stored. The `onceki` value survives because each reopen cycle keeps its own row.
- **YenidenAcma** [P]: `[K]`, `TalepKimlik`, `OncekiDurumKodu`, `Aciklama m(1000)?`, `MusteriyeBildirilmedi bit`, `[O]`, `[I]`, `[A]`. Source: tekrar[] and talepGeriAc.
- **Ekleme** [P] (`[K]` client id, `TalepKimlik`, `Not m(2000)?`, `SesDosyaKimlik?`, `[O]`, `[I]`, `[A]`) + **EklemeEki** `(EklemeKimlik,DosyaKimlik) PK` + `SiraNo`. Source: eklemeler[].
- **TalepEki** [P]: `(TalepKimlik,DosyaKimlik) PK`, `SiraNo tinyint`. Source: ekler[]. The 5-photo/1-video limit is enforced in the API.
- **FaturaBilgisi** [P][R]
  - Columns: `TalepKimlik PK` (FK composite parca), `FaturaTuruKodu`, `AdSoyad m(150)?`, `Unvan m(250)?`, `KimlikNoSifreli?`, `KimlikNoArama?`, `KimlikNoMaskeli?`, `VergiNoSifreli?`, `VergiNoArama?`, `VergiNoMaskeli?`, `VergiDairesi m(100)?`, `Eposta m(254)?`, `[F]`, `[Y]`, `AnahtarNo?`, `GuncellemeZamani`.
  - CK: firma requires Unvan; otherwise AdSoyad.
  - Source: fatura{tuzel, farkliKisi, ad, tc, unvan, vergiNo, tel, adres, il, ilce, ulke}. Adds the missing tax office and email.
- **Dekont** [P]: `[K]`, `TalepKimlik`, `DosyaKimlik`, `[O]`, `[A]`, `GecersizZamani?`, `GecersizNedeni?`, `GecersizKilanKullaniciKimlik?`, `GecersizKilanAdi?`. App may INSERT and UPDATE only the `Gecersiz*` columns. Source: dekont.
- **OdemeOnayi** [P]: `[K]`, `TalepKimlik`, `OnaylananTutar?`, `ParaBirimiKodu?`, `Not m(500)?`, `[O]`, `[A]`, `GeriAlinmaZamani?`, `GeriAlanAdi?`; UQ F active per request. Source: odemeOnay.
- **ParcaSatiri** [P]
  - Columns: `[K]`, `TalepKimlik`, `MarkaKodu` (FK `(TalepKimlik,MarkaKodu)`), `SiraNo` (UQ), `ParcaKodu k(24)?` (FK `(MarkaKodu,ParcaKodu)`), `ParcaAdi m(100)`, `KatalogDisi bit` (CK KatalogDisi requires ParcaKodu NULL), `Aciklama?`, `Adet int CK>0`, `BirimFiyat?`, `Tutar?`.
  - Source: parcaFiyat.satirlar, legacy parcalar+parcaAdet, `Diğer`. One request = one brand, enforced by the FK.
- **ServisZiyareti** [P][R]
  - Columns: `[K]`, `TalepKimlik`, `TurKodu CK 'servis'` (composite FK), `ServisKimlik` (FK `(TalepKimlik,ServisKimlik)`), `ZiyaretNo tinyint` (UQ per request), `AsamaKodu`, `KapiKodu`, `YapilanIsKodu?` (CK bitti requires it), `ArizaMetni m(2000)?`, `SonucMetni m(1000)?`, `Km decimal(9,1)? CK≥0`, `IscilikTutari?`, `ParaBirimiKodu?`, `TeknisyenAdi m(100)?`, `GarantiDayanagiAnlik?`, `ParcaIstemeZamani?`, `TamamlanmaZamani?`, `[O]`, `[I]`, `[A]`.
  - UQ `(Kimlik,TalepKimlik,ServisKimlik)`, UQ `(Kimlik,KapiKodu,AsamaKodu)`; UQ F one visit in stage `parca` per request.
  - Source: servisKaydi, oncekiKayitlar[].
- **ZiyaretParcaSatiri** [P]: `[K]`, `ZiyaretKimlik`, `SiraNo`, `MarkaKodu`, `ParcaKodu?`, `ParcaAdi`, `Adet`, `BirimFiyat?`. Source: servisKaydi.parcalar.
- **ZiyaretFotografi** [P]: `(ZiyaretKimlik,DosyaKimlik) PK`, `SiraNo`. Source: foto.
- **ZiyaretDuzeltmesi** [P]: `[K]`, `ZiyaretKimlik`, `Neden m(500)`, `OncekiKm?`, `YeniKm?`, `OncekiIscilik?`, `YeniIscilik?`, `[O]`, `[A]`. **ZiyaretDuzeltmesiParcasi**: `[K]`, `DuzeltmeKimlik`, `TarafKodu CK onceki|yeni`, `SiraNo`, `MarkaKodu`, `ParcaKodu?`, `ParcaAdi`, `Adet`, `BirimFiyat?`. Source: duzeltmeler[] (visible to the service).
- **ParcaSevki** [P]: `[K]`, `TalepKimlik`, `ZiyaretKimlik?`, `KargoFirmasiKodu?`, `KargoFirmasiMetni m(100)?`, `TakipNo k(50)?`, `SevkZamani`, `[A]`, `SonGuncellemeZamani?`, `GuncelleyenKullaniciKimlik?`, `GuncelleyenAdi?`, `LogoBelgeBagiKimlik?`. Source: parcaSevk and the carrier fields of the parts closure form.
- **BayiAtamasi** [P]: `[K]`, `TalepKimlik` (composite FK satinalma), `BayiKimlik`, `[O]`, `[A]`, `KaldirilmaZamani?`, `KaldiranKullaniciKimlik?`, `KaldiranAdi?`; UQ F active. Source: talep.bayi, talebiBayiyeAta, bayiAtamasiniKaldir.
- **Devir** [P]: `[K]`, `TalepKimlik`, `ServisKimlik`, `Neden m(500)?`, `[O]`, `[A]`. Source: devir.
- **TalepGizleme** [P]: `(TalepKimlik,HesapKimlik) PK`, `GizlemeZamani`; DELETE granted. Source: gizlenenTalepler (moved to the server so hiding is per account).
- **TalepLogoBelgesi** [C]: `(TalepKimlik,LogoBelgeBagiKimlik) PK`, `RolKodu CK satisFaturasi|irsaliye|tahsilat|siparis|iade`.

### hakedis
- **Tarife** [P][T]: `[K]`, `KalemTuruKodu`, `MarkaKodu?`, `BirimKodu CK km`, `BirimTutar para`, `ParaBirimiKodu`, `GecerlilikBaslangicTarihi`, `GecerlilikBitisTarihi?`; UQ F one open per item type and brand. Seeded once: yol 12 TRY/km (servisKaydi.js TARIFE).
- **HakEdis** [P][R]
  - Columns: `[K]`, `ZiyaretKimlik` UQ, `TalepKimlik`, `ServisKimlik`, `MarkaKodu`, `KapiKodu CK 'garanti'`, `AsamaKodu CK 'bitti'`, `DurumKodu`, `Km decimal(9,1)`, `YolBirimTutari`, `YolTutari`, `IscilikTutari`, `NetTutar` (CK = yol + işçilik), `KdvOrani?`, `KdvTutari?`, `TevkifatOrani?`, `TevkifatTutari?`, `StopajOrani?`, `StopajTutari?`, `ParaBirimiKodu`, `TarifeKimlik?`, `[O]`, `OnayZamani?`, `OnaylayanKullaniciKimlik?`, `OnaylayanAdi?`, `RedZamani?`, `RedEdenKullaniciKimlik?`, `RedEdenAdi?`, `RedNedeni m(500)?`, `DonemDokumuKimlik?`.
  - FKs: `(ZiyaretKimlik,TalepKimlik,ServisKimlik)` and `(ZiyaretKimlik,KapiKodu,AsamaKodu)` → ServisZiyareti; `(TalepKimlik,MarkaKodu)` → Talep.
  - CKs: onaylandi requires the approval fields; reddedildi requires RedNedeni.
  - UQ `(Kimlik,ServisKimlik)`. IX `(ServisKimlik,DurumKodu,OlusmaZamani)`, IX F `bekliyor`.
  - Source: hakkedis{yol, iscilik, toplam, durum, olusma, onay, red}. **At most one per visit** (KOD 6.1.4).
- **HakEdisKalemi** [P]: `[K]`, `HakEdisKimlik`, `SiraNo`, `KalemTuruKodu`, `Miktar decimal(9,1)?`, `BirimKodu CK km|adet?`, `BirimTutar?`, `Tutar`. Source: kalemler[] ("Yol · 42 km" is derived).
- **DonemDokumu** [P] (HAK)
  - Columns: `[K]`, `Numara char(10)` UQ, `ServisKimlik`, `DonemYili smallint`, `DonemAyi tinyint CK 1..12`, `DurumKodu`, `NetToplam`, `KdvToplam`, `TevkifatToplam`, `StopajToplam`, `OdenecekTutar`, `ParaBirimiKodu`, `KesinlesmeZamani?`, `FaturaLogoBelgeBagiKimlik?`, `FaturaGelmeZamani?`, `OdemeLogoBelgeBagiKimlik?`, `OdemeZamani?`, `[O]`, `[A]`, `[R]`.
  - UQ F `(ServisKimlik,DonemYili,DonemAyi) WHERE DurumKodu<>'iptal'`. New table (KOD 4.2).
- **ServisHesapHareketi** [P]
  - Columns: `[K]`, `ServisKimlik`, `MarkaKodu?`, `HareketTuruKodu`, `YonKodu CK alacak|borc`, `Tutar CK>0`, `ParaBirimiKodu`, `HareketZamani`, `HakEdisKimlik?` (FK with ServisKimlik), `ParcaTalepKimlik?` (FK with ServisKimlik), `DuzeltilenHareketKimlik?`, `DonemDokumuKimlik?`, `LogoBelgeBagiKimlik?`, `Aciklama m(300)?` (staff note only), `[O]`, `[A]`.
  - **UQ F HakEdisKimlik**; **UQ F (ParcaTalepKimlik) WHERE HareketTuruKodu='parcaSiparisiBorcu'** (blocks the double debit on re-close, KOD 3.10); UQ F DuzeltilenHareketKimlik.
  - IX `(ServisKimlik,HareketZamani)` INCLUDE (YonKodu, Tutar).
  - App may INSERT and UPDATE only `DonemDokumuKimlik` and `LogoBelgeBagiKimlik`.
  - Source: cariHareket.
  - **Coexistence rule:** these rows are an informational list of movements, each backed by a document; they are not the accounting ledger. LOGO is authoritative. The monthly HAK statement links to the LOGO invoice and payment documents, and reconciliation views compare them. Whether a balance is shown to the service is a later product decision; the schema supports both.

### duyuru
- **Duyuru** [P][R]
  - Columns: `[K]`, `TurKodu`, `AltTurKodu` (FK `(AltTurKodu,TurKodu)` → DuyuruAltTuru), `Baslik m(150)`, `Metin m(4000)`, `DilKodu`, `GorselDosyaKimlik?`, `PencereGoster bit`, `HedefKitleKodu`, `YayinZamani`, `BitisZamani?`, `YayindanKaldirmaZamani?`, `KaldiranKullaniciKimlik?`, `KaldiranAdi?`, `[O]`, `[A]`.
  - CK geriCagirma requires hedef servis; CK BitisZamani > YayinZamani.
  - IX `(TurKodu,AltTurKodu,YayinZamani)` INCLUDE (BitisZamani, YayindanKaldirmaZamani); IX F `(BitisZamani)`.
  - Source: duyurular records of type duyuru/uyari.
- **HedefMarka** `(DuyuruKimlik,MarkaKodu)`, **HedefIl** `(…,IlKodu)`, **HedefIlce** `(…,IlceNo)`, **HedefServis** `(…,ServisKimlik)`, **HedefUrun** `(…,MarkaKodu,UrunKodu)`, **HedefSeri** `(…,MarkaKodu,SeriNo)` (no FK to Makine) [P]. Source: hedef{iller, ilceler, servisler, urunler, seriler} plus the plan's markalar. Province names become plate codes.

### bildirim
- **Bildirim** [P]
  - Columns: `[K]`, `AliciTuruKodu`, `HesapKimlik?`, `ServisKimlik?`, `KullaniciKimlik?` (CK exactly the one matching the recipient type), `TurKodu`, `BaslikAnahtari k(100)`, `MetinAnahtari k(100)?`, `DegerlerJson?`, `SerbestMetin m(2000)?` (CK MetinAnahtari or SerbestMetin), `TalepKimlik?`, `GeriBildirimKimlik?`, `TelefonDegisikligiTalebiKimlik?`, `[O]`, `[A]`.
  - IX F per recipient `(…, OlusmaZamani DESC)`. Source: duyurular personal records.
- **Teslimat** [P] (per-recipient delivery state)
  - Columns: `[K]`, `BildirimKimlik?`, `DuyuruKimlik?` (CK one), `HesapKimlik?`, `ServisKimlik?`, `KullaniciKimlik?` (CK one), `HedeflenmeZamani`, `GonderilmeZamani?`, `CihazaUlasmaZamani?`, `GorulmeZamani?`, `OkunmaZamani?`, `KabulZamani?`, `ArsivlenmeZamani?`, `RizaOlayiKimlik?` (proof under Law 6563 for campaigns), `GidenKimlik?`.
  - UQ F per (BildirimKimlik); per (DuyuruKimlik,HesapKimlik); per (DuyuruKimlik,ServisKimlik); per (DuyuruKimlik,KullaniciKimlik).
  - IX F unread per account `WHERE OkunmaZamani IS NULL AND ArsivlenmeZamani IS NULL`. App may INSERT and UPDATE the time columns.
  - Source: okunanBildirimler, gorulenDuyurular, gorulenDuyurularServis (audit R3 states).
- **Cihaz** [P]
  - Columns: `Kimlik uid PK` (client install id) + `Sira`, `UygulamaKodu CK connect|servisim|backoffice`, `PlatformKodu CK android|ios|web`, `HesapKimlik?`, `KullaniciKimlik?`, `PushSaglayiciKodu CK fcm|webPush?`, `PushJetonu m(2000)?`, `PushJetonuOzeti binary(32)?` (UQ F), `BildirimIzniKodu`, `IzinZamani?`, `DilKodu?`, `UygulamaSurumu?`, `IsletimSistemiSurumu?`, `[O]`, `SonGorulmeZamani?`, `PasifZamani?`.
  - Source: hesap.bildirim{izin, tarih}, device `dil`.
  - Device only: `yayinlananBildirimler`, and the Android notification id counter.

### destek
- **Oturum** [P]
  - Columns: `[K]` (client id), `HesapKimlik?`, `SohbetAnahtari k(64)`, `MakineKimlik?`, `MarkaKodu?`, `UrunKodu?`, `DestekAilesiKodu?`, `DilKodu`, `BaslangicZamani`, `SonHareketZamani`, `UygulamaSurumu?`, `IcerikPaketiKodu?`, `IcerikPaketiSurumu?`, `[O]`.
  - The user snapshot is replaced by the account link. IX `(BaslangicZamani)`.
  - Source: destekLog sessions.
- **Olay** [P]: `[K]`, `OturumKimlik`, `SiraNo int` (UQ per session), `TurKodu`, `Zaman`, `Deger m(200)?`, `BilgiKaydiKimligi k(200)?`, `TalepKimlik?`; IX `(TurKodu,Zaman)`. Source: olaylar[]. The RAG server stays stateless.

### dosya
- **Dosya** [P]
  - Columns: `[K]` (UUID = storage key), `TurKodu`, `MimeTuru k(100)`, `BoyutBayt bigint`, `IcerikOzeti binary(32)` (SHA-256; IX for duplicate detection, not unique), `OrijinalAd m(255)?`, `DepolamaSaglayici CK disk|nesne`, `DepolamaYolu m(400)`, `SureSaniye decimal(7,2)?`, `Genislik int?`, `Yukseklik int?`, `DurumKodu CK yukleniyor|hazir|karantina`, `SaklamaSinifiKodu CK dekont|genel`, `[O]`, `[A]`, `GecersizZamani?`, `GecersizNedeni?`, `SilinmeIstendiZamani?`, `DiskSilinmeZamani?`.
  - CK `SaklamaSinifi='dekont'` requires `SilinmeIstendiZamani` NULL. App DELETE denied.
  - Source: IndexedDB `paksan-ekler`, `ses` base64, duyuru `gorsel`.

### denetim
- **IslemKaydi** [P]
  - Columns: `[K]`, `Zaman dt`, `TurKodu` FK kod.IslemTuru, `AktorTuruKodu`, `AktorKimlik uid?`, `AktorAdi m(150)?` (NULL for customers), `AktorRolAdi m(100)?`, `KaynakUygulamaKodu`, `UygulamaSurumu?`, `IlgiliKayitTuruKodu?`, `IlgiliKimlik uid?`, `IlgiliNumara k(20)?`, `AyrintiJson?`, `IpAdresi?`, `IstekKimlik uid?`, `OturumKimlik uid?`.
  - No FKs besides the code tables. IX `(Zaman)`, `(TurKodu,Zaman)`, F `(AktorKimlik,Zaman)`, F `(IlgiliKimlik,Zaman)`, F `(IlgiliNumara)`.
  - App INSERT only; **DENY UPDATE, DELETE**; an INSTEAD OF UPDATE/DELETE trigger throws. No row cap.
  - Source: islemKaydi. The 500-row cap and free-text `ozet` are dropped; `personel` name becomes id + name snapshot.

### entegrasyon
- **LogoBelgeBagi** [P]
  - Columns: `[K]`, `LogoFirmaNo smallint`, `LogoDonemNo smallint?`, `LogicalRef int?`, `BelgeTuruKodu`, `BelgeNo m(32)?`, `Ettn uid?`, `BelgeTarihi date?`, `Tutar?`, `ParaBirimiKodu?`, `KaynakKodu CK excel|entegrasyon|elle`, `IceAktarimKimlik?`, `[O]`, `[A]`.
  - UQ F `(LogoFirmaNo,LogoDonemNo,BelgeTuruKodu,LogicalRef) WHERE LogicalRef IS NOT NULL` (KOD 4.7: four fields).
- **LogoMalzemeKarti** [C]: `[K]`, `LogoFirmaNo`, `MalzemeKodu k(32)`, `LogicalRef?`, `Ad?`, `MarkaKodu?`, `UrunKodu?`, `VaryantKodu?`, `ParcaKodu?` (CK at most one target), `[O]`; UQ `(LogoFirmaNo,MalzemeKodu)`.
- **LogoSeriSorgusu** [C]: `[K]`, `MarkaKodu`, `SeriNo k(40)`, `SorguZamani`, `SonucKodu CK bulundu|bulunamadi|hata`, `CevapJson?`, `MalzemeKodu?`, `CariKodu?`, `FaturaTarihi?`, `LogoBelgeBagiKimlik?`, `GecerlilikBitisZamani`; IX `(MarkaKodu,SeriNo,SorguZamani DESC)`. Source: logo.js seriBilgisi cache.
- **IceAktarim** [P]: `[K]`, `TurKodu CK logoCariListesi|logoMalzemeListesi|logoSatisFaturalari|fiyatListesi|servisListesi|bayiListesi|personelListesi`, `DosyaKimlik`, `DurumKodu CK yuklendi|dogrulandi|uygulandi|hata`, `SatirSayisi`, `HataSayisi`, `[O]`, `[A]`.
- **IceAktarimSatiri** [P]: `[K]`, `IceAktarimKimlik`, `SatirNo`, `HamVeriJson`, `DurumKodu CK bekliyor|eslesti|eslesmedi|hata`, `HataMesaji?`, `EslesenKayitTuruKodu?`, `EslesenKimlik?`. This is the pilot's Excel matching process (KOD 4.7, 6.2).

### rapor (views; report role reads only these) [P]
- `vw_Talepler`: flat, with TR labels from code tables, computed `Gecikti` (48 h) and `TeklifBekliyor` (14 days)
- `vw_HakEdisler`, `vw_ServisHesapHareketleri`, `vw_Makineler` (with owner, chain service, warranty)
- Weekly control views (KOD 6.2): `vw_Kontrol_LogoKoduBosTaraf`, `vw_Kontrol_OnayBekleyenHakEdis`, `vw_Kontrol_OdemeOnayiBekleyenParca`, `vw_Kontrol_SeriBicimiUyumsuzMakine`, `vw_Kontrol_ServisiOlmayanSahipliMakine`, `vw_Kontrol_KapanmamisDonem`
- No views are needed for duplicate serials, duplicate phones or two earnings claims per visit: constraints make those impossible.

---

## C. Security model

**Logins, one set per environment, all SQL auth**

| Login | Used by | DB role | Notes |
|---|---|---|---|
| `paksan_<ortam>_sahip` | runner (migrations, seeds) | database owner (dbo) | not sysadmin; password only in the env file |
| `paksan_<ortam>_uygulama` | API (later), verification scenario | `rol_uygulama` | least privilege |
| `paksan_<ortam>_rapor` | Excel/BI | `rol_rapor` | SELECT on schema `rapor` only |

- All logins: `CHECK_POLICY=ON`, `CHECK_EXPIRATION=OFF`, `DEFAULT_DATABASE` = own database.
- `sa` is untouched and stays disabled. The setup script refuses to create users in any other database.

**`rol_uygulama` grants**
- `GRANT SELECT ON SCHEMA::` every business schema plus `gecmis` (needed for temporal queries).
- `GRANT EXECUTE ON SCHEMA::sistem` (NumaraAl, AktorAyarla), plus `kimlik.SifreYaz`, `musteri.SifreYaz`, `musteri.HesabiAnonimlestir`.
- **INSERT and UPDATE are granted per table**, never per schema, so append-only rules cannot be bypassed.
- **DELETE only on:** `kimlik.RolIzin`, `taraf.ServisBolgesi`, `talep.TalepGizleme`, `sistem.TekrarAnahtari`, `kimlik.GirisDenemesi`, `duyuru.Hedef*` (before publication; API rule).
- **Column-level UPDATE only:** `MakineSahipligi(TakmaAd,BitisZamani,BitisNedeniKodu)`, `MakineServisAtamasi(BitisZamani,BitirenKullaniciKimlik)`, `HesapTelefonGecmisi(BitisZamani)`, `Dekont(Gecersiz*)`, `ServisHesapHareketi(DonemDokumuKimlik,LogoBelgeBagiKimlik)`, `bildirim.Teslimat(time columns)`, `Kullanici` (all columns except `SifreOzeti`), `musteri.Hesap` (all except `SifreOzeti`).
- **Explicit DENY UPDATE, DELETE:** `denetim.IslemKaydi`, `kvkk.RizaOlayi`. **DENY INSERT, UPDATE, DELETE:** `kvkk.MetinSurumu`, `talep.DurumGecmisi` (written by the trigger through ownership chaining), `sistem.NumaraSayaci`, `sistem.Ortam`, `dbo.SemaGecmisi`.
- **Triggers (defense in depth, also against the owner):** INSTEAD OF UPDATE/DELETE on IslemKaydi, RizaOlayi, MetinSurumu (content), DurumGecmisi and Ortam. They can only be disabled deliberately by a V script that is visible in git.
- No `db_datareader`/`db_datawriter`, no `db_owner`, no ALTER/CREATE/VIEW DEFINITION for the app.

**Connections**
- Local: TCP 127.0.0.1:1433 (after step E), `Encrypt` with `-C` (trust the self-signed certificate).
- VPS: SQL Server listens on 127.0.0.1 only (the API runs on the same host). Port 1433 is closed in the firewall. Admin access goes through an SSH/RDP tunnel.

**Secrets**
- The env file `veritabani/ortam/<ortam>.env` is gitignored; only `ornek.env` (no values) is tracked.
- `vt kur` generates 32-character passwords from `[A-Za-z0-9]` (meets Windows complexity, safe inside T-SQL literals) with `node:crypto` when they are missing, writes them to the env file and never prints them.
- Secrets reach sqlcmd through environment variables (`SQLCMDPASSWORD`, `PAKSAN_VT_*_SIFRE` used as scripting variables), never on the command line.
- On the VPS the file lives outside the repo (`/etc/paksan/veritabani-canli.env` or `C:\PaksanGizli\…`) with restricted permissions.
- Encryption keys belong to the API env file, not the DB env file. The verification scenario uses a throwaway test key.
- **Password hash contract** (fixed now): PHC string `$scrypt$ln=15,r=8,p=1$<salt>$<hash>` from `node:crypto.scrypt`, with the input HMAC-peppered using a server key (6-digit PINs need both throttling and a pepper). Argon2 would need an npm package (H3). Current device hashes are not migrated; users set a new password at first login (KOD 4.6).

---

## D. Repository layout and tooling

**D1. Layout**
```
veritabani/
  ortam/ornek.env                      tracked template; *.env gitignored
  kurulum/K01__veritabani.sql          CREATE DATABASE if missing + options (A17), not in a transaction
          K02__girisler.sql            logins, users, roles, owner, dbo.SemaGecmisi, sistem.Ortam marker
  semalar/V0001__temel.sql             schemas, rol_*, gecmis, dbo.AciklamaYaz
          V0002__sistem_numara_kod.sql NumaraOneki/Sayaci, all kod tables
          V0003__cografya.sql
          V0004__katalog.sql
          V0005__kimlik_kurum.sql      Kullanici, Rol, Izin, RolIzin, Personel, Sirket, BankaHesabi
          V0006__musteri_kvkk.sql
          V0007__dosya_entegrasyon.sql (+ALTERs adding FKs back to earlier tables)
          V0008__taraf.sql             (+ALTER Hesap.BeyanBayiKimlik FK)
          V0009__makine.sql
          V0010__talep.sql
          V0011__hakedis.sql
          V0012__duyuru_bildirim.sql
          V0013__destek_denetim_sistem_oturum.sql  Ayar, Giden, TekrarAnahtari, IcerikPaketi,
                                       SaklamaKurali, Oturum, SifreSifirlamaJetonu, DogrulamaKodu, GirisDenemesi
          V0014__yetkiler.sql          GRANT/DENY (C)
  tekrar/R__sistem_prosedurleri.sql    NumaraAl, AktorAyarla, SifreYaz x2
         R__korumalar.sql              protection triggers + trg_Talep_DurumGecmisi
         R__musteri_anonimlestir.sql
         R__gorunumler.sql             makine/kvkk/taraf views
         R__rapor.sql                  rapor.* views
  tohum/T01__kod_listeleri.sql … T06__kvkk_metinleri.sql   GENERATED, managed (MERGE)
        B01__sirket_ayar_tarife.sql, B02__roller.sql          GENERATED, insert-if-missing
        kaynak/il-plaka.json, ilce-numaralari.json, kod-eslesmeleri.json, fiyat-listeleri.json
  ornek/O01__taraflar.sql, O02__yerel_kullanicilar.sql         yerel/sinama only
  sinama/S01__kisitlar.sql, S02__senaryo.sql, S03__yetkiler.sql, parmak-izi.sql
  eslesme.json                         localStorage/IndexedDB → table.column map
tools/vt.mjs                           entry point (commands)
tools/vt/sqlcmd.mjs, ortam.mjs, calistir.mjs, tohum-uret.mjs, sozluk.mjs, sinama.mjs, denetle.mjs
```

**D2. Commands** (`npm run vt -- <command>`, plus `npm run vt:tohum`, `npm run vt:sinama`)
- `kur [--ayar file] [--yonetici windows|sql]`
  - Runs K01/K02 idempotently with the admin connection (local `-E` as Pc\Pc; VPS `-U` with admin credentials from the env file), then `guncelle`.
  - Refuses if the database exists with a missing or different `sistem.Ortam` marker.
- `guncelle`
  - Order: pending V scripts by number → R scripts whose checksum changed → T scripts whose checksum changed → B scripts (first time or changed). `--ornek` adds the O scripts (yerel/sinama only).
  - On test/canli it refuses unless `msdb.dbo.backupset` has a full backup of this database from the last 2 hours, or `--yedeksiz` is given.
- `durum`: environment marker, server version/edition/compat level, database collation, applied/pending/changed/**edited V** (error)/missing files, and a schema fingerprint compared with a fresh `Paksan_Sinama1` if present (drift detection for "nobody edits the live database by hand").
- `sifirla-yerel --evet`: only if the server is localhost, the database name is exactly `Paksan_Yerel` and the marker is `yerel`. Sets SINGLE_USER, drops, then runs `kur` + `guncelle --ornek`.
- `sozluk`: reads the catalog and extended properties and rewrites the section of `VERITABANI.md` between `<!-- sozluk:basla -->` and `<!-- sozluk:bitis -->`, with a header line `kaynak-ozeti: <sha256 of V+R files>`.
- `tohum [--denetle]`: runs the generator (D5); `--denetle` compares with the tracked files and exits 1 on difference.
- `sinama [--birak]`: the F suite on Sinama1/Sinama2; drops them unless `--birak`.
- `ilk-yonetici`: creates the first admin Kullanici + Personel with a random temporary password shown once and `SifreBelirlemeGerekli=1`. There is no seeded `admin/123456` (KOD 3.4).
- `yedekle` [C]: `BACKUP … WITH CHECKSUM, INIT`; adds `COMPRESSION` only if `SERVERPROPERTY('EngineEdition')<>4` (Express). Scheduling via OS task scheduler or cron (Express has no Agent).

**D3. The SemaGecmisi guard**
- Checksum = SHA-256 of the UTF-8 bytes after stripping a BOM and normalizing CRLF to LF, so git line-ending settings on the VPS do not change it.
- For every recorded V script: if the file is missing, or its checksum differs, **abort**: "an applied V script cannot be edited; write a new V script".
- A new V script numbered below the highest applied number aborts. File names must match `^V\d{4}__[a-z0-9_]+\.sql$`, `^R__…`, `^T\d{2}__…`, `^B\d{2}__…`.

**D4. Execution**
- For each script, the runner writes a wrapper to `os.tmpdir()` and deletes it afterwards:
  ```
  :on error exit
  SET options (A17)
  SET XACT_ABORT ON
  BEGIN TRAN
  GO
  :r "<absolute path>"
  GO
  INSERT dbo.SemaGecmisi(...)
  COMMIT
  ```
- Command: `sqlcmd -S <server> -d <db> (-E | -U <user>) -C -b -I -f 65001 -h -1 -W -i <wrapper>`. On Linux, `-f` is omitted if unsupported [verify].
- A failure rolls back the whole script. The runner shows the last 20 lines of stderr and stops.
- Queries for `durum` use `SET NOCOUNT ON … FOR JSON PATH` with `-y 0`; the runner joins the output lines (sqlcmd splits JSON at about 2033 characters).
- K scripts are not wrapped (ALTER DATABASE cannot run in a transaction).

**D5. Seed generator (`tools/vt/tohum-uret.mjs`, no new npm packages)**
- **Exported constants:** Vite `createServer({configFile:false, appType:'custom', server:{middlewareMode:true}, logLevel:'error'}).ssrLoadModule(...)`. Vite is already a devDependency; it handles the `.mp4` import in products.js and the `marka/index.js` → logo.jsx chain that plain Node cannot load.
- **Unexported JSX-local constants** (`IPTAL_SEBEPLERI`, `IPTAL_NEDENLERI`, `KAPANIS_ALANLARI.satinalma` options, IslemKaydi `TURLER`, destekLog `OTURUM_SESSIZLIK`): regex-locate `const NAME = [ … ]` and evaluate only literal arrays with `new Function('return ' + text)`. Any non-literal fails the run. The API phase should move these into src/data.
- **Inputs:** talep.js, veri.js (DURUMLAR, talepDurumlari, GECIKME_SAAT, TEKLIF_BEKLEME_GUN, SIFRE_BAGLANTI_SAAT), talepAlanlari(.en).js, servisKaydi.js (YAPILAN_IS, KAPI, TARIFE, UCRET_YAZI, GARANTI_DISI_OZET), duyuruTurleri.js, yetkiler.js, iller.js, ulkeler(.en).js, bolgeler.js, kimlik.js, para.js, products(.en).js, teknikOzellikler.js (varyantlar/kaynak), kilavuzEslesme.js, parcaGruplari.js, `sunucu-taklidi/parca-katalogu/katalog.json`, kvkk(.en).js, bildirim.js (BILDIRIM), ekler.js (EK_SINIR), logo.js (LOGO.yeniSatisGun), hesap.js (OTP_SURE, SIFRE_HANE), serial.js (GARANTI_YIL), src/i18n/en.js (EN labels where the map file names a key pattern).
- **Label-only lists** get codes from the tracked `kod-eslesmeleri.json` (the codes in B, written once and reviewed). **A source label without a mapping fails the run**, so an unknown code never silently defaults.
- **Output:** deterministic SQL, sorted, `N''`-escaped, `MERGE … WHEN MATCHED AND EXISTS(SELECT s.* EXCEPT SELECT t.*) THEN UPDATE`, never DELETE (`WHEN NOT MATCHED BY SOURCE THEN UPDATE SET Aktif=0`), VALUES blocks of at most 1000 rows. Header: `-- ÜRETİLDİ, elle düzenlemeyin`.
- **Two seed kinds:**
  - T (managed by the repo, always MERGE): code lists, geography, permission catalog, catalog/brand/price list, KVKK texts (insert-only; a hash mismatch fails).
  - B (initial values PAKSAN may later edit in the app; insert-if-missing only): company, bank accounts, settings, tariff, default roles and their permissions.
- **Never seeded into test/canli:** the representative services and dealers (fake) and any users. Those go to `ornek/` for yerel only. Every O script starts with `IF NOT EXISTS(SELECT 1 FROM sistem.Ortam WHERE OrnekVeriIzinli=1) THROW 50001, N'…', 1;`.

**D6. Data dictionary**
- Every V script calls `dbo.AciklamaYaz` for each table and column. Descriptions are Turkish documentation, not UI.
- `vt sozluk` renders schema → table → purpose, columns (type, NULL, default, collation, description), PK/FK/UQ/CK and indexes, in deterministic order.

**D7. package.json**
- Add `"vt": "node tools/vt.mjs"`, `"vt:tohum": "node tools/vt.mjs tohum"`, `"vt:sinama": "node tools/vt.mjs sinama"`.
- `.gitignore`: add `veritabani/ortam/*.env` and `!veritabani/ortam/ornek.env`.

**D8. Recreating on the VPS**
1. Install SQL Server ≥2019 (any edition; recommended server collation `Turkish_100_CI_AS`, or on Linux `mssql-conf set-collation`), mssql-tools18 sqlcmd, Node 24 LTS and git.
2. Clone the repo and create the env file outside it with the admin credentials.
3. Run `node tools/vt.mjs kur --ayar <file>`. This creates `Paksan_Canli` (or `Paksan_Test`), the logins, all V/R/T/B scripts, and the environment marker.
4. Run `ilk-yonetici`. Never run `--ornek`.
5. For later updates: `git pull` → `vt durum` → backup → `vt guncelle`.

The same scripts and the same fingerprint give an identical database.

**D9. Environment guards**
- The allowed-name regex; the env/marker match; `sifirla` limited to yerel; the O-script guard; `--yedeksiz` required on test/canli without a recent backup.
- Numbering and warranty test overrides (`@Zaman`) only work when `OrnekVeriIzinli=1`.

**D10. Lint (`tools/vt/denetle.mjs`)**
- **Static** (used by dogrula): the forbidden tokens from A16, no BOM, file naming, `#temp` collation rule, no `CASCADE`, every `CREATE TABLE` has a PK.
- **Live** (used by `vt sinama`, via `sys.*`):
  - `%Zamani` is datetime2(3), `%Tarihi` is date, `%Kimlik` is uniqueidentifier, `%Kodu`/`Numara`/`SeriNo`/`GirisAdi` are BIN2, `%Tutari`/`Tutar` are decimal(18,2)
  - every FK's leading columns are indexed
  - every table and column has `MS_Description`
  - every business table has an explicit grant decision for `rol_uygulama`
  - object-name case in module definitions matches `sys.objects`

---

## E. Steps the user performs (we change no server settings)

Do this before verification step F2; steps 1–5 of section I can run without it.

1. **Enable TCP/IP.**
   - Start → Run → `SQLServerManager17.msc` (SQL Server 2025 Configuration Manager).
   - **SQL Server Network Configuration → Protocols for MSSQLSERVER → TCP/IP → Enable.**
   - Right-click TCP/IP → **Properties → IP Addresses →** scroll to **IPAll**: clear **TCP Dynamic Ports**, set **TCP Port** = `1433` → OK.
   - Do not enable anything for remote access. No firewall change is needed (local only).
2. **Enable mixed-mode authentication.**
   - Open **SQL Server Management Studio 22**, connect to `localhost` with Windows Authentication.
   - Object Explorer → right-click the server → **Properties → Security → Server authentication: "SQL Server and Windows Authentication mode"** → OK.
   - Do not enable the `sa` login.
3. **Restart the service.** Configuration Manager → **SQL Server Services → SQL Server (MSSQLSERVER) → Restart**.
4. Tell us it is done. We then verify from our side:
   - `sqlcmd -S tcp:127.0.0.1,1433 -E -C -Q "SELECT net_transport FROM sys.dm_exec_connections WHERE session_id=@@SPID"` should return TCP.
   - `SELECT SERVERPROPERTY('IsIntegratedSecurityOnly')` should return 0.
5. **Later, before 15.03.2027:** convert the evaluation edition in **SQL Server Installation Center → Maintenance → Edition Upgrade** to a free developer edition (SQL Server 2025 offers "Standard Developer", which best mirrors a non-Enterprise VPS [verify at that time]). Otherwise the service stops when the evaluation ends.

After these steps we do: `kur` for `Paksan_Yerel` (SQL-auth owner), `guncelle --ornek`, `ilk-yonetici` (local), and `vt sinama`.

---

## F. Verification

**F1. Fresh install and idempotency**
- `vt sinama` creates `Paksan_Sinama1` (marker `sinama`) with the full `kur` + `guncelle`.
- Running `guncelle` again gives "0 pending, 0 changed".
- Running `kur` again changes nothing.
- Running T/B seeds again changes 0 rows (MERGE `@@ROWCOUNT` summed, and a data hash of the reference tables compared).
- It then creates `Paksan_Sinama2` from scratch and requires **identical schema fingerprints** (`sinama/parmak-izi.sql`: SHA-256 over ordered columns, types, collations, identity/computed definitions, constraint and index definitions including filters and includes, FKs, module definitions with normalized whitespace, extended properties, `sys.database_permissions` for the roles, temporal settings).
- `Paksan_Yerel`'s fingerprint must equal Sinama's.

**F2. Checksum guard**
- Copy the V scripts to a temp folder, append a comment to V0003, run with `--betik-klasoru <tmp>` against Sinama1 → expect exit ≠ 0 and the message naming V0003.
- A missing applied V script, and a new V script numbered below the maximum, must each abort.

**F3. Constraint and permission tests** (`S01`/`S03`, run with sqlcmd `-U paksan_sinama_uygulama` except where noted). Each is TRY/CATCH asserting the error number; the script THROWs if any expectation fails.
- Duplicate `talep.Talep.Numara` → 2627.
- Same (brand, serial) twice → 2601; the same serial under another brand succeeds.
- `Kullanici` 'konya' as personel and then as servis → 2627. `Konya` (upper case), `ızmir` and `a..b` → 547.
- The same E.164 phone on two accounts → 2601. An invalid E.164 → 547.
- `denetim.IslemKaydi` UPDATE/DELETE as the app → **229**; as owner → trigger THROW.
- `kvkk.RizaOlayi` UPDATE/DELETE → 229. `kvkk.MetinSurumu` INSERT → 229.
- A seed run that alters existing KVKK text without a version bump → fails.
- `talep.DurumGecmisi` INSERT → 229. A status change without `sistem.AktorAyarla` → 51010. A status change with it → exactly 1 history row (proves trigger writes succeed despite the DENY).
- Request with a machine of another brand → 547. Service assignment without brand authorization → 547. Parts line brand ≠ request brand → 547. Satellite table for the wrong type → 547.
- Second earnings claim for the same visit → 2627. Earnings claim for a stage-`parca` or non-`garanti` visit → 547.
- Second `parcaSiparisiBorcu` for the same parts order → 2601.
- Unknown code (`DurumKodu='gonderildi'`) → 547.
- `geriCagirma` announcement targeting customers → 547.
- `satisOldu` closure without a price → 547.
- Negative amount → 547. Invalid JSON → 547.
- DELETE on `Dekont` and on `Dosya` → 229. UPDATE of `Kullanici.SifreOzeti` → 229 (the procedure path works).
- UPDATE of `sistem.Ortam` → blocked.
- An O script against `Paksan_Sinama2`, created with the marker `test` for this check → 50001.
- `rol_rapor` SELECT on `talep.Talep` → 229; SELECT on `rapor.vw_Talepler` succeeds; it sees no encrypted or hash columns.
- **NumaraAl concurrency:** Node starts two sqlcmd sessions that each call NumaraAl('SRV') 500 times → 1000 distinct numbers, max = count.
- **Year boundary:** `@Zaman='2026-12-31 21:00'` UTC → `SRV27…` (Turkey is already 1 January).
- **Optimistic concurrency:** two sessions approve the same earnings claim with the same `SatirSurumu` → one updates 1 row, the other 0.

**F4. End-to-end scenario** (`S02__senaryo.sql` as the app user; Node computes a test-key AES-GCM ciphertext and HMAC for a valid test TC and passes them as scripting variables). Each step sets `sistem.AktorAyarla`, writes the typed audit rows, and ends with assertions that THROW on mismatch.
1. Account + account-owner person + phone history; 3 consent events (aydinlatma okundu, acikRiza onay, ticariIleti ret); a device with `BildirimIzni=verildi`.
2. Machine registration: Makine (paksan, ORK12702400157), ownership, KayitOlayi; staff records the dealer sale (`paksanBayiye`, invoice date); staff assigns an authorized service. `vw_MakineninServisi` must return `makineAtamasi`, and it must return `bayiServisi` after the assignment is ended.
3. Service request: NumaraAl → SRV26xxxxx; Talep + ServisTalebiAyrinti (sorunlu) + 2 symptoms (dugumAtmiyor, anormalSes); 2 photo Dosya rows + TalepEki; voice Dosya.
4. Service stage 1: ServisZiyareti 1 (garanti, parca) + 2 parts lines; status parcaBekliyor, desk parcaMasasi.
5. PAKSAN shipment: ParcaSevki (carrier text, tracking no); desk cleared.
6. Stage 2: the visit becomes bitti (ilkKurulum→parcaDegisimi, Km 42, labour 750) + HakEdis (bekliyor, yol 504, işçilik 750, net 1254) + items; status onayBekliyor, desk servisMasasi.
7. PAKSAN correction: ZiyaretDuzeltmesi (Km 42→30) + parts before/after rows; earnings updated to 360+750=1110.
8. Approval with rowversion; ServisHesapHareketi `hakEdisAlacagi` 1110; status kapandi; Kapanis(hakEdisOnayi).
9. Notification: Bildirim (talep, `bildirimler.durumBaslik`, DegerlerJson) + Teslimat, then set `OkunmaZamani`.
10. Customer reopen: YenidenAcma; status yeni; KapanmaZamani cleared.
11. Warranty-excluded close by the service: Kapanis(garantiDisi, servisKaydi NULL); status kapandi; no new earnings claim.
12. Parts request: NumaraAl YPR; ParcaTalebiAyrinti (havale, price list 2026-07-1, KDV 0.2, excl. VAT, totals); 2 catalog lines + 1 `KatalogDisi`; FaturaBilgisi (kendisi, encrypted TC + HMAC + mask); Dekont; payment approval (status → incelemede); ParcaSevki; Kapanis(personelFormu).
13. Service parts order: NumaraAl SPS; OdemeYontemi bakiye; on close, ServisHesapHareketi parcaSiparisiBorcu; a second debit attempt fails.
14. Quote: NumaraAl TKF; TeklifTalebiAyrinti + UrunTipi (yonca, samanBugday) + Arazi; Teklif 1 (1,650,000 TRY) and Teklif 2 (1,580,000, validity date); BayiAtamasi; status kapandi, owner bayi.
15. Assertions: counts per table; `rapor.vw_Talepler` returns 4 requests with the expected statuses; the service ledger for the service shows credit 1110 and debit = SPS total; the history of the first request has the expected transition sequence; audit contains the expected type codes; `vw_MakineGarantisi` returns `faturaArtiSure` or `bilinmiyor` as configured.

**F5. Mapping check** (`npm run dogrula`, new section "Veritabanı eşleşmesi"; number per section 0; no SQL Server needed)
- (a) Every storage key in src (literal `load/save/remove/oturum*` keys, `ANAHTAR` object values, `const ANAHTAR='…'`, IndexedDB `paksan-ekler`) appears in `eslesme.json`.
- (b) Every target `sema.Tablo[.Kolon]` in `eslesme.json` exists in the V scripts (parsed `CREATE TABLE` / `ALTER TABLE … ADD`).
- (c) Each entry is either a table map or `{"karar":"cihazda"|"kaldirildi"|"hesaplanir","gerekce":"…"}`.
- (d) `vt tohum --denetle` is clean.
- (e) Static lint (D10).
- (f) `git ls-files veritabani/ortam` contains only `ornek.env`.
- (g) The `kaynak-ozeti` in `VERITABANI.md` equals the current V+R hash (dictionary not stale).
- The field-level entries in `eslesme.json` are curated once from the inventory, with every field in B's source lines; the check guarantees new storage keys cannot appear without a database decision.

**F6. Dictionary review**
- `vt sozluk` on Sinama1, with the live lint requiring 100% `MS_Description` coverage.
- Manual read-through of the generated section for Turkish clarity.
- `npm run dogrula` passes.
- The three builds (`build`, `build:backoffice`, `build:servis`) are run once as a regression, since `package.json` changes.

---

## G. Documentation updates

- **New `D:\PAKSAN\paksan\VERITABANI.md`** (Turkish, for a non-developer reader), in this order:
  1. purpose and scope
  2. environments and database names
  3. rules (identity, numbers, time, money, code lists, collation, encryption, history, deletion/KVKK)
  4. schema map (which app writes and reads each schema)
  5. permission model
  6. commands
  7. installing on a VPS
  8. localStorage → table map (rendered from `eslesme.json`)
  9. generated dictionary
  10. open questions
- **SUNUCU-VE-VERITABANI.md (short):**
  - A dated decision note under the title: "16 Eylül 2026: kurulum VPS'te (Senaryo C). Uygulama sunucusu ve veritabanı VPS'te, LOGO şirkette; LOGO bağlantısı sonra. Ayrıntı: VERITABANI.md."
  - Mark §5 Senaryo C as "(seçildi)".
  - In §7, replace the `paksan_connect` example with a pointer to the names in VERITABANI.md.
- **CLAUDE.md, a new short section "Veritabanı":**
  - scripts live in `veritabani/`, commands `npm run vt -- …`
  - V scripts are never edited, always add a new V
  - seeds are generated, never hand-edited (`npm run vt:tohum`)
  - `ornek` only on yerel
  - secrets only in `veritabani/ortam/*.env`
  - a new localStorage key needs an `eslesme.json` decision
  - update the "on iki kontrol" count to 13 (or 14)
- **Memory:** new `C:\Users\ogoka\.claude\projects\D--PAKSAN-paksan\memory\paksan-veritabani.md` (decisions summary: VPS/Scenario C, database names, UUIDv7 + Sira, numbering proc, Turkish_100 + BIN2, runner commands, user enabled TCP and mixed mode on DATE), plus one line in `MEMORY.md`.
- **The multi-brand plan file:** renumber its dogrula section if the DB check takes 13.

---

## H. Open questions for PAKSAN (defaults allow work to continue)

1. **Database names** `Paksan_Yerel/Test/Canli`, and test + live on the same VPS in separate databases with separate logins. Default: yes.
2. **VPS SQL Server version:** minimum 2019. Express is acceptable to start (10 GB, 1.4 GB RAM; files stay on disk). Default: yes.
3. **Password hashing:** scrypt, built into Node, with no npm approval needed. The alternative is argon2 (needs a package). Default: scrypt.
4. **Family account:** one login phone, several persons. Default: yes.
5. **Warranty fallback:** days added to the dealer invoice date when no delivery document exists (`GarantiFaturaEkGun`), for sales to decide. Default: NULL, shown as "not verified" (KOD Q15).
6. **Retention (lawyer):**
   - login attempts: 90 days
   - OTP codes: 30 days
   - sessions: 1 year after end
   - support events: 2 years
   - files of cancelled requests: 2 years
   - receipts and audit log: indefinite

   Default: seeded with `HukukOnayli=0`.
7. **Shipping carrier list.** Default: free text now, empty code list.
8. **Merged cancel-reason list** (7 codes, backoffice wording). Default: yes; Codex reviews wording when the UI uses it.

---

## I. Implementation order

1. Scaffolding: folders, `.gitignore`, `ornek.env`, `package.json` scripts, `tools/vt/ortam.mjs` (own `.env` parser), `sqlcmd.mjs` (finding sqlcmd, spawn, environment variables), static `denetle.mjs`.
2. K01/K02, then run `kur` on `Paksan_Sinama1` with `--yonetici windows` (works before step E).
3. V0001–V0013 with `AciklamaYaz` for every object, then V0014 grants. Check with `guncelle` using Windows auth on Sinama1.
4. R scripts (procedures, triggers, views).
5. Generator + `kaynak/*.json` mappings → T/B seeds → `vt tohum --denetle`.
6. `eslesme.json` + the dogrula section.
7. **Wait for user step E**, then switch the owner, app and report connections to SQL auth.
8. `sinama` suite (F1–F4), the O scripts, `ilk-yonetici`.
9. `sozluk` → `VERITABANI.md`; SUNUCU, CLAUDE.md and memory updates; `npm run dogrula`; the three builds.
10. Create `Paksan_Yerel` (`kur` + `guncelle --ornek`) and check `vt durum` against the fingerprint.

Commit only when the user asks, on a branch.

---

## J. Pitfalls to watch

- **sqlcmd:** `-I` is mandatory, and so is `-f 65001`. Descriptions and seeds must use `N''` literals.
- **Case of identifiers** in the Turkish-collation database (`Il` vs `il`): the lint and exact-case discipline. Temp tables need `DATABASE_DEFAULT`.
- **Temporal tables:** altering or dropping one in a later V script requires `SYSTEM_VERSIONING=OFF` first; document the pattern in VERITABANI.md.
- **Composite FKs** reference columns that must never change after the child row exists: Talep.TurKodu, Talep.MarkaKodu, Ziyaret.KapiKodu, and Ziyaret.AsamaKodu once an earnings claim exists. The API must treat these as immutable.
- **Unverified behavior to test, not assume:** SESSION_CONTEXT reset on pooled connections (API phase); ownership chaining through DENY (proved by F3's DurumGecmisi test); `-f` on Linux sqlcmd (at VPS setup); the Standard Developer edition name (at conversion time).
- **Express has no Agent:** backups, outbox sending and purge jobs are OS-scheduled or run by the API.
- **Heavy dogrula import:** the Vite SSR generator runs inside `npm run dogrula` (about 1–2 s). If a module fails to import, the check must report which constant failed, not skip it silently.

---

### Critical files for implementation
- D:\PAKSAN\paksan\tools\vt.mjs
- D:\PAKSAN\paksan\veritabani\semalar\V0010__talep.sql
- D:\PAKSAN\paksan\tools\vt\tohum-uret.mjs
- D:\PAKSAN\paksan\veritabani\eslesme.json
- D:\PAKSAN\paksan\tools\dogrula.mjs