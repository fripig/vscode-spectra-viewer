import { chmod, mkdtemp, mkdir, readFile, readdir, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ChangeGroup, ChangeStatus } from '../discovery/model'
import { isSpectraWorkspace, scanChanges } from '../discovery/scanner'

async function tempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'spectra-scan-'))
}

/** Creates a change directory, optionally seeding files inside it. */
async function makeChange(dir: string, files: Record<string, string> = {}): Promise<void> {
  await mkdir(dir, { recursive: true })
  for (const [relative, content] of Object.entries(files)) {
    const target = join(dir, relative)
    await mkdir(join(target, '..'), { recursive: true })
    await writeFile(target, content, 'utf8')
  }
}

const names = (changes: readonly { name: string }[]): string[] => changes.map((c) => c.name).sort()

describe('Scan changes from all three Spectra sources', () => {
  it('places each change in the group matching its source directory', async () => {
    // The spec's "mixed layout" example, with its exact directory names.
    const root = await tempRoot()
    await makeChange(join(root, 'openspec', 'changes', 'add-search'))
    await makeChange(join(root, 'openspec', 'changes', 'archive', 'old-login'))
    await makeChange(join(root, '.git', 'spectra-app', 'changes', 'dark-mode'))

    const snapshot = await scanChanges(root)

    expect(names(snapshot[ChangeGroup.Active])).toEqual(['add-search'])
    expect(names(snapshot[ChangeGroup.Archived])).toEqual(['old-login'])
    expect(names(snapshot[ChangeGroup.Parked])).toEqual(['dark-mode'])
  })

  it('does not treat the archive directory as an active change', async () => {
    const root = await tempRoot()
    await makeChange(join(root, 'openspec', 'changes', 'archive', 'old-login'))

    const snapshot = await scanChanges(root)

    expect(names(snapshot[ChangeGroup.Active])).not.toContain('archive')
    expect(names(snapshot[ChangeGroup.Active])).toEqual([])
  })

  it('leaves a group empty when its source directory is absent', async () => {
    const root = await tempRoot()
    await makeChange(join(root, 'openspec', 'changes', 'add-search'))

    const snapshot = await scanChanges(root)

    expect(names(snapshot[ChangeGroup.Active])).toEqual(['add-search'])
    expect(snapshot[ChangeGroup.Parked]).toEqual([])
    expect(snapshot[ChangeGroup.Archived]).toEqual([])
  })

  it('ignores files sitting beside change directories', async () => {
    const root = await tempRoot()
    await makeChange(join(root, 'openspec', 'changes', 'add-search'))
    await writeFile(join(root, 'openspec', 'changes', 'notes.md'), 'stray\n', 'utf8')

    expect(names((await scanChanges(root))[ChangeGroup.Active])).toEqual(['add-search'])
  })

  it('reports every discovered change regardless of order', async () => {
    const root = await tempRoot()
    for (const name of ['zebra-fix', 'add-search', 'mid-tier']) {
      await makeChange(join(root, 'openspec', 'changes', name))
    }

    expect(names((await scanChanges(root))[ChangeGroup.Active])).toEqual([
      'add-search',
      'mid-tier',
      'zebra-fix',
    ])
  })
})

describe('Report per-change metadata', () => {
  it('lists Markdown artifacts relative to the change directory, string-sorted', async () => {
    const root = await tempRoot()
    await makeChange(join(root, 'openspec', 'changes', 'add-search'), {
      'proposal.md': '',
      'tasks.md': '',
      'specs/theme-engine/spec.md': '',
    })

    const [change] = (await scanChanges(root))[ChangeGroup.Active]

    expect(change!.artifacts).toEqual(['proposal.md', 'specs/theme-engine/spec.md', 'tasks.md'])
  })

  it('excludes non-Markdown files from the artifact list', async () => {
    const root = await tempRoot()
    await makeChange(join(root, 'openspec', 'changes', 'add-search'), {
      '.openspec.yaml': 'created: 2026-08-10\n',
      'proposal.md': '',
    })

    const [change] = (await scanChanges(root))[ChangeGroup.Active]

    expect(change!.artifacts).toEqual(['proposal.md'])
  })

  it('reports an empty artifact list for a change with no Markdown files', async () => {
    const root = await tempRoot()
    await makeChange(join(root, 'openspec', 'changes', 'add-search'), {
      '.openspec.yaml': 'created: 2026-08-10\n',
    })

    expect((await scanChanges(root))[ChangeGroup.Active][0]!.artifacts).toEqual([])
  })

  it('reports an absolute path that locates every listed artifact on disk', async () => {
    const root = await tempRoot()
    await makeChange(join(root, 'openspec', 'changes', 'add-search'), {
      'proposal.md': '',
      'specs/theme-engine/spec.md': '',
    })

    const [change] = (await scanChanges(root))[ChangeGroup.Active]

    expect(isAbsolute(change!.path)).toBe(true)
    for (const artifact of change!.artifacts) {
      expect(existsSync(join(change!.path, artifact))).toBe(true)
    }
  })

  it('reports the group, task progress and derived status of each change', async () => {
    const root = await tempRoot()
    await makeChange(join(root, 'openspec', 'changes', 'add-search'), {
      'tasks.md': '- [x] 1.1 done\n- [ ] 1.2 pending\n',
    })

    const [change] = (await scanChanges(root))[ChangeGroup.Active]

    expect(change!.group).toBe(ChangeGroup.Active)
    expect(change!.progress).toEqual({ complete: 1, total: 2 })
    expect(change!.status).toBe(ChangeStatus.InProgress)
  })
})

describe('Degrade gracefully on unreadable changes', () => {
  it('keeps the readable changes and warns about the one it dropped', async () => {
    const root = await tempRoot()
    const changesDir = join(root, 'openspec', 'changes')
    for (const name of ['add-search', 'mid-tier', 'locked-down']) {
      await makeChange(join(changesDir, name))
    }
    // Strip every permission so the directory cannot be listed.
    await chmod(join(changesDir, 'locked-down'), 0o000)

    const warnings: string[] = []
    const snapshot = await scanChanges(root, { warn: (m) => warnings.push(m) })

    await chmod(join(changesDir, 'locked-down'), 0o700) // let the temp dir be cleaned up
    expect(names(snapshot[ChangeGroup.Active])).toEqual(['add-search', 'mid-tier'])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('locked-down')
  })

  it('keeps a change whose tasks file cannot be read, as Draft', async () => {
    const root = await tempRoot()
    const changeDir = join(root, 'openspec', 'changes', 'add-search')
    await makeChange(changeDir, { 'tasks.md': '- [x] 1.1 done\n' })
    await chmod(join(changeDir, 'tasks.md'), 0o000)

    const snapshot = await scanChanges(root)

    await chmod(join(changeDir, 'tasks.md'), 0o600)
    const [change] = snapshot[ChangeGroup.Active]
    expect(change!.name).toBe('add-search')
    expect(change!.progress).toBeUndefined()
    expect(change!.status).toBe(ChangeStatus.Draft)
  })
})

describe('Perform file system access asynchronously', () => {
  const discoveryDir = join(__dirname, '..', 'discovery')

  it('never imports the VS Code API from the discovery layer', async () => {
    for (const file of await readdir(discoveryDir)) {
      const source = await readFile(join(discoveryDir, file), 'utf8')
      expect(source, `${file} must not import vscode`).not.toMatch(/from\s+['"]vscode['"]/)
      expect(source, `${file} must not require vscode`).not.toMatch(/require\(['"]vscode['"]\)/)
    }
  })

  it('never calls a synchronous file system function from the discovery layer', async () => {
    for (const file of await readdir(discoveryDir)) {
      const source = await readFile(join(discoveryDir, file), 'utf8')
      expect(source, `${file} must not use node:fs sync APIs`).not.toMatch(/\b\w+Sync\s*\(/)
      expect(source, `${file} must import only node:fs/promises`).not.toMatch(
        /from\s+['"]node:fs['"]/,
      )
    }
  })
})

describe('Indicate loading and uninitialised states', () => {
  it('reports a workspace with an openspec directory as initialised', async () => {
    const root = await tempRoot()
    await mkdir(join(root, 'openspec'), { recursive: true })

    expect(await isSpectraWorkspace(root)).toBe(true)
  })

  it('reports a workspace without an openspec directory as uninitialised', async () => {
    expect(await isSpectraWorkspace(await tempRoot())).toBe(false)
  })

  it('reports no workspace folder at all as uninitialised', async () => {
    expect(await isSpectraWorkspace(undefined)).toBe(false)
  })

  it('does not mistake an openspec file for the directory', async () => {
    const root = await tempRoot()
    await writeFile(join(root, 'openspec'), 'not a directory\n', 'utf8')

    expect(await isSpectraWorkspace(root)).toBe(false)
  })
})

describe('Report per-change metadata — modification date', () => {
  it('reports the most recent modification time among the Markdown files', async () => {
    // The spec's "newest Markdown file wins" example, with its exact timestamps.
    const root = await tempRoot()
    const dir = join(root, 'openspec', 'changes', 'add-search')
    await makeChange(dir, { 'proposal.md': '', 'tasks.md': '' })
    const older = new Date('2026-08-11T17:00:00Z')
    const newer = new Date('2026-08-12T09:00:00Z')
    await utimes(join(dir, 'proposal.md'), older, older)
    await utimes(join(dir, 'tasks.md'), newer, newer)

    const [change] = (await scanChanges(root))[ChangeGroup.Active]

    expect(change!.modified?.getTime()).toBe(newer.getTime())
  })

  it('reports no modification date for a change with no Markdown files', async () => {
    const root = await tempRoot()
    await makeChange(join(root, 'openspec', 'changes', 'add-search'), {
      '.openspec.yaml': 'created: 2026-08-10\n',
    })

    expect((await scanChanges(root))[ChangeGroup.Active][0]!.modified).toBeUndefined()
  })

  it('ignores non-Markdown files when picking the modification date', async () => {
    const root = await tempRoot()
    const dir = join(root, 'openspec', 'changes', 'add-search')
    await makeChange(dir, { 'proposal.md': '', '.openspec.yaml': '' })
    const markdown = new Date('2026-08-11T17:00:00Z')
    const yaml = new Date('2026-08-20T09:00:00Z')
    await utimes(join(dir, 'proposal.md'), markdown, markdown)
    await utimes(join(dir, '.openspec.yaml'), yaml, yaml)

    const [change] = (await scanChanges(root))[ChangeGroup.Active]

    expect(change!.modified?.getTime()).toBe(markdown.getTime())
  })
})

describe('Report per-change metadata — creation date and proposer in the snapshot', () => {
  it('reports both fields from one metadata file', async () => {
    const root = await tempRoot()
    await makeChange(join(root, 'openspec', 'changes', 'add-search'), {
      '.openspec.yaml': 'created: 2026-08-10\ncreated_by: fripig <fripig@gmail.com>\n',
      'proposal.md': '',
    })

    const [change] = (await scanChanges(root))[ChangeGroup.Active]

    expect(change!.created?.toISOString().slice(0, 10)).toBe('2026-08-10')
    expect(change!.proposer).toBe('fripig')
  })

  it('lets one unusable field leave the other intact', async () => {
    const root = await tempRoot()
    await makeChange(join(root, 'openspec', 'changes', 'add-search'), {
      '.openspec.yaml': 'created: last Tuesday\ncreated_by: fripig <fripig@gmail.com>\n',
    })

    const [change] = (await scanChanges(root))[ChangeGroup.Active]

    expect(change!.created).toBeUndefined()
    expect(change!.proposer).toBe('fripig')
  })

  it('keeps a change in the snapshot when the metadata file is absent', async () => {
    const root = await tempRoot()
    await makeChange(join(root, 'openspec', 'changes', 'add-search'), { 'proposal.md': '' })

    const [change] = (await scanChanges(root))[ChangeGroup.Active]

    expect(change!.name).toBe('add-search')
    expect(change!.created).toBeUndefined()
    expect(change!.proposer).toBeUndefined()
    expect(change!.artifacts).toEqual(['proposal.md'])
  })

  it('reports the proposer of an archived change rather than its archiver', async () => {
    const root = await tempRoot()
    await makeChange(join(root, 'openspec', 'changes', 'archive', 'old-login'), {
      '.openspec.yaml':
        'created_by: alice <alice@example.com>\narchived_by: bob <bob@example.com>\n',
    })

    const [change] = (await scanChanges(root))[ChangeGroup.Archived]

    expect(change!.proposer).toBe('alice')
  })
})
