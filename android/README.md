# App Android de USAR 242

App nativa: lleva dentro los archivos de la web (la raíz del repositorio, copiados al compilar) y los abre en su propia
ventana, sin navegador. Cámara, GPS, archivos, compartir, imprimir, avisos, vibración y pantalla encendida van por
Android (`MainActivity.java` y `js/nativo.js`).

**Actualizaciones:** al abrirla con conexión mira la `CACHE` de `sw.js` publicada en https://juancbr9.github.io/USAR/;
si es otra, descarga la lista `FILES` y la usa al volver a la app (`Web.java`). Por eso, al cambiar la web basta con subir
`CACHE` y añadir a `FILES` los archivos nuevos, como siempre. Solo hace falta un APK nuevo si se cambia algo de esta
carpeta (subir `versionCode`).

Compilar (Android SDK 35 y JDK 17+):

    export ANDROID_HOME=… USAR_KEYSTORE=/ruta/usar242.keystore USAR_KEYSTORE_PASS=…
    gradle assembleRelease   # → app/build/outputs/apk/release/app-release.apk

La clave de firma no está en el repositorio (está en los archivos del proyecto). Hay que firmar siempre con la
misma clave: si cambia, los móviles no aceptan la actualización.

Los enlaces y QR (`https://juancbr9.github.io/USAR/...`) abren la app gracias a
`https://juancbr9.github.io/.well-known/assetlinks.json` (repositorio `juancbr9.github.io`).
