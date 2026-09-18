/* ==========================================================================
   parmak-izi.sql — veritabanı yapısının parmak izi (SHA-256)

   NE İŞE YARAR: aynı betiklerden kurulmuş iki veritabanının yapısı
   birebir aynı mı? `npm run vt -- sinama` bunu Paksan_Sinama1 ile sıfırdan
   kurulan Paksan_Sinama2 arasında sorar (tasarim.md 7.1 KR-05); S04
   esneklik sınamasının "şema değişmedi" denetimi (7.6) ve Paksan_Yerel
   karşılaştırması (KR-06) da bunu kullanır.

   Kim çalıştırır: sahip girişi (veritabanında dbo; bütün tanımları görür).
   SSMS'te düz sorgu olarak da çalışır: SQLCMD kipi ya da değişken gerekmez,
   hiçbir şey yazmaz (yalnız oturumun geçici tablosu).

   NEYE BAKAR (bölüm başına ayrı özet, sonra hepsinin tek özeti):
     01 veritabanı seçenekleri (harmanlama, uyumluluk, RCSI, ANSI ayarları;
        kurtarma modeli ve sorgu deposu HARİÇ: canlıda FULL, öteki
        ortamlarda SIMPLE olması kuraldır, sorgu deposu kendiliğinden
        salt okura geçebilir)
     02 şemalar ve sahipleri          03 kullanıcılar ve roller
     04 rol üyelikleri                05 tablolar (sistem sürümlü ayarlar,
                                         geçmiş tablosu, dönem kolonları)
     06 kolonlar (tip, uzunluk, harmanlama, boş olabilirlik, kimlik,
        hesaplanmış kolon ifadesi, varsayılan)
     07 birincil anahtar ve tekil kısıtlar   08 CHECK kısıtları
     09 yabancı anahtarlar            10 dizinler (filtre, INCLUDE,
                                         sıkıştırma)
     11 elle açılmış istatistikler    12 modül metinleri (görünüm,
                                         prosedür, işlev, tetikleyici)
     13 tetikleyiciler                14 parametreler
     15 nesne listesi ve sahipleri    16 kullanıcı tanımlı tipler
     17 diziler (SEQUENCE)            18 eş anlamlılar (SYNONYM)
     19 XML şema koleksiyonları       20 satır güvenliği politikaları
     21 açıklamalar (MS_Description ve öteki genişletilmiş özellikler)
     22 izinler (GRANT/DENY)          23 anahtarlar ve sertifikalar
     24 dosya grupları

   NEYE BAKMAZ: veri, satır sayıları, dosya boyutları, oluşturma ve
   değişiklik zamanları, sayaçların o anki değeri (kimlik, dizi),
   motorun kendiliğinden açtığı istatistikler, sistem nesnelerinin
   public izinleri (sunucu sürümüne göre değişir).

   VERİTABANI ADINDAN BAĞIMSIZ: veritabanının adı, dosya adları ve
   kimlik (GUID, SID) değerleri özete girmez. Ortamdan gelen üç değer
   sabitlenir: veritabanı sahibinin ve kullanıcıların bağlı olduğu giriş
   adı (paksan_sinama_uygulama → "paksan_<ortam>_uygulama") ve PaksanOrtam
   özelliğinin değeri ("<ortam>"). Metinlerde (modül, açıklama) arama/
   değiştirme YAPILMAZ: V/R/T/B/O betikleri sqlcmd değişkeni kullanmaz,
   metinde geçen "Paksan_Sinama1" gibi bir ad her kurulumda aynı kalır;
   metne ortama göre değişen bir ad girerse bu gerçek bir farktır ve
   görünmelidir. Motorun adlandırdığı kısıt (is_system_named) adı
   "<sistem>" yazılır; kuralımızda adsız kısıt yoktur ama olursa rastgele
   ad parmak izini bozmasın. Modül metinlerinde CRLF → LF (git dosyayı
   Windows'ta CRLF, VPS'te LF getirebilir).

   ÇIKTI
     Varsayılan: Bolum, Ozet satırları; son satır TOPLAM (tek SHA-256).
     Oturumda #ParmakIziAyrinti geçici tablosu varsa (tools/vt/sinama.mjs
     farkı göstermek için açar): her bölümün JSON içeriği tek bir
     FOR JSON sonucunda döner.

   Kurallar: tasarim.md 6.6, 7.1 (KR-05, KR-06), 7.6 (ES-20).
   ========================================================================== */
SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;

IF OBJECT_ID(N'tempdb..#ParmakIzi') IS NOT NULL DROP TABLE #ParmakIzi;
IF OBJECT_ID(N'tempdb..#DizinAdi') IS NOT NULL DROP TABLE #DizinAdi;

CREATE TABLE #ParmakIzi (
    Bolum  nvarchar(60)  COLLATE DATABASE_DEFAULT NOT NULL PRIMARY KEY,
    Icerik nvarchar(max) COLLATE DATABASE_DEFAULT NULL,
    Ozet   binary(32) NULL
);

/* Dizin adları: motorun adlandırdığı kısıta ait dizin "<sistem>" olur. */
CREATE TABLE #DizinAdi (
    NesneKimlik int NOT NULL,
    DizinNo     int NOT NULL,
    Ad          nvarchar(128) COLLATE DATABASE_DEFAULT NULL,
    PRIMARY KEY (NesneKimlik, DizinNo)
);

INSERT #DizinAdi (NesneKimlik, DizinNo, Ad)
SELECT i.object_id, i.index_id,
       CASE WHEN EXISTS (SELECT 1 FROM sys.key_constraints AS k
                         WHERE k.parent_object_id = i.object_id
                           AND k.unique_index_id = i.index_id
                           AND k.is_system_named = 1)
            THEN N'<sistem>' ELSE i.name END
FROM sys.indexes AS i
JOIN sys.objects AS o ON o.object_id = i.object_id
WHERE o.is_ms_shipped = 0;

DECLARE @Ortam nvarchar(10) = NULL;
IF OBJECT_ID(N'sistem.Ortam', N'U') IS NOT NULL
    SELECT @Ortam = OrtamKodu FROM sistem.Ortam;

/* --------------------------------------------------------------------------
   01 Veritabanı seçenekleri
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'01_veritabani', (
    SELECT d.collation_name                    AS Harmanlama,
           d.compatibility_level               AS Uyumluluk,
           d.is_read_committed_snapshot_on     AS SatirSurumuOkuma,
           d.snapshot_isolation_state_desc     AS AnlikGoruntu,
           d.is_ansi_null_default_on           AS AnsiNullVarsayilan,
           d.is_ansi_nulls_on                  AS AnsiNulls,
           d.is_ansi_padding_on                AS AnsiPadding,
           d.is_ansi_warnings_on               AS AnsiWarnings,
           d.is_arithabort_on                  AS ArithAbort,
           d.is_concat_null_yields_null_on     AS ConcatNull,
           d.is_numeric_roundabort_on          AS NumericRoundAbort,
           d.is_quoted_identifier_on           AS QuotedIdentifier,
           d.is_recursive_triggers_on          AS OzyinelemeliTetikleyici,
           d.is_cursor_close_on_commit_on      AS ImlecKapanisi,
           d.is_local_cursor_default           AS YerelImlec,
           d.is_auto_close_on                  AS OtomatikKapanma,
           d.is_auto_shrink_on                 AS OtomatikKuculme,
           d.is_auto_create_stats_on           AS IstatistikOlustur,
           d.is_auto_update_stats_on           AS IstatistikGuncelle,
           d.is_auto_update_stats_async_on     AS IstatistikGuncelleEszamansiz,
           d.page_verify_option_desc           AS SayfaDenetimi,
           d.is_trustworthy_on                 AS Guvenilir,
           d.is_db_chaining_on                 AS VeritabaniZinciri,
           d.is_parameterization_forced        AS ZorunluParametre,
           d.containment_desc                  AS Kapsama,
           d.is_temporal_history_retention_enabled AS GecmisSaklama,
           d.delayed_durability_desc           AS GecikmeliKalicilik,
           d.is_date_correlation_on            AS TarihKorelasyonu,
           d.target_recovery_time_in_seconds   AS HedefKurtarmaSaniye,
           CASE WHEN SUSER_SNAME(d.owner_sid) LIKE N'paksan[_]' + @Ortam + N'[_]%'
                THEN N'paksan_<ortam>_' + SUBSTRING(SUSER_SNAME(d.owner_sid), LEN(N'paksan_' + @Ortam + N'_') + 1, 128)
                ELSE SUSER_SNAME(d.owner_sid)
           END                                 AS SahipGiris
    FROM sys.databases AS d
    WHERE d.database_id = DB_ID()
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   02 Şemalar (sistem şemaları ve sabit rol şemaları hariç)
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'02_semalar', (
    SELECT s.name AS Sema, USER_NAME(s.principal_id) AS Sahip
    FROM sys.schemas AS s
    WHERE s.schema_id BETWEEN 5 AND 16383
    ORDER BY s.name COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   03 Kullanıcılar ve roller (public, dbo, guest, INFORMATION_SCHEMA, sys
   ve sabit roller hariç; guest'in durumu izinlerde görünür)
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'03_sorumlular', (
    SELECT p.name                                  AS Ad,
           p.type_desc                             AS Tur,
           p.default_schema_name                   AS VarsayilanSema,
           p.authentication_type_desc              AS KimlikDogrulama,
           USER_NAME(p.owning_principal_id)        AS SahipSorumlu,
           CASE WHEN p.type NOT IN ('S', 'U', 'G', 'E', 'X') THEN NULL
                WHEN SUSER_SNAME(p.sid) LIKE N'paksan[_]' + @Ortam + N'[_]%'
                THEN N'paksan_<ortam>_' + SUBSTRING(SUSER_SNAME(p.sid), LEN(N'paksan_' + @Ortam + N'_') + 1, 128)
                ELSE SUSER_SNAME(p.sid)
           END                                     AS Giris
    FROM sys.database_principals AS p
    WHERE p.principal_id >= 5
      AND p.is_fixed_role = 0
    ORDER BY p.name COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   04 Rol üyelikleri
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'04_rol_uyelikleri', (
    SELECT USER_NAME(rm.role_principal_id)   AS Rol,
           USER_NAME(rm.member_principal_id) AS Uye
    FROM sys.database_role_members AS rm
    ORDER BY USER_NAME(rm.role_principal_id) COLLATE Latin1_General_100_BIN2,
             USER_NAME(rm.member_principal_id) COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   05 Tablolar ve sistem sürümlü (temporal) ayarlar
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'05_tablolar', (
    SELECT SCHEMA_NAME(t.schema_id)                AS Sema,
           t.name                                  AS Tablo,
           USER_NAME(t.principal_id)               AS AyriSahip,
           t.temporal_type_desc                    AS SurumTuru,
           OBJECT_SCHEMA_NAME(t.history_table_id) + N'.' + OBJECT_NAME(t.history_table_id) AS GecmisTablosu,
           /* Geçmiş saklama süresi kolonları JSON yoluyla okunur: kolon adı
              düz yazılırsa statik denetimin "geçmiş saklama süresi
              kullanılmıyor" kuralı bu okumayı kullanım sanıyor. */
           JSON_VALUE(tj.Satir, '$.history_retention_period')           AS GecmisSaklamaSuresi,
           JSON_VALUE(tj.Satir, '$.history_retention_period_unit_desc') AS GecmisSaklamaBirimi,
           (SELECT COL_NAME(pr.object_id, pr.start_column_id) AS Baslangic,
                   COL_NAME(pr.object_id, pr.end_column_id)   AS Bitis,
                   pr.period_type_desc                        AS Tur
            FROM sys.periods AS pr
            WHERE pr.object_id = t.object_id
            ORDER BY pr.period_type_desc COLLATE Latin1_General_100_BIN2
            FOR JSON PATH, INCLUDE_NULL_VALUES)    AS Donemler,
           t.lock_escalation_desc                  AS KilitYukseltme,
           t.is_memory_optimized                   AS Bellekte,
           t.durability_desc                       AS Kalicilik,
           t.is_external                           AS Dis,
           t.is_node                               AS GrafDugum,
           t.is_edge                               AS GrafKenar,
           t.is_filetable                          AS DosyaTablosu,
           t.large_value_types_out_of_row          AS BuyukDegerSatirDisi,
           t.text_in_row_limit                     AS SatirIciMetinSiniri,
           t.uses_ansi_nulls                       AS AnsiNulls,
           t.is_tracked_by_cdc                     AS DegisiklikYakalama,
           CASE WHEN EXISTS (SELECT 1 FROM sys.change_tracking_tables AS ct
                             WHERE ct.object_id = t.object_id) THEN 1 ELSE 0 END AS DegisiklikIzleme,
           (SELECT ds.name
            FROM sys.indexes AS i
            JOIN sys.data_spaces AS ds ON ds.data_space_id = i.data_space_id
            WHERE i.object_id = t.object_id AND i.index_id < 2) AS VeriAlani,
           FILEGROUP_NAME(NULLIF(t.lob_data_space_id, 0)) AS BuyukVeriAlani
    FROM sys.tables AS t
    CROSS APPLY (SELECT (SELECT t2.* FROM sys.tables AS t2
                         WHERE t2.object_id = t.object_id
                         FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS Satir) AS tj
    WHERE t.is_ms_shipped = 0
    ORDER BY SCHEMA_NAME(t.schema_id) COLLATE Latin1_General_100_BIN2,
             t.name COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   06 Kolonlar (tablo, görünüm ve tablo döndüren işlev kolonları)
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'06_kolonlar', (
    SELECT SCHEMA_NAME(o.schema_id)                AS Sema,
           o.name                                  AS Nesne,
           RTRIM(o.type)                           AS NesneTuru,
           c.column_id                             AS Sira,
           c.name                                  AS Kolon,
           CASE WHEN ty.is_user_defined = 1 THEN SCHEMA_NAME(ty.schema_id) + N'.' + ty.name
                ELSE ty.name END                   AS Tip,
           TYPE_NAME(c.system_type_id)             AS TemelTip,
           c.max_length                            AS Uzunluk,
           c.precision                             AS Duyarlik,
           c.scale                                 AS Olcek,
           c.collation_name                        AS Harmanlama,
           c.is_nullable                           AS BosOlabilir,
           c.is_ansi_padded                        AS AnsiPadding,
           c.is_rowguidcol                         AS SatirGuidKolonu,
           c.is_identity                           AS Kimlik,
           CONVERT(nvarchar(40), ic.seed_value)      AS KimlikBaslangic,
           CONVERT(nvarchar(40), ic.increment_value) AS KimlikArtis,
           ic.is_not_for_replication               AS KimlikCogaltmaDisi,
           c.is_computed                           AS Hesaplanmis,
           cc.definition                           AS HesapIfadesi,
           cc.is_persisted                         AS HesapKalici,
           c.is_filestream                         AS DosyaAkisi,
           c.is_xml_document                       AS XmlBelge,
           (SELECT SCHEMA_NAME(x.schema_id) + N'.' + x.name
            FROM sys.xml_schema_collections AS x
            WHERE x.xml_collection_id = NULLIF(c.xml_collection_id, 0)) AS XmlKoleksiyonu,
           c.is_sparse                             AS Seyrek,
           c.is_column_set                         AS KolonKumesi,
           c.generated_always_type_desc            AS Uretilen,
           c.is_hidden                             AS Gizli,
           c.is_masked                             AS Maskeli,
           mc.masking_function                     AS MaskeIslevi,
           CASE WHEN dc.is_system_named = 1 THEN N'<sistem>' ELSE dc.name END AS VarsayilanAdi,
           dc.definition                           AS Varsayilan
    FROM sys.columns AS c
    JOIN sys.objects AS o
      ON o.object_id = c.object_id
     AND o.is_ms_shipped = 0
     AND o.type IN ('U', 'V', 'IF', 'TF')
    JOIN sys.types AS ty ON ty.user_type_id = c.user_type_id
    LEFT JOIN sys.identity_columns AS ic ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    LEFT JOIN sys.computed_columns AS cc ON cc.object_id = c.object_id AND cc.column_id = c.column_id
    LEFT JOIN sys.masked_columns   AS mc ON mc.object_id = c.object_id AND mc.column_id = c.column_id
    LEFT JOIN sys.default_constraints AS dc
      ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    ORDER BY SCHEMA_NAME(o.schema_id) COLLATE Latin1_General_100_BIN2,
             o.name COLLATE Latin1_General_100_BIN2,
             c.column_id
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   07 Birincil anahtar ve tekil kısıtlar (dizin tanımı 10'da)
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'07_anahtar_kisitlari', (
    SELECT SCHEMA_NAME(k.schema_id)                AS Sema,
           OBJECT_NAME(k.parent_object_id)         AS Tablo,
           CASE WHEN k.is_system_named = 1 THEN N'<sistem>' ELSE k.name END AS Ad,
           k.type_desc                             AS Tur,
           k.is_system_named                       AS MotorAdi,
           kc.Kolonlar                             AS Kolonlar
    FROM sys.key_constraints AS k
    JOIN sys.objects AS po ON po.object_id = k.parent_object_id AND po.is_ms_shipped = 0
    CROSS APPLY (SELECT STRING_AGG(CONVERT(nvarchar(max), COL_NAME(ixc.object_id, ixc.column_id)), N',')
                            WITHIN GROUP (ORDER BY ixc.key_ordinal) AS Kolonlar
                 FROM sys.index_columns AS ixc
                 WHERE ixc.object_id = k.parent_object_id
                   AND ixc.index_id = k.unique_index_id
                   AND ixc.is_included_column = 0) AS kc
    ORDER BY SCHEMA_NAME(k.schema_id) COLLATE Latin1_General_100_BIN2,
             OBJECT_NAME(k.parent_object_id) COLLATE Latin1_General_100_BIN2,
             k.type_desc COLLATE Latin1_General_100_BIN2,
             CASE WHEN k.is_system_named = 1 THEN N'<sistem>' ELSE k.name END COLLATE Latin1_General_100_BIN2,
             kc.Kolonlar COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   08 CHECK kısıtları
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'08_check_kisitlari', (
    SELECT SCHEMA_NAME(ck.schema_id)               AS Sema,
           OBJECT_NAME(ck.parent_object_id)        AS Tablo,
           CASE WHEN ck.is_system_named = 1 THEN N'<sistem>' ELSE ck.name END AS Ad,
           COL_NAME(ck.parent_object_id, NULLIF(ck.parent_column_id, 0)) AS Kolon,
           ck.definition                           AS Tanim,
           ck.is_disabled                          AS Kapali,
           ck.is_not_trusted                       AS Guvenilmez,
           ck.is_not_for_replication               AS CogaltmaDisi,
           ck.uses_database_collation              AS VeritabaniHarmanlamasi,
           ck.is_system_named                      AS MotorAdi
    FROM sys.check_constraints AS ck
    JOIN sys.objects AS po ON po.object_id = ck.parent_object_id AND po.is_ms_shipped = 0
    ORDER BY SCHEMA_NAME(ck.schema_id) COLLATE Latin1_General_100_BIN2,
             OBJECT_NAME(ck.parent_object_id) COLLATE Latin1_General_100_BIN2,
             CASE WHEN ck.is_system_named = 1 THEN N'<sistem>' ELSE ck.name END COLLATE Latin1_General_100_BIN2,
             ck.definition COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   09 Yabancı anahtarlar
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'09_yabanci_anahtarlar', (
    SELECT SCHEMA_NAME(fk.schema_id)               AS Sema,
           OBJECT_NAME(fk.parent_object_id)        AS Tablo,
           CASE WHEN fk.is_system_named = 1 THEN N'<sistem>' ELSE fk.name END AS Ad,
           OBJECT_SCHEMA_NAME(fk.referenced_object_id) AS HedefSema,
           OBJECT_NAME(fk.referenced_object_id)    AS HedefTablo,
           da.Ad                                   AS HedefDizin,
           fk.delete_referential_action_desc       AS SilmeEylemi,
           fk.update_referential_action_desc       AS GuncellemeEylemi,
           fk.is_disabled                          AS Kapali,
           fk.is_not_trusted                       AS Guvenilmez,
           fk.is_not_for_replication               AS CogaltmaDisi,
           fk.is_system_named                      AS MotorAdi,
           fkk.Kolonlar                            AS Kolonlar
    FROM sys.foreign_keys AS fk
    JOIN sys.objects AS po ON po.object_id = fk.parent_object_id AND po.is_ms_shipped = 0
    LEFT JOIN #DizinAdi AS da ON da.NesneKimlik = fk.referenced_object_id AND da.DizinNo = fk.key_index_id
    CROSS APPLY (SELECT STRING_AGG(CONVERT(nvarchar(max),
                            COL_NAME(fkc.parent_object_id, fkc.parent_column_id) + N'>'
                            + COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id)), N',')
                            WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS Kolonlar
                 FROM sys.foreign_key_columns AS fkc
                 WHERE fkc.constraint_object_id = fk.object_id) AS fkk
    ORDER BY SCHEMA_NAME(fk.schema_id) COLLATE Latin1_General_100_BIN2,
             OBJECT_NAME(fk.parent_object_id) COLLATE Latin1_General_100_BIN2,
             CASE WHEN fk.is_system_named = 1 THEN N'<sistem>' ELSE fk.name END COLLATE Latin1_General_100_BIN2,
             fkk.Kolonlar COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   10 Dizinler (tablo ve görünüm; varsayımsal dizinler hariç)
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'10_dizinler', (
    SELECT SCHEMA_NAME(o.schema_id)                AS Sema,
           o.name                                  AS Nesne,
           da.Ad                                   AS Dizin,
           i.type_desc                             AS Tur,
           i.is_unique                             AS Tekil,
           i.is_primary_key                        AS BirincilAnahtar,
           i.is_unique_constraint                  AS TekilKisit,
           i.ignore_dup_key                        AS YinelenenAnahtariYoksay,
           i.fill_factor                           AS DolulukOrani,
           i.is_padded                             AS Dolgulu,
           i.is_disabled                           AS Kapali,
           i.allow_row_locks                       AS SatirKilidi,
           i.allow_page_locks                      AS SayfaKilidi,
           i.has_filter                            AS Filtreli,
           i.filter_definition                     AS Filtre,
           i.optimize_for_sequential_key           AS SiraliAnahtar,
           ds.name                                 AS VeriAlani,
           p.data_compression_desc                 AS Sikistirma,
           dk.Anahtar                              AS AnahtarKolonlari,
           dk.Ek                                   AS EkKolonlar
    FROM sys.indexes AS i
    JOIN sys.objects AS o
      ON o.object_id = i.object_id
     AND o.is_ms_shipped = 0
     AND o.type IN ('U', 'V')
    JOIN #DizinAdi AS da ON da.NesneKimlik = i.object_id AND da.DizinNo = i.index_id
    LEFT JOIN sys.data_spaces AS ds ON ds.data_space_id = i.data_space_id
    LEFT JOIN sys.partitions AS p
      ON p.object_id = i.object_id AND p.index_id = i.index_id AND p.partition_number = 1
    CROSS APPLY (SELECT STRING_AGG(CASE WHEN ixc.is_included_column = 0
                                        THEN CONVERT(nvarchar(max), COL_NAME(ixc.object_id, ixc.column_id))
                                             + CASE WHEN ixc.is_descending_key = 1 THEN N' DESC' ELSE N'' END
                                        END, N',')
                            WITHIN GROUP (ORDER BY ixc.key_ordinal, ixc.index_column_id) AS Anahtar,
                        (SELECT STRING_AGG(CONVERT(nvarchar(max), COL_NAME(e.object_id, e.column_id)), N',')
                                    WITHIN GROUP (ORDER BY COL_NAME(e.object_id, e.column_id))
                         FROM sys.index_columns AS e
                         WHERE e.object_id = i.object_id
                           AND e.index_id = i.index_id
                           AND e.is_included_column = 1) AS Ek
                 FROM sys.index_columns AS ixc
                 WHERE ixc.object_id = i.object_id
                   AND ixc.index_id = i.index_id) AS dk
    WHERE i.is_hypothetical = 0
    ORDER BY SCHEMA_NAME(o.schema_id) COLLATE Latin1_General_100_BIN2,
             o.name COLLATE Latin1_General_100_BIN2,
             i.type,
             da.Ad COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   11 Elle açılmış istatistikler (motorun _WA_Sys_ ve dizin istatistikleri,
   Veritabanı Ayarlama Danışmanı'nın _dta_ istatistikleri hariç)
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'11_istatistikler', (
    SELECT SCHEMA_NAME(o.schema_id)                AS Sema,
           o.name                                  AS Nesne,
           st.name                                 AS Istatistik,
           st.filter_definition                    AS Filtre,
           st.no_recompute                         AS YenidenHesaplamaYok,
           st.is_incremental                       AS Artimli,
           (SELECT STRING_AGG(CONVERT(nvarchar(max), COL_NAME(sc.object_id, sc.column_id)), N',')
                       WITHIN GROUP (ORDER BY sc.stats_column_id)
            FROM sys.stats_columns AS sc
            WHERE sc.object_id = st.object_id AND sc.stats_id = st.stats_id) AS Kolonlar
    FROM sys.stats AS st
    JOIN sys.objects AS o ON o.object_id = st.object_id AND o.is_ms_shipped = 0
    WHERE st.user_created = 1
      AND st.name NOT LIKE N'[_]dta[_]%'
    ORDER BY SCHEMA_NAME(o.schema_id) COLLATE Latin1_General_100_BIN2,
             o.name COLLATE Latin1_General_100_BIN2,
             st.name COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   12 Modül metinleri (görünüm, prosedür, işlev, tetikleyici; veritabanı
   düzeyi DDL tetikleyicileri sys.objects'te olmadığı için ayrıca)
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'12_moduller', (
    SELECT m.Sema, m.Ad, m.Tur, m.UstNesne,
           REPLACE(sm.definition COLLATE Latin1_General_100_BIN2, NCHAR(13) + NCHAR(10), NCHAR(10)) AS Tanim,
           sm.uses_ansi_nulls                      AS AnsiNulls,
           sm.uses_quoted_identifier               AS QuotedIdentifier,
           sm.is_schema_bound                      AS SemayaBagli,
           sm.uses_database_collation              AS VeritabaniHarmanlamasi,
           sm.is_recompiled                        AS HerSeferDerlenir,
           sm.null_on_null_input                   AS NullGirdiNullCikti,
           CASE WHEN sm.execute_as_principal_id = -2 THEN N'OWNER'
                ELSE USER_NAME(sm.execute_as_principal_id) END AS CalistiranKimlik,
           sm.uses_native_compilation              AS YerelDerleme
    FROM sys.sql_modules AS sm
    CROSS APPLY (
        SELECT SCHEMA_NAME(o.schema_id) AS Sema,
               o.name                   AS Ad,
               o.type_desc              AS Tur,
               CASE WHEN o.parent_object_id <> 0
                    THEN OBJECT_SCHEMA_NAME(o.parent_object_id) + N'.' + OBJECT_NAME(o.parent_object_id)
               END                      AS UstNesne
        FROM sys.objects AS o
        WHERE o.object_id = sm.object_id
          AND o.is_ms_shipped = 0
        UNION ALL
        SELECT NULL, tr.name, tr.type_desc, N'<veritabani>'
        FROM sys.triggers AS tr
        WHERE tr.object_id = sm.object_id
          AND tr.parent_class = 0
          AND tr.is_ms_shipped = 0) AS m
    ORDER BY m.Sema COLLATE Latin1_General_100_BIN2,
             m.Ad COLLATE Latin1_General_100_BIN2,
             m.Tur COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   13 Tetikleyiciler (tür, olaylar, açık/kapalı)
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'13_tetikleyiciler', (
    SELECT OBJECT_SCHEMA_NAME(tr.object_id)        AS Sema,
           tr.name                                 AS Ad,
           tr.parent_class_desc                    AS UstSinif,
           CASE WHEN tr.parent_class = 1
                THEN OBJECT_SCHEMA_NAME(tr.parent_id) + N'.' + OBJECT_NAME(tr.parent_id)
           END                                     AS UstNesne,
           tr.type_desc                            AS Tur,
           tr.is_disabled                          AS Kapali,
           tr.is_not_for_replication               AS CogaltmaDisi,
           tr.is_instead_of_trigger                AS YerineCalisir,
           (SELECT STRING_AGG(CONVERT(nvarchar(max), te.type_desc
                                  + CASE WHEN te.is_first = 1 THEN N' ilk' ELSE N'' END
                                  + CASE WHEN te.is_last = 1 THEN N' son' ELSE N'' END), N',')
                       WITHIN GROUP (ORDER BY te.type_desc)
            FROM sys.trigger_events AS te
            WHERE te.object_id = tr.object_id)     AS Olaylar
    FROM sys.triggers AS tr
    WHERE tr.is_ms_shipped = 0
    ORDER BY OBJECT_SCHEMA_NAME(tr.object_id) COLLATE Latin1_General_100_BIN2,
             tr.name COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   14 Parametreler (prosedür ve işlev; işlevin dönüş değeri 0 numaralı)
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'14_parametreler', (
    SELECT SCHEMA_NAME(o.schema_id)                AS Sema,
           o.name                                  AS Nesne,
           pa.parameter_id                         AS Sira,
           pa.name                                 AS Parametre,
           CASE WHEN ty.is_user_defined = 1 THEN SCHEMA_NAME(ty.schema_id) + N'.' + ty.name
                ELSE ty.name END                   AS Tip,
           pa.max_length                           AS Uzunluk,
           pa.precision                            AS Duyarlik,
           pa.scale                                AS Olcek,
           pa.is_output                            AS Cikti,
           pa.is_cursor_ref                        AS Imlec,
           pa.has_default_value                    AS VarsayilanVar,
           pa.is_xml_document                      AS XmlBelge,
           pa.is_readonly                          AS SaltOkunur,
           pa.is_nullable                          AS BosOlabilir
    FROM sys.parameters AS pa
    JOIN sys.objects AS o ON o.object_id = pa.object_id AND o.is_ms_shipped = 0
    JOIN sys.types AS ty ON ty.user_type_id = pa.user_type_id
    ORDER BY SCHEMA_NAME(o.schema_id) COLLATE Latin1_General_100_BIN2,
             o.name COLLATE Latin1_General_100_BIN2,
             pa.parameter_id
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   15 Nesne listesi (kısıtlar kendi bölümlerinde; tablo tipinin motorun
   verdiği rastgele adlı iç nesnesi 16'da tip adıyla)
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'15_nesneler', (
    SELECT SCHEMA_NAME(o.schema_id)                AS Sema,
           o.name                                  AS Ad,
           o.type_desc                             AS Tur,
           CASE WHEN o.parent_object_id <> 0
                THEN OBJECT_SCHEMA_NAME(o.parent_object_id) + N'.' + OBJECT_NAME(o.parent_object_id)
           END                                     AS UstNesne,
           USER_NAME(o.principal_id)               AS AyriSahip
    FROM sys.objects AS o
    WHERE o.is_ms_shipped = 0
      AND o.type NOT IN ('C', 'D', 'F', 'PK', 'UQ', 'TT', 'IT', 'S', 'EC')
    ORDER BY SCHEMA_NAME(o.schema_id) COLLATE Latin1_General_100_BIN2,
             o.name COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   16 Kullanıcı tanımlı tipler (tablo tiplerinin kolonlarıyla)
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'16_tipler', (
    SELECT SCHEMA_NAME(ty.schema_id)               AS Sema,
           ty.name                                 AS Tip,
           TYPE_NAME(ty.system_type_id)            AS TemelTip,
           ty.max_length                           AS Uzunluk,
           ty.precision                            AS Duyarlik,
           ty.scale                                AS Olcek,
           ty.collation_name                       AS Harmanlama,
           ty.is_nullable                          AS BosOlabilir,
           ty.is_table_type                        AS TabloTipi,
           ty.is_assembly_type                     AS ClrTipi,
           USER_NAME(ty.principal_id)              AS AyriSahip,
           (SELECT c.column_id AS Sira, c.name AS Kolon, TYPE_NAME(c.user_type_id) AS Tip,
                   c.max_length AS Uzunluk, c.precision AS Duyarlik, c.scale AS Olcek,
                   c.collation_name AS Harmanlama, c.is_nullable AS BosOlabilir,
                   c.is_identity AS Kimlik, c.is_computed AS Hesaplanmis
            FROM sys.table_types AS tt
            JOIN sys.columns AS c ON c.object_id = tt.type_table_object_id
            WHERE tt.user_type_id = ty.user_type_id
            ORDER BY c.column_id
            FOR JSON PATH, INCLUDE_NULL_VALUES)    AS Kolonlar
    FROM sys.types AS ty
    WHERE ty.is_user_defined = 1
    ORDER BY SCHEMA_NAME(ty.schema_id) COLLATE Latin1_General_100_BIN2,
             ty.name COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   17 Diziler (SEQUENCE; o anki değer hariç)
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'17_diziler', (
    SELECT SCHEMA_NAME(sq.schema_id)               AS Sema,
           sq.name                                 AS Ad,
           TYPE_NAME(sq.user_type_id)              AS Tip,
           CONVERT(nvarchar(40), sq.start_value)   AS Baslangic,
           CONVERT(nvarchar(40), sq.increment)     AS Artis,
           CONVERT(nvarchar(40), sq.minimum_value) AS EnKucuk,
           CONVERT(nvarchar(40), sq.maximum_value) AS EnBuyuk,
           sq.is_cycling                           AS Dongulu,
           sq.is_cached                            AS Onbellekli,
           sq.cache_size                           AS OnbellekBoyutu
    FROM sys.sequences AS sq
    WHERE sq.is_ms_shipped = 0
    ORDER BY SCHEMA_NAME(sq.schema_id) COLLATE Latin1_General_100_BIN2,
             sq.name COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   18 Eş anlamlılar (SYNONYM)
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'18_es_anlamlilar', (
    SELECT SCHEMA_NAME(sy.schema_id)               AS Sema,
           sy.name                                 AS Ad,
           sy.base_object_name                     AS Hedef
    FROM sys.synonyms AS sy
    WHERE sy.is_ms_shipped = 0
    ORDER BY SCHEMA_NAME(sy.schema_id) COLLATE Latin1_General_100_BIN2,
             sy.name COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   19 XML şema koleksiyonları (sys şemasındaki hazır koleksiyon hariç)
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'19_xml_koleksiyonlari', (
    SELECT SCHEMA_NAME(x.schema_id)                AS Sema,
           x.name                                  AS Ad,
           USER_NAME(x.principal_id)               AS AyriSahip
    FROM sys.xml_schema_collections AS x
    WHERE x.schema_id <> 4
    ORDER BY SCHEMA_NAME(x.schema_id) COLLATE Latin1_General_100_BIN2,
             x.name COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   20 Satır güvenliği politikaları
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'20_guvenlik_politikalari', (
    SELECT SCHEMA_NAME(sp.schema_id)               AS Sema,
           sp.name                                 AS Ad,
           sp.is_enabled                           AS Acik,
           sp.is_schema_bound                      AS SemayaBagli,
           sp.is_not_for_replication               AS CogaltmaDisi,
           (SELECT OBJECT_SCHEMA_NAME(pr.target_object_id) + N'.' + OBJECT_NAME(pr.target_object_id) AS Hedef,
                   pr.predicate_type_desc AS Tur,
                   pr.operation_desc      AS Islem,
                   pr.predicate_definition AS Tanim
            FROM sys.security_predicates AS pr
            WHERE pr.object_id = sp.object_id
            ORDER BY pr.security_predicate_id
            FOR JSON PATH, INCLUDE_NULL_VALUES)    AS Kosullar
    FROM sys.security_policies AS sp
    WHERE sp.is_ms_shipped = 0
    ORDER BY SCHEMA_NAME(sp.schema_id) COLLATE Latin1_General_100_BIN2,
             sp.name COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   21 Açıklamalar (bütün genişletilmiş özellikler)
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'21_aciklamalar', (
    SELECT ep.class_desc                           AS Sinif,
           n.Nesne                                 AS Nesne,
           n.AltNesne                              AS AltNesne,
           ep.name                                 AS Ozellik,
           CONVERT(nvarchar(128), SQL_VARIANT_PROPERTY(ep.value, 'BaseType')) AS DegerTipi,
           CASE WHEN ep.class = 0 AND ep.name = N'PaksanOrtam' THEN N'<ortam>'
                ELSE CONVERT(nvarchar(max), ep.value) END AS Deger
    FROM sys.extended_properties AS ep
    CROSS APPLY (
        SELECT CASE ep.class
                   WHEN 0 THEN N''
                   WHEN 1 THEN COALESCE(OBJECT_SCHEMA_NAME(ep.major_id) + N'.' + OBJECT_NAME(ep.major_id),
                                        (SELECT N'<veritabani>.' + t.name FROM sys.triggers AS t
                                         WHERE t.object_id = ep.major_id AND t.parent_class = 0))
                   WHEN 2 THEN OBJECT_SCHEMA_NAME(ep.major_id) + N'.' + OBJECT_NAME(ep.major_id)
                   WHEN 3 THEN SCHEMA_NAME(ep.major_id)
                   WHEN 4 THEN USER_NAME(ep.major_id)
                   WHEN 6 THEN (SELECT SCHEMA_NAME(t.schema_id) + N'.' + t.name FROM sys.types AS t
                                WHERE t.user_type_id = ep.major_id)
                   WHEN 7 THEN OBJECT_SCHEMA_NAME(ep.major_id) + N'.' + OBJECT_NAME(ep.major_id)
                   WHEN 10 THEN (SELECT SCHEMA_NAME(x.schema_id) + N'.' + x.name FROM sys.xml_schema_collections AS x
                                 WHERE x.xml_collection_id = ep.major_id)
                   ELSE CONVERT(nvarchar(20), ep.major_id)
               END AS Nesne,
               CASE ep.class
                   WHEN 1 THEN COL_NAME(ep.major_id, NULLIF(ep.minor_id, 0))
                   WHEN 2 THEN (SELECT pa.name FROM sys.parameters AS pa
                                WHERE pa.object_id = ep.major_id AND pa.parameter_id = ep.minor_id)
                   WHEN 7 THEN (SELECT da.Ad FROM #DizinAdi AS da
                                WHERE da.NesneKimlik = ep.major_id AND da.DizinNo = ep.minor_id)
                   ELSE CASE WHEN ep.minor_id = 0 THEN NULL ELSE CONVERT(nvarchar(20), ep.minor_id) END
               END AS AltNesne) AS n
    ORDER BY ep.class,
             n.Nesne COLLATE Latin1_General_100_BIN2,
             n.AltNesne COLLATE Latin1_General_100_BIN2,
             ep.name COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   22 İzinler (GRANT, DENY; sistem nesnelerinin public izinleri hariç)
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'22_izinler', (
    SELECT dp.class_desc                           AS Sinif,
           n.Nesne                                 AS Nesne,
           n.AltNesne                              AS AltNesne,
           USER_NAME(dp.grantee_principal_id)      AS Alan,
           dp.permission_name                      AS Izin,
           dp.state_desc                           AS Durum,
           USER_NAME(dp.grantor_principal_id)      AS Veren
    FROM sys.database_permissions AS dp
    CROSS APPLY (
        SELECT CASE dp.class
                   WHEN 0 THEN N''
                   WHEN 1 THEN OBJECT_SCHEMA_NAME(dp.major_id) + N'.' + OBJECT_NAME(dp.major_id)
                   WHEN 3 THEN SCHEMA_NAME(dp.major_id)
                   WHEN 4 THEN USER_NAME(dp.major_id)
                   WHEN 6 THEN (SELECT SCHEMA_NAME(t.schema_id) + N'.' + t.name FROM sys.types AS t
                                WHERE t.user_type_id = dp.major_id)
                   WHEN 10 THEN (SELECT SCHEMA_NAME(x.schema_id) + N'.' + x.name FROM sys.xml_schema_collections AS x
                                 WHERE x.xml_collection_id = dp.major_id)
                   WHEN 24 THEN (SELECT k.name FROM sys.symmetric_keys AS k WHERE k.symmetric_key_id = dp.major_id)
                   WHEN 25 THEN (SELECT c.name FROM sys.certificates AS c WHERE c.certificate_id = dp.major_id)
                   WHEN 26 THEN (SELECT a.name FROM sys.asymmetric_keys AS a WHERE a.asymmetric_key_id = dp.major_id)
                   ELSE CONVERT(nvarchar(20), dp.major_id)
               END AS Nesne,
               CASE WHEN dp.class = 1 THEN COL_NAME(dp.major_id, NULLIF(dp.minor_id, 0))
                    WHEN dp.minor_id = 0 THEN NULL
                    ELSE CONVERT(nvarchar(20), dp.minor_id)
               END AS AltNesne) AS n
    WHERE NOT (dp.class = 1 AND dp.major_id < 0)
    ORDER BY dp.class,
             n.Nesne COLLATE Latin1_General_100_BIN2,
             n.AltNesne COLLATE Latin1_General_100_BIN2,
             USER_NAME(dp.grantee_principal_id) COLLATE Latin1_General_100_BIN2,
             dp.permission_name COLLATE Latin1_General_100_BIN2,
             dp.state_desc COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   23 Anahtarlar ve sertifikalar (yalnız ad ve algoritma; anahtar
   değerleri ve GUID'ler her kurulumda farklıdır)
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'23_anahtarlar', (
    SELECT a.Tur, a.Ad, a.Algoritma, a.Uzunluk
    FROM (SELECT N'simetrik' AS Tur, k.name AS Ad, k.algorithm_desc AS Algoritma, k.key_length AS Uzunluk
          FROM sys.symmetric_keys AS k
          UNION ALL
          SELECT N'asimetrik', a.name, a.algorithm_desc, a.key_length
          FROM sys.asymmetric_keys AS a
          UNION ALL
          SELECT N'sertifika', c.name, NULL, NULL
          FROM sys.certificates AS c) AS a
    ORDER BY a.Tur, a.Ad COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   24 Dosya grupları (dosya adları ve boyutları hariç)
   -------------------------------------------------------------------------- */
INSERT #ParmakIzi (Bolum, Icerik)
SELECT N'24_dosya_gruplari', (
    SELECT ds.name                                 AS Ad,
           ds.type_desc                            AS Tur,
           ds.is_default                           AS Varsayilan,
           fg.is_read_only                         AS SaltOkunur
    FROM sys.data_spaces AS ds
    LEFT JOIN sys.filegroups AS fg ON fg.data_space_id = ds.data_space_id
    ORDER BY ds.name COLLATE Latin1_General_100_BIN2
    FOR JSON PATH, INCLUDE_NULL_VALUES);

/* --------------------------------------------------------------------------
   Özetler. Boş bölüm "[]" olarak özetlenir.
   -------------------------------------------------------------------------- */
UPDATE #ParmakIzi
   SET Icerik = ISNULL(Icerik, N'[]');

UPDATE #ParmakIzi
   SET Ozet = HASHBYTES('SHA2_256', Icerik);

/* Tek özet: "bölüm:ÖZET" satırları bölüm adı sırasıyla. */
DECLARE @Toplam char(64) = (
    SELECT LOWER(CONVERT(char(64),
               HASHBYTES('SHA2_256',
                   STRING_AGG(CONVERT(nvarchar(max), p.Bolum + N':' + CONVERT(nchar(64), p.Ozet, 2)), NCHAR(10))
                       WITHIN GROUP (ORDER BY p.Bolum COLLATE Latin1_General_100_BIN2)), 2))
    FROM #ParmakIzi AS p);

IF OBJECT_ID(N'tempdb..#ParmakIziAyrinti') IS NOT NULL
BEGIN
    SELECT s.Bolum, s.Ozet, JSON_QUERY(s.Icerik) AS Icerik
    FROM (SELECT p.Bolum COLLATE Latin1_General_100_BIN2 AS Bolum,
                 LOWER(CONVERT(char(64), p.Ozet, 2)) AS Ozet,
                 p.Icerik,
                 0 AS Sira
          FROM #ParmakIzi AS p
          UNION ALL
          SELECT N'TOPLAM', @Toplam, NULL, 1) AS s
    ORDER BY s.Sira, s.Bolum
    FOR JSON PATH;
END
ELSE
BEGIN
    SELECT s.Bolum, s.Ozet
    FROM (SELECT p.Bolum COLLATE Latin1_General_100_BIN2 AS Bolum,
                 LOWER(CONVERT(char(64), p.Ozet, 2)) AS Ozet,
                 0 AS Sira
          FROM #ParmakIzi AS p
          UNION ALL
          SELECT N'TOPLAM', @Toplam, 1) AS s
    ORDER BY s.Sira, s.Bolum;
END;

DROP TABLE #DizinAdi;
