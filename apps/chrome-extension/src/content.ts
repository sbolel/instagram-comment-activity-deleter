import type {
  DeletionStats,
  InstagramCommentDeleter,
  InstagramCommentDeleterOptions,
} from '../../../src/deleter.ts'

declare const createInstagramCommentDeleter: (options?: InstagramCommentDeleterOptions) => InstagramCommentDeleter
declare class InstagramCommentDeletionError extends Error {
  details: Record<string, unknown>
  constructor(message: string, details?: Record<string, unknown>)
}

type ExtensionState = {
  installed: boolean
  running: boolean
  lastStats: DeletionStats | null
  lastError: string | null
}

type RunMessage = {
  command: 'run'
  options: {
    batchSize: number
    maxBatches: number
    actionDelayMs: number
    checkboxDelayMs: number
    dryRun: boolean
  }
}

type ResetMessage = {
  command: 'reset'
}

type StatusMessage = {
  command: 'status'
}

type RuntimeMessage = RunMessage | ResetMessage | StatusMessage

type ResponsePayload =
  | { ok: true; stats: DeletionStats; logs: string[] }
  | { ok: true; status: Omit<ExtensionState, 'installed'> }
  | { ok: true; reset: boolean }
  | { ok: false; error: string; details?: Record<string, unknown> }

const state = ((globalThis as typeof globalThis & { __ICAD_EXTENSION__?: ExtensionState }).__ICAD_EXTENSION__ ??= {
  installed: false,
  running: false,
  lastStats: null,
  lastError: null,
})

if (!state.installed) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handleMessage(message as RuntimeMessage).then(sendResponse)
    return true
  })

  state.installed = true
}

async function handleMessage(message: RuntimeMessage): Promise<ResponsePayload> {
  try {
    if (!isCommentsActivityPage()) {
      throw new InstagramCommentDeletionError('Open the Instagram comments activity page before running.')
    }

    if (message.command === 'status') {
      return {
        ok: true,
        status: {
          running: state.running,
          lastStats: state.lastStats,
          lastError: state.lastError,
        },
      }
    }

    if (message.command === 'reset') {
      return { ok: true, reset: resetSelection() }
    }

    if (message.command === 'run') {
      return await runDeletion(message.options)
    }

    throw new InstagramCommentDeletionError('Unsupported extension command')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    state.lastError = message

    return {
      ok: false,
      error: message,
      details: error instanceof InstagramCommentDeletionError ? error.details : undefined,
    }
  }
}

async function runDeletion(options: RunMessage['options']): Promise<ResponsePayload> {
  if (state.running) {
    throw new InstagramCommentDeletionError('A deletion run is already in progress.')
  }

  state.running = true
  state.lastError = null
  const logs: string[] = []

  try {
    const deleter = createInstagramCommentDeleter({
      ...options,
      logger: {
        info: (...items: unknown[]) => {
          logs.push(items.map(formatLogItem).join(' '))
        },
      },
    })
    const stats = await deleter.run()

    state.lastStats = stats
    return { ok: true, stats, logs }
  } finally {
    state.running = false
  }
}

function resetSelection(): boolean {
  const cancelButton = Array.from(document.querySelectorAll('button,[role="button"],div')).find(
    (element) => (element.getAttribute('aria-label') ?? element.textContent ?? '').trim() === 'Cancel',
  ) as (Element & { click?: () => void }) | undefined

  if (!cancelButton?.click) return false
  cancelButton.click()
  return true
}

function isCommentsActivityPage(): boolean {
  return location.origin === 'https://www.instagram.com' && location.pathname === '/your_activity/interactions/comments'
}

function formatLogItem(item: unknown): string {
  if (typeof item === 'string') return item

  try {
    return JSON.stringify(item)
  } catch {
    return String(item)
  }
}
