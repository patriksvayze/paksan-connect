/* ==========================================================================
   Ürün adlarının ve açıklamalarının İngilizcesi

   MODEL ADLARI ÇEVRİLMEZ. "Süper Yunus" Almanya'da da Süper Yunus'tur;
   makinenin üstünde o yazıyor, yedek parça talebinde o aranıyor. Yalnız
   Türkçe harfler sadeleştirildi (Süper → Super, Yengeç → Yengec) çünkü
   yabancı müşteri "ç" ve "ü" harflerini yazamıyor, aradığını bulamıyor.
   Tür açıklamaları ise çevrildi.

   TERİMLER — tarım makineleri sektöründe yerleşik karşılıklar:
     balya makinesi   → baler
     prizmatik balya  → square baler (dünya piyasasında böyle geçiyor;
                        "prismatic" kimsenin kullanmadığı bir çeviri olur)
     rulo balya       → round baler
     yem karma        → feed mixer
     helezon          → auger
     çayır biçme      → disc mower
     ot toplama       → rake
     silaj paketleme  → bale wrapper
     toprak frezesi   → rotary tiller
     tesviye küreği   → land leveller
   ========================================================================== */

export const URUN_EN = {
  'orkinos-1270': { name: 'Orkinos 1270', tagline: 'Large square baler' },
  'orkinos-870': { name: 'Orkinos 870', tagline: 'Large square baler' },
  'orka-870': { name: 'Orka 870', tagline: 'Large square baler' },
  'albatros-870': { name: 'Albatros 870', tagline: 'Large square baler' },
  'super-yunus': { name: 'Super Yunus', tagline: 'Small square baler' },
  'super-yunus-dual2': {
    name: 'Super Yunus Dual 2',
    tagline: 'Small square baler, twin knotter',
  },
  'super-yunus-3yabali': {
    name: 'Super Yunus 3 Yabali',
    tagline: 'Small square baler, three-tine feeder',
  },
  'super-8002': { name: 'Super 8002', tagline: 'Small square baler' },
  'super-8002e': { name: 'Super 8002E', tagline: 'Small square baler (E series)' },
  'super-8002e-dual2': {
    name: 'Super 8002E Dual 2',
    tagline: 'Small square baler, twin knotter',
  },
  hammer: { name: 'Hammer', tagline: 'Small square baler' },
  'ipak-rulo': { name: 'i-Pak Round Baler', tagline: 'Round baler' },
  'diamond-dikey': {
    name: 'Diamond Vertical Feed Mixer',
    tagline: 'Vertical auger feed mixer',
  },
  'pelican-yatay': {
    name: 'Pelican Horizontal Feed Mixer',
    tagline: 'Horizontal auger feed mixer',
  },
  'scorpion-silaj': {
    name: 'Scorpion Forage Harvester',
    tagline: 'Row-independent forage harvester',
  },
  'silaj-paketleme': {
    name: 'Ahtapot Bale Wrapper',
    tagline: 'Bale wrapping machine',
  },
  'yengec-cayir': { name: 'Yengec Disc Mower', tagline: 'Disc mower' },
  'kirlangic-ot-toplama': { name: 'Kirlangic Rake', tagline: 'Hay rake' },
  rotovator: { name: 'Rotary Tiller', tagline: 'Rotary tiller' },
  'tesviye-kuregi': { name: 'Land Leveller', tagline: 'Land levelling blade' },
}

export const KATEGORI_EN = {
  'buyuk-balya': { name: 'Large Square Balers', short: 'Large Square' },
  'kucuk-balya': { name: 'Small Square Balers', short: 'Small Square' },
  'rulo-balya': { name: 'Round Balers', short: 'Round Baler' },
  'yem-karma': { name: 'Feed Mixers', short: 'Feed Mixer' },
  silaj: { name: 'Silage Equipment', short: 'Silage' },
  'cayir-ot': { name: 'Mowing and Raking', short: 'Mow & Rake' },
  toprak: { name: 'Soil Preparation', short: 'Soil' },
}

/* Teknik özellik ETİKETLERİ ve video başlıkları.

   Değerler ("120 x 70 cm", "min. 120 HP") çevrilmiyor — sayı ve birim
   her dilde aynı. Yalnız etiketler çevriliyor.

   Video başlıkları da çevriliyor; videoların kendisi henüz yok, gerçek
   linkler geldiğinde başlıklar da o videolara göre gözden geçirilmeli. */

export const SPEC_EN = {
  'Balya ölçüsü': 'Bale size',
  'Balya uzunluğu': 'Bale length',
  'Balya genişliği': 'Bale width',
  'Balya çapı': 'Bale diameter',
  'Düğüm atıcı': 'Knotters',
  'Pikap genişliği': 'Pickup width',
  'Net genişlik': 'Net width',
  'Balya ağırlığı': 'Bale weight',
  'Gerekli traktör gücü': 'Tractor power required',
  'Kuyruk mili devri': 'PTO speed',
  'Çalışma genişliği': 'Working width',
  'Çalışma tipi': 'Type of work',
  'Kesme boyu': 'Chop length',
  'Bıçak': 'Knives',
  'Bıçak tipi': 'Knife type',
  'Disk sayısı': 'Number of discs',
  'Helezon': 'Auger',
  'Hacim seçenekleri': 'Capacity options',
  'Tartı sistemi': 'Weighing system',
  'Boşaltma': 'Discharge',
  'Kumanda': 'Controls',
  'Şanzıman': 'Gearbox',
  'Film genişliği': 'Film width',
  'Sarma tipi': 'Wrapping type',
  'Parmak kolu sayısı': 'Number of tine arms',
  'Yaba sayısı': 'Number of forks',
  'Yükleme kepçesi': 'Loading bucket',
}

export const VIDEO_EN = {
  'Orkinos 1270 tanıtım': 'Orkinos 1270 overview',
  'Orkinos 870 tanıtım': 'Orkinos 870 overview',
  'Orka 870 tanıtım': 'Orka 870 overview',
  'Albatros 870 tarlada': 'Albatros 870 in the field',
  'Süper Yunus tanıtım': 'Super Yunus overview',
  'Hammer tanıtım': 'Hammer overview',
  'i-Pak tanıtım': 'i-Pak overview',
  'Diamond tanıtım': 'Diamond overview',
  'Pelican tanıtım': 'Pelican overview',
  'Scorpion tarlada': 'Scorpion in the field',
  'Ahtapot tanıtım': 'Ahtapot overview',
  'Yengeç tanıtım': 'Yengec overview',
  'Kırlangıç tanıtım': 'Kirlangic overview',
  'Tesviye küreği tanıtım': 'Land leveller overview',
  'Rotovatör kullanımı': 'Using the rotary tiller',
  'İlk çalıştırma ve traktöre bağlama': 'First start-up and hitching to the tractor',
  'Düğüm atıcı ayarı': 'Setting the knotter',
  'Balya yoğunluğu ayarı': 'Setting the bale density',
  'İp takma ve düğüm ayarı': 'Threading the twine and setting the knot',
  'Emniyet cıvatası değişimi': 'Replacing the shear bolt',
  'Bakım ve gresleme noktaları': 'Maintenance and greasing points',
  'Ağ takma ve ayarı': 'Fitting and setting the net',
  'Bıçak bileme ve boşluk ayarı': 'Sharpening the knives and setting the clearance',
  'Doğru yükleme sırası': 'The right loading order',
  'Tartı kalibrasyonu': 'Calibrating the scale',
  'Paketleme makinası kullanımı': 'Using the bale wrapper',
  'Dual 2 sistemi nasıl çalışır': 'How the Dual 2 system works',
  '3 Yabalı sistem tanıtımı': 'Three-fork system overview',
  'E serisi farkları': 'What is different about the E series',
  'Süper 8002 kullanım': 'Using the Super 8002',
  'Süper 8002E Dual 2': 'Super 8002E Dual 2',
}

/* Ürün açıklamaları ve bakım takvimi.

   Bakım takvimi 4 gruba göre yazılmış (balya, yem, silaj, toprak) —
   ürünlerin hepsi bu dört listeden birini kullanıyor, o yüzden 20 ürün
   için 20 çeviri değil, 4 liste yetiyor. Anahtar Türkçe başlık. */

export const DESC_EN = {
  'orkinos-1270':
    'A high-capacity large square baler. Its wide pickup and powerful compression system give high density when baling straw, hay and stalks.',
  'orkinos-870':
    'A square baler for medium-to-large farms. It offers the durability of the Orkinos series with less tractor power.',
  'orka-870':
    'A square baler from the Orka series. Its solid chassis and easy maintenance give a long service life.',
  'albatros-870':
    'The Albatros 870 is designed for contractors and large farms, with a high working speed and consistent bale density.',
  'super-yunus':
    "PAKSAN's most popular small square baler. With a bale size that can be carried by hand, it is ideal for small and medium farms.",
  'super-yunus-dual2':
    'The twin-knotter model of the Super Yunus. It makes tighter bales with fewer twine breaks.',
  'super-yunus-3yabali':
    'The Super Yunus model with a three-fork system, giving more even feeding and a higher working capacity.',
  'super-8002': 'The classic PAKSAN small square baler, proven in the field for many years.',
  'super-8002e':
    'The improved E series of the Super 8002, with a reinforced chassis and an upgraded feeding system.',
  'super-8002e-dual2': 'The top model of the E series, with the twin-knotter system.',
  hammer:
    'The Hammer was built for farms working in hard conditions, with high compression power and a durable body.',
  'ipak-rulo':
    'A fixed-chamber round baler. With net and twine wrapping options it suits straw, hay and silage baling.',
  'diamond-dikey':
    'A vertical auger feed mixer that blends roughage and concentrate evenly. With its purpose-designed cutting knives, loading bucket and discharge conveyor, it was built for dairy and beef farms.',
  'pelican-yatay':
    'A feed mixer that gives a fast, even mix with its horizontal auger system. It suits barns with a low ceiling height.',
  'scorpion-silaj':
    'A row-independent forage harvester. It cuts and chops maize, sorghum and similar crops without following the rows.',
  'silaj-paketleme':
    'A wrapping machine that makes silage by wrapping round bales in stretch film.',
  'yengec-cayir': 'A disc mower. It gives a clean cut and a high working speed.',
  'kirlangic-ot-toplama':
    'A rake that gathers the mown grass into windrows. It forms an even windrow ready for baling.',
  rotovator:
    'A rotary tiller that breaks up the soil and prepares it for sowing. Offered in several working widths.',
  'tesviye-kuregi':
    'A blade used for field levelling and grading work. Solid steel body.',
}

export const BAKIM_EN = {
  'Günlük gresleme': {
    baslik: 'Daily greasing',
    detay: 'Grease the knotter, the plunger bearings and the pickup grease points.',
  },
  'Zincir gerginliği ve yağlama': {
    baslik: 'Chain tension and lubrication',
    detay: 'Check the tension of all chains and apply chain oil.',
  },
  'Düğüm atıcı kontrolü': {
    baslik: 'Knotter check',
    detay: 'Check the knotter knife, the twine holder and the spring pressure.',
  },
  'Şanzıman yağ değişimi': {
    baslik: 'Gearbox oil change',
    detay: 'Drain the main gearbox oil and refill with new oil.',
  },
  'Genel bakım': {
    baslik: 'General service',
    detay: 'Plunger knife and counter-knife clearance, all bearings, shear bolts.',
  },
  'Günlük kontrol': {
    baslik: 'Daily check',
    detay: 'Check the knives for wear and the hydraulics for leaks.',
  },
  Gresleme: {
    baslik: 'Greasing',
    detay: 'Grease the auger bearings and the discharge conveyor bearings.',
  },
  'Bıçak değişimi/bileme': {
    baslik: 'Knife change / sharpening',
    detay: 'Check the cutting knives and replace them if they are blunt.',
  },
  'Şanzıman ve tartı': {
    baslik: 'Gearbox and scale',
    detay: 'Gearbox oil, calibration of the weighing system.',
  },
  'Bıçak bileme': {
    baslik: 'Knife sharpening',
    detay: 'Sharpen the knives every working day and set the counter-knife clearance.',
  },
  'Gresleme ve kayış': {
    baslik: 'Greasing and belts',
    detay: 'Check the grease points and the belt tension.',
  },
  'Şanzıman yağı': {
    baslik: 'Gearbox oil',
    detay: 'Gearbox oil level, and an oil change if needed.',
  },
  'Bıçak/keski kontrolü': {
    baslik: 'Knife / blade check',
    detay: 'Replace broken or worn knives and check the bolt torques.',
  },
  'Yağ değişimi': {
    baslik: 'Oil change',
    detay: 'Change the oil in the side gearbox and the main gearbox.',
  },
}

/* Teknik özellik DEĞERLERİ.

   Değerlerin çoğu sayı ve birim ("120 x 70 cm", "min. 120 HP"); onlar
   her dilde aynı, çevrilmiyor. Yalnız cümle gibi yazılmış olanlar
   burada. Listede olmayan değer olduğu gibi gösterilir. */

export const SPEC_DEGER_EN = {
  '2 adet': '2',
  '2 adet (Dual)': '2 (Dual)',
  '4 adet': '4',
  '6 adet': '6',
  '4 – 8 (modele göre)': '4 – 8 (depending on model)',
  Ayarlanabilir: 'Adjustable',
  'Ayarlanabilir, 30 – 110 cm': 'Adjustable, 30 – 110 cm',
  'Ayarlanabilir, 40 – 250 cm': 'Adjustable, 40 – 250 cm',
  'Ağ / İp': 'Net / twine',
  'Otomatik file': 'Automatic net wrapping',
  '2 – 3 adet (modele göre)': '2 – 3 (depending on model)',
  'Bant ile yandan boşaltma': 'Side discharge by conveyor',
  'C tipi / L tipi': 'C type / L type',
  'Dijital (opsiyonel)': 'Digital (optional)',
  'Dikey, tek helezon': 'Vertical, single auger',
  Hidrolik: 'Hydraulic',
  'Mekanik / Hidrolik': 'Mechanical / hydraulic',
  Opsiyonel: 'Optional',
  'Sıra bağımsız': 'Row-independent',
  'Yan zincir / dişli': 'Side chain / gear',
  Yatay: 'Horizontal',
  'Çift yönlü bant': 'Two-way conveyor',
  'Özel tasarım kesici bıçak': 'Purpose-designed cutting knife',
}

/* Ürün kartındaki küçük rozetler (hacim seçenekleri gibi) */
export const VARYANT_EN = {}
