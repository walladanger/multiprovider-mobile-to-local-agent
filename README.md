# multiprovider-mobile-to-local-agent

A mobile client (Android, iOS, web) for a local agent server. It is compatible
with the [OpenCode](https://opencode.ai/) server API: connect to a server you
run, then start and continue sessions, review and approve actions, browse
files, use the terminal and dictate prompts from your phone.

Built with React Native, Expo, Expo Router and TypeScript.

## Connecting to a server

```bash
opencode serve --port 4096
```

Expose the server through authenticated HTTPS, a VPN or a secure tunnel (for
example `cloudflared tunnel --url localhost:4096`), then enter its URL in the
app. Do not expose an unauthenticated port to the internet.

## Development

Requires Node `^22.12.0 || ^24.0.0 || >=26.0.0` (see `.nvmrc`).

```bash
npm ci
npm start              # Expo dev server
npm run android        # build and run on Android
npm run ios            # build and run on iOS
npm run web            # run in the browser
```

Checks:

```bash
npm run lint
npm run typecheck
npm run test:vitest
npm run test:ci:static
```

Release builds: `npm run build:android`, `npm run build:foss:android`,
`npm run build:ios:local`. See [docs/development.md](docs/development.md) for
details.

## License

Apache-2.0, see [LICENSE](LICENSE). Based on opencode-mobile by Alvaro Lorente, licensed under Apache-2.0.
