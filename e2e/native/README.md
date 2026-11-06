# Native smoke test (Android)

Checks the installed app end to end on an Android emulator, against **production**: sign-up with the
real Cloudflare Turnstile CAPTCHA, 18+ profile, the night, joining the list, the QR pass, and the
session surviving an app restart. Web flows are covered by `pnpm e2e`; this is the native counterpart.

## Tools (once)
- Java 17: `brew install openjdk@17`, then `export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`
- Android SDK: `brew install --cask android-commandlinetools`, then platform-tools, emulator and
  `system-images;android-35;google_apis;arm64-v8a` (if `sdkmanager` is very slow, download the zips from
  https://dl.google.com/android/repository/ and unzip them into the SDK folder), and an AVD.
- Maestro: `brew install mobile-dev-inc/tap/maestro`

## Run
1. Build: `cd apps/customer && npx eas-cli build -p android --profile preview` (APK, public env vars from EAS).
2. Production needs an upcoming night. Use a temporary venue (`pnpm rouge:setup --target prod` with a
   "Outly Smoke Test" content file), or a real night.
3. Start the emulator, `adb install` the APK, then:
   `maestro test -e EMAIL=smoke-<tag>@outly-sydney.com -e PASSWORD=<random, letters+digits> -e USERNAME=smoke_<tag> -e VENUE="Outly Smoke Test" e2e/native/signup-pass.yaml`
4. **Clean up** in production: delete the test account and the temporary venue (with everything attached).

Never use a real person's email. Never disable the CAPTCHA in production to make this pass.
