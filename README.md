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


## Development

```bash
pnpm install
pnpm dev
```
