# Marka Devri — Yeni Firmaya Kurulum

Bu paket bir firmaya özel yazılmadı. Seri numaralı makine, garanti,
servis, yedek parça, bayi ağı ve duyuru üzerine kurulu genel bir
altyapı; bugün PAKSAN Makina için doldurulmuş hâlde duruyor.

Başka bir makine üreticisi bunu kendi bilgileriyle kullanabilir.
Değiştirilecek her şey **tek klasörde**: `src/marka/`. Motorun geri
kalanına — talep akışı, roller, yetkiler, duyuru türleri, seri numarası
çözümleme — dokunulmuyor.

Bu belge, o klasörün nasıl doldurulacağını sırasıyla anlatıyor.

---

## Önce şunu bilin

**Üç ayrı ürün var, üçü de aynı marka klasöründen besleniyor:**

| Ürün | Kimin için | Nasıl derleniyor |
|---|---|---|
| Müşteri uygulaması | Çiftçi, telefonunda | `npm run build` → `dist/` |
| Backoffice | Firma personeli, tarayıcıda | `npm run build:backoffice` |
| Bayi paneli | Bayi, tarayıcıda ve telefonda | `npm run build:bayi` |

**Müşteri uygulaması iki dilli (Türkçe + İngilizce), diğer ikisi
yalnızca Türkçe.** Backoffice ve bayi panelini firma personeli ile
Türkiye'deki bayiler kullanıyor.

**Ülkeye ait olan şeyler marka değil, yerinde kalıyor.** İl listesi,
KVKK, T.C. kimlik doğrulaması, `+90` telefon biçimi, 6563 sayılı ticari
ileti kuralı ve TL, `src/data/` içinde duruyor. Bu paket Türkiye için
kurulu; başka bir ülkeye taşımak ayrı bir iş.

---

## Adım 1 — Kimlik

**Dosya:** `src/marka/kimlik.js`

Firmanın adı, unvanı, iletişim bilgileri, garanti süresi, banka hesapları ve
ihracat bilgileri burada. Değerleri değiştirmek yeterli; alan adlarına
dokunmayın.

Dikkat edilecek üç alan:

- **`kisaAd`** — ekranlarda görünen kısa ad ("PAKSAN"). Uzun unvan
  cümleye sığmıyor.
- **`UYGULAMA`** — uygulamanın adı ("PAKSAN Connect"). Şirket adından
  ayrı; telefonun ekranında ikonun altında yazan ad da bu.
- **`unvan`** — KVKK metninde veri sorumlusu olarak geçen resmî unvan.

### Türkçe ekler kendiliğinden geliyor

Ekranlarda firma adı çekimli geçiyor: "PAKSAN'a Sipariş Ver",
"PAKSAN'dan Destek İste". Bu ekler **hesaplanıyor**, sabit yazılı
değil — Türkçede ek, adın son ünlüsüne ve son harfine göre değişiyor:

```
PAKSAN'a  ·  ACME'ye  ·  SANTEK'e
PAKSAN'dan ·  ACME'den ·  SANTEK'ten
```

`kisaAd` alanını değiştirmeniz yeterli; ekranlardaki ekler kendiliğinden
düzeliyor (bkz. `src/marka/ad.js`).

**Tek istisna:** Kısaltma gibi harf harf okunan adlarda (TSE, KOSGEB)
ek, okunuşa göre gelir ve bu kural harften çıkarılamaz. Böyle bir adınız
varsa `kisaAd` yerine okunuşuna uyan bir yazım seçin.

---

## Adım 2 — Logo ve renkler

**Logo:** `src/marka/varliklar/` klasörüne kendi dosyalarınızı koyun,
`src/marka/logo.jsx` içindeki yolları güncelleyin.

Bileşenlerin dışa verdiği adlar (`Logo`, `Rozet`, `RozetMini`,
`Amblem`) ve aldıkları özellikler değişmemeli — ekranlar onlara göre
yazıldı.

**Renkler:** `src/marka/renkler.css`. İki ham renk var: kurumsal renk
ve koyu zemin rengi. Üç ürün de kendi tonlarını bunlardan türetiyor;
ham değerler başka hiçbir yerde yazılı değil.

Renkleri değiştirdikten sonra **karanlık temayı da açıp bakın.** Karanlık
temada marka rengi değişmiyor ama üstüne binen yazı tonları
değişiyor; koyu bir kurumsal renkte beyaz yazı okunmayabiliyor.

---

## Adım 3 — Ürün kataloğu

**Dosyalar:** `src/marka/katalog/products.js` ve `products.en.js`

Her ürün kaydında en az şunlar olmalı: kimlik (`id`), ad, kategori ve
seri numarası öneki. Seri numarası öneki, makinenin kaydedilmesini
sağlıyor — müşteri, makinesini bu numarayla tanıtıyor.

`products.en.js` aynı kimliklerin İngilizce karşılığı. **Kimlikler iki
dosyada birebir aynı olmalı**, yoksa uygulama İngilizceye geçtiğinde o
ürün adsız görünür.

**Görseller:** `src/marka/varliklar/urunler/` altına koyup
`src/marka/katalog/gorseller.js` içinde eşleştirin.

**Vitrin:** Ana ekranda öne çıkan beş model `products.js` içindeki
`VITRIN` listesinde. Sıra bilerek sabit; hangi modeli öne çıkardığınız
ticari kararınız. Liste boş bırakılırsa ana ekranda vitrin bölümü
çıkmıyor.

---

## Adım 4 — Bayi listesi

**Dosya:** `src/marka/katalog/bayiler.js`

Her bayi için ad, il, ilçe, telefon, konum (enlem/boylam) ve yetki
alanı bulunmalı. Konum, "size en yakın bayi" sıralamasını besliyor; yanlış konum
müşteriyi yanlış bayiye yönlendirir.

Bayi listesi **zorunlu**: Talepler bayilere dağıtılıyor, bayi paneli
girişleri bu listeden geliyor.

---

## Adım 5 — Derleme kimliği

Bunlar kod değil, derleme öncesinde doldurulan alanlar. Marka klasörünün
dışında oldukları için tek tek elden geçirilmeleri gerekiyor:

| Dosya | Ne var |
|---|---|
| `capacitor.config.json` | `appId`, `appName` |
| `package.json` | `name` |
| `index.html` | sekme başlığı |
| `backoffice.html` | sekme başlığı |
| `bayi-panel.html` | sekme başlığı |
| `bayi-mobil.html` | sekme başlığı |
| `android/app/src/main/res/values/strings.xml` | uygulama adı, paket adı |

**`appId` mağazaya bir kez yüklendikten sonra değiştirilemiyor.**
Yayına çıkmadan önce doğru olduğundan emin olun; `kimlik.js` içindeki
indirme adresi de bu kimlikten türetiliyor.

---

## Adım 6 — Kurulum ayarları

**Dosya:** `src/config.js`

Sunucu adresleri ve açma/kapama anahtarları. Bunlar marka değil,
kurulum ayarlarıdır: Aynı firma için test ve canlı ortamlarda farklı
olabilirler.

**API anahtarları buraya yazılmaz.** Uygulama telefona kuruluyor;
içine gömülen anahtar okunabilir. Anahtarlar sunucu tarafında kalır.

---

## Olmadan da çalışır, eksik görünür

Aşağıdakiler doldurulmazsa uygulama çalışmaya devam ediyor; yalnızca
ilgili ekran boş kalıyor. Bunlar, hazırlanması uzun süren içeriklerdir —
uygulamayı ayağa kaldırmak için beklemeniz gerekmiyor.

| Doldurulmazsa | Ne olur |
|---|---|
| `icerik/mobile_support_package.json` + `icerik/kilavuzEslesme.js` | Kılavuzlar ekranı boş |
| `icerik/teknikOzellikler.js` | Ürün sayfasında teknik değer çıkmıyor |
| `icerik/rehber.js` / `.en.js` | Bakım rehberi yok |
| `icerik/guvenlik.js` / `.en.js` | Güvenlik kuralları yok |
| `katalog/parcaFiyat.js` | Parça fiyatı yerine "danışın" yazıyor |
| `katalog/makineFiyat.js` | Bayi panelinde makine fiyatı görünmüyor |
| Ürün kaydındaki `videos` | Makine detayında video bölümü çıkmıyor |
| Ürün kaydındaki `bakim` | Bakım takvimi boş |

Video dosyaları `src/marka/varliklar/videolar/` altına konup ürün
kaydındaki `videos` listesine bağlanıyor.

Bu üç liste alanı (`specs`, `videos`, `bakim`) yazılmazsa katalog, onları
boş dizi sayıyor; ekranlar çökmüyor, ilgili bölüm çıkmıyor.

Fiyat listeleri için ayrıca birer anahtar var
(`PARCA_FIYAT_AKTIF`, `MAKINE_FIYAT_AKTIF`); fiyatı hiç göstermek
istemiyorsanız listeyi doldurmak yerine bunları `false` yapın.

---

## Hukuk danışmanınızdan alınacak

Bu üç metin taslak hâlde duruyor ve **avukatınız okumadan yayına
çıkmamalı**:

- `src/data/kvkk.js` — KVKK aydınlatma metni ve açık rıza metni
- `src/data/kvkk.en.js` — bunların İngilizcesi (GDPR metni **değil**;
  Avrupa'daki müşteriler için ayrı bir metin gerekiyor)
- Garanti şartları

Metinlerdeki firma adı ve unvan `kimlik.js` içinden geliyor; elle
değiştirmeniz gereken bir yer yok. Değişen metinlerde `KVKK_SURUM`
numarasını artırın — kullanıcıların onayı sürümle birlikte saklanıyor.

---

## Kurulumu doğrulama

```bash
npm run dogrula
```

Altı kontrol var; hepsinin temiz çıkması gerekiyor.

1. **Sözlük eşitliği** — `tr.js` ve `en.js` aynı anahtarları içeriyor mu?
2. **Kullanılan anahtar** — koddaki her `t('...')` sözlükte var mı?
3. **CSS token'ları** — iki CSS kökü aynı renkleri veriyor mu?
4. **Derleme ayrımı** — müşteri APK'sına personel ya da bayi kodu
   sızmış mı?
5. **Marka sınırı** — motor, marka klasörüne yalnızca kapıdan (`index.js`)
   bakıyor mu?
6. **Marka adı sızıntısı** — motor kodunda eski firmanın adı kalmış mı?

Ardından üç derlemeyi de çalıştırın:

```bash
npm run build && npm run build:backoffice && npm run build:bayi
```

### Sahte firma denemesi

Kurulum bittikten sonra asıl sınav şu: `kimlik.js` içindeki adı
tanımadığınız bir adla değiştirip üç ürünü de açın. Ekranlarda eski
firmanın adı hiç geçmiyorsa ve uygulama sizin ürün listenizle
çalışıyorsa ayrım tutmuş demektir.

Türkçe ekleri de bu sırada kontrol edin: Ünlüyle biten bir ad
("ACME") ile sert ünsüzle biten bir ad ("SANTEK") farklı ek alıyor ve
ikisi de doğru çıkmalı.

---

## Sınırın nasıl korunduğu

Bu ayrım belgeyle değil, `npm run dogrula` ile korunuyor. Beşinci ve
altıncı kontroller, yeni yazılan kodun sınırı delmesini engelliyor:

- Motor dosyaları `from '../marka'` yazıyor, asla
  `from '../marka/kimlik'` değil. Böylece marka klasörünün iç düzenini
  istediğiniz gibi değiştirebiliyorsunuz — dışarıya aynı adları
  verdiğiniz sürece uygulama çalışıyor.
- Motor kodunda firma adı düz yazıyla geçemiyor.

**Tek istisna `src/marka/icerik/`.** Arıza bilgi tabanı, teknik
özellikler ve kılavuz paketi ağır dosyalar — kılavuz paketi tek başına
1,7 MB. Kapıdan verilselerdi `../marka` yazan her dosya onları da
paketine çekerdi; bayi paneli, arıza bilgi tabanını hiç kullanmadığı
hâlde taşırdı. İçerik bu yüzden yalnızca çizildiği ekrandan doğrudan
içe aktarılıyor.

---

## Dokunulmayacak yer

Kodda küçük harfli `paksan` geçen satırlar var: Talebin kimde olduğunu
tutan `sahip` alanının değeri, `paksan.` depolama öneki, `paksan-ekler`
veri tabanı adı, `paksan-duyuru` bildirim kanalı.

**Bunlar iç anahtarlar, kullanıcıya hiç görünmüyorlar.** Değiştirilirlerse
kurulu cihazlardaki kayıtlar okunamaz hâle gelir. Yeni firmada da
anlamsız değiller: "üretici tarafı" demek.

Kod yorumlarında geçen firma adı da yerinde kalıyor. Oralarda işin
kuralını anlatan gerekçeler var ("bayi PAKSAN'dan satın aldığı kadar
stok tutar"); silmek bilgi kaybı olur, okuyup kendi karşılığınızı
görebilirsiniz.
