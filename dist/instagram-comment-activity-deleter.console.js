/**
 * Instagram Comment Activity Deleter
 * Private browser automation utility. Review before running.
 */
;(() => {
const DEFAULT_OPTIONS = Object.freeze({
    batchSize: 3,
    actionDelayMs: 1000,
    checkboxDelayMs: 300,
    selectButtonTimeoutMs: 60_000,
    elementTimeoutMs: 30_000,
    pollIntervalMs: 100,
    dryRun: false,
    maxBatches: Number.POSITIVE_INFINITY,
});
const DEFAULT_SELECTORS = Object.freeze({
    pageButtons: 'button,[role="button"],div',
    checkbox: '[aria-label="Toggle checkbox"]',
    deleteButton: '[aria-label="Delete"]',
    deleteButtonCandidates: 'button,[role="button"],[tabindex],div',
    confirmButton: 'button[tabindex="0"]',
});
class InstagramCommentDeletionError extends Error {
    details;
    constructor(message, details = {}) {
        super(message);
        this.name = 'InstagramCommentDeletionError';
        this.details = details;
    }
}
function createInstagramCommentDeleter(options = {}) {
    const config = normalizeOptions(options);
    const selectors = { ...DEFAULT_SELECTORS, ...options.selectors };
    const root = options.root ?? globalThis.document;
    const logger = options.logger ?? globalThis.console;
    const delay = options.delay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    if (!root?.querySelector || !root?.querySelectorAll) {
        throw new InstagramCommentDeletionError('A DOM document or root element is required');
    }
    const wait = (ms) => delay(ms);
    async function waitForElement(selector, timeoutMs = config.elementTimeoutMs) {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
            const element = root.querySelector(selector);
            if (element)
                return element;
            await wait(config.pollIntervalMs);
        }
        throw new InstagramCommentDeletionError(`Element not found: ${selector}`, {
            selector,
            timeoutMs,
        });
    }
    async function waitForDeleteButton() {
        const startedAt = Date.now();
        while (Date.now() - startedAt < config.elementTimeoutMs) {
            const labelledDeleteButton = root.querySelector(selectors.deleteButton);
            if (labelledDeleteButton)
                return labelledDeleteButton;
            const textDeleteButton = Array.from(root.querySelectorAll(selectors.deleteButtonCandidates)).find((element) => getElementLabel(element) === 'Delete');
            if (textDeleteButton)
                return textDeleteButton;
            await wait(config.pollIntervalMs);
        }
        throw new InstagramCommentDeletionError('Delete button not found', {
            selector: selectors.deleteButton,
            fallbackSelector: selectors.deleteButtonCandidates,
            fallbackLabel: 'Delete',
            timeoutMs: config.elementTimeoutMs,
        });
    }
    async function clickElement(element, label) {
        if (!element) {
            throw new InstagramCommentDeletionError(`Missing element: ${label}`);
        }
        element.click();
        await wait(config.actionDelayMs);
    }
    function getSelectButton() {
        const buttons = Array.from(root.querySelectorAll(selectors.pageButtons));
        return buttons.find((button) => getElementLabel(button) === 'Select') ?? null;
    }
    async function waitForSelectButton() {
        const startedAt = Date.now();
        while (Date.now() - startedAt < config.selectButtonTimeoutMs) {
            if (getSelectButton())
                return;
            await wait(1000);
        }
        throw new InstagramCommentDeletionError('Select button did not reappear after deletion', {
            timeoutMs: config.selectButtonTimeoutMs,
        });
    }
    async function selectBatch() {
        const checkboxes = Array.from(root.querySelectorAll(selectors.checkbox));
        const selected = checkboxes.slice(0, config.batchSize);
        for (const checkbox of selected) {
            asClickable(checkbox, 'comment checkbox')?.click();
            await wait(config.checkboxDelayMs);
        }
        return selected.length;
    }
    async function deleteSelectedComments() {
        if (config.dryRun) {
            logger.info('[dry-run] Skipping delete confirmation flow');
            return;
        }
        const deleteButton = asClickable(await waitForDeleteButton(), 'delete button');
        await clickElement(deleteButton, 'delete button');
        const confirmButton = asClickable(await waitForElement(selectors.confirmButton), 'confirm delete button');
        await clickElement(confirmButton, 'confirm delete button');
    }
    async function run() {
        const stats = {
            batchesAttempted: 0,
            commentsSelected: 0,
            dryRun: config.dryRun,
            stoppedBecause: null,
        };
        while (stats.batchesAttempted < config.maxBatches) {
            const selectButton = getSelectButton();
            if (!selectButton) {
                throw new InstagramCommentDeletionError('Select button not found');
            }
            await clickElement(asClickable(selectButton, 'select button'), 'select button');
            const selectedCount = await selectBatch();
            if (selectedCount === 0) {
                stats.stoppedBecause = 'no-comments-found';
                logger.info('No more selectable comments found');
                break;
            }
            stats.batchesAttempted += 1;
            stats.commentsSelected += selectedCount;
            await wait(config.actionDelayMs);
            await deleteSelectedComments();
            if (config.dryRun) {
                stats.stoppedBecause = 'dry-run-complete';
                break;
            }
            await waitForSelectButton();
        }
        if (!stats.stoppedBecause) {
            stats.stoppedBecause = 'max-batches-reached';
        }
        logger.info('Instagram comment deletion run complete', stats);
        return stats;
    }
    return {
        run,
        waitForElement,
        getSelectButton,
        selectBatch,
        deleteSelectedComments,
    };
}
function normalizeOptions(options) {
    const config = { ...DEFAULT_OPTIONS, ...options };
    for (const key of ['batchSize', 'actionDelayMs', 'checkboxDelayMs', 'elementTimeoutMs', 'pollIntervalMs']) {
        if (!Number.isFinite(config[key]) || config[key] < 0) {
            throw new InstagramCommentDeletionError(`Invalid numeric option: ${key}`);
        }
    }
    if (!Number.isFinite(config.selectButtonTimeoutMs) || config.selectButtonTimeoutMs <= 0) {
        throw new InstagramCommentDeletionError('Invalid numeric option: selectButtonTimeoutMs');
    }
    if (config.maxBatches !== Number.POSITIVE_INFINITY &&
        (!Number.isFinite(config.maxBatches) || config.maxBatches < 1)) {
        throw new InstagramCommentDeletionError('Invalid numeric option: maxBatches');
    }
    config.batchSize = Math.floor(config.batchSize);
    config.maxBatches = Math.floor(config.maxBatches);
    return config;
}
function asClickable(element, label) {
    if (!element)
        return null;
    if (typeof element.click !== 'function') {
        throw new InstagramCommentDeletionError(`Element is not clickable: ${label}`);
    }
    return element;
}
function getElementLabel(element) {
    return (element.getAttribute('aria-label') ?? element.textContent ?? '').trim();
}


async function run(options = {}) {
  const deleter = createInstagramCommentDeleter(options)
  return deleter.run()
}

globalThis.InstagramCommentActivityDeleter = {
  create: createInstagramCommentDeleter,
  run,
  InstagramCommentDeletionError,
}

console.info(
  'InstagramCommentActivityDeleter loaded. Start with: await InstagramCommentActivityDeleter.run({ dryRun: true, maxBatches: 1 })',
)
})()
