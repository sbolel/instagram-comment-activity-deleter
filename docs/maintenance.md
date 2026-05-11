# Maintenance Notes

## Selector Strategy

Instagram's DOM is unstable. Keep selectors conservative and scoped to accessible labels or roles where possible.

Current selector assumptions:

- Select mode is exposed as one of the page's `[role="button"]` elements.
- Comment checkboxes use `[aria-label="Toggle checkbox"]`.
- Delete action uses `[aria-label="Delete"]`.
- Delete confirmation is a focusable button with `tabindex="0"`.

When selectors change:

1. Capture a minimal sanitized HTML fixture.
2. Add a failing test that represents the new markup.
3. Update selectors or selection strategy.
4. Run `npm run check`.

## Release Checklist

1. `npm run check`
2. Review `dist/instagram-comment-activity-deleter.console.js`
3. Commit source, tests, docs, and generated `dist/` files
4. Keep repository private
