const commentsSeed = [
  { author: 'alex', text: 'This launch thread helped me find the old comment quickly.' },
  { author: 'mira', text: 'Keeping this selected during dry run makes the behavior easier to review.' },
  { author: 'devon', text: 'The extension should only run on the Instagram comment activity page.' },
  { author: 'lina', text: 'Batch limits make the first pass easier to inspect before deletion.' },
  { author: 'omar', text: 'Resetting the page should clear selections without changing anything else.' },
]

const controls = requireElement('controls')
const dryRun = requireElement('dryRun')
const batchSize = requireElement('batchSize')
const maxBatches = requireElement('maxBatches')
const actionDelayMs = requireElement('actionDelayMs')
const checkboxDelayMs = requireElement('checkboxDelayMs')
const deleteConfirm = requireElement('deleteConfirm')
const confirmDelete = requireElement('confirmDelete')
const runButton = requireElement('runButton')
const resetButton = requireElement('resetButton')
const output = requireElement('output')
const comments = requireElement('comments')
const commentCount = requireElement('commentCount')

let commentState = commentsSeed.map((comment, index) => ({
  ...comment,
  id: index + 1,
  selected: false,
  deleted: false,
}))

renderComments()
updateDangerState()

dryRun.addEventListener('change', updateDangerState)
confirmDelete.addEventListener('input', updateDangerState)

controls.addEventListener('submit', (event) => {
  event.preventDefault()
  runDemo()
})

resetButton.addEventListener('click', () => {
  commentState = commentState.map((comment) => ({ ...comment, selected: false }))
  output.textContent = 'Selection reset.'
  renderComments()
})

function runDemo() {
  if (!dryRun.checked && confirmDelete.value !== 'DELETE') return

  const available = commentState.filter((comment) => !comment.deleted)
  const normalizedBatchSize = getNumber(batchSize)
  const normalizedMaxBatches = getNumber(maxBatches)
  const manualSelection = available.filter((comment) => comment.selected)
  const batchLimit = Math.min(normalizedBatchSize * normalizedMaxBatches, available.length)
  const selectedBatch = manualSelection.length > 0 ? manualSelection : available.slice(0, batchLimit)
  const batchCount = Math.ceil(selectedBatch.length / normalizedBatchSize)
  const selectedIds = new Set(selectedBatch.map((comment) => comment.id))

  commentState = commentState.map((comment) => ({
    ...comment,
    selected: selectedIds.has(comment.id),
  }))

  if (!dryRun.checked) {
    commentState = commentState.map((comment) => ({
      ...comment,
      deleted: comment.deleted || selectedIds.has(comment.id),
      selected: false,
    }))
  }

  renderComments()
  output.textContent = formatRunResult({
    batchesAttempted: selectedBatch.length > 0 ? batchCount : 0,
    commentsSelected: selectedBatch.length,
    dryRun: dryRun.checked,
    stoppedBecause: selectedBatch.length > 0 ? 'max-batches-reached' : 'no-comments-found',
  })
}

function renderComments() {
  comments.replaceChildren(
    ...commentState.map((comment) => {
      const item = document.createElement('li')
      item.className = ['comment', comment.selected ? 'selected' : '', comment.deleted ? 'deleted' : '']
        .filter(Boolean)
        .join(' ')

      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = comment.selected
      checkbox.disabled = comment.deleted
      checkbox.setAttribute('aria-label', `Select comment by ${comment.author}: ${comment.text}`)
      checkbox.addEventListener('change', () => {
        commentState = commentState.map((entry) =>
          entry.id === comment.id ? { ...entry, selected: checkbox.checked } : entry,
        )
        renderComments()
      })

      const body = document.createElement('div')
      const author = document.createElement('strong')
      author.textContent = `@${comment.author}`
      const text = document.createElement('p')
      text.textContent = comment.text

      body.append(author, text)
      item.append(checkbox, body)
      return item
    }),
  )

  const remaining = commentState.filter((comment) => !comment.deleted).length
  commentCount.textContent = `${remaining} ${remaining === 1 ? 'comment' : 'comments'}`
}

function updateDangerState() {
  deleteConfirm.hidden = dryRun.checked
  runButton.textContent = dryRun.checked ? 'Dry run' : 'Delete'
  runButton.disabled = !dryRun.checked && confirmDelete.value !== 'DELETE'
}

function getNumber(input) {
  const rawValue = Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : Number(input.value)
  const fallbackValue = Number.parseInt(input.defaultValue, 10)
  const minimumValue = Number.parseInt(input.min, 10)
  const maximumValue = Number.parseInt(input.max, 10)
  let normalizedValue = Number.isFinite(rawValue) ? rawValue : fallbackValue

  if (Number.isFinite(minimumValue)) normalizedValue = Math.max(normalizedValue, minimumValue)
  if (Number.isFinite(maximumValue)) normalizedValue = Math.min(normalizedValue, maximumValue)

  normalizedValue = Math.trunc(normalizedValue)
  input.value = String(normalizedValue)
  return normalizedValue
}

function formatRunResult(stats) {
  return [
    `Batches: ${stats.batchesAttempted}`,
    `Comments selected: ${stats.commentsSelected}`,
    `Mode: ${stats.dryRun ? 'dry run' : 'simulated local deletion'}`,
    `Stopped: ${stats.stoppedBecause}`,
    `Action delay: ${getNumber(actionDelayMs)}ms`,
    `Checkbox delay: ${getNumber(checkboxDelayMs)}ms`,
    `Max batches: ${getNumber(maxBatches)}`,
  ].join('\n')
}

function requireElement(id) {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing demo element: ${id}`)
  return element
}
