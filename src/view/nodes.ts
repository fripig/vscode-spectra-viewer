/**
 * The tree's node model and every rule about its shape.
 *
 * This module deliberately imports nothing from `vscode`: turning a node into
 * a `TreeItem` is the tree data provider's job, so the structure, ordering,
 * labelling and identity rules stay unit-testable in plain Node.
 */
import { ChangeOrder, DEFAULT_ORDER, comparatorFor } from './changeOrder'
import { applyFilter } from './changeFilter'
import {
  ChangeGroup,
  ChangeStatus,
  type ChangeSnapshot,
  type SpectraChange,
} from '../discovery/model'

export interface GroupNode {
  readonly kind: 'group'
  readonly group: ChangeGroup
  readonly label: string
  /** Changes surviving the filter; equals `total` when no filter is set. */
  readonly matched: number
  /** Changes in the group before filtering. */
  readonly total: number
  /** Whether a filter was in effect when this node was built. */
  readonly filtered: boolean
  /** Already filtered; the sort order is applied when children are asked for. */
  readonly changes: readonly SpectraChange[]
}

export interface ChangeNode {
  readonly kind: 'change'
  readonly label: string
  readonly change: SpectraChange
}

export interface ArtifactNode {
  readonly kind: 'artifact'
  readonly label: string
  /** Absolute path of the change directory this artifact belongs to. */
  readonly changePath: string
  readonly changeName: string
  readonly group: ChangeGroup
  /** Path relative to the change directory, as shown on the node. */
  readonly relativePath: string
}

export type SpectraNode = GroupNode | ChangeNode | ArtifactNode

/** The three groups, in the fixed order the tree always shows them. */
const GROUP_ORDER: ReadonlyArray<readonly [ChangeGroup, string]> = [
  [ChangeGroup.Active, 'Active'],
  [ChangeGroup.Parked, 'Parked'],
  [ChangeGroup.Archived, 'Archived'],
]

/**
 * The three group nodes. Always all three, even when a group is empty or
 * nothing in it survives the filter.
 */
export function rootNodes(snapshot: ChangeSnapshot, filter = ''): GroupNode[] {
  const filtered = filter.trim() !== ''
  return GROUP_ORDER.map(([group, label]) => {
    const all = snapshot[group]
    const changes = applyFilter(all, filter)
    return {
      kind: 'group',
      group,
      label,
      matched: changes.length,
      total: all.length,
      filtered,
      changes,
    }
  })
}

/**
 * The count shown beside a group name.
 *
 * While filtering it carries both numbers, because a bare "0" cannot tell
 * "this group is empty" apart from "everything here was filtered out".
 */
export function groupCountLabel(group: GroupNode): string {
  return group.filtered ? `${group.matched}/${group.total}` : String(group.total)
}

/**
 * A node's children, with group members ordered by the caller's sort option.
 *
 * Only the change level is sorted: the three groups keep their fixed order,
 * and artifacts keep the string order discovery reported.
 */
export function childrenOf(node: SpectraNode, order: ChangeOrder = DEFAULT_ORDER): SpectraNode[] {
  switch (node.kind) {
    case 'group':
      return [...node.changes].sort(comparatorFor(order)).map((change) => ({
        kind: 'change' as const,
        label: change.name,
        change,
      }))
    case 'change':
      return node.change.artifacts.map((relativePath) => ({
        kind: 'artifact' as const,
        label: relativePath,
        changePath: node.change.path,
        changeName: node.change.name,
        group: node.change.group,
        relativePath,
      }))
    case 'artifact':
      return []
  }
}

/**
 * Codicon ids, one per status, chosen to read as a progression at a glance:
 * an unstarted outline, a filled-in start, motion, then a tick.
 */
const STATUS_ICONS: Readonly<Record<ChangeStatus, string>> = {
  [ChangeStatus.Draft]: 'edit',
  [ChangeStatus.NotStarted]: 'circle-large-outline',
  [ChangeStatus.InProgress]: 'sync',
  [ChangeStatus.Complete]: 'pass-filled',
}

/** Group and artifact icons stay clear of the four status icons on purpose. */
export const GROUP_ICON = 'folder'
export const ARTIFACT_ICON = 'markdown'

export function statusIcon(status: ChangeStatus): string {
  return STATUS_ICONS[status]
}

/**
 * The de-emphasised text beside a change name: "3/8" when the change has
 * counted tasks, and nothing at all when it has none — no placeholder.
 */
export function progressDescription(change: SpectraChange): string | undefined {
  const progress = change.progress
  return progress === undefined ? undefined : `${progress.complete}/${progress.total}`
}

/**
 * The full de-emphasised segment beside a change name: proposer, then counts.
 *
 * The counts stay last so their position never shifts with the length of the
 * proposer name, and an unknown proposer contributes nothing at all rather
 * than a placeholder. Identical in all three groups; an archived change shows
 * whoever proposed it, since that is the only name discovery reports.
 */
export function nodeDescription(change: SpectraChange): string | undefined {
  const parts = [change.proposer, progressDescription(change)].filter(
    (part): part is string => part !== undefined && part !== '',
  )
  return parts.length === 0 ? undefined : parts.join(' ')
}

/**
 * A node's identity across rebuilds.
 *
 * VS Code restores expansion state on its own, but only for tree items whose
 * `id` survives a refresh — so the id is derived purely from where the node
 * sits (group, change name, artifact path) and never from volatile data such
 * as task progress or status.
 */
export function nodeId(node: SpectraNode): string {
  switch (node.kind) {
    case 'group':
      return `group:${node.group}`
    case 'change':
      return `change:${node.change.group}:${node.change.name}`
    case 'artifact':
      return `artifact:${node.group}:${node.changeName}:${node.relativePath}`
  }
}
