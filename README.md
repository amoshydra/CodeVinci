# CodeVinci

`Build` • `Create` • `Share` • [`amoshydra.github.io/CodeVinci`](https://amoshydra.github.io/CodeVinci/)

CodeVinci is an open source interactive JavaScript playground built with esbuild that run fully in the browser.

<img width="903" height="791" alt="codevinci" src="https://github.com/user-attachments/assets/d73e67b1-7a23-48c6-90ce-76a9789aabc4" />


## Features

- Local code transpilation via esbuild-wasm
- Importing ESM node modules from URL
- TypeScript / JSX
- Syntax highlight for HTML and CSS inserted via `Element.insertAdjacentHTML`
- Console log view
- View / Edit / Open in new tab view
- Mobile / touch friendly


### Sharing codes

#### (1) via base64 (`v=H4sIAAAAAAA...`)

Example: [`amoshydra.github.io/CodeVinci`/#?`v`=`H4sIAAAAAA...CAAA==`](https://amoshydra.github.io/CodeVinci/#v=H4sIAAAAAAAAA1WQzW7CMBCE73mKFSrCaUKSIvojAkhVL1Qql1KpV0KyIW6NrdoLBSHevXZCRJF8WO9%2Bs55xofLtBiVFK1UcIi4NanouvrLc9mYf8zfWWWGpNKIsOiEsPYBxnsldZqbj%2BFy4nqGDQFcBjLRSBEfIlVC6b%2FIKNziCItPfKZRKUr%2FMNlwcRmAyafr2PV7CqVY2%2B6y0Qr6uaAR3SZLCLy%2BoqutuzY3j82NLP%2FVyJQ21wgkUbZqfLerDAgXmpDTrNEDnIqC9pZtutEZ6sb5wT6w3KHoWEkhAFkhSzyC92pneZYIxHyZTOHqt06i2ZjkuJepPd0nbUROhnc3qW2qV9i%2BZW88nNhofD11CHgR%2BvRacsajkQixcRKteVkawmyMP6BQ%2BJt3wIen6y%2FAKfbcZ2cVBPIAA5hlVUa4M4%2FFTQPEw8W95%2BN%2FKhTJcXlP39vjOqvtsCoLUO4UwcK0%2FQi6G%2FCwCAAA%3D)



#### (2) via url (`e=https://...`)

Example: [`https://amoshydra.github.io/CodeVinci`/#?`e`=`https://gist.githubusercontent.com/amoshydra/beee25fce3fc0d17be4bc2b146a08660/raw/0e2fee9ac2745d1a3283bd32ee97ba89826af460/threejs-procedural-player.tsx`](https://amoshydra.github.io/CodeVinci/#?e=https://gist.githubusercontent.com/amoshydra/beee25fce3fc0d17be4bc2b146a08660/raw/0e2fee9ac2745d1a3283bd32ee97ba89826af460/threejs-procedural-player.tsx)


## WebMCP (site tools)

CodeVinci exposes the editor to browser agents through [WebMCP](https://webmachinelearning.github.io/webmcp/), so an agent can call structured tools instead of clicking the editor.

| Tool | Access | Returns |
|---|---|---|
| `get_code` | read | the code currently in the editor |
| `get_editor_status` | read | whether the disclaimer is accepted, plus code length |
| `get_console` | read | recent preview console output, one `[level] message` per line |
| `set_code` | write | replaces the file, pushes an undo snapshot |
| `apply_edits` | write | exact-text search/replace, using the same validation as the AI panel |

**Requirements.** Chrome 149+ or Edge 150+ with `chrome://flags/#enable-webmcp-testing` enabled, or the origin trial token for a deployed origin. In ChatGPT's desktop app the tools show up as "Site tools". Safari and Firefox do not implement it; the tools simply never register there.

**The disclaimer gate matters.** Tools are registered as soon as the app boots, but `set_code` and `apply_edits` fail with an explicit "accept the disclaimer" error until the user accepts it. `get_code` and `get_console` work before that. The disclaimer is stored in `sessionStorage`, so it is re-asked every new tab.

**Annotations are advisory.** `readOnlyHint`, `consequentialHint` and `untrustedContentHint` are hints to the agent, and not every transport preserves them — the MCP-B relay, for example, keeps only `readOnlyHint`.

**Testing.** Open DevTools → Application → WebMCP to list tools and run them by hand. For an agent-driven test, install the Model Context Tool Inspector extension.

**Phones.** Android Chrome has no shipped WebMCP consumer, so a polyfill such as `@mcp-b/global` must be injected before the app module. The hosted build sets `connect-src 'self'`, which blocks loopback relay sockets — serve a local build from `127.0.0.1` if you need that path.

## Development

```bash
pnpm install
pnpm dev
```
