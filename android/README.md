# APK de USAR 242

App Android que abre https://juancbr9.github.io/USAR/ en Chrome a pantalla completa (Trusted Web Activity).
Los cambios de la web llegan solos; solo hace falta un APK nuevo si se cambia algo de esta carpeta (subir `versionCode`).

Compilar (Android SDK 35 y JDK 17+):

    export ANDROID_HOME=… USAR_KEYSTORE=/ruta/usar242.keystore USAR_KEYSTORE_PASS=…
    gradle assembleRelease   # → app/build/outputs/apk/release/app-release.apk

La clave de firma no está en el repositorio (está en los archivos del proyecto). Hay que firmar siempre con la
misma clave: si cambia, los móviles no aceptan la actualización.

Para quitar la barra con la dirección de arriba, `https://juancbr9.github.io/.well-known/assetlinks.json` tiene que
existir con este contenido (repositorio `juancbr9.github.io`):

    [{"relation":["delegate_permission/common.handle_all_urls"],
      "target":{"namespace":"android_app","package_name":"io.github.juancbr9.usar242",
      "sha256_cert_fingerprints":["A4:A8:98:A1:69:F6:F1:93:B0:0E:42:16:E7:2A:DC:6C:7A:16:B2:96:6E:42:D9:70:3C:A9:E6:3B:7F:A5:36:C3"]}}]
