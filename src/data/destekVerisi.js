/* ==========================================================================
   Destek ekranının bilgi tabanı

   NE OLDUĞU

   Uygulamadaki makinelerde sahada en sık karşılaşılan sorunlar ve
   bunların çözümleri. Her kayıt üç parçadan oluşuyor:

       BELİRTİ    çiftçinin gözüyle gördüğü şey
       SEBEP      o belirtinin arkasındaki olası nedenler
       YAPILACAK  her nedenin karşısındaki iş

   Bu sıralama tarım makinesi arıza çözümünün yerleşik yöntemi:
   görülen belirtiden yola çıkılır, makinenin hangi bölümünden
   kaynaklandığı bulunur, sonra sırayla en olası nedenden başlanır.

   NEDEN BÖYLE DÜZENLENDİ

   Çiftçi "düğüm atıcı zamanlaması bozuk" diye düşünmez. "Balya
   dağılıyor" der. Bu yüzden giriş noktası her zaman belirti; teknik
   terim ancak nedende geçer, o da açıklamasıyla birlikte.

   Nedenler ÖNCE EN OLASI VE EN KOLAY kontrol edilecek olandan
   başlıyor. Bir çiftçinin tarlada mekik zamanlaması ayarlamadan önce
   ipin doğru geçtiğine bakması gerekir; liste bu sırayı izliyor.

   SINIRI

   Buradaki bilgiler makine sınıfının genel çalışma bilgisidir; bir
   makinenin kendi kullanım kılavuzunun yerine geçmez. Ekranda da bu
   yazıyor. Model bazında ölçü, tork ve ayar değeri vermiyoruz —
   yanlış bir sayı, hiç bilgi vermemekten kötüdür.

   BAĞLANTI

   Her destek grubu ürünün `supportGroup` değerine göre seçiliyor
   (bkz. src/data/products.js). Karşılığı olmayan bir ürün gelirse
   `genel` grubu açılıyor, ekran boş kalmıyor.
   ========================================================================== */

/* Makineye el sürmeden önce okunacak tek uyarı.

   Kısa tutuldu: uzun güvenlik listesi okunmadan geçiliyor. Bu dört
   madde her müdahalede geçerli olan ve atlandığında insan sakatlayan
   maddelerdir. */
export const GUVENLIK = {
  tr: [
    'Traktörü durdurun, kuyruk milini kapatın.',
    'Kontağı kapatıp anahtarı üzerinize alın.',
    'Hareketli parçalar tamamen durana kadar bekleyin.',
    'Kaldırılmış bir parçanın altına girmeyin; destek koyun.',
  ],
  en: [
    'Stop the tractor and disengage the PTO.',
    'Switch off the ignition and keep the key with you.',
    'Wait until every moving part has come to a complete stop.',
    'Never go under a raised part; prop it up first.',
  ],
}

/* Zorluk, çiftçinin o işi tarlada kendi başına yapıp yapamayacağını
   söylüyor. Ekranda rozet olarak görünüyor ve sıralamayı belirliyor:
   kolay olanlar üstte. */
export const ZORLUK = {
  kolay: { tr: 'Tarlada yapılır', en: 'Can be done in the field' },
  orta: { tr: 'Alet gerekir', en: 'Tools needed' },
  servis: { tr: 'Servis işi', en: 'Service job' },
}

/* --------------------------------------------------------------------------
   Kayıtların yazımı

     bolum.ad       çiftçinin parmağıyla gösterebileceği yer
     belirti.ad     gördüğü şey, kendi cümlesiyle
     belirti.alt    aynı şeyi başka türlü söyleyen ifadeler (arama için değil,
                    doğru belirtiyi seçtiğinden emin olması için)
     sebep.ad       nedenin adı
     sebep.kontrol  bunu nasıl anlar
     sebep.yap      anladıysa ne yapar
     parcalar       o belirtide değişmesi gerekebilecek parçalar; yedek
                    parça talebine taşınıyor
   -------------------------------------------------------------------------- */

export const DESTEK = {
  /* ======================================================== PRİZMATİK BALYA

     Uygulamadaki 20 makinenin 11'i bu grupta: küçük balya (Süper,
     Yunus, Hammer) ve büyük balya (Orkinos, Orka, Albatros). Çalışma
     mantıkları aynı olduğu için tek grup. */
  balya: {
    ad: { tr: 'Prizmatik balya makinası', en: 'Square baler' },
    bolumler: [
      {
        id: 'pikap',
        ad: { tr: 'Pikap ve besleme', en: 'Pickup and feeding' },
        aciklama: {
          tr: 'Ürünü yerden alan ve kanala taşıyan bölüm',
          en: 'The section that lifts the crop and feeds the chamber',
        },
        belirtiler: [
          {
            id: 'pikap-toplamiyor',
            ad: { tr: 'Pikap ürünü yerden tam almıyor, arkada ot kalıyor', en: 'The pickup leaves crop on the ground' },
            sebepler: [
              {
                ad: { tr: 'Pikap yüksekliği yanlış ayarlanmış', en: 'Pickup height is set wrong' },
                kontrol: { tr: 'Parmaklar toprağa değmeden 2–3 parmak yukarıda olmalı.', en: 'The tines should clear the ground by two or three fingers.' },
                yap: { tr: 'Pikabın destek tekerleğini indirip yüksekliği düşürün. Fazla alçaltmayın; parmaklar toprağa girer ve kırılır.', en: 'Lower the gauge wheel to reduce the height. Do not go too low or the tines will dig in and break.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Kırık veya eğik pikap parmağı var', en: 'Bent or broken pickup tines' },
                kontrol: { tr: 'Pikabı elle çevirip parmakları tek tek sayın; eksik veya eğik olan hemen belli olur.', en: 'Turn the pickup by hand and check the tines one by one.' },
                yap: { tr: 'Kırık ve eğik parmakları değiştirin. Bir sıradaki boşluk o hattın ürünü almamasına yol açar.', en: 'Replace broken and bent tines. A gap in one row leaves a strip uncollected.' },
                zorluk: 'orta',
              },
              {
                ad: { tr: 'İlerleme hızı ürüne göre fazla', en: 'Ground speed is too high for the crop' },
                kontrol: { tr: 'Namlu kalınsa ve hız yüksekse pikap yetişemez.', en: 'A heavy swath with high speed overruns the pickup.' },
                yap: { tr: 'Hızı düşürün ya da namluyu ikiye ayırın.', en: 'Slow down or split the swath.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: ['Pikap parmağı', 'Pikap yayı'],
          },
          {
            id: 'besleme-duzensiz',
            ad: { tr: 'Besleme düzensiz, balyalar farklı sıkılıkta çıkıyor', en: 'Feeding is uneven, bale density varies' },
            sebepler: [
              {
                ad: { tr: 'Namlu düzensiz toplanmış', en: 'The swath is uneven' },
                kontrol: { tr: 'Namlunun bir yeri kalın, bir yeri ince mi bakın.', en: 'Look for thick and thin spots along the swath.' },
                yap: { tr: 'Namluyu tırmıkla düzeltin. Makine kendisine gelen ürünü sıkıştırır; giren düzensizse çıkan da düzensiz olur.', en: 'Even out the swath with the rake. The baler compresses what it is given.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Makine namlunun ortasında sürülmüyor', en: 'The baler is not centred on the swath' },
                kontrol: { tr: 'Balyanın hep aynı kenarı gevşek çıkıyorsa makine namluya ortalanmamıştır.', en: 'If the same side is always loose, the machine is off-centre.' },
                yap: { tr: 'Traktörü namlunun tam ortasında sürün; gerekiyorsa çeki demirini kaydırın.', en: 'Drive centred on the swath; shift the drawbar if needed.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Yaba veya tırmık zamanlaması kaymış', en: 'Fork or feeder timing has drifted' },
                kontrol: { tr: 'Yabalar ürünü kanala pistonun geri çekildiği anda bırakmalı.', en: 'The forks must drop the crop while the plunger is back.' },
                yap: { tr: 'Zamanlama ayarı kataloğa göre yapılır; kendiniz denemeyin, servise bildirin.', en: 'Timing is set to the manual; report it to service rather than guessing.' },
                zorluk: 'servis',
              },
            ],
            parcalar: ['Yaba parmağı', 'Emniyet pimi'],
          },
          {
            id: 'kanal-tikaniyor',
            ad: { tr: 'Besleme kanalı sık sık tıkanıyor', en: 'The feed channel keeps blocking' },
            sebepler: [
              {
                ad: { tr: 'Ürün fazla nemli', en: 'The crop is too damp' },
                kontrol: { tr: 'Avucunuzda sıktığınızda ot birbirine yapışıyorsa nem yüksektir.', en: 'If a handful clumps together, moisture is high.' },
                yap: { tr: 'Ürün kuruyana kadar bekleyin. Nemli ot hem tıkar hem balya içinde küflenir.', en: 'Wait until the crop dries. Damp hay both blocks the machine and moulds inside the bale.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Bir defada çok ürün veriliyor', en: 'Too much crop at once' },
                kontrol: { tr: 'Kalın namluda hız yüksekse kanal dolar.', en: 'A heavy swath at speed overloads the channel.' },
                yap: { tr: 'Hızı düşürün. Kuyruk mili devrini düşürmeyin; devir düşünce piston zayıflar ve tıkanma artar.', en: 'Reduce speed but keep PTO revs up; low revs weaken the plunger.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Emniyet pimi kesilmiş', en: 'The shear pin has broken' },
                kontrol: { tr: 'Makine çalışıyor ama piston hareket etmiyorsa pime bakın.', en: 'If the machine runs but the plunger is still, check the pin.' },
                yap: { tr: 'Kanalı temizleyin, pimi yenisiyle değiştirin. Pim yerine cıvata takmayın; pim kesilerek makineyi koruyor.', en: 'Clear the channel and fit a new pin. Never substitute a bolt; the pin is there to shear.' },
                zorluk: 'orta',
              },
            ],
            parcalar: ['Emniyet pimi'],
          },
        ],
      },
      {
        id: 'baglama',
        ad: { tr: 'Bağlama ve düğüm', en: 'Knotting and twine' },
        aciklama: {
          tr: 'İpi balyanın etrafına dolayıp düğümleyen bölüm',
          en: 'The section that wraps and ties the twine',
        },
        belirtiler: [
          {
            id: 'dugum-atmiyor',
            ad: { tr: 'Düğüm hiç atmıyor, balya dağılıyor', en: 'No knot is formed, bales fall apart' },
            sebepler: [
              {
                ad: { tr: 'İp yolu yanlış geçirilmiş', en: 'The twine is threaded wrong' },
                kontrol: { tr: 'İpi makaradan iğne ucuna kadar takip edin; bir kılavuzu atlamış olabilir.', en: 'Follow the twine from the ball to the needle tip; a guide may have been skipped.' },
                yap: { tr: 'İpi makinenin üzerindeki şemaya göre baştan geçirin. En sık görülen sebep budur ve düzeltmesi en kolayıdır.', en: 'Re-thread following the diagram on the machine. This is the most common cause and the easiest fix.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Düğüm atıcı bölgesi ip tozu ve sapla dolmuş', en: 'The knotter area is packed with dust and stalks' },
                kontrol: { tr: 'Kapağı açıp bakın; ip tozu keçeleşerek mekiğin hareketini kilitler.', en: 'Open the cover; twine dust felts up and locks the bill hook.' },
                yap: { tr: 'Basınçlı havayla temizleyin. Su kullanmayın, nem ip tozuyla birleşip çamur yapar.', en: 'Blow it out with compressed air. Never use water; it turns the dust to mud.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'İğne eğilmiş veya kırılmış', en: 'The needle is bent or broken' },
                kontrol: { tr: 'İğneyi elle hareket ettirip yolunda bir yere çarpıp çarpmadığına bakın.', en: 'Move the needle by hand and check whether it strikes anything.' },
                yap: { tr: 'Eğik iğne düzeltilmez, değiştirilir. Yeni iğne takıldıktan sonra iğne yolu mutlaka kontrol edilmeli.', en: 'A bent needle is replaced, not straightened. Check the needle path after fitting.' },
                zorluk: 'servis',
              },
              {
                ad: { tr: 'Mekik ile bıçak kolu arasındaki mesafe açılmış', en: 'The gap between bill hook and knife arm has opened' },
                kontrol: { tr: 'Mesafe fazlaysa mekik ipi sıkı tutamaz, ip elinden kaçar.', en: 'Too much gap and the bill hook cannot hold the twine.' },
                yap: { tr: 'Bu ayar ölçüyle yapılır ve kataloğa bakmayı gerektirir. Servise bildirin.', en: 'This is a measured adjustment; report it to service.' },
                zorluk: 'servis',
              },
            ],
            parcalar: ['İğne', 'Düğüm atıcı bıçağı', 'Mekik dili', 'İp tutucu disk'],
          },
          {
            id: 'dugum-bozuk',
            ad: { tr: 'Düğüm atıyor ama bozuk: kısa, uzun veya saçaklı', en: 'Knots form but come out short, long or frayed' },
            sebepler: [
              {
                ad: { tr: 'İp gerginliği yanlış', en: 'Twine tension is wrong' },
                kontrol: { tr: 'İp çok gevşekse düğüm uzun ve dağınık, çok gergin ise kısa çıkar ve kopar.', en: 'Loose twine gives long ragged knots; tight twine gives short knots and breaks.' },
                yap: { tr: 'Gerginlik ayarını küçük adımlarla değiştirin ve her seferinde bir balya alıp düğüme bakın.', en: 'Adjust tension in small steps and check a knot after each bale.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Düğüm atıcı bıçağı körelmiş veya çentiklenmiş', en: 'The knotter knife is dull or nicked' },
                kontrol: { tr: 'Bıçak ağzına tırnağınızı sürün; çentik hissediyorsanız ip temiz kesilmiyordur.', en: 'Run a nail along the edge; a nick means the twine is not cut cleanly.' },
                yap: { tr: 'Bıçağı bileyin, çentikliyse değiştirin. Saçaklı düğümün en sık sebebi budur.', en: 'Sharpen or replace the knife. This is the usual cause of frayed knots.' },
                zorluk: 'orta',
              },
              {
                ad: { tr: 'İp tutucu disk baskısı gevşemiş', en: 'The twine holder disc pressure has dropped' },
                kontrol: { tr: 'Disk ipi yeterince tutmuyorsa düğümün bir ucu kaçar.', en: 'If the disc cannot hold the twine, one end of the knot slips.' },
                yap: { tr: 'Yay vidasını çok az sıkın ve deneyin. Fazla sıkarsanız bu sefer ip kopar.', en: 'Tighten the spring screw a little and test. Over-tightening snaps the twine.' },
                zorluk: 'orta',
              },
              {
                ad: { tr: 'Makineye uygun olmayan ip kullanılıyor', en: 'The twine does not suit the machine' },
                kontrol: { tr: 'İpin kalınlığı ve cinsi makinenin istediğinden farklı olabilir.', en: 'Twine thickness or type may not match the machine.' },
                yap: { tr: 'Makinenin istediği kalınlıkta ip kullanın. Ucuz ve tüylü ip hem tozu artırır hem düğümü bozar.', en: 'Use the specified twine. Cheap fibrous twine adds dust and spoils knots.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: ['Düğüm atıcı bıçağı', 'İp tutucu disk', 'Yay takımı'],
          },
          {
            id: 'ip-kopuyor',
            ad: { tr: 'İp sürekli kopuyor', en: 'The twine keeps breaking' },
            sebepler: [
              {
                ad: { tr: 'İp bir yere sürtüyor', en: 'The twine is rubbing somewhere' },
                kontrol: { tr: 'İp yolunu baştan sona elinizle takip edin; sürtme olan yerde iz ve tüylenme olur.', en: 'Follow the twine path by hand; rubbing leaves a mark and fuzz.' },
                yap: { tr: 'Sürtme yapan kılavuzu düzeltin veya değiştirin. Aşınmış kılavuz ipi testere gibi keser.', en: 'Repair or replace the guide. A worn guide saws through the twine.' },
                zorluk: 'orta',
              },
              {
                ad: { tr: 'İp gerginliği fazla', en: 'Tension is too high' },
                kontrol: { tr: 'Fren ve gerginlik ayarı sıkıysa ip zaten gergin gelir, düğüm anında kopar.', en: 'A tight brake leaves no slack, so the twine snaps as the knot forms.' },
                yap: { tr: 'Gerginliği azaltın. Balya sıkılığı ile ip gerginliği ayrı ayarlardır, karıştırmayın.', en: 'Reduce tension. Bale density and twine tension are separate settings.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Balya çok sıkı ayarlanmış', en: 'Bale density is set too high' },
                kontrol: { tr: 'Balya elle bastırıldığında hiç esnemiyorsa fazla sıkıdır.', en: 'If the bale does not give at all under hand pressure, it is too dense.' },
                yap: { tr: 'Sıkıştırma ayarını biraz gevşetin. Sıkı balya ipi kopardığı gibi makineyi de zorlar.', en: 'Ease the density setting. Over-dense bales break twine and strain the machine.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: ['İp kılavuzu', 'İp freni'],
          },
        ],
      },
      {
        id: 'balya-kalitesi',
        ad: { tr: 'Balyanın şekli ve sıkılığı', en: 'Bale shape and density' },
        aciklama: {
          tr: 'Çıkan balyanın görünüşüyle ilgili sorunlar',
          en: 'Problems with how the finished bale looks',
        },
        belirtiler: [
          {
            id: 'balya-gevsek',
            ad: { tr: 'Balya gevşek çıkıyor, elde dağılıyor', en: 'Bales come out loose and fall apart' },
            sebepler: [
              {
                ad: { tr: 'Sıkıştırma ayarı düşük', en: 'The density setting is low' },
                kontrol: { tr: 'Pres kanalının yan baskı kollarına bakın; gevşek durumdaysa balya sıkışmaz.', en: 'Check the side pressure arms on the chamber.' },
                yap: { tr: 'Baskıyı kademe kademe artırın ve her kademede bir balya alıp elinizle deneyin.', en: 'Increase pressure step by step, testing a bale each time.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Kuyruk mili devri düşük', en: 'PTO revs are too low' },
                kontrol: { tr: 'Devir düştüğünde piston yeterli güçle vuramaz.', en: 'Low revs mean the plunger cannot strike hard enough.' },
                yap: { tr: 'Traktörü makinenin istediği devirde çalıştırın ve o devri koruyun.', en: 'Run the tractor at the specified PTO speed and hold it.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Ürün çok kuru ve kırılgan', en: 'The crop is too dry and brittle' },
                kontrol: { tr: 'Aşırı kuru saman sıkıştırıldığında geri açılır.', en: 'Over-dry straw springs back after compression.' },
                yap: { tr: 'Sabahın erken saatlerinde, çiy varken balyalayın. Bu bir arıza değil, ürünün durumudur.', en: 'Bale early while there is dew. This is not a fault but a crop condition.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: [],
          },
          {
            id: 'balya-yamuk',
            ad: { tr: 'Balya yamuk çıkıyor, bir kenarı kısa', en: 'Bales come out crooked, one side short' },
            sebepler: [
              {
                ad: { tr: 'Namlunun bir tarafı daha kalın', en: 'One side of the swath is heavier' },
                kontrol: { tr: 'Hep aynı kenar mı kısa kalıyor bakın; öyleyse sebep beslemededir.', en: 'If the same side is always short, the cause is in feeding.' },
                yap: { tr: 'Traktörü namluda sağa sola kaydırarak sürün; böylece iki taraf da eşit dolar.', en: 'Weave slightly along the swath so both sides fill evenly.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Yan baskı iki tarafta eşit değil', en: 'Side pressure is unequal' },
                kontrol: { tr: 'Kanalın iki yanındaki baskı kollarının ayarını karşılaştırın.', en: 'Compare the pressure arm settings on both sides.' },
                yap: { tr: 'İki tarafı eşitleyin. Tek taraf sıkıysa balya o tarafa doğru kısalır.', en: 'Equalise both sides; a tight side shortens the bale on that side.' },
                zorluk: 'orta',
              },
            ],
            parcalar: [],
          },
        ],
      },
      {
        id: 'piston-tahrik',
        ad: { tr: 'Piston, şaft ve tahrik', en: 'Plunger, shaft and drive' },
        aciklama: {
          tr: 'Makinenin gücü ileten bölümü',
          en: 'The parts that carry power through the machine',
        },
        belirtiler: [
          {
            id: 'piston-duruyor',
            ad: { tr: 'Piston duruyor, makine boşta dönüyor', en: 'The plunger stops while the machine keeps turning' },
            sebepler: [
              {
                ad: { tr: 'Emniyet pimi kesilmiş', en: 'The shear pin has sheared' },
                kontrol: { tr: 'Volan tarafındaki pime bakın; kesilmişse iki parça hâlinde durur.', en: 'Check the pin at the flywheel; a sheared pin sits in two pieces.' },
                yap: { tr: 'Önce tıkanmanın sebebini giderin, sonra yeni pim takın. Sebebi bulmadan pim takarsanız yenisi de kesilir.', en: 'Clear the blockage first, then fit a new pin, or it will shear again.' },
                zorluk: 'orta',
              },
              {
                ad: { tr: 'Kanalda yabancı madde var', en: 'Foreign object in the channel' },
                kontrol: { tr: 'Tarladan taş, demir parçası veya kalın dal girmiş olabilir.', en: 'A stone, piece of metal or thick branch may have entered.' },
                yap: { tr: 'Makineyi tamamen durdurup kanalı boşaltın. Elinizi asla çalışır makinenin kanalına sokmayın.', en: 'Stop the machine completely and clear the channel. Never reach in while it runs.' },
                zorluk: 'orta',
              },
            ],
            parcalar: ['Emniyet pimi'],
          },
          {
            id: 'ses-titresim',
            ad: { tr: 'Makine ses yapıyor veya titriyor', en: 'The machine is noisy or vibrating' },
            sebepler: [
              {
                ad: { tr: 'Cıvata veya somun gevşemiş', en: 'A bolt or nut has worked loose' },
                kontrol: { tr: 'Makinenin etrafını dolaşıp gözle bakın; gevşeyen cıvatanın çevresinde parlak sürtme izi olur.', en: 'Walk around the machine; a loose bolt leaves a shiny rub mark.' },
                yap: { tr: 'Gevşeyenleri sıkın. Titreşim kendi kendini büyütür: gevşeyen parça diğerlerini de gevşetir.', en: 'Tighten them. Vibration feeds itself and loosens neighbouring fasteners.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Yatak aşınmış veya yağsız kalmış', en: 'A bearing is worn or dry' },
                kontrol: { tr: 'Makine durduktan hemen sonra yatakları elinizle yoklayın; biri diğerlerinden sıcaksa odur.', en: 'Right after stopping, feel the bearings; the hot one is the culprit.' },
                yap: { tr: 'Gres verin. Isınma devam ediyorsa yatak değişmeli; sıcak yatak kısa sürede dağılır.', en: 'Grease it. If it still runs hot the bearing must be replaced.' },
                zorluk: 'orta',
              },
              {
                ad: { tr: 'Mafsal veya şaft dengesiz dönüyor', en: 'The PTO shaft is running out of balance' },
                kontrol: { tr: 'Şaftın koruma kapağı kırık veya mafsalda boşluk varsa titreşim buradan gelir.', en: 'A broken guard or play in the joint shows up as vibration.' },
                yap: { tr: 'Şaftı çalıştırmadan kontrol ettirin. Kırık koruma kapağıyla asla çalışmayın.', en: 'Have the shaft checked. Never work with a broken guard.' },
                zorluk: 'servis',
              },
            ],
            parcalar: ['Yatak', 'Mafsal koruma kapağı'],
          },
          {
            id: 'makine-zorlaniyor',
            ad: { tr: 'Makine zorlanıyor, traktör bunalıyor', en: 'The machine labours and the tractor bogs down' },
            sebepler: [
              {
                ad: { tr: 'Balya fazla sıkı ayarlanmış', en: 'Bale density is set too high' },
                kontrol: { tr: 'Zorlanma sıkıştırma ayarını artırdıktan sonra mı başladı?', en: 'Did the problem start after raising the density setting?' },
                yap: { tr: 'Sıkıştırmayı bir kademe azaltın.', en: 'Back the density off one step.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Bir yerde sürtme veya tıkanma var', en: 'Something is rubbing or partly blocked' },
                kontrol: { tr: 'Makineyi boşta çalıştırın; yüksüzken de zorlanıyorsa sorun makinededir.', en: 'Run it empty; if it still labours, the fault is in the machine.' },
                yap: { tr: 'Kanalı ve hareketli parçaları temizleyin, gres noktalarının tamamına gres verin.', en: 'Clean the channel and moving parts, and grease every point.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Traktör gücü makineye yetmiyor', en: 'The tractor is underpowered for this machine' },
                kontrol: { tr: 'Makinenin istediği asgari beygir gücünü Makineler ekranından görebilirsiniz.', en: 'The minimum power requirement is on the machine page.' },
                yap: { tr: 'Kalın namluda hızı düşürün. Sürekli zorlanma hem traktöre hem makineye zarar verir.', en: 'Slow down in heavy swaths. Constant strain damages both machines.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: [],
          },
        ],
      },
    ],
  },

  /* ============================================================ RULO BALYA */
  rulo: {
    ad: { tr: 'Rulo balya makinası', en: 'Round baler' },
    bolumler: [
      {
        id: 'pikap',
        ad: { tr: 'Pikap ve besleme', en: 'Pickup and feeding' },
        aciklama: {
          tr: 'Ürünü yerden alan bölüm',
          en: 'The section that lifts the crop',
        },
        belirtiler: [
          {
            id: 'pikap-toplamiyor',
            ad: { tr: 'Pikap ürünü tam almıyor', en: 'The pickup misses crop' },
            sebepler: [
              {
                ad: { tr: 'Pikap yüksekliği yanlış', en: 'Pickup height is wrong' },
                kontrol: { tr: 'Parmaklar toprağa değmemeli ama ürünün altına girmeli.', en: 'The tines must clear the soil yet reach under the crop.' },
                yap: { tr: 'Destek tekerleğinden yüksekliği ayarlayın.', en: 'Set the height at the gauge wheel.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Kırık pikap parmağı var', en: 'Broken pickup tines' },
                kontrol: { tr: 'Pikabı elle çevirip eksik parmak arayın.', en: 'Turn the pickup by hand and look for missing tines.' },
                yap: { tr: 'Kırık parmakları değiştirin.', en: 'Replace the broken tines.' },
                zorluk: 'orta',
              },
            ],
            parcalar: ['Pikap parmağı'],
          },
          {
            id: 'yabanci-madde',
            ad: { tr: 'Makineye taş veya yabancı madde girdi', en: 'A stone or foreign object has entered' },
            sebepler: [
              {
                ad: { tr: 'Tarlada taş veya demir parçası var', en: 'There is stone or metal in the field' },
                kontrol: { tr: 'Ses ve titreşim aniden başladıysa yabancı madde girmiş olabilir.', en: 'A sudden noise and vibration points to a foreign object.' },
                yap: { tr: 'Makineyi hemen durdurun, kuyruk milini kapatın ve odayı boşaltın. Çalışmaya devam etmek merdaneye zarar verir.', en: 'Stop at once, disengage the PTO and clear the chamber before more damage is done.' },
                zorluk: 'orta',
              },
            ],
            parcalar: [],
          },
        ],
      },
      {
        id: 'balya-odasi',
        ad: { tr: 'Balya odası ve sıkıştırma', en: 'Bale chamber and density' },
        aciklama: {
          tr: 'Balyayı yuvarlayan ve sıkıştıran bölüm',
          en: 'The section that rolls and compresses the bale',
        },
        belirtiler: [
          {
            id: 'balya-sekil-almiyor',
            ad: { tr: 'Balya düzgün yuvarlanmıyor, şekil almıyor', en: 'The bale does not roll into shape' },
            sebepler: [
              {
                ad: { tr: 'Sabit hatta sürülüyor', en: 'Driving in a straight line only' },
                kontrol: { tr: 'Balyanın hep aynı tarafı mı dolu kalıyor?', en: 'Is the same side always fuller?' },
                yap: { tr: 'Namlu üzerinde sağa sola kayarak sürün. Rulo balyada bu bir sürüş tekniğidir, arıza değil.', en: 'Weave across the swath. In round baling this is technique, not a fault.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Kayış gerginliği düşmüş', en: 'Belt tension has dropped' },
                kontrol: { tr: 'Kayışlar gevşekse balya odada kaymaya başlar.', en: 'Loose belts let the bale slip in the chamber.' },
                yap: { tr: 'Gerginliği ayarlayın; kayışlardan biri diğerlerinden gevşekse tamamını kontrol ettirin.', en: 'Adjust the tension; if one belt is looser than the rest have them all checked.' },
                zorluk: 'orta',
              },
              {
                ad: { tr: 'Ürün odaya düzensiz giriyor', en: 'Crop enters the chamber unevenly' },
                kontrol: { tr: 'Namlunun kalınlığı boyunca değişiyor olabilir.', en: 'The swath thickness may vary along its length.' },
                yap: { tr: 'Namluyu tırmıkla düzeltin ve hızı sabit tutun.', en: 'Even the swath and keep a steady speed.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: ['Kayış', 'Merdane yatağı'],
          },
          {
            id: 'balya-cikmiyor',
            ad: { tr: 'Balya odadan çıkmıyor veya çıkışta sıkışıyor', en: 'The bale will not leave the chamber' },
            sebepler: [
              {
                ad: { tr: 'Kapak tam açılmıyor', en: 'The tailgate does not open fully' },
                kontrol: { tr: 'Hidrolik basınç yeterli mi, hortumlarda kaçak var mı bakın.', en: 'Check hydraulic pressure and look for leaking hoses.' },
                yap: { tr: 'Hidrolik bağlantıyı ve yağ seviyesini kontrol edin.', en: 'Check the hydraulic connection and oil level.' },
                zorluk: 'orta',
              },
              {
                ad: { tr: 'Balya fazla sıkı', en: 'The bale is too dense' },
                kontrol: { tr: 'Sıkıştırma ayarı yüksekse balya odadan zor çıkar.', en: 'A high density setting makes the bale hard to eject.' },
                yap: { tr: 'Sıkıştırmayı bir kademe azaltın.', en: 'Reduce density one step.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: [],
          },
        ],
      },
      {
        id: 'file',
        ad: { tr: 'File veya ip sarma', en: 'Net or twine wrapping' },
        aciklama: {
          tr: 'Balyanın etrafını saran bölüm',
          en: 'The section that wraps the finished bale',
        },
        belirtiler: [
          {
            id: 'file-sarilmiyor',
            ad: { tr: 'File hiç sarılmıyor veya geç başlıyor', en: 'The net does not feed, or starts late' },
            sebepler: [
              {
                ad: { tr: 'File yolu tozla ve eski file artığıyla dolmuş', en: 'The net path is clogged with dust and old net' },
                kontrol: { tr: 'Besleme merdanelerine ve bıçak bölgesine bakın.', en: 'Look at the feed rollers and the knife area.' },
                yap: { tr: 'Her gün basınçlı havayla temizleyin. File sorunlarının çoğu buradan çıkar.', en: 'Blow it clean daily; most net problems start here.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'File rulosu yanlış takılmış', en: 'The net roll is fitted the wrong way' },
                kontrol: { tr: 'Filenin sarım yönü ve geçtiği yol makinedeki şemayla aynı olmalı.', en: 'The unwind direction and path must match the diagram.' },
                yap: { tr: 'Ruloyu şemaya göre yeniden takın.', en: 'Refit the roll following the diagram.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Besleme yayı zayıflamış', en: 'The feed spring has weakened' },
                kontrol: { tr: 'Yay file rulosunu merdaneye yeterince bastırmıyorsa file tutunamaz.', en: 'A weak spring cannot press the roll onto the feed roller.' },
                yap: { tr: 'Yayı ayarlayın veya değiştirin.', en: 'Adjust or replace the spring.' },
                zorluk: 'orta',
              },
            ],
            parcalar: ['File bıçağı', 'Besleme yayı', 'Kauçuk merdane'],
          },
          {
            id: 'file-kesilmiyor',
            ad: { tr: 'File sarılıyor ama temiz kesilmiyor', en: 'The net wraps but does not cut cleanly' },
            sebepler: [
              {
                ad: { tr: 'File bıçağı körelmiş', en: 'The net knife is blunt' },
                kontrol: { tr: 'Kesik kenarı düzgün değil, lif lif kalıyorsa bıçak körelmiştir.', en: 'A ragged cut edge means a blunt knife.' },
                yap: { tr: 'Bıçağı sezon başında değiştirin. Kör bıçak hem kesmez hem fileyi merdaneye dolar.', en: 'Replace the knife at the start of the season; a blunt one wraps net onto the roller.' },
                zorluk: 'orta',
              },
              {
                ad: { tr: 'Kalitesiz file kullanılıyor', en: 'Poor quality net is being used' },
                kontrol: { tr: 'İnce ve kolay yırtılan file sap arasında dağılır.', en: 'Thin net shreds among the stalks.' },
                yap: { tr: 'Makineye uygun kalitede file kullanın.', en: 'Use net of the specified quality.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: ['File bıçağı'],
          },
        ],
      },
    ],
  },
  /* ============================================================ YEM KARMA */
  yem: {
    ad: { tr: 'Yem karma makinası', en: 'Feed mixer' },
    bolumler: [
      {
        id: 'karistirma',
        ad: { tr: 'Karıştırma ve helezon', en: 'Mixing and auger' },
        aciklama: {
          tr: 'Yemi karıştıran bölüm',
          en: 'The section that mixes the ration',
        },
        belirtiler: [
          {
            id: 'karisim-homojen-degil',
            ad: { tr: 'Karışım homojen olmuyor, yem katman katman kalıyor', en: 'The ration does not mix evenly' },
            sebepler: [
              {
                ad: { tr: 'Karıştırma süresi kısa', en: 'Mixing time is too short' },
                kontrol: { tr: 'Son malzeme girdikten sonra kaç dakika karıştırdığınıza bakın.', en: 'Check how long you mix after the last ingredient goes in.' },
                yap: { tr: 'Son malzemeden sonra karıştırmayı sürdürün. Erken boşaltılan karışım hayvana eşit gitmez.', en: 'Keep mixing after the final ingredient; an under-mixed ration feeds unevenly.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Malzemeler yanlış sırayla yükleniyor', en: 'Ingredients are loaded in the wrong order' },
                kontrol: { tr: 'Kaba yem ile kesif yemin yükleme sırası karışımı doğrudan etkiler.', en: 'The order of forage and concentrate changes the result.' },
                yap: { tr: 'Önce uzun lifli kaba yemi, sonra kesif yemi, en son sıvıları yükleyin.', en: 'Load long forage first, then concentrate, and liquids last.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Makine kapasitesinin üzerinde dolduruluyor', en: 'The mixer is overfilled' },
                kontrol: { tr: 'Yem kazanın üst kenarına yaklaşıyorsa helezon karıştıramaz.', en: 'If the load reaches the tub rim the auger cannot turn it over.' },
                yap: { tr: 'Doluluğu azaltın. Aşırı yük hem karışımı bozar hem şanzımanı yorar.', en: 'Reduce the load; overfilling spoils the mix and strains the gearbox.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Helezon kenarındaki sıyırıcı aşınmış', en: 'The auger plow blade is worn' },
                kontrol: { tr: 'Helezonun arkasındaki sıyırıcı ile kazan duvarı arasındaki boşluğa bakın; açılmışsa yem dipte kalır.', en: 'Check the gap between the plow blade and the tub wall; a wide gap leaves feed at the bottom.' },
                yap: { tr: 'Sıyırıcıyı değiştirin veya boşluğu ayarlatın.', en: 'Replace the blade or have the clearance reset.' },
                zorluk: 'servis',
              },
            ],
            parcalar: ['Helezon sıyırıcısı', 'Helezon bıçağı'],
          },
          {
            id: 'yem-dipte-kaliyor',
            ad: { tr: 'Boşaltmada yemin bir kısmı kazanda kalıyor', en: 'Some feed stays in the tub after unloading' },
            sebepler: [
              {
                ad: { tr: 'Sıyırıcı aşınmış', en: 'The plow blade is worn' },
                kontrol: { tr: 'Kazan dibinde her seferinde aynı miktarda yem kalıyorsa sebep budur.', en: 'The same amount left each time points to the blade.' },
                yap: { tr: 'Sıyırıcıyı değiştirin.', en: 'Replace the blade.' },
                zorluk: 'servis',
              },
              {
                ad: { tr: 'Boşaltma kapağı tam açılmıyor', en: 'The discharge door does not open fully' },
                kontrol: { tr: 'Kapağın hidroliğini ve mekanizmasını gözle kontrol edin.', en: 'Inspect the door hydraulics and linkage.' },
                yap: { tr: 'Mekanizmayı temizleyip gres verin, hidrolik kaçak varsa giderin.', en: 'Clean and grease the linkage; fix any hydraulic leak.' },
                zorluk: 'orta',
              },
            ],
            parcalar: ['Helezon sıyırıcısı'],
          },
        ],
      },
      {
        id: 'bicak',
        ad: { tr: 'Bıçaklar ve kesme', en: 'Knives and chopping' },
        aciklama: {
          tr: 'Kaba yemi kesen bıçaklar',
          en: 'The knives that cut long forage',
        },
        belirtiler: [
          {
            id: 'kesmiyor',
            ad: { tr: 'Balya açılmıyor, uzun sap karışıma girmiyor', en: 'Bales do not break up, long stalks remain' },
            sebepler: [
              {
                ad: { tr: 'Bıçaklar körelmiş', en: 'The knives are blunt' },
                kontrol: { tr: 'Bıçak ağızlarını gözle kontrol edin; parlak ve yuvarlak hâle geldiyse körelmiştir.', en: 'Blunt knives look rounded and shiny at the edge.' },
                yap: { tr: 'Bıçakları değiştirin. Kör bıçak kesmez, yemi sürükler ve şanzımanı zorlar.', en: 'Replace them; blunt knives drag the feed and strain the gearbox.' },
                zorluk: 'orta',
              },
              {
                ad: { tr: 'Bıçak sayısı yetersiz', en: 'Not enough knives fitted' },
                kontrol: { tr: 'Bazı bıçak yuvaları boş olabilir.', en: 'Some knife holders may be empty.' },
                yap: { tr: 'Eksik bıçakları tamamlayın; boş yuva kesme kalitesini doğrudan düşürür.', en: 'Fit the missing knives; empty holders cut quality directly.' },
                zorluk: 'orta',
              },
            ],
            parcalar: ['Helezon bıçağı'],
          },
        ],
      },
      {
        id: 'tarti',
        ad: { tr: 'Tartı sistemi', en: 'Weighing system' },
        aciklama: {
          tr: 'Yükü tartan göstergeler',
          en: 'The load cells and display',
        },
        belirtiler: [
          {
            id: 'tarti-yanlis',
            ad: { tr: 'Tartı yanlış gösteriyor veya hiç değişmiyor', en: 'The scale reads wrong or does not change' },
            sebepler: [
              {
                ad: { tr: 'Makine düz zeminde değil', en: 'The machine is not on level ground' },
                kontrol: { tr: 'Eğimli zeminde tartı her zaman yanıltır.', en: 'On a slope the reading is always off.' },
                yap: { tr: 'Yüklemeyi düz zeminde yapın.', en: 'Load on level ground.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Yük hücresi kablosu zedelenmiş', en: 'A load cell cable is damaged' },
                kontrol: { tr: 'Kabloları gözle takip edin; ezilme veya kopma arayın.', en: 'Follow the cables looking for crushing or breaks.' },
                yap: { tr: 'Zedelenmiş kabloyu servise gösterin. Kendiniz eklemeyin, ölçüm bozulur.', en: 'Show damaged cable to service; a home splice ruins accuracy.' },
                zorluk: 'servis',
              },
              {
                ad: { tr: 'Gösterge sıfırlanmamış', en: 'The display was not zeroed' },
                kontrol: { tr: 'Boş makinede gösterge sıfır göstermeli.', en: 'With an empty tub the display should read zero.' },
                yap: { tr: 'Her yüklemeden önce sıfırlayın.', en: 'Zero the scale before each load.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: [],
          },
        ],
      },
    ],
  },

  /* ================================================================= SİLAJ */
  silaj: {
    ad: { tr: 'Silaj ve paketleme makinası', en: 'Forage and wrapping machine' },
    bolumler: [
      {
        id: 'kesme',
        ad: { tr: 'Kesme ve doğrama', en: 'Cutting and chopping' },
        aciklama: {
          tr: 'Ürünü kesip doğrayan bölüm',
          en: 'The section that cuts and chops',
        },
        belirtiler: [
          {
            id: 'kesim-uzun',
            ad: { tr: 'Doğrama boyu uzun, düzensiz kesiyor', en: 'Chop length is long and uneven' },
            sebepler: [
              {
                ad: { tr: 'Bıçaklar körelmiş', en: 'The knives are blunt' },
                kontrol: { tr: 'Bıçak ağızlarına bakın; kör bıçak keser gibi görünse de ürünü yırtar.', en: 'Blunt knives tear rather than cut.' },
                yap: { tr: 'Bıçakları bileyin veya değiştirin. Silajda kesim boyu fermantasyonu doğrudan etkiler.', en: 'Sharpen or replace them; chop length drives fermentation quality.' },
                zorluk: 'orta',
              },
              {
                ad: { tr: 'Bıçak ile karşı bıçak arası açılmış', en: 'The knife to shear bar gap has opened' },
                kontrol: { tr: 'Aradaki boşluk arttıkça kesim bozulur.', en: 'A wider gap gives a poorer cut.' },
                yap: { tr: 'Boşluğu kataloğa göre ayarlatın; bu ölçülü bir iştir.', en: 'Have the gap reset to specification; this is a measured job.' },
                zorluk: 'servis',
              },
              {
                ad: { tr: 'İlerleme hızı fazla', en: 'Ground speed is too high' },
                kontrol: { tr: 'Hız arttıkça makineye giren ürün artar, kesim boyu uzar.', en: 'Higher speed means more crop per cut and longer chop.' },
                yap: { tr: 'Hızı düşürün, kuyruk mili devrini koruyun.', en: 'Slow down while keeping PTO revs up.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: ['Silaj bıçağı', 'Karşı bıçak'],
          },
          {
            id: 'tikaniyor',
            ad: { tr: 'Makine sık sık tıkanıyor', en: 'The machine blocks frequently' },
            sebepler: [
              {
                ad: { tr: 'Ürün fazla nemli', en: 'The crop is too wet' },
                kontrol: { tr: 'Nem yüksekse ürün kesici bölgede yapışır.', en: 'Wet crop sticks in the cutting area.' },
                yap: { tr: 'Ürünü biraz soldurup öyle toplayın.', en: 'Let the crop wilt before harvesting.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Kuyruk mili devri düşük', en: 'PTO revs are too low' },
                kontrol: { tr: 'Devir düşükse atma gücü azalır ve boru tıkanır.', en: 'Low revs reduce throwing force and block the spout.' },
                yap: { tr: 'Traktörü tam devirde çalıştırın; hızı devirden değil vitesten düşürün.', en: 'Run at full PTO speed and reduce ground speed by gear, not revs.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: [],
          },
        ],
      },
      {
        id: 'atma',
        ad: { tr: 'Atma borusu', en: 'Discharge spout' },
        aciklama: {
          tr: 'Doğranmış ürünü römorka atan bölüm',
          en: 'The spout that throws chopped crop to the trailer',
        },
        belirtiler: [
          {
            id: 'boru-tikaniyor',
            ad: { tr: 'Atma borusu tıkanıyor veya ürün yeterince uzağa gitmiyor', en: 'The spout blocks or does not throw far enough' },
            sebepler: [
              {
                ad: { tr: 'Boru içinde ürün birikmiş', en: 'Crop has built up inside the spout' },
                kontrol: { tr: 'Nemli ürün boru iç yüzeyine yapışarak kesiti daraltır.', en: 'Damp crop coats the inside and narrows the passage.' },
                yap: { tr: 'Makineyi durdurup boruyu temizleyin.', en: 'Stop the machine and clean the spout.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Fan kanadı aşınmış', en: 'The blower paddles are worn' },
                kontrol: { tr: 'Kanat uçları aşındıkça atma gücü düşer.', en: 'Worn paddle tips lose throwing power.' },
                yap: { tr: 'Kanatları değiştirtin.', en: 'Have the paddles replaced.' },
                zorluk: 'servis',
              },
            ],
            parcalar: ['Fan kanadı'],
          },
        ],
      },
      {
        id: 'paketleme',
        ad: { tr: 'Balya sarma ve paketleme', en: 'Bale wrapping' },
        aciklama: {
          tr: 'Balyayı streç filmle saran bölüm',
          en: 'The section that wraps bales in film',
        },
        belirtiler: [
          {
            id: 'strec-yirtiliyor',
            ad: { tr: 'Streç film yırtılıyor veya kopuyor', en: 'The film tears or breaks' },
            sebepler: [
              {
                ad: { tr: 'Germe ayarı fazla', en: 'Pre-stretch is set too high' },
                kontrol: { tr: 'Film gerdirme merdanelerinden çıkarken zorlanıyorsa ayar yüksektir.', en: 'If the film strains leaving the rollers the setting is too high.' },
                yap: { tr: 'Germe ayarını azaltın.', en: 'Reduce the stretch setting.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Balyanın dışında keskin sap ucu var', en: 'Sharp stalk ends stick out of the bale' },
                kontrol: { tr: 'Balya yüzeyi tüylü ve dikenliyse film delinir.', en: 'A bristly bale surface punctures the film.' },
                yap: { tr: 'Balyayı biraz daha sıkı bağlayın; düzgün yüzeyli balya daha az film yırtar.', en: 'Bale a little tighter; a smoother bale tears less film.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Merdanede film artığı birikmiş', en: 'Film residue has built up on the rollers' },
                kontrol: { tr: 'Merdane yüzeyini elinizle yoklayın; yapışkan artık filmi çeker.', en: 'Feel the roller surface; sticky residue drags the film.' },
                yap: { tr: 'Merdaneleri temizleyin.', en: 'Clean the rollers.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: ['Gerdirme merdanesi'],
          },
          {
            id: 'sarim-eksik',
            ad: { tr: 'Sarım eksik kalıyor, balyanın bir yeri açıkta', en: 'Wrapping is incomplete, part of the bale is exposed' },
            sebepler: [
              {
                ad: { tr: 'Tur sayısı az ayarlanmış', en: 'Too few wraps are set' },
                kontrol: { tr: 'Silajda film katman sayısı hava almayı engelleyecek kadar olmalı.', en: 'Silage needs enough layers to keep air out.' },
                yap: { tr: 'Tur sayısını artırın. Eksik sarım balyanın bozulmasına yol açar.', en: 'Increase the wrap count; under-wrapped bales spoil.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Balya masada ortalanmamış', en: 'The bale is not centred on the table' },
                kontrol: { tr: 'Balya bir kenara kaymışsa o taraf açıkta kalır.', en: 'An off-centre bale leaves one side bare.' },
                yap: { tr: 'Balyayı masaya ortalayarak yükleyin.', en: 'Load the bale centred on the table.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: [],
          },
        ],
      },
    ],
  },

  /* ============================================================ ÇAYIR VE OT */
  cayir: {
    ad: { tr: 'Çayır biçme ve ot toplama', en: 'Mowing and raking' },
    bolumler: [
      {
        id: 'bicme',
        ad: { tr: 'Biçme kalitesi', en: 'Cutting quality' },
        aciklama: {
          tr: 'Biçilen tarlanın görünüşüyle ilgili sorunlar',
          en: 'Problems with how the cut field looks',
        },
        belirtiler: [
          {
            id: 'serit-kaliyor',
            ad: { tr: 'Arkada biçilmemiş şerit kalıyor', en: 'Uncut strips are left behind' },
            sebepler: [
              {
                ad: { tr: 'Bıçaklar körelmiş veya kırılmış', en: 'Blades are blunt or broken' },
                kontrol: { tr: 'Diskleri tek tek dönderip bıçakları sayın; eksik veya kırık olan hemen görünür.', en: 'Turn each disc and count the blades; a missing one shows at once.' },
                yap: { tr: 'Bıçakları değiştirin. Bir diskteki eksik bıçak arkada şerit bırakır.', en: 'Replace the blades; one missing blade leaves a strip.' },
                zorluk: 'orta',
              },
              {
                ad: { tr: 'İlerleme hızı fazla', en: 'Ground speed is too high' },
                kontrol: { tr: 'Hız arttıkça otun bir kısmı bıçak değmeden yatar.', en: 'At speed some grass lies down before the blade reaches it.' },
                yap: { tr: 'Hızı düşürün.', en: 'Slow down.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Makine yere paralel değil', en: 'The machine is not parallel to the ground' },
                kontrol: { tr: 'Bir taraf yüksek kalıyorsa o tarafta ot uzun kalır.', en: 'A high side leaves longer grass on that side.' },
                yap: { tr: 'Üç nokta askı kollarını eşitleyin.', en: 'Level the three-point linkage arms.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: ['Biçme bıçağı', 'Bıçak cıvatası'],
          },
          {
            id: 'kesim-yuksek',
            ad: { tr: 'Anız çok yüksek veya çok alçak kalıyor', en: 'The stubble is too high or too low' },
            sebepler: [
              {
                ad: { tr: 'Kesim yüksekliği yanlış ayarlanmış', en: 'Cutting height is set wrong' },
                kontrol: { tr: 'Askı kollarının yüksekliğine ve makinenin eğimine bakın.', en: 'Check linkage height and the machine tilt.' },
                yap: { tr: 'Yüksekliği ayarlayın. Çok alçak kesim hem toprak alır hem otun yeniden sürmesini geciktirir.', en: 'Set the height; cutting too low picks up soil and slows regrowth.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: [],
          },
        ],
      },
      {
        id: 'tirmik',
        ad: { tr: 'Tırmık ve ot toplama', en: 'Rake and swath forming' },
        aciklama: {
          tr: 'Otu namluya toplayan bölüm',
          en: 'The section that gathers grass into a swath',
        },
        belirtiler: [
          {
            id: 'namlu-duzensiz',
            ad: { tr: 'Namlu düzensiz oluyor, ot dağınık kalıyor', en: 'The swath is uneven and grass is scattered' },
            sebepler: [
              {
                ad: { tr: 'Tırmık yüksekliği yanlış', en: 'Rake height is wrong' },
                kontrol: { tr: 'Parmaklar toprağa değiyorsa toprak alır, yüksekse ot bırakır.', en: 'Tines touching soil pick up dirt; too high and grass is left.' },
                yap: { tr: 'Yüksekliği parmaklar otu sıyıracak, toprağa değmeyecek şekilde ayarlayın.', en: 'Set the tines to sweep the grass without touching soil.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Kırık tırmık parmağı var', en: 'Broken rake tines' },
                kontrol: { tr: 'Kolları elle çevirip eksik parmak arayın.', en: 'Turn the arms and look for missing tines.' },
                yap: { tr: 'Kırık parmakları değiştirin.', en: 'Replace the broken tines.' },
                zorluk: 'orta',
              },
              {
                ad: { tr: 'Dönüş hızı ilerleme hızına uymuyor', en: 'Rotor speed does not match ground speed' },
                kontrol: { tr: 'Çok hızlı dönen tırmık otu savurur, yavaş dönen toplayamaz.', en: 'Too fast throws the grass; too slow leaves it.' },
                yap: { tr: 'Kuyruk mili devrini ve ilerleme hızını dengeleyin.', en: 'Balance PTO revs against ground speed.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: ['Tırmık parmağı'],
          },
        ],
      },
    ],
  },

  /* ======================================================== TOPRAK İŞLEME */
  toprak: {
    ad: { tr: 'Toprak işleme makinası', en: 'Soil tillage machine' },
    bolumler: [
      {
        id: 'isleme',
        ad: { tr: 'İşleme derinliği ve kalitesi', en: 'Working depth and quality' },
        aciklama: {
          tr: 'İşlenen toprağın durumuyla ilgili sorunlar',
          en: 'Problems with how the soil turns out',
        },
        belirtiler: [
          {
            id: 'derinlik-yetersiz',
            ad: { tr: 'Makine toprağa yeterince girmiyor', en: 'The machine will not work deep enough' },
            sebepler: [
              {
                ad: { tr: 'Derinlik ayarı yanlış', en: 'Depth setting is wrong' },
                kontrol: { tr: 'Arka kapak veya destek tekerleği ayarına bakın.', en: 'Check the rear hood or gauge wheel setting.' },
                yap: { tr: 'Ayarı kademe kademe indirin ve her kademede kontrol edin.', en: 'Lower the setting step by step and check each time.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Bıçaklar aşınmış', en: 'The blades are worn' },
                kontrol: { tr: 'Bıçak uçları yuvarlanmış ve kısalmışsa toprağa girmez.', en: 'Rounded, shortened blade tips cannot penetrate.' },
                yap: { tr: 'Bıçakları değiştirin. Aşınmış bıçak hem derine inmez hem yakıt tüketimini artırır.', en: 'Replace them; worn blades also raise fuel use.' },
                zorluk: 'orta',
              },
              {
                ad: { tr: 'Toprak fazla kuru ve sert', en: 'The soil is too dry and hard' },
                kontrol: { tr: 'Kuru toprakta rotor derine inmek yerine yüzeyde zıplar.', en: 'In dry ground the rotor skips rather than digs.' },
                yap: { tr: 'Toprak tavında iken işleyin. Bu bir arıza değil, zamanlama meselesidir.', en: 'Work the soil when it is in good condition; this is timing, not a fault.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: ['Rotovatör bıçağı'],
          },
          {
            id: 'toprak-iri',
            ad: { tr: 'Toprak iri kalıyor, kesekler dağılmıyor', en: 'The soil stays cloddy' },
            sebepler: [
              {
                ad: { tr: 'İlerleme hızı fazla', en: 'Ground speed is too high' },
                kontrol: { tr: 'Hız arttıkça rotor toprağı daha az sayıda keser.', en: 'At speed the rotor cuts the soil fewer times.' },
                yap: { tr: 'Hızı düşürün; toprak inceliği doğrudan hızla ilgilidir.', en: 'Slow down; fineness depends directly on speed.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Arka kapak açık', en: 'The rear hood is raised' },
                kontrol: { tr: 'Kapak toprağı bıçaklara geri iterek parçalanmayı artırır.', en: 'The hood pushes soil back onto the blades to break it up.' },
                yap: { tr: 'Kapağı indirin.', en: 'Lower the hood.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: [],
          },
        ],
      },
      {
        id: 'rotor',
        ad: { tr: 'Rotor ve şanzıman', en: 'Rotor and gearbox' },
        aciklama: {
          tr: 'Bıçakları döndüren bölüm',
          en: 'The parts that drive the blades',
        },
        belirtiler: [
          {
            id: 'ses-titresim',
            ad: { tr: 'Ses veya titreşim var', en: 'There is noise or vibration' },
            sebepler: [
              {
                ad: { tr: 'Bıçaklar dengesiz aşınmış veya eksik', en: 'Blades are unevenly worn or missing' },
                kontrol: { tr: 'Rotoru çevirip bıçakları sayın; bir bıçağın eksikliği rotoru dengesizleştirir.', en: 'Turn the rotor and count the blades; one missing unbalances it.' },
                yap: { tr: 'Eksik ve aşırı aşınmış bıçakları karşılıklı olarak değiştirin.', en: 'Replace missing and badly worn blades in opposite pairs.' },
                zorluk: 'orta',
              },
              {
                ad: { tr: 'Şanzıman yağı azalmış', en: 'Gearbox oil is low' },
                kontrol: { tr: 'Yağ seviye göstergesine veya tapasına bakın.', en: 'Check the sight glass or filler plug.' },
                yap: { tr: 'Yağı tamamlayın. Yağsız çalışan şanzıman kısa sürede döküm olur.', en: 'Top up the oil; a dry gearbox fails quickly.' },
                zorluk: 'orta',
              },
              {
                ad: { tr: 'Bıçak cıvataları gevşemiş', en: 'Blade bolts have loosened' },
                kontrol: { tr: 'Cıvataları tek tek yoklayın.', en: 'Check every bolt.' },
                yap: { tr: 'Gevşeyenleri sıkın; her çalışma gününün başında kontrol edin.', en: 'Tighten them and check at the start of each working day.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: ['Rotovatör bıçağı', 'Bıçak cıvatası'],
          },
        ],
      },
    ],
  },

  /* ================================================================ GENEL

     Kendi grubu olmayan ya da makinesini henüz seçmemiş kullanıcı için.
     Buradaki maddeler bütün makinelerde ortak. */
  genel: {
    ad: { tr: 'Her makinede ortak', en: 'Common to every machine' },
    bolumler: [
      {
        id: 'baglanti',
        ad: { tr: 'Traktöre bağlantı ve kuyruk mili', en: 'Hitching and PTO' },
        aciklama: {
          tr: 'Makineyi traktöre bağlayan parçalar',
          en: 'The parts that connect machine and tractor',
        },
        belirtiler: [
          {
            id: 'saft-sorunu',
            ad: { tr: 'Kuyruk mili şaftı ses yapıyor veya ısınıyor', en: 'The PTO shaft is noisy or running hot' },
            sebepler: [
              {
                ad: { tr: 'Mafsallar greslenmemiş', en: 'The joints have not been greased' },
                kontrol: { tr: 'Mafsal gres noktalarına bakın; kuru ve tozluysa gres verilmemiştir.', en: 'Dry, dusty grease points mean it has not been greased.' },
                yap: { tr: 'Her çalışma gününde mafsallara ve teleskobik boruya gres verin.', en: 'Grease the joints and the telescoping tube every working day.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Şaft boyu makineye uymuyor', en: 'The shaft length does not suit the machine' },
                kontrol: { tr: 'Dönüşlerde şaft dibe vuruyorsa uzundur; düz giderken ayrılma riski varsa kısadır.', en: 'Bottoming on turns means too long; risk of separating means too short.' },
                yap: { tr: 'Şaftı makineye göre kestirin. Yanlış boy hem şaftı hem traktörün kuyruk milini kırar.', en: 'Have the shaft cut to length; a wrong length breaks the shaft and the tractor PTO.' },
                zorluk: 'servis',
              },
            ],
            parcalar: ['Mafsal koruma kapağı', 'Kuyruk mili şaftı'],
          },
          {
            id: 'makine-egik',
            ad: { tr: 'Makine traktörün arkasında eğik duruyor', en: 'The machine sits crooked behind the tractor' },
            sebepler: [
              {
                ad: { tr: 'Askı kolları eşit ayarlanmamış', en: 'The lift arms are not level' },
                kontrol: { tr: 'İki yandaki askı kollarının uzunluğunu karşılaştırın.', en: 'Compare the length of both lift arms.' },
                yap: { tr: 'Kolları eşitleyin. Eğik makine tek taraflı aşınır ve iş kalitesini düşürür.', en: 'Level the arms; a crooked machine wears unevenly and works poorly.' },
                zorluk: 'kolay',
              },
            ],
            parcalar: [],
          },
        ],
      },
      {
        id: 'bakim',
        ad: { tr: 'Yağlama ve genel bakım', en: 'Lubrication and general upkeep' },
        aciklama: {
          tr: 'Her makinede aynı olan bakım işleri',
          en: 'Upkeep that applies to every machine',
        },
        belirtiler: [
          {
            id: 'yatak-isiniyor',
            ad: { tr: 'Bir yatak ısınıyor', en: 'A bearing is running hot' },
            sebepler: [
              {
                ad: { tr: 'Gres verilmemiş', en: 'It has not been greased' },
                kontrol: { tr: 'Makine durur durmaz yatakları elinizle yoklayın; sıcak olanı bulun.', en: 'Feel the bearings right after stopping to find the hot one.' },
                yap: { tr: 'Gres verin. Gres tabancasının ucunu her seferinde silin; toz gresle birlikte yatağa girer.', en: 'Grease it, wiping the nozzle first so dust does not go in with the grease.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Yatak aşınmış', en: 'The bearing is worn' },
                kontrol: { tr: 'Gres verdikten sonra da ısınıyorsa yatak bitmiştir.', en: 'Still hot after greasing means the bearing is finished.' },
                yap: { tr: 'Yatağı değiştirtin. Sıcak yatak çalışmaya devam ederse mili de bozar.', en: 'Have it replaced; a hot bearing will ruin the shaft too.' },
                zorluk: 'servis',
              },
            ],
            parcalar: ['Yatak'],
          },
          {
            id: 'civata-gevsiyor',
            ad: { tr: 'Cıvatalar sürekli gevşiyor', en: 'Bolts keep coming loose' },
            sebepler: [
              {
                ad: { tr: 'Sezon başında sıkma yapılmamış', en: 'No start-of-season retighten was done' },
                kontrol: { tr: 'Yeni veya uzun süre bekletilmiş makinede cıvatalar oturur ve gevşer.', en: 'On a new or long-idle machine, bolts settle and slacken.' },
                yap: { tr: 'İlk çalışma gününden sonra bütün cıvataları bir kez daha sıkın.', en: 'Retighten every bolt after the first working day.' },
                zorluk: 'kolay',
              },
              {
                ad: { tr: 'Titreşim kaynağı giderilmemiş', en: 'The source of vibration is still there' },
                kontrol: { tr: 'Hep aynı bölgedeki cıvatalar gevşiyorsa orada bir dengesizlik vardır.', en: 'Bolts loosening in one area point to imbalance there.' },
                yap: { tr: 'O bölgedeki yatak, bıçak ve dengeyi kontrol ettirin.', en: 'Have the bearings, blades and balance in that area checked.' },
                zorluk: 'servis',
              },
            ],
            parcalar: [],
          },
        ],
      },
    ],
  },
}
