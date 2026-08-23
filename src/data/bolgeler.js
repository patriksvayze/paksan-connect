/* ==========================================================================
   Ülkeye göre bölge (il / eyalet / vilayet) listeleri

   Türkiye'de il ve ilçe iki kademeli seçiliyor (81 il, 973 ilçe —
   src/data/iller.js). Yurtdışında bu derinlikte veri taşımak mümkün
   değil: 70 ülkenin ilçe listesi yüz binlerce satır, onlarca megabayt
   eder ve uygulama internetsiz çalıştığı için hepsinin telefonda
   durması gerekir.

   BU YÜZDEN İKİ KADEMELİ BİR ÇÖZÜM:

     · Türkiye        → il seçimi + ilçe seçimi (eskisi gibi)
     · Aşağıdaki
       ülkeler       → birinci kademe bölge seçimi (eyalet/vilayet/il)
                        + şehir serbest yazılıyor
     · Diğer ülkeler  → bölge ve şehir serbest yazılıyor

   Listeye ülke eklemek kolay: aşağıya ISO koduyla bir dizi yazmak
   yeterli, ekranlar kendiliğinden seçim kutusuna döner.

   Buradaki adlar İNGİLİZCE, çünkü bu ekranı gören kullanıcı İngilizce
   diliyle geziyor. Ülkenin kendi dilindeki adı parantez içinde değil,
   uluslararası yazımıyla veriliyor (Bayern değil Bavaria gibi
   karışıklık olmasın diye yerel yazım tercih edildi).
   ========================================================================== */

export const BOLGELER = {
  DE: [
    'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen',
    'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen',
    'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen',
    'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen',
  ],
  FR: [
    'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne',
    'Centre-Val de Loire', 'Corse', 'Grand Est', 'Hauts-de-France',
    'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine', 'Occitanie',
    'Pays de la Loire', "Provence-Alpes-Côte d'Azur",
  ],
  NL: [
    'Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen',
    'Limburg', 'Noord-Brabant', 'Noord-Holland', 'Overijssel',
    'Utrecht', 'Zeeland', 'Zuid-Holland',
  ],
  ES: [
    'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias',
    'Cantabria', 'Castilla-La Mancha', 'Castilla y León', 'Cataluña',
    'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Murcia',
    'Navarra', 'País Vasco', 'Valencia',
  ],
  IT: [
    'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
    'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
    'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
    'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto',
  ],
  PL: [
    'Dolnośląskie', 'Kujawsko-Pomorskie', 'Lubelskie', 'Lubuskie',
    'Łódzkie', 'Małopolskie', 'Mazowieckie', 'Opolskie',
    'Podkarpackie', 'Podlaskie', 'Pomorskie', 'Śląskie',
    'Świętokrzyskie', 'Warmińsko-Mazurskie', 'Wielkopolskie',
    'Zachodniopomorskie',
  ],
  RO: [
    'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud',
    'Botoșani', 'Brăila', 'Brașov', 'București', 'Buzău',
    'Călărași', 'Caraș-Severin', 'Cluj', 'Constanța', 'Covasna',
    'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu', 'Gorj', 'Harghita',
    'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 'Maramureș',
    'Mehedinți', 'Mureș', 'Neamț', 'Olt', 'Prahova', 'Sălaj',
    'Satu Mare', 'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea',
    'Vâlcea', 'Vaslui', 'Vrancea',
  ],
  BG: [
    'Blagoevgrad', 'Burgas', 'Dobrich', 'Gabrovo', 'Haskovo',
    'Kardzhali', 'Kyustendil', 'Lovech', 'Montana', 'Pazardzhik',
    'Pernik', 'Pleven', 'Plovdiv', 'Razgrad', 'Ruse', 'Shumen',
    'Silistra', 'Sliven', 'Smolyan', 'Sofia', 'Sofia City',
    'Stara Zagora', 'Targovishte', 'Varna', 'Veliko Tarnovo',
    'Vidin', 'Vratsa', 'Yambol',
  ],
  GR: [
    'Attica', 'Central Greece', 'Central Macedonia', 'Crete',
    'Eastern Macedonia and Thrace', 'Epirus', 'Ionian Islands',
    'North Aegean', 'Peloponnese', 'South Aegean', 'Thessaly',
    'Western Greece', 'Western Macedonia',
  ],
  AZ: [
    'Absheron', 'Aran', 'Baku', 'Ganja-Qazakh', 'Guba-Khachmaz',
    'Lankaran', 'Nakhchivan', 'Shaki-Zaqatala', 'Upper Karabakh',
    'Yukhari-Garabagh',
  ],
  UA: [
    'Cherkasy', 'Chernihiv', 'Chernivtsi', 'Dnipropetrovsk', 'Donetsk',
    'Ivano-Frankivsk', 'Kharkiv', 'Kherson', 'Khmelnytskyi', 'Kyiv',
    'Kirovohrad', 'Luhansk', 'Lviv', 'Mykolaiv', 'Odesa', 'Poltava',
    'Rivne', 'Sumy', 'Ternopil', 'Vinnytsia', 'Volyn', 'Zakarpattia',
    'Zaporizhzhia', 'Zhytomyr',
  ],
  KZ: [
    'Abai', 'Akmola', 'Aktobe', 'Almaty', 'Almaty City', 'Astana',
    'Atyrau', 'East Kazakhstan', 'Jambyl', 'Jetisu', 'Karaganda',
    'Kostanay', 'Kyzylorda', 'Mangystau', 'North Kazakhstan',
    'Pavlodar', 'Shymkent', 'Turkistan', 'Ulytau', 'West Kazakhstan',
  ],
  SA: [
    'Al Bahah', 'Al Jawf', 'Al Madinah', 'Al Qassim', 'Asir',
    'Eastern Province', 'Hail', 'Jazan', 'Makkah', 'Najran',
    'Northern Borders', 'Riyadh', 'Tabuk',
  ],
  AE: [
    'Abu Dhabi', 'Ajman', 'Dubai', 'Fujairah', 'Ras Al Khaimah',
    'Sharjah', 'Umm Al Quwain',
  ],
  IQ: [
    'Al Anbar', 'Babil', 'Baghdad', 'Basra', 'Dhi Qar', 'Diyala',
    'Duhok', 'Erbil', 'Karbala', 'Kirkuk', 'Maysan', 'Muthanna',
    'Najaf', 'Nineveh', 'Qadisiyyah', 'Salah al-Din', 'Sulaymaniyah',
    'Wasit',
  ],
  DZ: [
    'Adrar', 'Algiers', 'Annaba', 'Batna', 'Béchar', 'Béjaïa',
    'Biskra', 'Blida', 'Constantine', 'Djelfa', 'El Oued', 'Ghardaïa',
    'Médéa', 'Mostaganem', 'Oran', 'Ouargla', 'Sétif',
    'Sidi Bel Abbès', 'Skikda', 'Tiaret', 'Tlemcen',
  ],
  MA: [
    'Béni Mellal-Khénifra', 'Casablanca-Settat', 'Dakhla-Oued Ed-Dahab',
    'Drâa-Tafilalet', 'Fès-Meknès', 'Guelmim-Oued Noun',
    'Laâyoune-Sakia El Hamra', 'Marrakesh-Safi', 'Oriental',
    'Rabat-Salé-Kénitra', 'Souss-Massa', 'Tanger-Tétouan-Al Hoceïma',
  ],
  US: [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
    'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
    'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas',
    'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
    'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana',
    'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma',
    'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
  ],
  GB: ['England', 'Northern Ireland', 'Scotland', 'Wales'],
}

/** Bu ülke için hazır bölge listesi var mı? */
export function bolgeleriGetir(iso) {
  return BOLGELER[iso] || []
}

export function bolgeListesiVarMi(iso) {
  return Boolean(BOLGELER[iso]?.length)
}
