# Google Sign-In setup

The app uses two different OAuth clients:

- Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to the **Web application** OAuth client ID. `GoogleSignin.configure` uses it to request the ID token for the backend. Do not put the Android client ID here.
- In Google Cloud Console, create or verify an **Android** OAuth client with package name `com.cobilds.com` and the SHA-1 fingerprint of the certificate that signed the installed app.

The fingerprint depends on how the app was installed:

- Local Android debug build: the project's `android/app/debug.keystore` was verified to use SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
- EAS build: use the Android signing certificate shown in the EAS project credentials.
- Play Store install: use the Play App Signing certificate from Play Console.

The existing APKs in `artifacts` use a different SHA-1:
`97:5B:9E:01:38:B4:19:47:83:42:AB:19:07:5C:77:8F:BC:88:C6:C6`.
They also contain the previous Android package name. Those APKs will not be authorized by the new debug OAuth client; install a newly built APK or create an Android OAuth client for the exact package and signing certificate used by the APK you distribute.

After adding the matching Android OAuth client in Google Cloud, install and retry sign-in with a build signed by that certificate. If the signing key changes, register its new SHA-1 as well.

The app uses `@react-native-google-signin/google-signin` directly and sends the returned ID token to the existing `POST /auth/google/native` backend endpoint. It does not use Firebase Authentication. The Web OAuth client ID remains the `webClientId` used to request the ID token; the Android OAuth client is registered in Google Cloud for the package/signing certificate and is not passed as `webClientId`.

Before each sign-in, the app signs out of the Google Sign-In session stored by this app, then opens the Google account chooser. This does not remove Google accounts from the device or sign out of other apps.
