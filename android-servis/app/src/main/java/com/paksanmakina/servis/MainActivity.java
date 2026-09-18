package com.paksanmakina.servis;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /* Uygulamanın kendi eklentisi (sesle yazma) köprü kurulmadan önce
       kaydediliyor; super.onCreate'ten sonra kaydedilen eklenti JS'e
       görünmüyor. `npx cap add android` bu dosyayı şablondan yeniden
       yazar — o komut android-servis için bir daha çalıştırılırsa bu
       satır geri konmalı. */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DiktePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
