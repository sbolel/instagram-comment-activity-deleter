# Contributing

This is a private utility repository. Keep changes small, reviewed, and verified against local fixtures before running anything on Instagram.

## Workflow

1. Make source changes in `src/`.
2. Add or update tests in `test/`.
3. Run `npm run check`.
4. Review generated files in `dist/` before committing.

## Selector Changes

Selector changes must include a test that explains the Instagram markup assumption being changed. Do not broaden selectors in a way that can target unrelated page controls.

## Commit Style

Use conventional commit messages, for example:

```text
feat: add dry-run batch limit
fix: update delete confirmation selector
docs: clarify recovery workflow
```
