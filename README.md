# multiprovider-mobile-to-local-agent

A mobile client (Android, iOS, web) for interacting with a local OpenCode server from your devices.

![CI](https://img.shields.io/github/actions/workflow/status/walladanger/multiprovider-mobile-to-local-agent/validate.yml?branch=main&label=CI) ![License](https://img.shields.io/github/license/walladanger/multiprovider-mobile-to-local-agent) ![Platform](https://img.shields.io/badge/Platform-React%20Native-blue)

![Hero image](fastlane/metadata/android/en-US/images/phoneScreenshots/1.png)

## Features

- Connect to an OpenCode server over authenticated HTTPS, VPN, or secure tunnel.
- Start and continue chat sessions with your local agent.
- Review and approve execution actions from your device.
- Read and edit project text files directly in the app.
- Utilize the project terminal (PTY) on the go.
- Use speech-to-text dictation and hands-free voice mode.

## Architecture

```mermaid
flowchart TD
    AppLayout["app/_layout.tsx"] --> OpencodeProvider["OpencodeProvider"]
    OpencodeProvider --> Services["providers/services/"]
    OpencodeProvider --> Screens["Screens (app/...)"]
    Screens --> Hooks["Domain Hooks (useChat, useProjects...)"]
    Hooks --> OpencodeProvider
    Screens --> Components["components/"]
    AppLayout --> Notifications["lib/notifications"]
    AppLayout --> Voice["lib/voice/speech-output"]
```

The app uses a simple structural pattern where Expo Router provides navigation, and `OpencodeProvider` owns nearly all domain state and orchestration. Screens are thin and interact with the provider state through narrow domain hooks.

## Quick start

Requires Node `^22.12.0 || ^24.0.0 || >=26.0.0` (see `.nvmrc`).

```bash
# Install dependencies
npm ci

# Start the Expo development server
npm start

# Build and run on Android
npm run android

# Build and run on iOS
npm run ios

# Run in the browser
npm run web

# Run vitest suite
npm run test:vitest
```

## Configuration

| Environment Variable | Purpose | Default |
| --- | --- | --- |
| `EXPO_APP_VARIANT` | Defines the app variant (e.g. `development`, `foss`) | `production` |
| `EXPO_PUBLIC_FOSS` | Set to `1` to enable the de-Googled FOSS variant | |
| `EXPO_PUBLIC_E2E_MODE` | Set to `1` to enable end-to-end testing mode | |
| `EXPO_PUBLIC_E2E_SERVER_URL` | OpenCode server URL used in E2E tests | |
| `EXPO_APP_NAME` | Name of the app, allows side-by-side test APKs | `OpenCode Mobile` (or `OpenCode Mobile Dev`) |
| `EXPO_ANDROID_PACKAGE` | Android package name | `app.getopencode` (or `app.getopencode.fdroid`) |
| `EXPO_ANDROID_PACKAGE_DEV`| Android dev package name | `app.getopencode.dev` |
| `EXPO_IOS_APP_STORE_ID` | Store listing ID for iOS updates | |
| `EXPO_IOS_APP_STORE_COUNTRY` | Country for iOS store updates | |
| `I18N_ALLOW_MISSING` | Set to `1` to allow missing i18n keys during tests | |
| `OPENCODE_BUILD_FLAVOR` | Build flavor when building Android (e.g. `foss`) | |

## Screenshots

<img src="fastlane/metadata/android/en-US/images/phoneScreenshots/2.png" width="30%" /> <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/3.png" width="30%" /> <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/4.png" width="30%" />
<img src="fastlane/metadata/android/en-US/images/phoneScreenshots/5.png" width="30%" />

## Roadmap

See issues and [docs/known-gaps.md](docs/known-gaps.md).

## License & credits

Apache-2.0, see [LICENSE](LICENSE). Based on opencode-mobile.
