import { createInstagramCommentDeleter } from './deleter.js'

async function run(options = {}) {
  const deleter = createInstagramCommentDeleter(options)
  return deleter.run()
}

globalThis.InstagramCommentActivityDeleter = {
  create: createInstagramCommentDeleter,
  run,
}

console.info(
  'InstagramCommentActivityDeleter loaded. Start with: await InstagramCommentActivityDeleter.run({ dryRun: true, maxBatches: 1 })',
)
