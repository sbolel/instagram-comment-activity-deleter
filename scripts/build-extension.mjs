import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { stripTypeScriptTypes } from 'node:module'

const packageRoot = 'apps/chrome-extension'
const sourceRoot = join(packageRoot, 'src')
const publicRoot = join(packageRoot, 'public')
const distRoot = join(packageRoot, 'dist')

await mkdir(distRoot, { recursive: true })
await cp(publicRoot, distRoot, { recursive: true })

const engineSource = await readFile('src/deleter.ts', 'utf8')
const strippedEngine = stripTypeScriptTypes(engineSource, { mode: 'transform' })
  .replace(/^export type .+$/gm, '')
  .replace(/^export const DEFAULT_OPTIONS/gm, 'const DEFAULT_OPTIONS')
  .replace(/^export class InstagramCommentDeletionError/gm, 'class InstagramCommentDeletionError')
  .replace(/^export function createInstagramCommentDeleter/gm, 'function createInstagramCommentDeleter')

const contentSource = await readFile(join(sourceRoot, 'content.ts'), 'utf8')
const popupSource = await readFile(join(sourceRoot, 'popup.ts'), 'utf8')

await writeJavaScript(
  join(distRoot, 'content.js'),
  `/**
 * Instagram Comment Activity Deleter extension content script.
 * Generated from TypeScript. Do not edit directly.
 */
;(() => {
${strippedEngine}

${stripTypeScriptTypes(contentSource, { mode: 'transform' })}
})()
`,
)

await writeJavaScript(
  join(distRoot, 'popup.js'),
  `/**
 * Instagram Comment Activity Deleter extension popup.
 * Generated from TypeScript. Do not edit directly.
 */
${stripTypeScriptTypes(popupSource, { mode: 'transform' })}
`,
)

console.log(`Built Chrome extension in ${distRoot}/`)

async function writeJavaScript(path, source) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, source)
}
