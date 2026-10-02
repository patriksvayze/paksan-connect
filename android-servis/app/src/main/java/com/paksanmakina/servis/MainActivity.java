package com.paksanmakina.servis;

import android.os.Bundle;
import android.view.View;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /* Uygulamanın kendi eklentisi (sesle yazma) köprü kurulmadan önce
       kaydediliyor; super.onCreate'ten sonra kaydedilen eklenti JS'e
       görünmüyor. `npx cap add android` bu dosyayı şablondan yeniden
       yazar — o komut android-servis için bir daha çalıştırılırsa bu
       satır geri konmalı. 30 Eylül 2026'dan beri ikinci eklenti mikrofon
       izni (Gizlilik ve İzinler sayfası, MikrofonIzniPlugin.java).

       ESNEME KAPALI (30 Eylül 2026, kullanıcının kararı: "Esneme tamamen
       kapansın"). Android'in kaydırma sınırındaki esnemesi WebView'un
       tamamına uygulanıyordu: alt menü ve üst çubuk da esniyordu. CSS'teki
       `overscroll-behavior` (servis.css → html, .uyg__ic) aynı işi sayfa
       tarafında yapıyor; son satır telefonun kendisinde. */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DiktePlugin.class);
        registerPlugin(MikrofonIzniPlugin.class);
        super.onCreate(savedInstanceState);
        getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
    }
}
