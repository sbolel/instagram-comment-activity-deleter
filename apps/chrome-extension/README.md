# Chrome Extension

Manifest V3 extension wrapper for the shared Instagram Comment Activity Deleter engine.

## Build

```sh
npm run build:extension
```

The unpacked extension is generated at `apps/chrome-extension/dist`.

## Load In A Chromium Browser

Build first so `apps/chrome-extension/dist` exists.

1. Open the extensions page for your browser:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
   - Arc or other Chromium browsers: open the browser's extension management page.
2. Enable Developer Mode.
3. Choose "Load unpacked".
4. Select this exact generated folder from the repo:

   ```text
   apps/chrome-extension/dist
   ```

5. Confirm that "Instagram Comment Activity Deleter" appears in the extensions list.
6. Pin it from the browser toolbar if you want direct access.

## Reload After Changes

After rebuilding the extension:

```sh
npm run build:extension
```

Return to the browser extensions page and click the reload button on "Instagram Comment Activity Deleter". Reload the Instagram tab too if it was already open.

If the browser says the manifest cannot be read, make sure you selected `apps/chrome-extension/dist`, not `apps/chrome-extension` or `apps/chrome-extension/src`.

## Use

1. Open `https://www.instagram.com/your_activity/interactions/comments`.
2. Open the extension popup.
3. Run the default dry run first.
4. Use "Reset selection" to leave the page in a normal state after a dry run.
5. To delete, turn off dry run and type `DELETE`.

The extension requests only `activeTab` and `scripting`; it injects the packaged content script after you click the popup on the supported Instagram activity page.
