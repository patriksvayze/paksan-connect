# PAKSAN — klasörde ne var?

Bu dosya tek bir iş yapar: **klasöre girdiğinizde neyin ne olduğunu
söyler.** Kod okumanız gerekmez.

PAKSAN Makina için yazılmış üç ayrı uygulama ve onların arkasındaki
veriler burada. Üçü aynı kaynaktan derleniyor ama ayrı ayrı çalışıyor:

| Uygulama | Kimin | Ne yapar |
|---|---|---|
| **PAKSAN Connect** | müşteri | Makinesini kaydeder, servis ve yedek parça ister, kılavuzları okur, destek asistanına sorar. İki dilli (Türkçe + İngilizce). |
| **Backoffice** | PAKSAN personeli | Talepleri, makineleri, servisleri, bayileri, hak edişleri ve raporları yönetir. Tarayıcıda açılır, tek dilli. |
| **PAKSAN Servisim** | servis elemanı | Sahada iş alır, servis kaydı açar, parça sipariş eder, hak edişini görür. Tek dilli. |

Bayinin uygulaması **yoktur**; sistemde kaydı vardır, işlerini PAKSAN
personeli backoffice'ten yürütür.

---

## Klasörler

| Klasör | İçinde ne var |
|---|---|
| `src/` | **Bütün uygulama kodu.** Üç uygulama da buradan derleniyor. Alt klasörleri aşağıda. |
| `veritabani/` | SQL Server veritabanının tasarımı ve kurulum betikleri. Henüz kalıcı olarak kurulmadı; ekosistem tamamlanınca kurulacak. `uygulama-eslesmesi.mjs`: uygulamaların yazdığı her alanın veritabanında nereye düştüğü. |
| `tools/` | Otomasyon betikleri: doğrulama (`dogrula.mjs`), **ekosistem sınaması** (`ekosistem-sinamasi.mjs` üç uygulamanın paylaştığı veri katmanını 18 akış senaryosuyla, `ekosistem-turu.mjs` gezilebilir 49 ekranın tamamını tarayıcıda koşturur; envanter `ekosistem/ekranlar.mjs`), **eşleme denetimi** (`veritabani-eslesme-denetimi.mjs`: uygulama veritabanında karşılığı olmayan bir alan yazarsa doğrulamayı düşürür), **fiyat listesi sınaması** (`fiyat-listesi-okuma-sinamasi.mjs`: backoffice'e yüklenen PDF'i okuyan kodun doğru okuduğunu ve yayına alma adımını denetler), ekran görüntüsü, ikon üretimi, veritabanı araçları (`vt.mjs`; yedek `vt yedekle`). Uygulamanın içine girmez. |
| `sunucu-taklidi/` | Sunucu gelene kadar sunucunun yerini tutan dosyalar — bugün yalnız **yedek parça kataloğu** (538 parça, görselleriyle) ve yeni fiyat listesini yayına alan adım (`fiyat-listesi-yayini.mjs`; backoffice'ten yüklenen liste buraya geliyor, eskisi `parca-katalogu-arsiv/`'e gidiyor). Geliştirme sunucusu bunları ağdan yayınlıyor. Ayrıntı: `sunucu-taklidi/BENIOKU.md`. |
| `android/` | PAKSAN Connect'in Android projesi. Capacitor üretiyor. |
| `android-servis/` | PAKSAN Servisim'in Android projesi. |
| `apk/` · `apk-servis/` | Derlenmiş APK dosyaları. Her sürüm ayrı dosyada durur, üstüne yazılmaz. |
| `sunum/` | Tanıtım sunumunun kaynağı (görseller, metinler). |
| `denetim/` | Yapılmış incelemelerin raporları (güvenlik, canlıya hazırlık). Git'e girmez. |
| `dist/` · `dist-backoffice/` · `dist-servis/` | Derleme çıktıları. Elle düzenlenmez, her derlemede yeniden yazılır. |
| `paksan-support-dataset/` | Destek asistanının kılavuz veri seti. Kendi git deposu olan ayrı bir proje. |

Destek asistanının sunucusu bu klasörde **değil**: `D:\PAKSAN\paksan-rag`.

### `src/` içinde

| Klasör | İçinde ne var |
|---|---|
| `src/screens/` | PAKSAN Connect'in ekranları (müşteri uygulaması). |
| `src/backoffice/` | Personel panelinin tamamı; ekranlar `ekranlar/` altında. |
| `src/servis/` | PAKSAN Servisim'in tamamı; ekranlar `ekranlar/` altında. |
| `src/components/` | Üç uygulamanın da kullandığı ortak parçalar. |
| `src/marka/` | **Firmaya ait her şey:** logo, renkler, ürün kataloğu, bayi ve servis listeleri, fiyatlar, kılavuz paketi. Başka bir firmaya kurulum bu klasörün değişmesiyle olur. |
| `src/data/` | Ülkeye ait içerik: il listesi, KVKK metinleri, talep alanları, belirtiler, yetki kataloğu. |
| `src/lib/` | Yardımcı modüller: depolama, bildirim, PDF/Excel çıkarma, servis atama. |
| `src/i18n/` | Türkçe ve İngilizce sözlükler (yalnız Connect iki dilli). |

---

## Belgeler

Her belgenin tek bir sorusu var.

### Güncel

| Belge | Cevapladığı soru |
|---|---|
| `CLAUDE.md` | Bu projede nasıl çalışılır? Kurallar, iş bölümü, değişiklik sonrası kontroller. **Çalışma kurallarının tek kaynağı budur.** |
| `CANLIYA-CIKIS.md` | Proje bittiğinde gerçek müşterilere nasıl açılacak? Ne satın alınacak, kim ne yapacak, sırayla ne olacak. |
| `PRODA-CIKIS.md` | Müşteriye açılmadan önce neler eksik? Maddelenmiş yapılacaklar listesi. (`CANLIYA-CIKIS.md` "nasıl", bu belge "neler eksik" diyor.) |
| `GELISTIRICI-BAGIMLILIGI.md` | Canlıya çıkıldığında hangi işler için geliştirici çağırmak gerekecek? Rol rol döküm ve bağımlılığı kaldırma sırası. |
| `KOD-SISTEMI.md` | Ekosistemdeki numaralar (talep, sipariş, makine, hak ediş) nasıl üretiliyor, hedeflenen düzen ne? |
| `MARKA-DEVIR.md` | Bu ürün başka bir firmaya nasıl kurulur? |
| `CODEX-BEKLEYEN.md` | Codex'in sınırı dolduğunda yazılan Türkçe metinler nasıl işaretlenip biriktirilir, sınır yenilenince nasıl topluca verilir? Kuyruk şu an boş. |
| `VT-TASARIM-EKLERI.md` | Uygulamaya sonradan giren akışların veritabanında karşılığı ne olmalı? Tasarıma işlenmeyi bekliyor. |
| `PLAN-COKLU-MARKA.md` | Globale ve Gallignani markaları eklenirse ne değişir? Marka verileri gelmeden uygulanmayacak. |
| `DESTEK-EKRANI-PLANI.md` | Connect'in Destek ekranı nasıl yeniden kurulacak? **Askıda** — kılavuz verisi tamamlanmadan uygulanmayacak, gerekçesi belgenin başında. |
| `veritabani/tasarim.md` | Veritabanının tamamı: tablolar, kurallar, gerekçeler. Veritabanı konusunda **asıl kaynak budur.** |

### Geçerliliğini yitirmiş — okunabilir, uygulanmaz

| Belge | Neden duruyor |
|---|---|
| `BAYI-YOL-HARITASI.md` | Bayi ile servisi aynı taraf sayıyordu; 9 Eylül 2026'da geçersiz ilan edildi. Belgenin başında gerekçesi yazılı. |
| `NOTLAR.md` | Projenin ilk aşamasının çalışma notları (Ağustos 2026). Tarihsel kayıt. |
| `SUNUCU-VE-VERITABANI.md` | Sunucu konusunu ilk anlatan belge (4 Eylül). Yerini `CANLIYA-CIKIS.md` ve `veritabani/tasarim.md` aldı. |

### Otomatik üretilen

| Belge | Ne |
|---|---|
| `AGENTS.md` | Codex'in aradığı dosya; içeriği `CLAUDE.md`'ye yönlendirir. |
| `PRODUCT.md` | Bir eklentinin tuttuğu ürün künyesi. Elle düzenlenmez. |

---

## Sık kullanılan komutlar

```bash
npm run dev              geliştirme sunucusu (üç uygulama da açılır)
npm run dogrula          değişiklik sonrası 13 kontrol (ekosistem sınaması dahil)
npm run build            PAKSAN Connect derlemesi
npm run build:backoffice backoffice derlemesi
npm run build:servis     PAKSAN Servisim derlemesi
npm run apk              müşteri APK'sı
npm run apk:servis       servis APK'sı
```
