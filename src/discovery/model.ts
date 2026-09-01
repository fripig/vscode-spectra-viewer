/**
 * Data shapes shared across the discovery layer.
 *
 * Nothing in `src/discovery/` imports the VS Code API, so this module — and
 * everything that builds on it — runs under plain Node in unit tests.
 */

/** The three places a Spectra change can live. */
export enum ChangeGroup {
  Active = 'active',
  Parked = 'parked',
  Archived = 'archived',
}

/** Checkbox counts parsed from a change's tasks file. */
export interface TaskProgress {
  readonly complete: number
  readonly total: number
}

/** How far along a change is, derived from its task progress. */
export enum ChangeStatus {
  Draft = 'draft',
  NotStarted = 'notStarted',
  InProgress = 'inProgress',
  Complete = 'complete',
}

/** One change discovered on disk. */
export interface SpectraChange {
  /** The change directory name. */
  readonly name: string
  readonly group: ChangeGroup
  /** Absolute path of the change directory. */
  readonly path: string
  /** Every `.md` file beneath the change directory, relative and string-sorted. */
  readonly artifacts: readonly string[]
  /** Absent when the change has no counted checkbox. */
  readonly progress?: TaskProgress | undefined
  readonly status: ChangeStatus
}

/** The result of one scan: the three groups, in unspecified order within each. */
export interface ChangeSnapshot {
  readonly [ChangeGroup.Active]: readonly SpectraChange[]
  readonly [ChangeGroup.Parked]: readonly SpectraChange[]
  readonly [ChangeGroup.Archived]: readonly SpectraChange[]
}

/** Where warnings about unreadable changes go; the view supplies the real one. */
export interface Logger {
  warn(message: string): void
}

export function deriveStatus(progress: TaskProgress | undefined): ChangeStatus {
  if (progress === undefined || progress.total === 0) {
    return ChangeStatus.Draft
  }
  if (progress.complete === 0) {
    return ChangeStatus.NotStarted
  }
  if (progress.complete >= progress.total) {
    return ChangeStatus.Complete
  }
  return ChangeStatus.InProgress
}
