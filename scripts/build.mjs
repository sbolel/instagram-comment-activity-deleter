import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'

const banner = `/**
 * Instagram Comment Activity Deleter
 * Private browser automation utility. Review before running.
 */`

await mkdir('dist', { recursive: true })

const source = await readFile('src/deleter.ts', 'utf8')
const strippedSource = stripTypeScriptTypes(source, { mode: 'transform' })
const browserSource = strippedSource
  .replace('export const DEFAULT_OPTIONS', 'const DEFAULT_OPTIONS')
  .replace('export class InstagramCommentDeletionError', 'class InstagramCommentDeletionError')
  .replace('export function createInstagramCommentDeleter', 'function createInstagramCommentDeleter')

const consoleScript = `${banner}
;(() => {
${browserSource}

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
`

await writeFile('dist/instagram-comment-activity-deleter.console.js', consoleScript)

const userScript = `// ==UserScript==
// @name         Instagram Comment Activity Deleter
// @namespace    https://github.com/sbolel/instagram-comment-activity-deleter
// @version      0.1.0
// @description  Private utility for deleting your own Instagram comment activity in controlled batches.
// @match        https://www.instagram.com/your_activity/interactions/comments*
// @grant        none
// ==/UserScript==

${consoleScript}`

await writeFile('dist/instagram-comment-activity-deleter.user.js', userScript)

console.log('Built browser scripts in dist/')
