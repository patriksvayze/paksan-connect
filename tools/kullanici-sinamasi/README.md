# Kullanıcı sınaması

Üç uygulamayı (PAKSAN Connect, Servisim, backoffice) gerçek kullanıcılar
gibi kullanan dört ajanla yapılan uçtan uca sınama (24 Eylül 2026,
kullanıcının isteği). Otomatik senaryolar (`tools/ekosistem-sinamasi.mjs`)
akışın doğru yürüdüğünü denetler; bu sınama akışın **yanlış
kullanıldığında** ne olduğunu ve üç uygulamanın birbirini gerçekten
görüp görmediğini arar.

## Dört kullanıcı

| Ajan (`.claude/agents/`) | Kim | Uygulama | Beceri |
|---|---|---|---|
| `kullanici-ciftci` | Mehmet Kaya, çiftçi | Connect | en düşük |
| `kullanici-servis` | Selçuk Tarım Servisi teknisyeni | Servisim | orta |
| `kullanici-paksan-servis` | Selin Aksoy, backoffice "Servis" rolü | backoffice | iyi |
| `kullanici-paksan-parca` | Burak Demirtaş, backoffice "Yedek Parça" rolü | backoffice | iyi |

Ajanlar yalnız ekrandan çalışır: şifre yazmaz, hesap açmaz, çıkış
yapmaz, tarayıcı hafızasına ve koda dokunmaz. Uygulamanın ürettiği
dosyaları (Excel, servis formu PDF'i) indirebilirler.

## Hazırlık

1. Tarayıcı verisinin yedeğini al (proje dışına, `D:\PAKSAN\_yedek\`).
2. Demo sürümü değiştiyse (`src/servis/demoKur.js` → `DEMO_SURUMU`)
   yedekten SONRA `servis.html` bir kez açılır: demo yeniden kurulur.
   Demo taleplerinde yapılmış her işlem (randevu, kargo bilgisi, not,
   hak ediş onayı) ve onlara bağlı hesap hareketleri ile bildirimler
   demoyla birlikte gider; önceki turun demo talep numaraları geçersiz
   olur. Demo işaretsiz kayıtlar (çiftçinin talepleri, servisin elle
   açtığı işler ve siparişleri, personel, ayarlar) kalır. Ardından
   `tutarlilik.js` ile yeni başlangıç ölçüsü alınır; D1-D3 sıfır olmalı.
   Demo 7. sürümden beri (29 Eylül 2026) Servisim'in sahnesini sabit
   kuruyor (`src/backoffice/demoSahne.js`): talep numaraları her kurulumda
   değişir ama işler, müşteriler ve durumlar aynı. Sahne ücret ve indirim
   ayarı da yazıyor; demo temizlenince personelin o arada değiştirmediği
   ayar eski hâline döner. Backoffice'ten "Demo verisini temizle" denirse
   Servisim bir sonraki açılışta demoyu yeniden kurar.
3. `dunya-kur.js` ile test dünyasını kur (çiftçi hesabı ve makinesi,
   iki şifresiz personel kaydı). Tarayıcıda:
   `(await import('/tools/kullanici-sinamasi/dunya-kur.js?t=' + Date.now())).default()`
4. **Oturumları kullanıcı açar**, her kullanıcı için ayrı sekmede.
   Claude şifre yazmaz.
5. Backoffice oturumu SEKMEYE AİT (25 Eylül 2026'dan beri; önce bütün
   sekmelerde ortaktı ve yenilenen sekme öteki personelin kimliğine
   geçiyordu). İki personel yan yana çalışabilir; yeni açılan sekme son
   girişi bir kez devralır. Düzeltmeden sonraki ilk turda backoffice'e
   bir kez yeniden giriş gerekebilir. Sınama sürerken koda yine
   dokunulmaz: kod değişikliği Vite üzerinden sekmeleri yeniler.
6. **Sınamadan hemen önce dört sekme bir kez yenilenir** (26 Eylül
   2026). Gün içinde kod değiştiyse açık sekmede eski ve yeni modüller
   karışık kalıyor: ikinci sınamada Connect "useApp bir AppProvider
   içinde kullanılmalı" hatası verdi, hata sınırı ekranı sıfırlayıp
   "Kaldır"ın yazdığını attı ve ajan bunu uygulama hatası sandı.
   Oturumlar yenilemede kalıyor (üçü de oturum deposunda).
7. Ajan brief'ine **araç uyarısı** yazılır: tarayıcı paneli küçükse
   telefon boyu (`resize_window: mobile`) küçültülerek çiziliyor;
   tıklamada ekran görüntüsündeki koordinat kullanılır, sayfanın
   pikselleri (getBoundingClientRect) değil. İkinci sınamada iki ajan
   "fare çalışmıyor" sandı; sorun koordinattaydı.
8. Tarayıcıdaki **Servis** rolüne ilk turda sınama için `servisDuzenle`
   eklenmişti. 25 Eylül 2026'da makineye servis atama ayrı izin oldu
   (`makineAtama`) ve eski rol bir kez taşınıyor: bu rol atama iznini
   kendiliğinden alır. `servisDuzenle` kutusu Roller ekranından ELLE
   kaldırılır (kod sessizce kaldırmaz); Servis rolünün varsayılanında
   yok.

## Demo sahnesinin kopya kâğıdı (29 Eylül 2026)

Servisim'in demo hesabı (`konya`, Selçuk Tarım Servisi) açıldığında her
iş bir hâli gösteriyor; talepte `demoSahne` alanı işin kodunu taşıyor
(D01–D30, N1A; liste `SAHNE_ISLERI`). Kayıt Aç'ı denemek için bilinen
numaralar (hepsi gerçek olmayacak biçimde, 505 000 00 xx):

| Numara | Kim | Kayıt Aç'ta ne görülür |
|---|---|---|
| 505 000 00 01 … 08 | Konya'daki sekiz müşteri (K1–K8) | makineleri bu servisin; açık işi olan makinede "Bu Makine İçin Açık Bir İşiniz Var" |
| 505 000 00 09 | Polatlı'daki müşteri (N1) | iki makinesi de Polatlı Tarım Servisi'nin: "başka servis" uyarısı; ilkinde o servisin açık işi, ikincisinde bu servisin onay bekleyen işi (D16) |
| 505 000 00 10 | Kulu'daki müşteri (N2) | makinesinin servisi ve bayisi yok: "servisi atanmamış" |
| 505 000 00 11 | kayıtlı olmayan kişi | D07'nin sahibi (seri numarası olmayan tesviye küreği) |

Yeni bir numarayla bir K müşterisinin seri numarası yazılırsa Kayıt Aç
"makine başka birinin adına kayıtlı" uyarısını gösterir.

## Yeniden sınamanın beklentileri (25 Eylül 2026 düzeltmelerinden sonra)

İlk turun bulguları düzeltildi (CLAUDE.md → "25 Eylül 2026 kullanıcı
sınamasının düzeltmeleri"). Aşağıdakiler bilerek böyle; ikinci turda
"hata" diye raporlanmamalı, tur brief'ine de yazılır:

- **Birinci turun demo talep numaraları geçersiz.** Demo 5. sürüme
  geçti (`DEMO_SURUMU`); `servis.html` bir kez açılınca demo yeniden
  kurulur, demo taleplerinde yapılmış işlemler gider. Ardından
  `tutarlilik.js` ile yeni taban alınır: D1-D3 sıfır olmalı.
- **Connect'te aynı makinede ikinci servis talebi açılmıyor.** İşi
  süren talep varken form yerine o talebi gösteren bir kart çıkar ve
  "ekleme" penceresine götürür. Onay bekleyen iş engellemez.
- **Servisim'in elle kaydettiği yeni makine "servis atanmamış"
  sayılıyor.** PAKSAN Kayıtlı Makineler'den atayana kadar çiftçi o
  makine için Connect'ten servis talebi açamaz; backoffice'te işaretli.
- **Makine başka servisteyse Servisim uyarır ama engellemez.** İş
  "atama dışı" diye işaretlenir; hak edişi onaylayan personel görür.
- **Makine Kaydet'teki "DENEME" kutusu demo işaretinin parçası.**
  Demo derlemesinde görünür (`index.html` → `data-demo="acik"`),
  canlıda görünmez.
- **Seri numarası doğrulaması sıkılaştı.** Model kodu, dört haneli yıl
  ve beş haneli sıra bekleniyor; eksik ya da fazla hane "makine
  bulundu" demez. O ve I rakama çevrilir.
- **Talepler Profil'de değil, kendi ekranında** (Taleplerim). Listeden
  kaldırılan talep oradan geri alınabilir.
- **Servis siparişinde müşteriye bildirim yok.** Backoffice'in
  pencereleri bunu "müşterinin uygulamadaki hesabına bağlı olmadığı
  için" diye söyler (metin taslak, Codex bekliyor).
- **Saati girilmeyen randevu gün olarak görünür**, "03:00" değil.
- **Hak ediş reddi kesin.** Ret penceresi düzeltilebilir sorun için
  "Düzelt"e yönlendirir; servis reddedilen işe kayıt gönderemez.
- **Yedek Parça rolü makineye servis atayamaz**; Kayıtlı Makineler
  bunun nedenini yazar.
- **Ekran metinlerinin bir kısmı TASLAK** (`CODEX-BEKLEYEN.md`): dil
  kusuru bulgu sayılabilir ama "metin yok" sayılmaz.

## Üçüncü sınamanın beklentileri (26 Eylül 2026 düzeltmelerinden sonra)

İkinci turun bulguları düzeltildi (CLAUDE.md → "26 Eylül 2026 ikinci
kullanıcı sınamasının düzeltmeleri"). Yukarıdakilere ek olarak:

- **Yeniden açılan işte kayıt formu boş açılır** (geçen ziyaretin km'si,
  süresi, yapılan işi gelmez); "talep nedeni" müşterinin son "Sorun Devam"
  cümlesidir. Randevu düğmesi vardır, iş "Yeni"dedir.
- **Servisi atanmamış makine seçilince servis talebi formu açılmaz**,
  yerinde kart çıkar.
- **Kapanmış müşteri parça talebine kargo bilgisi sonradan girilir**
  ("Kargo Bilgisini Gir/Düzelt"); talep kapalı kalır, çiftçiye bildirim
  gider.
- **Servisim ekran değişince 0,35 saniye dokunuş yutar** (çift dokunuş
  kilidi). Ajan yeni açılan ekranda hemen basarsa ilk basış kaybolabilir;
  bu bilerek böyle.
- Backoffice'te talep numarasının tamamı aranınca durum süzgeci aşılır.

## Turlar

Ajanlar sırayla çalışır, gerçek bir iş günü gibi:

1. Çiftçi: uygulamayı gezer, servis talebi, parça talebi, fiyat
   teklifi açar, ikinci makinesini kaydeder.
2. Servis: işi alır, randevu verir, garanti kaydında parça ister, elle
   kayıt açar, parça siparişi verir.
3. PAKSAN servis: talepleri inceler, not yazar, atama dener.
4. PAKSAN yedek parça: dekontu onaylar, parçaları gönderir, servis
   siparişini eksik gönderir, kalanı gönderir ya da iptal eder.
5. Servis: parçayı takar, kaydı onaya gönderir.
6. PAKSAN servis: hak edişi düzeltir ya da onaylar.
7. Çiftçi: sonuçları, bildirimleri görür; gerekirse "sorun devam
   ediyor" der.

Her turdan sonra orkestratör `tutarlilik.js`'i çalıştırır (hiçbir şey
yazmaz): talep durumları, sipariş hesabı, cari hareketler, bildirimlerin
alıcısı, makine defteri ve demo verisinin makineye uyması (D1-D3).
Tarayıcıda:
`(await import('/tools/kullanici-sinamasi/tutarlilik.js?t=' + Date.now())).default()`

Ajanın raporu ile ölçülen durum karşılaştırılır; tutmayan her şey ve
ajanların bildirdiği beklenmedik davranışlar sonunda tek raporda
toplanır. Raporlar `raporlar/` klasöründe tarihle saklanır; bir sonraki
sınama bir öncekiyle karşılaştırılır.
