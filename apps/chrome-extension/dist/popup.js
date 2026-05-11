/**
 * Instagram Comment Activity Deleter extension popup.
 * Generated from TypeScript. Do not edit directly.
 */
const COMMENTS_ACTIVITY_URL = 'https://www.instagram.com/your_activity/interactions/comments';
const controls = requireElement('controls');
const pageStatus = requireElement('pageStatus');
const output = requireElement('output');
const dryRun = requireElement('dryRun');
const batchSize = requireElement('batchSize');
const maxBatches = requireElement('maxBatches');
const actionDelayMs = requireElement('actionDelayMs');
const checkboxDelayMs = requireElement('checkboxDelayMs');
const deleteConfirm = requireElement('deleteConfirm');
const confirmDelete = requireElement('confirmDelete');
const runButton = requireElement('runButton');
const resetButton = requireElement('resetButton');
const openPageButton = requireElement('openPageButton');
let activeTabId = null;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
}
else {
    init();
}
function init() {
    bindControls();
    refreshActiveTab();
}
function bindControls() {
    dryRun.addEventListener('change', updateDangerState);
    confirmDelete.addEventListener('input', updateDangerState);
    controls.addEventListener('submit', (event) => {
        event.preventDefault();
        run();
    });
    resetButton.addEventListener('click', resetSelection);
    openPageButton.addEventListener('click', openCommentsPage);
}
async function refreshActiveTab() {
    try {
        const [tab] = await chromeCall((resolve) => chrome.tabs.query({ active: true, currentWindow: true }, resolve));
        activeTabId = tab?.id ?? null;
        if (!tab?.url || !isSupportedUrl(tab.url) || activeTabId === null) {
            setBlocked('Open the comments activity page to enable controls.');
            return;
        }
        pageStatus.textContent = 'Ready';
        pageStatus.className = 'badge ready';
        openPageButton.hidden = true;
        controls.querySelectorAll('input,button').forEach((element) => {
            ;
            element.disabled = false;
        });
        updateDangerState();
        await sendStatus();
    }
    catch (error) {
        setBlocked(getErrorMessage(error));
    }
}
async function sendStatus() {
    if (activeTabId === null)
        return;
    const response = await sendMessage({ command: 'status' });
    if (!response.ok) {
        output.textContent = response.error;
        return;
    }
    if ('status' in response) {
        const { running, lastStats, lastError } = response.status;
        output.textContent = formatStatus(running, lastStats, lastError);
    }
}
async function run() {
    if (activeTabId === null)
        return;
    if (!dryRun.checked && confirmDelete.value !== 'DELETE')
        return;
    setBusy(true);
    output.textContent = 'Running...';
    try {
        const response = await sendMessage({ command: 'run', options: getRunOptions() });
        if (!response.ok) {
            output.textContent = response.error;
            return;
        }
        if ('stats' in response) {
            output.textContent = formatRunResult(response.stats, response.logs);
        }
    }
    catch (error) {
        output.textContent = getErrorMessage(error);
    }
    finally {
        setBusy(false);
    }
}
async function resetSelection() {
    if (activeTabId === null)
        return;
    setBusy(true);
    try {
        const response = await sendMessage({ command: 'reset' });
        output.textContent = response.ok && 'reset' in response && response.reset ? 'Selection reset.' : 'Nothing to reset.';
    }
    catch (error) {
        output.textContent = getErrorMessage(error);
    }
    finally {
        setBusy(false);
    }
}
async function sendMessage(message) {
    await ensureContentScript();
    return chromeCall((resolve) => chrome.tabs.sendMessage(activeTabId, message, (response) => resolve(response)));
}
async function ensureContentScript() {
    await chromeCall((resolve) => chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        files: ['content.js'],
    }, resolve));
}
function setBlocked(message) {
    pageStatus.textContent = 'Open page';
    pageStatus.className = 'badge blocked';
    output.textContent = message;
    openPageButton.hidden = false;
    openPageButton.disabled = false;
    controls.querySelectorAll('input,button').forEach((element) => {
        ;
        element.disabled = true;
    });
}
async function openCommentsPage() {
    openPageButton.disabled = true;
    try {
        await chromeCall((resolve) => chrome.tabs.create({ url: COMMENTS_ACTIVITY_URL }, resolve));
        window.close();
    }
    catch (error) {
        output.textContent = getErrorMessage(error);
        openPageButton.disabled = false;
    }
}
function setBusy(isBusy) {
    runButton.disabled = isBusy || (!dryRun.checked && confirmDelete.value !== 'DELETE');
    resetButton.disabled = isBusy;
}
function updateDangerState() {
    deleteConfirm.hidden = dryRun.checked;
    runButton.textContent = dryRun.checked ? 'Dry run' : 'Delete';
    runButton.disabled = !dryRun.checked && confirmDelete.value !== 'DELETE';
}
function getRunOptions() {
    return {
        batchSize: getNumber(batchSize),
        maxBatches: getNumber(maxBatches),
        actionDelayMs: getNumber(actionDelayMs),
        checkboxDelayMs: getNumber(checkboxDelayMs),
        dryRun: dryRun.checked,
    };
}
function getNumber(input) {
    return Number.parseInt(input.value, 10);
}
function formatStatus(running, lastStats, lastError) {
    if (running)
        return 'A run is already in progress.';
    if (lastError)
        return `Last error: ${lastError}`;
    if (lastStats)
        return formatRunResult(lastStats, []);
    return 'Dry run is enabled by default.';
}
function formatRunResult(stats, logs) {
    const lines = [
        `Batches: ${stats.batchesAttempted}`,
        `Comments selected: ${stats.commentsSelected}`,
        `Mode: ${stats.dryRun ? 'dry run' : 'delete'}`,
        `Stopped: ${stats.stoppedBecause ?? 'complete'}`,
    ];
    return [...lines, ...logs.slice(-3)].join('\n');
}
function isSupportedUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.origin === 'https://www.instagram.com' && parsed.pathname === '/your_activity/interactions/comments';
    }
    catch {
        return false;
    }
}
function requireElement(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`Missing popup element: ${id}`);
    return element;
}
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function chromeCall(call) {
    return new Promise((resolve, reject) => {
        call((value) => {
            const error = chrome.runtime.lastError;
            if (error)
                reject(new Error(error.message));
            else
                resolve(value);
        });
    });
}

