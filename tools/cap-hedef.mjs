/* ==========================================================================
   Capacitor hedefini seçer

   İki ayrı APK üretiliyor:

     PAKSAN Connect  müşteri uygulaması   dist/         android/
     PAKSAN Servisim servis uygulaması    dist-servis/  android-servis/

   Capacitor tek bir `capacitor.config.json` okuyor. `.ts` ve `.js`
   yapılandırma da tanıyor ama ikisi de bu projede çalışmıyor: `.js`
   yolu `require()` kullanıyor ve `package.json`'da `"type": "module"`
   var; `.ts` yolu `typescript` paketi istiyor, kurulu değil ve sırf
   derleme ayarı için eklenmemeli.

   Bu betik yapılandırmayı hedefe göre yazıyor. `android.path` alanı
   Capacitor'ün desteklediği gerçek bir alan, böylece iki yerel proje
   tek yapılandırmadan çıkıyor.

   KULLANIM

     node tools/cap-hedef.mjs app     müşteri uygulamasına çevir
     node tools/cap-hedef.mjs servis  servis paneline çevir

   `npm run apk:servis` işini bitirince hedefi app'e geri alıyor;
   böylece depodaki dosya daima aynı hâlde duruyor ve `git status`
   kirlenmiyor.
   ========================================================================== */

import { readFileSync, writeFileSync } from 'node:fs'

const DOSYA = 'capacitor.config.json'

const HEDEFLER = {
  app: {
    appId: 'com.paksanmakina.app',
    appName: 'PAKSAN Connect',
    webDir: 'dist',
    androidPath: 'android',
  },
  servis: {
    appId: 'com.paksanmakina.servis',
    appName: 'PAKSAN Servisim',
    webDir: 'dist-servis',
    androidPath: 'android-servis',
  },
}

const istenen = process.argv[2]
const hedef = HEDEFLER[istenen]

if (!hedef) {
  console.error('Kullanım: node tools/cap-hedef.mjs app|servis')
  process.exit(2)
}

const mevcut = JSON.parse(readFileSync(DOSYA, 'utf8'))

const yeni = {
  ...mevcut,
  appId: hedef.appId,
  appName: hedef.appName,
  webDir: hedef.webDir,
  android: { ...(mevcut.android || {}), path: hedef.androidPath },
}

writeFileSync(DOSYA, JSON.stringify(yeni, null, 2) + '\n')
console.log(`capacitor hedefi: ${istenen} · ${hedef.appId} · ${hedef.webDir}`)
