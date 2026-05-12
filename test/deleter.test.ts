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
  deleteButton: TestElement | null
  textDeleteButton: TestElement | null
  nestedConfirmDeleteButton: TestElement | null
  deleteCommentButton: TestElement
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
  assert.equal(root.deleteButton?.clicked, 0)
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
  assert.equal(root.deleteButton?.clicked, 1)
  assert.equal(root.confirmButton.clicked, 1)
})

test('finds a text-only delete action without clicking broader delete labels', async () => {
  const root = createRoot({ includeAriaDeleteButton: false, includeTextDeleteButton: true })
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
  assert.equal(root.textDeleteButton?.clicked, 1)
  assert.equal(root.deleteCommentButton.clicked, 0)
  assert.equal(root.confirmButton.clicked, 1)
})

test('clicks the interactive nested Bloks delete confirmation', async () => {
  const root = createRoot({ includeNestedConfirmDeleteButton: true })
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
  assert.equal(root.deleteButton?.clicked, 1)
  assert.equal(root.nestedConfirmDeleteButton?.clicked, 1)
  assert.equal(root.confirmButton.clicked, 0)
})

test('skips non-interactive nested Bloks delete wrappers', async () => {
  const nonInteractiveDeleteWrapper = createElement({
    ariaLabel: 'Delete',
    role: 'button',
    tagName: 'DIV',
    style: 'pointer-events: none;',
  })
  const interactiveDeleteButton = createElement({
    ariaLabel: 'Delete',
    role: 'button',
    tagName: 'DIV',
    style: 'pointer-events: auto;',
  })
  const root = createRoot({
    includeAriaDeleteButton: false,
    customAriaDeleteButtons: [nonInteractiveDeleteWrapper, interactiveDeleteButton],
  })
  const deleter = createInstagramCommentDeleter({
    root: root as unknown as Document,
    logger: createLogger(),
    delay: async () => {},
    dryRun: false,
    batchSize: 1,
    maxBatches: 1,
  })

  await deleter.deleteSelectedComments()

  assert.equal(nonInteractiveDeleteWrapper.clicked, 0)
  assert.equal(interactiveDeleteButton.clicked, 1)
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

function createRoot({
  includeSelectButton = true,
  includeClickableSelectDiv = false,
  includeAriaDeleteButton = true,
  includeTextDeleteButton = false,
  includeNestedConfirmDeleteButton = false,
  customAriaDeleteButtons = null,
}: {
  includeSelectButton?: boolean
  includeClickableSelectDiv?: boolean
  includeAriaDeleteButton?: boolean
  includeTextDeleteButton?: boolean
  includeNestedConfirmDeleteButton?: boolean
  customAriaDeleteButtons?: TestElement[] | null
} = {}): TestRoot {
  const roleButtons = [createElement({ textContent: 'Filters', role: 'button' })]
  if (includeSelectButton) roleButtons.push(createElement({ textContent: 'Select', role: 'button' }))

  const actionCandidates = [...roleButtons]
  if (includeClickableSelectDiv) {
    actionCandidates.push(createElement({ tagName: 'DIV', textContent: 'Select' }))
  }

  const checkboxes = Array.from({ length: 4 }, () => createElement())
  const deleteButton = includeAriaDeleteButton ? createElement({ ariaLabel: 'Delete', textContent: 'Delete' }) : null
  const textDeleteButton = includeTextDeleteButton ? createElement({ tagName: 'DIV', textContent: 'Delete' }) : null
  const nestedConfirmDeleteWrapper = includeNestedConfirmDeleteButton
    ? createElement({ ariaLabel: 'Delete', role: 'button', tagName: 'DIV', style: 'pointer-events: none;' })
    : null
  const nestedConfirmDeleteButton = includeNestedConfirmDeleteButton
    ? createElement({ ariaLabel: 'Delete', role: 'button', tagName: 'DIV', style: 'pointer-events: auto;' })
    : null
  const deleteCommentButton = createElement({ textContent: 'Delete comments', role: 'button' })
  const deleteCandidates = [textDeleteButton, deleteCommentButton].filter((element): element is TestElement => !!element)
  const confirmButton = createElement()
  const ariaDeleteButtons = customAriaDeleteButtons ?? [deleteButton].filter((element): element is TestElement => !!element)

  return {
    roleButtons,
    actionCandidates,
    checkboxes,
    deleteButton,
    textDeleteButton,
    nestedConfirmDeleteButton,
    deleteCommentButton,
    confirmButton,
    querySelector(selector) {
      if (selector === '[aria-label="Delete"]') return deleteButton
      if (selector === 'button[tabindex="0"]') return confirmButton
      return null
    },
    querySelectorAll(selector) {
      if (selector === '[aria-label="Delete"]') {
        return deleteButton && deleteButton.clicked > 0 && includeNestedConfirmDeleteButton
          ? [deleteButton, nestedConfirmDeleteWrapper, nestedConfirmDeleteButton].filter(
              (element): element is TestElement => !!element,
            )
          : ariaDeleteButtons
      }
      if (selector === '[role="button"]') return roleButtons
      if (selector === 'button,[role="button"],div') return actionCandidates
      if (selector === 'button,[role="button"],[tabindex],div') return deleteCandidates
      if (selector === '[aria-label="Toggle checkbox"]') return checkboxes
      return []
    },
  }
}

function createElement({
  textContent = '',
  tagName = 'BUTTON',
  role = null,
  ariaLabel = null,
  style = null,
}: {
  textContent?: string
  tagName?: string
  role?: string | null
  ariaLabel?: string | null
  style?: string | null
} = {}): TestElement {
  return {
    clicked: 0,
    tagName,
    textContent,
    click() {
      this.clicked += 1
    },
    getAttribute(name: string) {
      if (name === 'aria-label') return ariaLabel
      if (name === 'role') return role
      if (name === 'style') return style
      return null
    },
  }
}
