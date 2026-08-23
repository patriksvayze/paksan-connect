/* ==========================================================================
   Talep formlarındaki seçeneklerin İngilizcesi

   Sıra Türkçe dosyayla BİREBİR aynı olmalı: ekranlar seçilen değeri
   Türkçe listedeki karşılığıyla saklıyor, böylece Paksan'a gelen talep
   hangi dilde doldurulmuş olursa olsun aynı okunuyor.

   Terimler serviste kullanılan İngilizce karşılıklar:
     düğüm atıcı → knotter · pikap → pickup · helezon → auger
     mafsal/şaft → PTO shaft · emniyet cıvatası → shear bolt
     merdane → roller · tırmık parmağı → rake tine
   ========================================================================== */

export const ULASIM_ZAMANI_EN = [
  'Any time',
  'Morning (09:00 - 12:00)',
  'Afternoon (12:00 - 15:00)',
  'Late afternoon (15:00 - 18:00)',
]

export const MAKINE_DURUMU_EN = {
  durdu: { ad: 'The machine will not run at all', alt: 'Work has stopped completely' },
  sorunlu: { ad: 'It runs but there is a problem', alt: 'Work is disrupted, output is down' },
  kontrol: { ad: 'It runs, but please check it', alt: 'Not urgent' },
}

export const PARCA_ACELE_EN = {
  hemen: { ad: 'The machine is down, I need it now', alt: 'Work is waiting' },
  hafta: { ad: 'I need it this week', alt: 'Tight, but work continues' },
  yedek: { ad: 'Not urgent', alt: 'To keep as a spare' },
}

export const URUN_TIPI_EN = [
  'Alfalfa',
  'Straw / wheat',
  'Grass / meadow hay',
  'Maize silage',
  'Other',
]

export const ARAZI_EN = [
  'Less than 5 hectares',
  '5 - 15 hectares',
  '15 - 50 hectares',
  'More than 50 hectares',
  'I also work on other farmers’ land',
]

export const TRAKTOR_EN = [
  'Under 50 hp',
  '50 - 80 hp',
  '80 - 110 hp',
  '110 - 150 hp',
  'Over 150 hp',
  'Not sure',
]

export const ORTAK_BELIRTI_EN = [
  'Unusual noise',
  'Excessive vibration',
  'Oil leak',
  'PTO shaft / driveline problem',
  'Hydraulic problem',
  'Belt or chain jumping off',
  'Overheating / burning smell',
]

export const BELIRTILER_EN = {
  balya: [
    'Not tying knots',
    'Twine keeps breaking',
    'Bales come out loose',
    'Bales fall apart',
    'Pickup is not lifting the crop',
    'Plunger / stroke problem',
    'Bale counter not working',
  ],
  rulo: [
    'Bale is not forming',
    'Net or twine is not wrapping',
    'Tailgate will not open / close',
    'Bales come out loose',
    'Pickup is not lifting the crop',
  ],
  yem: [
    'Mixing is not thorough enough',
    'Knives are not cutting',
    'Will not discharge',
    'Scale not working',
    'Auger keeps jamming',
  ],
  silaj: [
    'Chop length is off',
    'Knives are blunt',
    'It keeps blocking',
    'Feeding is uneven',
  ],
  cayir: [
    'Cut is uneven',
    'Blades or tines keep breaking',
    'Rake is not gathering the crop',
  ],
  toprak: [
    'Will not hold working depth',
    'Points or legs keep breaking',
    'Soil is not worked evenly',
  ],
  genel: [],
}

export const ORTAK_PARCA_EN = [
  'Bearing',
  'Belt',
  'Chain',
  'Oil seal',
  'PTO shaft / driveline',
  'Shear bolt',
  'Hydraulic hose',
]

export const PARCALAR_EN = {
  balya: [
    'Knotter blade',
    'Twine guide',
    'Needle',
    'Pickup tine',
    'Plunger ring',
    'Bale counter',
  ],
  rulo: ['Wrapping knife', 'Rubber belt', 'Pickup tine', 'Tailgate ram'],
  yem: ['Mixer knife', 'Auger', 'Load cell', 'Discharge conveyor'],
  silaj: ['Cutting knife', 'Shear bar', 'Feed roller'],
  cayir: ['Mower blade', 'Rake tine', 'Guard plate'],
  toprak: ['Point', 'Leg / frame', 'Disc', 'Roller'],
  genel: [],
}

export const DIGER_EN = 'Other'
export const BILMIYORUM_EN = 'I am not sure, please check'
