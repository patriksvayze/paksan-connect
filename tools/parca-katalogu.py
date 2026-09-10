# -*- coding: utf-8 -*-
"""
============================================================================
PAKSAN yedek parça kataloğunu fiyat listesi PDF'inden çıkarır

NE YAPIYOR

PAKSAN'ın bastığı "TEMMUZ 2026 YEDEK PARÇA FİYAT LİSTESİ" PDF'i her
sayfada bir alt montaj başlığı ve 3x4'lük bir ızgara taşıyor. Her
gözde dört şey var: görsel, parça kodu, parça adı, fiyat. Bu betik o
ızgarayı okuyup katalogu JSON'a, görselleri de ayrı dosyalara
çeviriyor.

NEDEN ELLE YAZILMIYOR

570'ten fazla parça var. Elle yazılan bir liste ilk fiyat
güncellemesinde eskir ve kimse baştan yazmaz. Yeni liste geldiğinde
bu betik yeniden çalıştırılıyor, o kadar.

ÇIKTI UYGULAMANIN İÇİNE GİRMİYOR

Katalog `sunucu-taklidi/` klasörüne yazılıyor ve hiçbir derlemeye
dâhil edilmiyor (bkz. src/lib/parcaKatalogu.js). Uygulama onu ağdan
çağırıyor; bugün geliştirme sunucusundan, yarın PAKSAN'ın kendi
sunucusundan.

IZGARA NASIL OKUNUYOR

Metin konumlarından: kod satırı 11 punto, adı 9-10 punto ve kodun
15 piksel altında, fiyatı 11 punto ve ₺ ile başlıyor. Sütunlar x
merkezine göre üçe ayrılıyor. Görsel, aynı sütunda ve kod satırının
üstünde duran en yakın resim.

BAŞLIK SAYFA ORTASINDA DA BAŞLAYABİLİYOR

Alt montaj başlığı sayfanın tepesinde değil, KATEGORİNİN DEĞİŞTİĞİ
yerde duruyor: bir sayfanın üst yarısı "Tırmık Kaldırma Sistemi",
alt yarısı "Kaporta Sistemi" olabiliyor. Bu yüzden başlık sayfaya
değil SATIRA bakılarak veriliyor; başlıksız bir sayfa öncekinin
devamıdır.

Sayfa üstündeki logo ve altındaki künye görselleri iki ölçütle
eleniyor: ızgaranın dışında duranlar konumla, ızgaranın içine
serpiştirilmiş logolar ise "beşten çok sayfada geçen aynı resim"
kuralıyla. İkincisi şart — logo bazı sayfalarda başlığın yanında,
ızgaranın tam içinde duruyor.

KULLANIM

    pip install pymupdf pillow
    python tools/parca-katalogu.py "<liste.pdf>" [hedef klasör]
============================================================================
"""

import io
import json
import os
import re
import sys
import unicodedata
from collections import OrderedDict

import pymupdf
from PIL import Image

# Izgara ölçüleri — A4 sayfada ölçüldü (595x842 punto).
SUTUN_MERKEZLERI = (128.0, 283.0, 438.0)
IZGARA_UST = 120.0      # bunun üstü sayfa logosu
IZGARA_ALT = 725.0      # bunun altı künye görseli
AD_ARALIGI = (8.0, 26.0)  # adın kod satırına uzaklığı

# Görseller ekranda en fazla 170 piksel genişlikte duruyor; üç katı
# yoğunluktaki telefonda bile 512 fazlasıyla yetiyor.
GORSEL_EN = 512
GORSEL_KALITE = 82

# '₺26.500' ve '₺850,00' — listede iki biçim de var, kuruş her zaman sıfır.
FIYAT_KALIP = re.compile(r'^\s*₺\s*([\d.]+?)(?:,\d+)?\s*$')
KOD_KALIP = re.compile(r'^[0-9][0-9.]{4,}[A-Z0-9.]*$')


def kimlik(metin):
    """Başlıktan dosya/anahtar adı: 'İP GERDİRME SİSTEMİ' → 'ip-gerdirme-sistemi'."""
    esle = {'ı': 'i', 'İ': 'i', 'ş': 's', 'Ş': 's', 'ğ': 'g', 'Ğ': 'g',
            'ü': 'u', 'Ü': 'u', 'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c'}
    d = ''.join(esle.get(k, k) for k in metin).lower()
    d = unicodedata.normalize('NFKD', d).encode('ascii', 'ignore').decode()
    d = re.sub(r'[^a-z0-9]+', '-', d).strip('-')
    return d


def fiyatSayisi(metin):
    """'₺26.500' → 26500. Listede kuruş yok."""
    m = FIYAT_KALIP.match(metin)
    if not m:
        return None
    return int(m.group(1).replace('.', ''))


def spanlariTopla(sayfa):
    hepsi = []
    for blok in sayfa.get_text('dict')['blocks']:
        if blok['type'] != 0:
            continue
        for satir in blok['lines']:
            for sp in satir['spans']:
                metin = sp['text'].strip()
                if metin:
                    hepsi.append({
                        'metin': metin,
                        'boy': round(sp['size'], 1),
                        'x': (sp['bbox'][0] + sp['bbox'][2]) / 2,
                        'y': sp['bbox'][1],
                    })
    return hepsi


def sutun(x):
    """Span hangi sütunda? EN YAKIN sütun merkezine göre.

    Önce "merkeze 90 piksel içindeyse o sütun" deniyordu ve ilk uyan
    sütunu döndürüyordu. Sütun merkezleri 155 piksel aralıklı, yani
    tam ortada duran bir öğe iki sütuna da uyuyor ve soldakine
    yazılıyordu: geniş bir parça resmi böyle yanlış sütuna düşüp bir
    parçayı görselsiz bırakmıştı."""
    en = min(range(len(SUTUN_MERKEZLERI)),
             key=lambda i: abs(x - SUTUN_MERKEZLERI[i]))
    return en if abs(x - SUTUN_MERKEZLERI[en]) < 90 else None


def sayfaSusleri(belge):
    """Logo gibi çok sayfada tekrar eden resimlerin xref kümesi.

    Konumla elenemiyorlar: logo bazı sayfalarda başlığın yanında,
    ızgaranın tam içinde duruyor ve orada bir parça resmiymiş gibi
    görünüyor. Aynı resim beşten çok sayfada geçiyorsa parça resmi
    değildir — parça resimleri bir kez kullanılıyor."""
    from collections import Counter
    sayac = Counter()
    for sayfa in belge:
        for xref in {im[0] for im in sayfa.get_images(full=True)}:
            sayac[xref] += 1
    return {x for x, n in sayac.items() if n > 5}


def sayfayiOku(belge, sayfaNo, susler):
    """Bir sayfadaki başlıkları ve parçaları döndürür."""
    sayfa = belge[sayfaNo]
    spanlar = spanlariTopla(sayfa)
    if not spanlar:
        return [], []

    # Alt montaj başlıkları 18 punto; sayfanın ortasında da olabilir.
    basliklar = sorted(
        [{'y': s['y'], 'ad': s['metin']} for s in spanlar if s['boy'] >= 16],
        key=lambda b: b['y'])

    kodlar = [s for s in spanlar
              if s['y'] > IZGARA_UST and KOD_KALIP.match(s['metin'])
              and sutun(s['x']) is not None]

    # Görseller: ızgaranın içinde kalan ve sayfa süsü olmayanlar.
    resimler = []
    for im in sayfa.get_images(full=True):
        if im[0] in susler:
            continue
        for r in sayfa.get_image_rects(im[0]):
            if r.y1 < IZGARA_UST or r.y0 > IZGARA_ALT:
                continue
            resimler.append({'xref': im[0], 'x': (r.x0 + r.x1) / 2,
                             'y0': r.y0, 'y1': r.y1})

    # Kodlar satırlara kümeleniyor: aynı ızgara satırındaki üç kodun
    # y değeri birkaç ondalık farkla aynı.
    satirlar = []
    for k in sorted(kodlar, key=lambda s: s['y']):
        if satirlar and abs(k['y'] - satirlar[-1][0]['y']) < 6:
            satirlar[-1].append(k)
        else:
            satirlar.append([k])

    parcalar = []
    for i, satir in enumerate(satirlar):
        satirY = satir[0]['y']
        oncekiY = satirlar[i - 1][0]['y'] if i else 0

        # Bu satıra ait resimler: merkezi bu kod satırının üstünde ve
        # bir önceki satırın altında olanlar.
        #
        # RESİMLER SATIR BÜTÜNÜNDE PAYLAŞTIRILIYOR, göz göz değil.
        # Önce her göz kendi sütununa en yakın resmi seçiyordu; geniş
        # basılmış bir resmin merkezi komşu sütuna kayınca iki göz aynı
        # resmi seçiyor, öbür göz görselsiz kalıyordu.
        adayResim = [r for r in resimler
                     if oncekiY < (r['y0'] + r['y1']) / 2 < satirY]

        for k in sorted(satir, key=lambda s: s['x']):
            sut = sutun(k['x'])

            adaylar = [x for x in spanlar
                       if sutun(x['x']) == sut
                       and AD_ARALIGI[0] < x['y'] - k['y'] < AD_ARALIGI[1]
                       and fiyatSayisi(x['metin']) is None
                       and not KOD_KALIP.match(x['metin'])]
            ad = adaylar[0]['metin'] if adaylar else ''

            fiyatlar = [fiyatSayisi(x['metin']) for x in spanlar
                        if sutun(x['x']) == sut and 20 < x['y'] - k['y'] < 45
                        and fiyatSayisi(x['metin']) is not None]
            fiyat = fiyatlar[0] if fiyatlar else None

            gorsel = None
            if adayResim:
                merkez = SUTUN_MERKEZLERI[sut] if sut is not None else k['x']
                en = min(adayResim, key=lambda r: abs(r['x'] - merkez))
                adayResim.remove(en)
                gorsel = en['xref']

            parcalar.append({'kod': k['metin'], 'ad': ad, 'fiyat': fiyat,
                             'xref': gorsel, 'y': k['y']})

    # Okuma sırası: yukarıdan aşağı. Başlık eşleştirmesi buna dayanıyor.
    parcalar.sort(key=lambda p: (p['y'], p['kod']))
    return basliklar, parcalar


def gorseliYaz(belge, xref, hedef):
    """Resmi maskesiyle birlikte beyaza düzleyip WebP yazar.

    YUMUŞAK MASKE (SMask) OLMADAN RESİM SİYAH ÇIKIYOR.

    631 resmin 630'u ayrı bir yumuşak maskeyle basılmış: parçanın
    kendisi bir JPEG, çevresindeki boşluk ise maskede saydam. JPEG tek
    başına çıkarıldığında o boşluk SİYAH oluyor — PDF'te bembeyaz
    görünen sayfa, uygulamada siyah kareler dizisine dönüyordu.

    Maske ayrı bir nesne olarak deftere yazılı; ikisi burada
    birleştirilip beyaz zemine oturtuluyor.

    ARDINDAN KIRPILIYOR. CAD çıktılarının çevresinde geniş boşluk var;
    kırpılmadan kartın içinde parça küçücük kalıyor."""
    ham = belge.extract_image(xref)
    taban = Image.open(io.BytesIO(ham['image'])).convert('RGB')

    maske = None
    if ham.get('smask'):
        m = belge.extract_image(ham['smask'])
        maske = Image.open(io.BytesIO(m['image'])).convert('L')
        if maske.size != taban.size:
            maske = maske.resize(taban.size, Image.LANCZOS)

    resim = Image.new('RGB', taban.size, (255, 255, 255))
    resim.paste(taban, mask=maske)

    # Kırpma sınırı maskeden: parçanın gerçekten kapladığı alan orada
    # yazılı. Maske yoksa beyaz olmayan piksellerden hesaplanıyor.
    kutu = (maske or resim.convert('L').point(lambda v: 0 if v > 247 else 255)).getbbox()
    if kutu:
        pay = max(4, min(taban.size) // 40)
        kutu = (max(0, kutu[0] - pay), max(0, kutu[1] - pay),
                min(taban.width, kutu[2] + pay), min(taban.height, kutu[3] + pay))
        resim = resim.crop(kutu)

    if resim.width > GORSEL_EN:
        oran = GORSEL_EN / resim.width
        resim = resim.resize((GORSEL_EN, max(1, round(resim.height * oran))),
                             Image.LANCZOS)
    resim.save(hedef, 'WEBP', quality=GORSEL_KALITE, method=6)
    return os.path.getsize(hedef)


def main():
    if len(sys.argv) < 2:
        print('Kullanım: python tools/parca-katalogu.py <liste.pdf> [hedef]')
        return 1

    kaynak = sys.argv[1]
    hedef = sys.argv[2] if len(sys.argv) > 2 else 'sunucu-taklidi/parca-katalogu'
    gorselKlasoru = os.path.join(hedef, 'gorseller')
    os.makedirs(gorselKlasoru, exist_ok=True)

    belge = pymupdf.open(kaynak)
    susler = sayfaSusleri(belge)

    gruplar = OrderedDict()
    parcalar = []
    gorulen = set()
    eksikGorsel = 0
    eksikFiyat = 0
    eksikGrup = 0
    toplamBayt = 0

    # Başlıksız sayfa öncekinin devamı; grup sayfalar arasında taşınıyor.
    acikGrup = None

    for no in range(belge.page_count):
        basliklar, sayfaninkiler = sayfayiOku(belge, no, susler)
        if not sayfaninkiler:
            # Parçası olmayan sayfada da başlık olabilir (bölüm ayracı).
            for b in basliklar:
                if kimlik(b['ad']):
                    acikGrup = b
            continue

        for p in sayfaninkiler:
            # Bu satırdan ÖNCE gelen son başlık bu parçanın grubudur.
            oncekiler = [b for b in basliklar if b['y'] <= p['y']]
            if oncekiler:
                acikGrup = oncekiler[-1]
            if not acikGrup:
                eksikGrup += 1
                continue

            grupId = kimlik(acikGrup['ad'])
            if not grupId:
                eksikGrup += 1
                continue
            gruplar.setdefault(
                grupId, {'id': grupId, 'ad': acikGrup['ad'], 'adet': 0})
            if p['kod'] in gorulen:
                # Aynı kod iki sayfada geçiyorsa ilki kalıyor.
                continue
            gorulen.add(p['kod'])

            gorselAdi = None
            if p['xref']:
                gorselAdi = p['kod'] + '.webp'
                toplamBayt += gorseliYaz(
                    belge, p['xref'], os.path.join(gorselKlasoru, gorselAdi))
            else:
                eksikGorsel += 1
            if p['fiyat'] is None:
                eksikFiyat += 1

            parcalar.append({
                'kod': p['kod'],
                'ad': p['ad'],
                'fiyat': p['fiyat'],
                'grup': grupId,
                'gorsel': gorselAdi,
            })
            gruplar[grupId]['adet'] += 1

    katalog = {
        'surum': 1,
        'kaynak': os.path.basename(kaynak),
        'gruplar': list(gruplar.values()),
        'parcalar': parcalar,
    }
    yol = os.path.join(hedef, 'katalog.json')
    with io.open(yol, 'w', encoding='utf-8') as f:
        json.dump(katalog, f, ensure_ascii=False, indent=1)

    print(f'{len(parcalar)} parça · {len(gruplar)} grup')
    print(f'katalog.json {os.path.getsize(yol) // 1024} KB')
    print(f'görseller {toplamBayt // 1024} KB')
    if eksikGorsel:
        print(f'UYARI: {eksikGorsel} parçanın görseli bulunamadı')
    if eksikFiyat:
        print(f'UYARI: {eksikFiyat} parçanın fiyatı okunamadı')
    if eksikGrup:
        print(f'UYARI: {eksikGrup} parça hiçbir gruba bağlanamadı')
    return 0


if __name__ == '__main__':
    sys.exit(main())
