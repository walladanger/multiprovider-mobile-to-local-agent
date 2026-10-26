# Pairing links and QR codes

The app accepts three kinds of pairing input, from the in-app scanner **and** from the phone's camera app / links:

1. **Universal v1 links** (new):
   `opencodemobile://connect?v=1&type=opencode&url=http://192.168.1.5:4096&code=<one-time code>`
   or the same query on `https://<pairing host>/connect?...` (Android App Link).
   `url` may repeat (one per reachable address). `type` is one of `opencode`, `models`, `invoke`, `comfyui`;
   only `opencode` is implemented, the others show "coming soon". `pair=<legacy pair URL>` is also accepted for opencode.
2. **Existing OpenCode pair URLs / QR payloads** (`.../auth/connect/<code>`, `.../connect#<data>`, JSON) — unchanged.

Parsing lives in `lib/pairing/universal.ts` (registry: `CONNECTION_TYPES`, `registerConnectionType`). The
in-app scanner flow (`components/settings/connection-scan-flow.tsx`) and `lib/opencode/pairing.ts` are unchanged;
links open the `app/connect.tsx` screen, which asks for confirmation and then uses the same pair/save/connect calls.

## Android App Link host

The host defaults to `opencode.8466crosstimbers.com` (path `/connect*`, `autoVerify`). Override at build time with
`EXPO_PAIRING_HOST=your.host`. For Android to verify the link (open the app directly, no chooser), the host must serve
`https://<host>/.well-known/assetlinks.json` with `Content-Type: application/json` and no redirects:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "app.getopencode",
    "sha256_cert_fingerprints": ["<SHA-256 of the signing certificate>"]
  }
}]
```

Use the package of the build you install (`app.getopencode`, `app.getopencode.dev` for development builds, or your
`EXPO_ANDROID_PACKAGE`). Get the fingerprint with `apksigner verify --print-certs app.apk` or
`keytool -list -v -keystore release.keystore`; for Play builds use the App signing key from Play Console. List several
fingerprints (debug + release) if needed. Check with
`adb shell pm get-app-links <package>` after install. Without a valid file the link still works but shows a chooser
or opens the browser; the `opencodemobile://` scheme always works.

The page at `https://<host>/connect` should, for desktop browsers, show the same QR or a hint to open it on the phone.

## Printing a QR in the terminal

```sh
PAIR_CODE=<one-time code> node scripts/make-pair-qr.mjs --type opencode --url http://192.168.1.5:4096
node scripts/make-pair-qr.mjs --type comfyui --url http://192.168.1.5:8188
```

Options: `--url` (repeatable), `--https` to encode the https App Link form instead of the custom scheme,
`--host` to override the host. The code is read from `PAIR_CODE` (not argv, so it stays out of shell history and
process lists) and is never printed as text.
