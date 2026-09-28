# Kullanıcı sınaması — 26 Eylül 2026 (ikinci sınama)

## 1) Kısa özet

24 Eylül'deki ilk sınamada bulunan sorunlar 25 Eylül'de düzeltildi; 26 Eylül'de yeniden denendi.  
Aynı dört kişiyle toplam sekiz tur yapıldı.  
İlk sınamadaki düzeltmelerin işe yaradığı görüldü.  
Yeni sorunların en önemlisi, eski servis ziyaretinin bilgilerinin yeni ziyarete taşınmasıydı.  
Rapora göre bulunan sorunlar aynı gün düzeltildi; iki konu sizin kararınızı bekliyor.  
Para hesapları tuttu ve son otomatik kontrollerin tamamı geçti.

Sınamaya çiftçi Mehmet Kaya, PAKSAN Connect ile 2 tur katıldı. Selçuk Tarım Servisi teknisyeni, PAKSAN Servisim ile 3 tur katıldı. Personel panelinde Selin Aksoy, Servis yetkisiyle 2 tur; Burak Demirtaş, Yedek Parça yetkisiyle 1 tur katıldı. Uygulamalara girişleri kullanıcı yaptı.

Her turun sonunda kayıtların birbirini tutup tutmadığı kontrol edildi. Sonuçlar, sınamayı yapan yapay zekânın ekranda gördükleriyle karşılaştırıldı. Aşağıda “doğrulandı” denilen bulgular için kayıtlar veya uygulamanın nasıl çalıştığı da incelendi. Yalnızca ekranda görülenler ayrıca belirtildi.

## 2) İlk sınamanın sorunları: düzeldi mi

Aşağıdaki sorunların tamamının düzeldiği görüldü.

| Önce ne oluyordu, neden önemliydi? | Bu sınamada ne görüldü? |
|---|---|
| Fiyat teklifine makine bilgisi yazılıyordu. Teklif yanlış bilgi taşıyordu. | TKF2609265859 makine bilgisi olmadan kaydedildi. |
| Seri numarası yeterince kontrol edilmiyordu. Hatalı numara kabul edilebiliyordu. | Connect ve Servisim eksik haneli numarayı reddetti. O harfi 0 rakamına çevrildi. |
| Servisin elle açtığı işler müşteri kartında görünmüyordu. Müşterinin işleri eksik görünüyordu. | SRV2609262281, Mehmet Kaya'nın kartında yer aldı. |
| Servisin siparişinden müşteriye bildirim çıkıyordu. Bildirim yanlış kişiye yönelikti. | Sekiz turda alıcısı olmayan bildirim sayısı artmadı. Eski 2 kayıt duruyor. |
| Servis, kendisine atanmamış makineye elle iş açabiliyordu. Bu durum yeterince belirtilmiyordu. | Uyarı ve işaret eklendi. Onay penceresinde SRV2609262281 için “başka servis”, SRV2609269186 için “servissiz” görüldü. |
| İşlem tamamlandığında gösterilen tutar KDV hariçti. Ödenecek tutar karışabiliyordu. | İşlemin tamamlandığını gösteren ekran ve kart aynı tutarı gösterdi: 76 TL. |
| Kargo gönderilince iş “Yedek Parça” listesinden düşüyordu. Takip bilgisi düzeltilemiyordu. | SRV2609243039 listede kaldı. Takip numarası düzeltildi. |
| Aynı makine için ikinci talep açılabiliyordu. Aynı iş tekrarlanabiliyordu. | Connect mevcut açık talebin kartını gösterdi. Talep eklenirken tek kayıt oluştu. |
| Personel panelindeki açık hesaplar birbirine karışıyordu. Kimin işlem yaptığı belirsizleşiyordu. | Dört sekme yenilendi. Herkes kendi kimliğiyle kaldı. |
| İptal işleminin neden yapılamadığı açıklanmıyordu. Kullanıcı ne olduğunu anlayamıyordu. | İşlemi engelleyen neden yazıyor. |
| Listeden kaldırılan talep geri gelmiyordu. Listeyi düzenleme işlemi kalıcı değildi. | 7. turda hem kaldırma hem geri alma kalıcı oldu. |
| Saati belirtilmeyen randevu 03:00 olarak görünüyordu. Yanlış saat izlenimi veriyordu. | Saat belirtilmediği kaydedildi. Randevu yalnızca gün olarak gösterildi. |
| Yetkisi olmayan personelin servis atamasıyla ilgili sorun vardı. Yetki sınırı açık değildi. | Yedek Parça yetkisiyle “Servis atama yetkiniz yok…” açıklaması görüldü. |

Boş görüş gönderme, bakiyeden ödeme seçeneğinin neden kullanılamadığı, sayaçlar, telefon numarasının yazılışı, servis atama bildirimi ve iptal edilen kalemin adediyle ilgili sorunlar da düzeldi. Bunlar boş veya yanlış bilgiye, eksik açıklamaya yol açıyordu. Hem ekran gözlemleri hem kayıtlar kontrol edildi.

## 3) Bu sınamada bulunan yeni sorunlar ve yapılanlar

### Yüksek önem

**Eski ziyaretin bilgileri yeni servis ziyaretine taşınıyordu.**

Müşteri “Sorun Devam Ediyor” dediğinde talep yeniden açılıyordu. Ancak Servisim, yeni ziyaretin formunu önceki servis kaydından dolduruyordu. Parça istenirken ekranda sorulmayan yapılan iş, yol ve süre bilgileri de eski hâliyle kaydediliyordu. PAKSAN bu bilgileri yeni ziyaretin bilgileri gibi görüyordu.

“Parçayı Taktım” işlemi 20 km / 1 saat / 330 TL ile dolu açıldı. Üçüncü ziyaret ise 35 km / 2 saat ile dolu açıldı. Bu durum SRV2609243039 üzerinde 2., 5. ve 8. turlarda doğrulandı. Fark edilmezse servisin hak edişi eski rakamlarla hesaplanabilirdi. Aynı nedenle “Randevu” düğmesi görünmüyor, yeniden açılan iş “Yeni” sekmesine gelmiyordu.

Yeni ziyaretin bilgileri ile önceki ziyaretin bilgileri ayrıldı. Talep nedeninin doğru alınması da düzenlendi. Parça isteği artık kullanıcıya sorulmayan bilgileri kaydetmiyor. Bu düzeltme, 34 ayrı sonuç kontrolüyle otomatik sınamaya eklendi.

### Orta önem

**Servis atanmamış makine için form boşuna dolduruluyordu.** Connect'te servis atanmamış makine seçilince form açık kalıyordu. Yalnızca seçim kutusunun altında bir açıklama vardı. Çiftçi bütün bilgileri dolduruyor, “Gönder” düğmesine basınca işlemi reddediliyordu. Oysa açık talebi olan makinede formun yerine bilgi kartı çıkıyordu. Sorun 1. turda Hammer için doğrulandı. Artık servis atanmamış makinede de formun yerine durumu açıklayan kart gösteriliyor. Ekrandaki bu davranış otomatik sınamaya eklendi.

**Kapanan müşteri parça talebine kargo takip numarası eklenemiyordu.** Personel panelindeki “Talepler” ekranında, talep kapandıktan sonra numara eklenemiyor veya düzeltilemiyordu. Personel numarayı unutursa çiftçi kargosunu takip edemiyordu. YPR2609268517 üzerinde “Aras Kargo” yazarken takip numarasının boş olduğu doğrulandı. Servisin garanti parçası için zaten “Kargo Bilgisini Düzelt” seçeneği vardı. Müşteri parça taleplerine de “Kargo Bilgisini Gir” ve “Kargo Bilgisini Düzelt” işlemleri eklendi. Düzeltme, 18 ayrı sonuç kontrolüyle otomatik sınamaya eklendi.

**Servis atandığı hâlde açık pencere eski bilgiyi gösteriyordu.** Personel panelinde “Kayıtlı Makineler” ekranında “Servis Atanmamış” seçiliyken atama yapıldığında pencerede “Bakan servis —” yazısı kalıyordu. Personel, atamanın kaydedilmediğini sanabiliyordu. HMR202504417 üzerinde doğrulandı. Pencere artık yalnızca seçime uyan makinelerden değil, tüm makine kayıtlarından güncel bilgiyi alıyor. Bu, uygulamada tek satırlık bir düzeltmeydi; raporda buna özel bir otomatik sınama belirtilmedi.

**Çift dokununca başka işin kartı açılabiliyordu.** Servisim'de “Kaydı Gönder” düğmesine iki kez dokunulduğunda liste hemen açılıyordu. İkinci dokunuş, aynı yere gelen başka işin kartını açıyordu. Kullanıcı istemediği işe geçebiliyordu. Bu durum yalnızca ekranda görüldü; kayıt ise tek kez oluştu. Ekran değiştikten sonraki 350 milisaniye boyunca dokunuşların işleme alınmaması sağlandı. Bu davranış otomatik ekran sınamasına eklendi.

### Düşük önem

- **Teklifte verilen cevaplar görünmüyordu.** Connect'te fiyat teklifinin ayrıntısında ürün türü, arazi ve traktör gücü yer almıyordu. Personel paneli bu cevapları gösteriyordu. Çiftçi kendi verdiği bilgileri göremiyordu. Cevaplar teklif ayrıntısına eklendi.
- **Talebi kimin açtığı belli değildi.** Servisin telefonla açıp çiftçinin hesabına bağladığı SRV2609262281, Connect'te “Talebiniz” diye görünüyordu. Servisin açtığı anlaşılmıyordu. “Talebi açan” bilgisi eklendi.
- **Parçanın yola çıktığı anlaşılmıyordu.** Connect'te talep geçmişinde “parça bekleniyor” iki kez yazıyordu. İkinci kayıt aslında parçanın yola çıktığını anlatıyordu. Personel paneli bu iki durumu ayırıyordu. Connect'teki ikinci kayıt “Parça yola çıktı” olarak düzeltildi. Bu ayrım otomatik sınamaya eklendi.
- **Eski bildirimin tarihi yanlış anlaşılıyordu.** “Sorun Devam Ediyor” kartında açıklaması boş olan eski bildirim yalnızca tarihiyle görünüyordu. Çiftçi bunu kartın tarihi sandı. Kartın gösterimi düzeltildi.
- **Düzeltilen seri numarasının uyarısı kalıyordu.** Servisim'de elle kayıt açarken seri numarası düzeltildiğinde “Seri numarası tanınmadı” yazısı silinmiyordu. Diğer kutularda uyarı siliniyordu. Kullanıcı numaranın hâlâ yanlış olduğunu sanabiliyordu. Seri numarası uyarısının da silinmesi sağlandı.
- **Eski siparişlerde toplamın KDV içerdiği yazmıyordu.** Servisim'de indirim ayrıntısı bulunmayan eski siparişlerin toplam kartında “KDV dâhil” açıklaması yoktu. Sipariş satırları KDV hariçti. Tutarları karşılaştırmak zorlaşıyordu. Toplama “(KDV dâhil)” açıklaması eklendi.
- **Kurulum kaydında neden alanı boş geliyordu.** Connect kurulum talebinde açıklama istemiyordu. Bu yüzden Servisim'de “Servis Talebi Nedeni” boş kalıyor, servis bu alanı doldurmadan kayıt gönderemiyordu. Talep nedeninin alınışı, kurulum talebini de karşılayacak şekilde düzeltildi.
- **İptal açıklamasının kime gösterileceği yanlış yazıyordu.** Personel panelinde servis siparişini iptal ederken “Bu yazı müşterinin uygulamasında aynen görünüyor” deniyordu. Oysa bu siparişin müşterisi yoktu. Personel açıklamayı kimin okuyacağını yanlış anlayabilirdi. Açıklamanın kime gösterildiğini anlatan yazı düzeltildi.
- **İptal edilen talep kapanmış gibi anlatılıyordu.** İşlem yapılamadığını bildiren uyarıda “Bu talep kapandı” yazıyordu. Talebin gerçek durumu karışıyordu. İptal durumuna uygun açıklama getirildi. Bu davranış otomatik sınamaya eklendi.
- **Kapanmış talep numarayla bulunamıyordu.** Personel panelinde başlangıçta “Açık olanlar” seçiliydi. Kapanmış talep numarayla aranınca “Talep yok” çıkıyordu. Personel kaydın bulunmadığını sanabiliyordu. Numarayla arama düzeltildi.
- **Düzenleme yetkisinin neden olmadığı açıklanmıyordu.** Servis ve Yedek Parça yetkisine sahip personel, “Servisler” ekranında değişiklik yapamıyordu. Ekran bunun nedenini söylemiyordu. Yetkiyi açıklayan yazı eklendi. Bu iki personel grubu servisin bakiyesini de hiçbir yerde doğrudan göremiyordu. Bakiye konusu aşağıdaki iki karar sorusundan biri olarak açık bırakıldı.
- **Ek düğmesinin ne açtığı anlaşılmıyordu.** Servisim'de müşteri notuna eklenen dosyanın düğmesinde yalnızca “5 KB” yazdığı görüldü. Bu gözlem ayrıca doğrulanmadı. Kullanıcı düğmenin ne işe yaradığını anlayamayabilirdi. Fotoğraf düğmesinin adı düzeltildi.

Düzeltmelerin ayrıntıları proje çalışma notlarına da yazıldı. Yeni otomatik kontrollerin her biri için uygulamada bilerek hata oluşturuldu. Böylece kontrolün o hatayı gerçekten bulduğu görüldü; bu denemeler sınama açıklamalarına kaydedildi.

Bilgilerin kalıcı kayıtlarda karşılığı olup olmadığına bakılırken üç eksik daha bulundu ve giderildi: önceki ziyaretin bilgileri, sorunun devam ettiğini bildiren kayıt ve servis işinin sonucu.

Yeni Türkçe yazılar Codex tarafından gözden geçirildi. 18 metnin 4'ü değişti. Son otomatik denetimde on üç kontrolün tamamı geçti. 36 farklı işlem akışında 1.083 sonuç kontrol edildi. Ekranlar gezilerek ayrıca 82 kontrol yapıldı.

## 4) Hata sanılan ama hata olmayanlar

**“Taleplerim” ekranında “Kaldır” ve “Geri Al” işlemlerinin kalıcı olmadığı sanıldı.** İlk turda bu durum yüksek önem taşıyan bir sorun olarak bildirildi. Çiftçinin açık sekmesi, saatlerce yapılan yazılım değişikliklerinden sonra bozulmuştu. Uygulamanın eski ve yeni parçaları birlikte çalışmaya uğraşıyordu. Bunun yol açtığı hata ekranı yeniden başlatıyor ve son değişikliği kaybettiriyordu. Sekme yenilenince her iki işlem de çalıştı. Çiftçi 7. turda bunu yeniden doğruladı. Kullanım açıklamalarına, sınamadan önce sekmelerin yenilenmesi gerektiği eklendi.

**Fareyle düğmelere basılamadığı sanıldı.** Bu durum 5. ve 8. turlarda bildirildi. Tarayıcıdaki görüntü alanı küçüktü ve telefon ekranı daha da küçük gösteriliyordu. Sınamayı yapan yapay zekâ, bu küçülmeyi hesaba katmadan yanlış yerlere tıklıyordu. Düğmeler hem bilgisayar hem telefon boyutunda fareyle denendi ve çalıştı. Uygulamada düğme hatası bulunmadı.

**Aynı işe iki kez ödeme yazıldığı sanıldı.** 6. turun kayıt kontrolünde SRV2609243039 için iki alacak görülünce uyarı çıktı. Oysa bunlar iki ayrı ziyaretin onayıydı: 24 Eylül'de 330 TL, 26 Eylül'de 600 TL. Kontrol, geçmiş ziyaretler arasında saklanan ziyareti saymıyordu. Kontrolün bu ziyareti de sayması sağlandı.

**Mehmet Kaya'nın adres bilgileri birbirini tutmuyordu.** Sınama kayıtları silinmeden bırakıldı. İlk turdan kalan il ve ilçe bilgisi Balıkesir/Bandırma, adres ise Konya Selçuklu idi. Bu eski bilgi, makinenin son servis adresinden alınarak yeni taleplere de taşınıyordu. SRV2609268377 bunun bir örneğiydi. Bu durum uygulama hatası değil, eski sınama bilgisinin devam etmesiydi.

## 5) Sizin kararınızı bekleyen iki soru

**28 Eylül'de karar verildi ve uygulandı:**

- **1. soru: "Uyarsın".** Servis, onay bekleyen işi olan makineye yeni iş açarken Servisim artık uyarı gösteriyor. Uyarı işi engellemiyor; yeni bir arızaysa iş yine açılabiliyor.
- **2. soru: "Görsünler".** Servisin bakiyesi artık üç yerde görünüyor: "Servisler" listesinde "Bakiye" sütunu, hak ediş onaylanırken ve bakiyeden ödenen siparişin ayrıntısında. Servisler ekranını gören her personel görüyor.

Soruların ilk hâli aşağıda duruyor.

**1. Aynı makinenin onay bekleyen işi varken yeni iş açan servise uyarı gösterilsin mi?**

Servisim, onay bekleyen işi bilerek bitmiş sayıyor. Bu nedenle aynı makineye yeni iş açılırken servise uyarı vermiyor. PAKSAN ise onay sırasında “aynı makinede açık iş” işaretini görüyor. Sınamada SRV2609269186 onay beklerken SRV2609269874 açıldı. Sınamayı yapan yapay zekâ, bu durumun kötüye kullanılabileceğini belirtti. Servisim'de de uyarı gösterilip gösterilmeyeceği karara bağlanmadı.

**2. Servis ve Yedek Parça yetkisine sahip personel, servisin bakiyesini görsün mü?**

Hak edişi onaylayan ve bakiyeden ödenen siparişi gönderen personel, servisin bakiyesini doğrudan göremiyor. Yalnızca talep ayrıntısındaki satırlardan çıkarmaya çalışabiliyor. Bu iki personel grubuna bakiyeyi görme yetkisi verilip verilmeyeceği karara bağlanmadı.

## 6) Doğru çalıştığı görülenler

- **Para hesapları her adımda tuttu.** Konya servisinin bakiyesi 1.476'dan, bakiyeden gönderilen 76 tutarındaki siparişle 1.400'e indi. Ardından 600 + 204 + 1.422 hak edişle 3.626'ya çıktı. Reddedilen 1.428 hesaba yazılmadı. İptal edilen 600'lük sipariş için ayrılan tutar serbest kaldı. Eksik gönderilen faturalı siparişin tutarı 1.608'den 288'e indi. Servisim'deki hesap hareketlerinin toplamı her turda bakiyeyle aynı çıktı.
- **Çift dokunmak ikinci kayıt oluşturmadı.** Not ekleme, ödeme onayı, hak ediş onayı, parça isteği ve servis kaydı işlemlerinde tek kayıt oluştu. Başka işin kartının açılması sorunu yukarıda ayrıca anlatıldı.
- **Gerekçe olmadan işlem tamamlanmadı.** Düzeltme, gerekçe yazılmadan kaydedilmedi. İptal nedeni seçilmeden talep iptal edilmedi.
- **Servis atama bildirimleri doğru çalıştı.** Yanlış atama düzeltilince çiftçiye “Servisi Değişti” bildirimi gitti. Hesabı olmayan müşteriye bildirim oluşturulmadı. Servis atanmamış makine sayacı 6'dan 4'e indi.
- **Personelin yetki sınırları korundu.** Servis yetkisine sahip personel fiyat teklifini ve müşteri parça talebini görmedi. Yedek Parça yetkisine sahip personel servis ataması yapamadı ve bunun nedenini okuyabildi.
- **Kayıtlar arasında uygulamadan kaynaklanan yeni bir uyumsuzluk bulunmadı.** Sekiz turun sonunda yapılan karşılaştırmalar bu sonucu verdi.
