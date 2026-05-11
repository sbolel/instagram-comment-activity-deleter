# Chrome Extension

Manifest V3 extension wrapper for the shared Instagram Comment Activity Deleter engine.

## Build

```sh
npm run build:extension
```

The unpacked extension is generated at `apps/chrome-extension/dist`.

## Load

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Choose "Load unpacked".
4. Select `apps/chrome-extension/dist`.

## Use

1. Open `https://www.instagram.com/your_activity/interactions/comments`.
2. Open the extension popup.
3. Run the default dry run first.
4. Use "Reset selection" to leave the page in a normal state after a dry run.
5. To delete, turn off dry run and type `DELETE`.

The extension requests only `activeTab` and `scripting`; it injects the packaged content script after you click the popup on the supported Instagram activity page.
