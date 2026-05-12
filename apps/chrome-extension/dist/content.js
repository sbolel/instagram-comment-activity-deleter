/**
 * Instagram Comment Activity Deleter extension content script.
 * Generated from TypeScript. Do not edit directly.
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
    async function waitForDeleteButton(excludedElement = null) {
        const startedAt = Date.now();
        while (Date.now() - startedAt < config.elementTimeoutMs) {
            const deleteButton = chooseDeleteButtonCandidate(excludedElement);
            if (deleteButton)
                return deleteButton;
            await wait(config.pollIntervalMs);
        }
        throw new InstagramCommentDeletionError('Delete button not found', {
            selector: selectors.deleteButton,
            fallbackSelector: selectors.deleteButtonCandidates,
            fallbackLabel: 'Delete',
            timeoutMs: config.elementTimeoutMs,
        });
    }
    async function waitForConfirmDeleteButton(excludedElement) {
        const startedAt = Date.now();
        while (Date.now() - startedAt < config.elementTimeoutMs) {
            const deleteButton = chooseDeleteButtonCandidate(excludedElement);
            if (deleteButton)
                return deleteButton;
            const confirmButton = root.querySelector(selectors.confirmButton);
            if (confirmButton)
                return confirmButton;
            await wait(config.pollIntervalMs);
        }
        throw new InstagramCommentDeletionError('Confirm delete button not found', {
            deleteSelector: selectors.deleteButton,
            confirmSelector: selectors.confirmButton,
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
        const deleteElement = await waitForDeleteButton();
        const deleteButton = asClickable(deleteElement, 'delete button');
        await clickElement(deleteButton, 'delete button');
        const confirmButton = asClickable(await waitForConfirmDeleteButton(deleteElement), 'confirm delete button');
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
    function chooseDeleteButtonCandidate(excludedElement) {
        const labelledDeleteButtons = Array.from(root.querySelectorAll(selectors.deleteButton));
        const textDeleteButtons = Array.from(root.querySelectorAll(selectors.deleteButtonCandidates)).filter((element) => getElementLabel(element) === 'Delete');
        return chooseClickableCandidate([...labelledDeleteButtons, ...textDeleteButtons], excludedElement);
    }
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
function chooseClickableCandidate(elements, excludedElement) {
    const uniqueElements = Array.from(new Set(elements)).filter((element) => element !== excludedElement);
    if (uniqueElements.length === 0)
        return null;
    const interactiveElements = uniqueElements.filter(hasPointerEvents);
    return interactiveElements[interactiveElements.length - 1] ?? null;
}
function hasPointerEvents(element) {
    const inlineStyle = element.getAttribute('style');
    if (inlineStyle && /pointer-events\s*:\s*none/i.test(inlineStyle))
        return false;
    if (inlineStyle && /pointer-events\s*:\s*auto/i.test(inlineStyle))
        return true;
    const getComputedStyle = globalThis.getComputedStyle;
    if (typeof getComputedStyle === 'function' && element instanceof globalThis.Element) {
        return getComputedStyle(element).pointerEvents !== 'none';
    }
    return true;
}


const state = (globalThis.__ICAD_EXTENSION__ ??= {
    installed: false,
    running: false,
    lastStats: null,
    lastError: null,
});
if (!state.installed) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        handleMessage(message).then(sendResponse);
        return true;
    });
    state.installed = true;
}
async function handleMessage(message) {
    try {
        if (!isCommentsActivityPage()) {
            throw new InstagramCommentDeletionError('Open the Instagram comments activity page before running.');
        }
        if (message.command === 'status') {
            return {
                ok: true,
                status: {
                    running: state.running,
                    lastStats: state.lastStats,
                    lastError: state.lastError,
                },
            };
        }
        if (message.command === 'reset') {
            return { ok: true, reset: resetSelection() };
        }
        if (message.command === 'run') {
            return await runDeletion(message.options);
        }
        throw new InstagramCommentDeletionError('Unsupported extension command');
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        state.lastError = message;
        return {
            ok: false,
            error: message,
            details: error instanceof InstagramCommentDeletionError ? error.details : undefined,
        };
    }
}
async function runDeletion(options) {
    if (state.running) {
        throw new InstagramCommentDeletionError('A deletion run is already in progress.');
    }
    state.running = true;
    state.lastError = null;
    const logs = [];
    try {
        const deleter = createInstagramCommentDeleter({
            ...options,
            logger: {
                info: (...items) => {
                    logs.push(items.map(formatLogItem).join(' '));
                },
            },
        });
        const stats = await deleter.run();
        state.lastStats = stats;
        return { ok: true, stats, logs };
    }
    finally {
        state.running = false;
    }
}
function resetSelection() {
    const cancelButton = Array.from(document.querySelectorAll('button,[role="button"],div')).find((element) => (element.getAttribute('aria-label') ?? element.textContent ?? '').trim() === 'Cancel');
    if (!cancelButton?.click)
        return false;
    cancelButton.click();
    return true;
}
function isCommentsActivityPage() {
    return location.origin === 'https://www.instagram.com' && location.pathname === '/your_activity/interactions/comments';
}
function formatLogItem(item) {
    if (typeof item === 'string')
        return item;
    try {
        return JSON.stringify(item);
    }
    catch {
        return String(item);
    }
}

})()
