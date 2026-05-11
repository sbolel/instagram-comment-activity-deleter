import { readFile } from 'node:fs/promises'
import test from 'node:test'
import assert from 'node:assert/strict'

test('Chrome extension manifest uses narrow MV3 permissions', async () => {
  const manifest = JSON.parse(await readFile('apps/chrome-extension/public/manifest.json', 'utf8'))

  assert.equal(manifest.manifest_version, 3)
  assert.deepEqual(manifest.permissions, ['activeTab', 'scripting'])
  assert.equal(manifest.host_permissions, undefined)
})

test('Chrome extension popup avoids inline script', async () => {
  const popup = await readFile('apps/chrome-extension/public/popup.html', 'utf8')

  assert.match(popup, /<script src="popup\.js"><\/script>/)
  assert.doesNotMatch(popup, /<script(?![^>]*\ssrc=)[^>]*>/)
  assert.doesNotMatch(popup, /\son\w+=/)
})
