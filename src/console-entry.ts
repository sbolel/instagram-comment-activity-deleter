import { createInstagramCommentDeleter, type InstagramCommentDeleterOptions } from './deleter.ts'

declare global {
  var InstagramCommentActivityDeleter: {
    create: typeof createInstagramCommentDeleter
    run: typeof run
  }
}

async function run(options: InstagramCommentDeleterOptions = {}) {
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
