# Android APK (Capacitor)
The GitHub workflow `.github/workflows/apk.yml` builds a debug APK in the cloud (no Android Studio needed).
It copies ../index.html, ../template.html, ../manifest.json and ../icons into www/, adds the Android project, and builds.
debug.keystore is a fixed debug signing key so each new build installs over the old app without uninstalling.
The app asks for your Vercel address + password on first launch.
