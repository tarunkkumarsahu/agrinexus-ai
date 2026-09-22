# Android client — Kotlin and Jetpack Compose

The Android project uses the SAME FastAPI endpoint as the web client. Android is built natively in Kotlin, while the web app is Next.js/TypeScript.

Status: an initial Android Studio project with a shared-API health check and the same illustrative scenario form as the web client. The Android build has not yet been verified in an emulator. Gradle wrapper scripts/binaries are NOT included in this first commit.

Local setup:
1. Install Android Studio, Android SDK 35, and JDK 17.
2. Open apps/android as a Gradle project. Generate its Gradle 8.11.1 wrapper locally if prompted (or create a clean Android Studio Empty Activity Compose project and transfer app/src and the app Gradle configuration into it, keeping the IDE-generated wrapper).
3. Start FastAPI using --host 0.0.0.0 --port 8000.
4. Start an Android emulator and launch the app. The emulator accesses the host machine using http://10.0.2.2:8000.
5. Try Check API, then the comparison form; do not treat example outputs as farm advice.

IMPORTANT: Cleartext HTTP is enabled solely for local development. Use HTTPS, credentials management, tests, and production security measures before publishing. If using a physical phone instead of an emulator, the dev URL must be changed to an accessible private LAN IP and the firewall configured appropriately.
