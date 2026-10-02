package com.paksanmakina.app;

import android.os.Bundle;
import android.view.View;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /* Uygulamanın kendi eklentisi (mikrofon izni, Gizlilik ve İzinler
       sayfası) köprü kurulmadan önce kaydediliyor; super.onCreate'ten
       sonra kaydedilen eklenti JS'e görünmüyor.

       ESNEME KAPALI (30 Eylül 2026, kullanıcının kararı: "Esneme tamamen
       kapansın"). Android'in kaydırma sınırındaki esnemesi WebView'un
       tamamına uygulanıyordu: alt menü ve üst çubuk da esniyordu. Web
       sayfası Android'e "yalnız şu alanı esnet" diyemiyor. CSS'teki
       `overscroll-behavior: none` (styles.css → html) aynı işi sayfa
       tarafında yapıyor; bu satır telefonun kendisinde.

       `npx cap add android` bu dosyayı şablondan yeniden yazar — o komut
       bir daha çalıştırılırsa bu iki satır geri konmalı. */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MikrofonIzniPlugin.class);
        super.onCreate(savedInstanceState);
        getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
    }
}
