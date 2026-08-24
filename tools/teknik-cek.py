# -*- coding: utf-8 -*-
"""paksanmakina.com.tr urun sayfalarindaki teknik ozellik tablolarini ceker.

Tablolar Ninja Tables eklentisiyle yapilmis; sayfada yalnizca bos bir
<table> var, veri AJAX ile geliyor. Uc adim:

  1. Urun sayfasi indiriliyor, icindeki data-footable_id okunuyor
  2. Sutunlar sayfadaki "original_columns" dizisinden GORUNTU SIRASINDA
     aliniyor
  3. Satirlar ayni eklentinin acik AJAX ucundan JSON olarak aliniyor

Cikti: tools/kaynak/teknik-tablolar.json
"""
import io
import json
import re
import sys
import time
import urllib.request

KOK = 'https://www.paksanmakina.com.tr'
UC = (KOK + '/wp-admin/admin-ajax.php'
      '?action=wp_ajax_ninja_tables_public_action'
      '&table_id=%s&target_action=get-all-data'
      '&default_sorting=old_first&skip_rows=0&limit_rows=0')

BASLIK = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

# Uygulamadaki urun kimligi -> sitedeki sayfa
SAYFALAR = [
    ('orkinos-1270', '/urunler/balya-makinalari/'),
    ('orkinos-870', '/urunler/paksan-balya-makinalari/'),
    ('orka-870', '/urunler/orka-870/'),
    ('albatros-870', '/urunler/albatros-870/'),
    ('super-yunus', '/urunler/super-yunus-balya-makinasi/'),
    ('super-yunus-dual2', '/urunler/paksan-balya-makinalari-6/'),
    ('super-yunus-3yabali', '/urunler/paksan-balya-makinalari-5/'),
    ('super-8002', '/urunler/paksan-balya-makinalari-2/'),
    ('super-8002e', '/urunler/paksan-balya-makinalari-4/'),
    ('super-8002e-dual2', '/urunler/paksan-balya-makinalari-3/'),
    ('hammer', '/urunler/hammer-balya-makinasi/'),
    ('ipak-rulo', '/urunler/i-pak-rulo-balya-makinasi/'),
    ('diamond-dikey', '/urunler/diamond-paksan-dikey-yem-karma-makinasi/'),
    ('pelican-yatay', '/urunler/pelican-yatay-yem-karma-makinalari/'),
    ('yengec-cayir', '/urunler/yengec-cayir-bicme-makinasi/'),
    ('kirlangic-ot-toplama', '/urunler/kirlangic-ot-toplama-makinasi/'),
    ('tesviye-kuregi', '/urunler/paksan-tesviye-kuregi/'),
    ('scorpion-silaj', '/urunler/silaj-bicer/'),
    ('silaj-paketleme', '/urunler/ahtapot-1000-silaj-paketleme-makinasi/'),
    ('rotovator', '/urunler/paksan-dikey-rotovator/'),
    ('rotovator-yatay', '/urunler/paksan-yatay-rotovator/'),
]


def indir(adres):
    istek = urllib.request.Request(adres, headers=BASLIK)
    with urllib.request.urlopen(istek, timeout=45) as c:
        ham = c.read()
    for kod in ('utf-8', 'cp1254', 'latin-1'):
        try:
            return ham.decode(kod)
        except UnicodeDecodeError:
            continue
    return ham.decode('utf-8', 'replace')


def sutunlar(sayfa):
    """Sutunlari GORUNTU SIRASINDA dondurur: [[anahtar, baslik], ...].

    Sayfada "original_columns" adli bir dizi var ve sirasi tablodaki
    sira. Butun sayfada key/name cifti aranirsa sira bozuluyor: baska
    JSON bloklarindaki key alanlari araya giriyor, etiket sutunu ortaya
    dusuyordu.

    Dizi elle ayristirilmiyor, json ile cozuluyor -- \\uXXXX ve \\/ gibi
    kacis dizilerini json kendisi hallediyor.
    """
    i = sayfa.find('"original_columns":')
    if i < 0:
        return []
    bas = sayfa.index('[', i)

    # Kose parantezleri sayarak dizinin sonunu bul (metin icinde parantez
    # olabilir diye tirnak durumu da izleniyor).
    derinlik, tirnak, kacis = 0, False, False
    for j in range(bas, len(sayfa)):
        ch = sayfa[j]
        if kacis:
            kacis = False
            continue
        if ch == '\\':
            kacis = True
        elif ch == '"':
            tirnak = not tirnak
        elif not tirnak:
            if ch == '[':
                derinlik += 1
            elif ch == ']':
                derinlik -= 1
                if derinlik == 0:
                    son = j + 1
                    break
    else:
        return []

    try:
        dizi = json.loads(sayfa[bas:son])
    except ValueError:
        return []

    cikti = []
    for s in dizi:
        ad = re.sub(r'<[^>]*>', '', str(s.get('name') or '')).strip()
        cikti.append([s.get('key'), ad])
    return cikti


def main():
    sonuc = {}
    for kimlik, yol in SAYFALAR:
        adres = KOK + yol
        try:
            sayfa = indir(adres)
        except Exception as e:
            print('%-22s SAYFA HATASI %s' % (kimlik, e))
            continue

        m = re.search(r'data-footable_id="(\d+)"', sayfa)
        if not m:
            print('%-22s TABLO YOK' % kimlik)
            continue

        tablo_id = m.group(1)
        try:
            veri = json.loads(indir(UC % tablo_id))
        except Exception as e:
            print('%-22s AJAX HATASI %s' % (kimlik, e))
            continue

        satirlar = veri if isinstance(veri, list) else veri.get('data', veri)
        sut = sutunlar(sayfa)
        sonuc[kimlik] = {
            'adres': adres,
            'tabloId': tablo_id,
            'sutunlar': sut,
            'satirlar': satirlar,
        }
        print('%-22s tablo %-6s satir %-3d sutun %s' % (
            kimlik, tablo_id, len(satirlar), [a for _, a in sut]))
        time.sleep(0.4)

    io.open(os.path.join('tools', 'kaynak', 'teknik-tablolar.json'), 'w', encoding='utf-8').write(
        json.dumps(sonuc, ensure_ascii=False, indent=1))
    print('\ntablolar.json yazildi:', len(sonuc), 'urun')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
