type DelayFunction = (ms: number) => Promise<void>

type Logger = Pick<Console, 'info'>

type DomRoot = Pick<Document, 'querySelector' | 'querySelectorAll'> | Pick<Element, 'querySelector' | 'querySelectorAll'>

type ClickableElement = Element & {
  click: () => void
}

type SelectorConfig = {
  pageButtons: string
  checkbox: string
  deleteButton: string
  confirmButton: string
}

type NormalizedOptions = {
  batchSize: number
  actionDelayMs: number
  checkboxDelayMs: number
  selectButtonTimeoutMs: number
  elementTimeoutMs: number
  pollIntervalMs: number
  dryRun: boolean
  maxBatches: number
}

export type DeletionStopReason = 'no-comments-found' | 'dry-run-complete' | 'max-batches-reached' | null

export type DeletionStats = {
  batchesAttempted: number
  commentsSelected: number
  dryRun: boolean
  stoppedBecause: DeletionStopReason
}

export type InstagramCommentDeleterOptions = Partial<NormalizedOptions> & {
  selectors?: Partial<SelectorConfig>
  root?: DomRoot
  logger?: Logger
  delay?: DelayFunction
}

export type InstagramCommentDeleter = {
  run: () => Promise<DeletionStats>
  waitForElement: (selector: string, timeoutMs?: number) => Promise<Element>
  getSelectButton: () => Element | null
  selectBatch: () => Promise<number>
  deleteSelectedComments: () => Promise<void>
}

export const DEFAULT_OPTIONS: Readonly<NormalizedOptions> = Object.freeze({
  batchSize: 3,
  actionDelayMs: 1000,
  checkboxDelayMs: 300,
  selectButtonTimeoutMs: 60_000,
  elementTimeoutMs: 30_000,
  pollIntervalMs: 100,
  dryRun: false,
  maxBatches: Number.POSITIVE_INFINITY,
})

const DEFAULT_SELECTORS: Readonly<SelectorConfig> = Object.freeze({
  pageButtons: 'button,[role="button"],div',
  checkbox: '[aria-label="Toggle checkbox"]',
  deleteButton: '[aria-label="Delete"]',
  confirmButton: 'button[tabindex="0"]',
})

export class InstagramCommentDeletionError extends Error {
  details: Record<string, unknown>

  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'InstagramCommentDeletionError'
    this.details = details
  }
}

export function createInstagramCommentDeleter(options: InstagramCommentDeleterOptions = {}): InstagramCommentDeleter {
  const config = normalizeOptions(options)
  const selectors = { ...DEFAULT_SELECTORS, ...options.selectors }
  const root = options.root ?? globalThis.document
  const logger = options.logger ?? globalThis.console
  const delay = options.delay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))

  if (!root?.querySelector || !root?.querySelectorAll) {
    throw new InstagramCommentDeletionError('A DOM document or root element is required')
  }

  const wait = (ms: number) => delay(ms)

  async function waitForElement(selector: string, timeoutMs = config.elementTimeoutMs): Promise<Element> {
    const startedAt = Date.now()

    while (Date.now() - startedAt < timeoutMs) {
      const element = root.querySelector(selector)
      if (element) return element
      await wait(config.pollIntervalMs)
    }

    throw new InstagramCommentDeletionError(`Element not found: ${selector}`, {
      selector,
      timeoutMs,
    })
  }

  async function clickElement(element: ClickableElement | null, label: string): Promise<void> {
    if (!element) {
      throw new InstagramCommentDeletionError(`Missing element: ${label}`)
    }

    element.click()
    await wait(config.actionDelayMs)
  }

  function getSelectButton(): Element | null {
    const buttons = Array.from(root.querySelectorAll(selectors.pageButtons))
    return buttons.find((button) => getElementLabel(button) === 'Select') ?? null
  }

  async function waitForSelectButton(): Promise<void> {
    const startedAt = Date.now()

    while (Date.now() - startedAt < config.selectButtonTimeoutMs) {
      if (getSelectButton()) return
      await wait(1000)
    }

    throw new InstagramCommentDeletionError('Select button did not reappear after deletion', {
      timeoutMs: config.selectButtonTimeoutMs,
    })
  }

  async function selectBatch(): Promise<number> {
    const checkboxes = Array.from(root.querySelectorAll(selectors.checkbox))
    const selected = checkboxes.slice(0, config.batchSize)

    for (const checkbox of selected) {
      asClickable(checkbox, 'comment checkbox')?.click()
      await wait(config.checkboxDelayMs)
    }

    return selected.length
  }

  async function deleteSelectedComments(): Promise<void> {
    if (config.dryRun) {
      logger.info('[dry-run] Skipping delete confirmation flow')
      return
    }

    const deleteButton = asClickable(await waitForElement(selectors.deleteButton), 'delete button')
    await clickElement(deleteButton, 'delete button')

    const confirmButton = asClickable(await waitForElement(selectors.confirmButton), 'confirm delete button')
    await clickElement(confirmButton, 'confirm delete button')
  }

  async function run(): Promise<DeletionStats> {
    const stats: DeletionStats = {
      batchesAttempted: 0,
      commentsSelected: 0,
      dryRun: config.dryRun,
      stoppedBecause: null,
    }

    while (stats.batchesAttempted < config.maxBatches) {
      const selectButton = getSelectButton()
      if (!selectButton) {
        throw new InstagramCommentDeletionError('Select button not found')
      }

      await clickElement(asClickable(selectButton, 'select button'), 'select button')

      const selectedCount = await selectBatch()
      if (selectedCount === 0) {
        stats.stoppedBecause = 'no-comments-found'
        logger.info('No more selectable comments found')
        break
      }

      stats.batchesAttempted += 1
      stats.commentsSelected += selectedCount

      await wait(config.actionDelayMs)
      await deleteSelectedComments()

      if (config.dryRun) {
        stats.stoppedBecause = 'dry-run-complete'
        break
      }

      await waitForSelectButton()
    }

    if (!stats.stoppedBecause) {
      stats.stoppedBecause = 'max-batches-reached'
    }

    logger.info('Instagram comment deletion run complete', stats)
    return stats
  }

  return {
    run,
    waitForElement,
    getSelectButton,
    selectBatch,
    deleteSelectedComments,
  }
}

function normalizeOptions(options: InstagramCommentDeleterOptions): NormalizedOptions {
  const config = { ...DEFAULT_OPTIONS, ...options }

  for (const key of ['batchSize', 'actionDelayMs', 'checkboxDelayMs', 'elementTimeoutMs', 'pollIntervalMs'] as const) {
    if (!Number.isFinite(config[key]) || config[key] < 0) {
      throw new InstagramCommentDeletionError(`Invalid numeric option: ${key}`)
    }
  }

  if (!Number.isFinite(config.selectButtonTimeoutMs) || config.selectButtonTimeoutMs <= 0) {
    throw new InstagramCommentDeletionError('Invalid numeric option: selectButtonTimeoutMs')
  }

  if (
    config.maxBatches !== Number.POSITIVE_INFINITY &&
    (!Number.isFinite(config.maxBatches) || config.maxBatches < 1)
  ) {
    throw new InstagramCommentDeletionError('Invalid numeric option: maxBatches')
  }

  config.batchSize = Math.floor(config.batchSize)
  config.maxBatches = Math.floor(config.maxBatches)

  return config
}

function asClickable(element: Element | null, label: string): ClickableElement | null {
  if (!element) return null

  if (typeof (element as Partial<ClickableElement>).click !== 'function') {
    throw new InstagramCommentDeletionError(`Element is not clickable: ${label}`)
  }

  return element as ClickableElement
}

function getElementLabel(element: Element): string {
  return (element.getAttribute('aria-label') ?? element.textContent ?? '').trim()
}
