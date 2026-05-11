import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { transpileTypeScript } from './transpile-typescript.mjs'

const packageRoot = 'apps/chrome-extension'
const sourceRoot = join(packageRoot, 'src')
const publicRoot = join(packageRoot, 'public')
const distRoot = join(packageRoot, 'dist')

await mkdir(distRoot, { recursive: true })
await cp(publicRoot, distRoot, { recursive: true })

const engineSource = await readFile('src/deleter.ts', 'utf8')
const strippedEngine = transpileTypeScript(engineSource, 'src/deleter.ts')
  .replace(/^export type .+$/gm, '')
  .replace(/^export const DEFAULT_OPTIONS/gm, 'const DEFAULT_OPTIONS')
  .replace(/^export class InstagramCommentDeletionError/gm, 'class InstagramCommentDeletionError')
  .replace(/^export function createInstagramCommentDeleter/gm, 'function createInstagramCommentDeleter')

const contentSource = await readFile(join(sourceRoot, 'content.ts'), 'utf8')
const popupSource = await readFile(join(sourceRoot, 'popup.ts'), 'utf8')
const strippedContent = transpileTypeScript(contentSource, join(sourceRoot, 'content.ts'))
const strippedPopup = transpileTypeScript(popupSource, join(sourceRoot, 'popup.ts'))

await writeJavaScript(
  join(distRoot, 'content.js'),
  `/**
 * Instagram Comment Activity Deleter extension content script.
 * Generated from TypeScript. Do not edit directly.
 */
;(() => {
${strippedEngine}

${strippedContent}
})()
`,
)

await writeJavaScript(
  join(distRoot, 'popup.js'),
  `/**
 * Instagram Comment Activity Deleter extension popup.
 * Generated from TypeScript. Do not edit directly.
 */
${strippedPopup}
`,
)

console.log(`Built Chrome extension in ${distRoot}/`)

async function writeJavaScript(path, source) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, source)
}
