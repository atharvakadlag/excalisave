Attempting to recover my mozzila account due to loss of 2FA 
3878b3be90a54f1a94fe70f1e16af534

<p align="center"><img width="64px" alt="Icon" src="./src/assets/icons/128.png"></p>
<h1 align="center">Excalisave</h1>
<p align="center">Save your Excalidraw drawings</p>

## ✨ Features

- 💾 Save your drawing
- 🖼️ Preview your drawings
- 🔎 Search your drawings
- ❤️ Favorites
- 📂 Organize your drawings in collections
- 📤 Import/Export
- and more...

<img width="1397" alt="Screenshot 2024-02-17 at 11 36 48 PM" src="https://github.com/dantecalderon/excalisave/assets/18385321/f7282312-7e41-40dd-a5ac-604c9b8de6fa">

## 📥 Install

| [![Chrome](https://raw.github.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png)](https://chrome.google.com/webstore/detail/excalisave/obnjfbgikjcdfnbnmdamffacjfpankih) | [![Firefox](https://raw.github.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png)](https://addons.mozilla.org/en-US/firefox/addon/excalisave/) |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 88 & later ✔                                                                                                                                                                     | To be published                                                                                                                                           |

## ⚒️ Development

Ensure you have

- [Node.js](https://nodejs.org) 20 or later installed (Suggested: Install via [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm))
- [Yarn](https://yarnpkg.com) 4 installed (via corepack or mise)

Then run the following:

- `yarn install --immutable` to install dependencies.
- `yarn run dev:chrome` to start the development server for chrome extension
- `yarn run dev:firefox` to start the development server for firefox addon
- `yarn run dev:opera` to start the development server for opera extension
- `yarn run build:chrome` to build chrome extension
- `yarn run build:firefox` to build firefox addon
- `yarn run build:opera` to build opera extension
- `yarn run build` builds and packs extensions all at once to extension/ directory

### Install extension for development

- `yarn install --immutable` to install dependencies.
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
  - ⚠️ Ensure that you grant the necessary permissions for the extension to function correctly

- ### Opera

  - Load the extension via `opera:extensions`
  - Check the `Developer Mode` and load as unpacked from extension’s extracted directory.
