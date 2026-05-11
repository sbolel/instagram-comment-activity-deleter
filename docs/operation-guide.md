# Operation Guide

## Preflight

1. Log in to Instagram in a desktop browser.
2. Navigate to `https://www.instagram.com/your_activity/interactions/comments`.
3. Scroll or filter until the comments you want to remove are in scope.
4. Open the browser console.
5. Paste the generated script from `dist/instagram-comment-activity-deleter.console.js`.

## Recommended First Run

Use dry-run mode first:

```js
await InstagramCommentActivityDeleter.run({
  dryRun: true,
  batchSize: 3,
  maxBatches: 1,
})
```

Confirm the script selects the expected comments, then refresh the page to clear selections.

## Deleting Comments

After dry-run validation, run:

```js
await InstagramCommentActivityDeleter.run({
  dryRun: false,
  batchSize: 3,
  maxBatches: 1,
})
```

Increase `maxBatches` only after confirming the first deletion batch behaves correctly.

## Stop Conditions

The script stops when:

- no selectable comments are found,
- `maxBatches` is reached,
- Instagram's select button fails to return after deletion,
- a required delete or confirm control is missing.

## Recovery

If Instagram changes the activity page markup, stop using the generated script and update selectors in `src/deleter.ts`. Add or update a fixture in `test/fixtures/` before changing behavior.
