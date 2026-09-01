import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveGitDir } from '../discovery/gitDir'

async function tempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'spectra-git-'))
}

describe('Resolve the git directory including worktree indirection', () => {
  it('uses the .git directory directly in a standard repository layout', async () => {
    const root = await tempRoot()
    const gitDir = join(root, '.git')
    await mkdir(gitDir, { recursive: true })

    expect(await resolveGitDir(root)).toBe(gitDir)
  })

  it('follows the gitdir pointer and prefers commondir in a worktree layout', async () => {
    const root = await tempRoot()
    const commonGitDir = join(root, 'main.git')
    const worktreeGitDir = join(commonGitDir, 'worktrees', 'feature')
    await mkdir(worktreeGitDir, { recursive: true })
    // git records commondir relative to the worktree's own git directory.
    await writeFile(join(worktreeGitDir, 'commondir'), '../..\n', 'utf8')
    await writeFile(join(root, '.git'), `gitdir: ${worktreeGitDir}\n`, 'utf8')

    expect(await resolveGitDir(root)).toBe(commonGitDir)
  })

  it('uses the pointer target when it has no commondir file', async () => {
    const root = await tempRoot()
    const pointed = join(root, 'elsewhere.git')
    await mkdir(pointed, { recursive: true })
    await writeFile(join(root, '.git'), `gitdir: ${pointed}\n`, 'utf8')

    expect(await resolveGitDir(root)).toBe(pointed)
  })

  it('resolves to nothing when .git is absent', async () => {
    expect(await resolveGitDir(await tempRoot())).toBeUndefined()
  })

  it('resolves to nothing when the pointer target does not exist', async () => {
    const root = await tempRoot()
    await writeFile(join(root, '.git'), `gitdir: ${join(root, 'missing.git')}\n`, 'utf8')

    expect(await resolveGitDir(root)).toBeUndefined()
  })
})
