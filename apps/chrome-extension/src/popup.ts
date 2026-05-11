import type { DeletionStats } from '../../../src/deleter.ts'

type RunOptions = {
  batchSize: number
  maxBatches: number
  actionDelayMs: number
  checkboxDelayMs: number
  dryRun: boolean
}

type ExtensionResponse =
  | { ok: true; stats: DeletionStats; logs: string[] }
  | { ok: true; status: { running: boolean; lastStats: DeletionStats | null; lastError: string | null } }
  | { ok: true; reset: boolean }
  | { ok: false; error: string; details?: Record<string, unknown> }

const COMMENTS_ACTIVITY_URL = 'https://www.instagram.com/your_activity/interactions/comments'

const controls = requireElement<HTMLFormElement>('controls')
const pageStatus = requireElement<HTMLSpanElement>('pageStatus')
const output = requireElement<HTMLElement>('output')
const dryRun = requireElement<HTMLInputElement>('dryRun')
const batchSize = requireElement<HTMLInputElement>('batchSize')
const maxBatches = requireElement<HTMLInputElement>('maxBatches')
const actionDelayMs = requireElement<HTMLInputElement>('actionDelayMs')
const checkboxDelayMs = requireElement<HTMLInputElement>('checkboxDelayMs')
const deleteConfirm = requireElement<HTMLElement>('deleteConfirm')
const confirmDelete = requireElement<HTMLInputElement>('confirmDelete')
const runButton = requireElement<HTMLButtonElement>('runButton')
const resetButton = requireElement<HTMLButtonElement>('resetButton')

let activeTabId: number | null = null

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

function init(): void {
  bindControls()
  refreshActiveTab()
}

function bindControls(): void {
  dryRun.addEventListener('change', updateDangerState)
  confirmDelete.addEventListener('input', updateDangerState)
  controls.addEventListener('submit', (event) => {
    event.preventDefault()
    run()
  })
  resetButton.addEventListener('click', resetSelection)
}

async function refreshActiveTab(): Promise<void> {
  try {
    const [tab] = await chromeCall<chrome.tabs.Tab[]>((resolve) =>
      chrome.tabs.query({ active: true, currentWindow: true }, resolve),
    )
    activeTabId = tab?.id ?? null

    if (!tab?.url || !isSupportedUrl(tab.url) || activeTabId === null) {
      setBlocked(`Open ${COMMENTS_ACTIVITY_URL}`)
      return
    }

    pageStatus.textContent = 'Ready'
    pageStatus.className = 'badge ready'
    controls.querySelectorAll('input,button').forEach((element) => {
      ;(element as HTMLInputElement | HTMLButtonElement).disabled = false
    })
    updateDangerState()
    await sendStatus()
  } catch (error) {
    setBlocked(getErrorMessage(error))
  }
}

async function sendStatus(): Promise<void> {
  if (activeTabId === null) return
  const response = await sendMessage({ command: 'status' })

  if (!response.ok) {
    output.textContent = response.error
    return
  }

  if ('status' in response) {
    const { running, lastStats, lastError } = response.status
    output.textContent = formatStatus(running, lastStats, lastError)
  }
}

async function run(): Promise<void> {
  if (activeTabId === null) return
  if (!dryRun.checked && confirmDelete.value !== 'DELETE') return

  setBusy(true)
  output.textContent = 'Running...'

  try {
    const response = await sendMessage({ command: 'run', options: getRunOptions() })

    if (!response.ok) {
      output.textContent = response.error
      return
    }

    if ('stats' in response) {
      output.textContent = formatRunResult(response.stats, response.logs)
    }
  } catch (error) {
    output.textContent = getErrorMessage(error)
  } finally {
    setBusy(false)
  }
}

async function resetSelection(): Promise<void> {
  if (activeTabId === null) return

  setBusy(true)

  try {
    const response = await sendMessage({ command: 'reset' })
    output.textContent = response.ok && 'reset' in response && response.reset ? 'Selection reset.' : 'Nothing to reset.'
  } catch (error) {
    output.textContent = getErrorMessage(error)
  } finally {
    setBusy(false)
  }
}

async function sendMessage(message: unknown): Promise<ExtensionResponse> {
  await ensureContentScript()
  return chromeCall<ExtensionResponse>((resolve) =>
    chrome.tabs.sendMessage(activeTabId as number, message, (response) => resolve(response as ExtensionResponse)),
  )
}

async function ensureContentScript(): Promise<void> {
  await chromeCall<unknown[]>((resolve) =>
    chrome.scripting.executeScript(
      {
        target: { tabId: activeTabId as number },
        files: ['content.js'],
      },
      resolve,
    ),
  )
}

function setBlocked(message: string): void {
  pageStatus.textContent = 'Open page'
  pageStatus.className = 'badge blocked'
  output.textContent = message
  controls.querySelectorAll('input,button').forEach((element) => {
    ;(element as HTMLInputElement | HTMLButtonElement).disabled = true
  })
}

function setBusy(isBusy: boolean): void {
  runButton.disabled = isBusy || (!dryRun.checked && confirmDelete.value !== 'DELETE')
  resetButton.disabled = isBusy
}

function updateDangerState(): void {
  deleteConfirm.hidden = dryRun.checked
  runButton.textContent = dryRun.checked ? 'Dry run' : 'Delete'
  runButton.disabled = !dryRun.checked && confirmDelete.value !== 'DELETE'
}

function getRunOptions(): RunOptions {
  return {
    batchSize: getNumber(batchSize),
    maxBatches: getNumber(maxBatches),
    actionDelayMs: getNumber(actionDelayMs),
    checkboxDelayMs: getNumber(checkboxDelayMs),
    dryRun: dryRun.checked,
  }
}

function getNumber(input: HTMLInputElement): number {
  return Number.parseInt(input.value, 10)
}

function formatStatus(running: boolean, lastStats: DeletionStats | null, lastError: string | null): string {
  if (running) return 'A run is already in progress.'
  if (lastError) return `Last error: ${lastError}`
  if (lastStats) return formatRunResult(lastStats, [])
  return 'Dry run is enabled by default.'
}

function formatRunResult(stats: DeletionStats, logs: string[]): string {
  const lines = [
    `Batches: ${stats.batchesAttempted}`,
    `Comments selected: ${stats.commentsSelected}`,
    `Mode: ${stats.dryRun ? 'dry run' : 'delete'}`,
    `Stopped: ${stats.stoppedBecause ?? 'complete'}`,
  ]

  return [...lines, ...logs.slice(-3)].join('\n')
}

function isSupportedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.origin === 'https://www.instagram.com' && parsed.pathname === '/your_activity/interactions/comments'
  } catch {
    return false
  }
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing popup element: ${id}`)
  return element as T
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function chromeCall<T>(call: (resolve: (value: T) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    call((value) => {
      const error = chrome.runtime.lastError
      if (error) reject(new Error(error.message))
      else resolve(value)
    })
  })
}
