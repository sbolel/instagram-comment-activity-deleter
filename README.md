# Instagram Comment Activity Deleter

Private browser automation utility for deleting your own Instagram comment activity from the desktop web activity page.

This repository is the maintained version of the original gist at <https://gist.github.com/sbolel/a2b2bfde16b3ab185fbc2e2049240abc>.

## What It Does

- Opens Instagram's comment activity page in selection mode.
- Selects comments in small batches.
- Clicks Instagram's delete and confirmation controls.
- Waits between actions to avoid rushing the UI.
- Stops when no more selectable comments are visible.

The script runs in your browser against the page you already have open. It does not use Instagram credentials, APIs, or external services.

## Safety Notes

This is destructive automation. Review the generated script before running it.

- It is intended only for deleting comments from your own Instagram account.
- Instagram can change its page markup at any time, which can break selectors.
- Start with `dryRun: true` and a small `maxBatches` value before deleting anything.
- Keep the browser window focused on the Instagram comments activity page while it runs.

## Quick Start

Verify the repo:

```sh
npm install
npm run check
```

Build the browser-ready script:

```sh
npm run build
```

The build creates:

- `dist/instagram-comment-activity-deleter.console.js`
- `dist/instagram-comment-activity-deleter.user.js`
- `apps/chrome-extension/dist/`

Open Instagram's comments activity page:

```text
https://www.instagram.com/your_activity/interactions/comments
```

Paste the generated console script from `dist/instagram-comment-activity-deleter.console.js` into the browser console.

## Chrome Extension

The repo includes a Manifest V3 extension workspace at `apps/chrome-extension`.

Build it:

```sh
npm run build:extension
```

Load the generated extension folder as an unpacked extension:

1. Open your Chromium-based browser's extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
2. Enable Developer Mode.
3. Choose "Load unpacked".
4. Select the generated folder: `apps/chrome-extension/dist`.
5. Pin the extension from the browser toolbar if you want quick access.

After rebuilding, return to the extensions page and choose the extension's reload button so the browser picks up the new files.

The extension uses only `activeTab` and `scripting`, injects the content script after you open the popup, and enables itself only on:

```text
https://www.instagram.com/your_activity/interactions/comments
```

Dry run is enabled by default. To delete comments, turn off dry run and type `DELETE` in the confirmation field.

## Runtime Options

Edit the final invocation in the generated console script before running:

```js
await InstagramCommentActivityDeleter.run({
  dryRun: true,
  batchSize: 3,
  maxBatches: 1,
})
```

Common options:

- `dryRun`: selects comments but skips the delete confirmation flow.
- `batchSize`: number of comments selected per batch.
- `maxBatches`: optional cap for testing a limited run.
- `actionDelayMs`: delay between major actions.
- `checkboxDelayMs`: delay between checkbox clicks.
- `selectButtonTimeoutMs`: timeout for waiting on Instagram's select button.

## Development

TypeScript source lives in `src/`.

- `src/deleter.ts`: testable DOM automation engine.
- `src/console-entry.ts`: browser global entrypoint for generated scripts.
- `apps/chrome-extension/`: Manifest V3 extension workspace.
- `scripts/build.mjs`: creates browser-ready files in `dist/`.
- `scripts/build-extension.mjs`: creates unpacked extension files in `apps/chrome-extension/dist/`.
- `scripts/transpile-typescript.mjs`: stable TypeScript compiler-based transform used by the build scripts.
- `test/`: Node test coverage using lightweight DOM fakes.

Run all checks:

```sh
npm run check
```

The generated browser scripts have no runtime dependencies. Development uses TypeScript for strict type checking.

## Releases

Releases are automated with Semantic Release on pushes to `main`. The repository uses Conventional Commits to calculate SemVer versions and create GitHub releases.

- `package.json` intentionally stays at `0.0.0-semantic-release`.
- Release tags use `v${version}`.
- Release assets include the console script, userscript, and unpacked Chrome extension files.
- PR titles and commit messages must follow Conventional Commits.
