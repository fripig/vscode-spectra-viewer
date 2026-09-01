import { readdir, stat } from 'node:fs/promises'
import { join, posix, sep } from 'node:path'
import { resolveGitDir } from './gitDir'
import {
  ChangeGroup,
  deriveStatus,
  type ChangeSnapshot,
  type Logger,
  type SpectraChange,
} from './model'
import { readTaskProgress } from './taskProgress'

/** The archive directory sits inside `openspec/changes/` but is not a change. */
const ARCHIVE_DIR = 'archive'

const silentLogger: Logger = { warn: () => {} }

/** Lists immediate subdirectory names, or nothing when the directory is absent. */
async function subdirectories(dir: string, logger: Logger): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn(`Could not list ${dir}: ${String(error)}`)
    }
    return []
  }
}

/** Collects every `.md` file beneath a change, as relative POSIX-style paths. */
async function collectArtifacts(changeDir: string): Promise<string[]> {
  const entries = await readdir(changeDir, { withFileTypes: true, recursive: true })
  const artifacts: string[] = []

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue
    }
    // parentPath is absolute; make it relative to the change directory.
    const relativeDir = entry.parentPath.slice(changeDir.length).replace(/^[\\/]/, '')
    const relative = relativeDir === '' ? entry.name : join(relativeDir, entry.name)
    artifacts.push(relative.split(sep).join(posix.sep))
  }

  return artifacts.sort()
}

async function readChange(
  parentDir: string,
  name: string,
  group: ChangeGroup,
  logger: Logger,
): Promise<SpectraChange | undefined> {
  const path = join(parentDir, name)
  try {
    const [artifacts, progress] = await Promise.all([
      collectArtifacts(path),
      readTaskProgress(path),
    ])
    return { name, group, path, artifacts, progress, status: deriveStatus(progress) }
  } catch (error) {
    logger.warn(`Skipping unreadable change ${path}: ${String(error)}`)
    return undefined
  }
}

async function readGroup(
  parentDir: string | undefined,
  group: ChangeGroup,
  logger: Logger,
  exclude: readonly string[] = [],
): Promise<SpectraChange[]> {
  if (parentDir === undefined) {
    return []
  }
  const names = (await subdirectories(parentDir, logger)).filter((n) => !exclude.includes(n))
  const changes = await Promise.all(names.map((n) => readChange(parentDir, n, group, logger)))
  return changes.filter((change): change is SpectraChange => change !== undefined)
}

/**
 * Reads every Spectra change under a project root.
 *
 * Never invokes the `spectra` CLI and never reads its database — only the file
 * system. A source directory that is missing yields an empty group rather than
 * an error, so a half-set-up project still shows what it has.
 */
export async function scanChanges(
  projectRoot: string,
  logger: Logger = silentLogger,
): Promise<ChangeSnapshot> {
  const activeDir = join(projectRoot, 'openspec', 'changes')
  const archivedDir = join(activeDir, ARCHIVE_DIR)
  const gitDir = await resolveGitDir(projectRoot)
  const parkedDir = gitDir === undefined ? undefined : join(gitDir, 'spectra-app', 'changes')

  const [active, parked, archived] = await Promise.all([
    readGroup(activeDir, ChangeGroup.Active, logger, [ARCHIVE_DIR]),
    readGroup(parkedDir, ChangeGroup.Parked, logger),
    readGroup(archivedDir, ChangeGroup.Archived, logger),
  ])

  return {
    [ChangeGroup.Active]: active,
    [ChangeGroup.Parked]: parked,
    [ChangeGroup.Archived]: archived,
  }
}

/**
 * Whether a folder is set up for Spectra at all.
 *
 * Drives the welcome view: with no `openspec` directory — or no folder open —
 * showing an empty three-group tree would look like a bug rather than a
 * project that simply has not been initialised.
 */
export async function isSpectraWorkspace(projectRoot: string | undefined): Promise<boolean> {
  if (projectRoot === undefined) {
    return false
  }
  try {
    return (await stat(join(projectRoot, 'openspec'))).isDirectory()
  } catch {
    return false
  }
}
