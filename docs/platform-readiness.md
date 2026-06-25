# SiteProg platform readiness

SiteProg is built with Expo and React Native so it can run across mobile and browser platforms from the same codebase.

## Target platforms

| Platform | Route |
| --- | --- |
| Android | Expo Android build or Expo Go during development |
| iOS | Expo iOS build or Expo Go during development |
| Windows | Browser version using Expo Web |
| Browser | Expo Web build |

## Current scripts

| Command | Purpose |
| --- | --- |
| `npm run start` | Start Expo development server |
| `npm run android` | Open Android development build |
| `npm run ios` | Open iOS development build |
| `npm run web` | Run the browser version |
| `npm run lint` | Check code quality |

## App configuration

The Expo config now declares support for:

- iOS
- Android
- Web

Windows users should use the browser version. A separate Windows desktop app is not required for the first version.

## Build direction

Version 1 should remain Expo based:

1. Keep one shared app for Android, iOS and Web.
2. Use responsive layouts so screens work on phones, tablets and desktop browsers.
3. Use browser deployment for Windows users.
4. Add native app store builds later if required.

## Important note

Some site-specific features, such as camera upload, file export and offline sync, must be checked across Android, iOS and Web because permissions and storage behave differently on each platform.
