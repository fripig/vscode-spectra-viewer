import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { TaskProgress } from './model'

/** A checkbox list item: any bullet marker, then `[ ]`, `[x]` or `[X]`. */
const CHECKBOX = /^[-*+]\s+\[([ xX])\]/
/** A fenced code block delimiter, either backticks or tildes. */
const FENCE = /^(```|~~~)/

/**
 * Counts the checkbox items in a change's `tasks.md`.
 *
 * Returns `undefined` when the file is missing, unreadable, or holds no
 * counted checkbox — all three mean "no progress information", which the
 * caller turns into Draft status.
 */
export async function readTaskProgress(changeDir: string): Promise<TaskProgress | undefined> {
  let content: string
  try {
    content = await readFile(join(changeDir, 'tasks.md'), 'utf8')
  } catch {
    return undefined
  }

  let complete = 0
  let total = 0
  let inFence = false

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trimStart()

    if (FENCE.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) {
      continue
    }

    const match = CHECKBOX.exec(line)
    if (match === null) {
      continue
    }
    total += 1
    if (match[1] !== ' ') {
      complete += 1
    }
  }

  return total === 0 ? undefined : { complete, total }
}
