/* ==========================================================================
   Ülke kodları

   PAKSAN altı kıtaya ihracat yapıyor; uygulamayı yurtdışındaki
   müşterilere de tavsiye edeceğiz. Bu yüzden telefon numarası artık
   ülke koduyla birlikte alınıyor ve numara BAŞTAKİ SIFIR OLMADAN
   yazılıyor (uluslararası biçim böyle: +90 532 123 45 67).

   `iso`  → listede tekil anahtar. İki ülkenin telefon kodu aynı
            olabiliyor (+1 ABD ve Kanada, +7 Rusya ve Kazakistan),
            bu yüzden anahtar kod değil ISO kısaltması.
   `hane` → o ülkede numaranın kaç rakam olduğu. Bilinmiyorsa null;
            o zaman 6-14 rakam arası kabul ediliyor.

   Liste tam değil, PAKSAN'ın müşterisi olan/olabilecek ülkeleri
   kapsıyor. Yeni ülke eklemek için tek satır yeterli.
   ========================================================================== */

import { ULKE_ADI_EN } from './ulkeler.en'

export const VARSAYILAN_ULKE = 'TR'

const HAM = [
  { iso: 'TR', ad: 'Türkiye', kod: '+90', hane: 10 },
  { iso: 'DE', ad: 'Almanya', kod: '+49', hane: null },
  { iso: 'US', ad: 'Amerika Birleşik Devletleri', kod: '+1', hane: 10 },
  { iso: 'AR', ad: 'Arjantin', kod: '+54', hane: null },
  { iso: 'AL', ad: 'Arnavutluk', kod: '+355', hane: null },
  { iso: 'AU', ad: 'Avustralya', kod: '+61', hane: 9 },
  { iso: 'AT', ad: 'Avusturya', kod: '+43', hane: null },
  { iso: 'AZ', ad: 'Azerbaycan', kod: '+994', hane: 9 },
  { iso: 'BE', ad: 'Belçika', kod: '+32', hane: null },
  { iso: 'AE', ad: 'Birleşik Arap Emirlikleri', kod: '+971', hane: 9 },
  { iso: 'GB', ad: 'Birleşik Krallık', kod: '+44', hane: 10 },
  { iso: 'BA', ad: 'Bosna-Hersek', kod: '+387', hane: null },
  { iso: 'BR', ad: 'Brezilya', kod: '+55', hane: 11 },
  { iso: 'BG', ad: 'Bulgaristan', kod: '+359', hane: null },
  { iso: 'DZ', ad: 'Cezayir', kod: '+213', hane: 9 },
  { iso: 'CZ', ad: 'Çekya', kod: '+420', hane: 9 },
  { iso: 'CN', ad: 'Çin', kod: '+86', hane: 11 },
  { iso: 'DK', ad: 'Danimarka', kod: '+45', hane: 8 },
  { iso: 'ID', ad: 'Endonezya', kod: '+62', hane: null },
  { iso: 'ET', ad: 'Etiyopya', kod: '+251', hane: 9 },
  { iso: 'MA', ad: 'Fas', kod: '+212', hane: 9 },
  { iso: 'FR', ad: 'Fransa', kod: '+33', hane: 9 },
  { iso: 'ZA', ad: 'Güney Afrika', kod: '+27', hane: 9 },
  { iso: 'GE', ad: 'Gürcistan', kod: '+995', hane: 9 },
  { iso: 'IN', ad: 'Hindistan', kod: '+91', hane: 10 },
  { iso: 'HR', ad: 'Hırvatistan', kod: '+385', hane: null },
  { iso: 'NL', ad: 'Hollanda', kod: '+31', hane: 9 },
  { iso: 'IQ', ad: 'Irak', kod: '+964', hane: 10 },
  { iso: 'IR', ad: 'İran', kod: '+98', hane: 10 },
  { iso: 'ES', ad: 'İspanya', kod: '+34', hane: 9 },
  { iso: 'IL', ad: 'İsrail', kod: '+972', hane: 9 },
  { iso: 'SE', ad: 'İsveç', kod: '+46', hane: null },
  { iso: 'CH', ad: 'İsviçre', kod: '+41', hane: 9 },
  { iso: 'IT', ad: 'İtalya', kod: '+39', hane: 10 },
  { iso: 'JP', ad: 'Japonya', kod: '+81', hane: null },
  { iso: 'CA', ad: 'Kanada', kod: '+1', hane: 10 },
  { iso: 'ME', ad: 'Karadağ', kod: '+382', hane: null },
  { iso: 'QA', ad: 'Katar', kod: '+974', hane: 8 },
  { iso: 'KZ', ad: 'Kazakistan', kod: '+7', hane: 10 },
  { iso: 'KE', ad: 'Kenya', kod: '+254', hane: 9 },
  { iso: 'KG', ad: 'Kırgızistan', kod: '+996', hane: 9 },
  { iso: 'XK', ad: 'Kosova', kod: '+383', hane: null },
  { iso: 'KW', ad: 'Kuveyt', kod: '+965', hane: 8 },
  { iso: 'MK', ad: 'Kuzey Makedonya', kod: '+389', hane: null },
  { iso: 'LY', ad: 'Libya', kod: '+218', hane: 9 },
  { iso: 'LT', ad: 'Litvanya', kod: '+370', hane: 8 },
  { iso: 'LB', ad: 'Lübnan', kod: '+961', hane: null },
  { iso: 'HU', ad: 'Macaristan', kod: '+36', hane: 9 },
  { iso: 'MX', ad: 'Meksika', kod: '+52', hane: 10 },
  { iso: 'EG', ad: 'Mısır', kod: '+20', hane: 10 },
  { iso: 'MD', ad: 'Moldova', kod: '+373', hane: 8 },
  { iso: 'NG', ad: 'Nijerya', kod: '+234', hane: 10 },
  { iso: 'NO', ad: 'Norveç', kod: '+47', hane: 8 },
  { iso: 'UZ', ad: 'Özbekistan', kod: '+998', hane: 9 },
  { iso: 'PK', ad: 'Pakistan', kod: '+92', hane: 10 },
  { iso: 'PL', ad: 'Polonya', kod: '+48', hane: 9 },
  { iso: 'PT', ad: 'Portekiz', kod: '+351', hane: 9 },
  { iso: 'RO', ad: 'Romanya', kod: '+40', hane: 9 },
  { iso: 'RU', ad: 'Rusya', kod: '+7', hane: 10 },
  { iso: 'RS', ad: 'Sırbistan', kod: '+381', hane: null },
  { iso: 'SK', ad: 'Slovakya', kod: '+421', hane: 9 },
  { iso: 'SI', ad: 'Slovenya', kod: '+386', hane: 8 },
  { iso: 'SD', ad: 'Sudan', kod: '+249', hane: 9 },
  { iso: 'SA', ad: 'Suudi Arabistan', kod: '+966', hane: 9 },
  { iso: 'CL', ad: 'Şili', kod: '+56', hane: 9 },
  { iso: 'TZ', ad: 'Tanzanya', kod: '+255', hane: 9 },
  { iso: 'TN', ad: 'Tunus', kod: '+216', hane: 8 },
  { iso: 'TM', ad: 'Türkmenistan', kod: '+993', hane: 8 },
  { iso: 'UA', ad: 'Ukrayna', kod: '+380', hane: 9 },
  { iso: 'JO', ad: 'Ürdün', kod: '+962', hane: 9 },
  { iso: 'NZ', ad: 'Yeni Zelanda', kod: '+64', hane: null },
  { iso: 'GR', ad: 'Yunanistan', kod: '+30', hane: 10 },
]

/* Türkiye en üstte, gerisi Türkçe alfabeye göre. Müşterilerin
   büyük çoğunluğu Türkiye'de; onlara listeyi gezdirmeyelim. */
export const ULKELER = [
  HAM[0],
  ...HAM.slice(1).sort((a, b) => a.ad.localeCompare(b.ad, 'tr')),
]

export function ulkeGetir(iso) {
  return ULKELER.find((u) => u.iso === iso) || ULKELER[0]
}

/* Eski kayıtlarda ülke bilgisi yok; hepsi Türkiye'ydi. */
export function ulkeKoduGetir(iso) {
  return ulkeGetir(iso).kod
}

/* ------------------------------------------------------------- Dil */

/** Ülkenin seçili dildeki adı. İngilizcesi yoksa Türkçesine düşer. */
export function ulkeAdi(iso, dil = 'tr') {
  const u = ulkeGetir(iso)
  if (dil === 'tr') return u.ad
  return ULKE_ADI_EN[u.iso] || u.ad
}

/** Seçili dile göre sıralanmış ülke listesi. Türkiye her zaman başta:
    müşterilerin çoğunluğu orada, listeyi gezdirmeye gerek yok. */
export function ulkeListesi(dil = 'tr') {
  if (dil === 'tr') return ULKELER
  const geri = ULKELER.slice(1)
    .map((u) => ({ ...u, gorunenAd: ulkeAdi(u.iso, dil) }))
    .sort((a, b) => a.gorunenAd.localeCompare(b.gorunenAd, 'en'))
  return [{ ...ULKELER[0], gorunenAd: ulkeAdi(ULKELER[0].iso, dil) }, ...geri]
}
