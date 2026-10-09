/* ==========================================================================
   Ekosistem sınaması — üç uygulamanın paylaştığı veri katmanını koşturur

       node tools/ekosistem-sinamasi.mjs [--tohum N] [--yalniz AK-03]

   `npm run dogrula` bunu 8. kontrolden çağırıyor. Ayrı bir komutu yok:
   ikinci bir komut, unutulacak ikinci bir yer demek.

   NE YAPIYOR. PAKSAN Connect, backoffice ve Servisim tek bir veri
   katmanını paylaşıyor (sunucu yok; devir `paksan.` önekli depodan
   oluyor). Bu betik o katmanı Node içinde gerçekten çalıştırıp uçtan
   uca akışları yürütüyor: talep açılıyor, servise düşüyor, servis
   kaydı gidiyor, hak ediş doğuyor, PAKSAN onaylıyor, cariye alacak
   yazılıyor. Kırılma buradan geliyor — bir uygulama ötekinin
   okuyamayacağı bir kayıt yazıyor ve kimse görmüyor. Ekran görüntüsü
   de statik denetim de bunu yakalayamaz; zincirin koptuğunu ancak
   zinciri yürüten görür.

   NE YAPMIYOR. Hiçbir ekran açmıyor, tek bir CSS seçicisine bakmıyor.
   Ekran tarafı ayrı: tools/ekosistem-turu.mjs.

   ÖNCE DÜŞÜRÜLEREK DENENDİ. Hiç düştüğü görülmemiş bir sınama, hiçbir
   şey iddia etmeyen sınamadan ayırt edilemez. Her senaryonun taşıyıcı
   olduğu tek tek bozularak gösterildi; liste aşağıda. Yeni senaryo
   yazan aynısını yapar ve satırını ekler.

     AK-01  talepOlustur.js `sahip` sabitlenirse               düştü
     AK-01  veri.js:2312 `tur:'alacak'` → `'borc'`             düştü
     AK-02  servisAtama.js normalizeSerial → .trim()           düştü
     AK-02  servisGruplari her makineyi ilk servise yazarsa     düştü
     AK-03  veri.js:2086 teslimat kapısı kaldırılırsa          düştü
     AK-03  rolunTalepleri 3. kapı (parça yolda) kalkarsa        düştü
     AK-03  servisParcasiGonderildi ekranın kopyasına bakarsa    düştü
     AK-03  servisParcasiGonderildi durum kapısı kalkarsa        düştü
     AK-04  talepOlustur.js tür kapısı kaldırılırsa            düştü
     AK-04  talepKapat kargoyu parcaSevk'e yazmazsa              düştü
     AK-04  kapanış bildirimi kargolu metni seçmezse             düştü
     AK-04  kargo kapanış nesnesine (cozum) sızarsa              düştü
     AK-04  kargosuz kapanışta sevk uydurulursa                  düştü
     AK-05  veri.js:1091 zincirden `tutarKdvli` çıkarılırsa    düştü
     AK-06  veri.js durumGecisiEngeli hep boş dönerse          düştü
     AK-06  talebiBayiyeAta teklif geçmişine bakmazsa          düştü
     AK-06  talebiBayiyeAta müşteriye yine bildirirse          düştü
     AK-06  talepEkleme.js kapalı listesi ayrılırsa            düştü
     AK-07  veri.js:947 eşleşme son dört haneye indirilirse    düştü
     AK-07  musteriyeBildir alıcısız kaydı yine yazarsa        düştü
     AK-07  bildirimAlicisi elle talebi telefonla eşleştirirse   düştü
     AK-08  Talepler.jsx:1586 izin adı yanlış yazılırsa        düştü
     AK-08  Makineler.jsx izni 'makineAtam' yazılırsa          düştü
     AK-08  rolunTalepleri yalnız ilk türe bakarsa             düştü
     AK-08  rolunTurleri eski tek-tür alanını okumazsa         düştü
     AK-08  rolGuncelle eski tek-tür alanını bırakırsa         düştü
     AK-08  rolIzinleriniTasi makineAtama adımını atlarsa      düştü
     AK-08  taşıma izinSurumu'na bakmadan her okumada yapılırsa düştü
     AK-08  varsayılan Servis rolüne servisDuzenle verilirse   düştü
     AK-08  varsayılan Satış ya da Yönetici makineAtama taşımazsa düştü
     AK-08  katalogda makineAtama satırı yoksa                 düştü
     AK-08  durumKilidi servisSiparisi'ne bakmazsa             düştü
     AK-08  durumKilidi talepGeriAc iznine bakmazsa            düştü
     AK-08  rolunTalepleri 3. kapı (parça yolda) kaldırılırsa  düştü
     AK-09  duyuruHedef.js:159 il süzgeci kapatılırsa          düştü
     AK-10  veri.js ANAHTAR.islemKaydi adı değişirse           düştü
     AK-11  servisKaydi.js garanti kapısı kaldırılırsa         düştü
     AK-12  veri.js birleştirmede defter yazılmazsa            düştü
     AK-13  veri.js:2086 teslimat kapısı kaldırılırsa          düştü
     AK-14  dikteMotoru.js duraklamada yine bitirilirse       düştü
     AK-15  talepPlanla `servisten`e bakmazsa                  düştü
     AK-15  talepIptal servise bildirmezse                     düştü
     AK-15  ziyaret günü sipariş diye işaretlenirse            düştü
     AK-15  gunlukRandevu new Date(deger) okursa (03:00)         düştü
     AK-15  randevuSaatliMi geriye dönük kuralı kaldırırsa       düştü
     AK-15  bildirimler.js saatsizi de 12 saatte düşürürse       düştü
     AK-16  sayım bayinin servisini hesaba katmazsa           düştü
     AK-16  sayım müşteri düzeyine dönerse                    düştü
     AK-16  servisMakineKaydi servisId'yi yine doldurursa        düştü
     AK-17  isDurumu.js şerit eski kurala (gecikmisMi) dönerse düştü
     AK-17  rozet açık işlerin hepsini sayarsa                   düştü
     AK-17  yeni iş sırası gecikeni başa almazsa                 düştü
     AK-17  geciken işler en yeniden başlarsa (ters sıra)        düştü
     AK-17  Devam Eden sıralanmazsa (29.09.2026)                  düştü
     AK-17  yolda parça PAKSAN'da sayılırsa                       düştü
     AK-17  onay bekleyen ya da devredilen serviste sayılırsa     düştü (ikisi ayrı)
     AK-17  Devam Eden ters sıralanırsa                           düştü
     AK-17  randevu anı okunmazsa                                 düştü
     AK-17  yolda parça sevk gününe sayılırsa (bugünün önüne)    düştü
     AK-17  aynı günde parça randevudan önce gelirse              düştü
     AK-18  makineKaydet var olan satırı aramazsa              düştü
     AK-18  servisMakineKaydi kayıtlı seride de yazarsa        düştü
     AK-18  kayitIsle Servisim kopyasını kabul ederse          düştü
     AK-18  okuma kopyaları birleştirmezse                     düştü
     AK-18  servisMakineKaydi müşteri hesabını yazmazsa        düştü
     AK-18  servisMakineKaydi servisId'yi yine doldurursa      düştü
     AK-18  atama bildirimi servis değişmeden de giderse       düştü
     AK-18  atama bildirimi hiç gitmezse                       düştü
     AK-18  hesapsız makineye bildirim yazılırsa               düştü
     AK-18  bildirim makine ekranına yönlenmezse               düştü
     AK-18  bildirimler.js 'makine' türünü tanımazsa           düştü
     AK-18  bildirimler.js eski atama bildirimini de gösterirse  düştü
     AK-18  atama kalkınca bildirim yazılmazsa                   düştü
     AK-18  ilk atamada "değişti" başlığı kullanılırsa           düştü
     AK-19  servisKaydi.js temizParcalar görseli düşürürse     düştü
     AK-19  parcaKatalogu.js fiyatGoruntusu görsel yazmazsa    düştü
     AK-19  talebinParcalari görüntüden görseli düşürürse      düştü
     AK-20  eski kayıt bugünkü saat ücretiyle hesaplanırsa     düştü
     AK-20  hakkedisDuzelt satıra süreyi yazmazsa              düştü
     AK-20  saatOku virgüllü süreyi ("2,5") okumazsa           düştü
     AK-21  hak ediş km kalemini sabit tarifeyle hesaplarsa    düştü
     AK-21  servisKaydiGonder ücreti kayda yazmazsa           düştü
     AK-21  katman sırası: makine servisin önüne geçerse       düştü
     AK-21  "özel ücretler de değişsin" uygulanmazsa           düştü
     AK-21  "değişsin" değişmeyen kalemin özel ücretini silerse düştü
     AK-21  ücreti değişmeyen servise de bildirim giderse      düştü
     AK-21  servisKaydiGonder onaylanan ücreti yok sayarsa     düştü
     AK-21  süresi geçmiş onaydaki ücret reddedilmezse         düştü
     AK-21  o anda geçerli olmamış km ücreti taze onayla geçerse düştü
     AK-21  o anda geçerli olmamış saat ücreti taze onayla geçerse düştü
     AK-22  servisParcaSiparisi eski oranı reddetmezse         düştü
     AK-22  servisParcaSiparisi taze onaydaki oranı reddederse düştü
     AK-22  onayTazeMi 30 dakikadan eski tutarı taze sayarsa   düştü
     AK-22  o anda geçerli olmamış oran taze onayla geçerse    düştü
     AK-22  ücret geçmişi (icerikAlaniYaz) hiç tutulmazsa      düştü
     AK-22  iskontoCoz servise özel oranı görmezse             düştü
     AK-22  genel oran "özel oranlar da değişsin"i uygulamazsa düştü
     AK-23  siparisTutari KDV'yi iskontosuz tutardan alırsa    düştü
     AK-23  servisParcaSiparisi ek iskonto oranına bakmazsa    düştü
     AK-23  aynı ek iskonto yeniden kaydedilince bildirirse    düştü
     AK-23  ek iskonto bildirimi yalnız ilk servise giderse    düştü
     AK-23  talepKapat ek iskontoyu cariden yeniden düşerse    düştü
     AK-23  genelIskontoyuKaydet ek iskontoyu silerse          düştü
     AK-23  faturalı sipariş taze onayla ek iskonto taşırsa    düştü
     AK-23  talepKapat yeniden kapanan siparişi yine düşerse   düştü
     AK-23  tek borç talep kimliğine değil numarasına bakarsa  düştü
     AK-23  o anda geçerli olmamış ek oran taze onayla geçerse düştü
     AK-23  bakiye siparişinde taze onaydaki ek oran reddedilirse düştü
     AK-24  siparisBorcunuYaz önce yazılanı düşmezse           düştü
     AK-24  talepKapat seçimi yok sayıp hepsini gönderirse     düştü
     AK-24  işaretsiz kapanış reddedilmezse                    düştü
     AK-24  gonderilenTutar hep siparişin toplamını verirse    düştü
     AK-24  gonderilenTutar ek iskontoyu atlarsa               düştü
     AK-24  kalanParcalariGonder borç yazmazsa                 düştü
     AK-24  kısmi gönderimde tam gönderim bildirimi giderse    düştü
     AK-24  kalanParcalariGonder gönderilmiş satırı kabul ederse düştü
     AK-24  siparisGonderimi gönderim listesine bakmazsa       düştü
     AK-25  siparisToplami önce KDV hariç tutarı okursa        düştü
     AK-25  talepIptal iade yazmazsa                           düştü
     AK-25  durum düğmesiyle iptal iade yazmazsa               düştü
     AK-25  siparisHesabi iadeyi saymazsa                      düştü
     AK-25  bakiyeDurumu bekleyen siparişi ayırmazsa           düştü
     AK-25  servisParcaSiparisi bakiyeye bakmazsa              düştü
     AK-25  servis işleme alınan siparişi iptal edebilirse     düştü
     AK-25  servis iptali depodan değil ekranın kopyasından okursa düştü
     AK-25  borç gönderim numarası taşımazsa                   düştü
     AK-25  iptal bildirimi iade tutarını taşımazsa            düştü
     AK-25  siparisBorcunuYaz iadeyi hesaba katmazsa           düştü
     AK-25  siparisOzeti KDV hariç tutarı verirse                düştü
     AK-25  siparisOzeti adedi satır sayısından verirse          düştü
     AK-25  bakiyeYetmiyor tam yeten bakiyede "yetmiyor" derse   düştü
     AK-25  bakiyeYetmiyor hep "yetiyor" derse                   düştü
     AK-26  siparisGonderimi iptal edileni kalandan çıkarmazsa düştü
     AK-26  siparisHesabi bekleyeni toplamdan hesaplarsa       düştü
     AK-26  yeniden kapanış iptal edilen kalemi gönderirse     düştü
     AK-26  siparisNetTutari iptali saymazsa                   düştü
     AK-26  kalem iptali bildirimi tutarı taşımazsa            düştü
     AK-26  kalem iptali sebepsiz geçerse                      düştü
     AK-26  satirlarinAdedi satır sayısını verirse               düştü
     AK-26  kalem iptali bildirimi adet yerine kalem yazarsa     düştü
     AK-27  eksikAlanlar seri yok işaretine bakmazsa           düştü
     AK-27  seri gelince işaret ve tahmini yıl düşmezse        düştü
     AK-28  hakkedisOnayla ekrandaki kopyaya bakarsa          düştü
     AK-28  hakkedisReddet durum denetlemezse                 düştü
     AK-28  odemeOnayla ikinci onayı yazarsa                  düştü
     AK-28  talepKapat kapanmış talebi yeniden kapatırsa      düştü
     AK-28  şifre değişince oturum kalıcı depoya yazılırsa    düştü
     AK-28  talep açanın kimliğini taşımazsa                  düştü
     AK-28  servisKaydiGonder kapanmış talebe yazarsa (ret)      düştü
     AK-29  bildirimAlicisi servis siparişine bakmazsa           DÜŞMEDİ (*)
     AK-29  bildirimAlicisi + musterininMi siparişe bakmazsa     düştü
     AK-29  bildirimAlicilari servis alanına bakmazsa            düştü
     AK-29  talepKapat sipariş olayı yerine "kapandi" yazarsa    düştü
     AK-29  talepKapat servis siparişine de kargo yazarsa        düştü
     AK-30  talepKaydiOlustur telHamYap'ı çağırmazsa             düştü
     AK-30  musterininMi hesap kimliğine bakmazsa                düştü
     AK-30  telHamYap baştaki sıfırı atmazsa                     düştü
     AK-30  musterininDigerTalepleri telHam eşitliğine dönerse   düştü
     AK-30  musterininMi ve bulucu servis siparişine bakmazsa    düştü
     AK-30  bildirimAlicisi telefonu harfi harfine karşılaştırırsa düştü
     AK-30  numara onayında kimliksiz talepler bağlanmazsa       düştü
     AK-30  bağlama servisin elle açtığı işi de bağlarsa         düştü
     AK-30  bildirimAlicisi elle talebi telefonla eşleştirirse   düştü
     AK-30  telGoster numarayı telHamYap'tan geçirmezse          düştü
     AK-30  kayitTelHref ülke kodunu eklemezse                   düştü
     AK-30  telHamYap ülke kodunu atmazsa                        düştü
     AK-30  kayitTelGoster siparişi firma biçiminde göstermezse  düştü
     AK-31  elleTalepKaydiOlustur işareti yazmazsa               düştü
     AK-31  elleIsinAtamasi bayinin servisini görmezse           düştü
     AK-31  elleIsinAtamasi serisiz makineyi "atanmamış" sayarsa düştü
     AK-31  servisKaydiGonder işareti silerse (atamaDisi: null)  düştü
     AK-31  makineninKendiServisiMi hep "evet" derse             düştü
     AK-31  acikServisTalebiMi kapalı durumlara bakmazsa         düştü
     AK-31  acikServisTalebiMi türe bakmazsa (AK-32 de)          düştü
     AK-31  seri anahtarı normalizeSerial'sız (AK-32 de)         düştü
     AK-31  makineninAcikServisTalepleri hariç tutulanı sayarsa  düştü
     AK-31  onay bekleyen iş "iş sürüyor" sayılırsa (AK-32 de)   düştü
     AK-32  talepOlustur teklifte makineyi silmezse              düştü
     AK-32  talepleriGetir eski teklifin makinesini ayıklamazsa  düştü
     AK-32  makinesizTeklif türe bakmazsa                        düştü
     AK-32  validateSerial yalnız öneke bakarsa                  düştü
     AK-32  seriDuzelt O ve I'yı çevirmezse                      düştü
     AK-32  seriDuzelt model kodunu da çevirirse                 düştü
     AK-32  makinenin son servis adresi en eskiden okunursa      düştü
     AK-32  eklemeyiServiseBildir işi yürüten servise bakmazsa   düştü
     AK-32  sorunDevaminiServiseBildir devredilmiş işe yazarsa   düştü
     AK-32  Servisim'de "müşteri ekledi" yazısı yoksa            düştü
     AK-32  musteridenMi "sorun devam"ı tanımazsa                düştü
     AK-32  kaldirilanTalepler hesaba bakmazsa                   düştü
     AK-32  talepHesabinMi servis siparişini dışarıda bırakmazsa düştü
     AK-32  musteriDurumAnahtari türe bakmazsa                   düştü
     AK-32  bildirimler.js parça hatırlatmasını randevu yazarsa  düştü
     AK-32  görüşün cevabı hesap kimliğine bakmazsa (*)          düştü
     AK-33  oturumGetir önce kalıcı depoya bakarsa               düştü
     AK-33  islemYaz rolü kalıcı depodan okursa                  düştü
     AK-33  rol personel kaydından alınmazsa                     düştü
     AK-33  kapatılan personelin (aktif) denetimi kalkarsa       düştü
     AK-33  personel kaydının varlığı denetlenmezse              düştü
     AK-33  oturumKapat son girişi silmezse                      düştü
     AK-33  backofficeGiris sekmenin oturumuna yazmazsa          düştü
     AK-33  servisOturumuGetir panelAktif'e bakmazsa             düştü
     AK-33  baskaSekmedenGeldi belleği boşaltmazsa               düştü
     AK-34  B1 servis akışına bütün katalogun havuzu verilirse   düştü
     AK-34  B2 makinenin yılı seriden bağımsız seçilirse         düştü
     AK-34  B3 makineUyar garanti koşulunu atlarsa               düştü
     AK-34  B4 belirti makinenin ailesinden seçilmezse           düştü
     AK-34  B5 notUret garanti koşulunu atlarsa                  düştü
     AK-34  B6 demoTemizle bağlı satır süzgecini atlarsa         düştü
     AK-34  B7 km ücreti tarifeden değil sabitten yazılırsa      düştü
     AK-34  B8 PARCA_ADINDAKI_MODEL'den YUNUS silinirse          düştü
     AK-34  B9 GRUBUN_MODELLERI'nde ürün kimliği bozulursa       düştü
     AK-34  B10 arıza nedeni yeniden rastgele seçilirse          düştü
     AK-34  açık iş boş makineye konmazsa (acikMakineler)        düştü
     AK-34  talep numarası tekil tutulmazsa (bir tohumda)        düştü
     AK-34  Servisim randevusu saatli yazılırsa                  düştü
     AK-34  elle işte atamaDisi kuraldan bağımsız yazılırsa      düştü
     AK-34  G4b talep adresi müşterinin köyünden saparsa (29.09) düştü
     AK-34  G4b demo müşterisi adressiz kalırsa                  düştü
     AK-34  demo talebinin ham numarası biçimli yazılırsa        düştü
     İnceleme onarımı (25 Eylül 2026 akşamı; bozmalar deponun
     kopyasında, geliştirme sunucusunun gördüğü dosyalara dokunmadan):
     AK-12  birleştirme servisin elle kimliksiz işini de taşırsa  düştü
     AK-12  hesabaBaglanirMi elle kimliksiz işi dışlamazsa (AK-32 de) düştü
     AK-25  veri.js bakiye reddi tam yeten bakiyeyi de reddederse düştü
     AK-28  talepPlanla servisin kapanmış işe yazımını alırsa   düştü
     AK-28  talepKapat servisin kapanmış işe yazımını alırsa    düştü
     AK-28  talepDurumDegistir servisin kapanmış işe yazımını alırsa düştü
     AK-28  talepIptal servisin kapanmış işe yazımını alırsa    düştü
     İkinci kullanıcı sınamasının düzeltmeleri (26 Eylül 2026):
     AK-35  buZiyaretinKaydi her kaydı bu ziyaretin sayarsa      düştü
     AK-35  veri.js parça isteğine sorulmayan alanları yazarsa   düştü
     AK-35  isDurumu.dokunulmamis eski kurala dönerse            düştü
     AK-35  talepNedeni "Sorun Devam" açıklamasını atlarsa       düştü
     AK-35  talepNedeni makinenin durumuna düşmezse              düştü
     AK-35  parcaBekliyor izleyen durumlardan çıkarılırsa        düştü
     AK-35  sevkSatiriMi arşivdeki sevke bakmazsa                düştü
     AK-35  Connect geçmişi sevk satırını ayırmazsa              düştü
     AK-36  kargo açık talebe de yazılırsa                       düştü
     AK-36  kargo servis siparişine de yazılırsa                 düştü
     AK-36  değişmeyen kargo bilgisi yeniden yazılırsa           düştü
     AK-36  ilk gönderimin tarihi ezilirse                       düştü
     AK-36  kargo bildiriminde alıcı kuralı atlanırsa            düştü
     AK-36  boş kargo bilgisi kabul edilirse                     düştü
     AK-37  kayıtta kampanya kararı hep "onay" yazılırsa (29.09.2026) düştü
     AK-15  PAKSAN devredilmemiş işe randevu verebilirse (29.09.2026) düştü
     AK-37  eski sürümün servis kabulü yeni sürüme sayılırsa    düştü
     AK-37  sınama tohumunun hesabı eski metin sürümünde kalırsa düştü
     AK-37  veritabanında olmayan kanal kodu yazılırsa          düştü
     Bölge dışı servis talebi (5 Ekim 2026):
     AK-38  bölge kuralı hiç uygulanmazsa                      düştü
     AK-38  kural hesap adresine bakarsa                       düştü
     AK-38  atama ekrandaki kopyadan karar verirse             düştü
     AK-38  servis bildirimi makinenin servisine giderse       düştü
     AK-38  kapanmış talebe atama kapısı kalkarsa              düştü
     AK-38  atama makinenin kalıcı servisini de değiştirirse   düştü
     Garanti işi servis biriminde, yapılan iş çok seçimli (6 Ekim 2026):
     AK-03  parça isteği yedek parça masasına düşerse           düştü (AK-34 de)
     AK-03  rolunTalepleri garanti kapısı kalkarsa              düştü (AK-08 de)
     AK-03  parçasız "Parça Değişti" kapısı kalkarsa            düştü
     AK-03  yapılan iş yazısı seçimlere bölünmezse              düştü
     AK-03, AK-08, AK-34  garanti parçası yedek parça masasındaydı,
            beklentiler eskidi (kullanıcının kararıyla kural değişti).
     Servis formu yalnız bu ziyaretin kaydı tamamlanınca (7 Ekim 2026):
     AK-35  iki kapı birden kalkarsa (eski kural)               düştü
     AK-35  kapılardan biri tek başına kalkarsa: DÜŞMEDİ — iki kat
            kapı; yeniden açılan işte durum "yeni", parça beklerken
            kayıt bu ziyaretin ama durum "parcaBekliyor", öteki tutuyor.
     AK-02  ikinci makinenin talebi Konya'dan açılınca bölge dışı
            oldu: beklenti eskidi, talep makinenin yerinden (Ankara)
            açılıyor (uygulama bozulmadı, kural değişti).
     AK-08  iptal kilidi "kapandı" nedenine dönerse               düştü
     AK-31  onay bekleyen kendi işi uyarıya girmezse (28.09.2026) düştü
     AK-28  kapı backoffice'in çağrısına da uygulanırsa         düştü
     AK-30  numara değişikliği kimliksiz görüşü bağlamazsa      düştü
     AK-30  telHamYap "0090"/"90" yazılışında kodu atmazsa      düştü
     AK-30  bildirim listesi "numara"yı duyuruya çevirirse      düştü (7 Ekim 2026)
     AK-30  numara reddi formu değil profili açarsa              düştü (7 Ekim 2026)
     AK-30  numara onayı profile götürürse                       düştü (7 Ekim 2026)
     8 Ekim 2026 (talepte iş izinleri, müşterinin iptali, görüşün durumu):
     AK-08  taşıma Yönetici rolünü de kapsarsa                  düştü
     AK-08  durum düğmesinin kilidi rolün iznine bakmazsa       düştü
     AK-08  varsayılan Servis rolü iş izinlerini listede taşımazsa düştü
            (ilk denemede DÜŞMEDİ: taşıma eksik listeyi tarayıcıda
            örtüyordu; tohum listeyi taşımasız okuduğu için listenin
            kendisine bakan iddia eklendi, sonra düştü)
     AK-39  yol kuralı randevuya bakmazsa                       düştü
     AK-39  yazım depodaki kayıtla yeniden sormazsa             düştü
     AK-39  karar ekrandaki kopyadan verilirse                  düştü
     AK-39  Servisim müşterinin iptalini PAKSAN'ınki sayarsa    düştü
     AK-39  ret servise bildirilmezse                           düştü
     AK-40  alanı olmayan eski not iç not sayılırsa             düştü
     AK-40  iç not da müşteriye bildirim yazarsa                düştü
     AK-40  görüş cevabı Connect'te duyuruya düşerse            düştü
     AK-40  durum kapanışa bakmazsa                             düştü
     AK-20  düzeltme satırı değişmeyen yolu da yazarsa          düştü
            (8.10.2026, kullanıcının bildirdiği)
     AK-20  düzeltme satırı parça değişikliğini yazmazsa        düştü
     AK-32  TC sağlamasında eksi kalan düzeltmesi geri alınırsa düştü
            (8.10.2026, kullanıcının bildirdiği)
     AK-20  Servisim yol satırı tutarı yazmazsa (9.10.2026)     düştü
     AK-20  garanti dışı eski kayda da yol tutarı yazarsa       düştü
            (sınanmayan: TalepDetay.jsx'in satırı yolYazisi'ndan
            çizmesi; ekran görüntüsüyle bakıldı)
     9 Ekim 2026 (makinenin sahibi değişiyor, ikinci el devir):
     AK-41  makine eski sahibin listesinden çıkmazsa            düştü
     AK-41  kapanan sahiplik geçmişe yazılmazsa                 düştü
     AK-41  devir ilk kayıt tarihini ezerse                     düştü
     AK-41  aynı hesaba devir kabul edilirse                    düştü
     AK-41  birleşip kapanmış hesaba devir kabul edilirse       düştü
     AK-41  yeni sahibi arama son dört haneye bakarsa           düştü
     AK-41  eski sahibe bildirim gitmezse                       düştü
     AK-41  aynı hesabın yeniden eklemesi sahipliği başlatırsa  düştü
     AK-41  hesapsız satıra ekleme sahipliği başlatmazsa        düştü
     AK-41  sahibin adı hesaptan değil defterden okunursa       düştü
     AK-41  kapanan sahiplik eski (defterdeki) adı yazarsa      düştü
            (sınanmayan: Connect'in açık sekmesinin makine listesini
            depodan tazelemesi — AppState.jsx, tarayıcıda; tur B-SAHIP
            backoffice penceresini sınıyor)
     AK-34  demo ikinci el makineyi kurmazsa (G19)              düştü
     AK-34  devrin İşlem Kaydı satırı geri alınmazsa (G18)      düştü
     AK-34  demo devri son talebin açılışından önceye koyarsa   düştü
            (yalnız gün hesabını bozmak düşmedi: aynı yerdeki "devir
            son talepten sonra mı" kapısı o makineleri ayıklıyor; bozma
            ikisini birlikte kaldırınca düştü)
     AK-34  demo talebi süren makineyi devrederse               düştü
     8 Ekim 2026 (yeni fiyat listesi eskisini kaldırıyor):
     AK-19  kayitlardakiParcaGorselleri talep deposunu taramazsa düştü
     AK-19  aynı işlev iç içe satırlara inmezse                 düştü
            (sınanmayan: backoffice ekranının listeyi yayın isteğine
            koyması — tur PDF yüklemiyor; sunucunun silme kuralı
            tools/fiyat-listesi-okuma-sinamasi.mjs'te)
     AK-31  Servisim kartı devredilmiş işi "işiniz" sayarsa     düştü
     AK-32  gizleme açık (yeniden açılmış) talebi de saklarsa   düştü
     AK-32  sorunDevamEngeli süren işi görmezse                 düştü
     AK-32  makineninIsSurenServisTalebi en yeniyi seçmezse     düştü
     AK-32  son servis adresi adresi boş talebi atlamazsa       düştü
     AK-32  son servis adresi türe bakmazsa                     düştü
     AK-32  servis talebi dolu hesap yerini değiştirirse        düştü
     AK-33  islemYaz rolü personel kaydından okumazsa           düştü
     AK-33  oturumKapat başkasının son girişini de silerse      düştü
     AK-33  sifreTalebiOlustur rolü yazmazsa                    düştü
     AK-33  oturumsuz sekmede son giriş koşulsuz kullanılırsa   düştü
     Servisim'in demo sahnesi (29 Eylül 2026; bozmalar deponun
     kopyasında, dosya her seferinde sha256 ile geri kondu):
     AK-34  B11 G6 parça isteği nedeni açıklamadan alırsa        düştü
     AK-34  B12 G15 ekleme servise bildirilmezse                 düştü
     AK-34  B13 G15 "Sorun Devam" servise bildirilmezse          düştü
     AK-34  B14 G15 kısmi gönderim seçimi yok sayılırsa          düştü
     AK-34  B15 G11/G15 geçmiş randevu verilmezse                düştü
     AK-34  B16 G16 hesap bildirimleri demo damgası almazsa      düştü
     AK-34  B17 G17 eski bildirimler okunmuş sayılmazsa          düştü
     AK-34  B18 G18 İşlem Kaydı geri alınmazsa                   düştü
     AK-34  B19 G12 demoTemizle sahnenin izlerini silmezse       düştü
     AK-34  B20 G12 demoTemizle demo sürümünü silmezse           düştü
     AK-34  B21 G12 okunmuş listesi temizlenmezse                düştü
     AK-34  B22 sahne talebi hesap kimliği taşımazsa             düştü
     AK-34  B23 açık iş boş makineye konmazsa (yeni havuzla)     düştü
     AK-34  B24 sahne ayar yedeğini yazmazsa (G16, G12)          düştü
     ---    ortam.mjs'te saat dilimi kurulmazsa (TZ=UTC)  0. ADIM DURDURUR
     ---    ortam.mjs'te depo taklidi kaldırılırsa    0. ADIM DURDURUR

   Son satır en önemlisi: src/lib/storage.js her hatayı yutup
   varsayılanı döndürüyor, yani taklit kurulmazsa bütün senaryolar boş
   depoya bakar ve HEPSİ YEŞİL GEÇER. 0. adım tam onu tutuyor.

   (*) İKİ KAT KAPI (25 Eylül 2026). Servis siparişinin müşteri alıcısı
   olmaması iki yerde tutuluyor: bildirimAlicisi'nin ilk satırı ve
   musterininMi'nin kendi kapısı (lib/musteriEslesmesi.js, kural a).
   Birincisi tek başına silinince AK-29 DÜŞMEDİ: öteki kapı tuttu.
   İkisi birlikte silinince on iddia düştü. Sınama "sipariş müşteriye
   bildirim yazmaz" davranışını taşıyor, tek bir satırın varlığını
   değil; birinin sessizce kalkması ancak kod okunarak görülür. Görüşün
   cevabı (AK-32) da hesap kimliğine iki yerde bakıyor; bozma ikisini
   birlikte kaldırdı.

   25 Eylül 2026 kullanıcı sınamasının düzeltmeleri (AK-29…AK-34 ve var
   olanlara eklenenler) bu listeye 93 bozmayla girdi; 92'si düştü,
   düşmeyen yukarıda (*). Aynı akşamki inceleme onarımı 22 bozma ekledi,
   hepsi düştü. Bozmalar tek tek yapıldı, dosya her seferinde
   bayt bayt geri kondu (sha256 ile denetlendi).
   ========================================================================== */

import {
  ortamKur,
  modulleriYukle,
  nisanTuru,
  depoTemizle,
  kapat,
  tohumla,
  kaynaklariTopla,
  modulYukle,
  TOHUM,
} from './ekosistem/ortam.mjs'
import { SENARYOLAR } from './ekosistem/senaryolar.mjs'

const arg = process.argv.slice(2)
const deger = (ad) => {
  const i = arg.indexOf(ad)
  return i >= 0 ? arg[i + 1] : null
}
const tohum = Number(deger('--tohum')) || TOHUM
const yalniz = deger('--yalniz')

/* Depo, saat ve rastgelelik modüllerden ÖNCE kurulmak zorunda. */
ortamKur()
tohumla(tohum)

const m = await modulleriYukle()
const ctx = { kaynaklar: kaynaklariTopla(), modulYukle }

/* ----------------------------------------------------------- 0. adım */

const nisanHatasi = nisanTuru(m.depo)
if (nisanHatasi) {
  console.log('')
  console.log('0. adım — depo taklidi ve saat dilimi')
  console.log('-------------------------------------')
  console.log(`  ! ${nisanHatasi}`)
  console.log('')
  if (nisanHatasi.startsWith('saat dilimi')) {
    console.log('    Sınama Türkiye saatinde koşmuyor. Gün ve saat hesaplayan')
    console.log('    iddialar başka bir güne bakar; dilime bağlı bir kusur (saatsiz')
    console.log('    randevunun 03:00 olması gibi) YANLIŞLIKLA geçerdi. Hiçbiri')
    console.log('    koşturulmadı.')
  } else {
    console.log('    Depo taklidi çalışmıyor. src/lib/storage.js her hatayı yutup')
    console.log('    varsayılanı döndürdüğü için senaryolar koşsaydı hepsi boş bir')
    console.log('    depoya bakar ve YANLIŞLIKLA geçerdi. Hiçbiri koşturulmadı.')
  }
  console.log('')
  console.log('SONUÇ: sınama yapılamadı.')
  await kapat()
  process.exit(1)
}

/* --------------------------------------------------------- Senaryolar */

const secili = yalniz
  ? SENARYOLAR.filter((f) => f.name.replace(/^AK/, 'AK-') === yalniz)
  : SENARYOLAR

if (yalniz && !secili.length) {
  console.log(`  ! "${yalniz}" diye bir senaryo yok`)
  await kapat()
  process.exit(1)
}

console.log('')
console.log(`Ekosistem akışları — ${secili.length} senaryo · tohum ${tohum}`)
console.log('-'.repeat(46))

const sonuclar = []

for (const senaryo of secili) {
  depoTemizle()
  let d
  try {
    d = await senaryo(m, ctx)
  } catch (e) {
    sonuclar.push({
      kod: senaryo.name.replace(/^AK/, 'AK-'),
      ad: '(patladı)',
      sayi: 0,
      dusen: [{ ne: 'senaryo hata fırlattı', beklenen: 'çalışması', gelen: String(e?.message || e) }],
      patladi: e,
    })
    continue
  }
  sonuclar.push(d)
}

/* ----------------------------------------------------------- Ayrıntı */

for (const s of sonuclar) {
  if (!s.dusen.length) {
    console.log(`  ok ${s.kod}  ${s.ad}  (${s.sayi} iddia)`)
    continue
  }
  console.log(`  !  ${s.kod}  ${s.ad}  — ${s.dusen.length}/${s.sayi} iddia düştü`)
  for (const h of s.dusen) {
    console.log(`       ${h.ne}`)
    console.log(`         beklenen: ${h.beklenen}`)
    console.log(`         gelen   : ${h.gelen}`)
  }
  if (s.patladi?.stack) {
    console.log(
      s.patladi.stack
        .split('\n')
        .slice(0, 4)
        .map((x) => '       ' + x.trim())
        .join('\n'),
    )
  }
}

/* ------------------------------------------------------------ Özet

   TABLO EN SONDA OLMAK ZORUNDA. `npm run dogrula` 8. kontrol, düşen
   bir sınamanın yalnız SON 12 SATIRINI basıyor. Hüküm başta yazılsaydı
   dilimin dışında kalır ve dogrula çıktısında görünmezdi. */

const dusenler = sonuclar.filter((s) => s.dusen.length)
const iddia = sonuclar.reduce((t, s) => t + s.sayi, 0)

console.log('')
console.log('  KOD     SENARYO                              İDDİA  SONUÇ')
for (const s of sonuclar) {
  const ad = (s.ad.length > 35 ? s.ad.slice(0, 34) + '…' : s.ad).padEnd(35)
  const say = String(s.sayi).padStart(5)
  console.log(`  ${s.kod}  ${ad}${say}  ${s.dusen.length ? 'DÜŞTÜ' : 'geçti'}`)
}

console.log('')
if (dusenler.length) {
  console.log(
    `SONUÇ: ${sonuclar.length} senaryonun ${dusenler.length} tanesi düştü (${iddia} iddia koşturuldu).`,
  )
  await kapat()
  process.exit(1)
}
console.log(`SONUÇ: ${sonuclar.length} senaryonun hepsi geçti, ${iddia} iddia doğrulandı.`)
await kapat()
