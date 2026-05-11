import { spawn } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

const files = []

for (const root of ['src', 'scripts', 'test']) {
  await collectJavaScriptFiles(root)
}

await Promise.all(files.map(checkFile))

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      await collectJavaScriptFiles(path)
    } else if (/\.[cm]?js$/.test(entry.name)) {
      files.push(path)
    }
  }
}

function checkFile(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--check', file], {
      stdio: 'inherit',
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Syntax check failed: ${file}`))
    })
  })
}
