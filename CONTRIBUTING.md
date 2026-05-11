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

Use Conventional Commit messages. Semantic Release uses these messages to calculate the next SemVer version after a merge to `main`.

```text
feat: add dry-run batch limit
fix: update delete confirmation selector
docs: clarify recovery workflow
```

Release impact:

- `fix:` and `perf:` create patch releases.
- `feat:` creates minor releases.
- `BREAKING CHANGE:` footers, or commits with `!` after the type or scope, create major releases.
- `docs:`, `test:`, `refactor:`, `build:`, `ci:`, `chore:`, and `style:` do not create releases by default unless they include a breaking-change marker.

Keep PR titles Conventional Commit compliant because squash merges use the PR title as the release commit subject.
