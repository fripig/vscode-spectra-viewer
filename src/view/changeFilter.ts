/**
 * Name filtering for the tree.
 *
 * Like the rest of the node model this imports nothing from `vscode`, so the
 * matching rule is unit-testable in plain Node.
 */
import type { SpectraChange } from '../discovery/model'

/**
 * Whether a change survives the filter.
 *
 * Only the change name is compared. Artifact paths are excluded because a
 * filter for `proposal` would otherwise match every change in the tree, and
 * the proposer is excluded because it is decoration, not identity.
 */
export function matchesFilter(change: SpectraChange, filter: string): boolean {
  const needle = filter.trim().toLowerCase()
  return needle === '' || change.name.toLowerCase().includes(needle)
}

/** The changes that survive the filter, in the order they were given. */
export function applyFilter(
  changes: readonly SpectraChange[],
  filter: string,
): readonly SpectraChange[] {
  return filter.trim() === '' ? changes : changes.filter((c) => matchesFilter(c, filter))
}
