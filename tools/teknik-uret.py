# -*- coding: utf-8 -*-
"""tablolar.json -> src/data/teknikOzellikler.js

Sitede tablolar ham hâlde: sutun sirasi karisik, bos sutunlar var, ayni
sutun uc kere tekrarlanmis, bolum basliklari <strong> ile isaretlenmis.
Bu betik onlari uygulamanin kullanabilecegi duzenli bir yapiya cevirir.
"""
import io
import json
import os
import re
import sys
import unicodedata

GIRDI = os.path.join('tools', 'kaynak', 'teknik-tablolar.json')
CIKTI = os.path.join('src', 'data', 'teknikOzellikler.js')

# Uygulamadaki urun kimligi -> tablolar.json anahtari.
# Rotovator'un sitede iki ayri tablosu var (dikey ve yatay); uygulamada
# tek urun oldugu icin varyantlari birlestiriliyor.
BIRLESTIR = {
    'rotovator': [('rotovator', 'Dikey '), ('rotovator-yatay', 'Yatay ')],
}

# Sitede basligi hic tanimlanmamis sutunlarin adlari.
#
# Uydurulmuyor, tablonun kendisinden cikiyor: Yengec tablosunda diger
# iki sutun "YENGEC 165" ve "YENGEC 195", GENISLIK satiri da sirasiyla
# 135 / 165 / 195 diyor. Yani adsiz sutun YENGEC 135.
VARYANT_ADI = {
    ('yengec-cayir', 0): 'YENGEÇ 135',
}

# ISPANYOLCA GIRILMIS SATIRLAR.
#
# Scorpion Silaj'in tablosu Turkce sitede bastan sona Ispanyolca yazilmis
# (Largo, Anchura, Peso...). Site cok dilli; tablo yanlis dile
# kaydedilmis olmali. Turkce uygulamada Ispanyolca etiket gostermek olmaz.
ISPANYOLCA = {
    'Largo': 'Uzunluk',
    'Anchura': 'Genişlik',
    'Altura': 'Yükseklik',
    'Peso': 'Ağırlık',
    'Anchura de trabajo': 'İş Genişliği',
    'Capacidad toneladas': 'Kapasite',
    'Potencia del tracto': 'Traktör Gücü',
    'Velocidad de trabajo': 'Çalışma Hızı',
    'Número de cuchillas': 'Bıçak Sayısı',
    'Número de alas lanzadoras': 'Atıcı Kanat Sayısı',
    'Número de Ejes': 'Dingil Sayısı',
    'Número de tambores de alimentación': 'Besleme Tamburu Sayısı',
    'Cuchillas Segadora': 'Biçme Bıçağı',
    'Montaje en tractor': 'Traktöre Bağlantı',
    'Dispositivo de afilado': 'Bileme Düzeneği',
    'Sistema de chimeneas': 'Baca Sistemi',
    # degerler
    'Sierra': 'Testere',
    'Sistema de enganche de 3': 'Üç Nokta Askı',
    'Estándar': 'Standart',
    'Hidráulica': 'Hidrolik',
    'Hidráulica y electrónica': 'Hidrolik ve Elektronik',
    # birimler
    'km/hora': 'km/sa',
    'Pieza': 'Adet',
}


def t(x):
    x = re.sub(r'<[^>]*>', '', str(x if x is not None else ''))
    x = re.sub(r'\s+', ' ', x.replace('\xa0', ' ')).strip()
    # Sitede bos hucrelerin bir kismi "-" ile doldurulmus. Ekranda cizgi
    # gostermek bilgi vermiyor, tabloyu kalabaliklastiriyor.
    if x in ('-', '--', '.'):
        return ''
    # HARFLER TEK KOD NOKTASINA INDIRILIYOR.
    #
    # Sitede bazi "u" harfleri ayrisik yazilmis: u + birlesen cift nokta
    # (U+0075 U+0308) yerine tek karakter (U+00FC). Ekranda ikisi de ayni
    # gorunuyor ama JavaScript icin farkli metinler; "Traktor Gucu"
    # sozlukte aranirken bulunamiyordu. NFC hepsini tek koda indiriyor.
    x = unicodedata.normalize('NFC', x)
    return ISPANYOLCA.get(x, x)


def sutun_anahtarlari(u):
    """Sutun anahtarlarini goruntu sirasinda dondurur.

    Kaynak "original_columns" dizisi ama bazi tablolarda bir sutun orada
    hic yok (Yengec 135 boyle: satirlarda var, sutun listesinde yok).
    Eksikler satirin kendi anahtar sirasindaki yerlerine ekleniyor.
    """
    anahtar = [a for a, _ in u['sutunlar']]
    ad = {a: b for a, b in u['sutunlar']}
    listede = set(anahtar)
    satirdaki = [a for a in u['satirlar'][0]['value'] if a != '___id___']
    for i, a in enumerate(satirdaki):
        if a not in anahtar:
            anahtar.insert(min(i, len(anahtar)), a)
            ad.setdefault(a, '')
    return anahtar, ad, listede


def coz(u, varyant_oneki=''):
    """Ham tabloyu (varyantlar, bolumler) hâline getirir.

    ORTADAKI SUTUN IKI IS BIRDEN YAPIYOR. Sitedeki tablolarda etiketten
    sonraki sutunun basligi bos ve icinde iki farkli sey var:

        Balya Kesitleri | cm     | 120 X 70 | 120 X 70   <- olcu birimi
        Tirmik Yontemi  | Zincir |          |            <- ortak deger

    Yani iki model ayni degeri paylasiyorsa deger bir kere ortadaki
    sutuna yazilmis, model sutunlari bos birakilmis. Karar satir satir
    veriliyor: model hucreleri bossa ortadaki sutun DEGERDIR, doluysa
    BIRIMDIR.

    Bu ayrim yapilmazsa iki sonuctan biri oluyor: ya "Zincir" bir olcu
    birimi gibi gorunuyor, ya da ortadaki sutun ayri bir model sanilip
    Orkinos 1270 iki model yerine uc modelli cikiyor.
    """
    anahtar, ad, listede = sutun_anahtarlari(u)
    etiket_a = anahtar[0]
    kalan = anahtar[1:]

    sutun_degerleri = {a: [t(s['value'].get(a)) for s in u['satirlar']] for a in anahtar}

    # Basligi bos olan ilk sutun "birim ya da ortak deger" sutunu
    #
    # SUTUN LISTESINDE OLMASI SART. Bazi tablolarda gercek bir model
    # sutununun basligi sitede hic tanimlanmamis; o sutun satirlarda var
    # ama sutun listesinde yok. Yalnizca "basligi bos" denseydi o sutun
    # birim sanilirdi: "GENISLIK | 135 | 165 | 195" satirinda Yengec
    # 135'in olcusu olcu birimi gibi gorunuyordu.
    orta_a = None
    if kalan and kalan[0] in listede and not ad.get(kalan[0]):
        orta_a = kalan[0]
        kalan = kalan[1:]

    # Tamamen bos sutunlar atiliyor
    kalan = [a for a in kalan if any(sutun_degerleri[a])]

    # Ayni baslikli ve ayni degerli sutunlar tek sutuna iniyor.
    # Sitede Super 8002'nin "8002" sutunu ucer kere tekrarlanmis.
    benzersiz = []
    gorulen = set()
    for a in kalan:
        imza = (ad.get(a, ''), tuple(sutun_degerleri[a]))
        if imza in gorulen:
            continue
        gorulen.add(imza)
        benzersiz.append(a)
    kalan = benzersiz

    varyantlar = []
    for i, a in enumerate(kalan):
        v = ad.get(a) or ''
        if not v:
            v = 'Model %d' % (i + 1) if len(kalan) > 1 else ''
        varyantlar.append((varyant_oneki + v).strip())

    # AYNI ADI TASIYAN SUTUNLAR NUMARALANIYOR.
    #
    # Sitede Super 8002'nin uc sutununun ucune de "8002" yazilmis ama
    # degerleri farkli (piston kursu 65/73/73, haspay Yok/Yok/Var) --
    # yani ucu ayri model. Ayni ada birakilirsa kullanici hangisinin
    # hangisi oldugunu anlayamaz. Uydurma ad da verilemez; numara
    # veriliyor, gercek adlari PAKSAN'dan ogrenilince duzeltilecek.
    sayilar = {}
    for v in varyantlar:
        sayilar[v] = sayilar.get(v, 0) + 1
    gorulen = {}
    for i, v in enumerate(varyantlar):
        if sayilar[v] > 1:
            gorulen[v] = gorulen.get(v, 0) + 1
            varyantlar[i] = '%s (%d)' % (v, gorulen[v])

    # Hic model sutunu yoksa butun degerler ortadaki sutunda demektir
    tek_sutun = not kalan
    if tek_sutun:
        varyantlar = [varyant_oneki.strip()]

    bolumler = []
    suan = {'baslik': '', 'satirlar': []}
    for s in u['satirlar']:
        v = s['value']
        ham = str(v.get(etiket_a) or '')
        etiket = t(ham)
        if not etiket:
            continue

        orta = t(v.get(orta_a)) if orta_a else ''
        degerler = [t(v.get(a)) for a in kalan]

        if tek_sutun:
            degerler = [orta]
            birim = ''
        elif not any(degerler) and orta:
            # Ortadaki sutun ortak deger; her modelde ayni
            degerler = [orta] * len(kalan)
            birim = ''
        else:
            birim = orta

        basliksa = '<strong>' in ham.lower() or not any(degerler)
        if basliksa:
            if suan['satirlar']:
                bolumler.append(suan)
            suan = {'baslik': etiket, 'satirlar': []}
        else:
            suan['satirlar'].append([etiket, birim, degerler])
    if suan['satirlar']:
        bolumler.append(suan)

    return varyantlar, bolumler


def js_metin(x):
    return "'" + str(x).replace('\\', '\\\\').replace("'", "\\'") + "'"


def main():
    d = json.load(io.open(GIRDI, encoding='utf-8'))
    cikti = {}

    for kimlik, u in d.items():
        if kimlik in ('rotovator', 'rotovator-yatay'):
            continue
        varyantlar, bolumler = coz(u)
        for i in range(len(varyantlar)):
            if (kimlik, i) in VARYANT_ADI:
                varyantlar[i] = VARYANT_ADI[(kimlik, i)]
        cikti[kimlik] = {'kaynak': u['adres'], 'varyantlar': varyantlar, 'bolumler': bolumler}

    for hedef, parcalar in BIRLESTIR.items():
        varyantlar, bolumler = [], []
        kaynak = None
        for anahtar, onek in parcalar:
            if anahtar not in d:
                continue
            v, b = coz(d[anahtar], onek)
            kaynak = kaynak or d[anahtar]['adres']
            oncekiSayi = len(varyantlar)
            varyantlar += v
            # Bolumleri etikete gore birlestir
            for yeni in b:
                eski = next((x for x in bolumler if x['baslik'] == yeni['baslik']), None)
                if eski is None:
                    eski = {'baslik': yeni['baslik'], 'satirlar': []}
                    bolumler.append(eski)
                for ad, birim, deg in yeni['satirlar']:
                    satir = next((x for x in eski['satirlar'] if x[0] == ad), None)
                    if satir is None:
                        satir = [ad, birim, [''] * oncekiSayi]
                        eski['satirlar'].append(satir)
                    satir[2] += deg
            # Bu parcada olmayan satirlari bos hucreyle hizala
            for bol in bolumler:
                for satir in bol['satirlar']:
                    while len(satir[2]) < len(varyantlar):
                        satir[2].append('')
        cikti[hedef] = {'kaynak': kaynak, 'varyantlar': varyantlar, 'bolumler': bolumler}

    # ---------------------------------------------------------- JS yaz
    y = []
    y.append("/* ==========================================================================")
    y.append("   Teknik ozellikler -- paksanmakina.com.tr'den")
    y.append("   ========================================================================== */")
    y.append('')
    y.append('export const TEKNIK = {')
    for kimlik in sorted(cikti):
        u = cikti[kimlik]
        y.append('  %s: {' % js_metin(kimlik))
        y.append('    kaynak: %s,' % js_metin(u['kaynak']))
        y.append('    varyantlar: [%s],' % ', '.join(js_metin(v) for v in u['varyantlar']))
        y.append('    bolumler: [')
        for b in u['bolumler']:
            y.append('      {')
            y.append('        baslik: %s,' % js_metin(b['baslik']))
            y.append('        satirlar: [')
            for ad, birim, deg in b['satirlar']:
                y.append('          [%s, %s, [%s]],' % (
                    js_metin(ad), js_metin(birim), ', '.join(js_metin(x) for x in deg)))
            y.append('        ],')
            y.append('      },')
        y.append('    ],')
        y.append('  },')
    y.append('}')
    y.append('')

    io.open(CIKTI, 'w', encoding='utf-8', newline='\n').write('\n'.join(y))

    toplam = sum(len(b['satirlar']) for u in cikti.values() for b in u['bolumler'])
    print('urun  :', len(cikti))
    print('satir :', toplam)
    for k in sorted(cikti):
        u = cikti[k]
        print('  %-22s varyant %-2d bolum %-2d satir %d' % (
            k, len(u['varyantlar']), len(u['bolumler']),
            sum(len(b['satirlar']) for b in u['bolumler'])))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
