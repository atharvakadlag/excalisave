<h1 align="center">💾 Excalisave</h1>
<p align="center">Save your Excalidraw drawings</p>

## Features

- Save your drawing
- Preview of your drawings
- Search your drawings
<img width="1589" alt="Screenshot 2023-11-11 at 9 27 21 AM" src="https://github.com/dantecalderon/excalisave/assets/18385321/fe408c31-102d-4241-a363-5aa9c52f0868">



## Browser Support

| [![Chrome](https://raw.github.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png)](https://chrome.google.com/webstore/detail/excalisave/obnjfbgikjcdfnbnmdamffacjfpankih) | [![Firefox](https://raw.github.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png)](https://addons.mozilla.org/en-US/firefox/addon/excalisave/) |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 88 & later ✔                                                                                  | To be published                                                                                  |

## 🚀 Quick Start

Ensure you have

- [Node.js](https://nodejs.org) 20 or later installed (Suggested: Install via [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm))
- [Yarn](https://yarnpkg.com) v1 or v2 installed (`npm i -g yarn`)

Then run the following:

- `yarn install --frozen-lockfile` to install dependencies.
- `yarn run dev:chrome` to start the development server for chrome extension
- `yarn run dev:firefox` to start the development server for firefox addon
- `yarn run dev:opera` to start the development server for opera extension
- `yarn run build:chrome` to build chrome extension
- `yarn run build:firefox` to build firefox addon
- `yarn run build:opera` to build opera extension
- `yarn run build` builds and packs extensions all at once to extension/ directory

### Development

- `yarn install --frozen-lockfile` to install dependencies.
- To watch file changes in development

  - Chrome
    - `yarn run dev:chrome`
  - Firefox
    - `yarn run dev:firefox`
  - Opera
    - `yarn run dev:opera`

- **Load extension in browser**

- ### Chrome

  - Go to the browser address bar and type `chrome://extensions`
  - Check the `Developer Mode` button to enable it.
  - Click on the `Load Unpacked Extension…` button.
  - Select your browsers folder in `extension/`.

- ### Firefox

  - Load the Add-on via `about:debugging` as temporary Add-on.
  - Choose the `manifest.json` file in the extracted directory
  - ⚠️ Make sure to accept the permission for the extension to work properly.

- ### Opera

  - Load the extension via `opera:extensions`
  - Check the `Developer Mode` and load as unpacked from extension’s extracted directory.
