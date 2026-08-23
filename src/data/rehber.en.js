/* ==========================================================================
   Bakım rehberlerinin İngilizcesi

   Yapı rehber.js ile birebir aynı: her rehberin `ortak` bölümleri ve
   `gruplar` altındaki makine türleri aynı sırada. Bir bölüm eksik
   kalırsa Türkçesi gösteriliyor.

   Terimler: gres → grease · kuyruk mili → PTO · mafsal/kardan → driveline
   düğüm atıcı → knotter · pikap → pickup · helezon → auger
   emniyet cıvatası → shear bolt · karşı bıçak → shear bar
   ========================================================================== */

export const REHBER_GUVENLIK_EN =
  'Before starting any maintenance, stop the tractor, switch off the PTO, ' +
  'turn off the ignition and keep the key with you, then wait until all ' +
  'moving parts have come to a complete stop. If you have to get under the ' +
  'machine, always use a stand or chocks — never rely on hydraulic support.'

export const REHBER_EN = {
  gunluk: {
    baslik: 'Daily Maintenance',
    ozet: 'Before every working day, 10–15 minutes',
    neZaman: 'Every day, before going out to the field',
    ortak: [
      {
        baslik: 'Visual check',
        maddeler: [
          'Walk around the machine and look for anything loose, hanging or broken.',
          'Check that bolts and nuts are in place. Tighten anything that has worked loose.',
          'Look for oil, grease or hydraulic leaks. If there are drips on the ground, find the source.',
          'Make sure all guards and driveline shields are fitted.',
        ],
      },
      {
        baslik: 'Greasing',
        maddeler: [
          'Grease every grease point. Keep pumping until the old grease is pushed out.',
          'Wipe the grease gun nozzle each time, so soil and dust do not get into the bearing.',
          'Do not forget the points inside the driveline guard.',
        ],
      },
      {
        baslik: 'Hitching and safety',
        maddeler: [
          'Check the drawbar and the safety catch on the pin.',
          'Make sure the PTO shaft is fully seated at both the tractor and the machine end.',
          'Look for crushing, cracks or rub marks on the hydraulic hoses.',
          'If you will be travelling on the road, check the reflectors and marker lights.',
        ],
      },
      {
        baslik: 'At the end of the day — ALWAYS clean the machine',
        giris:
          'Parking the machine dirty is the most expensive habit there is. ' +
          'Straw, grass and soil left on it hold moisture; moisture starts rust, ' +
          'works into bearings and chains and speeds up wear. Dried crop residue ' +
          'is the most common cause of blockages and fires the next time out.',
        maddeler: [
          'Clean the machine after every use, before you park it. Do not leave it until the next day — dried residue is far harder to remove.',
          'Go over the build-up of straw, grass and soil: pickup, cutting area, channels and under the guards.',
          'Always remove crop residue from hot surfaces (gearbox, bearings, near the exhaust) — that is where fires start.',
          'Use compressed air if you have it. If you use water, do not aim it directly at bearings, electrical connections or grease nipples.',
          'If you washed the machine, dry it and re-grease every point; water pushes grease out of the bearing.',
          'Replace the consumables you used up (twine, net, shear bolts) ready for the next day.',
        ],
      },
    ],
    gruplar: {
      balya: [
        {
          baslik: 'Balers',
          maddeler: [
            'Blow out the knotters with compressed air; twine dust and straw residue ruin the knot.',
            'Follow the twine path from end to end and look for anywhere it snags.',
            'Check the twine tension. If bales are coming out loose, this is the first place to look.',
            'Count the pickup tines; replace any that are broken or bent.',
            'Visually check the clearance between the plunger knife and the shear bar.',
            'Carry spare shear bolts and twine.',
          ],
        },
      ],
      rulo: [
        {
          baslik: 'Round balers',
          maddeler: [
            'Clean the net wrap area; straw residue stops the net feeding out properly.',
            'Make sure the net roll is seated and under tension.',
            'Check the tailgate latch and the hydraulic ram.',
            'Look for tears, cracks or split seams in the pressing belts.',
            'Check the pickup tines and their springs.',
          ],
        },
      ],
      yem: [
        {
          baslik: 'Feed mixers',
          maddeler: [
            'Check whether the knives on the auger have gone blunt; blunt knives spoil the mix.',
            'Make sure there is nothing foreign left in the tub (wire, stones, metal).',
            'Clean the discharge conveyor and its door, and check that it moves freely.',
            'Confirm the weighing system reads zero.',
            'Check the hydraulic oil level.',
          ],
        },
      ],
      silaj: [
        {
          baslik: 'Forage harvesters',
          maddeler: [
            'Sharpen the knives. On a forage harvester this is the single most important daily job.',
            'Set the shear bar clearance; as the gap grows the chop gets longer and power use rises.',
            'Check the torque on the knife bolts.',
            'Clean the chopping channel and the blower area.',
            'Check the belt tension.',
          ],
        },
      ],
      cayir: [
        {
          baslik: 'Mowers and rakes',
          maddeler: [
            'Check the blades or tines for sharpness and breakage.',
            'Tighten the blade bolts.',
            'Look for missing rake tines.',
            'Review the cutting height setting for the field you are working.',
          ],
        },
      ],
      toprak: [
        {
          baslik: 'Soil preparation machines',
          maddeler: [
            'Check the wear on blades, tines and points; a worn point raises fuel use.',
            'If a blade is broken, always replace it before working — the imbalance ruins bearings.',
            'Check the torque on the blade bolts.',
            'Check the side gearbox oil level.',
            'Check the working depth setting.',
          ],
        },
      ],
    },
  },

  'sezon-oncesi': {
    baslik: 'Pre-Season Maintenance',
    ozet: '2–3 weeks before the season opens, set aside half a day',
    neZaman: 'In spring, before the first job',
    ortak: [
      {
        baslik: 'Taking it out of storage',
        maddeler: [
          'Remove the cover and check for bird or rodent nests.',
          'Rodents may have chewed cables and hoses; check them end to end.',
          'If you applied rust preventer, clean it off the working surfaces.',
          'If it has tyres, check the pressures.',
        ],
      },
      {
        baslik: 'Oil and grease',
        maddeler: [
          'Check the gearbox oil level; oil that has stood all winter may have collected water.',
          'If the change interval in the manual has passed, change the oil.',
          'Grease every point generously; bearings that have dried out over winter are damaged in the first hours.',
          'Oil the chains and set their tension.',
        ],
      },
      {
        baslik: 'Wearing parts',
        maddeler: [
          'Replace worn parts before the season starts. Waiting for a part mid-season is the most expensive delay there is.',
          'Turn the bearings by hand and check for noise and play.',
          'Look for cracks, broken links or excessive stretch in belts and chains.',
          'Get spare shear bolts; a bolt of the wrong size damages the machine.',
        ],
      },
      {
        baslik: 'Trial run',
        maddeler: [
          'Run the machine empty before going to the field and listen for unusual noise or vibration.',
          'Work through every hydraulic movement in turn.',
          'Check the lights and marker lamps.',
          'After the first bale or first row, stop and inspect the result; make any adjustment now.',
        ],
      },
    ],
    gruplar: {
      balya: [
        {
          baslik: 'On the baler',
          maddeler: [
            'Strip and thoroughly clean the knotters; grease that has dried over winter and twine dust ruin the knot.',
            'Check the twine holder spring pressures.',
            'Set the plunger knife to shear bar clearance to the figure in the manual.',
            'Buy your twine for the season in advance; twine quality directly affects knotting.',
            'Go over every pickup tine.',
          ],
        },
      ],
      rulo: [
        {
          baslik: 'On the round baler',
          maddeler: [
            'Check the pressing belts end to end and inspect the seams.',
            'Clean the net wrap mechanism and test it.',
            'Check the tailgate hydraulics and the latch.',
            'Get your net for the season in advance.',
          ],
        },
      ],
      yem: [
        {
          baslik: 'On the feed mixer',
          maddeler: [
            'Check the knives and replace any that have gone blunt.',
            'Have the weighing system calibrated; it may have drifted over the winter.',
            'Inspect the wear plates inside the tub.',
            'Set the discharge conveyor tension.',
          ],
        },
      ],
      silaj: [
        {
          baslik: 'On the forage harvester',
          maddeler: [
            'Sharpen or replace the knives and set the shear bar.',
            'Check the blower paddles for wear.',
            'Check the belts and set their tension.',
            'If you use stretch film, test the wrapping unit.',
          ],
        },
      ],
      cayir: [
        {
          baslik: 'On the mower and rake',
          maddeler: [
            'Consider replacing all cutting blades or tines; it gives a clean cut all season.',
            'Make up any missing rake tines.',
            'Check the gearbox oil.',
          ],
        },
      ],
      toprak: [
        {
          baslik: 'On the soil preparation machine',
          maddeler: [
            'Replace worn blades and points as a set at the start of the season.',
            'Check bolt torques against the figures in the manual.',
            'Change the side and main gearbox oil.',
          ],
        },
      ],
    },
  },

  'sezon-sonu': {
    baslik: 'End-of-Season Maintenance',
    ozet: 'Before putting the machine away, half a day',
    neZaman: 'When the season ends, before winter storage',
    ortak: [
      {
        baslik: 'Cleaning — do not go into winter dirty',
        giris:
          'A machine comes out of winter the way it went in. Straw and soil left ' +
          'on it hold moisture for months and eat away under the paint; come spring ' +
          'that shows up as bolts that will not undo, chains that have seized and ' +
          'bearings that have rotted. One day of cleaning saves a season of breakdowns.',
        maddeler: [
          'Clean the machine from end to end: channels, under the guards, chain bearings and the cutting area.',
          'If you use a pressure washer, do not aim it directly at bearings, electrical connections or grease nipples.',
          'After washing, always dry the machine; never store it wet.',
          'Once dry, grease every point — if water has driven the grease out, the bearing is left unprotected.',
        ],
      },
      {
        baslik: 'Protection',
        maddeler: [
          'Grease every point; it drives the moisture out.',
          'Coat bright working surfaces (blades, tines, augers) with rust preventer.',
          'Oil the chains.',
          'Retract or oil the hydraulic ram rods; an exposed rod rusts.',
        ],
      },
      {
        baslik: 'Review and note',
        maddeler: [
          'Identify now the points that gave trouble during the season.',
          'Make a list of the parts that need replacing and order them over the winter — at the start of the season everyone wants them at once.',
          'You can send us the list now through the “Spare Parts” request in the app.',
        ],
      },
      {
        baslik: 'Storage',
        maddeler: [
          'Store it under cover and dry if you can. If it must stand outside, use a waterproof but breathable cover.',
          'Take the load off the tyres; put the machine on blocks if possible.',
          'Take precautions against rodents; cables and hoses take most of their damage in winter.',
        ],
      },
    ],
    gruplar: {
      balya: [
        {
          baslik: 'On the baler',
          maddeler: [
            'Clean and oil the knotters.',
            'Take the leftover twine out of the machine so it does not become a mouse nest.',
            'Coat the plunger knife with protective oil.',
          ],
        },
      ],
      rulo: [
        {
          baslik: 'On the round baler',
          maddeler: [
            'Slacken the belt tension; a belt left tight all winter loses its shape.',
            'Take the net roll off the machine and store it somewhere dry.',
          ],
        },
      ],
      yem: [
        {
          baslik: 'On the feed mixer',
          maddeler: [
            'Clean the tub thoroughly; feed residue goes mouldy over winter and corrodes it.',
            'Protect the load cells of the weighing system from moisture.',
          ],
        },
      ],
      silaj: [
        {
          baslik: 'On the forage harvester',
          maddeler: [
            'Leave the knives in place and oil them; you can sharpen them at the start of the season.',
            'Clean out the chopping channel and the blower completely.',
            'Slacken the belts.',
          ],
        },
      ],
      cayir: [
        {
          baslik: 'On the mower and rake',
          maddeler: [
            'Coat the blades with protective oil.',
            'Note any missing rake tines and make them up over the winter.',
          ],
        },
      ],
      toprak: [
        {
          baslik: 'On the soil preparation machine',
          maddeler: [
            'Clean and oil the blades and points.',
            'Check the gearbox oil level.',
            'Store the machine so that it is not in contact with the soil.',
          ],
        },
      ],
    },
  },
}
