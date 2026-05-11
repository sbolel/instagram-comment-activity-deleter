import assert from 'node:assert/strict'
import { access, readdir } from 'node:fs/promises'
import { test } from 'node:test'

test('repository uses TypeScript source, tests, and compiler configuration', async () => {
  await access('tsconfig.json')

  const sourceFiles = await readdir('src')
  const testFiles = await readdir('test')

  assert(sourceFiles.some((file) => file.endsWith('.ts')), 'expected TypeScript source files in src/')
  assert(testFiles.some((file) => file.endsWith('.test.ts')), 'expected TypeScript tests in test/')
  assert(!sourceFiles.some((file) => file.endsWith('.js')), 'expected src/ to avoid JavaScript source files')
})
