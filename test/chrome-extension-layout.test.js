import { readFile } from 'node:fs/promises'
import test from 'node:test'
import assert from 'node:assert/strict'

test('Chrome extension manifest uses narrow MV3 permissions', async () => {
  const manifest = JSON.parse(await readFile('apps/chrome-extension/public/manifest.json', 'utf8'))

  assert.equal(manifest.manifest_version, 3)
  assert.deepEqual(manifest.permissions, ['scripting'])
  assert.deepEqual(manifest.host_permissions, ['https://www.instagram.com/*'])
})

test('Chrome extension popup avoids inline script', async () => {
  const popup = await readFile('apps/chrome-extension/public/popup.html', 'utf8')

  assert.match(popup, /<script src="popup\.js"><\/script>/)
  assert.doesNotMatch(popup, /<script(?![^>]*\ssrc=)[^>]*>/)
  assert.doesNotMatch(popup, /\son\w+=/)
})

test('Chrome extension popup includes a blocked-state open page action', async () => {
  const popup = await readFile('apps/chrome-extension/public/popup.html', 'utf8')
  const styles = await readFile('apps/chrome-extension/public/popup.css', 'utf8')

  assert.match(popup, /id="openPageButton"/)
  assert.match(popup, /Open comments page/)
  assert.match(styles, /overflow-wrap:\s*anywhere/)
  assert.match(styles, /width:\s*480px/)
  assert.match(styles, /min-width:\s*480px/)
  assert.doesNotMatch(styles, /max-width:\s*100vw/)
  assert.match(styles, /overflow-x:\s*hidden/)
  assert.match(styles, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(styles, /max-height:\s*156px/)
  assert.match(styles, /overflow-y:\s*auto/)
})
