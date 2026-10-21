# Connection setup

## Manual setup and local V2 pairing

Settings and onboarding share an address → details flow. Continue probes without
switching the active connection. Confirmed V2 hides Username (Basic auth uses
`opencode` internally); V1 shows it. Authentication-blocked detection asks for
credentials and offers a collapsed custom username, then probes again on save.
Back, Change and retry preserve fields. Name is optional and defaults to the
normalized hostname. Edits save without automatically reconnecting.

On Android/iOS, the **Scan QR code** choice is a dedicated local setup flow that
accepts the code shown by `opencode pair`. The phone and server must share a
reachable network; the server must listen beyond localhost. It uses the native
permission gate and scanner, and never falls
back to the manual address form. The camera fills the screen behind an opaque
appbar, with the `opencode pair` instructions, scan progress and recovery
messages overlaid on top instead of sharing a scrollable step layout. FOSS builds
omit the camera module and keep manual address entry. Camera denial or Back
returns to the connection method chooser; backgrounding suspends the preview. A
successful scan saves and connects automatically. Invalid codes allow rescan;
expired/used codes ask users to run `opencode pair` again. A failed save or
connect keeps the redeemed credential and offers Retry plus Scan again without
re-pairing.

The provider handles pairing and persistence; protocol validation/redemption live
in `lib/opencode/pairing.ts`. Current one-use codes become session-token passwords;
older V2 credential QR formats remain supported. Failed save/connect retries reuse
the credential and existing profile ID. See [API contract](api-contract.md#local-v2-pairing).
