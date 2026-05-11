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
npm run check
```

Build the browser-ready script:

```sh
npm run build
```

Open Instagram's comments activity page:

```text
https://www.instagram.com/your_activity/interactions/comments
```

Paste the generated console script from `dist/instagram-comment-activity-deleter.console.js` into the browser console.

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

Source lives in `src/`.

- `src/deleter.js`: testable DOM automation engine.
- `src/console-entry.js`: browser global entrypoint for generated scripts.
- `scripts/build.mjs`: creates browser-ready files in `dist/`.
- `test/`: Node test coverage using dependency-free DOM fakes.

Run all checks:

```sh
npm run check
```

The project intentionally has no runtime or development dependencies.
