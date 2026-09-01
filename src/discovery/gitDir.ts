import { stat, readFile } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'

/** The `gitdir: <path>` line git writes into a worktree's `.git` file. */
const GITDIR_POINTER = /^gitdir:\s*(.+)$/m

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

/**
 * Finds the git directory for a project root, following worktree indirection.
 *
 * A plain `.git` directory is the answer. A `.git` *file* holds a `gitdir:`
 * pointer to the worktree's own git directory; when that directory records a
 * `commondir`, the path it names — resolved against it — wins, because that is
 * where shared state (and Spectra's parked changes) actually live.
 *
 * Returns `undefined` when nothing resolves, which leaves the Parked group
 * empty without failing the scan.
 */
export async function resolveGitDir(projectRoot: string): Promise<string | undefined> {
  const dotGit = join(projectRoot, '.git')

  if (await isDirectory(dotGit)) {
    return dotGit
  }

  let pointerFile: string
  try {
    pointerFile = await readFile(dotGit, 'utf8')
  } catch {
    return undefined
  }

  const match = GITDIR_POINTER.exec(pointerFile)
  if (match === null) {
    return undefined
  }

  const pointed = match[1]!.trim()
  const worktreeGitDir = isAbsolute(pointed) ? pointed : resolve(projectRoot, pointed)
  if (!(await isDirectory(worktreeGitDir))) {
    return undefined
  }

  let commondir: string
  try {
    commondir = await readFile(join(worktreeGitDir, 'commondir'), 'utf8')
  } catch {
    return worktreeGitDir
  }

  const common = resolve(worktreeGitDir, commondir.trim())
  return (await isDirectory(common)) ? common : worktreeGitDir
}
