import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readTaskProgress } from '../discovery/taskProgress'

async function changeDirWithTasks(content?: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'spectra-tasks-'))
  await mkdir(dir, { recursive: true })
  if (content !== undefined) {
    await writeFile(join(dir, 'tasks.md'), content, 'utf8')
  }
  return dir
}

describe('Derive task progress from tasks.md', () => {
  // One row per line of the spec's "checkbox parsing cases" example table.
  const rows: Array<{ line: string; counted: boolean; complete: boolean }> = [
    { line: '- [ ] 1.1 Implement scanner', counted: true, complete: false },
    { line: '- [x] 1.2 Write tests', counted: true, complete: true },
    { line: '- [X] 1.3 Update docs', counted: true, complete: true },
    { line: '  - [ ] 1.4 Nested subtask', counted: true, complete: false },
    { line: '- [ ] [P] 1.5 Parallel task', counted: true, complete: false },
    { line: '- [~] 1.6 Unknown marker', counted: false, complete: false },
    { line: '## 2. Section heading', counted: false, complete: false },
  ]

  it.each(rows)('$line', async ({ line, counted, complete }) => {
    const progress = await readTaskProgress(await changeDirWithTasks(line))
    if (!counted) {
      expect(progress).toBeUndefined()
    } else {
      expect(progress).toEqual({ complete: complete ? 1 : 0, total: 1 })
    }
  })

  it('ignores checkbox lines inside a fenced code block', async () => {
    const dir = await changeDirWithTasks(
      ['- [x] 1.1 Real task', '', '```markdown', '- [ ] inside a fenced block', '```', ''].join('\n'),
    )
    expect(await readTaskProgress(dir)).toEqual({ complete: 1, total: 1 })
  })

  it('counts a mixture of complete and incomplete items', async () => {
    const dir = await changeDirWithTasks(
      ['- [x] 1.1 done', '- [X] 1.2 done', '  - [ ] 1.3 pending', '- [ ] [P] 1.4 pending'].join('\n'),
    )
    expect(await readTaskProgress(dir)).toEqual({ complete: 2, total: 4 })
  })

  it('reports no progress when tasks.md is absent', async () => {
    expect(await readTaskProgress(await changeDirWithTasks())).toBeUndefined()
  })

  it('reports no progress when tasks.md has no counted checkbox', async () => {
    const dir = await changeDirWithTasks('## 1. Setup\n\nSome prose, no checkboxes.\n')
    expect(await readTaskProgress(dir)).toBeUndefined()
  })
})
