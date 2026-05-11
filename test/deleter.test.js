import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createInstagramCommentDeleter, InstagramCommentDeletionError } from '../src/deleter.js'

test('selects a limited batch in dry-run mode without deleting', async () => {
  const root = createRoot()
  const logs = []
  const deleter = createInstagramCommentDeleter({
    root,
    logger: createLogger(logs),
    delay: () => Promise.resolve(),
    dryRun: true,
    batchSize: 2,
    maxBatches: 1,
  })

  const stats = await deleter.run()

  assert.deepEqual(stats, {
    batchesAttempted: 1,
    commentsSelected: 2,
    dryRun: true,
    stoppedBecause: 'dry-run-complete',
  })
  assert.deepEqual(
    root.checkboxes.map((checkbox) => checkbox.clicked),
    [1, 1, 0, 0],
  )
  assert.equal(root.deleteButton.clicked, 0)
  assert.equal(logs[0][0], '[dry-run] Skipping delete confirmation flow')
})

test('clicks delete and confirmation controls when dry-run is disabled', async () => {
  const root = createRoot()
  const deleter = createInstagramCommentDeleter({
    root,
    logger: createLogger(),
    delay: () => Promise.resolve(),
    dryRun: false,
    batchSize: 1,
    maxBatches: 1,
  })

  const stats = await deleter.run()

  assert.equal(stats.commentsSelected, 1)
  assert.equal(stats.stoppedBecause, 'max-batches-reached')
  assert.equal(root.deleteButton.clicked, 1)
  assert.equal(root.confirmButton.clicked, 1)
})

test('throws a clear error when the select button is missing', async () => {
  const root = createRoot({ includeSelectButton: false })
  const deleter = createInstagramCommentDeleter({
    root,
    logger: createLogger(),
    delay: () => Promise.resolve(),
    dryRun: true,
  })

  await assert.rejects(() => deleter.run(), {
    name: InstagramCommentDeletionError.name,
    message: 'Select button not found',
  })
})

function createLogger(target = []) {
  return {
    info: (...args) => target.push(args),
  }
}

function createRoot({ includeSelectButton = true } = {}) {
  const buttons = [createElement({ textContent: 'Filters' })]
  if (includeSelectButton) buttons.push(createElement({ textContent: 'Select' }))

  const checkboxes = Array.from({ length: 4 }, () => createElement())
  const deleteButton = createElement()
  const confirmButton = createElement()

  return {
    buttons,
    checkboxes,
    deleteButton,
    confirmButton,
    querySelector(selector) {
      if (selector === '[aria-label="Delete"]') return deleteButton
      if (selector === 'button[tabindex="0"]') return confirmButton
      return null
    },
    querySelectorAll(selector) {
      if (selector === '[role="button"]') return buttons
      if (selector === '[aria-label="Toggle checkbox"]') return checkboxes
      return []
    },
  }
}

function createElement({ textContent = '' } = {}) {
  return {
    clicked: 0,
    textContent,
    click() {
      this.clicked += 1
    },
  }
}
