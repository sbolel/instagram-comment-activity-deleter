import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createInstagramCommentDeleter, InstagramCommentDeletionError } from '../src/deleter.ts'

type TestElement = {
  clicked: number
  textContent: string
  tagName: string
  click: () => void
  getAttribute: (name: string) => string | null
}

type TestRoot = {
  roleButtons: TestElement[]
  actionCandidates: TestElement[]
  checkboxes: TestElement[]
  deleteButton: TestElement
  confirmButton: TestElement
  querySelector: (selector: string) => TestElement | null
  querySelectorAll: (selector: string) => TestElement[]
}

test('selects a limited batch in dry-run mode without deleting', async () => {
  const root = createRoot()
  const logs: unknown[][] = []
  const deleter = createInstagramCommentDeleter({
    root: root as unknown as Document,
    logger: createLogger(logs),
    delay: async () => {},
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

test('finds the current Instagram select control when it is a clickable div', async () => {
  const root = createRoot({ includeSelectButton: false, includeClickableSelectDiv: true })
  const deleter = createInstagramCommentDeleter({
    root: root as unknown as Document,
    logger: createLogger(),
    delay: async () => {},
    dryRun: true,
    batchSize: 1,
    maxBatches: 1,
  })

  const stats = await deleter.run()

  assert.equal(stats.commentsSelected, 1)
  assert.equal(root.actionCandidates[1].clicked, 1)
})

test('clicks delete and confirmation controls when dry-run is disabled', async () => {
  const root = createRoot()
  const deleter = createInstagramCommentDeleter({
    root: root as unknown as Document,
    logger: createLogger(),
    delay: async () => {},
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
    root: root as unknown as Document,
    logger: createLogger(),
    delay: async () => {},
    dryRun: true,
  })

  await assert.rejects(() => deleter.run(), {
    name: InstagramCommentDeletionError.name,
    message: 'Select button not found',
  })
})

function createLogger(target: unknown[][] = []) {
  return {
    info: (...args: unknown[]) => target.push(args),
  }
}

function createRoot({ includeSelectButton = true, includeClickableSelectDiv = false } = {}): TestRoot {
  const roleButtons = [createElement({ textContent: 'Filters', role: 'button' })]
  if (includeSelectButton) roleButtons.push(createElement({ textContent: 'Select', role: 'button' }))

  const actionCandidates = [...roleButtons]
  if (includeClickableSelectDiv) {
    actionCandidates.push(createElement({ tagName: 'DIV', textContent: 'Select' }))
  }

  const checkboxes = Array.from({ length: 4 }, () => createElement())
  const deleteButton = createElement()
  const confirmButton = createElement()

  return {
    roleButtons,
    actionCandidates,
    checkboxes,
    deleteButton,
    confirmButton,
    querySelector(selector) {
      if (selector === '[aria-label="Delete"]') return deleteButton
      if (selector === 'button[tabindex="0"]') return confirmButton
      return null
    },
    querySelectorAll(selector) {
      if (selector === '[role="button"]') return roleButtons
      if (selector === 'button,[role="button"],div') return actionCandidates
      if (selector === '[aria-label="Toggle checkbox"]') return checkboxes
      return []
    },
  }
}

function createElement({
  textContent = '',
  tagName = 'BUTTON',
  role = null,
}: {
  textContent?: string
  tagName?: string
  role?: string | null
} = {}): TestElement {
  return {
    clicked: 0,
    tagName,
    textContent,
    click() {
      this.clicked += 1
    },
    getAttribute(name: string) {
      if (name === 'role') return role
      return null
    },
  }
}
